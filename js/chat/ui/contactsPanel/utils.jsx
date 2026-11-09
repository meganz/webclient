import React from 'react';

export const EVENTS = {
    KEYDOWN: 'keydown'
};

export const VIEW = {
    CONTACTS: 0x00,
    RECEIVED_REQUESTS: 0x01,
    SENT_REQUESTS: 0x02,
    PROFILE: 0x03
};

export const LABEL = {
    CONTACTS: l[165],
    RECEIVED_REQUESTS: l[5863],
    SENT_REQUESTS: l[5862]
};

export const hasContacts = () => M.u.some(contact => contact.c === 1);

export const hasRelationship = contact => contact && contact.c === 1;

export const isVerified = contact => {
    if (contact && contact.u) {
        const { u: handle } = contact;
        const verificationState = u_authring.Ed25519[handle] || {};
        return verificationState.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON;
    }
    return null;
};

export const verifyCredentials = contact => {
    if (contact.c === 1 && u_authring && u_authring.Ed25519) {
        const verifyState = u_authring.Ed25519[contact.u] || {};
        if (typeof verifyState.method === "undefined" ||
            verifyState.method < authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON) {
            fingerprintDialog(contact.u);
        }
    }
};

export const resetCredentials = contact => {
    if (M.isInvalidUserStatus()) {
        return;
    }
    authring.resetFingerprintsForUser(contact.u)
        .then(() => contact.trackDataChange())
        .catch(dump);
};

export const getUserFingerprint = handle => {
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
