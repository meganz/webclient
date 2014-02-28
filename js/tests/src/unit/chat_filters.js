describe("Chat Filters", function() {

    var fixtureManager = new Fixtures("./src/unit/fixtures/chat/");

    beforeEach(function(done) {
        fixtureManager.get("templates.html")
            .done(function(filename, contents) {
                var $container = $(contents);
                $(document.body).append($container);

                karereMocker = new KarereMocker(megaChat.karere);

                window.km = karereMocker;

                megaChat.init();
                done();
            });
    });

    afterEach(function(done) {
        megaChat.destroy()
            .then(done);
    });

    it("Emoticons, Urls and Capslock filter test", function(done) {
        $.each([
            'hey :)',
            ':) hey',
            ':)'
        ], function(k, validEmoticonStr) {
            var messageData = {
                'message': validEmoticonStr
            };
            megaChat.trigger("onReceiveMessage", messageData);

            expect(messageData.messageHtml).not.to.be.empty;
            expect(messageData.messageHtml).to.contain("<span");
        });

        $.each([
            'hey:)',
            ':)hey',
            ':)!'
        ], function(k, invalidEmoticonStr) {
            var messageData = {
                'message': invalidEmoticonStr
            };
            megaChat.trigger("onReceiveMessage", messageData);

            expect(messageData.messageHtml).not.to.be.empty;
            expect(messageData.messageHtml).not.to.contain("<span");
        });



        // capslock test1
        var messageData = {
            'message': 'hey'
        };
        megaChat.trigger("onSendMessage", messageData);

        expect(messageData.message).not.to.be.empty;
        expect(messageData.message).to.equal("HEY");

        // capslock test2
        var messageData = {
            'message': 'hey'
        };
        megaChat.trigger("onQueueMessage", messageData);

        expect(messageData.message).not.to.be.empty;
        expect(messageData.message).to.equal("HEY");


        // valid url
        var messageData = {
            'message': 'hello www.mega.co.nz'
        };
        megaChat.trigger("onReceiveMessage", messageData);

        expect(messageData.messageHtml).not.to.be.empty;
        expect(messageData.messageHtml).to.contain("<a ");

        // invalid url
        var messageData = {
            'message': 'this.is.a.test'
        };
        megaChat.trigger("onReceiveMessage", messageData);

        expect(messageData.messageHtml).not.to.be.empty;
        expect(messageData.messageHtml).not.to.contain("<a ");

        done();
    });
});
