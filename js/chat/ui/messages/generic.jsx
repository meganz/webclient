import React from 'react';
import { ConversationMessageMixin } from './mixin.jsx';
import Local from './types/local.jsx';
import Contact from './types/contact.jsx';
import Attachment from './types/attachment.jsx';
import VoiceClip from './types/voiceClip.jsx';
import Text from './types/text.jsx';
import Giphy from './types/giphy.jsx';
import { DropdownItem } from '../../../ui/dropdowns.jsx';


// eslint-disable-next-line id-length
const CLICKABLE_ATTACHMENT_CLASSES =
    '.message.data-title, .message.file-size, .data-block-view.semi-big, .data-block-view.medium';

export default class GenericConversationMessage extends ConversationMessageMixin {
    constructor(props) {
        super(props);

        this.state = {
            editing: this.props.editing
        };

        this.pid = '__geom_' + String(Math.random()).substr(2);
    }

    isBeingEdited() {
        return this.state.editing === true || this.props.editing === true;
    }

    componentDidUpdate(oldProps, oldState) {
        const isBeingEdited = this.isBeingEdited();
        const isMounted = this.isMounted();

        if (isBeingEdited && isMounted) {
            const $generic = $(this.findDOMNode());
            const $textarea = $('textarea', $generic);

            if ($textarea.length > 0 && !$textarea.is(":focus")) {
                $textarea.trigger("focus");
                moveCursortoToEnd($textarea[0]);
            }

            if (!oldState.editing && this.props.onEditStarted) {
                this.props.onEditStarted($generic);
                moveCursortoToEnd($textarea);
            }
        }

        if (isMounted && !isBeingEdited && oldState.editing === true && this.props.onUpdate) {
            this.props.onUpdate();
        }
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

        var SHARED_INFO_CLS = '.shared-info';
        $node.rebind(
            'click.dropdownShortcut',
            CLICKABLE_ATTACHMENT_CLASSES,
            function(e){
                const $target = $(e.target);
                if ($target.hasClass('button')) {
                    // prevent recursion
                    return;
                }
                if (
                    $target.hasClass('no-thumb-prev')
                    || $target.parents('.no-thumb-prev').length
                ) {
                    // don't show the dropdown clicking an item without thumbnail but do when clicking the meta info
                    return;
                }

                let $block;
                if ($target.is('.shared-data')) {
                    $block = $target;
                }
                else if (
                    $target.is(SHARED_INFO_CLS) || $target.parents(SHARED_INFO_CLS).length > 0
                ) {
                    $block = $target.is(SHARED_INFO_CLS) ?
                        $target.next() : $target.parents(SHARED_INFO_CLS).next();
                }
                else {
                    $block = $target.parents('.message.shared-data');
                }


                Soon(function() {
                    // a delay is needed, otherwise React would receive the same click event and close the dropdown
                    // even before displaying it in the UI.
                    $('.tiny-button', $block).trigger('click');
                });
            });
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        var self = this;
        var $node = $(self.findDOMNode());

        self.props.message.off('onChange.GenericConversationMessage' + self.getUniqueId());
        $node.off('click.dropdownShortcut', CLICKABLE_ATTACHMENT_CLASSES);
    }

    haveMoreContactListeners() {
        if (!this.props.message || !this.props.message.meta) {
            return false;
        }

        if (this.props.message.meta && this.props.message.meta.participants) {
            // call ended type of message
            return this.props.message.meta.participants;
        }
        return false;
    }

    doDelete(e, msg) {
        e.preventDefault(e);
        e.stopPropagation(e);

        if (msg.getState() === Message.STATE.NOT_SENT_EXPIRED) {
            this.doCancelRetry(e, msg);
        }
        else {
            this.props.onDeleteClicked(this.props.message);
        }
    }

    doCancelRetry(e, msg) {
        e.preventDefault(e);
        e.stopPropagation(e);

        const chatRoom = this.props.message.chatRoom;
        const messageId = msg.messageId;

        chatRoom.messagesBuff.messages.removeByKey(messageId);
        chatRoom.megaChat.plugins.chatdIntegration.discardMessage(chatRoom, messageId);
    }

    doRetry(e, msg) {
        e.preventDefault(e);
        e.stopPropagation(e);

        const chatRoom = this.props.message.chatRoom;

        this.doCancelRetry(e, msg);
        chatRoom._sendMessageToTransport(msg)
            .then(internalId => {
                msg.internalId = internalId;
                this.safeForceUpdate();
            });
    }

    _favourite(h) {
        if (M.isInvalidUserStatus()) {
            return;
        }
        var newFavState = Number(!M.isFavourite(h));
        M.favourite([h], newFavState);
    }

    _addFavouriteButtons(h, arr) {
        var self = this;

        if (M.getNodeRights(h) > 1) {
            var isFav = M.isFavourite(h);

            arr.push(
                <DropdownItem
                    icon={`
                        sprite-fm-mono
                        context
                        ${isFav ? 'icon-favourite-removed' : 'icon-favourite'}
                    `}
                    label={isFav ? l[5872] : l[5871]}
                    isFav={isFav}
                    key="fav"
                    disabled={mega.paywall}
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
        return false;
    }

    _isNodeHavingALink(h) {
        return M.getNodeShare(h) !== false;
    }

    _addLinkButtons(h, arr) {
        var self = this;

        var haveLink = self._isNodeHavingALink(h) === true;

        var getManageLinkText = haveLink ? l[6909] : l[5622];

        arr.push(
            <DropdownItem
                icon="sprite-fm-mono icon-link"
                key="getLinkButton"
                label={getManageLinkText}
                disabled={mega.paywall}
                onClick={self._getLink.bind(self, h)}
            />);

        if (haveLink) {
            arr.push(
                <DropdownItem
                    icon="sprite-fm-mono context icon-link-remove"
                    key="removeLinkButton"
                    label={l[6821]}
                    disabled={mega.paywall}
                    onClick={self._removeLink.bind(self, h)}
                />
            );
            return true;
        }
        return false;
    }

    _startDownload(v) {
        M.addDownload([v]);
    }

    _addToCloudDrive(v, openSendToChat) {
        $.selected = [v.h];
        $.chatAttachmentShare = true;
        if ($.dialog === 'onboardingDialog') {
            closeDialog();
        }
        openSaveToDialog(v, function(node, target) {
            if (Array.isArray(target)) {

                megaChat.openChatAndAttachNodes(target, node.ch || node.h).catch(tell);
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
                        msgDialog(
                            'info',
                            l[8005],
                            // Confirmation message based on the selected location.
                            // a) `Attachment added to Cloud Drive.` for the root directory or none selected (default)
                            // b) `Attachment added to %s.`
                            target === M.RootID ? l[8006] : l[22903].replace('%s', escapeHTML(M.d[target].name))
                        );
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

        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        M.viewMediaFile(v);
    }


    render() {
        const { message, chatRoom } = this.props;
        const megaChat = this.props.message.chatRoom.megaChat;

        let textContents = message.textContents;
        let additionalClasses = "";
        let spinnerElement = null;
        let messageIsNowBeingSent = false;

        if (this.props.className) {
            additionalClasses += this.props.className;
        }

        // if this is a text msg.
        if (message instanceof Message) {
            if (!message.wasRendered || !message.messageHtml) {
                // Convert ot HTML and pass it to plugins to do their magic on styling the message if needed.
                message.messageHtml = htmlentities(textContents).replace(/\n/gi, "<br/>").replace(/\t/g, '    ');
                message.processedBy = {};
                const evtObj = { message, room: chatRoom };

                megaChat.trigger('onPreBeforeRenderMessage', evtObj);
                const event = new MegaDataEvent('onBeforeRenderMessage');
                megaChat.trigger(event, evtObj);
                megaChat.trigger('onPostBeforeRenderMessage', evtObj);

                if (event.isPropagationStopped()) {
                    this.logger.warn(`Event propagation stopped receiving (rendering) of message: ${message}`);
                    return false;
                }
                message.wasRendered = 1;
            }

            var state = message.getState();
            var stateText = message.getStateText(state);

            if (state === Message.STATE.NOT_SENT) {
                messageIsNowBeingSent = (unixtime() - message.delay < 5);

                if (messageIsNowBeingSent) {
                    additionalClasses += ' sending';
                    spinnerElement = <div className="small-blue-spinner" />;

                    if (!message.sending) {
                        message.sending = true;
                        delay(this.pid + message.messageId, () => {
                            if (chatRoom.messagesBuff.messages[message.messageId] && message.sending === true) {
                                chatRoom.messagesBuff.trackDataChange();
                                if (this.isMounted()) {
                                    this.forceUpdate();
                                }
                            }
                        }, (5 - (unixtime() - message.delay)) * 1000);
                    }
                }
                else {
                    additionalClasses += ' not-sent';

                    if (message.sending === true) {
                        message.sending = false;
                        message.trigger('onChange', [message, 'sending', true, false]);
                    }

                    if (message.requiresManualRetry) {
                        additionalClasses += ' retrying requires-manual-retry';
                    }
                    else {
                        additionalClasses += ' retrying';
                    }
                }
            }
            else {
                additionalClasses += ' ' + stateText;
            }
        }

        // --


        const MESSAGE = {
            TYPE: {
                ATTACHMENT: textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT,
                CONTACT: textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.CONTACT,
                REVOKE_ATTACHMENT: textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT,
                VOICE_CLIP: textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP,
                GIPHY: message.metaType && message.metaType === Message.MESSAGE_META_TYPE.GIPHY,
                TEXT: textContents[0] !== Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT,
                INLINE: !(message instanceof Message) && message.type && !!message.type.length,
                REVOKED: message.revoked
            },
            props: { ...this.props, additionalClasses },
            isBeingEdited: () => this.isBeingEdited(),
            onDelete: (e, message) => this.doDelete(e, message),
        };

        switch (true) {
            case MESSAGE.TYPE.REVOKED || MESSAGE.TYPE.REVOKE_ATTACHMENT:
                return null;
            case MESSAGE.TYPE.ATTACHMENT:
                return (
                    <Attachment
                        {...MESSAGE.props}
                        onPreviewStart={(v, e) => this._startPreview(v, e)}
                        onDownloadStart={v => this._startDownload(v)}
                        onAddLinkButtons={(h, arr) => this._addLinkButtons(h, arr)}
                        onAddToCloudDrive={(v, openSendToChat) => this._addToCloudDrive(v, openSendToChat)}
                        onAddFavouriteButtons={(h, arr) => this._addFavouriteButtons(h, arr)}
                    />
                );
            case MESSAGE.TYPE.CONTACT:
                return (
                    <Contact
                        {...MESSAGE.props}
                        onDelete={MESSAGE.onDelete}
                    />
                );
            case MESSAGE.TYPE.VOICE_CLIP:
                return (
                    <VoiceClip
                        {...MESSAGE.props}
                        isBeingEdited={MESSAGE.isBeingEdited}
                        onDelete={MESSAGE.onDelete}
                    />
                );
            case MESSAGE.TYPE.INLINE:
                return (
                    <Local {...MESSAGE.props} />
                );
            case MESSAGE.TYPE.GIPHY:
                return (
                    <Giphy
                        {...MESSAGE.props}
                        onDelete={MESSAGE.onDelete}
                    />
                );
            case MESSAGE.TYPE.TEXT:
                return (
                    <Text
                        {...MESSAGE.props}
                        onEditToggle={editing => this.setState({ editing })}
                        onDelete={MESSAGE.onDelete}
                        onRetry={(e, message) => this.doRetry(e, message)}
                        onCancelRetry={(e, message) => this.doCancelRetry(e, message)}
                        isBeingEdited={MESSAGE.isBeingEdited}
                        spinnerElement={spinnerElement}
                    />
                );
            default:
                return null;
        }
    }
}
