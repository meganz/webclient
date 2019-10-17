import React from 'react';
import utils from './../../../ui/utils.jsx';
import { getMessageString } from './utils.jsx';
import { ConversationMessageMixin } from './mixin.jsx';
import { MetaRichpreview } from './metaRichpreview.jsx';
import { MetaRichpreviewConfirmation } from './metaRichpreviewConfirmation.jsx';
import { MetaRichpreviewMegaLinks } from './metaRichpreviewMegaLinks.jsx';
import { Avatar, ContactButton, ContactPresence, ContactFingerprint, ContactVerified } from './../contacts.jsx';
import {TypingArea} from './../typingArea.jsx';
import AudioContainer from './AudioContainer.jsx';
import GeoLocation from './geoLocation.jsx';
var DropdownsUI = require('./../../../ui/dropdowns.jsx');
var ButtonsUI = require('./../../../ui/buttons.jsx');

/* 1h as confirmed by Mathias */
const MESSAGE_NOT_EDITABLE_TIMEOUT = window.MESSAGE_NOT_EDITABLE_TIMEOUT = 60*60;

var CLICKABLE_ATTACHMENT_CLASSES = '.message.data-title, .message.file-size, .data-block-view.semi-big, .data-block-view.medium';

var NODE_DOESNT_EXISTS_ANYMORE = {};

class GenericConversationMessage extends ConversationMessageMixin {
    constructor(props) {
        super(props);
        this.state = {
            'editing': this.props.editing,
        };
    }
    isBeingEdited() {
        return this.state.editing === true || this.props.editing === true;
    }
    componentDidUpdate(oldProps, oldState) {
        var self = this;
        var isBeingEdited = self.isBeingEdited();
        var isMounted = self.isMounted();
        if (isBeingEdited && isMounted) {
            var $generic = $(self.findDOMNode());
            var $textarea = $('textarea', $generic);
            if ($textarea.length > 0 && !$textarea.is(":focus")) {
                $textarea.trigger("focus");
                moveCursortoToEnd($textarea[0]);
            }
            if (!oldState.editing) {
                if (self.props.onEditStarted) {
                    self.props.onEditStarted($generic);
                    moveCursortoToEnd($textarea);
                }
            }
        }
        else if (isMounted && !isBeingEdited && oldState.editing === true) {
            if (self.props.onUpdate) {
                self.props.onUpdate();
            }
        }

        $(self.props.message).rebind('onChange.GenericConversationMessage' + self.getUniqueId(), function() {
            Soon(function() {
                if (self.isMounted()) {
                    self.eventuallyUpdate();
                }
            });
        });
    }
    componentDidMount() {
        super.componentDidMount();
        var self = this;
        var $node = $(self.findDOMNode());

        if (self.isBeingEdited() && self.isMounted()) {
            var $generic = $(self.findDOMNode());
            var $textarea = $('textarea', $generic);
            if ($textarea.length > 0 && !$textarea.is(":focus")) {
                $textarea.trigger("focus");
                moveCursortoToEnd($textarea[0]);
            }
        }

        $node.rebind(
            'click.dropdownShortcut',
            CLICKABLE_ATTACHMENT_CLASSES,
            function(e){
                if (e.target.classList.contains('button')) {
                    // prevent recursion
                    return;
                }
                if (e.target.classList.contains('no-thumb-prev')) {
                    // do now show the dropdown clicking a previeable item without thumbnail
                    return;
                }

                var $block;
                if ($(e.target).is('.shared-data')) {
                    $block = $(e.target);
                }
                else if ($(e.target).is('.shared-info') || $(e.target).parents('.shared-info').length > 0) {
                    $block = $(e.target).is('.shared-info') ?
                        $(e.target).next() : $(e.target).parents('.shared-info').next();
                }
                else {
                    $block = $(e.target).parents('.message.shared-data');
                }


                Soon(function() {
                    // a delay is needed, otherwise React would receive the same click event and close the dropdown
                    // even before displaying it in the UI.
                    $('.button.default-white-button.tiny-button', $block).trigger('click');
                });
            });
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        var self = this;
        var $node = $(self.findDOMNode());

        $(self.props.message).off('onChange.GenericConversationMessage' + self.getUniqueId());
        $node.off('click.dropdownShortcut', CLICKABLE_ATTACHMENT_CLASSES);
    }
    haveMoreContactListeners() {
        if (!this.props.message || !this.props.message.meta) {
            return false;
        }

        if (this.props.message.meta) {
            if (this.props.message.meta.participants) {
                // call ended type of message
                return this.props.message.meta.participants;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }
    _nodeUpdated(h) {
        var self = this;
        // because it seems the webclient can trigger stuff before the actual
        // change is done on the node, this function would need to be queued
        // using Soon, so that its executed after the node modify code
        Soon(function() {
            if (self.isMounted() && self.isComponentVisible()) {
                self.forceUpdate();
                if (self.dropdown) {
                    self.dropdown.forceUpdate();
                }
            }
        });
    }
    doDelete(e, msg) {
        e.preventDefault(e);
        e.stopPropagation(e);

        if (msg.getState() === Message.STATE.NOT_SENT_EXPIRED) {
            this.doCancelRetry(e, msg);
        }
        else {
            this.props.onDeleteClicked(e, this.props.message);
        }
    }
    doCancelRetry(e, msg) {
        e.preventDefault(e);
        e.stopPropagation(e);
        var chatRoom = this.props.message.chatRoom;

        chatRoom.messagesBuff.messages.removeByKey(msg.messageId);

        chatRoom.megaChat.plugins.chatdIntegration.discardMessage(
            chatRoom,
            msg.messageId
        );
    }
    doRetry(e, msg) {
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


    }
    _favourite(h) {
        var newFavState = Number(!M.isFavourite(h));
        M.favourite([h], newFavState);
    }
    _addFavouriteButtons(h, arr) {
        var self = this;

        if (M.getNodeRights(h) > 1) {
            var isFav = M.isFavourite(h);

            arr.push(
                <DropdownsUI.DropdownItem
                    icon={"context " + (isFav ? "broken-heart" : "heart")}
                    label={isFav ? l[5872] : l[5871]}
                    isFav={isFav}
                    key="fav"
                    onClick={(e) => {
                        self._favourite(h);
                        e.stopPropagation();
                        e.preventDefault();
                        return false;
                    }}
                />
            );
            return isFav;
        }
        else {
            return false;
        }
    }
    _isNodeHavingALink(h) {
        return M.getNodeShare(h) !== false;
    }
    _addLinkButtons(h, arr) {
        var self = this;

        var haveLink = self._isNodeHavingALink(h) === true;

        var getManageLinkText = haveLink ? l[6909] : l[59];

        arr.push(
            <DropdownsUI.DropdownItem
                icon="icons-sprite chain"
                key="getLinkButton"
                label={getManageLinkText}
                onClick={self._getLink.bind(self, h)}
            />);

        if (haveLink) {
            arr.push(
                <DropdownsUI.DropdownItem
                    icon="context remove-link"
                    key="removeLinkButton"
                    label={__(l[6821])}
                    onClick={self._removeLink.bind(self, h)}
                />
            );
            return true;
        }
        else {
            return false;
        }
    }
    _startDownload (v) {
        M.addDownload([v]);
    }
    _addToCloudDrive(v, openSendToChat) {
        $.selected = [v.h];
        openSaveToDialog(v, function(node, target) {
            if (Array.isArray(target)) {
                M.myChatFilesFolder.get(true)
                    .then(function(myChatFolder) {
                        M.injectNodes(node, myChatFolder.h, function(res) {
                            if (Array.isArray(res) && res.length) {
                                megaChat.openChatAndAttachNodes(target, res).dump();
                            }
                            else if (d) {
                                console.warn('Unable to inject nodes... no longer existing?', res);
                            }
                        });
                    })
                    .catch(function() {
                        if (d) {
                            console.error("Failed to allocate 'My chat files' folder.", arguments);
                        }
                    });
            }
            else {
                // is a save/copy to
                target = target || M.RootID;
                M.injectNodes(node, target, function(res) {
                    if (!Array.isArray(res) || !res.length) {
                        if (d) {
                            console.warn('Unable to inject nodes... no longer existing?', res);
                        }
                    }
                    else {
                        if (target === M.RootID) {
                            // since if the user clicks Save without picking, its a bit weird, where the file went
                            // we show a simple dialog telling him the file is in Cloud Drive.
                            msgDialog(
                                'info',
                                l[8005],
                                l[8006]
                            );
                        }
                    }
                });
            }
        }, openSendToChat ? "conversations" : false);
    }
    _getLink(h, e) {
        if (u_type === 0) {
            ephemeralDialog(l[1005]);
        }
        else {
            $.selected = [h];
            mega.Share.initCopyrightsDialog([h]);
        }
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
    _removeLink(h, e) {
        if (u_type === 0) {
            ephemeralDialog(l[1005]);
        }
        else {
            var exportLink = new mega.Share.ExportLink({'updateUI': true, 'nodesToProcess': [h]});
            exportLink.removeExportLink();
        }

        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
    _startPreview(v, e) {
        if ($(e && e.target).is('.tiny-button')) {
            // prevent launching the previewer clicking the dropdown on an previewable item without thumbnail
            return;
        }
        assert(M.chat, 'Not in chat.');

        if (is_video(v)) {
            $.autoplay = v.h;
        }
        slideshow(v.ch, undefined, true);
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
    render() {
        var self = this;

        var message = this.props.message;
        var megaChat = this.props.message.chatRoom.megaChat;
        var chatRoom = this.props.message.chatRoom;
        var contact = self.getContact();
        var timestampInt = self.getTimestamp();
        var timestamp = self.getTimestampAsString();

        var additionalClasses = "";
        var buttonsBlock = null;
        var spinnerElement = null;
        var messageNotSendIndicator = null;
        var messageIsNowBeingSent = false;
        var subMessageComponent = [];
        var attachmentMeta = false;
        var extraPreButtons = [];

        if (this.props.className) {
            additionalClasses += this.props.className;
        }

        if (message.revoked) {
            // skip doing tons of stuff and just return null, in case this message was marked as revoked.
            return null;
        }

        // if this is a text msg.
        if (message instanceof Message) {
            if (!message.wasRendered || !message.messageHtml) {
                // Convert ot HTML and pass it to plugins to do their magic on styling the message if needed.
                message.messageHtml = htmlentities(
                    message.textContents
                ).replace(/\n/gi, "<br/>").replace(/\t/g, '    ');

                message.processedBy = {};

                var evtObj = {
                    message: message,
                    room: chatRoom
                };

                megaChat.trigger('onPreBeforeRenderMessage', evtObj);
                var event = new $.Event("onBeforeRenderMessage");
                megaChat.trigger(event, evtObj);
                megaChat.trigger('onPostBeforeRenderMessage', evtObj);

                if (event.isPropagationStopped()) {
                    self.logger.warn("Event propagation stopped receiving (rendering) of message: ", message);
                    return false;
                }
                message.wasRendered = 1;
            }

            var textMessage = message.messageHtml;

            var state = message.getState();
            var stateText = message.getStateText(state);
            var textContents = message.textContents || false;
            var displayName = contact && generateAvatarMeta(contact.u).fullName || '';

            if (state === Message.STATE.NOT_SENT) {
                messageIsNowBeingSent = (unixtime() - message.delay < 5);

                if (!messageIsNowBeingSent) {
                    additionalClasses += " not-sent";

                    if (message.sending === true) {
                        message.sending = false;
                        $(message).trigger('onChange', [message, "sending", true, false]);
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
                        self._rerenderTimer = setTimeout(function() {
                            if (chatRoom.messagesBuff.messages[message.messageId] && message.sending === true) {
                                chatRoom.messagesBuff.trackDataChange();
                                if (self.isMounted()) {
                                    self.forceUpdate();
                                }
                            }
                        }, (5 - (unixtime() - message.delay)) * 1000);
                    }
                }
            }
            else {
                additionalClasses += ' ' + stateText;
            }

            if (textContents[0] === Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT) {
                if (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT) {
                    attachmentMeta = message.getAttachmentMeta() || [];

                    var files = [];
                    attachmentMeta.forEach(function(v, attachmentKey) {

                        if (!M.chd[v.ch] || v.revoked) {
                            // don't show revoked files
                            return;
                        }

                        // generate preview/icon
                        var icon = fileIcon(v);
                        var mediaType = is_video(v);
                        var isImage = is_image2(v);
                        var isVideo = mediaType > 0;
                        var isAudio = mediaType > 1;
                        var showThumbnail = String(v.fa).indexOf(':1*') > 0;
                        var isPreviewable = isImage || isVideo;

                        var dropdown = null;
                        var noThumbPrev = '';
                        var previewButton = null;

                        if (isPreviewable) {
                            if (!showThumbnail) {
                                noThumbPrev = 'no-thumb-prev';
                            }
                            var previewLabel = isAudio ? l[17828] : isVideo ? l[16275] : l[1899];
                            previewButton = <span key="previewButton">
                                    <DropdownsUI.DropdownItem icon="search-icon" label={previewLabel}
                                                              onClick={self._startPreview.bind(self, v)}/>
                                </span>;
                        }

                        if (contact.u === u_handle) {
                            dropdown = <ButtonsUI.Button
                                className="default-white-button tiny-button"
                                icon="tiny-icon icons-sprite grey-dots">
                                <DropdownsUI.Dropdown
                                    ref={(refObj) => {
                                        self.dropdown = refObj;
                                    }}
                                    className="white-context-menu attachments-dropdown"
                                    noArrow={true}
                                    positionMy="left top"
                                    positionAt="left bottom"
                                    horizOffset={-4}
                                    vertOffset={3}
                                    onBeforeActiveChange={(newState) => {
                                        if (newState === true) {
                                            self.forceUpdate();
                                        }
                                    }}
                                    dropdownItemGenerator={function(dd) {
                                        var linkButtons = [];
                                        var firstGroupOfButtons = [];
                                        var revokeButton = null;
                                        var downloadButton = null;

                                        if (message.isEditable && message.isEditable()) {
                                            revokeButton = (
                                                <DropdownsUI.DropdownItem
                                                    icon="red-cross"
                                                    label={__(l[83])}
                                                    className="red"
                                                    onClick={() => {
                                                        chatRoom.megaChat.plugins.chatdIntegration.updateMessage(
                                                            chatRoom, message.internalId || message.orderValue, ""
                                                        );
                                                    }}
                                                />
                                            );
                                        }

                                        if (!M.d[v.h] && !NODE_DOESNT_EXISTS_ANYMORE[v.h]) {
                                            dbfetch.get(v.h)
                                                .always(function() {
                                                    if (!M.d[v.h]) {
                                                        NODE_DOESNT_EXISTS_ANYMORE[v.h] = true;
                                                        dd.doRerender();
                                                    }
                                                    else {
                                                        dd.doRerender();
                                                    }
                                                });
                                            return <span>{l[5533]}</span>;
                                        }
                                        else if (!NODE_DOESNT_EXISTS_ANYMORE[v.h]) {
                                            downloadButton = <DropdownsUI.DropdownItem
                                                icon="rounded-grey-down-arrow"
                                                label={__(l[1187])}
                                                onClick={self._startDownload.bind(self, v)}/>;

                                            if (M.getNodeRoot(v.h) !== M.RubbishID) {
                                                self._addLinkButtons(v.h, linkButtons);
                                            }

                                            firstGroupOfButtons.push(
                                                <DropdownsUI.DropdownItem
                                                    icon="context info"
                                                    label={__(l[6859])}
                                                    key="infoDialog"
                                                    onClick={() => {
                                                        $.selected = [v.h];
                                                        propertiesDialog();
                                                    }}
                                                />
                                            );


                                            self._addFavouriteButtons(v.h, firstGroupOfButtons);

                                            linkButtons.push(
                                                <DropdownsUI.DropdownItem
                                                    icon="small-icon conversations"
                                                    label={__(l[17764])}
                                                    key="sendToChat"
                                                    onClick={() => {
                                                        $.selected = [v.h];
                                                        openCopyDialog('conversations');
                                                    }}
                                                />
                                            );

                                        }

                                            if (
                                                !previewButton &&
                                                firstGroupOfButtons.length === 0 &&
                                                !downloadButton &&
                                                linkButtons.length === 0 &&
                                                !revokeButton
                                            ) {
                                                return null;
                                            }

                                            if (
                                                previewButton && (
                                                    firstGroupOfButtons.length > 0 ||
                                                    downloadButton ||
                                                    linkButtons.length > 0 ||
                                                    revokeButton
                                                )
                                            ) {
                                                previewButton = [previewButton, <hr key="preview-sep"/>];
                                            }


                                            return <div>
                                                {previewButton}
                                                {firstGroupOfButtons}
                                                {firstGroupOfButtons && firstGroupOfButtons.length > 0 ? <hr /> : ""}
                                                {downloadButton}
                                                {linkButtons}
                                                {revokeButton && downloadButton ? <hr /> : ""}
                                                {revokeButton}
                                            </div>;
                                        }}
                                    />
                                </ButtonsUI.Button>;
                        }
                        else {
                            dropdown = <ButtonsUI.Button
                                className="default-white-button tiny-button"
                                icon="tiny-icon icons-sprite grey-dots">
                                <DropdownsUI.Dropdown
                                    className="white-context-menu attachments-dropdown"
                                    noArrow={true}
                                    positionMy="left top"
                                    positionAt="left bottom"
                                    horizOffset={-4}
                                    vertOffset={3}
                                >
                                    {previewButton}
                                    <hr/>
                                    <DropdownsUI.DropdownItem icon="rounded-grey-down-arrow" label={__(l[1187])}
                                                              onClick={self._startDownload.bind(self, v)}/>
                                    <DropdownsUI.DropdownItem icon="grey-cloud" label={__(l[1988])}
                                                              onClick={self._addToCloudDrive.bind(self, v, false)}/>
                                    <DropdownsUI.DropdownItem icon="conversations" label={__(l[17764])}
                                                              onClick={self._addToCloudDrive.bind(self, v, true)}/>
                                </DropdownsUI.Dropdown>
                            </ButtonsUI.Button>;
                        }


                        var attachmentClasses = "message shared-data";
                        var preview = <div className={"data-block-view medium " + noThumbPrev}
                                           onClick={isPreviewable ? self._startPreview.bind(self, v) : undefined}>
                            {dropdown}

                            <div className="data-block-bg">
                                <div className={"block-view-file-type " + icon}></div>
                            </div>
                        </div>;

                        if (showThumbnail) {
                            var src = v.src || window.noThumbURI || '';
                            var thumbClass = v.src ? '' : " no-thumb";
                            var thumbOverlay = null;

                            if (isImage) {
                                thumbClass = thumbClass + " image";
                                thumbOverlay = <div className="thumb-overlay"
                                                    onClick={self._startPreview.bind(self, v)}></div>;
                            }
                            else {
                                thumbClass = thumbClass + " video " + (
                                    isPreviewable ? " previewable" : "non-previewable"
                                );
                                thumbOverlay = <div className="thumb-overlay"
                                                    onClick={
                                                        isPreviewable ? self._startPreview.bind(self, v) : undefined
                                                    }>
                                    {isPreviewable && <div className="play-video-button"></div>}
                                    <div className="video-thumb-details">
                                        {v.playtime && <i className="small-icon small-play-icon"></i>}
                                        <span>{secondsToTimeShort(v.playtime || -1)}</span>
                                    </div>
                                </div>;
                            }

                            preview = (src ? (<div id={v.ch} className={"shared-link thumb " + thumbClass}>
                                {thumbOverlay}
                                {dropdown}

                                <img alt="" className={"thumbnail-placeholder " + v.h} src={src}
                                     key={'thumb-' + v.ch}
                                     onClick={isPreviewable ? self._startPreview.bind(self, v) : undefined}
                                />
                            </div>) : preview);
                        }

                        files.push(
                            <div className={attachmentClasses} key={'atch-' + v.ch}>
                                <div className="message shared-info">
                                    <div className="message data-title">
                                        {__(l[17669])}
                                        <span className="file-name">{v.name}</span>
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
                        avatar = <Avatar contact={contact} className="message avatar-wrapper small-rounded-avatar"/>;
                        datetime = <div className="message date-time simpletip"
                                        data-simpletip={time2date(timestampInt)}>{timestamp}</div>;
                        name = <ContactButton contact={contact} className="message" label={displayName} />;
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
                else if (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.CONTACT) {
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

                        if (
                            message.userId === u_handle &&
                            (unixtime() - message.delay) < MESSAGE_NOT_EDITABLE_TIMEOUT
                        ) {
                            deleteButtonOptional = <DropdownsUI.DropdownItem
                                icon="red-cross"
                                label={l[83]}
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
                                'c': undefined
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
                                icon="tiny-icon icons-sprite grey-dots">
                                <DropdownsUI.Dropdown
                                    className="white-context-menu shared-contact-dropdown"
                                    noArrow={true}
                                    positionMy="left bottom"
                                    positionAt="right bottom"
                                    horizOffset={4}
                                >

                                    <div className="dropdown-avatar rounded">
                                        <Avatar className="avatar-wrapper context-avatar" contact={M.u[contact.u]} />
                                        <div className="dropdown-user-name">
                                             <div className="name">
                                                 {M.getNameByHandle(contact.u)}
                                                 <ContactPresence className="small" contact={contact} />
                                            </div>
                                            <div className="email">
                                                 {M.u[contact.u].m}
                                            </div>
                                        </div>
                                    </div>
                                    <ContactFingerprint contact={M.u[contact.u]} />

                                    <DropdownsUI.DropdownItem
                                        icon="human-profile"
                                        label={__(l[5868])}
                                        onClick={() => {
                                            loadSubPage("fm/" + contact.u);
                                        }}
                                    />
                                    <hr/>
                                    { null /*<DropdownsUI.DropdownItem
                                     icon="rounded-grey-plus"
                                     label={__(l[8631])}
                                     onClick={() => {
                                     loadSubPage("fm/" + contact.u);
                                     }}
                                     />*/}
                                    <DropdownsUI.DropdownItem
                                        icon="conversations"
                                        label={__(l[8632])}
                                        onClick={() => {
                                            loadSubPage("fm/chat/p/" + contact.u);
                                        }}
                                    />
                                    {deleteButtonOptional ? <hr /> : null}
                                    {deleteButtonOptional}
                                </DropdownsUI.Dropdown>
                            </ButtonsUI.Button>;
                        }
                        else if (M.u[contact.u] && !M.u[contact.u].c) {
                            dropdown = <ButtonsUI.Button
                                className="default-white-button tiny-button"
                                icon="tiny-icon icons-sprite grey-dots">
                                <DropdownsUI.Dropdown
                                    className="white-context-menu shared-contact-dropdown"
                                    noArrow={true}
                                    positionMy="left bottom"
                                    positionAt="right bottom"
                                    horizOffset={4}
                                >

                                    <div className="dropdown-avatar rounded">
                                        <Avatar className="avatar-wrapper context-avatar" contact={M.u[contact.u]} />
                                        <div className="dropdown-user-name">
                                             <div className="name">
                                                 {M.getNameByHandle(contact.u)}
                                                 <ContactPresence className="small" contact={contact} />
                                            </div>
                                            <div className="email">
                                                 {M.u[contact.u].m}
                                            </div>
                                        </div>
                                    </div>

                                    <DropdownsUI.DropdownItem
                                        icon="rounded-grey-plus"
                                        label={__(l[71])}
                                        onClick={() => {
                                            var exists = false;
                                            Object.keys(M.opc).forEach(function(k) {
                                                if (!exists
                                                    && M.opc[k].m === contactEmail
                                                    && !M.opc[k].hasOwnProperty('dts')) {
                                                    exists = true;
                                                    return false;
                                                }
                                            });

                                            if (exists) {
                                                closeDialog();
                                                msgDialog('warningb', '', l[17545]);
                                            }
                                            else {
                                                M.inviteContact(M.u[u_handle].m, contactEmail);

                                                // Contact invited
                                                var title = l[150];

                                                // The user [X] has been invited and will appear in your contact list
                                                // once accepted."
                                                var msg = l[5898].replace('[X]', contactEmail);


                                                closeDialog();
                                                msgDialog('info', title, msg);
                                            }
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
                                            <ContactVerified className="right-align" contact={M.u[contact.u]} /> :
                                            null
                                    }

                                    <div className="user-card-email">{contactEmail}</div>
                                </div>
                                <div className="message shared-data">
                                    <div className="data-block-view semi-big">
                                        {
                                            M.u[contact.u] ?
                                                <ContactPresence className="small" contact={M.u[contact.u]} /> :
                                                null
                                        }
                                        {dropdown}
                                        <Avatar className="avatar-wrapper medium-avatar" contact={M.u[contact.u]} />
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
                        avatar = <Avatar contact={contact} className="message avatar-wrapper small-rounded-avatar"/>;
                        datetime = <div className="message date-time simpletip"
                                        data-simpletip={time2date(timestampInt)}>{timestamp}</div>;
                        name = <ContactButton contact={contact} className="message" label={displayName} />;
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
                else if (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT) {
                    // don't show anything if this is a 'revoke' message
                    return null;
                }
                else if (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP) {
                    let avatar = null;
                    let messageActionButtons = null;

                    if (this.props.grouped) {
                        additionalClasses += " grouped";
                    }
                    else {
                        avatar = (
                            <Avatar
                                contact={contact}
                                className="message avatar-wrapper small-rounded-avatar"
                            />
                        );
                        datetime = <div className="message date-time simpletip"
                                        data-simpletip={time2date(timestampInt)}>{timestamp}</div>;
                        name = <ContactButton contact={contact} className="message" label={displayName} />;
                    }

                    const attachmentMetadata = message.getAttachmentMeta() || [];
                    let audioContainer = null;

                    attachmentMetadata.forEach((v) => {
                        audioContainer = (
                            <AudioContainer
                                h={v.h}
                                mime={v.mime}
                                playtime={v.playtime}
                                audioId={`vm${message.messageId}`}
                            />
                        );
                    });

                    const iAmSender = (contact && contact.u === u_handle);
                    const stillEditable = (unixtime() - message.delay) < MESSAGE_NOT_EDITABLE_TIMEOUT;
                    const isBeingEdited = (self.isBeingEdited() === true);
                    const chatIsReadOnly = (chatRoom.isReadOnly() === true);

                    if (iAmSender && stillEditable && !isBeingEdited && !chatIsReadOnly && !self.props.dialog) {
                        const deleteButton = (
                            <DropdownsUI.DropdownItem
                                icon="red-cross"
                                label={__(l[1730])}
                                className="red"
                                onClick={(e) => {
                                    self.doDelete(e, message);
                                }}
                            />
                        );

                        messageActionButtons = (
                            <ButtonsUI.Button
                                className="default-white-button tiny-button"
                                icon="tiny-icon icons-sprite grey-dots">
                                <DropdownsUI.Dropdown
                                    className="white-context-menu attachments-dropdown"
                                    noArrow={true}
                                    positionMy="left bottom"
                                    positionAt="right bottom"
                                    horizOffset={4}
                                >
                                {deleteButton}
                                </DropdownsUI.Dropdown>
                            </ButtonsUI.Button>
                        );
                    }

                    return (
                        <div className={message.messageId + " message body" + additionalClasses}>
                            {avatar}
                            <div className="message content-area">
                                {name}
                                {datetime}
                                {messageActionButtons}
                                <div className="message shared-block">
                                    {files}
                                </div>
                                {buttonsBlock}
                                {spinnerElement}
                                {audioContainer}
                            </div>
                        </div>
                    );
                }
                else {
                    chatRoom.logger.warn("Invalid 2nd byte for a management message: ", textContents);
                    return null;
                }
            }
            else {
                // this is a text message.
                let geoLocation = null;

                if (message.textContents === "" && !message.dialogType) {
                    message.deleted = true;
                }

                if (!message.deleted) {
                    if (message.metaType === Message.MESSAGE_META_TYPE.RICH_PREVIEW) {
                        if (!message.meta.requiresConfirmation) {
                            subMessageComponent.push(<MetaRichpreview
                                key={"richprev"}
                                message={message}
                                chatRoom={chatRoom}
                            />);
                            if (message.isEditable()) {
                                if (!message.meta.isLoading) {
                                    extraPreButtons.push(
                                        <DropdownsUI.DropdownItem
                                            key="remove-link-preview"
                                            icon="icons-sprite bold-crossed-eye"
                                            label={l[18684]}
                                            className=""
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();

                                                chatRoom.megaChat.plugins.richpreviewsFilter.revertToText(
                                                    chatRoom,
                                                    message
                                                );
                                            }}
                                        />
                                    );
                                }
                                else {
                                    // still loading, cancel loading?
                                    extraPreButtons.push(
                                        <DropdownsUI.DropdownItem
                                            icon="icons-sprite bold-crossed-eye"
                                            key="stop-link-preview"
                                            label={l[18684]}
                                            className=""
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();

                                                chatRoom.megaChat.plugins.richpreviewsFilter.cancelLoading(
                                                    chatRoom,
                                                    message
                                                );
                                            }}
                                        />
                                    );
                                }
                            }
                        }
                        else if (!self.isBeingEdited()) {
                            if (
                                message.source === Message.SOURCE.SENT ||
                                message.confirmed === true
                            ) {
                                additionalClasses += " preview-requires-confirmation-container";
                                subMessageComponent.push(
                                    <MetaRichpreviewConfirmation
                                        key={"confirm"}
                                        message={message}
                                        chatRoom={chatRoom}
                                    />
                                );
                            }
                            else {
                                extraPreButtons.push(
                                    <DropdownsUI.DropdownItem
                                        key="insert-link-preview"
                                        icon="icons-sprite bold-eye"
                                        label={l[18683]}
                                        className=""
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();

                                            chatRoom.megaChat.plugins.richpreviewsFilter.insertPreview(message);
                                        }}
                                    />
                                );
                            }
                        }


                    }
                    else if (message.metaType === Message.MESSAGE_META_TYPE.GEOLOCATION) {
                        const { lng, la: latitude } = message.meta.extra[0];
                        geoLocation = (
                            <GeoLocation latitude={latitude} lng={lng}/>
                        );
                    }
                    if (message.megaLinks) {
                        subMessageComponent.push(<MetaRichpreviewMegaLinks
                            key={"richprevml"}
                            message={message}
                            chatRoom={chatRoom}
                        />);
                    }
                }

                var messageActionButtons = null;
                if (
                    message.getState() === Message.STATE.NOT_SENT ||
                    message.getState() === Message.STATE.NOT_SENT_EXPIRED
                ) {
                    messageActionButtons = null;

                    if (!spinnerElement) {
                        if (!message.requiresManualRetry) {
                            messageNotSendIndicator = <div className="not-sent-indicator tooltip-trigger"
                                                           data-tooltip="not-sent-notification">
                                <i className="small-icon yellow-triangle"></i>
                            </div>;
                        }
                        else {
                            if (self.isBeingEdited()  !== true) {
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
                    avatar = <Avatar contact={contact} className="message avatar-wrapper small-rounded-avatar"/>;
                    datetime = <div className="message date-time simpletip"
                                    data-simpletip={time2date(timestampInt)}>{timestamp}</div>;
                    name = <ContactButton contact={contact} className="message" label={displayName} />;
                }

                var messageDisplayBlock;
                if (self.isBeingEdited() === true) {
                    var msgContents = message.textContents;
                    msgContents = megaChat.plugins.emoticonsFilter.fromUtfToShort(msgContents);

                    messageDisplayBlock = <TypingArea
                        iconClass="small-icon writing-pen textarea-icon"
                        initialText={msgContents}
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
                                    var tmpMessageObj = {
                                        'textContents': messageContents
                                    };
                                    megaChat.plugins.emoticonsFilter.processOutgoingMessage({}, tmpMessageObj);
                                    self.props.onEditDone(tmpMessageObj.textContents);
                                    if (self.isMounted()) {
                                        self.forceUpdate();
                                    }
                                });
                            }

                            return true;
                        }}
                    />;
                }
                else if (message.deleted) {
                    return null;
                }
                else {
                    if (message.updated > 0 && !message.metaType) {
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
                        self.isBeingEdited() !== true &&
                        chatRoom.isReadOnly() === false &&
                        !message.requiresManualRetry
                    ) {
                        var editButton = (message.metaType !== Message.MESSAGE_META_TYPE.GEOLOCATION) ?
                            <DropdownsUI.DropdownItem
                                icon="icons-sprite writing-pencil"
                                label={__(l[1342])}
                                className=""
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();

                                    self.setState({'editing': true});
                                }} /> :
                            null;

                        messageActionButtons = <ButtonsUI.Button
                            className="default-white-button tiny-button"
                            icon="tiny-icon icons-sprite grey-dots">
                            <DropdownsUI.Dropdown
                                className="white-context-menu attachments-dropdown"
                                noArrow={true}
                                positionMy="left bottom"
                                positionAt="right bottom"
                                horizOffset={4}
                            >
                                {extraPreButtons}
                                {editButton}
                                {editButton ? <hr/> : null}
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
                const isGeoLocation = message.metaType === Message.MESSAGE_META_TYPE.GEOLOCATION;

                if (isGeoLocation) {
                    messageDisplayBlock = null;
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
                            {subMessageComponent}
                            {buttonsBlock}
                            {spinnerElement}
                            {geoLocation}
                        </div>
                    </div>
                );
            }
        }
        // if this is an inline dialog
        else if (message.type) {
            var avatarsListing = [];
            textMessage = getMessageString(
                message.type,
                message.chatRoom.type === "group" || message.chatRoom.type === "public"
            );

            if (!textMessage) {
                console.error("Message with type: ", message.type, " - no text string defined. Message: ", message);
                return;
            }
            // if is an array.

            textMessage = CallManager._getMultiStringTextContentsForMessage(
                message,
                textMessage.splice ? textMessage : [textMessage],
                true
            );

            message.textContents = String(textMessage)
                .replace("[[", "<span class=\"bold\">")
                .replace("]]", "</span>");

            var avatar = null;
            var name = null;

            // mapping css icons to msg types
            if (message.showInitiatorAvatar) {
                if (this.props.grouped) {
                    additionalClasses += " grouped";
                }
                else {
                    avatar = <Avatar contact={message.authorContact}
                                                className="message avatar-wrapper small-rounded-avatar"/>;
                    displayName = M.getNameByHandle(message.authorContact.u);
                    name = <ContactButton contact={contact} className="message" label={displayName} />;
                }
            }

            if (message.type === "call-rejected") {
                message.cssClass = "handset-with-stop";
            }
            else if (message.type === "call-missed") {
                message.cssClass = "handset-with-yellow-arrow"
            }
            else if (message.type === "call-handled-elsewhere") {
                message.cssClass = "handset-with-up-arrow";
            }
            else if (message.type === "call-failed") {
                message.cssClass = "handset-with-cross";
            }
            else if (message.type === "call-timeout") {
                message.cssClass = "horizontal-handset";
            }
            else if (message.type === "call-failed-media") {
                message.cssClass = "handset-with-yellow-cross";
            }
            else if (message.type === "call-canceled") {
                message.cssClass = "crossed-handset";
            }
            else if (message.type === "call-ended") {
                message.cssClass = "horizontal-handset";
            }
            else if (message.type === "call-feedback") {
                message.cssClass = "diagonal-handset";
            }
            else if (message.type === "call-starting") {
                message.cssClass = "diagonal-handset";
            }
            else if (message.type === "call-initialising") {
                message.cssClass = "diagonal-handset";
            }
            else if (message.type === "call-started") {
                message.cssClass = "diagonal-handset";
            }
            else if (message.type === "incoming-call") {
                message.cssClass = "handset-with-down-arrow";
            }
            else if (message.type === "outgoing-call") {
                message.cssClass = "handset-with-up-arrow";
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
                        <div className={classes} key={k}  onClick={((e) => { button.callback.call(e.target); })}>
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

            if (
                message.chatRoom.type === "group" || message.chatRoom.type === "public"
            ) {
                var participantNames = [];
                (message.meta && message.meta.participants || []).forEach(function(handle) {
                    var name = M.getNameByHandle(handle);
                    name && participantNames.push("[[" + htmlentities(name) + "]]");
                });


                additionalClasses += (
                    message.type !== "outgoing-call" && message.type != "incoming-call" ? " with-border" : ""
                );
                var translationString = "";

                if (participantNames && participantNames.length > 0) {
                    translationString += mega.utils.trans.listToString(participantNames, l[20234]);
                }

                if (
                    (message.type === "call-ended" || message.type === "call-failed") &&
                    message.meta &&
                    message.meta.duration
                ) {
                    translationString += (participantNames && participantNames.length > 0 ? ". " : "") +
                        l[7208].replace(
                            "[X]",
                            "[[" + secToDuration(message.meta.duration) + "]]"
                        );
                }
                translationString = translationString.replace(/\[\[/g, "<span class=\"bold\">")
                    .replace(/\]\]/g, "</span>");

                if (message.type === "call-started") {
                    textMessage = '<i class="call-icon diagonal-handset green"></i>' + textMessage;
                }
                else if (message.type === "call-ended") {
                    textMessage = '<i class="call-icon big horizontal-handset grey"></i>' + textMessage;
                }
                else if (message.type !== "outgoing-call" && message.type !== "incoming-call") {
                    textMessage = '<i class="call-icon ' + message.cssClass + '"></i>' + textMessage;
                }

                textMessage = "<div class=\"bold mainMessage\">" + textMessage + "</div>" +
                    "<div class=\"extraCallInfo\">" + translationString + "</div>";

                if (
                    message.type === "call-started" &&
                    message.messageId === "call-started-" + chatRoom.getActiveCallMessageId()
                ) {
                    var unique = chatRoom.uniqueCallParts ? Object.keys(chatRoom.uniqueCallParts) : [];
                    unique.forEach(function(handle) {
                        avatarsListing.push(
                            <Avatar
                                key={handle}
                                contact={M.u[handle]}
                                simpletip={M.u[handle] && M.u[handle].name}
                                className="message avatar-wrapper small-rounded-avatar"
                            />
                        );
                    });
                }
            }


            return (
                <div className={message.messageId + " message body" + additionalClasses}
                     data-id={"id" + message.messageId}>
                    {!message.showInitiatorAvatar ? (
                        <div className="feedback call-status-block">
                            <i className={"call-icon " + message.cssClass}></i>
                        </div>
                        ) : (
                            avatar
                        )
                    }

                    <div className="message content-area">
                        {name}
                        <div className="message date-time simpletip" data-simpletip={time2date(timestampInt)}>
                            {timestamp}
                        </div>

                        <div className="message text-block">
                            <div className="message call-inner-block">
                                {avatarsListing}
                                <div dangerouslySetInnerHTML={{__html:textMessage}}/>
                            </div>
                        </div>

                        {buttonsCode}
                    </div>
                </div>
            )
        }
    }
};

export {
    GenericConversationMessage
};
