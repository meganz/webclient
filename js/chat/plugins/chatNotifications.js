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
    self._incomingDialogContainers = {};

    megaChat
        .rebind('onRoomInitialized.chatNotifications', function(e, megaRoom) {
            var resetChatNotificationCounters = function() {
                if (megaRoom.isCurrentlyActive) {
                    var cnSel = '.conversation-panel[data-room-id="' + megaRoom.chatId + '"]';
                    var uiElement = document.querySelector(cnSel);

                    if (
                        !megaRoom.scrolledToBottom ||
                        // Meetings call w/o chat sidebar opened
                        document.querySelector('body.in-call') && !document.querySelector('.chat-opened') ||
                        // Regular call w/o messages area opened
                        !uiElement ||
                        uiElement.querySelector('.call-block') &&
                        !uiElement.querySelector('.call-block.small-block')
                    ) {
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

                        if (
                            pushNotificationSettings.isAllowedForChatId(megaRoom.chatId) &&
                            message.source === Message.SOURCE.CHATD
                        ) {
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
                        if (!pushNotificationSettings.isAllowedForChatId(megaRoom.chatId)) {
                            return;
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
                .rebind('ChatDisconnected.chatNotifications', ev => {
                    const chatRoom = ev.data;
                    self.disconnectNotification = new Notification(chatRoom.getRoomTitle(), { body: l.chat_offline });
                    ion.sound.play('reconnecting');
                    if (chatRoom.activeCall.isSharingScreen()) {
                        chatRoom.activeCall.toggleScreenSharing();
                    }
                    self.disconnectNotification.onclick = () => {
                        window.focus();
                        self.disconnectNotification.close();
                    };
                })
                .rebind('onLocalMediaError.chatNotifications', (e, errAv) => {
                    if (errAv & SfuClient.Av.Screen) {
                        self.notifications.notify(
                            'screen-share-error',
                            {
                                anfFlag: 'chat_enabled',
                            },
                            true
                        );
                    }
                });
        })
        .rebind('onIncomingCall.chatNotifications', function(e, room, callId, userId, callManager) {

            if (!pushNotificationSettings.isAllowedForChatId(room.chatId)) {
                return;
            }
            if (
                megaChat.initialPubChatHandle && megaChat.initialPubChatHandle === room.publicChatHandle ||
                megaChat.initialChatId && megaChat.initialChatId === room.chatId
            ) {
                return;
            }
            if (is_chatlink) {
                return;
            }

            let name = M.getNameByHandle(userId);
            let avatar = useravatar.contact(userId, '', 'div');

            var n = self.notifications.notify(
                'incoming-voice-video-call',
                {
                    'sound': window.sfuClient ? null : 'incoming_voice_video_call',
                    'soundLoop': true,
                    'alwaysPlaySound': !window.sfuClient,
                    'group': room.chatId,
                    'incrementCounter': true,
                    'anfFlag': 'chat_enabled',
                    'icon': avatar,
                    'params': {
                        'room': room,
                        'from': name
                    }
                },
                !room.isActive()
            );

            n.on('onClick', function() {
                window.focus();
                room.activateWindow();
                room.show();
            });

            var evtId = generateEventSuffixFromArguments("", "chatNotifStopSound", rand(10000));
            var removeNotif = function(e) {
                if (e.data.callId === callId || !room.ringingCalls.exists(callId)) {
                    if (self._incomingDialogContainers[callId]) {
                        const node = self._incomingDialogContainers[callId];
                        ReactDOM.unmountComponentAtNode(node);
                        node.parentNode.removeChild(node);
                        delete self._incomingDialogContainers[callId];
                    }
                    n.forceStopSound();
                    callManager.off('onRingingStopped' + evtId);
                }
            };

            let videoEnabled = false;

            const dialogContainer = document.createElement('div');
            const triggerRingingStopped = () => {
                room.ringingCalls.clear();
                megaChat.plugins.callManager2.trigger('onRingingStopped', {
                    callId: callId,
                    chatRoom: room
                });
            };
            const dialog = React.createElement(ChatCallIncomingDialog, {
                key: room.chatId,
                chatRoom: room,
                onClose: () => triggerRingingStopped(),
                callerId: room.ringingCalls[callId],
                onAnswer: () => {
                    room.activateWindow();
                    room.show();
                    room.joinCall(true, videoEnabled);
                    triggerRingingStopped();
                },
                onToggleVideo: newVal => {
                    videoEnabled = !newVal;
                },
                onReject: () => {
                    room.rejectCall();
                    triggerRingingStopped();
                },
                onSwitch: () => {
                    if (window.sfuClient) {
                        window.sfuClient.app.destroy();
                    }
                    room.activateWindow();
                    room.show();
                    room.joinCall(true, videoEnabled);
                    triggerRingingStopped();
                }
            });

            self._incomingDialogContainers[callId] = dialogContainer;
            document.body.append(dialogContainer);
            ReactDOM.render(dialog, dialogContainer);

            callManager.on('onRingingStopped' + evtId, removeNotif);
            room.on(`onCallEnd${evtId}`, () => {
                n.setUnread(false);
                megaChat.updateSectionUnreadCount();
                room.off(`onCallEnd${evtId}`);
            });
        })
        .rebind('onOutgoingCallRinging', (e, megaRoom, callId, userId, callManager) => {

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
                        'from': generateAvatarMeta(u_handle).fullName
                    }
                },
                !megaRoom.isActive()
            );

            n.on('onClick', function() {
                window.focus();
                megaRoom.activateWindow();
                megaRoom.show();
            });


            var evtId = generateEventSuffixFromArguments("", "chatNotifStopSound", rand(10000));
            var removeNotif = function(e) {
                if (e.data.callId === callId) {
                    n.forceStopSound();
                    callManager.off('onRingingStopped' + evtId);
                }
            };

            callManager.on('onRingingStopped' + evtId, removeNotif);

        })
        .rebind('onCallAnswered.chatNotifications', function(e, room) {
            self.notifications.resetCounterGroup(room.chatId, "incoming-voice-video-call");
        });
};
