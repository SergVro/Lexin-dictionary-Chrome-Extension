/**
 * Stylesheets imported from TypeScript resolve to their text.
 *
 * The Translation Card renders in a shadow root, so its CSS has to travel inside
 * the content script bundle rather than being linked - a <link> would need
 * web_accessible_resources, which ManifestTests forbids. See
 * docs/adr/0001-shadow-dom-for-translation-card.md.
 *
 * The inlining itself is done by the css-text plugin in build.js, and mirrored for
 * unit tests by the text-loader plugin in vitest.config.ts.
 */
declare module "*.css" {
    const css: string;
    export default css;
}
