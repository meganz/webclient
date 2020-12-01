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

        if (is_ios && window.location.toString().indexOf("?didtap") > -1) {
            window.top.location = mobile.downloadOverlay.getStoreLink();
            return;
        }

        var $overlay = $('.mobile.chat-links-preview');

        $('.chatlink-mobile-header a, .chatlink-mobile-header', $overlay).rebind('click.home', function(e) {
            window.location = "/";
            return false;
        });


        $('.chatlink-red-row', $overlay).rebind('click.appdld', function() {
            window.location = mobile.downloadOverlay.getStoreLink();
            return false;
        });

        // Get the <strong>MEGA</strong> mobile app now.
        $('.chatlink-red-row > span', $overlay).html(
            htmlentities(l[20620]).replace("[S]", "<strong>").replace("[/S]", "</strong>")
        );

        $('.chatlink-contents a', $overlay).attr('href',
            "mega://" + getSitePath().substr(1) + window.location.hash
        );

        // On click/tap
        $('.chatlink-contents a', $overlay).off('tap').on('tap', function() {

            // Start the download
            mobile.chatlink.redirectToApp($(this), publicHandle, chatKey);

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
    },
    redirectToApp: function($selector, handle, key) {

        'use strict';

        var redirectToStore = function() {
            window.top.location = mobile.downloadOverlay.getStoreLink();
        };

        if (window.location.toString().indexOf("?didtap") > -1) {
            redirectToStore();
            return false;
        }

        var redirectLink = "chat/" + handle + "#" + key;

        // If iOS (iPhone, iPad, iPod), use method based off https://github.com/prabeengiri/DeepLinkingToNativeApp/
        if (is_ios || localStorage.testOpenInApp === 'ios') {

            var ns = '.ios ';
            var appLink = 'https://' + window.location.host + '/' + redirectLink + "?didtap";
            var events = ['pagehide', 'blur', 'beforeunload'];
            var timeout = null;

            var preventDialog = function() {
                clearTimeout(timeout);
                timeout = null;
                $(window).off(events.join(ns) + ns);
            };


            var redirect = function() {
                var ms = 500;

                preventDialog();
                $(window).rebind(events.join(ns) + ns, preventDialog);

                window.location = appLink;

                // Starting with iOS 9.x, there will be a confirmation dialog asking whether we want to
                // open the app, which turns the setTimeout trick useless because no page unloading is
                // notified and users redirected to the app-store regardless if the app is installed.
                // Hence, as a mean to not remove the redirection we'll increase the timeout value, so
                // that users with the app installed will have a higher chance of confirming the dialog.
                // If past that time they didn't, we'll redirect them anyhow which isn't ideal but
                // otherwise users will the app NOT installed might don't know where the app is,
                // at least if they disabled the smart-app-banner...
                // NB: Chrome (CriOS) is not affected.
                if (is_ios > 8 && ua.details.brand !== 'CriOS') {
                    ms = 4100;
                }

                timeout = setTimeout(redirectToStore, ms);
            };

            Soon(function() {
                // If user navigates back to browser and clicks the button,
                // try redirecting again.
                $selector.rebind('click', function(e) {
                    e.preventDefault();
                    redirect();
                    return false;
                });
            });
            redirect();
        }

        // Otherwise if Windows Phone
        else if (ua.details.os === 'Windows Phone' || localStorage.testOpenInApp === 'winphone') {
            window.location = 'mega://' + redirectLink;
        }

        // Otherwise if Android
        else if (ua.indexOf('android') > -1 || localStorage.testOpenInApp === 'android') {
            var intent = 'intent://' + redirectLink + '/#Intent;scheme=mega;package=mega.privacy.android.app;end';
            document.location = intent;
        }
        else {
            // Otherwise show an error saying the device is unsupported
            alert('This device is unsupported.');
        }

        return false;
    }
};
