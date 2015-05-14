describe("MegaPromise Unit Test", function() {
    var _NativePromise = MegaPromise._origPromise;

    beforeEach(function(done) {
        done();
    });


    afterEach(function(done) {
        done();
    });


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

    it("all with 2 MegaPromises", function(done) {
        var p1 = new MegaPromise();
        var p2 = new MegaPromise();

        var p12 = MegaPromise.all([p1, p2]);

        p12.then(function() {
            expect(arguments.length).to.eql(2);
            expect(p1._internalPromise.state()).to.eql("resolved");
            expect(p2._internalPromise.state()).to.eql("resolved");
            expect(arguments[0]).to.eql(123);
            expect(arguments[1]).to.eql(456);
            done();
        }, function() {
            fail('.all was rejected, while it should have been resolved');
        });

        p1.resolve(123);
        p2.resolve(456);
    });

    it("native Promise to MegaPromise", function(done) {
        var n = new _NativePromise(function(res, rej) {
            res(123);
        });


        var mp = MegaPromise.asMegaPromiseProxy(n);

        mp.then(function() {
            expect(arguments.length).to.eql(1);
            expect(mp._internalPromise.state()).to.eql("resolved");
            expect(arguments[0]).to.eql(123);
            done();
        }, function() {
            fail('.all was rejected, while it should have been resolved');
        });

        mp.resolve(123);
    });

    it("jQuery Deferred to MegaPromise", function(done) {
        var n = new $.Deferred();


        var mp = MegaPromise.asMegaPromiseProxy(n);

        mp.then(function() {
            expect(arguments.length).to.eql(1);
            expect(mp._internalPromise.state()).to.eql("resolved");
            expect(arguments[0]).to.eql(123);
            done();
        }, function() {
            fail('.all was rejected, while it should have been resolved');
        });

        n.resolve(123);
    });

    it("all with 3 promises: MegaPromise, native Promise and $.Deferred", function(done) {
        var p1 = new MegaPromise();
        p1.resolve(123);

        var p2 = new _NativePromise(function(res, rej) {
            res(456);
        });

        var p3 = new $.Deferred();
        p3.resolve(789);

        var p123 = MegaPromise.all([p1, p2, p3]);

        p123.then(function() {
            expect(arguments.length).to.eql(3);
            expect(p1._internalPromise.state()).to.eql("resolved");
            expect(p3.state()).to.eql("resolved");
            expect(arguments[0]).to.eql(123);
            expect(arguments[1]).to.eql(456);
            expect(arguments[2]).to.eql(789);
            done();
        }, function() {
            fail('.all was rejected, while it should have been resolved');
        });
    });

    it("MegaPromise.all with 1 resolved and 1 rejected promises", function(done) {
        var p1 = new _NativePromise(function(res, rej) {
            rej(123);
        });

        var p2 = new _NativePromise(function(res, rej) {
            res(456);
        });

        var ap = MegaPromise.all([p1, p2]);
        ap.then(function() {
            fail('.all was resolved, while it should have been rejected');
        }, function() {
            expect(arguments.length).to.eql(1);
            expect(ap._internalPromise.state()).to.eql("rejected");
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
        } catch(e) {
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

        var minOffset = 100;
        var dummyTimedPromise = function(r, type) {
            minOffset += rand(1, 100);
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
            expect(resolved).to.eql([1, 2, 5]);
            expect(rejected).to.eql([3, 4, 6]);
            done();
        });
    });
});