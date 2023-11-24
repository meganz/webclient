
/* jshint -W098 */
makeEnum(['MDBOPEN', 'EXECSC', 'LOADINGCLOUD'], 'MEGAFLAG_', window);

// navigate to links internally, not by the browser.
function clickURLs() {
    'use strict';
    var nodeList = document.querySelectorAll('a.clickurl');

    if (nodeList.length) {
        $(nodeList).rebind('click', function() {
            var $this = $(this);
            var url = $this.attr('href') || $this.data('fxhref');
            let eventid = $this.attr('data-eventid') || false;
            const redirect = $this.attr('redirect');
            if (eventid) {
                eventid = parseInt(eventid);
                if (!isNaN(eventid)) {
                    delay(`clickurlevlog${eventid}`, () => eventlog(eventid));
                }
            }

            if (url) {
                var target = $this.attr('target');

                if (target === '_blank') {
                    open(/^(https?:\/\/)/i.test(url) ? url : getBaseUrl() + url, '_blank', 'noopener,noreferrer');
                    return false;
                }

                if (window.loadingDialog && $this.hasClass('pages-nav')) {
                    loadingDialog.quiet = true;
                    onIdle(function() {
                        loadingDialog.quiet = false;
                    });
                }

                if (redirect) {
                    const redirectPage = redirect;
                    login_next = redirectPage === "1" ? `/${page}` : `/${redirectPage}`;
                }

                loadSubPage(url.substr(1));
                return false;
            }
        });
        if (is_extension) {
            $(nodeList).rebind('auxclick', function(e) {

                // if this is middle click on mouse to open it on new tab and this is extension
                if (e.which === 2) {

                    var $this = $(this);
                    var url = $this.attr('href') || $this.data('fxhref');

                    open(getBaseUrl() + url);

                    return false;
                }
            });
        }
    }
    nodeList = undefined;
}

// Handler that deals with scroll to element links.
function scrollToURLs() {
    'use strict';
    var nodeList = document.querySelectorAll('a.scroll_to');

    if (nodeList) {
        $(nodeList).rebind("click", function() {
            var $scrollTo = $($(this).data("scrollto"));

            if ($scrollTo.length) {
                var $toScroll;
                var newOffset = $scrollTo[0].offsetTop;

                if (is_mobile) {
                    var mobileClass = 'body.mobile .fmholder';
                    if (page === "privacy" || page === "terms") {
                        $toScroll = $(mobileClass);
                    }
                }
                else  if ($scrollTo.closest('.ps').length) {
                    $toScroll = $scrollTo.closest('.ps');
                }
                else {
                    $toScroll = $('.fmholder');
                }

                if ($toScroll) {
                    $toScroll.animate({scrollTop: newOffset - 40}, 400);
                }

            }
        });
    }
    nodeList = undefined;
}

/**
 * excludeIntersected
 *
 * Loop through arrays excluding intersected items form array2
 * and prepare result format for tokenInput plugin item format.
 *
 * @param {Array} array1, emails used in share
 * @param {Array} array2, list of all available emails
 *
 * @returns {Array} item An array of JSON objects e.g. { id, name }.
 */
function excludeIntersected(array1, array2) {

    var result = [],
        tmpObj2 = array2;

    if (!array1) {
        return array2;
    }
    else if (!array2) {
        return array1;
    }

    // Loop through emails used in share
    for (var i in array1) {
        if (array1.hasOwnProperty(i)) {

            // Loop through list of all emails
            for (var k in array2) {
                if (array2.hasOwnProperty(k)) {

                    // Remove matched email from result
                    if (array1[i] === array2[k]) {
                        tmpObj2.splice(k, 1);
                        break;
                    }
                }
            }
        }
    }

    // Prepare for token.input plugin item format
    for (var n in tmpObj2) {
        if (tmpObj2.hasOwnProperty(n)) {
            result.push({ id: tmpObj2[n], name: tmpObj2[n] });
        }
    }

    return result;
}

function asciionly(text) {
    var rforeign = /[^\u0000-\u007f]/;
    if (rforeign.test(text)) {
        return false;
    }
    else {
        return true;
    }
}

var isNativeObject = function(obj) {
    var objConstructorText = obj.constructor.toString();
    return objConstructorText.indexOf("[native code]") !== -1 && objConstructorText.indexOf("Object()") === -1;
};

function clone(obj) {

    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    if (Array.isArray(obj)) {
        var arr = new Array(obj.length);
        for (var i = obj.length; i--; ) {
            arr[i] = clone(obj[i]);
        }
        return arr;
    }
    if (obj instanceof Object) {
        var copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) {
                if (!(obj[attr] instanceof Object)) {
                    copy[attr] = obj[attr];
                }
                else if (Array.isArray(obj[attr])) {
                    copy[attr] = clone(obj[attr]);
                }
                else if (!isNativeObject(obj[attr])) {
                    copy[attr] = clone(obj[attr]);
                }
                else if ($.isFunction(obj[attr])) {
                    copy[attr] = obj[attr];
                }
                else {
                    copy[attr] = {};
                }
            }
        }

        return copy;
    }
    else {
        var copy = Object.create(null);

        for (var k in obj) {
            copy[k] = clone(obj[k]);
        }

        return copy;
    }
}

/**
 * Check if something (val) is a string.
 *
 * @param val
 * @returns {boolean}
 */
function isString(val) {
    return (typeof val === 'string' || val instanceof String);
};

function easeOutCubic(t, b, c, d) {
    return c * ((t = t / d - 1) * t * t + 1) + b;
}

function ellipsis(text, location, maxCharacters) {
    "use strict";
    if (!text) {
        return "";
    }

    if (text.length > 0 && text.length > maxCharacters) {
        if (typeof location === 'undefined') {
            location = 'end';
        }
        switch (location) {
            case 'center':
                var center = (maxCharacters / 2);
                text = text.slice(0, center) + '...' + text.slice(-center);
                break;
            case 'end':
                text = text.slice(0, maxCharacters - 3) + '...';
                break;
        }
    }
    return text;
}

function megatitle(nperc) {
    'use strict';

    if (!nperc) {
        nperc = '';
    }

    let a = document.querySelector('.js-notification-num');
    a = (a = a && parseInt(a.textContent)) > 0 ? `(${a}) ` : '';

    document.title = a + mega_title + nperc;
}

function countrydetails(isocode) {
    var cdetails = {
        name: M.getCountryName(isocode),
        icon: isocode.toLowerCase() + '.png'
    };
    return cdetails;
}

/**
 * Convert bytes sizes into a human-friendly format (KB, MB, GB), pretty
 * similar to `bytesToSize` but this function returns an object
 * (`{ size: "23,33", unit: 'KB' }`) which is easier to consume
 *
 * @param {Number} bytes Size in bytes to convert
 * @param {Number} [precision] Precision to show the decimal number
 * @param {Boolean} [isSpd] True if this is a speed, unit will be returned as speed unit like KB/s
 * @returns {Object} Returns an object similar to `{size: "2.1", unit: "MB"}`
 */
function numOfBytes(bytes, precision, isSpd) {

    'use strict';

    // If not defined, default to 2dp (this still allows setting precision to 0 for 0dp)
    if (typeof precision === 'undefined') {
        precision = 2;
    }

    var fn = isSpd ? bytesToSpeed : bytesToSize;
    const formatted = fn(bytes, precision);
    const parts = formatted.split(formatted.includes(' ') ? ' ' : '\u00A0');

    return { size: parts[0], unit: parts[1] || 'B' };
}

function bytesToSize(bytes, precision, format) {
    'use strict'; /* jshint -W074 */

    var s_b = l[20158];
    var s_kb = l[7049];
    var s_mb = l[20159];
    var s_gb = l[17696];
    var s_tb = l[20160];
    var s_pb = l[23061];

    var kilobyte = 1024;
    var megabyte = kilobyte * 1024;
    var gigabyte = megabyte * 1024;
    var terabyte = gigabyte * 1024;
    var petabyte = terabyte * 1024;
    var resultSize = 0;
    var resultUnit = '';
    var capToMB = false;

    if (precision === undefined) {
        if (bytes > gigabyte) {
            precision = 2;
        }
        else if (bytes > megabyte) {
            precision = 1;
        }
    }

    if (format < 0) {
        format = 0;
        capToMB = true;
    }

    if (!bytes) {
        resultSize = 0;
        resultUnit = s_b;
    }
    else if ((bytes >= 0) && (bytes < kilobyte)) {
        resultSize = parseInt(bytes);
        resultUnit = s_b;
    }
    else if ((bytes >= kilobyte) && (bytes < megabyte)) {
        resultSize = (bytes / kilobyte).toFixed(precision);
        resultUnit = s_kb;
    }
    else if ((bytes >= megabyte) && (bytes < gigabyte) || capToMB) {
        resultSize = (bytes / megabyte).toFixed(precision);
        resultUnit = s_mb;
    }
    else if ((bytes >= gigabyte) && (bytes < terabyte)) {
        resultSize = (bytes / gigabyte).toFixed(precision);
        resultUnit = s_gb;
    }
    else if ((bytes >= terabyte) && (bytes < petabyte)) {
        resultSize = (bytes / terabyte).toFixed(precision);
        resultUnit = s_tb;
    }
    else if (bytes >= petabyte) {
        resultSize = (bytes / petabyte).toFixed(precision);
        resultUnit = s_pb;
    }
    else {
        resultSize = parseInt(bytes);
        resultUnit = s_b;
    }

    // Format 4 will return bytes to precision, with trailing 0s
    if (format === 4) {
        resultSize = parseFloat(resultSize);
    }

    if (window.lang !== 'en') {
        // @todo measure the performance degradation by invoking this here now..
        resultSize = mega.intl.decimal.format(resultSize);
    }

    // XXX: If ever adding more HTML here, make sure it's safe and/or sanitize it.
    if (format === 2) {
        return resultSize + '<span>' + resultUnit + '</span>';
    }
    else if (format === 3) {
        return resultSize;
    }
    else if (format && format !== 4) {
        return '<span>' + resultSize + '</span>' + resultUnit;
    }

    // \u00A0 is a non-breaking space so that the size and unit will always remain on the same line
    else {
        return resultSize + '\u00A0' + resultUnit;
    }
}

/*
 * Very Similar function as bytesToSize due to it is just simple extended version of it by making it as speed.
 * @returns {String} Returns a string that build with value entered and speed unit e.g. 100 KB/s
 */
var bytesToSpeed = function bytesToSpeed() {
    'use strict';
    return l[23062].replace('[%s]', bytesToSize.apply(this, arguments));
};
mBroadcaster.once('startMega', function() {
    'use strict';

    if (lang === 'en' || lang === 'es') {
        bytesToSpeed = function(bytes, precision, format) {
            return bytesToSize(bytes, precision, format) + '/s';
        };
    }
});


function makeid(len) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < len; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

/**
 * Checks if the email address is valid using the inbuilt HTML5
 * validation method suggested at https://stackoverflow.com/a/13975255
 * @param {String} email The email address to validate
 * @returns {Boolean} Returns true if email is valid, false if email is invalid
 */
function isValidEmail(email) {

    'use strict';
    // reference to html spec https://html.spec.whatwg.org/multipage/input.html#e-mail-state-(type=email)
    // with one modification, that the standard allows emails like khaled@mega
    // which is possible in local environment/networks but not in WWW.
    // so I applied + instead of * at the end
    var regex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return regex.test(email);
}

/**
 * Adds on, bind, unbind, one and trigger methods to a specific class's prototype.
 *
 * @param kls class on which prototype this method should add the on, bind, unbind, etc methods
 * @deprecated
 */
function makeObservable(kls) {
    'use strict';
    if (d > 1) {
        console.warn('makeObservable() is deprecated.');
    }
    inherits(kls, MegaDataEmitter);
}

/**
 * Adds simple .setMeta and .getMeta functions, which can be used to store some meta information on the fly.
 * Also triggers `onMetaChange` events (only if the `kls` have a `trigger` method !)
 *
 * @param kls {Class} on which prototype's this method should add the setMeta and getMeta
 */
function makeMetaAware(kls) {
    /**
     * Store meta data
     *
     * @param prefix string
     * @param namespace string
     * @param k string
     * @param val {*}
     */
    kls.prototype.setMeta = function(prefix, namespace, k, val) {
        var self = this;

        if (self["_" + prefix] === undefined) {
            self["_" + prefix] = {};
        }
        if (self["_" + prefix][namespace] === undefined) {
            self["_" + prefix][namespace] = {};
        }
        self["_" + prefix][namespace][k] = val;

        if (self.trigger) {
            self.trigger("onMetaChange", prefix, namespace, k, val);
        }
    };

    /**
     * Clear/delete meta data
     *
     * @param prefix string  optional
     * @param [namespace] string  optional
     * @param [k] string optional
     */
    kls.prototype.clearMeta = function(prefix, namespace, k) {
        var self = this;

        if (!self["_" + prefix]) {
            return;
        }

        if (prefix && !namespace && !k) {
            delete self["_" + prefix];
        }
        else if (prefix && namespace && !k) {
            delete self["_" + prefix][namespace];
        }
        else if (prefix && namespace && k) {
            delete self["_" + prefix][namespace][k];
        }

        if (self.trigger) {
            self.trigger("onMetaChange", prefix, namespace, k);
        }
    };

    /**
     * Retrieve meta data
     *
     * @param prefix {string}
     * @param namespace {string} optional
     * @param k {string} optional
     * @param default_value {*} optional
     * @returns {*}
     */
    kls.prototype.getMeta = function(prefix, namespace, k, default_value) {
        var self = this;

        namespace = namespace || undefined; /* optional */
        k = k || undefined; /* optional */
        default_value = default_value || undefined; /* optional */

        // support for calling only with 2 args.
        if (k === undefined) {
            if (self["_" + prefix] === undefined) {
                return default_value;
            }
            else {
                return self["_" + prefix][namespace] || default_value;
            }
        }
        else {
            // all args

            if (self["_" + prefix] === undefined) {
                return default_value;
            }
            else if (self["_" + prefix][namespace] === undefined) {
                return default_value;
            }
            else {
                return self["_" + prefix][namespace][k] || default_value;
            }
        }
    };
}

/**
 * Gets UAO parameter from the URL if exists and store it
 * @param {String} url          URL
 * @param {String} page         Page
 */
function getUAOParameter(url, page) {
    'use strict';
    var pageLen = page.length;
    if (url.length > pageLen) {
        var urlParams = url.substr(pageLen);
        if (urlParams.length > 14) {
            var uaoParam = urlParams.indexOf('/uao=');
            if (uaoParam > -1) {
                mega.uaoref = urlParams.substr(uaoParam + 5);
            }
        }
    }
}

/**
 * Simple method for generating unique event name with a .suffix that is a hash of the passed 3-n arguments
 * Main purpose is to be used with jQuery.bind and jQuery.unbind.
 *
 * @param eventName {string} event name
 * @param name {string} name of the handler (e.g. .suffix)
 * @returns {string} e.g. $eventName.$name_$ShortHashOfTheAdditionalArguments
 */
function generateEventSuffixFromArguments(eventName, name) {
    var args = Array.prototype.splice.call(arguments, 2);
    var result = "";
    $.each(args, function(k, v) {
        result += v;
    });

    return eventName + "." + name + "_" + ("" + fastHashFunction(result)).replace("-", "_");
}

/**
 * This is a placeholder, which will be used anywhere in our code where we need a simple and FAST hash function.
 * later on, we can change the implementation (to use md5 or murmur) by just changing the function body of this
 * function.
 * @param {String}
 */
function fastHashFunction(val) {
    return MurmurHash3(val, 0x4ef5391a).toString();
}

/**
 * Creates a promise, which will fail if the validateFunction() don't return true in a timely manner (e.g. < timeout).
 *
 * @param validateFunction {Function}
 * @param tick {int}
 * @param timeout {int}
 * @param [waitForPromise] {(MegaPromise|$.Deferred)} Before starting the timer, we will wait for this promise to be rej/res first.
 * @param [name] {String} optional name for the debug output of the error/debug messages
 * @returns {Promise}
 */
function createTimeoutPromise(validateFunction, tick, timeout, waitForPromise, name) {
    'use strict';
    let _res, _rej;
    let running = true;
    let state = 'pending';
    const debug = window.d > 2;
    const tag = (m) => `[${name}] ${m}`;
    const log = (m, ...args) => console.warn(tag(m), ...args);

    const promise = new Promise((resolve, reject) => {
        _rej = reject;
        _res = resolve;

        tick |= 0;
        timeout = Math.max(0, timeout | 0);
        name = `cTP.${name || makeUUID().slice(-17)}.${++mIncID}`;

        if (debug) {
            log('Creating timeout promise...', tick, timeout);
        }
        let threshold = performance.now();

        assert(typeof validateFunction === 'function', tag('Function expected'));
        assert(tick > 100, tag(`at least 100ms are expected, ${tick} provided.`));
        assert(timeout > tick && timeout < 6e5, tag(`Invalid timeout value (${timeout})`));
        validateFunction = tryCatch(validateFunction);

        Promise.resolve(waitForPromise)
            .then(async() => {
                let duration = 0;
                const int = tick / 1e3;

                if (debug) {
                    threshold -= performance.now();

                    if (threshold > 10) {
                        log('Begin took %sms%s', threshold, waitForPromise ? '' : ', tab throttled(?!)');
                    }

                    // @todo add threshold to duration if !waitForPromise (?)
                }

                if (validateFunction()) {
                    if (debug) {
                        log('The validator resolved immediately...', waitForPromise);
                    }
                    state = 'placebo';
                    return -1;
                }

                if (debug) {
                    threshold = performance.now();
                }

                while (running) {
                    await sleep(int);

                    if (debug) {
                        const now = performance.now();
                        const diff = now - threshold;

                        if (diff > tick * 1.8) {
                            log('Tab throttled? did sleep for %sms while %sms were expected...', diff, tick);
                        }
                        threshold = now;
                    }

                    duration += tick;
                    running = !validateFunction();

                    if (duration > timeout) {
                        break;
                    }
                }

                if (running) {
                    if (debug) {
                        log(`Timed out after waiting ${duration}ms`, promise);
                    }

                    state = 'expired';
                    throw new Error(`${name} timed out.`);
                }

                if (state === 'aborted') {
                    // xxx: backward compatibility, but rather bogus leaving a dangling promise there..
                    resolve = nop;
                    Object.defineProperty(promise, 'aborted', {value: Date.now()});
                    Object.freeze(promise);
                    return;
                }

                if (debug) {
                    log(`Resolved timeout promise after waiting ${duration}ms...`, promise);
                }
                state = 'fulfilled';
            })
            .then((a0) => resolve(a0))
            .catch(reject);

    }).finally(() => {
        running = false;

        if (debug) {
            createTimeoutPromise.instances.delete(promise);
        }
    });

    if (debug) {
        promise.tick = tick;
        promise.timeout = timeout;
        createTimeoutPromise.instances.add(promise);
    }

    return Object.defineProperties(promise, {
        state: {
            get() {
                return state;
            }
        },

        verify: {
            value: queueMicrotask.bind(null, () => {
                if (validateFunction()) {
                    if (debug) {
                        log("Resolving timeout promise", state, promise);
                    }
                    promise.resolve(0);
                }
            })
        },

        stopTimers: {
            value: () => {
                running = false;
                state = 'aborted';
            }
        },

        name: {
            value: name
        },

        resolve: {
            value: _res
        },

        reject: {
            value: _rej
        }
    });
}

/** @property createTimeoutPromise.instances */
lazy(createTimeoutPromise, 'instances', () => {
    'use strict';
    return new WeakSet();
});

/**
 * Assert a given test condition.
 *
 * Throws an AssertionFailed exception with a given message, in case the condition is false.
 * The message is assembled by the args following 'test', similar to console.log()
 *
 * @param test
 *     Test statement.
 * @param args
 */
// eslint-disable-next-line strict
function assert(test, ...args) {
    if (!test) {
        if (d) {
            console.error('assertion failed', ...args);
        }
        MegaLogger.rootLogger.assert(test, ...args);
    }
}

/**
 * Assert that a user handle is potentially valid (e. g. not an email address).
 *
 * @param userHandle {string}
 *     The user handle to check.
 * @throws
 *     Throws an exception on something that does not seem to be a user handle.
 */
var assertUserHandle = function(userHandle) {
    try {
        if (typeof userHandle !== 'string'
                || base64urldecode(userHandle).length !== 8) {

            throw 1;
        }
    }
    catch (ex) {
        assert(false, 'This seems not to be a user handle: ' + userHandle);
    }
};


/**
 * Pad/prepend `val` with "0" (zeros) until the length is === `length`
 *
 * @param val {String} value to add "0" to
 * @param len {Number} expected length
 * @returns {String}
 */
function addZeroIfLenLessThen(val, len) {
    if (val.toString().length < len) {
        for (var i = val.toString().length; i < len; i++) {
            val = "0" + val;
        }
    }
    return val;
}

function ASSERT(what, msg, udata) {
    'use strict';

    if (!what) {
        reportError(new Error(`failed assertion, ${msg}`));
    }
    return !!what;
}

// log failures through jscrashes system
function srvlog(msg, data, silent) {
    'use strict';

    reportError(msg instanceof Error ? msg : new Error(msg));
}

// log failures through event id 99666
function srvlog2(type /*, ...*/) {
    if (d || window.exTimeLeft) {
        var args    = toArray.apply(null, arguments);
        var version = buildVersion.website;

        if (is_extension) {
            if (is_firefox_web_ext) {
                version = buildVersion.firefox;
            }
            else if (mega.chrome) {
                version = buildVersion.chrome;
            }
            else {
                version = buildVersion.commit && buildVersion.commit.substr(0, 8) || '?';
            }
        }
        args.unshift((is_extension ? 'e' : 'w') + (version || '-'));

        eventlog(99666, JSON.stringify(args));
    }
}

/**
 * Original: http://stackoverflow.com/questions/7317299/regex-matching-list-of-emoticons-of-various-type
 *
 * @param text
 * @returns {XML|string|void}
 * @constructor
 */
function RegExpEscape(text) {
    'use strict';
    return text.replace(/[\s#$()*+,.?[\\\]^{|}-]/g, "\\$&");
}


/**
 * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
 *
 * @author <a href="mailto:gary.court.gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby.gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 *
 * @param {string} key ASCII only
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash
 */
function MurmurHash3(key, seed) {
    var remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;

    remainder = key.length & 3; // key.length % 4
    bytes = key.length - remainder;
    h1 = seed || 0xe6546b64;
    c1 = 0xcc9e2d51;
    c2 = 0x1b873593;
    i = 0;

    while (i < bytes) {
        k1 =
            ((key.charCodeAt(i) & 0xff)) |
            ((key.charCodeAt(++i) & 0xff) << 8) |
            ((key.charCodeAt(++i) & 0xff) << 16) |
            ((key.charCodeAt(++i) & 0xff) << 24);
        ++i;

        k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

        h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
        h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
        h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
    }

    k1 = 0;

    switch (remainder) {
        case 3:
            k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
        case 2:
            k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
        case 1:
            k1 ^= (key.charCodeAt(i) & 0xff);

            k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
            k1 = (k1 << 15) | (k1 >>> 17);
            k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
            h1 ^= k1;
    }

    h1 ^= key.length;

    h1 ^= h1 >>> 16;
    h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 13;
    h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
    h1 ^= h1 >>> 16;

    return h1 >>> 0;
}

/**
 * Ask the user for a decryption key
 * @param {String} ph   The node's handle
 * @param {Boolean} [fl] Whether is a folderlink
 * @param {Boolean} [keyr] If a wrong key was used
 * @param {String} [selector] DOM node selector
 * @return {Promise}
 */
async function mKeyDialog(ph, fl, keyr, selector) {
    "use strict";

    const {promise} = mega;
    var $dialog = $('.mega-dialog.dlkey-dialog');
    var $button = $('.fm-dialog-new-folder-button', $dialog);
    var $input = $('input', $dialog);

    if (keyr) {
        const dialog = $('.mega-dialog.dlkey-dialog');

        $('.fm-dialog-new-folder-input', dialog).addClass('contains-error');
        $('.dlkey-err', dialog).removeClass('hidden');
        $('.instruction-message', dialog)
            .text((pfcol) ? l.album_decr_key_descr : l[9048]);

        if (pfcol) {
            $('.dlkey-err', $dialog)[0].style.textAlign = 'center';
            $input[0].placeholder = '';
            if (document.body.classList.contains('theme-dark')) {
                $('.fm-dialog-new-folder-input', $dialog)[0].style.background = "black";
            }
        }
    }
    else if (pfcol) {
        $('.mega-dialog.dlkey-dialog .instruction-message')
            .safeHTML(l.album_decr_key_descr);
        $input[0].placeholder = '';
        if (document.body.classList.contains('theme-dark')) {
            $('.fm-dialog-new-folder-input', $dialog)[0].style.background = "black";
        }
    }
    else {
        $('.mega-dialog.dlkey-dialog input').val('');
        $('.mega-dialog.dlkey-dialog .instruction-message')
            .safeHTML(l[7945] + '<br/>' + l[7972]);
    }

    if (mega.gallery.albums) {
        mega.gallery.albums.disposeAll();
        mega.gallery.albumsRendered = false;
    }

    $('.new-download-buttons').addClass('hidden');
    $('.new-download-file-title').text(l[1199]);
    $('.new-download-file-icon').addClass(fileIcon({
        name: 'unknown.unknown'
    }));

    $button.addClass('disabled').removeClass('active');

    M.safeShowDialog('dlkey-dialog', $dialog);

    const processKeyboardEvent = (evt) => {
        if (evt.key === 'Escape') {
            // Adhering to overlay's behaviour here, blocking the esc click
            evt.preventDefault();
            evt.stopPropagation();
        }
    };

    $('.js-close', $dialog).rebind('click.keydlg', () => {
        loadSubPage('start');
    });

    document.addEventListener('keydown', processKeyboardEvent);

    $dialog.rebind('dialog-closed.dlkey', () => {
        document.removeEventListener('keydown', processKeyboardEvent);
    });

    $input.rebind('input keypress', function(e) {
        var length = String($(this).val() || '').length;

        if (length) {
            $button.removeClass('disabled').addClass('active');

            if (e.keyCode === 13) {
                $button.click();
            }
        }
        else {
            $button.removeClass('active').addClass('disabled');
        }
    });

    $button.rebind('click.keydlg', function() {
        if ($(this).hasClass('active')) {
            // Trim the input from the user for whitespace, newlines etc on either end
            var key = $.trim($input.val());

            if (key) {

                // Remove the !,# from the key which is exported from the export dialog
                key = key.replace('!', '').replace('#', '');

                var newHash = (fl ? '/#F!' : '/#!') + ph + '!' + key;

                var currLink = getSitePath();

                if (isPublickLinkV2(currLink)) {
                    newHash = `${(pfcol ? '/collection/' : fl ? '/folder/' : '/file/') + ph}#${key}${selector || ''}`;
                }

                if (getSitePath() !== newHash) {
                    promise.resolve(key);

                    fm_hideoverlay();
                    $dialog.addClass('hidden');
                    loadSubPage(newHash);

                }
            }
            else {
                promise.reject();
            }
        }
    });

    return promise;
}

function str_mtrunc(str, len) {
    if (!len) {
        len = 35;
    }
    if (len > (str || '').length) {
        return str;
    }
    var p1 = Math.ceil(0.60 * len),
        p2 = Math.ceil(0.30 * len);
    return str.substr(0, p1) + '\u2026' + str.substr(-p2);
}

function getTransfersPercent() {
    var dl_r = 0;
    var dl_t = 0;
    var ul_r = 0;
    var ul_t = 0;
    var tp = $.transferprogress || {};
    var zips = {};
    var i;

    for (i = dl_queue.length; i--;) {
        var q = dl_queue[i];
        var td = q && tp[q.zipid ? 'zip_' + q.zipid : 'dl_' + q.id];

        if (td) {
            dl_r += td[0];
            dl_t += td[1];
            if (!q.zipid || !zips[q.zipid]) {
                if (q.zipid) {
                    zips[q.zipid] = 1;
                }
            }
        }
        else {
            dl_t += q && q.size || 0;
        }
    }
    for (i = ul_queue.length; i--;) {
        var tu = tp['ul_' + ul_queue[i].id];

        if (tu) {
            ul_r += tu[0];
            ul_t += tu[1];
        }
        else {
            ul_t += ul_queue[i].size || 0;
        }
    }
    if (dl_t) {
        dl_t += tp['dlc'] || 0;
        dl_r += tp['dlc'] || 0;
    }
    if (ul_t) {
        ul_t += tp['ulc'] || 0;
        ul_r += tp['ulc'] || 0;
    }

    return {
        ul_total: ul_t,
        ul_done: ul_r,
        dl_total: dl_t,
        dl_done: dl_r
    };
}

function percent_megatitle() {
    'use strict';
    var t;
    var transferStatus = getTransfersPercent();

    var x_ul = Math.floor(transferStatus.ul_done / transferStatus.ul_total * 100) || 0;
    var x_dl = Math.floor(transferStatus.dl_done / transferStatus.dl_total * 100) || 0;

    if (transferStatus.dl_total && transferStatus.ul_total) {
        t = ' \u2193 ' + x_dl + '% \u2191 ' + x_ul + '%';
    }
    else if (transferStatus.dl_total) {
        t = ' \u2193 ' + x_dl + '%';
    }
    else if (transferStatus.ul_total) {
        t = ' \u2191 ' + x_ul + '%';
    }
    else {
        t = '';
        $.transferprogress = Object.create(null);
    }
    megatitle(t);

    var d_deg = 360 * x_dl / 100;
    var u_deg = 360 * x_ul / 100;
    var $dl_rchart = $('.transfers .download .nw-fm-chart0.right-c p');
    var $dl_lchart = $('.transfers .download .nw-fm-chart0.left-c p');
    var $ul_rchart = $('.transfers .upload .nw-fm-chart0.right-c p');
    var $ul_lchart = $('.transfers .upload .nw-fm-chart0.left-c p');

    if (d_deg <= 180) {
        $dl_rchart.css('transform', 'rotate(' + d_deg + 'deg)');
        $dl_lchart.css('transform', 'rotate(0deg)');
    }
    else {
        $dl_rchart.css('transform', 'rotate(180deg)');
        $dl_lchart.css('transform', 'rotate(' + (d_deg - 180) + 'deg)');
    }
    if (u_deg <= 180) {
        $ul_rchart.css('transform', 'rotate(' + u_deg + 'deg)');
        $ul_lchart.css('transform', 'rotate(0deg)');
    }
    else {
        $ul_rchart.css('transform', 'rotate(180deg)');
        $ul_lchart.css('transform', 'rotate(' + (u_deg - 180) + 'deg)');
    }
}

function moveCursortoToEnd(el) {

    'use strict';

    const $el = $(el);
    const $scrollBlock = $el.parent('.ps');

    if (typeof el.selectionStart === "number") {
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
    }
    else if (typeof el.createTextRange !== "undefined") {
        el.focus();
        var range = el.createTextRange();
        range.collapse(false);
        range.select();
    }
    $el.trigger('focus');

    if ($scrollBlock.length) {
        $scrollBlock.scrollTop($el.height());
    }
}

/**
 *  @deprecated
 *  @todo move to e.g. megaChat.sendApiRequest()
 */
function asyncApiReq(payload, options) {
    'use strict';
    let cache = -15;
    switch (payload.a) {
        case 'mcr':
        case 'mcph':
            cache = null;
            break;
    }
    return api.req(payload, {channel: 6, cache, ...options}).then(({result}) => result);
}

// Returns pixels position of element relative to document (top left corner) OR to the parent (IF the parent and the
// target element are both with position: absolute)
function getHtmlElemPos(elem, n) {
    var xPos = 0;
    var yPos = 0;
    var sl, st, cl, ct;
    var pNode;
    while (elem) {
        pNode = elem.parentNode;
        sl = 0;
        st = 0;
        cl = 0;
        ct = 0;
        if (pNode && pNode.tagName && !/html|body/i.test(pNode.tagName)) {
            if (typeof n === 'undefined') // count this in, except for overflow huge menu
            {
                sl = elem.scrollLeft;
                st = elem.scrollTop;
            }
            cl = elem.clientLeft;
            ct = elem.clientTop;
            xPos += (elem.offsetLeft - sl + cl);
            yPos += (elem.offsetTop - st - ct);
        }
        elem = elem.offsetParent;
    }
    return {
        x: xPos,
        y: yPos
    };
}

/**
 * Gets the current base URL of the page (protocol + hostname) e.g. If on beta.mega.nz it will return https://beta.mega.nz.
 * If on the browser extension it will return the default https://mega.nz. If on localhost it will return https://mega.nz.
 * This can be used to create external links, for example file downloads https://mega.nz/#!qRN33YbK!o4Z76qDqPbiK2G0I...
 * @returns {String}
 */
function getBaseUrl() {
    return 'https://' + (((location.protocol === 'https:') && location.host) || 'mega.nz');
}

/**
 * Like getBaseUrl(), but suitable for extensions to point to internal resources.
 * This should be the same than `bootstaticpath + urlrootfile` except that may differ
 * from a public entry point (Such as the Firefox extension and its mega: protocol)
 * @returns {string}
 */
function getAppBaseUrl() {
    var l = location;
    var base = (l.origin !== 'null' && l.origin || (l.protocol + '//' + l.hostname));
    if (is_extension) {
        base += l.pathname;
    }
    return base;
}

if (d && location.hostname === 'localhost') {
    // eslint-disable-next-line no-func-assign
    getBaseUrl = function() {
        'use strict';
        return location.origin;
    };
}

/**
 * http://stackoverflow.com/a/16344621/402133
 *
 * @param ms
 * @returns {string}
 */
function ms2Time(ms) {
    var secs = ms / 1000;
    ms = Math.floor(ms % 1000);
    var minutes = secs / 60;
    secs = Math.floor(secs % 60);
    var hours = minutes / 60;
    minutes = Math.floor(minutes % 60);
    hours = Math.floor(hours % 24);
    return hours + ":" + minutes + ":" + secs;
}

function secToDuration(s, sep) {
    var dur = ms2Time(s * 1000).split(":");
    var durStr = "";
    sep = sep || ", ";
    if (!secToDuration.regExp) { //regexp compile cache
        secToDuration.regExp = {};
    }

    if (!secToDuration.regExp[sep]) {
        secToDuration.regExp[sep] = new RegExp("" + sep + "$");
    }

    for (var i = 0; i < dur.length; i++) {
        var v = dur[i];
        if (v === "0") {
            if (durStr.length !== 0 && i !== 0) {
                continue;
            }
            else if (i < 2) {
                continue;
            }
        }

        var transString = false;
        if (i === 0) {
            // hour
            transString = mega.icu.format(l.hour_count, parseInt(v));
        }
        else if (i === 1) {
            // minute
            transString = mega.icu.format(l.minute_count, parseInt(v));
        }
        else if (i === 2) {
            // second
            transString = mega.icu.format(l.second_count, parseInt(v));
        }
        else {
            throw new Error("this should never happen.");
        }

        durStr += transString + sep;
    }

    return durStr.replace(secToDuration.regExp[sep], "");
}

function generateAnonymousReport() {
    var $promise = new MegaPromise();
    var report = {};
    report.ua = navigator.userAgent;
    report.ut = u_type;
    report.pbm = !!window.Incognito;
    report.io = window.dlMethod && dlMethod.name;
    report.sb = +('' + $('script[src*="secureboot"]').attr('src')).split('=').pop();
    report.tp = $.transferprogress;
    if (!megaChatIsReady) {
        report.karereState = '#disabled#';
    }
    else {
        report.numOpenedChats = Object.keys(megaChat.chats).length;
        report.haveRtc = typeof SfuClient !== 'undefined' && SfuClient.platformHasSupport();
    }

    var chatStates = {};
    var userAnonMap = {};
    var userAnonIdx = 0;
    var roomUniqueId = 0;
    var roomUniqueIdMap = {};

    if (megaChatIsReady && megaChat.chats) {
        megaChat.chats.forEach(function (v, k) {
            var participants = v.getParticipants();

            participants.forEach(function (v, k) {
                var cc = M.u[v];
                if (cc && cc.u && !userAnonMap[cc.u]) {
                    userAnonMap[cc.u] = {
                        anonId: userAnonIdx++ + rand(1000),
                        pres: megaChat.getPresence(v)
                    };
                }
                participants[k] = cc && cc.u ? userAnonMap[cc.u] : v;
            });

            var r = {
                'roomState': v.getStateAsText(),
                'roomParticipants': participants
            };

            chatStates[roomUniqueId] = r;
            roomUniqueIdMap[k] = roomUniqueId;
            roomUniqueId++;
        });

        report.chatRoomState = chatStates;
    };

    var apireqHaveBackOffs = {};
    // @todo
    // apixs.forEach(function(v, k) {
    //     if (v.backoff > 0) {
    //         apireqHaveBackOffs[k] = v.backoff;
    //     }
    // });

    if (Object.keys(apireqHaveBackOffs).length > 0) {
        report.apireqbackoffs = apireqHaveBackOffs;
    }

    report.hadLoadedRsaKeys = u_authring.RSA && Object.keys(u_authring.RSA).length > 0;
    report.hadLoadedEd25519Keys = u_authring.Ed25519 && Object.keys(u_authring.Ed25519).length > 0;
    report.totalDomElements = $("*").length;
    report.totalScriptElements = $("script").length;

    report.totalD = Object.keys(M.d).length;
    report.totalU = M.u.size();
    report.totalC = Object.keys(M.c).length;
    report.totalIpc = Object.keys(M.ipc).length;
    report.totalOpc = Object.keys(M.opc).length;
    report.totalPs = Object.keys(M.ps).length;
    report.l = lang;
    report.scrnSize = window.screen.availWidth + "x" + window.screen.availHeight;

    if (typeof window.devicePixelRatio !== 'undefined') {
        report.pixRatio = window.devicePixelRatio;
    }

    try {
        report.perfTiming = JSON.parse(JSON.stringify(window.performance.timing));
        report.memUsed = window.performance.memory.usedJSHeapSize;
        report.memTotal = window.performance.memory.totalJSHeapSize;
        report.memLim = window.performance.memory.jsHeapSizeLimit;
    }
    catch (e) {}

    report.jslC = jslcomplete;
    report.jslI = jsli;
    report.host = window.location.host;

    var promises = [];

    report.version = null; // TODO: how can we find this?

    MegaPromise.allDone(promises)
        .then(function() {
            $promise.resolve(report);
        })
        .catch(function() {
            $promise.resolve(report)
        });

    return $promise;
}

function constStateToText(enumMap, state) {
    "use strict";
    for (var k in enumMap) {
        if (enumMap[k] === state) {
            return k;
        }
    }
    return "(not found: " + state + ")";
};

/**
 * Helper function that will do some assert()s to guarantee that the new state is correct/allowed
 *
 * @param currentState
 * @param newState
 * @param allowedStatesMap
 * @param enumMap
 * @throws AssertionError
 */
function assertStateChange(currentState, newState, allowedStatesMap, enumMap) {
    "use strict";

    assert(typeof newState !== "undefined", "assertStateChange: newState is 'undefined'");
    var checksAvailable = allowedStatesMap[currentState];
    var allowed = false;
    if (checksAvailable) {
        checksAvailable.forEach(function(allowedState) {
            if (allowedState === newState) {
                allowed = true;
                return false; // break;
            }
        });
    }
    if (!allowed) {
        assert(
            false,
            'State change from: ' + constStateToText(enumMap, currentState) + ' to ' +
            constStateToText(enumMap, newState) + ' is not in the allowed state transitions map.'
        );
    }
}

/**
 * Perform a normal logout
 *
 * @param {Function} aCallback optional
 * @param {Bool} force optional
 */
function mLogout(aCallback, force) {
    "use strict";

    // If user are trying logged out from paid ephemral session, warn user that they cannot get back the paid session.
    if (isNonActivatedAccount()) {
        msgDialog('warninga:!^' + l[78] + '!' + l[79], 'warning', l[23443], l[23444], function(response) {
            if (!response) {
                M.logout();
            }
        });

        return;
    }

    Promise.resolve(u_type === 0 && Object.keys(M.c[M.RootID] || {}).length)
        .then((cnt) => {
            return cnt < 1 || asyncMsgDialog('confirmation', l[1057], l[1058], l[1059]);
        })
        .then((proceed) => {
            if (proceed && mega.ui.passwordReminderDialog) {
                if (window.waitsc) {
                    waitsc.stop();
                }
                return Promise.resolve(mega.ui.passwordReminderDialog.recheckLogoutDialog()).then(() => true);
            }
            return proceed;
        })
        .then((logout) => {
            return logout && M.logout();
        })
        .catch((ex) => {
            if (u_type > 2 && window.waitsc) {
                waitsc();
            }
            if (ex) {
                dump(ex);
            }
        });
}

// Initialize Rubbish-Bin Cleaning Scheduler
mBroadcaster.addListener('crossTab:master', function _setup() {
    var RUBSCHED_WAITPROC =  20 * 1000;
    var RUBSCHED_IDLETIME =   4 * 1000;
    var timer, updId;

    mBroadcaster.once('crossTab:leave', _exit);

    // The fm must be initialized before proceeding
    if (!folderlink && fminitialized) {
        _fmready();
    }
    else {
        mBroadcaster.addListener('fm:initialized', _fmready);
    }

    function _fmready() {
        if (!folderlink) {
            _init();
            return 0xdead;
        }
    }

    function _update(enabled) {
        _exit();
        if (enabled) {
            _init();
        }
    }

    function _exit() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        if (updId) {
            mBroadcaster.removeListener(updId);
            updId = null;
        }
    }

    function _init() {
        // if (d) console.log('Initializing Rubbish-Bin Cleaning Scheduler');

        // updId = mBroadcaster.addListener('fmconfig:rubsched', _update);
        if (fmconfig.rubsched) {
            timer = setInterval(function() {
                // Do nothing unless the user has been idle
                if (Date.now() - lastactive < RUBSCHED_IDLETIME) {
                    return;
                }
                _exit();

                dbfetch.coll([M.RubbishID]).finally(_proc);

            }, RUBSCHED_WAITPROC);
        }
    }

    function _proc() {

        // Mode 14 - Remove files older than X days
        // Mode 15 - Keep the Rubbish-Bin under X GB
        var mode = String(fmconfig.rubsched).split(':');
        var xval = mode[1];
        mode = +mode[0];

        var handler = _rubSchedHandler[mode];
        if (!handler) {
            throw new Error('Invalid RubSchedHandler', mode);
        }

        if (d) {
            console.log('Running Rubbish Bin Cleaning Scheduler', mode, xval);
            console.time('rubsched');
        }

        // Watch how long this is running
        var startTime = Date.now();

        // Get nodes in the Rubbish-bin
        var nodes = Object.keys(M.c[M.RubbishID] || {});
        var rubnodes = [];

        for (var i = nodes.length; i--; ) {
            var node = M.d[nodes[i]];
            if (!node) {
                console.error('Invalid node', nodes[i]);
                continue;
            }
            rubnodes = rubnodes.concat(M.getNodesSync(node.h, true));
        }

        rubnodes.sort(handler.sort);
        var rNodes = handler.log(rubnodes);

        // if (d) console.log('rubnodes', rubnodes, rNodes);

        var handles = [];
        if (handler.purge(xval)) {
            for (var i in rubnodes) {
                var node = M.d[rubnodes[i]];

                if (handler.remove(node, xval)) {
                    handles.push(node.h);

                    if (handler.ready(node, xval)) {
                        break;
                    }

                    // Abort if this has been running for too long..
                    if ((Date.now() - startTime) > 7000) {
                        break;
                    }
                }
            }

            // if (d) console.log('RubSched-remove', handles);

            if (handles.length) {
                var inRub = (M.RubbishID === M.currentrootid);

                handles.map(function(handle) {
                    // M.delNode(handle, true);    // must not update DB pre-API
                    api_req({a: 'd', n: handle/*, i: requesti*/});

                    if (inRub) {
                        $('.grid-table.fm#' + handle).remove();
                        $('.data-block-view#' + handle).remove();
                    }
                });

                if (inRub) {
                    M.addViewUI();
                }
            }
        }

        if (d) {
            console.timeEnd('rubsched');
        }

        // Once we ran for the first time, set up a long running scheduler
        RUBSCHED_WAITPROC = 4 * 3600 * 1e3;
        _init();
    }

    /**
     * Scheduler Handlers
     *   Sort:    Sort nodes specifically for the handler purpose
     *   Log:     Keep a record of nodes if required and return a debugable array
     *   Purge:   Check whether the Rubbish-Bin should be cleared
     *   Remove:  Return true if the node is suitable to get removed
     *   Ready:   Once a node is removed, check if the criteria has been meet
     */
    var _rubSchedHandler = {
        // Remove files older than X days
        "14": {
            sort: function(n1, n2) {
                return M.d[n1].ts > M.d[n2].ts;
            },
            log: function(nodes) {
                return d && nodes.map(function(node) {
                    return M.d[node].name + '~' + (new Date(M.d[node].ts*1000)).toISOString();
                });
            },
            purge: function(limit) {
                return true;
            },
            remove: function(node, limit) {
                limit = (Date.now() / 1e3) - (limit * 86400);
                return node.ts < limit;
            },
            ready: function(node, limit) {
                return false;
            }
        },
        // Keep the Rubbish-Bin under X GB
        "15": {
            sort: function(n1, n2) {
                n1 = M.d[n1].s || 0;
                n2 = M.d[n2].s || 0;
                return n1 < n2;
            },
            log: function(nodes) {
                var pnodes, size = 0;

                pnodes = nodes.map(function(node) {
                    size += (M.d[node].s || 0);
                    return M.d[node].name + '~' + bytesToSize(M.d[node].s);
                });

                this._size = size;

                return pnodes;
            },
            purge: function(limit) {
                return this._size > (limit * 1024 * 1024 * 1024);
            },
            remove: function(node, limit) {
                return true;
            },
            ready: function(node, limit) {
                this._size -= (node.s || 0);
                return this._size < (limit * 1024 * 1024 * 1024);
            }
        }
    };
});

/** prevent tabnabbing attacks */
mBroadcaster.once('startMega', function() {
    return;

    if (!(window.chrome || window.safari || window.opr)) {
        return;
    }

    // Check whether is safe to open a link through the native window.open
    var isSafeTarget = function(link) {
        link = String(link);

        var allowed = [
            getBaseUrl(),
            getAppBaseUrl()
        ];

        var rv = allowed.some(function(v) {
            return link.indexOf(v) === 0;
        });

        if (d) {
            console.log('isSafeTarget', link, rv);
        }

        return rv || (location.hash.indexOf('fm/chat') === -1);
    };

    var open = window.open;
    delete window.open;

    // Replace the native window.open which will open unsafe links through a hidden iframe
    Object.defineProperty(window, 'open', {
        writable: false,
        enumerable: true,
        value: function(url) {
            var link = document.createElement('a');
            link.href = url;

            if (isSafeTarget(link.href)) {
                return open.apply(window, arguments);
            }

            var iframe = mCreateElement('iframe', {type: 'content', style: 'display:none'}, 'body');
            var data = 'var win=window.open("' + escapeHTML(link) + '");if(win)win.opener = null;';
            var doc = iframe.contentDocument || iframe.contentWindow.document;
            var script = doc.createElement('script');
            script.type = 'text/javascript';
            script.src = mObjectURL([data], script.type);
            script.onload = SoonFc(function() {
                myURL.revokeObjectURL(script.src);
                document.body.removeChild(iframe);
            });
            doc.body.appendChild(script);
        }
    });

    // Catch clicks on links and forward them to window.open
    document.documentElement.addEventListener('click', function(ev) {
        var node = Object(ev.target);

        if (node.nodeName === 'A' && node.href
                && String(node.getAttribute('target')).toLowerCase() === '_blank'
                && !isSafeTarget(node.href)) {

            ev.stopPropagation();
            ev.preventDefault();

            window.open(node.href);
        }
    }, true);
});

/**
 * Simple alias that will return a random number in the range of: a < b
 *
 * @param a {Number} min
 * @param b {Number} max
 * @returns {*}
 */
function rand_range(a, b) {
    return Math.random() * (b - a) + a;
}

/**
 * Invoke the password manager in Chrome.
 *
 * There are some requirements for this function work propertly:
 *
 *  1. The username/password needs to be in a <form/>
 *  2. The form needs to be filled and visible when this function is called
 *  3. After this function is called, within the next second the form needs to be gone
 *
 * As an example take a look at the `tooltiplogin.init()` function in `top-tooltip-login.js`.
 *
 * @param {String|Object} form jQuery selector of the form
 * @return {Boolean} Returns true if the password manager can be called.
 *
 */
function passwordManager(form) {

    'use strict';

    var $form = $(form);

    if ($form.length === 0) {
        return false;
    }

    if (typeof history !== "object") {
        return false;
    }
    $form.rebind('submit', function() {
        setTimeout(function() {
            var path = getSitePath();
            history.replaceState({ success: true }, '', "index.html#" + document.location.hash.substr(1));
            if (hashLogic || isPublicLink(path)) {
                path = path.replace('/', '/#');

                if (is_extension) {
                    path = path.replace('/#', '/' + urlrootfile + '#');
                }
            }
            history.replaceState({ success: true, subpage: getCleanSitePath(path) }, '', path);
            $form.find('input').val('');
        }, 1000);
        return false;
    });

    // For trigger FF Password Manager, submit the form by making submit button and click it.
    var submitButton = document.createElement("input");
    submitButton.setAttribute("type", "submit");
    submitButton.style.opacity = '0';

    $form[0].appendChild(submitButton);

    submitButton.click();

    return true;
}
passwordManager.knownForms = Object.freeze({
    '#form_login_header': {
        usr: '#login-name',
        pwd: '#login-password'
    },
    '#login_form': {
        usr: '#login-name2',
        pwd: '#login-password2'
    },
    '#register_form': {
        usr: '#register-email',
        pwd: '#register-password'
    }
});
passwordManager.pickFormFields = function(form) {
    var result = null;
    var $form = $(form);

    if ($form.length) {
        if ($form.length !== 1) {
            console.error('Unexpected form selector', form);
        }
        else {
            form = passwordManager.knownForms[form];
            if (form) {
                result = {
                    usr: $form.find(form.usr).val(),
                    pwd: $form.find(form.pwd).val(),

                    selector: {
                        usr: form.usr,
                        pwd: form.pwd
                    }
                };

                if (!(result.usr && result.pwd)) {
                    result = false;
                }
            }
        }
    }

    return result;
};

/**
 * Check if the passed in element (DOMNode) is FULLY visible in the viewport.
 *
 * @param el {DOMNode}
 * @returns {boolean}
 */
function elementInViewport(el) {
    if (!verge.inY(el)) {
        return false;
    }
    if (!verge.inX(el)) {
        return false;
    }

    var rect = verge.rectangle(el);

    return !(rect.left < 0 || rect.right < 0 || rect.bottom < 0 || rect.top < 0);
}

/**
 * Check if the element is within the viewport, not detached and visible.
 * @param {HTMLElement|Element} el DOM node/element.
 * @returns {Boolean} whether it is.
 */
function elementIsVisible(el) {
    'use strict';

    if (!(el && el.parentNode && verge.inViewport(el))) {
        return false;
    }

    if (window.getComputedStyle(el).position !== 'fixed' && !el.offsetParent) {
        return false;
    }

    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

// FIXME: This is a "Dirty Hack" (TM) that needs to be removed as soon as
//        the original problem is found and resolved.
if (typeof sjcl !== 'undefined') {
    // We need to track SJCL exceptions for ticket #2348
    sjcl.exception.invalid = function(message) {
        this.toString = function() {
            return "INVALID: " + this.message;
        };
        this.message = message;
        this.stack = M.getStack();
    };
}

(function($, scope) {
    /**
     * Share related operations.
     *
     * @param opts {Object}
     *
     * @constructor
     */
    var Share = function(opts) {

        var self = this;
        var defaultOptions = {
        };

        self.options = $.extend(true, {}, defaultOptions, opts);    };

    /**
     * isShareExists
     *
     * Checking if there's available shares for selected nodes.
     * @param {Array} nodes Holds array of ids from selected folders/files (nodes).
     * @param {Boolean} fullShare Do we need info about full share.
     * @param {Boolean} pendingShare Do we need info about pending share .
     * @param {Boolean} linkShare Do we need info about link share 'EXP'.
     * @returns {Boolean} result.
     */
    Share.prototype.isShareExist = function(nodes, fullShare, pendingShare, linkShare) {

        var self = this;

        var shares = {}, length;

        for (var i in nodes) {
            if (nodes.hasOwnProperty(i)) {

                // Look for full share
                if (fullShare) {
                    shares = M.d[nodes[i]] && M.d[nodes[i]].shares;

                    // Look for link share
                    if (linkShare) {
                        if (shares && Object.keys(shares).length) {
                            return true;
                        }
                    }
                    else { // Exclude folder/file links,
                        if (shares) {
                            length = self.getFullSharesNumber(shares);
                            if (length) {
                                return true;
                            }
                        }
                    }
                }

                // Look for pending share
                if (pendingShare) {
                    shares = M.ps[nodes[i]];

                    if (shares && Object.keys(shares).length) {
                        return true;
                    }
                }
            }
        }

        return false;
    };

    /**
     * hasExportLink, check if at least one selected item have public link.
     *
     * @param {String|Array} nodes Node id or array of nodes string
     * @returns {Boolean}
     */
    Share.prototype.hasExportLink = function(nodes) {

        if (typeof nodes === 'string') {
            nodes = [nodes];
        }

        // Loop through all selected items
        for (var i in nodes) {
            var node = M.d[nodes[i]];

            if (node && Object(node.shares).EXP) {
                return true;
            }
        }

        return false;
    };

    /**
     * getFullSharesNumber
     *
     * Loops through all shares and return number of full shares excluding
     * ex. full contacts. Why ex. full contact, in the past when client removes
     * full contact from the list, share related to client remains active on
     * owners side. That behaviour is changed/updated on API side, so now after
     * full contact relationship is removed, related shares are also removed.
     *
     * @param {Object} shares
     * @returns {Integer} result Number of shares
     */
    Share.prototype.getFullSharesNumber = function(shares) {

        var result = 0;
        var contactKeys = [];

        if (shares) {
            contactKeys = Object.keys(shares);
            $.each(contactKeys, function(ind, key) {

                // Count only full contacts
                if (M.u[key] && M.u[key].c) {
                    result++;
                }
            });
        }

        return result;
    };

    /**
     * addContactToFolderShare
     *
     * Add verified email addresses to folder shares.
     */
    Share.prototype.addContactToFolderShare = function addContactToFolderShare() {
        let promise;

        // Share button enabled
        if ($.dialog === 'share' && !$('.done-share', '.share-dialog').is('.disabled')) {
            const targets = [];
            const [selectedNode] = $.selected;

            // Is there a new contacts planned for addition to share
            if (Object.keys($.addContactsToShare).length > 0) {

                // Add new planned contact to list
                for (var i in $.addContactsToShare) {
                    const {u: userEmail, r: permissionLevel} = $.addContactsToShare[i];

                    if (userEmail && permissionLevel !== undefined) {
                        targets.push({u: userEmail, r: permissionLevel});
                    }
                }
            }

            // Add new contacts to folder share
            if (targets.length > 0) {
                promise = doShare(selectedNode, targets, true);
            }
        }

        return promise || Promise.resolve();
    };

    Share.prototype.updateNodeShares = function() {

        loadingDialog.show();
        return this.removeContactFromShare()
            .then(() => {
                const promises = [];

                if (Object.keys($.changedPermissions).length > 0) {
                    promises.push(doShare($.selected[0], Object.values($.changedPermissions), true));
                }
                promises.push(this.addContactToFolderShare());

                $('.export-links-warning').addClass('hidden');
                console.assert($.dialog === 'share');
                closeDialog();

                return Promise.all(promises);
            })
            .finally(() => loadingDialog.hide());

    };


    Share.prototype.removeFromPermissionQueue = function(handle) {
        // Remove the permission change belongs to the specific contact since got removed already
        if ($.changedPermissions && $.changedPermissions[handle]) {
            delete $.changedPermissions[handle];
        }
    };

    Share.prototype.removeContactFromShare = async function() {
        const reqs = Object.create(null);
        const shares = $.removedContactsFromShare ? Object.values($.removedContactsFromShare) : [];

        for (let i = shares.length; i--;) {
            const {userEmailOrHandle, selectedNodeHandle} = shares[i];

            if (!reqs[selectedNodeHandle]) {
                reqs[selectedNodeHandle] = {a: 's2', n: selectedNodeHandle, s: [], ha: ''};
            }
            reqs[selectedNodeHandle].s.push({u: userEmailOrHandle, r: ''});
        }

        // Wait for action-packet acknowledge, this is needed so that removing the last user
        // from a share will issue an `okd` flag which removes the associated sharekey that we
        // have to wait for *if* we're going to re-share to a different user next...

        const reject = (err) => {
            const msg = api_strerror(err);

            onIdle(() => msgDialog('warninga', l[135], l[47], err < 0 ? msg : l[23433]));
            throw new Error(`Failed to revoke share, ${msg}`);
        };

        const resolve = ({result: res, pkt}) => {
            for (let i = pkt.length; i--;) {
                const packet = pkt[i];

                if (d) {
                    console.assert(u_sharekeys[packet.n], 'Share-key removed...', packet);
                }

                // Known [u]ser, or [p]ending-contact
                this.removeFromPermissionQueue(packet.u || packet.p);
            }

            if (typeof res !== 'object') {
                res = {r: [parseInt(res) || EACCESS]};
            }

            for (let i = Object(res.r).length; i--;) {
                if (res.r[i] !== 0) {
                    reject(res.r[i]);
                }
            }
        };

        return Promise.all(Object.values(reqs).map((s2) => api.screq(s2).then(resolve)));
    };

    /**
     * Removes any shares (including pending) from the selected node.
     *
     * @returns {Promise} promise to remove contacts from share
     */
    Share.prototype.removeSharesFromSelected = function() {
        'use strict';
        $.removedContactsFromShare = {};
        const nodeHandle = String($.selected[0]);
        let userHandles = M.getNodeShareUsers(nodeHandle, 'EXP');

        if (M.ps[nodeHandle]) {
            const pendingShares = Object(M.ps[nodeHandle]);
            userHandles = [...userHandles, ...Object.keys(pendingShares)];
        }

        for (let i = 0; i < userHandles.length; i++) {
            const userHandle = userHandles[i];
            const userEmailOrHandle = Object(M.opc[userHandle]).m || userHandle;

            $.removedContactsFromShare[userHandle] = {
                'selectedNodeHandle': nodeHandle,
                'userEmailOrHandle': userEmailOrHandle,
                'userHandle': userHandle
            };
        }

        return this.removeContactFromShare();
    };

    // export
    scope.mega.Share = Share;
})(jQuery, window);



(function(scope) {
    /** Utilities for Set operations. */
    scope.setutils = {};

    /**
     * Helper function that will return an intersect Set of two sets given.
     *
     * @private
     * @param {Set} set1
     *     First set to intersect with.
     * @param {Set} set2
     *     Second set to intersect with.
     * @return {Set}
     *     Intersected result set.
     */
    scope.setutils.intersection = function(set1, set2) {

        var result = new Set();
        set1.forEach(function _setIntersectionIterator(item) {
            if (set2.has(item)) {
                result.add(item);
            }
        });

        return result;
    };


    /**
     * Helper function that will return a joined Set of two sets given.
     *
     * @private
     * @param {Set} set1
     *     First set to join with.
     * @param {Set} set2
     *     Second set to join with.
     * @return {Set}
     *     Joined result set.
     */
    scope.setutils.join = function(set1, set2) {

        var result = new Set(set1);
        set2.forEach(function _setJoinIterator(item) {
            result.add(item);
        });

        return result;
    };

    /**
     * Helper function that will return a Set from set1 subtracting set2.
     *
     * @private
     * @param {Set} set1
     *     First set to subtract from.
     * @param {Set} set2
     *     Second set to subtract.
     * @return {Set}
     *     Subtracted result set.
     */
    scope.setutils.subtract = function(set1, set2) {

        var result = new Set(set1);
        set2.forEach(function _setSubtractIterator(item) {
            result.delete(item);
        });

        return result;
    };

    /**
     * Helper function that will compare two Sets for equality.
     *
     * @private
     * @param {Set} set1
     *     First set to compare.
     * @param {Set} set2
     *     Second set to compare.
     * @return {Boolean}
     *     `true` if the sets are equal, `false` otherwise.
     */
    scope.setutils.equal = function(set1, set2) {

        if (set1.size !== set2.size) {
            return false;
        }

        var result = true;
        set1.forEach(function _setEqualityIterator(item) {
            if (!set2.has(item)) {
                result = false;
            }
        });

        return result;
    };
})(window);

/**
 * Transoms the numerical preferences to preferences view object
 * @param {Number} pref     Integer value representing the preferences
 * @returns {Object}        View preferences object
 */
function getFMColPrefs(pref) {
    'use strict';
    if (pref === undefined) {
        return;
    }
    var columnsPreferences = Object.create(null);
    columnsPreferences.fav = pref & 4;
    columnsPreferences.label = pref & 1;
    columnsPreferences.size = pref & 8;
    columnsPreferences.type = pref & 64;
    columnsPreferences.timeAd = pref & 32;
    columnsPreferences.timeMd = pref & 16;
    columnsPreferences.versions = pref & 2;
    columnsPreferences.playtime = pref & 128;
    columnsPreferences.accessCtrl = pref & 256;
    columnsPreferences.fileLoc = pref & 512;

    return columnsPreferences;
}

/**
 * Get the number needed for bitwise operator
 * @param {String} colName      Column name
 * @returns {Number}            Number to be used in bitwise operator
 */
function getNumberColPrefs(colName) {
    'use strict';
    switch (colName) {
        case 'fav': return 4;
        case 'label': return 1;
        case 'size': return 8;
        case 'type': return 64;
        case 'timeAd': return 32;
        case 'timeMd': return 16;
        case 'versions': return 2;
        case 'playtime': return 128;
        case 'accessCtrl': return 256;
        case 'fileLoc': return 512;
        default: return null;
    }
}

function invalidLinkError() {
    'use strict';
    loadingInitDialog.hide();

    loadfm.loaded = false;
    loadfm.loading = false;
    if (!is_mobile) {
        var title = l[8531];
        var message = l[17557];
        msgDialog('warninga', title, message, false, function () {
            // If the user is logged-in, he'll be redirected to the cloud
            loadSubPage('login');
        });
    }
    else {
        // Show file/folder not found overlay
        mobile.notFound.show();
    }
}

/**
 * Classifies the strength of the password (Mainly used on the MegaInputs)
 * ZXCVBN library need to be inited before executing this function.
 * The minimum allowed strength is 8 characters in length and password score of 1 (weak).
 * @param {String} password The user's password (should be trimmed for whitespace beforehand)
 */
function classifyPassword(password) {

    'use strict';

    if (typeof zxcvbn !== 'function') {
        onIdle(() => {
            throw new Error('zxcvbn init fault');
        });
        console.error('zxcvbn is not inited');
        return false;
    }

    // Calculate the password score using the ZXCVBN library and its length
    password = $.trim(password);
    var passwordScore = zxcvbn(password).score;
    var passwordLength = password.length;
    var result = {};

    if (passwordLength === 0) {
        return false;
    }
    else if (passwordLength < security.minPasswordLength) {
        result = {
            string1: l[18700],
            string2: l[18701],                      // Your password needs to be at least 8 characters long
            className: 'good1',                     // Very weak
            statusClass: 'insufficient-strength'
        };
    }
    else if (passwordScore === 4) {
        result = {
            string1: l[1128],
            string2: l[1123],
            className: 'good5',                     // Strong
            statusClass: 'meets-minimum-strength'
        };
    }
    else if (passwordScore === 3) {
        result = {
            string1: l[1127],
            string2: l[1122],
            className: 'good4',                     // Good
            statusClass: 'meets-minimum-strength'
        };
    }
    else if (passwordScore === 2) {
        result = {
            string1: l[1126],
            string2: l[1121],
            className: 'good3',                     // Medium
            statusClass: 'meets-minimum-strength'
        };
    }
    else if (passwordScore === 1) {
        result = {
            string1: l[1125],
            string2: l[1120],
            className: 'good2',                     // Weak
            statusClass: 'meets-minimum-strength'
        };
    }
    else {
        result = {
            string1: l[1124],
            string2: l[1119],
            className: 'good1',                     // Very weak
            statusClass: 'insufficient-strength'
        };
    }

    return result;
}

/**
 * A function to get the last day of the month
 * @param {Date} dateObj        The Date for which to return the last day of the month
 * @returns {Date}              the result date object with the last day of the month
 */
function getLastDayofTheMonth(dateObj) {
    "use strict";
    if (!dateObj) {
        return null;
    }

    var day;
    var month = dateObj.getMonth();
    var year = dateObj.getFullYear();
    if ([0, 2, 4, 6, 7, 9, 11].indexOf(month) >= 0) {
        day = 31;
    }
    else if (month === 1) {
        if (year % 4 !== 0) {
            day = 28;
        }
        else if (year % 100 !== 0) {
            day = 29;
        }
        else if (year % 400 !== 0) {
            day = 28;
        }
        else {
            day = 29;
        }
    }
    else {
        day = 30;
    }
    return new Date(year, month, day);
}

/**
 * Block Chrome Password manager for password field with attribute `autocomplete="new-password"`
 */
function blockChromePasswordManager() {

    "use strict";

    if (window.chrome) {
        var $newPasswordField = $('input[type="password"][autocomplete="new-password"]');
        var switchReadonly = function __switchReadonly(input) {

            input.setAttribute('readonly', true);
            onIdle(function() {
                input.removeAttribute('readonly');
            });
        };

        $newPasswordField.rebind('focus.blockAutofill mousedown.blockAutofill', function() {
            switchReadonly(this);
        });

        // For prevent last chracter deletion pops up password manager
        $newPasswordField.rebind('keydown.blockAutofill', function(e) {

            if ((e.keyCode === 8 &&
                ((this.selectionStart === 1 && this.selectionEnd === 1) ||
                (this.selectionStart === 0 && this.selectionEnd === this.value.length))) ||
                (e.keyCode === 46 &&
                ((this.selectionStart === 0 && this.selectionEnd === 0 && this.value.length === 1) ||
                (this.selectionStart === 0 && this.selectionEnd === this.value.length)))) {
                e.preventDefault();
                this.value = '';
            }
        });
    }
}

/**
 * Attach the download file link handler
 * Use in /desktop and /cmd
 * @param $links
 */
/*exported registerLinuxDownloadButton */
function registerLinuxDownloadButton($links) {
    'use strict';
    $links.rebind('click', function() {
        var $link = $(this);
        if (!$link.hasClass('disabled') && $link.attr('data-link')) {
            window.location = $link.attr('data-link');
        }
        return false;
    });
}
/* eslint-disable complexity */
/**
 * Function that takes users attributes, then prepare content texts of ODQ paywall dialog
 * @param {Object} user_attr        u_attr or {}
 * @param {Object} accountData      M.account, caller must populate then pass
 * @returns {Object}                contains {dialogText, dlgFooterText,fmBannerText}
 */
function odqPaywallDialogTexts(user_attr, accountData) {
    'use strict';

    var totalFiles = (accountData.stats[M.RootID] ? accountData.stats[M.RootID].files : 0) +
        (accountData.stats[M.RubbishID] ? accountData.stats[M.RubbishID].files : 0) +
        (accountData.stats[M.InboxID] ? accountData.stats[M.InboxID].files : 0);

    var dialogText = mega.icu.format(l[23525], totalFiles);
    var dlgFooterText = l[23524];
    var fmBannerText = l[23534];

    if (user_attr.uspw) {
        if (user_attr.uspw.dl) {
            var deadline = new Date(user_attr.uspw.dl * 1000);
            var currDate = new Date();
            var remainDays = Math.floor((deadline - currDate) / 864e5);
            var remainHours = Math.floor((deadline - currDate) / 36e5);

            const sanitiseString = (string) => {
                return escapeHTML(string)
                    .replace(/\[S]/g, '<span>')
                    .replace(/\[\/S]/g, '</span>')
                    .replace(/\[A]/g, '<a href="/pro" class="clickurl">')
                    .replace(/\[\/A]/g, '</a>');
            };
            if (remainDays > 0) {
                dlgFooterText = sanitiseString(mega.icu.format(l.dialog_exceed_storage_quota, remainDays));
                fmBannerText = sanitiseString(mega.icu.format(l.fm_banner_exceed_storage_quota, remainDays));
            }
            else if (remainDays === 0 && remainHours > 0) {
                dlgFooterText = sanitiseString(mega.icu.format(l.dialog_exceed_storage_quota_hours, remainHours));
            }
        }
        if (user_attr.uspw.wts && user_attr.uspw.wts.length) {
            dialogText = mega.icu.format(l[23520], totalFiles);
            if (user_attr.uspw.wts.length === 1) {
                dialogText = mega.icu.format(l[23530], totalFiles);
                dialogText = dialogText.replace('%2', time2date(user_attr.uspw.wts[0], 1));
            }
            if (user_attr.uspw.wts.length === 2) {
                dialogText = dialogText.replace('%2', time2date(user_attr.uspw.wts[0], 1)).replace('%3', '')
                    .replace('%4', time2date(user_attr.uspw.wts[1], 1));
            }
            else if (user_attr.uspw.wts.length === 3) {
                dialogText = dialogText.replace('%2', time2date(user_attr.uspw.wts[0], 1))
                    .replace('%3', time2date(user_attr.uspw.wts[1], 1))
                    .replace('%4', time2date(user_attr.uspw.wts[2], 1));
            }
            else {
                // more than 3
                var datesString = time2date(user_attr.uspw.wts[1], 1);
                for (var k = 2; k < user_attr.uspw.wts.length - 1; k++) {
                    datesString += ', ' + time2date(user_attr.uspw.wts[k], 1);
                }

                dialogText = dialogText.replace('%2', time2date(user_attr.uspw.wts[0], 1))
                    .replace('%3', datesString)
                    .replace('%4', time2date(user_attr.uspw.wts[user_attr.uspw.wts.length - 1], 1));
            }
        }
    }

    var filesText = l[23253]; // 0 files

    dialogText = dialogText.replace('%1', user_attr.email || ' ');
    dialogText = dialogText.replace('%6', bytesToSize(accountData.space_used));

    // In here, it's guaranteed that we have pro.membershipPlans,
    // but we will check for error free logic in case of changes
    var minPlanId = -1;
    var neededPro = 4;
    if (pro.membershipPlans && pro.membershipPlans.length) {
        var spaceUsedGB = accountData.space_used / 1073741824; // = 1024*1024*1024
        var minPlan = 9000000;
        for (var h = 0; h < pro.membershipPlans.length; h++) {
            if (pro.membershipPlans[h][4] === 1 && pro.membershipPlans[h][2] > spaceUsedGB &&
                pro.membershipPlans[h][2] < minPlan) {
                minPlan = pro.membershipPlans[h][2];
                minPlanId = pro.membershipPlans[h][1];
            }
        }
    }
    if (minPlanId === -1) {
        // weirdly, we dont have plans loaded, or no plan matched the storage.
        if (user_attr.p) {
            neededPro = user_attr.p + 1;
            if (neededPro === 3) {
                neededPro = 100;
            }
            else if (neededPro === 5) {
                neededPro = 1;
            }
        }
    }
    else {
        neededPro = minPlanId;
    }

    dialogText = dialogText.replace('%7', pro.getProPlanName(neededPro));

    return {
        dialogText: dialogText,
        dlgFooterText: dlgFooterText,
        fmBannerText: fmBannerText
    };
}


function getTaxName(countryCode) {
    'use strict';
    switch (countryCode) {
        case "AT": return "USt";
        case "BE": return "TVA";
        case "HR": return "PDV";
        case "CZ": return "DPH";
        case "DK": return "moms";
        case "EE": return "km";
        case "FI": return "ALV";
        case "FR": return "TVA";
        case "DE": return "USt";
        case "HU": return "AFA";
        case "IT": return "IVA";
        case "LV": return "PVN";
        case "LT": return "PVM";
        case "LU": return "TVA";
        case "NL": return "BTW";
        case "PL": return "PTU";
        case "PT": return "IVA";
        case "RO": return "TVA";
        case "SK": return "DPH";
        case "SI": return "DDV";
        case "SE": return "MOMS";
        case "AL": return "TVSH";
        case "AD": return "IGI";
        case "AR": return "IVA";
        case "AM": return "AAH";
        case "AU": return "GST";
        case "BO": return "IVA";
        case "BA": return "PDV";
        case "BR": return "ICMS";
        case "CA": return "GST";
        case "CL": return "IVA";
        case "CO": return "IVA";
        case "DO": return "ITBIS";
        case "EC": return "IVA";
        case "SV": return "IVA";
        case "FO": return "MVG";
        case "GT": return "IVA";
        case "IS": return "VSK";
        case "ID": return "PPN";
        case "JE": return "GST";
        case "JO": return "GST";
        case "LB": return "TVA";
        case "LI": return "MWST";
        case "MK": return "DDV";
        case "MY": return "GST";
        case "MV": return "GST";
        case "MX": return "IVA";
        case "MD": return "TVA";
        case "MC": return "TVA";
        case "ME": return "PDV";
        case "MA": return "GST";
        case "NZ": return "GST";
        case "NO": return "MVA";
        case "PK": return "GST";
        case "PA": return "ITBMS";
        case "PY": return "IVA";
        case "PE": return "IGV";
        case "PH": return "RVAT";
        case "RU": return "NDS";
        case "SG": return "GST";
        case "CH": return "MWST";
        case "TN": return "TVA";
        case "TR": return "KDV";
        case "UA": return "PDV";
        case "UY": return "IVA";
        case "UZ": return "QQS";
        case "VN": return "GTGT";
        case "VE": return "IVA";
        case "ES": return "NIF";

        default: return "VAT";
    }
}
/* eslint-enable complexity */

/**
 * Validate entered address is on correct structure, if there is more type of bitcoin structure please update.
 * Reference - https://stackoverflow.com/a/59756959
 * Use in Referral program redemption
 * @param {String} address Bitcoin address
 *
 * @returns {Boolean} result Validity of entered address
 */
function validateBitcoinAddress(address) {

    'use strict';

    return address.match(/(^[13][\1-9A-HJ-NP-Za-km-z]{25,34}$)|(^(bc1)[\dA-HJ-NP-Za-z]{8,87}$)/) === null;
}
