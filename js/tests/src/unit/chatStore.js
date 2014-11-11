describe("ChatStore plugin Unit Test", function() {
    var chatStore;
    var megaChatDummyInstance;
    var megaDataMocker;
    var MegaChatDummy = function() {
        this.options = {
            'chatStoreOptions': {
                'autoPurgeMaxMessagesPerRoom': 3
            }
        };
    };

    makeObservable(MegaChatDummy);

    beforeEach(function(done) {
        asmCrypto.random.seed(new Uint32Array( [ unixtime() ] ));

        window.u_handle = "A_1234567890";
        window.u_privk = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100'));

        megaDataMocker = new MegaDataMocker();

        megaChatDummyInstance = new MegaChatDummy();
        sinon.spy(megaChatDummyInstance, 'bind');
        sinon.spy(megaChatDummyInstance, 'unbind');
        sinon.spy(megaChatDummyInstance, 'trigger');
        sinon.spy(megaChatDummyInstance, 'on');


        chatStore = new ChatStore(megaChatDummyInstance);

        sinon.spy(chatStore.db, 'add');
        sinon.spy(chatStore.db, 'query');
        sinon.spy(chatStore.db, 'removeBy');

        megaChatDummyInstance.trigger('onInit');

        if(chatStore.cleanupInterval) {
            clearInterval(chatStore.cleanupInterval);
        }

        createTimeoutPromise(function() {
            return chatStore.db.dbState == MegaDB.DB_STATE.INITIALIZED;
        }, 100, 1000)
            .done(function() {
                done();
            })
            .fail(function() {
                assert(false, 'could not initialize db');
            })
    });


    afterEach(function(done) {
        if(chatStore.cleanupInterval) {
            clearInterval(chatStore.cleanupInterval);
        }

        chatStore.db.drop()
            .done(function() {
                indexedDB.deleteDatabase("mdb_megaChat_" + window.u_handle);
                megaDataMocker.restore();
                delete chatStore;
                delete megaChatDummyInstance;
                done();
            });
    });


    it("init", function(done) {
        expect(megaChatDummyInstance.bind.callCount).to.eql(6);
        expect(megaChatDummyInstance.unbind.callCount).to.eql(6);
        expect(chatStore instanceof ChatStore).to.be.ok;
        expect(chatStore.db instanceof MegaDB).to.be.ok;
        expect(chatStore.cleanupInterval > 0).to.be.ok;

        done();
    });

    it("onRoomCreated", function(done) {
        var room = getMegaRoom();

        megaChatDummyInstance.trigger('onRoomCreated', [room]);

        // async op ^^, will take some time to open the indexedDB and execute
        setTimeout(function() {
            expect(chatStore.db.query.callCount).to.eql(5);
            expect(chatStore.db.add.callCount).to.eql(1);

            done();
        }, 10);
    });

    it("onQueueMessage", function(done) {
        var room = getMegaRoom();

        megaChatDummyInstance.trigger('onRoomCreated', [room]);
        var msg;
        for(var i = 0; i < 10; i++) {
            msg = getOutgoingMessage();
            megaChatDummyInstance.trigger('onQueueMessage', [msg, room]);
        }


        // async op ^^, will take some time to open the indexedDB and execute
        setTimeout(function() {
            // try to duplicate the same msg twice:
            megaChatDummyInstance.trigger('onQueueMessage', [msg, room]);

            setTimeout(function() {
                expect(chatStore.db.query.callCount).to.eql(16);
                /* 10 messages + 1 dup + 5 init queries */
                expect(chatStore.db.add.callCount).to.eql(11);
                /* 1 add conversation + 10 messages */

                done();
            }, 150);
        }, 100);
    });

    it("cleanup - 1", function(done) {
        var room = getMegaRoom();
        room.encryptionHandler = {askeMember:{}};

        megaChatDummyInstance.trigger('onRoomCreated', [room]);
        var msg;
        for(var i = 0; i < 10; i++) {
            msg = getIncomingMessage();
            megaChatDummyInstance.trigger('onBeforeRenderMessage', [
                {'message': msg, 'room': room, 'sessionId': "sess_" + i % 3}
            ]);
        }



        // async op ^^, will take some time to open the indexedDB and execute
        setTimeout(function() {
            chatStore.cleanup();

            setTimeout(function() {
                chatStore.db.query('chatMessages')
                    .filter('roomJid', msg.roomJid)
                    .execute()
                    .done(function(r) {
                        expect(r.length).to.eql(3);
                        done();
                    })
                    .fail(function(r) {
                        assert(false, 'failed: ' + r);
                    })
            }, 400);
        }, 150);
    });

    it("cleanup - 2", function(done) {
        var room = getMegaRoom();
        room.encryptionHandler = {askeMember:{}};

        megaChatDummyInstance.trigger('onRoomCreated', [room]);
        var msg;
        for(var i = 0; i < 10; i++) {
            msg = getIncomingMessage();
            megaChatDummyInstance.trigger('onBeforeRenderMessage', [
                {'message': msg, 'room': room, 'sessionId': "sess_" + i % 2}
            ]);
        }

        setTimeout(function() {
            chatStore.cleanup();

            setTimeout(function() {
                chatStore.db.query('chatMessages')
                    .filter('roomJid', msg.roomJid)
                    .execute()
                    .done(function(r) {
                        expect(r.length).to.eql(0); // all removed, since they were in the same session

                        done();
                    })
                    .fail(function(r) {
                        assert(false, 'failed: ' + r);
                    })
            }, 400);
        }, 150);
    });

});