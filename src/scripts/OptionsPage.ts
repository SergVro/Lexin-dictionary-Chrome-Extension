/// <reference path="..\lib\jquery\jquery.d.ts" />

import $ = require("jquery");
import interfaces = require("./Interfaces");
import ISettingsStorage = interfaces.ISettingsStorage;
import IMessageService = interfaces.IMessageService;
import LanguageManager = require("./LanguageManager");
import Tracker = require("./Tracker");

class OptionsPage {

    private languageManager: LanguageManager;

    constructor(languageManager: LanguageManager) {
        this.languageManager = languageManager;

        this.fillLanguages();
        //this.restore_options();
    }

    // Saves options to localStorage.
    save_options(): void {

        this.languageManager.setCurrentLanguage($("input[name='langs']:checked").val());

        var checked = $("input[name='enabled']:checked"),
            enabled: string[] = [];
        for (var i = 0; i < checked.length; i++) {
            enabled.push($(checked[i]).val());
        }
        this.languageManager.setEnabledByValues(enabled).then(() => {
            // Update status to let user know options were saved.
            $("#status").html("Options saved");
            $("#status").show();
            $("#status").addClass("visible");
            setTimeout(function () {
                $("#status").fadeOut("fast");
                $("#status").removeClass("visible");
            }, 750);
        });
    }

    //
    //restore_options(): void {
    //    this.languageManager.getCurrentLanguage().then((currentLanguage) => {
    //        $("input[name='langs']").val([currentLanguage]);
    //    });
    //}

    fillLanguages(): void {
        var languages = this.languageManager.getLanguages();
        $("#languageButtons").empty();
        this.languageManager.getCurrentLanguage().then((currentLanguage) => {
            this.languageManager.getEnabledLanguages().then((enabledLangs) => {
                for (var lang of languages) {
                    var li = $("<li></li>");
                    var input = $("<input />")
                        .attr("type", "radio")
                        .attr("name", "langs")
                        .attr("value", lang.value)
                        .attr("id", lang.value);
                    input.prop("checked", lang.value === currentLanguage);

                    var span = $("<label></label>")
                        .attr("for", lang.value)
                        .text(lang.text);
                    li.append(input);
                    li.append(span);

                    var checkBox = $("<input />").attr("type", "checkbox")
                        .attr("name", "enabled")
                        .attr("title", "Enabled")
                        .attr("value", lang.value)
                        .attr("id", "enabled_" + lang.value);


                    checkBox.prop("checked", enabledLangs.some((l) => l.value === lang.value));

                    if (lang.value === currentLanguage) {
                        checkBox.prop("disabled", true);
                    }

                    li.append(checkBox);

                    $("#languageButtons").append(li);
                }

                var self = this;
                $("input[name='langs']").change(function() {
                    $("input[name='enabled']:disabled").prop("disabled", false);
                    $("#enabled_" + $(this).val()).prop("checked", true).prop("disabled", true);
                    self.save_options();
                    Tracker.track("language", "changed");
                });
                $("input[name='enabled']").change(function() {
                    self.save_options();
                    Tracker.track("enabled_language", "changed", $(this).val());
                });

                $("#checkAll").change(function() {
                    $("input[name='enabled']:enabled").prop("checked", this.checked);
                    self.save_options();
                    Tracker.track("enabled_language", "changed_all", this.checked);
                });
            });
        });
    }
}

export = OptionsPage;
