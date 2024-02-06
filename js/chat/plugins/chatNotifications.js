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

    // Service worker events.
    const chatNotifActions = {
        CLICK: 'click',
        CLOSE: 'close',
        SCHED_STARTING_JOIN: 'sched_starting_join',
        SCHED_STARTING_MSG: 'sched_starting_msg',
    };

    options = options || {};

    options.parentLogger = megaChat.logger;
    options.anfFlag = "chat_enabled";

    self.notifications = new MegaNotifications(options);
    self._incomingDialogContainers = {};

    const { SOUNDS } = megaChat;

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
                        !uiElement
                    ) {
                        return;
                    }

                    var lastSeen = null;
                    megaRoom.messagesBuff.messages.forEach(function (v) {
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
                // eslint-disable-next-line complexity -- @todo refactor & fix..
                .rebind('onMessagesBuffAppend.chatNotifications', async(e, message) => {
                    megaChat.updateSectionUnreadCount();

                    let fromContact = null;
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

                    let {avatarUrl, fullName} = fromContact ? generateAvatarMeta(fromContact.u) : {};
                    if (!fullName && fromContact) {
                        fullName = await M.syncUsersFullname(fromContact.u).catch(dump);
                    }

                    let n;

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
                                    sound: SOUNDS.INCOMING_MSG,
                                    'group': megaRoom.chatId,
                                    'incrementCounter': unreadFlag,
                                    'icon': avatarUrl,
                                    'anfFlag': 'chat_enabled',
                                    'params': {
                                        'from': fullName,
                                        type: megaRoom.type,
                                        roomTitle: megaRoom.getRoomTitle(),
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
                                sound: SOUNDS.ALERT,
                                'group': megaRoom.chatId,
                                'incrementCounter': true,
                                'anfFlag': 'chat_enabled',
                                'icon': avatarUrl,
                                'params': {
                                    'from': fullName,
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
                                tSleep(1).then(() => {
                                    $('.message-textarea:visible').trigger('focus');
                                });
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
                    ion.sound.play(SOUNDS.RECONNECT);
                    if (chatRoom.call.isSharingScreen()) {
                        chatRoom.call.toggleScreenSharing();
                    }
                    self.disconnectNotification.onclick = () => {
                        window.focus();
                        self.disconnectNotification.close();
                    };
                });
        })
        .rebind('onIncomingCall.chatNotifications', (e, chatRoom, callId, userId, callManager) => {

            if (
                !pushNotificationSettings.isAllowedForChatId(chatRoom.chatId) ||
                is_chatlink ||
                chatRoom.options.w && (is_eplusplus || megaChat.initialChatId)
            ) {
                return;
            }

            const notificationSound = SOUNDS.INCOMING_CALL;
            const notification = this.notifications.notify(
                'incoming-voice-video-call',
                {
                    'sound': window.sfuClient ? null : notificationSound,
                    'soundLoop': true,
                    'alwaysPlaySound': !window.sfuClient,
                    'group': chatRoom.chatId,
                    'incrementCounter': true,
                    'anfFlag': 'chat_enabled',
                    'icon': useravatar.contact(userId, '', 'div', undefined),
                    'params': {
                        'room': chatRoom,
                        'from': M.getNameByHandle(userId)
                    }
                },
                !chatRoom.isActive()
            );

            notification.on('onClick', () => {
                window.focus();
                chatRoom.activateWindow();
                chatRoom.show();
            });

            const evtId = generateEventSuffixFromArguments('', 'chatNotifStopSound', rand(10000));
            const removeNotification = e => {
                if (e.data.callId === callId || !chatRoom.ringingCalls.exists(callId)) {
                    if (this._incomingDialogContainers[callId]) {
                        const node = this._incomingDialogContainers[callId];
                        ReactDOM.unmountComponentAtNode(node);
                        node.parentNode.removeChild(node);
                        delete this._incomingDialogContainers[callId];
                    }
                    notification.forceStopSound(notificationSound);
                    callManager.off(`onRingingStopped${evtId}`);
                    callManager.off(`onRoomDisconnected${evtId}`);
                }
            };

            let videoEnabled = false;

            const dialogContainer = document.createElement('div');
            const triggerRingingStopped = () => {
                chatRoom.ringingCalls.clear();
                megaChat.plugins.callManager2.trigger('onRingingStopped', {
                    callId: callId,
                    chatRoom: chatRoom
                });
            };
            const dialog = React.createElement(ChatCallIncomingDialog, {
                key: chatRoom.chatId,
                chatRoom,
                callerId: chatRoom.ringingCalls[callId],
                onClose: () => triggerRingingStopped(),
                onAnswer: () => {
                    chatRoom.activateWindow();
                    chatRoom.show();
                    chatRoom.joinCall(true, videoEnabled);
                    triggerRingingStopped();
                },
                onToggleVideo: newVal => {
                    videoEnabled = !newVal;
                },
                onReject: () => {
                    chatRoom.rejectCall();
                    triggerRingingStopped();
                },
                onSwitch: () => {
                    if (window.sfuClient) {
                        window.sfuClient.app.destroy();
                    }
                    chatRoom.activateWindow();
                    chatRoom.show();
                    chatRoom.joinCall(true, videoEnabled);
                    triggerRingingStopped();
                }
            });

            this._incomingDialogContainers[callId] = dialogContainer;
            document.body.append(dialogContainer);
            ReactDOM.render(dialog, dialogContainer);

            callManager.on(`onRingingStopped${evtId}`, removeNotification);
            chatRoom.on(`onRoomDisconnected${evtId}`, triggerRingingStopped);
            chatRoom.on(`onCallLeft${evtId}`, () => {
                notification.setUnread(false);
                megaChat.updateSectionUnreadCount();
                chatRoom.off(`onCallLeft${evtId}`);
            });
        })
        .rebind('onOutgoingCallRinging', (e, megaRoom, callId, userId, callManager) => {

            var n = self.notifications.notify(
                'outgoing-call',
                {
                    'sound': SOUNDS.INCOMING_CALL,
                    'soundLoop': true,
                    'alwaysPlaySound': true,
                    'group': megaRoom.chatId,
                    'incrementCounter': false,
                    'icon': avatars[u_handle],
                    'anfFlag': 'chat_enabled',
                    'params': {
                        'room': megaRoom,
                        'from': M.getNameByHandle(u_handle)
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
        })
        .rebind('onLocalMediaError.chatNotifications', (e, errObj) => {
            if (errObj && errObj.screen) {
                self.notifications.notify(
                    'screen-share-error',
                    { anfFlag: 'chat_enabled' },
                    true
                );
            }
        })
        .rebind('onScheduleUpcoming.chatNotifications', ({ data: meeting }) => {
            const n = this.notifications.notify(
                'upcoming-scheduled-occurrence',
                { anfFlag: 'chat_enabled', meeting, sound: SOUNDS.INCOMING_MSG, group: `schedUp-${meeting.id}`, },
                true
            );
            n.on('onClick', () => {
                window.focus();
                meeting.chatRoom.activateWindow();
                meeting.chatRoom.show();
            });
        })
        .rebind('onScheduleStarting.chatNotifications', ({ data: meeting }) => {
            this.notifications.notify(
                'starting-scheduled-occurrence',
                {
                    anfFlag: 'chat_enabled',
                    group: `schedStart-${meeting.id}`,
                    sound: SOUNDS.INCOMING_MSG,
                    actions: [
                        {
                            action: chatNotifActions.SCHED_STARTING_JOIN,
                            title: l.join_chat_button, /* `Join` */
                        },
                        {
                            action: chatNotifActions.SCHED_STARTING_MSG,
                            title: l.notif_opt_message, /* `Message` */
                        }
                    ],
                    meeting,
                    data: {
                        meetingId: meeting.id,
                        url: `${getBaseUrl()}/${meeting.chatRoom.getRoomUrl()}`,
                    }
                },
                true
            );
        });

    const serviceWorkerHandler = (ev) => {
        const {action, data} = ev.data;
        switch (action) {
            case chatNotifActions.CLICK: {
                if (data && data.meetingId) {
                    megaChat.openScheduledMeeting(data.meetingId, true);
                    delay('chat-event-sm-join-notification', () => eventlog(99926));
                }
                else if (d) {
                    megaChat.logger.warn('Invalid message action from service worker.', ev.data);
                }
                break;
            }
            case chatNotifActions.SCHED_STARTING_MSG: {
                if (data && data.meetingId) {
                    megaChat.openScheduledMeeting(data.meetingId);
                    delay('chat-event-sm-msg-notification', () => eventlog(99927));
                }
                else if (d) {
                    megaChat.logger.warn('Invalid service worker reply for SCHED_STARTING_MSG', ev.data);
                }
                break;
            }
            case chatNotifActions.SCHED_STARTING_JOIN: {
                if (data && data.meetingId) {
                    megaChat.openScheduledMeeting(data.meetingId, true);
                    delay('chat-event-sm-join-notification', () => eventlog(99926));
                }
                else if (d) {
                    megaChat.logger.warn('Invalid service worker reply for SCHED_STARTING_JOIN', ev.data);
                }
                break;
            }
            case chatNotifActions.CLOSE: {
                // Be aware that this will be triggered in addition to any other actions.
                break;
            }
            default: {
                megaChat.logger.warn('Invalid message action from service worker.', ev.data);
            }
        }
    };

    if (!is_chatlink && mega.pendingServiceWorkerHandler) {

        // Process the pending messages when chat has finished loading.
        megaChat.rebind('onInit.swPending', SoonFc(500, () => {
            megaChat.off('onInit.swPending');

            const msg = mega.pendingServiceWorkerMsgs;

            for (let i = 0; i < msg.length; i++) {
                const data = msg[i];
                serviceWorkerHandler({data});
            }
            navigator.serviceWorker.addEventListener('message', serviceWorkerHandler);
            navigator.serviceWorker.removeEventListener('message', mega.pendingServiceWorkerHandler);

            delete mega.pendingServiceWorkerMsgs;
            delete mega.pendingServiceWorkerHandler;
        }));
    }
};
