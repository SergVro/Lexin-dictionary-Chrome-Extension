import {
    availableModifiers,
    gestureLabel,
    isTriggerModifier,
    matchesTrigger,
    modifierLabel,
    TRIGGER_MODIFIERS,
    TriggerModifier
} from "../../src/scripts/common/LookupTrigger.js";

/** A MouseEvent as far as matchesTrigger is concerned, with only the flags set. */
function flags(down: Partial<Record<"alt" | "ctrl" | "shift" | "meta", boolean>>) {
    return {
        altKey: !!down.alt,
        ctrlKey: !!down.ctrl,
        shiftKey: !!down.shift,
        metaKey: !!down.meta
    };
}

/** An event that reports only through getModifierState, with no flat flags at all. */
function stateOnly(...keys: string[]) {
    return { getModifierState: (key: string) => keys.indexOf(key) !== -1 };
}

describe("LookupTrigger", () => {

    describe("matchesTrigger", () => {
        it("should match a modifier held on its own", () => {
            expect(matchesTrigger(flags({ alt: true }), "alt")).toBe(true);
            expect(matchesTrigger(flags({ ctrl: true }), "ctrl")).toBe(true);
            expect(matchesTrigger(flags({ shift: true }), "shift")).toBe(true);
        });

        it("should not match a modifier that is not held", () => {
            expect(matchesTrigger(flags({}), "alt")).toBe(false);
            expect(matchesTrigger(flags({ shift: true }), "alt")).toBe(false);
            expect(matchesTrigger(flags({ alt: true }), "ctrl")).toBe(false);
        });

        it("should read getModifierState when the event carries no flags", () => {
            // The flat flags are the legacy API. An event that only implements the
            // documented one still has to work.
            expect(matchesTrigger(stateOnly("Alt"), "alt")).toBe(true);
            expect(matchesTrigger(stateOnly("Control"), "ctrl")).toBe(true);
            expect(matchesTrigger(stateOnly("Shift"), "shift")).toBe(true);
            expect(matchesTrigger(stateOnly("Alt"), "shift")).toBe(false);
        });

        it("should tolerate an event with no getModifierState at all", () => {
            expect(matchesTrigger({ altKey: true }, "alt")).toBe(true);
            expect(matchesTrigger({}, "alt")).toBe(false);
        });

        it("should not match when a second modifier is also held", () => {
            // Exclusivity, and a deliberate change from the Alt-only behaviour:
            // a permissive match would fire Ctrl+Shift+click for a Ctrl reader and a
            // Shift reader alike, and compound chords are where browsers and pages
            // put meanings of their own.
            for (const modifier of TRIGGER_MODIFIERS) {
                for (const other of TRIGGER_MODIFIERS) {
                    if (other === modifier) { continue; }
                    const both = flags({ [modifier]: true, [other]: true });
                    expect(matchesTrigger(both, modifier)).toBe(false);
                }
            }
        });

        it("should not match when Meta is held", () => {
            // Cmd+click already opens a link in a new tab. Firing as well would do both.
            expect(matchesTrigger(flags({ alt: true, meta: true }), "alt")).toBe(false);
            expect(matchesTrigger(stateOnly("Shift", "Meta"), "shift")).toBe(false);
        });
    });

    describe("isTriggerModifier", () => {
        it("should accept every modifier the setting can hold", () => {
            TRIGGER_MODIFIERS.forEach((modifier) => {
                expect(isTriggerModifier(modifier)).toBe(true);
            });
        });

        it("should reject anything else", () => {
            expect(isTriggerModifier("meta")).toBe(false);
            expect(isTriggerModifier("")).toBe(false);
            expect(isTriggerModifier(null)).toBe(false);
        });
    });

    describe("availableModifiers", () => {
        it("should offer all three away from a Mac", () => {
            expect(availableModifiers(false)).toEqual(["alt", "ctrl", "shift"]);
        });

        it("should not offer Ctrl on a Mac", () => {
            // macOS defines Ctrl+click as the secondary click, so Chrome raises
            // contextmenu off the mousedown and never fires the click. The gesture
            // cannot work there, and offering it would be offering a dead option.
            expect(availableModifiers(true)).toEqual(["alt", "shift"]);
        });
    });

    describe("labels", () => {
        it("should name the keys as the platform engraves them", () => {
            expect(modifierLabel("alt", false)).toBe("Alt");
            expect(modifierLabel("ctrl", false)).toBe("Ctrl");
            expect(modifierLabel("shift", false)).toBe("Shift");

            expect(modifierLabel("alt", true)).toBe("Option");
            expect(modifierLabel("ctrl", true)).toBe("Control");
            expect(modifierLabel("shift", true)).toBe("Shift");
        });

        it("should spell out the whole gesture", () => {
            expect(gestureLabel("alt", "double-click", false)).toBe("Alt + double-click");
            expect(gestureLabel("alt", "click", true)).toBe("Option + click");
            expect(gestureLabel("shift", "double-click", true)).toBe("Shift + double-click");
        });

        it("should have a label for every modifier it offers", () => {
            // A modifier added to the list without a label would render as a blank
            // option on the Options page.
            TRIGGER_MODIFIERS.forEach((modifier: TriggerModifier) => {
                expect(modifierLabel(modifier, false)).toBeTruthy();
                expect(modifierLabel(modifier, true)).toBeTruthy();
            });
        });
    });
});
