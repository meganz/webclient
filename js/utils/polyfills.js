/** document.hasFocus polyfill */
mBroadcaster.once('startMega', function() {
    if (typeof document.hasFocus !== 'function') {
        var hasFocus = true;

        $(window)
            .bind('focus', function() {
                hasFocus = true;
            })
            .bind('blur', function() {
                hasFocus = false;
            });

        document.hasFocus = function() {
            return hasFocus;
        };
    }
});

/** getOwnPropertyDescriptors polyfill */
mBroadcaster.once('startMega', function() {
    if (!Object.hasOwnProperty('getOwnPropertyDescriptors')) {
        Object.defineProperty(Object, 'getOwnPropertyDescriptors', {
            value: function getOwnPropertyDescriptors(obj) {
                var result = {};

                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        result[key] = Object.getOwnPropertyDescriptor(obj, key);
                    }
                }

                return result;
            }
        });
    }
});

if (!String.prototype.startsWith) {
    // determines whether a string begins with the characters of a specified string
    String.prototype.startsWith = function(searchString, position) {
        'use strict';
        return this.substr(position || 0, searchString.length) === searchString;
    };
}

if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(searchStr, pos) {
        'use strict';

        // This works much better than >= because it compensates for NaN:
        if (!(pos < this.length)) {
            pos = this.length;
        }
        return this.substr((pos | 0) - searchStr.length, searchStr.length) === searchStr;
    };
}
