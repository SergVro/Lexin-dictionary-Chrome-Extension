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

    it("should not request any host permission", () => {
        // host_permissions buys an extension one thing here: a CORS bypass for the
        // dictionary lookups. Neither service needs it - both answer with
        // `Access-Control-Allow-Origin: *`, so the fetch in FetchLoader succeeds on
        // its own. Every fetch runs from the service worker or an extension page,
        // never from a content script, so none of them inherits a web page's origin;
        // and the content scripts are injected by content_scripts.matches, which is
        // independent of this field.
        //
        // If lookups ever start failing with a CORS error, check whether the service
        // dropped that header before re-adding the hosts here.
        expect(manifest).not.toHaveProperty("host_permissions");
    });

    it("should not expose any resource to web pages", () => {
        // Every entry point is bundled into a self-contained IIFE and loaded
        // either as a content script or from an extension page, so no script
        // needs to be fetchable by a web page.
        //
        // This is also why the Translation Card's stylesheet is inlined into the
        // content script bundle rather than linked from its shadow root: a <link>
        // would need the stylesheet exposed here. See
        // docs/adr/0001-shadow-dom-for-translation-card.md.
        expect(manifest).not.toHaveProperty("web_accessible_resources");
    });

    it("should not inject any stylesheet into the pages it runs on", () => {
        // The Translation Card renders in a shadow root, which page-level CSS
        // cannot reach, and its host element is styled inline. A stylesheet
        // declared here would be dead weight on every page load - and worse,
        // silently ineffective, which is how the style leak looked in the
        // first place. Do not re-add one to style the card.
        manifest.content_scripts.forEach((script) => {
            expect(script).not.toHaveProperty("css");
        });
    });
});
