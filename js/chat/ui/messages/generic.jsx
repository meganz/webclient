var React = require("react");
var utils = require('./../../../ui/utils.jsx');
var getMessageString = require('./utils.jsx').getMessageString;
var ConversationMessageMixin = require('./mixin.jsx').ConversationMessageMixin;
var ContactsUI = require('./../contacts.jsx');
var TypingAreaUI = require('./../typingArea.jsx');

/* 1h as confirmed by Mathias */
var MESSAGE_NOT_EDITABLE_TIMEOUT = window.MESSAGE_NOT_EDITABLE_TIMEOUT = 60*60;

var GenericConversationMessage = React.createClass({
    mixins: [ConversationMessageMixin],
    getInitialState: function() {
        return {
            'editing': false
        };
    },
    componentWillUpdate: function(nextProps, nextState) {
    },
    componentDidUpdate: function(oldProps, oldState) {
        var self = this;
        if (self.state.editing === true && self.isMounted()) {
            var $generic = $(self.findDOMNode());
            var $textarea = $('textarea', $generic);
            if ($textarea.size() > 0 && !$textarea.is(":focus")) {
                $textarea.focus();
                moveCursortoToEnd($textarea[0]);
            }
            if (!oldState.editing) {
                if (self.props.onEditStarted) {
                    self.props.onEditStarted($generic);
                }
            }
        }
        else if (self.isMounted() && self.state.editing === false && oldState.editing === true) {
            if (self.props.onUpdate) {
                self.props.onUpdate();
            }
        }
        var $node = $(self.findDOMNode());
        $node.rebind('onEditRequest.genericMessage', function(e) {
            if (self.state.editing === false) {
                self.setState({'editing': true});

                Soon(function() {
                    var $generic = $(self.findDOMNode());
                    var $textarea = $('textarea', $generic);
                    if ($textarea.size() > 0 && !$textarea.is(":focus")) {
                        $textarea.focus();
                        moveCursortoToEnd($textarea[0]);
                    }
                });
            }
        });
    },
    componentWillUnmount: function() {
        var self = this;
        var $node = $(self.findDOMNode());
        $node.unbind('onEditRequest.genericMessage');
    },
    doDelete: function(e, msg) {
        e.preventDefault(e);
        e.stopPropagation(e);

        if (
            msg.getState() === Message.STATE.NOT_SENT_EXPIRED
        ) {
            this.doCancelRetry(e, msg);
        }
        else {
            this.props.onDeleteClicked(e, this.props.message);
        }
    },
    doCancelRetry: function(e, msg) {
        e.preventDefault(e);
        e.stopPropagation(e);
        var chatRoom = this.props.message.chatRoom;

        chatRoom.messagesBuff.messages.removeByKey(msg.messageId);

        chatRoom.megaChat.plugins.chatdIntegration.discardMessage(
            chatRoom,
            msg.messageId
        );
    },
    doRetry: function(e, msg) {
        var self = this;
        e.preventDefault(e);
        e.stopPropagation(e);
        var chatRoom = this.props.message.chatRoom;
        this.doCancelRetry(e, msg);
        chatRoom._sendMessageToTransport(msg)
            .done(function(internalId) {
                msg.internalId = internalId;

                self.safeForceUpdate();

            });


    },
    render: function () {
        var self = this;

        var message = this.props.message;
        var megaChat = this.props.message.chatRoom.megaChat;
        var chatRoom = this.props.message.chatRoom;
        var contact = self.getContact();
        var timestampInt = self.getTimestamp();
        var timestamp = self.getTimestampAsString();

        var textMessage;


        var additionalClasses = "";
        var buttonsBlock = null;
        var spinnerElement = null;
        var messageNotSendIndicator = null;
        var messageIsNowBeingSent = false;

        if (this.props.className) {
            additionalClasses += this.props.className;
        }

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
                        additionalClasses += " not-sent";

                        if (message.sending === true) {
                            message.sending = false;


                            $(message).trigger(
                                'onChange',
                                [
                                    message,
                                    "sending",
                                    true,
                                    false
                                ]
                            );
                        }

                        if (!message.requiresManualRetry) {
                            additionalClasses += " retrying";
                        }
                        else {
                            additionalClasses += " retrying requires-manual-retry";
                        }

                        buttonsBlock = null;
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

            var displayName;
            if (contact) {
                displayName = contact.u === u_handle ? __(l[8885]) : generateAvatarMeta(contact.u).fullName;
            }
            else {
                displayName = contact;
            }

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

                        var attachmentMetaInfo;
                        // cache ALL current attachments, so that we can revoke them later on in an ordered way.
                        if (message.messageId) {
                            if (
                                chatRoom.attachments &&
                                chatRoom.attachments[v.h] &&
                                chatRoom.attachments[v.h][message.messageId]
                            ) {
                                attachmentMetaInfo = chatRoom.attachments[v.h][message.messageId];
                            }
                            else {
                                // if the chatRoom.attachments is not filled in yet, just skip the rendering
                                // and this attachment would be re-rendered on the next loop.
                                return;
                            }
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

                        var startPreview = function(e) {
                            assert(M.chat, 'Not in chat.');
                            M.v = chatRoom.images.values();
                            slideshow(v.h);
                            if (e) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        };

                        // generate preview/icon
                        var icon = fileIcon(v);

                        var dropdown = null;
                        var previewButtons = null;



                        if (!attachmentMetaInfo.revoked) {
                            if (v.fa && (icon === "graphic" || icon === "image")) {
                                var imagesListKey = message.messageId + "_" + v.h;
                                if (!chatRoom.images.exists(imagesListKey)) {
                                    v.k = imagesListKey;
                                    v.delay = message.delay;
                                    chatRoom.images.push(v);
                                }
                                previewButtons = <span>
                                    <DropdownsUI.DropdownItem icon="search-icon" label={__(l[1899])}
                                                              onClick={startPreview}/>
                                    <hr/>
                                </span>
                            }
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
                                        {previewButtons}
                                        <DropdownsUI.DropdownItem icon="rounded-grey-down-arrow" label={__(l[1187])}
                                                                  onClick={startDownload}/>
                                        <DropdownsUI.DropdownItem icon="grey-cloud" label={__(l[8005])}
                                                                  onClick={addToCloudDrive}/>

                                        <hr />

                                        <DropdownsUI.DropdownItem icon="red-cross" label={__(l[8909])} className="red"
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
                                        {previewButtons}
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

                        var attachmentClasses = "message shared-data";
                        var preview = <div className="data-block-view medium">
                            {dropdown}

                            <div className="data-block-bg">
                                <div className={"block-view-file-type " + icon}></div>
                            </div>
                        </div>;

                        if (M.chat && !message.revoked) {
                            if (v.fa && (icon === "graphic" || icon === "image")) {
                                var src = thumbnails[v.h];
                                if (!src) {
                                    src = M.getNodeByHandle(v.h);

                                    if (!src || src !== v) {
                                        M.v.push(v);
                                        if (!v.seen) {
                                            v.seen = 1; // HACK
                                        }
                                        delay('thumbnails', fm_thumbnails, 90);
                                    }
                                    src = window.noThumbURI || '';
                                }

                                preview =  (src ? (<div id={v.h} className="shared-link img-block">
                                    <div className="img-overlay" onClick={startPreview}></div>
                                    <div className="button overlay-button" onClick={startPreview}>
                                        <i className="huge-white-icon loupe"></i>
                                    </div>

                                    {dropdown}

                                    <img alt="" className={"thumbnail-placeholder " + v.h} src={src}
                                         width="120"
                                         height="120"
                                         onClick={startPreview}
                                    />
                                </div>) :  preview);
                            }
                        }

                        files.push(
                            <div className={attachmentClasses} key={v.h}>
                                <div className="message shared-info">
                                    <div className="message data-title">
                                        {v.name}
                                    </div>
                                    <div className="message file-size">
                                        {bytesToSize(v.s)}
                                    </div>
                                </div>

                                {preview}
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
                        if (!contactEmail) {
                            contactEmail = v.email ? v.email : v.m;
                        }

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
                        if (!M.u[contact.u]) {
                            M.u.set(contact.u, new MegaDataObject(MEGA_USER_STRUCT, true, {
                                'u': contact.u,
                                'name': contact.name,
                                'm': contact.email ? contact.email : contactEmail,
                                'c': 0
                            }));
                        }
                        else if (M.u[contact.u] && !M.u[contact.u].m) {
                            // if already added from group chat...add the email, 
                            // since that contact got shared in a chat room
                            M.u[contact.u].m = contact.email ? contact.email : contactEmail;
                        }

                        if (M.u[contact.u] && M.u[contact.u].c === 1) {
                            // Only show this dropdown in case this user is a contact, e.g. don't show it if thats me
                            // OR it is a share contact, etc.
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
                                        label={__(l[5868])}
                                        onClick={() => {
                                            window.location = "#fm/" + contact.u;
                                        }}
                                    />
                                    <hr/>
                                    { null /*<DropdownsUI.DropdownItem
                                     icon="rounded-grey-plus"
                                     label={__(l[8631])}
                                     onClick={() => {
                                     window.location = "#fm/" + contact.u;
                                     }}
                                     />*/}
                                    <DropdownsUI.DropdownItem
                                        icon="conversations"
                                        label={__(l[8632])}
                                        onClick={() => {
                                            window.location = "#fm/chat/" + contact.u;
                                        }}
                                    />
                                    {deleteButtonOptional ? <hr /> : null}
                                    {deleteButtonOptional}
                                </DropdownsUI.Dropdown>
                            </ButtonsUI.Button>;
                        }
                        else if (M.u[contact.u] && M.u[contact.u].c === 0) {
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
                                        label={__(l[71])}
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
                                    <div className="message data-title">{M.getNameByHandle(contact.u)}</div>
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
                else if (textContents.substr &&
                 textContents.substr(1, 1) === Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT) {
                    // don't show anything if this is a 'revoke' message
                    return null;
                }
                else {
                    chatRoom.logger.warn("Invalid 2nd byte for a management message: ", textContents);
                    return null;
                }
            }
            else {
                // this is a text message.
                if (message instanceof KarereEventObjects.OutgoingMessage) {
                    if (message.contents === "") {
                        message.deleted = true;
                    }
                }
                else if (message.textContents === "") {
                    message.deleted = true;
                }
                var messageActionButtons = null;
                if (message.getState() === Message.STATE.NOT_SENT) {
                    messageActionButtons = null;

                    if (!spinnerElement) {
                        if (!message.requiresManualRetry) {
                            messageNotSendIndicator = <div className="not-sent-indicator tooltip-trigger"
                                                           data-tooltip="not-sent-notification">
                                <i className="small-icon yellow-triangle"></i>
                            </div>;
                        }
                        else {
                            if (self.state.editing !== true) {
                                messageNotSendIndicator = <div className="not-sent-indicator">
                                        <span className="tooltip-trigger"
                                              key="retry"
                                              data-tooltip="not-sent-notification-manual"
                                              onClick={(e) => {
                                                self.doRetry(e, message);
                                            }}>
                                          <i className="small-icon refresh-circle"></i>
                                    </span>
                                    <span className="tooltip-trigger"
                                          key="cancel"
                                          data-tooltip="not-sent-notification-cancel"
                                          onClick={(e) => {
                                                    self.doCancelRetry(e, message);
                                                }}>
                                            <i className="small-icon red-cross"></i>
                                    </span>
                                </div>;
                            }
                        }
                    }
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
                if (self.state.editing === true) {
                    messageDisplayBlock = <TypingAreaUI.TypingArea
                        iconClass="small-icon writing-pen textarea-icon"
                        initialText={message.textContents ? message.textContents : message.contents}
                        chatRoom={self.props.message.chatRoom}
                        showButtons={true}
                        className="edit-typing-area"
                        onUpdate={() => {
                            if (self.props.onUpdate) {
                                self.props.onUpdate();
                            }
                        }}
                        onConfirm={(messageContents) => {
                            self.setState({'editing': false});

                            if (self.props.onEditDone) {
                                Soon(function() {
                                    self.props.onEditDone(messageContents);
                                    });
                            }

                            return true;
                        }}
                    />;
                }
                else if(message.deleted) {
                    messageDisplayBlock =  <div className="message text-block">
                        <em>
                            {__(l[8886])}
                        </em>
                    </div>;
                }
                else {
                    if (message.updated > 0) {
                        textMessage = textMessage + " <em>" + __(l[8887]) + "</em>";
                    }
                    if (self.props.initTextScrolling) {
                        messageDisplayBlock = 
                            <utils.JScrollPane className="message text-block scroll">
                                <div className="message text-scroll" dangerouslySetInnerHTML={{__html:textMessage}}>
                                </div>
                            </utils.JScrollPane>;
                    } else {
                        messageDisplayBlock = 
                            <div className="message text-block" dangerouslySetInnerHTML={{__html:textMessage}}></div>;
                    }
                }
                if (!message.deleted) {
                    if (
                        contact && contact.u === u_handle &&
                        (unixtime() - message.delay) < MESSAGE_NOT_EDITABLE_TIMEOUT &&
                        self.state.editing !== true &&
                        chatRoom.isReadOnly() === false &&
                        !message.requiresManualRetry
                    ) {
                        messageActionButtons = <ButtonsUI.Button
                            className="default-white-button tiny-button"
                            icon="tiny-icon grey-down-arrow">
                            <DropdownsUI.Dropdown
                                className="white-context-menu attachments-dropdown"
                                noArrow={true}
                                positionMy="left bottom"
                                positionAt="right bottom"
                                horizOffset={4}
                            >
                                <DropdownsUI.DropdownItem
                                    icon="writing-pen"
                                    label={__(l[1342])}
                                    className=""
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();

                                        self.setState({'editing': true});
                                }}
                                />
                                <hr/>
                                <DropdownsUI.DropdownItem
                                    icon="red-cross"
                                    label={__(l[1730])}
                                    className="red"
                                    onClick={(e) => {
                                        self.doDelete(e, message);
                                }}
                                />
                            </DropdownsUI.Dropdown>
                        </ButtonsUI.Button>;

                    }
                }

                return (
                    <div className={message.messageId + " message body " + additionalClasses}>
                        {avatar}
                        <div className="message content-area">
                            {name}
                            {datetime}

                            {self.props.hideActionButtons ? null : messageActionButtons}
                            {messageNotSendIndicator}
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
                console.error("Message with type: ", message.type, " - no text string defined. Message: ", message);
                debugger;
                throw new Error("boom");
            }
            // if is an array.
            if (textMessage.splice) {
                var tmpMsg = textMessage[0].replace("[X]", htmlentities(M.getNameByHandle(contact.u)));

                if (message.currentCallCounter) {
                    tmpMsg += " " + 
                        textMessage[1].replace("[X]", "[[ " + secToDuration(message.currentCallCounter)) + "]] "
                }
                textMessage = tmpMsg;
                textMessage = textMessage
                    .replace("[[ ", "<span className=\"grey-color\">")
                    .replace("]]", "</span>");
            }
            else {
                textMessage = textMessage.replace("[X]", htmlentities(M.getNameByHandle(contact.u)));
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
                <div className={message.messageId + " message body" + additionalClasses} 
                     data-id={"id" + message.messageId}>
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
