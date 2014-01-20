describe("Karere Unit Test", function() {
    var k1;
    var k2;
    var em1;
    var em2;
    beforeEach(function(done) {
        k1 = new Karere();
        k2 = new Karere();

        em1 = new EventMocker(k1);
        em2 = new EventMocker(k2);

        done();
    });


    afterEach(function(done) {
        k1 = k2 = em1 = em2 = null;

        done();
    });


    // this was a tricky to find bug, this is why i wrote a unit test to make sure it wont regress back in the future.
    it("can trigger events on different objects", function(done) {
        k1.on('onFakeEvent', function(e, arg) {
            expect(arg).to.equal("k1");
        });
        k2.on('onFakeEvent', function(e, arg) {
            expect(arg).to.equal("k2");
        });

        k1.trigger('onFakeEvent', "k1");
        k2.trigger('onFakeEvent', "k2");

        done();
    });

});