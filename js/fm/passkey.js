/**
 * Passkey (WebAuthn + PRF) login. PRF -> HKDF -> AES-GCM key wrapping u_k into wmk, opaque to the api.
 */
lazy(security, 'passkey', () => {

    'use strict';

    const PRF_SALT = asmCrypto.SHA256.bytes('mega.io/passkey-prf/v1');
    const HKDF_INFO = new TextEncoder().encode('mega.io passkey MK-KEK v1');
    const RP_ID = 'mega.io';
    const WMK_VERSION = 1;

    return {

        isSupported() {
            return typeof PublicKeyCredential !== 'undefined' &&
                !!(navigator.credentials && navigator.credentials.create && navigator.credentials.get);
        },

        isEnabled() {
            return !!(mega.flags.ff_pk || localStorage.passkeyEnabled);
        },

        async signalAccepted(credentialIds) {

            const signal = self.PublicKeyCredential && PublicKeyCredential.signalAllAcceptedCredentials;

            if (typeof signal !== 'function' || !Array.isArray(credentialIds) || !self.u_handle) {
                return;
            }

            await PublicKeyCredential.signalAllAcceptedCredentials({
                rpId: this._rpId(),
                userId: u_handle,
                allAcceptedCredentialIds: credentialIds
            });
        },

        // n is TLV + AES-GCM under the master key (tlvstore.encrypt)
        list() {
            return api.req({a: 'pkls'}).then(({result}) =>
                result[1].map(r => ({...r, n: tryCatch(() => tlvstore.decrypt(r.n), false)() || l[7381]})));
        },

        rename(id, name) {
            return api.req({a: 'pkud', id, n: tlvstore.encrypt(name)}).catch(tell);
        },

        remove(id) {
            return api.req({a: 'pkdel', id: [id]}).then(res => {
                this._signalUnknown(id);
                return res;
            }).catch(tell);
        },

        // 64 plaintext bytes = at most 128 bytes of encrypted n on the API
        isValidName(name) {
            return !!name && to8(name).length <= 64;
        },

        clipName(name) {

            let clipped = '';

            for (const ch of name) {

                if (to8(clipped + ch).length > 64) {
                    break;
                }
                clipped += ch;
            }

            return clipped;
        },

        async register(name) {

            if (!this.isSupported()) {
                throw new Error('passkey: unsupported browser');
            }

            const {result: [, opt]} = await api.req({a: 'pkap'});
            const publicKey = {
                challenge: this._b64ToBytes(opt.ch),
                rp: {id: this._rpId(), name: 'MEGA'},
                user: {id: this._b64ToBytes(opt.uh), name: opt.un || '', displayName: opt.un || ''},
                pubKeyCredParams: [{type: 'public-key', alg: -7}, {type: 'public-key', alg: -257}],
                authenticatorSelection: {
                    residentKey: 'required',
                    requireResidentKey: true,
                    userVerification: 'required'
                },
                attestation: 'none',
                excludeCredentials: (opt.xc || []).map(id => ({type: 'public-key', id: this._b64ToBytes(id)})),
                timeout: this._msTimeout(opt.to),
                extensions: {prf: {eval: {first: PRF_SALT}}}
            };
            const cred = await navigator.credentials.create({publicKey});

            return this._enrol(cred, opt, name).catch(ex => {
                this._signalUnknown(ab_to_base64(cred.rawId));
                throw ex;
            });
        },

        async isPrfSupported() {

            const caps = typeof PublicKeyCredential !== 'undefined' &&
                typeof PublicKeyCredential.getClientCapabilities === 'function' &&
                await PublicKeyCredential.getClientCapabilities().catch(nop);

            return !caps || caps['extension:prf'] !== false;
        },

        _signalUnknown(credentialId) {

            const signal = self.PublicKeyCredential && PublicKeyCredential.signalUnknownCredential;

            if (typeof signal === 'function') {
                PublicKeyCredential.signalUnknownCredential({rpId: this._rpId(), credentialId}).catch(dump);
            }
        },

        // RpID for both mega.co.nz and mega.io.
        _rpId() {
            return localStorage.passkeyRpId || (location.hostname.endsWith('.mega.co.nz') ? 'mega.co.nz' : RP_ID);
        },

        _b64ToBytes(b64) {
            return Uint8Array.from(base64urldecode(b64), c => c.charCodeAt(0));
        },

        _msTimeout(to) {
            return (to >= 30 && to <= 1800 ? to : 120) * 1000;
        },

        // debug fingerprint: first 4 bytes of sha256(label || bytes), never the value itself
        _fp(bytes) {

            const label = new TextEncoder().encode('mega passkey debug fp');
            const hash = asmCrypto.SHA256.bytes(new Uint8Array([...label, ...bytes]));

            return [...hash.subarray(0, 4)].map(b => b.toString(16).padStart(2, '0')).join('');
        },

        _prfResult(cred) {

            const ext = cred && cred.getClientExtensionResults && cred.getClientExtensionResults();
            const first = ext && ext.prf && ext.prf.results && ext.prf.results.first;

            return first && first.byteLength === 32 ? new Uint8Array(first) : false;
        },

        async _prfToKek(prfOutput) {

            const ikm = await crypto.subtle.importKey('raw', prfOutput, 'HKDF', false, ['deriveKey']);

            return crypto.subtle.deriveKey(
                {name: 'HKDF', salt: new Uint8Array(0), info: HKDF_INFO, hash: 'SHA-256'},
                ikm,
                {name: 'AES-GCM', length: 256},
                false,
                ['encrypt', 'decrypt']
            );
        },

        // blob = version(1) || iv(12) || ct+tag
        async _wrapMasterKey(masterKeyArray32, prfOutput) {

            const kek = await this._prfToKek(prfOutput);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const buf = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, kek, a32_to_ab(masterKeyArray32));
            const ct = new Uint8Array(buf);
            const blob = new Uint8Array(1 + iv.length + ct.length);

            blob[0] = WMK_VERSION;
            blob.set(iv, 1);
            blob.set(ct, 1 + iv.length);

            return ab_to_base64(blob.buffer);
        },

        async _unwrapMasterKey(wmkBase64, prfOutput) {

            const blob = this._b64ToBytes(wmkBase64);

            if (blob[0] !== WMK_VERSION) {
                throw new Error(`passkey: unsupported wmk version ${blob[0]}`);
            }

            const kek = await this._prfToKek(prfOutput);
            const pt = await crypto.subtle.decrypt({name: 'AES-GCM', iv: blob.subarray(1, 13)}, kek, blob.subarray(13));

            return base64_to_a32(ab_to_base64(pt));
        },

        async _enrol(cred, opt, name) {

            const ext = cred.getClientExtensionResults();

            if (!ext.prf || ext.prf.enabled !== true) {
                throw new MEGAException('passkey: no prf', null, 'PrfUnsupported');
            }

            let prfOutput = this._prfResult(cred);

            if (!prfOutput) {

                const assertion = await navigator.credentials.get({
                    publicKey: {
                        challenge: crypto.getRandomValues(new Uint8Array(32)),
                        rpId: this._rpId(),
                        allowCredentials: [{type: 'public-key', id: cred.rawId}],
                        userVerification: 'required',
                        extensions: {prf: {eval: {first: PRF_SALT}}}
                    }
                });

                prfOutput = this._prfResult(assertion);
            }

            if (!prfOutput) {
                throw new MEGAException('passkey: no prf', null, 'PrfUnsupported');
            }

            const wmk = await this._wrapMasterKey(u_k, prfOutput);
            const check = await this._unwrapMasterKey(wmk, prfOutput);

            if (d) {
                console.log(`passkey enrol uh=${opt.uh} cred=${ab_to_base64(cred.rawId).slice(0, 8)}`,
                            `prf=${this._fp(prfOutput)} from=${this._prfResult(cred) ? 'create' : 'get'}`,
                            `wmk=${this._fp(this._b64ToBytes(wmk))}`);
            }

            if (a32_to_base64(check) !== a32_to_base64(u_k)) {
                throw new Error('passkey: wmk self-test failed');
            }

            await api.req({
                a: 'pkae',
                att: ab_to_base64(cred.response.attestationObject),
                cdj: ab_to_base64(cred.response.clientDataJSON),
                wmk,
                n: tlvstore.encrypt(name),
                t: opt.t,
                ist: this._rpId() === RP_ID ? undefined : 1
            });

            return true;
        },

        async _clearGate(gate, handlers, uh, isRetry) {

            const proof = await handlers.onTwoFactor(isRetry);

            if (!proof) {
                return false;
            }

            const res = await api.req({a: 'pkl', t2: gate.t2, mfa: proof, uh}).then(({result}) => result[1])
                .catch(echo);

            if (res instanceof Error) {
                throw res;
            }

            if (typeof res === 'object') {
                return res;
            }

            if (![EFAILED, EMFAREQUIRED].includes(res)) {
                throw new Error(`passkey: pkl 2fa failed (${res})`);
            }

            return this._clearGate(gate, handlers, uh, true);
        },

        async login(completeCallback, handlers) {

            if (!this.isSupported()) {
                throw new Error('passkey: unsupported browser');
            }

            security.login.rememberMe = !!(handlers && handlers.rememberMe);

            const {result: [, opt]} = await api.req({a: 'pkgc'});
            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge: this._b64ToBytes(opt.ch),
                    rpId: this._rpId(),
                    userVerification: 'required',
                    timeout: this._msTimeout(opt.to),
                    extensions: {prf: {eval: {first: PRF_SALT}}}
                }
            });

            const prfOutput = this._prfResult(assertion);

            if (!prfOutput) {
                throw new MEGAException('passkey: no prf', null, 'PrfUnsupported');
            }

            const ar = assertion.response;
            const uh = ar.userHandle ? ab_to_base64(ar.userHandle) : undefined;
            let {result: [, result]} = await api.req({
                a: 'pkl',
                id: ab_to_base64(assertion.rawId),
                ad: ab_to_base64(ar.authenticatorData),
                cdj: ab_to_base64(ar.clientDataJSON),
                sig: ab_to_base64(ar.signature),
                uh,
                t: opt.t,
                ist: this._rpId() === RP_ID ? undefined : 1
            });

            if (result && result.r === 'mfa') {

                result = await this._clearGate(result, handlers || {}, uh);

                if (result === false) {
                    return false;
                }
            }

            if (!result || !result.wmk) {
                throw new Error('passkey: pkl returned no wmk');
            }

            if (d) {
                const blob = this._b64ToBytes(result.wmk);

                console.log(`passkey pkl ok uh=${uh} cred=${ab_to_base64(assertion.rawId).slice(0, 8)}`,
                            `prf=${this._fp(prfOutput)} wmk=v${blob[0]}/${blob.length}B/${this._fp(blob)}`);
            }

            const masterKey = await this._unwrapMasterKey(result.wmk, prfOutput);

            security.login.loginCompleteCallback = completeCallback;

            return security.login.decryptRsaKeyAndSessionId(masterKey, result.csid, result.privk, result.u);
        }
    };
});
