import common = require("common")

export class HistoryModel {
    private _storage:common.ISettingsStorage;
    private _language:string;
    private _backendService:common.IBackendService;

    constructor(backendService: common.IBackendService, storage?: common.ISettingsStorage) {
        this._backendService = backendService;
        this._storage = storage || localStorage;
    }

    get language() : string {
        var language = this._language || this._storage["defaultLanguage"];
        if (!language) {
            language = "swe_swe";
        }
        return language;
    }
    set language(value : string) {
        this._language = value;
        this.fireOnChange();
    }

    get showDate() : boolean {
        return !!this._storage["showDate"];
    }
    set showDate(value: boolean) {
        this._storage["showDate"] = value;
        this.fireOnChange();
    }

    loadLanguages() : JQueryPromise<common.Language[]> {
        return this._backendService.getLanguages()
            .then((languages)=>languages.filter((item)=>item.value !== "swe_swe"));
    }

    loadHistory(language: string) : JQueryPromise<common.HistoryItem[]> {
        return this._backendService.loadHistory(language);
    }

    clearHistory(language: string) : JQueryPromise<{}>{
        return this._backendService.clearHistory(language);
    }

    onChange : (settings: HistoryModel)=>void;

    private fireOnChange() : void {
        if (this.onChange) {
            this.onChange(this);
        }
    }
}
