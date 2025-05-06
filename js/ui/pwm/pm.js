mega.pm = {

    createItem(n, name, target) {
        'use strict';

        if (!n || !name || !target) {
            return;
        }

        return M.createFolder(target, name, n);
    },

    async updateItem(newItem, handle) {
        'use strict';

        if (!newItem || !newItem.name || !handle) {
            return;
        }

        const node = M.getNodeByHandle(handle);

        if (node && typeof newItem === 'object') {

            const prop = {name: node.name, pwm: {...node.pwm}};
            let hasChanges = false;

            for (const key of Object.keys(newItem)) {
                const target = key === 'name' ? prop : prop.pwm;

                if (typeof newItem[key] === 'object' && newItem[key] !== null &&
                    typeof target[key] === 'object' && target[key] !== null) {
                    for (const field of Object.keys(newItem[key])) {
                        if (newItem[key][field] !== target[key][field]) {
                            target[key][field] = newItem[key][field];
                            hasChanges = true;
                        }
                    }
                }
                else if (newItem[key] !== target[key]) {
                    target[key] = newItem[key];
                    hasChanges = true;
                }
            }

            return hasChanges ? api.setNodeAttributes(node, prop) : false;
        }
    },

    async deleteItem(handles) {
        'use strict';

        return Promise.all(handles.map(n => api.screq({a: 'd', n, vw: 1})));
    },

    saveLastSelected(handle) {
        'use strict';

        this.lastSelectedItem = handle;
    },

    getLastSelected() {
        'use strict';

        return this.lastSelectedItem;
    },

    getSortData() {
        'use strict';

        const {pwmh} = mega;

        if (!pwmh) {
            return ['name', 1];
        }

        return {sortdata: fmconfig.sortmodes[pwmh] ?
            Object.values(fmconfig.sortmodes[pwmh]) : ['name', 1]};
    },

    setSortData(sortdata) {
        'use strict';

        const {pwmh} = mega;

        if (!pwmh) {
            return;
        }

        fmsortmode(pwmh, sortdata[0], sortdata[1]);
    },

    async loadTLDs() {
        'use strict';
        if (!mega.publicTLDs) {
            let tmp, db;
            mega.publicTLDs = new Set();

            if (typeof Dexie !== 'undefined') {
                db = new Dexie('$tldl1');
                db.version(1).stores({kv: '&k'});
                const r = await db.kv.get('l').catch(dump);
                tmp = r && Date.now() < r.t + 864e6 && r.v;
            }
            tmp = tmp || await api.req({a: 'tldl'})
                .then(({result}) => {
                    assert(Array.isArray(result) && result.length, `Invalid API reply for tldl`);
                    if (db) {
                        db.kv.put({k: 'l', t: Date.now(), v: result});
                    }
                    return result;
                });
            mega.publicTLDs = new Set(tmp);
        }
    },

    async loadVault() {
        'use strict';
        const waiter = mega.publicTLDs ? 0 : this.loadTLDs().catch(reportError);

        let pwmh = mega.pwmh;

        if (!pwmh) {

            const n = {};
            const attr = ab_to_base64(crypto_makeattr(n));
            const key = a32_to_base64(encrypt_key(u_k_aes, n.k));

            pwmh = (await api.screq({a: "pwmp", k: key, at: attr})).handle;

            const [{pwmh: h1}, h2] = await Promise.all([
                M.getAccountDetails(),
                mega.attr.get(u_handle, 'pwmh', -1, false)
            ]);

            assert(h1 === h2 && pwmh === h1, `RACE(${h1}!${h2}!${pwmh})`);
        }
        assert(pwmh && typeof pwmh === 'string', `Unexpected pwm handle: ${pwmh}`);

        if (waiter) {
            await waiter;
        }

        const vaultPasswords = [];

        for (const h in M.c[pwmh]) {
            vaultPasswords.push(M.getNodeByHandle(h));
        }

        return vaultPasswords;
    },

    validateUserStatus() {
        'use strict';

        if (u_attr.b && u_attr.b.s === -1 || u_attr.pf && u_attr.pf.s === -1) {
            M.showExpiredBusiness();
            return false;
        }

        return true;
    },

    pwmFeature: false,

    /**
     * Check if the user has an active pwm subscription.
     * Subscription cancellation takes effect only after the current subscription period ends.
     *
     * @param {boolean} retry - Flag to indicate if the function is being called recursively.
     *
     * @returns {Promise<*|Boolean>} False or undefined if the user has no active subscription.
     */
    async checkActiveSubscription(retry) {
        'use strict';

        // if the Business or Pro flexi account has expired,
        // it will have read-only access to the passwords
        if (!this.validateUserStatus()) {
            return false;
        }
        this.plan = await this.getPlanDetails();

        if (!this.plan || typeof this.plan === 'object') {
            return this.plan !== undefined && (this.plan.trial
                ? mega.ui.pm.subscription.freeTrial()
                : mega.ui.pm.subscription.featurePlan());
        }

        const timer = this.pwmFeature[0] - Date.now() / 1e3;

        // set the timer only if the expiry time is less than or equal to 3 days
        if (!retry && timer < 3 * 86400) {
            tSleep(timer).then(() => M.getAccountDetails()).then(() => this.checkActiveSubscription(true));
        }
    },

    _updatePwmFeature() {

        'use strict';

        this.pwmFeature = u_attr.features && u_attr.features.find(elem => elem[1] === 'pwm') || false;
    },

    /**
     * Get current plan details or plan eligibility for the user
     *
     * @returns {boolean|object|void} Return true if user has an active subscription or
     * Object if the plan details available or undefined for countries not supporting Password Manager
     */
    async getPlanDetails() {
        'use strict';

        this._updatePwmFeature();

        // check for the active subscription status
        if (this.pwmFeature && this.pwmFeature[0] > Date.now() / 1000) {
            return true;
        }

        // if the Feature PWM is not available then get plans and check the free trial/feature plan eligibility
        const {result} = await api.req({a: 'utqa', nf: 2, ft: 1});

        for (let i = result.length; i--;){
            if (result[i].f && result[i].f.pwm === 1) {
                return result[i];
            }
        }
    },

    hideSubsDialog() {

        'use strict';

        this._updatePwmFeature();

        // If this has a pwmFeature flag, it means the user purchased a subscription or it already has a subscription,
        // Lets set plan as true.
        if (this.pwmFeature) {
            this.plan = true;
            mega.ui.pm.subscription.hideDialog();
        }
    },

    otp: {
        hashingAlg: {'sha1': 'SHA-1', 'sha256': 'SHA-256', 'sha512': 'SHA-512'},

        async computeHmacKey(key, alg) {
            'use strict';

            return window.crypto.subtle.importKey(
                "raw",
                this.base32ToUint8Array(key),
                {name: "HMAC", hash: this.hashingAlg[alg]},
                false,
                ["sign"]
            );
        },

        base32ToUint8Array(base32) {
            'use strict';

            // Base32 Alphabet (RFC 4648) - uppercase only
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
            // Remove padding if any ("=" chars)
            const cleaned = base32.replace(/=+$/, '').toUpperCase();

            let bits = '';
            for (const char of cleaned) {
                const val = alphabet.indexOf(char);
                if (val < 0) {
                    console.error(`Invalid Base32 character: ${char}`);
                    return;
                }

                // Convert each 5-bit group into a binary string
                bits += val.toString(2).padStart(5, '0');
            }

            // Break the bits into bytes
            const bytes = [];
            for (let i = 0; i + 8 <= bits.length; i += 8) {
                bytes.push(parseInt(bits.slice(i, i + 8), 2));
            }

            return new Uint8Array(bytes);
        },

        async generateOtp(data) {
            'use strict';

            const {shse: secretKey, alg, nd: digits, t: timeStep} = data;
            const cryptoKey = await this.computeHmacKey(secretKey, alg);
            const currentTimeInSeconds = Math.floor(Date.now() / 1000);
            const counter = Math.floor(currentTimeInSeconds / timeStep);
            const counterBuffer = new ArrayBuffer(8);

            // create 8-byte counter value
            const view = new DataView(counterBuffer);
            view.setUint32(0, Math.floor(counter / Math.pow(2, 32)));

            // store it from index 4
            view.setUint32(4, counter >>> 0);

            const signature = await crypto.subtle.sign("HMAC", cryptoKey, counterBuffer);
            const hmacBytes = new Uint8Array(signature); // 20 byte Array Buffer

            // from the specification RFC4226: 5.4
            const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
            const truncated =
                (hmacBytes[offset] & 0x7f) << 24 |
                (hmacBytes[offset + 1] & 0xff) << 16 |
                (hmacBytes[offset + 2] & 0xff) << 8 |
                hmacBytes[offset + 3] & 0xff;

            const hotp = truncated % Math.pow(10, digits);

            return hotp.toString().padStart(digits, '0');
        }
    }
};
