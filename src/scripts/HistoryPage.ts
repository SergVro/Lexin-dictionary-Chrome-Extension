import HistoryModel from "./HistoryModel.js";
import Tracker from "./Tracker.js";
import { IHistoryItem, ILanguage } from "./Interfaces.js";
import $ from "jquery";

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
        $("#language").change(function () {
            self.updateHistory();

            Tracker.track("language", "changed", $(this).val() as string);
        });

        $("#showDate").change(function () {
            self.model.showDate = self.showDate;
            self.updateHistory();

            Tracker.track("showDate", "changed", self.showDate.toString());
        });

        $("#clearHistory").click(function () {
            const langDirection = self.currentLanguage;
            const langName = $("#language option[value='${langDirection}']").text();
            if (confirm("Are you sure you want to clear history for language " + langName)) {
                self.model.clearHistory(langDirection).then(() => self.updateHistory());

                Tracker.track("history", "cleared");
            }
        });
    }

    get currentLanguage() : string {
        return $("#language").val() as string;
    }
    set currentLanguage(value: string) {
        $("#language").val(value);
    }

    get showDate() : boolean {
        return $("#showDate").prop("checked");
    }
    set showDate(value : boolean) {
        $("#showDate").prop("checked", value);
    }

    updateHistory() {
        this.renderHistory(this.currentLanguage, this.showDate);
    }

    renderHistory(langDirection: string, showDate: boolean) {
        $("#history").empty();
        this.model.loadHistory(langDirection).then((history: IHistoryItem[]) => {

            const table = $("<table></table>");
            const thead = $("<thead></thead>");
            table.append(thead);

            const dateHead = $("<th>Date</th>");
            const wordHead = $("<th>Word</th>");
            const translationHead = $("<th>Translation</th>");

            if (showDate) {
                thead.append(dateHead);
            }
            thead.append(wordHead);
            thead.append(translationHead);

            $("#history").append(table);
            if (history && history.length > 0) {
                let prevAddedDateStr = "";
                $.each(history, function (i, item) {

                    const tr = $("<tr></tr>");
                    const tdWord = $("<td></td>");
                    const tdTrans = $("<td></td>");
                    const tdAdded = $("<td></td>");

                    tdWord.html(item.word);
                    tdTrans.html(item.translation);
                    let addedDateStr = new Date(item.added).toDateString();
                    if (addedDateStr === prevAddedDateStr) {
                        addedDateStr = "";
                        tdAdded.addClass("noBottomBorder");
                    } else {
                        prevAddedDateStr = addedDateStr;
                    }
                    tdAdded.html(addedDateStr);

                    if (showDate) {
                        tr.append(tdAdded);
                    }
                    tr.append(tdWord);
                    tr.append(tdTrans);

                    table.append(tr);

                });
                $("#clearHistory").removeAttr("disabled");
                $("#showDate").removeAttr("disabled");
            } else {
                const noTranslationsTd = $("<td>No translations in history</td>");
                if (showDate) {
                    noTranslationsTd.attr("colspan", 3);
                } else {
                    noTranslationsTd.attr("colspan", 2);
                }
                table.append( $("<tr></tr>").append(noTranslationsTd));
                $("#clearHistory").attr("disabled", "disabled");
                $("#showDate").attr("disabled", "disabled");
            }

        });

    }

    renderLanguageSelector() : void {
        $("#language").empty();
        if (this.languages.length > 0) {
            for (const lang of this.languages) {
                const option = $("<option></option>").attr("value", lang.value).append(lang.text);
                $("#language").append(option);
            }
        } else {
            $("#language").attr("disabled", "disabled");
        }
    }
}

export default HistoryPage;
