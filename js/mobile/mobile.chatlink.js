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

        $('.chatlink-mobile-body i', $overlay).rebind('click.home', () => {
            window.location = "/";
            return false;
        });


        $('.btn-download-mega', $overlay).rebind('click.appdld', () => {
            window.location = getMobileStoreLink();
            return false;
        });

        // Get the <strong>MEGA</strong> mobile app now.
        $('.chatlink-red-row > span', $overlay).html(
            htmlentities(l[20620]).replace("[S]", "<strong>").replace("[/S]", "</strong>")
        );

        // On click/tap
        $('a', $overlay).rebind('tap', () => {
            $(this).off().addClass('disabled');

            // Start the download
            return goToMobileApp(`chat/${publicHandle}#${chatKey}`);
        });

        this.linkInfo = new LinkInfoHelper(
            publicHandle,
            chatKey,
            false,
            true
        );

        init_chat(0x104DF11E5)
            .always(() => {
                this.retrieved = this.linkInfo.getInfo();
                this.retrieved.done((result) => {

                    if (result.mr) {
                        $('p', $overlay)
                            .text(
                                'Install MEGA app to start a meeting. '
                                + 'Receive 20 GB of secure and private cloud storage for free.'
                            );
                    }
                    if (result.topic) {
                        const topic = megaChat.plugins.emoticonsFilter
                            .processHtmlMessage(htmlentities(result.topic || ""));
                        $('h2.topic', $overlay).safeHTML(topic);
                    }
                    if (result.ncm) {
                        $('.members', $overlay).text(l[20233].replace("%s", result.ncm));
                    }
                })
            });

        // Show the overlay
        $overlay.removeClass('hidden');
    }
};
