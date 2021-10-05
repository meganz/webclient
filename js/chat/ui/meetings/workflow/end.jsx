import React from 'react';
import { MegaRenderMixin } from '../../../../stores/mixins';
import ModalDialogsUI from '../../../../ui/modalDialogs';

export default class End extends MegaRenderMixin {
    static NAMESPACE = 'end-dialog';

    buttons = [
        { key: 'cancel', label: 'Cancel', onClick: this.props.onClose },
        { key: 'leave', label: 'Leave call', className: 'negative', onClick: () => this.props.sfuApp.destroy() }
    ];

    state = {
        contacts: false
    };

    constructor(props) {
        super(props);
    }

    toggleContacts = () => this.setState({ contacts: !this.state.contacts });

    render() {
        const { NAMESPACE } = End;
        const { contacts } = this.state;

        // TODO: Pending UI for contacts listing, CTAs to assign new moderator or cancel
        return (
            <ModalDialogsUI.ModalDialog
                {...this.state}
                name={NAMESPACE}
                dialogType="message"
                icon="sprite-fm-uni icon-question"
                title="Please choose if you want ot end the call for all participants or just you"
                buttons={this.buttons}
                noCloseOnClickOutside={true}
                onClose={this.props.onClose}>
                <>
                    If you want to keep this call open with full function, please assign a new moderator. &nbsp;
                    <a
                        href="#"
                        onClick={this.toggleContacts}>
                        Assign new moderator
                    </a>
                    {contacts && null}
                </>
            </ModalDialogsUI.ModalDialog>
        );
    }
}
