import React from 'react';
import {MegaRenderMixin, SoonFcWrap} from "../mixins";
import utils, { ParsedHTML } from "../../ui/utils.jsx";
import {AltPartsConvMessage} from "./messages/alterParticipants.jsx";
import {TruncatedMessage} from "./messages/truncated.jsx";
import {PrivilegeChange} from "./messages/privilegeChange.jsx";
import {TopicChange} from "./messages/topicChange.jsx";
import {CloseOpenModeMessage} from "./messages/closeOpenMode.jsx";
import {ChatHandleMessage} from "./messages/chatHandle.jsx";
import GenericConversationMessage from "./messages/generic.jsx";
import {PerfectScrollbar} from "../../ui/perfectScrollbar.jsx";
import {RetentionChange} from "./messages/retentionChange.jsx";
import Call from './meetings/call.jsx';
import ScheduleMetaChange from "./messages/scheduleMetaChange";

export default class HistoryPanel extends MegaRenderMixin {
    $container = null;
    $messages = null;

    state = {
        editing: false,
        toast: false
    };

    constructor(props) {
        super(props);
        this.handleWindowResize = SoonFc(80, (ev) => this._handleWindowResize(ev));
    }
    customIsEventuallyVisible() {
        return this.props.chatRoom.isCurrentlyActive;
    }
    onKeyboardScroll = ({ keyCode }) => {
        const scrollbar = this.messagesListScrollable;
        const domNode = scrollbar?.domNode;

        if (domNode && this.isComponentEventuallyVisible() && !this.state.attachCloudDialog) {
            const scrollPositionY = scrollbar.getScrollPositionY();
            const offset = parseInt(domNode.style.height);
            const PAGE = { UP: 33, DOWN: 34 };

            switch (keyCode) {
                case PAGE.UP:
                    scrollbar.scrollToY(scrollPositionY - offset, true);
                    this.onMessagesScrollUserScroll(scrollbar, 100);
                    break;
                case PAGE.DOWN:
                    if (!scrollbar.isAtBottom()) {
                        scrollbar.scrollToY(scrollPositionY + offset, true);
                    }
                    break;
            }
        }
    }
    componentWillMount() {
        var self = this;
        var chatRoom = self.props.chatRoom;

        chatRoom.rebind('onHistoryDecrypted.cp', function() {
            self.eventuallyUpdate();
        });

        this._messagesBuffChangeHandler = chatRoom.messagesBuff.addChangeListener(SoonFc(function() {
            // wait for scrolling (if such is happening at the moment) to finish
            if (self.isComponentEventuallyVisible()) {
                $('.js-messages-scroll-area', self.findDOMNode()).trigger('forceResize', [true]);
            }
            self.refreshUI();
        }));
    }
    componentDidMount() {
        super.componentDidMount();
        const { chatRoom, onMount } = this.props;

        window.addEventListener('resize', this.handleWindowResize);
        window.addEventListener('keydown', this.handleKeyDown);
        this.$container = $(`.conversation-panel[data-room-id="${chatRoom.chatId}"]`);
        this.eventuallyInit();
        chatRoom.trigger('onHistoryPanelComponentDidMount');

        if (onMount) {
            onMount(this);
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        var self = this;
        var chatRoom = self.props.chatRoom;
        if (this._messagesBuffChangeHandler) {
            chatRoom.messagesBuff.removeChangeListener(this._messagesBuffChangeHandler);
            delete this._messagesBuffChangeHandler;
        }

        window.removeEventListener('resize', self.handleWindowResize);
        window.removeEventListener('keydown', self.handleKeyDown);
        $(document).off("fullscreenchange.megaChat_" + chatRoom.roomId);
        $(document).off('keydown.keyboardScroll_' + chatRoom.roomId);
    }
    componentDidUpdate(prevProps, prevState) {
        var self = this;

        self.eventuallyInit(false);

        var domNode = self.findDOMNode();
        var jml = domNode && domNode.querySelector('.js-messages-loading');

        if (jml) {
            if (self.loadingShown) {
                jml.classList.remove('hidden');
            }
            else {
                jml.classList.add('hidden');
            }
        }
        self.handleWindowResize();

        if (prevState.editing === false && self.state.editing !== false && self.messagesListScrollable) {
            self.messagesListScrollable.reinitialise(false);
            // wait for the reinit...
            Soon(function() {
                if (self.editDomElement && self.editDomElement.length === 1) {
                    self.messagesListScrollable.scrollToElement(self.editDomElement[0], false);
                }
            });
        }

        if (self._reposOnUpdate !== undefined) {
            var ps = self.messagesListScrollable;
            ps.__prevPosY = ps.getScrollHeight() - self._reposOnUpdate + self.lastScrollPosition;
            ps.scrollToY(ps.__prevPosY, true);
        }
    }
    eventuallyInit(doResize) {
        const self = this;

        // because..JSP would hijack some DOM elements, we need to wait with this...
        if (self.initialised) {
            return;
        }

        if (self.findDOMNode()) {
            self.initialised = true;
        }
        else {
            return;
        }

        $(self.findDOMNode()).rebind('resized.convpanel', function() {
            self.handleWindowResize();
        });

        self.$messages = $('.messages.scroll-area > .perfectScrollbarContainer', self.$container);


        var droppableConfig = {
            tolerance: 'pointer',
            drop: function(e, ui) {
                $.doDD(e,ui,'drop',1);
            },
            over: function(e, ui) {
                $.doDD(e,ui,'over',1);
            },
            out: function(e, ui) {
                $.doDD(e,ui,'out',1);
            }
        };

        self.$messages.droppable(droppableConfig);

        self.lastScrollPosition = null;
        self.props.chatRoom.scrolledToBottom = true;
        self.lastScrollHeight = 0;
        self.lastUpdatedScrollHeight = 0;

        if (doResize !== false) {
            self.handleWindowResize();
        }
    }
    _handleWindowResize(e, scrollToBottom) {
        if (!M.chat) {
            return;
        }
        if (!this.isMounted()) {
            // not mounted? remove.
            this.componentWillUnmount();
            return;
        }

        if (!this.isComponentEventuallyVisible()) {
            return;
        }

        var self = this;

        self.eventuallyInit(false);

        if (!self.$messages) {
            return;
        }

        if (Call.isExpanded()) {
            const $container = $('.meetings-call');
            const $messages = $('.js-messages-scroll-area', $container);
            const $textarea = $('.chat-textarea-block', $container);
            const $sidebar = $('.sidebar', $container);
            const scrollBlockHeight =
                parseInt($container.outerHeight(), 10) -
                parseInt($textarea.outerHeight(), 10) -
                20;

            if ($sidebar.hasClass('chat-opened') && scrollBlockHeight !== $messages.outerHeight()) {
                $messages.css('height', scrollBlockHeight);
                self.refreshUI(true);
            }

            return;
        }

        // Important. Please ensure we have correct height detection for Chat messages block.
        // We need to check ".fm-chat-input-scroll" instead of ".fm-chat-line-block" height
        var scrollBlockHeight = (
            $('.chat-content-block', self.$container).outerHeight() -
            ($('.chat-topic-block', self.$container).outerHeight() || 0) -
            (is_chatlink ?
                $('.join-chat-block', self.$container).outerHeight() :
                $('.messages-block .chat-textarea-block', self.$container).outerHeight())
        );

        if (scrollBlockHeight !== self.$messages.outerHeight()) {
            self.$messages.css('height', scrollBlockHeight);
            $('.messages.main-pad', self.$messages).css('min-height', scrollBlockHeight);
            self.refreshUI(true);
        }
        else {
            self.refreshUI(scrollToBottom);
        }
    }

    refreshUI() {
        if (this.isComponentEventuallyVisible()) {
            const room = this.props.chatRoom;

            room.renderContactTree();
            room.megaChat.refreshConversations();
            room.trigger('RefreshUI');
            if (room.scrolledToBottom) {
                delay('hp:reinit-scroll', () => {
                    if (this.messagesListScrollable) {
                        this.messagesListScrollable.reinitialise(true, true);
                    }
                }, 30);
            }
        }
    }

    @utils.SoonFcWrap(50)
        onMessagesScrollReinitialise = (ps, $elem, forced, scrollPositionYPerc, scrollToElement) => {
            const { chatRoom } = this.props;

            // don't do anything if history is being retrieved at the moment.
            if (this.scrollPullHistoryRetrieval || chatRoom.messagesBuff.isRetrievingHistory) {
                return;
            }

            if (forced) {
                if (!scrollPositionYPerc && !scrollToElement) {
                    if (chatRoom.scrolledToBottom && !this.editDomElement) {
                        // wait for the DOM update, if such.
                        ps.scrollToBottom(true);
                        return true;
                    }
                }
                else {
                    // don't do anything if the UI was forced to scroll to a specific pos.
                    return;
                }
            }

            if (this.isComponentEventuallyVisible()
                && !this.editDomElement && !chatRoom.isScrollingToMessageId) {

                if (chatRoom.scrolledToBottom) {
                    ps.scrollToBottom(true);
                    return true;
                }

                if (this.lastScrollPosition && this.lastScrollPosition !== ps.getScrollPositionY()) {
                    ps.scrollToY(this.lastScrollPosition, true);
                    return true;
                }
            }
        };

    onMessagesScrollUserScroll = (ps, offset = 5) => {
        const { chatRoom } = this.props;
        const { messagesBuff } = chatRoom;
        const scrollPositionY = ps.getScrollPositionY();

        if (messagesBuff.messages.length === 0) {
            chatRoom.scrolledToBottom = true;
            return;
        }

        // turn on/off auto scroll to bottom.
        if (ps.isCloseToBottom(30) === true) {
            if (!chatRoom.scrolledToBottom) {
                messagesBuff.detachMessages();
            }
            chatRoom.scrolledToBottom = true;
        }
        else {
            chatRoom.scrolledToBottom = false;
        }

        if (!this.scrollPullHistoryRetrieval && !messagesBuff.isRetrievingHistory
            && (ps.isAtTop() || scrollPositionY < offset && ps.getScrollHeight() > 500)
            && messagesBuff.haveMoreHistory()) {

            ps.disable();
            this.scrollPullHistoryRetrieval = true;
            this.lastScrollPosition = scrollPositionY;

            let msgAppended = 0;
            const scrYOffset = ps.getScrollHeight();

            chatRoom.one('onMessagesBuffAppend.pull', () => {
                msgAppended++;
            });

            // wait for all msgs to be rendered.
            chatRoom.off('onHistoryDecrypted.pull');
            chatRoom.one('onHistoryDecrypted.pull', () => {
                chatRoom.off('onMessagesBuffAppend.pull');

                if (msgAppended > 0) {
                    this._reposOnUpdate = scrYOffset;
                }

                this.scrollPullHistoryRetrieval = -1;
            });

            messagesBuff.retrieveChatHistory();
        }

        if (this.lastScrollPosition !== scrollPositionY) {
            this.lastScrollPosition = scrollPositionY;
        }

        delay('chat-toast', this.initToast, 200);
    };

    isLoading() {
        const chatRoom = this.props.chatRoom;
        const mb = chatRoom.messagesBuff;

        return this.scrollPullHistoryRetrieval === true
            || chatRoom.activeSearches || mb.messagesHistoryIsLoading()
            || mb.joined === false || mb.isDecrypting;
    }

    specShouldComponentUpdate() {
        return !this.loadingShown && this.isComponentEventuallyVisible();
    }

    @SoonFcWrap(450, true)
    enableScrollbar() {
        const ps = this.messagesListScrollable;

        ps.enable();
        this._reposOnUpdate = undefined;
        this.lastScrollPosition = ps.__prevPosY | 0;
    }

    editMessage(messageId) {
        var self = this;
        self.setState({'editing': messageId});
        self.props.chatRoom.scrolledToBottom = false;
    }

    onMessageEditDone(v, messageContents) {
        var self = this;
        var room = this.props.chatRoom;
        room.scrolledToBottom = true;
        self.editDomElement = null;

        var currentContents = v.textContents;

        v.edited = false;

        if (messageContents === false || messageContents === currentContents) {
            self.messagesListScrollable.scrollToBottom(true);
        }
        else if (messageContents) {
            room.trigger('onMessageUpdating', v);
            room.megaChat.plugins.chatdIntegration.updateMessage(
                room,
                v.internalId ? v.internalId : v.orderValue,
                messageContents
            );
            if (
                v.getState &&
                (
                    v.getState() === Message.STATE.NOT_SENT ||
                    v.getState() === Message.STATE.SENT
                ) &&
                !v.requiresManualRetry
            ) {
                if (v.textContents) {
                    v.textContents = messageContents;
                }
                if (v.emoticonShortcutsProcessed) {
                    v.emoticonShortcutsProcessed = false;
                }
                if (v.emoticonsProcessed) {
                    v.emoticonsProcessed = false;
                }
                if (v.messageHtml) {
                    delete v.messageHtml;
                }


                v.trigger(
                    'onChange',
                    [
                        v,
                        "textContents",
                        "",
                        messageContents
                    ]
                );

                megaChat.plugins.richpreviewsFilter.processMessage({}, v, false, true);
            }

            self.messagesListScrollable.scrollToBottom(true);
        }
        else if (messageContents.length === 0) {
            this.props.onDeleteClicked(v);
        }

        self.setState({'editing': false});
        self.refreshUI();
        Soon(function() {
            $('.chat-textarea-block:visible textarea').focus();
        }, 300);
    }

    initToast = () => {
        const { chatRoom } = this.props;
        this.setState({ toast: !chatRoom.scrolledToBottom && !this.messagesListScrollable.isCloseToBottom(30) }, () =>
            this.state.toast ? null : chatRoom.trigger('onChatIsFocused')
        );
    };

    renderToast = () => {
        const { chatRoom } = this.props;
        const unreadCount = chatRoom.messagesBuff.getUnreadCount();

        return (
            <div
                className={`
                    theme-dark-forced
                    messages-toast
                    ${this.state.toast ? 'active' : ''}
                `}
                onClick={() => {
                    this.setState({ toast: false }, () => {
                        this.messagesListScrollable.scrollToBottom();
                        chatRoom.scrolledToBottom = true;
                    });
                }}>
                <i className="sprite-fm-mono icon-down" />
                {unreadCount > 0 && <span>{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </div>
        );
    };

    // eslint-disable-next-line complexity
    render() {
        var self = this;
        var room = this.props.chatRoom;
        if (!room || !room.roomId) {
            return null;
        }

        // Hm...enable this if needed.

        // // room is not active, don't waste DOM nodes, CPU and Memory (and save some avatar loading calls...)
        // if (!room.isCurrentlyActive && !self._wasAppendedEvenOnce) {
        //     return null;
        // }

        var contacts = room.getParticipantsExceptMe();
        var contactHandle;
        var contact;
        var avatarMeta;
        var contactName = "";
        if (contacts && contacts.length === 1) {
            contactHandle = contacts[0];
            contact = M.u[contactHandle];
            avatarMeta = contact ? generateAvatarMeta(contact.u) : {};
            contactName = avatarMeta.fullName;
        }
        else if (contacts && contacts.length > 1) {
            contactName = room.getRoomTitle();
        }

        var messagesList = [];

        if (this.isLoading()) {
            self.loadingShown = true;
        }
        else {
            const mb = room.messagesBuff;

            if (this.scrollPullHistoryRetrieval < 0) {
                this.scrollPullHistoryRetrieval = false;
                self.enableScrollbar();
            }
            delete self.loadingShown;

            if (mb.joined === true && !self.scrollPullHistoryRetrieval && mb.haveMoreHistory() === false) {
                var headerText = l[8002];
                headerText =
                    contactName ?
                        headerText.replace('%s', `<span>${megaChat.html(contactName)}</span>`) :
                        megaChat.html(room.getRoomTitle());

                messagesList.push(
                    <div className="messages notification" key="initialMsg">
                        <div className="header">
                            <ParsedHTML
                                tag="div"
                                content={room.scheduledMeeting ? megaChat.html(room.getRoomTitle()) : headerText}
                            />
                        </div>
                        <div className="info">
                            {l[8080]}
                            <p>
                                <i className="sprite-fm-mono icon-lock" />
                                <ParsedHTML>
                                    {l[8540].replace("[S]", "<strong>").replace("[/S]", "</strong>")}
                                </ParsedHTML>
                            </p>
                            <p>
                                <i className="sprite-fm-mono icon-accept" />
                                <ParsedHTML>
                                    {l[8539].replace("[S]", "<strong>").replace("[/S]", "</strong>")}
                                </ParsedHTML>
                            </p>
                        </div>
                    </div>
                );
            }
        }

        var lastTimeMarker;
        var lastMessageFrom = null;
        var lastGroupedMessageTimeStamp = null;
        var grouped = false;

        for (var i = 0; i < room.messagesBuff.messages.length; i++) {
            var v = room.messagesBuff.messages.getItem(i);

            if (!v.protocol && v.revoked !== true) {
                var shouldRender = true;
                if (
                    (
                        v.isManagement &&
                        v.isManagement() === true &&
                        v.isRenderableManagement() === false
                    ) ||
                    v.deleted === true
                ) {
                    shouldRender = false;
                }

                var timestamp = v.delay;
                var curTimeMarker = getTimeMarker(timestamp);

                if (shouldRender === true && curTimeMarker && lastTimeMarker !== curTimeMarker) {
                    lastTimeMarker = curTimeMarker;
                    messagesList.push(
                        <div
                            className="message date-divider selectable-txt"
                            key={v.messageId + "_marker"}
                            title={time2date(timestamp)}>{curTimeMarker}</div>
                    );

                    grouped = false;
                    lastMessageFrom = null;
                    lastGroupedMessageTimeStamp = null;
                }


                if (shouldRender === true) {
                    var userId = v.userId;
                    // dialogMessage have .authorContact instead of .userId
                    if (!userId && contact && contact.u) {
                        userId = contact.u;
                    }

                    if (v instanceof Message && v.dialogType !== "truncated") {

                        // the grouping logic for messages.
                        if (!lastMessageFrom || (userId && lastMessageFrom === userId)) {
                            if (timestamp - lastGroupedMessageTimeStamp < (5 * 60)) {
                                grouped = true;
                            }
                            else {
                                grouped = false;
                                lastMessageFrom = userId;
                                lastGroupedMessageTimeStamp = timestamp;
                            }
                        }
                        else {
                            grouped = false;
                            lastMessageFrom = userId;
                            if (lastMessageFrom === userId) {
                                lastGroupedMessageTimeStamp = timestamp;
                            }
                            else {
                                lastGroupedMessageTimeStamp = null;
                            }
                        }
                    }
                    else {
                        grouped = false;
                        lastMessageFrom = null;
                        lastGroupedMessageTimeStamp = null;
                    }
                }

                if (
                    (v.dialogType === "remoteCallEnded" || v.dialogType === "remoteCallStarted") &&
                    v &&
                    v.wrappedChatDialogMessage
                ) {
                    v = v.wrappedChatDialogMessage;
                }


                if (v.dialogType) {
                    var messageInstance = null;
                    if (v.dialogType === 'alterParticipants') {
                        messageInstance = <AltPartsConvMessage
                            message={v}
                            key={v.messageId}
                            contact={Message.getContactForMessage(v)}
                            grouped={grouped}
                            chatRoom={room}
                        />;
                    }
                    else if (v.dialogType === 'truncated') {
                        messageInstance = <TruncatedMessage
                            message={v}
                            key={v.messageId}
                            contact={Message.getContactForMessage(v)}
                            grouped={grouped}
                            chatRoom={room}
                        />;
                    }
                    else if (v.dialogType === 'privilegeChange') {
                        messageInstance = <PrivilegeChange
                            message={v}
                            key={v.messageId}
                            contact={Message.getContactForMessage(v)}
                            grouped={grouped}
                            chatRoom={room}
                        />;
                    }
                    else if (v.dialogType === 'topicChange') {
                        messageInstance = <TopicChange
                            message={v}
                            key={v.messageId}
                            contact={Message.getContactForMessage(v)}
                            grouped={grouped}
                            chatRoom={room}
                        />;
                    }
                    else if (v.dialogType === 'openModeClosed') {
                        messageInstance = <CloseOpenModeMessage
                            message={v}
                            key={v.messageId}
                            contact={Message.getContactForMessage(v)}
                            grouped={grouped}
                            chatRoom={room}
                        />;
                    }
                    else if (v.dialogType === 'chatHandleUpdate') {
                        messageInstance = <ChatHandleMessage
                            message={v}
                            key={v.messageId}
                            contact={Message.getContactForMessage(v)}
                            grouped={grouped}
                            chatRoom={room}
                        />;
                    }
                    else if (v.dialogType === 'messageRetention') {
                        messageInstance = <RetentionChange
                            message={v}
                            key={v.messageId}
                            contact={Message.getContactForMessage(v)}
                        />;
                    }
                    else if (v.dialogType === 'scheduleMeta') {
                        if (v.meta.onlyTitle) {
                            messageInstance =
                                <TopicChange
                                    message={v}
                                    key={v.messageId}
                                    contact={Message.getContactForMessage(v)}
                                    grouped={grouped}
                                    chatRoom={v.chatRoom}
                                />;
                        }
                        else {
                            if (v.meta.topicChange) {
                                messagesList.push(
                                    <TopicChange
                                        message={v}
                                        key={`${v.messageId}-topic`}
                                        contact={Message.getContactForMessage(v)}
                                        grouped={grouped}
                                        chatRoom={v.chatRoom}
                                    />
                                );
                            }
                            messageInstance =
                                <ScheduleMetaChange
                                    message={v}
                                    key={v.messageId}
                                    mode={v.meta.mode}
                                    chatRoom={room}
                                    grouped={grouped}
                                    link={v.chatRoom.publicLink}
                                    contact={Message.getContactForMessage(v)}
                                />;
                        }
                    }

                    messagesList.push(messageInstance);
                }
                else {
                    if (!v.chatRoom) {
                        // ChatDialogMessages...
                        v.chatRoom = room;
                    }

                    messagesList.push(
                        <GenericConversationMessage
                            message={v}
                            state={v.state}
                            key={v.messageId}
                            contact={Message.getContactForMessage(v)}
                            grouped={grouped}
                            onUpdate={() => {
                                self.onResizeDoUpdate();
                            }}
                            editing={self.state.editing === v.messageId || self.state.editing === v.pendingMessageId}
                            onEditStarted={((v, $domElement) => {
                                self.editDomElement = $domElement;
                                self.setState({'editing': v.messageId});
                                self.forceUpdate();
                            }).bind(this, v)}
                            chatRoom={room}
                            onEditDone={this.onMessageEditDone.bind(this, v)}
                            onDeleteClicked={msg => {
                                if (this.props.onDeleteClicked) {
                                    this.props.onDeleteClicked(msg);
                                }
                            }}
                            onResized={() => {
                                this.handleWindowResize();
                            }}
                            onEmojiBarChange={() => {
                                this.handleWindowResize();
                            }}
                        />
                    );
                }
            }
        }

        return (
            <div
                className={`
                    messages
                    scroll-area
                    ${this.props.className ? this.props.className : ''}
                `}>
                <div
                    className="dropdown body dropdown-arrow down-arrow tooltip not-sent-notification-manual hidden">
                    <i className="dropdown-white-arrow" />
                    <div className="dropdown notification-text">
                        <i className="small-icon conversations" />
                        {l[8883] /* `Message not sent. Click here if you want to resend it.` */}
                    </div>
                </div>

                <div
                    className="dropdown body dropdown-arrow down-arrow tooltip not-sent-notification-cancel hidden">
                    <i className="dropdown-white-arrow" />
                    <div className="dropdown notification-text">
                        <i className="small-icon conversations" />
                        {l[8884] /* `Message not sent. Click here if you want to cancel it.` */}
                    </div>
                </div>

                <PerfectScrollbar
                    onFirstInit={ps => {
                        ps.scrollToBottom(true);
                        this.props.chatRoom.scrolledToBottom = 1;
                    }}
                    onReinitialise={this.onMessagesScrollReinitialise}
                    onUserScroll={this.onMessagesScrollUserScroll}
                    className="js-messages-scroll-area perfectScrollbarContainer"
                    messagesToggledInCall={this.state.messagesToggledInCall}
                    ref={(ref) => {
                        this.messagesListScrollable = ref;
                        $(document).rebind(
                            'keydown.keyboardScroll_' + this.props.chatRoom.roomId,
                            this.onKeyboardScroll
                        );
                        if (this.props.onMessagesListScrollableMount) {
                            this.props.onMessagesListScrollableMount(ref);
                        }
                    }}
                    chatRoom={this.props.chatRoom}
                    messagesBuff={this.props.chatRoom.messagesBuff}
                    editDomElement={this.state.editDomElement}
                    editingMessageId={this.state.editing}
                    confirmDeleteDialog={this.state.confirmDeleteDialog}
                    renderedMessagesCount={messagesList.length}
                    isLoading={
                        this.props.chatRoom.messagesBuff.messagesHistoryIsLoading() ||
                        this.props.chatRoom.activeSearches > 0 ||
                        this.loadingShown
                    }
                    options={{ 'suppressScrollX': true }}>
                    <div className="messages main-pad">
                        <div className="messages content-area">
                            <div
                                key="loadingSpinner" style={{ top: "50%" }}
                                className={`
                                    loading-spinner
                                    js-messages-loading
                                    light
                                    manual-management
                                    ${this.loadingShown ? '' : 'hidden'}
                                `}>
                                <div
                                    className="main-loader"
                                    style={{ 'position': 'fixed', 'top': '50%', 'left': '50%' }}
                                />
                            </div>
                            {/* add a naive pre-pusher that would eventually keep the the scrollbar realistic */}
                            {messagesList}
                        </div>
                    </div>
                </PerfectScrollbar>
                {this.renderToast()}
            </div>
        );
    }
}
