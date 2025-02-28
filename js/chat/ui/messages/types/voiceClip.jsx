import React from 'react';
import AbstractGenericMessage from '../abstractGenericMessage.jsx';
import { Dropdown, DropdownItem } from '../../../../ui/dropdowns.jsx';
import { Button } from '../../../../ui/buttons.jsx';
import AudioContainer from './partials/audioContainer.jsx';

export default class VoiceClip extends AbstractGenericMessage {
    _getActionButtons() {
        const { isBeingEdited, chatRoom, message, dialog, onDelete } = this.props;
        if (message.isEditable() && !isBeingEdited() && !chatRoom.isReadOnly() && !dialog) {
            return (
                <Button
                    className="tiny-button"
                    icon="tiny-icon icons-sprite grey-dots">
                    <Dropdown
                        className="white-context-menu attachments-dropdown"
                        noArrow={true}
                        positionMy="left bottom"
                        positionAt="right bottom"
                        horizOffset={4}>
                        <DropdownItem
                            icon="sprite-fm-mono icon-dialog-close"
                            label={l[1730] /* `Delete` */}
                            onClick={ev => onDelete(ev, message)}
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
