/**
 * @property {Object} mega.icu   ICU class for messages formatting
 */
lazy(mega, 'icu', () => {
    'use strict';

    let plural = tryCatch(() => {
        if (window.Intl && Intl.PluralRules !== undefined) {
            return new Intl.PluralRules(mega.intl.locale);
        }
    }, false)();

    const reportError = (error) => {
        if (d) {
            console.error(error);
        }
    };

    if (!plural) {
        if (d) {
            console.warn('Using own Intl.PluralRules adaptation as Intl.PluralRules is unavailable');
        }
        plural = getPlurals(mega.intl.locale);
    }

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

    /**
     * Polyfill for Intl.PluralRules for MEGA Webclient languages
     *
     * Based on:
     * https://www.npmjs.com/package/intl-pluralrules
     * https://www.npmjs.com/package/make-plural
     *
     * Reference for plural rules:
     * https://unicode-org.github.io/cldr-staging/charts/latest/supplemental/language_plural_rules.html
     *
     * @param {string} localeVal mega.intl.locale value. First two characters should be a valid key to select._sel
     * @returns {{select: ((function(*): (string|*))|*)}} The constructed PluralRules object with the required
     * select function.
     */
    function getPlurals(localeVal) {
        const select = (number) => {
            if (typeof number !== 'number') {
                number = Number(number);
            }
            if (!isFinite(number)) {
                return 'other';
            }
            const formatter = new Intl.NumberFormat('en');
            const fmt = formatter.format(Math.abs(number));
            return select._sel[select._locale](fmt);
        };
        const plurals_other = () => 'other';
        select._sel = {
            en: n => {
                const s = String(n).split('.');
                return n === 1 && !s[1] ? 'one' : 'other';
            },
            ar: n => {
                const s = String(n).split('.');
                const n100 = Number(s[0]) === n && s[0].slice(-2);
                if (n === 0) {
                    return 'zero';
                }
                if (n === 1) {
                    return 'one';
                }
                if (n === 2) {
                    return 'two';
                }
                if (n100 >= 3 && n100 <= 10) {
                    return 'few';
                }
                if (n100 >= 11 && n100 <= 99) {
                    return 'many';
                }
                return 'other';
            },
            de: n => {
                const s = String(n).split('.');
                return n === 1 && !s[1] ? 'one' : 'other';
            },
            fr: n => {
                const s = String(n).split('.');
                const i = s[0];
                const i1000000 = i.slice(-6);
                if (n >= 0 && n < 2) {
                    return 'one';
                }
                if (i !== 0 && i1000000 === 0 && !s[1]) {
                    return 'many';
                }
                return 'other';
            },
            pt: n => {
                const s = String(n).split('.');
                const i = s[0];
                const i1000000 = i.slice(-6);
                if (i === 0 || i === 1) {
                    return 'one';
                }
                if (i !== 0 && i1000000 === 0 && !s[1]) {
                    return 'many';
                }
                return 'other';
            },
            zh: plurals_other,
            es: n => {
                const s = String(n).split('.');
                const i = s[0];
                const i1000000 = i.slice(-6);
                if (n === 1) {
                    return 'one';
                }
                if (i !== 0 && i1000000 === 0 && !s[1]) {
                    return 'many';
                }
                return 'other';
            },
            id: plurals_other,
            it: n => {
                const s = String(n).split('.');
                const i = s[0];
                const v0 = !s[1];
                const i1000000 = i.slice(-6);
                if (n === 1 && v0) {
                    return 'one';
                }
                if (i !== 0 && i1000000 === 0 && v0) {
                    return 'many';
                }
                return 'other';
            },
            ja: plurals_other,
            ko: plurals_other,
            nl: plurals_other,
            pl: n => {
                const s = String(n).split('.');
                const i = s[0];
                const v0 = !s[1];
                const i10 = i.slice(-1);
                const i100 = i.slice(-2);
                if (v0) {
                    if (n === 1) {
                        return 'one';
                    }
                    if (i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14)) {
                        return 'few';
                    }
                    if (i !== 1 && (i10 === 0 || i10 === 1) || i10 >= 5 && i10 <= 9 || i100 >= 12 && i100 <= 14) {
                        return 'many';
                    }
                }
                return 'other';
            },
            ro: n => {
                const s = String(n).split('.');
                const v0 = !s[1];
                const t0 = Number(s[0]) === n;
                const n100 = t0 && s[0].slice(-2);
                if (n === 1 && v0) {
                    return 'one';
                }
                if (!v0 || n === 0 || n100 >= 2 && n100 <= 19) {
                    return 'few';
                }
                return 'other';
            },
            ru: n => {
                const s = String(n).split('.');
                const i = s[0];
                const v0 = !s[1];
                const i10 = i.slice(-1);
                const i100 = i.slice(-2);
                if (v0) {
                    if (i10 === 1 && i100 !== 11) {
                        return 'one';
                    }
                    if (i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14)) {
                        return 'few';
                    }
                    if (i10 === 0 || i10 >= 5 && i10 <= 9 || i100 >= 11 && i100 <= 14) {
                        return 'many';
                    }
                }
                return 'other';
            },
            th: plurals_other,
            vi: plurals_other
        };
        select._locale = String(localeVal).substring(0, 2);
        return {
            select
        };
    }
});
