/**
 * DOM utility functions providing modern browser API wrappers
 */

/**
 * Query selector helper - returns single element or null
 */
export function $(selector: string, context?: Element | Document): Element | null {
    const ctx = context || document;
    return ctx.querySelector(selector);
}

/**
 * Query selector all helper - returns NodeList
 */
export function $$(selector: string, context?: Element | Document): NodeListOf<Element> {
    const ctx = context || document;
    return ctx.querySelectorAll(selector);
}

/**
 * Create element with optional attributes and text content
 */
export function createElement(tag: string, attributes?: Record<string, string>, textContent?: string): HTMLElement {
    const element = document.createElement(tag);
    
    if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
            element.setAttribute(key, value);
        }
    }
    
    if (textContent !== undefined) {
        element.textContent = textContent;
    }
    
    return element;
}

/**
 * Get value from form element
 */
export function getValue(element: Element | null): string {
    if (!element) {return "";}
    if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
        return element.value;
    }
    return "";
}

/**
 * Set value on form element
 */
export function setValue(element: Element | null, value: string): void {
    if (!element) {return;}
    if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
        element.value = value;
    }
}

/**
 * Get HTML content
 */
export function getHtml(element: Element | null): string {
    return element ? element.innerHTML : "";
}

/**
 * Set HTML content
 */
export function setHtml(element: Element | null, html: string): void {
    if (element) {
        element.innerHTML = html;
    }
}

/**
 * Get text content
 */
export function getText(element: Element | null): string {
    return element ? (element.textContent || "") : "";
}

/**
 * Set text content
 */
export function setText(element: Element | null, text: string): void {
    if (element) {
        element.textContent = text;
    }
}

/**
 * Get attribute value
 */
export function getAttr(element: Element | null, name: string): string | null {
    return element ? element.getAttribute(name) : null;
}

/**
 * Set attribute value
 */
export function setAttr(element: Element | null, name: string, value: string): void {
    if (element) {
        element.setAttribute(name, value);
    }
}

/**
 * Remove attribute
 */
export function removeAttr(element: Element | null, name: string): void {
    if (element) {
        element.removeAttribute(name);
    }
}

/**
 * Get property value
 */
export function getProp(element: Element | null, prop: string): any {
    if (!element) {return undefined;}
    return (element as any)[prop];
}

/**
 * Set property value
 */
export function setProp(element: Element | null, prop: string, value: any): void {
    if (element) {
        (element as any)[prop] = value;
    }
}

/**
 * Add class
 */
export function addClass(element: Element | null, className: string): void {
    if (element) {
        element.classList.add(className);
    }
}

/**
 * Remove class
 */
export function removeClass(element: Element | null, className: string): void {
    if (element) {
        element.classList.remove(className);
    }
}

/**
 * Check if element has class
 */
export function hasClass(element: Element | null, className: string): boolean {
    return element ? element.classList.contains(className) : false;
}

/**
 * Set CSS style property
 */
export function setCss(element: HTMLElement | null, property: string, value: string): void {
    if (element) {
        (element.style as any)[property] = value;
    }
}

/**
 * Get CSS style property
 */
export function getCss(element: HTMLElement | null, property: string): string {
    if (!element) {return "";}
    const style = window.getComputedStyle(element);
    return (style as any)[property] || "";
}

/**
 * Empty element (remove all children)
 */
export function empty(element: Element | null): void {
    if (element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}

/**
 * Append child to parent
 */
export function append(parent: Element | null, child: Node): void {
    if (parent) {
        parent.appendChild(child);
    }
}

/**
 * Append element to target
 */
export function appendTo(child: Node, target: Element | null): void {
    if (target) {
        target.appendChild(child);
    }
}

/**
 * Remove element from DOM
 */
export function remove(element: Element | null): void {
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
}

/**
 * Get next sibling element
 */
export function next(element: Element | null): Element | null {
    if (!element) {return null;}
    let sibling = element.nextSibling;
    while (sibling && sibling.nodeType !== Node.ELEMENT_NODE) {
        sibling = sibling.nextSibling;
    }
    return sibling as Element | null;
}

/**
 * Trim string (native String.trim)
 */
export function trim(str: string): string {
    return str.trim();
}

/**
 * Iterate over array-like object
 */
export function each<T>(array: ArrayLike<T>, callback: (index: number, item: T) => void): void {
    for (let i = 0; i < array.length; i++) {
        callback(i, array[i]);
    }
}

/**
 * Check if element exists and has length > 0
 */
export function exists(element: Element | NodeListOf<Element> | null): boolean {
    if (!element) {return false;}
    // Check if it's a NodeList by checking for 'item' method (NodeList characteristic)
    if ("item" in element && typeof (element as any).item === "function") {
        return (element as NodeListOf<Element>).length > 0;
    }
    return true;
}

/**
 * Get length of element or NodeList
 */
export function length(element: Element | NodeListOf<Element> | null): number {
    if (!element) {return 0;}
    // Check if it's a NodeList by checking for 'item' method (NodeList characteristic)
    if ("item" in element && typeof (element as any).item === "function") {
        return (element as NodeListOf<Element>).length;
    }
    return 1;
}
