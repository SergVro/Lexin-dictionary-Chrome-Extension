import * as DomUtils from "./DomUtils.js";
import * as Icons from "./Icons.js";

/** How long a toast stays before it fades. */
const VISIBLE_MS = 2200;
const FADE_MS = 200;

let current: HTMLElement | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * Confirms something that already happened - "Options saved", "11 copied to
 * clipboard".
 *
 * One at a time: the Options page saves on every change, so a reader flipping three
 * switches should see one message move on, not three stack up. `role="status"` rather
 * than `alert` because none of this is urgent, and a polite live region will not
 * interrupt what a screen reader is already saying.
 */
export function showToast(message: string): void {
    if (timer) {
        clearTimeout(timer);
    }
    if (current) {
        DomUtils.remove(current);
    }

    const toast = DomUtils.createElement("div", { role: "status", "aria-live": "polite" });
    DomUtils.addClass(toast, "lxToast");

    const icon = Icons.check();
    icon.setAttribute("class", "lxToastIcon");
    DomUtils.append(toast, icon);
    DomUtils.append(toast, DomUtils.createElement("span", undefined, message));

    document.body.appendChild(toast);
    current = toast;

    timer = setTimeout(() => {
        DomUtils.addClass(toast, "lxToastLeaving");
        timer = setTimeout(() => {
            DomUtils.remove(toast);
            if (current === toast) {
                current = undefined;
            }
        }, FADE_MS);
    }, VISIBLE_MS);
}
