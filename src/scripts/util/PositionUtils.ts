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
    horizontal: 'left' | 'center' | 'right';
    vertical: 'top' | 'center' | 'bottom';
    horizontalOffset: number;
    verticalOffset: number;
}

/**
 * Parse alignment string like "center+10 bottom-20"
 */
function parseAlignment(alignment: string): ParsedAlignment {
    const parts = alignment.trim().split(/\s+/);
    let horizontal: 'left' | 'center' | 'right' = 'center';
    let vertical: 'top' | 'center' | 'bottom' = 'center';
    let horizontalOffset = 0;
    let verticalOffset = 0;

    for (const part of parts) {
        // Check for horizontal alignment
        if (part.includes('left')) {
            horizontal = 'left';
            const match = part.match(/left([+-]?\d+)/);
            if (match) horizontalOffset = parseInt(match[1], 10);
        } else if (part.includes('right')) {
            horizontal = 'right';
            const match = part.match(/right([+-]?\d+)/);
            if (match) horizontalOffset = parseInt(match[1], 10);
        } else if (part.includes('center')) {
            horizontal = 'center';
            const match = part.match(/center([+-]?\d+)/);
            if (match) horizontalOffset = parseInt(match[1], 10);
        }
        
        // Check for vertical alignment
        if (part.includes('top')) {
            vertical = 'top';
            const match = part.match(/top([+-]?\d+)/);
            if (match) verticalOffset = parseInt(match[1], 10);
        } else if (part.includes('bottom')) {
            vertical = 'bottom';
            const match = part.match(/bottom([+-]?\d+)/);
            if (match) verticalOffset = parseInt(match[1], 10);
        } else if (part.includes('center') && !part.includes('left') && !part.includes('right')) {
            vertical = 'center';
            const match = part.match(/center([+-]?\d+)/);
            if (match) verticalOffset = parseInt(match[1], 10);
        }
    }

    return { horizontal, vertical, horizontalOffset, verticalOffset };
}

/**
 * Get target position from 'of' option
 */
function getTargetPosition(of: Element | MouseEvent | { left: number; top: number }): { left: number; top: number; width: number; height: number } {
    if ('left' in of && 'top' in of && typeof of.left === 'number' && typeof of.top === 'number') {
        // It's a plain object with coordinates
        return { left: of.left, top: of.top, width: 0, height: 0 };
    } else if (of instanceof MouseEvent) {
        // It's a mouse event
        return { left: of.clientX, top: of.clientY, width: 0, height: 0 };
    } else if (of instanceof Element) {
        // It's an element
        const rect = of.getBoundingClientRect();
        return {
            left: rect.left + window.scrollX,
            top: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height
        };
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
    if (at.horizontal === 'left') {
        left = targetPos.left;
    } else if (at.horizontal === 'right') {
        left = targetPos.left + targetPos.width;
    } else { // center
        left = targetPos.left + targetPos.width / 2;
    }

    // Adjust for 'my' horizontal alignment
    if (my.horizontal === 'left') {
        left -= 0;
    } else if (my.horizontal === 'right') {
        left -= elementRect.width;
    } else { // center
        left -= elementRect.width / 2;
    }

    left += my.horizontalOffset;
    left += at.horizontalOffset;

    // Calculate vertical position
    if (at.vertical === 'top') {
        top = targetPos.top;
    } else if (at.vertical === 'bottom') {
        top = targetPos.top + targetPos.height;
    } else { // center
        top = targetPos.top + targetPos.height / 2;
    }

    // Adjust for 'my' vertical alignment
    if (my.vertical === 'top') {
        top -= 0;
    } else if (my.vertical === 'bottom') {
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
    collision: string
): { left: number; top: number } {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    let { left, top } = position;

    if (collision === 'none') {
        return { left, top };
    }

    const elementWidth = elementRect.width;
    const elementHeight = elementRect.height;

    // Horizontal collision detection
    if (collision.includes('flip') || collision.includes('fit')) {
        const rightEdge = left + elementWidth;
        const leftEdge = left;

        if (rightEdge > viewportWidth + scrollX && collision.includes('flip')) {
            // Flip horizontally
            left = viewportWidth + scrollX - elementWidth;
        } else if (leftEdge < scrollX && collision.includes('flip')) {
            left = scrollX;
        } else if (collision.includes('fit')) {
            // Fit within viewport
            if (rightEdge > viewportWidth + scrollX) {
                left = viewportWidth + scrollX - elementWidth;
            }
            if (leftEdge < scrollX) {
                left = scrollX;
            }
        }
    }

    // Vertical collision detection
    if (collision.includes('flip') || collision.includes('fit')) {
        const bottomEdge = top + elementHeight;
        const topEdge = top;

        if (bottomEdge > viewportHeight + scrollY && collision.includes('flip')) {
            // Flip vertically
            top = viewportHeight + scrollY - elementHeight;
        } else if (topEdge < scrollY && collision.includes('flip')) {
            top = scrollY;
        } else if (collision.includes('fit')) {
            // Fit within viewport
            if (bottomEdge > viewportHeight + scrollY) {
                top = viewportHeight + scrollY - elementHeight;
            }
            if (topEdge < scrollY) {
                top = scrollY;
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
    if (!element) return;

    const my = parseAlignment(options.my || 'top left');
    const at = parseAlignment(options.at || 'bottom left');
    const collision = options.collision || 'flipfit';

    const targetPos = getTargetPosition(options.of);
    const elementRect = element.getBoundingClientRect();

    // Calculate initial position
    let pos = calculatePosition(elementRect, targetPos, my, at);

    // Handle collision detection
    pos = handleCollision(pos, elementRect, collision);

    // Apply position
    element.style.position = 'absolute';
    element.style.left = pos.left + 'px';
    element.style.top = pos.top + 'px';
}
