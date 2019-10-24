// libs
import { hot } from 'react-hot-loader/root';
var React = require("react");
var ReactDOM = require("react-dom");
import utils from './../../ui/utils.jsx';
var getMessageString = require('./messages/utils.jsx').getMessageString;
var PerfectScrollbar = require('./../../ui/perfectScrollbar.jsx').PerfectScrollbar;
import MegaRenderMixin from './../../stores/mixins.js';
import {Button} from './../../ui/buttons.jsx';
import {DropdownContactsSelector} from './../../ui/dropdowns.jsx';
import ContactsUI  from './../ui/contacts.jsx';
import {ConversationPanels} from "./../ui/conversationpanel.jsx";
import ModalDialogsUI from './../../ui/modalDialogs.jsx';
var StartGroupChatWizard = require('./startGroupChatWizard.jsx').StartGroupChatWizard;

var renderMessageSummary = function(lastMessage) {
    var renderableSummary;
    if (lastMessage.renderableSummary) {
        renderableSummary = lastMessage.renderableSummary;
    }
    else {
        if (lastMessage.isManagement && lastMessage.isManagement()) {
            renderableSummary = lastMessage.getManagementMessageSummaryText();
        }
        else if (!lastMessage.textContents && lastMessage.dialogType) {
            renderableSummary = Message._getTextContentsForDialogType(lastMessage);
        }
        else {
            renderableSummary = lastMessage.textContents;
        }
        renderableSummary = renderableSummary && escapeHTML(renderableSummary, true) || '';

        var escapeUnescapeArgs = [
            {'type': 'onPreBeforeRenderMessage', 'textOnly': true},
            {'message': {'textContents': renderableSummary}},
            ['textContents', 'messageHtml'],
            'messageHtml'
        ];

        megaChat.plugins.btRtfFilter.escapeAndProcessMessage(
            escapeUnescapeArgs[0],
            escapeUnescapeArgs[1],
            escapeUnescapeArgs[2],
            escapeUnescapeArgs[3]
        );
        renderableSummary = escapeUnescapeArgs[1].message.textContents;

        renderableSummary = megaChat.plugins.emoticonsFilter.processHtmlMessage(renderableSummary);
        renderableSummary = megaChat.plugins.rtfFilter.processStripRtfFromMessage(renderableSummary);

        escapeUnescapeArgs[1].message.messageHtml = renderableSummary;

        escapeUnescapeArgs[0].type = "onPostBeforeRenderMessage";

        renderableSummary = megaChat.plugins.btRtfFilter.unescapeAndProcessMessage(
            escapeUnescapeArgs[0],
            escapeUnescapeArgs[1],
            escapeUnescapeArgs[2],
            escapeUnescapeArgs[3]
        );

        renderableSummary = renderableSummary || "";
        renderableSummary = renderableSummary.replace("<br/>", "\n").split("\n");
        renderableSummary = renderableSummary.length > 1 ? renderableSummary[0] + "..." : renderableSummary[0];
    }

    var author;

    if (lastMessage.dialogType === "privilegeChange" && lastMessage.meta && lastMessage.meta.targetUserId) {
        author = M.u[lastMessage.meta.targetUserId[0]] || Message.getContactForMessage(lastMessage);
    }
    else if (lastMessage.dialogType === "alterParticipants") {
        author = M.u[lastMessage.meta.included[0] || lastMessage.meta.excluded[0]] ||
            Message.getContactForMessage(lastMessage);
    }
    else {
        author = Message.getContactForMessage(lastMessage);
    }
    if (author) {
        if (!lastMessage._contactChangeListener && author.addChangeListener) {
            lastMessage._contactChangeListener = author.addChangeListener(function() {
                delete lastMessage.renderableSummary;
                lastMessage.trackDataChange();
            });
        }

        if (lastMessage.chatRoom.type === "private") {
            if (author && author.u === u_handle) {
                renderableSummary = l[19285] + " " + renderableSummary;
            }
        }
        else if (lastMessage.chatRoom.type === "group" || lastMessage.chatRoom.type === "public") {
            if (author) {
                if (author.u === u_handle) {
                    renderableSummary = l[19285] + " " + renderableSummary;
                }
                else {
                    var name = M.getNameByHandle(author.u);
                    name = ellipsis(name, undefined, 11);
                    if (name) {
                        renderableSummary = escapeHTML(name) + ": " + renderableSummary;
                    }
                }
            }
        }
    }

    return renderableSummary;
};
var getRoomName = function(chatRoom) {
    return chatRoom.getRoomTitle();
};

class ConversationsListItem extends MegaRenderMixin(React.Component) {
    specificShouldComponentUpdate() {
        if (
            this.loadingShown ||
            (this.props.chatRoom.messagesBuff.messagesHistoryIsLoading() && this.loadingShown) ||
            (
                this.props.chatRoom.messagesBuff.isDecrypting &&
                this.props.chatRoom.messagesBuff.isDecrypting.state() === 'pending' &&
                this.loadingShown
            ) ||
            (
                this.props.chatRoom.messagesBuff.isDecrypting &&
                this.props.chatRoom.messagesBuff.isDecrypting.state() === 'pending' &&
                this.loadingShown
            )
        ) {
            return false;
        }
        else {
            return undefined;
        }
    }
    componentWillMount() {
        var self = this;
        self.chatRoomChangeListener = function() {
            self.debouncedForceUpdate(750);
        };
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
    eventuallyScrollTo() {
        if (
            this.props.chatRoom._scrollToOnUpdate &&
            megaChat.currentlyOpenedChat === this.props.chatRoom.roomId
        ) {
            this.props.chatRoom.scrollToChat();
        }
    }
    render() {
        var classString = "";

        var megaChat = this.props.chatRoom.megaChat;

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
            archivedDiv = <div className="archived-badge">{__(l[19067])}</div>;
        }

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

        if (
            (
                ChatdIntegration._loadingChats[chatRoom.roomId] &&
                ChatdIntegration._loadingChats[chatRoom.roomId].loadingPromise &&
                ChatdIntegration._loadingChats[chatRoom.roomId].loadingPromise.state() === 'pending'
            ) ||
            chatRoom.messagesBuff.messagesHistoryIsLoading() === true ||
            chatRoom.messagesBuff.joined === false ||
            (
                chatRoom.messagesBuff.joined === true &&
                chatRoom.messagesBuff.haveMessages === true &&
                chatRoom.messagesBuff.messagesHistoryIsLoading() === true
            ) ||
            (
                chatRoom.messagesBuff.isDecrypting &&
                chatRoom.messagesBuff.isDecrypting.state() === 'pending'
            )
        ) {
            this.loadingShown = true;
        }
        else {
            delete this.loadingShown;
        }

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
            var renderableSummary = lastMessage.renderableSummary || renderMessageSummary(lastMessage);
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
                        <span className="voice-message-icon"></span>{playTime}
                    </div>
                );
            }

            if (lastMessage.metaType && lastMessage.metaType === Message.MESSAGE_META_TYPE.GEOLOCATION) {
                lastMessageDiv = (
                    <div className={lastMsgDivClasses}>
                        <span className="geolocation-icon"></span>{l[20789]}
                    </div>
                );
            }

            var timestamp = lastMessage.delay;
            var curTimeMarker;
            var msgDate = new Date(timestamp * 1000);
            var iso = (msgDate.toISOString());
            if (todayOrYesterday(iso)) {
                // if in last 2 days, use the time2lastSeparator
                curTimeMarker = time2lastSeparator(iso) + ", " + unixtimeToTimeString(timestamp);
            }
            else {
                // if not in the last 2 days, use 1st June [Year]
                curTimeMarker = acc_time2date(timestamp, false);
            }

            lastMessageDatetimeDiv = <div className="date-time">{curTimeMarker}</div>;
        }
        else {
            lastMsgDivClasses = "conversation-message";

            /**
             * Show "Loading" until:
             * 1. I'd fetched chats from the API.
             * 2. I'm retrieving history at the moment.
             * 3. I'd connected to chatd and joined the room.
              */

            var emptyMessage = (
                (
                    ChatdIntegration.mcfHasFinishedPromise.state() !== 'resolved' ||
                    chatRoom.messagesBuff.messagesHistoryIsLoading() ||
                    this.loadingShown ||
                    chatRoom.messagesBuff.joined === false
                    ) ? (
                        l[7006]
                    ) :
                    l[8000]
            );

            if (ChatdIntegration.mcfHasFinishedPromise.state() === 'pending') {
                if (!ChatdIntegration.mcfHasFinishedPromise._trackDataChangeAttached) {
                    ChatdIntegration.mcfHasFinishedPromise.always(function () {
                        megaChat.chats.trackDataChange();
                    });
                    ChatdIntegration.mcfHasFinishedPromise._trackDataChangeAttached = true;
                }
            }

            lastMessageDiv =
                <div>
                    <div className={lastMsgDivClasses}>
                        {__(emptyMessage)}
                    </div>
                </div>;


            timestamp = chatRoom.ctime;
            var msgDate = new Date(timestamp * 1000);
            var iso = (msgDate.toISOString());
            if (todayOrYesterday(iso)) {
                // if in last 2 days, use the time2lastSeparator
                curTimeMarker = time2lastSeparator(iso) + ", " + unixtimeToTimeString(timestamp);
            }
            else {
                // if not in the last 2 days, use 1st June [Year]
                curTimeMarker = acc_time2date(timestamp, false);
            }
            lastMessageDatetimeDiv = <div className="date-time">{l[19077].replace("%s1", curTimeMarker)}</div>;
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

            if (!mediaOptions.audio) {
                mutedMicrophone = <i className="small-icon grey-crossed-mic"></i>;
            }
            if (mediaOptions.video) {
                activeCamera = <i className="small-icon grey-videocam"></i>;
            }
            inCallDiv = <div className="call-duration">
                {mutedMicrophone}
                {activeCamera}
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

        var self = this;
        return (
            <li className={classString} id={id} data-room-id={roomId} data-jid={contactId}
                onClick={(e) => {
                    self.props.onConversationClicked(e);
                }}>
                <div className={nameClassString}>
                    <utils.EmojiFormattedContent>{chatRoom.getRoomTitle()}</utils.EmojiFormattedContent>
                    {
                        chatRoom.type === "private" ?
                            <span className={"user-card-presence " + presenceClass}></span>
                            :
                            undefined
                    }
                </div>
                {
                    (chatRoom.type === "group" || chatRoom.type === "private") ?
                        <i className="tiny-icon blue-key simpletip" data-simpletip={l[20935]}></i> : undefined
                }
                {archivedDiv}
                {notificationItems.length > 0 ? (
                    <div className={"unread-messages items-" + notificationItems.length}>{notificationItems}</div>
                    ) : null}
                {inCallDiv}
                {lastMessageDiv}
                {lastMessageDatetimeDiv}
            </li>
        );
    }
};

class ArchivedConversationsListItem extends MegaRenderMixin(React.Component) {
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
        var lastMessage = chatRoom.messagesBuff.getLatestTextMessage();
        if (lastMessage) {
            var lastMsgDivClasses = "conversation-message";
            var renderableSummary = lastMessage.renderableSummary || renderMessageSummary(lastMessage);
            lastMessage.renderableSummary = renderableSummary;

            lastMessageDiv = <div className={lastMsgDivClasses} dangerouslySetInnerHTML={{__html:renderableSummary}}>
                    </div>;

            var timestamp = lastMessage.delay;
            var curTimeMarker;
            var msgDate = new Date(timestamp * 1000);
            var iso = (msgDate.toISOString());
            if (todayOrYesterday(iso)) {
                // if in last 2 days, use the time2lastSeparator
                curTimeMarker = time2lastSeparator(iso) + ", " + unixtimeToTimeString(timestamp);
            }
            else {
                // if not in the last 2 days, use 1st June [Year]
                curTimeMarker = acc_time2date(timestamp, false);
            }

            lastMessageDatetimeDiv = <div className="date-time">{curTimeMarker}</div>;
        }
        else {
            var lastMsgDivClasses = "conversation-message";

            /**
             * Show "Loading" until:
             * 1. I'd fetched chats from the API.
             * 2. I'm retrieving history at the moment.
             * 3. I'd connected to chatd and joined the room.
              */

            var emptyMessage = (
                (
                    ChatdIntegration.mcfHasFinishedPromise.state() !== 'resolved' ||
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
                        {__(emptyMessage)}
                    </div>
                </div>;
        }
        if (chatRoom.type !== "public") {
            nameClassString += " privateChat";
        }

        return (
            <tr className={classString} id={id} data-room-id={roomId} data-jid={contactId}
                onClick={this.props.onConversationSelected.bind(this)}
                onDoubleClick={this.props.onConversationClicked.bind(this)}>
                <td className="">
                <div className="fm-chat-user-info todo-star">
                    <div className={nameClassString}>
                        <utils.EmojiFormattedContent>{chatRoom.getRoomTitle()}</utils.EmojiFormattedContent>
                        {(chatRoom.type === "group") ? <i className="tiny-icon blue-key"></i> : undefined}
                    </div>
                    {lastMessageDiv}
                    {lastMessageDatetimeDiv}
                </div>
                <div className="archived-badge">{__(l[19067])}</div>
                </td>
                <td width="330">
                    <div className="archived-on">
                        <div className="archived-date-time">{lastMessageDatetimeDiv}</div>
                        <div className="clear"></div>
                    </div>
                    <div className="button default-white-button semi-big unarchive-chat right"
                        onClick={this.props.onUnarchiveConversationClicked.bind(this)}
                        ><span>{__(l[19065])}</span></div>
                </td>
            </tr>
        );
    }
};

class ConversationsList extends MegaRenderMixin(React.Component) {
    static defaultProps = {
        'manualDataChangeTracking': true
    }
    attachRerenderCallbacks() {
        var self = this;
        self._megaChatsListener = megaChat.chats.addChangeListener(function() {
            self.throttledOnPropOrStateUpdated();
        })
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
        M.treeSearchUI();
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
            if (u_attr && u_attr.b && u_attr.b.s === -1) {
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
            <div className="conversationsList">
                <ul className="conversations-pane">
                    {currConvsList}
                </ul>
            </div>
        );
    }
};

class ArchivedConversationsList extends MegaRenderMixin(React.Component) {
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
            nameOrderClass = (self.state.nameorder === 1) ? "desc" : "asc";
        } else {
            orderKey = "lastActivity";
            orderValue = self.state.timeorder;
            timerOrderClass = (self.state.timeorder === 1) ? "desc" : "asc";
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
                <ArchivedConversationsListItem
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
                            title={__(l[19063])}
                            name="unarchive-conversation"
                            onClose={() => {
                                self.setState({'confirmUnarchiveDialogShown': false});
                            }}
                            onConfirmClicked={() => {
                                room.unarchive();
                                self.setState({'confirmUnarchiveDialogShown': false});
                            }}
                        >
                            <div className="fm-dialog-content">

                                <div className="dialog secondary-header">
                                    {__(l[19064])}
                                </div>
                            </div>
                        </ModalDialogsUI.ConfirmDialog>
            }
        }
        return (
        <div className="chat-content-block archived-chats">
            <div className="files-grid-view archived-chat-view">
                <table className="grid-table-header" width="100%" cellSpacing="0" cellPadding="0" border="0">
                    <tbody>
                        <tr>
                        <th className="calculated-width" onClick = {self.onSortNameClicked}>
                            <div className={"is-chat arrow name " + nameOrderClass} >{__(l[86])}</div>
                        </th>
                        <th width="330" onClick = {self.onSortTimeClicked}>
                            <div className={"is-chat arrow interaction " + timerOrderClass}>{__(l[5904])}</div>
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

class ConversationsApp extends MegaRenderMixin(React.Component) {
    constructor(props) {
        super(props);
        this.state = {
            'leftPaneWidth': mega.config.get('leftPaneWidth'),
            'startGroupChatDialogShown': false,
            'quickSearchText': ''
        };
    }
    startChatClicked(selected) {
        if (selected.length === 1) {
            megaChat.createAndShowPrivateRoomFor(selected[0])
                .then(function(room) {
                    room.setActive();
                });
        }
        else {
            this.props.megaChat.createAndShowGroupRoomFor(selected);
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
            if (e.megaChatHandled) {
                return;
            }

            if (megaChat.currentlyOpenedChat) {
                // don't do ANYTHING if the current focus is already into an input/textarea/select or a .fm-dialog
                // is visible/active at the moment
                if (
                    (megaChat.currentlyOpenedChat && megaChat.getCurrentRoom().isReadOnly()) ||
                    $(e.target).is(".messages-textarea, input, textarea") ||
                    ((e.ctrlKey || e.metaKey || e.which === 19) && (e.keyCode === 67)) ||
                    e.keyCode === 91 /* cmd+... */ ||
                    e.keyCode === 17 /* ctrl+... */ ||
                    e.keyCode === 27 /* esc */ ||
                    ($('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block')) ||
                    $(document.querySelector('.fm-dialog, .dropdown')).is(':visible') ||
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

            var megaChat = self.props.megaChat;
            if (megaChat.currentlyOpenedChat) {
                // don't do ANYTHING if the current focus is already into an input/textarea/select or a .fm-dialog
                // is visible/active at the moment
                if (
                    $target.is(".messages-textarea,a,input,textarea,select,button") ||
                    $target.closest('.messages.scroll-area').length > 0 ||
                    ($('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block')) ||
                    $(document.querySelector('.fm-dialog, .dropdown')).is(':visible') ||
                    document.querySelector('textarea:focus,select:focus,input:focus')
                ) {
                    return;
                }

                var $typeArea = $('.messages-textarea:visible:first');
                if ($typeArea.length === 1 && !$typeArea.is(":focus")) {
                    $typeArea.trigger("focus");
                    e.megaChatHandled = true;
                    moveCursortoToEnd($typeArea[0]);
                }

            }
        });


        self.fmConfigThrottling = null;
        self.fmConfigLeftPaneListener = mBroadcaster.addListener('fmconfig:leftPaneWidth', function() {
            megaChat.$leftPane = megaChat.$leftPane || $('.conversationsApp .fm-left-panel');
            clearTimeout(self.fmConfigThrottling);
            self.fmConfigThrottling = setTimeout(function fmConfigThrottlingLeftPaneResize() {
                self.setState({
                    'leftPaneWidth': mega.config.get('leftPaneWidth')
                });
                $('.jspVerticalBar:visible').addClass('hiden-when-dragging');
                $('.jScrollPaneContainer:visible').trigger('forceResize');
            }, 75);
            megaChat.$leftPane.width(mega.config.get('leftPaneWidth'));
            $('.fm-tree-panel', megaChat.$leftPane).width(mega.config.get('leftPaneWidth'));
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

        if (ChatdIntegration.allChatsHadLoaded.state() !== 'resolved') {
            ChatdIntegration.allChatsHadLoaded.done(function() {
                self.safeForceUpdate();
            });
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        window.removeEventListener('resize', this.handleWindowResize);
        $(document).off('keydown.megaChatTextAreaFocus');
        mBroadcaster.removeListener(this.fmConfigLeftPaneListener);
    }
    componentDidUpdate() {
        this.handleWindowResize();
        if (megaChat.displayArchivedChats === true) {
            this.initArchivedChatsScrolling();
        }
    }
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
            $('.fm-right-files-block, .fm-right-account-block')
                .filter(':visible')
                .css({
                    'margin-left': ($('.fm-left-panel').width() + $('.nw-fm-left-icons-panel').width()) + "px"
                });
        }
    }
    initArchivedChatsScrolling() {
        var scroll = '.archive-chat-list';
        deleteScrollPanel(scroll, 'jsp');
        $(scroll).jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});
        jScrollFade(scroll);
    }
    archiveChatsClicked() {
        loadSubPage('fm/chat/archived');
    }
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
    getTopButtonsForContactsPicker() {
        var self = this;
        if (!self._topButtonsContactsPicker) {
            self._topButtonsContactsPicker = [
                {
                    'key': 'add',
                    'title': l[71],
                    'icon': 'rounded-plus colorized',
                    'onClick': function(e) {
                        contactAddDialog();
                    }
                },
                {
                    'key': 'newGroupChat',
                    'title': l[19483],
                    'icon': 'conversation-with-plus',
                    'onClick': function(e) {
                        self.startGroupChatFlow = 1;
                        self.setState({'startGroupChatDialogShown': true});
                    }
                },
                {
                    'key': 'newChatLink',
                    'title': l[20638],
                    'icon': 'small-icon blue-chain colorized',
                    'onClick': function(e) {
                        self.startGroupChatFlow = 2;
                        self.setState({'startGroupChatDialogShown': true});
                    }
                },

            ]
        }
        return self._topButtonsContactsPicker;
    }
    isWaitingForInitialLoadingToFinish() {
        var self = this;
        // since in big accounts, a lot chats may finish at the same moment, this requires to be throttled.
        var forceUpdate = SoonFc(function(roomId) {
            delete self._isWaitingChatsLoad[roomId];
            self.safeForceUpdate();
        }, 300);

        self._isWaitingChatsLoad = self._isWaitingChatsLoad || {};
        var roomIds = megaChat.chats.keys();
        for (var i = 0; i < roomIds.length; i++) {
            var roomId = roomIds[i];
            var chatRoom = megaChat.chats[roomId];
            if (!self._isWaitingChatsLoad[roomId] && chatRoom.initialMessageHistLoaded.state() === 'pending') {
                self._isWaitingChatsLoad[roomId] = true;
                chatRoom.initialMessageHistLoaded.always(forceUpdate.bind(undefined, roomId));
            }
        }
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
                            __html: __(l[8762])
                                .replace("[S]", "<span className='red'>")
                                .replace("[/S]", "</span>")
                        }}></div>
                        <div className="fm-not-logged-button create-account">
                            {__(l[968])}
                        </div>
                    </div>
                </div>
            </div>;
        }
        else if (
            megaChat.allChatsHadInitialLoadedHistory() === false &&
            !megaChat.currentlyOpenedChat &&
            megaChat.displayArchivedChats !== true
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
            self.isWaitingForInitialLoadingToFinish();
            isLoading = true;
        }

        var rightPaneStyles = {};
        if (anonymouschat) {
            rightPaneStyles = {'marginLeft': 0};
        }

        var rightPane = <div className="fm-right-files-block in-chat" style={rightPaneStyles}>
                {loadingOrEmpty}
                {
                    !isLoading && megaChat.displayArchivedChats === true ?
                        <ArchivedConversationsList key={"archivedchats"}/>
                        :
                        null
                }
            {!isLoading ? <ConversationPanels
                    {...this.props}
                    chatUIFlags={megaChat.chatUIFlags}
                    displayArchivedChats={megaChat.displayArchivedChats}
                    className={megaChat.displayArchivedChats === true ? "hidden" : ""}
                    currentlyOpenedChat={megaChat.currentlyOpenedChat}
                    chats={megaChat.chats}
                    /> : null}
            </div>;

        var archivedChatsCount = this.calcArchiveChats();
        var arcBtnClass = megaChat.displayArchivedChats === true ?
                            "left-pane-button archived active" : "left-pane-button archived";
        var arcIconClass = megaChat.displayArchivedChats === true ?
            "small-icon archive white" : "small-icon archive colorized";
        return (
            <div className="conversationsApp" key="conversationsApp">
                {startGroupChatDialog}
                <div className="fm-left-panel chat-left-panel" style={leftPanelStyles}>
                    <div className="left-pane-drag-handle"></div>

                    <div className="fm-left-menu conversations">
                        <div className={"nw-fm-tree-header conversations" + (self.state.quickSearchText ?
                            ' filled-input' : '')}>
                            <input type="text" className={"chat-quick-search"}
                                   onChange={function(e) {
                                       if (e.target.value) {
                                           treesearch = e.target.value;
                                       }
                                        self.setState({'quickSearchText': e.target.value});
                                   }}
                                   onBlur={function(e) {
                                        if (e.target.value) {
                                            treesearch = e.target.value;
                                        }
                                   }}
                                   autoComplete='disabled'
                                   value={self.state.quickSearchText}
                                   placeholder={l[7997]} />
                            <div className="small-icon thin-search-icon"></div>

                            <Button
                                group="conversationsListing"
                                icon="chat-with-plus"
                                >
                                <DropdownContactsSelector
                                    className="main-start-chat-dropdown"
                                    onSelectDone={this.startChatClicked.bind(this)}
                                    multiple={false}
                                    showTopButtons={self.getTopButtonsForContactsPicker()}
                                    />
                            </Button>
                        </div>
                    </div>
                    <div className="fm-tree-panel manual-tree-panel-scroll-management" style={leftPanelStyles}>
                        <PerfectScrollbar style={leftPanelStyles} className="conversation-reduce-height"
                                          ref={function(ref) {
                            megaChat.$chatTreePanePs = ref;
                        }}>
                            <div className={
                                "content-panel conversations" + (

                                    getSitePath().indexOf("/chat") !== -1 ? " active" : ""
                                )
                            }>
                                <ConversationsList
                                                   quickSearchText={this.state.quickSearchText} />
                            </div>
                        </PerfectScrollbar>
                        <div className="left-pane-button new-link" onClick={function(e) {
                            self.startGroupChatFlow = 2;
                            self.setState({'startGroupChatDialogShown': true});
                            return false;
                        }.bind(this)}>
                            <i className="small-icon blue-chain colorized"></i>
                            <div className="heading">
                                {__(l[20638])}
                            </div>
                        </div>
                        <div className={arcBtnClass}  onClick={this.archiveChatsClicked.bind(this)}>
                            <i className={arcIconClass}></i>
                            <div className="heading">
                                {__(l[19066])}
                            </div>
                            <div className="indicator">
                                {archivedChatsCount}
                            </div>
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
