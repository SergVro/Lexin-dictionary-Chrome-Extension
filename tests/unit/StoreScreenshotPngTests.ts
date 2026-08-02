import zlib from "node:zlib";
import { toRgbPng, describePng } from "../../scripts/store-assets/png.mjs";

/**
 * Guards the one thing the store screenshot pipeline does that no library is doing
 * for it: re-encoding Chrome's RGBA screenshots as the 24-bit PNG the Chrome Web
 * Store asks for.
 *
 * The failure this is here to catch is a silent one. A misread filter byte or an
 * off-by-one stride does not throw - it produces a PNG that opens, is the right size,
 * and is visibly wrong only if somebody looks at it, which by then is a reviewer at
 * Google.
 */

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type: string, data: Buffer): Buffer {
    const out = Buffer.alloc(data.length + 12);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, "ascii");
    data.copy(out, 8);
    out.writeUInt32BE(zlib.crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
    return out;
}

/**
 * Builds an 8-bit RGBA PNG from raw pixels, applying one filter type to every
 * scanline. The filter is a parameter because it is the part of decoding with
 * anything to get wrong: Chrome's own encoder picks per row, so a decoder that only
 * ever met "None" would pass on a synthetic fixture and fail on a real screenshot.
 */
function rgbaPng(width: number, height: number, pixels: number[], filter: number): Buffer {
    const stride = width * 4;
    const raw = Buffer.alloc(height * (1 + stride));
    for (let y = 0; y < height; y++) {
        raw[y * (1 + stride)] = filter;
        for (let x = 0; x < stride; x++) {
            const value = pixels[y * stride + x];
            const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
            const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
            const upLeft = y > 0 && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0;
            const encoded = filter === 0 ? value
                : filter === 1 ? value - left
                    : filter === 2 ? value - up
                        : filter === 3 ? value - ((left + up) >> 1)
                            : value - paeth(left, up, upLeft);
            raw[y * (1 + stride) + 1 + x] = encoded & 0xff;
        }
    }

    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8;
    header[9] = 6;

    return Buffer.concat([
        SIGNATURE,
        chunk("IHDR", header),
        chunk("IDAT", zlib.deflateSync(raw)),
        chunk("IEND", Buffer.alloc(0))
    ]);
}

function paeth(a: number, b: number, c: number): number {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) {return a;}
    return pb <= pc ? b : c;
}

/** Reads the pixels back out of a colour type 2 PNG, undoing the "None" filter. */
function readRgb(png: Buffer): number[] {
    const shape = describePng(png);
    const chunks: Buffer[] = [];
    let offset = 8;
    while (offset < png.length) {
        const length = png.readUInt32BE(offset);
        if (png.toString("ascii", offset + 4, offset + 8) === "IDAT") {
            chunks.push(png.subarray(offset + 8, offset + 8 + length));
        }
        offset += 12 + length;
    }

    const raw = zlib.inflateSync(Buffer.concat(chunks));
    const stride = shape.width * 3;
    const pixels: number[] = [];
    for (let y = 0; y < shape.height; y++) {
        expect(raw[y * (1 + stride)]).toBe(0);
        for (let x = 0; x < stride; x++) {
            pixels.push(raw[y * (1 + stride) + 1 + x]);
        }
    }
    return pixels;
}

/** Three opaque pixels over two rows, plus one that is half transparent. */
const WIDTH = 3;
const HEIGHT = 2;
const OPAQUE_PIXELS = [
    236, 48, 19, 255, 32, 30, 29, 255, 255, 255, 255, 255,
    243, 242, 242, 255, 0, 0, 0, 255, 166, 165, 165, 255
];

describe("toRgbPng", () => {

    it("drops the alpha channel and keeps every opaque colour", () => {
        const converted = toRgbPng(rgbaPng(WIDTH, HEIGHT, OPAQUE_PIXELS, 0));

        expect(describePng(converted)).toEqual({
            width: WIDTH, height: HEIGHT, bitDepth: 8, colourType: 2, hasAlpha: false
        });
        expect(readRgb(converted)).toEqual([
            236, 48, 19, 32, 30, 29, 255, 255, 255,
            243, 242, 242, 0, 0, 0, 166, 165, 165
        ]);
    });

    it.each([0, 1, 2, 3, 4])("reconstructs scanlines written with filter type %i", (filter) => {
        const converted = toRgbPng(rgbaPng(WIDTH, HEIGHT, OPAQUE_PIXELS, filter));

        expect(readRgb(converted)).toEqual([
            236, 48, 19, 32, 30, 29, 255, 255, 255,
            243, 242, 242, 0, 0, 0, 166, 165, 165
        ]);
    });

    it("composites a translucent pixel over white rather than dropping its alpha", () => {
        // Half-transparent black. Dropped outright it would come back as black, which
        // is what would turn the tiles' drop shadows into hard grey blocks.
        const converted = toRgbPng(rgbaPng(1, 1, [0, 0, 0, 128], 0));

        expect(readRgb(converted)).toEqual([127, 127, 127]);
    });

    it("leaves a PNG that is already 24-bit alone", () => {
        const once = toRgbPng(rgbaPng(WIDTH, HEIGHT, OPAQUE_PIXELS, 0));

        expect(toRgbPng(once)).toBe(once);
    });

    it("refuses a PNG whose colour depth it was never written for", () => {
        const png = rgbaPng(WIDTH, HEIGHT, OPAQUE_PIXELS, 0);
        // Byte 24 is the bit depth in IHDR: 8 bytes of signature, 8 of chunk header.
        png[24] = 16;

        expect(() => toRgbPng(png)).toThrow(/Unsupported PNG/);
    });

    it("refuses something that is not a PNG at all", () => {
        expect(() => toRgbPng(Buffer.from("GIF89a and then some"))).toThrow(/Not a PNG/);
    });
});
