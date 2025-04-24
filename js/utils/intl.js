/** @property mega.intl */
lazy(mega, 'intl', function _() {
    'use strict';
    const ns = Object.create(null);

    /** @property mega.intl.number */
    lazy(ns, 'number', function() {
        return this.get('NumberFormat', {minimumFractionDigits: 2});
    });

    /** @property mega.intl.bitcoin */
    lazy(ns, 'bitcoin', function() {
        return this.get('NumberFormat', {minimumFractionDigits: 8});
    });

    /** @property mega.intl.collator */
    lazy(ns, 'collator', function() {
        return this.get('Collator');
    });

    /** @property mega.intl.decimal */
    lazy(ns, 'decimal', function() {
        return this.get('NumberFormat');
    });

    /** @property mega.intl.decimalSeparator */
    lazy(ns, 'decimalSeparator', function() {
        const value = tryCatch(() => this.number.formatToParts(1.1).find(obj => obj.type === 'decimal').value, false)();
        return value || '.';
    });

    /** @property mega.intl.locale */
    lazy(ns, 'locale', function() {
        const locale = window.locale || window.lang;
        const navLocales = Array.isArray(navigator.languages)
            && navigator.languages.filter(l => l !== locale && l.startsWith(locale))[0];

        // @todo Polyfill Intl.Locale() and return an instance of it instead?
        return navLocales && this.test(navLocales) || this.test(locale) || 'en';
    });

    /** @function mega.intl.get */
    ns.get = function(type, options) {
        let intl;

        tryCatch(() => {
            intl = new Intl[type](this.locale.replace('ar', 'en'), options);
        }, false)();

        return intl || new Intl[type]();
    };

    /** @function mega.intl.compare */
    ns.compare = function(a, b) {
        // compares two strings according to the sort order of the current locale.
        return this.collator.compare(a, b);
    };

    /** @function mega.intl.reset */
    ns.reset = function() {
        delete mega.intl;
        lazy(mega, 'intl', _);
    };

    /** @function mega.intl.test */
    ns.test = locale => tryCatch(() => Intl.NumberFormat.supportedLocalesOf(locale)[0], false)();
    // @todo ^ does this return the canonical even in browsers not supporting Intl.getCanonicalLocales() ?

    return ns;
});
