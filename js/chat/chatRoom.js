/**
 * Class used to represent a MUC Room in which the current user is present
 *
 * @param megaChat {Chat}
 * @param roomJid
 * @param type {String} only "private" is supported for now
 * @param users {Array}
 * @param ctime {Integer} unix time
 * @param [lastActivity] {Integer} unix time
 * @returns {ChatRoom}
 * @constructor
 */
var ChatRoom = function(megaChat, roomJid, type, users, ctime, lastActivity) {
    this.logger = MegaLogger.getLogger("room[" + roomJid + "]", {}, megaChat.logger);

    this.megaChat = megaChat;
    this.users = users ? users : [];
    this.hash = null;
    this.roomJid = roomJid;
    this.type = type;
    this.messages = [];
    this.messagesIndex = {};
    this.ctime = ctime;
    this.lastActivity = lastActivity ? lastActivity : ctime;

    this.callRequest = null;
    this.callIsActive = false;

    this.options = {
        /**
         * Maximum time for waiting a message sync, before trying to send a request to someone else in the room or
         * failing the SYNC operation at all (if there are no other users to query for the sync op).
         */
        'requestMessagesSyncTimeout': 5500,

        /**
         * Send any queued messages if the room is not READY
         */
        'sendMessageQueueIfNotReadyTimeout': 6500, // XX: why is this so slow? optimise please.

        /**
         * Change the state of the room to READY in case there was no response in timely manner. (e.g. there were no
         * users who responded for a sync call).
         */
        'messageSyncFailAfterTimeout': 45000, // XX: why is this so slow? optimise please.

        /**
         * Used to cleanup the memory from sent sync requests.
         * This should be high enough, so that it will be enough for a response to be generated (message log to be
         * encrypted), send and received.
         */
        'syncRequestCleanupTimeout': 50000,

        /**
         * The maximum time allowed for plugins to set the state of the room to PLUGINS_READY
         */
        'pluginsReadyTimeout': 60000, // XX: Because of the middle earth's internet, this should have been increased :)

        /**
         * Default media options
         */
        'mediaOptions': {
            audio: true,
            video: true
        }
    };
    this._syncRequests = {};
    this._messagesQueue = [];

    this.setState(ChatRoom.STATE.INITIALIZED);

    this.$messages = megaChat.$messages_tpl.clone();
    this.$header = megaChat.$header_tpl.clone();

    var droppableConfig = {
        tolerance: 'pointer',
        drop: function(e, ui)
        {
            $.doDD(e,ui,'drop',1);
        },
        over: function (e, ui)
        {
            $.doDD(e,ui,'over',1);
        },
        out: function (e, ui)
        {
            var c1 = $(e.srcElement).attr('class'),c2 = $(e.target).attr('class');
            if (c2 && c2.indexOf('fm-menu-item') > -1 && c1 && (c1.indexOf('cloud') > -1 || c1.indexOf('cloud') > -1)) return false;
            $.doDD(e,ui,'out',1);
        }
    };

    this.$messages.droppable(droppableConfig);
    this.$header.droppable(droppableConfig);

    // Events
    var self = this;
    this.bind('onStateChange', function(e, oldState, newState) {
        self.logger.warn("Will change state from: ", ChatRoom.stateToText(oldState), " to ", ChatRoom.stateToText(newState));

        var resetStateToReady = function() {
            if (self.state != ChatRoom.STATE.LEFT && self.state != ChatRoom.STATE.READY) {
                self.logger.warn("setting state to READY.");

                self.setState(ChatRoom.STATE.READY);
            }
        };

        if (newState === ChatRoom.STATE.PLUGINS_READY) {
            resetStateToReady();
        } else if (newState === ChatRoom.STATE.JOINED) {
            self.setState(ChatRoom.STATE.WAITING_FOR_PARTICIPANTS);
        } else if (newState === ChatRoom.STATE.PARTICIPANTS_HAD_JOINED) {
            self.setState(ChatRoom.STATE.PLUGINS_WAIT);
        } else if (newState === ChatRoom.STATE.PLUGINS_WAIT) {
            var $event = new $.Event("onPluginsWait");
            self.megaChat.trigger($event, [self]);

            if (!$event.isPropagationStopped()) {
                self.setState(ChatRoom.STATE.PLUGINS_READY);
            }
        } else if (newState === ChatRoom.STATE.PLUGINS_PAUSED) {
            // allow plugins to hold the PLUGINS_WAIT state for MAX 5s
            createTimeoutPromise(function() {
                return self.state !== ChatRoom.STATE.PLUGINS_PAUSED && self.state !== ChatRoom.STATE.PLUGINS_WAIT
            }, 100, self.options.pluginsReadyTimeout)
                .fail(function() {
                    if (self.state === ChatRoom.STATE.PLUGINS_WAIT || self.state === ChatRoom.STATE.PLUGINS_PAUSED) {
                        self.logger.error("Plugins had timed out, setting state to PLUGINS_READY");

                        var participants = self.getParticipantsExceptMe();
                        var contact = participants[0];

                        var pres = self.megaChat.karere.getPresence(contact);

                        if (pres && pres != "offline" && self.encryptionHandler && self.encryptionHandler.state !== 3) {
                            var $dialog = self.generateInlineDialog(
                                "error-" + unixtime(),
                                self.megaChat.karere.getBareJid(),
                                "mpenc-setup-failed",
                                "Could not initialise the encryption in a timely manner. To try again, you can close and start the chat again.",
                                [],
                                undefined,
                                false
                            );

                            self._mpencFailedDialog = $dialog;

                            self.appendDomMessage(
                                $dialog
                            );

                            var othersJid = self.getParticipantsExceptMe()[0];
                            var data = {
                                currentMpencState: self.encryptionHandler.state,
                                currentKarereState: self.megaChat.karere.getConnectionState(),
                                myPresence: self.megaChat.karere.getPresence(self.megaChat.karere.getJid()),
                                otherUsersPresence: self.megaChat.karere.getPresence(othersJid),
                                callIsActive: self.callSession ? constStateToText(CallSession.STATE, self.callSession.state) : null,
                                queuedMessagesCount: self._messagesQueue.length,
                                opQueueErrorRetriesCount: self.encryptionOpQueue._error_retries
                            };

                            srvlog("Timed out initialising mpenc.", data, true);
                            self.logger.error("Timed out initialising mpenc.", data);
                        }

                        self.setState(ChatRoom.STATE.PLUGINS_READY);
                    }
                });
        } else if (newState === ChatRoom.STATE.READY) {
            if (self.encryptionHandler && self.encryptionHandler.state === mpenc.handler.STATE.READY) {
                if (self._mpencFailedDialog) {
                    self._mpencFailedDialog.remove();
                    delete self._mpencFailedDialog;
                }
                self._flushMessagesQueue();
            }
        }
    });

    this.$header.hide();
    this.$header.addClass('conv-ended');

    this.$messages.hide();

    this.$header.insertBefore(
        $('.fm-chat-line-block', this.megaChat.$container)
    );

    this.$messages.insertBefore(
        $('.fm-chat-line-block', this.megaChat.$container)
    );


    this.$messages.jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5, animateDuration: 70});



    // button triggered popups
    // - start-call
    $('.chat-button > span', self.$header).unbind("click.megaChat");

    $('.chat-button.fm-start-call', self.$header).bind("click.megaChat", function() {
        if ($(this).is(".disabled")) {
            return false;
        }
		var sendFilesPopup = $('.fm-start-call-popup', self.$header);
        var positionX = $('.fm-chat-block').outerWidth() - $(this).position().left - ($(this).outerWidth() * 0.5) - (sendFilesPopup.outerWidth() * 0.5);
        
        if ($(this).attr('class').indexOf('active') === -1) {
            self.megaChat.closeChatPopups();
            sendFilesPopup.addClass('active');
            $(this).addClass('active');

            var $arrow = $('.fm-start-call-popup .fm-send-files-arrow', self.$header);
            
			if (positionX < 8) {
				sendFilesPopup.css('right',  '8px');
				$arrow.css('left', sendFilesPopup.outerWidth() - ($(this).outerWidth() * 0.5)  + 'px');
				
			} else {
				sendFilesPopup.css('right',  positionX + 'px');
				$arrow.css('left', '50%');
			}
			
        } else {
            self.megaChat.closeChatPopups();
        }
    });
    // - send-files
    $('.chat-button.fm-send-files', self.$header).unbind('click.megaChat');
    $('.chat-button.fm-send-files', self.$header).bind('click', function()
    {
        var positionX = $(this).position().left;
        var manuallyAddedOffset = 60; // since this is the last button, i had to add this offset so that it wont go out
                                      // of the screen
        var sendFilesPopup = $('.fm-send-files-popup', self.$header);
        if ($(this).attr('class').indexOf('active') === -1)
        {
            self.megaChat.closeChatPopups();
            sendFilesPopup.addClass('active');
            $(this).addClass('active');
            $('.fm-send-files-arrow', self.$header).css('left', $(this).outerWidth()/2 + manuallyAddedOffset  + 'px');
            sendFilesPopup.css('left',  ($(this).position().left - manuallyAddedOffset) + 'px');
        }
        else
        {
            self.megaChat.closeChatPopups();

        }
    });

    // - end call
    $('.chat-button.fm-chat-end', self.$header).unbind("click.megaChat");
    $('.chat-button.fm-chat-end', self.$header).bind("click.megaChat", function() {
        self.destroy(true);
    });

    /**
     * Audio/Video button handlers
     */
    $('.start-audio', self.$header).rebind('click.megaChat', function() {
        self.startAudioCall();
    });
    $('.start-video', self.$header).rebind('click.megaChat', function() {
        self.startVideoCall();
    });


    $('.audio-icon', self.$header).bind('click.megaChat', function() {
        if (!self.callSession) {
            return;
        }
        if (self.callSession.getMediaOptions().audio === false) { // un mute
            self.callSession.unmuteAudio();
            $('.chat-header-indicator.muted-audio', self.$header).addClass('hidden');
        } else { // mute
            self.callSession.muteAudio();
            $('.chat-header-indicator.muted-audio', self.$header).removeClass('hidden');
        }




        self.callSession.renderCallStartedState();
    });

    $('.video-icon', self.$header).bind('click.megaChat', function() {
        if (!self.callSession) {
            return;
        }
        if (self.callSession.getMediaOptions().video === false) { // un mute
            self.callSession.unmuteVideo();
            $('.chat-header-indicator.muted-video', self.$header).addClass('hidden');
        } else { // mute
            self.callSession.muteVideo();
            $('.chat-header-indicator.muted-video', self.$header).removeClass('hidden');
        }
        if ($('.my-av-screen').attr('class').indexOf('minimized')==-1)
           $('.my-av-screen').removeAttr('style');

        if (self.callSession) {
            self.callSession.renderCallStartedState();
        }
    });


    // make the audio/video screen resizable
    self.audioVideoPaneResizable = new FMResizablePane(self.$header, {
        'handle': $('.drag-handle', self.$header),
        'persistanceKey': false,
        'direction': 's'
    });

    $(self.audioVideoPaneResizable).bind("resizestop", function() {
        self.resized();
    });
    $(self.audioVideoPaneResizable).bind("resize", function() {
        self.resized();
    });

    $('.drag-handle', self.$header).hide();



    var $avscreen = $('.my-av-screen', self.$header);
    $avscreen.draggable({
        'containment': $avscreen.parents('.chat-call-block'),
        'scroll': false
    });

    // activity on a specific room (show, hidden, got new message, etc)
    self.bind('activity', function(e) {
        self.lastActivity = unixtime();

        if (self.type === "private") {
            var targetUserJid = self.getParticipantsExceptMe()[0];
            var targetUserNode = self.megaChat.getContactFromJid(targetUserJid);
            assert(M.u, 'M.u does not exists');

            assert(targetUserNode && targetUserNode.u, 'No hash found for participant');
            assert(M.u[targetUserNode.u], 'User not found in M.u');

            if (targetUserNode) {
                M.u[targetUserNode.u].lastChatActivity = self.lastActivity;
                setLastInteractionWith(targetUserNode.u, "1:" + self.lastActivity);
            }
        } else {
            throw new Error("Not implemented");
        }

        if (M.csort === "chat-activity") {
            // Trigger manual reorder, if M.renderContacts() is called it will remove some important .opened classes
            self.megaChat.reorderContactTree();
        }


//        if (M.csort === "chat-activity") {
//            M.renderContacts();
//        };
    });


    self.$messages
        .undelegate('.delete-button', 'mousedown.megaChatDeleteMessage')
        .delegate('.delete-button', 'mousedown.megaChatDeleteMessage', function(e) {
            var $message = $(this).parents('.fm-chat-message-container');
            if (!$message) { return; };

            var messageId = $message.attr('data-id');
            var msgObject = self.getMessageById(messageId);
            if (!msgObject) {
                return;
            }

            if (Karere.getNormalizedBareJid(msgObject.getFromJid()) === self.megaChat.karere.getBareJid()) {
                var meta = clone(msgObject.getMeta());
                meta['isDeleted'] = true;
                msgObject.setMeta(meta); // trigger change event

                $('.fm-chat-message-container[data-id="' + messageId + '"]', self.$messages).remove();
                self.refreshUI();

                self.megaChat.sendBroadcastAction(self.roomJid, 'delete-message', {
                    'messageId': messageId,
                    'plaintext': true,
                    'roomJid': self.roomJid
                });
            }
        });

    self.megaChat.trigger('onRoomCreated', [self]);

    // Hide this block until text chat is ready
    /*
    self.bind('onConversationStarted', function(e) {
        self.appendDomMessage(
            self.generateInlineDialog(
                "conv-started",
                self.megaChat.karere.getJid(),
                "conv-started",
                "You have joined the conversation.",
                [],
                {},
                !self.isActive()
            )
        );
    });*/

    return this;
};

/**
 * Add support for .on, .bind, .unbind, etc
 */
makeObservable(ChatRoom);

/**
 * Room states
 *
 * @type {{INITIALIZED: number, JOINING: number, JOINED: number, WAITING_FOR_PARTICIPANTS: number, PARTICIPANTS_HAD_JOINED: number, PLUGINS_WAIT: number, PLUGINS_READY: number, READY: number, PLUGINS_PAUSED: number, LEAVING: number, LEFT: number}}
 */
ChatRoom.STATE = {
    'INITIALIZED': 5,
    'JOINING': 10,
    'JOINED': 20,

    'WAITING_FOR_PARTICIPANTS': 24,
    'PARTICIPANTS_HAD_JOINED': 27,

    'PLUGINS_WAIT': 30,
    'PLUGINS_READY': 40,


    'READY': 150,

    'PLUGINS_PAUSED': 175,

    'LEAVING': 200,

    'LEFT': 250
};

ChatRoom.prototype._retrieveTurnServerFromLoadBalancer = function() {
    var self = this;

    var $promise = new MegaPromise();

    var anonId = "";

    if (self.megaChat.rtc && self.megaChat.rtc.ownAnonId) {
        anonId = self.megaChat.rtc.ownAnonId;
    }
    $.get("https://" + self.megaChat.options.loadbalancerService + "/?service=turn&anonid=" + anonId)
        .done(function(r) {
            if (r.turn && r.turn.length > 0) {
                var servers = [];
                r.turn.forEach(function(v) {
                    servers.push({
                        url: 'turn:' + v.host + ':' + v.port + '?transport=udp',
                        username: "inoo20jdnH",
                        credential: '02nNKDBkkS'
                    });
                });
                self.megaChat.rtc.updateIceServers(servers);

                $promise.resolve();
            } else {
                $promise.resolve();
            }
        })
        .fail(function() {
            $promise.reject();
        });

    return $promise;
};

ChatRoom.prototype._resetCallStateNoCall = function() {

};



ChatRoom.prototype._resetCallStateInCall = function() {

};

/**
 * Convert state to text (helper function)
 *
 * @param state {Number}
 * @returns {String}
 */
ChatRoom.stateToText = function(state) {
    var txt = null;
    $.each(ChatRoom.STATE, function(k, v) {
        if (state === v) {
            txt = k;

            return false; // break
        }
    });

    return txt;
};

/**
 * Change the state of this room
 *
 * @param newState {ChatRoom.STATE} the new state
 * @param [isRecover] {Boolean}
 */
ChatRoom.prototype.setState = function(newState, isRecover) {
    var self = this;

    assert(newState, 'Missing state');

    if (newState === self.state) {
        self.logger.debug("Ignoring .setState, newState === oldState, current state: ", self.getStateAsText());
        return;
    }

    if (self.state) { // if not === null, e.g. setting to INITIALIZED
        // only allow state changes to be increasing the .state value (5->10->....150...) with the exception when a
        // PLUGINS_PAUSED is the current or new state
        assert(
            newState === ChatRoom.STATE.PLUGINS_PAUSED ||
            self.state === ChatRoom.STATE.PLUGINS_PAUSED ||
            newState === ChatRoom.STATE.WAITING_FOR_PARTICIPANTS ||
            (newState === ChatRoom.STATE.JOINING && isRecover) ||
            (newState === ChatRoom.STATE.INITIALIZED && isRecover) ||
            newState > self.state,
            'Invalid state change. Current:' + ChatRoom.stateToText(self.state) +  "to" + ChatRoom.stateToText(newState)
        );
    }

    var oldState = self.state;
    self.state = newState;

    self.trigger('onStateChange', [oldState, newState]);
};

/**
 * Returns current state as text
 *
 * @returns {String}
 */
ChatRoom.prototype.getStateAsText = function() {
    var self = this;
    return ChatRoom.stateToText(self.state);
};


/**
 * Return current type of call (if there is active call, if not === false)
 *
 * @returns {String|Boolean}
 */
ChatRoom.prototype.getCurrentCallType = function() {
    var self = this;
    var opts = self.callSession ? self.callSession.getMediaOptions() : null;

    if (!self.callSession || self.callSession.isStarted() === false) {
        return false;
    } else if (opts.video === true && opts.audio === true) {
        return "video-call";
    } else if (opts.video === false && opts.audio === true) {
        return "audio-call";
    } else {
        return "none";
    }
};

/**
 * Change/set the type of the room
 *
 * @param type
 */
ChatRoom.prototype.setType = function(type) {
    var self = this;

    if (!type) {
        if (window.d) {
            debugger;
        }
        self.logger.error("missing type in .setType call");
    }

    self.type = type;
};

/**
 * Set the users (participants) of the room.
 * This is different then the actual current room occupants, based on the XMPP info, because it should contain a list
 * of BARE jids which SHOULD be in the room.
 *
 * Note: All of those JIDs would get auto-invitations to join this room when they connect to the XMPP automatically.
 *
 * @param jids {Array} List of bare jids
 */
ChatRoom.prototype.setUsers = function(jids) {
    this.users = clone(jids);

    this.refreshUI();
};


/**
 * the same as .setUsers, w/ the difference that it will only add any of the user jids in `jids` to the `.users`,
 * instead of just overwriting the `.users` property
 *
 * @param jids {Array} List of bare jids
 */
ChatRoom.prototype.syncUsers = function(jids) {
    var self = this;

    assert(jids, "Missing jids");

    var users = clone(self.users);

    $.each(jids, function(k, v) {
        if (v) {
            v = v.split("/")[0];
            if (self.users.indexOf(v) === -1) {
                users.push(
                    v
                )
            }
        }
    });

    if (users.length > self.users.length) {
        self.setUsers(users);
    }
};

/**
 * Check if participant exists in room
 *
 * @param jid {String} Full OR Bare jid
 * @param [strict] {boolean} If true, will only check for FULL jids.
 * @param [notMe] {boolean} set to true if you want the search to ignore if the matched partcipant === my bare jid
 * @returns {boolean}
 */
ChatRoom.prototype.participantExistsInRoom = function(jid, strict, notMe) {
    var self = this;

    strict = strict || false;

    var result = false;
    $.each(self.users, function(k, v) {
        if (!v) {
            self.logger.error("missing contact: ", k);

            return;
        }
        if (notMe) {
            if (Karere.getNormalizedBareJid(v) === self.megaChat.karere.getBareJid()) {
                return; // continue
            }
        }
        if (strict && v === jid) {
            result = true;
            return false; // break;
        } else if (!strict && v.split("/")[0] === jid) {
            result = true;
            return false; // break;
        }
    });

    return result;
};


/**
 * Get all participants in a chat room.
 *
 * @returns {Array}
 */
ChatRoom.prototype.getParticipants = function() {
    var self = this;

    var participants = {};


    $.each(self.users, function(k, v) {
        if (!v) {
            self.logger.error("missing contact/user: ", k);

            return;
        }
        participants[v.split("/")[0]] = true;
    });

    return Object.keys(participants);
};

/**
 * Get all users in the chat room.
 *
 * @returns {Array}
 */
ChatRoom.prototype.getUsers = function() {
    var self = this;

    return self.megaChat.karere.getUsersInChat(self.roomJid);
};

/**
 * Get all users in the chat room ordered by joining time.
 *
 * @returns {Array}
 */
ChatRoom.prototype.getOrderedUsers = function() {
    var self = this;

    return self.megaChat.karere.getOrderedUsersInChat(self.roomJid);
};

/**
 * Get room owner (e.g. the oldest user who joined and is currently in the room)
 *
 * @returns {(string|null)}
 */
ChatRoom.prototype.getRoomOwner = function() {
    var self = this;

    var users = self.megaChat.karere.getOrderedUsersInChat(self.roomJid);

    return users[0];
};

/**
 * Check if i'm the owner of the room
 *
 * @returns {boolean}
 */
ChatRoom.prototype.iAmRoomOwner = function() {
    var self = this;

    var users = self.getOrderedUsers();

    return users[0] === self.megaChat.karere.getJid();
};
/**
 * Get a list of the current participants for this room, excluding my jid (or if provided, exlucding any of the jids
 * founds in arr `jids`).
 *
 * @param [jids] {Array}
 * @returns {Array}
 */
ChatRoom.prototype.getParticipantsExceptMe = function(jids) {
    var self = this;
    if (!jids) {
        jids = self.getParticipants();
    }
    var jidsWithoutMyself = clone(jids);
    jidsWithoutMyself.splice($.inArray(self.megaChat.karere.getBareJid(), jidsWithoutMyself), 1);

    return jidsWithoutMyself;
};

/**
 * Refreshes the UI of the chat room.
 *
 * @param [scrollToBottom] {boolean|jQuery} set to true if you want to automatically scroll the messages pane to the
 * bottom OR to a specific element
 */
ChatRoom.prototype.refreshUI = function(scrollToBottom) {
    var self = this;

    if (self._leaving) {
        return;
    }

    this.$header.attr("data-room-jid", this.roomJid.split("@")[0]);

    if (this.$header.is(":visible")) {
        this.$header.removeClass("hidden");
        $('.nw-conversations-item').removeClass("selected");
        $('.nw-conversations-item[data-room-jid="' + self.roomJid.split("@")[0] + '"]').addClass("selected");


        // active call?
        if (this.callSession && this.callSession.isStarted() === true) {
            var $currentCall = $('.nw-conversations-item.current-calling[data-jid="' + self.roomJid + '"]');
            if ($currentCall.length > 0) {
                $currentCall.addClass('selected');
            }
        }

    }

    var $jsp = self.$messages.data("jsp");
    if (!$jsp) { debugger; }
    assert($jsp, "JSP not available?!");

    $jsp.reinitialise();

    if (scrollToBottom === true) {
        self.$messages.one('jsp-initialised', function() {
            $jsp.scrollToBottom();
        });
    } else if (scrollToBottom) {
        self.$messages.one('jsp-initialised', function() {
            $jsp.scrollToElement(scrollToBottom);
        });
    }

    $('.fm-chat-user', this.$header).text(this.roomJid.split("@")[0]);

    var participants = self.getParticipantsExceptMe();

    if (self.type === "private") {
        $.each(self.users, function(k, v) {
            if (v === self.megaChat.karere.getBareJid()) {
                // ignore me
                return; // continue;
            }
            var $element = $('.nw-conversations-item[data-jid="' + v + '"]');
            $element.attr("data-room-jid", self.roomJid.split("@")[0]);
        });
    }

    if (self.type === "private") {

        assert(participants[0], "No participants found.");

        $('.fm-chat-user', self.$header).text(
            self.megaChat.getContactNameFromJid(participants[0])
        );
        var contact = self.megaChat.getContactFromJid(participants[0]);

        if (!contact) {
            self.logger.warn("Contact not found: ", participants[0]);
        } else {
            var presence = self.megaChat.karere.getPresence(
                self.megaChat.getJidFromNodeId(contact.u)
            );

            var presenceCssClass = self.megaChat.xmppPresenceToCssClass(
                presence
            );

            $('.fm-chat-user-info', self.$header)
                .removeClass('online')
                .removeClass('away')
                .removeClass('busy')
                .removeClass('offline')
                .removeClass('black')
                .addClass(presenceCssClass);


            if ($('#topmenu').children().length === 0) {
                $('#topmenu').html(parsetopmenu()); // we need the top menu!
            }
            var presenceText = $.trim($('.top-user-status-item > .' + presenceCssClass).parent().text());

            assert(presenceText && presenceText.length > 0, 'missing presence text');

            $('.fm-chat-user-status', self.$header)
                .text(
                presenceText
            );

            $('> .nw-contact-avatar', self.$header).replaceWith(self._generateContactAvatarElement(participants[0]));

        }
    } else {
        throw new Error("Not implemented"); //TODO: Groups, TBD
    }


    /**
     * Audio/Video buttons
     */

    if (presenceCssClass === "offline") { // the other user is offline
        $('.btn-chat-call', self.$header).addClass('disabled');
        if (self.callSession) {
            self.callSession.endCall('hangup');
        }
    } else if (self.callSession && (self.callSession.isStarted() === false || self.callSession.isStarting() || self.callSession.isNotStarted())) {
        $('.btn-chat-call', self.$header).addClass('disabled');
    } else if (self.megaChat.karere.getPresence(self.megaChat.karere.getJid()) === false) { // i'm offline
        $('.btn-chat-call', self.$header).addClass('disabled');
        if (self.callSession) {
            self.callSession.endCall('hangup');
        }
    } else {
        if (presenceCssClass === "offline") { // the other user is offline
            $('.btn-chat-call', self.$header).addClass('disabled');
            if (self.callSession) {
                self.callSession.endCall('hangup');
            }
        } else {
            $('.btn-chat-call', self.$header).removeClass('disabled');
        }
    }

    self.renderContactTree();

    self.megaChat.refreshConversations();

    self.trigger('RefreshUI');
};


/**
 * Leave this chat room
 *
 * @param [notifyOtherDevices] {boolean|undefined} true if you want to notify other devices, falsy value if you don't want action to be sent
 * @returns {undefined|Deferred}
 */
ChatRoom.prototype.leave = function(notifyOtherDevices) {
    var self = this;

    self._leaving = true;


    if (notifyOtherDevices === true) {
        self.megaChat.sendBroadcastAction(self.roomJid, "conv-end", {roomJid: self.roomJid});
    }


    if (self.roomJid.indexOf("@") != -1) {
        self.setState(ChatRoom.STATE.LEAVING);
        return self.megaChat.karere.leaveChat(self.roomJid).done(function() {
            self.setState(ChatRoom.STATE.LEFT);
        });
    } else {
        self.setState(ChatRoom.STATE.LEFT);
    }
};

/**
 * Destroy a room (leave + UI destroy + js cleanup)
 * @param [notifyOtherDevices] {boolean|undefined} true if you want to notify other devices, falsy value if you don't want action to be sent
 */
ChatRoom.prototype.destroy = function(notifyOtherDevices) {
    var self = this;

    self.megaChat.trigger('onRoomDestroy', [self]);

    // destroy any waiting sync requests
    if (self._syncRequests) {
        $.each(self._syncRequests, function(messageId, req) {

            clearTimeout(req.timer);
        });
        delete self._syncRequests;
    };

    self.leave(notifyOtherDevices);

    self.$header.remove();
    self.$messages.remove();

    var $element = $('.nw-conversations-item[data-room-jid="' + self.roomJid.split("@")[0] + '"]');
    $element.remove();

    // dereference from self
    var mc = self.megaChat;
    var roomJid = self.roomJid;

    if (roomJid === mc.getCurrentRoomJid() || self.$header.is(":visible")) {
        window.location = "#fm/chat";
        self.hide();
        setTimeout(function() {
            self.megaChat.renderListing();
        }, 300);
    }
    setTimeout(function() {
        delete mc.chats[roomJid];
    }, 1);
};


/**
 * Show UI elements of this room
 */
ChatRoom.prototype.show = function() {
    var self = this;


    $('.files-grid-view').addClass('hidden');
    $('.fm-blocks-view').addClass('hidden');
    $('.contacts-grid-view').addClass('hidden');
    $('.fm-contacts-blocks-view').addClass('hidden');

    $('.fm-right-files-block').removeClass('hidden');

    $('.nw-conversations-item').removeClass('selected');




    sectionUIopen('conversations');


    $('.nw-conversations-item[data-room-jid="' + self.roomJid.split("@")[0] + '"]').addClass("selected");

    self.$header.show();
    self.$messages.show();
    self.$messages.parent().removeClass('hidden'); // show .fm-chat-block if hidden

    if (self.megaChat.currentlyOpenedChat && self.megaChat.currentlyOpenedChat != self.roomJid) {
        var oldRoom = self.megaChat.getCurrentRoom();
        if (oldRoom) {
            oldRoom.hide();
        }
    }

    if (self.callSession && self.callSession.isStarted()) {
        self.$header.parent('.fm-chat-block').addClass('video-call');
    } else {
        self.$header.parent('.fm-chat-block').removeClass('video-call');
    }

    self.megaChat.currentlyOpenedChat = self.roomJid;

    // update unread messages count
    $('.fm-chat-message-container.unread', self.$messages).removeClass('unread');


    self.resized(true);

    self.megaChat.lastOpenedChat = self.roomJid;

    self.trigger('activity');
    self.trigger('onChatShown');
    $('.message-textarea').focus();
};

/**
 * Returns true/false if the current room is currently active (e.g. visible)
 */
ChatRoom.prototype.isActive = function() {
    return $.windowActive && this.$header.is(":visible");
};


ChatRoom.prototype.getRoomUrl = function() {
    var self = this;
    if (self.type === "private") {
        var participants = self.getParticipantsExceptMe();
        var contact = self.megaChat.getContactFromJid(participants[0]);
        if (contact) {
            return "#fm/chat/" + contact.u;
        }
    } else {
        throw new Error("Not implemented");
    }
}
/**
 * If this is not the currently active room, then this method will navigate the user to this room (using window.location)
 */
ChatRoom.prototype.activateWindow = function() {
    var self = this;

    window.location = self.getRoomUrl();
};

/**
 * Hide the UI elements of this room
 */
ChatRoom.prototype.hide = function() {
    var self = this;


    self.$header.hide();
    self.$messages.hide();

    if (self.megaChat.currentlyOpenedChat === self.roomJid) {
        self.megaChat.currentlyOpenedChat = null;
    }
};

/**
 * Append message to the UI of this room.
 * Note: This method will also log the message, so that later when someone asks for message sync this log will be used.
 *
 * @param message {KarereEventObjects.IncomingMessage|KarereEventObjects.OutgoingMessage|Object}
 * @returns {boolean}
 */
ChatRoom.prototype.appendMessage = function(message) {
    var self = this;

    if (message.getFromJid() === self.roomJid) {
        return; // dont show any system messages (from the conf room)
    }

    if (message instanceof KarereEventObjects.IncomingMessage && Karere.getNormalizedBareJid(message.getFromJid()) === self.megaChat.karere.getJid()) {
        // my own IncomingMessage message, should be converted to Outgoing
        message = new KarereEventObjects.OutgoingMessage(
            message.toJid,
            message.fromJid,
            message.type,
            message.messageId,
            message.contents,
            message.meta,
            message.delay,
            message.meta && message.meta.state ? message.meta.state : message.state,
            message.roomJid
        );
    }
    if (self.messagesIndex[message.getMessageId()] !== undefined) {

        //self.logger.debug(self.roomJid.split("@")[0], message.getMessageId(), "This message is already added to the message list (and displayed).");
        return false;
    }

    self.messagesIndex[message.getMessageId()] = self.messages.push(
        message
    );

    var $message = self.megaChat.$message_tpl.clone().removeClass("template").addClass("fm-chat-message-container");

    var jid = Karere.getNormalizedBareJid(message.getFromJid());


    if (jid != self.megaChat.karere.getBareJid() && !self.isActive()) {
        $message.addClass('unread');
    }

    var timestamp = message.getDelay() ? message.getDelay() : unixtime();

    $('.chat-message-date', $message).text(
        unixtimeToTimeString(timestamp) //time2last is a too bad performance idea.
    );

    var name = self.megaChat.getContactNameFromJid(jid);
    var contact = self.megaChat.getContactFromJid(jid);

    if (!contact) {
        self.logger.error("Missing contact for jid: ", jid);
        return false;
    }

    $('.nw-contact-avatar', $message).replaceWith(self._generateContactAvatarElement(jid));

    $('.chat-username', $message).text(name);

    // add .current-name if this is my own message
    if (jid != self.megaChat.karere.getBareJid()) {
        $('.fm-chat-messages-block', $message).addClass("right-block");
    }



    $message.attr('data-timestamp', timestamp);
    $message.attr('data-id', message.getMessageId());
    $message.attr('data-from', jid.split("@")[0]);
    $message.addClass(contact.u);


    if (!message.messageHtml) {
        message.messageHtml = htmlentities(message.getContents()).replace(/\n/gi, "<br/>");
    }

    var event = new $.Event("onReceiveMessage");
    self.megaChat.trigger(event, message);

    if (event.isPropagationStopped()) {
        self.logger.warn("Event propagation stopped receiving (rendering) of message: ", message)
        return false;
    }


    if (message.messageHtml) {
        $('.fm-chat-message .chat-message-txt span', $message).html(
            message.messageHtml.replace(/\s{2}/gi, "&nbsp;")
        );
    } else {
        $('.fm-chat-message .chat-message-txt span', $message).html(
            htmlentities(message.getContents()).replace(/\n/gi, "<br/>").replace(/\s/gi, "&nbsp;")
        );
    }



    var event = new $.Event("onBeforeRenderMessage");
    self.megaChat.trigger(event, {
        message: message,
        $message: $message,
        room: self
    });

    if ($('.fm-chat-message .chat-message-txt span', $message).text().length === 0 && (!message.meta || !message.meta.attachments)) {
        self.logger.warn("Message was empty: ", message, $message);
        return false;
    }
    if (event.isPropagationStopped()) {
        self.logger.warn("Event propagation stopped receiving (rendering) of message: ", message);
        return false;
    }
    return self.appendDomMessage($message, message);
};


/**
 * Will refresh the room's chat messages scroll pane
 */
ChatRoom.prototype.refreshScrollUI = function() {
    var self = this;
    var $jsp = self.$messages.data('jsp');

    assert($jsp, "JSP not available.");
    $jsp.reinitialise();
};

/**
 * Should be used to append messages in the message pane
 *
 * @param $message {*|jQuery} jQuery object containing the DOM Element that should be appended to the messages pane
 * @param messageObject {(KarereEventObjects.IncomingMessage|KarereEventObjects.OutgoingMessage)} contains message data
 */
ChatRoom.prototype.appendDomMessage = function($message, messageObject) {
    var self = this;

    var $jsp = self.$messages.data('jsp');

    assert($jsp, "JSP not available.");

    var $before = null;
    var $after = null;

    if (!messageObject) {
        messageObject = {};
    }

    var timestamp = unixtime();

    if (messageObject.getDelay) {
        timestamp = messageObject.getDelay();
    }


    $message.attr('data-timestamp', timestamp);

    $('.jspContainer > .jspPane > .fm-chat-message-pad > .fm-chat-message-container', self.$messages).each(function() {
        if (timestamp >= $(this).attr('data-timestamp')) {
            $after = $(this);
        } else if ($before === null && timestamp < $(this).attr('data-timestamp')) {
            $before = $(this);
        }
    });

    if (!$after && !$before) {
//        self.logger.error("append: ", $message);
        $('.jspContainer > .jspPane > .fm-chat-message-pad', self.$messages)
            .append($message);
    } else if ($before) {
//        self.logger.error("before: ", $message, $before.text());
        $message.insertBefore($before);
    }  else if ($after) {
//        self.logger.error("after: ", $message, $after.text());
        $message.insertAfter($after);
    }

    self._regroupMessages();


    self.resized();

    // update unread messages count
    if (self.megaChat.plugins.chatNotifications) {
        if (self.roomJid != self.megaChat.getCurrentRoomJid() && $message.is('.unread')) {
            var $navElement = self.getNavElement();
            var $count = $('.nw-conversations-unread', $navElement);

            var count = self.megaChat.plugins.chatNotifications.notifications.getCounterGroup(self.roomJid);

            if (count > 0) {
                $navElement.addClass("unread");
            }

            self.renderContactTree();
        }
    }

    $(messageObject).bind("onStateChange", function(e, msgObj, oldVal, newVal) {
        self._renderMessageState($message, msgObj)
    });

    self._renderMessageState($message, messageObject);

    self.refreshScrollUI();
    $jsp.scrollToBottom();

    self.trigger('onAfterRenderMessage', [$message, messageObject]);

    if (messageObject.getSeen && messageObject.getSeen() === false) { // mark as seen
        messageObject.setSeen(true);
    }

    if ($message.is('.unread')) {
        self.trigger('activity');
    }

    self.megaChat.renderContactTree();

};


ChatRoom.prototype._renderMessageState = function($message, messageObject) {
    var self = this;


    $message.removeClass("msg-state-sent msg-state-not-sent msg-state-delivered");

    if (!(messageObject instanceof KarereEventObjects.OutgoingMessage)) {
        return;
    }

    if (messageObject.getState() === KarereEventObjects.OutgoingMessage.STATE.SENT) {
        $message.addClass("msg-state-sent");

        if ($('.label.not-sent', $message).length > 0) {
            $('.label.not-sent', $message).fadeOut(function() { $(this).remove(); });
        }
    } else if (messageObject.getState() === KarereEventObjects.OutgoingMessage.STATE.NOT_SENT) {
        $message.addClass("msg-state-not-sent");

        if ($('.label.not-sent.text-message', $message).length === 0) {
            var $elem = $('<span class="label not-sent text-message">not sent</span>');
            $elem.hide();
            $('.chat-username', $message).after($elem);
            $elem.fadeIn();
        }
        if ($('.label.not-sent.delete-button', $message).length === 0) {
            var $elem = $('<a href="javascript:;" class="label not-sent delete-button">delete</a>');
            $elem.hide();
            $('.chat-username', $message).after($elem);
            $elem.fadeIn();
        }
    } else if (messageObject.getState() === KarereEventObjects.OutgoingMessage.STATE.DELIVERED) {
        $message.addClass("msg-state-delivered");

        if ($('.label.not-sent', $message).length > 0) {
            $('.label.not-sent', $message).fadeOut(function() { $(this).remove(); });
        }
    } else {
        $message.addClass("msg-state-unknown");

        if ($('.label.not-sent', $message).length > 0) {
            $('.label.not-sent', $message).fadeOut(function() { $(this).remove(); });
        }
    }





    self.refreshUI();
};

/**
 * Should take care of messages grouping (UI)
 *
 * @private
 */
ChatRoom.prototype._regroupMessages = function() {
    var self = this;
    var $messages = self.$messages;
    // group messages by hidding the author's name
    $('.fm-chat-message-container', $messages).each(function() {
        var $message = $(this);

        var author = $message.data("from");

        var $prevMessage = $message.prevAll('.fm-chat-message-container');
        if (author && $prevMessage.is(".fm-chat-message-container")) {
            if ($prevMessage.data("from") === author) {
                $message.addClass('grouped-message');
            } else {
                $message.removeClass('grouped-message');
            }
        }

    });

}

/**
 * Generates a DOM Element containing the required UI elements for an inline dialog (buttons, text message, icon, etc)
 *
 * @param type {string} used internally, if late access to the DOM element of the dialog is required (e.g. to remove it)
 * @param [user] {undefined|null|string} can be used to pass jid (full or bare jid) so that the .generateInlineDialog will add avatars to the actual message
 * @param iconCssClass {Array} css classes to be added to the .chat-notification element
 * @param messageContents {string} text that will be used as message content
 * @param cssClasses {Array} array of css class names to be added to the heading (used to append icons with css)
 * @param [buttons] {Array} Array of objects in the format of {type: "primary|seconday", text: "button 1", callback: fn(e)}
 * @param [read] {boolean} set to `true` if you want to mark only this message/dialog as ready (e.g. ignore the unread UI logic)
 * @returns {jQuery|HTMLElement}
 */
ChatRoom.prototype.generateInlineDialog = function(type, user, iconCssClasses, messageContents, cssClasses, buttons, read) {
    cssClasses = cssClasses || [];

    var self = this;

    var $inlineDialog = self.megaChat.$inline_dialog_tpl.clone();
    $inlineDialog.attr('data-id', "idlg-" + rand(10000) + unixtime());

    if (!read && !self.isActive()) {
        $inlineDialog.addClass('unread');
    }

    $inlineDialog.data('dialog-meta', {
        'type': type,
        'user': user,
        'iconCssClasses': iconCssClasses,
        'messageContents': messageContents,
        'cssClasses': cssClasses,
        'buttons': buttons,
        'read': !$inlineDialog.is(".unread")
    });

    if (user) {
        var $element = self._generateContactAvatarElement(user)
        $('.nw-contact-avatar', $inlineDialog).replaceWith($element);
    } else {
        $('.nw-contact-avatar', $inlineDialog).remove();
    }
    $inlineDialog.addClass(type + ' ' + iconCssClasses);

    if ($.isArray(iconCssClasses)) {
        $.each(iconCssClasses, function(k, v) {
            $('.chat-notification', $inlineDialog).addClass(v);
        });
    } else if (iconCssClasses) {
        // is string
        $('.chat-notification', $inlineDialog).addClass(iconCssClasses);
    }

    $.each(cssClasses, function(k, v) {
        $inlineDialog.addClass(v);
    });

    $('.chat-message-txt', $inlineDialog).text(messageContents ? messageContents : "");

    var $pad = $('.fm-chat-messages-pad', $inlineDialog);

    var timestamp = unixtime();

    $pad.parent().attr('data-timestamp', timestamp);
    $pad.parent().addClass("fm-chat-message-container");

    $('.chat-message-date', $inlineDialog).text(
        unixtimeToTimeString(timestamp) //time2last is a too bad performance idea.
    );

    var $primaryButton = $('.primary-button', $inlineDialog).detach();
    var $secondaryButton = $('.secondary-button', $inlineDialog).detach();

    if (buttons) {
        $.each(buttons, function(k, v) {
            var $button = v.type === "primary" ? $primaryButton.clone() : $secondaryButton.clone();
            $button.addClass('fm-chat-inline-dialog-button-' + k);
            $button.find('span').text(v.text);
            $button.bind('click', function(e) {
                v.callback(e);
            });

            $('.chat-message-txt', $inlineDialog).append($button);
        });
    }

    return $inlineDialog;
};

/**
 * Simple getter to get an inline dialog by `type` from the current message pane
 *
 * @param type {string} whatever type you'd used before when calling `.generateInlineDialog`
 * @returns {*|jQuery|HTMLElement}
 */
ChatRoom.prototype.getInlineDialogInstance = function(type) {
    var self = this;

    return $('.inline-dialog.' + type, self.$messages);
};


/**
 * Request a messages sync for this room
 *
 * Note: This is a recursion-like function, which uses the `exceptFromUsers` argument to mark which users had failed to
 * respond with a message sync response.
 *
 * Second note: this function will halt if a request was already executed successfuly. (see this._syncDone)
 *
 * @param exceptFromUsers {Array} Array of FULL JIDs which should be skipped when asking for messages sync (e.g. they
 * had timed out in the past)
 */
ChatRoom.prototype.requestMessageSync = function(exceptFromUsers) {
    var self = this;
    var megaChat = self.megaChat;
    var karere = megaChat.karere;

    self.logger.debug("will eventually sync:", self)

    // sync only once
    if (self._syncDone === true) {
        return;
    }
    self._syncDone = true;

    self.logger.debug("sync started:", self)

    exceptFromUsers = exceptFromUsers || [];

    var users = karere.getUsersInChat(self.roomJid);

    // Pick from which user should i ask for sync.

    if (Object.keys(users).length === 1) {
        // empty room
        self.logger.debug("Will not sync room: ", self.roomJid, ", because its empty (no participants).");
        return false;
    }

    var ownUsers = [];
    $.each(users, function(k, v) {
        if (k === karere.getJid()) {
            return; // continue;
        } else if (exceptFromUsers.indexOf(k) != -1) {
            return; //continue
        } else { // only from mine users: if (k.split("/")[0] === karere.getBareJid())
            if (k.split("/")[0] === karere.getBareJid()) {
                ownUsers.push(k);
            }
        }
    });

    if (ownUsers.length === 0) {
        self.logger.warn("No users to sync messages from for room: ", self.roomJid, "except list:", exceptFromUsers);
        return false;
    }
    var userNum = Math.floor(Math.random() * ownUsers.length) + 0;
    var userJid = ownUsers[userNum];

    self.logger.debug("Potential message sync users: ", ownUsers);


    var messageId = karere.sendAction(
        userJid,
        'sync',
        {
            'roomJid': self.roomJid
        }
    );

    if (!self._syncRequests) {
        self._syncRequests = {};
    }

    self._syncRequests[messageId] = {
        'messageId': messageId,
        'userJid': userJid,
        'timeoutHandler': function() {
            self.logger.warn(new Date(), "Sync request timed out from user: ", userJid, " for room: ", self.roomJid);

            delete self._syncRequests[messageId];
            exceptFromUsers.push(userJid);
            self.requestMessageSync(exceptFromUsers);
        },
        'timer': setTimeout(function() {
            // timed out
            self.logger.warn("Timeout waiting for", userJid, "to send sync message action. Will eventually, retry with some of the other users.");

            self._syncRequests[messageId].timeoutHandler();
        }, self.options.requestMessagesSyncTimeout)
    };
    self.logger.warn(new Date(), "Sent a sync request to user: ", userJid, " for room: ", self.roomJid);

    return true;
};

/**
 * Send messages sync response
 *
 * @param request {KarereEventObjects.ActionMessage} with the `meta` from the actual request XMPP message
 * @returns {boolean}
 */
ChatRoom.prototype.sendMessagesSyncResponse = function(request) {
    var self = this;
    var megaChat = self.megaChat;
    var karere = megaChat.karere;

    if (!karere.getUsersInChat(self.roomJid)[request.getFromJid()]) {
        self.logger.error("Will not send message sync response to user who is not currently in the chat room for which he requested the sync.")
        return false;
    }

    // Send messages as chunks (easier XML parsing?)

    var messagesCount = self.messages.length;
    var messagesChunkSize = 10;
    for(var i = 0; i < messagesCount; i+=messagesChunkSize) {
        var messages = self.messages.slice(i, i + messagesChunkSize);

        // remove Non-Plain Objects from messages
        $.each(messages, function(k, v) {
            $.each(v, function(prop, val) {
                if (typeof(val) === "object" && !$.isPlainObject(val)) {
                    delete messages[k][prop];
                }
            });
        });


        // cleanup some non-needed data from the messages
        $.each(messages, function(k, v) {
            if (messages[k].messageHtml) {
                delete messages[k].messageHtml;
            }
        });

        karere.sendAction(
            request.getFromJid(),
            'syncResponse',
            {
                'inResponseTo': request.getMessageId(),
                'roomJid': request.getMeta().roomJid,
                'messages': messages,
                'offset': i,
                'chunkSize': messagesChunkSize,
                'total': messagesCount
            }
        );
    }
};

/**
 * This is a handler of message sync responses
 *
 * @param response {KarereEventObjects.ActionMessage} with the `meta` of the message sync response
 * @returns {boolean}
 */
ChatRoom.prototype.handleSyncResponse = function(response) {
    var self = this;
    var megaChat = self.megaChat;
    var karere = megaChat.karere;

    var meta = response.getMeta();

    if (!karere.getUsersInChat(self.roomJid)[response.getFromJid()]) {
        self.logger.error("Will not accept message sync response from user who is currently not in the chat room for which I'd requested the sync.")
        return false;
    }
    if (self._syncRequests) {
        if (!self._syncRequests[meta.inResponseTo]) {
            self.logger.error(
                "Will not accept message sync response because inResponseTo, did not matched any cached messageIDs, " +
                "got: ", meta.inResponseTo, ". Most likely they had sent the response too late. Requests " +
                "currently active:", JSON.stringify(self._syncRequests)
            );
            return false;
        }
        clearTimeout(self._syncRequests[meta.inResponseTo].timer);
    } else {
        self.logger.error("Invalid sync response, room not found:", response);

        return false;
    }

    // cleanup
    $.each(self._syncRequests, function(messageId, request) {
        clearTimeout(request.timer);
    });

    if (self._syncRequests.cleanupTimeout) {
        clearTimeout(self._syncRequests.cleanupTimeout);
    }
    self._syncRequests.cleanupTimeout = setTimeout(function() {
        delete self._syncRequests;
    }, self.options.syncRequestCleanupTimeout);

    $.each(meta.messages, function(k, msg) {
        // msg is a plain javascript object, since it passed JSON serialization, so now we will convert it to propper
        // {KarereEventObjects.IncomingMessage|KarereEventObjects.OutgoingMessage}
        var msgObject = null;


        // skip deleted messages
        if (msg.meta && msg.meta.isDeleted) {
            return;
        }

        if (Karere.getNormalizedBareJid(msg.fromJid) === self.megaChat.karere.getBareJid()) {
            // Outgoing
            //toJid, fromJid, type, messageId, contents, meta, delay, state
            msgObject = new KarereEventObjects.OutgoingMessage(
                msg.toJid,
                msg.fromJid,
                msg.type,
                msg.messageId,
                msg.contents,
                msg.meta,
                msg.delay,
                msg.state,
                msg.roomJid
            )
        } else {
            // Incoming
            // toJid, fromJid, type, rawType, messageId, rawMessage, roomJid, meta, contents, elements, delay
            msgObject = new KarereEventObjects.IncomingMessage(
                msg.toJid,
                msg.fromJid,
                msg.type,
                msg.rawType,
                msg.messageId,
                undefined,
                self.roomJid,
                msg.meta,
                msg.contents,
                undefined,
                msg.delay
            )
        }

        self.appendMessage(msgObject);
    });

    if ((meta.chunkSize + meta.offset) >= meta.total) {
        self.logger.warn("finished sync from: ", response.getFromJid(), self.roomJid, meta.total);
    } else {
        self.logger.debug("waiting for more messages from sync: ", meta.total - (meta.chunkSize + meta.offset));
    }

};

/**
 * Returns the actual DOM Element from the Mega's main navigation (tree) that is related to this chat room.
 *
 * @returns {*|jQuery|HTMLElement}
 */
ChatRoom.prototype.getNavElement = function() {
    var self = this;

    if (self.type === "private") {
        return $('.nw-conversations-item[data-room-jid="' + self.roomJid.split("@")[0] + '"]');
    } else {
        throw new Error("Not implemented.");
    }
};


/**
 * Will check if any of the plugins requires a message to be 'queued' instead of sent.
 *
 * @param [message] {Object} optional message object (currently not used)
 * @returns {boolean}
 */
ChatRoom.prototype.arePluginsForcingMessageQueue = function(message) {
    var self = this;
    var pluginsForceQueue = false;

    $.each(self.megaChat.plugins, function(k) {
        if (self.megaChat.plugins[k].shouldQueueMessage) {
            if (self.megaChat.plugins[k].shouldQueueMessage(self, message) === true) {
                pluginsForceQueue = true;
                return false; // break
            }
        }
    });

    return pluginsForceQueue;
};

/**
 * Send message to this room
 *
 * @param message {String}
 * @param [meta] {Object}
 */
ChatRoom.prototype.sendMessage = function(message, meta) {
    var self = this;
    var megaChat = this.megaChat;
    meta = meta || {};

    if (self._conv_ended === true) {
        self._restartConversation();
    }
    var messageId = megaChat.karere.generateMessageId(self.roomJid, JSON.stringify([message, meta]));
    var eventObject = new KarereEventObjects.OutgoingMessage(
        self.roomJid,
        megaChat.karere.getJid(),
        "groupchat",
        messageId,
        message,
        meta,
        unixtime(),
        KarereEventObjects.OutgoingMessage.STATE.NOT_SENT,
        self.roomJid
    );


    if (
        megaChat.karere.getConnectionState() !== Karere.CONNECTION_STATE.CONNECTED ||
        self.arePluginsForcingMessageQueue(message) ||
        (self.state != ChatRoom.STATE.READY && message.indexOf("?mpENC:") !== 0)
    ) {

        var event = new $.Event("onQueueMessage");

        self.megaChat.trigger(event, [
            eventObject,
            self
        ]);

        if (event.isPropagationStopped()) {
            return false;
        }

        self.logger.debug("Queueing: ", eventObject);


        self._messagesQueue.push(eventObject);

        self.appendMessage(eventObject);
    } else {
        self.appendMessage(eventObject);
        self._sendMessageToXmpp(eventObject);
    }
};

/**
 * This method will:
 * - eventually (if the user is connected) try to send this message to the xmpp server
 * - mark the message as sent or unsent (if the user is not connected)
 *
 * @param messageObject {KarereEventObjects.OutgoingMessage}
 */
ChatRoom.prototype._sendMessageToXmpp = function(messageObject) {
    var self = this;
    var megaChat = this.megaChat;

    var messageContents = messageObject.getContents() ? messageObject.getContents() : "";

    var messageMeta = messageObject.getMeta() ? messageObject.getMeta() : {};
    if (messageMeta.isDeleted && messageMeta.isDeleted === true) {
        return false;
    }
    if (
        megaChat.karere.getConnectionState() !== Karere.CONNECTION_STATE.CONNECTED ||
        self.arePluginsForcingMessageQueue(messageObject) ||
        (self.state != ChatRoom.STATE.READY && messageContents.indexOf("?mpENC:") !== 0)
    ) {
        messageObject.setState(KarereEventObjects.OutgoingMessage.STATE.NOT_SENT);

        return false;
    } else {
        messageObject.setState(KarereEventObjects.OutgoingMessage.STATE.SENT);

        return megaChat.karere.sendRawMessage(self.roomJid, "groupchat", messageObject.getContents(), messageObject.getMeta(), messageObject.getMessageId(), messageObject.getDelay());
    }
};

/**

 /**
 * Alias for sendAction, which will queue the action in case the room/enc is not ready.
 *
 * @param message
 * @param meta
 */
ChatRoom.prototype.sendAction = function(action, message, meta) {
    var self = this;
    meta.action = action;

    self.sendMessage(message, meta);
};

/**
 * Helper for accessing options.mediaOptions;
 *
 * @returns {*}
 */
ChatRoom.prototype.getMediaOptions = function() {
    return this.callSession ? this.callSession.getMediaOptions : {};
};

/**
 * Internal method to notify the server that the specified `nodeids` are sent/shared to `users`
 * @param nodeids
 * @param users
 * @private
 */
ChatRoom.prototype._sendNodes = function(nodeids, users) {
    var json = [], apinodes=[];

    var $promise = new $.Deferred();

    for (var i in nodeids)
    {
        var n = M.d[nodeids[i]];
        if (n)
        {
            if (n.t)
            {
                var subnodes = fm_getnodes(nodeids[i]);
                for (var j in subnodes)
                {
                    var n2 = M.d[subnodes[j]];
                    // subnodes retain their parent nodeid to retain the same folder structure
                    if (n2) json.push(M.cloneChatNode(n2,true));
                }
            }
            // root nodes do not retain their parent nodeid, because they become "root nodes" in the chat - access will be granted to these nodes and subnode access can be determined based on parent node access rights

            json.push(M.cloneChatNode(n));
            apinodes.push(n.h);
        }
    }


    // TODO: implement API call to grant access to the root nodes, pass following data in API call:
    // - apinodes
    // - users
    // for now simulate a random API call:

    this.logger.debug("sendNodes: ", apinodes, apinodes);

    api_req({a:'uq'},
        {
            callback2: function() {
                $promise.resolve(toArray(arguments));
            },
            failhandler: function() {
                $promise.reject(toArray(arguments));
            },
            json: json,
            callback: function(res,ctx)
            {
                // check if result is all positive  (should be) and fire off callback:
                if (ctx.callback2) ctx.callback2(ctx.json);
            }
        });

    return $promise;
};



/**
 * Attach/share (send as message) file/folder nodes to the chat
 * @param ids
 * @param [message]
 */
ChatRoom.prototype.attachNodes = function(ids, message) {
    var self = this;
    message = message || "";

    return MegaPromise.reject(false); // TODO: This is temp disabled, until we get the API to support it.

    if (!ids || ids.length === 0) {
        return;
    }

    loadingDialog.show();

    var users = [];

    $.each(self.getParticipants(), function(k, v) {
        var contact = self.megaChat.getContactFromJid(v);
        if (contact && contact.u) {
            users.push(
                contact.u
            );
        }
    });

    var $masterPromise = new $.Deferred();

    self._sendNodes(
        ids,
        users
    )
        .done(function(responses) {

            var attachments = {};
            $.each(ids, function(k, nodeId) {
                var node = M.d[nodeId];

                if (node) {
                    attachments[nodeId] = {
                        'name': node.name,
                        'h': nodeId,
                        's': node.s,
                        't': node.t,
                        'sharedWith': users
                    };
                } else {
                    self.logger.warn("Node not accessible, so can't be shared: ", nodeId);
                }
            });
            if (Object.keys(attachments).length > 0) {
                var messageId = self.sendMessage(message, {
                    'attachments': attachments
                });
            }
            $masterPromise.resolve(
                messageId,
                attachments,
                message
            );
        })
        .fail(function(r) {
            $masterPromise.reject(r);
        })
        .always(function() {
            loadingDialog.hide();
        });

    return $masterPromise;
};

/**
 * Get message by Id
 * @param messageId {string} message id
 * @returns {boolean}
 */
ChatRoom.prototype.getMessageById = function(messageId) {
    var self = this;
    var found = false;
    $.each(self.messages, function(k, v) {
        if (v.messageId === messageId) {
            found = v;
            return false; //break;
        }
    });

    return found;
};

/**
 * Used to update the DOM element containing data about this room.
 * E.g. unread count
 */
ChatRoom.prototype.renderContactTree = function() {
    var self = this;

    var $navElement = self.getNavElement();

    var $count = $('.nw-conversations-unread', $navElement);

    if (self.megaChat.plugins.chatNotifications) {
        var count = self.megaChat.plugins.chatNotifications.notifications.getCounterGroup(self.roomJid);

        if (count > 0) {
            $count.text(count);
            $navElement.addClass("unread");
        } else if (count === 0) {
            $count.text("");
            $navElement.removeClass("unread");
        }
    }

    $navElement.data('chatroom', self);
};

/**
 * Re-join - safely join a room after connection error/interruption
 */
ChatRoom.prototype.recover = function() {
    var self = this;

    self.logger.warn('recovering room: ', self.roomJid, self);

    self._syncRequests = [];
    self.callSession = null;
    self.setState(ChatRoom.STATE.JOINING, true);
    var $startChatPromise = self.megaChat.karere.startChat([], self.type, self.roomJid.split("@")[0], (self.type === "private" ? false : undefined));

    self.megaChat.trigger("onRoomCreated", [self]); // re-initialise plugins

    return $startChatPromise;
};

/**
 * Handle UI resize (triggered by the window, document or manually from our code)
 */
ChatRoom.prototype.resized = function(scrollToBottom) {
    var self = this;

    // Important. Please insure we have correct height detection for Chat messages block. We need to check ".fm-chat-input-scroll" instead of ".fm-chat-line-block" height
    var scrollBlockHeight = $('.fm-chat-block').outerHeight() - $('.fm-chat-line-block').outerHeight() - self.$header.outerHeight() + 2;

    if (scrollBlockHeight != self.$messages.outerHeight())
    {
        self.$messages.height(scrollBlockHeight);

        self.refreshUI(scrollToBottom);
    } else {
        self.refreshUI();
    }
};


/**
 * This method will be called on room state change, only when the mpenc's state is === READY
 *
 * @private
 */
ChatRoom.prototype._flushMessagesQueue = function() {
    var self = this;

    self.logger.debug("Chat room state set to ready, will flush queue: ", self._messagesQueue);

    if (self._messagesQueue.length > 0) {
        $.each(self._messagesQueue, function(k, v) {
            if (!v) {
                return; //continue;
            }

            self._sendMessageToXmpp(v);
        });
        self._messagesQueue = [];

        self.megaChat.trigger('onMessageQueueFlushed', self);
    }

    self.requestMessageSync();
};

ChatRoom.prototype._generateContactAvatarElement = function(fullJid) {
    var self = this;

    var contact = self.megaChat.getContactFromJid(fullJid);

    if (!contact) {
        self.logger.error('contact not found: ' + fullJid);

        return;
    }


    var $av = $(useravatar.contact(contact.u))
    var cls = $av.attr('class');
    $av.attr('class', '');

    var $element = $('<div class="nw-contact-avatar"></div>').append(
        $av
    );
    $element.addClass(cls);
    $element.addClass(contact.u);


    // TODO: implement verification logic
    if (contact.verified) {
        $element.addClass('verified');
    }

    return $element;
};

ChatRoom.prototype._waitingForOtherParticipants = function() {
    var self = this;

    var otherUsersInRoom = false;

    Object.keys(self.getUsers()).forEach(function(v, k) {
        if (v.indexOf(self.megaChat.karere.getBareJid()) === -1) {
            otherUsersInRoom = true;
            return false; // break
        }
    });
    return !otherUsersInRoom;
};

ChatRoom.prototype._restartConversation = function() {
    var self = this;

    if (self._conv_ended === true) {
        self._conv_ended = self._leaving = false;

        self.setState(
            self._waitingForOtherParticipants() ? ChatRoom.STATE.WAITING_FOR_PARTICIPANTS : ChatRoom.STATE.PARTICIPANTS_HAD_JOINED
        );

        self.trigger('onConversationStarted');
    }


    self.getParticipantsExceptMe().forEach(function(v) {

        self.megaChat.karere.addUserToChat(self.roomJid, Karere.getNormalizedBareJid(v), undefined, self.type, {
            'ctime': self.ctime,
            'invitationType': 'resume',
            'participants': self.users,
            'users': self.megaChat.karere.getUsersInChat(self.roomJid)
        });
    });

    if (self.megaChat.plugins.encryptionFilter) {
        self.megaChat.plugins.encryptionFilter._reinitialiseEncryptionOpQueue(self);
    }

    self.megaChat.sendBroadcastAction("conv-start", {roomJid: self.roomJid, type: self.type, participants: self.getParticipants()});
};

ChatRoom.prototype._conversationEnded = function(userFullJid) {
    var self = this;

    if (self && self._leaving !== true) {
        if (self.callSession) {
            if (self.callSession.isStarted() || self.callSession.isStarting()) {
                self.callSession.endCall();
            }
        }

        self._conv_ended = true;

        self.setState(ChatRoom.STATE.WAITING_FOR_PARTICIPANTS);

        // force trigger event
        self.trigger('onStateChange', [ChatRoom.STATE.WAITING_FOR_PARTICIPANTS, ChatRoom.STATE.WAITING_FOR_PARTICIPANTS]);

        [self.$header, self.$messages].forEach(function(k, v) {
            $(k).addClass("conv-end")
                .removeClass("conv-start");
        });


        $('.fm-chat-file-button.fm-chat-inline-dialog-button-end-chat span', self.$messages).remove();

        self.appendDomMessage(
            self.generateInlineDialog(
                "user-left",
                userFullJid,
                "user-left",
                "Conversation ended by user: " + self.megaChat.getContactNameFromJid(userFullJid),
                [],
                {},
                !self.isActive()
            )
        );
    }
};

ChatRoom.prototype._conversationStarted = function(userBareJid) {
    var self = this;

    if (self._conv_ended) {
        if (Karere.getNormalizedBareJid(userBareJid) != self.megaChat.karere.getBareJid()) {
            // the other user had joined, mark this conv as started again.
            self._restartConversation();
        }
    } else {
        // i'd joined
        self.trigger('onConversationStarted');
    }


    self.setState(ChatRoom.STATE.PARTICIPANTS_HAD_JOINED);
};
ChatRoom.prototype.cancelAttachment = function(messageId, nodeId) {
    var self = this;

    var msg = self.getMessageById(messageId);

    if (msg && msg.meta && msg.meta.attachments && msg.meta.attachments[nodeId]) {
        var meta = clone(msg.getMeta());
        meta.attachments[nodeId].canceled = true;
        msg.setMeta(meta); // trigger change event
    }


    var $container = $('.attachments-container[data-message-id="' + messageId + '"] .nw-chat-sharing-body[data-node-id="' + nodeId + '"]', self.$messages);
    if ($container.length > 0) {
        $('.nw-chat-button:first', $container).after($('<em>Canceled</em>'));

        $('.nw-chat-button', $container).remove();
    }
};


ChatRoom.prototype.startAudioCall = function() {
    var self = this;
    return self.megaChat.plugins.callManager.startCall(self, {audio: true, video:false});
};

ChatRoom.prototype.startVideoCall = function() {
    var self = this;
    return self.megaChat.plugins.callManager.startCall(self, {audio: true, video: true});
};
