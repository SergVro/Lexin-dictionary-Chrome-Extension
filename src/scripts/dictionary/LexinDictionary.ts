import { ILanguage } from "../common/Interfaces.js";
import TranslationDirection from "./TranslationDirection.js";
import DictionaryBase from "./DictionaryBase.js";

/** Lexin's Swedish-to-Swedish direction, which explains rather than translates. */
const MONOLINGUAL = "swe_swe";

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
            {value: "swe_tir", text: "Tigrinya"},
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
     * swe_swe has no bold non-Swedish run at all and is read by
     * monolingualParsingRegExp instead.
     */
    get parsingRegExp(): RegExp {
        /* tslint:disable:max-line-length */
        return  /^<p><div><b>(?:<span lang=sv_SE>)?(.+?)(?:<\/span>)?<\/b>.*?<b>((?:<span dir="?rtl"?>)?<span [^>]*lang=(?!sv)[^>]*>.*?)<\/b>/igm;
        /* tslint:enable:max-line-length */
    }

    /**
     * Reads swe_swe, where the answer is a definition rather than a translation.
     *
     * The definition opens the entry's second paragraph - `</div><p><div>` - either
     * on its own or behind a sense number, and the entry proper never repeats that
     * marker, so the first one after the headword is the one to take:
     *
     *   `<p><div><b>hund</b> …</div><div>〈hunden, …〉</div><p><div><span lang=sv_SE>ett husdjur …</span>`
     *   `<p><div><b>stor</b> …</div><div>〈stort, …〉</div><p><div><b>1.</b> <span lang=sv_SE>som överskrider …</span>`
     *
     * Only the first sense is stored, the way only the first of several translations
     * is for the other languages. Entries that stop at the headword - Lexin has a
     * few, mostly homograph stubs - store nothing, since there is nothing to store.
     */
    get monolingualParsingRegExp(): RegExp {
        /* tslint:disable:max-line-length */
        return  /^<p><div><b>(?:<span lang=sv_SE>)?(.+?)(?:<\/span>)?<\/b>.*?<p><div>(?:<b>\d+\.<\/b>\s*)?<span lang=sv_SE>(.+?)<\/span>/igm;
        /* tslint:enable:max-line-length */
    }

    getParsingRegExp(langDirection: string): RegExp {
        return langDirection === MONOLINGUAL ? this.monolingualParsingRegExp : this.parsingRegExp;
    }


    createQueryUrl(word: string, langDirection: string, direction: TranslationDirection) : string {
        const directionString = TranslationDirection[direction];
        const wordEncoded = encodeURIComponent(word);
        const query = `https://lexin.nada.kth.se/lexin/service?searchinfo=${directionString},${langDirection},${wordEncoded}`;
        return query;
    }

    isWordFound(word: string, translation: string): boolean {
        const decodedTranslation = this.htmlDecode(translation);
        return !(decodedTranslation.indexOf(word + " - Ingen unik träff") > -1
            || decodedTranslation.indexOf(word + " - Ingen träff") > -1);
    }
}

export default LexinDictionary;
