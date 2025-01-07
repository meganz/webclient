/**
 * Shows a preview of a chat link
 */
mobile.chatlink = {

    /**
     * Initialise and show the overlay
     * @param {String} publicHandle The public chat link handle
     * @param {String} chatKey chat's key
     */
    async show(publicHandle, chatKey) {
        'use strict';
        const $overlay = $('.mobile.chat-links-preview');

        $('.chatlink-mobile-body i', $overlay).rebind('click.home', () => {
            window.location = "/";
            return false;
        });

        $('.btn-download-mega', $overlay).rebind('click.appdld', () => {
            window.location = getMobileStoreLink();
            return false;
        });

        // On click/tap
        $('a', $overlay).rebind('tap', () => {
            $(this).off().addClass('disabled');

            // Start the download
            return goToMobileApp(`chat/${publicHandle}#${chatKey}`);
        });
        let res = false;
        let blocked = is_chatlink === EBLOCKED;

        if (!blocked) {
            if (!self.LinkInfoHelper) {
                await init_chat(0x104DF11E5);
            }
            const linkInfo = new LinkInfoHelper(publicHandle, chatKey, false, true);

            // Retrieve link details.
            res = await linkInfo.getInfo();

            blocked = linkInfo.failed === EBLOCKED;
        }

        // Hide loader together with other desktop preview block
        $('.chat-links-preview', '.fmholder').addClass('hidden');

        // Show the overlay
        $overlay.removeClass('hidden');

        if (blocked) {
            return $('.chatlink-mobile-blocked', $overlay).removeClass('hidden');
        }

        $('.chatlink-mobile-preview', $overlay).removeClass('hidden');
        $('p', $overlay)
            .text(
                // `Install the MEGA app to join the meeting/chat`
                `${res.mr ? l.mobile_meeting_link_tip : l.mobile_chat_link_tip} ` +
                // `Get secure and private cloud storage for free.`
                `${l.free_plan_bonus_info}`
            );

        if (res.topic) {
            $('h2.topic', $overlay).safeHTML(megaChat.html(res.topic) || '');
        }

        if (res.ncm) {
            $('.members', $overlay).text(mega.icu.format(l[20233], res.ncm));
        }
    }
};
