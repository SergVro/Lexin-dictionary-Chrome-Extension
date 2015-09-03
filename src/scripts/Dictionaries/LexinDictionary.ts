/// <reference path="..\..\lib\jquery\jquery.d.ts" />

import $ = require("jquery");
import interfaces = require("../Interfaces");
import IDictionary = interfaces.IDictionary;
import IHistoryItem = interfaces.IHistoryItem;
import ILanguage = interfaces.ILanguage;
import TranslationDirection = require("../TranslationDirection");
import DictionaryBase = require("./DictionaryBase");

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
            {value: "swe_tur", text: "Turkish"}
        ];
    }

    get parsingRegExp(): RegExp {
        /* tslint:disable:max-line-length */
        return  /^<p><div><b><span lang=sv_SE>(.+?)<\/span><\/b>.*<\/div><div><b><span lang=.+>(.+?)<\/span><\/b>&nbsp;&nbsp;.*?$/igm;
        /* tslint:enable:max-line-length */
    }


    createQueryUrl(word: string, langDirection: string, direction: TranslationDirection) : string {
        var directionString = TranslationDirection[direction];
        var wordEncoded = encodeURIComponent(word);
        var query = `http://lexin.nada.kth.se/lexin/service?searchinfo=${directionString},${langDirection},${wordEncoded}`;
        return query;
    }

    isWordFound(word: string, translation: string): boolean {
        var decodedTranslation = this.htmlDecode(translation);
        return !(decodedTranslation.indexOf(word + " - Ingen unik träff") > -1
            || decodedTranslation.indexOf(word + " - Ingen träff") > -1);
    }
}

export = LexinDictionary;
