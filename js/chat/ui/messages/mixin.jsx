import React from 'react';
import {ContactAwareComponent} from '../../mixins';
import {Button} from "../../../ui/buttons.jsx";
import {DropdownEmojiSelector} from "../../../ui/emojiDropdown.jsx";

class ConversationMessageMixin extends ContactAwareComponent {

    attachRerenderCallbacks  = false;
    _reactionContactHandles = [];

    constructor(props) {
        super(props);
        this.__cmmUpdateTickCount = 0;
        this._contactChangeListeners = false;
        this.onAfterRenderWasTriggered = false;

        /** @property __cmmId */
        lazy(this, '__cmmId', () => {
            return this.getUniqueId() + '--' + String(Math.random()).slice(-7);
        });

        this._emojiOnActiveStateChange = this._emojiOnActiveStateChange.bind(this);
        this.emojiSelected = this.emojiSelected.bind(this);

        const {message: msg} = this.props;
        if (
            msg instanceof Message
            && msg._reactions
            && msg.messageId.length === 11
            && msg.isSentOrReceived()
            && !Object.hasOwnProperty.call(msg, 'reacts')) {

            msg.reacts.forceLoad().then(() => {
                this.addContactListenerIfMissing(this._reactionContacts());
            }).catch(dump.bind(null, `reactions.load.${msg.messageId}`));
        }
    }

    UNSAFE_componentWillMount() {
        if (super.UNSAFE_componentWillMount) {
            super.UNSAFE_componentWillMount();
        }

        const chatRoom = this.props.chatRoom;
        if (chatRoom) {
            chatRoom
                .rebind('onChatShown.' + this.__cmmId, () => {
                    if (!this._contactChangeListeners) {
                        this.addContactListeners();
                    }
                })
                .rebind('onChatHidden.' + this.__cmmId, () => {
                    if (this._contactChangeListeners) {
                        this.removeContactListeners();
                    }
                });
        }

        this.addContactListeners();
    }

    haveMeetingsCall() {
        // Meetings call is currently ongoing and the `HistoryPanel` is active?
        return document.querySelector('.meetings-call') && document.querySelector('.chat-opened');
    }

    removeContactListeners() {
        const users = this._contactChangeListeners;

        if (d > 3) {
            console.warn('%s.removeContactListeners', this.getReactId(), [this], users);
        }

        for (let i = users.length; i--;) {
            users[i].removeEventHandler(this);
        }

        this._contactChangeListeners = false;
    }

    _reactionContacts() {
        const { message } = this.props;
        const { reacts } = message;
        const handles = [];
        const reactions = Object.values(reacts.reactions);
        for (let i = 0; i < reactions.length; i++) {
            handles.push(...Object.keys(reactions[i]));
        }
        this._reactionContactHandles = array.unique(handles);
        return this._reactionContactHandles;
    }

    addContactListeners() {
        const users = this._contactChangeListeners || [];
        const addUser = (user) => {
            if (user instanceof MegaDataMap && users.indexOf(user) < 0) {
                users.push(user);
            }
        };

        addUser(this.getContact());

        if (this.haveMoreContactListeners) {
            var moreIds = this.haveMoreContactListeners();
            if (moreIds) {
                for (let i = moreIds.length; i--;) {
                    var handle = moreIds[i];
                    addUser(handle in M.u && M.u[handle]);
                }
            }
        }

        for (let i = this._reactionContactHandles.length; i--;) {
            addUser(this._reactionContactHandles[i] in M.u && M.u[this._reactionContactHandles[i]]);
        }

        if (d > 3) {
            console.warn('%s.addContactListeners', this.getReactId(), [this], users);
        }

        for (let i = users.length; i--;) {
            users[i].addChangeListener(this);
        }
        this._contactChangeListeners = users;
    }

    addContactListenerIfMissing(contacts) {
        if (!this._contactChangeListeners) {
            // Unmounted or not shown (race).
            return false;
        }
        if (!Array.isArray(contacts)) {
            contacts = [contacts];
        }
        const added = [];

        for (let i = 0; i < contacts.length; i++) {
            const user = M.u[contacts[i]];
            if (user && !this._contactChangeListeners.includes(user)) {
                this._contactChangeListeners.push(user);
                user.addChangeListener(this);
                added.push(user.h);
            }
        }
        if (d > 1) {
            console.warn('%s.addContactListenerIfMissing', this.getReactId(), [this], added);
        }
    }

    eventuallyUpdate() {
        super.eventuallyUpdate();
        this.__cmmUpdateTickCount = -2;
    }

    handleChangeEvent(x, z, k) {
        // no updates needed in case of 'ts' or 'ats' change
        // e.g. reduce recursion of full history re-render in case of a new message is sent to a room.
        if (k === 'ts' || k === 'ats') {
            return;
        }
        // console.warn('xyz', this.__cmmUpdateTickCount, this.__cmmId, [this]);

        if (this.isComponentEventuallyVisible()) {

            if (++this.__cmmUpdateTickCount > 5) {

                this.eventuallyUpdate();
                delay.cancel(this.__cmmId);
            }
            else {

                delay(this.__cmmId, () => this.eventuallyUpdate(), 90);
            }
        }
        else {
            this._requiresUpdateOnResize = true;
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();

        const chatRoom = this.props.chatRoom;
        if (chatRoom) {
            chatRoom.off('onChatShown.' + this.__cmmId).off('onChatHidden.' + this.__cmmId);
        }

        if (this._contactChangeListeners) {
            this.removeContactListeners();
        }
    }

    getContact() {
        if (this.props.contact) {
            // optimization
            return this.props.contact;
        }
        var message = this.props.message;

        return Message.getContactForMessage(message);
    }

    getTimestampAsString() {
        return toLocaleTime(this.getTimestamp());
    }

    getTimestamp(forUpdated) {
        const { message } = this.props;
        const timestamp = message.getDelay?.() || message.delay || unixtime();
        return forUpdated && message.updated > 0 ? timestamp + message.updated : timestamp;
    }

    componentDidUpdate() {
        var self = this;
        var chatRoom = self.props.message.chatRoom;

        if (!self.onAfterRenderWasTriggered) {
            var msg = self.props.message;
            var shouldRender = true;
            if (msg.isManagement && msg.isManagement() === true && msg.isRenderableManagement() === false) {
                shouldRender = false;
            }

            if (shouldRender) {
                chatRoom.trigger("onAfterRenderMessage", self.props.message);
                self.onAfterRenderWasTriggered = true;
            }
        }
    }

    getCurrentUserReactions() {
        const { reactions } = this.props.message.reacts;
        return Object.keys(reactions).filter(utf => reactions[utf]?.[u_handle]);
    }

    emojiSelected(e, slug, meta) {
        const { chatRoom, message, onEmojiBarChange } = this.props;

        if (chatRoom.isReadOnly()) {
            return false;
        }

        const { reactions } = this.props.message.reacts;
        const CURRENT_USER_REACTIONS = this.getCurrentUserReactions().length;
        const REACTIONS_LIMIT = { TOTAL: 50, PER_PERSON: 24 };
        const addReaction = () => chatRoom.messagesBuff.userAddReaction(message.messageId, slug, meta);
        const emoji = megaChat._emojiData.emojisSlug[slug] || meta;

        // Remove reaction
        if (emoji && message.reacts.getReaction(u_handle, emoji.u)) {
            if (
                onEmojiBarChange
                && Object.keys(reactions).length === 1
                && Object.keys(reactions[emoji.u]).length === 1
            ) {
                onEmojiBarChange(false);
            }
            return chatRoom.messagesBuff.userDelReaction(message.messageId, slug, meta);
        }

        // Add reaction to already added reaction (+1 to specific slot)
        if (emoji && reactions[emoji.u] && CURRENT_USER_REACTIONS < REACTIONS_LIMIT.PER_PERSON) {
            return addReaction();
        }

        if (CURRENT_USER_REACTIONS >= REACTIONS_LIMIT.PER_PERSON) {
            return (
                msgDialog('info', '', l[24205].replace('%1', REACTIONS_LIMIT.PER_PERSON))
            );
        }

        if (Object.keys(reactions).length >= REACTIONS_LIMIT.TOTAL) {
            return (
                msgDialog('info', '', l[24206].replace('%1', REACTIONS_LIMIT.TOTAL))
            );
        }
        else if (onEmojiBarChange && Object.keys(reactions).length === 0) {
            onEmojiBarChange(true);
        }

        // Add new reaction
        return addReaction();
    }

    _emojiOnActiveStateChange(newVal) {
        this.setState(() => {
            return {
                reactionsDropdownActive: newVal
            };
        });
    }

    getEmojisImages() {
        const {chatRoom, message} = this.props;
        var isReadOnlyClass = chatRoom.isReadOnly() ? " disabled" : "";

        // console.error(message._reactions, message.reacts);
        var emojisImages = message._reactions && message.reacts.reactions &&
            Object.keys(message.reacts.reactions).map(utf => {
                var reaction = message.reacts.reactions[utf];
                var count = Object.keys(reaction).length;
                if (!count) {
                    return null;
                }
                const filename = twemoji.convert.toCodePoint(utf);
                const currentUserReacted = !!reaction[u_handle];
                var names = [];
                if (reaction) {
                    ChatdIntegration._ensureContactExists(Object.keys(reaction));

                    var rKeys = Object.keys(reaction);
                    for (let i = 0; i < rKeys.length; i++) {
                        const uid = rKeys[i];

                        if (reaction[uid]) {
                            if (uid === u_handle) {
                                names.push(l[24071] || 'You');
                            }
                            else if (uid in M.u) {
                                names.push(M.getNameByHandle(uid) || megaChat.plugins.userHelper.SIMPLETIP_USER_LOADER);
                            }
                        }

                    }
                }

                var emojiData = megaChat._emojiData.emojisUtf[utf];
                if (!emojiData) {
                    // non existing/unknown slug/emoji (thats possible, because twemoji doesn't contain all emojis in
                    // Unicode standard.
                    emojiData = Object.create(null);
                    emojiData.u = utf;
                }
                var slug = emojiData && emojiData.n || "";
                var tipText;
                slug = slug ? `:${slug}:` : utf;

                if (Object.keys(reaction).length === 1 && reaction[u_handle]) {
                    tipText = (l[24068] || "You (click to remove) [G]reacted with %s[/G]")
                        .replace("%s", slug);
                }
                else {
                    tipText = mega.utils.trans.listToString(
                        names,
                        (l[24069] || "%s [G]reacted with %s2[/G]").replace("%s2", slug)
                    );
                }

                // emojiSelected closure
                const emojiSelectedWrapper = (e, slug, meta) => () => this.emojiSelected(e, slug, meta);

                var notFoundEmoji = slug && slug[0] !== ":";
                return (
                    <div
                        key={slug}
                        onClick={emojiSelectedWrapper(null, slug, emojiData)}
                        className={`
                            reactions-bar__reaction
                            simpletip
                            ${currentUserReacted ? 'user-reacted' : ''}
                            ${notFoundEmoji ? 'emoji-loading-error' : ''}
                            ${isReadOnlyClass}
                        `}
                        data-simpletip={tipText}
                        data-simpletipoffset="3"
                        data-simpletipposition="top">
                        <img
                            width="10"
                            height="10"
                            className="emoji emoji-loading"
                            draggable="false"
                            onError={(e) => {
                                var textNode = document.createElement("em");
                                textNode.classList.remove('emoji-loading');
                                textNode.append(document.createTextNode(utf));
                                e.target.replaceWith(textNode);
                                textNode.parentNode.classList.add('emoji-loading-error');
                            }}
                            onLoad={(e) => {
                                e.target.classList.remove('emoji-loading');
                            }}
                            src={
                                staticpath +
                                "images/mega/twemojis/2_v2/72x72/" +
                                filename + ".png"
                            }
                        />
                        <span className="message text-block">{count}</span>
                    </div>
                );
            });

        emojisImages = emojisImages && emojisImages.filter(function(v) {
            return !!v;
        });

        if (emojisImages && emojisImages.length > 0) {
            const reactionBtn = !chatRoom.isReadOnly() ?
                <Button
                    className="popup-button reactions-button hover-colorized simpletip"
                    icon="sprite-fm-theme icon-emoji-reactions reactions-icon"
                    disabled={false}
                    key="add-reaction-button"
                    attrs={{
                        'data-simpletip': l[24070] || "Add reaction...",
                        'data-simpletipoffset': "3",
                        'data-simpletipposition': "top"
                    }}>
                    <DropdownEmojiSelector
                        horizOffset={this.haveMeetingsCall() ? -150 : 0}
                        onActiveChange={this._emojiOnActiveStateChange}
                        className="popup emoji reactions-dropdown"
                        onClick={this.emojiSelected}
                    />
                </Button> : null;

            emojisImages.push(reactionBtn);
        }

        return emojisImages ? <div className="reactions-bar" id="reactions-bar" onMouseEnter={() => {
            if (this._loadedReacts) {
                return false;
            }
            this._loadedReacts = megaChat.plugins.userHelper.fetchAllNames(this._reactionContacts(), chatRoom)
                .catch(dump)
                .finally(() => {
                    this._loadedReacts = true;
                    this.safeForceUpdate();
                });
        }}>
            {emojisImages}
        </div> : null;
    }

    getMessageActionButtons() {
        // reaction button
        const { chatRoom, message } = this.props;
        const icon = 'sprite-fm-theme reactions-icon';

        return message instanceof Message && message.isSentOrReceived() && !chatRoom.isReadOnly() ?
            <Button
                className="popup-button reactions-button tiny-button simpletip"
                icon={`${icon} icon-emoji-reactions`}
                iconHovered={`${icon} icon-emoji-reactions-active`}
                disabled={false}
                key="add-reaction-button"
                attrs={{
                    'data-simpletip': l[24070] || "Add reaction...",
                    'data-simpletipoffset': "3",
                    'data-simpletipposition': "top"
                }}
            >
                <DropdownEmojiSelector
                    horizOffset={this.haveMeetingsCall() ? -110 : 0}
                    noArrow={true}
                    onActiveChange={this._emojiOnActiveStateChange}
                    className="popup emoji reactions-dropdown"
                    onClick={this.emojiSelected}
                />
            </Button> : null;
    }
}

export {
    ConversationMessageMixin
};
