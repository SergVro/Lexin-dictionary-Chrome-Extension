class LinkAdapter {

    private static readonly FOLKETS_BASE = "https://folkets-lexikon.csc.kth.se/folkets/";

    /**
     * Both dictionary services still write http:// into the markup they return - into
     * the playAudio() handlers and the image paths alike. Those subresources load under
     * the host page's origin once the Translation Card renders in a content script, so
     * on an https:// page the browser blocks them as mixed content: the LYSSNA button
     * plays nothing and the inflection images never appear, while the same card works
     * in the popup. Both hosts serve the identical content over TLS, so upgrading the
     * scheme is the whole fix.
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
                        
                        // Play audio directly
                        const audio = new Audio(audioUrl!);
                        audio.addEventListener("error", (err) => {
                            console.error("playAudio: Error playing audio", audioUrl, err);
                        });
                        audio.play().catch((error) => {
                            console.error("playAudio: Failed to play audio", audioUrl, error);
                        });
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
