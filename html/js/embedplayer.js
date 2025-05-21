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

    const [ph, key, opt] = isPublicLink(page) || [];
    $.playbackOptions = opt;

    var init = function(res) {
        init_embed(ph, key, res);
    };

    if (dl_res || !key) {
        init(dl_res);
    }
    else {
        api.req({a: 'g', p: ph})
            .then((p) => init(p.result))
            .catch(init);
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
        const link = '/file/' + ph + '#' + key;

        // XXX: as needed for mega.io given we cannot access the parent domain reliably of course..
        var unfortunateHackpatch = ph === 'RvY01QZB' || ph === '8rI0GIrQ';

        // Remove header and logo on embed player when viewing the security video on /security page
        if (unfortunateHackpatch || under('security')) {
            $('.viewer-top-bl, .logo-container').remove();
            $('.viewer-bottom-bl').addClass('no-grad');
            $('.media-viewer').addClass('no-bg-color');
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

        $('.embedcode-item, .getlink-item, .share').rebind('click', function() {
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

            $('.copy', $block).rebind('click', function() {
                let content = String(this.previousElementSibling.querySelectorAll('.tab-content')[0].textContent);
                if (playing && document.getElementById('timecheckbox').checked) {
                    content = content.replace(/[!/][\w-]{8}[!#][^"]+/, '$&!' + timeoffset + 's');
                }
                copyToClipboard(content, l[16763]);
            });

            $('.share-link .tab-content', $block).rebind('click', () => {
                selectText('share-link-field');
                return false;
            });

            $('.embed-code .tab-content', $block).rebind('click', () => {
                selectText('embed-code-field');
                return false;
            });

            (function _() {
                $('.tab-link', $block).removeClass('active').rebind('click', _);
                $('.share-link .tab-content', $block).text(url.replace('/embed', '/file'));
                $('.embed-code .tab-content', $block).text(embed.replace('%', url));
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

        if (String($.playbackOptions).includes('1v')) {
            $('.video-wrapper').remove();
            Object.defineProperty(window, 'is_embed', {value: 2, writable: false});

            document.body.style.backgroundColor = 'transparent';

            if (!self.darkloader) {
                document.body.classList.remove('theme-dark-forced');
                document.body.classList.add('theme-light');
            }
            if ($.playbackOptions.includes('1c')) {
                $('.audio-wrapper .share').addClass('invisible');
            }
            else {
                $('.audio-wrapper .share').rebind('click', function() {
                    copyToClipboard(getBaseUrl() + link, l[16763]);
                    const $this = $(this).addClass('clicked');
                    later(() => $this.removeClass('clicked'));
                    return false;
                });
            }
            const $thumb = $('.audio-wrapper .audio-thumbnail img')
                .attr('src', `${staticpath}/images/mega/audio.png`);
            getImage(node, 1).then((uri) => $thumb.attr('src', uri)).catch(dump);

            $('.audio-wrapper .video-timing.duration')
                .text(secondsToTimeShort(MediaAttribute(node).data.playtime, 1));
        }
        else {
            $('.audio-wrapper').remove();
        }

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
    const { style } = elm;
    style.maxWidth = style.minWidth = '100vw';
    style.maxHeight = style.minHeight = '100vh';

    elm.controls = false;

    topmenuUI();
}

function topmenuUI() {
    'use strict';
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
}

// Setup desktop variant stubs
mBroadcaster.once('startMega', function() {
    'use strict';

    var dummy = function() {
        return false;
    };
    loadingDialog = {show: dummy, hide: dummy};

    M = Object.create(null);
    M.d = Object.create(null);
    M.xhr = megaUtilsXHR;
    M.gfsfetch = megaUtilsGFSFetch;
    M.getStack = function() {
        return String(new Error().stack);
    };
    M.hasPendingTransfers = dummy;
    M.getNodeByHandle = (h) => Object(M.d[h]);

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
        $('.transfer-heading', $block).text(l[17]);
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
    window.LRUMegaDexie = {
        create() {
            return {error: -1};
        }
    };
    window.MEGAException = DOMException;
    window.MEGAException.assert = window.assert = (e, ...a) => {
        if (!e) {
            throw new MEGAException(...a);
        }
    };
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

function showToast(type, content, timeout) {
    'use strict';

    const $toast = $('.toast-notification').addClass('visible second');
    $('.toast-message', $toast).text(content);

    setTimeout(() => {
        $toast.removeClass('visible second');
    }, parseInt(timeout) || 2000);
}

function msgDialog(type, title, msg, submsg, callback, checkbox) {
    'use strict';

    if (d) {
        console.debug('msgDialog', type, title, msg, submsg);
    }
    // alert(String(msg) + (submsg ? '\n\n' + submsg : ''));

    var $wrapper = $('.video-wrapper').addClass('main-blur-block');
    var $block = $('.transfer-limitation-block').removeClass('hidden');

    $('.transfer-heading', $block).text(title);
    $('.transfer-body', $block).text(String(msg) + (submsg ? '\n\n' + submsg : ''));

    $('.upgrade-option', $block).removeClass('hidden');
    $('.upgrade-option .button', $block).text(l[16518]);
    $('.signin-register-option', $block).addClass('hidden');

    $('.upgrade-option .button', $block).rebind('click', function() {
        $('.viewonmega-item').trigger('click');
        return false;
    });

    $('.close-overlay', $block).rebind('click', function() {
        $block.addClass('hidden');
        $wrapper.removeClass('main-blur-block');
        location.reload(true);
    });
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
    append('robots', 'noindex', 'name');

    if (ep_node) {
        const url = getBaseUrl() + '/embed/' + ep_node.link.replace('!', '#');
        const data = MediaAttribute(ep_node).data;

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
