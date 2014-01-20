//jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;


describe("Integration Test - Basic Connect/Disconnect", function() {
    this.timeout(50000);

    var k1;
    var k2;

    beforeEach(function(done) {
        sinon.spy(Karere, "error");

        done();
    });


    afterEach(function(done) {
        expect(Karere.error).to.not.have.been.called;
        Karere.error.restore();

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
                        k2.getJid()
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

    it("Basic presence test", function(done) {
        k1 = new Karere({
            "clientName": 'karere-inttest'
        });

        k2 = new Karere({
            "clientName": 'karere-inttest'
        });

        var em_k1 = new EventMocker(k1);
        var em_k2 = new EventMocker(k2);

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
            ),
            'could not connect'
        )
            .done(function() {
                em_k1.mock("onPresence", 5000);

                expectToBeResolved(
                    createTimeoutPromise(
                        function() {
                            var is_found = false;
                            $.each(em_k1.mocks['onPresence'].triggeredArgs, function(k, v) {
                                if(v[1]['from'] == k2.getJid()) {
                                    is_found = true;
                                }
                            });

                            return is_found;
                        },
                        200,
                        2000
                    )
                ).done(function() {
                        window.k1 = k1;
                        window.k2 = k2;

                        expect(k1.getPresence(k2.getJid())).to.equal("chat");

                        expectToBeResolved(
                            $.when(
                                k2.disconnect()
                            ),
                            'could not disconnect k2'
                        ).done(function() {
                                expectToBeResolved(
                                    createTimeoutPromise(
                                        function() {
                                            var is_found = 0;
                                            $.each(em_k1.mocks['onPresence'].triggeredArgs, function(k, v) {
                                                if(v[1]['from'] == k2.getJid()) {
                                                    is_found++;
                                                }
                                            });

                                            return is_found >= 2;
                                        },
                                        200,
                                        2000
                                    )
                                )
                                    .done(function() {
                                        expect(k1.getPresence(k2.getJid())).to.equal(false);

                                        //cleanup
                                        expectToBeResolved(
                                            k1.disconnect()
                                        )
                                            .done(function() {
                                                done();
                                            });
                                    });


                            });
                });
            })


    })
});

describe("Integration Test - Rooms", function() {
    this.timeout(10000);



    var k1;
    var k2;

    var k1_event_mocker;
    var k2_event_mocker;

    var room_jid;

    beforeEach(function(done) {
        sinon.spy(Karere, "error");


        if(!k1 || !k2) {
            k1 = new Karere({
                "clientName": 'karere-inttest'
            });



            /* global */
            k2 = new Karere({
                "clientName": 'karere-inttest'
            });

            k1_event_mocker = new EventMocker(k1);
            k2_event_mocker = new EventMocker(k2);


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
                    expect(k1.getConnectionState()).to.equal(Karere.CONNECTION_STATE.CONNECTED);
                    expect(k2.getConnectionState()).to.equal(Karere.CONNECTION_STATE.CONNECTED);

                    // start chat between k1 and k2
                    var $promise = k1.startChat([
                        k2.getJid()
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
                            ).to.equal(2);

                            done();
                        })

                });
        } else {
            done();
        }

    });

    afterEach(function(done) {
        expect(Karere.error).to.not.have.been.called;
        Karere.error.restore();

        expect(k1.getConnectionState()).to.equal(Karere.CONNECTION_STATE.CONNECTED);
        expect(k2.getConnectionState()).to.equal(Karere.CONNECTION_STATE.CONNECTED);

        expectToBeResolved(
                $.when(k1.disconnect(), k2.disconnect()),
                'could not disconnect when trying to do a cleanup in afterEach.'
            )
            .done(function() {
                expect(k1.getConnectionState()).to.equal(Karere.CONNECTION_STATE.DISCONNECTED);
                expect(k2.getConnectionState()).to.equal(Karere.CONNECTION_STATE.DISCONNECTED);

                k1 = null;
                k2 = null;

                done();
            });

        expect(k1.getConnectionState()).to.equal(Karere.CONNECTION_STATE.DISCONNECTING);
        expect(k2.getConnectionState()).to.equal(Karere.CONNECTION_STATE.DISCONNECTING);
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
                ).to.equal(1);

                expect(
                    k1.getUsersInChat(room_jid)[k1.getJid()]
                ).to.equal("moderator");

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
                            k2.getJid()
                        ),
                        'failed to add k2 to chat'
                    )
                    .done(function() {
                        expect(
                            Object.keys(
                                k1.getUsersInChat(room_jid)
                            ).length
                        ).to.equal(2);

                        expect(
                            k1.getUsersInChat(room_jid)[k2.getJid()]
                        ).to.equal("participant");

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
                        ).to.equal(2);

                        expect(
                            k1.getUsersInChat(room_jid)[k2.getJid()]
                        ).to.equal("participant");

                        done();
                    });
            });
    });

    it("send and receive message", function(done) {
        var $promise1 = k1_event_mocker.mockAndWait("onPrivateMessage", 1000);
        var $promise2 = k2_event_mocker.mockAndWait("onPrivateMessage", 1000);

        var msg = "hello world!";

        k1._rawSendMessage(k2.getJid(), "chat", msg);


        $.when($promise1, $promise2).always(function() {
            expectToBeResolved($promise1, 'Did not send message to k2');
            expectToBeResolved($promise2, 'Did not received message from k1');

            expect(k1_event_mocker.mocks['onPrivateMessage'].triggeredArgs[0][1].my_own).to.be.true;
            expect(k2_event_mocker.mocks['onPrivateMessage'].triggeredArgs[0][1].my_own).to.be.false;

            expect(k1_event_mocker.mocks['onPrivateMessage'].triggeredArgs[0][1].message).to.equal(msg);
            expect(k2_event_mocker.mocks['onPrivateMessage'].triggeredArgs[0][1].message).to.equal(msg);

            expect(k1_event_mocker.mocks['onPrivateMessage'].triggeredArgs[0][1].from).to.equal(k1.getJid());
            expect(k2_event_mocker.mocks['onPrivateMessage'].triggeredArgs[0][1].from).to.equal(k1.getJid());

            expect(k1_event_mocker.mocks['onPrivateMessage'].triggeredArgs[0][1].to).to.equal(k2.getJid());
            expect(k2_event_mocker.mocks['onPrivateMessage'].triggeredArgs[0][1].to).to.equal(k2.getJid());

            done();
        })
    });


    it("send and receive message - group chat", function(done) {
        expectToBeResolved(
            k1.startChat([
                k2.getJid()
            ]),
            'could not start chat'
        ).done(function(room_jid, passwd) {
                var msg = "hello world!";


                var $promise1 = k1_event_mocker.mockAndWait("onChatMessage", 1000);
                var $promise2 = k2_event_mocker.mockAndWait("onChatMessage", 1000);

                //wait for the second trigger (1st is some XMPP default message to the new users who join)
                var $promise3 = createTimeoutPromise(function() {
                    return k2_event_mocker.mocks['onChatMessage'].triggeredCount == 2
                }, 100, 1000);

                k1._rawSendMessage(room_jid, "groupchat", msg);

                $.when($promise1, $promise2, $promise3).always(function() {
                    expectToBeResolved($promise1, 'Did not received message in the group chat (k1)');
                    expectToBeResolved($promise2, 'Did not received message in the group chat (k2)');

                    expect(k1_event_mocker.mocks['onChatMessage'].triggeredArgs[0][1].my_own).to.be.true;
                    expect(k2_event_mocker.mocks['onChatMessage'].triggeredArgs[0][1].my_own).to.be.false;

                    expect(k1_event_mocker.mocks['onChatMessage'].triggeredArgs[0][1].message).to.equal(msg);
                    expect(k2_event_mocker.mocks['onChatMessage'].triggeredArgs[0][1].message).to.equal(msg);

                    expect(k1_event_mocker.mocks['onChatMessage'].triggeredArgs[0][1].from).to.equal(k1.getJid());
                    expect(k2_event_mocker.mocks['onChatMessage'].triggeredArgs[0][1].from).to.equal(room_jid + "/" + k1.getNickname());

                    expect(k1_event_mocker.mocks['onChatMessage'].triggeredArgs[0][1].to).to.equal(room_jid);
                    expect(k2_event_mocker.mocks['onChatMessage'].triggeredArgs[0][1].to).to.equal(k2.getJid());

                    done();
                })
        });
    });


    it("send isActive, isComposing, isPausedComposing", function(done) {
        var $promise2_paused = k2_event_mocker.mockAndWait("onPausedMessage", 1000);
        var $promise2_active = k2_event_mocker.mockAndWait("onActiveMessage", 1000);
        var $promise2_composing = k2_event_mocker.mockAndWait("onComposingMessage", 1000);



        k1.sendIsActive(k2.getJid());
        k1.sendIsComposing(k2.getJid());
        k1.sendComposingPaused(k2.getJid());


        $.when($promise2_paused, $promise2_active, $promise2_composing).always(function() {
            expectToBeResolved($promise2_paused, 'k2 did not received paused message.');
            expectToBeResolved($promise2_active, 'k2 did not active paused message.');
            expectToBeResolved($promise2_composing, 'k2 did not composing paused message.');

            expect(k2_event_mocker.mocks['onPausedMessage'].triggeredCount).to.be.equal(1);
            expect(k2_event_mocker.mocks['onActiveMessage'].triggeredCount).to.be.equal(1);
            expect(k2_event_mocker.mocks['onComposingMessage'].triggeredCount).to.be.equal(1);

            expect(k2_event_mocker.mocks['onPausedMessage'].triggeredArgs[0][1].my_own).to.be.false;
            expect(k2_event_mocker.mocks['onActiveMessage'].triggeredArgs[0][1].my_own).to.be.false;
            expect(k2_event_mocker.mocks['onComposingMessage'].triggeredArgs[0][1].my_own).to.be.false;

            expect(k2_event_mocker.mocks['onPausedMessage'].triggeredArgs[0][1].from).to.equal(k1.getJid());
            expect(k2_event_mocker.mocks['onActiveMessage'].triggeredArgs[0][1].from).to.equal(k1.getJid());
            expect(k2_event_mocker.mocks['onComposingMessage'].triggeredArgs[0][1].from).to.equal(k1.getJid());

            expect(k2_event_mocker.mocks['onPausedMessage'].triggeredArgs[0][1].to).to.equal(k2.getJid());
            expect(k2_event_mocker.mocks['onActiveMessage'].triggeredArgs[0][1].to).to.equal(k2.getJid());
            expect(k2_event_mocker.mocks['onComposingMessage'].triggeredArgs[0][1].to).to.equal(k2.getJid());

            done();
        })
    });
});

