var TESTING_KEYS = {};
TESTING_KEYS.ED25519_PRIV_KEY = atob('nWGxne/9WmC6hEr0kuwsxERJxWl7MmkZcDusAxyuf2A=');
TESTING_KEYS.ED25519_PUB_KEY = atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=');


TESTING_KEYS.STATIC_PUB_KEY_DIR = {
    'get': function(key) { return TESTING_KEYS.ED25519_PUB_KEY; }
};


describe("mpenc integration and regression tests", function() {
    var megaDataMocker;

    beforeEach(function(done) {
        megaDataMocker = new MegaDataMocker();
        localStorage.d = localStorage.dd = localStorage.stopOnAssertFail = 1;

        done();
    });


    afterEach(function(done) {
        megaDataMocker.restore();
        megaDataMocker = null;

        done();
    });

    /**
     * Helper funcs.
     */

    var genDummyProtocolHandlers = function(cnt) {
        var protocolHandlers = [];
        for(var i = 0; i<cnt; i++) {
            var ph = new mpenc.handler.ProtocolHandler(
                "member" + i,
                TESTING_KEYS.ED25519_PRIV_KEY,
                TESTING_KEYS.ED25519_PUB_KEY,
                TESTING_KEYS.STATIC_PUB_KEY_DIR,
                function(handler) {},
                function(handler) {}
            );
            ph.flushQueues = function() {
                protocolHandlers.forEach(function(v) {
                    while(v.protocolOutQueue.length > 0) {
                        var msg = v.protocolOutQueue.shift();
                        protocolHandlers.forEach(function(vv) {
                            if(vv == v) { return; }
                            if(msg.from == vv.id) { return; }
                            if(!vv.enabled) { return; }

                            try {
                                if (msg.to == vv.id) {
                                    vv.processMessage(msg);
                                    vv.flushQueues();
                                    return false;
                                } else if (msg.to == '') {
                                    vv.processMessage(msg);
                                    vv.flushQueues();
                                }
                            } catch(e) {
                                console.error(e);
                            }
                        });
                    }
                    while(v.uiQueue.length > 0) {
                        var msg = v.uiQueue.shift();
                        console.error(this.id, "uiQueue: ", msg)
                    }
                    while(v.messageOutQueue.length > 0) {
                        var msg = v.messageOutQueue.shift();
                        console.error(this.id, "messageOutQueue: ", msg)
                    }
                });
            };
            EncryptionFilter.debugEncryptionHandler(ph, "", {
                logger: new MegaLogger("ph:" + ph.id)
            });

            protocolHandlers.push(
                ph
            );
        }

        return protocolHandlers;
    };

    describe("Regression tests", function() {
        it("mpenc does not recovers properly in case of 5 users (3 active, 2 inactive) - use case 1", function(done) {
            var phs = genDummyProtocolHandlers(5);

            phs[0].enabled = phs[1].enabled = phs[2].enabled = true;

            phs[0].start(
                [
                    phs[1].id,
                    phs[2].id
                ]
            );

            phs[0].flushQueues();

            expect(phs[0].state).to.eql(mpenc.handler.STATE.INITIALISED);
            expect(phs[1].state).to.eql(mpenc.handler.STATE.INITIALISED);
            expect(phs[2].state).to.eql(mpenc.handler.STATE.INITIALISED);


            phs[1].enabled = phs[2].enabled = false; // mark as disabled, e.g. no messages will be processed

            phs[3].enabled = phs[4].enabled = true;

            phs[0].recover([
                phs[0].id /* i'm the only user left in the room */

            ]);

            phs[0].flushQueues();

            phs[0].join([
                phs[3].id,
                phs[4].id
            ]);

            phs[0].flushQueues();

            expect(phs[0].state).to.eql(mpenc.handler.STATE.INITIALISED);
            expect(phs[3].state).to.eql(mpenc.handler.STATE.INITIALISED);
            expect(phs[4].state).to.eql(mpenc.handler.STATE.INITIALISED);

            done();
        });

        it("mpenc does not recovers properly in case of 5 users (3 active, 2 inactive) - use case 2", function(done) {
            // stuck in AUX_DOWNFLOW state
            var phs = genDummyProtocolHandlers(5);

            phs[0].enabled = phs[1].enabled = phs[2].enabled = true;

            phs[0].start(
                [
                    phs[1].id,
                    phs[2].id
                ]
            );

            phs[0].flushQueues();

            expect(phs[0].state).to.eql(mpenc.handler.STATE.INITIALISED);
            expect(phs[1].state).to.eql(mpenc.handler.STATE.INITIALISED);
            expect(phs[2].state).to.eql(mpenc.handler.STATE.INITIALISED);


            phs[1].enabled = phs[2].enabled = false; // mark as disabled, e.g. no messages will be processed

            phs[3].enabled = phs[4].enabled = true;

            phs[0].recover();

            phs[0].flushQueues();

            phs[0].join([
                phs[3].id,
                phs[4].id
            ]);

            phs[0].flushQueues();

            expect(phs[0].state).to.eql(mpenc.handler.STATE.INITIALISED);
            expect(phs[3].state).to.eql(mpenc.handler.STATE.INITIALISED);
            expect(phs[4].state).to.eql(mpenc.handler.STATE.INITIALISED);

            done();
        });
    });
});
