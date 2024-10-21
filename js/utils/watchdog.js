/**
 * Cross-tab communication using WebStorage
 * @name watchdog
 * @memberOf window
 */
lazy(self, 'watchdog', () => {
    'use strict';

    const storage = Object.create(null);
    const channel = mBroadcaster.getBroadcastChannel('watchdog');

    // Hols promises waiting for a query reply
    const queryQueue = Object.create(null);
    // Holds query replies if cached
    const replyCache = Object.create(null);
    // waiting queries
    const waitingQueries = Object.create(null);
    // event overriders
    const overrides = Object.create(null);

    // statically defined handlers, for anything transient do consider using registerOverrider() or attach()!
    const mWatchDogHandlers = freeze({
        'Q!Rep!y'(data) {
            const {query, token, value} = data;

            if (queryQueue[token]) {
                queryQueue[token].push(value);

                const {tax} = queryQueue[token];
                if (tax) {
                    if (self.d) {
                        const m = '[%s] %s reply from %d/%d tabs';
                        channel.logger.info(m, token.slice(-12), query, tax.ping + 1, tax.tabs, [value]);
                    }
                    if (++tax.ping >= tax.tabs) {
                        onIdle(() => {
                            tax.resolve(queryQueue[token]);
                            delete queryQueue[token];
                        });
                    }
                }
            }

            if (replyCache[query]) {
                replyCache[query].push(value);
            }

            // if there is a promise in waitingQueries, that means that this query
            // is expecting only 1 response, so we can resolve it immediately.
            const resolver = waitingQueries[token];
            if (resolver) {
                const {timer} = resolver;

                if (value) {
                    timer.abort();
                    queueMicrotask(() => {
                        delete queryQueue[token];
                        delete waitingQueries[token];
                    });
                    resolver([value]);
                }
                else {
                    // Got falsy value, wait for more
                    timer.poke(value);
                }
            }
        },
        'loadfm_done'(data, origin) {
            if (storage.login === origin) {
                location.reload(true);
            }
        },
        'setrsa'(data) {
            if (typeof dlmanager === 'object'
                && (dlmanager.isOverFreeQuota || dlmanager.onOverquotaWithAchievements)) {

                const [type, sid] = data;

                u_storage = init_storage(localStorage);
                u_checklogin4(sid)
                    .then((r) => {
                        channel.logger.assert(u_type === type, 'Unexpected user-type: got %s, expected %s', r, type);

                    })
                    .dump('watchdog.setrsa');
            }
        },
        'setsid'(data, origin) {
            if (storage.login === origin && data) {

                if (!isPublicLink()) {
                    loadingDialog.show(0, l[17794]);
                    return tSleep(3).then(() => location.reload(true));
                }

                const sid = data;
                delay('watchdog:setsid', () => u_checklogin4(sid).dump('watchdog.setsid'), 750);

                // @todo receive from what page the user logged in, and if he's getting into the FM don't delete this
                delete storage.login;
            }
        },
        'login'(data, origin) {
            if (data[0]) {
                u_storage = init_storage(sessionStorage);
                u_storage.k = JSON.stringify(data[0]);
                if (data[2]) {
                    u_storage.privk = data[2];
                }
            }
            else {
                u_storage = init_storage(localStorage);
            }
            storage.login = origin;
        },
        'user-created'(data, origin) {
            if (!M.hasPendingTransfers()) {
                loadingDialog.show(0, l[17794]);
                storage.login = origin;
            }
        },
        'logout'() {
            if (storage.atfs || !M.hasPendingTransfers()) {
                loadingDialog.show(0, l[17794]);
                tSleep.race(2, storage.atfs)
                    .then(() => tSleep.race(3, u_logout(-0xDEADF)))
                    .finally(() => location.reload());
            }
        },
        'abort-transfers'() {
            if (M.hasPendingTransfers()) {
                // to be used in 'logout' event, as this is only invoked from M.logoutAbortTransfers()
                storage.atfs = M.abortTransfers(true);
            }
        },
        'chat-event'(data) {
            if (data.state === 'DISCARDED' && self.megaChatIsReady) {
                const chatRoom = megaChat.plugins.chatdIntegration._getChatRoomFromEventData(data);
                megaChat.plugins.chatdIntegration.discardMessage(chatRoom, data.messageId);
            }
        },
    });

    // watchdog.query() response handlers.
    const mWatchDogQueryDux = freeze({
        'dlsize'() {
            return dlmanager.getCurrentDownloadsSize();
        },
        'dling'() {
            return dlmanager.getCurrentDownloads();
        },
        'qbqdata'() {
            return dlmanager.getQBQData();
        },
        'transfers'() {
            return M.hasPendingTransfers();
        },
        'rad-flush'() {
            return 'rad' in mega && mega.rad.flush().always(nop);
        },
        'ST(catchup)'(data) {
            return fminitialized && !isPublicLink() && api.catchup(data.st, true);
        }
    });

    // ------------------------------------------------------------------------------------------

    return freeze({
        get origin() {
            return storage.origin;
        },

        /**
         * Attach a self-managed handler for watchdog-events.
         * @param {Function|Object} what event handler
         */
        attach(what) {
            return what !== this && channel.attachEvent(what);
        },

        /**
         * Detach a self-managed handler for watchdog-events.
         * @param {Function|Object} what event handler
         */
        detach(what) {
            return what !== this && channel.detachEvent(what);
        },

        /** setup watchdog listener */
        setup() {
            if (!('origin' in storage)) {
                Object.defineProperty(storage, 'origin', {
                    value: channel.origin
                });
                channel.attachEvent(this);
            }
        },

        /**
         * Notify watchdog event/message
         * @param {String} msg  The message
         * @param {*} [data] Any data sent to other tabs
         */
        notify(msg, data) {
            channel.dispatchEvent(msg, data);
        },

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
        query(what, timeout, cache, data, expectsSingleAnswer) {
            return new Promise((resolve, reject) => {
                if (replyCache[what]) {
                    // a prior query was launched with the cache flag
                    cache = replyCache[what];
                    delete replyCache[what];
                    return resolve(cache);
                }
                const tabs = mBroadcaster.crossTab.peers | 0;
                if (!tabs) {
                    // Nothing to do here.
                    return reject(EEXIST);
                }
                const token = makeUUID();
                const tmpData = structuredClone(data || {});

                if (cache) {
                    replyCache[what] = [];
                }
                tmpData.reply = token;
                queryQueue[token] = [];

                queueMicrotask(() => {
                    this.notify(`Q!${what}`, tmpData);
                });

                if (timeout === 'await') {
                    // no-timeout special handling
                    if (self.d) {
                        channel.logger.warn('[%s] Waiting "%s" reply from %d tabs', token.slice(-12), what, tabs);
                    }
                    Object.defineProperty(queryQueue[token], 'tax', {value: {resolve, tabs, ping: 0}});
                    return;
                }
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

                        delete queryQueue[token];
                        delete waitingQueries[token];
                    };
                    const timer = tSleep(timeout);

                    timer.poke = () => {
                        if (!pokes++) {
                            tSleep(0.3 * tabs).then(ack);
                        }
                    };
                    timer.then(ack);

                    resolve.timer = timer;
                    waitingQueries[token] = resolve;
                }
                else {
                    // wait for reply and fulfill/reject the promise
                    tSleep(timeout).then(() => {
                        if (queryQueue[token].length) {
                            resolve(queryQueue[token]);
                        }
                        else {
                            reject(EACCESS);
                        }
                        delete queryQueue[token];
                    });
                }
            });
        },

        /**
         * Register event handling overrider
         * @param {String} event The event name
         * @param {Function|*} [callback] Optional function to invoke on overriding
         */
        registerOverrider(event, callback) {

            overrides[event] = callback || true;
        },

        /**
         * Unregister event handling overrider
         * @param {String} event The event name
         */
        unregisterOverrider(event) {

            delete overrides[event];
        },

        /** Handle watchdog/webstorage event */
        handleEvent({data}) {
            const {message, origin, data: payload} = data;

            if (channel.debug) {
                channel.debug(`\u{1F4E9} Received '${message}' message from ${origin.toString(36)}`, payload);
            }

            if (origin === channel.origin) {

                if (self.d) {
                    channel.logger.warn('Ignoring mWatchDog event', message);
                }
            }
            else if (overrides['*'] || overrides[message]) {

                if (channel.debug) {
                    channel.debug(`\u{1F3C4} dispatching overrider for ${message}`, payload);
                }
                if (typeof overrides[message] === 'function') {

                    tryCatch(overrides[message])(payload, data);
                }
                else {
                    mBroadcaster.sendMessage(`watchdog:${message}`, data);
                }
            }
            else if (mWatchDogHandlers[message]) {

                tryCatch(mWatchDogHandlers[message])(payload, origin);
            }
            else if (!mBroadcaster.sendMessage(`watchdog:${message}`, data) && message.startsWith('Q!')) {
                const query = message.slice(2);
                const value = mWatchDogQueryDux[query] && mWatchDogQueryDux[query](payload, data);

                Promise.resolve(value)
                    .then((value = false) => {
                        this.notify('Q!Rep!y', {query, value, token: payload.reply});
                    })
                    .catch(dump);
            }
        }
    });
});

mBroadcaster.once('boot_done', () => {
    'use strict';
    watchdog.setup();

    api.observe('setsid', (sid) => {
        watchdog.notify('setsid', sid);
    });
});
