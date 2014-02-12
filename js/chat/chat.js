/**
 * How to make this work in your browser? copy/paste this in your browser console:
 * localStorage.staticpath = "http://localhost:5280/"; localStorage.dd=1; localStorage.contextmenu=1; localStorage.megachat=1; localStorage.jj=true;
 * and optionally:
 * localStorage.dxmpp = 1; localStorage.stopOnAssertFail = true; localStorage.d = 1;
 * @type {boolean}
 */
var MegaChatEnabled = false;
if (localStorage.megachat) MegaChatEnabled=true;


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

        initChatScrolling();

        $('.message-textarea').unbind('keyup.autoresize');
        $('.message-textarea').bind('keyup.autoresize',function() {
            $(this).height('auto');
            var text = $(this).val();
            var lines = text.split("\n");
            var count = lines.length;

            if ($(this).val().length != 0 && count>1)
            {
                $(this).height($(this).prop("scrollHeight"));
                var scrollBlockHeight = $('.fm-chat-block').outerHeight() - $('.fm-chat-line-block').outerHeight() - 80;
                if (scrollBlockHeight != $('.fm-chat-message-scroll').outerHeight())
                {
                    $('.fm-chat-message-scroll').height(scrollBlockHeight);
                    initChatScrolling();
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
                megaChat.karere.sendComposingPaused(megaChat.getCurrentRoomJid());
                typingTimeout = null;
            }
        };

        $('.message-textarea').unbind('keyup.send');
        $('.message-textarea').bind('keyup.send', function(e) {
            if($(this).val().length > 0) {
                if(!typingTimeout) {
                    megaChat.karere.sendIsComposing(megaChat.getCurrentRoomJid());
                } else if(typingTimeout) {
                    clearTimeout(typingTimeout);
                    typingTimeout = null;
                }

                typingTimeout = setTimeout(function() {
                    stoppedTyping();
                }, 2000);
            } else if($(this).val().length == 0) {
                stoppedTyping();
            }
        });
        $('.message-textarea').unbind('keydown.send');
        $('.message-textarea').bind('keydown.send',function(e) {
            var key = e.keyCode || e.which;


            if(key == 13 && e.shiftKey == true) {
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



function initChatScrolling()
{
    var $messages = $('.fm-chat-message-scroll');
    if(!$messages.data("jsp")) {
        $('.fm-chat-message-scroll').jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5});
    } else {
        $messages.data("jsp").reinitialise();
    }
}


var megaChatInstanceId = 0;
var MegaChat = function() {
    var self = this;


    this.is_initialized = false;

    this.chats = {};
    this.currentlyOpenedChat = null;
    this._myPresence = localStorage.megaChatPresence;

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
            if(eventData.myOwn == false) {
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
        if(eventData.myOwn == true) {
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

                    // decide if i should leave MY room and accept this invitation
                    if(room.ctime > eventData.meta.ctime) {
                        if(localStorage.d) {
                            console.debug(self.karere.getNickname(), "Their room is older.");
                        }

                        if(self.currentlyOpenedChat == room.roomJid) {

                            if(room.isTemporary == true) {
                                room.convertToPersistent(
                                    eventData.room,
                                    eventData.meta.participants,
                                    eventData.meta.ctime
                                );
                            } else {
                                room.replaceWith(
                                    eventData.room,
                                    eventData.meta.participants,
                                    eventData.meta.ctime
                                );
                            }
                        }
                        self.karere.joinChat(eventData.room, eventData.password);
                        e.stopPropagation();
                        return false;
                    } else {
                        if(localStorage.d) {
                            console.debug(self.karere.getNickname(), "My room is older.");
                        }
                        // my room is newer, so i'll reject the invitation and re-invite the user to join my room

                        // Send invite back
                        self.karere.addUserToChat(
                            room.roomJid,
                            eventData.from,
                            undefined,
                            room.type,
                            {
                                'ctime': room.ctime,
                                'invitationType': "resume",
                                'participants': room.users,
                                'users': self.karere.getUsersInChat(room.jid)
                            }
                        );

                        e.stopPropagation();
                        if(localStorage.d) {
                            console.debug(self.karere.getNickname(), "i'm already in a private session w/ user", bareFromJid, "at room", roomJid);
                        }


                        return false; // break;
                    }
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
            self.chats[eventData.roomJid].requestMessageSync();
        }
    });


    this.karere.bind("onChatMessage", function() {
        self._onChatMessage.apply(self, toArray(arguments));
    });

    this.karere.bind("onActionMessage", function(e, eventData) {
        if(eventData.myOwn == true) {
            return;
        }

        if(eventData.meta.action == "sync") {
            var room = self.chats[eventData.meta.roomJid];
            room.sendMessagesSyncResponse(eventData);
        } else if(eventData.meta.action == "syncResponse") {
            var room = self.chats[eventData.meta.roomJid];
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

        if(room && !room.$messages.is(":visible")) { // opened window, different then one from the chat ones
            room.hide();
            self.currentlyOpenedChat = null;
        }
        if(lastOpenedRoom && (!room || room.roomJid != lastOpenedRoom)) { // have opened a chat window before, but now
                                                                           // navigated away from it
            if(self.chats[lastOpenedRoom]) {
                self.chats[lastOpenedRoom].hide();
            }
        }

        lastOpenedRoom = room.roomJid;
    });

    return this;
};

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

MegaChat.prototype.connect = function() {
    var self = this;

    return self.karere.connect(
                self.getJidFromNodeId(u_handle),
                self.getJidPasswordFromNodeId(u_handle)
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


MegaChat.prototype._onChatMessage = function(e, eventData) {
    var self = this;

    // ignore my own forwarded messages
    if(eventData.myOwn == true && eventData.isForwarded == true) {
        return;
    }
    if(!eventData.message) {
        return;
    }

    var roomJid = eventData.roomJid;
    var room = self.chats[eventData.roomJid];
    if(room) {
        room.appendMessage({
            from: eventData.from,
            message: eventData.message,
            timestamp: eventData.timestamp ? eventData.timestamp : unixtime(),
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

MegaChat.prototype._onUsersUpdate = function(type, e, eventData) {
    var self = this;
    var jids = Object.keys(eventData.currentUsers);
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
        self.chats[eventData.roomJid].syncUsers(clone(updatedJids));
    }
    //TODO: group chats?
};

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

MegaChat.prototype.getContacts = function() {
    var results = [];
    $.each(M.u, function(k, v) {
        if(v.c == 1 || v.c == 2) {
            results.push(v);
        }
    });
    return results;
};

MegaChat.prototype.getNormalisedBareJid = function(jid) {
    if(jid.indexOf("conference.") != -1) {
        jid = jid.split("/")[1].split("__")[0] + "@" + jid.split("@")[1].split("/")[0].replace("conference.", "");
    } else {
        jid = jid.split("/")[0];
    }

    return jid;
};

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
        debugger;
    }
    return contact;
};

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


MegaChat.prototype.xmppPresenceToCssClass = function(presence) {
    if(presence== Karere.PRESENCE.ONLINE || presence == true) {
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
        } else if(presence == true || presence == Karere.PRESENCE.ONLINE) {
            $element.addClass("online-status");
        } else {
            $element.addClass("offline-status");
        }

        $element.attr("data-jid", self.getJidFromNodeId(contact.u));
    });
};

MegaChat.prototype.getJidFromNodeId = function(nodeId) {
    assert(nodeId, "Missing nodeId for getJidFromNodeId");

    // TODO: fake function that should be replaced with a real node ID -> jabber id conversion
    var hash = simpleStringHashCode(nodeId) + "";
    return "test-" + hash[hash.length - 1] + "@sandbox.developers.mega.co.nz";
};

MegaChat.prototype.getJidPasswordFromNodeId = function(nodeId) {
    assert(nodeId, "Missing nodeId for getJidPasswordFromNodeId");

    // TODO: Replace me w/ a real function that will give us the password for logging in the jabber server
    return this.getJidFromNodeId(nodeId).split("@")[0];
};



MegaChat.prototype.openChat = function(jids, type) {
//    debugger;
    var self = this;
    type = type || "private";

    var $promise = new $.Deferred();

    if(self.currentlyOpenedChat) {
        self.hideChat(self.currentlyOpenedChat);
    }


    if(type == "private") {
        var $element = $('#treesub_contacts li a[data-jid="' + jids[0] + '"]');
        var roomJid = $element.attr('data-room-jid');
        if(self.chats[roomJid]) {
            self.chats[roomJid].show();
            $promise.resolve(roomJid, self.chats[roomJid]);
            return $promise;
        } else {
            // open new chat
        }
    }


    var room = MegaChatRoom.createTempRoomFromPromise(self, $promise);
    room.setType(type);
    room.setUsers(jids);
    room.ctime = unixtime();
    room.show();

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



    var jids_without_myself = clone(jids);
    jids_without_myself.splice($.inArray(self.karere.getJid(), jids_without_myself), 1);

    var $startChatPromise = self.karere.startChat([], type);

    $startChatPromise
        .done(function(roomJid) {
//            debugger;

            $promise.resolve(roomJid, self.chats[roomJid]);

            $.each(jids_without_myself, function(k, userJid) {
                if(self.chats[roomJid]) {
                    self.karere.addUserToChat(roomJid, userJid, undefined, type, {
                        'ctime': self.chats[roomJid].ctime,
                        'invitationType': "created",
                        'participants': jids,
                        'users': self.karere.getUsersInChat(roomJid)
                    });
                }
            });
        })
        .fail(function() {
            $promise.reject.apply($promise, toArray(arguments))
            if(self.chats[$startChatPromise.roomJid]) {
                self.chats[$startChatPromise.roomJid].destroy();
            }
        });




    return $promise;
};

MegaChat.prototype.getCurrentRoom = function() {
    return this.chats[this.currentlyOpenedChat];
};
MegaChat.prototype.getCurrentRoomJid = function() {
    return this.currentlyOpenedChat;
};


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


MegaChat.prototype.sendMessage = function(roomJid, val) {
    var self = this;

    //TODO: queue if room is not ready.
    //TODO: Encrypt messages
    self.karere._rawSendMessage(roomJid, "groupchat", val);
};


MegaChat.prototype._pickRoomLeader = function(jids) {
  // really simple algo, to pick one
  return clone(jids).sort()[0];
};

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
        'requestMessagesSyncTimeout': 1500
    };
    this._syncRequests = {};

    // TODO: Implement room states (required by the megaENC), maybe find a better place to add the states, not here?

    this.$messages = megaChat.$messages_tpl.clone();
    this.$header = megaChat.$header_tpl.clone();

    return this;
};

MegaChatRoom.prototype.setType = function(type) {
    var self = this;

    if(!type) {
        debugger;
    }

    self.type = type;
};

MegaChatRoom.prototype.setUsers = function(jids) {
    this.users = clone(jids);

    this.refreshUI();
//    console.error("!!!!", this.roomJid, this.users);
};

MegaChatRoom.prototype.syncUsers = function(jids) {
    // the same as .setUsers, w/ the difference that it will only add any of the user jids in `jids` to the `.users`,
    // instead of just overwriting the `.users` property

    var self = this;

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

MegaChatRoom.prototype.participantExistsInRoom = function(jid, strict) {
    var self = this;

    strict = strict || false;

    var result = false;
    $.each(self.users, function(k, v) {
        if(!v) { debugger; return; }
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
MegaChatRoom.prototype.getParticipants = function() {
    var self = this;

    var participants = {};


    $.each(self.users, function(k, v) {
        if(!v) { debugger; return; }
        participants[v.split("/")[0]] = true;
    });

    return Object.keys(participants);
};

MegaChatRoom.prototype.refreshUI = function() {
    var self = this;

    this.$header.attr("data-room-jid", this.roomJid);

    $('.fm-chat-user', this.$header).text(this.roomJid.split("@")[0]);

    if(self.type == "private") {
        $.each(self.users, function(k, v) {
            var $element = $('#treesub_contacts li a[data-jid="' + v + '"]');
            $element.attr("data-room-jid", self.roomJid);
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

MegaChatRoom.prototype.destroy = function() {
    var self = this;

    if(self.roomJid.indexOf("@") != -1) {
        self.megaChat.karere.leaveChat(self.roomJid);
    }

    self.$header.remove();
    self.$messages.remove();

    var $element = $('#treesub_contacts li a[data-room-jid="' + self.roomJid + '"]');
    $element.removeAttr("data-room-jid");

    delete self.megaChat[self.roomJid];
};

MegaChatRoom.prototype.show = function() {
    var self = this;

    $('.fm-chat-header, .fm-chat-message-scroll', self.megaChat.$container).remove();


    self.megaChat.$container.append(
        self.$header
    );
    self.megaChat.$container.append(
        self.$messages
    );

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



MegaChatRoom.prototype.hide = function() {
    var self = this;


    self.$header.detach();
    self.$messages.detach();

    self.megaChat.currentlyOpenedChat = null;
};

// static method
MegaChatRoom.createTempRoomFromPromise = function (megaChat, $startChatPromise) {
    // initialize UI MegaChatRoom component
    var roomId = "TMP:" + Math.random() + unixtime();
    var room = megaChat.chats[roomId] = new MegaChatRoom(megaChat, roomId);
    room.isTemporary = true;

    $startChatPromise.done(function(roomJid) {
        if(room.isTemporary) {
            // if its still a temp room

            room.convertToPersistent(
                roomJid,
                room.users,
                room.ctime
            );

            room.refreshUI();
        } else {}

    });

    return room;
};

MegaChatRoom.prototype.convertToPersistent = function(newJid, users, ctime) {
    var self = this;
    if(!self.isTemporary) {
        throw new Error("Not temp room.");
    }

    self.isTemporary = false;

    return self.replaceWith(newJid, users, ctime);
};
MegaChatRoom.prototype.replaceWith = function(newJid, users, ctime) {
    var self = this;

    if(self.megaChat.currentlyOpenedChat == self.roomJid || self.$header.is(":visible")) {
        self.megaChat.currentlyOpenedChat = newJid;
    }
    var oldJid = self.roomJid;

    self.roomJid = newJid;
    self.users = clone(users);
    self.ctime = ctime;

    delete self.megaChat.chats[oldJid];
    self.megaChat.chats[newJid] = self;


    self.refreshUI();

    if(oldJid.indexOf("@") != -1) {
        self.megaChat.karere.leaveChat(oldJid);
    }
};

MegaChatRoom.prototype.appendMessage = function(message) {
    var self = this;

    if(message.from == self.roomJid) {
        return; // dont show any system messages (from the conf room)
    }
    if(self.messagesIndex[message.id] != undefined) {
        if(localStorage.d) {
            console.debug(self.roomJid.split("@")[0], message.id, "This message is already added to the message list (and displayed).");
        }
        return false;
    }

    var arrIndex = self.messages.push(
        message
    );

    self.messagesIndex[message.id] = arrIndex;


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
        date.getHours() + ":" + date.getMinutes() + "." + date.getSeconds()
    );
    $message.attr('data-timestamp', message.timestamp);
    $message.attr('data-id', message.id);


    $('.fm-chat-message', $message).text(
        message.message
    );


    var $jsp = self.$messages.data('jsp');
    if(!$jsp) {
        self.$messages.jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5});
        $jsp = self.$messages.data('jsp');
    }

    var $before = null;
    var $after = null;

    $('.jspContainer > .jspPane .fm-chat-messages-block', self.$messages).each(function() {
        if(message.timestamp >= $(this).attr('data-timestamp')) {
            $after = $(this);
        } else if($before == null && message.timestamp < $(this).attr('data-timestamp')) {
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

MegaChatRoom.prototype.requestMessageSync = function(exceptFromUsers) {
    var self = this;
    var megaChat = self.megaChat;
    var karere = megaChat.karere;

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

    if(validUsers.length == 0) {
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

    delete self._syncRequests[self.roomJid];

    $.each(response.meta.messages, function(k, msg) {
        self.appendMessage(msg);
    });
};


MegaChatRoom.prototype.getNavElement = function() {
    var self = this;

    if(self.type == "private") {
        return $('#treesub_contacts li a[data-room-jid="' + self.roomJid + '"]');
    } else {
        throw new Error("Not implemented.");
    }
};

window.megaChat = new MegaChat();