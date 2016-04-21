// chatd interface
var Chatd = function(userId, options) {
    var self = this;

    // maps the chatd shard number to its corresponding Chatd.Shard object
    self.shards = {};

    // maps a chatId to the handling Chatd.Shard object
    self.chatIdShard = {};

    // maps chatIds to the Message object
    self.chatIdMessages = {};

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

    self.logger = new MegaLogger("chatd");

    self.options = $.extend({}, Chatd.DEFAULT_OPTIONS, options);

    // debug mode
    [
        //'onMessageUpdated',
        //'onMessageConfirm',
        //'onMessageReject',
        //'onMessageCheck',
        //'onMessageModify',
        //'onMessageStore',
        //'onMessageSeen',
        //'onMessageLastSeen',
        //'onMessageReceived',
        //'onMessageLastReceived',
        //'onRetentionChanged',
        //'onMessagesHistoryInfo',
        //'onMembersUpdated',
        //'onMessagesHistoryDone',
        //'onMessagesHistoryRequest',
    ].forEach(function(evt) {
            self.rebind(evt + '.chatd', function(e) {
                console.error(evt, JSON.stringify(arguments[1]));
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
    'MSGID' : 10,
    'REJECT' : 11,
    'HISTDONE' : 13,
    'NEWKEY' : 17,
    'KEYID' : 18,
    'JOINRANGEHIST' : 19,
    'MSGUPDX' : 20
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
    'UPDATED' : 5
};

Chatd.Const = {
    'UNDEFINED' : '\0\0\0\0\0\0\0\0'
};

Chatd.MAX_KEEPALIVE_DELAY = 60000;

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

    self.logger = new MegaLogger("shard-" + shard, {}, chatd.logger);

    self.keepAliveTimer = null;

    self.connectionRetryManager = new ConnectionRetryManager(
        {
            functions: {
                reconnect: function(connectionRetryManager) {
                    //console.error("reconnect was called");
                    return self.reconnect();
                },
                /**
                 * A Callback that will trigger the 'forceDisconnect' procedure for this type of connection (Karere/Chatd/etc)
                 * @param connectionRetryManager {ConnectionRetryManager}
                 */
                forceDisconnect: function(connectionRetryManager) {
                    //console.error("forceDisconnect was called");
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
                        self.chatd.destroyed === true || localStorage.megaChatPresence === "unavailable"
                    );
                }
            }
        },
        self.logger
    );
};

// is this chatd connection currently active?
Chatd.Shard.prototype.isOnline = function() {
    return this.s && this.s.readyState == this.s.OPEN;
};

Chatd.Shard.prototype.reconnect = function() {
    var self = this;

    self.s = new WebSocket(this.url);
    self.s.binaryType = "arraybuffer";

    self.s.onopen = function(e) {
        self.keepAliveTimerRestart();
        self.logger.log('chatd connection established');
        self.triggerSendIfAble();
        self.rejoinexisting();
        self.resendpending();
    };

    self.s.onerror = function(e) {
        self.logger.error("WebSocket error:", e);
        clearTimeout(self.keepAliveTimer);
        self.connectionRetryManager.doConnectionRetry();
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
    };
};

Chatd.Shard.prototype.disconnect = function() {
    var self = this;

    if (self.s) {
        self.s.close();
    }
    self.s = null;

    clearTimeout(self.keepAliveTimer);
};

Chatd.Shard.prototype.multicmd = function(cmds) {
    var self = this;
    cmds.forEach( function _iterator(cmdObj)
    {
        var opCode = cmdObj[0];
        var cmd = cmdObj[1];
        console.error("MULTICMD SENT: ", constStateToText(Chatd.Opcode, opCode), cmd);
        self.cmdq += String.fromCharCode(opCode)+cmd;
    });

    this.triggerSendIfAble();
};

Chatd.Shard.prototype.cmd = function(opCode, cmd) {
    console.error("CMD SENT: ", constStateToText(Chatd.Opcode, opCode), cmd);

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
            this.s.send(a);

            this.cmdq = '';
        }
    }
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

// resend all unconfirmed messages (this is mandatory)
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
    console.log('Receive from chatd');
    var codestr = '';
    for (var i=0;i<cmd.length;i++)
    {
        codestr += cmd[i].charCodeAt(0).toString(16) + " ";
        
    }
    console.log(codestr);
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
                    if (priv === 1 || priv === 2 || priv === 3) {
                        // ^^ explicit and easy to read...despite that i could have done >= 1 <= 3 or something like
                        // that..
                        if (!self.joinedChatIds[chatId]) {
                            self.joinedChatIds[chatId] = true;
                        }
                    }
                    else if (priv === -1) {
                        delete self.joinedChatIds[chatId];
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
                self.logger.log((newmsg ? 'New' : 'Old') + " message '" + base64urlencode(cmd.substr(17,8)) + "' from '" + base64urlencode(cmd.substr(9,8)) + "' on '" + base64urlencode(cmd.substr(1,8)) + "' at " + self.chatd.unpack32le(cmd.substr(25,4)) + ': ' + cmd.substr(35,len));
                len += 39;

                self.chatd.msgstore(newmsg, cmd.substr(1,8), cmd.substr(9,8), cmd.substr(17,8), self.chatd.unpack32le(cmd.substr(25,4)), self.chatd.unpack16le(cmd.substr(29,2)), self.chatd.unpack32le(cmd.substr(31,4)), cmd.substr(39,len));
                break;
            case Chatd.Opcode.MSGUPD:
            case Chatd.Opcode.MSGUPDX:
                self.keepAliveTimerRestart();
                len = self.chatd.unpack32le(cmd.substr(35,4));
                self.logger.log("Message '" + base64urlencode(cmd.substr(16,8)) + "' EDIT/DELETION: " + cmd.substr(39,len));
                len += 39;

                self.chatd.msgmodify(cmd.substr(1,8), cmd.substr(9,8), self.chatd.unpack16le(cmd.substr(29,2)), self.chatd.unpack32le(cmd.substr(31,4)), cmd.substr(39,len));
                break;

            case Chatd.Opcode.SEEN:
                self.keepAliveTimerRestart();
                self.logger.log("Newest seen message on '" + base64urlencode(cmd.substr(1, 8)) + "': '" + base64urlencode(cmd.substr(9, 8)) + "'");

                self.chatd.trigger('onMessageLastSeen', {
                    chatId: base64urlencode(cmd.substr(1, 8)),
                    messageId: base64urlencode(cmd.substr(9, 8))
                });

                len = 17;
                break;

            case Chatd.Opcode.RECEIVED:
                self.keepAliveTimerRestart();
                self.logger.log("Newest delivered message on '" + base64urlencode(cmd.substr(1,8)) + "': '" + base64urlencode(cmd.substr(9,8)) + "'");

                self.chatd.trigger('onMessageLastReceived', {
                    chatId: base64urlencode(cmd.substr(1, 8)),
                    messageId: base64urlencode(cmd.substr(9, 8))
                });

                len = 17;
                break;

            case Chatd.Opcode.RETENTION:
                self.keepAliveTimerRestart();
                self.logger.log("Retention policy change on '" + base64urlencode(cmd.substr(1,8)) + "' by '" + base64urlencode(cmd.substr(9,8)) + "': " + self.chatd.unpack32le(cmd.substr(17,4)) + " second(s)");
                self.chatd.trigger('onRetentionChanged', {
                    chatId: base64urlencode(cmd.substr(1, 8)),
                    userId: base64urlencode(cmd.substr(9, 8)),
                    retention: self.chatd.unpack32le(cmd.substr(17, 4))
                });

                len = 21;
                break;

            case Chatd.Opcode.MSGID:
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
                self.logger.log("Command was rejected: " + self.chatd.unpack32le(cmd.substr(9,4)) + " / " + self.chatd.unpack32le(cmd.substr(13,4)));

                if (self.chatd.unpack32le(cmd.substr(9,4)) == Chatd.Opcode.NEWMSG) {
                    // the message was rejected
                    self.chatd.msgconfirm(cmd.substr(1,8), false);
                }

                len = 17;
                break;

            case Chatd.Opcode.HISTDONE:
                self.keepAliveTimerRestart();
                self.logger.log("History retrieval finished: " + base64urlencode(cmd.substr(1,8)));

                self.chatd.trigger('onMessagesHistoryDone',
                    {
                        chatId: base64urlencode(cmd.substr(1,8))
                    }
                );

                len = 9;
                break;
            case Chatd.Opcode.NEWKEY:
                //self.keepAliveTimerRestart();
                self.logger.log("Set keys: " + base64urlencode(cmd.substr(1,8)) + "length: " + self.chatd.unpack32le(cmd.substr(13,4)));
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
                //self.keepAliveTimerRestart();
                self.logger.log("GET new key: " + base64urlencode(cmd.substr(1,8)));

                self.chatd.trigger('onMessagesKeyIdDone',
                    {
                        chatId: base64urlencode(cmd.substr(1,8)),
                        keyxid: self.chatd.unpack32le(cmd.substr(9,4)),
                        keyid:  self.chatd.unpack32le(cmd.substr(13,4))
                    }
                );

                len = 17;
                break;
            default:
                self.logger.error(
                    "FATAL: Unknown opCode " + cmd.charCodeAt(0) +
                    ". To stop potential loop-forever case, the next commands in the buffer were rejected!"
                );
                // remove the command from the queue, its already processed, if this is not done, the code will loop forever
                cmd = "";
        }

        if (cmd.length < len) {
            self.logger.error(
                "FATAL: Short WebSocket frame - got " + cmd.length + ", expected " + len +
                ". To stop potential loop-forever case, the next commands in the buffer were rejected!"
            );

            // remove the command from the queue, its already processed, if this is not done, the code will loop forever
            cmd = "";
            break;
        }

        cmd = cmd.substr(len);
    }
};

// generate and return next msgTransactionId in sequence
Chatd.prototype.nexttransactionid = function() {
    for (var i = 0; i < this.msgTransactionId.length; i++) {
        //TODO: LP: @Mathias: what is `c`?
        var c = (this.msgTransactionId.charCodeAt(i)+1) & 0xff;

        this.msgTransactionId = this.msgTransactionId.substr(0,i) + String.fromCharCode(c) + this.msgTransactionId.substr(i+1);

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
        var type = messageObj.type;
        var cmd = '';
        if (type === strongvelope.MESSAGE_TYPES.GROUP_KEYED) {// this is key message;
            cmd = [Chatd.Opcode.NEWKEY, chatId + this.chatd.pack32le(keyid) + this.chatd.pack32le(message.length) + message];
        } else {
            cmd = [Chatd.Opcode.NEWMSG, chatId + Chatd.Const.UNDEFINED + msgxid + this.chatd.pack32le(timestamp) + this.chatd.pack16le(0) + this.chatd.pack32le(keyid) + this.chatd.pack32le(message.length) + message];
        }
        cmds.push(cmd);
    };

    this.multicmd(cmds);
};

Chatd.Shard.prototype.msgupd = function(chatId, msgid, timestamp, message, keyid) {
    this.cmd(Chatd.Opcode.MSGUPD, chatId + Chatd.Const.UNDEFINED + msgid + this.chatd.pack32le(timestamp) + this.chatd.pack16le(0) + this.chatd.pack32le(keyid) + this.chatd.pack32le(message.length) + message);
};

Chatd.Shard.prototype.msgupdx = function(chatId, msgxid, timestamp, message, keyxid) {
    this.cmd(Chatd.Opcode.MSGUPDX, chatId + Chatd.Const.UNDEFINED + msgxid + this.chatd.pack32le(timestamp) + this.chatd.pack16le(0) + this.chatd.pack32le(keyxid) + this.chatd.pack32le(message.length) + message);
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

    this.sentid = false;
    this.receivedid = false;
    this.seenid = false;

    // message format: [msgid/transactionid, userId, timestamp, message]
    // messages in buf are indexed by a numeric id
    this.buf = {};

    // mapping of transactionids of messages being sent to the numeric index of this.buf
    this.sending = {};
    this.sendingList = [];

    // msgnums of modified messages
    this.modified = {};
};

Chatd.Messages.prototype.submit = function(messages, keyId) {
    // messages is an array
    var messageConstructs = [];

    for (var i = 0; i<messages.length; i++) {
        var message = messages[i];
        if (message.type === strongvelope.MESSAGE_TYPES.GROUP_KEYED) {
            messageConstructs.push({"msgxid":0, "timestamp":0,"keyid":keyId, "message":message.message, "type":message.type});
            continue;
        }
        // allocate a transactionid for the new message
        var msgxid = this.chatd.nexttransactionid();
        var timestamp = Math.floor(new Date().getTime()/1000);

        // write the new message to the message buffer and mark as in sending state
        // FIXME: there is a tiny chance of a namespace clash between msgid and msgxid, FIX
        this.buf[++this.highnum] = [msgxid, this.chatd.userId, timestamp, message.message, keyId];

        this.chatd.trigger('onMessageUpdated', {
            chatId: base64urlencode(this.chatId),
            id: this.highnum,
            state: 'PENDING',
            keyid: keyId,
            message: message.message
        });
        
        this.sending[msgxid] = this.highnum;
        this.sendingList.push(msgxid);

        messageConstructs.push({"msgxid":msgxid, "timestamp":timestamp,"keyid":keyId, "message":message.message, "type":message.type});
    };

    // if we believe to be online, send immediately
    if (this.chatd.chatIdShard[this.chatId].isOnline()) {
        this.chatd.chatIdShard[this.chatId].msg(this.chatId, messageConstructs);
    }
    return this.highnum;
};

Chatd.Messages.prototype.modify = function(msgnum, message) {
    var self = this;

    // TODO: LP: Mathias: this variable is not used, why ?
    var mintimestamp = Math.floor(new Date().getTime()/1000)-600;
    var keyid = this.buf[msgnum][Chatd.MsgField.KEYID];

    // modify pending message so that a potential resend includes the change
    if (this.sending[this.buf[msgnum][Chatd.MsgField.MSGID]]) {
        this.buf[msgnum][Chatd.MsgField.MESSAGE] = message;
        self.chatd.chatIdShard[this.chatId].msgupdx(this.chatId, this.buf[msgnum][Chatd.MsgField.MSGID], this.buf[msgnum][Chatd.MsgField.TIMESTAMP], message, this.buf[msgnum][Chatd.MsgField.KEYID]);
    }
    else if (self.chatd.chatIdShard[this.chatId].isOnline()) {
        self.chatd.chatIdShard[this.chatId].msgupd(this.chatId, this.buf[msgnum][Chatd.MsgField.MSGID], this.buf[msgnum][Chatd.MsgField.TIMESTAMP], message, this.buf[msgnum][Chatd.MsgField.KEYID]);
    }

    this.chatd.trigger('onMessageModify', {
        chatId: base64urlencode(this.chatId),
        id: msgnum,
        message: message
    });

    this.chatd.trigger('onMessageUpdated', {
        chatId: base64urlencode(this.chatId),
        id: msgnum,
        state: 'EDITING',
        keyid: keyid,
        message: message
    });

    // record this modification for resending purposes
    this.modified[msgnum] = 1;

    // FIXME: client-side prefiltering for the server-side modification time barrier
    // FIXME: overwrite failed modifications with the original message
};

Chatd.Messages.prototype.resend = function() {
    var self = this;

    // resend all pending new messages and modifications
    this.sendingList.forEach(function(msgxid) {
        self.chatd.chatIdShard[self.chatId].msg(
            self.chatId,
            msgxid,
            self.buf[self.sending[msgxid]][Chatd.MsgField.TIMESTAMP],
            self.buf[self.sending[msgxid]][Chatd.MsgField.MESSAGE]
        );
    });

    // resend all pending modifications of completed messages
    for (var msgnum in this.modified) {
        if (!this.sending[this.buf[msgnum][Chatd.MsgField.MSGID]]) {
            self.chatd.chatIdShard[this.chatId].msgupd(
                this.chatId,
                this.buf[msgnum][Chatd.MsgField.MSGID],
                this.buf[msgnum][Chatd.MsgField.MESSAGE],
                this.buf[msgnum][Chatd.MsgField.KEYID]
            );
        }
    }
};

// after a reconnect, we tell the chatd the oldest and newest buffered message
Chatd.Messages.prototype.joinrangehist = function(chatId) {
    var low, high;

    for (low = this.lownum; low <= this.highnum; low++) {
        if (this.buf[low] && !this.sending[this.buf[low][Chatd.MsgField.MSGID]]) {
            for (high = this.highnum; high > low; high--) {
                if (!this.sending[this.buf[high][Chatd.MsgField.MSGID]]) break;
            }

            this.chatd.cmd(Chatd.Opcode.JOINRANGEHIST, chatId, this.buf[low][Chatd.MsgField.MSGID] + this.buf[high][Chatd.MsgField.MSGID]);
            break;
        }
    }
};

Chatd.prototype.msgconfirm = function(msgxid, msgid) {
    // CHECK: is it more efficient to keep a separate mapping of msgxid to Chatd.Messages?
    for (var chatId in this.chatIdMessages) {
        if (this.chatIdMessages[chatId].sending[msgxid]) {
            if (this.chatIdMessages[chatId]) {
                this.chatIdMessages[chatId].confirm(chatId, msgxid, msgid);
            }
            break;
        }
    }
};

// msgid can be false in case of rejections
Chatd.Messages.prototype.confirm = function(chatId, msgxid, msgid) {
    var self = this;
    var num = this.sending[msgxid];

    removeValue(this.sendingList, msgxid);
    delete this.sending[msgxid];

    this.buf[num][Chatd.MsgField.MSGID] = msgid;
    this.chatd.trigger('onMessageUpdated', {
        chatId: base64urlencode(chatId),
        id: num,
        state: "CONFIRMED",
        messageId: base64urlencode(msgid),
        keyid: this.buf[num][Chatd.MsgField.KEYID],
        message: this.buf[num][Chatd.MsgField.MESSAGE]
    });

    if (msgid === false) {
        this.chatd.trigger('onMessageReject', {
            chatId: base64urlencode(chatId),
            id: num,
            messageId: base64urlencode(msgid),
            message: this.buf[num][Chatd.MsgField.MESSAGE]
        });
    }
    else {
        this.chatd.trigger('onMessageConfirm', {
            chatId: base64urlencode(chatId),
            id: num,
            messageId: base64urlencode(msgid),
            message: this.buf[num][Chatd.MsgField.MESSAGE]
        });
    }

    // we now have a proper msgid, resend MSGUPD in case the edit crossed the execution of the command
    if (this.modified[num]) {
        self.chatd.chatIdShard[chatId].msgupd(chatId, msgid, this.buf[num][Chatd.MsgField.MESSAGE], this.buf[num][Chatd.MsgField.KEYID]);
    }
};

Chatd.prototype.msgstore = function(newmsg, chatId, userId, msgid, timestamp, updated, keyid, msg) {
    if (this.chatIdMessages[chatId]) {
        this.chatIdMessages[chatId].store(newmsg, userId, msgid, timestamp, updated, keyid, msg);
    }
};

Chatd.Messages.prototype.store = function(newmsg, userId, msgid, timestamp, updated, keyid, msg) {
    var id;

    if (newmsg) {
        id = ++this.highnum;
    }
    else {
        id = this.lownum--;
    }

    // store message
    this.buf[id] = [msgid, userId, timestamp, msg, keyid, updated];

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

Chatd.prototype.msgmodify = function(chatId, msgid, updated, keyid, msg) {
    // an existing message has been modified
    if (this.chatIdMessages[chatId]) {
        this.chatIdMessages[chatId].msgmodify(msgid, updated, keyid, msg);
    }
};

Chatd.Messages.prototype.msgmodify = function(chatId, msgid, updated, keyid, msg) {
    // CHECK: is it more efficient to maintain a full hash msgid -> num?
    // FIXME: eliminate namespace clash collision risk
    for (var i = this.highnum; i > this.lownum; i--) {
        if (this.buf[i][Chatd.MsgField.MSGID] === msgid) {
            // if we modified the message, remove from this.modified.
            // if someone else did before us, resend the MSGUPD (might be redundant)
            if (this.modified[i]) {
                if (this.buf[i][Chatd.MsgField.MESSAGE] === msg) {
                    delete this.modified[i];
                }
                else {
                    this.chatd.chatIdShard[chatId].msgupd(chatId, msgid, msg, keyid);
                }
            }
            else {
                this.buf[i][Chatd.MsgField.MESSAGE] = msg;
                this.buf[i][Chatd.MsgField.UPDATED] = updated;
            }

            break;
        }
    }
};

Chatd.prototype.msgcheck = function(chatId, msgid) {
    if (this.chatIdMessages[chatId]) {
        this.chatIdMessages[chatId].check(chatId, msgid);
    }
};

Chatd.Messages.prototype.check = function(chatId, msgid) {
    if (Object.keys(this.buf).length === 0) {
        this.chatd.trigger('onMessageCheck', {
            chatId: base64urlencode(chatId),
            messageId: base64urlencode(msgid)
        });
    }
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
