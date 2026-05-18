mBroadcaster.once('startMega', () => {
    'use strict';

    const provider = 1; // CJ (one for now...)
    const validPeriod = 86400 * 30; // event ID valid for 30 days (in seconds)

    const parse = tryCatch((v) => JSON.parse(v), false);

    /**
     * Promote sessionStorage entries to localStorage once the user has consented to analytics.
     * No-op if none of the keys are set in sessionStorage.
     *
     * @param {...string} keys sessionStorage keys to promote.
     * @returns {void}
     */
    const toLocalStorage = (...keys) => {
        if (!keys.some((k) => sessionStorage[k])) {
            return;
        }
        if ('csp' in window) {
            csp.init().then(() => {
                // @todo shall we force showing the dialog, when the user may previously dismissed granting 'analyze'?..
                if (csp.has('analyze')) {
                    for (const key of keys) {
                        if (sessionStorage[key]) {
                            localStorage[key] = sessionStorage[key];
                            delete sessionStorage[key];
                        }
                    }
                }
            });
        }
        else if (d) {
            console.warn('CSP unexpectedly not available');
        }
    };

    for (const type of ['uTagUTM', 'uTagMTM']) {
        if (window[type]) {
            sessionStorage[type] = JSON.stringify({
                ts: unixtime(),
                tags: window[type],
            });
        }
    }

    toLocalStorage('uTagUTM', 'uTagMTM');

    for (const type of ['uTagUTM', 'uTagMTM']) {
        const storage = localStorage[type] ? localStorage : sessionStorage;
        if (storage[type]) {
            const tag = parse(storage[type]);

            if (!tag || !tag.ts || unixtime() - tag.ts > 86400 * 90) {
                delete storage[type];
            }
        }
    }

    /**
     * Try to get the event from web storage. If the event doesn't exist or
     * is older than the valid period, return null.
     *
     * @returns {object|null} event object or null if not valid.
     */
    const getEvent = () => {
        const storage = localStorage.eAff ? localStorage : sessionStorage;

        let event = storage.eAff;
        if (!event) {
            return null;
        }

        event = parse(event);
        if (!event || !event.provider || !event.id) {
            delete storage.eAff; // Remove the unexpected
            return null;
        }

        // If date exists check expiry
        if (event.ts && Math.floor(Date.now() / 1000) - event.ts > validPeriod) {
            // Remove expired event data
            delete storage.eAff;
            return null;
        }

        return event;
    };

    /**
     * Clear the event from local and session storage.
     *
     * @returns {void}
     */
    const clearEvent = () => {
        delete sessionStorage.eAff;
        delete localStorage.eAff;
    };

    /**
     * Save the event to the user's attribute, then clear the stored value from storage.
     *
     * @param {object} eAff External affiliate object
     *
     * @returns {void}
     */
    const setAttr = () => {

        const eAff = getEvent();

        if (eAff) {
            const attr = `${eAff.ts},${eAff.provider},${eAff.id}`;

            mega.attr.set2(null, 'eaffid', attr, mega.attr.PRIVATE_UNENCRYPTED, true).then(clearEvent).catch(nop);
        }

        // gAds attr setting
        const gdata = parse(localStorage.gAdsAttr || sessionStorage.gAdsAttr);

        if (gdata && typeof gdata === 'object') {
            gdata.ts = gdata.gclts;
            delete gdata.gclts;

            mega.attr.set2(null, 'etrac', JSON.stringify(gdata), mega.attr.PRIVATE_UNENCRYPTED, true).then(() => {
                delete sessionStorage.gAdsAttr;
                delete localStorage.gAdsAttr;
            }).catch(nop);
        }
    };

    if (sessionStorage.cjevent) {
        sessionStorage.eAff = JSON.stringify({
            provider,
            ts: unixtime(),
            id: sessionStorage.cjevent
        });
        delete sessionStorage.cjevent;

        toLocalStorage('eAff');
    }

    toLocalStorage('gAdsAttr');

    if (!u_type) {
        mBroadcaster.once('login2', () => {
            setAttr();
        });
    }
    else {
        setAttr();
    }
});
