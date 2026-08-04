import { IAsyncSettingsStorage } from "./Interfaces.js";
import { availableModifiers, DEFAULT_TRIGGER, onMac, TriggerModifier } from "./LookupTrigger.js";

const RECORD_HISTORY_KEY = "recordHistory";

/** Exported: the content script watches this key to pick a change up without a reload. */
export const TRIGGER_MODIFIER_KEY = "triggerModifier";

/**
 * The extension's plain stored preferences.
 *
 * Appearance lives in ThemeManager, which has resolution rules of its own; anything
 * that is only a stored value belongs here. Written by the Options page, read by
 * whichever part of the extension the setting governs.
 */
class Settings {

    private settingsStorage: IAsyncSettingsStorage;
    private onMac: () => boolean;

    /**
     * @param onMac overridable for the same reason ThemeManager takes prefersDark:
     *              one setting resolves against the platform, and a test that has to
     *              run on both a Mac and a Linux CI box cannot ask the real one.
     */
    constructor(settingsStorage: IAsyncSettingsStorage, onMacPlatform?: () => boolean) {
        this.settingsStorage = settingsStorage;
        this.onMac = onMacPlatform || onMac;
    }

    /**
     * Whether lookups are added to the history store.
     *
     * Defaults to on: the setting is new, and every existing reader has been having
     * their lookups recorded. Off stops new entries only - what is already stored
     * stays browsable and exportable, and the History page's Clear… remains the way
     * to be rid of it.
     */
    async getRecordHistory(): Promise<boolean> {
        const stored = await this.settingsStorage.getItem(RECORD_HISTORY_KEY);
        // Anything other than an explicit "false" - unset, or a value written by a
        // newer version - means on.
        return stored !== "false";
    }

    async setRecordHistory(value: boolean): Promise<void> {
        await this.settingsStorage.setItem(RECORD_HISTORY_KEY, value ? "true" : "false");
    }

    /**
     * The modifier a reader holds to look a word up on the page.
     *
     * Defaults to Alt, which is what every existing reader has been using and what most
     * desktops leave alone. The setting exists for the ones that do not - see
     * LookupTrigger.
     *
     * Validated against what this platform can deliver rather than against the full
     * list: a modifier that cannot fire here would leave the reader with no working
     * gesture at all, and falling back to Alt at least leaves them one.
     */
    async getTriggerModifier(): Promise<TriggerModifier> {
        const stored = await this.settingsStorage.getItem(TRIGGER_MODIFIER_KEY);
        const usable = availableModifiers(this.onMac());
        if (stored !== null && (usable as string[]).indexOf(stored) !== -1) {
            return stored as TriggerModifier;
        }
        // Unset, unusable on this platform, or a value written by a newer version we
        // do not understand.
        return DEFAULT_TRIGGER;
    }

    async setTriggerModifier(value: TriggerModifier): Promise<void> {
        await this.settingsStorage.setItem(TRIGGER_MODIFIER_KEY, value);
    }
}

export default Settings;
