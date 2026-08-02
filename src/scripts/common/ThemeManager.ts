import { IAsyncSettingsStorage } from "./Interfaces.js";

/** What the reader chose. "system" defers to the OS. */
export type Appearance = "light" | "dark" | "system";

/** What a surface actually renders as, once "system" has been resolved. */
export type Theme = "light" | "dark";

const APPEARANCE_KEY = "appearance";
const DEFAULT_APPEARANCE: Appearance = "system";

/**
 * Whether the OS is currently asking for a dark UI.
 *
 * Guarded rather than assumed: this module is imported into the content script,
 * which runs in frames of every kind, and the unit tests run under node with no
 * window at all.
 */
export function systemPrefersDark(): boolean {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Writes the resolved theme where tokens.css can see it. Every token flips off this
 * one attribute - see the [data-lx-theme="dark"] block there.
 */
export function applyTheme(element: Element | null, theme: Theme): void {
    if (element) {
        element.setAttribute("data-lx-theme", theme);
    }
}

/**
 * Reads and writes the Appearance setting, and turns it into the theme a surface
 * should render.
 *
 * The setting is stored today so the Translation Card can honour it; the Options
 * page control that writes it lands with the Options redesign. Until then every
 * reader is on "system", which is the behaviour they would expect anyway.
 */
class ThemeManager {

    private settingsStorage: IAsyncSettingsStorage;
    private prefersDark: () => boolean;

    /**
     * @param prefersDark overridable so the resolution rules can be tested without
     *                    a browser, and so a caller can supply a live MediaQueryList.
     */
    constructor(settingsStorage: IAsyncSettingsStorage, prefersDark?: () => boolean) {
        this.settingsStorage = settingsStorage;
        this.prefersDark = prefersDark || systemPrefersDark;
    }

    async getAppearance(): Promise<Appearance> {
        const stored = await this.settingsStorage.getItem(APPEARANCE_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") {
            return stored;
        }
        // Unset, or a value written by a newer version we do not understand.
        return DEFAULT_APPEARANCE;
    }

    async setAppearance(value: Appearance): Promise<void> {
        await this.settingsStorage.setItem(APPEARANCE_KEY, value);
    }

    resolveTheme(appearance: Appearance): Theme {
        if (appearance === "light" || appearance === "dark") {
            return appearance;
        }
        return this.prefersDark() ? "dark" : "light";
    }

    async getTheme(): Promise<Theme> {
        return this.resolveTheme(await this.getAppearance());
    }
}

export default ThemeManager;
