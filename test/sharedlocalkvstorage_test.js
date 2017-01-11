describe("SharedLocalKVStorage Unit Test", function() {

    var shouldDropDatabases = [];

    var sandbox = sinon.sandbox.create();


    var dropOnFinished = function(kvStorage) {
        shouldDropDatabases.push(kvStorage);
    }


    var generateUniqueId = function() {
        return (new Date().valueOf()) + (parseInt((Math.random() + "").replace(".", ""), 10));
    };

    /**
     * @type PromiseHelpers
     */
    var promiseHelpers;



    beforeEach(function(done) {
        promiseHelpers = new PromiseHelpers();

        shouldDropDatabases = [];

        sandbox.stub(window, 'u_handle', 'Rmen0mUCyuk');

        sandbox.stub(window, 'u_k_aes', new sjcl.cipher.aes([-1644492891,-652192788,-1110521596,-1637366567]));

        done();
    });


    afterEach(function(done) {
        var waiting = [];

        var deleted = {};

        promiseHelpers.destroy();

        shouldDropDatabases.forEach(function(v) {
            if (!deleted[v.name]) {
                if (v.persistAdapter) {
                    if (v.persistAdapter.dbState === SharedLocalKVStorage.DB_STATE.READY) {
                        deleted[v.name] = true;
                        waiting.push(v.destroy());
                    }
                }
            }
        });
        MegaPromise.allDone(waiting).always(function() {
            sandbox.restore();

            done();
        });

    });

    it("basic single master set -> get item test", function(done) {
        var kvStorage = new SharedLocalKVStorage.Utils.DexieStorage("test1", 1);
        dropOnFinished(kvStorage);

        kvStorage.setItem('test', 'test123');
        promiseHelpers.expectPromiseToBeResolved(kvStorage.getItem("test"), 'test123', 'getItem test = test123');

        promiseHelpers.testWaitForAllPromises(done);
    });

    it("basic single master set -> remove -> {getItem - fail, removeItem - fail} test", function(done) {
        var kvStorage = new SharedLocalKVStorage.Utils.DexieStorage("test1", 1);
        dropOnFinished(kvStorage);

        kvStorage.setItem('test', 'test123');
        kvStorage.removeItem('test');
        promiseHelpers.expectPromiseToFail(kvStorage.getItem("test"), undefined, 'getItem test should fail');

        promiseHelpers.expectPromiseToFail(kvStorage.removeItem("test"), undefined, 'removeItem test should fail');

        promiseHelpers.testWaitForAllPromises(done);
    });


    it("basic single master - open -> set -> close -> get (persistence test)", function(done) {
        var kvStorage = new SharedLocalKVStorage.Utils.DexieStorage("test1", 1);
        kvStorage.setItem('test', 'test123')
            .done(function() {
                kvStorage.close();

                var kvStorage2 = new SharedLocalKVStorage.Utils.DexieStorage("test1", 1);
                dropOnFinished(kvStorage2);

                promiseHelpers.expectPromiseToBeResolved(
                    kvStorage2.getItem("test"),
                    'test123',
                    'getItem test = test123'
                );

                promiseHelpers.testWaitForAllPromises(done);
            });
    });

    it("comprehensive single master test", function(done) {
        var kvStorage = new SharedLocalKVStorage.Utils.DexieStorage("test1", 1);
        dropOnFinished(kvStorage);

        kvStorage.setItem("test", "test1");
        promiseHelpers.expectPromiseToBeResolved(kvStorage.getItem("test"), 'test1', 'getItem test = test1');
        promiseHelpers.expectPromiseToFail(kvStorage.getItem("doesNotExists"), undefined, 'getItem doesNotExists');
        kvStorage
            .removeItem("test")
            .then(function() {
                promiseHelpers.queueTestPromise(
                    promiseHelpers.expectPromiseToFail(
                        kvStorage.getItem("test"),
                        undefined,
                        'getItem test, which was removed (async)'
                    )
                );

                promiseHelpers.testWaitForAllPromises(done);
            });

        promiseHelpers.expectPromiseToFail(
            kvStorage.getItem("test"),
            undefined,
            'getItem test, which was removed (sync)'
        );

        promiseHelpers.expectPromiseToFail(
            kvStorage.removeItem("doesNotExists"),
            undefined,
            'removeItem doesNotExists'
        );



    });

    it("basic single master test - clear (async)", function(done) {
        var kvStorage = new SharedLocalKVStorage.Utils.DexieStorage("test1", 1);

        dropOnFinished(kvStorage);

        kvStorage.setItem("test", "test1")
            .done(function() {
                kvStorage.clear()
                    .done(function() {
                        promiseHelpers.expectPromiseToFail(
                            kvStorage.getItem("test"),
                            undefined,
                            'getItem test, which was removed (async)'
                        );

                        promiseHelpers.testWaitForAllPromises(done);
                    });
            });
    });

    it("basic single master test - clear (sync)", function(done) {
        var kvStorage = new SharedLocalKVStorage.Utils.DexieStorage("test1", 1);

        dropOnFinished(kvStorage);

        kvStorage.setItem("test", "test1");
        kvStorage.clear()
            .done(function() {
                promiseHelpers.expectPromiseToFail(
                    kvStorage.getItem("test"),
                    undefined,
                    'getItem test, which was removed (async)'
                );

                promiseHelpers.expectPromiseToFail(
                    kvStorage.getItem("test"),
                    undefined,
                    'getItem test, which was removed (async)'
                );



                promiseHelpers.testWaitForAllPromises(done);
            });


    });



    it("basic test for SharedLocalKVStorage, using 1 master", function(done) {
        var connector = new FakeBroadcastersConnector();
        var broadcaster = new FakeBroadcaster("tab1");
        connector.addTab(broadcaster);
        connector.setMaster("tab1");

        var sharedLocalKvInstance = new SharedLocalKVStorage("test1", 1, false, broadcaster);

        dropOnFinished(sharedLocalKvInstance);

        sharedLocalKvInstance.setItem("test", "test1")
            .done(function() {
                sharedLocalKvInstance.clear()
                    .done(function() {
                        promiseHelpers.expectPromiseToFail(
                            sharedLocalKvInstance.getItem("test"),
                            undefined,
                            'getItem test, which was removed (async)'
                        );

                        promiseHelpers.expectPromiseToFail(
                            sharedLocalKvInstance.getItem("test"),
                            undefined,
                            'getItem test, which was removed (async)'
                        );


                        sharedLocalKvInstance.setItem('test', 'test123');
                        promiseHelpers.expectPromiseToBeResolved(
                            sharedLocalKvInstance.getItem("test"), 'test123', 'getItem test = test123'
                        );


                        promiseHelpers.testWaitForAllPromises(done);
                    });
            });
    });

    it("basic, cross tab SharedLocalKVStorage, using 3 tabs - 1 master and 2 slaves", function(done) {
        var connector = new FakeBroadcastersConnector();
        var broadcaster1 = new FakeBroadcaster("tab1");
        connector.addTab(broadcaster1);

        var broadcaster2 = new FakeBroadcaster("tab2");
        connector.addTab(broadcaster2);


        var broadcaster3 = new FakeBroadcaster("tab3");
        connector.addTab(broadcaster3);

        connector.setMaster("tab1");

        var sharedLocalKvInstance1 = new SharedLocalKVStorage("test1", 1, false, broadcaster1);

        var sharedLocalKvInstance2 = new SharedLocalKVStorage("test1", 1, false, broadcaster2);

        var sharedLocalKvInstance3 = new SharedLocalKVStorage("test1", 1, false, broadcaster3);



        assert(
            sharedLocalKvInstance1.persistAdapter instanceof SharedLocalKVStorage.Utils.DexieStorage,
            'master tab (tab1) is not using the expected persist adapter!'
        );

        assert(
            sharedLocalKvInstance2.persistAdapter === false,
            'slave tab (tab2) is not using the expected persist adapter!'
        );

        assert(
            sharedLocalKvInstance3.persistAdapter === false,
            'slave tab (tab3) is not using the expected persist adapter!'
        );

        dropOnFinished(sharedLocalKvInstance1);

        sharedLocalKvInstance1.setItem("hello", 'world')
            .done(function() {
                // those 2 calls would also fill the in-memory cache, which should then be synced by the cross-tab
                // setcache watchdog event
                MegaPromise.allDone([
                    promiseHelpers.expectPromiseToBeResolved(
                        sharedLocalKvInstance2.getItem("hello"),
                        'world'
                    ),

                    promiseHelpers.expectPromiseToBeResolved(
                        sharedLocalKvInstance3.getItem("hello"),
                        'world'
                    )
                ])
                    .always(function() {
                        // tab2 alters data:
                        sharedLocalKvInstance2.setItem('hello', "world2")
                            .always(function() {
                                promiseHelpers.expectPromiseToBeResolved(
                                    sharedLocalKvInstance1.getItem("hello"),
                                    'world2'
                                );

                                promiseHelpers.expectPromiseToBeResolved(
                                    sharedLocalKvInstance2.getItem("hello"),
                                    'world2'
                                );

                                promiseHelpers.expectPromiseToBeResolved(
                                    sharedLocalKvInstance3.getItem("hello"),
                                    'world2'
                                );

                                promiseHelpers.testWaitForAllPromises(done);
                            });
                    })
            })
    });

    it("basic, cross tab SharedLocalKVStorage - removeItem, using 3 tabs - 1 master and 2 slaves", function(done) {
        var connector = new FakeBroadcastersConnector();
        var broadcaster1 = new FakeBroadcaster("tab1");
        connector.addTab(broadcaster1);

        var broadcaster2 = new FakeBroadcaster("tab2");
        connector.addTab(broadcaster2);


        var broadcaster3 = new FakeBroadcaster("tab3");
        connector.addTab(broadcaster3);

        connector.setMaster("tab1");

        var sharedLocalKvInstance1 = new SharedLocalKVStorage("test1", 1, false, broadcaster1);

        var sharedLocalKvInstance2 = new SharedLocalKVStorage("test1", 1, false, broadcaster2);

        var sharedLocalKvInstance3 = new SharedLocalKVStorage("test1", 1, false, broadcaster3);



        assert(
            sharedLocalKvInstance1.persistAdapter instanceof SharedLocalKVStorage.Utils.DexieStorage,
            'master tab (tab1) is not using the expected persist adapter!'
        );

        assert(
            sharedLocalKvInstance2.persistAdapter === false,
            'slave tab (tab2) is not using the expected persist adapter!'
        );

        assert(
            sharedLocalKvInstance3.persistAdapter === false,
            'slave tab (tab3) is not using the expected persist adapter!'
        );

        var expectAllValsToBeUndefined = function(k) {
            return MegaPromise.allDone([
                promiseHelpers.expectPromiseToFail(
                    sharedLocalKvInstance1.getItem(k),
                    undefined
                ),

                promiseHelpers.expectPromiseToFail(
                    sharedLocalKvInstance2.getItem(k),
                    undefined
                ),

                promiseHelpers.expectPromiseToFail(
                    sharedLocalKvInstance3.getItem(k),
                    undefined
                )
            ])
        };

        dropOnFinished(sharedLocalKvInstance1);

        sharedLocalKvInstance1.setItem("hello", 'world')
            .done(function() {
                // those 2 calls would also fill the in-memory cache, which should then be synced by the cross-tab
                // setcache watchdog event
                MegaPromise.allDone([
                    promiseHelpers.expectPromiseToBeResolved(
                        sharedLocalKvInstance2.getItem("hello"),
                        'world'
                    ),

                    promiseHelpers.expectPromiseToBeResolved(
                        sharedLocalKvInstance3.getItem("hello"),
                        'world'
                    )
                ])
                    .always(function() {
                        // tab2 alters data:
                        sharedLocalKvInstance1.removeItem('hello')
                            .always(function() {
                                expectAllValsToBeUndefined("hello")
                                    .done(function() {
                                        sharedLocalKvInstance2.setItem("hello", "world2")
                                            .done(function() {
                                                MegaPromise.allDone([
                                                    promiseHelpers.expectPromiseToBeResolved(
                                                        sharedLocalKvInstance1.getItem("hello"),
                                                        'world2'
                                                    ),
                                                    promiseHelpers.expectPromiseToBeResolved(
                                                        sharedLocalKvInstance2.getItem("hello"),
                                                        'world2'
                                                    ),

                                                    promiseHelpers.expectPromiseToBeResolved(
                                                        sharedLocalKvInstance3.getItem("hello"),
                                                        'world2'
                                                    )
                                                ])
                                                    .done(function() {
                                                        sharedLocalKvInstance1.clear()
                                                            .done(function() {
                                                                expectAllValsToBeUndefined("hello")
                                                                    .always(function() {
                                                                        promiseHelpers.testWaitForAllPromises(done);
                                                                    });
                                                            });
                                                    })
                                            })
                                    });
                            });
                    })
            })
    });

    it("basic, cross tab SharedLocalKVStorage - eachPrefix, using 3 tabs - 1 master and 2 slaves", function(done) {
        var connector = new FakeBroadcastersConnector();
        var broadcaster1 = new FakeBroadcaster("tab1");
        connector.addTab(broadcaster1);

        var broadcaster2 = new FakeBroadcaster("tab2");
        connector.addTab(broadcaster2);


        var broadcaster3 = new FakeBroadcaster("tab3");
        connector.addTab(broadcaster3);

        connector.setMaster("tab1");

        var sharedLocalKvInstance1 = new SharedLocalKVStorage("test1", 1, false, broadcaster1);

        var sharedLocalKvInstance2 = new SharedLocalKVStorage("test1", 1, false, broadcaster2);

        var sharedLocalKvInstance3 = new SharedLocalKVStorage("test1", 1, false, broadcaster3);


        dropOnFinished(sharedLocalKvInstance1);

        var expectAllValsToEqual = function(k, v) {
            return MegaPromise.allDone([
                promiseHelpers.expectPromiseToBeResolved(
                    sharedLocalKvInstance1.getItem(k),
                    v
                ),

                promiseHelpers.expectPromiseToBeResolved(
                    sharedLocalKvInstance2.getItem(k),
                    v
                ),

                promiseHelpers.expectPromiseToBeResolved(
                    sharedLocalKvInstance3.getItem(k),
                    v
                )
            ])
        };


        var pq = promiseHelpers.promiseQueue();

        pq.whenFinished(function() {
            promiseHelpers.testWaitForAllPromises(done);
        });

        [sharedLocalKvInstance1, sharedLocalKvInstance2, sharedLocalKvInstance3].forEach(function(kvInstance,
                                                                                                  kvInstanceIndex) {
            pq.queue(function() {
                var promise = new MegaPromise();

                MegaPromise.allDone([
                    kvInstance.setItem("nooohelloo", 'worldno'),
                    kvInstance.setItem("hello_1", 'world1'),
                    kvInstance.setItem("hello_2", 'world2'),
                    kvInstance.setItem("hello_3", 'world3')
                ])
                    .done(function() {
                        MegaPromise.allDone([
                            expectAllValsToEqual("hello_1", "world1"),
                            expectAllValsToEqual("hello_2", "world2"),
                            expectAllValsToEqual("hello_3", "world3")
                        ])
                            .fail(function() { promise.reject(arguments); })
                            .done(function() {
                                var results = [];
                                var cb = function(v) {

                                    results.push(v);

                                    if (results.length === 3) {
                                        var expected = JSON.stringify(['world1', 'world2', 'world3']);
                                        
                                        results.sort();

                                        assert(
                                            JSON.stringify(results) === expected,
                                            '[' + kvInstance.broadcaster.id + '] ' +
                                            'returned results for .eachPrefixItem did not matched the expected. ' +
                                            'Returned: ' + JSON.stringify(results) + ", expected: " + expected
                                        );

                                        // finished.
                                        promise.resolve();
                                    }
                                };

                                kvInstance.eachPrefixItem("hello", cb);
                            })
                    });

                return promise;
            });
        });

        pq.tick();
    });

    it("1 master, 2 slaves, one of the slaves becomes a master", function(done) {
        var expectAllValsToEqual = function(key, targetValue, instances) {
            var promises = [];

            if (!instances) {
                instances = [
                    sharedLocalKvInstance1,
                    sharedLocalKvInstance2,
                    sharedLocalKvInstance3
                ]
            }
            instances.forEach(function(kvInstance) {
                promises.push(
                    promiseHelpers.expectPromiseToBeResolved(
                        kvInstance.getItem(key),
                        targetValue
                    )
                );
            });

            return MegaPromise.allDone(promises);
        };

        var connector = new FakeBroadcastersConnector();
        var broadcaster1 = new FakeBroadcaster("tab1");
        connector.addTab(broadcaster1);

        var broadcaster2 = new FakeBroadcaster("tab2");
        connector.addTab(broadcaster2);


        var broadcaster3 = new FakeBroadcaster("tab3");
        connector.addTab(broadcaster3);

        connector.setMaster("tab1");

        var sharedLocalKvInstance1 = new SharedLocalKVStorage("test1", 1, false, broadcaster1);

        var sharedLocalKvInstance2 = new SharedLocalKVStorage("test1", 1, false, broadcaster2);

        var sharedLocalKvInstance3 = new SharedLocalKVStorage("test1", 1, false, broadcaster3);


        dropOnFinished(sharedLocalKvInstance1);
        dropOnFinished(sharedLocalKvInstance2);

        var onChangeCalls = [];

        [
            sharedLocalKvInstance1,
            sharedLocalKvInstance2,
            sharedLocalKvInstance3,
        ].forEach(function(kvInstance) {
            $(kvInstance).bind('onChange.unittest', function(e, k, v) {
                onChangeCalls.push({
                    'src': kvInstance.broadcaster.id,
                    'k': k,
                    'v': v
                });
            });
        });

        sharedLocalKvInstance3.setItem("hello", "test1")
            .done(function() {
                expectAllValsToEqual("hello", "test1")
                    .done(function() {
                        var promise = sharedLocalKvInstance3.setItem("hello", "test2");
                        broadcaster1.destroy();

                        assert(
                            !!sharedLocalKvInstance2.broadcaster.crossTab.master,
                            'tab2 was not set as master as expected.'
                        );

                        // close the db so that the unit test can delete/drop the db on finish
                        sharedLocalKvInstance1.persistAdapter.close();

                        promise
                            .dumpToConsole("promise")
                            .done(function() {
                            expectAllValsToEqual(
                                "hello",
                                "test2",
                                [
                                    sharedLocalKvInstance2,
                                    sharedLocalKvInstance3
                                ]
                            )
                                .always(function( ){
                                    onChangeCalls.sort();

                                    var expectedChangeCalls = [
                                        {
                                            "src": "tab1",
                                            "k": "hello",
                                            "v": "test1"
                                        },
                                        {
                                            "src": "tab2",
                                            "k": "hello",
                                            "v": "test1"
                                        },
                                        {
                                            "src": "tab3",
                                            "k": "hello",
                                            "v": "test1"
                                        },
                                        {
                                            "src": "tab2",
                                            "k": "hello",
                                            "v": "test2"
                                        },
                                        {
                                            "src": "tab3",
                                            "k": "hello",
                                            "v": "test2"
                                        },
                                        {
                                            "src": "tab2",
                                            "k": "hello",
                                            "v": "test2"
                                        },
                                        {
                                            "src": "tab3",
                                            "k": "hello",
                                            "v": "test2"
                                        }
                                    ];

                                    assert(
                                        JSON.stringify(onChangeCalls) === JSON.stringify(expectedChangeCalls),
                                        'On change calls did not matched the expected value. Got: ' +
                                        JSON.stringify(onChangeCalls,null, "\t", 4) + ', while expecting: ' +
                                        JSON.stringify(expectedChangeCalls, null, "\t", 4)
                                    );
                                    promiseHelpers.testWaitForAllPromises(done);
                                });
                        })
                    })
            });

    });
});
