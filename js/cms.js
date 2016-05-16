var IMAGE_PLACEHOLDER = staticpath + "/images/img_loader@2x.png";

(function(window, asmCrypto) {
    /** Our trusted public keys {{{ */
    var signPubKey = {
        "__global": [
            "gVbVNtVJf210qJLe+GxWX8w9mC+WPnTPiUDjBCv9tr4=",
            "NdRND9yN\/xE3VVzOtSKpuNwzWykTTcrDN2HMWrCLJJY="
        ],
        "sync": [
            "9tNqH\/pHLXLJ20Ie316S5wIvdwCNohjR+e4TGt6F3BI="
        ]
    };
    /** }}} */

    for (var sub in signPubKey) {
        if (!signPubKey.hasOwnProperty(sub)) {
            continue;
        }
        for (var l = 0; l < signPubKey[sub].length; ++l) {
            signPubKey[sub][l] = asmCrypto.base64_to_bytes(signPubKey[sub][l]);
        }
    }
    
    var cmsRetries = 1; // how many times to we keep retyring to ping the CMS before using the snapshot?
    var fetching = {};
    var cmsBackoff = 0;
    var cmsFailures = 0;
    
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
    
    function process_cms_response(bytes, next, as, id) {
        var viewer = new Uint8Array(bytes);
    
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
                content = ab_to_str(content).replace(/(?:{|%7B)cmspath(?:%7D|})/g, CMS.getUrl());
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
        var url = CMS.getUrl() + id;
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
            silent_loading = snapshot_ready;
            jsl.push(jsl2['cms_snapshot_js']);
            jsl_start();
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
    
        reRender: function(type, nodeId)
        {
            if (type === curType && !reRendered[nodeId]) {
                reRendered[nodeId] = true;
                curCallback(nodeId);
            }
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
                }, 'download');
    
                return false;
            });
        },
    
        loaded: loaded,
    
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
        get: function(id, next, as) {
            if (id instanceof Array) {
                var step = steps(id.length, next);
                for (var i in id) {
                    if (id.hasOwnProperty(i)) {
                        this.get(id[i], step(i), as);
                    }
                }
                return;
            }
            var isNew = false;
            if (typeof fetching[id] === "undefined") {
                isNew = true;
                fetching[id] = [];
            }
            next = next || function() {};
            fetching[id].push([next, as]);
            if (isNew) {
                doRequest(id);
            }
        },

        getUrl: function() {
            return localStorage.cms || "https://cms2.mega.nz/";
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

})(this, asmCrypto);

CMS.on('corporate', function()
{
    $('.new-left-menu-link').rebind('click', function() {
        document.location.hash = "#corporate/" + $(this).attr('id');
    });
    var ctype = document.location.hash.substr(11);
    if ($('#' + ctype).length === 1) {
        $('.new-right-content-block').addClass('hidden');
        $('.new-right-content-block.' + ctype).removeClass('hidden');
        $('.new-left-menu-link').removeClass('active');
        $('#' + ctype).addClass('active');
        mainScroll();
    } else {
        $('.new-left-menu-link:first').trigger('click');
    }
});
