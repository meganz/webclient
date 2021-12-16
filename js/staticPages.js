function dummy() {
    'use strict';
    return false;
}


var notify = Object.create(null);
notify.init = dummy;
notify.notifyFromActionPacket = dummy;
notify.countAndShowNewNotifications = dummy;
notify.closePopup = dummy;
notify.markAllNotificationsAsSeen = dummy;

var alarm = Object.create(null);
alarm.overQuota = Object.create(null);
alarm.overQuota.render = dummy;
alarm.ephemeralSession = Object.create(null);
alarm.ephemeralSession.render = dummy;
alarm.nonActivatedAccount = Object.create(null);
alarm.nonActivatedAccount.render = dummy;
alarm.planExpired = Object.create(null);
alarm.planExpired.render = dummy;
alarm.planExpired.lastPayment = null;
alarm.siteUpdate = Object.create(null);
alarm.siteUpdate.init = dummy;
alarm.hideAllWarningPopups = dummy;


const folderlink = false;
const fminitialized = false;
const u_handle = false;
const dlmanager = Object.create(null);
dlmanager.isUploading = false;
dlmanager.isDownloading = false;
const dlinfo = dummy;
const ulmanager = Object.create(null);
ulmanager.isUploading = false;

var EAGAIN = -3;
var EFAILED = -5;
var ENOENT = -9;
var ECIRCULAR = -10;
var EACCESS = -11;
var EEXIST = -12;
var EINCOMPLETE = -13;
var EKEY = -14;
var ESID = -15;
var EBLOCKED = -16;
var EOVERQUOTA = -17;
var ETEMPUNAVAIL = -18;

function ab_to_str(ab) {
    'use strict';
    var b = '';
    var ab8 = new Uint8Array(ab);
    for (var i = 0; i < ab8.length; i++) {
        b += String.fromCharCode(ab8[i]);
    }
    return b;
}

let seqNo = -Math.floor(Math.random() * 0x100000000);
function api_req(req, context) {
    'use strict';
    const sn = ++seqNo;
    let uri = apipath + 'cs?id=' + sn + mega.urlParams();
    let payload = '';
    if (typeof req === 'string') {
        uri += '&' + req;
    }
    else {
        payload = JSON.stringify([req]);
    }
    if (d) {
        console.log('[%s] API request', sn.toString(16).slice(-6), payload, uri);
    }
    let success = dummy;
    let fail = dummy;
    if (context && typeof context.callback === 'function') {
        success = async(res) => {
            if (!res.ok) {
                // @todo retry (?)
                if (d) {
                    console.error('[%s] API req failed.', sn.toString(16).slice(-6), res);
                }
                return context.callback(EAGAIN, context);
            }
            const data = await res.json();
            if (d) {
                console.debug('[%s] API res', sn.toString(16).slice(-6), [res], data);
            }
            context.callback(data[0], context);
        };
        fail = ex => {
            if (d) {
                console.error('[%s] API req ERROR', sn.toString(16).slice(-6), ex);
            }
            context.callback(EFAILED, context);
        };
    }
    fetch(uri, { method: 'POST', body: payload })
        .then(success)
        .catch(fail);
}
const MegaData = dummy;
const u_checklogin = boot_auth;
const u_attr = undefined;
MegaData.prototype.getSiteVersion = () => {
    'use strict';
    return (buildVersion && buildVersion.website) || 'dev';
};
MegaData.prototype.req = promisify(function(resolve, reject, params, ch) {
    api_req(typeof params === 'string' ? { a: params } : params, {
        callback: function(res) {
            if (typeof res === 'number' && res < 0) {
                return reject(res);
            }
            resolve(res);
        }
    });
});
MegaData.prototype.uiSaveLang = promisify(async function(resolve, reject, aNewLang) {
    'use strict';
    let storage = localStorage;
    /**
    if ('csp' in window) {
        await csp.init();
        if (!csp.has('pref')) {
            storage = sessionStorage;
        }
    }
    /**/
    storage.lang = aNewLang;
    resolve();
});
MegaData.prototype.xhr = megaUtilsXHR;
MegaData.prototype.loading = Object.create(null);
MegaData.prototype.pending = [];
MegaData.prototype.require = () => MegaPromise.resolve();
/* eslint-disable no-useless-concat */
MegaData.prototype['safeSh' + 'owDialog'] = function(name, dsp) {
    'use strict';
    const $dialog = $(typeof dsp === 'function' ? dsp() : dsp);

    $('.fm-dialog:visible, .mega-dialog:visible, .overlay:visible').addClass('arrange-to-back');

    fm_showoverlay();
    $dialog.removeClass('hidden arrange-to-back');

    if (!is_mobile) {
        // Center dialogs
        $dialog.css({
            'margin-left': -1 * ($dialog.outerWidth() / 2),
            'margin-top': -1 * ($dialog.outerHeight() / 2)
        });
    }

    console.assert(!$.dialog);
    // eslint-disable-next-line local-rules/hints
    $.dialog = name;
};

function closeDialog() {
    'use strict';
    fm_hideoverlay();
    $('.fm-dialog, .mega-dialog, .fm-dialog-mobile').trigger('dialog-closed').addClass('hidden');
    $('.fm-dialog, .mega-dialog, .overlay.arrange-to-back, .fm-dialog-mobile').removeClass('arrange-to-back');

    delete $.dialog;
    mBroadcaster.sendMessage('closedialog');
}

function elementIsVisible(el) {
    'use strict';
    if (!(el && el.parentNode)) {
        return false;
    }
    if (window.getComputedStyle(el).position !== 'fixed' && !el.offsetParent) {
        return false;
    }
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

/* eslint-disable strict */
const to8 = data => unescape(encodeURIComponent(data));
const base64urlencode = data => btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

var MegaLogger = console;
MegaLogger.getLogger = () => { return console };
MegaData.prototype.getStack = dummy;
MegaData.prototype.hasPendingTransfers = dummy;
const u_savekey = dummy;
const fmconfig = Object.create(null);
fmconfig.uidateformat = false;
const checkUserLogin = () => {
    'use strict';
    loadSubPage('login');
    return true;
};
MegaData.prototype.abortTransfers = () => { return Promise.resolve() };
const moveToNZ = (page) => {
    'use strict';
    const extra = { pro: 1, sdk: 1, refer: 1 };
    if (!isStaticPage(page) && !extra[page]) {
        mega.redirect('mega.nz', page);
    }
};
mBroadcaster.once('startMega:desktop', () => {
    'use strict';
    if (pages.staticdialog) {
        $('body').safeAppend(translate(pages.staticdialog));
        delete pages.staticdialog;
    }
});

mBroadcaster.addListener('pagechange', moveToNZ);

const tooltiplogin = Object.create(null);
tooltiplogin.init = () => {
    loadSubPage('login');
};
var init_register = dummy;
const init_login = dummy;
const accountinputs = Object.create(null);
accountinputs.init = dummy;

mBroadcaster.once('boot_done', () => {
    'use strict';
    delete subpages.register;
    pages.register = ' ';
    delete subpages.recovery;
    pages.recovery = ' ';
    delete subpages.reset;
    pages.reset = ' ';
    delete subpages.cancel;
    pages.cancel = ' ';
    delete subpages.newsignup;
    pages.newsignup = ' ';
    delete subpages.recover;
    pages.recover = ' ';
    delete subpages.megadrop;
    pages.megadrop = ' ';
    delete subpages.copyrightnotice;
    pages.copyrightnotice = ' ';
    delete subpages.disputenotice;
    pages.disputenotice = ' ';
    pages.login = ' ';
    pages.registerb = ' ';
    showSignupPromptDialog = () => {
        'use strict';
        const selectedPlan = $('.pricing-page.plan.selected', 'body').data('payment');
        const kvLogin = [['next', 'propay_' + selectedPlan]];
        const kvReg = [['next', '1'], ['plan', selectedPlan]];
        if (is_mobile) {
            const $mobileDlg = $('.mobile.loginrequired-dialog', '#startholder');
            const closeMobileDlg = () => {
                $mobileDlg.addClass('hidden').removeClass('overlay');
                $('html').removeClass('overlayed');
            };
            $('.fm-dialog-close', $mobileDlg).rebind('tap', closeMobileDlg);
            $('.register', $mobileDlg).rebind('tap', mega.redirect.bind(mega, 'mega.nz', 'register', kvReg, null));
            $('.login', $mobileDlg).rebind('tap', mega.redirect.bind(mega, 'mega.nz', 'login', kvLogin, null));
            $mobileDlg.removeClass('hidden').addClass('overlay');
            $('html').addClass('overlayed');
        }
        else {
            const $dlg = $('.loginrequired-dialog', '.common-container');
            $('header h2', $dlg).text(l[5841]);
            $('header p', $dlg).text(l[5842]);
            $($dlg).addClass('pro' + selectedPlan);
            $('.js-close', $dlg).rebind('click', () => {
                $($dlg).removeClass('pro1 pro2 pro3 pro4');
                closeDialog();
            });
            $('.pro-login').rebind('click', mega.redirect.bind(mega, 'mega.nz', 'login', kvLogin, null));
            $('.pro-register').rebind('click', mega.redirect.bind(mega, 'mega.nz', 'pro', kvReg, null));
            M.safeShowDialog('loginrequired', $dlg);
        }
    };

    if (is_mobile) {
        mobile.downloadOverlay = Object.create(null);
        mobile.signin = Object.create(null);
        mobile.signin.show = dummy;
        mobile.register = Object.create(null);
        mobile.register.show = dummy;
        mobile.support = Object.create(null);
        mobile.support.init = dummy;
    }
});
const isEphemeral = dummy;
const BusinessRegister = dummy;
BusinessRegister.prototype.initPage = dummy;
var loadingDialog = Object.create(null);
loadingDialog.show = () => {
    'use strict';
    $('.dark-overlay:not(.mobile)', 'body').removeClass('hidden');
};
loadingDialog.hide = () => {
    'use strict';
    $('.dark-overlay:not(.mobile)', 'body').removeClass('white').addClass('hidden');
};
const InitFileDrag = dummy;
function getBaseUrl() {
    'use strict';
    return 'https://' + (((location.protocol === 'https:') && location.host) || 'mega.nz');
}
function megatitle() {
    'use strict';
    if (document.title !== mega_title) {
        document.title = mega_title;
    }
}
function clickURLs() {
    'use strict';
    var nodeList = document.querySelectorAll('a.clickurl');

    if (nodeList.length) {
        $(nodeList).rebind('click', function() {
            var $this = $(this);
            var url = $this.attr('href') || $this.data('fxhref');

            if (url) {
                var target = $this.attr('target');

                if (target === '_blank') {
                    open(getBaseUrl() + url);
                    return false;
                }

                if (window.loadingDialog && $this.hasClass('pages-nav')) {
                    loadingDialog.quiet = true;
                    onIdle(function() {
                        loadingDialog.quiet = false;
                    });
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
                    if (page === "privacy") {
                        $toScroll = $('html');
                    }
                    else if (page === "terms") {
                        $toScroll = $('.fm-block.terms-of-service .mobile.fm-scrolling');
                    }
                }
                else {
                    $toScroll = $scrollTo.closest(".jspScrollable");
                    if ($toScroll.length) {
                        var jspInstance = $toScroll.data('jsp');
                        if (jspInstance) {
                            jspInstance.scrollToY(newOffset);
                        }
                        return false;
                    }
                    else {
                        $toScroll = $('.fmholder');
                    }
                }
                if ($toScroll) {
                    $toScroll.animate({ scrollTop: newOffset - 40 }, 400);
                }
            }
        });
    }
    nodeList = undefined;
}
const blockChromePasswordManager = dummy;
function MurmurHash3(key, seed) {
    var remainder, bytes, h1, h1b, c1, c2, k1, i;

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
function fastHashFunction(val) {
    'use strict';
    return MurmurHash3(val, 0x4ef5391a).toString();
}
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
const getUAOParameter = dummy;
function numOfBytes(bytes, precision, isSpd) {
    'use strict';
    if (typeof precision === 'undefined') {
        precision = 2;
    }
    var fn = isSpd ? bytesToSpeed : bytesToSize;
    var parts = fn(bytes, precision).split(' ');
    return { size: parts[0], unit: parts[1] || 'B' };
}
function bytesToSize(bytes, precision, format) {
    'use strict';
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
    if (window.lang !== 'en') {
        resultSize = mega.intl.decimal.format(resultSize);
    }
    if (format === 2) {
        return resultSize + '<span>' + resultUnit + '</span>';
    }
    else if (format === 3) {
        return resultSize;
    }
    else if (format) {
        return '<span>' + resultSize + '</span>' + resultUnit;
    }
    else {
        return resultSize + ' ' + resultUnit;
    }
}
function makeid(len) {
    'use strict';
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < len; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
const MegaAnalytics = function(id) {
    this.loggerId = id;
    this.sessionId = makeid(16);
};
MegaAnalytics.prototype.log = function(c, e, data) {
    'use strict';
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
window.megaAnalytics = new MegaAnalytics(99999);
mega.ui.showLoginRequiredDialog = () => {
    'use strict';
    mega.redirect('mega.nz', 'refer');
    return MegaPromise.reject();
};
function RegExpEscape(text) {
    'use strict';
    return text.replace(/[\s#$()*+,.?[\\\]^{|}-]/g, "\\$&");
}
MegaData.prototype.v = Object.create(null);
function fm_showoverlay() {
    'use strict';
    $('.fm-dialog-overlay').removeClass('hidden');
    $('html').addClass('overlayed');
}
function fm_hideoverlay() {
    "use strict";
    if (!$.propertiesDialog) {
        $('.fm-dialog-overlay').addClass('hidden');
        $('html').removeClass('overlayed');
    }
    $(document).trigger('MegaCloseDialog');
}
window.mega.ui.searchbar = dummy;
window.mega.ui.searchbar.refresh = dummy;
window.mega.ui.searchbar.init = dummy;

RevampOnboarding = dummy;
RevampOnboarding.removeFeedbackTip = dummy;
RevampOnboarding.isDone = dummy;

var showToast = dummy;
window.toastRack = dummy;
var bottomPageDialog = () => {
    'use strict';
    mega.redirect('mega.nz', 'sdk');
};
const copyright = Object.create(null);
copyright.init_cn = dummy;
copyright.init_cndispute = dummy;
const u_wasloggedin = dummy;

const loadSubPageNZ = window.loadSubPage;
loadSubPageNZ.passth = {
    'login': 1,
    'support': 1
};
window.loadSubPage = function(page) {
    if (loadSubPageNZ.passth[page]) {
        pushHistoryState(page);
        return mega.redirect('mega.nz', page);
    }
    if (is_litesite && isPublicLink(page)) {
        return false;
    }

    return loadSubPageNZ.apply(this, arguments);
};

function BusinessAccount() {}

BusinessAccount.prototype.getBusinessPlanInfo = function(forceUpdate) {
    "use strict";
    var operationPromise = new MegaPromise();

    if (!forceUpdate) {
        if (mega.buinsessAccount && mega.buinsessAccount.cachedBusinessPlan) {
            var currTime = new Date().getTime();
            if (mega.buinsessAccount.cachedBusinessPlan.timestamp &&
                (currTime - mega.buinsessAccount.cachedBusinessPlan.timestamp) < this.invoiceListUpdateFreq) {
                return operationPromise.resolve(1, mega.buinsessAccount.cachedBusinessPlan);
            }
        }
    }

    var request = {
        a: 'utqa',  // get a list of plans
        nf: 2,      // extended format
        b: 1        // also show business plans
    };

    api_req(request, {
        callback: function (res) {
            if ($.isNumeric(res)) {
                operationPromise.reject(0, res, 'API returned error');
            }
            else if (typeof res === 'object') {
                var currTime = new Date().getTime();
                mega.buinsessAccount = mega.buinsessAccount || Object.create(null);
                var businessPlan = Object.create(null);
                businessPlan.timestamp = currTime;
                for (var h = 0; h < res.length; h++) {
                    if (res[h].it) {
                        businessPlan = res[h];
                        businessPlan.bd.us.lp /= 100;
                        businessPlan.bd.us.p /= 100;
                        businessPlan.bd.trns.lp /= 100;
                        businessPlan.bd.trns.p /= 100;
                        businessPlan.bd.sto.lp /= 100;
                        businessPlan.bd.sto.p /= 100;
                        businessPlan.timestamp = currTime;
                        businessPlan.l = res[0].l;
                        break;
                    }
                }
                mega.buinsessAccount.cachedBusinessPlan = businessPlan;
                operationPromise.resolve(1, businessPlan); // payment gateways list
            }
            else {
                operationPromise.reject(0, 4, 'API returned error, ret=' + res);
            }
        }

    });

    return operationPromise;

};

window.redirectToSupport = (url) => {
    'use strict';
    const kvLogin = [['next', 'support'], ['articleUrl', url.replace('mega.io', 'mega.nz')]];
    const $dlg = $('.loginrequired-dialog', '.common-container');
    $('header h3', $dlg).text(l[5841]);
    $('header p', $dlg).text(l.help2_login_text);
    $('.js-close', $dlg).rebind('click.help2', () => {
        $('.pro-register', $dlg).removeClass('hidden');
        closeDialog();
    });
    $('.pro-login', $dlg).rebind('click.help2', mega.redirect.bind(mega, 'mega.nz', 'login', kvLogin, null));
    $('.pro-register', $dlg).addClass('hidden');
    M.safeShowDialog('loginrequired', $dlg);
};

const MegaUtils = dummy;

MegaUtils.prototype.getCountries = function() {
    'use strict';

    if (!this._countries) {
        this._countries = (new RegionsCollection()).countries;
    }
    return this._countries;
};

MegaUtils.prototype.sortObjFn = function(key, order, alternativeFn) {
    'use strict';

    if (!order) {
        order = 1;
    }

    if (typeof key !== 'function') {
        var k = key;
        key = function(o) {
            return o[k];
        };
    }

    return function(a, b, tmpOrder) {
        var currentOrder = tmpOrder ? tmpOrder : order;

        var aVal = key(a);
        var bVal = key(b);

        if (typeof aVal === 'string' && typeof bVal === 'string') {
            return aVal.localeCompare(bVal, locale) * currentOrder;
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
            }
            else {
                if (alternativeFn) {
                    return alternativeFn(a, b, currentOrder);
                }
                else {
                    return 0;
                }
            }
        }
        else {
            return 0;
        }
    };
};

function isValidEmail(email) {

    'use strict';
    // reference to html spec https://html.spec.whatwg.org/multipage/input.html#e-mail-state-(type=email)
    // with one modification, that the standard allows emails like khaled@mega
    // which is possible in local environment/networks but not in WWW.
    // so I applied + instead of * at the end
    var regex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return regex.test(email);
}
