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
var preqs = {};
var thumbnails = {};
var ep_node = false;

function startMega() {
    'use strict';
    jsl = [];
    mBroadcaster.sendMessage('startMega');
    eventlog(99686, true);
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
    $.playbackOptions = tmp[3];

    var init = function(res) {
        init_embed(ph, key, res);
    };

    if (dl_res || !key) {
        init(dl_res);
    }
    else {
        api_req({a: 'g', p: ph}, {callback: init});
    }
}

function init_embed(ph, key, g) {
    'use strict';
    var node;

    if (typeof g === 'object' && typeof g.at === 'string') {
        var akey = base64_to_a32(String(key).trim()).slice(0, 8);
        if (akey.length === 8) {
            var n = {h: ph, ph: ph, s: g.s, a: g.at, fa: g.fa, link: ph + '!' + key};
            crypto_procattr(n, akey);
            node = n.name && new MegaNode(n);
        }
    }

    if (d) {
        console.debug(node);
    }
    add_layout();

    if (node) {
        var link = '#!' + ph + '!' + key;
        if (mega.flags.nlfe) {
            link = '/file/' + ph + '#' + key;
        }

        // Remove header and logo on embed player when viewing the security video on /security page
        if (under('security')) {
            $('.viewer-top-bl, .logo-container').remove();
            $('.viewer-bottom-bl').addClass('no-grad');
            $('.download.video-block').addClass('no-bg-color');
        }
        else {
            localStorage.affid = ph;
            localStorage.affts = Date.now();
            localStorage.afftype = 2;
        }

        $('.play-video-button, .viewonmega-item, .filename').rebind('click', function() {
            open(getBaseUrl() + link);
            return false;
        });

        $('.login-item').rebind('click', function() {
            open(getAppBaseUrl() + '#login');
        });

        $('.logo-container, .login-item.with-avatar, .useravatar').rebind('click', function() {
            open(getAppBaseUrl());
        });

        $('.embedcode-item, .getlink-item, .share-generic').rebind('click', function() {
            var playing = false;
            var timeoffset = 0;
            var $block = $('.sharefile-block');
            var $wrapper = $('.video-wrapper');
            var url = getBaseUrl() + '/embed' + link.replace('file/', '');
            var embed = '<iframe src="%" width="640" height="360" frameborder="0" allowfullscreen></iframe>';

            $('.close-overlay, .sharefile-buttons .cancel', $block).rebind('click', function() {
                playing = false;
                $block.addClass('hidden');
                $wrapper.removeClass('share-option');
            });

            $('.sharefile-buttons .copy', $block).rebind('click', function() {
                var content = String($('.tab-content', $block).text());
                if (playing && document.getElementById('timecheckbox').checked) {
                    content = content.replace(/[!/][\w-]{8}[!#][^"]+/, '$&!' + timeoffset + 's');
                }
                copyToClipboard(content, 1);
            });

            $('.tab-content', $block).rebind('click', function() {
                selectText('embed-code-field');
                return false;
            });

            (function _() {
                $('.tab-link', $block).removeClass('active').rebind('click', _);

                if ($(this).is('.getlink-item, .share-link')) {
                    $('.tab-link.share-link', $block).addClass('active');
                    $('.tab-content', $block).text(url.replace('/embed', '/' + (mega.flags.nlfe ? 'file' : '')));
                    $('.sharefile-settings', $block).addClass('hidden');
                }
                else {
                    $('.tab-link.share-embed-code', $block).addClass('active');
                    $('.tab-content', $block).text(embed.replace('%', url));
                    $('.sharefile-settings', $block).removeClass('hidden');
                }
            }).call(this);

            if (node.stream) {
                playing = true;
                var elm = document.getElementById('timeoffset');
                node.stream.on('timeupdate', function() {
                    timeoffset = this.currentTime | 0;
                    elm.value = secondsToTimeShort(timeoffset);
                    return playing;
                });
            }

            $block.removeClass('hidden');
            $wrapper.addClass('main-blur-block share-option');
        });

        watchdog.registerOverrider('login', function(ev, strg) {
            var data = strg.data;

            if (data[0]) {
                u_storage = init_storage(sessionStorage);
                u_storage.k = JSON.stringify(data[0]);
            }
            else {
                u_storage = init_storage(localStorage);
            }

            watchdog.registerOverrider('setsid', function(ev, strg) {
                var sid = strg.data;
                api_setsid(sid);

                u_storage.sid = sid;

                u_checklogin({
                    checkloginresult: function(ctx, r) {
                        u_type = r;
                        topmenuUI();

                        delay('q:retry', function() {
                            dlmanager._onQuotaRetry();
                        });
                    }
                });
                watchdog.unregisterOverrider('setsid');
            });
        });
        watchdog.registerOverrider('logout', function() {
            u_logout(-0xDEADF);
            topmenuUI();
        });
        watchdog.registerOverrider('loadfm_done', function() {});

        watchdog.registerOverrider('psts', dlmanager._onQuotaRetry.bind(dlmanager));

        var buffer = $.playbackOptions && $.playbackOptions.indexOf('1a') > -1 &&
            (window.chrome || $.playbackOptions.indexOf('1m') > -1);

        iniVideoStreamLayout(node, $('body'), {preBuffer: buffer})
            .then(function(stream) {
                if (stream instanceof Streamer) {
                    stream.on('activity', function() {
                        if (dlmanager.isOverQuota) {
                            dlmanager.isOverQuota = false;
                            dlmanager.isOverFreeQuota = false;
                            $('.transfer-limitation-block .close-overlay').trigger('click');
                        }
                        return true;
                    });

                    if (stream.options.autoplay) {
                        $('.video-wrapper .play-video-button').click();
                    }
                }
            });

        ep_node = node;
        pagemetadata();
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
    var $avatarwrapper = $('.avatar-wrapper');
    var _colors = [
        "#69F0AE", "#13E03C", "#31B500", "#00897B", "#00ACC1",
        "#61D2FF", "#2BA6DE", "#FFD300", "#FFA500", "#FF6F00",
        "#E65100", "#FF5252", "#FF1A53", "#C51162", "#880E4F"
    ];

    if (u_type === 3) {
        var name = u_attr.fullname;
        var fl = String(name && name[0] || '').toUpperCase();
        var color = UH64(u_handle).mod(_colors.length);

        $useravatar.removeClass('hidden');
        $avatarwrapper.css('background-color', _colors[color]).find('span').text(fl);
        $('.contextmenu.useravatar').removeClass('hidden')
            .find('span').text(fl).end()
            .parent().find('i').addClass('hidden').end()
            .find('.login-text').text(name);

        api_req({"a": "uga", "u": u_handle, "ua": "+a"}, {
            callback: tryCatch(function(res) {
                var src = res.length > 5 && mObjectURL([base64_to_ab(res)], 'image/jpeg');
                if (src) {
                    $avatarwrapper.safeHTML('<img src="@@"/>', src);
                }
            })
        });
    }
    else {
        $('.useravatar').addClass('hidden');
        $('.dropdown-item.login-item').find('i').removeClass('hidden').end().find('.login-text').text(l[16345]);
    }

    var $wrapper = $('.video-wrapper');
    $('body').rebind('click.bodyw', function() {
        if (!$wrapper.hasClass('share-option')) {
            $wrapper.removeClass('main-blur-block');
        }
        $('.files-menu.context').addClass('hidden').removeClass('mobile-mode');
    });

    $('video', $wrapper).rebind('click', function() {
        $('.play-video-button').trigger('click');
    });

    $('.moreoptions').rebind('click', function() {
        var $cm = $('.files-menu.context');

        if (!$cm.hasClass('hidden')) {
            $cm.addClass('hidden');
        }
        else if (is_mobile) {
            $cm.removeClass('hidden').addClass('mobile-mode');
            $wrapper.addClass('main-blur-block');
        }
        else {
            var top = $('.viewer-top-bl').height();
            var left = $cm.removeClass('hidden').outerWidth();

            $cm.css({'top': top, 'left': innerWidth - left - 4});
        }
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
    M.req = promisify(function(resolve, reject, params, ch) {
        api_req(typeof params === 'string' ? {a: params} : params, {
            callback: function(res) {
                if (typeof res === 'number' && res < 0) {
                    return reject(res);
                }
                resolve(res);
            }
        }, ch | 0);
    });

    dlmanager = Object.create(null);
    dlmanager._quotaTasks = [];
    dlmanager.logger = new MegaLogger();
    dlmanager.getQBQData = dummy;
    dlmanager.setUserFlags = dummy;
    dlmanager._overquotaInfo = dummy;
    dlmanager.getCurrentDownloads = dummy;
    dlmanager.onNolongerOverquota = dummy;
    dlmanager.getCurrentDownloadsSize = dummy;
    dlmanager._onOverQuotaAttemptRetry = dummy;
    dlmanager.showOverQuotaDialog = function(task) {
        var $wrapper = $('.video-wrapper').addClass('main-blur-block');
        var $block = $('.transfer-limitation-block').removeClass('hidden');

        if (typeof task === 'function') {
            this._quotaTasks.push(tryCatch(task));
        }
        this.isOverQuota = true;
        this.isOverFreeQuota = !u_type;

        $('.button.signup', $block).text(l[209]);
        $('.button.login', $block).text(l[16345]);
        $('.transfer-body', $block).text(l[19615]);
        $('.upgrade-option .button', $block).text(l[17542]);
        $('.upgrade-option', $block).addClass('hidden');
        $('.signin-register-option', $block).addClass('hidden');

        if (u_type && u_attr.p) {
            $('.transfer-body', $block).text(l[19617]);
            $('.upgrade-option .button', $block).text(l[19616]);
        }

        if (!u_type && u_wasloggedin()) {
            $('.button.signup', $block).text(l[17542]);
            $('.signin-register-option', $block).removeClass('hidden');
        }
        else {
            $('.upgrade-option', $block).removeClass('hidden');
        }

        $('.button.login, .button.signup, .upgrade-option .button', $block).rebind('click', function() {
            var page = 'pro';
            var text = $.trim($(this).text());

            if (text === l[209]) {
                page = 'register';
            }
            else if (text === l[16345]) {
                page = 'login';
            }

            open(getBaseUrl() + '/' + page);
            return false;
        });

        $('.close-overlay', $block).rebind('click', function() {
            $block.addClass('hidden');
            $wrapper.removeClass('main-blur-block');
        });
    };
    dlmanager._onQuotaRetry = function() {
        for (var i = 0; i < this._quotaTasks.length; i++) {
            this._quotaTasks[i]();
        }
        this._quotaTasks = [];
    };
});

mBroadcaster.once('startMega', function() {
    'use strict';

    function expand(p, m) {
        return function(a, b) {
            p[m](a, b || console.debug.bind(console, m));
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

    inherits(MegaPromise, window.Promise || {});

    window.MegaPromise = MegaPromise;
});

function MegaLogger(n, o) {
    this.options = Object(o);
}

inherits(MegaLogger, console);
MegaLogger.getLogger = function(n, o) {
    return ("ActiveXObject" in window) ? console : new MegaLogger(n, o);
};

function getBaseUrl() {
    'use strict';

    return 'https://' + (((location.protocol === 'https:') && location.host) || 'mega.nz');
}
function getAppBaseUrl() {
    'use strict';

    var l = location;
    var base = (l.origin !== 'null' && l.origin || (l.protocol + '//' + l.hostname));
    if (is_extension) {
        base += l.pathname;
    }
    return base;
}

function under(page) {
    'use strict';

    try {
        return (top !== self && top.location.host === 'mega.nz' || d) && top.getCleanSitePath() === page;
    }
    catch (ex) {}

    return false;
}

function showToast() {
    'use strict';

    var $toast = $('.toast-notification');
    $toast.addClass('visible second');
    setTimeout(function() {
        $toast.removeClass('visible second');
    }, 2000);
}

function msgDialog(type, title, msg, submsg, callback, checkbox) {
    if (d) {
        console.debug('msgDialog', arguments)
    }
    alert(String(msg) + (submsg ? '\n\n' + submsg : ''));
}

function pagemetadata() {
    'use strict';

    var filter = function(s) {
        return String(s).replace(/[<">]/g, '');
    };

    var append = function(p, c, k) {
        p = filter(p);
        k = k || 'property';
        $('meta[' + k + '="' + p + '"]').remove();
        $('head').append('<meta ' + k + '="' + p + '" content="' + filter(c) + '">');
    };

    append('description', mega.whoami, 'name');

    if (ep_node) {
        var url = getBaseUrl() + '/embed#!' + ep_node.link;
        var data = MediaAttribute(ep_node).data;

        if (mega.flags.nlfe) {
            url = getBaseUrl() + '/embed/' + ep_node.link.replace('!', '#');
        }

        if (data) {
            append('og:duration', data.playtime);

            if (data.width) {
                append('og:type', 'video.other');
                append('og:video', url);
                append('og:video:secure_url', url);
                append('og:video:type', 'video/mp4');
                append('og:video:width', data.width);
                append('og:video:height', data.height);
                append('video:duration', data.playtime);
            }
        }

        if (ep_node.mtime) {
            append('date', (new Date(ep_node.mtime * 1000)).toISOString(), 'name');
        }

        var title = 'MEGA - ' + ep_node.name;
        document.title = title;
        append('og:url', url);
        append('og:title', title);
        append('keywords', title.split(/\W+/).filter(String).sort().join(',').toLowerCase(), 'name');
    }
    else {
        document.title = 'MEGA';
    }
}
