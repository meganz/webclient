/**
 * How to make this work in your browser? copy/paste this in your browser console:
 * localStorage.staticpath = "http://localhost:5280/"; localStorage.dd=1; localStorage.contextmenu=1; localStorage.megachat=1; localStorage.jj=true;
 * and optionally:
 * localStorage.dxmpp = 1; localStorage.stopOnAssertFail = true; localStorage.d = 1;
 * @type {boolean}
 */
var MegaChatEnabled = false;
if (localStorage.megachat) {
    MegaChatEnabled=true;
}


var chatui;
(function() {
    chatui = function() {
        hideEmptyMsg();
        $('.fm-files-view-icon').addClass('hidden');
        $('.fm-blocks-view').addClass('hidden');
        $('.files-grid-view').addClass('hidden');
        $('.contacts-grid-view').addClass('hidden');
        $('.fm-contacts-blocks-view').addClass('hidden');

        var chatJids = M.currentdirid.replace('chat/','').split(",");
        $.each(chatJids, function(k, v) {
            chatJids[k] = megaChat.getJidFromNodeId(v);
        });

        var $promise;

        if(localStorage.megaChatPresence != "unavailable") {
            if(megaChat.karere.getConnectionState() != Karere.CONNECTION_STATE.CONNECTED) {
                megaChat.connect()
                    .done(function() {
                        chatJids.push(megaChat.karere.getBareJid());

                        $promise = megaChat.openChat(chatJids, chatJids.length == 2 ? "private" : "group");
                    });
            } else {
                chatJids.push(megaChat.karere.getBareJid());

                $promise = megaChat.openChat(chatJids, chatJids.length == 2 ? "private" : "group");
            }
        } else {
            alert("You are currently offline. To chat, you need to change your state back to online, away or busy.");
            // TODO: Better error message?
        }



        $('.fm-chat-block').removeClass('hidden');

        $('.message-textarea').unbind('keyup.autoresize');
        $('.message-textarea').bind('keyup.autoresize',function() {
            $(this).height('auto');
            var text = $(this).val();
            var lines = text.split("\n");
            var count = lines.length;

            if ($(this).val().length !== 0 && count>1) {
                $(this).height($(this).prop("scrollHeight"));
                var scrollBlockHeight = $('.fm-chat-block').outerHeight() - $('.fm-chat-line-block').outerHeight() - 80;
                if (scrollBlockHeight != $('.fm-chat-message-scroll').outerHeight())
                {
                    $('.fm-chat-message-scroll').height(scrollBlockHeight);
                    megaChat.resized();
                }

                // If any popup is opened - moving with buttons
                if ($('.fm-chat-emotions-icon').attr('class').indexOf('active') > -1)
                {
                    var positionY = $('.fm-chat-line-block').outerHeight() - $('.fm-chat-emotion-arrow').position().top;
                    $('.fm-chat-emotion-popup').css('bottom', positionY - 17 + 'px');
                }
                if ($('.fm-chat-attach-file').attr('class').indexOf('active') > -1)
                {
                    var positionY = $('.fm-chat-line-block').outerHeight() - $('.fm-chat-attach-arrow').position().top;
                    $('.fm-chat-attach-popup').css('bottom', positionY - 17 + 'px');
                }
            }
            else $(this).height('27px');
        });

        $('.fm-chat-emotions-icon').unbind('click');
        $('.fm-chat-emotions-icon').bind('click', function()
        {
            if ($(this).attr('class').indexOf('active') > -1)
            {
                $('.fm-chat-emotion-popup').addClass('hidden');
                $(this).removeClass('active');
            }
            else
            {
                $('.fm-chat-emotion-popup').removeClass('hidden');
                $(this).addClass('active');
                var positionY = $('.fm-chat-line-block').outerHeight() - $('.fm-chat-emotion-arrow').position().top;
                $('.fm-chat-emotion-popup').css('bottom', positionY - 17 + 'px');
            }
        });

        $('.fm-chat-attach-file').unbind('click');
        $('.fm-chat-attach-file').bind('click', function()
        {
            if ($(this).attr('class').indexOf('active') > -1)
            {
                $('.fm-chat-attach-popup').addClass('hidden');
                $(this).removeClass('active');
            }
            else
            {
                $('.fm-chat-attach-popup').removeClass('hidden');
                $(this).addClass('active');
                var positionY = $('.fm-chat-line-block').outerHeight() - $('.fm-chat-attach-arrow').position().top;
                $('.fm-chat-attach-popup').css('bottom', positionY - 17 + 'px');
            }
        });

        $('.fm-chat-file-button.save-button').unbind('mouseover click');
        $('.fm-chat-file-button.save-button').bind('mouseover click', function()
        {
            var chatDownloadPopup = $('.fm-chat-download-popup');
            var p = $(this);
            var positionY = $(this).closest('.jspPane').outerHeight() - $(this).position().top;
            var positionX = $(this).position().left;
            if (positionY - 174 > 0)
            {
                $(chatDownloadPopup).css('bottom', positionY - 174 + 'px');
                $(chatDownloadPopup).removeClass('top');
            }
            else
            {
                $(chatDownloadPopup).css('bottom', positionY + 'px');
                $(chatDownloadPopup).addClass('top');
            }
            $(chatDownloadPopup).css('left', positionX + $(this).outerWidth()/2 + 10 + 'px');
            $(this).addClass('active');
            (chatDownloadPopup).removeClass('hidden');
        });


        $('.fm-chat-message-scroll').unbind('click');
        $('.fm-chat-message-scroll').bind('click', function()
        {
            $('.fm-chat-download-popup').addClass('hidden');
        });

        $('.fm-add-user').unbind('click');
        $('.fm-add-user').bind('click', function()
        {
            var positionX = $(this).position().left;
            var addUserPopup = $('.fm-add-contact-popup');
            if ($(this).attr('class').indexOf('active') > -1)
            {
                $(addUserPopup).addClass('hidden');
                $(this).removeClass('active');
            }
            else
            {
                $(addUserPopup).removeClass('hidden');
                $(this).addClass('active');
                $(addUserPopup).css('left', positionX -8 + 'px');
            }
        });



        var typingTimeout = null;
        var stoppedTyping = function() {
            if(typingTimeout) {
                clearTimeout(typingTimeout);

                var room = megaChat.getCurrentRoom();
                if(room && room.state == MegaChatRoom.STATE.READY) {
                    megaChat.karere.sendComposingPaused(megaChat.getCurrentRoomJid());
                }
                typingTimeout = null;
            }
        };

        $('.message-textarea').unbind('keyup.send');
        $('.message-textarea').bind('keyup.send', function(e) {
            if($(this).val().length > 0) {
                if(!typingTimeout) {
                    var room = megaChat.getCurrentRoom();
                    if(room && room.state == MegaChatRoom.STATE.READY) {
                        megaChat.karere.sendIsComposing(megaChat.getCurrentRoomJid());
                    }
                } else if(typingTimeout) {
                    clearTimeout(typingTimeout);
                }

                typingTimeout = setTimeout(function() {
                    stoppedTyping();
                }, 2000);
            } else if($(this).val().length === 0) {
                stoppedTyping();
            }
        });
        $('.message-textarea').unbind('keydown.send');
        $('.message-textarea').bind('keydown.send',function(e) {
            var key = e.keyCode || e.which;


            if(key == 13 && e.shiftKey === true) {
                var msg = $(this).val();
                if(msg.trim().length > 0) {
                    megaChat.sendMessage(
                        megaChat.getCurrentRoomJid(),
                        msg
                    );
                    $(this).val('');
                    stoppedTyping();
                    return false;
                }
            }
        });
        $('.message-textarea').unbind('blur.stoppedcomposing');
        $('.message-textarea').bind('blur.stoppedcomposing',function(e) {
            stoppedTyping();
        });
    }
})();



var megaChatInstanceId = 0;

/**
 * MegaChat - UI component that links XMPP/Strophejs (via Karere) w/ the Mega's UI
 *
 * @returns {MegaChat}
 * @constructor
 */
var MegaChat = function() {
    var self = this;


    this.is_initialized = false;

    this.chats = {};
    this.currentlyOpenedChat = null;
    this._myPresence = localStorage.megaChatPresence;

    this.options = {
        'delaySendMessageIfRoomNotAvailableTimeout': 3000
    };

    this.instanceId = megaChatInstanceId++;


    this.karere = new Karere({
        'clientName': 'mc'
    });

    // Karere Events
    this.karere.bind("onPresence", function(e, eventData) {
        if(eventData.error) {
            return;
        }

        if(eventData.show != "unavailable") {
            if(eventData.myOwn === false) {
                var baseJid = eventData.from.split("/")[0];
                $.each(self.chats, function(roomJid, room) {
                    if(room.isTemporary) {
                        return; // continue
                    }

                    if(room.participantExistsInRoom(baseJid) && !self.karere.userExistsInChat(roomJid, eventData.from)) {
                        if(localStorage.d) {
                            console.debug(self.karere.getNickname(), "Auto inviting: ", eventData.from, "to: ", roomJid);
                        }

                        self.karere.addUserToChat(roomJid, eventData.from, undefined, room.type, {
                            'ctime': room.ctime,
                            'invitationType': 'resume',
                            'participants': room.users,
                            'users': self.karere.getUsersInChat(roomJid)
                        });

                        return false; // break;
                    }
                });
                // Sync presence across devices (will check the delayed val!)
                if(eventData.from.split("/")[0] == self.karere.getBareJid()) {
                    if(eventData.delay && eventData.delay >= parseFloat(localStorage.megaChatPresenceMtime) && self._myPresence != eventData.show) {
                        self._myPresence = eventData.show;
                        localStorage.megaChatPresence = eventData.show;
                        localStorage.megaChatPresenceMtime = eventData.delay;

                        self.karere.setPresence(
                          eventData.show,
                          undefined,
                          eventData.delay
                        );
                    }
                }

                // update M.u
                var contact = self.getContactFromJid(eventData.from);
                if(contact) {
                    if(!contact.presenceMtime || parseFloat(contact.presenceMtime) < eventData.delay) {
                        contact.presence = eventData.show;
                        contact.presenceMtime = eventData.delay;
                    }
                }

            }
        }
        self.renderMyStatus();
        self.renderChatStatus();

    });
    this.karere.bind("onInviteMessage", function(e, eventData) {
        if(eventData.myOwn === true) {
            return;
        }
        if(localStorage.d) {
            console.debug(self.karere.getNickname(), "Got invitation to join", eventData.room, "with eventData:", eventData);
        }


        if(eventData.meta && eventData.meta.type == "private") {

            var bareFromJid = eventData.from.split("/")[0];
            $.each(self.chats, function(roomJid, room) {
                if(roomJid == eventData.room) {
                    return; // continue
                }

                if(room.type == "private" && room.participantExistsInRoom(bareFromJid)) {
                    if(localStorage.d) {
                        console.debug(self.karere.getNickname(), "Possible invitation duplicate: ", eventData.room, roomJid, "with eventData:", eventData);
                    }

                    if(self.currentlyOpenedChat == room.roomJid) {
                        room.ctime = eventData.meta.ctime;
                        room.syncUsers(eventData.meta.participants);
                    }
                    room.setState(MegaChatRoom.STATE.JOINING);

                    self.karere.joinChat(eventData.room, eventData.password);
                    e.stopPropagation();
                    return false;
                }
            });

            if(e.isPropagationStopped()) {
                return false;
            }
        }
        if(self.chats[eventData.room]) { //already joined
            if(localStorage.d) {
                console.warn("I'm already in", eventData.room, "(ignoring invitation from: ", eventData.from, ")");
            }

            e.stopPropagation();
            return false; // stop doing anything
        }

        // if we are here..then join the room
        if(localStorage.d) {
            console.debug("Initializing UI for new room: ", eventData.room, "");
        }
        self.chats[eventData.room] = new MegaChatRoom(self, eventData.room);
        self.chats[eventData.room].setType(eventData.meta.type);
        self.chats[eventData.room].ctime = eventData.meta.ctime;
        self.chats[eventData.room].setUsers(eventData.meta.participants);

//        debugger;
        self.chats[eventData.room].setState(MegaChatRoom.STATE.JOINING);
        self.karere.joinChat(eventData.room, eventData.password);


        self.chats[eventData.room].refreshUI();

        return false; // stop propagation, we are manually handling the join on invite case
    });

    var updateMyConnectionStatus = function() {
        self.renderMyStatus();
    };

    this.karere.bind("onConnected", function() {
        if(localStorage.megaChatPresence) {
            self.karere.setPresence(localStorage.megaChatPresence, undefined, localStorage.megaChatPresenceMtime);
        }
        updateMyConnectionStatus();
    });
    this.karere.bind("onConnecting", updateMyConnectionStatus);
    this.karere.bind("onConnfail", updateMyConnectionStatus);
    this.karere.bind("onAuthfail", updateMyConnectionStatus);
    this.karere.bind("onDisconnecting", updateMyConnectionStatus);
    this.karere.bind("onDisconnected", updateMyConnectionStatus);

    this.karere.bind("onUsersJoined", function(e, eventData) {
        return self._onUsersUpdate("joined", e, eventData);
    });

    this.karere.bind("onUsersLeft", function(e, eventData) {
        return self._onUsersUpdate("left", e, eventData);
    });
    this.karere.bind("onUsersUpdatedDone", function(e, eventData) {
        if(self.chats[eventData.roomJid]) {
            self.chats[eventData.roomJid].setState(
                MegaChatRoom.STATE.JOINED
            );
        }
    });


    this.karere.bind("onChatMessage", function() {
        self._onChatMessage.apply(self, toArray(arguments));
    });

    this.karere.bind("onDelayedChatMessage", function() {
        self._onChatMessage.apply(self, toArray(arguments));
    });

    this.karere.bind("onActionMessage", function(e, eventData) {
        if(eventData.myOwn === true) {
            return;
        }

        var room;
        if(eventData.meta.action == "sync") {
            room = self.chats[eventData.meta.roomJid];
            room.sendMessagesSyncResponse(eventData);
        } else if(eventData.meta.action == "syncResponse") {
            room = self.chats[eventData.meta.roomJid];
            room.handleSyncResponse(eventData);
        }
    });


    this.karere.bind("onComposingMessage", function(e, eventData) {
        if(eventData.myOwn && eventData.isForwarded) {
            return;
        }

        var room = self.chats[eventData.roomJid];
        if(room) {
            var $element = $('.fm-chat-typing-txt', room.$messages);
            $('span', $element).text(
                self.getContactNameFromJid(eventData.from)
            );

            $element.removeClass("hidden");
        }
    });

    this.karere.bind("onPausedMessage", function(e, eventData) {
        if(eventData.myOwn && eventData.isForwarded) {
            return;
        }

        var room = self.chats[eventData.roomJid];
        if(room) {
            var $element = $('.fm-chat-typing-txt', room.$messages);
            $('span', $element).text("");
            $element.addClass("hidden");
        }
    });

    // UI events

    $(document.body).undelegate('.top-user-status-item', 'mousedown.megachat');

    $(document.body).delegate('.top-user-status-item', 'mousedown.megachat', function() {
        var presence = $(this).data("presence");
        self._myPresence = presence;

        localStorage.megaChatPresence = presence;
        localStorage.megaChatPresenceMtime = unixtime();

        if(self.karere.getConnectionState() != Karere.CONNECTION_STATE.CONNECTED && presence != Karere.PRESENCE.OFFLINE) {
            self.connect().done(function() {
                self.karere.setPresence(presence, undefined, localStorage.megaChatPresenceMtime);
            });
            return true;
        } else {
            if(presence == Karere.PRESENCE.OFFLINE) {
                self.karere.disconnect();
            } else {
                self.karere.setPresence(presence, undefined, localStorage.megaChatPresenceMtime);
            }
        }
    });

    $(window).unbind('hashchange.megaChat');
    var lastOpenedRoom = null;
    $(window).bind('hashchange.megaChat' + this.instanceId, function() {
        var room = self.getCurrentRoom();

        console.warn("Hashchange start: ", lastOpenedRoom, self.getCurrentRoomJid());
        if(room && !room.$messages.is(":visible") && room.roomJid != lastOpenedRoom) { // opened window, different then one from the chat ones
            room.hide();
            self.currentlyOpenedChat = null;
        }
        if(lastOpenedRoom && (!room || room.roomJid != lastOpenedRoom)) { // have opened a chat window before, but now
                                                                           // navigated away from it
            if(self.chats[lastOpenedRoom]) {
                self.chats[lastOpenedRoom].hide();
            }
        }

        if(room) {
            lastOpenedRoom = room.roomJid;
        } else {
            lastOpenedRoom = null;
        }

        console.warn("Hashchange end: ", lastOpenedRoom, self.getCurrentRoomJid());
    });

    return this;
};

/**
 * Initialize the MegaChat (also will connect to the XMPP)
 */
MegaChat.prototype.init = function() {
    var self = this;

    self.$container = $('.fm-chat-block');
    self.$header_tpl = $('.fm-chat-header', self.$container).clone().removeClass("template");
    self.$messages_tpl = $('.fm-chat-message-scroll', self.$container).clone().removeClass("template");

    self.$message_tpl = $('.fm-chat-messages-block.template', self.$container).clone();
    self.$message_tpl
        .removeClass("template")
        .removeClass("hidden");


    // cleanup dom nodes that were used as templates
    $('.fm-chat-header', self.$container).remove();
    $('.fm-chat-message-scroll', self.$container).remove();
    $('.fm-chat-messages-block.template', self.$container).remove();

    if(self.is_initialized) {
        self.destroy()
            .always(function() {
                self.init();
            });
    }
    self.is_initialized = true;

    $('.activity-status-block, .activity-status').show();

    if(!localStorage.megaChatPresence || localStorage.megaChatPresence != "unavailable") {
        self.connect()
            .always(function() {
                self.renderMyStatus();
            });
    } else {
        self.renderMyStatus();
    }
};

/**
 * Connect to the XMPP
 *
 * @returns {Deferred}
 */
MegaChat.prototype.connect = function() {
    var self = this;

    return self.karere.connect(
                self.getJidFromNodeId(u_handle),
                self.getMyXMPPPassword()
            )
            .done(function() {
                $('.activity-status-block .activity-status')
                    .removeClass('online')
                    .removeClass('offline')
                    .addClass('online')
            })
            .fail(function() {
                $('.activity-status-block .activity-status')
                    .removeClass('online')
                    .removeClass('offline')
                    .addClass('online')
            });
};


/**
 * Incoming chat message handler
 *
 * @param e
 * @param eventData
 * @private
 */
MegaChat.prototype._onChatMessage = function(e, eventData) {
    var self = this;

    // ignore my own forwarded messages
    if(eventData.myOwn === true && eventData.isForwarded === true) {
        return;
    }
    if(!eventData.message) {
        return;
    }

    // try first with delay -> timestamp -> currentime (if no time info is attached to the message)
    var timestamp = eventData.delay;
    if(!timestamp) {
        timestamp = eventData.timestamp;
    }
    if(!timestamp) {
        timestamp = unixtime();
    }
    var room = self.chats[eventData.roomJid];
    if(room) {
        room.appendMessage({
            from: eventData.from,
            message: eventData.message,
            timestamp: timestamp,
            meta: eventData.meta,
            id: eventData.id
        });
    } else {
        if(localStorage.d) {
            debugger;
            console.debug("Room not found: ", eventData.roomJid);
        }
    }
};


/**
 * Incoming Users Update handler
 *
 * @param type
 * @param e
 * @param eventData
 * @private
 */
MegaChat.prototype._onUsersUpdate = function(type, e, eventData) {
    var self = this;
    var updatedJids = Object.keys(eventData.currentUsers);

    var diffUsers = Object.keys(eventData[type == "joined" ? "newUsers" : "leftUsers"]);

    if(type == "joined") {
        $.each(diffUsers, function(k, v) {
            updatedJids.push(v);
        })
    } else {
        $.each(diffUsers, function(k, v) {
            var idx = $.inArray(v, updatedJids);
            delete updatedJids[idx];
        });
    }


    // i had joined
    if($.inArray(self.karere.getJid(), diffUsers) != -1) {
        if(type != "joined") {
            // i'd left, remove the room and the UI stuff
            if(self.chats[eventData.roomJid]) {
                self.chats[eventData.roomJid].destroy();
            }
        } else {

        }
    } else { //some one else had joined/left the room
        if(type != "joined") {
            //TODO: If this is a private room and the only user left count == 1, then destroy the room (an UI elements)
        }
        assert(self.chats[eventData.roomJid], "Room not found!");
        self.chats[eventData.roomJid].syncUsers(clone(updatedJids));
    }
    //TODO: group chats?
};


/**
 * Destroy this MegaChat instance (leave all rooms then disconnect)
 *
 * @returns {*}
 */
MegaChat.prototype.destroy = function() {
    var self = this;
    localStorage.megaChatPresence = Karere.PRESENCE.OFFLINE;
    localStorage.megaChatPresenceMtime = unixtime();

    $.each(self.chats, function(roomJid, room) {
        room.destroy();
        delete self.chats[roomJid];
    });

    return self.karere.disconnect()
        .done(function() {
            self.is_initialized = false;
        });
};

/**
 * Get ALL contacts from the Mega Contacts list
 *
 * @returns {Array}
 */
MegaChat.prototype.getContacts = function() {
    var results = [];
    $.each(M.u, function(k, v) {
        if(v.c == 1 || v.c == 2) {
            results.push(v);
        }
    });
    return results;
};

/**
 * Normalize Jids (e.g. conference jids -> local muc jids)
 *
 * @param jid
 * @returns {*}
 */
MegaChat.prototype.getNormalisedBareJid = function(jid) {
    if(jid.indexOf("conference.") != -1) {
        jid = jid.split("/")[1].split("__")[0] + "@" + jid.split("@")[1].split("/")[0].replace("conference.", "");
    } else {
        jid = jid.split("/")[0];
    }

    return jid;
};

/**
 * Get Contact object from the Mega's Contacts that corresponds to the given jid
 *
 * @param jid {String} full or bare jid...does not mather
 * @returns {Object|null}
 */
MegaChat.prototype.getContactFromJid = function(jid) {
    var self = this;


    assert(jid, "Missing jid");

    jid = self.getNormalisedBareJid(jid); // always convert to bare jid

    var contact = null;
    $.each(M.u, function(k, v) {
        if((v.c == 1 || v.c == 2) && self.getJidFromNodeId(k) == jid) {
            contact = v;
            return false; // break;
        }
    });
    if(!contact) {
        if(localStorage.d) {
            debugger;
        }
    }
    return contact;
};

/**
 * Get formatted contact name from Jid
 *
 * @param jid {String} full/bare jid, does not matter
 * @returns {String|undefined}
 * @throws {AssertionError}
 */
MegaChat.prototype.getContactNameFromJid = function(jid) {
    var self = this;
    var contact = self.getContactFromJid(jid);

    /* XXX: THIS WONT work in group chats, where all users are not contacts w/ each other, so we will show the jid@ part */

    var name = jid.split("@")[0];


    if(contact && contact.name) {
        name = contact.name;
    } else if(contact && contact.m) {
        name = contact.m;
    }

    assert(name, "Name not found for jid: " + jid);

    return name;
};


/**
 * Helper to convert XMPP presence from string (e.g. 'chat'), to a CSS class (e.g. will return 'online')
 *
 * @param presence {String}
 * @returns {String}
 */
MegaChat.prototype.xmppPresenceToCssClass = function(presence) {
    if(presence== Karere.PRESENCE.ONLINE || presence === true) {
        return 'online';
    } else if(presence == Karere.PRESENCE.AWAY || presence == "xa") {
        return 'away';
    } else if(presence == Karere.PRESENCE.BUSY) {
        return 'busy';
    } else if(!presence || presence == Karere.PRESENCE.OFFLINE) {
        return 'offline';
    } else {
        return 'black';
    }
};

/**
 * Used to re-render my own presence/status
 */
MegaChat.prototype.renderMyStatus = function() {
    var self = this;

    // reset
    var $status = $('.activity-status-block .activity-status');

    $status
        .removeClass('online')
        .removeClass('away')
        .removeClass('busy')
        .removeClass('offline')
        .removeClass('black');

    var presence = self.karere.getConnectionState() == Karere.CONNECTION_STATE.CONNECTED ?
                self.karere.getPresence(self.karere.getJid()) :
                localStorage.megaChatPresence;
    if(!presence && self.karere.getConnectionState() == Karere.CONNECTION_STATE.CONNECTED) {
        if(!localStorage.megaChatPresence) {
            presence = localStorage.megaChatPresence = "chat"; // default
        } else { // cached
            presence = localStorage.megaChatPresence;
        }

    }

    $('.top-user-status-popup .top-user-status-item').removeClass("active");

    var cssClass = self.xmppPresenceToCssClass(
        presence
    );

    $status.addClass(
        cssClass
    );

    if(cssClass == 'online') {
        $('.top-user-status-popup .top-user-status-item[data-presence="chat"]').addClass("active");
    } else if(cssClass == 'away') {
        $('.top-user-status-popup .top-user-status-item[data-presence="away"]').addClass("active");
    } else if(cssClass == 'busy') {
        $('.top-user-status-popup .top-user-status-item[data-presence="dnd"]').addClass("active");
    } else if(cssClass == 'offline') {
        $('.top-user-status-popup .top-user-status-item[data-presence="unavailable"]').addClass("active");
    } else {
        $('.top-user-status-popup .top-user-status-item[data-presence="unavailable"]').addClass("active");
    }
};


/**
 * Used to pre/render my contacts statuses
 */
MegaChat.prototype.renderChatStatus = function() {
    var self = this;
    $.each(self.getContacts(), function(k, contact) {
        var $element = $('#treesub_contacts #treea_' + contact.u);

        $element.removeClass("online-status");
        $element.removeClass("offline-status");
        $element.removeClass("busy-status");
        $element.removeClass("away-status");
        $element.removeClass("no-status");

        var presence = self.karere.getPresence(self.getJidFromNodeId(contact.u));

        if(!presence) {
            $element.addClass("offline-status");
        } else if(presence == Karere.PRESENCE.AWAY) {
            $element.addClass("away-status");
        } else if(presence == Karere.PRESENCE.BUSY) {
            $element.addClass("busy-status");
        } else if(presence === true || presence == Karere.PRESENCE.ONLINE) {
            $element.addClass("online-status");
        } else {
            $element.addClass("offline-status");
        }

        $element.attr("data-jid", self.getJidFromNodeId(contact.u));
    });
};


/**
 * This function is an abstract placeholder that should return JID from a nodeID (e.g. Mega User IDs)
 *
 * @param nodeId {String}
 * @returns {string}
 */
MegaChat.prototype.getJidFromNodeId = function(nodeId) {
    assert(nodeId, "Missing nodeId for getJidFromNodeId");

    // TODO: fake function that should be replaced with a real node ID -> jabber id conversion
    var hash = simpleStringHashCode(nodeId) + "";
    return "test-" + hash[hash.length - 1] + "@sandbox.developers.mega.co.nz";
};

/**
 * Placeholder function that should return my password for authenticating w/ the XMPP server
 *
 * @returns {String}
 */
MegaChat.prototype.getMyXMPPPassword = function() {
    // TODO: Replace me w/ a real function that will give us the password for logging in the jabber server
    var self = this;
    return self.getJidFromNodeId(u_handle).split("@")[0];
};


/**
 * Open (and show) a new chat
 *
 * @param jids {Array} list of bare jids
 * @param type {String} "private" or "group"
 * @returns {Deferred}
 */
MegaChat.prototype.openChat = function(jids, type) {
//    debugger;
    var self = this;
    type = type || "private";

    var $promise = new $.Deferred();

    if(type == "private") {
        var $element = $('#treesub_contacts li a[data-jid="' + jids[0] + '"]');
        var roomJid = $element.attr('data-room-jid') + "@" + self.karere.options.mucDomain;
        if(self.chats[roomJid]) {
            self.chats[roomJid].show();
            $promise.resolve(roomJid, self.chats[roomJid]);
            return $promise;
        } else {
            // open new chat
        }
    }


    var roomJid;
    if(type == "private") {
        roomJid = self.generatePrivateRoomName(jids);
    } else {
        roomJid = self._generateNewRoomIdx();
    }

    if(self.currentlyOpenedChat && self.currentlyOpenedChat != roomJid) {
        self.hideChat(self.currentlyOpenedChat);
    }


    var room = new MegaChatRoom(self, roomJid + "@" + self.karere.options.mucDomain);
    room.setType(type);
    room.setUsers(jids);
    room.ctime = unixtime();
    room.show();

    self.chats[room.roomJid] = room;

    var tmpJid = room.roomJid;

    $promise.done(function(roomJid, room) {
        assert(roomJid, "missing room jid");

        if(self.currentlyOpenedChat === tmpJid) {
            self.currentlyOpenedChat = roomJid;
            if(room) {
                room.show();
            }
        } else {
            if(room) {
                room.refreshUI();
            }
        }
    });



    var jidsWithoutMyself = clone(jids);
    jidsWithoutMyself.splice($.inArray(self.karere.getJid(), jidsWithoutMyself), 1);

    var $startChatPromise = self.karere.startChat([], type, roomJid, (type == "private" ? false : undefined));

    $startChatPromise
        .done(function(roomJid) {
//            debugger;

            $.each(jidsWithoutMyself, function(k, userJid) {

                if(self.chats[roomJid]) {
                    self.karere.addUserToChat(roomJid, userJid, undefined, type, {
                        'ctime': self.chats[roomJid].ctime,
                        'invitationType': "created",
                        'participants': jids,
                        'users': self.karere.getUsersInChat(roomJid)
                    });
                }
            });

            $promise.resolve(roomJid, self.chats[roomJid]);
        })
        .fail(function() {
            $promise.reject.apply($promise, toArray(arguments))
            if(self.chats[$startChatPromise.roomJid]) {
                self.chats[$startChatPromise.roomJid].destroy();
            }
        });




    return $promise;
};


/**
 * Used to generate unique room JID for private (1on1) chats.
 *
 * @param jids {Array} of BARE jids
 * @returns {string}
 */
MegaChat.prototype.generatePrivateRoomName = function(jids) {
    var self = this;
    var newJids = clone(jids);
    newJids.sort();
    var roomName = "prv";
    $.each(newJids, function(k, jid) {
        roomName = roomName + "_" + fastHashFunction(jid.split("@")[0]);
    });

    return roomName;
};

/**
 * Returns the currently opened room/chat
 *
 * @returns {null|undefined|Object}
 */
MegaChat.prototype.getCurrentRoom = function() {
    return this.chats[this.currentlyOpenedChat];
};

/**
 * Returns the currently opened room/chat JID
 *
 * @returns {null|String}
 */
MegaChat.prototype.getCurrentRoomJid = function() {
    return this.currentlyOpenedChat;
};


/**
 * Hide a room/chat's UI components.
 *
 * @param roomJid
 */
MegaChat.prototype.hideChat = function(roomJid) {
    var self = this;

    var room = self.chats[roomJid];
    if(room) {
        room.hide();
    } else {
        if(localStorage.d) {
            console.warn("Room not found: ", roomJid);
        }
    }
};


/**
 * Send message to a specific room
 *
 * @param roomJid
 * @param val
 */
MegaChat.prototype.sendMessage = function(roomJid, val) {
    var self = this;

    // queue if room is not ready.
    if(!self.chats[roomJid]) {
        if(localStorage.d) {
            console.warn("Queueing message for room: ", roomJid, val);
        }

        createTimeoutPromise(function() {
            return !!self.chats[roomJid]
        }, 100, self.options.delaySendMessageIfRoomNotAvailableTimeout)
            .done(function() {
                self.chats[roomJid].sendMessage(val);
            });
    } else {
        self.chats[roomJid].sendMessage(val);
    }
};


MegaChat.prototype.resized = function() {
    var $jsp = $('.fm-chat-message-scroll').data("jsp");
    if($jsp) {
        $jsp.reinitialise();
    }
}

/**
 * Class used to represent a MUC Room in which the current user is present
 *
 * @param megaChat
 * @param roomJid
 * @returns {MegaChatRoom}
 * @constructor
 */
var MegaChatRoom = function(megaChat, roomJid) {
    this.megaChat = megaChat;
    this.users = [];
    this.hash = null;
    this.roomJid = roomJid;
    this.type = null;
    this.messages = [];
    this.messagesIndex = {};
    this.isTemporary = false;
    this.options = {
        /**
         * Maximum time for waiting a message sync, before trying to send a request to someone else in the room or
         * failing the SYNC operation at all (if there are no other users to query for the sync op).
         */
        'requestMessagesSyncTimeout': 1500,

        /**
         * Send any queued messages if the room is not READY
         */
        'sendMessageQueueIfNotReadyTimeout': 3500, // XX: why is this so slow? optimise please.

        /**
         * Change the state of the room to READY in case there was no response in timely manner. (e.g. there were no
         * users who responded for a sync call).
         */
        'messageSyncFailAfterTimeout': 10000, // XX: why is this so slow? optimise please.

        /**
         * Used to cleanup the memory from sent sync requests.
         * This should be high enough, so that it will be enough for a response to be generated (message log to be
         * encrypted), send and recieved.
         */
        'syncRequestCleanupTimeout': 5000
    };
    this._syncRequests = {};
    this._messagesQueue = [];

    this.state = MegaChatRoom.STATE.INITIALIZED;

    this.$messages = megaChat.$messages_tpl.clone();
    this.$header = megaChat.$header_tpl.clone();


    this.$messages.jScrollPane

    // Events
    var self = this;
    this.bind('onStateChange', function(e, oldState, newState) {
        if(newState == MegaChatRoom.STATE.JOINED) {
            self.requestMessageSync();
            createTimeoutPromise(
                function() {
                    return self.state == MegaChatRoom.STATE.READY || self.state == MegaChatRoom.STATE.SYNCED
                },
                200,
                self.options.messageSyncFailAfterTimeout
            )
                .fail(function() {
                    if(localStorage.d) {
                        console.warn("Sync failed, setting state to READY.");
                    }
                    self.state = MegaChatRoom.STATE.READY; // its ok, if the sync failed...change the state to DONE
                })
        } else if(newState == MegaChatRoom.STATE.SYNCED) {
            // XX: we should add the encryption stuff just after state == SYNCED and before state == READY
            self.setState(MegaChatRoom.STATE.READY);
        } else if(newState == MegaChatRoom.STATE.READY) {
            if(self._messagesQueue.length > 0) {
                $.each(self._messagesQueue, function(k, v) {
                    if(!v) {
                        return; //continue;
                    }


                    //TODO: Encrypt messages
                    self.megaChat.karere.sendRawMessage(self.roomJid, "groupchat", v.message, v.meta, v.id, v.timestamp);
                });
                self._messagesQueue = [];
            }
        }
    });

    this.$header.hide();
    this.$messages.hide();

    this.megaChat.$container.append(
        this.$header
    );
    this.megaChat.$container.append(
        this.$messages
    );

    this.$messages.jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5});


    return this;
};

/**
 * Add support for .on, .bind, .unbind, etc
 */
makeObservable(MegaChatRoom);

/**
 * Room states
 * @type {{INITIALIZED: number, JOINING: number, JOINED: number, SYNCING: number, SYNCED: number, READY: number, LEAVING: number, LEFT: number}}
 */
MegaChatRoom.STATE = {
    'INITIALIZED': 5,
    'JOINING': 10,
    'JOINED': 20,

    'SYNCING': 30,
    'SYNCED': 40,

    'READY': 150,

    'LEAVING': 200,

    'LEFT': 250
};

/**
 * Convert state to text (helper function)
 *
 * @param state {Number}
 * @returns {String}
 */
MegaChatRoom.stateToText = function(state) {
    var txt = null;
    $.each(MegaChatRoom.STATE, function(k, v) {
        if(state == v) {
            txt = k;

            return false; // break
        }
    });

    return txt;
};

/**
 * Change the state of this room
 *
 * @param newState {MegaChatRoom.STATE.*}
 */
MegaChatRoom.prototype.setState = function(newState) {
    var self = this;

    assert(newState, 'Missing state');

    assert(
        newState > self.state,
        'Invalid state change. Current:' + MegaChatRoom.stateToText(self.state) +  "to" + MegaChatRoom.stateToText(newState)
    );

    var oldState = self.state;
    self.state = newState;

    self.trigger('onStateChange', [oldState, newState]);
};

/**
 * Returns current state as text
 *
 * @returns {String}
 */
MegaChatRoom.prototype.getStateAsText = function() {
    var self = this;
    return MegaChatRoom.stateToText(self.state);
};

/**
 * Change/set the type of the room
 *
 * @param type
 */
MegaChatRoom.prototype.setType = function(type) {
    var self = this;

    if(!type) {
        if(localStorage.d) {
            debugger;
        }
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
MegaChatRoom.prototype.setUsers = function(jids) {
    this.users = clone(jids);

    this.refreshUI();
};


/**
 * the same as .setUsers, w/ the difference that it will only add any of the user jids in `jids` to the `.users`,
 * instead of just overwriting the `.users` property
 *
 * @param jids {Array} List of bare jids
 */
MegaChatRoom.prototype.syncUsers = function(jids) {
    var self = this;

    assert(jids, "Missing jids");

    var users = clone(self.users);

    $.each(jids, function(k, v) {
        if(v) {
            v = v.split("/")[0];
            if(self.users.indexOf(v) == -1) {
                users.push(
                    v
                )
            }
        }
    });

    if(users.length > self.users.length) {
        self.setUsers(users);
    }
};

/**
 * Check if participant exists in room
 *
 * @param jid {String} Full OR Bare jid
 * @param strict {boolean} If true, will only check for FULL jids.
 * @returns {boolean}
 */
MegaChatRoom.prototype.participantExistsInRoom = function(jid, strict) {
    var self = this;

    strict = strict || false;

    var result = false;
    $.each(self.users, function(k, v) {
        if(!v) {
            if(localStorage.d) {
                debugger;
            }
            return;
        }
        if(strict && v == jid) {
            result = true;
            return false; // break;
        } else if(!strict && v.split("/")[0] == jid) {
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
MegaChatRoom.prototype.getParticipants = function() {
    var self = this;

    var participants = {};


    $.each(self.users, function(k, v) {
        if(!v) {
            if(localStorage.d) {
                debugger;
            }
            return;
        }
        participants[v.split("/")[0]] = true;
    });

    return Object.keys(participants);
};

/**
 * Refreshes the UI of the chat room.
 */
MegaChatRoom.prototype.refreshUI = function() {
    var self = this;

    this.$header.attr("data-room-jid", this.roomJid.split("@")[0]);

    var $jsp = self.$messages.data("jsp");
    assert($jsp, "JSP not available?!");

    $jsp.reinitialise();

    $('.fm-chat-user', this.$header).text(this.roomJid.split("@")[0]);

    if(self.type == "private") {
        $.each(self.users, function(k, v) {
            var $element = $('#treesub_contacts li a[data-jid="' + v + '"]');
            $element.attr("data-room-jid", self.roomJid.split("@")[0]);
        });
    }

    if(self.type == "private") {
        var participants = self.getParticipants();
        var myIndex = participants.indexOf(self.megaChat.karere.getBareJid());

        assert(myIndex != -1, "My jid not found in the participants list.");

        if(myIndex != -1) {
            participants.splice(myIndex, 1);
        }

        assert(participants[0], "No participants found.");

        $('.fm-chat-user', self.$header).text(
            self.megaChat.getContactNameFromJid(participants[0])
        );
        var contact = self.megaChat.getContactFromJid(participants[0]);
        var presenceCssClass = self.megaChat.xmppPresenceToCssClass(contact.presence);

        $('.fm-chat-user-status', self.$header)
            .removeClass('online')
            .removeClass('away')
            .removeClass('busy')
            .removeClass('offline')
            .removeClass('black')
            .addClass(presenceCssClass)
            .text(
                $.trim($('.top-user-status-item .activity-status.' + presenceCssClass).parent().text())
            );

        if(avatars[contact.u]) {
            $('.fm-chat-avatar > img', self.$header).attr(
                'src',
                avatars[contact.u].url
            );
        }
    } else {
        throw new Error("Not implemented"); //TODO: Groups, TBD
    }
};


/**
 * Leave this chat room
 *
 * @returns {undefined|Deferred}
 */
MegaChatRoom.prototype.leave = function() {
    var self = this;

    if(self.roomJid.indexOf("@") != -1) {
        self.setState(MegaChatRoom.STATE.LEAVING);
        return self.megaChat.karere.leaveChat(self.roomJid).done(function() {
            self.setState(MegaChatRoom.STATE.LEFT);
        });
    } else {
        self.setState(MegaChatRoom.STATE.LEFT);
    }
};

/**
 * Destroy a room (leave + UI destroy + js cleanup)
 */
MegaChatRoom.prototype.destroy = function() {
    var self = this;

    self.leave();

    self.$header.remove();
    self.$messages.remove();

    var $element = $('#treesub_contacts li a[data-room-jid="' + self.roomJid.split("@")[0] + '"]');
    $element.removeAttr("data-room-jid");

    delete self.megaChat[self.roomJid];
};


/**
 * Show UI elements of this room
 */
MegaChatRoom.prototype.show = function() {
    var self = this;


    self.$header.show();
    self.$messages.show();

    if(self.megaChat.currentlyOpenedChat && self.megaChat.currentlyOpenedChat != self.roomJid) {
        var oldRoom = self.megaChat.getCurrentRoom();
        if(oldRoom) {
            oldRoom.hide();
        }
    }
    self.megaChat.currentlyOpenedChat = self.roomJid;

    // update unread messages count
    var $navElement = self.getNavElement();
    var $count = $('.messages-icon span', $navElement);
    $count.text('');
    $count.parent().hide();

    self.refreshUI();

    var $jsp = self.$messages.data('jsp');
    var $lastMsg = $('.fm-chat-messages-block:last');
    if($jsp && $lastMsg.size() > 0) {
        $jsp.scrollToElement(
            $('.fm-chat-messages-block:last')
        );
    }
};


/**
 * Hide the UI elements of this room
 */
MegaChatRoom.prototype.hide = function() {
    var self = this;


    self.$header.hide();
    self.$messages.hide();

    if(self.megaChat.currentlyOpenedChat == self.roomJid) {
        self.megaChat.currentlyOpenedChat = null;
    }
};

/**
 * Replace one room with a new one
 *
 * @param newJid {String} Full jid of the room
 * @param users {Array} array with participants
 * @param ctime {Number} unixtimestamp when the room was created.
 */
MegaChatRoom.prototype.replaceWith = function(newJid, users, ctime) {
    var self = this;

    if(self.megaChat.currentlyOpenedChat == self.roomJid || self.$header.is(":visible")) {
        self.megaChat.currentlyOpenedChat = newJid;
    }
    var oldJid = self.roomJid;

    var oldRoom = $.extend(true, {}, self);

    self.roomJid = newJid;
    self.users = clone(users);
    self.ctime = ctime;

//    delete self.megaChat.chats[oldJid];
    self.megaChat.chats[newJid] = self;


    self.refreshUI();

    oldRoom.leave();

    delete self.megaChat.chats[oldJid];
};

/**
 * Append message to the UI of this room.
 * Note: This method will also log the message, so that later when someone asks for message sync this log will be used.
 *
 * @param message
 * @returns {boolean}
 */
MegaChatRoom.prototype.appendMessage = function(message) {
    var self = this;

    if(message.from == self.roomJid) {
        return; // dont show any system messages (from the conf room)
    }
    if(self.messagesIndex[message.id] !== undefined) {
        if(localStorage.d) {
            console.debug(self.roomJid.split("@")[0], message.id, "This message is already added to the message list (and displayed).");
        }
        return false;
    }

    self.messagesIndex[message.id] = self.messages.push(
        message
    );


    var $message = self.megaChat.$message_tpl.clone().removeClass("template");

    var jid = message.from;
    if(jid.indexOf("conference.") != -1) { // MUC jid, convert it to bare jid
        jid = message.from.split("/")[1];
        jid = jid.split("__")[0] + "@" + self.megaChat.karere.options.mucDomain.replace("conference.", "");
    } else { // xmpp resource jid, convert to bare jid
        jid = message.from.split("/")[0];
    }


    var name = self.megaChat.getContactNameFromJid(jid);

    $('.fm-chat-username', $message).text(
        name
    );

    //XXX: UTC?
    var date = new Date(message.timestamp * 1000);

    $('.fm-chat-message-time', $message).text(
        addZeroIfLenLessThen(date.getHours(), 2) + ":" + addZeroIfLenLessThen(date.getMinutes(), 2) + "." + addZeroIfLenLessThen(date.getSeconds(), 2)
    );
    $message.attr('data-timestamp', message.timestamp);
    $message.attr('data-id', message.id);


    $('.fm-chat-message', $message).text(
        message.message
    );


    var $jsp = self.$messages.data('jsp');

    assert($jsp, "JSP not available.");

    var $before = null;
    var $after = null;

    $('.jspContainer > .jspPane .fm-chat-messages-block', self.$messages).each(function() {
        if(message.timestamp >= $(this).attr('data-timestamp')) {
            $after = $(this);
        } else if($before === null && message.timestamp < $(this).attr('data-timestamp')) {
            $before = $(this);
        }
    });

    if(!$after && !$before) {
//        console.log("append: ", message.message);
        $('.jspContainer > .jspPane', self.$messages)
            .append($message);
    } else if($before) {
//        console.log("before: ", message.message, $before.text());
        $message.insertBefore($before);
    }  else if($after) {
//        console.log("after: ", message.message, $after.text());
        $message.insertAfter($after);
    }

    $jsp.reinitialise();
    $jsp.scrollToElement(
        $message
    );

    // update unread messages count
    if(self.roomJid != self.megaChat.getCurrentRoomJid()) {
        var $navElement = self.getNavElement();
        var $count = $('.messages-icon span', $navElement);
        var count = parseInt($count.text(), 10);

        if(count > 0) {
            count += 1;
        } else {
            count = 1;
        }
        $count.text(count);
        $count.parent().show();
    }
};


/**
 * Request a messages sync for this room
 *
 * Note: This is a recursion-like function, which uses the `exceptFromUsers` argument to mark which users had failed to
 * respond with a message sync response.
 *
 * @param exceptFromUsers {Array} Array of FULL JIDs which should be skipped when asking for messages sync (e.g. they
 * had timed out in the past)
 */
MegaChatRoom.prototype.requestMessageSync = function(exceptFromUsers) {
    var self = this;
    var megaChat = self.megaChat;
    var karere = megaChat.karere;


    assert(
        self.state == MegaChatRoom.STATE.JOINED || self.state == MegaChatRoom.STATE.SYNCING,
        "Current state != [JOINED || SYNCING]. I should not request message sync when I'm in different state"
    );

    exceptFromUsers = exceptFromUsers || [];

    var users = karere.getUsersInChat(self.roomJid);

    // Pick from which user should i ask for sync.

    if(Object.keys(users).length == 1) {
        // empty room
        return;
    }

    var validUsers = [];
    var ownUsers = [];
    $.each(users, function(k, v) {
        if(k == karere.getJid()) {
            return; // continue;
        } else if(exceptFromUsers.indexOf(k) != -1) {
            return; //continue
        } else { // only from mine users: if(k.split("/")[0] == karere.getBareJid())
            if(k.split("/")[0] == karere.getBareJid()) {
                ownUsers.push(k);
            } else {
                validUsers.push(k);
            }
        }
    });


    if(ownUsers.length > 0) {
        validUsers = ownUsers; // prefer own users, e.g. my other resources
    }

    if(validUsers.length === 0) {
        if(localStorage.d) {
            console.error("No users to sync messages from for room: ", self.roomJid, "except list:", exceptFromUsers);
        }
        return;
    }
    var userNum = Math.floor(Math.random() * validUsers.length) + 0;
    var userJid = validUsers[userNum];

    var messageId = karere.sendAction(
        userJid,
        'sync',
        {
            'roomJid': self.roomJid
        }
    );

    if(!self._syncRequests[self.roomJid]) {
        self._syncRequests[self.roomJid] = {};
    }

    if(self.state != MegaChatRoom.STATE.SYNCING) {
        self.setState(MegaChatRoom.STATE.SYNCING);
    }

    self._syncRequests[self.roomJid][messageId] = {
        'messageId': messageId,
        'userJid': userJid,
        'timer': setTimeout(function() {
            // timed out
            if(localStorage.d) {
                console.warn("Timeout waiting for", userJid, "to send sync message action. Will eventually, retry with some of the other users.");
            }

            delete self._syncRequests[self.roomJid][messageId];
            exceptFromUsers.push(userJid);
            self.requestMessageSync(exceptFromUsers);
        }, self.options.requestMessagesSyncTimeout)
    };
};

/**
 * Send messages sync response
 *
 * @param request {Object} with the `meta` from the actual request XMPP message
 * @returns {boolean}
 */
MegaChatRoom.prototype.sendMessagesSyncResponse = function(request) {
    var self = this;
    var megaChat = self.megaChat;
    var karere = megaChat.karere;

    if(!karere.getUsersInChat(self.roomJid)[request.from]) {
        if(localStorage.d) {
            console.error("Will not send message sync response to user who is not currently in the chat room for which he requested the sync.")
        }
        return false;
    }

    // Send messages as chunks (easier XML parsing?)

    var messagesCount = self.messages.length;
    var messagesChunkSize = 10;
    for(var i = 0; i < messagesCount; i+=messagesChunkSize) {
        karere.sendAction(
            request.from,
            'syncResponse',
            {
                'inResponseTo': request.id,
                'roomJid': request.meta.roomJid,
                'messages': self.messages.slice(i, i + messagesChunkSize),
                'offset': i,
                'total': messagesCount
            }
        );
    }
};

/**
 * This is a handler of message sync responses
 *
 * @param response {Object} with the `meta` of the message sync response
 * @returns {boolean}
 */
MegaChatRoom.prototype.handleSyncResponse = function(response) {
    var self = this;
    var megaChat = self.megaChat;
    var karere = megaChat.karere;

    if(!karere.getUsersInChat(self.roomJid)[response.from]) {
        if(localStorage.d) {
            console.error("Will not accept message sync response from user who is currently not in the chat room for which I'd requested the sync.")
        }
        return false;
    }
    if(self._syncRequests[self.roomJid]) {
        if(!self._syncRequests[self.roomJid][response.meta.inResponseTo]) {
            if(localStorage.d) {
                console.warn("Will not accept message sync response because inResponseTo, did not matched my original messageID, got: ", response.meta.inResponseTo, ". Most likely they had sent the response too late.");
            }
            return false;
        }
        clearTimeout(self._syncRequests[self.roomJid][response.meta.inResponseTo].timer);
    } else {
        if(localStorage.d) {
            console.warn("Invalid sync response, room not found:", response);
        }
        return false;
    }

    // cleanup
    $.each(self._syncRequests[self.roomJid], function(messageId, request) {
        clearTimeout(request.timer);
    });

    if(self._syncRequests[self.roomJid].cleanupTimeout) {
        clearTimeout(self._syncRequests[self.roomJid].cleanupTimeout);
    }
    self._syncRequests[self.roomJid].cleanupTimeout = setTimeout(function() {
        delete self._syncRequests[self.roomJid];
    }, self.options.syncRequestCleanupTimeout);

    $.each(response.meta.messages, function(k, msg) {
        self.appendMessage(msg);
    });

    if(self.state < MegaChatRoom.STATE.SYNCED) {
        self.setState(MegaChatRoom.STATE.SYNCED);
    }
};

/**
 * Returns the actual DOM Element from the Mega's main navigation (tree) that is related to this chat room.
 *
 * @returns {*|jQuery|HTMLElement}
 */
MegaChatRoom.prototype.getNavElement = function() {
    var self = this;

    if(self.type == "private") {
        return $('#treesub_contacts li a[data-room-jid="' + self.roomJid.split("@")[0] + '"]');
    } else {
        throw new Error("Not implemented.");
    }
};


/**
 * Send message to this room
 *
 * @param message {String}
 */
MegaChatRoom.prototype.sendMessage = function(message) {
    var self = this;
    var megaChat = this.megaChat;

    if(self.state != MegaChatRoom.STATE.READY) {
        var messageId = megaChat.karere.generateMessageId(self.roomJid);
        var messageData = {
            from: megaChat.karere.getJid(),
            message: message,
            timestamp: unixtime(),
            meta: {},
            id: messageId
        };
        self._messagesQueue.push(messageData);

        self.appendMessage(messageData);
    } else {
        //TODO: Encrypt messages
        megaChat.karere.sendRawMessage(self.roomJid, "groupchat", message);
    }
};

window.megaChat = new MegaChat();