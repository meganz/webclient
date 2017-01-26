/**
 * Simple class which should link the MegaNotifications and Chat and add support for notifications.
 *
 * @param megaChat
 * @param options {Object} options passed to MegaNotifications, see MegaNotifications.DEFAULT_OPTIONS
 * @returns {ChatNotifications}
 * @constructor
 */
var ChatNotifications = function(megaChat, options) {
    var self = this;

    options = options || {};

    options.parentLogger = megaChat.logger;
    options.anfFlag = "chat_enabled";

    self.notifications = new MegaNotifications(options);

    megaChat.rebind("onInit.chatNotifications", function(e) {
        self.attachToChat(megaChat);
    });

    return this;
};

/**
 * Entry point, for attaching to a specific `Chat` instance
 *
 * @param megaChat {Chat}
 */
ChatNotifications.prototype.attachToChat = function(megaChat) {
    var self = this;

    megaChat
        .rebind('onRoomCreated.chatNotifications', function(e, megaRoom) {
            var resetChatNotificationCounters = function() {
                if (megaRoom.isCurrentlyActive) {
                    var uiElement = $('.conversation-panel[data-room-jid="' + megaRoom.roomJid.split("@")[0] + '"]');

                    if (uiElement.find(".call-block").length > 0 && uiElement.find(".call-block.small-block").length === 0) {
                        return;
                    }

                    var lastSeen = null;
                    megaRoom.messagesBuff.messages.forEach(function (v, k) {
                        if (v.getState && v.getState() === Message.STATE.NOT_SEEN) {
                            lastSeen = v;
                        }
                    });

                    if (lastSeen) {
                        megaRoom.messagesBuff.setLastSeen(lastSeen.messageId);
                    }
                    self.notifications.resetCounterGroup(megaRoom.roomJid);
                }
            };

            megaRoom
                .rebind('onMessagesBuffAppend.chatNotifications', function(e, message) {
                    var fromContact = null;
                    if (message.userId) {
                        // contact not found.
                        if (!M.u[message.userId]) {
                            return;
                        }
                        fromContact = M.u[message.userId];
                    }
                    else if (message.authorContact) {
                        fromContact = message.authorContact;
                    }
                    else if (message.getFromJid) {
                        fromContact = megaChat.getContactFromJid(
                            message.getFromJid()
                        );
                    }

                    var avatarMeta = generateAvatarMeta(fromContact.u);
                    var icon = avatarMeta.avatarUrl;
                    var n;

                    // halt if already seen.
                    if (!message.getState || message.getState() === Message.STATE.SEEN || message.revoked === true) {
                        return;
                    }

                    if (message.userId !== u_handle) {
                        if (message.isManagement && message.isManagement() && !message.isRenderableManagement()) {
                            // skip non renderable management messages, as "Attachment Revoked" and others...
                            return;
                        }
                        var unreadFlag = message.getState() === Message.STATE.NOT_SEEN && !document.hasFocus();
                        n = self.notifications.notify(
                            'incoming-chat-message',
                            {
                                'sound': 'incoming_chat_message',
                                'group': megaRoom.roomJid,
                                'incrementCounter': unreadFlag,
                                'icon': icon,
                                'anfFlag': 'chat_enabled',
                                'params': {
                                    'from': avatarMeta.fullName
                                }
                            },
                            unreadFlag
                        );

                        if (unreadFlag === false) {
                            resetChatNotificationCounters();
                        }

                        var changeListenerId = megaRoom.messagesBuff.addChangeListener(function() {
                            if (message.getState() === Message.STATE.SEEN) {
                                n.setUnread(false);

                                megaRoom.messagesBuff.removeChangeListener(changeListenerId);
                            }
                        });
                    } else if (message.type && message.textContents && !message.seen) {
                        if (message.type === "incoming-call") {
                            return; // already caught by the onIncomingCall...
                        }
                        n = self.notifications.notify(
                            'alert-info-message',
                            {
                                'sound': 'alert_info_message',
                                'group': megaRoom.roomJid,
                                'incrementCounter': true,
                                'anfFlag': 'chat_enabled',
                                'icon': icon,
                                'params': {
                                    'from': avatarMeta.fullName,
                                    'messageText': message.textContents
                                }
                            },
                            !message.seen
                        );

                        var changeListener = function() {
                            if (message.seen === true) {
                                n.setUnread(false);

                                message.removeChangeListener(changeListener);
                            }
                        };

                        message.addChangeListener(changeListener);
                    }
                    if (n) {
                        // activate/show room when a notification is clicked
                        n.bind('onClick', function(e) {
                            window.focus();
                            megaRoom.activateWindow();
                            megaRoom.show();
                            if (n.type == "incoming-text-message") {
                                setTimeout(function() {
                                    $('.message-textarea:visible').trigger('focus');
                                }, 1000);
                            }
                        });
                    }
                })
                .rebind('onChatShown.chatNotifications', function(e) {
                    resetChatNotificationCounters();
                })
                .rebind('onChatIsFocused.chatNotifications', function(e) {
                    resetChatNotificationCounters();
                })
                .rebind('onOutgoingCall.chatNotifications', function(e, eventData, mediaOptions, callSession) {
                    var sid = eventData.info && eventData.info.sid ? eventData.info.sid : eventData.sid;
                    var n = self.notifications.notify(
                        'outgoing-call',
                        {
                            'sound': 'incoming_voice_video_call',
                            'soundLoop': true,
                            'alwaysPlaySound': true,
                            'group': megaRoom.roomJid,
                            'incrementCounter': false,
                            'icon': avatars[u_handle],
                            'anfFlag': 'chat_enabled',
                            'params': {
                                'room': megaRoom,
                                'from': generateAvatarMeta(u_handle).fullName,
                                'isVideoCall': mediaOptions.video
                            }
                        },
                        !megaRoom.isActive()
                    );
                    n.bind('onClick', function(e) {
                        window.focus();
                        room.activateWindow();
                        room.show();
                    });

                    var evtId = generateEventSuffixFromArguments("", "chatNotifStopSoundOut", rand(10000));
                    var stopSound = function(e, session, oldState, newState) {
                        if (session.sid == sid) {
                            n.forceStopSound();
                            callSession.unbind('StateChanged' + evtId);
                        }
                    };

                    callSession.bind('StateChanged' + evtId, stopSound);
                })
                .rebind('CallTerminated.chatNotifications', function(e, origEvent, room) {
                    self.notifications.resetCounterGroup(room.roomJid, "incoming-voice-video-call");
                    var contact = room.megaChat.getContactFromJid(room.getParticipantsExceptMe()[0]);
                    var avatarMeta = generateAvatarMeta(contact.u);
                    var icon = avatarMeta.avatarUrl;

                    var n = self.notifications.notify(
                        'call-terminated',
                        {
                            'sound': 'hang_out',
                            'group': room.roomJid,
                            'incrementCounter': false,
                            'anfFlag': 'chat_enabled',
                            'icon': icon,
                            'params': {
                                'from': avatarMeta.fullName
                            }
                        },
                        !document.hasFocus()
                    );

                    n.bind('onClick', function(e) {
                        window.focus();
                        room.activateWindow();
                        room.show();
                    });


                    n.setUnread(false);
                });
        })
        .rebind('onIncomingCall.chatNotifications', function(e,
             room,
             contactName,
             avatar,
             isVideoCall,
             sid,
             callSession,
             dialogMessage
        ) {

            var n = self.notifications.notify(
                'incoming-voice-video-call',
                {
                    'sound': 'incoming_voice_video_call',
                    'soundLoop': true,
                    'alwaysPlaySound': true,
                    'group': room.roomJid,
                    'incrementCounter': true,
                    'anfFlag': 'chat_enabled',
                    'icon': avatar,
                    'params': {
                        'room': room,
                        'from': contactName,
                        'isVideoCall': isVideoCall
                    }
                },
                !room.isActive()
            );
            n.bind('onClick', function(e) {
                window.focus();
                room.activateWindow();
                room.show();
            });

            var changeListener = function() {
                if (dialogMessage.seen === true) {
                    n.setUnread(false);

                    dialogMessage.removeChangeListener(changeListener);
                }
            };

            dialogMessage.addChangeListener(changeListener);

            var evtId = generateEventSuffixFromArguments("", "chatNotifStopSound", rand(10000));
            var stopSound = function(e, session, oldState, newState) {
                if (session.sid == sid) {
                    n.forceStopSound();
                    callSession.unbind('StateChanged' + evtId);
                }
            };

            callSession.bind('StateChanged' + evtId, stopSound);
        })
        .rebind('onCallAnswered.chatNotifications', function(e, room) {
            self.notifications.resetCounterGroup(room.roomJid, "incoming-voice-video-call")
        });
};
