import React from 'react';
import { MegaRenderMixin } from '../../../mixins';
import ModalDialogsUI from '../../../../ui/modalDialogs';
import { Emoji } from '../../../../ui/utils';

export default class Ephemeral extends MegaRenderMixin {
    static NAMESPACE = 'ephemeral-dialog';

    buttons = [
        { key: 'ok', label: l[81], onClick: this.props.onClose }
    ];

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
                    <Emoji>{ephemeralName}</Emoji>
                }
                noCloseOnClickOutside={true}
                buttons={this.buttons}
                onClose={onClose}>
                <p>{l.ephemeral_info}</p>
            </ModalDialogsUI.ModalDialog>
        );
    }
}
