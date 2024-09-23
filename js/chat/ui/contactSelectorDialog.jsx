import React from 'react';
import { MegaRenderMixin } from '../mixins.js';
import { ContactPickerWidget } from './contacts';
import ModalDialogsUI from '../../ui/modalDialogs.jsx';

export default class ContactSelectorDialog extends MegaRenderMixin {
    static defaultProps = {
        requiresUpdateOnResize: true
    };

    constructor(props) {
        super(props);
        this.state = {
            selected: this.props.selected || []
        };
        this.onSelectClicked = this.onSelectClicked.bind(this);
        this.onSelected = this.onSelected.bind(this);
    }

    specShouldComponentUpdate(nextProps, nextState) {
        if (
            this.props.active !== nextProps.active ||
            this.props.focused !== nextProps.focused ||
            this.state && this.state.active !== nextState.active ||
            this.state && JSON.stringify(this.state.selected) !== JSON.stringify(nextState.selected)
        ) {
            return true;
        }
        // not sure, leave to the render mixing to decide.
        return undefined;
    }

    onSelected(nodes) {
        this.setState({ selected: nodes });
        this.props.onSelected?.(nodes);
        this.safeForceUpdate();
    }

    onSelectClicked() {
        this.props.onSelectClicked();
    }

    render() {
        const {
            active, selectFooter, exclude, allowEmpty, multiple, topButtons, showAddContact, className,
            multipleSelectedButtonLabel, singleSelectedButtonLabel, nothingSelectedButtonLabel, onClose, onSelectDone
        } = this.props;
        return (
            <ModalDialogsUI.ModalDialog
                className={`
                    popup contacts-search
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
            </ModalDialogsUI.ModalDialog>
        );
    }
}
