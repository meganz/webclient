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
        console.error("ROOM created.");

        megaRoom.encryptionHandler = new mpenc.handler.ProtocolHandler(
            megaRoom.megaChat.karere.getJid(),
            u_privEd25519,
            u_pubEd25519,
            {
                'get': function(jid) {
                    var contact = megaRoom.megaChat.getContactFromJid(Karere.getNormalizedBareJid(jid));
                    assert(!!contact, 'contact not found: ' + jid);

                    var h = contact.u;
                    assert(!!pubEd25519[h], 'pubEd25519 key not found for user: ' + h);

                    return pubEd25519[h];
                }
            },
            function(handler) {
                self.flushQueue(megaRoom, handler);
            },
            function(handler) {
                if(localStorage.d) { console.error("Got state change: ", handler.state, MegaChatRoom.prototype.getStateAsText.apply(megaRoom)); }

                if(handler.state === mpenc.handler.STATE.INITIALISED && (megaRoom.state === MegaChatRoom.STATE.PLUGINS_WAIT || megaRoom.state === MegaChatRoom.STATE.PLUGINS_PAUSED)) {
                    megaRoom.setState(
                        MegaChatRoom.STATE.PLUGINS_READY
                    )
                } else if(handler.state !== mpenc.handler.STATE.INITIALISED && megaRoom.state === MegaChatRoom.STATE.READY) {
                    megaRoom.setState(
                        MegaChatRoom.STATE.PLUGINS_PAUSED
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
                } else if(nextOp[0] == "join" && opQueue.ctx.state == mpenc.handler.STATE.INITIALISED) {
                    return true;
                }/* if(nextOp[0] == "processMessage") {  // greet/init enc messages
                    return true;
                } */else {
                    return opQueue.ctx.state == mpenc.handler.STATE.INITIALISED || opQueue.ctx.state == mpenc.handler.STATE.NULL;
                }
            },
            function(opQueue) {
                if(megaRoom._leaving) {
                    return;
                }

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
        if(Object.keys(megaRoom.getUsers()).length > 1 && megaRoom.encryptionHandler && megaRoom.encryptionHandler.state == mpenc.handler.STATE.INITIALISED) {
            megaRoom.encryptionOpQueue.queue('quit');
        }
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

        // stop and wait for the crypto to be ready
        if(megaRoom.encryptionHandler.state !== mpenc.handler.STATE.INITIALISED) {
            e.stopPropagation();
            megaRoom.setState(MegaChatRoom.STATE.PLUGINS_PAUSED);
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

        if(!megaRoom) {
            return;
        }

        megaRoom.iHadJoined = true;

        var users = megaRoom.getOrderedUsers();

//        console.error("I'd Joined: ", users, megaRoom.megaChat.karere.getJid(), megaRoom, eventObject);

        if(megaRoom.iAmRoomOwner()) {
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

        if(megaRoom.iAmRoomOwner()) {
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

        if(!megaRoom) {
            return;
        }

        var users = megaRoom.getOrderedUsers();
        var leftUsers = Object.keys(eventObject.getLeftUsers());

        // owner had left and i'm the new owner
//        console.error("Left: ", users, leftUsers, megaRoom.megaChat.karere.getJid(), megaRoom, eventObject);
        if($.inArray(users[0], leftUsers) !== -1 && users[1] == megaRoom.megaChat.karere.getJid()) {
//            console.error("I'm the new owner of the room!")

            // sync users list w/ encryption (join/exclude);
            self.syncRoomUsersWithEncMembers(megaRoom);

        } else if(megaRoom.iAmRoomOwner()) {
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
EncryptionFilter.MPENC_MSG_TAG = "?mpENC";


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

        console.error("sending out message to: ", toJid)

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
            var message = wireMessage.message;

            var removeThisTypeOfDialogs = function() {
                $('.fm-chat-inline-dialog-' + 'mpEnc-ui-' + wireMessage.type).remove();
                megaRoom.refreshScrollUI();
            };

            if(wireMessage.type === "error" && wireMessage.message.indexOf("req-recover") !== -1) {
                if(megaRoom.iAmRoomOwner()) {
                    self.syncRoomUsersWithEncMembers(megaRoom, true);
                }

                message = "Something went wrong. mpENC received recover request, will start the process now.";
            }

            var $dialog = megaRoom.generateInlineDialog(
                "mpEnc-ui-" + wireMessage.type,
                false,
                "mpenc-error",
                message,
                ['mpEnc-message', 'mpEnc-message-type-' + wireMessage.type, 'mpEnc-message-' + wireMessage.messageId], {
                    'reject': {
                        'type': 'secondary',
                        'text': "Hide",
                        'callback': function() {
                            removeThisTypeOfDialogs();
                        }
                    }
                }
            );

            megaRoom.appendDomMessage(
                $dialog
            );

            createTimeoutPromise(function() {
                return megaRoom.encryptionHandler.state === mpenc.handler.STATE.INITIALISED
            }, 500, 10000)
                .done(function() {
                    removeThisTypeOfDialogs();
                })
                .fail(function() {
                    removeThisTypeOfDialogs();

                    var $dialog2 = megaRoom.generateInlineDialog(
                        "mpEnc-ui-" + wireMessage.type,
                        false,
                        "mpenc-error",
                        "Could not recover mpENC from the problem. Do you want to retry manually?",
                        ['mpEnc-message', 'mpEnc-message-type-' + wireMessage.type, 'mpEnc-message-' + wireMessage.messageId], {
                            'retry': {
                                'type': 'primary',
                                'text': "Retry Manually",
                                'callback': function() {
                                    removeThisTypeOfDialogs();

                                    megaRoom.encryptionHandler.sendError("req-recover");
                                }
                            },
                            'reject': {
                                'type': 'secondary',
                                'text': "Hide",
                                'callback': function() {
                                    removeThisTypeOfDialogs();
                                }
                            }
                        }
                    );

                    megaRoom.appendDomMessage(
                        $dialog2
                    );
                });
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
    if(megaRoom._leaving) {
        return;
    }

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
                    megaRoom.encryptionOpQueue.queue('start', joinUsers);
                }
                if(excludeUsers.length > 0) {
                    megaRoom.encryptionOpQueue.queue('exclude', excludeUsers);
                }

            } else {
                // first exclude, then join
                if(excludeUsers.length > 0) {
                    megaRoom.encryptionOpQueue.queue('exclude', excludeUsers);
                }
                if(joinUsers.length > 0) {
                    megaRoom.encryptionOpQueue.queue('join', joinUsers);
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

    if(eventObject.getMeta().action && eventObject.getMeta().roomJid) {
        // get room jid
        var roomJid = eventObject.getMeta().roomJid.split("/")[0];
        var megaRoom = self.megaChat.chats[roomJid];
        if(megaRoom) {
            if(eventObject.getMeta().action && eventObject.getMeta().action.indexOf("conv-") !== -1) {
                return; // send plain text
            }
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
    } else if(eventObject.getType() == "groupchat" && eventObject.getContents().indexOf(EncryptionFilter.MPENC_MSG_TAG) !== 0) {

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
                var resp = self.processMessage(e, megaRoom, wireMessage);

                e.stopPropagation();
            } else {
                console.error("Room not found:" , eventObject);
            }
        } else if(eventObject.getRawType() == "chat") {
            // send to all chat rooms in which i'm currently having a chat w/ this user
            if(eventObject.getMeta().roomJid) {
                self.processMessage(e, self.megaChat.chats[eventObject.getMeta().roomJid], wireMessage);
                if(!e.isPropagationStopped()) {
                    e.stopPropagation();
                }
            } else {
                var fromJid = Karere.getNormalizedFullJid(eventObject.getFromJid());
                $.each(self.megaChat.chats, function(k, v) {
                    if(v.getUsers()[fromJid]) {
                        if(localStorage.d) { console.error("Found matching room for priv msg: ", v.roomJid, v, wireMessage); }

                        var resp = self.processMessage(e, v, wireMessage);

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
 * Recursive function that will retry to get the user's ed25519 key and call .processMessage within a try/catch
 * up to 3 times and then will send a .recover request to the room owner
 *
 * @private
 */
EncryptionFilter.prototype._processMessageRecursive = function(e, megaRoom, wireMessage, contact, retriesCount) {

    var self = this;
    retriesCount = retriesCount || 0;


    if(retriesCount >= 3 && (megaRoom._processMessageFails === undefined || megaRoom._processMessageFails < 3)) {
        if(megaRoom._processMessageFails === undefined) {
            megaRoom._processMessageFails = 0;
        } else {
            megaRoom._processMessageFails++;
        }

        if(megaRoom.iAmRoomOwner()) {
            if(localStorage.d) { console.error("could not process message, will try to .recover, since I'm the room owner."); }

            self.syncRoomUsersWithEncMembers(megaRoom, true);
        } else {
            if(localStorage.d) { console.error("could not process message, will try to request .recover from the room owner."); }
            megaRoom.encryptionHandler.sendError("req-recover");
        }

        return;
    } else {
        retriesCount++;
    }
    if(megaRoom._processMessageFails >= 3) {
        var $dialog = megaRoom.generateInlineDialog(
            "mpEnc-ui-error",
            false,
            "mpenc-error",
            "Something went wrong with mpENC. Could not initialise encryption, chat is now in stale state.",
            ['mpEnc-message', 'mpEnc-message-type-error'], {
                'reject': {
                    'type': 'secondary',
                    'text': "Hide",
                    'callback': function() {
                        $('.fm-chat-inline-dialog-' + 'mpEnc-ui-error').remove();
                        megaRoom.refreshScrollUI();
                    }
                }
            }
        );

        megaRoom.appendDomMessage(
            $dialog
        );
        return;
    }

    var $promise1 = new $.Deferred();
    var $promise2 = new $.Deferred();

    var $combPromise = $.when($promise1, $promise2);

    var contact2 = megaRoom.megaChat.getContactFromJid(Karere.getNormalizedBareJid(wireMessage.toJid));

    $combPromise
        .fail(function() {
            if(localStorage.d) {
                console.error("Could not process message: ", wireMessage, e);
            }

            setTimeout(function() {
                self._processMessageRecursive(e, megaRoom, wireMessage, contact, retriesCount);
            }, retriesCount * 1234);
        })
        .done(function() {
            megaRoom.encryptionHandler.processMessage(wireMessage);
        });

    getPubEd25519(contact.u, function(r) {
        if(r) {
            try {
                $promise1.resolve();
            } catch(e) {
                if(localStorage.d) {
                    console.error("Failed to process message", wireMessage, "with error:", e);
                    if(localStorage.stopOnAssertFail) {
                        debugger;
                    }
                }
            }
        } else {
            $promise1.reject();
        }
    });
    getPubEd25519(contact2.u, function(r) {
        if(r) {
            try {
                $promise2.resolve();
            } catch(e) {
                if(localStorage.d) {
                    console.error("Failed to process message", wireMessage, "with error:", e);
                    if(localStorage.stopOnAssertFail) {
                        debugger;
                    }
                }
            }
        } else {
            $promise2.reject();
        }
    });

    return $combPromise;
};

EncryptionFilter.prototype.processMessage = function(e, megaRoom, wireMessage) {
    var self = this;
    var fromBareJid = Karere.getNormalizedBareJid(wireMessage.from);
    var contact = megaRoom.megaChat.getContactFromJid(fromBareJid);
    assert(!!contact, 'contact not found.');

    if(localStorage.d) {
        console.error("Processing: ", wireMessage)
    }

    var retriesCount = 0;


    self._processMessageRecursive(e, megaRoom, wireMessage, contact, retriesCount);
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

EncryptionFilter.prototype.shouldQueueMessage = function(megaRoom, messageObject) {
    return (
            megaRoom.encryptionHandler.state !== mpenc.handler.STATE.INITIALISED
        );
};

