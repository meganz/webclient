describe("Chat Filters", function() {

    var fixtureManager = new Fixtures("./src/unit/fixtures/chat/");

    var km, em;

    beforeEach(function(done) {
        fixtureManager.get("templates.html")
            .done(function(filename, contents) {
                var $container = $(contents);
                $(document.body).append($container);

                window.km = km = new KarereMocker(megaChat.karere);
                window.em = em = new EventMocker(km);


                megaChat.init();
                done();
            });
    });

    afterEach(function(done) {
        megaChat.destroy()
            .then(done);
    });

    it("Emoticons and Urls test", function(done) {
        $.each([
            'hey :)',
            ':) hey',
            ':)'
        ], function(k, validEmoticonStr) {
            var messageData = new KarereEventObjects.IncomingMessage(
                "to@jid.com/res1",
                "from@jid.com/res1",
                "Message",
                "groupchat",
                "123",
                undefined,
                "room@jid.com",
                {},
                validEmoticonStr
            );
            megaChat.trigger("onReceiveMessage", messageData);

            expect(messageData.messageHtml).not.to.be.empty;
            expect(messageData.messageHtml).to.contain("<span");
        });

        $.each([
            'hey:)',
            ':)hey',
            ':)!'
        ], function(k, invalidEmoticonStr) {
            var messageData = new KarereEventObjects.IncomingMessage(
                "to@jid.com/res1",
                "from@jid.com/res1",
                "Message",
                "groupchat",
                "123",
                undefined,
                "room@jid.com",
                {},
                invalidEmoticonStr
            );
            megaChat.trigger("onReceiveMessage", messageData);

            expect(messageData.messageHtml).not.to.be.empty;
            expect(messageData.messageHtml).not.to.contain("<span");
        });


        // valid url
        var messageData = new KarereEventObjects.IncomingMessage(
            "to@jid.com/res1",
            "from@jid.com/res1",
            "Message",
            "groupchat",
            "123",
            undefined,
            "room@jid.com",
            {},
            'hello www.mega.co.nz'
        )
        megaChat.trigger("onReceiveMessage", messageData);

        expect(messageData.messageHtml).not.to.be.empty;
        expect(messageData.messageHtml).to.contain("<a ");

        // invalid url
        var messageData = new KarereEventObjects.IncomingMessage(
            "to@jid.com/res1",
            "from@jid.com/res1",
            "Message",
            "groupchat",
            "123",
            undefined,
            "room@jid.com",
            {},
            'this.is.a.test'
        );
        megaChat.trigger("onReceiveMessage", messageData);

        expect(messageData.messageHtml).not.to.be.empty;
        expect(messageData.messageHtml).not.to.contain("<a ");

        done();
    });
});
