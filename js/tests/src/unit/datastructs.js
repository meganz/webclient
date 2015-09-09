describe("Mega Data Structs Test", function() {
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


    it("MegaDataObject", function(done) {
        var obj = new MegaDataObject(
            {
                'u': undefined,
                'm': undefined,
                'name': undefined
            },
            true
        );

        expect(obj._dataChangeIndex).to.eql(0);

        var listenerWasCalled = false;
        var changeListenerCb = function() {
            listenerWasCalled = true;
        };

        obj.addChangeListener(changeListenerCb);

        obj.u = 123;
        setTimeout(function() {
            expect(listenerWasCalled).to.eql(true);
            expect(obj._dataChangeIndex).to.eql(1);
            done();
        }, TRACK_CHANGES_THROTTLING_MS + 1);

    });

    it("MegaDataArray", function(done) {
        var arr = new MegaDataArray();

        var obj1 = new MegaDataObject(
            {
                'u': undefined,
                'm': undefined,
                'name': undefined
            },
            true,
            {
                'u': 'u1',
                'm': 'u1@email.com',
                'name': 'u1 name'
            }
        );
        arr.push(obj1);

        var obj2 = new MegaDataObject(
            {
                'u': undefined,
                'm': undefined,
                'name': undefined
            },
            true,
            {
                'u': 'u2',
                'm': 'u2@email.com',
                'name': 'u2 name'
            }
        );

        arr.push(obj2);


        expect(obj1._dataChangeIndex).to.eql(0);

        var listenerWasCalled = false;
        var changeListenerCb = function() {
            listenerWasCalled = true;
        };

        arr.addChangeListener(changeListenerCb);

        obj1.u = 123;
        setTimeout(function() {
            expect(listenerWasCalled).to.eql(true);
            expect(obj1._dataChangeIndex).to.eql(1);
            expect(obj2._dataChangeIndex).to.eql(0);
            expect(arr._dataChangeIndex).to.eql(1);

            listenerWasCalled = false;
            arr.removeChangeListener(changeListenerCb);

            console.log("changing obj2");

            obj2.u = 321;

            setTimeout(function() {
                expect(listenerWasCalled).to.eql(false);
                expect(obj1._dataChangeIndex).to.eql(1);
                expect(obj2._dataChangeIndex).to.eql(1);
                expect(arr._dataChangeIndex).to.eql(2);

                done();
            }, TRACK_CHANGES_THROTTLING_MS + 1);
        }, TRACK_CHANGES_THROTTLING_MS + 1);

    });

    it("MegaDataMap", function(done) {
        var objMap = new MegaDataMap();

        var obj1 = new MegaDataObject(
            {
                'u': undefined,
                'm': undefined,
                'name': undefined
            },
            true,
            {
                'u': 'u1',
                'm': 'u1@email.com',
                'name': 'u1 name'
            }
        );
        objMap.set(obj1.u, obj1);

        var obj2 = new MegaDataObject(
            {
                'u': undefined,
                'm': undefined,
                'name': undefined
            },
            true,
            {
                'u': 'u2',
                'm': 'u2@email.com',
                'name': 'u2 name'
            }
        );

        objMap.set(obj2.u, obj2);


        expect(obj1._dataChangeIndex).to.eql(0);

        var listenerWasCalled = false;
        var changeListenerCb = function() {
            listenerWasCalled = true;
        };

        objMap.addChangeListener(changeListenerCb);

        obj1.u = 123;
        setTimeout(function() {
            expect(listenerWasCalled).to.eql(true);
            expect(obj1._dataChangeIndex).to.eql(1);
            expect(obj2._dataChangeIndex).to.eql(0);
            expect(objMap._dataChangeIndex).to.eql(1);

            listenerWasCalled = false;
            objMap.removeChangeListener(changeListenerCb);

            console.log("changing obj2");

            obj2.u = 321;

            setTimeout(function() {
                expect(listenerWasCalled).to.eql(false);
                expect(obj1._dataChangeIndex).to.eql(1);
                expect(obj2._dataChangeIndex).to.eql(1);
                expect(objMap._dataChangeIndex).to.eql(2);

                done();
            }, TRACK_CHANGES_THROTTLING_MS + 1);
        }, TRACK_CHANGES_THROTTLING_MS + 1);
    });
});