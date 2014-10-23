describe("MegaDB - Unit Test", function() {
    var mdb;
    var megaDataMocker;


    beforeEach(function(done) {
        window.u_handle = "A_1234567890";
        window.u_privk = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100'));

        megaDataMocker = new MegaDataMocker();

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
        mdb = new MegaDB("test", "unit", 1, schema);
        window.mdb = mdb; // debug helper

        done();
    });


    afterEach(function(done) {
        megaDataMocker.restore();

        localStorage.clear();

        mdb.drop()
            .fail(function() {
                fail("db not dropped: ", toArray(arguments));
            })
            .then(function() {
                done();
            });
        return;

        done();
    });


    it("add, get, remove", function(done) {
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
                                            if(obj.length === 0) {
                                                done();
                                            } else {
                                                fail("person with id 1 not removed.");
                                            }
                                        }, function() {
                                            fail("person with id 1 not removed.");
                                        })
                                    },function() {
                                        fail("could not remove obj with id 1");
                                    });
                            },
                            function() {
                                fail("could not get obj with id 1");
                            }
                        );
                    },function() {
                        fail("Could not add person 2");
                    });
            }, function() {
                assert(false, "Could not add person 1");
            });
    });

    it(".query, .filter, .update (single row)", function(done) {
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
                                            })
                                    })
                            })
                            .fail(function() {
                                fail("could not get obj with id 1");
                            });
                    });
            });
    });

    it(".query, .filter, .modify (all matched rows)", function(done) {
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
});