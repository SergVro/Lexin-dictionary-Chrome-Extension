/// <reference path="..\lib\chrome\chrome.d.ts" />
/// <reference path="..\lib\jquery\jquery.d.ts" />
/// <reference path="common.ts" />

module LexinExtension.History
 {
    class HistoryPage {

        private languages : Common.Language[];
        private model : HistoryModel;

        constructor(model: HistoryModel) {
            model.loadLanguages().done((languages:Common.Language[])=> {
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
                var langDirection = this.currentLanguage;
                var langName = $("#language option[value='" + langDirection + "']").text();
                if (confirm("Are you sure you want to clear history for language " + langName)) {
                    self.model.clearHistory().done(()=>self.updateHistory());
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
            this.model.loadHistory().done((history: Common.HistoryItem[])=> {

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
                    if (showDate)                {
                        noTranslationsTd.attr("colspan",3);
                    }
                    else {
                        noTranslationsTd.attr("colspan",2);
                    }
                    table.append( $("<tr></tr>").append(noTranslationsTd));
                }

            });

        }

        renderLanguageSelector() {
            $("#language").empty();
            $.each(this.languages, function (i, lang) {
                var option = $("<option></option>").attr("value", lang.value).append(lang.text);
                $("#language").append(option);
            });

        }
    }

    class HistoryModel {
        private _storage:Common.SettingsStorage;

        constructor(storage?: Common.SettingsStorage) {
            this._storage = storage || localStorage;
        }

        get language() : string {
            var language = this._storage["defaultLanguage"];
            if (!language) {
                language = "swe_swe";
            }
            return language;
        }
        set language(value : string) {
            this._storage["defaultLanguage"] = value;
            this.fireOnChange();
        }

        get showDate() : boolean {
            return this._storage["showDate"]=="true"
        }
        set showDate(value: boolean) {
            this._storage["showDate"] = value;
            this.fireOnChange();
        }

        loadLanguages() {
            var result  = $.Deferred();
            chrome.runtime.sendMessage({ method: "getLanguages" }, function (response: string[]) {
                result.resolve(response);
            });
            return result;
        }

        loadHistory() {
            var result = $.Deferred();
            chrome.runtime.sendMessage({ method: "getHistory", langDirection: this.language }, function (history: Common.HistoryItem[]) {
                result.resolve(history);
            });
            return result;
        }

        clearHistory(){
            var result = $.Deferred();
            chrome.runtime.sendMessage({method: "clearHistory", langDirection: this.language}, function () {
                result.resolve();
            });
            return result;
        }

        onChange : (settings: HistoryModel)=>void;

        private fireOnChange() {
            if (this.onChange) {
                this.onChange(this);
            }
        }
    }

    $(function() {
        var historyModel = new HistoryModel();
        new HistoryPage(historyModel);
    });
}