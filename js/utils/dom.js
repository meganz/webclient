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
                    parseHTML.baseURIs[href] = Services.io.newURI(href, null, null);
                }
                baseURI = parseHTML.baseURIs[href];
            }
            // XXX: parseFragment() removes href attributes with a hash mask
            markup = String(markup).replace(/\shref="[#\/]/g, ' data-fxhref="#');
            return mozParserUtils.parseFragment(markup, flags, Boolean(isXML), baseURI, doc.documentElement);
        }
        catch (ex) {
            mozError(ex);
        }
    }

    // Either we are not running the Firefox extension or the above parser
    // failed, in such case we try to mimic it using jQuery.parseHTML
    var fragment = doc.createDocumentFragment();

    // console.time('parseHTML');

    markup = String(markup).replace(/<!--[\s\S]*?-->/g, '');

    if (doc === document) {
        try {
            var sandbox = document.implementation.createHTMLDocument("");
            var base = sandbox.createElement("base");
            base.href = document.location.href;
            sandbox.head.appendChild(base);
            doc = sandbox;
        }
        catch (ex) {
            console.warn(ex);
        }
    }

    var dumb = {'SCRIPT': 1, 'STYLE': 1, 'SVG': 1, 'XML': 1, 'OBJECT': 1, 'IFRAME': 1, 'EMBED': 1, 'MARQUEE': 1};

    $.parseHTML(markup, doc)
        .forEach(function(node) {
            // console.debug(node.nodeName, node.outerHTML, node.data, [node]);

            var content = String(node.outerHTML).replace(/[\s\x00-\x19]+/g, '');
            var invalid = /<[^>]+script:/i.test(content);

            if (!invalid) {
                invalid = domNodeForEach(node, function(n) {
                    // console.warn('domNodeForEach(%s)', n.nodeName, [n]);

                    var nn = n.nodeName.substr(n.nodeName.indexOf(':') + 1);
                    return dumb[nn] || domAttributeForEach(n, function(a) {
                        // console.warn('domAttrForEach(%s:%s)', a.name, a.value, [a], [n]);

                        return a.name[0] === 'o' && a.name[1] === 'n'
                            || nn !== 'IMG' && a.name[0] === 's' && a.name[1] === 'r' && a.name[2] === 'c';
                    });
                });
            }

            if (invalid) {
                console.warn('Filtered out invalid content passed to parseHTML...', [node]);
            }
            else {
                fragment.appendChild(node);
            }
        });

    // console.timeEnd('parseHTML');

    return fragment;
}
parseHTML.baseURIs = Object.create(null);

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
    'append': 'safeAppend',
    'prepend': 'safePrepend'
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
escapeHTML.replacements = {"&": "&amp;", '"': "&quot;", "'": "&#39;", "<": "&lt;", ">": "&gt;"};

// deprecated
function htmlentities(value) {
    if (!value) {
        return '';
    }
    return $('<div/>').text(value).html();
}

/**
 * Purge html content from an string
 * @param {String} str The html string
 * @param {Boolean} escape Whether we want the result escaped,
 *                         MUST be set if you want to insert the string back in the DOM as html
 */
function removeHTML(str, escape) {
    'use strict';
    str = $('<div/>').safeHTML(str).text();
    return escape ? escapeHTML(str) : str;
}

/**
 * Traverses a DOM Node hierarchy
 * @param {Object} node the parent node
 * @param {Function} callback Function to invoke for each node
 * @param {*} [irn] Ignore root node
 * @returns {Boolean} The callback result
 */
function domNodeForEach(node, callback, irn) {
    'use strict';

    var len = node.childNodes && node.childNodes.length;
    while (len--) {
        var n = node.childNodes[len];

        if (n.nodeType === 1 && callback(n)) {
            return true;
        }

        if (n.hasChildNodes() && domNodeForEach(n, callback, 1)) {
            return true;
        }
    }

    return irn ? false : callback(node, true);
}

/**
 * Traverses a DOM Node's attributes
 * @param {Object} node the parent node
 * @param {Function} callback Function to invoke for each node
 * @returns {Boolean} The callback result
 */
function domAttributeForEach(node, callback) {
    'use strict';

    var len = node.attributes && node.attributes.length;
    while (len--) {
        var a = node.attributes.item(len);

        if (callback(a, node)) {
            return true;
        }
    }

    return false;
}
