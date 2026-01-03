import LinkAdapter from "../common/LinkAdapter.js";
import * as DomUtils from "./DomUtils.js";

/**
 * Processes translation HTML response and inserts it into a container element.
 * 
 * This function:
 * 1. Strips onclick attributes from HTML to prevent inline handlers
 * 2. Parses HTML into a DocumentFragment for safe DOM insertion
 * 3. Inserts the content into the target container
 * 4. Adapts links using LinkAdapter (handles playAudio links, sets target="_blank", etc.)
 * 
 * @param html - The HTML string from translation response (translation or error)
 * @param container - The target container element to insert the translation into
 * @param onComplete - Optional callback called after content is inserted and processed
 */
export function processTranslationHtml(
    html: string,
    container: HTMLElement,
    onComplete?: () => void
): void {
    // Remove onclick attributes from HTML string BEFORE parsing
    // This prevents onclick handlers from being created when innerHTML is set
    // We'll add event listeners via LinkAdapter instead
    // Match onclick with various quote styles and whitespace
    html = html.replace(/onclick\s*=\s*(["'])([^"']*playAudio[^"']*)\1/gi, 'data-onclick="$2"');
    
    // Process HTML in a DocumentFragment before inserting into DOM
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    
    // Move all nodes to fragment
    while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
    }
    
    // Clear and insert content first
    DomUtils.empty(container);
    container.appendChild(fragment);
    
    // Process links AFTER insertion to ensure event listeners are properly attached
    // This is safe because we've already stripped onclick attributes from HTML string
    LinkAdapter.AdaptLinks(container);
    
    // Call optional completion callback (e.g., for repositioning)
    if (onComplete) {
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
            onComplete();
        });
    }
}

