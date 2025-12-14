/**
 * Positioning utilities to replace jQuery UI position() method
 */

export interface PositionOptions {
    of: Element | MouseEvent | { left: number; top: number };
    my?: string; // e.g., "center+10 bottom-20"
    at?: string; // e.g., "center top"
    collision?: string; // "flip", "fit", "flipfit", "none"
}

interface ParsedAlignment {
    horizontal: "left" | "center" | "right";
    vertical: "top" | "center" | "bottom";
    horizontalOffset: number;
    verticalOffset: number;
}

/**
 * Parse alignment string like "center+10 bottom-20"
 */
function parseAlignment(alignment: string): ParsedAlignment {
    const parts = alignment.trim().split(/\s+/);
    let horizontal: "left" | "center" | "right" = "center";
    let vertical: "top" | "center" | "bottom" = "center";
    let horizontalOffset = 0;
    let verticalOffset = 0;

    for (const part of parts) {
        // Check for horizontal alignment
        if (part.includes("left")) {
            horizontal = "left";
            const match = part.match(/left([+-]?\d+)/);
            if (match) {horizontalOffset = parseInt(match[1], 10);}
        } else if (part.includes("right")) {
            horizontal = "right";
            const match = part.match(/right([+-]?\d+)/);
            if (match) {horizontalOffset = parseInt(match[1], 10);}
        } else if (part.includes("center")) {
            horizontal = "center";
            const match = part.match(/center([+-]?\d+)/);
            if (match) {horizontalOffset = parseInt(match[1], 10);}
        }
        
        // Check for vertical alignment
        if (part.includes("top")) {
            vertical = "top";
            const match = part.match(/top([+-]?\d+)/);
            if (match) {verticalOffset = parseInt(match[1], 10);}
        } else if (part.includes("bottom")) {
            vertical = "bottom";
            const match = part.match(/bottom([+-]?\d+)/);
            if (match) {verticalOffset = parseInt(match[1], 10);}
        } else if (part.includes("center") && !part.includes("left") && !part.includes("right")) {
            vertical = "center";
            const match = part.match(/center([+-]?\d+)/);
            if (match) {verticalOffset = parseInt(match[1], 10);}
        }
    }

    return { horizontal, vertical, horizontalOffset, verticalOffset };
}

/**
 * Get target position from 'of' option
 */
function getTargetPosition(of: Element | MouseEvent | { left: number; top: number }, useFixed: boolean = false): { left: number; top: number; width: number; height: number } {
    if ("left" in of && "top" in of && typeof of.left === "number" && typeof of.top === "number") {
        // It's a plain object with coordinates
        if (useFixed) {
            // For fixed positioning, assume coordinates are viewport-relative
            return { left: of.left, top: of.top, width: 0, height: 0 };
        } else {
            // For absolute positioning, assume coordinates are document-relative
            return { left: of.left, top: of.top, width: 0, height: 0 };
        }
    } else if (of instanceof MouseEvent) {
        // It's a mouse event - use viewport coordinates (clientX/clientY) for fixed positioning
        // or convert to document coordinates for absolute positioning
        if (useFixed) {
            return { 
                left: of.clientX, 
                top: of.clientY, 
                width: 0, 
                height: 0 
            };
        } else {
            return { 
                left: of.clientX + window.scrollX, 
                top: of.clientY + window.scrollY, 
                width: 0, 
                height: 0 
            };
        }
    } else if (of instanceof Element) {
        // It's an element
        const rect = of.getBoundingClientRect();
        if (useFixed) {
            return {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
            };
        } else {
            return {
                left: rect.left + window.scrollX,
                top: rect.top + window.scrollY,
                width: rect.width,
                height: rect.height
            };
        }
    }
    
    return { left: 0, top: 0, width: 0, height: 0 };
}

/**
 * Calculate position based on alignment
 */
function calculatePosition(
    elementRect: DOMRect,
    targetPos: { left: number; top: number; width: number; height: number },
    my: ParsedAlignment,
    at: ParsedAlignment
): { left: number; top: number } {
    let left = 0;
    let top = 0;

    // Calculate horizontal position
    if (at.horizontal === "left") {
        left = targetPos.left;
    } else if (at.horizontal === "right") {
        left = targetPos.left + targetPos.width;
    } else { // center
        left = targetPos.left + targetPos.width / 2;
    }

    // Adjust for 'my' horizontal alignment
    if (my.horizontal === "left") {
        left -= 0;
    } else if (my.horizontal === "right") {
        left -= elementRect.width;
    } else { // center
        left -= elementRect.width / 2;
    }

    left += my.horizontalOffset;
    left += at.horizontalOffset;

    // Calculate vertical position
    if (at.vertical === "top") {
        top = targetPos.top;
    } else if (at.vertical === "bottom") {
        top = targetPos.top + targetPos.height;
    } else { // center
        top = targetPos.top + targetPos.height / 2;
    }

    // Adjust for 'my' vertical alignment
    if (my.vertical === "top") {
        top -= 0;
    } else if (my.vertical === "bottom") {
        top -= elementRect.height;
    } else { // center
        top -= elementRect.height / 2;
    }

    top += my.verticalOffset;
    top += at.verticalOffset;

    return { left, top };
}

/**
 * Handle collision detection
 */
function handleCollision(
    position: { left: number; top: number },
    elementRect: DOMRect,
    collision: string,
    useFixed: boolean = false
): { left: number; top: number } {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    // For fixed positioning, coordinates are viewport-relative (0,0 is top-left of viewport)
    // For absolute positioning, coordinates are document-relative
    const minX = useFixed ? 0 : window.scrollX;
    const minY = useFixed ? 0 : window.scrollY;
    const maxX = useFixed ? viewportWidth : viewportWidth + window.scrollX;
    const maxY = useFixed ? viewportHeight : viewportHeight + window.scrollY;

    let { left, top } = position;

    if (collision === "none") {
        return { left, top };
    }

    const elementWidth = elementRect.width || 0;
    const elementHeight = elementRect.height || 0;

    // Horizontal collision detection
    if (collision.includes("flip") || collision.includes("fit")) {
        const rightEdge = left + elementWidth;
        const leftEdge = left;

        if (rightEdge > maxX && collision.includes("flip")) {
            // Flip horizontally
            left = maxX - elementWidth;
        } else if (leftEdge < minX && collision.includes("flip")) {
            left = minX;
        } else if (collision.includes("fit")) {
            // Fit within viewport
            if (rightEdge > maxX) {
                left = maxX - elementWidth;
            }
            if (leftEdge < minX) {
                left = minX;
            }
        }
    }

    // Vertical collision detection
    if (collision.includes("flip") || collision.includes("fit")) {
        const bottomEdge = top + elementHeight;
        const topEdge = top;

        if (bottomEdge > maxY && collision.includes("flip")) {
            // Flip vertically - show above instead of below
            top = maxY - elementHeight;
        } else if (topEdge < minY && collision.includes("flip")) {
            top = minY;
        } else if (collision.includes("fit")) {
            // Fit within viewport
            if (bottomEdge > maxY) {
                top = maxY - elementHeight;
            }
            if (topEdge < minY) {
                top = minY;
            }
        }
    }

    return { left, top };
}

/**
 * Position element relative to another element or event
 * Replaces jQuery UI's position() method
 */
export function position(element: HTMLElement, options: PositionOptions): void {
    if (!element) {return;}

    const my = parseAlignment(options.my || "top left");
    const at = parseAlignment(options.at || "bottom left");
    const collision = options.collision || "flipfit";

    // For mouse events, use fixed positioning (viewport-relative) for better UX
    // For elements, we can use either, but fixed is simpler
    const useFixed = options.of instanceof MouseEvent;
    
    const targetPos = getTargetPosition(options.of, useFixed);
    let elementRect = element.getBoundingClientRect();
    
    // If element has no size yet (common when content hasn't loaded), use estimated size
    if (elementRect.width === 0 || elementRect.height === 0) {
        // Use estimated dimensions based on CSS (25em width, ~20em height from content.css)
        const estimatedWidth = 400; // ~25em at default font size
        const estimatedHeight = 320; // ~20em at default font size
        elementRect = new DOMRect(
            elementRect.x,
            elementRect.y,
            estimatedWidth,
            estimatedHeight
        );
    }

    // Calculate initial position
    let pos = calculatePosition(elementRect, targetPos, my, at);

    // Handle collision detection
    pos = handleCollision(pos, elementRect, collision, useFixed);

    // Apply position
    if (useFixed) {
        element.style.position = "fixed";
    } else {
        element.style.position = "absolute";
    }
    element.style.left = pos.left + "px";
    element.style.top = pos.top + "px";
    
    // Ensure the element is visible
    element.style.visibility = "visible";
    element.style.display = "block";
}
