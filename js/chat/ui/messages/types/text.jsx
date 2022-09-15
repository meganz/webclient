import React from 'react';
import AbstractGenericMessage from '../abstractGenericMessage.jsx';
import { MetaRichpreview } from './partials/metaRichpreview.jsx';
import { MetaRichprevConfirmation } from './partials/metaRichpreviewConfirmation.jsx';
import GeoLocation from './partials/geoLocation.jsx';
import { MetaRichpreviewMegaLinks } from './partials/metaRichpreviewMegaLinks.jsx';
import { TypingArea } from '../../typingArea.jsx';
import { Dropdown, DropdownItem } from '../../../../ui/dropdowns.jsx';
import { Button } from '../../../../ui/buttons.jsx';
import { ParsedHTML } from '../../../../ui/utils.jsx';
import { PerfectScrollbar } from '../../../../ui/perfectScrollbar.jsx';

export default class Text extends AbstractGenericMessage {

    isRichPreview(message) {
        return message.metaType === Message.MESSAGE_META_TYPE.RICH_PREVIEW;
    }

    isGeoLocation(message) {
        return message.metaType === Message.MESSAGE_META_TYPE.GEOLOCATION;
    }

    getClassNames() {
        const { message, isBeingEdited, grouped } = this.props;
        const REQUIRES_CONFIRMATION = (
            this.isRichPreview(message) &&
            message.meta.requiresConfirmation &&
            !isBeingEdited() &&
            (message.source === Message.SOURCE.SENT || message.confirmed === true)
        );

        return `
            ${REQUIRES_CONFIRMATION ? 'preview-requires-confirmation-container' : ''}
            ${grouped ? 'grouped' : ''}
        `;
    }


    getMessageActionButtons() {
        const { chatRoom, message, isBeingEdited } = this.props;

        if (isBeingEdited()) {
            return [];
        }

        let extraPreButtons = [];
        let messageActionButtons = null;
        const IS_GEOLOCATION = this.isGeoLocation(message);

        // some pre-buttons (message specific buttons that are shown before edit and delete)
        if (!message.deleted && this.isRichPreview(message)) {
            if (!message.meta.requiresConfirmation) {
                if (message.isEditable()) {
                    if (message.meta.isLoading) {
                        // still loading, cancel loading?
                        extraPreButtons = [
                            ...extraPreButtons,
                            <DropdownItem
                                icon="sprite-fm-mono icon-eye-hidden"
                                key="stop-link-preview"
                                label={l[18684] /* `Remove preview` */}
                                className=""
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    chatRoom.megaChat.plugins.richpreviewsFilter.cancelLoading(chatRoom, message);
                                }}
                            />
                        ];
                    }
                    else {
                        extraPreButtons = [
                            ...extraPreButtons,
                            <DropdownItem
                                key="remove-link-preview"
                                icon="sprite-fm-mono icon-eye-hidden"
                                label={l[18684] /* `Remove preview` */}
                                className=""
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    chatRoom.megaChat.plugins.richpreviewsFilter.revertToText(chatRoom, message);
                                }}
                            />
                        ];
                    }
                }
            }
            else if (!isBeingEdited() && !(message.source === Message.SOURCE.SENT || message.confirmed === true)) {
                extraPreButtons = [
                    ...extraPreButtons,
                    <DropdownItem
                        key="insert-link-preview"
                        icon="icons-sprite bold-eye"
                        label={l[18683] /* `Insert preview` */}
                        className=""
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            chatRoom.megaChat.plugins.richpreviewsFilter.insertPreview(message);
                        }}
                    />
                ];
            }
        }

        // edit and delete
        if (!message.deleted) {
            const contact = this.getContact();

            if (
                contact && contact.u === u_handle &&
                unixtime() - message.delay < MESSAGE_NOT_EDITABLE_TIMEOUT &&
                isBeingEdited() !== true &&
                chatRoom.isReadOnly() === false &&
                !message.requiresManualRetry
            ) {
                const editButton = !IS_GEOLOCATION && (
                    <DropdownItem
                        icon="sprite-fm-mono icon-rename"
                        label={l[1342] /* `Edit` */}
                        onClick={() => this.props.onEditToggle(true)} />
                );
                messageActionButtons = (
                    <Button
                        key="delete-msg"
                        className="tiny-button"
                        icon="sprite-fm-mono icon-options">
                        <Dropdown
                            className="white-context-menu attachments-dropdown"
                            noArrow={true}
                            positionMy="left bottom"
                            positionAt="right bottom"
                            horizOffset={4}>
                            {extraPreButtons}
                            {editButton}
                            {editButton ? <hr/> : null}
                            <DropdownItem
                                icon="sprite-fm-mono icon-dialog-close"
                                label={l[1730] /* `Delete` */}
                                onClick={e => this.props.onDelete(e, message)}
                            />
                        </Dropdown>
                    </Button>
                );
            }
        }

        let parentButtons;
        if (super.getMessageActionButtons) {
            parentButtons = super.getMessageActionButtons();
        }

        let returnedButtons = [];
        if (messageActionButtons) {
            returnedButtons.push(messageActionButtons);
        }
        if (message.messageHtml.includes('<pre class="rtf-multi">') && message.messageHtml.includes('</pre>')) {
            returnedButtons.push(
                <Button
                    key="copy-msg"
                    className="tiny-button simpletip copy-txt-block"
                    icon="sprite-fm-mono icon-copy"
                    attrs={{
                        'data-simpletip': l.copy_txt_block_tip, /* Copy text block to clipboard. */
                        'data-simpletipoffset': '3',
                        'data-simpletipposition': 'top'
                    }}
                    onClick={() => {
                        copyToClipboard(
                            // Grab text from all blocks
                            message.textContents.replace(/```/g, ''),
                            l.copy_txt_block_toast /* Text block copied to clipboard */
                        );
                    }}
                />
            );
        }
        if (parentButtons) {
            returnedButtons.push(parentButtons);
        }

        return returnedButtons;
    }

    getContents() {
        const { message, chatRoom, onUpdate, isBeingEdited, spinnerElement } = this.props;

        let messageNotSendIndicator;
        let textMessage = message.messageHtml;

        const IS_GEOLOCATION = this.isGeoLocation(message);
        const { lng, la: latitude } = IS_GEOLOCATION && message.meta.extra[0];

        if (message.textContents === '' && !message.dialogType) {
            message.deleted = true;
        }

        let subMessageComponent = [];

        if (!message.deleted) {
            if (this.isRichPreview(message)) {
                if (!message.meta.requiresConfirmation) {
                    subMessageComponent = [
                        ...subMessageComponent,
                        <MetaRichpreview key="richprev" message={message} chatRoom={chatRoom} />
                    ];
                }
                else if (!isBeingEdited()) {
                    if (message.source === Message.SOURCE.SENT || message.confirmed === true) {
                        subMessageComponent = [
                            ...subMessageComponent,
                            <MetaRichprevConfirmation key="confirm" message={message} chatRoom={chatRoom} />
                        ];
                    }
                }
            }

            if (message.megaLinks) {
                subMessageComponent = [
                    ...subMessageComponent,
                    <MetaRichpreviewMegaLinks key="richprevml" message={message} chatRoom={chatRoom} />
                ];
            }
        }

        if (
            message &&
            message.getState &&
            (message.getState() === Message.STATE.NOT_SENT || message.getState() === Message.STATE.NOT_SENT_EXPIRED)
        ) {
            if (!spinnerElement) {
                if (message.requiresManualRetry) {
                    if (isBeingEdited() !== true) {
                        messageNotSendIndicator = (
                            <div className="not-sent-indicator">
                                <span
                                    className="tooltip-trigger"
                                    key="retry"
                                    data-tooltip="not-sent-notification-manual"
                                    onClick={(e) => this.props.onRetry(e, message)}>
                                    <i className="small-icon refresh-circle" />
                                </span>
                                <span
                                    className="tooltip-trigger"
                                    key="cancel"
                                    data-tooltip="not-sent-notification-cancel"
                                    onClick={e => this.props.onCancelRetry(e, message)}>
                                    <i className="sprite-fm-mono icon-dialog-close" />
                                </span>
                            </div>
                        );
                    }
                }
                else {
                    messageNotSendIndicator = (
                        <div className="not-sent-indicator tooltip-trigger" data-tooltip="not-sent-notification">
                            <i className="small-icon yellow-triangle" />
                        </div>
                    );
                }
            }
        }

        let messageDisplayBlock;
        if (isBeingEdited() === true) {
            let msgContents = message.textContents;
            msgContents = megaChat.plugins.emoticonsFilter.fromUtfToShort(msgContents);
            messageDisplayBlock = (
                <TypingArea
                    iconClass="small-icon writing-pen textarea-icon"
                    initialText={msgContents}
                    chatRoom={chatRoom}
                    showButtons={true}
                    editing={true}
                    className="edit-typing-area"
                    onUpdate={() => onUpdate ? onUpdate : null}
                    onConfirm={messageContents => {
                        this.props.onEditToggle(false);
                        if (this.props.onEditDone) {
                            Soon(() => {
                                const tmpMessageObj = { textContents: messageContents };
                                megaChat.plugins.emoticonsFilter.processOutgoingMessage({}, tmpMessageObj);
                                this.props.onEditDone(tmpMessageObj.textContents);
                                if (this.isMounted()) {
                                    this.forceUpdate();
                                }
                            });
                        }
                        return true;
                    }}
                    onResized={this.props.onResized ? this.props.onResized : false}
                />
            );
        }
        else {
            if (message.updated > 0 && !message.metaType) {
                textMessage = `${textMessage} <em class="edited">${l[8887] /* `(edited)` */}</em>`;
            }
            if (this.props.initTextScrolling) {
                messageDisplayBlock =
                    <PerfectScrollbar className="message text-block scroll">
                        <div className="message text-scroll">
                            <ParsedHTML>{textMessage}</ParsedHTML>
                        </div>
                    </PerfectScrollbar>;
            }
            else {
                messageDisplayBlock =
                    <div className="message text-block">
                        <ParsedHTML>{textMessage}</ParsedHTML>
                    </div>;
            }
        }



        return (
            <>
                {messageNotSendIndicator}
                {IS_GEOLOCATION ? null : messageDisplayBlock}
                {subMessageComponent}
                {spinnerElement}
                {IS_GEOLOCATION && <GeoLocation latitude={latitude} lng={lng} />}
            </>
        );
    }
}
