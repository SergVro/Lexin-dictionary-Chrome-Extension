import { ITranslationParser, IHistoryItem } from "../common/Interfaces.js";
import { decodeHtmlEntities, stripHtmlTags } from "../util/HtmlEntities.js";

class TranslationParser implements ITranslationParser{

    parse(translation: string, parsingRegExp: RegExp): IHistoryItem[] {
        //  Summary
        //      Returns an array of a words parsed from specified translation
        const result: IHistoryItem[] = [];
        let match;

        while ((match = parsingRegExp.exec(translation))) {
            // A capture is a fragment of the Translation Markup, not text: the
            // translation of an Arabic entry is a run of spans, and every non-Latin
            // script arrives as numeric character references. The history store holds
            // text, so the markup is flattened and the references decoded here rather
            // than left for whoever renders them to deal with.
            const wordHistory = this.toText(match[1]).replace(/\|/g, ""); // removing vertical bars from the word
            const translationHistory = this.toText(match[2]);
            if (wordHistory && translationHistory) {
                const d = new Date();
                const historyItem: IHistoryItem = {
                    word: wordHistory,
                    translation: translationHistory,
                    added: d.getTime()
                };
                result.push(historyItem);
            }
            // An entry whose translation side is empty - Lexin ships a few, as a
            // bold span with nothing in it - is skipped rather than reported: there
            // is nothing wrong with the markup and nothing worth storing either.
        }
        return result;
    }

    private toText(markup: string): string {
        return decodeHtmlEntities(stripHtmlTags(markup)).trim();
    }
}

export default TranslationParser;
