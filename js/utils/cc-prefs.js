/** @property mega.ccPrefs */
lazy(mega, 'ccPrefs', () => {
    'use strict';

    const prefKey = 'ccPref';
    const data = Object.create(null);

    const sync = tryCatch((res) => {
        res = res || u_attr[`*!${prefKey}`];
        if (res) {
            if (typeof res === 'string') {
                res = tlvstore.decrypt(res);
            }
            if (res.cc && typeof res.cc === 'string') {
                res.cc = JSON.parse(res.cc);
            }
            Object.assign(data, res);
        }
    });

    const saveUserAttribute = () => mega.attr.set2(null, prefKey, {...data, cc: JSON.stringify(data.cc)}, false, true);

    return freeze({
        get data() {
            if (!data.cc) {
                sync();
                data.cc = data.cc || Object.create(null);
            }
            return data.cc || false;
        },
        sync,

        /**
         * Getting the value by traversing through the dotted key
         * @param {String|String[]} [keys] Key(s) to use. Format is 'root.childKey1.childKey2...'
         * @param {Object.<String, any>} [d] Data to traverse through recursively
         * @returns {any}
         */
        async getItem(keys, d) {
            if (!keys || !keys.length) {
                return data.cc;
            }

            if (typeof keys === 'string') {
                keys = keys.split('.');
            }

            if (!d) {
                d = this.data;
            }

            const key = keys.shift();

            return keys.length && d[key] ? this.getItem(keys, d[key]) : d[key];
        },

        /**
         * Removing the value by traversing through the dotted key
         * @param {String|String[]} keys Key(s) to use. Format is 'root.childKey1.childKey2...'
         * @param {Object.<String, any>} d Data to traverse through recursively
         * @param {Boolean} [skipSync] Whether to skip syncing the attribute after removal
         * @returns {Promise<void>}
         */
        async removeItem(keys, d, skipSync = false) {
            if (typeof keys === 'string') {
                keys = keys.split('.');
            }
            const key = keys.shift();

            if (!d) {
                d = this.data;
            }

            if (!d[key]) {
                return;
            }

            if (keys.length) {
                this.removeItem(keys, d[key], true);

                if (Object.keys(d[key]).length === 0) {
                    delete d[key];
                }
            }
            else {
                delete d[key];
            }

            if (!skipSync) {
                saveUserAttribute();
            }
        },

        /**
         * Updating the value by traversing through the dotted key
         * @param {String|String[]} keys Key(s) to use. Format is 'root.childKey1.childKey2...'
         * @param {any} value Value to set
         * @param {Object.<String, any>} d Data to traverse through recursively
         * @returns {Promise<void>}
         */
        async setItem(keys, value, d) {
            if (typeof keys === 'string') {
                keys = keys.split('.');
            }
            const key = keys.shift();

            if (!d) {
                d = this.data;
            }

            if (!d[key]) {
                d[key] = {};
            }

            if (!keys.length) {
                d[key] = value;
                saveUserAttribute();
                return;
            }

            if (typeof d[key] !== 'object') {
                d[key] = {};
            }

            return this.setItem(keys, value, d[key]);
        }
    });
});
