import { ILanguage } from "../Interfaces.js";
import TranslationDirection from "./TranslationDirection.js";
import DictionaryBase from "./DictionaryBase.js";

class FolketsDictionary extends DictionaryBase{

    get parsingRegExp(): RegExp {
        return /<p><img.*\(S.+?\).*\/>\s*<b>(.+?)<\/b>.*<img.*\(E.+?\).*\/>\s*<b>(.+?)<\/b>.*<\/p>$/igm;
    }

    get supportedLanguages(): ILanguage[] {
        return [
            {value: "swe_eng", text: "English"}
        ];
    }

    createQueryUrl(word: string, langDirection: string, direction: TranslationDirection) : string {
        const directionString = direction === TranslationDirection.from ? "en" : "sv";
        const wordEncoded = encodeURIComponent(word);
        const query = `http://folkets-lexikon.csc.kth.se/folkets/service?lang=${directionString}&interface=en&word=${wordEncoded}`;
        return query;
    }

    isWordFound(word: string, translation: string): boolean {
        const decodedTranslation = this.htmlDecode(translation);
        return !(decodedTranslation.indexOf(word + " - No hit") > -1);
    }


}

export default FolketsDictionary;
