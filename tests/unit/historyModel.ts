/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />
/// <reference path="../../src/lib/jquery/jquery.d.ts" />

import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
// Assume that we now have a version of our model in TypeScript:
import Common = require('common');
import Models = require('models');
import jquery = require('jquery');

class TestBackendService implements Common.IBackendService {
    getLanguageCalls = 0
    loadHistoryCalls = 0
    clearHistoryCalls = 0
    getLanguages():JQueryPromise<Common.Language[]> {
        this.getLanguageCalls++;
        return jquery.Deferred();
    }

    loadHistory(language:string):JQueryPromise<Common.HistoryItem[]> {
        this.loadHistoryCalls++;
        return jquery.Deferred();
    }

    clearHistory(language:string):JQueryPromise<{}> {
        this.clearHistoryCalls++;
        return jquery.Deferred();
    }
}


registerSuite({
    name: 'HistoryModel',
    // Assume we have a promises interface defined
    'default data'() {

        var mockBackendService = new TestBackendService(),
            mockSettingsStorage : Common.ISettingsStorage = {},
            historyModel = new Models.HistoryModel(mockBackendService, mockSettingsStorage);

        assert.strictEqual(historyModel.language, 'swe_swe', 'default language should be Swedish');
        assert.strictEqual(historyModel.showDate, false, 'default value for showDate should be false');

    },
    'setters': {
        'language'(){
            var mockBackendService = new TestBackendService(),
                mockSettingsStorage:Common.ISettingsStorage = {},
                historyModel = new Models.HistoryModel(mockBackendService, mockSettingsStorage),
                testLanguage = 'swe_eng';

            historyModel.onChange = (model)=>assert.strictEqual(model.language, testLanguage);
            historyModel.language = testLanguage;

            assert.strictEqual(historyModel.language, testLanguage);
        },
        'show date'() {
            var mockBackendService = new TestBackendService(),
                mockSettingsStorage:Common.ISettingsStorage = {},
                historyModel = new Models.HistoryModel(mockBackendService, mockSettingsStorage);

            historyModel.onChange = (model)=>assert.strictEqual(model.showDate, true);
            historyModel.showDate = true;

            assert.strictEqual(historyModel.showDate, true);
            assert.strictEqual(mockSettingsStorage['showDate'], true);
        }

    },
    'methods': {
        'load languages'() {
            var mockBackendService = new TestBackendService(),
                mockSettingsStorage:Common.ISettingsStorage = {},
                historyModel = new Models.HistoryModel(mockBackendService, mockSettingsStorage);

            historyModel.loadLanguages();
            assert.strictEqual(mockBackendService.getLanguageCalls, 1);
        },

        'load history'() {
            var mockBackendService = new TestBackendService(),
                mockSettingsStorage:Common.ISettingsStorage = {},
                historyModel = new Models.HistoryModel(mockBackendService, mockSettingsStorage);

            historyModel.loadHistory('swe_eng');
            assert.strictEqual(mockBackendService.loadHistoryCalls, 1);
        },

        'clear history'() {
            var mockBackendService = new TestBackendService(),
                mockSettingsStorage:Common.ISettingsStorage = {},
                historyModel = new Models.HistoryModel(mockBackendService, mockSettingsStorage);

            historyModel.clearHistory('swe_eng');
            assert.strictEqual(mockBackendService.clearHistoryCalls, 1);
        }
    }

});