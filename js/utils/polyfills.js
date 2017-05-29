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
