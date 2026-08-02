/*
 * Rewrites Chrome's screenshot PNGs as 24-bit truecolour, because the Chrome Web
 * Store asks for "24-bit PNG (no alpha)" and Chrome always writes RGBA.
 *
 * Hand-rolled rather than pulled from npm: the whole job is inflate, drop one byte
 * in four, deflate, and Node's zlib does both halves. A screenshot pipeline is not
 * worth a native image dependency that has to build on every contributor's machine
 * and in CI.
 *
 * Scope is deliberately narrow - 8-bit, non-interlaced, colour type 6 or 2, which is
 * everything Chrome emits. Anything else throws rather than being quietly mangled.
 */

import zlib from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Reads the chunk stream into { type, data } records, in file order. */
function readChunks(buffer) {
    if (!buffer.subarray(0, 8).equals(SIGNATURE)) {
        throw new Error("Not a PNG: signature does not match");
    }
    const chunks = [];
    let offset = 8;
    while (offset < buffer.length) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.toString("ascii", offset + 4, offset + 8);
        const data = buffer.subarray(offset + 8, offset + 8 + length);
        chunks.push({ type, data });
        offset += 12 + length;
    }
    return chunks;
}

/** The one byte the average and Paeth filters need from the pixel to the left. */
function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) {return a;}
    return pb <= pc ? b : c;
}

/**
 * Undoes the per-scanline filters, in place, leaving raw samples.
 *
 * Every filter refers to the *reconstructed* bytes above and to the left, so this
 * has to run top to bottom and cannot be parallelised per scanline.
 */
function unfilter(raw, width, height, bytesPerPixel) {
    const stride = width * bytesPerPixel;
    const out = Buffer.alloc(height * stride);
    let pos = 0;
    for (let y = 0; y < height; y++) {
        const filter = raw[pos++];
        const line = pos;
        pos += stride;
        for (let x = 0; x < stride; x++) {
            const value = raw[line + x];
            const left = x >= bytesPerPixel ? out[y * stride + x - bytesPerPixel] : 0;
            const up = y > 0 ? out[(y - 1) * stride + x] : 0;
            const upLeft = y > 0 && x >= bytesPerPixel ? out[(y - 1) * stride + x - bytesPerPixel] : 0;
            let restored;
            switch (filter) {
                case 0: restored = value; break;
                case 1: restored = value + left; break;
                case 2: restored = value + up; break;
                case 3: restored = value + ((left + up) >> 1); break;
                case 4: restored = value + paeth(left, up, upLeft); break;
                default: throw new Error(`Unsupported PNG filter type ${filter} on row ${y}`);
            }
            out[y * stride + x] = restored & 0xff;
        }
    }
    return out;
}

function chunk(type, data) {
    const out = Buffer.alloc(data.length + 12);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, "ascii");
    data.copy(out, 8);
    out.writeUInt32BE(zlib.crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
    return out;
}

/**
 * Returns the PNG re-encoded as colour type 2 (truecolour, no alpha).
 *
 * Partly transparent pixels are composited over white rather than having their
 * alpha simply dropped - a tile is built on a light ground, so white is what was
 * behind them anyway, and dropping alpha outright would turn a soft drop shadow
 * into a hard grey block.
 */
export function toRgbPng(buffer) {
    const chunks = readChunks(buffer);
    const header = chunks.find((c) => c.type === "IHDR");
    if (!header) {throw new Error("PNG has no IHDR chunk");}

    const width = header.data.readUInt32BE(0);
    const height = header.data.readUInt32BE(4);
    const bitDepth = header.data[8];
    const colourType = header.data[9];
    const interlace = header.data[12];

    if (bitDepth !== 8 || interlace !== 0 || (colourType !== 6 && colourType !== 2)) {
        throw new Error(
            `Unsupported PNG: bitDepth=${bitDepth} colourType=${colourType} interlace=${interlace}`);
    }
    if (colourType === 2) {
        return buffer;
    }

    const idat = Buffer.concat(chunks.filter((c) => c.type === "IDAT").map((c) => c.data));
    const samples = unfilter(zlib.inflateSync(idat), width, height, 4);

    // One filter byte per scanline, all of them "None": the image is about to be
    // deflated anyway, and choosing filters per row would buy a few percent for a
    // lot of code in a file that runs four times per release.
    const filtered = Buffer.alloc(height * (1 + width * 3));
    for (let y = 0; y < height; y++) {
        const target = y * (1 + width * 3) + 1;
        for (let x = 0; x < width; x++) {
            const source = (y * width + x) * 4;
            const alpha = samples[source + 3];
            for (let c = 0; c < 3; c++) {
                const value = samples[source + c];
                filtered[target + x * 3 + c] = alpha === 255
                    ? value
                    : Math.round((value * alpha + 255 * (255 - alpha)) / 255);
            }
        }
    }

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 2;

    return Buffer.concat([
        SIGNATURE,
        chunk("IHDR", ihdr),
        chunk("IDAT", zlib.deflateSync(filtered, { level: 9 })),
        chunk("IEND", Buffer.alloc(0))
    ]);
}

/** Reads back what a PNG says about itself, for the pipeline's own check. */
export function describePng(buffer) {
    const header = readChunks(buffer).find((c) => c.type === "IHDR");
    return {
        width: header.data.readUInt32BE(0),
        height: header.data.readUInt32BE(4),
        bitDepth: header.data[8],
        colourType: header.data[9],
        hasAlpha: header.data[9] === 4 || header.data[9] === 6
    };
}
