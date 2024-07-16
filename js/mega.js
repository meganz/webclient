var newnodes = [];
var currsn;     // current *network* sn (not to be confused with the IndexedDB/memory state)
var fminitialized = false;
var requesti = makeid(10);
var folderlink = false;
var dumpsremaining;
var workers; // worker pool
var fmdb = false; // the FM DB engine (cf. mDB.js)
var ufsc = false; // global ufs-size-cache instance
var mclp = false; // promise waiting for mc to load

Object.defineProperties(window, {
    // How many nodes are written on a single DB transaction (per table)
    FMDB_FLUSH_THRESHOLD: {
        value: parseInt(localStorage.fmdbbl) || 9087
    },
    // How many nodes can be awaiting in memory before applying back-pressure.
    BACKPRESSURE_FMDB_LIMIT: {
        value: parseInt(localStorage.fmdbpl) || 290784
    },
    // How many nodes can be awaiting decryption (per worker) before applying back-pressure.
    BACKPRESSURE_WORKER_LIMIT: {
        value: 8192
    },
    // Maximum number of bytes that can be retained in internal buffers before applying backpressure.
    BACKPRESSURE_HIGHWATERMARK: {
        value: 0x2000000
    },
    // Time to wait (in seconds) when applying backpressure
    BACKPRESSURE_WAIT_TIME: {
        value: 420 / 1000
    },
    allownullkeys: {
        get() {
            "use strict";
            localStorage.allownullkeys = 1;
            return M.reload();
        }
    }
});

/** @property mega.shouldApplyNetworkBackPressure */
lazy(mega, 'shouldApplyNetworkBackPressure', () => {
    'use strict';

    if (mega.flags.nobp || parseInt(localStorage.nobp)) {
        if (d) {
            console.info('Disabling network back-pressure.', mega.flags.nobp);
        }
        Object.defineProperty(mega, 'nobp', {value: true});
        return () => false;
    }

    return (aContentLength) => {
        const nobp = BACKPRESSURE_HIGHWATERMARK > aContentLength;

        if (mega.nobp !== false) {
            mega.nobp = nobp;
        }

        return !nobp;
    };
});

/** @property mega.is */
lazy(mega, 'is', () => {
    'use strict';
    const obj = {
        /**
         * @name loading
         * @memberOf mega.is
         */
        get loading() {
            return !!(mega.state & window.MEGAFLAG_LOADINGCLOUD);
        }
    };

    return Object.freeze(Object.setPrototypeOf(obj, null));
});

/** @property window.mLoadingSpinner */
lazy(self, 'mLoadingSpinner', () => {
    'use strict';
    const callers = new Map();
    const domNode = document.querySelector('.fmdb-loader');

    return freeze({
        show(id = 'main', title = 'Background activity') {
            if (!callers.size) {
                if (domNode) {
                    domNode.setAttribute('title', title);
                }
                document.documentElement.classList.add('fmdb-working');
            }
            const store = callers.get(id) || {title, count: 0};
            const res = ++store.count;

            callers.set(id, store);
            return res;
        },

        hide(id = 'main', force = false) {
            let res = 0;
            const store = !force && callers.get(id);

            if (!store || store.count < 2) {
                callers.delete(id);
            }
            else {
                res = --store.count;
                callers.set(id, store);
            }

            if (callers.size) {
                const [[, {title}]] = callers;

                if (domNode) {
                    domNode.setAttribute('title', title);
                }
            }
            else {
                document.documentElement.classList.remove('fmdb-working');
            }

            return res;
        },

        clear() {
            callers.clear();
            return this.hide();
        }
    });
});

if (typeof loadingDialog === 'undefined') {
    window.loadingDialog = Object.create(null);

    // New subject value to specify loading dialog subject.
    // Loading dialog with subject will not disappear until it hided with the subject
    $.loadingSubject = Object.create(null);

    loadingDialog.nest = 0;
    /**
     * Show overlay and loading spinner
     * @param {String} subject Subject of overlay
     * @param {String} label Loading text label with description
     * @returns {void}
     */
    loadingDialog.show = function(subject, label) {
        'use strict';

        var $overlay;
        var $spinner;

        subject = subject || 'common';

        if (!this.quiet) {
            $overlay = $('.dark-overlay:not(.mobile)', 'body');
            $spinner = $('.loading-spinner:not(.manual-management)', 'body');

            if (label) {
                $overlay.addClass('white');
                $('.status-txt', $spinner).text(label).addClass('loading');
            }

            $overlay.removeClass('hidden');
            $spinner.removeClass('hidden').addClass('active');
            this.active = true;

            // Even there is current on going loading pregress bar, if loading dialog is called show spinner
            $('.main-loader', $spinner).removeClass('hidden');

            // Prevent scrolling for mobile web
            if (is_mobile && $overlay.length && $spinner.length) {
                document.getElementById('loading-overlay').addEventListener('touchmove', function(e){
                    e.preventDefault();
                }, {passive: false});

                document.getElementById('loading-spinner').addEventListener('touchmove', function(e){
                    e.preventDefault();
                }, {passive: false});
            }
        }

        $.loadingSubject[subject] = 1;
    };
    loadingDialog.hide = function(subject) {
        'use strict';

        var $overlay;
        var $spinner;

        subject = subject || 'common';

        delete $.loadingSubject[subject];

        if (!loadingInitDialog.active && (Object.keys($.loadingSubject).length === 0 || subject === 'force')) {
            $overlay = $('.dark-overlay:not(.mobile)', 'body');
            $spinner = $('.loading-spinner:not(.manual-management)', 'body');

            $overlay.removeClass('white').addClass('hidden');
            $spinner.removeClass('active').addClass('hidden');
            $('.status-txt.loading', $spinner).removeClass('loading');

            this.nest = 0;
            this.active = false;
            $.loadingSubject = Object.create(null);
        }
    };
    loadingDialog.pshow = function() {
        'use strict';

        if (!this.nest++) {
            this.show('--dont-mess-with-me');
        }
    };
    loadingDialog.phide = function() {
        'use strict';

        if (--this.nest < 1) {
            this.hide('--dont-mess-with-me');
            this.nest = 0;
        }
        return !this.nest;
    };
    loadingDialog.quiet = false;
    loadingDialog.showProgress = function(progress) {

        'use strict';

        // Do not interrupt init dialog
        if (loadingInitDialog && loadingInitDialog.active) {
            return;
        }

        const $spinner = $('.loading-spinner:not(.manual-management)').removeClass('hidden');

        // If there is no current loadingDialog, make spinner disapears
        if (!loadingDialog.active) {
            $('.main-loader', $spinner).addClass('hidden');
        }

        $('.loader-progressbar', $spinner).addClass('active');

        if (progress) {
            $('.loader-percents', $spinner).css('transform', `scaleX(${progress / 100})`);
        }
    };
    loadingDialog.hideProgress = function() {

        'use strict';

        // Do not interrupt init dialog
        if (loadingInitDialog && loadingInitDialog.active) {
            return;
        }

        const $spinner = $('.loading-spinner:not(.manual-management)');

        $('.loader-progressbar', $spinner).removeClass('active');

        // awaiting 300 fadeout animation
        setTimeout(() => {

            // If there is another active loading dialog do not interrupt it.
            if (!loadingDialog.active) {
                $spinner.addClass('hidden');
            }
            $('.loader-percents', $spinner).css('transform', '');
        }, 301);
    };
}

if (typeof loadingInitDialog === 'undefined') {
    window.loadingInitDialog = Object.create(null);
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
        'use strict';
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
            if (typeof psa !== 'undefined') {
                psa.repositionAccountLoadingBar();
            }
        }
        if (progress) {
            $('.loader-percents').css('transform', `scaleX(${progress * 0.5 / 100})`);
        }
        this.progress = true;
    };
    loadingInitDialog.step3 = function(progress, delayStep) {
        'use strict';

        if (this.progress) {

            // Don't show step 3 loading if on mobile
            if (progress === 1 && !is_mobile) {

                $('.loading-info li.loading').addClass('loaded').removeClass('loading');
                $('.loading-info li.step3').addClass('loading');
            }

            if (!this.loader) {
                this.loader = document.getElementsByClassName('loader-percents')[0];
            }

            if (typeof this.progress !== 'number') {
                this.progress = 0;
            }

            // This trying moving backward, nope sorry you cannot do this.
            if (this.progress > progress || !this.loader) {
                return;
            }

            // only update UI with 0.5% step
            if (this.progress + 1 <= progress) {

                this.progress = progress | 0;
                this.loader.classList.remove('delay-loader');
                this.loader.style.transform = `scaleX(${(this.progress * 0.5 + 50) / 100})`;

                requestAnimationFrame(() => {

                    if (this.progress >= 99 || this.progress === false) {

                        const elm = document.getElementsByClassName('loader-progressbar')[0];

                        if (elm) {
                            elm.classList.remove('active');
                            elm.style.bottom = 0;
                        }
                    }
                    else if (this.loader && delayStep && this.progress < delayStep) {

                        this.loader.classList.add('delay-loader');
                        this.loader.style.transform = `scaleX(${(delayStep * 0.5 + 50) / 100})`;
                    }
                });
            }
        }
    };
    loadingInitDialog.hide = function(subject) {
        'use strict';
        this.loader = null;
        this.active = false;
        this.progress = false;
        $('.light-overlay').addClass('hidden');
        $('body').removeClass('loading');
        if ($.loadingSubject && Object.keys($.loadingSubject).length === 0) {
            $('.loading-spinner:not(.manual-management)').addClass('hidden').removeClass('init active');
        }
        $('.loading-info li').removeClass('loading loaded');
        $('.loader-progressbar').removeClass('active');
        $('.loader-percents').width('0%').removeAttr('style');

        // Implicitly hide the former dialog, as per the linked dependency.
        window.loadingDialog.hide(subject);
    };
}

// execute actionpacket
// actionpackets are received and executed strictly in order. receiving and
// execution run concurrently (a connection drop while the execution is
// ongoing invalidates the IndexedDB state and forces a reload!)
var scq = Object.create(null);           // hash of [actionpacket, [nodes]]
var scqtail = 0;                         // next scq index to process
var scqhead = 0;                         // next scq index to write
var scloadtnodes = false;                // if `t` packet requires nodes in memory
var scinflight = false;                  // don't run more than one execsc() "thread"
var sccount = 0;                         // number of actionpackets processed at connection loss
var scfetches = Object.create(null);     // holds pending nodes to be retrieved from fmdb
var scfsubtree = Object.create(null);    // fetch entire subtree as needed by some action-packets
var scwaitnodes = Object.create(null);   // supplements scfetches per scqi index
var nodesinflight = Object.create(null); // number of nodes being processed in the worker for scqi
var nodes_scqi_order = 0;                // variable to count the node arrival order before sending to workers

// enqueue nodes needed to process packets
function sc_fqueue(handle, packet) {
    "use strict";

    if (handle && (!M.c[handle] || scfsubtree[handle])) {
        if (scwaitnodes[packet.scqi]) {
            scwaitnodes[packet.scqi]++;
        }
        else {
            scwaitnodes[packet.scqi] = 1;
        }
        if (!scfetches[handle]) {
            scfetches[handle] = [];
        }
        scfetches[handle].push(packet.scqi);
        return 1;
    }
    return 0;
}

// queue 't' packet nodes for db retrieval
function sc_fqueuet(scni, packet) {
    "use strict";

    var result  = 0;

    if (scloadtnodes) {
        var scnodes = scq[scni] && scq[scni][1];

        if (scnodes && scnodes.length) {
            packet = packet || scq[scni][0];

            if (!packet) {
                console.error('sc_fqueuet: invalid packet!');
            }
            else {
                if (d > 1) {
                    console.debug('sc_fqueuet', scni, packet, clone(scnodes));
                }
                for (var i = scnodes.length; i--;) {
                    result += sc_fqueue(scnodes[i].p, packet);
                }
            }
        }
    }

    return result;
}

// fetch from db the queued scfetches
async function sc_fetcher() {
    "use strict";

    if ($.scFetcherRunning) {
        if (d > 1) {
            console.debug('sc_fetcher already running...');
        }
        return;
    }

    const queue = scfetches;
    const handles = Object.keys(queue);
    const fsubtree = scfsubtree;
    scfetches = Object.create(null);
    scfsubtree = Object.create(null);

    if (!handles.length) {
        return queueMicrotask(resumesc);
    }
    $.scFetcherRunning = true;

    if (d) {
        console.info('Retrieving from DB nodes required to parse action-packets...', handles);
    }
    // console.time('sc:fetcher');

    while (handles.length) {
        const bunch = handles.splice(0, 8192);
        await dbfetch.geta(bunch).catch(dump);

        // Retrieve all needed subtrees and file versions if any, and then finish the batch processing
        const subtree = new Set();

        for (let i = bunch.length; i--;) {
            const n = M.d[bunch[i]];

            if (n) {
                if (n.t) {
                    if (fsubtree[n.h]) {
                        // entire subtree
                        subtree.add(n.h);
                    }
                }
                else if (n.tvf) {
                    // file versions
                    subtree.add(n.h);
                }
            }
        }

        if (subtree.size) {
            await dbfetch.tree([...subtree]).catch(dump);
        }

        for (let i = bunch.length; i--;) {
            const h = bunch[i];
            for (let p = queue[h].length; p--;) {
                const scqi = queue[h][p];
                if (!--scwaitnodes[scqi]) {
                    delete scwaitnodes[scqi];
                }
            }
        }

        queueMicrotask(resumesc);
    }
    // console.timeEnd('sc:fetcher');

    $.scFetcherRunning = false;
    queueMicrotask(sc_fetcher);
}

/**
 * function to start fetching nodes needed for the action packets
 * @param {Number} scni         id of action packe in scq
 */
function startNodesFetching(scni) {
    "use strict";
    if (!--nodesinflight[scni]) {
        delete nodesinflight[scni];

        if (scloadtnodes && scq[scni] && scq[scni][0] && sc_fqueuet(scni)) {
            // fetch required nodes from db
            delay('scq:fetcher.dsp', sc_fetcher, 90);
        }
        else {
            // resume processing, if appropriate and needed
            resumesc();
        }
    }
}

// enqueue parsed actionpacket
function sc_packet(a) {
    "use strict";

    if (getsc.timer) {
        // a timer is running for 48 seconds, parsing action-packets should
        // take less than that, but in case it does not...let's stop it.
        getsc.stop();
    }

    // set scq slot number
    a.scqi = scqhead;

    if (d > 1) {
        console.debug('sc_packet', loadfm.fromapi, scloadtnodes, a.a, a);
    }

    // check if this packet needs nodes to be present,
    // unless `fromapi` where nodes are placed in memory already as received.
    if (window.fmdb && (!loadfm.fromapi || !fmdb.memoize))
    {
        scloadtnodes = true;

        switch (a.a) {
            case 'd':
                scfsubtree[a.n] = 1;
            /* falls through */
            case 's':
            case 's2':
            case 'fa':
            case 'u':
                sc_fqueue(a.n, a);
            /* falls through */
            case 'ph':
                sc_fqueue(a.h, a); // s, s2, ph
                break;
            case 't':
                // If no workers, all scnodes should be ready
                // OR the scnodes are ready but not the ap set yet
                if (!decWorkerPool.ok || scq[scqhead] && !scq[scqhead][0]) {
                    sc_fqueuet(scqhead, a);
                }
                break;
        }

        delay('scq:fetcher.dsp', sc_fetcher, 90);
    }

    if ((a.a === 's' || a.a === 's2') && a.k && !self.secureKeyMgr) {
        /**
         * There are two occasions where `crypto_process_sharekey()` must not be called:
         *
         * 1. `a.k` is symmetric (AES), `a.u` is set and `a.u != u_handle`
         *    (because the resulting sharekey would be rubbish)
         *
         * 2. `a.k` is asymmetric (RSA), `a.u` is set and `a.u != u_handle`
         *    (because we either get a rubbish sharekey or an RSA exception from asmcrypto)
         */
        let prockey = false;

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
            if (decWorkerPool.ok && rsasharekeys[a.n]) {
                decWorkerPool.postPacket(a, scqhead++);
                return;
            }

            const k = crypto_process_sharekey(a.n, a.k);

            if (k === false) {
                console.warn(`Failed to decrypt RSA share key for ${a.n}: ${a.k}`);
            }
            else {
                a.k = k;
                crypto_setsharekey(a.n, k, true);
            }
        }
    }

    if (a.a === 't') {
        startNodesFetching(scqhead);
    }

    // other packet types do not warrant the worker detour
    if (scq[scqhead]) scq[scqhead++][0] = a;
    else scq[scqhead++] = [a, []];

    // resume processing if needed
    resumesc();
}

// submit nodes from `t` actionpacket to worker
function sc_node(n) {
    "use strict";

    crypto_rsacheck(n);

    if (!decWorkerPool.ok) {
        crypto_decryptnode(n);
        if (scq[scqhead]) scq[scqhead][1].push(n);
        else scq[scqhead] = [null, [n]];
        // sc_packet() call will follow
        return;
    }

    if (nodesinflight[scqhead]) {
        nodesinflight[scqhead]++;
    }
    else {
        nodesinflight[scqhead] = 2;
        nodes_scqi_order = 0; // reset the order var
    }

    n.scni = scqhead;       // set scq slot number (sc_packet() call will follow)
    n.scqp = nodes_scqi_order++; // storing arrival order
    decWorkerPool.postNode(n, scqhead % decWorkerPool.length);
}

// inter-actionpacket state, gets reset in getsc()
var scsharesuiupd;
var scpubliclinksuiupd;
var scContactsSharesUIUpdate;
var loadavatars = [];
var scinshare = Object.create(null);
var sckeyrequest = Object.create(null);

// sc packet parser
var scparser = Object.create(null);
scparser.$common = Object.create(null);
scparser.$helper = Object.create(null);
scparser[requesti] = Object.create(null);

/**
 * Add a new sc parser handler
 * @param {String} type The packet type, s2, la, t, etc
 * @param {Object|Function|String} handler The handler descriptor
 * If handler is a function, it is meant to parse packets not triggered locally, otherwise
 * must be an object with either an 'r' (triggered remotely), 'l' (triggered locally), or 'b'oth.
 */
scparser.$add = function(type, handler) {
    if (typeof handler === 'function') {
        handler = {r: handler};
    }
    if (handler.b) {
        scparser.$common[type] = handler.b;
    }
    if (handler.r) {
        scparser[type] = handler.r;
    }
    if (handler.l) {
        scparser[requesti][type] = handler.l;
    }
};

scparser.$helper.c = function(a) {
    // contact notification
    process_u(a.u);

    scparser.$notify(a);

    if (megaChatIsReady) {
        $.each(a.u, function(k, v) {
            if (v.c !== 0) {
                // load all keys.
                crypt.getPubRSA(v.u);
                crypt.getPubCu25519(v.u);
                crypt.getPubEd25519(v.u);
            }
            megaChat[v.c === 0 || (v.c === 2 && v.c !== u_handle) ? "processRemovedUser" : "processNewUser"](v.u);
        });
    }
};

scparser.$add('c', {
    r: function(a) {
        scparser.$helper.c(a);

        // contact is deleted on remote computer, remove contact from contacts left panel
        if (fminitialized && a.u[0].c === 0) {

            $.each(a.u, function(k, v) {
                var userHandle = v.u;

                // hide the context menu if it is currently visible and this contact was removed.
                if ($.selected && ($.selected[0] === userHandle)) {

                    // was selected
                    if (selectionManager) {
                        selectionManager.clear_selection();
                    }
                    $.selected = [];

                    if ($('.dropdown.body.files-menu').is(":visible")) {
                        $.hideContextMenu();
                    }
                }
            });
        }
    },
    l: function(a) {
        scparser.$helper.c(a);
    }
});

scparser.$add('s', {
    r: function(a) {
        if (folderlink) {
            return;
        }

        var n, i;
        var prockey = false;

        if (a.o === u_handle) {
            // if access right are undefined, then share is deleted
            if (typeof a.r === 'undefined') {
                if (a.okd && d) {
                    console.warn(`Ignoring okd for ${a.n}...`, a);
                }
                M.delNodeShare(a.n, a.u);

                if (a.p) {
                    M.deletePendingShare(a.n, a.p);
                }
                else if (!pfid && fminitialized && a.u in M.u) {
                    setLastInteractionWith(a.u, `0:${unixtime()}`);

                    if (a.ou !== u_handle) {
                        notify.notifyFromActionPacket({a: 'dshare', n: a.n, u: a.o, orig: a.ou, rece: a.u});
                    }
                }
            }
            else {
                const shares = Object(M.d[a.n]).shares || {};

                if (self.secureKeyMgr) {

                    if (a.u) {
                        M.nodeShare(a.n, {h: a.n, r: a.r, u: a.u, ts: a.ts});
                    }
                    else {
                        if (d) {
                            console.debug(`Got share action-packet for pending contact: ${a.n}*${a.p}`, [a]);
                        }
                        console.assert(a.a === 's2', `INVALID SHARE, missing user-handle for ${a.n}`, a);
                    }
                }
                else if (a.u in shares || a.ha === crypto_handleauth(a.n)) {

                    // I updated or created my share
                    const k = decrypt_key(u_k_aes, base64_to_a32(a.ok));

                    if (k) {
                        crypto_setsharekey(a.n, k);

                        if (d) {
                            console.assert(a.u || a.a === 's2', 'INVALID SHARE, missing user handle', a);
                        }

                        if (a.u) {
                            M.nodeShare(a.n, {h: a.n, r: a.r, u: a.u, ts: a.ts});
                        }
                        else if (a.a === 's2' && fmdb) {
                            // this must be a pending share, store ownerkey
                            fmdb.add('ok', {h: a.n, d: {k: a.ok, ha: a.ha}});
                        }
                    }
                }
            }
        }
        else {
            if (a.n && typeof a.k !== 'undefined' && !u_sharekeys[a.n] && !self.secureKeyMgr) {
                if (Array.isArray(a.k)) {
                    // a.k has been processed by the worker
                    crypto_setsharekey(a.n, a.k);
                    prockey = true;
                }
                else if (d) {
                    // XXX: misdirected actionpackets?
                    console.warn('Got share action-packet with invalid key, wait for it.', a.n, a.k, [a]);
                }
            }

            if (a.u === 'EXP') {

                mega.Share.ExportLink.pullShareLink(a.h, true).catch(dump);
            }

            if ('o' in a) {
                if (!('r' in a)) {
                    // share deletion
                    n = M.d[a.n];

                    if (n) {
                        if (a.u === u_handle) {
                            // incoming share
                            if (d) {
                                console.log('Incoming share ' + a.n + " revoked.", n.su, M.d[n.p]);
                            }

                            if (M.d[n.p]) {
                                // inner share: leave nodes intact, just remove .r/.su
                                delete n.r;
                                delete n.su;
                                delete n.sk;
                                delete M.c.shares[a.n];
                                // mega.keyMgr.deleteShares([a.n]).catch(dump);

                                if (M.tree.shares) {
                                    delete M.tree.shares[a.n];
                                }

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

                    if (!folderlink && a.u !== 'EXP' && fminitialized) {
                        if (a.ou !== u_handle) {
                            notify.notifyFromActionPacket({
                                a: 'dshare',
                                n: a.n,
                                u: a.o,
                                orig: a.ou,
                                rece: a.u
                            });
                        }
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
            var nodes = M.getNodesSync(a.n, true);

            for (i = nodes.length; i--;) {
                if (n = M.d[nodes[i]]) {
                    if (typeof n.k === 'string') {
                        crypto_decryptnode(n);
                        newnodes.push(M.d[n.h]);
                    }
                }
            }
        }

        if (fminitialized) {
            sharedUInode(a.n);
        }
        scsharesuiupd = true;
        scContactsSharesUIUpdate = a.o ? a.o : false;
    },
    l: function(a) {
        // share modification
        // (used during share dialog removal of contact from share list)
        // is this a full share delete?
        if (a.r === undefined) {
            // fill DDL with removed contact
            if (a.u && M.u[a.u] && M.u[a.u].m && !is_mobile) {
                var email = M.u[a.u].m;
                var contactName = M.getNameByHandle(a.u);

                addToMultiInputDropDownList('.share-multiple-input', [{id: email, name: contactName}]);
                addToMultiInputDropDownList('.add-contact-multiple-input', [{id: email, name: contactName}]);
            }
        }

        if (fminitialized) {
            // a full share contains .h param
            sharedUInode(a.h);
        }
        scsharesuiupd = true;
    }
});

scparser.$add('s2', {
    r: function(a) {
        // 's2' still requires the logic for 's'
        this.s(a);

        processPS([a]);
    },
    l: function(a) {
        // 's2' still requires the logic for 's'
        this.s(a);

        // store ownerkey
        if (fmdb && !self.secureKeyMgr) {
            fmdb.add('ok', {h: a.n, d: {k: a.ok, ha: a.ha}});
        }
        processPS([a]);
    }
});

scparser.$add('t', function(a, scnodes) {
    // node tree
    // the nodes have been pre-parsed and stored in scnodes
    if (scinshare.skip) {
        // FIXME: do we still need to notify anything here?
        scinshare.skip = false;
        return;
    }

    let i;
    const ufsc = new UFSSizeCache();
    let rootNode = scnodes.length && scnodes[0] || false;
    let share = M.d[rootNode.h];

    // is this tree a new inshare with root scinshare.h? set share-relevant
    // attributes in its root node.
    if (scinshare.h) {
        for (i = scnodes.length; i--;) {
            if (scnodes[i].h === scinshare.h) {
                scnodes[i].su = scinshare.su;
                scnodes[i].r = scinshare.r;
                scnodes[i].sk = scinshare.sk;
                rootNode = scnodes[i];

                // XXX: With Infinity, we may did retrieve the node API-side prior to parsing "t" ...
                share = M.d[rootNode.h];

                if (share) {
                    // save r/su/sk, we'll break next...
                    M.addNode(rootNode);
                }
            }
            else if (M.d[scnodes[i].h]) {
                ufsc.feednode(scnodes[i]);
                delete scnodes[i];
            }
        }
        scinshare.h = false;
    }
    if (share) {
        // skip repetitive notification of (share) nodes
        if (d) {
            console.debug('skipping repetitive notification of (share) nodes');
        }
        return;
    }

    // notification logic
    if (fminitialized && !pfid && a.ou !== u_handle
        && rootNode && rootNode.p && !rootNode.su) {

        const targetid = rootNode.p;
        const pnodes = [];

        for (i = 0; i < scnodes.length; i++) {
            if (scnodes[i] && scnodes[i].p === targetid) {
                pnodes.push({
                    h: scnodes[i].h,
                    t: scnodes[i].t
                });
            }
        }

        notify.notifyFromActionPacket({
            a: a.ou ? 'put' : 'puu',
            n: targetid,
            u: a.ou,
            f: pnodes
        });
    }

    const mns = $.moveNodeShares;
    for (i = 0; i < scnodes.length; i++) {
        if (scnodes[i]) {

            M.addNode(scnodes[i]);
            ufsc.feednode(scnodes[i]);

            if (mns) {
                const {h} = scnodes[i];
                const share = mns[h];

                if (share) {

                    // eslint-disable-next-line guard-for-in
                    for (const su in share) {
                        M.nodeShare(h, share[su], true);

                        if (su === 'EXP') {
                            scpubliclinksuiupd = true;
                        }
                        else {
                            scsharesuiupd = true;
                        }
                    }

                    delete mns[h];
                }
            }
        }
    }

    ufsc.save(rootNode);

    if (d > 1) {
        // f2 if set must be empty since the nodes must have been processed through workers.
        console.assert(!a.t || !a.t.f2 || !a.t.f2.length, 'Check this...');
    }

    if (fminitialized && !is_mobile) {
        // update versioning info.
        i = scnodes.length > 1 && Object(scnodes[1]).h || rootNode.h;
        if (i) {
            // TODO: ensure this is backward compatible...
            fileversioning.updateFileVersioningDialog(i);
        }
    }

    if (fminitialized) {
        M.storageQuotaCache = null;
    }
});

scparser.$add('opc', (a) => {
    'use strict';

    // outgoing pending contact
    processOPC([a]);

    if (fminitialized && M.chat && megaChatIsReady
        && megaChat.routingSection === "contacts"
        && megaChat.routingSubSection === "sent") {

        mBroadcaster.sendMessage('fmViewUpdate:opc');
    }
});

scparser.$add('ipc', {
    b: function(a) {
        // incoming pending contact
        processIPC([a]);

        if (fminitialized && megaChatIsReady) {
            mBroadcaster.sendMessage('fmViewUpdate:ipc');
        }

        notify.notifyFromActionPacket(a);
    }
});

scparser.$add('ph', (a) => {
    'use strict';

    // exported link
    processPH([a]);

    // not applicable - don't return anything, or it will show a blank notification
    if (typeof a.up !== 'undefined' && typeof a.down !== 'undefined') {
        notify.notifyFromActionPacket(a);
    }
    scpubliclinksuiupd = true;
});

scparser.$add('upci', {
    b: function(a) {
        'use strict';
        // update to incoming pending contact request
        if (a.s) {
            M.delIPC(a.p);

            if (fminitialized) {
                onIdle(() => {
                    mBroadcaster.sendMessage('fmViewUpdate:ipc');
                });
            }
        }
    }
});

scparser.$add('upco', {
    b: function(a) {
        'use strict';

        // update to outgoing pending contact request
        if (a.s) {
            // Have status of pending share
            const {p, m} = a;

            M.delOPC(p);
            M.delIPC(p);

            // Delete all matching pending shares
            for (var k in M.ps) {
                M.delPS(p, k);
            }

            if (fminitialized) {
                onIdle(() => {
                    mBroadcaster.sendMessage('fmViewUpdate:opc');
                });

                removeFromMultiInputDDL('.share-multiple-input', {id: m, name: m});
                removeFromMultiInputDDL('.add-contact-multiple-input', {id: m, name: m});
            }
        }

        // if the status is accepted ('2'), then this will be followed
        // by a contact packet and we do not need to notify
        if (a.s !== 2) {
            notify.notifyFromActionPacket(a).catch(dump);
        }
    }
});

scparser.$add('puh', {
    b: function(a) {
        "use strict";
        if (!folderlink) {
            mega.fileRequestCommon.actionHandler.processPublicUploadHandle(a);
        }
    }
});

scparser.$add('pup', {
    b: function(a) {
        "use strict";
        if (!folderlink) {
            mega.fileRequestCommon.actionHandler.processPublicUploadPage(a);
        }
    }
});

scparser.$add('se', {
    b: function(a) {
        if (!folderlink) {
            processEmailChangeActionPacket(a);
        }
    }
});

scparser.$add('pk', {
    b: function() {
        'use strict';
        if (folderlink) {
            return;
        }

        delay('fetch-pending-share-keys', () => {

            mega.keyMgr.fetchPendingInShareKeys().catch(dump);
        });
    }
});

scparser.$add('ua', (a) => {
    'use strict';

    if (Array.isArray(a.ua)) {
        let gotCu255 = false;
        const {st, ua, u: usr, v = false} = a;

        // public-folder allowed -- which ones we can parse under folder-links
        const pfa = new Set(['*!fmconfig', '^!csp', '^!webtheme', '^!prd']);

        // triggered locally?
        const local = st === api.currst;
        const parse = (name) => !local && name !== '^!stbmp' || name === 'firstname' || name === 'lastname';

        for (let idx = 0; idx < ua.length; ++idx) {
            const name = ua[idx];
            const version = v[idx];
            const ck = `${usr}_${name}`;

            if (local) {
                if (version && !mega.attr._versions[ck]) {
                    mega.attr._versions[ck] = version;
                }
            }
            else if (pfid && !pfa.has(name)) {
                if (d) {
                    console.info(`Ignoring ua-packet ${name}...`, JSON.stringify(a));
                }
                continue;
            }

            gotCu255 = gotCu255 || String(name).includes('Cu255');

            if (name === '+a') {
                loadavatars.push(usr);
            }
            else if (name[0] === '%') {
                // business-related attribute, per 'upsub'
                attribCache.removeItem(ck, false);
            }
            else if (parse(name)) {
                mega.attr.uaPacketParser(name, usr, local, version);
            }
        }

        // in case of business master
        // first, am i a master?
        if (!pfid && window.u_attr && Object(u_attr.b).m) {

            if (Object.hasOwnProperty.call(M.suba, usr) || u_attr.b.bu === usr) {
                M.require('businessAcc_js', 'businessAccUI_js')
                    .then(() => {
                        const business = new BusinessAccount();
                        business.updateSubUserInfo(usr, ua);
                    });
            }

            if (gotCu255) {

                delay('complete-pending-out-shares', () => {
                    if (d) {
                        console.warn('Trying to complete out-shares from business admin...');
                    }
                    mega.keyMgr.completePendingOutShares().catch(dump);
                });
            }
        }
    }
});

scparser.$add('sd', {
    b: function() {
        "use strict";

        if (fminitialized && page === 'fm/account/security') {
            // need to wait until session history is refreshed.
            tSleep(3).then(() => {
                accountUI.security.session.update(true);
            });
        }
    }
});

scparser.$add('fa', function(a) {
    // file attribute change/addition
    var n = M.d[a.n];
    if (n) {
        n.fa = a.fa;
        M.nodeUpdated(n);

        mBroadcaster.sendMessage('fa:ready', a.n, a.fa);
    }
});

scparser.$add('k', function(a) {
    // key request
    if (a.sr) {
        crypto_procsr(a.sr);
    }
    if (a.cr) {
        crypto_proccr(a.cr);
    }
    else if (!pfid && a.n) {
        if (!sckeyrequest[a.h]) {
            sckeyrequest[a.h] = [];
        }
        sckeyrequest[a.h].push(...a.n);
    }

    scsharesuiupd = true;
});

scparser.$add('u', function(a) {
    // update node attributes
    const n = M.d[a.n];
    if (n) {
        let oldattr;

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
        if (a.u) {
            n.u = a.u;
        }

        // timestamp update
        if (a.ts) {
            n.ts = a.ts;
        }

        // try to decrypt new attributes
        crypto_decryptnode(n);

        // we got a new attribute string, but it didn't pass muster?
        // revert to previous state (effectively ignoring the SC command)
        if (a.at && n.a) {
            if (d) {
                console.warn(`Ignored bad attribute update for node ${a.n}`, a, n);
            }
            crypto_restoreattr(n, oldattr);
            delete n.a;
        }
        else {
            // success - check what changed and redraw
            if (a.at && fminitialized) {
                if (oldattr.lbl !== n.lbl) {
                    M.labelDomUpdate(n.h, n.lbl);
                }
                if (oldattr.fav !== n.fav) {
                    M.favouriteDomUpdate(n, n.fav);
                }
                if (oldattr.name !== n.name) {
                    M.onRenameUIUpdate(n.h, n.name);
                }
                if (M.dyh) {
                    M.dyh('check-node-update', n, oldattr);
                }
            }

            // save modified node
            M.nodeUpdated(n);
        }
    }
});

scparser.$add('d', function(a) {
    var fileDeletion = (M.d[a.n] && !M.d[a.n].t);
    var topVersion = null;
    if (fileDeletion) {
        topVersion = fileversioning.getTopNodeSync(a.n);
    }

    // This is node move
    if (a.m) {
        if (d) {
            console.time(`sc:d.${a.n}`);
        }
        $.moveNodeShares = $.moveNodeShares || Object.create(null);
        (function _checkMoveNodeShare(h) {
            const n = M.d[h];
            if (n) {
                if (n.shares) {
                    $.moveNodeShares[h] = n.shares;
                }
                if (n.t && M.c[h]) {
                    Object.keys(M.c[h]).forEach(_checkMoveNodeShare);
                }
            }
        })(a.n);
        if (d) {
            console.timeEnd(`sc:d.${a.n}`);
        }
    }

    // node deletion
    M.delNode(a.n, false, !!a.m);

    // was selected, now clear the selected array.
    if ($.selected && ($.selected[0] === a.n)) {
        $.selected = [];
    }
    if (!pfid && a.ou) {
        scparser.$notify(a);
    }
    if (!is_mobile) {
        if (fileDeletion && !a.v) {// this is a deletion of file.
            if (M.d[topVersion]) {
                fileversioning.updateFileVersioningDialog(topVersion);
            }
            else {
                fileversioning.closeFileVersioningDialog(a.n);
            }
        }
    }

    // Remove all upload in queue that target deleted node
    if (fminitialized && ul_queue.length > 0) {
        ulmanager.ulClearTargetDeleted(a.n);
    }

    if (!a.m && fminitialized && !pfid && !is_mobile) {
        M.storageQuotaCache = null;
        delay('checkLeftStorageBlock', () => M.checkLeftStorageBlock().catch(dump));
    }
});

scparser.$add('la', function() {
    'use strict';

    // last seen/acknowledged notification sn
    notify.markAllNotificationsAsSeen(true);
});

scparser.$add('usc', function() {
    if (folderlink) {
        return;
    }
    // user state cleared - mark local DB as invalid
    return fm_fullreload();
});

// Payment received
scparser.$add('psts', function(a) {
    'use strict';

    onIdle(() => {
        watchdog.notify('psts', (a.r === 's' && a.p) | 0);
    });

    if (fminitialized && !pfid) {
        pro.processPaymentReceived(a);
    }

    this.sqac(a);
});

// Storage quota allowance changed.
scparser.$add('sqac', (a) => {
    'use strict';

    if (d) {
        console.info(a.a, [a]);
    }

    if (ulmanager.ulOverStorageQuota) {
        eventlog(99701, a.a, true);

        delay('sqac:ul-resume', () => {
            ulmanager.ulResumeOverStorageQuotaState();
        });
    }

    if (dlmanager.isOverQuota) {

        delay('sqac:dl-resume', () => {
            dlmanager._onOverquotaDispatchRetry();
        });
    }

    // If a user is on FM, update the account status with this packet.
    if (fminitialized) {

        delay('sqac:ui-update', () => {

            if (!pfid) {

                if (page.indexOf('fm/account') === 0) {

                    accountUI();
                }
                else if (page === 'fm/dashboard') {

                    dashboardUI(true);
                }
                else {
                    M.accountData(() => {
                        if (mega.rewindUi && mega.rewindUi.sidebar.active) {
                            mBroadcaster.sendMessage('rewind:accountUpgraded');
                        }
                    });
                }
            }
            if (u_attr) {
                delete u_attr.tq;
            }
            M.storageQuotaCache = null;

            if ($.topMenu) {

                topMenu();
            }
            else if (!pfid) {

                M.checkLeftStorageBlock();
            }

            M.checkStorageQuota(2e3);
        });
    }
});

// Payment reminder
scparser.$add('pses', function(a) {
    'use strict';
    if (!folderlink) {
        notify.notifyFromActionPacket(a).catch(dump);
    }
});

// Payment card status
scparser.$add('cce', () => {
    'use strict';

    // assuming that this AP will come only to PRO/Business accounts.
    if (fminitialized && !folderlink) {

        delay('cce-action-packet', () => {
            M.updatePaymentCardState().catch(dump);
        }, 2000);
    }
});

scparser.mcsmp = a => {
    'use strict';
    if (folderlink) {
        return;
    }
    if (megaChatIsReady) {
        megaChat._queuedMcsmPackets[a.id] = {data: a, type: 'mcsmp'};
    }
    else if (Array.isArray(loadfm.chatmcsm)) {
        loadfm.chatmcsm.push(a);
    }

    if (fmdb) {
        delete a.a;
        fmdb.add('mcsm', {id: a.id, d: a});
    }
};

scparser.mcsmr = a => {
    'use strict';
    if (folderlink) {
        return;
    }
    if (megaChatIsReady) {
        megaChat._queuedMcsmPackets[a.id] = {data: a, type: 'mcsmr'};
    }
    else if (Array.isArray(loadfm.chatmcsm)) {
        loadfm.chatmcsm = loadfm.chatmcsm.filter(s => s.id !== a.id);
    }

    if (fmdb) {
        fmdb.del('mcsm', a.id);
    }
};

scparser.mcpc = scparser.mcc = function (a) {
    if (folderlink) {
        return;
    }
    if (megaChatIsReady) {
        megaChat._queuedMccPackets.push(a);
    }
    else if (Array.isArray(loadfm.chatmcf)) {
        // Merge if exists.
        // This can happen in case some data came from fmdb, but there were still queued ap's (mcpc for
        // added/removed participants). If this doesn't merge the chatmcf entry, this would end up removing the
        // 'ck', since mcpc doesn't contain 'ck' properties and the chat would render useless (no key).
        var i = loadfm.chatmcf.length;
        while (i--) {
            var entry = loadfm.chatmcf[i];
            if (entry.id === a.id) {
                delete a.a;
                Object.assign(entry, a);
                a = entry;
                break;
            }
        }
        if (i < 0) {
            loadfm.chatmcf.push(a);
        }
    }
    else {
        console.error('unable to parse mcc packet');
        const {owner, actors} = mBroadcaster.crossTab;
        eventlog(
            99779,
            JSON.stringify([
                1,
                buildVersion && buildVersion.website || 'dev',
                sessionStorage.updateRequiredBy | 0,
                loadfm.chatmcf === null ? 'null' : typeof loadfm.chatmcf,
                u_type | 0,
                (!!owner) | 0,
                Object(actors).length | 0
            ])
        );
    }

    if (fmdb) {
        delete a.a;
        fmdb.add('mcf', {id: a.id, d: a});
    }
};

// MEGAchat archive/unarchive
scparser.mcfc = scparser.mcfpc = function(a) {
    'use strict';
    if (folderlink) {
        return;
    }
    if (window.megaChatIsReady) {
        var room = megaChat.getChatById(a.id);
        if (room) {
            return room.updateFlags(a.f, true);
        }
    }

    if (!loadfm.chatmcfc) {
        loadfm.chatmcfc = {};
    }
    loadfm.chatmcfc[a.id] = a.f;
};


scparser.$add('_sn', function(a) {
    // sn update?
    if (d) {
        console.info(` --- New SN: ${a.sn}`);
    }
    onIdle(() => setsn(a.sn));

    // rewrite accumulated RSA keys to AES to save CPU & bandwidth & space
    crypto_node_rsa2aes();

    // rewrite accumulated RSA keys to AES to save CPU & bandwidth & space
    crypto_share_rsa2aes();

    // reset state
    scinshare = Object.create(null);

    if (megaChatIsReady) {
        megaChat.onSnActionPacketReceived();
    }
});

scparser.$add('_fm', function() {
    // completed initial processing, enable UI
    crypto_fixmissingkeys(missingkeys);
    delay('reqmissingkeys', crypto_reqmissingkeys, 4e3);
    loadfm_done();
});

// sub-user status change in business account
scparser.$add('ssc', process_businessAccountSubUsers_SC);

// business account change which requires reload (such as payment against expired account)
scparser.$add('ub', function() {
    "use strict";
    if (!folderlink) {
        fm_fullreload(null, 'ub-business').catch(dump);
    }
});

// Pro Flexi account change which requires reload (such as payment against expired account)
scparser.$add('upf', () => {
    "use strict";
    if (!folderlink) {
        fm_fullreload(null, 'upf-proflexi').catch(dump);
    }
});

// Sets handlers
scparser.$add('asp', (data) => {
    'use strict';
    if (folderlink) {
        return;
    }
    mega.sets.parseAsp(data);
});
scparser.$add('asr',(data) => {
    'use strict';
    if (folderlink) {
        return;
    }
    mega.sets.parseAsr(data);
});
scparser.$add('aep', (data) => {
    'use strict';
    if (folderlink) {
        return;
    }
    mega.sets.parseAep(data);
});
scparser.$add('aer', (data) => {
    'use strict';
    if (folderlink) {
        return;
    }
    mega.sets.parseAer(data);
});
scparser.$add('ass', (data) => {
    'use strict';
    mega.sets.parseAss(data);
});

scparser.$notify = function(a) {
    // only show a notification if we did not trigger the action ourselves
    if (!pfid && u_attr && a.ou !== u_attr.u) {
        notify.notifyFromActionPacket(a);
    }
};

scparser.$call = function(a, scnodes) {
    'use strict';

    // eslint-disable-next-line local-rules/hints
    try {
        if (scparser.$common[a.a]) {
            // no matter who triggered it
            scparser.$common[a.a](a);
        }
        else if (scparser[a.i]) {
            // triggered locally
            if (scparser[a.i][a.a]) {
                scparser[a.i][a.a](a);
            }
        }
        else if (scparser[a.a]) {
            // triggered remotely or cached.
            scparser[a.a](a, scnodes);
        }
        else if (d) {
            console.debug(`Ignoring unsupported SC command ${a.a}`, a);
        }
    }
    catch (ex) {
        console.error('scparser', ex);
        reportError(ex);
    }
};

// perform post-execution UI work
// eslint-disable-next-line complexity
scparser.$finalize = async() => {
    'use strict';

    // scq ran empty - nothing to do for now
    if (d && sccount) {
        console.info(`${sccount} SC command(s) processed.`);
    }

    if (!fminitialized || !sccount) {
        sccount = 0;
        scinflight = false;
        return;
    }

    if (newnodes.length) {

        delay('ui:fm.updated', () => M.updFileManagerUI().catch(dump), 80);
    }
    delay('thumbnails', fm_thumbnails, 3200);

    if (loadavatars.length) {
        useravatar.refresh(loadavatars).catch(dump);
        loadavatars = [];
    }

    // Update Info panel UI
    if (!is_mobile) {
        delay('infoPanel', mega.ui.mInfoPanel.reRenderIfVisible.bind(mega.ui.mInfoPanel, $.selected));
    }

    if (scsharesuiupd) {
        onIdle(() => {
            M.buildtree({h: 'shares'}, M.buildtree.FORCE_REBUILD);
            M.buildtree({h: 'out-shares'}, M.buildtree.FORCE_REBUILD);

            if (M.currentrootid === 'shares' || M.currentrootid === 'out-shares') {

                M.openFolder(M.currentdirid, true).catch(dump);
            }
            else if (megaChatIsReady && M.chat && megaChat.routingSection === "contacts") {
                const id = String(M.currentdirid).substr(14);
                mBroadcaster.sendMessage(`fmViewUpdate:${id}`);
            }

            if ($.dialog === 'share') {
                // Re-render the content of access list in share dialog
                renderShareDialogAccessList();
            }
        });

        scsharesuiupd = false;
    }

    if (scpubliclinksuiupd) {
        onIdle(() => {
            M.buildtree({h: 'public-links'}, M.buildtree.FORCE_REBUILD);

            if (M.currentrootid === 'public-links') {
                M.openFolder(M.currentdirid, true);
            }
        });

        scpubliclinksuiupd = false;
    }

    if (!pfid && $.len(sckeyrequest)) {
        const keyof = (h) => crypto_keyok(M.d[h]);

        if (d) {
            console.debug('Supplying requested keys...', sckeyrequest);
        }

        // eslint-disable-next-line guard-for-in
        for (const h in sckeyrequest) {
            const n = sckeyrequest[h].filter(keyof);
            const cr = crypto_makecr(n, [h], true);

            if (cr[2].length) {
                api_req({a: 'k', cr, i: requesti});
            }
        }

        sckeyrequest = Object.create(null);
    }

    if (`chat/contacts/${scContactsSharesUIUpdate}` === M.currentdirid) {
        onIdle(((handle) => {
            mBroadcaster.sendMessage(`fmViewUpdate:${handle}`);
        }).bind(null, scContactsSharesUIUpdate));

        scContactsSharesUIUpdate = false;
    }

    sccount = 0;
    scinflight = false;
    queueMicrotask(resumesc);
};

// if no execsc() thread is running, check if one should be, and start it if so.
function resumesc() {
    "use strict";

    if (!scinflight && scq[scqtail]) {
        scinflight = true;
        execsc();
    }
}

// execute actionpackets from scq[scqtail] onwards
function execsc() {
    "use strict";

    let tickcount = 0;
    const tick = Date.now();

    do {
        let pkt = false;
        let lock = true;
        let i = scqtail;

        while (scq[i] && scq[i][0] && !scwaitnodes[i] && !nodesinflight[i]) {
            if (pkt) {
                const a = scq[i][0];

                if (a.i !== pkt.i) {
                    lock = false;
                    break;
                }
            }

            pkt = scq[i++][0];

            if (!pkt.i || pkt.i === requesti) {
                lock = false;
                break;
            }
        }

        if (lock) {
            return scparser.$finalize();
        }
        const [a, scnodes] = scq[scqtail];

        // If there is any listener waiting for acknowledge from API, dispatch it.
        if ((a.i || a.st) && a.i !== requesti) {
            const q = a.i && scq[scqtail + 1];
            const v = api.ack({...a, scnodes}, a.i, q && (q[0].i === a.i || a.st && a.st === q[0].st));

            switch (v) {
                case 7:
                    if (d) {
                        api.webLockSummary();
                        console.info(`Awaiting API response for SC command '${a.a}..${a.st}..${a.i}'`);
                    }
                    return;
                case 5:
                    a.i = requesti;
                    break;
            }
        }

        delete scq[scqtail++];
        delete a.scqi;

        if (d) {
            console.info(`Received SC command "${a.a}"${a.i === requesti ? ' (triggered locally)' : ''}`, a);
            console.assert(a.i !== requesti || !a.st || a.st === api.currst, `${a.i} < ${a.st} != ${api.currst}`);
        }

        // process action-packet
        scparser.$call(a, scnodes);

        if (a.st) {
            api.catchup(a);
        }

        sccount++;
        tickcount++;
    } while (Date.now() - tick < 200);

    if (d) {
        console.log(`Processed ${tickcount} SC commands in the past 200 ms`);
    }
    onIdle(execsc);
}

// a node was updated significantly: write to DB and redraw
function fm_updated(n) {
    "use strict";

    M.nodeUpdated(n);

    if (fminitialized) {
        removeUInode(n.h);
        newnodes.push(n);
        if (M.megaRender) {
            M.megaRender.revokeDOMNode(n.h, true);
        }
        delay('ui:fm.updated', () => M.updFileManagerUI().catch(dump), 30);
    }
}

function initworkerpool() {
    "use strict";

    // Allow all 0 keys to be used (for those users that used a bad client that want to retrieve their files)
    const allowNullKeys = localStorage.getItem('allownullkeys') ? 1 : undefined;
    if (allowNullKeys) {
        self.allowNullKeys = allowNullKeys;
    }
    const {secureKeyMgr} = self;
    if (secureKeyMgr && d) {
        console.info('Secure Keys Management.', mega.keyMgr.generation);
    }

    const workerStateData = {
        d,
        u_k,
        u_privk,
        u_handle,
        secureKeyMgr,
        allowNullKeys,
        usk: window.u_attr && u_attr['*~usk']
    };

    // re/initialize workers (with state for a user account fetch, if applies)
    decWorkerPool.init(worker_procmsg, 8, !pfid && workerStateData);

    if (d) {
        console.debug('initworkerpool', decWorkerPool);
    }
}

/**
 * Queue a DB invalidation-plus-reload request to the FMDB subsystem.
 * If it isn't up, reload directly.
 *
 * The server-side tree-cache may be wiped,
 * e.g., because it's too old or damaged (otherwise, we could run into an endless loop)
 *
 * @param {Boolean|MEGAPIRequest} [light] Perform a light reload, without tree-cache wiping.
 * @param {String} [logMsg] optional event-log message, if light != true
 * @returns {Promise<void>} undefined
 */
async function fm_fullreload(light, logMsg) {
    "use strict";

    // FIXME: properly encapsulate ALL client state in an object
    // that supports destruction.
    // (at the moment, if we wipe the DB and then call loadfm(),
    // there will be way too much attribute, key and chat stuff already
    // churning away - we simply cannot just delete their databases
    // without restarting them.
    // until then - it's the sledgehammer method; can't be anything
    // more surgical :(
    if (light !== true) {
        if (light instanceof MEGAPIRequest) {
            light.abort();
        }

        if (logMsg === 'ETOOMANY' && mega.loadReport.mode < 2 && !sessionStorage.lightTreeReload) {
            sessionStorage.lightTreeReload = 1;
        }
        else {
            localStorage.force = 1;
            delete sessionStorage.lightTreeReload;
        }

    }

    if (window.loadingDialog) {
        // 1141: 'Please be patient.'
        loadingInitDialog.hide('force');
        loadingDialog.show('full-reload', l[1141]);
        loadingDialog.show = loadingDialog.hide = nop;
    }

    // stop further SC processing
    window.execsc = nop;

    // and error reporting, if any
    window.onerror = null;

    // nuke w/sc connection
    getsc.stop(-1, 'full-reload');
    window.getsc = nop;
    getsc.validate = nop;

    return Promise.allSettled([
        fmdb && fmdb.invalidate(),
        logMsg && eventlog(99624, logMsg)
    ]).then(() => location.reload(true));
}

// this receives the ok elements one by one as per the filter rule
// to facilitate the decryption of outbound shares, the API now sends ok before f
function tree_ok0(ok) {
    "use strict";

    if (self.secureKeyMgr) {
        if (d > 2) {
            console.warn('Secure environment, moving on...', ok);
        }
        return;
    }

    if (fmdb) {
        fmdb.add('ok', { h : ok.h, d : ok });
    }

    // bind outbound share root to specific worker, post ok element to that worker
    // FIXME: check if nested outbound shares are returned with all shareufskeys!
    // if that is not the case, we need to bind all ok handles to the same worker
    if (decWorkerPool.ok) {
        decWorkerPool.postNode(ok);
    }
    else if (crypto_handleauthcheck(ok.h, ok.ha)) {
        if (d) {
            console.log(`Successfully decrypted sharekeys for ${ok.h}`);
        }
        const key = decrypt_key(u_k_aes, base64_to_a32(ok.k));
        crypto_setsharekey2(ok.h, key);
    }
    else {
        console.error(`handleauthcheck() failed for ${ok.h}`);
    }
}

/**
 * Emplace node into M.d and M.c
 *
 * @param {Object}  node   The node to add
 * @param {Boolean} [noc]  Whether adding to M.c should be skipped, only used by fetchchildren!
 */
function emplacenode(node, noc) {
    "use strict";

    if (node.p) {
        // we have to add M.c[sharinguserhandle] records explicitly as
        // node.p has ceased to be the sharing user handle
        if (node.su) {
            if (!M.c[node.su]) {
                M.c[node.su] = Object.create(null);
            }
            M.c[node.su][node.h] = node.t + 1;
        }
        if (!noc) {
            if (!M.c[node.p]) {
                M.c[node.p] = Object.create(null);
            }
            M.c[node.p][node.h] = node.t + 1;
        }

        if (node.hash) {
            if (!M.h[node.hash]) {
                M.h[node.hash] = new Set();
            }
            M.h[node.hash].add(node.h);
        }
    }
    else if (node.t > 1 && node.t < 5) {
        M[['RootID', 'InboxID', 'RubbishID'][node.t - 2]] = node.h;
    }
    else {
        if (d) {
            console.error("Received parent-less node of type " + node.t + ": " + node.h);
        }

        srvlog2('parent-less', node.t, node.h);
    }

    if (!node.h || node.h.length !== 8) {
        if (d && !node.h) {
            console.error('Invalid node placement.', node);
        }
        M.d[node.h] = node;
    }
    else {
        M.d[node.h] = Object.setPrototypeOf(node, MegaNode.prototype);
    }
}

// this receives the node objects one by one as per the filter rule
function tree_node(node) {
    "use strict";

    if (pfkey && !M.RootID) {
        // set up the workers for folder link decryption
        if (decWorkerPool.ok) {
            decWorkerPool.signal({
                d,
                pfkey,
                n_h: node.h,
                secureKeyMgr: self.secureKeyMgr,
                allowNullKeys: self.allowNullKeys
            });
        }
        else {
            crypto_setsharekey2(node.h, base64_to_a32(pfkey));
        }

        M.RootID = node.h;
    }
    else if (M.d[node.h] && (M.d[node.h].name || M.d[node.h].k === undefined)) {
        // already decrypted
        return;
    }

    if (!mega.keyMgr.secure) {
        crypto_rsacheck(node);

        // RSA share key? need to rewrite, too.
        if (node.sk && node.sk.length > 43) {
            rsasharekeys[node.h] = true;
        }
    }

    // children inherit their parents' worker bindings; unbound inshare roots receive a new binding
    // unbound nodes go to a random worker (round-robin assignment)
    if (decWorkerPool.ok) {
        decWorkerPool.postNode(node);
    }
    else {
        crypto_decryptnode(node);
        worker_procmsg({data: node});
    }
}

// this receives the remainder of the JSON after the filter was applied
function tree_residue(data) {
    "use strict";
    assert(this instanceof MEGAPIRequest);

    if (!decWorkerPool.inflight) {
        decWorkerPool.inflight = new Set();
    }
    decWorkerPool.inflight.add(this);

    if (!this.residual.length) {
        this.residual.push(mega.promise);
    }

    // store the residual f response for perusal once all workers signal that they're done
    this.residual.push(...data);

    // request an "I am done" confirmation ({}) from all workers
    if (decWorkerPool.ok) {
        dumpsremaining = decWorkerPool.length;
        decWorkerPool.signal({});
    }
    else {
        dumpsremaining = 1;
        worker_procmsg({ data: { done: 1 } });
    }
}

// process worker responses (decrypted nodes, processed actionpackets, state dumps...)
function worker_procmsg(ev) {
    "use strict";

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
            console.assert(typeof ev.data.k === 'string', `Key-less? node ${ev.data.h}`, ev.data);
            tryCatch(() => crypto_reportmissingkey(ev.data))();
        }

        if (ev.data.scni >= 0) {
            const node = ev.data;
            const {scni, scqp} = node;

            // enqueue processed node
            if (!scq[scni]) {
                scq[scni] = [null, []];
            }
            if (scq[scni][1]) {
                scq[scni][1][scqp] = node;
            }

            delete node.scni;
            delete node.scqp;

            startNodesFetching(scni);
        }
        else {
            // maintain special incoming shares index
            if (ev.data.su) {
                M.c.shares[ev.data.h] = { su : ev.data.su, r : ev.data.r, t: ev.data.h };

                if (u_sharekeys[ev.data.h]) {
                    M.c.shares[ev.data.h].sk = a32_to_base64(u_sharekeys[ev.data.h][0]);
                }
            }

            if (ufsc.cache && ev.data.p) {
                ufsc.feednode(ev.data);
            }

            const ok = fmdb && !fmdb.crashed;
            const emplace = mega.nobp || !ok || fminitialized || fmdb && fmdb.memoize || M.isInRoot(ev.data, true);

            if (ok) {
                fmdb.add('f', {
                    h : ev.data.h,
                    p : ev.data.p,
                    s : ev.data.s >= 0 ? ev.data.s : -ev.data.t,
                    t : ev.data.t ? 1262304e3 - ev.data.ts : ev.data.ts,
                    c : ev.data.hash || '',
                    fa: ev.data.fa || '',
                    d : ev.data
                });
            }

            if (emplace) {
                emplacenode(ev.data);
            }
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
        if (d) {
            console.log(`Worker ${dumpsremaining} done, ${ev.data.jobs} jobs completed.`);
        }

        if (ev.data.sharekeys) {
            for (const h in ev.data.sharekeys) {
                const sk = ev.data.sharekeys[h];

                if (!u_sharekeys[h] || u_sharekeys[h][0] !== sk) {

                    crypto_setsharekey(h, sk);
                }
            }
        }

        if (!--dumpsremaining) {
            // store incoming shares
            for (const h in M.c.shares) {
                if (u_sharekeys[h]) {
                    M.c.shares[h].sk = a32_to_base64(u_sharekeys[h][0]);
                }

                if (fmdb) {
                    fmdb.add('s', {
                        o_t: `${M.c.shares[h].su}*${h}`,
                        d: M.c.shares[h]
                    });
                }
            }

            if (decWorkerPool.inflight) {
                for (const api of decWorkerPool.inflight) {

                    if (api.residual[0]) {
                        api.residual[0].resolve();
                    }
                    else if (d) {
                        console.error('Were two api4 channels running concurrently?', api.residual);
                    }
                }
                decWorkerPool.inflight = null;
            }
        }
    }
    else {
        console.error("Unidentified nodedec worker response:", ev.data);
    }
}

function loadfm(force) {
    "use strict";
    assert(!is_chatlink);

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
            if (!decWorkerPool.ok) {
                initworkerpool();
            }
            M.reset();

            fminitialized  = false;
            loadfm.loading = true;

            // is this a folder link? or do we have no valid cache for this session?
            if (pfid) {
                fmdb = false;
                fetchfm(false).catch(tell);
            }
            else if (!u_k_aes) {
                console.error('No master key found... please contact support@mega.nz');
            }
            else {
                const f_table_schema = '&h, p, s, c, t, fa';
                fmdb = FMDB(u_handle, {
                    // channel 0: transactional by _sn update
                    f      : f_table_schema,   // nodes - handle, parent, size (negative size: type), checksum
                    s      : '&o_t',           // shares - origin/target; both incoming & outgoing
                    ok     : '&h',             // ownerkeys for outgoing shares - handle
                    mk     : '&h',             // missing node keys - handle
                    u      : '&u',             // users - handle
                    ph     : '&h',             // exported links - handle
                    tree   : '&h',             // tree folders - handle
                    suba   : '&s_ac',          // sub_accounts of master business account
                    opc    : '&p',             // outgoing pending contact - id
                    ipc    : '&p',             // incoming pending contact - id
                    ps     : '&h_p',           // pending share - handle/id
                    mcf    : '&id',            // chats - id
                    mcsm   : '&id',            // scheduled meetings - id
                    asp    : '&id, ts, cts',   // Element Sets (set)
                    aep    : '&id, ts, s, h',  // Element Sets (elements)
                    ua     : '&k',             // user attributes - key (maintained by IndexedBKVStorage)
                    _sn    : '&i',             // sn - fixed index 1
                    puf    : '&ph',            // public upload folder - handle
                    pup    : '&p',             // public upload page - handle

                    // channel 1: non-transactional (maintained by IndexedDBKVStorage)
                }, {});

                if (d) {
                    console.time(`get-tree(f:db)`);
                }

                fmdb.init(localStorage.force)
                    .catch(dump)
                    .then(fetchfm)
                    .catch((ex) => {
                        console.error(ex);
                        siteLoadError(ex, 'loadfm');
                    })
                    .finally(() => {
                        if (d) {
                            api.webLockSummary();
                            console.timeEnd(`get-tree(f:db)`);
                        }
                    });
            }
        }
    }
}

async function fetchfm(sn) {
    "use strict";

    // we always intially fetch historical actionpactions
    // before showing the filemanager
    initialscfetch = true;

    // Initialize ufs size cache
    ufsc = new UFSSizeCache();

    // Get the media codecs list ready
    mclp = MediaInfoLib.getMediaCodecsList();

    // worker pending state dump counter
    dumpsremaining = 0;

    // erase existing RootID
    // reason: tree_node must set up the workers as soon as the first node of a folder
    // link arrives, and this is how it knows that it is the first node.
    M.RootID = false;

    if (window.pfcol) {
        console.assert(!window.fmdb);
        console.assert(loadfm.loading);
        console.assert(!loadfm.loaded);

        api.req({ a: 'aft', v: 2 }, 1)
            .then(({ result: { e, n, s, sn } }) => {
                const res = mega.sets.getPublicSetTree(s, e, n, sn);
                loadfm_callback(res);
            })
            .catch((ex) => {
                folderreqerr(false, ex);
                dump(`Could not load collection... Error: ${ex}`);
            });

        return;
    }

    if (!is_mobile) {
        // activate/prefetch attribute cache at this early stage
        await attribCache.load();
    }

    if (typeof sn === 'string' && sn.length === 11) {
        currsn = sn;
        return dbfetchfm();
    }

    /** @property mega.loadReport.mode */
    Object.defineProperty(mega.loadReport, 'mode', {value: 2, writable: false});

    if (!pfid) {
        // dbToNet holds the time wasted trying to read local DB, and having found we have to query the server.
        mega.loadReport.dbToNet = Date.now() - mega.loadReport.startTime;
        mega.loadReport.stepTimeStamp = Date.now();
    }

    // no cache requested or available - get from API.
    // load tree for active GLOBAL context - either we load a folderlink or the
    // user tree, they never coexist, there is no encapsulation/separation of state.
    const payload = {a: 'f', c: 1, r: 1};
    const options = {
        channel: 4,
        dedup: false,
        progress(pcn) {
            window.loadingInitDialog.step2(parseInt(pcn));

            if (pcn > 99 && !mega.loadReport.ttlb) {
                // Load performance report -- time to last byte
                mega.loadReport.ttlb = Date.now() - mega.loadReport.stepTimeStamp;
                mega.loadReport.stepTimeStamp = Date.now();

                mega.loadReport.ttlb += mega.loadReport.ttfb;
                mega.loadReport.ttfm = mega.loadReport.stepTimeStamp;
            }
        }
    };

    // we disallow treecache usage if this is a forced reload
    if (!localStorage.force) {
        payload.ca = 1;
    }
    else if (mBroadcaster.crossTab.owner) {
        delete localStorage.force;
    }

    if (fmdb && mega.infinity) {
        payload.inc = parseInt(localStorage.inclvl) | 1;
    }
    else if (!pfid) {

        // Decide whether to show MEGA Lite mode dialog or not
        tryCatch(() => mega.lite.recommendLiteMode())();
    }

    return api.req(payload, options)
        .then(({result}) => {
            if (!mega.infinity) {
                decWorkerPool.cleanup();

                if (!pfid) {
                    mega.lite.abort();
                }
            }
            loadfm.fromapi = true;
            return dbfetchfm(result);
        });
}

function dbfetchfm(residual) {
    "use strict";
    var tables = {
        tree: function(r) {
            for (var i = r.length; i--;) {
                ufsc.addTreeNode(r[i], true);
            }
            if (d) {
                console.debug('processed %d tree nodes.', r.length);
            }
        },
        opc: processOPC,
        ipc: processIPC,
        ps: function(r) {
            if (r.length) {
                processPS(r, true);
                // processPS may invokes nodeShare(), that uses acquire.
                return dbfetch.acquire(r.map(n => n.h));
            }
        },
        puf: function _(r) {
            if (r.length) {
                if (d) {
                    console.log('#file-request - dbfetchfm - puf', r);
                }
                return mega.fileRequest.processPuHandleFromDB(r);
            }
        },
        pup: function(r) {
            if (r.length) {
                if (d) {
                    console.log('#file-request - dbfetchfm - pup', r);
                }
                return mega.fileRequest.processPuPageFromDB(r);
            }
        },
        suba: process_suba,
        mcf: 1,
        mcsm: 2
    };
    var tableProc = function(t) {
        return function(r) {
            if (tables[t] === 1) {
                if (r.length > 0) {
                    // only set chatmcf is there is anything returned
                    // if not, this would force the chat to do a 'mcf' call
                    loadfm.chatmcf = r;
                }
                else {
                    loadfm.chatmcf = -1;
                }
            }
            else if (tables[t] === 2) {
                loadfm.chatmcsm = r.length > 0 ? r : -1;
            }
            else {
                return tables[t](r, true);
            }
        };
    };
    loadingInitDialog.step2();

    const isFromAPI = !!loadfm.fromapi;
    const loadReport = isFromAPI ? nop : (key) => {
        const now = Date.now();
        mega.loadReport[key] = now - mega.loadReport.stepTimeStamp;
        mega.loadReport.stepTimeStamp = now;
    };
    const finish = () => {

        if (isFromAPI) {
            window.loadingInitDialog.step3(1, 20);
            return tSleep(0.3, residual || false).then(loadfm_callback);
        }

        return getsc(true);
    };

    if (!window.fmdb) {
        console.assert(isFromAPI);
        return onIdle(finish);
    }

    if (isFromAPI) {
        // Tree nodes are already in memory.
        delete tables.tree;
    }

    if (d) {
        console.time('dbfetchfm');
    }

    return Promise.all([fmdb.get('ok'), dbfetch.init()])
        .then(([ok]) => {
            process_ok(ok, true);

            loadReport('recvNodes');
            return Promise.all([fmdb.get('mk'), fmdb.get('u'), fmdb.get('s')]);
        })
        .then(([mk, users, shares]) => {
            var promises = [];

            crypto_missingkeysfromdb(mk);
            mega.loadReport.pn1 = Date.now() - mega.loadReport.stepTimeStamp;

            process_u(users, true);
            loadReport('pn2');
            // @todo deprecate those pn1-pn5 ...
            loadReport('pn3');

            const r = shares;
            for (var i = r.length; i--;) {
                if (r[i].su) {
                    // this is an inbound share
                    M.c.shares[r[i].t] = r[i];

                    if (r[i].sk) {
                        crypto_setsharekey(r[i].t, base64_to_a32(r[i].sk), true);
                    }
                }
                else {
                    // this is an outbound share
                    promises.push(M.nodeShare(r[i].h, r[i], true));
                }
            }
            loadReport('pn4');

            if (promises.length) {
                // handle all outbound shares through a single promise.
                // if an ENOENT happens, this won't halt the process...
                promises = [Promise.allSettled(promises)];
            }

            for (var j = 0, it = Object.keys(tables); j < it.length; ++j) {
                var t = it[j];
                promises.push(fmdb.get(t).then(tableProc(t)).catch(dump));
            }
            loadReport('pn5');

            return Promise.all(promises);
        })
        .then((r) => {
            if (d) {
                console.info('All settled, %d operations completed to load from DB.', r.length);
                console.timeEnd('dbfetchfm');
            }

            if (!isFromAPI) {
                mega.loadReport.mode = 1;
                mega.loadReport.procNodeCount = Object.keys(M.d || {}).length;
                loadReport('procNodes');
            }

            if (!mBroadcaster.crossTab.owner && window.fmdb) {
                // on a secondary tab, prevent writing to DB once we have read its contents
                fmdb.crashed = 666;
                fmdb.pending = [[]];
            }
            console.assert(window.fmdb, 'check what is going on here...');
        })
        .then(finish);
}

// returns tree type h is in
// FIXME: make result numeric
function treetype(h) {
    "use strict";

    for (;;) {
        if (!M.d[h]) {
            return h;
        }

        if (h === M.InboxID) {
            return 'inbox';
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

// determine whether a node is shared
async function shared(h) {
    "use strict";

    if (!M.d[h]) {
        await dbfetch.acquire(h);
    }
    return shared.is(h);
}

shared.is = function(h) {
    'use strict';

    while (M.d[h]) {
        if (M.ps[h] || M.d[h].shares) {
            return h;
        }
        h = M.d[h].p;
    }
    return false;
};

// returns sharing user (or false if not in an inshare)
function sharer(h) {
    "use strict";

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
    "use strict";

    if (folderlink) {
        return false;
    }

    var r = false, totype = treetype(toid);

    for (var i = ids.length; i--; ) {
        var fromid = ids[i];

        if (fromid === toid || !M.d[fromid]) return false;

        var fromtype = treetype(fromid);

        if (fromtype === 'inbox' || treetype(toid) === 'inbox') {

            return false;
        }

        if (totype == 'cloud') {
            if (fromtype == 'cloud') {
                // within and between own trees, always allow move ...
                if (M.isCircular(fromid, toid)) {
                    // ... except of a folder into itself or a subfolder
                    return false;
                }

                r = 'move';
            }
            else if (fromtype == 'shares') {
                r = toid === M.RubbishID ? 'copydel' : 'copy';
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
        else if (totype === 'shares' && M.getNodeRights(toid)) {
            if (fromtype == 'shares') {
                if (sharer(fromid) === sharer(toid)) {
                    if (M.isCircular(fromid, toid)) {
                        // prevent moving/copying of a folder into iself or a subfolder
                        return false;
                    }

                    //r = (M.getNodeRights(fromid) > 1) ? 'move' : 'copy'; //commented out by khaled - fixing Bug #7697
                    if (M.getNodeRights(fromid) > 1) { // added by khaled
                        r = 'move';
                    }
                    else {
                        return false;  // fixing Bug #7697, dont allow drag and drop if permission <2
                    }
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

/**
 * Share a node with other users.
 *
 * Recreate target/users list and call appropriate api_setshare function.
 * @param {String} nodeId
 *     Selected node id
 * @param {Array} targets
 *     List of JSON_Object containing user email or user handle and access permission,
 *     i.e. `{ u: <user_email>, r: <access_permission> }`.
 * @returns {Promise}
 */
async function doShare(nodeId, targets) {
    'use strict';

    if (!nodeId || !targets || !targets.length) {
        console.error('Invalid parameters for doShare()', nodeId, targets);
        throw EARGS;
    }

    // Get complete children directory structure for root node with id === nodeId
    const childNodesId = mega.keyMgr.getShareSnapshot(nodeId);
    assert(childNodesId, 'Share-snapshot lost.');

    // Search by email only don't use handle cause user can re-register account
    const users = await Promise.all(targets.map((t) => crypt.getRSAPubKeyAttribute(t.u).catch(() => false)));

    // Create new lists of users, active (with user handle) and non existing (pending)
    for (let i = targets.length; i--;) {
        const {pubk, u: userHandle} = users[i];
        const {u: email, r: accessRights} = targets[i];

        const target = {r: accessRights, u: email};
        if (pubk) {
            target.u = userHandle;

            // M.u[].c might be 0 for invisible/removed, or undefined for pending contact
            if (!(userHandle in M.u && M.u[userHandle].c)) {
                target.m = email;

                // this was never correct..
                // target.k = pubk;
            }
        }

        targets[i] = target;
    }

    let res = await api_setshare(nodeId, targets, childNodesId).catch(echo);

    if (!res.r) {
        res = {r: [res]};
    }
    window.loadingDialog.hide();

    for (let i = res.r.length; i--;) {
        if (res.r[i] !== 0) {
            throw new Error(`Share operation failed, ${JSON.stringify(res.r[i])}`);
        }
    }

    // @todo is this still needed (here) ?
    for (const i in res.u) {
        M.addUser(res.u[i]);
    }

    onIdle(() => {
        // Render the outgoing shares page after set the new share node
        if (M.currentrootid === 'out-shares') {
            M.openFolder(M.currentdirid, true);
        }
    });

    return res;
}

// moving a foreign node (one that is not owned by u_handle) from an outshare
// to a location not covered by any u_sharekey requires taking ownership
// and re-encrypting its key with u_k.
// moving a tree to a (possibly nested) outshare requires a full set of keys
// to be provided. FIXME: record which keys are known to the API and exclude
// those that are to reduce API traffic.
function processmove(apireq) {
    'use strict';

    if (d > 2) {
        console.log('processmove', apireq);
    }

    var root = {};
    var tsharepath = M.getShareNodesSync(apireq.t);
    var nsharepath = M.getShareNodesSync(apireq.n, root, true);
    var movingnodes = false;

    // is the node to be moved in an outshare (or possibly multiple nested ones)?
    if (nsharepath.length && root.handle) {
        // yes, it is - are we moving to an outshare?
        if (!tsharepath.length) {
            // we are not - check for any foreign nodes being moved
            movingnodes = M.getNodesSync(apireq.n, true);

            // update all foreign nodes' keys and take ownership
            api_updfkey(movingnodes).catch(dump);
        }
    }
    tsharepath = M.getShareNodesSync(apireq.t, null, true);

    // is the target location in any shares? add CR element.
    if (tsharepath.length) {
        if (!movingnodes) {
            movingnodes = M.getNodesSync(apireq.n, true);
        }

        apireq.cr = crypto_makecr(movingnodes, tsharepath, true);
    }

    return apireq;
}

function process_f(f, updateVersioning) {
    "use strict";

    for (let i = 0; i < f.length; i++) {
        const n = f[i];

        if (updateVersioning) {
            // this is a response from updating versioning, clear the previous versions first.
            if (M.d[n.h]) {
                M.delNode(n.h);
                ufsc.delNode(n.h);
            }

            n.fv = 1;
        }

        M.addNode(n);
        ufsc.addNode(n);
    }
}

/**
 * Handle incoming pending contacts
 *
 * @param {Array} a action-packets
 * @param {Boolean} [ignoreDB] do not persist
 */
function processIPC(a, ignoreDB) {
    'use strict';

    for (let i = 0; i < a.length; ++i) {
        const ipc = a[i];
        const {dts, m, p} = ipc;

        // Deletion of incomming pending contact request, user who sent request, canceled it
        if (dts) {
            M.delIPC(p);

            if (fminitialized) {

                // Update token.input plugin
                removeFromMultiInputDDL('.share-multiple-input', {id: m, name: m});
            }
        }
        else {
            // Update ipc status
            M.addIPC(ipc, ignoreDB);

            if (fminitialized) {
                // Don't prevent contact creation when there's already IPC available
                // When user add contact who already sent IPC, server will automatically create full contact
                const name = M.getNameByHandle(p);

                // Update token.input plugin
                addToMultiInputDropDownList('.share-multiple-input', [{id: m, name}]);
            }
        }
    }
}

/**
 * Handle outgoing pending contacts
 *
 * @param {Array} a action-packets
 * @param {Boolean} [ignoreDB] do not persist
 */
function processOPC(a, ignoreDB) {
    'use strict';

    for (let i = 0; i < a.length; ++i) {
        const opc = a[i];
        const {dts, m, p} = opc;

        if (dts) {
            M.delOPC(p);

            if (fminitialized) {

                // Update tokenInput plugin
                removeFromMultiInputDDL('.share-multiple-input', {id: m, name: m});
                removeFromMultiInputDDL('.add-contact-multiple-input', {id: m, name: m});
            }
        }
        else {
            // Search through M.opc to find duplicated e-mail with .dts
            // If found remove deleted opc
            // And update sent-request grid
            for (var k in M.opc) {
                if (M.opc[k].dts && M.opc[k].m === m) {
                    delete M.opc[k];
                    break;
                }
            }
            M.addOPC(opc, ignoreDB);

            if (fminitialized) {
                const name = M.getNameByHandle(p);

                // Update tokenInput plugin
                addToMultiInputDropDownList('.share-multiple-input', [{id: m, name}]);
                addToMultiInputDropDownList('.add-contact-multiple-input', [{id: m, name}]);
            }
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
    'use strict';
    var nodeId;
    var publicHandleId;
    var UiExportLink = fminitialized && !is_mobile && new mega.UI.Share.ExportLink();

    for (var i = publicHandles.length; i--; ) {
        var value = publicHandles[i];

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

            if (fminitialized && M.currentdirid === 'public-links') {
                removeUInode(nodeId, value.p);

                if (typeof selectionManager !== 'undefined') {
                    selectionManager.remove_from_selection(nodeId);
                }
            }

            if (UiExportLink) {
                UiExportLink.removeExportLinkIcon(nodeId);
            }
        }
        else {
            var share = clone(value);
            delete share.a;
            delete share.i;
            delete share.n;
            delete share.st;
            delete share.usn;
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

        if (is_mobile) {
            mobile.cloud.updateLinkIcon(nodeId);
        }

        if (UiExportLink && (value.down !== undefined)) {
            UiExportLink.updateTakenDownItem(nodeId, value.down);
        }

        if (fminitialized && M.recentsRender) {
            M.recentsRender.nodeChanged(nodeId);
        }
    }
}

/**
 * Handle pending shares
 *
 * @param {array.<JSON_objects>} pending shares
 */
function processPS(pendingShares, ignoreDB) {
    'use strict';
    for (let i = 0; i < pendingShares.length; ++i) {
        const ps = pendingShares[i];

        // From gettree
        if (ps.h) {
            M.addPS(ps, ignoreDB);
        }
        // Situation different from gettree, s2 from API response, doesn't have .h attr instead have .n
        else {
            const timeStamp = ps.ts;
            const nodeHandle = ps.n;
            const shareRights = ps.r;
            const pendingContactId = ps.p;
            const contactName = M.getNameByHandle(pendingContactId);

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

                if (fminitialized && M.opc && M.opc[ps.p]) {
                    // Update tokenInput plugin
                    addToMultiInputDropDownList('.share-multiple-input', [{
                            id: M.opc[pendingContactId].m,
                            name: contactName
                        }]);
                    addToMultiInputDropDownList('.add-contact-multiple-input', [{
                            id: M.opc[pendingContactId].m,
                            name: contactName
                        }]);
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

                if (M.d[nodeHandle] && M.d[nodeHandle].t) {
                    // Update M.IS_SHARED flag
                    ufsc.addTreeNode(M.d[nodeHandle]);
                }
            }

            if (fminitialized) {
                sharedUInode(nodeHandle);
            }
        }
    }
}

/**
 * Updates contact/user data in global variable M.u, local dB and taking care of items in share and add contacts
 * dialogs dropdown
 *
 * @param {Object} users Information about users (properties defined in js/fm/megadata.js)
 */
function process_u(users, ignoreDB) {
    "use strict";

    // If nicknames private encrypted attribute is set.
    if (nicknames.cache === false && Object(u_attr).hasOwnProperty('*!>alias')) {
        nicknames.decryptAndCacheNicknames(u_attr['*!>alias']);
    }

    for (var i = 0; i < users.length; i++) {

        var userEmail = users[i].m;
        var userHandle = users[i].u;
        var userStatus = users[i].c;

        // If this user had a nickname in the past, don't delete it if they are now added as a contact
        // Or if the nickname is set in the initial 'ug' API request, then set it
        users[i].nickname = userHandle in M.u && M.u[userHandle].nickname || nicknames.cache[userHandle] || '';

        if (userStatus === 1) {
            users[i].h = userHandle;
            users[i].t = 1;
            users[i].p = 'contacts';

            M.addNode(users[i], ignoreDB);

            var contactName = M.getNameByHandle(userHandle);

            // Update token.input plugin
            addToMultiInputDropDownList('.share-multiple-input', [{id: userEmail, name: contactName}]);
            addToMultiInputDropDownList('.add-contact-multiple-input', [{id: userEmail, name: contactName}]);
        }
        else if (M.d[userHandle]) {
            M.delNode(userHandle, ignoreDB);

            // Update token.input plugin
            removeFromMultiInputDDL('.share-multiple-input', {id: userEmail, name: userEmail});
            removeFromMultiInputDDL('.add-contact-multiple-input', {id: userEmail, name: userEmail});
        }

        // Update user attributes M.u
        M.addUser(users[i], ignoreDB);

        // If a contact, sync data objs M.d and M.u
        if (userStatus === 1) {
            M.d[userHandle] = M.u[userHandle];
        }
    }
}

/**
 * a function to parse the JSON object received holding information about sub-accounts of a business account.
 * This object will exist only in business accounts.
 * @param {String[]} suba    the object to parse, it must contain an array of sub-accounts ids (can be empty)
 * @param {Boolean} ignoreDB if we want to skip DB updating
 */
function process_suba(suba, ignoreDB) {
    "use strict";
    if (!suba || !suba.length) {
        return;
    }

    M.onFileManagerReady(() => {

        M.require('businessAcc_js', 'businessAccUI_js').done(() => {

            // the response is an array of users's handles (Masters). this means at least it will contain
            // the current user handle.
            // later-on we need to iterate on all of them. For now we dont know how to treat sub-masters yet
            // --> we will target only current users's subs
            const bAccount = new BusinessAccount();
            // if (!suba || !suba[u_handle]) {
            //    return;
            // }
            // suba = suba[u_handle];
            if (suba.length) {
                for (var k = 0; k < suba.length; k++) {
                    bAccount.parseSUBA(suba[k], ignoreDB);
                }
            }
            // else {
            //    bAccount.parseSUBA(null, true); // dummy call to flag that this is a master B-account
            // }
        });
    });
}

/**
 * A function to precess the action packets received related to business account sub-users
 * @param {Object} packet
 */
function process_businessAccountSubUsers_SC(packet) {
    "use strict";
    // we dont process these action packets on mobile
    if (is_mobile) {
        return;
    }
    if (!packet) { // no packet
        return;
    }
    if (!M.suba) { // no sub-users in memory
        return;
    }
    if (!packet.a) { // no packet type/operation
        return;
    }
    if (!packet.u) { // no user handle
        return;
    }

    var subUser = M.suba[packet.u];
    if (!subUser) { // sub-user not found --> it's new one
        subUser = Object.create(null);
        subUser.u = packet.u;
    }

    var valChanged = false;

    if ('s' in packet && packet.s !== subUser.s) { // new status
        subUser.s = packet.s;
        valChanged = true;
    }
    if (packet.e && packet.e !== subUser.e) { // new email
        subUser.e = packet.e;
        valChanged = true;
    }
    if (packet.firstname && packet.firstname !== subUser.firstname) { // new first-name
        subUser.firstname = packet.firstname;
        valChanged = true;
    }
    if (packet.lastname && packet.lastname !== subUser.lastname) { // new last-name
        subUser.lastname = packet.lastname;
        valChanged = true;
    }
    if (packet.position && packet.position !== subUser.position) { // new position
        subUser.position = packet.position;
        valChanged = true;
    }
    if (packet.idnum && packet.idnum !== subUser.idnum) { // new id number
        subUser.idnum = packet.idnum;
        valChanged = true;
    }
    if (packet.phonenum && packet.phonenum !== subUser.phonenum) { // new phone number
        subUser.phonenum = packet.phonenum;
        valChanged = true;
    }
    if (packet.location && packet.location !== subUser.location) { // new location
        subUser.location = packet.location;
        valChanged = true;
    }
    if (valChanged) {
        M.require('businessAcc_js', 'businessAccUI_js').done(
            function() {
                var bAccount = new BusinessAccount();
                bAccount.parseSUBA(subUser, false, true);
            }
        );
    }
}

function process_ok(ok, ignoreDB) {
    "use strict";

    for (var i = ok.length; i--; ) {
        if (ok[i].ha === crypto_handleauth(ok[i].h))
        {
            if (fmdb && !pfkey && !ignoreDB) {
                fmdb.add('ok', { h : ok[i].h, d : ok[i] });
            }
            crypto_setsharekey(ok[i].h, decrypt_key(u_k_aes, base64_to_a32(ok[i].k)), ignoreDB);
        }
    }
}


function processMCF(mcfResponse, ignoreDB) {
    'use strict';

    if (mcfResponse === EEXPIRED || mcfResponse === EINTERNAL) {
        return;
    }

    // Process mcf response from API (i.e. gettree) or indexedDB
    if (Array.isArray(mcfResponse)) {
        for (var i = mcfResponse.length; i--;) {
            var chatRoomInfo = mcfResponse[i];

            if (fmdb && !pfkey && !ignoreDB) {
                fmdb.add('mcf', {id: chatRoomInfo.id, d: chatRoomInfo});
            }

            if (typeof Chat !== 'undefined') {
                Chat.mcf[chatRoomInfo.id] = chatRoomInfo;
            }
        }
    }
    else if (d) {
        console.error('Unexpected mcf response.', mcfResponse);
    }
}

function processMCSM(mcsm, ignoreDB) {
    'use strict';

    if (Array.isArray(mcsm)) {
        for (let i = 0; i < mcsm.length; i++) {
            const scheduledMeeting = mcsm[i];
            if (fmdb && !pfkey && !ignoreDB) {
                fmdb.add('mcsm', { id: scheduledMeeting.id, d: scheduledMeeting });
            }
            if (typeof Chat !== 'undefined') {
                Chat.mcsm[scheduledMeeting.id] = scheduledMeeting;
            }
        }
    }
}

function folderreqerr(c, e) {
    'use strict';

    var title = (pfcol) ? l.album_broken_link_title : l[1043];
    var message = null;
    var submessage = false;

    u_reset();
    loadingInitDialog.hide();

    if ($.dialog) {
        return mBroadcaster.once('closedialog', SoonFc(90, () => folderreqerr(c, e)));
    }

    if (typeof e === 'object' && e.err < 0) {
        if (e.u === 7) {
            if (e.l === 2) {
                const link = 'https://www.stopitnow.org.uk/concerned-about-your-own-thoughts-or-behaviour/' +
                    'concerned-about-use-of-the-internet/self-help/understanding-the-behaviour/?utm_source=mega' +
                    '&utm_medium=banner&utm_campaign=mega_warning';
                message = l.etd_link_removed_title;
                submessage = `${l.etd_link_removed_body}<br><br>` +
                    `<a class="clickurl" href="${link}" target="_blank" data-eventid="500245">` +
                        l.etd_link_removed_button +
                    `</a>`;
                eventlog(500243);
                if (is_mobile) {
                    message = [message, 'icon sprite-mobile-fm-mono icon-alert-circle-thin-outline', false, submessage];
                }
            }
            else {
                message = l[23243];
                if (is_mobile) {
                    message = [title, 'icon sprite-mobile-fm-mono icon-alert-circle-thin-outline', false, message];
                }
            }
        }
        else {
            e = e.err;
        }
    }

    // If desktop site show "Folder link unavailable" dialog
    parsepage(pages.placeholder);

    // Make sure error code is an integer
    const errorCode = parseInt(e);

    if (!is_mobile) {
        if (errorCode === EARGS) {
            if (pfcol) {
                title = l.album_broken_link_title;
                message = l.album_broken_link_text;
            }
            else {
                title = l[20198];
                message = l[20199];
            }
        }
        else if (errorCode === EEXPIRED) {
            message = l[20856]; // Your link has expired
        }
        else if (pfcol) {
            message = l.album_broken_link_text;
        }
        else if (!message) {
            message = l[1044] + '<ul><li>' + l[1045] + '</li><li>' + l[247] + '</li><li>' + l[1046] + '</li>';
        }

        msgDialog('warninga', title, message, submessage, () => {

            // If the user is logged-in, he'll be redirected to the cloud
            loadSubPage('login');
        });
    }
    else {
        // Show file/folder not found page
        mobile.notFound.show(message || parseInt(e && e.err || e));
    }
}

/**
 * Initialize the chat subsystem.
 * @param {*} [action] Specific action procedure to follow
 * @returns {Promise} promise fulfilled on completion.
 */
function init_chat(action) {
    'use strict';
    return new Promise(function(resolve, reject) {
        var __init_chat = function() {
            var result = false;

            if ((is_chatlink || u_type || is_eplusplus) && !megaChatIsReady) {
                if (d) {
                    console.info('Initializing the chat...');
                }
                var _chat = new Chat();

                // `megaChatIsDisabled` might be set if `new Karere()` failed (Ie, in older browsers)
                if (!window.megaChatIsDisabled) {
                    window.megaChat = _chat;
                    megaChat.init().then(resolve).catch(reject);
                    resolve = null;
                }
            }

            if (!loadfm.loading) {
                window.loadingInitDialog.hide();
            }

            if (resolve) {
                resolve(result);
            }
        };

        if (window.megaChatIsReady) {
            $.tresizer();
            return __init_chat();
        }
        var mclp = MediaInfoLib.getMediaCodecsList();

        if (action === 0x104DF11E5) {
            M.require('chat')
                .always(function() {
                    mclp.always(__init_chat);
                });
        }
        else if (is_chatlink) {
            mclp.always(__init_chat);
        }
        else if (pfid) {
            if (d) {
                console.log('Will not initialize the chat (folder-link)');
            }

            resolve(EACCESS);
        }
        else {
            authring.onAuthringReady('chat').then(__init_chat);
        }
    });
}

function loadfm_callback(res) {
    'use strict';

    if ((parseInt(res) | 0) < 0 || res === undefined) {
        window.loadingInitDialog.hide();

        // tell the user we were unable to retrieve the cloud drive contents, upon clicking OK redirect to /support
        msgDialog('warninga', l[1311], l[16892], api_strerror(res), loadSubPage.bind(null, 'support'));
        return;
    }

    mega.loadReport.recvNodes     = Date.now() - mega.loadReport.stepTimeStamp;
    mega.loadReport.stepTimeStamp = Date.now();

    if (pfkey) {
        folderlink = pfid;

        // Hide the parent, to prevent dbfetch from trying to retrieve it.
        Object(M.d[M.RootID]).p = '';

        // Check if the key for a folder-link was correct
        if (missingkeys[M.RootID]) {
            window.loadingInitDialog.hide();

            loadfm.loaded = false;
            loadfm.loading = false;

            parsepage(pages.placeholder);
            mega.ui.setTheme();

            const n = M.d[M.RootID];
            if (n && typeof n.k === 'string' && !n.k) {
                eventlog(99977, JSON.stringify([1, pfid, M.RootID]));
            }

            return mKeyDialog(pfid, true, true).catch(() => loadSubPage('start'));
        }

        M.affiliate.storeAffiliate(folderlink, 2);
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
    if (res.suba) {
        if (!is_mobile) {
            process_suba(res.suba);
        }
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
        if (res.mcf.pc) {
            loadfm.chatmcf = (loadfm.chatmcf || []).concat(res.mcf.pc);
        }
        // cf will include the flags (like whether it is archived) and chatid,
        // so it needs to combine it before processing it.
        var mergeCfToChatmcf = function(entry) {
            for (var i = 0; i < loadfm.chatmcf.length; i++) {
                if (loadfm.chatmcf[i].id === entry.id) {
                    loadfm.chatmcf[i].f = entry.f;
                }
            }
        };

        if (res.mcf.cf) {
            for (var i = 0; i < res.mcf.cf.length; i++) {
                mergeCfToChatmcf(res.mcf.cf[i]);
            }
        }
        if (res.mcf.pcf) {
            for (var i = 0; i < res.mcf.pcf.length; i++) {
                mergeCfToChatmcf(res.mcf.pcf[i]);
            }
        }
        // ensure the response is saved in fmdb, even if the chat is disabled or not loaded yet
        processMCF(loadfm.chatmcf);
    }

    if (res.aesp) {
        tryCatch(() => {
            const a = res.aesp;

            if ((a.s && a.s.length) | (a.e && a.e.length) | (a.p && a.p.length)) {

                mega.sets.resetDB(res.aesp);
            }
        })();
    }

    if (res.mcsm) {
        loadfm.chatmcsm = res.mcsm;
        processMCSM(loadfm.chatmcsm);
    }
    useravatar.refresh().catch(dump);

    if (localStorage['treefixup$' + u_handle]) {
        // We found inconsistent tree nodes and forced a reload, log it.
        eventlog(99695);
    }

    if (res.f) {
        process_f(res.f);
    }

    // If we have shares, and if a share is for this node, record it on the nodes share list
    if (res.s) {
        if (d) {
            console.info(`[f.s(${res.s.length})] %s`, res.s.map(n => `${n.h}*${n.u}`).sort());
        }
        for (let i = res.s.length; i--;) {
            M.nodeShare(res.s[i].h, res.s[i]);
        }
    }

    // Handle public/export links. Why here? Make sure that M.d already exists
    if (res.ph) {
        processPH(res.ph);
    }

    // Handle versioning nodes
    if (res.f2) {
        process_f(res.f2, true);
    }

    // This package is sent on hard refresh if owner have enabled or disabled PUF
    if (res.uph) {
        mega.fileRequest.processUploadedPuHandles(res.uph).dump('processUPH');
    }

    // decrypt hitherto undecrypted nodes
    crypto_fixmissingkeys(missingkeys);

    if (res.cr) {
        crypto_procmcr(res.cr);
    }

    if (res.sr) {
        crypto_procsr(res.sr);
    }
    setsn(currsn = res.sn);

    mega.loadReport.procNodeCount = Object.keys(M.d || {}).length;
    mega.loadReport.procNodes = Date.now() - mega.loadReport.stepTimeStamp;
    mega.loadReport.stepTimeStamp = Date.now();

    window.loadingInitDialog.step3(20, 35);

    // Time to save the ufs-size-cache, from which M.tree nodes will be created and being
    // those dependent on in-memory-nodes from the initial load to set flags such as SHARED.
    return (async() => ufsc.save())().catch(dump)
        .finally(() => {
            // commit transaction and set sn
            setsn(res.sn);
            currsn = res.sn;

            window.loadingInitDialog.step3(35, 40);

            if (window.pfcol) {
                return loadfm_done(-0x800e0fff);
            }

            // retrieve the initial batch of action packets, if any,
            // we'll then complete the process using loadfm_done()
            getsc(true);
        });
}

/**
 * Function to be invoked when the cloud has finished loading,
 * being the nodes loaded from either server or local cache.
 */
function loadfm_done(mDBload) {

    window.loadingInitDialog.step3(56, 85);

    mDBload = mDBload || !loadfm.fromapi;

    loadfm.loaded = Date.now();
    loadfm.loading = false;
    loadfm.fromapi = false;

    if (d > 1) {
        console.warn('loadfm_done called.', is_fm());
    }

    mega.loadReport.procAPs       = Date.now() - mega.loadReport.stepTimeStamp;
    mega.loadReport.stepTimeStamp = Date.now();

    if (!pfid && u_type == 3) {

        // Ensure tree nodes consistency...
        const blk = {
            t: Object.keys(M.tree[M.RootID] || {}),
            c: Object.keys(M.c[M.RootID] || {}).filter((h) => M.c[M.RootID][h] > 1)
        };
        const {t: {length: tl}, c: {length: cl}} = blk;

        if (tl !== cl) {
            const res = [];
            const src = tl < cl ? 'c' : 't';
            const dst = tl < cl ? 't' : 'c';

            for (let i = blk[src].length; i--;) {
                const h = blk[src][i];

                if (!blk[dst].includes(h)) {
                    const n = M.getNodeByHandle(h);

                    if (!n.s4) {
                        res.push({h, p: n.p, path: M.getNamedPath(h)});
                    }
                }
            }

            if (res.length) {
                console.group(`%cTREE NODES MISMATCH (${dst} < ${src})`, 'font-size:13px', [blk]);
                console.table(res);
                console.groupEnd();
                eventlog(99696, JSON.stringify([1, res.length, tl, cl]));
            }
        }

        // load/initialise the authentication system
        authring.initAuthenticationSystem();
    }

    // This function is invoked once the M.openFolder()'s promise (through renderfm()) is fulfilled.
    var _completion = function() {

        window.loadingInitDialog.step3(100);

        if ((location.host === 'mega.nz' || !megaChatIsDisabled) && !is_mobile) {

            if (!pfid && !loadfm.chatloading && (u_type === 3 || is_eplusplus)) {
                loadfm.chatloading = true;

                M.require('chat')
                    .always(function() {

                        if (typeof ChatRoom !== 'undefined') {

                            if (loadfm.chatmcf) {
                                processMCF(loadfm.chatmcf, true);
                                loadfm.chatmcf = null;
                            }
                            if (loadfm.chatmcsm) {
                                processMCSM(loadfm.chatmcsm, true);
                                loadfm.chatmcsm = null;
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
            }
        }

        // Check Business (or Pro Flexi) account is expired on initial phase in desktop web
        if (!is_mobile && u_attr && (u_attr.b || u_attr.pf)) {

            M.require('businessAcc_js', 'businessAccUI_js').done(() => {

                var business_ui = new BusinessAccountUI();

                if (u_attr.b && u_attr.b.m) {
                    business_ui.showWelcomeDialog();
                }

                // the function will check if the account is expired
                business_ui.showExp_GraceUIElements();
            });
        }

        // check if this a Business sub-user that needs to send his key
        if (u_attr && u_attr.b && !u_attr.b.m && u_attr.b.s !== -1) {

            M.require('businessAcc_js', 'businessAccUI_js').done(() => {

                const business_ui = new BusinessAccountUI();

                business_ui.showVerifyDialog();

            });
        }

        onIdle(() => {
            window.loadingInitDialog.hide();

            // Reposition UI elements right after hiding the loading overlay,
            // without waiting for the lazy $.tresizer() triggered by MegaRender
            fm_resize_handler(true);

            // Securing previously generated public album data to use later in the importing procedure
            if (sessionStorage.albumLinkImport) {
                $.albumImport = Object.values(mega.gallery.albums.store)
                    .find(({ p }) => !!p && p.ph === sessionStorage.albumLinkImport);
                delete sessionStorage.albumLinkImport;
            }
        });

        // -0x800e0fff indicates a call to loadfm() when it was already loaded
        if (mDBload !== -0x800e0fff && !is_mobile) {
            onIdle(function _initialNotify() {

                // If this was called from the initial fm load via gettree or db load, we should request the
                // latest notifications. These must be done after the first getSC call.
                if (!folderlink) {
                    notify.getInitialNotifications();
                }
            });

            if (mBroadcaster.crossTab.owner && !mega.loadReport.sent) {
                mega.loadReport.sent = true;

                var r = mega.loadReport;
                var tick = Date.now() - r.aliveTimeStamp;

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
                    decWorkerPool.ok && decWorkerPool.length || -666,
                    r.ttlb | 0, // time to last byte
                    r.ttfm | 0, // time to fm since ttlb
                    u_type === 3 ? (mBroadcaster.crossTab.owner ? 1 : 0) : -1, // master, or slave tab?
                    r.pn1, r.pn2, r.pn3, r.pn4, r.pn5, // procNodes steps
                    Object.keys(M.tree || {}).length, // total tree nodes
                    r.invisibleTime | 0, // time spent as background tab
                ];

                if (d) {
                    console.debug('loadReport', r, tick, document.hidden);
                }

                if (!(tick > 2100) && !document.hidden) {
                    api_req({a: 'log', e: 99626, m: JSON.stringify(r)});
                }
            }

            if (mDBload) {
                useravatar.refresh().catch(dump);
            }
        }
        if ($.closeMsgDialog) {
            delete $.closeMsgDialog;
            closeMsg();
        }
        clearInterval(mega.loadReport.aliveTimer);
        mega.state &= ~window.MEGAFLAG_LOADINGCLOUD;

        watchdog.notify('loadfm_done');
    };

    return Promise.allSettled([mclp, u_type > 2 && mega.config.fetch()])
        .then(() => {
            let promise = null;

            window.loadingInitDialog.step3(85, 100);

            mega.loadReport.fmConfigFetch = Date.now() - mega.loadReport.stepTimeStamp;
            mega.loadReport.stepTimeStamp = Date.now();

            // are we actually on an #fm/* page?
            if (page !== 'start' && is_fm() || $('.fm-main.default').is(":visible")) {
                promise = M.initFileManager();

                mega.loadReport.renderfm = Date.now() - mega.loadReport.stepTimeStamp;
                mega.loadReport.stepTimeStamp = Date.now();

                // load report - time to fm after last byte received
                mega.loadReport.ttfm = Date.now() - mega.loadReport.ttfm;

                // setup fm-notifications such as 'full' or 'almost-full' if needed.
                if (!pfid && u_type) {
                    M.getStorageState().always((res) => {
                        // 0: Green, 1: Orange (almost full), 2: Red (full)
                        if (res >= 1) {
                            M.checkStorageQuota(50);
                        }
                    });
                    M.myChatFilesFolder.init();
                    M.getMyBackups().catch(dump);
                    M.getCameraUploads().catch(dump);
                }
            }
            else {
                mega.loadReport.ttfm = -1;
                mega.loadReport.renderfm = -1;
            }

            mclp = Promise.resolve();
            return promise;
        })
        .then(_completion)
        .catch((ex) => {
            const eno = typeof ex === 'number' && ex < 0;
            if (eno) {
                ex = api_strerror(ex);
            }

            // give time for window.onerror to fire 'cd2' before showing the blocking confirm-dialog
            setTimeout(() => siteLoadError(ex, 'loadfm'), 2e3);

            // reach window.onerror
            if (!eno) {
                reportError(ex);
            }
        });
}

function fmtreenode(id, e)
{
    if (M.getNodeRoot(id) === 'contacts')
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
    if (n === 'name' && d > 0 && id !== "contacts") {
        // don't delete for "contacts" section, since "status" is the default there.
        delete sortmodes[id];
    }
    else if (n === "status" && d > 0 && id === "contacts") {
        // DO delete for "contacts" section, since "status" is the default there, so default is already d > 1.
        delete sortmodes[id];
    }
    else
        sortmodes[id] = {n: n, d: d};
    mega.config.set('sortmodes', sortmodes);
}

function fmviewmode(id, e)
{
    var viewmodes = {};
    if (typeof fmconfig.viewmodes !== 'undefined')
        viewmodes = fmconfig.viewmodes;
    if (e === 2) {
        viewmodes[id] = 2;
    }
    else if (e)
        viewmodes[id] = 1;
    else
        viewmodes[id] = 0;
    mega.config.set('viewmodes', viewmodes);
}

/** @property window.thumbnails */
lazy(self, 'thumbnails', () => {
    'use strict';
    return new ThumbManager(200, 'otf.thumbs');
});

/** @property fm_thumbnails.exclude */
lazy(fm_thumbnails, 'exclude', () => {
    'use strict';
    const res = {
        recents: 5
    };
    return Object.setPrototypeOf(res, null);
});

function fm_thumbnails(mode, nodeList, callback)
{
    'use strict';

    const pwd = M.currentdirid;
    const exclude = fm_thumbnails.exclude[pwd];
    if ((M.gallery || M.chat || M.albums) && mode !== 'standalone' || exclude > 6) {
        return;
    }
    nodeList = (mode === 'standalone' ? nodeList : false) || M.v;

    let count = 0;
    const transparent = {WEBP: 1, PNG: 1, SVG: 1, GIF: 1};
    const max = M.rmItemsInView ? Math.max(M.rmItemsInView | 0, 48) : Infinity;
    const treq = [];

    const onTheFly =
        !is_mobile && M.viewmode && mode !== 'standalone' && !exclude
        && !mega.config.get('noflytn') ? Object.create(null) : false;

    // check if the node is rendered within/near the view-port.
    const isVisible = (n) => {
        return pwd === M.currentdirid && (mode === 'standalone' || isVisible.dom(n));
    };
    isVisible.dom = M.megaRender
        ? (n) => n.seen && M.megaRender && M.megaRender.isDOMNodeVisible(n.h)
        : (n) => elementIsVisible(document.getElementById(n.h));

    const setSrcAttribute = (n, uri) => {
        if (isVisible(n)) {
            uri = uri || thumbnails.get(n.fa);

            if (uri) {
                let imgNode = document.getElementById(n.h);

                if (imgNode && (imgNode = imgNode.querySelector('img'))) {
                    n.seen = 2;
                    imgNode.setAttribute('src', uri);
                    imgNode.parentNode.parentNode.classList.add('thumb');
                }
            }
        }
    };

    // enqueue thumbnail retrieval.
    const queue = (n) => {
        let type = ':0*';
        const fa = String(n.fa);

        if (onTheFly && fa.includes(':1*') && !transparent[fileext(n.name, true, true)] || !fa.includes(type)) {
            type = ':1*';

            if (onTheFly) {
                onTheFly[fa] = n;
            }
        }

        if (fa.includes(type)) {
            type = type[1] | 0;

            if (thumbnails.queued(n, type)) {

                if (!treq[type]) {
                    treq[type] = Object.create(null);
                }
                treq[type][fa] = n;

                if (++count > max) {
                    // break
                    return true;
                }
            }
            else if (n.seen !== 2) {
                setSrcAttribute(n);
            }
        }
    };


    if (d) {
        console.time('fm_thumbnails');
    }

    for (let i = 0; i < nodeList.length; i++) {
        const n = nodeList[i];

        if (n && n.fa && !missingkeys[n.h]) {
            if (isVisible(n) && queue(n)) {
                break;
            }

            if (mode === 'standalone' && typeof callback === 'function') {
                if (thumbnails.has(n.fa)) {
                    onIdle(callback.bind(null, n));
                }
                else if (thumbnails.pending[n.fa]) {
                    thumbnails.pending[n.fa].push(callback.bind(null, n));
                }
            }
        }
    }

    if (count > 0) {
        if (d) {
            console.log('Requesting %d thumbs (%d loaded)', count, thumbnails.loaded, treq);
        }
        thumbnails.loaded += count;

        // add, render, and deduplicate new thumbnail.
        const append = (fa, uri) => {
            if (d > 1) {
                console.info(`Rendering thumbnail ${fa}, ${uri}`);
            }
            thumbnails.add(fa, uri, (n) => setSrcAttribute(n, uri));
        };

        // re-queue thumbnail retrieval.
        const requeue = (handle, data, callback) => {
            treq[0][handle] = data;

            delay('fm:thumbnails.requeue', () => {
                api_getfileattr(treq[0], 0, callback).catch(dump);
                treq[0] = {};
            }, 1e3);
        };

        // validate we can render a node
        const validate = (fa, uint8) => {
            let valid = true;

            if (uint8 === 0xDEAD || uint8 && !uint8.byteLength || !thumbnails.each(fa, (n) => isVisible(n))) {
                valid = false;
                thumbnails.decouple(fa);
            }

            return valid;
        };

        // handle thumbnail retrieval.
        const onload = async(ctx, fa, uint8) => {
            if (!validate(fa, uint8)) {
                return;
            }

            if (onTheFly[fa]) {
                const blob = await webgl.getDynamicThumbnail(uint8, {ats: 1}).catch(nop);

                if (blob) {
                    append(fa, URL.createObjectURL(blob));

                    if (thumbnails.db) {
                        thumbnails.db.add(fa, blob);
                    }
                }
                else {
                    if (d) {
                        console.debug(`Failed to generate on-the-fly thumbnail for ${fa}`);
                    }
                    requeue(fa, onTheFly[fa], onload);
                }

                onTheFly[fa] = null;
            }
            else {
                append(fa, mObjectURL([uint8.buffer || uint8], 'image/jpeg'));
            }
        };

        queueMicrotask(async() => {

            if (treq[1]) {
                let proceed = true;

                if (onTheFly) {
                    await thumbnails.query(
                        Object.keys(treq[1]).filter(h => !!onTheFly[h]),
                        (h) => {
                            delete treq[1][h];
                            delete onTheFly[h];
                            return validate(h);
                        },
                        (h, buf) => onload(0, h, buf)
                    ).catch(dump);

                    proceed = $.len(treq[1]) > 0;
                }

                if (proceed) {
                    api_getfileattr(treq[1], 1, onload);
                }
            }

            if (treq[0]) {
                api_getfileattr(treq[0], 0, onload);
            }
            treq[0] = {};
        });
    }

    if (d) {
        console.timeEnd('fm_thumbnails');
    }
}


mBroadcaster.once('boot_done', function() {
    "use strict";

    var uad = ua.details || false;
    var browser = String(uad.browser || '');

    if (!browser || browser === "Safari" || /edge|explorer/i.test(browser)) {
        if (d) {
            console.info('Disabling paste proxy on this browser...', browser, [uad]);
        }
        return;
    }

    // Didn't found a better place for this, so I'm leaving it here...
    // This is basically a proxy of on paste, that would trigger a new event, which would receive the actual
    // File object, name, etc.
    $(document).on('paste', function(event) {
        const {clipboardData, originalEvent = false} = event;
        let {items} = clipboardData || originalEvent.clipboardData || {};

        if (!items && originalEvent.clipboardData) {
            // safari
            items = originalEvent.clipboardData.files;
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
                if (items[i].type.indexOf("text/rtf") === 0) {
                    // halt execution, this is a Rich text formatted clipboard data, which may also contain an image,
                    // so we need to halt here, otherwise it may be threated as image, instead of text
                    return;
                }
                else if (items[i].type.indexOf("image") === 0) {
                    if (items[i] instanceof File) {
                        // Safari, using .files
                        blob = items[i];
                    }
                    else {
                        blob = items[i].getAsFile();
                    }
                }
                else if (items[i].kind === "string") {
                    items[i].getAsString(function(str) {
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

mega.commercials = Object.create(null);
mega.commercials.init = nop;
mega.commercials.createMobileBottomBarSlots = nop;
mega.commercials.updateOverlays = nop;
mega.commercials.mobileFmTabHander = nop;
mega.commercials.updateCommCookies = nop;
mega.commercials.getComms = nop;

mega.commercials.addCommsToBottomBar = (node) => {
    'use strict';
    return node;
};
