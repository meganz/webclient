var inherits = (function() {
    var createObject = Object.create || function createObject(source) {
        var Host = function() {};
        Host.prototype = source;
        return new Host();
    };

    return function(destination, source) {
        var proto = destination.prototype = createObject(source.prototype);
        proto.constructor = destination;
        proto._super = source.prototype;
    };
})();

makeEnum(['MDBOPEN', 'EXECSC', 'LOADINGCLOUD'], 'MEGAFLAG_', window);

/**
 * Safely parse an HTML fragment, removing any executable
 * JavaScript, and return a document fragment.
 *
 * @param {string} markup The HTML fragment to parse.
 * @param {boolean} forbidStyle If true, disallow <style> nodes and
 *     style attributes in the parsed fragment. Gecko 14+ only.
 * @param {Document} doc The document in which to create the
 *     returned DOM tree.
 * @param {nsIURI} baseURI The base URI relative to which resource
 *     URLs should be processed. Note that this will not work for
 *     XML fragments.
 * @param {boolean} isXML If true, parse the fragment as XML.
 * @returns {DocumentFragment}
 */
function parseHTML(markup, forbidStyle, doc, baseURI, isXML) {
    if (!doc) {
        doc = document;
    }
    if (!markup) {
        console.error('Empty content passed to parseHTML', arguments);
        markup = 'no content';
    }
    if (is_chrome_firefox) {
        try {
            var flags = 0;
            if (!forbidStyle) {
                flags |= mozParserUtils.SanitizerAllowStyle;
            }
            if (!baseURI) {
                var href = getAppBaseUrl();
                if (!parseHTML.baseURIs[href]) {
                    parseHTML.baseURIs[href] =
                        Services.io.newURI(href, null, null);
                }
                baseURI = parseHTML.baseURIs[href];
            }
            // XXX: parseFragment() removes href attributes with a hash mask
            markup = String(markup).replace(/\shref="[#\/]/g, ' data-fxhref="#');
            return mozParserUtils.parseFragment(markup, flags, Boolean(isXML),
                                                baseURI, doc.documentElement);
        }
        catch (ex) {
            mozError(ex);
        }
    }

    // Either we are not running the Firefox extension or the above parser
    // failed, in such case we try to mimic it using jQuery.parseHTML
    var fragment = doc.createDocumentFragment();

    markup = String(markup).replace(/(?!\<[a-z][^>]+)\son[a-z]+\s*=/gi, ' data-dummy=');
    $.parseHTML(markup, doc)
        .forEach(function(node) {
            fragment.appendChild(node);
        });
    return fragment;
}
parseHTML.baseURIs = {};

/**
 * Handy printf-style parseHTML to apply escapeHTML
 * @param {string} markup The HTML fragment to parse.
 * @param {...*} var_args
 */
function parseHTMLfmt(markup) {
    if (arguments.length > 1) {
        var idx = 1;
        var args = arguments;
        markup = markup.replace(/@@/g, function() {
            return escapeHTML(args[idx++]);
        });
    }
    return parseHTML(markup);
}

/**
 * Handy printf-style parseHTML to apply escapeHTML
 * @param {String} markup The HTML fragment to parse.
 * @param {...*} var_args
 */
function parseHTMLfmt2(markup) {
    if (arguments.length > 1) {
        for (var idx = arguments.length; --idx > 0;) {
            markup = markup.replace(RegExp('%' + idx, 'g'), escapeHTML(arguments[idx]));
        }
    }
    return parseHTML(markup);
}

/**
 * Safely inject an HTML fragment using parseHTML()
 * @param {string} markup The HTML fragment to parse.
 * @param {...*} var_args
 * @see This should be used instead of jQuery.html()
 * @example $(document.body).safeHTML('<script>alert("XSS");</script>It Works!');
 * @todo Safer versions of append, insert, before, after, etc
 */
(function($fn, obj) {
    for (var fn in obj) {
        if (obj.hasOwnProperty(fn)) {
            /* jshint -W083 */
            (function(origFunc, safeFunc) {
                Object.defineProperty($fn, safeFunc, {
                    value: function $afeCall(markup) {
                        var i = 0;
                        var l = this.length;
                        if (markup === '%n') {
                            markup = parseHTMLfmt2.apply(null, toArray.apply(null, arguments).slice(1));
                        }
                        else {
                            markup = parseHTMLfmt.apply(null, arguments);
                        }
                        while (l > i) {
                            $(this[i++])[origFunc](markup.cloneNode(true));
                        }
                        if (is_chrome_firefox) {
                            $('a[data-fxhref]').rebind('click', function() {
                                if (!$(this).attr('href')) {
                                    var target = String($(this).attr('target')).toLowerCase();

                                    if (target === '_blank') {
                                        open(getAppBaseUrl() + $(this).data('fxhref'));
                                    }
                                    else {

                                        loadSubPage($(this).data('fxhref').replace('#', ''));
                                    }
                                }
                            });
                        }
                        return this;
                    }
                });
                safeFunc = undefined;
            })(fn, obj[fn]);
        }
    }
    $fn = obj = undefined;
})($.fn, {
    'html': 'safeHTML',
    'append': 'safeAppend'
});

/**
 * Escape HTML markup
 * @param {string} str The HTML fragment to parse.
 * NB: This should be the same than our legacy `htmlentities`
 *     function, except that it's faster and deals with quotes
 */
function escapeHTML(str) {
    return String(str).replace(/[&"'<>]/g, function(match) {
        return escapeHTML.replacements[match];
    });
}
escapeHTML.replacements = { "&": "&amp;", '"': "&quot;", "'": "&#39;", "<": "&lt;", ">": "&gt;" };

/**
 *  Check if value is contained in a array. If it is return value
 *  otherwise false
 */
function anyOf(arr, value) {
    return $.inArray(value, arr) === -1 ? false : value;
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

function Later(callback) {
    if (typeof callback !== 'function') {
        throw new Error('Invalid function parameter.');
    }

    return setTimeout(function() {
        callback();
    }, 1000);
}

var Soon = is_chrome_firefox ? mozRunAsync : function(callback) {
    if (typeof callback !== 'function') {
        throw new Error('Invalid function parameter.');
    }

    return setTimeout(function() {
        callback();
    }, 20);
};

/**
 *  Delays the execution of a function
 *
 *  Wraps a function to execute at most once
 *  in a 100 ms time period. Useful to wrap
 *  expensive jQuery events (for instance scrolling
 *  events).
 *
 *  All argument and *this* is passed to the callback
 *  after the 100ms (default)
 *
 *  @param {Function} func  Function to wrap
 *  @param {Number}   ms    Timeout
 *  @returns {Function} wrapped function
 */
function SoonFc(func, ms) {
    return function __soonfc() {
        var self = this,
            args = arguments;
        if (func.__sfc) {
            clearTimeout(func.__sfc);
        }
        func.__sfc = setTimeout(function() {
            delete func.__sfc;
            func.apply(self, args);
        }, ms || 122);
    };
}

/**
 * Delay a function execution, like Soon() does except it accept a parameter to
 * identify the delayed function so that consecutive calls to delay the same
 * function will make it just fire once. Actually, this is the same than
 * SoonFc() does, but it'll work with function expressions as well.
 *
 * @param {String}   aProcID   ID to identify the delayed function
 * @param {Function} aFunction The function/callback to invoke
 * @param {Number}   aTimeout  The timeout, in ms, to wait.
 */
function delay(aProcID, aFunction, aTimeout) {

    // Let aProcID be optional...
    if (typeof aProcID === 'function') {
        aTimeout = aFunction;
        aFunction = aProcID;
        aProcID = aFunction.name || MurmurHash3(String(aFunction));
    }

    if (d > 1) {
        console.debug("delay'ing", aProcID, delay.queue[aProcID]);
    }
    delay.cancel(aProcID);

    delay.queue[aProcID] =
        setTimeout(function() {
            if (d > 1) {
                console.debug('dispatching delayed function...', aProcID);
            }
            delete delay.queue[aProcID];
            aFunction();
        }, (aTimeout | 0) || 350);

    return aProcID;
}
delay.queue = {};
delay.has = function(aProcID) {
    return delay.queue.hasOwnProperty(aProcID);
};
delay.cancel = function(aProcID) {
    if (delay.has(aProcID)) {
        clearTimeout(delay.queue[aProcID]);
        return true;
    }
    return false;
};

function jScrollFade(id) {
    if (is_selenium) {
        return;
    }

    $(id + ' .jspTrack').rebind('mouseover', function(e) {
        $(this).find('.jspDrag').addClass('jspActive');
        $(this).closest('.jspContainer').uniqueId();
        jScrollFadeOut($(this).closest('.jspContainer').attr('id'));
    });

    if (!$.jScroll) {
        $.jScroll = {};
    }
    for (var i in $.jScroll) {
        if ($.jScroll[i] === 0) {
            delete $.jScroll[i];
        }
    }
    $(id).rebind('jsp-scroll-y.fade', function(event, scrollPositionY, isAtTop, isAtBottom) {
            $(this).find('.jspDrag').addClass('jspActive');
            $(this).find('.jspContainer').uniqueId();
            var id = $(this).find('.jspContainer').attr('id');
            jScrollFadeOut(id);
        });
}

function jScrollFadeOut(id) {
    if (!$.jScroll[id]) {
        $.jScroll[id] = 0;
    }
    $.jScroll[id]++;
    setTimeout(function(id) {
        $.jScroll[id]--;
        if ($.jScroll[id] === 0) {
            $('#' + id + ' .jspDrag').removeClass('jspActive');
        }
    }, 500, id);
}

function inputfocus(id, defaultvalue, pw) {
    if (pw) {
        $('#' + id)[0].type = 'password';
    }
    if ($('#' + id)[0].value === defaultvalue) {
        $('#' + id)[0].value = '';
    }
}

function inputblur(id, defaultvalue, pw) {
    if ($('#' + id)[0].value === '') {
        $('#' + id)[0].value = defaultvalue;
    }
    if (($('#' + id)[0].value === defaultvalue) && (pw)) {
        $('#' + id)[0].type = 'text';
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

/**
 * Convert all instances of [$nnn] e.g. [$102] to their localized strings
 * @param {String} html The html markup
 * @returns {String}
 */
function translate(html) {

    /**
     * String.replace callback
     * @param {String} match The whole matched string
     * @param {Number} localeNum The locale string number
     * @param {String} namespace The operation, if any
     * @returns {String} The localized string
     */
    var replacer = function(match, localeNum, namespace) {
        if (namespace) {
            match = localeNum + '.' + namespace;

            if (namespace === 'dq') {
                // Replace double quotes to their html entities
                l[match] = String(l[localeNum]).replace(/"/g, '&quot;');
            }
            else if (namespace === 'q') {
                // Escape single quotes
                l[match] = String(l[localeNum]).replace(/'/g, "\\'");
            }
            else if (namespace === 'dqq') {
                // Both of the above
                l[match] = String(l[localeNum]).replace(/"/g, '&quot;');
                l[match] = l[match].replace(/'/g, "\\'");
            }

            return l[match];
        }
        return String(l[localeNum]);
    };

    return String(html).replace(/\[\$(\d+)(?:\.(\w+))?\]/g, replacer);
}

function megatitle(nperc) {
    if (!nperc) {
        nperc = '';
    }
    var a = parseInt($('.notification-num:first').text());
    if (a > 0) {
        a = '(' + a + ') ';
    }
    else {
        a = '';
    }
    if (document.title !== a + 'MEGA' + nperc) {
        document.title = a + 'MEGA' + nperc;
    }
}

function populate_l() {
    if (d) {
        for (var i = 24000 ; i-- ;) {
            l[i] = (l[i] || '(translation-missing)');
        }
    }
    l[0] = 'MEGA ' + new Date().getFullYear();
    if ((lang === 'es') || (lang === 'pt') || (lang === 'sk')) {
        l[0] = 'MEGA';
    }
    l[1] = l[398];
    if (lang === 'en') {
        l[1] = 'Go PRO';
    }

    if (lang == 'en') l[509] = 'The Privacy Company';
    else {
        l[509] = l[509].toLowerCase();
        l[509] = l[509].charAt(0).toUpperCase() + l[509].slice(1);
    }

    l[8634] = l[8634].replace("[S]", "<span class='red'>").replace("[/S]", "</span>");
    l[8762] = l[8762].replace("[S]", "<span class='red'>").replace("[/S]", "</span>");
    l[438] = l[438].replace('[X]', '');
    l['439a'] = l[439];
    l[439] = l[439].replace('[X1]', '').replace('[X2]', '');
    l['466a'] = l[466];
    l[466] = l[466].replace('[X]', '');
    l[543] = l[543].replace('[X]', '');
    l[456] = l[456].replace(':', '');
    l['471a'] = l[471].replace('[X]', 10);
    l['471b'] = l[471].replace('[X]', 100);
    l['471c'] = l[471].replace('[X]', 250);
    l['471d'] = l[471].replace('[X]', 500);
    l['471e'] = l[471].replace('[X]', 1000);
    l['469a'] = l[469].replace('[X]', 10);
    l['469b'] = l[469].replace('[X]', 100);
    l['469c'] = l[469].replace('[X]', 250);
    l['472a'] = l[472].replace('[X]', 10);
    l['472b'] = l[472].replace('[X]', 100);
    l['472c'] = l[472].replace('[X]', 250);
    l['208a'] = l[208].replace('[A]', '<a href="/terms" class="red clickurl">');
    l['208a'] = l['208a'].replace('[/A]', '</a>');
    l[208] = l[208].replace('[A]', '<a href="/terms" class="clickurl">');
    l[208] = l[208].replace('[/A]', '</a>');
    l[517] = l[517].replace('[A]', '<a href="/help" class="clickurl">').replace('[/A]', '</a>');
    l[521] = l[521].replace('[A]', '<a href="/copyright" class="clickurl">').replace('[/A]', '</a>');
    l[553] = l[553].replace('[A]', '<a href="mailto:resellers@mega.nz">').replace('[/A]', '</a>');
    l[555] = l[555].replace('[A]', '<a href="/terms" class="clickurl">').replace('[/A]', '</a>');
    l[754] = l[754].replace('[A]',
        '<a href="http://www.google.com/chrome" target="_blank" rel="noreferrer" style="color:#D9290B;">');
    l[754] = l[754].replace('[/A]', '</a>');
    l[871] = l[871].replace('[B]', '<strong>')
        .replace('[/B]', '</strong>')
        .replace('[A]', '<a href="/pro" class="clickurl">').replace('[/A]', '</a>');
    l[924] = l[924].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[501] = l[501].replace('17', '').replace('%', '');
    l[1066] = l[1066].replace('[A]', '<a class="red">').replace('[/A]', '</a>');
    l[1067] = l[1067].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[1094] = l[1094].replace('[A]', '<a href="/plugin" class="clickurl">').replace('[/A]', '</a>');
    l[1095] = l[1095].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[1133] = l[1133].replace('[A]',
        '<a href="http://en.wikipedia.org/wiki/Entropy" target="_blank" rel="noreferrer">').replace('[/A]', '</a>');
    l[1134] = l[1134].replace('[A]',
        '<a href="http://en.wikipedia.org/wiki/Public-key_cryptography" target="_blank" rel="noreferrer">').replace('[/A]',
        '</a>');
    l[1148] = l[1148].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[6978] = l[6978].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[1151] = l[1151].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[731] = l[731].replace('[A]', '<a href="/terms" class="clickurl">').replace('[/A]', '</a>');
    if (lang === 'en') {
        l[965] = 'Legal & policies';
    }
    l[1159] = l[1159].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[1171] = l[1171].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[1185] = l[1185].replace('[X]', '<strong>MEGA.crx</strong>');
    l[1212] = l[1212].replace('[A]', '<a href="/sdk" class="red clickurl">').replace('[/A]', '</a>');
    l[1274] = l[1274].replace('[A]', '<a href="/takedown" class="clickurl">').replace('[/A]', '</a>');
    l[1275] = l[1275].replace('[A]', '<a href="/copyright" class="clickurl">').replace('[/A]', '</a>');
    l[1201] = l[1201].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[1208] = l[1208].replace('[B]', '<strong>').replace('[/B]', '</strong>');
    l[1915] = l[1915].replace('[A]',
        '<a class="red" href="https://chrome.google.com/webstore/detail/mega/bigefpfhnfcobdlfbedofhhaibnlghod" target="_blank" rel="noreferrer">')
            .replace('[/A]', '</a>');
    l[1936] = l[1936].replace('[A]', '<a href="/backup" class="clickurl">').replace('[/A]', '</a>');
    l[1942] = l[1942].replace('[A]', '<a href="/backup" class="clickurl">').replace('[/A]', '</a>');
    l[1943] = l[1943].replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[1948] = l[1948].replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[1957] = l[1957].replace('[A]', '<a href="/recovery" class="clickurl">').replace('[/A]', '</a>');
    l[1965] = l[1965].replace('[A]', '<a href="/recovery" class="clickurl">').replace('[/A]', '</a>');
    l[1982] = l[1982].replace('[A]', '<font style="color:#D21F00;">').replace('[/A]', '</font>');
    l[1993] = l[1993].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[122] = l[122].replace('five or six hours', '<span class="red">five or six hours</span>');
    l[7945] = l[7945].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[8426] = l[8426].replace('[S]', '<span class="red">').replace('[/S]', '</span>');
    l[8427] = l[8427].replace('[S]', '<span class="red">').replace('[/S]', '</span>');
    l[8428] = l[8428].replace('[A]', '<a class="red">').replace('[/A]', '</a>');
    l[8440] = l[8440].replace('[A]', '<a href="https://github.com/meganz/">').replace('[/A]', '</a>');
    l[8440] = l[8440].replace('[A2]', '<a href="/contact" class="clickurl">').replace('[/A2]', '</a>');
    l[8441] = l[8441].replace('[A]', '<a href="mailto:bugs@mega.nz">').replace('[/A]', '</a>');
    l[8441] = l[8441].replace('[A2]', '<a href="https://mega.nz/blog_8">').replace('[/A2]', '</a>');
    l[5931] = l[5931].replace('[A]', '<a class="red" href="/fm/account" class="clickurl">').replace('[/A]', '</a>');
    l[8644] = l[8644].replace('[S]', '<span class="green">').replace('[/S]', '</span>');
    l[8651] = l[8651].replace('%1', '<span class="header-pro-plan"></span>');
    l[8653] = l[8653].replace('[S]', '<span class="renew-text">').replace('[/S]', '</span>');
    l[8653] = l[8653].replace('%1', '<span class="pro-plan"></span>');
    l[8653] = l[8653].replace('%2', '<span class="plan-duration"></span>');
    l[8653] = l[8653].replace('%3', '<span class="provider-icon"></span>');
    l[8653] = l[8653].replace('%4', '<span class="gateway-name"></span>');
    l[8654] = l[8654].replace('[S]', '<span class="choose-text">').replace('[/S]', '</span>');
    l[7991] = l[7991].replace('%1', '<span class="provider-icon"></span><span class="provider-name"></span>');
    l[8535] = l[8535].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[8833] = l[8833].replace('[B]', '<strong>').replace('[/B]', '</strong>');
    l[8850] = l[8850].replace('%1', '<span class="release-version"></span>');
    l[8851] = l[8851].replace('%1', '<span class="release-date-time"></span>');
    l[8843] = l[8843].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[8855] = l[8855].replace('[BR]', '<br>');
    l[8848] = l[8848].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[8849] = l[8849].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[1389] = l[1389].replace('[B]', '').replace('[/B]', '').replace('[A]', '<span>').replace('[/A]', '</span>');
    l[8912] = l[8912].replace('[B]', '<span>').replace('[/B]', '</span>');
    l[8846] = l[8846].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[8847] = l[8847].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[8950] = l[8950].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[8951] = l[8951].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[8952] = l[8952].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[9030] = l[9030].replace('[S]', '<strong>').replace('[/S]', '</strong>');
    l[9036] = l[9036].replace('[S]', '<strong>').replace('[/S]', '</strong>');
    l[10631] = l[10631].replace('[A]', '<a href="/general" class="clickurl" target="_blank">').replace('[/A]', '</a>');
    l[10630] = l[10630].replace('[A]', '<a href="/general" class="clickurl" target="_blank">').replace('[/A]', '</a>');
    l[10634] = l[10634].replace('[A]', '<a href="/support" class="clickurl" target="_blank">').replace('[/A]', '</a>');
    l[10635] = l[10635].replace('[B]', '"<b>').replace('[/B]', '</b>"');
    l[10636] = l[10636].replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>').replace('%1', 2);
    l[10644] = l[10644].replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[10646] = l[10646].replace('[A]', '<a href="/account" class="clickurl">').replace('[/A]', '</a>');
    l[10650] = l[10650].replace('[A]', '<a href="/account" class="clickurl">').replace('[/A]', '</a>');
    l[10656] = l[10656].replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[10658] = l[10658].replace('[A]', '<a href="/terms" class="clickurl">').replace('[/A]', '</a>');
    l[12482] = l[12482].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[12483] = l[12483].replace('[BR]', '<br>');
    l[12485] = l[12485].replace('[A1]', '<a href="" class="red mac">').replace('[/A1]', '</a>');
    l[12485] = l[12485].replace('[A2]', '<a href="" class="red linux">').replace('[/A2]', '</a>');
    l[12486] = l[12486].replace('[A1]', '<a href="" class="red windows">').replace('[/A1]', '</a>');
    l[12486] = l[12486].replace('[A2]', '<a href="" class="red mac">').replace('[/A2]', '</a>');
    l[12487] = l[12487].replace('[A1]', '<a href="" class="red windows">').replace('[/A1]', '</a>');
    l[12487] = l[12487].replace('[A2]', '<a href="" class="red linux">').replace('[/A2]', '</a>');
    l[12488] = l[12488].replace('[A]', '<a>').replace('[/A]', '</a>').replace('[BR]', '<br>');
    l[12489] = l[12489].replace('[I]', '<i>').replace('[/I]', '</i>').replace('[I]', '<i>').replace('[/I]', '</i>');
    l[15536] = l[15536].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[16106] = l[16106].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[16107] = l[16107].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[16116] = l[16116].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[16119] = l[16119].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[16120] = l[16120].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[16123] = l[16123].replace('[S]', '<span>').replace('[/S]', '</span>').replace('[A]', '<a href="/pro">').replace('[/A]', '</a>').replace('[BR]', '<br />');
    l[16124] = l[16124].replace('[S]', '<span>').replace('[/S]', '</span>').replace('[A]', '<a href="/pro">').replace('[/A]', '</a>').replace('[BR]', '<br />');
    l[16135] = l[16135].replace('[BR]', '<br />');
    l[16136] = l[16136].replace('[A]', '<a href="/pro">').replace('[/A]', '</a>');
    l[16137] = l[16137].replace('[A]', '<a href="/pro">').replace('[/A]', '</a>');
    l[16138] = l[16138].replace('[A]', '<a href="/pro">').replace('[/A]', '</a>');
    l[16165] = l[16165].replace('[S]', '<a class="red">').replace('[/S]', '</a>').replace('[BR]', '<br/>');
    l[16167] = l[16167].replace('[S]', '<a href="/mobile" class="clickurl">').replace('[/S]', '</a>');
    l[16389] = l[16389].replace(
                 '%1',
                 '<span class="checkdiv checkboxOn autoaway">' +
                     '<input type="checkbox" name="set-auto-away" id="set-auto-away" class="checkboxOn" checked="">' +
                 '</span>'
               )
               .replace(
                 '%2',
                 '<span class="account-counter-number short">' +
                     '<input type="text" value="5" id="autoaway" />' +
                 '</span>'
               );

    l['year'] = new Date().getFullYear();
    date_months = [
        l[408], l[409], l[410], l[411], l[412], l[413],
        l[414], l[415], l[416], l[417], l[418], l[419]
    ].map(escapeHTML);
}

function showmoney(number) {
    number = number.toString();
    var dollars = number.split('.')[0],
        cents = (number.split('.')[1] || '') + '00';
    dollars = dollars.split('').reverse().join('')
        .replace(/(\d{3}(?!$))/g, '$1,')
        .split('').reverse().join('');
    return dollars + '.' + cents.slice(0, 2);
}

function getHeight() {
    var myHeight = 0;
    if (typeof window.innerWidth === 'number') {
        myHeight = window.innerHeight;
    }
    else if (document.documentElement
            && (document.documentElement.clientWidth || document.documentElement.clientHeight)) {
        myHeight = document.documentElement.clientHeight;
    }
    else if (document.body && (document.body.clientWidth || document.body.clientHeight)) {
        myHeight = document.body.clientHeight;
    }
    return myHeight;
}

function divscroll(el) {
    document.getElementById(el).scrollIntoView();
    $('body').scrollLeft(0);
    $('html').scrollTop(0);
    if (page === 'start') {
        start_menu(el);
    }
}

function browserdetails(useragent) {
    var os = false;
    var browser = false;
    var icon = '';
    var name = '';
    var brand = '';
    var verTag = '';
    var nameTrans = '';
    var current = false;
    var brand = false;
    var details = {};

    if (useragent === undefined || useragent === ua) {
        current = true;
        useragent = ua;
    }
    if (Object(useragent).details !== undefined) {
        return useragent.details;
    }
    useragent = (' ' + useragent).toLowerCase();

    if (current) {
        brand = mega.getBrowserBrandID();
    }
    else if (useragent.indexOf('~:') !== -1) {
        brand = useragent.match(/~:(\d+)/);
        brand = brand && brand.pop() | 0;
    }

    if (useragent.indexOf('windows phone') > 0) {
        icon = 'wp.png';
        os = 'Windows Phone';
    }
    else if (useragent.indexOf('android') > 0) {
        os = 'Android';
    }
    else if (useragent.indexOf('windows') > 0) {
        os = 'Windows';
    }
    else if (useragent.indexOf('iphone') > 0) {
        os = 'iPhone';
    }
    else if (useragent.indexOf('imega') > 0) {
        os = 'iPhone';
    }
    else if (useragent.indexOf('ipad') > 0) {
        os = 'iPad';
    }
    else if (useragent.indexOf('mac') > 0
            || useragent.indexOf('darwin') > 0) {
        os = 'Apple';
    }
    else if (useragent.indexOf('linux') > 0) {
        os = 'Linux';
    }
    else if (useragent.indexOf('blackberry') > 0) {
        os = 'Blackberry';
    }

    if (mega.browserBrand[brand]) {
        browser = mega.browserBrand[brand];
    }
    else if (useragent.indexOf(' edge/') > 0) {
        browser = 'Edge';
    }
    else if (useragent.indexOf('iemobile/') > 0) {
        icon = 'ie.png';
        brand = 'IEMobile';
        browser = 'Internet Explorer';
    }
    else if (useragent.indexOf('opera') > 0 || useragent.indexOf(' opr/') > 0) {
        browser = 'Opera';
    }
    else if (useragent.indexOf(' dragon/') > 0) {
        icon = 'dragon.png';
        browser = 'Comodo Dragon';
    }
    else if (useragent.indexOf('vivaldi') > 0) {
        browser = 'Vivaldi';
    }
    else if (useragent.indexOf('maxthon') > 0) {
        browser = 'Maxthon';
    }
    else if (useragent.indexOf('electron') > 0) {
        browser = 'Electron';
    }
    else if (useragent.indexOf('palemoon') > 0) {
        browser = 'Palemoon';
    }
    else if (useragent.indexOf('cyberfox') > 0) {
        browser = 'Cyberfox';
    }
    else if (useragent.indexOf('waterfox') > 0) {
        browser = 'Waterfox';
    }
    else if (useragent.indexOf('iceweasel') > 0) {
        browser = 'Iceweasel';
    }
    else if (useragent.indexOf('seamonkey') > 0) {
        browser = 'SeaMonkey';
    }
    else if (useragent.indexOf('lunascape') > 0) {
        browser = 'Lunascape';
    }
    else if (useragent.indexOf(' iron/') > 0) {
        browser = 'Iron';
    }
    else if (useragent.indexOf('avant browser') > 0) {
        browser = 'Avant';
    }
    else if (useragent.indexOf('polarity') > 0) {
        browser = 'Polarity';
    }
    else if (useragent.indexOf('k-meleon') > 0) {
        browser = 'K-Meleon';
    }
    else if (useragent.indexOf(' crios') > 0) {
        browser = 'Chrome';
        details.brand = verTag = 'CriOS';
    }
    else if (useragent.indexOf('chrome') > 0) {
        browser = 'Chrome';
    }
    else if (useragent.indexOf('safari') > 0) {
        verTag = 'Version';
        browser = 'Safari';
    }
    else if (useragent.indexOf('firefox') > 0) {
        browser = 'Firefox';
    }
    else if (useragent.indexOf(' otter/') > 0) {
        browser = 'Otter';
    }
    else if (useragent.indexOf('thunderbird') > 0) {
        browser = 'Thunderbird';
    }
    else if (useragent.indexOf('es plugin ') === 1) {
        icon = 'esplugin.png';
        browser = 'ES File Explorer';
    }
    else if (useragent.indexOf('megasync') > 0) {
        browser = 'MEGAsync';
    }
    else if (useragent.indexOf('msie') > 0
            || useragent.indexOf('trident') > 0) {
        browser = 'Internet Explorer';
    }

    // Translate "%1 on %2" to "Chrome on Windows"
    if ((os) && (browser)) {
        name = (brand || browser) + ' on ' + os;
        nameTrans = String(l[7684]).replace('%1', brand || browser).replace('%2', os);
    }
    else if (os) {
        name = os;
        icon = icon || (os.toLowerCase() + '.png');
    }
    else if (browser) {
        name = browser;
    }
    else {
        name = 'Unknown';
        icon = 'unknown.png';
    }
    if (!icon && browser) {
        if (browser === 'Internet Explorer' || browser === 'Edge') {
            icon = 'ie.png';
        }
        else {
            icon = browser.toLowerCase() + '.png';
        }
    }

    details.name = name;
    details.nameTrans = nameTrans || name;
    details.icon = icon;
    details.os = os || '';
    details.browser = browser;
    details.version =
        (useragent.match(RegExp("\\s+" + (verTag || brand || browser) + "/([\\d.]+)", 'i')) || [])[1] || 0;

    // Determine if the OS is 64bit
    details.is64bit = /\b(WOW64|x86_64|Win64|intel mac os x 10.(9|\d{2,}))/i.test(useragent);

    // Determine if using a browser extension
    details.isExtension = (current && is_extension || useragent.indexOf('megext') > -1);

    if (useragent.indexOf(' MEGAext/') !== -1) {
        var ver = useragent.match(/ MEGAext\/([\d.]+)/);

        details.isExtension = ver && ver[1] || true;
    }

    if (brand) {
        details.brand = brand;
    }

    // Determine core engine.
    if (useragent.indexOf('webkit') > 0) {
        details.engine = 'Webkit';
    }
    else if (useragent.indexOf('trident') > 0) {
        details.engine = 'Trident';
    }
    else if (useragent.indexOf('gecko') > 0) {
        details.engine = 'Gecko';
    }
    else {
        details.engine = 'Unknown';
    }

    // Product info to quickly access relevant info.
    details.prod = details.name + ' [' + details.engine + ']'
        + (details.brand ? '[' + details.brand + ']' : '')
        + '[' + details.version + ']'
        + (details.isExtension ? '[E:' + details.isExtension + ']' : '')
        + '[' + (details.is64bit ? 'x64' : 'x32') + ']';

    return details;
}

function countrydetails(isocode) {
    var cdetails = {
        name: isoCountries[isocode],
        icon: isocode.toLowerCase() + '.gif'
    };
    return cdetails;
}

/**
 * Converts a timestamp to a readable time format - e.g. 2016-04-17 14:37
 *
 * @param {Number} unixTime  The UNIX timestamp in seconds e.g. 1464829467
 * @param {Number} format    The readable time format to return
 * @returns {String}
 *
 * Formats:
 *       0: yyyy-mm-dd hh:mm
 *       1: yyyy-mm-dd
 *       2: dd fmn yyyy (fmn: Full month name, based on the locale)
 */
function time2date(unixTime, format) {

    var result;
    var date = new Date(unixTime * 1000 || 0);

    if (format === 2) {
        result = date.getDate() + ' ' + date_months[date.getMonth()] + ' ' + date.getFullYear();
    }
    else {
        result = date.getFullYear() + '-'
               + ('0' + (date.getMonth() + 1)).slice(-2)
               + '-' + ('0' + date.getDate()).slice(-2);

        if (!format) {
            result += ' ' + date.toTimeString().substr(0, 5);
        }
    }

    return result;
}

// in case we need to run functions.js in a standalone (non secureboot.js) environment, we need to handle this case:
if (typeof l === 'undefined') {
    l = [];
}

var date_months = []

function acc_time2date(unixtime, yearIsOptional) {
    var MyDate = new Date(unixtime * 1000);
    var th = 'th';
    if ((parseInt(MyDate.getDate()) === 11) || (parseInt(MyDate.getDate()) === 12)) {}
    else if (('' + MyDate.getDate()).slice(-1) === '1') {
        th = 'st';
    }
    else if (('' + MyDate.getDate()).slice(-1) === '2') {
        th = 'nd';
    }
    else if (('' + MyDate.getDate()).slice(-1) === '3') {
        th = 'rd';
    }
    if (lang !== 'en') {
        th = ',';
    }
    var result = date_months[MyDate.getMonth()] + ' ' + MyDate.getDate();

    if (yearIsOptional === true) {
        var currYear = (new Date()).getFullYear();
        if (currYear !== MyDate.getFullYear()) {
            result +=  th + ' ' + MyDate.getFullYear();
        }
    }
    else {
        result +=  th + ' ' + MyDate.getFullYear();
    }
    return result;
}

function humandate(unixtime) {
    var date = new Date(unixtime * 1000);
    return date.getDate() + ' ' + date_months[date.getMonth()] +  ' ' + date.getFullYear();
}

function time2last(timestamp) {
    var sec = (new Date().getTime() / 1000) - timestamp;
    if (sec < 4) {
        return l[880];
    }
    else if (sec < 59) {
        return l[873].replace('[X]', Math.ceil(sec));
    }
    else if (sec < 90) {
        return l[874];
    }
    else if (sec < 3540) {
        return l[875].replace('[X]', Math.ceil(sec / 60));
    }
    else if (sec < 4500) {
        return l[876];
    }
    else if (sec < 82000) {
        return l[877].replace('[X]', Math.ceil(sec / 3600));
    }
    else if (sec < 110000) {
        return l[878];
    }
    else {
        return l[879].replace('[X]', Math.ceil(sec / 86400));
    }
}

/**
 * Basic calendar math function (using moment.js) to return true or false if the date passed in is either
 * the same day or the previous day.
 *
 * @param dateString {String|int}
 * @param [refDate] {String|int}
 * @returns {Boolean}
 */
var todayOrYesterday = function(dateString, refDate) {
    var momentDate = moment(dateString);
    var today = moment(refDate ? refDate : undefined).startOf('day');
    var yesterday = today.clone().subtract(1, 'days');

    return (momentDate.isSame(today, 'd') || momentDate.isSame(yesterday, 'd'));
}

/**
 * Basic calendar math function (using moment.js) that will return a string, depending on the exact calendar
 * dates/months ago when the passed `dateString` had happened.
 *
 * @param dateString {String|int}
 * @param [refDate] {String|int}
 * @returns {String}
 */
var time2lastSeparator = function(dateString, refDate) {
    var momentDate = moment(dateString);
    var today = moment(refDate ? refDate : undefined).startOf('day');
    var yesterday = today.clone().subtract(1, 'days');
    var weekAgo = today.clone().startOf('week').endOf('day');
    var twoWeeksAgo = today.clone().startOf('week').subtract(1, 'weeks').endOf('day');
    var thisMonth = today.clone().startOf('month').startOf('day');
    var thisYearAgo = today.clone().startOf('year');

    if (momentDate.isSame(today, 'd')) {
        // Today
        return l[1301];
    }
    else if (momentDate.isSame(yesterday, 'd')) {
        // Yesterday
        return l[1302];
    }
    else if (momentDate.isAfter(weekAgo)) {
        // This week
        return l[1303];
    }
    else if (momentDate.isAfter(twoWeeksAgo)) {
        // Last week
        return l[1304];
    }
    else if (momentDate.isAfter(thisMonth)) {
        // This month
        return l[1305];
    }
    else if (momentDate.isAfter(thisYearAgo)) {
        // This year
        return l[1306];
    }
    else {
        // more then 1 year ago...
        return l[1307];
    }
};

/**
 * Gets the current UNIX timestamp
 * @returns {Number} Returns an integer with the current UNIX timestamp (in seconds)
 */
function unixtime() {
    return Math.round(Date.now() / 1000);
}

function uplpad(number, length) {
    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;
    }
    return str;
}

function secondsToTime(secs, html_format) {
    if (isNaN(secs)) {
        return '--:--:--';
    }
    if (secs < 0) {
        return '';
    }

    var hours = uplpad(Math.floor(secs / (60 * 60)), 2);
    var divisor_for_minutes = secs % (60 * 60);
    var minutes = uplpad(Math.floor(divisor_for_minutes / 60), 2);
    var divisor_for_seconds = divisor_for_minutes % 60;
    var seconds = uplpad(Math.floor(divisor_for_seconds), 2);
    var returnvar = hours + ':' + minutes + ':' + seconds;

    if (html_format) {
        hours = (hours !== '00') ? (hours + '<span>h</span> ') : '';
        returnvar = hours + minutes + '<span>m</span> ' + seconds + '<span>s</span>';
    }
    return returnvar;
}

function secondsToTimeShort(secs) {
    var val = secondsToTime(secs);

    if (!val) {
        return val;
    }

    if (val.substr(0, 1) === "0") {
        val = val.substr(1, val.length);
    }
    if (val.substr(0, 2) === "0:") {
        val = val.substr(2, val.length);
    }

    return val;
}

function htmlentities(value) {
    if (!value) {
        return '';
    }
    return $('<div/>').text(value).html();
}

/**
 * Convert bytes sizes into a human-friendly format (KB, MB, GB), pretty
 * similar to `bytesToSize` but this function returns an object
 * (`{ size: "23,33", unit: 'KB' }`) which is easier to consume
 *
 * @param {Number} bytes        Size in bytes to convert
 * @param {Number} precision    Precision to show the decimal number
 * @returns {Object} Returns an object similar to `{size: "2.1", unit: "MB"}`
 */
function numOfBytes(bytes, precision) {

    var parts = bytesToSize(bytes, precision || 2).split(' ');
    return { size: parts[0], unit: parts[1] || 'B' };
}

function bytesToSize(bytes, precision, html_format) {
    var s_b = 'B';
    var s_kb = 'KB';
    var s_mb = 'MB';
    var s_gb = 'GB';
    var s_tb = 'TB';
    var s_pb = 'PB';

    if (lang === 'fr') {
        s_b = 'O';
        s_kb = 'Ko';
        s_mb = 'Mo';
        s_gb = 'Go';
        s_tb = 'To';
        s_pb = 'Po';
    }

    var kilobyte = 1024;
    var megabyte = kilobyte * 1024;
    var gigabyte = megabyte * 1024;
    var terabyte = gigabyte * 1024;
    var petabyte = terabyte * 1024;
    var resultSize = 0;
    var resultUnit = '';

    if (precision === undefined) {
        if (bytes > gigabyte) {
            precision = 2;
        }
        else if (bytes > megabyte) {
            precision = 1;
        }
    }

    if (!bytes) {
        resultSize = 0;
        resultUnit = s_mb;
    }
    else if ((bytes >= 0) && (bytes < kilobyte)) {
        resultSize = parseInt(bytes);
        resultUnit = s_b;
    }
    else if ((bytes >= kilobyte) && (bytes < megabyte)) {
        resultSize = (bytes / kilobyte).toFixed(precision);
        resultUnit = s_kb;
    }
    else if ((bytes >= megabyte) && (bytes < gigabyte)) {
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
    if (html_format === 2) {
        return resultSize + '<span>' + resultUnit + '</span>';
    }
    else if (html_format) {
        return '<span>' + resultSize + '</span>' + resultUnit;
    }
    else {
        return resultSize + ' ' + resultUnit;
    }
}

function logincheckboxCheck(ch_id) {
    var ch_div = ch_id + "_div";
    if (document.getElementById(ch_id).checked) {
        document.getElementById(ch_div).className = "checkboxOn";
    }
    else {
        document.getElementById(ch_div).className = "checkboxOff";
    }
}

function makeid(len) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < len; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function checkMail(email) {
    email = email.replace(/\+/g, '');
    var filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    if (filter.test(email)) {
        return false;
    }
    else {
        return true;
    }
}

/**
 * Helper function for creating alias of a method w/ specific context
 *
 * @param context
 * @param fn
 * @returns {aliasClosure}
 */
function funcAlias(context, fn) {
    return function aliasClosure() {
        return fn.apply(context, arguments);
    };
}

/**
 * Adds on, bind, unbind, one and trigger methods to a specific class's prototype.
 *
 * @param kls class on which prototype this method should add the on, bind, unbind, etc methods
 */
function makeObservable(kls) {
    var target = kls.prototype || kls;
    var aliases = ['on', 'bind', 'unbind', 'one', 'trigger', 'rebind'];

    aliases.forEach(function(fn) {
        target[fn] = function() {
            var $this = $(this);
            return $this[fn].apply($this, arguments);
        };
    });

    target = aliases = kls = undefined;
}

/**
 * Instantiates an enum-like list on the provided target object
 */
function makeEnum(aEnum, aPrefix, aTarget, aNorm) {
    aTarget = aTarget || {};

    var len = aEnum.length;
    while (len--) {
        Object.defineProperty(aTarget,
            (aPrefix || '') + String(aEnum[len]).toUpperCase(), {
                value: aNorm ? len : (1 << len),
                enumerable: true
            });
    }
    return aTarget;
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
 * Later on, we can change the implementation (to use md5 or murmur) by just changing the function body of this
 * function.
 * @param {String}
 */
function fastHashFunction(val) {
    return MurmurHash3(val, 0x4ef5391a).toString();
}

/**
 * @see http://stackoverflow.com/q/7616461/940217
 * @return {number}
 */
function simpleStringHashCode(str) {
    assert(str, "Missing str passed to simpleStringHashCode");

    if (Array.prototype.reduce) {
        return str.split("").reduce(function(a, b) {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a
        }, 0);
    }
    var hash = 0;
    if (str.length === 0) {
        return hash;
    }
    for (var i = 0; i < str.length; i++) {
        var character = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

/**
 * Creates a promise, which will fail if the validateFunction() don't return true in a timely manner (e.g. < timeout).
 *
 * @param validateFunction {Function}
 * @param tick {int}
 * @param timeout {int}
 * @param [resolveRejectArgs] {(Array|*)} args that will be used to call back .resolve/.reject
 * @param [waitForPromise] {(MegaPromise|$.Deferred)} Before starting the timer, we will wait for this promise to be rej/res first.
 * @returns {Deferred}
 */
function createTimeoutPromise(validateFunction, tick, timeout,
                              resolveRejectArgs, waitForPromise) {
    var $promise = new MegaPromise();
    resolveRejectArgs = resolveRejectArgs || [];
    if (!$.isArray(resolveRejectArgs)) {
        resolveRejectArgs = [resolveRejectArgs]
    }

    $promise.verify = function() {
        if (validateFunction()) {
            if (window.d && typeof(window.promisesDebug) !== 'undefined') {
                console.debug("Resolving timeout promise",
                    timeout, "ms", "at", (new Date()),
                    validateFunction, resolveRejectArgs);
            }
            $promise.resolve.apply($promise, resolveRejectArgs);
        }
    };

    var startTimerChecks = function() {
        var tickInterval = setInterval(function() {
            $promise.verify();
        }, tick);

        var timeoutTimer = setTimeout(function() {
            if (validateFunction()) {
                if (window.d && typeof(window.promisesDebug) !== 'undefined') {
                    console.debug("Resolving timeout promise",
                        timeout, "ms", "at", (new Date()),
                        validateFunction, resolveRejectArgs);
                }
                $promise.resolve.apply($promise, resolveRejectArgs);
            }
            else {
                console.error("Timed out after waiting",
                    timeout, "ms", "at", (new Date()),
                    validateFunction, resolveRejectArgs);
                $promise.reject.apply($promise, resolveRejectArgs);
            }
        }, timeout);

        // stop any running timers and timeouts
        $promise.always(function() {
            clearInterval(tickInterval);
            clearTimeout(timeoutTimer);
        });

        $promise.verify();
    };

    if (!waitForPromise || !waitForPromise.done) {
        startTimerChecks();
    }
    else {
        waitForPromise.always(function() {
            startTimerChecks();
        });
    }

    return $promise;
}

/**
 * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
 * (c) 2011 Colin Snover <http://zetafleet.com>
 * Released under MIT license.
 */
(function(Date, undefined) {
    var origParse = Date.parse,
        numericKeys = [1, 4, 5, 6, 7, 10, 11];
    Date.parse = function(date) {
        var timestamp, struct, minutesOffset = 0;

        // ES5 15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
        // before falling back to any implementation-specific date parsing, so that's what we do, even if native
        // implementations could be faster
        //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 +    10 tzHH    11 tzmm
        if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
            // avoid NaN timestamps caused by "undefined" values being passed to Date.UTC
            for (var i = 0, k; (k = numericKeys[i]); ++i) {
                struct[k] = +struct[k] || 0;
            }

            // allow undefined days and months
            struct[2] = (+struct[2] || 1) - 1;
            struct[3] = +struct[3] || 1;

            if (struct[8] !== 'Z' && struct[9] !== undefined) {
                minutesOffset = struct[10] * 60 + struct[11];

                if (struct[9] === '+') {
                    minutesOffset = 0 - minutesOffset;
                }
            }

            timestamp = Date.UTC(struct[1],
                    struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
        }
        else {
            timestamp = origParse ? origParse(date) : NaN;
        }

        return timestamp;
    };
}(Date));

/**
 * @module assert
 *
 * Assertion helper module.
 *
 * @example
 * function lastElement(array) {
 *     assert(array.length > 0, "empty array in lastElement");
 *     return array[array.length - 1];
 * }
 */
/**
 * Assertion exception.
 * @param message
 *     Message for exception on failure.
 * @constructor
 */
function AssertionFailed(message) {
    this.message = message;
    this.stack = mega.utils.getStack();
}
AssertionFailed.prototype = Object.create(Error.prototype);
AssertionFailed.prototype.name = 'AssertionFailed';

/**
 * Assert a given test condition.
 *
 * Throws an AssertionFailed exception with a given message, in case the condition is false.
 * The message is assembled by the args following 'test', similar to console.log()
 *
 * @param test
 *     Test statement.
 */
function assert(test) {
    if (test) {
        return;
    }
    //assemble message from parameters
    var message = '';
    var last = arguments.length - 1;
    for (var i = 1; i <= last; i++) {
        message += arguments[i];
        if (i < last) {
            message += ' ';
        }
    }
    if (MegaLogger && MegaLogger.rootLogger) {
        MegaLogger.rootLogger.error("assertion failed: ", message);
    }
    else if (window.d) {
        console.error(message);
    }

    if (localStorage.stopOnAssertFail) {
        debugger;
    }

    throw new AssertionFailed(message);
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

function NOW() {
    return Date.now();
}

/**
 *  Global function to help debugging
 */
function DEBUG2() {
    if (typeof d !== "undefined" && d) {
        console.warn.apply(console, arguments)
    }
}

function ERRDEBUG() {
    if (typeof d !== "undefined" && d) {
        console.error.apply(console, arguments)
    }
}

function DEBUG() {
    if (typeof d !== "undefined" && d) {
        (console.debug || console.log).apply(console, arguments)
    }
}

function ASSERT(what, msg, udata) {
    if (!what) {
        var af = new Error('failed assertion; ' + msg);
        if (udata) {
            af.udata = udata;
        }
        Soon(function() {
            throw af;
        });
        if (console.assert) {
            console.assert(what, msg);
        }
        else {
            console.error('FAILED ASSERTION', msg);
        }
    }
    return !!what;
}

// log failures through jscrashes system
function srvlog(msg, data, silent) {
    if (data && !(data instanceof Error)) {
        data = {
            udata: data
        };
    }
    if (!silent && d) {
        console.error(msg, data);
    }
    if (typeof window.onerror === 'function') {
        window.onerror(msg, '', data ? 1 : -1, 0, data || null);
    }
}

// log failures through event id 99666
function srvlog2(type /*, ...*/) {
    if (d || window.exTimeLeft) {
        var args    = toArray.apply(null, arguments);
        var version = buildVersion.website;

        if (is_extension) {
            if (is_chrome_firefox) {
                version = window.mozMEGAExtensionVersion || buildVersion.firefox;
            }
            else if (window.chrome) {
                version = buildVersion.chrome;
            }
            else {
                version = buildVersion.commit && buildVersion.commit.substr(0, 8) || '?';
            }
        }
        args.unshift((is_extension ? 'e' : 'w') + (version || '-'));

        api_req({a: 'log', e: 99666, m: JSON.stringify(args)});
    }
}


function oDestroy(obj) {
    if (window.d) {
        ASSERT(Object.isFrozen(obj) === false, 'Object already frozen...');
    }

    Object.keys(obj).forEach(function(memb) {
        if (obj.hasOwnProperty(memb)) {
            delete obj[memb];
        }
    });
    if (!oIsFrozen(obj)) {
        Object.defineProperty(obj, ":$:frozen:", {
            value: String(new Date()),
            writable: false
        });
    }

    if (window.d) {
        Object.freeze(obj);
    }
}

function oIsFrozen(obj) {
    return obj && typeof obj === 'object' && obj.hasOwnProperty(":$:frozen:");
}

/**
 *  Return a default callback for error handlign
 */
function dlError(text) {
    return function(e) {
        console.log(text + ' ' + e);
        alert(text + ' ' + e);
    };
}

/**
 *  Remove an element from an *array*
 */
function removeValue(array, value, can_fail) {
    var idx = array.indexOf(value);
    if (d) {
        if (!(can_fail || idx !== -1)) {
            console.warn('Unable to Remove Value ' + value, value);
        }
    }
    if (idx !== -1) {
        array.splice(idx, 1);
    }
    return idx !== -1;
}

function setTransferStatus(dl, status, ethrow, lock) {
    var id = dl && dlmanager.getGID(dl);
    var text = '' + status;
    if (text.length > 48) {
        text = text.substr(0, 48) + "\u2026";
    }
    if (page === 'download') {
        $('.download.error-icon').text(text);
        $('.download.error-icon').removeClass('hidden');
        $('.download.icons-block').addClass('hidden');
    }
    else {
        $('.transfer-table #' + id + ' td:eq(5)')
            .attr('title', status)
            .text(text);
    }
    if (lock) {
        $('.transfer-table #' + id)
            .addClass('transfer-completed')
            .removeClass('transfer-initiliazing')
            .attr('id', 'LOCKed_' + id);
    }
    if (d) {
        console.error(status);
    }
    if (ethrow) {
        throw status;
    }
}

function dlFatalError(dl, error, ethrow) {
    var m = 'This issue should be resolved ';
    if (ethrow === -0xDEADBEEF) {
        ethrow = false;
    }
    else if (navigator.webkitGetUserMedia) {
        m += 'exiting from Incognito mode.';
        msgDialog('warninga', l[1676], m, error);
    }
    else if (navigator.msSaveOrOpenBlob) {
        Later(browserDialog);
        m = l[1933];
        msgDialog('warninga', l[1676], m, error);
    }
    else if (dlMethod === FlashIO) {
        Later(browserDialog);
        m = l[1308];
        msgDialog('warninga', l[1676], m, error);
    }
    else {
        Later(firefoxDialog);
    }

    // Log the fatal error
    Soon(function() {
        error = String(Object(error).message || error).replace(/\s+/g, ' ').trim();

        srvlog('dlFatalError: ' + error.substr(0, 60) + (window.Incognito ? ' (Incognito)' : ''));
    });

    // Set transfer status and abort it
    setTransferStatus(dl, error, ethrow, true);
    dlmanager.abort(dl);
}

/**
 * Original: http://stackoverflow.com/questions/7317299/regex-matching-list-of-emoticons-of-various-type
 *
 * @param text
 * @returns {XML|string|void}
 * @constructor
 */
function RegExpEscape(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function unixtimeToTimeString(timestamp) {
    var date = new Date(timestamp * 1000);
    return addZeroIfLenLessThen(date.getHours(), 2)
        + ":" + addZeroIfLenLessThen(date.getMinutes(), 2);
}

/**
 * Used in the callLoggerWrapper to generate dynamic colors depending on the textPrefix
 *
 * copyrights: http://stackoverflow.com/questions/9600295/automatically-change-text-color-to-assure-readability
 *
 * @param hexTripletColor
 * @returns {*}
 */
function invertColor(hexTripletColor) {
    var color = hexTripletColor;
    color = color.substring(1);           // remove #
    color = parseInt(color, 16);          // convert to integer
    color = 0xFFFFFF ^ color;             // invert three bytes
    color = color.toString(16);           // convert to hex
    color = ("000000" + color).slice(-6); // pad with leading zeros
    color = "#" + color;                  // prepend #
    return color;
}

/**
 * Simple wrapper function that will log all calls of `fnName`.
 * This function is intended to be used for dev/debugging/testing purposes only.
 *
 * @param ctx
 * @param fnName
 * @param loggerFn
 */
function callLoggerWrapper(ctx, fnName, loggerFn, textPrefix, parentLogger) {
    if (!window.d) {
        return;
    }

    var origFn = ctx[fnName];
    textPrefix = textPrefix || "missing-prefix";

    var logger = MegaLogger.getLogger(textPrefix + "[" + fnName + "]", {}, parentLogger);
    var logFnName = loggerFn === console.error ? "error" : "debug";

    if (ctx[fnName].haveCallLogger) { // recursion
        return;
    }
    ctx[fnName] = function() {
        // loggerFn.apply(console, [prefix1, prefix2, "Called: ", fnName, arguments]);
        logger[logFnName].apply(logger, ["(calling) arguments: "].concat(toArray.apply(null, arguments)));

        var res = origFn.apply(this, arguments);
        // loggerFn.apply(console, [prefix1, prefix2, "Got result: ", fnName, arguments, res]);
        logger[logFnName].apply(logger, ["(end call) arguments: "].concat(toArray.apply(null, arguments)).concat(["returned: ", res]));

        return res;
    };
    ctx[fnName].haveCallLogger = true; // recursion
}

/**
 * Simple Object instance call log helper
 * This function is intended to be used for dev/debugging/testing purposes only.
 *
 *
 * WARNING: This function will create tons of references in the window.callLoggerObjects & also may flood your console.
 *
 * @param ctx
 * @param [loggerFn] {Function}
 * @param [recursive] {boolean}
 */
function logAllCallsOnObject(ctx, loggerFn, recursive, textPrefix, parentLogger) {
    if (!window.d) {
        return;
    }
    loggerFn = loggerFn || console.debug;

    if (typeof parentLogger === "undefined") {
        var logger = new MegaLogger(textPrefix);
    }
    if (!window.callLoggerObjects) {
        window.callLoggerObjects = [];
    }

    $.each(ctx, function(k, v) {
        if (typeof v === "function") {
            callLoggerWrapper(ctx, k, loggerFn, textPrefix, parentLogger);
        }
        else if (typeof v === "object"
                && !$.isArray(v) && v !== null && recursive && !$.inArray(window.callLoggerObjects)) {
            window.callLoggerObjects.push(v);
            logAllCallsOnObject(v, loggerFn, recursive, textPrefix + ":" + k, parentLogger);
        }
    });
}

/**
 * Get an array with unique values
 * @param {Array} arr Array
 */
function array_unique(arr) {
    return arr.reduce(function(out, value) {
        if (out.indexOf(value) < 0) {
            out.push(value);
        }
        return out;
    }, []);
}

/**
 * Get a random value from an array
 * @param {Array} arr Array
 */
function array_random(arr) {
    return arr[rand(arr.length)];
}

/**
 * Simple method that will convert Mega user ids to base32 strings (that should be used when doing XMPP auth)
 *
 * @param handle {string} mega user id
 * @returns {string} base32 formatted user id to be used when doing xmpp auth
 */
function megaUserIdEncodeForXmpp(handle) {
    var s = base64urldecode(handle);
    return base32.encode(s);
}

/**
 * Simple method that will convert base32 strings -> Mega user ids
 *
 * @param handle {string} mega user id
 * @returns {string} base32 formatted user id to be used when doing xmpp auth
 */
function megaJidToUserId(jid) {
    var s = base32.decode(jid.split("@")[0]);
    return base64urlencode(s).replace(/=/g, "");
}

/**
 * Implementation of a string encryption/decryption.
 */
var stringcrypt = (function() {
    "use strict";

    /**
     * @description
     * Implementation of a string encryption/decryption.</p>
     */
    var ns = {};

    /**
     * Encrypts clear text data to an authenticated ciphertext, armoured with
     * encryption mode indicator and IV.
     *
     * @param plain {String}
     *     Plain data block as (unicode) string.
     * @param key {String}
     *     Encryption key as byte string.
     * @param [raw] {Boolean}
     *     Do not convert plain text to UTF-8 (default: false).
     * @returns {String}
     *     Encrypted data block as byte string, incorporating mode, nonce and MAC.
     */
    ns.stringEncrypter = function(plain, key, raw) {
        var mode = tlvstore.BLOCK_ENCRYPTION_SCHEME.AES_GCM_12_16;
        var plainBytes = raw ? plain : to8(plain);
        var cipher = tlvstore.blockEncrypt(plainBytes, key, mode, false);

        return cipher;
    };

    /**
     * Decrypts an authenticated cipher text armoured with a mode indicator and IV
     * to clear text data.
     *
     * @param cipher {String}
     *     Encrypted data block as byte string, incorporating mode, nonce and MAC.
     * @param key {String}
     *     Encryption key as byte string.
     * @param [raw] {Boolean}
     *     Do not convert plain text from UTF-8 (default: false).
     * @returns {String}
     *     Clear text as (unicode) string.
     */
    ns.stringDecrypter = function(cipher, key, raw) {

        var plain = tlvstore.blockDecrypt(cipher, key, false);

        return raw ? plain : from8(plain);
    };

    /**
     * Generates a new AES-128 key.
     *
     * @returns {string}
     *     Symmetric key as byte string.
     */
    ns.newKey = function() {

        var keyBytes = new Uint8Array(16);
        asmCrypto.getRandomValues(keyBytes);

        return asmCrypto.bytes_to_string(keyBytes);
    };

    return ns;
})();

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
 *  Create a pool of workers, it returns a Queue object
 *  so it can be called many times and it'd be throttled
 *  by the queue
 */
function CreateWorkers(url, message, size) {
    size = size || 4;
    var worker = [],
        instances = [];

    function handler(id) {
        return function(e) {
            message(this.context, e, function(r) {
                worker[id].busy = false; /* release worker */
                instances[id](r);
            });
        }
    }

    if (!is_karma && !is_extension) {
        url = '/' + url;
    }

    function create(i) {
        var w;

        try {
            w = new Worker(url);
        }
        catch (e) {
            msgDialog('warninga', '' + url, '' + e, location.hostname);
            throw e;
        }

        w.id = i;
        w.busy = false;
        w.postMessage = w.webkitPostMessage || w.postMessage;
        w.onmessage = handler(i);
        return w;
    }

    for (var i = 0; i < size; i++) {
        worker.push(null);
    }

    return new MegaQueue(function(task, done) {
        for (var i = 0; i < size; i++) {
            if (worker[i] === null) {
                worker[i] = create(i);
            }
            if (!worker[i].busy) {
                break;
            }
        }
        worker[i].busy = true;
        instances[i] = done;
        $.each(task, function(e, t) {
                if (e === 0) {
                    worker[i].context = t;
                }
                else if (t.constructor === Uint8Array && typeof MSBlobBuilder !== "function") {
                    worker[i].postMessage(t.buffer, [t.buffer]);
                }
                else {
                    worker[i].postMessage(t);
                }
            });
    }, size, url.split('/').pop().split('.').shift() + '-worker');
}

/**
 * Ask the user for a decryption key
 * @param {String} ph   The node's handle
 * @param {String} fl   Whether is a folderlink
 * @param {String} keyr If a wrong key was used
 * @return {MegaPromise}
 */
function mKeyDialog(ph, fl, keyr) {
    var promise = new MegaPromise();

    if (keyr) {
        $('.fm-dialog.dlkey-dialog .instruction-message')
            .text(l[9048]);
    }
    else {
        $('.fm-dialog.dlkey-dialog .instruction-message')
            .safeHTML(l[7945] + '<br/>' + l[7972]);
    }

    $('.new-download-buttons').addClass('hidden');
    $('.new-download-file-title').text(l[1199]);
    $('.new-download-file-icon').addClass(fileIcon({
        name: 'unknown.unknown'
    }));
    $('.fm-dialog.dlkey-dialog').removeClass('hidden');
    fm_showoverlay();

    $('.fm-dialog.dlkey-dialog input').rebind('keydown', function(e) {
        $('.fm-dialog.dlkey-dialog .fm-dialog-new-folder-button').addClass('active');
        if (e.keyCode === 13) {
            $('.fm-dialog.dlkey-dialog .fm-dialog-new-folder-button').click();
        }
    });

    $('.fm-dialog.dlkey-dialog .fm-dialog-new-folder-button').rebind('click', function(e) {

        // Trim the input from the user for whitespace, newlines etc on either end
        var key = $.trim($('.fm-dialog.dlkey-dialog input').val());

        if (key) {
            // Remove the ! from the key which is exported from the export dialog
            key = key.replace('!', '');

            var newHash = (fl ? '/F!' : '/!') + ph + '!' + key;

            if (getSitePath() !== newHash) {
                promise.resolve(key);

                fm_hideoverlay();
                $('.fm-dialog.dlkey-dialog').addClass('hidden');
                loadSubPage(newHash);
            }
        }
        else {
            promise.reject();
        }
    });
    $('.fm-dialog.dlkey-dialog .fm-dialog-close').rebind('click', function(e) {
        $('.fm-dialog.dlkey-dialog').addClass('hidden');
        fm_hideoverlay();
        promise.reject();
    });

    return promise;
}

function dcTracer(ctr) {
    var name = ctr.name || 'unknown',
        proto = ctr.prototype || ctr;
    for (var fn in proto) {
        if (proto.hasOwnProperty(fn) && typeof proto[fn] === 'function') {
            console.log('Tracing ' + name + '.' + fn);
            proto[fn] = (function(fn, fc) {
                fc.dbg = function() {
                    try {
                        console.log('Entering ' + name + '.' + fn,
                            this, '~####~', Array.prototype.slice.call(arguments));
                        var r = fc.apply(this, arguments);
                        console.log('Leaving ' + name + '.' + fn, r);
                        return r;
                    }
                    catch (e) {
                        console.error(e);
                    }
                };
                return fc.dbg;
            })(fn, proto[fn]);
        }
    }
}

function mSpawnWorker(url, nw) {
    if (!(this instanceof mSpawnWorker)) {
        return new mSpawnWorker(url, nw);
    }

    this.jid = 1;
    this.jobs = {};
    this.nworkers = nw = nw || mega.maxWorkers;
    this.wrk = new Array(nw);
    this.token = mRandomToken('mSpawnWorker.' + url.split(".")[0]);

    while (nw--) {
        if (!(this.wrk[nw] = this.add(url))) {
            throw new Error(this.token.split("$")[0] + ' Setup Error');
        }
    }
}
mSpawnWorker.prototype = {
    process: function mSW_Process(data, callback, onerror) {
        if (!Array.isArray(data)) {
            var err = new Error("'data' must be an array");
            if (onerror) {
                return onerror(err);
            }
            throw err;
        }
        if (this.unreliably) {
            return onerror(0xBADF);
        }
        var nw = this.nworkers,
            l = Math.ceil(data.length / nw);
        var id = mRandomToken("mSWJobID" + this.jid++),
            idx = 0;
        var job = {
            done: 0,
            data: [],
            callback: callback
        };

        while (nw--) {
            job.data.push(data.slice(idx, idx += l));
        }
        if (onerror) {
            job.onerror = onerror;
        }
        this.jobs[id] = job;
        this.postNext();
    },
    postNext: function mSW_PostNext() {
        if (this.busy()) {
            return;
        }
        for (var id in this.jobs) {
            var nw = this.nworkers;
            var job = this.jobs[id],
                data;

            while (nw--) {
                if (!this.wrk[nw].working) {
                    data = job.data.shift();
                    if (data) {
                        this.wrk[nw].working = !0;
                        this.wrk[nw].postMessage({
                            data: data,
                            debug: !!window.d,
                            u_sharekeys: u_sharekeys,
                            u_privk: u_privk,
                            u_handle: u_handle,
                            u_k: u_k,
                            jid: id
                        });

                        if (d && job.data.length === this.nworkers - 1) {
                            console.time(id);
                        }
                    }
                }
            }
        }
    },
    busy: function() {
        var nw = this.nworkers;
        while (nw-- && this.wrk[nw].working);
        return nw === -1;
    },
    add: function mSW_Add(url) {
        var self = this,
            wrk;

        try {
            wrk = new Worker(url);
        }
        catch (e) {
            console.error(e);
            if (!window[this.token]) {
                window[this.token] = true;
                msgDialog('warninga', l[16], "Unable to launch " + url + " worker.", e);
            }
            return false;
        }

        wrk.onerror = function mSW_OnError(err) {
            console.error(err);
            if (!(self && self.wrk)) {
                return;
            }
            /*Soon(function() {
                throw err.message || err;
            });*/
            self.unreliably = true;
            var nw = self.nworkers;
            while (nw--) {
                if (self.wrk[nw]) {
                    self.wrk[nw].terminate();
                }
            }
            for (var id in self.jobs) {
                var job = self.jobs[id];
                if (job.onerror) {
                    job.onerror(err);
                }
            }
            /*if (!window[self.token]) {
                window[self.token] = true;
                if (err.filename) {
                    msgDialog('warninga',
                        "Worker Exception: " + url, err.message, err.filename + ":" + err.lineno);
                }
            }*/
            delete self.wrk;
            delete self.jobs;
            self = undefined;
        };

        wrk.onmessage = function mSW_OnMessage(ev) {
            if (ev.data[0] === 'console') {
                if (d) {
                    var args = ev.data[1];
                    args.unshift(self.token);
                    console.log.apply(console, args);
                }
                return;
            }
            if (d) {
                console.log(self.token, ev.data);
            }

            wrk.working = false;
            if (!self.done(ev.data)) {
                this.onerror(0xBADF);
            }
        };

        if (d) {
            console.log(this.token, 'Starting...');
        }

        wrk.postMessage = wrk.postMessage || wrk.webkitPostMessage;

        return wrk;
    },
    done: function mSW_Done(reply) {
        var job = this.jobs[reply.jid];
        if (!ASSERT(job, 'Invalid worker reply.')) {
            return false;
        }

        if (!job.result) {
            job.result = reply.result;
        }
        else {
            $.extend(job.result, reply.result);
        }

        if (reply.newmissingkeys) {
            job.newmissingkeys = newmissingkeys = true;
            $.extend(missingkeys, reply.missingkeys);
        }
        if (reply.rsa2aes) {
            $.extend(rsa2aes, reply.rsa2aes);
        }
        if (reply.u_sharekeys) {
            $.extend(u_sharekeys, reply.u_sharekeys);
        }
        if (reply.rsasharekeys) {
            $.extend(rsasharekeys, reply.rsasharekeys);
        }

        Soon(this.postNext.bind(this));
        if (++job.done === this.nworkers) {
            if (d) {
                console.timeEnd(reply.jid);
            }

            // Don't report `newmissingkeys` unless there are *new* missing keys
            if (job.newmissingkeys) {
                job.newmissingkeys = M.checkNewMissingKeys();
            }

            delete this.jobs[reply.jid];
            job.callback(job.result, job);
        }

        return true;
    }
};

function mRandomToken(pfx) {
    return (pfx || '!') + '$' + (Math.random() * Date.now()).toString(36);
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

function setupTransferAnalysis() {
    if ($.mTransferAnalysis) {
        return;
    }
    var PROC_INTERVAL = 4.2 * 60 * 1000;
    var logger = MegaLogger.getLogger('TransferAnalysis');

    var prev = {},
        tlen = {},
        time = {},
        chunks = {};
    $.mTransferAnalysis = setInterval(function() {
        if (uldl_hold || dlmanager.isOverQuota) {
            prev = {};
        }
        else if ($.transferprogress) {
            var tp = $.transferprogress;

            for (var i in tp) {
                if (tp.hasOwnProperty(i)) {
                    var currentlyTransfered = tp[i][0];
                    var totalToBeTransfered = tp[i][1];
                    var currenTransferSpeed = tp[i][2];

                    var finished = (currentlyTransfered === totalToBeTransfered);

                    if (finished) {
                        logger.info('Transfer "%s" has finished. \uD83D\uDC4D', i);
                        continue;
                    }

                    var transfer = Object(GlobalProgress[i]);

                    if (transfer.paused || !transfer.started) {
                        logger.info('Transfer "%s" is not active.', i, transfer);
                        continue;
                    }

                    if (prev[i] && prev[i] === currentlyTransfered) {
                        var type = (i[0] === 'u'
                            ? 'Upload'
                            : (i[0] === 'z' ? 'ZIP' : 'Download'));

                        srvlog(type + ' transfer seems stuck.');

                        logger.warn('Transfer "%s" had no progress for the last minutes...', i, transfer);
                    }
                    else {
                        logger.info('Transfer "%s" is in progress... %d% completed', i,
                            Math.floor(currentlyTransfered / totalToBeTransfered * 100));

                        time[i] = Date.now();
                        tlen[i] = Math.max(tlen[i] | 0, currentlyTransfered);
                        prev[i] = currentlyTransfered;
                    }
                }
            }
        }
    }, PROC_INTERVAL);
}

function percent_megatitle() {
    var dl_r = 0,
        dl_t = 0,
        ul_r = 0,
        ul_t = 0,
        tp = $.transferprogress || {},
        dl_s = 0,
        ul_s = 0,
        zips = {},
        d_deg = 0,
        u_deg = 0;

    for (var i in dl_queue) {
        if (dl_queue.hasOwnProperty(i)) {
            var q = dl_queue[i];
            var t = q && tp[q.zipid ? 'zip_' + q.zipid : 'dl_' + q.id];

            if (t) {
                dl_r += t[0];
                dl_t += t[1];
                if (!q.zipid || !zips[q.zipid]) {
                    if (q.zipid) {
                        zips[q.zipid] = 1;
                    }
                    dl_s += t[2];
                }
            }
            else {
                dl_t += q && q.size || 0;
            }
        }
    }

    for (var i in ul_queue) {
        if (ul_queue.hasOwnProperty(i)) {
            var t = tp['ul_' + ul_queue[i].id]

            if (t) {
                ul_r += t[0];
                ul_t += t[1];
                ul_s += t[2];
            }
            else {
                ul_t += ul_queue[i].size || 0;
            }
        }
    }
    if (dl_t) {
        dl_t += tp['dlc'] || 0;
        dl_r += tp['dlc'] || 0
    }
    if (ul_t) {
        ul_t += tp['ulc'] || 0;
        ul_r += tp['ulc'] || 0
    }

    var x_ul = Math.floor(ul_r / ul_t * 100) || 0,
        x_dl = Math.floor(dl_r / dl_t * 100) || 0

    if (dl_t && ul_t) {
        t = ' \u2191 ' + x_dl + '% \u2193 ' + x_ul + '%';
    }
    else if (dl_t) {
        t = ' ' + x_dl + '%';
    }
    else if (ul_t) {
        t = ' ' + x_ul + '%';
    }
    else {
        t = '';
        $.transferprogress = {};
    }

    d_deg = 360 * x_dl / 100;
    u_deg = 360 * x_ul / 100;
    if (d_deg <= 180) {
        $('.download .nw-fm-chart0.right-c p').css('transform', 'rotate(' + d_deg + 'deg)');
        $('.download .nw-fm-chart0.left-c p').css('transform', 'rotate(0deg)');
    }
    else {
        $('.download .nw-fm-chart0.right-c p').css('transform', 'rotate(180deg)');
        $('.download .nw-fm-chart0.left-c p').css('transform', 'rotate(' + (d_deg - 180) + 'deg)');
    }
    if (u_deg <= 180) {
        $('.upload .nw-fm-chart0.right-c p').css('transform', 'rotate(' + u_deg + 'deg)');
        $('.upload .nw-fm-chart0.left-c p').css('transform', 'rotate(0deg)');
    }
    else {
        $('.upload .nw-fm-chart0.right-c p').css('transform', 'rotate(180deg)');
        $('.upload .nw-fm-chart0.left-c p').css('transform', 'rotate(' + (u_deg - 180) + 'deg)');
    }

    megatitle(t);
}

function hostname(url) {
    if (d) {
        ASSERT(url && /^http/.test(url), 'Invalid URL passed to hostname() -> ' + url);
    }
    url = ('' + url).match(/https?:\/\/([^.]+)/);
    return url && url[1];
}

// Quick hack for sane average speed readings
function bucketspeedometer(initialp) {
    return {
        interval: 200,
        num: 300,
        prevp: initialp,
        h: {},
        progress: function(p) {
            var now, min, oldest;
            var total;
            var t;

            now = NOW();
            now -= now % this.interval;

            this.h[now] = (this.h[now] || 0) + p - this.prevp;
            this.prevp = p;

            min = now - this.interval * this.num;

            oldest = now;
            total = 0;

            for (t in this.h) {
                if (t < min) {
                    delete this.h.bt;
                }
                else {
                    if (t < oldest) {
                        oldest = t;
                    }
                    total += this.h[t];
                }
            }

            if (now - oldest < 1000) {
                return 0;
            }

            p = 1000 * total / (now - oldest);

            // protect against negative returns due to repeated chunks etc.
            return p > 0 ? p : 0;
        }
    }
}

function moveCursortoToEnd(el) {
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
    $(el).focus();
}

function asyncApiReq(data) {
    var $promise = new MegaPromise();
    api_req(data, {
        callback: function(r) {
            if (typeof r === 'number' && r !== 0) {
                $promise.reject.apply($promise, arguments);
            }
            else {
                $promise.resolve.apply($promise, arguments);
            }
        }
    });

    //TODO: fail case?! e.g. the exp. backoff failed after waiting for X minutes??

    return $promise;
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

function disableDescendantFolders(id, pref) {
    var folders = [];
    for (var i in M.c[id]) {
        if (M.d[i] && M.d[i].t === 1 && M.d[i].name) {
            folders.push(M.d[i]);
        }
    }
    for (var i in folders) {
        var sub = false;
        var fid = folders[i].h;

        for (var h in M.c[fid]) {
            if (M.d[h] && M.d[h].t) {
                sub = true;
                break;
            }
        }
        $(pref + fid).addClass('disabled');
        if (sub) {
            this.disableDescendantFolders(fid, pref);
        }
    }

    return true;
}

var obj_values = function obj_values(obj) {
    var vals = [];

    Object.keys(obj).forEach(function(memb) {
        if (obj.hasOwnProperty(memb)) {
            vals.push(obj[memb]);
        }
    });

    return vals;
}

if (typeof Object.values === 'function') {
    obj_values = Object.values;
}

function _wrapFnWithBeforeAndAfterEvents(fn, eventSuffix, dontReturnPromises) {
    var logger = MegaLogger.getLogger("beforeAfterEvents: " + eventSuffix);

    return function() {
        var self = this;
        var args = toArray.apply(null, arguments);

        var event = new $.Event("onBefore" + eventSuffix);
        self.trigger(event, args);

        if (event.isPropagationStopped()) {
            logger.debug("Propagation stopped for event: ", event);
            if (dontReturnPromises) {
                return false;
            }
            else {
                return MegaPromise.reject("Propagation stopped by onBefore" + eventSuffix);
            }

        }
        if (typeof event.returnedValue !== "undefined") {
            args = event.returnedValue;
        }

        var returnedValue = fn.apply(self, args);

        var done = function() {
            var event2 = new $.Event("onAfter" + eventSuffix);
            self.trigger(event2, args.concat(returnedValue));

            if (event2.isPropagationStopped()) {
                logger.debug("Propagation stopped for event: ", event);
                if (dontReturnPromises) {
                    return false;
                }
                else {
                    return MegaPromise.reject("Propagation stopped by onAfter" + eventSuffix);
                }
            }
        };

        if (returnedValue && returnedValue.then) {
            returnedValue.then(function() {
                done();
            });
        }
        else {
            done();
        }

        return returnedValue;
    }
}

function hex2bin(hex) {
    var bytes = [];

    for (var i = 0; i < hex.length - 1; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }

    return String.fromCharCode.apply(String, bytes);
}

/**
 * Detects if Flash is enabled or disabled in the user's browser
 * From http://stackoverflow.com/a/20095467
 * @returns {Boolean}
 */
function flashIsEnabled() {

    var flashEnabled = false;

    try {
        var flashObject = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
        if (flashObject) {
            flashEnabled = true;
        }
    }
    catch (e) {
        if (navigator.mimeTypes
                && (navigator.mimeTypes['application/x-shockwave-flash'] !== undefined)
                && (navigator.mimeTypes['application/x-shockwave-flash'].enabledPlugin)) {
            flashEnabled = true;
        }
    }

    return flashEnabled;
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
    return (l.origin !== 'null' && l.origin || (l.protocol + '//' + l.hostname)) + l.pathname;
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
        var unit;
        var v = dur[i];
        if (v === "0") {
            if (durStr.length !== 0 && i !== 0) {
                continue;
            }
            else if (i < 2) {
                continue;
            }
        }

        if (i === 0) {
            unit = v !== 1 ? "hours" : "hour";
        }
        else if (i === 1) {
            unit = v !== 1 ? "minutes" : "minute";
        }
        else if (i === 2) {
            unit = v !== 1 ? "seconds" : "second";
        }
        else {
            throw new Error("this should never happen.");
        }

        durStr += v + " " + unit + sep;
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
        report.karereState = megaChat.karere.getConnectionState();
        report.karereCurrentConnRetries = megaChat.karere._connectionRetries;
        report.myPresence = megaChat.karere.getPresence(megaChat.karere.getJid());
        report.karereServer = megaChat.karere.connection.service;
        report.numOpenedChats = Object.keys(megaChat.chats).length;
        report.haveRtc = megaChat.rtc ? true : false;
        if (report.haveRtc) {
            report.rtcStatsAnonymousId = megaChat.rtc.ownAnonId;
        }
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
                var cc = megaChat.getContactFromJid(v);
                if (cc && cc.u && !userAnonMap[cc.u]) {
                    userAnonMap[cc.u] = {
                        anonId: userAnonIdx++ + rand(1000),
                        pres: megaChat.karere.getPresence(v)
                    };
                }
                participants[k] = cc && cc.u ? userAnonMap[cc.u] : v;
            });

            var r = {
                'roomUniqueId': roomUniqueId,
                'roomState': v.getStateAsText(),
                'roomParticipants': participants
            };

            chatStates[roomUniqueId] = r;
            roomUniqueIdMap[k] = roomUniqueId;
            roomUniqueId++;
        });

        if (report.haveRtc) {
            Object.keys(megaChat.plugins.callManager.callSessions).forEach(function (k) {
                var v = megaChat.plugins.callManager.callSessions[k];

                var r = {
                    'callStats': v.callStats,
                    'state': v.state
                };

                var roomIdx = roomUniqueIdMap[v.room.roomJid];
                if (!roomIdx) {
                    roomUniqueId += 1; // room which was closed, create new tmp id;
                    roomIdx = roomUniqueId;
                }
                if (!chatStates[roomIdx]) {
                    chatStates[roomIdx] = {};
                }
                if (!chatStates[roomIdx].callSessions) {
                    chatStates[roomIdx].callSessions = [];
                }
                chatStates[roomIdx].callSessions.push(r);
            });
        };

        report.chatRoomState = chatStates;
    };

    if (is_chrome_firefox) {
        report.mo = mozBrowserID + '::' + is_chrome_firefox + '::' + mozMEGAExtensionVersion;
    }

    var apireqHaveBackOffs = {};
    apixs.forEach(function(v, k) {
        if (v.backoff > 0) {
            apireqHaveBackOffs[k] = v.backoff;
        }
    });

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
    report.scripts = {};
    report.host = window.location.host;

    var promises = [];

    $('script').each(function() {
        var self = this;
        var src = self.src.replace(window.location.host, "$current");
        if (is_chrome_firefox) {
            if (!promises.length) {
                promises.push(MegaPromise.resolve());
            }
            report.scripts[self.src] = false;
            return;
        }
        promises.push(
            $.ajax({
                url: self.src,
                dataType: "text"
            })
            .done(function(r) {
                report.scripts[src] = [
                        MurmurHash3(r, 0x4ef5391a),
                        r.length
                    ];
            })
            .fail(function(r) {
                report.scripts[src] = false;
            })
        );
    });

    report.version = null; // TODO: how can we find this?

    MegaPromise.allDone(promises)
        .done(function() {
            $promise.resolve(report);
        })
        .fail(function() {
            $promise.resolve(report)
        });

    return $promise;
}

function __(s) { // TODO: waiting for @crodas to commit the real __ code.
    return s;
}

function MegaEvents() {}
MegaEvents.prototype.trigger = function(name, args) {
    if (!(this._events && this._events.hasOwnProperty(name))) {
        return false;
    }

    if (d > 1) {
        console.log(' >>> Triggering ' + name, this._events[name].length, args);
    }

    args = args || []
    var done = 0,
        evs = this._events[name];
    for (var i in evs) {
        try {
            evs[i].apply(null, args);
        }
        catch (ex) {
            console.error(ex);
        }
        ++done;
    }
    return done;
};
MegaEvents.prototype.on = function(name, callback) {
    if (!this._events) {
        this._events = {};
    }
    if (!this._events.hasOwnProperty(name)) {
        this._events[name] = [];
    }
    this._events[name].push(callback);
    return this;
};

(function(scope) {
    var MegaAnalytics = function(id) {
        this.loggerId = id;
        this.sessionId = makeid(16);
    };
    MegaAnalytics.prototype.log = function(c, e, data) {

        data = data || {};
        data = $.extend(
            true, {}, {
                'aid': this.sessionId,
                'lang': typeof lang !== 'undefined' ? lang : null,
                'browserlang': navigator.language,
                'u_type': typeof u_type !== 'undefined' ? u_type : null
            },
            data
        );

        var msg = JSON.stringify({
            'c': c,
            'e': e,
            'data': data
        });

        if (d) {
            console.log("megaAnalytics: ", c, e, data);
        }
        if (window.location.toString().indexOf("mega.dev") !== -1) {
            return;
        }
        api_req({
            a: 'log',
            e: this.loggerId,
            m: msg
        }, {});
    };
    scope.megaAnalytics = new MegaAnalytics(99999);
})(this);


function constStateToText(enumMap, state) {
    var txt = false;
    $.each(enumMap, function(k, v) {
        if (state == v) {
            txt = k;

            return false; // break
        }
    });

    return txt === false ? "(not found: " + state + ")" : txt;
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

Object.defineProperty(mega, 'logger', {value: MegaLogger.getLogger('mega')});
Object.defineProperty(mega.utils, 'logger', {value: MegaLogger.getLogger('utils', null, mega.logger)});

Object.defineProperty(mega, 'api', {
    value: Object.freeze({
        logger: new MegaLogger('API'),

        setDomain: function(aDomain, aSave) {
            apipath = 'https://' + aDomain + '/';

            if (aSave) {
                localStorage.apipath = apipath;
            }
        },

        staging: function(aSave) {
            this.setDomain('staging.api.mega.co.nz', aSave);
        },
        prod: function(aSave) {
            this.setDomain('eu.api.mega.co.nz', aSave);
        },

        req: function(params) {
            var promise = new MegaPromise();

            if (typeof params === 'string') {
                params = {a: params};
            }

            api_req(params, {
                callback: function(res) {
                    if (typeof res === 'number' && res < 0) {
                        promise.reject.apply(promise, arguments);
                    }
                    else {
                        promise.resolve.apply(promise, arguments);
                    }
                }
            });

            return promise;
        }
    })
});

/**
 * execCommandUsable
 *
 * Native browser 'copy' command using execCommand('copy').
 * Supported by Chrome42+, FF41+, IE9+, Opera29+
 * @returns {Boolean}
 */
mega.utils.execCommandUsable = function() {
    var result;

    try {
        return document.queryCommandSupported("copy");
    }
    catch (ex) {
        try {
            result = document.execCommand('copy');
        }
        catch (ex) {}
    }

    return result === false;
};

/**
 * Utility that will return a sorting function (can compare numbers OR strings, depending on the data stored in the
 * obj), that can sort an array of objects.
 * @param key {String|Function} the name of the property that will be used for the sorting OR a func that will return a
 * dynamic value for the object
 * @param [order] {Number} 1 for asc, -1 for desc sorting
 * @param [alternativeFn] {Function} Optional function to be used for comparison of A and B if both are equal or
 *      undefined
 * @returns {Function}
 */
mega.utils.sortObjFn = function(key, order, alternativeFn) {
    if (!order) {
        order = 1;
    }

    return function(a, b, tmpOrder) {
        var currentOrder = tmpOrder ? tmpOrder : order;

        if ($.isFunction(key)) {
            aVal = key(a);
            bVal = key(b);
        }
        else {
            aVal = a[key];
            bVal = b[key];
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
            return aVal.localeCompare(bVal) * currentOrder;
        }
        else if (typeof aVal === 'string' && typeof bVal === 'undefined') {
            return 1 * currentOrder;
        }
        else if (typeof aVal === 'undefined' && typeof bVal === 'string') {
            return -1 * currentOrder;
        }
        else if (typeof aVal === 'number' && typeof bVal === 'undefined') {
            return 1 * currentOrder;
        }
        else if (typeof aVal === 'undefined' && typeof bVal === 'number') {
            return -1 * currentOrder;
        }
        else if (typeof aVal === 'undefined' && typeof bVal === 'undefined') {
            if (alternativeFn) {
                return alternativeFn(a, b, currentOrder);
            }
            else {
                return -1 * currentOrder;
            }
        }
        else if (typeof aVal === 'number' && typeof bVal === 'number') {
            var _a = aVal || 0;
            var _b = bVal || 0;
            if (_a > _b) {
                return 1 * currentOrder;
            }
            if (_a < _b) {
                return -1 * currentOrder;
            } else {
                if (alternativeFn) {
                    return alternativeFn(a, b, currentOrder);
                }
                else {
                    return 0;
                }
            }
        }
        else return 0;
    };
};


/**
 * This is an utility function that would simply do a localCompare OR use Intl.Collator for comparing 2 strings.
 *
 * @param stringA {String} String A
 * @param stringB {String} String B
 * @param direction {Number} -1 or 1, for inversing the direction for sorting (which is most of the cases)
 * @returns {Number}
 */
mega.utils.compareStrings = function megaUtilsCompareStrings(stringA, stringB, direction) {

    if (typeof Intl !== 'undefined' && Intl.Collator) {
        var intl = new Intl.Collator('co', { numeric: true });
        return intl.compare(stringA || '', stringB || '') * direction;
    }
    else {
        return (stringA || '').localeCompare(stringB || '') * direction;
    }
};

/**
 * Promise-based XHR request
 * @param {Object|String} aURLOrOptions   URL or options
 * @param {Object|String} [aData]         Data to send, optional
 * @returns {MegaPromise}
 */
mega.utils.xhr = function megaUtilsXHR(aURLOrOptions, aData) {
    /* jshint -W074 */
    var xhr;
    var url;
    var method;
    var options;
    var promise = new MegaPromise();

    if (typeof aURLOrOptions === 'object') {
        options = aURLOrOptions;
        url = options.url;
    }
    else {
        options = {};
        url = aURLOrOptions;
    }
    aURLOrOptions = undefined;

    aData = options.data || aData;
    method = options.method || (aData && 'POST') || 'GET';

    xhr = getxhr();

    if (typeof options.prepare === 'function') {
        options.prepare(xhr);
    }

    xhr.onloadend = function(ev) {
        if (this.status === 200) {
            promise.resolve(ev, this.response);
        }
        else {
            promise.reject(ev);
        }
    };

    try {
        if (d) {
            MegaLogger.getLogger('muXHR').info(method + 'ing', url, options, aData);
        }
        xhr.open(method, url);

        if (options.type) {
            xhr.responseType = options.type;
            if (xhr.responseType !== options.type) {
                xhr.abort();
                throw new Error('Unsupported responseType');
            }
        }

        if (typeof options.beforeSend === 'function') {
            options.beforeSend(xhr);
        }

        if (is_chrome_firefox) {
            xhr.setRequestHeader('Origin', getBaseUrl(), false);
        }

        xhr.send(aData);
    }
    catch (ex) {
        promise.reject(ex);
    }

    xhr = options = undefined;

    return promise;
};

/**
 *  Retrieve a call stack
 *  @return {String}
 */
mega.utils.getStack = function megaUtilsGetStack() {
    var stack;

    if (is_chrome_firefox) {
        stack = Components.stack.formattedStack;
    }

    if (!stack) {
        stack = (new Error()).stack;

        if (!stack) {
            try {
                throw new Error();
            }
            catch(e) {
                stack = e.stack;
            }
        }
    }

    return stack;
};

/**
 *  Check whether there are pending transfers.
 *
 *  @return {Boolean}
 */
mega.utils.hasPendingTransfers = function megaUtilsHasPendingTransfers() {
    return ((fminitialized && ulmanager.isUploading) || dlmanager.isDownloading);
};

/**
 *  Abort all pending transfers.
 *
 *  @return {Promise}
 *          Resolved: Transfers were aborted
 *          Rejected: User canceled confirmation dialog
 *
 *  @details This needs to be used when an operation requires that
 *           there are no pending transfers, such as a logout.
 */
mega.utils.abortTransfers = function megaUtilsAbortTransfers() {
    var promise = new MegaPromise();

    if (!mega.utils.hasPendingTransfers()) {
        promise.resolve();
    }
    else {
        msgDialog('confirmation', l[967], l[377] + ' ' + l[507] + '?', false, function(doIt) {
            if (doIt) {
                if (dlmanager.isDownloading) {
                    dlmanager.abort(null);
                }
                if (ulmanager.isUploading) {
                    ulmanager.abort(null);
                }

                mega.utils.resetUploadDownload();
                loadingDialog.show();
                var timer = setInterval(function() {
                    if (!mega.utils.hasPendingTransfers()) {
                        clearInterval(timer);
                        promise.resolve();
                    }
                }, 350);
            }
            else {
                promise.reject();
            }
        });
    }

    return promise;
};

/**
 * On transfers completion cleanup
 */
mega.utils.resetUploadDownload = function megaUtilsResetUploadDownload() {
    if (!ul_queue.some(isQueueActive)) {
        ul_queue = new UploadQueue();
        ulmanager.isUploading = false;
        ASSERT(ulQueue._running === 0, 'ulQueue._running inconsistency on completion');
        ulQueue._pending = [];
        ulQueue.setSize((fmconfig.ul_maxSlots | 0) || 4);
    }
    if (!dl_queue.some(isQueueActive)) {
        dl_queue = new DownloadQueue();
        dlmanager.isDownloading = false;

        delay.cancel('overquota:retry');
        delay.cancel('overquota:uqft');

        dlmanager._quotaPushBack = {};
        dlmanager._dlQuotaListener = [];
    }

    if (!dlmanager.isDownloading && !ulmanager.isUploading) {
        clearTransferXHRs(); /* destroy all xhr */

        $('.transfer-pause-icon').addClass('disabled');
        $('.nw-fm-left-icon.transfers').removeClass('transfering');
        $('.transfers .nw-fm-percentage li p').css('transform', 'rotate(0deg)');
        M.tfsdomqueue = {};
        GlobalProgress = {};
        delete $.transferprogress;
        if (page !== 'download') {
            fm_tfsupdate();
        }
        if ($.mTransferAnalysis) {
            clearInterval($.mTransferAnalysis);
            delete $.mTransferAnalysis;
        }
        $('.transfer-panel-title').text('');
        dlmanager.dlRetryInterval = 3000;
    }

    if (d) {
        dlmanager.logger.info("resetUploadDownload", ul_queue.length, dl_queue.length);
    }

    if (page === 'download') {
        delay('percent_megatitle', percent_megatitle);
    }
};

/**
 *  Reload the site cleaning databases & session/localStorage.
 *
 *  Under non-activated/registered accounts this
 *  will perform a former normal cloud reload.
 */
mega.utils.reload = function megaUtilsReload() {
    function _reload() {
        var u_sid = u_storage.sid;
        var u_key = u_storage.k;
        var privk = u_storage.privk;
        var jj = localStorage.jj;
        var debug = localStorage.d;
        var mcd = localStorage.testChatDisabled;
        var apipath = debug && localStorage.apipath;

        localStorage.clear();
        sessionStorage.clear();

        if (u_sid) {
            u_storage.sid = u_sid;
            u_storage.privk = privk;
            u_storage.k = u_key;
            localStorage.wasloggedin = true;
        }

        if (debug) {
            localStorage.d = 1;
            localStorage.minLogLevel = 0;

            if (location.host !== 'mega.nz') {
                localStorage.dd = true;
                if (!is_extension && jj)  {
                    localStorage.jj = jj;
                }
            }
            if (apipath) {
                // restore api path across reloads, only for debugging purposes...
                localStorage.apipath = apipath;
            }
        }

        if (mcd) {
            localStorage.testChatDisabled = 1;
        }
        if (hashLogic) {
            localStorage.hashLogic = 1;
        }

        localStorage.force = true;
        location.reload(true);
    }

    if (u_type !== 3 && page !== 'download') {
        stopsc();
        stopapi();
        loadfm(true);
    }
    else {
        // Show message that this operation will destroy the browser cache and reload the data stored by MEGA
        msgDialog('confirmation', l[761], l[7713], l[6994], function(doIt) {
            if (doIt) {
                var reload = function() {
                    if (mBroadcaster.crossTab.master || page === 'download') {
                        mega.utils.abortTransfers().then(function() {
                            loadingDialog.show();
                            stopsc();
                            stopapi();

                            MegaPromise.allDone([
                                mega.utils.clearFileSystemStorage()
                            ]).then(function(r) {
                                    console.debug('megaUtilsReload', r);
                                    if (fmdb) {
                                        fmdb.invalidate(_reload);
                                    }
                                    else {
                                        _reload();
                                    }
                                });
                        });
                    }
                };
                if (!mBroadcaster.crossTab.master || mBroadcaster.crossTab.slaves.length) {
                    msgDialog('warningb', l[882], l[7157], 0, reload);
                }
                else {
                    reload();
                }
            }
        });
    }
};

/**
 * Clear the data on FileSystem storage.
 *
 * mega.utils.clearFileSystemStorage().always(console.debug.bind(console));
 */
mega.utils.clearFileSystemStorage = function megaUtilsClearFileSystemStorage() {
    function _done(status) {
        if (promise) {
            if (status !== 0x7ffe) {
                promise.reject(status);
            }
            else {
                promise.resolve();
            }
            promise = undefined;
        }
    }

    if (is_chrome_firefox || !window.requestFileSystem) {
        return MegaPromise.resolve();
    }

    setTimeout(function() {
        _done();
    }, 4000);

    var promise = new MegaPromise();

    (function _clear(storagetype) {
        function onInitFs(fs) {
            var dirReader = fs.root.createReader();
            dirReader.readEntries(function (entries) {
                for (var i = 0, entry; entry = entries[i]; ++i) {
                    if (entry.isDirectory && entry.name === 'mega') {
                        console.debug('Cleaning storage...', entry);
                        entry.removeRecursively(_next.bind(null, 0x7ffe), _next);
                        break;
                    }
                }
            });
        }
        function _next(status) {
            if (storagetype === 0) {
                _clear(1);
            }
            else {
                _done(status);
            }
        }
        window.requestFileSystem(storagetype, 1024, onInitFs, _next);
    })(0);

    return promise;
};

/**
 * Neuter an ArrayBuffer
 * @param {Mixed} ab ArrayBuffer/TypedArray
 */
mega.utils.neuterArrayBuffer = function neuter(ab) {
    if (!(ab instanceof ArrayBuffer)) {
        ab = ab && ab.buffer;
    }
    try {
        if (typeof ArrayBuffer.transfer === 'function') {
            ArrayBuffer.transfer(ab, 0); // ES7
        }
        else {
            if (!neuter.dataWorker) {
                neuter.dataWorker = new Worker("data:application/javascript,var%20d%3B");
            }
            neuter.dataWorker.postMessage(ab, [ab]);
        }
        if (ab.byteLength !== 0) {
            throw new Error('Silently failed! -- ' + ua);
        }
    }
    catch (ex) {
        if (d) {
            console.warn('Cannot neuter ArrayBuffer', ab, ex);
        }
    }
};

/**
 * Resources loader through our secureboot mechanism
 * @param {...*} var_args  Resources to load, either plain filenames or jsl2 members
 * @return {MegaPromise}
 */
mega.utils.require = function megaUtilsRequire() {
    var files = [];
    var args = [];
    var logger = d && MegaLogger.getLogger('require', 0, this.logger);

    toArray.apply(null, arguments).forEach(function(rsc) {
        // check if a group of resources was provided
        if (jsl3[rsc]) {
            var group = Object.keys(jsl3[rsc]);

            args = args.concat(group);

            // inject them into jsl2
            for (var i = group.length; i--;) {
                if (!jsl2[group[i]]) {
                    (jsl2[group[i]] = jsl3[rsc][group[i]]).n = group[i];
                }
            }
        }
        else {
            args.push(rsc);
        }
    });

    args.forEach(function(file) {

        // If a plain filename, inject it into jsl2
        // XXX: Likely this will have a conflict with our current build script
        if (!jsl2[file]) {
            var filename = file.replace(/^.*\//, '');
            var extension = filename.split('.').pop().toLowerCase();
            var name = filename.replace(/\./g, '_');
            var type;

            if (extension === 'html') {
                type = 0;
            }
            else if (extension === 'js') {
                type = 1;
            }
            else if (extension === 'css') {
                type = 2;
            }

            jsl2[name] = { f: file, n: name, j: type };
            file = name;
        }

        if (!jsl_loaded[jsl2[file].n]) {
            files.push(jsl2[file]);
        }
    });

    if (files.length === 0) {
        // Everything is already loaded
        if (logger) {
            logger.debug('Nothing to load.', args);
        }
        return MegaPromise.resolve();
    }

    var promise = new MegaPromise();
    var rl = mega.utils.require.loading;
    var rp = mega.utils.require.pending;
    var loading = Object.keys(rl).length;

    // Check which files are already being loaded
    for (var i = files.length; i--;) {
        var f = files[i];

        if (rl[f.n]) {
            // loading, remove it.
            files.splice(i, 1);
        }
        else {
            // not loading, track it.
            rl[f.n] = mega.utils.getStack();
        }
    }

    // hold up if other files are loading
    if (loading) {
        rp.push([files, promise]);

        if (logger) {
            logger.debug('Queueing %d files...', files.length, args);
        }
    }
    else {

        (function _load(files, promise) {
            var onload = function() {
                // all files have been loaded, remove them from the tracking queue
                for (var i = files.length; i--;) {
                    delete rl[files[i].n];
                }

                if (logger) {
                    logger.debug('Finished loading %d files...', files.length, files);
                }

                // resolve promise, in a try/catch to ensure the caller doesn't mess us..
                try {
                    promise.resolve();
                }
                catch (ex) {
                    (logger || console).error(ex);
                }

                // check if there is anything pending, and fire it.
                var pending = rp.shift();

                if (pending) {
                    _load.apply(null, pending);
                }
            };

            if (logger) {
                logger.debug('Loading %d files...', files.length, files);
            }

            if (!files.length) {
                // nothing to load
                onload();
            }
            else {
                Array.prototype.push.apply(jsl, files);
                silent_loading = onload;
                jsl_start();
            }
        })(files, promise);
    }
    return promise;
};
mega.utils.require.pending = [];
mega.utils.require.loading = Object.create(null);

/**
 *  Kill session and Logout
 */
mega.utils.logout = function megaUtilsLogout() {
    mega.utils.abortTransfers().then(function() {
        var finishLogout = function() {
            if (--step === 0) {
                u_logout(true);
                location.reload();
            }
        }, step = 1;

        loadingDialog.show();
        if (fmdb && fmconfig.dbDropOnLogout) {
            step++;
            fmdb.drop().always(finishLogout);
        }
        if (!megaChatIsDisabled) {
            if (typeof(megaChat) !== 'undefined' && typeof(megaChat.userPresence) !== 'undefined') {
                megaChat.userPresence.disconnect();
            }
        }
        if (u_privk && !loadfm.loading) {
            // Use the 'Session Management Logout' API call to kill the current session
            api_req({ 'a': 'sml' }, { callback: finishLogout });
        }
        else {
            finishLogout();
        }
    });
};

/**
 * Convert a version string (eg, 2.1.1) to an integer, for easier comparison
 * @param {String}  version The version string
 * @param {Boolean} hex     Whether give an hex result
 * @return {Number|String}
 */
mega.utils.vtol = function megaUtilsVTOL(version, hex) {
    version = String(version).split('.');

    while (version.length < 4) {
        version.push(0);
    }

    version = ((version[0] | 0) & 0xff) << 24 |
              ((version[1] | 0) & 0xff) << 16 |
              ((version[2] | 0) & 0xff) <<  8 |
              ((version[3] | 0) & 0xff);

    version >>>= 0;

    if (hex) {
        return version.toString(16);
    }

    return version;
};

/**
 * Retrieve data from storage servers.
 * @param {String|Object} aData           ufs-node's handle or public link
 * @param {Number}        [aStartOffset]  offset to start retrieveing data from
 * @param {Number}        [aEndOffset]    retrieve data until this offset
 * @param {Function}      [aProgress]     callback function which is called with the percent complete
 * @returns {MegaPromise}
 */
mega.utils.gfsfetch = function gfsfetch(aData, aStartOffset, aEndOffset, aProgress) {
    var promise = new MegaPromise();

    var fetcher = function(data) {

        if (aEndOffset === -1) {
            aEndOffset = data.s;
        }

        aEndOffset = parseInt(aEndOffset);
        aStartOffset = parseInt(aStartOffset);

        if ((!aStartOffset && aStartOffset !== 0)
                || aStartOffset > data.s || !aEndOffset
                || aEndOffset < aStartOffset) {

            return promise.reject(ERANGE, data);
        }
        var byteOffset = aStartOffset % 16;

        if (byteOffset) {
            aStartOffset -= byteOffset;
        }

        var request = {
            method: 'POST',
            type: 'arraybuffer',
            url: data.g + '/' + aStartOffset + '-' + (aEndOffset - 1)
        };

        if (typeof aProgress === 'function') {
            request.prepare = function(xhr) {
                xhr.addEventListener('progress', function(ev) {
                    if (ev.lengthComputable) {

                        // Calculate percentage downloaded e.g. 49.23
                        var percentComplete = ((ev.loaded / ev.total) * 100);
                        var bytesLoaded = ev.loaded;
                        var bytesTotal = ev.total;

                        // Pass the percent complete to the callback function
                        aProgress(percentComplete, bytesLoaded, bytesTotal);
                    }
                }, false);
            };
        }

        mega.utils.xhr(request).done(function(ev, response) {

            data.macs = [];
            data.writer = [];

            if (!data.nonce) {
                var key = data.key;

                data.nonce = JSON.stringify([
                    key[0] ^ key[4],
                    key[1] ^ key[5],
                    key[2] ^ key[6],
                    key[3] ^ key[7],
                    key[4],  key[5]]);
            }

            Decrypter.unshift([
                [data, aStartOffset],
                data.nonce,
                aStartOffset / 16,
                new Uint8Array(response)
            ], function resolver() {
                try {
                    var buffer = data.writer.shift().data.buffer;

                    if (byteOffset) {
                        buffer = buffer.slice(byteOffset);
                    }

                    data.buffer = buffer;
                    promise.resolve(data);
                }
                catch (ex) {
                    promise.reject(ex);
                }
            });

        }).fail(function() {
            promise.reject.apply(promise, arguments);
        });
    };

    if (typeof aData !== 'object') {
        var key;
        var handle;

        // If a ufs-node's handle provided
        if (String(aData).length === 8) {
            handle = aData;
        }
        else {
            // if a public-link provided, eg #!<handle>!<key>
            aData = String(aData).replace(/^.*?#!/, '').split('!');

            if (aData.length === 2 && aData[0].length === 8) {
                handle = aData[0];
                key = base64_to_a32(aData[1]).slice(0, 8);
            }
        }

        if (!handle) {
            promise.reject(EARGS);
        }
        else {
            var callback = function(res) {
                if (typeof res === 'object' && res.g) {
                    res.key = key;
                    res.handle = handle;
                    fetcher(res);
                }
                else {
                    promise.reject(res);
                }
            };
            var req = { a: 'g', g: 1, ssl: use_ssl };

            if (!key) {
                req.n = handle;
                key = M.getNodeByHandle(handle).k;
            }
            else {
                req.p = handle;
            }

            if (!Array.isArray(key) || key.length !== 8) {
                promise.reject(EKEY);
            }
            else {
                api_req(req, { callback: callback }, pfid ? 1 : 0);
            }
        }
    }
    else {
        fetcher(aData);
    }

    aData = undefined;

    return promise;
};

/**
 * Perform a normal logout
 *
 * @param {Function} aCallback optional
 */
function mLogout(aCallback) {
    var cnt = 0;
    if (M.c[M.RootID] && u_type === 0) {
        for (var i in M.c[M.RootID]) {
            cnt++;
        }
    }
    if (u_type === 0 && cnt > 0) {
        msgDialog('confirmation', l[1057], l[1058], l[1059], function (e) {
            if (e) {
                mega.utils.logout();
            }
        });
    }
    else {
        mega.utils.logout();
    }
}

/**
 * Perform a strict logout, by removing databases
 * and cleaning sessionStorage/localStorage.
 *
 * @param {String} aUserHandle optional
 */
function mCleanestLogout(aUserHandle) {
    if (u_type !== 0 && u_type !== 3) {
        throw new Error('Operation not permitted.');
    }

    mLogout(function() {
        MegaDB.dropAllDatabases(aUserHandle)
            .always(function(r) {
                console.debug('mCleanestLogout', r);

                localStorage.clear();
                sessionStorage.clear();

                setTimeout(function() {
                    location.reload(true);
                }, 7e3);
            });
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
                _proc();
            }, RUBSCHED_WAITPROC);
        }
    }

    function _proc() {

        // Do nothing unless the user has been idle
        if (Date.now() - lastactive < RUBSCHED_IDLETIME) {
            return;
        }

        _exit();

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
            rubnodes = rubnodes.concat(fm_getnodes(node.h, true));
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

                if (inRub) {
                    // Flush cached nodes
                    $(window).trigger('dynlist.flush');
                }

                handles.map(function(handle) {
                    M.delNode(handle, true);    // must not update DB pre-API
                    api_req({a: 'd', n: handle/*, i: requesti*/});

                    if (inRub) {
                        $('.grid-table.fm#' + handle).remove();
                        $('.file-block#' + handle).remove();
                    }
                });

                if (inRub) {
                    if (M.viewmode) {
                        iconUI();
                    }
                    else {
                        gridUI();
                    }
                    treeUI();
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
    }
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


/**
 * Cross-tab communication using WebStorage
 */
var watchdog = Object.freeze({
    Strg: {},
    // Tag prepended to messages to identify watchdog-events
    eTag: '$WDE$!_',
    // ID to identify tab's origin
    wdID: (Math.random() * Date.now()),
    // Hols promises waiting for a query reply
    queryQueue: {},
    // Holds query replies if cached
    replyCache: {},

    /** setup watchdog/webstorage listeners */
    setup: function() {
        if (window.addEventListener) {
            window.addEventListener('storage', this, false);
        }
        else if (window.attachEvent) {
            window.attachEvent('onstorage', this.handleEvent.bind(this));
        }
    },

    /**
     * Notify watchdog event/message
     * @param {String} msg  The message
     * @param {String} data Any data sent to other tabs, optional
     */
    notify: function(msg, data) {
        data = { origin: this.wdID, data: data, sid: Math.random()};
        localStorage.setItem(this.eTag + msg, JSON.stringify(data));
        if (d) {
            console.log('mWatchDog Notifying', this.eTag + msg, localStorage[this.eTag + msg]);
        }
    },

    /**
     * Perform a query to other tabs and wait for reply through a Promise
     * @param {String} what Parameter
     * @param {String} timeout ms
     * @param {String} cache   preserve result
     * @return {MegaPromise}
     */
    query: function(what, timeout, cache) {
        var self = this;
        var token = mRandomToken();
        var promise = new MegaPromise();

        if (this.replyCache[what]) {
            // a prior query was launched with the cache flag
            cache = this.replyCache[what];
            delete this.replyCache[what];
            return MegaPromise.resolve(cache);
        }

        if (!mBroadcaster.crossTab.master
                || Object(mBroadcaster.crossTab.slaves).length) {

            if (cache) {
                this.replyCache[what] = [];
            }
            this.queryQueue[token] = [];

            Soon(function() {
                self.notify('Q!' + what, { reply: token });
            });

            // wait for reply and fullfil/reject the promise
            setTimeout(function() {
                if (self.queryQueue[token].length) {
                    promise.resolve(self.queryQueue[token]);
                }
                else {
                    promise.reject(EACCESS);
                }
                delete self.queryQueue[token];
            }, timeout || 200);
        }
        else {
            promise = MegaPromise.reject(EEXIST);
        }

        return promise;
    },

    /** Handle watchdog/webstorage event */
    handleEvent: function(ev) {
        if (String(ev.key).indexOf(this.eTag) !== 0) {
            return;
        }
        if (d) {
            console.debug('mWatchDog ' + ev.type + '-event', ev.key, ev.newValue, ev);
        }

        var msg = ev.key.substr(this.eTag.length);
        var strg = JSON.parse(ev.newValue || '""');

        if (!strg || strg.origin === this.wdID) {
            if (d) {
                console.log('Ignoring mWatchDog event', msg, strg);
            }
            return;
        }

        switch (msg) {
            case 'Q!Rep!y':
                if (this.queryQueue[strg.data.token]) {
                    this.queryQueue[strg.data.token].push(strg.data.value);
                }
                if (this.replyCache[strg.data.query]) {
                    this.replyCache[strg.data.query].push(strg.data.value);
                }
                break;

            case 'Q!dlsize':
                this.notify('Q!Rep!y', {
                    query: 'dlsize',
                    token: strg.data.reply,
                    value: dlmanager.getCurrentDownloadsSize()
                });
                break;

            case 'loadfm_done':
                if (this.Strg.login === strg.origin) {
                    location.assign(location.pathname);
                }
                break;

            case 'setrsa':
                if (typeof dlmanager === 'object'
                        && dlmanager.isOverFreeQuota) {

                    var sid = strg.data[1];
                    var type = strg.data[0];

                    u_storage = init_storage(localStorage);
                    u_storage.sid = sid;

                    u_checklogin({
                        checkloginresult: function(ctx, r) {
                            u_type = r;

                            if (u_type !== type) {
                                console.error('Unexpected user-type: got %s, expected %s', r, type);
                            }

                            if (n_h) {
                                // set new u_sid under folderlinks
                                api_setfolder(n_h);

                                // hide ephemeral account warning
                                alarm.hideAllWarningPopups();
                            }

                            dlmanager._onQuotaRetry(true, sid);
                        }
                    });
                }
                break;

            case 'setsid':
                if (typeof dlmanager === 'object'
                        && dlmanager.isOverQuota) {

                    // another tab fired a login/register while this one has an overquota state
                    var sid = strg.data;
                    delay('watchdog:setsid', function() {
                        // the other tab must have sent the new sid
                        assert(sid, 'sid not set');
                        api_setsid(sid);
                    }, 2000);
                }
                break;

            case 'login':
            case 'createuser':
                if (!mega.utils.hasPendingTransfers()) {
                    loadingDialog.show();
                    this.Strg.login = strg.origin;
                }
                break;

            case 'logout':
                if (!mega.utils.hasPendingTransfers()) {
                    u_logout(-0xDEADF);
                    location.reload();
                }
                break;

            case 'chat_event':
                if (strg.data.state === 'DISCARDED') {
                    var chatRoom = megaChat.plugins.chatdIntegration._getChatRoomFromEventData(strg.data);
                    megaChat.plugins.chatdIntegration.discardMessage(chatRoom, strg.data.messageId);
                }
                break;

            case 'idbchange':
                mBroadcaster.sendMessage('idbchange:' + strg.data.name, [strg.data.key, strg.data.value]);
                break;
        }

        delete localStorage[ev.key];
    }
});
watchdog.setup();

/**
 * Simple alias that will return a random number in the range of: a < b
 *
 * @param a {Number} min
 * @param b {Number} max
 * @returns {*}
 */
function rand_range(a, b) {
    return Math.random() * (b - a) + a;
};

/**
 * Invoke the password manager in Chrome.
 *
 * There are some requirements for this function work propertly:
 *
 *  1. The username/password needs to be in a <form/>
 *  2. The form needs to be filled and visible when this function is called
 *  3. After this function is called, within the next second the form needs to be gone
 *
 * As an example take a look at the `tooltiplogin()` function in `index.js`.
 *
 * @param {String|Object} form jQuery selector of the form
 * @return {Bool}   True if the password manager can be called.
 *
 */
function passwordManager(form) {
    if (is_chrome_firefox) {
        var creds = passwordManager.pickFormFields(form);
        if (creds) {
            mozRunAsync(mozLoginManager.saveLogin.bind(mozLoginManager, creds.usr, creds.pwd));
        }
        $(form).find('input').val('');
        return;
    }
    if (typeof history !== "object") {
        return false;
    }
    $(form).rebind('submit', function() {
        setTimeout(function() {
            var path  = getSitePath();
            history.replaceState({ success: true }, '', "index.html#" + document.location.hash.substr(1));
            if (hashLogic) {
                path = getSitePath().replace('/', '/#');

                if (location.href.substr(0, 19) === 'chrome-extension://') {
                    path = path.replace('/#', '/mega/secure.html#');
                }
            }
            history.replaceState({ success: true, subpage: path.replace('#','').replace('/','') }, '', path);
            $(form).find('input').val('');
        }, 1000);
        return false;
    }).submit();
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
passwordManager.getStoredCredentials = function(password) {
    // Retrieve `keypw` and `userhash` from pwd string
    var result = null;

    if (String(password).substr(0, 2) === '~:') {
        var parts = password.substr(2).split(':');

        if (parts.length === 2) {
            try {
                var hash = parts[1];
                var keypw = base64_to_a32(parts[0]);

                if (base64_to_a32(hash).length === 2
                        && keypw.length === 4) {

                    result = {
                        hash: hash,
                        keypw: keypw
                    };
                }
            }
            catch (e) {}
        }
    }

    return result;
};
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


function elementInViewport2(el) {
    return verge.inY(el) || verge.inX(el);
}

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
};

// FIXME: This is a "Dirty Hack" (TM) that needs to be removed as soon as
//        the original problem is found and resolved.
if (typeof sjcl !== 'undefined') {
    // We need to track SJCL exceptions for ticket #2348
    sjcl.exception.invalid = function(message) {
        this.toString = function() {
            return "INVALID: " + this.message;
        };
        this.message = message;
        this.stack = mega.utils.getStack();
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

    Share.prototype.updateNodeShares = function() {

        var self = this;

        if ($.removedContactsFromShare && ($.removedContactsFromShare.length > 0)) {
            self.removeContactFromShare();
        }
        if ($.changedPermissions && ($.changedPermissions.length > 0)) {
            doShare($.selected[0], $.changedPermissions, true);
        }
        addContactToFolderShare();
    };


    Share.prototype.removeFromPermissionQueue = function(handleOrEmail) {

        $.changedPermissions.forEach(function(value, index) {
            if (value.u === handleOrEmail) {
                $.changedPermissions.splice(index, 1);
            }
        });
    };

    Share.prototype.removeContactFromShare = function() {

        var self = this;
        var userEmail = '';
        var selectedNodeHandle = '';
        var handleOrEmail = '';
        var pendingContactId;

        if ($.removedContactsFromShare.length > 0) {

            $.removedContactsFromShare.forEach(function(elem) {
                userEmail = elem.userEmail;
                selectedNodeHandle = elem.selectedNodeHandle;
                handleOrEmail = elem.handleOrEmail;

                // The s2 api call can remove both shares and pending shares
                api_req({
                    a: 's2',
                    n:  selectedNodeHandle,
                    s: [{ u: userEmail, r: ''}],
                    ha: '',
                    i: requesti
                }, {
                    userEmail: userEmail,
                    selectedNodeHandle: selectedNodeHandle,
                    handleOrEmail: handleOrEmail,

                    callback : function(res, ctx) {
                        if (typeof res == 'object') {
                            // FIXME: examine error codes in res.r, display error
                            // to user if needed

                            // If it was a user handle, the share is a full share
                            if (M.u[ctx.handleOrEmail]) {
                                M.delNodeShare(ctx.selectedNodeHandle, ctx.handleOrEmail);
                                setLastInteractionWith(ctx.handleOrEmail, "0:" + unixtime());

                                self.removeFromPermissionQueue(ctx.handleOrEmail);
                            }
                            // Pending share
                            else {
                                var pendingContactId = M.findOutgoingPendingContactIdByEmail(ctx.userEmail);
                                M.deletePendingShare(ctx.selectedNodeHandle, pendingContactId);

                                self.removeFromPermissionQueue(ctx.userEmail);
                            }
                        }
                        else {
                            // FIXME: display error to user
                        }
                    }
                });
            });
        }
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
 * Get a string for the payment plan number
 * @param {Number} planNum The plan number e.g. 1: PRO I, 2: PRO II, 3: PRO III, 4: LITE
 */
function getProPlan(planNum) {

    switch (planNum) {
        case 1:
            return l[5819];     // PRO I
        case 2:
            return l[6125];     // PRO II
        case 3:
            return l[6126];     // PRO III
        case 4:
            return l[6234];     // LITE
        default:
            return l[435];      // FREE
    }
}

/**
 * Returns the name of the gateway / payment provider and display name. The API will only
 * return the gateway ID which is unique on the API and will not change.
 *
 * @param {Number} gatewayId The number of the gateway/provider from the API
 * @returns {Object} Returns an object with two keys, the 'name' which is a unique string
 *                   for the provider which can be used for displaying icons etc, and the
 *                   'displayName' which is the translated name for that provider (however
 *                   company names are not translated).
 */
function getGatewayName(gatewayId, gatewayOpt) {

    var gateways = {
        0: {
            name: 'voucher',
            displayName: l[487]     // Voucher code
        },
        1: {
            name: 'paypal',
            displayName: l[1233]    // PayPal
        },
        2: {
            name: 'apple',
            displayName: 'Apple'
        },
        3: {
            name: 'google',
            displayName: 'Google'
        },
        4: {
            name: 'bitcoin',
            displayName: l[6802]    // Bitcoin
        },
        5: {
            name: 'dynamicpay',
            displayName: l[7109]    // UnionPay
        },
        6: {
            name: 'fortumo',
            displayName: l[7219] + ' (' + l[7110] + ')'    // Mobile (Fortumo)
        },
        7: {
            name: 'stripe',
            displayName: l[7111]    // Credit Card
        },
        8: {
            name: 'perfunctio',
            displayName: l[7111]    // Credit Card
        },
        9: {
            name: 'infobip',
            displayName: l[7219] + ' (Centilli)'    // Mobile (Centilli)
        },
        10: {
            name: 'paysafecard',
            displayName: 'paysafecard'
        },
        11: {
            name: 'astropay',
            displayName: 'AstroPay'
        },
        12: {
            name: 'reserved',
            displayName: 'reserved' // TBD
        },
        13: {
            name: 'windowsphone',
            displayName: l[8660]    // Windows Phone
        },
        14: {
            name: 'tpay',
            displayName: l[7219] + ' (T-Pay)'       // Mobile (T-Pay)
        },
        15: {
            name: 'directreseller',
            displayName: l[6952]    // Credit card
        },
        16: {
            name: 'ecp',                    // E-Comprocessing
            displayName: l[6952] + ' (ECP)' // Credit card (ECP)
        },
        17: {
            name: 'sabadell',
            displayName: 'Sabadell'
        },
        999: {
            name: 'wiretransfer',
            displayName: l[6198]    // Wire transfer
        }
    };

    // If the gateway option information was provided we can improve the default naming in some cases
    if (typeof gatewayOpt !== 'undefined') {
        if (typeof gateways[gatewayId] !== 'undefined') {
            // Subgateways should always take their subgateway name from the API if provided
            gateways[gatewayId].name =
                (gatewayOpt.type === 'subgateway') ? gatewayOpt.gatewayName : gateways[gatewayId].name;

            // Direct reseller still requires the translation from above to be in its name
            if (gatewayId === 15 && gatewayOpt.type !== 'subgateway') {
                gateways[gatewayId].displayName = gateways[gatewayId].displayName + " " + gatewayOpt.displayName;
            }
            else {
                gateways[gatewayId].displayName =
                    (gatewayOpt.type === 'subgateway') ? gatewayOpt.displayName : gateways[gatewayId].displayName;
            }
        }
    }

    // If the gateway exists, return it
    if (typeof gateways[gatewayId] !== 'undefined') {
        return gateways[gatewayId];
    }

    // Otherwise return a placeholder for currently unknown ones
    return {
        name: 'unknown',
        displayName: 'Unknown'
    };
}

/**
 * Redirects to the mobile app
 * @param {Object} $selector The jQuery selector for the button
 */
mega.utils.redirectToApp = function($selector) {

    if (is_ios) {
        // Based off https://github.com/prabeengiri/DeepLinkingToNativeApp/
        var ns = '.ios ';
        var appLink = "mega://" + location.hash;
        var events = ["pagehide", "blur", "beforeunload"];
        var timeout = null;

        var preventDialog = function(e) {
            clearTimeout(timeout);
            timeout = null;
            $(window).unbind(events.join(ns) + ns);
        };

        var redirectToStore = function() {
            window.top.location = getStoreLink();
        };

        var redirect = function() {
            var ms = 500;

            preventDialog();
            $(window).bind(events.join(ns) + ns, preventDialog);

            window.location = appLink;

            // Starting with iOS 9.x, there will be a confirmation dialog asking whether we want to
            // open the app, which turns the setTimeout trick useless because no page unloading is
            // notified and users redirected to the app-store regardless if the app is installed.
            // Hence, as a mean to not remove the redirection we'll increase the timeout value, so
            // that users with the app installed will have a higher chance of confirming the dialog.
            // If past that time they didn't, we'll redirect them anyhow which isn't ideal but
            // otherwise users will the app NOT installed might don't know where the app is,
            // at least if they disabled the smart-app-banner...
            // NB: Chrome (CriOS) is not affected.
            if (is_ios > 8 && ua.details.brand !== 'CriOS') {
                ms = 4100;
            }

            timeout = setTimeout(redirectToStore, ms);
        };

        Soon(function() {
            // If user navigates back to browser and clicks the button,
            // try redirecting again.
            $selector.rebind('click', function(e) {
                e.preventDefault();
                redirect();
                return false;
            });
        });
        redirect();
    }
    else {
        var path = getSitePath().substr(1);

        switch (ua.details.os) {
            case 'Windows Phone':
                window.location = "mega://" + path;
                break;

            case 'Android':
                var intent = 'intent://#' + path
                    + '/#Intent;scheme=mega;package=mega.privacy.android.app;end';
                document.location = intent;
                break;

            default:
                alert('Unknown device.');
        }
    }

    return false;
};

/*
 * Alert about 110% zoom level in Chrome/Chromium
 */
mega.utils.chrome110ZoomLevelNotification = function() {

    var dpr = window.devicePixelRatio;
    var pf = navigator.platform.toUpperCase();
    var brokenRatios = [
        2.200000047683716,// 110% retina
        1.100000023841858,// 110% non-retina
        1.3320000171661377,// 67% retina
        0.6660000085830688,// 67% non-retian, 33% retina
        0.3330000042915344// 33% non-retina
    ];

    if (window.chrome) {

        $('.nw-dark-overlay').removeClass('mac');
        $('.nw-dark-overlay.zoom-overlay').removeClass('zoom-67 zoom-33');

        if (pf.indexOf('MAC') >= 0) {
            $('.nw-dark-overlay').addClass('mac');
        }

        // zoom level110%
        if ((dpr === 2.200000047683716) || (dpr === 1.100000023841858)) {
            $('.nw-dark-overlay.zoom-overlay').fadeIn(400);
        }

        // 67% both or 33% retina
        if ((dpr === 1.3320000171661377) || (dpr === 0.6660000085830688)) {
            $('.nw-dark-overlay.zoom-overlay')
                .addClass('zoom-67')
                .fadeIn(400);
        }

        // 33% non-retina
        if (dpr === 0.3330000042915344) {
            $('.nw-dark-overlay.zoom-overlay')
                .addClass('zoom-33')
                .fadeIn(400);
        }

        if (brokenRatios.indexOf(dpr) === -1) {
            $('.nw-dark-overlay.zoom-overlay').fadeOut(200);
        }

    }
};
mBroadcaster.once('zoomLevelCheck', mega.utils.chrome110ZoomLevelNotification);

var debounce = function(func, execAsap) {
    var timeout;

    return function debounced() {
        var obj = this;
        var args = arguments;

        function delayed() {
            if (!execAsap) {
                func.apply(obj, args);
            }
            timeout = null;
        }

        if (timeout) {
            cancelAnimationFrame(timeout);
        }
        else if (execAsap) {
            func.apply(obj, args);
        }

        timeout = requestAnimationFrame(delayed);
    };
};

/**
 * Returns the currently running site version depending on if in development, on the live site or if in an extension
 * @returns {String} Returns the string 'dev' if in development or the currently running version e.g. 3.7.0
 */
mega.utils.getSiteVersion = function() {

    // Use 'dev' as the default version if in development
    var version = 'dev';

    // If this is a production version the timestamp will be set
    if (buildVersion.timestamp !== '') {

        // Use the website build version by default
        version = buildVersion.website;

        // If an extension use the version of that (because sometimes there are independent deployments of extensions)
        if (is_extension) {
            version = (window.chrome) ? buildVersion.chrome + ' ' + l[957] : buildVersion.firefox + ' ' + l[959];
        }
    }

    return version;
};
