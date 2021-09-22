import React from 'react';
import {MegaRenderMixin} from '../../../stores/mixins.js';
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
        authring.resetFingerprintsForUser(contact.u);
        contact.trackDataChange();
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
    }

    getReceivedRequestsCount = () => this.props.received && Object.keys(this.props.received).length;

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
        const { received } = this.props;
        let receivedKeys = Object.keys(received);
        if (received && receivedKeys.length) {
            for (let i = 0; i < receivedKeys.length; i++) {
                M.acceptPendingContactRequest(receivedKeys[i]);
            }
            delay('updateIpcRequests', updateIpcRequests);
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
        mBroadcaster.removeListener(this.requestReceivedListener);
        document.documentElement.removeEventListener(ContactsPanel.EVENTS.KEYDOWN, this.handleToggle);
    }

    componentDidMount() {
        super.componentDidMount();
        document.documentElement.addEventListener(ContactsPanel.EVENTS.KEYDOWN, this.handleToggle);
    }

    render() {
        const receivedRequestsCount = this.getReceivedRequestsCount();
        const { view } = this;

        return (
            <div className="contacts-panel">
                <Navigation view={view} />

                {view !== ContactsPanel.VIEW.PROFILE &&
                    <div className="contacts-actions">
                        {view === ContactsPanel.VIEW.RECEIVED_REQUESTS &&
                        receivedRequestsCount > 1  &&
                            <button
                                className="mega-button action"
                                onClick={this.handleAcceptAllRequests}>
                                <i className="sprite-fm-mono icon-check" />
                                <span>{l[19062] /* `Accept all` */}</span>
                            </button>
                        }
                        <button
                            className="mega-button action"
                            onClick={() => contactAddDialog()}>
                            <i className="sprite-fm-mono icon-add-circle" />
                            <span>{l[71] /* `Add contact` */}</span>
                        </button>
                    </div>
                }

                <div className="contacts-content">
                    {this.renderView()}
                </div>
            </div>
        );
    }
}
