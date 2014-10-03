describe("MegaDB - Encryption Test and demo", function() {
    var mdb;

    /**
     * Actual filter, which will process the MegaDB events and encrypt data
     *
     * @param mdbInstance {MegaDB}
     * @constructor
     */
    var MdbEncryptionFilter = function(mdbInstance) {
        /**
         * Dummy encrypt/decrypt funcs
         */
        var simpleXorEnc = function(s, k) {
            var result = "";
            s = s.toString();
            for(i=0; i<s.length;i++)  {
                result += String.fromCharCode(k^s.charCodeAt(i));
            }
            return result;
        };

        var simpleXorDec = function(s, k)  {
            var result="";
            for(i=0; i<s.length; i++)  {
                result += String.fromCharCode(k^s.charCodeAt(i));
            }
            return result;
        };

        // user's already loaded, static key (e.g. u_privk)
        var encDecKey = 1;

        // funcs which encrypt or decrypt the whole object

        /**
         * Demo encrypt func
         *
         * @param table {string} you can use this argument to do different type of encryption for the different db tables
         * @param obj {Object} actual object to be encrypted
         */
        var simpleEncryptObjFunction = function(table, obj) {
            Object.keys(obj).forEach(function(k) {
                var v = obj[k];
                if(k == "__origObj") { return; }

                obj[k] = simpleXorEnc(v, encDecKey);

                console.log(k, obj[k]);
            })
        };

        /**
         * Demo decrypt func
         *
         * @param table {string} you can use this argument to do different type of encryption for the different db tables
         * @param obj {Object} actual object to be encrypted
         */
        var simpleDecryptObjFunction = function(table, obj) {
            if(obj.__origObj) { // restore if available in plain text
                Object.keys(obj.__origObj).forEach(function(k) {
                    var v = obj.__origObj[k];
                    if(k == "__origObj") { return; }

                    obj[k] = v;
                });
            } else { // no orig obj, decrypt please
                Object.keys(obj).forEach(function (k) {
                    var v = obj[k];
                    if (k == "__origObj" || k == "id") {
                        return;
                    }

                    obj[k] = simpleXorDec(v, encDecKey);
                })
            }
        };


        /**
         * attach those functions to the specific event handlers
         */
        mdbInstance.bind("onBeforeAdd", function(e, table, obj) {
            console.error("onBeforeAdd: ", table, obj);

            obj.__origObj = clone(obj); // safe reference of the orig obj, so that we can easily restore it, after its
                                        // inserted

            simpleEncryptObjFunction(table, obj);
        });

        mdbInstance.bind("onAfterAdd", function(e, table, obj, addFuncReturnValue) {
            console.error("onAfterAdd: ", table, obj, addFuncReturnValue);

            simpleDecryptObjFunction(table, obj);
        });

        mdbInstance.bind("onBeforeUpdate", function(e, table, k, obj) {
            console.error("onBeforeUpdate: ", table, obj);

            obj.__origObj = clone(obj); // safe reference of the orig obj, so that we can easily restore it, after its
                                        // inserted

            simpleEncryptObjFunction(table, obj);
        });
        mdbInstance.bind("onAfterUpdate", function(e, table, k, obj, addFuncReturnValue) {
            console.error("onAfterAdd: ", table, obj, addFuncReturnValue);

            simpleDecryptObjFunction(table, obj);
        });

        mdbInstance.bind("onDbRead", function(e, table, obj) {
            console.error("onDbRead: ", table, obj);

            simpleDecryptObjFunction(table, obj);

        });

        mdbInstance.bind("onFilterQuery", function(e, table, filters) {
            console.error("onFilterQuery: ", table, filters);
            // since filters is an array containing key, value pairs, lets parse them
            for(var i = 0; i<filters.length; i+=2) {
                var k = filters[i];
                var v = filters[i+1];

                if(k == "id") { return; }

                filters[i+1] = simpleXorEnc(v, encDecKey);
            };
            console.error(filters);
        });
    };

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

        var mdbEncFilter = new MdbEncryptionFilter(mdb);
        done();
    });


    afterEach(function(done) {

        mdb.drop()
            .fail(function() {
                fail("db not dropped: ", toArray(arguments));
            })
            .then(function() {
                done();
            });
        return;

        //done();
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
                                    expect(r.answer).to.eq('12'); // because of the xor enc, 12 is conv to '12'

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
                                expect(r[0].answer).to.eql('12');

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