import * as DomUtils from "../util/DomUtils.js";
import { fadeOut } from "../util/AnimationUtils.js";
import LanguageManager from "../common/LanguageManager.js";
import Tracker from "../common/Tracker.js";

class OptionsPage {

    private languageManager: LanguageManager;

    constructor(languageManager: LanguageManager) {
        this.languageManager = languageManager;

        this.initialize();
    }

    private async initialize(): Promise<void> {
        await this.languageManager.waitForInitialization();
        await this.fillLanguages();
        await this.restore_options();
    }

    // Saves options to chrome.storage.
    async save_options(): Promise<void> {

        const checkedLang = DomUtils.$("input[name='langs']:checked") as HTMLInputElement;
        if (checkedLang) {
            await this.languageManager.setCurrentLanguage(checkedLang.value);
        }

        const checked = DomUtils.$$("input[name='enabled']:checked") as NodeListOf<HTMLInputElement>;
        const enabled: string[] = [];
        for (let i = 0; i < checked.length; i++) {
            enabled.push(checked[i].value);
        }
        await this.languageManager.setEnabledByValues(enabled);
        // Update status to let user know options were saved.
        const status = DomUtils.$("#status") as HTMLElement;
        DomUtils.setHtml(status, "Options saved");
        status.style.display = "block";
        setTimeout(() => {
            fadeOut(status, 200);
        }, 750);
    }

    // Restores select box state to saved value from chrome.storage.
    async restore_options(): Promise<void> {
        const currentLang = await this.languageManager.getCurrentLanguage();
        const langInput = DomUtils.$(`input[name='langs'][value='${currentLang}']`) as HTMLInputElement;
        if (langInput) {
            langInput.checked = true;
        }
    }

    async fillLanguages(): Promise<void> {
        const languages = this.languageManager.getLanguages();
        const languageButtons = DomUtils.$("#languageButtons") as HTMLElement;
        DomUtils.empty(languageButtons);
        for (const lang of languages) {
            const li = DomUtils.createElement("li");
            const input = DomUtils.createElement("input", {
                type: "radio",
                name: "langs",
                value: lang.value,
                id: lang.value
            });
            const span = DomUtils.createElement("label", { for: lang.value }, lang.text);
            DomUtils.append(li, input);
            DomUtils.append(li, span);
            const checkBox = DomUtils.createElement("input", {
                type: "checkbox",
                name: "enabled",
                title: "Enabled",
                value: lang.value,
                id: "enabled_" + lang.value
            }) as HTMLInputElement;

            // Note: isEnabled and currentLanguage are async, but we need to check them synchronously here
            // This will be updated after async initialization completes
            const isEnabled = await this.languageManager.isEnabled(lang.value);
            if (isEnabled) {
                checkBox.checked = true;
            }

            const currentLang = await this.languageManager.getCurrentLanguage();
            if (lang.value === currentLang) {
                checkBox.disabled = true;
            }

            DomUtils.append(li, checkBox);
            DomUtils.append(languageButtons, li);
        }

        const self = this;
        const langInputs = DomUtils.$$("input[name='langs']") as NodeListOf<HTMLInputElement>;
        langInputs.forEach((input) => {
            input.addEventListener("change", async function() {
                const disabledInputs = DomUtils.$$("input[name='enabled']:disabled") as NodeListOf<HTMLInputElement>;
                disabledInputs.forEach((disabledInput) => {
                    disabledInput.disabled = false;
                    disabledInput.checked = false;
                });
                const enabledInput = DomUtils.$(`#enabled_${this.value}`) as HTMLInputElement;
                if (enabledInput) {
                    enabledInput.checked = true;
                    enabledInput.disabled = true;
                }
                await self.save_options();
                Tracker.track("language", "changed");
            });
        });

        const enabledInputs = DomUtils.$$("input[name='enabled']") as NodeListOf<HTMLInputElement>;
        enabledInputs.forEach((input) => {
            input.addEventListener("change", async function() {
                await self.save_options();
                Tracker.track("enabled_language", "changed", this.value);
            });
        });

        const checkAll = DomUtils.$("#checkAll") as HTMLInputElement;
        if (checkAll) {
            // Initialize checkAll state based on actual enabled languages
            const enabledLanguages = await this.languageManager.getEnabledLanguages();
            const allLanguages = this.languageManager.getLanguages();
            // Check if all languages (except possibly the current one which is always enabled) are enabled
            // We need to account for the fact that currentLanguage is always included
            const enabledCount = enabledLanguages.length;
            const totalCount = allLanguages.length;
            checkAll.checked = enabledCount === totalCount;
            
            checkAll.addEventListener("change", async function() {
                const checkbox = this as HTMLInputElement;
                const enabledInputs = DomUtils.$$("input[name='enabled']:enabled") as NodeListOf<HTMLInputElement>;
                enabledInputs.forEach((input) => {
                    input.checked = checkbox.checked;
                });
                await self.save_options();
                Tracker.track("enabled_language", "changed_all", checkbox.checked.toString());
            });
        }
    }
}

export default OptionsPage;
