import React from 'react';
import ModalDialogsUI from '../../../ui/modalDialogs.jsx';
import { MegaRenderMixin } from '../../../stores/mixins';

export default class MeetingsCallEndedDialog extends MegaRenderMixin {
    constructor(props) {
        super(props);
        this.state = {
            'safeShowDialogRendered': false
        };
    }
    componentDidMount() {
        super.componentDidMount();

        M.safeShowDialog('meetings-ended', () => {
            this.setState({'safeShowDialogRendered': true});
            return this.findDOMNode();
        });
    }

    componentWillUnmount() {
        super.componentWillUnmount();

        if ($.dialog === "meetings-ended") {
            closeDialog();
        }
    }

    render() {
        const { onClose } = this.props;
        if (!this.state.safeShowDialogRendered) {
            return null;
        }
        return (
            <ModalDialogsUI.ModalDialog
                className="meetings-call-ended-dialog"
                dialogType="message"
                title={l.meeting_ended /* `Meeting has ended.` */}
                buttons={
                    [
                        {
                            label: l.view_history /* `View history` */,
                            key: "view",
                            className: "action",
                            onClick: onClose
                        },
                        {
                            label: l[81] /* `OK` */,
                            key: "ok",
                            className: "negative",
                            onClick: () => {
                                if (is_chatlink) {
                                    is_chatlink = false;
                                    delete megaChat.initialPubChatHandle;
                                    megaChat.destroy();
                                }
                                loadSubPage(u_type === 0 ? 'register' : 'securechat');
                            }
                        }
                    ]
                }
                iconElement={
                    <div className="avatar">
                        <div data-color="color12" className="avatar-wrapper small-rounded-avatar color12">X</div>
                    </div>
                }
                onClose={onClose}
            />
        );
    }
}
