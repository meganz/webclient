// libs
import { hot } from 'react-hot-loader/root';
var React = require("react");
import utils from './../../ui/utils.jsx';
var PerfectScrollbar = require('./../../ui/perfectScrollbar.jsx').PerfectScrollbar;
import {MegaRenderMixin, timing} from './../../stores/mixins.js';
import {Button} from './../../ui/buttons.jsx';
import {DropdownContactsSelector} from './../../ui/dropdowns.jsx';
import {ConversationPanels} from "./../ui/conversationpanel.jsx";
import SearchPanel from './searchPanel/searchPanel.jsx';
import ContactsPanel from './contactsPanel/contactsPanel.jsx';
import ModalDialogsUI from './../../ui/modalDialogs.jsx';
import { Avatar, ContactAwareName } from "./contacts.jsx";
var StartGroupChatWizard = require('./startGroupChatWizard.jsx').StartGroupChatWizard;

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
        var lastMessageDatetimeDiv = null;

        var lastMessage = chatRoom.messagesBuff.getLatestTextMessage();
        var lastMsgDivClasses;
        if (lastMessage && lastMessage.renderableSummary && this.lastMessageId === lastMessage.messageId) {
            lastMsgDivClasses = this._lastMsgDivClassesCache;
            lastMessageDiv = this._lastMessageDivCache;
            lastMessageDatetimeDiv = this._lastMessageDatetimeDivCache;
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
            lastMessageDiv = <div className={lastMsgDivClasses} dangerouslySetInnerHTML={{__html:renderableSummary}}>
                    </div>;
            const voiceClipType = Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP;

            if (lastMessage.textContents && lastMessage.textContents[1] === voiceClipType) {
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

            lastMessageDatetimeDiv = <div className="date-time">{getTimeMarker(lastMessage.delay, true)}</div>;
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

            lastMessageDatetimeDiv =
                <div className="date-time">{l[19077].replace("%s1", getTimeMarker(chatRoom.ctime, true))}</div>;
        }

        this.lastMessageId = lastMessage && lastMessage.messageId;
        this._lastMsgDivClassesCache = lastMsgDivClasses
            .replace(" call-exists", "")
            .replace(" unread", "");
        this._lastMessageDivCache = lastMessageDiv;
        this._lastMessageDatetimeDivCache = lastMessageDatetimeDiv;

        if (chatRoom.callManagerCall && chatRoom.callManagerCall.isActive() === true) {
            var mediaOptions = chatRoom.callManagerCall.getMediaOptions();

            var mutedMicrophone = null;
            var activeCamera = null;
            var onHold = null;
            if (chatRoom.callManagerCall.rtcCall.isOnHold()) {
                onHold = <i className="small-icon grey-call-on-hold"></i>;
            }
            else {
                if (!mediaOptions.audio) {
                    mutedMicrophone = <i className="small-icon grey-crossed-mic"></i>;
                }
                if (mediaOptions.video) {
                    activeCamera = <i className="small-icon grey-videocam"></i>;
                }
            }
            inCallDiv = <div className="call-duration">
                {mutedMicrophone}
                {activeCamera}
                {onHold}
                <span className="call-counter" data-room-id={chatRoom.chatId}>{
                    secondsToTimeShort(chatRoom._currentCallCounter)
                }</span>
            </div>;

            classString += " call-active";
            // hide archived div when it is in a call.
            archivedDiv = "";
        }

        if (chatRoom.type !== "public") {
            nameClassString += " privateChat";
        }
        if (
            chatRoom.callManagerCall &&
            (
                chatRoom.callManagerCall.state === CallManagerCall.STATE.WAITING_RESPONSE_INCOMING ||
                chatRoom.callManagerCall.state === CallManagerCall.STATE.WAITING_RESPONSE_OUTGOING
            )
        ) {
            classString += " have-incoming-ringing-call";
        }

        var roomTitle = <utils.EmojiFormattedContent>{chatRoom.getRoomTitle()}</utils.EmojiFormattedContent>;
        if (chatRoom.type === "private") {
            roomTitle = <ContactAwareName contact={this.props.contact}>{roomTitle}</ContactAwareName>;
        }

        var self = this;
        return (
            <li className={classString} id={id} data-room-id={roomId} data-jid={contactId}
                onClick={(e) => {
                    self.props.onConversationClicked(e);
                }}>
                <div className="conversation-avatar">
                    {chatRoom.type === 'group' || chatRoom.type === 'public' ?
                        <div className="chat-topic-icon">
                            <i className="sprite-fm-uni icon-chat-group" />
                        </div> :
                        <Avatar contact={chatRoom.getParticipantsExceptMe()[0]} />}
                </div>
                <div className="conversation-data">
                    <div className={nameClassString}>
                        {roomTitle}
                        {
                            chatRoom.type === "private" ?
                                <span className={"user-card-presence " + presenceClass}></span>
                                :
                                undefined
                        }
                    </div>
                    {
                        chatRoom.type === "group" || chatRoom.type === "private" ?
                            <i className="sprite-fm-uni icon-ekr-key simpletip" data-simpletip={l[20935]} /> : undefined
                    }
                    {archivedDiv}
                    {notificationItems.length > 0 ?
                        <div className="unread-messages-container">
                            <div className={"unread-messages items-" + notificationItems.length}>
                                {notificationItems}
                            </div>
                        </div> : null}
                    <div className="clear" />
                    <div className="conversation-message-info">
                        {lastMessageDiv}
                        <div className="conversations-separator">
                            <i className="sprite-fm-mono icon-dot" />
                        </div>
                        {lastMessageDatetimeDiv}
                    </div>
                </div>
            </li>
        );
    }
};

class ArchConversationsListItem extends MegaRenderMixin {
    render() {
        var classString = "arc-chat-list ui-droppable ui-draggable ui-draggable-handle";

        var megaChat = this.props.chatRoom.megaChat;

        var chatRoom = this.props.chatRoom;
        if (!chatRoom || !chatRoom.chatId) {
            return null;
        }

        var roomId = chatRoom.chatId;

        // selected
        if (chatRoom.archivedSelected === true) {
            classString += " ui-selected";
        }

        var nameClassString = "user-card-name conversation-name";

        var contactId;
        var presenceClass;
        var id;

        if (chatRoom.type === "private") {
            var contact = M.u[chatRoom.getParticipantsExceptMe()[0]];


            if (!contact) {
                return null;
            }
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


        var lastMessageDiv = null;
        var lastMessageDatetimeDiv = null;
        var lastMsgDivClasses = "conversation-message";
        var lastMessage = chatRoom.messagesBuff.getLatestTextMessage();
        if (lastMessage) {
            var renderableSummary = lastMessage.renderableSummary || chatRoom.messagesBuff.getRenderableSummary(
                lastMessage
            );
            lastMessage.renderableSummary = renderableSummary;

            lastMessageDiv = <div className={lastMsgDivClasses} dangerouslySetInnerHTML={{__html:renderableSummary}}>
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

            var emptyMessage = (
                (
                    chatRoom.messagesBuff.messagesHistoryIsLoading() ||
                    this.loadingShown ||
                    chatRoom.messagesBuff.joined === false
                    ) ? (
                        l[7006]
                    ) :
                    l[8000]
            );

            lastMessageDiv =
                <div>
                    <div className={lastMsgDivClasses}>
                        {emptyMessage}
                    </div>
                </div>;
        }
        if (chatRoom.type !== "public") {
            nameClassString += " privateChat";
        }

        return (
            <tr
                className={classString}
                id={id}
                data-room-id={roomId}
                data-jid={contactId}
                onClick={this.props.onConversationSelected.bind(this)}
                onDoubleClick={this.props.onConversationClicked.bind(this)}>
                <td className="">
                    <div className="fm-chat-user-info todo-star">
                        <div className={nameClassString}>
                            <utils.EmojiFormattedContent>{chatRoom.getRoomTitle()}</utils.EmojiFormattedContent>
                            {chatRoom.type === "group" ? <i className="sprite-fm-uni icon-ekr-key"/> : undefined}
                        </div>
                        {lastMessageDiv}
                        {lastMessageDatetimeDiv}
                    </div>
                    <div className="archived-badge">{l[19067]}</div>
                </td>
                <td width="330">
                    <div className="archived-on">
                        <div className="archived-date-time">{lastMessageDatetimeDiv}</div>
                        <div className="clear" />
                    </div>
                    <button
                        className="mega-button unarchive-chat right"
                        onClick={this.props.onUnarchiveConversationClicked.bind(this)}>
                        <span>{l[19065]}</span>
                    </button>
                </td>
            </tr>
        );
    }
};

class ConversationsHead extends MegaRenderMixin {
    requestReceivedListener = null;

    constructor(props) {
        super(props);
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.requestReceivedListener) {
            mBroadcaster.removeListener(this.requestReceivedListener);
        }
    }

    componentDidMount() {
        super.componentDidMount();
        this.requestReceivedListener = mBroadcaster.addListener('fmViewUpdate:ipc', () => updateIpcRequests());
    }

    render() {
        const { contactsActive, onSelectDone, showTopButtons, showAddContact } = this.props;
        const RECEIVED_REQUESTS_COUNT = Object.keys(M.ipc).length;
        const ROUTES = { CHAT: 'fm/chat', CONTACTS: 'fm/chat/contacts' };
        const CONTACTS_ACTIVE = window.location.pathname.indexOf(ROUTES.CONTACTS) !== -1;

        return (
            <div className="conversations-head">
                <h2>{l[5902]}</h2>
                <div className="conversations-head-buttons">
                    <div className="contacts-toggle">
                        <Button
                            className={`
                                mega-button
                                round
                                contacts-toggle-button
                                ${contactsActive ? 'active' : ''}
                                ${RECEIVED_REQUESTS_COUNT > 0 ? 'requests' : ''}
                            `}
                            icon={`
                                sprite-fm-mono
                                icon-contacts
                                ${CONTACTS_ACTIVE ? '' : 'active'}
                            `}
                            onClick={() => loadSubPage(CONTACTS_ACTIVE ? ROUTES.CHAT : ROUTES.CONTACTS)}>
                            {RECEIVED_REQUESTS_COUNT ?
                                <div className="notifications-count ipc-count">
                                    <span>{RECEIVED_REQUESTS_COUNT}</span>
                                </div> : ''}
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
            </div>
        );
    }
}

class ConversationsList extends MegaRenderMixin {
    static defaultProps = {
        'manualDataChangeTracking': true
    }
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
    constructor (props) {
        super(props);
        this.currentCallClicked = this.currentCallClicked.bind(this);
        this.endCurrentCall = this.endCurrentCall.bind(this);
    }
    componentDidUpdate() {
        super.componentDidUpdate && super.componentDidUpdate();
    }

    conversationClicked(room, e) {
        loadSubPage(room.getRoomUrl());
        e.stopPropagation();
    }
    currentCallClicked(e) {
        var activeCallSession = megaChat.activeCallSession;
        if (activeCallSession) {
            this.conversationClicked(activeCallSession.room, e);
        }
    }
    contactClicked(contact, e) {
        loadSubPage("fm/chat/p/" + contact.u);
        e.stopPropagation();
    }
    endCurrentCall(e) {
        var activeCallSession = megaChat.activeCallSession;
        if (activeCallSession) {
            activeCallSession.endCall('hangup');
            this.conversationClicked(activeCallSession.room, e);
        }
    }
    render() {
        var self = this;

        var currentCallingContactStatusProps = {
            'className': "nw-conversations-item current-calling",
            'data-jid': ''
        };

        var activeCallSession = megaChat.activeCallSession;
        if (activeCallSession && activeCallSession.room && megaChat.activeCallSession.isActive()) {
            var room = activeCallSession.room;
            var user = room.getParticipantsExceptMe()[0];

            if (user) {
                currentCallingContactStatusProps.className += " " + user.u +
                    " " + megaChat.userPresenceToCssClass(user.presence);
                currentCallingContactStatusProps['data-jid'] = room.roomId;

                if (room.roomId == megaChat.currentlyOpenedChat) {
                    currentCallingContactStatusProps.className += " selected";
                }
            }
            else {
                currentCallingContactStatusProps.className += ' hidden';
            }
        }
        else {
            currentCallingContactStatusProps.className += ' hidden';
        }


        var currConvsList = [];

        var sortedConversations = obj_values(megaChat.chats.toJS());

        sortedConversations.sort(M.sortObjFn(function(room) {
            return !room.lastActivity ? room.ctime : room.lastActivity;
        }, -1));

        sortedConversations.forEach((chatRoom) => {
            var contact;
            if (!chatRoom || !chatRoom.roomId) {
                return;
            }
            if (!chatRoom.isDisplayable()) {
                return;
            }
            if (self.props.quickSearchText) {
                var s1 = String(chatRoom.getRoomTitle()).toLowerCase();
                var s2 = String(self.props.quickSearchText).toLowerCase();
                if (s1.indexOf(s2) === -1) {
                    return;
                }
            }

            // Checking if this a business user with expired status
            if (mega.paywall) {
                chatRoom.privateReadOnlyChat = true;
            }
            else {
                if (chatRoom.type === "private") {
                    contact = chatRoom.getParticipantsExceptMe()[0];
                    if (!contact) {
                        return;
                    }
                    contact = M.u[contact];

                    if (contact) {
                        if (!chatRoom.privateReadOnlyChat && !contact.c) {
                            // a non-contact conversation, e.g. contact removed - mark as read only
                            Soon(function() {
                                chatRoom.privateReadOnlyChat = true;
                            });
                        }
                        else if (chatRoom.privateReadOnlyChat && contact.c) {
                            // a non-contact conversation, e.g. contact removed - mark as read only
                            Soon(function() {
                                chatRoom.privateReadOnlyChat = false;
                            });
                        }
                    }
                }
            }

            currConvsList.push(
                <ConversationsListItem
                    key={chatRoom.roomId}
                    chatRoom={chatRoom}
                    contact={contact}
                    messages={chatRoom.messagesBuff}
                    onConversationClicked={(e) => {
                        self.conversationClicked(chatRoom, e);
                }} />
            );
        });


        return (
            <PerfectScrollbar options={{ 'suppressScrollX': true }}>
                <div className="conversationsList">
                    <ul className="conversations-pane">
                        {currConvsList}
                    </ul>
                </div>
            </PerfectScrollbar>
        );
    }
};

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
                    onUnarchiveConversationClicked={(e) => {
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
            <div className="files-grid-view archived-chat-view">
                <table className="grid-table-header" width="100%" cellSpacing="0" cellPadding="0" border="0">
                    <tbody>
                        <tr>
                            <th className="calculated-width" onClick={self.onSortNameClicked}>
                                <div className="is-chat name">
                                    {l[86]}
                                    <i
                                        className={
                                            nameOrderClass ? `sprite-fm-mono icon-arrow-${nameOrderClass}` : ''
                                        }
                                    />
                                </div>
                            </th>
                            <th width="330" onClick={self.onSortTimeClicked}>
                                <div className={"is-chat arrow interaction " + timerOrderClass}>
                                    {l[5904]}
                                    <i
                                        className={
                                            timerOrderClass ? `sprite-fm-mono icon-arrow-${timerOrderClass}` : ''
                                        }
                                    />
                                </div>
                            </th>
                        </tr>
                    </tbody>
                </table>
                <div className="grid-scrolling-table archive-chat-list">
                    <table className="grid-table arc-chat-messages-block">
                        <tbody>
                            {currConvsList}
                        </tbody>
                    </table>
                </div>
            </div>
            {confirmUnarchiveDialog}
        </div>
        );
    }
};

class ConversationsApp extends MegaRenderMixin {
    constructor(props) {
        super(props);
        this.state = {
            leftPaneWidth: mega.config.get('leftPaneWidth'),
            startGroupChatDialogShown: false
        };

        this._cacheRouting();
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
        if (anonymouschat) {
            megaChat.$leftPane.addClass('hidden');
        }
        else {
            megaChat.$leftPane.removeClass('hidden');
        }
        this.handleWindowResize();

        $('.conversations .nw-fm-tree-header input.chat-quick-search').rebind('cleared.jq', function(e) {
            self.setState({'quickSearchText': ''});
            treesearch = false;
        });
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        window.removeEventListener('resize', this.handleWindowResize);
        $(document).off('keydown.megaChatTextAreaFocus');
        mBroadcaster.removeListener(this.fmConfigLeftPaneListener);
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
        if (anonymouschat) {
            $('.fm-right-files-block, .fm-right-account-block')
                .filter(':visible')
                .css({
                    'margin-left': "0px"
                });
        }
        else {
            const newMargin = ($('.fm-left-panel').width() + $('.nw-fm-left-icons-panel').width()) + "px";
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
                    key: 'newChatLink',
                    title: l[20638],
                    icon: 'sprite-fm-mono icon-channel-new',
                    onClick: () => {
                        this.startGroupChatFlow = 2;
                        this.setState({ startGroupChatDialogShown: true });
                    }
                },

            ];
        }
        return this._topButtonsContactsPicker;
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
                        <div className="fm-not-logged-description" dangerouslySetInnerHTML={{
                            __html: l[8762]
                                .replace("[S]", "<span className='red'>")
                                .replace("[/S]", "</span>")
                        }}></div>
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

        var rightPaneStyles = {};
        if (anonymouschat) {
            rightPaneStyles = {'marginLeft': 0};
        }

        const rightPane = <div className="fm-right-files-block in-chat" style={rightPaneStyles}>
            {loadingOrEmpty}
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
            {!isLoading &&
                <ConversationPanels
                    {...this.props}
                    chatUIFlags={megaChat.chatUIFlags}
                    displayArchivedChats={megaChat.routingSection === "archived"}
                    className={megaChat.routingSection !== "chat" ? 'hidden' : ''}
                    currentlyOpenedChat={megaChat.currentlyOpenedChat}
                    chats={megaChat.chats}
                />
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
            <div className="conversationsApp" key="conversationsApp">
                {startGroupChatDialog}
                <div className="fm-left-panel chat-left-panel" style={leftPanelStyles}>
                    <div className="left-pane-drag-handle" />
                    <div className="fm-left-menu conversations">
                        <ConversationsHead
                            megaChat={megaChat}
                            contactsActive={megaChat.routingSection === "contacts"}
                            onSelectDone={this.startChatClicked.bind(this)}
                            showTopButtons={self.getContactsPickerButtons()}
                            showAddContact={true}
                        />
                    </div>
                    <SearchPanel />
                    <div className="fm-tree-panel manual-tree-panel-scroll-management" style={leftPanelStyles}>
                        <PerfectScrollbar
                            style={leftPanelStyles}
                            className="conversation-reduce-height"
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
                                    <span className="heading">Contacts and Groups</span>
                                    <ConversationsList quickSearchText={this.state.quickSearchText} />
                                </div>
                            }
                        </PerfectScrollbar>
                        <div
                            className={arcBtnClass}
                            onClick={this.archiveChatsClicked}>
                            <div className="heading">{l[19066]}</div>
                            <div className="indicator">{archivedChatsCount}</div>
                        </div>
                    </div>
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
