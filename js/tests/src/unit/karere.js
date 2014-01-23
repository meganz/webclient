describe("Karere Unit Test", function() {
    var k1;
    var k2;
    var em1;
    var em2;

    var m1;
    var m2;


    beforeEach(function(done) {
        k1 = new Karere();
        k2 = new Karere();

        m1 = new StropheMocker(k1.connection);
        m2 = new StropheMocker(k2.connection);

        em1 = new EventMocker(k1);
        em2 = new EventMocker(k2);

        done();
    });


    afterEach(function(done) {
        m1.restore();
        m2.restore();

        k1 = k2 = em1 = em2 = m1 = m2 = null;

        done();
    });


    // this was a tricky to find bug, this is why i wrote a unit test to make sure it wont regress back in the future.
    it("can trigger events on different objects", function(done) {
        k1.on('onFakeEvent', function(e, arg) {
            expect(arg).to.equal("k1");
        });
        k2.on('onFakeEvent', function(e, arg) {
            expect(arg).to.equal("k2");
        });

        k1.trigger('onFakeEvent', "k1");
        k2.trigger('onFakeEvent', "k2");

        done();
    });

    it("can initialize karere", function(done) {
        expect(k1.on).to.be.an('Function');
        expect(k1.bind).to.be.an('Function');
        expect(k1.trigger).to.be.an('Function');
        expect(k1.unbind).to.be.an('Function');

        expect(k1.connection.prototype).to.equal(Strophe.prototype);

        done();
    });
    it("can connect, disconnect and reconnect", function(done) {
        var promise = k1.connect("user@jid.com", "password");

        expect(m1.calls['connect'][0][0]).to.contain("user@jid.com/");
        expect(m1.calls['connect'][0][1]).to.equal("password");
        expect(
            // send new state = CONNECTED
            m1.calls['connect'][0][2](
                Karere.CONNECTION_STATE.CONNECTED
            )
        ).to.be.true;

        // presence was send
        expect(m1.calls['send'][0][0].tagName).to.equal("presence");

        expect(promise.state()).to.equal("resolved");


        var promise2 = k1.disconnect();

        expect(k1.getConnectionState()).to.equal(Karere.CONNECTION_STATE.DISCONNECTING);
        expect(promise2.state()).to.equal('pending');

        k1._connection_state = Karere.CONNECTION_STATE.DISCONNECTED;


        expectToBeResolved(
            promise2,
            'could not disconnect'
        ).done(function() {


                var promise3 = k1.reconnect();

                expect(m1.calls['connect'][1][0]).to.contain("user@jid.com/");
                expect(m1.calls['connect'][1][1]).to.equal("password");
                expect(
                    // send new state = CONNECTED
                    m1.calls['connect'][1][2](
                        Karere.CONNECTION_STATE.CONNECTED
                    )
                ).to.be.true;

                expect(promise3.state()).to.equal("resolved");

                done();
            })
    });

    it("can generate different IDXes", function(done) {
        expect(
            k1._generateNewIdx() != k1._generateNewIdx()
        ).to.be.true;

        expect(
            k1._generateNewResourceIdx() != k1._generateNewResourceIdx()
        ).to.be.true;

        expect(
            k1._generateNewRoomIdx() != k1._generateNewRoomIdx()
        ).to.be.true;

        expect(
            k1._generateNewRoomPassword() != k1._generateNewRoomPassword()
        ).to.be.true;

        done();
    });

    it("can retrieve different jid formats", function(done) {
        k1.fakeConnect("user@jid.com", "password");

        console.log(k1);

        expect(k1.getJid()).to.contain("user@jid.com/");
        expect(k1.getBareJid()).to.equal("user@jid.com");
        expect(k1.getNickname()).to.equal("user");

        done();
    });

    it("can receive private, group and chatstate (composing, paused composing, active) messages", function(done) {
        k1.fakeConnect("user@jid.com", "password");

        em1.mock("onPrivateMessage");
        em1.mock("onActiveMessage");
        em1.mock("onPausedMessage");
        em1.mock("onComposingMessage");

        k1._onIncomingStanza(
            stringToXml(
                "<message xmlns='jabber:client' from='from@jid.com' to='" + k1.getJid() + "' type='chat' id='idx'>" +
                    "<active xmlns='http://jabber.org/protocol/chatstates'/>" +
                    "<body>yo</body>" +
                "</message>"
            )
        );

        expect(em1.mocks['onPrivateMessage'].triggeredCount).to.equal(1);
        expect(em1.mocks['onPrivateMessage'].triggeredArgs[0][1].from).to.equal("from@jid.com");
        expect(em1.mocks['onPrivateMessage'].triggeredArgs[0][1].to).to.equal(k1.getJid());


        expect(em1.mocks['onActiveMessage'].triggeredCount).to.equal(1);
        expect(em1.mocks['onActiveMessage'].triggeredArgs[0][1].from).to.equal("from@jid.com");
        expect(em1.mocks['onActiveMessage'].triggeredArgs[0][1].to).to.equal(k1.getJid());

        k1._onIncomingStanza(
            stringToXml(
                "<message xmlns='jabber:client' from='from@jid.com' to='" + k1.getJid() + "' type='chat' id='idx'>" +
                    "<composing xmlns='http://jabber.org/protocol/chatstates'/>" +
                "</message>"
            )
        );
        expect(em1.mocks['onComposingMessage'].triggeredCount).to.equal(1);
        expect(em1.mocks['onComposingMessage'].triggeredArgs[0][1].from).to.equal("from@jid.com");
        expect(em1.mocks['onComposingMessage'].triggeredArgs[0][1].to).to.equal(k1.getJid());

        k1._onIncomingStanza(
            stringToXml(
                "<message xmlns='jabber:client' from='from@jid.com' to='" + k1.getJid() + "' type='chat' id='idx'>" +
                    "<paused xmlns='http://jabber.org/protocol/chatstates'/>" +
                "</message>"
            )
        );
        expect(em1.mocks['onPausedMessage'].triggeredCount).to.equal(1);
        expect(em1.mocks['onPausedMessage'].triggeredArgs[0][1].from).to.equal("from@jid.com");
        expect(em1.mocks['onPausedMessage'].triggeredArgs[0][1].to).to.equal(k1.getJid());

        done();
    });

    it("can receive group chat invitations, detect and trigger events for left/joined users, get users in room, can also waitForUserToJoin and waitForUserToLeave", function(done) {
        k1.fakeConnect("user@jid.com", "password");

        em1.mock("onInviteMessage");
        em1.mock("onUsersJoined");
        em1.mock("onUsersLeft");

        var promise_joined = k1.waitForUserToJoin("room@jid.com", "user2@jid.com");
        var promise_left = k1.waitForUserToLeave("room@jid.com", "user2@jid.com");

        k1._onIncomingStanza(
            stringToXml(
                "<message xmlns='jabber:client' from='room@jid.com' to='" + k1.getJid() + "' type='normal'>" +
                    "<x xmlns='jabber:x:conference' jid='room@jid.com' password='passwd'/>" +
                    "<body>user2@jid.com invites you to the room room@jid.com</body>" +
                "</message>"
            )
        );

        expect(em1.mocks['onInviteMessage'].triggeredCount).to.equal(1);
        expect(m1.calls['muc.join'].length).to.equal(1);
        expect(m1.calls['muc.join'][0][0]).to.equal("room@jid.com");
        expect(m1.calls['muc.join'][0][1]).to.equal("user");
        expect(m1.calls['muc.join'][0][5]).to.equal("passwd");

        k1._onIncomingStanza(
            stringToXml(
                "<presence xmlns='jabber:client' from='room@jid.com' to='" + k1.getJid() + "'>" +
                    "<show>away</show>" +
                    "<status>Away</status>" +
                    "<c xmlns='http://jabber.org/protocol/caps' node='http://pidgin.im/' hash='sha-1' ver='DdnydQG7RGhP9E3k9Sf+b+bF0zo='/>" +
                    "<x xmlns='http://jabber.org/protocol/muc#user'>" +
                        "<item jid='user2@jid.com/r1' affiliation='none' role='participant'/>" +
                    "</x>" +
                "</presence>"
            )
        );

        expect(em1.mocks['onUsersJoined'].triggeredCount).to.equal(1);
        expect(em1.mocks['onUsersJoined'].triggeredArgs[0][1]['new_users']).to.not.be.empty;
        expect(em1.mocks['onUsersJoined'].triggeredArgs[0][1]['new_users']['user2@jid.com/r1']).to.equal("participant");

        expect(promise_joined.state()).to.equal("resolved");

        expect(
            Object.keys(
                k1.getUsersInChat('room@jid.com')
            ).length
        ).to.equal(1);

        k1._onIncomingStanza(
            stringToXml(
                "<presence xmlns='jabber:client' from='room@jid.com' to='" + k1.getJid() + "'>" +
                    "<show>away</show>" +
                    "<status>Away</status>" +
                    "<c xmlns='http://jabber.org/protocol/caps' node='http://pidgin.im/' hash='sha-1' ver='DdnydQG7RGhP9E3k9Sf+b+bF0zo='/>" +
                    "<x xmlns='http://jabber.org/protocol/muc#user'>" +
                        "<item jid='user2@jid.com/r1' affiliation='none' role='none'/>" +
                    "</x>" +
                "</presence>"
            )
        );

        expect(em1.mocks['onUsersLeft'].triggeredCount).to.equal(1);
        expect(em1.mocks['onUsersLeft'].triggeredArgs[0][1]['left_users']).to.not.be.empty;
        expect(em1.mocks['onUsersLeft'].triggeredArgs[0][1]['left_users']['user2@jid.com/r1']).to.be.true;

        expect(promise_left.state()).to.equal("resolved");

        expect(
            Object.keys(
                k1.getUsersInChat('room@jid.com')
            ).length
        ).to.equal(0);

        done();
    });


    it("can receive, cache and trigger events regarding the users presence", function(done) {
        k1.fakeConnect("user@jid.com", "password");

        em1.mock("onPresence");

        // online
        k1._onIncomingStanza(
            stringToXml(
                "<presence xmlns='jabber:client' from='user2@jid.com' to='" + k1.getJid() + "'>" +
                "</presence>"
            )
        );

        expect(em1.mocks['onPresence'].triggeredCount).to.equal(1);
        expect(em1.mocks['onPresence'].triggeredArgs[0][1]['from']).to.equal("user2@jid.com");
        expect(em1.mocks['onPresence'].triggeredArgs[0][1]['to']).to.equal(k1.getJid());
        expect(k1.getPresence("user2@jid.com")).to.equal("available");


        k1._onIncomingStanza(
            stringToXml(
                "<presence xmlns='jabber:client' from='user2@jid.com' to='" + k1.getJid() + "'>" +
                    "<show>away</show>" +
                    "<status>Away</status>" +
                "</presence>"
            )
        );

        expect(em1.mocks['onPresence'].triggeredCount).to.equal(2);
        expect(em1.mocks['onPresence'].triggeredArgs[1][1]['from']).to.equal("user2@jid.com");
        expect(em1.mocks['onPresence'].triggeredArgs[1][1]['to']).to.equal(k1.getJid());
        expect(k1.getPresence("user2@jid.com")).to.equal("away");


        k1._onIncomingStanza(
            stringToXml(
                "<presence xmlns='jabber:client' from='user2@jid.com' to='" + k1.getJid() + "' type='unavailable' />"
            )
        );

        expect(em1.mocks['onPresence'].triggeredCount).to.equal(3);
        expect(em1.mocks['onPresence'].triggeredArgs[1][1]['from']).to.equal("user2@jid.com");
        expect(em1.mocks['onPresence'].triggeredArgs[1][1]['to']).to.equal(k1.getJid());
        expect(k1.getPresence("user2@jid.com")).to.be.false;

        done();
    });

    it("can create room, leave room, add user to room, remove user from room", function(done) {
        var room_jid;
        var room_password;

        k1.fakeConnect("user@jid.com", "password");

        var promise_start = k1.startChat([
                'user2@jid.com/r1'
            ]);
//                .done(function(room_jid) {
//                    var promise_add = k1.addUserToChat(room_jid, "user2@jid.com")
//                    var promise_remove = k1.removeUserFromChat(room_jid, "user2@jid.com")
//
//                    var promise_leave = k1.leaveChat(room_jid);
//
//                    done();
//                });

        expect(m1.calls['muc.join'].length).to.equal(1);
        room_jid = m1.calls['muc.join'][0][0];
        room_password = m1.calls['muc.join'][0][5];

        expect(room_password).to.not.be.empty;

        // Stanza that says that I'd just joined
        k1._onIncomingStanza(
            stringToXml(
                "<presence xmlns='jabber:client' from='" + room_jid + "/user2' to='" + k1.getJid() + "'>" +
                    "<show>away</show>" +
                    "<status>Away</status>" +
                    "<c xmlns='http://jabber.org/protocol/caps' node='http://pidgin.im/' hash='sha-1' ver='DdnydQG7RGhP9E3k9Sf+b+bF0zo='/>" +
                    "<x xmlns='http://jabber.org/protocol/muc#user'>" +
                    "<item jid='" + k1.getJid() + "' affiliation='none' role='participant'/>" +
                    "</x>" +
                "</presence>"
            )
        );

        expect(m1.calls['muc.saveConfiguration'].length).to.equal(1);
        expect(m1.calls['muc.saveConfiguration'][0][0]).to.equal(room_jid);

        m1.calls['muc.saveConfiguration'][0][2](); // call the saveConfiguration success handler




        expect(m1.calls['muc.directInvite'].length).to.equal(1);
        expect(m1.calls['muc.directInvite'][0][0]).to.equal(room_jid);
        expect(m1.calls['muc.directInvite'][0][1]).to.equal("user2@jid.com/r1");
        expect(m1.calls['muc.directInvite'][0][3]).to.equal(room_password);


        // Stanza that says that user2 had joined
        k1._onIncomingStanza(
            stringToXml(
                "<presence xmlns='jabber:client' from='" + room_jid + "/r1' to='" + k1.getJid() + "'>" +
                    "<show>away</show>" +
                    "<status>Away</status>" +
                    "<c xmlns='http://jabber.org/protocol/caps' node='http://pidgin.im/' hash='sha-1' ver='DdnydQG7RGhP9E3k9Sf+b+bF0zo='/>" +
                    "<x xmlns='http://jabber.org/protocol/muc#user'>" +
                        "<item jid='user2@jid.com/r1' affiliation='none' role='participant'/>" +
                    "</x>" +
                "</presence>"
            )
        );

        expect(promise_start.state()).to.equal('resolved');

        // we need to mock the rooms{}.roster[] obj
        k1.connection.muc.rooms[room_jid].roster = {
            'r1': {
                'jid': 'user2@jid.com/r1'
            }
        };

        var promise_left = k1.removeUserFromChat(room_jid, "user2@jid.com/r1");

        expect(m1.calls['muc.kick'].length).to.equal(1);
        expect(m1.calls['muc.kick'][0][0]).to.equal(room_jid);
        expect(m1.calls['muc.kick'][0][1]).to.equal("r1");

        // Stanza that says that user2 was kicked
        k1._onIncomingStanza(
            stringToXml(
                "<presence xmlns='jabber:client' from='" + room_jid + "/r1' to='user@jid.com' type='unavailable'>" +
                    "<x xmlns='http://jabber.org/protocol/muc#user'>" +
                        "<item affiliation='none' role='none' jid='user2@jid.com/r1'/>" +
                        "<status code='307'/>" +
                    "</x>" +
                "</presence>"
            )
        );


        expect(promise_left.state()).to.equal("resolved");


        var promise_leave = k1.leaveChat(room_jid);

        expect(m1.calls['muc.leave'].length).to.equal(1);
        expect(m1.calls['muc.leave'][0][0]).to.equal(room_jid);

        // fake call to trigger the handler
        m1.calls['muc.leave'][0][2]();

        expect(promise_leave.state()).to.equal('resolved');

        done();
    });

    //TODO: write a simple test for _requiresConnectionWrapper
});