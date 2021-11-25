import React from 'react';
import { MegaRenderMixin } from '../../../mixins';
import ModalDialogsUI from '../../../../ui/modalDialogs';

export default class Ephemeral extends MegaRenderMixin {
    static NAMESPACE = 'ephemeral-dialog'

    buttons = [
        { key: 'ok', label: 'Ok', onClick: this.props.onClose }
    ];

    constructor(props) {
        super(props);
    }

    render() {
        const { ephemeralAccounts, onClose } = this.props;
        const ephemeralAccount = ephemeralAccounts && ephemeralAccounts[ephemeralAccounts.length - 1];
        const ephemeralName = M.getNameByHandle(ephemeralAccount);

        return (
            <ModalDialogsUI.ModalDialog
                name={Ephemeral.NAMESPACE}
                dialogType="message"
                icon="sprite-fm-uni icon-info"
                title={
                    l.ephemeral_title ?
                        l.ephemeral_title.replace('%1', ephemeralName) :
                        `${ephemeralName} is using an ephemeral session.`
                }
                noCloseOnClickOutside={true}
                buttons={this.buttons}
                onClose={onClose}>
                <p>{l.ephemeral_info}</p>
            </ModalDialogsUI.ModalDialog>
        );
    }
}
