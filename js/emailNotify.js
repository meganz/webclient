/**
 * Email Notification Settings.
 * A wrapper around `MegaIntBitMap` which confines to the bitmap format used for enotif settings.
 * - If the LSB is enabled, then all other bits can be considered enabled.
 */
(function(map) {
    'use strict';

    // Generate the bitmap attribute with `all` prepended to the list.
    var attribute = new MegaIntBitMap('enotif', ['all'].concat(map), -2, true, 300); // Autosave after 300ms.

    // Define a wrapper for the attribute which updates the first bit `all` to overwrite all other bits.
    Object.defineProperty(mega, 'enotif', {
        value: Object.freeze({
            types: map,

            /**
             * Set the state of an email
             * @param key The email key
             * @param newState The new state.
             * @return {MegaPromise}
             */
            setState: function(key, newState) {
                return new MegaPromise(function(resolve, reject) {
                    attribute.getAll().then(function (allEmailStates) {
                        var action;
                        if (allEmailStates.all === true) {
                            map.forEach(function (key) {
                                allEmailStates[key] = true;
                            });
                            allEmailStates.all = false;
                            allEmailStates[key] = false;
                            action = attribute.set(allEmailStates);
                        } else {
                            action = attribute.set(key, newState);
                        }
                        action.then(resolve, reject);
                    }, reject);
                });
            },

            /**
             * Returns map of {email-key => state}
             * @return {MegaPromise}
             */
            all: function() {
                return new MegaPromise(function(resolve, reject) {
                    attribute.getAll().then(function(allEmailStates) {
                        if (allEmailStates.all === true) {
                            map.forEach(function(key) {
                                allEmailStates[key] = true;
                            });
                        }
                        delete allEmailStates.all;
                        resolve(allEmailStates);
                    }, reject);
                });
            },

            /**
             * Set the state of all emails.
             * @param newState The new state
             * @return {MegaPromise}
             */
            setAllState: function(newState) {
                return attribute.setValue(newState ? 1 : 0);
            },

            /**
             * Trigger an attribute refetch.
             */
            handleAttributeUpdate: function() {
                attribute.handleAttributeUpdate().then(function() {
                    if (fminitialized && page === 'fm/account/notifications') {
                        if (is_mobile) {
                            mobile.account.notifications.init();
                        } else {
                            accountUI.notifications.render();
                        }
                    }
                });
            },
        })
    });
})([
    // Emails that can be toggled on/off. Note: Do not change the order, only append new items as required.
    'contact-request',
    'chat-message',
    'achievements',
    'quota',
    'account-inactive',
    'referral-program'
]);
