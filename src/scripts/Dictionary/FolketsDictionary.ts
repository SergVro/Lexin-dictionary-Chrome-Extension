import interfaces = require("../Interfaces");
import IDictionary = interfaces.IDictionary;
import IHistoryItem = interfaces.IHistoryItem;
import ILanguage = interfaces.ILanguage;
import TranslationDirection = require("../TranslationDirection");
import DictionaryBase = require("./DictionaryBase");

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
        var directionString = direction === TranslationDirection.from ? "en" : "sv";
        var wordEncoded = encodeURIComponent(word);
        var query = `http://folkets-lexikon.csc.kth.se/folkets/service?lang=${directionString}&interface=en&word=${wordEncoded}`;
        return query;
    }

    isWordFound(word: string, translation: string): boolean {
        var decodedTranslation = this.htmlDecode(translation);
        return !(decodedTranslation.indexOf(word + " - No hit") > -1);
    }


}

export = FolketsDictionary;
