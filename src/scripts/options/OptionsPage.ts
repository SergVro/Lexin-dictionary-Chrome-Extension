import * as DomUtils from "../util/DomUtils.js";
import * as Icons from "../util/Icons.js";
import { showToast } from "../util/Toast.js";
import { fold } from "../util/Combobox.js";
import LanguageManager from "../common/LanguageManager.js";
import ThemeManager, { Appearance, applyTheme } from "../common/ThemeManager.js";
import Settings from "../common/Settings.js";
import { ILanguage } from "../common/Interfaces.js";

class OptionsPage {

    private languageManager: LanguageManager;
    private themeManager: ThemeManager;
    private settings: Settings;

    private languages: ILanguage[] = [];
    private enabled = new Set<string>();
    private defaultLanguage: string = "";
    private query = "";

    constructor(languageManager: LanguageManager, themeManager: ThemeManager, settings: Settings) {
        this.languageManager = languageManager;
        this.themeManager = themeManager;
        this.settings = settings;

        this.initialize();
    }

    private async initialize(): Promise<void> {
        DomUtils.append(DomUtils.$("#searchIcon"), Icons.search());

        await this.languageManager.waitForInitialization();
        this.languages = this.languageManager.getLanguages();
        this.defaultLanguage = await this.languageManager.getCurrentLanguage();

        const enabledLanguages = await this.languageManager.getEnabledLanguages();
        this.enabled = new Set(enabledLanguages.map((lang) => lang.value));

        this.renderLanguages();
        await this.restoreSettings();
        this.subscribeOnEvents();
    }

    // ── Languages ────────────────────────────────────────────────────────────────

    private visibleLanguages(): ILanguage[] {
        const needle = fold(this.query.trim());
        return needle
            ? this.languages.filter((lang) => fold(lang.text).indexOf(needle) >= 0)
            : this.languages;
    }

    private renderLanguages(): void {
        const rows = DomUtils.$("#languageRows") as HTMLElement;
        DomUtils.empty(rows);

        const fragment = document.createDocumentFragment();

        for (const lang of this.visibleLanguages()) {
            const isDefault = lang.value === this.defaultLanguage;
            const isVisible = this.enabled.has(lang.value) || isDefault;

            const tr = DomUtils.createElement("tr");
            DomUtils.append(tr, DomUtils.createElement("td", undefined, lang.text));

            // Visible
            const visibleCell = DomUtils.createElement("td");
            DomUtils.addClass(visibleCell, "lxColVisible");
            const checkbox = DomUtils.createElement("input", {
                type: "checkbox",
                value: lang.value,
                "aria-label": `Show ${lang.text}`
            }) as HTMLInputElement;
            checkbox.checked = isVisible;
            // The default is what a lookup falls back to, so hiding it would leave the
            // extension pointing at a language the reader cannot see or change.
            checkbox.disabled = isDefault;
            if (isDefault) {
                DomUtils.setAttr(checkbox, "title", "The default language is always visible");
            }
            checkbox.addEventListener("change", () => this.setVisible(lang, checkbox.checked));
            DomUtils.append(visibleCell, checkbox);
            DomUtils.append(tr, visibleCell);

            // Default
            const defaultCell = DomUtils.createElement("td");
            DomUtils.addClass(defaultCell, "lxColDefault");
            if (isDefault) {
                const chip = DomUtils.createElement("span", undefined, "Default");
                DomUtils.addClass(chip, "lxChip");
                DomUtils.addClass(chip, "lxChipAccent");
                DomUtils.append(defaultCell, chip);
            } else if (isVisible) {
                const button = DomUtils.createElement("button", {
                    type: "button",
                    "aria-label": `Make ${lang.text} the default language`
                }, "Set default");
                DomUtils.addClass(button, "lxButton");
                DomUtils.addClass(button, "lxButtonQuiet");
                button.addEventListener("click", () => this.setDefault(lang));
                DomUtils.append(defaultCell, button);
            } else {
                // Not visible, so not eligible - make it visible first.
                const dash = DomUtils.createElement("span", { title: "Make it visible first" }, "—");
                DomUtils.addClass(dash, "lxNoDefault");
                DomUtils.append(defaultCell, dash);
            }
            DomUtils.append(tr, defaultCell);

            fragment.appendChild(tr);
        }

        rows.appendChild(fragment);
    }

    private async setVisible(lang: ILanguage, visible: boolean): Promise<void> {
        if (visible) {
            this.enabled.add(lang.value);
        } else {
            this.enabled.delete(lang.value);
        }
        await this.saveEnabled();
        // The Default cell for this row turns into a button or an em dash.
        this.renderLanguages();
    }

    private async setDefault(lang: ILanguage): Promise<void> {
        this.defaultLanguage = lang.value;
        // Being the default implies being visible - the checkbox for the new default
        // is about to become disabled, so the set has to agree with it.
        this.enabled.add(lang.value);
        await this.languageManager.setCurrentLanguage(lang.value);
        await this.saveEnabled();
        this.renderLanguages();
    }

    private async saveEnabled(): Promise<void> {
        await this.languageManager.setEnabledByValues(Array.from(this.enabled));
        showToast("Options saved");
    }

    /**
     * Bulk toggles act on what the search is showing, so "Disable all" after typing
     * "kurd" does what it says rather than clearing the other nineteen too.
     */
    private async setAllVisible(visible: boolean): Promise<void> {
        for (const lang of this.visibleLanguages()) {
            if (lang.value === this.defaultLanguage) {
                continue; // always visible
            }
            if (visible) {
                this.enabled.add(lang.value);
            } else {
                this.enabled.delete(lang.value);
            }
        }
        await this.saveEnabled();
        this.renderLanguages();
    }

    // ── Settings ─────────────────────────────────────────────────────────────────

    private async restoreSettings(): Promise<void> {
        const appearance = await this.themeManager.getAppearance();
        const appearanceInput = DomUtils.$(`#appearance input[value='${appearance}']`) as HTMLInputElement;
        if (appearanceInput) {
            appearanceInput.checked = true;
        }

        const recording = await this.settings.getRecordHistory();
        const recordInput = DomUtils.$(`#recordHistory input[value='${recording ? "on" : "off"}']`) as HTMLInputElement;
        if (recordInput) {
            recordInput.checked = true;
        }
    }

    private subscribeOnEvents(): void {
        const search = DomUtils.$("#languageSearch") as HTMLInputElement;
        search?.addEventListener("input", () => {
            this.query = search.value;
            this.renderLanguages();
        });

        DomUtils.$("#enableAll")?.addEventListener("click", () => this.setAllVisible(true));
        DomUtils.$("#disableAll")?.addEventListener("click", () => this.setAllVisible(false));

        DomUtils.$("#appearance")?.addEventListener("change", async (e: Event) => {
            const appearance = (e.target as HTMLInputElement).value as Appearance;
            await this.themeManager.setAppearance(appearance);
            // Applied here and now: the page carrying the control is where a reader
            // expects to see what they just chose.
            applyTheme(document.documentElement, this.themeManager.resolveTheme(appearance));
            showToast("Options saved");
        });

        DomUtils.$("#recordHistory")?.addEventListener("change", async (e: Event) => {
            const recording = (e.target as HTMLInputElement).value === "on";
            await this.settings.setRecordHistory(recording);
            showToast("Options saved");
        });
    }
}

export default OptionsPage;
