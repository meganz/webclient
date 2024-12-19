import React from 'react';
import ModalDialogsUI from '../../../../ui/modalDialogs';
import { ContactAwareName } from "../../contacts.jsx";

const Ephemeral = ({ ephemeralAccounts, onClose }) => {
    const ephemeralAccount = ephemeralAccounts && ephemeralAccounts[ephemeralAccounts.length - 1];

    return (
        <ModalDialogsUI.ModalDialog
            name="ephemeral-dialog"
            dialogType="message"
            icon="sprite-fm-uni icon-info"
            title={
                <ContactAwareName
                    emoji={true}
                    contact={M.u[ephemeralAccount]}
                />
            }
            noCloseOnClickOutside={true}
            buttons={[{ key: 'ok', label: l[81], onClick: onClose }]}
            onClose={onClose}>
            <p>{l.ephemeral_info}</p>
        </ModalDialogsUI.ModalDialog>
    );
};

export default Ephemeral;
