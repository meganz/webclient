/**
 * Shows a preview of a chat link
 */
mobile.chatlink = {

    /**
     * Initialise and show the overlay
     * @param {String} publicHandle The public chat link handle
     * @param {String} chatKey chat's key
     */
    show: function(publicHandle, chatKey) {

        'use strict';

        var $overlay = $('.mobile.chat-links-preview');

        $('.chatlink-mobile-header a, .chatlink-mobile-header', $overlay).rebind('click.home', function(e) {
            window.location = "/";
            return false;
        });


        $('.chatlink-red-row', $overlay).rebind('click.appdld', function() {
            window.location = getMobileStoreLink();
            return false;
        });

        // Get the <strong>MEGA</strong> mobile app now.
        $('.chatlink-red-row > span', $overlay).html(
            htmlentities(l[20620]).replace("[S]", "<strong>").replace("[/S]", "</strong>")
        );

        // On click/tap
        $('.chatlink-contents a', $overlay).rebind('tap', function() {

            // Start the download
            goToMobileApp('chat/' + publicHandle + '#' + chatKey);

            // Prevent default anchor link behaviour
            return false;
        });


        this.linkInfo = new LinkInfoHelper(
            publicHandle,
            chatKey,
            false,
            true
        );

        anonymouschat = true;
        if (!u_handle) {
            u_handle = "AAAAAAAAAAA";
        }

        var self = this;
        init_chat(0x104DF11E5)
            .always(function() {
                self.retrieved = self.linkInfo.getInfo();
                self.retrieved.done(function(result) {
                    if (result.topic) {
                        var topic = megaChat.plugins.emoticonsFilter.processHtmlMessage(htmlentities(result.topic || ""));
                        $('h3', $overlay).html(topic);
                    }
                    if (result.ncm) {
                        $('h5', $overlay).text(l[20233].replace("%s", result.ncm));
                    }
                })
            });

        // Show the overlay
        $overlay.removeClass('hidden');
    }
};
