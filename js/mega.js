var newnodes;
var maxaction;
var fminitialized = false;
var dl_interval, ul_interval;

var fmconfig = {};
if (localStorage.fmconfig) {
    fmconfig = JSON.parse(localStorage.fmconfig);
}

// Set up the MegaLogger's root logger
MegaLogger.rootLogger = new MegaLogger(
    "",
    {
        onCritical: function(msg, pkg) {
            if (typeof pkg === 'string') {
                pkg = pkg.split('[').shift();
                if (pkg) {
                    msg = '[' + pkg + '] ' + msg;
                }
            }
            srvlog(msg, 0, 1);
        },
        isEnabled: !!window.d
    },
    false
);

if (typeof seqno === 'undefined')
    var seqno = Math.floor(Math.random() * 1000000000);
if (typeof n_h === 'undefined')
    var n_h = false;
if (typeof requesti === 'undefined')
    var requesti = makeid(10);
if (typeof folderlink === 'undefined')
    var folderlink = false;
if (typeof lang === 'undefined')
    var lang = 'en';
if (typeof Ext === 'undefined')
    var Ext = false;
if (typeof ie9 === 'undefined')
    var ie9 = false;
if (typeof loadingDialog === 'undefined') {
    var loadingDialog = {};
    loadingDialog.show = function() {
        $('.dark-overlay').show();
        $('.loading-spinner:not(.manual-management)').removeClass('hidden').addClass('active');
        this.active = true;
    };
    loadingDialog.hide = function() {
        $('.dark-overlay').hide();
        $('.loading-spinner:not(.manual-management)').addClass('hidden').removeClass('active');
        this.active = false;
   };
}
if (typeof loadingInitDialog === 'undefined') {
    var loadingInitDialog = {};
    loadingInitDialog.progress = false;
    loadingInitDialog.active = false;
    loadingInitDialog.show = function() {
        if (pfid) {
            $('.loading-spinner .step1').text(l[8584]);
            $('.loading-spinner .step2').text(l[8585]);
            $('.loading-spinner .step3').text(l[8586]);
        }
        else {
            $('.loading-spinner .step1').text(l[8577]);
            $('.loading-spinner .step2').text(l[8578]);
            $('.loading-spinner .step3').text(l[8579]);
        }
        this.hide();
        $('.light-overlay').removeClass('hidden');
        $('.loading-spinner:not(.manual-management)').removeClass('hidden').addClass('init active');
        this.active = true;
    };
    loadingInitDialog.step1 = function() {
        $('.loading-info li.loading').addClass('loaded').removeClass('loading');
        $('.loading-info li.step1').addClass('loading');
    };
    loadingInitDialog.step2 = function(progress) {
        if (!this.active) {
            return;
        }
        if (this.progress === false) {
            $('.loading-info li.loading').addClass('loaded').removeClass('loading');
            $('.loading-info li.step2').addClass('loading');
            $('.loader-progressbar').addClass('active');

            // Load performance report
            mega.loadReport.ttfb          = Date.now() - mega.loadReport.stepTimeStamp;
            mega.loadReport.stepTimeStamp = Date.now();

            // If the PSA is visible reposition the account loading bar
            psa.repositionAccountLoadingBar();
        }
        if (progress) {
            $('.loader-percents').width(progress + '%');
        }
        this.progress = true;
    };
    loadingInitDialog.step3 = function() {
        if (this.progress) {
            $('.loading-info li.loading').addClass('loaded').removeClass('loading');
            $('.loading-info li.step3').addClass('loading');
            $('.loader-progressbar').removeClass('active').css('bottom', 0);
        }
    };
    loadingInitDialog.hide = function() {
        this.active = false;
        this.progress = false;
        $('.light-overlay').addClass('hidden');
        $('.loading-spinner:not(.manual-management)').addClass('hidden').removeClass('init active');
        $('.loading-info li').removeClass('loading loaded');
        $('.loader-progressbar').removeClass('active');
        $('.loader-percents').width('0%');
        $('.loader-percents').removeAttr('style');
    };
}

/**
 * @typedef {Object} MEGA_USER_STRUCT
 *      Access using namespace mega.u
 *      Access using global variable M.u
 *      An object holding informations about specific contacts/user identified
 *      by "handle" as base64 URL encoded 88-bit value.
 *      Caches informations for current/past full contacts.
 *      Pending contacts informations are not stored here.
 * @property {String} u
 *     Mega user handle as base64 URL encoded 88-bit value.
 * @property {Number} c
 *     Contact access right/status: 2: owner, 1: active contact, 0: otherwise.
 * @property {String} m
 *     Email address of the contact.
 * @property {Array} m2
 *     Array of all emails/phone numbers of a user.
 * @property {String} name
 *     Combines users First and Last name defined in user profile.
 *     If First and Last name in user profile are undefined holds users email.
 *     It's used at least like index field for search contacts in share dialog.
 *     It combines `firstname` and `lastname` of user attributes.
 * @property {String} h
 *     Holds user handle, value equal to 'u' param. Used only when synching with
 *     M.d, deeply rooted in code. should not be removed.
 *     Reason behind it should be searched in file/folders caching structure,
 *     'h' represents file/folder "handle" as base64 URL encoded 64-bit value.
 * @property {Number} t
 *     For active contacts but not for the owner 't' is set to 1. For non active
 *     contacts and owner it's 'undefined'. Used when synching with M.d, deeply
 *     rooted in code. should not be removed.
 *     Reason behind it should be searched in file/folders caching structure,
 *     't' represents type of item: 2: Cloud Drive root, 1: folder, 0: file
 * @property {String} p
 *     Logic inherited from file manager where parent directory 'p' is
 *     represented by base64 URL encoded 64-bit value.
 *     Root directory for Cloud Drive is cached in M.RootID.
 *     This parameter represents top level/root/parent for 'Contacts' tab.
 *     All contacts are bind to account owner but instead of owners "handle"
 *     as base64 URL encoded 88-bit value we are using 'contacts'.
 * @property {Number} ts
 *     UNIX epoch time stamp as an integer in seconds to record last change of
 *     parameters values.
 * @property {Number} lastChatActivity
 *     UNIX epoch time stamp as an integer in seconds for the last chat
 *     activity.
 */
var MEGA_USER_STRUCT = {
    "u": undefined,
    "c": undefined,
    "m": undefined,
    "m2": undefined,
    "name": undefined,
    "h": undefined,
    "t": undefined,
    "p": undefined,
    "presence": undefined,
    "presenceMtime": undefined,
    "displayColor": NaN,
    "shortName": "",
    "firstName": "",
    "lastName": "",
    "ts": undefined,
    "avatar": undefined
};

function MegaData()
{
    this.h = {};
    this.csortd = -1;
    this.csort = 'name';
    this.tfsdomqueue = {};

    this.reset = function()
    {
        this.d = {};
        this.v = [];
        this.c = {};

        if (typeof MegaDataMap !== 'undefined') {
            this.u = new MegaDataMap();
            this.u.addChangeListener(function() {
                M.onContactsChanged();
            });
        }

        this.t = {};
        this.opc = {};
        this.ipc = {};
        this.ps = {};
        this.su = {};
        this.sn = false;
        this.filter = false;
        this.sortfn = false;
        this.sortd = false;
        this.rendered = false;
        this.RootID = undefined;
        this.RubbishID = undefined;
        this.InboxID = undefined;
        this.viewmode = 0; // 0 list view, 1 block view

        mBroadcaster.sendMessage("MegaDataReset");
    };
    this.reset();

    this.getPropNames = function(memb) {
        return Object.getOwnPropertyNames(Object(this[memb]));
    };

    this.sortBy = function(fn, d)
    {
        this.v.sort(function(a, b)
        {
            if (!d)
                d = 1;
            if (a.t > b.t)
                return -1;
            else if (a.t < b.t)
                return 1;

            return fn(a, b, d);
        });
        this.sortfn = fn;
        this.sortd = d;
    };

    this.sort = function()
    {
        this.sortBy(this.sortfn, this.sortd);
    };

    this.sortReverse = function()
    {
        var d = 1;
        if (this.sortd > 0)
            d = -1;

        this.sortBy(this.sortfn, d);
    };

    this.getSortByNameFn = function() {
        var sortfn;

        if (typeof Intl !== 'undefined' && Intl.Collator) {
            var intl = new Intl.Collator('co', { numeric: true });

            sortfn = function(a, b, d) {

                // a.m part is related to contacts only. In case that user doesn't
                // have defined first or last name then email address will be used
                // for comparasion. Files and folders doesn't have .m field but
                // it's not possible to rename them to null i.e. '', => no side effects.
                var itemA = ((typeof a.name === 'string') && (a.name.length)) ? a.name : a.m;
                var itemB = ((typeof b.name === 'string') && (b.name.length)) ? b.name : b.m;

                return intl.compare(itemA, itemB) * d;
            };
        }
        else {
            sortfn = function(a, b, d) {

                // a.m part is related to contacts only. In case that user doesn't
                // have defined first or last name then email address will be used
                // for comparasion. Files and folders doesn't have .m field but
                // it's not possible to rename them to null i.e. '' => no side effects.
                var itemA = ((typeof a.name === 'string') && (a.name.length)) ? a.name : a.m;
                var itemB = ((typeof b.name === 'string') && (b.name.length)) ? b.name : b.m;

                return itemA.localeCompare(itemB) * d;
            };
        }

        return sortfn;
    };

    this.sortByName = function(d) {
        if (typeof Intl !== 'undefined' && Intl.Collator) {
            var intl = new Intl.Collator('co', { numeric: true });

            this.sortfn = function(a, b, d) {
                return intl.compare(a.name, b.name) * d;
            };
        }
        else
        {
            this.sortfn = function(a,b,d)
            {
                if (typeof a.name == 'string' && typeof b.name == 'string')
                    return a.name.localeCompare(b.name) * d;
                else
                    return -1;
            };
        }
        this.sortd = d;
        this.sort();
    };

    this.sortByModTime = function(d) {
        this.sortfn = function(a, b, d) {
            return (a.mtime < b.mtime) ? -1 * d : d;
        };
        this.sortd = d;
        this.sort();
    };

    this.sortByDateTime = function(d) {
        this.sortfn = this.getSortByDateTimeFn();
        this.sortd = d;
        this.sort();
    };

    this.getSortByDateTimeFn = function() {

        var sortfn;

        sortfn = function(a, b, d) {
            if (a.ts < b.ts) {
                return -1 * d;
            }
            else {
                return 1 * d;
            }
        };

        return sortfn;
    };

    this.sortByFav = function(d) {
        this.sortfn = this.getSortByFavFn();
        this.sortd = d;
        this.sort();
    };

    this.getSortByFavFn = function() {

        var sortfn;

        sortfn = function(a, b, d) {
            if (a.fav) {
                return -1 * d;
            }

            if (b.fav) {
                return d;
            }

            return 0;
        };

        return sortfn;
    };

    this.sortBySize = function(d)
    {
        this.sortfn = function(a, b, d)
        {
            if (typeof a.s !== 'undefined' && typeof b.s !== 'undefined' && a.s < b.s)
                return -1 * d;
            else
                return 1 * d;
        }
        this.sortd = d;
        this.sort();
    };

    this.sortByType = function(d)
    {
        this.sortfn = function(a, b, d)
        {
            if (typeof a.name == 'string' && typeof b.name == 'string')
                return filetype(a.name).localeCompare(filetype(b.name)) * d;
            else
                return -1;
        }
        this.sortd = d;
        this.sort();
    };

    this.sortByOwner = function(d)
    {
        this.sortfn = function(a, b, d)
        {
            var usera = Object(M.d[a.p]);
            var userb = Object(M.d[b.p]);

            if (typeof usera.name === 'string' && typeof userb.name === 'string') {
                return usera.name.localeCompare(userb.name) * d;
            }
            else {
                return -1;
            }
        }
        this.sortd = d;
        this.sort();
    };

    this.sortByAccess = function(d)
    {
        this.sortfn = function(a, b, d)
        {
            if (typeof a.r !== 'undefined' && typeof b.r !== 'undefined' && a.r < b.r)
                return -1 * d;
            else
                return 1 * d;
        }
        this.sortd = d;
        this.sort();
    };

    this.getSortStatus = function(u)
    {
        var status = megaChatIsReady && megaChat.karere.getPresence(megaChat.getJidFromNodeId(u));
        if (status == 'chat')
            return 1;
        else if (status == 'dnd')
            return 2;
        else if (status == 'away')
            return 3;
        else
            return 4;
    };

    this.getSortByStatusFn = function(d) {

        var sortfn;

        sortfn = function(a, b, d) {
            var statusa = M.getSortStatus(a.u), statusb = M.getSortStatus(b.u);
            if (statusa < statusb) {
                return -1 * d;
            }
            else if (statusa > statusb) {
                return 1 * d;
            }
            else if ((typeof a.name === 'string') && (typeof b.name === 'string')) {
                return a.name.localeCompare(b.name) * d;
            }
            else {
                return 0;
            }
        };

        return sortfn;
    };

    this.sortByStatus = function(d) {
        this.sortfn = this.getSortByStatusFn(d);
        this.sortd = d;
        this.sort();
    };

    this.getSortByInteractionFn = function() {

        var sortfn;

        sortfn = mega.utils.sortObjFn(
            function(r) {

                // Since the M.sort is using a COPY of the data,
                // we need an up-to-date .ts value directly from M.u[...]
                return M.u[r.h].ts;
            }, d
        );

        return sortfn;
    };

    this.sortByInteraction = function(d) {
        this.sortfn = this.getSortByInteractionFn();
        this.sortd = d;
        this.sort();
    };

    this.sortRules = {
        'name': this.sortByName.bind(this),
        'size': this.sortBySize.bind(this),
        'type': this.sortByType.bind(this),
        'date': this.sortByDateTime.bind(this),
        'ts': this.sortByDateTime.bind(this),
        'owner': this.sortByOwner.bind(this),
        'modified': this.sortByModTime.bind(this),
        'mtime': this.sortByModTime.bind(this),
        'interaction': this.sortByInteraction.bind(this),
        'access': this.sortByAccess.bind(this),
        'status': this.sortByStatus.bind(this),
        'fav': this.sortByFav.bind(this)
    };

    this.setLastColumn = function(col) {
        switch (col) {
        case 'ts':
        case 'mtime':
            // It's valid
            break;
        default:
            // Default value
            col = "ts";
            break;
        }

        if (col === this.lastColumn) {
            return;
        }

        this.lastColumn = col;
        localStorage._lastColumn = this.lastColumn;

        if ($('.do-sort[data-by="' + col + '"]').length > 0) {
            // swap the column label
            $('.context-menu-item.do-sort').removeClass('selected');
            $('.grid-url-header').prev().find('div')
                .removeClass().addClass('arrow ' + col)
                .text($('.do-sort[data-by="' + col + '"]').text());
            $('.do-sort[data-by="' + col + '"]').addClass('selected');
        }

    };

    this.lastColumn = null;

    this.doSort = function(n, d) {
        $('.grid-table-header .arrow').removeClass('asc desc');

        if (d > 0) {
            $('.arrow.' + n).addClass('desc');
        }
        else {
            $('.arrow.' + n).addClass('asc');
        }

        if (!M.sortRules[n]) {
            throw new Error("Cannot sort by " + n);
        }
        M.sortRules[n](d);

        M.sortmode = {n: n, d: d};

        if (fmconfig.uisorting) {
            mega.config.set('sorting', M.sortmode);
        }
        else {
            fmsortmode(M.currentdirid, n, d);
        }
    };

    /* Filters: */
    this.filterBy = function(f) {
        this.filter = f;
        this.v = [];
        for (var i in this.d) {
            if (f(this.d[i])) {
                this.v.push(this.d[i]);
            }
        }
    };

    /**
     * The same as filterBy, but instead of pushing the stuff in M.v, will return a new array.
     *
     * @param f function, with 1 arguments (node) that returns true when a specific node should be returned in the list
     * of filtered results
     */
    this.getFilterBy = function(f) {
        var v = [];
        for (var i in this.d) {
            if (f(this.d[i])) {
                v.push(this.d[i]);
            }
        }
        return v;
    };

    /* legacy method
    this.filterByParent = function(id) {
        this.filterBy(function(node) {
            return (node.p === id) || (node.p && (node.p.length === 11) && (id === 'shares'));
        });
    };*/

    this.filterByParent = function(id) {
        if (id === 'shares') {
            this.filterBy(function(node) {
                return (node.p === 'shares') || (node.p && node.p.length === 11);
            });
        }
        else if (id === 'contacts') {
            this.filterBy(function(node) {
                // Fill M.v with active contacts only
                return (node.p === 'contacts') && (node.c === 1);
            });
        }
        // We should have a parent's childs into M.c, no need to traverse the whole M.d
        else if (M.c[id]) {
            this.v = [];
            for (var handle in this.c[id]) {
                if (this.d[handle]) {
                    this.v.push(this.d[handle]);
                }
            }
        }
        else {
            this.filterBy(function(node) {
                return (node.p === id);
            });
        }
    };

    this.filterBySearch = function(str) {
        str = decodeURIComponent(String(str || '').replace('search/', '')).toLowerCase();

        if (str[0] === '~') {
            var command = str.substr(1);
            str = null;

            /*jshint -W089 */
            if (command === 'findupes') {
                var nodesByHash = {};

                for (var node in M.d) {
                    node = M.d[node];

                    if (node && node.hash && node.h && RootbyId(node.h) === M.RootID) {
                        if (!nodesByHash[node.hash]) {
                            nodesByHash[node.hash] = [];
                        }
                        nodesByHash[node.hash].push(node);
                    }
                }

                var dupes = Object.keys(nodesByHash).filter(function(hash) {
                    return nodesByHash[hash].length > 1;
                });

                M.v = [];
                for (var i in dupes) {
                    M.v = M.v.concat(nodesByHash[dupes[i]]);
                }

                if (M.overrideModes) {
                    M.overrideModes = 0;
                    M.overrideViewMode = 1;
                    M.overrideSortMode = ['size', -1];
                }

                // Wait for M.openFolder to finish and set colors to matching hashes
                M.onRenderFinished = function() {
                    var find = M.viewmode ? 'a' : 'tr';
                    $(window).trigger('dynlist.flush');
                    $(M.fsViewSel).find(find).each(function() {
                        var $this = $(this);
                        var node = M.d[$this.attr('id')];

                        if (node) {
                            var color = crc32(asmCrypto.SHA256.hex(node.hash)) >>> 8;

                            if (M.viewmode) {
                                var r = (color >> 16) & 0xff;
                                var g = (color >> 8) & 0xff;
                                var b = color & 0xff;

                                $this.find('.file-block-title')
                                    .css({
                                        'border-radius': '0 0 8px 8px',
                                        'background-color': 'rgba(' + r + ',' + g + ',' + b + ',0.3)'
                                    });
                            }
                            else {
                                color = ("00" + color.toString(16)).slice(-6);

                                $this.find('.transfer-filtype-icon')
                                    .css('background-color', '#' + color);
                            }
                        }
                    });
                    loadingDialog.hide();
                };
            }
            else {
                console.error('Unknown search command', command);
                str = '~' + command;
            }
            /*jshint +W089 */
        }

        if (str) {
            // Simple glob/wildcard support.
            // spaces are replaced with *, and * moved to regexp's .* matching
            var regex;
            str = str.replace(/\s+/g, '*');

            if (str.indexOf('*') !== -1) {
                try {
                    regex = RegExp(str.replace(/(\W)/g, '\\$1').replace(/\\\*/g, '.*'), 'i');
                }
                catch (ex) {}
            }

            if (regex) {
                this.filterBy(function(node) {
                    return regex.test(node.name);
                });
            }
            else {
                this.filterBy(function(node) {
                    return (node.name && node.name.toLowerCase().indexOf(str) !== -1);
                });
            }
        }
    };

    this.hasInboxItems = function() {
        return $.len(M.c[M.InboxID] || {}) > 0;
    };

    this.getInboxUsers = function() {
        var uniqueUsersList = {};
        this.getInboxItems().forEach(function(v, k) {
            assert(M.u[v.u], 'user is not in M.u when trying to access inbox item users');
            uniqueUsersList[v.u] = M.u[v.u];
        });

        return obj_values(uniqueUsersList);
    };

    this.getInboxItems = function() {
        return M.getFilterBy(function(node) { return node.p === M.InboxID; });
    };

    this.avatars = function(userPurgeList)
    {
        if (!M.c.contacts) {
            M.c.contacts = {};
        }
        if (u_handle) {
            M.c.contacts[u_handle] = 1;
        }

        if (userPurgeList) {
            // if provided, invalidate the pointed user avatars.
            if (!Array.isArray(userPurgeList)) {
                userPurgeList = [userPurgeList];
            }
            userPurgeList.forEach(useravatar.invalidateAvatar);
        }

        if (d) {
            console.time('M.avatars');
        }

        var waitingPromises = [];
        M.u.forEach(function(c, u) {
            if (!avatars[u] && (M.u[u].c === 1 || M.u[u].c === 2 || M.u[u].c === 0)) {

                waitingPromises.push(useravatar.loadAvatar(u));
            }
        });

        MegaPromise
            .allDone(
                waitingPromises
            ).always(function() {

                if (d) {
                    console.timeEnd('M.avatars');
                }
            });

        delete M.c.contacts[u_handle];
    };

    this.contactstatus = function(h, wantTimeStamp) {
        var folders = 0;
        var files = 0;
        var ts = 0;
        if (M.d[h]) {
            if (!wantTimeStamp || !M.d[h].ts) {
                var a = fm_getnodes(h);
                for (var i in a) {
                    if (!a.hasOwnProperty(i)) {
                        continue;
                    }
                    var n = M.d[a[i]];
                    if (n) {
                        if (ts < n.ts) {
                            ts = n.ts;
                        }
                        if (n.t) {
                            folders++;
                        }
                        else {
                            files++;
                        }
                    }
                }
                if (!M.d[h].ts) {
                    M.d[h].ts = ts;
                }
            }
            else {
                ts = M.d[h].ts;
            }
        }

        return { files: files, folders: folders, ts: ts };
    };

    this.onlineStatusClass = function(os) {
        if (os === 'dnd') {
            return [l[5925], 'busy'];
        }
        else if (os === 'away') {
            return [l[5924], 'away'];
        }
        else if ((os === 'chat') || (os === 'available')) {
            return [l[5923], 'online'];
        }
        else {
            return [l[5926], 'offline'];
        }
    };

    this.onlineStatusEvent = function(u, status) {
        if (u && megaChatIsReady) {
            // this event is triggered for a specific resource/device (fullJid), so we need to get the presen for the
            // user's devices, which is aggregated by Karere already
            status = megaChat.karere.getPresence(megaChat.getJidFromNodeId(u.u));
            var e = $('.ustatus.' + u.u);
            if (e.length > 0) {
                $(e).removeClass('offline online busy away');
                $(e).addClass(this.onlineStatusClass(status)[1]);
            }
            var e = $('.fm-chat-user-status.' + u.u);
            if (e.length > 0) {
                $(e).html(this.onlineStatusClass(status)[0]);
            }

            if (
                typeof $.sortTreePanel !== 'undefined' &&
                typeof $.sortTreePanel.contacts !== 'undefined' &&
                $.sortTreePanel.contacts.by === 'status'
            ) {
                // we need to resort
                M.contacts();
            }

            if (window.location.hash === "#fm/" + u.u) {
                // re-render the contact view page if the presence had changed
                contactUI();
            }
        }
    };

    this.emptySharefolderUI = function(lSel) {
        if (!lSel) {
            lSel = this.fsViewSel;
        }

        $(lSel).before($('.fm-empty-folder .fm-empty-pad:first').clone().removeClass('hidden').addClass('fm-empty-sharef'));
        $(lSel).hide().parent().children('table').hide();

        $('.files-grid-view.fm.shared-folder-content').addClass('hidden');

        $.tresizer();
    };

    Object.defineProperty(this, 'fsViewSel', {
        value: '.files-grid-view.fm .grid-scrolling-table, .fm-blocks-view.fm .file-block-scrolling',
        configurable: false
    });

    /**
     *
     * @param {array.<JSON_objects>} ipc - received requests
     * @param {bool} clearGrid
     *
     */
    this.drawReceivedContactRequests = function(ipc, clearGrid) {
        DEBUG('Draw received contacts grid.');
        var html, email, ps, trClass, id,
            type = '',
            drawn = false,
            t = '.grid-table.contact-requests';
        var contactName = '';

        if (M.currentdirid === 'ipc') {

            if (clearGrid) {
                $(t + ' tr').remove();
            }

            for (var i in ipc) {
                id = ipc[i].p;
                // Make sure that denied and ignored requests are shown properly
                // don't be fooled, we need M.ipc here and not ipc
                if (M.ipc[id]) {
                    if (M.ipc[id].dts || (M.ipc[id].s && (M.ipc[id].s === 3))) {
                        type = 'deleted';
                    }
                    else if (M.ipc[id].s && M.ipc[id].s === 1) {
                        type = 'ignored';
                    }
                    trClass = (type !== '') ? ' class="' + type + '"' : '';
                    email = ipc[i].m;
                    contactName = M.getNameByHandle(ipc[i].p);

                    if (ipc[i].ps && ipc[i].ps !== 0) {
                        ps = '<span class="contact-request-content">' + ipc[i].ps + ' ' + l[105] + ' ' + l[813] + '</span>';
                    }
                    else {
                        ps = '<span class="contact-request-content">' + l[5851] + '</span>';
                    }
                    html = '<tr id="ipc_' + id + '"' + trClass + '>' +
                        '<td>' +
                            useravatar.contact(email, 'nw-contact-avatar')  +
                            '<div class="fm-chat-user-info">' +
                                '<div class="fm-chat-user">' + htmlentities(contactName) + '</div>' +
                                '<div class="contact-email">' + htmlentities(email) + '</div>' +
                            '</div>' +
                        '</td>' +
                        '<td>' + ps + '</td>' +
                        '<td>' +
                            '<div class="contact-request-button delete"><span>' + l[5858] + '</span></div>' +
                            '<div class="contact-request-button accept"><span>' + l[5856] + '</span></div>' +
                            '<div class="contact-request-button ignore"><span>' + l[5860] + '</span></div>' +
                            '<div class="contact-request-ignored"><span>' + l[5864] + '</span></div>' +
                            '<div class="clear"></div>' +
                        '</td>' +
                    '</tr>';

                    $(t).append(html);

                    drawn = true;
                }
            }

            // If at least one new item is added then ajust grid
            if (drawn) {
                $('.fm-empty-contacts').addClass('hidden');

                // hide/show sent/received grid
                $('.sent-requests-grid').addClass('hidden');
                $('.contact-requests-grid').removeClass('hidden');

                initIpcGridScrolling();
                initBindIPC();
            }
        }
    };

    this.handleEmptyContactGrid = function() {

        var haveActiveContact = false;

        // If focus is on contacts tab
        if (M.currentdirid === 'contacts') {
            M.u.forEach(function(v, k) {
                if (v.c === 1) {
                    haveActiveContact = true;
                    return false; // break
                }
            });

            // We do NOT have active contacts, set empty contacts grid
            if (!haveActiveContact) {
                $('.files-grid-view.contacts-view').addClass('hidden');
                $('.fm-empty-contacts .fm-empty-cloud-txt').text(l[784]);
                $('.fm-empty-contacts').removeClass('hidden');
            }
        }

        return haveActiveContact;
    };

    /**
     *
     * @param {array.<JSON_objects>} opc - sent requests
     * @param {bool} clearGrid
     *
     */
    this.drawSentContactRequests = function(opc, clearGrid) {

        DEBUG('Draw sent invites.');

        var html, hideCancel, hideReinvite, hideOPC,
            drawn = false,
            TIME_FRAME = 60 * 60 * 24 * 14,// 14 days in seconds
            utcDateNow = Math.floor(Date.now() / 1000),
            t = '.grid-table.sent-requests';

        if (M.currentdirid === 'opc') {

            if (clearGrid) {
                $(t + ' tr').remove();
            }

            for (var i in opc) {
                if (opc.hasOwnProperty(i)) {
                    hideCancel = '';
                    hideReinvite = '';
                    hideOPC = '';
                    if (opc[i].dts) {
                        hideOPC = 'deleted';
                        hideReinvite = 'hidden';
                        hideCancel = 'hidden';
                    }
                    else {
                        if (utcDateNow < (opc[i].rts + TIME_FRAME)) {
                            hideReinvite = 'hidden';
                        }
                    }

                    hideOPC = (hideOPC !== '') ? ' class="' + hideOPC + '"' : '';
                    html = '<tr id="opc_' + htmlentities(opc[i].p) + '"' + hideOPC + '>' +
                        '<td>' +
                            '<div class="left email">' +
                                '<div class="nw-contact-avatar"></div>' +
                                '<div class="fm-chat-user-info">' +
                                    '<div class="contact-email">' + htmlentities(opc[i].m) + '</div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="contact-request-button cancel ' + hideCancel + '">' +
                                '<span>' + escapeHTML(l[5930]) + '</span>' +
                            '</div>' +
                            '<div class="contact-request-button reinvite ' + hideReinvite + '">' +
                                '<span>' + escapeHTML(l[5861]) + '</span>' +
                            '</div>' +
                        '</td></tr>';

                    $(t).append(html);

                    drawn = true;
                }
            }

            if (drawn) {
                $('.fm-empty-contacts').addClass('hidden');

                // hide/show received/sent grids
                $('.contact-requests-grid').addClass('hidden');
                $('.sent-requests-grid').removeClass('hidden');

                initOpcGridScrolling();
                initBindOPC();
            }
        }
    };

    /**
     * Render cloud listing layout.
     * @param {Boolean} aUpdate  Whether we're updating the list
     */
    this.renderMain = function(aUpdate) {
        var numRenderedNodes = -1;

        if (d) {
            console.time('renderMain');
        }

        if (!aUpdate) {
            this.megaRender = new MegaRender(this.viewmode);
        }

        // cleanupLayout will render an "empty grid" layout if there
        // are no nodes in the current list (Ie, M.v), if so no need
        // to call renderLayout therefore.
        if (this.megaRender.cleanupLayout(aUpdate, this.v, this.fsViewSel)) {

            if (this.currentdirid === 'opc') {
                this.drawSentContactRequests(this.v, 'clearGrid');
            }
            else if (this.currentdirid === 'ipc') {
                this.drawReceivedContactRequests(this.v, 'clearGrid');
            }
            else {
                numRenderedNodes = this.megaRender.renderLayout(aUpdate, this.v);
            }
        }

        // No need to bind mouse events etc (gridUI/iconUI/selecddUI)
        // if there weren't new rendered nodes (Ie, they were cached)
        if (numRenderedNodes) {

            if (!aUpdate) {
                contactUI();

                if (this.viewmode) {
                    fa_duplicates = {};
                    fa_reqcnt = 0;
                }

                if ($.rmItemsInView) {
                    $.rmInitJSP = this.fsViewSel;
                }
            }

            this.rmSetupUI(aUpdate);
        }

        if (d) {
            console.timeEnd('renderMain');
        }
    };

    this.rmSetupUI = function(u) {
        if (this.viewmode === 1) {
            if (this.v.length > 0) {
                var o = $('.fm-blocks-view.fm .file-block-scrolling');
                o.find('div.clear').remove();
                o.append('<div class="clear"></div>');
            }
            iconUI(u);
            if (!u) {
                fm_thumbnails();
            }
        }
        else {
            Soon(gridUI);
        }
        Soon(fmtopUI);

        if (M.onRenderFinished) {
            Soon(M.onRenderFinished);
            delete M.onRenderFinished;
        }
        $('.grid-scrolling-table .grid-url-arrow').rebind('click', function(e) {
            var target = $(this).closest('tr');
            if (target.attr('class').indexOf('ui-selected') == -1) {
                target.parent().find('tr').removeClass('ui-selected');
            }
            target.addClass('ui-selected');
            e.preventDefault();
            e.stopPropagation(); // do not treat it as a regular click on the file
            e.currentTarget = target;
            cacheselect();
            searchPath();
            contextMenuUI(e, 1);
        });

        $('.file-block .file-settings-icon').rebind('click', function(e) {
            var target = $(this).parents('.file-block');
            if (target.attr('class').indexOf('ui-selected') == -1) {
                target.parent().find('a').removeClass('ui-selected');
            }
            target.addClass('ui-selected');
            e.preventDefault();
            e.stopPropagation(); // do not treat it as a regular click on the file
            e.currentTarget = target;
            cacheselect();
            searchPath();
            contextMenuUI(e, 1);
        });

        if (!u) {

            if (this.currentrootid === 'shares') {

                function prepareShareMenuHandler(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget = $('#treea_' + M.currentdirid);
                    e.calculatePosition = true;
                    $.selected = [M.currentdirid];
                }

                $('.shared-details-info-block .grid-url-arrow').rebind('click', function (e) {
                    prepareShareMenuHandler(e);
                    contextMenuUI(e, 1);
                });

                $('.shared-details-info-block .fm-share-download').rebind('click', function (e) {
                    prepareShareMenuHandler(e);
                    var $this = $(this);
                    e.clientX = $this.offset().left;
                    e.clientY = $this.offset().top + $this.height()

                    contextMenuUI(e, 3);
                });

                $('.shared-details-info-block .fm-share-copy').rebind('click', function (e) {
                    $.copyDialog = 'copy'; // this is used like identifier when key with key code 27 is pressed
                    $.mcselected = M.RootID;
                    $('.copy-dialog .dialog-copy-button').addClass('active');
                    $('.copy-dialog').removeClass('hidden');
                    handleDialogContent('cloud-drive', 'ul', true, 'copy', 'Paste');
                    $('.fm-dialog-overlay').removeClass('hidden');
                    $('body').addClass('overlayed');
                });

                // From inside a shared directory e.g. #fm/INlx1Kba and the user clicks the 'Leave share' button
                $('.shared-details-info-block .fm-leave-share').rebind('click', function (e) {

                    // Get the share ID from the hash in the URL
                    var shareId = window.location.hash.replace('#fm/', '');

                    // Remove user from the share
                    removeShare (shareId);

                    // Open the shares folder
                    M.openFolder('shares', true);
                });
            }
        }
    };

    this.renderShare = function(h)
    {
        var html = '';
        if (M.d[h].shares)
        {
            for (var u in M.d[h].shares)
            {
                if (M.u[u])
                {
                    var rt = '';
                    var sr = {r0: '', r1: '', r2: ''};
                    if (M.d[h].shares[u].r == 0)
                    {
                        rt = l[55];
                        sr.r0 = ' active';
                    }
                    else if (M.d[h].shares[u].r == 1)
                    {
                        rt = l[56];
                        sr.r1 = ' active';
                    }
                    else if (M.d[h].shares[u].r == 2)
                    {
                        rt = l[57];
                        sr.r2 = ' active';
                    }

                    html += '<div class="add-contact-item" id="' + u + '"><div class="add-contact-pad">' + useravatar.contact(u) + 'span class="add-contact-username">' + htmlentities(M.u[u].m) + '</span><div class="fm-share-dropdown">' + rt + '</div><div class="fm-share-permissions-block hidden"><div class="fm-share-permissions' + sr.r0 + '" id="rights_0">' + l[55] + '</div><div class="fm-share-permissions' + sr.r1 + '" id="rights_1">' + l[56] + '</div><div class="fm-share-permissions' + sr.r2 + '" id="rights_2">' + l[57] + '</div><div class="fm-share-permissions" id="rights_3">' + l[83] + '</div></div></div></div>';
                }
            }
            $('.share-dialog .fm-shared-to').html(html);
            $('.share-dialog .fm-share-empty').addClass('hidden');
            $('.share-dialog .fm-shared-to').removeClass('hidden');
        }
        else
        {
            $('.share-dialog .fm-share-empty').removeClass('hidden');
            $('.share-dialog .fm-shared-to').addClass('hidden');
        }
    };

    this.renderTree = function()
    {
        this.buildtree({h: 'shares'},       this.buildtree.FORCE_REBUILD);
        this.buildtree(this.d[this.RootID], this.buildtree.FORCE_REBUILD);
        this.buildtree({h: M.RubbishID},    this.buildtree.FORCE_REBUILD);
        this.buildtree({h: M.InboxID},    this.buildtree.FORCE_REBUILD);
        this.contacts();
        treeUI();
    };

    this.openFolder = function(id, force, chat) {
        var newHashLocation;

        $('.fm-right-account-block').addClass('hidden');
        $('.fm-files-view-icon').removeClass('hidden');

        if (d) {
            console.log('openFolder()', M.currentdirid, id, force, loadfm.loaded);
        }

        if (!loadfm.loaded) {
            console.error('Internal error, do not call openFolder before the cloud finished loading.');
            return false;
        }

        if ((id !== 'notifications') && !$('.fm-main.notifications').hasClass('hidden')) {
            notificationsUI(1);
        }

        this.search = false;
        this.chat = false;

        if (!fminitialized) {
            fminitialized = true;
            $('.top-search-bl').show();
            mBroadcaster.sendMessage('fm:initialized');
        }
        else if (id && id === this.currentdirid && !force) {// Do nothing if same path is choosen
            return false;
        }

        if (id === 'rubbish')
            id = this.RubbishID;
        else if (id === 'inbox')
            id = this.InboxID;
        else if (id === 'cloudroot')
            id = this.RootID;
        else if (id === 'contacts')
            id = 'contacts';
        else if (id === 'opc')
            id = 'opc';
        else if (id === 'ipc')
            id = 'ipc';
        else if (id === 'shares')
            id = 'shares';
        else if (id === 'chat') {
            if (!megaChatIsReady) {
                id = this.RootID;
            }
            else {
                this.chat = true;

                megaChat.refreshConversations();
                treeUI();
                var room = megaChat.renderListing();

                if (room) {
                    newHashLocation = room.getRoomUrl();
                }
            }
        }
        else if (id && id.substr(0, 7) === 'account')
            accountUI();
        else if (id && id.substr(0, 13) === 'notifications')
            notificationsUI();
        else if (id && id.substr(0, 7) === 'search/')
            this.search = true;
        else if (id && id.substr(0, 5) === 'chat/') {
            this.chat = true;
            treeUI();

            if (megaChatIsReady) {
                // XX: using the old code...for now
                chatui(id);
            }
        }
        else if ((!id || !M.d[id]) && (id !== 'transfers')) {
            id = this.RootID;
        }

        if (megaChatIsReady) {
            if (!this.chat) {
                if (megaChat.getCurrentRoom()) {
                    megaChat.getCurrentRoom().hide();
                }
            }
        }

        this.previousdirid = this.currentdirid;
        this.currentdirid = id;
        this.currentrootid = RootbyId(id);

        if (M.currentrootid === M.RootID) {
            M.lastSeenCloudFolder = M.currentdirid;
        }

        $('.nw-fm-tree-item').removeClass('opened');

        if (this.chat) {
            M.v = [];
            sharedFolderUI(); // remove shares-specific UI
            //$.tresizer();
        }
        else if (id === undefined && folderlink) {
            // Error reading shared folder link! (Eg, server gave a -11 (EACCESS) error)
            // Force cleaning the current cloud contents and showing an empty msg
            M.renderMain();
        }
        else if (id && (id.substr(0, 7) !== 'account') && (id.substr(0, 13) !== 'notifications')) {
            $('.fm-right-files-block').removeClass('hidden');
            if (d) {
                console.time('time for rendering');
            }
            if (id === 'transfers') {
                M.v = [];
            }
            else if (id.substr(0, 6) === 'search') {
                M.filterBySearch(M.currentdirid);
            }
            else {
                M.filterByParent(M.currentdirid);
            }

            var viewmode = 0;// 0 is list view, 1 block view
            if (M.overrideViewMode !== undefined) {
                viewmode = M.overrideViewMode;
                delete M.overrideViewMode;
            }
            else if (typeof fmconfig.uiviewmode !== 'undefined' && fmconfig.uiviewmode) {
                if (fmconfig.viewmode) {
                    viewmode = fmconfig.viewmode;
                }
            }
            else if (typeof fmconfig.viewmodes !== 'undefined' && typeof fmconfig.viewmodes[id] !== 'undefined') {
                viewmode = fmconfig.viewmodes[id];
            }
            else {
                for (var i in M.v) {
                    if (is_image(M.v[i])) {
                        viewmode = 1;
                        break;
                    }
                }
            }
            M.viewmode = viewmode;
            if (M.overrideSortMode) {
                M.doSort(M.overrideSortMode[0], M.overrideSortMode[1]);
                delete M.overrideSortMode;
            }
            else if (fmconfig.uisorting && fmconfig.sorting) {
                M.doSort(fmconfig.sorting.n, fmconfig.sorting.d);
            }
            else if (fmconfig.sortmodes && fmconfig.sortmodes[id]) {
                M.doSort(fmconfig.sortmodes[id].n, fmconfig.sortmodes[id].d);
            }
            else if (M.currentdirid === 'contacts') {
                M.doSort('status', 1);
            }
            else {
                M.doSort('name', 1);
            }

            if (M.currentdirid === 'opc') {
                this.v = [];
                for (var i in M.opc) {
                    this.v.push(M.opc[i]);
                }
            }
            else if (M.currentdirid === 'ipc') {
                this.v = [];
                for (var i in M.ipc) {
                    this.v.push(M.ipc[i]);
                }
            }

            M.renderMain();

            if (fminitialized) {
                var currentdirid = M.currentdirid;
                if (id.substr(0, 6) === 'search') {
                    currentdirid = M.RootID;

                    if (M.d[M.previousdirid]) {
                        currentdirid = M.previousdirid;
                    }
                }

                if ($('#treea_' + currentdirid).length === 0) {
                    var n = M.d[currentdirid];
                    if (n && n.p) {
                        treeUIopen(n.p, false, true);
                    }
                }
                treeUIopen(currentdirid, currentdirid === 'contacts');

                $('#treea_' + currentdirid).addClass('opened');
            }
            if (d) {
                console.timeEnd('time for rendering');
            }

            Soon(function() {
                M.renderPath();
            });
        }


        // If a folderlink, and entering a new folder.
        if (pfid && this.currentrootid === this.RootID) {
            var target = '';
            if (this.currentdirid !== this.RootID) {
                target = '!' +  this.currentdirid;
            }
            newHashLocation = '#F!' + pfid + '!' + pfkey + target;
            M.lastSeenFolderLink = newHashLocation;
        }
        else {
            // new hash location can be altered already by the chat logic in the previous lines in this func
            if (!newHashLocation) {
                newHashLocation = '#fm/' + M.currentdirid;
            }
        }
        try {
            window.location.hash = newHashLocation;
        }
        catch (ex) {
            console.error(ex);
        }
        searchPath();

        var sortMenu = new mega.SortMenu();
        sortMenu.treeSearchUI();

        $(document).trigger('MegaOpenFolder');
    };

    // Contacts left panel handling
    this.contacts = function() {

        var i;
        var activeContacts = [];

        for (i in M.c['contacts']) {

            // Filter out contacts without full relationship
            if (M.d.hasOwnProperty(i) && (M.d[i].c === 1)) {
                activeContacts.push(M.d[i]);
            }
        }

        if (typeof this.i_cache !== "object") {
            this.i_cache = {};
        }

        var sortBy = $.sortTreePanel['contacts'].by;
        var sortFn;

        if (sortBy === 'last-interaction') {
            sortFn = this.getSortByInteractionFn();
        }
        else if (sortBy === 'name') {
            sortFn = this.getSortByNameFn();
        }
        else if (sortBy === 'status') {
            sortFn = this.getSortByStatusFn();
        }
        else if (sortBy === 'created') {
            sortFn = this.getSortByDateTimeFn();
        }
        else if (sortBy === 'fav') {
            sortFn = this.getSortByFavFn();
        }

        var sortDirection = $.sortTreePanel['contacts'].dir;
        activeContacts.sort(
            function(a, b) {
                return sortFn(a, b, sortDirection);
            }
        );

        var html = '';
        var onlinestatus;

        // status can be: "online"/"away"/"busy"/"offline"
        for (i in activeContacts) {
            if (activeContacts.hasOwnProperty(i)) {
                if (megaChatIsReady) {
                    var jId = megaChat.getJidFromNodeId(activeContacts[i].u);
                    onlinestatus = M.onlineStatusClass(megaChat.karere.getPresence(jId));
                }
                else {
                    onlinestatus = [l[5926], 'offline'];
                }

                var name = M.getNameByHandle(activeContacts[i].u).toLowerCase();

                if (!treesearch || name.indexOf(treesearch.toLowerCase()) > -1) {

                    html += '<div class="nw-contact-item ui-droppable '
                    + onlinestatus[1] + '" id="contact_' + htmlentities(activeContacts[i].u)
                    + '"><div class="nw-contact-status"></div><div class="nw-contact-name">'
                    + htmlentities(name)
                    + ' <a href="#" class="button start-chat-button"><span></span></a></div></div>';
                }
                $('.fm-start-chat-dropdown').addClass('hidden');
            }
        }

        $('.content-panel.contacts').html(html);

        if (megaChatIsReady) {
            $('.fm-tree-panel').undelegate('.start-chat-button', 'click.megaChat');
            $('.fm-tree-panel').delegate('.start-chat-button', 'click.megaChat', function() {
                var m = $('.fm-start-chat-dropdown'),
                    scrollPos = 0;

                var $this = $(this);
                var $userDiv = $this.parent().parent();

                $.hideContextMenu();

                if (!$this.is(".active")) {
                    $('.start-chat-button').removeClass('active');

                    $('.context-menu-item', m).removeClass("disabled");

                    if ($userDiv.is(".offline")) {
                        $('.context-menu-item.startaudio-item, .context-menu-item.startvideo-item', m)
                            .addClass("disabled");
                    }

                    $this.addClass('active');
                    var y = $this.offset().top - 20;
                    m
                        .css('top', y)
                        .removeClass('hidden')
                        .addClass('active')
                        .data("triggeredBy", $this);
                }
                else {
                    $this.removeClass('active');
                    m
                        .removeClass('active')
                        .addClass('hidden')
                        .removeData("triggeredBy");
                }

                $.selected = [$userDiv.attr('id').replace('contact_', '')];

                return false; // stop propagation!
            });

            $('.fm-start-chat-dropdown .context-menu-item.startchat-item').rebind('click.treePanel', function() {
                var $this = $(this);

                if (!$this.is(".disabled")) {
                    var user_handle = $.selected && $.selected[0];
                    window.location = "#fm/chat/" + user_handle;
                }
            });

            $('.fm-start-chat-dropdown .context-menu-item.startaudio-item').rebind('click.treePanel', function() {
                var $this = $(this);
                var $triggeredBy = $this.parent().data("triggeredBy");
                var $userDiv = $triggeredBy.parent().parent();

                if (!$this.is(".disabled") && !$userDiv.is(".offline")) {
                    var user_handle = $userDiv.attr('id').replace("contact_", "");

                    window.location = "#fm/chat/" + user_handle;
                    var room = megaChat.createAndShowPrivateRoomFor(user_handle);
                    if (room) {
                        room.startAudioCall();
                    }
                }
            });

            $('.fm-start-chat-dropdown .context-menu-item.startvideo-item').rebind('click.treePanel', function() {
                var $this = $(this);
                var $triggeredBy = $this.parent().data("triggeredBy");
                var $userDiv = $triggeredBy.parent().parent();

                if (!$this.is(".disabled") && !$userDiv.is(".offline")) {
                    var user_handle = $userDiv.attr('id').replace("contact_", "");

                    window.location = "#fm/chat/" + user_handle;
                    var room = megaChat.createAndShowPrivateRoomFor(user_handle);
                    if (room) {
                        room.startVideoCall();
                    }
                }
            });
        }

        $('.fm-tree-panel').undelegate('.nw-contact-item', 'click');
        $('.fm-tree-panel').delegate('.nw-contact-item', 'click', function() {
            var id = $(this).attr('id');
            if (id) {
                id = id.replace('contact_', '');
            }
            M.openFolder(id);

            return false; // stop propagation!
        });

        // On the Contacts screen, initiate a call by double clicking a contact name in the left panel
        $('.fm-tree-panel').delegate('.nw-contact-item.online', 'dblclick', function() {

            // Get the element ID
            var $this = $(this);
            var id = $this.attr('id');

            // Get the user handle and change to conversations screen
            var user_handle = id.replace('contact_', '');
            window.location = '#fm/chat/' + user_handle;

        });
    };

    this.getContacts = function(n) {
        var folders = [];
        for (var i in this.c[n.h])
            if (this.d[i].t == 1 && this.d[i].name)
                folders.push(this.d[i]);

        return folders;
    };
    this.getContactByEmail = function(email) {
        var self = this;

        var found = false;

        self.u.forEach(function(v, k) {
            if (v.t == 1 && v.name && v.m == email) {
                found = v;
                // break
                return false;
            }
        });

        return found;
    };

    /**
     * buildtree
     *
     * Re-creates tree DOM elements in given order i.e. { ascending, descending }
     * for given parameters i.e. { name, [last interaction, status] },
     * Sorting for status and last interaction are available only for contacts.
     * @param {String} n, node id.
     * @param {String} dialog, dialog identifier or force rebuild constant.
     * @param {type} stype, what to sort.
     */
    this.buildtree = function(n, dialog, stype) {

        if (!n) {
             console.error('Invalid node passed to M.buildtree');
             return;
        }

        var folders = [],
            _ts_l = treesearch && treesearch.toLowerCase(),
            _li = 'treeli_',
            _sub = 'treesub_',
            _a = 'treea_',
            rebuild = false,
            sharedfolder, openedc, arrowIcon,
            ulc, expandedc, buildnode, containsc, cns, html, sExportLink,
            fName = '',
            curItemHandle = '',
            undecryptableClass = '',
            titleTooltip = '',
            fIcon = '',
            prefix;

        var share = new mega.Share({});

        /*
         * XXX: Initially this function was designed to render new nodes only,
         * but due to a bug the entire tree was being rendered/created from
         * scratch every time. Trying to fix this now is a pain because a lot
         * of the New-design code was made with that bug in place and therefore
         * with the assumption the tree panels are recreated always.
         */

        if (dialog === this.buildtree.FORCE_REBUILD) {
            rebuild = true;
            dialog = undefined;
        }
        stype = stype || "cloud-drive";
        if (n.h === M.RootID) {
            if (typeof dialog === 'undefined') {
                if (rebuild || $('.content-panel.cloud-drive ul').length === 0) {
                    $('.content-panel.cloud-drive').html('<ul id="treesub_' + htmlentities(M.RootID) + '"></ul>');
                }
            }
            else {
                $('.' + dialog + ' .cloud-drive .dialog-content-block').html('<ul id="mctreesub_' + htmlentities(M.RootID) + '"></ul>');
            }
        }
        else if (n.h === 'shares') {
            if (typeof dialog === 'undefined') {
                $('.content-panel.shared-with-me').html('<ul id="treesub_shares"></ul>');
            }
            else {
                $('.' + dialog + ' .shared-with-me .dialog-content-block').html('<ul id="mctreesub_shares"></ul>');
            }
            stype = "shared-with-me";
        }
        else if (n.h === M.InboxID) {
            if (typeof dialog === 'undefined') {
                $('.content-panel.inbox').html('<ul id="treesub_' + htmlentities(M.InboxID) + '"></ul>');
            }
            else {
                $('.' + dialog + ' .inbox .dialog-content-block').html('<ul id="mctreesub_' + htmlentities(M.InboxID) + '"></ul>');
            }
            stype = "inbox";
        }
        else if (n.h === M.RubbishID) {
            if (typeof dialog === 'undefined') {
                $('.content-panel.rubbish-bin').html('<ul id="treesub_' + htmlentities(M.RubbishID) + '"></ul>');
            }
            else {
                $('.' + dialog + ' .rubbish-bin .dialog-content-block').html('<ul id="mctreesub_' + htmlentities(M.RubbishID) + '"></ul>');
            }
            stype = "rubbish-bin";
        }
        else if (folderlink) {
            stype = "folder-link";
        }

        prefix = stype;
        // Detect copy and move dialogs, make sure that right DOMtree will be sorted.
        // copy and move dialogs have their own trees and sorting is done independently
        if (dialog) {
            if (dialog.indexOf('copy-dialog') !== -1) {
                prefix = 'Copy' + stype;
            }
            else if (dialog.indexOf('move-dialog') !== -1) {
                prefix = 'Move' + stype;
            }
        }

        if (this.c[n.h]) {

            folders = [];

            for (var i in this.c[n.h]) {
                if (this.d[i] && (this.d[i].t === 1)) {
                    folders.push(this.d[i]);
                }
            }

            var sortFn = this.getSortByNameFn();
            var sortDirection = $.sortTreePanel[prefix].dir;
            folders.sort(
                function(a, b) {
                    return sortFn(a, b, sortDirection);
                }
            );

            // In case of copy and move dialogs
            if (typeof dialog !== 'undefined') {
                 _a = 'mctreea_';
                 _li = 'mctreeli_';
                 _sub = 'mctreesub_';
            }

            for (var ii in folders) {
                if (folders.hasOwnProperty(ii)) {

                    ulc = '';
                    expandedc = '';
                    buildnode = false;
                    containsc = '';
                    curItemHandle = folders[ii].h;
                    cns = M.c[curItemHandle];
                    undecryptableClass = '';
                    titleTooltip = '';
                    fIcon = '';

                    fName = folders[ii].name;

                    if (cns) {
                        for (var cn in cns) {
                            /* jshint -W073 */
                            if (M.d[cn] && M.d[cn].t) {
                                containsc = 'contains-folders';
                                break;
                            }
                            /* jshint +W073 */
                        }
                    }
                    if (fmconfig && fmconfig.treenodes && fmconfig.treenodes[curItemHandle]) {
                        buildnode = Boolean(containsc);
                    }
                    if (buildnode) {
                        ulc = 'class="opened"';
                        expandedc = 'expanded';
                    }
                    else if (Object(fmconfig.treenodes).hasOwnProperty(curItemHandle)) {
                        fmtreenode(curItemHandle, false);
                    }
                    sharedfolder = '';

                    // Check is there a full and pending share available, exclude public link shares i.e. 'EXP'
                    if (share.isShareExist([curItemHandle], true, true, false)) {
                        sharedfolder = ' shared-folder';
                    }

                    openedc = '';
                    if (M.currentdirid === curItemHandle) {
                        openedc = 'opened';
                    }

                    var k = $('#' + _li + curItemHandle).length;

                    if (k) {
                        if (containsc) {
                            $('#' + _li + curItemHandle + ' .nw-fm-tree-item').addClass(containsc)
                                .find('span').eq(0).addClass('nw-fm-arrow-icon');
                        }
                        else {
                            $('#' + _li + curItemHandle + ' .nw-fm-tree-item').removeClass('contains-folders')
                                .find('span').eq(0).removeClass('nw-fm-arrow-icon');
                        }
                    }
                    else {

                        // Undecryptable node indicators
                        if (missingkeys[curItemHandle]) {
                            undecryptableClass = 'undecryptable';
                            fName = l[8686];
                            fIcon = 'generic';

                            var exportLink = new mega.Share.ExportLink({});
                            titleTooltip = exportLink.isTakenDown(curItemHandle) ? (l[7705] + '\n') : '';
                            titleTooltip += l[8595];
                        }

                        sExportLink = (M.d[curItemHandle].shares && M.d[curItemHandle].shares.EXP) ? 'linked' : '';
                        arrowIcon = '';

                        if (containsc) {
                            arrowIcon = 'class="nw-fm-arrow-icon"';
                        }
                        /* jshint -W043 */
                        html = '<li id="' + _li + curItemHandle + '">\n\
                                        <span  id="' + _a + htmlentities(curItemHandle)
                            + '" class="nw-fm-tree-item ' + containsc + ' ' + expandedc + ' '
                            + openedc + ' ' + sExportLink + ' ' + undecryptableClass
                            + '" title="' + titleTooltip + '">\n\
                                            <span ' + arrowIcon + '></span>\n\
                                            <span class="nw-fm-tree-folder' + sharedfolder + '">' + htmlentities(fName) + '</span>\n\
                                            <span class="data-item-icon"></span>\n\
                                        </span>\n\
                                        <ul id="' + _sub + curItemHandle + '" ' + ulc + '></ul>\n\
                                    </li>';
                        /* jshint +W043 */

                        if (folders[ii - 1] && $('#' + _li + folders[ii - 1].h).length > 0) {
                            $('#' + _li + folders[ii - 1].h).after(html);
                        }
                        else if (ii === 0 && $('#' + _sub + n.h + ' li').length > 0) {
                            $($('#' + _sub + n.h + ' li')[0]).before(html);
                        }
                        else {
                            $('#' + _sub + n.h).append(html);
                        }
                    }

                    if (_ts_l) {
                        if (fName.toLowerCase().indexOf(_ts_l) === -1) {
                            $('#' + _li + curItemHandle).addClass('tree-item-on-search-hidden');
                        }
                        else {
                            $('#' + _li + curItemHandle).parents('li').removeClass('tree-item-on-search-hidden');
                        }
                    }
                    if (buildnode) {
                        this.buildtree(folders[ii], dialog, stype);
                    }

                    if (fminitialized) {
                        var nodeHandle = curItemHandle;

                        if ((M.d[nodeHandle] && M.d[nodeHandle].shares) || M.ps[nodeHandle]) {
                            sharedUInode(nodeHandle);
                        }
                    }
                }
            }// END of for folders loop
        }
    };// END buildtree()

    this.buildtree.FORCE_REBUILD = 34675890009;

    var icon = '<span class="context-menu-icon"></span>';
    var arrow = '<span class="context-top-arrow"></span><span class="context-bottom-arrow"></span>';

    this.buildRootSubMenu = function() {

        var cs = '',
            sm = '',
            html = '';

        for (var h in M.c[M.RootID]) {
            if (M.d[h] && M.d[h].t) {
                cs = ' contains-submenu';
                sm = '<span class="context-submenu" id="sm_' + this.RootID + '"><span id="csb_' + this.RootID + '"></span>' + arrow + '</span>';
                break;
            }
        }

        html = '<span class="context-submenu" id="sm_move"><span id="csb_move">';
        html += '<span class="context-menu-item cloud-item' + cs + '" id="fi_' + this.RootID + '">';
        html +=     icon + l[1687];
        html += '</span>' + sm;
        html += '<span class="context-menu-item remove-item" id="fi_' + this.RubbishID + '">';
        html +=     icon + l[5738];
        html += '</span>';
        html += '<span class="context-menu-divider"></span>'
              + '<span class="context-menu-item advanced-item">'
              +     '<span class="context-menu-icon"></span>'
              +     l[9108]
              + '</span>';
        html += arrow;
        html += '</span></span>';

        $('.context-menu-item.move-item').after(html);
    };

    /*
     * buildSubMenu - context menu related
     * Create sub-menu for context menu parent directory
     *
     * @param {string} id - parent folder handle
     */
    this.buildSubMenu = function(id) {

        var folders = [],
            sub, cs, sm, fid, sharedFolder, html;
        var nodeName = '';

        for (var i in this.c[id]) {
            if (this.d[i] && this.d[i].t === 1) {
                folders.push(this.d[i]);
            }
        }

        // Check existance of sub-menu
        if ($('#csb_' + id + ' > .context-menu-item').length !== folders.length)  {
            // localeCompare is not supported in IE10, >=IE11 only
            // sort by name is default in the tree
            folders.sort(function(a, b) {
                if (a.name) {
                    return a.name.localeCompare(b.name);
                }
            });

            for (var i in folders) {
                sub = false;
                cs = '';
                sm = '';
                fid = folders[i].h;

                for (var h in M.c[fid]) {
                    if (M.d[h] && M.d[h].t) {
                        sub = true;
                        cs = ' contains-submenu';
                        sm = '<span class="context-submenu" id="sm_' + fid + '"><span id="csb_' + fid + '"></span>' + arrow + '</span>';
                        break;
                    }
                }

                sharedFolder = 'folder-item';
                if (typeof M.d[fid].shares !== 'undefined') {
                    sharedFolder += ' shared-folder-item';
                }

                if (missingkeys[fid]) {
                    nodeName = l[8686];
                }
                else {
                    nodeName = this.d[fid].name;
                }

                html = '<span class="context-menu-item ' + sharedFolder + cs + '" id="fi_' + fid + '">' + icon + htmlentities(nodeName) + '</span>' + sm;

                $('#csb_' + id).append(html);
            }
        }
    };

    this.sortContacts = function(folders) {
        // in case of contacts we have custom sort/grouping:
        if (localStorage.csort)
            this.csort = localStorage.csort;
        if (localStorage.csortd)
            this.csortd = parseInt(localStorage.csortd);

        if (this.csort == 'shares')
        {
            folders.sort(function(a, b)
            {
                if (M.c[a.h] && M.c[b.h])
                {
                    if (a.name)
                        return a.name.localeCompare(b.name);
                }
                else if (M.c[a.h] && !M.c[b.h])
                    return 1 * M.csortd;
                else if (!M.c[a.h] && M.c[b.h])
                    return -1 * M.csortd;
                return 0;
            });
        }
        else if (this.csort == 'name')
        {
            folders.sort(function(a, b)
            {
                if (a.name)
                    return parseInt(a.name.localeCompare(b.name) * M.csortd);
            });
        }
        else if (this.csort == 'chat-activity')
        {
            folders.sort(function(a, b)
            {
                var aTime = M.u[a.h].lastChatActivity;
                var bTime = M.u[b.h].lastChatActivity;

                if (aTime && bTime)
                {
                    if (aTime > bTime) {
                        return 1 * M.csortd;
                    }
                    else if (aTime < bTime) {
                        return -1 * M.csortd;
                    }
                    else {
                        return 0;
                    }
                }
                else if (aTime && !bTime)
                    return 1 * M.csortd;
                else if (!aTime && bTime)
                    return -1 * M.csortd;

                return 0;
            });
        }

        return folders;
    };

    this.getPath = function(id) {

        var result = [];
        var loop = true;

        while (loop) {
            if ((id === 'contacts') && (result.length > 1)) {
                id = 'shares';
            }

            if (
                M.d[id]
                || (id === 'contacts')
                || (id === 'messages')
                || (id === 'shares')
                || (id === M.InboxID)
                || (id === 'opc')
                || (id === 'ipc')
                ) {
                result.push(id);
            }
            else if (!id || (id.length !== 11)) {
                return [];
            }

            if (
                (id === this.RootID)
                || (id === 'contacts')
                || (id === 'shares')
                || (id === 'messages')
                || (id === this.RubbishID)
                || (id === this.InboxID)
                || (id === 'opc')
                || (id === 'ipc')
                ) {
                loop = false;
            }

            if (loop) {
                if (!(this.d[id] && this.d[id].p)) {
                    break;
                }

                id = this.d[id].p;
            }
        }

        return result;
    };

    this.pathLength = function()
    {
        var length = $('.fm-breadcrumbs-block:visible').outerWidth() + $('.fm-header-buttons:visible').outerWidth();
        return length;
    };

    this.renderPath = function() {
        var name, hasnext = '', typeclass,
            html = '<div class="clear"></div>',
            a2 = this.getPath(this.currentdirid),
            contactBreadcrumb = '<a class="fm-breadcrumbs contacts has-next-button" id="path_contacts">'
                                    + '<span class="right-arrow-bg">'
                                        + '<span>' + l[950] + ' </span>'
                                    + '</span>'
                                + '</a>';

        if (a2.length > 2 && a2[a2.length - 2].length === 11) {
            delete a2[a2.length - 2];
        }

        for (var i in a2) {
            name = '';
            if (a2[i] === this.RootID) {
                if (folderlink && M.d[this.RootID]) {
                    name = M.d[this.RootID].name;
                    typeclass = 'folder';
                }
                else {
                    typeclass = 'cloud-drive';
                }
            }
            else if (a2[i] === 'contacts') {
                typeclass = 'contacts';
                name = l[165];
            }
            else if (a2[i] === 'opc') {
                typeclass = 'sent-requests';
                name = l[5862];
            }
            else if (a2[i] === 'ipc') {
                typeclass = 'received-requests';
                name = l[5863];
            }
            else if (a2[i] === 'shares') {
                typeclass = 'shared-with-me';
                name = '';
            }
            else if (a2[i] === this.RubbishID) {
                typeclass = 'rubbish-bin';
                name = l[167];
            }
            else if (a2[i] === 'messages' || a2[i] === M.InboxID) {
                typeclass = 'messages';
                name = l[166];
            }
            else {
                var n = M.d[a2[i]];
                if (n && n.name) {
                    name = n.name;
                }
                if (a2[i].length === 11) {
                    typeclass = 'contact';
                }
                else {
                    typeclass = 'folder';
                }
            }
            html = '<a class="fm-breadcrumbs ' + typeclass + ' ' + hasnext
                    + ' ui-droppable" id="path_' + htmlentities(a2[i]) + '">'
                        + '<span class="right-arrow-bg ui-draggable">'
                            + '<span>' + htmlentities(name)  + '</span>'
                        + '</span>'
                    + '</a>' + html;
            hasnext = 'has-next-button';
        }

        if (this.currentdirid && this.currentdirid.substr(0, 5) === 'chat/') {
            var contactName = $('a.fm-tree-folder.contact.lightactive span.contact-name').text();
            $('.fm-breadcrumbs-block').safeHTML('<a class="fm-breadcrumbs contacts has-next-button" id="path_contacts">'
                                                + '<span class="right-arrow-bg">'
                                                    + '<span>Contacts</span>'
                                                + '</span></a>'
                                            + '<a class="fm-breadcrumbs chat" id="path_'
                                            + htmlentities(M.currentdirid.replace("chat/", "")) + '">'
                                                + '<span class="right-arrow-bg">'
                                                    + '<span>' + htmlentities(contactName) + '</span>'
                                                + '</span>'
                                            + '</a>');
            $('.search-files-result').addClass('hidden');
        }
        else if (this.currentdirid && this.currentdirid.substr(0, 7) === 'search/') {
            $('.fm-breadcrumbs-block').safeHTML('<a class="fm-breadcrumbs search ui-droppable" id="'
                                            + htmlentities(a2[i]) + '">'
                                                + '<span class="right-arrow-bg ui-draggable">'
                                                    + '<span>' + htmlentities(this.currentdirid.replace('search/', ''))
                                                    + '</span>'
                                                + '</span>'
                                            + '</a>');
            $('.search-files-result .search-number').text(M.v.length);
            $('.search-files-result').removeClass('hidden');
            $('.search-files-result').addClass('last-button');
        }
        else if (this.currentdirid && this.currentdirid === 'opc') {
            DEBUG('Render Path OPC');
            $('.fm-breadcrumbs-block').html(contactBreadcrumb + html);
        }
        else if (this.currentdirid && this.currentdirid === 'ipc') {
            DEBUG('Render Path IPC');
            $('.fm-breadcrumbs-block').html(contactBreadcrumb + html);
        }
        else {
            $('.search-files-result').addClass('hidden');
            $('.fm-breadcrumbs-block').html(html);
        }

        $('.fm-new-folder span').text(l[68]);
        $('.fm-file-upload span').text(l[99]);
        $('.fm-folder-upload span').text(l[98]);

        var headerWidth = $('.fm-right-header:visible').outerWidth();

        $('.fm-right-header:visible').removeClass('long-path short-foldernames');
        if (M.pathLength() > headerWidth) {
            $('.fm-right-header:visible').addClass('long-path');
            $('.fm-new-folder span').text('');
            $('.fm-file-upload span').text('');
            $('.fm-folder-upload span').text('');
        }

        var el = $('.fm-breadcrumbs-block:visible .right-arrow-bg');
        var i = 0;
        var j = 0;
        headerWidth = $('.fm-right-header:visible').outerWidth();

        while (M.pathLength() > headerWidth) {
            if (i < el.length - 1) {
                $(el[i]).addClass('short-foldername');
                i++;
            } else if (j < el.length - 1) {
                $(el[j]).html('');
                j++;
            } else if (!$(el[j]).hasClass('short-foldername')) {
                $(el[j]).addClass('short-foldername');
            } else {
                $(el[j]).html('');
                break;
            }
        }

        if ($('.fm-breadcrumbs-block .fm-breadcrumbs').length > 1) {
            $('.fm-breadcrumbs-block').removeClass('deactivated');
        }
        else {
            $('.fm-breadcrumbs-block').addClass('deactivated');
        }

        $('.fm-breadcrumbs-block a').unbind('click');
        $('.fm-breadcrumbs-block a').bind('click', function() {
            var crumbId = $(this).attr('id');

            // When NOT deactivated
            if (!$('.fm-breadcrumbs-block').hasClass('deactivated')) {
                if (crumbId === 'path_opc' || crumbId === 'path_ipc') {
                    return false;
                }
                else if ((crumbId === 'chatcrumb') || (M.currentdirid && M.currentdirid.substr(0, 7) === 'search/')) {
                    return false;
                }

                // Remove focus from 'view ipc/opc' buttons
                $('.fm-received-requests').removeClass('active');
                $('.fm-contact-requests').removeClass('active');
                M.openFolder($(this).attr('id').replace('path_', ''));
            }
        });

        if (folderlink) {
            $('.fm-breadcrumbs:first').removeClass('folder').addClass('folder-link');
            $('.fm-breadcrumbs:first span').empty();
        }
    };

    this.addNode = function(n, ignoreDB) {

        if (!this.c['shares']) {
            this.c['shares'] = [];
        }
        if (!M.d[n.p] && n.p !== 'contacts') {
            if (n.sk) {
                n.p = n.u;
            }
            else if (n.su) {
                n.p = n.su;
            }
        }
        if (n.p && n.p.length === 11 && !M.d[n.p]) {
            var u = this.u[n.p];
            if (u) {
                u.h = u.u;
                u.t = 1;
                u.p = 'contacts';
                M.addNode(u);
            }
            else {
                console.log('something went wrong!', n.p, this.u[n.p]);
            }
        }
        if (typeof mDB === 'object' && !ignoreDB && !pfkey) {
            if (n instanceof MegaDataObject) {
                mDBadd('f', clone(n.toJS()));
            }
            else {
                mDBadd('f', clone(n));
            }
        }
        if (n.p) {
            if (typeof this.c[n.p] === 'undefined') {
                this.c[n.p] = [];
            }
            this.c[n.p][n.h] = 1;
            // maintain special incoming shares index:
            if (n.p.length === 11) {
                this.c['shares'][n.h] = 1;
            }
        }

        if (n.t) {
            if (n.t === 2) {
                this.RootID = n.h;
            }
            else if (n.t === 3) {
                this.InboxID = n.h;
            }
            else if (n.t === 4) {
                this.RubbishID = n.h;
            }
        }

        if (!n.c) {
            if (n.sk && !u_sharekeys[n.h]) {
                u_sharekeys[n.h] = crypto_process_sharekey(n.h, n.sk);
            }

            if (n.t !== 2 && n.t !== 3 && n.t !== 4 && n.k) {
                if (u_kdnodecache[n.h]) {
                    var obj = u_kdnodecache[n.h];
                    for (var k in obj) {
                        n[k] = obj[k];
                    }
                }
                else {
                    crypto_processkey(u_handle, u_k_aes, n);
                }
                if (n.key) {
                    u_nodekeys[n.h] = n.key;

                    // Update global variable which holds data about missing keys
                    // so DOM can be updated accordingly
                    if (missingkeys[n.h]) {
                        delete missingkeys[n.h];
                    }
                }
            }
            else if (!n.k) {
                if (n.a) {
                    if (!missingkeys[n.h]) {
                        missingkeys[n.h] = true;
                        newmissingkeys = true;
                    }
                }
            }
            if (n.hash) {
                if (!this.h[n.hash]) {
                    this.h[n.hash] = [];
                }
                this.h[n.hash].push(n.h);
            }
        }
        if (this.d[n.h] && this.d[n.h].shares) {
            n.shares = this.d[n.h].shares;
        }

        // sync data objs M.u <-> M.d
        if (this.u[n.h] && this.u[n.h] !== n) {
            for (var k in n) {
                // merge changes from n->M.u[n.h]
                if (n.hasOwnProperty(k) && k !== 'name') {
                    this.u[n.h][k] = n[k];
                }
            }
            n = this.u[n.h];
        }

        this.d[n.h] = n;

        if (typeof newnodes !== 'undefined') {
            newnodes.push(n);
        }

        if (fminitialized) {
            // Handle Inbox/RubbishBin UI changes
            delay('fmtopUI', fmtopUI);
        }

        // $(window).trigger("megaNodeAdded", [n]);
    };

    this.delNode = function(h) {

        function ds(h) {
            if (fminitialized) {
                removeUInode(h);
            }
            if (M.c[h] && h.length < 11) {
                for (var h2 in M.c[h]) {
                    ds(h2);
                }
                delete M.c[h];
            }
            if (typeof mDB === 'object' && !pfkey) {
                mDBdel('f', h);
            }
            if (M.d[h]) {
                M.delIndex(M.d[h].p, h);
                M.delHash(M.d[h]);
                delete M.d[h];
            }
            // Update M.v it's used for at least preview slideshow
            for (var k in M.v) {
                if (M.v[k].h === h) {
                    M.v.splice(k, 1);
                    break;
                }
            }
            // if (M.u[h]) delete M.u[h];
            if (typeof M.u[h] === 'object') {
                M.u[h].c = 0;
            }
        }
        ds(h);

        if (fminitialized) {
            // Handle Inbox/RubbishBin UI changes
            delay('fmtopUI', fmtopUI);
        }

        if (M.currentdirid === 'shares' && !M.viewmode)
            M.openFolder('shares', 1);
    };

    this.delHash = function(n)
    {
        if (n.hash && M.h[n.hash])
        {
            for (var i in M.h[n.hash])
            {
                if (M.h[n.hash][i] == n.h)
                {
                    M.h[n.hash].splice(i, 1);
                    break;
                }
            }
            if (M.h[n.hash].length == 0)
                delete M.h[n.hash];
        }
    };

    /** Don't report `newmissingkeys` unless there are *new* missing keys */
    this.checkNewMissingKeys = function() {
        var result = true;

        try {
            var keys = Object.keys(missingkeys).sort();
            var hash = MurmurHash3(JSON.stringify(keys));
            var prop = u_handle + '_lastMissingKeysHash';
            var oldh = parseInt(localStorage[prop]);

            if (oldh !== hash) {
                localStorage[prop] = hash;
            }
            else {
                result = false;
            }
        }
        catch (ex) {
            console.error(ex);
        }

        return result;
    };

    /**
     * Check existance of contact/pending contact
     *
     *
     * @param {email} email of invited contact
     *
     * @returns {number} error code, 0 proceed with request
     *
     * -12, Owner already invited user & expiration period didn't expired, fail.
     * -12 In case expiration period passed new upc is sent, but what to do with old request?
     * Delete it as soon as opc response is received for same email (idealy use user ID, if exist)
     * -10, User already invited Owner (ToDO. how to check diff emails for one account) (Check M.opc)
     * -2, User is already in contact list (check M.u)
     *
     */
    this.checkInviteContactPrerequisites = function(email) {
        var TIME_FRAME = 60 * 60 * 24 * 14;// 14 days in seconds

        // Check pending invitations
        var opc = M.opc;
        for (var i in opc) {
            if (M.opc[i].m === email) {
//                if (opc[i].rts + TIME_FRAME <= Math.floor(new Date().getTime() / 1000)) {
                return 0;
//                }
                return -12;
            }
        }

        // Check incoming invitations
        // This part of code is not necessary case server handle mutial
        // invitation and automatically translates invites into actual contacts
//        var ipc = M.ipc;
//        for (var i in ipc) {
//            if (M.ipc[i].m === email) {
//                return -10;
//            }
//        }

        // Check active contacts
        var result = 0;
        M.u.forEach(function(v, k) {
            if (v.m === email && v.c !== 0) {
                result = -2;
                return false; // break;
            }
        });

        return result;
    };

    /**
     * Invite contacts using email address, also known as ongoing pending contacts.
     * This uses API 2.0
     *
     * @param {String} owner, account owner email address.
     * @param {String} target, target email address.
     * @param {String} msg, optional custom text message.
     * @returns {Integer} proceed, API response code, if negative something is wrong
     * look at API response code table.
     */
    this.inviteContact = function(owner, target, msg) {
        DEBUG('inviteContact');
        var proceed = this.checkInviteContactPrerequisites(target);

        if (proceed === 0) {
            api_req({'a': 'upc', 'e': owner, 'u': target, 'msg': msg, 'aa': 'a', i: requesti}, {
                callback: function(resp) {
                    if (typeof resp === 'object') {
                        if (resp.p) {
                            proceed = resp.p;
                        }
                    }
                }
            });
        }

        this.inviteContactMessageHandler(proceed);

        return proceed;
    };

    /**
     * Handle all error codes for contact invitations and shows message
     *
     * @param {int} errorCode
     * @param {string} msg Can be undefined
     * @param {email} email  Can be undefined
     *
     */
    this.inviteContactMessageHandler = function(errorCode) {
        if (errorCode === -12) {

            // Invite already sent, and not expired
            msgDialog('info', '', 'Invite already sent, waiting for response');
        }
        else if (errorCode === -10) {

            // User already sent you an invitation
            msgDialog('info', '', 'User already sent you an invitation, check incoming contacts dialog');
        }
        else if (errorCode === -2) {

            // User already exist or owner
            msgDialog('info', '', l[1783]);
        }
    };

    this.cancelPendingContactRequest = function(target) {
        DEBUG('cancelPendingContactRequest');
        var proceed = this.checkCancelContactPrerequisites(target);

        if (proceed === 0) {
            api_req({ 'a': 'upc', 'u': target, 'aa': 'd', i: requesti }, {
                callback: function(resp) {
                    proceed = resp;
                }
            });
        }

        this.cancelContactMessageHandler(proceed);

        return proceed;
    };

    this.cancelContactMessageHandler = function(errorCode) {
        if (errorCode === -2) {
            msgDialog('info', '', 'This pending contact is already deleted.');
        }
    };

    this.checkCancelContactPrerequisites = function(email) {

        // Check pending invitations
        var opc = M.opc;
        var foundEmail = false;
        for (var i in opc) {
            if (M.opc[i].m === email) {
                foundEmail = true;
                if (M.opc[i].dts) {
                    return -2;// opc is already deleted
                }
            }
        }
        if (!foundEmail) {
            return -2;// opc doesn't exist for given email
        }

        return 0;
    };

    this.reinvitePendingContactRequest = function(target) {

        DEBUG('reinvitePendingContactRequest');
        api_req({'a': 'upc', 'u': target, 'aa': 'r', i: requesti});
    };

    // Answer on 'aa':'a', {"a":"upc","p":"0uUure4TCJw","s":2,"uts":1416434431,"ou":"fRSlXWOeSfo","i":"UAouV6Kori"}
    // Answer on 'aa':'i', "{"a":"upc","p":"t17TPe65rMM","s":1,"uts":1416438884,"ou":"nKv9P8pn64U","i":"qHzMjvvqTY"}"
    // ToDo, update M.ipc so we can have info about ipc status for view received requests
    this.ipcRequestHandler = function(id, action) {
        DEBUG('ipcRequestHandler');
        var proceed = this.checkIpcRequestPrerequisites(id);

        if (proceed === 0) {
            api_req({'a': 'upca', 'p': id, 'aa': action, i: requesti}, {
                callback: function(resp) {
                    proceed = resp;
                }
            });
        }

        this.ipcRequestMessageHandler(proceed);

        return proceed;
    };

    this.ipcRequestMessageHandler = function(errorCode) {
        if (errorCode === -2) {
            msgDialog('info', 'Already processed', 'Already handled request, something went wrong.');
        }

        // Server busy, ask them to retry the request
        else if (errorCode === -3 || errorCode === -4) {
            msgDialog('warninga', 'Server busy', 'The server was busy, please try again later.');
        }

        // Repeated request
        else if (errorCode === -12) {
            msgDialog('info', 'Repeated request', 'The contact has already been accepted.');
        }
    };

    this.checkIpcRequestPrerequisites = function(id) {
        var ipc = M.ipc;
        for (var i in ipc) {
            if (M.ipc[i].p === id) {
                return -0;
            }
        }

        return 0;
    };

    this.acceptPendingContactRequest = function(id) {
        return this.ipcRequestHandler(id, 'a');
    };

    this.denyPendingContactRequest = function(id) {
        return this.ipcRequestHandler(id, 'd');
    };

    this.ignorePendingContactRequest = function(id) {
        return this.ipcRequestHandler(id, 'i');
    };

    this.clearRubbish = function(sel)
    {
        if (d) {
            console.log('clearRubbish', sel);
            console.time('clearRubbish');
        }
        var selids = {};
        var c = this.c[sel === false ? M.RubbishID : M.currentdirid];
        var reqs = 0;

        if (sel && $.selected) {
            for (var i in $.selected) {
                if ($.selected.hasOwnProperty(i)) {
                    selids[$.selected[i]] = 1;
                }
            }
        }

        loadingDialog.show();

        var done = function() {
            if (d) {
                console.timeEnd('clearRubbish');
            }
            loadingDialog.hide();

            var hasItems = false;
            if (sel) {
                for (var h in c) {
                    if (c.hasOwnProperty(h)) {
                        hasItems = true;
                        break;
                    }
                }
            }

            if (!hasItems) {
                $('#treesub_' + M.RubbishID).remove();
                $('.fm-tree-header.recycle-item').removeClass('contains-subfolders expanded recycle-notification');

                if (M.RubbishID === M.currentdirid) {
                    $('.grid-table.fm tr').remove();
                    $('.file-block').remove();
                    $('.fm-empty-trashbin').removeClass('hidden');
                }
            }

            if (M.RubbishID === M.currentrootid) {
                if (M.viewmode) {
                    iconUI();
                }
                else {
                    gridUI();
                }
            }
            treeUI();
            delay('fmtopUI', fmtopUI);
        };

        var apiReq = function(handle) {
            api_req({a: 'd', n: handle, i: requesti}, {
                callback: function(res, ctx) {
                    if (res !== 0) {
                        console.error('Failed to remove Rubbish node.', handle, res);
                    }
                    else {
                        var h = handle;

                        M.delNode(h);

                        if (sel) {
                            $('.grid-table.fm#' + h).remove();
                            $('#' + h + '.file-block').remove();
                        }
                    }

                    if (!--reqs) {
                        done();
                    }
                }
            });
        };

        for (var h in c) {
            if (c.hasOwnProperty(h)) {
                if (!sel || selids[h]) {
                    reqs++;
                    apiReq(h);
                }
            }
        }

        if (!reqs) {
            done();
        }
    },

    this.syncUsersFullname = function(userId) {
        var self = this;

        if (M.u[userId].firstName || M.u[userId].lastName) {
            // already loaded.
            return;
        }

        var lastName = {name: 'lastname', value: null};
        var firstName = {name: 'firstname', value: null};

        MegaPromise.allDone([
            mega.attr.get(userId, 'firstname', -1)
                .done(function(r) {
                    firstName.value = r;
                }),
            mega.attr.get(userId, 'lastname', -1)
                .done(function(r) {
                    lastName.value = r;
                })
        ]).done(function(results) {
            if (!self.u[userId]) {
                return;
            }

            [firstName, lastName].forEach(function(obj) {
                // -1, -9, -2, etc...
                if (typeof obj.value === 'string') {
                    try {
                        obj.value = from8(base64urldecode(obj.value));
                    }
                    catch (ex) {
                        obj.value = ex;
                    }
                }

                if (typeof obj.value !== 'string' || !obj.value) {
                    obj.value = '';
                }
            });

            lastName = lastName.value;
            firstName = firstName.value;

            self.u[userId].firstName = firstName;
            self.u[userId].lastName = lastName;

            if (
                (firstName && $.trim(firstName).length > 0) ||
                (lastName && $.trim(lastName).length > 0)
            ) {
                self.u[userId].name = "";

                if (firstName && $.trim(firstName).length > 0) {
                    self.u[userId].name = firstName;
                }
                if (lastName && $.trim(lastName).length > 0) {
                    self.u[userId].name += (self.u[userId].name.length > 0 ? " " : "") + lastName;
                }
            } else {
                self.u[userId].name = "";
            }

            if (self.u[userId].avatar && self.u[userId].avatar.type != "image") {
                self.u[userId].avatar = false;
                useravatar.loaded(userId);
            }

            if (userId === u_handle) {
                u_attr.firstname = firstName;
                u_attr.lastname = lastName;
                u_attr.name = self.u[userId].name;

                $('.user-name').text(u_attr.firstname);

                $('.membership-big-txt.name:visible').text(
                    u_attr.name
                );

                if (fminitialized) {
                    M.avatars(u_handle);
                }
            }
        });
    },

    /**
     * Callback, that would be called when a contact is changed.
     */
    this.onContactChanged = function(contact) {
        if (fminitialized) {
            if (window.location.hash === "#fm/" + contact.u) {
                // re-render the contact view page if the presence had changed
                contactUI();
            }
        }
    };
    /**
     * Callback, that would be called when M.u had changed.
     */
    this.onContactsChanged = function() {
        if (fminitialized) {
            if (
                typeof $.sortTreePanel !== 'undefined' &&
                typeof $.sortTreePanel.contacts !== 'undefined' &&
                $.sortTreePanel.contacts.by === 'status'
            ) {
                M.contacts(); // we need to resort
            }

            if (window.location.hash === "#fm/contacts") {
                // re-render the contact view page if the presence had changed
                M.openFolder('contacts', true);
            }
        }
    };
    /**
     * addUser, updates global .u variable with new user data
     * adds/updates user indexedDB with newest user data
     *
     * @param {object} u, user object data
     * @param {boolean} ignoreDB, don't write to indexedDB
     */
    this.addUser = function(u, ignoreDB) {
        if (u && u.u) {
            var userId = u.u;

            if (this.u[userId]) {
                for (var key in u) {
                    if (this.u[userId].hasOwnProperty(key) && key !== 'name')  {
                        this.u[userId][key] = u[key];
                    }
                    else if (d) {
                        console.warn('addUser: property "%s" not updated.', key, u[key]);
                    }
                }

                u = this.u[userId];
            }
            else {
                this.u.set(userId, new MegaDataObject(MEGA_USER_STRUCT, true, u));
            }


            this.u[userId].addChangeListener(this.onContactChanged);

            if (typeof mDB === 'object' && !ignoreDB && !pfkey) {
                // convert MegaDataObjects -> JS
                var cleanedUpUserData = clone(u.toJS ? u.toJS() : u);
                delete cleanedUpUserData.presence;
                delete cleanedUpUserData.presenceMtime;
                delete cleanedUpUserData.shortName;
                delete cleanedUpUserData.name;
                delete cleanedUpUserData.avatar;
                mDBadd('u', cleanedUpUserData);
            }

            this.syncUsersFullname(userId);
        }
    };

    // Update M.opc and related localStorage
    this.addOPC = function(u, ignoreDB) {
        this.opc[u.p] = u;
        if (typeof mSDB === 'object' && !ignoreDB && !pfkey) {
            mSDB.add('opc', clone(u));
        }
    };

    /**
     * Delete opc record from localStorage using id
     *
     * @param {string} id
     *
     */
    this.delOPC = function(id) {
        if (typeof mSDB === 'object' && !pfkey) {
            mSDB.del('opc', id);
        }
    };

    // Update M.ipc and related localStorage
    this.addIPC = function(u, ignoreDB) {
        this.ipc[u.p] = u;
        if (typeof mSDB === 'object' && !ignoreDB && !pfkey) {
            mSDB.add('ipc', clone(u));
        }
    };

    /**
     * Delete ipc record from indexedDb using id
     *
     * @param {string} id
     *
     */
    this.delIPC = function(id) {
        if (typeof mSDB === 'object' && !pfkey) {
            mSDB.del('ipc', id);
        }
    };

    /**
     * Update M.ps and indexedDb
     *
     * Structure of M.ps
     * <shared_item_id>:
     * [
     *  <pending_contact_request_id>:
     *  {h, p, r, ts},
     * ]
     * @param {JSON} ps, pending share
     * @param {boolean} ignoreDB
     *
     *
     */
    this.addPS = function(ps, ignoreDB) {
        if (!this.ps[ps.h]) {
            this.ps[ps.h] = {};
        }
        this.ps[ps.h][ps.p] = ps;

        if (typeof mSDB === 'object' && !ignoreDB && !pfkey) {
            mSDB.add('ps', clone(ps));
        }

        // maintain special outgoing shares index by user:
        if (!this.su[ps.p]) {
            this.su[ps.p] = [];
        }
        this.su[ps.p][ps.h] = 2;
    };

    /**
     * Maintain .ps and related indexedDb
     *
     * @param {string} pcrId, pending contact request id
     * @param {string} nodeId, shared item id
     *
     *
     */
    this.delPS = function(pcrId, nodeId) {

        // Delete the pending share
        if (this.ps[nodeId]) {
            if (this.ps[nodeId][pcrId]) {
                delete this.ps[nodeId][pcrId];
            }

            // If there's no pending shares for node left, clean M.ps
            if (Object.keys(this.ps[nodeId]).length === 0) {
                delete this.ps[nodeId];
            }
        }

        // Check how removing from indexedDb works and make
        // sure that pending share is/only removed from it
        if (typeof mSDB === 'object' && !pfkey) {
            mSDB.del('ps', pcrId);
        }
    };

    // This function has a special hacky purpose, don't use it if you don't know what it does, use M.copyNodes instead.
    this.injectNodes = function(nodes, target, callback) {
        if (!Array.isArray(nodes)) {
            nodes = [nodes];
        }

        var sane = nodes.filter(function(node) {
            return M.isNodeObject(node);
        });

        if (sane.length !== nodes.length) {
            console.warn('injectNodes: Found invalid nodes.');
        }

        if (!sane.length) {
            return false;
        }

        nodes = [];

        sane = sane.map(function(node) {
            if (!M.d[node.h]) {
                nodes.push(node.h);
                M.d[node.h] = node;
            }
            return node.h;
        });

        this.copyNodes(sane, target, false, callback);

        nodes.forEach(function(handle) {
            delete M.d[handle];
        });

        return nodes.length;
    };

    /**
     * @param {Array} cn                Array of nodes that needs to be copied
     * @param {String} t                Destination node
     * @param {Bool} del                Should we delete the node after copying? (Like a move operation)
     * @param {Callback} callback       Callback function
     * @param {Callback} callbackError  Callback function for custom errors handling (Optional)
     */
    this.copyNodes = function(cn, t, del, callback, callbackError) {
        if ($.onImportCopyNodes && t.length === 11) {
            msgDialog('warninga', l[135], 'Operation not permitted.');
            return false;
        }

        loadingDialog.show();

        if (t.length === 11 && !u_pubkeys[t]) {
            var keyCachePromise = api_cachepubkeys([t]);
            keyCachePromise.always(function _cachepubkeyscomplete() {
                if (u_pubkeys[t]) {
                    M.copyNodes(cn, t, del, callback, callbackError);
                }
                else {
                    loadingDialog.hide();
                    alert(l[200]);
                }
            });

            return false;
        }

        var a = this.isNodeObject(cn) ? [cn] : ($.onImportCopyNodes || fm_getcopynodes(cn, t));
        var importNodes = Object(a).length;
        var ops = {a: 'p', t: t, n: a, i: requesti};
        var s = fm_getsharenodes(t);

        if (s.length > 0) {
            var mn = [];
            for (i in a) {
                mn.push(a[i].h);
            }
            ops.cr = crypto_makecr(mn, s, true);
        }

        if (importNodes) {
            // #4290 'strict mode'
            ops.sm = 1;
        }

        api_req(ops, {
            cn: cn,
            del: del,
            t: t,
            callback: function(res, ctx) {
                function onCopyNodesDone() {
                    loadingDialog.hide();
                    if (callback) {
                        callback(res);
                    }
                    renderNew();

                    if (importNodes && nodesCount < importNodes) {
                        msgDialog('warninga', l[882],
                            l[8683]
                                .replace('%1', nodesCount)
                                .replace('%2', importNodes)
                        );
                    }
                }
                var nodesCount;

                if (typeof res === 'number' && res < 0) {
                    loadingDialog.hide();
                    if (typeof callbackError === "function") {
                        return callbackError(res);
                    }
                    return msgDialog('warninga', l[135], l[47], api_strerror(res));
                }

                if (ctx.del) {
                    var j = [];
                    for (var i in ctx.cn) {
                        M.delNode(ctx.cn[i]);
                        api_req({a: 'd', n: cn[i], i: requesti});
                    }
                }

                newnodes = [];

                if (res.u) {
                    process_u(res.u, true);
                }

                if (res.f) {
                    nodesCount = Object(res.f).length;
                    process_f(res.f, onCopyNodesDone);
                }
                else {
                    onCopyNodesDone();
                }
            }
        });
    };

    this.moveNodes = function(n, t)
    {
        newnodes = [];
        var j = [];
        for (var i in n) {
            var h = n[i];
            var node = M.d[h];
            j.push({
                a: 'm',
                n: h,
                t: t,
                i: requesti
            });
            if (node && node.p) {
                var parent = node.p;

                if (M.c[parent] && M.c[parent][h]) {
                    delete M.c[node.p][h];
                }
                // Update M.v it's used for slideshow preview at least
                for (var k in M.v) {
                    if (M.v[k].h === h) {
                        M.v.splice(k, 1);
                        break;
                    }
                }
                if (typeof M.c[t] === 'undefined') {
                    M.c[t] = [];
                }
                M.c[t][h] = 1;
                this.nodeAttr({ h: h, p: t });
                removeUInode(h, parent);
                newnodes.push(node);
            }
        }
        renderNew();
        Soon(fmtopUI);
        processmove(j);
        $.tresizer();
    };

    this.accountSessions = function(cb) {
        /* x: 1, load the session ids
           useful to expire the session from the session manager */
        api_req({ a: 'usl', x: 1 }, {
            account: account,
            callback: function(res, ctx)
            {
                if (typeof res != 'object')
                    res = [];
                ctx.account.sessions = res;
                if (typeof cb === "function") {
                    cb();
                }
            }
        });
    };

    this.accountData = function(cb, blockui)
    {
        if (this.account && this.account.lastupdate > new Date().getTime() - 300000 && cb)
            cb(this.account);
        else
        {
            if (blockui)
                loadingDialog.show();

            account = {};

            api_req({a: 'uq', strg: 1, xfer: 1, pro: 1}, {
                account: account,
                callback: function(res, ctx)
                {
                    loadingDialog.hide();

                    if (typeof res == 'object')
                    {
                        for (var i in res) {
                            ctx.account[i] = res[i];
                        }
                        ctx.account.type = res.utype;
                        ctx.account.stype = res.stype;
                        // ctx.account.stime = res.scycle;
                        // ctx.account.scycle = res.snext;
                        ctx.account.expiry = res.suntil;
                        ctx.account.space = Math.round(res.mstrg);
                        ctx.account.space_used = Math.round(res.cstrg);
                        ctx.account.bw = Math.round(res.mxfer);
                        ctx.account.servbw_used = Math.round(res.csxfer);
                        ctx.account.downbw_used = Math.round(res.caxfer);
                        ctx.account.servbw_limit = res.srvratio;
                        ctx.account.balance = res.balance;
                        ctx.account.reseller = res.reseller;
                        ctx.account.prices = res.prices;

                        // If a subscription, get the timestamp it will be renewed
                        if (res.stype === 'S') {
                            ctx.account.srenew = res.srenew;
                        }

                        if (res.balance.length == 0)
                            ctx.account.balance = [['0.00', 'EUR']];

                        if (!u_attr.p)
                        {
                            ctx.account.servbw_used = 0;

                            if (res.tah)
                            {
                                var t = 0;

                                for (var i in res.tah)
                                    t += res.tah[i];

                                ctx.account.downbw_used = t;
                                ctx.account.bw = res.tal;
                            }
                        }
                    }
                }
            });

            api_req({a: 'uavl'}, {
                account: account,
                callback: function(res, ctx)
                {
                    if (typeof res != 'object')
                        res = [];
                    ctx.account.vouchers = voucherData(res);
                }
            });

            api_req({a: 'utt'}, {
                account: account,
                callback: function(res, ctx)
                {
                    if (typeof res != 'object')
                        res = [];
                    ctx.account.transactions = res;
                }
            });

            // Get (f)ull payment history
            // [[payment id, timestamp, price paid, currency, payment gateway id, payment plan id, num of months purchased]]
            api_req({ a: 'utp', f : 1 }, {
                account: account,
                callback: function(res, ctx)
                {
                    if (typeof res != 'object') {
                        res = [];
                    }
                    ctx.account.purchases = res;
                }
            });

            this.accountSessions();

            api_req({a: 'ug'}, {
                cb: cb,
                account: account,
                callback: function(res, ctx)
                {
                    if (typeof res == 'object')
                    {
                        if (res.p)
                        {
                            u_attr.p = res.p;
                            if (u_attr.p)
                                topmenuUI();
                        }
                    }

                    ctx.account.lastupdate = new Date().getTime();

                    if (!ctx.account.bw)
                        ctx.account.bw = 1024 * 1024 * 1024 * 10;
                    if (!ctx.account.servbw_used)
                        ctx.account.servbw_used = 0;
                    if (!ctx.account.downbw_used)
                        ctx.account.downbw_used = 0;

                    M.account = ctx.account;

                    if (ctx.cb)
                        ctx.cb(ctx.account);
                }
            });
        }
    };

    this.delIndex = function(p, h)
    {
        if (M.c[p] && M.c[p][h])
            delete M.c[p][h];
        var a = 0;
        for (var i in M.c[p]) {
            a++;
            break;
        }
        if (a == 0)
        {
            delete M.c[p];
            $('#treea_' + p).removeClass('contains-folders');
        }
    };

    this.nodeAttr = function(attrs) {

        var node = M.d[attrs.h];

        if (node) {
            for (var i in attrs) {
                if (attrs.hasOwnProperty(i)) {
                    node[i] = attrs[i];
                }
            }
            if ((typeof mDB === 'object') && !pfkey) {
                mDBadd('f', clone(node));
            }
            if (node.key && missingkeys[node.h]) {
                delete missingkeys[node.h];
            }
        }
    };

    /**
     * Fire DOM updating when a node gets a new name
     * @param {String} itemHandle  node's handle
     * @param {String} newItemName the new name
     */
    this.onRenameUIUpdate = function(itemHandle, newItemName) {
        if (fminitialized) {

            // DOM update, left and right panel in 'Cloud Drive' tab
            $('.grid-table.fm #' + itemHandle + ' .tranfer-filetype-txt').text(newItemName);
            $('#' + itemHandle + '.file-block .file-block-title').text(newItemName);

            // DOM update, left and right panel in "Shared with me' tab
            $('#treea_' + itemHandle + ' span:nth-child(2)').text(newItemName);
            $('#' + itemHandle + ' .shared-folder-info-block .shared-folder-name').text(newItemName);

            // DOM update, right panel view during browsing shared content
            $('.shared-details-block .shared-details-pad .shared-details-folder-name').text(newItemName);

            // DOM update, breadcrumbs in 'Shared with me' tab
            if ($('#path_' + itemHandle).length > 0) {
                if (this.onRenameUIUpdate.tick) {
                    clearTimeout(this.onRenameUIUpdate.tick);
                }
                this.onRenameUIUpdate.tick = setTimeout(function() {
                    M.renderPath();
                }, 90);
            }

            $(document).trigger('MegaNodeRename', [itemHandle, newItemName]);
        }
    };

    this.rename = function(itemHandle, newItemName) {
        api_setattr(itemHandle, {name: newItemName}, true);
        this.onRenameUIUpdate(itemHandle, newItemName);
    };

    /**
     * Change node favourite state.
     * @param {Array}   handles  An array containing node handles
     * @param {Boolean} del      User action i.e. true - delete from favorites, false - add to favorite
     */
    this.favourite = function(handles, del) {

        var toRenderMain = false;
        var newFavStarState = (del) ? 0 : 1;
        var exportLink = new mega.Share.ExportLink({});

        if (!Array.isArray(handles)) {
            handles = [handles];
        }

        $.each(handles, function(index, handle) {
            var node = M.d[handle];
            if (node && (node.fav !== newFavStarState)
                    && !exportLink.isTakenDown(handle)) {

                api_setattr(handle, {fav: newFavStarState});

                // Add favourite
                if (!del) {
                    $('.grid-table.fm #' + node.h + ' .grid-status-icon').addClass('star');
                    $('#' + node.h + '.file-block .file-status-icon').addClass('star');
                }

                // Remove from favourites
                else {
                    $('.grid-table.fm #' + node.h + ' .grid-status-icon').removeClass('star');
                    $('#' + node.h + '.file-block .file-status-icon').removeClass('star');
                }

                toRenderMain = true;
            }
        });

        if (toRenderMain && M.sortmode && (M.sortmode.n === 'fav')) {
            M.doSort('fav', M.sortmode.d);
            M.renderMain();
        }
    };

    /**
     * isFavourite
     *
     * Search throught items via nodesId and report about fav attribute
     * @param {Array} nodesId Array of nodes Id
     * @returns {Boolean}
     */
    this.isFavourite = function(nodesId) {

        var result = false,
            nodes = nodesId;

        if (!Array.isArray(nodesId)) {
            nodes = [nodesId];
        }

        // On first favourite found break the loop
        $.each(nodes, function(index, value) {
            if (M.d[value] && M.d[value].fav) {
                result = true;
                return false;// Break each loop
            }
        });

        return result;
    };

    this.getNode = function(idOrObj) {
        if (isString(idOrObj) === true && M.d[idOrObj]) {
            return M.d[idOrObj];
        }
        else if (idOrObj && typeof(idOrObj.t) !== 'undefined') {
            return idOrObj;
        }
        else {
            return false;
        }
    };

    /**
     * Can be used to be passed to ['nodeId', {nodeObj}].every(...).
     *
     * @param element
     * @param index
     * @param array
     * @returns {boolean}
     * @private
     */
    this._everyTypeFile = function(element, index, array) {
        var node = M.getNode(element);
        return node && node.t === 0;
    };

    /**
     * Can be used to be passed to ['nodeId', {nodeObj}].every(...).
     *
     * @param element
     * @param index
     * @param array
     * @returns {boolean}
     * @private
     */
    this._everyTypeFolder = function(element, index, array) {
        var node = M.getNode(element);
        return node && node.t === 1;
    };

    /**
     * Will return true/false if the passed node Id/node object/array of nodeids or objects is/are all files.
     *
     * @param nodesId {String|Object|Array}
     * @returns {boolean}
     */
    this.isFile = function(nodesId) {
        var nodes = nodesId;
        if (!Array.isArray(nodesId)) {
            nodes = [nodesId];
        }

        return nodes.every(this._everyTypeFile);
    };

    /**
     * Will return true/false if the passed node Id/node object/array of nodeids or objects is/are all folders.
     *
     * @param nodesId {String|Object|Array}
     * @returns {boolean}
     */
    this.isFolder = function(nodesId) {
        var nodes = nodesId;
        if (!Array.isArray(nodesId)) {
            nodes = [nodesId];
        }

        return nodes.every(this._everyTypeFolder);
    };

    /**
     * Retrieve node share.
     * @param {String|Object} node cloud node or handle
     * @param {String} user The user's handle
     * @return {Object} the share object, or false if not found.
     */
    this.getNodeShare = function(node, user) {
        user = user || 'EXP';

        if (typeof node !== 'object') {
            node = this.getNodeByHandle(node);
        }

        if (node && Object(node.shares).hasOwnProperty(user)) {
            return node.shares[user];
        }

        return false;
    };

    /**
     * Retrieve all users a node is being shared with
     * @param {Object} node    The ufs-node
     * @param {String} exclude A list of users to exclude
     * @return {Array} users list
     */
    this.getNodeShareUsers = function(node, exclude) {
        var result = [];

        if (typeof node !== 'object') {
            node = this.getNodeByHandle(node);
        }

        if (node && node.shares) {
            var users = Object.keys(node.shares);

            if (exclude) {
                if (!Array.isArray(exclude)) {
                    exclude = [exclude];
                }

                users = users.filter(function(user) {
                    return exclude.indexOf(user) === -1;
                });
            }

            result = users;
        }

        return result;
    };

    this.nodeShare = function(h, s, ignoreDB) {
        if (this.d[h]) {
            if (typeof this.d[h].shares === 'undefined') {
                this.d[h].shares = [];
            }

            this.d[h].shares[s.u] = s;
            if (typeof mDB === 'object') {
                s['h_u'] = h + '_' + s.u;
                if (!ignoreDB && !pfkey) {
                    mDBadd('s', clone(s));
                }
            }
            if (fminitialized) {
                sharedUInode(h);
            }
            if ((typeof mDB === 'object') && !pfkey) {
                if (!u_sharekeys[h]) {
                    if (d && !this.getNodeShare(h)) {
                        console.warn('INVALID OPERATION -- No share key for handle "%s"', h);
                    }
                }
                else {
                    mDBadd('ok', {
                        h: h,
                        k: a32_to_base64(encrypt_key(u_k_aes, u_sharekeys[h])),
                        ha: crypto_handleauth(h)
                    });
                }
            }

            // maintain special outgoing shares index by user:
            if (!this.su[s.u]) {
                this.su[s.u] = [];
            }
            this.su[s.u][h] = 1;
        }
        else if (d) {
            console.log('nodeShare failed for node:', h, s, ignoreDB);
        }
    };

    /**
     * Delete node share.
     * @param {String}  h    Node handle.
     * @param {String}  u    User handle to remove the associated share
     * @param {Boolean} okd  Whether API notified the node is no longer
     *                       shared with anybody else and therefore the
     *                       owner share key must be removed too.
     */
    this.delNodeShare = function(h, u, okd) {

        if (this.d[h] && typeof this.d[h].shares !== 'undefined') {
            var a = 0;

            api_updfkey(h);
            delete this.d[h].shares[u];

            if (u === 'EXP' && this.d[h].ph) {
                delete this.d[h].ph;
                this.nodeAttr({ h: h });
            }

            for (var i in this.d[h].shares) {
                if (this.d[h].shares[i]) {
                    a++;
                    break;
                }
            }

            if (a === 0) {
                delete this.d[h].shares;
                M.nodeAttr({ h: h, shares: undefined });

                if (fminitialized) {
                    sharedUInode(h);
                }
            }

            if (typeof mDB === 'object') {
                mDBdel('s', h + '_' + u);
            }
        }

        if (okd) {
            // The node is no longer shared with anybody, ensure it's properly cleared..

            var users = this.getNodeShareUsers(h, 'EXP');

            if (users.length) {
                console.error('The node "%s" still has shares on it!', h);

                users.forEach(function(user) {
                    M.delNodeShare(h, user);
                });
            }

            delete u_sharekeys[h];
            if (typeof mDB === 'object') {
                mDBdel('ok', h);
            }
        }
    };

    // Searches M.opc for the pending contact
    this.findOutgoingPendingContactIdByEmail = function(email) {
        for (var index in M.opc) {
            var opc = M.opc[index];

            if (opc.m === email) {
                return opc.p;
            }
        }
    };

    /**
     * called when user try to remove pending contact from shared dialog
     * should be changed case M.ps structure is changed, take a look at processPS()
     *
     * @param {string} nodeHandle
     * @param {string} pendingContactId
     *
     *
     */
    this.deletePendingShare = function(nodeHandle, pendingContactId) {
        if (this.d[nodeHandle]) {

            if (this.ps[nodeHandle] && this.ps[nodeHandle][pendingContactId]) {
                M.delPS(pendingContactId, nodeHandle);
            }
        }
    };

    this.makeDir = function(n)
    {
        if (is_chrome_firefox & 4)
            return;

        var dirs = [];
        function getfolders(d, o)
        {
            var c = 0;
            for (var e in M.d)
            {
                if (M.d[e].t == 1 && M.d[e].p == d)
                {
                    var p = o || [];
                    if (!o) p.push(fm_safename(M.d[d].name));
                    p.push(fm_safename(M.d[e].name));
                    if (!getfolders(M.d[e].h, p))
                        dirs.push(p);
                    ++c;
                }
            }
            return c;
        }
        getfolders(n);

        if (d)
            console.log('makedir', dirs);

        if (is_chrome_firefox)
        {
            var root = mozGetDownloadsFolder();
            if (root)
                dirs.filter(String).forEach(function(p)
                {
                    try
                    {
                        p = mozFile(root, 0, p);
                        if (!p.exists())
                            p.create(Ci.nsIFile.DIRECTORY_TYPE, parseInt("0755", 8));
                    }
                    catch (e)
                    {
                        Cu.reportError(e);
                        console.log('makedir', e.message);
                    }
                });
        }
        else
        {
            if (d)
                console.log('MAKEDIR: TODO');
        }
    }

    this.getDownloadFolderNodes = function(n, md, nodes, paths)
    {
        if (md) this.makeDir(n);

        var subids = fm_getnodes(n);
        for (var j in subids)
        {
            var p = this.getPath(subids[j]);
            var path = '';

            for (var k in p)
            {
                if (M.d[p[k]] && M.d[p[k]].t)
                    path = fm_safename(M.d[p[k]].name) + '/' + path;
                if (p[k] == n)
                    break;
            }

            if (!M.d[subids[j]].t)
            {
                nodes.push(subids[j]);
                paths[subids[j]] = path;
            }
            else {
                console.log('0 path', path);
            }
        }
    };

    /**
     * Retrieve an user object by its handle
     * @param {String} handle The user's handle
     * @return {Object} The user object, of false if not found
     */
    this.getUserByHandle = function(handle) {
        var user = false;

        if (Object(M.u).hasOwnProperty(handle)) {
            user = M.u[handle];

            if (user instanceof MegaDataObject) {
                user = user._data;
            }
        }

        if (!user && handle === u_handle) {
            user = u_attr;
        }

        return user;
    };

    /**
     * Retrieve an user object by its email
     * @param {String} email The user's handle
     * @return {Object} The user object, of false if not found
     */
    this.getUserByEmail = function(email) {
        var user = false;

        M.u.every(function(contact, u) {
            if (M.u[u].m === email) {
                // Found the user object
                user = M.u[u];

                if (user instanceof MegaDataObject) {
                    user = user._data;
                }
                return false;
            }
            return true;
        });

        return user;
    };

    /**
     * Retrieve an user object
     * @param {String} str An email or handle
     * @return {Object} The user object, of false if not found
     */
    this.getUser = function(str) {
        var user = false;

        if (typeof str !== 'string') {
            // Check if it's an user object already..

            if (Object(str).hasOwnProperty('u')) {
                // Yup, likely.. let's see
                user = this.getUserByHandle(str.u);
            }
        }
        else if (str.length === 11) {
            // It's an user handle
            user = this.getUserByHandle(str);
        }
        else if (str.indexOf('@') > 0) {
            // It's an email..
            user = this.getUserByEmail(str);
        }

        return user;
    };

    /**
     * Retrieve the name of an user or ufs node by its handle
     * @param {String} handle The handle
     * @return {String} the name, of an empty string if not found
     */
    this.getNameByHandle = function(handle) {
        var result = '';

        handle = String(handle);

        if (handle.length === 11) {
            var user = this.getUserByHandle(handle);

            if (user) {
                // XXX: fallback to email
                result = user.name && $.trim(user.name) || user.m;
            }
        }
        else if (handle.length === 8) {
            var node = this.getNodeByHandle(handle);

            if (node) {
                result = node.name;
            }
        }

        return String(result);
    };

    /**
     * Retrieve an ufs node by its handle
     * @param {String} handle The node's handle
     * @return {Object} The node object, of false if not found
     */
    this.getNodeByHandle = function(handle) {
        if (Object(M.d).hasOwnProperty(handle)) {
            return M.d[handle];
        }

        for (var i in M.v) {
            if (M.v.hasOwnProperty(i)) {
                if (M.v[i].h === handle) {
                    return M.v[i];
                }
            }
        }

        return false;
    };

    /**
     * Check whether an object is an ufs node
     * @param {String} n The object to check
     * @return {Boolean}
     */
    this.isNodeObject = function(n) {
        return typeof n === 'object' && Array.isArray(n.key) && n.key.length === 8;
    };

    /** like addToTransferTable, but can take a download object */
    this.putToTransferTable = function(node, ttl) {
        var handle = node.h || node.dl_id;
        node.name = node.name || node.n;

        if (d && console.assert) {
            console.assert(this.isNodeObject(node), 'Invalid putToTransferTable node.');
        }

        var gid = 'dl_' + handle;
        var isPaused = uldl_hold || dlQueue.isPaused(gid);

        var state = '';
        var pauseTxt = '';
        if (isPaused) {
            state = 'transfer-paused';
            pauseTxt = l[1651];
        }

        var flashhtml = '';
        if (dlMethod === FlashIO) {
            flashhtml = '<object width="1" height="1" id="dlswf_'
                + htmlentities(handle)
                + '" type="application/x-shockwave-flash">'
                + '<param name=FlashVars value="buttonclick=1" />'
                + '<param name="movie" value="' + location.origin + '/downloader.swf"/>'
                + '<param value="always" name="allowscriptaccess"/>'
                + '<param name="wmode" value="transparent"/>'
                + '<param value="all" name="allowNetworking">'
                + '</object>';
        }

        this.addToTransferTable(gid, ttl,
            '<tr id="dl_' + htmlentities(handle) + '" class="transfer-queued transfer-download ' + state + '">'
            + '<td><div class="transfer-type download">'
            + '<ul><li class="right-c"><p><span></span></p></li><li class="left-c"><p><span></span></p></li></ul>'
            + '</div>' + flashhtml + '</td>'
            + '<td><span class="transfer-filtype-icon ' + fileIcon(node) + '"></span>'
            + '<span class="tranfer-filetype-txt">' + htmlentities(node.name) + '</span></td>'
            + '<td>' + filetype(node.name) + '</td>'
            + '<td>' + bytesToSize(node.s) + '</td>'
            + '<td><span class="eta"></span><span class="speed">' + pauseTxt + '</span></td>'
            + '<td><span class="transfer-status">' + l[7227] + '</span></td>'
            + '<td class="grid-url-field"><a class="grid-url-arrow"></a>'
            + '<a class="clear-transfer-icon"></a></td>'
            + '<td><span class="row-number"></span></td>'
            + '</tr>');

        if (isPaused) {
            fm_tfspause('dl_' + handle);
        }
        if (ttl) {
            ttl.left--;
        }
    };

    this.addDownload = function(n, z, preview) {
        var args = arguments;
        var webdl = function() {
            M.addWebDownload.apply(M, args);
            args = undefined;
        };

        if (z || preview || !fmconfig.dlThroughMEGAsync) {
            return webdl();
        }

        dlmanager.isMEGAsyncRunning(0x02010100)
            .done(function(sync) {
                var cmd = {
                    a: 'd',
                    auth: folderlink ? M.RootID : u_sid
                };
                var files = [];

                var addNode = function(node) {
                    var item = {
                        t: node.t,
                        h: node.h,
                        p: node.p,
                        n: base64urlencode(node.name),
                    };
                    if (!node.t) {
                        item.s = node.s;
                        item.ts = node.mtime || node.ts;
                        if (Object(node.key).length) {
                            item.k = a32_to_base64(node.key);
                        }
                    }
                    files.push(item);

                    if (node.t) {
                        foreach(fm_getnodes(node.h));
                    }
                };

                var foreach = function(nodes) {
                    for (var i in nodes) {
                        if (nodes.hasOwnProperty(i)) {
                            var node = M.d[nodes[i]];

                            if (node) {
                                addNode(node);
                            }
                        }
                    }
                };

                foreach(n);

                if (!files.length) {
                    console.error('No files...');
                    return webdl();
                }

                cmd.f = files;

                sync.megaSyncRequest(cmd)
                    .done(function() {
                        showToast('megasync', l[8635], 'Open');
                    })
                    .fail(webdl);
            })
            .fail(webdl);
    };

    this.addWebDownload = function(n, z, preview, zipname)
    {
        delete $.dlhash;
        var path;
        var added = 0;
        var nodes = [];
        var paths = {};
        var zipsize = 0;
        if (!is_extension && !preview && !z && (dlMethod === MemoryIO || dlMethod === FlashIO))
        {
            var nf = [], cbs = [];
            for (var i in n)
            {
                if (M.d[n[i]] && M.d[n[i]].t) {
                    var nn = [], pp = {};
                    this.getDownloadFolderNodes(n[i], false, nn, pp);
                    cbs.push(this.addDownload.bind(this, nn, 0x21f9A, pp, M.d[n[i]].name));
                }
                else {
                    nf.push(n[i]);
                }
            }

            n = nf;

            if (cbs.length) {
                for (var i in cbs) {
                    Soon(cbs[i]);
                }
            }
        }
        if (z === 0x21f9A)
        {
            nodes = n;
            paths = preview;
            preview = false;
        }
        else for (var i in n)
        {
            if (M.d[n[i]])
            {
                if (M.d[n[i]].t)
                {
                    this.getDownloadFolderNodes(n[i], !!z, nodes, paths);
                }
                else
                {
                    nodes.push(n[i]);
                }
            }
            else if (this.isNodeObject(n[i])) {
                nodes.push(n[i]);
            }
        }

        if (z) {
            z = ++dlmanager.dlZipID;
            if (M.d[n[0]] && M.d[n[0]].t && M.d[n[0]].name) {
                zipname = M.d[n[0]].name + '.zip';
            }
            else {
                zipname = (zipname || ('Archive-' + Math.random().toString(16).slice(-4))) + '.zip';
            }
        }
        else {
            z = false;
        }
        if (!$.totalDL) {
            $.totalDL = 0;
        }

        var p = '';
        var pauseTxt = '';
        if (uldl_hold) {
            p = 'transfer-paused';
            pauseTxt = l[1651];
        }

        var ttl = this.getTransferTableLengths();
        for (var k in nodes) {
            /* jshint -W089 */
            if (!nodes.hasOwnProperty(k) || !this.isNodeObject((n = M.d[nodes[k]]))) {
                n = nodes[k];
                if (this.isNodeObject(n)) {
                    dlmanager.logger.info('Using plain provided node object.');
                }
                else {
                    dlmanager.logger.error('** CHECK THIS **', 'Invalid node', k, nodes[k]);
                    continue;
                }
            }
            path = paths[nodes[k]] || '';
            $.totalDL += n.s;
            var $tr = $('.transfer-table #dl_' + htmlentities(n.h));
            if ($tr.length) {
                if (!$tr.hasClass('transfer-completed')) {
                    continue;
                }
                $tr.remove();
            }
            dl_queue.push({
                id: n.h,
                key: n.key,
                n: n.name,
                t: n.mtime || n.ts,
                p: path,
                size: n.s,
                nauth: n_h,
                onDownloadProgress: this.dlprogress,
                onDownloadComplete: this.dlcomplete,
                onBeforeDownloadComplete: this.dlbeforecomplete,
                onDownloadError: this.dlerror,
                onDownloadStart: this.dlstart,
                zipid: z,
                zipname: zipname,
                preview: preview
            });
            added++;
            zipsize += n.s;

            if (!z) {
                this.putToTransferTable(n, ttl);
            }
        }

        if (!added) {
            if (d) {
                dlmanager.logger.warn('Nothing to download.');
            }
            return;
        }

        // If regular download using Firefox and the total download is over 1GB then show the dialog
        // to use the extension, but not if they've seen the dialog before and ticked the checkbox
        if (dlMethod == MemoryIO && !localStorage.firefoxDialog && $.totalDL > 1048576000 && navigator.userAgent.indexOf('Firefox') > -1) {
            Later(firefoxDialog);
        }

        var flashhtml = '';
        if (dlMethod === FlashIO) {
            flashhtml = '<object width="1" height="1" id="dlswf_zip_' + htmlentities(z) + '" type="application/x-shockwave-flash"><param name=FlashVars value="buttonclick=1" /><param name="movie" value="' + document.location.origin + '/downloader.swf"/><param value="always" name="allowscriptaccess"><param name="wmode" value="transparent"><param value="all" name="allowNetworking"></object>';
        }

        if (z && zipsize) {
            this.addToTransferTable('zip_' + z, ttl,
                '<tr id="zip_' + z + '" class="transfer-queued transfer-download ' + p + '">'
                + '<td><div class="transfer-type download">'
                + '<ul><li class="right-c"><p><span></span></p></li><li class="left-c"><p><span></span></p></li></ul>'
                + '</div>' + flashhtml + '</td>'
                + '<td><span class="transfer-filtype-icon ' + fileIcon({name: 'archive.zip'}) + '"></span>'
                + '<span class="tranfer-filetype-txt">' + htmlentities(zipname) + '</span></td>'
                + '<td>' + filetype({name: 'archive.zip'}) + '</td>'
                + '<td>' + bytesToSize(zipsize) + '</td>'
                + '<td><span class="eta"></span><span class="speed">' + pauseTxt + '</span></td>'
                + '<td><span class="transfer-status">' + l[7227] + '</span></td>'
                + '<td class="grid-url-field"><a class="grid-url-arrow"></a>'
                + '<a class="clear-transfer-icon"></a></td>'
                + '<td><span class="row-number"></span></td>'
                + '</tr>');


            if (uldl_hold) {
                fm_tfspause('zip_' + z);
            }
        }

        if (!preview)
        {
            this.onDownloadAdded(added, uldl_hold, z, zipsize);
            setupTransferAnalysis();
        }

        delete $.dlhash;
    };

    this.onDownloadAdded = function(added, isPaused, isZIP, zipSize) {
        if (!$.transferHeader) {
            transferPanelUI();
        }
        delay('fm_tfsupdate', fm_tfsupdate); // this will call $.transferHeader();

        if (!isZIP || zipSize) {
            M.addDownloadToast = ['d', isZIP ? 1 : added, isPaused];
        }
        openTransferpanel();
        initGridScrolling();
        initFileblocksScrolling();
        initTreeScroll();

        if ((dlmanager.isDownloading = Boolean(dl_queue.length))) {
            $('.transfer-pause-icon').removeClass('disabled');
            $('.transfer-clear-completed').removeClass('disabled');
            $('.transfer-clear-all-icon').removeClass('disabled');
        }
    };

    this.dlprogress = function(id, perc, bl, bt, kbps, dl_queue_num, force)
    {
        var st;
        if (dl_queue[dl_queue_num].zipid)
        {
            id = 'zip_' + dl_queue[dl_queue_num].zipid;
            var tl = 0;
            var ts = 0;
            for (var i in dl_queue)
            {
                if (dl_queue[i].zipid == dl_queue[dl_queue_num].zipid)
                {
                    if (!st)
                        st = dl_queue[i].st;
                    ts += dl_queue[i].size;
                    if (dl_queue[i].complete)
                        tl += dl_queue[i].size;
                    // TODO: check this for suitable GP use
                }
            }
            bt = ts;
            bl = tl + bl;
        }
        else
        {
            id = 'dl_' + id;
            st = dl_queue[dl_queue_num].st;
        }

        // var failed = parseInt($('#' + id).data('failed') || "0");
        // failed not long ago

        // if (failed+30000 > NOW()) return;

        if (!bl)
            return false;
        if (!$.transferprogress)
            $.transferprogress = {};
        if (kbps == 0) {
            if (!force && (perc != 100 || $.transferprogress[id]))
                return false;
        }

        var $tr = $('.transfer-table #' + id);
        if (!$tr.hasClass('transfer-started')) {
            $tr.find('.transfer-status').text('');
            $tr.addClass('transfer-started');
            $tr.removeClass('transfer-initiliazing transfer-queued');
            $('.transfer-table').prepend($tr);
            delay('fm_tfsupdate', fm_tfsupdate); // this will call $.transferHeader();
        }
        // var eltime = (new Date().getTime()-st)/1000;
        var bps = kbps * 1000;
        var retime = bps && (bt - bl) / bps;
        var transferDeg = 0;
        if (bt)
        {
            // $.transferprogress[id] = Math.floor(bl/bt*100);
            $.transferprogress[id] = [bl, bt, bps];
            if (!uldl_hold)
            {
                if (slideshowid == dl_queue[dl_queue_num].id && !previews[slideshowid])
                {
                    $('.slideshow-error').addClass('hidden');
                    $('.slideshow-pending').addClass('hidden');
                    $('.slideshow-progress').attr('class', 'slideshow-progress percents-' + perc);
                }

                $tr.find('.transfer-status').text(perc + '%');
                transferDeg = 360 * perc / 100;
                if (transferDeg <= 180) {
                    $tr.find('.right-c p').css('transform', 'rotate(' + transferDeg + 'deg)');
                }
                else {
                    $tr.find('.right-c p').css('transform', 'rotate(180deg)');
                    $tr.find('.left-c p').css('transform', 'rotate(' + (transferDeg - 180) + 'deg)');
                }
                if (retime > 0) {
                    var title = '';
                    try {
                        title = new Date((unixtime() + retime) * 1000).toLocaleString();
                    }
                    catch (ex) {
                    }
                    $tr.find('.eta')
                        .text(secondsToTime(retime))
                        .removeClass('unknown')
                        .attr('title', title);
                }
                else {
                    $tr.find('.eta').addClass('unknown').text('');
                }
                if (bps > 0) {
                    $tr.find('.speed').safeHTML(bytesToSize(bps, 1, 1) + '/s').removeClass('unknown');
                }
                else {
                    $tr.find('.speed').addClass('unknown').text('');
                }
                delay('percent_megatitle', percent_megatitle);

                if (page.substr(0, 2) !== 'fm')
                {
                    $('.widget-block').removeClass('hidden');
                    $('.widget-block').show();
                    if (!ulmanager.isUploading)
                        $('.widget-circle').attr('class', 'widget-circle percents-' + perc);
                    $('.widget-icon.downloading').removeClass('hidden');
                    $('.widget-speed-block.dlspeed').text(bytesToSize(bps, 1) + '/s');
                    $('.widget-block').addClass('active');
                }
            }
        }
    }

    this.dlcomplete = function(dl)
    {
        var id = dl.id, z = dl.zipid;

        if (slideshowid == id && !previews[slideshowid])
        {
            $('.slideshow-pending').addClass('hidden');
            $('.slideshow-error').addClass('hidden');
            $('.slideshow-progress').attr('class', 'slideshow-progress percents-100');
        }

        if (z)
            id = 'zip_' + z;
        else
            id = 'dl_' + id;

        var $tr = $('.transfer-table #' + id);
        $tr.removeClass('transfer-started').addClass('transfer-completed');
        $tr.find('.left-c p, .right-c p').css('transform', 'rotate(180deg)');
        $tr.find('.transfer-status').text(l[1418]);
        $tr.find('.eta, .speed').text('').removeClass('unknown');

        if ($('#dlswf_' + id.replace('dl_', '')).length > 0)
        {
            var flashid = id.replace('dl_', '');
            $('#dlswf_' + flashid).width(170);
            $('#dlswf_' + flashid).height(22);
            $('#' + id + ' .transfer-type')
                .removeClass('download')
                .addClass('safari-downloaded')
                .text('Save File');
        }
        if (dlMethod == FileSystemAPI)
        {
            setTimeout(fm_chromebar, 250, $.dlheight);
            setTimeout(fm_chromebar, 500, $.dlheight);
            setTimeout(fm_chromebar, 1000, $.dlheight);
        }
        if (page.substr(0, 2) !== 'fm') {
            var a = dl_queue.filter(isQueueActive).length;
            if (a < 2 && !ulmanager.isUploading) {
                $('.widget-block').fadeOut('slow', function(e) {
                    $('.widget-block').addClass('hidden').css({opacity: 1});
                });
            }
            else if (a < 2) {
                $('.widget-icon.downloading').addClass('hidden');
            }
            else {
                $('.widget-circle').attr('class', 'widget-circle percents-0');
            }
        }
        if ($.transferprogress && $.transferprogress[id])
        {
            if (!$.transferprogress['dlc'])
                $.transferprogress['dlc'] = 0;
            $.transferprogress['dlc'] += $.transferprogress[id][1];
            delete $.transferprogress[id];
        }

        delay('tfscomplete', function() {
            mega.utils.resetUploadDownload();
            $.tresizer();
        });
    }

    this.dlbeforecomplete = function()
    {
        $.dlheight = $('body').height();
    }

    this.dlerror = function(dl, error)
    {
        var x;
        var errorstr;
        var gid = dlmanager.getGID(dl);

        if (d) {
            dlmanager.logger.error('dlerror', gid, error);
        }
        else {
            if (error !== EOVERQUOTA) {
                srvlog('onDownloadError :: ' + error + ' [' + hostname(dl.url) + '] ' + (dl.zipid ? 'isZIP' : ''));
            }
            else if (!dl.log509 && !dl.logOverQuota && Object(u_attr).p) {
                dl.logOverQuota = 1;
                api_req({ a: 'log', e: 99615, m: 'PRO user got EOVERQUOTA' });
            }
        }

        switch (error) {
            case ETOOMANYCONNECTIONS:
                errorstr = l[18];
                break;
            case ESID:
                errorstr = l[19];
                break;
            case EBLOCKED:
            case ETOOMANY:
            case EACCESS:
                errorstr = l[23];
                break;
            case ENOENT:
                errorstr = l[22];
                break;
            case EKEY:
                errorstr = l[24];
                break;
            case EOVERQUOTA:
                errorstr = l[1673];
                break;
                // case EAGAIN:               errorstr = l[233]; break;
                // case ETEMPUNAVAIL:         errorstr = l[233]; break;
            default:
                errorstr = l[x = 233];
                break;
        }

        if (window.slideshowid == dl.id && !previews[slideshowid])
        {
            $('.slideshow-image-bl').addClass('hidden');
            $('.slideshow-pending').addClass('hidden');
            $('.slideshow-progress').addClass('hidden');
            $('.slideshow-error').removeClass('hidden');
            $('.slideshow-error-txt').text(errorstr);
        }

        if (errorstr) {
            var prog = Object(GlobalProgress[gid]);

            dl.failed = new Date;
            if (x != 233 || !prog.speed || !(prog.working || []).length) {
                /**
                 * a chunk may fail at any time, don't report a temporary error while
                 * there is network activity associated with the download, though.
                 */
                if (page === 'download') {
                    if (error === EOVERQUOTA) {
                        $('.download-info.time-txt .text').text('');
                        $('.download-info.speed-txt .text').text('');
                        $('.download.pause-button').addClass('active');
                        $('.download.info-block').addClass('overquota');
                    }
                    else {
                        $('.download.error-icon').text(errorstr);
                        $('.download.error-icon').removeClass('hidden');
                        $('.download.icons-block').addClass('hidden');
                    }
                }
                else {
                    var $tr = $('.transfer-table tr#' + gid);

                    $tr.addClass('transfer-error');
                    $tr.find('.eta, .speed').text('').addClass('unknown');
                    $tr.find('.transfer-status').text(errorstr);

                    if (error === EOVERQUOTA) {
                        $tr.find('.transfer-status').addClass('overquota');
                    }
                }
            }
        }
    }

    this.dlstart = function(dl)
    {
        var id = (dl.zipid ? 'zip_' + dl.zipid : 'dl_' + dl.dl_id);

        $('.transfer-table #' + id)
            .addClass('transfer-initiliazing')
            .find('.transfer-status').text(l[1042]);

        delay('fm_tfsupdate', fm_tfsupdate); // this will call $.transferHeader()
        dl.st = NOW();
        ASSERT(typeof dl_queue[dl.pos] === 'object', 'No dl_queue entry for the provided dl...');
        ASSERT(typeof dl_queue[dl.pos] !== 'object' || dl.n == dl_queue[dl.pos].n, 'No matching dl_queue entry...');
        if (typeof dl_queue[dl.pos] === 'object')
            M.dlprogress(id, 0, 0, 0, 0, dl.pos);
    }
    this.mobileuploads = [];

    this.doFlushTransfersDynList = function(aNumNodes) {
        aNumNodes = Object.keys(M.tfsdomqueue).slice(0, aNumNodes | 0);

        if (aNumNodes.length) {
            for (var i = 0, l = aNumNodes.length; i < l; ++i) {
                var item = aNumNodes[i];

                addToTransferTable(item, M.tfsdomqueue[item], 1);
                delete M.tfsdomqueue[item];
            }

            $.tresizer();
        }
    };

    this.handleEvent = function(ev) {
        if (d > 1) {
            console.debug(ev.type, ev);
        }

        var ttl;
        if (ev.type === 'ps-y-reach-end') {
            ttl = M.getTransferTableLengths();
            if (ttl.left > -100) {
                this.doFlushTransfersDynList(ttl.size);
            }
        }
        else if (ev.type === 'tfs-dynlist-flush') {
            ttl = M.getTransferTableLengths();
            if (ttl.left > -10) {
                this.doFlushTransfersDynList(ttl.size);
            }
        }
    };

    this.tfsResizeHandler = SoonFc(function() {

        // if (M.currentdirid === 'transfers')
        {
            var T = M.getTransferTableLengths();

            if (d)
                console.log('resize.tfsdynlist', JSON.stringify(T));

            if (T.left > 0) {
                M.doFlushTransfersDynList(T.left + 3);
            }
        }
    });

    this.getTransferTableLengths = function()
    {
        var te   = this.getTransferElements();
        var used = te.domTable.querySelectorAll('tr').length;
        var size = Math.ceil(parseInt(te.domScrollingTable.style.height) / 24);

        return {size: size, used: used, left: size - used};
    };

    this.getTransferElements = function() {
        var obj               = {};
        obj.domTransfersBlock = document.querySelector('.fm-transfers-block');
        obj.domTableWrapper   = obj.domTransfersBlock.querySelector('.transfer-table-wrapper');
        obj.domTransferHeader = obj.domTransfersBlock.querySelector('.fm-transfers-header');
        obj.domPanelTitle     = obj.domTransferHeader.querySelector('.transfer-panel-title');
        obj.domTableEmptyTxt  = obj.domTableWrapper.querySelector('.transfer-panel-empty-txt');
        obj.domTableHeader    = obj.domTableWrapper.querySelector('.transfer-table-header');
        obj.domScrollingTable = obj.domTableWrapper.querySelector('.transfer-scrolling-table');
        obj.domTable          = obj.domScrollingTable.querySelector('.transfer-table');

        this.getTransferElements = function() {
            return obj;
        };

        return obj;
    };

    function addToTransferTable(gid, elem, q)
    {
        var te     = M.getTransferElements();
        var target = gid[0] === 'u'
            ? $('tr.transfer-upload.transfer-queued:last', te.domTable)
            : $('tr.transfer-download.transfer-queued:last', te.domTable);

        if (target.length) {
            target.after(elem);
        }
        else {
            if (gid[0] != 'u') {
                target = $('tr.transfer-upload.transfer-queued:first', te.domTable);
            }

            if (target.length) {
                target.before(elem);
            }
            else {
                target = $('tr.transfer-completed:first', te.domTable);

                if (target.length) {
                    target.before(elem);
                }
                else {
                    $(te.domTable).append(elem);
                }
            }
        }
        /*if ($.mSortableT) {
            $.mSortableT.sortable('refresh');
        }*/
        if (!q) {
            delay('fm_tfsupdate', fm_tfsupdate);
        }
    }
    this.addToTransferTable = function(gid, ttl, elem)
    {
        var T = ttl || this.getTransferTableLengths();

        if (d > 1) {
            var logger = (gid[0] === 'u' ? ulmanager : dlmanager).logger;
            logger.info('Adding Transfer', gid, JSON.stringify(T));
        }

        if (this.tfsResizeHandler)
        {
            M.getTransferElements()
                .domScrollingTable
                .addEventListener('ps-y-reach-end', M, {passive: true});
            mBroadcaster.addListener('tfs-dynlist-flush', M);

            $(window).bind('resize.tfsdynlist', this.tfsResizeHandler);
            delete this.tfsResizeHandler;
        }

        if (T.left > 0)
        {
            addToTransferTable(gid, elem, true);
            // In some cases UI is not yet initialized, nor transferHeader()
            $('.transfer-table-header').show(0);
        }
        else
        {
            var fit;

            if (gid[0] !== 'u')
            {
                var dl = $('.transfer-table tr.transfer-download.transfer-queued:last');

                if (dl.length)
                {
                    // keep inserting downloads as long there are uploads
                    // dl = +dl.closest('tr').children(':first').text();
                    dl = dl.prevAll().length;

                    if (dl && dl + 1 < T.used)
                    {
                        addToTransferTable(gid, elem);
                        fit = true;
                    }
                }
            }

            if (!fit)
                M.tfsdomqueue[gid] = elem;
        }
    };

    var __ul_id = 8000;
    this.addUpload = function(u, ignoreWarning) {
        var flag = 'ulMegaSyncAD';

        if (u.length > 99 && !ignoreWarning && !localStorage[flag]) {
            var showMEGAsyncDialog = function(button, syncData) {
                $('.download-button.light-red.download').safeHTML(button);
                $('.download-button.light-white.continue').safeHTML(l[8846]);
                $('.megasync-upload-overlay').show();
                var $chk = $('.megasync-upload-overlay .checkdiv');
                var hideMEGAsyncDialog = function() {
                    $('.megasync-upload-overlay').hide();
                    $(document).unbind('keyup.megasync-upload');
                    $('.download-button.light-white.continue, .fm-dialog-close').unbind('click');
                    $('.download-button.light-red.download').unbind('click');
                    $chk.unbind('click.dialog');
                    $chk = undefined;
                };
                $('.download-button.light-white.continue, .fm-dialog-close').rebind('click', function() {
                    hideMEGAsyncDialog();
                    M.addUpload(u, true);
                });
                $(document).rebind('keyup.megasync-upload', function() {
                    hideMEGAsyncDialog();
                    M.addUpload(u, true);
                });
                $('.download-button.light-red.download').rebind('click', function() {
                    hideMEGAsyncDialog();

                    if (!syncData) {
                        location.hash = '#sync';
                    }
                    // if the user is running MEGAsync 3.0+
                    else if (!syncData.verNotMeet) {
                        // Check whether the user logged in MEGAsync does match here
                        if (syncData.u === u_handle) {
                            // Let MEGAsync open the local file selector.
                            megasync.megaSyncRequest({ a: 'u' });
                        }
                    }
                });
                $chk.rebind('click.dialog', function() {
                    if ($chk.hasClass('checkboxOff')) {
                        $chk.removeClass('checkboxOff').addClass('checkboxOn');
                        localStorage[flag] = 1;
                    }
                    else {
                        $chk.removeClass('checkboxOn').addClass('checkboxOff');
                        delete localStorage[flag];
                    }
                });
            };
            dlmanager.isMEGAsyncRunning('3.0', 1)
                .done(function(ms, syncData) {
                    showMEGAsyncDialog(l[8912], syncData);
                })
                .fail(function() {
                    showMEGAsyncDialog(l[8847]);
                });
            return;
        }
        var target;
        var onChat;
        var filesize;
        var added = 0;
        var f;
        var ul_id;
        var pause = '';
        var pauseTxt = '';
        var ttl = this.getTransferTableLengths();

        if ($.onDroppedTreeFolder) {
            target = $.onDroppedTreeFolder;
            delete $.onDroppedTreeFolder;
        }
        else if ($('.nw-fm-left-icon.transfers').hasClass('active')) {
            target = M.lastSeenCloudFolder || M.RootID;
        }
        else {
            target = M.currentdirid;
        }

        if ((onChat = (M.currentdirid && M.currentdirid.substr(0, 4) === 'chat'))) {
            if (!$.ulBunch) {
                $.ulBunch = {};
            }
            if (!$.ulBunch[M.currentdirid]) {
                $.ulBunch[M.currentdirid] = {};
            }
        }

        if (uldl_hold) {
            pause = 'transfer-paused';
            pauseTxt = l[1651];
        }

        for (var i in u) {
            f = u[i];
            try {
                // this could throw NS_ERROR_FILE_NOT_FOUND
                filesize = f.size;
            }
            catch (ex) {
                ulmanager.logger.warn(f.name, ex);
                continue;
            }
            ul_id = ++__ul_id;
            if (!f.flashid) {
                f.flashid = false;
            }
            f.target = target;
            f.id = ul_id;

            var gid = 'ul_' + ul_id;
            this.addToTransferTable(gid, ttl,
                '<tr id="' + gid + '" class="transfer-queued transfer-upload ' + pause + '">'
                + '<td><div class="transfer-type upload">'
                + '<ul><li class="right-c"><p><span></span></p></li><li class="left-c"><p><span></span></p></li></ul>'
                + '</div></td>'
                + '<td><span class="transfer-filtype-icon ' + fileIcon({name: f.name}) + '"></span>'
                + '<span class="tranfer-filetype-txt">' + htmlentities(f.name) + '</span></td>'
                + '<td>' + filetype(f.name) + '</td>'
                + '<td>' + bytesToSize(filesize) + '</td>'
                + '<td><span class="eta"></span><span class="speed">' + pauseTxt + '</span></td>'
                + '<td><span class="transfer-status">' + l[7227] + '</span></td>'
                + '<td class="grid-url-field"><a class="grid-url-arrow"></a>'
                + '<a class="clear-transfer-icon"></a></td>'
                + '<td><span class="row-number"></span></td>'
                + '</tr>');

            ul_queue.push(f);
            ttl.left--;
            added++;

            if (uldl_hold) {
                fm_tfspause('ul_' + ul_id);
            }

            if (onChat) {
                $.ulBunch[M.currentdirid][ul_id] = 1;
            }
        }
        if (!added) {
            ulmanager.logger.warn('Nothing added to upload.');
            return;
        }
        if (!$.transferHeader) {
            transferPanelUI();
        }
        if (page == 'start') {
            ulQueue.pause();
            uldl_hold = true;
        }
        else {
            showTransferToast('u', added);
            openTransferpanel();
            delay('fm_tfsupdate', fm_tfsupdate); // this will call $.transferHeader()
        }

        setupTransferAnalysis();
        if ((ulmanager.isUploading = Boolean(ul_queue.length))) {
            $('.transfer-pause-icon').removeClass('disabled');
            $('.transfer-clear-completed').removeClass('disabled');
            $('.transfer-clear-all-icon').removeClass('disabled');
        }
    }

    this.ulprogress = function(ul, perc, bl, bt, bps)
    {
        var id  = ul.id;
        var $tr = $('#ul_' + id);
        if (!$tr.hasClass('transfer-started')) {
            $tr.find('.transfer-status').text('');
            $tr.removeClass('transfer-initiliazing transfer-queued');
            $tr.addClass('transfer-started');
            $('.transfer-table').prepend($tr);
            delay('fm_tfsupdate', fm_tfsupdate); // this will call $.transferHeader()
        }
        if (!bl || !ul.starttime)
            return false;
        var retime = bps > 1000 ? (bt - bl) / bps : -1;
        var transferDeg = 0;
        if (!$.transferprogress)
            $.transferprogress = {};
        if (bl && bt && !uldl_hold)
        {
            // $.transferprogress[id] = Math.floor(bl/bt*100);
            $.transferprogress['ul_' + id] = [bl, bt, bps];
            $tr.find('.transfer-status').text(perc + '%');
            transferDeg = 360 * perc / 100;
            if (transferDeg <= 180) {
                $tr.find('.right-c p').css('transform', 'rotate(' + transferDeg + 'deg)');
            }
            else {
                $tr.find('.right-c p').css('transform', 'rotate(180deg)');
                $tr.find('.left-c p').css('transform', 'rotate(' + (transferDeg - 180) + 'deg)');
            }
            if (retime > 0) {
                $tr.find('.eta').safeHTML(secondsToTime(retime, 1)).removeClass('unknown');
            } else {
                $tr.find('.eta').addClass('unknown').text('');
            }
            if (bps > 0) {
                $tr.find('.speed').safeHTML(bytesToSize(bps, 1, 1) + '/s').removeClass('unknown');
            } else {
                $tr.find('.speed').addClass('unknown').text('');
            }
            // $.transferHeader();

            if (page.substr(0, 2) !== 'fm')
            {
                $('.widget-block').removeClass('hidden');
                $('.widget-block').show();
                $('.widget-circle').attr('class', 'widget-circle percents-' + perc);
                $('.widget-icon.uploading').removeClass('hidden');
                $('.widget-speed-block.ulspeed').text(bytesToSize(bps, 1) + '/s');
                $('.widget-block').addClass('active');
            }
        }
        delay('percent_megatitle', percent_megatitle);
    }

    this.ulcomplete = function(ul, h, k)
    {
        var id  = ul.id;
        var $tr = $('#ul_' + id);

        if ($.ulBunch && $.ulBunch[ul.target])
        {
            var ub = $.ulBunch[ul.target], p;
            ub[id] = h;

            for (var i in ub)
            {
                if (ub[i] == 1)
                {
                    p = true;
                    break;
                }
            }

            if (!p)
            {
                var ul_target = ul.target;
                ub = Object.keys(ub).map(function(m) { return ub[m]});
                Soon(function() {
                    $(document).trigger('megaulcomplete', [ul_target, ub]);
                    delete $.ulBunch[ul_target];
                    if (!$.len($.ulBunch)) {
                        delete $.ulBunch;
                    }
                });
            }
        }

        if (ul.skipfile) {
            showToast('megasync', l[372] + ' "' + ul.name + '" (' + l[1668] + ')');
        }

        /*this.mobile_ul_completed = true;
        for (var i in this.mobileuploads)
        {
            if (id == this.mobileuploads[i].id)
                this.mobileuploads[i].done = 1;
            if (!this.mobileuploads[i].done)
                this.mobile_ul_completed = false;
        }
        if (this.mobile_ul_completed)
        {
            $('.upload-status-txt').text(l[1418]);
            $('#mobileuploadtime').addClass('complete');
            $('#uploadpopbtn').text(l[726]);
            $('#mobileupload_header').text(l[1418]);
         }*/
        $tr.removeClass('transfer-started').addClass('transfer-completed');
        $tr.find('.left-c p, .right-c p').css('transform', 'rotate(180deg)');
        $tr.find('.transfer-status').text(ul.skipfile ? l[1668] : l[1418]);
        $tr.find('.eta, .speed').text('').removeClass('unknown');

        ul_queue[ul.pos] = Object.freeze({});

        if (page.substr(0, 2) !== 'fm') {
            var a = ul_queue.filter(isQueueActive).length;
            if (a < 2 && !ulmanager.isDownloading) {
                $('.widget-block').fadeOut('slow', function(e) {
                    $('.widget-block').addClass('hidden').css({opacity: 1});
                });
            }
            else if (a < 2) {
                $('.widget-icon.uploading').addClass('hidden');
            }
            else {
                $('.widget-circle').attr('class', 'widget-circle percents-0');
            }
        }

        if ($.transferprogress && $.transferprogress['ul_'+ id])
        {
            if (!$.transferprogress['ulc']) $.transferprogress['ulc'] = 0;
            $.transferprogress['ulc'] += $.transferprogress['ul_'+ id][1];
            delete $.transferprogress['ul_'+ id];
        }
        // $.transferHeader();
        delay('tfscomplete', function() {
            mega.utils.resetUploadDownload();
            $.tresizer();
        });
    }

    this.ulstart = function(ul)
    {
        var id = ul.id;

        if (d) {
            ulmanager.logger.log('ulstart', id);
        }

        $('.transfer-table #ul_' + id)
            .addClass('transfer-initiliazing')
            .find('.transfer-status').text(l[1042]);

        delay('fm_tfsupdate', fm_tfsupdate); // this will call $.transferHeader()
        ul.starttime = new Date().getTime();
        M.ulprogress(ul, 0, 0, 0);
    };

    this.cloneChatNode = function(n, keepParent) {
        var n2 = clone(n);
        n2.k = a32_to_base64(n2.key);
        delete n2.key, n2.ph, n2.ar;
        if (!keepParent)
            delete n2.p;
        return n2;
    };

    /**
     * Handle a redirect from the mega.co.nz/#pro page to mega.nz/#pro page
     * and keep the user logged in at the same time
     */
    this.transferFromMegaCoNz = function()
    {
        // Get site transfer data from after the hash in the URL
        var urlParts = /#sitetransfer!(.*)/.exec(window.location);

        if (urlParts) {

            try {
                // Decode from Base64 and JSON
                urlParts = JSON.parse(atob(urlParts[1]));
            }
            catch (ex) {
                console.error(ex);
                window.location.hash = 'login';
                return false;
            }

            if (urlParts) {
                // If the user is already logged in here with the same account
                // we can avoid a lot and just take them to the correct page
                if (JSON.stringify(u_k) === JSON.stringify(urlParts[0])) {
                    window.location.hash = urlParts[2];
                    return false;
                }

                // If the user is already logged in but with a different account just load that account instead. The
                // hash they came from e.g. a folder link may not be valid for this account so just load the file manager.
                else if (u_k && (JSON.stringify(u_k) !== JSON.stringify(urlParts[0]))) {
                    if (!urlParts[2] || String(urlParts[2]).match(/^fm/)) {
                        window.location.hash = 'fm';
                        return false;
                    }
                    else {
                        window.location.hash = urlParts[2];
                        return false;
                    }
                }

                // Likely that they have never logged in here before so we must set this
                localStorage.wasloggedin = true;
                u_logout();

                // Get the page to load
                var toPage = String(urlParts[2] || 'fm').replace('#', '');

                // Set master key, session ID and RSA private key
                u_storage = init_storage(sessionStorage);
                u_k = urlParts[0];
                u_sid = urlParts[1];
                if (u_k) {
                    u_storage.k = JSON.stringify(u_k);
                }

                loadingDialog.show();

                var _goToPage = function() {
                    loadingDialog.hide();
                    window.location.hash = toPage;
                }

                var _rawXHR = function(url, data, callback) {
                    mega.utils.xhr(url, JSON.stringify([data]))
                        .always(function(ev, data) {
                            var resp;
                            if (typeof data === 'string' && data[0] === '[') {
                                try {
                                    resp = JSON.parse(data)[0];
                                }
                                catch (ex) {}
                            }
                            callback(resp);
                        });
                }

                // Performs a regular login as part of the transfer from mega.co.nz
                _rawXHR(apipath + 'cs?id=0&sid=' + u_sid, {'a': 'ug'}, function(data) {
                        var ctx = {
                            checkloginresult: function(ctx, result) {
                                u_type = result;
                                if (toPage.substr(0, 1) === '!' && toPage.length > 7) {
                                    _rawXHR(apipath + 'cs?id=0&domain=meganz',
                                        { 'a': 'g', 'p': toPage.substr(1, 8)},
                                        function(data) {
                                            if (data) {
                                                dl_res = data;
                                            }
                                            _goToPage();
                                        });
                                }
                                else {
                                    _goToPage();
                                }
                            }
                        };
                        if (data) {
                            api_setsid(u_sid);
                            u_storage.sid = u_sid;
                            u_checklogin3a(data, ctx);
                        }
                        else {
                            u_checklogin(ctx, false);
                        }
                    });

                // Successful transfer, continue load
                return false;
            }
        }
    };
}

function voucherData(arr)
{
    var vouchers = [];
    var varr = arr[0];
    var tindex = {};
    for (var i in arr[1])
        tindex[arr[1][i][0]] = arr[1][i];
    for (var i in varr)
    {
        var redeemed = 0;
        var cancelled = 0;
        var revoked = 0;
        var redeem_email = '';
        if ((varr[i].rdm) && (tindex[varr[i].rdm]))
        {
            redeemed = tindex[varr[i].rdm][1];
            redeemed_email = tindex[varr[i].rdm][2];
        }
        if (varr[i].xl && tindex[varr[i].xl])
            cancelled = tindex[varr[i].xl][1];
        if (varr[i].rvk && tindex[varr[i].rvk])
            revoked = tindex[varr[i].rvk][1];
        vouchers.push({
            id: varr[i].id,
            amount: varr[i].g,
            currency: varr[i].c,
            iss: varr[i].iss,
            date: tindex[varr[i].iss][1],
            code: varr[i].v,
            redeemed: redeemed,
            redeem_email: redeem_email,
            cancelled: cancelled,
            revoked: revoked
        });
    }
    return vouchers;
}

function onUploadError(ul, errorstr, reason, xhr)
{
    var hn = hostname(ul.posturl);

    /*if (!d && (!xhr || xhr.readyState < 2 || xhr.status)) {
        var details = [
            browserdetails(ua).name,
            String(reason)
        ];
        if (xhr || reason === 'peer-err') {
            if (xhr && xhr.readyState > 1) {
                details.push(xhr.status);
            }
            details.push(hn);
        }
        if (details[1].indexOf('mtimeout') == -1 && -1 == details[1].indexOf('BRFS [l:Unk]')) {
            srvlog('onUploadError :: ' + errorstr + ' [' + details.join("] [") + ']');
        }
    }*/

    if (d) {
        ulmanager.logger.error('onUploadError', ul.id, ul.name, errorstr, reason, hn);
    }

    $('.transfer-table #ul_' + ul.id).addClass('transfer-error');
    $('.transfer-table #ul_' + ul.id + ' .transfer-status').text(errorstr);
}

function addupload(u)
{
    M.addUpload(u);
}
function onUploadStart(id)
{
    M.ulstart(id);
}
function onUploadProgress(id, p, bl, bt, speed)
{
    M.ulprogress(id, p, bl, bt, speed);
}
function onUploadSuccess(id, bl, bt)
{
    M.ulcomplete(id, bl, bt);
}

function fm_chromebar(height)
{
    if (window.navigator.userAgent.toLowerCase().indexOf('mac') >= 0 || localStorage.chromeDialog == 1)
        return false;
    var h = height - $('body').height();
    if ((h > 33) && (h < 41))
    {
        setTimeout(fm_chromebarcatchclick, 500, $('body').height());
        chromeDialog();
    }
}

function fm_chromebarcatchclick(height)
{
    if ($('body').height() != height)
    {
        chromeDialog(1);
        return false;
    }
    setTimeout(fm_chromebarcatchclick, 200, height);
}

function fm_safename(name)
{
    // http://msdn.microsoft.com/en-us/library/aa365247(VS.85)
    name = ('' + name).replace(/[:\/\\<">|?*]+/g, '.').replace(/\s*\.+/g, '.');
    if (name.length > 250)
        name = name.substr(0, 250) + '.' + name.split('.').pop();
    name = name.replace(/\s+/g, ' ').trim();
    var end = name.lastIndexOf('.');
    end = ~end && end || name.length;
    if (/^(?:CON|PRN|AUX|NUL|COM\d|LPT\d)$/i.test(name.substr(0, end)))
        name = '!' + name;
    return name;
}

function fm_safepath(path, file)
{
    path = ('' + (path || '')).split(/[\\\/]+/).map(fm_safename).filter(String);
    if (file)
        path.push(fm_safename(file));
    return path;
}

function fm_matchname(p, name)
{
    var a = [];
    for (var i in M.d)
    {
        var n = M.d[i];
        if (n.p == p && name == n.name)
            a.push({id: n.h, size: n.s, name: n.name});
    }
    return a;
}

var t;

function renderfm() {
    if (d) {
        console.time('renderfm');
    }

    initUI();
    loadingDialog.hide();
    M.sortByName();
    M.renderTree();
    M.renderPath();
    var c = $('#treesub_' + M.RootID).attr('class');
    if (c && c.indexOf('opened') < 0) {
        $('.fm-tree-header.cloud-drive-item').addClass('opened');
        $('#treesub_' + M.RootID).addClass('opened');
    }

    M.openFolder(M.currentdirid);
    if (megaChatIsReady) {
        megaChat.renderMyStatus();
    }

    if (d) {
        console.timeEnd('renderfm');
    }
}

function renderNew() {

    var newNode, tb,
        treebuild = [],
        UImain = false,
        UItree = false,
        newcontact = false,
        newpath = false,
        newshare = false;

    if (d) {
        console.time('rendernew');
    }

    for (var i in newnodes) {

        newNode = newnodes[i];
        if (newNode.h.length === 11) {
            newcontact = true;
        }
        if (newNode.su) {
            newshare = true;
        }
        if (newNode.p && newNode.t) {
            treebuild[newNode.p] = 1;
        }
        if (newNode.p === M.currentdirid || newNode.h === M.currentdirid) {
            UImain = true;
        }
        if (!newpath && document.getElementById('path_' + newNode.h)) {
            newpath = true;
        }
    }

    for (var h in treebuild) {
        tb = M.d[h];
        if (tb) {
            M.buildtree(tb, M.buildtree.FORCE_REBUILD);
            UItree = true;
        }
    }

    if (UImain) {
        M.filterByParent(M.currentdirid);
        M.sort();
        M.renderMain(true);
        // M.renderPath();
        $.tresizer();
    }

    if (UItree) {
        treeUI();
        if (M.currentrootid === 'shares') {
            M.renderTree();
        }
        if (M.currentdirid === 'shares' && !M.viewmode) {
            M.openFolder('shares', 1);
        }
        treeUIopen(M.currentdirid);
    }
    if (newcontact) {
        M.avatars();
        M.contacts();
        treeUI();

        if (megaChatIsReady) {
            //megaChat.renderContactTree();
            megaChat.renderMyStatus();
        }
    }
    if (newshare) {
        M.buildtree({h: 'shares'}, M.buildtree.FORCE_REBUILD);
    }
    // initContextUI();
    if (newpath) {
        M.renderPath();
    }

    if (u_type === 0) {
        // Show "ephemeral session warning"
        topmenuUI();
    }

    newnodes = undefined;
    if (d) {
        console.timeEnd('rendernew');
    }
}

/**
 * Execute response from server to client
 */
function execsc(actionPackets, callback) {

    var tparentid = false,
        trights = false,
        tmoveid = false,
        rootsharenodes = [],
        loadavatars = [];

    newnodes = [];
    mega.flags |= window.MEGAFLAG_EXECSC;

    if (d) {
        console.time('execsc');
    }

    // Process action packets
    for (var i in actionPackets) {
        var actionPacket = actionPackets[i];

        // If debug mode, log the packet to console
        if (d) {
            console.log('actionpacket', actionPacket);
        }

        // If own action packet
        if (actionPacket.i === requesti) {
            if (d) {
                console.log('OWN ACTION PACKET');
            }

            // If contact notification
            if (actionPacket.a === 'c') {
                process_u(actionPacket.u);

                // Only show a notification if we did not trigger the action ourselves
                if (!pfid && u_attr && actionPacket.ou !== u_attr.u) {
                    notify.notifyFromActionPacket(actionPacket);
                }

                if (megaChatIsReady) {
                    $.each(actionPacket.u, function (k, v) {
                        if (v.c !== 0) {
                            crypt.getPubRSA(v.u);
                        }
                        megaChat[v.c == 0 ? "processRemovedUser" : "processNewUser"](v.u);
                    });
                }
            }

            // Full share
            else if (actionPacket.a === 's' || actionPacket.a === 's2') {

                // Used during share dialog removal of contact from share list
                // Find out is this a full share delete
                if (actionPacket.r === undefined) {

                    // Fill DDL with removed contact
                    if (actionPacket.u && M.u[actionPacket.u] && M.u[actionPacket.u].m) {
                        var email = M.u[actionPacket.u].m;
                        var contactName = M.getNameByHandle(actionPacket.u);

                        addToMultiInputDropDownList('.share-multiple-input', [{ id: email, name: contactName }]);
                        addToMultiInputDropDownList('.add-contact-multiple-input', [{ id: email, name: contactName }]);
                    }
                }

                if (actionPacket.okd) {
                    M.delNodeShare(actionPacket.n, actionPacket.u, actionPacket.okd);
                }

                if (actionPacket.a === 's2') {
                    processPS([actionPacket]);
                }

                if (fminitialized) {
                    // Full share contains .h param
                    sharedUInode(actionPacket.h);
                }
            }

            // Outgoing pending contact
            else if (actionPacket.a === 'opc') {
                processOPC([actionPacket]);

                // Don't append to sent grid on deletion
                if (!actionPacket.dts) {
                    M.drawSentContactRequests([actionPacket]);
                }
            }

            // Incoming pending contact
            else if (actionPacket.a === 'ipc') {
                processIPC([actionPacket]);
                M.drawReceivedContactRequests([actionPacket]);
                notify.notifyFromActionPacket(actionPacket);
            }

            // Export link (public handle)
            else if (actionPacket.a === 'ph') {
                processPH([actionPacket]);
            }

            // Incomming request updated
            else if (actionPacket.a === 'upci') {
                processUPCI([actionPacket]);
            }

            // Outgoing request updated
            else if (actionPacket.a === 'upco') {
                processUPCO([actionPacket]);

                // If the status is accepted ('2') then this will be followed by a contact packet and we do not need to notify
                if (actionPacket.s !== 2) {
                    notify.notifyFromActionPacket(actionPacket);
                }
            }
            else if (actionPacket.a === 'ua') {
                mega.attr.handleUserAttributeActionPackets(actionPacket, loadavatars);
            }
        }// END own action packet
        else if (actionPacket.a === 'e') {
            var str = hex2bin(actionPacket.c || "");
            if (str.substr(0, 5) === ".cms.") {
                var cmsType = str.split(".")[2];
                var cmsId = str.substr(6 + cmsType.length).split(".");
                CMS.reRender(cmsType, cmsId);
            }
        }
        else if (actionPacket.a === 'fa') {
            M.nodeAttr({
                h: actionPacket.n,
                fa: actionPacket.fa
            });
        }
        else if ((actionPacket.a === 's' || actionPacket.a === 's2') && !folderlink) {

            var tsharekey = '';
            var prockey = false;

            if (actionPacket.o === u_handle) {

                if (!actionPacket.u) {
                    // this must be a pending share
                    if (actionPacket.a !== 's2') {
                        console.error('INVALID SHARE ACTION PACKET, Missing user-handle', actionPacket);
                    }
                }
                // If access right are undefined then share is deleted
                else if (typeof actionPacket.r === "undefined") {
                    M.delNodeShare(actionPacket.n, actionPacket.u, actionPacket.okd);
                }
                else {
                    var handle = actionPacket.n;
                    var shares = Object(M.d[handle]).shares || {};

                    if (shares.hasOwnProperty(actionPacket.u)
                            || (actionPacket.ha === crypto_handleauth(actionPacket.n))) {

                        // I updated or created my share
                        u_sharekeys[handle] = decrypt_key(u_k_aes, base64_to_a32(actionPacket.ok));
                        M.nodeShare(handle, {
                            h: actionPacket.n,
                            r: actionPacket.r,
                            u: actionPacket.u,
                            ts: actionPacket.ts
                        });
                    }
                }
            }
            else {
                if ((typeof actionPacket.n !== 'undefined')
                        && (typeof actionPacket.k !== 'undefined')
                        && (typeof u_sharekeys[actionPacket.n] === 'undefined')) {

                    if (!actionPacket.k) {
                        // XXX: We need to find out which API call is causing it
                        //      (it might be a bug in the SDK or the webclient)
                        // How to reproduce: Delete folder with pending shares,
                        // on client side we will have this situation
                        srvlog('Got share action-packet with no key.');
                    }
                    else {
                        u_sharekeys[actionPacket.n] = crypto_process_sharekey(actionPacket.n, actionPacket.k);
                        tsharekey = a32_to_base64(u_k_aes.encrypt(u_sharekeys[actionPacket.n]));
                        prockey = true;
                    }
                }

                if (actionPacket && actionPacket.u === 'EXP') {
                    var exportLink = new mega.Share.ExportLink({ 'nodesToProcess': [actionPacket.h] });
                    exportLink.getExportLink();
                }

                if (typeof actionPacket.o !== 'undefined') {
                    if (typeof actionPacket.r === "undefined") {
                        if (d) {
                            console.log('delete a share');
                        }
                        // delete a share:
                        var n = M.d[actionPacket.n];
                        if (n && n.p.length !== 11) {
                            M.nodeAttr({
                                h: actionPacket.n,
                                r: 0,
                                su: ''
                            });
                        }
                        else {
                            M.delNode(actionPacket.n);
                        }
                        if (!folderlink && actionPacket.u !== 'EXP' && fminitialized) {
                            notify.notifyFromActionPacket({
                                a: 'dshare',
                                n: actionPacket.n,
                                u: actionPacket.o
                            });
                        }
                        delete u_sharekeys[actionPacket.n];
                    }
                    else {
                        if (d) {
                            console.log('I receive a share, prepare for receiving tree a');
                        }
                        // I receive a share, prepare for receiving tree a
                        tparentid = actionPacket.o;
                        trights = actionPacket.r;
                        if (M.d[actionPacket.n]) {
                            // update rights:
                            M.nodeAttr({
                                h: actionPacket.n,
                                r: actionPacket.r,
                                su: actionPacket.o
                            });
                        }
                        else {
                            if (d) {
                                console.log('look up other root-share-nodes from this user');
                            }
                            // look up other root-share-nodes from this user:
                            if (typeof M.c[actionPacket.o] !== 'undefined') {
                                for (var i in M.c[actionPacket.o]) {
                                    if (M.d[i] && M.d[i].t == 1) {
                                        rootsharenodes[i] = 1;
                                    }
                                }
                            }

                            if (!folderlink && fminitialized) {
                                notify.notifyFromActionPacket({
                                    a: 'share',
                                    n: actionPacket.n,
                                    u: actionPacket.o
                                });
                            }
                        }
                    }
                }
            }

            if (prockey) {
                var nodes = fm_getnodes(actionPacket.n, 1);
                nodes.push(actionPacket.n);
                for (var i in nodes) {
                    var n = M.d[nodes[i]];

                    if (n) {
                        var f = {
                            a: n.a,
                            h: n.h,
                            k: n.k
                        };
                        crypto_processkey(u_handle, u_k_aes, f);
                        if (f.ar) {
                            // Bug #1983: No-Key issue.
                            n.ar = f.ar;
                        }
                        M.nodeAttr({
                            h: nodes[i],
                            name: f.name,
                            key: f.key,
                            sk: tsharekey
                        });
                        newnodes.push(M.d[n.h]);
                    }
                }
            }

            crypto_share_rsa2aes();

            if (actionPacket.a === 's2') {
                processPS([actionPacket]);
            }

            if (fminitialized) {
                M.buildtree({h: 'shares'}, M.buildtree.FORCE_REBUILD);
                sharedUInode(actionPacket.n);
            }
        }
        else if (actionPacket.a === 'k' && !folderlink) {
            if (actionPacket.sr)
                crypto_procsr(actionPacket.sr);
            else if (actionPacket.cr)
                crypto_proccr(actionPacket.cr);
            else
                api_req({
                    a: 'k',
                    cr: crypto_makecr(actionPacket.n, [actionPacket.h], true)
                });

            if (fminitialized) {
                M.buildtree({h: 'shares'}, M.buildtree.FORCE_REBUILD);
            }
        }
        else if (actionPacket.a === 't') {
            if (tparentid) {
                for (var b in actionPacket.t.f) {
                    if (rootsharenodes[actionPacket.t.f[b].h] && M.d[actionPacket.t.f[b].h]) {
                        actionPacket.t.f[b].r = M.d[actionPacket.t.f[b].h].r;
                        actionPacket.t.f[b].su = M.d[actionPacket.t.f[b].h].su;
                        M.delNode(actionPacket.t.f[b].h);
                    }
                }

                if (!M.d[actionPacket.t.f[0].p]) {
                    actionPacket.t.f[0].p = tparentid;
                }

                actionPacket.t.f[0].su = tparentid;
                actionPacket.t.f[0].r = trights;

                if (tsharekey) {
                    actionPacket.t.f[0].sk = tsharekey;
                    tsharekey = false;
                }
                rootsharenodes = [];
            }

            // notification logic:
            if (fminitialized && !folderlink && actionPacket.ou && actionPacket.ou != u_handle
                && actionPacket.t && actionPacket.t.f && actionPacket.t.f[0]
                && actionPacket.t.f[0].p.length < 11 && !tmoveid && !tparentid) {

                var targetid = actionPacket.t.f[0].p;
                var pnodes = [];
                for (var i in actionPacket.t.f) {
                    if (actionPacket.t.f[i].p === targetid) {
                        pnodes.push({
                            h: actionPacket.t.f[i].h,
                            t: actionPacket.t.f[i].t
                        });
                    }
                }
                notify.notifyFromActionPacket({
                    a: 'put',
                    n: targetid,
                    u: actionPacket.ou,
                    f: pnodes
                });
            }

            tparentid = false;
            trights = false;
            __process_f1(actionPacket.t.f);
        }
        else if (actionPacket.a === 'u') {
            var n = M.d[actionPacket.n];
            if (n) {
                var f = {
                    h : actionPacket.n,
                    k : actionPacket.k,
                    a : actionPacket.at
                };
                crypto_processkey(u_handle, u_k_aes, f, u_nodekeys[n.h]);

                if (!f.key && u_nodekeys[n.h]) {
                    // TODO: This is a temporal fix, we have to investigate why does the API fails
                    // on providing the right key for the node, likely we're missing giving it to it.

                    f.k = u_handle + ':' + a32_to_base64(encrypt_key(u_k_aes, u_nodekeys[n.h]));
                    crypto_processkey(u_handle, u_k_aes, f);
                }

                if (f.key) {
                    if (f.name !== n.name) {
                        M.onRenameUIUpdate(n.h, f.name);
                    }
                    if (fminitialized && f.fav !== n.fav) {
                        if (f.fav) {
                            $('.grid-table.fm #' + n.h + ' .grid-status-icon').addClass('star');
                            $('#' + n.h + '.file-block .file-status-icon').addClass('star');
                        }
                        else {
                            $('.grid-table.fm #' + n.h + ' .grid-status-icon').removeClass('star');
                            $('#' + n.h + '.file-block .file-status-icon').removeClass('star');
                        }
                    }
                    M.nodeAttr({
                        h : actionPacket.n,
                        fav : f.fav,
                        name : f.name,
                        key : f.key,
                        a : actionPacket.at
                    });
                }
                else if (n.key) {
                    delete missingkeys[n.h];
                }
                if (actionPacket.cr) {
                    crypto_proccr(actionPacket.cr);
                }
            }
        }
        else if (actionPacket.a === 'c') {
            process_u(actionPacket.u);

            // Contact is deleted on remote computer, remove contact from contacts left panel
            if (fminitialized && actionPacket.u[0].c === 0) {
                $('#contact_' + actionPacket.ou).remove();

                $.each(actionPacket.u, function(k, v) {

                    var userHandle = v.u;

                    // hide the context menu if it is currently visible and this contact was removed.
                    if ($.selected && ($.selected[0] === userHandle)) {

                        // was selected
                        $.selected = [];
                        if ($('.context-menu.files-menu').is(":visible")) {
                            $.hideContextMenu();
                        }
                    }
                });

                M.handleEmptyContactGrid();
            }

            // Only show a notification if we did not trigger the action ourselves
            if (!pfid && u_attr && actionPacket.ou !== u_attr.u) {
                notify.notifyFromActionPacket(actionPacket);
            }

            if (megaChatIsReady) {
                $.each(actionPacket.u, function(k, v) {
                    if (v.c !== 0) {
                        crypt.getPubRSA(v.u);
                    }
                    megaChat[v.c == 0 ? "processRemovedUser" : "processNewUser"](v.u);
                });
            }
        }
        else if (actionPacket.a === 'd') {
            M.delNode(actionPacket.n);

            // Only show a notification if we did not trigger the action ourselves
            if (!pfid && u_attr && actionPacket.ou !== u_attr.u) {
                notify.notifyFromActionPacket(actionPacket);
            }
        }
        else if (actionPacket.a === 'ua' && fminitialized) {
            var attrs = actionPacket.ua;
            var actionPacketUserId = actionPacket.u;
            for (var j in attrs) {
                if (attrs.hasOwnProperty(j)) {
                    var attributeName = attrs[j];

                    attribCache.uaPacketParser(
                        attributeName,
                        actionPacketUserId,
                        false,
                        actionPacket.v && actionPacket.v[j] ? actionPacket.v[j] : undefined
                    );
                }
            }
        }
        else if (actionPacket.a === 'la') {
            notify.countAndShowNewNotifications();
        }
        else if (actionPacket.a === 'opc') {
            processOPC([actionPacket]);

            if (fminitialized) {
                M.drawSentContactRequests([actionPacket]);
            }
        }
        else if (actionPacket.a === 'ipc') {
            processIPC([actionPacket]);

            if (fminitialized) {
                M.drawReceivedContactRequests([actionPacket]);
            }
            notify.notifyFromActionPacket(actionPacket);
        }
        else if (actionPacket.a === 'ph') {// Export link (public handle)
            processPH([actionPacket]);

            // Not applicable so don't return anything or it will show a blank notification
            if (typeof actionPacket.up !== 'undefined' && typeof actionPacket.down !== 'undefined') {
                notify.notifyFromActionPacket(actionPacket);
            }
        }
        else if (actionPacket.a === 'upci') {
            processUPCI([actionPacket]);
        }
        else if (actionPacket.a === 'upco') {
            processUPCO([actionPacket]);

            // If the status is accepted ('2') then this will be followed by a contact packet and we do not need to notify
            if (actionPacket.s !== 2) {
                notify.notifyFromActionPacket(actionPacket);
            }
        }
        // Action packet to notify about payment (Payment Service Transaction Status)
        else if (actionPacket.a === 'psts') {
            proPage.processPaymentReceived(actionPacket);
        }
        // Action packet for the mcc
        else if (actionPacket.a === 'mcc') {
            if (!megaChatIsDisabled) {
                if (megaChatIsReady) {
                    $(window).trigger('onChatdChatUpdatedActionPacket', actionPacket);
                }
                else {
                    ChatdIntegration._queuedChats[actionPacket.id] = actionPacket;
                }
            }
        }
        // Action packet for 'Set Email'
        else if (actionPacket.a === 'se') {
            var emailChangeAccepted = (actionPacket.s === 3
                                       && typeof actionPacket.e === 'string'
                                       && actionPacket.e.indexOf('@') !== -1);

            if (emailChangeAccepted) {
                var user = M.getUserByHandle(actionPacket.u);

                if (user) {
                    user.m = actionPacket.e;
                    process_u([user]);

                    if (actionPacket.u === u_handle) {
                        u_attr.email = user.m;

                        if (M.currentdirid === 'account/profile') {
                            $('.nw-fm-left-icon.account').trigger('click');
                        }
                    }
                }
            }
        }
        else {
            if (d) {
                console.log('not processing this action packet', actionPacket);
            }
        }
    }

    if (newnodes.length > 0 && fminitialized) {
        renderNew();
    }
    if (loadavatars.length) {
        M.avatars(loadavatars);
    }
    if (M.viewmode) {
        delay('thumbnails', fm_thumbnails, 3200);
    }
    if ($.dialog === 'properties') {
        propertiesDialog();
    }
    getsc();
    if (callback) {
        Soon(callback);
    }

    if (d) {
        console.timeEnd('execsc');
    }

    mega.flags &= ~window.MEGAFLAG_EXECSC;
}

function fm_updatekey(h, k)
{
    var n = M.d[h];
    if (n)
    {
        var f = {h: h, k: k, a: M.d[h].a};
        crypto_processkey(u_handle, u_k_aes, f);
        u_nodekeys[h] = f.key;
        M.nodeAttr({h: h, name: f.name, key: f.key, k: k});
    }
}

function fm_commitkeyupdate()
{
    // refresh render?
}

function loadfm(force)
{
    if (force) {
        loadfm.loaded = false;
    }
    if (loadfm.loaded) {
        Soon(loadfm_done.bind(this, -0x800e0fff));
    }
    else {
        if (is_fm()) {
            loadingDialog.hide();
            loadingInitDialog.show();
            loadingInitDialog.step1();
        }
        if (!loadfm.loading) {
            M.reset();
            fminitialized = false;
            loadfm.loading = true;
            setTimeout(function __lazyLoadFM() {
                var req_params = {
                    a:'f',
                    c:1,
                    r:1,
                    ca:1
                };
                if (!megaChatIsDisabled && typeof Chatd !== 'undefined') {
                    req_params['cv'] = Chatd.VERSION;
                }
                api_req(req_params, {
                    callback: loadfm_callback,
                    progress: function(perc) {
                        loadingInitDialog.step2(parseInt(perc));
                    }
                },n_h ? 1 : 0);
            }, 350);
        }
    }
}

function RightsbyID(id) {

    if (folderlink || (id && id.length > 8)) {
        return false;
    }

    var p = M.getPath(id);

    if ((p[p.length - 1] === 'contacts') || (p[p.length - 1] === 'shares')) {
        return (M.d[p[p.length - 3]] || {}).r;
    }
    else {
        return 2;
    }
}

function isCircular(fromid, toid)
{
    var n = M.d[fromid];
    if (n && n.t && toid != fromid)
    {
        var p1 = M.getPath(fromid);
        var p2 = M.getPath(toid);
        p1.reverse();
        p2.reverse();
        var c = 1;
        for (var i in p1) {
            if (p1[i] !== p2[i]) {
                c = 0;
                break;
            }
        }
        return !!c;
    }
    return false;
}

function RootbyId(id)
{
    if (id)
        id = id.replace('chat/', '');
    var p = M.getPath(id);
    return p[p.length - 1];
}

function ddtype(ids, toid, alt)
{
    if (folderlink)
        return false;

    var r = false, toid_r = RootbyId(toid);
    for (var i in ids)
    {
        var fromid = ids[i], fromid_r;

        if (fromid == toid || !M.d[fromid]) return false;
        fromid_r = RootbyId(fromid);

        // never allow move to own inbox, or to own contacts
        if (toid == M.InboxID || toid == 'contacts')
            return false;

        // to a contact, always allow a copy
        if (toid_r == 'contacts' && M.d[toid].p == 'contacts')
            r = 'copy';

        // to a shared folder, only with write rights
        if ((toid_r == 'contacts' || toid_r == 'shares') && RightsbyID(toid) > 0)
        {
            if (isCircular(fromid, toid))
                return false;
            else
                r = 'copy';
        }
        // cannot move or copy to the existing parent
        if (toid == M.d[fromid].p)
            return false;

        // from own cloud to own cloud / trashbin, always move
        if ((toid == M.RootID || toid == M.RubbishID || M.d[toid].t) && (fromid_r == M.RootID) && (toid_r == M.RootID || toid == M.RubbishID))
        {
            if (isCircular(fromid, toid))
                return false;
            else
                r = 'move';
        }
        // from trashbin or inbox to own cloud, always move
        if ((fromid_r == M.RubbishID || fromid_r == M.InboxID) && toid_r == M.RootID)
            r = 'move';

        // from inbox to trashbin, always move
        if (fromid_r == M.InboxID && toid_r == M.RubbishID)
            r = 'move';

        // from trashbin or inbox to a shared folder with write permission, always copy
        if ((fromid_r == M.RubbishID || fromid_r == M.InboxID) && (toid_r == 'contacts' || toid_r == 'shares') && RightsbyID(toid) > 0)
            r = 'copy';

        // copy from a share to cloud
        if ((fromid_r == 'contacts' || fromid_r == 'shares') && (toid == M.RootID || toid_r == M.RootID))
            r = 'copy';

        // move from a share to trashbin only with full control rights (do a copy + del for proper handling)
        if ((fromid_r == 'contacts' || fromid_r == 'shares') && toid == M.RubbishID && RightsbyID(fromid) > 1)
            r = 'copydel';
    }
    return r;
}

/**
 * fm_getnodes
 *
 * Search for a subfolders.
 * @param {String} nodeId.
 * @param {Boolean} ignore Ignore .
 * @returns {Array|fm_getnodes.nodes} Array of subfolders ids. Root folder included.
 */
function fm_getnodes(nodeId, ignore)
{
    var nodes = [];

    function procnode(nodeId) {
        if (M.c[nodeId]) {
            for (var n in M.c[nodeId]) {
                if (M.c[nodeId].hasOwnProperty(n)) {
                    if (!M.d[n]) {
                        if (d) {
                            console.warn('Invalid node: ' + n, nodeId, M.c[nodeId][n]);
                        }
                        continue;
                    }
                    nodes.push(n);
                    if (M.d[n].t === 1) {
                        procnode(n);
                    }
                }
            }
        }
    }
    procnode(nodeId);

    return nodes;
}

function fm_getsharenodes(h, root)
{
    var sn = [];
    var n = M.d[h];
    while (n && n.p)
    {
        if (typeof n.shares !== 'undefined' || u_sharekeys[n.h])
            sn.push(n.h);
        n = M.d[n.p];
    }
    if (root)
        root.handle = n && n.h;
    return sn;
}

function fm_getcopynodes(cn, t)
{
    var a=[];
    var r=[];
    var c=11 == (t || "").length;
    for (var i in cn)
    {
        var s = fm_getnodes(cn[i]);
        for (var j in s) r.push(s[j]);
        r.push(cn[i]);
    }
    for (var i in r)
    {
        var n = M.d[r[i]];
        if (n)
        {
            var ar;
            if (!n.key) {
                console.error('fm_getcopynodes: missing node key', n);
                continue;
            }
            if (!n.ar) {
                console.warn('Something went wrong, missing node attr - trying to fix in the run...');
                crypto_processkey(u_handle, u_k_aes, n);
            }
            if (n.ar) {
                ar = clone(n.ar);
            }
            else {
                var cnt = 0;
                ar = {};
                if (n.name) {
                    ar.n = n.name;
                    cnt++;
                }
                if (n.mtime) {
                    ar.t = n.mtime;
                    cnt++;
                }
                if (n.hash) {
                    ar.c = n.hash;
                    cnt++;
                }
                else if (n.t) {
                    cnt++;
                }
                if (cnt !== 3) {
                    console.error('Missing node attr property...', ar, n);
                }
                else {
                    console.log('Missing node attr restored manually...');
                }
            }
            if (typeof ar.fav !== 'undefined') delete ar.fav;
            var mkat = enc_attr(ar,n.key);
            var attr = ab_to_base64(mkat[0]);
            var key = c ? base64urlencode(encryptto(t,a32_to_str(mkat[1])))
                        : a32_to_base64(encrypt_key(u_k_aes,mkat[1]));
            var nn = {h:n.h,t:n.t,a:attr,k:key};
            var p=n.p;
            for (var j in cn)
            {
                if (cn[j] == nn.h)
                {
                    p=false;
                    break;
                }
            }
            if (p) nn.p=p;
            a.push(nn);
        }
    }
    return a;
}

/**
 * Create new folder on the cloud
 * @param {String} toid The handle where the folder will be created.
 * @param {String|Array} name Either a string with the folder name to create, or an array of them.
 * @param {Object|MegaPromise} ulparams Either an old-fashion object with a `callback` function or a MegaPromise.
 * @return {Object} The `ulparams`, whatever it is.
 */
function createFolder(toid, name, ulparams) {

    // This will be called when the folder creation succeed, pointing
    // the caller with the handle of the deeper created folder.
    var resolve = function(folderHandle) {
        if (ulparams) {
            if (ulparams instanceof MegaPromise) {
                ulparams.resolve(folderHandle);
            }
            else {
                ulparams.callback(ulparams, folderHandle);
            }
        }
        return ulparams;
    };

    // This will be called when the operation failed.
    var reject = function(error) {
        if (ulparams instanceof MegaPromise) {
            ulparams.reject(error);
        }
        else {
            msgDialog('warninga', l[135], l[47], api_strerror(error));
        }
    };

    toid = toid || M.RootID;

    if (Array.isArray(name)) {
        name = name.map(String.trim).filter(String).slice(0);

        if (!name.length) {
            name = undefined;
        }
        else {
            // Iterate through the array of folder names, creating one at a time
            var next = function(target, folderName) {
                createFolder(target, folderName, new MegaPromise())
                    .done(function(folderHandle) {
                        if (!name.length) {
                            resolve(folderHandle);
                        }
                        else {
                            next(folderHandle, name.shift());
                        }
                    })
                    .fail(function(error) {
                        reject(error);
                    });
            };
            next(toid, name.shift());
            return ulparams;
        }
    }

    if (!name) {
        return resolve(toid);
    }

    if (M.c[toid]) {
        // Check if a folder with the same name already exists.
        for (var handle in M.c[toid]) {
            if (M.d[handle] && M.d[handle].t && M.d[handle].name === name) {
                return resolve(M.d[handle].h);
            }
        }
    }

    var mkat = enc_attr({n: name}, []),
        attr = ab_to_base64(mkat[0]),
        key = a32_to_base64(encrypt_key(u_k_aes, mkat[1])),
        req = {a: 'p', t: toid, n: [{h: 'xxxxxxxx', t: 1, a: attr, k: key}], i: requesti},
        sn = fm_getsharenodes(toid);

    if (sn.length) {
        req.cr = crypto_makecr([mkat[1]], sn, false);
        req.cr[1][0] = 'xxxxxxxx';
    }
    if (!ulparams) {
        loadingDialog.show();
    }

    api_req(req, {
        ulparams: ulparams,
        callback: function(res, ctx) {

            if (typeof res !== 'number') {
                $('.fm-new-folder').removeClass('active');
                $('.create-new-folder').addClass('hidden');
                $('.create-folder-input-bl input').val('');
                newnodes = [];
                M.addNode(res.f[0]);
                renderNew();
                refreshDialogContent();
                loadingDialog.hide();

                resolve(res.f[0].h);
            }
            else {
                loadingDialog.hide();
                reject(res);
            }
        }
    });

    return ulparams;
}

function getuid(email) {
    var result = false;

    M.u.forEach(function(v, k) {
        if (v.m == email) {
            result = k;
            return false; // break;
        }
    });

    return result;
};

/**
 * Gets the user handle of a contact if they already exist in M.u
 * @param {String} emailAddress The email address to get the user handle for
 * @returns {String|false} Returns either the user handle or false if it doesn't exist
 */
function getUserHandleFromEmail(emailAddress) {
    var foundHandle = false;

    // Search known users for matching email address then get the handle of that contact
    M.u.forEach(function(c, userHandle) {
        if (
            M.u[userHandle] &&
            M.u[userHandle].c &&
            (M.u[userHandle].c !== 0) &&
            (M.u[userHandle].m === emailAddress)
        ) {

            foundHandle = userHandle;
        }
    });

    return foundHandle;
}

/**
 * Share a node with other users.
 *
 * Recreate target/users list and call appropriate api_setshare function.
 * @param {String} nodeId
 *     Selected node id
 * @param {Array} targets
 *     List of JSON_Object containing user email or user handle and access permission,
 *     i.e. `{ u: <user_email>, r: <access_permission> }`.
 * @param {Boolean} dontShowShareDialog
 *     If set to `true`, don't show the share dialogue.
 * @returns {doShare.$promise|MegaPromise}
 */
function doShare(nodeId, targets, dontShowShareDialog) {

    var masterPromise = new MegaPromise();
    var logger = MegaLogger.getLogger('doShare');

    /** Settle function for API set share command. */
    var _shareDone = function(result, users) {

        // Loose comparison is important (incoming JSON).
        if (result.r && result.r[0] == '0') {
            for (var i in result.u) {
                if (result.u.hasOwnProperty(i)) {
                    M.addUser(result.u[i]);
                }
            }

            for (var k in result.r) {
                if (result.r.hasOwnProperty(k)) {
                    if ((result.r[k] === 0) && users && users[k] && users[k].u) {
                        var rights = users[k].r;
                        var user = users[k].u;

                        if (user.indexOf('@') >= 0) {
                            user = getuid(users[k].u);
                        }

                        // A pending share may not have a corresponding user and should not be added
                        // A pending share can also be identified by a user who is only a '0' contact
                        // level (passive)
                        if (M.u[user] && M.u[user].c !== 0) {
                            M.nodeShare(nodeId, {
                                h: nodeId,
                                r: rights,
                                u: user,
                                ts: unixtime()
                            });
                            setLastInteractionWith(user, "0:" + unixtime());
                        }
                        else {
                            logger.debug('invalid user:', user, M.u[user], users[k]);
                        }
                    }
                }
            }
            if (dontShowShareDialog !== true) {
                $('.fm-dialog.share-dialog').removeClass('hidden');
            }
            loadingDialog.hide();
            M.renderShare(nodeId);

            if (dontShowShareDialog !== true) {
                shareDialog();
            }
            masterPromise.resolve();
        }
        else {
            $('.fm-dialog.share-dialog').removeClass('hidden');
            loadingDialog.hide();
            masterPromise.reject(result);
        }
    };

    // Get complete children directory structure for root node with id === nodeId
    var childNodesId = fm_getnodes(nodeId);
    childNodesId.push(nodeId);

    // Create new lists of users, active (with user handle) and non existing (pending)
    targets.forEach(function(value) {

        var email = value.u;
        var accessRights = value.r;

        // Search by email only don't use handle cause user can re-register account
        crypt.getPubKeyAttribute(email, 'RSA', {
            targetEmail: email,
            shareAccessRightsLevel: accessRights
        })
            .always(function (pubKey, result) {

                var sharePromise = new MegaPromise();

                // parse [api-result, user-data-ctx]
                var ctx = result[1];
                result = result[0];

                if (result.pubk) {
                    var userHandle = result.u;

                    // 'u' is returned user handle, 'r' is access right
                    var usersWithHandle = [];

                    if (M.u[userHandle] && M.u[userHandle].c !== 0) {
                        usersWithHandle.push({ 'r': ctx.shareAccessRightsLevel, 'u': userHandle });
                    }
                    else {
                        usersWithHandle.push({
                            'r': ctx.shareAccessRightsLevel,
                            'u': userHandle,
                            'k': result.pubk,
                            'm': ctx.targetEmail
                        });
                    }

                    sharePromise = api_setshare(nodeId, usersWithHandle, childNodesId);
                    sharePromise.done(function _sharePromiseWithHandleDone(result) {
                        _shareDone(result, usersWithHandle);
                    });
                    masterPromise.linkFailTo(sharePromise);
                }
                else {
                    // NOT ok, user doesn't have account yet
                    var usersWithoutHandle = [];
                    usersWithoutHandle.push({ 'r': ctx.shareAccessRightsLevel, 'u': ctx.targetEmail });
                    sharePromise = api_setshare1({
                        node: nodeId,
                        targets: usersWithoutHandle,
                        sharenodes: childNodesId
                    });
                    sharePromise.done(function _sharePromiseWithoutHandleDone(result) {
                        _shareDone(result, ctx.targetEmail);
                    });
                    masterPromise.linkFailTo(sharePromise);
                }
            });
    });

    return masterPromise;
}

function processmove(jsonmove)
{
    var rts = [M.RootID,M.RubbishID,M.InboxID];

    if (d) console.log('processmove', jsonmove);

    for (var i in jsonmove)
    {
        var root = {}, sharingnodes = fm_getsharenodes(jsonmove[i].t, root), movingnodes = 0;

        if (d) console.log('sharingnodes', sharingnodes.length, sharingnodes, root.handle);

        if (sharingnodes.length)
        {
            movingnodes = fm_getnodes(jsonmove[i].n);
            movingnodes.push(jsonmove[i].n);
            jsonmove[i].cr = crypto_makecr(movingnodes,sharingnodes,true);
        }
        if (root.handle && rts.indexOf(root.handle) >= 0) api_updfkey(movingnodes || jsonmove[i].n);

        api_req(jsonmove[i]);
    }
}

var u_kdnodecache = {};
var kdWorker;

function process_f(f, cb, retry)
{
    var onMainThread = localStorage.dk ? 9e11 : 200;
    var doNewNodes = (typeof newnodes !== 'undefined');

    // if (d) console.error('process_f', doNewNodes);

    if (f && f.length)
    {
        var ncn = f, skn = [];
        // if ($.len(u_kdnodecache)) {
            // ncn = [];
            // for (var i in f) {
                // var n1 = f[i], n2 = u_kdnodecache[n1.h];
                // if (!n1.c && (!n2 || !$.len(n2))) ncn.push(n1);
            // }
            // if (d) console.log('non-cached nodes', ncn.length, ncn);
        // }
        if (!retry && ncn.length > onMainThread) {
            for (var i in f) {
                if (f[i].sk) skn.push(f[i]);
            }
            if (skn.length) {
                ncn = skn;
                if (d) console.log('processing share-keys first', ncn.length, ncn);
            }
        }

        if ( ncn.length < onMainThread )
        {
            if (d) {
                console.log('Processing %d-%d nodes in the main thread.', ncn.length, f.length);
                console.time('process_f');
            }
            __process_f1(ncn);
            if (skn.length) {
                process_f(f, cb, 1);
            }
            else {
                if (cb) {
                    cb(newmissingkeys && M.checkNewMissingKeys());
                }
            }
            if (d) console.timeEnd('process_f');
        }
        else
        {
            if (!kdWorker) {
                var nWorkers = mega.maxWorkers;

                while (nWorkers && (ncn.length / nWorkers) < 800) {
                    nWorkers >>= 1;
                }
                nWorkers = Math.max(nWorkers, 2);

                try {
                    kdWorker = mSpawnWorker('keydec.js', nWorkers);
                }
                catch (e) {
                    if (d) {
                        console.error('mSpawnWorker', e);
                    }
                    return __process_f2(f, cb);
                }

                if (d) {
                    console.debug('Using %d workers to decrypt %d nodes.', nWorkers, ncn.length);
                }
            }

            kdWorker.process(ncn.sort(function() { return Math.random() - 0.5}), function kdwLoad(r,j) {
                if (d) console.log('KeyDecWorker processed %d/%d-%d nodes', $.len(r), ncn.length, f.length, r);
                // $.extend(u_kdnodecache, r);
                u_kdnodecache = r;
                if (doNewNodes) {
                    newnodes = newnodes || [];
                }
                if (j.newmissingkeys || ncn === skn) {
                    if (d && j.newmissingkeys) console.log('Got missing keys, retrying?', !retry);
                    if (!retry) {
                        return process_f( f, cb, 1);
                    }
                }
                // __process_f2(f, cb && cb.bind(this, !!j.newmissingkeys));
                __process_f1(f);
                if (cb) {
                    cb(j.newmissingkeys);
                }
            }, function kdwError(err) {
                if (d) console.error(err);
                if (doNewNodes) {
                    newnodes = newnodes || [];
                }
                __process_f2(f, cb);
            });
        }
    }
    else if (cb) cb();
}
function __process_f1(f)
{
    for (var i in f) M.addNode(f[i], !!$.mDBIgnoreDB);
}
function __process_f2(f, cb, tick)
{
    var max = 12000, n;

    while ((n = f.pop()))
    {
        M.addNode(n, !!$.mDBIgnoreDB);

        if (cb && --max == 0) break;
    }

    if (cb)
    {
        if (max) cb();
        else {
            var doNewNodes = (typeof newnodes !== 'undefined');
            if (!+tick || tick > 1e3) {
                tick = 200;
            }
            setTimeout(function pf2n() {
                if (doNewNodes) {
                    newnodes = newnodes || [];
                }
                __process_f2(f, cb, tick);
            }, tick *= 1.2);
        }
    }
}

/**
 * Handle incoming pending contacts
 *
 * @param {array.<JSON_objects>} pending contacts
 *
 */
function processIPC(ipc, ignoreDB) {

    DEBUG('processIPC');

    for (var i in ipc) {
        if (ipc.hasOwnProperty(i)) {

            // Update ipc status
            M.addIPC(ipc[i], ignoreDB);

            // Deletion of incomming pending contact request, user who sent request, canceled it
            if (ipc[i].dts) {
                M.delIPC(ipc[i].p);
                $('#ipc_' + ipc[i].p).remove();
                delete M.ipc[ipc[i].p];
                if ((Object.keys(M.ipc).length === 0) && (M.currentdirid === 'ipc')) {
                    $('.contact-requests-grid').addClass('hidden');
                    $('.fm-empty-contacts .fm-empty-cloud-txt').text(l[6196]);
                    $('.fm-empty-contacts').removeClass('hidden');
                }

                // Update token.input plugin
                removeFromMultiInputDDL('.share-multiple-input', { id: ipc[i].m, name: ipc[i].m });
            }
            else {

                var contactName = M.getNameByHandle(ipc[i].p);

                // Update token.input plugin
                addToMultiInputDropDownList('.share-multiple-input', [{ id: ipc[i].m, name: contactName }]);
                // Don't prevent contact creation when there's already IPC available
                // When user add contact who already sent IPC, server will automatically create full contact
            }
        }
    }
}

/**
 * Handle outgoing pending contacts
 *
 * @param {array.<JSON_objects>} pending contacts
 */
function processOPC(opc, ignoreDB) {

    DEBUG('processOPC');

    for (var i in opc) {
        M.addOPC(opc[i], ignoreDB);
        if (opc[i].dts) {
            M.delOPC(opc[i].p);

            // Update tokenInput plugin
            removeFromMultiInputDDL('.share-multiple-input', { id: opc[i].m, name: opc[i].m });
            removeFromMultiInputDDL('.add-contact-multiple-input', { id: opc[i].m, name: opc[i].m });
        }
        else {
            // Search through M.opc to find duplicated e-mail with .dts
            // If found remove deleted opc
            // And update sent-request grid
            for (var k in M.opc) {
                if (M.opc[k].dts && (M.opc[k].m === opc[i].m)) {
                    $('#opc_' + k).remove();
                    delete M.opc[k];
                    if ((Object.keys(M.opc).length === 0) && (M.currentdirid === 'opc')) {
                        $('.sent-requests-grid').addClass('hidden');
                        $('.fm-empty-contacts .fm-empty-cloud-txt').text(l[6196]);
                        $('.fm-empty-contacts').removeClass('hidden');
                    }
                    break;
                }
            }

            var contactName = M.getNameByHandle(opc[i].p);

            // Update tokenInput plugin
            addToMultiInputDropDownList('.share-multiple-input', [{ id: opc[i].m, name: contactName }]);
            addToMultiInputDropDownList('.add-contact-multiple-input', [{ id: opc[i].m, name: contactName }]);
        }
    }
}

/**
 * processPH
 *
 * Process export link (public handle) action packet and 'f' tree response.
 * @param {Object} publicHandles The Public Handles action packet i.e. a: 'ph'.
 */
function processPH(publicHandles) {

    var nodeId;
    var publicHandleId;
    var timeNow = unixtime();
    var UiExportLink = fminitialized && new mega.UI.Share.ExportLink();

    for (var value in publicHandles) {
        if (publicHandles.hasOwnProperty(value)) {
            value = publicHandles[value];
            nodeId = value.h;
            publicHandleId = value.ph;

            // Remove export link, down: 1
            if (value.d) {
                M.delNodeShare(nodeId, 'EXP');

                if (UiExportLink) {
                    UiExportLink.removeExportLinkIcon(nodeId);
                }
            }
            else {
                var share = clone(value);
                delete share.a;
                delete share.i;
                delete share.n;
                share.ts = timeNow;
                share.u = 'EXP';
                share.r = 0;

                if (Object(M.d[nodeId]).ph !== publicHandleId) {
                    M.nodeAttr({ h: nodeId, ph: publicHandleId });
                }
                M.nodeShare(share.h, share);

                if (UiExportLink) {
                    UiExportLink.addExportLinkIcon(nodeId);
                }
            }

            if (UiExportLink && (value.down !== undefined)) {
                UiExportLink.updateTakenDownItem(nodeId, value.down);
            }
        }
    }
}

/**
 * Handle pending shares
 *
 * @param {array.<JSON_objects>} pending shares
 */
function processPS(pendingShares, ignoreDB) {

    DEBUG('processPS');
    var ps;
    var nodeHandle = '';
    var pendingContactId = '';
    var shareRights = 0;
    var timeStamp = 0;
    var contactName = '';


    for (var i in pendingShares) {
        if (pendingShares.hasOwnProperty(i)) {
            ps = pendingShares[i];

            // From gettree
            if (ps.h) {
                M.addPS(ps, ignoreDB);
            }

            // Situation different from gettree, s2 from API response, doesn't have .h attr instead have .n
            else {
                nodeHandle = ps.n;
                pendingContactId = ps.p;
                shareRights = ps.r;
                timeStamp = ps.ts;
                contactName = M.getNameByHandle(pendingContactId);

                // shareRights is undefined when user denies pending contact request
                // .op is available when user accepts pending contact request and
                // remaining pending share should be updated to full share
                if ((typeof shareRights === 'undefined') || ps.op) {

                    M.delPS(pendingContactId, nodeHandle);

                    if (ps.op) {
                        M.nodeShare(nodeHandle, ps);
                    }

                    if (M.opc && M.opc[ps.p]) {

                        // Update tokenInput plugin
                        addToMultiInputDropDownList('.share-multiple-input', [{
                                id: M.opc[pendingContactId].m,
                                name: contactName
                            }]);
                        addToMultiInputDropDownList('.add-contact-multiple-input', {
                            id: M.opc[pendingContactId].m,
                            name: contactName
                        });
                    }
                }
                else {

                    // Add the pending share to state
                    M.addPS({
                        'h':nodeHandle,
                        'p':pendingContactId,
                        'r':shareRights,
                        'ts':timeStamp
                    }, ignoreDB);
                }

                if (fminitialized) {
                    sharedUInode(nodeHandle);
                }
            }
        }
    }
}

/**
 * Handle upca response, upci, pending contact request updated (for whom it's incomming)
 *
 * @param {array.<JSON_objects>} ap (actionpackets)
 *
 */
function processUPCI(ap) {
    DEBUG('processUPCI');
    for (var i in ap) {
        if (ap[i].s) {
            delete M.ipc[ap[i].p];
            M.delIPC(ap[i].p);// Remove from localStorage
            $('#ipc_' + ap[i].p).remove();
            if ((Object.keys(M.ipc).length === 0) && (M.currentdirid === 'ipc')) {
                $('.contact-requests-grid').addClass('hidden');
                $('.fm-empty-contacts .fm-empty-cloud-txt').text(l[6196]);
                $('.fm-empty-contacts').removeClass('hidden');
            }
        }
    }
}

/**
 * processUPCO
 *
 * Handle upco response, upco, pending contact request updated (for whom it's outgoing).
 * @param {Array} ap (actionpackets) <JSON_objects>.
 */
function processUPCO(ap) {

    DEBUG('processUPCO');

    var psid = '';// pending id

    // Loop through action packets
    for (var i in ap) {
        if (ap.hasOwnProperty(i)) {

            // Have status of pending share
            if (ap[i].s) {

                psid = ap[i].p;
                delete M.opc[psid];
                delete M.ipc[psid];
                M.delOPC(psid);
                M.delIPC(psid);

                // Delete all matching pending shares
                for (var k in M.ps) {
                    if (M.ps.hasOwnProperty(k)) {
                        M.delPS(psid, k);
                    }
                }

                // Update tokenInput plugin
                removeFromMultiInputDDL('.share-multiple-input', { id: ap[i].m, name: ap[i].m });
                removeFromMultiInputDDL('.add-contact-multiple-input', { id: ap[i].m, name: ap[i].m });
                $('#opc_' + psid).remove();

                // Update sent contact request tab, set empty message with Add contact... button
                if ((Object.keys(M.opc).length === 0) && (M.currentdirid === 'opc')) {
                    $('.sent-requests-grid').addClass('hidden');
                    $('.fm-empty-contacts .fm-empty-cloud-txt').text(l[6196]); // No requests pending at this time
                    $('.fm-empty-contacts').removeClass('hidden');
                }
            }
        }
    }
}

/*
 * process_u
 *
 * Updates contact/s data in global variable M.u, local dB and
 * taking care of items in share and add contacts dialogs dropdown
 *
 * .c param is contact level i.e. [0-(inactive/deleted), 1-(active), 2-(owner)]
 *
 * @param {Object} u Users informations
 */
function process_u(u) {
    for (var i in u) {
        if (u.hasOwnProperty(i)) {
            if (u[i].c === 1) {
                u[i].h = u[i].u;
                u[i].t = 1;
                u[i].p = 'contacts';
                M.addNode(u[i]);

                var contactName = M.getNameByHandle(u[i].h);

                // Update token.input plugin
                addToMultiInputDropDownList('.share-multiple-input', [{ id: u[i].m, name: contactName }]);
                addToMultiInputDropDownList('.add-contact-multiple-input', [{ id: u[i].m, name: contactName }]);
            }
            else if (M.d[u[i].u]) {
                M.delNode(u[i].u);

                // Update token.input plugin
                removeFromMultiInputDDL('.share-multiple-input', { id: u[i].m, name: u[i].m });
                removeFromMultiInputDDL('.add-contact-multiple-input', { id: u[i].m, name: u[i].m });
            }

            // Update user attributes M.u
            M.addUser(u[i]);

            if (u[i].c === 1) {
                // sync data objs M.u <-> M.d
                M.d[u[i].u] = M.u[u[i].u];
            }
        }
    }
}

function process_ok(ok, ignoreDB)
{
    for (var i in ok)
    {
        if (typeof mDB === 'object' && !pfkey && !ignoreDB)
            mDBadd('ok', ok[i]);
        if (ok[i].ha == crypto_handleauth(ok[i].h))
            u_sharekeys[ok[i].h] = decrypt_key(u_k_aes, base64_to_a32(ok[i].k));
    }
}

function processMCF(mcfResponse, ignoreDB) {
    if (megaChatIsDisabled) {
        console.error('chat is disabled!');
        return;
    }

    if (mcfResponse === EEXPIRED) {
        ChatdIntegration.requiresUpdate = true;
        return;
    }
    else {
        ChatdIntegration.requiresUpdate = true;
    }

    // reopen chats from the MCF response.
    if (typeof mcfResponse !== 'undefined' && typeof mcfResponse.length !== 'undefined' && mcfResponse.forEach) {
        mcfResponse.forEach(function (chatRoomInfo) {
            if (chatRoomInfo.active === 0) {
                // skip non active chats for now...
                return;
            }
            if (typeof mSDB === 'object' && !pfkey && !ignoreDB) {
                mSDB.add('mcf', clone(chatRoomInfo));
            }

            ChatdIntegration._queuedChats[chatRoomInfo.id] = chatRoomInfo;
        });
        ChatdIntegration.deviceId = mcfResponse.d;

        ChatdIntegration.mcfHasFinishedPromise.resolve(mcfResponse);
    }
    else {
        ChatdIntegration.mcfHasFinishedPromise.reject(mcfResponse);
    }
}

function folderreqerr(c, e)
{
    loadingDialog.hide();
    msgDialog('warninga', l[1043], l[1044] + '<ul><li>' + l[1045] + '</li><li>' + l[247] + '</li><li>' + l[1046] + '</li>', false, function()
    {
        folderlink = pfid;
        document.location.hash = '';
    });
}

function init_chat() {
    function __init_chat() {
        if (u_type && !megaChatIsReady) {
            if (d) console.log('Initializing the chat...');

            // XXX: Prevent known Strophe exceptions...
            ['_onIdle', '_connect'].forEach(function(fn) {
                var proto = Strophe.Websocket.prototype;
                var unsafeFn = '_unsafe' + fn;

                if (!proto[unsafeFn]) {
                    proto[unsafeFn] = proto[fn];
                    proto[fn] = function() {
                        try {
                            this[unsafeFn].apply(this, arguments);
                        }
                        catch (ex) {
                            console.error('Caught Strophe exception.', ex);
                        }
                    };
                }
                proto = undefined;
            });

            var _chat = new Chat();

            // `megaChatIsDisabled` might be set if `new Karere()` failed (Ie, in older browsers)
            if (!window.megaChatIsDisabled) {
                window.megaChat = _chat;
                megaChat.init();

                if (fminitialized) {
                    if (String(M.currentdirid).substr(0, 5) === 'chat/') {
                        chatui(M.currentdirid);
                    }
                    //megaChat.renderContactTree();
                    megaChat.renderMyStatus();
                }
            }
        }
    }
    if (folderlink) {
        if (d) console.log('Will not initializing chat [branch:1]');
    }
    else if (!megaChatIsDisabled) {
        if (pubEd25519[u_handle]) {
            Soon(__init_chat);
        }
        else {
            mBroadcaster.once('pubEd25519', __init_chat);
            if (d) console.log('Will not initializing chat [branch:2]');
        }
    }
    else {
        if (d) console.log('Will not initializing chat [branch:3]');
    }
}

function loadfm_callback(res, ctx) {

    loadingInitDialog.step3();

    mega.loadReport.recvNodes     = Date.now() - mega.loadReport.stepTimeStamp;
    mega.loadReport.stepTimeStamp = Date.now();

    if (pfkey) {
        if (res.f && res.f[0]) {
            M.RootID = res.f[0].h;
            u_sharekeys[res.f[0].h] = base64_to_a32(pfkey);
        }
        folderlink = pfid;
    }

    if (typeof res === 'number') {
        msgDialog('warninga', l[1311], "Sorry, we were unable to retrieve the Cloud Drive contents.", api_strerror(res));
        return;
    }

    if (res.noc) {
        mega.loadReport.noc = res.noc;
    }
    if (res.tct) {
        mega.loadReport.tct = res.tct;
    }

    if (res.u) {
        process_u(res.u);
    }
    if (res.ok) {
        process_ok(res.ok);
    }
    if (res.opc) {
        processOPC(res.opc);
    }
    if (res.ipc) {
        processIPC(res.ipc);
    }
    if (res.ps) {
        processPS(res.ps);
    }
    if (res.mcf && !megaChatIsDisabled) {
        processMCF(res.mcf.c ? res.mcf.c : res.mcf);
    }

    process_f(res.f, function onLoadFMDone(hasMissingKeys) {

        // Check if the key for a folderlink was correct
        if (folderlink && missingkeys[M.RootID]) {
            loadingDialog.hide();
            loadingInitDialog.hide();

            loadfm.loaded = false;
            loadfm.loading = false;

            return mKeyDialog(pfid, true, true)
                .fail(function() {
                    location.hash = 'start';
                });
        }

        // If we have shares, and if a share is for this node, record it on the nodes share list
        if (res.s) {
            for (var i in res.s) {
                if (res.s.hasOwnProperty(i)) {

                    var nodeHandle = res.s[i].h;
                    M.nodeShare(nodeHandle, res.s[i]);
                }
            }
        }

        // Handle public/export links. Why here? Make sure that M.d already exist
        if (res.ph) {
            processPH(res.ph);
        }

        maxaction = res.sn;
        if (typeof mDB === 'object') {
            localStorage[u_handle + '_maxaction'] = maxaction;
        }

        if (res.cr) {
            crypto_procmcr(res.cr);
        }
        if (res.sr) {
            crypto_procsr(res.sr);
        }

        mega.loadReport.procNodeCount = Object.keys(M.d || {}).length;
        mega.loadReport.procNodes     = Date.now() - mega.loadReport.stepTimeStamp;
        mega.loadReport.stepTimeStamp = Date.now();

        // Retrieve initial batch of action-packets, if any
        // we'll then complete the process using loadfm_done
        getsc();

        if (hasMissingKeys) {
            srvlog('Got missing keys processing gettree...', null, true);
        }
    });
}

/**
 * Function to be invoked when the cloud has finished loaded,
 * being the nodes loaded from either server or local cache.
 * @param {Boolean} mDBload whether it came from local cache.
 */
function loadfm_done(mDBload) {
    loadfm.loaded = Date.now();
    loadfm.loading = false;

    if (d > 1) console.error('loadfm_done', mDBload, is_fm());

    mega.loadReport.procAPs       = Date.now() - mega.loadReport.stepTimeStamp;
    mega.loadReport.stepTimeStamp = Date.now();

    mega.config.ready(function() {
        init_chat();

        mega.loadReport.fmConfigFetch = Date.now() - mega.loadReport.stepTimeStamp;
        mega.loadReport.stepTimeStamp = Date.now();

        // are we actually on an #fm/* page?
        if (page !== 'start' && is_fm() || $('.fm-main.default').is(":visible")) {
            renderfm();

            mega.loadReport.renderfm      = Date.now() - mega.loadReport.stepTimeStamp;
            mega.loadReport.stepTimeStamp = Date.now();
        }
        else {
            mega.loadReport.renderfm = -1;
        }

        if (!CMS.isLoading()) {
            loadingDialog.hide();
            loadingInitDialog.hide();
        }

        // -0x800e0fff indicates a call to loadfm() when it was already loaded
        if (mDBload !== -0x800e0fff) {
            Soon(function _initialNotify() {
                // After the first SC request all subsequent requests can generate notifications
                notify.initialLoadComplete = true;

                // If this was called from the initial fm load via gettree or db load, we should request the
                // latest notifications. These must be done after the first getSC call.
                if (!folderlink) {
                    notify.getInitialNotifications();
                }
            });

            if (mBroadcaster.crossTab.master && !mega.loadReport.sent) {
                mega.loadReport.sent = true;

                var r = mega.loadReport;
                r.totalTimeSpent = Date.now() - mega.loadReport.startTime;
                r = [
                    r.mode, // 1: DB, 2: API
                    r.recvNodes, r.procNodes, r.procAPs,
                    r.fmConfigFetch, r.renderfm,
                    r.dbToNet | 0, // see mDB.js comment
                    r.totalTimeSpent,
                    Object.keys(M.d || {}).length, // total account nodes
                    r.procNodeCount, // nodes before APs processing
                    buildVersion.timestamp || -1, // -- VERSION TAG --
                    navigator.hardwareConcurrency | 0, // cpu cores
                    folderlink ? 1 : 0,
                    pageLoadTime, // secureboot's resources load time
                    r.ttfb | 0, // time-to-first-byte (for gettree)
                    r.noc | 0, // tree not cached
                    r.tct | 0, // tree compute time
                    r.recvAPs, // time waiting to receive APs
                    r.EAGAINs, // -3/-4s while loading
                    r.e500s, // http err 500 while loading
                    r.errs // any other errors while loading
                ];

                if (d) {
                    console.debug('loadReport', r);
                }
                api_req({a: 'log', e: 99625, m: JSON.stringify(r)});
            }
        }
        clearInterval(mega.loadReport.aliveTimer);
        mega.flags &= ~window.MEGAFLAG_LOADINGCLOUD;

        u_kdnodecache = {};
        watchdog.notify('loadfm_done', mDBload);
    });
}

function fmtreenode(id, e)
{
    if (RootbyId(id) == 'contacts')
        return false;
    var treenodes = {};
    if (typeof fmconfig.treenodes !== 'undefined')
        treenodes = fmconfig.treenodes;
    if (e)
        treenodes[id] = 1;
    else
    {
        $('#treesub_' + id + ' .expanded').each(function(i, e)
        {
            var id2 = $(e).attr('id');
            if (id2)
            {
                id2 = id2.replace('treea_', '');
                $('#treesub_' + id2).removeClass('opened');
                $('#treea_' + id2).removeClass('expanded');
                delete treenodes[id2];
            }
        });
        delete treenodes[id];
    }
    mega.config.set('treenodes', treenodes);

    M.treenodes = JSON.stringify(treenodes);
}

function fmsortmode(id, n, d)
{
    var sortmodes = {};
    if (typeof fmconfig.sortmodes !== 'undefined')
        sortmodes = fmconfig.sortmodes;
    if (n == 'name' && d > 0)
        delete sortmodes[id];
    else
        sortmodes[id] = {n: n, d: d};
    mega.config.set('sortmodes', sortmodes);
}

function fmviewmode(id, e)
{
    var viewmodes = {};
    if (typeof fmconfig.viewmodes !== 'undefined')
        viewmodes = fmconfig.viewmodes;
    if (e)
        viewmodes[id] = 1;
    else
        viewmodes[id] = 0;
    mega.config.set('viewmodes', viewmodes);
}

function fm_requestfolderid(h, name, ulparams)
{
    return createFolder(h, name, ulparams);
}

var isNativeObject = function(obj) {
    var objConstructorText = obj.constructor.toString();
    return objConstructorText.indexOf("[native code]") !== -1 && objConstructorText.indexOf("Object()") === -1;
};

function clone(obj)
{

    if (null == obj || "object" != typeof obj)
        return obj;
    if (obj instanceof Date)
    {
        var copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }
    if (obj instanceof Array)
    {

        var copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }
    if (obj instanceof Object)
    {
        var copy = {};
        for (var attr in obj)
        {
            if (obj.hasOwnProperty(attr)) {
                if (!(obj[attr] instanceof Object)) {
                    copy[attr] = obj[attr];
                }
                else if (obj[attr] instanceof Array) {
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
}

function balance2pro(callback)
{
    api_req({a: 'uq', pro: 1},
    {
        cb: callback,
        callback: function(res, ctx)
        {
            if (typeof res == 'object' && res['balance'] && res['balance'][0])
            {
                var pjson = JSON.parse(pro_json);

                for (var i in pjson[0])
                {
                    if (pjson[0][i][5] == res['balance'][0][0])
                    {
                        api_req({a: 'uts', it: 0, si: pjson[0][i][0], p: pjson[0][i][5], c: pjson[0][i][6]},
                        {
                            cb: ctx.cb,
                            callback: function(res, ctx)
                            {
                                if (typeof res == 'number' && res < 0 && ctx.cb)
                                    ctx.cb(false);
                                else
                                {
                                    api_req({a: 'utc', s: [res], m: 0},
                                    {
                                        cb: ctx.cb,
                                        callback: function(res, ctx)
                                        {
                                            if (ctx.cb)
                                                ctx.cb(true);
                                            u_checklogin({checkloginresult: function(u_ctx, r)
                                                {
                                                    if (M.account)
                                                        M.account.lastupdate = 0;
                                                    u_type = r;
                                                    topmenuUI();
                                                    if (u_attr.p)
                                                        msgDialog('info', l[1047], l[1048]);
                                                }});
                                        }
                                    });
                                }
                            }
                        });
                    }
                }
            }
        }
    });
}
