/**
 * @fileOverview
 * mega.utils.trans test
 */

describe("mega.utils.trans", function() {
    "use strict";

    var trans = mega.utils.trans;


    var initialLang = lang;
    afterEach(function() {
        window.lang = initialLang;
    });


    // use this (dumpListFormats) in case you want to check/develop "list formats" for newly added languages
    var avail_langs = Object.keys(languages);
    var langMap = {};
    langMap['en-GB'] = "en";
    langMap['en-GB'] = "en";
    avail_langs[5] = "en-GB";
    for (var i = 0; i < avail_langs.length; i++) {
        if (remappedLangLocales[avail_langs[i]]) {
            langMap[remappedLangLocales[avail_langs[i]]] = avail_langs[i];
            avail_langs[i] = remappedLangLocales[avail_langs[i]];
        }
        else {
            langMap[avail_langs[i]] = avail_langs[i];
        }
    }
    function dumpListFormats() {
        "use strict";
        var translated = {};
        if (typeof Intl === "undefined" || !Intl.ListFormat) {
            // Note to anyone editing this! watch out with the "Arabic" strings...they render in different order in the
            // console VS the dev tools VS the IDE :) (because of different support of rtl!)
            return {
                "ar:0": "",
                "ar:1": "$0",
                "ar:2": "$0 و$1",
                "ar:3": "$0 و$1 و$2",
                "ar:4": "$0 و$1 و$2 و$3",
                "ar:5": "$0 و$1 و$2 و$3 و$4",
                "br:0": "",
                "br:1": "$0",
                "br:2": "$0 e $1",
                "br:3": "$0, $1 e $2",
                "br:4": "$0, $1, $2 e $3",
                "br:5": "$0, $1, $2, $3 e $4",
                "cn:0": "",
                "cn:1": "$0",
                "cn:2": "$0和$1",
                "cn:3": "$0、$1和$2",
                "cn:4": "$0、$1、$2和$3",
                "cn:5": "$0、$1、$2、$3和$4",
                "ct:0": "",
                "ct:1": "$0",
                "ct:2": "$0和$1",
                "ct:3": "$0、$1和$2",
                "ct:4": "$0、$1、$2和$3",
                "ct:5": "$0、$1、$2、$3和$4",
                "de:0": "",
                "de:1": "$0",
                "de:2": "$0 und $1",
                "de:3": "$0, $1 und $2",
                "de:4": "$0, $1, $2 und $3",
                "de:5": "$0, $1, $2, $3 und $4",
                "en-GB:0": "",
                "en-GB:1": "$0",
                "en-GB:2": "$0 and $1",
                "en-GB:3": "$0, $1 and $2",
                "en-GB:4": "$0, $1, $2 and $3",
                "en-GB:5": "$0, $1, $2, $3 and $4",
                "es:0": "",
                "es:1": "$0",
                "es:2": "$0 y $1",
                "es:3": "$0, $1 y $2",
                "es:4": "$0, $1, $2 y $3",
                "es:5": "$0, $1, $2, $3 y $4",
                "fr:0": "",
                "fr:1": "$0",
                "fr:2": "$0 et $1",
                "fr:3": "$0, $1 et $2",
                "fr:4": "$0, $1, $2 et $3",
                "fr:5": "$0, $1, $2, $3 et $4",
                "id:0": "",
                "id:1": "$0",
                "id:2": "$0 dan $1",
                "id:3": "$0, $1, dan $2",
                "id:4": "$0, $1, $2, dan $3",
                "id:5": "$0, $1, $2, $3, dan $4",
                "it:0": "",
                "it:1": "$0",
                "it:2": "$0 e $1",
                "it:3": "$0, $1 e $2",
                "it:4": "$0, $1, $2 e $3",
                "it:5": "$0, $1, $2, $3 e $4",
                "jp:0": "",
                "jp:1": "$0",
                "jp:2": "$0、$1",
                "jp:3": "$0、$1、$2",
                "jp:4": "$0、$1、$2、$3",
                "jp:5": "$0、$1、$2、$3、$4",
                "kr:0": "",
                "kr:1": "$0",
                "kr:2": "$0 및 $1",
                "kr:3": "$0, $1 및 $2",
                "kr:4": "$0, $1, $2 및 $3",
                "kr:5": "$0, $1, $2, $3 및 $4",
                "nl:0": "",
                "nl:1": "$0",
                "nl:2": "$0 en $1",
                "nl:3": "$0, $1 en $2",
                "nl:4": "$0, $1, $2 en $3",
                "nl:5": "$0, $1, $2, $3 en $4",
                "pl:0": "",
                "pl:1": "$0",
                "pl:2": "$0 i $1",
                "pl:3": "$0, $1 i $2",
                "pl:4": "$0, $1, $2 i $3",
                "pl:5": "$0, $1, $2, $3 i $4",
                "ro:0": "",
                "ro:1": "$0",
                "ro:2": "$0 și $1",
                "ro:3": "$0, $1 și $2",
                "ro:4": "$0, $1, $2 și $3",
                "ro:5": "$0, $1, $2, $3 și $4",
                "ru:0": "",
                "ru:1": "$0",
                "ru:2": "$0 и $1",
                "ru:3": "$0, $1 и $2",
                "ru:4": "$0, $1, $2 и $3",
                "ru:5": "$0, $1, $2, $3 и $4",
                "th:0": "",
                "th:1": "$0",
                "th:2": "$0และ$1",
                "th:3": "$0 $1 และ$2",
                "th:4": "$0 $1 $2 และ$3",
                "th:5": "$0 $1 $2 $3 และ$4",
                "vi:0": "",
                "vi:1": "$0",
                "vi:2": "$0 và $1",
                "vi:3": "$0, $1 và $2",
                "vi:4": "$0, $1, $2 và $3",
                "vi:5": "$0, $1, $2, $3 và $4"
            };
        }

        avail_langs.forEach(function(locale) {
            for (var x = 0; x <= 5; x++) {

                var placeholderItemList = [];
                for (var k = 0; k < x; k++) {
                    placeholderItemList.push(`$${k}`);
                }
                var formatter = new Intl.ListFormat(locale, {style: 'long', type: 'conjunction'});
                translated[langMap[locale] + ":" + x] = formatter.format(placeholderItemList);
            }
        });
        return translated;
    };


    describe('mega.utils.trans.listToString', function() {
        var intl_translated = dumpListFormats();
        avail_langs.forEach(function(locale) {
            window.lang = langMap[locale];

            for (var x = 0; x <= 5; x++) {

                var placeholderItemList = [];
                for (var k = 0; k < x; k++) {
                    placeholderItemList.push(`$${k}`);
                }
                var id = langMap[locale] + ":" + x;
                var translated = trans.listToString(placeholderItemList, "%s");

                // console.error(JSON.stringify({
                //     "locale": locale,
                //     "id": id,
                //     "intl_translated": intl_translated[id],
                //     "translated": translated
                // }, null, '\t', 2));

                expect(intl_translated[id]).to.eql(translated);
                // , intl_translated[id] + " != " + translated);
            }
        });
    });
});
