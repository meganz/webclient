var M;
var pfid;
var dlid;
var dlkey;
var u_type;
var u_checked;
var sc_packet;
var sc_node;
var tree_ok0;
var tree_node;
var tree_residue;
var folderlink;
var fminitialized;
var loadingDialog;
var dlmanager;

function startMega() {
    'use strict';
    mBroadcaster.sendMessage('startMega');
    init_page();
}

function init_page() {
    'use strict';
    if (!is_embed) {
        throw new Error('Unexpected access...');
    }

    var tmp = String(page).split('!').map(function(s) {
        return s.replace(/[^\w-]+/g, "");
    });

    var ph = tmp[1];
    var key = tmp[2];
    var time = tmp[3];

    var init = function(res) {
        init_embed(ph, key, time, res);
    };

    if (dl_res || !key) {
        init(dl_res);
    }
    else {
        api_req({a: 'g', p: ph}, {callback: init});
    }
}

function init_embed(ph, key, time, g) {
    'use strict';
    var node;

    if (typeof g === 'object' && typeof g.at === 'string') {
        var akey = base64_to_a32(String(key).trim()).slice(0, 8);
        if (akey.length === 8) {
            var a = dec_attr(base64_to_ab(g.at), akey);
            node = a && new MegaNode({h: ph, ph: ph, s: g.s, k: akey, fa: g.fa, name: a.n, link: ph + '!' + key});
        }
    }

    if (d) {
        console.debug(node);
    }
    add_layout();

    if (node) {
        var link = '#!' + ph + '!' + key;

        $('.play-video-button, .viewonmega-item, .download.info-txt.big-txt').rebind('click', function() {
            open(getAppBaseUrl() + '/' + link);
            return false;
        });

        $('.login-item.with-avatar, useravatar').rebind('click', function() {
            open(getAppBaseUrl() + '/' + 'fm');
            return false;
        });

        $('.login-item').rebind('click', function() {
            open(getAppBaseUrl() + '/' + 'login');
            return false;
        });

        $('.logo-container').rebind('click', function() {
            open(getAppBaseUrl());
            return false;
        });

        $('.embedcode-item, .getlink-item, .share-generic').rebind('click', function() {
            var playing = false;
            var timeoffset = 0;
            var $block = $('.sharefile-block');
            var $videoBlock = $('.video-wrapper');
            var url = getBaseUrl() + '/embed' + link;
            var embed = '<iframe src="%" width="640" height="360" frameborder="0" allowfullscreen></iframe>';
            var $toast = $('.toast-notification');

            $('.close-overlay, .sharefile-buttons .cancel', $block).rebind('click', function() {
                playing = false;
                $block.addClass('hidden');
                $videoBlock.removeClass('main-blur-block');
                $toast.removeClass('visible second');
            });

            $('.sharefile-buttons .copy', $block).rebind('click', function() {
                var content = String($('.tab-content', $block).text());
                if (playing && document.getElementById('timecheckbox').checked) {
                    content = content.replace(/![\w-]{8}![^"]+/, '$&!' + timeoffset + 's');
                }
                copyToClipboard(content);
                $toast.addClass('visible second');
            });

            (function _() {
                $('.tab-link', $block).removeClass('active').rebind('click', _);

                if ($(this).is('.getlink-item, .share-link')) {
                    $('.tab-link.share-link', $block).addClass('active');
                    $('.tab-content', $block).text(url);
                }
                else {
                    $('.tab-link.share-embed-code', $block).addClass('active');
                    $('.tab-content', $block).text(embed.replace('%', url));
                }
            }).call(this);

            if (node.stream) {
                playing = true;
                var elm = document.getElementById('timeoffset');
                node.stream.on('timeupdate', function() {
                    timeoffset = this.video.currentTime | 0;
                    elm.value = secondsToTimeShort(timeoffset);
                    return playing;
                });
            }

            $block.removeClass('hidden');
            $videoBlock.addClass('main-blur-block');
        });

        iniVideoStreamLayout(node, $('body'));
    }
    else {
        console.info(404, arguments);
        $('.video-wrapper').addClass('hidden');
        $('.file-removed-block').removeClass('hidden');
    }
}

function add_layout() {
    'use strict';
    $('body').safeHTML(translate(pages.index).replace(/{staticpath}/g, staticpath));

    var elm = document.querySelector('video');
    var style = elm.style;
    var fill = function() {
        style.maxWidth = style.minWidth = window.innerWidth + 'px';
        style.maxHeight = style.minHeight = window.innerHeight + 'px';
    };
    fill();
    elm.controls = false;
    window.addEventListener('resize', fill);

    topmenuUI();
}

function topmenuUI() {
    'use strict';
    var $useravatar = $('.viewer-button.useravatar');
    var $useravatarMenu = $('.login-item .useravatar');
    var $avatarwrapper = $('.avatar-wrapper', $useravatar);
    var _colors = [
        "#69F0AE", "#13E03C", "#31B500", "#00897B", "#00ACC1",
        "#61D2FF", "#2BA6DE", "#FFD300", "#FFA500", "#FF6F00",
        "#E65100", "#FF5252", "#FF1A53", "#C51162", "#880E4F"
    ];

    if (u_type === 3) {
        var name = $.trim(u_attr.name || (u_attr.firstname + ' ' + u_attr.lastname));
        var fl = String(name && name[0] || '').toUpperCase();
        var color = UH64(u_handle).mod(_colors.length);
        var $ddi = $('.dropdown-item.login-item');

        ($useravatar.removeClass('hidden') && $useravatarMenu.removeClass('hidden'));
        $avatarwrapper.css('background-color', _colors[color]).find('span').text(fl);
        $ddi.addClass('with-avatar').find('i').addClass('hidden').text(fl).end().find('.login-text').text(name).end();

        api_req({"a": "uga", "u": u_handle, "ua": "+a"}, {
            callback: tryCatch(function(res) {
                var src = res.length && mObjectURL([base64_to_ab(res)], 'image/jpeg');
                if (src) {
                    $avatarwrapper.safeHTML('<img src="@@"/>', src);
                }
            })
        });
    }

    $('body').rebind('click.bodyw', function() {
        $('.files-menu.context').addClass('hidden');
    });

    $('.moreoptions').rebind('click', function() {
        var $cm = $('.files-menu.context').removeClass('hidden');
        var top = $('.viewer-top-bl').height();
        var left = $cm.outerWidth();
        $cm.css({'top': top, 'left': innerWidth - left - 4});
        return false;
    });
}

// Setup desktop variant stubs
mBroadcaster.once('startMega', function() {
    'use strict';

    var dummy = function() {
        return false;
    };
    loadingDialog = {show: dummy, hide: dummy};

    M = Object.create(null);
    M.xhr = megaUtilsXHR;
    M.gfsfetch = megaUtilsGFSFetch;
    M.getStack = function() {
        return String(new Error().stack);
    };
    M.hasPendingTransfers = dummy;

    dlmanager = Object.create(null);
    dlmanager.logger = new MegaLogger();
    dlmanager.setUserFlags = dummy;

});

(function(global) {
    'use strict';

    function MegaLogger(n, o) {
        this._name = String(n);
        this.options = Object(o);
    }

    function expand(p, m) {
        return function(a, b) {
            p[m](a, b);
            return p;
        };
    }

    function extend(p) {
        p.fail = expand(p, 'catch');
        p.tryCatch = p.done = expand(p, 'then');
        p.always = function(f) {
            p.then(f, f);
            return p;
        };
        return p;
    }

    function MegaPromise(f) {
        var reject;
        var resolve;
        if (typeof Promise === 'undefined') {
            return this;
        }
        var promise = new Promise(function(res, rej) {
            reject = rej;
            resolve = res;
        });
        promise.reject = reject;
        promise.resolve = resolve;
        promise.__proto__ = this.__proto__;
        if (f) {
            try {
                f(resolve, reject);
            }
            catch (ex) {
                reject(ex);
            }
        }
        return extend(promise);
    }

    inherits(MegaLogger, console);
    inherits(MegaPromise, window.Promise || {});

    MegaLogger.getLogger = function(n, o) {
        return new MegaLogger(n, o);
    };

    global.MegaLogger = MegaLogger;
    global.MegaPromise = MegaPromise;

})(self);

function getBaseUrl() {
    return 'https://' + (((location.protocol === 'https:') && location.host) || 'mega.nz');
}
function getAppBaseUrl() {
    var l = location;
    var base = (l.origin !== 'null' && l.origin || (l.protocol + '//' + l.hostname));
    if (is_extension) {
        base += l.pathname;
    }
    return base;
}
