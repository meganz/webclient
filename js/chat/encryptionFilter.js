/**
 * EncryptionFilterDemo
 *
 * Demo of how to use MegaChat and Karere's events to integrate the mpENC.
 *
 * Warning: Requires the full version of the sjcl, because of the encrypt/decrypt methods
 *
 * @param megaChat
 * @returns {EncryptionFilter}
 * @constructor
 */

//TODO: Fix me.
var TBD = {};
TBD.RSA_PRIV_KEY = [[75021949, 120245708, 82706226, 16596609, 37674797,
    261009791, 126581637, 200709099, 258471049, 113825880,
    88027939, 220319392, 131853044, 135390860, 267228055,
    237315027, 211313164, 54839697, 207660246, 201155346,
    227695973, 146596047, 142916215, 98103316, 179900092,
    249054037, 220438057, 256596528, 241826839, 63322446,
    251511068, 58364369, 170132212, 133096195, 124672185,
    8312302, 35400], // p
    [128226797, 41208503, 207045529, 258570880, 23478973,
        77404621, 158690389, 238844389, 145903872, 246313677,
        253728308, 119494952, 195555019, 267612530, 78611566,
        243360854, 132826684, 262537884, 119597852, 182907181,
        30678391, 79728624, 137983547, 32175673, 139438215,
        13886352, 203417847, 31483577, 219866889, 247380166,
        68669996, 160814481, 39019433, 201943306, 81626508,
        139781605, 47731], // q
    [4785377, 8492163, 46352361, 214103223, 128434713,
        33319427, 227333660, 55393381, 166852858, 190311278,
        266421688, 178197776, 225843133, 62575637, 239940639,
        156855074, 46489535, 230003976, 165629060, 232780285,
        27515958, 240399426, 29901886, 3564677, 236070629,
        3087466, 157736667, 117145646, 146679490, 131447613,
        67842827, 140689194, 34183581, 109932386, 16816523,
        52507178, 201828114, 221386889, 93069099, 159021540,
        167588690, 136091483, 163072457, 205020932, 49104348,
        262271640, 121715911, 214191306, 218845664, 212719951,
        35202357, 132089769, 260900202, 14401018, 60968598,
        132321672, 121097206, 89837308, 236860238, 65524891,
        197578617, 28474670, 158355089, 180828899, 133890556,
        114831284, 151264265, 46682207, 133668594, 136278850,
        182380943, 147467667, 29746422, 1], // d
    [75355783, 190006521, 55791789, 26515137, 173264457,
        47953225, 101795657, 248544110, 210747547, 144990768,
        238334760, 1290057, 33076917, 143776635, 180658031,
        5206380, 79345545, 256436153, 106840740, 206602733,
        246803249, 78668765, 129583422, 246220806, 123434098,
        186736925, 150630366, 220873360, 145726505, 256243347,
        11221355, 188285031, 37371460, 220704442, 39001519,
        9996194, 23543] // u = (1/q) mod p (required for CRT supported computation)
];

TBD.RSA_PUB_KEY = [[230365881, 209576468, 15544222, 146241808, 252079570,
    169310559, 52361850, 127099922, 7697172, 6914372,
    240866415, 186381438, 265008541, 131249274, 5412023,
    116822512, 70709639, 10120711, 102602468, 92538077,
    145862676, 246410806, 2951361, 150478827, 225416106,
    12000579, 243955194, 57120583, 219135684, 250266055,
    78274356, 121632765, 44944666, 242161807, 33156870,
    87720642, 248990925, 1826913, 79999139, 185294179,
    144362878, 144835676, 208249376, 88043460, 9822520,
    144028681, 242331074, 229487397, 166383609, 221149721,
    20523056, 32680809, 225735686, 260562744, 256010236,
    123473411, 149346591, 61685654, 30737, 192350750,
    135348825, 161356467, 2560651, 40433759, 132363757,
    203318185, 51857802, 175054024, 131105969, 235375907,
    138707159, 209300719, 79084575, 6], // n = p * q
    [17], // e
    2047]; // size


TBD.STATIC_PUB_KEY_DIR = {
    'get': function(key) { return TBD.RSA_PUB_KEY; }
};


/**
 * Encryption filter that connects MegaChat + Karere and mpENC
 *
 * @param megaChat
 * @returns {EncryptionFilter}
 * @constructor
 */
var EncryptionFilter = function(megaChat) {
    var self = this;

    self.megaChat = megaChat;
    self.karere = megaChat.karere;

    /**
     * Initialize the mpenc.handler.ProtocolHandler and OpQueue when a room is created
     */
    megaChat.bind("onRoomCreated", function(e, megaRoom) {
        megaRoom.encryptionHandler = new mpenc.handler.ProtocolHandler(
            megaRoom.megaChat.karere.getJid(),
            TBD.RSA_PRIV_KEY,
            TBD.RSA_PUB_KEY,
            TBD.STATIC_PUB_KEY_DIR,
            function(handler) {
                self.flushQueue(megaRoom, handler);
            },
            function(handler) {
                if(localStorage.d) { console.error("Got state change: ", handler.state); }

                if(handler.state === mpenc.handler.STATE.INITIALISED && megaRoom.state === MegaChatRoom.STATE.PLUGINS_WAIT) {
                    megaRoom.setState(
                        MegaChatRoom.STATE.PLUGINS_READY
                    )
                } else if(handler.state !== mpenc.handler.STATE.INITIALISED && megaRoom.state === MegaChatRoom.STATE.READY) {
                    megaRoom.setState(
                        MegaChatRoom.STATE.PLUGINS_PAUSED
                    )
                } else if(handler.state === mpenc.handler.STATE.INITIALISED && megaRoom.state === MegaChatRoom.STATE.PLUGINS_PAUSED) {
                    megaRoom.setState(
                        MegaChatRoom.STATE.READY
                    )
                }
                if(handler.state === mpenc.handler.STATE.INITIALISED) {
                    megaRoom.encryptionOpQueue.pop();
                }
            }
        );
        megaRoom.encryptionIsInitialized = false;

        megaRoom.encryptionOpQueue = new OpQueue(
            megaRoom.encryptionHandler,
            function(opQueue, nextOp) {
                if(nextOp[0] == "quit" && opQueue.ctx.state !== mpenc.handler.STATE.INITIALISED) {
                    return false;
                } else if(nextOp[0] == "recover") {
                    return true;
                } else if(nextOp[0] == "start" && opQueue.ctx.state == mpenc.handler.STATE.NULL) {
                    return true;
                }/* if(nextOp[0] == "processMessage") {  // greet/init enc messages
                    return true;
                } */else {
                    return opQueue.ctx.state == mpenc.handler.STATE.INITIALISED || opQueue.ctx.state == mpenc.handler.STATE.NULL;
                }
            },
            function(opQueue) {
                self.syncRoomUsersWithEncMembers(megaRoom, true);
            }
        );


        logAllCallsOnObject(megaRoom.encryptionHandler, console.error, true, "mpenc");
        logAllCallsOnObject(megaRoom.encryptionOpQueue, console.error, true, "mpOpQueue");
    });

    /**
     * Cleanup after room destroy
     */
    megaChat.bind("onRoomDestroy", function(e, megaRoom) {
        megaRoom.encryptionOpQueue.queue('quit');
        delete megaRoom.encryptionHandler;
        delete megaRoom.encryptionOpQueue;
    });


    /**
     * Pause MegaChat's state machine if needed (so that the mpenc can set up the encryption)
     */
    megaChat.bind("onPluginsWait", function(e, megaRoom) {
        /**
         * This event is triggered when i'd joined a new room (joined may also mean created and joined)
         * Also, this is the place where any initial key exchanges/crypto setup should be done.
         *
         * By default, if this event's propagation is not stopped, the MegaChat's flow will continue next to asking
         * for messages history and then to mark the room as 'ready'.
         * If you need to delay the messages sync & room ready state, then you can stop the event prop by calling:
         * e.stopPropagation();
         * and after you are done with setting up the crypto stuff, then manually call:
         * room.setState(MegaChatRoom.STATE.PLUGINS_READY);
         *
         * Note: ANY plugin should be done in 10secs (see Karere's options for extending the syncDelay)
         */

        if(megaRoom.getOrderedUsers().length > 1) { // only if i'm not the only user in the room
            e.stopPropagation();
        }

    });




    /**
     * Sync members list and encryption after i'd joined
     *
     * @param e {jQuery.Event}
     * @param eventObject {KarereEventObjects.UsersUpdated}
     */
    megaChat.karere.bind("onUsersUpdatedDone", function(e, eventObject) {
        var megaRoom = megaChat.chats[eventObject.getRoomJid()];

        megaRoom.iHadJoined = true;

        assert(megaRoom, 'room not found');

        var users = megaRoom.getOrderedUsers();

//        console.error("I'd Joined: ", users, megaRoom.megaChat.karere.getJid(), megaRoom, eventObject);

        if(users[0] == megaChat.karere.getJid()) {
            // i'm the new "owner"

            // sync users list w/ encryption (join/exclude);
            self.syncRoomUsersWithEncMembers(megaRoom);
        }

        // i'm the only user in the room, set state to ready.
        if(megaRoom.state === MegaChatRoom.STATE.PLUGINS_WAIT && users.length == 1) {
            megaRoom.setState(
                MegaChatRoom.STATE.PLUGINS_READY
            );
        }
    });

    /**
     * When someone joins a room, if i'm the owner, i should add him to the encryption member list
     *
     * @param e {jQuery.Event}
     * @param eventObject {KarereEventObjects.UsersJoined}
     */
    megaChat.karere.bind("onUsersJoined", function(e, eventObject) {
        var megaRoom = megaChat.chats[eventObject.getRoomJid()];

        assert(megaRoom, 'room not found');

        // still joining...don't do anything
        if(!megaRoom.iHadJoined) {
            return;
        }

        var users = megaRoom.getOrderedUsers();

//        console.error("Joined: ", users, megaRoom.megaChat.karere.getJid(), megaRoom, eventObject);


//        console.error("got state change1?: ", users[0], megaRoom.megaChat.karere.getJid());
        if(users[0] == megaChat.karere.getJid()) {
            // i'm the "owner"

            // sync users list w/ encryption (join/exclude);
            self.syncRoomUsersWithEncMembers(megaRoom);
        }
    });

    /**
     * When someone leaves a room, if i'm the room owner, i should remove him from the enc members list
     *
     * @param e {jQuery.Event}
     * @param eventObject {KarereEventObjects.UsersJoined}
     */
    megaChat.karere.bind("onUsersLeft", function(e, eventObject) {
        var megaRoom = megaChat.chats[eventObject.getRoomJid()];

        assert(megaRoom, 'room not found');

        var users = megaRoom.getOrderedUsers();
        var leftUsers = Object.keys(eventObject.getLeftUsers());

        // owner had left and i'm the new owner
//        console.error("Left: ", users, leftUsers, megaRoom.megaChat.karere.getJid(), megaRoom, eventObject);
        if($.inArray(users[0], leftUsers) !== -1 && users[1] == megaRoom.megaChat.karere.getJid()) {
//            console.error("I'm the new owner of the room!")

            // sync users list w/ encryption (join/exclude);
            self.syncRoomUsersWithEncMembers(megaRoom);

        } else if(users[0] == megaRoom.megaChat.karere.getJid()) {
            // i'm the owner

            // sync users list w/ encryption (join/exclude);
            self.syncRoomUsersWithEncMembers(megaRoom);
        }
//        console.error("got state change2?: ", users[0], megaRoom.megaChat.karere.getJid());
    });


    /**
     * Process any incoming message which is encrypted (or should have been encrypted)
     *
     * @param e
     * @param eventObject
     * @param karere
     */
    var processIncoming = function(e, eventObject, karere) {
        // ignore filtering any messages without text or meta... this is the case with "is typing" indicators
        if(self.messageShouldNotBeEncrypted(eventObject) === true) {
            return;
        }

        self.processIncomingMessage(e, eventObject, karere);
    };

    /**
     * Process any outgoing messages (e.g. plain text messages) that needs to be encrypted
     *
     * @param e
     * @param eventObject
     * @param karere
     */
    var processOutgoing = function(e, eventObject, karere) {
        // ignore filtering any messages without text, meta or which are already encrypted
        // (empty msg/meta = this is the case with "is typing" indicators)
        if(self.messageShouldNotBeEncrypted(eventObject) === true || eventObject.getContents().indexOf(EncryptionFilter.MPENC_MSG_TAG) === 0) {
            return;
        }

        self.processOutgoingMessage(e, eventObject, karere);
    };




    // incoming
    megaChat.karere.bind("onChatMessage", processIncoming);
    megaChat.karere.bind("onPrivateMessage", processIncoming);
    megaChat.karere.bind("onActionMessage", processIncoming);

    // outgoing
    megaChat.karere.bind("onOutgoingMessage", processOutgoing);



    logAllCallsOnObject(this, console.error, true, "encFilter");

    return this;
};

/**
 * The tag used in mpENC messages
 *
 * @type {string}
 */
EncryptionFilter.MPENC_MSG_TAG = "?mpENC:";


/**
 * Flush all queues in mpENC
 *
 * @param megaRoom {MegaChatRoom}
 * @param handler {mpenc.ProtocolHandler}
 */
EncryptionFilter.prototype.flushQueue = function(megaRoom, handler) {
    var self = this;

    if(localStorage.d) { console.error("Flushing: ", megaRoom, handler); }

    while(handler.protocolOutQueue.length) {
        var msg = handler.protocolOutQueue.shift();
        if(msg.to) {
            megaRoom.megaChat.karere.sendRawMessage(
                msg.to,
                (!msg.to || msg.to.indexOf("conference.") !== -1) ? "groupchat" : "chat",
                msg.message,
                (msg.metadata && msg.metadata.roomJid) ? {'roomJid': msg.metadata.roomJid} : undefined, /* sendTo roomJid */
                msg.metadata ? msg.metadata.messageId : undefined,
                msg.metadata ? msg.metadata.delay : undefined
            );
        } else {
            megaRoom.megaChat.karere.sendRawMessage(
                megaRoom.roomJid,
                "groupchat",
                msg.message,
                (msg.metadata && msg.metadata.roomJid) ? {'roomJid': msg.metadata.roomJid} : undefined, /* sendTo roomJid */
                msg.metadata ? msg.metadata.messageId : undefined,
                msg.metadata ? msg.metadata.delay : undefined
            );
        }

        if(localStorage.d) { console.error("protocolOut: ", msg); }
    }
    while(handler.messageOutQueue.length) {
        var msg = handler.messageOutQueue.shift();

        var toJid = msg.to ? msg.to : megaRoom.roomJid;

        megaRoom.megaChat.karere.sendRawMessage(
            toJid,
            (!toJid || toJid.indexOf("conference.") !== -1) ? "groupchat" : "chat",
            msg.message,
            (msg.metadata && msg.metadata.roomJid) ? {'roomJid': msg.metadata.roomJid} : undefined, /* sendTo roomJid */
            msg.metadata ? msg.metadata.messageId : undefined,
            msg.metadata ? msg.metadata.delay : undefined
        );

        if(localStorage.d) { console.error("messageOut: ", msg); }
    }

    while(handler.uiQueue.length) {
        var wireMessage = handler.uiQueue.shift();
        if(wireMessage.type == "message") {
            var msgPayload = JSON.parse(wireMessage.message);

            if(msgPayload[1].action) {
                var eventObject = new KarereEventObjects.ActionMessage(
                    /* toJid */ wireMessage.toJid,
                    /* fromJid */ Karere.getNormalizedFullJid(wireMessage.fromJid),
                    /* messageId */ wireMessage.messageId,
                    /* action */ msgPayload[1].action,
                    /* meta */ msgPayload[1],
                    /* delay */ wireMessage.delay
                );
                self.megaChat.karere.trigger("onActionMessage", [eventObject]);
            } else {
                var eventObject = new KarereEventObjects.IncomingMessage(
                    /* toJid */ wireMessage.toJid,
                    /* fromJid */ wireMessage.fromJid,
                    /* type */ "Message",
                    /* rawType */ wireMessage.rawType,
                    /* messageId */ wireMessage.messageId,
                    /* rawMessage */ undefined,
                    /* roomJid */ wireMessage.roomJid,
                    /* meta */ msgPayload[1],
                    /* contents */ msgPayload[0],
                    /* elements */ undefined,
                    /* delay */ wireMessage.delay
                );
                self.megaChat.karere.trigger("onChatMessage", [eventObject]);
            }
        } else {
            var $dialog = megaRoom.generateInlineDialog(
                "mpEnc-ui-" + wireMessage.type,
                wireMessage.message,
                undefined,
                ['mpEnc-message', 'mpEnc-message-type-' + wireMessage.type], {
                    'reject': {
                        'type': 'secondary',
                        'text': "Hide",
                        'callback': function() {
                            $dialog.remove();
                        }
                    }
                }
            );

            megaRoom.appendDomMessage(
                $dialog
            );
        }

        if(localStorage.d) { console.error("uiQueue: ", wireMessage); }
    }
};


/**
 * Goes thru the list of users in the specific `megaRoom` and tries to sync that with the `mpenc.ProtocolHandler`
 *
 * @param megaRoom {MegaChatRoom}
 * @param forceRecover {boolean}
 */
EncryptionFilter.prototype.syncRoomUsersWithEncMembers = function(megaRoom, forceRecover) {
    var xmppUsers = megaRoom.getOrderedUsers();
    var encUsers = megaRoom.encryptionHandler.askeMember.members;

    var excludeUsers = [];
    var joinUsers = [];

    $.each(encUsers, function(k, v) {
        if(xmppUsers.indexOf(v) == -1) {
            excludeUsers.push(v);
        }
    });

    $.each(xmppUsers, function(k, v) {
        if(encUsers.indexOf(v) == -1 && v != megaRoom.megaChat.karere.getJid()) {
            joinUsers.push(v);
        }
    });

    // now ping ALL of the users so that we are 100% sure that they ARE active (else, the mpENC algo will block)
    // this will not solve all possible encryption-flow crashes, but may save some! because someone can quit
    // (without notifying the owner, because of conn. error) at the next moment after the PingResponse...there is
    // NO way to guarantee 100% that all of the joinUsers will be available and will notify when leaving (conn. errors)
    // we should find a way to fix that in the crypto's flow, or introduce .restart() method that will be triggered
    // if multiple messages were not SENT in a timely manner (and they will get retried)
    var promises = [];
    var allUsers = array_unique(xmppUsers.concat(encUsers));
    $.each(allUsers, function(k, v) {
        if(v == megaRoom.megaChat.karere.getJid()) {
            return; // its me! no need for self-pinging :)
        }
        if(excludeUsers.indexOf(v) !== -1) {
            return; // no need to ping users who are going to be excluded
        }

        if(localStorage.d) { console.error("#PING pinging: ", v); }

        promises.push(
            megaRoom.megaChat.karere.sendPing(v)
                .fail(function() {
                    if(localStorage.d) { console.error("#PING ping failed for: ", v); }

                    if(excludeUsers.indexOf(v) == -1) { // not excluded
                        if(localStorage.d) { console.error("#PING ping failed caused exclude for: ", v); }

                        if(encUsers.indexOf(v) != -1) {
                            excludeUsers.push(
                                v
                            );
                        } else if(joinUsers.indexOf(v) != -1) {
                            if(localStorage.d) { console.error("#PING ping failed caused removal from JOIN users for: ", v); }

                            joinUsers.splice(joinUsers.indexOf(v), 1);
                        }
                    }
                })
                .done(function() {
                    if(localStorage.d) { console.error("#PING ping success for: ", v); }
                })
        );
    });

    $.when.apply($.when, promises)
        .always(function() {
//                console.error("#PING got state // users to join:", joinUsers);
//                console.error("#PING got state // users to exclude:", excludeUsers);

            // filter .joinUsers who are NOT participants
            var participants = megaRoom.getParticipants();

            $.each(joinUsers, function(k, v) {
                if(participants.indexOf(Karere.getNormalizedBareJid(v)) === -1) {
                    joinUsers.splice(k, 1);
                }
            });

            if(forceRecover) {
                megaRoom.encryptionOpQueue._queue = [];

                var currentUsers = [];
                var newlyJoinedUsers = [];

                joinUsers = joinUsers.concat(
                    megaRoom.megaChat.karere.getJid()
                );

                // iterate on all newly joined users + current askeMembers and prepare a list of CURRENT users
                $.each(megaRoom.encryptionHandler.askeMember.members.concat(joinUsers), function(k, v) {
                    if(excludeUsers.indexOf(v) !== -1) {
                        return; // continue, this is a user who had timed out while waiting for a ping response
                    } else if(megaRoom.encryptionHandler.askeMember.members.indexOf(v) !== -1) {
                        currentUsers.push(v);
                    } else if(excludeUsers.indexOf(v) === -1) {
                        newlyJoinedUsers.push(v);
                    } else {
                        if(localStorage.d) {
                            console.error("forceRecover: ignoring user: ", v);
                        }
                    }
                });

                megaRoom.encryptionOpQueue.queue(
                    'recover',
                    array_unique(currentUsers)
                );
                if(newlyJoinedUsers.length > 0) {
                    megaRoom.encryptionOpQueue.queue(
                        'join',
                        array_unique(newlyJoinedUsers)
                    );
                }
            } else  if(megaRoom.encryptionHandler.state === mpenc.handler.STATE.NULL) {
                // first start, then exclude
                if(joinUsers.length > 0) {
                    megaRoom.encryptionOpQueue.queue(megaRoom.encryptionHandler.state == mpenc.handler.STATE.NULL ? 'start' : 'join', joinUsers);
                }
                if(excludeUsers.length > 0) {
                    megaRoom.encryptionOpQueue.queue('exclude', excludeUsers);
                }

            } else {
                // first exclude, then start
                if(excludeUsers.length > 0) {
                    megaRoom.encryptionOpQueue.queue('exclude', excludeUsers);
                }
                if(joinUsers.length > 0) {
                    megaRoom.encryptionOpQueue.queue(megaRoom.encryptionHandler.state == mpenc.handler.STATE.NULL ? 'start' : 'join', joinUsers);
                }
            }
        })
};

/**
 * This method will process any outgoing group chat and direct chat (for now, the only support is for "action") messages
 *
 * @param e
 * @param eventObject {KarereEventObjects.OutgoingMessage}
 * @param karere {Karere}
 */
EncryptionFilter.prototype.processOutgoingMessage = function(e, eventObject, karere) {
    var self = this;

    console.debug("Processing outgoing message: ", e, eventObject, eventObject.isEmptyMessage())

    if(eventObject.getType() == "groupchat" && eventObject.getContents().indexOf(EncryptionFilter.MPENC_MSG_TAG) !== 0) {

        // get room jid
        var roomJid = eventObject.getToJid().split("/")[0];
        var megaRoom = self.megaChat.chats[roomJid];
        if(megaRoom) {
            // stop the actual sending of the message, in case you want to queue it and resend it later

            megaRoom.encryptionOpQueue.queue(
                'send',
                JSON.stringify([
                    eventObject.getContents(),
                    eventObject.getMeta()
                ]),
                {
                    'messageId': eventObject.getMessageId(),
                    'delay': eventObject.getDelay()
                }
            );

            e.stopPropagation();
        } else {
            console.error("Room not found: ", roomJid, eventObject);
        }
    } else if(eventObject.getType() == "action" && eventObject.getMeta().roomJid) {
        // get room jid
        var roomJid = eventObject.getMeta().roomJid.split("/")[0];
        var megaRoom = self.megaChat.chats[roomJid];
        if(megaRoom) {
            // stop the actual sending of the message, in case you want to queue it and resend it later

            // SEND only to a specific user... .send() ignores the .to property
            megaRoom.encryptionOpQueue.queue(
                'sendTo',
                JSON.stringify([
                    eventObject.getContents(),
                    eventObject.getMeta()
                ]),
                eventObject.getToJid(),
                {
                    'messageId': eventObject.getMessageId(),
                    'roomJid': eventObject.getMeta().roomJid,
                    'delay': eventObject.getDelay()
                }
            );

            e.stopPropagation();
        } else {
            console.error("Room not found: ", roomJid, eventObject);
        }
    } else {
        // already encrypted OR a direct message, should not do anything.

        return;
    }

};

/**
 * This method will process any incoming message and try to decrypt it, but sending it to the mpenc.handler.ProtocolHandler
 * Also, if the message is a direct message (type="chat", e.g. action message) it will go thru all currently opened rooms
 * in which I (`self.karere.getJid()`) is currently having a chat with the user who had sent the message
 * (`eventObject.getFromJid()`).
 *
 * Note: This is only going to work for 1on1 chats.. in the future we need to refactor this for group chats.
 *
 * @param e
 * @param eventObject {(KarereEventObjects.IncomingMessage|KarereEventObjects.IncomingPrivateMessage)}
 * @param karere {Karere}
 */
EncryptionFilter.prototype.processIncomingMessage = function(e, eventObject, karere) {
    var self = this;

    var msg = eventObject.getContents ? eventObject.getContents() : (eventObject.getMessage ? eventObject.getMessage() : null);
    //XX: normalize the eventobject of type IncomingPrivateMessage to use getContents, instead of getMessage();

    if(localStorage.d) { console.error("Processing incoming message: ", msg, e, eventObject, eventObject.isEmptyMessage()); }


    if(msg && msg.indexOf(EncryptionFilter.MPENC_MSG_TAG) === 0) {
        var wireMessage = $.extend({}, eventObject, {
            message: msg,
            from: Karere.getNormalizedFullJid(eventObject.getFromJid())
        });
        if(localStorage.d) { console.error("Found enc in message: ", wireMessage); }


        if(eventObject.getRawType() == "groupchat") {
            var roomJid = eventObject.getRoomJid();
            var megaRoom = self.megaChat.chats[roomJid];
            if(megaRoom) {
                var resp = megaRoom.encryptionHandler.processMessage(wireMessage);

                e.stopPropagation();
            } else {
                console.error("Room not found:" , eventObject);
            }
        } else if(eventObject.getRawType() == "chat") {
            // send to all chat rooms in which i'm currently having a chat w/ this user
            if(eventObject.getMeta().roomJid) {
                self.megaChat.chats[eventObject.getMeta().roomJid].encryptionHandler.processMessage(wireMessage);
                if(!e.isPropagationStopped()) {
                    e.stopPropagation();
                }
            } else {
                var fromJid = Karere.getNormalizedFullJid(eventObject.getFromJid());
                $.each(self.megaChat.chats, function(k, v) {
                    if(v.getUsers()[fromJid]) {
                        if(localStorage.d) { console.error("Found matching room for priv msg: ", v.roomJid, v, wireMessage); }

                        var resp = v.encryptionHandler.processMessage(wireMessage);

                        if(!e.isPropagationStopped()) {
                            e.stopPropagation();
                        }
                    }
                });
            }

        } else {
            console.error("No idea how to handle enc message: ", wireMessage);
        }
    } else {
        // should not do anything...or call e.stopPropagation() to disable ANY plain text messages.
        if(localStorage.d) { console.debug("Got plaintext message: ", eventObject); }
    }
};

/**
 * Simple method that decides which messages should be encrypted and which should be left in plain text.
 * In the future this message should check for system messages (e.g. group key agreement request/responses, etc) and
 * decide if this message SHOULD be encrypted or should be processed right away.
 *
 * @param eventObject {(KarereEventObjects.IncomingMessage|KarereEventObjects.OutgoingMessage)}
 * @returns {boolean}
 */
EncryptionFilter.prototype.messageShouldNotBeEncrypted = function(eventObject) {
    if(eventObject.getMeta().action) {
        return false;
    } else if(eventObject.isEmptyMessage() && !eventObject.getMeta().attachments) {
        return true;
    } else {
        return false;
    }
};

