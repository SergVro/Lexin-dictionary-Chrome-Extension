import common = require("common")
import model = require("models")
import $ = require("jquery")

export class HistoryPage {

    private languages : common.Language[];
    private model : model.HistoryModel;

    constructor(model: model.HistoryModel) {
        model.loadLanguages().then((languages:common.Language[])=> {
            this.languages = languages;
            this.model = model;
            this.renderLanguageSelector();
            this.currentLanguage = model.language;
            this.showDate = model.showDate;
            this.subscribeOnEvents();
            this.updateHistory();
        });
    }

    private subscribeOnEvents() {
        var self = this;
        $("#language").change(function () {
            self.model.language = self.currentLanguage;
            self.updateHistory();
        });

        $("#showDate").change(function () {
            self.model.showDate = self.showDate;
            self.updateHistory();
        });

        $("#clearHistory").click(function () {
            var langDirection = self.currentLanguage;
            var langName = $("#language option[value='${langDirection}']").text();
            if (confirm("Are you sure you want to clear history for language " + langName)) {
                self.model.clearHistory(langDirection).then(()=>self.updateHistory());
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
        return $("#showDate").prop("checked")
    }
    set showDate(value : boolean) {
        $("#showDate").prop("checked", value)
    }

    updateHistory () {
        this.renderHistory(this.currentLanguage, this.showDate);
    }

    renderHistory(langDirection: string, showDate: boolean) {
        $("#history").empty();
        this.model.loadHistory(langDirection).then((history: common.HistoryItem[])=> {

            var table = $("<table></table>");
            var thead = $("<thead></thead>");
            table.append(thead);

            var dateHead = $("<th>Date</th>");
            var wordHead = $("<th>Word</th>");
            var translationHead = $("<th>Translation</th>");

            if (showDate){
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
                    var tdAdded =$("<td></td>");

                    tdWord.html(item.word);
                    tdTrans.html(item.translation);
                    var addedDateStr = new Date(item.added).toDateString();
                    if (addedDateStr == prevAddedDateStr)
                    {
                        addedDateStr = "";
                        tdAdded.addClass("noBottomBorder")
                    }
                    else
                    {
                        prevAddedDateStr = addedDateStr;
                    }
                    tdAdded.html(addedDateStr);

                    if (showDate){
                        tr.append(tdAdded);
                    }
                    tr.append(tdWord);
                    tr.append(tdTrans);

                    table.append(tr);

                });
            }
            else {
                var noTranslationsTd = $("<td>No translations in history</td>");
                if (showDate) {
                    noTranslationsTd.attr("colspan",3);
                }
                else {
                    noTranslationsTd.attr("colspan",2);
                }
                table.append( $("<tr></tr>").append(noTranslationsTd));
            }

        });

    }

    renderLanguageSelector() : void{
        $("#language").empty();
        for (var lang of this.languages) {
            var option = $("<option></option>").attr("value", lang.value).append(lang.text);
            $("#language").append(option);
        }
    }
}
