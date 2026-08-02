import { ILanguage } from "../common/Interfaces.js";
import TranslationDirection from "./TranslationDirection.js";
import DictionaryBase from "./DictionaryBase.js";

class LexinDictionary extends DictionaryBase {
    get supportedLanguages(): ILanguage[]{
        return [
            {value: "swe_alb", text: "Albanian"},
            {value: "swe_amh", text: "Amharic"},
            {value: "swe_ara", text: "Arabic"},
            {value: "swe_azj", text: "Azerbaijani"},
            {value: "swe_bos", text: "Bosnian"},
            {value: "swe_hrv", text: "Croatian"},
            {value: "swe_fin", text: "Finnish"},
            {value: "swe_gre", text: "Greek"},
            {value: "swe_kmr", text: "Northern Kurdish"},
            {value: "swe_pus", text: "Pashto"},
            {value: "swe_per", text: "Persian"},
            {value: "swe_rus", text: "Russian"},
            {value: "swe_srp", text: "Serbian (Latin)"},
            {value: "swe_srp_cyrillic", text: "Serbian (Cyrillic)"},
            {value: "swe_som", text: "Somali"},
            {value: "swe_sdh", text: "South Kurdish"},
            {value: "swe_spa", text: "Spanish"},
            {value: "swe_swe", text: "Swedish"},
            {value: "swe_tur", text: "Turkish"},
            {value: "swe_ukr", text: "Ukrainian"}
        ];
    }

    /**
     * Pulls headword and translation out of an entry, one entry per line.
     *
     * Lexin serves three shapes of entry and the language decides which one, so this
     * has to cover all three or a whole language records no history at all:
     *
     *   Swedish headword    `<b><span lang=sv_SE>ordbok</span></b>`   most languages
     *                       `<b>ord|bok</b>`                          ara, per, som
     *   Translation run     `<b><span lang=ru_RU>словарь</span></b>`  most languages
     *                       `<b><span dir=rtl lang=am_ET>…</span></b>` amh, pus, sdh
     *                       `<b><span dir="rtl"><span dir=rtl lang=ar_SA>…</span>،
     *                        <span dir=rtl lang=ar_SA>…</span></span></b>`      ara, per
     *
     * Hence the optional Swedish span, the `[^>]*` before `lang=` that lets `dir`
     * precede it, and the optional right-to-left wrapper. The translation is captured
     * as the whole bold run rather than one span - Arabic and Somali list several
     * translations as siblings inside it - and flattened to text by the parser.
     *
     * Trailing `&nbsp;&nbsp;` is not required: only the first shape has it, and it
     * pins nothing the closing `</b>` does not.
     *
     * swe_swe stays unmatched by design; the monolingual dictionary has a definition
     * where the others have a translation, and no bold non-Swedish run at all.
     */
    get parsingRegExp(): RegExp {
        /* tslint:disable:max-line-length */
        return  /^<p><div><b>(?:<span lang=sv_SE>)?(.+?)(?:<\/span>)?<\/b>.*?<b>((?:<span dir="?rtl"?>)?<span [^>]*lang=(?!sv)[^>]*>.*?)<\/b>/igm;
        /* tslint:enable:max-line-length */
    }


    createQueryUrl(word: string, langDirection: string, direction: TranslationDirection) : string {
        const directionString = TranslationDirection[direction];
        const wordEncoded = encodeURIComponent(word);
        const query = `http://lexin.nada.kth.se/lexin/service?searchinfo=${directionString},${langDirection},${wordEncoded}`;
        return query;
    }

    isWordFound(word: string, translation: string): boolean {
        const decodedTranslation = this.htmlDecode(translation);
        return !(decodedTranslation.indexOf(word + " - Ingen unik träff") > -1
            || decodedTranslation.indexOf(word + " - Ingen träff") > -1);
    }
}

export default LexinDictionary;
