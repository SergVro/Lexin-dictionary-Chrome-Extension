import { IAsyncSettingsStorage, ILanguage } from "./Interfaces.js";
import { LANGUAGE_KEY } from "./LanguageManager.js";

/** How the Translation Card names the Language Direction it is showing. */
export interface ILanguageLabel {
    /** Compact form for the header chip, e.g. "sv→eng". */
    code: string;
    /** Spelled out, for title and aria-label, e.g. "Swedish → English". */
    name: string;
}

const DEFAULT_LANGUAGE = "swe_swe";
const SOURCE_CODE = "sv";

/**
 * Names the current Language Direction for the Translation Card's header.
 *
 * Deliberately not a LanguageManager: the content script runs in every frame of
 * every page, and LanguageManager writes to storage from its constructor. This reads
 * one key and never writes.
 */
class LanguageLabel {

    private settingsStorage: IAsyncSettingsStorage;
    private languages: ILanguage[];

    constructor(settingsStorage: IAsyncSettingsStorage, languages: ILanguage[]) {
        this.settingsStorage = settingsStorage;
        this.languages = languages;
    }

    async getCurrent(): Promise<ILanguageLabel> {
        const langDirection = (await this.settingsStorage.getItem(LANGUAGE_KEY)) || DEFAULT_LANGUAGE;
        return this.describe(langDirection);
    }

    describe(langDirection: string): ILanguageLabel {
        const language = this.languages.filter((lang) => lang.value === langDirection)[0];
        const name = language ? language.text : langDirection;

        // "swe_srp_cyrillic" -> "srp". The header has room for a three-letter code,
        // not a variant suffix; the full name rides along in the title attribute.
        const target = langDirection.replace(/^swe_/, "").split("_")[0];

        // Swedish-to-Swedish is the monolingual dictionary, not a pair.
        if (!target || target === "swe") {
            return { code: SOURCE_CODE, name: name };
        }
        return {
            code: `${SOURCE_CODE}→${target}`,
            name: `Swedish → ${name}`
        };
    }
}

export default LanguageLabel;
