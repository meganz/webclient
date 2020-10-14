(function(window) {
    /** Our trusted public keys {{{ */
    var signPubKey = {
        "__global": [
            "rRHOm8BpMsYsSnSlk1AD2xxm9vKIFd\/tMoKxc35FTXQ=", // Elroy v2
            "WJbsItfJfXhGZlq6D1tz\/Wy\/AVjmvQoK7ZgBSOrrCQE=", // Guy v2
            "nJ0DVETXN6Fgd+nK70bsngaPlbM9zedn14Exh\/fAoyU=", // Shaun v2
            "WpDw5Q4L/7AfEMsGeW79BAheALabCdK3uYNNZB+Bq5o=", // Elroy v3
            "TJi9yWiE3tj15ER3W2kLcV4uVuE2GftUm54XQQLPTGg=", // Guy v3
            "nX9lIbNNyZPnnMr7aFMENHlescfDbp+ZmUIpGTcDp0w=", // Shaun v3
            "c/1i2Cq85V8n1I3tixV4bjLTRn9ZqYqtOVhxavHKoYM=", // Mark v3
            "PuXh6QXVRVVKPPdeLfYgG0VNxG6mUn2XioNCnxHzq1A=" // Harry v3
        ]
    };
    /** }}} */

    var IMAGE_PLACEHOLDER = staticpath + "/images/img_loader@2x.png";
    var isReady = false;

    mBroadcaster.once('startMega', function() {
        for (var sub in signPubKey) {
            if (!signPubKey.hasOwnProperty(sub)) {
                continue;
            }
            for (var l = 0; l < signPubKey[sub].length; ++l) {
                signPubKey[sub][l] = asmCrypto.base64_to_bytes(signPubKey[sub][l]);
            }
        }
        isReady = true;
    });

    var cmsRetries = 1; // how many times to we keep retyring to ping the CMS before using the snapshot?
    var fetching = {};
    var cmsBackoff = 0;
    var cmsFailures = 0;
    // Internal cache, to avoid asking to the CMS
    // server the same object _unless_ they have
    // changed.
    var cmsCache = {};

    /**
     *  Wrap any callback, caching it's result
     *  to improve response time in the CMS.
     *  It also listen for changes in the object,
     *  thus invalidating the cache entry.
     *
     *  @param {String} id    Object ID
     *  @param {Function} next  Callback to wrap
     *  @returns {Function}   New callback function
     */
    function cacheCallback(id, next) {
        return function(err, content) {
            CMS.watch(id, function() {
                // invalidate teh cache
                delete cmsCache[id];
            });
            cmsCache[id] = [err, content];
            next(err, content);
        };
    }

    function readLength(bytes, i) {
        var viewer = new DataView(bytes.slice(i, i + 4));
        return viewer.getUint32(0);
    }

    function parse_pack(bytes) {
        var mime;
        var type;
        var nameLen;
        var name;
        var content;
        var e = 0;
        var binary = new Uint8Array(bytes);
        var hash = {};


        for (var i = 0; i < bytes.byteLength;) {
            size = readLength(bytes, i);
            i += 4; /* 4 bytes */

            type = binary[i++];
            nameLen = binary[i++];
            name = ab_to_str(bytes.slice(i, nameLen + i));

            i += nameLen;

            content = bytes.slice(i, i + size);

            switch (type) {
            case 3:
                hash[name] = {
                    html: ab_to_str(content).replace(/(?:{|%7B)cmspath(?:%7D|})/g, CMS.getUrl()),
                    mime: type
                };
                break;

            case 2:
                try {
                    hash[name] = { object: JSON.parse(ab_to_str(content)), mime: type };
                } catch (err) {
                    /* invalid json, weird case */
                    hash[name] = { object: {}, mime: type };
                }
                break;
            }

            i += size;
        }

        return hash;
    }

    function verify_cms_content(content, signature, objectId) {
        var hash  = asmCrypto.SHA256.bytes(content);
        signature = asmCrypto.string_to_bytes(ab_to_str(signature));
        var i;

        try {
            for (i = 0; i < signPubKey.__global.length; ++i) {
                if (nacl.sign.detached.verify(hash, signature, signPubKey.__global[i])) {
                    /* It's a valid signature */
                    return true;
                }
            }

            if (signPubKey[objectId]) {
                for (i = 0; i < signPubKey[objectId].length; ++i) {
                    if (nacl.sign.detached.verify(hash, signature, signPubKey[objectId][i])) {
                        /* It's a valid signature */
                        return true;
                    }
                }
            }


        } catch (e) {
            /* rubbish data, invalid anyways */
            return false;
        }

        /* Invalid signature */
        return false;
    }

    function parse_cms_content(content) {
        if (content && typeof content !== 'string') {
            content = ab_to_str(content);
        }

        return String(content)
            .replace(/\s+/g, ' ')
            // eslint-disable-next-line no-use-before-define
            .replace(/(?:{|%7B)cmspath(?:%7D|})/g, CMS.getUrl())
            .replace(/<a[^>]+>/g, function(m) {
                if (m.indexOf('href=&quot;') > 0) {
                    m = m.replace(/&quot;/g, '"');
                }
                if (/href=["']\w+:/.test(m)) {
                    m = m.replace('>', ' target="_blank" rel="noopener noreferrer">');
                }
                if (/href=["'][#/]/.test(m)) {
                    m = m.replace('>', ' class="clickurl">');
                }
                return m;
            });
    }

    function process_cms_response(bytes, next, as, id) {
        var viewer = new Uint8Array(bytes);

        if (!isReady) {
            return setTimeout(function() {
                process_cms_response(bytes, next, as, id);
            }, 100);
        }

        var signature = bytes.slice(3, 67); // 64 bytes, signature
        var version = viewer[0];
        var mime = viewer[1];
        var label = ab_to_str(bytes.slice(67, viewer[2] + 67));
        var content = bytes.slice(viewer[2] + 67);

        if (as === "download") {
            mime = 0;
        }

        if (verify_cms_content(content, signature, id)) {
            switch (mime) {
            case 3: // html
                    content = parse_cms_content(content);
                next(false, { html: content, mime: mime});
                return loaded(id);

            case 1:
                var blob = new Blob([content]);
                content = window.URL.createObjectURL(blob);
                next(false, { url: content, mime: mime});
                return loaded(id);

            case 2:
                try {
                    content = JSON.parse(ab_to_str(content));
                } catch (e) {
                    /* invalid json, weird case */
                    return next(true, {signature: false});
                }
                next(false, { object: content, mime: mime});
                return loaded(id);

            case 5:
                next(false, parse_pack(content));
                break;

            default:
                var io = new MemoryIO("temp", {});
                io.begin = function() {};
                io.setCredentials("", content.byteLength, "", [], []);
                io.write(content, 0, function() {
                    io.download(label, "");
                    next(false, {});
                    return loaded(id);
                });
                break;
            }
        } else {
            next(true, { error: 'Invalid signature', signature: true });
        }
    }

    var assets = {};
    var booting = false;

    var is_img;

    /**
     *  Steps
     *
     *  Call many things in parallel, buffer the results
     *  and give it back once everything is ready
     *
     *  @param {Number} times
     *  @param {Function} next     *
     *  @return {Function}
     */
    function steps(times, next) {
        var responses = new Array(times + 1);
        var done = 0;
        function step_done(i, err, arg) {
            responses[0]   = responses[0] || err;
            responses[i + 1] = arg;
            if (++done === times) {
                next.apply(null, responses);
            }
        }

        return function(id) {
            return step_done.bind(null, parseInt(id));
        };
    }

    /**
     *  Rewrite links. Basically this links
     *  shouldn't trigger the `CMS.get` and force
     *  a download
     */
    function dl_placeholder(str, sep, rid, id) {
        return "'javascript:void(0)' data-cms-dl='" + id + "'";
    }

    /**
     *  Images placeholder. Replace *all* the images
     *  with a placeholder until the image is fully loaded from
     *  the BLOB server
     */
    function img_placeholder(str, sep, rid, id) {
        is_img = true;
        return "'" + IMAGE_PLACEHOLDER + "' data-img='loading_" + id + "'";
    }

    /**
     *    Internal function to communicate with the BLOB server.
     *
     *    It makes sure to optimize requests (makes sure we never
     *    ask things twice). This is the right place to
     *    cache (perhaps towards localStorage).
     */
    function doRequest(id) {
        if (!id) {
            throw new Error("Calling CMS.doRequest without an ID");
        }

        if (typeof CMS_Cache === "object" && CMS_Cache[id]) {
            for (var i in fetching[id]) {
                if (fetching[id].hasOwnProperty(i)) {
                    fetching[id][i][0](null, CMS_Cache[id]); // callback
                }
            }
            delete fetching[id];
            return;
        }

        var q = getxhr();
        q.onerror = function() {
            cmsBackoff = Math.min(cmsBackoff + 2000, 60000);
            if (++cmsFailures === cmsRetries) {
                return loadSnapshot();
            }
            setTimeout(function() {
                doRequest(id);
            }, cmsBackoff);
        };
        q.onload = function() {
            for (var i in fetching[id]) {
                if (fetching[id].hasOwnProperty(i)) {
                    process_cms_response(q.response, fetching[id][i][0], fetching[id][i][1], id);
                }
            }
            delete fetching[id];
            cmsBackoff = 0; /* reset backoff */
        };
        var url = CMS.getUrl() + '/' + id;
        q.open("GET", url);
        q.responseType = 'arraybuffer';
        q.send();
    }

    var _listeners = {};

    function snapshot_ready() {
        for (var id in fetching) {
            if (fetching.hasOwnProperty(id)) {
                doRequest(id);
            }
        }
    }

    function loadSnapshot() {
        if (!jsl_loaded['cms_snapshot_js']) {
            M.require('cms_snapshot_js').done(snapshot_ready);
        }
    }

    function loaded(id) {
        if (_listeners[id]) {
            for (var i in _listeners[id]) {
                if (_listeners[id].hasOwnProperty(i)) {
                    _listeners[id][i]();
                }
            }
        }
        CMS.attachEvents();
    }

    var curType;
    var curCallback;
    var reRendered = {};

    var CMS = {
        watch: function(type, callback)
        {
            curType = type;
            curCallback = callback;
        },

        getAndWatch: function(type, callback) {
            this.get(type, callback);
            this.watch(type, function() {
                this.get(type, callback);
            });
        },

        reRender: function(type, nodeId)
        {
            if (type === curType && !reRendered[nodeId]) {
                reRendered[nodeId] = true;
                curCallback(nodeId);
            }
        },

        html: function(html) {
            return html.replace(/(?:{|%7B)cmspath(?:%7D|})/g, CMS.getUrl());
        },

        isLoading: function() {
            return Object.keys(fetching).length > 0;
        },

        attachEvents: function() {
            $('*[data-cms-dl],.cms-asset-download').rebind('click', function(e) {
                var $this  = $(this);
                var target = $this.data('id') || $this.data('cms-dl');
                if (!target) {
                    return;
                }

                e.preventDefault();

                loadingDialog.show();
                CMS.get(target, function() {
                    loadingDialog.hide();
                }, false, 'download');

                return false;
            });
        },

        loaded: loaded,

        /**
         *  Load unsigned images (HTTP images) instead
         *  of letting the CMS loading the signed images.
         *  We assume it's secure enough because the content that references
         *  the images are signed.
         *
         *  @param {String} id  64 digits to represent 256 bits.
         *  @returns {String} URL
         */
        img2: function insecureImageLoading(id) {
            return this.getUrl() + "/unsigned/" + id;
        },

        img: function(id) {
            if (!assets[id]) {
                this.get(id, function(err, obj) {
                    $('*[data-img=loading_' + id + ']').attr({'id': '', 'src': obj.url});
                    $('*[src="' + IMAGE_PLACEHOLDER + "#" + id + '"]').attr({'id': '', 'src': obj.url});
                    assets[id] = obj.url;
                });
            }
            return assets[id] ? assets[id] : IMAGE_PLACEHOLDER + "#" + id;
        },

        index: function(index, callback) {
            CMS.get(index, function(err, data) {
                if (err) {
                    return callback(err);
                }

                CMS.get(data.object, function(err) {
                    if (err) {
                        return callback(err);
                    }

                    var hash = {};
                    var args = Array.prototype.slice.call(arguments);

                    args.shift();

                    args.map(function(index) {
                        for (var name in index) {
                            if (index.hasOwnProperty(name)) {
                                hash[name] = index[name];
                            }
                        }
                    });

                    callback(err, hash);
                });
            });
        },

        get: function(id, next, cache, as) {
            if (id instanceof Array) {
                var step = steps(id.length, next);
                for (var i in id) {
                    if (id.hasOwnProperty(i)) {
                        this.get(id[i], step(i), cache, as);
                    }
                }
                return;
            }
            var isNew = false;
            next = next || function() {};

            if (cache) {
                next = cacheCallback(id, next);
                if (cmsCache[id]) {
                    return next(cmsCache[id][0], cmsCache[id][1]);
                }
            }


            if (typeof fetching[id] === "undefined") {
                isNew = true;
                fetching[id] = [];
            }

            fetching[id].push([next, as]);
            if (isNew) {
                doRequest(id);
            }
        },

        getUrl: function() {
            return localStorage.cms || "https://cms2.mega.nz";
        },

        on: function(id, callback)
        {
            if (!_listeners[id]) {
                _listeners[id] = [];
            }
            _listeners[id].push(callback);
        },

        imgLoader: function(html, id) {
            if (!assets[id]) {
                is_img = false;
                // replace images
                html = html.replace(new RegExp('([\'"])(i:(' + id + '))([\'"])', 'g'), img_placeholder);
                // replace download links
                html = html.replace(new RegExp('([\'"])(d:(' + id + '))([\'"])', 'g'), dl_placeholder);

                if (is_img) {
                    this.get(id);
                }
            } else {
                html = html.replace(IMAGE_PLACEHOLDER + "' data-img='loading_" + id, assets[id], 'g');
            }
            return html;
        }
    };

    /* Make it public */
    window.CMS = CMS;

})(this);

CMS.on('corporate', function() {
    'use strict';

    CMS.pagesMap = CMS.pagesMap || { 'page-1': 'investors', 'page-2': 'media', 'page-3': 'shareholder-reports' };
    CMS.reversedMap = CMS.reversedMap || (function() {
        var temp = Object.create(null);
        for (var k in CMS.pagesMap) {
            if (CMS.pagesMap.hasOwnProperty(k)) {
                temp[CMS.pagesMap[k]] = k;
            }
        }
        return temp;
    })();

    $('.new-left-menu-link').rebind('click', function() {
        var pageName = $(this).attr('id');

        // check if CMS is updated to return correct URLs
        pageName = CMS.pagesMap[pageName] || pageName;
        loadSubPage('corporate/' + pageName);
        $('.old .fmholder').animate({scrollTop: 0}, 0);
    });
    var ctype = getCleanSitePath().substr(10).replace(/[^\w-]/g, '');

    // support prior and after CMS data change.
    ctype = document.getElementById(ctype) ? ctype : CMS.reversedMap[ctype] || CMS.reversedMap.investors;

    if (ctype && document.getElementById(ctype)) {
        $('.new-right-content-block').addClass('hidden');
        $('.new-right-content-block.' + ctype).removeClass('hidden');
        $('.new-left-menu-link').removeClass('active');
        $('#' + ctype).addClass('active');
    }
    else {
        $('.new-left-menu-link:first').trigger('click');
    }
});
