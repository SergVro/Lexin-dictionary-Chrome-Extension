import * as DomUtils from "./DomUtils.js";
import * as Icons from "./Icons.js";

/**
 * The empty, loading and error states, shared by the Translation Card and the Action
 * Popup.
 *
 * One lookup should not look like two different products depending on which surface it
 * lands in, and these three are where the extension actually lives - the happy path is
 * the easy part. Styled by `.lxState` in components.css.
 *
 * <section> and <span>, never <div>: inside the card these render within
 * `.lexinTranslationContainer`, where `.lexinTranslationContainer div` in the shared
 * sheet zeroes padding and adds a bottom margin at a specificity a bare class selector
 * cannot beat.
 */

function state(): HTMLElement {
    const element = DomUtils.createElement("section");
    DomUtils.addClass(element, "lxState");
    return element;
}

function line(text: string, className?: string): HTMLElement {
    const span = DomUtils.createElement("span", undefined, text);
    if (className) {
        DomUtils.addClass(span, className);
    }
    return span;
}

/** Shown while a lookup is in flight. */
export function loadingState(word: string): HTMLElement {
    const element = state();

    const spinner = DomUtils.createElement("span");
    DomUtils.addClass(spinner, "lxSpinner");
    DomUtils.append(element, spinner);

    // textContent by way of createElement - `word` may be whatever the reader
    // happened to click on someone else's page.
    DomUtils.append(element, line(`Searching “${word}”…`));
    return element;
}

/** Shown when the dictionary could not be reached at all. */
export function errorState(detail: string): HTMLElement {
    const element = state();

    const icon = Icons.alert();
    icon.setAttribute("class", "lxStateIcon");
    DomUtils.append(element, icon);

    DomUtils.append(element, line("Couldn’t reach the dictionary", "lxStateTitle"));
    DomUtils.append(element, line(detail));
    return element;
}

/** Shown when there is nothing to look up yet. */
export function emptyState(title: string, detail: string): HTMLElement {
    const element = state();
    DomUtils.append(element, line(title, "lxStateTitle"));
    DomUtils.append(element, line(detail));
    return element;
}

/** Replaces a container's contents with one of the states above. */
export function render(container: HTMLElement, element: HTMLElement): void {
    DomUtils.empty(container);
    DomUtils.append(container, element);
}
