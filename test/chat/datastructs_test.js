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
            }
        );

        expect(obj._dataChangeIndex).to.eql(0);

        var listenerWasCalled = false;
        var changeListenerCb = function() {
            listenerWasCalled++;
        };

        obj.addChangeListener(changeListenerCb);

        obj.u = 123;
        setTimeout(function() {
            expect(listenerWasCalled).to.eql(1);
            expect(obj._dataChangeIndex).to.eql(1);
            done();
        }, 60);

    });

    it("MegaDataMap", function(done) {
        var objMap = new MegaDataMap();

        var obj1 = new MegaDataObject(
            {
                'u': undefined,
                'm': undefined,
                'name': undefined
            },
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
            {
                'u': 'u2',
                'm': 'u2@email.com',
                'name': 'u2 name'
            }
        );

        objMap.set(obj2.u, obj2);


        expect(obj1._dataChangeIndex).to.eql(0, 'unexpected obj1 change index [a]');
        expect(obj2._dataChangeIndex).to.eql(0, 'unexpected obj2 change index [a]');
        expect(objMap._dataChangeIndex).to.eql(0, 'unexpected change index [a]');

        var listenerWasCalled = false;
        var changeListenerCb = function() {
            listenerWasCalled++;
        };

        objMap.addChangeListener(changeListenerCb);

        obj1.u = 123;
        setTimeout(function() {
            expect(listenerWasCalled).to.eql(2, 'listener called unexpected number of times');
            expect(obj1._dataChangeIndex).to.eql(1, 'unexpected obj1 change index [b]');
            expect(obj2._dataChangeIndex).to.eql(0, 'unexpected obj2 change index [b]');
            expect(objMap._dataChangeIndex).to.eql(2, 'unexpected change index [b]');

            listenerWasCalled = false;
            objMap.removeChangeListener(changeListenerCb);


            obj2.u = 321;

            setTimeout(function() {
                expect(listenerWasCalled).to.eql(false, 'listener called unexpectedly');
                expect(obj1._dataChangeIndex).to.eql(1, 'unexpected obj1 change index [c]');
                expect(obj2._dataChangeIndex).to.eql(1, 'unexpected obj2 change index [c]');
                expect(objMap._dataChangeIndex).to.eql(3, 'unexpected change index [c]');

                done();
            }, 60);
        }, 60);
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

    it('does preserve the order and uniqueness change listeners are dispatched.', function(done) {
        var tmp;
        var last = null;
        var stack = [];
        var save = function() {
            stack.push(this.__ident_0.split('.').pop());
        };
        var add = function() {
            var r = new MegaDataObject({'prop': false});
            r.addChangeListener(save);
            return r;
        };
        for (var i = 4; i--;) {
            tmp = add();
            tmp._parent = last;
            last = tmp;
        }

        for (var j = 7; j--;) {
            tmp = add();
            tmp._parent = last;
            tmp.trackDataChange();
        }

        setTimeout(function() {
            expect(stack.length).to.eql(11);
            expect(stack.join('|')).to.eql('46|51|52|53|54|55|56|47|48|49|50');
            done();
        }, 60);
    });

    it('MegaDataEmitter - basic', function() {
        var obj = new MegaDataObject();
        var stack = [];
        var save = function(ev) {
            return stack.push(ev.type + ev.namespace + (ev.data | 0));
        };
        expect(obj instanceof MegaDataEmitter).to.eql(true, 'Invalid instance');
        expect(String(obj)).to.eql('[object MegaDataObject]');

        obj.on('e1.a', save);
        obj.bind('e1.a', save);
        obj.rebind('e1.b', save);
        expect(obj.trigger('e1', [3])).to.eql(3);
        obj.one('e1.c', save);
        expect(obj.trigger('e1.b', [4])).to.eql(4);
        expect(obj.trigger('e1', [8])).to.eql(8);
        expect(obj.trigger('e1.c')).to.eql(undefined);
        obj.off('e1.a');
        expect(obj.trigger('e1', [9])).to.eql(9);
        obj.rebind('e1.b', save);
        expect(obj.trigger('e1', [0])).to.eql(10);
        obj.unbind('e1.b');
        expect(obj.trigger('e1')).to.eql(undefined);

        expect(stack.join('|')).to.eql('e13|e13|e13|e1b4|e18|e18|e18|e18|e19|e10');

        var testPropagation = function(event) {
            var trap = mRandomToken('evz');
            var type = event.type;
            obj.one(type, function(ev) {
                expect(ev.type).to.eql(type);
                expect(ev.data).to.eql(undefined);
                type = trap;
                return false;
            });
            expect(obj.trigger(event)).to.eql(false);
            expect(event.isPropagationStopped()).to.eql(true);
            expect(type).to.eql(trap);

            var data = {ts: Date.now()};
            event = new MegaDataEvent(type);
            obj['on' + type] = function(ev) {
                expect(ev.originalEvent).to.eql(event);
                expect(ev.originalEvent).to.deep.equal(event);
                expect(ev.data).to.eql(data);
                ev.preventDefault();
                return stack.length;
            };
            expect(obj.trigger(event, data)).to.eql(stack.length);
            expect(obj.trigger(event, data)).to.eql(undefined);
        };

        testPropagation(new $.Event('p1'));
        testPropagation(new MegaDataEvent('p2'));
    });
});
