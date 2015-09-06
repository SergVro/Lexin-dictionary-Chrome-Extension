/// <reference path="..\lib\google.analytics\ga.d.ts" />

import HistoryModel = require("./HistoryModel");
import interfaces = require("./Interfaces");
import IHistoryItem = interfaces.IHistoryItem;
import ILanguage = interfaces.ILanguage;
import $ = require("jquery");

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
        var self = this;
        $("#language").change(function () {
            _gaq.push(["_trackEvent", "language", "changed"]);
            self.updateHistory();
        });

        $("#showDate").change(function () {
            _gaq.push(["_trackEvent", "showDate_" + self.showDate, "changed"]);
            self.model.showDate = self.showDate;
            self.updateHistory();
        });

        $("#clearHistory").click(function () {
            _gaq.push(["_trackEvent", "history_clean", "clicked"]);
            var langDirection = self.currentLanguage;
            var langName = $("#language option[value='${langDirection}']").text();
            if (confirm("Are you sure you want to clear history for language " + langName)) {
                self.model.clearHistory(langDirection).then(() => self.updateHistory());
            }
        });
    }

    get currentLanguage() : string {
        return $("#language").val();
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
