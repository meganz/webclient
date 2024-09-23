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
                this.linkInfo.getInfo()
                    .then((res) => {
                        if (res.mr) {
                            $('p', $overlay).text(`${l.mobile_meeting_link_tip} ${l.free_plan_bonus_info}`);
                        }
                        if (res.topic) {
                            $('h2.topic', $overlay).safeHTML(megaChat.html(res.topic) || '');
                        }
                        if (res.ncm) {
                            $('.members', $overlay).text(mega.icu.format(l[20233], res.ncm));
                        }
                    })
                    .catch(dump);
            });

        // Hide loader together with other desktop preview block
        $('.chat-links-preview', '.fmholder').addClass('hidden');

        // Show the overlay
        $overlay.removeClass('hidden');
    }
};
