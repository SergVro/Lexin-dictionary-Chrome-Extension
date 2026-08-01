import { ITranslationParser, IHistoryItem } from "../common/Interfaces.js";
import { decodeHtmlEntities } from "../util/HtmlEntities.js";

class TranslationParser implements ITranslationParser{

    parse(translation: string, parsingRegExp: RegExp): IHistoryItem[] {
        //  Summary
        //      Returns an array of a words parsed from specified translation
        const result: IHistoryItem[] = [];
        let match;

        while ((match = parsingRegExp.exec(translation))) {
            let wordHistory = match[1];
            const translationHistory = match[2];
            if (wordHistory && translationHistory) {
                wordHistory = wordHistory.replace("|", ""); // removing vertical bars from the word
                const d = new Date();
                // These come straight out of the Translation Markup, where Lexin
                // writes every non-Latin script as numeric character references. The
                // history store holds text, not markup, so they are decoded here
                // rather than left for whoever renders them to deal with.
                const historyItem: IHistoryItem = {
                    word: decodeHtmlEntities(wordHistory),
                    translation: decodeHtmlEntities(translationHistory),
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

export default TranslationParser;
