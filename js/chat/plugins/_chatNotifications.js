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

                    if(message instanceof KarereEventObjects.IncomingMessage && !message.isMyOwn(megaChat.karere)) {
                        if(message.meta.attachments) {
                            n = self.notifications.notify(
                                'incoming-attachment',
                                {
                                    'sound': 'incoming_file_transfer',
                                    'group': megaRoom.roomJid,
                                    'incrementCounter': true,
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
        })
        .unbind('onIncomingCall.chatNotifications')
        .bind('onIncomingCall.chatNotifications', function(e, room, contactName, avatar, isVideoCall) {
            var n = self.notifications.notify(
                'incoming-voice-video-call',
                {
                    'sound': 'incoming_voice_video_call',
                    'soundLoop': true,
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