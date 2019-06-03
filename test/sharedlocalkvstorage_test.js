describe("SharedLocalKVStorage Unit Test", function() {
    localStorage.SharedLocalKVStorageDebug = 1;

    var shouldDropDatabases = [];


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

        mStub(window, 'u_handle', 'Rmen0mUCyuk');
        mStub(window, 'u_k_aes', new sjcl.cipher.aes([-1644492891, -652192788, -1110521596, -1637366567]));

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
                    else {
                        v.persistAdapter.close();
                    }
                }
                else if (v.db) {
                    if (v.dbState === SharedLocalKVStorage.DB_STATE.READY) {
                        deleted[v.name] = true;
                        waiting.push(v.destroy());
                    }
                    else {
                        v.close();
                    }
                }
            }
        });
        MegaPromise.allDone(waiting).always(function() {
            mStub.restore();
            done();
        });

    });

    it("core func test - DexieStorage.keys()", function(done) {
        var allDone = [];
        var failed = [];

        [
            {
                'newcache': {},
                'delcache': {},
                'dbcache': {
                    'a': 2
                },
                'expected': ['a']
            },
            {
                'newcache': {'b':3},
                'delcache': {},
                'dbcache': {
                    'a': 2
                },
                'expected': ['a', 'b']
            },
            {
                'newcache': {},
                'delcache': {'b': true},
                'dbcache': {
                    'a': 2,
                    'b': 3
                },
                'expected': [
                    'a'
                ]
            },
            {
                'newcache': {'a': 3},
                'delcache': {'b': true},
                'dbcache': {
                    'a': 2,
                    'b': 3
                },
                'expected': ['a']
            },
            {
                'prefix': 'test_',
                'newcache': {'test_a': 3},
                'delcache': {'test_b': true},
                'dbcache': {
                    'test_a': 2,
                    'test_b': 3,
                    'nottest_asdf': 212
                },
                'expected': ['test_a']
            }
        ].forEach(function(testCase) {
            allDone.push(
                SharedLocalKVStorage.Utils.DexieStorage.prototype._keys.apply(testCase, [testCase.prefix])
                    .done(function(result) {
                        if (JSON.stringify(result) !== JSON.stringify(testCase.expected)) {
                            failed.push([result, testCase]);
                        }
                    })
            );
        });

        MegaPromise.allDone(allDone).always(function() {
            failed.length === 0 || console.error("Failed test cases: ", JSON.stringify(failed, null, '\t'));
            expect(failed.length).to.eql(0);
            done();
        });
    });

    it("core func test - DexieStorage preserve the order in which data is inserted/deleted", function(done) {
        // FF 52
        this.timeout(5000);

        var pq = promiseHelpers.promiseQueue();

        pq.whenFinished(function() {
            promiseHelpers.testWaitForAllPromises(function() {
                (new SharedLocalKVStorage.Utils.DexieStorage("test2", false, "whatever")).destroy().always(function() {
                    done();
                });
            });
        });

        [
            {
                'operations': [
                    ['setItem', 'a1', 'val1'],
                    ['setItem', 'b1', 'val2'],
                    ['setItem', 'a2', 'val3'],
                ],
                'expected': [
                    'a1', 'b1', 'a2'
                ]
            },
            {
                'operations': [
                    ['setItem', '2z1', 'val4'],
                    ['setItem', '2a1', 'val1'],
                    ['setItem', '2b1', 'val2'],
                    ['setItem', '2a2', 'val3'],
                ],
                'expected': [
                    '2z1', '2a1', '2b1', '2a2'
                ]
            },
            {
                'operations': [
                    ['setItem', '2z1', 'val1'],
                    ['setItem', '2a1', 'val2'],
                    ['setItem', '2b1', 'val3'],
                    ['setItem', '2a2', 'val4'],
                    ['setItem', '2z1', 'val5'],
                ],
                'expected': [
                    '2z1', '2a1', '2b1', '2a2'
                ]
            }
        ].forEach(function(testCase) {
            pq.queue(function() {
                var promise = new MegaPromise();

                var rej = function() { promise.reject(arguments); };
                var res = function() { promise.resolve(arguments); };

                var dexieStorage = new SharedLocalKVStorage.Utils.DexieStorage("test2", false, "whatever");

                var allInserts = [];
                dexieStorage.clear().always(function() {
                    testCase.operations.forEach(function(kv) {
                        allInserts.push(
                            promiseHelpers.expectPromiseToBeResolved(
                                dexieStorage[kv[0]](kv[1], kv[2])
                            )
                                .fail(rej)
                        );
                    });


                    MegaPromise.allDone(
                        allInserts
                    )
                        .done(function() {
                            dexieStorage.close();

                            setTimeout(function() {
                                // reopen
                                dexieStorage = new SharedLocalKVStorage.Utils.DexieStorage("test2", false, "whatever");

                                promiseHelpers.expectPromiseToBeResolved(
                                    dexieStorage.keys(),
                                    testCase.expected
                                )
                                    .fail(rej)
                                    .always(function() {
                                        dexieStorage.destroy().always(res);
                                    });
                            });
                        });
                });

                return promise;
            }, 'testQueueOp');
        });

        pq.tick();
    });

    it("basic single master set -> get item test", function(done) {
        var kvStorage = new SharedLocalKVStorage.Utils.DexieStorage("test3");
        dropOnFinished(kvStorage);
        kvStorage.setItem('test', 'test123').dumpToConsole("test=test123");

        promiseHelpers.expectPromiseToBeResolved(kvStorage.getItem("test"), 'test123', 'getItem test = test123');

        promiseHelpers.testWaitForAllPromises(done);
    });

    it("basic single master set -> remove -> {getItem - fail, removeItem - fail} test", function(done) {
        var kvStorage = new SharedLocalKVStorage.Utils.DexieStorage("test4");
        dropOnFinished(kvStorage);

        kvStorage.setItem('test', 'test123');
        kvStorage.removeItem('test');
        promiseHelpers.expectPromiseToFail(kvStorage.getItem("test"), undefined, 'getItem test should fail');

        promiseHelpers.expectPromiseToFail(kvStorage.removeItem("test"), undefined, 'removeItem test should fail');

        promiseHelpers.testWaitForAllPromises(done);
    });


    it("basic single master - open -> set -> close -> get (persistence test)", function(done) {
        var kvStorage = new SharedLocalKVStorage.Utils.DexieStorage("test5");
        kvStorage.setItem('test', 'test123')
            .done(function() {
                kvStorage.close();

                var kvStorage2 = new SharedLocalKVStorage.Utils.DexieStorage("test5");
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
        var kvStorage = new SharedLocalKVStorage.Utils.DexieStorage("test6");
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
        var kvStorage = new SharedLocalKVStorage.Utils.DexieStorage("test7");

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
        var kvStorage = new SharedLocalKVStorage.Utils.DexieStorage("test8");

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
        var broadcaster = CreateNewFakeBroadcaster("tab1");
        connector.addTab(broadcaster);
        connector.setMaster("tab1");

        var sharedLocalKvInstance = new SharedLocalKVStorage("test9", false, broadcaster);

        dropOnFinished(sharedLocalKvInstance);

        sharedLocalKvInstance.setItem("test", "test1")
            .done(function() {
                sharedLocalKvInstance.clear()
                    .done(function() {
                        MegaPromise.allDone([
                            promiseHelpers.expectPromiseToFail(
                                sharedLocalKvInstance.getItem("test"),
                                undefined,
                                'getItem test, which was removed (async)'
                            ),
                            promiseHelpers.expectPromiseToFail(
                                sharedLocalKvInstance.getItem("test"),
                                undefined,
                                'getItem test, which was removed (async)'
                            )
                        ]).done(function() {
                            sharedLocalKvInstance.setItem('test', 'test123')
                                .done(function () {
                                    promiseHelpers.expectPromiseToBeResolved(
                                        sharedLocalKvInstance.getItem("test"), 'test123', 'getItem test = test123'
                                    );

                                    promiseHelpers.testWaitForAllPromises(done);
                                });
                        });
                    });
            });
    });

    it("basic, cross tab SharedLocalKVStorage, using 3 tabs - 1 master and 2 slaves", function(done) {
        var connector = new FakeBroadcastersConnector();
        var broadcaster1 = CreateNewFakeBroadcaster("tab1");
        connector.addTab(broadcaster1);

        var broadcaster2 = CreateNewFakeBroadcaster("tab2");
        connector.addTab(broadcaster2);


        var broadcaster3 = CreateNewFakeBroadcaster("tab3");
        connector.addTab(broadcaster3);

        connector.setMaster("tab1");

        var sharedLocalKvInstance1 = new SharedLocalKVStorage("test10", false, broadcaster1);

        var sharedLocalKvInstance2 = new SharedLocalKVStorage("test10", false, broadcaster2);

        var sharedLocalKvInstance3 = new SharedLocalKVStorage("test10", false, broadcaster3);



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
        var broadcaster1 = CreateNewFakeBroadcaster("tab1");
        connector.addTab(broadcaster1);

        var broadcaster2 = CreateNewFakeBroadcaster("tab2");
        connector.addTab(broadcaster2);


        var broadcaster3 = CreateNewFakeBroadcaster("tab3");
        connector.addTab(broadcaster3);

        connector.setMaster("tab1");

        var sharedLocalKvInstance1 = new SharedLocalKVStorage("test11", false, broadcaster1);

        var sharedLocalKvInstance2 = new SharedLocalKVStorage("test11", false, broadcaster2);

        var sharedLocalKvInstance3 = new SharedLocalKVStorage("test11", false, broadcaster3);



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
        var broadcaster1 = CreateNewFakeBroadcaster("tab1");
        connector.addTab(broadcaster1);

        var broadcaster2 = CreateNewFakeBroadcaster("tab2");
        connector.addTab(broadcaster2);


        var broadcaster3 = CreateNewFakeBroadcaster("tab3");
        connector.addTab(broadcaster3);

        connector.setMaster("tab1");

        var sharedLocalKvInstance1 = new SharedLocalKVStorage("test12", false, broadcaster1);

        var sharedLocalKvInstance2 = new SharedLocalKVStorage("test12", false, broadcaster2);

        var sharedLocalKvInstance3 = new SharedLocalKVStorage("test12", false, broadcaster3);


        dropOnFinished(sharedLocalKvInstance1);
        dropOnFinished(sharedLocalKvInstance2);
        dropOnFinished(sharedLocalKvInstance3);

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
                    kvInstance.setItem("nooohelloo", 'worldno').dumpToConsole("nohelloSet"),
                    kvInstance.setItem("hello_1", 'world1').dumpToConsole("h1Set"),
                    kvInstance.setItem("hello_2", 'world2').dumpToConsole("h2Set"),
                    kvInstance.setItem("hello_3", 'world3').dumpToConsole("h3Set")
                ])
                    .dumpToConsole("allDone1")
                    .done(function() {
                        MegaPromise.allDone([
                            expectAllValsToEqual("hello_1", "world1"),
                            expectAllValsToEqual("hello_2", "world2"),
                            expectAllValsToEqual("hello_3", "world3")
                        ])
                            .dumpToConsole("allDone2")
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
                    })

                return promise;
            }, 'testQueueOp');
        });

        pq.tick();
    });

    it("1 master, 2 slaves, one of the slaves becomes a master", function(done) {
        var connector = new FakeBroadcastersConnector();
        var broadcaster1 = CreateNewFakeBroadcaster("tab1");
        connector.addTab(broadcaster1);

        var broadcaster2 = CreateNewFakeBroadcaster("tab2");
        connector.addTab(broadcaster2);


        var broadcaster3 = CreateNewFakeBroadcaster("tab3");
        connector.addTab(broadcaster3);

        connector.setMaster("tab1");

        var sharedLocalKvInstance1 = new SharedLocalKVStorage("test13", false, broadcaster1);

        var sharedLocalKvInstance2 = new SharedLocalKVStorage("test13", false, broadcaster2);

        var sharedLocalKvInstance3 = new SharedLocalKVStorage("test13", false, broadcaster3);


        dropOnFinished(sharedLocalKvInstance1);
        dropOnFinished(sharedLocalKvInstance2);
        dropOnFinished(sharedLocalKvInstance3);

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
                                                "src": "tab2",
                                                "k": "hello",
                                                "v": "test2"
                                            }
                                        ];



                                        var matched = (
                                            JSON.stringify(onChangeCalls) === JSON.stringify(expectedChangeCalls)
                                        );

                                        var msg = 'On change calls did not matched the expected value. Got: ' +
                                            JSON.stringify(onChangeCalls,null, "\t", 4) + ', while expecting: ' +
                                            JSON.stringify(expectedChangeCalls, null, "\t", 4);
                                        if (!matched) {
                                            console.error(msg)
                                            return false;
                                        } else {
                                            promiseHelpers.testWaitForAllPromises(done);
                                        }
                                    });
                            })
                    });
            });

    });
});
