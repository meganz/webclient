describe("MegaDB Unit Test", function() {
    var mdb;
    beforeEach(function(done) {
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

        mdb.drop()
            .fail(function() {
                fail("db not dropped: ", toArray(arguments));
                done();
            })
            .then(function() {
                done();
            });
        return;
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

    it(".query, .filter, .update", function(done) {
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
});