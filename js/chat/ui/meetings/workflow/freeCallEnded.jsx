import React from 'react';
import ModalDialogsUI from '../../../../ui/modalDialogs.jsx';

const NAMESPACE = 'free-call-ended-dlg';

export class FreeCallEnded extends React.Component {
    domRef = React.createRef();

    componentWillUnmount() {
        if ($.dialog === NAMESPACE) {
            closeDialog();
        }
    }

    componentDidMount() {
        M.safeShowDialog(NAMESPACE, () => {
            if (!this.domRef.current) {
                throw new Error(`${NAMESPACE} dialog: component ${NAMESPACE} not mounted.`);
            }
            eventlog(500295);
            return $(`#${NAMESPACE}`);
        });
    }

    render() {
        const { onClose } = this.props;

        return (
            <ModalDialogsUI.ModalDialog
                id={NAMESPACE}
                ref={this.domRef}
                className="mega-dialog"
                dialogType="action"
                dialogName={NAMESPACE}
                onClose={onClose}>
                <header>
                    <div className="free-call-ended graphic">
                        <img src={`${staticpath}images/mega/chat-upgrade-rocket.png`}/>
                    </div>
                </header>

                <section className="content">
                    <div className="content-block">
                        <div className="dialog-body-text">
                            <h3>{l.free_call_ended_dlg_text}</h3>
                            <span>{l.free_call_ended_dlg_subtext}</span>
                        </div>
                    </div>
                </section>

                <footer>
                    <div className="footer-container">
                        <button
                            className="mega-button positive large"
                            onClick={() => {
                                loadSubPage('pro');
                                eventlog(500261);
                                onClose();
                            }}>
                            <span>{l.upgrade_now}</span>
                        </button>
                    </div>
                </footer>
            </ModalDialogsUI.ModalDialog>
        );
    }
}
