
import HistoryModel = require("./HistoryModel");
import Tracker = require("./Tracker");
import interfaces = require("./Interfaces");
import IHistoryItem = interfaces.IHistoryItem;
import ILanguage = interfaces.ILanguage;

class HistoryPage {

    private languages : ILanguage[];
    private model : HistoryModel;

    constructor(model: HistoryModel) {
        this.model = model;
        model.loadLanguages().then((languages) => {
            this.languages = languages;
            this.renderLanguageSelector();
            $.when(
                model.getLanguage().then((language) => {
                    this.setCurrentLanguage(language);

                }),
                model.getShowDate().then((showDate) => {
                    this.showDate = showDate;
                })
            ).then(() => {
                this.updateHistory();
            });
            this.subscribeOnEvents();
        });
    }

    private subscribeOnEvents() {
        var self = this;
        $("#language").change(function () {
            self.updateHistory();

            Tracker.track("language", "changed", $(this).val());
        });

        $("#showDate").change(function () {
            self.model.setShowDate(self.showDate).then(() => {
                self.updateHistory();
                Tracker.track("showDate", "changed", self.showDate.toString());
            });
        });

        $("#clearHistory").click(function () {
            var langDirection = self.getCurrentLanguage();
            var langName = $("#language option[value='${langDirection}']").text();
            if (confirm("Are you sure you want to clear history for language " + langName)) {
                self.model.clearHistory(langDirection).then(() => self.updateHistory());

                Tracker.track("history", "cleared");
            }
        });
    }

    getCurrentLanguage() : string {
        return $("#language").val();
    }
    setCurrentLanguage(value: string) {
        $("#language").val(value);
    }

    get showDate() : boolean {
        return $("#showDate").prop("checked");
    }
    set showDate(value : boolean) {
        $("#showDate").prop("checked", value);
    }

    updateHistory() {
        this.renderHistory(this.getCurrentLanguage(), this.showDate);
    }

    renderHistory(langDirection: string, showDate: boolean) {
        $("#history").empty();
        this.model.loadHistory(langDirection).then((history: IHistoryItem[]) => {

            var table = $("<table></table>");
            var thead = $("<thead></thead>");
            table.append(thead);

            var dateHead = $("<th>Date</th>");
            var wordHead = $("<th>Word</th>");
            var translationHead = $("<th>Translation</th>");

            if (showDate) {
                thead.append(dateHead);
            }
            thead.append(wordHead);
            thead.append(translationHead);

            $("#history").append(table);
            if (history && history.length > 0) {
                var prevAddedDateStr = "";
                $.each(history, function (i, item) {

                    var tr = $("<tr></tr>");
                    var tdWord = $("<td></td>");
                    var tdTrans = $("<td></td>");
                    var tdAdded = $("<td></td>");

                    tdWord.html(item.word);
                    tdTrans.html(item.translation);
                    var addedDateStr = new Date(item.added).toDateString();
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
                var noTranslationsTd = $("<td>No translations in history</td>");
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
            for (var lang of this.languages) {
                var option = $("<option></option>").attr("value", lang.value).append(lang.text);
                $("#language").append(option);
            }
        } else {
            $("#language").attr("disabled", "disabled");
        }
    }
}

export = HistoryPage
