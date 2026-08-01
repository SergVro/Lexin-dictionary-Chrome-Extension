import * as DomUtils from "./DomUtils.js";

export interface IConfirmOptions {
    title: string;
    body: string;
    /** Label for the destructive action. The other button is always "Cancel". */
    confirmLabel: string;
}

/**
 * A themed confirmation, replacing the browser's `confirm()`.
 *
 * `confirm()` was the last piece of unstyled chrome in the extension, and it could not
 * say what it was about to do in the extension's own words. This one traps Tab inside
 * itself, closes on Escape, and resolves false unless the reader picks the destructive
 * action - so a mis-click or a dismissed dialog never destroys anything.
 */
export function confirmDialog(options: IConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const previousFocus = document.activeElement as HTMLElement;

        const backdrop = DomUtils.createElement("div");
        DomUtils.addClass(backdrop, "lxDialogBackdrop");

        const dialog = DomUtils.createElement("div", {
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "lxDialogTitle"
        });
        DomUtils.addClass(dialog, "lxDialog");

        const title = DomUtils.createElement("div", { id: "lxDialogTitle" }, options.title);
        DomUtils.addClass(title, "lxDialogTitle");
        DomUtils.append(dialog, title);

        const body = DomUtils.createElement("div", undefined, options.body);
        DomUtils.addClass(body, "lxDialogBody");
        DomUtils.append(dialog, body);

        const actions = DomUtils.createElement("div");
        DomUtils.addClass(actions, "lxDialogActions");

        const cancel = DomUtils.createElement("button", { type: "button" }, "Cancel");
        DomUtils.addClass(cancel, "lxButton");
        DomUtils.addClass(cancel, "lxButtonSecondary");

        const confirm = DomUtils.createElement("button", { type: "button" }, options.confirmLabel);
        DomUtils.addClass(confirm, "lxButton");
        DomUtils.addClass(confirm, "lxButtonPrimary");

        DomUtils.append(actions, cancel);
        DomUtils.append(actions, confirm);
        DomUtils.append(dialog, actions);
        DomUtils.append(backdrop, dialog);

        const close = (result: boolean) => {
            document.removeEventListener("keydown", onKeyDown, true);
            DomUtils.remove(backdrop);
            if (previousFocus && previousFocus.focus) {
                previousFocus.focus();
            }
            resolve(result);
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                close(false);
                return;
            }
            if (e.key !== "Tab") {
                return;
            }
            // Two focusable controls, so the trap is just a wrap at each end.
            const forward = !e.shiftKey;
            if (forward && document.activeElement === confirm) {
                e.preventDefault();
                cancel.focus();
            } else if (!forward && document.activeElement === cancel) {
                e.preventDefault();
                confirm.focus();
            }
        };

        cancel.addEventListener("click", () => close(false));
        confirm.addEventListener("click", () => close(true));
        // Clicking the backdrop itself dismisses; clicking the dialog must not.
        backdrop.addEventListener("click", (e: MouseEvent) => {
            if (e.target === backdrop) {
                close(false);
            }
        });
        document.addEventListener("keydown", onKeyDown, true);

        document.body.appendChild(backdrop);
        cancel.focus();
    });
}
