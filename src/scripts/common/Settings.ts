import { IAsyncSettingsStorage } from "./Interfaces.js";

const RECORD_HISTORY_KEY = "recordHistory";
const LOOKUP_MODIFIER_KEY = "lookupModifier";

export type LookupModifier = "alt" | "control" | "shift";

/**
 * The extension's plain stored preferences.
 *
 * Appearance lives in ThemeManager, which has resolution rules of its own; anything
 * that is only a stored value belongs here. Written by the Options page, read by
 * whichever part of the extension the setting governs.
 */
class Settings {

    private settingsStorage: IAsyncSettingsStorage;

    constructor(settingsStorage: IAsyncSettingsStorage) {
        this.settingsStorage = settingsStorage;
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

    /** Modifier held while clicking a word to open the on-page translation card. */
    async getLookupModifier(): Promise<LookupModifier> {
        const stored = await this.settingsStorage.getItem(LOOKUP_MODIFIER_KEY);
        return stored === "control" || stored === "shift" ? stored : "alt";
    }

    async setLookupModifier(value: LookupModifier): Promise<void> {
        await this.settingsStorage.setItem(LOOKUP_MODIFIER_KEY, value);
    }
}

export default Settings;
