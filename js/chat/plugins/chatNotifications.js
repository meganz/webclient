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


    //self.notifications
    //    .unbind('onCounterUpdated.chat')
    //    .bind('onCounterUpdated.chat', function(megaNotifications, group, notifObj) {
    //        megaChat.renderContactTree();
    //    });

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
                .bind('onOutgoingCall.chatNotifications', function(e, eventData) {
                    var sid = eventData.info && eventData.info.sid ? eventData.info.sid : eventData.sid;
                    var n = self.notifications.notify(
                        'outgoing-call',
                        {
                            'sound': megaRoom.megaChat.activeCallRoom ? undefined : 'incoming_voice_video_call',
                            'soundLoop': true,
                            'alwaysPlaySound': true,
                            'group': megaRoom.roomJid,
                            'incrementCounter': false,
                            'icon': avatars[u_handle],
                            'params': {
                                'room': megaRoom,
                                'from': generateAvatarMeta(u_handle).fullName,
                                'isVideoCall': megaRoom.options.mediaOptions.video
                            }
                        },
                        !megaRoom.isActive()
                    );
                    n.bind('onClick', function(e) {
                        window.focus();
                        room.show();
                    });

                    var evtId = generateEventSuffixFromArguments("", "chatNotifStopSoundOut", rand(10000));
                    var stopSound = function(e, eventData) {
                        var sid2 = eventData.info && eventData.info.sid ? eventData.info.sid : eventData.sid;
                        if(sid2 == sid) {
                            n.forceStopSound();
                            megaRoom.unbind('onCallAnswered' + evtId);
                            megaRoom.unbind('call-init' + evtId);
                            megaRoom.unbind('onCallDeclined' + evtId);
                            megaRoom.unbind('call-canceled' + evtId);
                            megaRoom.unbind('call-declined' + evtId);
                            megaRoom.unbind('call-canceled-caller' + evtId);
                        }
                    };

                    megaRoom.bind('onCallAnswered' + evtId, stopSound);
                    megaRoom.bind('call-init' + evtId, stopSound);
                    megaRoom.bind('onCallDeclined' + evtId, stopSound);
                    megaRoom.bind('call-canceled' + evtId, stopSound);
                    megaRoom.bind('call-declined' + evtId, stopSound);
                    megaRoom.bind('call-canceled-caller' + evtId, stopSound);
                })
        })
        .unbind('onIncomingCall.chatNotifications')
        .bind('onIncomingCall.chatNotifications', function(e, room, contactName, avatar, isVideoCall, sid) {
            var n = self.notifications.notify(
                'incoming-voice-video-call',
                {
                    'sound': room.megaChat.activeCallRoom ? undefined : 'incoming_voice_video_call',
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
                room.show();
            });

            var evtId = generateEventSuffixFromArguments("", "chatNotifStopSound", rand(10000));
            var stopSound = function(e, eventData) {
                var sid2 = eventData.info && eventData.info.sid ? eventData.info.sid : eventData.sid;
                if(sid2 == sid) {
                    n.forceStopSound();
                    room.unbind('onCallAnswered' + evtId);
                    room.unbind('onCallDeclined' + evtId);
                    room.unbind('call-canceled' + evtId);
                    room.unbind('call-declined' + evtId);
                }
            };

            room.bind('onCallAnswered' + evtId, stopSound);
            room.bind('onCallDeclined' + evtId, stopSound);
            room.bind('call-canceled' + evtId, stopSound);
            room.bind('call-declined' + evtId, stopSound);
        })
        .unbind('onCallSuspended.chatNotifications')
        .bind('onCallSuspended', function(e, room) {
            self.notifications.resetCounterGroup(room.roomJid, "incoming-voice-video-call")
        })
        .unbind('onCallAnswered.chatNotifications')
        .bind('onCallAnswered', function(e, room) {
            self.notifications.resetCounterGroup(room.roomJid, "incoming-voice-video-call")
        })
};