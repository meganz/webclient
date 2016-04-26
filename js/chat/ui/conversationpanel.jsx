// libs
var React = require("react");
var ReactDOM = require("react-dom");
var utils = require('./../../ui/utils.jsx');
var RenderDebugger = require('./../../stores/mixins.js').RenderDebugger;
var MegaRenderMixin = require('./../../stores/mixins.js').MegaRenderMixin;
var ButtonsUI = require('./../../ui/buttons.jsx');
var ModalDialogsUI = require('./../../ui/modalDialogs.jsx');
var DropdownsUI = require('./../../ui/dropdowns.jsx');
var ContactsUI = require('./../ui/contacts.jsx');
var ConversationsUI = require('./../ui/conversations.jsx');
var TypingAreaUI = require('./../ui/typingArea.jsx');
var getMessageString = require('./messages/utils.jsx').getMessageString;

var GenericConversationMessage = require('./messages/generic.jsx').GenericConversationMessage;
var AlterParticipantsConversationMessage = require('./messages/alterParticipants.jsx').AlterParticipantsConversationMessage;




var ConversationRightArea = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    render: function() {
        var self = this;
        var room = this.props.chatRoom;
        var contactJid = room.getParticipantsExceptMe()[0];
        var contact = room.megaChat.getContactFromJid(contactJid);


        if (!contact) {
            // something is really bad.
            return null;
        }
        var startAudioCallButton = <div className={"link-button" + (!contact.presence? " disabled" : "")} onClick={() => {
                            if (contact.presence && contact.presence !== "offline") {
                                room.startAudioCall();
                            }
                        }}>
            <i className="small-icon audio-call"></i>
            {__(l[5896])}
        </div>;

        var startVideoCallButton = <div className={"link-button" + (!contact.presence? " disabled" : "")} onClick={() => {
                        if (contact.presence && contact.presence !== "offline") {
                            room.startVideoCall();
                        }
                    }}>
            <i className="small-icon video-call"></i>
            {__(l[5897])}
        </div>;

        if (room.isReadOnly()) {
           startAudioCallButton = startVideoCallButton = null;
        }
        var endCallButton = <div className={"link-button red" + (!contact.presence? " disabled" : "")} onClick={() => {
                        if (contact.presence && contact.presence !== "offline") {
                            if (room.callSession) {
                                room.callSession.endCall();
                            }
                        }
                    }}>
            <i className="small-icon horizontal-red-handset"></i>
            {__(l[5884])}
        </div>;


        if (room.callSession && room.callSession.isActive() === true) {
            startAudioCallButton = startVideoCallButton = null;
        } else {
            endCallButton = null;
        }

        var contactsList = [];


        var contacts = room.type === "group" ?
            (
                room.members && Object.keys(room.members).length > 0 ? Object.keys(room.members) :
                    room.getContactParticipantsExceptMe()
            )   :
            room.getContactParticipantsExceptMe();

        contacts.forEach(function(contactHash) {
            var contact = M.u[contactHash];
            if (contact && contactHash != u_handle) {
                var dropdowns = [];
                var privilege = null;

                if (room.type === "group" && room.members) {
                    var removeParticipantButton = <DropdownsUI.DropdownItem
                        key="remove" icon="human-profile" label={__("Remove participant")} onClick={() => {
                                    $(room).trigger('onRemoveUserRequest', [contactHash]);
                                }}/>;


                    if (room.iAmOperator()) {
                        // operator
                        dropdowns.push(
                            removeParticipantButton
                        );


                        if (room.members[contactHash] !== 3) {
                            dropdowns.push(
                                <DropdownsUI.DropdownItem
                                    key="privOperator" icon="human-profile"
                                    label={__("Change privilege to Operator")}
                                    onClick={() => {
                                        $(room).trigger('alterUserPrivilege', [contactHash, 3]);
                                    }}/>
                            );
                        }

                        if (room.members[contactHash] !== 2) {
                            dropdowns.push(
                                <DropdownsUI.DropdownItem
                                    key="privFullAcc" icon="human-profile"
                                    label={__("Change privilage to Full access")} onClick={() => {
                                        $(room).trigger('alterUserPrivilege', [contactHash, 2]);
                                    }}/>
                            );
                        }

                        if (room.members[contactHash] !== 1) {
                            dropdowns.push(
                                <DropdownsUI.DropdownItem
                                    key="privReadWrite" icon="human-profile"
                                    label={__("Change privilage to Read & Write")} onClick={() => {
                                        $(room).trigger('alterUserPrivilege', [contactHash, 1]);
                                    }}/>
                            );
                        }
                    }
                    else if (room.members[u_handle] === 2) {
                        // full access

                    }
                    else if (room.members[u_handle] === 1) {
                        // read write

                    }
                    else if (room.isReadOnly()) {
                        // read only
                    }


                    // other user privilege
                    if (room.members[contactHash] === 3) {
                        privilege = <abbr title="Operator">@</abbr>;
                    }
                    else if (room.members[contactHash] === 2) {
                        privilege = <abbr title="Full access">$</abbr>;
                    } 
                    else if (room.members[contactHash] === 1) {
                        privilege = <abbr title="Read & Write"></abbr>;
                    }
                    else if (room.members[contactHash] === 0) {
                        privilege = <abbr title="Removed">-</abbr>;
                    }
                }

                contactsList.push(
                    <ContactsUI.ContactCard
                        key={contact.u}
                        contact={contact}
                        megaChat={room.megaChat}
                        className="right-chat-contact-card"
                        dropdownPositionMy="right top"
                        dropdownPositionAt="right bottom"
                        dropdowns={dropdowns}
                        namePrefix={privilege}
                    />
                );
            }
        });

        var isReadOnlyElement = null;

        if (room.isReadOnly()) {
            isReadOnlyElement = <span className="center">(read only chat)</span>;
        }
        var excludedParticipants = room.type === "group" ?
            (
                room.members && Object.keys(room.members).length > 0 ? Object.keys(room.members) :
                    room.getContactParticipants()
            )   :
            room.getContactParticipants();


        return <div className="chat-right-area">
            <div className="chat-right-area conversation-details-scroll">
                <div className="chat-right-pad">

                    {isReadOnlyElement}
                    {contactsList}
                    <div className="clear"></div>

                    <div className="buttons-block">
                        {startAudioCallButton}
                        {startVideoCallButton}

                        <ButtonsUI.Button
                            className="link-button dropdown-element"
                            icon="rounded-grey-plus"
                            label={__(l[8007])}
                            contacts={this.props.contacts}
                            disabled={
                                /* Disable in case I don't have any more contacts to add ... */
                                !(
                                    excludedParticipants.length !== this.props.contacts.length &&
                                    !room.isReadOnly() &&
                                    room.iAmOperator()
                                )
                            }
                            >
                            <DropdownsUI.DropdownContactsSelector
                                contacts={this.props.contacts}
                                megaChat={this.props.megaChat}
                                chatRoom={room}
                                exclude={
                                    excludedParticipants
                                }
                                className="popup add-participant-selector"
                                onClick={this.props.onAddParticipantSelected}
                                />
                        </ButtonsUI.Button>

                        <ButtonsUI.Button
                            className="link-button dropdown-element"
                            icon="rounded-grey-up-arrow"
                            label={__(l[6834] + "...")}
                            disabled={room.isReadOnly()}
                            >
                            <DropdownsUI.Dropdown
                                contacts={this.props.contacts}
                                megaChat={this.props.megaChat}
                                className="wide-dropdown send-files-selector"
                                onClick={() => {}}
                            >
                                <DropdownsUI.DropdownItem icon="grey-cloud" label={__(l[8013])} onClick={() => {
                                    self.props.onAttachFromCloudClicked();
                                }} />
                                <DropdownsUI.DropdownItem icon="grey-computer" label={__(l[8014])} onClick={() => {
                                    self.props.onAttachFromComputerClicked();
                                }} />
                            </DropdownsUI.Dropdown>
                        </ButtonsUI.Button>

                        {endCallButton}
                        {
                            room.type === "group" ?
                                <div className="link-button red" onClick={() => {
                                   room.leave(true);
                                }}>
                                    <i className="small-icon rounded-stop"></i>
                                    {__(l[8633])}
                                </div>
                                : null
                        }
                        {
                            room.type === "group" ?
                                <div className="link-button red" onClick={() => {
                                    Object.keys(room.members).forEach(function (h) {
                                        if (h !== u_handle) {
                                            api_req({
                                                a: 'mcr',
                                                id: room.chatId,
                                                u: h
                                            });
                                        }
                                    });
                                    api_req({
                                        a: 'mcr',
                                        id: room.chatId,
                                        u: u_handle
                                    });

                                   room.leave(true);
                                }}>
                                    <i className="small-icon rounded-stop"></i>
                                    {__("(DEBUG) Destroy")}
                                </div>
                                : null
                        }
                    </div>

                </div>
            </div>
        </div>
    }
});



var ConversationAudioVideoPanel = React.createClass({
    mixins: [MegaRenderMixin],
    getInitialState: function() {
        return {
            'messagesBlockEnabled': false,
            'fullScreenModeEnabled': false,
            'localMediaDisplay': true
        }
    },
    componentDidUpdate: function() {
        var self = this;
        var $container = $(ReactDOM.findDOMNode(self));
        var room = self.props.chatRoom;

        var mouseoutThrottling = null;
        $container.rebind('mouseover.chatUI' + self.props.chatRoom.roomJid, function() {
            var $this = $(this);
            clearTimeout(mouseoutThrottling);
            self.visiblePanel = true;
            $('.call.bottom-panel, .call.local-video, .call.local-audio', $container).addClass('visible-panel');
            if ($this.hasClass('full-sized-block')) {
                $('.call.top-panel', $container).addClass('visible-panel');
            }
        });

        $container.rebind('mouseout.chatUI' + self.props.chatRoom.roomJid, function() {
            var $this = $(this);
            clearTimeout(mouseoutThrottling);
            mouseoutThrottling = setTimeout(function() {
                self.visiblePanel = false;
                $('.call.bottom-panel, .call.local-video, .call.local-audio', $container).removeClass('visible-panel');
                $('.call.top-panel', $container).removeClass('visible-panel');
            }, 500);
        });


        //Hidding Control panel if cursor is idle
        var idleMouseTimer;
        var forceMouseHide = false;
        $container.rebind('mousemove.chatUI' + self.props.chatRoom.roomJid,function(ev) {
            var $this = $(this);
            clearTimeout(idleMouseTimer);
            if (!forceMouseHide) {
                self.visiblePanel = true;
                $('.call.bottom-panel, .call.local-video, .call.local-audio', $container).addClass('visible-panel');
                $container.removeClass('no-cursor');
                if ($this.hasClass('full-sized-block')) {
                    $('.call.top-panel', $container).addClass('visible-panel');
                }
                idleMouseTimer = setTimeout(function() {
                    self.visiblePanel = false;
                    $('.call.bottom-panel, .call.local-video, .call.local-audio', $container).removeClass('visible-panel');
                    $container.addClass('no-cursor');
                    $('.call.top-panel', $container).removeClass('visible-panel');

                    forceMouseHide = true;
                    setTimeout(function() {
                        forceMouseHide = false;
                    }, 400);
                }, 2000);
            }
        });

        $(document)
            .unbind("fullscreenchange.megaChat_" + room.roomJid)
            .bind("fullscreenchange.megaChat_" + room.roomJid, function() {
                if (!$(document).fullScreen() && room.isCurrentlyActive) {
                    self.setState({fullScreenModeEnabled: false});
                }
                else if (!!$(document).fullScreen() && room.isCurrentlyActive) {
                    self.setState({fullScreenModeEnabled: true});
                }
            });

        var $localMediaDisplay = $('.call.local-video, .call.local-audio', $container);
        $localMediaDisplay.draggable({
            'refreshPositions': true,
            'containment': $container,
            'scroll': false,
            drag: function(event, ui){
                if ($(this).is(".minimized")) {
                    return false;
                }

                var right = Math.max(0, $container.outerWidth() - ui.position.left);
                var bottom = Math.max(0, $container.outerHeight() - ui.position.top);


                // contain in the $container
                right = Math.min(right, $container.outerWidth() - 8);
                bottom = Math.min(bottom, $container.outerHeight() - 8);

                right = right - ui.helper.outerWidth();
                bottom = bottom - ui.helper.outerHeight();

                var minBottom = $(this).is(".minimized") ? 48 : 8;

                if (bottom < minBottom) {
                    bottom = minBottom;
                    $(this).addClass('bottom-aligned');
                }
                else {
                    $(this).removeClass('bottom-aligned');
                }

                if (right < 8) {
                    right = 8;
                    $(this).addClass('right-aligned');
                }
                else {
                    $(this).removeClass('right-aligned');
                }

                ui.offset = {
                    left: 'auto',
                    top: 'auto',
                    right: right,
                    bottom: bottom,
                    height: "",
                    width: ""
                };
                ui.position.left = 'auto';
                ui.position.top = 'auto';

                ui.helper.css(ui.offset);
                $(this).css(ui.offset);
            }
        });

        // REposition the $localMediaDisplay if its OUT of the viewport (in case of dragging -> going back to normal size
        // mode from full screen...)
        $(window).rebind('resize.chatUI_' + room.roomJid, function(e) {
            if ($container.is(":visible")) {
                if (!elementInViewport($localMediaDisplay[0])) {
                    $localMediaDisplay
                        .addClass('right-aligned')
                        .addClass('bottom-aligned')
                        .css({
                            'right': 8,
                            'bottom': 8,
                        });
                }
            }
        });

        $('video', $container).each(function() {
            $(this)[0].play();
        });
    },
    toggleMessages: function(e) {
        e.preventDefault();
        e.stopPropagation();


        if (this.props.onMessagesToggle) {
            this.props.onMessagesToggle(
                !this.state.messagesBlockEnabled
            );
        }

        this.setState({
            'messagesBlockEnabled': !this.state.messagesBlockEnabled
        });

    },
    fullScreenModeToggle: function(e) {
        e.preventDefault();
        e.stopPropagation();

        var newVal = !this.state.fullScreenModeEnabled;
        $(document).fullScreen(newVal);

        this.setState({
            'fullScreenModeEnabled': newVal,
            'messagesBlockEnabled': newVal === true ? false : this.state.messagesBlockEnabled
        });
    },
    toggleLocalVideoDisplay: function(e) {
        e.preventDefault();
        e.stopPropagation();

        var $container = $(ReactDOM.findDOMNode(this));
        var $localMediaDisplay = $('.call.local-video, .call.local-audio', $container);

        $localMediaDisplay
            .addClass('right-aligned')
            .addClass('bottom-aligned')
            .css({
                'width': '',
                'height': '',
                'right': 8,
                'bottom': !this.state.localMediaDisplay === true ? 8 : 8
            });

        this.setState({localMediaDisplay: !this.state.localMediaDisplay});
    },
    render: function() {
        var chatRoom = this.props.chatRoom;

        if (!chatRoom.callSession || !chatRoom.callSession.isActive()) {
            return null;
        }

        var participants = chatRoom.getParticipantsExceptMe();

        var displayNames = [];

        participants.forEach(function(v) {
            displayNames.push(
                htmlentities(chatRoom.megaChat.getContactNameFromJid(v))
            );
        });


        var callSession = chatRoom.callSession;

        var remoteCamEnabled = null;


        if (callSession.getRemoteMediaOptions().video) {
            remoteCamEnabled = <i className="small-icon blue-videocam" />;
        }


        var localPlayerElement = null;
        var remotePlayerElement = null;

        var visiblePanelClass = "";

        if (this.visiblePanel === true) {
            visiblePanelClass += " visible-panel";
        }
        if (callSession.getMediaOptions().video === false) {
            localPlayerElement = <div className={"call local-audio right-aligned bottom-aligned" + (this.state.localMediaDisplay ? "" : " minimized ") + visiblePanelClass}>
                <div className="default-white-button tiny-button call" onClick={this.toggleLocalVideoDisplay}>
                    <i className="tiny-icon grey-minus-icon" />
                </div>
                <ContactsUI.Avatar
                    contact={M.u[u_handle]} className="call semi-big-avatar"
                    style={{display: !this.state.localMediaDisplay ? "none" : ""}}
                />
            </div>;
        }
        else {
            if (callSession.localPlayer) {
                var localPlayerSrc = (
                    callSession && callSession.localPlayer && callSession.localPlayer.src ?
                        callSession.localPlayer.src :
                        null
                );

                if (!localPlayerSrc) {
                    if (callSession.localPlayer.srcObject) {
                        callSession.localPlayer.src = URL.createObjectURL(callSession.localPlayer.srcObject);
                        localPlayerSrc = callSession.localPlayer.src;
                    }
                    else if (callSession.localPlayer.mozSrcObject) {
                        callSession.localPlayer.src = URL.createObjectURL(callSession.localPlayer.mozSrcObject);
                        localPlayerSrc = callSession.localPlayer.src;
                    }
                    else if (
                        callSession.getJingleSession() &&
                        callSession.getJingleSession()._sess &&
                        callSession.getJingleSession()._sess.localStream
                    ) {
                        callSession.localPlayer.src = URL.createObjectURL(
                            callSession.getJingleSession()._sess.localStream
                        );
                        localPlayerSrc = callSession.localPlayer.src;
                    }
                    else {
                        console.error("Could not retrieve src object.");
                    }
                }
                localPlayerElement = <div
                    className={"call local-video right-aligned bottom-aligned" + (this.state.localMediaDisplay ? "" : " minimized ") + visiblePanelClass}>
                    <div className="default-white-button tiny-button call" onClick={this.toggleLocalVideoDisplay}>
                        <i className="tiny-icon grey-minus-icon"/>
                    </div>
                    <video
                        className="localViewport"
                        defaultMuted={true}
                        muted={true}
                        volume={0}
                        id={"localvideo_" + callSession.sid}
                        src={localPlayerSrc}
                        style={{display: !this.state.localMediaDisplay ? "none" : ""}}

                    />
                </div>;
            }
        }

        if (callSession.getRemoteMediaOptions().video === false || !callSession.remotePlayer) {
            var contact = chatRoom.megaChat.getContactFromJid(participants[0]);
            remotePlayerElement = <div className="call user-audio">
                <ContactsUI.Avatar contact={contact}  className="big-avatar" hideVerifiedBadge={true} />
            </div>;
        }
        else {
            var remotePlayer = callSession.remotePlayer[0];

            var remotePlayerSrc = remotePlayer.src;

            if (!remotePlayerSrc) {
                if (remotePlayer.srcObject) {
                    remotePlayer.src = URL.createObjectURL(remotePlayer.srcObject);
                    remotePlayerSrc = remotePlayer.src;
                }
                else if (remotePlayer.mozSrcObject) {
                    remotePlayer.src = URL.createObjectURL(remotePlayer.mozSrcObject);
                    remotePlayerSrc = remotePlayer.src;
                }
                else {
                    console.error("Could not retrieve src object.");
                }
            }

            remotePlayerElement = <div className="call user-video">
                <video
                    autoPlay={true}
                    className="rmtViewport rmtVideo"
                    id={"remotevideo_" + callSession.sid}
                    ref="remoteVideo"
                    src={remotePlayerSrc}
                />
            </div>;
        }


        var unreadDiv = null;
        var unreadCount = chatRoom.messagesBuff.getUnreadCount();
        if (unreadCount > 0) {
            unreadDiv = <div className="unread-messages">{unreadCount}</div>
        }

        var additionalClass = "";
        additionalClass = (this.state.fullScreenModeEnabled === true ? " full-sized-block" : "");
        if (additionalClass.length === 0) {
            additionalClass = (this.state.messagesBlockEnabled === true ? " small-block" : "");
        }
        return <div className={"call-block" + additionalClass} id="call-block">
            {remotePlayerElement}
            {localPlayerElement}


            <div className="call top-panel">
                <div className="call top-user-info">
                    <span className="user-card-name white">{displayNames.join(", ")}</span>{remoteCamEnabled}
                </div>
                <div
                    className="call-duration medium blue call-counter"
                    data-room-jid={chatRoom.roomJid.split("@")[0]}>{
                    secondsToTimeShort(chatRoom._currentCallCounter)
                    }
                </div>
            </div>


            <div className="call bottom-panel">
                <div className={"button call left" + (unreadDiv ? " unread" : "")} onClick={this.toggleMessages}>
                    {unreadDiv}
                    <i className="big-icon conversations"></i>
                </div>
                <div className="button call" onClick={function(e) {
                    if (callSession.getMediaOptions().audio === true) {
                        callSession.muteAudio();
                    }
                    else {
                        callSession.unmuteAudio();
                    }
                }}>
                    <i className={"big-icon " + (callSession.getMediaOptions().audio ? " microphone" : " crossed-microphone")}></i>
                </div>
                <div className="button call" onClick={function(e) {
                    if (callSession.getMediaOptions().video === true) {
                        callSession.muteVideo();
                    }
                    else {
                        callSession.unmuteVideo();
                    }
                }}>
                    <i className={"big-icon " + (callSession.getMediaOptions().video ? " videocam" : " crossed-videocam")}></i>
                </div>
                <div className="button call" onClick={function(e) {
                        chatRoom.callSession.endCall();
                    }}>
                    <i className="big-icon horizontal-red-handset"></i>
                </div>
                <div className="button call right" onClick={this.fullScreenModeToggle}>
                    <i className="big-icon nwse-resize"></i>
                </div>
            </div>
        </div>;
    }
});
var ConversationPanel = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],

    getInitialState: function() {
        return {
            startCallPopupIsActive: false,
            localVideoIsMinimized: false,
            isFullscreenModeEnabled: false,
            mouseOverDuringCall: false,
            currentlyTyping: [],
            attachCloudDialog: false,
            messagesToggledInCall: false,
            editingMessageId: false,
            sendContactDialog: false
        };
    },

    uploadFromComputer: function() {
        $('#fileselect3').trigger('click')
    },
    refreshUI: function(scrollToBottom) {
        var self = this;
        var room = self.props.chatRoom;

        if (room._leaving) {
            return;
        }

        if (!self.props.chatRoom.isCurrentlyActive) {
            return;
        }

        var $jsp = self.$messages.data("jsp");
        if ($jsp) {
            var perc = $jsp.getPercentScrolledY();


            if (scrollToBottom) {
                self.$messages.one('jsp-initialised', function () {
                    $jsp.scrollToBottom();
                });
            }
            else {
                self.$messages.one('jsp-initialised', function () {
                    $jsp.scrollToPercentY($jsp.getPercentScrolledY(perc));
                });
            }
            $jsp.reinitialise();
        }

        room.renderContactTree();

        room.megaChat.refreshConversations();

        room.trigger('RefreshUI');
    },

    onMouseMove: function(e) {
        var self = this;
        var chatRoom = self.props.chatRoom;
        if (self.isMounted()) {
            chatRoom.trigger("onChatIsFocused");
        }
    },

    handleKeyDown: function(e) {
        var self = this;
        var chatRoom = self.props.chatRoom;
        if (self.isMounted() && chatRoom.isActive()) {
            chatRoom.trigger("onChatIsFocused");
        }
    },
    componentDidMount: function() {
        var self = this;
        window.addEventListener('resize', self.handleWindowResize);
        window.addEventListener('keydown', self.handleKeyDown);


        var $container = $(ReactDOM.findDOMNode(self));

        self.$messages = $('.messages.scroll-area > .jScrollPaneContainer', $container);

        var droppableConfig = {
            tolerance: 'pointer',
            drop: function(e, ui)
            {
                $.doDD(e,ui,'drop',1);
            },
            over: function (e, ui)
            {
                $.doDD(e,ui,'over',1);
            },
            out: function (e, ui)
            {
                $.doDD(e,ui,'out',1);
            }
        };

        self.$messages.droppable(droppableConfig);

        self.lastScrollPosition = null;
        self.lastScrolledToBottom = true;
        self.lastScrollHeight = 0;
        self.lastUpdatedScrollHeight = 0;

        //self.$messages.jScrollPane({
        //    enableKeyboardNavigation:false,
        //    showArrows:true,
        //    arrowSize:5,
        //    animateDuration: 70,
        //    maintainPosition: false
        //});

        self.$messages.rebind('jsp-user-scroll-y.conversationsPanel' + self.props.chatRoom.roomJid, function(e, scrollPositionY, isAtTop, isAtBottom) {
            var $jsp = self.$messages.data("jsp");

            if (self.lastScrollPosition === scrollPositionY || self.scrolledToBottom !== 1) {
                return;
            }

            if (scrollPositionY < 350 && !isAtBottom && self.$messages.is(":visible")) {
                if (
                    self.lastUpdatedScrollHeight !== $jsp.getContentHeight() &&
                    !self.props.chatRoom.messagesBuff.messagesHistoryIsLoading() &&
                    self.props.chatRoom.messagesBuff.haveMoreHistory()
                ) {
                    self.props.chatRoom.messagesBuff.retrieveChatHistory();
                    self.lastUpdatedScrollHeight = $jsp.getContentHeight();
                }
            }

            if (isAtBottom) {
                self.lastScrolledToBottom = true;
            }
            else {
                self.lastScrolledToBottom = false;
            }

            self.lastScrollHeight = $jsp.getContentHeight();
            self.lastScrollPosition = scrollPositionY;
        });

        self.$messages.rebind('jsp-initialised.conversationsPanel' + self.props.chatRoom.roomJid, function(e) {
            var $jsp = self.$messages.data("jsp");

            if (self.lastScrolledToBottom === true) {
                $jsp.scrollToBottom();
            }
            else {
                var prevPosY = (
                        $jsp.getContentHeight() - self.lastScrollHeight
                    ) + self.lastScrollPosition;

                $jsp.scrollToY(
                    prevPosY
                );
            }
        });

        var room = self.props.chatRoom;

        // collapse on ESC pressed (exited fullscreen)
        $(document)
            .unbind("fullscreenchange.megaChat_" + room.roomJid)
            .bind("fullscreenchange.megaChat_" + room.roomJid, function() {
                if (!$(document).fullScreen() && room.isCurrentlyActive) {
                    self.setState({isFullscreenModeEnabled: false});
                }
                else if (!!$(document).fullScreen() && room.isCurrentlyActive) {
                    self.setState({isFullscreenModeEnabled: true});
                }
            });
        self.handleWindowResize();
    },
    componentWillMount: function() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = self.props.chatRoom.megaChat;
        megaChat.karere.bind("onComposingMessage." + chatRoom.roomJid, function(e, eventObject) {
            if (!self.isMounted()) {
                return;
            }
            if (Karere.getNormalizedFullJid(eventObject.getFromJid()) === megaChat.karere.getJid()) {
                return;
            }

            var room = megaChat.chats[eventObject.getRoomJid()];
            if (room.roomJid == chatRoom.roomJid) {
                var currentlyTyping = self.state.currentlyTyping;
                currentlyTyping.push(
                    megaChat.getContactFromJid(Karere.getNormalizedBareJid(eventObject.getFromJid())).u
                );
                currentlyTyping = array_unique(currentlyTyping);
                self.setState({
                    currentlyTyping: currentlyTyping
                });
            }
        });

        megaChat.karere.rebind("onPausedMessage." + chatRoom.roomJid, function(e, eventObject) {
            var room = megaChat.chats[eventObject.getRoomJid()];

            if (!self.isMounted()) {
                return;
            }
            if (Karere.getNormalizedFullJid(eventObject.getFromJid()) === megaChat.karere.getJid()) {
                return;
            }

            if (room.roomJid === chatRoom.roomJid) {
                var currentlyTyping = self.state.currentlyTyping;
                var u_h = megaChat.getContactFromJid(Karere.getNormalizedBareJid(eventObject.getFromJid())).u;

                if (currentlyTyping.indexOf(u_h) > -1) {
                    removeValue(currentlyTyping, u_h);
                    self.setState({
                        currentlyTyping: currentlyTyping
                    });
                    self.forceUpdate();
                }
            }
        });


        $(document).rebind('keyup.megaChatEditTextareaClose' + chatRoom.roomJid, function(e) {
            if (!self.state.editingMessageId) {
                return;
            }

            var megaChat = self.props.chatRoom.megaChat;
            if (megaChat.currentlyOpenedChat && megaChat.currentlyOpenedChat === self.props.chatRoom.roomJid) {
                if (e.keyCode === 27) {
                    self.setState({'editingMessageId': false});
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }

            }
        });
    },
    componentWillUnmount: function() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = chatRoom.megaChat;

        window.removeEventListener('resize', self.handleWindowResize);
        window.removeEventListener('keydown', self.handleKeyDown);
        $(document).unbind("fullscreenchange.megaChat_" + chatRoom.roomJid);

        megaChat.karere.bind("onComposingMessage." + chatRoom.roomJid);
        megaChat.karere.unbind("onPausedMessage." + chatRoom.roomJid);

        $(document).unbind('keyup.megaChatEditTextareaClose' + self.props.chatRoom.roomJid);
    },
    componentDidUpdate: function() {
        var self = this;
        var room = this.props.chatRoom;

        room.megaChat.updateSectionUnreadCount();

        self.handleWindowResize();
    },
    handleWindowResize: function(e, scrollToBottom) {
        var $container = $(ReactDOM.findDOMNode(this));
        var self = this;

        if (!self.props.chatRoom.isCurrentlyActive) {
            return;
        }

        // typeArea resizing
        var $textarea = $('.main-typing-area textarea.messages-textarea', $container);
        var textareaHeight =  $textarea.outerHeight();
        var $hiddenDiv = $('.main-typing-area .message-preview', $container);
        var $pane = $('.main-typing-area .chat-textarea-scroll', $container);
        var $jsp;

        if (textareaHeight != $hiddenDiv.height()) {
            $textarea.css('height', $hiddenDiv.height());

            if ($hiddenDiv.outerHeight() > 100) {
                $pane.jScrollPane({
                    enableKeyboardNavigation:false,
                    showArrows:true,
                    arrowSize:5
                });
                $jsp = $pane.data('jsp');
                $textarea.blur();
                $textarea.focus();
                $jsp.scrollByY(0);
            }
            else {
                $jsp = $pane.data('jsp');
                if ($jsp) {
                    $jsp.destroy();
                    $textarea.blur();
                    $textarea.focus();
                }
            }
        }

        // Important. Please insure we have correct height detection for Chat messages block.
        // We need to check ".fm-chat-input-scroll" instead of ".fm-chat-line-block" height
        var scrollBlockHeight = (
            $('.chat-content-block', $container).outerHeight() -
            $('.call-block', $container).outerHeight() -
            $('.chat-textarea-block', $container).outerHeight()
        );
        if (scrollBlockHeight != self.$messages.outerHeight()) {
            self.$messages.css('height', scrollBlockHeight);
            $('.messages.main-pad', self.$messages).css('min-height', scrollBlockHeight);
            self.refreshUI(true);
        }
        else {
            self.refreshUI(scrollToBottom);
        }

        // try to do a .scrollToBottom only once, to trigger the stickToBottom func. of JSP
        if (!self.scrolledToBottom) {
            var $messagesPad = $('.messages.main-pad', self.$messages);
            if (
                $messagesPad.outerHeight() - 1 > $messagesPad.parent().parent().parent().outerHeight()
            ) {
                self.scrolledToBottom = 1;
                self.$messages.data("jsp").scrollToBottom();
            }
        }
    },
    isActive: function() {
        return document.hasFocus() && this.$messages && this.$messages.is(":visible");
    },
    render: function() {
        var self = this;

        var room = this.props.chatRoom;
        var contactJid = room.getParticipantsExceptMe()[0];
        var contact = room.megaChat.getContactFromJid(contactJid);

        var conversationPanelClasses = "conversation-panel";

        if (!room.isCurrentlyActive) {
            conversationPanelClasses += " hidden";
        }


        if (!contact) {
            return null;
        }
        var avatarMeta = generateAvatarMeta(contact.u);
        var contactName = avatarMeta.fullName;


        var messagesList = [
        ];

        if (
            self.props.messagesBuff.messagesHistoryIsLoading() === true ||
            self.props.messagesBuff.joined === false ||
            (
                self.props.messagesBuff.joined === true &&
                self.props.messagesBuff.haveMessages === true &&
                self.props.messagesBuff.messagesHistoryIsLoading() === true
            )
        ) {
            messagesList.push(
                <div className="loading-spinner light active" key="loadingSpinner"><div className="main-loader"></div></div>
            );
        } else if (
            self.props.messagesBuff.joined === true && (
                self.props.messagesBuff.messages.length === 0 ||
                !self.props.messagesBuff.haveMoreHistory()
            )
        ) {
            var headerText = (
                self.props.messagesBuff.messages.length === 0 ?
                    __(l[8002]) :
                    __(l[8002])
            );

            headerText = headerText.replace("%s", "<span>" + htmlentities(contactName) + "</span>");

            messagesList.push(
                <div className="messages notification" key="initialMsg">
                    <div className="header" dangerouslySetInnerHTML={{__html: headerText}}>
                    </div>
                    <div className="info">
                        {__(l[8080])}
                        <p>
                            <i className="semi-big-icon grey-lock"></i>
                            <span dangerouslySetInnerHTML={{
                                __html: __(l[8540])
                                    .replace("[S]", "<strong>")
                                    .replace("[/S]", "</strong>")
                            }}></span>
                        </p>
                        <p>
                            <i className="semi-big-icon grey-tick"></i>
                            <span dangerouslySetInnerHTML={{
                                __html: __(l[8539])
                                    .replace("[S]", "<strong>")
                                    .replace("[/S]", "</strong>")
                            }}></span>
                        </p>
                    </div>
                </div>
            );
        }
        var lastTimeMarker;
        var lastMessageFrom = null;
        var lastGroupedMessageTimeStamp = null;
        var grouped = false;

        self.props.messagesBuff.messages.forEach(function(v, k) {
            if (/*v.deleted !== 1 && */!v.protocol && v.revoked !== true) {
                var shouldRender = true;
                if (v.isManagement && v.isManagement() === true && v.isRenderableManagement() === false) {
                    shouldRender = false;
                }

                var curTimeMarker = time2lastSeparator((new Date(v.delay * 1000).toISOString()));

                if (shouldRender === true && curTimeMarker && lastTimeMarker !== curTimeMarker) {
                    lastTimeMarker = curTimeMarker;
                    messagesList.push(
                        <div className="message date-divider" key={v.messageId + "_marker"}>{curTimeMarker}</div>
                    );

                    grouped = false;
                    lastMessageFrom = null;
                    lastGroupedMessageTimeStamp = null;
                }


                if (shouldRender === true) {
                    var userId = v.userId;
                    var timestamp = v.delay;
                    if (!userId && v.fromJid) {
                        var contact = room.megaChat.getContactFromJid(v.fromJid);
                        if (contact && contact.u) {
                            userId = contact.u;
                        }
                    }

                    if (
                        v instanceof KarereEventObjects.OutgoingMessage ||
                        v instanceof Message
                    ) {

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


                if (v.dialogType) {
                    var messageInstance = null;
                    if (v.dialogType === 'alterParticipants') {
                        messageInstance = <AlterParticipantsConversationMessage
                            message={v}
                            chatRoom={room}
                            key={v.messageId}
                            contact={M.u[v.userId]}
                            grouped={grouped}
                            isBeingEdited={self.state.editingMessageId === v.messageId}
                            onEditDone={(messageContents) => {
                            self.setState({'editingMessageId': false});
                        }}
                        />
                    }

                    messagesList.push(messageInstance);
                }
                else {
                    messagesList.push(
                        <GenericConversationMessage
                            message={v}
                            chatRoom={room}
                            key={v.messageId}
                            contact={contact}
                            grouped={grouped}
                            isBeingEdited={self.state.editingMessageId === v.messageId}
                            onEditDone={(messageContents) => {
                            self.setState({'editingMessageId': false});
                        }}
                        />
                    );
                }
            }
        });

        var typingElement;



        if (self.state.currentlyTyping.length > 0) {
            var names = self.state.currentlyTyping.map((u_h) => {
                var avatarMeta = generateAvatarMeta(u_h);
                return avatarMeta.fullName.split(" ")[0];
            });

            var namesDisplay = "";
            var areMultipleUsersTyping = false;

            if (names.length > 1) {
                areMultipleUsersTyping = true;
                namesDisplay = [names.splice(0, names.length - 1).join(", "), names[0]];
            }
            else {
                areMultipleUsersTyping = false;
                namesDisplay = [names[0]];
            }

            var msg;
            if (areMultipleUsersTyping === true) {
                msg = __("%s and %s are typing")
                    .replace("%s", namesDisplay[0])
                    .replace("%s", namesDisplay[1]);
            }
            else {
                msg = __(l[8629]).replace("%1", namesDisplay[0]);
            }

            typingElement = <div className="typing-block">
                <div className="typing-text">{msg}</div>
                <div className="typing-bounce">
                    <div className="typing-bounce1"></div>
                    <div className="typing-bounce2"></div>
                    <div className="typing-bounce3"></div>
                </div>
            </div>;
        }
        else {
            // don't do anything.
        }

        var attachCloudDialog = null;
        if (self.state.attachCloudDialog === true) {
            var selected = [];
            attachCloudDialog = <ModalDialogsUI.CloudBrowserDialog
                folderSelectNotAllowed={true}
                onClose={() => {
                    self.setState({'attachCloudDialog': false});
                    selected = [];
                }}
                onSelected={(nodes) => {
                    selected = nodes;
                }}
                onAttachClicked={() => {
                    self.setState({'attachCloudDialog': false});

                    room.attachNodes(
                        selected
                    );
                }}
            />
        }

        var sendContactDialog = null;
        if (self.state.sendContactDialog === true) {
            var selected = [];
            sendContactDialog = <ModalDialogsUI.SelectContactDialog
                megaChat={room.megaChat}
                chatRoom={room}
                contacts={M.u}
                onClose={() => {
                    self.setState({'sendContactDialog': false});
                    selected = [];
                }}
                onSelected={(nodes) => {
                    selected = nodes;
                }}
                onSelectClicked={() => {
                    self.setState({'sendContactDialog': false});

                    room.attachContacts(selected);
                }}
            />
        }

        var additionalClass = "";
        if (
            additionalClass.length === 0 &&
            self.state.messagesToggledInCall &&
            room.callSession &&
            room.callSession.isActive()
        ) {
            additionalClass = " small-block";
        }

        return (
            <div className={conversationPanelClasses} onMouseMove={self.onMouseMove} data-room-jid={self.props.chatRoom.roomJid.split("@")[0]}>
                <div className="chat-content-block">
                    <ConversationRightArea
                        chatRoom={this.props.chatRoom}
                        contacts={self.props.contacts}
                        megaChat={this.props.chatRoom.megaChat}
                        onAttachFromComputerClicked={function() {
                            self.uploadFromComputer();
                        }}
                        onAttachFromCloudClicked={function() {
                            self.setState({'attachCloudDialog': true});
                        }}
                        onAddParticipantSelected={function(contact, e) {
                            if (self.props.chatRoom.type == "private") {
                                var megaChat = self.props.chatRoom.megaChat;

                                loadingDialog.show();

                                megaChat.trigger(
                                    'onNewGroupChatRequest',
                                    [
                                        self.props.chatRoom.getContactParticipantsExceptMe().concat(
                                            [contact.u]
                                        )
                                    ]
                                );
                            }
                            else {
                                self.props.chatRoom.trigger('onAddUserRequest', [contact.u]);
                            }
                        }}
                    />
                    <ConversationAudioVideoPanel
                        chatRoom={this.props.chatRoom}
                        contacts={self.props.contacts}
                        megaChat={this.props.chatRoom.megaChat}
                        onMessagesToggle={function(isActive) {
                            self.setState({
                                'messagesToggledInCall': isActive
                            });
                        }}
                    />

                    {attachCloudDialog}
                    {sendContactDialog}


                    <div className="dropdown body dropdown-arrow down-arrow tooltip not-sent-notification hidden">
                        <i className="dropdown-white-arrow"></i>
                        <div className="dropdown notification-text">
                            <i className="small-icon conversations"></i>
                            {__("Message not sent. Will retry later.")}
                        </div>
                    </div>

                    <div className="dropdown body dropdown-arrow down-arrow tooltip not-sent-notification-manual hidden">
                        <i className="dropdown-white-arrow"></i>
                        <div className="dropdown notification-text">
                            <i className="small-icon conversations"></i>
                            {__("Message not sent. Click here if you want to re-send it.")}
                        </div>
                    </div>

                    <div className="dropdown body dropdown-arrow down-arrow tooltip not-sent-notification-cancel hidden">
                        <i className="dropdown-white-arrow"></i>
                        <div className="dropdown notification-text">
                            <i className="small-icon conversations"></i>
                            {__("Message not sent. Click here if you want to cancel it.")}
                        </div>
                    </div>

                    <div className={"messages-block " + additionalClass}>
                        <div className="messages scroll-area">
                            <utils.JScrollPane options={{
                                                enableKeyboardNavigation:false,
                                                showArrows:true,
                                                arrowSize:5,
                                                animateDuration: 70,
                                                animateScroll: false,
                                                maintainPosition: false
                                            }}
                                               chatRoom={self.props.chatRoom}
                                               messagesToggledInCall={self.state.messagesToggledInCall}
                                >
                                <div className="messages main-pad">
                                    <div className="messages content-area">
                                        {messagesList}
                                    </div>
                                </div>
                            </utils.JScrollPane>
                        </div>

                        <div className="chat-textarea-block">
                            {typingElement}


                            <TypingAreaUI.TypingArea
                                chatRoom={self.props.chatRoom}
                                className="main-typing-area"
                                disabled={room.isReadOnly()}
                                onUpdate={() => {
                                    self.handleWindowResize();
                                }}
                                onConfirm={(messageContents) => {
                                    self.props.chatRoom.sendMessage(messageContents);
                                }}
                            >
                                    <ButtonsUI.Button
                                        className="popup-button"
                                        icon="small-icon grey-medium-plus"
                                        disabled={room.isReadOnly()}
                                        >
                                        <DropdownsUI.Dropdown
                                            className="wide-dropdown attach-to-chat-popup"
                                            vertOffset={10}
                                        >
                                            <DropdownsUI.DropdownItem
                                                icon="grey-cloud"
                                                label={__(l[8011])}
                                                onClick={(e) => {
                                                    self.setState({'attachCloudDialog': true});
                                            }} />
                                            <DropdownsUI.DropdownItem
                                                icon="grey-computer"
                                                label={__(l[8014])}
                                                onClick={(e) => {
                                                    self.uploadFromComputer();
                                            }} />
                                            <DropdownsUI.DropdownItem
                                                icon="square-profile"
                                                label={__(l[8628])}
                                                onClick={(e) => {
                                                    self.setState({'sendContactDialog': true});
                                            }} />
                                        </DropdownsUI.Dropdown>
                                    </ButtonsUI.Button>
                            </TypingAreaUI.TypingArea>

                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

var ConversationPanels = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    render: function() {
        var self = this;

        var conversations = [];

        if (window.location.hash === "#fm/chat") {
            // do we need to "activate" an conversation?
            var activeFound = false;
            self.props.conversations.forEach(function (chatRoom) {
                if (chatRoom.isCurrentlyActive) {
                    activeFound = true;
                }
            });
            if (self.props.conversations.length > 0 && !activeFound) {
                self.props.conversations[self.props.conversations.keys()[0]].setActive();
                self.props.conversations[self.props.conversations.keys()[0]].show();
            }
        }

        self.props.conversations.forEach(function(chatRoom) {
            if (chatRoom._leaving || chatRoom.stateIsLeftOrLeaving()) {
                return;
            }

            var otherParticipants = chatRoom.getParticipantsExceptMe();

            if (!otherParticipants || otherParticipants.length === 0) {
                return;
            }

            var contact = megaChat.getContactFromJid(otherParticipants[0]);

            // XX: Performance trick. However, scroll positions are NOT retained properly when switching conversations,
            // so this should be done some day in the future, after we have more stable product.
            // if (chatRoom.isCurrentlyActive) {
                conversations.push(
                    <ConversationPanel
                        chatRoom={chatRoom}
                        contacts={M.u}
                        contact={contact}
                        messagesBuff={chatRoom.messagesBuff}
                        key={chatRoom.roomJid}
                        chat={self.props.megaChat}
                        />
                );
            // }
        });

        if (conversations.length === 0) {
            var contactsList = [];
            var contactsListOffline = [];

            var hadLoaded = megaChat.plugins.chatdIntegration.mcfHasFinishedPromise.state() === 'resolved';

            if (hadLoaded) {
                self.props.contacts.forEach(function (contact) {
                    if (contact.u === u_handle) {
                        return;
                    }
                    
                    if(contact.c === 1) {
                        var pres = self.props.megaChat.xmppPresenceToCssClass(contact.presence);

                        (pres === "offline" ? contactsListOffline : contactsList).push(
                            <ContactsUI.ContactCard contact={contact} megaChat={self.props.megaChat} key={contact.u}/>
                        );
                    }
                });
            }
            var emptyMessage = hadLoaded ?
                l[8008] :
                l[7006];

            return (
                <div>
                    <div className="chat-right-area">
                        <div className="chat-right-area contacts-list-scroll">
                            <div className="chat-right-pad">
                                {contactsList}
                                {contactsListOffline}
                            </div>
                        </div>
                    </div>
                    <div className="empty-block">
                        <div className="empty-pad conversations">
                            <div className="empty-icon conversations"></div>
                            <div className="empty-title" dangerouslySetInnerHTML={{
                                __html: __(emptyMessage)
                                    .replace("[P]", "<span>")
                                    .replace("[/P]", "</span>")
                            }}></div>
                        </div>
                    </div>
                </div>
            );
        }
        else {
            return (
                <div className="conversation-panels">
                    {conversations}
                </div>
            );
        }
    }
});



module.exports = {
    ConversationPanel,
    ConversationPanels
};
