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

    megaChat.unbind("onInit.chatNotifications");
    megaChat.bind("onInit.chatNotifications", function(e) {
        self.attachToChat(megaChat)
    });


    self.notifications
        .unbind('onCounterUpdated.chat')
        .bind('onCounterUpdated.chat', function(megaNotifications, group, notifObj) {
            megaChat.renderContactTree();
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
        .unbind('onRoomCreated.chatNotifications')
        .bind('onRoomCreated.chatNotifications', function(e, megaRoom) {
            megaRoom
                .unbind('onAfterRenderMessage.chatNotifications')
                .bind('onAfterRenderMessage.chatNotifications', function(e, $message, message) {
                    var icon = $('.nw-contact-avatar img', $message).attr('src');
                    var n;

                    if(message.seen === true) { // halt if already seen.
                        return;
                    }

                    if(message instanceof KarereEventObjects.IncomingMessage && !message.isMyOwn(megaChat.karere)) {

                        if(message.meta.attachments) {
                            n = self.notifications.notify(
                                'incoming-attachment',
                                {
                                    'sound': 'incoming_file_transfer',
                                    'group': megaRoom.roomJid,
                                    'incrementCounter': true,
                                    'alwaysPlaySound': true,
                                    'icon': icon,
                                    'params': {
                                        'from': $('.chat-username', $message).text(),
                                        'attachments': message.meta.attachments,
                                        'attachmentsCount': Object.keys(message.meta.attachments).length
                                    }
                                },
                                $message.is('.unread')
                            );
                        } else {
                            n = self.notifications.notify(
                                'incoming-chat-message',
                                {
                                    'sound': 'incoming_chat_message',
                                    'group': megaRoom.roomJid,
                                    'incrementCounter': true,
                                    'icon': icon,
                                    'params': {
                                        'from': $('.chat-username', $message).text()
                                    }
                                },
                                $message.is('.unread')
                            );
                        }
                    } else if($message.is(".inline-dialog") && $message.is('.unread')) {
                        n = self.notifications.notify(
                            'alert-info-message',
                            {
                                'sound': 'alert_info_message',
                                'group': megaRoom.roomJid,
                                'incrementCounter': true,
                                'icon': icon,
                                'params': {
                                    'from': $('.chat-username', $message).text(),
                                    'messageText': $('.chat-message-txt', $message).text()
                                }
                            },
                            $message.is('.unread')
                        );
                    }
                    if(n) {
                        // activate/show room when a notification is clicked
                        n.bind('onClick', function(e) {
                            window.focus();
                            megaRoom.activateWindow();
                            megaRoom.show();
                            if(n.type == "incoming-text-message") {
                                setTimeout(function() {
                                    $('.message-textarea').trigger('focus');
                                }, 1000);
                            }
                        });
                    }
                })
                .unbind('onChatShown.chatNotifications')
                .bind('onChatShown.chatNotifications', function(e) {
                    self.notifications.resetCounterGroup(megaRoom.roomJid);
                })
                .unbind('onIncomingDirectFileTransfer.chatNotifications')
                .bind('onIncomingDirectFileTransfer.chatNotifications', function(e, megaRoom, contactName, attachments, $message) {
                    var icon = $('.nw-contact-avatar img', $message).attr('src');
                    var n = self.notifications.notify(
                        'incoming-attachment',
                        {
                            'sound': 'incoming_file_transfer',
                            'group': megaRoom.roomJid,
                            'incrementCounter': true,
                            'alwaysPlaySound': true,
                            'icon': icon,
                            'params': {
                                'from': contactName,
                                'attachments': attachments,
                                'attachmentsCount': attachments.length
                            }
                        },
                        $message.is('.unread')
                    );

                })
                .unbind('onOutgoingCall.chatNotifications')
                .bind('onOutgoingCall.chatNotifications', function(e, eventData, mediaOptions, callSession) {
                    var sid = eventData.info && eventData.info.sid ? eventData.info.sid : eventData.sid;
                    var n = self.notifications.notify(
                        'outgoing-call',
                        {
                            'sound': megaRoom.isActive() ? 'incoming_voice_video_call' : 'incoming_voice_video_call', // always play sound, when an outgoing call is in progress
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
        .unbind('onIncomingCall.chatNotifications')
        .bind('onIncomingCall.chatNotifications', function(e, room, contactName, avatar, isVideoCall, sid, callSession) {
            var n = self.notifications.notify(
                'incoming-voice-video-call',
                {
                    'sound': room.isActive() ? undefined : 'incoming_voice_video_call',
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

            var evtId = generateEventSuffixFromArguments("", "chatNotifStopSound", rand(10000));
            var stopSound = function(e, session, oldState, newState) {
                if(session.sid == sid) {
                    n.forceStopSound();
                    callSession.unbind('StateChanged' + evtId);
                }
            };

            callSession.bind('StateChanged' + evtId, stopSound);
        })
        .unbind('onCallTerminated.chatNotifications')
        .bind('onCallTerminated', function(e, room) {
            self.notifications.resetCounterGroup(room.roomJid, "incoming-voice-video-call")
        })
        .unbind('onCallAnswered.chatNotifications')
        .bind('onCallAnswered', function(e, room) {
            self.notifications.resetCounterGroup(room.roomJid, "incoming-voice-video-call")
        })
};