factory.define('pbkdf2', () => {
    'use strict';
    const te = new TextEncoder('utf-8');
    const TypedArray = Object.getPrototypeOf(Uint16Array);

    const assert = (expr, message = 'unexpected data type or length.') => {
        if (!expr) {
            throw new TypeError(message);
        }
    };

    return freeze({
        async sha256(payload, salt, iterations = 1e5) {
            const algo = {
                salt,
                iterations,
                name: 'PBKDF2',
                hash: 'SHA-256'
            };
            if (typeof payload === 'string') {
                payload = te.encode(payload.trim());
            }
            assert(salt instanceof TypedArray && salt.byteLength > 15);
            assert(payload instanceof TypedArray && payload.byteLength);

            const key = await crypto.subtle.importKey('raw', payload, algo.name, false, ['deriveBits']);

            return crypto.subtle.deriveBits(algo, key, 256);
        }
    });
});
