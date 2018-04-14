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

/** document.exitFullScreen polyfill */
mBroadcaster.once('startMega', function() {
    'use strict';

    if (typeof document.exitFullscreen !== 'function') {
        document.exitFullscreen = document.mozCancelFullScreen
            || document.webkitCancelFullScreen || document.msExitFullscreen || function() {};
    }
});


/** getOwnPropertyDescriptors polyfill */
if (!Object.hasOwnProperty('getOwnPropertyDescriptors')) {
    Object.defineProperty(Object, 'getOwnPropertyDescriptors', {
        value: function getOwnPropertyDescriptors(obj) {
            'use strict';

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


mBroadcaster.once('boot_done', function() {
    'use strict';
    var mg;

    // Check whether the running browser is ES2019 compliant by testing RegExp's Look-behind Assertions.
    try {
        mg = '<foo one>m1</foo><foo doh>:</foo><foo two>m2</foo>'.match(RegExp('(?<=foo (?:one|two)>)([^<]+)', 'g'));
    }
    catch (ex) {}

    Object.defineProperty(mega, 'es2019', {value: mg && mg.length === 2 && mg[0] === 'm1' && mg[1] === 'm2'});
});
