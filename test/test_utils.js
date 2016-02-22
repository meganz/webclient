var testutils = {};

(function () {
    "use strict";

    var ns = testutils;

    /**
     * (Deep) clones a JavaScript object.
     *
     * Note: May not work with some objects.
     *
     * See: http://stackoverflow.com/questions/728360/most-elegant-way-to-clone-a-javascript-object
     *
     * @param obj {Object}
     *     The object to be cloned.
     * @returns {Object}
     *     A deep copy of the original object.
     */
    ns.clone = function(obj) {
        // Handle the 3 simple types, and null or undefined.
        if (obj === null || typeof obj !== "object") {
            return obj;
        }

        var copy;

        // Handle date.
        if (obj instanceof Date) {
            copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }

        // Handle array.
        if (obj instanceof Array) {
            copy = [];
            for (var i = 0, len = obj.length; i < len; i++) {
                copy[i] = ns.clone(obj[i]);
            }
            return copy;
        }

        // Handle object.
        if (obj instanceof Object) {
            copy = {};
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr)) {
                    copy[attr] = ns.clone(obj[attr]);
                }
            }
            return copy;
        }

        throw new Error("Unable to copy obj! Its type isn't supported.");
    };


    /**
     * Determines equality of two sets.
     *
     * @param {Set} set1
     *     First set for comparison.
     * @param {Set} set2
     *     Second set for comparison.
     * @return {Boolean}
     *     `true` if sets are equal, `false` otherwise.
     */
    ns.isSetEqual = function(set1, set2) {

        var result = true;

        if (set1.size !== set2.size) {
            result = false;
        }

        set1.forEach(function _setEqualityIterator(item) {
            if (!set2.has(item)) {
                result = false;
            }
        });

        return result;
    };


    if (!Array.from) {
        /**
         * Iterates over an iterable and returns an Array object.
         *
         * Polyfill for PhantomJS, which doesn't have Array.from.
         *
         * @param {Object} anIterable
         *     An iterable (containing the `forEach()` method) to convert.
         * @return {Array}
         *     Array representation.
         */
        Array.from = function(anIterable) {

            var result = [];

            anIterable.forEach(function _iterableToArrayIterator(item) {
                result.push(item);
            });

            return result;
        };
    }
}());
