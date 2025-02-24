import React from 'react';
import { ContactPickerWidget } from './contacts';
import ModalDialogsUI from '../../ui/modalDialogs.jsx';
import { MegaRenderMixin } from '../mixins.js';

class ContactSelectorDialog extends MegaRenderMixin {
    dialogName = 'contact-selector-dialog';

    componentDidMount() {
        super.componentDidMount();
        M.safeShowDialog(this.dialogName, () => $(`.${this.dialogName}`));
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        if ($.dialog === this.dialogName) {
            closeDialog();
        }
    }

    render() {
        const {
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
        } = this.props;

        return (
            <ModalDialogsUI.ModalDialog
                className={`
                    popup
                    contacts-search
                    ${className}
                    ${this.dialogName}
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
            </ModalDialogsUI.ModalDialog>
        );
    }
}


window.ContactSelectorDialogUI = {
    ContactSelectorDialog
};

export default ContactSelectorDialog;
