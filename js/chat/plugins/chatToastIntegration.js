/**
 * ChatToast class for use with the Chat toaster system
 */
class ChatToast {
    /**
     * Create a toast and then call dispatch() to show the toast
     *
     * @see ChatToaster
     * @param {string} content The text value to be shown to the user when the toast shows.
     * @param {object} options Optional options for how the toast will be shown
     *                  timeout             - The time the toast should be shown for
     *                  persistent          - If the toast will persist on the users screen
     *                                          Note: If a timeout is provided it will be used to dismiss the
     *                                          notification when it has elapsed. Otherwise, when the toast should be
     *                                          cleared update the `updater` function to set the content to be falsy
     *                                          to clear the toast.
     *                  icon [optional]     - An optional icon class string that can be shown on the toast notification
     *                  close [optional]    - An optional boolean if true the toast will include a button to close it
     *                  updater [optional]  - An optional function to update the content of the function.
     *                                          Note: Will be called periodically to check for changes to the toast.
     *                                          If a falsy value is returned by the `render` function after this is
     *                                          called the toast will be hidden.
     *                  onShown [optional]  - An optional function that is called when the toast is first displayed
     *                  onEnd [optional]    - An optional function that is called when the toast will be dismissed
     */
    constructor(content, options = {}) {
        const { timeout, persistent, updater, icon, close, onShown, onEnd } = options;
        this.options = options;
        // eslint-disable-next-line no-use-before-define
        this.setTimeout(timeout || ChatToastIntegration.DEFAULT_TIMEOUT);
        if (persistent) {
            if (!timeout || timeout < 0) {
                this.setTimeout(1e8);
            }
            if (typeof updater === 'undefined') {
                this.setUpdater(nop);
            }
        }
        this.content = content;
        this.setIcon(icon);
        this.setOnShown(onShown || nop);
        this.setUpdater(this.updater || updater);
        this.setClose(typeof close === 'undefined' ? true : close);
        this.setOnEnd(onEnd || nop);
        this.id = '';
    }

    /**
     * Returns the string value of the toast to be shown
     *
     * @returns {string|void} The text to be shown
     */
    render() {
        return this.content;
    }

    /**
     * Helper function to get the values required for the toast.js toaster
     *
     * @returns {array} The values for the toast.js toaster
     */
    renderFM() {
        return [this.render(), this.icon, {timeout: this.timeout, hasClose: this.options.close}];
    }

    /**
     * Call this to dispatch the toast to the ChatToaster
     *
     * @see ChatToaster
     * @returns {ChatToast} this toast
     */
    dispatch() {
        megaChat.trigger('onChatToast', this);
        return this;
    }

    /**
     * Setter for the timeout value
     *
     * @param {number} timeout The timeout value in ms
     * @returns {ChatToast} this toast
     */
    setTimeout(timeout) {
        if (typeof timeout === 'undefined' || timeout < 0) {
            return this;
        }
        this.timeout = timeout;
        return this;
    }

    /**
     * Setter for the optional icon
     *
     * @param {string} icon The icon class
     * @returns {ChatToast} this toast
     */
    setIcon(icon) {
        if (typeof icon === 'undefined') {
            return this;
        }
        this.icon = icon;
        return this;
    }

    /**
     * Setter for the optional close button
     *
     * @param {boolean} haveClose If the toast should have a close button
     * @returns {ChatToast} this toast
     */
    setClose(haveClose) {
        this.close = haveClose;
        return this;
    }

    /**
     * Setter for the optional onShown function
     *
     * @param {function} func The function to be called when the toast is displayed
     * @returns {ChatToast} this toast
     */
    setOnShown(func) {
        if (typeof func !== 'function') {
            return this;
        }
        this.onShown = id => {
            delay('chatToast:onShown', () => {
                func.call(this, id);
            }, 100);
        };
        return this;
    }

    /**
     * Setter for the optional onEnd function
     *
     * @param {function} func The function to be called when the toast is displayed
     * @returns {ChatToast} this toast
     */
    setOnEnd(func) {
        if (typeof func !== 'function') {
            return this;
        }
        this.onEnd = func;
        return this;
    }

    /**
     * Setter for the optional updater function
     *
     * @param {function} func The function to be called when updating the toast
     * @returns {ChatToast} this toast
     */
    setUpdater(func) {
        if (typeof func !== 'function') {
            return this;
        }
        this.updater = func;
        return this;
    }

    /**
     * Return the time the toast will show for
     *
     * @returns {number} The display time of the toast
     */
    getTTL() {
        // eslint-disable-next-line no-use-before-define
        return this.timeout || (this.options.persistent ? 1e8 : ChatToastIntegration.DEFAULT_TIMEOUT);
    }
}

/**
 * Helper to simply dispatch a toast
 *
 * @param {string} msg The message for the toast.
 * @param {string} icon [Optional] The icon to use for the toast. Default ''
 * @param {boolean} close [Optional] If the toast should have a close button. Default true
 * @returns {ChatToast} The dispatched toast
 */
ChatToast.quick = function(msg, icon, close) {
    'use strict';
    icon = icon || '';
    close = close ? true : close;
    const toast = new ChatToast(msg, {icon, close});
    toast.dispatch();
    return toast;
};

/**
 * Helper function that can be used for ChatToast.setUpdater to clear the value of the toast
 *
 * @see ChatToast.setUpdater
 * @returns {void} void
 */
ChatToast.clearValue = function() {
    'use strict';
    this.content = '';
};

ChatToast.flush = () => {
    'use strict';
    megaChat.trigger('onChatToastFlush');
};

class ChatToastIntegration {

    /**
     * ChatToastIntegration
     * @description Simple class which should link the `window.toaster` and `Chat`
     * @param megaChat {Chat}
     * @returns {ChatToastIntegration}
     * @constructor
     */

    constructor(megaChat) {
        const { chatd } = megaChat.plugins.chatdIntegration;
        const { SOUNDS } = megaChat;
        if (chatd) {
            chatd.rebind('onOpen.cTI', () => {
                if (!megaChat.allChatsHadInitialLoadedHistory() || !mega.active) {
                    return;
                }
                delay(
                    'chatdOpen.cTI',
                    /* `Chat is now back online` */
                    () => ChatToast.quick(l.chat_online, 'sprite-fm-mono icon-chat-filled'),
                    300
                );
            });
            chatd.rebind('onClose.cTI', () => {
                if (!mega.active) {
                    return;
                }
                delay(
                    'chatdClose.cTI',
                    /* `Chat is now offline` */
                    () => ChatToast.quick(l.chat_offline, 'sprite-fm-mono icon-chat-filled'),
                    300
                );
            });
        }
        megaChat
            .rebind('onRoomInitialized.cTI', (e, megaRoom) => {
                let playingSound = false;
                megaRoom
                    .rebind('onCallPeerJoined.cTI', (e, userHandle) => {
                        const name = nicknames.getNickname(userHandle);
                        this.batchNotifications(
                            'onCallPeerJoined',
                            this.getTrimmedName(name),
                            {
                                close: true,
                                cb: () => {
                                    if (!playingSound && !mega.config.get('callinout')) {
                                        ion.sound.stop(SOUNDS.CALL_JOIN);
                                        ion.sound.play(SOUNDS.CALL_JOIN);
                                    }
                                },
                                joiner: (arr) => {
                                    if (arr.length === 1) {
                                        /* `%s joined the call` */
                                        return l[24152].replace('%s', arr[0]);
                                    }
                                    else if (arr.length === 2) {
                                        /* `%s1 and %s2 joined the call` */
                                        return l[24153].replace('%s1', arr[0]).replace('%s2', arr[1]);
                                    }
                                    return mega.icu.format(
                                        /* `%s and # other(s) joined the call` */
                                        l.chat_call_joined_multi,
                                        arr.length - 1
                                    ).replace('%s', arr[0]);
                                }
                            }
                        );
                    })
                    .rebind('onCallPeerLeft.cTI', (e, { userHandle }) => {
                        if (navigator.onLine) {
                            if (window.sfuClient && window.sfuClient.isLeavingCall) {
                                // Don't show leaving toasts if we are leaving.
                                return;
                            }
                            const name = nicknames.getNickname(userHandle);
                            if (megaRoom.type === 'private') {
                                // 1-1 call will show disconnect instead of showing peer left message.
                                return;
                            }
                            this.batchNotifications(
                                'onCallPeerLeft',
                                this.getTrimmedName(name),
                                {
                                    close: true,
                                    cb: () => {
                                        if (!mega.config.get('callinout')) {
                                            playingSound = true;
                                            ion.sound.stop(SOUNDS.CALL_JOIN);
                                            ion.sound.stop(SOUNDS.CALL_LEFT);
                                            ion.sound.play(SOUNDS.CALL_LEFT);
                                        }

                                        onIdle(() => {
                                            playingSound = false;
                                        });
                                    },
                                    joiner: (arr) => {
                                        if (arr.length === 1) {
                                            /* `%s left the call` */
                                            return l[24154].replace('%s', arr[0]);
                                        }
                                        else if (arr.length === 2) {
                                            /* `%s1 and %s2 left the call` */
                                            return l[24155].replace('%s1', arr[0]).replace('%s2', arr[1]);
                                        }
                                        return mega.icu.format(
                                            /* `%s and # other(s) left the call` */
                                            l.chat_call_left_multi,
                                            arr.length - 1
                                        ).replace('%s', arr[0]);
                                    }
                                }
                            );
                        }
                    })
                    .rebind('onCallIJoined.cTI', () => {
                        const initialPriv = megaRoom.members[u_handle];
                        megaRoom.rebind('onMembersUpdated.cTI', ({ data }) => {
                            const { userId, priv } = data;
                            if (
                                userId === u_handle &&
                                priv === ChatRoom.MembersSet.PRIVILEGE_STATE.OPERATOR &&
                                initialPriv !== ChatRoom.MembersSet.PRIVILEGE_STATE.OPERATOR
                            ) {
                                ChatToast.quick(
                                    l.chosen_moderator /* `You were chosen to be the moderator of this call` */,
                                    'sprite-fm-mono icon-chat-filled'
                                );
                            }
                        });
                    })
                    .rebind('onCallPrivilegeChange', (e, userHandle, privilege) => {
                        const name = nicknames.getNickname(userHandle);
                        const role = privilege === ChatRoom.MembersSet.PRIVILEGE_STATE.OPERATOR
                            ? l.chat_user_role_change_op
                            : l.chat_user_role_change_std;

                        ChatToast.quick(
                            /* %NAME was changed to %ROLE */
                            role.replace('%NAME', this.getTrimmedName(name)),
                            'sprite-fm-mono icon-chat-filled'
                        );
                    })
                    .rebind('onNoMicInput.cTI', () => {
                        if (megaRoom.call) {
                            ChatToast.quick(
                                l.chat_mic_off_toast /* Your mic is not working */,
                                'sprite-fm-mono icon-audio-off'
                            );
                        }
                    })
                    .rebind('onBadNetwork.cTI', e => {
                        if (e.data) {
                            if (this.poorConnToast) {
                                return;
                            }
                            this.poorConnToast = new ChatToast(
                                l.poor_connection,
                                {
                                    persistent: true,
                                    icon: 'sprite-fm-uni icon-hazard',
                                    onEnd: () => {
                                        if (this.poorConnToast) {
                                            // Propagate close to everywhere else and remove the reference
                                            this.poorConnToast.setUpdater(ChatToast.clearValue);
                                            delete this.poorConnToast;
                                        }
                                    },
                                    updater: function() {
                                        if (!megaRoom.call) {
                                            this.content = '';
                                        }
                                    }
                                }
                            );
                            this.poorConnToast.dispatch();
                        }
                        else if (this.poorConnToast) {
                            this.poorConnToast.setUpdater(ChatToast.clearValue);
                        }
                    })
                    .rebind('onRetryTimeout.cTI', () => {
                        if (this.reconnectingSfu && this.reconnectingSfu.updater === nop) {
                            // Reconnecting toast is present and has the default updater so clear it
                            this.reconnectingSfu.setUpdater(ChatToast.clearValue);
                        }
                        const retryFailToast = new ChatToast(
                            l.reconnect_failed /* `Unable to reconnect` */,
                            {
                                icon: 'sprite-fm-uni icon-hazard',
                                close: true,
                                timeout: 5000
                            }
                        );
                        retryFailToast.dispatch();
                    })
                    .rebind('onCallLeft.cTI', () => {
                        megaRoom.unbind('onMembersUpdated.cTI');
                        // If the call ends (sfuConnections are terminated) check for the reconnecting notif & close it.
                        this.sfuConnOpen();
                    });
            })
            .rebind('sfuConnOpen.cTI', () => this.sfuConnOpen())
            .rebind('sfuConnClose.cTI', () => this.sfuConnClose());
    }
    sfuConnClose() {
        if (!this.reconnectingSfu) {
            this.reconnectingSfu = new ChatToast(
                l.reconnecting /* `Reconnecting...` */,
                {
                    icon: 'sprite-fm-uni icon-hazard',
                    persistent: true,
                    onEnd: () => {
                        if (this.reconnectingSfu) {
                            // Propagate close to everywhere else and remove the reference
                            this.reconnectingSfu.setUpdater(ChatToast.clearValue);
                            delete this.reconnectingSfu;
                        }
                    },
                }
            );
            this.reconnectingSfu.dispatch();
        }
    }
    sfuConnOpen() {
        if (this.reconnectingSfu) {
            this.reconnectingSfu.setUpdater(ChatToast.clearValue);
        }
        const { disconnectNotification } = megaChat.plugins.chatNotifications;
        if (disconnectNotification) {
            disconnectNotification.close();
        }
    }
    getTrimmedName(name) {
        const { MAX_NAME_CHARS } = ChatToastIntegration;
        const IN_CALL = document.body.classList.contains('in-call');

        if (IN_CALL) {
            return name.length > MAX_NAME_CHARS ? `${name.substr(0, MAX_NAME_CHARS)}...` : name;
        }

        return name;
    }
}

ChatToastIntegration.MAX_NAME_CHARS = 25;
ChatToastIntegration.DEFAULT_TIMEOUT = 2000;
ChatToastIntegration.DEFAULT_OPTS = { timeout: ChatToastIntegration.DEFAULT_TIMEOUT };

/**
 * BatchChatToast class for use with the Chat toaster system
 */
class BatchChatToast extends ChatToast {
    /**
     * Create a batch of similar toast messages to be shown as one toast
     *
     * @see ChatToast
     * @see ChatToastIntegration.batchNotifications
     * @see BatchChatToast.BATCHES
     * @param {string} id The batch id this toast belongs to
     * @param {string|array} content The initial content to be added to the batch
     * @param {object} options See ChatToast for the inherited options.
     *                  joiner [optional]   - The optional function to join the batched messages into a single string
     *                                          Receives an array of strings then return a string combining them
     *                                          Default: ['a', 'b'] => 'a and b'; ['a', 'b', 'c'] => 'a, b and c';
     */
    constructor(id, content = [], options = {}) {
        super('', options);
        this.id = id;
        this.content = Array.isArray(content) ? content : [content];
        this.setJoiner(options.joiner && typeof options.joiner === 'function' ? options.joiner : arr => {
            return mega.utils.trans.listToString(arr, '[X]');
        });
    }

    /**
     * Add a value to the batch
     *
     * @param {string} content The value to be added
     * @returns {BatchChatToast} this toast
     */
    addContent(content) {
        this.content.push(content);
        return this;
    }

    /**
     * Setter for the joiner function
     *
     * @param {function} func The function that joins the batched content.
     * @returns {BatchChatToast} this toast
     */
    setJoiner(func) {
        if (typeof func !== 'function') {
            return this;
        }
        this._joiner = func;
        return this;
    }

    /**
     * Call this function after the toast has been configured or updated to prepare it to be dispatched automatically
     *
     * @returns {BatchChatToast} this toast
     */
    initDispatcher() {
        if (typeof this.maxTime === 'undefined') {
            this.maxTime = Date.now() + 2000;
        }
        if (typeof this.listener === 'undefined') {
            this.listener = setTimeout(
                () => {
                    this.dispatch();
                },
                1000
            );
            this.dispTime = Date.now() + 1000;
        }
        else if (this.dispTime !== this.maxTime) {
            clearTimeout(this.listener);
            this.listener = setTimeout(
                () => {
                    this.dispatch();
                },
                this.maxTime - this.dispTime
            );
            this.dispTime = this.maxTime;
        }
        return this;
    }

    /**
     * Call this function to manually dispatch the batched notification
     *
     * @returns {BatchChatToast} this toast
     */
    dispatch() {
        if (this.listener) {
            clearTimeout(this.listener);
            delete this.listener;
        }
        super.dispatch();
        if (this.id && BatchChatToast.BATCHES[this.id]) {
            delete BatchChatToast.BATCHES[this.id];
        }
        return this;
    }

    /**
     * Returns the text value for the toast that was joined together by the joiner function
     *
     * @returns {string} The toast value
     */
    render() {
        return this._joiner(super.render());
    }
}

BatchChatToast.BATCHES = Object.create(null);

/**
 * Helper function to creating a batch notification or to add values to an existing one
 */
ChatToastIntegration.prototype.batchNotifications = (function() {
    'use strict';
    return function(batchId, content, {joiner, icon, cb, timeout} = {}) {
        if (typeof BatchChatToast.BATCHES[batchId] === 'undefined') {
            BatchChatToast.BATCHES[batchId] = new BatchChatToast(batchId);
        }
        BatchChatToast.BATCHES[batchId]
            .addContent(content)
            .setJoiner(joiner)
            .initDispatcher()
            .setTimeout(timeout)
            .setIcon(icon)
            .setOnShown(cb);
    };
})();
