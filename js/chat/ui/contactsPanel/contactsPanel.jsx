import React from 'react';
import { MegaRenderMixin } from '../../mixins.js';
import Navigation from './navigation.jsx';
import ContactList from './contactList.jsx';
import ReceivedRequests from './receivedRequests.jsx';
import SentRequests from './sentRequests.jsx';
import ContactProfile from './contactProfile.jsx';
import { EVENTS, VIEW } from './utils.jsx';

export default class ContactsPanel extends MegaRenderMixin {
    domRef = React.createRef();
    requestReceivedListener = null;

    get view() {
        switch (megaChat.routingSubSection) {
            case null:
                return VIEW.CONTACTS;
            case "contact":
                return VIEW.PROFILE;
            case "received":
                return VIEW.RECEIVED_REQUESTS;
            case "sent":
                return VIEW.SENT_REQUESTS;
            default:
                console.error("Shouldn't happen.");
                return false;
        }
    }

    constructor(props) {
        super(props);
        this.state.receivedRequestsCount = Object.keys(M.ipc).length;
    }

    state = {
        receivedRequestsCount: 0
    };

    handleToggle = ({ keyCode }) => {
        if (keyCode === 27 /* ESC */) {
            const HAS_DIALOG_OPENED =
                $.dialog ||
                ['.contact-nickname-dialog', '.fingerprint-dialog', '.context'].some(selector => {
                    const dialog = document.querySelector(selector);
                    return dialog && dialog.offsetHeight > 0;
                });

            return HAS_DIALOG_OPENED ? keyCode : loadSubPage('fm/chat');
        }
    };

    handleAcceptAllRequests = () => {
        const {received} = this.props;
        const receivedKeys = Object.keys(received || {});
        if (receivedKeys.length) {
            for (let i = receivedKeys.length; i--;) {
                M.acceptPendingContactRequest(receivedKeys[i]).catch(dump);
            }
        }
    };

    renderView = () => {
        const { contacts, received, sent } = this.props;
        const { view } = this;

        switch (view) {
            case VIEW.CONTACTS:
                return <ContactList contacts={contacts} />;
            case VIEW.PROFILE:
                return <ContactProfile handle={view === VIEW.PROFILE && megaChat.routingParams} />;
            case VIEW.RECEIVED_REQUESTS:
                return <ReceivedRequests received={received} />;
            case VIEW.SENT_REQUESTS:
                return <SentRequests sent={sent} />;
        }
    };

    componentWillUnmount() {
        super.componentWillUnmount();
        document.documentElement.removeEventListener(EVENTS.KEYDOWN, this.handleToggle);
        if (this.requestReceivedListener) {
            mBroadcaster.removeListener(this.requestReceivedListener);
        }
    }

    componentDidMount() {
        super.componentDidMount();
        document.documentElement.addEventListener(EVENTS.KEYDOWN, this.handleToggle);
        this.requestReceivedListener = mBroadcaster.addListener('fmViewUpdate:ipc', () =>
            this.setState({ receivedRequestsCount: Object.keys(M.ipc).length })
        );
    }

    render() {
        const { view, state } = this;
        const { receivedRequestsCount } = state;

        return (
            <div
                ref={this.domRef}
                className="contacts-panel">
                <Navigation
                    view={view}
                    contacts={this.props.contacts}
                    receivedRequestsCount={receivedRequestsCount}
                />

                {view !== VIEW.PROFILE && (
                    <div className="contacts-actions">
                        {view === VIEW.RECEIVED_REQUESTS && receivedRequestsCount > 1  && (
                            <button
                                className="mega-button action"
                                onClick={this.handleAcceptAllRequests}>
                                <i className="sprite-fm-mono icon-check" />
                                <span>{l[19062] /* `Accept all` */}</span>
                            </button>
                        )}
                    </div>
                )}

                <div className="contacts-content">
                    {this.renderView()}
                </div>
            </div>
        );
    }
}
