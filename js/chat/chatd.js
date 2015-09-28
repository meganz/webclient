var chatd = false; // chat root

//TODO: LP: remove any global references to ^^^ chatd

// chatd interface
var Chatd = function(userid, options) {
    var self = this;

    // maps the chatd shard number to its corresponding Chatd.Shard object
    self.shards = {};

    // maps a chatid to the handling Chatd.Shard object
    self.chatidshard = {};

    // maps chatids to the Message object
    self.chatidmessages = {};

    // random starting point for the new message transaction ID
    // FIXME: use cryptographically strong PRNG instead
    // CHECK: is this sufficiently collision-proof? a collision would have to occur in the same second for the same userid.
    self.msgtransactionid = '';
    self.userid = base64urldecode(userid);

    for (var i = 8; i--; ) {
        self.msgtransactionid += String.fromCharCode(Math.random()*256);
    }

    self.logger = new MegaLogger("chatd");

    self.options = $.extend({}, Chatd.DEFAULT_OPTIONS, options);


    var self = this;
    // debug mode
    [
        'onMessageUpdated',
        'onMessageConfirm',
        'onMessageReject',
        'onMessageCheck',
        'onMessageModify',
        'onMessageStore',
        'onMessageSeen',
        'onMessageLastSeen',
        'onMessageReceived',
        'onMessageLastReceived',
        'onRetentionChanged',
        'onMessagesHistoryInfo',
        'onMembersUpdated',
        'onMessagesHistoryDone'
    ].forEach(function(evt) {
            self.rebind(evt + '.chatd', function(e) {
                console.error(evt, JSON.stringify(arguments[1]));
            });
    });
};

makeObservable(Chatd);

Chatd.DEFAULT_OPTIONS = {
};

// command opcodes
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
    'HISTDONE' : 13
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

Chatd.MsgField = {
    'MSGID' : 0,
    'USERID' : 1,
    'TIMESTAMP' : 2,
    'MESSAGE' : 3
};

Chatd.Const = {
    'UNDEFINED' : '\0\0\0\0\0\0\0\0'
};


// add a new chatd shard
Chatd.prototype.addshard = function(chatid, shard, url) {
    // instantiate Chatd.Shard object for this shard if needed
    var newshard = !this.shards[shard];

    if (newshard) {
        this.shards[shard] = new Chatd.Shard(this, shard);
    }

    // map chatid to this shard
    this.chatidshard[chatid] = this.shards[shard];

    // add chatid to the connection's chatids
    this.shards[shard].chatids[chatid] = true;

    // always update the URL to give the API an opportunity to migrate chat shards between hosts
    this.shards[shard].url = url;

    // attempt a connection ONLY if this is a new shard.
    if(newshard) {
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
    self.chatids = {};

    // queued commands
    self.cmdq = '';

    self.logger = new MegaLogger("shard-" + shard, {}, chatd.logger);

    self.connectionRetryManager = new ConnectionRetryManager(
        {
            functions: {
                reconnect: function(connectionRetryManager) {
                    //console.error("reconnect was called");
                    self.reconnect();
                },
                /**
                 * A Callback that will trigger the 'forceDisconnect' procedure for this type of connection (Karere/Chatd/etc)
                 * @param connectionRetryManager {ConnectionRetryManager}
                 */
                forceDisconnect: function(connectionRetryManager) {
                    //console.error("forceDisconnect was called");
                    self.disconnect();
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
                        localStorage.megaChatPresence === "unavailable"
                    );
                }
            }
        },
        self.logger
    );
};

// is this chatd connection currently active?
Chatd.Shard.prototype.isOnline = function() {
    return this.s.readyState == this.s.OPEN;
};

Chatd.Shard.prototype.reconnect = function() {
    var self = this;

    //console.error("shard reconnect", this.url);

    self.s = new WebSocket(this.url);
    self.s.binaryType = "arraybuffer";

    self.s.onopen = function(e) {
        self.logger.log('chatd connection established');
        self.rejoinexisting();
        self.resendpending();
    };

    self.s.onerror = function(e) {
        self.logger.error("WebSocket error:", e);
        self.connectionRetryManager.doConnectionRetry();
    };

    self.s.onmessage = function(e) {
        // verify that WebSocket frames are always delivered as a contiguous message
        self.exec(new Uint8Array(e.data));
    };

    self.s.onclose = function(e) {
        self.logger.log('chatd connection lost, reconnecting...');
        self.connectionRetryManager.gotDisconnected();
    };
};

Chatd.Shard.prototype.disconnect = function() {
    var self = this;

    if(self.s) {
        self.s.close();
    }
    self.s = null;
};

Chatd.Shard.prototype.cmd = function(opcode, cmd) {
    console.error("CMD SENT: ", constStateToText(Chatd.Opcode, opcode), cmd);
    this.cmdq += String.fromCharCode(opcode)+cmd;

    if (this.isOnline()) {
        var a = new Uint8Array(this.cmdq.length);
        for (var i = this.cmdq.length; i--; ) {
            a[i] = this.cmdq.charCodeAt(i);
        }
        this.s.send(a);

        this.cmdq = '';
    }
};

// rejoin all open chats after reconnection (this is mandatory)
Chatd.Shard.prototype.rejoinexisting = function() {
    for (var c in this.chatids) {
        // rejoin chat and immediately set the locally buffered message range
        this.join(c);
        this.chatd.range(c);
    }
};

// resend all unconfirmed messages (this is mandatory)
Chatd.Shard.prototype.resendpending = function() {
    var self = this;
    for (var chatid in this.chatids) {
        self.chatd.chatidmessages[chatid].resend();
    }
};

// send JOIN
Chatd.Shard.prototype.join = function(chatid) {
    this.cmd(Chatd.Opcode.JOIN, chatid + this.chatd.userid + String.fromCharCode(Chatd.Priv.NOCHANGE));
};

Chatd.prototype.cmd = function(opcode, chatid, cmd) {
    this.chatidshard[chatid].cmd(opcode, chatid + cmd);
};

Chatd.prototype.hist = function(chatid, count) {
    this.chatidshard[chatid].hist(chatid, count);
};

// send RANGE
Chatd.prototype.range = function(chatid) {
    this.chatidmessages[chatid].range(chatid);
};

// send HIST
Chatd.Shard.prototype.hist = function(chatid, count) {
    this.cmd(Chatd.Opcode.HIST, chatid + this.chatd.pack32le(count));
};

// inbound command processing
// multiple commands can appear as one WebSocket frame, but commands never cross frame boundaries
// CHECK: is this assumption correct on all browsers and under all circumstances?
Chatd.Shard.prototype.exec = function(a) {
    var self = this;

    var cmd = String.fromCharCode.apply(null, a);
    var len;
    var newmsg;

    while (cmd.length) {
        switch (cmd.charCodeAt(0)) {
            case Chatd.Opcode.KEEPALIVE:
                self.logger.log("Server heartbeat received");
                self.cmd(Chatd.Opcode.KEEPALIVE, "");
                len = 1;
                break;

            case Chatd.Opcode.JOIN:
                self.logger.log("Join or privilege change - user '" + base64urlencode(cmd.substr(9,8)) + "' on '" + base64urlencode(cmd.substr(1,8)) + "' with privilege level " + cmd.charCodeAt(17) );

                self.connectionRetryManager.gotConnected();

                self.chatd.trigger('onMembersUpdated', {
                    userId: base64urlencode(cmd.substr(9, 8)),
                    chatId: base64urlencode(cmd.substr(1, 8)),
                    priv: cmd.charCodeAt(17)
                });

                len = 18;
                break;

            case Chatd.Opcode.OLDMSG:
            case Chatd.Opcode.NEWMSG:
                newmsg = cmd.charCodeAt(0) == Chatd.Opcode.NEWMSG;
                len = self.chatd.unpack32le(cmd.substr(29,4));
                self.logger.log((newmsg ? 'New' : 'Old') + " message '" + base64urlencode(cmd.substr(17,8)) + "' from '" + base64urlencode(cmd.substr(9,8)) + "' on '" + base64urlencode(cmd.substr(1,8)) + "' at " + self.chatd.unpack32le(cmd.substr(25,4)) + ': ' + cmd.substr(33,len));
                len += 33;

                self.chatd.msgstore(newmsg, cmd.substr(1,8), cmd.substr(9,8), cmd.substr(17,8), self.chatd.unpack32le(cmd.substr(25,4)), cmd.substr(33,len));
                break;

            case Chatd.Opcode.MSGUPD:
                len = self.chatd.unpack32le(cmd.substr(29,4));
                self.logger.log("Message '" + base64urlencode(cmd.substr(16,8)) + "' EDIT/DELETION: " + cmd.substr(33,len));
                len += 33;

                self.chatd.msgmodify(cmd.substr(1,8), cmd.substr(9,8), cmd.substr(33,len));
                break;

            case Chatd.Opcode.SEEN:
                if(cmd.length === 25) {
                    self.logger.log("Newest seen message on '" + base64urlencode(cmd.substr(1, 8)) + "' for user '" + base64urlencode(cmd.substr(9, 8)) + "': '" + base64urlencode(cmd.substr(17, 8)) + "'");

                    self.chatd.trigger('onMessageLastSeen', {
                        chatId: base64urlencode(cmd.substr(1, 8)),
                        userId: base64urlencode(cmd.substr(9, 8)),
                        messageId: base64urlencode(cmd.substr(17, 8))
                    });

                    len = 25;
                } else if(cmd.length === 17) {
                    self.logger.log(
                        "Newest seen message on " + base64urlencode(cmd.substr(1, 8)) +
                        " message id " + base64urlencode(cmd.substr(9, 8)) + ": " +
                        " from me."
                    );

                    self.chatd.trigger('onMessageLastSeen', {
                        chatId: base64urlencode(cmd.substr(1, 8)),
                        userId: base64urlencode(self.chatd.userid),
                        messageId: base64urlencode(cmd.substr(9, 8))
                    });

                    len = 17;
                } else {
                    self.logger.error("Received SEEN command, but the length of the message was not 17 or 25, so no " +
                        "idea how to parse it...");
                }
                break;

            case Chatd.Opcode.RECEIVED:
                self.logger.log("Newest delivered message on '" + base64urlencode(cmd.substr(1,8)) + "': '" + base64urlencode(cmd.substr(9,8)) + "'");

                self.chatd.trigger('onMessageLastReceived', {
                    chatId: base64urlencode(cmd.substr(1, 8)),
                    messageId: base64urlencode(cmd.substr(9, 8))
                });

                len = 17;
                break;

            case Chatd.Opcode.RETENTION:
                self.logger.log("Retention policy change on '" + base64urlencode(cmd.substr(1,8)) + "' by '" + base64urlencode(cmd.substr(9,8)) + "': " + self.chatd.unpack32le(cmd.substr(17,4)) + " second(s)");
                self.chatd.trigger('onRetentionChanged', {
                    chatId: base64urlencode(cmd.substr(1, 8)),
                    userId: base64urlencode(cmd.substr(9, 8)),
                    retention: self.chatd.unpack32le(cmd.substr(17, 4))
                });

                len = 21;
                break;

            case Chatd.Opcode.MSGID:
                self.logger.log("Sent message ID confirmed: '" + base64urlencode(cmd.substr(9,8)) + "'");

                self.chatd.msgconfirm(cmd.substr(1,8), cmd.substr(9,8));

                len = 17;
                break;
            
            case Chatd.Opcode.RANGE:
                self.logger.log("Known chat message IDs - oldest: '" + base64urlencode(cmd.substr(9,8)) + "' newest: '" + base64urlencode(cmd.substr(17,8)) + "'");

                self.chatd.trigger('onMessagesHistoryInfo', {
                    chatId: base64urlencode(cmd.substr(1,8)),
                    oldest: base64urlencode(cmd.substr(9,8)),
                    newest: base64urlencode(cmd.substr(17,8))
                });

                self.chatd.msgcheck(cmd.substr(1,8), cmd.substr(17,8));

                len = 25;
                break;

            case Chatd.Opcode.REJECT:
                self.logger.log("Command was rejected: " + self.chatd.unpack32le(cmd.substr(9,4)) + " / " + self.chatd.unpack32le(cmd.substr(13,4)));

                if (self.chatd.unpack32le(cmd.substr(9,4)) == Chatd.Opcode.NEWMSG) {
                    // the message was rejected
                    self.chatd.msgconfirm(cmd.substr(1,8), false);
                }

                len = 17;
                break;

            case Chatd.Opcode.HISTDONE:
                self.logger.log("History retrieval finished: " + base64urlencode(cmd.substr(1,8)));

                self.chatd.trigger('onMessagesHistoryDone',
                    {
                        chatId: base64urlencode(cmd.substr(1,8))
                    }
                );

                len = 9;
                break;

            default:
                self.logger.error(
                    "FATAL: Unknown opcode " + cmd.charCodeAt(0) +
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

// generate and return next msgtransactionid in sequence
Chatd.prototype.nexttransactionid = function() {
    for (var i = 0; i < this.msgtransactionid.length; i++) {
        //TODO: LP: @Mathias: what is `c`?
        var c = (this.msgtransactionid.charCodeAt(i)+1) & 0xff;

        this.msgtransactionid = this.msgtransactionid.substr(0,i) + String.fromCharCode(c) + this.msgtransactionid.substr(i+1);

        if (c) {
            break;
        }
    }

    return this.msgtransactionid;
};

Chatd.prototype.join = function(chatid, shard, url) {
    if (!this.chatidshard[chatid]) {
        var newshard = this.addshard(chatid, shard, url);
        this.chatidmessages[chatid] = new Chatd.Messages(this, chatid);
        if (!newshard) {
            this.shards[shard].join(chatid);
        }
    }
};

// submit a new message to the chatid
Chatd.prototype.submit = function(chatid, message) {
    if (this.chatidmessages[chatid]) {
        return this.chatidmessages[chatid].submit(message);
    } else {
        return false;
    }
};

// edit or delete an existing message, returns false upon failure
Chatd.prototype.modify = function(chatid, msgnum, message) {
    if (!this.chatidmessages[chatid]) {
        return false;
    }

    return this.chatidmessages[chatid].modify(msgnum, message);
};

Chatd.Shard.prototype.msg = function(chatid, msgxid, timestamp, message) {
    this.cmd(Chatd.Opcode.NEWMSG, chatid + Chatd.Const.UNDEFINED + msgxid + this.chatd.pack32le(timestamp) + this.chatd.pack32le(message.length) + message);
};

Chatd.Shard.prototype.msgupd = function(chatid, msgid, message) {
    this.cmd(Chatd.Opcode.MSGUPD, chatid + Chatd.Const.UNDEFINED + msgid + this.chatd.pack32le(0) + this.chatd.pack32le(message.length) + message);
};

// message storage subsystem
Chatd.Messages = function(chatd, chatid) {
    // parent linkage
    this.chatd = chatd;
    this.chatid = chatid;

    // the message buffer can grow in two directions and is always contiguous, i.e. there are no "holes"
    // there is no guarantee as to ordering
    this.lownum = 2 << 28; // oldest message in buf
    this.highnum = 2 << 28; // newest message in buf

    this.sentid = false;
    this.receivedid = false;
    this.seenid = false;

    // message format: [msgid/transactionid, userid, timestamp, message]
    // messages in buf are indexed by a numeric id
    this.buf = {};

    // mapping of transactionids of messages being sent to the numeric index of this.buf
    this.sending = {};

    // msgnums of modified messages
    this.modified = {};
};

Chatd.Messages.prototype.submit = function(message) {
    // allocate a transactionid for the new message
    var msgxid = this.chatd.nexttransactionid();
    var timestamp = Math.floor(new Date().getTime()/1000);

    // write the new message to the message buffer and mark as in sending state
    // FIXME: there is a tiny chance of a namespace clash between msgid and msgxid, FIX
    this.buf[++this.highnum] = [msgxid, this.chatd.userid, timestamp, message];

    this.chatd.trigger('onMessageUpdated', {
        chatId: base64urlencode(this.chatid),
        id: this.highnum,
        state: 'PENDING',
        message: message
    });


    this.sending[msgxid] = this.highnum;

    // if we believe to be online, send immediately
    if (this.chatd.chatidshard[this.chatid].isOnline()) {
        this.chatd.chatidshard[this.chatid].msg(this.chatid, msgxid, timestamp, message);
    }
    return this.highnum;
};

Chatd.Messages.prototype.modify = function(msgnum, message) {
    var self = this;

    // TODO: LP: Mathias: this variable is not used, why ?
    var mintimestamp = Math.floor(new Date().getTime()/1000)-600;

    // modify pending message so that a potential resend includes the change
    if (this.sending[this.buf[msgnum][Chatd.MsgField.MSGID]]) {
        this.buf[msgnum][Chatd.MsgField.MESSAGE] = message;
    }
    else if (self.chatd.chatidshard[this.chatid].isOnline()) {
        self.chatd.chatidshard[this.chatid].msgupd(this.chatid, this.buf[msgnum][Chatd.MsgField.MSGID], message);
    }

    this.chatd.trigger('onMessageModify', {
        chatId: base64urlencode(this.chatid),
        id: msgnum,
        message: message
    });

    this.chatd.trigger('onMessageUpdated', {
        chatId: base64urlencode(this.chatid),
        id: msgnum,
        state: 'EDITING',
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
    for (var msgxid in this.sending) {
        self.chatd.chatidshard[this.chatid].msg(
            this.chatid,
            msgxid,
            this.buf[this.sending[msgxid]][Chatd.MsgField.TIMESTAMP],
            this.buf[this.sending[msgxid]][Chatd.MsgField.MESSAGE]
        );
    }

    // resend all pending modifications of completed messages
    for (var msgnum in this.modified) {
        if (!this.sending[this.buf[msgnum][Chatd.MsgField.MSGID]]) {
            self.chatd.msgupd(
                this.chatid,
                this.buf[msgnum][Chatd.MsgField.MSGID],
                this.buf[msgnum][Chatd.MsgField.MESSAGE]
            );
        }
    }
};

// after a reconnect, we tell the chatd the oldest and newest buffered message
Chatd.Messages.prototype.range = function(chatid) {
    var low, high;

    for (low = this.lownum; low <= this.highnum; low++) {
        if (this.buf[low] && !this.sending[this.buf[low][Chatd.MsgField.MSGID]]) {
            for (high = this.highnum; high > low; high--) {
                if (!this.sending[this.buf[high][Chatd.MsgField.MSGID]]) break;
            }
            this.chatd.cmd(Chatd.Opcode.RANGE, chatid, this.buf[low][Chatd.MsgField.MSGID] + this.buf[high][Chatd.MsgField.MSGID]);
            break;
        }
    }
};

Chatd.prototype.msgconfirm = function(msgxid, msgid) {
    // CHECK: is it more efficient to keep a separate mapping of msgxid to Chatd.Messages?
    for (var chatid in this.chatidmessages) {
        if (this.chatidmessages[chatid].sending[msgxid]) {
            if (this.chatidmessages[chatid]) {
                this.chatidmessages[chatid].confirm(chatid, msgxid, msgid);
            }
            break;
        }
    }
};

// msgid can be false in case of rejections
Chatd.Messages.prototype.confirm = function(chatid, msgxid, msgid) {
    var self = this;
    var num = this.sending[msgxid];

    delete this.sending[msgxid];

    this.buf[num][Chatd.MsgField.MSGID] = msgid;
    this.chatd.trigger('onMessageUpdated', {
        chatId: base64urlencode(chatid),
        id: num,
        state: "CONFIRMED",
        messageId: base64urlencode(msgid),
        message: this.buf[num][Chatd.MsgField.MESSAGE]
    });

    if (msgid === false) {
        this.chatd.trigger('onMessageReject', {
            chatId: base64urlencode(chatid),
            id: num,
            messageId: base64urlencode(msgid),
            message: this.buf[num][Chatd.MsgField.MESSAGE]
        });
    }
    else {
        this.chatd.trigger('onMessageConfirm', {
            chatId: base64urlencode(chatid),
            id: num,
            messageId: base64urlencode(msgid),
            message: this.buf[num][Chatd.MsgField.MESSAGE]
        });
    }

    // we now have a proper msgid, resend MSGUPD in case the edit crossed the execution of the command
    if (this.modified[num]) {
        self.chatd.msgupd(chatid, msgid, this.buf[num][Chatd.MsgField.MESSAGE]);
    }
};

Chatd.prototype.msgstore = function(newmsg, chatid, userid, msgid, timestamp, msg) {
    if (this.chatidmessages[chatid]) {
        this.chatidmessages[chatid].store(newmsg, userid, msgid, timestamp, msg);
    }
};

Chatd.Messages.prototype.store = function(newmsg, userid, msgid, timestamp, msg) {
    var id;

    if (newmsg) {
        id = ++this.highnum;
    }
    else {
        id = this.lownum--;
    }

    // store message
    this.buf[id] = [msgid, userid, timestamp, msg];

    this.chatd.trigger('onMessageStore', {
        chatId: base64urlencode(this.chatid),
        id: id,
        messageId: base64urlencode(msgid),
        userId: base64urlencode(userid),
        ts: timestamp,
        message: msg
    });
};

Chatd.prototype.msgmodify = function(chatid, msgid, msg) {
    //console.error("msgmodify", chatid, msgid, msg);

    // an existing message has been modified
    if (this.chatidmessages[chatid]) {
        this.chatidmessages[chatid].msgmodify(msgid, msg);
    }
};

Chatd.Messages.prototype.msgmodify = function(chatid, msgid, msg) {
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
                    this.chatd.chatidshard[chatid].msgupd(chatid, msgid, msg);
                }
            }
            else {
                this.buf[i][Chatd.MsgField.MESSAGE] = msg;
            }

            break;
        }
    }
};

Chatd.prototype.msgcheck = function(chatid, msgid) {
    if (this.chatidmessages[chatid]) {
        this.chatidmessages[chatid].check(chatid, msgid);
    }
};

Chatd.Messages.prototype.check = function(chatid, msgid) {
    this.chatd.trigger('onMessageCheck', {
        chatId: base64urlencode(chatid),
        messageId: base64urlencode(msgid)
    });

    if (this.buf[this.newmsg]) {
        // if the newest held message is not current, initiate a fetch of newer messages just in case
        if (this.buf[this.newmsg][Chatd.MsgField.MSGID] !== msgid) {
            this.chatd.cmd(Chatd.Opcode.HIST, chatid, this.chatd.pack32le(32));
        }
    }
};

// utility functions
Chatd.prototype.pack32le = function(x) {
    var r = '';

    for (var i = 4; i--; ) {
        r += String.fromCharCode(x & 255);
        x >>= 8;
    }

    return r;
};

Chatd.prototype.unpack32le = function(x) {
    var r = 0;

    for (var i = 4; i--; ) {
        r = (r << 8)+x.charCodeAt(i);
    }

    return r;
};

// imported functions from crypto.js
if(typeof('base64urldecode') === 'undefined') {
    function base64urldecode(data) {
        data += '=='.substr((2 - data.length * 3) & 3)

        if (typeof atob === 'function') {
            data = data.replace(/\-/g, '+').replace(/_/g, '/').replace(/,/g, '');

            try {
                return atob(data);
            } catch (e) {
                return '';
            }
        }
    }
}

if(typeof('base64urlencode') === 'undefined') {
    function base64urlencode(data) {
        if (typeof btoa === 'function') {
            return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        }
    }
}

// user-accessible demo code below
var userid = false; // set by login()
var chatid = false; // set by join()

function login(u) {
    if (userid === false) {
        u = base64urldecode(u);

        if (u.length == 8) {
            userid = u;
            console.log('Identity set to ' + base64urlencode(userid) + ', please join chat(s)');
        }
        else {
            console.log('Invalid user handle - please try again');
        }
    }
    else {
        console.log('Identity already set.');
    }
};

function join(c) {
    if (userid !== false) {
        c = base64urldecode(c);

        if (c.length == 8) {
            chatid = c;

            // instantiate Chat in case this is the first ever join
            if (chatd === false) {
                chatd = new Chatd(userid);
            }

            // the chatid, shard and the URL will be supplied by the API
            chatd.join(chatid, 0, 'ws://31.216.147.155/' + base64urlencode(userid));
        }
        else {
            console.log('Invalid chat handle - please try again');
        }
    }
    else {
        console.log('Please login() first.')
    }
};

function msg(message) {
    // allocate transactionid for the new message (it must be shown with status "delivering" in the UI;
    // edits and cancellations at that stage must be applied to the locally queued version that gets
    // resent until confirmation and then to the confirmed msgid)
    if (userid !== false) {
        if (chatid !== false) {
            return chatd.submit(chatid, message);
        }
        else {
            console.log('Please join() first.');
        }
    }
    else {
        console.log('Please login() and join() first.');
    }
};

function msgupd(num, newmessage) {
    // a msgupd is only possible up to ten minutes after the indicated (client-supplied) UTC timestamp.
    if (userid !== false)
    {
        if (chatid !== false)
        {
            chatd.modify(chatid, num, newmessage);
        }
        else {
            console.log('Please join() first.');
        }
    }
    else {
        console.log('Please login() and join() first.');
    }
};

function hist(n) {
    console.log("Fetching " + n + " messages of backlog");
    chatd.hist(chatid, n);
};

function seen(msgid) {
    chatd.cmd(Chatd.Opcode.SEEN, chatid, base64urldecode(msgid));
};

function received(msgid) {
    chatd.cmd(Chatd.Opcode.RECEIVED, chatid, base64urldecode(msgid));
};

function retention(time) {
    chatd.cmd(Chatd.Opcode.RETENTION, chatid, pack32le(time));
};

console.log("Active demo chathandles: 'j8_ix6_J4D4', 'W21oF18xQ5g'");
console.log("Active demo userhandles: 'u1Y-FYnYCx8', 'sUzKyanFyt0', '15enfxUCjbk', 'mldS8Edhdww', '9KEVTTjBwww'");
console.log("Available priv levels: 0 = RDONLY, 1 = RDWR, 2 = FULL, 3 = OPER");
console.log("- Set your identity: login('userhandle')");
console.log("- (Re)join a chat and set it as current chat: join('chathandle')");
console.log("- Send a message to the most recently joined chat: msg('message')");
console.log("- Edit or delete a recent message that you sent to the current chat: msgupd(num ,'newmessage')");
console.log("- Retrieve n older messages for the current chat: hist(n)");
console.log("- Confirm that you have seen all messages up to and including msghandle in the current chat: seen('msghandle')");
console.log("- Confirm that you have received all messages up to and including msghandle in the current chat: received('msghandle')");
console.log("- Set the retention policy for the current chat (requires OPER priv): retention(seconds)");
