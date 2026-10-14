/** @property pro.taxHandling */

// TODO: Unify this with the propay-billing file. Not worth the extra regression effort on addition
lazy(pro, 'taxHandling', () => {
    'use strict';

    // Shared with the payment flow: one request and one row lookup for the session.
    const tngrReady = pro.propay.billing.getTngrRes();

    // Never passed empty, or billing falls back to the payment page's own selection.
    const getTngrRow = (country, state) => !!country && pro.propay.billing.getTngrRow(country, state || '');

    // Every tnp spends an attempt, so a number it has already ruled on is not sent again.
    const taxNumberResults = Object.create(null);

    // Same stripping propay-billing's getStateForApiReq does: `CC-SS` in, bare code out, and
    // only when that country really has the state, or a stale one from a prior country leaks in.
    const getStateForApiReq = (country, state) => {
        const stripped = typeof state === 'string' && state.split('-')[1];
        const {countriesWithStates} = RegionsCollection;

        return stripped && countriesWithStates[country] && countriesWithStates[country].includes(stripped)
            ? stripped
            : undefined;
    };

    // Only US and CA cross-check the state, as uts/utc do.
    const getTnpState = (country, state) => {
        const stateCode = getStateForApiReq(country, state);

        return (country === 'US' || country === 'CA') && stateCode || '';
    };

    // A verdict holds only for the country and state tnp gave it for.
    const getTnpContext = (country, state) => `${country}:${getTnpState(country, state)}:`;

    /**
     * @param {String} taxNumber    The tax number to test
     * @param {String} country      Billing country
     * @param {String} [state]      State, as `CC-SS` or the bare code
     * @returns {Boolean}           false only where the rules name a format it does not match
     */
    const matchesTaxNumberFormat = (taxNumber, country, state) => {
        const pattern = getTngrRow(country, state).r;

        return !pattern || new RegExp(pattern).test(taxNumber);
    };

    // Held for the session, so a page drawn again inside the window starts locked.
    let lockedUntil = 0;

    /**
     * @param {Object} attempts     tnga's answer: {cur, all, rf, cd}
     * @param {Number} now          unixtime
     * @returns {Number}            unixtime the attempts reset at, or 0 while some remain
     */
    const attemptsResetAt = ({cur, all, rf, cd}, now) => {
        if (!(cur >= all) || typeof rf !== 'number') {
            return 0;
        }

        // A window that has already ended rolls on, as propay's updateAttemptsToNow does.
        return cd > 0 && now > rf ? rf + Math.ceil((now - rf) / cd) * cd : rf;
    };

    // The copy the payment pages show when a number is rejected: attempts left, or none.
    const attemptsMessage = async() => {
        const res = await api.req({a: 'tnga'}).catch(dump);
        const attempts = res && res.result || {};
        const {cur, all} = attempts;

        lockedUntil = attemptsResetAt(attempts, unixtime());

        if (cur >= all) {
            return l.tax_attempts_try_later;
        }

        return cur > 0 ? l.tax_attempts_remaining.replace('%1', cur).replace('%2', all) : l[20953];
    };

    return freeze({

        /** Resolves once the tax number rules are in hand */
        tngrReady,

        /** @returns {Boolean} whether the rules request has settled, however it went */
        get tngrLoaded() {
            return pro.propay.billing.tngrRes !== null;
        },

        /** @returns {Number} unixtime tnp takes numbers again at, or 0 when it does now */
        get lockedUntil() {
            return lockedUntil > unixtime() ? lockedUntil : 0;
        },

        getTngrRow,

        matchesTaxNumberFormat,

        /**
         * @param {String} country  Country to look up
         * @param {String} [state]  State, as `CC-SS` or the bare code
         * @returns {String}        the tax name the rules give, or '' when they name none
         */
        getTngrTaxName(country, state) {
            const name = getTngrRow(country, state).n;

            return typeof name === 'string' && name.trim() || '';
        },

        /**
         * @param {String} country  Country to look up
         * @param {String} [state]  State, as `CC-SS` or the bare code
         * @returns {String}        an example tax number, or '' when the rules give none
         */
        getExampleTaxNumber(country, state) {
            return getTngrRow(country, state).e || '';
        },

        /**
         * Ask whether a proposed change to the tax details would raise the price.
         *
         * @param {String} taxNumber    Proposed tax number; empty checks removing the current one
         * @param {String} country      Proposed billing country
         * @param {String} [state]      Proposed state as the dropdown's `CC-SS` key; tnpcc gets only `SS`
         * @returns {Promise<Object|false>} {increased, prices} keyed by subscription handle, or
         *                                  false when the API could not answer
         */
        async checkBusTaxPriceChange(taxNumber, country, state) {

            // btoa rejects non-Latin1 - to8 lets emoji/unicode round-trip.
            const request = {a: 'tnpcc', cc: country, tn: taxNumber ? btoa(to8(taxNumber)) : ''};
            const stateCode = getStateForApiReq(country, state);

            if (stateCode) {
                request.state = stateCode;
            }

            const res = await api.req(request).catch(dump);
            const result = res && res.result;

            return Array.isArray(result) && {increased: !!result[0], prices: result[1] || {}};
        },

        /**
         * Validate a tax number with tnp.
         *
         * @param {String} taxNumber    The tax number to validate
         * @param {String} country      Billing country
         * @param {String} [state]      State as the dropdown's `CC-SS` key; tnp gets only `SS`
         * @returns {Promise<Object>}   {valid, taxNumber, message} - taxNumber is the form the
         *                              server accepted, message is what to show when it did not
         */
        async checkTaxNumber(taxNumber, country, state) {

            // A format failure never reaches the server, so it does not spend an attempt.
            if (!matchesTaxNumberFormat(taxNumber, country, state)) {
                return {valid: false, taxNumber, message: await attemptsMessage()};
            }

            const request = {a: 'tnp', tn: btoa(to8(taxNumber)), cc: country};
            const stateCode = getTnpState(country, state);

            if (stateCode) {
                request.state = stateCode;
            }

            const context = getTnpContext(country, state);
            const cached = taxNumberResults[context + taxNumber];

            if (cached !== undefined) {
                return cached
                    ? {valid: true, taxNumber: cached, message: l.tax_details_verified}
                    : {valid: false, taxNumber, message: await attemptsMessage()};
            }

            // Kept as the error rather than swallowed, so a rejection can be told from a timeout.
            const res = await api.req(request).catch((ex) => ex);
            const result = res && typeof res === 'object' && res.result;
            const validated = typeof result === 'string' && tryCatch(() => from8(atob(result)), false)();

            if (validated) {
                // The field shows the accepted form from here on, so a retry looks that up.
                taxNumberResults[context + taxNumber] = taxNumberResults[context + validated] = validated;
                return {valid: true, taxNumber: validated, message: l.tax_details_verified};
            }

            // Only tnp ruling against it counts - a server error or dropped connection stays retryable.
            if (Number(res) === EARGS) {
                taxNumberResults[context + taxNumber] = false;
            }

            return {valid: false, taxNumber, message: await attemptsMessage()};
        },

        /**
         * Drop what tnp said about a number, so the next check asks it again.
         *
         * @param {String} taxNumber    The number as checked, typed or accepted
         * @param {String} country      Billing country
         * @param {String} [state]      State as the dropdown's `CC-SS` key
         * @returns {void}
         */
        forgetTaxNumber(taxNumber, country, state) {
            const context = getTnpContext(country, state);
            const verdict = taxNumberResults[context + taxNumber];

            delete taxNumberResults[context + taxNumber];

            // Every form typed on the way to an accepted number is cached against it as well.
            if (verdict) {
                for (const key of Object.keys(taxNumberResults)) {
                    if (key.startsWith(context) && taxNumberResults[key] === verdict) {
                        delete taxNumberResults[key];
                    }
                }
            }
        },

        /**
         * The body of the price rise confirmation.
         *
         * @param {Object} [prices] The price map from checkBusTaxPriceChange, none when upb raised it
         * @returns {String}        the paragraphs as HTML, naming whatever tnpcc priced
         */
        priceRiseMessage(prices) {

            // TODO check with API whether this map can ever hold more than the one subscription.
            const [change] = Object.values(prices || {});
            const known = (...values) => !!change && values.every((v) => typeof change[v] === 'number');
            const rate = (value) => formatPercentage(value / 100, false, 2);
            const paragraphs = [
                known('old', 'new', 'next')
                    ? l.tax_price_rise_detail
                        .replace('%1', formatCurrency(change.old))
                        .replace('%2', formatCurrency(change.new))
                        .replace('%3', time2date(change.next, 2))
                    : l.tax_price_rise_generic
            ];

            if (known('oldrate', 'newrate') && change.oldrate !== change.newrate) {
                paragraphs.push(l.tax_price_rise_rate
                    .replace('%1', rate(change.oldrate))
                    .replace('%2', rate(change.newrate)));

                if (change.oldrate > change.newrate) {
                    paragraphs.push(l.tax_price_rise_tax_deducted);
                }
            }

            paragraphs.push(l.tax_price_rise_cancel_plan);

            return paragraphs.join('<br><br>');
        },

        /**
         * The state dropdown's key for a stored %state.
         *
         * @param {String} country  %country as stored
         * @param {String} stored   %state as stored: the bare code, `CC-SS` from earlier saves, or free text
         * @returns {String}        `CC-SS`, or '' when it names none of that country's states
         */
        stateKey(country, stored) {
            const value = String(stored || '').trim();
            const key = value.includes('-') ? value : `${country}-${value}`;
            const code = key.startsWith(`${country}-`) && getStateForApiReq(country, key);

            if (code) {
                return `${country}-${code}`;
            }

            // Free text predates the dropdown, so the state is as likely named as coded.
            const {states} = RegionsCollection;

            return Object.keys(states).find((k) =>
                k.startsWith(`${country}-`) && states[k].toLowerCase() === value.toLowerCase()) || '';
        },

        /**
         * What a profile save should do with %state.
         *
         * @param {String} stored       %state as stored: the bare code, `CC-SS` from earlier saves, or free text
         * @param {String} selected     the state dropdown's value, `CC-SS` or ''
         * @param {Boolean} hasStates   whether the country now selected offers states
         * @returns {String|undefined|null} the bare code to send ('' clears it), undefined to leave it
         *                                  as stored, or null when a state has to be picked first
         */
        stateUpdate(stored, selected, hasStates) {

            // Only US and CA take one, and a stale one elsewhere would follow the tax number.
            if (!hasStates) {
                return stored ? '' : undefined;
            }

            // Bare, as tnp, tnpcc and the payment requests send it, or the API sees two states.
            const code = selected && selected.split('-')[1];

            if (code) {
                return code === stored ? undefined : code;
            }

            // A stored value the dropdown cannot offer has to be replaced.
            return stored ? null : undefined;
        },

        /**
         * Whether a upb rejection belongs on the tax field rather than the generic failure.
         *
         * @param {Number} code         The code upb rejected with
         * @param {String} taxNumber    The number the save sent, '' when it sent none or a removal
         * @param {Object[]} attrs      The %attributes the save sent, as {key, val}
         * @returns {Boolean}           true when nothing but the number can have been rejected
         */
        isTaxNumberRejection(code, taxNumber, attrs) {

            // upb answers EARGS for any malformed field, and country and state come from pickers.
            return code === EARGS && !!taxNumber && attrs.every(({key}) => key === '%country' || key === '%state');
        },

        /**
         * Whether a upb rejection is the API asking for a price rise to be acknowledged.
         *
         * @param {Number} code     The code upb rejected with
         * @param {Object} fields   The top-level fields the save sent
         * @returns {Boolean}       true when the save moved the tax details without acknowledging a rise
         */
        isPriceRiseRejection(code, fields) {

            // upb refuses a rise with EINCOMPLETE until pwarn says the user accepted it.
            return code === EINCOMPLETE && 'taxnum' in fields && !fields.pwarn;
        }
    });
});
