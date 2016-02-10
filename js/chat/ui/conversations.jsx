// libs
var React = require("react");
var ReactDOM = require("react-dom");
var utils = require('./../../ui/utils.jsx');
var RenderDebugger = require('./../../stores/mixins.js').RenderDebugger;
var MegaRenderMixin = require('./../../stores/mixins.js').MegaRenderMixin;
var ButtonsUI = require('./../../ui/buttons.jsx');
var DropdownsUI = require('./../../ui/dropdowns.jsx');
var ContactsUI = require('./../ui/contacts.jsx');
var ConversationPanelUI = require("./../ui/conversationpanel.jsx");


var ConversationsListItem = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    componentWillMount: function() {
        var self = this;
        self.chatRoomChangeListener = function() {
            self.forceUpdate();
        };
        self.props.chatRoom.addChangeListener(self.chatRoomChangeListener);
    },
    componentWillUnmount: function() {
        var self = this;
        self.props.chatRoom.removeChangeListener(self.chatRoomChangeListener);
    },
    render: function() {
        //console.error(
        //    'rendering: ',
        //    this.props.chatRoom.roomJid.split("@")[0],
        //    this.props.chatRoom.unreadCount,
        //    this.props.chatRoom.isCurrentlyActive
        //);

        var classString = "";

        var megaChat = this.props.chatRoom.megaChat;
        var chatRoom = this.props.chatRoom;
        var contactJid = chatRoom.getParticipantsExceptMe()[0];
        var contact = chatRoom.megaChat.getContactFromJid(contactJid);


        if (!contact) {
            return null;
        }
        var id = 'conversation_' + htmlentities(contact.u);
        var roomShortJid = chatRoom.roomJid.split("@")[0];

        var caps = megaChat.karere.getCapabilities(contactJid);
        if (caps) {
            Object.keys(caps).forEach(function (k) {
                var v = caps[k];
                if (v) {
                    classString += " chat-capability-" + k;
                }
            });
        }

        // selected
        if (chatRoom.isCurrentlyActive) {
            classString += " active";
        }

        var presenceClass = chatRoom.megaChat.xmppPresenceToCssClass(
            contact.presence
        );

        var unreadCount = chatRoom.messagesBuff.getUnreadCount();
        var unreadDiv = null;
        var isUnread = false;
        if (unreadCount > 0) {
            unreadDiv = <div className="unread-messages">{unreadCount}</div>;
            isUnread = true;
        }

        var inCallDiv = null;

        var lastMessageDiv = null;
        var lastMessageDatetimeDiv = null;
        var lastMessage = chatRoom.messagesBuff.getLatestTextMessage();
        if (lastMessage) {
            var lastMsgDivClasses = "conversation-message" + (isUnread ? " unread" : "");

            var renderableSummary = lastMessage.textContents;

            if (lastMessage.isManagement && lastMessage.isManagement()) {
                renderableSummary = lastMessage.getManagementMessageSummaryText();
            }

            lastMessageDiv = <div className={lastMsgDivClasses}>
                        {renderableSummary}
                    </div>;
            lastMessageDatetimeDiv = <div className="date-time">{unixtimeToTimeString(lastMessage.delay)}</div>;
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
                    megaChat.plugins.chatdIntegration.mcfHasFinishedPromise.state() !== 'resolved' ||
                    chatRoom.messagesBuff.messagesHistoryIsLoading() ||
                    chatRoom.messagesBuff.joined === false
                ) ? l[7006] : l[8000]
            );


            lastMessageDiv =
                <div>
                    <div className={lastMsgDivClasses}>
                        {__(emptyMessage)}
                    </div>
                </div>;
        }

        if (chatRoom.callSession && chatRoom.callSession.isActive() === true) {
            var mediaOptions = chatRoom.callSession.getMediaOptions();

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
                <span className="call-counter" data-room-jid={chatRoom.roomJid.split("@")[0]}>{secondsToTimeShort(chatRoom._currentCallCounter)}</span>
            </div>;

            classString += " call-active";
        }

        var avatarMeta = generateAvatarMeta(contact.u);

        return (
            <li className={classString} id={id} data-room-jid={roomShortJid} data-jid={contactJid} onClick={this.props.onConversationClicked}>
                <div className="user-card-name conversation-name">
                    {avatarMeta.fullName}
                    <span className={"user-card-presence " + presenceClass}></span>
                </div>
                {unreadDiv}
                {inCallDiv}
                {lastMessageDiv}
                {lastMessageDatetimeDiv}
            </li>
        );
    }
});

var ConversationsList = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    conversationClicked: function(room, e) {
        var contact = room.megaChat.getContactFromJid(
            room.getParticipantsExceptMe()[0]
        );

        window.location = "#fm/chat/" + contact.u;
        e.stopPropagation();
    },
    currentCallClicked: function(e) {
        var activeCallSession = this.props.megaChat.activeCallSession;
        if (activeCallSession) {
            this.conversationClicked(activeCallSession.room, e);
        }
    },
    contactClicked: function(contact, e) {
        window.location = "#fm/chat/" + contact.u;
        e.stopPropagation();
    },
    endCurrentCall: function(e) {
        var activeCallSession = this.props.megaChat.activeCallSession;
        if (activeCallSession) {
            activeCallSession.endCall('hangup');
            this.conversationClicked(activeCallSession.room, e);
        }
    },
    handleWindowResize: function() {
        var contentPanelConversations = document.querySelector('.content-panel.conversations');
        if (
            !contentPanelConversations ||
            !contentPanelConversations.parentNode ||
            !contentPanelConversations.parentNode.parentNode ||
            !contentPanelConversations.parentNode.parentNode.parentNode
        ) {
            // UI element is being destroyed, e.g. on log out.
            return;
        }
        var $container = $(contentPanelConversations.parentNode.parentNode.parentNode);
        var $jsp = $container.data('jsp');

        $container.height(
            $(window).outerHeight() -  $('#topmenu').outerHeight() - $('.fm-left-menu.conversations').outerHeight()
        );


        if ($jsp) {
            $jsp.reinitialise();
        }
    },
    componentDidMount: function() {
        window.addEventListener('resize', this.handleWindowResize);
        this.handleWindowResize();
    },
    componentWillUnmount: function() {
        window.removeEventListener('resize', this.handleWindowResize);
    },
    componentDidUpdate: function() {
        this.handleWindowResize();
    },
    render: function() {
        var self = this;

        var currentCallingContactStatusProps = {
            'className': "nw-conversations-item current-calling",
            'data-jid': ''
        };
        var callName;

        var megaChat = this.props.megaChat;

        var activeCallSession = megaChat.activeCallSession;
        if (activeCallSession && activeCallSession.room && megaChat.activeCallSession.isActive()) {
            var room = activeCallSession.room;
            var user = room.getParticipantsExceptMe()[0];
            user = megaChat.getContactFromJid(user);

            if (user) {
                currentCallingContactStatusProps.className += " " + user.u + " " + megaChat.xmppPresenceToCssClass(user.presence);
                currentCallingContactStatusProps['data-jid'] = room.roomJid;
                callName = room.getRoomTitle();

                if (room.roomJid == megaChat.currentlyOpenedChat) {
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

        sortedConversations.sort(mega.utils.sortObjFn("lastActivity", -1));

        sortedConversations.forEach((chatRoom) => {
            if (chatRoom._leaving || chatRoom.stateIsLeftOrLeaving()) {
                return;
            }

            var contact = chatRoom.getParticipantsExceptMe()[0];
            if (!contact) {
                return;
            }
            contact = chatRoom.megaChat.getContactFromJid(contact);

            if (contact && contact.c === 0) {
                // skip & leave, a non-contact conversation, e.g. contact removed.
                Soon(function() {
                    chatRoom.destroy();
                });
                return;
            }

            currConvsList.push(
                <ConversationsListItem
                    key={chatRoom.roomJid.split("@")[0]}
                    chatRoom={chatRoom}
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


var ConversationsApp = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    startChatClicked: function(contact, e) {
        e.preventDefault();
        window.location = "#fm/chat/" + contact.u;
        var room = this.props.megaChat.createAndShowPrivateRoomFor(contact.u);
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

                var $typeArea = $('.messages-textarea:visible');
                moveCursortoToEnd($typeArea);
                e.megaChatHandled = true;
                $typeArea.triggerHandler(e);
                e.preventDefault();
                e.stopPropagation();
                return false;

            }
        });

        $(document).rebind('click.megaChatTextAreaFocus', function(e) {
            // prevent recursion!
            if (e.megaChatHandled) {
                return;
            }

            var $target = $(e.target);

            var megaChat = self.props.megaChat;
            if (megaChat.currentlyOpenedChat) {
                // don't do ANYTHING if the current focus is already into an input/textarea/select or a .fm-dialog
                // is visible/active at the moment
                if (
                    $target.is(".messages-textarea,a,input,textarea,select,button") ||
                    $target.parents('.messages.scroll-area').length > 0 ||
                    ($('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block')) ||
                    $('.fm-dialog:visible,.dropdown:visible').length > 0 ||
                    $('input:focus,textarea:focus,select:focus').length > 0
                ) {
                    return;
                }

                var $typeArea = $('.messages-textarea:visible');
                $typeArea.focus();
                e.megaChatHandled = true;
                moveCursortoToEnd($typeArea);
                return false;

            }
        }); 
        this.handleWindowResize();

    },
    componentWillUnmount: function() {
        window.removeEventListener('resize', this.handleWindowResize);
        $(document).unbind('keydown.megaChatTextAreaFocus');
    },
    componentDidUpdate: function() {
        this.handleWindowResize();
    },
    handleWindowResize: function() {
        var $container = $(ReactDOM.findDOMNode(this));

        $container.height(
            $(window).outerHeight() -  $('#topmenu').outerHeight()
        );
    },
    render: function() {
        var self = this;

        //console.error("ConversationsApp render");

        var presence = self.props.megaChat.karere.getMyPresence();

        var startChatIsDisabled = !presence || presence === "offline";


        return (
            <div className="conversationsApp" key="conversationsApp">
                <div className="fm-left-panel">
                    <div className="left-pane-drag-handle"></div>

                    <div className="fm-left-menu conversations">
                        <div className="nw-fm-tree-header conversations">
                            <span>{__(l[7997])}</span>

                            <ButtonsUI.Button
                                group="conversationsListing"
                                icon="white-medium-plus"
                                disabled={startChatIsDisabled}
                                contacts={this.props.contacts}
                                >
                                <DropdownsUI.DropdownContactsSelector
                                    contacts={this.props.contacts}
                                    megaChat={this.props.megaChat}
                                    onClick={this.startChatClicked}
                                    />
                            </ButtonsUI.Button>
                        </div>
                    </div>


                    <div className="fm-tree-panel">
                        <div className="content-panel conversations">
                            <ConversationsList chats={this.props.megaChat.chats} megaChat={this.props.megaChat} contacts={this.props.contacts} />
                        </div>
                    </div>
                </div>
                <div className="fm-right-files-block">
                    <div className="fm-empty-messages hidden">
                    <div className="fm-empty-pad">
                        <div className="fm-empty-messages-bg"></div>
                        <div className="fm-empty-cloud-txt">{__(l[6870])}</div>
                        <div className="fm-not-logged-text">
                            <div className="fm-not-logged-description">
                                Login or create an account to <span className="red">get 50GB FREE</span> and get messages from your friends and coworkers.
                            </div>
                            <div className="fm-not-logged-button login">
                                {__(l[193])}
                            </div>
                            <div className="fm-not-logged-button create-account">
                                {__(l[968])}
                            </div>
                        </div>
                    </div>
                    </div>


                    <ConversationPanelUI.ConversationPanels
                        {...this.props}
                        conversations={this.props.megaChat.chats}
                        />
                        
                </div>
            </div>
        );
    }
});


module.exports = {
    ConversationsList,
    ConversationsApp
};
