describe("Chat.js - Karere UI integration", function() {

    var fixtureManager = new Fixtures("src/unit/fixtures/chat/");

    window.u_handle = "testcase1";
    window.avatars = {};

    var $container = null;

    var karereMocker = null;

    beforeEach(function(done) {

        localStorage.removeItem("megaChatPresence");

        window.oldM = M;
        window.M = {
            'u': {
                "testcase1": {
                    "u": "testcase1", "c": 2, "m": "lpetrov@me.com", "presence": "chat", "presenceMtime": 1391783363.743
                },
                "someid": {
                    "u": "someid", "c": 1, "m": "lp@mega.co.nz", "ts": 1390835777, "name": "lp@mega.co.nz", "h": "hsxs0LUdV1s", "t": 1, "p": "contacts", "presence": "chat", "presenceMtime": 1392042647
                }
            }
        };

        fixtureManager.get("templates.html")
            .done(function(filename, contents) {

                $container = $(contents);
                $(document.body).append($container);
                karereMocker = new KarereMocker(megaChat.karere);

                window.km = karereMocker;

                megaChat.init();

                expectToBeResolved(
                    createTimeoutPromise(function() {
                        return megaChat.karere.getConnectionState() == Karere.CONNECTION_STATE.CONNECTED
                    }, 100, 1000),
                    'cant connect'
                ).done(function() {
                    done();
                });
            })
            .fail(function() {
                expect(true).to.equal(false, "Failed to load templates.html, fail arguments: " + toArray(arguments).join(", "));
            });
    });


    afterEach(function(done) {

        window.M = window.oldM;
        megaChat.destroy();

        karereMocker.restore();
        $container.remove();
        done();
    });



    it("can load fixtures", function(done) {
        expectToBeResolved(
            fixtureManager.get("templates.html"),
            "failed to load templates.html"
        );

        done();
    });


    it("1on1 chat, conflicted/invitation accept for 1on1 chat rooms", function(done) {
        var user1jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[0]].u);
        var user2jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[1]].u);

        var $promise = megaChat.openChat(
            [
                user1jid,
                user2jid
            ],
            "private"
        );


        expect(
            megaChat.karere.startChat
        ).to.have.been.calledWith([]);

        expect(
            megaChat.karere.startChat
        ).to.have.been.calledOnce;

        expectToBeResolved($promise, 'cant open chat')
            .done(function() {

                var roomJid = "roomjid@conference.example.com";
                expect(
                    megaChat.karere.addUserToChat
                ).to.have.been.calledOnce;


                expect(
                    megaChat.karere.addUserToChat.getCall(0).args[0]
                ).to.equal(roomJid);

                expect(
                    megaChat.karere.addUserToChat.getCall(0).args[1]
                ).to.equal(user1jid);

                expect(
                    megaChat.karere.addUserToChat.getCall(0).args[2]
                ).to.equal(undefined);

                expect(
                    megaChat.karere.addUserToChat.getCall(0).args[3]
                ).to.equal("private");

                var args4 = megaChat.karere.addUserToChat.getCall(0).args[4];
                expect(args4).to.have.property('ctime');
                expect(args4).to.have.property('invitationType', 'created');
                expect(args4).to.have.property('participants').to.eql([user1jid, user2jid]);
                expect(args4).to.have.property('users').to.be.empty;


                // fake user join
                var users = {};
                users[user1jid] = "moderator";
                users[user2jid] = "participant";

                megaChat.karere._triggerEvent("UserJoined", {
                    "myOwn":true,
                    "to": user1jid,
                    "from": roomJid + "/" + megaChat.karere.getNickname(),
                    "id":null,
                    "roomJid":roomJid,
                    "currentUsers":{},
                    "newUsers":users
                });


                expect(megaChat.chats[roomJid].getParticipants())
                    .to.eql(
                        megaChat.chats[roomJid].users
                    );

                expect(megaChat.chats[roomJid].getParticipants().length).to.equal(2);


                // reject invitation
                var eventTriggerShouldReturnFalse = megaChat.karere._triggerEvent("InviteMessage", {
                    elems: [],
                    from: user2jid,
                    id: "4",
                    karere: null,
                    meta: {
                        ctime: unixtime() + 1000 /* date in the future */,
                        invitationType: "resume",
                        participants: [
                            Strophe.getBareJidFromJid(user1jid),
                            Strophe.getBareJidFromJid(user2jid)
                        ],
                        type: "private",
                        users: users
                    },
                    myOwn: false,
                    password: "password",
                    rawMessage: null,
                    rawType: null,
                    room: "conflicting-" + roomJid,
                    to: user1jid,
                    type: "Message"
                });

                expect(eventTriggerShouldReturnFalse).to.not.be.ok;

                expect(
                    megaChat.karere.leaveChat
                ).not.to.have.been.called;

                // accept invitation
                var eventTriggerShouldReturnFalse2 = megaChat.karere._triggerEvent("InviteMessage", {
                    elems: [],
                    from: user2jid,
                    id: "4",
                    karere: null,
                    meta: {
                        ctime: unixtime() - 10000 /* date in the future */,
                        invitationType: "resume",
                        participants: [
                            Strophe.getBareJidFromJid(user1jid),
                            Strophe.getBareJidFromJid(user2jid)
                        ],
                        type: "private",
                        users: users
                    },
                    myOwn: false,
                    password: "password",
                    rawMessage: null,
                    rawType: null,
                    room: "conflicting-" + roomJid,
                    to: user1jid,
                    type: "Message"
                });

                expect(
                    megaChat.karere.leaveChat
                ).to.have.been.calledOnce;


                expect(
                    megaChat.karere.leaveChat.getCall(0).args[0]
                ).to.equal(roomJid);

                expect(eventTriggerShouldReturnFalse2).to.not.be.ok;

                done();
            });
    });

    it("1on1 chat invitation accept, sync messages and order them correctly when adding to the dom", function(done) {
        var roomJid = "roomjid@conference.example.com";

        var user1jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[0]].u);
        var user2jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[1]].u);

        // fake user join
        var users = {};
        users[user2jid] = "moderator";


        // recieve invitation
        var eventTriggerShouldReturnFalse = megaChat.karere._triggerEvent("InviteMessage", {
            elems: [],
            from: user2jid,
            id: "4",
            karere: null,
            meta: {
                ctime: unixtime() - 100 /* date in the past */,
                invitationType: "resume",
                participants: [
                    Strophe.getBareJidFromJid(user1jid),
                    Strophe.getBareJidFromJid(user2jid)
                ],
                type: "private",
                users: users
            },
            myOwn: false,
            password: "password",
            rawMessage: null,
            rawType: null,
            room: roomJid,
            to: user1jid,
            type: "Message"
        });

        expect(eventTriggerShouldReturnFalse).to.not.be.ok;

        expect(
            megaChat.karere.joinChat
        ).to.have.been.called;

        expect(
            megaChat.karere.joinChat.getCall(0).args[0]
        ).to.equal(roomJid);

        expect(
            megaChat.karere.joinChat.getCall(0).args[1]
        ).to.equal("password");

        megaChat.chats[roomJid].show();

        // receive user list

        megaChat.karere._triggerEvent("UsersJoined", {
            "myOwn":false,
            "to": user1jid,
            "from": roomJid + "/" + Karere.getNicknameFromJid(user1jid) + "resource",
            "id":null,
            "roomJid":roomJid,
            "currentUsers":{},
            "newUsers":users
        });

        megaChat.karere.setMeta('rooms', roomJid, 'users', users);

        users[user1jid] = "participant";

        megaChat.karere._triggerEvent("UsersJoined", {
            "myOwn":true,
            "to": user1jid,
            "from": roomJid + "/" + Karere.getNicknameFromJid(user1jid) + "resource",
            "id":null,
            "roomJid":roomJid,
            "currentUsers":users,
            "newUsers":users
        });
        megaChat.karere._triggerEvent("UsersUpdatedDone", {
            "myOwn":true,
            "to": user1jid,
            "from": roomJid + "/" + Karere.getNicknameFromJid(user1jid) + "resource",
            "id":null,
            "roomJid":roomJid,
            "currentUsers":users,
            "newUsers":users
        });


        expect(
            megaChat.karere.sendAction
        ).to.have.been.calledOnce;


        var testMessages = [
            {
                "from": user1jid,
                "message":"hopala2",
                "timestamp":100,
                "id":"2"
            },
            {
                "from": user1jid,
                "message":"hopala3",
                "timestamp":200,
                "id":"3"
            },
            {
                "from": user2jid,
                "message":"hopala1",
                "timestamp":50,
                "id":"1"
            },
            {
                "from": user1jid,
                "message":"hopala4",
                "timestamp":300,
                "id":"4"
            }
        ];

        megaChat.karere._triggerEvent("ActionMessage", {
            from: megaChat.karere.sendAction.getCall(0).args[0],
            id: "-870315190_1392060886769",
            karere: null,
            meta: {
                action: "syncResponse",
                inResponseTo: "123",
                messages: testMessages,
                offset: 0,
                roomJid: roomJid,
                total: testMessages.length
            },
            myOwn: false,
            rawMessage: null,
            rawType: "action",
            to: megaChat.karere.getJid(),
            type: "Message"
        });

        var messagesInOrderedList = [];
        $('.fm-chat-messages-block').each(function() {
            messagesInOrderedList.push({
                'ts': $(this).attr('data-timestamp'),
                'time': $('.fm-chat-message-time', $(this)).text(),
                'msg': $('.fm-chat-message', $(this)).text(),
                'name': $('.fm-chat-username', $(this)).text()
            });
        });

        //XX: maybe generate dynamic time and name fields for the reference values?
        expect(messagesInOrderedList).to.eql([
            {
                "ts": "50",
                "time": "2:0.50",
                "msg": "hopala1",
                "name": "lp@mega.co.nz"
            },
            {
                "ts": "100",
                "time": "2:1.40",
                "msg": "hopala2",
                "name": "lpetrov@me.com"
            },
            {
                "ts": "200",
                "time": "2:3.20",
                "msg": "hopala3",
                "name": "lpetrov@me.com"
            },
            {
                "ts": "300",
                "time": "2:5.0",
                "msg": "hopala4",
                "name": "lpetrov@me.com"
            }
        ]);


        done();
    });
});


// TODO: Presence sync (using fake events)
// TODO: Add checks for the propper attrs set on dom elements (e.g. $('#treesub_contacts li a[data-room-jid="' + self.roomJid + '"]'))
// TODO: verify unread