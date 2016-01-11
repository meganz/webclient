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


/**
 * The most dummies lazy load ever... but no need for something more complicated, until we get the new __(...)
 */
var getMessageString;
(function() {
    var MESSAGE_STRINGS;
    getMessageString = function(type) {
        if (!MESSAGE_STRINGS) {
            MESSAGE_STRINGS = {
                'outgoing-call': l[5891],
                'incoming-call': l[5893],
                'call-timeout': l[5890],
                'call-starting': l[7206],
                'call-feedback': "To help us improve our service, it would be great if you want to rate how was your call with [X]? ",
                'call-initialising': l[7207],
                'call-ended': [l[5889], l[7208]],
                'call-failed-media': l[7204],
                'call-failed': [l[7209], l[7208]],
                'call-handled-elsewhere': l[5895],
                'call-missed': l[7210],
                'call-rejected': l[5892],
                'call-canceled': l[5894],
                'call-started': l[5888]
            };
        }
        return MESSAGE_STRINGS[type];
    }
})();

var ConversationMessage = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    onAfterRenderWasTriggered: false,
    componentWillMount: function() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = chatRoom.megaChat;
        megaChat.chats.addChangeListener(function() {
            if (self.isMounted()) {
                self.forceUpdate();
            }
        });
    },
    componentDidUpdate: function() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = chatRoom.megaChat;

        if (!self.onAfterRenderWasTriggered) {
            var msg = self.props.message;
            var shouldRender = true;
            if (msg.isManagement && msg.isManagement() === true && msg.isRenderableManagement() === false) {
                shouldRender = false;
            }

            if (shouldRender) {
                chatRoom.trigger("onAfterRenderMessage", self.props.message);
                self.onAfterRenderWasTriggered = true;
            }
        }
    },
    doDelete: function(e, msg) {
        e.preventDefault(e);
        e.stopPropagation(e);
        var chatRoom = this.props.chatRoom;
        msg.message = "";
        msg.deleted = true;
        chatRoom.messagesBuff.messages.removeByKey(msg.messageId);
    },
    doRetry: function(e, msg) {
        e.preventDefault(e);
        e.stopPropagation(e);
        var chatRoom = this.props.chatRoom;

        chatRoom._sendMessageToTransport(msg)
            .done(function(internalId) {
                msg.internalId = internalId;
            });
    },
    render: function () {
        var self = this;
        var cssClasses = "message body";

        var message = this.props.message;
        var megaChat = this.props.chatRoom.megaChat;
        var chatRoom = this.props.chatRoom;
        var contact;
        var timestamp;
        var timestampInt;
        var textMessage;

        if (message.authorContact) {
            contact = message.authorContact;
        }
        else if (message.userId) {
            if (!M.u[message.userId]) {
                // data is still loading!
                return null;
            }
            contact = M.u[message.userId];
        }
        else if (message.getFromJid) {
            contact = megaChat.getContactFromJid(message.getFromJid());
        }
        else {
            console.error("No idea how to render this: ", this.props);
        }

        if (message.getDelay) {
            timestampInt = message.getDelay()
        }
        else if (message.delay) {
            timestampInt = message.delay;
        }
        else {
            timestampInt = unixtime();
        }

        var additionalClasses = "";
        var buttonsBlock = null;
        var spinnerElement = null;

        timestamp = unixtimeToTimeString(timestampInt);
        var messageIsNowBeingSent = false;

        // if this is a text msg.
        if (
            (message instanceof KarereEventObjects.IncomingMessage) ||
            (message instanceof KarereEventObjects.OutgoingMessage) ||
            (message instanceof KarereEventObjects.IncomingPrivateMessage) ||
            (message instanceof Message)

        ) {
            // Convert ot HTML and pass it to plugins to do their magic on styling the message if needed.
            if (message.messageHtml) {
                message.messageHtml = message.messageHtml;
            }
            else {
                message.messageHtml = htmlentities(
                    message.getContents ? message.getContents() : message.textContents
                ).replace(/\n/gi, "<br/>");
            }

            var event = new $.Event("onBeforeRenderMessage");
            megaChat.trigger(event, {
                message: message,
                room: chatRoom
            });

            if (event.isPropagationStopped()) {
                self.logger.warn("Event propagation stopped receiving (rendering) of message: ", message);
                return false;
            }
            textMessage = message.messageHtml;


            if (
                (message instanceof Message) ||
                (message instanceof KarereEventObjects.OutgoingMessage) ||
                (typeof(message.userId) !== 'undefined' && message.userId === u_handle)
            ) {
                if (
                    message.getState() === Message.STATE.NULL
                ) {
                    additionalClasses += " error";
                }
                else if (
                    message.getState() === Message.STATE.NOT_SENT
                ) {
                    messageIsNowBeingSent = (unixtime() - message.delay < 5);


                    if (!messageIsNowBeingSent) {
                        message.sending = false;
                        additionalClasses += " not-sent";

                        buttonsBlock = <div className="buttons-block">
                            <div className="message circuit-label left">{__("Message not sent")}</div>
                            <div className="default-white-button right" onClick={(e) => {
                                self.doRetry(e, message);
                            }}>{__("Retry")}</div>
                            <div className="default-white-button right red" onClick={(e) => {
                                self.doDelete(e, message);
                            }}>{__("Delete message")}</div>
                            <div className="clear"></div>
                        </div>;
                    }
                    else {
                        additionalClasses += " sending";
                        spinnerElement = <div className="small-blue-spinner"></div>;

                        if (!message.sending) {
                            message.sending = true;
                            if (self._rerenderTimer) {
                                clearTimeout(self._rerenderTimer);
                            }
                            self._rerenderTimer = setTimeout(function () {
                                if (message.sending === true) {
                                    chatRoom.messagesBuff.trackDataChange();
                                    if (self.isMounted()) {
                                        self.forceUpdate();
                                    }
                                }
                            }, (5 - (unixtime() - message.delay)) * 1000);
                        }
                    }
                }
                else if (message.getState() === Message.STATE.SENT) {
                    additionalClasses += " sent";
                }
                else if (message.getState() === Message.STATE.DELIVERED) {
                    additionalClasses += " delivered";
                }
                else if (message.getState() === Message.STATE.NOT_SEEN) {
                    additionalClasses += " unread";
                }
                else if (message.getState() === Message.STATE.SEEN) {
                    additionalClasses += " seen";
                }
                else if (message.getState() === Message.STATE.DELETED) {
                    additionalClasses += " deleted";
                }
                else {
                    additionalClasses += " not-sent";
                }
            }

            var displayName = contact.u === u_handle ? __("Me") : generateAvatarMeta(contact.u).fullName;

            var textContents = message.getContents ? message.getContents() : message.textContents;

            if (textContents.substr && textContents.substr(0, 1) === Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT) {
                if (textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT) {
                    textContents = textContents.substr(2, textContents.length);

                    try {
                        var attachmentMeta = JSON.parse(textContents);
                    } catch(e) {
                        return null;
                    }

                    var files = [];

                    attachmentMeta.forEach(function(v) {
                        var startDownload = function() {
                            M.addDownload([v]);
                        };

                        // cache ALL current attachments, so that we can revoke them later on in an ordered way.
                        if (message.messageId) {
                            if (!chatRoom._attachmentsMap) {
                                chatRoom._attachmentsMap = {};
                            }
                            if (!chatRoom._attachmentsMap[v.h]) {
                                chatRoom._attachmentsMap[v.h] = {};
                            }
                            chatRoom._attachmentsMap[v.h][message.messageId] = false;
                        }
                        var addToCloudDrive = function() {
                            M.injectNodes(v, M.RootID, false, function(res) {
                                if (res === 0) {
                                    msgDialog(
                                        'info',
                                        __("Add to Cloud Drive"),
                                        __("Attachment added to your Cloud Drive.")
                                    );
                                }
                            });
                        };

                        var dropdown = null;
                        if (!message.revoked) {
                            if (contact.u === u_handle) {
                                dropdown = <ButtonsUI.Button
                                    className="default-white-button tiny-button"
                                    icon="tiny-icon grey-down-arrow">
                                    <DropdownsUI.Dropdown
                                        className="white-context-menu attachments-dropdown"
                                        noArrow={true}
                                        positionMy="left bottom"
                                        positionAt="right bottom"
                                        horizOffset={4}
                                        >
                                        <DropdownsUI.DropdownItem icon="rounded-grey-down-arrow" label={__(l[1187])}
                                                                  onClick={startDownload}/>
                                        <DropdownsUI.DropdownItem icon="grey-cloud" label={__("Add to Cloud Drive")}
                                                                  onClick={addToCloudDrive}/>

                                        <hr />

                                        <DropdownsUI.DropdownItem icon="red-cross" label={__("Revoke")} className="red"
                                                                  onClick={() => {
                                                chatRoom.revokeAttachment(v);
                                            }}/>
                                    </DropdownsUI.Dropdown>
                                </ButtonsUI.Button>;
                            }
                            else {
                                dropdown = <ButtonsUI.Button
                                        className="default-white-button tiny-button"
                                        icon="tiny-icon grey-down-arrow">
                                        <DropdownsUI.Dropdown
                                            className="attachments-dropdown"
                                        >
                                        <DropdownsUI.DropdownItem icon="rounded-grey-down-arrow" label={__(l[1187])}
                                                                  onClick={startDownload}/>
                                        <DropdownsUI.DropdownItem icon="grey-cloud" label={__("Add to Cloud Drive")}
                                                                  onClick={addToCloudDrive}/>
                                    </DropdownsUI.Dropdown>
                                </ButtonsUI.Button>;
                            }
                        }
                        else {
                            dropdown = <ButtonsUI.Button
                                className="default-white-button tiny-button disabled"
                                icon="tiny-icon grey-down-arrow" />;
                        }

                        files.push(
                            <div className="message shared-data" key={v.h}>
                                <div className="message shared-info">
                                    <div className="message data-title">
                                        {v.name}
                                    </div>
                                    <div className="message file-size">
                                        {bytesToSize(v.s)}
                                    </div>
                                </div>

                                <div className="data-block-view medium">
                                    {dropdown}

                                    <div className="data-block-bg">
                                        <div className={"block-view-file-type " + fileIcon(v)}></div>
                                    </div>
                                </div>
                                <div className="clear"></div>

                            </div>
                        );
                    });


                    var avatar = null;
                    var datetime = null;
                    var name = null;
                    if (this.props.grouped) {
                        additionalClasses += " grouped";
                    }
                    else {
                        avatar = <ContactsUI.Avatar contact={contact} className="message small-rounded-avatar"/>;
                        datetime = <div className="message date-time"
                                            title={time2date(timestampInt)}>{timestamp}</div>;
                        name = <div className="message user-card-name">{displayName}</div>;
                    }

                    return <div className={message.messageId + " message body" + additionalClasses}>
                        {avatar}
                        <div className="message content-area">
                            {name}
                            {datetime}

                            <div className="message shared-block">
                                {files}
                            </div>
                            {buttonsBlock}
                            {spinnerElement}
                        </div>
                    </div>;
                }
                else if (textContents.substr && textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT) {
                    if (!chatRoom._attachmentsMap) {
                        chatRoom._attachmentsMap = {};
                    }
                    var foundRevokedNode = null;

                    var revokedNode = textContents.substr(2, textContents.length);

                    if (chatRoom._attachmentsMap[revokedNode]) {
                        Object.keys(chatRoom._attachmentsMap[revokedNode]).forEach(function(messageId) {
                            var attachedMsg = chatRoom.messagesBuff.messages[messageId];

                            if (!attachedMsg) {
                                return;
                            }

                            if (attachedMsg.orderValue < message.orderValue) {
                                try {
                                    var attachments = JSON.parse(attachedMsg.textContents.substr(2, attachedMsg.textContents.length));
                                    attachments.forEach(function(node) {
                                        if (node.h === revokedNode) {
                                            foundRevokedNode = node;
                                        }
                                    })
                                } catch(e) {
                                }
                                attachedMsg.revoked = true;
                                attachedMsg.seen = true;
                            }
                        });
                    }

                    // don't show anything if this is a 'revoke' message
                    return null;
                }
                else {
                    chatRoom.logger.error("Invalid 2nd byte for a management message: ", textContents);
                    return null;
                }
            }
            else {
                var messageActionButtons = null;

                if (message.getState() !== Message.STATE.NOT_SENT) {
                    messageActionButtons = null;
                    /*<ButtonsUI.Button
                        className="default-white-button tiny-button"
                        icon="tiny-icon grey-down-arrow">
                        <DropdownsUI.Dropdown
                            className="white-context-menu message-dropdown"
                            positionMy="right top"
                            positionAt="right bottom"
                            vertOffset={4}
                            noArrow={true}
                        >
                            <DropdownsUI.DropdownItem icon="writing-pen" label={__(l[1342])} onClick={() => {
                                        console.error("TBD!");
                                    }}/>
                            <DropdownsUI.DropdownItem icon="quotes" label="Quote" onClick={() => {
                                        console.error("TBD!");
                                    }}/>

                            <hr />

                            <DropdownsUI.DropdownItem icon="red-cross" label={__(l[1730])} className="red" onClick={(e) => {
                                        self.doDelete(e, message);
                                    }}/>
                        </DropdownsUI.Dropdown>
                    </ButtonsUI.Button> */
                }

                var avatar = null;
                var datetime = null;
                var name = null;
                if (this.props.grouped) {
                    additionalClasses += " grouped";
                }
                else {
                    avatar = <ContactsUI.Avatar contact={contact} className="message small-rounded-avatar"/>;
                    datetime = <div className="message date-time"
                                    title={time2date(timestampInt)}>{timestamp}</div>;
                    name = <div className="message user-card-name">{displayName}</div>;
                }


                var messageDisplayBlock;
                if (self.props.isBeingEdited === true) {
                    messageDisplayBlock = <TypingAreaUI.TypingArea
                        iconClass="small-icon writing-pen textarea-icon"
                        initialText={message.textContents}
                        chatRoom={self.props.chatRoom}
                        className="edit-typing-area"
                        onUpdate={() => {
                                    self.forceUpdate();
                                }}
                        onConfirm={(messageContents) => {
                            if (self.props.onEditDone) {
                                self.props.onEditDone(messageContents);
                            }
                            return true;
                        }}
                    >
                    </TypingAreaUI.TypingArea>;
                }
                else {
                    messageDisplayBlock = <div className="message text-block" dangerouslySetInnerHTML={{__html: textMessage}}></div>;
                }

                return (
                    <div className={message.messageId + " message body " + additionalClasses}>
                        {avatar}
                        <div className="message content-area">
                            {name}
                            {datetime}

                            {messageActionButtons}

                            {messageDisplayBlock}
                            {buttonsBlock}
                            {spinnerElement}
                        </div>
                    </div>
                );
            }
        }
        // if this is an inline dialog
        else if (
            message.type
        ) {
            textMessage = getMessageString(message.type);
            if (!textMessage) {
                console.error("Message with type: ", message.type, "does not have a text string defined. Message: ", message);
                debugger;
                throw new Error("boom");
            }
            // if is an array.
            if (textMessage.splice) {
                var tmpMsg = textMessage[0].replace("[X]", htmlentities(generateContactName(contact.u)));

                if (message.currentCallCounter) {
                    tmpMsg += " " + textMessage[1].replace("[X]", "[[ " + secToDuration(message.currentCallCounter)) + "]] "
                }
                textMessage = tmpMsg;
                textMessage = textMessage
                    .replace("[[ ", "<span class=\"grey-color\">")
                    .replace("]]", "</span>");
            }
            else {
                textMessage = textMessage.replace("[X]", htmlentities(generateContactName(contact.u)));
            }

            message.textContents = textMessage;

            // mapping css icons to msg types
            if (message.type === "call-rejected") {
                message.cssClass = "crossed-handset red";
            }
            else if (message.type === "call-missed") {
                message.cssClass = "horizontal-handset yellow"
            }
            else if (message.type === "call-handled-elsewhere") {
                message.cssClass = "handset-with-arrow green";
            }
            else if (message.type === "call-failed") {
                message.cssClass = "horizontal-handset red";
            }
            else if (message.type === "call-timeout") {
                message.cssClass = "horizontal-handset yellow";
            }
            else if (message.type === "call-failed-media") {
                message.cssClass = "diagonal-handset yellow";
            }
            else if (message.type === "call-canceled") {
                message.cssClass = "horizontal-handset grey";
            }
            else if (message.type === "call-ended") {
                message.cssClass = "horizontal-handset grey";
            }
            else if (message.type === "call-feedback") {
                message.cssClass = "diagonal-handset grey";
            }
            else if (message.type === "call-starting") {
                message.cssClass = "diagonal-handset blue";
            }
            else if (message.type === "call-initialising") {
                message.cssClass = "diagonal-handset blue";
            }
            else if (message.type === "call-started") {
                message.cssClass = "diagonal-handset green";
            }
            else if (message.type === "incoming-call") {
                message.cssClass = "diagonal-handset green";
            }
            else if (message.type === "outgoing-call") {
                message.cssClass = "diagonal-handset blue";
            }
            else {
                message.cssClass = message.type;
            }

            var buttons = [];
            if (message.buttons) {
                Object.keys(message.buttons).forEach(function (k) {
                    var button = message.buttons[k];
                    var classes = button.classes;
                    var icon;
                    if (button.icon) {
                       icon = <i className={"small-icon " + button.icon}></i>;
                    }
                    buttons.push(
                        <div className={classes} key={k}  onClick={(() => { button.callback(); })}>
                            {icon}
                            {button.text}
                        </div>
                    );
                });
            }

            var buttonsCode;
            if (buttons.length > 0) {
                buttonsCode = <div className="buttons-block">
                        {buttons}
                        <div className="clear" />
                    </div>;
            }

            return (
                <div className="message body" data-id={"id" + message.messageId}>
                    <div className="feedback round-icon-block">
                        <i className={"round-icon " + message.cssClass}></i>
                    </div>

                    <div className="message content-area">
                        <div className="message date-time">{timestamp}</div>

                        <div className="message text-block" dangerouslySetInnerHTML={{__html:textMessage}}></div>
                        {buttonsCode}
                    </div>
                </div>
            )
        }
    }
});


var ConversationRightArea = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    render: function() {
        var self = this;
        var room = this.props.chatRoom;
        var contactJid = room.getParticipantsExceptMe()[0];
        var contact = room.megaChat.getContactFromJid(contactJid);


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


        if (room.callSession && room.callSession.isActive() === true) {
            startAudioCallButton = startVideoCallButton = null;
        }

        return <div className="chat-right-area">
            <div className="chat-right-area conversation-details-scroll">
                <div className="chat-right-pad">

                    <ContactsUI.ContactCard
                        contact={contact}
                        megaChat={room.megaChat}
                        className="right-chat-contact-card"
                        dropdownPositionMy="right top"
                        dropdownPositionAt="right bottom"
                    />

                    <div className="buttons-block">
                        {startAudioCallButton}
                        {startVideoCallButton}

                        { null /*<ButtonsUI.Button
                            className="link-button dropdown-element"
                            icon="rounded-grey-plus"
                            label={__("Add participant…")}
                            contacts={this.props.contacts}
                            >
                            <DropdownsUI.DropdownContactsSelector
                                contacts={this.props.contacts}
                                megaChat={this.props.megaChat}
                                className="popup add-participant-selector"
                                onClick={() => {}}
                                />
                        </ButtonsUI.Button>*/}

                        <ButtonsUI.Button
                            className="link-button dropdown-element"
                            icon="rounded-grey-up-arrow"
                            label={__(l[6834]+"…")}
                            >
                            <DropdownsUI.Dropdown
                                contacts={this.props.contacts}
                                megaChat={this.props.megaChat}
                                className="wide-dropdown send-files-selector"
                                onClick={() => {}}
                            >
                                <DropdownsUI.DropdownItem icon="grey-cloud" label="From my Cloud Drive" onClick={() => {
                                    self.props.onAttachFromCloudClicked();
                                }} />
                            </DropdownsUI.Dropdown>
                        </ButtonsUI.Button>


                        {
                            room.type !== "private" ?
                                <div className="link-button red" onClick={() => {
                                   room.leaveChat(true);
                                }}>
                                    <i className="small-icon rounded-stop"></i>
                                    {__("Leave Chat")}
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
                chatRoom.megaChat.getContactNameFromJid(v)
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
            var localPlayerSrc = callSession.localPlayer.src;

            if (!localPlayerSrc) {
                if (callSession.localPlayer.srcObject) {
                    callSession.localPlayer.src = URL.createObjectURL(callSession.localPlayer.srcObject);
                    localPlayerSrc = callSession.localPlayer.src;
                }
                else if (callSession.localPlayer.mozSrcObject) {
                    callSession.localPlayer.src = URL.createObjectURL(callSession.localPlayer.mozSrcObject);
                    localPlayerSrc = callSession.localPlayer.src;
                }
                else {
                    console.error("Could not retrieve src object.");
                }
            }
            localPlayerElement = <div className={"call local-video right-aligned bottom-aligned" + (this.state.localMediaDisplay ? "" : " minimized ") + visiblePanelClass}>
                <div className="default-white-button tiny-button call" onClick={this.toggleLocalVideoDisplay}>
                    <i className="tiny-icon grey-minus-icon" />
                </div>
                <video
                    className="localViewport"
                    defaultMuted="true"
                    muted=""
                    volume="0"
                    id={"localvideo_" + callSession.sid}
                    src={localPlayerSrc}
                    style={{display: !this.state.localMediaDisplay ? "none" : ""}}

                />
            </div>;
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
            editingMessageId: false
        };
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

    componentDidMount: function() {
        var self = this;
        window.addEventListener('resize', self.handleWindowResize);


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
                var c1 = $(e.srcElement).attr('class'),c2 = $(e.target).attr('class');
                if (c2 && c2.indexOf('fm-menu-item') > -1 && c1 && (c1.indexOf('cloud') > -1 || c1.indexOf('cloud') > -1)) return false;
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
            console.error(self.state.editingMessageId);
            if (!self.state.editingMessageId) {
                return;
            }

            var megaChat = self.props.chatRoom.megaChat;
            if (megaChat.currentlyOpenedChat && megaChat.currentlyOpenedChat === self.props.chatRoom.roomJid) {
                console.error(e.keyCode, self.state.editingMessageId);

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
                <div className="loading-spinner light" key="loadingSpinner"></div>
            );
        } else if (
            self.props.messagesBuff.joined === true && (
                self.props.messagesBuff.messages.length === 0 ||
                !self.props.messagesBuff.haveMoreHistory()
            )
        ) {
            var headerText = (
                self.props.messagesBuff.messages.length === 0 ?
                    __("No chat history with %s") :
                    __("Conversation with %s")
            );
            headerText = headerText.replace("%s", "<span>" + htmlentities(contactName) + "</span>");

            messagesList.push(
                <div className="messages notification" key="initialMsg">
                    <div className="header" dangerouslySetInnerHTML={{__html: headerText}}>
                    </div>
                    <div className="info">
                        Mega protects your chat with end-to-end (user controlled) encryption providing essential safety assurances:<br/>
                        * Confidentiality - Only the author and intended recipients are able to decipher and read the content;<br/>
                        * Authenticity - There is an assurance that the message received was authored by the stated sender, and its content has not been tampered with during transport or on the server.<br/>
                    </div>
                </div>
            );
        }
        var lastTimeMarker;
        var lastMessageFrom = null;
        var lastGroupedMessageTimeStamp = null;
        var grouped = false;

        self.props.messagesBuff.messages.forEach(function(v, k) {
            if (v.deleted !== 1 && !v.protocol && v.revoked !== true) {
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

                messagesList.push(
                    <ConversationMessage
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
                msg = __("%s is typing").replace("%s", namesDisplay[0]);
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
                        onAttachFromCloudClicked={function() {
                            self.setState({'attachCloudDialog': true});
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
                                onUpdate={() => {
                                    self.handleWindowResize();
                                }}
                                onConfirm={(messageContents) => {
                                    self.props.chatRoom.sendMessage(messageContents);
                                }}
                            >
                                    <ButtonsUI.Button
                                        className="popup-button"
                                        icon="small-icon grey-medium-plus">
                                        <DropdownsUI.Dropdown
                                            className="wide-dropdown attach-to-chat-popup"
                                            vertOffset={10}
                                        >
                                            <DropdownsUI.DropdownItem
                                                icon="grey-cloud" label={__("Add from your Cloud")}
                                                onClick={(e) => {
                                                    self.setState({'attachCloudDialog': true});
                                            }}>
                                            </DropdownsUI.DropdownItem>
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
            
            self.props.contacts.forEach(function(contact) {
                if (contact.u === u_handle) { return; }
                else if (contact.c === 0) { return; }

                var pres = self.props.megaChat.xmppPresenceToCssClass(contact.presence);

                (pres === "offline" ? contactsListOffline : contactsList).push(
                    <ContactsUI.ContactCard contact={contact} megaChat={self.props.megaChat} key={contact.u} />
                );
            });
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
                                __html: __('You have no [[Conversations]]')
                                    .replace("[[", "<span>")
                                    .replace("]]", "</span>")
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
