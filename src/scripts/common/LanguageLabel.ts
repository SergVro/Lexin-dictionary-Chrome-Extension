import { IAsyncSettingsStorage, ILanguage } from "./Interfaces.js";
import { LANGUAGE_KEY } from "./LanguageManager.js";
import TranslationDirection from "../dictionary/TranslationDirection.js";

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

    /** The Language Direction as the Translation Card shows it - always out of Swedish. */
    describe(langDirection: string): ILanguageLabel {
        return this.describeDirection(langDirection, TranslationDirection.to);
    }

    /**
     * The Language Direction *and* which way the lookup runs, as the Action Popup's
     * badge shows it. The badge is the only thing on screen that says which way the
     * swap control has the popup pointing.
     */
    describeDirection(langDirection: string, direction: TranslationDirection): ILanguageLabel {
        const language = this.languages.filter((lang) => lang.value === langDirection)[0];
        const name = language ? language.text : langDirection;

        // "swe_srp_cyrillic" -> "srp". The badge has room for a three-letter code, not
        // a variant suffix; the full name rides along in the title attribute.
        const target = langDirection.replace(/^swe_/, "").split("_")[0];

        // Swedish-to-Swedish is the monolingual dictionary. There is no pair to show,
        // and no direction to swap.
        if (!target || target === "swe") {
            return { code: SOURCE_CODE, name: name };
        }

        if (direction === TranslationDirection.from) {
            return {
                code: `${target}→${SOURCE_CODE}`,
                name: `${name} → Swedish`
            };
        }
        return {
            code: `${SOURCE_CODE}→${target}`,
            name: `Swedish → ${name}`
        };
    }
}

export default LanguageLabel;
