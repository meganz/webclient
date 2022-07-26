import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import ModalDialogsUI from '../../../ui/modalDialogs';

export default class Offline extends MegaRenderMixin {
    static NAMESPACE = 'reconnect-dialog';

    buttons = [
        { key: 'ok', label: l[82] /* `Cancel` */, onClick: this.props.onClose },
        { key: 'leave', label: l[5883] /* `Leave call` */, className: 'negative', onClick: this.props.onCallEnd }
    ];

    render() {
        return (
            <ModalDialogsUI.ModalDialog
                name={Offline.NAMESPACE}
                dialogType="message"
                icon="sprite-fm-uni icon-warning"
                title={l.no_internet}
                noCloseOnClickOutside={true}
                buttons={this.buttons}
                onClose={this.props.onClose}>
                <p>{l.no_connection}</p>
            </ModalDialogsUI.ModalDialog>
        );
    }
}
