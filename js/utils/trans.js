mega.utils = mega.utils || {};

mega.utils.trans = mega.utils.trans || {};

/**
 * Should be used to translate multiple items in strings, as:
 * "Call with %s ended." -> "Call with Ivan, John and Peter ended."
 *
 * @param items {Array} array of strings
 * @param translationSingular {String} singular version of the translation to be used
 * @param [translationPlural] {String} plural version of the translation to be used for when items contains only one
 * item. If empty/falsy the translationSingular will be reused
 * @param [translationAndOr] {boolean} Pass true for when "or" should be used and false/falsy value for when "and" is
 * needed
 */
mega.utils.trans.listToString = function(items, translationSingular, translationPlural, translationAndOr) {
    "use strict";

    assert(items && items.concat && items.length > 0, "invalid items passed (can't be a non-array or an empty array)");
    assert(translationSingular, 'missing translationSingular');

    translationSingular = translationSingular.replace("[X]", "%s");

    translationPlural = translationPlural || translationSingular;

    translationPlural = translationPlural.replace("[X]", "%s");

    if (items.length === 1) {
        return translationSingular.replace("%s", items[0]);
    }
    else {
        // don't modify the passed array, but cloned it!
        var clonedItems = clone(items);
        var lastItem = clonedItems.pop();
        var replacement = clonedItems.join(", ");
        if (!translationAndOr) {
            // TODO: translate!
            replacement = "%s1 and %s2".replace("%s1", replacement);
        }
        else {
            // TODO: translate!
            replacement = "%s1 or %s2".replace("%s1", replacement);
        }
        replacement = replacement.replace("%s2", lastItem);

        return translationPlural
            .replace("%s", replacement);
    }
};
