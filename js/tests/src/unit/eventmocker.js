describe("EventMocker Unit Test", function() {
    var obj;
    var em;
    beforeEach(function(done) {
        obj = {};
        em = new EventMocker(obj);

        done();
    });


    afterEach(function(done) {
        obj = null;
        em = null;

        done();
    });


    it("can mock an object", function(done) {
        em.mock("test");

        $(obj).trigger("test");

        expect(em.mocks["test"].triggeredCount).to.be.above(0);
        done();
    });

    it("can mock and wait for an event to be called", function(done) {
        var $promise = expectToBeResolved(
            em.mockAndWait("test", 1000),
            'mockAndWait was not resolved successfully.',
            done
        );

        $(obj).trigger("test");

        expect(em.mocks["test"].triggeredCount).to.be.above(0);

        $.when($promise).done(function() {
            done();
        });
    });

    it("can mock and timeout", function(done) {
        var $promise = em.mockAndWait("test", 200);

        expect(em.mocks["test"].triggeredCount).to.equal(0);

        $promise.always(function() {
            expect($promise.state()).to.equal('rejected');

            done();
        });
    });

    it("can mock an get arguments of the called event", function(done) {
        em.mock("test");

        $(obj).trigger("test", [1, 2, 3]);

        expect(em.mocks["test"].triggeredCount).to.be.above(0);

        expect(em.mocks["test"].triggeredArgs[0][0].type).to.equal("test");
        expect(em.mocks["test"].triggeredArgs[0].length).to.equal(4);
        expect(em.mocks["test"].triggeredArgs[0][3]).to.equal(3);

        $(obj).trigger("test", [3, 2, 1]);

        expect(em.mocks["test"].triggeredCount).to.be.above(1);

        expect(em.mocks["test"].triggeredArgs[1][0].type).to.equal("test");
        expect(em.mocks["test"].triggeredArgs[1].length).to.equal(4);
        expect(em.mocks["test"].triggeredArgs[1][3]).to.equal(1);

        done();
    });
});