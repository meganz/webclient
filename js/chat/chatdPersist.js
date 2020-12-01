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

        self.logger = new MegaLogger("ChatdPersist");

        self.dbName = "chatd_" + VERSION;
        self.dbState = ChatdPersist.DB_STATE.NOT_READY;

        self._queuePerChat = {};
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

    ChatdPersist.encrypt = SharedLocalKVStorage.encrypt;
    ChatdPersist.decrypt = SharedLocalKVStorage.decrypt;
    ChatdPersist.DB_STATE = SharedLocalKVStorage.DB_STATE;
    ChatdPersist._requiresDbReady = SharedLocalKVStorage.Utils._requiresDbReady;

    /**
     * Returns true if this is the Master tab (e.g. if having multiple tabs)
     *
     * @returns {Boolean}
     */
    ChatdPersist.isMasterTab = function() {
        return !!mBroadcaster.crossTab.master;
    };

    /**
     * One-time setup code, used internally
     */
    ChatdPersist.prototype.init = function() {
        var self = this;

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

            var isFromHist = !!self._histRequestFlagsPerChat[data.chatId];

            data.keys.forEach(function(key) {
                if (isFromHist) {
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
                else {
                    self.chatd.chatdPersist.persistKey(data.chatId, key.keyid, key.userId, key.key).always(nop);
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
                    self.persistKey(chatId, keyId, u_handle, key).always(nop);
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
            self.setPointer(data.chatId, 'ls', data.messageId).always(nop);
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
            self.transaction(function() {
                self._encryptedWhere('keys', {'chatId': chatId})
                    .then(function(results) {
                        results.forEach(function(r) {
                            self.db.keys.delete(ChatdPersist.encrypt(r.chatId_userId_keyId));
                        });
                    })
                    .catch(dump);

                self._encryptedWhere('msgs', {'chatId': chatId})
                    .then(function(results) {
                        results.forEach(function(r) {
                            self.db.msgs.delete(r.id);
                        });
                    })
                    .catch(dump);

                // TODO: Pointers. They are not used at the moment.
            }).then(function() {
                self.logger.debug("onRoomDestroy transaction finished successfully.");
            }).catch(dump);
        });

    };

    ChatdPersist.prototype.transaction = promisify(function(resolve, reject, dispatcher) {
        if (!ChatdPersist.isMasterTab()) {
            // don't do anything if this is not the master tab!
            return reject(EACCESS);
        }
        var self = this;
        var args = ['rw'].concat(this.db.tables, dispatcher);

        this.db.transaction.apply(this.db, args)
            .then(resolve)
            .catch(function(ex) {
                self.logger.error('Transaction failed.', ex);
                self.onDbCrashCritical();
                reject(ex);
            });
    });

    ChatdPersist.prototype.deleteAllMessages = mutex('chatdpersist:mutex', function(resolve, reject, chatId) {
        var self = this;
        self._expungeMessageActionsQueue(chatId);

        self.transaction(function() {
            return self._encryptedWhere('msgs', {'chatId': chatId})
                .then(function(results) {
                    for (var i = results.length; i--;) {
                        self.db.msgs.delete(results[i].id);
                    }
                });
        }).always(resolve);
    });

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

    /**
     * Database connection.
     * @name db
     * @memberOf ChatdPersist.prototype
     */
    lazy(ChatdPersist.prototype, 'db', function() {
        return new MegaDexie('CHATD', this.dbName, 'ctdb_', true, {
            /* extra data fields, non indexed: msgObject */
            'msgs': "++id, chatId, msgId, userId, orderValue, &[chatId+msgId], [chatId+orderValue], keyId",
            'keys': "++chatId_userId_keyId, chatId, userId", /* extra data fields, non indexed: key */
            'ptrs': "++chatId_pointer" /* extra data fields, non indexed: value*/
        });
    });

    ChatdPersist.prototype._OpenDB = function() {
        // pre-cache pointers
        var self = this;
        self._pointersCache = {};

        return self.db.ptrs.toArray()
            .then(function(r) {
                for (var i = 0; i < r.length; ++i) {
                    self._pointersCache[ChatdPersist.decrypt(r[i].chatId_pointer)] = ChatdPersist.decrypt(r[i].value);
                }
                return r;
            });
    };


    ChatdPersist.prototype._destroy = function() {
        var self = this;
        self.chatd.off('onMessageKeysDone.chatdPersist');
        self.chatd.off('onMessagesKeyIdDone.chatdPersist');
        self.chatd.off('onMessageLastSeen.chatdPersist');
        self.chatd.off('onMessagesHistoryDone.chatdPersist');
        self.chatd.off('onMessagesHistoryRequest.chatdPersist');
        self.chatd.megaChat.off('onRoomDestroy.chatdPersist');
        delete self.chatd.chatdPersist;
    };

    ChatdPersist.prototype._reinitWithoutChardPersist = function() {
        // because we are not sure in what state the indexedDB crashed
        // we need to reinit and retrigger regular JOIN + HIST
        var self = this;
        var shards = self.chatd.shards;

        self.logger.warn('re-init without persistence.', shards);

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

    ChatdPersist.prototype._stopChatdPersist = function(drop) {
        var self = this;

        // already destroying/destroyed?
        if (!self.chatd.chatdPersist) {
            return;
        }

        self._destroy();
        self._reinitWithoutChardPersist();

        if (ChatdPersist.isMasterTab()) {
            if (drop) {
                self.drop().then(nop).catch(dump);
            }
            else if (self.hasOwnProperty('db')) {
                self.db.close();
            }
            self.dbState = ChatdPersist.DB_STATE.FAILED;
        }
    };

    ChatdPersist.prototype.onDbCrashCritical = SoonFc(function() {
        var self = this;

        // already destroying/destroyed?
        if (!self.chatd.chatdPersist) {
            return;
        }

        self._stopChatdPersist(true);
        self.logger.error('DB crashed, disabling chatdPersist (out of IDB space? broken indexedDB data?)');
    }, 500);


    /**
     * Internal method that does add `data` to a `table` (and handles encryption).
     *
     * @param table {String}
     * @param data {Object}
     * @returns {Promise}
     * @private
     */
    ChatdPersist.prototype._encryptedAdd = promisify(function(resolve, reject, table, data) {
        var self = this;
        var encryptedData = Object.assign({}, data);
        Object.keys(encryptedData).forEach(function(k) {
            if (ChatdPersist.DONT_ENCRYPT[table].indexOf(k) === -1) {
                encryptedData[k] = ChatdPersist.encrypt(encryptedData[k]);
            }
        });

        self.db[table][table === "msgs" ? "put" : "add"](encryptedData).then(resolve).catch(reject);
    });

    /**
     * Internal method that retrieve data by key (`keyName`) with value of `keyValue` from `table` (and handles
     * encryption).
     *
     * @param table {String}
     * @param keyValue {String}
     * @param [keyName] {String}
     * @returns {Promise}
     * @private
     */
    ChatdPersist.prototype._encryptedGet = promisify(function(resolve, reject, table, keyValue, keyName) {
        var self = this;
        var v = keyValue;
        if (ChatdPersist.DONT_ENCRYPT[table].indexOf(keyName) === -1) {
            v = ChatdPersist.encrypt(keyValue);
        }

        self.db[table].get(v)
            .then(function(result) {
                if (!result) {
                    return reject(result);
                }

                var decryptedData = Object.assign({}, result);
                // eslint-disable-next-line local-rules/misc-warnings
                Object.keys(decryptedData).forEach(function(k) {
                    if (ChatdPersist.DONT_ENCRYPT[table].indexOf(k) === -1) {
                        decryptedData[k] = ChatdPersist.decrypt(decryptedData[k]);
                    }
                });

                resolve(decryptedData);
            })
            .catch(reject);
    });

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
     * @returns {Promise}
     * @private
     */
    ChatdPersist.prototype._encryptedWhere = promisify(function(resolve, reject, table, whereObj) {
        var self = this;
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
                    reject(results);
                }
                else {
                    resolve(self._decryptResultsArray(table, results));
                }
            })
            .catch(reject);
    });


    /**
     * Retrieve key by chatId + userId + keyId
     *
     * @param chatId {String}
     * @param userId {String}
     * @param keyId {String}
     * @returns {Promise}
     */
    ChatdPersist.prototype.getKey = promisify(function(resolve, reject, chatId, userId, keyId) {
        var self = this;
        self._encryptedGet('keys', chatId + "_" + userId + "_" + keyId)
            .then(function(value) {
                if (value === undefined) {
                    reject(value);
                }
                else {
                    resolve(value);
                }
            })
            .catch(reject);
    });

    /**
     * Retrieve multiple keys by running on 1 query
     *
     * @param keys {Array} array of hashes (chatId_userId_keyId)
     * @returns {Promise}
     */
    ChatdPersist.prototype.getKeys = promisify(function(resolve, reject, keys) {
        var self = this;

        if (keys.length === 0) {
            return resolve([]);
        }

        var encKeys = keys.map(function(v) {
            return ChatdPersist.encrypt(v);
        });

        self.db.keys.where("chatId_userId_keyId").anyOf(encKeys).toArray()
            .then(function(value) {
                if (value === undefined) {
                    reject(value);
                }
                else {
                    resolve(self._decryptResultsArray('keys', value));
                }
            })
            .catch(reject);
    });

    /**
     * Add a key to the db.
     * Warning: no check if this key exists first would be done in this method. If thats needed, see `.persistKey`.
     *
     * @param chatId {String}
     * @param keyId {String}
     * @param userId {String}
     * @param key {String}
     * @returns {Promise}
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
     * @returns {Promise}
     */
    ChatdPersist.prototype.persistKey = promisify(function(resolve, reject, chatId, keyId, userId, key) {
        var self = this;

        if (!ChatdPersist.isMasterTab()) {
            // don't do anything if this is not the master tab!
            return reject(EACCESS);
        }

        self.getKey(chatId, userId, keyId)
            .then(function(found) {
                if (found && found.userId !== userId) {
                    self.logger.error("Key: ", chatId, keyId, "already exists, but its assigned to different user:",
                        userId, "!=", found.userId, "Halting.");
                }
                else {
                    self.logger.debug("Key: ", chatId, keyId, "already exists. Ignoring.");
                }
                queueMicrotask(reject);
            })
            .catch(function() {
                self.addKey(chatId, keyId, userId, key).then(resolve).catch(reject);
            });
    });


    /**
     * Set a pointer (pointer is a key/value-like store for chatdPersist). Currently not used.
     * If a pointer for that chatId and pointerName already exists, it's value would be overwritten.
     *
     * @param chatId {String}
     * @param pointerName {String}
     * @param pointerValue {String}
     * @returns {Promise}
     */
    ChatdPersist.prototype.setPointer = promisify(function(resolve, reject, chatId, pointerName, pointerValue) {
        var self = this;
        if (self._pointersCache) {
            if (self._pointersCache[chatId + "_" + pointerName] === pointerValue) {
                return queueMicrotask(reject);
            }
            self._pointersCache[chatId + "_" + pointerName] = pointerValue;
        }
        if (!ChatdPersist.isMasterTab()) {
            // don't do anything if this is not the master tab!
            return resolve();
        }

        self.db['ptrs'].put({
            'chatId_pointer': ChatdPersist.encrypt(chatId + "_" + pointerName),
            'value': ChatdPersist.encrypt(pointerValue)
        }).then(resolve).catch(reject);
    });

    /**
     * Get a pointer's value.
     *
     * @param chatId {String}
     * @param pointerName {String}
     * @param [defaultValue] {*} What to return if that pointer is not found?
     * @returns {Promise}
     */
    ChatdPersist.prototype.getPointer = promisify(function(resolve, reject, chatId, pointerName, defaultValue) {
        var self = this;

        if (self._pointersCache && self._pointersCache[chatId + "_" + pointerName]) {
            return resolve(self._pointersCache[chatId + "_" + pointerName]);
        }

        self._encryptedGet('ptrs', chatId + "_" + pointerName)
            .then(function(result) {
                resolve(result.value);
            })
            .catch(function(ex) {
                if (ex === undefined && defaultValue) {
                    return resolve(defaultValue);
                }

                reject(ex);
            });
    });


    /**
     * Helper, dynamically generated methods for querying messages by MessageId and OrderValue.
     */
    [
        ['MessageId', 'msgId'],
        ['OrderValue', 'orderValue'],
    ].forEach(function(meta) {
        ChatdPersist.prototype["getMessageBy" + meta[0]] = promisify(function(resolve, reject, chatId, val) {
            var self = this;
            var whereObj = {};

            if (
                ChatdPersist.DONT_ENCRYPT["msgs"].indexOf(meta[1]) === -1 &&
                ChatdPersist.DONT_ENCRYPT["msgs"].indexOf("[chatId+" + meta[1] + "]") === -1
            ) {
                val = ChatdPersist.encrypt(val);
            }

            whereObj["[chatId+" + meta[1] + "]"] = [ChatdPersist.encrypt(chatId), val];

            self._encryptedWhere('msgs', whereObj)
                .then(function(value) {
                    if (value === undefined) {
                        return reject(value);
                    }
                    resolve(value);
                })
                .catch(reject);
        });
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
     * @returns {Promise}
     */
    ChatdPersist.prototype.addMessage = function(
        chatId, msgId, userId, orderValue, keyId, msgObject
    ) {
        var self = this;

        if (!(msgObject instanceof Message)) {
            return Promise.resolve();
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
     * @returns {Promise}
     */
    ChatdPersist.prototype.persistMessage = promisify(function(resolve, reject, chatId, msgObject, isEdit) {
        var self = this;

        if (!ChatdPersist.isMasterTab()) {
            // don't do anything if this is not the master tab!
            return reject(EACCESS);
        }

        var msgId = msgObject.messageId;
        var userId = msgObject.userId;
        var orderValue = msgObject.orderValue;
        var keyId = msgObject.keyid;

        if (keyId === true || ((keyId & 0xffff0000) >>> 0) === (0xffff0000 >>> 0)) {
            self.logger.critical(".persistMessage, received a temp keyId");
            return reject(EINTERNAL);
        }

        var args = toArray.apply(null, arguments).slice(2);

        self.getMessageByMessageId(chatId, msgId)
            .then(function(found) {
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
                    reject();
                }
                else if (!isEdit) {
                    self.logger.debug("Message: ", chatId, msgId, "already exists. Its ok, ignoring.");
                    reject();
                }
                else {
                    // this is an edit .persistMessage
                    self.db.msgs.delete(found.id)
                        .then(function() {
                            return self.persistMessage.apply(self, args);
                        })
                        .then(resolve)
                        .catch(reject);
                }
            })
            .catch(function(ex) {
                if (ex instanceof Dexie.DexieError) {
                    self.logger.error("Found DexieError: ", ex);
                    reject();
                }
                else {
                    self.addMessage(chatId, msgId, userId, orderValue, keyId, msgObject).then(resolve).catch(reject);
                }
            });
    });

    /**
     * Delete a persisted message by id or key
     *
     * @param chatId {String}
     * @param msgIdOrObj {String|Object} ID or msgObject
     * @returns {Promise}
     */
    ChatdPersist.prototype.unpersistMessage = promisify(function(resolve, reject, chatId, msgIdOrObj) {
        var self = this;

        if (!ChatdPersist.isMasterTab()) {
            // don't do anything if this is not the master tab!
            return reject(EACCESS);
        }

        var msgId = typeof msgIdOrObj === "object" ? msgIdOrObj.messageId : msgIdOrObj;

        self.getMessageByMessageId(chatId, msgId)
            .then(function(r) {
                return self.db.msgs.delete(r.id || r[0] && r[0].id);
            })
            .then(resolve)
            .catch(reject);
    });


    /**
     * Verify keys, if this is a master tab, if message already exists and then add this as a message to the db.
     * E.g. like .addMessage but with all kind of safety checks first.
     *
     * @param action {String} "push", "replace" or "remove"
     * @param chatId {String}
     * @param args {Array} Array of arguments for calling .persistMessage/unpersistMessage
     * @returns {void}
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
            self._msgActionsQueuePerChat[chatId] = [];
        }
        self._msgActionsQueuePerChat[chatId].push([action, args]);

        delay('chatdpersist:flush:' + chatId, function() {
            self._flushMessageActionsQueue(chatId).always(nop);
        }, 850);
    };

    /**
     * Internal helper that removes the "message actions" queues.
     *
     * @param chatId
     * @private
     */
    ChatdPersist.prototype._expungeMessageActionsQueue = function(chatId) {
        var self = this;

        if (self._msgActionsQueuePerChat[chatId]) {
            delay.cancel('chatdpersist:flush:' + chatId);
            delete self._msgActionsQueuePerChat[chatId];
        }
    };

    /**
     * Internal helper that flushes the "message actions" queues.
     *
     * @param chatId
     * @private
     */
    ChatdPersist.prototype._flushMessageActionsQueue = mutex('chatdpersist:mutex', function(resolve, reject, chatId) {
        var self = this;
        var queue = self._msgActionsQueuePerChat[chatId];
        delete self._msgActionsQueuePerChat[chatId];

        if (!queue) {
            // already flushed/empty?
            return queueMicrotask(resolve);
        }

        if (!ChatdPersist.isMasterTab()) {
            // don't do anything if this is not the master tab!
            return queueMicrotask(resolve);
        }

        var queueLength = queue.length;

        (function next() {
            var queueEntry = queue.shift();

            if (!queueEntry) {
                self.logger.debug("Flushed message actions queue for chat %s: %d items.", chatId, queueLength);
                return resolve();
            }

            if (queueEntry[0] === 'push') {
                self.persistMessage.apply(self, [chatId].concat(queueEntry[1])).always(next);
            }
            else if (queueEntry[0] === 'replace') {
                self.persistMessage.apply(self, [chatId].concat(queueEntry[1][1]).concat([true])).always(next);
            }
            else if (queueEntry[0] === 'remove') {
                if (queueEntry[1][1] !== true) {
                    self.unpersistMessage.apply(self, [chatId].concat(queueEntry[1])).always(next);
                }
                else {
                    // else, its a "soft remove" (e.g. don't persist!)
                    next();
                }
            }
            else {
                self.logger.error("Unknown queue type entry found in queue: ", chatId, queueEntry);
                next();
            }
        })();
    });

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
     * @param offset {Number} The starting (e.g. highest) orderValue number from which to go back when
     * paging
     * @param pageSize {Number}
     * @param chatId {String}
     * @returns {Promise}
     * @private
     */
    ChatdPersist.prototype._paginateMessages = promisify(function(resolve, reject, offset, pageSize, chatId) {
        assert(chatId, 'missing chatId, when calling _paginateMessages. Halting.');

        var self = this;
        var messages;
        var keys = {};
        var keysThatRequireLoading = {};
        self._queryMessages(offset, pageSize, chatId)
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
                        .then(function(results) {
                            results.forEach(function(v) {
                                var keyId = v.chatId_userId_keyId.split(v.userId + "_");
                                keyId = keyId[1];
                                keys[v.chatId_userId_keyId] = [keyId, v.key, v.userId, v.chatId_userId_keyId];
                            });
                        })
                        .catch(function() {
                            self.logger.warn("Failed to retrieve key for msgId: ", msg.msgId, msg.keyId);
                        })
                        .always(function() {
                            resolve([messages, keys]);
                        });
                })
            .catch(function(ex) {
                self.logger.error("_paginateMessages fail:", ex);
                reject(ex);
            });
    });

    /**
     * The public method/way of retrieving chat history from chatdPersist.
     *
     * @param chatId {String}
     * @param len {Number}
     * @returns {Promise}
     */
    ChatdPersist.prototype.retrieveChatHistory = promisify(function(resolve, reject, chatId, len) {
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
                .then(function(response) {
                    messages = response[0];
                    messages.forEach(function(msg) {
                        lownum = msg.orderValue > lownum + 1 ? msg.orderValue - 1 : lownum;
                        highnum = msg.orderValue > highnum ? msg.orderValue : highnum;
                    });

                    keys = response[1];
                })
                .catch(nop)
        );

        var lastSeen = false;

        if (len === Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL) {
            // is initial...retrieve last seen, last delivered
            waitingPromises.push(
                self.getPointer(chatId, "ls")
                    .then(function(r) {
                        lastSeen = r;
                    })
                    .catch(nop)
            );
        }

        Promise.allSettled(waitingPromises).always(function() {
            if (messages && messages.length > 0) {
                resolve([
                    messages,
                    keys,
                    lownum,
                    highnum,
                    lastSeen
                ]);
            }
            else {
                // no messages persisted?
                resolve([]);
            }
        });
    });

    /**
     * Calculates the lowest and highest ids for a chatId from our local db.
     *
     * @param chatId {String}
     * @returns {MegaPromise}
     */
    ChatdPersist.prototype.getLowHighIds = function(chatId) {
        var self = this;
        var encChatId = ChatdPersist.encrypt(chatId);
        return new MegaPromise(function(resolve, reject) {
            // @todo do a single DB query (?)..
            Promise.all([
                self.db.msgs
                    .where('[chatId+orderValue]')
                    .between([encChatId, -Infinity], [encChatId, Infinity]).last(),
                self.db.msgs
                    .where('[chatId+orderValue]')
                    .between([encChatId, -Infinity], [encChatId, Infinity]).first()
            ]).then(function(result) {
                var low = result[1];
                var high = result[0];
                if (!(low && high)) {
                    return reject();
                }
                resolve([low.msgId, high.msgId, low.orderValue, high.orderValue]);
            }).catch(reject);
        });
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
    ChatdPersist.prototype.persistQueue = mutex('chatdpersist:mutex', function(resolve, reject, chatId) {
        var self = this;
        if (!self._queuePerChat[chatId]) {
            return queueMicrotask(resolve);
        }
        if (!ChatdPersist.isMasterTab()) {
            delete self._queuePerChat[chatId];
            // don't do anything if this is not the master tab!
            return queueMicrotask(resolve);
        }

        self.transaction(function(msgs, keys, trans) {
            var promises = [];
            // eslint-disable-next-line local-rules/misc-warnings
            self._queuePerChat[chatId].forEach(function(queueEntry) {
                if (trans.active !== true) {
                    self.logger.error('transaction got inactive. this should never happen.');
                    delete self._queuePerChat[chatId];
                }

                if (queueEntry[0] === ChatdPersist.QUEUE_TYPE.KEY) {
                    promises.push(self.persistKey.apply(self, [chatId].concat(queueEntry[1])).always(nop));
                }
                else {
                    self.logger.error("Unknown queue type entry found in queue: ", chatId, queueEntry);
                }
            });
            return Promise.allSettled(promises);
        }).then(function() {
            if (d) {
                var len = self._queuePerChat[chatId] ? self._queuePerChat[chatId].length : '(unknown)';
                self.logger.debug("Transaction committed for chat: %s. Total of: %s items", chatId, len);
            }
            delete self._queuePerChat[chatId];
            resolve();
        }).catch(reject);
    });

    /**
     * Persist/do a truncate for a chat `chatId` with the orderValue of the message to start the truncate from is
     * `firstNumToStartFrom`
     * @param chatId {String}
     * @param firstNumToStartFrom {Number}
     * @returns {Promise}
     */
    ChatdPersist.prototype.persistTruncate = promisify(function(resolve, reject, chatId, firstNumToStartFrom) {
        var self = this;
        if (!ChatdPersist.isMasterTab()) {
            // don't do anything if this is not the master tab!
            return MegaPromise.reject();
        }

        var stats = {'delkeys': 0, 'delmsgs': 0, 'failmsgs': 0, 'failkeys': 0};
        self.transaction(function() {
            return self._queryMessages(firstNumToStartFrom, Infinity, chatId)
                .eachPrimaryKey(function(pk) {
                    self.db.msgs.delete(pk)
                        .then(function() {
                            stats.delmsgs++;
                        })
                        .catch(function() {
                            stats.failmsgs++;
                        });
                });
        }).then(function() {
            if (d) {
                self.logger.debug("Truncate Transaction committed for %s, stats: %o", chatId, stats);
            }
        }).catch(function(ex) {
            self.logger.warn(ex);
        }).then(function() {
            var chatRoom = self.chatd.megaChat.getChatById(chatId);
            return chatRoom && chatRoom.messagesBuff.isDecrypting;
        }).always(function() {
            onIdle(resolve);
            // if all messages are from chatdPersist, chatd's buf would be empty,
            // but messagesBuff would still contain messages to be removed.
            self._cleanupMessagesAfterTruncate(chatId, firstNumToStartFrom);
        });
    });

    ChatdPersist.prototype._cleanupMessagesAfterTruncate = function(chatId, firstNumToStartFrom) {
        var self = this;
        var chatRoom = self.chatd.megaChat.getChatById(chatId);
        var editedMessage = chatRoom && chatRoom.messagesBuff.getByOrderValue(firstNumToStartFrom);
        if (editedMessage) {
            editedMessage.dialogType = 'truncated';
            editedMessage.textContents = "";

            chatRoom.megaChat.plugins.chatdIntegration._parseMessage(
                chatRoom,
                editedMessage
            );

            chatRoom.messagesBuff.messages.replace(editedMessage.messageId, editedMessage);


            var messageKeys = clone(chatRoom.messagesBuff.messages.keys());

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

    ChatdPersist.prototype.clearChatHistoryForChat = mutex('chatdpersist:mutex', function(resolve, reject, chatId) {
        var self = this;
        if (!ChatdPersist.isMasterTab()) {
            // don't do anything if this is not the master tab!
            return queueMicrotask(reject);
        }

        if (self._queuePerChat[chatId]) {
            // ensure the queue is ready.
            delete self._queuePerChat[chatId];
        }
        self._expungeMessageActionsQueue(chatId);

        self.transaction(function() {
            return self._queryMessages(0, Infinity, chatId)
                .eachPrimaryKey(function(pk) {
                    self.db.msgs.delete(pk);
                });
        }).then(function() {
            self.logger.debug("clearChatHistoryForChat Transaction commited.");
        }).catch(function(ex) {
            self.logger.debug('clearChatHistoryForChat transaction error', ex);
        }).then(function() {
            var chatRoom = self.chatd.megaChat.getChatById(chatId);
            var messageKeys = clone(chatRoom.messagesBuff.messages.keys());

            for (var i = 0; i < messageKeys.length; i++) {
                var v = chatRoom.messagesBuff.messages[messageKeys[i]];
                chatRoom.messagesBuff.messages.removeByKey(v.messageId);
            }
            self._expungeMessageActionsQueue(chatId);
        }).always(resolve);
    });

    ChatdPersist.prototype.retrieveAndLoadKeysFor = promisify(function(resolve, reject, chatId, userId, keyId) {
        var self = this;

        if (keyId === 0) {
            return resolve();
        }

        self.chatd.chatdPersist.getKey(chatId, userId, keyId)
            .then(function(key) {
                var keysArr = [
                    {
                        userId: key.userId,
                        keyid: keyId,
                        keylen: key.key.length,
                        key: key.key
                    }
                ];

                self.chatd.trigger('onMessageKeysDone', {
                    chatId: chatId,
                    keys: keysArr,
                    chatdPersist: true
                });

                resolve();
            })
            .catch(function() {
                if (d) {
                    console.error("Failed to retrieve key for retrieveAndLoadKeysFor", [
                        chatId,
                        userId,
                        keyId
                    ]);
                }
                reject();
            });
    });

    ChatdPersist.prototype.modifyPersistedMessage = function(chatId, messageInfo) {
        var self = this;

        var chatRoom = self.chatd.megaChat.getChatById(chatId);

        self.getMessageByMessageId(chatId, messageInfo.messageId)
            .then(function(r) {
                var msg = r[0];
                if (!msg) {
                    throw new Error('No message.');
                }

                return chatRoom.protocolHandler.decryptFrom(
                    messageInfo.message,
                    messageInfo.userId,
                    messageInfo.keyid,
                    false
                );
            })
            .then(function(r) {
                var msgInstance = new Message(
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
                        'sent': messageInfo.sent,
                        '_reactions': messageInfo._reactions,
                        '_queuedReactions': messageInfo._queuedReactions
                    }
                );

                if (!self.chatd.megaChat.plugins.chatdIntegration._processDecryptedMessage(chatRoom, msgInstance, r)) {
                    throw new Error('Failed to decrypt message.');
                }

                return self.persistMessage(chatId, msgInstance, true);
            })
            .then(dump)
            .catch(function(ex) {
                self.logger.error("Failed to apply message update", chatId, messageInfo.messageId, messageInfo, ex);
            });
    };

    /**
     * Persist message's reactions.
     * @param {Message} message The message instance
     * @returns {Promise} whether succeeded
     */
    ChatdPersist.prototype.modifyPersistedReactions = function(message) {
        var self = this;
        return new Promise(function(resolve, reject) {
            assert(message instanceof Message, 'Not a message instance.');
            const chatId = message.chatRoom.chatId;
            self.getMessageByMessageId(chatId, message.messageId)
                .then(function(r) {
                    if (r && r[0]) {
                        assert(r[0].msgId === message.messageId, 'Unexpected message.');
                        r[0].msgObject._reactions = message._reactions;
                        self.persistMessageBatched(
                            "replace",
                            chatId,
                            [undefined, Message.fromPersistableObject(megaChat.getChatById(chatId), r[0])]
                        );
                        return r[0].msgId;
                    }
                })
                .then(resolve)
                .catch(function(ex) {
                    if (Array.isArray(ex) && !ex.length) {
                        self.logger.debug('Message is not yet persisted, deferring saving reactions...', message);
                        return resolve();
                    }

                    self.logger.error('Cannot persist message reactions...', ex);
                    reject(ex);
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
            .then(function() {
                if (localStorage.chatdPersistDebug) {
                    console.warn('ChatdPersist.clear finished.');
                }
            });
    };

    /**
     * Drop the current indexedDB
     *
     * @returns {Promise}
     */
    ChatdPersist.prototype.drop = function() {
        return this.hasOwnProperty('db') ? this.db.delete() : Promise.resolve();
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
        "transaction",
        "clear"
    ]
        .forEach(function(methodName) {
            var origFunc = ChatdPersist.prototype[methodName];
            ChatdPersist.prototype[methodName] = ChatdPersist._requiresDbReady(origFunc, methodName);
        });

    ChatdPersist.prototype.debugValidate = function() {
        megaChat.chats.forEach(function(chatRoom) {
            if (!chatRoom.chatId) {
                return;
            }
            megaChat.plugins.chatdIntegration.chatd.chatdPersist._paginateMessages(0, 99999, chatRoom.chatId)
                .then(function(r) {
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
                        console.error("Found", foundErrors, "errors in", chatRoom.chatId, "in total of", msgs.length,
                            "messages");
                    }
                    else {
                        console.error(
                            "Validation success, everything is ok for chat", chatRoom.chatId, "checked",
                            msgs.length, "messages"
                        );
                    }
                })
                .catch(dump);
        });
    };

    scope.ChatdPersist = ChatdPersist;
})(window);
