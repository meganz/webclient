describe("Fakebroadcaster Unit Test", function() {
    localStorage.fakeBroadcasterWatchdogDebug = 1;

    var replyToQuery = function(watchdog, token, query, value) {
        watchdog.notify('Q!Rep!y', {
            query: query,
            token: token,
            value: value
        });
    };


    /** @var {PromiseHelpers} **/
    var ph;

    beforeEach(function(done) {
        ph = new PromiseHelpers();
        mStub(window, 'u_handle', 'Rmen0mUCyuk');
        done();
    });


    afterEach(function(done) {
        ph.destroy();
        mStub.restore();
        done();
    });

    it("3 tabs (owner and two actors) are properly set up", function(done) {
        var tab1 = CreateNewFakeBroadcaster("tab1");
        var tab2 = CreateNewFakeBroadcaster("tab2");
        var tab3 = CreateNewFakeBroadcaster("tab3");
        var connector = new FakeBroadcastersConnector();
        connector.addTab(tab1);
        connector.addTab(tab2);
        connector.addTab(tab3);
        connector.takeOwnership(tab1);

        expect(connector.owner).to.equal(tab1.id);

        expect(tab1.crossTab.owner).to.equal(tab1.id);
        expect(JSON.stringify(tab1.crossTab.actors)).to.eql(JSON.stringify([tab2.id, tab3.id]));

        expect(tab2.crossTab.owner).to.equal(undefined);
        expect(JSON.stringify(tab2.crossTab.actors)).to.eql(JSON.stringify([]));

        expect(tab3.crossTab.owner).to.equal(undefined);
        expect(JSON.stringify(tab3.crossTab.actors)).to.eql(JSON.stringify([]));

        done();
    });


    it("3 tabs (owner and an actor) can communicate (notify) with each other", function(done) {
        var tab1 = CreateNewFakeBroadcaster("tab1");
        var tab2 = CreateNewFakeBroadcaster("tab2");
        var tab3 = CreateNewFakeBroadcaster("tab3");
        var connector = new FakeBroadcastersConnector();
        connector.addTab(tab1);
        connector.addTab(tab2);
        connector.addTab(tab3);
        connector.takeOwnership(tab1);

        expect(connector.owner).to.equal(tab1.id);

        // tab2 -> tab1
        var eventHandlerCalled = false;
        var listener1 = tab1.addListener("watchdog:hello", function(args) {
            eventHandlerCalled = true;
            assert(args.data.hello == "world", 'event handler received invalid data.');
            assert(args.origin == "tab2", 'invalid origin.');
        });
        tab2.watchdog.notify("hello", {"hello": "world"});
        assert(eventHandlerCalled, 'eventHandler "hello" was not called!');
        tab1.removeListener(listener1);

        // tab1 -> tab2
        var eventHandlerCalled2 = false;
        var listener2 = tab2.addListener("watchdog:hello", function(args) {
            eventHandlerCalled2 = true;
            assert(args.data.hello == "world2", 'event handler received invalid data.');
            assert(args.origin == "tab1", 'invalid origin.');
        });
        tab1.watchdog.notify("hello", {"hello": "world2"});
        assert(eventHandlerCalled2, 'eventHandler "hello" was not called!');
        tab2.removeListener(listener2);

        // tab3 -> tab1
        eventHandlerCalled = false;
        var listener3 = tab1.addListener("watchdog:hello", function(args) {
            eventHandlerCalled = true;
            assert(args.data.hello == "world3", 'event handler received invalid data.');
            assert(args.origin == "tab3", 'invalid origin.');
        });
        tab3.watchdog.notify("hello", {"hello": "world3"});
        assert(eventHandlerCalled, 'eventHandler "hello" was not called!');
        tab1.removeListener(listener3);

        done();
    });

    it("2 tabs (owner and an actor) can query each other", function(done) {
        var tab1 = CreateNewFakeBroadcaster("tab1");
        var tab2 = CreateNewFakeBroadcaster("tab2");
        var connector = new FakeBroadcastersConnector();
        connector.addTab(tab1);
        connector.addTab(tab2);
        connector.takeOwnership(tab1);

        // tab2 -> tab1
        tab1.addListener("watchdog:Q!hellothere", function(args) {
            var token = args.data.reply;

            replyToQuery(tab1.watchdog, token, "Q!hellothere", "hi!");
            assert(args.origin == "tab2", 'invalid origin.');
        });


        var result = tab2.watchdog.query("hellothere", {"hello": "world"});
        ph.expectPromiseToBeResolved(result, ["hi!"], 'hello there query');


        // tab 1 -> tab2
        tab2.addListener("watchdog:Q!hellothereFromOwner", function(args) {
            var token = args.data.reply;
            replyToQuery(tab2.watchdog, token, "Q!hellothereFromOwner", "hi owner!");
            assert(args.origin == "tab1", 'invalid origin.');
        });


        var result2 = tab1.watchdog.query("hellothereFromOwner", {"hello": "world"});
        ph.expectPromiseToBeResolved(result2, ["hi owner!"], 'hello there query from owner');

        ph.testWaitForAllPromises(done);
    });
});
