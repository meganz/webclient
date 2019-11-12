describe("Mega Data Structs Test", function() {

    var DEBUG_MODE = false;

    var waitForChangeListener = function(map) {
        var promise = new MegaPromise();
        map.addChangeListener(function() {
            setTimeout(function() {
                // mBroadcaster catches errors..., so we need to get out of its try{} catch{} thread...
                promise.resolve();
            }, 0);
            // then remove listener.
            return 0xDEAD;
        });
        return promise;
    };

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


            obj2.u = 321;

            setTimeout(function() {
                expect(listenerWasCalled).to.eql(false);
                expect(obj1._dataChangeIndex).to.eql(1);
                expect(obj2._dataChangeIndex).to.eql(1);
                expect(arr._dataChangeIndex).to.eql(2);

                done();
            }, TRACK_CHANGES_THROTTLING_MS + 50);
        }, TRACK_CHANGES_THROTTLING_MS + 50);

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


            obj2.u = 321;

            setTimeout(function() {
                expect(listenerWasCalled).to.eql(false);
                expect(obj1._dataChangeIndex).to.eql(1);
                expect(obj2._dataChangeIndex).to.eql(1);
                expect(objMap._dataChangeIndex).to.eql(2);

                done();
            }, TRACK_CHANGES_THROTTLING_MS + 50);
        }, TRACK_CHANGES_THROTTLING_MS + 50);
    });

    it("MegaDataSortedMap", function(done) {
        var sortedMap = new MegaDataSortedMap("messageId", MessagesBuff.orderFunc);
        var listenerWasCalledCount = 0;
        var changeListenerCb = function(changed) {
            if (DEBUG_MODE) {
                console.error("change: ", Object.keys(arguments[0])[0]);
            }
            listenerWasCalledCount++;
        };
        sortedMap.addChangeListener(changeListenerCb);


        waitForChangeListener(sortedMap)
            .done(function() {
                expect(listenerWasCalledCount).to.eql(1);

                waitForChangeListener(sortedMap)
                    .done(function() {
                        expect(listenerWasCalledCount).to.eql(2);

                        waitForChangeListener(sortedMap)
                            .done(function() {
                                expect(listenerWasCalledCount).to.eql(3);

                                waitForChangeListener(sortedMap)
                                    .done(function() {
                                        expect(listenerWasCalledCount).to.eql(4);
                                        waitForChangeListener(sortedMap)
                                            .done(function() {
                                                // ensure operations are batched!
                                                // we are executing 4 ops (remove -> push x 3), but we expect only one
                                                // changed callback, because of throttling!
                                                expect(listenerWasCalledCount).to.eql(5);

                                                done();
                                            });

                                        // remove from middle of the array and then add items
                                        sortedMap.remove(500);
                                        sortedMap.push({'orderValue': 400, 'messageId': 400});
                                        sortedMap.push({'orderValue': 800, 'messageId': 800});
                                        sortedMap.push({'orderValue': 50, 'messageId': 50});

                                        expect(sortedMap.getItem(0).orderValue).to.eql(50);
                                        expect(sortedMap.getItem(1).orderValue).to.eql(100);
                                        expect(sortedMap.getItem(2).orderValue).to.eql(400);
                                        expect(sortedMap.getItem(3).orderValue).to.eql(700);
                                        expect(sortedMap.getItem(4).orderValue).to.eql(800);
                                    });

                                // insert last
                                sortedMap.push({'orderValue': 700, 'messageId': 700});
                                expect(sortedMap.getItem(0).orderValue).to.eql(100);
                                expect(sortedMap.getItem(1).orderValue).to.eql(500);
                                expect(sortedMap.getItem(2).orderValue).to.eql(700);
                            });

                        // insert duplicate via .push, order should be the same
                        sortedMap.push({'orderValue': 100, 'replaced': true, 'messageId': 100});
                        expect(sortedMap.getItem(0).orderValue).to.eql(100);
                        expect(sortedMap.getItem(0).replaced).to.eql(true);
                        expect(sortedMap.getItem(1).orderValue).to.eql(500);
                    });

                // insert and order as first item test
                sortedMap.push({'orderValue': 100, 'messageId': 100});
                expect(sortedMap.getItem(0).orderValue).to.eql(100);
                expect(sortedMap.getItem(1).orderValue).to.eql(500);
            });

        // insert first test
        sortedMap.push({'orderValue': 500, 'messageId': 500});
        expect(sortedMap.getItem(0).orderValue).to.eql(500);
    });

    it("MegaDataSortedMap - replace", function(done) {
        var sortedMap = new MegaDataSortedMap("messageId", MessagesBuff.orderFunc);
        var listenerWasCalledCount = 0;
        var changeListenerCb = function(changed) {
            if (DEBUG_MODE) {
                console.error("change: ", Object.keys(arguments[0])[0]);
            }
            listenerWasCalledCount++;
        };
        sortedMap.addChangeListener(changeListenerCb);


        waitForChangeListener(sortedMap)
            .done(function() {
                expect(listenerWasCalledCount).to.eql(1);
                waitForChangeListener(sortedMap)
                    .done(function() {
                        expect(sortedMap.getItem(0).orderValue).to.eql(400);
                        expect(sortedMap.getItem(1)).to.eql(undefined);
                        expect(Object.keys(sortedMap._data).length == sortedMap._sortedVals.length)
                            .to.eql(true);
                        done();
                    });
                sortedMap.replace(500, {'orderValue': 400, 'messageId': 400});
            });

        // insert first test
        sortedMap.push({'orderValue': 500, 'messageId': 500});
        expect(sortedMap.getItem(0).orderValue).to.eql(500);
    });
    it("MegaDataSortedMap - replace - same element", function(done) {
        var sortedMap = new MegaDataSortedMap("messageId", MessagesBuff.orderFunc);
        var listenerWasCalledCount = 0;
        var changeListenerCb = function(changed) {
            if (DEBUG_MODE) {
                console.error("change: ", Object.keys(arguments[0])[0]);
            }
            listenerWasCalledCount++;
        };

        sortedMap.addChangeListener(changeListenerCb);


        waitForChangeListener(sortedMap)
            .done(function() {
                expect(listenerWasCalledCount).to.eql(1);
                waitForChangeListener(sortedMap)
                    .done(function() {
                        expect(sortedMap.getItem(0).orderValue).to.eql(550);
                        expect(sortedMap.getItem(0).replaced).to.eql(true);
                        expect(sortedMap.getItem(1)).to.eql(undefined);
                        expect(Object.keys(sortedMap._data).length == sortedMap._sortedVals.length)
                            .to.eql(true);
                        done();
                    });
                sortedMap.replace(500, {'orderValue': 550, 'messageId': 500, 'replaced': true});
            });

        // insert first test
        sortedMap.push({'orderValue': 500, 'messageId': 500});
        expect(sortedMap.getItem(0).orderValue).to.eql(500);
    });
});
