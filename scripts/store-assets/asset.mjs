/*
 * Turns a page of HTML into a store asset, and refuses to write one the developer
 * dashboard would reject.
 *
 * The dashboard's rejections are terse and arrive after an upload, so the size and
 * the colour type are checked here instead - at the point where the file is written,
 * with the name of the asset that got them wrong.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { toRgbPng, describePng } from "./png.mjs";

/**
 * Renders `html` at exactly `size`, re-encodes it without alpha, and writes it.
 *
 * The device scale factor is pinned to 1: these dimensions are the asset's, not a
 * viewport's, and a 2x render would be the right picture at twice the size the store
 * accepts. Captures placed *inside* the page are what carry the extra resolution.
 */
export async function writeAsset(browser, { file, size, html }) {
    const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
    await page.setContent(html);
    await page.waitForLoadState("networkidle");
    const rendered = await page.screenshot();
    await page.close();

    const png = toRgbPng(rendered);
    const shape = describePng(png);
    const name = path.basename(file);
    if (shape.width !== size.width || shape.height !== size.height) {
        throw new Error(`${name}: the store needs ${size.width}x${size.height}, `
            + `got ${shape.width}x${shape.height}`);
    }
    if (shape.hasAlpha) {
        throw new Error(`${name}: the store needs a 24-bit PNG with no alpha, `
            + `got colour type ${shape.colourType}`);
    }

    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, png);
    console.log(`  ${path.relative(process.cwd(), file)}  `
        + `${shape.width}x${shape.height}  ${(png.length / 1024).toFixed(0)} KB`);
}

/** Inlines an image for a page that is rendered with no server behind it. */
export async function dataUri(source) {
    const buffer = Buffer.isBuffer(source) ? source : await fs.readFile(source);
    return `data:image/png;base64,${buffer.toString("base64")}`;
}
