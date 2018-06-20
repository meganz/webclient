(function(scope) {
    "use strict";

    var VERSION = 5;

    /**
     * ChatdPersist is a container that manages the (local/clientside) chat history (and keys) persistence for chatd.
     *
     * @constructor
     */
    var ChatdPersist = function(chatd) {
        var self = this;
        self.chatd = chatd;

        var loggerOpts = {};
        if (localStorage.chatdPersistDebug) {
            loggerOpts['isEnabled'] = true;
            loggerOpts['minLogLevel'] = function () {
                return MegaLogger.LEVELS.DEBUG;
            };
            loggerOpts['transport'] = function (level, args) {
                var fn = "log";
                if (level === MegaLogger.LEVELS.DEBUG) {
                    fn = "debug";
                }
                else if (level === MegaLogger.LEVELS.LOG) {
                    fn = "log";
                }
                else if (level === MegaLogger.LEVELS.INFO) {
                    fn = "info";
                }
                else if (level === MegaLogger.LEVELS.WARN) {
                    fn = "warn";
                }
                else if (level === MegaLogger.LEVELS.ERROR) {
                    fn = "error";
                }
                else if (level === MegaLogger.LEVELS.CRITICAL) {
                    fn = "error";
                }
                args.push("[" + fn + "]");
                console.warn.apply(console, args);
            };
        }
        else {
            loggerOpts['isEnabled'] = true;
            loggerOpts['minLogLevel'] = function () {
                return MegaLogger.LEVELS.WARN;
            };
        }

        self.logger = new MegaLogger("ChatdPersist", loggerOpts);

        self.dbName = "chatd_" + VERSION;

        self.schemaCb = function(db) {
            db
                .version(1).stores({
                    /* extra data fields, non indexed: msgObject */
                    'msgs': "++id, chatId, msgId, userId, orderValue, &[chatId+msgId], [chatId+orderValue], keyId",
                    'keys': "++chatId_userId_keyId, chatId, userId", /* extra data fields, non indexed: key */
                    'ptrs': "++chatId_pointer" /* extra data fields, non indexed: value*/
                });
        };

        self.dbState = ChatdPersist.DB_STATE.NOT_READY;

        self._queuePerChat = {};
        self._queueTransactionPerChat = {};
        self._msgActionsQueuePerChat = {};

        self._histRequestFlagsPerChat = {};

        if (localStorage.chatdPersistDebug) {
            window.cdb = self;
        }

        self._tempKeyIdsMapping = {};

        self.init();
    };


    ChatdPersist.QUEUE_TYPE = {
        'KEY': 1,
        'MSG': 2
    };

    /**
     * Returns true if this is the Master tab (e.g. if having multiple tabs)
     *
     * @returns {bool}
     */
    ChatdPersist.isMasterTab = function() {
        return mBroadcaster.crossTab.master ? true : false;
    };

    /**
     * One-time setup code, used internally
     */
    ChatdPersist.prototype.init = function() {
        var self = this;


        ChatdPersist._requiresDbReady.call(undefined, function() {
            self.onDbOpen();
            return MegaPromise.resolve();
        }).call(self);

        self.chatd.rebind('onMessageKeysDone.chatdPersist', function(e, data) {
            if (!ChatdPersist.isMasterTab()) {
                // don't do anything if this is not the master tab!
                return;
            }

            if (data.chatdPersist) {
                return;
            }

            if (!data.keys) {
                return;
            }

            // jscs:disable disallowImplicitTypeConversion
            var isFromHist = !!self._histRequestFlagsPerChat[data.chatId];
            // jscs:enable disallowImplicitTypeConversion

            data.keys.forEach(function(key) {
                if (!isFromHist) {
                    self.chatd.chatdPersist.persistKey(
                        data.chatId,
                        key.keyid,
                        key.userId,
                        key.key
                    );
                }
                else {
                    self.chatd.chatdPersist.addToQueue(
                        data.chatId,
                        ChatdPersist.QUEUE_TYPE.KEY,
                        [
                            key.keyid,
                            key.userId,
                            key.key
                        ]
                    );
                }
            });
        });

        self.chatd.rebind('onMessagesKeyIdDone.chatdPersist', function(e, data) {
            if (!ChatdPersist.isMasterTab()) {
                // don't do anything if this is not the master tab!
                return;
            }

            var chatId = data.chatId;
            var r = megaChat.getChatById(chatId);
            if (r && r.protocolHandler) {
                self._tempKeyIdsMapping[chatId + "_" + data.keyxid] = data.keyid;

                var ph = r.protocolHandler;
                var keyId = data.keyid;
                var tempKeyId = data.keyxid;
                var key = ph.participantKeys[u_handle][a32_to_str([tempKeyId])];
                // encrypt key, as it was just received from chatd
                key = ph.getKeyBlob(key, [u_handle]);
                key = key && key.substr(u_handle.length - 1, key.length) || key;

                if (key) {
                    self.persistKey(chatId, keyId, u_handle, key);
                }
            }
            else {
                self.logger.warn("Could not find chatId:", chatId, " so KeyIdDone is not processed.");
            }


        });


        self.chatd.rebind('onMessageLastSeen.chatdPersist', function(e, data) {
            if (!ChatdPersist.isMasterTab() || data.chatdPersist) {
                // don't do anything if this is not the master tab!
                return;
            }
            self.setPointer(data.chatId, 'ls', data.messageId);
        });

        self.chatd.rebind('onMessagesHistoryDone.chatdPersist', function(e, data) {
            if (data.chatdPersist) {
                return;
            }

            self.persistQueue(data.chatId);

            if (typeof self._histRequestFlagsPerChat[data.chatId] !== 'undefined') {
                self._histRequestFlagsPerChat[data.chatId]--;
                if (!self._histRequestFlagsPerChat[data.chatId]) {
                    // proper mem cleanup
                    delete self._histRequestFlagsPerChat[data.chatId];
                }
            }

        });
        self.chatd.rebind('onMessagesHistoryRequest.chatdPersist', function(e, data) {
            if (data.chatdPersist) {
                return;
            }

            self._histRequestFlagsPerChat[data.chatId]++;
        });

        megaChat.rebind('onRoomDestroy.chatdPersist', function(e, chatRoom) {
            var chatId = chatRoom.chatId;
            self.db.transaction('rw', self.db.msgs, self.db.keys, self.db.ptrs, function(m, k, p, trans) {
                self._encryptedWhere('keys', {'chatId': chatId})
                    .done(function(results) {
                        results.forEach(function(r) {
                            self.db.keys.delete(ChatdPersist.encrypt(r.chatId_userId_keyId));
                        });
                    });

                self._encryptedWhere('msgs', {'chatId': chatId})
                    .done(function(results) {
                        results.forEach(function(r) {
                            self.db.msgs.delete(r.id);
                        });
                    });


                // TODO: Pointers. They are not used at the moment.
            })
                .then(function() {
                    self.logger.debug("onRoomDestroy transaction finished successfully.");
                }, function(error) {
                    // Log or display the error
                    self.logger.error('onRoomDestroy transaction error', error.stack || error);
                });
        });

    };
    ChatdPersist.DB_STATE = {
        'NOT_READY': 0,
        'READY': 1,
        'INITIALISING': 2,
        'FAILED': 3,
    };

    /**
     * Alias for FMDB.prototype.strcrypt
     *
     * @param val
     * @returns {*}
     */
    ChatdPersist.encrypt = function(val) {
        if (localStorage.chatdPersistDebug) {
            return JSON.stringify(val);
        }
        return ab_to_base64(FMDB.prototype.strcrypt(JSON.stringify(val)));
    };

    /**
     * Alias for FMDB.prototype.strdecrypt
     * @param val
     * @returns {String}
     */
    ChatdPersist.decrypt = function(val) {
        if (localStorage.chatdPersistDebug) {
            return JSON.parse(val);
        }

        try {
            return JSON.parse(FMDB.prototype.strdecrypt(base64_to_ab(val)));
        }
        catch (e) {
            return "";
        }
    };

    /**
     * Basic wrapper for functions that return a promise and require a db connection to be initialized.
     *
     * @param fn {Function}
     * @param methodName {String}
     * @returns {Function}
     * @private
     */
    ChatdPersist._requiresDbReady = function cdpdbDBConnRequired(fn, methodName) {
        return function __requiresDBConnWrapper() {
            var self = this;
            var args = arguments;
            var promise = new MegaPromise();

            if (!u_handle) {
                promise.reject();
                return promise;
            }



            // lazy db init
            if (self.dbState === ChatdPersist.DB_STATE.NOT_READY && !self.dbLoadingPromise) {
                self.dbState = ChatdPersist.DB_STATE.INITIALISING;

                self.dbLoadingPromise = new MegaPromise();


                self.db = new Dexie("$ctdb_" + u_handle + "_" + self.dbName);

                self.schemaCb(self.db);

                // typically...we could have used a .finally catch-all clause here, but because of Promises A+,
                // and forcing the exceptions triggered by any resolve/reject callbacks the code needs to be
                // duplicated in a setTimeout call.
                self.db.open()
                    .then(
                        function() {
                            window.addEventListener("unhandledrejection", function (event) {
                                if (event.promise && event.promise._PSD) {
                                    // found Dexie error!
                                    self.logger.error("Unhandled rejection from Dexie: ", event.reason);
                                    self.onDbCrashCritical();
                                }
                            });

                            self.dbState = ChatdPersist.DB_STATE.READY;
                            // resolve in a separate thread, causing the current Dexie.Promise to not fail if the
                            // dbLoadingPromise .done cbs fail with a JS exception
                            setTimeout(function() {
                                self.dbLoadingPromise.resolve();

                                delete self.dbLoadingPromise;

                                // recursion
                                promise.linkDoneAndFailTo(
                                    ChatdPersist._requiresDbReady(fn).apply(self, args)
                                );
                            }, 0);
                        },
                        function(e) {
                            self.logger.error("Failed to initialise db.", e && e.message ? e.message : e);

                            self.dbState = ChatdPersist.DB_STATE.FAILED;

                            // resolve in a separate thread, causing the current Dexie.Promise to not fail if the
                            // dbLoadingPromise .done cbs fail with a JS exception
                            setTimeout(function() {
                                self.dbLoadingPromise.reject("DB_OPEN_FAILED");

                                delete self.dbLoadingPromise;

                                self.onDbCrashOnOpen();
                            }, 0);
                        }
                    )
                    .catch(function(e) {
                        self.logger.error("DbOpen failed, reason: ", e);

                        self.dbState = ChatdPersist.DB_STATE.FAILED;
                        // resolve in a separate thread, causing the current Dexie.Promise to not fail if the
                        // dbLoadingPromise .done cbs fail with a JS exception
                        setTimeout(function() {
                            self.dbLoadingPromise.reject("DB_OPEN_FAILED");
                            delete self.dbLoadingPromise;

                            self.onDbCrashOnOpen();
                        }, 0);
                    });
            }
            else if (
                self.dbState === ChatdPersist.DB_STATE.NOT_READY &&
                self.dbLoadingPromise &&
                self.dbLoadingPromise.state() === 'pending'
            ) {
                // DB open is in progress.
                promise.linkDoneAndFailTo(
                    ChatdPersist._requiresDbReady(fn).apply(self, args)
                );
            }
            else if (self.dbState === ChatdPersist.DB_STATE.READY) {

                promise.linkDoneAndFailTo(
                    fn.apply(self, args)
                );
            }
            else if (self.dbState === ChatdPersist.DB_STATE.FAILED) {
                promise.reject("DB_FAILED");
            }
            else {
                if (!self.dbLoadingPromise) {
                    self.logger.error(
                        "DB Loading promise is missing, but the current DB loading state is: ", self.dbState, ".",
                        "Halting."
                    );

                    promise.reject("DB_LOADING_PROMISE_MISSING");
                }
                else {

                    self.dbLoadingPromise
                        .done(function() {
                            promise.linkDoneAndFailTo(
                                fn.apply(self, args)
                            );
                        })
                        .fail(function() {
                            self.logger.error(
                                "DB Loading Failed."
                            );

                            promise.reject("DB_FAILED");
                        });
                }
            }

            return promise;
        };
    };

    /**
     * A hashmap of table -> [column, ...] for stuff you don't want to be encrypted.
     * This only make sense, to add non-context/important data as ordering indexes, so that we can do a .orderBy on
     * them.
     *
     * @type {Object}
     */
    ChatdPersist.DONT_ENCRYPT = {
        'keys': [
        ],
        'ptrs': [
        ],
        'msgs': [
            'id',
            'msgId',
            'orderValue',
            '[chatId+msgId]',
            '[chatId+orderValue]',
        ]
    };

    ChatdPersist.prototype.onDbOpen = function() {
        // pre-cache pointers
        var self = this;
        self._pointersCache = {};

        self.db.ptrs.toArray()
            .then(function(r) {
                if ($.isArray(r)) {
                    r.forEach(function(v) {
                        self._pointersCache[ChatdPersist.decrypt(v.chatId_pointer)] =
                            ChatdPersist.decrypt(v.value);
                    });
                }
            });
    };


    ChatdPersist.prototype._destroy = function() {
        var self = this;
        self.chatd.unbind('onMessageKeysDone.chatdPersist');
        self.chatd.unbind('onMessagesKeyIdDone.chatdPersist');
        self.chatd.unbind('onMessageLastSeen.chatdPersist');
        self.chatd.unbind('onMessagesHistoryDone.chatdPersist');
        self.chatd.unbind('onMessagesHistoryRequest.chatdPersist');
        self.chatd.megaChat.unbind('onRoomDestroy.chatdPersist');
        delete self.chatd.chatdPersist;
    };

    ChatdPersist.prototype._reinitWithoutChardPersist = function() {
        // because we are not sure in what state the indexedDB crashed
        // we need to reinit and retrigger regular JOIN + HIST
        var self = this;
        var shards = self.chatd.shards;
        Object.keys(shards).forEach(function(shardId) {
            var shard = shards[shardId];
            var chatIds = shard.chatIds;
            Object.keys(chatIds).forEach(function(chatIdBin) {
                self.chatd._reinitChatIdHistory(base64urlencode(chatIdBin));
            });
            shard.s.close();
        });

    };


    ChatdPersist.prototype.onDbCrashOnOpen = function() {
        var self = this;
        self._destroy();
        self.logger.warn('DB crashed, disabling chatdPersist (is this an FF incognito?)');
    };

    ChatdPersist.prototype._stopChatdPersist = function() {
        var self = this;

        // already destroying/destroyed?
        if (!self.chatd.chatdPersist) {
            return;
        }

        self._destroy();
        self._reinitWithoutChardPersist();

        if (ChatdPersist.isMasterTab()) {
            self.db.close();
        }
    };

    ChatdPersist.prototype.onDbCrashCritical = SoonFc(function() {
        var self = this;

        // already destroying/destroyed?
        if (!self.chatd.chatdPersist) {
            return;
        }

        self._stopChatdPersist();

        if (ChatdPersist.isMasterTab()) {
            // using Soon, since db.close's promise is not reliable.
            Soon(function () {
                ChatdPersist.forceDrop();
            });
        }

        self.logger.error('DB crashed, disabling chatdPersist (out of IDB space? broken indexedDB data?)');
    }, 500);


    /**
     * Internal method that does add `data` to a `table` (and handles encryption).
     *
     * @param table {String}
     * @param data {Object}
     * @returns {MegaPromise}
     * @private
     */
    ChatdPersist.prototype._encryptedAdd = function(table, data) {
        var self = this;
        assert(self.db[table], 'invalid/missing table: ' + table);
        var promise = new MegaPromise();
        var encryptedData = Object.assign({}, data);
        Object.keys(encryptedData).forEach(function(k) {
            if (ChatdPersist.DONT_ENCRYPT[table].indexOf(k) === -1) {
                encryptedData[k] = ChatdPersist.encrypt(encryptedData[k]);
            }
        });

        self.db[table][table === "msgs" ? "put" : "add"](encryptedData)
            .then(
                function() {
                    promise.resolve(arguments[0]);
                },
                function() {
                    promise.reject(arguments[0]);
                }
            );
        return promise;
    };

    /**
     * Internal method that retrieve data by key (`keyName`) with value of `keyValue` from `table` (and handles
     * encryption).
     *
     * @param table {String}
     * @param keyValue {String}
     * @param [keyName] {String}
     * @returns {MegaPromise}
     * @private
     */
    ChatdPersist.prototype._encryptedGet = function(table, keyValue, keyName) {
        var self = this;
        assert(self.db[table], 'invalid/missing table: ' + table);
        var promise = new MegaPromise();

        var v = keyValue;
        if (ChatdPersist.DONT_ENCRYPT[table].indexOf(keyName) === -1) {
            v = ChatdPersist.encrypt(keyValue);
        }

        self.db[table].get(v)
            .then(
                function(result) {
                    if (!result) {
                        promise.reject(arguments[0]);
                    }
                    else {
                        var decryptedData = Object.assign({}, result);
                        Object.keys(decryptedData).forEach(function(k) {
                            if (ChatdPersist.DONT_ENCRYPT[table].indexOf(k) === -1) {
                                decryptedData[k] = ChatdPersist.decrypt(decryptedData[k]);
                            }
                        });
                        promise.resolve(decryptedData);
                    }
                },
                function() {
                    promise.reject(arguments[0]);
                }
            );
        return promise;
    };

    /**
     * Internal method that goes thru an array (`results`) and decrypt whatever was defined as encrypted initially (e.g
     * skips decryption on DONT_ENCRYPT columns).
     *
     * @param table {String}
     * @param results [Array]
     * @returns {Array}
     * @private
     */
    ChatdPersist.prototype._decryptResultsArray = function (table, results) {
        results.forEach(function(result, k) {
            var decryptedData = Object.assign({}, result);
            Object.keys(decryptedData).forEach(function (k) {
                if (ChatdPersist.DONT_ENCRYPT[table].indexOf(k) === -1) {
                    decryptedData[k] = ChatdPersist.decrypt(decryptedData[k]);
                }
            });
            results[k] = decryptedData;
        });
        return results;
    };

    /**
     * Do a where, with support for doing comparisons (equals) for encrypted data.
     *
     * @param table {String}
     * @param whereObj {Object} Can be an object like Column -> Value to do .equals on.
     * @returns {MegaPromise}
     * @private
     */
    ChatdPersist.prototype._encryptedWhere = function(table, whereObj) {
        var self = this;
        assert(self.db[table], 'invalid/missing table: ' + table);
        var promise = new MegaPromise();
        var q = self.db[table];

        Object.keys(whereObj).forEach(function(k) {
            var v = whereObj[k];
            if (ChatdPersist.DONT_ENCRYPT[table].indexOf(k) === -1) {
                v = ChatdPersist.encrypt(v);
            }
            q = q.where(k).equals(v);
        });

        q.toArray().then(
            function(results) {
                if (!results || results.length === 0) {
                    promise.reject(results);
                }
                else {
                    promise.resolve(self._decryptResultsArray(table, results));
                }
            },
            function() {
                promise.reject(arguments[0]);
            }
        );

        return promise;
    };


    /**
     * Retrieve key by chatId + userId + keyId
     *
     * @param chatId {String}
     * @param userId {String}
     * @param keyId {String}
     * @returns {MegaPromise}
     */
    ChatdPersist.prototype.getKey = function(chatId, userId, keyId) {
        var self = this;
        var promise = new MegaPromise();
        self._encryptedGet('keys', chatId + "_" + userId + "_" + keyId)
            .then(
                function() {
                    if (typeof arguments[0] === 'undefined') {
                        promise.reject(arguments[0]);
                    }
                    else {
                        promise.resolve(arguments[0]);
                    }
                },
                function() {
                    promise.reject(arguments[0]);
                }
            );
        return promise;
    };

    /**
     * Retrieve multiple keys by running on 1 query
     *
     * @param keys {Array} array of hashes (chatId_userId_keyId)
     * @returns {MegaPromise}
     */
    ChatdPersist.prototype.getKeys = function(keys) {
        var self = this;
        var promise = new MegaPromise();

        if (keys.length === 0) {
            return MegaPromise.resolve([]);
        }

        var encKeys = keys.map(function(v) {
            return ChatdPersist.encrypt(v);
        });

        self.db.keys.where("chatId_userId_keyId").anyOf(encKeys).toArray()
            .then(
                function() {
                    if (typeof arguments[0] === 'undefined') {
                        promise.reject(arguments[0]);
                    }
                    else {
                        promise.resolve(self._decryptResultsArray('keys', arguments[0]));
                    }
                },
                function() {
                    promise.reject(arguments[0]);
                }
            );
        return promise;
    };

    /**
     * Add a key to the db.
     * Warning: no check if this key exists first would be done in this method. If thats needed, see `.persistKey`.
     *
     * @param chatId {String}
     * @param keyId {String}
     * @param userId {String}
     * @param key {String}
     * @returns {MegaPromise}
     */
    ChatdPersist.prototype.addKey = function(chatId, keyId, userId, key) {
        var self = this;

        return self._encryptedAdd(
            'keys',
            {
                'chatId_userId_keyId': chatId + "_" + userId + "_" + keyId,
                'chatId': chatId,
                'userId': userId,
                'key': key
            }
        );
    };

    /**
     * Persist a key to the db. E.g. do a check if it does exists first and then add it.
     *
     * @param chatId {String}
     * @param keyId {String}
     * @param userId {String}
     * @param key {String}
     * @returns {MegaPromise}
     */
    ChatdPersist.prototype.persistKey = function(chatId, keyId, userId, key) {
        var self = this;
        var promise = new MegaPromise();

        if (!ChatdPersist.isMasterTab()) {
            // don't do anything if this is not the master tab!
            return;
        }

        self.getKey(chatId, userId, keyId)
            .done(function(found) {
                if (found && found.userId !== userId) {
                    self.logger.error("Key: ", chatId, keyId, "already exists, but its assigned to different user:",
                        userId, "!=", found.userId, "Halting.");
                }
                else {
                    self.logger.debug("Key: ", chatId, keyId, "already exists. Ignoring.");
                }
                promise.reject();
            })
            .fail(function() {
                promise.linkDoneAndFailTo(
                    self.addKey(chatId, keyId, userId, key)
                );
            });
        return promise;
    };


    /**
     * Set a pointer (pointer is a key/value-like store for chatdPersist). Currently not used.
     * If a pointer for that chatId and pointerName already exists, it's value would be overwritten.
     *
     * @param chatId {String}
     * @param pointerName {String}
     * @param pointerValue {String}
     * @returns {MegaPromise}
     */
    ChatdPersist.prototype.setPointer = function(chatId, pointerName, pointerValue) {
        var self = this;
        var promise = new MegaPromise();
        if (self._pointersCache) {
            if (self._pointersCache[chatId + "_" + pointerName] === pointerValue) {
                promise.reject();
                return promise;
            }
            self._pointersCache[chatId + "_" + pointerName] = pointerValue;
        }
        if (!ChatdPersist.isMasterTab()) {
            // don't do anything if this is not the master tab!
            promise.resolve();
            return promise;
        }

        self.db['ptrs'].put({
            'chatId_pointer': ChatdPersist.encrypt(chatId + "_" + pointerName),
            'value': ChatdPersist.encrypt(pointerValue)
        })
            .then(
                function() {
                    promise.resolve(arguments[0]);
                },
                function() {
                    promise.reject(arguments[0]);
                }
            );

        return promise;
    };

    /**
     * Get a pointer's value.
     *
     * @param chatId {String}
     * @param pointerName {String}
     * @param [defaultValue] {*} What to return if that pointer is not found?
     * @returns {MegaPromise}
     */
    ChatdPersist.prototype.getPointer = function(chatId, pointerName, defaultValue) {
        var self = this;
        var promise = new MegaPromise();

        if (self._pointersCache && self._pointersCache[chatId + "_" + pointerName]) {
            promise.resolve(self._pointersCache[chatId + "_" + pointerName]);
            return promise;
        }
        self._encryptedGet('ptrs', chatId + "_" + pointerName)
            .then(
                function(result) {
                    promise.resolve(result.value);
                },
                function() {
                    if (typeof arguments[0] === 'undefined' && defaultValue) {
                        promise.resolve(defaultValue);
                    }
                    else {
                        promise.reject(arguments[0]);
                    }
                }
            );

        return promise;
    };


    /**
     * Helper, dynamically generated methods for querying messages by MessageId and OrderValue.
     */
    [
        ['MessageId', 'msgId'],
        ['OrderValue', 'orderValue'],
    ].forEach(function(meta) {
        ChatdPersist.prototype["getMessageBy" + meta[0]] = function (chatId, val) {
            var self = this;
            var promise = new MegaPromise();
            var whereObj = {};

            if (
                ChatdPersist.DONT_ENCRYPT["msgs"].indexOf(meta[1]) === -1 &&
                ChatdPersist.DONT_ENCRYPT["msgs"].indexOf("[chatId+" + meta[1] + "]") === -1
            ) {
                val = ChatdPersist.encrypt(val);
            }

            whereObj["[chatId+" + meta[1] + "]"] = [ChatdPersist.encrypt(chatId), val];

            self._encryptedWhere('msgs', whereObj)
                .then(
                    function () {
                        if (typeof arguments[0] === 'undefined') {
                            promise.reject(arguments[0]);
                        }
                        else {
                            promise.resolve(arguments[0]);
                        }
                    },
                    function () {
                        promise.reject(arguments[0]);
                    }
                );
            return promise;
        };
    });

    /**
     * @name ChatdPersist#getMessageByMessageId
     * @function
     * @memberof ChatdPersist
     * @description Retrieves a message by Message id
     * @param {String} chatId - The chat id
     * @param {String} msgId - The message id
     */

    /**
     * @name ChatdPersist#getMessageByOrderValue
     * @function
     * @memberof ChatdPersist
     * @description Retrieves a message by orderValue (eg. the internal ordering value from chatd.js)
     * @param {String} chatId - The chat id
     * @param {String} orderValue - The orderValue
     */


    /**
     * Add a message directly to the db.
     * Warning: This method would not check if that method, keys or anything already exists in our db.
     *
     * @param chatId {String}
     * @param msgId {String}
     * @param userId {String}
     * @param orderValue {Number}
     * @param keyId {Number}
     * @param msgObject {String} JSON version of the Message instance
     * @returns {MegaPromise}
     */
    ChatdPersist.prototype.addMessage = function(
        chatId, msgId, userId, orderValue, keyId, msgObject
    ) {
        var self = this;

        if (!msgObject || !msgObject.toPersistableObject) {
            return MegaPromise.resolve();
        }

        return self._encryptedAdd(
            'msgs',
            {
                'chatId': chatId,
                'msgId': msgId,
                'userId': userId,
                'orderValue': orderValue,
                'keyId': keyId,
                'msgObject': msgObject.toPersistableObject()
            }
        );
    };

    /**
     * Verify keys, if this is a master tab, if message already exists and then add this as a message to the db.
     * E.g. like .addMessage but with all kind of safety checks first.
     *
     * @param chatId {String}
     * @param msgObject {String} JSON version of the actual Message instance
     * @param isEdit {boolean} pass true if this is a message edit.
     * @returns {MegaPromise}
     */
    ChatdPersist.prototype.persistMessage = function(
        chatId, msgObject, isEdit
    ) {
        var self = this;

        if (!ChatdPersist.isMasterTab()) {
            // don't do anything if this is not the master tab!
            return;
        }

        var msgId = msgObject.messageId;
        var userId = msgObject.userId;
        var orderValue = msgObject.orderValue;
        var keyId = msgObject.keyid;

        if (keyId === true || ((keyId & 0xffff0000) >>> 0) === (0xffff0000 >>> 0)) {
            self.logger.critical(".persistMessage, received a temp keyId");
            return;
        }

        var args = arguments;
        var promise = new MegaPromise();

        self.getMessageByMessageId(chatId, msgId)
            .done(function(found) {
                assert(found.length <= 1, 'Found duplicate msgs (by msgid) in chatdPersist index.');

                found = found && found.length === 1 ? found[0] : false;

                if (
                    keyId !== 0 &&
                    base64urlencode(userId) !== "gTxFhlOd_LQ" &&
                    found &&
                    found.userId !== userId
                ) {
                    self.logger.error("Message: ", chatId, msgId, "already exists, but its assigned to different " +
                        "user:", userId, "!=", found.userId, "Halting.");
                }
                else if (!isEdit) {
                    self.logger.debug("Message: ", chatId, msgId, "already exists. Its ok, ignoring.");
                    promise.reject();
                    return;
                }
                else {
                    // this is an edit .persistMessage
                    self.db.msgs.delete(found.id)
                        .then(function() {
                            promise.linkDoneAndFailTo(
                                self.persistMessage.apply(self, args)
                            );
                        });
                }

            })
            .fail(function(e) {
                if (e instanceof Dexie.DexieError) {
                    self.logger.error("Found DexieError: ", e);
                    promise.reject();
                }
                else {
                    promise.linkDoneAndFailTo(
                        self.addMessage(chatId, msgId, userId, orderValue, keyId, msgObject)
                    );
                }
            });
        return promise;
    };

    /**
     * Delete a persisted message by id or key
     *
     * @param chatId {String}
     * @param msgIdOrObj {String|Object} ID or msgObject
     * @returns {MegaPromise}
     */
    ChatdPersist.prototype.unpersistMessage = function(
        chatId, msgIdOrObj
    ) {
        var self = this;

        if (!ChatdPersist.isMasterTab()) {
            // don't do anything if this is not the master tab!
            return;
        }

        var msgId = typeof msgIdOrObj === "object" ? msgIdOrObj.messageId : msgIdOrObj;

        var promise = new MegaPromise();

        self.getMessageByMessageId(chatId, msgId)
            .done(function(r) {
                self.db.msgs.delete(r.id)
                    .then(
                        function() {
                            promise.resolve();
                        },
                        function() {
                            promise.reject();
                        });

            })
            .fail(function() {
                promise.reject();
            });

        return promise;
    };


    /**
     * Verify keys, if this is a master tab, if message already exists and then add this as a message to the db.
     * E.g. like .addMessage but with all kind of safety checks first.
     *
     * @param action {String} "push", "replace" or "remove"
     * @param chatId {String}
     * @param args {Array} Array of arguments for calling .persistMessage/unpersistMessage
     * @returns {MegaPromise|undefined}
     */
    ChatdPersist.prototype.persistMessageBatched = function(
        action, chatId, args
    ) {
        var self = this;

        if (!ChatdPersist.isMasterTab()) {
            // don't do anything if this is not the master tab!
            return;
        }

        var msgObject = action === "replace" ? args[1] : args[0];
        var isEdit = args[1];

        if (
            msgObject.keyid === true ||
            msgObject.keyid === "true" ||
            ((msgObject.keyid & 0xffff0000) >>> 0) === (0xffff0000 >>> 0)
        ) {
            // was this temp key confirmed? and messageId.length === 11 (e.g. not a temp msg id)
            if (msgObject.messageId.length === 11) {
                var foundKeyId = self._tempKeyIdsMapping[chatId + "_" + msgObject.keyid];
                if (foundKeyId >= 0) {
                    msgObject.keyid = foundKeyId;
                }
                else {
                    // skip temp messages if temp -> confirmed keyid is not found.
                    return;
                }
            }
            else {
                // skip temp messages
                return;
            }
        }

        if (!self._msgActionsQueuePerChat[chatId]) {
            self._msgActionsQueuePerChat[chatId] = {
                'actions': [],
                'timer': null,
                'promise': new MegaPromise()
            };
        }

        if (self._msgActionsQueuePerChat[chatId].timer) {
            clearTimeout(self._msgActionsQueuePerChat[chatId]);
        }

        self._msgActionsQueuePerChat[chatId].timer = setTimeout(function() {
            self._flushMessageActionsQueue(chatId);
        }, 350);

        self._msgActionsQueuePerChat[chatId].actions.push([action, arguments[2]]);

        return self._msgActionsQueuePerChat[chatId].promise;
    };

    /**
     * Internal helper that flushes the "message actions" queues.
     *
     * @param chatId
     * @private
     */
    ChatdPersist.prototype._flushMessageActionsQueue = function(chatId) {
        var self = this;
        var queue = self._msgActionsQueuePerChat[chatId];

        if (!queue) {
            // already flushed/empty?
            return;
        }

        if (!ChatdPersist.isMasterTab()) {
            delete self._msgActionsQueuePerChat[chatId];
            // don't do anything if this is not the master tab!
            return;
        }
        if (self._queueTransactionPerChat[chatId]) {
            self._queueTransactionPerChat[chatId].always(function() {
                self._flushMessageActionsQueue(chatId);
            });
            return;
        }

        delete self._msgActionsQueuePerChat[chatId];
        self.db.transaction('rw', self.db.msgs, function(msgs, trans) {
                var currentActionIndex = 0;
                var next = function() {
                    var i = currentActionIndex++;
                    var queueEntry = queue.actions[i];
                    if (!queueEntry) {
                        return;
                    }

                    if (trans.active !== true) {
                        self.logger.error('transaction got inactive. this should never happen.');
                        return;
                    }

                    if (queueEntry[0] === 'push') {
                        self.persistMessage.apply(self, [chatId].concat(queueEntry[1])).always(next);
                    }
                    else if (queueEntry[0] === 'replace') {
                        self.persistMessage.apply(self, [chatId].concat(queueEntry[1][1]).concat([true]))
                            .always(next);
                    }
                    else if (queueEntry[0] === 'remove') {
                        if (queueEntry[1][1] !== true) {
                            self.unpersistMessage.apply(self, [chatId].concat(queueEntry[1]))
                                .always(next);
                        }
                        // else, its a "soft remove" (e.g. don't persist!)
                        else {
                            next();
                        }
                    }

                    else {
                        self.logger.error("Unknown queue type entry found in queue: ", chatId, queueEntry);
                        next();
                    }
                };

                next();
            })
            .then(function() {
                self.logger.debug(
                    "Transaction commited for chat: ", chatId,
                    ". Total of: ", (
                        queue && queue.actions ? queue.actions.length : '?'
                    ), 'items'
                );
                queue = null;
            })
            .catch(function (error) {
                // Log or display the error
                self.logger.error('transaction error', error.stack || error);
                self.onDbCrashCritical();
            });



    };

    /**
     * Internal Helper method to query messages from the db.
     *
     * @param startFromOrderValue {Number} The starting (e.g. highest) orderValue number from which to go back when
     * paging
     * @param limit {Number}
     * @param chatId {String}
     * @returns {*}
     * @private
     */
    ChatdPersist.prototype._queryMessages = function(startFromOrderValue, limit, chatId) {
        assert(chatId, 'missing chatId, when calling _paginateMessages. Halting.');
        var self = this;

        limit = limit || 32;

        var encChatId = ChatdPersist.encrypt(chatId);

        var ordValueMin = -Infinity;
        var ordValueMax = Infinity;

        if (typeof startFromOrderValue !== 'undefined' && startFromOrderValue !== 0) {
            ordValueMax = startFromOrderValue;
            // instead of limiting this by start - limit, we allow the buffer
            // to be broken (because...IndexedDB...), so messages would still be retrievable
            // this basically, ensure that the max of `limit` number of messages would be returned
            // if such are available in the db, no matter if their orderValues are in order/sequence.
            ordValueMin = -Infinity;
        }

        var q = self.db.msgs
            .where('[chatId+orderValue]')
            .between([encChatId, ordValueMin], [encChatId, ordValueMax])
            .reverse()
            .limit(limit);

        return q;
    };

    /**
     * Internal helper method for paginating messages
     * @param startFromOrderValue {Number} The starting (e.g. highest) orderValue number from which to go back when
     * paging
     * @param pageSize {Number}
     * @param chatId {String}
     * @returns {MegaPromise}
     * @private
     */
    ChatdPersist.prototype._paginateMessages = function(startFromOrderValue, pageSize, chatId) {
        assert(chatId, 'missing chatId, when calling _paginateMessages. Halting.');

        var self = this;

        var promise = new MegaPromise();

        var messages;
        var keys = {};
        var keysThatRequireLoading = {};
        var q = self._queryMessages(startFromOrderValue, pageSize, chatId)
            .toArray()
            .then(
                function(results) {
                    messages = self._decryptResultsArray('msgs', results);
                    results = null;
                    messages.forEach(function(msg) {
                        if (msg.keyid === 0) {
                            // truncate.
                            return;
                        }

                        // 1 key may be used for multiple msgs, check this and don't trigger 1 key retrieval per
                        // message... (optimisation)
                        var keyHash = chatId + "_" + base64urlencode(msg.userId) + "_" + msg.keyId;
                        if (!keysThatRequireLoading[keyHash]) {
                            keysThatRequireLoading[keyHash] = 1;
                        }
                    });

                    self.getKeys(Object.keys(keysThatRequireLoading))
                        .done(function (results) {
                            results.forEach(function(v) {
                                var keyId = v.chatId_userId_keyId.split(v.userId + "_");
                                keyId = keyId[1];
                                keys[v.chatId_userId_keyId] = [keyId, v.key, v.userId, v.chatId_userId_keyId];
                            });
                        })
                        .fail(function () {
                            self.logger.warn("Failed to retrieve key for msgId: ", msg.msgId, msg.keyId);
                        })
                        .always(function() {
                            promise.resolve([messages, keys]);
                        });
                },
                function() {
                    self.logger.error("_paginateMessages fail:", arguments);
                    promise.reject(arguments[0]);
                }
            );

        return promise;
    };

    /**
     * The public method/way of retrieving chat history from chatdPersist.
     *
     * @param chatId {String}
     * @param len {Number}
     * @returns {MegaPromise}
     */
    ChatdPersist.prototype.retrieveChatHistory = function(chatId, len) {
        var self = this;

        var waitingPromises = [];

        var lownum = 0;
        var highnum = self.chatd.chatIdMessages[base64urldecode(chatId)].highnum;


        var chatRoom = self.chatd.megaChat.getChatById(chatId);
        if (chatRoom && chatRoom.messagesBuff.messages.length > 0) {
            var lowHigh = chatRoom.messagesBuff.getLowHighIds(true);
            lownum = lowHigh ? lowHigh[0] : false;
            highnum = lowHigh ? lowHigh[1] : false;
        }

        var lastRetrOrdValue = len === Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL ? 0 : lownum;

        lastRetrOrdValue = lastRetrOrdValue && parseInt(lastRetrOrdValue, 10);

        if (!lastRetrOrdValue) {
            lastRetrOrdValue = 0;
        }


        var messages;
        var keys;

        waitingPromises.push(
            self._paginateMessages(lastRetrOrdValue, parseInt(len, 10), chatId)
                .done(function(response) {
                    messages = response[0];
                    messages.forEach(function(msg) {
                        lownum = msg.orderValue > lownum + 1 ? msg.orderValue - 1 : lownum;
                        highnum = msg.orderValue > highnum ? msg.orderValue : highnum;
                    });

                    keys = response[1];
                })
        );

        var lastSeen = false;

        if (len === Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL) {
            // is initial...retrieve last seen, last delivered
            waitingPromises.push(
                self.getPointer(chatId, "ls")
                    .done(function(r) {
                        lastSeen = r;
                    })
            );
        }

        var masterPromise = new MegaPromise();

        MegaPromise.allDone(waitingPromises).done(function() {
            if (messages && messages.length > 0) {
                masterPromise.resolve([
                    messages,
                    keys,
                    lownum,
                    highnum,
                    lastSeen
                ]);
            }
            else {
                // no messages persisted?
                masterPromise.reject();
            }
        });


        return masterPromise;
    };

    /**
     * Calculates the lowest and highest ids for a chatId from our local db.
     *
     * @param chatId {String}
     * @returns {MegaPromise}
     */
    ChatdPersist.prototype.getLowHighIds = function(chatId) {
        var self = this;

        var promise = new MegaPromise();

        var encChatId = ChatdPersist.encrypt(chatId);

        var low = false;
        var high = false;

        var lowNum;
        var highNum;

        var p1 = MegaPromise.asMegaPromiseProxy(
            self.db.msgs
                .where('[chatId+orderValue]')
                .between([encChatId, -Infinity], [encChatId, Infinity]).last()
        ).then(
                function(r) {
                    if (r) {
                        high = r.msgId;
                        highNum = r.orderValue;
                    }
                    else {
                        promise.reject();
                    }
                },
                function() {
                    promise.reject();
                });

        var p2 = MegaPromise.asMegaPromiseProxy(
            self.db.msgs
                .where('[chatId+orderValue]')
                .between([encChatId, -Infinity], [encChatId, Infinity]).first()
        ).then(
                function(r) {
                    if (r) {
                        low = r.msgId;
                        lowNum = r.orderValue;
                    }
                    else {
                        promise.reject();
                    }
                },
                function() {
                    promise.reject();
                });

        MegaPromise.allDone([
            p1,
            p2,
        ])
            .done(function() {
                promise.resolve([low, high, lowNum, highNum]);
            });

        return promise;
    };

    /**
     * Returns a promise, which would get resolved if we have local chat history for this chat OR rejected if we don't
     *
     * @param chatId {String}
     * @returns {MegaPromise}
     */
    ChatdPersist.prototype.haveChatHistory = function(chatId) {
        var self = this;
        var promise = new MegaPromise();


        self.db['msgs'].where('chatId').equals(ChatdPersist.encrypt(chatId)).count().then(
            function(count) {
                if (count > 0) {
                    promise.resolve();
                }
                else {
                    promise.reject();
                }
            },
            function() {
                promise.reject();
            }
        );

        return promise;
    };

    /**
     * Add a `type` of operation with `data` to be executed with `.persistQueue` when called.
     *
     * @param chatId {String}
     * @param type {Number} see `ChatdPersist.QUEUE_TYPE`
     * @param data {Array} array of the arguments for later on calling .persistKey/Message
     */
    ChatdPersist.prototype.addToQueue = function (chatId, type, data) {
        var self = this;
        if (!self._queuePerChat[chatId]) {
            self._queuePerChat[chatId] = [];
        }
        self._queuePerChat[chatId].push([type, data]);
    };

    /**
     * Flush and persist the queue for `chatId` (in a transaction)
     *
     * @param chatId {String}
     */
    ChatdPersist.prototype.persistQueue = function (chatId) {
        var self = this;
        if (!self._queuePerChat[chatId]) {
            return;
        }
        if (!ChatdPersist.isMasterTab()) {
            delete self._queuePerChat[chatId];
            // don't do anything if this is not the master tab!
            return;
        }
        if (self._queueTransactionPerChat[chatId]) {
            self._queueTransactionPerChat[chatId].always(function() {
                self.persistQueue(chatId);
            });
            return;
        }

        var promise = self._queueTransactionPerChat[chatId] = new MegaPromise();
        self._queueTransactionPerChat[chatId].always(function() {
            delete self._queueTransactionPerChat[chatId];
        });

        self.db.transaction('rw', self.db.msgs, self.db.keys, function(msgs, keys, trans) {
                self._queuePerChat[chatId].forEach(function(queueEntry) {
                    if (trans.active !== true) {
                        self.logger.error('transaction got inactive. this should never happen.');
                        delete self._queuePerChat[chatId];
                    }

                    if (queueEntry[0] === ChatdPersist.QUEUE_TYPE.KEY) {
                        self.persistKey.apply(self, [chatId].concat(queueEntry[1]));
                    }
                    else {
                        self.logger.error("Unknown queue type entry found in queue: ", chatId, queueEntry);
                    }
                });
            })
            .then(function() {
                self.logger.debug(
                    "Transaction commited for chat: ", chatId,
                    ". Total of: ",
                    self._queuePerChat[chatId] ? self._queuePerChat[chatId].length : '(unknown)', 'items'
                );
                delete self._queuePerChat[chatId];
                promise.resolve();
            })
            .catch(function (error) {
                // Log or display the error
                self.logger.error('transaction error', error.stack || error);
                self.onDbCrashCritical();
                promise.reject();
            });

        return promise;
    };

    /**
     * Persist/do a truncate for a chat `chatId` with the orderValue of the message to start the truncate from is
     * `firstNumToStartFrom`
     * @param chatId {String}
     * @param firstNumToStartFrom {Number}
     * @returns {MegaPromise}
     */
    ChatdPersist.prototype.persistTruncate = function(chatId, firstNumToStartFrom) {
        var self = this;
        if (!ChatdPersist.isMasterTab()) {
            // don't do anything if this is not the master tab!
            return MegaPromise.reject();
        }

        var promise = new MegaPromise();
        var stats = {'delkeys': 0, 'delmsgs': 0, 'failmsgs': 0, 'failkeys': 0};
        self.db.transaction('rw', self.db.msgs, self.db.keys, function(msgs, keys, trans) {
                // TODO: This code would cause issues, because clients may re-use keys, from older messages,
                // which this code would delete, since they were before the truncate msgnum
                // self._paginateMessages(firstNumToStartFrom, Infinity, chatId)
                //     .done(function(response) {
                //         var keys = response[1];
                //         delete response;
                //         Object.keys(keys).forEach(function(k) {
                //             var keyMeta = keys[k];
                //             self.logger.debug('deleting key: ', keyMeta[3]);
                //             self.db.keys.delete(ChatdPersist.encrypt(keyMeta[3]))
                //                 .then(function() {
                //                         stats['delkeys']++;
                //                     },
                //                     function() {
                //                         stats['failkeys']++;
                //                     });
                //         });
                //     });

                var delpromise = self._queryMessages(firstNumToStartFrom, Infinity, chatId)
                    .eachPrimaryKey(function(pk) {
                        self.db.msgs.delete(pk)
                            .then(
                                function() {
                                    stats['delmsgs']++;
                                },
                                function() {
                                    stats['failmsgs']++;
                                }
                            );

                    });

                return delpromise;
            })
            .then(function() {
                self.logger.debug(
                    "Truncate Transaction commited (" + chatId + "). Stats: " + JSON.stringify(stats, null, 4, '\t')
                );
                promise.resolve();
            })
            .catch(function (error) {
                // Log or display the error
                self.logger.error('transaction error', error.stack || error);
                self.onDbCrashCritical();
                promise.reject();
            });


        promise.always(function() {
            var chatRoom = self.chatd.megaChat.getChatById(chatId);

            if (
                chatRoom &&
                chatRoom.messagesBuff.isDecrypting &&
                chatRoom.messagesBuff.isDecrypting.state() === 'pending'
            ) {
                chatRoom.messagesBuff.isDecrypting.done(function() {
                    Soon(function() {
                        self._cleanupMessagesAfterTruncate(chatId, firstNumToStartFrom);
                    });
                });
            }
            else {
                self._cleanupMessagesAfterTruncate(chatId, firstNumToStartFrom);
            }
        });

        return promise;
    };

    ChatdPersist.prototype._cleanupMessagesAfterTruncate = function(chatId, firstNumToStartFrom) {
        var self = this;
        var chatRoom = self.chatd.megaChat.getChatById(chatId);
        var editedMessage = chatRoom.messagesBuff.getByOrderValue(firstNumToStartFrom);
        if (editedMessage) {
            editedMessage.dialogType = 'truncated';
            editedMessage.textContents = "";

            chatRoom.megaChat.plugins.chatdIntegration._parseMessage(
                chatRoom,
                editedMessage
            );

            chatRoom.messagesBuff.messages.replace(editedMessage.messageId, editedMessage);


            var messageKeys = chatRoom.messagesBuff.messages.keys();

            for (var i = 0; i < messageKeys.length; i++) {
                var v = chatRoom.messagesBuff.messages[messageKeys[i]];

                if (v.orderValue < firstNumToStartFrom) {
                    // remove the messages with orderValue < eventData.id from message buffer.
                    chatRoom.messagesBuff.messages.removeByKey(v.messageId);
                }
            }
        }
        else {
            self.logger.error("Tried to truncate, but can't find msgnum: ", firstNumToStartFrom);
        }
    };

    ChatdPersist.prototype.clearChatHistoryForChat = function(chatId) {
        var self = this;
        if (!ChatdPersist.isMasterTab()) {
            // don't do anything if this is not the master tab!
            return MegaPromise.reject();
        }

        if (self._queueTransactionPerChat[chatId]) {
            self._queueTransactionPerChat[chatId].always(function() {
                self.clearChatHistoryForChat(chatId);
            });

            return;
        }

        if (self._msgActionsQueuePerChat[chatId]) {
            if (self._msgActionsQueuePerChat[chatId].timer) {
                clearTimeout(self._msgActionsQueuePerChat[chatId].timer);
            }
            delete self._msgActionsQueuePerChat[chatId];
        }
        if (self._queuePerChat[chatId]) {
            // ensure the queue is ready.
            delete self._queuePerChat[chatId];
        }

        var promise = new MegaPromise();
        self.db.transaction('rw', self.db.msgs, self.db.keys, function(msgs, keys, trans) {
                var delpromise = self._queryMessages(0, Infinity, chatId)
                    .eachPrimaryKey(function(pk) {
                        self.db.msgs.delete(pk);
                    });

                return delpromise;
            })
            .then(function() {
                self.logger.debug("clearChatHistoryForChat Transaction commited.");
                promise.resolve();
            })
            .catch(function (error) {
                // Log or display the error
                self.logger.error('clearChatHistoryForChat transaction error', error.stack || error);
                self.onDbCrashCritical();
                promise.reject();
            });

        promise.always(function() {
            var chatRoom = self.chatd.megaChat.getChatById(chatId);
            var messageKeys = chatRoom.messagesBuff.messages.keys();

            for (var i = 0; i < messageKeys.length; i++) {
                var v = chatRoom.messagesBuff.messages[messageKeys[i]];
                chatRoom.messagesBuff.messages.removeByKey(v.messageId);
            }

            if (self._msgActionsQueuePerChat[chatId]) {
                if (self._msgActionsQueuePerChat[chatId].timer) {
                    clearTimeout(self._msgActionsQueuePerChat[chatId].timer);
                }
                // ensure the queue is ready.
                delete self._msgActionsQueuePerChat[chatId];
            }
        });

        return promise;
    };

    ChatdPersist.prototype.retrieveAndLoadKeysFor = function(chatId, userId, keyId) {
        var self = this;
        var promise = new MegaPromise();


        self.chatd.chatdPersist.getKey(
            chatId,
            userId,
            keyId
            )
            .done(function (key) {
                var keysArr = [{
                    userId: key.userId,
                    keyid: keyId,
                    keylen: key.key.length,
                    key: key.key
                }];

                self.chatd.trigger('onMessageKeysDone', {
                    chatId: chatId,
                    keys: keysArr,
                    chatdPersist: true
                });

                promise.resolve();
            })
            .fail(function (e) {
                if (d) {
                    console.error("Failed to retrieve key for msgmodify", [
                        chatId,
                        userId,
                        keyId
                    ]);
                }
                promise.reject();
            });

        return promise;
    };

    ChatdPersist.prototype.modifyPersistedMessage = function(chatId, messageInfo) {
        var self = this;

        var chatRoom = self.chatd.megaChat.getChatById(chatId);

        self.getMessageByMessageId(chatId, messageInfo.messageId)
            .fail(function(e) {
                if (d) {
                    console.error(
                        "Failed to apply message update to msgId:", chatId, messageInfo.messageId, messageInfo
                    );
                }
            })
            .done(function(r) {
                var msg = r[0];
                if (!msg) {
                    if (d) {
                        console.error(
                            "Failed to apply message update to msgId:", chatId, messageInfo.messageId, messageInfo
                        );
                    }
                    return;
                }


                chatRoom.protocolHandler.decryptFrom(
                    messageInfo.message,
                    messageInfo.userId,
                    messageInfo.keyid,
                    false
                )
                    .fail(function(e) {
                        if (d) {
                            console.error(
                                "Failed to decrypt and apply message update to msgId:",
                                chatId,
                                messageInfo.messageId,
                                messageInfo
                            );
                        }
                    })
                    .done(function(decrypted) {
                        if (decrypted) {
                            var msgInstance =  new Message(
                                chatRoom,
                                self,
                                {
                                    'messageId': msg.msgId,
                                    'userId': msg.userId,
                                    'keyid': msg.keyId,
                                    'message': messageInfo.message,
                                    'delay': msg.msgObject.delay,
                                    'orderValue': msg.orderValue,
                                    'updated': messageInfo.updated,
                                    'sent': messageInfo.sent
                                }
                            );

                            self.chatd.megaChat.plugins.chatdIntegration._processDecryptedMessage(
                                chatRoom,
                                msgInstance,
                                decrypted
                            );

                            self.persistMessage(chatId, msgInstance, true);
                        }
                    });
            });
    };

    /**
     * Clear the internally stored data for all chats.
     *
     * @returns {MegaPromise}
     */
    ChatdPersist.prototype.clear = function() {
        var self = this;
        var promises = [];
        promises.push(MegaPromise.asMegaPromiseProxy(self.db.msgs.clear()));
        promises.push(MegaPromise.asMegaPromiseProxy(self.db.keys.clear()));
        promises.push(MegaPromise.asMegaPromiseProxy(self.db.ptrs.clear()));

        return MegaPromise.allDone(promises)
            .done(function() {
                if (localStorage.chatdPersistDebug) {
                    console.warn('ChatdPersist.clear finished.');
                }
            });
    };

    /**
     * Drop the current indexedDB
     *
     * @returns {MegaPromise}
     */
    ChatdPersist.prototype.drop = function() {
        var self = this;
        return MegaPromise.asMegaPromiseProxy(self.db.delete());
    };

    /**
     * Basically same as .drop, but can be called without ChatdPersist to be initialized (e.g. if its
     * disabled, because of IDB crash).
     *
     * @returns {MegaPromise}
     */
    ChatdPersist.forceDrop = function() {
        return MegaPromise.asMegaPromiseProxy(Dexie.delete("$ctdb_" + u_handle + "_" + "chatd_" + VERSION));
    };

    [
        "getKey",
        "getKeys",
        "addKey",
        "setPointer",
        "getPointer",
        "getMessageByMessageId",
        "getMessageByOrderValue",
        "addMessage",
        "retrieveChatHistory",
        "getLowHighIds",
        "haveChatHistory",
        "clear"
    ]
        .forEach(function(methodName) {
            var origFunc = ChatdPersist.prototype[methodName];
            if (is_karma) {
                ChatdPersist.prototype["_" + methodName] = origFunc;
            }

            ChatdPersist.prototype[methodName] = ChatdPersist._requiresDbReady(origFunc, methodName);
        });

    ChatdPersist.prototype.debugValidate = function() {
        megaChat.chats.forEach(function(chatRoom) {
            if (!chatRoom.chatId) {
                return;
            }
            megaChat.plugins.chatdIntegration.chatd.chatdPersist._paginateMessages(0, 99999, chatRoom.chatId)
                .done(function(r) {
                    var foundErrors = false;
                    var orderValues = {};
                    var prevOrderValue = false;
                    var prevMsg = false;
                    var msgs = r[0];
                    msgs.forEach(function(v) {
                        if (orderValues[v.orderValue]) {
                            foundErrors = foundErrors === false ? 1 : foundErrors + 1;
                            console.error(
                                "Found dup orderValue: ", v.msgId, v.orderValue, "already found as:",
                                orderValues[v.orderValue]
                            );
                        }
                        if (prevOrderValue !== false && v.orderValue + 1 !== prevOrderValue) {
                            foundErrors = foundErrors === false ? 1 : foundErrors + 1;
                            console.error(
                                "Consistency error in buffer: ", v.msgId, "expected orderValue of",
                                v.orderValue + 1,
                                "got",
                                v.orderValue,
                                "(this may be a false alarm in case of old messages or removed ones)"
                            );
                        }
                        if (prevMsg !== false && v.msgObject.delay > prevMsg.msgObject.delay) {
                            foundErrors = foundErrors === false ? 1 : foundErrors + 1;
                            console.error(
                                "Consistency error in buffer: ", v.msgId, "expected delay of",
                                prevMsg.msgObject.delay,
                                "<",
                                v.msgObject.delay
                            );
                        }
                        prevMsg = v;
                        prevOrderValue = v.orderValue;
                        orderValues[v.orderValue] = v.messageId;
                    });
                    if (foundErrors !== false) {
                        console.error("Found", foundErrors, "errors in", chatRoom.chatId);
                    }
                    else {
                        console.error(
                            "Validation success, everything is ok for chat", chatRoom.chatId, "checked",
                            msgs.length, "messages"
                        );
                    }
                });
        });
    };

    scope.ChatdPersist = ChatdPersist;
})(window);
