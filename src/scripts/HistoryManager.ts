import interfaces = require("./Interfaces");
import ITranslationParser = interfaces.ITranslationParser;
import IHistoryManager = interfaces.IHistoryManager;
import IHistoryItem = interfaces.IHistoryItem;
import ISettingsStorage = interfaces.ISettingsStorage;
import TranslationParser = require("./Dictionary/TranslationParser");
import Tracker = require("./Tracker");

class HistoryManager implements IHistoryManager {
    storageKey: string = "history";
    translationParser: ITranslationParser;
    private storage: ISettingsStorage;
    private maxHistoryBuffer: number;
    private maxHistoryLength: number;

    set maxHistory(value: number) {
        this.maxHistoryLength = value;
        this.maxHistoryBuffer = Math.floor(this.maxHistoryLength / 5);
    }

    constructor(translationParser: ITranslationParser, storage: ISettingsStorage) {
        this.translationParser = translationParser;
        this.storage = storage;
        this.maxHistory = 1000;
    }

    getHistory(langDirection: string): JQueryPromise<IHistoryItem[]> {
        //  Summary
        //      Returns translation history for the specified language direction.

        this.checkLangDirection(langDirection);

        return this.loadHistory(langDirection).then<IHistoryItem[]>((history) => {
            // remove duplicates. We do it only on history request since we don"t want to do it on every translation operation
            this.compress(history);
            this.saveHistory(langDirection,  history);
            return history;
        });

    }

    clearHistory(langDirection: string): JQueryPromise<void> {
        //  Summary
        //      Clears translation history for the specified language direction
        this.checkLangDirection(langDirection);
        return this.storage.removeItem(this.getStorageKey(langDirection));
    }

    addToHistory(langDirection: string, translations: IHistoryItem[]): JQueryPromise<void> {
        //  Summary
        //      Adds a new word and translation to the translation history

        this.checkLangDirection(langDirection);

        return this.loadHistory(langDirection).then((history) => {
                if (!history) {
                    history = [];
                }
                history = history.concat(translations);
                if (this.needToCompress(history)) {
                    this.compress(history);
                }
                var serializedHistory = JSON.stringify(history);
                return this.storage.setItem(this.getStorageKey(langDirection), serializedHistory);
            }
        );
    }


    private loadHistory(langDirection: string): JQueryPromise<IHistoryItem[]> {
        var key = this.getStorageKey(langDirection);

        // TODO: Check if it works like that
        return this.storage.getItem(key).then((storedHistory) => {
            var history: IHistoryItem[] = storedHistory ? JSON.parse(storedHistory) : [];
            return history;
        });
    }

    private saveHistory(langDirection: string, history: IHistoryItem[]): JQueryPromise<void> {
        var key = this.getStorageKey(langDirection);
        return this.storage.setItem(key, JSON.stringify(history));
    }

    private getStorageKey(langDirection: string) {
        return this.storageKey + langDirection;
    }


    private _removeDuplicates(history: IHistoryItem[]): void {
        //  Summary
        //      Removes duplicate entries from the specified history array
        for (var i = history.length - 1; i >= 0; i--) {
            for (var j = i - 1; j >= 0; j--) {
                if (history[i].word === history[j].word) {
                    if (history[i].translation === history[j].translation) { // if we already have the same word with the same translation
                        history.splice(i, 1);                               // remove it
                        break;
                    }
                    // try to combine different translations in the list
                    var separator = "; ";
                    var iTranslations = history[i].translation.split(separator);
                    var jTranslations = history[j].translation.split(separator);
                    var allTranslations = this.combineTranslations(jTranslations, iTranslations);

                    history[j].translation = allTranslations.join(separator);
                    history.splice(i, 1);                               // remove it
                    break;
                }
            }
        }
    }

    private combineTranslations(translations1: string[], translations2: string[]): string[] {
        //  Summary
        //      Combines two translation arrays in a single array and removes duplicate entries
        var result = $.merge([], translations1);
        for (var i = 0; i < translations2.length; i++) {
            if ($.inArray(translations2[i], result) === -1) {
                result.push(translations2[i]);
            }
        }
        return result;
    }

    private sort_by(field: string, reverse: boolean, primer?) {
        //  Summary
        //      Sorting routine
        var reverseNum = (reverse) ? -1 : 1;
        return function (a, b) {

            a = a[field];
            b = b[field];

            if (typeof (primer) !== "undefined") {
                a = primer(a);
                b = primer(b);
            }

            if (a < b) {
                return reverseNum * -1;
            }
            if (a > b) {
                return reverseNum;
            }
            return 0;
        };
    }

    private compress(history: IHistoryItem[]): void {
        this._removeDuplicates(history);
        history.sort(this.sort_by("added", true));
        if (this.needToCompress(history)) {
            var countToRemove = history.length - this.maxHistoryLength;
            history.splice(-countToRemove, countToRemove);

            Tracker.track("history", "compress");
        }
    }

    private needToCompress(history: IHistoryItem[]) {
        return history.length > (this.maxHistoryLength + this.maxHistoryBuffer);
    }

    private checkLangDirection(langDirection: string): void {
        if (!langDirection) {
            throw new Error("Language direction is not specified");
        }
    }
}

export = HistoryManager;
