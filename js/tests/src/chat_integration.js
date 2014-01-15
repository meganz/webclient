describe("Integration Test", function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;


    var k1;
    var k2;

    beforeEach(function() {
        spyOn(Karere, 'error');
    });


    afterEach(function(done) {
        expect(Karere.error.calls.count()).toEqual(0);

        var promises = [];

        if(k1) {
            promises.push(
                k1.disconnect()
            );
        }
        if(k2) {
            promises.push(
                k2.disconnect()
            );
        }

        expectToBeResolved(
                $.when.apply($, promises),
                'could not disconnect gracefully'
            )
            .always(function() {
                k1 = null;
                k2 = null;
            })
            .done(function() {
                done();
            });
    });

    it("Basic connect", function(done) {
        k1 = new Karere({
            "clientName": 'karere-inttest'
        });
        expectToBeResolved(
                k1.connect(
                    "test1@sandbox.developers.mega.co.nz",
                    "test1"
                ),
                'could not connect'
            )
            .done(function() {
                done();
            })

    });
    it("Basic connect, disconnect, connect", function(done) {
        k1 = new Karere({
            "clientName": 'karere-inttest'
        });

        expectToBeResolved(
                k1.connect(
                    "test1@sandbox.developers.mega.co.nz",
                    "test1"
                ),
                'could not connect'
            )
            .done(function() {
                console.warn("CONNECTED, will disconnect.");
                expectToBeResolved(
                        k1.disconnect(),
                        'could not disconnect'
                    )
                    .done(function() {
                        expectToBeResolved(
                                k1.reconnect(),
                                'could not reconnect'
                            )
                            .done(function() {
                                done();
                            });

                    });
            });
    });

    it("Basic connect, disconnect, auto reconnect when startChat is called", function(done) {
        k1 = new Karere({
            "clientName": 'karere-inttest'
        });

        expectToBeResolved(
            k1.connect(
                "test1@sandbox.developers.mega.co.nz",
                "test1"
            )
            .done(function() {
                expectToBeResolved(
                        k1.disconnect(),
                        'could not disconnect'
                    )
                    .done(function() {
                        expectToBeResolved(
                                k1.startChat([]),
                                'could not start chat'
                            )
                            .done(function() {
                                done();
                            });

                    });
            }), 'could not connect');
    });
    it("Basic Connect and join empty room", function(done) {
        k1 = new Karere({
            "clientName": 'karere-inttest'
        });


        expectToBeResolved(
                k1.connect(
                    "test1@sandbox.developers.mega.co.nz",
                    "test1"
                ),
                "could not connect"
            )
            .done(function() {
                expectToBeResolved(
                        k1.startChat([]),
                        'could not start chat'
                    )
                    .done(function() {
                        done();
                    });
            });

    });

    it("Basic Connect and join room w/ 2 users", function(done) {
        k1 = new Karere({
            "clientName": 'karere-inttest'
        });

        k2 = new Karere({
            "clientName": 'karere-inttest'
        });


        expectToBeResolved(
            $.when(
                k1.connect(
                    "test1@sandbox.developers.mega.co.nz",
                    "test1"
                ),
                k2.connect(
                    "test2@sandbox.developers.mega.co.nz",
                    "test2"
                )
            )
            .done(function() {
                expectToBeResolved(
                    k1.startChat([
                        k2.getBareJid()
                    ])
                    .done(function() {
                        done();
                    }),
                    "Could not start chat."
                );
            }),
            "Could not connect."
        );
    });
});

describe("Integration Test - Rooms", function() {
    var k1;
    var k2;
    var room_jid;

    beforeEach(function(done) {
        spyOn(Karere, 'error');

        if(!k1 || !k2) {
            k1 = new Karere({
                "clientName": 'karere-inttest'
            });



            /* global */
            k2 = new Karere({
                "clientName": 'karere-inttest'
            });


            var k1_connect_promise = k1.connect(
                "test1@sandbox.developers.mega.co.nz",
                "test1"
            );

            var k2_connect_promise = k2.connect(
                "test2@sandbox.developers.mega.co.nz",
                "test2"
            );

            expectToBeResolved(
                    $.when(
                        k1_connect_promise,
                        k2_connect_promise
                    ),
                    'could not connect'
                )
                .done(function() {
                    expect(k1.getConnectionState()).toEqual(Karere.CONNECTION_STATE.CONNECTED);
                    expect(k2.getConnectionState()).toEqual(Karere.CONNECTION_STATE.CONNECTED);

                    // start chat between k1 and k2
                    var $promise = k1.startChat([
                        k2.getBareJid()
                    ]);

                    expectToBeResolved(
                            $promise,
                            'could not start chat'
                        )
                        .done(function(_room_jid) {
                            room_jid = _room_jid;

                            // there are 2 users visible in `room_jid` by k1
                            expect(
                                Object.keys(
                                    k1.getUsersInChat(room_jid)
                                ).length
                            ).toEqual(2);

                            done();
                        })

                });
        } else {
            done();
        }

    });

    afterEach(function(done) {

        expect(Karere.error.calls.count()).toEqual(0);

        expect(k1.getConnectionState()).toEqual(Karere.CONNECTION_STATE.CONNECTED);
        expect(k2.getConnectionState()).toEqual(Karere.CONNECTION_STATE.CONNECTED);

        expectToBeResolved(
                $.when(k1.disconnect(), k2.disconnect()),
                'could not disconnect when trying to do a cleanup in afterEach.'
            )
            .done(function() {
                expect(k1.getConnectionState()).toEqual(Karere.CONNECTION_STATE.DISCONNECTED);
                expect(k2.getConnectionState()).toEqual(Karere.CONNECTION_STATE.DISCONNECTED);

                k1 = null;
                k2 = null;

                done();
            });

        expect(k1.getConnectionState()).toEqual(Karere.CONNECTION_STATE.DISCONNECTING);
        expect(k2.getConnectionState()).toEqual(Karere.CONNECTION_STATE.DISCONNECTING);
    });




    // since the user is already added to the chat by the beforeEach() we can do a leaveChat test first
    it("leave chat", function(done) {
        expectToBeResolved(
                k2.leaveChat(room_jid),
                'k2 failed to leave chat.'
            )
            .done(function() {
                expect(
                    Object.keys(
                        k1.getUsersInChat(room_jid)
                    ).length
                ).toEqual(1);

                expect(
                    k1.getUsersInChat(room_jid)[k1.getJid()]
                ).toBeTruthy();

                done();
            });
    });

    // after that add him back
    it("add to chat manually", function(done) {
        // need to leave first!
        expectToBeResolved(
               k2.leaveChat(room_jid),
               'k2 failed to leave chat.'
            )
            .done(function() {
                expectToBeResolved(
                        k1.addUserToChat(
                            room_jid,
                            k2.getBareJid()
                        ),
                        'failed to add k2 to chat'
                    )
                    .done(function() {
                        expect(
                            Object.keys(
                                k1.getUsersInChat(room_jid)
                            ).length
                        ).toEqual(2);

                        expect(
                            k1.getUsersInChat(room_jid)[k2.getJid()]
                        ).toBeTruthy();

                        done();
                    });
            });

    });


    it("remove user and add it back", function(done) {
        expectToBeResolved(
                k1.removeUserFromChat(
                    room_jid,
                    k2.getJid()
                ),
                'failed to remove k2 from chat'
            )
            .done(function() {
                expectToBeResolved(
                        k1.addUserToChat(
                            room_jid,
                            k2.getJid()
                        ),
                        'failed to add k2 back to the chat'
                    )
                    .done(function() {
                        expect(
                            Object.keys(
                                k1.getUsersInChat(room_jid)
                            ).length
                        ).toEqual(2);

                        expect(
                            k1.getUsersInChat(room_jid)[k2.getJid()]
                        ).toBeTruthy();

                        done();
                    });
            });
    });
});


// todo: create an EventMocker, which uses spyOn :)
// todo: test Messaging
// todo: test isComposing
// todo: test isPausedComposing
// todo: test isActive


/* global */

//                        // send msg
//
//                        console.debug("sending chat msg to: ", room_jid);
//                        k1._rawSendMessage(room_jid, "groupchat", "hello world!");
