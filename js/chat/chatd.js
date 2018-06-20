// chatd interface
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
    self.messagesQueueKvStorage = new SharedLocalKVStorage("chatqueuedmsgs");

    /**
     * Set to true when this chatd instance is (being) destroyed
     * @type {boolean}
     */
    self.destroyed = false;

    if (
        ua.details.browser === "Chrome" ||
        ua.details.browser === "Firefox" ||
        ua.details.browser === "Opera"
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

    var loggerIsEnabled = localStorage['chatdLogger'] === '1';

    self.logger = new MegaLogger("chatd", {
        minLogLevel: function() {
            return loggerIsEnabled ? MegaLogger.LEVELS.DEBUG : MegaLogger.LEVELS.ERROR;
        }
    });

    // initialize the webrtc message handler to a dummy function
    self.rtcHandler = self.defaultRtcHandler = {
        handleMessage: function(shard, msg, len) {},
        onUserJoinLeave: function(chatid, userid, priv) {},
        onUserOffline: function(chatid, userid, clientid) {},
        onShutdown: function() {}
    };

    // load persistent client id, or generate one if none was stored
    //    self.identity = localStorage['chatdIdentity'];
    //    if (!self.identity) {
    self.identity = Chatd.pack32le((Math.random() * 0xffffffff) | 0) +
                    Chatd.pack16le((Math.random() * 0xffff) | 0) +
                    Chatd.pack16le(Date.now() & 0xffff);

    localStorage.setItem('chatdIdentity', base64urlencode(self.identity));

    self.logger.debug("Generated new client identity: 0x" + Chatd.dumpToHex(self.identity, 0, 0, true));
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
    window.addEventListener('unload', function() {
        self.shutdown();
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
    'DELREACTION': 34
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
    self.mcurlRequests = {};

    // queued commands
    self.cmdq = '';
    self.histRequests = {};

    var loggerIsEnabled = localStorage['chatdLogger'] === '1';

    self.logger = new MegaLogger(
        "shard-" + shard, {
            minLogLevel: function() {
                return loggerIsEnabled ? MegaLogger.LEVELS.DEBUG : MegaLogger.LEVELS.ERROR;
            }
        },
        chatd.logger
    );
    self.loggerIsEnabled = loggerIsEnabled;

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
                    // TODO: change this to use the new API method for retrieving a mcurl for a specific shard
                    // (not chat)
                    var firstChatId = Object.keys(self.chatIds)[0];
                    connectionRetryManager.pause();
                    self.retrieveMcurlAndExecuteOnce(
                        base64urlencode(firstChatId),
                        function(mcurl) {
                            connectionRetryManager.unpause();
                            self.url = mcurl;
                            self.reconnect();
                        },
                        function(r) {
                            if (r === EEXPIRED) {
                                if (megaChat && megaChat.plugins && megaChat.plugins.chatdIntegration) {
                                    megaChat.plugins.chatdIntegration.requiresUpdate();
                                    return;
                                }
                            }
                            if (connectionRetryManager._$connectingPromise) {
                                connectionRetryManager._$connectingPromise.reject();
                            }
                        }
                    );
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

    if (!AppActivityHandler.hasSubscriber("chatdShard" + shard)) {
        self.userIsActive = AppActivityHandler.getGlobalAppActivityHandler().isActive;
        AppActivityHandler.addSubscriber("chatdShard" + shard, function(isActive) {
            // restart would also "start" the keepalive tracker, which is not something we want in case chatd is not
            // yet connected.
            if (self.isOnline()) {
                self.userIsActive = megaChat.activeCallManagerCall ? true : isActive;
                self.sendKeepAlive(true);
                self.keepAlive.restart();
                self.keepAlivePing.restart();
            }
        });
    }

    // HistoryDone queue manager

    self.chatd.rebind('onMessagesHistoryDone.histQueueManager' + shard, function(e, eventData) {
        var chatIdDecoded = base64urldecode(eventData.chatId);
        if (self.histRequests[chatIdDecoded] && self.histRequests[chatIdDecoded].resolve) {
            self.histRequests[chatIdDecoded].resolve();
        }
    });
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


Chatd.Shard.prototype.retrieveMcurlAndExecuteOnce = function(chatId, resolvedCb, failedCb) {
    var self = this;
    if (self.mcurlRequests[chatId]) {
        // already waiting for mcurl response
        return;
    }

    var promise = self.mcurlRequests[chatId] = asyncApiReq({
        a: 'mcurl',
        id: chatId,
        v: Chatd.VERSION
    });

    promise.done(function(mcurl) {
            resolvedCb(mcurl);
        })
        .fail(function(r) {
            failedCb(r);
        })
        .always(function() {
            if (promise === self.mcurlRequests[chatId]) {
                delete self.mcurlRequests[chatId];
            }
        });
};

// is this chatd connection currently active?
Chatd.Shard.prototype.isOnline = function() {
    return this.s && this.s.readyState === this.s.OPEN;
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

    var chatdTag = (localStorage.chatdTag ? localStorage.chatdTag : '2');
    self.s = new WebSocket(this.url + '/' + chatdTag);
    self.s.binaryType = "arraybuffer";

    self.s.onopen = function() {
        self.keepAlive.restart();
        self.keepAlivePing.restart();
        self.logger.debug('chatd connection established');
        self.connectionRetryManager.gotConnected();
        self.histRequests = {};

        if (!self.triggerSendIfAble()) {
            // XXX: websocket.send() failed for whatever reason, onerror should
            //      have been called and the connection restablished afterwards.
            self.logger.warn('chatd connection closed unexpectedly...');
            return;
        }
        self.sendIdentity();
        self.rejoinexisting();
        self.chatd.trigger('onOpen', {
            shard: self
        });

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

        self.chatd.trigger('onError', {
            shard: self
        });
    };

    self.s.onmessage = function(e) {
        // verify that WebSocket frames are always delivered as a contiguous message
        self.exec(new Uint8Array(e.data));
    };

    self.s.onclose = function(e) {
        self.logger.warn('chatd connection lost, will eventually reconnect...');

        self.keepAlive.stop();
        self.keepAlivePing.stop();

        self.joinedChatIds = {};
        self.connectionRetryManager.gotDisconnected();
        self.mcurlRequests = {};
        self.triggerEventOnAllChats('onRoomDisconnected');

        self.chatd.trigger('onClose', {
            shard: self
        });
    };
};

Chatd.Shard.prototype.disconnect = function() {
    var self = this;

    if (self.s) {
        self.keepAlive.stop();
        self.keepAlivePing.stop();

        self.joinedChatIds = {};

        self.triggerEventOnAllChats('onRoomDisconnected');

        self.chatd.trigger('onClose', {
            shard: self
        });

        self.s.onclose = null;
        self.s.onerror = null;
        self.s.onopen = null;
        self.s.onmessage = null;
        self.s.close();
    }
    self.s = null;

    self.keepAlive.stop();
    self.keepAlivePing.stop();

    self.mcurlRequests = {};
    self.connectionRetryManager.gotDisconnected();
};

Chatd.Shard.prototype.sendIdentity = function() {
    assert(this.chatd.identity);
    this.cmd(Chatd.Opcode.CLIENTID, this.chatd.identity);
};

Chatd.rtcmdToString = function(cmd, tx) {
    // (opcode.1 chatid.8 userid.8 clientid.4 len.2) (type.1 data.(len-1))
    if (cmd.length < 24) {
        assert(false, "rtcmdToString: Command buffer length (" +
            cmd.length + ") is less than 24 bytes. Data:\n" + Chatd.dumpToHex(cmd));
    }
    var opCode = cmd.charCodeAt(23);
    var result = constStateToText(RTCMD, opCode);
    result += ' chatid: ' + base64urlencode(cmd.substr(1, 8));
    result += (tx ? ' to:' : ' from:') + base64urlencode(cmd.substr(9, 8));
    result += ' clientid: 0x' + Chatd.dumpToHex(cmd, 17, 4, true);

    var dataLen = Chatd.unpack16le(cmd.substr(21, 2)) - 1; // first data byte is the RTCMD opcode
    if (dataLen > 0) {
        assert(dataLen <= cmd.length - 24);
        if (opCode === RTCMD.ICE_CANDIDATE) {
            // FIXME: there is binary data before the candidate text, but it's variable length,
            // so more complex parsing is required.
            result += '\n' + cmd.substr(25, dataLen);
        } else {
            result += ' data(' + (Chatd.unpack16le(cmd.substr(21, 2)) - 1) + '): ';
            if (dataLen > 64) {
                result += Chatd.dumpToHex(cmd, 24, 64) + '...';
            } else {
                result += Chatd.dumpToHex(cmd, 24);
            }
        }
    }
    return result;
};

Chatd.cmdToString = function(cmd, tx) {
    var opCode = cmd.charCodeAt(0);
    var result = constStateToText(Chatd.Opcode, opCode);
    if (opCode >= Chatd.Opcode.RTMSG_BROADCAST && opCode <= Chatd.Opcode.RTMSG_ENDPOINT) {
        result += ": " + Chatd.rtcmdToString(cmd, tx);
    }
    else if (opCode === Chatd.Opcode.INCALL || opCode === Chatd.Opcode.ENDCALL) {
        result += ' chat ' +
            base64urlencode(cmd.substr(1, 8)) +
            ' user ' +
            base64urlencode(cmd.substr(9, 8)) +
            ' client 0x' +
            Chatd.dumpToHex(cmd, 17, 4, true);
    }
    else {
        if (cmd && cmd.length > 1) {
            // to ease debugging, please add more commands here when needed
            // (debugging = console grepping for ids, etc, so thats why, I'm parsing
            // them here and showing thme in non-hex format)
            switch (opCode) {
                case Chatd.Opcode.HIST:
                    var lenStr = cmd.substr(9, 4);
                    var histLen = 0x00000000;
                    histLen += (lenStr.charCodeAt(0));
                    histLen += (lenStr.charCodeAt(1)) << 8;
                    histLen += (lenStr.charCodeAt(2)) << 16;
                    histLen += (lenStr.charCodeAt(3)) << 24;

                    result += " (chatId) " + base64urlencode(cmd.substr(1, 8)) + " (len) " +
                        histLen;
                    break;
                case Chatd.Opcode.JOIN:
                    var chatId = base64urlencode(cmd.substr(1, 8));
                    var userId = base64urlencode(cmd.substr(9, 8));

                    var priv = cmd.charCodeAt(17);

                    result += " (chatId) " + chatId + " (userId) " + userId + " (priv) " + priv;
                    break;

                case Chatd.Opcode.SEEN:
                    // self.chatd.cmd(Chatd.Opcode.SEEN, base64urldecode(chatRoom.chatId), base64urldecode(msgid));
                    var chatId = base64urlencode(cmd.substr(1, 8));
                    var msgId = base64urlencode(cmd.substr(9, 8));
                    result += " (chatId) " + chatId + " (msgId) " + msgId;
                    break;

                case Chatd.Opcode.JOINRANGEHIST:
                    var chatId = base64urlencode(cmd.substr(1, 8));
                    var fromMsg = base64urlencode(cmd.substr(9, 8));
                    var toMsg = base64urlencode(cmd.substr(17, 8));

                    result += " (chatId) " + chatId + " (fromMsgId) " + fromMsg + " (toMsgId) " + toMsg;
                    break;
                case Chatd.Opcode.MSGUPD:
                    var chatId = base64urlencode(cmd.substr(1, 8));
                    var msgxid = base64urlencode(cmd.substr(17, 8));
                    var updated = Chatd.unpack16le(cmd.substr(29, 2));
                    var keyid = Chatd.unpack32le(cmd.substr(31, 4));
                    var msgLength = Chatd.unpack32le(cmd.substr(35, 4));
                    var msg = cmd.substr(39, msgLength);

                    result += " (chatId) " + chatId + " (msgxid) " + msgxid + " (updated) " + updated +
                    " (keyid) " + keyid + " (message.length) " + msgLength + " (message) " + msg;
                    break;
                default:
                    if (cmd.length > 64) {
                        result += ' ' + Chatd.dumpToHex(cmd, 1, 64) + '...';
                    } else {
                        result += ' ' + Chatd.dumpToHex(cmd, 1);
                    }
            }
        }
    }

    return result;
};

Chatd.Shard.prototype.multicmd = function(cmds) {
    var self = this;
    cmds.forEach(function(cmdObj) {
        var opCode = cmdObj[0];
        var cmd = cmdObj[1];
        var buf = String.fromCharCode(opCode) + cmd;
        self.cmdq += buf;
        if (self.loggerIsEnabled) {
            self.logger.log("send:", Chatd.cmdToString(buf, true));
        }
    });
    return this.triggerSendIfAble();
};

Chatd.Shard.prototype.cmd = function(opCode, cmd) {
    var buf = String.fromCharCode(opCode);
    if (cmd) {
        buf += cmd;
    }
    this.cmdq += buf;
    if (this.loggerIsEnabled) {
        this.logger.log('send:', Chatd.cmdToString(buf, true));
    }
    return this.triggerSendIfAble();
};
/*
 * Same as .cmd, but checks if the shard has a clientId assigned. It may be
 * connected and fully operational for text chat, but not yet assigned a clientId,
 * which is needed for webrtc
 */
Chatd.Shard.prototype.rtcmd = function(opCode, cmd) {
    if (!this.clientId) {
        return false;
    }
    return this.cmd(opCode, cmd);
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

Chatd.Shard.prototype.triggerSendIfAble = function() {
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
        }
        catch (ex) {
            return false;
        }

        this.cmdq = '';
    }
    return true;
};

// rejoin all open chats after reconnection (this is mandatory)
Chatd.Shard.prototype.rejoinexisting = function() {
    for (var c in this.chatIds) {
        if (!this.joinedChatIds[c]) {
            // rejoin chat and immediately set the locally buffered message range
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

Chatd.Shard.prototype.restoreIfNeeded = function(chatId) {
    var self = this;
    if (self.chatd.chatIdMessages[chatId] && self.chatd.chatIdMessages[chatId].needsRestore) {
        self.chatd.chatIdMessages[chatId].restore();
        self.chatd.chatIdMessages[chatId].needsRestore = false;
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

// send JOIN
Chatd.Shard.prototype.join = function(chatId) {
    var self = this;
    var chat = self.chatd.chatIdMessages[chatId];
    assert(chat);

    var chatRoom = self.chatd.megaChat.getChatById(base64urlencode(chatId));

    // reset chat state before join
    chat.callParticipants = {}; // map of userid->array[clientid]

    // send a `JOIN` (if no local messages are buffered) or a `JOINRANGEHIST` (if local messages are buffered)
    if (
        Object.keys(chat.buf).length === 0 &&
        (!chatRoom.messagesBuff || chatRoom.messagesBuff.messages.length === 0)
    ) {
        // if the buff is empty and (messagesBuff not initialized (chat is initializing for the first time) OR its
        // empty)
        if (self.chatd.chatdPersist) {
            self.hist(chatId, Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL * -1, true);
        }
        else {
            self.cmd(Chatd.Opcode.JOIN, chatId + self.chatd.userId + String.fromCharCode(Chatd.Priv.NOCHANGE));
            self.hist(chatId, Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL * -1);
        }
    } else {
        self.chatd.joinrangehist(chatId);
    }

};

Chatd.prototype.cmd = function(opCode, chatId, cmd) {
    return this.chatIdShard[chatId].cmd(opCode, chatId + cmd);
};

Chatd.prototype.hist = function(chatId, count) {
    this.chatIdShard[chatId].hist(chatId, count);
};

// send RANGE
Chatd.prototype.joinrangehist = function(chatId) {
    this.chatIdMessages[chatId].joinrangehist(chatId);
};

// send HIST
Chatd.Shard.prototype._sendHist = function(chatId, count) {
    this.chatd.trigger('onMessagesHistoryRequest', {
        count: count,
        chatId: base64urlencode(chatId)
    });

    this.cmd(Chatd.Opcode.HIST, chatId + Chatd.pack32le(count));
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
            .done(function(result) {
                chatRoom = megaChat.getChatById(base64urlencode(chatId));
                var messages = result[0];
                var keys = result[1];
                var highnum = result[3];
                var lastSeen = result[4];

                if (!messages || messages.length === 0) {
                    if (isInitial) {
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
                        var msgObj = msg.msgObject;

                        var msg = new Message(
                            chatRoom,
                            chatRoom.messagesBuff,
                            {
                                'messageId': msg.msgId,
                                'userId': msg.userId,
                                'keyid': msg.keyId,
                                'textContents': msgObj.textContents,
                                'delay': msgObj.delay,
                                'orderValue': msg.orderValue,
                                'updated': msgObj.updated,
                                'sent': (msg.userId === u_handle ? Message.STATE.SENT : Message.STATE.NOT_SENT),
                                'deleted': msgObj.deleted,
                                'revoked': msgObj.revoked
                            }
                        );

                        // move non Message's internal DataStruct properties manually.
                        [
                            'meta',
                            'dialogType',
                            'references',
                            'msgIdentity',
                            'metaType'
                        ].forEach(function(k) {
                            if (typeof msgObj[k] !== 'undefined') {
                                msg[k] = msgObj[k];
                            }
                        });

                        msg.source = Message.SOURCE.IDB;
                        chatRoom.messagesBuff.restoreMessage(msg);
                    });

                    if (isInitial) {
                        // do JOINRANGE after our buffer is filled
                        self.chatd.chatdPersist.getLowHighIds(base64urlencode(chatId))
                            .done(function(result) {

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
                                    count: 0,
                                    chatId: base64urlencode(chatId)
                                });

                                self.chatd.cmd(Chatd.Opcode.JOINRANGEHIST, chatId,
                                    base64urldecode(result[0]) + base64urldecode(result[1]));

                            })
                            .fail(function() {
                                self.chatd.trigger('onMessagesHistoryDone', {
                                    chatId: base64urlencode(chatId),
                                    chatdPersist: true
                                });

                                if (chatRoom) {
                                    $(chatRoom).trigger('onHistoryDecrypted');
                                }
                            });
                    }
                    else {
                        if (messages.length < count * -1) {
                            if (isInitial) {
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
                                $(chatRoom).trigger('onHistoryDecrypted');
                            }
                        }
                    }
                }
            })
            .fail(function() {
                if (isInitial) {
                    self.cmd(Chatd.Opcode.JOIN, chatId + self.chatd.userId + String.fromCharCode(Chatd.Priv.NOCHANGE));
                }
                self._sendHist(chatId, count);
            });
    }
    else {
        self._sendHist(chatId, count);
    }

    return promise;

};

// inbound command processing
// multiple commands can appear as one WebSocket frame, but commands never cross frame boundaries
// CHECK: is this assumption correct on all browsers and under all circumstances?
Chatd.Shard.prototype.exec = function(a) {
    var self = this;

    // TODO: find more optimised way of doing this...fromCharCode may also cause exceptions if too big array is passed
    var cmd = ab_to_str(a);
    if (self.loggerIsEnabled) {
        self.logger.log("recv:", Chatd.cmdToString(cmd, false));
    }

    var len;

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

                var chatId = base64urlencode(cmd.substr(1, 8));
                var userId = base64urlencode(cmd.substr(9, 8));

                var priv = cmd.charCodeAt(17);
                if (priv > 127) {
                    priv -= 256;
                }

                if (self.loggerIsEnabled) {
                    self.logger.log(
                        "Join or privilege change - user '" + userId + "' on '" + chatId + "' with privilege level " +
                        priv
                    );
                }

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
                        self.logger.error("Not sure how to handle priv: " + priv + ".");
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
                self.keepAlive.restart();
                var newmsg = opcode === Chatd.Opcode.NEWMSG;
                len = Chatd.unpack32le(cmd.substr(35, 4));
                if (self.loggerIsEnabled) {
                    self.logger.log((newmsg ? 'New' : 'Old') +
                        " message '" + base64urlencode(cmd.substr(17, 8)) +
                        "' from '" + base64urlencode(cmd.substr(9, 8)) +
                        "' on '" + base64urlencode(cmd.substr(1, 8)) +
                        "' at " + Chatd.unpack32le(cmd.substr(25, 4)) + ': ' +
                        Chatd.dumpToHex(cmd, 35, len));
                }
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
                if (self.loggerIsEnabled) {
                    self.logger.debug("processing RTCMD_" + constStateToText(RTCMD, rtcmd));
                }

              //self.logger.debug("processing RTCMD_" + constStateToText(RTCMD, rtcmd));
                self.chatd.rtcHandler.handleMessage(self, cmd, len);
                break;
            case Chatd.Opcode.CALLDATA:
                self.keepAlive.restart();
                // (opcode.1 chatid.8 userid.8 clientid.4 len.2) (payload.len)
                var pllen = Chatd.unpack16le(cmd.substr(21, 2));
                len = 23 + pllen;
                if (len > cmd.length) {
                    break; //will be re-checked and cause error
                }
                //checks if payload spans outside actual cmd.length
                self.chatd.rtcHandler.handleCallData(self, cmd, pllen);
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
                    self.chatd.rtcHandler.onUserOffline(chatid, userid, clientid);
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
                    self.logger.log("Assigned CLIENTID 0x" + Chatd.dumpToHex(self.clientId, 0, 4, true),
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
                    messageId: base64urlencode(cmd.substr(9, 8))
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
                if (self.loggerIsEnabled) {
                    self.logger.log("Command was rejected, chatId : " +
                        base64urlencode(cmd.substr(1, 8)) + " / msgId : " +
                        base64urlencode(cmd.substr(9, 8)) + " / opcode: " +
                        cmd.substr(17, 1).charCodeAt(0) + " / reason: " + cmd.substr(18, 1).charCodeAt(0));
                }

                if (cmd.charCodeAt(17) === Chatd.Opcode.NEWMSG) {
                    // the message was rejected
                    self.chatd.msgconfirm(cmd.substr(9, 8), false);
                }
                else if (cmd.charCodeAt(17) === Chatd.Opcode.RANGE && cmd.substr(18, 1).charCodeAt(0) === 1) {
                    // JOINRANGEHIST was rejected
                    self.chatd.onJoinRangeHistReject(
                        cmd.substr(1, 8),
                        self.shard
                    );
                }
                else if (cmd.charCodeAt(17) === Chatd.Opcode.MSGUPD || cmd.charCodeAt(17) === Chatd.Opcode.MSGUPDX) {
                    // the edit was rejected
                    self.chatd.editreject(cmd.substr(1, 8), cmd.substr(9, 8));
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
                if (self.loggerIsEnabled) {
                    self.logger.log("History retrieval finished: " + base64urlencode(cmd.substr(1, 8)));
                }
                // Resending of pending message should be done via the integration code,
                // since it have more info and a direct relation with the UI related actions on pending messages
                // (persistence, user can click resend/cancel/etc).
                self.resendpending(cmd.substr(1, 8));
                self.restoreIfNeeded(cmd.substr(1, 8));

                self.chatd.trigger('onMessagesHistoryDone',
                    {
                        chatId: base64urlencode(cmd.substr(1, 8))
                    }
                );
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
                self.logger.log("Ignoring received "+constStateToText(Chatd.Opcode, opcode));
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


        // do some cleanup now...
        delete shard.joinedChatIds[chatId];
        delete shard.chatIds[chatId];
        if (Object.keys(shard.joinedChatIds).length === 0) {
            shard.destroyed = true;
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
        // clear up pending list.
        this.chatIdMessages[chatId].clearpending();
        delete this.chatIdMessages[chatId];
        delete this.chatIdShard[chatId];
    }
};

// gracefully terminate all connections/calls
Chatd.prototype.shutdown = function() {
    this.rtcHandler.onShutdown();
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
            cmd = [Chatd.Opcode.NEWMSG,
                chatId + Chatd.Const.UNDEFINED + msgxid + Chatd.pack32le(timestamp) +
                Chatd.pack16le(0) + Chatd.pack32le(keyid) + Chatd.pack32le(message.length) + message];
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
    this.needsRestore = true;
};

Chatd.Messages.prototype.submit = function(messages, keyId) {
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
        this.sendingbuf[++this.sendingnum] =
            [msgxid, this.chatd.userId, timestamp, message.message, (keyId >>> 0), 0, message.type];
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
    }

    // if we believe to be online, send immediately
    if (this.chatd.chatIdShard[this.chatId].isOnline()) {
        this.chatd.chatIdShard[this.chatId].msg(this.chatId, messageConstructs);
    }
    return this.sendingnum >>> 0;
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
            self.sendingbuf[++self.sendingnum] = [self.sendingbuf[msgnum][Chatd.MsgField.MSGID],
                self.sendingbuf[msgnum][Chatd.MsgField.USERID],
                self.sendingbuf[msgnum][Chatd.MsgField.TIMESTAMP],
                message, self.sendingbuf[msgnum][Chatd.MsgField.KEYID],
                mintimestamp - self.sendingbuf[msgnum][Chatd.MsgField.TIMESTAMP] + 1, Chatd.MsgType.EDIT];

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

        self.sendingbuf[++self.sendingnum] = [
            self.buf[msgnum][Chatd.MsgField.MSGID],
            self.buf[msgnum][Chatd.MsgField.USERID],
            self.buf[msgnum][Chatd.MsgField.TIMESTAMP],
            message,
            self.buf[msgnum][Chatd.MsgField.KEYID],
            updated,
            Chatd.MsgType.EDIT
        ];

        self.sending[messagekey] = self.sendingnum;
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
Chatd.Messages.prototype.joinrangehistViaMessagesBuff = function(chatId) {
    var self = this;
    var chatRoom = self.chatd.megaChat.getChatById(base64urlencode(chatId));

    var firstLast;
    if (chatRoom && chatRoom.messagesBuff && chatRoom.messagesBuff.messages.length > 0) {
        firstLast = chatRoom.messagesBuff.getLowHighIds();
        if (firstLast) {
            // queued this as last to execute after this current .done cb.
            self.chatd.trigger('onMessagesHistoryRequest', {
                count: 0,
                chatId: base64urlencode(chatId)
            });

            self.chatd.cmd(Chatd.Opcode.JOINRANGEHIST, chatId,
                base64urldecode(firstLast[0]) + base64urldecode(firstLast[1]));
        }
    }

    if (!firstLast) {
        if (d) {
            console.warn("JOINRANGEHIST failed, getLowHighIds, returned err. Doing a regular .JOIN", e);
        }

        self.chatd.cmd(
            Chatd.Opcode.JOIN,
            chatId,
            self.chatd.userId + String.fromCharCode(Chatd.Priv.NOCHANGE)
        );
        if (chatRoom && chatRoom.messagesBuff && chatRoom.messagesBuff.messages.length > 0) {
            console.error("clear the buffer, would need a full resync.");
        }
        self.chatd.trigger('onMessagesHistoryRequest', {
            count: Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL,
            chatId: base64urlencode(chatId)
        });
        self.chatd.chatIdShard[chatId]._sendHist(chatId, Chatd.MESSAGE_HISTORY_LOAD_COUNT_INITIAL * -1);
    }
};

// after a reconnect, we tell the chatd the oldest and newest buffered message
Chatd.Messages.prototype.joinrangehist = function(chatId) {
    var self = this;

    if (self.chatd.chatdPersist) {
        // this would be called on reconnect if messages were added to the buff,
        // so ensure we are using the correct first/last msgIds as from the actual
        // iDB

        self.chatd.chatdPersist.getLowHighIds(base64urlencode(chatId))
            .done(function(result) {
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
                    count: 0,
                    chatId: base64urlencode(chatId)
                });

                self.chatd.cmd(Chatd.Opcode.JOINRANGEHIST, chatId,
                    base64urldecode(result[0]) + base64urldecode(result[1]));
            })
            .fail(function(e) {
                // This may be triggered by chatdPersist crashing and causing a re-connection + re-hist sync. In this
                // case, we need to run JOINRANGEHIST otherwise, it would cause the client to (eventually) move
                // existing msgs to lownum IDs (e.g. back to the top of the list of msgs)

                self.joinrangehistViaMessagesBuff(chatId);

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

                this.chatd.cmd(Chatd.Opcode.JOINRANGEHIST, chatId,
                    this.buf[low][Chatd.MsgField.MSGID] + this.buf[high][Chatd.MsgField.MSGID]);

                this.chatd.trigger('onMessagesHistoryRequest', {
                    count: Chatd.MESSAGE_HISTORY_LOAD_COUNT,
                    chatId: base64urlencode(chatId)
                });
                requested = true;
                break;
            }
        }

        if (!requested) {
            self.joinrangehistViaMessagesBuff(chatId);
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
    var cdr = self.chatIdMessages[chatIdBin] = new Chatd.Messages(self, chatIdBin);
    chatRoom.messagesBuff.messageOrders = {};
    chatRoom.notDecryptedBuffer = {};
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
            'sendingnum',
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
        var messageKeys = chatRoom.messagesBuff.messages.keys();

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
Chatd.Messages.prototype.store = function(newmsg, userId, msgid, timestamp, updated, keyid, msg, skipPersist) {
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
Chatd.Messages.prototype.msgmodify = function(userid, msgid, ts, updated, keyid, msg, isRetry) {
    var origMsgNum;

    // retrieve msg from chatdPersist if missing in the buff
    if (this.chatd.chatdPersist) {
        origMsgNum = this.getmessagenum(msgid);

        if (!origMsgNum || !this.buf[origMsgNum]) {
            if (isRetry) {
                return;
            }
            var encChatId = base64urlencode(this.chatId);
            var self = this;

            this.chatd.chatdPersist.getMessageByMessageId(encChatId, base64urlencode(msgid))
                .done(function(r) {
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
                            .done(function() {
                                done();
                            });
                    }
                    else {
                        done();
                    }
                })
                .fail(function() {
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

            if (keyid === 0) {
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

            if (keyid !== 0) {
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

    if (keyid === 0 && this.chatd.chatdPersist) {
        // if this is a truncate, trigger the persistTruncate in chatdPersist.
        var bufMessage = this.buf[origMsgNum];

        this.chatd.chatdPersist.persistTruncate(base64urlencode(this.chatId), origMsgNum)
            .always(function () {
                // update the .buf[i] to contain the proper KEYID = 0 and USERID = api.
                bufMessage[Chatd.MsgField.KEYID] = keyid;
                bufMessage[Chatd.MsgField.USERID] = userid;
            });
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
        array.remove(self.sendingList, firstkeyxkey);
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
                        self.sendingbuf[++self.sendingnum] =
                            [v.messageId, v.userId, v.timestamp, v.message, v.keyId, v.updated, v.type];
                        self.sending[messagekey] = self.sendingnum;
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
    var clients = self.callParticipants[userid];
    if (!clients) {
        self.callParticipants[userid] = [clientid];
        return;
    }
    var len = clients.length;
    for (var i = 0; i < len; i++) {
        if (clients[i] === clientid) {
            return;
        }
    }
    clients.push(clientid);
};

Chatd.Messages.prototype.onEndCall = function(userid, clientid) {
    var self = this;
    var clients = self.callParticipants[userid];
    if (!clients) {
        return;
    }
    var len = clients.length;
    for (var i = 0; i < len; i++) {
        if (clients[i] === clientid) {
            var newClients = clients.splice(i, 1);
            if (newClients.length === 0) {
                delete self.callParticipants[userid];
            } else {
                self.callParticipants = newClients;
            }
            return;
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

