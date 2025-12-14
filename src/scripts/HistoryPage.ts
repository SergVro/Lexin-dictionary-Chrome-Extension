import HistoryModel from "./HistoryModel.js";
import Tracker from "./Tracker.js";
import { IHistoryItem, ILanguage } from "./Interfaces.js";
import * as DomUtils from "./util/DomUtils.js";

class HistoryPage {

    private languages : ILanguage[];
    private model : HistoryModel;

    constructor(model: HistoryModel) {
        this.model = model;
        this.languages =  model.loadLanguages();
        this.renderLanguageSelector();
        this.currentLanguage = model.language;
        this.showDate = model.showDate;
        this.subscribeOnEvents();
        this.updateHistory();
    }

    private subscribeOnEvents() {
        const self = this;
        const languageSelect = DomUtils.$("#language") as HTMLSelectElement;
        if (languageSelect) {
            languageSelect.addEventListener("change", function () {
                self.updateHistory();
                Tracker.track("language", "changed", this.value);
            });
        }

        const showDateCheckbox = DomUtils.$("#showDate") as HTMLInputElement;
        if (showDateCheckbox) {
            showDateCheckbox.addEventListener("change", function () {
                self.model.showDate = self.showDate;
                self.updateHistory();
                Tracker.track("showDate", "changed", self.showDate.toString());
            });
        }

        const clearHistoryButton = DomUtils.$("#clearHistory") as HTMLButtonElement;
        if (clearHistoryButton) {
            clearHistoryButton.addEventListener("click", function () {
                const langDirection = self.currentLanguage;
                const langOption = DomUtils.$(`#language option[value='${langDirection}']`) as HTMLOptionElement;
                const langName = langOption ? langOption.text : langDirection;
                if (confirm("Are you sure you want to clear history for language " + langName)) {
                    self.model.clearHistory(langDirection).then(() => self.updateHistory());
                    Tracker.track("history", "cleared");
                }
            });
        }
    }

    get currentLanguage() : string {
        return DomUtils.getValue(DomUtils.$("#language"));
    }
    set currentLanguage(value: string) {
        DomUtils.setValue(DomUtils.$("#language"), value);
    }

    get showDate() : boolean {
        const checkbox = DomUtils.$("#showDate") as HTMLInputElement;
        return checkbox ? checkbox.checked : false;
    }
    set showDate(value : boolean) {
        const checkbox = DomUtils.$("#showDate") as HTMLInputElement;
        if (checkbox) {
            checkbox.checked = value;
        }
    }

    updateHistory() {
        this.renderHistory(this.currentLanguage, this.showDate);
    }

    renderHistory(langDirection: string, showDate: boolean) {
        const historyContainer = DomUtils.$("#history") as HTMLElement;
        DomUtils.empty(historyContainer);
        this.model.loadHistory(langDirection).then((history: IHistoryItem[]) => {

            const table = DomUtils.createElement("table");
            const thead = DomUtils.createElement("thead");
            DomUtils.append(table, thead);

            const dateHead = DomUtils.createElement("th", undefined, "Date");
            const wordHead = DomUtils.createElement("th", undefined, "Word");
            const translationHead = DomUtils.createElement("th", undefined, "Translation");

            if (showDate) {
                DomUtils.append(thead, dateHead);
            }
            DomUtils.append(thead, wordHead);
            DomUtils.append(thead, translationHead);

            DomUtils.append(historyContainer, table);
            if (history && history.length > 0) {
                let prevAddedDateStr = "";
                history.forEach((item) => {

                    const tr = DomUtils.createElement("tr");
                    const tdWord = DomUtils.createElement("td");
                    const tdTrans = DomUtils.createElement("td");
                    const tdAdded = DomUtils.createElement("td");

                    DomUtils.setHtml(tdWord, item.word);
                    DomUtils.setHtml(tdTrans, item.translation);
                    let addedDateStr = new Date(item.added).toDateString();
                    if (addedDateStr === prevAddedDateStr) {
                        addedDateStr = "";
                        DomUtils.addClass(tdAdded, "noBottomBorder");
                    } else {
                        prevAddedDateStr = addedDateStr;
                    }
                    DomUtils.setHtml(tdAdded, addedDateStr);

                    if (showDate) {
                        DomUtils.append(tr, tdAdded);
                    }
                    DomUtils.append(tr, tdWord);
                    DomUtils.append(tr, tdTrans);

                    DomUtils.append(table, tr);

                });
                const clearHistoryButton = DomUtils.$("#clearHistory") as HTMLButtonElement;
                const showDateCheckbox = DomUtils.$("#showDate") as HTMLInputElement;
                if (clearHistoryButton) clearHistoryButton.disabled = false;
                if (showDateCheckbox) showDateCheckbox.disabled = false;
            } else {
                const noTranslationsTd = DomUtils.createElement("td", undefined, "No translations in history");
                if (showDate) {
                    DomUtils.setAttr(noTranslationsTd, "colspan", "3");
                } else {
                    DomUtils.setAttr(noTranslationsTd, "colspan", "2");
                }
                const tr = DomUtils.createElement("tr");
                DomUtils.append(tr, noTranslationsTd);
                DomUtils.append(table, tr);
                const clearHistoryButton = DomUtils.$("#clearHistory") as HTMLButtonElement;
                const showDateCheckbox = DomUtils.$("#showDate") as HTMLInputElement;
                if (clearHistoryButton) clearHistoryButton.disabled = true;
                if (showDateCheckbox) showDateCheckbox.disabled = true;
            }

        });

    }

    renderLanguageSelector() : void {
        const languageSelect = DomUtils.$("#language") as HTMLSelectElement;
        if (languageSelect) {
            DomUtils.empty(languageSelect);
            if (this.languages.length > 0) {
                for (const lang of this.languages) {
                    const option = DomUtils.createElement("option", { value: lang.value }, lang.text);
                    DomUtils.append(languageSelect, option);
                }
                languageSelect.disabled = false;
            } else {
                languageSelect.disabled = true;
            }
        }
    }
}

export default HistoryPage;
