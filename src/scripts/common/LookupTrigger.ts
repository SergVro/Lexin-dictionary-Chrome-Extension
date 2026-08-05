/**
 * The gesture that opens a Translation Card on a page.
 *
 * Alt was the only trigger for the extension's whole life, and on most desktops it is
 * a fine one. ChromeOS is not most desktops: there Alt+click *is* the secondary click,
 * consumed by the window server before the page is sent anything at all. GNOME grabs
 * it for window-move. Readers on those desktops could not look a word up, and no
 * amount of care in a content script wins an event it never receives - so the
 * modifier became theirs to choose.
 *
 * The rules live here rather than on Settings because none of them need storage:
 * every one takes what it needs as an argument, which is also what makes them
 * testable under node with no browser at all.
 */

/**
 * The keyboard shortcut declared in the manifest, and the other half of the answer:
 * a shortcut is the one trigger no desktop can take for itself. Chrome routes it to
 * the service worker and nowhere else, and owns the binding at
 * chrome://extensions/shortcuts.
 */
export const TRANSLATE_SELECTION_COMMAND = "translate-selection";

/** The key a reader holds while clicking a word. Single modifiers only. */
export type TriggerModifier = "alt" | "ctrl" | "shift";

export const DEFAULT_TRIGGER: TriggerModifier = "alt";

/** Every modifier the setting can hold, in the order the Options page offers them. */
export const TRIGGER_MODIFIERS: TriggerModifier[] = ["alt", "ctrl", "shift"];

/**
 * The shape matchesTrigger reads. A MouseEvent satisfies it in production; a unit test
 * satisfies it with an object literal, which is the point - the predicate is the one
 * piece of this feature worth testing exhaustively, and it should not need a DOM.
 */
export interface IModifierState {
    altKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
    getModifierState?(key: string): boolean;
}

/** The DOM's name for each modifier, for getModifierState. */
const MODIFIER_STATE_KEYS: { [key: string]: string } = {
    alt: "Alt",
    ctrl: "Control",
    shift: "Shift",
    meta: "Meta"
};

/** Whether this platform is a Mac. Injectable everywhere below so tests need no stub. */
export function onMac(): boolean {
    if (typeof navigator === "undefined") {
        return false;
    }
    const platform = (navigator as Navigator & { userAgentData?: { platform?: string } })
        .userAgentData?.platform || navigator.platform || "";
    return /mac/i.test(platform);
}

/** Whether a single modifier is down, by either the flag or the standard API. */
function held(event: IModifierState, modifier: string): boolean {
    const flag = event[(modifier + "Key") as keyof IModifierState];
    if (flag === true) {
        return true;
    }
    // getModifierState is the documented API; the flat flags are the legacy one. Both
    // are read because either can be the one a given event carries.
    const stateKey = MODIFIER_STATE_KEYS[modifier];
    return !!(stateKey && typeof event.getModifierState === "function"
        && event.getModifierState(stateKey));
}

/**
 * Whether this event carries the reader's modifier and nothing else.
 *
 * The match is exclusive, which is a change from the Alt-only behaviour: Alt+Shift+click
 * used to open a card and no longer does. With three modifiers to choose between,
 * a permissive match would fire Ctrl+Shift+click for a Ctrl reader *and* a Shift one,
 * and compound chords are exactly where browsers and pages put meanings of their own -
 * Cmd+click opens a link in a new tab, and AltGr on Windows is literally Ctrl+Alt.
 */
export function matchesTrigger(event: IModifierState, modifier: TriggerModifier): boolean {
    if (!held(event, modifier)) {
        return false;
    }
    const others = TRIGGER_MODIFIERS.filter((other) => other !== modifier);
    return !others.some((other) => held(event, other)) && !held(event, "meta");
}

/** Whether this is a modifier we understand. Used by the validate-or-default read. */
export function isTriggerModifier(value: string | null): value is TriggerModifier {
    return value !== null && (TRIGGER_MODIFIERS as string[]).indexOf(value) !== -1;
}

/**
 * The modifiers this platform can actually deliver.
 *
 * Ctrl is not offered on a Mac, and that is deliberate rather than an oversight: macOS
 * defines Ctrl+click as the secondary click, so Chrome raises contextmenu off the
 * mousedown and never fires the click at all. The gesture cannot work there whatever
 * the page does. A Mac needs no escape hatch anyway - Option+click, the default, is
 * precisely what this feature exists to work around on other desktops.
 */
export function availableModifiers(mac: boolean = onMac()): TriggerModifier[] {
    return TRIGGER_MODIFIERS.filter((modifier) => !(mac && modifier === "ctrl"));
}

/** What to call the key in prose. A Mac engraves Alt as Option and Ctrl as Control. */
export function modifierLabel(modifier: TriggerModifier, mac: boolean = onMac()): string {
    if (mac) {
        if (modifier === "alt") { return "Option"; }
        if (modifier === "ctrl") { return "Control"; }
    }
    if (modifier === "alt") { return "Alt"; }
    if (modifier === "ctrl") { return "Ctrl"; }
    return "Shift";
}

/** The whole gesture, as the help page and the empty states say it. */
export function gestureLabel(modifier: TriggerModifier,
                             gesture: "click" | "double-click",
                             mac: boolean = onMac()): string {
    return modifierLabel(modifier, mac) + " + " + gesture;
}
