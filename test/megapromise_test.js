describe("MegaPromise Unit Test", function() {
    var assert = chai.assert;
    var fail = function(message) {
        assert(false, message);
    };

    it("resolve - 1 arg", function(done) {
        var p;
        p = new MegaPromise();
        p.done(function() {
            expect(arguments.length).to.eql(1);
            expect(arguments[0]).to.eql(123);

            done();
        });

        p.resolve(123);
    });

    it("resolve - 2 args", function(done) {
        var p;
        p = new MegaPromise();
        p.done(function() {
            expect(arguments.length).to.eql(2);
            expect(arguments[0]).to.eql(123);
            expect(arguments[1]).to.eql(456);

            done();
        });

        p.resolve(123, 456);
    });

    it("reject - 1 arg", function(done) {
        var p;
        p = new MegaPromise();
        p.fail(function() {
            expect(arguments.length).to.eql(1);
            expect(arguments[0]).to.eql(123);

            done();
        });

        p.reject(123);
    });

    it("reject - 2 args", function(done) {
        var p;
        p = new MegaPromise();
        p.fail(function() {
            expect(arguments.length).to.eql(2);
            expect(arguments[0]).to.eql(123);
            expect(arguments[1]).to.eql(456);

            done();
        });

        p.reject(123, 456);
    });

    it("then - resolve - 1 arg", function(done) {
        var p;
        p = new MegaPromise();
        p.then(function() {
            expect(arguments.length).to.eql(1);
            expect(arguments[0]).to.eql(123);

            done();
        }, function() {
            fail('reject was called instead of resolve.');
        });

        p.resolve(123);
    });

    it("then - resolve - 2 args", function(done) {
        var p;
        p = new MegaPromise();
        p.then(function() {
            expect(arguments.length).to.eql(2);
            expect(arguments[0]).to.eql(123);
            expect(arguments[1]).to.eql(456);

            done();
        }, function() {
            fail('reject was called instead of resolve.');
        });

        p.resolve(123, 456);
    });

    it("then - reject - 1 arg", function(done) {
        var p;
        p = new MegaPromise();
        p.then(function() {
            fail('resolve was called instead of reject.');
        }, function() {
            expect(arguments.length).to.eql(1);
            expect(arguments[0]).to.eql(123);

            done();
        });

        p.reject(123);
    });

    it("then - reject - 2 args", function(done) {
        var p;
        p = new MegaPromise();
        p.then(function() {
            fail('resolve was called instead of reject.');
        }, function() {
            expect(arguments.length).to.eql(2);
            expect(arguments[0]).to.eql(123);
            expect(arguments[1]).to.eql(456);

            done();
        });

        p.reject(123, 456);
    });

    it("then passthrough reject", function(done) {
        var v = "";
        var p = new MegaPromise();
        p
            .then(function(arg) {
                v = arg + '-donecb';

                return v;
            })
            .then(undefined, function(arg) {
                    v = arg + '-failcb';

                    return v;
            })
            .then(function() {
                expect(v).to.eql('rej-arg-failcb');
                done();
            });

        p.reject('rej-arg');
    });

    it("then passthrough resolve", function(done) {
        var v = "";
        var p = new MegaPromise();
        p
            .then(function(arg) {
                v = arg + '-donecb';
                return v;
            })
            .then(undefined, function(arg) {
                v = arg + '-failcb';
                return v;
            })
            .then(function() {
                expect(v).to.eql('res-arg-donecb');
                done();
            });

        p.resolve('res-arg');
    });

    it("all with no promises", function(done) {
        var pCombo = MegaPromise.all([]);

        pCombo.then(function() {
            expect(arguments.length).to.eql(1);
            done();
        }, function() {
            fail('.all was rejected, while it should have been resolved');
        });
    });

    it("all with 2 MegaPromises", function(done) {
        var p1 = new MegaPromise();
        var p2 = new MegaPromise();

        var p12 = MegaPromise.all([p1, p2]);

        p12.then(function() {
            expect(arguments.length).to.eql(1);
            expect(p1.state()).to.eql("resolved");
            expect(p2.state()).to.eql("resolved");
            expect(arguments[0]).to.deep.equal([123, 456]);
            done();
        }, function() {
            fail('.all was rejected, while it should have been resolved');
        });

        p1.resolve(123);
        p2.resolve(456);
    });

    it("native Promise to MegaPromise", function(done) {
        var n = new Promise(function(res, rej) {
            res(123);
        });

        var mp = MegaPromise.asMegaPromiseProxy(n);

        mp.then(function() {
            expect(arguments.length).to.eql(1);
            expect(mp.state()).to.eql("resolved");
            expect(arguments[0]).to.eql(123);
            done();
        }, function() {
            fail('MegaPromise was rejected, while it should have been resolved');
        });

        mp.resolve(123);
    });

    it("jQuery Deferred to MegaPromise", function(done) {
        var n = new $.Deferred();

        var mp = MegaPromise.asMegaPromiseProxy(n);

        mp.then(function() {
            expect(arguments.length).to.eql(1);
            expect(mp.state()).to.eql("resolved");
            expect(arguments[0]).to.eql(123);
            done();
        }, function() {
            fail('MegaPromise was rejected, while it should have been resolved');
        });

        n.resolve(123);
    });

    it("all with 3 promises: MegaPromise, native Promise and $.Deferred", function(done) {
        var p1 = new MegaPromise();
        p1.resolve(123);

        var p2 = new Promise(function(res, rej) {
            res(456);
        });

        var p3 = new $.Deferred();
        p3.resolve(789);

        var p123 = MegaPromise.all([p1, p2, p3]);

        p123.then(function() {
            expect(arguments.length).to.eql(1);
            expect(p1.state()).to.eql("resolved");
            expect(p3.state()).to.equal("resolved");
            expect(arguments[0]).to.deep.equal([123, 456, 789]);
            done();
        }, function() {
            fail('.all was rejected, while it should have been resolved');
        });
    });

    it("MegaPromise.all with 1 resolved and 1 rejected promises", function(done) {
        var p1 = new Promise(function(res, rej) {
            rej(123);
        });

        var p2 = new Promise(function(res, rej) {
            res(456);
        });

        var ap = MegaPromise.all([p1, p2]);
        ap.then(function() {
            fail('.all was resolved, while it should have been rejected');
        }, function() {
            expect(arguments.length).to.eql(1);
            expect(ap.state()).to.eql("rejected");
            expect(arguments[0]).to.eql(123);
            done();
        });
    });

    it("exception handling", function(done) {
        var p1 = new MegaPromise();

        p1.done(function() {
            x.undefined_function();
        });

        try {
            p1.resove(123);
            fail("p1.resolve should have triggered an exception!");
        } catch (e) {
            expect(e instanceof TypeError).to.eql(true);
            done();
        }
    });

    it("MegaPromise.resolve, MegaPromise.reject", function(done) {
        MegaPromise.resolve(123, 456)
            .done(function(a1, a2) {
                expect(a1).to.eql(123);
                expect(a2).to.eql(456);

                MegaPromise.reject(123, 456)
                    .fail(function(a1, a2) {
                        expect(a1).to.eql(123);
                        expect(a2).to.eql(456);

                        done();
                    });
            });
    });

    it('MegaPromise.pipe', function(done) {
        var p1 = function() {
            var p = new MegaPromise();
            setTimeout(function() {
                result.push('p1-resolved');
                p.resolve(111);
            }, 20);
            return p;
        };
        var p2 = function(v) {
            var p = new MegaPromise();
            setTimeout(function() {
                result.push('p2-resolved');
                p.resolve(v<<1);
            }, 80);
            return p;
        };
        var track = function(tag) {
            return function(res) {
                result.push(tag + '$' + res);
            };
        };
        var result = [];
        var promise = p1().done(track('p1-done'));

        // pipe will now transparently replace 'promise' to the one returned from its callback
        promise.pipe(function(res) {
            track('pipe')(res);

            return p2(res);
        });

        // wait for p2 fulfilment
        promise.done(track('p1-to-p2'));

        promise.always(function(res) {
            track('done')(res);
            assert.strictEqual(JSON.stringify(result),
                '["p1-resolved","p1-done$111","pipe$111","p2-resolved","p1-to-p2$222","done$222"]');
            done();
        });
    });

    it('MegaPromise.unpack', function(done) {
        var p1 = new MegaPromise();
        var p2 = new MegaPromise();
        var p3 = new MegaPromise();

        MegaPromise.allDone([p1, p3, p2])
            .unpack(function(res) {
                assert.strictEqual(JSON.stringify(res), '[222,111,333]');
                done();
            });

        p2.resolve(222);
        p1.resolve(111, 999);
        p3.reject(333);
    });

    it("Multiple promises, combined with $.when", function(done) {
        var resolved = [];
        var rejected = [];

        var _trackPromise = function(p) {
            return p
                .done(function(a) {
                    resolved.push(a);
                })
                .fail(function(a) {
                    rejected.push(a);
                });
        };

        var minOffset = 10;
        var dummyTimedPromise = function(r, type) {
            minOffset += Math.random() * 10 | 0;
            var p = (new MegaPromise());
            setTimeout(function() {
                p[type](r);
            }, minOffset);

            return p;
        };

        MegaPromise.allDone([
            _trackPromise(dummyTimedPromise(1, 'resolve')),
            _trackPromise(dummyTimedPromise(2, 'resolve')),
            _trackPromise(dummyTimedPromise(3, 'reject')),
            _trackPromise(dummyTimedPromise(4, 'reject')),
            _trackPromise(dummyTimedPromise(5, 'resolve')),
            _trackPromise(dummyTimedPromise(6, 'reject'))
        ]).always(function() {
            expect(resolved).to.deep.eql([1, 2, 5]);
            expect(rejected).to.deep.eql([3, 4, 6]);
            done();
        });
    });

    it(".allDone with both reject and resolve being called on the passed promises", function(done) {
        var resolved = [];
        var rejected = [];

        var _trackPromise = function(p) {
            return p
                .done(function(a) {
                    resolved.push(a);
                })
                .fail(function(a) {
                    rejected.push(a);
                });
        };

        var minOffset = 10;
        var dummyTimedPromise = function(r, type) {
            minOffset += Math.random() * 10 | 0;
            var p = (new MegaPromise());
            setTimeout(function() {
                p[type](r);
            }, minOffset);

            return p;
        };

        var masterPromise = MegaPromise.allDone([
            _trackPromise(dummyTimedPromise(1, 'resolve')),
            _trackPromise(dummyTimedPromise(2, 'resolve')),
            _trackPromise(dummyTimedPromise(3, 'reject')),
            _trackPromise(dummyTimedPromise(4, 'reject')),
            _trackPromise(dummyTimedPromise(5, 'resolve')),
            _trackPromise(dummyTimedPromise(6, 'reject'))
        ]);
        var resolvedSpy = sinon.stub();
        var rejectedSpy = sinon.stub();
        masterPromise.done(resolvedSpy);
        masterPromise.fail(rejectedSpy);

        masterPromise.always(function() {
            expect(resolved).to.deep.eql([1, 2, 5]);
            expect(rejected).to.deep.eql([3, 4, 6]);
            expect(rejectedSpy.callCount).to.eql(0);
            expect(resolvedSpy.callCount).to.eql(1);

            done();
        });
    });

    it("test MegaPromise.QueuedPromiseCallbacks", function(done) {
        var queue = MegaPromise.QueuedPromiseCallbacks();

        var callstack = [];

        var res = function(name, timeout) {
            return function() {
                callstack.push([name, "called"]);
                var p = new MegaPromise();
                setTimeout(function() {
                    callstack.push([name, "finished"]);
                    p.resolve();
                }, timeout);

                return p;
            }
        };

        var rej = function(name, timeout) {
            return function() {
                callstack.push([name, "called"]);
                var p = new MegaPromise();
                setTimeout(function() {
                    callstack.push([name, "finished"]);
                    p.reject();
                }, timeout);

                return p;
            }
        };

        queue.queue(res("p1", 10));
        queue.queue(res("p2", 15));
        queue.queue(rej("p3", 30));
        queue.queue(res("p4", 20));
        queue.tick();

        var expected = [
            ["p1", "called"],
            ["p1", "finished"],
            ["p2", "called"],
            ["p2", "finished"],
            ["p3", "called"],
            ["p3", "finished"],
            ["p4", "called"],
            ["p4", "finished"],
        ];
        setTimeout(function() {
            assert(
                JSON.stringify(callstack) === JSON.stringify(expected),
                'Unexpected call order, expected ' + JSON.stringify(expected, null, '\t') + '\ngot: ' +
                JSON.stringify(callstack, null, '\t')
            );
            done();
        }, 300);
    })
});
