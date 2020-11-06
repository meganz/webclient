import React from 'react';
import AbstractGenericMessage from '../abstractGenericMessage.jsx';
import { MetaRichpreview } from './partials/metaRichpreview.jsx';
import { MetaRichprevConfirmation } from './partials/metaRichpreviewConfirmation.jsx';
import GeoLocation from './partials/geoLocation.jsx';
import { MetaRichpreviewMegaLinks } from './partials/metaRichpreviewMegaLinks.jsx';
import { TypingArea } from '../../typingArea.jsx';
import { Dropdown, DropdownItem } from '../../../../ui/dropdowns.jsx';
import { Button } from '../../../../ui/buttons.jsx';
import utils from '../../../../ui/utils.jsx';

export default class Text extends AbstractGenericMessage {

    isRichPreview = message => message.metaType === Message.MESSAGE_META_TYPE.RICH_PREVIEW;
    isGeoLocation = message => message.metaType === Message.MESSAGE_META_TYPE.GEOLOCATION;

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
                                icon="icons-sprite bold-crossed-eye"
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
                                icon="icons-sprite bold-crossed-eye"
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
                        icon="icons-sprite writing-pencil"
                        label={__(l[1342]) /* `Edit` */}
                        onClick={() => this.props.onEditToggle(true)} />
                );
                messageActionButtons = (
                    <Button
                        key="delete-msg"
                        className="default-white-button tiny-button"
                        icon="tiny-icon icons-sprite grey-dots">
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
                                icon="red-cross"
                                label={__(l[1730]) /* `Delete` */}
                                className="red"
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
                                    <i className="small-icon red-cross"/>
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
                />
            );
        }
        else {
            if (message.updated > 0 && !message.metaType) {
                textMessage = textMessage + " <em>" + l[8887] /* `(edited)` */ + "</em>";
            }
            if (this.props.initTextScrolling) {
                messageDisplayBlock =
                    <utils.JScrollPane className="message text-block scroll">
                        <div className="message text-scroll" dangerouslySetInnerHTML={{ __html: textMessage }} />
                    </utils.JScrollPane>;
            }
            else {
                messageDisplayBlock =
                    <div className="message text-block" dangerouslySetInnerHTML={{ __html: textMessage }} />;
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
