var newnodes = [];
var currsn;     // current *network* sn (not to be confused with the IndexedDB/memory state)
var fminitialized = false;
var requesti = makeid(10);
var folderlink = false;
var fetcher = null;
var workerstate;

var fmconfig = Object.create(null);

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

if (typeof loadingDialog === 'undefined') {
    var loadingDialog = Object.create(null);

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
            this.show();
        }
    };
    loadingDialog.phide = function() {
        'use strict';

        if (--this.nest < 1) {
            this.hide();
            this.nest = 0;
        }
        return !this.nest;
    };
    loadingDialog.quiet = false;
}
if (typeof loadingInitDialog === 'undefined') {
    var loadingInitDialog = Object.create(null);
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
            if (typeof psa !== 'undefined') {
                psa.repositionAccountLoadingBar();
            }
        }
        if (progress) {
            $('.loader-percents').width(progress + '%');

            if (progress > 99) {
                onIdle(function() {
                    loadingInitDialog.step3();
                });
            }
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
        if ($.loadingSubject && Object.keys($.loadingSubject).length === 0) {
            $('.loading-spinner:not(.manual-management)').addClass('hidden').removeClass('init active');
        }
        $('.loading-info li').removeClass('loading loaded');
        $('.loader-progressbar').removeClass('active');
        $('.loader-percents').width('0%').removeAttr('style');
    };
}

// execute actionpacket
// actionpackets are received and executed strictly in order. receiving and
// execution run concurrently (a connection drop while the execution is
// ongoing invalidates the IndexedDB state and forces a reload!)
var scq = Object.create(null);           // hash of [actionpacket, [nodes]]
var scqtail = 0;                         // next scq index to process
var scqhead = 0;                         // next scq index to write
var shareworker = Object.create(null);   // which worker knows about which sharekeys?
var scloadtnodes = false;                // if `t` packet requires nodes in memory
var scinflight = false;                  // don't run more than one execsc() "thread"
var sccount = 0;                         // number of actionpackets processed at connection loss
var scfetches = Object.create(null);     // holds pending nodes to be retrieved from fmdb
var scfsubtree = Object.create(null);    // fetch entire subtree as needed by some action-packets
var scwaitnodes = Object.create(null);   // supplements scfetches per scqi index
var nodesinflight = Object.create(null); // number of nodes being processed in the worker for scqi
var sc_history = [];                     // array holding the history of action-packets
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
function sc_fetcher() {
    "use strict";

    if ($.scFetcherRunning) {
        if (d > 1) {
            console.debug('sc_fetcher already running...');
        }
        return;
    }

    var queue   = scfetches;
    var handles = Object.keys(queue);
    var fsubtree = scfsubtree;
    scfetches = Object.create(null);
    scfsubtree = Object.create(null);

    if (!handles.length) {
        return onIdle(resumesc);
    }
    $.scFetcherRunning = true;

    if (d > 1) {
        console.warn('Retrieving from DB nodes required to parse action-packets...', handles.length, handles);
    }
    // NB: This shitty logic is in need of urgent review...
    // debugger

    (function _proc() {
        var bunch = handles.splice(0, 8192);

        if (!bunch.length) {
            onIdle(sc_fetcher);
            $.scFetcherRunning = false;
        }
        else {
            // finish bunch processing
            var finish = function() {
                for (var i = bunch.length; i--;) {
                    var h = bunch[i];
                    for (var p = queue[h].length; p--;) {
                        var scqi = queue[h][p];
                        if (!--scwaitnodes[scqi]) {
                            delete scwaitnodes[scqi];
                        }
                    }
                }

                onIdle(function _scfr() {
                    resumesc();
                    onIdle(_proc);
                });
            };

            dbfetch.geta(bunch, new MegaPromise())
                .always(function() {
                    // Retrieve all needed subtrees and file versions if any, and then finish the batch processing
                    var subtree = Object.create(null);

                    for (var i = bunch.length; i--;) {
                        var h = bunch[i];

                        if (M.d[h]) {
                            if (M.d[h].t) {
                                if (fsubtree[h]) {
                                    // entire subtree
                                    subtree[h] = 1;
                                }
                            }
                            else if (M.d[h].tvf) {
                                // file versions
                                subtree[h] = 1;
                            }
                        }
                    }
                    subtree = Object.keys(subtree);

                    if (subtree.length) {
                        dbfetch.tree(subtree, -1, new MegaPromise()).always(finish);
                    }
                    else {
                        finish();
                    }
                });
        }
    })();
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
            sc_fetcher();
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

    // set scq slot number
    a.scqi = scqhead;

    if (d > 1) {
        console.debug('sc_packet', loadfm.fromapi, scloadtnodes, a.a, a);
    }

    // record history
    if (sc_history) {
        sc_history.push(a.a);
    }

    // check if this packet needs nodes to be present,
    // unless `fromapi` where nodes are placed in memory already as received.
    if (!loadfm.fromapi) {
        var inflight = $.len(scfetches);

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
            /* fall-through */
            case 'ph':
                sc_fqueue(a.h, a); // s, s2, ph
                break;
            case 't':
                // If no workers, all scnodes should be ready
                // OR the scnodes are ready but not the ap set yet
                if (!workers || (scq[scqhead] && !scq[scqhead][0])) {
                    sc_fqueuet(scqhead, a);
                }
                break;
        }

        if ($.len(scfetches) !== inflight) {
            sc_fetcher();
        }
    }

    if ((a.a === 's' || a.a === 's2') && a.k) {
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
            if (++p === 9 || n.k[p-10] === '/') {
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

    if (nodesinflight[scqhead]) {
        nodesinflight[scqhead]++;
    }
    else {
        nodesinflight[scqhead] = 2;
        nodes_scqi_order = 0; // reset the order var
    }

    n.scni = scqhead;       // set scq slot number (sc_packet() call will follow)
    n.arrivalOrder = nodes_scqi_order++; // storing arrival order
    workers[p].postMessage(n);
}

// inter-actionpacket state, gets reset in getsc()
var scsharesuiupd;
var scpubliclinksuiupd;
var scContactsSharesUIUpdate;
var loadavatars = [];
var scinshare = Object.create(null);

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
            $('#contact_' + a.ou).remove();

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

            M.handleEmptyContactGrid();
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
        var tsharekey = '';
        var prockey = false;

        if (a.o === u_handle) {
            // if access right are undefined, then share is deleted
            if (typeof a.r === 'undefined') {
                M.delNodeShare(a.n, a.u, a.okd);
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
                var handle = a.n;
                var shares = Object(M.d[handle]).shares || {};

                if (a.u in shares || a.ha === crypto_handleauth(a.n)) {

                    // I updated or created my share
                    var k = decrypt_key(u_k_aes, base64_to_a32(a.ok));

                    if (k) {
                        crypto_setsharekey(handle, k);

                        if (!a.u) {
                            // this must be a pending share
                            if (a.a === 's2') {
                                // store ownerkey
                                if (fmdb) {
                                    fmdb.add('ok', {h: handle, d: {k: a.ok, ha: a.ha}});
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
            if (a.n && typeof a.k !== 'undefined' && !u_sharekeys[a.n]) {
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

            if (a.u === 'EXP') {
                var exportLink = new mega.Share.ExportLink({'nodesToProcess': [a.h]});
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
                                console.log('Incoming share ' + a.n + " revoked.", n.su, M.d[n.p]);
                            }

                            if (M.d[n.p]) {
                                // inner share: leave nodes intact, just remove .r/.su
                                delete n.r;
                                delete n.su;
                                delete n.sk;
                                delete M.c.shares[a.n];
                                delete u_sharekeys[a.n];

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
            onIdle(sharedUInode.bind(null, a.n));
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

        if (a.okd) {
            M.delNodeShare(a.n, a.u, a.okd);
        }

        if (fminitialized) {
            // a full share contains .h param
            onIdle(sharedUInode.bind(null, a.h));
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
        if (fmdb) {
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

    var i;
    var ufsc = new UFSSizeCache();
    var rootNode = scnodes.length && scnodes[0] || false;

    // is this tree a new inshare with root scinshare.h? set share-relevant
    // attributes in its root node.
    if (scinshare.h) {
        for (i = scnodes.length; i--;) {
            if (scnodes[i].h === scinshare.h) {
                scnodes[i].su = scinshare.su;
                scnodes[i].r = scinshare.r;
                scnodes[i].sk = scinshare.sk;
                rootNode = scnodes[i];

                if (M.d[rootNode.h]) {
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
    if (M.d[rootNode.h]) {
        // skip repetitive notification of (share) nodes
        if (d) {
            console.debug('skipping repetitive notification of (share) nodes');
        }
        return;
    }

    // notification logic
    if (fminitialized && !pfid && a.ou && a.ou !== u_handle
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
            delete scnodes[i].i;
            delete scnodes[i].scni;
            delete scnodes[i].arrivalOrder;

            M.addNode(scnodes[i]);
            ufsc.feednode(scnodes[i]);

            var h = scnodes[i].h;

            if (!$.moveNodeShares || !$.moveNodeShares[h]) {
                continue;
            }

            for (var su in $.moveNodeShares[h]) {
                if ($.moveNodeShares[h][su]) {
                    M.nodeShare(h, $.moveNodeShares[h][su], true);
                    if (su === 'EXP') {
                        scpubliclinksuiupd = true;
                    }
                    else {
                        scsharesuiupd = true;
                    }
                }
            }

            delete $.moveNodeShares[h];
        }
    }

    ufsc.save(rootNode);

    if (d) {
        // f2 if set must be empty since the nodes must have been processed through workers.
        console.assert(!a.t || !a.t.f2 || !a.t.f2.length, 'Check this...');
    }

    if (fminitialized && !is_mobile) {
        // update versioning info.
        i = scnodes.length > 1 && scnodes[1].h || rootNode.h;
        if (i) {
            // TODO: ensure this is backward compatible...
            fileversioning.updateFileVersioningDialog(i);
        }
    }
});

scparser.$add('opc', {
    b: function(a) {
        // outgoing pending contact
        processOPC([a]);

        if (fminitialized) {
            M.syncPendingContacts(a);
            M.drawSentContactRequests([a]);
        }
    }
});

scparser.$add('ipc', {
    b: function(a) {
        // incoming pending contact
        processIPC([a]);

        if (fminitialized) {
            M.syncPendingContacts(a);
            M.drawReceivedContactRequests([a]);
        }

        notify.notifyFromActionPacket(a);
    }
});

scparser.$add('ph', {
    r: function(a) {
        // exported link
        processPH([a]);

        // not applicable - don't return anything, or it will show a blank notification
        if (typeof a.up !== 'undefined' && typeof a.down !== 'undefined') {
            notify.notifyFromActionPacket(a);
        }
        scpubliclinksuiupd = true;
    },
    l: function(a) {
        // exported link
        processPH([a]);

        scpubliclinksuiupd = true;
    }
});

scparser.$add('upci', {
    b: function(a) {
        // update to incoming pending contact request
        processUPCI([a]);
    }
});

scparser.$add('upco', {
    b: function(a) {
        // update to outgoing pending contact request
        processUPCO([a]);

        // if the status is accepted ('2'), then this will be followed
        // by a contact packet and we do not need to notify
        if (a.s != 2) {
            notify.notifyFromActionPacket(a);
        }
    }
});

scparser.$add('puh', {
    b: function(a) {
        "use strict";
        mega.megadrop.pufProcessPUH([a]);
    }
});

scparser.$add('pup', {
    b: function(a) {
        "use strict";
        mega.megadrop.pupProcessPUP([a]);
    }
});

scparser.$add('se', {
    b: function(a) {
        processEmailChangeActionPacket(a);
    }
});

scparser.$add('ua', {
    r: function(a) {
        'use strict';

        if (Array.isArray(a.ua)) {
            var attrs = a.ua;
            var actionPacketUserId = a.u;

            for (var j = 0; j < attrs.length; j++) {
                var attributeName = attrs[j];
                mega.attr.uaPacketParser(attributeName, actionPacketUserId, false, a.v && a.v[j]);
            }

            // in case of business master
            // first, am i a master?
            if (u_attr && u_attr.b && u_attr.b.m) {
                // then, do i have this user as sub-user?
                if ((M.suba && M.suba[actionPacketUserId]) || u_attr.b.bu === actionPacketUserId) {
                    M.require('businessAcc_js', 'businessAccUI_js').done(
                        function () {
                            var business = new BusinessAccount();
                            business.updateSubUserInfo(actionPacketUserId, attrs);
                        }
                    );
                }
            }
        }
    },
    l: function(a) {
        'use strict';

        if (Array.isArray(a.ua)) {
            var attrs = a.ua;
            var actionPacketUserId = a.u;

            for (var j = 0; j < attrs.length; j++) {
                var version = a.v && a.v[j];
                var attributeName = attrs[j];

                // fill version if missing
                if (version && !mega.attr._versions[actionPacketUserId + "_" + attributeName]) {
                    mega.attr._versions[actionPacketUserId + "_" + attributeName] = version;
                }

                // handle avatar related action packets (e.g. avatar modified)
                if (attributeName === '+a') {
                    loadavatars.push(actionPacketUserId);
                }
                else if (attributeName === 'firstname' || attributeName === 'lastname') {
                    // handle firstname/lastname attributes
                    mega.attr.uaPacketParser(attributeName, actionPacketUserId, true, version);
                }
            }
            // in case of business master
            // first, am i a master?
            if (u_attr && u_attr.b && u_attr.b.m) {
                // then, do i have this user as sub-user?
                if ((M.suba && M.suba[actionPacketUserId]) || u_attr.b.bu === actionPacketUserId) {
                    M.require('businessAcc_js', 'businessAccUI_js').done(
                        function () {
                            var business = new BusinessAccount();
                            business.updateSubUserInfo(actionPacketUserId, attrs);
                        }
                    );
                }
            }
        }
    }
});

scparser.$add('sd', {
    b: function() {
        "use strict";

        if (fminitialized && page === 'fm/account/security') {
            // need to wait until session history is refreshed.
            setTimeout(function() {
                accountUI.security.session.update(true);
            }, 3000);
        }
    }
});

scparser.$add('e', function(a) {
    // CMS update
    var str = hex2bin(a.c || "");
    if (str.substr(0, 5) === ".cms.") {
        var cmsType = str.split(".")[2];
        var cmsId = str.substr(6 + cmsType.length).split(".");
        CMS.reRender(cmsType, cmsId);
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
    // FIXME: obsolete - remove & replace
    /*else
     if (!folderlink) api_req({
     a: 'k',
     cr: crypto_makecr(actionPacket.n, [actionPacket.h], true)
     });*/

    scsharesuiupd = true;
});

scparser.$add('u', function(a) {
    // update node attributes
    var n = M.d[a.n];
    if (n) {
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
                console.warn("Ignored bad attribute update for node " + a.n);
            }
            crypto_restoreattr(n, oldattr);
            delete n.a;
        }
        else {
            // success - check what changed and redraw
            if (M.scAckQueue[a.i]) {
                if (fminitialized && mega.megadrop.pufs[n.h] && n.name !== mega.megadrop.pufs[n.h].fn) {
                    mega.megadrop.pupUpdate(n.h, 'msg', n.name);
                }

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
                        M.labelDomUpdate(n.h, n.lbl);
                    }
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
        $.moveNodeShares = !$.moveNodeShares ? {} : $.moveNodeShares;
        (function _checkMoveNodeShare(h) {
            // XXX: are or should we ensure all needed nodes are loaded into memory (?)
            var n = M.d[h] || false;

            if (n.shares) {
                $.moveNodeShares[h] = n.shares;
            }
            if (n.t) {
                for (var childHandle in M.c[h]) {
                    if (M.c[h][childHandle]) {
                        _checkMoveNodeShare(childHandle);
                    }
                }
            }
        })(a.n);
    }

    // node deletion
    M.delNode(a.n);

    // was selected, now clear the selected array.
    if ($.selected && ($.selected[0] === a.n)) {
        $.selected = [];
    }
    if (!pfid) {
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
});

scparser.$add('la', function() {

    'use strict';

    // last seen/acknowledged notification sn
    notify.markAllNotificationsAsSeen(true);

});

scparser.$add('usc', function() {
    // user state cleared - mark local DB as invalid
    fm_forcerefresh();
});

// Payment received
scparser.$add('psts', function(a) {
    if (!pfid && u_type) {
        M.checkStorageQuota(2000);
    }
    pro.processPaymentReceived(a);

    if (ulmanager.ulOverStorageQuota) {
        eventlog(99701);
        onIdle(function() {
            ulmanager.ulResumeOverStorageQuotaState();
        });
    }

    onIdle(function() {
        dlmanager._onOverQuotaAttemptRetry();
    });

    onIdle(function() {
        watchdog.notify('psts', (a.r === 's' && a.p) | 0);
    });

    // If user is on FM, update account status with this packet.
    if (fminitialized) {
        onIdle(function() {
            if (page.indexOf('fm/account') === 0) {
                accountUI();
            }
            else {
                M.accountData();
            }
        });
    }
});

// Payment reminder
scparser.$add('pses', function(a) {
    'use strict';
    notify.notifyFromActionPacket(a);
});

scparser.mcpc = scparser.mcc = function (a) {
    // MEGAchat
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
    }

    if (fmdb) {
        delete a.a;
        fmdb.add('mcf', {id: a.id, d: a});
    }
};

// MEGAchat archive/unarchive
scparser.mcfc = scparser.mcfpc = function(a) {
    'use strict';

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
        console.log("New SN: " + a.sn);
    }
    setsn(a.sn);

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
    loadfm_done();
});

// sub-user status change in business account
scparser.$add('ssc', process_businessAccountSubUsers_SC);

// business account change which requires reload (such as payment against expired account)
scparser.$add('ub', function() {
    "use strict";
    fm_fullreload(null, 'ub-business');
});

scparser.$notify = function(a) {
    // only show a notification if we did not trigger the action ourselves
    if (!pfid && u_attr && a.ou !== u_attr.u) {
        notify.notifyFromActionPacket(a);
    }
};

scparser.$call = function(a, scnodes) {

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
            console.debug('Ignoring unsupported SC command ' + a.a, a);
        }
    }
    catch (ex) {
        console.error('scparser', ex);

        onIdle(function() {
            throw ex;
        });
    }
};


scparser.$finalize = function() {
    // scq ran empty - nothing to do for now
    if (d) {
        console.log(sccount + " SC command(s) processed.");
    }

    // perform post-execution UI work
    if (fminitialized) {
        var promise = MegaPromise.resolve();

        if (newnodes.length) {
            promise = M.updFileManagerUI();
        }

        promise.always(function() {

            if (loadavatars.length) {
                M.avatars(loadavatars);
                loadavatars = [];
            }

            delay('thumbnails', fm_thumbnails, 3200);

            if ($.dialog === 'properties') {
                delay($.dialog, propertiesDialog.bind(this, 3));
            }

            if (scsharesuiupd) {
                onIdle(function() {
                    M.buildtree({h: 'shares'}, M.buildtree.FORCE_REBUILD);
                    M.buildtree({h: 'out-shares'}, M.buildtree.FORCE_REBUILD);

                    if (M.currentrootid === 'shares' || M.currentrootid === 'out-shares') {
                        M.openFolder(M.currentdirid, true);
                    }
                });

                scsharesuiupd = false;
            }

            if (scpubliclinksuiupd) {
                onIdle(function() {
                    M.buildtree({h: 'public-links'}, M.buildtree.FORCE_REBUILD);

                    if (M.currentrootid === 'public-links') {
                        M.openFolder(M.currentdirid, true);
                    }
                });

                scpubliclinksuiupd = false;
            }

            if (scContactsSharesUIUpdate === M.currentdirid) {
                onIdle(function() {
                    M.openFolder(M.currentdirid, true);
                });

                scContactsSharesUIUpdate = false;
            }

            sccount = 0;
            scinflight = false;
        });
    }
    else {
        sccount = 0;
        scinflight = false;
    }
};

// if no execsc() thread is running, check if one should be, and start it if so.
function resumesc() {
    "use strict";

    if (!scinflight) {
        if (scq[scqtail] && scq[scqtail][0] && !scwaitnodes[scqtail] && !nodesinflight[scqtail]) {
            scinflight = true;
            execsc();
        }
    }
}

// execute actionpackets from scq[scqtail] onwards
function execsc() {
    "use strict";

    var tick = Date.now();
    var tickcount = 0;

    do {
        if (!scq[scqtail] || !scq[scqtail][0] || scwaitnodes[scqtail]
            || (scq[scqtail][0].a === 't' && nodesinflight[scqtail])) {

            return scparser.$finalize();
        }

        sccount++;

        var a = scq[scqtail][0];
        var scnodes = scq[scqtail][1];
        delete scq[scqtail++];
        delete a.scqi;

        var idtag = a.i;
        if (a.i !== requesti && M.scAckQueue[a.i] === requesti) {
            // An API request triggered locally wanting to get notified when the associated packet is processed.
            delete M.scAckQueue[a.i];
            a.i = requesti;
        }

        if (d) {
            console.info('Received SC command "' + a.a + '"' + (a.i === requesti ? ' (triggered locally)' : ''), a);
        }

        // process action-packet
        scparser.$call(a, scnodes);

        // If there is any listener waiting for acknowledge from API, dispatch it.
        var cid = M.scAckQueue[a.i] ? a.i : a.a + '.' + a.i;

        if (typeof M.scAckQueue[cid] === 'function') {
            if (d) {
                console.debug('execsc: dispatching ' + a.i);
            }
            onIdle(M.scAckQueue[cid].bind(null, a, scnodes));
            delete M.scAckQueue[cid];
        }

        if (a.a === 's' || a.a === 's2') {
            mBroadcaster.sendMessage('share-packet.' + idtag, a);
        }

        tickcount++;
    } while (Date.now()-tick < 200);

    if (d) console.log("Processed " + tickcount + " SC commands in the past 200 ms");
    onIdle(execsc);
}

// a node was updated significantly: write to DB and redraw
function fm_updated(n) {
    "use strict";

    M.nodeUpdated(n);

    if (fminitialized) {
        removeUInode(n.h);
        newnodes.push(n);
        if (M.megaRender) delete M.megaRender.nodeMap[n.h];
        M.updFileManagerUI();
        // FIXME: ...?
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
    parentworker = Object.create(null);

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
    "use strict";

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
    "use strict";

    killworkerpool();

    workers = [];

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
            w.onerror = function(err) {
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
function fm_forcerefresh(light) {
    "use strict";

    if (light !== true) {
        localStorage.force = 1;
    }

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
    "use strict";

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
    "use strict";

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
    if (logMsg === 'ETOOMANY' && mega.loadReport.mode < 2 && !sessionStorage.lightTreeReload) {
        sessionStorage.lightTreeReload = 1;
    }
    else {
        localStorage.force = 1;
        delete sessionStorage.lightTreeReload;
    }

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
var parentworker = Object.create(null);

// get next worker index (round robin)
function treefetcher_getnextworker() {
    "use strict";

    if (nextworker >= workers.length) {
        nextworker = 0;
    }
    return nextworker++;
}

// this receives the ok elements one by one as per the filter rule
// to facilitate the decryption of outbound shares, the API now sends ok before f
function tree_ok0(ok) {
    "use strict";

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
                M.h[node.hash] = Object.create(null);
            }
            M.h[node.hash][node.h] = 1;
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

    M.d[node.h] = new MegaNode(node);
}

// this receives the node objects one by one as per the filter rule
function tree_node(node) {
    "use strict";

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
}

// FIXME: move all of these globals to a future "ClientSession" global object encapsulating
// all state and functionality
var residualfm;
var dumpsremaining;

// this receives the remainder of the JSON after the filter was applied
function tree_residue(fm, ctx) {
    "use strict";

    // store the residual f response for perusal once all workers signal that they're done
    residualfm = fm[0] || false;

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
}

// process worker responses (decrypted nodes, processed actionpackets, state dumps...)
function worker_procmsg(ev) {
    "use strict";

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
            if (scq[ev.data.scni]) {
                scq[ev.data.scni][1][ev.data.arrivalOrder] = ev.data;
            }
            else {
                var initArray = [];
                initArray[ev.data.arrivalOrder] = ev.data;
                scq[ev.data.scni] = [null, initArray];
            }

            startNodesFetching(ev.data.scni);
        }
        else {
            // maintain special incoming shares index
            if (ev.data.su) {
                M.c.shares[ev.data.h] = { su : ev.data.su, r : ev.data.r, t: ev.data.h };

                if (u_sharekeys[ev.data.h]) {
                    M.c.shares[ev.data.h].sk = u_sharekeys[ev.data.h][0];
                }
            }

            if (ufsc.cache && ev.data.p) {
                ufsc.feednode(ev.data);
            }
            else if (fmdb) {
                fmdb.add('f', {
                    h : ev.data.h,
                    p : ev.data.p,
                    s : ev.data.s >= 0 ? ev.data.s : -ev.data.t,
                    t : ev.data.t ? 1262304e3 - ev.data.ts : ev.data.ts,
                    c : ev.data.hash || '',
                    d : ev.data
                });
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

            window.loadingInitDialog.step3();
            setTimeout(loadfm_callback, 300, residualfm);
            residualfm = false;
        }
    }
    else {
        console.error("Unidentified nodedec worker response:", ev.data);
    }
}

// the FM DB engine (cf. mDB.js)
var fmdb;
var ufsc;
var mclp;

function loadfm(force) {
    "use strict";

    if (anonymouschat) {
        return;
    }
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
            else if (!u_k_aes) {
                console.error('No master key found... please contact support@mega.nz');
            }
            else {
                fmdb = FMDB(u_handle, {
                    // channel 0: transactional by _sn update
                    f      : '&h, p, s, c, t', // nodes - handle, parent, size (negative size: type), checksum
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
                    ua     : '&k',             // user attributes - key (maintained by IndexedBKVStorage)
                    _sn    : '&i',             // sn - fixed index 1
                    puf    : '&ph',            // public upload folder - handle
                    pup    : '&p',             // public upload page - handle

                    // channel 1: non-transactional (maintained by IndexedDBKVStorage)
                }, {});

                fmdb.init(fetchfm, localStorage.force);
            }
        }
    }
}

function fetchfm(sn) {
    "use strict";

    // we always intially fetch historical actionpactions
    // before showing the filemanager
    initialscfetch = true;

    // Initialize ufs size cache
    ufsc = new UFSSizeCache();

    // Get the media codecs list ready
    mclp = MediaInfoLib.getMediaCodecsList();

    var promise;
    if (is_mobile) {
        promise = MegaPromise.resolve();
    }
    else {
        // activate/prefetch attribute cache at this early stage
        promise = attribCache.load();
    }

    promise.always(function() {

        if (sn) {
            currsn = sn;

            if (is_selenium) {
                // It runs too fast in some accounts...
                delay(dbfetchfm, 1300);
            }
            else {
                dbfetchfm();
            }
        }
        else {
            // no cache requested or available - get from API
            fetcher = new TreeFetcher();
            fetcher.fetch();

            mega.loadReport.mode = 2;

            if (!folderlink) {
                // dbToNet holds the time wasted trying to read local DB, and having found we have to query the server.
                mega.loadReport.dbToNet       = Date.now() - mega.loadReport.startTime;
                mega.loadReport.stepTimeStamp = Date.now();
            }
        }
    });
}

function dbfetchfm() {
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
            processPS(r, true);
            r = r.map(function(n) {
                return n.h;
            });
            return dbfetch.geta(r);
        },
        puf: function _(r) {
            mega.megadrop.pufProcessDb(r);
            r = r.map(function(n) {
                return n.h;
            });
            return dbfetch.geta(r);
        },
        suba: process_suba,
        pup: mega.megadrop.pupProcessDb,
        mcf: 1
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
            else {
                return tables[t](r, true);
            }
        };
    };
    var checkSettled = function(r) {
        for (var i = r.length; i--;) {
            if (r[i].status !== 'fulfilled') {
                throw new Error(r[i].reason);
            }
        }
    };

    loadingInitDialog.step2();

    if (d) {
        console.time('dbfetchfm');
    }

    Promise.allSettled([fmdb.get('ok'), dbfetch.init()])
        .then(function(r) {
            checkSettled(r);
            process_ok(r[0].value, true);

            mega.loadReport.recvNodes     = Date.now() - mega.loadReport.stepTimeStamp;
            mega.loadReport.stepTimeStamp = Date.now();

            return Promise.allSettled([fmdb.get('mk'), fmdb.get('u'), fmdb.get('s')]);
        })
        .then(function(r) {
            var promises = [];

            checkSettled(r);
            crypto_missingkeysfromdb(r[0].value);
            mega.loadReport.pn1 = Date.now() - mega.loadReport.stepTimeStamp;

            process_u(r[1].value, true);
            mega.loadReport.pn2 = Date.now() - mega.loadReport.stepTimeStamp;
            // @todo deprecate those pn1-pn5 ...
            mega.loadReport.pn3 = Date.now() - mega.loadReport.stepTimeStamp;

            r = r[2].value;
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
            mega.loadReport.pn4 = Date.now() - mega.loadReport.stepTimeStamp;

            if (promises.length) {
                // handle all outbound shares through a single promise.
                // if an ENOENT happens, this won't halt the process...
                promises = [MegaPromise.allDone(promises)];
            }

            for (var j = 0, it = Object.keys(tables); j < it.length; ++j) {
                var t = it[j];
                promises.push(fmdb.get(t).then(tableProc(t)).catch(dump));
            }
            mega.loadReport.pn5 = Date.now() - mega.loadReport.stepTimeStamp;

            return Promise.allSettled(promises);
        })
        .then(function(r) {
            checkSettled(r);

            if (d) {
                console.info('All settled, %d operations completed to load from DB.', r.length);
                console.timeEnd('dbfetchfm');
            }

            mega.loadReport.mode = 1;
            mega.loadReport.procNodeCount = Object.keys(M.d || {}).length;
            mega.loadReport.procNodes = Date.now() - mega.loadReport.stepTimeStamp;
            mega.loadReport.stepTimeStamp = Date.now();

            if (!mBroadcaster.crossTab.master && window.fmdb) {
                // on a secondary tab, prevent writing to DB once we have read its contents
                fmdb.crashed = 666;
            }
            console.assert(window.fmdb, 'check what is going on here...');

            if (ufsc) {
                if (d && $.len(ufsc.cache || {})) {
                    console.warn('found non-flushed ufs-cache entries...', [ufsc.cache], ufsc);
                }
                delete ufsc.cache;
            }

            // fetch & process new actionpackets
            window.loadingInitDialog.step3();
            getsc(true);
        })
        .catch(function(ex) {
            console.error(ex);
            siteLoadError(ex, 'dbfetchfm');
        });
}

// returns tree type h is in
// FIXME: make result numeric
function treetype(h) {
    "use strict";

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

// determine whether a node is shared
function shared(h) {
    "use strict";
    var promise = new MegaPromise();

    dbfetch.get(h).always(function() {
        var rc = false;

        while (h && M.d[h]) {
            if (M.d[h].shares) {
                rc = h;
                break;
            }

            h = M.d[h].p;
        }

        promise.resolve(rc);
    });

    return promise;
}

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
 * @param {Boolean} dontShowShareDialog
 *     If set to `true`, don't show the share dialogue.
 * @returns {doShare.$promise|MegaPromise}
 */
function doShare(nodeId, targets, dontShowShareDialog) {
    'use strict';

    if (!nodeId || !targets || !targets.length) {
        console.error('Invalid parameters for doShare()', nodeId, targets);
        return MegaPromise.reject(EARGS);
    }

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
                            user = M.getUserByEmail(user).u;
                        }

                        // A pending share may not have a corresponding user and should not be added
                        // A pending share can also be identified by a user who is only a '0' contact
                        // level (passive)
                        if (M.u[user] && M.u[user].c) {
                            M.nodeShare(nodeId, {
                                h: nodeId,
                                r: rights,
                                u: user,
                                ts: unixtime()
                            });
                            setLastInteractionWith(user, "0:" + unixtime());
                        }
                        else {
                            var isPendingContact = false;

                            if (users[k].m) {
                                for (var pid in M.opc) {
                                    if (M.opc[pid].m === users[k].m) {
                                        isPendingContact = true;
                                        break;
                                    }
                                }
                            }

                            if (!isPendingContact) {
                                logger.warn('Invalid user (%s[%s]): c=%s',
                                    user,
                                    users[k].u,
                                    M.u[user] ? String(M.u[user].c) : 'unknown!',
                                    M.u[user], users[k]);
                            }
                            else {
                                logger.debug('Finished share action with pending contact.', JSON.stringify(users[k]));
                            }
                        }
                    }
                }
            }
            if (dontShowShareDialog !== true) {
                $('.fm-dialog.share-dialog').removeClass('hidden');
            }
            loadingDialog.hide();
            M.renderShare(nodeId);

            masterPromise.resolve();
        }
        else {
            $('.fm-dialog.share-dialog').removeClass('hidden');
            loadingDialog.hide();
            masterPromise.reject(result);
        }
    };

    // Get complete children directory structure for root node with id === nodeId
    var childNodesId;

    M.getNodes(nodeId, true)
        .wait(function(r) {
            childNodesId = r;
            targets.forEach(targetsForeach);
        });

    // Create new lists of users, active (with user handle) and non existing (pending)
    var targetsForeach = function(value) {

        var email = value.u;
        var accessRights = value.r;

        // Search by email only don't use handle cause user can re-register account
        crypt.getPubKeyAttribute(email, 'RSA', {
            targetEmail: email,
            shareAccessRightsLevel: accessRights
        })
            .always(function (pubKey, result) {
                var sharePromise;

                // parse [api-result, user-data-ctx]
                var ctx = result[1];
                result = result[0];

                if (result.pubk) {
                    var userHandle = result.u;

                    // 'u' is returned user handle, 'r' is access right
                    var usersWithHandle = [];

                    // M.u[].c might be 0 for invisible/removed, or undefined for pending contact
                    if (M.u[userHandle] && M.u[userHandle].c) {
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
    };

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
    var tsharepath = M.getShareNodesSync(apireq.t);
    var nsharepath = M.getShareNodesSync(apireq.n, root);
    var movingnodes = false;

    // is the node to be moved in an outshare (or possibly multiple nested ones)?
    if (nsharepath.length && root.handle) {
        // yes, it is - are we moving to an outshare?
        if (!tsharepath.length) {
            // we are not - check for any foreign nodes being moved
            movingnodes = M.getNodesSync(apireq.n, true);

            var foreignnodes = [];

            for (var i = movingnodes.length; i--; ) {
                if (M.d[movingnodes[i]].u !== u_handle) {
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
            movingnodes = M.getNodesSync(apireq.n, true);
        }

        apireq.cr = crypto_makecr(movingnodes, tsharepath, true);
    }
}

function process_f(f, cb, updateVersioning) {
    "use strict";

    if (f) {
        for (var i = 0; i < f.length; i++) {
            var n = f[i];
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

    // TODO: This function is no longer asynchronous, remove the callback dependency (?)
    if (typeof cb === 'function') {
        cb();
    }
}

/**
 * Handle incoming pending contacts
 *
 * @param {array.<JSON_objects>} pending contacts
 *
 */
function processIPC(ipc, ignoreDB) {

    if (d) console.debug('processIPC');

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
                    updateIpcRequests();
                    $('.contact-requests-grid').addClass('hidden');
                    $('.fm-empty-contacts .fm-empty-cloud-txt').text(l[6196]);
                    $('.fm-empty-contacts').removeClass('hidden');
                    $('.button.link-button.accept-all').addClass('hidden');
                }
                else if (Object.keys(M.ipc).length) {
                    updateIpcRequests();
                }

                // Update token.input plugin
                removeFromMultiInputDDL('.share-multiple-input', {id: ipc[i].m, name: ipc[i].m});
            }
            else {
                // Don't prevent contact creation when there's already IPC available
                // When user add contact who already sent IPC, server will automatically create full contact
                var contactName = M.getNameByHandle(ipc[i].p);

                // Update token.input plugin
                addToMultiInputDropDownList('.share-multiple-input', [{id: ipc[i].m, name: contactName}]);
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

    if (d) console.debug('processOPC');

    for (var i in opc) {
        M.addOPC(opc[i], ignoreDB);
        if (opc[i].dts) {
            M.delOPC(opc[i].p);
            $('#opc_' + opc[i].p).remove();

            // Update tokenInput plugin
            removeFromMultiInputDDL('.share-multiple-input', {id: opc[i].m, name: opc[i].m});
            removeFromMultiInputDDL('.add-contact-multiple-input', {id: opc[i].m, name: opc[i].m});
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
            addToMultiInputDropDownList('.share-multiple-input', [{id: opc[i].m, name: contactName}]);
            addToMultiInputDropDownList('.add-contact-multiple-input', [{id: opc[i].m, name: contactName}]);
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

        // Update the public link icon for mobile
        if (is_mobile) {
            mobile.cloud.updateLinkStatus(nodeId);
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
    if (d) console.debug('processPS');
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
 * Handle upca response, upci, pending contact request updated (for whom it's incomming)
 *
 * @param {array.<JSON_objects>} ap (actionpackets)
 *
 */
function processUPCI(ap) {
    if (d) console.debug('processUPCI');
    for (var i in ap) {
        if (ap[i].s) {
            delete M.ipc[ap[i].p];
            M.delIPC(ap[i].p);// Remove from localStorage
            $('#ipc_' + ap[i].p).remove();
            if ((Object.keys(M.ipc).length === 0) && (M.currentdirid === 'ipc')) {
                updateIpcRequests();
                $('.contact-requests-grid').addClass('hidden');
                $('.fm-empty-contacts .fm-empty-cloud-txt').text(l[6196]);
                $('.button.link-button.accept-all').addClass('hidden');
                $('.fm-empty-contacts').removeClass('hidden');
                $('.contacts-tab-lnk.ipc').removeClass('filled').find('span').text('');
            }
            else if (M.currentdirid === 'ipc') {
                $('.contacts-tab-lnk.ipc').addClass('filled').find('span').text(Object.keys(M.ipc).length);
                $('.button.link-button.accept-all').removeClass('hidden');
            }
            else if (M.currentdirid === 'ipc') {
                updateIpcRequests();
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

    if (d) console.debug('processUPCO');

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
                    M.delPS(psid, k);
                }

                // Update tokenInput plugin
                removeFromMultiInputDDL('.share-multiple-input', {id: ap[i].m, name: ap[i].m});
                removeFromMultiInputDDL('.add-contact-multiple-input', {id: ap[i].m, name: ap[i].m});
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
    M.require('businessAcc_js', 'businessAccUI_js').done(function () {

        // the response is an array of users's handles (Masters). this means at least it will contain
        // the current user handle.
        // later-on we need to iterate on all of them. For now we dont know how to treat sub-masters yet
        // --> we will target only current users's subs
        var bAccount = new BusinessAccount();
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

function folderreqerr(c, e) {
    'use strict';

    var title = l[1043];
    var message = null;

    loadingDialog.hide();
    loadingInitDialog.hide();

    loadfm.loaded = false;
    loadfm.loading = false;

    if (typeof e === 'object' && e.err < 0) {
        if (e.u === 7) {
            message = l[23242];

            if (e.l !== 2) {
                message = l[23243];
            }
        }
        else {
            e = e.err;
        }
    }

    // If desktop site show "Folder link unavailable" dialog
    if (!is_mobile) {
        if (parseInt(e) === EARGS) {
            title = l[20198];
            message = l[20199];
        }
        else if (!message) {
            message = l[1044] + '<ul><li>' + l[1045] + '</li><li>' + l[247] + '</li><li>' + l[1046] + '</li>';
        }

        parsepage(pages['placeholder']);
        msgDialog('warninga', title, message, false, function() {

            // If the user is logged-in, he'll be redirected to the cloud
            loadSubPage('login');

            // FIXME: no location.reload() should be needed..
            location.reload();
        });
    }
    else {
        // Show file/folder not found overlay
        mobile.initDOM();
        mobile.notFoundOverlay.show(message || parseInt(e && e.err || e));
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

            if ((anonymouschat || u_type) && !megaChatIsReady) {
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
                window.loadingDialog.hide();
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
        else if (anonymouschat) {
            mclp.always(__init_chat);
        }
        else if (pfid) {
            if (d) {
                console.log('Will not initialize the chat (folder-link)');
            }

            resolve(EACCESS);
        }
        else {
            authring.onAuthringReady('chat').done(__init_chat);
        }
    });
}

function loadfm_callback(res) {
    'use strict';

    if ((parseInt(res) | 0) < 0 || res === undefined) {
        loadingDialog.hide();
        loadingInitDialog.hide();

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
    M.avatars();
    loadfm.fromapi = true;

    if (localStorage['treefixup$' + u_handle]) {
        // We found inconsistent tree nodes and forced a reload, log it.
        eventlog(99695);
    }

    process_f(res.f, function onLoadFMDone(hasMissingKeys) {

        // Check if the key for a folderlink was correct
        if (folderlink && missingkeys[M.RootID]) {
            loadingDialog.hide();
            loadingInitDialog.hide();

            loadfm.loaded = false;
            loadfm.loading = false;

            // If on mobile, load the decryption key overlay
            if (is_mobile) {
                mobile.decryptionKeyOverlay.show(pfid, true, true);
                return new MegaPromise();
            }
            else {
                // Otherwise load the regular webclient decryption key dialog
                return mKeyDialog(pfid, true, true)
                    .fail(function() {
                        loadSubPage('start');
                    });
            }
        }

        if (folderlink) {

            // This folderlink is valid to affiliate
            M.affiliate.storeAffiliate(folderlink, 2);
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

        // Handle versioning nodes
        if (res.f2) {
            process_f(res.f2, null, true);
        }

        // This package is sent on hard refresh if owner have enabled or disabled PUF
        if (res.uph) {
            mega.megadrop.processUPHAP(res.uph);
        }

        // decrypt hitherto undecrypted nodes
        crypto_fixmissingkeys(missingkeys);

        if (res.cr) {
            crypto_procmcr(res.cr);
        }

        if (res.sr) {
            crypto_procsr(res.sr);
        }

        mega.loadReport.procNodeCount = Object.keys(M.d || {}).length;
        mega.loadReport.procNodes     = Date.now() - mega.loadReport.stepTimeStamp;
        mega.loadReport.stepTimeStamp = Date.now();

        // Time to save the ufs-size-cache, from which M.tree nodes will be created and being
        // those dependant on in-memory-nodes from the initial load to set flags such SHARED.
        console.assert(ufsc, 'check this...');
        if (ufsc) {
            if (localStorage.ufsis) {
                ufsc.saveInitialState()
                    .then(function() {
                        setsn(res.sn);
                        currsn = res.sn;
                        getsc(true);
                    })
                    .catch(dump);
                return;
            }

            ufsc.save();
        }

        // commit transaction and set sn
        setsn(res.sn);
        currsn = res.sn;

        // retrieve initial batch of action packets, if any
        // we'll then complete the process using loadfm_done
        if (is_selenium) {
            // It runs too fast in some accounts...
            delay(getsc.bind(null, true), 1300);
        }
        else {
            getsc(true);
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

        // Ensure tree nodes consistency...
        var tlen = Object.keys(M.tree[M.RootID] || {}).length;
        var clen = Object.keys(M.c[M.RootID] || {}).filter(function(h) { return M.c[M.RootID][h] > 1 }).length;

        if (tlen < clen) {
            if (localStorage['treefixup$' + u_handle]) {
                // The force reload attempt did not helped on getting tree nodes consistency back (?!)
                eventlog(99696);
            }
            else if ((Date.now() - parseInt(localStorage['treeic$' + u_handle] || 0)) < 864e6) {
                // The user suffered again from inconsistent tree nodes within the
                // last 10 days, we are not force reloading his account on this case.
                eventlog(99697);
            }
            else {
                // Force reload the account to get tree nodes consistency back...
                localStorage['treeic$' + u_handle] = Date.now();
                localStorage['treefixup$' + u_handle] = 1;
                return fm_forcerefresh();
            }
        }
        delete localStorage['treefixup$' + u_handle];

        // load/initialise the authentication system
        mega.config.fetch()
            .always(function() {
                authring.initAuthenticationSystem();
            });
    }
    else if (pfid && u_type == 3) {
        // logged in user opening a folder link
        mega.config.fetch();
    }

    // This function is invoked once the M.openFolder()'s promise (through renderfm()) is fulfilled.
    var _completion = function() {
        var hideLoadingDialog = !is_mobile && !CMS.isLoading();

        if ((location.host === 'mega.nz' || !megaChatIsDisabled) && !is_mobile) {

            if (!pfid && u_type === 3 && !loadfm.chatloading) {
                loadfm.chatloading = true;

                M.require('chat')
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

                /*
                if (getSitePath().substr(0, 8) === '/fm/chat') {
                    // Keep the "decrypting" step until the chat have loaded.
                    hideLoadingDialog = false;
                }*/
            }
        }

        if (hideLoadingDialog) {
            loadingDialog.hide();
            loadingInitDialog.hide();
            // Reposition UI elements right after hiding the loading overlay,
            // without waiting for the lazy $.tresizer() triggered by MegaRender
            fm_resize_handler(true);
        }

        // -0x800e0fff indicates a call to loadfm() when it was already loaded
        if (mDBload !== -0x800e0fff && !is_mobile) {
            onIdle(function _initialNotify() {

                // If this was called from the initial fm load via gettree or db load, we should request the
                // latest notifications. These must be done after the first getSC call.
                if (!folderlink) {
                    notify.getInitialNotifications();
                }
            });

            if (mBroadcaster.crossTab.master && !mega.loadReport.sent) {
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
                    workers && workers.length || -666,
                    r.ttlb | 0, // time to last byte
                    r.ttfm | 0, // time to fm since ttlb
                    u_type === 3 ? (mBroadcaster.crossTab.master ? 1 : 0) : -1, // master, or slave tab?
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
                M.avatars();
            }
        }
        if ($.msgDialog) {
            closeMsg();
        }
        clearInterval(mega.loadReport.aliveTimer);
        mega.state &= ~window.MEGAFLAG_LOADINGCLOUD;

        watchdog.notify('loadfm_done');
    };

    var _onConfigReady = function() {
        var promise = MegaPromise.resolve();

        mega.loadReport.fmConfigFetch = Date.now() - mega.loadReport.stepTimeStamp;
        mega.loadReport.stepTimeStamp = Date.now();

        // are we actually on an #fm/* page?
        if (page !== 'start' && is_fm() || $('.fm-main.default').is(":visible")) {
            promise = M.initFileManager();

            mega.loadReport.renderfm      = Date.now() - mega.loadReport.stepTimeStamp;
            mega.loadReport.stepTimeStamp = Date.now();

            // load report - time to fm after last byte received
            mega.loadReport.ttfm = Date.now() - mega.loadReport.ttfm;

            // setup fm-notifications such as 'full' or 'almost-full' if needed.
            if (!pfid && u_type) {
                M.getStorageState().then(function(res) {
                    // 0: Green, 1: Orange (almost full), 2: Red (full)
                    if (res >= 1) {
                        M.checkStorageQuota(50);
                    }
                });
                M.myChatFilesFolder.init();
            }
        }
        else {
            mega.loadReport.ttfm = -1;
            mega.loadReport.renderfm = -1;
        }

        mclp = Promise.resolve();
        promise.always(_completion);
    };

    mega.config.ready(function() {
        mclp.then(_onConfigReady)
            .catch(function() {
                try {
                    _onConfigReady();
                }
                catch (ex) {
                    onIdle(function() {
                        // give time for window.onerror to fire 'cd2' before showing the blocking confirm-dialog
                        setTimeout(function() {
                            siteLoadError(ex, 'loadfm');
                        }, 2e3);

                        // reach window.onerror
                        throw ex;
                    });
                }
            });
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
    if (e)
        viewmodes[id] = 1;
    else
        viewmodes[id] = 0;
    mega.config.set('viewmodes', viewmodes);
}

var thumbnails = Object.create(null);
var th_pending = Object.create(null);
var th_requested = Object.create(null);
var fa_duplicates = Object.create(null);
var fa_reqcnt = 0;
var fa_addcnt = 8;
var fa_tnwait = 0;

function fm_thumbnails(mode, nodeList, callback)
{
    var treq = {}, a = 0, max = Math.max($.rmItemsInView || 1, 71) + fa_addcnt, u = max - Math.floor(max / 3), y;
    if (!fa_reqcnt)
        fa_tnwait = y;
    if (d)
        console.time('fm_thumbnails');

    nodeList = (mode === 'standalone' ? nodeList : false) || M.v;

    if (!M.chat || mode === 'standalone')
    {
        for (var i = 0; i < nodeList.length; i++) {
            var n = nodeList[i];
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
                    th_pending[n.h] = [];

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

                if (mode === 'standalone' && typeof callback === 'function') {
                    if (thumbnails[n.h]) {
                        onIdle(callback.bind(null, n.h));
                    }
                    else if (th_pending[n.h]) {
                        th_pending[n.h].push(onIdle.bind(null, callback.bind(null, n.h)));
                    }
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
                if (mode === 'standalone' && typeof callback === 'function') {
                    onIdle(callback.bind(null, node));
                }
                if (th_pending[node]) {
                    for (var t = th_pending[node].length; t--;) {
                        th_pending[node][t]();
                    }
                    delete th_pending[node];
                }
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
                    for (var i = 0; i < nodeList.length; i++)
                    {
                        var n = nodeList[i];
                        if (n.h !== node && n.fa === targetNode.fa && !thumbnails[n.h])
                        {
                            thumbnails[n.h] = thumbnails[node];
                            if (n.seen && M.currentdirid === cdid)  {
                                fm_thumbnail_render(n);
                            }
                            if (mode === 'standalone' && typeof callback === 'function') {
                                onIdle(callback.bind(null, n.h));
                            }
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
            imgNode.parentNode.parentNode.classList.add('thumb');
        }
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
