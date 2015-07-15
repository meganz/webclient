var IMAGE_PLACEHOLDER = staticpath + "/images/img_loader@2x.png";

(function(window, asmCrypto) {

var pubkey = ab_to_str(asmCrypto.base64_to_bytes('gVbVNtVJf210qJLe+GxWX8w9mC+WPnTPiUDjBCv9tr4='))

function verify_cms_content(content, signature)
{
    var hash = asmCrypto.SHA256.hex(content);
    signature = ab_to_str(signature);

    try {
        return jodid25519.eddsa.verify(signature, hash, pubkey);
    } catch (e) {
        /* rubbish data, invalid anyways */
        return false;
    }
}

function process_cms_response(bytes, next, as, id)
{
    var viewer = new Uint8Array(bytes);

    var signature = bytes.slice(3, 67); // 64 bytes, signature
    var version = viewer[0];
    var mime = viewer[1];
    var label = ab_to_str(bytes.slice(67, viewer[2]+67));
    var content = bytes.slice(viewer[2]+67);

    if (as === "download") {
        mime = 0;
    }

    if (verify_cms_content(content, signature)) {
        switch (mime) {
        case 3: // html
            content = ab_to_str(content);
            next(false, { html: content, mime: mime});
            return loaded(id);
            break;

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
        next(true, {error: 'Invalid signature', signature: true} );
    }
}

var assets = {};
var booting = false;

var is_img;

/**
 *    Rewrite links. Basically this links
 *  shouldn't trigger the `CMS.get` and force
 *  a download
 */
function dl_placeholder(str, sep, rid, id) {
    return "'javascript:void(0)' data-cms-dl='"+id+"'";
}

/**
 *  Images placeholder. Replace *all* the images
 *  with a placeholder until the image is fully loaded from
 *  the BLOB server
 */
function img_placeholder(str, sep, rid, id) {
    is_img = true;
    return "'" + IMAGE_PLACEHOLDER + "' data-img='loading_" +  id + "'";
}

/**
 *    Internal function to communicate with the BLOB server.
 *
 *    It makes sure that optimize requests (makes sure we never
 *    ask things twice). This is the right place to
 *    cache (perhaps towards localStorage).
 */
var fetching = {};
function doRequest(id) {
    if (!id) {
        throw new Error("Calling CMS.doRequest without an ID");
    }
    var q = getxhr();
    q.onerror = function() {
        Later(function() {
            doRequest(id);
        });
    };
    q.onload = function() {
        for (var i in fetching[id]) {
            if (fetching[id].hasOwnProperty(i)) {
                process_cms_response(q.response, fetching[id][i][0], fetching[id][i][1], id);
            }
        }
        delete fetching[id];
    };
    var url = (localStorage.cms || "https://cms.mega.nz/content/") + id;
    console.error(url);
    q.open("GET", url);
    q.responseType = 'arraybuffer';
    q.send();
}

var _listeners = {};

function loaded(id)
{
    if (_listeners[id]) {
        for (var i in _listeners[id]) {
            _listeners[id][i]();
        }
    }
    CMS.attachEvents();
}

var curType;
var curCallback;

var CMS = {
    watch: function(type, callback)
    {
        curType = type;
        curCallback = callback;
    },

    reRender: function(type, nodeId)
    {
        if (type === curType) {
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
        if (typeof fetching[id] === "undefined") {
            doRequest(id);
            fetching[id] = [];
        }
        next = next || function() {};
        fetching[id].push([next, as]);
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

})(this, asmCrypto)

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
