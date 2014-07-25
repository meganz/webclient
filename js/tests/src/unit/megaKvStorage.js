describe("MegaKVStorage Unit Test", function() {
    var mkv;
    beforeEach(function(done) {
        localStorage.clear();
        mkv = new MegaKVStorage("unittests", localStorage)

        done();
    });


    afterEach(function(done) {
        mkv.clear();

        done();
    });


    it("set, has item", function(done) {
        expect(mkv.hasItem("name")).to.eql(false);
        mkv.setItem("name", "value");
        expect(mkv.hasItem("name")).to.eql(true);
        expect(mkv.getItem("name")).to.eql("value");

        expect(
            localStorage["unittests.name"]
        ).to.eql("value");
        done();
    });

    it("set and has with expiry", function(done) {
        var fakeTime = 1000;

        sinon.stub(window, 'unixtime', function() {
            return fakeTime;
        });

        expect(mkv.hasItem("name")).to.eql(false);

        mkv.setItem("name", "value", 10);

        expect(mkv.hasItem("name")).to.eql(true);
        expect(mkv.getItem("name")).to.eql("value");

        fakeTime = 1500;
        expect(mkv.hasItem("name")).to.eql(false);

        mkv.setItem("name", "value", 10);
        fakeTime = 1600;

        expect(mkv.getItem("name")).to.eql(undefined);

        expect(
            localStorage["unittests.name"]
        ).to.eql(undefined);
        expect(
            localStorage["unittests.name.exp"]
        ).to.eql(undefined);

        window.unixtime.restore();

        done();
    });
    it("remove item", function(done) {
        expect(mkv.hasItem("name")).to.eql(false);
        mkv.setItem("name", "value");
        expect(mkv.hasItem("name")).to.eql(true);
        expect(mkv.getItem("name")).to.eql("value");

        mkv.removeItem("name");
        expect(mkv.hasItem("name")).to.eql(false);

        expect(
            localStorage["unittests.name"]
        ).to.be.empty;
        done();
    });

    it("clear", function(done) {
        localStorage.test = 'test!';
        mkv.setItem("name", "value");

        expect(mkv.hasItem("name")).to.eql(true);

        mkv.clear();
        expect(mkv.hasItem("name")).to.eql(false);

        expect(
            localStorage["unittests.name"]
        ).to.be.empty;

        expect(
            localStorage.test
        ).to.eql('test!');

        done();
    });
});