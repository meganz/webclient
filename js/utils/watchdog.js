/* eslint-disable strict */
/**
 * Cross-tab communication using WebStorage
 * @name watchdog
 * @memberOf window
 */
lazy(self, 'watchdog', () => Object.freeze({
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
        if (d > 2) {
            console.log('mWatchDog Notifying', this.eTag + msg, msg === 'setsid' ? '' : localStorage[this.eTag + msg]);
        }
    }),

    /**
     * Perform a query to other tabs and wait for reply through a Promise
     * @param {String} what Parameter
     * @param {Number|String} timeout ms
     * @param {String} cache   preserve result
     * @param {Object} [data]   data to be sent with the query
     * @param {bool} [expectsSingleAnswer]   pass true if your query is expected to receive only single answer (this
     * would speed up and resolve the returned promise when the first answer is received and won't wait for the full
     * `timeout` to gather more replies)
     * @return {Promise}
     */
    query: function(what, timeout, cache, data, expectsSingleAnswer) {
        return new Promise((resolve, reject) => {
            if (this.replyCache[what]) {
                // a prior query was launched with the cache flag
                cache = this.replyCache[what];
                delete this.replyCache[what];
                return resolve(cache);
            }
            const {master, slaves} = mBroadcaster.crossTab;
            const tabs = slaves && slaves.length;
            const canSignal = !master || tabs;

            if (!canSignal) {
                // Nothing to do here.
                return reject(EEXIST);
            }
            const token = (Math.random() * Date.now() << 4).toString(36);

            if (cache) {
                this.replyCache[what] = [];
            }
            this.queryQueue[token] = [];

            const tmpData = data ? clone(data) : {};
            tmpData['reply'] = token;

            queueMicrotask(() => {
                this.notify(`Q!${what}`, tmpData);
            });
            timeout = parseInt(timeout || 384) / 1e3;

            if (expectsSingleAnswer) {
                let pokes = 0;
                const ack = () => {
                    if (pokes > 0) {
                        // all tabs returned a falsy value
                        resolve([false]);
                    }
                    else {
                        reject(EACCESS);
                    }

                    delete this.queryQueue[token];
                    delete this.waitingQueries[token];
                };
                const timer = tSleep(timeout);

                timer.poke = () => {
                    if (!pokes++) {
                        tSleep(0.3 * tabs).then(ack);
                    }
                };
                timer.then(ack);

                resolve.timer = timer;
                this.waitingQueries[token] = resolve;
            }
            else {
                // wait for reply and fulfill/reject the promise
                tSleep(timeout).then(() => {
                    if (this.queryQueue[token].length) {
                        resolve(this.queryQueue[token]);
                    }
                    else {
                        reject(EACCESS);
                    }
                    delete this.queryQueue[token];
                });
            }
        });
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
        if (self.d > 2) {
            console.debug(`mWatchDog ${ev.type}-event`, ev.key, ev.newValue, ev);
        }

        var msg = ev.key.substr(this.eTag.length);
        var strg = JSON.parse(ev.newValue || '""');

        if (!strg || strg.origin === this.wdID) {
            if (self.d > 2) {
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
            case 'Q!Rep!y': {
                const {query, token, value} = strg.data;

                if (this.queryQueue[token]) {
                    this.queryQueue[token].push(value);
                }

                if (this.replyCache[query]) {
                    this.replyCache[query].push(value);
                }

                // if there is a promise in .waitingQueries, that means that this query is expecting only 1 response
                // so we can resolve it immediately.
                const resolver = this.waitingQueries[token];
                if (resolver) {
                    const {timer} = resolver;

                    if (value) {
                        timer.abort();
                        queueMicrotask(() => {
                            delete this.queryQueue[token];
                            delete this.waitingQueries[token];
                        });
                        resolver([value]);
                    }
                    else {
                        // Got falsy value, wait for more
                        timer.poke(value);
                    }
                }
                break;
            }

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
                    u_checklogin4(sid)
                        .then(r => {

                            if (u_type !== type) {
                                console.error('Unexpected user-type: got %s, expected %s', r, type);
                            }

                            dlmanager._onQuotaRetry(true, sid);
                            return r;
                        })
                        .dump('watchdog.setrsa');
                }
                break;

            case 'setsid':
                if (this.Strg.login === strg.origin && strg.data) {
                    const sid = strg.data;
                    delay('watchdog:setsid', () => u_checklogin4(sid).dump('watchdog.setsid'), 750);
                    delete this.Strg.login;
                }
                break;

            case 'login': {
                const data = strg.data;

                if (data[0]) {
                    u_storage = init_storage(sessionStorage);
                    u_storage.k = JSON.stringify(data[0]);
                }
                else {
                    u_storage = init_storage(localStorage);
                }
                this.Strg.login = strg.origin;

                break;
            }

            case 'createuser':
                if (!M.hasPendingTransfers()) {
                    loadingDialog.show();
                    this.Strg.login = strg.origin;
                }
                break;

            case 'logout':
                if (!M.hasPendingTransfers()) {
                    u_logout(-0xDEADF).then(() => location.reload());
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
}));

mBroadcaster.once('boot_done', () => {
    'use strict';
    watchdog.setup();

    api.observe('setsid', (sid) => {
        watchdog.notify('setsid', sid);
    });
});
