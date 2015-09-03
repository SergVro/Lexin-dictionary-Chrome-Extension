/// <reference path="..\..\lib\jquery\jquery.d.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", "jquery", "./TranslationParser"], function (require, exports, $, TranslationParser) {
    var DictionaryBase = (function (_super) {
        __extends(DictionaryBase, _super);
        function DictionaryBase() {
            _super.apply(this, arguments);
        }
        Object.defineProperty(DictionaryBase.prototype, "tryLowerCase", {
            get: function () {
                return true;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DictionaryBase.prototype, "supportedLanguages", {
            get: function () {
                return [];
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DictionaryBase.prototype, "parsingRegExp", {
            get: function () {
                throw new Error("This property is abstract");
            },
            enumerable: true,
            configurable: true
        });
        DictionaryBase.prototype.isLanguageSupported = function (langDirection) {
            return this.supportedLanguages.some(function (lang) { return lang.value === langDirection; });
        };
        DictionaryBase.prototype.getSupportedLanguages = function () {
            return this.supportedLanguages;
        };
        DictionaryBase.prototype.getTranslation = function (word, langDirection, direction) {
            var _this = this;
            this.checkLanguage(langDirection);
            var queryUrl = this.createQueryUrl(word, langDirection, direction);
            var deferred = $.Deferred();
            $.get(queryUrl).done(function (data) {
                if (!_this.isWordFound(word, data) && word.toLowerCase() !== word) {
                    _this.getTranslation(word.toLowerCase(), langDirection, direction).done(function (dataLower) {
                        deferred.resolve(dataLower);
                    }).fail(function (error) { return deferred.reject(error); });
                }
                deferred.resolve(data);
            }).fail(function (error) { return deferred.reject(error); });
            return deferred.promise();
        };
        DictionaryBase.prototype.isWordFound = function (word, translation) {
            throw new Error("This method is abstract");
        };
        DictionaryBase.prototype.parseTranslation = function (translation, langDirection) {
            this.checkLanguage(langDirection);
            return this.parse(translation, this.parsingRegExp);
        };
        DictionaryBase.prototype.createQueryUrl = function (word, langDirection, direction) {
            throw new Error("This method is abstract");
        };
        DictionaryBase.prototype.checkLanguage = function (langDirection) {
            if (!this.isLanguageSupported(langDirection)) {
                throw new Error("This dictionary does not support language " + langDirection);
            }
        };
        DictionaryBase.prototype.htmlDecode = function (value) {
            return $("<div />").html(value).text();
        };
        return DictionaryBase;
    })(TranslationParser);
    return DictionaryBase;
});
//# sourceMappingURL=DictionaryBase.js.map