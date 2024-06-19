import React from 'react';
import { MegaRenderMixin } from '../../../mixins.js';
import ModalDialogsUI from '../../../../ui/modalDialogs.jsx';

const NAMESPACE = 'free-call-ended-dlg';

export class FreeCallEnded extends MegaRenderMixin {

    componentDidMount() {
        super.componentDidMount();

        M.safeShowDialog(NAMESPACE, () => {
            if (!this.isMounted()) {
                throw new Error(`${NAMESPACE} dialog: component ${NAMESPACE} not mounted.`);
            }

            return $(`#${NAMESPACE}`);
        });
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        if ($.dialog === NAMESPACE) {
            closeDialog();
        }
    }

    render() {
        const { onClose } = this.props;
        return <ModalDialogsUI.ModalDialog
            className="mega-dialog"
            id={NAMESPACE}
            onClose={onClose}
            dialogType="action"
            dialogName={NAMESPACE}>
            <header>
                <div className="free-call-ended graphic">
                    <img src={`${staticpath}images/mega/chat-upgrade-rocket.png`}/>
                </div>
            </header>

            <section className="content">
                <div className="content-block">
                    <div className="dialog-body-text">
                        <h3>
                            {l.free_call_ended_dlg_text /* `Try one of our Pro plans to have longer duration calls` */}
                        </h3>
                        <span>{l.free_call_ended_dlg_subtext /* `Your call reached the 60 minute duration...` */}</span>
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
        </ModalDialogsUI.ModalDialog>;
    }
}
