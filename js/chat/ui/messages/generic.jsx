var React = require("react");
var ReactDOM = require("react-dom");
var utils = require('./../../../ui/utils.jsx');
var MegaRenderMixin = require('./../../../stores/mixins.js').MegaRenderMixin;
var ContactsUI = require('./../../ui/contacts.jsx');

var ConversationMessageMixin = require('./mixin.jsx').ConversationMessageMixin;

var GenericConversationMessage = React.createClass({
    mixins: [ConversationMessageMixin],

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
        var contact = self.getContact();
        var timestampInt = self.getTimestamp();
        var timestamp = self.getTimestampAsString();

        var textMessage;


        var additionalClasses = "";
        var buttonsBlock = null;
        var spinnerElement = null;

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
                            <div className="message circuit-label left">{__(l[8003])}</div>
                            <div className="default-white-button right" onClick={(e) => {
                                self.doRetry(e, message);
                            }}>{__(l[1364])}</div>
                            <div className="default-white-button right red" onClick={(e) => {
                                self.doDelete(e, message);
                            }}>{__(l[8004])}</div>
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
                                        __(l[8005]),
                                        __(l[8006])
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
                                        <DropdownsUI.DropdownItem icon="grey-cloud" label={__(l[8005])}
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
                                        <DropdownsUI.DropdownItem icon="grey-cloud" label={__(l[8005])}
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
                else if (textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.CONTACT) {
                    textContents = textContents.substr(2, textContents.length);

                    try {
                        var attachmentMeta = JSON.parse(textContents);
                    } catch(e) {
                        return null;
                    }

                    var contacts = [];

                    attachmentMeta.forEach(function(v) {
                        var contact = M.u && M.u[v.u] ? M.u[v.u] : v;
                        var contactEmail = contact.email ? contact.email : contact.m;

                        var deleteButtonOptional = null;

                        if (message.userId === u_handle) {
                            deleteButtonOptional = <DropdownsUI.DropdownItem
                                icon="red-cross"
                                label={__(l[1730])}
                                className="red"
                                onClick={(e) => {
                                        self.doDelete(e, message);
                                }}
                            />;

                        }
                        var dropdown = null;
                        if (M.u[contact.u]) {
                            // Only show this dropdown in case this user is a contact, e.g. don't show it if thats me
                            // OR it is a share contact, etc.
                            if (contact.c === 1) {
                                dropdown = <ButtonsUI.Button
                                    className="default-white-button tiny-button"
                                    icon="tiny-icon grey-down-arrow">
                                    <DropdownsUI.Dropdown
                                        className="white-context-menu shared-contact-dropdown"
                                        noArrow={true}
                                        positionMy="left bottom"
                                        positionAt="right bottom"
                                        horizOffset={4}
                                    >
                                        <DropdownsUI.DropdownItem
                                            icon="human-profile"
                                            label={__("View profile")}
                                            onClick={() => {
                                                window.location = "#fm/" + contact.u;
                                            }}
                                        />
                                        <hr/>
                                        { null /*<DropdownsUI.DropdownItem
                                         icon="rounded-grey-plus"
                                         label={__("Add to chat")}
                                         onClick={() => {
                                         window.location = "#fm/" + contact.u;
                                         }}
                                         />*/}
                                        <DropdownsUI.DropdownItem
                                            icon="conversations"
                                            label={__("Start new chat")}
                                            onClick={() => {
                                                window.location = "#fm/chat/" + contact.u;
                                            }}
                                        />
                                        {deleteButtonOptional ? <hr /> : null}
                                        {deleteButtonOptional}
                                    </DropdownsUI.Dropdown>
                                </ButtonsUI.Button>;
                            }
                        }
                        else {
                            dropdown = <ButtonsUI.Button
                                className="default-white-button tiny-button"
                                icon="tiny-icon grey-down-arrow">
                                <DropdownsUI.Dropdown
                                    className="white-context-menu shared-contact-dropdown"
                                    noArrow={true}
                                    positionMy="left bottom"
                                    positionAt="right bottom"
                                    horizOffset={4}
                                >
                                    <DropdownsUI.DropdownItem
                                        icon="rounded-grey-plus"
                                        label={__("Add contact")}
                                        onClick={() => {
                                            M.inviteContact(M.u[u_handle].m, contactEmail);

                                            // Contact invited
                                            var title = l[150];

                                            // The user [X] has been invited and will appear in your contact list once
                                            // accepted."
                                            var msg = l[5898].replace('[X]', contactEmail);


                                            closeDialog();
                                            msgDialog('info', title, msg);
                                        }}
                                    />
                                    {deleteButtonOptional ? <hr /> : null}
                                    {deleteButtonOptional}
                                </DropdownsUI.Dropdown>
                            </ButtonsUI.Button>;
                        }

                        contacts.push(
                            <div key={contact.u}>
                                <div className="message shared-info">
                                    <div className="message data-title">{contact.name}</div>
                                    {
                                        M.u[contact.u] ?
                                            <ContactsUI.ContactVerified className="big" contact={contact} /> :
                                            null
                                    }

                                    <div className="user-card-email">{contactEmail}</div>
                                </div>
                                <div className="message shared-data">
                                    <div className="data-block-view medium">
                                        {
                                            M.u[contact.u] ?
                                                <ContactsUI.ContactPresence className="big" contact={contact} /> :
                                                null
                                        }
                                        {dropdown}
                                        <div className="data-block-bg">
                                            <ContactsUI.Avatar className="medium-avatar share" contact={contact} />
                                        </div>
                                    </div>
                                    <div className="clear"></div>
                                </div>
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
                                {contacts}
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
                     <DropdownsUI.DropdownItem icon="quotes" label={__(l[8012])} onClick={() => {
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
                    .replace("[[ ", "<span className=\"grey-color\">")
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

module.exports = {
    GenericConversationMessage
};
