import { ITranslationParser, IHistoryItem } from "../common/Interfaces.js";

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
                const historyItem: IHistoryItem = {
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

export default TranslationParser;
