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

    megaChat
        .rebind('onRoomInitialized.chatNotifications', function(e, megaRoom) {
            var resetChatNotificationCounters = function() {
                if (megaRoom.isCurrentlyActive) {
                    var cnSel = '.conversation-panel[data-room-id="' + megaRoom.chatId + '"]';
                    var uiElement = document.querySelector(cnSel);

                    if (!uiElement || uiElement.querySelector(".call-block") &&
                        !uiElement.querySelector(".call-block.small-block")) {
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
                    self.notifications.resetCounterGroup(megaRoom.chatId);
                }
                megaChat.updateSectionUnreadCount();
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

                    var avatarMeta = generateAvatarMeta(fromContact.u);
                    var icon = avatarMeta.avatarUrl;
                    var n;

                    // halt if already seen.
                    if (
                        !message.getState ||
                        message.getState() === Message.STATE.SEEN ||
                        message.revoked === true
                    ) {
                        return;
                    }

                    if (message.userId !== u_handle) {
                        if (message.isManagement && message.isManagement() && !message.isRenderableManagement()) {
                            // skip non renderable management messages, as "Attachment Revoked" and others...
                            return;
                        }

                        var unreadFlag = (
                            message.getState() === Message.STATE.NOT_SEEN &&
                            !mega.active
                        );

                        if (message.source === Message.SOURCE.CHATD) {
                            n = self.notifications.notify(
                                'incoming-chat-message',
                                {
                                    'sound': 'incoming_chat_message',
                                    'group': megaRoom.chatId,
                                    'incrementCounter': unreadFlag,
                                    'icon': icon,
                                    'anfFlag': 'chat_enabled',
                                    'params': {
                                        'from': avatarMeta.fullName
                                    }
                                },
                                unreadFlag
                            );
                        }

                        if (unreadFlag === false) {
                            resetChatNotificationCounters();
                        }

                        if (n) {
                            var changeListenerId = megaRoom.messagesBuff.addChangeListener(function () {
                                if (message.getState() === Message.STATE.SEEN) {
                                    n.setUnread(false);

                                    megaRoom.messagesBuff.removeChangeListener(changeListenerId);
                                }
                            });
                        }
                    } else if (message.type && message.textContents && !message.seen) {
                        if (message.type === "incoming-call") {
                            return; // already caught by the onIncomingCall...
                        }
                        n = self.notifications.notify(
                            'alert-info-message',
                            {
                                'sound': 'alert_info_message',
                                'group': megaRoom.chatId,
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
                        n.on('onClick', function() {
                            window.focus();
                            megaRoom.activateWindow();
                            megaRoom.show();
                            if (n.type === "incoming-text-message") {
                                setTimeout(function() {
                                    $('.message-textarea:visible').trigger('focus');
                                }, 1000);
                            }
                        });
                    }
                })
                .rebind('onChatShown.chatNotifications', function() {
                    onIdle(resetChatNotificationCounters);
                })
                .rebind('onChatIsFocused.chatNotifications', function() {
                    onIdle(resetChatNotificationCounters);
                })
                .rebind('onCallRequestSent.chatNotifications', function(e, callManagerCall, mediaOptions) {
                    var sid = callManagerCall.id;
                    var n = self.notifications.notify(
                        'outgoing-call',
                        {
                            'sound': 'incoming_voice_video_call',
                            'soundLoop': true,
                            'alwaysPlaySound': true,
                            'group': megaRoom.chatId,
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
                    n.on('onClick', function() {
                        window.focus();
                        megaRoom.activateWindow();
                        megaRoom.show();
                    });

                    var evtId = generateEventSuffixFromArguments("", "chatNotifStopSoundOut", rand(10000));
                    var stopSound = function(e, callManagerCall) {
                        if (callManagerCall.id === sid) {
                            n.forceStopSound();
                            callManagerCall.off('StateChanged' + evtId);
                        }
                    };

                    callManagerCall.on('StateChanged' + evtId, stopSound);
                })
                .rebind('CallTerminated.chatNotifications', function(e, origEvent, room) {
                    self.notifications.resetCounterGroup(room.chatId, "incoming-voice-video-call");
                    var contact = M.u[room.getParticipantsExceptMe()[0]];
                    var icon = false;
                    var title;
                    if (contact && contact.u) {
                        var avatarMeta = generateAvatarMeta(contact.u);
                        icon = avatarMeta.avatarUrl;
                        title = avatarMeta.fullName;
                    }
                    else {
                        title = room.getRoomTitle();
                    }

                    var n = self.notifications.notify(
                        'call-terminated',
                        {
                            'sound': 'hang_out',
                            'group': room.chatId,
                            'incrementCounter': false,
                            'anfFlag': 'chat_enabled',
                            'icon': icon,
                            'params': {
                                'from': title
                            }
                        },
                        !mega.active
                    );

                    n.on('onClick', function() {
                        window.focus();
                        room.activateWindow();
                        room.show();
                    });


                    n.setUnread(false);

                    megaChat.updateSectionUnreadCount();
                });
        })
        .rebind('onIncomingCall.chatNotifications', function(e,
             room,
             contactName,
             avatar,
             isVideoCall,
             sid,
             callManagerCall,
             dialogMessage
        ) {

            var n = self.notifications.notify(
                'incoming-voice-video-call',
                {
                    'sound': 'incoming_voice_video_call',
                    'soundLoop': true,
                    'alwaysPlaySound': true,
                    'group': room.chatId,
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
            n.on('onClick', function() {
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
            var stopSound = function(e, callManagerCall, oldState, newState) {
                if (callManagerCall.id === sid) {
                    n.forceStopSound();
                    callManagerCall.off('StateChanged' + evtId);
                }
            };

            callManagerCall.on('StateChanged' + evtId, stopSound);
        })
        .rebind('onCallAnswered.chatNotifications', function(e, room) {
            self.notifications.resetCounterGroup(room.chatId, "incoming-voice-video-call");
        });
};
