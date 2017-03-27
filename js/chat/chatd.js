// chatd interface
var Chatd = function(userId, options) {
    var self = this;

    // maps the chatd shard number to its corresponding Chatd.Shard object
    self.shards = {};

    // maps a chatId to the handling Chatd.Shard object
    self.chatIdShard = {};

    // maps chatIds to the Message object
    self.chatIdMessages = {};

    // local cache of the Message object
    self.messagesQueueKvStorage = new IndexedDBKVStorage("chatqueuedmsgs", {
            murSeed: 0x800F0002
        });

    // preload
    self.messagesQueueKvStorage.prefillMemCache(fmdb);

    /**
     * Set to true when this chatd instance is (being) destroyed
     * @type {boolean}
     */
    self.destroyed = false;

    // random starting point for the new message transaction ID
    // FIXME: use cryptographically strong PRNG instead
    // CHECK: is this sufficiently collision-proof? a collision would have to occur in the same second for the same userId.
    self.msgTransactionId = '';
    self.userId = base64urldecode(userId);

    for (var i = 8; i--; ) {
        self.msgTransactionId += String.fromCharCode(Math.random()*256);
    }

    var loggerIsEnabled = localStorage['chatdLogger'] === '1';

    self.logger = new MegaLogger("chatd", {
        minLogLevel: function() {
            return loggerIsEnabled ? MegaLogger.LEVELS.DEBUG : MegaLogger.LEVELS.ERROR;
        }
    });

    self.options = $.extend({}, Chatd.DEFAULT_OPTIONS, options);

    // debug mode
    [
        // 'onError',
        // 'onOpen',
        // 'onClose',
        // 'onRoomConnected',
        // 'onRoomDisconnected',
        // 'onMessageUpdated',
        // 'onMessageConfirm',
        // 'onMessageReject',
        // 'onMessageCheck',
        // 'onMessageModify',
        // 'onMessageStore',
        // 'onMessageSeen',
        // 'onMessageLastSeen',
        // 'onMessageReceived',
        // 'onMessageLastReceived',
        // 'onRetentionChanged',
        // 'onMembersUpdated',
        // 'onMessagesHistoryDone',
        // 'onMessagesHistoryRequest',
        // 'onMessageDiscard',
    ].forEach(function(evt) {
        self.rebind(evt + '.chatd', function(e) {
            if (arguments[1].shard) {
                var tmp = $.extend({}, arguments[1]);
                delete tmp.shard;
                tmp.shard = "shard#" + arguments[1].shard.shard;
                console.error(evt, unixtime(), JSON.stringify(
                    tmp
                ));
            }
            else {
                console.error(evt, unixtime(), JSON.stringify(arguments[1]));
            }
        });
   });
};

makeObservable(Chatd);

Chatd.DEFAULT_OPTIONS = {
};

// command opCodes
Chatd.Opcode = {
    'KEEPALIVE' : 0,
    'JOIN' : 1,
    'OLDMSG' : 2,
    'NEWMSG' : 3,
    'MSGUPD' : 4,
    'SEEN' : 5,
    'RECEIVED' : 6,
    'RETENTION' : 7,
    'HIST' : 8,
    'RANGE' : 9,
    'NEWMSGID' : 10,
    'REJECT' : 11,
    'BROADCAST' : 12,
    'HISTDONE' : 13,
    'NEWKEY' : 17,
    'KEYID' : 18,
    'JOINRANGEHIST' : 19,
    'MSGUPDX' : 20,
    'MSGID' : 21,
};

// privilege levels
Chatd.Priv = {
    'NOCHANGE' : -2,
    'NOTPRESENT' : -1,
    'RDONLY' : 0,
    'RDWR' : 1,
    'FULL' : 2,
    'OPER' : 3
};
// message's edited time is (TIMESTAMP + UPDATED - 1).
Chatd.MsgField = {
    'MSGID' : 0,
    'USERID' : 1,
    'TIMESTAMP' : 2,
    'MESSAGE' : 3,
    'KEYID' : 4,
    'UPDATED' : 5,
    'TYPE' : 6
};

Chatd.MsgType = {
    'KEY' : strongvelope.MESSAGE_TYPES.GROUP_KEYED,
    'MESSAGE' : strongvelope.MESSAGE_TYPES.GROUP_FOLLOWUP,
    'EDIT' : strongvelope.MESSAGE_TYPES.GROUP_FOLLOWUP + 1
};

Chatd.Const = {
    'UNDEFINED' : '\0\0\0\0\0\0\0\0'
};

Chatd.MAX_KEEPALIVE_DELAY = 60000;
// 1 hour is agreed by everyone.
Chatd.MESSAGE_EXPIRY = 60*60; // 60*60
var MESSAGE_EXPIRY = Chatd.MESSAGE_EXPIRY;

Chatd.VERSION = 1;

// add a new chatd shard
Chatd.prototype.addshard = function(chatId, shard, url) {
    // instantiate Chatd.Shard object for this shard if needed
    var newshard = !this.shards[shard];

    if (newshard) {
        this.shards[shard] = new Chatd.Shard(this, shard);
    }

    // map chatId to this shard
    this.chatIdShard[chatId] = this.shards[shard];

    // add chatId to the connection's chatIds
    this.shards[shard].chatIds[chatId] = true;

    // always update the URL to give the API an opportunity to migrate chat shards between hosts
    this.shards[shard].url = url;

    // attempt a connection ONLY if this is a new shard.
    if (newshard) {
        this.shards[shard].reconnect();
    }

    return newshard;
};

// Chatd.Shard - everything specific to a chatd instance
Chatd.Shard = function(chatd, shard) {
    var self = this;

    // parent backlink
    self.chatd = chatd;

    // shard for this connection
    self.shard = shard;

    // active chats on this connection
    self.chatIds = {};
    self.joinedChatIds = {};

    // queued commands
    self.cmdq = '';

    var loggerIsEnabled = localStorage['chatdLogger'] === '1';

    self.logger = new MegaLogger(
        "shard-" + shard, {
            minLogLevel: function() {
                return loggerIsEnabled ? MegaLogger.LEVELS.DEBUG : MegaLogger.LEVELS.ERROR;
            }
        },
        chatd.logger
    );

    self.keepAliveTimer = null;

    self.needRestore = true;

    self.destroyed = false;

    self.connectionRetryManager = new ConnectionRetryManager(
        {
            functions: {
                reconnect: function(connectionRetryManager) {
                    // TODO: change this to use the new API method for retrieving a mcurl for a specific shard
                    // (not chat)
                    var firstChatId = Object.keys(self.chatIds)[0];
                    asyncApiReq({
                        a: 'mcurl',
                        id: base64urlencode(firstChatId),
                        v: Chatd.VERSION
                    })
                        .done(function(mcurl) {
                            self.url = mcurl;
                            return self.reconnect();
                        })
                        .fail(function(r) {
                            if (r === EEXPIRED) {
                                if (megaChat && megaChat.plugins && megaChat.plugins.chatdIntegration) {
                                    megaChat.plugins.chatdIntegration.requiresUpdate();
                                }
                            }
                        });


                },
                /**
                 * A Callback that will trigger the 'forceDisconnect' procedure for this type of connection (Karere/Chatd/etc)
                 * @param connectionRetryManager {ConnectionRetryManager}
                 */
                forceDisconnect: function(connectionRetryManager) {
                    return self.disconnect();
                },
                /**
                 * Should return true or false depending on the current state of this connection, e.g. (connected || connecting)
                 * @param connectionRetryManager {ConnectionRetryManager}
                 * @returns {bool}
                 */
                isConnectedOrConnecting: function(connectionRetryManager) {
                    return (
                        self.s && (
                            self.s.readyState == self.s.CONNECTING ||
                            self.s.readyState == self.s.OPEN
                        )
                    );
                },
                /**
                 * Should return true/false if the current state === CONNECTED
                 * @param connectionRetryManager {ConnectionRetryManager}
                 * @returns {bool}
                 */
                isConnected: function(connectionRetryManager) {
                    return (
                        self.s && (
                            self.s.readyState == self.s.OPEN
                        )
                    );
                },
                /**
                 * Should return true/false if the current state === DISCONNECTED
                 * @param connectionRetryManager {ConnectionRetryManager}
                 * @returns {bool}
                 */
                isDisconnected: function(connectionRetryManager) {
                    return (
                        !self.s || self.s.readyState == self.s.CLOSED
                    );
                },
                /**
                 * Should return true IF the user had forced the connection to go offline
                 * @param connectionRetryManager {ConnectionRetryManager}
                 * @returns {bool}
                 */
                isUserForcedDisconnect: function(connectionRetryManager) {
                    return (
                        self.chatd.destroyed === true ||
                            self.destroyed === true
                    );
                }
            }
        },
        self.logger
    );
};

/**
 * Trigger multiple events for each chat which this shard relates to.
 * (used to trigger events related to room changes because of a shard disconnect/connect)
 *
 * @param evtName
 */
Chatd.Shard.prototype.triggerEventOnAllChats = function(evtName) {
    var self = this;

    Object.keys(self.chatd.chatIdShard).forEach(function(chatId) {
        var shard = self.chatd.chatIdShard[chatId];

        if (shard === self) {
            self.chatd.trigger(evtName, {
                chatId: base64urlencode(chatId)
            });
        }
    });
};

// is this chatd connection currently active?
Chatd.Shard.prototype.isOnline = function() {
    return this.s && this.s.readyState == this.s.OPEN;
};

/**
 * Helper function that return the chat Ids (base64urlencode'd) related to this shard
 * as an Array
 * @returns {Array}
 */
Chatd.Shard.prototype.getRelatedChatIds = function() {
    var chatIds = [];
    Object.keys(this.chatIds).forEach(function(v) {
        chatIds.push(
            base64urlencode(v)
        );
    });
    return chatIds;
};


Chatd.Shard.prototype.reconnect = function() {
    var self = this;

    self.s = new WebSocket(this.url);
    self.s.binaryType = "arraybuffer";

    self.s.onopen = function(e) {
        self.keepAliveTimerRestart();
        self.logger.log('chatd connection established');
        if (!self.triggerSendIfAble()) {
            // XXX: websocket.send() failed for whatever reason, onerror should
            //      have been called and the connection restablished afterwards.
            self.logger.error('chatd connection closed unexpectedly...');
            return;
        }
        self.rejoinexisting();
        self.chatd.trigger('onOpen', {
            shard: self
        });
        // Resending of pending message should be done via the integration code, since it have more info and a direct
        // relation with the UI related actions on pending messages (persistence, user can click resend/cancel/etc).
        self.resendpending();

        self.chatd.trigger('onOpen', {
            shard: self
        });
        // Resending of pending message should be done via the integration code, since it have more info and a direct
        // relation with the UI related actions on pending messages (persistence, user can click resend/cancel/etc).
        // self.resendpending();
        self.triggerEventOnAllChats('onRoomConnected');
    };

    self.s.onerror = function(e) {
        self.logger.error("WebSocket error:", e);
        clearTimeout(self.keepAliveTimer);
        self.connectionRetryManager.doConnectionRetry();

        self.chatd.trigger('onError', {
            shard: self
        });
    };

    self.s.onmessage = function(e) {
        // verify that WebSocket frames are always delivered as a contiguous message
        self.exec(new Uint8Array(e.data));
    };

    self.s.onclose = function(e) {
        self.logger.log('chatd connection lost, will eventually reconnect...');
        clearTimeout(self.keepAliveTimer);
        self.joinedChatIds = {};
        self.connectionRetryManager.gotDisconnected();
        self.triggerEventOnAllChats('onRoomDisconnected');

        self.chatd.trigger('onClose', {
            shard: self
        });
    };
};

Chatd.Shard.prototype.disconnect = function() {
    var self = this;

    if (self.s) {
        self.s.close();
    }
    self.s = null;

    clearTimeout(self.keepAliveTimer);

    self.connectionRetryManager.gotDisconnected();
};

Chatd.Shard.prototype.multicmd = function(cmds) {
    var self = this;
    cmds.forEach( function _iterator(cmdObj)
    {
        var opCode = cmdObj[0];
        var cmd = cmdObj[1];

        self.logger.debug("MULTICMD SENT: ", constStateToText(Chatd.Opcode, opCode), cmd);

        self.cmdq += String.fromCharCode(opCode)+cmd;
    });

    this.triggerSendIfAble();
};

Chatd.Shard.prototype.cmd = function(opCode, cmd) {
    this.logger.debug("CMD SENT: ", constStateToText(Chatd.Opcode, opCode), cmd);

    this.cmdq += String.fromCharCode(opCode)+cmd;

    this.triggerSendIfAble();
};

Chatd.Shard.prototype.triggerSendIfAble = function() {
    if (this.isOnline()) {
        if (this.cmdq.length > 0) {
            var a = new Uint8Array(this.cmdq.length);
            for (var i = this.cmdq.length; i--;) {
                a[i] = this.cmdq.charCodeAt(i);
            }

            try {
                this.s.send(a);
            }
            catch (ex) {
                return false;
            }

            this.cmdq = '';
        }
    }
    return true;
};

// rejoin all open chats after reconnection (this is mandatory)
Chatd.Shard.prototype.rejoinexisting = function() {
    for (var c in this.chatIds) {
        // rejoin chat and immediately set the locally buffered message range
        if (!this.joinedChatIds[c]) {
            this.join(c);
        }
    }
};

Chatd.Shard.prototype.clearpending = function() {
    var self = this;
    for (var chatId in this.chatIds) {
        self.chatd.chatIdMessages[chatId].clearpending();
    }
};

Chatd.Shard.prototype.restore = function() {
    var self = this;
    for (var chatId in this.chatIds) {
        self.chatd.chatIdMessages[chatId].restore();
    }
};

// resend all unconfirmed messages (this is mandatory)
// @deprecated
Chatd.Shard.prototype.resendpending = function() {
    var self = this;
    for (var chatId in this.chatIds) {
        self.chatd.chatIdMessages[chatId].resend();
    }
};

// send JOIN
Chatd.Shard.prototype.join = function(chatId) {
    // send a `JOIN` (if no local messages are buffered) or a `JOINRANGEHIST` (if local messages are buffered)
    if (Object.keys(this.chatd.chatIdMessages[chatId].buf).length === 0) {
        this.cmd(Chatd.Opcode.JOIN, chatId + this.chatd.userId + String.fromCharCode(Chatd.Priv.NOCHANGE));
        // send out `HIST` after a fresh `JOIN`
        this.cmd(Chatd.Opcode.HIST, chatId + this.chatd.pack32le(-32));
        this.chatd.trigger('onMessagesHistoryRequest', {
            count: 32,
            chatId: base64urlencode(chatId)
        });
    } else {
        this.chatd.joinrangehist(chatId);
    }
};

Chatd.prototype.cmd = function(opCode, chatId, cmd) {
    this.chatIdShard[chatId].cmd(opCode, chatId + cmd);
};

Chatd.prototype.hist = function(chatId, count) {
    this.chatIdShard[chatId].hist(chatId, count);
};

// send RANGE
Chatd.prototype.joinrangehist = function(chatId) {
    this.chatIdMessages[chatId].joinrangehist(chatId);
};

// send HIST
Chatd.Shard.prototype.hist = function(chatId, count) {
    this.chatd.trigger('onMessagesHistoryRequest', {
        count: count,
        chatId: base64urlencode(chatId)
    });

    this.cmd(Chatd.Opcode.HIST, chatId + this.chatd.pack32le(count));
};

/**
 * Will initialise/reset a timer that would force reconnect the shard connection IN case that the keep alive is not
 * received during a delay of max `Chatd.MAX_KEEPALIVE_DELAY` ms
 */
Chatd.Shard.prototype.keepAliveTimerRestart = function() {
    var self = this;

    if (self.keepAliveTimer) {
        clearTimeout(self.keepAliveTimer);
    }
    self.keepAliveTimer = setTimeout(function() {
        if (self.s && self.s.readyState === self.s.OPEN) {
            self.logger.error("Server heartbeat missed/delayed. Will force reconnect.");

            // current connection is active, but the keep alive detected delay of the keep alive. reconnect!
            self.disconnect();
            self.reconnect();
        }
    }, Chatd.MAX_KEEPALIVE_DELAY);
};

// inbound command processing
// multiple commands can appear as one WebSocket frame, but commands never cross frame boundaries
// CHECK: is this assumption correct on all browsers and under all circumstances?
Chatd.Shard.prototype.exec = function(a) {
    var self = this;

    var cmd = String.fromCharCode.apply(null, a);
    var len;
    var newmsg;

    var codestr = '';
    for (var i=0;i<cmd.length;i++)
    {
        codestr += cmd[i].charCodeAt(0).toString(16) + " ";
        
    }
    self.logger.debug("Received from chatd: ", codestr);

    while (cmd.length) {
        switch (cmd.charCodeAt(0)) {
            case Chatd.Opcode.KEEPALIVE:
                self.logger.log("Server heartbeat received");
                self.cmd(Chatd.Opcode.KEEPALIVE, "");

                self.keepAliveTimerRestart();

                len = 1;
                break;

            case Chatd.Opcode.JOIN:
                self.keepAliveTimerRestart();

                var chatId = base64urlencode(cmd.substr(1, 8));
                var userId = base64urlencode(cmd.substr(9, 8));

                var priv = cmd.charCodeAt(17);

                self.logger.log(
                    "Join or privilege change - user '" + userId + "' on '" + chatId + "' with privilege level " + priv
                );

                self.connectionRetryManager.gotConnected();
                if (userId === u_handle) {
                    if (priv === 0 || priv === 1 || priv === 2 || priv === 3) {
                        // ^^ explicit and easy to read...despite that i could have done >= 1 <= 3 or something like
                        // that..
                        if (!self.joinedChatIds[base64urldecode(chatId)]) {
                            self.joinedChatIds[base64urldecode(chatId)] = true;
                        }
                    }
                    else if (priv === -1) {
                        delete self.joinedChatIds[base64urldecode(chatId)];
                    }
                    else {
                        self.logger.error("Not sure how to handle priv: " + priv +".");
                    }
                }
                
                self.chatd.trigger('onMembersUpdated', {
                    userId: userId,
                    chatId: chatId,
                    priv: priv
                });

                len = 18;
                break;

            case Chatd.Opcode.OLDMSG:
            case Chatd.Opcode.NEWMSG:
                self.keepAliveTimerRestart();
                newmsg = cmd.charCodeAt(0) == Chatd.Opcode.NEWMSG;
                len = self.chatd.unpack32le(cmd.substr(35,4));
                self.logger.log((newmsg ? 'New' : 'Old') +
                     " message '" + base64urlencode(cmd.substr(17,8)) +
                     "' from '" + base64urlencode(cmd.substr(9,8)) +
                     "' on '" + base64urlencode(cmd.substr(1,8)) +
                     "' at " + self.chatd.unpack32le(cmd.substr(25,4)) + ': ' + cmd.substr(35,len));
                len += 39;

                self.chatd.msgstore(newmsg,
                            cmd.substr(1,8),
                            cmd.substr(9,8),
                            cmd.substr(17,8),
                            self.chatd.unpack32le(cmd.substr(25,4)),
                            self.chatd.unpack16le(cmd.substr(29,2)),
                            self.chatd.unpack32le(cmd.substr(31,4)),
                            cmd.substr(39,len)
                );
                break;
            case Chatd.Opcode.MSGUPD:
            case Chatd.Opcode.MSGUPDX:
                self.keepAliveTimerRestart();
                len = self.chatd.unpack32le(cmd.substr(35,4));
                self.logger.log("Message '" +
                    base64urlencode(cmd.substr(17,8)) +
                    "' EDIT/DELETION: in " +
                    base64urlencode(cmd.substr(1,8)) +
                    ' from ' + base64urlencode(cmd.substr(9,8))  +
                    ' with '+ cmd.substr(39,len)
                );
                len += 39;

                self.chatd.msgmodify(cmd.substr(1,8),
                    cmd.substr(9,8), cmd.substr(17,8),
                    self.chatd.unpack16le(cmd.substr(29,2)),
                    self.chatd.unpack32le(cmd.substr(31,4)),
                    cmd.substr(39,len)
                );
                break;

            case Chatd.Opcode.SEEN:
                self.keepAliveTimerRestart();
                self.logger.log("Newest seen message on '" +
                    base64urlencode(cmd.substr(1, 8)) + "': '" + base64urlencode(cmd.substr(9, 8)) + "'");

                self.chatd.trigger('onMessageLastSeen', {
                    chatId: base64urlencode(cmd.substr(1, 8)),
                    messageId: base64urlencode(cmd.substr(9, 8))
                });

                len = 17;
                break;

            case Chatd.Opcode.RECEIVED:
                self.keepAliveTimerRestart();
                self.logger.log("Newest delivered message on '" +
                    base64urlencode(cmd.substr(1,8)) + "': '" + base64urlencode(cmd.substr(9,8)) + "'");

                self.chatd.trigger('onMessageLastReceived', {
                    chatId: base64urlencode(cmd.substr(1, 8)),
                    messageId: base64urlencode(cmd.substr(9, 8))
                });

                len = 17;
                break;

            case Chatd.Opcode.RETENTION:
                self.keepAliveTimerRestart();
                self.logger.log("Retention policy change on '" +
                    base64urlencode(cmd.substr(1,8)) + "' by '" +
                    base64urlencode(cmd.substr(9,8)) + "': " +
                    self.chatd.unpack32le(cmd.substr(17,4)) + " second(s)");

                self.chatd.trigger('onRetentionChanged', {
                    chatId: base64urlencode(cmd.substr(1, 8)),
                    userId: base64urlencode(cmd.substr(9, 8)),
                    retention: self.chatd.unpack32le(cmd.substr(17, 4))
                });

                len = 21;
                break;

            case Chatd.Opcode.NEWMSGID:
                self.keepAliveTimerRestart();

                self.logger.log("Sent message ID confirmed: '" + base64urlencode(cmd.substr(9,8)) + "'");

                self.chatd.msgconfirm(cmd.substr(1,8), cmd.substr(9,8));

                len = 17;
                break;

            case Chatd.Opcode.RANGE:
                self.keepAliveTimerRestart();
                self.logger.log(
                    "Known chat message IDs on '" + base64urlencode(cmd.substr(1,8)) + "' " +
                    "- oldest: '" + base64urlencode(cmd.substr(9,8)) + "' " +
                    "newest: '" + base64urlencode(cmd.substr(17,8)) + "'"
                );

                self.chatd.trigger('onMessagesHistoryInfo', {
                    chatId: base64urlencode(cmd.substr(1,8)),
                    oldest: base64urlencode(cmd.substr(9,8)),
                    newest: base64urlencode(cmd.substr(17,8))
                });

                self.chatd.msgcheck(cmd.substr(1,8), cmd.substr(17,8));

                len = 25;
                break;

            case Chatd.Opcode.REJECT:
                self.keepAliveTimerRestart();
                self.logger.log("Command was rejected, chatId : " +
                    base64urlencode(cmd.substr(1,8)) +" / msgId : " +
                    base64urlencode(cmd.substr(9,8)) +" / opcode: " +
                    cmd.substr(17,1) + " / reason: " + cmd.substr(18,1));

                if (cmd.charCodeAt(17) === Chatd.Opcode.NEWMSG) {
                    // the message was rejected
                    self.chatd.msgconfirm(cmd.substr(9,8), false);
                }
                if (cmd.charCodeAt(17) === Chatd.Opcode.MSGUPD || cmd.charCodeAt(17) === Chatd.Opcode.MSGUPDX) {
                    // the edit was rejected
                    self.chatd.editreject(cmd.substr(1,8), cmd.substr(9,8));
                }
                len = 18;
                break;

            case Chatd.Opcode.BROADCAST:
                self.keepAliveTimerRestart();

                self.chatd.trigger('onBroadcast', {
                    chatId: base64urlencode(cmd.substr(1, 8)),
                    userId: base64urlencode(cmd.substr(9, 8)),
                    bCastCode: cmd.substr(17, 1)
                });

                len = 18;
                break;

            case Chatd.Opcode.HISTDONE:
                self.keepAliveTimerRestart();
                self.logger.log("History retrieval finished: " + base64urlencode(cmd.substr(1,8)));
                if (self.needRestore) {
                    self.restore();
                    self.needRestore = false;
                }

                self.chatd.trigger('onMessagesHistoryDone',
                    {
                        chatId: base64urlencode(cmd.substr(1,8))
                    }
                );
                len = 9;
                break;
            case Chatd.Opcode.NEWKEY:
                //self.keepAliveTimerRestart();
                self.logger.log("Set keys: " + base64urlencode(cmd.substr(1,8)) +
                    "length: " + self.chatd.unpack32le(cmd.substr(13,4)));

                len = self.chatd.unpack32le(cmd.substr(13,4));
                var index = 17;
                var keys = [];
                while (index < len+17) {
                    var keylen = self.chatd.unpack16le(cmd.substr(index + 12,2));

                    keys.push(
                        {
                            userId : base64urlencode(cmd.substr(index,8)),
                            keyid  : self.chatd.unpack32le(cmd.substr(index + 8,4)),
                            keylen : keylen,
                            key  : cmd.substr(index + 14,keylen)
                        });
                    index += (keylen + 14);
                }

                self.chatd.trigger('onMessageKeysDone',
                    {
                        chatId: base64urlencode(cmd.substr(1,8)),
                        keyid : cmd.substr(9,4),
                        keys  : keys
                    }
                );

                len += 17;
                break;
            case Chatd.Opcode.KEYID:
                self.logger.log("GET new key: " + base64urlencode(cmd.substr(1,8)));

                self.chatd.trigger('onMessagesKeyIdDone',
                    {
                        chatId: base64urlencode(cmd.substr(1,8)),
                        keyxid: self.chatd.unpack32le(cmd.substr(9,4)),
                        keyid:  self.chatd.unpack32le(cmd.substr(13,4))
                    }
                );
                self.chatd.keyconfirm(cmd.substr(1,8), self.chatd.unpack32le(cmd.substr(13,4)));
                len = 17;
                break;
            case Chatd.Opcode.MSGID:
                //self.keepAliveTimerRestart();
                self.logger.log("MSG already exists: " + base64urlencode(cmd.substr(1,8)) +
                    " - " + base64urlencode(cmd.substr(9,8)));
                self.chatd.msgreject(cmd.substr(1,8), cmd.substr(9,8));
                len = 17;
                break;
            default:
                self.logger.error(
                    "FATAL: Unknown opCode " + cmd.charCodeAt(0) +
                    ". To stop potential loop-forever case, the next commands in the buffer were rejected!"
                );
                // remove the command from the queue, its already processed, 
                // if this is not done, the code will loop forever
                cmd = "";
        }

        if (cmd.length < len) {
            self.logger.error(
                "FATAL: Short WebSocket frame - got " + cmd.length + ", expected " + len +
                ". To stop potential loop-forever case, the next commands in the buffer were rejected!"
            );

            // remove the command from the queue, its already processed, if this is not done, 
            // the code will loop forever
            cmd = "";
            break;
        }

        cmd = cmd.substr(len);
    }
};

// generate and return next msgTransactionId in sequence
Chatd.prototype.nexttransactionid = function() {
    for (var i = 0; i < this.msgTransactionId.length; i++) {
        var c = (this.msgTransactionId.charCodeAt(i)+1) & 0xff;

        this.msgTransactionId = this.msgTransactionId.substr(0,i) +
            String.fromCharCode(c) + this.msgTransactionId.substr(i+1);

        if (c) {
            break;
        }
    }

    return this.msgTransactionId;
};

Chatd.prototype.join = function(chatId, shard, url) {
    if (!this.chatIdShard[chatId]) {
        var newshard = this.addshard(chatId, shard, url);
        this.chatIdMessages[chatId] = new Chatd.Messages(this, chatId);
        if (!newshard) {
            if (!this.shards[shard].joinedChatIds[chatId]) {
                this.shards[shard].join(chatId);
                this.shards[shard].joinedChatIds[chatId] = true;
            }
        }
    }
};

Chatd.prototype.leave = function(chatId) {
    if (this.chatIdShard[chatId]) {
        var shard = this.chatIdShard[chatId];

        shard.destroyed = true;

        // do some cleanup now...
        delete shard.joinedChatIds[chatId];
        if (Object.keys(shard.joinedChatIds).length === 0) {
            // close shard if no more joined chatIds are left...
            shard.disconnect();
            var self = this;
            Object.keys(this.shards).forEach(function(k) {
                if (self.shards[k] === shard) {
                    delete self.shards[k];
                    return false;
                }
            });
            shard = null;
        }

        delete this.chatIdMessages[chatId];
        delete this.chatIdShard[chatId];
    }
};

// submit a new message to the chatId
Chatd.prototype.submit = function(chatId, messages, keyId) {

    if (this.chatIdMessages[chatId]) {
        return this.chatIdMessages[chatId].submit(messages, keyId);
    }
    else {
        return false;
    }
};

// edit or delete an existing message, returns false upon failure
Chatd.prototype.modify = function(chatId, msgnum, message) {
    if (!this.chatIdMessages[chatId]) {
        return false;
    }

    return this.chatIdMessages[chatId].modify(msgnum, message);
};

Chatd.Shard.prototype.msg = function(chatId, messages) {
    var cmds = [];
    for (var i = 0; i<messages.length; i++) {
        var messageObj = messages[i];

        var msgxid = messageObj.msgxid;
        var keyid = messageObj.keyid;
        var timestamp = messageObj.timestamp;
        var message = messageObj.message;
        var updated = messageObj.updated;
        var type = messageObj.type;
        var cmd = '';
        if (type === Chatd.MsgType.KEY) {// this is key message;
            cmd = [Chatd.Opcode.NEWKEY, 
                   chatId + this.chatd.pack32le(keyid) + this.chatd.pack32le(message.length) + message];
        } else if (type === Chatd.MsgType.EDIT) {// this is edit message;
            cmd = [Chatd.Opcode.MSGUPD,
                   chatId + Chatd.Const.UNDEFINED + msgxid + this.chatd.pack32le(0) +
                    this.chatd.pack16le(updated) + this.chatd.pack32le(keyid) +
                    this.chatd.pack32le(message.length) + message];
        } else {
            cmd = [Chatd.Opcode.NEWMSG,
                chatId + Chatd.Const.UNDEFINED + msgxid + this.chatd.pack32le(timestamp) +
                this.chatd.pack16le(0) + this.chatd.pack32le(keyid) + this.chatd.pack32le(message.length) + message];
        }
        cmds.push(cmd);
    };

    this.multicmd(cmds);
};

Chatd.Shard.prototype.msgupd = function(chatId, msgid, updatedelta, message, keyid) {
    this.cmd(Chatd.Opcode.MSGUPD,
        chatId + Chatd.Const.UNDEFINED + msgid + this.chatd.pack32le(0) +
        this.chatd.pack16le(updatedelta) + this.chatd.pack32le(keyid) + this.chatd.pack32le(message.length) + message);
};

Chatd.Shard.prototype.msgupdx = function(chatId, msgxid, updatedelta, message, keyxid) {
    this.cmd(Chatd.Opcode.MSGUPDX,
        chatId + Chatd.Const.UNDEFINED + msgxid + this.chatd.pack32le(0) +
        this.chatd.pack16le(updatedelta) + this.chatd.pack32le(keyxid) +
        this.chatd.pack32le(message.length) + message);
};

// message storage subsystem
Chatd.Messages = function(chatd, chatId) {
    // parent linkage
    this.chatd = chatd;
    this.chatId = chatId;

    // the message buffer can grow in two directions and is always contiguous, i.e. there are no "holes"
    // there is no guarantee as to ordering
    this.lownum = 2 << 28; // oldest message in buf
    this.highnum = 2 << 28; // newest message in buf
    this.sendingnum = 2 << 30;// reasonly high id for pending messages in buf

    this.sentid = false;
    this.receivedid = false;
    this.seenid = false;

    // message format: [msgid/transactionid, userId, timestamp, message]
    // messages in buf are indexed by a numeric id
    this.buf = {};
    this.sendingbuf = {};

    // mapping of transactionids of messages being sent to the numeric index of this.buf
    this.sending = {};
    this.sendingList = [];
    // expired message list
    this.expired = {};
};

Chatd.Messages.prototype.submit = function(messages, keyId) {
    // messages is an array
    var messageConstructs = [];

    for (var i = 0; i<messages.length; i++) {
        var message = messages[i];
        // allocate a transactionid for the new message
        var msgxid = this.chatd.nexttransactionid();
        var timestamp = Math.floor(new Date().getTime()/1000);

        // write the new message to the message buffer and mark as in sending state
        // FIXME: there is a tiny chance of a namespace clash between msgid and msgxid, FIX
        var messagekey = this.getmessagekey(msgxid, message.type);
        this.sendingbuf[++this.sendingnum] =
            [msgxid, this.chatd.userId, timestamp, message.message, (keyId>>>0), 0, message.type];
        this.sending[messagekey] = this.sendingnum;
        this.sendingList.push(messagekey);
        this.persist(messagekey);

        messageConstructs.push(
            {"msgxid":msgxid,
            "timestamp":timestamp,
            "keyid":keyId,
            "updated":0,
            "message":message.message,
            "type":message.type
            });
    };

    // if we believe to be online, send immediately
    if (this.chatd.chatIdShard[this.chatId].isOnline()) {
        this.chatd.chatIdShard[this.chatId].msg(this.chatId, messageConstructs);
    }
    return (this.sendingnum >>> 0);
};

Chatd.Messages.prototype.updatekeyid = function(keyid) {
    var self = this;

    this.sendingList.forEach(function(msgxid) {
        if (!self.expired[msgxid]) {
            if (self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.TYPE] === Chatd.MsgType.KEY) {
                return;
            }
            else {
                self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.KEYID] = keyid;
                self.persist(msgxid);
            }
        }
    });
};

Chatd.Messages.prototype.modify = function(msgnum, message) {
    var self = this;

    var shard = self.chatd.chatIdShard[self.chatId];

    shard.logger.debug("mod", msgnum, message);

    var mintimestamp = Math.floor(new Date().getTime()/1000);

    // modify pending message so that a potential resend includes the change
    if (self.sendingbuf[msgnum]) {
        //overwrite the original messsage with the edited content
        self.sendingbuf[msgnum][Chatd.MsgField.MESSAGE] = message;
        var pendingmsgkey = self.getmessagekey(self.sendingbuf[msgnum][Chatd.MsgField.MSGID], Chatd.MsgType.MESSAGE);
        self.persist(pendingmsgkey);

        var messagekey = self.getmessagekey(self.sendingbuf[msgnum][Chatd.MsgField.MSGID], Chatd.MsgType.EDIT);
        // if there is a pending edit after the pending new message, 
        // overwrite the pending edit to only keep 1 pending edit.
        if (self.sending[messagekey]) {
            self.sendingbuf[self.sending[messagekey]][Chatd.MsgField.UPDATED] =
                mintimestamp-self.sendingbuf[msgnum][Chatd.MsgField.TIMESTAMP]+1;
            self.sendingbuf[self.sending[messagekey]][Chatd.MsgField.MESSAGE] = message;
        }
        // if there is no any pending edit, append a pending edit.
        else {
            self.sendingbuf[++self.sendingnum] = [self.sendingbuf[msgnum][Chatd.MsgField.MSGID],
                self.sendingbuf[msgnum][Chatd.MsgField.USERID],
                self.sendingbuf[msgnum][Chatd.MsgField.TIMESTAMP],
                message, self.sendingbuf[msgnum][Chatd.MsgField.KEYID],
                mintimestamp-self.sendingbuf[msgnum][Chatd.MsgField.TIMESTAMP]+1, Chatd.MsgType.EDIT];

            self.sending[messagekey] = self.sendingnum;
            self.sendingList.push(messagekey);
        }
        if (self.chatd.chatIdShard[self.chatId].isOnline()) {
            // if the orginal message is still in the pending list, send out a msgupx.
            self.chatd.chatIdShard[self.chatId].msgupdx(self.chatId, self.sendingbuf[msgnum][Chatd.MsgField.MSGID],
                self.sendingbuf[msgnum][Chatd.MsgField.UPDATED],
                message, self.sendingbuf[msgnum][Chatd.MsgField.KEYID]);
        }
        self.persist(messagekey);
    }
    else if (self.buf[msgnum]) {
        var messagekey = self.getmessagekey(self.buf[msgnum][Chatd.MsgField.MSGID], Chatd.MsgType.EDIT);
        self.sendingbuf[++self.sendingnum] = [self.buf[msgnum][Chatd.MsgField.MSGID],
            self.buf[msgnum][Chatd.MsgField.USERID], self.buf[msgnum][Chatd.MsgField.TIMESTAMP],
            message, self.buf[msgnum][Chatd.MsgField.KEYID], mintimestamp-self.buf[msgnum][Chatd.MsgField.TIMESTAMP]+1,
            Chatd.MsgType.EDIT];

        self.sending[messagekey] = self.sendingnum;
        self.sendingList.push(messagekey);
        self.persist(messagekey);

        if (self.chatd.chatIdShard[self.chatId].isOnline()) {
            self.chatd.chatIdShard[self.chatId].msgupd(self.chatId, self.buf[msgnum][Chatd.MsgField.MSGID],
                mintimestamp-self.buf[msgnum][Chatd.MsgField.TIMESTAMP]+1,
                message, self.buf[msgnum][Chatd.MsgField.KEYID]);
        }
    }
};

Chatd.Messages.prototype.clearpending = function() {
    // mapping of transactionids of messages being sent to the numeric index of this.buf
    var self = this;
    this.sendingList.forEach(function(msgxid) {
        self.removefrompersist(msgxid);
    });
    this.sending = {};
    this.sendingList = [];
    this.sendingbuf = {};
};

Chatd.Messages.prototype.broadcast = function(bCastCode) {
    var self = this;
    var chatId = self.chatId;

    this.chatd.cmd(Chatd.Opcode.BROADCAST, chatId, base64urldecode(u_handle) + bCastCode);
};

/**
 * Resend all (OR only a specific) messages
 * @param [restore] {Boolean}
 */
Chatd.Messages.prototype.resend = function(restore) {
    var self = this;
    restore = (typeof restore === 'undefined') ? false : restore;
    // resend all pending new messages and modifications
    var mintimestamp = Math.floor(new Date().getTime()/1000);
    var lastexpiredpendingkey = null;
    var trivialmsgs = [];
    this.sendingList.forEach(function(msgxid) {
        if (mintimestamp - self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.TIMESTAMP] <= MESSAGE_EXPIRY) {
            if (self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.TYPE] === Chatd.MsgType.KEY) {
                lastexpiredpendingkey = null;
            }
            if (self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.TYPE] === Chatd.MsgType.EDIT) {
                var messagekey = self.getmessagekey(self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.MSGID],
                        Chatd.MsgType.MESSAGE);
                // if the edit is pending on the original message, then wait.
                if (self.sending[messagekey]) {
                    return;
                }
            }
            var messageConstructs = [];
            messageConstructs.push({
                    "msgxid":self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.MSGID],
                    "timestamp":self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.TIMESTAMP],
                    "keyid":self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.KEYID],
                    "updated":self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.UPDATED],
                    "message":self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.MESSAGE],
                    "type":self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.TYPE]
                });

            self.chatd.chatIdShard[self.chatId].msg(
                self.chatId,
                messageConstructs
            );
        }
        else {
            // if it is an expired message, require manul send.
            if (self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.TYPE] === Chatd.MsgType.MESSAGE) {

                self.chatd.trigger('onMessageUpdated', {
                    chatId: base64urlencode(self.chatId),
                    userId: base64urlencode(self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.USERID]),
                    messageId: base64urlencode(self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.MSGID]),
                    id: self.sending[msgxid]>>>0,
                    state: restore ? 'RESTOREDEXPIRED' : 'EXPIRED',
                    keyid: self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.KEYID],
                    message: self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.MESSAGE],
                    ts:self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.TIMESTAMP]
                });
            }
            // if it is an expired edit, throw it away.
            else if (self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.TYPE] === Chatd.MsgType.EDIT) {
                trivialmsgs.push(msgxid);
            }
            // if it is an expired key
            else if (self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.TYPE] === Chatd.MsgType.KEY) {
                // if it an expired pending key
                if (((self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.KEYID] & 0xffff0000) >>>0)
                    === (0xffff0000 >>>0)) {
                    lastexpiredpendingkey = msgxid;
                }
            }
            self.expired[msgxid] = 1;
        }
    });
    // the last key is an expired pending key, it is possible it may not be delivered to chatd, so flag
    // strongvelope to include the key next time it sends out a message.
    if (!restore && lastexpiredpendingkey) {
        self.chatd.trigger('onMessageIncludeKey', {
            chatId: base64urlencode(self.chatId),
            userId: base64urlencode(self.sendingbuf[self.sending[lastexpiredpendingkey]][Chatd.MsgField.USERID]),
            messageId: base64urlencode(self.sendingbuf[self.sending[lastexpiredpendingkey]][Chatd.MsgField.MSGID])
        });
    }
    for (var msgkeyid in trivialmsgs) {
        self.discard(trivialmsgs[msgkeyid]);
    }
};

// after a reconnect, we tell the chatd the oldest and newest buffered message
Chatd.Messages.prototype.joinrangehist = function(chatId) {
    var low, high;
    // console.error("RANGE: ", chatId);

    for (low = this.lownum; low <= this.highnum; low++) {
        if (this.buf[low] && !this.sending[this.buf[low][Chatd.MsgField.MSGID]] &&
            (this.buf[low][Chatd.MsgField.TYPE] === Chatd.MsgType.MESSAGE)) {
            for (high = this.highnum; high > low; high--) {
                if (!this.sending[this.buf[high][Chatd.MsgField.MSGID]] &&
                    (this.buf[low][Chatd.MsgField.TYPE] === Chatd.MsgType.MESSAGE)) break;
            }

            this.chatd.cmd(Chatd.Opcode.JOINRANGEHIST, chatId,
                this.buf[low][Chatd.MsgField.MSGID] + this.buf[high][Chatd.MsgField.MSGID]);
            this.chatd.trigger('onMessagesHistoryRequest', {
                count: 32,
                chatId: base64urlencode(chatId)
            });
            break;
        }
    }
};

// msgid can be false in case of rejections
Chatd.prototype.msgconfirm = function(msgxid, msgid) {
    // CHECK: is it more efficient to keep a separate mapping of msgxid to Chatd.Messages?
    for (var chatId in this.chatIdMessages) {
        if (this.chatIdMessages[chatId]) {
            var messagekey = this.chatIdMessages[chatId].getmessagekey(msgxid, Chatd.MsgType.MESSAGE);
            if (this.chatIdMessages[chatId].sending[messagekey]) {
                this.chatIdMessages[chatId].confirm(chatId, msgxid, msgid);
                break;
            }
        }
    }
};

// msg is rejected as it have already been sent, and the msgid is the confirmed msg id.
Chatd.prototype.msgreject = function(msgxid, msgid) {
    // CHECK: is it more efficient to keep a separate mapping of msgxid to Chatd.Messages?
    for (var chatId in this.chatIdMessages) {
        if (this.chatIdMessages[chatId]) {
            var messagekey = this.chatIdMessages[chatId].getmessagekey(msgxid, Chatd.MsgType.MESSAGE);
            if (this.chatIdMessages[chatId].sending[messagekey]) {
                this.chatIdMessages[chatId].reject(msgxid, msgid);
                break;
            }
        }
    }
};

// msgid can be false in case of rejections
Chatd.prototype.editreject = function(chatId, msgid) {
    // CHECK: is it more efficient to keep a separate mapping of msgxid to Chatd.Messages?
    if (this.chatIdMessages[chatId]) {
        this.chatIdMessages[chatId].rejectedit(msgid);
    }
};

// msgid can be false in case of rejections
Chatd.prototype.keyconfirm = function(chatId, keyid) {

    if (this.chatIdMessages[chatId]) {
        this.chatIdMessages[chatId].confirmkey(keyid);
    }
};

// store a message from chatd to local cache
Chatd.prototype.msgstore = function(newmsg, chatId, userId, msgid, timestamp, updated, keyid, msg) {
    if (this.chatIdMessages[chatId]) {
        this.chatIdMessages[chatId].store(newmsg, userId, msgid, timestamp, updated, keyid, msg);
    }
};

// modify a message
Chatd.prototype.msgmodify = function(chatId, userid, msgid, updated, keyid, msg) {
    // an existing message has been modified
    if (this.chatIdMessages[chatId]) {
        this.chatIdMessages[chatId].msgmodify(userid, msgid, updated, keyid, msg);
    }
};

// send broadcast
Chatd.prototype.broadcast = function(chatId, bCastCode) {
    // an existing message has been modified
    if (this.chatIdMessages[chatId]) {
        this.chatIdMessages[chatId].broadcast(bCastCode);
    }
};

// discard a message
Chatd.prototype.discard = function(msgxid, chatId) {
    if (!chatId) {
        for (var cId in this.chatIdMessages) {
            if (this.chatIdMessages[cId]) {
                var messagekey = this.chatIdMessages[cId].getmessagekey(msgxid, Chatd.MsgType.MESSAGE);
                if (this.chatIdMessages[cId].sending[messagekey]) {
                    this.chatIdMessages[cId].discard(messagekey, true);
                    break;
                }
            }
        }
    }
    else {
        if (this.chatIdMessages[chatId]) {
            var messagekey = this.chatIdMessages[chatId].getmessagekey(msgxid, Chatd.MsgType.MESSAGE);
            if (this.chatIdMessages[chatId].sending[messagekey]) {
                this.chatIdMessages[chatId].discard(messagekey, true);
            }
        }
    }
};

// check a message
Chatd.prototype.msgcheck = function(chatId, msgid) {
    if (this.chatIdMessages[chatId]) {
        this.chatIdMessages[chatId].check(chatId, msgid);
    }
};

// get a message reference list
Chatd.prototype.msgreferencelist = function(chatId) {
    if (this.chatIdMessages[chatId]) {
        return this.chatIdMessages[chatId].getreferencelist();
    }
};

// msg is rejected and the confirmed msg id is msgid
Chatd.Messages.prototype.reject = function(msgxid, msgid) {
    var self = this;

    var messagekey = self.getmessagekey(msgxid, Chatd.MsgType.MESSAGE);
    var num = self.sending[messagekey];
    if (!num) {
        return ;
    }
    self.chatd.trigger('onMessageUpdated', {
        chatId: base64urlencode(self.chatId),
        userId: base64urlencode(self.sendingbuf[num][Chatd.MsgField.USERID]),
        messageId: base64urlencode(self.sendingbuf[num][Chatd.MsgField.MSGID]),
        id: num >>> 0,
        state: 'DISCARDED',
        keyid: self.sendingbuf[num][Chatd.MsgField.KEYID],
        message: self.sendingbuf[num][Chatd.MsgField.MESSAGE]
    });
    var editmessagekey = self.getmessagekey(msgxid, Chatd.MsgType.EDIT);
    var editmsgnum = self.sending[editmessagekey];
    // we now have a proper msgid, resend MSGUPDX in case the edit crossed the execution of the command
    if (self.sendingbuf[editmsgnum]) {
        var neweditmessagekey = self.getmessagekey(msgid, Chatd.MsgType.EDIT);
        var msgnum = self.getmessagenum(msgid);
        var neweditkeyid = msgnum ? 
            self.buf[msgnum][Chatd.MsgField.KEYID] : self.sendingbuf[editmsgnum][Chatd.MsgField.KEYID];
        self.sendingbuf[++self.sendingnum] = 
            [msgid,
            self.chatd.userId,
            self.sendingbuf[editmsgnum][Chatd.MsgField.TIMESTAMP],
            self.sendingbuf[editmsgnum][Chatd.MsgField.MESSAGE],
            neweditkeyid,
            self.sendingbuf[editmsgnum][Chatd.MsgField.UPDATED],
            self.sendingbuf[editmsgnum][Chatd.MsgField.TYPE]
            ];
        self.sending[neweditmessagekey] = self.sendingnum;
        self.sendingList.push(neweditmessagekey);
        self.persist(neweditmessagekey);

        self.chatd.chatIdShard[self.chatId].msgupd(self.chatId, msgid,
            self.sendingbuf[editmsgnum][Chatd.MsgField.UPDATED],
            self.sendingbuf[editmsgnum][Chatd.MsgField.MESSAGE], neweditkeyid);
        self.discard(editmessagekey);
    }
    self.discard(messagekey);
};

// msgid can be false in case of rejections
Chatd.Messages.prototype.confirm = function(chatId, msgxid, msgid) {
    var self = this;

    var messagekey = self.getmessagekey(msgxid, Chatd.MsgType.MESSAGE);
    var num = self.sending[messagekey];
    if (!num) {
        return ;
    }

    if (msgid === false) {
        self.chatd.trigger('onMessageUpdated', {
            chatId: base64urlencode(self.chatId),
            userId: base64urlencode(self.sendingbuf[num][Chatd.MsgField.USERID]),
            messageId: base64urlencode(msgid),
            id: num >>> 0,
            state: 'DISCARDED',
            keyid: self.sendingbuf[num][Chatd.MsgField.KEYID],
            message: self.sendingbuf[num][Chatd.MsgField.MESSAGE]
        });
    }
    else {
        var id = ++self.highnum;
        self.buf[id] = self.sendingbuf[num];
        self.buf[id][Chatd.MsgField.MSGID] = msgid;
        self.chatd.trigger('onMessageStore', {
            chatId: base64urlencode(self.chatId),
            id: id,
            pendingid: num >>> 0,
            messageId: base64urlencode(msgid),
            userId: base64urlencode(self.buf[id][Chatd.MsgField.USERID]),
            ts: self.buf[id][Chatd.MsgField.TIMESTAMP],
            updated: self.buf[id][Chatd.MsgField.UPDATED],
            keyid : self.buf[id][Chatd.MsgField.KEYID],
            message: self.buf[id][Chatd.MsgField.MESSAGE],
            isNew: true
        });

        var editmessagekey = self.getmessagekey(msgxid, Chatd.MsgType.EDIT);
        // if we have a pending edit, discard it as the NEWMSG should use the edited content.
        if (self.sending[editmessagekey]) {
            self.discard(editmessagekey);
        }
    }
    self.discard(messagekey);
};

// store message into message buf.
Chatd.Messages.prototype.store = function(newmsg, userId, msgid, timestamp, updated, keyid, msg) {
    var id;

    if (newmsg) {
        id = ++this.highnum;
    }
    else {
        id = this.lownum--;
    }

    // store message
    this.buf[id] = [msgid, userId, timestamp, msg, keyid, updated, Chatd.MsgType.MESSAGE];

    this.chatd.trigger('onMessageStore', {
        chatId: base64urlencode(this.chatId),
        id: id,
        messageId: base64urlencode(msgid),
        userId: base64urlencode(userId),
        ts: timestamp,
        updated: updated,
        keyid : keyid,
        message: msg,
        isNew: newmsg
    });
};

// modify a message from message buffer
Chatd.Messages.prototype.msgmodify = function(userid, msgid, updated, keyid, msg) {
    // CHECK: is it more efficient to maintain a full hash msgid -> num?
    // FIXME: eliminate namespace clash collision risk
    var msgnum = this.lownum;
    var messagekey = this.getmessagekey(msgid, Chatd.MsgType.EDIT);
    for (var i = this.highnum; i > this.lownum; i--) {
        if (this.buf[i] && this.buf[i][Chatd.MsgField.MSGID] === msgid) {
            // if we modified the message, remove from this.modified.

            this.buf[i][Chatd.MsgField.MESSAGE] = msg;
            this.buf[i][Chatd.MsgField.UPDATED] = updated;

            if (keyid === 0) {
            // if this is message truncate
                this.chatd.trigger('onMessageUpdated', {
                    chatId: base64urlencode(this.chatId),
                    userId: base64urlencode(userid),
                    id: i,
                    state: 'TRUNCATED',
                    keyid: keyid,
                    message: msg,
                    messageId : base64urlencode(msgid),
                });
                msgnum = i;
            } else {
                this.chatd.trigger('onMessageUpdated', {
                    chatId: base64urlencode(this.chatId),
                    userId: base64urlencode(this.buf[i][Chatd.MsgField.USERID]),
                    id: i,
                    state: 'EDITED',
                    keyid: keyid,
                    message: msg,
                    messageId : base64urlencode(msgid),
                    updated: updated
                });
                this.discard(messagekey);
                break;
            }
        }
        if (keyid === 0) {
        // if this is message truncate
            if (i < msgnum && this.buf[i]) {
                // clear pending list if there is any.
                this.discard(messagekey);
                delete this.buf[i];
            }
        }
    }
};

// discard message from message queue
Chatd.Messages.prototype.discard = function(messagekey, notify) {
    notify = (typeof notify === 'undefined') ? false : notify;
    var self = this;
    var num = self.sending[messagekey];
    if (!num) {
        return false;
    }
    if (notify) {
        self.chatd.trigger('onMessageUpdated', {
            chatId: base64urlencode(self.chatId),
            userId: base64urlencode(self.sendingbuf[num][Chatd.MsgField.USERID]),
            messageId: base64urlencode(self.sendingbuf[num][Chatd.MsgField.MSGID]),
            id: num >>> 0,
            state: 'DISCARDED',
            keyid: self.sendingbuf[num][Chatd.MsgField.KEYID],
            message: self.sendingbuf[num][Chatd.MsgField.MESSAGE]
        });
        watchdog.notify('chat_event', {
            chatId: base64urlencode(self.chatId),
            userId: base64urlencode(self.sendingbuf[num][Chatd.MsgField.USERID]),
            messageId: base64urlencode(self.sendingbuf[num][Chatd.MsgField.MSGID]),
            state: 'DISCARDED'});
    }

    self.removefrompersist(messagekey);
    removeValue(self.sendingList, messagekey);
    delete self.sending[messagekey];
    delete self.sendingbuf[num];
    if (self.expired[messagekey]) {
        delete self.expired[messagekey];
    }
    return true;
};

// discard edits from pending list
Chatd.Messages.prototype.rejectedit = function(msgid) {
    var messagekey = this.getmessagekey(msgid, Chatd.MsgType.EDIT);
    this.discard(messagekey);
};

// key confirmation in message buffer
Chatd.Messages.prototype.confirmkey = function(keyid) {
    var self = this;
    // when a key is confirmed, it will remove the key from the sending list, 
    // and update the keyid of the confirmed key in persistency list,
    // in case that the chat messages are truncated and it will not get the key from chatd after a refresh.
    var firstkeyxkey;
    this.sendingList.forEach(function(msgxid) {
        if ((!self.expired[msgxid]) &&
                (self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.TYPE] === Chatd.MsgType.KEY)) {
            firstkeyxkey = msgxid;
            return;
        }
    });
    var promises = [];

    // update keyid of the confirmed key in persistency list.
    var cacheKey = base64urlencode(self.chatId) + ":" + firstkeyxkey;
    promises.push(
        self.chatd.messagesQueueKvStorage.getItem(cacheKey).done(
        function(v) {
            if (v) {
                self.chatd.messagesQueueKvStorage.setItem(cacheKey, {
                    'messageId' : v.messageId,
                    'userId' : v.userId,
                    'timestamp' : v.timestamp,
                    'message' : v.message,
                    'keyId' : keyid,
                    'updated' : v.updated,
                    'type' : v.type
                });
                self.chatd.messagesQueueKvStorage.flush();
            }
        })
    );

    var prefix = base64urlencode(self.chatId);
    var iskey = false;
    var previouskeyid;
    var trivialkeys = [];

    promises.push(
        self.chatd.messagesQueueKvStorage.eachPrefixItem(prefix, function(v, k) {

            if (v.userId === self.chatd.userId) {
                if (v.type === Chatd.MsgType.KEY) {
                    // if the previous message is a key message, then the previous key is a trivial key.
                    if (iskey) {
                        trivialkeys.push(self.getmessagekey(previouskeyid, Chatd.MsgType.KEY));
                    }
                    iskey = true;
                    previouskeyid = v.messageId;
                }
                else {
                    iskey =false;
                }
            }
        })
    );

    var _updatekeyid = function() {
        for (var keyidmsgid in trivialkeys) {
            self.removefrompersist(trivialkeys[keyidmsgid]);
        }
        // remove the key message from the local pending list.
        removeValue(self.sendingList, firstkeyxkey);
        delete self.sendingbuf[self.sending[firstkeyxkey]];
        delete self.sending[firstkeyxkey];
        self.updatekeyid(keyid);
    };

    MegaPromise.allDone(promises).always(function() {
        _updatekeyid();
    });
};

// get msg number from msgid, wonder there should be a more efficient way to do this.
Chatd.Messages.prototype.getmessagenum = function(msgid) {
    var msgnum = null;
     for (var i = this.highnum; i > this.lownum; i--) {
        if (this.buf[i] && this.buf[i][Chatd.MsgField.MSGID] === msgid) {
            msgnum = i;
            break;
        }
    }
    return msgnum;
};

// generate a key from message id and message type
Chatd.Messages.prototype.getmessagekey = function(msgid, type) {
    return msgid + "-" + type ;
};

// persist a message or message buffer
Chatd.Messages.prototype.persist = function(messagekey) {
    var self = this;

    if (!messagekey) {
        self.sendingList.forEach(function(msgxid) {
            var cacheKey = base64urlencode(self.chatId) + ":" + msgxid;
            var num = self.sending[msgxid];
            if (num) {
                self.chatd.messagesQueueKvStorage.setItem(cacheKey, {
                    'messageId' : self.sendingbuf[num][Chatd.MsgField.MSGID],
                    'userId' : self.sendingbuf[num][Chatd.MsgField.USERID],
                    'timestamp' : self.sendingbuf[num][Chatd.MsgField.TIMESTAMP],
                    'message' : self.sendingbuf[num][Chatd.MsgField.MESSAGE],
                    'keyId' : self.sendingbuf[num][Chatd.MsgField.KEYID],
                    'updated' : self.sendingbuf[num][Chatd.MsgField.UPDATED],
                    'type' : self.sendingbuf[num][Chatd.MsgField.TYPE]
                });
                self.chatd.messagesQueueKvStorage.flush();
            }
        });
    }
    else {
        var num = self.sending[messagekey];
        if (num) {
            var cacheKey = base64urlencode(self.chatId) + ":" + messagekey;
            self.chatd.messagesQueueKvStorage.setItem(cacheKey, {
                'messageId' : self.sendingbuf[num][Chatd.MsgField.MSGID],
                'userId' : self.sendingbuf[num][Chatd.MsgField.USERID],
                'timestamp' : self.sendingbuf[num][Chatd.MsgField.TIMESTAMP],
                'message' : self.sendingbuf[num][Chatd.MsgField.MESSAGE],
                'keyId' : self.sendingbuf[num][Chatd.MsgField.KEYID],
                'updated' : self.sendingbuf[num][Chatd.MsgField.UPDATED],
                'type' : self.sendingbuf[num][Chatd.MsgField.TYPE]
            });
            self.chatd.messagesQueueKvStorage.flush();
        }
    }
};

// remove a message from persistency list
Chatd.Messages.prototype.removefrompersist = function(messagekey) {
    var self = this;
    var cacheKey = base64urlencode(self.chatId) + ":" + messagekey;
    self.chatd.messagesQueueKvStorage.removeItem(cacheKey);
    self.chatd.messagesQueueKvStorage.flush();
};

// restore persisted messages to sending buffer
Chatd.Messages.prototype.restore = function() {
    var self = this;
    var prefix = base64urlencode(self.chatId);
    var count = 0;
    var tempkeyid = 0xffff0001;
    var pendingkey = false;
    var promises = [];
    var keys = [];
    var iskey = false;
    var previouskeyid;
    var trivialkeys = [];

    promises.push(
        self.chatd.messagesQueueKvStorage.eachPrefixItem(prefix, function(v, k) {
            if (v.userId === self.chatd.userId) {
                if (v.type === Chatd.MsgType.KEY ) {
                    // if the previous message is a key message, then the previous key is a trivial key.
                    if (iskey) {
                        trivialkeys.push( self.getmessagekey(previouskeyid, v.type));
                    }
                    if (((v.keyId & 0xffff0000) >>>0 ) === (0xffff0000 >>>0 )) {
                        pendingkey = true;
                        ++tempkeyid;
                        v.keyId = tempkeyid;
                    } else {
                        pendingkey = false;
                    }

                    var index = 0;
                    var len = v.message.length;

                    while (index < len) {
                        var recipient = v.message.substr(index, 8);
                        var keylen = self.chatd.unpack16le(v.message.substr(index + 8,2));
                        var key = v.message.substr(index + 10, keylen);
                        if (recipient === v.userId) {
                            keys.push({
                                'userId' : base64urlencode(v.userId),
                                'key' : key,
                                'keyid' : v.keyId
                            });
                            break;
                        }
                        index += (10 + keylen);
                    }
                    iskey = true;
                    previouskeyid = v.messageId;
                }
                else {
                    iskey = false;
                }
                if ((v.type !== Chatd.MsgType.KEY) || ((v.type === Chatd.MsgType.KEY) && pendingkey)) {
                    if (pendingkey ) {
                        v.keyId = tempkeyid;
                    }
                    // if the message is not an edit or an edit with the original message not in the 
                    // pending list, restore it.
                    var messagekey = self.getmessagekey(v.messageId, v.type);
                    self.sendingbuf[++self.sendingnum] =
                        [v.messageId, v.userId, v.timestamp, v.message, v.keyId, v.updated, v.type];
                    self.sending[messagekey] = self.sendingnum;
                    self.sendingList.push(messagekey);
                    count++;
                }
            }
        })
    );
    var _resendPending = function() {
        if (iskey) {
            trivialkeys.push(self.getmessagekey(previouskeyid, Chatd.MsgType.KEY));
        }
        for (var keyid in trivialkeys) {
            self.removefrompersist(trivialkeys[keyid]);
        }
        if (count > 0) {
            self.chatd.trigger('onMessageKeyRestore',
                {
                    chatId: base64urlencode(self.chatId),
                    keyxid : tempkeyid,
                    keys  : keys
                }
            );
            self.resend(true);
        }
    };
    MegaPromise.allDone(promises).always(function() {
        _resendPending();
    });
};

// check a message
Chatd.Messages.prototype.check = function(chatId, msgid) {
    if (Object.keys(this.buf).length === 0) {
        this.chatd.trigger('onMessageCheck', {
            chatId: base64urlencode(chatId),
            messageId: base64urlencode(msgid)
        });
    }

    // If this message does not exist in the history, a HIST should be called. However, this should be handled in the
    // implementing code (which tracks more info regarding the actual history, messages, last recv/delivered, etc
};

// get a list of reference messages
Chatd.Messages.prototype.getreferencelist = function() {

    var ranges = [0,1,2,3,4,5,6];
    var refs =[];
    var index = 0;
    var min = 0;
    var max = 0;
    var pendinglen = this.sendingList.length;

    for (var index = 0;index < ranges.length; index++) {
        max = 1 << ranges[index];
        // if there are not enough buffered messages, bail out.
        if (max > (this.highnum - this.lownum) + pendinglen) {
            break;
        }
        var num = Math.floor(Math.random() * (max - min)) + min;
        if (num < pendinglen) {
            var msgkey = this.sendingList[pendinglen - num - 1];
            if (this.sending[msgkey]) {
                refs.push((this.sending[msgkey] >>> 0));
            }
        }
        else {
            var i = this.highnum - (num - pendinglen);
            if (this.buf[i]) {
                refs.push(base64urlencode(this.buf[i][Chatd.MsgField.MSGID]));
            }
        }
        min = max;
    }
    max = (this.highnum - this.lownum);
    if (max > min) {
        var num = Math.floor(Math.random() * (max - min)) + min;
        var i = this.highnum - num;
        if (this.buf[i]) {
            refs.push(base64urlencode(this.buf[i][Chatd.MsgField.MSGID]));
        }
    }

    return refs;
};

// utility functions
Chatd.prototype.pack32le = function(x) {
    var r = '';

    for (var i = 4; i--; ) {
        r += String.fromCharCode(x & 255);
        x >>>= 8;
    }

    return r;
};

Chatd.prototype.unpack32le = function(x) {
    var r = 0;

    for (var i = 4; i--; ) {
        r = ((r << 8) >>>0 )+x.charCodeAt(i);
    }

    return r;
};

Chatd.prototype.pack16le = function(x) {
    var r = '';

    for (var i = 2; i--; ) {
        r += String.fromCharCode(x & 255);
        x >>>= 8;
    }

    return r;
};

Chatd.prototype.unpack16le = function(x) {
    var r = 0;

    for (var i = 2; i--; ) {
        r = ((r << 8) >>> 0 )+x.charCodeAt(i);
    }

    return r;
};
