// libs
var React = require("react");
var ReactDOM = require("react-dom");
var utils = require('./../../ui/utils.jsx');
var PerfectScrollbar = require('./../../ui/perfectScrollbar.jsx').PerfectScrollbar;
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
        var classString = "";

        var megaChat = this.props.chatRoom.megaChat;
        var chatRoom = this.props.chatRoom;
        if (!chatRoom || !chatRoom.roomJid) {
            return null;
        }

        var roomShortJid = chatRoom.roomJid.split("@")[0];

        // selected
        if (chatRoom.isCurrentlyActive) {
            classString += " active";
        }


        var contactJid;
        var presenceClass;
        var id;

        if (chatRoom.type === "private") {
            contactJid = chatRoom.getParticipantsExceptMe()[0];
            var contact = chatRoom.megaChat.getContactFromJid(contactJid);


            if (!contact) {
                return null;
            }
            id = 'conversation_' + htmlentities(contact.u);


            var caps = megaChat.karere.getCapabilities(contactJid);
            if (caps) {
                Object.keys(caps).forEach(function (k) {
                    var v = caps[k];
                    if (v) {
                        classString += " chat-capability-" + k;
                    }
                });
            }


            presenceClass = chatRoom.megaChat.xmppPresenceToCssClass(
                contact.presence
            );
        }
        else if (chatRoom.type === "group") {
            contactJid = roomShortJid;
            id = 'conversation_' + contactJid;
            presenceClass = 'group';
            classString += ' groupchat';
        }
        else {
            return "unknown room type: " + chatRoom.roomJid.split("@")[0];
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
        if (lastMessage) {
            var lastMsgDivClasses = "conversation-message" + (isUnread ? " unread" : "");

            var renderableSummary = lastMessage.textContents;

            if (lastMessage.isManagement && lastMessage.isManagement()) {
                renderableSummary = lastMessage.getManagementMessageSummaryText();
            }

            lastMessageDiv = <div className={lastMsgDivClasses}>
                        {renderableSummary}
                    </div>;

            var timestamp = lastMessage.delay;
            var curTimeMarker;
            var msgDate = new Date(timestamp * 1000);
            var iso = (msgDate.toISOString());
            if (todayOrYesterday(iso)) {
                // if in last 2 days, use the time2lastSeparator
                curTimeMarker = time2lastSeparator(iso) + ", " + msgDate.getHours() + ":" + msgDate.getMinutes();
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
                    chatRoom.messagesBuff.joined === false
                    ) ? (
                        localStorage.megaChatPresence !== 'unavailable' ? l[7006] : ""
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


        return (
            <li className={classString} id={id} data-room-jid={roomShortJid} data-jid={contactJid} onClick={this.props.onConversationClicked}>
                <div className="user-card-name conversation-name">
                    {chatRoom.getRoomTitle()}
                    {
                        chatRoom.type === "private" ?
                            <span className={"user-card-presence " + presenceClass}></span>
                            :
                            undefined
                    }
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

        window.location = room.getRoomUrl();
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
                currentCallingContactStatusProps.className += " " + user.u + " " + megaChat.xmppPresenceToCssClass(user.presence);
                currentCallingContactStatusProps['data-jid'] = room.roomJid;

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
            var contact;
            if (!chatRoom || !chatRoom.roomJid) {
                return;
            }

            if (chatRoom.type === "private") {
                contact = chatRoom.getParticipantsExceptMe()[0];
                if (!contact) {
                    return;
                }
                contact = chatRoom.megaChat.getContactFromJid(contact);

                if (contact && contact.c === 0) {
                    // a non-contact conversation, e.g. contact removed - mark as read only
                    Soon(function () {
                        chatRoom.privateReadOnlyChat = true;
                    });
                }
            }

            currConvsList.push(
                <ConversationsListItem
                    key={chatRoom.roomJid.split("@")[0]}
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


var ConversationsApp = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    getInitialState: function() {
        return {
            'leftPaneWidth': mega.config.get('leftPaneWidth')
        };
    },
    startChatClicked: function(selected) {
        if (selected.length === 1) {
            window.location = "#fm/chat/" + selected[0];
            this.props.megaChat.createAndShowPrivateRoomFor(selected[0]);
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

        var lPane = $('.conversationsApp .fm-left-panel');

        self.fmConfigThrottling = null;
        self.fmConfigLeftPaneListener = mBroadcaster.addListener('fmconfig:leftPaneWidth', function() {
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

        this.handleWindowResize();

    },
    componentWillUnmount: function() {
        window.removeEventListener('resize', this.handleWindowResize);
        $(document).unbind('keydown.megaChatTextAreaFocus');
        mBroadcaster.removeListener(this.fmConfigLeftPaneListener);
    },
    componentDidUpdate: function() {
        this.handleWindowResize();
    },
    handleWindowResize: function() {
        // small piece of what is done in fm_resize_handler...
        $('.fm-right-files-block, .fm-right-account-block')
            .filter(':visible')
            .css({
                'margin-left': ($('.fm-left-panel').width() + $('.nw-fm-left-icons-panel').width()) + "px"
            });
    },
    render: function() {
        var self = this;

        var presence = self.props.megaChat.karere.getMyPresence();

        var startChatIsDisabled = !presence || presence === "offline" || presence === "unavailable";


        var leftPanelStyles = {};

        if (self.state.leftPaneWidth) {
            leftPanelStyles.width = self.state.leftPaneWidth;
        }


        return (
            <div className="conversationsApp" key="conversationsApp">
                <div className="fm-left-panel" style={leftPanelStyles}>
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
                                    onSelectDone={this.startChatClicked}
                                    multiple={true}
                                    />
                            </ButtonsUI.Button>
                        </div>
                    </div>


                    <div className="fm-tree-panel manual-tree-panel-scroll-management" style={leftPanelStyles}>
                        <PerfectScrollbar style={leftPanelStyles}>
                            <div className={
                                "content-panel conversations" + (
                                    window.location.hash.indexOf("/chat") !== -1 ? " active" : ""
                                )
                            }>
                                <ConversationsList chats={this.props.megaChat.chats} megaChat={this.props.megaChat} contacts={this.props.contacts} />
                            </div>
                        </PerfectScrollbar>
                    </div>
                </div>
                <div className="fm-right-files-block">
                    <div className="fm-empty-messages hidden">
                    <div className="fm-empty-pad">
                        <div className="fm-empty-messages-bg"></div>
                        <div className="fm-empty-cloud-txt">{__(l[6870])}</div>
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
