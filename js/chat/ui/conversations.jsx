// libs
var React = require("react");
var ReactDOM = require("react-dom");
var utils = require('./../../ui/utils.jsx');
var getMessageString = require('./messages/utils.jsx').getMessageString;
var PerfectScrollbar = require('./../../ui/perfectScrollbar.jsx').PerfectScrollbar;
var RenderDebugger = require('./../../stores/mixins.js').RenderDebugger;
var MegaRenderMixin = require('./../../stores/mixins.js').MegaRenderMixin;
var ButtonsUI = require('./../../ui/buttons.jsx');
var DropdownsUI = require('./../../ui/dropdowns.jsx');
var ContactsUI = require('./../ui/contacts.jsx');
var ConversationPanelUI = require("./../ui/conversationpanel.jsx");
var ModalDialogsUI = require('./../../ui/modalDialogs.jsx');

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

    var author = Message.getContactForMessage(lastMessage);
    if (author) {
        if (!lastMessage._contactChangeListener && author.addChangeListener) {
            lastMessage._contactChangeListener = author.addChangeListener(function() {
                delete lastMessage.renderableSummary;
            });
        }

        if (lastMessage.chatRoom.type === "private") {
            if (author && author.u === u_handle) {
                renderableSummary = l[19285] + " " + renderableSummary;
            }
        }
        else if (lastMessage.chatRoom.type === "group") {
            if (author) {
                if (author.u === u_handle) {
                    renderableSummary = l[19285] + " " + renderableSummary;
                }
                else {
                    var name = M.getNameByHandle(author.u);
                    if (String(name).length > 10) {
                        if (author.firstName) {
                            name = author.firstName;
                            if (author.lastName && String(author.lastName).length > 0) {
                                var letter = String(author.lastName)[0];
                                if (letter && letter.toUpperCase()) {
                                    name += " " + letter.toUpperCase();
                                }
                            }
                        }
                    }
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

var ConversationsListItem = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    specificShouldComponentUpdate: function() {
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
    },
    componentWillMount: function() {
        var self = this;
        self.chatRoomChangeListener = function() {
            self.debouncedForceUpdate(750);
        };
        self.props.chatRoom.addChangeListener(self.chatRoomChangeListener);
    },
    componentWillUnmount: function() {
        var self = this;
        self.props.chatRoom.removeChangeListener(self.chatRoomChangeListener);
    },
    render: function() {
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
        var unreadDiv = null;
        var isUnread = false;
        if (unreadCount > 0) {
            unreadDiv = <div className="unread-messages">{unreadCount > 9 ? "9+" : unreadCount}</div>;
            isUnread = true;
        }

        var inCallDiv = null;

        var lastMessageDiv = null;
        var lastMessageDatetimeDiv = null;
        var lastMessage = chatRoom.messagesBuff.getLatestTextMessage();
        var lastMsgDivClasses;
        if (lastMessage) {
            lastMsgDivClasses = "conversation-message" + (isUnread ? " unread" : "");
            // safe some CPU cycles...
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
                curTimeMarker = acc_time2date(timestamp, true);
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
        }

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


        return (
            <li className={classString} id={id} data-room-id={roomId} data-jid={contactId}
                onClick={this.props.onConversationClicked}>
                <div className={nameClassString}>
                    <utils.EmojiFormattedContent>{chatRoom.getRoomTitle()}</utils.EmojiFormattedContent>
                    {
                        chatRoom.type === "private" ?
                            <span className={"user-card-presence " + presenceClass}></span>
                            :
                            undefined
                    }
                </div>
                {archivedDiv}
                {unreadDiv}
                {inCallDiv}
                {lastMessageDiv}
                {lastMessageDatetimeDiv}
            </li>
        );
    }
});

var ArchivedConversationsListItem = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    render: function() {
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
                curTimeMarker = acc_time2date(timestamp, true);
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

        return (
            <tr className={classString} id={id} data-room-id={roomId} data-jid={contactId}
                onClick={this.props.onConversationSelected} onDoubleClick={this.props.onConversationClicked}>
                <td className="">
                <div className="fm-chat-user-info todo-star">
                    <div className="user-card-name conversation-name">
                        <utils.EmojiFormattedContent>{chatRoom.getRoomTitle()}</utils.EmojiFormattedContent>
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
                        onClick={this.props.onUnarchiveConversationClicked}><span>{__(l[19065])}</span></div>
                </td>
            </tr>
        );
    }
});

var ConversationsList = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    conversationClicked: function(room, e) {
        loadSubPage(room.getRoomUrl());
        e.stopPropagation();
    },
    currentCallClicked: function(e) {
        var activeCallSession = this.props.megaChat.activeCallSession;
        if (activeCallSession) {
            this.conversationClicked(activeCallSession.room, e);
        }
    },
    contactClicked: function(contact, e) {
        loadSubPage("fm/chat/" + contact.u);
        e.stopPropagation();
    },
    endCurrentCall: function(e) {
        var activeCallSession = this.props.megaChat.activeCallSession;
        if (activeCallSession) {
            activeCallSession.endCall('hangup');
            this.conversationClicked(activeCallSession.room, e);
        }
    },
    render: function() {
        var self = this;

        var currentCallingContactStatusProps = {
            'className': "nw-conversations-item current-calling",
            'data-jid': ''
        };

        var megaChat = this.props.megaChat;

        var activeCallSession = megaChat.activeCallSession;
        if (activeCallSession && activeCallSession.room && megaChat.activeCallSession.isActive()) {
            var room = activeCallSession.room;
            var user = room.getParticipantsExceptMe()[0];
            user = megaChat.getContactFromJid(user);

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

        var sortedConversations = obj_values(this.props.chats.toJS());

        sortedConversations.sort(M.sortObjFn("lastActivity", -1));
        sortedConversations.forEach((chatRoom) => {
            var contact;
            if (!chatRoom || !chatRoom.roomId) {
                return;
            }
            if (!chatRoom.isDisplayable()) {
                return;
            }
            if (chatRoom.type === "private") {
                contact = chatRoom.getParticipantsExceptMe()[0];
                if (!contact) {
                    return;
                }
                contact = M.u[contact];

                if (contact) {
                    if (!chatRoom.privateReadOnlyChat && contact.c === 0) {
                        // a non-contact conversation, e.g. contact removed - mark as read only
                        Soon(function () {
                            chatRoom.privateReadOnlyChat = true;
                        });
                    }
                    else if (chatRoom.privateReadOnlyChat && contact.c !== 0) {
                        // a non-contact conversation, e.g. contact removed - mark as read only
                        Soon(function () {
                            chatRoom.privateReadOnlyChat = false;
                        });
                    }
                }
            }

            currConvsList.push(
                <ConversationsListItem
                    key={chatRoom.roomId}
                    chatRoom={chatRoom}
                    contact={contact}
                    messages={chatRoom.messagesBuff}
                    megaChat={megaChat}
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
});

var ArchivedConversationsList = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    getInitialState: function() {
        return {
            'items':this.props.chats,
            'orderby':'lastActivity',
            'nameorder':1,
            'timeorder':-1,
            'confirmUnarchiveChat':null,
            'confirmUnarchiveDialogShown': false,
        };
    },
    conversationClicked: function(room, e) {
        room.showArchived = true;
        loadSubPage(room.getRoomUrl());
        e.stopPropagation();
    },
    conversationSelected: function(room, e) {
        var self = this;
        var previousState = room.archivedSelected ? room.archivedSelected : false;
        var sortedConversations = obj_values(this.props.chats.toJS());
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
    },
    unarchiveConversationClicked: function(room, e) {
        var self = this;
        self.setState({
            'confirmUnarchiveDialogShown': true,
            'confirmUnarchiveChat': room.roomId
        });
    },
    onSortNameClicked: function(e) {
        this.setState({
            'orderby': 'name'
        });
        this.setState({
            'nameorder': this.state.nameorder*-1
        });
    },
    onSortTimeClicked: function(e) {
        this.setState({
            'orderby': 'lastActivity'
        });
        this.setState({
            'timeorder': this.state.timeorder*-1
        });
    },
    render: function() {
        var self = this;

        var currentCallingContactStatusProps = {
            'className': "nw-conversations-item current-calling",
            'data-jid': ''
        };

        var megaChat = this.props.megaChat;

        var currConvsList = [];

        var sortedConversations = obj_values(this.props.chats.toJS());
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
                    if (!chatRoom.privateReadOnlyChat && contact.c === 0) {
                        // a non-contact conversation, e.g. contact removed - mark as read only
                        Soon(function () {
                            chatRoom.privateReadOnlyChat = true;
                        });
                    }
                    else if (chatRoom.privateReadOnlyChat && contact.c !== 0) {
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
                    megaChat={megaChat}
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
            var room = this.props.chats[self.state.confirmUnarchiveChat];
            if (room) {
            confirmUnarchiveDialog = <ModalDialogsUI.ConfirmDialog
                            megaChat={room.megaChat}
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
                            <div className={"arrow name " + nameOrderClass} >{__(l[86])}</div>
                        </th>
                        <th width="330" onClick = {self.onSortTimeClicked}>
                            <div className={"arrow interaction " + timerOrderClass}>{__(l[5904])}</div>
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
});

var ConversationsApp = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    getInitialState: function() {
        return {
            'leftPaneWidth': mega.config.get('leftPaneWidth')
        };
    },
    startChatClicked: function(selected) {
        if (selected.length === 1) {
            megaChat.createAndShowPrivateRoomFor(selected[0])
                .then(function(room) {
                    room.setActive();
                });
        }
        else {
            this.props.megaChat.createAndShowGroupRoomFor(selected);
        }
    },
    componentDidMount: function() {
        var self = this;

        window.addEventListener('resize', this.handleWindowResize);
        $(document).rebind('keydown.megaChatTextAreaFocus', function(e) {
            // prevent recursion!
            if (e.megaChatHandled) {
                return;
            }

            var megaChat = self.props.megaChat;
            if (megaChat.currentlyOpenedChat) {
                // don't do ANYTHING if the current focus is already into an input/textarea/select or a .fm-dialog
                // is visible/active at the moment
                if (
                    (megaChat.currentlyOpenedChat && megaChat.getCurrentRoom().isReadOnly()) ||
                    $(e.target).is(".messages-textarea") ||
                    ((e.ctrlKey || e.metaKey || e.which === 19) && (e.keyCode === 67)) ||
                    e.keyCode === 91 /* cmd+... */ ||
                    e.keyCode === 17 /* ctrl+... */ ||
                    e.keyCode === 27 /* esc */ ||
                    ($('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block')) ||
                    $('.fm-dialog:visible,.dropdown:visible').length > 0 ||
                    $('input:focus,textarea:focus,select:focus').length > 0
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
            if (e.megaChatHandled || slideshowid) {
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
                    $('.fm-dialog:visible,.dropdown:visible').length > 0 ||
                    $('input:focus,textarea:focus,select:focus').length > 0
                ) {
                    return;
                }

                var $typeArea = $('.messages-textarea:visible:first');
                if ($typeArea.size() === 1 && !$typeArea.is(":focus")) {
                    $typeArea.focus();
                    e.megaChatHandled = true;
                    moveCursortoToEnd($typeArea[0]);
                }

            }
        });


        self.fmConfigThrottling = null;
        self.fmConfigLeftPaneListener = mBroadcaster.addListener('fmconfig:leftPaneWidth', function() {
            var lPane = $('.conversationsApp .fm-left-panel');
            clearTimeout(self.fmConfigThrottling);
            self.fmConfigThrottling = setTimeout(function fmConfigThrottlingLeftPaneResize() {
                self.setState({
                    'leftPaneWidth': mega.config.get('leftPaneWidth')
                });
                $('.jspVerticalBar:visible').addClass('hiden-when-dragging');
                $('.jScrollPaneContainer:visible').trigger('forceResize');
            }, 75);
            lPane.width(mega.config.get('leftPaneWidth'));
            $('.fm-tree-panel', lPane).width(mega.config.get('leftPaneWidth'));
        });


        var lPaneResizableInit = function() {
            var lPane = $('.conversationsApp .fm-left-panel');
            $.leftPaneResizableChat = new FMResizablePane(lPane, $.leftPaneResizable.options);

            if (fmconfig.leftPaneWidth) {
                lPane.width(Math.min(
                    $.leftPaneResizableChat.options.maxWidth,
                    Math.max($.leftPaneResizableChat.options.minWidth, fmconfig.leftPaneWidth)
                ));
            }

            $($.leftPaneResizableChat).on('resize', function() {
                var w = lPane.width();
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
                    lPane.width()
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

        this.handleWindowResize();

    },
    componentWillUnmount: function() {
        window.removeEventListener('resize', this.handleWindowResize);
        $(document).unbind('keydown.megaChatTextAreaFocus');
        mBroadcaster.removeListener(this.fmConfigLeftPaneListener);
    },
    componentDidUpdate: function() {
        this.handleWindowResize();
        this.initArchivedChatsScrolling();
    },
    handleWindowResize: function() {
        // small piece of what is done in fm_resize_handler...
        $('.fm-right-files-block, .fm-right-account-block')
            .filter(':visible')
            .css({
                'margin-left': ($('.fm-left-panel').width() + $('.nw-fm-left-icons-panel').width()) + "px"
            });
    },
    initArchivedChatsScrolling: function () {
        var scroll = '.archive-chat-list';
        deleteScrollPanel(scroll, 'jsp');
        $(scroll).jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});
        jScrollFade(scroll);
    },
    archiveChatsClicked : function() {
        loadSubPage('fm/chat/archived');
    },
    calcArchiveChats : function() {
        var conversations = obj_values(this.props.megaChat.chats.toJS());
        var count = 0;
        conversations.forEach((chatRoom) => {
            if (!chatRoom || !chatRoom.roomId) {
                return;
            }
            if (chatRoom.isArchived()) {
                count++;
            }
        });
        return count;
    },
    render: function() {
        var self = this;

        var presence = self.props.megaChat.getMyPresence();


        var leftPanelStyles = {};

        if (self.state.leftPaneWidth) {
            leftPanelStyles.width = self.state.leftPaneWidth;
        }

        var loadingOrEmpty = null;
        var megaChat = this.props.megaChat;

        if (megaChat.chats.length === 0) {
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
            megaChat.allChatsHadLoadedHistory() === false &&
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
        }

        var rightPane = null;

        rightPane = <div className="fm-right-files-block">
                {loadingOrEmpty}

                {
                    megaChat.displayArchivedChats === true ?
                        <ArchivedConversationsList chats={this.props.megaChat.chats} megaChat={this.props.megaChat}
                                                   contacts={this.props.contacts} key={"archivedchats"}/>
                        :
                        null
                }
                <ConversationPanelUI.ConversationPanels
                    {...this.props}
                    className={megaChat.displayArchivedChats === true ? "hidden" : ""}
                    conversations={this.props.megaChat.chats}
                    />
            </div>;
        var archivedChatsCount = this.calcArchiveChats();
        var arcBtnClass = megaChat.displayArchivedChats === true ?
                            "arc-conversation-btn-block active" : "arc-conversation-btn-block";
        var arcIconClass = megaChat.displayArchivedChats === true ? "small-icon archive white" : "small-icon archive";
        return (
            <div className="conversationsApp" key="conversationsApp">
                <div className="fm-left-panel chat-left-panel" style={leftPanelStyles}>
                    <div className="left-pane-drag-handle"></div>

                    <div className="fm-left-menu conversations">
                        <div className="nw-fm-tree-header conversations">
                            <span>{__(l[7997])}</span>

                            <ButtonsUI.Button
                                group="conversationsListing"
                                icon="white-medium-plus"
                                contacts={this.props.contacts}
                                >
                                <DropdownsUI.DropdownContactsSelector
                                    contacts={this.props.contacts}
                                    megaChat={this.props.megaChat}
                                    onSelectDone={this.startChatClicked}
                                    multiple={true}
                                    />
                            </ButtonsUI.Button>
                        </div>
                    </div>
                    <div className="fm-tree-panel manual-tree-panel-scroll-management" style={leftPanelStyles}>
                        <PerfectScrollbar style={leftPanelStyles} className="conversation-reduce-height" >
                            <div className={
                                "content-panel conversations" + (

									getSitePath().indexOf("/chat") !== -1 ? " active" : ""
                                )
                            }>
                                <ConversationsList chats={this.props.megaChat.chats} megaChat={this.props.megaChat}
                                                   contacts={this.props.contacts}/>
                            </div>
                        </PerfectScrollbar>
                        <div className={arcBtnClass}  onClick={this.archiveChatsClicked}>
                            <div className="arc-conversation-icon">
                                <i className={arcIconClass}></i>
                            </div>
                            <div className="arc-conversation-heading">
                                {__(l[19066])}
                            </div>
                            <div className="arc-conversation-number">
                                    {archivedChatsCount}
                            </div>
                        </div>
                    </div>
                </div>
                {rightPane}
            </div>
        );
    }
});


module.exports = {
    ConversationsList,
    ArchivedConversationsList,
    ConversationsApp
};
