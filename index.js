/**
 * global MegaData instance
 * @name M
 */
var M = null;
var dlid = false;
var dlkey = false;
var cn_url = false;
var init_l = true;
var pfkey = false;
var pfid = false;
var pfhandle = false;
var n_h = false;
var u_n = false;
var n_k_aes = false;
var fmdirid = false;
var u_type, cur_page, u_checked;
var confirmcode = false;
var confirmok = false;
var hash = window.location.hash;
var chrome_msg = false;
var init_anoupload = false;
var blogid = false;
var pwchangecode = false;
var resetpwcode = false;
var resetpwemail = '';
var mobileparsed = false;
var mobilekeygen = false;
var subdirid = false;
var subsubdirid = false;
var blogmonth = false;
var blogsearch = false;
var notifications;
var account = false;
var register_txt = false;
var login_next = false;
var loggedout = false;
var anonymouschat = false;
var flhashchange = false;
var folderLinkVisitLogged = false;
var avatars = {};
var mega_title = 'MEGA';
var pchandle = false;


var pro_json = '[[["N02zLAiWqRU",1,500,1024,1,"9.99","EUR"],["zqdkqTtOtGc",1,500,1024,12,"99.99","EUR"],["j-r9sea9qW4",2,2048,4096,1,"19.99","EUR"],["990PKO93JQU",2,2048,4096,12,"199.99","EUR"],["bG-i_SoVUd0",3,4096,8182,1,"29.99","EUR"],["e4dkakbTRWQ",3,4096,8182,12,"299.99","EUR"]]]';

pages['placeholder'] = '<div class="bottom-page scroll-block placeholder">' +
    '((TOP))' +
    '<div class="main-pad-block">' +
    '<div class="main-mid-pad new-bottom-pages"></div>' +
    '</div>';

mBroadcaster.once('startMega', function() {
    'use strict';

    if (is_mobile) {
        pages.placeholder = pages.mobile || '';
    }

    if (pages['dialogs-common']) {
        $('body').safeAppend(translate(pages['dialogs-common'].replace(/{staticpath}/g, staticpath)));
        delete pages['dialogs-common'];
    }

    if (!hashLogic) {
        $(window).rebind('popstate.mega', function(event) {
            var state = event.originalEvent.state || {};
            var add = '';
            if (state.searchString) {
                add = state.searchString;
            }
            loadSubPage((state.subpage || state.fmpage || location.hash) + add, event);
        });
    }
});

mBroadcaster.once('startMega:desktop', function() {
    'use strict';

    var $body = $('body');
    var p = ['chat', 'onboarding', 'dialogs'];

    for (var i = p.length; i--;) {
        if (typeof pages[p[i]] === 'string') {
            $body.safeAppend(translate(pages[p[i]].replace(/{staticpath}/g, staticpath)));
            delete pages[p[i]];
        }
    }
});

function startMega() {
    'use strict';

    jsl = [];
    mBroadcaster.sendMessage('startMega');

    if (is_mobile) {
        mBroadcaster.sendMessage('startMega:mobile');
        mBroadcaster.removeListeners('startMega:desktop');
    }
    else {
        mBroadcaster.sendMessage('startMega:desktop');
        mBroadcaster.removeListeners('startMega:mobile');
    }

    if (silent_loading) {
        onIdle(silent_loading);
        silent_loading = false;
    }
    else {
        init_page();
    }
}

function topMenu(close) {

    if (close) {
        $.topMenu = '';
        $('.top-icon.menu').removeClass('active');
        $('.top-menu-popup').addClass('hidden');

        // If on mobile, hide the menu and also remove the close click/tap handler on the dark background overlay
        if (is_mobile) {
            $('html').removeClass('overlayed');
            $('.mobile.dark-overlay').addClass('hidden').removeClass('active').off('tap');
        }
        $(window).off('resize.topmenu');
    }
    else {
        $.topMenu = 'topmenu';
        $('.top-icon.menu').addClass('active');
        $('.top-menu-popup').removeClass('hidden');

        if (!is_mobile) {
            topMenuScroll();
            $(window).rebind('resize.topmenu', function () {
                if ($('.top-icon.menu').hasClass('active')) {
                    topMenuScroll();
                }
            });
        }
        else {
            // Mobile
            // Close the title menu
            mobile.titleMenu.close();

            // Show the dark backround overlay behind the menu and if it's clicked, close the menu
            $('html').addClass('overlayed');
            $('.mobile.dark-overlay').removeClass('hidden').addClass('active').off('tap').on('tap', function () {
                topMenu(true);
                return false;
            });
        }
    }
}

function topMenuScroll() {
    $('.top-menu-scroll').jScrollPane({
        enableKeyboardNavigation: false,
        showArrows: true,
        arrowSize: 5,
        animateScroll: true
    });
}

function scrollMenu() {
    "use strict";

    $('.bottom-pages .fmholder').rebind('scroll.devmenu', function () {
        if (page === 'doc' || page === 'cpage' || page === 'sdk' || page === 'dev') {
            var $menu = $('.new-left-menu-block');
            var topPos = $(this).scrollTop();
            if (topPos > 0) {
                if (topPos + $menu.outerHeight() + 106 <= $('.main-mid-pad').outerHeight()) {
                    $menu.css('top', topPos + 50 + 'px').addClass('floating');
                }
                else {
                    $menu.removeClass('floating');
                }
            }
            else {
                $menu.removeAttr('style');
            }
        }
    });
}

function topPopupAlign(button, popup, topPos) {
    $.popupAlign = function () {
        var $button = $(button),
            $popup = $(popup),
            $popupArrow = $popup.children('.dropdown-white-arrow'),
            pageWidth,
            popupRightPos,
            arrowRightPos,
            buttonTopPos;

        if ($button.length && $popup.length) {
            pageWidth = $('body').width();
            $popup.removeAttr('style');
            $popupArrow.removeAttr('style');
            popupRightPos = pageWidth
                - $button.offset().left
                - $button.outerWidth() / 2
                - $popup.outerWidth() / 2;
            if (topPos) {
                $popup.css('top', topPos + 'px');
            }
            else {
                buttonTopPos = $button.offset().top + $button.outerHeight();
                $popup.css('top', buttonTopPos + 13 + 'px');
            }

            if (popupRightPos > 10) {
                $popup.css('right', popupRightPos + 'px');
            }
            else {
                $popup.css('right', '10px');
                arrowRightPos = pageWidth
                    - $button.offset().left
                    - $button.outerWidth() / 2;
                $popupArrow.css({
                    left: 'auto',
                    right: arrowRightPos - 22
                })
            }
        }
    };

    // If top menu is opened - set timeout to count correct positions
    if (!$('.top-menu-popup').hasClass('hidden')) {
        setTimeout(function () {
            $.popupAlign();
        }, 250);
    } else {
        $.popupAlign();
    }
}

function init_page() {
    page = page || (u_type ? 'fm' : 'start');
    var mobilePageParsed = false;
    var ar;

    if (!window.M) {
        return console.warn('Something went wrong, the initialization did not completed...');
    }

    // Check if we should show browser update page.
    if (!showLegacyMobilePage && (localStorage.testie11 || is_internet_explorer_11) && showUpdatePage()) {
        localStorage.prevPage = page;
        window.location = (is_extension ? '' : '/') + 'update.html';
    }

    // If they are transferring from mega.co.nz
    if (page.substr(0, 13) == 'sitetransfer!') {

        // If false, then the page is changing hash URL so don't continue past here
        if (M.transferFromMegaCoNz() === false) {
            return false;
        }
    }
    // cleaning local-storage used attr for business signup
    if (localStorage.businessSubAc && page !== 'register') {
        delete localStorage.businessSubAc;
    }

    // Users that logged in and are suspended (requiring special SMS unlock) are not allowed to go anywhere else in the
    // site until they validate their account. So if they clicked the browser back button, then they should get logged
    // out or they will end up with with a partially logged in account stuck in an infinite loop. This logout is not
    // triggered on the mobile web sms/ pages because a session is still required to talk with the API to get unlocked.
    if ((typeof sms !== 'undefined' && sms.isSuspended) ||
        (typeof mobile !== 'undefined' && mobile.sms.isSuspended && page.substr(0, 3) !== 'sms')) {

        u_logout(true);
    }

    dlkey = false;
    if (page[0] === '!' && page.length > 1) {

        ar = page.substr(1, page.length - 1).split('!');
        if (ar[0]) {
            dlid = ar[0].replace(/[^\w-]+/g, "");
        }

        if (ar[1]) {
            dlkey = ar[1].replace(/[^\w-]+/g, "");
        }
        $.playbackOptions = ar[2];

        if (M.hasPendingTransfers() && $.lastSeenFilelink !== getSitePath()) {
            page = 'download';

            M.abortTransfers()
                .done(function () {
                    location.reload();
                })
                .fail(function () {
                    loadSubPage($.lastSeenFilelink);
                });

            return;
        }
        $.lastSeenFilelink = getSitePath();
    }

    // Set class if gbot
    if (is_bot) {
        $('html').addClass('gbot');
    }
    else {
        $('html').removeClass('gbot');
    }

    if (!u_type) {
        $('body').attr('class', 'not-logged');
    }
    else {
        $('body').attr('class', 'logged');

        // Recovery key has been saved
        if (localStorage.recoverykey && !$('body').hasClass('rk-saved')) {
            $('body').addClass('rk-saved');
        }

        // Add FM fonsize class to body
        if (fmconfig.font_size) {
            $('body').removeClass('fontsize1 fontsize2')
                .addClass('fontsize' + fmconfig.font_size);
        }
    }

    // Add language class to body for CSS fixes for specific language strings
    $('body').addClass(lang);
    // add business class to affect the top header
    $('body').removeClass('business');

    if ('-fa-ar-he-'.indexOf('-' + lang + '-') > -1) {
        $('body').addClass('rtl');
    }

    if (is_mobile && is_android) {
        var $html = $('html');

        $html.height(window.innerHeight);

        $(window).rebind('resize.htmlheight', function () {
            $html.height(window.innerHeight);
        });
    }

    // Redirect url to extensions when it tries to go plugin or chrome or firefox
    if (page === 'plugin' || page === 'chrome' || page === 'firefox') {
        loadSubPage('extensions');
        return false;
    }

    // Block about page in Mobile Webclient temporarily
    // We would remove it till we finish the new about page and support mobile version of it
    if (is_mobile && page === 'about') {
        loadSubPage('startpage');
        return false;
    }

    if (!page.match(/^(blog|help|corporate|fm\/recents|page_)/)) {
        $('.top-head').remove();
    }
    $('#loading').hide();
    if (window.loadingDialog) {
        loadingDialog.hide();
    }

    var oldPFKey = pfkey;
    var pageBeginLetters = page.substr(0, 2);
    // contact link handling...
    if (pageBeginLetters === 'C!' && page.length > 2) {
        var ctLink = page.substring(2, page.length);
        if (!is_mobile) {
            if (!u_type) {
                openContactInfoLink(ctLink);
            }
            else {
                page = 'fm/contacts';
                mBroadcaster.once('fm:initialized', function () {
                    openContactInfoLink(ctLink);
                });
            }
        }
        else {
            var processContactLink = function () {
                if (!mega.ui.contactLinkCardDialog) {
                    // because there's a strange solution applied by someone to clear the top-mobile
                    // and to re-do everything in the header in mobile.html !!
                    // --> in order to stop the snow ball of duplication(html code)
                    // i will get the dialog from memory and store it in memory to be embadded when needed.
                    var startTokenLine = '<!-- important token to get the below dialog to memory, DONT REMOVE LINE-->';
                    var endTokenLine = '<!-- important token to get the above dialog to memory, DONT REMOVE LINE-->';
                    var startPos = pages['top-mobile'].indexOf(startTokenLine) + startTokenLine.length;
                    var endPos = pages['top-mobile'].indexOf(endTokenLine);
                    var contactLinkCardHtml = pages['top-mobile'].substring(startPos, endPos);
                    if (contactLinkCardHtml) {
                        mega.ui.contactLinkCardDialog = contactLinkCardHtml;
                    }
                }
                var contactInfoCard = new MobileContactLink(ctLink);
                contactInfoCard.showContactLinkInfo();
            };
            if (!u_type) {
                mBroadcaster.once('HomeStartPageRendered:mobile', processContactLink);
            }
            else {
                loadSubPage('fm');
                processContactLink();
                return;
            }
        }
    }

    if (pageBeginLetters === 'F!' && page.length > 2) {
        if (page.indexOf('?') > 0) {
            page = page.split('?');
            $.autoSelectNode = page[1];
            page = page[0];
        }
        ar = page.substr(2, page.length - 1).split(/[^!\w-]/, 1)[0].split('!');

        pfid = false;
        if (ar[0]) {
            pfid = ar[0].replace(/[^\w-]+/g, "");
        }

        pfkey = false;
        if (ar[1]) {
            pfkey = ar[1].replace(/[^\w-]+/g, "").substr(0, 22);
        }

        pfhandle = false;
        if (ar[2]) {
            pfhandle = ar[2].replace(/[^\w-]+/g, "");
        }

        // If the visit to the folder link has not been logged yet
        if (folderLinkVisitLogged === false) {

            // Log to see how many public folder views on mobile webclient
            if (is_mobile) {
                api_req({ a: 'log', e: 99631, m: 'Loaded public folder link on mobile webclient' });
            }
            else {
                // Otherwise log to see how many public folder views on regular webclient
                api_req({ a: 'log', e: 99632, m: 'Loaded public folder link on regular webclient' });
            }

            // Don't log this again for this session
            folderLinkVisitLogged = true;
        }

        n_h = pfid;
        if (!flhashchange || pfkey !== oldPFKey || pfkey.length !== 22 || pfid.length !== 8) {

            closeDialog();

            if (pfid.length !== 8) {
                folderreqerr(false, EARGS);
                return;
            }

            if (pfkey.length === 22) {
                api_setfolder(n_h);
                if (waitxhr) {
                    waitsc();
                }
                u_n = pfid;
            }
            else {
                // If mobile, show the decryption key overlay
                if (is_mobile) {
                    mobile.initDOM();
                    mobile.decryptionKeyOverlay.show(pfid, true, pfkey);
                }
                else {
                    // Insert placeholder background page while waiting for user input
                    parsepage(pages['placeholder']);

                    // Show the decryption key dialog on top
                    mKeyDialog(pfid, true, pfkey)
                        .fail(function () {
                            loadSubPage('start');
                        });
                    pfkey = false;
                }
                return;
            }

            if (fminitialized && (!folderlink || pfkey !== oldPFKey)) {
                // Clean up internal state in case we're navigating back to a folderlink
                M.currentdirid = M.RootID = undefined;
                delete $.onImportCopyNodes;
                delete $.mcImport;
            }
        }
        if (pfhandle) {
            page = 'fm/' + pfhandle;
        }
        else {
            page = 'fm';
        }
    }
    else if (!flhashchange || page !== 'fm/transfers') {
        n_h = false;
        u_n = false;
        pfkey = false;
        pfid = false;
        pfhandle = false;
    }
    confirmcode = false;
    pwchangecode = false;

    if (pageBeginLetters.toLowerCase() === 'n!') {
        return invalidLinkError();
    }

    if (page.substr(0, 7) === 'confirm') {
        confirmcode = page.replace("confirm", "");
        page = 'confirm';
    }

    if (page.substr(0, 7) == 'pwreset') {
        resetpwcode = page.replace("pwreset", "");
        page = 'resetpassword';
    }

    // If password revert link, use generic background page, show the dialog and pass in the code
    if (page.substr(0, 8) === 'pwrevert') {
        parsepage(pages.placeholder);
        passwordRevert.init(page);

        // Make sure placeholder background is shown
        return false;
    }

    // is chat link?
    if (is_mobile && page.substr(0, 4) === 'chat') {
        var chatInfo = window.location.toString().split("chat/");
        if (chatInfo[1] && chatInfo[1].split) {
            chatInfo = chatInfo[1].split("#");
            var chatHandle = chatInfo[0];
            var chatKey = chatInfo[1];
            parsepage(pages['mobile']);
            mobile.chatlink.show(chatHandle, chatKey);
            return;
        }
    }
    if ((pfkey || dlkey) && location.hash[0] !== '#') {
        return location.replace(getAppBaseUrl());
    }

    blogmonth = false;
    blogsearch = false;

    if (!$.mcImport && typeof closeDialog === 'function') {
        closeDialog();
    }

    if ((page.substr(0, 1) !== '!')
        && (page.substr(0, 3) !== 'pro')
        && (page.substr(0, 5) !== 'start' || is_fm())
        && (page.substr(0, 4) !== 'help')
        && (page !== 'contact')
        && (page !== 'mobileapp')
        && (page !== 'uwp')
        && (page !== 'extensions')
        && (page !== 'sync')
        && (page !== 'bird')
        && (page !== 'cmd')
        && (page !== 'terms')
        && (page !== 'privacy')
        && (page !== 'gdpr')
        && (page !== 'takendown')
        && (page !== 'resellers')
        && (page !== 'security')
        && (page !== 'downloadapp')
        && (page !== 'unsub')
        && localStorage.awaitingConfirmationAccount) {

        var acc = JSON.parse(localStorage.awaitingConfirmationAccount);

        // if visiting a #confirm link, or they confirmed it elsewhere.
        if (confirmcode || u_type > 1) {
            delete localStorage.awaitingConfirmationAccount;
        }
        else {
            // Show signup link dialog for mobile
            if (is_mobile) {
                mobile.initDOM();
                mobile.register.showConfirmEmailScreen(acc);
                return false;
            }
            else {
                // Insert placeholder page while waiting for user input
                parsepage(pages['placeholder']);

                return mega.ui.sendSignupLinkDialog(acc, function () {
                    // The user clicked 'close', abort and start over...
                    delete localStorage.awaitingConfirmationAccount;
                    init_page();
                });
            }
        }
    }

    // If the account has just finished being cancelled
    if (localStorage.beingAccountCancellation) {
        // Insert placeholder page while waiting for user input
        parsepage(pages.placeholder);

        // Show message that the account has been cancelled successfully
        msgDialog('warninga', l[6188], l[6189], '', loadSubPage.bind(null, 'start'));

        delete localStorage.beingAccountCancellation;
        return false;
    }

    // Password protected link decryption dialog
    if (page.substr(0, 2) === 'P!' && page.length > 2) {
        // Check if TextEncoder function is available for the stringToByteArray function
        // and we need to exclude Edge explicitly, since now it has supported Text Encoder but it doesnt support
        // SubtleCrypto.importKey() with 'PBKDF2' (the algorithm we are using).
        // And we need to exclude IE explicitly, since it returns non promise type to SubtleCrypto.importKey() call
        if (window.TextEncoder && ua.details.browser !== 'Edge' && ua.details.browser !== 'Internet Explorer') {
            // Show the password overlay for mobile
            if (is_mobile) {
                parsepage(pages['mobile']);
                mobile.decryptionPasswordOverlay.show(page);
                mobilePageParsed = true;
            }
            else {
                // Otherwise insert background page, show the password
                // decryption dialog and pass in the current URL hash
                parsepage(pages['placeholder']);
                exportPassword.decrypt.init(page);
            }
        }
        else { // not supported browser, appologize from user
            var msgToUser = l[18420];
            if (!is_mobile) {
                if (u_type) {
                    mBroadcaster.once('boot_done', function () {
                        setTimeout(
                            msgDialog('info', 'Pwssword protected link not supported', // not visible
                                msgToUser), 1000);
                    });
                    page = 'fm';
                }
                else {
                    msgDialog('info', 'Pwssword protected link not supported', // not visible
                        msgToUser);
                    page = 'start';
                }
            }
            else {
                if (u_type) {
                    loadSubPage('fm');
                }
                else {
                    parsepage(pages['mobile']);
                    mobile.signin.show();
                }
                msgDialog('info', 'Pwssword protected link not supported', // not visible
                    msgToUser);
                mobilePageParsed = true;
            }
        }
    }

    if (mobilePageParsed) {
        mobilePageParsed = false;
    }
    else if (page.substr(0, 10) == 'blogsearch') {
        blogsearch = decodeURIComponent(page.substr(11, page.length - 1));
        if (!blogsearch) {
            loadSubPage('blog');
        }
        page = 'blog';
        parsepage(pages['blogarticle']);
        init_blog();
    }


    else if (page.substr(0, 6) == 'verify') {
        parsepage(pages['change_email']);
        emailchange.main();
    }
    else if (page.substr(0, 9) == 'corporate') {
        function doRenderCorpPage() {
            if (window.corpTemplate) {
                parsepage(window.corpTemplate);
                topmenuUI();
                loadingDialog.hide();
                CMS.loaded('corporate');
                return;
            }

            loadingDialog.show();
            CMS.watch('corporate', function () {
                window.corpTemplate = null;
                doRenderCorpPage();
            });
            CMS.get('corporate', function (err, content) {
                parsepage(window.corpTemplate = content.html);
                topmenuUI();
                loadingDialog.hide();
            });
        }

        doRenderCorpPage();
        page = 'cpage';
        bottompage.init();
    }
    else if (page.substr(0, 5) == 'page_') {
        var cpage = decodeURIComponent(page.substr(5, page.length - 2));

        function doRenderCMSPage() {
            loadingDialog.show();
            CMS.watch(cpage, function () {
                doRenderCMSPage();
            });

            CMS.get(cpage, function (err, content) {
                parsepage(content.html);
                topmenuUI();
                loadingDialog.hide();
            });
        }

        doRenderCMSPage();
        page = 'cpage';
        bottompage.init();
        return;
    }
    else if (page.substr(0, 4) == 'blog' && page.length > 4 && page.length < 10) {
        blogid = page.substr(5, page.length - 2);
        page = 'blogarticle';
        parsepage(pages['blogarticle']);
        init_blogarticle();
    }
    else if (page.substr(0, 4) == 'blog' && page.length > 4) {
        blogmonth = page.substr(5, page.length - 2);
        page = 'blog';
        blogpage = 1;
        parsepage(pages['blog']);
        init_blog();
    }

    // If user has been invited to join MEGA and they are not already registered
    else if (page.substr(0, 9) == 'newsignup') {

        // Get the email and hash checksum from after the #newsignup tag
        var emailAndHash = page.substr(9);
        var emailAndHashDecoded = base64urldecode(emailAndHash);

        // Separate the email and checksum portions
        var endOfEmailPosition = emailAndHashDecoded.length - 8;
        var email = emailAndHashDecoded.substring(0, endOfEmailPosition);
        var hashChecksum = emailAndHashDecoded.substring(endOfEmailPosition);

        // Hash the email address
        var hashBytes = asmCrypto.SHA512.bytes(email);

        // Convert the first 8 bytes of the email to a Latin1 string for comparison
        var byteString = '';
        for (var i = 0; i < 8; i++) {
            byteString += String.fromCharCode(parseInt(hashBytes[i]));
        }

        // Unset registration email
        localStorage.removeItem('registeremail');

        // If the checksum matches, redirect to #register page
        if (hashChecksum === byteString) {

            // Store in the localstorage as this gets pre-populated into the register form
            localStorage.registeremail = email;

            // Redirect to the register page
            loadSubPage('register');
        }
        else {
            // Redirect to the register page
            loadSubPage('register');

            // Show message
            alert('We can\'t decipher your invite link, please check you copied the link correctly, or sign up manually with the same email address.');
        }
    }
    else if (page.length > 14 && page.substr(0, 14) === 'businesssignup') {
        if (is_mobile) {
            parsepage(pages['mobile']);
            mobile.decryptionPasswordOverlay.show(page, true);
        }
        else {
            var signupCodeEncrypted = page.substring(14, page.length);
            M.require('businessAcc_js', 'businessAccUI_js').done(function () {
                var business = new BusinessAccountUI();
                business.showLinkPasswordDialog(signupCodeEncrypted);
            });
        }

    }
    else if (page.length > 14 && page.substr(0, 14) === 'businessinvite') {
        if (is_mobile) {
            mobile.initDOM();
        }
        var signupCode = page.substring(14, page.length);
        M.require('businessAcc_js', 'businessAccUI_js').done(function () {
            var business = new BusinessAccountUI();
            business.openInvitationLink(signupCode);
        });
    }
    else if (page === 'confirm') {

        loadingDialog.show();

        // A callback for when the email confirm code was valid
        var signUpSucceededCallback = function(email) {

            loadingDialog.hide();
            confirmok = true;
            page = 'login';

            if (is_mobile) {
                mobile.initDOM();
                mobile.register.showConfirmAccountScreen(email);
            }
            else {
                parsepage(pages['login']);
                login_txt = l[378];

                // I need this event handler to be triggered only in case of coming from confirmation
                mBroadcaster.once('fm:initialized', function () {
                    if (u_attr && u_attr.b && u_attr.b.m) {
                        M.require('businessAcc_js', 'businessAccUI_js').done(function () {
                            var business = new BusinessAccountUI();
                            business.showWelcomeDialog();
                        });
                    }
                });

                init_login();
                if (email) {
                    $('#login-name2').val(email).blur();
                    $('.register-st2-button').addClass('active');
                    $('#login-name2').prop('readonly', true);
                }
                topmenuUI();
            }
        };

        // A callback for when the email confirm code was invalid
        var signUpFailedCallback = function(result) {

            loadingDialog.hide();
            page = 'login';

            if (is_mobile) {
                parsepage(pages['mobile']);
                mobile.register.showConfirmAccountFailure(result);
            }
            else {
                if (result === EINCOMPLETE) {
                    alert(l[703]);
                }
                else if (result === ENOENT) {
                    login_txt = l[19788];
                }
                else {
                    alert(l[705] + result);
                }

                parsepage(pages['login']);
                init_login();
                topmenuUI();
            }
        };

        // Decode the email confirm code
        var decodedConfirmCode = base64urldecode(confirmcode);

        // Check if they registered using the new registration process (version 2)
        if (decodedConfirmCode.substr(0, 13) === 'ConfirmCodeV2') {

            // If already logged into an account
            if (u_type === 3) {

                // Ask them to log out and click on the confirmation link again
                if (is_mobile) {
                    parsepage(pages['mobile']);
                    mobile.messageOverlay.show(l[2480], l[12440], function () {
                        loadSubPage('fm');
                    });
                }
                else {
                    msgDialog('warningb', l[2480], l[12440], false, function () {
                        loadSubPage('fm');
                    });
                }
                return false;
            }

            // Verify the confirm code using the new process
            security.register.verifyEmailConfirmCode(confirmcode, function(result, email) {

                // If successful
                if (typeof email === 'string') {
                    signUpSucceededCallback(email);
                }
                else {
                    signUpFailedCallback(result);
                }
            });
        }
        else {
            // Verify the confirm code using the old process
            verifysignupcode(confirmcode, {
                signupcodeok: signUpSucceededCallback,
                signupcodebad: signUpFailedCallback
            });
        }
    }
    else if (page.startsWith('emailverify')) {
        return security.showVerifyEmailDialog('login-to-account');
    }
    else if (u_type == 2) {
        if (is_mobile) {
            parsepage(pages['mobile']);
            mobile.register.showGeneratingKeysScreen();
        }
        else {
            parsepage(pages['key']);
        }
        init_key();
    }
    else if (page == 'login') {
        if (u_storage.sid) {
            loadSubPage('fm');
            return false;
        }

        if (is_mobile) {
            mobile.initDOM();
            mobile.signin.show();
        }
        else {
            parsepage(pages['login']);
            init_login();
        }
    }
    else if (is_mobile && u_type && page === 'fm/dashboard') {
        loadSubPage('fm');
        return false;
    }
    else if (is_mobile && u_type && page === 'fm/account/invites/how-it-works') {
        parsepage(pages['mobile']);
        mobile.achieve.howItWorks.init();
        return false;
    }
    else if (is_mobile && u_type && page === 'fm/account/invites') {
        parsepage(pages['mobile']);
        mobile.achieve.invites.init();
        return false;
    }
    else if (is_mobile && u_type && page === 'fm/account/referrals') {
        parsepage(pages['mobile']);
        mobile.achieve.referrals.init();
        return false;
    }
    else if (is_mobile && u_type && page === 'fm/account/achievements') {
        parsepage(pages['mobile']);
        mobile.achieve.init();
        return false;
    }
    else if (is_mobile && u_type && page === 'fm/account/history') {
        parsepage(pages['mobile']);
        mobile.account.history.init();
        return false;
    }
    else if (is_mobile && u_type && page === 'fm/account/email-and-pass') {
        parsepage(pages['mobile']);
        mobile.account.changePassword.init();
        return false;
    }
    else if (is_mobile && fminitialized && u_type && page === 'fm/account/notifications') {
        mobile.initDOM();
        mobile.account.notifications.init();
        return false;
    }
    else if (page === 'achievements') {
        loadSubPage('fm/account/achievements');
        return false;
    }
    else if (page === 'fm/account/achievements') {
        $.openAchievemetsDialog = true;
        loadSubPage('fm/account/plan');
        return false;
    }
    else if (is_mobile && page.substr(0, 9) === 'twofactor') {

        parsepage(pages['mobile']);

        if (page.indexOf('intro') > -1) {
            mobile.twofactor.intro.init();
        }
        else if (page.indexOf('verify-setup') > -1) {
            mobile.twofactor.verifySetup.init();
        }
        else if (page.indexOf('setup') > -1) {
            mobile.twofactor.setup.init();
        }
        else if (page.indexOf('enabled') > -1) {
            mobile.twofactor.enabled.init();
        }
        else if (page.indexOf('verify-disable') > -1) {
            mobile.twofactor.verifyDisable.init();
        }
        else if (page.indexOf('disabled') > -1) {
            mobile.twofactor.disabled.init();
        }
        else if (page.indexOf('verify-login') > -1) {
            mobile.twofactor.verifyLogin.init();
        }

        return false;
    }
    else if (is_mobile && page.substr(0, 3) === 'sms') {

        parsepage(pages['mobile']);

        if (page.indexOf('add-phone-suspended') > -1) {
            mobile.sms.phoneInput.init();
        }
        else if (page.indexOf('verify-code') > -1) {
            mobile.sms.verifyCode.init();
        }
        else if (page.indexOf('verify-success') > -1) {
            mobile.sms.verifySuccess.init();
        }
        else if (page.indexOf('phone-achievement-intro') > -1) {
            mobile.sms.achievement.init();
        }
        else if (page.indexOf('add-phone-achievement') > -1) {
            mobile.sms.phoneInput.init();
        }

        return false;
    }
    else if (page === 'fm/account/profile') {

        // Handle old invalid links from emails and redirect them back to fm/account
        loadSubPage('fm/account');
        return false;
    }
    else if (is_mobile && page === 'fm/account') {
        parsepage(pages['mobile']);
        mobile.account.init();
        return false;
    }
    else if (page == 'account') {
        loadSubPage('fm/account');
        return false;
    }
    else if (page.substr(0, 8) === 'megadrop') {
        if (is_mobile) {
            parsepage(pages['mobile']);
            mobile.megadrop.show();
        }
        else {
            var pupHandle = page.substr(9, 11);
            mega.megadrop.pupCheck(pupHandle);
        }
    }
    else if (page == 'dashboard') {
        loadSubPage('fm/dashboard');
        return false;
    }
    else if (page == 'register') {
        if (u_storage.sid && u_type !== 0) {
            loadSubPage('fm');
            return false;
        }

        if (is_mobile) {
            mobile.initDOM();
            mobile.register.show();
        }
        else {
            parsepage(pages['register']);
            init_register();
        }
    }
    else if ((page.substr(0, 9) === 'registerb')) { // business register
        if (page.length > 9) {
            var pageParams = page.substr(9);
            if (pageParams.length > 14) {
                var uaoParam = pageParams.indexOf('/uao=');
                if (uaoParam > -1) {
                    mega.uaoref = pageParams.substr(uaoParam + 5);
                }
            }
        }
        parsepage(pages['registerb']);
        $('body').addClass('business');
        var regBusiness = new BusinessRegister();
        regBusiness.initPage();
    }
    else if (page === 'fm/account/history') {
        loadSubPage('fm/account/security');
        return false;
    }
    else if (page === 'fm/links') {
        loadSubPage('fm/public-links');
        return false;
    }
    else if (page == 'key') {
        if (is_mobile) {
            mobile.initDOM();
            mobile.register.showGeneratingKeysScreen();
        }
        else {
            parsepage(pages['key']);
        }
        init_key();
    }
    else if (page === 'support') {
        if (is_mobile) {
            mobile.initDOM();
            mobile.support.init();
        }
        else if (u_type === 0) {
            loadSubPage('register');
            return false;
        }
        else {
            parsepage(pages['support']);
            support.initUI();
        }
    }
    else if (page == 'contact') {
        parsepage(pages['contact']);
        if (lang == 'ru') {
            $('.account-mid-block').addClass('high');
        }

        // if this is a business user
        var $supportLink = $('#contact-email-support-btn');
        if (u_attr && u_attr.b) {
            $supportLink.text('business@mega.nz');
            $supportLink.prop('href', 'mailto:business@mega.nz');
        }
        else {
            $supportLink.text('support@mega.nz');
            $supportLink.prop('href', 'mailto:support@mega.nz');
        }

        // On clicking the directory buttons
        $('.directory-buttons li').rebind('click', function() {

            // Get the class to the directory title element to scroll to
            var link = $(this).attr('data-link');

            // Scroll to the element's parent (not the element itself because it's hidden by the header)
            $('.contact-new-title.' + link).parent().get(0).scrollIntoView({behavior: "smooth"});
        });
    }
    else if (page.substr(0, 4) == 'help') {
        return Help.render();
    }
    else if (page == 'privacy') {
        parsepage(pages['privacy']);
    }
    else if (page === 'gdpr') {
        parsepage(pages['gdpr']);
        gdpr.init();
    }
    else if (page == 'privacycompany') {
        parsepage(pages['privacycompany']);
    }
    else if (page == 'dev' || page == 'developers') {
        parsepage(pages['dev']);
        dev_init('dev');
    }
    else if (page == 'doc') {
        parsepage(pages['dev']);
        dev_init('doc');
    }
    else if (page == 'backup' && !u_type) {
        if (is_mobile) {
            login_next = page;
            loadSubPage('login');
            return false;
        }
        else {
            login_txt = l[1298];
            parsepage(pages['login']);
            init_login();
        }
    }
    else if (page == 'backup') {
        if (is_mobile) {
            mobile.initDOM();
            mobile.backup.init();
        }
        else {
            parsepage(pages['backup']);
            init_backup();
        }
    }
    else if (page.substr(0, 6) === 'cancel' && page.length > 24) {

        // If logged in
        if (u_type) {
            var ac = new mega.AccountClosure();

            // Validate code with current logged in session
            ac.validateCodeWithSession().done(function() {
                if (is_mobile) {
                    mobile.initDOM();
                    mobile.account.cancel.init();
                }
                else {
                    ac.handleFeedback();
                }
            })
            .fail(function(res) {

                // If this is not errored from server but failed verification
                if (typeof res !== 'number') {
                    if (is_mobile) {
                        mobile.initDOM();
                    }
                    msgDialog('warninga', l[135], l[22001], false, function () {
                        loadSubPage('fm');
                    });
                }
            });
        }
        else {
            // Unable to cancel, not logged in
            if (is_mobile) {
                mobile.initDOM();
                login_next = page;
                msgDialog('warninga', l[6186], l[5841], false, function () {
                    loadSubPage('login');
                });
            }
            else {
                mega.ui.showLoginRequiredDialog({
                    title: l[6186],
                    textContent: l[5841]
                })
                .done(init_page)
                .fail(function (aError) {
                    if (aError) {
                        alert(aError);
                    }
                    loadSubPage('start');
                });
            }
        }
    }
    else if (page === 'wiretransfer') {
        parsepage(pages['placeholder']);

        if (u_type === 3) {
            wireTransferDialog
                .init(function onClose() {
                    loadSubPage('fm');
                });
        }
        else {
            mega.ui.showLoginRequiredDialog({
                minUserType: 3,
                skipInitialDialog: 1
            })
                .done(init_page)
                .fail(function (aError) {
                    if (aError) {
                        alert(aError);
                    }
                    loadSubPage('start');
                });
        }
    }

    // Initial recovery process page to choose whether to recover with Master/Recovery Key or park the account
    else if (page === 'recovery') {
        if (is_mobile) {
            if (u_type) {
                loadSubPage('fm/account');
                return false;
            }
            else {
                parsepage(pages['recovery']);
                //mobile.recovery.init();
                var recov = new AccountRecoveryControl();
                mega.accountController = recov;
                mega.accountController.showStep();
            }
        }
        else {
            if (u_type) {
                loadSubPage('fm/account/security');
                return false;
            }
            else {
                parsepage(pages['recovery']);
                //var accountRecovery = new mega.AccountRecovery();
                //accountRecovery.initRecovery();
                var recov = new AccountRecoveryControl();
                mega.accountController = recov;
                mega.accountController.showStep();
            }
        }
    }

    // Page for mobile to let them recover by Master/Recovery Key
    else if (is_mobile && page === 'recoverybykey') {
        mobile.initDOM();
        mobile.recovery.sendEmail.init(mobile.recovery.sendEmail.RECOVERY_TYPE_KEY);
    }

    // Page for mobile to let them park their account (start a new account with the same email)
    else if (is_mobile && page === 'recoverybypark') {
        mobile.initDOM();
        mobile.recovery.sendEmail.init(mobile.recovery.sendEmail.RECOVERY_TYPE_PARK);
    }

    // Code for handling the return from a #recover email link
    else if (page.substr(0, 7) === 'recover' && page.length > 25) {
        if (is_mobile) {
            mobile.initDOM();
            mobile.recovery.fromEmailLink.init();
        }
        else {
            parsepage(pages['reset']);
            init_reset();
        }
    }

    // Page for mobile to enter (or upload) their Master/Recovery Key
    else if (is_mobile && page === 'recoveryenterkey') {
        mobile.initDOM();
        mobile.recovery.enterKey.init();
    }

    // Page for mobile to let them change their password after they have entered their Master/Recovery key
    else if (is_mobile && page === 'recoverykeychangepass') {
        mobile.initDOM();
        mobile.recovery.changePassword.init('key');
    }

    // Page for mobile to let the user change their password and finish parking their account
    else if (is_mobile && page === 'recoveryparkchangepass') {
        mobile.initDOM();
        mobile.recovery.changePassword.init('park');
    }
    else if (page == 'sdkterms') {
        parsepage(pages['sdkterms']);
    }
    else if (page.substr(0, 3) == 'sdk') {
        parsepage(pages['dev']);
        if (page.length > 3) {
            dev_init('sdk', page.replace('sdk_', ''));
        }
        else {
            dev_init('sdk');
        }
    }
    else if (page == 'about') {
        loadingDialog.show();
        CMS.get("team", function (err, content) {
            parsepage(pages['about']);

            var html = '';
            var a = 4;

            $('.new-bottom-pages.about').safeHTML(content.html);
            $('.team-person-block').sort(function () {
                return (Math.round(Math.random()) - 0.5);
            }).each(function (i, element) {
                if (a == 4) {
                    html += element.outerHTML.replace('team-person-block', 'team-person-block first');
                    a = 0;
                }
                else {
                    html += element.outerHTML;
                }
                a++;
            });

            $('#emailp').safeHTML($('#emailp').text().replace('jobs@mega.nz',
                '<a href="mailto:jobs@mega.nz">jobs@mega.nz</a>'));
            $('.new-bottom-pages.about').safeHTML(html + '<div class="clear"></div>');
            topmenuUI();
            loadingDialog.hide();

        });
        return;
    }
    else if (page === 'sourcecode') {
        parsepage(pages['sourcecode']);
    }
    else if (page.substr(0, 5) === 'terms') {
        if (is_mobile) {
            mobile.initDOM();
            mobile.terms.show();
        }
        else {
            parsepage(pages['terms']);
        }

        if (page.substr(5, 1) === '/') {
            delay('waitTermLoad', function() {
                var anchor = page.split('/')[1];
                page = 'terms';
                $('a[data-scrollto="#' + anchor + '"]').click();
            });
        }
    }
    else if (page === 'security') {
        parsepage(pages['securitypractice']);
        securityPractice.init();
    }
    else if (page == 'takedown') {
        parsepage(pages['takedown']);
    }
    else if (page == 'blog') {
        parsepage(pages['blog']);
        init_blog();
    }
    else if (is_mobile && (page === 'copyright' || page === 'copyrightnotice')) {

        // Show message that the copyright takedown should be submitted in a desktop browser
        mobile.initDOM();
        mobile.messageOverlay.show(l[621], l[19628]).always(function() {

            // On clicking OK in the dialog, go to the file manager if logged in, or start page if not
            loadSubPage(u_type === 3 ? 'fm' : 'start');
        });
        return false;
    }
    else if (page === 'copyrightnotice') {
        parsepage(pages['copyrightnotice']);
        copyright.init_cn();
    }
    else if (page === 'copyright') {
        parsepage(pages['copyright']);
        $('.reg-st5-complete-button').rebind('click', function () {
            loadSubPage('copyrightnotice');
        });
    }
    else if (page === 'disputenotice') {
        parsepage(pages['disputenotice']);
        copyright.init_cndispute();
    }
    else if (page === 'dispute') {
        parsepage(pages['dispute']);
        $('.reg-st5-complete-button').rebind('click', function (e) {
            loadSubPage('disputenotice');
        });
    }
    else if (page.substr(0, 3) === 'pro') {
        /* jshint -W018 */
        var tmp = page.split(/(\/\w+=)/);
        if (tmp.length > 1) {
            for (var s = 1; s < tmp.length; s += 2) {
                tmp[String(tmp[s]).replace(/\W/g, '')] = mURIDecode(tmp[s + 1]);
            }
            if (tmp.uao) {
                mega.uaoref = tmp.uao;
            }
            if (tmp.aff && (tmp.aff_time *= 1000) && !(localStorage.affts > tmp.aff_time)) {
                localStorage.affid = tmp.aff;
                localStorage.affts = tmp.aff_time;
            }
            loadSubPage(tmp[0]);
            return;
        }

        if (page.substr(0, 6) === 'propay') {
            parsepage(pages[is_mobile ? 'mobile' : 'propay']);
            pro.propay.init();
        }
        else {
            parsepage(pages['proplan']);
            pro.proplan.init();
        }
    }
    else if (page.substr(0, 7) === 'payment') {
        var isBussiness = page.indexOf('-b') !== -1;

        if (!isBussiness || is_mobile) {
            // Load the Pro page in the background
            parsepage(pages['proplan']);
            if (!isBussiness) {
                pro.proplan.init();
            }
        }
        else {
            parsepage(pages['business']);
            $('body').addClass('business');
        }

        // Process the return URL from the payment provider and show a success/failure dialog if applicable
        pro.proplan.processReturnUrlFromProvider(page);
    }
    else if (page === 'repay') {
        if (u_attr && u_attr.b && u_attr.b.m && (u_attr.b.s === -1 || u_attr.b.s === 2)) {
            parsepage(pages['repay']);
            var repayPage = new RepayPage();
            repayPage.initPage();
        }
        else {
            loadSubPage('start');
            return;
        }

    }
    else if (page == 'credits') {
        parsepage(pages['credits']);
        var html = '';
        $('.credits-main-pad a').sort(function () {
            return (Math.round(Math.random()) - 0.5);
        }).each(function (i, e) {
            html += e.outerHTML;
        });
        $('.credits-main-pad').html(html + '<div class="clear"></div>');
    }
    else if (page === 'mobile' || page === 'android' || page === 'ios') {
        parsepage(pages['mobileapp']);

        // On clicking the 'Learn more' button
        $('.uwp-windows-scrollto-button').rebind('click', function() {

            // Scroll to the Windows Phone section
            $('.uwp-windows-section').get(0).scrollIntoView({behavior: "smooth"});
        });
    }
    else if (page === 'extensions') {
        parsepage(pages['browsers']);
        browserspage.init();
    }
    else if (page === 'uwp' || page === 'wp') {
        parsepage(pages['uwp']);
        bottompage.initTabs();
    }
    else if (page === 'business') {
        parsepage(pages['business']);
        $('body').addClass('business');
        var businessP = new BusinessProductPage();
        businessP.init();
    }
    else if (page === 'bird') {
        parsepage(pages['megabird']);
    }
    else if (page.substr(0, 4) == 'sync') {
        parsepage(pages['sync']);
        M.require('sync_js').then(function() {
            onIdle(topmenuUI);
            initMegasync();
        });
    }
    else if (page == 'cmd') {
        parsepage(pages['cmd']);
        initMegacmd();
    }
    else if (page == 'resellers') {
        parsepage(pages['resellers']);
    }
    else if (page === 'downloadapp') {
        desktopOnboarding();
    }
    else if (page == 'takedown') {
        parsepage(pages['takedown']);
    }
    else if (page == 'done') {
        parsepage(pages['done']);
        init_done();
    }
    else if (page.substr(0, 5) === 'unsub') {
        // Non-registered user unsubsribe from emails.
        if (is_mobile) {
            mobile.initDOM();
        }
        M.require('unsub_js').done(function() {
            EmailUnsubscribe.unsubscribe();
        });
    }
    else if (dlid) {
        page = 'download';
        if (typeof fdl_queue_var !== 'undefined') {
            var handle = Object(fdl_queue_var).ph || '';
            var $tr = $('.transfer-table tr#dl_' + handle);
            if ($tr.length) {
                var dl = dlmanager.getDownloadByHandle(handle);
                if (dl) {
                    dl.onDownloadProgress = dlprogress;
                    dl.onDownloadComplete = dlcomplete;
                    dl.onDownloadError = M.dlerror;
                    $tr.remove();
                }
            }
        }
        if (is_mobile) {
            parsepage(pages['mobile']);
        }
        else {
            parsepage(pages['download']);
        }
        dlinfo(dlid, dlkey, false);
        topmenuUI();
    }
    else if (page.substr(0, 5) === 'reset') {
        localStorage.clear();
        sessionStorage.clear();
        loadSubPage(page.substr(6) || 'fm');
        return location.reload(true);
    }
    else if (page.substr(0, 5) === 'debug') {
        localStorage.d = 1;
        localStorage.minLogLevel = 0;
        loadSubPage(page.substr(6) || 'fm');
        return location.reload(true);
    }
    else if (page.substr(0, 4) === 'test') {
        test(page.substr(4));
    }

    /**
     * If voucher code from url e.g. #voucherZUSA63A8WEYTPSXU4985
     */
    else if (page.substr(0, 7) === 'voucher') {

        // Get the voucher code from the URL.
        var voucherCode = page.substr(7);

        // Store in localStorage to be used by the Pro page or when returning from login
        localStorage.setItem('voucher', voucherCode);
        localStorage.setItem('voucherExpiry', Date.now() + 36e5);

        // If not logged in, direct them to login or register first
        if (!u_type) {
            if (typeof redeem === 'undefined') {
                // we have voucher directly
                if (u_wasloggedin()) {
                    login_txt = l[7712];
                    loadSubPage('login');
                }
                else {
                    register_txt = l[7712];
                    loadSubPage('register');
                }
                return false;
            }
            else {
                // we are coming form redeem page
                redeem.showVoucherInfoDialog();
            }
        }
        else if (u_type < 3) {
            // If their account is ephemeral and the email is not confirmed, then show them a dialog to warn them and
            // make sure they confirm first otherwise we get lots of chargebacks from users paying in the wrong account
            msgDialog('warningb', l[8666], l[8665], false, function () {
                loadSubPage('fm');
            });
        }
        else {
            // Otherwise go to the Redeem page which will detect the voucher code and show a dialog
            loadSubPage('redeem');
            return false;
        }
    }

    // Load the direct voucher redeem page
    else if (page.substr(0, 6) === 'redeem') {
        if (localStorage.voucher && u_type > 2) {
            // To complete the redeem voucher process after user logs in if the voucher code exists
            parsepage(pages[is_mobile ? 'mobile' : 'redeem']);
            redeem.init();
        }
        else {
            // No voucher found, ask to enter it.
            // Or back to the voucher redeem page without completion of login or register if entered code before
            parsepage(pages.redeem);
            redeem.setupVoucherInputbox(localStorage.voucher);
        }
    }

    // If they recently tried to redeem their voucher but were not logged in or registered then direct them to the
    // #redeem page to complete their purchase. For newly registered users this happens after key creation is complete.
    else if ((localStorage.getItem('voucher') !== null) && (u_type === 3)) {
        loadSubPage('redeem');
        return false;
    }
    // If they recently tried to join a chat link, forward to the chat link page.
    else if (
        localStorage.getItem('autoJoinOnLoginChat') !== null && u_type === 3 &&
        getSitePath().indexOf("/chat/") !== 0
    ) {
        var autoLoginChatInfo = typeof localStorage.autoJoinOnLoginChat !== "undefined" ?
            JSON.parse(localStorage.autoJoinOnLoginChat) : false;

        if (unixtime() - 2 * 60 * 60 < autoLoginChatInfo[1]) {
            loadSubPage("/chat/" + autoLoginChatInfo[0] + autoLoginChatInfo[2]);
            return false;
        }
        else {
            localStorage.removeItem('autoJoinOnLoginChat');
            // the only way tto not refactor this whole piece of code is to simply do a recurrsion, after the
            // autoJoin... is removed.
            return init_page();
        }

    } else if (localStorage.getItem('addContact') !== null && u_type === 3) {
        var contactRequestInfo = JSON.parse(localStorage.getItem('addContact'));
        var contactHandle = contactRequestInfo.u;
        var contactRequestTime = contactRequestInfo.unixTime;
        var TWO_HOURS_IN_SECONDS = 7200;

        var addContact = function (ownerEmail, targetEmail) {
            M.inviteContact(ownerEmail, targetEmail);
            localStorage.removeItem('addContact');
            return init_page();
        };

        if ((unixtime() - TWO_HOURS_IN_SECONDS) < contactRequestTime) {
            attribCache.getItem(contactHandle + "_uge")
            .done(function(email) {
                addContact(u_attr.email, email);
            })
            .fail(function() {
                asyncApiReq({
                    'a': 'uge',
                    'u': contactHandle
                })
                .done(function(email) {
                    if (isValidEmail(email) && isString(email)) {
                        attribCache.setItem(contactHandle + "_uge", email);
                        addContact(u_attr.email, email);
                    }
                    else {
                        localStorage.removeItem('addContact');
                    }
                })
                .fail(function(e) {
                    console.error(e);
                    localStorage.removeItem('addContact');
                });
            });
        }
    } else if (is_fm()) {
        var id = false;
        if (page.substr(0, 2) === 'fm') {
            id = page.replace('fm/', '');
            if (id.length < 5 && (id !== 'chat' && id !== 'opc' && id !== 'ipc')) {
                id = false;
            }
        }

        if (d) {
            console.log('Setting up fm...', id, pfid, fminitialized, M.currentdirid);
        }

        if (!id && fminitialized) {
            id = M.RootID;
        }


        // FIXME
        // all global state must be encapsulated in a single object -
        // we can then comfortably switch between states by changing the
        // current object and switching UI/XHR comms/IndexedDB

        // switch between FM & folderlinks (completely reinitialize)
        if ((!pfid && folderlink) || (pfid && folderlink === 0) || pfkey !== oldPFKey) {

            M.reset();
            folderlink = 0;
            fminitialized = false;
            loadfm.loaded = false;
            loadfm.loading = false;

            stopapi();
            api_reset();
            initworkerpool();

            if (u_sid) {
                api_setsid(u_sid);
            }
            if (pfid) {
                api_setfolder(n_h);
            }

            // re-initialize waitd connection when switching.
            if (waitxhr) {
                waitsc();
            }

            if (typeof mDBcls === 'function') {
                mDBcls(); // close fmdb
            }
        }

        if (page.substr(0, 5) === "chat/") {
            id = page;
            page = "chat";
            if (u_type === false) {
                anonymouschat = true;
                u_handle = "AAAAAAAAAAA";
                pchandle = id.substr(5, 8);

                loadingInitDialog.show();
                init_chat(0x104DF11E5);
            }
            else if (u_type === 0) {
                // ephemeral
                mega.ui.sendSignupLinkDialog({}, false);
            }
            else {
                anonymouschat = false;
                pchandle = false;
            }
        }

        if (!fminitialized) {
            if (id) {
                M.currentdirid = id;
            }
            if (is_mobile) {
                $('#fmholder').safeHTML(translate(pages['mobile'].replace(/{staticpath}/g, staticpath)));
            }
            else if ($('#fmholder').html() === '') {
                $('#fmholder').safeHTML(translate(pages['fm'].replace(/{staticpath}/g, staticpath)));
            }

            if (!anonymouschat) {
                mega.initLoadReport();
                loadfm();
            }
        }
        else if ((!pfid || flhashchange) && (id && id !== M.currentdirid || page === 'start')) {
            M.openFolder(id, true);
        }
        else {
            if (ul_queue.length > 0) {
                M.openTransfersPanel();
            }

            if (u_type === 0 && !u_attr.terms) {
                $.termsAgree = function () {
                    u_attr.terms = 1;
                    api_req({ a: 'up', terms: 'Mq' });
                    // queued work is continued when user accept terms of service
                    $('.transfer-pause-icon').removeClass('active');
                    $('.nw-fm-left-icon.transfers').removeClass('paused');
                    dlQueue.resume();
                    ulQueue.resume();
                    uldl_hold = false;
                    if (ul_queue.length > 0) {
                        M.showTransferToast('u', ul_queue.length);
                    }
                };

                $.termsDeny = function () {
                    loadingDialog.show();
                    ulmanager.abort(null);
                    Soon(function() {
                        u_logout();
                        location.reload();
                    });
                };

                dlQueue.pause();
                ulQueue.pause();
                uldl_hold = true;

                if (!is_mobile) {
                    bottomPageDialog(false, 'terms'); // show terms dialog
                }
            }
        }
        $('#topmenu').safeHTML(parsetopmenu());

        $('#pageholder, #startholder').addClass('hidden');

        // Prevent duplicate HTML content breaking things
        // what a strange solution!  [emptying #startholder!]
        // we should have fixed duplicated classes, ids in the html..
        if (is_mobile) {
            $('#startholder').empty();
        }

        $('.nw-fm-left-icons-panel').removeClass('hidden');
        if ($('#fmholder:visible').length == 0) {
            if (anonymouschat) {
                $('.nw-fm-left-icons-panel').addClass('hidden');
                $('.top-head .logo').css("display", "block");
            }
            $('#fmholder').removeAttr('style').removeClass('hidden');
            if (fminitialized && !is_mobile) {
                M.addViewUI();

                if ($.transferHeader) {
                    $.transferHeader();
                }
            }
        }

        if (!is_mobile && typeof fdl_queue_var !== 'undefined') {
            if (!$('.transfer-table tr#dl_' + Object(fdl_queue_var).ph).length) {
                var fdl = dlmanager.getDownloadByHandle(Object(fdl_queue_var).ph);
                if (fdl && fdl_queue_var.dlkey === dlpage_key) {

                    Soon(function () {
                        M.putToTransferTable(fdl);
                        M.onDownloadAdded(1, dlQueue.isPaused(dlmanager.getGID(fdl)));

                        fdl.onDownloadProgress = M.dlprogress;
                        fdl.onDownloadComplete = M.dlcomplete;
                        fdl.onBeforeDownloadComplete = M.dlbeforecomplete;
                        fdl.onDownloadError = M.dlerror;
                    });
                }
            }
        }
        if (megaChatIsDisabled) {
            $(document.body).addClass("megaChatDisabled");
        }
        pagemetadata();
    }
    else if (page.substr(0, 2) == 'fm' && !u_type) {
        if (loggedout || u_type === false) {
            loadSubPage('start');
            return false;
        }
        login_next = page;
        login_txt = l[1298];
        loadSubPage('login');
    }
    else if (typeof init_start === 'function') {
        page = 'start';

        // Show the start/homepage
        parsepage(pages['start'], 'start');
        init_start();
    }
    else {
        location.assign('/');
    }

    // Initialise the Public Service Announcement system if loaded
    if (typeof psa !== 'undefined') {
        psa.init();
    }

    // Initialise the update check system
    if (typeof alarm !== 'undefined') {
        alarm.siteUpdate.init();
    }

    // Hide click-tooltip
    if (mega.cttHintTimer) {
        M.hideClickHint();
    }

    topmenuUI();

    loggedout = false;
    flhashchange = false;

    onIdle(blockChromePasswordManager);
}

function topmenuUI() {
    'use strict';

    var $topMenu = $('.top-menu-popup');
    var $topHeader = $('.top-head');

    if (u_type === 0) {
        $topHeader.find('.top-login-button').text(l[967]);
    }

    $topMenu.find('.top-menu-item.upgrade-your-account,.top-menu-item.backup').addClass('hidden');
    $topMenu.find('.top-menu-item.start').removeClass('hidden');
    $topMenu.find('.top-menu-item.fm').addClass('hidden');
    $topMenu.find('.top-menu-item.logout').addClass('hidden');
    $topMenu.find('.top-menu-item.register,.top-menu-item.login').addClass('hidden');
    $topMenu.find('.top-menu-item.account').addClass('hidden');
    $topMenu.find('.top-menu-item.refresh-item').addClass('hidden');
    $topHeader.find('.top-icon.warning').addClass('hidden');
    $topHeader.find('.activity-status-block .activity-status,.activity-status-block').addClass('hidden');
    $topHeader.find('.membership-status-block i').attr('class', 'tiny-icon membership-status free');
    $topHeader.find('.membership-status, .top-head .user-name, .top-icon.achievements').addClass('hidden');
    $topHeader.find('.left.individual').text(l[19702]); // try Mega Business
    $topHeader.find('.left.individual').removeClass('hidden');

    if (fminitialized) {
        $topHeader.find('.top-search-bl').removeClass('hidden');
        $topHeader.find('.top-icon.notification').removeClass('hidden');
    }
    else {
        $topHeader.find('.top-search-bl').addClass('hidden');
        $topHeader.find('.top-icon.notification').addClass('hidden');
    }

    if (folderlink) {
        $topHeader.find('.top-icon.notification').addClass('hidden');
    }
    if (page === 'download') {
        $topMenu.find('.top-menu-item.refresh-item').removeClass('hidden');
    }
    if (page === 'business' || page ==='registerb') {
        $topHeader.find('.left.individual').text(l[19529]); // try Mega MEGA Indivisual
    }

    var avatar = window.useravatar && useravatar.mine();
    if (!avatar) {
        $topHeader.find('.fm-avatar').addClass('hidden');
    }

    // Show active item in main menu
    var section = page.split('/')[0];
    if (section === 'fm') {
        section = page.split('/')[1];
    }

    // Get all menu items
    var $topMenuItems = $topMenu.find('.top-menu-item');

    // Remove red bar from all menu items
    $topMenuItems.removeClass('active');

    // If in mobile My Account section, show red bar
    if (is_mobile && page.indexOf('fm/account') === 0) {
        $topMenuItems.filter('.account').addClass('active');
    }
    // If in mobile Cloud Drive, show red bar
    else if (is_mobile && page.indexOf('fm') === 0) {
        $topMenuItems.filter('.fm').addClass('active');
    }
    else if (section) {
        // just in case, a payment provider appended any ?returnurl vars
        section = section.split("?")[0];
        section = section.replace(/[^a-zA-Z\-\_]/g, "");

        var $menuItem = $topMenuItems.filter('.' + section);
        $menuItem.addClass('active');

        if ($menuItem.parent('.top-submenu').length) {
            $menuItem.parent('.top-submenu').prev().addClass('expanded');
        }
        $menuItem = undefined;
    }

    if (u_type === 3 && u_attr.fullname) {
        $topHeader.find('.user-name').text(u_attr.fullname).removeClass('hidden');
    }

    // Show language in top menu
    $topMenu.find('.top-menu-item.languages .right-el').text(lang);

    // Show version in top menu
    var $versionButton = $topMenu.find('.top-mega-version').text('v. ' + M.getSiteVersion());
    var versionClickCounter = 0;
    var versionClickTimeout = null;
    $versionButton.rebind('click', function() {
        clearTimeout(versionClickTimeout);
        if (++versionClickCounter >= 3) {
            mega.developerSettings.show();
        }
        versionClickTimeout = setTimeout(function() {
            versionClickCounter = 0;
        }, 1000);
    });

    if (u_type) {
        $('body').removeClass('not-logged').addClass('logged');

        $topMenu.find('.top-menu-item.start').addClass('hidden');
        $topMenu.find('.top-menu-item.fm').removeClass('hidden');
        $topMenu.find('.top-menu-item.logout,.top-menu-item.backup').removeClass('hidden');
        $topMenu.find('.top-menu-item.account').removeClass('hidden');
        $topMenu.find('.upgrade-your-account').removeClass('hidden');
        // for top menu, load avatar and show for logged in user
        useravatar.loadAvatar(u_handle).always(function(){
            $topHeader.find('.fm-avatar').safeHTML(useravatar.contact(u_handle));
        });

        $topHeader.find('.top-login-button').addClass('hidden');
        $topHeader.find('.membership-status').removeClass('hidden');
        $topHeader.find('.top-change-language').addClass('hidden');
        $topHeader.find('.create-account-button').addClass('hidden');
        $topHeader.find('.membership-status-block').removeClass('hidden');
        $topHeader.find('.left.individual').addClass('hidden');

        // Show the rocket icon if achievements are enabled
        mega.achievem.enabled()
            .done(function () {
                $topHeader.find('.top-icon.achievements').removeClass('hidden');
            })
            .fail(function () {
                $topHeader.find('.top-icon.achievements').addClass('hidden');
            });

        // If a Lite/Pro plan has been purchased
        if (u_attr.p) {

            // Set the plan text
            var proNum = u_attr.p;
            var purchasedPlan = pro.getProPlanName(proNum);

            // Set colour of plan and body class
            var cssClass;
            $('body').removeClass('free lite');

            if (proNum === 4) {
                cssClass = 'lite';
                $('body').addClass('lite');
            } else {
                cssClass = 'pro' + proNum;
            }

            // Show the Pro badge
            $topMenu.find('.top-menu-item.account .right-el').text(purchasedPlan);
            $topHeader.find('.membership-status-block i').attr('class', 'tiny-icon membership-status ' + cssClass);
        }
        else {
            // Show the free badge
            $('.top-menu-item.account .right-el', $topMenu).addClass('free-account').text(l[1150]);
            $topHeader.find('.membership-status').attr('class', 'tiny-icon membership-status free');
            $('body').removeClass('lite').addClass('free');
        }

        if (is_fm()) {
            $topMenu.find('.top-menu-item.refresh-item').removeClass('hidden');
        }

        // If the chat is disabled don't show the green status icon in the header
        if (!pfid && !megaChatIsDisabled) {
            $topHeader.find('.activity-status-block, .activity-status-block .activity-status').removeClass('hidden');
            if (megaChatIsReady) {
                megaChat.renderMyStatus();
            }
        }

        // if this is a business account sub-user
        if (u_attr && u_attr.b && u_attr.b.s !== -1) {
            $topHeader.find('.top-icon.achievements').addClass('hidden');
            $topMenu.find('.upgrade-your-account').addClass('hidden');
            $topMenu.find('.resellers').addClass('hidden');
        }

        // Show PRO plan expired warning popup (if applicable)
        alarm.planExpired.render();
    }
    else {
        if (u_type !== 0) {
            $('body').removeClass('logged').addClass('not-logged');
        }
        else if (!confirmok && page !== 'key') {

            $topMenu.find('.top-menu-item.register').text(l[968]);

            // If they have purchased Pro but not activated yet, show a warning
            if (isNonActivatedAccount()) {
                alarm.nonActivatedAccount.render();
            }

            // Otherwise show the ephemeral session warning
            else if (($.len(M.c[M.RootID] || {})) && (page !== 'register')) {
                if (alarm.ephemeralSession) {
                    alarm.ephemeralSession.render();
                }
            }
        }

        $topMenu.find('.top-menu-item.upgrade-your-account.pro').removeClass('hidden');
        $topHeader.find('.membership-status-block').addClass('hidden');
        $topHeader.find('.top-icon.notification').addClass('hidden');
        $topHeader.find('.top-icon.achievements').addClass('hidden');
        $topHeader.find('.create-account-button').removeClass('hidden');

        if (u_type === 0 && is_fm()) {
            $topHeader.find('.left.individual').addClass('hidden');
        }

        $('.create-account-button').rebind('click', function () {
            if ($(this).hasClass('business-reg')) {
                loadSubPage('registerb');
            }
            else {
                loadSubPage('register');
            }
        });
        $topHeader.find('.top-login-button').removeClass('hidden');
        $('.top-login-button').rebind('click', function () {
            if (u_type === 0) {
                mLogout();
            }
            else {
                var c = $topHeader.find('.dropdown.top-login-popup').attr('class');
                if (c && c.indexOf('hidden') > -1) {
                    tooltiplogin.init();
                }
                else {
                    tooltiplogin.init(1);
                }
            }
        });

        // Only show top language change icon if not logged in
        if (u_type === false) {

            // Get current language
            var $topChangeLang = $('.top-change-language', $topHeader);
            var $topChangeLangName = $topChangeLang.find('.top-change-language-name');

            //TODO: Change translated values on short translated
            //var languageName = ln[lang];

            // Init the top header change language button
            $topChangeLangName.text(lang);
            $topChangeLang.removeClass('hidden');
            $topChangeLang.rebind('click', function () {

                // Add log to see how often they click to change language
                api_req({ a: 'log', e: 99600, m: 'Language menu opened from top header' });

                // Open the language dialog
                langDialog.show();
            });
        }

        $topMenu.find('.top-menu-item.register,.top-menu-item.login').removeClass('hidden');

        if (u_type === 0) {
            $topMenu.find('.top-menu-item.login').addClass('hidden');
            $topMenu.find('.top-menu-item.logout').removeClass('hidden');
        }
    }

    $.hideTopMenu = function (e) {

        var c;

        if (e) {
            c = $(e.target).attr('class');
        }
        if (!e || ($(e.target).parents('.top-menu-popup').length == 0
            && !$(e.target).hasClass('top-menu-popup')
            && ((c && c.indexOf('top-icon menu') == -1) || !c))) {
            topMenu(1);
        }
        if (!e || ($(e.target).parents('.top-warning-popup').length == 0
            && !$(e.target).hasClass('top-menu-popup')
            && ((c && c.indexOf('top-icon warning') == -1) || !c))) {
            $topHeader.find('.top-warning-popup').addClass('hidden');
            $topHeader.find('.top-icon.warning').removeClass('active');
        }
        if (!e || ($(e.target).parents('.top-user-status-popup').length == 0
            && ((c && c.indexOf('activity-status') == -1 && c.indexOf('loading') == -1) || !c))) {
            $topHeader.find('.top-user-status-popup').addClass('hidden');
            $topHeader.find('.activity-status-block').removeClass('active');
        }
        if (!e || ($(e.target).parents('.notification-popup').length == 0
            && ((c && c.indexOf('top-icon notification') == -1) || !c))) {

            if (typeof notify === 'object') {
                notify.closePopup();
            }
        }
        if (!e || ($(e.target).parents('.dropdown.top-login-popup').length == 0
            && ((c && c.indexOf('top-login-button') == -1) || !c))) {
            $topHeader.find('.dropdown.top-login-popup').addClass('hidden');
        }
        if ((!e || $(e.target).parents('.create-new-folder').length == 0)
            && (!c || c.indexOf('fm-new-folder') == -1)) {
            var c3;
            if (e && e.target) {
                c3 = $(e.target).parent().attr('class');
            }
            if (!c3 || c3.indexOf('fm-new-folder') == -1) {
                $('.fm-new-folder').removeClass('active filled-input');
                $('.create-new-folder').addClass('hidden');
            }
        }
        if ((!e || $(e.target).parents('.fm-add-user,.add-user-popup').length == 0)
            && (!c || c.indexOf('fm-add-user') == -1)) {
            $('.fm-add-user').removeClass('active');
            $('.add-user-popup').addClass('hidden');
            $('.add-user-popup').removeAttr('style');
        }
    };

    $('#pageholder, #startholder').rebind('click.hidetopmenu', function(e) {
        if (typeof $.hideTopMenu === 'function') {
            $.hideTopMenu(e);
        }
    });

    $topHeader.find('.top-icon.achievements').rebind('click', function () {
        mega.achievem.achievementsListDialog();
    });

    // try individual button in business mode
    $topHeader.find('.top-centered-margin .individual').rebind('click', function () {
        if (page === 'business' || page === 'registerb') {
            loadSubPage('start');
        }
        else {
            loadSubPage('business');
        }
    });

    $('.top-icon.menu, .top-icon.close').rebind('click', function () {
        topMenu();
    });

    $topMenu.find('.top-icon.close').rebind('click', function () {
        topMenu(1);
    });

    $topHeader.find('.activity-status-block').rebind('click.topui', function (e) {
        var $this = $(this);
        if ($this.attr('class').indexOf('active') == -1) {
            $this.addClass('active');
            $topHeader.find('.top-user-status-popup')
                .removeClass('hidden')
                .find('.dropdown-item').show();
            topPopupAlign('.activity-status-block', '.top-user-status-popup', 40);
        }
        else {
            $this.removeClass('active');
            $topHeader.find('.top-user-status-popup').addClass('hidden');
        }
    });
    $topHeader.find('.top-user-status-popup .dropdown-item')
        .rebind('click.topui', function (e) {
            if ($(this).attr('class').indexOf('active') == -1) {
                $topHeader.find('.top-user-status-popup .dropdown-item')
                    .removeClass('active');
                $(this).addClass('active');
                $topHeader.find('.activity-status-block .activity-status')
                    .attr('class', 'top ' + $(this).find('.activity-status').attr('class'));
                $topHeader.find('.activity-status-block').removeClass('active');

                $topHeader.find('.top-user-status-popup').addClass('hidden');

                if (!megaChatIsReady && !megaChatIsDisabled) {
                    var presence = $(this).data("presence");
                    localStorage.megaChatPresence = presence;
                    localStorage.megaChatPresenceMtime = unixtime();

                    $topHeader.find('.activity-status-block').addClass("fadeinout");
                    loadSubPage('fm/chat');
                }
            }
        });

    $topMenu.find('.top-menu-item').rebind('click', function () {
        var className = $(this).attr('class') || '';

        if (className.indexOf('submenu-item') > -1) {
            if (className.indexOf('expanded') > -1) {
                $(this).removeClass('expanded');
            } else {
                $(this).addClass('expanded');
            }
            if (!is_mobile) {
                setTimeout(topMenuScroll, 200);
            }
        }
        else {
            if ($('.light-overlay').is(':visible')) {
                loadingInitDialog.hide();
            }
            topMenu(1);

            var subpage;
            var subPages = [
                'about', 'account', 'backup', 'blog', 'cmd', 'contact',
                'copyright', 'corporate', 'credits', 'doc', 'extensions',
                'help', 'login', 'mega', 'bird', 'privacy', 'gdpr', 'mobileapp','mobile', 'privacycompany',
                'register', 'resellers', 'sdk', 'sync', 'sitemap', 'sourcecode', 'support',
                'sync', 'takedown', 'terms', 'start', 'uwp', 'security', 'downloadapp'
            ];
            var moveTo = {'account': 'fm/account'};

            for (var i = subPages.length; i--;) {
                if (className.indexOf(subPages[i]) > -1) {
                    subpage = subPages[i];
                    break;
                }
            }

            if (className.indexOf('upgrade-your-account') > -1) {
                loadSubPage('pro');
            }
            else if (is_mobile && className.indexOf('fm') > -1) {
                mobile.loadCloudDrivePage();
            }
            else if (subpage === 'backup') {
                M.showRecoveryKeyDialog(2);
            }
            else if (subpage) {
                // Clear login_next variable before load subpages each time
                login_next = false;
                loadSubPage(moveTo[subpage] || subpage);
            }
            else if (className.indexOf('feedback') > -1) {
                // Show the Feedback dialog
                var feedbackDialog = mega.ui.FeedbackDialog.singleton($(this));
                feedbackDialog._type = 'top-button';
            }
            else if (className.indexOf('refresh') > -1) {
                M.reload();
            }
            else if (!is_mobile && className.indexOf('languages') > -1) {
                langDialog.show();
            }
            else if (className.indexOf('logout') > -1) {
                mLogout();
            }
            else if (className.indexOf('transparency') > -1) {
                window.open('https://mega.nz/Mega_Transparency_Report_201909.pdf', '_blank');
            }
        }
        return false;
    });

    $topMenu.find('.top-social-bl a').rebind('click', function (e) {
        e.preventDefault();
        window.open($(this).attr('href'));
    });

    // Initialise the language sub menu for mobile
    if (is_mobile) {
        mobile.languageMenu.init();
    }

    $topHeader.find('.top-search-bl').rebind('click', function () {
        if ($.trim($('.top-search-input').val()) === "") {
            $(this).addClass('active');
            $('.top-search-input').trigger("focus");
        }
    });

    $topHeader.find('.top-search-input').rebind('blur', function () {
        $(this).closest('.top-search-bl').removeClass('active');
        if ($(this).val() == '') {
            $topHeader.find('.top-search-bl').removeClass('contains-value');
            $topHeader.find('.top-search-button').addClass('hidden');
            $topHeader.find('.top-clear-button').addClass('hidden');
        }
        else {
            $topHeader.find('.top-search-bl').addClass('contains-value');
            $topHeader.find('.top-search-button').addClass('hidden');
            $topHeader.find('.top-clear-button').removeClass('hidden');
        }
    });

    $topHeader.find('.top-clear-button').rebind('click', function (e) {

        // stop propaation to not calling .top-search-bl click
        e.stopPropagation();

        // if this is folderlink, open folderlink root;
        if (folderlink) {
            M.nn = false;
            M.openFolder();
        }
        $topHeader.find('.top-search-bl').removeClass('contains-value active');
        $topHeader.find('.top-clear-button').removeClass('hidden');
        $topHeader.find('.top-search-input').val('').trigger('blur');
        // if current page is search result reset it.
        if (page.indexOf('/search/') !== -1) {
            loadSubPage(page.slice(0, page.indexOf('/search/')));
        }
    });

    $topHeader.find('.top-search-input').rebind('focus', function () {
        if ($(this).closest('.top-search-bl').hasClass('active')) {
            $topHeader.find('.top-search-button').removeClass('hidden');
            $topHeader.find('.top-clear-button').addClass('hidden');
        }
    });

    $topHeader.find('#search-fake-form').rebind('submit', function () {
        return false;
    })

    $topHeader.find('.top-search-button').rebind('click mousedown', function _topSearchHandler() {
        var val = $.trim($('.top-search-input').val());

        // if current page is search and value is empty result move to root.
        if (!val && page.indexOf('/search/') !== -1) {
            $topHeader.find('.top-clear-button').addClass('hidden');
            loadSubPage(page.slice(0, page.indexOf('/search/')));
        }
        else if (val.length > 2 || !asciionly(val)) {
            var $this = $(this);

            M.fmSearchNodes(val).then(function() {
                $this.trigger('blur');
            });
        }
    });

    // Press enter to start searching
    $topHeader.find('.top-search-input').rebind('keyup', function(e) {
        if (e.keyCode === 13) {
            $topHeader.find('.top-search-button').click();
        }
    });

    // Hover tooltip for top-menu elements and sidebar icons
    $('.nw-fm-left-icon, .top-icon').rebind('mouseover.nw-fm-left-icon', function () {
        var $this = $(this);
        var $tooltip = $this.find('.dark-tooltip');
        var tooltipPos;
        var tooltipWidth;
        var buttonPos;

        if ($.liTooltipTimer) {
            clearTimeout($.liTooltipTimer);
        }
        $.liTooltipTimer = window.setTimeout(
            function () {
                if ($tooltip.hasClass('top')) {
                    tooltipWidth = $tooltip.outerWidth();
                    buttonPos = $this.position().left;
                    tooltipPos = buttonPos + $this.outerWidth() / 2 - tooltipWidth / 2;
                    if ($('body').width() - (tooltipPos + tooltipWidth) > 0) {
                        $tooltip.css({
                            'left': tooltipPos,
                            'right': 'auto'
                        });
                    }
                    else {
                        $tooltip.css({
                            'left': 'auto',
                            'right': 0
                        });
                    }
                }
                $tooltip.addClass('hovered');
            }, 1000);
    })
        .rebind('mouseout.nw-fm-left-icon', function () {
            $(this).find('.dark-tooltip').removeClass('hovered');
            clearTimeout($.liTooltipTimer);
        });

    $topHeader.find('.fm-avatar').rebind('click', function () {

        // If the user has an avatar already set, take them to the profile page where they can change or remove it
        if ($(this).find('img').length > 0) {
            loadSubPage('fm/account');
        }
        else {
            // Otherwise if they don't have an avatar, open the change avatar dialog;
            avatarDialog();
        }
    });

    // If the user name in the header is clicked, take them to the account overview page
    $topHeader.find('.user-name').rebind('click', function () {
        loadSubPage('fm/account');
    });

    // If the main Mega M logo in the header is clicked
    $('.top-head, .fm-main, .bar-table').find('.logo').rebind('click', function () {
        if (typeof loadingInitDialog === 'undefined' || !loadingInitDialog.active) {
            if (folderlink) {
                M.openFolder(M.RootID, true);
            }
            else {
                loadSubPage(typeof u_type !== 'undefined' && parseInt(u_type) > 2 ? 'fm' : 'start');
            }
        }
    });

    /**
     * this is closing the EFQ email confirm dialog, if needed for something else ask before re-enabling [dc]
    if (!$('.fm-dialog.registration-page-success').hasClass('hidden')) {
        $('.fm-dialog.registration-page-success').addClass('hidden');
        $('.fm-dialog-overlay').addClass('hidden');
        $('body').removeClass('overlayed');
    }*/

    /**
     * why was this needed here?
    if (ulmanager.isUploading || dlmanager.isDownloading) {
        $('.widget-block').removeClass('hidden');
    }*/

    $('.widget-block').rebind('click', function (e) {
        if ($.infoscroll && page == 'download') {
            startpageMain();
        }
        else if ($.dlhash) {
            // XXX TODO FIXME check this
            loadSubPage($.dlhash);
        }
        else if (folderlink && M.lastSeenFolderLink) {
            mBroadcaster.once('mega:openfolder', SoonFc(function () {
                $('.nw-fm-left-icon.transfers').click();
            }));
            loadSubPage(M.lastSeenFolderLink);
        }
        else {
            loadSubPage('fm');
        }
    });

    if (String(M.currentdirid).substr(0, 7) === 'search/' && M.currentdirid[7] !== '~') {
        $topHeader.find('.top-search-bl').addClass('contains-value');
        $topHeader.find('.top-clear-button').removeClass("hidden");
        var searchVal = M.currentdirid.substr(7);
        if (hashLogic) {
            searchVal = decodeURIComponent(searchVal);
        }
        $topHeader.find('.top-search-bl input').val(searchVal);
    }

    // Initialise the header icon for mobile
    if (is_mobile) {
        mobile.initHeaderMegaIcon();
    }

    // Initialise notification popup and tooltip
    if (typeof notify === 'object') {
        notify.init();
    }

    if (u_type === 3 && mega.ui.passwordReminderDialog) {
        if (is_mobile) {
            mega.ui.passwordReminderDialog.prepare();
        }
        else {
            mega.ui.passwordReminderDialog.onTopmenuReinit();
        }
    }
}

function is_fm() {
    var r = !!pfid;

    if (!r && (u_type !== false)) {
        r = page === '' || page === 'start' || page === 'index'
            || page.substr(0, 2) === 'fm' || page.substr(0, 7) === 'account';
    }

    if (!r && (page.substr(0, 5) === 'chat/' || page === "chat")) {
        r = true;
    }

    if (d > 2) {
        console.warn('is_fm', r, page, hash);
    }

    return r;
}

/**
 *  Process a given template (which has been loaded already in `pages[]`)
 *  and return the translated HTML code.
 *
 *  @param {String} name    Template name
 *  @returns {String}       The HTML ready to be used
 */
function getTemplate(name) {

    return translate('' + pages[name]).replace(/{staticpath}/g, staticpath);
}

function pagemetadata() {
    var mega_desc = false;

    if (page === 'uwp') {
        mega_title = 'Windows 10 app - MEGA';
    }
    else if (page === 'mobileapp') {
        mega_title = 'MEGA - Mobile Apps';
        mega_desc = 'Securely manage your files and collaborate everyone from anywhere.';
    }
    else if (page == 'sync') {
        mega_title = 'MEGAsync - Download';
        mega_desc = 'MEGAsync securely synchronizes data between your computer and your MEGA account. Available for Windows, Mac and Linux.';
    }
    else if (page == 'extensions') {
        mega_title = 'Browser Extensions - MEGA';
    }
    else if (page == 'bird') {
        mega_title = 'MEGAbird - Download';
    }
    else if (page == 'cmd') {
        mega_title = 'MEGAcmd - Download';
        mega_desc = 'MEGAcmd is an interactive, text console based, scriptable MEGA client.';
    }
    else if (page === 'downloadapp') {
        mega_title = 'Download our App';
        mega_desc = 'MEGAcmd is an interactive, text console based, scriptable MEGA client.';
    }
    else if (page == 'pro') {
        mega_title = 'Plans & pricing - MEGA';
        mega_desc = 'Upgrade to a MEGA PRO account for additional storage and transfer quota. MEGA provides one the cheapest cloud storage deals on the Internet.';
    }
    else if (page == 'register') {
        mega_title = 'Register - MEGA';
        mega_desc = 'Create your free MEGA account and get free 50 GB.';
    }
    else if (page == 'login') {
        mega_title = 'Login - MEGA';
    }
    else if (page == 'recovery') {
        mega_title = 'Recovery - MEGA';
        mega_desc = 'Forgot your MEGA password? Start your recovery process here.';
    }
    else if (page == 'terms') {
        mega_title = 'Terms of Service - MEGA';
    }
    else if (page == 'privacy') {
        mega_title = 'Privacy Policy - MEGA';
    }
    else if (page === 'gdpr') {
        mega_title = l[18421] + ' - MEGA';
    }
    else if (page == 'copyright') {
        mega_title = 'Copyright - MEGA';
    }
    else if (page == 'takedown') {
        mega_title = 'Takedown Guidance - MEGA';
    }
    else if (typeof Object(window.dlmanager).isStreaming === 'object') {
        mega_title = 'MEGA - ' + dlmanager.isStreaming._megaNode.name;
    }
    else {
        mega_title = 'MEGA';
    }
    if (!mega_desc) {
        mega_desc = mega.whoami;
    }
    $('meta[name=description]').remove();
    $('head').append('<meta name="description" content="' + String(mega_desc).replace(/[<">]/g, '') + '">');
    document.title = mega_title;
    megatitle();
}


function parsepage(pagehtml) {
    'use strict';

    var $body = $('body').removeClass('ads');
    $('#fmholder, #pageholder, #startholder').addClass('hidden');
    pagemetadata();

    pagehtml = translate('' + pagehtml).replace(/{staticpath}/g, staticpath);

    if (pagehtml.indexOf('((MEGAINFO))') > -1) {
        pagehtml = pagehtml.replace(/\(\(MEGAINFO\)\)/g, translate(pages.megainfo));
    }
    if (pagehtml.indexOf('((TOP))') > -1) {
        pagehtml = pagehtml.replace(/\(\(TOP\)\)/g, parsetopmenu());
    }
    if (pagehtml.indexOf('((BOTTOM))') > -1) {
        pagehtml = pagehtml.replace(/\(\(BOTTOM\)\)/g, translate(pages.bottom2));
    }
    if (pagehtml.indexOf('((PAGESMENU))') > -1) {
        pagehtml = pagehtml.replace(/\(\(PAGESMENU\)\)/g, translate(pages.pagesmenu));
    }
    if (is_chrome_web_ext || is_firefox_web_ext) {
        pagehtml = pagehtml.replace(/\/#/g, '/' + urlrootfile + '#');
    }

    if (!$.mTransferWidgetPage) {
        $.mTransferWidgetPage = translate(pages.transferwidget);
    }
    pagehtml = ($.mTransferWidgetPage + pagehtml).replace(/{staticpath}/g, staticpath);

    $('#startholder').safeHTML('<div class="nav-overlay"></div>' + pagehtml).removeClass('hidden');

    $body.addClass('bottom-pages');
    $('body, html, .bottom-pages .fmholder').stop(true, true).scrollTop(0);
    bottompage.init();

    if (typeof M.initUIKeyEvents === 'function') {
        M.initUIKeyEvents();
    }
    onIdle(clickURLs);
    onIdle(scrollToURLs);
    onIdle(topmenuUI);
}

function parsetopmenu() {
    var top;

    if (is_mobile) {
        top = pages['top-mobile'].replace(/{staticpath}/g, staticpath);
    }
    else {
        top = pages['top'].replace(/{staticpath}/g, staticpath);
    }
    if (is_chrome_web_ext || is_firefox_web_ext) {
        top = top.replace(/\/#/g, '/' + urlrootfile + '#');
    }
    top = top.replace("{avatar-top}", window.useravatar && useravatar.mine() || '');
    top = translate(top);
    return top;
}


function loadSubPage(tpage, event) {
    pagemetadata();
    tpage = getCleanSitePath(tpage);

    if (typeof dlPageCleanup === 'function' && tpage[0] !== '!') {
        dlPageCleanup();
    }

    if (silent_loading) {
        return false;
    }

    if (window.slideshowid) {
        slideshow(0, 1);
    }

    if (window.textEditorVisible) {
        // if we are loading a page and text editor was visible, then hide it.
        // eslint-disable-next-line no-unused-expressions
        mega && mega.textEditorUI && mega.textEditorUI.doClose();
    }

    if (window.versiondialogid) {
        fileversioning.closeFileVersioningDialog(window.versiondialogid);
    }

    if (folderlink) {
        flhashchange = true;
    }

    if ((tpage === page) && !folderlink) {
        return false;
    }

    // TODO: check what this was for and its relevance
    var overlay = document.getElementById('overlay');
    if (overlay && overlay.style.display == '' && !is_fm()) {
        document.location.hash = hash;
        return false;
    }

    dlid = false;

    if (tpage) {
        page = tpage;
    }
    else {
        page = '';
    }

    if (page) {
        for (var p in subpages) {
            if (page.substr(0, p.length) === p) {
                for (var i in subpages[p]) {
                    if (!jsl_loaded[jsl2[subpages[p][i]].n]) {
                        jsl.push(jsl2[subpages[p][i]]);
                    }
                }
            }
        }
    }

    if (hashLogic || isPublicLink(page)) {
        document.location.hash = '#' + page;
    }
    else if (!event || event.type !== 'popstate') {
        var isSearch = page.indexOf('fm/search/');
        if (isSearch >= 0) {
            var searchString = page.substring(isSearch + 10);
            var tempPage = page.substring(0, isSearch + 10);
            history.pushState({ subpage: tempPage, searchString: searchString }, "", "/" + tempPage);
        }
        else {
            history.pushState({ subpage: page }, "", "/" + page);
        }
    }

    // since hash changing above will fire popstate event, which in its turn will call
    // loadsubpage again. We will end up in folderlinks issue when they are decrypted with a provided key.
    if (page !== '' && page !== tpage) {
        if (d) {
            console.warn('LoadSubPage arrived to IF statement proving race-condition');
        }
        return false;
    }

    if (jsl.length > 0) {
        loadingDialog.show();
        jsl_start();
    }
    else {
        init_page();
    }
    mBroadcaster.sendMessage('pagechange');
}


window.onhashchange = function () {
    if (window.skipHashChange) {
        delete window.skipHashChange;
        return false;
    }
    if (hashLogic) {
        hash = getCleanSitePath(location.hash);
        if (hash !== page) {
            loadSubPage(hash);
        }
    }
};

window.onbeforeunload = function () {
    if (dlmanager.isDownloading || ulmanager.isUploading) {
        return $.memIOSaveAttempt ? null : l[377];
    }

    mBroadcaster.crossTab.leave();
};

window.onunload = function () {
    mBroadcaster.crossTab.leave();

    if (typeof dlpage_ph === 'string') {
        // Clear the download activity flag navigating away on the downloads page.
        dlmanager.dlClearActiveTransfer(dlpage_ph);
    }
};

mBroadcaster.once('boot_done', function () {
    M = new MegaData();
    attribCache = new IndexedDBKVStorage('ua', { murSeed: 0x800F0002 });
    attribCache.bitMapsManager = new MegaDataBitMapManager();
});

// After open folder call, check if we should restore any previously opened preview node.
mBroadcaster.once('mega:openfolder', function() {
    'use strict';

    if (sessionStorage && sessionStorage.previewNode) {
        var previewNode = sessionStorage.previewNode;
        sessionStorage.removeItem('previewNode');
        (is_mobile ? mobile.slideshow.init : slideshow)(previewNode);
    }
});
