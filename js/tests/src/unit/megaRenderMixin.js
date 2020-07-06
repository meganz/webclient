describe("MegaRenderMixinTest", function() {
    var megaDataMocker;

    beforeEach(function(done) {
        window.u_handle = "A_1234567890";
        window.u_privk = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100'));

        megaDataMocker = new MegaDataMocker();

        done();
    });


    afterEach(function(done) {
        megaDataMocker.restore();
        localStorage.clear();

        done();
    });


    window.RENDER_DEBUG = 1;

    it("Simple test with a check if forceUpdate was called properly", function(done) {

        // init data structures
        var dataMap = new MegaDataMap();
        var obj1 = new MegaDataObject({'f1': 1, 'f2': 2}, true);
        var obj2 = new MegaDataObject({'f1': 3, 'f2': 4}, true);
        dataMap.set('obj1', obj1);
        dataMap.set('obj2', obj2);

        // init react, element 1
        var relement1 = generateDummyReactInstance('dummyMap', {
            'dataMap':  dataMap
        });
        applyMixinToReactElement(relement1, MegaRenderMixin);

        relement1.simulateDidMount();

        expect(relement1.forceUpdate.callCount).to.eql(0);

        // init react, element 2
        var relement2 = generateDummyReactInstance('dummyObj1', {
            'obj1':  obj1
        });
        applyMixinToReactElement(relement2, MegaRenderMixin);

        relement2.simulateDidMount();

        expect(relement2.forceUpdate.callCount).to.eql(0);

        // use case
        obj1.f1 = 11;

        setTimeout(function() {
            expect(relement1.forceUpdate.callCount).to.eql(1);
            expect(relement2.forceUpdate.callCount).to.eql(1);

            done();
        }, 60)
    });


    it("Simple test with a check if forceUpdate was called efficiently", function(done) {

        // init data structures
        var dataMap = new MegaDataMap();
        var obj1 = new MegaDataObject({'f1': 1, 'f2': 2}, true);
        var obj2 = new MegaDataObject({'f1': 3, 'f2': 4}, true);
        dataMap.set('obj1', obj1);
        dataMap.set('obj2', obj2);

        // init react, element 1
        var relement1 = generateDummyReactInstance('dummyMap', {
            'dataMap':  dataMap
        });
        applyMixinToReactElement(relement1, MegaRenderMixin);

        relement1.simulateDidMount();

        expect(relement1.forceUpdate.callCount).to.eql(0);

        // init react, element 2
        var relement2 = generateDummyReactInstance('dummyObj1', {
            'obj1':  obj1
        });
        applyMixinToReactElement(relement2, MegaRenderMixin);

        relement2.simulateDidMount();

        expect(relement2.forceUpdate.callCount).to.eql(0);

        // use case
        obj1.f1 = 11;
        setTimeout(function() {
            obj1.f2 = 11;
            dataMap.remove('obj2');
        }, 60);

        setTimeout(function() {
            expect(relement1.forceUpdate.callCount).to.eql(1);
            expect(relement2.forceUpdate.callCount).to.eql(1);

            done();
        }, 90)
    });

});
