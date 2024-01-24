class MegaMobilePromoBanner extends MegaMobileOverlay {

    constructor(options) {
        options.wrapperClassname = 'promo-banner';

        super(options);

        this.addTitle(l.mobile_promo_banner_title);
        this.showClose = false;
        this.addImage('sprite-mobile-fm-uni icon-mega-logo-rounded-square');

        const advantageOne = {
            icon: 'icon-download-thin',
            headingText: l.mobile_promo_banner_download_heading,
            bodyText: l.mobile_promo_banner_download_body
        };

        const advantageTwo = {
            icon: 'icon-camera-plus-thin-outline',
            headingText: l.mobile_promo_banner_camera_heading,
            bodyText: l.mobile_promo_banner_camera_body
        };
        const advantageThree = {
            icon: 'icon-message-chat-circle',
            headingText: l.mobile_promo_banner_chat_heading,
            bodyText: l.mobile_promo_banner_chat_body
        };

        this.buildAdvantages([advantageOne,advantageTwo,advantageThree]);

        const openInAppBtn = new MegaMobileButton({
            parentNode: this.actionsNode,
            type: 'normal',
            componentClassname: `primary block`,
            text: l.open_in_app
        });

        openInAppBtn.rebind('tap.openInApp', () => {
            eventlog(folderlink ? 99906 : 99908);
            goToMobileApp(MegaMobileViewOverlay.getAppLink(folderlink || M.RootID));
        });

        const continueBtn = new MegaMobileButton({
            parentNode: this.actionsNode,
            type: 'normal',
            componentClassname: `secondary block`,
            text: l.mobile_promo_banner_continue_browser
        });

        continueBtn.rebind('tap.continue', () => {
            fmconfig.mobab = 1;
            eventlog(folderlink ? 99907 : 99909);
            this.hide();
            if (mega.flags.ab_ads) {
                mega.commercials.updateOverlays();
            }
        });
    }

    buildAdvantages(advantages) {
        for (const advantage of advantages) {
            const contentContainer = document.createElement('div');
            contentContainer.classList.add('advantage-container');
            const heading = document.createElement('h4');
            const body = document.createElement('p');
            const icon = document.createElement('i');

            heading.textContent = advantage.headingText;
            body.textContent = advantage.bodyText;
            icon.classList.add('sprite-mobile-fm-mono', advantage.icon);

            contentContainer.appendChild(icon);
            contentContainer.appendChild(heading);
            contentContainer.appendChild(body);

            this.addContent(contentContainer);
            this.contentNode.classList.remove('fm-scrolling');
            document.querySelector('.mega-promo-banner .main').classList.add('fm-scrolling');
        }
    }
}

mBroadcaster.once('fm:initialized', () => {
    'use strict';

    if (!mega.ui.promoBanner) {
        mega.ui.promoBanner = new MegaMobilePromoBanner({
            parentNode: document.body,
            componentClassname: 'mega-promo-banner'
        });
    }

    if (!fmconfig.mobab || folderlink) {
        mega.ui.promoBanner.show();
        if (mega.flags.ab_ads) {
            mega.commercials.updateOverlays('promo');
        }
    }
});
