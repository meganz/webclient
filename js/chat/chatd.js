// chatd interface
// jshint -W089

var CHATD_TAG = localStorage.chatdTag ? localStorage.chatdTag : '6';

var Chatd = function(userId, megaChat, options) {
    var self = this;

    self.megaChat = megaChat;

    // maps the chatd shard number to its corresponding Chatd.Shard object
    self.shards = {};

    // maps a chatId to the handling Chatd.Shard object
    self.chatIdShard = {};

    // maps chatIds to the Message object
    self.chatIdMessages = {};

    // local cache of the Message object
    self.messagesQueueKvStorage = new SharedLocalKVStorage("cqmsgs2");

    /**
     * Set to true when this chatd instance is (being) destroyed
     * @type {boolean}
     */
    self.destroyed = false;

    if (
        (
            ua.details.browser === "Chrome" ||
            ua.details.browser === "Firefox" ||
            ua.details.browser === "Opera"
        ) && ChatdPersist.isMasterTab()
    ) {
        self.chatdPersist = new ChatdPersist(self);
    }

    // random starting point for the new message transaction ID
    // FIXME: use cryptographically strong PRNG instead
    // CHECK: is this sufficiently collision-proof? a collision would have to occur in the same second for the same
    // userId.
    self.msgTransactionId = '';
    self.userId = base64urldecode(userId);

    for (var i = 8; i--;) {
        self.msgTransactionId += String.fromCharCode(Math.random() * 256);
    }

    self.logger = new MegaLogger("chatd", {
        minLogLevel: function() {
            return Chatd.LOGGER_LEVEL;
        }
    });

    // Initialize with a dummy webrtc event handler
    /* jshint -W098 */
    self.rtcHandler = self.defaultRtcHandler = {
        handleMessage: function(shard, msg, len) {},
        onClientLeftCall: function(chat, userid, clientid) {},
        onClientJoinedCall: function(chat, userid, clientid) {},
        onKickedFromChatroom: function(chat) {},
        handleCallData: function(shard, cmd, payloadLen) {
            var type = cmd.charCodeAt(31);
            if (type === CallDataType.kRinging) {
                var chatid = cmd.substr(1, 8);
                var userid = cmd.substr(9, 8);
                var clientid = cmd.substr(17, 4);
                var callid = cmd.substr(23, 8);
                shard.rtcmd(chatid, userid, clientid, RTCMD.CALL_REQ_DECLINE,
                    callid + String.fromCharCode(Term.kErrNotSupported));
            }
        },
        onShutdown: function() {},
        onChatOnline: function(chat) {}
    };
    /* jshint +W098 */

    // load persistent client id, or generate one if none was stored
    //    self.identity = localStorage['chatdIdentity'];
    //    if (!self.identity) {
    self.identity = Chatd.pack32le((Math.random() * 0xffffffff) | 0) +
                    Chatd.pack16le((Math.random() * 0xffff) | 0) +
                    Chatd.pack16le(Date.now() & 0xffff);

    localStorage.setItem('chatdIdentity', base64urlencode(self.identity));

    self.logger.debug("Generated new client identity: " + Chatd.clientIdToString(self.identity));
    //    } else {
    //        self.identity = base64urldecode(self.identity);
    //        assert(self.identity.length === 8);
    //    }

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
        // 'onMessageKeysDone',
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
    window.addEventListener('beforeunload', function() {
        self.shutdown();
    });

    this._proxyEventsToRooms();
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
    'CLIENTID': 24,
    'RTMSG_BROADCAST': 25,
    'RTMSG_USER': 26,
    'RTMSG_ENDPOINT': 27,
    'INCALL': 28,
    'ENDCALL': 29,
    'KEEPALIVEAWAY': 30,
    'CALLDATA': 31,
    'ECHO': 32,
    'ADDREACTION': 33,
    'DELREACTION': 34,
    'OPCODE_HANDLEJOIN': 36,
    'OPCODE_HANDLEJOINRANGEHIST': 37,
    'CALLTIME': 42,
    'NEWNODEMSG': 44,
    'NODEHIST': 45,
    'NUMBYHANDLE': 46,
    'HANDLELEAVE': 47,
    'REACTIONSN': 48,
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

Chatd.MAX_KEEPALIVE_DELAY = 45000;
Chatd.KEEPALIVE_PING_INTERVAL = 20000;

// 1 hour is agreed by everyone.
Chatd.MESSAGE_EXPIRY = 60 * 60; // 60*60
var MESSAGE_EXPIRY = Chatd.MESSAGE_EXPIRY;

Chatd.MESSAGE_HISTORY_LOAD_COUNT = 32;
Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL = 3;

Chatd.LOGGER_ENABLED = !!localStorage.chatdLogger;
Chatd.LOGGER_LEVEL =
    Chatd.LOGGER_ENABLED ? MegaLogger.LEVELS.DEBUG : d > 1 ? MegaLogger.LEVELS.WARN : MegaLogger.LEVELS.ERROR;

Chatd.VERSION = 1;
// The per-chat state of the join/login sequence. It can also be null if we are no longer
// part of that chatroom (i.e. -1 privilege)
var LoginState = Chatd.LoginState = Object.freeze({
    DISCONN: 0,
    JOIN_SENT: 1,
    JOIN_RECEIVED: 2,
    HISTDONE: 3
});

/**
 * Global sendingnum (for generating msxid). Reasonably high id for pending messages in buf.
 *
 * @type {Number}
 */
Chatd.sendingnum = 2 << 30;


Chatd.prototype._proxyEventsToRooms = function() {
    "use strict";
    var self = this;
    [
        'onMessagesHistoryDone',
        'onMessageStore',
        'onMessageKeysDone',
        'onMessageKeyRestore',
        'onMessageLastSeen',
        'onMessageLastReceived',
        'onMessagesHistoryRequest',
        'onBroadcast',
        'onRoomDisconnected',
        'onMembersUpdated',
        'onMessageConfirm',
        'onMessageUpdated',
        'onMessagesHistoryRetrieve',
        'onMessageCheck',
        'onMessagesKeyIdDone',
        'onMessageIncludeKey',
        'onMarkAsJoinRequested',
        'onAddReaction',
        'onDelReaction',
        'onReactionSn',
        'onAddDelReactionReject'
    ]
        .forEach(function(eventName) {
            self.rebind(eventName + '.chatdProxy', function(e, eventData) {
                assert(eventData.chatId, 'chatid is missing');
                var chatRoom = megaChat.getChatById(eventData.chatId);
                if (chatRoom) {
                    chatRoom.trigger(eventName, eventData);
                }
                else {
                    if (d) {
                        console.warn("chatRoom was missing for event:", eventName, eventData);
                    }
                }
            });
        });
};

// add a new chatd shard
Chatd.prototype._addShardAndChat = function(chatId, shardNo, url) {
    // instantiate Chatd.Shard object for this shard if needed
    var shard = this.shards[shardNo];

    var isNewShard;
    if (!shard) {
        isNewShard = true;
        shard = this.shards[shardNo] = new Chatd.Shard(this, shardNo);
    }
    // always update the URL to give the API an opportunity to migrate chat shards between hosts
    shard.url = url;

    // map chatId to this shard
    this.chatIdShard[chatId] = shard;

    // add chatId to the connection's chatIds
    var chat = this.chatIdMessages[chatId] = new Chatd.Messages(this, shard, chatId);
    shard.chatIds[chatId] = true;
    if (isNewShard) {
        // attempt a connection ONLY if this is a new shard.
        shard.reconnect();
    } else {
        chat.join();
    }
    return isNewShard;
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
    self.userRequestedJoin = {};
    self.mcurlRequests = {};

    // queued commands
    self.cmdq = '';
    self.histRequests = {};

    self.logger = new MegaLogger(
        "shard-" + shard, {
            minLogLevel: function() {
                return Chatd.LOGGER_LEVEL;
            }
        },
        chatd.logger
    );
    self.loggerIsEnabled = Chatd.LOGGER_ENABLED;

    /**
     * Will initialise/reset a timer that would force reconnect the shard connection IN case that the keep alive is not
     * received during a delay of max `Chatd.MAX_KEEPALIVE_DELAY` ms
     *
     * @type {KeepAlive}
     */
    self.keepAlive = new KeepAlive(Chatd.MAX_KEEPALIVE_DELAY, function() {
        if (self.s && self.s.readyState === self.s.OPEN) {
            self.logger.error("Server heartbeat missed/delayed. Will force reconnect.");

            // current connection is active, but the keep alive detected delay of the keep alive. reconnect!
            self.disconnect();
            self.reconnect();
        }
    });

    /**
     * Every Xs (usually 30s), we would ping the chatd server with either OpCode.KEEPALIVE or KEEPALIVEAWAY.
     *
     * @type {KeepAlive}
     */
    self.keepAlivePing = new KeepAlive(Chatd.KEEPALIVE_PING_INTERVAL, function() {
        self.sendKeepAlive();
    });


    self.destroyed = false;

    self.connectionRetryManager = new ConnectionRetryManager(
        {
            functions: {
                reconnect: function(connectionRetryManager) {
                    connectionRetryManager.pause();

                    self.retrieveMcurlAndExecOnce(base64urlencode(Object.keys(self.chatIds)[0]))
                        .then(function(mcurl) {
                            connectionRetryManager.unpause();
                            self.url = mcurl;
                            self.reconnect();
                        })
                        .catch(function(ex) {
                            self.logger.warn(ex);

                            if (ex === EEXPIRED) {
                                megaChat.plugins.chatdIntegration.requiresUpdate();
                            }
                            else {
                                connectionRetryManager.resetConnectionRetries();
                            }
                        });
                },
                /**
                 * A Callback that will trigger the 'forceDisconnect' procedure for this type of connection
                 * (Karere/Chatd/etc)
                 * @param connectionRetryManager {ConnectionRetryManager}
                 */
                forceDisconnect: function(connectionRetryManager) {
                    return self.disconnect();
                },
                /**
                 * Should return true or false depending on the current state of this connection,
                 * e.g. (connected || connecting)
                 * @param connectionRetryManager {ConnectionRetryManager}
                 * @returns {bool}
                 */
                isConnectedOrConnecting: function(connectionRetryManager) {
                    return (
                        self.s && (
                            self.s.readyState === self.s.CONNECTING ||
                            self.s.readyState === self.s.OPEN
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
                            self.s.readyState === self.s.OPEN
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
                        !self.s || self.s.readyState === self.s.CLOSED
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

    Object.defineProperty(self, 'userIsActive', {
        get: function() {
            return megaChat.activeCallManagerCall || mega.active;
        }
    });

    var ooa = window.onactivity;
    window.onactivity = function() {
        if (ooa) {
            onIdle(ooa);
        }
        delay('chatd:shard:activity.' + shard, function() {
            // restart would also "start" the keepalive tracker, which is
            // not something we want in case chatd is not yet connected.
            if (self.isOnline()) {
                self.sendKeepAlive(true);
                self.keepAlive.restart();
                self.keepAlivePing.restart();
            }
        }, 3e4);
    };

    // HistoryDone queue manager

    self.chatd.rebind('onMessagesHistoryDone.histQueueManager' + shard, function(e, eventData) {
        var chatIdDecoded = base64urldecode(eventData.chatId);
        if (self.histRequests[chatIdDecoded] && self.histRequests[chatIdDecoded].resolve) {
            self.histRequests[chatIdDecoded].resolve();
        }
    });
};


Chatd.Shard.prototype.markAsJoinRequested = function(chatId) {
    "use strict";
    if (!this.userRequestedJoin[chatId]) {
        this.chatd.trigger('onMarkAsJoinRequested', {
            chatId: base64urlencode(chatId)
        });
        this.userRequestedJoin[chatId] = true;

        var self = this;
        Reactions.getSn(base64urlencode(chatId))
            .then(function(sn) {
                if (sn) {
                    self.cmd(
                        Chatd.Opcode.REACTIONSN,
                        chatId + base64urldecode(sn)
                    );
                }
            })
            .catch(function(ex) {
                // all fine, we are starting from a new/empty sn or server doesn't support Reactions
                if (d > 10) {
                    console.debug("getSn failed", ex);
                }
            });
    }
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


Chatd.Shard.prototype.retrieveMcurlAndExecOnce = promisify(function(resolve, reject, chatId) {
    'use strict';
    var publicChatHandle = anonymouschat && pchandle;
    var chatHandleOrId = chatId;

    if (publicChatHandle) {
        chatHandleOrId = pchandle;
    }
    else {
        var chatRoom = megaChat.getChatById(chatId);
        if (chatRoom && chatRoom.publicChatHandle) {
            publicChatHandle = chatRoom.publicChatHandle;
            chatHandleOrId = chatRoom.chatId;
        }
    }

    megaChat.plugins.chatdIntegration._retrieveShardUrl(publicChatHandle, chatHandleOrId)
        .then(function(ret) {
            if (typeof ret === "string") {
                resolve(ret);
            }
            else if (ret && ret.url) {
                resolve(ret.url);
            }
            else {
                reject(ret);
            }
        })
        .catch(reject);
});

// is this chatd connection currently active?
Chatd.Shard.prototype.isOnline = function() {
    return (!!this.s) && this.s.readyState === this.s.OPEN;
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

    if (self.s) {
        self.disconnect();
    }
    var chats = self.chatd.chatIdMessages;
    for (var chatid in self.chatIds) {
        var chat = chats[chatid];
        if (chat) {
            // seems at first connect self.chatIds is filled with ids,
            // but the chat objects in chatd.chatdIdMessages are not there
            chat._setLoginState(LoginState.DISCONN);
        }
    }

    self.s = new WebSocket(this.url + '/' + CHATD_TAG);
    self.s.binaryType = "arraybuffer";

    self.s.onopen = function() {
        self.keepAlive.restart();
        self.keepAlivePing.restart();
        self.logger.debug('chatd connection established');
        self.connectionRetryManager.gotConnected();

        self.cmdq = "";
        self.sendIdentity();

        if (!self.triggerSendIfAble(true)) {
            // XXX: websocket.send() failed for whatever reason, onerror should
            //      have been called and the connection restablished afterwards.
            self.logger.warn('chatd connection closed unexpectedly...');
            return;
        }

        self.rejoinexisting();

        self.chatd.trigger('onOpen', {
            shard: self
        });
        // Resending of pending message should be done via the integration code, since it have more info and a direct
        // relation with the UI related actions on pending messages (persistence, user can click resend/cancel/etc).
        // self.resendpending();
        self.triggerEventOnAllChats('onRoomConnected');
        if (!self.userIsActive) {
            self.sendKeepAlive(true);
        }
    };

    self.s.onerror = function(e) {
        self.logger.error("WebSocket error:", e);
        self.keepAlive.stop();
        self.connectionRetryManager.doConnectionRetry();
        self.histRequests = {};
        self.chatd.trigger('onError', {
            shard: self
        });
    };

    self.s.onmessage = function(e) {
        // verify that WebSocket frames are always delivered as a contiguous message
        self.exec(new Uint8Array(e.data));
    };

    self.s.onclose = function(e) {
        self.handleDisconnect();
    };
};

Chatd.Shard.prototype.handleDisconnect = function() {
    var self = this;
    if (!self.s) {
        return;
    }
    self.s.onclose = null;
    self.s.onerror = null;
    self.s.onopen = null;
    self.s.onmessage = null;
    self.s = null;

    self.logger.warn('chatd connection to shard ' + self.shard + ' lost, will eventually reconnect...');
    self.keepAlive.stop();
    self.keepAlivePing.stop();

    self.joinedChatIds = {};
    self.userRequestedJoin = {};
    self.mcurlRequests = {};
    self.triggerEventOnAllChats('onRoomDisconnected');
    self.histRequests = {};
    var chatd = self.chatd;
    var chats = chatd.chatIdMessages;
    for (var chatid in self.chatIds) {
        var chat = chats[chatid];
        assert(chat);
        chat._clearCallInfo();
        chats[chatid]._setLoginState(LoginState.DISCONN);
    }
    chatd.trigger('onClose', {
        shard: self
    });
    delete self.clientId;
    self.connectionRetryManager.gotDisconnected();
};

Chatd.Shard.prototype.disconnect = function() {
    var self = this;
    if (!self.s) {
        return;
    }
    self.s.close();
    if (self.s) {
        self.handleDisconnect();
    }
};

Chatd.Shard.prototype.sendIdentity = function() {
    assert(this.chatd.identity);
    this.cmd(Chatd.Opcode.CLIENTID, this.chatd.identity, true);
};

Chatd.clientIdToString = function(data, offset) {
    return '0x' + Chatd.dumpToHex(data, offset ? offset : 0, 4, true);
};

Chatd.logCmdsToString = function(logger, cmd, tx, prefix, isReconnect) {
    var result = Chatd.cmdsToArrayStrings(cmd, tx);
    if (!prefix) {
        prefix = tx ? "send:" : "recv:";
    }
    var len = result.length;
    if (len > 1) {
        prefix += "(multicmd#";
    }
    for (var k = 0; k < len; k++) {
        var line = result[k];
        logger.debug(isReconnect ? "initial cmdq flush:" : "", (len > 1) ? (prefix + k + ")") : prefix, line);
    }
};

/**
 * Parse string of command(s) to array
 *
 * @param cmd {String}
 * @param tx {boolean}
 * @returns [Array]
 */
Chatd.cmdsToArrayStrings = function(cmd, tx) {
    if (!cmd) {
        return [];
    }
    var lines = [];

    for (;;) {
        var ret = Chatd.cmdToString(cmd, tx);
        lines.push(ret[0]);
        var next = ret[1];
        if (next >= cmd.length) {
            return lines;
        }
        cmd = cmd.substr(next);
    }
};


Chatd.cmdToString = function(cmd, tx) {
    var opCode = cmd.charCodeAt(0);
    var result;
    if (opCode >= Chatd.Opcode.RTMSG_BROADCAST && opCode <= Chatd.Opcode.RTMSG_ENDPOINT) {
        var rtcmdInfo = RtcModule.rtcmdToString(cmd, tx, opCode);
        result = rtcmdInfo[0];
        return [result, rtcmdInfo[1]];
    }
    result = constStateToText(Chatd.Opcode, opCode);
    if (opCode === Chatd.Opcode.CALLDATA) {
        var ret = RtcModule.callDataToString(cmd, tx);
        result += ret[0];
        return [result, ret[1]];
    }
    // To ease debugging, please add more commands here when needed
    // (debugging = console grepping for ids, etc, so thats why, I'm parsing
    // them here and showing them in non-hex format)
    var chatId; // avoid declaring it in each 'case', to make JSHint happy
    switch (opCode) {
        case Chatd.Opcode.HISTDONE:
            chatId = base64urlencode(cmd.substr(1, 8));
            result += " chatId: " + chatId;
            return [result, 9];

        case Chatd.Opcode.BROADCAST:
            chatId = base64urlencode(cmd.substr(1, 8));
            var userId = base64urlencode(cmd.substr(9, 8));
            var bCastCode = cmd.substr(17, 1).charCodeAt(0);
            result += " chatId: " + chatId + " userId: " + userId + " bCastCode:" + bCastCode;
            return [result, 18];

        case Chatd.Opcode.NEWMSGID:
            var msgId = base64urlencode(cmd.substr(9, 8));
            var msgxid = base64urlencode(cmd.substr(1, 8));
            result += " msgxid: " + msgxid + " msgId: " + msgId;
            return [result, 17];

        case Chatd.Opcode.KEYID:
            chatId = base64urlencode(cmd.substr(1, 8));
            var keyxid = Chatd.unpack32le(cmd.substr(9, 4));
            var keyid = Chatd.unpack32le(cmd.substr(13, 4));

            result += " chatId: " + chatId + " keyXid: " + keyxid + " keyId: " + keyid;
            return [result, 17];

        case Chatd.Opcode.NEWKEY:
            // chatId + Chatd.pack32le(keyid) + Chatd.pack32le(message.length) + message
            var keyId = Chatd.unpack32le(cmd.substr(9, 4));
            var keyLength = Chatd.unpack32le(cmd.substr(13, 4));

            result += " chatid:" + base64urlencode(cmd.substr(1, 8)) +
                      " keyId: " + keyId + " keyLen: " + keyLength;
            return [result, 17 + keyLength];

        case Chatd.Opcode.CLIENTID:
            var clientId = cmd.substr(1, 4);
            result += " clientId: " + Chatd.clientIdToString(clientId);
            return [result, 9];

        case Chatd.Opcode.HIST:
            var histLen = Chatd.unpack32le(cmd.substr(9, 4));
            result += " chatId: " + base64urlencode(cmd.substr(1, 8)) + " len: " + (histLen - 4294967296);
            return [result, 13];

        case Chatd.Opcode.JOIN:
            chatId = base64urlencode(cmd.substr(1, 8));
            var userId = base64urlencode(cmd.substr(9, 8));
            var priv = cmd.charCodeAt(17);
            if (priv > 255) {
                priv = priv - 65536;
            } else if (priv > 127) {
                priv -= 256;
            }
            result += " chatId: " + chatId + " userId: " + userId +
                      " priv: " + constStateToText(Chatd.Priv, priv) + "(" + priv + ")";
            return [result, 18];

        case Chatd.Opcode.OPCODE_HANDLEJOIN:
            chatId = base64urlencode(cmd.substr(1, 6));
            var userId = base64urlencode(cmd.substr(7, 8));
            var priv = cmd.charCodeAt(15);

            result += " chatId: " + chatId + " userId: " + userId +
                      " priv: " + constStateToText(Chatd.Priv, priv) + "(" + priv + ")";
            return [result, 18];

        case Chatd.Opcode.SEEN:
            // self.chatd.cmd(Chatd.Opcode.SEEN, base64urldecode(chatRoom.chatId), base64urldecode(msgid));
            chatId = base64urlencode(cmd.substr(1, 8));
            var msgId = base64urlencode(cmd.substr(9, 8));
            result += " chatId: " + chatId + " msgId: " + msgId;
            return [result, 17];

        case Chatd.Opcode.JOINRANGEHIST:
            chatId = base64urlencode(cmd.substr(1, 8));
            var fromMsg = base64urlencode(cmd.substr(9, 8));
            var toMsg = base64urlencode(cmd.substr(17, 8));

            result += " chatId: " + chatId + " fromMsgId: " + fromMsg + " toMsgId: " + toMsg;
            return [result, 25];
        case Chatd.Opcode.OPCODE_HANDLEJOINRANGEHIST:
            chatId = base64urlencode(cmd.substr(1, 8));
            var fromMsg = base64urlencode(cmd.substr(9, 8));
            var toMsg = base64urlencode(cmd.substr(17, 8));

            result += " chatId: " + chatId + " fromMsgId: " + fromMsg + " toMsgId: " + toMsg;
            return [result, 25];

        case Chatd.Opcode.OLDMSG:
        case Chatd.Opcode.NEWMSG:
        case Chatd.Opcode.MSGUPD:
        case Chatd.Opcode.NEWNODEMSG:
            //     chatId + userId + msgid + Chatd.pack32le(timestamp) +
            //        8           8                   8           4
            //     Chatd.pack16le(0) + Chatd.pack32le(keyid) + Chatd.pack32le(message.length) + message];
            //        2                  4                       4               ...

            chatId = base64urlencode(cmd.substr(1, 8));
            var msgId = base64urlencode(cmd.substr(17, 8));
            var ts = Chatd.unpack32le(cmd.substr(25, 4));
            var keyid = Chatd.unpack32le(cmd.substr(31, 4));
            var msgLength = Chatd.unpack32le(cmd.substr(35, 4));
            // var msg = cmd.substr(39, msgLength);

            var sender = base64urlencode(cmd.substr(9, 8));
            result += " chatId: " + chatId +
                      (tx ? " to: " : " from: ") + sender +
                      " msgId: " + msgId +
                      " keyId: " + keyid +
                      " ts: (" + new Date(ts * 1000).toLocaleString() +
                      ") msgLen: " + msgLength;
            if (sender === strongvelope.COMMANDER) {
                var parsed = strongvelope._parseMessageContent(cmd.substr(39));
                result += " mgmt-type: " + constStateToText(strongvelope.MESSAGE_TYPES, parsed.type);
                switch (parsed.type) {
                    case strongvelope.MESSAGE_TYPES.CALL_END:
                        // call-end management message format is:
                        // callId.8 endCallReason.1 callDuration.4
                        var reason = parsed.payload.charCodeAt(8);
                        result += " callend-type: " + constStateToText(CallManager.CALL_END_REMOTE_REASON, reason) +
                            " dur: " + Chatd.unpack32le(parsed.payload.substr(9, 4));
                        break;
                }
            } else {
                var updated = Chatd.unpack16le(cmd.substr(29, 2));
                result += " edited: " + updated;
            }
            return [result, 39 + msgLength];

        case Chatd.Opcode.INCALL:
        case Chatd.Opcode.ENDCALL:
            result += ' chatId: ' + base64urlencode(cmd.substr(1, 8)) +
                        ' user: ' + base64urlencode(cmd.substr(9, 8)) +
                        ' clientId: ' + Chatd.clientIdToString(cmd, 17);
            return [result, 21];

        case Chatd.Opcode.RETENTION:
            result += " policy change on '" +
                base64urlencode(cmd.substr(1, 8)) + "' by '" +
                base64urlencode(cmd.substr(9, 8)) + "': " +
                Chatd.unpack32le(cmd.substr(17, 4)) + " second(s)";

            return [result, 21];

        case Chatd.Opcode.NUMBYHANDLE:
            result += " num by handle in '" +
                base64urlencode(cmd.substr(1, 8)) + "' with " +
                Chatd.unpack32le(cmd.substr(9, 4)) + " user(s)";

            return [result, 13];

        case Chatd.Opcode.KEEPALIVE:
        case Chatd.Opcode.KEEPALIVEAWAY:
            return [result, 1];

        case Chatd.Opcode.NODEHIST:
            // chatid.8 msgid.8 count.4 ?
            var count = Chatd.unpack32le(cmd.substr(17, 4));
            if (count > 0x7fffffff) {
                count -= 0x100000000;
            }

            result += " chatId: " + base64urlencode(cmd.substr(1, 8)) + " " +
                      "msgId: " + base64urlencode(cmd.substr(9, 8)) + " " +
                      "count: " + count;
            return [result, 21];

        case Chatd.Opcode.ADDREACTION:
        case Chatd.Opcode.DELREACTION:
            // chatid.8  userId.8 msgid.8 len.1 utfEmoji.len ?

            var leng = cmd.substr(25, 1).charCodeAt(0);
            var emoji = cmd.substr(26, leng);
            result += " chatId: " + base64urlencode(cmd.substr(1, 8)) + " " +
                "userId: " + base64urlencode(cmd.substr(9, 8)) + " " +
                "msgId: " + base64urlencode(cmd.substr(17, 8)) + " " +
                "len: " + leng + " " +
                "emoji: " + base64urlencode(emoji);

            return [result, 26 + leng];

        case Chatd.Opcode.REACTIONSN:
            // chatid.8  sn.8
            result += " chatId: " + base64urlencode(cmd.substr(1, 8)) + " " +
                "sn: " + base64urlencode(cmd.substr(9, 8));

            return [result, 17];

        default:
            if (cmd.length > 64) {
                result += ' ' + Chatd.dumpToHex(cmd, 1, 64) + '...';
            } else {
                result += ' ' + Chatd.dumpToHex(cmd, 1);
            }
            return [result, cmd.length];
    }
};

Chatd.Shard.prototype.multicmd = function(cmds) {
    var self = this;

    cmds.forEach(function(cmdObj) {
        var opCode = cmdObj[0];
        var cmd = cmdObj[1];
        var buf = String.fromCharCode(opCode) + cmd;
        self.cmdq += buf;
    });
    return this.triggerSendIfAble();
};

Chatd.Shard.prototype.cmd = function(opCode, cmd, sendFirst) {
    var buf = String.fromCharCode(opCode);
    if (cmd) {
        buf += cmd;
    }
    if (!sendFirst) {
        this.cmdq += buf;
    }
    else {
        this.cmdq = buf + this.cmdq;
    }

    return this.triggerSendIfAble(sendFirst);
};
/*
 * Checks if the shard has a clientId assigned. It may be
 * connected and fully operational for text chat, but not yet assigned a clientId,
 * which is needed for webrtc
 */
Chatd.Shard.prototype.rtcmd = function(chatid, userid, clientid, rtcmdCode, payload) {
    if (!this.clientId) {
        console.warn("Chatd.Shard.rtcmd: Trying to send an RTCMD when we don't yet have a CLIENTID assigned");
        return false;
    }
    var opcode;
    if (!userid) {
        userid = '\0\0\0\0\0\0\0\0';
        clientid = '\0\0\0\0';
        opcode = Chatd.Opcode.RTMSG_BROADCAST;
    } else if (!clientid) {
        clientid = '\0\0\0\0';
        opcode = Chatd.Opcode.RTMSG_USER;
    } else {
        opcode = Chatd.Opcode.RTMSG_ENDPOINT;
    }

    var len = payload ? payload.length + 1 : 1;
    var data = chatid + userid + clientid + Chatd.pack16le(len) + String.fromCharCode(rtcmdCode);
    if (payload) {
        data += payload;
    }

    return this.cmd(opcode, data);
};

Chatd.Shard.prototype.sendKeepAlive = function(forced) {
    var self = this;

    var lastKeepAliveSent = self._lastKeepAliveSent || 0;

    if (
        (forced || unixtime() - lastKeepAliveSent > Chatd.KEEPALIVE_PING_INTERVAL / 1000) &&
        self.s && self.s.readyState === self.s.OPEN
    ) {
        self.cmd(self.userIsActive ? Chatd.Opcode.KEEPALIVE : Chatd.Opcode.KEEPALIVEAWAY);
        self._lastKeepAliveSent = unixtime();
        self.keepAlivePing.restart();
    }
};

Chatd.Shard.prototype.triggerSendIfAble = function(isReconnect) {
    if (!this.isOnline()) {
        return false;
    }

    if (this.cmdq.length > 0) {
        var a = new Uint8Array(this.cmdq.length);
        for (var i = this.cmdq.length; i--;) {
            a[i] = this.cmdq.charCodeAt(i);
        }

        try {
            this.s.send(a);

            if (this.loggerIsEnabled) {
                Chatd.logCmdsToString(this.logger, this.cmdq, true, undefined, isReconnect);
            }
        }
        catch (ex) {
            if (this.loggerIsEnabled) {
                this.logger.warn("ws.send failed with exception:", ex);
            }
            return false;
        }

        this.cmdq = '';
    }
    return true;
};

// rejoin all open chats after reconnection (this is mandatory)
Chatd.Shard.prototype.rejoinexisting = function() {
    var chats = this.chatd.chatIdMessages;
    for (var c in this.chatIds) {
        var chat = chats[c];
        if (chat._loginState === LoginState.DISCONN) {
            // rejoin chat and immediately set the locally buffered message range
            chat.join();
        }
    }
};

Chatd.Shard.prototype.clearpending = function() {
    var self = this;
    for (var chatId in this.chatIds) {
        self.chatd.chatIdMessages[chatId].clearpending();
    }
};

// resend all unconfirmed messages (this is mandatory)
// @deprecated
Chatd.Shard.prototype.resendpending = function(chatId) {
    var self = this;
    var chatIdMessages = self.chatd.chatIdMessages[chatId];
    if (chatIdMessages) {
        chatIdMessages.resend();
    }
};

Chatd.prototype.cmd = function(opCode, chatId, cmd) {
    return this.chatIdShard[chatId].cmd(opCode, chatId + cmd);
};

Chatd.prototype.hist = function(chatId, count) {
    this.chatIdShard[chatId].hist(chatId, count);
};

// send HIST
Chatd.Shard.prototype._sendHist = function(chatId, count) {
    this.chatd.trigger('onMessagesHistoryRequest', {
        count: count,
        chatId: base64urlencode(chatId)
    });

    this.cmd(Chatd.Opcode.HIST, chatId + Chatd.pack32le(count));
};

// send NODEHIST
Chatd.Shard.prototype._sendNodeHist = function(chatId, lastMsgId, count) {
    this.chatd.trigger('onMessagesHistoryRequest', {
        count: count,
        chatId: base64urlencode(chatId),
        isRetrievingSharedFiles: true,
    });

    this.cmd(Chatd.Opcode.NODEHIST, chatId + lastMsgId + Chatd.pack32le(count));
};

Chatd.Shard.prototype.addReaction = function(chatId, msgId, userId, emoji) {
    "use strict";
    var len = emoji.length;
    assert(len < 255, "Emoji reaction length was > 255");
    this.cmd(
        Chatd.Opcode.ADDREACTION,
        chatId + userId + msgId + String.fromCharCode(len) + emoji
    );
};

Chatd.Shard.prototype.delReaction = function(chatId, msgId, userId, emoji) {
    "use strict";
    var len = emoji.length;
    assert(len < 255, "Emoji reaction length was > 255");

    this.cmd(
        Chatd.Opcode.DELREACTION,
        chatId + userId + msgId + String.fromCharCode(len) + emoji
    );
};

Chatd.Shard.prototype.joinbyhandle = function(handle) {
    var self = this;
    self.cmd(Chatd.Opcode.OPCODE_HANDLEJOIN, handle + self.chatd.userId + String.fromCharCode(Chatd.Priv.NOCHANGE));
};

Chatd.Shard.prototype.join = function(handle) {
    var self = this;
    var chat = self.chatd.chatIdMessages[handle];
    assert(chat, 'chat not found');
    chat.join();
};

Chatd.Shard.prototype.hist = function(chatId, count, isInitial) {
    var self = this;
    var promise = new MegaPromise();
    var megaChat = self.chatd.megaChat;
    var chatRoom;

    if (self.histRequests[chatId] && self.histRequests[chatId].always) {
        // queue
        self.histRequests[chatId].always(function() {
            promise.linkDoneAndFailTo(self.hist(chatId, count, isInitial));
        });
        return promise;
    }

    self.histRequests[chatId] = promise;
    promise.always(function() {
        if (self.histRequests[chatId] === promise) {
            self.histRequests[chatId] = null;
        }
    });

    if (self.chatd.chatdPersist) {
        if (isInitial) {
            self.chatd.trigger('onMessagesHistoryRequest', {
                count: Math.abs(count),
                chatId: base64urlencode(chatId)
            });
        }
        self.chatd.chatdPersist.retrieveChatHistory(
            base64urlencode(chatId),
            count * -1
        )
            .then(function(result) {
                chatRoom = megaChat.getChatById(base64urlencode(chatId));
                var messages = result[0];
                var keys = result[1];
                var highnum = result[3];
                var lastSeen = result[4];

                if (!messages || messages.length === 0) {
                    if (isInitial) {
                        self.markAsJoinRequested(chatId);
                        self.cmd(
                            Chatd.Opcode.JOIN, chatId + self.chatd.userId + String.fromCharCode(Chatd.Priv.NOCHANGE)
                        );
                    }
                    self._sendHist(chatId, count);
                    return;
                }

                if (lastSeen) {
                    self.chatd.trigger('onMessageLastSeen', {
                        chatId: base64urlencode(chatId),
                        messageId: lastSeen,
                        chatdPersist: true
                    });
                }

                var chatIdMessagesObj = self.chatd.chatIdMessages[chatId];

                if (chatRoom && chatIdMessagesObj) {
                    var keysArr = [];
                    Object.keys(keys).forEach(function(k) {
                        keysArr.push({
                            userId : keys[k][2],
                            keyid  : keys[k][0],
                            keylen : keys[k][1].length,
                            key  : keys[k][1]
                        });
                    });

                    self.chatd.trigger('onMessageKeysDone', {
                        chatId: base64urlencode(chatId),
                        keys  : keysArr,
                        chatdPersist: true
                    });

                    if (isInitial) {
                        chatIdMessagesObj.lownum = chatIdMessagesObj.highnum = highnum;
                    }

                    messages.forEach(function(msg) {
                        var msg2 = Message.fromPersistableObject(chatRoom, msg);
                        chatRoom.messagesBuff.restoreMessage(msg2);
                    });

                    if (isInitial) {
                        // do JOINRANGE after our buffer is filled

                        self.chatd.chatdPersist.getLowHighIds(base64urlencode(chatId))
                            .then(function(result) {
                                var chatIdMessagesObj = self.chatd.chatIdMessages[chatId];
                                if (chatIdMessagesObj) {
                                    if (result[2]) {
                                        chatIdMessagesObj.lownum = result[2] - 1;
                                    }
                                    if (result[3]) {
                                        chatIdMessagesObj.highnum = result[3];
                                    }
                                }

                                self.markAsJoinRequested(chatId);
                                self.chatd.cmd(Chatd.Opcode.JOINRANGEHIST, chatId,
                                    base64urldecode(result[0]) + base64urldecode(result[1]));

                            })
                            .catch(function(ex) {
                                if (ex && d) {
                                    self.logger.warn(ex);
                                }
                                // in case low/high fails, proceed w/ joining anyway so that further commands would not
                                // get stuck w/ no response from chatd.
                                self.markAsJoinRequested(chatId);
                                self.cmd(
                                    Chatd.Opcode.JOIN,
                                    chatId + self.chatd.userId + String.fromCharCode(Chatd.Priv.NOCHANGE)
                                );

                                self.chatd.trigger('onMessagesHistoryDone', {
                                    chatId: base64urlencode(chatId),
                                    chatdPersist: true
                                });

                                if (chatRoom) {
                                    chatRoom.trigger('onHistoryDecrypted');
                                }
                            });
                    }
                    else {
                        if (messages.length < count * -1) {
                            if (isInitial) {
                                self.markAsJoinRequested(chatId);
                                self.cmd(
                                    Chatd.Opcode.JOIN,
                                    chatId + self.chatd.userId + String.fromCharCode(Chatd.Priv.NOCHANGE)
                                );
                            }

                            // if the returned # of messages is < the requested, see if there
                            // is more history stored on the server.
                            self._sendHist(chatId, count);
                        }
                        else {
                            self.chatd.trigger('onMessagesHistoryDone', {
                                chatId: base64urlencode(chatId),
                                chatdPersist: true
                            });

                            if (chatRoom) {
                                chatRoom.trigger('onHistoryDecrypted');
                            }
                        }
                    }
                }
            })
            .catch(function() {
                if (isInitial) {
                    self.markAsJoinRequested(chatId);
                    self.cmd(Chatd.Opcode.JOIN, chatId + self.chatd.userId + String.fromCharCode(Chatd.Priv.NOCHANGE));
                }
                self._sendHist(chatId, count);
            });
    }
    else {
        if (isInitial) {
            self.markAsJoinRequested(chatId);
            self.cmd(Chatd.Opcode.JOIN, chatId + self.chatd.userId + String.fromCharCode(Chatd.Priv.NOCHANGE));
        }
        self._sendHist(chatId, count);
    }

    return promise;

};

Chatd.Shard.prototype.arrayBufferToString = function arrayBufferToString(buffer) {
    'use strict';
    // Thanks to https://stackoverflow.com/a/20604561
    var result = '';
    var addition = Math.pow(2, 16) - 1;
    var bufView = new Uint16Array(buffer);
    var length = bufView.length;

    for (var i = 0; i < length; i += addition) {

        if (i + addition > length) {
            addition = length - i;
        }
        result += String.fromCharCode.apply(null, bufView.subarray(i, i + addition));
    }

    return result;
};

// inbound command processing
// multiple commands can appear as one WebSocket frame, but commands never cross frame boundaries
// CHECK: is this assumption correct on all browsers and under all circumstances?
Chatd.Shard.prototype.exec = function(a) {
    var self = this;
    var chatd = self.chatd;

    // TODO: find more optimised way of doing this...fromCharCode may also cause exceptions if too big array is passed
    var cmd = this.arrayBufferToString(a);
    if (self.loggerIsEnabled) {
        Chatd.logCmdsToString(self.logger, cmd, false);
    }

    var len;
    // jshint -W004
    while (cmd.length) {
        var opcode = cmd.charCodeAt(0);
        switch (opcode) {
            case Chatd.Opcode.KEEPALIVE:
                if (self.loggerIsEnabled) {
                    self.logger.log("Server heartbeat received");
                }

                self.sendKeepAlive();
                self.keepAlive.restart();

                len = 1;
                break;

            case Chatd.Opcode.JOIN:
                self.keepAlive.restart();
                var chatIdBin = cmd.substr(1, 8);
                var chatId = base64urlencode(chatIdBin);
                var userIdBin = cmd.substr(9, 8);
                var userId = base64urlencode(userIdBin);

                var priv = cmd.charCodeAt(17);
                if (priv > 127) {
                    priv -= 256;
                }
                var wasAddedToRoom = false;
                var chat = chatd.chatIdMessages[chatIdBin];
                if (chat && chat._loginState === LoginState.JOIN_SENT) {
                    // We mark the start of a login since the first received JOIN from the
                    // initial JOIN dump send to us by chatd
                    chat._setLoginState(LoginState.JOIN_RECEIVED);
                }

                // new room state logic:
                if (userId === u_handle) {
                    if (priv === -1) { // we left the chatroom
                        if (chat) {
                            chat._setLoginState(null); // chat disabled, don't join upon re/connect
                            chat._clearCallInfo();
                            chatd.rtcHandler.onKickedFromChatroom(chat);
                        }
                    } else if (priv === 0 || priv === 1 || priv === 2 || priv === 3) {
                        // ^^ explicit and easy to read...despite that i could have done >= 1 <= 3 or something like
                        // that..
                        if (chat._loginState === null) {
                            // our privilege is changed from -1 to something valid, so have already been logged in
                            chat._setLoginState(LoginState.HISTDONE);
                        }
                    }
                }

                if (userId === u_handle) {
                    // todo: merge this w/ the new room state logic
                    if (priv === 0 || priv === 1 || priv === 2 || priv === 3) {
                        // ^^ explicit and easy to read...despite that i could have done >= 1 <= 3 or something like
                        // that..
                        if (!self.joinedChatIds[chatIdBin]) {
                            self.joinedChatIds[chatIdBin] = true;
                        }

                        // joinedChatIds may be set for pub chats.
                        if (!self.userRequestedJoin[chatIdBin]) {
                            wasAddedToRoom = true;
                        }
                    }
                    else if (priv === -1) { // we left the chatroom
                        delete self.joinedChatIds[chatIdBin];
                        delete self.userRequestedJoin[chatIdBin];
                    }
                    else {
                        self.logger.error("Not sure how to handle priv: " + priv + ".");
                    }
                } else {
                    if (priv === -1) { // Someone else left the group chat
                        if (chat) {
                            chat.onUserLeftRoom(userIdBin);
                        }
                    }
                }

                self.chatd.trigger('onMembersUpdated', {
                    userId: userId,
                    chatId: chatId,
                    priv: priv
                });

                if (wasAddedToRoom) {
                    self.joinedChatIds[chatIdBin] = true;
                }

                len = 18;
                break;

            case Chatd.Opcode.OLDMSG:
            case Chatd.Opcode.NEWMSG:
                self.keepAlive.restart();
                var newmsg = opcode === Chatd.Opcode.NEWMSG;
                len = Chatd.unpack32le(cmd.substr(35, 4));
                len += 39;

                self.chatd.msgstore(newmsg,
                            cmd.substr(1, 8),
                            cmd.substr(9, 8),
                            cmd.substr(17, 8),
                            Chatd.unpack32le(cmd.substr(25, 4)),
                            Chatd.unpack16le(cmd.substr(29, 2)),
                            Chatd.unpack32le(cmd.substr(31, 4)),
                            cmd.substr(39, len)
                );
                break;
            case Chatd.Opcode.MSGUPD:
            case Chatd.Opcode.MSGUPDX:
                self.keepAlive.restart();
                len = Chatd.unpack32le(cmd.substr(35, 4));

                if (self.loggerIsEnabled) {
                    self.logger.log("Message '" +
                        base64urlencode(cmd.substr(17, 8)) +
                        "' EDIT/DELETION: in " +
                        base64urlencode(cmd.substr(1, 8)) +
                        " ts: " +
                        Chatd.unpack32le(cmd.substr(25, 4)) +
                        " update: " +
                        Chatd.unpack16le(cmd.substr(29, 2)) +
                        ' from ' + base64urlencode(cmd.substr(9, 8)) +
                        ' with ' + Chatd.dumpToHex(cmd, 39, len)
                    );
                }
                len += 39;

                self.chatd.msgmodify(cmd.substr(1, 8),
                    cmd.substr(9, 8), cmd.substr(17, 8),
                    Chatd.unpack32le(cmd.substr(25, 4)),
                    Chatd.unpack16le(cmd.substr(29, 2)),
                    Chatd.unpack32le(cmd.substr(31, 4)),
                    cmd.substr(39, len)
                );
                break;
            case Chatd.Opcode.RTMSG_BROADCAST:
            case Chatd.Opcode.RTMSG_USER:
            case Chatd.Opcode.RTMSG_ENDPOINT:
                self.keepAlive.restart();
                // (opcode.1 chatid.8 userid.8 clientid.4 len.2) (type.1 data.(len-1))
                //              ^                                          ^
                //          header.hdrlen                             payload.len
                if (cmd.length < 23) {
                    this.logger.error("received rtMessage is too short(len=" + cmd.length + "): data:\n" +
                        Chatd.dumpToHex(cmd));
                    len = 0xffffffff; // force abort of processing
                    break;
                }

                len = 23 + Chatd.unpack16le(cmd.substr(21, 2));
                var rtcmd = cmd.charCodeAt(23);
                self.chatd.rtcHandler.handleMessage(self, cmd, len);
                break;
            case Chatd.Opcode.CALLDATA:
                self.keepAlive.restart();
                // (opcode.1 chatid.8 userid.8 clientid.4 len.2) (payload.len)
                var pllen = Chatd.unpack16le(cmd.substr(21, 2));
                len = 23 + pllen;
                if (len > cmd.length) {
                    break; // will be re-checked and cause error
                }
                // checks if payload spans outside actual cmd.length
                chatd.rtcHandler.handleCallData(self, cmd, pllen);
                break;
            case Chatd.Opcode.INCALL:
            case Chatd.Opcode.ENDCALL:
                self.keepAlive.restart();

                // opcode.1 chatid.8 userid.8 clientid.4
                if (cmd.length < 21) {
                    this.logger.error("received INCALL/ENDCALL is too short");
                    len = 0xffffffff;
                    break;
                }
                len = 21;
                var chatid = cmd.substr(1, 8);
                var chat = self.chatd.chatIdMessages[chatid];
                if (!chat) {
                    this.logger.warn("Ingoring INCALL/ENDCALL for unknown chatid " + base64urlencode(chatid));
                    break;
                }
                var userid = cmd.substr(9, 8);
                var clientid = cmd.substr(17, 4);
                if (opcode === Chatd.Opcode.INCALL) {
                    chat.onInCall(userid, clientid);
                } else {
                    chat.onEndCall(userid, clientid);
                }
                break;
            case Chatd.Opcode.CLIENTID:
                self.keepAlive.restart();

                // clientid.4 reserved.4
                if (cmd.length < 9) {
                    this.logger.error("received CLIENTID is shorter than 9 bytes");
                    len = 0xffffffff;
                    break;
                }
                len = 9;
                self.clientId = cmd.substr(1, 4);
                if (self.loggerIsEnabled) {
                    self.logger.log("Assigned CLIENTID " + Chatd.clientIdToString(self.clientId),
                        " for shard", self.shard);
                }
                break;
            case Chatd.Opcode.SEEN:
                self.keepAlive.restart();
                if (self.loggerIsEnabled) {
                    self.logger.log("Newest seen message on '" +
                        base64urlencode(cmd.substr(1, 8)) + "': '" + base64urlencode(cmd.substr(9, 8)) + "'");
                }

                self.chatd.trigger('onMessageLastSeen', {
                    chatId: base64urlencode(cmd.substr(1, 8)),
                    messageId: base64urlencode(cmd.substr(9, 8)),
                    chatd: true
                });

                len = 17;
                break;

            case Chatd.Opcode.RECEIVED:
                self.keepAlive.restart();
                if (self.loggerIsEnabled) {
                    self.logger.log("Newest delivered message on '" +
                        base64urlencode(cmd.substr(1, 8)) + "': '" + base64urlencode(cmd.substr(9, 8)) + "'");
                }

                self.chatd.trigger('onMessageLastReceived', {
                    chatId: base64urlencode(cmd.substr(1, 8)),
                    messageId: base64urlencode(cmd.substr(9, 8))
                });

                len = 17;
                break;

            case Chatd.Opcode.RETENTION:
                self.keepAlive.restart();
                if (self.loggerIsEnabled) {
                    self.logger.log("Retention policy change on '" +
                        base64urlencode(cmd.substr(1, 8)) + "' by '" +
                        base64urlencode(cmd.substr(9, 8)) + "': " +
                        Chatd.unpack32le(cmd.substr(17, 4)) + " second(s)");
                }

                self.chatd.trigger('onRetentionChanged', {
                    chatId: base64urlencode(cmd.substr(1, 8)),
                    userId: base64urlencode(cmd.substr(9, 8)),
                    retention: Chatd.unpack32le(cmd.substr(17, 4))
                });

                len = 21;
                break;


            case Chatd.Opcode.NEWMSGID:
                self.keepAlive.restart();

                if (self.loggerIsEnabled) {
                    self.logger.log(
                        "Sent message ID confirmed: '" + base64urlencode(cmd.substr(9, 8)) + "'");
                }

                self.chatd.msgconfirm(cmd.substr(1, 8), cmd.substr(9, 8));

                len = 17;
                break;

            case Chatd.Opcode.RANGE:
                self.keepAlive.restart();

                if (self.loggerIsEnabled) {
                    self.logger.log(
                        "Known chat message IDs on '" + base64urlencode(cmd.substr(1, 8)) + "' " +
                        "- oldest: '" + base64urlencode(cmd.substr(9, 8)) + "' " +
                        "newest: '" + base64urlencode(cmd.substr(17, 8)) + "'"
                    );
                }

                self.chatd.trigger('onMessagesHistoryInfo', {
                    chatId: base64urlencode(cmd.substr(1, 8)),
                    oldest: base64urlencode(cmd.substr(9, 8)),
                    newest: base64urlencode(cmd.substr(17, 8))
                });

                self.chatd.msgcheck(cmd.substr(1, 8), cmd.substr(17, 8));

                len = 25;
                break;

            case Chatd.Opcode.REJECT:
                self.keepAlive.restart();
                var rejectedOpCode = cmd.charCodeAt(17);
                if (self.loggerIsEnabled) {
                    self.logger.log("Command was rejected, chatId : " +
                        base64urlencode(cmd.substr(1, 8)) + " / msgId : " +
                        base64urlencode(cmd.substr(9, 8)) + " / opcode: " +
                        constStateToText(Chatd.Opcode, rejectedOpCode) +
                        " / reason: " + cmd.substr(18, 1).charCodeAt(0));
                }

                if (rejectedOpCode === Chatd.Opcode.NEWMSG) {
                    // the message was rejected
                    self.chatd.msgconfirm(cmd.substr(9, 8), false);
                }
                else if (rejectedOpCode === Chatd.Opcode.RANGE && cmd.charCodeAt(18) === 1) {
                    // JOINRANGEHIST was rejected
                    self.chatd.onJoinRangeHistReject(
                        cmd.substr(1, 8),
                        self.shard
                    );
                }
                else if (rejectedOpCode === Chatd.Opcode.MSGUPD || rejectedOpCode === Chatd.Opcode.MSGUPDX) {
                    // the edit was rejected
                    self.chatd.editreject(cmd.substr(1, 8), cmd.substr(9, 8));
                }
                else if (
                    rejectedOpCode === Chatd.Opcode.DELREACTION ||
                    rejectedOpCode === Chatd.Opcode.ADDREACTION
                ) {
                    // add/del reaction was rejected
                    self.chatd.trigger('onAddDelReactionReject', {
                        chatId: base64urlencode(cmd.substr(1, 8)),
                        msgId: base64urlencode(cmd.substr(9, 8)),
                        reason: cmd.substr(18, 1).charCodeAt(0),
                        op: rejectedOpCode
                    });
                }
                len = 19;
                break;

            case Chatd.Opcode.BROADCAST:
                self.keepAlive.restart();

                self.chatd.trigger('onBroadcast', {
                    chatId: base64urlencode(cmd.substr(1, 8)),
                    userId: base64urlencode(cmd.substr(9, 8)),
                    bCastCode: cmd.substr(17, 1).charCodeAt(0)
                });

                len = 18;
                break;

            case Chatd.Opcode.HISTDONE:
                self.keepAlive.restart();
                var chatid = cmd.substr(1, 8);
                if (self.loggerIsEnabled) {
                    self.logger.log("History retrieval finished: " + base64urlencode(chatid));
                }
                // Resending of pending message should be done via the integration code,
                // since it have more info and a direct relation with the UI related actions on pending messages
                // (persistence, user can click resend/cancel/etc).
                self.resendpending();
                var chat = chatd.chatIdMessages[chatid];
                if (chat) {
                    var loginState = chat.loginState();
                    if ((loginState !== null) && (loginState < LoginState.HISTDONE)) {
                        chat._setLoginState(LoginState.HISTDONE); // logged in
                        self.chatd.rtcHandler.onChatOnline(chat);
                    }
                    chat.restoreIfNeeded(cmd.substr(1, 8));
                }
                self.chatd.trigger('onMessagesHistoryDone', {
                    // TODO: Should we trigger this for unknown chats as well?
                    chatId: base64urlencode(chatid)
                });
                len = 9;
                break;
            case Chatd.Opcode.NEWKEY:
                // self.keepAlive.restart();

                if (self.loggerIsEnabled) {
                    self.logger.log("Set keys: " + base64urlencode(cmd.substr(1, 8)) +
                        " length: " + Chatd.unpack32le(cmd.substr(13, 4)));
                }

                len = Chatd.unpack32le(cmd.substr(13, 4));
                var index = 17;
                var keys = [];
                while (index < len + 17) {
                    var keylen = Chatd.unpack16le(cmd.substr(index + 12, 2));

                    keys.push(
                        {
                            userId : base64urlencode(cmd.substr(index, 8)),
                            keyid  : Chatd.unpack32le(cmd.substr(index + 8, 4)),
                            keylen : keylen,
                            key  : cmd.substr(index + 14, keylen)
                        });
                    index += keylen + 14;
                }

                self.chatd.trigger('onMessageKeysDone',
                    {
                        chatId: base64urlencode(cmd.substr(1, 8)),
                        keyid : cmd.substr(9, 4),
                        keys  : keys
                    }
                );

                len += 17;
                break;
            case Chatd.Opcode.KEYID:
                if (self.loggerIsEnabled) {
                    self.logger.log("GET new key: " + base64urlencode(cmd.substr(1, 8)));
                }

                self.chatd.trigger('onMessagesKeyIdDone',
                    {
                        chatId: base64urlencode(cmd.substr(1, 8)),
                        keyxid: Chatd.unpack32le(cmd.substr(9, 4)),
                        keyid:  Chatd.unpack32le(cmd.substr(13, 4))
                    }
                );
                self.chatd.keyconfirm(cmd.substr(1, 8), Chatd.unpack32le(cmd.substr(13, 4)));
                len = 17;
                break;
            case Chatd.Opcode.MSGID:
                // self.keepAlive.restart();
                if (self.loggerIsEnabled) {
                    self.logger.log("MSG already exists: " + base64urlencode(cmd.substr(1, 8)) +
                        " - " + base64urlencode(cmd.substr(9, 8)));
                }
                self.chatd.msgreject(cmd.substr(1, 8), cmd.substr(9, 8));
                len = 17;
                break;
            case Chatd.Opcode.ECHO:
                len = 1;
                self.logger.log("Ignoring received " + constStateToText(Chatd.Opcode, opcode));
                break;
            case Chatd.Opcode.CALLTIME:
                self.keepAlive.restart();
                len = 13;
                var chatid = cmd.substr(1, 8);
                var chat = self.chatd.chatIdMessages[chatid];
                if (!chat) {
                    self.logger.warn("CALLTIME received for an unknown chatid", base64urlencode(chatid));
                    break;
                }
                var callTime = Chatd.unpack32le(cmd.substr(9, 4));
                chat.tsCallStart = Date.now() - (callTime * 1000);
                break;

            case Chatd.Opcode.NUMBYHANDLE:
                self.keepAlive.restart();
                if (self.loggerIsEnabled) {
                    self.logger.log("Num by handle in '" +
                        base64urlencode(cmd.substr(1, 8)) + "' with " +
                        Chatd.unpack32le(cmd.substr(9, 4)) + " user(s)");
                }

                self.chatd.trigger('onNumByHandle', {
                    chatId: base64urlencode(cmd.substr(1, 8)),
                    count: Chatd.unpack32le(cmd.substr(9, 4))
                });

                len = 13;
                break;

            case Chatd.Opcode.ADDREACTION:
                self.keepAlive.restart();
                var chatId2 = base64urlencode(cmd.substr(1, 8));
                var userId2 = base64urlencode(cmd.substr(9, 8));
                userId2  = userId2 === "gTxFhlOd_LQ" ? u_handle : userId2;
                var msgId2 = base64urlencode(cmd.substr(17, 8));
                len = cmd.substr(25, 1).charCodeAt(0);
                var emoji2 = cmd.substr(26, len);

                self.chatd.trigger('onAddReaction', {
                    chatId: chatId2,
                    msgId: msgId2,
                    userId: userId2,
                    emoji: emoji2
                });

                len = 26 + len;

                break;

            case Chatd.Opcode.DELREACTION:
                self.keepAlive.restart();
                var chatId3 = base64urlencode(cmd.substr(1, 8));
                var userId3 = base64urlencode(cmd.substr(9, 8));
                userId3  = userId3 === "gTxFhlOd_LQ" ? u_handle : userId3;
                var msgId3 = base64urlencode(cmd.substr(17, 8));
                len = cmd.substr(25, 1).charCodeAt(0);
                var emoji3 = cmd.substr(26, len);

                self.chatd.trigger('onDelReaction', {
                    chatId: chatId3,
                    msgId: msgId3,
                    userId: userId3,
                    emoji: emoji3
                });

                len = 26 + len;

                break;

            case Chatd.Opcode.REACTIONSN:
                self.keepAlive.restart();
                var chatId4 = base64urlencode(cmd.substr(1, 8));
                var sn4 = base64urlencode(cmd.substr(9, 8));

                self.chatd.trigger('onReactionSn', {
                    chatId: chatId4,
                    sn: sn4,
                });

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
        else if (Number.isNaN(len)) {
            self.logger.error(
                "FATAL: Internally got nextlen == NaN, with queued cmdlen: " + cmd.length + ". " +
                "To stop potential loop-forever case, the next commands in the buffer were rejected!"
            );

            // remove the command from the queue, its already processed, if this is not done,
            // the code will loop forever
            cmd = "";
            len = 0;
            break;
        }

        cmd = cmd.substr(len);
    }
};

// generate and return next msgTransactionId in sequence
Chatd.prototype.nexttransactionid = function() {
    for (var i = 0; i < this.msgTransactionId.length; i++) {
        var c = (this.msgTransactionId.charCodeAt(i) + 1) & 0xff;

        this.msgTransactionId = this.msgTransactionId.substr(0, i) +
            String.fromCharCode(c) + this.msgTransactionId.substr(i + 1);

        if (c) {
            break;
        }
    }

    return this.msgTransactionId;
};

Chatd.prototype.join = function(chatId, shardNo, url) {
    if (this.chatIdShard[chatId]) { // this.chatidMessages[chatid] may be still missing!
        return false;
    }
    // unknown chat
    assert(!this.chatIdMessages[chatId]);
    this._addShardAndChat(chatId, shardNo, url);
    return true;
};

Chatd.prototype._sendNodeHist = function(chatId, lastMsgId, len) {
    var shard = this.chatIdShard[chatId];
    assert(shard, 'shard not found');
    shard._sendNodeHist(chatId, lastMsgId, len);
};


Chatd.prototype.addReaction = function(chatId, msgId, userId, emoji) {
    "use strict";
    var shard = this.chatIdShard[chatId];
    assert(shard, 'shard not found');
    shard.addReaction(chatId, msgId, userId, emoji);
};

Chatd.prototype.delReaction = function(chatId, msgId, userId, emoji) {
    "use strict";
    var shard = this.chatIdShard[chatId];
    assert(shard, 'shard not found');
    shard.delReaction(chatId, msgId, userId, emoji);
};


Chatd.prototype.leave = function(chatId) {
    var chat = this.chatIdMessages[chatId];
    if (!chat) {
        return;
    }
    chat._setLoginState(null);
    // clear up pending list.
    chat.clearpending();
};

// gracefully terminate all connections/calls
Chatd.prototype.shutdown = function() {
    this.rtcHandler.onShutdown();
};

// submit a new message to the chatId
Chatd.prototype.submit = function(chatId, messages, keyId, isAttachment) {

    if (this.chatIdMessages[chatId]) {
        return this.chatIdMessages[chatId].submit(messages, keyId, isAttachment);
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
    for (var i = 0; i < messages.length; i++) {
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
                   chatId + Chatd.pack32le(keyid) + Chatd.pack32le(message.length) + message];
        } else if (type === Chatd.MsgType.EDIT) {// this is edit message;
            cmd = [Chatd.Opcode.MSGUPD,
                   chatId + Chatd.Const.UNDEFINED + msgxid + Chatd.pack32le(0) +
                    Chatd.pack16le(updated) + Chatd.pack32le(keyid) +
                    Chatd.pack32le(message.length) + message];
        } else {
            cmd = [
                messageObj.isAttachment ? Chatd.Opcode.NEWNODEMSG : Chatd.Opcode.NEWMSG,
                chatId + Chatd.Const.UNDEFINED + msgxid + Chatd.pack32le(timestamp) +
                Chatd.pack16le(0) + Chatd.pack32le(keyid) + Chatd.pack32le(message.length) + message
            ];
        }
        cmds.push(cmd);
    }

    this.multicmd(cmds);
};

Chatd.Shard.prototype.msgupd = function(chatId, msgid, updatedelta, message, keyid) {
    this.cmd(Chatd.Opcode.MSGUPD,
        chatId + Chatd.Const.UNDEFINED + msgid + Chatd.pack32le(0) +
        Chatd.pack16le(updatedelta) + Chatd.pack32le(keyid) + Chatd.pack32le(message.length) + message);
};

Chatd.Shard.prototype.msgupdx = function(chatId, msgxid, updatedelta, message, keyxid) {
    this.cmd(Chatd.Opcode.MSGUPDX,
        chatId + Chatd.Const.UNDEFINED + msgxid + Chatd.pack32le(0) +
        Chatd.pack16le(updatedelta) + Chatd.pack32le(keyxid) +
        Chatd.pack32le(message.length) + message);
};

// message storage subsystem
Chatd.Messages = function(chatd, shard, chatId, oldInstance) {
    // parent linkage
    this.chatd = chatd;
    this.shard = shard;
    this.chatId = chatId;

    // the message buffer can grow in two directions and is always contiguous, i.e. there are no "holes"
    // there is no guarantee as to ordering
    this.lownum = 2 << 28; // oldest message in buf
    this.highnum = 2 << 28; // newest message in buf
    this.lowSharedFiles = 2 << 28; // newest message in buf

    this.sentid = false;
    this.receivedid = false;
    this.seenid = false;

    // message format: [msgid/transactionid, userId, timestamp, message]
    // messages in buf are indexed by a numeric id
    this.buf = {};
    this.sharedBuf = {};
    this.sendingbuf = {};

    // mapping of transactionids of messages being sent to the numeric index of this.buf
    this.sending = {};
    this.sendingList = [];
    // expired message list
    this.expired = {};
    this.needsRestore = true;
    this._clearCallInfo();
    this._loginState = oldInstance ? oldInstance._loginState : LoginState.DISCONN;
};

Chatd.Messages.prototype._setLoginState = function(state) {
    var oldState = this._loginState;
    if (oldState === state) {
        return;
    }
    if ((oldState !== null) && (state !== LoginState.DISCONN && state !== null && state !== oldState + 1)
        && !(oldState === LoginState.HISTDONE && state === LoginState.JOIN_SENT)) {
        console.error("chat %s: Invalid login state transition from %s to %s",
            base64urlencode(this.chatId), constStateToText(LoginState, oldState), constStateToText(LoginState, state));
    }
    this._loginState = state;
};

Chatd.Messages.prototype.loginState = function() {
    return this._loginState;
};

Chatd.Messages.prototype._clearCallInfo = function() {
    this.callInfo = new CallInfo();
};

// send JOIN
Chatd.Messages.prototype.join = function() {
    var self = this;
    var shard = self.shard;
    if (!shard.isOnline()) {
        return;
    }
    var chatId = self.chatId;
    var chatRoom = self.chatd.megaChat.getChatById(base64urlencode(self.chatId));

    // reset chat state before join
    self._clearCallInfo();
    self._setLoginState(LoginState.JOIN_SENT); // joining
    // send a `JOIN` (if no local messages are buffered) or a `JOINRANGEHIST` (if local messages are buffered)
    if (
        Object.keys(self.buf).length === 0 &&
        (!chatRoom.messagesBuff || chatRoom.messagesBuff.messages.length === 0)
    ) {
        // if the buff is empty and (messagesBuff not initialized (chat is initializing for the first time) OR its
        // empty)
        if ((chatRoom.type === "public") && (!chatRoom.members.hasOwnProperty(base64urlencode(shard.chatd.userId)))) {
            if (chatRoom.publicChatHandle) {
                shard.joinbyhandle(base64urldecode(chatRoom.publicChatHandle));
                shard.hist(chatId, Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL * -1);
            }
            else {
                // from mcf?
                // .hist should trigger a JOINRANGEHIST< so no JOIN/JOINBYHANDLE needed here.
                shard.hist(chatId, Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL * -1, true);
            }


        }
        else {
            if (self.chatd.chatdPersist) {
                shard.hist(chatId, Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL * -1, true);
            }
            else {
                shard.markAsJoinRequested(chatId);
                shard.cmd(Chatd.Opcode.JOIN, chatId + shard.chatd.userId + String.fromCharCode(Chatd.Priv.NOCHANGE));
                shard.hist(chatId, Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL * -1);
            }
        }
    } else {
        if (
            chatRoom.type === "public" &&
            !chatRoom.members.hasOwnProperty(base64urlencode(shard.chatd.userId)) &&
            chatRoom.publicChatHandle
        ) {
            self.handlejoinrangehist(chatId, base64urldecode(chatRoom.publicChatHandle));
        }
        else {
            self.joinrangehist(chatId);
        }
    }
};

Chatd.Messages.prototype.submit = function(messages, keyId, isAttachment) {
    // messages is an array
    var messageConstructs = [];

    for (var i = 0; i < messages.length; i++) {
        var message = messages[i];
        // allocate a transactionid for the new message
        var msgxid = this.chatd.nexttransactionid();
        var timestamp = Math.floor(new Date().getTime() / 1000);

        // write the new message to the message buffer and mark as in sending state
        // FIXME: there is a tiny chance of a namespace clash between msgid and msgxid, FIX
        var messagekey = this.getmessagekey(msgxid, message.type);
        this.sendingbuf[++Chatd.sendingnum] =
            [msgxid, this.chatd.userId, timestamp, message.message, (keyId >>> 0), 0, message.type];
        this.sending[messagekey] = Chatd.sendingnum;
        this.sendingList.push(messagekey);
        this.persist(messagekey);

        messageConstructs.push({
                "msgxid": msgxid,
                "timestamp": timestamp,
                "keyid": keyId,
                "updated": 0,
                "message": message.message,
                "type": message.type,
                "isAttachment": isAttachment
            });
    }
    var chatRoom = this.chatd.megaChat.getChatById(base64urlencode(this.chatId));
    // if we believe to be online, send immediately
    if (this.chatd.chatIdShard[this.chatId].isOnline() &&
            chatRoom && chatRoom.messagesBuff && chatRoom.messagesBuff.sendingListFlushed) {
        this.chatd.chatIdShard[this.chatId].msg(this.chatId, messageConstructs);
    }
    return Chatd.sendingnum >>> 0;
};

Chatd.Messages.prototype.getShard = function() {
    return this.chatd.chatIdShard[this.chatId];
};

Chatd.Messages.prototype.markAsJoinRequested = function() {
    var s = this.getShard();
    if (s && s.userRequestedJoin) {
        s.markAsJoinRequested(this.chatId);
    }
};

Chatd.Messages.prototype.updatekeyid = function(keyid) {
    var self = this;

    this.sendingList.forEach(function(msgxid) {
        if (!self.expired[msgxid] && self.sendingbuf[self.sending[msgxid]]) {
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

    if (self.loggerIsEnabled) {
        shard.logger.debug("mod", msgnum, message);
    }

    var mintimestamp = Math.floor(new Date().getTime() / 1000);

    var messagekey;

    // modify pending message so that a potential resend includes the change
    if (self.sendingbuf[msgnum]) {
        // overwrite the original messsage with the edited content
        self.sendingbuf[msgnum][Chatd.MsgField.MESSAGE] = message;
        var pendingmsgkey = self.getmessagekey(self.sendingbuf[msgnum][Chatd.MsgField.MSGID], Chatd.MsgType.MESSAGE);
        self.persist(pendingmsgkey);

        messagekey = self.getmessagekey(self.sendingbuf[msgnum][Chatd.MsgField.MSGID], Chatd.MsgType.EDIT);
        // if there is a pending edit after the pending new message,
        // overwrite the pending edit to only keep 1 pending edit.
        if (self.sending[messagekey]) {
            self.sendingbuf[self.sending[messagekey]][Chatd.MsgField.UPDATED] =
                mintimestamp - self.sendingbuf[msgnum][Chatd.MsgField.TIMESTAMP] + 1;
            self.sendingbuf[self.sending[messagekey]][Chatd.MsgField.MESSAGE] = message;
        }
        // if there is no any pending edit, append a pending edit.
        else {
            self.sendingbuf[++Chatd.sendingnum] = [self.sendingbuf[msgnum][Chatd.MsgField.MSGID],
                self.sendingbuf[msgnum][Chatd.MsgField.USERID],
                self.sendingbuf[msgnum][Chatd.MsgField.TIMESTAMP],
                message, self.sendingbuf[msgnum][Chatd.MsgField.KEYID],
                mintimestamp - self.sendingbuf[msgnum][Chatd.MsgField.TIMESTAMP] + 1, Chatd.MsgType.EDIT];

            self.sending[messagekey] = Chatd.sendingnum;
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
        var updated = mintimestamp - self.buf[msgnum][Chatd.MsgField.TIMESTAMP];

        messagekey = self.getmessagekey(self.buf[msgnum][Chatd.MsgField.MSGID], Chatd.MsgType.EDIT);
        // a very quick udpate, then add by 1
        if (self.sending[messagekey]) {
            updated = self.sendingbuf[self.sending[messagekey]][Chatd.MsgField.UPDATED] + 1;
        } else {
            updated = updated + 1;
            if (updated === self.buf[msgnum][Chatd.MsgField.UPDATED]) {
                updated = updated + 1;
            }
        }

        self.sendingbuf[++Chatd.sendingnum] = [
            self.buf[msgnum][Chatd.MsgField.MSGID],
            self.buf[msgnum][Chatd.MsgField.USERID],
            self.buf[msgnum][Chatd.MsgField.TIMESTAMP],
            message,
            self.buf[msgnum][Chatd.MsgField.KEYID],
            updated,
            Chatd.MsgType.EDIT
        ];

        self.sending[messagekey] = Chatd.sendingnum;
        self.sendingList.push(messagekey);
        self.persist(messagekey);

        if (self.chatd.chatIdShard[self.chatId].isOnline()) {
            self.chatd.chatIdShard[self.chatId].msgupd(self.chatId, self.buf[msgnum][Chatd.MsgField.MSGID],
                updated,
                message, self.buf[msgnum][Chatd.MsgField.KEYID]);
        }
    }
};

Chatd.Messages.prototype.clearpending = function() {
    // mapping of transactionids of messages being sent to the numeric index of this.buf
    var self = this;
    this.sendingList.forEach(function(msgxid) {
        var num = self.sending[msgxid];
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
        self.removefrompersist(msgxid);
    });

    this.sending = {};
    this.sendingList = [];
    this.sendingbuf = {};
};

Chatd.Messages.prototype.broadcast = function(bCastCode) {
    var self = this;
    var chatId = self.chatId;

    if (!chatId) {
        // This can happen, in case the chat was recently started and the UI is still retrieving the mcc response.
        // A simple halt/return shoud be fine.
        return false;
    }

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
    var mintimestamp = Math.floor(new Date().getTime() / 1000);
    var lastexpiredpendingkey = null;
    var trivialmsgs = [];
    this.sendingList.forEach(function(msgxid) {
        if (!self.sending[msgxid] || !self.sendingbuf[self.sending[msgxid]]) {
            trivialmsgs.push(msgxid);
        }
        else if (mintimestamp - self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.TIMESTAMP] <= MESSAGE_EXPIRY) {
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
                    id: self.sending[msgxid] >>> 0,
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
                if (((self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.KEYID] & 0xffff0000) >>> 0)
                    === (0xffff0000 >>> 0)) {
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

/**
 * Same as .joinrangehist, but would be internally called by joinrangehist in case buff is empty,
 * but there are messages in the UI (in which case, this func would get the low/highnums from the UI and trigger the
 * JOINRANGEHIST with those)
 *
 * @param chatId
 */
Chatd.Messages.prototype._joinrangehistViaMessagesBuff = function() {
    var self = this;
    var chatId = self.chatId;
    var chatRoom = self.chatd.megaChat.getChatById(base64urlencode(chatId));
    // we are a lower level func, the login state is set by the higher level one
    assert(self._loginState <= LoginState.JOIN_SENT);
    var firstLast;
    if (chatRoom && chatRoom.messagesBuff && chatRoom.messagesBuff.messages.length > 0) {
        var firstLast = chatRoom.messagesBuff.getLowHighIds();
        if (firstLast) {
            // queued this as last to execute after this current .done cb.
            self.chatd.trigger('onMessagesHistoryRequest', {
                count: 0xDEAD,
                chatId: base64urlencode(chatId)
            });

            self.markAsJoinRequested();
            self.chatd.cmd(Chatd.Opcode.JOINRANGEHIST, chatId,
                base64urldecode(firstLast[0]) + base64urldecode(firstLast[1]));
            return;
        }
    }

    if (!firstLast) {
        if (d) {
            console.warn("JOINRANGEHIST failed, firstLast was missing");
        }
    }

    self.chatd.cmd(
        Chatd.Opcode.JOIN,
        chatId,
        self.chatd.userId + String.fromCharCode(Chatd.Priv.NOCHANGE)
    );
    self.chatd.trigger('onMessagesHistoryRequest', {
        count: Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL,
        chatId: base64urlencode(chatId)
    });
    self.chatd.chatIdShard[chatId]._sendHist(chatId, Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL * -1);
};

// after a reconnect, we tell the chatd the oldest and newest buffered message
Chatd.Messages.prototype.handlejoinrangehist = function(chatId, handle) {
    var self = this;

    var low;
    var high;
    var requested = false;

    for (low = this.lownum; low <= this.highnum; low++) {
        if (
            this.buf[low] && !this.sending[this.buf[low][Chatd.MsgField.MSGID]] &&
            this.buf[low][Chatd.MsgField.TYPE] === Chatd.MsgType.MESSAGE
        ) {
            for (high = this.highnum; high > low; high--) {
                if (
                    this.buf[high] && !this.sending[this.buf[high][Chatd.MsgField.MSGID]] &&
                    this.buf[high][Chatd.MsgField.TYPE] === Chatd.MsgType.MESSAGE
                ) {
                    break;
                }
            }

            this.chatd.chatIdShard[chatId].cmd(Chatd.Opcode.OPCODE_HANDLEJOINRANGEHIST,
                handle + this.buf[low][Chatd.MsgField.MSGID] + this.buf[high][Chatd.MsgField.MSGID]);

            this.chatd.trigger('onMessagesHistoryRequest', {
                count: Chatd.MESSAGE_HISTORY_LOAD_COUNT,
                chatId: base64urlencode(chatId)
            });
            requested = true;
            break;
        }
    }

    if (!requested) {
       // self.chatd.chatIdShard[chatId].cmd(Chatd.Opcode.OPCODE_HANDLEJOINRANGEHIST,
       //      handle + Chatd.Const.UNDEFINED + Chatd.Const.UNDEFINED);

        self.chatd.chatIdShard[chatId].cmd(
            Chatd.Opcode.OPCODE_HANDLEJOIN,
            handle + self.chatd.userId + String.fromCharCode(Chatd.Priv.NOCHANGE)
        );

        self.chatd.trigger('onMessagesHistoryRequest', {
            count: Chatd.MESSAGE_HISTORY_LOAD_COUNT,
            chatId: base64urlencode(chatId)
        });
    }

};

// after a reconnect, we tell the chatd the oldest and newest buffered message
Chatd.Messages.prototype.joinrangehist = function() {
    var self = this;
    var chatId = self.chatId;
    self._setLoginState(LoginState.JOIN_SENT);
    if (self.chatd.chatdPersist) {
        // this would be called on reconnect if messages were added to the buff,
        // so ensure we are using the correct first/last msgIds as from the actual
        // iDB

        self.chatd.chatdPersist.getLowHighIds(base64urlencode(chatId))
            .then(function(result) {
                var chatIdMessagesObj = self.chatd.chatIdMessages[chatId];
                if (chatIdMessagesObj) {
                    if (result[2]) {
                        chatIdMessagesObj.lownum = result[2] - 1;
                    }
                    if (result[3]) {
                        chatIdMessagesObj.highnum = result[3];
                    }
                }

                // queued this as last to execute after this current .done cb.
                self.chatd.trigger('onMessagesHistoryRequest', {
                    count: 0xDEAD,
                    chatId: base64urlencode(chatId)
                });

                self.markAsJoinRequested();
                self.chatd.cmd(Chatd.Opcode.JOINRANGEHIST, chatId,
                    base64urldecode(result[0]) + base64urldecode(result[1]));
            })
            .catch(function(ex) {
                if (ex && d) {
                    console.warn(ex);
                }
                // This may be triggered by chatdPersist crashing and causing a re-connection + re-hist sync. In this
                // case, we need to run JOINRANGEHIST otherwise, it would cause the client to (eventually) move
                // existing msgs to lownum IDs (e.g. back to the top of the list of msgs)

                self._joinrangehistViaMessagesBuff();
            });
    }
    else {
        var low;
        var high;
        var requested = false;

        for (low = this.lownum; low <= this.highnum; low++) {
            if (
                this.buf[low] && !this.sending[this.buf[low][Chatd.MsgField.MSGID]] &&
                this.buf[low][Chatd.MsgField.TYPE] === Chatd.MsgType.MESSAGE
            ) {
                for (high = this.highnum; high > low; high--) {
                    if (
                        this.buf[high] && !this.sending[this.buf[high][Chatd.MsgField.MSGID]] &&
                        this.buf[high][Chatd.MsgField.TYPE] === Chatd.MsgType.MESSAGE
                    ) {
                        break;
                    }
                }

                this.markAsJoinRequested();
                this.chatd.cmd(Chatd.Opcode.JOINRANGEHIST, chatId,
                    this.buf[low][Chatd.MsgField.MSGID] + this.buf[high][Chatd.MsgField.MSGID]);

                this.chatd.trigger('onMessagesHistoryRequest', {
                    count: 0xDEAD,
                    chatId: base64urlencode(chatId)
                });
                requested = true;
                break;
            }
        }

        if (!requested) {
            self._joinrangehistViaMessagesBuff();
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
        var room = this.megaChat.getChatById(base64urlencode(chatId));
        var isShared = room && room.messagesBuff && room.messagesBuff.isRetrievingSharedFiles;
        this.chatIdMessages[chatId].store(newmsg, userId, msgid, timestamp, updated, keyid, msg, undefined, isShared);
    }
};

// modify a message
Chatd.prototype.msgmodify = function(chatId, userid, msgid, ts, updated, keyid, msg) {
    // an existing message has been modified
    if (this.chatIdMessages[chatId]) {
        this.chatIdMessages[chatId].msgmodify(userid, msgid, ts, updated, keyid, msg);
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
    var messagekey;
    if (!chatId) {
        for (var cId in this.chatIdMessages) {
            if (this.chatIdMessages[cId]) {
                messagekey = this.chatIdMessages[cId].getmessagekey(msgxid, Chatd.MsgType.MESSAGE);
                if (this.chatIdMessages[cId].sending[messagekey]) {
                    this.chatIdMessages[cId].discard(messagekey, true);
                    break;
                }
            }
        }
    }
    else {
        if (this.chatIdMessages[chatId]) {
            messagekey = this.chatIdMessages[chatId].getmessagekey(msgxid, Chatd.MsgType.MESSAGE);
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

// set webrtc message handler
Chatd.prototype.setRtcHandler = function(handler) {
    if (handler) {
        this.rtcHandler = handler;
    } else {
        this.rtcHandler = this.defaultRtcHandler;
    }
};

Chatd.prototype._reinitChatIdHistory = function(chatId, resetNums) {
    var self = this;
    var chatIdBin = base64urldecode(chatId);

    var oldChatIdMessages = self.chatIdMessages[chatIdBin];
    var chatRoom = self.megaChat.getChatById(base64urlencode(chatIdBin));
    var cdr = self.chatIdMessages[chatIdBin] = new Chatd.Messages(self, self.chatIdShard[chatIdBin], chatIdBin, oldChatIdMessages);

    self.logger.warn('re-init chat history for "%s"', chatId, chatRoom);

    chatRoom.messagesBuff.messageOrders = {};
    chatRoom.messagesBuff.sharedFilesMessageOrders = {};

    if (chatRoom.messagesBuff.messagesBatchFromHistory && chatRoom.messagesBuff.messagesBatchFromHistory.length > 0) {
        chatRoom.messagesBuff.messagesBatchFromHistory.clear();
    }
    if (chatRoom.messagesBuff && chatRoom.messagesBuff.retrievedAllMessages) {
        chatRoom.messagesBuff.retrievedAllMessages = false;
    }

    if (oldChatIdMessages) {
        [
            'lownum',
            'highnum',
            'sending',
            'sentid',
            'receivedid',
            'seenid',
            'sendingbuf',
            'sending',
            'sendingList',
            'expired',
        ].forEach(function (k) {
            if (resetNums && (k === "lownum" || k === "highnum")) {
                // skip and use "initial" nums.
                return;
            }
            cdr[k] = oldChatIdMessages[k];
        });
    }
};

Chatd.prototype.onJoinRangeHistReject = function(chatIdBin, shardId) {
    var self = this;

    var chatIdEnc = base64urlencode(chatIdBin);

    var promises = [];

    backgroundNacl.workers.removeTasksByTagName("svlp:" + chatIdEnc);

    if (self.chatdPersist && ChatdPersist.isMasterTab()) {
        promises.push(self.chatdPersist.clearChatHistoryForChat(chatIdEnc));
    }
    else {
        var chatRoom = self.megaChat.getChatById(chatIdEnc);
        var messageKeys = clone(chatRoom.messagesBuff.messages.keys());

        for (var i = 0; i < messageKeys.length; i++) {
            var v = chatRoom.messagesBuff.messages[messageKeys[i]];
            chatRoom.messagesBuff.messages.removeByKey(v.messageId);
        }
    }

    MegaPromise.allDone(promises)
        .always(function() {
            // clear any old messages

            self._reinitChatIdHistory(chatIdEnc, true);

            var shard = self.shards[shardId];
            shard._sendHist(chatIdBin, Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL * -1);
        });
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
        self.sendingbuf[++Chatd.sendingnum] =
            [msgid,
            self.chatd.userId,
            self.sendingbuf[editmsgnum][Chatd.MsgField.TIMESTAMP],
            self.sendingbuf[editmsgnum][Chatd.MsgField.MESSAGE],
            neweditkeyid,
            self.sendingbuf[editmsgnum][Chatd.MsgField.UPDATED],
            self.sendingbuf[editmsgnum][Chatd.MsgField.TYPE]
            ];
        self.sending[neweditmessagekey] = Chatd.sendingnum;
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
        var keyid = self.buf[id][Chatd.MsgField.KEYID];
        self.chatd.trigger('onMessageStore', {
            chatId: base64urlencode(self.chatId),
            id: id,
            pendingid: num >>> 0,
            messageId: base64urlencode(msgid),
            userId: base64urlencode(self.buf[id][Chatd.MsgField.USERID]),
            ts: self.buf[id][Chatd.MsgField.TIMESTAMP],
            updated: self.buf[id][Chatd.MsgField.UPDATED],
            keyid : keyid,
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
Chatd.Messages.prototype.store = function(
    newmsg,
    userId,
    msgid,
    timestamp,
    updated,
    keyid,
    msg,
    skipPersist,
    isSharedFile
) {
    var id;

    if (newmsg) {
        id = ++this.highnum;
    }
    else if (isSharedFile) {
        id = this.lowSharedFiles--;
    }
    else {
        id = this.lownum--;
    }

    // store message
    (isSharedFile ? this.sharedBuf : this.buf)[id] = [
        msgid,
        userId,
        timestamp,
        msg,
        keyid,
        updated,
        Chatd.MsgType.MESSAGE
    ];

    this.chatd.trigger('onMessageStore', {
        chatId: base64urlencode(this.chatId),
        id: id,
        messageId: base64urlencode(msgid),
        userId: base64urlencode(userId),
        ts: timestamp,
        updated: updated,
        keyid : keyid,
        message: msg,
        isNew: newmsg,
        isSharedFile: !!isSharedFile
    });
};

// modify a message from message buffer
Chatd.Messages.prototype.msgmodify = function(userid, msgid, ts, updated, keyid, msg, isRetry, isPersist) {
    var origMsgNum = this.getmessagenum(msgid);

    // retrieve msg from chatdPersist if missing in the buff
    if (this.chatd.chatdPersist) {
        if (!origMsgNum || !this.buf[origMsgNum]) {
            if (isRetry) {
                return;
            }
            var encChatId = base64urlencode(this.chatId);
            var self = this;

            this.chatd.chatdPersist.getMessageByMessageId(encChatId, base64urlencode(msgid))
                .then(function(r) {
                    if (!r) {
                        console.error(
                            "Update message failed, msgNum  was not found in either .buf, .sendingbuf or messagesBuff",
                            base64urlencode(msgid)
                        );
                        return;
                    }
                    var msgObj = r[0];
                    origMsgNum = msgObj.orderValue;

                    var done = function() {
                        self.buf[origMsgNum] = [
                            // Chatd.MsgField.MSGID,
                            base64urldecode(msgObj.msgId),
                            // Chatd.MsgField.USERID,
                            base64urldecode(msgObj.userId),
                            // Chatd.MsgField.TIMESTAMP,
                            msgObj.msgObject.delay,
                            // message,
                            "",
                            // Chatd.MsgField.KEYID,
                            msgObj.keyId,
                            // mintimestamp - Chatd.MsgField.TIMESTAMP + 1,
                            msgObj.msgObject.updated === false ? 0 : msgObj.msgObject.updated,
                            // Chatd.MsgType.EDIT
                            0
                        ];

                        self.msgmodify(userid, msgid, ts, updated, keyid, msg, true);
                    };


                    if (msgObj.keyId !== 0) {
                        self.chatd.chatdPersist.retrieveAndLoadKeysFor(encChatId, msgObj.userId, msgObj.keyId)
                            .always(done);
                    }
                    else {
                        done();
                    }
                })
                .catch(function() {
                    if (d) {
                        console.warn(
                            "msgmodify failed, can't find", base64urlencode(msgid), " in chatdPersist, maybe the " +
                            "message was not yet retrieved?"
                        );
                    }
                });

            return;
        }
    }
    // CHECK: is it more efficient to maintain a full hash msgid -> num?
    // FIXME: eliminate namespace clash collision risk
    var msgnum = this.lownum;
    var messagekey = this.getmessagekey(msgid, Chatd.MsgType.EDIT);
    for (var i = this.highnum; i >= this.lownum; i--) {
        if (this.buf[i] && this.buf[i][Chatd.MsgField.MSGID] === msgid) {
            if (
                this.buf[i][Chatd.MsgField.KEYID] === 0 &&
                this.buf[i][Chatd.MsgField.TYPE] === 0 &&
                this.buf[i][Chatd.MsgField.UPDATED] === updated
            ) {
                // potential duplicate MSGUPD, don't do anything.
                break;
            }

            // if we modified the message, remove from this.modified.
            this.buf[i][Chatd.MsgField.MESSAGE] = msg;
            this.buf[i][Chatd.MsgField.UPDATED] = updated;

            if (ts) {
                this.buf[i][Chatd.MsgField.TIMESTAMP] = ts;
            }

            if (keyid === 0 && base64urlencode(userid) === strongvelope.COMMANDER) {
                // if this is message truncate
                this.chatd.trigger('onMessageUpdated', {
                    chatId: base64urlencode(this.chatId),
                    userId: base64urlencode(userid),
                    id: i,
                    state: 'TRUNCATED',
                    keyid: keyid,
                    ts: ts,
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

                if (this.sending[messagekey] && this.sendingbuf[this.sending[messagekey]]
                    && updated >= this.sendingbuf[this.sending[messagekey]][Chatd.MsgField.UPDATED]) {
                    this.discard(messagekey);
                }
            }

            if (keyid !== 0 && base64urlencode(userid) !== strongvelope.COMMANDER) {
                break;
            }
        }
        if (keyid === 0 && base64urlencode(userid) === strongvelope.COMMANDER) {
            // if this is message truncate
            if (i < msgnum && this.buf[i]) {
                // clear pending list if there is any.
                this.discard(messagekey);
                delete this.buf[i];
            }
        }
    }

    if (keyid === 0 && base64urlencode(userid) === strongvelope.COMMANDER) {
        var chatId = base64urlencode(this.chatId);

        if (this.chatd.chatdPersist) {
            // if this is a truncate, trigger the persistTruncate in chatdPersist.
            var bufMessage = this.buf[origMsgNum];

            this.chatd.chatdPersist.persistTruncate(chatId, origMsgNum)
                .always(function() {
                    // update the .buf[i] to contain the proper KEYID = 0 and USERID = api.
                    bufMessage[Chatd.MsgField.KEYID] = keyid;
                    bufMessage[Chatd.MsgField.USERID] = userid;
                });
        }
    }
};

// discard message from message queue
Chatd.Messages.prototype.discard = function(messagekey, notify) {
    notify = typeof notify === 'undefined' ? false : notify;
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
    array.remove(self.sendingList, messagekey);
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
        if (
            !self.expired[msgxid] &&
            self.sendingbuf[self.sending[msgxid]] &&
            self.sendingbuf[self.sending[msgxid]][Chatd.MsgField.TYPE] === Chatd.MsgType.KEY
        ) {
            firstkeyxkey = msgxid;
            return;
        }
    });
    if (!firstkeyxkey) {
        return;
    }
    var promises = [];

    // update keyid of the confirmed key in persistency list.
    var cacheKey = base64urlencode(self.chatId) + ":" + firstkeyxkey;
    promises.push(
        self.chatd.messagesQueueKvStorage.getItem(cacheKey).then(
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
            }
        })
    );

    var prefix = base64urlencode(self.chatId);
    var iskey = false;
    var previouskeyid;
    var trivialkeys = [];

    promises.push(
        self.chatd.messagesQueueKvStorage.eachPrefixItem(prefix, function(v) {

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
                    iskey = false;
                }
            }
        })
    );

    var _updatekeyid = function() {
        for (var keyidmsgid in trivialkeys) {
            self.removefrompersist(trivialkeys[keyidmsgid]);
        }
        // remove the key message from the local pending list.
        if (self.sendingList.indexOf(firstkeyxkey) >= 0) {
            array.remove(self.sendingList, firstkeyxkey);
        }
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
    for (var i = this.highnum; i >= this.lownum; i--) {
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
        }
    }
};

// remove a message from persistency list
Chatd.Messages.prototype.removefrompersist = function(messagekey) {
    var self = this;
    var cacheKey = base64urlencode(self.chatId) + ":" + messagekey;
    self.chatd.messagesQueueKvStorage.removeItem(cacheKey);
};

Chatd.Messages.prototype.restoreIfNeeded = function() {
    if (!this.needsRestore) {
        return;
    }
    this.restore();
    this.needsRestore = false;
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
        self.chatd.messagesQueueKvStorage.eachPrefixItem(prefix, function(v) {
            if (v.userId === self.chatd.userId) {
                if (v.type === Chatd.MsgType.KEY) {
                    // if the previous message is a key message, then the previous key is a trivial key.
                    if (iskey) {
                        trivialkeys.push(self.getmessagekey(previouskeyid, v.type));
                    }
                    if (((v.keyId & 0xffff0000) >>> 0) === (0xffff0000 >>> 0)) {
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
                        var keylen = Chatd.unpack16le(v.message.substr(index + 8, 2));
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
                    if (pendingkey) {
                        v.keyId = tempkeyid;
                    }
                    // if the message is not an edit or an edit with the original message not in the
                    // pending list, restore it.
                    var messagekey = self.getmessagekey(v.messageId, v.type);
                    if (!self.sending[messagekey]) {
                        self.sendingbuf[++Chatd.sendingnum] =
                            [v.messageId, v.userId, v.timestamp, v.message, v.keyId, v.updated, v.type];
                        self.sending[messagekey] = Chatd.sendingnum;
                        self.sendingList.push(messagekey);
                        count++;
                    }
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
Chatd.Messages.prototype.onInCall = function(userid, clientid) {
    var self = this;
    // We ignore preliminary INCALLs and CALLDATAs that chatd sends before we join (for fast call answer on mobile)
    if (self._loginState < LoginState.JOIN_RECEIVED) {
        return;
    }
    var parts = self.callInfo.participants;
    var endpointId = userid + clientid;
    var val = parts[endpointId];
    if (val != null) {
        if (!isNaN(val)) {
            if (base64urlencode(userid) !== u_handle) {
                self.chatd.logger.warn("Received INCALL for a user that has valid A/V flags, but that user is not us");
            }
        } else {
            self.chatd.logger.warn("INCALL received for user that is already known to be in the call");
            return;
        }
    }
    parts[endpointId] = true; // to be replaced by av flags when RtcModule receives CALLDATA for that peer
    self.chatd.rtcHandler.onClientJoinedCall(self, userid, clientid);
};

Chatd.Messages.prototype.onEndCall = function(userid, clientid) {
    var self = this;
    // We ignore preliminary INCALLs and CALLDATAs that chatd sends before we join (for fast call answer on mobile)
    if (self._loginState < LoginState.JOIN_RECEIVED) {
        return;
    }

    var info = self.callInfo;
    var parts = info.participants;
    var endpointId = userid + clientid;
    if (parts[endpointId] == null) {
        self.chatd.logger.warn("ENDCALL received for user that is not known to be in the call", JSON.stringify(parts));
        return; // Don't have it, should not normally happend
    }
    delete parts[endpointId];
    if (info.participantCount() === 0) {
        self._clearCallInfo();
    }
    self.chatd.rtcHandler.onClientLeftCall(self, userid, clientid);
};

Chatd.Messages.prototype.onUserLeftRoom = function(userid) {
    var self = this;
    var parts = self.callInfo.participants;
    for (var k in parts) {
        if (k.substr(0, 8) === userid) {
            delete parts[k];
            self.chatd.rtcHandler.onClientLeftCall(self, userid, k.substr(8, 4));
        }
    }
};

// get a list of reference messages
Chatd.Messages.prototype.getreferencelist = function() {

    var ranges = [0,1,2,3,4,5,6];
    var refs = [];
    var index = 0;
    var min = 0;
    var max = 0;
    var pendinglen = this.sendingList.length;
    var num;
    var index2;

    for (index = 0;index < ranges.length; index++) {
        max = 1 << ranges[index];
        // if there are not enough buffered messages, bail out.
        if (max > (this.highnum - this.lownum) + pendinglen) {
            break;
        }
        num = Math.floor(Math.random() * (max - min)) + min;
        if (num < pendinglen) {
            var msgkey = this.sendingList[pendinglen - num - 1];
            if (this.sending[msgkey]) {
                refs.push((this.sending[msgkey] >>> 0));
            }
        }
        else {
            index2 = this.highnum - (num - pendinglen);
            if (this.buf[index2]) {
                refs.push(base64urlencode(this.buf[index2][Chatd.MsgField.MSGID]));
            }
        }
        min = max;
    }
    max = (this.highnum - this.lownum);
    if (max > min) {
        num = Math.floor(Math.random() * (max - min)) + min;
        index2 = this.highnum - num;
        if (this.buf[index2]) {
            refs.push(base64urlencode(this.buf[index2][Chatd.MsgField.MSGID]));
        }
    }

    return refs;
};

// utility functions
Chatd.pack32le = function(x) {
    var r = '';

    for (var i = 4; i--;) {
        r += String.fromCharCode(x & 255);
        x >>>= 8;
    }

    return r;
};

Chatd.unpack32le = function(x) {
    var r = 0;

    for (var i = 4; i--;) {
        r = ((r << 8) >>> 0) + x.charCodeAt(i);
    }

    return r;
};

Chatd.pack16le = function(x) {
    var r = '';

    for (var i = 2; i--;) {
        r += String.fromCharCode(x & 255);
        x >>>= 8;
    }

    return r;
};

Chatd.unpack16le = function(x) {
    var r = 0;

    for (var i = 2; i--;) {
        r = ((r << 8) >>> 0) + x.charCodeAt(i);
    }

    return r;
};


Chatd.dumpToHex = function(buf, offset, cnt, nospace) {
    var len = buf.length;
    if (typeof offset === 'undefined') {
        offset = 0;
    }
    if (offset >= len) {
        return;
    }
    var end;
    if (!cnt) {
        end = len - 1;
    } else {
        end = offset + cnt - 1;
        if (end >= len) {
            end = len - 1;
        }
    }
    var ret = '';
    for (var i = offset; i <= end; i++) {
        var hex = buf.charCodeAt(i).toString(16);
        if (hex.length < 2) {
            ret += '0';
        }
        ret += hex;
        if (!nospace && i < end) {
            ret += ' ';
        }
    }
    return ret;
};

