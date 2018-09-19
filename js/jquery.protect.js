/**
 * @file jquery.protect.js
 * Ensure a single jQuery version is injected into the page, ours.
 *
 * This file is part of the MEGA WebClient Engine.
 * (c) 2016 by Mega Limited, Auckland, New Zealand
 */

(function(scope, jQuery) {

    // check we're running under a browser window
    if (typeof window === 'undefined' || scope !== window) {
        console.debug('jQueryProtect: Unexpected scope.');
    }
    else {
        // check there was not another jquery version loaded,
        // or any other library using window.$ which we don't use
        var objs = [];

        if (scope.jQuery !== undefined) {
            console.warn('jQueryProtect: Found jQuery instance.', Object(scope.$.fn).jquery);
            objs.push('jQuery');
        }
        if (scope.$ !== undefined) {
            console.warn('jQueryProtect: Found .$ instance.', scope.$);
            objs.push('$');
        }

        // check where they belong
        objs.forEach(function($) {
            try {
                scope[$]('<<throw').foo();
            }
            catch (ex) {
                console.debug('jQueryProtect.trace', ex.stack, ex);
            }
        });
        objs = undefined;
    }

    // Protect properties as read-only
    var define = function(k, v, obj) {
        obj = obj || scope;

        delete obj[k];
        Object.defineProperty(obj, k, {
            value: v,
            writable: false
        });

        if (Object.getOwnPropertyDescriptor(obj, k).configurable) {
            console.warn('jQueryProtect: Weak protection, the "%s" property is configurable.', k);
        }
    };

    try {
        define('$', jQuery);
        define('jQuery', jQuery);
        define('_evalUrl', false, jQuery);
        define('noConflict', null, jQuery);
        define('globalEval', function() {
            throw new Error('The use of jQuery.globalEval is forbidden.');
        }, jQuery);
        define('ajax', function() {
            throw new Error('The use of jQuery.ajax is forbidden.');
        }, jQuery);

        if (scope.d) {
            console.info('jQueryProtect: Success.', scope.$.fn.jquery);
        }
    }
    catch (ex) {
        console.error('jQueryProtect: Unable to protect our jQuery instance.', ex);
    }
    scope = jQuery = define = undefined;

})(self, jQuery.noConflict( true ));
