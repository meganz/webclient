// libs
import { hot } from 'react-hot-loader/root';
var React = require("react");
import utils, { Emoji, OFlowEmoji, OFlowParsedHTML, ParsedHTML } from './../../ui/utils.jsx';
var PerfectScrollbar = require('./../../ui/perfectScrollbar.jsx').PerfectScrollbar;
import {MegaRenderMixin, timing} from './../mixins';
import {Button} from './../../ui/buttons.jsx';
import {DropdownContactsSelector} from './../../ui/dropdowns.jsx';
import {ConversationPanels} from "./../ui/conversationpanel.jsx";
import SearchPanel from './searchPanel/searchPanel.jsx';
import ContactsPanel from './contactsPanel/contactsPanel.jsx';
import ModalDialogsUI from './../../ui/modalDialogs.jsx';
import { Avatar, ContactAwareName } from "./contacts.jsx";
var StartGroupChatWizard = require('./startGroupChatWizard.jsx').StartGroupChatWizard;
import {Start as StartMeetingDialog} from "./meetings/workflow/start.jsx";
import MeetingsCallEndedDialog from "./meetings/meetingsCallEndedDialog.jsx";
import { inProgressAlert } from './meetings/call.jsx';
import Nil from './contactsPanel/nil.jsx';
import ChatToaster from "./chatToaster";

var getRoomName = function(chatRoom) {
    return chatRoom.getRoomTitle();
};

class ConversationsListItem extends MegaRenderMixin {
    isLoading() {
        const mb = this.props.chatRoom.messagesBuff;

        if (mb.haveMessages) {
            return false;
        }
        return mb.messagesHistoryIsLoading() || mb.joined === false && mb.isDecrypting;
    }

    specShouldComponentUpdate() {
        return !this.loadingShown;
    }

    componentWillMount() {
        var self = this;
        self.chatRoomChangeListener = SoonFc(200 + Math.random() * 400 | 0, () => {
            if (d > 2) {
                console.debug('%s: loading:%s', self.getReactId(), self.loadingShown, self.isLoading(), [self]);
            }
            self.safeForceUpdate();
        });
        self.props.chatRoom.rebind('onUnreadCountUpdate.convlistitem', function() {
            delete self.lastMessageId;
            self.safeForceUpdate();
        });
        self.props.chatRoom.addChangeListener(self.chatRoomChangeListener);
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        var self = this;
        self.props.chatRoom.removeChangeListener(self.chatRoomChangeListener);
        self.props.chatRoom.unbind('onUnreadCountUpdate.convlistitem');
    }

    componentDidMount() {
        super.componentDidMount();
        this.eventuallyScrollTo();
    }

    componentDidUpdate() {
        super.componentDidUpdate();

        this.eventuallyScrollTo();
    }

    @utils.SoonFcWrap(40, true)
    eventuallyScrollTo() {
        const chatRoom = this.props.chatRoom || false;

        if (chatRoom._scrollToOnUpdate) {

            if (chatRoom.isCurrentlyActive) {
                chatRoom.scrollToChat();
            }
            else {
                chatRoom._scrollToOnUpdate = false;
            }
        }
    }

    getConversationTimestamp = () => {
        const { chatRoom } = this.props;
        if (chatRoom) {
            const lastMessage = chatRoom.messagesBuff.getLatestTextMessage();
            const timestamp = lastMessage && lastMessage.delay || chatRoom.ctime;
            return todayOrYesterday(timestamp * 1000) ? getTimeMarker(timestamp) : time2date(timestamp, 17);
        }
        return null;
    };

    @timing(0.7, 8)
    render() {
        var classString = "";
        var chatRoom = this.props.chatRoom;
        if (!chatRoom || !chatRoom.chatId) {
            return null;
        }

        var roomId = chatRoom.chatId;

        // selected
        if (chatRoom.isCurrentlyActive) {
            classString += " active";
        }

        var nameClassString = "user-card-name conversation-name";
        var archivedDiv = "";
        if (chatRoom.isArchived()) {
            archivedDiv = <div className="archived-badge">{l[19067]}</div>;
        }

        var contactId;
        var presenceClass;
        var id;

        if (chatRoom.type === "private") {
            let handle = chatRoom.getParticipantsExceptMe()[0];
            if (!handle || !(handle in M.u)) {
                return null;
            }
            let contact = M.u[handle];
            id = 'conversation_' + htmlentities(contact.u);

            presenceClass = chatRoom.megaChat.userPresenceToCssClass(
                contact.presence
            );
        }
        else if (chatRoom.type === "group") {
            contactId = roomId;
            id = 'conversation_' + contactId;
            presenceClass = 'group';
            classString += ' groupchat';
        }
        else if (chatRoom.type === "public") {
            contactId = roomId;
            id = 'conversation_' + contactId;
            presenceClass = 'group';
            classString += ' groupchat public';
        }
        else {
            return "unknown room type: " + chatRoom.roomId;
        }
        this.loadingShown = this.isLoading();

        var unreadCount = chatRoom.messagesBuff.getUnreadCount();
        var isUnread = false;

        var notificationItems = [];
        if (chatRoom.havePendingCall() && chatRoom.state != ChatRoom.STATE.LEFT) {
            notificationItems.push(<i
                className={"tiny-icon " + (chatRoom.isCurrentlyActive ? "blue" : "white") + "-handset"}
                key="callIcon"/>);
        }
        if (unreadCount > 0) {
            notificationItems.push(<span key="unreadCounter">
                {unreadCount > 9 ? "9+" : unreadCount}
                </span>
            );
            isUnread = true;
        }


        var inCallDiv = null;

        var lastMessageDiv = null;

        var lastMessage = chatRoom.messagesBuff.getLatestTextMessage();
        var lastMsgDivClasses;
        if (lastMessage && lastMessage.renderableSummary && this.lastMessageId === lastMessage.messageId) {
            lastMsgDivClasses = this._lastMsgDivClassesCache;
            lastMessageDiv = this._lastMessageDivCache;
            lastMsgDivClasses += (isUnread ? " unread" : "");
            if (chatRoom.havePendingCall() || chatRoom.haveActiveCall()) {
                lastMsgDivClasses += " call";
                classString += " call-exists";
            }
        }
        else if (lastMessage) {
            lastMsgDivClasses = "conversation-message" + (isUnread ? " unread" : "");
            // safe some CPU cycles...
            var renderableSummary = lastMessage.renderableSummary || chatRoom.messagesBuff.getRenderableSummary(
                lastMessage
            );
            lastMessage.renderableSummary = renderableSummary;

            if (chatRoom.havePendingCall() || chatRoom.haveActiveCall()) {
                lastMsgDivClasses += " call";
                classString += " call-exists";
            }
            lastMessageDiv =
                <div className={lastMsgDivClasses}>
                    <ParsedHTML>
                        {renderableSummary}
                    </ParsedHTML>
                </div>;
            const voiceClipType = Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP;

            if (
                lastMessage.textContents &&
                lastMessage.textContents[1] === voiceClipType &&
                lastMessage.getAttachmentMeta()[0]
            ) {
                const playTime = secondsToTimeShort(lastMessage.getAttachmentMeta()[0].playtime);
                lastMessageDiv = (
                    <div className={lastMsgDivClasses}>
                        <i className="sprite-fm-mono icon-audio-filled voice-message-icon" />
                        {playTime}
                    </div>
                );
            }

            if (lastMessage.metaType && lastMessage.metaType === Message.MESSAGE_META_TYPE.GEOLOCATION) {
                lastMessageDiv =
                    <div className={lastMsgDivClasses}>
                        <i className="sprite-fm-mono icon-location geolocation-icon" />
                        {l[20789]}
                    </div>;
            }
        }
        else {
            lastMsgDivClasses = "conversation-message";

            /**
             * Show "Loading" until:
             * 1. I'd fetched chats from the API.
             * 2. I'm retrieving history at the moment.
             * 3. I'd connected to chatd and joined the room.
             */

            const emptyMessage = this.loadingShown ? l[7006] : l[8000];

            lastMessageDiv =
                <div>
                    <div className={lastMsgDivClasses}>
                        {emptyMessage}
                    </div>
                </div>;
        }

        this.lastMessageId = lastMessage && lastMessage.messageId;
        this._lastMsgDivClassesCache = lastMsgDivClasses
            .replace(" call-exists", "")
            .replace(" unread", "");
        this._lastMessageDivCache = lastMessageDiv;


        if (chatRoom.type !== "public") {
            nameClassString += " privateChat";
        }
        let roomTitle = <OFlowParsedHTML>{megaChat.html(chatRoom.getRoomTitle())}</OFlowParsedHTML>;
        if (chatRoom.type === "private") {
            roomTitle =
                <ContactAwareName contact={this.props.contact}>
                    <div className="user-card-wrapper">
                        <OFlowParsedHTML>{megaChat.html(chatRoom.getRoomTitle())}</OFlowParsedHTML>
                    </div>
                </ContactAwareName>;
        }
        nameClassString += chatRoom.type === "private" || chatRoom.type === "group" ? ' badge-pad' : '';

        return (
            <li
                id={id}
                className={classString}
                data-room-id={roomId}
                data-jid={contactId}
                onClick={ev => this.props.onConversationClicked(ev)}>
                <div className="conversation-avatar">
                    {chatRoom.type === 'group' || chatRoom.type === 'public' ?
                        <div className="chat-topic-icon">
                            <i className="sprite-fm-uni icon-chat-group" />
                        </div> :
                        <Avatar contact={chatRoom.getParticipantsExceptMe()[0]} />}
                </div>
                <div className="conversation-data">
                    <div className="conversation-data-top">
                        <div className={`conversation-data-name ${nameClassString}`}>
                            {roomTitle}
                        </div>
                        <div className="conversation-data-badges">
                            {chatRoom.type === "private" && <span className={`user-card-presence ${presenceClass}`} />}
                            {(chatRoom.type === "group" || chatRoom.type === "private") &&
                                <i className="sprite-fm-uni icon-ekr-key simpletip" data-simpletip={l[20935]} />}
                            {archivedDiv}
                        </div>
                        <div className="date-time">{this.getConversationTimestamp()}</div>
                    </div>
                    <div className="clear" />
                    <div className="conversation-message-info">
                        {lastMessageDiv}
                        {notificationItems.length > 0 ?
                            <div className="unread-messages-container">
                                <div className={`unread-messages items-${notificationItems.length}`}>
                                    {notificationItems}
                                </div>
                            </div> : null}
                    </div>
                </div>
            </li>
        );
    }
}

class ArchConversationsListItem extends MegaRenderMixin {
    componentWillMount() {
        const { chatRoom } = this.props;
        this.chatRoomChangeListener = SoonFc(200 + Math.random() * 400 | 0, () => {
            this.safeForceUpdate();
        });
        chatRoom.addChangeListener(this.chatRoomChangeListener);
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        const { chatRoom } = this.props;
        chatRoom.removeChangeListener(this.chatRoomChangeListener);
    }
    render() {
        const { chatRoom, onConversationSelected, onConversationClicked, onUnarchiveClicked } = this.props;
        let classString = 'arc-chat-list ui-droppable ui-draggable ui-draggable-handle';

        if (!chatRoom || !chatRoom.chatId) {
            return null;
        }

        const roomId = chatRoom.chatId;

        // selected
        if (chatRoom.archivedSelected === true) {
            classString += ' ui-selected';
        }

        let nameClassString = 'user-card-name conversation-name';
        let contactId;
        let id;

        if (chatRoom.type === 'private') {
            const contact = M.u[chatRoom.getParticipantsExceptMe()[0]];
            if (!contact) {
                return null;
            }
            if (!this.fetchingNonContact && !chatRoom.getRoomTitle()) {
                this.fetchingNonContact = true;
                MegaPromise.allDone([
                    M.syncUsersFullname(contact.h, undefined, new MegaPromise(nop)),
                    M.syncContactEmail(contact.h, new MegaPromise(nop))
                ]).always(() => {
                    this.safeForceUpdate();
                });
            }
            id = `conversation_${escapeHTML(contact.u)}`;
        }
        else if (chatRoom.type === 'group') {
            contactId = roomId;
            id = `conversation_${contactId}`;
            classString += ' groupchat';
        }
        else if (chatRoom.type === 'public') {
            contactId = roomId;
            id = `conversation_${contactId}`;
            classString += ' groupchat public';
        }
        else {
            return `Unknown room type: ${chatRoom.roomId}`;
        }

        let lastMessageDiv;
        let lastMessageDatetimeDiv = null;
        let emptyMessage = null;
        const lastMessage = chatRoom.messagesBuff.getLatestTextMessage();
        if (lastMessage) {
            const renderableSummary = lastMessage.renderableSummary || chatRoom.messagesBuff.getRenderableSummary(
                lastMessage
            );
            lastMessage.renderableSummary = renderableSummary;

            lastMessageDiv =
                <div className="conversation-message">
                    <ParsedHTML>{renderableSummary}</ParsedHTML>
                </div>;

            lastMessageDatetimeDiv = <div className="date-time">{getTimeMarker(lastMessage.delay, true)}</div>;
        }
        else {
            /**
             * Show "Loading" until:
             * 1. I'd fetched chats from the API.
             * 2. I'm retrieving history at the moment.
             * 3. I'd connected to chatd and joined the room.
              */
            emptyMessage = chatRoom.messagesBuff.messagesHistoryIsLoading()
                || this.loadingShown
                || chatRoom.messagesBuff.joined === false
                ? l[7006] /* Loading */ : l[8000] /* No conversation history */;

            lastMessageDiv =
                <div>
                    <div className="conversation-message">
                        {emptyMessage}
                    </div>
                </div>;
        }
        if (chatRoom.type !== 'public') {
            nameClassString += ' privateChat';
        }

        return (
            <tr
                className={classString}
                id={id}
                data-room-id={roomId}
                data-jid={contactId}
                onClick={onConversationSelected}
                onDoubleClick={onConversationClicked}>
                <td>
                    <div className="fm-chat-user-info todo-star">
                        <div className={nameClassString}>
                            <Emoji>{chatRoom.getRoomTitle()}</Emoji>
                            {(chatRoom.type === 'group' || chatRoom.type === 'private')
                                && <i className="sprite-fm-uni icon-ekr-key"/>}
                        </div>
                        <div className="last-message-info">
                            {lastMessageDiv}
                            {emptyMessage ? null : (
                                <div className="conversations-separator">
                                    <i className="sprite-fm-mono icon-dot"/>
                                </div>
                            )}
                            {lastMessageDatetimeDiv}
                        </div>
                    </div>
                    <div className="archived-badge">{l[19067] /* `Archived` */}</div>
                </td>
                <td width="330">
                    <div className="archived-on">
                        <div className="archived-date-time">{lastMessageDatetimeDiv}</div>
                        <div className="clear"/>
                    </div>
                    <Button
                        className="mega-button action unarchive-chat right"
                        icon="sprite-fm-mono icon-rewind"
                        onClick={onUnarchiveClicked}>
                        <span>{l[19065] /* `Unarchive` */}</span>
                    </Button>
                </td>
            </tr>
        );
    }
}

class ConversationsHead extends MegaRenderMixin {
    requestReceivedListener = null;

    state = {
        receivedRequestsCount: 0
    };

    constructor(props) {
        super(props);
        this.state.receivedRequestsCount = Object.keys(M.ipc).length;
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.requestReceivedListener) {
            mBroadcaster.removeListener(this.requestReceivedListener);
        }
    }

    componentDidMount() {
        super.componentDidMount();
        this.requestReceivedListener = mBroadcaster.addListener('fmViewUpdate:ipc', () =>
            this.setState({ receivedRequestsCount: Object.keys(M.ipc).length })
        );
    }

    render() {
        const { contactsActive, showTopButtons, showAddContact, onSelectDone } = this.props;
        const { receivedRequestsCount } = this.state;
        const ROUTES = { CHAT: 'fm/chat', CONTACTS: 'fm/chat/contacts' };
        const CONTACTS_ACTIVE = window.location.pathname.includes(ROUTES.CONTACTS);

        return (
            <div className="lp-header">
                <span>{l[5902] /* `Conversations` */}</span>
                {!is_eplusplus && !is_chatlink && (
                    <div className="conversations-head-buttons">
                        <div className="contacts-toggle">
                            <Button
                                receivedRequestCount={receivedRequestsCount}
                                className={`
                                    mega-button
                                    round
                                    branded-blue
                                    contacts-toggle-button
                                    ${contactsActive ? 'active' : ''}
                                    ${receivedRequestsCount > 0 ? 'requests' : ''}
                                `}
                                icon={`
                                    sprite-fm-mono
                                    icon-contacts
                                    ${CONTACTS_ACTIVE ? '' : 'active'}
                                `}
                                onClick={() => loadSubPage(CONTACTS_ACTIVE ? ROUTES.CHAT : ROUTES.CONTACTS)}>
                                {!!receivedRequestsCount && (
                                    <div className="notifications-count">
                                        <span>{receivedRequestsCount > 9 ? '9+' : receivedRequestsCount }</span>
                                    </div>
                                )}
                            </Button>
                        </div>
                        <Button
                            group="conversationsListing"
                            className="mega-button round positive"
                            icon="sprite-fm-mono icon-add">
                            <DropdownContactsSelector
                                className="main-start-chat-dropdown"
                                onSelectDone={onSelectDone}
                                multiple={false}
                                showTopButtons={showTopButtons}
                                showAddContact={showAddContact}
                            />
                        </Button>
                    </div>
                )}
            </div>
        );
    }
}

class ConversationsList extends MegaRenderMixin {
    backgroundUpdateInterval = null;
    conversations = megaChat.chats.toJS();

    static defaultProps = {
        manualDataChangeTracking: true
    };

    state = {
        updated: 0
    };

    customIsEventuallyVisible() {
        return M.chat;
    }

    attachRerenderCallbacks() {
        this._megaChatsListener = megaChat.chats.addChangeListener(() => this.onPropOrStateUpdated());
    }

    detachRerenderCallbacks() {
        if (super.detachRerenderCallbacks) {
            super.detachRerenderCallbacks();
        }
        megaChat.chats.removeChangeListener(this._megaChatsListener);
    }

    doUpdate = () =>
        this.isComponentVisible() &&
        document.visibilityState === 'visible' &&
        this.setState(state => ({ updated: ++state.updated }), () => this.forceUpdate());

    componentWillUnmount() {
        super.componentWillUnmount();
        clearInterval(this.backgroundUpdateInterval);
        document.removeEventListener('visibilitychange', this.doUpdate);
    }

    componentDidMount() {
        super.componentDidMount();
        this.backgroundUpdateInterval = setInterval(this.doUpdate, 6e4 * 10 /* 10 min */);
        document.addEventListener('visibilitychange', this.doUpdate);
    }

    render() {
        return (
            <ul className="conversations-pane">
                {Object.values(this.conversations).sort(M.sortObjFn(room => room.lastActivity || room.ctime, -1))
                    .map(chatRoom => {
                        if (chatRoom.roomId && chatRoom.isDisplayable()) {
                            return (
                                <ConversationsListItem
                                    key={chatRoom.roomId}
                                    chatRoom={chatRoom}
                                    contact={M.u[chatRoom.getParticipantsExceptMe()[0]] || null}
                                    messages={chatRoom.messagesBuff}
                                    onConversationClicked={() => loadSubPage(chatRoom.getRoomUrl(false))}
                                />
                            );
                        }
                        return null;
                    })}
            </ul>
        );
    }
}

class ArchivedConversationsList extends MegaRenderMixin {
    constructor (props) {
        super(props);
        this.state = this.getInitialState();

        this.onSortNameClicked = this.onSortNameClicked.bind(this);
        this.onSortTimeClicked = this.onSortTimeClicked.bind(this);
    }

    getInitialState() {
        return {
            'items': megaChat.chats,
            'orderby': 'lastActivity',
            'nameorder': 1,
            'timeorder': -1,
            'confirmUnarchiveChat': null,
            'confirmUnarchiveDialogShown': false,
        };
    }
    conversationClicked(room, e) {
        room.showArchived = true;
        loadSubPage(room.getRoomUrl());
        e.stopPropagation();
    }
    conversationSelected(room, e) {
        var self = this;
        var previousState = room.archivedSelected ? room.archivedSelected : false;
        var sortedConversations = obj_values(megaChat.chats.toJS());
        sortedConversations.forEach((chatRoom) => {
            if (!chatRoom || !chatRoom.roomId) {
                return;
            }
            if (!chatRoom.isArchived()) {
                return;
            }
            if (chatRoom.chatId !== room.chatId) {
                chatRoom.archivedSelected = false;
            }
            else {
                chatRoom.archivedSelected = !chatRoom.archivedSelected;
            }
        });
        room.archivedSelected = !previousState;
        self.setState({
            'items': sortedConversations
        });
        e.stopPropagation();
    }
    unarchiveConversationClicked(room, e) {
        var self = this;
        self.setState({
            'confirmUnarchiveDialogShown': true,
            'confirmUnarchiveChat': room.roomId
        });
    }
    onSortNameClicked(e) {
        this.setState({
            'orderby': 'name',
            'nameorder': this.state.nameorder * -1
        });
    }
    onSortTimeClicked(e) {
        this.setState({
            'orderby': 'lastActivity',
            'timeorder': this.state.timeorder * -1
        });
    }
    render() {
        var self = this;
        var currConvsList = [];

        var sortedConversations = obj_values(megaChat.chats.toJS());
        var orderValue = -1;
        var orderKey = "lastActivity";

        var nameOrderClass = "";
        var timerOrderClass = "";
        if (self.state.orderby === "name") {
            orderKey = getRoomName;
            orderValue = self.state.nameorder;
            nameOrderClass = self.state.nameorder === 1 ? "down" : "up";
        } else {
            orderKey = "lastActivity";
            orderValue = self.state.timeorder;
            timerOrderClass = self.state.timeorder === 1 ? "down" : "up";
        }

        sortedConversations.sort(M.sortObjFn(orderKey, orderValue));
        sortedConversations.forEach((chatRoom) => {
            var contact;
            if (!chatRoom || !chatRoom.roomId) {
                return;
            }
            if (!chatRoom.isArchived()) {
                return;
            }

            if (chatRoom.type === "private") {
                contact = chatRoom.getParticipantsExceptMe()[0];
                if (!contact) {
                    return;
                }
                contact = M.u[contact];

                if (contact) {
                    if (!chatRoom.privateReadOnlyChat && !contact.c) {
                        // a non-contact conversation, e.g. contact removed - mark as read only
                        Soon(function () {
                            chatRoom.privateReadOnlyChat = true;
                        });
                    }
                    else if (chatRoom.privateReadOnlyChat && contact.c) {
                        // a non-contact conversation, e.g. contact removed - mark as read only
                        Soon(function () {
                            chatRoom.privateReadOnlyChat = false;
                        });
                    }
                }
            }

            currConvsList.push(
                <ArchConversationsListItem
                    key={chatRoom.roomId}
                    chatRoom={chatRoom}
                    contact={contact}
                    messages={chatRoom.messagesBuff}
                    onConversationClicked={(e) => {
                        self.conversationClicked(chatRoom, e);
                }}
                    onConversationSelected={(e) => {
                        self.conversationSelected(chatRoom, e);
                }}
                    onUnarchiveClicked={(e) => {
                        self.unarchiveConversationClicked(chatRoom, e);
                }}/>
            );
        });

        var confirmUnarchiveDialog = null;
        if (self.state.confirmUnarchiveDialogShown === true) {
            var room = megaChat.chats[self.state.confirmUnarchiveChat];
            if (room) {
                confirmUnarchiveDialog = <ModalDialogsUI.ConfirmDialog
                    chatRoom={room}
                    title={l[19063]}
                    subtitle={l[19064]}
                    icon="sprite-fm-uni icon-question"
                    name="unarchive-conversation"
                    pref="5"
                    onClose={() => {
                        self.setState({'confirmUnarchiveDialogShown': false});
                    }}
                    onConfirmClicked={() => {
                        room.unarchive();
                        self.setState({'confirmUnarchiveDialogShown': false});
                    }}
                />;
            }
        }

        return (
            <div className="chat-content-block archived-chats">
                <>
                    {currConvsList && currConvsList.length ?
                        <div className="files-grid-view archived-chat-view">
                            <div className="grid-scrolling-table archive-chat-list">
                                <div className="grid-wrapper">
                                    <table className="grid-table arc-chat-messages-block table-hover">
                                        <thead>
                                            <tr>
                                                <th className="calculated-width" onClick={self.onSortNameClicked}>
                                                    <div className="is-chat arrow name">
                                                        <i
                                                            className={
                                                                nameOrderClass ?
                                                                    `sprite-fm-mono icon-arrow-${nameOrderClass}` :
                                                                    ''
                                                            }
                                                        />
                                                        {l[86] /* `Name` */}
                                                    </div>
                                                </th>
                                                <th width="330" onClick={self.onSortTimeClicked}>
                                                    <div className={`is-chat arrow interaction ${timerOrderClass}`}>
                                                        <i
                                                            className={
                                                                timerOrderClass ?
                                                                    `sprite-fm-mono icon-arrow-${timerOrderClass}` :
                                                                    ''
                                                            }
                                                        />
                                                        {l[5904] /* `Last interaction` */}
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currConvsList}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div> :
                        <Nil title={l.archived_nil /* `No archived chats` */} />
                    }
                </>
                {confirmUnarchiveDialog}
            </div>
        );
    }
}

class ConversationsApp extends MegaRenderMixin {
    constructor(props) {
        super(props);
        this.state = {
            leftPaneWidth: mega.config.get('leftPaneWidth'),
            startGroupChatDialogShown: false,
            startMeetingDialog: false
        };
        this.handleWindowResize = this.handleWindowResize.bind(this);

        this._cacheRouting();

        megaChat.rebind('onStartNewMeeting.convApp', () => this.startMeeting());
    }
    startMeeting() {
        if (megaChat.hasSupportForCalls) {
            return inProgressAlert()
                .then(() => this.setState({ startMeetingDialog: true }))
                .catch(() => d && console.warn('Already in a call.'));
        }
        return showToast('warning', l[7211] /* `Your browser does not have the required audio/video capabilities` */);
    }
    _cacheRouting() {
        this.routingSection = this.props.megaChat.routingSection;
        this.routingSubSection = this.props.megaChat.routingSubSection;
        this.routingParams = this.props.megaChat.routingParams;
    }
    specShouldComponentUpdate() {
        // Since this is a root component, there are issues with it (or the hotreload) causing it to not properly
        // update when needed, so we need to cache important root re-updates in here.
        if (
            this.routingSection !== this.props.megaChat.routingSection ||
            this.routingSubSection !== this.props.megaChat.routingSubSection ||
            this.routingParams !== this.props.megaChat.routingParams
        ) {
            this._cacheRouting();
            return true;
        }
    }
    startChatClicked(selected) {
        if (selected.length === 1) {
            megaChat.createAndShowPrivateRoom(selected[0])
                .then(function(room) {
                    room.setActive();
                });
        }
        else {
            megaChat.createAndShowGroupRoomFor(selected);
        }
    }
    componentDidMount() {
        super.componentDidMount();
        var self = this;

        $(document.body).rebind('startNewChatLink.conversations', function(e) {
            self.startGroupChatFlow = 2;
            self.setState({'startGroupChatDialogShown': true});
        });

        window.addEventListener('resize', this.handleWindowResize);
        $(document).rebind('keydown.megaChatTextAreaFocus', function(e) {
            // prevent recursion!
            if (!M.chat || e.megaChatHandled) {
                return;
            }

            const currentlyOpenedChat = megaChat.currentlyOpenedChat;
            const currentRoom = megaChat.getCurrentRoom();
            if (currentlyOpenedChat) {
                // don't do ANYTHING if the current focus is already into an input/textarea/select or a .mega-dialog
                // is visible/active at the moment
                if (
                    (currentlyOpenedChat && currentRoom && currentRoom.isReadOnly()) ||
                    $(e.target).is(".messages-textarea, input, textarea") ||
                    ((e.ctrlKey || e.metaKey || e.which === 19) && (e.keyCode === 67)) ||
                    e.keyCode === 91 /* cmd+... */ ||
                    e.keyCode === 17 /* ctrl+... */ ||
                    e.keyCode === 27 /* esc */ ||
                    e.altKey ||  e.metaKey || e.ctrlKey || e.shiftKey ||
                    ($('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block')) ||
                    $(document.querySelector('.mega-dialog, .dropdown')).is(':visible') ||
                    document.querySelector('textarea:focus,select:focus,input:focus')
                ) {
                    return;
                }

                var $typeArea = $('.messages-textarea:visible:first');
                moveCursortoToEnd($typeArea);
                e.megaChatHandled = true;
                $typeArea.triggerHandler(e);
                e.preventDefault();
                e.stopPropagation();
                return false;

            }
        });

        $(document).rebind('mouseup.megaChatTextAreaFocus', function(e) {
            // prevent recursion!
            if (!M.chat || e.megaChatHandled || slideshowid) {
                return;
            }

            var $target = $(e.target);

            if (megaChat.currentlyOpenedChat) {
                // don't do ANYTHING if the current focus is already into an input/textarea/select or a .mega-dialog
                // is visible/active at the moment
                if (
                    $target.is(".messages-textarea,a,input,textarea,select,button") ||
                    $target.closest('.messages.scroll-area').length > 0 ||
                    ($('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block')) ||
                    $(document.querySelector('.mega-dialog, .dropdown')).is(':visible') ||
                    document.querySelector('textarea:focus,select:focus,input:focus')
                ) {
                    return;
                }

                var $typeArea = $('.messages-textarea:visible:first');
                if ($typeArea.length === 1 && !$typeArea.is(":focus")) {
                    $typeArea.trigger("focus");
                    e.megaChatHandled = true;
                }

            }
        });


        self.fmConfigLeftPaneListener = mBroadcaster.addListener('fmconfig:leftPaneWidth', function(value) {
            if (value > 0) {
                megaChat.$leftPane = megaChat.$leftPane || $('.conversationsApp .fm-left-panel');
                delay('CoApp:fmc:thr', function() {
                    self.setState({leftPaneWidth: value});
                    $('.jspVerticalBar:visible').addClass('hiden-when-dragging');
                    $('.jScrollPaneContainer:visible').trigger('forceResize');
                }, 75);
                megaChat.$leftPane.width(value);
                $('.fm-tree-panel', megaChat.$leftPane).width(value);
                self.onResizeDoUpdate();
            }
        });


        var lPaneResizableInit = function() {
            megaChat.$leftPane = megaChat.$leftPane || $('.conversationsApp .fm-left-panel');
            $.leftPaneResizableChat = new FMResizablePane(megaChat.$leftPane, $.leftPaneResizable.options);

            if (fmconfig.leftPaneWidth) {
                megaChat.$leftPane.width(Math.min(
                    $.leftPaneResizableChat.options.maxWidth,
                    Math.max($.leftPaneResizableChat.options.minWidth, fmconfig.leftPaneWidth)
                ));
            }

            $($.leftPaneResizableChat).on('resize', function() {
                var w = megaChat.$leftPane.width();
                if (w >= $.leftPaneResizableChat.options.maxWidth) {
                    $('.left-pane-drag-handle').css('cursor', 'w-resize')
                } else if (w <= $.leftPaneResizableChat.options.minWidth) {
                    $('.left-pane-drag-handle').css('cursor', 'e-resize')
                } else {
                    $('.left-pane-drag-handle').css('cursor', 'we-resize')
                }

                $('.jspVerticalBar:visible').addClass('hiden-when-dragging');
            });

            $($.leftPaneResizableChat).on('resizestop', function() {
                $('.fm-left-panel').width(
                    megaChat.$leftPane.width()
                );

                $('.jScrollPaneContainer:visible').trigger('forceResize');

                setTimeout(function() {
                    $('.hiden-when-dragging').removeClass('hiden-when-dragging');
                }, 100);
            });
        };

        if (typeof($.leftPaneResizable) === 'undefined') {
            mBroadcaster.once('fm:initialized', function() {
                lPaneResizableInit();
            });
        }
        else {
            lPaneResizableInit();

        }

        megaChat.$leftPane = megaChat.$leftPane || $('.conversationsApp .fm-left-panel');
        if (is_chatlink && !is_eplusplus) {
            megaChat.$leftPane.addClass('hidden');
        }
        else {
            megaChat.$leftPane.removeClass('hidden');
        }
        this.handleWindowResize();
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        window.removeEventListener('resize', this.handleWindowResize);
        $(document).off('keydown.megaChatTextAreaFocus');
        mBroadcaster.removeListener(this.fmConfigLeftPaneListener);
        delete this.props.megaChat.$conversationsAppInstance;
    }

    componentDidUpdate() {
        this.handleWindowResize();
        if (megaChat.routingSection === "archived") {
            this.initArchivedChatsScrolling();
        }
    }

    @utils.SoonFcWrap(80)
    handleWindowResize() {
        if (!M.chat) {
            return;
        }
        // small piece of what is done in fm_resize_handler...
        if (is_chatlink && !is_eplusplus) {
            $('.fm-right-files-block, .fm-right-account-block')
                .filter(':visible')
                .css({
                    'margin-left': "0px"
                });
        }
        else {
            if (megaChat.$leftPane && megaChat.$leftPane.hasClass('resizable-pane-active')) {
                return;
            }
            const lhpWidth = this.state.leftPaneWidth || $('.fm-left-panel').width();
            const newMargin = `${lhpWidth + $('.nw-fm-left-icons-panel').width()}px`;
            $('.fm-right-files-block, .fm-right-account-block')
                .filter(':visible')
                .css({
                    'margin-inline-start': newMargin,
                    '-webkit-margin-start:': newMargin
                });
        }
    }
    initArchivedChatsScrolling() {
        var scroll = '.archive-chat-list';
        deleteScrollPanel(scroll, 'jsp');
        $(scroll).jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});
        jScrollFade(scroll);
    }
    archiveChatsClicked = () => {
        loadSubPage('fm/chat/archived');
    };
    calcArchiveChats() {
        var count = 0;
        megaChat.chats.forEach((chatRoom) => {
            if (!chatRoom || !chatRoom.roomId) {
                return;
            }
            if (chatRoom.isArchived()) {
                count++;
            }
        });
        return count;
    }
    getContactsPickerButtons() {
        if (!this._topButtonsContactsPicker) {
            this._topButtonsContactsPicker = [
                {
                    key: 'newGroupChat',
                    title: l[19483],
                    icon: 'sprite-fm-mono icon-chat-filled',
                    onClick: () => {
                        this.startGroupChatFlow = 1;
                        this.setState({ startGroupChatDialogShown: true });
                    }
                },
                {
                    key: 'newMeeting',
                    className: 'new-meeting',
                    title: l.new_meeting,
                    icon: 'sprite-fm-mono icon-video-call-filled',
                    onClick: () => this.startMeeting()
                },
                {
                    key: 'newChatLink',
                    className: 'new-chatlink',
                    title: l[20638],
                    icon: 'sprite-fm-mono icon-channel-new',
                    onClick: () => {
                        this.startGroupChatFlow = 2;
                        this.setState({ startGroupChatDialogShown: true });
                    }
                }
            ];
        }
        return this._topButtonsContactsPicker;
    }
    createMeetingEndDlgIfNeeded() {
        if (megaChat.initialPubChatHandle || megaChat.initialChatId) {

            let chatRoom = megaChat.getCurrentRoom();
            if (!chatRoom) {
                return null;
            }
            if (!chatRoom.initialMessageHistLoaded /* haven't received the CALL info yet */) {
                return null;
            }

            if (megaChat.meetingDialogClosed === chatRoom.chatId) {
                return null;
            }

            const activeCallIds = chatRoom.activeCallIds.keys();
            if (
                chatRoom.isMeeting &&
                activeCallIds.length === 0 &&
                (
                    megaChat.initialPubChatHandle && chatRoom.publicChatHandle === megaChat.initialPubChatHandle ||
                    chatRoom.chatId === megaChat.initialChatId
                )
            ) {
                return (
                    <MeetingsCallEndedDialog
                        onClose={() => {
                            // temporary, only available during the Standalone page when anonymous
                            megaChat.meetingDialogClosed = chatRoom.chatId;
                            megaChat.trackDataChange();
                        }}
                    />
                );
            }
        }
        return null;
    }
    render() {
        var self = this;

        var startGroupChatDialog = null;
        if (self.state.startGroupChatDialogShown === true) {
            startGroupChatDialog = <StartGroupChatWizard
                    name="start-group-chat"
                    flowType={self.startGroupChatFlow}
                    onClose={() => {
                        self.setState({'startGroupChatDialogShown': false});
                        delete self.startGroupChatFlow;
                    }}
                    onConfirmClicked={() => {
                        self.setState({'startGroupChatDialogShown': false});
                        delete self.startGroupChatFlow;
                    }}
                />;
        }

        var startMeetingDialog = null;
        if (self.state.startMeetingDialog === true) {
            startMeetingDialog = (
                <StartMeetingDialog
                    onStart={(topic, audio, video) => {
                        megaChat.createAndStartMeeting(topic, audio, video);
                        this.setState({ startMeetingDialog: false });
                    }}
                    onClose={() => this.setState({ startMeetingDialog: false })}
                />
            );
        }

        var leftPanelStyles = {};
        if (self.state.leftPaneWidth) {
            leftPanelStyles.width = self.state.leftPaneWidth;
        }

        var loadingOrEmpty = null;
        var isLoading = false;

        var nonArchivedChats = megaChat.chats.map(function(r) { return !r.isArchived() ? r : undefined; });
        if (nonArchivedChats.length === 0) {
            loadingOrEmpty = <div className="fm-empty-messages hidden">
                <div className="fm-empty-pad">
                    <div className="fm-empty-messages-bg"></div>
                    <div className="fm-empty-cloud-txt">{l[6870]}</div>
                    <div className="fm-not-logged-text">
                        <div className="fm-not-logged-description">
                            <ParsedHTML>
                                {l[8762].replace("[S]", "<span className='red'>").replace("[/S]", "</span>")}
                            </ParsedHTML>
                        </div>
                        <div className="fm-not-logged-button create-account">
                            {l[968]}
                        </div>
                    </div>
                </div>
            </div>;
        }
        else if (
            !megaChat.currentlyOpenedChat &&
            megaChat.allChatsHadInitialLoadedHistory() === false &&
            megaChat.routingSection !== "archived"
        ) {
            loadingOrEmpty = <div className="fm-empty-messages">
                <div className="loading-spinner js-messages-loading light manual-management" style={{"top":"50%"}}>
                    <div className="main-loader" style={{
                        "position":"fixed",
                        "top": "50%",
                        "left": "50%",
                        "marginLeft": "72px"
                    }}></div>
                </div>
            </div>;
            isLoading = true;
        }
        else if (
            /* is chat link scenario, where we want to delay the loading until hist had finished loading */
            is_chatlink && (
                !megaChat.getCurrentRoom() || /* not initialized the chat link room */
                megaChat.getCurrentRoom().initialMessageHistLoaded === false /* haven't loaded the history yet */
            )
        ) {
            loadingOrEmpty = <div className="fm-empty-messages">
                <div className="loading-spinner js-messages-loading light manual-management" style={{"top":"50%"}}>
                    <div className="main-loader" style={{
                        "position":"fixed",
                        "top": "50%",
                        "left": "50%",
                    }}></div>
                </div>
            </div>;

            const currentChatRoom = megaChat.getCurrentRoom();
            if (currentChatRoom) {
                // if we are waiting for messages to be loaded, trigger a force update once thats done.
                currentChatRoom.one('onMessagesHistoryDone.loadingStop', () => this.safeForceUpdate());
            }
            isLoading = true;
        }

        var rightPaneStyles = {};
        if (is_chatlink && !is_eplusplus) {
            rightPaneStyles = {'marginLeft': 0};
        }

        let meetingsCallEndedDialog = this.createMeetingEndDlgIfNeeded();

        const rightPane = <div className={`fm-right-files-block in-chat ${
            is_chatlink ? " chatlink" : ""
        }`} style={rightPaneStyles}>
            {loadingOrEmpty}
            {!isLoading && <ChatToaster isRootToaster={true}/>}
            {
                !isLoading && megaChat.routingSection === "archived" &&
                <ArchivedConversationsList key="archivedchats" />
            }
            {!isLoading && megaChat.routingSection === "contacts" &&
                <ContactsPanel megaChat={megaChat} contacts={M.u} received={M.ipc} sent={M.opc} />
            }
            {!isLoading && megaChat.routingSection === "notFound" &&
                <span><center>Section not found</center></span>
            }
            {!isLoading && meetingsCallEndedDialog}
            {!isLoading ?
                <ConversationPanels
                    {...this.props}
                    chatUIFlags={megaChat.chatUIFlags}
                    displayArchivedChats={megaChat.routingSection === "archived"}
                    className={megaChat.routingSection !== "chat" ? 'hidden' : ''}
                    currentlyOpenedChat={megaChat.currentlyOpenedChat}
                    chats={megaChat.chats}
                /> : null
            }
        </div>;

        var archivedChatsCount = this.calcArchiveChats();
        var arcBtnClass = "left-pane-button archived";
        var arcIconClass = "small-icon archive colorized";

        if (megaChat.routingSection === "archived") {
            arcBtnClass += ' active';
            arcIconClass = arcIconClass.replace('colorized', 'white');
        }

        return (
            <div
                key="conversationsApp"
                className="conversationsApp">
                {startGroupChatDialog}
                {startMeetingDialog}
                <div
                    className={`
                        fm-left-panel
                        chat-lp-body
                        ${is_chatlink && 'hidden' || ''}
                        ${megaChat._joinDialogIsShown && 'hidden' || ''}
                    `}
                    style={leftPanelStyles}>
                    <div className="left-pane-drag-handle" />
                    <ConversationsHead
                        megaChat={megaChat}
                        contactsActive={megaChat.routingSection === "contacts"}
                        onSelectDone={this.startChatClicked.bind(this)}
                        showTopButtons={self.getContactsPickerButtons()}
                        showAddContact={ContactsPanel.hasContacts()}
                    />
                    <SearchPanel />
                    <PerfectScrollbar
                        className="chat-lp-scroll-area"
                        chats={megaChat.chats}
                        ref={ref => {
                            megaChat.$chatTreePanePs = ref;
                        }}>
                        {megaChat.chats.length > 0 &&
                            <div
                                className={`
                                    content-panel
                                    conversations
                                    active
                                `}>
                                <span className="heading">{l.contacts_and_groups}</span>
                                <ConversationsList />
                            </div>
                        }
                    </PerfectScrollbar>
                    {megaChat.chats.length > 0 && (
                        <div
                            className={arcBtnClass}
                            onClick={this.archiveChatsClicked}>
                            <div className="heading">{l[19066] /* `Archived chats` */}</div>
                            <div className="indicator">{archivedChatsCount}</div>
                        </div>
                    )}
                </div>
                {rightPane}
            </div>
        );
    }
};


if (module.hot) {
    module.hot.accept();
    ConversationsApp = hot(ConversationsApp);
}

export default {
    ConversationsList,
    ArchivedConversationsList,
    ConversationsApp: ConversationsApp
};
