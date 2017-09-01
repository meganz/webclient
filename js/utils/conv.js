/**
 * @file Helper functions involving conversion and extraction.
 */

(function(global) {
    "use strict";

    var array = Object.create(null);
    array.to = Object.create(null);

    /**
     * Convert Array to Object
     * @param {Array|String} input The input array, or string
     * @param {*} [value] Optional value to assign to objects
     * @returns {Object}
     */
    array.to.object = function(input, value) {
        if (!Array.isArray(input)) {
            input = [input];
        }
        return input.reduce(function(obj, key, idx) {
            obj[key] = value !== undefined ? value : (idx | 0) + 1;
            return obj;
        }, Object.create(null));
    };

    /**
     * Get a random value from an array
     * @param {Array} input The input array
     * @memberOf array
     */
    array.random = function(input) {
        return input[rand(input.length)];
    };

    /**
     * Get an array with unique values
     * @param {Array} input The input array
     * @memberOf array
     */
    array.unique = function(input) {
        return input.reduce(function(out, value) {
            if (out.indexOf(value) < 0) {
                out.push(value);
            }
            return out;
        }, []);
    };

    /**
     * Remove an element from an array
     * @param {Array} input The input array
     * @param {*} value The value to remove
     * @param {Boolean} [can_fail] Whether the value might not be in the array
     * @returns {Boolean} whether the value was removed
     * @memberOf array
     */
    array.remove = function(input, value, can_fail) {
        var idx = input.indexOf(value);
        if (d) {
            if (!(can_fail || idx !== -1)) {
                console.warn('Unable to Remove Value ' + value, value);
            }
        }
        if (idx !== -1) {
            input.splice(idx, 1);
        }
        return idx !== -1;
    };

    /**
     * Pack an array into a serialized string, usually shorter than JSON.stringify()'ed
     * @param {Array} input The input array
     * @param {Boolean} [enc] Encode each value using base64
     * @returns {String}
     * @memberOf array
     */
    array.pack = function(input, enc) {
        var s = [];
        var ilen = d && JSON.stringify(input).length;

        if (enc) {
            input = input.map(base64urlencode);
        }

        // find pairs of repetitions
        for (var n = 0; n < input.length; n++) {
            var p = n;

            if (input[n] !== input[n + 1]) {
                while (input[n] === input[p + 2] && input[n + 1] === input[p + 3]) {
                    s.push(input[n] + '>' + input[n + 1]);
                    p += 2;
                }
            }

            if (p === n) {
                s.push(input[n]);
            }
            else {
                s.push(input[n] + '>' + input[n + 1]);
                n = p + 1;
            }
        }
        input = s;

        // shrink repetitions
        var result = input.reduce(function(o, v) {
            var k = String(o[o.length - 1]).split('*');
            if (k[0] === v) {
                o[o.length - 1] = k[0] + '*' + (Math.max(k[1] | 0, 1) + 1);
            }
            else {
                o.push(v);
            }
            return o;
        }, []).join(',');

        if (d) {
            console.debug('array.pack saved %s bytes (%s%)',
                ilen - result.length,
                100 - Math.round(result.length * 100 / ilen));
        }

        return result;
    };


    /**
     * Unpack a previously serialized array
     * @param {String} input The serialized array
     * @param {Boolean} [dec] Whether the values were encoded using base64
     * @returns {Array}
     * @memberOf array
     */
    array.unpack = function(input, dec) {
        var result = input.split(',').reduce(function(o, v) {
            if (String(v).indexOf('*') >= 0) {
                v = v.split('*');

                if (String(v[0]).indexOf('>') >= 0) {
                    var k = v[0].split('>');

                    for (var j = v[1] | 0; j--;) {
                        o.push(k[0]);
                        o.push(k[1]);
                    }
                }
                else {
                    for (var g = v[1] | 0; g--;) {
                        o.push(v[0]);
                    }
                }
            }
            else {
                o.push(v);
            }
            return o;
        }, []);

        if (dec) {
            result = result.map(base64urldecode);
        }

        return result;
    };

    /**
     * Like array.remove, but would clone the array and return the array with the `val` removed (if exists)
     *
     * @param {Array} arr
     * @param {String|Number} val
     * @returns {Array}
     */
    array.filterNonMatching = function(arr, val) {
        "use strict";
        var arrWithoutVal = clone(arr);
        arrWithoutVal.splice($.inArray(val, arrWithoutVal), 1);
        return arrWithoutVal;
    };


    /**
     * Compare to arrays and return a diff ({'removed': [...], 'added': [...]}) object
     *
     * @param {Array} old_arr
     * @param {Array} new_arr
     * @returns {{removed, added}}
     */
    array.diff = function(old_arr, new_arr) {
        return {
            'removed': old_arr.filter(function(v) { return new_arr.indexOf(v) < 0; }),
            'added': new_arr.filter(function(v) { return old_arr.indexOf(v) < 0; }),
        };
    };


    /**
     * Array helper functions.
     * @name array
     */
    Object.defineProperty(global, 'array', {value: Object.freeze(array)});

})(self);

/**
 * Retrieve object/array values
 * @param {Object|Array} obj The input object
 * @returns {Array}
 */
var obj_values = function obj_values(obj) {
    "use strict";

    var vals = [];
    Object.keys(obj).forEach(function(memb) {
        if (typeof obj.hasOwnProperty !== 'function' || obj.hasOwnProperty(memb)) {
            vals.push(obj[memb]);
        }
    });

    return vals;
};

if (typeof Object.values === 'function') {
    obj_values = Object.values;
}
else {
    Object.values = obj_values;
}

/**
 * Convert hexadecimal string to binary
 * @param {String} hex The input string
 * @returns {String}
 */
function hex2bin(hex) {
    "use strict";

    var bytes = [];
    for (var i = 0; i < hex.length - 1; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }

    return String.fromCharCode.apply(String, bytes);
}
