/**
 * Cross-tab communication using WebStorage
 */
var watchdog = Object.freeze({
    Strg: {},
    // Tag prepended to messages to identify watchdog-events
    eTag: '$WDE$!_',
    // ID to identify tab's origin
    wdID: (Math.random() * Date.now() << 4).toString(26),
    // Hols promises waiting for a query reply
    queryQueue: Object.create(null),
    // Holds query replies if cached
    replyCache: Object.create(null),
    // waiting queries
    waitingQueries: Object.create(null),
    // event overriders
    overrides: Object.create(null),

    /** setup watchdog/webstorage listeners */
    setup: function() {
        if (window.addEventListener) {
            window.addEventListener('storage', this, false);
        }
        else if (window.attachEvent) {
            window.attachEvent('onstorage', this.handleEvent.bind(this));
        }
    },

    /** Remove watchdog entries out of localStorage */
    clear: function() {
        'use strict';

        var tag = this.eTag;
        var entries = Object.keys(localStorage)
            .filter(function(k) {
                return k.startsWith(tag);
            });

        console.debug('Removing watchdog entries...', entries);

        for (var i = entries.length; i--;) {
            delete localStorage[entries[i]];
        }
    },

    /** Periodic removal of watchdog entries out of localStorage */
    drain: SoonFc(7e3, function() {
        'use strict';
        this.clear();
    }),

    /**
     * Notify watchdog event/message
     * @param {String} msg  The message
     * @param {String} data Any data sent to other tabs, optional
     */
    notify: tryCatch(function(msg, data) {
        'use strict';
        this.drain();
        data = {origin: this.wdID, data: data, sid: ++mIncID};
        localStorage.setItem(this.eTag + msg, JSON.stringify(data));
        if (d) {
            console.log('mWatchDog Notifying', this.eTag + msg, msg === 'setsid' ? '' : localStorage[this.eTag + msg]);
        }
    }),

    /**
     * Perform a query to other tabs and wait for reply through a Promise
     * @param {String} what Parameter
     * @param {String} timeout ms
     * @param {String} cache   preserve result
     * @param {Object} [data]   data to be sent with the query
     * @param {bool} [expectsSingleAnswer]   pass true if your query is expected to receive only single answer (this
     * would speed up and resolve the returned promise when the first answer is received and won't wait for the full
     * `timeout` to gather more replies)
     * @return {MegaPromise}
     */
    query: function(what, timeout, cache, data, expectsSingleAnswer) {
        var self = this;
        var token = (Math.random() * Date.now() << 4).toString(19);
        var promise = new MegaPromise();

        if (this.replyCache[what]) {
            // a prior query was launched with the cache flag
            cache = this.replyCache[what];
            delete this.replyCache[what];
            return MegaPromise.resolve(cache);
        }

        if (!mBroadcaster.crossTab.master
            || Object(mBroadcaster.crossTab.slaves).length) {

            if (cache) {
                this.replyCache[what] = [];
            }
            this.queryQueue[token] = [];

            var tmpData;
            if (!data) {
                tmpData = {};
            }
            else {
                tmpData = clone(data);
            }
            tmpData['reply'] = token;

            onIdle(function() {
                self.notify('Q!' + what, tmpData);
            });

            if (!expectsSingleAnswer) {
                // wait for reply and fullfil/reject the promise
                setTimeout(function() {
                    if (self.queryQueue[token].length) {
                        promise.resolve(self.queryQueue[token]);
                    }
                    else {
                        promise.reject(EACCESS);
                    }
                    delete self.queryQueue[token];
                }, timeout || 200);
            }
            else {
                promise.timer = setTimeout(function() {
                    if (promise.state() === 'pending') {
                        promise.reject(EACCESS);
                        delete self.queryQueue[token];
                        delete self.waitingQueries[token];
                    }
                }, timeout || 200);

                self.waitingQueries[token] = promise;
            }
        }
        else {
            promise = MegaPromise.reject(EEXIST);
        }

        return promise;
    },

    /**
     * Register event handling overrider
     * @param {String} event The event name
     * @param {Function|*} [callback] Optional function to invoke on overriding
     */
    registerOverrider: function(event, callback) {
        'use strict';

        this.overrides[event] = callback || true;
    },

    /**
     * Unregister event handling overrider
     * @param {String} event The event name
     */
    unregisterOverrider: function(event) {
        'use strict';

        delete this.overrides[event];
    },

    /** Handle watchdog/webstorage event */
    handleEvent: function(ev) {
        if (String(ev.key).indexOf(this.eTag) !== 0) {
            return;
        }
        if (d) {
            console.debug('mWatchDog ' + ev.type + '-event', ev.key, ev.newValue, ev);
        }

        var msg = ev.key.substr(this.eTag.length);
        var strg = JSON.parse(ev.newValue || '""');

        if (!strg || strg.origin === this.wdID) {
            if (d) {
                console.log('Ignoring mWatchDog event', msg, strg);
            }
            return;
        }

        if (this.overrides['*'] || this.overrides[msg]) {
            if (d) {
                console.debug('watchdog overrider for ' + msg, strg);
            }
            if (typeof this.overrides[msg] === 'function') {
                tryCatch(this.overrides[msg])(msg, strg);
            }
            else {
                mBroadcaster.sendMessage("watchdog:" + msg, strg);
            }
            delete localStorage[ev.key];
            return;
        }

        switch (msg) {
            case 'Q!Rep!y':
                if (this.queryQueue[strg.data.token]) {
                    this.queryQueue[strg.data.token].push(strg.data.value);
                }
                if (this.replyCache[strg.data.query]) {
                    this.replyCache[strg.data.query].push(strg.data.value);
                }
                // if there is a promise in .waitingQueries, that means that this query is expecting only 1 response
                // so we can resolve it immediately.
                if (this.waitingQueries[strg.data.token]) {
                    var self = this;

                    clearTimeout(this.waitingQueries[strg.data.token].timer);
                    this.waitingQueries[strg.data.token]
                        .always(function() {
                            // cleanup after all other done/always/fail handlers...
                            delete self.waitingQueries[strg.data.token];
                            delete self.queryQueue[strg.data.token];
                        })
                        .resolve([strg.data.value]);

                }
                break;

            case 'loadfm_done':
                if (this.Strg.login === strg.origin) {
                    location.reload(true);
                }
                break;

            case 'setrsa':
                if (typeof dlmanager === 'object'
                    && (dlmanager.isOverFreeQuota || dlmanager.onOverquotaWithAchievements)) {

                    var sid = strg.data[1];
                    var type = strg.data[0];

                    u_storage = init_storage(localStorage);
                    u_storage.sid = sid;

                    u_checklogin({
                        checkloginresult: function(ctx, r) {
                            u_type = r;

                            if (u_type !== type) {
                                console.error('Unexpected user-type: got %s, expected %s', r, type);
                            }

                            if (window.n_h) {
                                // set new u_sid under folderlinks
                                api_setfolder(n_h);

                                // hide ephemeral account warning
                                if (typeof alarm !== 'undefined') {
                                    alarm.hideAllWarningPopups();
                                }
                            }

                            dlmanager._onQuotaRetry(true, sid);
                        }
                    });
                }
                break;

            case 'setsid':
                if (typeof dlmanager === 'object' && dlmanager.isOverQuota) {

                    // another tab fired a login/register while this one has an overquota state
                    var sid = strg.data;
                    delay('watchdog:setsid', function() {
                        // the other tab must have sent the new sid
                        console.assert(sid, 'sid not set');
                        api_setsid(sid);
                    }, 2000);
                }
                break;

            case 'login':
            case 'createuser':
                if (!M.hasPendingTransfers()) {
                    loadingDialog.show();
                    this.Strg.login = strg.origin;
                }
                break;

            case 'logout':
                if (!M.hasPendingTransfers()) {
                    u_logout(-0xDEADF);
                    location.reload();
                }
                break;

            case 'abort_trans':
                if (M.hasPendingTransfers()) {
                    M.abortTransfers(true);
                }
                break;

            case 'chat_event':
                if (strg.data.state === 'DISCARDED') {
                    var chatRoom = megaChat.plugins.chatdIntegration._getChatRoomFromEventData(strg.data);
                    megaChat.plugins.chatdIntegration.discardMessage(chatRoom, strg.data.messageId);
                }
                break;

            default:
                if (mBroadcaster.sendMessage("watchdog:" + msg, strg)) {
                    break;
                }

                if (msg.startsWith('Q!')) {
                    var value = false;
                    var query = msg.substr(2);

                    switch (query) {
                        case 'dlsize':
                            value = dlmanager.getCurrentDownloadsSize();
                            break;

                        case 'dling':
                            value = dlmanager.getCurrentDownloads();
                            break;

                        case 'qbqdata':
                            value = dlmanager.getQBQData();
                            break;

                        case 'transing':
                            value = M.hasPendingTransfers();
                            break;
                    }

                    this.notify('Q!Rep!y', {
                        query: query,
                        value: value,
                        token: strg.data.reply
                    });
                }

                break;
        }

        delete localStorage[ev.key];
    }
});

mBroadcaster.once('boot_done', function() {
    watchdog.setup();
});
