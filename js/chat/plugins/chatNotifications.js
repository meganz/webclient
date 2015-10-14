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
                if(megaRoom.isCurrentlyActive) {
                    var lastSeen = null;
                    megaRoom.messagesBuff.messages.forEach(function (v, k) {
                        if (v.getState && v.getState() === Message.STATE.NOT_SEEN) {
                            lastSeen = v;
                        }
                    });

                    if(lastSeen) {
                        megaRoom.messagesBuff.setLastSeen(lastSeen.messageId);
                    }
                    self.notifications.resetCounterGroup(megaRoom.roomJid);
                }
            };

            megaRoom
                .rebind('onAfterRenderMessage.chatNotifications', function(e, message) {
                    var fromContact = null;
                    if (message.userId) {
                        fromContact = M.u[message.userId];
                    }
                    else if (message.authorContact) {
                        fromContact = message.authorContact;
                    }
                    else if(message.getFromJid) {
                        fromContact = megaChat.getContactFromJid(
                            message.getFromJid()
                        );
                    }

                    var avatarMeta = generateAvatarMeta(fromContact.u);
                    var icon = avatarMeta.avatarUrl;
                    var n;

                    if(!message.getState || message.getState() === Message.STATE.SEEN) { // halt if already seen.
                        return;
                    }

                    if(message.userId !== u_handle) {
                        n = self.notifications.notify(
                            'incoming-chat-message',
                            {
                                'sound': 'incoming_chat_message',
                                'group': megaRoom.roomJid,
                                'incrementCounter': true,
                                'icon': icon,
                                'params': {
                                    'from': avatarMeta.fullName
                                }
                            },
                            message.getState() === Message.STATE.NOT_SEEN && !document.hasFocus()
                        );

                        var changeListenerId = megaRoom.messagesBuff.addChangeListener(function() {
                            if (message.getState() === Message.STATE.SEEN) {
                                n.setUnread(false);

                                megaRoom.messagesBuff.removeChangeListener(changeListenerId);
                            }
                        });
                    } else if(message.type && message.textContents && !message.seen) {
                        if(message.type === "incoming-call") {
                            return; // already caught by the onIncomingCall...
                        }
                        n = self.notifications.notify(
                            'alert-info-message',
                            {
                                'sound': 'alert_info_message',
                                'group': megaRoom.roomJid,
                                'incrementCounter': true,
                                'icon': icon,
                                'params': {
                                    'from': avatarMeta.fullName,
                                    'messageText': message.textContents
                                }
                            },
                            !message.seen
                        );

                        var changeListener = function() {
                            if(message.seen === true) {
                                n.setUnread(false);

                                message.removeChangeListener(changeListener);
                            }
                        };

                        message.addChangeListener(changeListener);
                    }
                    if(n) {
                        // activate/show room when a notification is clicked
                        n.bind('onClick', function(e) {
                            window.focus();
                            megaRoom.activateWindow();
                            megaRoom.show();
                            if(n.type == "incoming-text-message") {
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
                    resetChatNotificationCounters()
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
                        if(session.sid == sid) {
                            n.forceStopSound();
                            callSession.unbind('StateChanged' + evtId);
                        }
                    };

                    callSession.bind('StateChanged' + evtId, stopSound);
                })
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
                if(dialogMessage.seen === true) {
                    n.setUnread(false);

                    dialogMessage.removeChangeListener(changeListener);
                }
            };

            dialogMessage.addChangeListener(changeListener);

            var evtId = generateEventSuffixFromArguments("", "chatNotifStopSound", rand(10000));
            var stopSound = function(e, session, oldState, newState) {
                if(session.sid == sid) {
                    n.forceStopSound();
                    callSession.unbind('StateChanged' + evtId);
                }
            };

            callSession.bind('StateChanged' + evtId, stopSound);
        })
        .rebind('onCallTerminated.chatNotifications', function(e, room) {
            self.notifications.resetCounterGroup(room.roomJid, "incoming-voice-video-call")
        })
        .rebind('onCallAnswered.chatNotifications', function(e, room) {
            self.notifications.resetCounterGroup(room.roomJid, "incoming-voice-video-call")
        });

        //// link counters
        //self.notifications.rebind("onCounterUpdated.chatNotifications", function(e, notif, group, type) {
        //    var room = megaChat.chats[group];
        //    if(room) {
        //        room.unreadCount = notif.getCounterGroup(group);
        //    }
        //});
};
