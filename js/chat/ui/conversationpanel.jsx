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
var TruncatedMessage = require('./messages/truncated.jsx').TruncatedMessage;




var ConversationRightArea = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    componentDidUpdate: function() {
        var self = this;
        if (!self.isMounted()) {
            return;
        }

        var $node = $(self.findDOMNode());


        var fitHeight = $('.chat-contacts-list .jspPane', $node).height();

        if (fitHeight === 0) {
            return;
        }

        var maxHeight = $('.chat-right-pad', $node).innerHeight() - $('.buttons-block', $node).innerHeight();

        if (maxHeight < fitHeight) {
            fitHeight = Math.max(maxHeight, 48);
        }

        $('.chat-contacts-list', $node).height(
            fitHeight
        );

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
        if (!room.isCurrentlyActive) {
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

                var dropdownIconClasses = "small-icon tiny-icon grey-down-arrow";

                if (room.type === "group" && room.members) {
                    var removeParticipantButton = <DropdownsUI.DropdownItem
                        key="remove" icon="rounded-stop" label={__(l[8867])} onClick={() => {
                                    $(room).trigger('onRemoveUserRequest', [contactHash]);
                                }}/>;


                    if (room.iAmOperator()) {
                        // operator


                        dropdowns.push(
                            <div key="setPermLabel" className="dropdown-items-info">
                                {__(l[8868])}
                            </div>
                        );

                        dropdowns.push(
                            <DropdownsUI.DropdownItem
                                key="privOperator" icon="cogwheel-icon"
                                label={__(l[8875])}
                                className={"tick-item " + (room.members[contactHash] === 3 ? "active" : "")}
                                onClick={() => {
                                    if (room.members[contactHash] !== 3) {
                                        $(room).trigger('alterUserPrivilege', [contactHash, 3]);
                                    }
                                }}/>
                        );

                        dropdowns.push(
                            <DropdownsUI.DropdownItem
                                key="privFullAcc" icon="conversation-icon"
                                className={"tick-item " + (room.members[contactHash] === 2 ? "active" : "")}
                                label={__(l[8874])} onClick={() => {
                                    if (room.members[contactHash] !== 2) {
                                        $(room).trigger('alterUserPrivilege', [contactHash, 2]);
                                    }
                                }}/>
                        );

                        dropdowns.push(
                            <DropdownsUI.DropdownItem
                                key="privReadOnly" icon="eye-icon"
                                className={"tick-item " + (room.members[contactHash] === 0 ? "active" : "")}
                                label={__(l[8873])} onClick={() => {
                                    if (room.members[contactHash] !== 0) {
                                        $(room).trigger('alterUserPrivilege', [contactHash, 0]);
                                    }
                                }}/>
                        );

                    }
                    else if (room.members[u_handle] === 2) {
                        // full access

                    }
                    else if (room.members[u_handle] === 1) {
                        // read write
                        // should not happen.

                    }
                    else if (room.isReadOnly()) {
                        // read only
                    }
                    else {
                        // should not happen.
                    }



                    // other user privilege
                    if (room.members[contactHash] === 3) {
                        dropdownIconClasses = "small-icon cogwheel-icon";
                    }
                    else if (room.members[contactHash] === 2) {
                        dropdownIconClasses = "small-icon conversation-icon";
                    } else if (room.members[contactHash] === 0) {
                        dropdownIconClasses = "small-icon eye-icon";
                    }
                    else {
                        // should not happen.
                    }
                    dropdowns.push(
                        removeParticipantButton
                    );
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
                        dropdownDisabled={!room.iAmOperator()}
                        dropdownButtonClasses={room.type == "group" ? "button icon-dropdown" : "default-white-button tiny-button"}
                        dropdownIconClasses={dropdownIconClasses}
                    />
                );
            }
        });

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

        var dontShowTruncateButton = false;
        if (
            !room.iAmOperator() ||
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

        return <div className="chat-right-area">
            <div className="chat-right-area conversation-details-scroll">
                <div className="chat-right-pad">

                    {isReadOnlyElement}
                    {membersHeader}
                    <div className="chat-contacts-list">
                        <utils.JScrollPane chatRoom={room}>
                            <div className="chat-contacts-list-inner">
                                {contactsList}
                            </div>
                        </utils.JScrollPane>
                    </div>

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
                                multiple={true}
                                className="popup add-participant-selector"
                                singleSelectedButtonLabel={__(l[8869])}
                                multipleSelectedButtonLabel={__(l[8869])}
                                nothingSelectedButtonLabel={__(l[8870])}
                                onSelectDone={this.props.onAddParticipantSelected}
                                positionMy="center top"
                                positionAt="left bottom"
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
                        { room.type === "group" && !room.stateIsLeftOrLeaving() ? (
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
            currentlyTyping: [],
            attachCloudDialog: false,
            messagesToggledInCall: false,
            sendContactDialog: false,
            confirmDeleteDialog: false,
            messageToBeDeleted: null
        };
    },

    uploadFromComputer: function() {
        $('#fileselect3').trigger('click')
    },
    refreshUI: function(scrollToBottom) {
        var self = this;
        var room = self.props.chatRoom;

        if (!self.props.chatRoom.isCurrentlyActive) {
            return;
        }

        var $jsp = self.$messages.data("jsp");
        if ($jsp) {
            var perc = $jsp.getPercentScrolledY();
            self.$messages.trigger('forceResize', [
                true,
                scrollToBottom ? (
                    self.lastScrollPositionPerc ? self.lastScrollPositionPerc : -1
                )
                :
                perc
            ]);
            if (scrollToBottom) {
                self.lastScrollPositionPerc = 1;
            }
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
                    self.forceUpdate();
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
            self.lastScrollPositionPerc = $jsp.getPercentScrolledY();
        });

        self.$messages.rebind('jsp-initialised.conversationsPanel' + self.props.chatRoom.roomJid, function(e) {
            var $jsp = self.$messages.data("jsp");

            if (self.lastScrolledToBottom === true) {
                $jsp.scrollToBottom();
                self.lastScrollPositionPerc = 1;
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

        $(chatRoom.messagesBuff).rebind('onHistoryFinished.cp', function() {
            self.eventuallyUpdate();
        });

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

        if (!self.props.chatRoom.isCurrentlyActive || !self.isMounted() || !self.$messages) {
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
        if (!room || !room.roomJid) {
            return null;
        }
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
            self.props.messagesBuff.messagesHistoryIsLoading() === true ||
            self.props.messagesBuff.joined === false ||
            (
                self.props.messagesBuff.joined === true &&
                self.props.messagesBuff.haveMessages === true &&
                self.props.messagesBuff.messagesHistoryIsLoading() === true
            )
        ) {
            var loadingStyles = {
                top: self.$messages ? (self.$messages.outerHeight() / 2) : "50%"
            };
            messagesList.push(
                <div className="loading-spinner light active manual-management" key="loadingSpinner" style={loadingStyles}><div className="main-loader"></div></div>
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
        var lastMessageState = null;
        var grouped = false;

        self.props.messagesBuff.messages.forEach(function(v, k) {
            if (/*v.deleted !== 1 && */!v.protocol && v.revoked !== true) {
                var shouldRender = true;
                if (v.isManagement && v.isManagement() === true && v.isRenderableManagement() === false) {
                    shouldRender = false;
                }

                var timestamp = v.delay;
                var curTimeMarker = time2lastSeparator((new Date(timestamp * 1000).toISOString()));
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
                            chatRoom={room}
                            key={v.messageId}
                            contact={M.u[v.userId]}
                            grouped={grouped}
                        />
                    }
                    else if (v.dialogType === 'truncated') {
                        messageInstance = <TruncatedMessage
                            message={v}
                            chatRoom={room}
                            key={v.messageId}
                            contact={M.u[v.userId]}
                            grouped={grouped}
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
                            onUpdate={() => {
                                self.onResizeDoUpdate();
                            }}
                            onEditStarted={($domElement) => {
                                var $jsp = self.$messages.data('jsp');
                                setTimeout(function() {
                                    $jsp.scrollToElement($domElement);
                                }, 90);
                            }}
                            onEditDone={(messageContents) => {
                                var currentContents = v.textContents ? v.textContents : v.contents;
                                if (messageContents === false || messageContents === currentContents) {
                                    var $jsp = self.$messages.data('jsp');
                                    $jsp.scrollToBottom();
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

                                    var $jsp = self.$messages.data('jsp');
                                    $jsp.scrollToBottom();
                                    self.lastScrollPositionPerc = 1;
                                }
                                else if(messageContents.length === 0) {

                                    self.setState({
                                        'confirmDeleteDialog': true,
                                        'messageToBeDeleted': v
                                    });
                                }
                            }}
                            onDeleteClicked={(e, msg) => {
                                self.setState({
                                    'confirmDeleteDialog': true,
                                    'messageToBeDeleted': msg
                                });
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
                msg = __(l[8872])
                    .replace("%1", namesDisplay[0])
                    .replace("%2", namesDisplay[1]);
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
                    if (msg.getState() === Message.STATE.SENT || msg.getState() === Message.STATE.DELIVERED || msg.getState() === Message.STATE.NOT_SENT) {
                        room.megaChat.plugins.chatdIntegration.deleteMessage(room, msg.internalId ? msg.internalId : msg.orderValue);
                    }
                    else if (
                        msg.getState() === Message.STATE.NOT_SENT_EXPIRED
                    ) {
                        room.megaChat.plugins.chatdIntegration.discardMessage(room, msg.internalId ? msg.internalId : msg.orderValue);                    
                    }

                    msg.message = "";
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
                        chatRoom={room}
                        hideActionButtons={true}
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
                                m: lastChatMessageId
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
                        onTruncateClicked={function() {
                            self.setState({'truncateDialog': true});
                        }}
                        onLeaveClicked={function() {
                            room.members[u_handle] = 0;
                            room.trackDataChange();
                            $(room).trigger('onLeaveChatRequested');
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

                    <div className="dropdown body dropdown-arrow down-arrow tooltip not-sent-notification-manual hidden">
                        <i className="dropdown-white-arrow"></i>
                        <div className="dropdown notification-text">
                            <i className="small-icon conversations"></i>
                            {__(l[8883])}
                        </div>
                    </div>

                    <div className="dropdown body dropdown-arrow down-arrow tooltip not-sent-notification-cancel hidden">
                        <i className="dropdown-white-arrow"></i>
                        <div className="dropdown notification-text">
                            <i className="small-icon conversations"></i>
                            {__(l[8884])}
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
                                                    !message.type &&
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
                                onUpdate={() => {
                                    self.handleWindowResize();
                                    $('.jScrollPaneContainer', self.findDOMNode()).trigger('forceResize');
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
