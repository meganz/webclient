/**
 * @fileOverview
 * User attributes unit tests.
 */

describe("mega.attr private (*) attributes", function() {
    "use strict";

    const {assert} = chai;
    const me = 'me3456789xw';
    const master = Array.from(crypto.getRandomValues(new Uint32Array(4)), (v) => v | 0);
    const cacheKey = `${me}_*!rp`;
    let cache, uga;

    const encrypt = (obj) => base64urlencode(tlvstore.blockEncrypt(
        tlvstore.containerToTlvRecords(obj), master, tlvstore.BLOCK_ENCRYPTION_SCHEME.AES_GCM_12_16));

    const get = () => new Promise((resolve) => {
        mega.attr.get(me, 'rp', false, true).done(resolve).fail((ex) => resolve(`rejected ${ex}`));
    });

    const serve = (av) => {
        mStub(api, 'req').callsFake((req) => {
            uga.push(req.ua);
            return Promise.resolve({result: {av, v: 'v1'}});
        });
    };

    beforeEach(() => {
        cache = Object.create(null);
        uga = [];
        mStub(window, 'u_k', master);
        mStub(window, 'u_handle', me);
        mStub(attribCache, 'getItem').callsFake(
            (k) => k in cache ? MegaPromise.resolve(cache[k]) : MegaPromise.reject()
        );
        mStub(attribCache, 'setItem').callsFake((k, v) => {
            cache[k] = v;
            return MegaPromise.resolve();
        });
        mStub(attribCache, 'removeItem').callsFake((k) => {
            delete cache[k];
            return MegaPromise.resolve();
        });
    });

    afterEach(() => {
        mStub.restore();
    });

    it("decrypts a genuine value and rejects a tampered one", async() => {
        const genuine = encrypt({num: '0', c: '0'});
        serve(genuine);
        assert.strictEqual((await get()).num, '0');

        const raw = base64urldecode(genuine);
        cache = Object.create(null);
        mStub.restore();
        serve(base64urlencode(raw.slice(0, -1) + String.fromCharCode(raw.charCodeAt(raw.length - 1) ^ 1)));
        mStub(attribCache, 'getItem').returns(MegaPromise.reject());
        mStub(attribCache, 'setItem').returns(MegaPromise.resolve());
        mStub(window, 'u_k', master);
        mStub(window, 'u_handle', me);
        assert.strictEqual(await get(), `rejected ${EINTERNAL}`);
    });

    it("rejects a plain object instead of an encrypted value", async() => {
        serve({num: '1', c: '0'});
        assert.strictEqual(await get(), `rejected ${EINTERNAL}`);
    });

    it("refetches a cached plain object instead of trusting it", async() => {
        cache[cacheKey] = JSON.stringify([{av: {num: '1', c: '0'}, v: 'v0'}, 0]);
        serve(encrypt({num: '0', c: '0'}));

        assert.strictEqual((await get()).num, '0');
        assert.deepEqual(uga, ['*!rp']);
    });

    it("keeps serving a cached ENOENT without refetching", async() => {
        cache[cacheKey] = JSON.stringify([ENOENT, 0]);
        serve(encrypt({num: '0', c: '0'}));

        assert.strictEqual(await get(), `rejected ${ENOENT}`);
        assert.strictEqual(uga.length, 0);
    });

    it("does not pass a plain object through from u_attr", () => {
        assert.strictEqual(mega.attr.handleLegacyCacheAndDecryption({h: 'Shared01'}), EINTERNAL);
    });
});
