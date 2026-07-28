import manifest from "../../src/manifest.json";

/**
 * Guards the permission surface the extension ships to the Chrome Web Store.
 *
 * A submission was rejected for requesting "tabs", which none of the
 * chrome.tabs calls in ChromeMessageBus need: tabs.create never required it,
 * and tabs.query/tabs.sendMessage only lose the url/title/favIconUrl fields
 * without it - fields this extension does not read.
 *
 * A failure here means the permission surface grew. Fix it by removing the
 * permission, not by widening the expectation - unless the code genuinely
 * cannot work without it, in which case the store will want a justification.
 */
describe("manifest permissions", () => {

    it("should request only the storage permission", () => {
        expect(manifest.permissions).toEqual(["storage"]);
    });

    it("should not request the tabs permission", () => {
        expect(manifest.permissions).not.toContain("tabs");
    });

    it("should limit host permissions to the two dictionary services", () => {
        expect(manifest.host_permissions).toEqual([
            "http://lexin.nada.kth.se/*",
            "http://folkets-lexikon.csc.kth.se/*"
        ]);
    });

    it("should not expose any resource to web pages", () => {
        // Every entry point is bundled into a self-contained IIFE and loaded
        // either as a content script or from an extension page, so no script
        // needs to be fetchable by a web page.
        expect(manifest).not.toHaveProperty("web_accessible_resources");
    });
});
