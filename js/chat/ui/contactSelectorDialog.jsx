import React from 'react';
import { ContactPickerWidget } from './contacts';
import ModalDialogsUI from '../../ui/modalDialogs.jsx';

const ContactSelectorDialog = ({
    active,
    selectFooter,
    exclude,
    allowEmpty,
    multiple,
    topButtons,
    showAddContact,
    className,
    multipleSelectedButtonLabel,
    singleSelectedButtonLabel,
    nothingSelectedButtonLabel,
    onClose,
    onSelectDone
}) =>
    <ModalDialogsUI.ModalDialog
        className={`
            popup
            contacts-search
            ${className}
        `}
        onClose={onClose}>
        <ContactPickerWidget
            active={active}
            className="popup contacts-search small-footer"
            contacts={M.u}
            selectFooter={selectFooter}
            megaChat={megaChat}
            exclude={exclude}
            allowEmpty={allowEmpty}
            multiple={multiple}
            topButtons={topButtons}
            showAddContact={showAddContact}
            multipleSelectedButtonLabel={multipleSelectedButtonLabel}
            singleSelectedButtonLabel={singleSelectedButtonLabel}
            nothingSelectedButtonLabel={nothingSelectedButtonLabel}
            onClose={onClose}
            onAddContact={() => {
                eventlog(500237);
                onClose();
            }}
            onSelected={() => {
                eventlog(500238);
                onClose();
            }}
            onSelectDone={onSelectDone}
        />
    </ModalDialogsUI.ModalDialog>;

export default ContactSelectorDialog;
