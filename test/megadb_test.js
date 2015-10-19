/**
 * @fileOverview
 * MegaDB unit tests.
 */

describe("MegaDB unit test", function() {
    "use strict";

    // Create/restore Sinon stub/spy/mock sandboxes.
    var sandbox = null;

    var mdb = null;
    var msdb = null;
    var testCount = 0;
    var fail = function(message) {
        assert(false, message);
    };

    beforeEach(function(done) {
        sandbox = sinon.sandbox.create();
        sandbox.stub(window, 'u_handle', "A_123456789");
        sandbox.stub(window, 'u_sid', "c5N5zoeMFzja_tScIA3QQVo2aWpwS0NsT184ggY0ta9BlkYxFfmIDdkvig");
        // 25519 keys mocker
        sandbox.stub(window, 'u_pubEd25519', atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo='));
        sandbox.stub(window, 'pubEd25519', {
            'A_123456789': atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=')
        });
        sandbox.stub(crypt, 'getPubEd25519', function(h, cb) {
            pubEd25519[h] = atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=');

            cb({pubkey: pubEd25519[h], authenticated: false}, h);
        });
        sandbox.stub(window, 'u_privEd25519', atob('nWGxne/9WmC6hEr0kuwsxERJxWl7MmkZcDusAxyuf2A='));
        sandbox.stub(window, 'u_k', [4222562981, 1974701603, 3975828479, 1142305397]);
        sandbox.stub(window, 'avatars', {});
        sandbox.stub(window, 'M', {
            'u': {
                "A_123456789": {
                    "u": "A_123456789", "c": 2, "m": "lpetrov@me.com",
                    "presence": "chat", "name": "lyubomir.Zetrov@mega.co.nz",
                    "presenceMtime": 1391783363.743, "h": "A_123456789"
                },
                "B_123456789": {
                    "u": "B_123456789", "c": 1, "m": "lp@mega.co.nz",
                    "ts": 1390835777, "name": "lyubomir.Xetrov@mega.co.nz",
                    "h": "B_123456789", "t": 1, "p": "B_123456789",
                    "presence": "chat", "presenceMtime": 1392042647
                }
            },
            'd': {
                'd1123456': {"h": "d1123456", "p": "ROOTID", "u": "A_123456789",
                             "t": 1, "a": "aFAWhoQFmmLYXUK5VZpswJByb6ICMBIxjnfjz_IBpa8",
                             "k": "A_123456789:Qof93iBM8wG6rRJNCiCnwg", "ts": 1384600611,
                             "key": [1919488715, 1389955760, 1439516433, 407573463],
                             "ar": {"n": "dir1"}, "name": "dir1"},
                'd2123456': {"h": "d2123456", "p": "ROOTID", "u": "A_123456789",
                             "t": 1, "a": "aFAWhoQFmmLYXUK5VZpswJByb6ICMBIxjnfjz_IBpa8",
                             "k": "A_123456789:Qof93iBM8wG6rRJNCiCnwg", "ts": 1384600611,
                             "key": [1919488715, 1389955760, 1439516433, 407573463],
                             "ar": {"n": "dir2"}, "name": "dir2"},
                'f1123456': {"h": "f1123456", "p": "ROOTID", "u": "A_123456789",
                             "t": 1, "a": "aFAWhoQFmmLYXUK5VZpswJByb6ICMBIxjnfjz_IBpa8",
                             "k": "A_123456789:Qof93iBM8wG6rRJNCiCnwg", "ts": 1384600611,
                             "key": [1919488715, 1389955760, 1439516433, 407573463],
                             "ar":{"n": "file1"}, "name": "file1"},
                'f2123456': {"h":  "f2123456", "p": "ROOTID", "u": "A_123456789",
                             "t": 1, "a": "aFAWhoQFmmLYXUK5VZpswJByb6ICMBIxjnfjz_IBpa8",
                             "k": "A_123456789:Qof93iBM8wG6rRJNCiCnwg", "ts": 1384600611,
                             "key": [1919488715, 1389955760, 1439516433, 407573463],
                             "ar": {"n": "file2"}, "name": "file2"},
                'cf112345': {"h": "cf112345", "p": "d1123456", "u": "A_123456789",
                             "t": 1, "a": "aFAWhoQFmmLYXUK5VZpswJByb6ICMBIxjnfjz_IBpa8",
                             "k": "A_123456789:Qof93iBM8wG6rRJNCiCnwg", "ts": 1384600611,
                             "key": [1919488715, 1389955760, 1439516433, 407573463],
                             "ar": {"n": "dir1 file1"}, "name": "dir1 file1"}
            },
            'RootID': 'ROOTID'
        });

        localStorage.clear();

        var schema = {
            people: {
                key: { keyPath: 'id' , autoIncrement: true },
                // Optionally add indexes
                indexes: {
                    firstName: { },
                    answer: { }
                }
            }
        };
        try {
            if (typeof indexedDB === 'undefined') {
                throw 'No indexedDB support.';
            }
            mdb = new MegaDB("test" + (++testCount), "unit", schema);
            mdb.logger.options.isEnabled = false;
        }
        catch(ex) {
            console.error(ex);
            throw ex;
        }
        window.mdb = mdb; // debug helper

        done();
    });


    afterEach(function(done) {
        sandbox.restore();
        localStorage.clear();

        mdb.drop()
            .fail(function() {
                fail("db not dropped: ", toArray(arguments));
            })
            .then(function() {
                if (msdb && msdb.dbState === MegaDB.DB_STATE.INITIALIZED) {
                    msdb.drop()
                        .done(function() {
                            done();
                        })
                        .fail(function() {
                            fail("Failed to drop msdb", toArray(arguments));
                        });
                    msdb = null;
                }
                else {
                    done();
                }
            });
    });


    it("add, get, remove", function(done) {
        // Extend timeout, this test may take a bit longer.
        this.timeout(this.timeout() * 1.5);
        mdb.add("people", {
            'firstName': "John",
            'lastName': "Doe",
            'answer': 12
        })
            .then(function() {
                mdb.add("people", {
                    'firstName': "John2",
                    'lastName': "Doe2",
                    'answer': 123
                })
                    .then(function() {
                        window.p = mdb.get("people", 1)
                            .then(
                            function(r) {
                                expect(r.firstName).to.eq("John");
                                expect(r.answer).to.eq(12);

                                mdb.remove("people", 1)
                                    .then(function() {
                                        mdb.get("people", 1).then(function(obj) {
                                            if (obj.length === 0) {
                                                done();
                                            } else {
                                                fail("person with id 1 not removed.");
                                            }
                                        }, function() {
                                            fail("person with id 1 not removed.");
                                        });
                                    }, function() {
                                        fail("could not remove obj with id 1");
                                    });
                            },
                            function() {
                                fail("could not get obj with id 1");
                            }
                        );
                    }, function() {
                        fail("Could not add person 2");
                    });
            }, function() {
                assert(false, "Could not add person 1");
            });
    });

    it(".query, .filter, .update (single row)", function(done) {
        // Extend timeout, this test may take a bit longer.
        this.timeout(this.timeout() * 1.5);
        mdb.add("people", {
            'firstName': "John",
            'lastName': "Doe",
            'answer': 12
        })
            .then(function() {

                mdb.add("people", {
                    'firstName': "John2",
                    'lastName': "Doe2",
                    'answer': 123
                })
                    .then(function() {
                        mdb.query("people")
                            .filter("firstName", "John")
                            .execute()
                            .then(function(r) {

                                expect(r.length).to.not.eql(2);
                                expect(r.length).to.eql(1);

                                expect(r[0].firstName).to.eql("John");
                                expect(r[0].answer).to.eql(12);

                                mdb.update('people', 1, {'firstName': "John3"})
                                    .then(function() {
                                        mdb.query('people')
                                            .filter('firstName', 'John3')
                                            .execute()
                                            .then(function(r) {
                                                expect(r.length).to.eql(1);
                                                done();
                                            });
                                    });
                            })
                            .fail(function() {
                                fail("could not get obj with id 1");
                            });
                    });
            });
    });

    it(".query, .filter, .modify (all matched rows)", function(done) {
        // Extend timeout, this test may take a bit longer.
        this.timeout(this.timeout() * 1.5);
        mdb.add("people", {
            'firstName': "John",
            'lastName': "Doe",
            'answer': 12
        })
            .then(function() {

                mdb.add("people", {
                    'firstName': "John",
                    'lastName': "Doe2",
                    'answer': 12
                })
                    .then(function() {
                        mdb.query("people")
                            .filter("firstName", "John")
                            .filter("answer", 12)
                            .modify({"firstName": "John22"})
                            .execute()
                            .then(function(r) {

                                expect(r.length).to.eql(2);

                                expect(r[0].firstName).to.eql("John22");
                                expect(r[1].firstName).to.eql("John22");

                                done();
                            })
                            .fail(function() {
                                fail("could not get obj with id 1");
                            });
                    });
            });
    });

    it(".remove(table, obj), .addOrUpdate(table, obj)", function(done) {
        // Extend timeout, this test may take a bit longer.
        this.timeout(this.timeout() * 1.5);
        var obj1 = {
            'id': "johnDoe1",
            'firstName': "John",
            'lastName': "Doe",
            'answer': 12
        };
        var obj2 = {
            'id': 'johnDoe2',
            'firstName': "John2",
            'lastName': "Doe2",
            'answer': 12
        };

        mdb.add("people", obj1)
            .then(function() {
                mdb.add("people", obj2)
                    .then(function() {
                        obj1.firstName = "John1";
                        mdb.addOrUpdate("people", obj1)
                            .then(function(r) {
                                expect(r.length).to.eql(1);

                                mdb.query("people")
                                    .filter("answer", 12)
                                    .execute()
                                    .then(function(rr) {
                                        expect(rr.length).to.eql(2);
                                        expect(rr[0].firstName).to.eql("John1");
                                        expect(rr[1].firstName).to.eql("John2");

                                        mdb.remove("people", obj1)
                                            .then(function() {
                                                mdb.query("people")
                                                    .filter("answer", 12)
                                                    .execute()
                                                    .then(function(rrr) {
                                                        expect(rrr.length).to.eql(1);
                                                        expect(rrr[0].firstName).to.eql("John2");

                                                        done();
                                                    }).fail(function() {
                                                        fail("obj1 was not properly removed.");
                                                    });
                                            })
                                            .fail(function() {
                                                fail("failed to remove obj1");
                                            });

                                    }).fail(function() {
                                        fail("could not get obj with answer=12");
                                    });
                            })
                            .fail(function() {
                                fail("could not get obj with id 1");
                            });
                    });
            });
    });

    it(".remove(table, array[Obj]), .addOrUpdate(table, array[Obj])", function(done) {
        // Extend timeout, this test may take a bit longer.
        this.timeout(this.timeout() * 1.5);
        var obj1 = {
            'id': "johnDoe1",
            'firstName': "John",
            'lastName': "Doe",
            'answer': 12
        };
        var obj2 = {
            'id': 'johnDoe2',
            'firstName': "John2",
            'lastName': "Doe2",
            'answer': 12
        };

        mdb.addOrUpdate("people", [obj1, obj2])
            .then(function() {
                mdb.query("people")
                    .filter("answer", 12)
                    .execute()
                    .then(function(rr) {
                        expect(rr.length).to.eql(2);
                        expect(rr[0].firstName).to.eql("John");
                        expect(rr[1].firstName).to.eql("John2");


                        mdb.remove("people", [obj1, obj2])
                            .then(function() {
                                mdb.query("people")
                                    .execute()
                                    .then(function(rrr) {
                                        expect(rrr.length).to.eql(0);
                                        done();
                                    }).fail(function() {
                                        fail("obj1 was not properly removed.");
                                    });
                            })
                            .fail(function() {
                                fail("failed to remove obj1");
                            });

                    }).fail(function() {
                        fail("could not get obj with answer=12");
                    });
            });
    });

    it('can encrypt, mStorageDB', function(done) {
        // Extend timeout, this test may take a bit longer.
        this.timeout(this.timeout() * 1.5);
        var sName = 'encTest-' + Math.random().toString(26);
        var sdb = new mStorageDB(sName);
        sdb.addSchemaHandler('people', 'h', function() {
            console.error('people schema handler -- this should not happen (the db must not exists)', arguments);
        });

        // Don't know how to (easily) stub out the logger created for the
        // mDBEncryptionPlugin through the MegaDB constructor in the start() call.
        sandbox.stub(console, 'info');
        sdb.setup()
            .done(function(db) {
                // Silence the logger.
                db.logger.options.isEnabled = false;
                msdb = db;

                expect(db.dbName).to.eql("mdb_" + sName + "_A_123456789");
                expect(db.flags & MegaDB.DB_FLAGS.HASNEWENCKEY).to.eql(MegaDB.DB_FLAGS.HASNEWENCKEY);

                var data = { h: 'xGtrEHoT', name: 'John' };
                sdb.add("people", data)
                    .done(function(rr) {
                        expect(rr.length).to.eql(1);
                        expect(rr[0].h).to.eql(data.h); // keyPath is NOT encrypted
                        expect(rr[0].name).to.not.eql(data.name); // name must be encrypted
                        done();
                    })
                    .fail(function() {
                        fail("Failed to add");
                    });
            })
            .fail(function() {
                fail('Failed to setup database.');
            });
    });
});
