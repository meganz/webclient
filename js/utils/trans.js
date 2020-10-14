mega.utils = mega.utils || {};

mega.utils.trans = mega.utils.trans || {};

mega.utils.trans.listFormatMeta = {};
mega.utils.trans.listFormatMeta.customCommas = {
    "ar": " \u0648",
    "jp": "\u3001",
    "cn": "\u3001",
    "ct": "\u3001",
    "th": " "
};
mega.utils.trans.listFormatMeta.conjunctions = {
    "br": "e",
    "cn": "\u548C",
    "ct": "\u548C",
    "de": "und",
    "en": "and",
    "es": "y",
    "fr": "et",
    "id": "dan",
    "it": "e",
    "kr": "\uBC0F",
    "nl": "en",
    "pl":"i",
    "ro": "\u0219i",
    "ru": "\u0438",
    "th": "\u0E41\u0E25\u0E30",
    "vi": "v\u00e0"
};

/**
 * Should be used to translate multiple items in strings, as:
 * "Call with %s ended." -> "Call with Ivan, John and Peter ended."
 *
 * @param {Array} items array of strings
 * @param {String} translationString string to be used for replacing %s/[X] w/ the list of items
 * @param {boolean} [translationAndOr] Pass true for when "or" should be used and false/falsy value for when "and" is
 * needed
 */
mega.utils.trans.listToString = function(items, translationString, translationAndOr) {
    "use strict";

    assert(items && items.concat, "invalid items passed (can't be a non-array)");
    assert(translationString, 'missing translationString');

    if (items.length === 0) {
        return '';
    }

    translationString = translationString.replace("[X]", "%s");

    if (items.length === 1) {
        return translationString.replace("%s", items[0]);
    }
    // don't modify the passed array, but cloned it!
    var clonedItems = clone(items);
    var lastItem = "";
    var replacement = "";

    var customComma = mega.utils.trans.listFormatMeta.customCommas[lang];
    customComma = typeof customComma === "undefined" ? ", " : customComma;

    // Arabic does have a special order in which items are "joined"/glued

    lastItem = clonedItems.pop();
    replacement = clonedItems.join(customComma);

    if (translationAndOr) {
        throw new Error("Not implemented");
        // TODO: translate!
        // replacement = "%s1 or %s2".replace("%s1", replacement);
    }
    else {
        var space1 = " ";
        var space2 = " ";
        var defConj = "and";

        // thai specific spaces configuration
        if (lang === "th") {
            space1 = items.length === 2 ? "" : space1;
            space2 = "";
        }
        // jp and ar uses "A and B and C", with custom "comma"
        else if (lang === "jp" || lang === "ar") {
            space1 = space2 = "";
            defConj = mega.utils.trans.listFormatMeta.customCommas[lang];
        }
        // "cn" and "ct" does have a "space"-like character embedded in the conjunction string
        else if (lang === "cn" || lang === "ct") {
            space1 = space2 = "";
        }
        // indonesian have a special "oxford comma"-like ending comma that needs to be appended in some cases
        else if (lang === "id" && items.length > 2 && replacement) {
            replacement += ",";
        }

        // debug/development helper:
        // console.error(JSON.stringify({
        //     "replacement": replacement,
        //     "lang": lang,
        //     "conj": mega.utils.trans.listFormatMeta.conjunctions[lang],
        //     "comma": mega.utils.trans.listFormatMeta.customCommas[lang]
        // }, null, "\t", 2));

        replacement = ("%s1" + space1 + (mega.utils.trans.listFormatMeta.conjunctions[lang] || defConj) +
            space2 + "%s2").replace("%s1", replacement);
    }
    replacement = replacement.replace("%s2", lastItem);

    return translationString
        .replace("%s", replacement);
};
