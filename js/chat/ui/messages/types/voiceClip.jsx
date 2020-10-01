import React from 'react';
import AbstractGenericMessage from '../abstractGenericMessage.jsx';
import { Dropdown, DropdownItem } from '../../../../ui/dropdowns.jsx';
import { Button } from '../../../../ui/buttons.jsx';
import AudioContainer from './partials/audioContainer.jsx';

// 1h as confirmed by Mathias
// eslint-disable-next-line id-length
const MESSAGE_NOT_EDITABLE_TIMEOUT = window.MESSAGE_NOT_EDITABLE_TIMEOUT = 60 * 60;

export default class VoiceClip extends AbstractGenericMessage {
    constructor(props) {
        super(props);
    }

    _getActionButtons() {
        const { message } = this.props;
        const contact = this.getContact();
        const iAmSender = contact && contact.u === u_handle;
        const stillEditable = unixtime() - message.delay < MESSAGE_NOT_EDITABLE_TIMEOUT;
        const isBeingEdited = this.props.isBeingEdited() === true;
        const chatIsReadOnly = this.props.chatRoom.isReadOnly() === true;

        if (iAmSender && stillEditable && !isBeingEdited && !chatIsReadOnly && !this.props.dialog) {
            return (
                <Button
                    className="default-white-button tiny-button"
                    icon="tiny-icon icons-sprite grey-dots">
                    <Dropdown
                        className="white-context-menu attachments-dropdown"
                        noArrow={true}
                        positionMy="left bottom"
                        positionAt="right bottom"
                        horizOffset={4}
                    >
                        <DropdownItem
                            icon="red-cross"
                            label={l[1730] /* `Delete` */}
                            className="red"
                            onClick={(e) => this.props.onDelete(e, message)}
                        />
                    </Dropdown>
                </Button>
            );
        }
        return null;
    }

    _getAudioContainer() {
        const { message } = this.props;
        const attachmentMeta = message.getAttachmentMeta();

        if (attachmentMeta && attachmentMeta.length) {
            return attachmentMeta.map(voiceClip =>
                <AudioContainer
                    key={voiceClip.h}
                    h={voiceClip.h}
                    mime={voiceClip.mime}
                    playtime={voiceClip.playtime}
                    audioId={`vm${message.messageId}`}
                />
            );
        }
    }

    getContents() {
        return (
            <>
                {this.props.message.getState() === Message.STATE.NOT_SENT ? null : this._getActionButtons()}
                {this._getAudioContainer()}
            </>
        );
    }
}
