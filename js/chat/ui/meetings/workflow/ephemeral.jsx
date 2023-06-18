import React from 'react';
import { MegaRenderMixin } from '../../../mixins';
import ModalDialogsUI from '../../../../ui/modalDialogs';
import { ContactAwareName } from "../../contacts.jsx";

export default class Ephemeral extends MegaRenderMixin {
    static NAMESPACE = 'ephemeral-dialog';

    buttons = [
        { key: 'ok', label: l[81], onClick: this.props.onClose }
    ];

    render() {
        const { ephemeralAccounts, onClose } = this.props;
        const ephemeralAccount = ephemeralAccounts && ephemeralAccounts[ephemeralAccounts.length - 1];

        return (
            <ModalDialogsUI.ModalDialog
                name={Ephemeral.NAMESPACE}
                dialogType="message"
                icon="sprite-fm-uni icon-info"
                title={
                    <ContactAwareName
                        emoji={true}
                        contact={M.u[ephemeralAccount]}
                    />
                }
                noCloseOnClickOutside={true}
                buttons={this.buttons}
                onClose={onClose}>
                <p>{l.ephemeral_info}</p>
            </ModalDialogsUI.ModalDialog>
        );
    }
}
