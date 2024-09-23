mBroadcaster.once('startMega', () => {
    'use strict';

    const provider = 1; // CJ (one for now...)
    const validPeriod = 86400 * 30; // event ID valid for 30 days (in seconds)

    const parse = tryCatch((v) => JSON.parse(v));

    for (const type of ['uTagUTM', 'uTagMTM']) {
        if (window[type]) {
            sessionStorage[type] = JSON.stringify({
                ts: unixtime(),
                tags: window[type],
            });
        }
    }

    if (sessionStorage.uTagUTM || sessionStorage.uTagMTM) {
        csp.init().then(() => {
            if ('csp' in window && csp.has('analyze')) {
                if (sessionStorage.uTagUTM) {
                    localStorage.uTagUTM = sessionStorage.uTagUTM;
                    delete sessionStorage.uTagUTM;
                }

                if (sessionStorage.uTagMTM) {
                    localStorage.uTagMTM = sessionStorage.uTagMTM;
                    delete sessionStorage.uTagMTM;
                }
            }
        });
    }

    for (const type of ['uTagUTM', 'uTagMTM']) {
        const storage = localStorage[type] ? localStorage : sessionStorage;
        if (storage[type]) {
            const tag = parse(storage[type]);

            if (!tag.ts || unixtime() - tag.ts > 86400 * 90) {
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
    const setAttr = (eAff) => {
        if (!eAff) {
            return;
        }

        const attr = `${eAff.ts},${eAff.provider},${eAff.id}`;

        mega.attr.set2(null, 'eaffid', attr, mega.attr.PRIVATE_UNENCRYPTED, true).then(clearEvent).catch(nop);
    };

    if (sessionStorage.cjevent) {
        sessionStorage.eAff = JSON.stringify({
            provider,
            ts: unixtime(),
            id: sessionStorage.cjevent
        });
        delete sessionStorage.cjevent;

        if ('csp' in window) {
            csp.init().then(() => {
                // @todo shall we force showing the dialog, when the user may previously dismissed granting 'analyze'?..

                if (csp.has('analyze') && sessionStorage.eAff) {
                    localStorage.eAff = sessionStorage.eAff;
                    delete sessionStorage.eAff;
                }
            });
        }
        else if (d) {
            console.warn('CSP unexpectedly not available');
        }
    }

    const data = getEvent();
    if (!data) {
        return;
    }
    if (!u_type) {
        mBroadcaster.once('login2', () => {
            setAttr(data);
        });
    }
    else {
        setAttr(data);
    }
});
