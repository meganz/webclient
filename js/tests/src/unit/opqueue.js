describe("OpQueue Unit Test", function() {

    var ctx;
    var ctxMocker;
    var mockOpQueue = function(opQueue) {
        var _mocker = new ObjectMocker(opQueue, {
            'retry': function() {},
            'validateFn': opQueue.validateFn,
            'recoverFailFn': opQueue.recoverFailFn
        });

        clearTimeout(opQueue.tickTimer);

        // expose for unit tests
        opQueue.restore = function() {
            _mocker.restore();
        };
    };

    beforeEach(function(done) {
        ctx = new (function() {
            this.shouldValidate = true;
        })();


        ctxMocker = new ObjectMocker(ctx, {
            'sampleOp1': function(arg1) {},
            'sampleOp2': function(arg1, arg2) {}
        });



        done();
    });


    afterEach(function(done) {

        ctxMocker.restore();
        ctxMocker = ctx = null;

        done();
    });

    it("can validate, queue, pop, pop group, retry and retry reset", function(done) {


        var validateFn = function(opQueue, op) {
            return opQueue.ctx.shouldValidate;
        };

        var recoverFailFn = function(ctx) {
            return ctx.shouldValidate;
        };

        var megaRoom = {};
        var opQueue = new OpQueue(ctx, megaRoom, validateFn, recoverFailFn);
        mockOpQueue(opQueue);

        ctx.shouldValidate = true;

        opQueue.queue('sampleOp1', 'call1');
        opQueue.queue('sampleOp1', 'call2');

        opQueue.pop();

        expect(opQueue.ctx.sampleOp1.callCount).to.eql(2);
        expect(opQueue.ctx.sampleOp2.callCount).to.eql(0);


        expect(opQueue.ctx.sampleOp1.calledWith('call3')).not.to.be.ok;
        expect(opQueue.ctx.sampleOp1.calledWith('call1')).to.be.ok;
        expect(opQueue.ctx.sampleOp1.calledWith('call2')).to.be.ok;
        expect(opQueue._queue.length).to.eql(0);

        ctx.shouldValidate = false;

        opQueue.queue('sampleOp2', 'call3');
        opQueue.pop(); // should halt

        expect(opQueue.ctx.sampleOp1.callCount).to.eql(2);
        expect(opQueue.ctx.sampleOp2.callCount).to.eql(0);

        expect(opQueue.retry.callCount).to.eql(2);
        expect(opQueue.recoverFailFn.callCount).to.eql(0);

        ctx.shouldValidate = true;

        opQueue.pop(); // should resume

        expect(opQueue.ctx.sampleOp1.callCount).to.eql(2);
        expect(opQueue.ctx.sampleOp2.callCount).to.eql(1);

        expect(opQueue.ctx.sampleOp2.calledWith('call3')).to.be.ok;
        expect(opQueue._queue.length).to.eql(0);


        // test grouping
        ctx.shouldValidate = false;
        opQueue.queue('sampleOp2', ['call4']);
        opQueue.queue('sampleOp2', ['call5']);
        opQueue.queue('sampleOp2', ['call6']);

        expect(opQueue._queue.length).to.eql(3);

        ctx.shouldValidate = true; // resume execution
        opQueue.pop(); // should group calls

        //opQueue.ctx.sampleOp2.getCall(1).args

        expect(opQueue.ctx.sampleOp2.callCount).to.eql(2);

        expect(opQueue.ctx.sampleOp2.getCall(1).args.length).to.be.gte(3);
        expect(opQueue.ctx.sampleOp2.getCall(1).args[0]).to.eql(['call4', 'call5', 'call6']);
        expect(opQueue._queue.length).to.eql(0);


        // recover fn
        ctx.shouldValidate = false; // resume execution
        opQueue.queue('sampleOp1', 'whatever');
        for(var i = 0; i <= opQueue.MAX_ERROR_RETRIES; i++) {
            opQueue.pop();
        }
        expect(opQueue.recoverFailFn.callCount).to.eql(1);
        expect(opQueue.ctx.sampleOp1.callCount).to.eql(2); // not called

        ctx.shouldValidate = true;
        opQueue.pop();

        expect(opQueue.ctx.sampleOp1.callCount).to.eql(3); // called

        done();
    });
    it("545 - preparation before processing ops (processMessage)", function(done) {
        var validateFn = function(opQueue, op) {
            return opQueue.ctx.shouldValidate;
        };

        var recoverFailFn = function(ctx) {
            // do nothing
        };

        ctx.processMessage = function() {};
        sinon.spy(ctx, 'processMessage');



        var megaRoom = {};
        var opQueue = new OpQueue(ctx, megaRoom, validateFn, recoverFailFn);
        mockOpQueue(opQueue);

        ctx.shouldValidate = true;

        var mdMocker = new MegaDataMocker();

        megaRoom.megaChat = {
            'getContactFromJid': Chat.prototype.getContactFromJid,
            'getJidFromNodeId': Chat.prototype.getJidFromNodeId,
            'options': {
                'xmppDomain': "developers.mega.co.nz"
            }
        };


        expect(opQueue.ctx.processMessage.callCount).to.eql(0);

        opQueue.queue('processMessage', {
            'from': megaChat.getJidFromNodeId(Object.keys(M.u)[0]),
            'toJid': megaChat.getJidFromNodeId(Object.keys(M.u)[1])
        });

        expect(opQueue.$waitPreprocessing.state()).to.eql("resolved");

        expect(opQueue.ctx.processMessage.callCount).to.eql(1);
        expect(crypt.getPubEd25519.callCount).to.eql(2);

        // -> lets try failing, this should remove the 'processMessage' from the queue.

        crypt.getPubEd25519.restore();
        // lets make getPubEd return error
        sinon.stub(crypt, 'getPubEd25519', function(u_h, cb) {
            cb(false)
        });

        opQueue.queue('processMessage', {
            'from': megaChat.getJidFromNodeId(Object.keys(M.u)[0]),
            'toJid': megaChat.getJidFromNodeId(Object.keys(M.u)[1])
        });

        expect(opQueue.$waitPreprocessing.state()).to.eql("rejected");

        opQueue.queue('sampleOp1', 'args1');
        // 'sampleOp1' should NOT be executed, because 'processMessage' had blocked the queue from processing next ops
        expect(opQueue.ctx.sampleOp1.callCount).to.eql(0);
        expect(crypt.getPubEd25519.callCount).to.eql(4);

        crypt.getPubEd25519.restore();
        // make getPubEd work again
        sinon.stub(crypt, 'getPubEd25519', function(u_h, cb) {
            cb('key')
        });
        opQueue.pop();

        expect(opQueue.$waitPreprocessing).to.eql(true);

        expect(crypt.getPubEd25519.callCount).to.eql(2);
        expect(opQueue.ctx.sampleOp1.callCount).to.eql(1);

        mdMocker.restore();

        done();
    });
});
