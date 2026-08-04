import MessageService from "../messaging/MessageService.js";

class LinkAdapter {

    private static readonly FOLKETS_BASE = "https://folkets-lexikon.csc.kth.se/folkets/";

    /** Stateless, and the same in every surface that renders a translation. */
    private static readonly messageService = new MessageService();

    /**
     * Both dictionary services still write http:// into the markup they return - into
     * the playAudio() handlers and the image paths alike. Those subresources load under
     * the host page's origin once the Translation Card renders in a content script, so
     * on an https:// page the browser blocks them as mixed content: the LYSSNA button
     * plays nothing and the inflection images never appear, while the same card works
     * in the popup. Both hosts serve the identical content over TLS, so upgrading the
     * scheme is the whole fix for mixed content - but it was not the whole fix for the
     * clip, which the host page's CSP blocked next, over https and all. That one is
     * settled elsewhere: see docs/adr/0004-offscreen-audio-playback.md. The images
     * below still load as the page's own subresources and a strict policy still
     * blocks them.
     */
    private static toSecureUrl(url: string): string {
        return url.replace(/^http:\/\//i, "https://");
    }

    /**
     * Adapts links in translation content:
     * 1. Links with onclick="playAudio(...)" - Convert to event listeners (make functional)
     * 2. All other links - Set target="_blank" to open in new tab
     */
    static AdaptLinks(translationContainer: HTMLElement | DocumentFragment, _adaptFlash?: boolean): void {
        const links = translationContainer.querySelectorAll("a");
        
        links.forEach((anchor) => {
            // Check both onclick and data-onclick (data-onclick is used when we strip onclick from HTML string)
            const onclick = anchor.getAttribute("onclick") || anchor.getAttribute("data-onclick");
            const href = anchor.getAttribute("href");
            
            // Check if this is a playAudio link by onclick attribute or by checking if it contains LYSSNA text
            const linkText = anchor.textContent?.trim().toUpperCase() || "";
            const isLyssnaLink = linkText.includes("LYSSNA");
            
            // Links with playAudio onclick handler - convert to event listener
            // This works in both popup and content script contexts
            if ((onclick && onclick.includes("playAudio")) || (isLyssnaLink && href && href.match(/\.mp3$/))) {
                let audioUrl: string | null = null;
                
                // Try to extract from onclick handler first
                if (onclick && onclick.includes("playAudio")) {
                    // Pattern: playAudio('http://...') or playAudio("http://...") with optional return false;
                    const match = onclick.match(/playAudio\(['"]([^'"]+)['"]\)/);
                    if (match && match[1]) {
                        audioUrl = match[1];
                    }
                }
                
                // Fallback: if no onclick but it's a LYSSNA link with MP3 href, use the href
                if (!audioUrl && isLyssnaLink && href && href.match(/\.mp3$/)) {
                    audioUrl = href;
                }
                
                if (audioUrl) {
                    audioUrl = LinkAdapter.toSecureUrl(audioUrl);
                    // Remove both onclick and data-onclick attributes
                    anchor.removeAttribute("onclick");
                    anchor.removeAttribute("data-onclick");
                    // Remove href entirely to prevent any navigation
                    anchor.removeAttribute("href");
                    // Don't set target="_blank" for playAudio links
                    anchor.removeAttribute("target");
                    // Add role to indicate it's a button, not a navigation link
                    anchor.setAttribute("role", "button");
                    // Add cursor style to indicate it's clickable
                    anchor.style.cursor = "pointer";
                    
                    // Use both onclick property and addEventListener for maximum compatibility
                    const clickHandler = (e: MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        // Played in the extension's Offscreen Document rather than
                        // here. An <audio> element created in this context belongs
                        // to whatever document the card is rendered in - which, in a
                        // content script, is the host page, whose CSP then decides
                        // whether the clip may load at all. It usually may not: the
                        // sites this extension is most used on send a default-src
                        // that has never heard of lexin.nada.kth.se, and the button
                        // came up silent there while working in the Action Popup.
                        // See docs/adr/0004-offscreen-audio-playback.md.
                        LinkAdapter.messageService.playAudio(audioUrl!);
                    };
                    
                    // Set onclick property directly (harder to override)
                    (anchor as any).onclick = clickHandler;
                    // Also add event listener with capture phase as backup
                    anchor.addEventListener("click", clickHandler, true);
                    return;
                }
            }
            
            // Set target="_blank" for all other links to open in new tab
            anchor.setAttribute("target", "_blank");
        });

        // Handle image elements (fix relative paths for Folkets lexikon)
        const images = translationContainer.querySelectorAll("img");
        images.forEach((img) => {
            const url = img.getAttribute("src");
            if (!url) {
                return;
            }
            // relative image links for Folkets lexikon fix
            img.setAttribute("src", url.match(/^http/)
                ? LinkAdapter.toSecureUrl(url)
                : LinkAdapter.FOLKETS_BASE + url);
        });
    }
}

export default LinkAdapter;
