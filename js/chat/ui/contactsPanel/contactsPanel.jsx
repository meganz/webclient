import React from 'react';
import {MegaRenderMixin} from '../../mixins';
import Navigation from './navigation.jsx';
import ContactList from './contactList.jsx';
import ReceivedRequests from './receivedRequests.jsx';
import SentRequests from './sentRequests.jsx';
import ContactProfile from './contactProfile.jsx';

export default class ContactsPanel extends MegaRenderMixin {
    requestReceivedListener = null;

    static EVENTS = {
        KEYDOWN: 'keydown'
    };

    static VIEW = {
        CONTACTS: 0x00,
        RECEIVED_REQUESTS: 0x01,
        SENT_REQUESTS: 0x02,
        PROFILE: 0x03
    };

    static LABEL = {
        CONTACTS: l[165],
        RECEIVED_REQUESTS: l[5863],
        SENT_REQUESTS: l[5862]
    };

    static hasContacts = () => M.u.some(contact => contact.c === 1);

    static hasRelationship = contact => contact && contact.c === 1;

    static isVerified = contact => {
        if (contact && contact.u) {
            const { u: handle } = contact;
            const verificationState = u_authring.Ed25519[handle] || {};
            return verificationState.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON;
        }
        return null;
    };

    static verifyCredentials = contact => {
        if (contact.c === 1 && u_authring && u_authring.Ed25519) {
            const verifyState = u_authring.Ed25519[contact.u] || {};
            if (typeof verifyState.method === "undefined" ||
                verifyState.method < authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON) {
                fingerprintDialog(contact.u);
            }
        }
    };

    static resetCredentials = contact => {
        if (M.isInvalidUserStatus()) {
            return;
        }
        authring.resetFingerprintsForUser(contact.u)
            .then(() => contact.trackDataChange())
            .catch(dump);
    };

    static getUserFingerprint = handle => {
        const $$FINGERPRINT = [];
        userFingerprint(handle, fingerprints => {
            for (let i = 0; i < fingerprints.length; i++) {
                $$FINGERPRINT.push(
                    <span key={i}>{fingerprints[i]}</span>
                );
            }
        });
        return $$FINGERPRINT;
    };

    get view() {
        switch (megaChat.routingSubSection) {
            case null:
                return ContactsPanel.VIEW.CONTACTS;
            case "contact":
                return ContactsPanel.VIEW.PROFILE;
            case "received":
                return ContactsPanel.VIEW.RECEIVED_REQUESTS;
            case "sent":
                return ContactsPanel.VIEW.SENT_REQUESTS;
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
            case ContactsPanel.VIEW.CONTACTS:
                return <ContactList contacts={contacts} />;
            case ContactsPanel.VIEW.PROFILE:
                return <ContactProfile handle={view === ContactsPanel.VIEW.PROFILE && megaChat.routingParams} />;
            case ContactsPanel.VIEW.RECEIVED_REQUESTS:
                return <ReceivedRequests received={received} />;
            case ContactsPanel.VIEW.SENT_REQUESTS:
                return <SentRequests sent={sent} />;
        }
    };

    componentWillUnmount() {
        super.componentWillUnmount();
        document.documentElement.removeEventListener(ContactsPanel.EVENTS.KEYDOWN, this.handleToggle);
        if (this.requestReceivedListener) {
            mBroadcaster.removeListener(this.requestReceivedListener);
        }
    }

    componentDidMount() {
        super.componentDidMount();
        document.documentElement.addEventListener(ContactsPanel.EVENTS.KEYDOWN, this.handleToggle);
        this.requestReceivedListener = mBroadcaster.addListener('fmViewUpdate:ipc', () =>
            this.setState({ receivedRequestsCount: Object.keys(M.ipc).length })
        );
    }

    render() {
        const { view, state } = this;
        const { receivedRequestsCount } = state;

        return (
            <div className="contacts-panel">
                <Navigation
                    view={view}
                    contacts={this.props.contacts}
                    receivedRequestsCount={receivedRequestsCount}
                />

                {view !== ContactsPanel.VIEW.PROFILE && (
                    <div className="contacts-actions">
                        {view === ContactsPanel.VIEW.RECEIVED_REQUESTS && receivedRequestsCount > 1  && (
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
