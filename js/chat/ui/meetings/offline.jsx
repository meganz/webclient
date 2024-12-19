import React from 'react';
import ModalDialogsUI from '../../../ui/modalDialogs.jsx';

const Offline = ({ onCallEnd, onClose }) => {
    return (
        <ModalDialogsUI.ModalDialog
            name="reconnect-dialog"
            dialogType="message"
            icon="sprite-fm-uni icon-warning"
            title={l.no_internet}
            noCloseOnClickOutside={true}
            buttons={[
                { key: 'ok', label: l[82] /* `Cancel` */, onClick: onClose },
                { key: 'leave', label: l[5883] /* `Leave call` */, className: 'negative', onClick: onCallEnd }
            ]}
            onClose={onClose}>
            <p>{l.no_connection}</p>
        </ModalDialogsUI.ModalDialog>
    );
};

export default Offline;
