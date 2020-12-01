describe("Test array.* methods", function() {
    'use strict';
    var assert = chai.assert;

    it("can convert to object", function() {
        var a = array.to.object([1, 2, 3, 4, 5, 6, 0]);

        assert.strictEqual(JSON.stringify(a), '{"0":7,"1":1,"2":2,"3":3,"4":4,"5":5,"6":6}');
    });

    it("can obtain random value", function() {
        var a = [123, 6785, 'fas', 23, 'poex'];
        var r = array.random(a);

        expect(a.indexOf(r)).to.greaterThan(-1);
    });

    it("can obtain unique array", function() {
        var a = array.unique([1, Math.pow(2, 32), 2, 3, 4, 4, Math.pow(2, 32), 4, 5]);

        assert.strictEqual(JSON.stringify(a), '[1,4294967296,2,3,4,5]');
    });

    it("can remove value", function() {
        var a = [6, 5, 3, 6, 7, 9, 4, 9];
        var r = array.remove(a, 6);

        assert.strictEqual(r, true);
        assert.strictEqual(JSON.stringify(a), '[5,3,6,7,9,4,9]');
    });

    it("can pack and unpack", function() {
        var a = ['', '', '1', '2', '1', '2', '4', '4', '4', '0', '', '0', '', '6'];
        var p = array.pack(a);
        var u = array.unpack(p);

        assert.strictEqual(p, '*2,1>2*2,4*3,0>*2,6');
        assert.strictEqual(JSON.stringify(a), JSON.stringify(u));
    });
});

describe('Test promisify and mutex', function() {
    'use strict';
    var assert = chai.assert;

    it('can lock and unlock', function(done) {
        var result = [];
        var tag = 'begin';
        var push = function(resolve) {
            result.push(tag);
            onIdle(resolve);
        };
        var fail = function(ex) {
            onIdle(function() {
                throw ex;
            });
        };
        var mName = 'mutex-test';
        var mMethod = mutex(mName, push);

        expect(Object.isFrozen(mMethod)).to.eq(true);
        expect(Object.isExtensible(mMethod)).to.eq(false);

        assert.strictEqual(mMethod.__name__, mName);
        assert.strictEqual(push.__method__, mMethod);
        assert.strictEqual(mMethod.__function__, push);
        assert.strictEqual(mutex.lock.__function__.__method__, mutex.lock);
        assert.strictEqual(mutex.unlock.__function__.__method__, mutex.unlock);

        push(mutex.unlock);
        mutex.lock('foo').then(function(unlock) {
            tag = 'x1';
            mutex.lock(mName)
                .then(function(a0) {
                    tag = 'meth';
                    return push(a0);
                });
            tag = 'x2';
            mMethod().then(function(a0) {
                tag = 'm2';
                return unlock(a0);
            });
            assert.strictEqual(JSON.stringify(mutex.queue), '{"foo":[null],"' + mName + '":[null]}');
        }).catch(fail);

        tag = 'x3';
        mutex.lock('foo').then(function(unlock) {
            assert.strictEqual(JSON.stringify(mutex.queue), '{"foo":[]}');
            tag = 'stack';
            push(unlock);
            tag = 'x4';
            return unlock();
        }).then(function() {
            tag = 'end';
            push(mMethod);
            assert.strictEqual(JSON.stringify(mutex.queue), '{}');
            assert.strictEqual(result.join('.'), 'begin.meth.meth.stack.end');
            done();
        }).catch(fail);
    });
});
