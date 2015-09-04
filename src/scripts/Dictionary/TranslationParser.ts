import interfaces = require("../Interfaces");
import ITranslationParser = interfaces.ITranslationParser;
import IHistoryItem = interfaces.IHistoryItem;

class TranslationParser implements ITranslationParser{

    parse(translation: string, parsingRegExp: RegExp): IHistoryItem[] {
        //  Summary
        //      Returns an array of a words parsed from specified translation
        var result = [],
            match;

        while (match = parsingRegExp.exec(translation)) {
            var wordHistory = match[1];
            var translationHistory = match[2];
            if (wordHistory && translationHistory) {
                wordHistory = wordHistory.replace("|", ""); // removing vertical bars from the word
                var d = new Date();
                var historyItem: IHistoryItem = {
                    word: wordHistory,
                    translation: translationHistory,
                    added: d.getTime()
                };
                result.push(historyItem);
            } else {
                console.error("Error parsing translation");
            }
        }
        return result;
    }
}

export = TranslationParser;
