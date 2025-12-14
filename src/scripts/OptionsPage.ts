import * as DomUtils from "./util/DomUtils.js";
import { fadeOut } from "./util/AnimationUtils.js";
import LanguageManager from "./LanguageManager.js";
import Tracker from "./Tracker.js";

class OptionsPage {

    private languageManager: LanguageManager;

    constructor(languageManager: LanguageManager) {
        this.languageManager = languageManager;

        this.fillLanguages();
        this.restore_options();
    }

    // Saves options to localStorage.
    save_options(): void {

        const checkedLang = DomUtils.$("input[name='langs']:checked") as HTMLInputElement;
        if (checkedLang) {
            this.languageManager.currentLanguage = checkedLang.value;
        }

        const checked = DomUtils.$$("input[name='enabled']:checked") as NodeListOf<HTMLInputElement>;
        const enabled: string[] = [];
        for (let i = 0; i < checked.length; i++) {
            enabled.push(checked[i].value);
        }
        this.languageManager.setEnabledByValues(enabled);
        // Update status to let user know options were saved.
        const status = DomUtils.$("#status") as HTMLElement;
        DomUtils.setHtml(status, "Options saved");
        status.style.display = "block";
        setTimeout(() => {
            fadeOut(status, 200);
        }, 750);
    }

    // Restores select box state to saved value from localStorage.
    restore_options(): void {
        const langInput = DomUtils.$(`input[name='langs'][value='${this.languageManager.currentLanguage}']`) as HTMLInputElement;
        if (langInput) {
            langInput.checked = true;
        }
    }

    fillLanguages(): void {
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

            if (this.languageManager.isEnabled(lang.value)) {
                checkBox.checked = true;
            }

            if (lang.value === this.languageManager.currentLanguage) {
                checkBox.disabled = true;
            }

            DomUtils.append(li, checkBox);
            DomUtils.append(languageButtons, li);
        }

        const self = this;
        const langInputs = DomUtils.$$("input[name='langs']") as NodeListOf<HTMLInputElement>;
        langInputs.forEach((input) => {
            input.addEventListener("change", function() {
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
                self.save_options();
                Tracker.track("language", "changed");
            });
        });

        const enabledInputs = DomUtils.$$("input[name='enabled']") as NodeListOf<HTMLInputElement>;
        enabledInputs.forEach((input) => {
            input.addEventListener("change", function() {
                self.save_options();
                Tracker.track("enabled_language", "changed", this.value);
            });
        });

        const checkAll = DomUtils.$("#checkAll") as HTMLInputElement;
        if (checkAll) {
            checkAll.addEventListener("change", function() {
                const checkbox = this as HTMLInputElement;
                const enabledInputs = DomUtils.$$("input[name='enabled']:enabled") as NodeListOf<HTMLInputElement>;
                enabledInputs.forEach((input) => {
                    input.checked = checkbox.checked;
                });
                self.save_options();
                Tracker.track("enabled_language", "changed_all", checkbox.checked.toString());
            });
        }
    }
}

export default OptionsPage;
