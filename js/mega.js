var newnodes = [];
var currsn;     // current *network* sn (not to be confused with the IndexedDB/memory state)
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
        var $loadingSpinner = $('.loading-spinner');

        // Folder link load
        if (pfid) {
            $loadingSpinner.find('.step1').text(l[8584]);   // Requesting folder data
            $loadingSpinner.find('.step2').text(l[8585]);   // Receiving folder data
            $loadingSpinner.find('.step3').text(l[8586]);   // Decrypting folder data
        }
        else {
            // Regular account load
            $loadingSpinner.find('.step1').text(l[8577]);   // Requesting account data
            $loadingSpinner.find('.step2').text(l[8578]);   // Receiving account data
            $loadingSpinner.find('.step3').text(l[8579]);   // Decrypting
        }

        // On mobile, due to reduced screen size we just want a simpler single step with the text 'Loading'
        if (is_mobile) {
            $loadingSpinner.find('.step1').text(l[1456]);
        }

        this.hide();
        $('.light-overlay').removeClass('hidden');
        $('body').addClass('loading');
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

            // Don't show step 2 loading if on mobile
            if (!is_mobile) {
                $('.loading-info li.loading').addClass('loaded').removeClass('loading');
                $('.loading-info li.step2').addClass('loading');
            }
            $('.loader-progressbar').addClass('active');

            // Load performance report
            mega.loadReport.ttfb          = Date.now() - mega.loadReport.stepTimeStamp;
            mega.loadReport.stepTimeStamp = Date.now();

            // If the PSA is visible reposition the account loading bar
            if (!is_mobile) {
                psa.repositionAccountLoadingBar();
            }
        }
        if (progress) {
            $('.loader-percents').width(progress + '%');
        }
        this.progress = true;
    };
    loadingInitDialog.step3 = function() {
        if (this.progress) {

            // Don't show step 3 loading if on mobile
            if (!is_mobile) {
                $('.loading-info li.loading').addClass('loaded').removeClass('loading');
                $('.loading-info li.step3').addClass('loading');
            }
            $('.loader-progressbar').removeClass('active').css('bottom', 0);
        }
    };
    loadingInitDialog.hide = function() {
        this.active = false;
        this.progress = false;
        $('.light-overlay').addClass('hidden');
        $('body').removeClass('loading');
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
    this.h               = {};
    this.csortd          = -1;
    this.csort           = 'name';
    this.tfsdomqueue     = {};
    this.scAckQueue = {};

    this.reset = function()
    {
        this.d = {};
        this.v = [];
        this.c = { shares: {} };

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
        var self = this;

        return function(a, b, d) {
            // reusing the getNameByHandle code for converting contact's name/email to renderable string
            var itemA = self.getNameByHandle(a.h);
            var itemB  = self.getNameByHandle(b.h);

            return mega.utils.compareStrings(itemA, itemB, d);
        };
    };

    this.sortByName = function(d) {
        var self = this;

        this.sortfn = function(a, b, d) {
            // reusing the getNameByHandle code for converting contact's name/email to renderable string
            var itemA = self.getNameByHandle(a.h);
            var itemB  = self.getNameByHandle(b.h);
            return mega.utils.compareStrings(itemA, itemB, d);
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
            var usera = Object(M.d[a.su]);
            var userb = Object(M.d[b.su]);

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
            else {
                // if status is the same for both, compare names.
                return mega.utils.compareStrings(
                    M.getNameByHandle(a.h).toLowerCase(),
                    M.getNameByHandle(b.h).toLowerCase(),
                    d
                );
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
        var self = this;

        var sortfn;

        sortfn = mega.utils.sortObjFn(
            function(r) {

                // Since the M.sort is using a COPY of the data,
                // we need an up-to-date .ts value directly from M.u[...]
                return M.u[r.h].ts;
            },
            d,
            function (a, b, d) {
                // fallback to string/name matching in case last interaction is the same
                return mega.utils.compareStrings(
                    self.getNameByHandle(a.h).toLowerCase(),
                    self.getNameByHandle(b.h).toLowerCase(),
                    d
                );
            }
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
            $('.dropdown-item.do-sort').removeClass('selected');
            $('.grid-url-header').prev().find('div')
                .removeClass().addClass('arrow ' + col)
                .text($('.do-sort[data-by="' + col + '"]').text());
            $('.do-sort[data-by="' + col + '"]').addClass('selected');
        }

    };

    this.lastColumn = null;

    this.doSort = function(n, d) {
        $('.grid-table-header .arrow').removeClass('asc desc');

        n = String(n).replace(/\W/g, '');
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
        var i;
        var node;

        if (id === 'shares') {
            this.v = [];
            var inshares = Object.keys(M.c.shares || {});
            for (i = inshares.length; i--;) {
                node = M.d[inshares[i]] || false;

                if (node.su && !this.d[node.p]) {
                    this.v.push(node);
                }
            }
        }
        else if (id === 'contacts') {
            this.v = [];
            var contacts = Object.keys(M.c.contacts || {});
            for (i = contacts.length; i--;) {
                node = M.d[contacts[i]] || false;

                if (node.c === 1) {
                    // Fill M.v with active contacts only
                    this.v.push(node);
                }
            }
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
        if (u_type !== 3) {
            return false;
        }
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
                // FIXME: include root?
                var a = fm_getnodes(h);

                for (var i = a.length; i--; ) {
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
            console.error('onlineStatusEvent', u.u, status);
            var e = $('.ustatus.' + u.u);
            if (e.length > 0) {
                $(e).removeClass('offline online busy away');
                $(e).addClass(this.onlineStatusClass(status)[1]);
            }

            var e = $('.fm-chat-user-status.' + u.u);
            if (e.length > 0) {
                $(e).safeHTML(this.onlineStatusClass(status)[0]);
            }

            if (
                typeof $.sortTreePanel !== 'undefined' &&
                typeof $.sortTreePanel.contacts !== 'undefined' &&
                $.sortTreePanel.contacts.by === 'status'
            ) {
                // we need to resort
                M.contacts();
            }

            if (getSitePath() === "/fm/" + u.u) {
                // re-render the contact view page if the presence had changed
                contactUI();
            }
            if (u && u.u === u_handle) {
                megaChat.renderMyStatus();
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

    (function(self) {
        var maf   = false;
        var saved = 0;

        Object.defineProperty(self, 'maf', {
            get: function() {
                if (Object(M.account).maf && saved !== M.account.maf) {
                    saved = M.account.maf;
                    maf   = mega.achievem.prettify(M.account.maf);
                }
                return maf;
            }
        })
    })(this);

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
                            '<div class="contact-request-button default-white-button grey-txt small right delete"><span>' + l[5858] + '</span></div>' +
                            '<div class="contact-request-button default-white-button grey-txt small right accept"><span>' + l[5856] + '</span></div>' +
                            '<div class="contact-request-button default-white-button grey-txt small right ignore"><span>' + l[5860] + '</span></div>' +
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
                            '<div class="default-white-button grey-txt small ' +
                                'contact-request-button right cancel ' + hideCancel + '">' +
                                    '<span>' + escapeHTML(l[5930]) + '</span>' +
                            '</div>' +
                            '<div class="default-white-button grey-txt small ' +
                                'contact-request-button right reinvite ' + hideReinvite + '">' +
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

        // Disable aUpdate flag if a new item was added to an empty
        // folder, so that MegaRender properly uses JSP container..
        if (aUpdate && M.v.length === 1) {
            aUpdate = false;
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
            if (!$(this).hasClass('active')) {
                contextMenuUI(e, 1);
                $(this).addClass('active');
            }
            else {
                $.hideContextMenu();
                $(this).removeClass('active');
            }
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
            if (!$(this).hasClass('active')) {
                $(this).addClass('active');
                contextMenuUI(e, 1);
            }
            else {
                $(this).removeClass('active');
                $.hideContextMenu();
            }
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
                    if (!$(this).hasClass('active')) {
                        contextMenuUI(e, 1);
                        $(this).addClass('active');
                    }
                    else {
                        $.hideContextMenu();
                        $(this).removeClass('active');
                    }
                });

                $('.shared-details-info-block .fm-share-download').rebind('click', function (e) {
                    prepareShareMenuHandler(e);
                    var $this = $(this);
                    e.clientX = $this.offset().left;
                    e.clientY = $this.offset().top + $this.height()

                    if (!$(this).hasClass('active')) {
                        contextMenuUI(e, 3);
                        $(this).addClass('active');
                    }
                    else {
                        $.hideContextMenu();
                        $(this).removeClass('active');
                    }
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
                    var shareId = getSitePath().replace('/fm/', '');

                    // Remove user from the share
                    leaveShare(shareId);
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
        delay(treeUI);
    };

    this.openFolder = function(id, force, chat) {
        var newHashLocation;

        $('.fm-right-account-block, .fm-right-block.dashboard').addClass('hidden');
        $('.fm-files-view-icon').removeClass('hidden');

        if (d) {
            console.log('openFolder()', M.currentdirid, id, force, loadfm.loaded);
        }

        if (!loadfm.loaded) {
            console.error('Internal error, do not call openFolder before the cloud finished loading.');
            return false;
        }

        if (!folderlink) {
            // open the dashboard by default
            /*id = id || 'dashboard';
                disabled for now
             */
        }

        if (!is_mobile && (id !== 'notifications') && !$('.fm-main.notifications').hasClass('hidden')) {
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
        else if (id && id.substr(0, 9) === 'dashboard')
            dashboardUI();
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
            if (!is_mobile) {
                    M.renderMain();
                }
                else {
                    // Trigger rendering of mobile file manager
                    mobilefm.renderLayout();
                }
        }
        else if (id && (id.substr(0, 7) !== 'account')
                && (id.substr(0, 9) !== 'dashboard')
                && (id.substr(0, 13) !== 'notifications')) {

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
                for (var i = this.v.length; i--;) {
                    if (is_image(this.v[i])) {
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

            if (!is_mobile) {
                    M.renderMain();
                }
                else {
                    // Trigger rendering of mobile file manager
                    mobilefm.renderLayout();
                }

            if (fminitialized) {
                var currentdirid = M.currentdirid;
                if (id.substr(0, 6) === 'search') {
                    currentdirid = M.RootID;

                    if (M.d[M.previousdirid]) {
                        currentdirid = M.previousdirid;
                    }
                }

                if (!is_mobile) {
                        if ($('#treea_' + currentdirid).length === 0) {
                            var n = M.d[currentdirid];
                            if (n && n.p) {
                                treeUIopen(n.p, false, true);
                            }
                        }
                        treeUIopen(currentdirid, currentdirid === 'contacts');

                        $('#treea_' + currentdirid).addClass('opened');
                    }
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
            newHashLocation = 'F!' + pfid + '!' + pfkey + target;
            M.lastSeenFolderLink = newHashLocation;
        }
        else {
            // new hash location can be altered already by the chat logic in the previous lines in this func
            if (!newHashLocation) {
                newHashLocation = 'fm/' + M.currentdirid;
            }
        }
        try {

            if (hashLogic) {
                document.location.hash = '#' + newHashLocation;
            }
            else {
                if (window.location.pathname !== "/"+newHashLocation && !pfid) {
                    loadSubPage(newHashLocation);
                }
                else if (pfid && document.location.hash !== '#'+newHashLocation) {
                    history.pushState({ fmpage: newHashLocation }, "", "#"+newHashLocation);
                    page = newHashLocation;
                }
            }
        }
        catch (ex) {
            console.error(ex);
        }
        if (!is_mobile) {
                searchPath();

                var sortMenu = new mega.SortMenu();
                sortMenu.treeSearchUI();
            }

        $(document).trigger('MegaOpenFolder');
    };

    this.getActiveContacts = function() {
        var res = [];

        if (typeof M.c.contacts === 'object') {
            Object.keys(M.c.contacts)
                .forEach(function(userHandle) {
                    if (Object(M.u[userHandle]).c === 1) {
                        res.push(userHandle);
                    }
                });
        }

        return res;
    };

    // Contacts left panel handling
    this.contacts = function() {

        var i;
        var activeContacts = this.getActiveContacts()
            .map(function(handle) {
                return M.d[handle];
            });

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
                if (megaChatIsReady && activeContacts[i].u) {
                    onlinestatus = M.onlineStatusClass(
                        activeContacts[i].presence ? activeContacts[i].presence : 'unavailable'
                    );
                }
                else {
                    onlinestatus = [l[5926], 'offline'];
                }

                var name = M.getNameByHandle(activeContacts[i].u);

                if (!treesearch || name.toLowerCase().indexOf(treesearch.toLowerCase()) > -1) {

                    html += '<div class="nw-contact-item ui-droppable '
                    + onlinestatus[1] + '" id="contact_' + htmlentities(activeContacts[i].u)
                    + '"><div class="nw-contact-status"></div><div class="nw-contact-name">'
                    + htmlentities(name)
                    + ' <a class="button start-chat-button"><span></span></a></div></div>';
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

                    $('.dropdown-item', m).removeClass("disabled");

                    if ($userDiv.is(".offline")) {
                        $('.dropdown-item.startaudio-item, .dropdown-item.startvideo-item', m)
                            .addClass("disabled");
                    }

                    $this.addClass('active');
                    var y = $this.offset().top + 21;
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

            $('.fm-start-chat-dropdown .dropdown-item.startchat-item').rebind('click.treePanel', function() {
                var $this = $(this);

                if (!$this.is(".disabled")) {
                    var user_handle = $.selected && $.selected[0];
                    loadSubPage("fm/chat/" + user_handle);
                }
            });

            $('.fm-start-chat-dropdown .dropdown-item.startaudio-item').rebind('click.treePanel', function() {
                var $this = $(this);
                var $triggeredBy = $this.parent().data("triggeredBy");
                var $userDiv = $triggeredBy.parent().parent();

                if (!$this.is(".disabled") && !$userDiv.is(".offline")) {
                    var user_handle = $userDiv.attr('id').replace("contact_", "");

                    loadSubPage("fm/chat/" + user_handle);
                    var room = megaChat.createAndShowPrivateRoomFor(user_handle);
                    if (room) {
                        room.startAudioCall();
                    }
                }
            });

            $('.fm-start-chat-dropdown .dropdown-item.startvideo-item').rebind('click.treePanel', function() {
                var $this = $(this);
                var $triggeredBy = $this.parent().data("triggeredBy");
                var $userDiv = $triggeredBy.parent().parent();

                if (!$this.is(".disabled") && !$userDiv.is(".offline")) {
                    var user_handle = $userDiv.attr('id').replace("contact_", "");

                    loadSubPage("fm/chat/" + user_handle);
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
            loadSubPage('fm/chat/' + user_handle);
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
            ulc, expandedc, buildnode, containsc, i, node, html, sExportLink,
            fName = '',
            curItemHandle = '',
            undecryptableClass = '',
            titleTooltip = '',
            fIcon = '',
            prefix;

        var share = new mega.Share({});

        var inshares = n.h === 'shares';

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
        else if (inshares) {
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

        var btd = 0;
        if (btd) {
            console.group('BUILDTREE for "' + n.h + '"');
        }

        if (this.c[n.h]) {

            folders = [];

            var handles = Object.keys(this.c[n.h]);

            for (i = handles.length; i--;) {
                node = this.d[handles[i]];

                if (node) {
                    // folders, and skip subshares
                    if (node.t && !(inshares && this.d[node.p])) {
                        folders.push(node);
                    }
                }
            }
            if (btd) {
                console.debug('Building tree', folders.map(function(n) { return n.h }));
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

            for (var idx = 0; idx < folders.length; idx++) {

                ulc = '';
                expandedc = '';
                buildnode = false;
                containsc = '';
                curItemHandle = folders[idx].h;
                undecryptableClass = '';
                titleTooltip = '';
                fIcon = '';

                fName = folders[idx].name;

                if (this.c[curItemHandle]) {
                    handles = Object.keys(this.c[curItemHandle]);
                    for (i = handles.length; i--;) {
                        node = this.d[handles[i]];
                        if (node && node.t) {
                            containsc = 'contains-folders';
                            break;
                        }
                    }
                }
                if (fmconfig && fmconfig.treenodes && fmconfig.treenodes[curItemHandle]) {
                    buildnode = !!containsc;
                }
                if (buildnode) {
                    ulc = 'class="opened"';
                    expandedc = 'expanded';
                }
                else if (Object(fmconfig.treenodes).hasOwnProperty(curItemHandle)) {
                    fmtreenode(curItemHandle, false);
                }

                // Check is there a full and pending share available, exclude public link shares i.e. 'EXP'
                if (this.d[curItemHandle].su) {
                    sharedfolder = ' inbound-share';
                }
                else if (share.isShareExist([curItemHandle], true, true, false)) {
                    sharedfolder = ' shared-folder';
                }
                else {
                    sharedfolder = '';
                }
                openedc = (M.currentdirid === curItemHandle) ? 'opened' : '';

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
                    arrowIcon = containsc ? 'class="nw-fm-arrow-icon"' : '';

                    html = '<li id="' + _li + curItemHandle + '">' +
                        '<span  id="' + _a + curItemHandle + '"' +
                            ' class="nw-fm-tree-item ' + containsc + ' ' + expandedc + ' ' + openedc + ' ' +
                                sExportLink + ' ' + undecryptableClass + '" title="' + titleTooltip + '">' +
                            '<span ' + arrowIcon + '></span>' +
                            '<span class="nw-fm-tree-folder' + sharedfolder + '">' + escapeHTML(fName) + '</span>' +
                            '<span class="data-item-icon"></span>' +
                        '</span>' +
                        '<ul id="' + _sub + curItemHandle + '" ' + ulc + '></ul>' +
                        '</li>';

                    if (folders[idx - 1] && $('#' + _li + folders[idx - 1].h).length > 0) {
                        if (btd) {
                            console.debug('Buildtree, ' + curItemHandle + ' after ' + _li + folders[idx - 1].h);
                        }
                        $('#' + _li + folders[idx - 1].h).after(html);
                    }
                    else if (idx === 0 && $('#' + _sub + n.h + ' li').length > 0) {
                        if (btd) {
                            console.debug('Buildtree, ' + curItemHandle + ' before ' + _sub + n.h);
                        }
                        $($('#' + _sub + n.h + ' li')[0]).before(html);
                    }
                    else {
                        if (btd) {
                            console.debug('Buildtree, ' + curItemHandle + ' append ' + _sub + n.h);
                        }
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
                    this.buildtree(folders[idx], dialog, stype);
                }

                if (fminitialized) {
                    var currNode = M.d[curItemHandle];

                    if ((currNode && currNode.shares) || M.ps[curItemHandle]) {
                        sharedUInode(curItemHandle);
                    }

                    if (currNode && currNode.lbl) {
                        M.colourLabelDomUpdate(curItemHandle, currNode.lbl);
                    }
                }
            }// END of for folders loop
        }

        if (btd) {
            console.groupEnd();
        }

    };// END buildtree()

    this.buildtree.FORCE_REBUILD = 34675890009;

    var arrow = '<span class="context-top-arrow"></span><span class="context-bottom-arrow"></span>';

    this.buildRootSubMenu = function() {

        var cs = '',
            sm = '',
            html = '';

        for (var h in M.c[M.RootID]) {
            if (M.d[h] && M.d[h].t) {
                cs = ' contains-submenu';
                sm = '<span class="dropdown body submenu" id="sm_' + this.RootID + '">'
                    + '<span id="csb_' + this.RootID + '"></span>' + arrow + '</span>';
                break;
            }
        }

        html = '<span class="dropdown body submenu" id="sm_move"><span id="csb_move">'
            + '<span class="dropdown-item cloud-item' + cs + '" id="fi_' + this.RootID + '">'
            + '<i class="small-icon context cloud"></i>' + l[164] + '</span>' + sm
            + '<span class="dropdown-item remove-item" id="fi_' + this.RubbishID + '">'
            + '<i class="small-icon context remove-to-bin"></i>' + l[168] + '</span>'
            + '<hr /><span class="dropdown-item advanced-item"><i class="small-icon context aim"></i>'
            + l[9108] + '</span>' + arrow + '</span></span>';

        $('.dropdown-item.move-item').after(html);
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
        if ($('#csb_' + id + ' > .dropdown-item').length !== folders.length)  {
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
                        sm = '<span class="dropdown body submenu" id="sm_' + fid + '">'
                            + '<span id="csb_' + fid + '"></span>' + arrow + '</span>';
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

                html = '<span class="dropdown-item ' + sharedFolder + cs + '" id="fi_' + fid + '">'
                    + '<i class="small-icon context ' + sharedFolder + '"></i>'
                    + htmlentities(nodeName) + '</span>' + sm;

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
        var inshare;

        while (loop) {
            if ((id === 'contacts') && (result.length > 1)) {
                id = 'shares';
            }

            if (inshare && !M.d[id]) {
                // we reached the inshare root, use the owner next
                id = inshare;
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

                inshare = M.d[id].su;
                id = this.d[id].p;
            }
        }

        return result;
    };

    this.pathLength = function()
    {
        var length = $('.fm-right-header .fm-breadcrumbs-block:visible').outerWidth()
            + $('.fm-right-header .fm-header-buttons:visible').outerWidth();
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
            $('.fm-right-header .fm-breadcrumbs-block').safeHTML(
                '<a class="fm-breadcrumbs contacts has-next-button" id="path_contacts">'
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
            $('.fm-right-header .fm-breadcrumbs-block').safeHTML(
                '<a class="fm-breadcrumbs search ui-droppable" id="'
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
            $('.fm-right-header .fm-breadcrumbs-block').html(contactBreadcrumb + html);
        }
        else if (this.currentdirid && this.currentdirid === 'ipc') {
            DEBUG('Render Path IPC');
            $('.fm-right-header .fm-breadcrumbs-block').html(contactBreadcrumb + html);
        }
        else {
            $('.search-files-result').addClass('hidden');
            $('.fm-right-header .fm-breadcrumbs-block').html(html);
        }

        // Resizing breadcrumbs items
        function breadcrumbsResize() {
            var $fmHeader = $('.fm-right-header:visible');
            var headerWidth = $fmHeader.outerWidth();

            $fmHeader.removeClass('long-path short-foldernames');
            if (M.pathLength() > headerWidth) {
                $fmHeader.addClass('long-path');
            }

            var $el = $fmHeader.find('.fm-breadcrumbs-block:visible .right-arrow-bg');
            var i = 0;
            var j = 0;
            $el.removeClass('short-foldername ultra-short-foldername');

            while (M.pathLength() > headerWidth) {
                if (i < $el.length - 1) {
                    $($el[i]).addClass('short-foldername');
                    i++;
                } else if (j < $el.length - 1) {
                    $($el[j]).addClass('ultra-short-foldername');
                    j++;
                } else if (!$($el[j]).hasClass('short-foldername')) {
                    $($el[j]).addClass('short-foldername');
                } else {
                    $($el[j]).addClass('ultra-short-foldername');
                    break;
                }
            }
        }

        breadcrumbsResize();
        $(window).bind('resize.fmbreadcrumbs', function() {
            breadcrumbsResize();
        });

        if ($('.fm-right-header .fm-breadcrumbs-block .fm-breadcrumbs').length > 1) {
            $('.fm-right-header .fm-breadcrumbs-block').removeClass('deactivated');
        }
        else {
            $('.fm-right-header .fm-breadcrumbs-block').addClass('deactivated');
        }

        $('.fm-right-header .fm-breadcrumbs-block a').unbind('click');
        $('.fm-right-header .fm-breadcrumbs-block a').bind('click', function() {
            var crumbId = $(this).attr('id');

            // When NOT deactivated
            if (!$('.fm-right-header .fm-breadcrumbs-block').hasClass('deactivated')) {
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
        if (n.su) {
            var u = this.u[n.su];
            if (u) {
                u.h = u.u;
                u.t = 1;
                u.p = 'contacts';
                M.addNode(u);
            }
            else if (d) {
                console.warn('No user record for incoming share', n.su);
            }
        }

        if (n.p) {
            if (typeof this.c[n.p] === 'undefined') {
                this.c[n.p] = [];
            }
            this.c[n.p][n.h] = 1;
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

        if (n.t < 2) {
            crypto_decryptnode(n);
            M.nodeUpdated(n, ignoreDB);
        }

        if (n.hash) {
            if (!this.h[n.hash]) {
                this.h[n.hash] = [];
            }
            this.h[n.hash].push(n.h);
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

        if (fminitialized) {
            // Handle Inbox/RubbishBin UI changes
            delay('fmtopUI', fmtopUI);

            newnodes.push(n);
        }

        // $(window).trigger("megaNodeAdded", [n]);
    };

    if (is_mobile) {
        this.addNode = function() {
            return false;
        };
    }

    var delInShareQueue = Object.create(null);
    this.delNode = function(h, ignoreDB) {
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

            if (fmdb) {
                fmdb.del('f', h);
                fmdb.del('ph', h);
            }

            if (M.d[h]) {
                if (M.d[h].su) {
                    // this is an inbound share
                    delete M.c.shares[h];
                    delete u_sharekeys[h];
                    delInShareQ.push(M.d[h].su + '*' + h);
                    M.delIndex(M.d[h].su, h);
                }

                M.delIndex(M.d[h].p, h);
                M.delHash(M.d[h]);
                delete M.d[h];
            }

            // if (M.u[h]) delete M.u[h];
            if (typeof M.u[h] === 'object') {
                M.u[h].c = 0;
            }
        }
        var delInShareQ = delInShareQueue[h] = delInShareQueue[h] || [];
        ds(h);

        if (fmdb && !ignoreDB) {
            // Perform DB deletions once we got acknowledge from API (action-packets)
            // which we can't do above because M.d[h] might be already deleted.
            for (var i = delInShareQ.length; i--;) {
                fmdb.del('s', delInShareQ[i]);
            }
            delete delInShareQueue[h];
        }
        if (fminitialized) {
            // Handle Inbox/RubbishBin UI changes
            delay('fmtopUI', fmtopUI);

            if (M.currentdirid === 'shares' && !M.viewmode) {
                M.openFolder('shares', 1);
            }
            else {
                // Update M.v it's used for at least preview slideshow
                for (var k = M.v.length; k--;) {
                    if (M.v[k].h === h) {
                        M.v.splice(k, 1);
                        break;
                    }
                }
            }
        }
    };

    this.delHash = function(n) {
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
            if (fmdb) {
                fmdb.del('h', n.h);
            }
            if (!M.h[n.hash].length)
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
                // return -12;
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

        // In case of invite-dialog we will use notifications
        if ($.dialog !== 'invite-friend') {
            this.inviteContactMessageHandler(proceed);
        }

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
            fmtopUI();
            onIdle(treeUI);
        };

        var apiReq = function(handle) {
            api_req({a: 'd',
                     n: handle
                     //, i: requesti - DB update only upon receipt of actionpacket!
                    }, {
                callback: function(res, ctx) {
                    if (res !== 0) {
                        console.error('Failed to delete node from rubbish bin', handle, res);
                    }
                    else {
                        var h = handle;

                        M.delNode(h, true);

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
                useravatar.loaded(userId); // FIXME: why is this needed here?
            }

            if (userId === u_handle) {
                u_attr.firstname = firstName;
                u_attr.lastname = lastName;
                u_attr.name = self.u[userId].name;

                $('.user-name').text(u_attr.name);

                $('.membership-big-txt.name:visible').text(
                    u_attr.name
                );

                // XXX: why are we invalidating avatars on first/last-name change?
                /*if (fminitialized) {
                    M.avatars(u_handle);
                }*/
            }
        });
    },

    /**
     * Callback, that would be called when a contact is changed.
     */
    this.onContactChanged = function(contact) {
        if (fminitialized) {
            if (getSitePath() === "/fm/" + contact.u) {
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

            if (getSitePath() === "/fm/contacts") {
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

            if (fmdb && !ignoreDB && !pfkey) {
                // convert MegaDataObjects -> JS
                var cleanedUpUserData = clone(u.toJS ? u.toJS() : u);
                delete cleanedUpUserData.presence;
                delete cleanedUpUserData.presenceMtime;
                delete cleanedUpUserData.shortName;
                delete cleanedUpUserData.name;
                delete cleanedUpUserData.avatar;
                fmdb.add('u', { u : u.u, d : cleanedUpUserData });
            }

            this.syncUsersFullname(userId);
        }
    };

    // Update M.opc and related localStorage
    this.addOPC = function(u, ignoreDB) {
        this.opc[u.p] = u;
        if (fmdb && !ignoreDB && !pfkey) {
            fmdb.add('opc', { p : u.p, d : u });
        }
    };

    /**
     * Delete opc record from localStorage using id
     *
     * @param {string} id
     *
     */
    this.delOPC = function(id) {
        if (fmdb && !pfkey) {
            fmdb.del('opc', id);
        }
    };

    // Update M.ipc and related localStorage
    this.addIPC = function(u, ignoreDB) {
        this.ipc[u.p] = u;
        if (fmdb && !pfkey) {
            fmdb.add('ipc', { p : u.p, d : u });
        }
    };

    /**
     * Delete ipc record from indexedDb using id
     *
     * @param {string} id
     *
     */
    this.delIPC = function(id) {
        if (fmdb && !pfkey) {
            fmdb.del('ipc', id);
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

        if (fmdb && !ignoreDB && !pfkey) {
            fmdb.add('ps', { h_p : ps.h + '*' + ps.p, d : ps });
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

        if (fmdb && !pfkey) {
            fmdb.del('ps', nodeId + '*' + pcrId);
        }
    };

    // This function has a special hacky purpose, don't use it if you don't know what it does, use M.copyNodes instead.
    this.injectNodes = function(nodes, target, callback) {
        if (!Array.isArray(nodes)) {
            nodes = [nodes];
        }

        var sane = nodes.filter(function(node) {
            return M.isFileNode(node);
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
     * @param {Array}       cn            Array of nodes that needs to be copied
     * @param {String}      t             Destination node
     * @param {Boolean}     del           Should we delete the node after copying? (Like a move operation)
     * @param {MegaPromise} promise       promise to notify completion on (Optional)
     */
    this.copyNodes = function(cn, t, del, promise) {
        if (typeof promise === 'function') {
            var tmp = promise;
            promise = new MegaPromise();
            promise.always(tmp);
        }

        if ($.onImportCopyNodes && t.length === 11) {
            msgDialog('warninga', l[135], 'Operation not permitted.');
            promise.reject(EARGS);
            return promise;
        }

        loadingDialog.show();

        if (t.length === 11 && !u_pubkeys[t]) {
            var keyCachePromise = api_cachepubkeys([t]);
            keyCachePromise.always(function _cachepubkeyscomplete() {
                if (u_pubkeys[t]) {
                    M.copyNodes(cn, t, del, promise);
                }
                else {
                    loadingDialog.hide();
                    alert(l[200]);

                    // XXX: remove above alert() if promise is set?
                    if (promise) {
                        promise.reject(EKEY);
                    }
                }
            });

            return promise;
        }

        var a = this.isFileNode(cn) ? [cn] : ($.onImportCopyNodes || fm_getcopynodes(cn, t));
        var importNodes = Object(a).length;
        var nodesCount;
        var sconly = importNodes > 10;   // true -> new nodes delivered via SC `t` command only
        var ops = {a: 'p', t: t, n: a}; // FIXME: deploy API-side sn check

        var onCopyNodesDone = function() {
            loadingDialog.hide();
            if (promise) {
                promise.resolve(0);
            }
            if (!sconly) {
                renderNew();
            }

            if (importNodes && nodesCount < importNodes) {
                msgDialog('warninga', l[882],
                    (nodesCount ? l[8683] : l[2507])
                        .replace('%1', nodesCount)
                        .replace('%2', importNodes)
                );
            }
        };

        if (sconly) {
            ops.v = 3;
            ops.i = mRandomToken('pn');
            M.scAckQueue[ops.i] = onCopyNodesDone;
        }
        else {
            // ops.v = 2;
            ops.i = requesti;
        }

        var s = fm_getsharenodes(t);

        if (s.length) {
            ops.cr = crypto_makecr(a, s, false);
        }

        if (importNodes) {
            // #4290 'strict mode'
            ops.sm = 1;
        }

        // encrypt nodekeys, either by RSA or by AES, depending on whether
        // we're sending them to a contact's inbox or not
        // FIXME: do this in a worker
        var c = (t || "").length == 11;
        for (var i = a.length; i--; ) {
            a[i].k = c ? base64urlencode(encryptto(t, a32_to_str(a[i].k)))
                       : a32_to_base64(encrypt_key(u_k_aes, a[i].k));
        }

        api_req(ops, {
            cn: cn,
            del: del,
            t: t,
            sconly: sconly,
            callback: function(res, ctx) {

                if (typeof res === 'number' && res < 0) {
                    loadingDialog.hide();
                    if (promise) {
                        return promise.reject(res);
                    }
                    return msgDialog('warninga', l[135], l[47], api_strerror(res));
                }

                if (ctx.del) {
                    for (var i in ctx.cn) {
                        M.delNode(ctx.cn[i], true); // must not update DB pre-API
                        if (!ctx.sconly || !res[i]) {
                            api_req({a: 'd', n: cn[i]/*, i: requesti*/});
                        }
                    }
                }

                if (ctx.sconly) {
                    nodesCount = importNodes - Object.keys(res).length;

                    // accelerate arrival of SC-conveyed new nodes by directly
                    // issuing a fetch
                    // (instead of waiting for waitxhr's connection to drop)
                    getsc();
                }
                else {
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
            }
        });

        return promise;
    };

    this.moveNodes = function(n, t) {
        newnodes = [];
        loadingDialog.show();

        var pending = {value: 0};
        var apiReq  = function(apireq, h) {
            pending.value++;

            api_req(apireq, {
                handle: h,
                target: t,
                pending: pending,
                callback: function(res, ctx) {
                    // if the move operation succeed (res == 0), perform the actual move locally
                    if (!res) {
                        var node = M.getNodeByHandle(ctx.handle);

                        if (node && node.p) {
                            var h      = ctx.handle;
                            var t      = ctx.target;
                            var parent = node.p;

                            // Update M.v it's used for slideshow preview at least
                            for (var k = M.v.length; k--;) {
                                if (M.v[k].h === h) {
                                    M.v.splice(k, 1);
                                    break;
                                }
                            }

                            if (M.c[parent] && M.c[parent][h]) {
                                delete M.c[parent][h];
                            }
                            if (typeof M.c[t] === 'undefined') {
                                M.c[t] = [];
                            }
                            M.c[t][h] = 1;
                            node.p    = t;
                            removeUInode(h, parent);
                            M.nodeUpdated(node);
                            newnodes.push(node);
                        }
                    }

                    if (!--ctx.pending.value) {
                        if (newnodes.length) {
                            renderNew();
                            Soon(fmtopUI);
                            $.tresizer();
                            // force fmdb flush by writing the sn, so that we don't have to
                            // wait for the packet to do so if the operation succeed here.
                            setsn(currsn);
                        }
                        loadingDialog.hide();
                    }
                }
            });
        };

        for (var i in n) {
            var h = n[i];

            var apireq = {
                a: 'm',
                n: h,
                t: t,
                i: requesti
            };
            processmove(apireq);
            apiReq(apireq, h);
        }
    };

    /**
     * Helper function to move nodes falling back to copy+delete under inshares.
     *
     * @param {String} target  The handle for the target folder to move nodes into
     * @param {Array} [nodes]  Array of nodes to move, $.selected if none provided
     * @returns {MegaPromise}
     */
    this.safeMoveNodes = function safeMoveNodes(target, nodes) {
        var copy    = [];
        var move    = [];
        var promise = new MegaPromise();

        nodes = nodes || $.selected || [];

        var totype = treetype(target);

        for (var i = nodes.length; i--;) {
            var node = nodes[i];

            var fromtype = treetype(node);

            if (fromtype == totype) {
                if (!isCircular(node, target)) {
                    if (totype != 'shares' || sharer(node) === sharer(target)) {
                        move.push(node);
                    }
                    else {
                        copy.push(node);
                    }
                }
            }
            else {
                copy.push(node);
            }
        }

        if (copy.length) {
            this.copyNodes(copy, target, true);
        }

        if (move.length) {
            this.moveNodes(move, target);
        }

        // TODO: promises support (realdbpaging)
        return promise;
    };


    this.accountData = function(cb, blockui)
    {
        var account = Object(this.account);

        if (account.lastupdate > Date.now() - 300000 && cb) {
            cb(account);
        }
        else {

            if (blockui) {
                loadingDialog.show();
            }

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

            api_req({a: 'maf', v: mega.achievem.RWDLVL}, {
                account: account,
                callback: function(res, ctx) {
                    if (typeof res === 'object') {
                        ctx.account.maf = res;
                    }
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

            /* x: 1, load the session ids
               useful to expire the session from the session manager */
            api_req({ a: 'usl', x: 1 }, {
                account: account,
                callback: function(res, ctx) {
                    if (typeof res != 'object') {
                        res = [];
                    }
                    ctx.account.sessions = res;
                }
            });

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

    this.nodeUpdated = function(n, ignoreDB) {
        if (n.h && n.h.length == 8) {
            if (fmdb) {
                fmdb.add('f', { h : n.h,
                                p : n.p,
                                s : n.s >= 0 ? n.s : -n.t,
                                d : n });

                if (n.hash) {
                    fmdb.add('h', {h: n.h, c: n.hash});
                }
            }

            // sync missingkeys with this node's key status
            if (crypto_keyok(n)) {
                // mark as fixed if necessary
                if (missingkeys[n.h]) crypto_keyfixed(n.h);
            }
            else {
                // always report missing keys as more shares may
                // now be affected
                if (n.k) {
                    crypto_reportmissingkey(n);
                }
            }

            // maintain special incoming shares index
            if (n.su) {
                if (!M.c[n.su]) {
                    M.c[n.su] = [];
                }
                M.c[n.su][n.h] = n.t + 1;

                if (!M.c.shares[n.h]) {
                    if (n.sk && !u_sharekeys[n.h]) {
                        // extract sharekey from node's sk property
                        var k = crypto_process_sharekey(n.h, n.sk);
                        if (k !== false) crypto_setsharekey(n.h, k, ignoreDB);
                    }

                    M.c.shares[n.h] = { su: n.su, r: n.r, t: n.h };

                    if (u_sharekeys[n.h]) {
                        M.c.shares[n.h].sk = a32_to_base64(u_sharekeys[n.h][0]);
                    }

                    if (fmdb && !ignoreDB) {
                        fmdb.add('s', { o_t: n.su + '*' + n.h,
                                          d: M.c.shares[n.h]
                        });
                    }
                }
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
        var n = M.d[itemHandle];
        if (n) {
            n.name = newItemName;
            api_setattr(n, mRandomToken('mv'));
            this.onRenameUIUpdate(itemHandle, newItemName);
        }
    };


    /* Colour Label context menu update
    *
    * @param {String} node Selected Node
    */
    this.colourLabelcmUpdate = function(node) {

        var $items = $('.files-menu .dropdown-colour-item');
        var value;

        value = node.lbl;

        // Reset label submenu
        $items.removeClass('active');

        // Add active state label`
        if (value) {
            $items.filter('[data-label-id=' + value + ']').addClass('active');
        }
    };

    this.getColourClassFromId = function(id) {

        return ({
                '1': 'red', '2': 'orange', '3': 'yellow',
                '4': 'green', '5': 'blue', '6': 'purple', '7': 'grey'
            })[id] || '';
    };

    /**
     * colourLabelDomUpdate
     *
     * @param {String} handle
     * @param {Number} value Current labelId
     */
    this.colourLabelDomUpdate = function(handle, value) {

        if (fminitialized) {
            var labelId       = parseInt(value);
            var removeClasses = 'colour-label red orange yellow blue green grey purple';

            // Remove all colour label classes
            $('#' + handle).removeClass(removeClasses);
            $('#' + handle + ' a').removeClass(removeClasses);

            if (labelId) {
                // Add colour label classes.
                var colourClass = 'colour-label ' + M.getColourClassFromId(labelId);

                $('#' + handle).addClass(colourClass);
                $('#' + handle + ' a').addClass(colourClass);
            }
        }
    };

    /*
    * colourLabeling Handles colour labeling of nodes updates DOM and API
    *
    * @param {Array | string} handles Selected nodes handles
    * @param {Integer} labelId Numeric value of label
    */
    this.colourLabeling = function(handles, labelId) {

        var newLabelState = 0;

        if (fminitialized && handles) {
            if (!Array.isArray(handles)) {
                handles = [handles];
            }

            $.each(handles, function(index, handle) {

                var node = M.d[handle];
                newLabelState = labelId;

                if (node.lbl === labelId) {
                    newLabelState = 0;
                }
                node.lbl = newLabelState;

                api_setattr(node, mRandomToken('lbl'));
                M.colourLabelDomUpdate(handle, newLabelState);
            });
        }
    };

    /**
    * favouriteDomUpdate
    *
    * @param {Object} node      Node object
    * @param {Number} favState  Favourites state 0 or 1
     */
    this.favouriteDomUpdate = function(node, favState) {
        var $gridView  = $('#' + node.h + ' .grid-status-icon');
        var $blockView = $('#' + node.h + '.file-block .file-status-icon');

        if (favState) {// Add favourite
            $gridView.addClass('star');
            $blockView.addClass('star');
        }
        else {// Remove from favourites
            $gridView.removeClass('star');
            $blockView.removeClass('star');
        }
    };

    /**
     * Change node favourite state.
     * @param {Array}   handles     An array containing node handles
     * @param {Number}  newFavState Favourites state 0 or 1
     */
    this.favourite = function(handles, newFavState) {
        var exportLink = new mega.Share.ExportLink({});

        if (fminitialized) {
            if (!Array.isArray(handles)) {
                handles = [handles];
            }

            $.each(handles, function(index, handle) {
                var node = M.d[handle];

                if (node && !exportLink.isTakenDown(handle)) {
                    node.fav = newFavState;
                    api_setattr(node, mRandomToken('fav'));
                    M.favouriteDomUpdate(node, newFavState);
                }
            });
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

        var result = false;
        var nodes = nodesId;

        if (!Array.isArray(nodesId)) {
            nodes = [nodesId];
        }

        // On first favourite found break the loop
        $.each(nodes, function(index, value) {
            if (M.d[value] && M.d[value].fav) {
                result = true;
                return false;// Break the loop
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

        if (typeof node != 'object') {
            node = this.getNodeByHandle(node);
        }

        if (node && node.shares && user in node.shares) {
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
            if (typeof this.d[h].shares == 'undefined') {
                this.d[h].shares = [];
            }

            this.d[h].shares[s.u] = s;
            if (fmdb) {
                if (!ignoreDB && !pfkey) {
                    fmdb.add('s', { o_t : h + '*' + s.u, d : s });
                }
            }
            if (fminitialized) {
                sharedUInode(h);
            }
            if (fmdb && !pfkey && !ignoreDB) {
                if (!u_sharekeys[h]) {
                    if (d && !this.getNodeShare(h)) {
                        console.warn('No share key for node ' + h);
                    }
                }
                else {
                    fmdb.add('ok', {
                        h : h,
                        d : { k : a32_to_base64(encrypt_key(u_k_aes, u_sharekeys[h][0])),
                              ha : crypto_handleauth(h) }
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
            console.warn('nodeShare failed for node:', h, s, ignoreDB);
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
        if (this.d[h] && typeof this.d[h].shares != 'undefined') {
            var updnode;

            if (this.su[u]) {
                delete this.su[u][h];
            }

            if (fmdb) {
                fmdb.del('s', h + '*' + u);
            }

            api_updfkey(h);
            delete this.d[h].shares[u];

            if (u === 'EXP' && this.d[h].ph) {
                delete this.d[h].ph;

                if (fmdb) {
                    fmdb.del('ph', h);
                }

                updnode = true;
            }

            var a;
            for (var i in this.d[h].shares) {
                if (this.d[h].shares[i]) {
                    a = true;
                    break;
                }
            }

            if (!a) {
                delete this.d[h].shares;
                updnode = true;
            }

            if (updnode) {
                M.nodeUpdated(this.d[h]);

                if (fminitialized) {
                    sharedUInode(h);
                }
            }
        }

        if (okd) {
            // The node is no longer shared with anybody, ensure it's properly cleared..
            var users = this.getNodeShareUsers(h, 'EXP');

            if (users.length) {
                console.warn('The node ' + h + ' still has shares on it!', users);

                users.forEach(function(user) {
                    M.delNodeShare(h, user);
                });
            }

            delete u_sharekeys[h];
            if (fmdb) {
                fmdb.del('ok', h);
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
            // FIXME: add support once available
        }
    }

    this.getDownloadFolderNodes = function(n, md, nodes, paths) {
        if (md) this.makeDir(n);

        var subids = fm_getnodes(n);

        for (var j = 0; j < subids.length; j++) {
            var p = this.getPath(subids[j]);
            var path = '';

            for (var k = 0; k < p.length; k++) {
                if (M.d[p[k]] && M.d[p[k]].t)
                    path = fm_safename(M.d[p[k]].name) + '/' + path;
                if (p[k] == n)
                    break;
            }

            if (!M.d[subids[j]].t) {
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
     * Recursively retrieve node properties
     * @param {String|Array} aNodes  ufs-node handle, or a list of them
     */
    this.getNodeProperties = function(aNodes) {
        var res = {
            favs: { cnt: 0, size: 0 },
            links: { cnt: 0, size: 0 },
            files: { cnt: 0, size: 0 },
            folders: { cnt: 0, size: 0 },
            oshares: { cnt: 0, size: 0 },
        };

        var forEach = function(nodes) {
            var node;
            var size;

            for (var i = 0; i < nodes.length; i++) {
                node = M.d[nodes[i]];

                if (node) {
                    if (node.t) {
                        size = 0;

                        if (M.c[node.h]) {
                            var fs = res.folders.size;
                            size = res.files.size;

                            forEach(Object.keys(M.c[node.h]));
                            size = (res.files.size - size);
                            res.folders.size = fs;
                        }

                        if (M.getNodeShareUsers(node, 'EXP').length) {
                            res.oshares.cnt++;
                            res.oshares.size += size;
                        }

                        res.folders.cnt++;
                        res.folders.size += size;
                    }
                    else {
                        size = node.s || 0;

                        res.files.cnt++;
                        res.files.size += size;

                        if (node.ph) {
                            res.links.cnt++;
                            res.links.size += size;
                        }
                        if (node.fav) {
                            res.favs.cnt++;
                            res.favs.size += size;
                        }
                    }
                }
            }
        };

        if (!Array.isArray(aNodes)) {
            if (M.c[aNodes]) {
                aNodes = Object.keys(M.c[aNodes]);
            }
            else {
                aNodes = [aNodes];
            }
        }

        forEach(aNodes);

        return res;
    };

    /**
     * Retrieve dashboard statistics data
     */
    this.getDashboardData = function() {
        var res = this.getNodeProperties(M.RootID);

        [M.RubbishID, 'shares']
            .forEach(function(handle) {
                var key = 'rubbish';
                var tmp = M.getNodeProperties(handle);

                // remove unwanted properties
                ['favs', 'links', 'oshares']
                    .forEach(function(k) {
                        if (d && tmp[k].cnt) {
                            console.warn('getDashboardData: Found "%s" items for "%s"', k, handle);
                        }
                        delete tmp[k];
                    });

                tmp.cnt = tmp.files.cnt;
                tmp.size = tmp.folders.size;

                tmp.files = tmp.files.cnt;
                tmp.folders = tmp.folders.cnt;

                if (handle === 'shares') {
                    key = 'ishares';
                    tmp.cnt = Object.keys(M.c.shares || {}).length;
                }
                else if (!M.c[handle]) {
                    // The rubbish is empty
                    tmp.folders = 0;
                }

                res[key] = tmp;
            });

        return res;
    };

    /**
     * Check whether an object is a file node
     * @param {String} n The object to check
     * @return {Boolean}
     */
    this.isFileNode = function(n) {
        return crypto_keyok(n) && !n.t;
    };

    /** like addToTransferTable, but can take a download object */
    this.putToTransferTable = function(node, ttl) {
        var handle = node.h || node.dl_id;
        node.name = node.name || node.n;

        if (d) {
            var isDownload = node.owner instanceof ClassFile;
            console.assert(this.isFileNode(node) || isDownload, 'Invalid putToTransferTable node.');
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
                    if (!node.a && node.k) {
                        var item = {
                            t: node.t,
                            h: node.h,
                            p: node.p,
                            n: base64urlencode(node.name),
                        };
                        if (!node.t) {
                            item.s = node.s;
                            item.ts = node.mtime || node.ts;
                            item.k = a32_to_base64(node.k);
                        }
                        files.push(item);
                    }

                    if (node.t) {
                        foreach(fm_getnodes(node.h));
                    }
                };

                var foreach = function(nodes) {
                    for (var i = 0; i < nodes.length; i++) {
                        var node = M.d[nodes[i]];

                        if (node) {
                            addNode(node);
                        }
                    }
                };

                foreach(n);

                if (!files.length) {
                    console.error('No files');
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
            else if (this.isFileNode(n[i])) {
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
            if (!nodes.hasOwnProperty(k) || !this.isFileNode((n = M.d[nodes[k]]))) {
                n = nodes[k];
                if (this.isFileNode(n)) {
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
                key: n.k,
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

        if (M.tfsdomqueue[id]) {
            // flush the transfer from the DOM queue
            addToTransferTable(id, M.tfsdomqueue[id]);
            delete M.tfsdomqueue[id];
        }

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
        if (M.getTransferElements())
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
        if (!obj.domTransfersBlock) {
            return false;
        }
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
                // keep inserting downloads as long there are uploads
                var dl = $('.transfer-table tr.transfer-download.transfer-queued:last');

                if (dl.length) {
                    dl = dl.prevAll().length;

                    fit = (dl && dl + 1 < T.used);
                }
                else {
                    fit = !document.querySelector('.transfer-table tr.transfer-download');
                }

                if (fit) {
                    addToTransferTable(gid, elem);
                }
            }

            if (!fit)
                M.tfsdomqueue[gid] = elem;
        }
    };

    var __ul_id = 8000;
    this.addUpload = function(u, ignoreWarning) {
        var flag = 'ulMegaSyncAD';

        if (u.length > 999 && !ignoreWarning && !localStorage[flag]) {
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
                        loadSubPage('sync');
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
        else if (String(M.currentdirid).length !== 8) {
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
            target = M.currentdirid;
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
        n2.k = a32_to_base64(n2.k);
        delete n2.k, n2.ph, n2.ar;
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
        var urlParts = /sitetransfer!(.*)/.exec(window.location);

        if (urlParts) {

            try {
                // Decode from Base64 and JSON
                urlParts = JSON.parse(atob(urlParts[1]));
            }
            catch (ex) {
                console.error(ex);
                loadSubPage('login');
                return false;
            }

            if (urlParts) {
                // If the user is already logged in here with the same account
                // we can avoid a lot and just take them to the correct page
                if (JSON.stringify(u_k) === JSON.stringify(urlParts[0])) {
                    loadSubPage(urlParts[2]);
                    return false;
                }

                // If the user is already logged in but with a different account just load that account instead. The
                // hash they came from e.g. a folder link may not be valid for this account so just load the file manager.
                else if (u_k && (JSON.stringify(u_k) !== JSON.stringify(urlParts[0]))) {
                    if (!urlParts[2] || String(urlParts[2]).match(/^fm/)) {
                        loadSubPage('fm');
                        return false;
                    }
                    else {
                        loadSubPage(urlParts[2]);
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
                    loadSubPage(toPage);
                };

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

    if (!is_mobile) {
        initUI();
    }

    M.sortByName();

    if (!is_mobile) {
        M.renderTree();
        M.renderPath();
    }

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

    if (M.currentdirid === 'dashboard') {
        delay('dashboard:upd', dashboardUI, 2000);
    }

    newnodes = [];
    if (d) {
        console.timeEnd('rendernew');
    }
}

// execute actionpacket
// actionpackets are received and executed strictly in order. receiving and
// execution run concurrently (a connection drop while the execution is
// ongoing invalidates the IndexedDB state and forces a reload!)
var scq = {};   // hash of [actionpacket, [nodes]]
var scqtail = 0;    // next scq index to process
var scqhead = 0;    // next scq index to write
var shareworker = {};   // which worker knows about which sharekeys?

var scinflight = false; // don't run more than one execsc() "thread"
var sccount = 0;        // number of actionpackets processed at connection loss

var nodesinflight = {};  // number of nodes being processed in the worker for scqi

// enqueue parsed actionpacket
function sc_packet(a) {
    if ((a.a == 's' || a.a == 's2') && a.k) {
        /**
         * There are two occasions where `crypto_process_sharekey()` must not be called:
         *
         * 1. `a.k` is symmetric (AES), `a.u` is set and `a.u != u_handle`
         *    (because the resulting sharekey would be rubbish)
         *
         * 2. `a.k` is asymmetric (RSA), `a.u` is set and `a.u != u_handle`
         *    (because we either get a rubbish sharekey or an RSA exception from asmcrypto)
         */
        var prockey = false;

        if (a.k.length > 43) {
            if (!a.u || a.u === u_handle) {
                // RSA-keyed share command targeted to u_handle: run through worker
                prockey = !a.o || a.o !== u_handle;

                if (prockey) {
                    rsasharekeys[a.n] = true;
                }
            }
        }
        else {
            prockey = (!a.o || a.o === u_handle);
        }

        if (prockey) {
            if (workers && rsasharekeys[a.n]) {
                // set scq slot number
                a.scqi = scqhead++;

                var p = a.scqi % workers.length;

                // pin the nodes of this share to the same worker
                // (it is the only one that knows the sharekey)
                shareworker[a.n] = p;

                workers[p].postMessage(a);
                return;
            }

            var k = crypto_process_sharekey(a.n, a.k);

            if (k !== false) {
                a.k = k;
                crypto_setsharekey(a.n, k, true);
            }
            else {
                console.warn("Failed to decrypt RSA share key for " + a.n + ": " + a.k);
            }
        }
    }

    // other packet types do not warrant the worker detour
    if (scq[scqhead]) scq[scqhead++][0] = a;
    else scq[scqhead++] = [a, []];

    // resume processing if needed
    resumesc();
}

// submit nodes from `t` actionpacket to worker
function sc_node(n) {
    var p, id;

    crypto_rsacheck(n);

    if (!workers) {
        crypto_decryptnode(n);
        if (scq[scqhead]) scq[scqhead][1].push(n);
        else scq[scqhead] = [null, [n]];
        // sc_packet() call will follow
        return;
    }

    // own node?
    if (n.k && n.k.substr(0, 11) === u_handle) p = -1;
    else {
        // no - do we have an existing share key?
        for (p = 8; (p = n.k.indexOf(':', p)) >= 0; ) {
            if (++p == 9 || n.k[p-10] == '/') {
                id = n.k.substr(p-9, 8);
                if (shareworker[id] || u_sharekeys[id]) {
                    break;
                }
            }
        }
    }

    if (p >= 0) {
        var pp = n.k.indexOf('/', p+21);

        if (pp < 0) {
            pp = n.k.length;
        }

        // rewrite key to the minimum
        n.k = id + ':' + n.k.substr(p, pp-p);

        if (shareworker[id] >= 0) {
            // the key is already known to a worker
            p = shareworker[id];
        }
        else {
            // pick a pseudorandom worker (round robin)
            p = scqhead % workers.length;

            // record for future nodes in the same share
            shareworker[id] = p;

            // send sharekey
            workers[p].postMessage({ h : id, sk : u_sharekeys[id][0] });
        }
    }
    else {
        p = scqhead % workers.length;
    }

    if (nodesinflight[scqhead]) nodesinflight[scqhead]++;
    else nodesinflight[scqhead] = 1;

    n.scni = scqhead;       // set scq slot number (sc_packet() call will follow)
    workers[p].postMessage(n);
}

// inter-actionpacket state, gets reset in getsc()
var scsharesuiupd;
var loadavatars = [];
var scinshare = Object.create(null);

// if no execsc() thread is running, check if one should be, and start it if so.
function resumesc() {
    if (!scinflight) {
        if (scq[scqtail] && scq[scqtail][0] && !nodesinflight[scqtail]) {
            scinflight = true;
            execsc();
        }
    }
}

// execute actionpackets from scq[scqtail] onwards
function execsc() {
    var n, i;
    var tick = Date.now();
    var tickcount = 0;

    do {
        if (!scq[scqtail] || !scq[scqtail][0] || (scq[scqtail][0].a == 't' && nodesinflight[scqtail])) {
            // scq ran empty - nothing to do for now
            if (d) console.log((sccount-1) + " SC command(s) processed.");

            // perform post-execution UI work
            if (newnodes.length && fminitialized) {
                renderNew();
            }

            if (loadavatars.length) {
                M.avatars(loadavatars);
                loadavatars = [];
            }

            if (M.viewmode) {
                delay('thumbnails', fm_thumbnails, 3200);
            }

            if ($.dialog === 'properties') {
                propertiesDialog();
            }

            if (scsharesuiupd) {
                if (fminitialized) {
                    onIdle(function() {
                        M.buildtree({h: 'shares'}, M.buildtree.FORCE_REBUILD);

                        if (M.currentrootid === 'shares') {
                            M.openFolder(M.currentdirid, true);
                            loadingDialog.hide(); // TODO: from leaveShare, check if ok..
                        }
                    });
                }

                scsharesuiupd = false;
            }

            sccount = 0;
            scinflight = false;
            return;
        }

        sccount++;

        var a = scq[scqtail][0];
        var scnodes = scq[scqtail][1];
        delete scq[scqtail++];

        if (d) {
            console.log('Received SC command ', a);
        }

        if (a.i === requesti) {
            if (d) {
                console.log('(triggered locally)');
            }

            switch (a.a) {
                case 'c':
                    // contact notification
                    process_u(a.u);

                    // only show a notification if we did not trigger the action ourselves
                    if (!pfid && u_attr && a.ou !== u_attr.u) {
                        notify.notifyFromActionPacket(a);
                    }

                    if (megaChatIsReady) {
                        $.each(a.u, function (k, v) {
                            if (v.c !== 0) {
                                crypt.getPubRSA(v.u);
                            }
                            megaChat[v.c == 0 ? "processRemovedUser" : "processNewUser"](v.u);
                        });
                    }
                    break;

                case 's':
                case 's2':
                    // share modification
                    // (used during share dialog removal of contact from share list)
                    // is this a full share delete?
                    if (a.r === undefined) {
                        // fill DDL with removed contact
                        if (a.u && M.u[a.u] && M.u[a.u].m) {
                            var email = M.u[a.u].m;
                            var contactName = M.getNameByHandle(a.u);

                            addToMultiInputDropDownList('.share-multiple-input', [{ id: email, name: contactName }]);
                            addToMultiInputDropDownList('.add-contact-multiple-input', [{ id: email, name: contactName }]);
                        }
                    }

                    if (a.okd) {
                        M.delNodeShare(a.n, a.u, a.okd);
                    }

                    if (a.a == 's2') {
                        // store ownerkey
                        if (fmdb) {
                            fmdb.add('ok', { h : a.n, d : { k : a.ok, ha : a.ha } });
                        }

                        processPS([a]);
                    }

                    if (fminitialized) {
                        // a full share contains .h param
                        sharedUInode(a.h);
                    }
                    break;

                case 'opc':
                    // outgoing pending contact
                    processOPC([a]);

                    // don't append to sent grid on deletion
                    if (!a.dts) {
                        M.drawSentContactRequests([a]);
                    }
                    break;

                case 'ipc':
                    // incoming pending contact
                    processIPC([a]);
                    M.drawReceivedContactRequests([a]);
                    notify.notifyFromActionPacket(a);
                    break;

                case 'ph':
                    // exported link
                    processPH([a]);
                    break;

                case 'upci':
                    // update to incoming pending contact request
                    processUPCI([a]);
                    break;

                case 'upco':
                    // update to outgoing pending contact request
                    processUPCO([a]);

                    // request is accepted ('2') then this will be followed by a contact packet and we do not need to notify
                    if (a.s != 2) notify.notifyFromActionPacket(a);
                    break;

                case 'ua':
                    mega.attr.handleUserAttributeActionPackets(a, loadavatars);
            }
        } // end of own action packet section
        else {
            switch (a.a) {
                case '_sn':
                    // sn update?
                    if (d) console.log("New SN: " + a.sn);
                    setsn(a.sn);

                    // rewrite accumulated RSA keys to AES to save CPU & bandwidth & space
                    crypto_node_rsa2aes();

                    // rewrite accumulated RSA keys to AES to save CPU & bandwidth & space
                    crypto_share_rsa2aes();

                    // reset state
                    scinshare = Object.create(null);
                    break;

                case '_fm':
                    // completed initial processing, enable UI
                    crypto_fixmissingkeys(missingkeys);
                    loadfm_done();
                    break;

                case 'e':
                    // CMS update
                    var str = hex2bin(a.c || "");
                    if (str.substr(0, 5) === ".cms.") {
                        var cmsType = str.split(".")[2];
                        var cmsId = str.substr(6 + cmsType.length).split(".");
                        CMS.reRender(cmsType, cmsId);
                    }
                    break;

                case 'fa':
                    // file attribute change/addition
                    if (n = M.d[a.n]) {
                        n.fa = a.fa;
                        M.nodeUpdated(n);
                    }
                    break;

                case 's':
                case 's2':
                    if (!folderlink) {
                        var tsharekey = '';
                        var prockey = false;

                        if (a.o === u_handle) {
                            // if access right are undefined, then share is deleted
                            if (typeof a.r == 'undefined') {
                                M.delNodeShare(a.n, a.u, a.okd);
                            }
                            else {
                                var handle = a.n;
                                var shares = Object(M.d[handle]).shares || {};

                                if (a.u in shares || a.ha === crypto_handleauth(a.n)) {

                                    // I updated or created my share
                                    var k = decrypt_key(u_k_aes, base64_to_a32(a.ok));

                                    if (k) {
                                        crypto_setsharekey(handle, k);

                                        if (!a.u) {
                                            // this must be a pending share
                                            if (a.a == 's2') {
                                                // store ownerkey
                                                if (fmdb) {
                                                    fmdb.add('ok', { h : handle, d : { k : a.ok, ha : a.ha } });
                                                }
                                            }
                                            else {
                                                console.error('INVALID SHARE, missing user handle', a);
                                            }
                                        }
                                        else {
                                            M.nodeShare(handle, {
                                                h: a.n,
                                                r: a.r,
                                                u: a.u,
                                                ts: a.ts
                                            });
                                        }
                                    }
                                }
                            }
                        }
                        else {
                            if (a.n && typeof a.k != 'undefined' && !u_sharekeys[a.n]) {
                                if (!Array.isArray(a.k)) {
                                    // XXX: misdirected actionpackets?
                                    srvlog('Got share action-packet with invalid key.');
                                }
                                else {
                                    // a.k has been processed by the worker
                                    crypto_setsharekey(a.n, a.k);
                                    tsharekey = a32_to_base64(u_k_aes.encrypt(a.k));
                                    prockey = true;
                                }
                            }

                            if (a.u == 'EXP') {
                                var exportLink = new mega.Share.ExportLink({ 'nodesToProcess': [a.h] });
                                exportLink.getExportLink();
                            }

                            if ('o' in a) {
                                if (!('r' in a)) {
                                    // share deletion
                                    n = M.d[a.n];

                                    if (n) {
                                        if (a.u === u_handle) {
                                            // incoming share
                                            if (d) {
                                                console.log('Incoming share ' + a.n + " revoked");
                                            }

                                            if (M.d[n.p]) {
                                                // inner share: leave nodes intact, just remove .r/.su
                                                delete n.r;
                                                delete n.su;
                                                delete n.sk;
                                                delete u_sharekeys[a.n];

                                                if (fmdb) {
                                                    fmdb.del('s', a.u + '*' + a.n);
                                                }
                                                M.nodeUpdated(n);
                                            }
                                            else {
                                                // toplevel share: delete entire tree
                                                // (the API will have removed all subshares at this point)
                                                M.delNode(a.n);
                                            }
                                        }
                                        else {
                                            if (a.o === u_handle) {
                                                M.delNodeShare(a.n, a.u);
                                            }
                                        }
                                    }

                                    if (!folderlink && a.u != 'EXP' && fminitialized) {
                                        notify.notifyFromActionPacket({
                                            a: 'dshare',
                                            n: a.n,
                                            u: a.o
                                        });
                                    }
                                }
                                else {
                                    if (d) {
                                        console.log('Inbound share, preparing for receiving its nodes');
                                    }

                                    // if the parent node already exists, all we do is setting .r/.su
                                    // we can skip the subsequent tree; we already have the nodes
                                    if (n = M.d[a.n]) {
                                        n.r = a.r;
                                        n.su = a.o;
                                        M.nodeUpdated(n);

                                        scinshare.skip = true;
                                    }
                                    else {
                                        scinshare.skip = false;
                                        scinshare.h = a.n;
                                        scinshare.r = a.r;
                                        scinshare.sk = a.k;
                                        scinshare.su = a.o;

                                        if (!folderlink && fminitialized) {
                                            notify.notifyFromActionPacket({
                                                a: 'share',
                                                n: a.n,
                                                u: a.o
                                            });
                                        }
                                    }
                                }
                            }
                        }

                        if (prockey) {
                            var nodes = fm_getnodes(a.n, true);

                            for (i = nodes.length; i--; ) {
                                if (n = M.d[nodes[i]]) {
                                    if (typeof n.k == 'string') {
                                        crypto_decryptnode(n);
                                        newnodes.push(M.d[n.h]);
                                    }
                                }
                            }
                        }

                        if (a.a == 's2') {
                            processPS([a]);
                        }

                        if (fminitialized) {
                            sharedUInode(a.n);
                        }
                        scsharesuiupd = true;
                    }
                    break;

                case 'k':
                    // key request
                    if (a.sr) crypto_procsr(a.sr);
                    if (a.cr) crypto_proccr(a.cr);
                    // FIXME: obsolete - remove & replace
                    /*else
                        if (!folderlink) api_req({
                            a: 'k',
                            cr: crypto_makecr(actionPacket.n, [actionPacket.h], true)
                        });*/

                    scsharesuiupd = true;
                    break;

                case 't':
                    // node tree
                    // the nodes have been pre-parsed and stored in scnodes
                    if (scinshare.skip) {
                        // FIXME: do we still need to notify anything here?
                        scinshare.skip = false;
                        break;
                    }
                    var rootNode = scnodes.length && scnodes[0];

                    // is this tree a new inshare with root scinshare.h? set share-relevant
                    // attributes in its root node.
                    if (scinshare.h) {
                        for (i = scnodes.length; i--;) {
                            if (scnodes[i].h === scinshare.h) {
                                scnodes[i].su = scinshare.su;
                                scnodes[i].r = scinshare.r;
                                scnodes[i].sk = scinshare.sk;
                                rootNode = scnodes[i];
                            }
                            else if (M.d[scnodes[i].h]) {
                                delete scnodes[i];
                            }
                        }
                        scinshare.h = false;
                    }

                    // notification logic
                    if (fminitialized && !folderlink && a.ou && a.ou != u_handle
                        && rootNode && rootNode.p && !rootNode.su) {

                        var targetid = rootNode.p;
                        var pnodes = [];

                        for (i = 0; i < scnodes.length; i++) {
                            if (scnodes[i] && scnodes[i].p === targetid) {
                                pnodes.push({
                                    h: scnodes[i].h,
                                    t: scnodes[i].t
                                });
                            }
                        }

                        notify.notifyFromActionPacket({
                            a: 'put',
                            n: targetid,
                            u: a.ou,
                            f: pnodes
                        });
                    }

                    for (i = 0; i < scnodes.length; i++) {
                        if (scnodes[i]) {
                            M.addNode(scnodes[i]);
                        }
                    }

                    if (typeof M.scAckQueue[a.i] === 'function') {
                        M.scAckQueue[a.i]();
                        delete M.scAckQueue[a.i];
                    }
                    break;

                case 'u':
                    // update node attributes
                    if (n = M.d[a.n]) {
                        var oldattr;
                        var oldname = n.name;
                        var oldfav = n.fav;
                        var oldlbl = n.lbl;

                        // key update - no longer supported
                        // API sends keys only for backwards compatibility
                        // if (a.k) n.k = a.k;

                        // attribute update - replaces all existing attributes!
                        if (a.at) {
                            oldattr = crypto_clearattr(n);
                            oldattr.u = n.u;
                            oldattr.ts = n.ts;
                            n.a = a.at;
                        }

                        // owner update
                        if (a.u) n.u = a.u;

                        // timestamp update
                        if (a.ts) n.ts = a.ts;

                        // try to decrypt new attributes
                        crypto_decryptnode(n);

                        // we got a new attribute string, but it didn't pass muster?
                        // revert to previous state (effectively ignoring the SC command)
                        if (a.at && n.a) {
                            if (d) console.warn("Ignored bad attribute update for node " + a.n);
                            crypto_restoreattr(n, oldattr);
                            delete n.a;
                        }
                        else {
                            // success - check what changed and redraw
                            if (M.scAckQueue[a.i]) {
                                // Triggered locally, being DOM already updated.
                                if (d) {
                                    console.log('scAckQueue - triggered locally.', a.i);
                                }
                                delete M.scAckQueue[a.i];
                            }
                            else if (a.at) {
                                if (fminitialized) {
                                    if (n.name !== oldname) {
                                        M.onRenameUIUpdate(n.h, n.name);
                                    }
                                    if (n.fav !== oldfav) {
                                        M.favouriteDomUpdate(n, n.fav);
                                    }
                                    if (n.lbl !== oldlbl) {
                                        M.colourLabelDomUpdate(n.h, n.lbl);
                                    }
                                }
                            }

                            // save modified node
                            M.nodeUpdated(n);
                        }
                    }
                    break;

                case 'c':
                    // contact update
                    process_u(a.u);

                    // contact is deleted on remote computer, remove contact from contacts left panel
                    if (fminitialized && a.u[0].c === 0) {
                        $('#contact_' + a.ou).remove();

                        $.each(a.u, function(k, v) {
                            var userHandle = v.u;

                            // hide the context menu if it is currently visible and this contact was removed.
                            if ($.selected && ($.selected[0] === userHandle)) {

                                // was selected
                                $.selected = [];
                                if ($('.dropdown.body.files-menu').is(":visible")) {
                                    $.hideContextMenu();
                                }
                            }
                        });

                        M.handleEmptyContactGrid();
                    }

                    // only show a notification if we did not trigger the action ourselves
                    if (!pfid && u_attr && a.ou !== u_attr.u) {
                        notify.notifyFromActionPacket(a);
                    }

                    if (megaChatIsReady) {
                        $.each(a.u, function(k, v) {
                            if (v.c !== 0) {
                                crypt.getPubRSA(v.u);
                            }
                            megaChat[v.c == 0 ? "processRemovedUser" : "processNewUser"](v.u);
                        });
                    }
                    break;

                case 'd':
                    // node deletion
                    M.delNode(a.n);

                    // Only show a notification if we did not trigger the action ourselves
                    if (!pfid && u_attr && a.ou !== u_attr.u) {
                        notify.notifyFromActionPacket(a);
                    }
                    break;

                case 'ua':
                    // user attributes
                    if (fminitialized) {
                        var attrs = a.ua;
                        var actionPacketUserId = a.u;

                        for (var j in attrs) {
                            var attributeName = attrs[j];

                            attribCache.uaPacketParser(
                                attributeName,
                                actionPacketUserId,
                                false,
                                a.v && a.v[j] ? a.v[j] : undefined
                            );
                        }
                    }
                    break;

                case 'la':
                    // last seen/acknowledged notification sn
                    notify.countAndShowNewNotifications();
                    break;

                case 'usc':
                    // user state cleared - mark local DB as invalid
                    return fm_forcerefresh();

                // FIXME: duplicated code
                case 'opc':
                    // outgoing pending contact
                    processOPC([a]);

                    if (fminitialized) {
                        M.drawSentContactRequests([a]);
                    }
                    break;

                // FIXME: duplicated code
                case 'ipc':
                    // incoming pending contact
                    processIPC([a]);

                    if (fminitialized) {
                        M.drawReceivedContactRequests([a]);
                    }

                    notify.notifyFromActionPacket(a);
                    break;

                // FIXME: duplicated code
                case 'ph':
                    // exported link
                    processPH([a]);

                    // not applicable - don't return anything, or it will show a blank notification
                    if (typeof a.up !== 'undefined' && typeof a.down != 'undefined') {
                        notify.notifyFromActionPacket(a);
                    }
                    break;

                // FIXME: duplicated code
                case 'upci':
                    processUPCI([a]);
                    break;

                // FIXME: duplicated code
                case 'upco':
                    processUPCO([a]);

                    // if the status is accepted ('2'), then this will be followed
                    // by a contact packet and we do not need to notify
                    if (a.s != 2) {
                        notify.notifyFromActionPacket(a);
                    }
                    break;

                case 'psts':
                    proPage.processPaymentReceived(a);
                    break;

                case 'mcc':
                    // MEGAchat
                    if (!megaChatIsDisabled) {
                        if (megaChatIsReady) {
                            $(window).trigger('onChatdChatUpdatedActionPacket', a);
                        }
                        else if (typeof ChatdIntegration !== 'undefined') {
                            ChatdIntegration._queuedChats[a.id] = a;
                        }
                        else if (Array.isArray(loadfm.chatmcf)) {
                            loadfm.chatmcf.push(a);
                        }
                        else if (d) {
                            console.error('FIXME: unable to parse mcc packet');
                        }
                    }
                    if (fmdb) {
                        delete a.a;
                        fmdb.add('mcf', { id : a.id, d : a });
                    }
                    break;

                case 'se':
                    // set email
                    var emailChangeAccepted = (a.s == 3
                                               && typeof a.e == 'string'
                                               && a.e.indexOf('@') != -1);

                    if (emailChangeAccepted) {
                        var user = M.getUserByHandle(a.u);

                        if (user) {
                            user.m = a.e;
                            process_u([user]);

                            if (a.u === u_handle) {
                                u_attr.email = user.m;

                                if (M.currentdirid === 'account/profile') {
                                    $('.nw-fm-left-icon.account').trigger('click');
                                }
                            }
                        }
                    }
                    break;

                default:
                    if (d) {
                        console.log('Ignoring unsupported SC command', a);
                    }
            }
        }

        tickcount++;
    } while (Date.now()-tick < 200);

    if (d) console.log("Processed " + tickcount + " SC commands in the past 200 ms");
    setTimeout(execsc, 1);
}

// a node was updated significantly: write to DB and redraw
function fm_updated(n) {
    M.nodeUpdated(n);

    if (fminitialized) {
        removeUInode(n.h);
        newnodes.push(n);
        if (M.megaRender) delete M.megaRender.nodeMap[n.h];
        renderNew();
    }
}

var treelogger;

// load tree for active GLOBAL context - either we load a folderlink or the user tree,
// they never coexist, there is no encapsulation/separation of state.
// (this "constructor" merely initialises the relevant *global* variables!)
// FIXME: remove all global state and allow multiple client states to coexist peacefully
function TreeFetcher() {
    // next round-robin worker to assign
    nextworker = 0;

    // mapping of parent node to worker (to keep child nodes local to their sharekeys)
    parentworker = {};

    // worker pending state dump counter
    dumpsremaining = 0;

    // residual fm (minus ok/f elements) post-filtration
    residualfm = false;

    // console logging
    treelogger = MegaLogger.getLogger('TreeFetcher');

    // erase existing RootID
    // reason: tree_node must set up the workers as soon as the first node of a folder
    // link arrives, and this is how it knows that it is the first node.
    M.RootID = false;
}

// worker pool
var workers;

function killworkerpool() {
    // terminate existing workers
    if (workers) {
        var l = workers.length;
        while (l--) {
            workers[l].onmessage = null;
            workers[l].terminate();
        }

        // workers === false implies "no workers available here"
        workers = false;
    }
}
function initworkerpool() {
    killworkerpool();

    workers = [];
    var workerstate;

    if (!pfid) {
        // worker state for a user account fetch
        workerstate = {
            u_handle : u_handle,
            u_privk  : u_privk,
            u_k      : u_k,
            d        : d
        };
    }
    var workerURL = mega.nodedecBlobURI;
    if (!workerURL) {
        workerURL = 'nodedec.js';

        if (!is_extension && !is_karma) {
            workerURL = '/' + workerURL;
        }
    }

    for (var i = Math.min(mega.maxWorkers, 10); i--;) {
        try {
            var w = new Worker(workerURL);

            w.onmessage = worker_procmsg;
            w.onerror   = function(err) {
                console.error('[nodedec worker error]', err);

                // TODO: retry gettree
                killworkerpool();
            };
            if (workerstate) {
                w.postMessage(workerstate);
            }
            workers.push(w);
        }
        catch (ex) {
            console.error(ex);
            if (!workers.length) {
                workers = null;
            }
            break;
        }
    }

    if (d) {
        console.debug('initworkerpool', workerURL, workers && workers.length);
    }
}

// queue a DB invalidation-plus-reload request to the FMDB subsystem
// if it isn't up, reload directly
// the server-side treecache is wiped (otherwise, we could run into
// an endless loop)
function fm_forcerefresh() {
    localStorage.force = 1;

    if (fmdb && !fmdb.crashed) {
        execsc = function() {}; // stop further SC processing
        fmdb.invalidate(function(){
            location.reload();
        });
    }
    else {
        location.reload();
    }
}

// initiate fetch of node tree
// FIXME: what happens when the user pastes a folder link over his loaded/loading account?
TreeFetcher.prototype.fetch = function treefetcher_fetch(force) {
    var req_params = {
        a: 'f',
        c: 1,
        r: 1
    };

    // we disallow treecache usage if this is a forced reload
    force = force || localStorage.force;
    if (!force) {
        req_params.ca = 1;
    }
    else if (mBroadcaster.crossTab.master) {
        delete localStorage.force;
    }

    if (!megaChatIsDisabled && typeof Chatd !== 'undefined') {
        req_params['cv'] = Chatd.VERSION;
    }

    api_req(req_params, {
        progress: function(perc) {
            loadingInitDialog.step2(parseInt(perc));    // FIXME: make generic

            if (perc > 99 && !mega.loadReport.ttlb) {
                // Load performance report -- time to last byte
                mega.loadReport.ttlb          = Date.now() - mega.loadReport.stepTimeStamp;
                mega.loadReport.stepTimeStamp = Date.now();

                mega.loadReport.ttlb += mega.loadReport.ttfb;
                mega.loadReport.ttfm = mega.loadReport.stepTimeStamp;
            }
        }
    }, 4);
};

// triggers a full reload including wiping the remote treecache
// (e.g. because the treecache is damaged or too old)
function fm_fullreload(q, logMsg) {
    if (q) {
        api_cancel(q);
    }

    // FIXME: properly encapsulate ALL client state in an object
    // that supports destruction.
    // (at the moment, if we wipe the DB and then call loadfm(),
    // there will be way too much attribute, key and chat stuff already
    // churning away - we simply cannot just delete their databases
    // without restarting them.
    // until then - it's the sledgehammer method; can't be anything
    // more surgical :(
    localStorage.force = 1;

    // done reload callback
    var step = 1;
    var done = function() {
        if (!--step) {
            location.reload();
        }
    };

    // log event if message provided
    if (logMsg) {
        api_req({a: 'log', e: 99624, m: logMsg}, {callback: done});
        step++;
    }

    if (fmdb) {
        // bring DB to a defined state
        fmdb.invalidate(done);
    }
    else {
        done();
    }
}

// FIXME: make part of comprehensive client state object
var nextworker;
var parentworker = {};

// get next worker index (round robin)
function treefetcher_getnextworker() {
    if (nextworker >= workers.length) {
        nextworker = 0;
    }
    return nextworker++;
};

// this receives the ok elements one by one as per the filter rule
// to facilitate the decryption of outbound shares, the API now sends ok before f
function tree_ok0(ok) {
    if (fmdb) {
        fmdb.add('ok', { h : ok.h, d : ok });
    }

    // bind outbound share root to specific worker, post ok element to that worker
    // FIXME: check if nested outbound shares are returned with all shareufskeys!
    // if that is not the case, we need to bind all ok handles to the same worker
    if (workers) {
        workers[parentworker[ok.h] = treefetcher_getnextworker()].postMessage(ok);
    }
    else if (crypto_handleauthcheck(ok.h, ok.ha)) {
        if (d) console.log("Successfully decrypted sharekeys for " + ok.h);
        var key = decrypt_key(u_k_aes, base64_to_a32(ok.k));
        u_sharekeys[ok.h] = [key, new sjcl.cipher.aes(key)];
    }
    else {
        treelogger.error("handleauthcheck() failed for " + ok.h);
    }
};

// returns true if no further processing is needed
// FIXME: move to M
// FIXME: call from M.addNode() to avoid code duplication
function emplacenode(node) {
    if (node.p) {
        // we have to add M.c[sharinguserhandle] records explicitly as
        // node.p has ceased to be the sharing user handle
        if (node.su) {
            if (!M.c[node.su]) {
                M.c[node.su] = [];
            }
            M.c[node.su][node.h] = node.t + 1;
        }

        if (!M.c[node.p]) {
            M.c[node.p] = [];
        }
        M.c[node.p][node.h] = node.t + 1;
        if (node.hash) {
            if (!M.h[node.hash]) {
                M.h[node.hash] = [];
            }
            M.h[node.hash].push(node.h);
        }
    }
    else if (node.t > 1 && node.t < 5) {
        M[['RootID', 'InboxID', 'RubbishID'][node.t - 2]] = node.h;
    }
    else {
        console.error("Received parent-less node of type " + node.t + ": " + node.h);

        srvlog2('parent-less', node.t, node.h);
    }

    M.d[node.h] = node;
}

// this receives the node objects one by one as per the filter rule
function tree_node(node) {
    if (pfkey && !M.RootID) {
        // set up the workers for folder link decryption
        workerstate = {
            n_h   : node.h,
            pfkey : pfkey,
            d: d
        };

        if (workers) {
            for (var i = workers.length; i--; ) workers[i].postMessage(workerstate);
        }
        else {
            var key = base64_to_a32(pfkey);
            u_sharekeys[node.h] = [key, new sjcl.cipher.aes(key)];
        }

        M.RootID = node.h;
    }

    crypto_rsacheck(node);

    // RSA share key? need to rewrite, too.
    if (node.sk && node.sk.length > 43) {
        rsasharekeys[node.h] = true;
    }

    // children inherit their parents' worker bindings; unbound inshare roots receive a new binding
    // unbound nodes go to a random worker (round-robin assignment)
    if (!workers) {
        crypto_decryptnode(node);
        worker_procmsg({data: node});
    }
    else if (node.p && parentworker[node.p] >= 0) {
        workers[parentworker[node.h] = parentworker[node.p]].postMessage(node);
    }
    else if (parentworker[node.h] >= 0) {
        workers[parentworker[node.h]].postMessage(node);
    }
    else if (node.sk) {
        workers[parentworker[node.h] = treefetcher_getnextworker()].postMessage(node);
    }
    else {
        workers[treefetcher_getnextworker()].postMessage(node);
    }
};

// FIXME: move all of these globals to a future "ClientSession" global object encapsulating
// all state and functionality
var residualfm;
var dumpsremaining;

// this receives the remainder of the JSON after the filter was applied
function tree_residue(fm, ctx) {
    // store the residual f response for perusal once all workers signal that they're done
    residualfm = fm[0];

    // request an "I am done" confirmation ({}) from all workers
    if (workers) {
        var i = workers.length;
        dumpsremaining = i;

        while (i--) {
            workers[i].postMessage({});
        }
    }
    else {
        dumpsremaining = 1;
        worker_procmsg({ data: { done: 1 } });
    }

    // (mandatory steps at the conclusion of a successful split response)
    api_ready(this.q);
    api_proc(this.q);
};

// process worker responses (decrypted nodes, processed actionpackets, state dumps...)
function worker_procmsg(ev) {
    var h;

    if (ev.data.scqi >= 0) {
        // enqueue processed actionpacket
        if (scq[ev.data.scqi]) scq[ev.data.scqi][0] = ev.data;
        else scq[ev.data.scqi] = [ev.data, []];

        // resume processing, if appropriate and needed
        resumesc();
    }
    else if (ev.data.h) {
        // enqueue or emplace processed node
        if (ev.data.t < 2 && !crypto_keyok(ev.data)) {
            // report as missing
            crypto_reportmissingkey(ev.data);
        }

        if (ev.data.scni >= 0) {
            // enqueue processed node
            if (scq[ev.data.scni]) scq[ev.data.scni][1].push(ev.data);
            else scq[ev.data.scni] = [null, [ev.data]];

            if (!--nodesinflight[ev.data.scni]) {
                delete nodesinflight[ev.data.scni];

                // resume processing, if appropriate and needed
                resumesc();
            }
        }
        else {
            // maintain special incoming shares index
            if (ev.data.su) {
                M.c.shares[ev.data.h] = { su : ev.data.su, r : ev.data.r, t: ev.data.h };

                if (u_sharekeys[ev.data.h]) {
                    M.c.shares[ev.data.h].sk = u_sharekeys[ev.data.h][0];
                }
            }

            if (fmdb) {
                fmdb.add('f', {
                    h : ev.data.h,
                    p : ev.data.p,
                    s : ev.data.s >= 0 ? ev.data.s : -ev.data.t,
                    d : ev.data
                });

                if (ev.data.hash) {
                    fmdb.add('h', {h: ev.data.h, c: ev.data.hash});
                }
            }

            emplacenode(ev.data);
        }
    }
    else if (ev.data[0] === 'console') {
        if (d) {
            var args = ev.data[1];
            args.unshift('[nodedec worker]');
            console.log.apply(console, args);
        }
    }
    else if (ev.data[0] === 'srvlog2') {
        srvlog2.apply(null, ev.data[1]);
    }
    else if (ev.data.done) {
        if (d) console.log("Worker done, " + dumpsremaining + " remaining");

        if (ev.data.sharekeys) {
            for (h in ev.data.sharekeys) {
                crypto_setsharekey(h, ev.data.sharekeys[h]);
            }
        }

        if (!--dumpsremaining) {
            // store incoming shares
            for (h in M.c.shares) {
                if (u_sharekeys[h]) M.c.shares[h].sk = a32_to_base64(u_sharekeys[h][0]);

                if (fmdb) {
                    fmdb.add('s', { o_t : M.c.shares[h].su + '*' + h,
                                          d : M.c.shares[h] });
                }
            }

            loadfm_callback(residualfm);
            residualfm = false;
        }
    }
    else {
        console.error("Unidentified nodedec worker response:", ev.data);
    }
}

// the FM DB engine (cf. mDB.js)
var fmdb;

function loadfm(force) {
    if (force) {
        localStorage.force = true;
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
            if (workers !== false) {
                initworkerpool();
            }
            M.reset();

            fminitialized  = false;
            loadfm.loading = true;

            // is this a folder link? or do we have no valid cache for this session?
            if (pfid) {
                fmdb = false;
                fetchfm(false);
            }
            else {
                fmdb = FMDB(u_handle, {
                    // channel 0: transactional by _sn update
                    f   : '&h, p, s',   // nodes - handle, parent, size (negative size: type)
                    s   : '&o_t',       // shares - origin/target; both incoming & outgoing
                    ok  : '&h',         // ownerkeys for outgoing shares - handle
                    mk  : '&h',         // missing node keys - handle
                    u   : '&u',         // users - handle
                    h   : '&h, c',      // hashes - handle, checksum
                    ph  : '&h',         // exported links - handle
                    opc : '&p',         // outgoing pending contact - id
                    ipc : '&p',         // incoming pending contact - id
                    ps  : '&h_p',       // pending share - handle/id
                    mcf : '&id',        // chats - id
                    ua  : '&k',         // user attributes - key (maintained by IndexedBKVStorage)
                    _sn : '&i',         // sn - fixed index 1

                    // channel 1: non-transactional (maintained by IndexedDBKVStorage)
                    chatqueuedmsgs : '&k', // queued chat messages - k
                    pta: '&k' // persisted type messages - k
                }, {
                    chatqueuedmsgs : 1,
                    pta: 1
                });

                fmdb.init(fetchfm, localStorage.force);
            }
        }
    }
}

function fetchfm(sn) {
    // we always intially fetch historical actionpactions
    // before showing the filemanager
    initialscfetch = true;

    if (!is_mobile) {
        // activate/prefetch attribute cache at this early stage
        attribCache.prefillMemCache(fmdb).then(function() {

            if (sn) {
                currsn = sn;
                dbfetchfm();
            }
            else {
                // no cache requested or available - get from API
                loadFromApi();
            }
        });
    }
    else {
        loadFromApi();
    }
}

/**
 * No cache requested or available - get from API
 */
function loadFromApi() {

    fetcher = new TreeFetcher();
    fetcher.fetch();

    mega.loadReport.mode = 2;

    if (!folderlink) {
        // dbToNet holds the time wasted trying to read local DB, and having found we have to query the server.
        mega.loadReport.dbToNet       = Date.now() - mega.loadReport.startTime;
        mega.loadReport.stepTimeStamp = Date.now();
    }
}

// to reduce peak mem usage, we fetch f in 64 small chunks
function fetchfchunked(chunk, procresult) {
    fmdb.get('f', function(r) {
        for (var i = r.length; i--;) emplacenode(r[i]);
        if (chunk == 64) procresult();
        else fetchfchunked(chunk, procresult);
    }, 'h', b64[chunk++]);
}

function fetchfroot(/*chunk,*/ cb) {
    // fetch the three root nodes
    fmdb.getbykey('f', 'h', ['s', ['-2', '-3', '-4']], false, function(r) {
        for (var i = r.length; i--; ) emplacenode(r[i]);
        // fetch all top-level nodes
        fmdb.getbykey('f', 'h', ['p', [M.RootID, M.InboxID, M.RubbishID]], false, function(r) {
            var folders = [];
            for (var i = r.length; i--; ) {
                emplacenode(r[i]);
                if (r[i].t == 1) folders.push(r[i].h);
            }
            // fetch second-level nodes (to show the little arrows in the tree)
            // FIXME: add further loading as needed to the fmconfig processing of
            // opened subfolders in the tree!
            fmdb.getbykey('f', 'h', ['p', folders], false/*[[ 't', '2' ]]*/, function(r) {
                for (var i = r.length; i--; ) emplacenode(r[i]);
                cb();
            });
        });
    });
}

// fetch all children; also, fetch path to root
// populates M.c and M.d
function fetchchildren(parent, cb) {
    // is this a user handle or a non-handle? no fetching needed.
    if (parent.length != 8) {
        cb();
    }
    // have the children been fetched yet?
    else if (!M.c[parent]) {
        // no: do so now.
        fmdb.getbykey('f', 'h', ['p', [parent]], false, function(r) {
            M.c[parent] = {};
            for (var i = r.length; i--; ) emplacenode(r[i]);
            fetchchildren(parent, cb);
        });
    }
    // has the parent been fetched yet?
    else if (!M.d[parent]) {
        fmdb.getbykey('f', 'h', ['h', [parent]], false, function(r) {
            if (r.length) {
                // parent found
                emplacenode(r[0]);
                fetchchildren(r[0].p, cb);
            }
            else {
                // no parent found (internal error, should probably reload)
                console.error("Parent of " + parent + " missing from DB");
                cb();
            }
        });
    }
    else {
        // crawl back to root (not necessary until we start purging from memory)
        fetchchildren(M.d[parent].p, cb);
    }
}

function dbfetchfm() {
    var i;

    loadingInitDialog.step2();

    fmdb.get('ok', function(r){
        process_ok(r, true);

        // FIXME: remove this step and replace with dynamic on-demand loading
//        fetchfroot(/*0,*/ function(r){
        fetchfchunked(0, function(r){

            mega.loadReport.recvNodes     = Date.now() - mega.loadReport.stepTimeStamp;
            mega.loadReport.stepTimeStamp = Date.now();

            fmdb.get('mk', function(r){
                crypto_missingkeysfromdb(r);

                fmdb.get('u', function(r){
                    process_u(r, true);

                    fmdb.get('s', function(r){
                        for (i = r.length; i--; ) {
                            if (r[i].su) {
                                // this is an inbound share
                                M.c.shares[r[i].t] = r[i];
                                if (r[i].sk) {
                                    crypto_setsharekey(r[i].t, base64_to_a32(r[i].sk), true);
                                }
                            }
                            else {
                                // this is an outbound share
                                M.nodeShare(r[i].h, r[i], true);
                            }
                        }

                        fmdb.get('opc', function(r){
                            processOPC(r, true);

                            fmdb.get('ipc', function(r){
                                processIPC(r, true);

                                fmdb.get('ps', function(r){
                                    processPS(r, true);

                                    fmdb.get('mcf', function(r){
                                        loadfm.chatmcf = r;

                                        mega.loadReport.procNodeCount = Object.keys(M.d || {}).length;
                                        mega.loadReport.procNodes     = Date.now() - mega.loadReport.stepTimeStamp;
                                        mega.loadReport.stepTimeStamp = Date.now();

                                        if (!mBroadcaster.crossTab.master) {
                                            // on a secondary tab, prevent writing to DB once we have read its contents
                                            fmdb.crashed = 'slave';
                                        }

                                        // fetch & process new actionpackets
                                        loadingInitDialog.step3();
                                        getsc(true);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

function rightsById(id) {

    if (folderlink || (id && id.length > 8)) {
        return false;
    }

    while (M.d[id] && M.d[id].p) {
        if (M.d[id].r >= 0) {
            return M.d[id].r;
        }
        id = M.d[id].p;
    }

    return 2;
}

// returns true if h1 cannot be moved into h2 without creating circular linkage, false otherwise
function isCircular(h1, h2) {
    for (;;) {
        if (h1 == h2) return true;

        if (!M.d[h2]) return false;

        h2 = M.d[h2].p;
    }
}

function RootbyId(id)
{
    if (id)
        id = id.replace('chat/', '');
    var p = M.getPath(id);
    return p[p.length - 1];
}

// returns tree type h is in
// FIXME: make result numeric
function treetype(h) {
    for (;;) {
        if (!M.d[h]) {
            return h;
        }

        // root node reached?
        if (M.d[h].t > 1) {
            return 'cloud';
        }

        // incoming share reached? (does not need to be the outermost one)
        if (M.d[h].su) {
            return 'shares';
        }

        if ('contacts shares messages opc ipc '.indexOf(M.d[h].p + ' ') >= 0) {
            return M.d[h].p;
        }

        h = M.d[h].p;
    }
}

// returns sharing user (or false if not in an inshare)
function sharer(h) {
    while (h && M.d[h]) {
        if (M.d[h].su) {
            return M.d[h].su;
        }

        h = M.d[h].p;
    }

    return false;
}

// FIXME: remove alt
function ddtype(ids, toid, alt) {
    if (folderlink) {
        return false;
    }

    var r = false, totype = treetype(toid);

    for (var i = ids.length; i--; ) {
        var fromid = ids[i];

        if (fromid === toid || !M.d[fromid]) return false;

        var fromtype = treetype(fromid);

        if (totype == 'cloud') {
            if (fromtype == 'cloud') {
                // within and between own trees, always allow move ...
                if (isCircular(fromid, toid)) {
                    // ... except of a folder into itself or a subfolder
                    return false;
                }

                r = 'move';
            }
            else if (fromtype == 'shares') {
                r = (toid === M.RubbishID) ? 'copydel' : 'copy';
            }
        }
        else if (totype == 'contacts') {
            if (toid == 'contacts') {
                // never allow move to own contacts
                return false;
            }

            // to a contact, always allow a copy (inbox drop)
            r = 'copy';
        }
        else if (totype === 'shares' && rightsById(toid)) {
            if (fromtype == 'shares') {
                if (sharer(fromid) === sharer(toid)) {
                    if (isCircular(fromid, toid)) {
                        // prevent moving/copying of a folder into iself or a subfolder
                        return false;
                    }

                    r = (rightsById(fromid) > 1) ? 'move' : 'copy';
                }
                else {
                    r = 'copy';
                }
            }
            else if (fromtype == 'cloud') {
                // from cloud to a folder with write permission, always copy
                r = 'copy';
            }
        }
        else {
            return false;
        }
    }

    // FIXME: do not simply return the operation allowed for the last processed fromid
    return r;
}

// returns all nodes under root (the entire tree)
// optionally includes root itself
// optionally prunes everything that's undecryptable - good nodes
// under a bad parent will NOT be returned to keep the result tree-shaped.
// FIXME: add reporting about how many nodes were dropped in the process
function fm_getnodes(root, includeroot, excludebad) {
    var nodes = [];
    var parents = [root], newparents;
    var i;

    while (i = parents.length) {
        newparents = [];

        while (i--) {
            // must exist and optionally be fully decrypted to qualify
            if (M.d[parents[i]] && (!excludebad || !M.d[parents[i]].a)) {
                nodes.push(parents[i]);
                if (M.c[parents[i]]) {
                    newparents = newparents.concat(Object.keys(M.c[parents[i]]));
                }
            }
        }

        parents = newparents;
    }

    if (!includeroot) nodes.shift();

    return nodes;
}

// get all parent nodes having a u_sharekey
// optionally, return the path root
function fm_getsharenodes(h, root) {
    var sn = [];
    var n = M.d[h];

    while (n && n.p) {
        if (u_sharekeys[n.h])
            sn.push(n.h);
        n = M.d[n.p];
    }

    if (root) {
        root.handle = n && n.h;
    }

    return sn;
}

// get all clean (decrypted) subtrees under cn
// FIXME: return total number of nodes omitted because of decryption issues
function fm_getcopynodes(cn, t) {
    var a = [];
    var r = [];
    var i, j;

    // add all subtrees under cn[], including the roots
    for (i = 0; i < cn.length; i++) {
        r = r.concat(fm_getnodes(cn[i], true, true));
    }

    for (i = 0; i < r.length; i++) {
        var n = M.d[r[i]];

        // repackage/-encrypt n for processing by the `p` API
        nn = {};

        // copied folders receive a new random key
        // copied files must retain their existing key
        if (!n.t) nn.k = n.k;

        // new node inherits all attributes
        nn.a = ab_to_base64(crypto_makeattr(n, nn));

        // new node inherits handle, parent and type
        nn.h = n.h;
        nn.p = n.p;
        nn.t = n.t;

        // remove parent unless child
        for (j = 0; j < cn.length; j++) {
            if (cn[j] === nn.h) {
                delete nn.p;
                break;
            }
        }

        a.push(nn);
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

    var n = { name: name },
        attr = ab_to_base64(crypto_makeattr(n)),
        key = a32_to_base64(encrypt_key(u_k_aes, n.k)),
        req = { a: 'p', t: toid, n: [{ h: 'xxxxxxxx', t: 1, a: attr, k: key }], i: requesti },
        sn = fm_getsharenodes(toid);

    if (sn.length) {
        req.cr = crypto_makecr([n], sn, false);
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
                $('.create-new-folder input').val('');
                newnodes = [];

                // this is only safe once sn enforcement has been deployed
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
    var childNodesId = fm_getnodes(nodeId, true);

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

// moving a foreign node (one that is not owned by u_handle) from an outshare
// to a location not covered by any u_sharekey requires taking ownership
// and re-encrypting its key with u_k.
// moving a tree to a (possibly nested) outshare requires a full set of keys
// to be provided. FIXME: record which keys are known to the API and exclude
// those that are to reduce API traffic.
function processmove(apireq) {
    if (d) console.log('processmove', apireq);

    var root = {};
    var tsharepath = fm_getsharenodes(apireq.t);
    var nsharepath = fm_getsharenodes(apireq.n, root);
    var movingnodes = false;

    // is the node to be moved in an outshare (or possibly multiple nested ones)?
    if (nsharepath.length && root.handle) {
        // yes, it is - are we moving to an outshare?
        if (!tsharepath.length) {
            // we are not - check for any foreign nodes being moved
            movingnodes = fm_getnodes(apireq.n, true);

            var foreignnodes = [];

            for (var i = movingnodes.length; i--; ) {
                if (M.d[movingnodes[i]].u != u_handle) {
                    foreignnodes.push(movingnodes[i]);
                }
            }

            if (foreignnodes.length) {
                if (d) console.log('rekeying foreignnodes', foreignnodes.length);

                // update all foreign nodes' keys and take ownership
                api_updfkey(movingnodes);
            }
        }
    }

    // is the target location in any shares? add CR element.
    if (tsharepath.length) {
        if (!movingnodes) {
            movingnodes = fm_getnodes(apireq.n, true);
        }

        apireq.cr = crypto_makecr(movingnodes, tsharepath, true);
    }
}

function process_f(f, cb) {
    if (f) {
        for (var i = 0; i < f.length; i++) {
            M.addNode(f[i]);
        }

        if (cb) {
            cb(newmissingkeys && M.checkNewMissingKeys());
        }
    }
    else if (cb) cb();
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

    for (var i = publicHandles.length; i--; ) {
        value = publicHandles[i];

        nodeId = value.h;
        if (!M.d[nodeId]) continue;

        if (fmdb) {
            if (value.d) {
                fmdb.del('ph', nodeId);
            }
            else {
                fmdb.add('ph', { h : nodeId });
            }
        }

        publicHandleId = value.ph;

        // remove exported link, down: 1
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

            if (M.d[nodeId].ph !== publicHandleId) {
                M.d[nodeId].ph = publicHandleId;
                M.nodeUpdated(M.d[nodeId]);
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
                    M.nodeShare(nodeHandle, {
                        h: ps.n,
                        o: ps.n,
                        p: ps.p,
                        u: ps.u,
                        r: ps.r,
                        ts: ps.ts
                    });
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
function process_u(u, ignoreDB) {
    for (var i in u) {
        if (u.hasOwnProperty(i)) {
            if (u[i].c === 1) {
                u[i].h = u[i].u;
                u[i].t = 1;
                u[i].p = 'contacts';
                M.addNode(u[i], ignoreDB);

                var contactName = M.getNameByHandle(u[i].h);

                // Update token.input plugin
                addToMultiInputDropDownList('.share-multiple-input', [{ id: u[i].m, name: contactName }]);
                addToMultiInputDropDownList('.add-contact-multiple-input', [{ id: u[i].m, name: contactName }]);
            }
            else if (M.d[u[i].u]) {
                M.delNode(u[i].u, ignoreDB);

                // Update token.input plugin
                removeFromMultiInputDDL('.share-multiple-input', { id: u[i].m, name: u[i].m });
                removeFromMultiInputDDL('.add-contact-multiple-input', { id: u[i].m, name: u[i].m });
            }

            // Update user attributes M.u
            M.addUser(u[i], ignoreDB);

            if (u[i].c === 1) {
                // sync data objs M.u <-> M.d
                M.d[u[i].u] = M.u[u[i].u];
            }
        }
    }

    if (M.currentdirid === 'dashboard') {
        delay('dashboard:updcontacts', dashboardUI.updateContactsWidget);
    }
}

function process_ok(ok, ignoreDB) {
    for (var i = ok.length; i--; ) {
        if (ok[i].ha == crypto_handleauth(ok[i].h))
        {
            if (fmdb && !pfkey && !ignoreDB) {
                fmdb.add('ok', { h : ok[i].h, d : ok[i] });
            }
            crypto_setsharekey(ok[i].h, decrypt_key(u_k_aes, base64_to_a32(ok[i].k)), ignoreDB);
        }
    }
}

function processMCF(mcfResponse, ignoreDB) {

    if (typeof ChatdIntegration !== 'undefined') {
        ChatdIntegration.requiresUpdate = true;
    }

    if (mcfResponse === EEXPIRED) {
        return;
    }

    // reopen chats from the MCF response.
    if (typeof mcfResponse !== 'undefined' && typeof mcfResponse.length !== 'undefined' && mcfResponse.forEach) {
        mcfResponse.forEach(function (chatRoomInfo) {
            if (chatRoomInfo.active === 0) {
                // skip non active chats for now...
                return;
            }
            if (fmdb && !pfkey && !ignoreDB) {
                fmdb.add('mcf', { id : chatRoomInfo.id, d : chatRoomInfo });
            }

            if (typeof ChatdIntegration !== 'undefined') {
                ChatdIntegration._queuedChats[chatRoomInfo.id] = chatRoomInfo;
            }
        });

        if (typeof ChatdIntegration !== 'undefined') {
            ChatdIntegration.deviceId = mcfResponse.d;

            ChatdIntegration.mcfHasFinishedPromise.resolve(mcfResponse);
        }
    }
    else if (typeof ChatdIntegration !== 'undefined') {
        ChatdIntegration.mcfHasFinishedPromise.reject(mcfResponse);
    }
}

function folderreqerr()
{
    loadingDialog.hide();
    loadingInitDialog.hide();

    loadfm.loaded = false;
    loadfm.loading = false;

    msgDialog('warninga', l[1043], l[1044] + '<ul><li>' + l[1045] + '</li><li>' + l[247] + '</li><li>' + l[1046] + '</li>', false, function()
    {
        loadSubPage('login'); // if the user is logged-in, he'll be redirected to the cloud

        // FIXME: no location.reload() should be needed..
        location.reload();
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

        if (!loadfm.loading) {
            loadingDialog.hide();
            loadingInitDialog.hide();
        }
    }

    if (pfid) {
        if (d) console.log('Will not initialize chat [branch:1]');
    }
    else {
        authring.onAuthringReady('chat').done(__init_chat);
    }
}

function loadfm_callback(res) {
    if (res[0] == '-') {
        msgDialog('warninga', l[1311], "Sorry, we were unable to retrieve the Cloud Drive contents.", api_strerror(res));
        return;
    }

    loadingInitDialog.step3();

    mega.loadReport.recvNodes     = Date.now() - mega.loadReport.stepTimeStamp;
    mega.loadReport.stepTimeStamp = Date.now();

    if (pfkey) {
        folderlink = pfid;
    }

    if (res.noc) {
        mega.loadReport.noc = res.noc;
    }
    if (res.tct) {
        mega.loadReport.tct = res.tct;
    }
    if (res.ok && !res.ok0) {
        // this is a legacy cached tree without an ok0 element
        process_ok(res.ok);
    }
    if (res.u) {
        process_u(res.u);
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
    if (res.mcf) {
        // save the response to be processed later once chat files were loaded
        loadfm.chatmcf = res.mcf.c || res.mcf;
        // ensure the response is saved in fmdb, even if the chat is disabled or not loaded yet
        processMCF(loadfm.chatmcf);
    }
    M.avatars();
    loadfm.fromapi = true;

    process_f(res.f, function onLoadFMDone(hasMissingKeys) {

        // Check if the key for a folderlink was correct
        if (folderlink && missingkeys[M.RootID]) {
            loadingDialog.hide();
            loadingInitDialog.hide();

            loadfm.loaded = false;
            loadfm.loading = false;

            return mKeyDialog(pfid, true, true)
                .fail(function() {
                    loadSubPage('start');
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

        // Handle public/export links. Why here? Make sure that M.d already exists
        if (res.ph) {
            processPH(res.ph);
        }

        // decrypt hitherto undecrypted nodes
        crypto_fixmissingkeys(missingkeys);

        // commit transaction and set sn
        setsn(res.sn);
        currsn = res.sn;

        if (res.cr) {
            crypto_procmcr(res.cr);
        }

        if (res.sr) {
            crypto_procsr(res.sr);
        }

        mega.loadReport.procNodeCount = Object.keys(M.d || {}).length;
        mega.loadReport.procNodes     = Date.now() - mega.loadReport.stepTimeStamp;
        mega.loadReport.stepTimeStamp = Date.now();

        // retrieve initial batch of action packets, if any
        // we'll then complete the process using loadfm_done
        getsc(true);

        if (hasMissingKeys) {
            srvlog('Got missing keys processing gettree...', null, true);
        }
    });
}

/**
 * Function to be invoked when the cloud has finished loading,
 * being the nodes loaded from either server or local cache.
 */
function loadfm_done(mDBload) {
    mDBload = mDBload || !loadfm.fromapi;

    loadfm.loaded = Date.now();
    loadfm.loading = false;
    loadfm.fromapi = false;

    if (d > 1) console.error('loadfm_done', is_fm());

    mega.loadReport.procAPs       = Date.now() - mega.loadReport.stepTimeStamp;
    mega.loadReport.stepTimeStamp = Date.now();

    if (!pfid && u_type == 3) {

        // load/initialise the authentication system
        mega.config.fetch()
            .always(function() {
                authring.initAuthenticationSystem();
            });
    }

    mega.config.ready(function() {
        var hideLoadingDialog = (!is_mobile && !CMS.isLoading());

        if ((location.host === 'mega.nz' || !megaChatIsDisabled) && !is_mobile) {

            if (!pfid && u_type === 3 && !loadfm.chatloading) {
                loadfm.chatloading = true;

                mega.utils.require('chat')
                    .always(function() {

                        if (typeof ChatRoom !== 'undefined') {

                            if (loadfm.chatmcf) {
                                processMCF(loadfm.chatmcf, true);
                                loadfm.chatmcf = null;
                            }
                            init_chat();
                        }
                        else {
                            // FIXME: this won't be reached because the request will fail silently
                            console.error('Chat resources failed to load...');
                        }

                        loadfm.chatloading = false;
                        loadfm.chatloaded  = Date.now();
                    });

                if (getSitePath().substr(0, 8) === '/fm/chat') {
                    // Keep the "decrypting" step until the chat have loaded.
                    hideLoadingDialog = false;
                }
            }
        }

        mega.loadReport.fmConfigFetch = Date.now() - mega.loadReport.stepTimeStamp;
        mega.loadReport.stepTimeStamp = Date.now();

        // are we actually on an #fm/* page?
        if (page !== 'start' && is_fm() || $('.fm-main.default').is(":visible")) {
            renderfm();

            mega.loadReport.renderfm      = Date.now() - mega.loadReport.stepTimeStamp;
            mega.loadReport.stepTimeStamp = Date.now();

            // load report - time to fm after last byte received
            mega.loadReport.ttfm = Date.now() - mega.loadReport.ttfm;
        }
        else {
            mega.loadReport.ttfm = -1;
            mega.loadReport.renderfm = -1;
        }

        if (hideLoadingDialog) {
            loadingDialog.hide();
            loadingInitDialog.hide();
            // Reposition UI elements right after hiding the loading overlay,
            // without waiting for the lazy $.tresizer() triggered by MegaRender
            fm_resize_handler(true);
        }

        // -0x800e0fff indicates a call to loadfm() when it was already loaded
        if (!is_mobile && mDBload !== -0x800e0fff) {
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
                    r.errs, // any other errors while loading
                    workers && workers.length || -666,
                    r.ttlb | 0, // time to last byte
                    r.ttfm | 0, // time to fm since ttlb
                    u_type === 3 ? (mBroadcaster.crossTab.master ? 1 : 0) : -1, // master, or slave tab?
                ];

                if (d) {
                    console.debug('loadReport', r);
                }
                api_req({a: 'log', e: 99626, m: JSON.stringify(r)});
            }

            if (mDBload) {
                M.avatars();
            }
        }
        clearInterval(mega.loadReport.aliveTimer);
        mega.flags &= ~window.MEGAFLAG_LOADINGCLOUD;

//        u_kdnodecache = {};
        watchdog.notify('loadfm_done');
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

// MEGA Achievements
Object.defineProperty(mega, 'achievem', {
    value: Object.create(null, {
        RWDLVL: { value: 0 },

        toString: {
            value: function toString(ach) {
                if (ach !== undefined) {
                    var res = Object.keys(this)
                        .filter(function(v) {
                            return this[v] === ach;
                        }.bind(this));

                    return String(res);
                }

                return '[object MegaAchievements]';
            }
        },

        bind: {
            value: function bind(action) {
                this.rebind('click', function() {
                    if (action) {
                        switch (action[0]) {
                            case '/':
                                loadSubPage(action);
                                break;

                            case '~':
                                var fn = action.substr(1);
                                if (typeof window[fn] === 'function') {
                                    if (fn.toLowerCase().indexOf('dialog') > 0) {
                                        closeDialog();
                                    }
                                    window[fn]();
                                }
                                break;
                        }
                    }
                    return false;
                });
            }
        },

        prettify: {
            value: function prettify(maf) {
                var data  = Object(clone(maf.u));
                var quota = {
                    storage: {base: 0, current: 0, max: 0},
                    transfer: {base: 0, current: 0, max: 0}
                };

                var setExpiry = function(data, out) {
                    var time = String(data[2]).split('');
                    var unit = time.pop();
                    time = time.join('') | 0;

                    if (time === 1 && unit === 'y') {
                        time = 12;
                        unit = 'm';
                    }

                    var result = {
                        unit: unit,
                        value: time
                    };

                    switch (unit) {
                        case 'd': result.utxt = (time < 2) ? l[930]   : l[16290];  break;
                        case 'w': result.utxt = (time < 2) ? l[16292] : l[16293];  break;
                        case 'm': result.utxt = (time < 2) ? l[913]   : l[6788];   break;
                        case 'y': result.utxt = (time < 2) ? l[932]   : l[16294];  break;
                    }

                    out = out || data;
                    out.expiry = result;
                    return result;
                };

                Object.keys(data)
                    .forEach(function(k) {
                        setExpiry(data[k]);
                    });

                var mafr = Object(maf.r);
                var mafa = Object(maf.a);
                var alen = mafa.length;
                while (alen--) {
                    var ach = clone(mafa[alen]);

                    if (!data[ach.a]) {
                        data[ach.a] = Object(clone(mafr[ach.r]));
                        setExpiry(data[ach.a]);
                    }
                    var exp = setExpiry(mafr[ach.r] || data[ach.a], ach);
                    var ts = ach.ts * 1000;

                    ach.date = new Date(ts);
                    ach.left = Math.round((ach.e * 1000 - Date.now()) / 86400000);

                    if (data[ach.a].rwds) {
                        data[ach.a].rwds.push(ach);
                    }
                    else if (data[ach.a].rwd) {
                        data[ach.a].rwds = [data[ach.a].rwd, ach];
                    }
                    else {
                        data[ach.a].rwd = ach;
                    }
                }

                Object.keys(data)
                    .forEach(function(k) {
                        var ach          = data[k];
                        var base         = Object(ach.rwds).length || 1;
                        var storageValue = ach[0] * base;

                        if (ach.rwd) {
                            quota.storage.current += storageValue;
                        }
                        quota.storage.max += storageValue;

                        if (ach[1]) {
                            var transferValue = ach[1] * base;

                            if (ach.rwd) {
                                quota.transfer.current += transferValue;
                            }
                            quota.transfer.max += transferValue;
                        }
                    });

                if (Object(u_attr).p) {
                    quota.storage.base  = Object(M.account).space;
                    quota.transfer.base = Object(M.account).bw;
                }
                else {
                    quota.storage.base = maf.s;
                }

                data = Object.create(quota, Object.getOwnPropertyDescriptors(data));

                return data;
            }
        }
    })
});

(function(o) {
    var map = {
        /*  1 */ 'WELCOME':     'ach-create-account:/register',
        /*  2 */ 'TOUR':        'ach-take-tour',
        /*  3 */ 'INVITE':      'ach-invite-friend:~inviteFriendDialog',
        /*  4 */ 'SYNCINSTALL': 'ach-install-megasync:/sync',
        /*  5 */ 'APPINSTALL':  'ach-install-mobile-app:/mobile',
        /*  6 */ 'VERIFYE164':  'ach-verify-number',
        /*  7 */ 'GROUPCHAT':   'ach-group-chat:/fm/chat',
        /*  8 */ 'FOLDERSHARE': 'ach-share-folder:/fm/contacts'
    };
    var mapToAction = Object.create(null);
    var mapToElement = Object.create(null);

    Object.keys(map).forEach(function(k, idx) {
        Object.defineProperty(o, 'ACH_' + k, {
            value: idx + 1,
            enumerable: true
        });

        var tmp = map[k].split(':');
        mapToAction[idx + 1] = tmp[1];
        mapToElement[idx + 1] = tmp[0];
    });

    Object.defineProperty(o, 'mapToAction', {
        value: Object.freeze(mapToAction)
    });
    Object.defineProperty(o, 'mapToElement', {
        value: Object.freeze(mapToElement)
    });

    Object.freeze(o);
})(mega.achievem);

// Account Notifications (preferences)
(function(map) {
    var _enum = [];
    var _tag = 'ACCNOTIF_';

    Object.keys(map)
        .forEach(function(k) {
            map[k] = map[k].map(function(m) {
                return k.toUpperCase() + '_' + m.toUpperCase();
            });

            var rsv = 0;
            var memb = clone(map[k]);

            while (memb.length < 10) {
                memb.push(k.toUpperCase() + '_RSV' + (++rsv));
            }

            if (memb.length > 10) {
                throw new Error('Stack overflow..');
            }

            _enum = _enum.concat(memb);
        });

    makeEnum(_enum, _tag, mega);

    Object.defineProperty(mega, 'notif', {
        value: Object.freeze((function(flags) {
            function check(flag, tag) {
                if (typeof flag === 'string') {
                    if (tag !== undefined) {
                        flag = tag + '_' + flag;
                    }
                    flag = String(flag).toUpperCase();
                    flag = mega[flag] || mega[_tag + flag] || 0;
                }
                return flag;
            }
            return {
                get flags() {
                    return flags;
                },

                setup: function setup(oldFlags) {
                    if (oldFlags === undefined) {
                        // Initialize account notifications to defaults (all enabled)
                        assert(!fmconfig.anf, 'Account notification flags already set');

                        Object.keys(map)
                            .forEach(function(k) {
                                var grp = map[k];
                                var len = grp.length;

                                while (len--) {
                                    this.set(grp[len]);
                                }
                            }.bind(this));
                    }
                    else {
                        flags = oldFlags;
                    }
                },

                has: function has(flag, tag) {
                    return flags & check(flag, tag);
                },

                set: function set(flag, tag) {
                    flags |= check(flag, tag);
                    mega.config.set('anf', flags);
                },

                unset: function unset(flag, tag) {
                    flags &= ~check(flag, tag);
                    mega.config.set('anf', flags);
                }
            };
        })(0))
    });

    _enum = undefined;

})({
    chat: ['ENABLED'],
    cloud: ['ENABLED', 'NEWSHARE', 'DELSHARE', 'NEWFILES'],
    contacts: ['ENABLED', 'FCRIN', 'FCRACPT', 'FCRDEL']
});

// jscs:disable
// jshint ignore:start
var thumbnails = [];
var thumbnailblobs = [];
var th_requested = [];
var fa_duplicates = {};
var fa_reqcnt = 0;
var fa_addcnt = 8;
var fa_tnwait = 0;

function fm_thumbnails()
{
    var treq = {}, a = 0, max = Math.max($.rmItemsInView || 1, 71) + fa_addcnt, u = max - Math.floor(max / 3), y;
    if (!fa_reqcnt)
        fa_tnwait = y;
    if (d)
        console.time('fm_thumbnails');
    if (M.viewmode || M.chat)
    {
        for (var i in M.v)
        {
            var n = M.v[i];
            if (n && !missingkeys[n.h] && n.fa && String(n.fa).indexOf(':0') > 0)
            {
                if (fa_tnwait == n.h && n.seen)
                    fa_tnwait = 0;
                // if (!fa_tnwait && !thumbnails[n.h] && !th_requested[n.h])
                if (n.seen && !thumbnails[n.h] && !th_requested[n.h])
                {
                    if (typeof fa_duplicates[n.fa] == 'undefined')
                        fa_duplicates[n.fa] = 0;
                    else
                        fa_duplicates[n.fa] = 1;
                    treq[n.h] =
                        {
                            fa: n.fa,
                            k: n.k
                        };
                    th_requested[n.h] = 1;

                    if (u == a)
                        y = n.h;
                    if (++a > max)
                    {
                        if (!n.seen)
                            break;
                        y = n.h;
                    }
                }
                else if (n.seen && n.seen !== 2)
                {
                    fm_thumbnail_render(n);
                }
            }
        }
        if (y)
            fa_tnwait = y;
        if (a > 0)
        {
            fa_reqcnt += a;
            if (d)
                console.log('Requesting %d thumbs (%d loaded)', a, fa_reqcnt);

            var rt = Date.now();
            var cdid = M.currentdirid;
            api_getfileattr(treq, 0, function(ctx, node, uint8arr)
            {
                if (uint8arr === 0xDEAD)
                {
                    if (d)
                        console.log('Aborted thumbnail retrieval for ' + node);
                    delete th_requested[node];
                    return;
                }
                if (rt)
                {
                    if (((Date.now() - rt) > 4000) && ((fa_addcnt += u) > 300))
                        fa_addcnt = 301;
                    rt = 0;
                }
                try {
                    var blob = new Blob([uint8arr], {type: 'image/jpeg'});
                } catch (err) {}
                if (blob.size < 25)
                    blob = new Blob([uint8arr.buffer]);
                // thumbnailblobs[node] = blob;
                thumbnails[node] = myURL.createObjectURL(blob);

                var targetNode = M.getNodeByHandle(node);

                if (targetNode && targetNode.seen && M.currentdirid === cdid) {
                    fm_thumbnail_render(targetNode);
                }

                // deduplicate in view when there is a duplicate fa:
                if (targetNode && fa_duplicates[targetNode.fa] > 0)
                {
                    for (var i in M.v)
                    {
                        if (M.v[i].h !== node && M.v[i].fa === targetNode.fa && !thumbnails[M.v[i].h])
                        {
                            thumbnails[M.v[i].h] = thumbnails[node];
                            if (M.v[i].seen && M.currentdirid === cdid)
                                fm_thumbnail_render(M.v[i]);
                        }
                    }
                }
            });
        }
    }
    if (d)
        console.timeEnd('fm_thumbnails');
}

function fm_thumbnail_render(n) {
    if (n && thumbnails[n.h]) {
        var imgNode = document.getElementById(n.imgId || n.h);

        if (imgNode && (imgNode = imgNode.querySelector('img'))) {
            n.seen = 2;
            imgNode.setAttribute('src', thumbnails[n.h]);
            imgNode.parentNode.classList.add('thumb');
        }
    }
}
// jscs:enable
// jshint ignore:end

/**
 * Code to trigger the mobile file manager download overlay and related behaviour
 */
var mobileDownload = {

    /** Supported max file size of 100 MB */
    maxFileSize: 100 * (1024 * 1024),

    /** Supported file types for download on mobile */
    supportedFileTypes: {
        docx: 'word',
        jpeg: 'image',
        jpg: 'image',
        mp3: 'audio',
        mp4: 'video',
        pdf: 'pdf',
        png: 'image',
        xlsx: 'word'
    },

    /** Download start time in milliseconds */
    startTime: null,

    /** jQuery selector for the download overlay */
    $overlay: null,

    /**
     * Initialise the overlay
     * @param {String} nodeHandle A public or regular node handle
     */
    showOverlay: function(nodeHandle) {

        // Store the selector as it is re-used
        this.$overlay = $('#mobile-ui-main');

        // Get initial overlay details
        var node = M.d[nodeHandle];
        var fileName = node.name;
        var fileSizeBytes = node.s;
        var fileSize = numOfBytes(fileSizeBytes);
        var fileSizeFormatted = fileSize.size + ' ' + fileSize.unit;
        var fileIconName = fileIcon(node);
        var fileIconPath = staticpath + 'images/mobile/extensions/' + fileIconName + '.png';

        // Set file name, size and image
        this.$overlay.find('.filename').text(fileName);
        this.$overlay.find('.filesize').text(fileSizeFormatted);
        this.$overlay.find('.filetype-img').attr('src', fileIconPath);

        // Initialise overlay buttons
        this.initBrowserFileDownloadButton(nodeHandle);
        this.initAppFileDownloadButton(nodeHandle);
        this.initOverlayCloseButton();

        // Change depending on platform and file size/type
        this.setMobileAppInfo();
        this.adjustMaxFileSize();
        this.checkSupportedFile(node);

        // Disable scrolling of the file manager in the background to fix a bug on iOS Safari
        $('.mobile.fm-block').addClass('disable-scroll');

        // Show the overlay
        this.$overlay.removeClass('hidden').addClass('overlay');
    },

    /**
     * Initialise the Open in Browser button on the file download overlay
     * @param {String} nodeHandle The node handle for this file
     */
    initBrowserFileDownloadButton: function(nodeHandle) {

        this.$overlay.find('.first.dl-browser').off('tap').on('tap', function() {

            // Start the download
            mobileDownload.startFileDownload(nodeHandle);

            // Prevent default anchor link behaviour
            return false;
        });
    },

    /**
     * Initialise the Open in Mega App button on the file download overlay
     * @param {String} nodeHandle The node handle for this file
     */
    initAppFileDownloadButton: function(nodeHandle) {

        this.$overlay.find('.second.dl-megaapp').off('tap').on('tap', function() {

            // Start the download
            mega.utils.redirectToApp($(this));  // ToDo: make the app start the download by node handle directly

            // Prevent default anchor link behaviour
            return false;
        });
    },

    /**
     * Initialises the close button on the overlay with download button options and also the download progress overlay
     */
    initOverlayCloseButton: function() {

        var $closeButton = this.$overlay.find('.fm-dialog-close');

        // Show close button for folder links
        $closeButton.removeClass('hidden');

        // Add tap handler
        $closeButton.off('tap').on('tap', function() {

            // Hide overlay with download button options
            mobileDownload.$overlay.addClass('hidden');

            // Hide downloading progress overlay
            $('body').removeClass('downloading');

            // Re-show the file manager and re-enable scrolling
            $('.mobile.fm-block').removeClass('hidden disable-scroll');
        });
    },

    /**
     * Start the file download
     * @param {String} nodeHandle The node handle for this file
     */
    startFileDownload: function(nodeHandle) {

        // Show downloading overlay
        $('body').addClass('downloading');

        // Reset state from past downloads
        this.$overlay.find('.download-progress').removeClass('complete');
        this.$overlay.find('.download-percents').text('');
        this.$overlay.find('.download-speed').text('');
        this.$overlay.find('.download-progress span').text(l[1624] + '...');  // Downloading...
        this.$overlay.find('.download-progress .bar').width('0%');

        // Change message to 'Did you know that you can download the entire folder at once...'
        this.$overlay.find('.file-manager-download-message').removeClass('hidden');

        // Set the start time
        this.startTime = new Date().getTime();

        // Start download and show progress
        mega.utils.gfsfetch(nodeHandle, 0, -1, this.showDownloadProgress).always(function(data) {

            mobileDownload.showDownloadComplete(data, nodeHandle);
        });
    },

    /**
     * Download progress handler
     * @param {Number} percentComplete The number representing the percentage complete e.g. 49.23, 51.5 etc
     * @param {Number} bytesLoaded The number of bytes loaded so far
     * @param {Number} bytesTotal The total number of bytes in the file
     */
    showDownloadProgress: function(percentComplete, bytesLoaded, bytesTotal) {

        var $downloadButtonText = mobileDownload.$overlay.find('.download-progress span');
        var $downloadProgressBar = mobileDownload.$overlay.find('.download-progress .bar');
        var $downloadPercent = mobileDownload.$overlay.find('.download-percents');
        var $downloadSpeed = mobileDownload.$overlay.find('.download-speed');

        // Calculate the download speed
        var percentCompleteRounded = Math.round(percentComplete);
        var currentTime = new Date().getTime();
        var secondsElapsed = (currentTime - mobileDownload.startTime) / 1000;
        var bytesPerSecond = (secondsElapsed) ? (bytesLoaded / secondsElapsed) : 0;
        var speed = numOfBytes(bytesPerSecond);
        var speedText = speed.size + speed.unit + '/s';

        // Display the download progress and speed
        $downloadPercent.text(percentCompleteRounded + '%');
        $downloadProgressBar.width(percentComplete + '%');
        $downloadSpeed.text(speedText);

        // If the download is complete e.g. 99/100%, change button text to Decrypting... which can take some time
        if (percentComplete >= 99) {
            $downloadButtonText.text(l[8579] + '...');
        }
    },

    /**
     * Download complete handler, activate the Open File button and let the user download the file
     * @param {Object} data The download data
     * @param {String} nodeHandle The node handle for this file
     */
    showDownloadComplete: function(data, nodeHandle) {

        var $downloadButton = this.$overlay.find('.download-progress');
        var $downloadButtonText = this.$overlay.find('.download-progress span');
        var $downloadPercent = this.$overlay.find('.download-percents');
        var $downloadSpeed = this.$overlay.find('.download-speed');

        // Change button text to full white and hide the download percentage and speed
        $downloadButton.addClass('complete');
        $downloadPercent.text('');
        $downloadSpeed.text('');
        $downloadButtonText.text(l[8949]);  // Open File

        // Make download button clickable
        $downloadButton.off('tap').on('tap', function() {

            // Get the file's mime type
            var node = M.d[nodeHandle];
            var fileName = node.name;
            var mimeType = filemime(fileName);

            // Create object URL to download the file to the client
            location.href = mObjectURL([data.buffer], mimeType);
        });
    },

    /**
     * Change the max file size supported for various platforms based on device testing
     */
    adjustMaxFileSize: function() {

        // If Chrome or Firefox on iOS, reduce the size to 1.3 MB
        if ((navigator.userAgent.match(/CriOS/i)) || (navigator.userAgent.match(/FxiOS/i))) {
            this.maxFileSize = 1.3 * (1024 * 1024);
        }
    },

    /**
     * Checks if the file download can be performed in the browser or shows an error overlay
     * @param {Object} node The file node information
     */
    checkSupportedFile: function(node) {

        var $openInBrowserButton = this.$overlay.find('.first.dl-browser');
        var $fileTypeUnsupportedMessage = this.$overlay.find('.file-unsupported');
        var $fileSizeUnsupportedMessage = this.$overlay.find('.file-too-large');

        // Get the name, size, extension and whether supported
        var fileName = node.name;
        var fileSize = node.s;
        var fileExtension = fileext(fileName);
        var fileExtensionIsSupported = this.supportedFileTypes[fileExtension];

        // Check if the download is supported
        if ((fileSize > this.maxFileSize) || !fileExtensionIsSupported) {

            // Show an error overlay
            $('body').addClass('wrong-file');

            // Remove the tap/click handler and show as greyed out
            $openInBrowserButton.off('tap').addClass('disabled');

            // Change error message
            if (!fileExtensionIsSupported) {
                $fileTypeUnsupportedMessage.removeClass('hidden');
            }
            else {
                $fileSizeUnsupportedMessage.removeClass('hidden');
            }
        }
    },

    /**
     * Gets the app store link based on the user agent
     * @returns {String} Returns the link to the relevant app store for the user's platform
     */
    getStoreLink: function() {

        switch (ua.details.os) {
            case 'iPad':
            case 'iPhone':
                return 'https://itunes.apple.com/app/mega/id706857885';

            case 'Windows Phone':
                return 'zune://navigate/?phoneappID=1b70a4ef-8b9c-4058-adca-3b9ac8cc194a';

            case 'Android':
                return 'https://play.google.com/store/apps/details?id=mega.privacy.android.app' +
                       '&referrer=meganzindexandroid';
        }
    },

    /**
     * Changes the footer image and text depending on what platform they are on
     */
    setMobileAppInfo: function() {

        var $downloadOnAppStoreButton = $('.mobile.download-app');
        var $appInfoBlock = $('.app-info-block');
        var $openInBrowserButton = $('.mobile.dl-browser');

        // Change the link
        $downloadOnAppStoreButton.attr('href', this.getStoreLink());

        switch (ua.details.os) {
            case 'iPad':
            case 'iPhone':
                $appInfoBlock.addClass('ios');
                break;

            case 'Windows Phone':
                $appInfoBlock.addClass('wp');
                $openInBrowserButton.off('tap').addClass('disabled');
                break;

            case 'Android':
                $appInfoBlock.addClass('android');
                break;
        }
    }
};


(function() {
    mBroadcaster.once('boot_done', function() {
        if (
            ua.details.browser === "Safari" ||
            ua.details.browser === "Edge" ||
            ua.details.browser === "Internet Explorer"
        ) {
            return;
        }
        // Didn't found a better place for this, so I'm leaving it here...
        // This is basically a proxy of on paste, that would trigger a new event, which would receive the actual
        // File object, name, etc.
        $(document).on('paste', function (event) {
            if (ua.details.browser === "Safari") {
                // Safari is not supported
                return;
            }
            else if (
                ua.details.browser.toLowerCase().indexOf("explorer")  !== -1 ||
                ua.details.browser.toLowerCase().indexOf("edge")  !== -1
            ) {
                // IE is not supported
                return;
            }

            var items = (event.clipboardData || event.originalEvent.clipboardData).items;
            if (!items && event.originalEvent.clipboardData && event.originalEvent.clipboardData.files) {
                // safari
                items = event.originalEvent.clipboardData.files;
            }
            var fileName = false;

            var blob = null;
            if (items) {
                if (ua.details.browser === "Firefox" && items.length === 2) {
                    // trying to paste an image, but .. FF does not have support for that. (It adds the file icon as
                    // the image, which is a BAD UX, so .. halt now!)
                    return;
                }
                for (var i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf("image") === 0) {
                        if (items[i] instanceof File) {
                            // Safari, using .files
                            blob = items[i];
                        }
                        else {
                            blob = items[i].getAsFile();
                        }
                    }
                    else if (items[i].kind === "string") {
                        items[i].getAsString(function (str) {
                            fileName = str;
                        });
                    }
                }
            }

            if (blob !== null) {
                if (fileName) {
                    // we've got the name of the file...
                    blob.name = fileName;
                }

                if (!blob.name) {
                    // no name found..generate dummy name.
                    var ext = blob.type.replace("image/", "").toLowerCase();
                    fileName = blob.name = "image." + (ext === "jpeg" ? "jpg" : ext);
                }

                var simulatedEvent = new $.Event("pastedimage");
                $(window).trigger(simulatedEvent, [blob, fileName]);

                // was this event handled and preventing default? if yes, prevent the raw event from pasting the
                // file name text
                if (simulatedEvent.isDefaultPrevented()) {
                    event.preventDefault();
                    return false;
                }
            }
        });
    });
})();
