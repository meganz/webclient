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
var WhosTyping = require('./whosTyping.jsx').WhosTyping;
var getMessageString = require('./messages/utils.jsx').getMessageString;
var PerfectScrollbar = require('./../../ui/perfectScrollbar.jsx').PerfectScrollbar;
var ParticipantsList = require('./participantsList.jsx').ParticipantsList;

var GenericConversationMessage = require('./messages/generic.jsx').GenericConversationMessage;
var AlterParticipantsConversationMessage = 
    require('./messages/alterParticipants.jsx').AlterParticipantsConversationMessage;
var TruncatedMessage = require('./messages/truncated.jsx').TruncatedMessage;
var PrivilegeChange = require('./messages/privilegeChange.jsx').PrivilegeChange;




var ConversationRightArea = React.createClass({
    mixins: [MegaRenderMixin],
    getDefaultProps: function() {
        return {
            'requiresUpdateOnResize': true
        }
    },
    allContactsInChat: function(participants) {
        var self = this;
        if (participants.length === 0) {
            return false;
        }

        var currentContacts = self.props.contacts;
        var foundNonMembers = 0;
        currentContacts.forEach(function(u, k) {
            if (u.c === 1) {
                if (participants.indexOf(k) === -1) {
                    foundNonMembers++;
                }
            }
        });

        if (foundNonMembers > 0) {
            return false;
        }
        else {
            return true;
        }
    },
    render: function() {
        var self = this;
        var room = this.props.chatRoom;

        if (!room || !room.roomJid) {
            // destroyed
            return null;
        }
        var contactJid;
        var contact;
        var contacts = room.getParticipantsExceptMe();
        if (contacts && contacts.length > 0) {
            contactJid = contacts[0];
            contact = room.megaChat.getContactFromJid(contactJid);
        }
        else {
            contact = {};
        }



        // room is not active, don't waste DOM nodes, CPU and Memory (and save some avatar loading calls...)
        if (!room.isCurrentlyActive && !self._wasAppendedEvenOnce) {
            return null;
        }
        self._wasAppendedEvenOnce = true;

        var myPresence = room.megaChat.xmppPresenceToCssClass(M.u[u_handle].presence);

        var startAudioCallButton = 
                        <div className={"link-button" + (!contact.presence? " disabled" : "")} onClick={() => {
                            if (contact.presence && contact.presence !== "offline") {
                                room.startAudioCall();
                            }
                        }}>
            <i className="small-icon audio-call"></i>
            {__(l[5896])}
        </div>;

        var startVideoCallButton = 
                    <div className={"link-button" + (!contact.presence? " disabled" : "")} onClick={() => {
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
        var endCallButton =     
                    <div className={"link-button red" + (!contact.presence? " disabled" : "")} onClick={() => {
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



        var isReadOnlyElement = null;

        if (room.isReadOnly()) {
            // isReadOnlyElement = <span className="center">(read only chat)</span>;
        }
        var excludedParticipants = room.type === "group" ?
            (
                room.members && Object.keys(room.members).length > 0 ? Object.keys(room.members) :
                    room.getContactParticipants()
            )   :
            room.getContactParticipants();

        removeValue(excludedParticipants, u_handle, false);

        var dontShowTruncateButton = false;
        if (
            myPresence === 'offline' ||
            !room.iAmOperator() ||
            room.isReadOnly() ||
            room.messagesBuff.messages.length === 0 ||
            (
                room.messagesBuff.messages.length === 1 &&
                room.messagesBuff.messages.getItem(0).dialogType === "truncated"
            )
        ) {
            dontShowTruncateButton = true;
        }
        
        var membersHeader = null;
        
        if (room.type === "group") {
            membersHeader = <div className="chat-right-head">
                <div className="chat-grey-counter">
                    {Object.keys(room.members).length}
                </div>
                <div className="chat-right-head-txt">
                    {__(l[8876])}
                </div>
            </div>
        }

        // console.error(
        //     self.findDOMNode(),
        //     excludedParticipants,
        //         self.allContactsInChat(excludedParticipants),
        //         room.isReadOnly(),
        //         room.iAmOperator(),
        //     myPresence === 'offline'
        // );

        return <div className="chat-right-area left-border">
            <div className="chat-right-area conversation-details-scroll">
                <div className="chat-right-pad">

                    {isReadOnlyElement}
                    {membersHeader}
                    <ParticipantsList chatRoom={room} members={room.members}
                                      isCurrentlyActive={room.isCurrentlyActive} />

                    <div className="buttons-block">
                        {room.type !== "group" ? startAudioCallButton : null}
                        {room.type !== "group" ? startVideoCallButton : null}

                        <ButtonsUI.Button
                            className="link-button dropdown-element"
                            icon="rounded-grey-plus"
                            label={__(l[8007])}
                            contacts={this.props.contacts}
                            disabled={
                                /* Disable in case I don't have any more contacts to add ... */
                                !(
                                    !self.allContactsInChat(excludedParticipants) &&
                                    !room.isReadOnly() &&
                                    room.iAmOperator()
                                ) ||
                                myPresence === 'offline'
                            }
                            >
                            <DropdownsUI.DropdownContactsSelector
                                contacts={this.props.contacts}
                                megaChat={this.props.megaChat}
                                chatRoom={room}
                                exclude={
                                    excludedParticipants
                                }
                                multiple={true}
                                className="popup add-participant-selector"
                                singleSelectedButtonLabel={__(l[8869])}
                                multipleSelectedButtonLabel={__(l[8869])}
                                nothingSelectedButtonLabel={__(l[8870])}
                                onSelectDone={this.props.onAddParticipantSelected}
                                disabled={myPresence === 'offline'}
                                positionMy="center top"
                                positionAt="left bottom"
                                />
                        </ButtonsUI.Button>

                        <ButtonsUI.Button
                            className="link-button dropdown-element"
                            icon="rounded-grey-up-arrow"
                            label={__(l[6834] + "...")}
                            disabled={room.isReadOnly() || myPresence === 'offline'}
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

                        { !dontShowTruncateButton ? (
                            <div className="link-button red" onClick={() => {
                                if (self.props.onTruncateClicked) {
                                    self.props.onTruncateClicked();
                                }
                            }}>
                                <i className="small-icon rounded-stop"></i>
                                {__(l[8871])}
                            </div>
                        ) : null
                        }
                        { myPresence !== 'offline' && room.type === "group" && !room.stateIsLeftOrLeaving() ? (
                            <div className="link-button red" onClick={() => {
                                if (self.props.onLeaveClicked) {
                                    self.props.onLeaveClicked();
                                }
                            }}>
                                <i className="small-icon rounded-stop"></i>
                                {l[8633]}
                            </div>
                        ) : null
                        }
                        { room.type === "group" && room.stateIsLeftOrLeaving() ? (
                            <div className="link-button red" onClick={() => {
                                if (self.props.onCloseClicked) {
                                    self.props.onCloseClicked();
                                }
                            }}>
                                <i className="small-icon rounded-stop"></i>
                                {l[148]}
                            </div>
                        ) : null
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


        // Hidding Control panel if cursor is idle
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
            unreadDiv = <div className="unread-messages">{unreadCount > 9 ? "9+" : unreadCount}</div>
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
    lastScrollPositionPerc: 1,
    getInitialState: function() {
        return {
            startCallPopupIsActive: false,
            localVideoIsMinimized: false,
            isFullscreenModeEnabled: false,
            mouseOverDuringCall: false,
            attachCloudDialog: false,
            messagesToggledInCall: false,
            sendContactDialog: false,
            confirmDeleteDialog: false,
            messageToBeDeleted: null,
            editing: false
        };
    },

    uploadFromComputer: function() {
        $('#fileselect3').trigger('click')
    },
    refreshUI: function() {
        var self = this;
        var room = self.props.chatRoom;

        if (!self.props.chatRoom.isCurrentlyActive) {
            return;
        }

        room.renderContactTree();

        room.megaChat.refreshConversations();

        room.trigger('RefreshUI');
    },

    onMouseMove: SoonFc(function(e) {
        var self = this;
        var chatRoom = self.props.chatRoom;
        if (self.isMounted()) {
            chatRoom.trigger("onChatIsFocused");
        }
    }, 150),

    handleKeyDown: SoonFc(function(e) {
        var self = this;
        var chatRoom = self.props.chatRoom;
        if (self.isMounted() && chatRoom.isActive()) {
            chatRoom.trigger("onChatIsFocused");
        }
    }, 150),
    componentDidMount: function() {
        var self = this;
        window.addEventListener('resize', self.handleWindowResize);
        window.addEventListener('keydown', self.handleKeyDown);

        self.props.chatRoom.rebind('call-ended.jspHistory call-declined.jspHistory', function (e, eventData) {
            self.callJustEnded = true;
        });

        self.eventuallyInit();
    },
    eventuallyInit: function(doResize) {
        var self = this;

        // because..JSP would hijack some DOM elements, we need to wait with this...
        if (self.initialised) {
            return;
        }
        var $container = $(self.findDOMNode());

        if ($container.length > 0) {
            self.initialised = true;
        }

        self.$messages = $('.messages.scroll-area > .perfectScrollbarContainer', $container);


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

        if (doResize !== false) {
            self.handleWindowResize();
        }
    },
    componentWillMount: function() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = self.props.chatRoom.megaChat;

        $(chatRoom.messagesBuff).rebind('onHistoryFinished.cp', function() {
            self.eventuallyUpdate();
        });
    },
    componentWillUnmount: function() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = chatRoom.megaChat;

        window.removeEventListener('resize', self.handleWindowResize);
        window.removeEventListener('keydown', self.handleKeyDown);
        $(document).unbind("fullscreenchange.megaChat_" + chatRoom.roomJid);
    },
    componentDidUpdate: function(prevProps, prevState) {
        var self = this;
        var room = this.props.chatRoom;

        self.eventuallyInit(false);

        room.megaChat.updateSectionUnreadCount();

        var $node = $(self.findDOMNode());

        if (self.loadingShown) {
            $('.js-messages-loading', $node).removeClass('hidden');
        }
        else {
            $('.js-messages-loading', $node).addClass('hidden');
        }
        self.handleWindowResize();

        if (prevState.messagesToggledInCall !== self.state.messagesToggledInCall || self.callJustEnded) {
            if (self.callJustEnded) {
                self.callJustEnded = false;
            }
            self.$messages.trigger('forceResize', [
                true,
                1
            ]);
            Soon(function() {
                self.messagesListScrollable.scrollToBottom(true);
            });
        }
        
        if (prevProps.isActive === false && self.props.isActive === true) {
            var $typeArea = $('.messages-textarea:visible:first', $node);
            if ($typeArea.size() === 1) {
                $typeArea.focus();
                moveCursortoToEnd($typeArea[0]);
            }
        }
        
        if (prevState.editing === false && self.state.editing !== false) {
            if (self.messagesListScrollable) {
                self.messagesListScrollable.reinitialise(false);
                // wait for the reinit...
                Soon(function() {
                    if (self.editDomElement && self.editDomElement.size() === 1) {
                        self.messagesListScrollable.scrollToElement(self.editDomElement[0], false);
                    }
                });
            }
        }
    },
    handleWindowResize: function(e, scrollToBottom) {
        var $container = $(ReactDOM.findDOMNode(this));
        var self = this;

        self.eventuallyInit(false);

        if (!self.isMounted() || !self.$messages || !self.isComponentEventuallyVisible()) {
            return;
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
    },
    isActive: function() {
        return document.hasFocus() && this.$messages && this.$messages.is(":visible");
    },
    onMessagesScrollReinitialise: function(
                            ps,
                            $elem,
                            forced,
                            scrollPositionYPerc,
                            scrollToElement
                ) {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var mb = chatRoom.messagesBuff;

        // don't do anything if history is being retrieved at the moment.
        if (self.isRetrievingHistoryViaScrollPull || mb.isRetrievingHistory) {
            return;
        }

        if (forced) {
            if (!scrollPositionYPerc && !scrollToElement) {
                if (self.scrolledToBottom && !self.editDomElement) {
                    ps.scrollToBottom(true);
                    return true;
                }
            }
            else {
                // don't do anything if the UI was forced to scroll to a specific pos.
                return;
            }
        }

        if (self.isComponentEventuallyVisible()) {
            if (self.scrolledToBottom && !self.editDomElement) {
                ps.scrollToBottom(true);
                return true;
            }
            if (self.lastScrollPosition !== ps.getScrollPositionY() && !self.editDomElement) {
                ps.scrollToY(self.lastScrollPosition, true);
                return true;
            }

        }
    },
    onMessagesScrollUserScroll: function(
                        ps,
                        $elem,
                        e
    ) {
        var self = this;

        var scrollPositionY = ps.getScrollPositionY();
        var isAtTop = ps.isAtTop();
        var isAtBottom = ps.isAtBottom();


        // turn on/off auto scroll to bottom.
        if (isAtBottom === true) {
            self.scrolledToBottom = true;
        }
        else {
            self.scrolledToBottom = false;
        }
        if (isAtTop || ps.getScrollHeight() < 80) {
            var chatRoom = self.props.chatRoom;
            var mb = chatRoom.messagesBuff;
            if (mb.haveMoreHistory() && !self.isRetrievingHistoryViaScrollPull) {
                mb.retrieveChatHistory();
                self.isRetrievingHistoryViaScrollPull = true;
                self.lastScrollPosition = scrollPositionY;

                self.lastContentHeightBeforeHist = ps.getScrollHeight();
                $(mb).unbind('onHistoryFinished.pull');
                $(mb).one('onHistoryFinished.pull', function() {
                    setTimeout(function() {
                        // because of mousewheel animation, we would delay the re-enabling of the "pull to load
                        // history", so that it won't re-trigger another hist retrieval request
                        self.isRetrievingHistoryViaScrollPull = false;
                        self.justFinishedRetrievingHistory = false;

                        self.justFinishedRetrievingHistory = false;
                        var prevPosY = (
                                ps.getScrollHeight() - self.lastContentHeightBeforeHist
                            ) + self.lastScrollPosition;

                        delete self.lastContentHeightBeforeHist;

                        self.lastScrollPosition = prevPosY;

                        ps.scrollToY(
                            prevPosY,
                            true
                        );
                        self.forceUpdate();
                    }, 1000);
                })
            }
        }

        if (self.lastScrollPosition !== ps.getScrollPositionY()) {
            self.lastScrollPosition = ps.getScrollPositionY();
        }


    },
    specificShouldComponentUpdate: function() {
        if (
            (this.isRetrievingHistoryViaScrollPull && this.loadingShown) ||
            (this.props.chatRoom.messagesBuff.messagesHistoryIsLoading() && this.loadingShown) ||
            !this.props.chatRoom.isCurrentlyActive
        ) {
            return false;
        }
        else {
            return undefined;
        }
    },
    render: function() {
        var self = this;

        var room = this.props.chatRoom;
        if (!room || !room.roomJid) {
            return null;
        }
        // room is not active, don't waste DOM nodes, CPU and Memory (and save some avatar loading calls...)
        if (!room.isCurrentlyActive && !self._wasAppendedEvenOnce) {
            return null;
        }
        self._wasAppendedEvenOnce = true;

        var contacts = room.getParticipantsExceptMe();
        var contactJid;
        var contact;
        if (contacts && contacts.length > 0) {
            contactJid = contacts[0];
            contact = room.megaChat.getContactFromJid(contactJid);
        }

        var conversationPanelClasses = "conversation-panel";

        if (!room.isCurrentlyActive) {
            conversationPanelClasses += " hidden";
        }


        var avatarMeta = contact ? generateAvatarMeta(contact.u) : {};
        var contactName = avatarMeta.fullName;


        var messagesList = [
        ];

        if (
            (self.isRetrievingHistoryViaScrollPull && !self.loadingShown) ||
            self.props.chatRoom.messagesBuff.messagesHistoryIsLoading() === true ||
            self.props.chatRoom.messagesBuff.joined === false ||
            (
                self.props.chatRoom.messagesBuff.joined === true &&
                self.props.chatRoom.messagesBuff.haveMessages === true &&
                self.props.chatRoom.messagesBuff.messagesHistoryIsLoading() === true
            )
        ) {
            if (localStorage.megaChatPresence !== 'unavailable') {
                self.loadingShown = true;
            }
        }
        else if (
            self.props.chatRoom.messagesBuff.joined === true && (
                self.props.chatRoom.messagesBuff.messages.length === 0 ||
                !self.props.chatRoom.messagesBuff.haveMoreHistory()
            )
        ) {
            delete self.loadingShown;
            var headerText = (
                self.props.chatRoom.messagesBuff.messages.length === 0 ?
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
        else {
            delete self.loadingShown;
        }
        var lastTimeMarker;
        var lastMessageFrom = null;
        var lastGroupedMessageTimeStamp = null;
        var lastMessageState = null;
        var grouped = false;

        self.props.chatRoom.messagesBuff.messages.forEach(function(v, k) {
            if (/*v.deleted !== 1 && */!v.protocol && v.revoked !== true) {
                var shouldRender = true;
                if (v.isManagement && v.isManagement() === true && v.isRenderableManagement() === false) {
                    shouldRender = false;
                }

                var timestamp = v.delay;
                var curTimeMarker;
                var iso = (new Date(timestamp * 1000).toISOString());
                if (todayOrYesterday(iso)) {
                    // if in last 2 days, use the time2lastSeparator
                    curTimeMarker = time2lastSeparator(iso);
                }
                else {
                    // if not in the last 2 days, use 1st June [Year]
                    curTimeMarker = acc_time2date(timestamp, true);
                }
                var currentState = v.getState ? v.getState() : null;

                if (shouldRender === true && curTimeMarker && lastTimeMarker !== curTimeMarker) {
                    lastTimeMarker = curTimeMarker;
                    messagesList.push(
                        <div className="message date-divider" key={v.messageId + "_marker"}>{curTimeMarker}</div>
                    );

                    grouped = false;
                    lastMessageFrom = null;
                    lastGroupedMessageTimeStamp = null;
                    lastMessageState = false;
                }


                if (shouldRender === true) {
                    var userId = v.userId;
                    if (!userId && v.fromJid) {
                        var contact = room.megaChat.getContactFromJid(v.fromJid);
                        if (contact && contact.u) {
                            userId = contact.u;
                        }
                    }

                    if (
                        (v instanceof KarereEventObjects.OutgoingMessage || v instanceof Message) &&
                        (v.keyid !== 0)
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
                                lastMessageState = currentState;
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
                            key={v.messageId}
                            contact={M.u[v.userId]}
                            grouped={grouped}
                        />
                    }
                    else if (v.dialogType === 'truncated') {
                        messageInstance = <TruncatedMessage
                            message={v}
                            key={v.messageId}
                            contact={M.u[v.userId]}
                            grouped={grouped}
                        />
                    }
                    else if (v.dialogType === 'privilegeChange') {
                        messageInstance = <PrivilegeChange
                            message={v}
                            key={v.messageId}
                            contact={M.u[v.userId]}
                            grouped={grouped}
                        />
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
                            contact={contact}
                            grouped={grouped}
                            onUpdate={() => {
                                self.onResizeDoUpdate();
                            }}
                            onEditStarted={($domElement) => {
                                self.editDomElement = $domElement;
                                self.setState({'editing': v});
                                self.forceUpdate();
                            }}
                            onEditDone={(messageContents) => {
                                self.editDomElement = null;

                                var currentContents = v.textContents ? v.textContents : v.contents;
                                if (messageContents === false || messageContents === currentContents) {
                                    self.messagesListScrollable.scrollToBottom(true);
                                    self.lastScrollPositionPerc = 1;
                                }
                                else if (messageContents) {
                                    room.megaChat.plugins.chatdIntegration.updateMessage(
                                        room,
                                        v.internalId ? v.internalId : v.orderValue,
                                        messageContents
                                    );
                                    if (v.textContents) {
                                        v.textContents = messageContents;
                                    }
                                    if (v.contents) {
                                        v.contents = messageContents;
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


                                    $(v).trigger(
                                        'onChange',
                                        [
                                            v,
                                            "textContents",
                                            "",
                                            messageContents
                                        ]
                                    );

                                    self.messagesListScrollable.scrollToBottom(true);
                                    self.lastScrollPositionPerc = 1;
                                }
                                else if(messageContents.length === 0) {

                                    self.setState({
                                        'confirmDeleteDialog': true,
                                        'messageToBeDeleted': v
                                    });
                                }
                                
                                self.setState({'editing': false});
                            }}
                            onDeleteClicked={(e, msg) => {
                                self.setState({
                                    'confirmDeleteDialog': true,
                                    'messageToBeDeleted': msg
                                });
                                self.forceUpdate();
                            }}
                        />
                    );
                }
            }
        });

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
        
        var confirmDeleteDialog = null;
        if (self.state.confirmDeleteDialog === true) {
            confirmDeleteDialog = <ModalDialogsUI.ConfirmDialog
                megaChat={room.megaChat}
                chatRoom={room}
                title={__(l[8004])}
                name="delete-message"
                onClose={() => {
                    self.setState({'confirmDeleteDialog': false});
                }}
                onConfirmClicked={() => {
                    var msg = self.state.messageToBeDeleted;
                    if (!msg) {
                        return;
                    }
                    var chatdint = room.megaChat.plugins.chatdIntegration;
                    if (msg.getState() === Message.STATE.SENT || 
                        msg.getState() === Message.STATE.DELIVERED ||
                        msg.getState() === Message.STATE.NOT_SENT) {
                        chatdint.deleteMessage(room, msg.internalId ? msg.internalId : msg.orderValue);
                    }
                    else if (
                        msg.getState() === Message.STATE.NOT_SENT_EXPIRED
                    ) {
                        chatdint.discardMessage(room, msg.internalId ? msg.internalId : msg.orderValue);
                    }

                    msg.message = "";
                    msg.contents = "";
                    msg.messageHtml = "";
                    msg.deleted = true;

                    self.setState({
                        'confirmDeleteDialog': false,
                        'messageToBeDeleted': false
                    });
                }}
            >
                <div className="fm-dialog-content">

                    <div className="dialog secondary-header">
                        {__(l[8879])}
                    </div>

                    <GenericConversationMessage
                        className="dialog-wrapper"
                        message={self.state.messageToBeDeleted}
                        hideActionButtons={true}
                        initTextScrolling={true}
                    />
                </div>
            </ModalDialogsUI.ConfirmDialog>
        }

        var confirmTruncateDialog = null;
        if (self.state.truncateDialog === true) {
            confirmDeleteDialog = <ModalDialogsUI.ConfirmDialog
                megaChat={room.megaChat}
                chatRoom={room}
                title={__(l[8871])}
                name="truncate-conversation"
                onClose={() => {
                    self.setState({'truncateDialog': false});
                }}
                onConfirmClicked={() => {
                    var chatMessages = room.messagesBuff.messages;
                    if (chatMessages.length > 0) {
                        var lastChatMessageId = null;
                        var i = chatMessages.length - 1;
                        while(lastChatMessageId == null && i >= 0) {
                            var message = chatMessages.getItem(i);
                            if (message instanceof Message) {
                                lastChatMessageId = message.messageId;
                            }
                            i--;
                        }
                        if (lastChatMessageId) {
                            asyncApiReq({
                                a: 'mct',
                                id: room.chatId,
                                m: lastChatMessageId,
                                v: Chatd.VERSION
                            })
                                .fail(function(r) {
                                    if(r === -2) {
                                        msgDialog(
                                            'warninga',
                                            l[135],
                                            __(l[8880])
                                        );
                                    }
                                });
                        }
                    }

                    self.setState({
                        'truncateDialog': false
                    });
                }}
            >
                <div className="fm-dialog-content">

                    <div className="dialog secondary-header">
                        {__(l[8881])}
                    </div>
                </div>
            </ModalDialogsUI.ConfirmDialog>
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

        var myPresence = room.megaChat.xmppPresenceToCssClass(M.u[u_handle].presence);

        return (
            <div className={conversationPanelClasses} onMouseMove={self.onMouseMove} data-room-jid={self.props.chatRoom.roomJid.split("@")[0]}>
                <div className="chat-content-block">
                    <ConversationRightArea
                        chatRoom={this.props.chatRoom}
                        contacts={self.props.contacts}
                        megaChat={this.props.chatRoom.megaChat}
                        messagesBuff={room.messagesBuff}
                        onAttachFromComputerClicked={function() {
                            self.uploadFromComputer();
                        }}
                        onTruncateClicked={function() {
                            self.setState({'truncateDialog': true});
                        }}
                        onLeaveClicked={function() {
                            room.leave(true);
                        }}
                        onCloseClicked={function() {
                            room.destroy();
                        }}
                        onAttachFromCloudClicked={function() {
                            self.setState({'attachCloudDialog': true});
                        }}
                        onAddParticipantSelected={function(contactHashes) {
                            if (self.props.chatRoom.type == "private") {
                                var megaChat = self.props.chatRoom.megaChat;

                                loadingDialog.show();

                                megaChat.trigger(
                                    'onNewGroupChatRequest',
                                    [
                                        self.props.chatRoom.getContactParticipantsExceptMe().concat(
                                            contactHashes
                                        )
                                    ]
                                );
                            }
                            else {
                                self.props.chatRoom.trigger('onAddUserRequest', [contactHashes]);
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
                    {confirmDeleteDialog}
                    {confirmTruncateDialog}


                    <div className="dropdown body dropdown-arrow down-arrow tooltip not-sent-notification hidden">
                        <i className="dropdown-white-arrow"></i>
                        <div className="dropdown notification-text">
                            <i className="small-icon conversations"></i>
                            {__(l[8882])}
                        </div>
                    </div>

                    <div className=
                            "dropdown body dropdown-arrow down-arrow tooltip not-sent-notification-manual hidden">
                        <i className="dropdown-white-arrow"></i>
                        <div className="dropdown notification-text">
                            <i className="small-icon conversations"></i>
                            {__(l[8883])}
                        </div>
                    </div>

                    <div className=
                            "dropdown body dropdown-arrow down-arrow tooltip not-sent-notification-cancel hidden">
                        <i className="dropdown-white-arrow"></i>
                        <div className="dropdown notification-text">
                            <i className="small-icon conversations"></i>
                            {__(l[8884])}
                        </div>
                    </div>

                    <div className={"messages-block " + additionalClass}>
                        <div className="messages scroll-area">
                            <PerfectScrollbar
                                   onFirstInit={(ps, node) => {
                                        ps.scrollToBottom(true);
                                        self.scrolledToBottom = 1;
                                    }}
                                   onReinitialise={self.onMessagesScrollReinitialise}
                                   onUserScroll={self.onMessagesScrollUserScroll}
                                   className="js-messages-scroll-area perfectScrollbarContainer"
                                   messagesToggledInCall={self.state.messagesToggledInCall}
                                   ref={(ref) => self.messagesListScrollable = ref}
                                   chatRoom={self.props.chatRoom}
                                   messagesBuff={self.props.chatRoom.messagesBuff}
                                   editDomElement={self.state.editDomElement}
                                   confirmDeleteDialog={self.state.confirmDeleteDialog}
                                >
                                <div className="messages main-pad">
                                    <div className="messages content-area">
                                        <div className="loading-spinner js-messages-loading light manual-management"
                                         key="loadingSpinner" style={{top: "50%"}}>
                                            <div className="main-loader" style={{
                                                'position': 'fixed',
                                                'top': '50%',
                                                'left': '50%'
                                            }}></div>
                                        </div>
                                        {messagesList}
                                    </div>
                                </div>
                            </PerfectScrollbar>
                        </div>

                        <div className="chat-textarea-block">
                            <WhosTyping chatRoom={room} />

                            <TypingAreaUI.TypingArea
                                chatRoom={self.props.chatRoom}
                                className="main-typing-area"
                                disabled={room.isReadOnly()}
                                onUpEditPressed={() => {
                                    var foundMessage = false;
                                    room.messagesBuff.messages.keys().reverse().forEach(function(k) {
                                        if(!foundMessage) {
                                            var message = room.messagesBuff.messages[k];

                                            var contact;
                                            if (message.authorContact) {
                                                contact = message.authorContact;
                                            }
                                            else if (message.meta && message.meta.userId) {
                                                contact = M.u[message.meta.userId];
                                                if (!contact) {
                                                    return false;
                                                }
                                            }
                                            else if (message.userId) {
                                                if (!M.u[message.userId]) {
                                                    // data is still loading!
                                                    return false;
                                                }
                                                contact = M.u[message.userId];
                                            }
                                            else if (message.getFromJid) {
                                                contact = megaChat.getContactFromJid(message.getFromJid());
                                            }
                                            else {
                                                // contact not found
                                                return false;
                                            }

                                            if (
                                                    contact && contact.u === u_handle &&
                                                    (unixtime() - message.delay) < MESSAGE_NOT_EDITABLE_TIMEOUT &&
                                                    !message.requiresManualRetry &&
                                                    !message.deleted &&
                                                    (!message.type ||
                                                         message instanceof KarereEventObjects.OutgoingMessage) &&
                                                    (!message.isManagement || !message.isManagement())
                                                ) {
                                                    foundMessage = message;
                                            }
                                        }
                                    });

                                    if (!foundMessage) {
                                        return false;
                                    }
                                    else {
                                        $('.message.body.' + foundMessage.messageId).trigger('onEditRequest');
                                        self.lastScrolledToBottom = false;
                                        return true;
                                    }
                                }}
                                onResized={() => {
                                    self.handleWindowResize();
                                    $('.js-messages-scroll-area', self.findDOMNode()).trigger('forceResize', [true]);
                                }}
                                onConfirm={(messageContents) => {
                                    if (messageContents && messageContents.length > 0) {
                                        self.props.chatRoom.sendMessage(messageContents);
                                    }
                                }}
                            >
                                    <ButtonsUI.Button
                                        className="popup-button"
                                        icon="small-icon grey-medium-plus"
                                        disabled={room.isReadOnly() || myPresence === 'offline'}
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
            var otherParticipants = chatRoom.getParticipantsExceptMe();

            var contact;
            if (otherParticipants && otherParticipants.length > 0) {
                contact = megaChat.getContactFromJid(otherParticipants[0]);
            }

            // XX: Performance trick. However, scroll positions are NOT retained properly when switching conversations,
            // so this should be done some day in the future, after we have more stable product.
            // if (chatRoom.isCurrentlyActive) {
                conversations.push(
                    <ConversationPanel
                        chatRoom={chatRoom}
                        isActive={chatRoom.isCurrentlyActive}
                        messagesBuff={chatRoom.messagesBuff}
                        contacts={M.u}
                        contact={contact}
                        key={chatRoom.roomJid}
                        />
                );
            // }
        });

        if (conversations.length === 0) {
            var contactsList = [];
            var contactsListOffline = [];

            var hadLoaded = ChatdIntegration.mcfHasFinishedPromise.state() === 'resolved';

            if (hadLoaded) {
                self.props.contacts.forEach(function (contact) {
                    if (contact.u === u_handle) {
                        return;
                    }
                    
                    if(contact.c === 1) {
                        var pres = self.props.megaChat.xmppPresenceToCssClass(contact.presence);

                        (pres === "offline" ? contactsListOffline : contactsList).push(
                            <ContactsUI.ContactCard contact={contact} megaChat={self.props.megaChat}
                                                    key={contact.u}/>
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
