import interfaces = require("./Interfaces");
import ITranslationParser = interfaces.ITranslationParser;
import IHistoryItem = interfaces.IHistoryItem;

class TranslationParser implements ITranslationParser{
    // Translation parsing regular expression
    /* tslint:disable:max-line-length */
    translationRegexLexin = /^<p><div><b><span lang=sv_SE>(.+?)<\/span><\/b>.*<\/div><div><b><span lang=.+>(.+?)<\/span><\/b>&nbsp;&nbsp;.*?$/igm;
    translationRegexFolkets = /<p><img.*\(S.+?\).*\/>\s*<b>(.+?)<\/b>.*<img.*\(E.+?\).*\/>\s*<b>(.+?)<\/b>.*<\/p>$/igm;
    /* tslint:enable:max-line-length */

    parseTranslation(translation: string, langDirection: string): IHistoryItem[] {
        //  Summary
        //      Returns an array of a words parsed from specified translation
        var result = [],
            match,
            currentRegex = this.translationRegexLexin;

        if (langDirection === "swe_eng") {
            currentRegex = this.translationRegexFolkets;
        }
        while (match = currentRegex.exec(translation)) {
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
