/**
 * @property {Object} mega.icu   ICU class for messages formatting
 */
lazy(mega, 'icu', () => {
    'use strict';

    const plural = tryCatch(() => {
        if (window.Intl && Intl.PluralRules !== undefined) {
            return new Intl.PluralRules(mega.intl.locale);
        }
    }, false)();

    const reportError = (error) => {
        if (d) {
            console.error(error);
        }
    };

    /**
     * Fetch a plural option from the message
     * @param {String} msg      Message to extract options from
     * @param {Number} start    Start index of the search
     * @returns {Object}        {key, option, index} key of the option & value and last index of match
     */
    const getOption = function getOption(msg, start) {
        let openFound = 0;
        let option = '';
        let key = '';
        start = start || 0;

        for (let k = start; k < msg.length; k++) {
            option += msg[k];
            if (msg[k] === '{') {
                openFound++;
                if (openFound === 1) {
                    key = option.slice(0, -1);
                    option = '{';
                }
            }
            else if (msg[k] === '}') {
                openFound--;
                if (openFound === 0) {
                    // end
                    return { key, option, index: k };
                }
                else if (openFound < 0) {
                    reportError(`---- Parsing error, failed to parse Plural set, not matched brackets. `
                        + `value = ${msg}`);
                    return null;
                }
            }
        }
        reportError(`---- Parsing error, failed to parse Plural set. value = ${msg}`);
        return null;
    };

    return Object.freeze({

        /**
         * Check if the message is in ICU format and has Plural
         * @param {String} msg      Message to check
         * @returns {Boolean}       True if ICU/Plural
        */
        isICUPlural: msg => /{.+,\s*plural\s*,[^]+}/.test(msg),

        /**
         * Format ICU message
         * @param {String} msg      Message to format
         * @param {Number} count    The count of counted items in the rule
         * @returns {Boolean}       True if ICU/Plural
         */
        format: (msg, count, localizeCount) => {
            if (d && window.dstringids) {
                return msg;
            }
            if (!mega.icu.isICUPlural(msg)) {
                reportError(`---- Parsing error, not expected ICU message. value = ${msg}`);
                return String(msg);
            }
            const icuBody = /({[^{}]*,\s*plural\s*,[^]+})/g.exec(msg);

            if (!icuBody || icuBody.length !== 2) {
                reportError(`---- Parsing error, not expected ICU Body format. value = ${icuBody}`);
                return String(msg);
            }

            // removing the brackets { }
            const clearBody = icuBody[1].substring(1, icuBody[1].length - 1).trim();

            const token = clearBody.match(/,\s*plural\s*,/);

            if (!token || token.length !== 1) {
                reportError(`---- Parsing error, Failed to find Plural token. value = ${clearBody}`);
                return String(msg);
            }

            const stringDic = Object.create(null);

            let st = token.index + token[0].length;

            while (st < clearBody.length) {
                const opts = getOption(clearBody, st);

                if (!opts) {
                    reportError(`---- Parsing error, malformed Plural set. value = ${clearBody}`);
                    return String(msg);
                }

                const condition = opts.key.trim();
                let strVal = opts.option.trim();

                st = opts.index + 1;
                // removing the brackets { }
                strVal = strVal.substring(1, strVal.length - 1);
                stringDic[condition.replace('=', '')] = strVal;

            }

            if (!Object.keys(stringDic).length) {
                reportError(`---- Parsing error, Plural values not found. value = ${icuBody}`);
                return String(msg);
            }

            let val = stringDic[count] || stringDic[plural.select(count)] || stringDic.other;

            if (val) {
                val = val.replace(/#/g, localizeCount ? mega.intl.decimal.format(count) : count);
                const beginTxt = msg.substring(0, icuBody.index);
                const endTxt = msg.substring(icuBody.index + icuBody[1].length, msg.length);
                return beginTxt + val + endTxt;
            }
            reportError(`---- Parsing error, Plural values for count ${count} not found.`
                + `value = ${JSON.stringify(stringDic)}`);

            return String(msg);
        }
    });
});
