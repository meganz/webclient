/**
 * Encryption filter that connects MegaChat + Karere and mpENC
 *
 * @param megaChat
 * @returns {EncryptionFilter}
 * @constructor
 */
var EncryptionFilter = function(megaChat) {
    var self = this;

    self.logger = MegaLogger.getLogger("encryptionFilter", {}, megaChat.logger);

    if(window.d && mpenc) {
        mpenc.debug.decoder = true;
    }
    self.megaChat = megaChat;
    self.karere = megaChat.karere;

    self._reinitialiseEncryptionOpQueue = function(megaRoom) {
        self.destroyEncryptionFilterForRoom(megaRoom);

        if(megaRoom.encryptionHandler) {
            delete megaRoom.encryptionHandler;
        }

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
                if(handler.state === mpenc.handler.STATE.INITIALISED && (megaRoom.state === ChatRoom.STATE.PLUGINS_WAIT || megaRoom.state === ChatRoom.STATE.PLUGINS_PAUSED)) {
                    megaRoom.setState(
                        ChatRoom.STATE.PLUGINS_READY
                    )
                } else if(handler.state !== mpenc.handler.STATE.INITIALISED && megaRoom.state === ChatRoom.STATE.READY) {
                    megaRoom.setState(
                        ChatRoom.STATE.PLUGINS_PAUSED
                    )
                }

                if(handler.state === mpenc.handler.STATE.INITIALISED) {
                    megaRoom.encryptionOpQueue.pop();
                }
            }
        );

        if(megaRoom.encryptionOpQueue) {
            megaRoom.encryptionOpQueue.destroy();
            delete megaRoom.encryptionOpQueue;
        }

        megaRoom.encryptionOpQueue = new OpQueue(
            megaRoom.encryptionHandler,
            megaRoom,
            function(opQueue, nextOp) {
                if(nextOp[0] == "quit" && opQueue.ctx.state !== mpenc.handler.STATE.INITIALISED) {
                    return false;
                } else if(nextOp[0] == "recover") {
                    return true;
                } else if(nextOp[0] == "start" && opQueue.ctx.state == mpenc.handler.STATE.NULL) {
                    return true;
                } else if(nextOp[0] == "join" && opQueue.ctx.state == mpenc.handler.STATE.INITIALISED) {
                    return true;
                } if(nextOp[0] == "processMessage") {  // greet/init enc messages
                    return true;
                } else {
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


        EncryptionFilter.debugEncryptionHandler(megaRoom.encryptionHandler, megaRoom.roomJid.split("@")[0], megaRoom);

        logAllCallsOnObject(megaRoom.encryptionOpQueue, console.debug, true, "mpOpQueue", self.logger);
    };
    /**
     * Initialize the mpenc.handler.ProtocolHandler and OpQueue when a room is created
     */
    megaChat.unbind("onRoomCreated.encFilter");
    megaChat.bind("onRoomCreated.encFilter", function(e, megaRoom) {
         self.logger.debug("ROOM created.");
        self._reinitialiseEncryptionOpQueue(megaRoom);

        megaRoom.unbind("onStateChange.encFilter");
        megaRoom.bind("onStateChange.encFilter", function(e, oldState, newState) {
            if(newState == ChatRoom.STATE.LEAVING) {
                if(Object.keys(megaRoom.getUsers()).length > 1 && megaRoom.encryptionHandler && megaRoom.encryptionHandler.state === mpenc.handler.STATE.INITIALISED) {
                    megaRoom.encryptionOpQueue.queue('quit');
                }
            }
        });
    });

    /**
     * Cleanup after room destroy
     */
    megaChat.unbind("onRoomDestroy.encFilter");
    megaChat.bind("onRoomDestroy.encFilter", function(e, megaRoom) {
        if(Object.keys(megaRoom.getUsers()).length > 1 && megaRoom.encryptionHandler && megaRoom.encryptionHandler.state == mpenc.handler.STATE.INITIALISED) {
            megaRoom.encryptionOpQueue.queue('quit');
        }
        delete megaRoom.encryptionHandler;
        delete megaRoom.encryptionOpQueue;
    });


    /**
     * Pause MegaChat's state machine if needed (so that the mpenc can set up the encryption)
     */
    megaChat.unbind("onPluginsWait.encFilter");
    megaChat.bind("onPluginsWait.encFilter", function(e, megaRoom) {
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
//        if(megaRoom.encryptionHandler.state !== mpenc.handler.STATE.INITIALISED) {

        e.stopPropagation();
        megaRoom.setState(ChatRoom.STATE.PLUGINS_PAUSED);

//        }
    });




    /**
     * Sync members list and encryption after i'd joined
     *
     * @param e {jQuery.Event}
     * @param eventObject {KarereEventObjects.UsersUpdated}
     */
    megaChat.karere.unbind("onUsersUpdatedDone.encFilter");
    megaChat.karere.bind("onUsersUpdatedDone.encFilter", function(e, eventObject) {
        var megaRoom = megaChat.chats[eventObject.getRoomJid()];

        if(!megaRoom) {
            return;
        }

        megaRoom.iHadJoined = true;

        var users = megaRoom.getOrderedUsers();

//         self.logger.debug("I'd Joined: ", users, megaRoom.megaChat.karere.getJid(), megaRoom, eventObject);

        if(megaRoom.iAmRoomOwner()) {
            // i'm the new "owner"

            // sync users list w/ encryption (join/exclude);
            self.syncRoomUsersWithEncMembers(megaRoom);
        }

        // i'm the only user in the room, set state to ready.
        if((megaRoom.state === ChatRoom.STATE.PLUGINS_WAIT || megaRoom.state === ChatRoom.STATE.PLUGINS_PAUSED) && users.length == 1) {
            megaRoom.setState(
                ChatRoom.STATE.PLUGINS_READY
            );
        }
        self.logger.debug("onUsersUpdatedDone", megaRoom.roomJid);
    });

    /**
     * When someone joins a room, if i'm the owner, i should add him to the encryption member list
     *
     * @param e {jQuery.Event}
     * @param eventObject {KarereEventObjects.UsersJoined}
     */
    megaChat.karere.unbind("onUsersJoined.encFilter");
    megaChat.karere.bind("onUsersJoined.encFilter", function(e, eventObject) {
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
    megaChat.karere.unbind("onUsersLeft.encFilter");
    megaChat.karere.bind("onUsersLeft.encFilter", function(e, eventObject) {
        var megaRoom = megaChat.chats[eventObject.getRoomJid()];

        if(!megaRoom) {
            return;
        }

        var users = megaRoom.getOrderedUsers();
        var leftUsers = Object.keys(eventObject.getLeftUsers());

        // owner had left and i'm the new owner
//         self.logger.debug("Left: ", users, leftUsers, megaRoom.megaChat.karere.getJid(), megaRoom, eventObject);
        if($.inArray(users[0], leftUsers) !== -1 && users[1] == megaRoom.megaChat.karere.getJid()) {
             self.logger.debug("I'm the new owner of the room [1]!");

            // sync users list w/ encryption (join/exclude);
            self.syncRoomUsersWithEncMembers(megaRoom);

        } else if(megaRoom.iAmRoomOwner()) {
            // i'm the owner
             self.logger.debug("I'm the new owner of the room [2]!");

            // sync users list w/ encryption (join/exclude);
            self.syncRoomUsersWithEncMembers(megaRoom);
        }
//         self.logger.debug("got state change2?: ", users[0], megaRoom.megaChat.karere.getJid());
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
    megaChat.karere.unbind("onChatMessage.encFilter");
    megaChat.karere.bind("onChatMessage.encFilter", processIncoming);
    megaChat.karere.unbind("onPrivateMessage.encFilter");
    megaChat.karere.bind("onPrivateMessage.encFilter", processIncoming);
    megaChat.karere.unbind("onActionMessage.encFilter");
    megaChat.karere.bind("onActionMessage.encFilter", processIncoming);

    // outgoing
    megaChat.karere.unbind("onOutgoingMessage.encFilter");
    megaChat.karere.bind("onOutgoingMessage.encFilter", processOutgoing);



    logAllCallsOnObject(this, console.debug, true, "encFilter", self.logger);
    callLoggerWrapper(window, "getPubEd25519", console.debug, "getPubEd25519", self.logger);


    /**
     * used to mark which room had been marked for a resync, so that multiple resync don't create a forever loops.
     * @type {Object}
     * @private
     */
    self._queuedResyncs = {};

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
 * @param megaRoom {ChatRoom}
 * @param handler {mpenc.ProtocolHandler}
 */
EncryptionFilter.prototype.flushQueue = function(megaRoom, handler) {
    var self = this;

     self.logger.debug("Flushing: ", megaRoom, handler);


    while(handler.protocolOutQueue.length) {
        var msg = handler.protocolOutQueue.shift();

        // always append the room's jid into the metadata, so that the encryption filter would know to which
        // protocol handler to send the enc. message for processing
        var meta = $.extend({}, msg.metadata, {'roomJid': megaRoom.roomJid});

        if(msg.to) {

            megaRoom.megaChat.karere.sendRawMessage(
                msg.to,
                (!msg.to || msg.to.indexOf("conference.") !== -1) ? "groupchat" : "chat",
                msg.message,
                meta, /* sendTo roomJid */
                msg.metadata ? msg.metadata.messageId : undefined,
                msg.metadata ? msg.metadata.delay : undefined
            );
        } else {
            megaRoom.megaChat.karere.sendRawMessage(
                megaRoom.roomJid,
                "groupchat",
                msg.message,
                meta,
                msg.metadata ? msg.metadata.messageId : undefined,
                msg.metadata ? msg.metadata.delay : undefined
            );
        }

         self.logger.debug("protocolOut: ", msg);
    }


    while(handler.messageOutQueue.length) {
        var msg = handler.messageOutQueue.shift();

        var toJid = msg.to ? msg.to : megaRoom.roomJid;

         self.logger.debug("sending out message to: ", toJid)

        megaRoom.megaChat.karere.sendRawMessage(
            toJid,
            (!toJid || toJid.indexOf("conference.") !== -1) ? "groupchat" : "chat",
            msg.message,
            (msg.metadata && msg.metadata.roomJid) ? {'roomJid': msg.metadata.roomJid} : undefined, /* sendTo roomJid */
            msg.metadata ? msg.metadata.messageId : undefined,
            msg.metadata ? msg.metadata.delay : undefined
        );

         self.logger.debug("messageOut: ", msg);
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
                var eventObject;
                if(Karere.getNormalizedBareJid(wireMessage.fromJid) == self.megaChat.karere.getBareJid()) {
                    eventObject = new KarereEventObjects.OutgoingMessage(
                        /* toJid */ wireMessage.toJid,
                        /* fromJid */ wireMessage.fromJid,
                        /* type */ "Message",
                        /* messageId */ wireMessage.messageId,
                        /* contents */ msgPayload[0],
                        /* meta */ msgPayload[1],
                        /* delay */ wireMessage.delay,
                        /* state */ KarereEventObjects.OutgoingMessage.STATE.SENT,
                        /* roomJid */ wireMessage.roomJid
                    );
                } else {
                    eventObject = new KarereEventObjects.IncomingMessage(
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
                }
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

         self.logger.debug("uiQueue: ", wireMessage);
    }
};


/**
 * Goes thru the list of users in the specific `megaRoom` and tries to sync that with the `mpenc.ProtocolHandler`
 *
 * @param megaRoom {ChatRoom}
 * @param [forceRecover] {boolean}
 */
EncryptionFilter.prototype.syncRoomUsersWithEncMembers = function(megaRoom, forceRecover) {
    var self = this;


    if(megaRoom._leaving) {
        return;
    } else if(megaRoom._syncRoomMembersIsInProgress && megaRoom._syncRoomMembersIsInProgress.state() != "resolved") {

        if(!self._queuedResyncs[megaRoom.roomJid]) {
            self._queuedResyncs[megaRoom.roomJid] = true;

            megaRoom._syncRoomMembersIsInProgress.always(function () { // wait for the already started sync to finish and then
                // re-try to sync if needed
                self.syncRoomUsersWithEncMembers(megaRoom);

                delete self._queuedResyncs[megaRoom.roomJid];
            });
        }

        return;
    }

    var xmppUsers = megaRoom.getOrderedUsers();
    var encUsers = megaRoom.encryptionHandler.askeMember.members;

    var excludeUsers = [];
    var joinUsers = [];

    assert(xmppUsers.length + encUsers.length > 0, 'no users');

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

        self.logger.debug("#PING pinging: ", v);

        promises.push(
            megaRoom.megaChat.karere.sendPing(v)
                .fail(function() {
                     self.logger.debug("#PING ping failed for: ", v);

                    if(excludeUsers.indexOf(v) == -1) { // not excluded
                         self.logger.debug("#PING ping failed caused exclude for: ", v);

                        if(encUsers.indexOf(v) != -1) {
                            excludeUsers.push(
                                v
                            );
                        } else if(joinUsers.indexOf(v) != -1) {
                             self.logger.debug("#PING ping failed caused removal from JOIN users for: ", v);

                            joinUsers.splice(joinUsers.indexOf(v), 1);
                        }
                    }
                })
                .done(function() {
                     self.logger.debug("#PING ping success for: ", v);
                })
        );
    });


    megaRoom._syncRoomMembersIsInProgress = MegaPromise.allDone(promises, megaRoom.megaChat.karere.options.pingTimeout + 1000)
        .always(function() {
            self.logger.debug("#PING got state // users to join:", joinUsers);
            self.logger.debug("#PING got state // users to exclude:", excludeUsers);

            megaRoom._syncRoomMembersIsInProgress = false;

            // filter .joinUsers who are NOT participants
            var participants = megaRoom.getParticipants();

            $.each(joinUsers, function(k, v) {
                if(participants.indexOf(Karere.getNormalizedBareJid(v)) === -1) {
                    joinUsers.splice(k, 1);
                }
            });
            if(!megaRoom.encryptionHandler) {
                self.logger.warn('encryptionHandler is missing/not initialised');
                return;
            }

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
                         self.logger.debug("forceRecover: ignoring user: ", v);
                    }
                });

                self.logger.warn("had to recover, current users: ", currentUsers, "newly joined users: ", newlyJoinedUsers);

                if(currentUsers.length == 1) { // e.g. if i'm the only one left in the room, then a brand new mpenc
                                               // protocol handler should be initialised
                    self._reinitialiseEncryptionOpQueue(megaRoom);

                    var allUsers = array_unique(array_unique(newlyJoinedUsers).concat(currentUsers));
                    var mePos = allUsers.indexOf(megaRoom.megaChat.karere.getJid());
                    if(mePos >= 0) {
                        allUsers.splice(mePos, 1);
                    }

                    if(megaRoom.iAmRoomOwner()) {
                        //if(allUsers.length == 0 || !allUsers) {
                        //    debugger;
                        //}
                        megaRoom.encryptionOpQueue.queue('start', allUsers);
                    }
                } else {
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
        });

    return megaRoom._syncRoomMembersIsInProgress;
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

    self.logger.debug("Processing outgoing message: ", e, eventObject, eventObject.isEmptyMessage())

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
             self.logger.debug("Room not found: ", roomJid, eventObject);
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
             self.logger.debug("Room not found: ", roomJid, eventObject);
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

     self.logger.debug("Processing incoming message: ", msg, e, eventObject, eventObject.isEmptyMessage());

    if(msg && msg.indexOf(EncryptionFilter.MPENC_MSG_TAG) === 0) {
        var wireMessage = $.extend({}, eventObject, {
            message: msg,
            from: Karere.getNormalizedFullJid(eventObject.getFromJid())
        });
         self.logger.debug("Found enc in message: ", wireMessage);

        if(eventObject.getRawType() == "groupchat") {
            var roomJid = eventObject.getRoomJid();
            var megaRoom = self.megaChat.chats[roomJid];
            if(megaRoom) {
                var resp = self.processMessage(e, megaRoom, wireMessage);

                e.stopPropagation();
            } else {
                 self.logger.debug("Room not found:" , eventObject);
            }
        } else if(eventObject.getRawType() == "chat") {
            // send to all chat rooms in which i'm currently having a chat w/ this user
            assert(eventObject.getMeta().roomJid, "roomJid missing from incoming encrypted message.");

            if(self.megaChat.chats[eventObject.getMeta().roomJid]) {
                self.processMessage(e, self.megaChat.chats[eventObject.getMeta().roomJid], wireMessage);
                if (!e.isPropagationStopped()) {
                    e.stopPropagation();
                }
            } else {
                self.logger.debug("Room not found:" , eventObject);
            }
        } else {
             self.logger.debug("No idea how to handle enc message: ", wireMessage);
        }
    } else {
        // should not do anything...or call e.stopPropagation() to disable ANY plain text messages.
        self.logger.debug("Got plaintext message: ", eventObject);
    }
};

/**
 * This method will be called when a new message is received.
 *
 * @param e
 * @param megaRoom
 * @param wireMessage
 */
EncryptionFilter.prototype.processMessage = function(e, megaRoom, wireMessage) {
    var self = this;


    megaRoom.encryptionOpQueue.queue("processMessage", wireMessage);
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
    } else if(eventObject.getMeta().plaintext || (eventObject.isEmptyMessage() && !eventObject.getMeta().attachments)) {
        return true;
    } else {
        return false;
    }
};

/**
 * Returns true if this message should be queued (currently only depends on the megaRoom's state)
 *
 * @param megaRoom
 * @param messageObject
 * @returns {boolean}
 */
EncryptionFilter.prototype.shouldQueueMessage = function(megaRoom, messageObject) {
    return (
            megaRoom.encryptionHandler.state !== mpenc.handler.STATE.INITIALISED
        );
};


/**
 * Utility func to cleanup any states, timers and timeouts currently active on a specific megaRoom
 * Most cases, this should be used before doing delete on an object.
 *
 * @param megaRoom
 */
EncryptionFilter.prototype.destroyEncryptionFilterForRoom = function(megaRoom) {
    var self = this;

    if(megaRoom._syncRoomMembersIsInProgress) {
        megaRoom._syncRoomMembersIsInProgress.reject();
    }

};


/**
 * Helper method that will attach debug loggers to a encryption/ProtocolHandler
 *
 * @param eh
 * @param prefix
 */
EncryptionFilter.debugEncryptionHandler = function(eh, prefix, megaRoom) {
    var old = eh.stateUpdatedCallback;
    eh.stateUpdatedCallback = function(handler) {
        megaRoom.logger.debug("Got mpenc state change: ", handler.state);
        return old(handler);
    };

    logAllCallsOnObject(eh, console.debug, true, (prefix ? prefix + ":" : "") + "mpenc", megaRoom.logger);
    logAllCallsOnObject(eh.askeMember, console.debug, true, (prefix ? prefix + ":" : "") + "mpenc:am", megaRoom.logger);
    logAllCallsOnObject(eh.askeMember.members, console.debug, true, (prefix ? prefix + ":" : "") + "mpenc:am:m", megaRoom.logger);
    logAllCallsOnObject(eh.askeMember.staticPubKeyDir, console.debug, true, (prefix ? prefix + ":" : "") + "mpenc:am:spkd", megaRoom.logger);
    logAllCallsOnObject(eh.cliquesMember, console.debug, true, (prefix ? prefix + ":" : "") + "mpenc:cm", megaRoom.logger);
    logAllCallsOnObject(eh.cliquesMember.members, console.debug, true, (prefix ? prefix + ":" : "") + "mpenc:cm:m", megaRoom.logger);
    logAllCallsOnObject(eh.staticPubKeyDir, console.debug, true, (prefix ? prefix + ":" : "") + "mpenc:spkd", megaRoom.logger);
    logAllCallsOnObject(eh.uiQueue, console.debug, true, (prefix ? prefix + ":" : "") + "mpenc:uiQ", megaRoom.logger);
    logAllCallsOnObject(eh.protocolOutQueue, console.debug, true, (prefix ? prefix + ":" : "") + "mpenc:poQ", megaRoom.logger);
    logAllCallsOnObject(eh.messageOutQueue, console.debug, true, (prefix ? prefix + ":" : "") + "mpenc:moQ", megaRoom.logger);
};
