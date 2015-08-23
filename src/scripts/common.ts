/// <reference path="..\lib\chrome\chrome.d.ts" />
/// <reference path="..\lib\jquery\jquery.d.ts" />
/// <reference path="..\lib\jquery.flash.d.ts" />

    var playerTemplate:string = '<audio><source src="MP3_FILE_URL" type="audio/mp3" /></audio>';

    export function adaptLinks(translationContainer: JQuery) {
        $('a', translationContainer).attr('target', '_blank');

        $.each($('a', translationContainer), function (i, anchor) {
            var url = $(anchor).attr('href');
            if (url.match(/mp3$/)) { // if url is a MP3 file reference - change link to play audio tag
                var playerHtml = playerTemplate.replace('MP3_FILE_URL', url);
                $(anchor).after(playerHtml);
                $(anchor).attr('href', '#').click(function (e) {
                    (<HTMLAudioElement>$(this).next()[0]).play();
                    e.preventDefault();
                    return false;
                });
            }
            // TODO: This is not wokring because of content security policy that allows
            // referencing swf only with https

            //if (url.match(/swf$/)) { // embedding Folkets lexikon swf pronunciation files with jquery flash plugin
            //    var img = $('img', anchor);
            //    if (img.length > 0) {
            //        $(img).remove();
            //        $(anchor).flash({src: url, width: 21, height: 21});
            //    }
            //}
        });

        $.each($('img', translationContainer), function (i, img) {
            var url = $(img).attr('src');
            if (!url.match(/^http/)) {
                $(img).attr('src', 'http://folkets-lexikon.csc.kth.se/folkets/' + url); // relative image links for Folkets lexikon fix
            }
        });
    }

    export interface Language {
        value: string;
        text: string;
    }

    export interface ISettingsStorage {
        [key: string]: any;
    }

    export interface HistoryItem {
        word:string;
        translation:string;
        added: number
    }

    export enum BackendMethods {
        getLanguages,
        getHistory,
        clearHistory
    }

    export interface IBackendService {
        getLanguages() : JQueryPromise<Language[]>
        loadHistory(language: string) : JQueryPromise<HistoryItem[]>
        clearHistory(language: string) : JQueryPromise<{}>
    }

    export class BackendService implements IBackendService{
        getLanguages() : JQueryPromise<Language[]> {
            var result  = $.Deferred();
            chrome.runtime.sendMessage({ method: "getLanguages" }, function (languages: Language[]) {
                result.resolve(languages);
            });
            return result.promise();
        }

        loadHistory(language: string) : JQueryPromise<HistoryItem[]> {
            var result = $.Deferred();
            chrome.runtime.sendMessage({ method: "getHistory", langDirection: language }, function (history: HistoryItem[]) {
                result.resolve(history);
            });
            return result.promise();
        }

        clearHistory(language: string) : JQueryPromise<{}>{
            var result = $.Deferred();
            chrome.runtime.sendMessage({method: "clearHistory", langDirection: language}, function () {
                result.resolve();
            });
            return result.promise();
        }
    }
