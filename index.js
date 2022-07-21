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
var pwchangecode = false;
var resetpwcode = false;
var resetpwemail = '';
var mobileparsed = false;
var mobilekeygen = false;
var subdirid = false;
var subsubdirid = false;
var unread;
var account = false;
var register_txt = false;
var login_next = false;
var loggedout = false;
var flhashchange = false;
var is_chatlink = false;
var avatars = {};
var mega_title = 'MEGA';

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

    // Set class if gbot
    if (is_bot) {
        document.documentElement.classList.add('gbot');
    }
    else {
        document.documentElement.classList.remove('gbot');
    }

    // Add language class to body for CSS fixes for specific language strings
    document.body.classList.add(lang);

    if (({'fa': 1,'ar': 1,'he': 1})[lang]) {
        document.body.classList.add('rtl');
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

    if ((p = document.querySelector('.media-viewer .content'))) {
        mCreateElement('iframe', {type: 'content', 'class': 'hidden', src: 'about:blank', id: 'pdfpreviewdiv1'}, p);
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
    'use strict';

    let $currentContainer;
    const fmholder = document.getElementById('fmholder');

    // If #startholder is visible, #fmholder is not
    if (fmholder.classList.contains('hidden') || fmholder.style.display === 'none') {
        $currentContainer = $('#startholder');
    }
    else {
        $currentContainer = $(fmholder);
    }

    var $topMenuBtn = $('.js-more-menu', $currentContainer);
    var $topMenu = $('.top-menu-popup', $currentContainer);
    var $scrollBlock = $('.top-menu-scroll', $topMenu);
    var $mobileOverlay = $('.mobile.dark-overlay', 'body');

    if (close) {
        $.topMenu = '';
        $topMenuBtn.removeClass('menu-open');

        $topMenu.addClass('o-hidden');

        // If on mobile, hide the menu and also remove the close click/tap handler on the dark background overlay
        if (is_mobile) {
            $('html').removeClass('overlayed');
            $mobileOverlay.addClass('hidden').removeClass('active').unbind('tap.topmenu');
        }
        $(window).off('resize.topmenu');
    }
    else {
        $.topMenu = 'topmenu';
        $topMenuBtn.addClass('menu-open');
        $topMenu.removeClass('o-hidden');

        if (u_type) {
            const $menuAvatar = $('.avatar-block', $topMenu);
            if (!$menuAvatar.hasClass('rendered')) {
                $menuAvatar.addClass('rendered');
                $('.wrapper', $menuAvatar).safeHTML(useravatar.contact(u_handle));
            }

            $('.top-menu-logged .loader', $topMenu).addClass('loading');

            // M.storageQuotaCache is exist, fm is inited but not folder link,
            // pulled storage data already and the data is not updated.
            if (M.storageQuotaCache && !folderlink) {
                topMenuDataUpdate(M.storageQuotaCache);
            }
            // M.storageQuotaCache is not exist, it is either not on fm or data was revoked by action packet.
            else {
                M.getStorageQuota().then(data => {

                    topMenuDataUpdate(data);

                    if (fminitialized && !folderlink && M.currentTreeType === 'cloud-drive') {
                        M.checkLeftStorageBlock(data);
                    }
                }).catch(dump);
            }
        }

        if (!is_mobile) {
            topMenuScroll($scrollBlock);
        }
        else {
            // Mobile
            // Close the title menu
            mobile.titleMenu.close();

            // Show the dark backround overlay behind the menu and if it's clicked, close the menu
            $('html').addClass('overlayed');
            $mobileOverlay.removeClass('hidden').addClass('active').rebind('tap.topmenu', function() {
                topMenu(true);
                return false;
            });
        }
    }
}

/* Update used storage info*/
function topMenuDataUpdate(data) {
    'use strict';

    var storageHtml;
    var $storageBlock = $('.top-menu-logged', '.top-menu-popup').removeClass('going-out exceeded');
    var space_used = bytesToSize(data.used);
    var space = bytesToSize(data.max, 0);
    var perc = data.percent;

    if (perc >= 100) {
        $storageBlock.addClass('exceeded');
    }
    else if (perc >= data.uslw / 100) {
        $storageBlock.addClass('going-out');
    }

    // Show only space_used  for business accounts
    if (u_attr && u_attr.b) {
        storageHtml = '<span>' +  space_used + '</span>';
    }
    else {
        storageHtml = l[1607].replace('%1', '<span>' +  space_used + '</span>')
            .replace('%2', space);
    }

    $('.loader', $storageBlock).removeClass('loading');
    $('.storage-txt', $storageBlock).safeHTML(storageHtml);
    $('.storage span', $storageBlock).outerWidth(perc + '%');
}

function topMenuScroll($scrollBlock) {
    "use strict";

    if (!$scrollBlock.length) {
        return false;
    }

    if ($scrollBlock.is('.ps')) {
        Ps.update($scrollBlock[0]);
    }
    else {
        Ps.initialize($scrollBlock[0]);
    }
}

function scrollMenu() {
    "use strict";

    $('.bottom-pages .fmholder').rebind('scroll.devmenu', function() {
        if (page === 'doc' || page.substr(0, 9) === 'corporate' || page === 'sdk' || page === 'dev') {
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
            popupLeftPos,
            arrowLeftPos,
            buttonTopPos,
            headerWidth;

        if ($button.length && $popup.length) {
            pageWidth = $('body').outerWidth();
            headerWidth = $('.top-head').outerWidth();
            $popup.removeAttr('style');
            $popupArrow.removeAttr('style');
            popupLeftPos = $button.offset().left
                + $button.outerWidth() / 2
                - $popup.outerWidth() / 2;
            if (topPos) {
                $popup.css('top', topPos + 'px');
            }
            else {
                buttonTopPos = $button.offset().top + $button.outerHeight();
                $popup.css('top', buttonTopPos + 13 + 'px');
            }

            if (popupLeftPos > 10) {
                if (popupLeftPos + $popup.outerWidth() + 10 > pageWidth) {
                    $popup.css({
                        left: 'auto',
                        right: '10px'
                    });
                    $popupArrow.css(
                        'left', $button.offset().left - $button.outerWidth() / 2
                    );
                }
                else {
                    $popup.css('left', popupLeftPos + 'px');
                }
            }
            else {
                $popup.css('left', '10px');
                arrowLeftPos = $button.offset().left
                    - $button.outerWidth() / 2;
                $popupArrow.css({
                    left: arrowLeftPos + 22
                })
            }
        }
    };

    // If top menu is opened - set timeout to count correct positions
    if (!$('.top-menu-popup').hasClass('o-hidden') || $('body').hasClass('hidden')) {
        setTimeout(function () {
            $.popupAlign();
        }, 250);
    }
    else {
        $.popupAlign();
    }
}

function init_page() {
    page = page || (u_type ? 'fm' : 'start');

    if (!window.M) {
        return console.warn('Something went wrong, the initialization did not completed...');
    }

    // If they are transferring from mega.co.nz
    if (page.substr(0, 13) == 'sitetransfer!') {

        // If false, then the page is changing hash URL so don't continue past here
        if (M.transferFromMegaCoNz() === false) {
            return false;
        }
    }

    // Users that logged in and are suspended (requiring special SMS unlock) are not allowed to go anywhere else in the
    // site until they validate their account. So if they clicked the browser back button, then they should get logged
    // out or they will end up with with a partially logged in account stuck in an infinite loop. This logout is not
    // triggered on the mobile web sms/ pages because a session is still required to talk with the API to get unlocked.
    if (window.doUnloadLogOut) {
        return false;
    }

    dlkey = false;

    var pageBeginLetters = page.substr(0, 2);

    if (page.length > 2 && (page[0] === '!' || pageBeginLetters === 'F!')) {
        // Convering old links to new links format.
        page = page[0] === 'F' ? page.replace('F!', 'folder/').replace('!', '#')
            .replace('!', '/folder/').replace('?', '/file/')
            : page.replace('!', 'file/').replace('!', '#');

        history.replaceState({ subpage: page }, "", (hashLogic ? '#' : '/') + page);
        return init_page();
    }

    if (page.substr(0, 5) === 'file/') {
        dlid = page.substr(5, 8).replace(/[^\w-]+/g, '');
        dlkey = page.substr(14).replace(/[^\w-].+$/, '');

        if (M.hasPendingTransfers() && $.lastSeenFilelink !== getSitePath()) {
            page = 'download';

            M.abortTransfers().then(() => location.reload()).catch(() => loadSubPage($.lastSeenFilelink));
            return;
        }
        $.lastSeenFilelink = getSitePath();
    }

    // Rmove business class to affect the top header
    // Remove bottom-page class and old class
    // Remove pro class when user come back from pro page
    document.body.classList.remove('business', 'bottom-pages', 'old', 'pro');

    // Redirect url to extensions when it tries to go plugin or chrome or firefox
    if (page === 'plugin') {
        loadSubPage('extensions');
        return false;
    }

    if (page === "fm/contacts") {
        // force replace of page history, so that back won't cause the user to go back to an empty fm/contacts
        loadSubPage("/fm/chat/contacts");
        return false;
    }
    if (page === "fm/ipc") {
        if (u_type) {
            return loadSubPage("/fm/chat/contacts/received");
        }
        login_next = '/fm/chat/contacts/received';
        return loadSubPage('/login');
    }
    if (page === "fm/opc") {
        return loadSubPage("/fm/chat/contacts/sent");
    }

    $('#loading').hide();
    if (window.loadingDialog) {
        loadingDialog.hide();
    }

    if (is_chatlink || page.substr(0, 5) === 'chat/') {
        if (fminitialized && megaChatIsReady) {
            // tried to navigate internally to a chat link, do a force redirect.
            // Can be triggered by the back button.
            assert(
                megaChat.initialChatId,
                'missing .initialChatId, did this page initialized from a standalone chat/meeting link?'
            );
            loadSubPage(`fm/chat/c/${megaChat.initialChatId}`);
            return false;
        }

        if (typeof is_chatlink !== 'object') {
            is_chatlink = Object.create(null);
        }

        Object.defineProperties(is_chatlink, {
            ph: {value: page.substr(5, 8)},
            key: {value: page.substr(14).split("?")[0]},
            pnh: {
                get: function() {
                    return this.url && this.ph;
                }
            }
        });

        M.chat = true;
        if (!u_handle) {
            assert(!u_type);
            u_handle = "AAAAAAAAAAA";
        }

        parsepage(pages.chatlink);


        const init = () => {
            init_chat(0x104DF11E5)
                .then(() => megaChat.renderListing(page, true))
                .then(() => megaChat.renderMyStatus())
                .then(() => {
                    document.querySelector('.chat-links-preview .chat-links-logo-header a.logo')
                        .addEventListener('click', () => {
                            is_chatlink = false;
                            delete megaChat.initialPubChatHandle;
                            delete M.currentdirid;
                            megaChat.destroy();
                            if (u_type) {
                                loadSubPage("fm");
                            }
                            else {
                                loadSubPage("start");
                            }
                        });

                    $(`.chat-links-preview${is_mobile ? '.mobile' : '.section'}`).removeClass('hidden');
                })
                .dump('init_chat');
        };

        // Authring (user's keys) are required to be loaded before the chat is, otherwise strongvelope would init
        // with undefined pub keys
        if (u_type) {
            // show loading
            for (const node of document.querySelectorAll(
                '.section.chat-links-preview, .section.chat-links-preview .fm-chat-is-loading'
            )) {
                node.classList.remove('hidden');
            }

            // init authring -> init chat
            authring.onAuthringReady()
                .then(init, (ex) => {
                    console.error("Failed to initialize authring:", ex);
                });
        }
        else {
            init();
        }

        mega.ui.theme.setWithUA();

        return;
    }
    is_chatlink = false;

    var oldPFKey = pfkey;

    // contact link handling...
    if (pageBeginLetters === 'C!' && page.length > 2) {
        var ctLink = page.substring(2, page.length);
        if (!is_mobile) {
            if (!u_type) {
                openContactInfoLink(ctLink);
            }
            else {
                page = 'fm/chat/contacts';
                mBroadcaster.once('fm:initialized', function() {
                    openContactInfoLink(ctLink);
                });
            }
        }
        else {
            var processContactLink = function() {
                if (!mega.ui.contactLinkCardDialog) {
                    var contactLinkCardHtml = pages['mobile-add-contact-card'];
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
                M.onFileManagerReady(processContactLink);
                return;
            }
        }
    }

    var newLinkSelector = '';
    if (page.substr(0, 7) === 'folder/') {
        var phLen = page.indexOf('#');
        var possibleS = -1;

        if (phLen < 0) {
            phLen = page.length;
            possibleS = page.indexOf('/f', 7);
            if (possibleS > -1) {
                phLen = possibleS;
            }
        }

        pfid = page.substr(7, phLen - 7).replace(/[^\w-]+/g, "");

        // check if we have key
        pfkey = false;
        pfhandle = false;
        if (page.length - phLen > 2) {
            if (possibleS === -1) {
                phLen++;
            }

            var linkRemaining = page.substr(phLen, page.length - phLen);

            var fileSelectorPlace = linkRemaining.indexOf('/file/');

            var folderSelectorPlace = linkRemaining.indexOf('/folder/');

            var selectorIsValid = false;

            if (fileSelectorPlace > -1 || folderSelectorPlace > -1) {
                selectorIsValid = true;
            }

            if (selectorIsValid && fileSelectorPlace > -1 && folderSelectorPlace > -1) {
                selectorIsValid = false;
            }

            var keyCutPlace;
            if (selectorIsValid) {
                if (fileSelectorPlace > -1) {
                    keyCutPlace = fileSelectorPlace;

                    if (linkRemaining.length - 6 - fileSelectorPlace > 2) {
                        $.autoSelectNode = linkRemaining.substring(fileSelectorPlace + 6, linkRemaining.length);
                        $.autoSelectNode = $.autoSelectNode.replace(/[^\w-]+/g, "");
                    }
                }
                else {
                    keyCutPlace = folderSelectorPlace;

                    if (linkRemaining.length - 8 - folderSelectorPlace > 2) {
                        pfhandle = linkRemaining.substring(folderSelectorPlace + 8, linkRemaining.length);
                        pfhandle = pfhandle.replace(/[^\w-]+/g, "");
                        newLinkSelector = '/folder/' + pfhandle;
                    }

                }
            }
            else {
                keyCutPlace = Math.min(fileSelectorPlace, folderSelectorPlace);
                if (keyCutPlace === -1) {
                    keyCutPlace = linkRemaining.length;
                }
            }
            pfkey = linkRemaining.substring(0, keyCutPlace).replace(/[^\w-]+/g, "") || false;

        }

        n_h = pfid;
        if (!flhashchange || pfkey !== oldPFKey || pfkey.length !== 22 || pfid.length !== 8) {
            closeDialog();
            eventlog(is_mobile ? 99631 : 99632, true);

            if (pfid.length !== 8 || window['preflight-folder-link-error:' + pfid]) {
                folderreqerr(false, window['preflight-folder-link-error:' + pfid] || EARGS);
                return false;
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
                    fm_hideoverlay();
                }
                else {
                    // Insert placeholder background page while waiting for user input
                    parsepage(pages.placeholder);

                    // Lets apply theme for this dialog
                    mega.ui.theme.setWithUA();

                    // Show the decryption key dialog on top
                    mKeyDialog(pfid, true, pfkey, newLinkSelector)
                        .fail(function() {
                            loadSubPage('start');
                        });
                    pfkey = false;
                }
                return false;
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

    if ((pfkey && !flhashchange || dlkey) && !location.hash) {
        return location.replace(getAppBaseUrl());
    }

    if (!$.mcImport && $.dialog !== 'cookies-dialog' && typeof closeDialog === 'function') {
        closeDialog();
    }

    // Pages that can be viewed while being logged in and registered but not yet email confirmed
    if ((page.substr(0, 1) !== '!')
        && (page.substr(0, 3) !== 'pro')
        && (page.substr(0, 5) !== 'start' || is_fm())
        && (page.substr(0, 4) !== 'help')
        && (page.substr(0, 13) !== 'discountpromo') // Discount Promo with regular discount code on the end
        && (page.substr(0, 2) !== 's/')       // Discount Promo short URL e.g. /s/blackfriday
        && (page.substr(0, 8) !== 'payment-') // Payment URLs e.g. /payment-ecp-success, /payment-sabadell-failure etc
        && (page !== 'refer')
        && (page !== 'contact')
        && (page !== 'mobileapp')
        && (page !== 'nas')
        && (page !== 'extensions')
        && (page !== 'chrome')
        && (page !== 'firefox')
        && (page !== 'edge')
        && (page !== 'desktop')
        && (page !== 'sync')
        && (page !== 'cmd')
        && (page !== 'terms')
        && (page !== 'privacy')
        && (page !== 'gdpr')
        && (page !== 'takendown')
        && (page !== 'resellers')
        && (page !== 'security')
        && (page !== 'storage')
        && (page !== 'objectstorage')
        && (page !== 'collaboration')
        && (page !== 'securechat')
        && (page !== 'unsub')
        && (page !== 'cookie')
        && (page.indexOf('file/') === -1)
        && (page.indexOf('folder/') === -1)
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

    if (page.substr(0, 2) === 'P!' && page.length > 2) {
        // Password protected link decryption dialog
        parsepage(pages.placeholder);

        if (is_mobile) {
            mobile.decryptionPasswordOverlay.show(page);
        }
        else {
            exportPassword.decrypt.init(page);

            // lets set them for the dialog.
            mega.ui.theme.setWithUA();
        }
    }
    else if (page.substr(0, 4) === 'blog') {
        location.replace('https://blog.mega.io');
    }
    else if (page.substr(0, 6) == 'verify') {
        if (is_mobile) {
            mobile.initDOM();
            mobile.verify.init();
        }
        else {
            parsepage(pages.change_email);
            emailchange.main();
        }
    }
    else if (page.substr(0, 9) === 'corporate') {
        parsepage(pages.corporate);
        corporate.init();
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
                    mobile.messageOverlay.show(l[2480], l[12440], function() {
                        loadSubPage('fm');
                    });
                }
                else {
                    msgDialog('warningb', l[2480], l[12440], false, function() {
                        loadSubPage('fm');
                    });
                }
                return false;
            }

            // Verify the confirm code using the new process
            security.register.verifyEmailConfirmCode(confirmcode, function(result, email) {

                // If successful
                if (typeof email === 'string') {

                    if (u_handle && u_handle === result[2]) {
                        // same account still in active session, let's end.
                        if ('csp' in window) {
                            const storage = localStorage;
                            const value = storage[`csp.${u_handle}`];

                            if (value) {
                                storage.csp = value;
                            }
                        }
                        u_logout(1);
                    }

                    signUpSucceededCallback(email);
                }
                else {
                    signUpFailedCallback(result);
                }
            });
        }
        else {
            console.error("Unsupported verification code.");
            signUpFailedCallback(EINCOMPLETE);
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
        if (window.nextPage) {
            login_next = window.nextPage;
            login_txt =  login_next === 'support' ? l.support_redirect_login : l[24766];
            delete window.nextPage;
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
    else if (is_mobile && isEphemeral() && is_fm()) {
        // Log out and redirect to start page it's the ephemeral session on mobile web
        u_logout(true);
        page = '';
        loadSubPage('start');
        return false;
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
    else if (is_mobile && u_type && (page === 'fm/account/plan' || page === 'fm/account/security')) {
        return loadSubPage('fm/account');
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
    else if (is_mobile && u_type && page === 'fm/account/paymentcard') {
        parsepage(pages.mobile);
        mobile.account.paymentCard.init();
        return false;
    }
    else if (is_mobile && u_type
        && (page === 'fm/account/security/change-password' || page === 'fm/account/email-and-pass')) {
        parsepage(pages['mobile']);
        mobile.account.changePassword.init();
        return false;
    }
    else if (is_mobile && u_type && page === 'fm/account/security/change-email') {
        mobile.initDOM();
        mobile.account.changeEmail.init();
        return false;
    }
    else if (is_mobile && fminitialized && u_type && page === 'fm/account/notifications') {
        mobile.initDOM();
        mobile.account.notifications.init();
        return false;
    }
    else if (is_mobile && fminitialized && u_type && page === 'fm/account/file-management') {
        mobile.initDOM();
        mobile.account.filemanagement.init();
        return false;
    }
    else if (page === 'achievements') {
        parsepage(pages.achievements);
        achievementPage();
        return false;
    }
    else if (page === 'fm/account/achievements') {
        $.openAchievemetsDialog = true;
        loadSubPage('fm/account/plan');
        return false;
    }
    else if (!mega.flags.refpr && page.substr(0, 8) === 'fm/refer') {
        loadSubPage('fm');
        return false;
    }
    else if (is_mobile && u_type && page === 'fm/refer') {
        parsepage(pages.mobile);
        mobile.affiliate.initMainPage();
        return false;
    }
    else if (is_mobile && u_type && page === 'fm/refer/redeem') {
        parsepage(pages.mobile);
        mobile.affiliate.initRedeemPage();
        return false;
    }
    else if (is_mobile && u_type && page === 'fm/refer/guide') {
        parsepage(pages.mobile);
        mobile.affiliate.initGuidePage();
        return false;
    }
    else if (is_mobile && u_type && page === 'fm/refer/history') {
        parsepage(pages.mobile);
        mobile.affiliate.initHistoryPage();
        return false;
    }
    else if (is_mobile && u_type && page === 'fm/refer/distribution') {
        parsepage(pages.mobile);
        mobile.affiliate.initDistributionPage();
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
    else if (is_mobile && !isEphemeral() && page.substr(0, 3) === 'sms') {

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
        }
        var pupHandle = page.substr(9, 11);
        mega.megadrop.pupCheck(pupHandle);
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
            if (window.pickedPlan) {
                sessionStorage.proPageContinuePlanNum = window.pickedPlan;
                delete window.pickedPlan;
            }
            mobile.initDOM();
            mobile.register.show();
        }
        else {
            parsepage(pages['register']);
            init_register();
        }
    }
    else if ((page.substr(0, 9) === 'registerb')) { // business register
        getUAOParameter(page, 'registerb');

        parsepage(pages['registerb']);
        document.body.classList.add('business');
        var regBusiness = new BusinessRegister();
        regBusiness.initPage();
    }
    else if (page === 'fm/account/history') {
        $.scrollIntoSection = '.session-history';
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
    else if (page.substr(0, 4) === 'help') {
        return location.replace('https://help.mega.io' + location.hash);
    }
    else if (page === 'privacy') {
        parsepage(pages['privacy']);
        if (is_mobile) {
            mobile.privacy.show();
        }
    }
    else if (page === 'gdpr') {
        if (is_extension) {
            return loadSubPage('privacy');
        }
        location.replace('/privacy');
    }
    else if (page === 'privacycompany') {
        // Redirect to the security page
        loadSubPage('security');
        return false;
    }
    else if (page === 'dev') {
        if (is_extension) {
            return loadSubPage('developers');
        }
        location.replace('/developers');
    }
    else if (page === 'developers') {
        parsepage(pages['dev']);
        dev_init('dev');
    }
    else if (page == 'doc') {
        parsepage(pages['dev']);
        dev_init('doc');
    }
    else if (page === 'backup') {
        // Redirect to the new url when access the old /backup path.
        loadSubPage('keybackup');
        return false;
    }
    else if (page === 'keybackup' && !u_type) {
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
    else if (page === 'keybackup') {
        if (is_mobile) {
            mobile.initDOM();
            mobile.backup.init();
        }
        else {
            parsepage(pages.keybackup);
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
        else if (is_mobile) {
            login_next = 'wiretransfer';
            loadSubPage('login');

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
    else if (page === 'about/main') {
        if (is_extension) {
            return loadSubPage('about');
        }
        location.replace('/about');
    }
    else if (page.substr(0, 5) === 'about') {
        parsepage(pages.about);
        aboutus.init();
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
    else if (page === 'security/bug-bounty') {
        parsepage(pages.securitypractice);
        securityPractice.initBounty();
    }
    else if (page == 'takedown') {
        parsepage(pages['takedown']);
        if (is_mobile) {
            mobile.takedown.show();
        }
    }
    else if (page === 'copyrightnotice') {
        parsepage(is_mobile ? pages.mobile : pages.copyrightnotice);
        copyright.init_cn();
    }
    else if (page === 'copyright') {
        parsepage(pages['copyright']);
        $('.reg-st5-complete-button').rebind('click', function () {
            loadSubPage('copyrightnotice');
        });
    }
    else if (page === 'disputenotice') {
        parsepage(is_mobile ? pages.mobile : pages.disputenotice);
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
            document.body.classList.add('business');
        }

        // Process the return URL from the payment provider and show a success/failure dialog if applicable
        pro.proplan.processReturnUrlFromProvider(page);
    }
    else if (page === 'thanks') {
        let $dialogOverlay = $('.thankyou-dialog').removeClass('hidden');
        let $backgroundOverlay = $('.thankyou-dialog-overlay').removeClass('hidden');

        parsepage(pages.placeholder);
        $('.thankyou-txt', $dialogOverlay).safeAppend(l[24852]);
        $('.thankyou-button, .thankyou-close', $dialogOverlay)
            .removeClass('hidden')
            .rebind('click', function() {
                $backgroundOverlay.addClass('hidden').removeClass('thankyou-dialog-overlay');
                $dialogOverlay.addClass('hidden');
                loadSubPage(loggedout || u_type === false ? 'start' : 'fm', 'override');
                return false;
            });
    }
    else if (page.substr(0, 5) === 'repay') {
        if (u_attr && u_attr.b && u_attr.b.m && (u_attr.b.s === -1 || u_attr.b.s === 2)) {
            getUAOParameter(page, 'repay');
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
    else if (page === 'android' || page === 'ios' || page === 'uwp' || page === 'wp' || page === 'mobileapp') {
        if (is_extension) {
            return loadSubPage('mobile');
        }
        location.replace('/mobile');
    }
    else if (page === 'mobile') {
        parsepage(pages['mobileapp']);

        // On clicking the 'Learn more' button
        $('.bottom-page.big-link', '.top-bl').rebind('click.scrollToContent', function() {

            // Scroll to the Windows Phone section
            $('.full-block', '.scroll-block').get(0).scrollIntoView({behavior: "smooth"});
        });
    }
    else if (page === 'nas') {
        parsepage(pages.nas);
    }
    else if (page === 'nzippmember' || page === 'nziphotographer') {
        parsepage(pages.nzipp);
        nzippCampaign.init();
    }
    else if (page === 'refer') {
        parsepage(pages.affiliate);
        affiliateprogram.init();
    }
    else if (page.substring(0, 7) === 'special') {
        parsepage(pages.special);
        troyhuntCampaign.init();
    }
    else if (page === 'extensions' || page === 'chrome' || page === 'firefox' || page === 'edge') {
        parsepage(pages['browsers']);
        browserspage.init();
    }
    else if (page === 'business') {
        parsepage(pages['business']);
        document.body.classList.add('business');
        businessProductPage.init();
    }
    else if (page.substr(0, 7) === 'desktop') {
        parsepage(pages.desktop);
        M.require('sync_js').then(function() {
            onIdle(topmenuUI);
            initMegasync();
        });
    }
    else if (page.substr(0, 4) === 'sync') {
        if (is_extension) {
            return loadSubPage('desktop');
        }
        location.replace('/desktop');
    }
    else if (page == 'cmd') {
        parsepage(pages['cmd']);
        initMegacmd();
    }
    else if (page == 'resellers') {
        parsepage(pages['resellers']);
    }
    else if (page === 'storage') {
        parsepage(pages.feature_storage);
        featurePages('storage');
    }
    else if (page === 'securechat') {
        parsepage(pages.feature_chat);
        featurePages('securechat');
        featurePages.fixMobileChatLinks();
    }
    else if (page === 'collaboration') {
        parsepage(pages.feature_collaboration);
        featurePages('collaboration');
    }
    else if (page === 'objectstorage'){
        parsepage(pages.object_storage);
        featurePages('objectstorage');
    }
    else if (page == 'done') {
        parsepage(pages['done']);
        init_done();
    }
    else if (page === 'cookie') {
        parsepage(pages.cookie);
        if (is_mobile) {
            mobile.cookie.show();
        }
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
            parsepage(pages.mobile);
        }
        else {
            parsepage(pages.download);
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

    // New multi-discount handling with discount promotion page e.g.
    // /discountpromoJ2iPNEWqiTM-yhsuGkOToh or short sale URLs e.g. /s/blackfriday
    else if (page.substr(0, 13) === 'discountpromo' || page.substr(0, 2) === 's/') {
        parsepage(pages.discountpromo);
        return new DiscountPromo();
    }

    // Existing discount handling system, redirects straight into the Pro Payment page showing the discount
    else if (page.substr(0, 8) === 'discount') {

        // discount code from URL #discountxR7xVwBkNjcerUKpjqO6bQ
        if (is_mobile) {
            parsepage(pages.mobile);
        }
        return pro.proplan.handleDiscount(page);
    }

    /**
     * If voucher code from url e.g. #voucherZUSA63A8WEYTPSXU4985
     */
    else if (page.substr(0, 7) === 'voucher') {

        if (mega.voucher && mega.voucher.redeemSuccess) {
            return loadSubPage('pro');
        }

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
            // Show the voucher info to the user before proceeding to redeem.
            if (typeof redeem !== 'undefined' && mega.voucher) {
                return redeem.showVoucherInfoDialog();
            }
            // Otherwise go to the Redeem page which will detect the voucher code and show a dialog
            loadSubPage('redeem');
            return false;
        }
    }

    // Load the direct voucher redeem page
    else if (page.substr(0, 6) === 'redeem') {
        const storageVoucher = localStorage.voucher;
        if (storageVoucher && (u_type > 2 || window.bCreatedVoucher)) {
            // To complete the redeem voucher process after user logs in if the voucher code exists
            parsepage(pages[is_mobile ? 'mobile' : 'redeem']);
            redeem.init();
        }
        else {
            // No voucher found, ask to enter it.
            // Or back to the voucher redeem page without completion of login or register if entered code before
            parsepage(pages.redeem);
            const vCode = page.substr(6);
            redeem.setupVoucherInputbox((vCode.length > 10 && vCode.length < 25) ? vCode : storageVoucher);
        }
    }

    // If they recently tried to redeem their voucher but were not logged in or registered then direct them to the
    // #redeem page to complete their purchase. For newly registered users this happens after key creation is complete.
    else if ((localStorage.getItem('voucher') !== null) && (u_type === 3)) {
        loadSubPage('redeem');
        return false;
    }
    else if (localStorage.getItem('addContact') !== null && u_type === 3) {
        var contactRequestInfo = JSON.parse(localStorage.getItem('addContact'));
        var contactHandle = contactRequestInfo.u;
        var contactRequestTime = contactRequestInfo.unixTime;
        M.setUser(contactHandle, {
            u: contactHandle,
            h: contactHandle,
            c: undefined
        });

        var TWO_HOURS_IN_SECONDS = 7200;

        var addContact = function (ownerEmail, targetEmail) {
            M.inviteContact(ownerEmail, targetEmail);
            localStorage.removeItem('addContact');
            return init_page();
        };

        if ((unixtime() - TWO_HOURS_IN_SECONDS) < contactRequestTime) {
            M.syncContactEmail(contactHandle, new MegaPromise(), true)
                .then(function(email) {
                    addContact(u_attr.email, email);
                })
                .catch(function(ex) {
                    console.error(ex);
                    localStorage.removeItem('addContact');
                });
        }
    } else if (is_fm()) {
        var id = false;
        if (page.substr(0, 2) === 'fm') {
            id = page.replace('fm/', '');
            if (id.length < 5 && id !== 'chat') {
                id = false;
            }
        }

        if (d) {
            console.log('Setting up fm...', id, pfid, fminitialized, M.currentdirid);
        }

        // Set System default theme or any previously selected
        if (!is_mobile) {
            mega.ui.theme.setWithUA();
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

        if (!fminitialized) {
            if (id) {
                M.currentdirid = id;
            }
            if (is_mobile) {
                $('#fmholder').safeHTML(translate(pages['mobile'].replace(/{staticpath}/g, staticpath)));
            }
            else {
                fm_addhtml();
            }

            assert(!is_chatlink);
            mega.initLoadReport();
            loadfm();
        }
        else if ((!pfid || flhashchange) && (id && id !== M.currentdirid || page === 'start')) {
            M.openFolder(id, true);
        }
        else {
            if (ul_queue.length > 0) {
                M.openTransfersPanel();
            }

            if (u_type === 0 && !u_attr.terms && !is_eplusplus) {
                $.termsAgree = function () {
                    u_attr.terms = 1;
                    api_req({ a: 'up', terms: 'Mq' });
                    // queued work is continued when user accept terms of service
                    let $icon = $('.transfer-pause-icon').removeClass('active');
                    $('i', $icon).removeClass('icon-play-small').addClass('icon-pause');
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

        $('#pageholder, #startholder').addClass('hidden');

        // Prevent duplicate HTML content breaking things
        // what a strange solution!  [emptying #startholder!]
        // we should have fixed duplicated classes, ids in the html..
        if (is_mobile) {
            $('#startholder').empty();
        }

        $('.nw-fm-left-icons-panel').removeClass('hidden');
        let fmholder = document.getElementById('fmholder');
        // try to determinate visibility, without needing to use :visible
        if (!fmholder || fmholder.classList.contains("hidden") || fmholder.style.display === "none") {
            if (fmholder) {
                fmholder.removeAttribute("style");
                fmholder.classList.remove('hidden');
            }
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
                    $.tapioca = Array.isArray(fdl.url);

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

        pagemetadata();
    }
    else if (page.substr(0, 2) == 'fm' && !u_type) {
        if (loggedout || (u_type === false && page !== 'fm/refer')) {
            loadSubPage('start', 'override');
            return false;
        }
        login_next = page;
        login_txt = l[1298];
        loadSubPage('login', 'override');
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

    if (!window.is_karma && mega.metatags) {
        mega.metatags.checkPageMatchesURL();
    }

    loggedout = false;
    flhashchange = false;

    onIdle(blockChromePasswordManager);
}

function topbarUITogglePresence(topbar) {

    'use strict';

    let element = topbar.querySelector('.js-activity-status');

    if (element) {
        element.classList.add('hidden');

        // ActivityStatus Code
        // If the chat is disabled, or the presence lib isn't loading, don't show the green status icon in the header.
        if (!pfid && megaChatIsReady && megaChat.userPresence !== undefined) {
            element.classList.remove('hidden');
            megaChat._renderMyStatus();
        }
    }
}

function topbarUI(holderId) {
    'use strict';

    let element;
    const holder = document.getElementById(holderId);
    const topbar = holder && holder.querySelector('.js-topbar');

    if (!topbar) {
        return;
    }

    topbarUITogglePresence(topbar);

    element = topbar.querySelector('.js-dropdown-account');

    if (element) {
        element.classList[u_type ? 'remove' : 'add']('hidden');
    }

    element = topbar.querySelector('.js-topbar-searcher');

    if (element) {
        element.classList[fminitialized ? 'remove' : 'add']('hidden');
    }

    const theme = u_attr && u_attr['^!webtheme'] !== undefined ? u_attr['^!webtheme'] : 0;
    let logoClass = 'mega-logo-dark';

    $('.logo-full', '.js-topbar').removeClass('img-mega-logo-light', 'mega-logo-dark');
    if (theme === '1'){
        logoClass = 'img-mega-logo-light';
    }
    else {
        logoClass = 'mega-logo-dark';
    }
    $('.logo-full', '.js-topbar').addClass(logoClass);

    element = topbar.querySelector('.js-dropdown-notification');

    if (element) {
        element.classList[fminitialized && !folderlink && u_type === 3 ? 'remove' : 'add']('hidden');
    }

    if (u_type === 3 && u_attr && u_attr.fullname && (element = topbar.querySelector('.name'))) {
        $(element).text(u_attr.fullname).attr('data-simpletip', u_attr.fullname);
    }

    if (u_type && u_attr && u_attr.email && (element = topbar.querySelector('.email'))) {
        $(element).text(u_attr.email).attr('data-simpletip', u_attr.email);
    }

    if (holderId === 'fmholder') {
        window.mega.ui.searchbar.refresh();
    }
    else {
        window.mega.ui.searchbar.init();
    }

    $('.js-topbaravatar, .js-activity-status', topbar).rebind('click', function() {
        const $wrap = $(this).closest('.js-dropdown-account');
        const $btn = $('.downloadmega', $wrap).parent();
        if (!$btn.hasClass('sync-checked')) {
            megasync.isInstalled((err, is) => {
                if (!err || is) {
                    $btn.addClass('hidden');
                }
                $btn.addClass('sync-checked');
            });
        }

        const container = this.parentNode;
        if (container.classList.contains("show")) {
            container.classList.remove("show");
        }
        else {
            const $accountAvatar = $('.js-account-avatar', topbar);
            if (!$accountAvatar.hasClass('rendered')) {
                $accountAvatar.addClass('rendered').safeHTML(useravatar.contact(u_handle));
            }
            container.classList.add("show");

            const accountName = topbar.querySelector('span.name');
            const accountEmail = topbar.querySelector('span.email');
            // If the user full name is too long, shrink and add the simpletip to show the full name
            if (accountName.scrollWidth > accountName.offsetWidth) {
                accountName.classList.add('simpletip');
            }
            else {
                accountName.classList.remove('simpletip');
            }
            // If the user email is too long, shrink and add the simpletip to show the full email
            if (accountEmail.scrollWidth > accountEmail.offsetWidth) {
                accountEmail.classList.add('simpletip');
            }
            else {
                accountEmail.classList.remove('simpletip');
            }
        }
    });

    $('.js-accountbtn', topbar).rebind('click.topAccBtn', function(){

        if (this.classList.contains('settings')) {
            loadSubPage('fm/account');
        }
        else if (this.classList.contains('achievements')) {
            mega.achievem.achievementsListDialog();
        }
        else if (this.classList.contains('logout')) {
            mLogout();
        }

        var dropdown = document.getElementsByClassName('js-dropdown-account');

        for (i = dropdown.length; i--;) {
            dropdown[i].classList.remove('show');
        }
        if (!this.classList.contains('logout') && !$('.fm-dialog-overlay').hasClass('hidden')) {
            $('.fm-dialog-overlay').addClass('hidden');
        }
    });

    $('.js-accountsubmenu', topbar).rebind('mouseover.topSubmenu', function() {
        $('.js-statuslist', this).removeClass('hidden');
        $(this).on('mouseout.topSubmenu', () => {
            $('.js-statuslist', this).addClass('hidden');
            $(this).off('mouseout.topSubmenu');
        });
    });
}

function topmenuUI() {

    'use strict';

    var topMenuElm = document.getElementById('topmenu');

    if (topMenuElm) {
        var topHeader = topMenuElm.querySelector('.top-head');

        if (!topHeader) {
            $(topMenuElm).safeHTML(parsetopmenu());

            if (!is_fm()) {
                $('.top-head .logo', topMenuElm).css("display", "block");
            }
        }

        $.tresizer();
    }

    const holderId = is_fm() && page !== 'start' ? 'fmholder' : 'startholder';

    topbarUI(holderId);

    var $topMenu = $('.top-menu-popup', 'body');
    var $topHeader = is_mobile ? $('.fm-header', 'body') : $('.top-head', '#' + holderId);
    var $topBar = is_mobile ? $('.fm-header', 'body') : $('.js-topbar', '#' + holderId);
    var $menuFmItem = $('.top-menu-item.fm', $topMenu);
    var $menuLogoutButton = $('.logout', $topMenu);
    var $menuAuthButtons = $('.top-menu-item.register,.top-menu-item.login', $topMenu);
    var $menuLoggedBlock = $('.top-menu-logged', $topMenu);
    var $menuRefreshItem = $('.top-menu-item.refresh-item', $topMenu);
    var $menuHomeItem = $('.top-menu-item.start', $topMenu);
    var $menuPricingItem = $('.top-menu-item.pro', $topMenu);
    const $menuAchievementsItem = $('.top-menu-item.achievements', $topMenu);
    var $menuBackupItem = $('.top-menu-item.backup', $topMenu);
    var $menuAffiliateItem = $('.top-menu-item.affiliate', $topMenu);
    var $menuFeedbackItem = $('.top-menu-item.feedback', $topMenu);
    var $menuUserinfo = $('.top-menu-account-info', $menuLoggedBlock);
    var $menuUsername = $('.name', $menuUserinfo);
    var $menuAvatar = $('.avatar-block', $menuUserinfo);
    var $menuUpgradeAccount = $('.upgrade-your-account', $topMenu);
    var $headerActivityBlock = $('.activity-status-block .activity-status,.activity-status-block', $topHeader);
    var $headerIndividual = $('.individual', $topHeader);
    var $headerIndividualSpan = $('.individual span', $topHeader);
    var $headerSearch = $('.mini-search', $topHeader);
    var $headerButtons = $('.top-buttons', $topHeader);
    var $loginButton = $('.top-login-button', $headerButtons);
    var $headerRegisterBotton = $('.create-account-button', $headerButtons);
    var $headerSetStatus = $('.js-accountbtn.setstatus', $topHeader).parent();
    var $headerAchievements = $('.js-accountbtn.achievements', $topHeader);
    var $headerDownloadMega = $('.js-accountbtn.downloadmega', $topHeader);
    const $topBarAvatar = $('.js-topbaravatar', $topBar);
    const $topMenuActivityBlock = $('.activity-status-block', $menuUserinfo);

    if (u_type === 0) {
        $('span', $loginButton).text(l[967]);
    }

    $menuLoggedBlock.addClass('hidden').removeClass('business-acc');
    $menuBackupItem.addClass('hidden').next('.top-menu-divider').addClass('hidden');
    $menuHomeItem.removeClass('hidden');
    $menuPricingItem.removeClass('hidden');
    $menuAchievementsItem.removeClass('hidden');
    $menuFmItem.addClass('hidden');
    $menuLogoutButton.addClass('hidden');
    $menuAuthButtons.addClass('hidden');
    $menuRefreshItem.addClass('hidden');
    $menuAffiliateItem.addClass('hidden');
    $menuUsername.addClass('hidden');
    $menuUpgradeAccount.removeClass('hidden');
    $menuAvatar.removeClass('presence');
    $topMenuActivityBlock.addClass('hidden');

    $headerActivityBlock.addClass('hidden');
    $headerIndividual.removeClass('hidden'); // try Mega Business
    $headerIndividualSpan.text(l[19702]); // try Mega Business
    $headerSetStatus.addClass('hidden');
    $headerAchievements.addClass('hidden');
    $('.membership-status, .top-head .user-name', $topHeader).addClass('hidden');

    if (!fminitialized) {
        $headerSearch.addClass('hidden');
    }

    if (page === 'download') {
        $menuRefreshItem.removeClass('hidden');
    }
    if (page === 'business' || page ==='registerb') {
        $headerIndividualSpan.text(l[19529]); // try Mega MEGA Indivisual
    }

    var avatar = window.useravatar && useravatar.mine();
    if (!avatar) {
        $menuAvatar.addClass('hidden');
    }
    else {
        $menuAvatar.removeClass('hidden');
    }

    // Show active item in main menu
    var section = page.split('/')[0];
    if (section === 'fm') {
        section = page.split('/')[1];
    }

    if (page.indexOf('fm/refer') === 0) {
        section = 'affiliate-dashboard';
    }
    else if (page === 'refer') {
        section = 'affiliate';
    }

    // Get all menu items
    var $topMenuItems = $('.top-menu-item', $topMenu);

    // Remove red bar from all menu items
    $topMenuItems.removeClass('active');

    // If in mobile My Account section, show red bar
    if (is_mobile && page.indexOf('fm') === 0) {
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
        $('.user-name', $topHeader).text(u_attr.fullname).removeClass('hidden');
        $menuUsername.text(u_attr.fullname).removeClass('hidden');
    }

    if (mega.flags.refpr) {
        $menuAffiliateItem.removeClass('hidden');
    }

    // Show language in top menu
    $('.top-menu-item.languages span', $topMenu).text(languages[lang][2]);

    // Show version in top menu
    var $versionButton = $('.top-mega-version', $topMenu).text('v. ' + M.getSiteVersion());

    if (!is_litesite) {
        var versionClickCounter = 0;
        var versionClickTimeout = null;
        $versionButton.rebind('click.versionupdate', function() {
            clearTimeout(versionClickTimeout);
            if (++versionClickCounter >= 3) {
                mega.developerSettings.show();
            }
            versionClickTimeout = setTimeout(function() {
                versionClickCounter = 0;
            }, 1000);
        });
    }

    if (u_type > 0) {

        $menuHomeItem.addClass('hidden');
        $menuFmItem.removeClass('hidden');
        $menuLogoutButton.removeClass('hidden');
        $menuBackupItem.removeClass('hidden').next('.top-menu-divider').removeClass('hidden');
        $menuLoggedBlock.removeClass('hidden');
        $menuFeedbackItem.removeClass('hidden');

        // for top menu, load avatar and show for logged in user
        if (!$topBarAvatar.hasClass('rendered')) {
            useravatar.loadAvatar(u_handle).always(function(){
                $topBarAvatar.addClass('rendered');
                $('.avatar',$topBarAvatar).safeHTML(useravatar.contact(u_handle));
            });
        }

        $headerButtons.addClass('hidden');
        $loginButton.addClass('hidden');
        $('.dropdown.top-login-popup', $topHeader).addClass('hidden');
        $('.membership-status', $topHeader).removeClass('hidden');
        $('.top-change-language', $topHeader).addClass('hidden');
        $headerRegisterBotton.addClass('hidden');
        $('.membership-status-block', $topHeader).removeClass('hidden');
        $headerIndividual.addClass('hidden');

        // Show the rocket icon if achievements are enabled
        mega.achievem.enabled()
            .done(function () {
                $headerAchievements.parent().removeClass('hidden');
            })
            .fail(function () {
                $headerAchievements.parent().addClass('hidden');
            });

        if (u_attr.email) {
            $('.email', $menuUserinfo).text(u_attr.email);
        }

        // If a Lite/Pro plan has been purchased
        if (u_attr.p) {

            // Set the plan text
            var proNum = u_attr.p;
            var purchasedPlan = pro.getProPlanName(proNum);

            // Set colour of plan and body class
            var cssClass;

            document.body.classList.remove('free');

            if (proNum === 4) {
                cssClass = 'lite';
                document.body.classList.add('lite');
            }
            else {
                cssClass = 'pro' + proNum;
                document.body.classList.remove('lite');
            }

            // Show the Pro badge
            $('.plan', $menuLoggedBlock).text(purchasedPlan);
            document.body.classList.add('pro-user');
        }
        else {
            // Show the free badge
            $('.plan', $menuLoggedBlock).text(l[1150]);
            $('.membership-status', $topHeader).attr('class', 'tiny-icon membership-status free');
            document.body.classList.remove('lite', 'pro-user');
            document.body.classList.add('free');
        }

        if (is_fm()) {
            $menuRefreshItem.removeClass('hidden');
        }

        // If the chat is disabled, or the presence lib isn't loading, don't show the green status icon in the header.
        if (!pfid && megaChatIsReady && megaChat.userPresence !== undefined) {
            $headerActivityBlock.removeClass('hidden');
            $headerSetStatus.removeClass('hidden');
            $menuAvatar.addClass('presence');
            $topMenuActivityBlock.removeClass('hidden');
            megaChat._renderMyStatus();
        }

        // if this is a business account sub-user
        if (u_attr && u_attr.b) {
            $menuLoggedBlock.addClass('business-acc');

            if (u_attr.b.s !== -1) {

                $headerAchievements.addClass('hidden');
                $menuUpgradeAccount.addClass('hidden');

                // Hide Pricing menu item for Business sub accounts and admin expired
                $menuPricingItem.addClass('hidden');
            }
            document.body.classList.add('business-user');
        }
        else {
            document.body.classList.remove('business-user');
        }

        if (u_type && (!mega.flags.ach || Object(window.u_attr).b)) {
            // Hide Achievements menu item for an non-achievement account and business account
            $menuAchievementsItem.addClass('hidden');
        }

        // Show PRO plan expired warning popup (if applicable)
        alarm.planExpired.render();
    }
    else {
        if (u_type === 0 && !confirmok && page !== 'key') {

            $('.top-menu-item.register span', $topMenu).text(l[968]);

            // If they have purchased Pro but not activated yet, show a warning
            if (isNonActivatedAccount()) {
                alarm.nonActivatedAccount.render();
            }

            // Otherwise show the ephemeral session warning
            else if (!is_eplusplus && ($.len(M.c[M.RootID] || {})) && page !== 'register') {
                if (alarm.ephemeralSession) {
                    alarm.ephemeralSession.render();
                }
            }
        }

        $menuLoggedBlock.addClass('hidden');
        $('.membership-status-block', $topHeader).addClass('hidden');
        $headerAchievements.addClass('hidden');
        $headerButtons.removeClass('hidden');
        $headerRegisterBotton.removeClass('hidden');

        if (u_type === 0 && is_fm()) {
            $headerIndividual.addClass('hidden');
        }

        $headerRegisterBotton.rebind('click.register', function() {
            if ($(this).hasClass('business-reg')) {
                loadSubPage('registerb');
            }
            else {
                loadSubPage('register');
            }
        });

        $loginButton.removeClass('hidden').rebind('click.auth', function() {
            if (u_type === 0) {
                mLogout();
            }
            else {
                var c = $('.dropdown.top-login-popup', $topHeader).attr('class');
                if (c && c.indexOf('hidden') > -1) {
                    tooltiplogin.init();
                }
                else {
                    tooltiplogin.init(1);
                }
            }
        });

        if (page === 'login') {
            $loginButton.addClass('hidden');
        }
        if (page === 'register' || page === 'registerb') {
            $headerRegisterBotton.addClass('hidden');
        }

        // Only show top language change icon if not logged in
        if (u_type === false) {

            // Get current language
            var $topChangeLang = $('.top-change-language', $topHeader);
            var $topChangeLangName = $('.top-change-language-name', $topChangeLang);

            //TODO: Change translated values on short translated
            //var languageName = ln[lang];

            // Init the top header change language button
            $topChangeLangName.text(lang);
            $topChangeLang.removeClass('hidden');
            $topChangeLang.rebind('click.changelang', function() {

                // Add log to see how often they click to change language
                api_req({ a: 'log', e: 99600, m: 'Language menu opened from top header' });

                // Open the language dialog
                langDialog.show();
            });
        }

        $menuAuthButtons.removeClass('hidden');

        if (u_type === 0) {
            $('.top-menu-item.login', $topMenu).addClass('o-hidden');
            $menuLogoutButton.removeClass('hidden');
        }
    }

    $.hideTopMenu = function (e) {

        var c;
        let $target;
        let element;
        let elements;
        let parent;
        let i;

        if (e) {

            parent = e.target.parentNode;
            // if event is triggered by inner element of mega-button, try pull classname of the button.
            c = parent && parent.classList.contains('mega-button') ? parent.className : e.target.className;
        }
        c = typeof c === 'string' ? c : '';
        elements = document.getElementsByClassName('js-more-menu menu-open');

        if (!e || !e.target.closest('.top-menu-popup, .js-more-menu') && elements.length &&
            (!c || !c.includes('top-icon menu') && !c.includes('top-menu-popup'))) {
            topMenu(1);
        }

        if (!e || e.target.closest('.top-menu-popup') &&
            (!c || !c.includes('activity-status') && !c.includes('loading'))) {
            $headerActivityBlock.removeClass('active');
        }

        if (!e || !e.target.closest('.top-login-popup') &&
            (!c || !c.includes('top-login-popup') && !c.includes('top-login-button'))) {
            $topHeader.find('.dropdown.top-login-popup').addClass('hidden');
        }

        if (!e || !e.target.closest('.create-new-folder') &&
            (!c || !c.includes('fm-new-folder'))) {

            var c3;

            if (e && e.target) {
                c3 = e.target.parentNode.className;
            }

            if (!c3 || c3.indexOf('fm-new-folder') === -1) {

                element = document.getElementsByClassName('fm-new-folder').item(0);

                if (element) {
                    element.classList.remove('active', 'filled-input');
                }

                element = document.getElementsByClassName('create-new-folder').item(0);

                if (element) {
                    element.classList.add('hidden');
                }
            }
        }

        if ((!e || !e.target.closest('.fm-add-user, .add-user-popup')) &&
            (!c || c.indexOf('fm-add-user') === -1)) {

            element = document.getElementsByClassName('fm-add-user').item(0);

            if (element) {
                element.classList.remove('active');
            }

            element = document.getElementsByClassName('add-user-popup').item(0);

            if (element) {
                element.classList.add('hidden');
                element.removeAttribute('style');
            }
        }

        if (!e || (!e.target.closest('.js-dropdown-notification') &&
            ((c && c.indexOf('js-topbarnotification') === -1) || !c))) {
            notify.closePopup();
        }

        if (!e || (!e.target.closest('.js-dropdown-warning') &&
            ((c && c.indexOf('js-dropdown-warning') === -1) || !c))) {
            elements = document.getElementsByClassName('js-dropdown-warning');
            for (i = elements.length; i--;) {
                elements[i].classList.remove('show');
            }
        }

        if (!e ||
            (
                !e.target.closest('.js-dropdown-account') &&
                (
                    c && c.indexOf('js-topbaravatar') === -1 ||
                    !c
                )
            )) {

            elements = document.getElementsByClassName('js-dropdown-account');

            for (i = elements.length; i--;) {
                elements[i].classList.remove('show');
            }
        }

        if (!e || !(parent && parent.classList.contains('js-dropdown-account'))) {
            $('.fm-breadcrumbs-block .dropdown').removeClass('active');
        }
    };

    $('#pageholder, #startholder', 'body').rebind('mousedown.hidetopmenu', function(e) {
        if (typeof $.hideTopMenu === 'function') {
            $.hideTopMenu(e);
        }
    });

    $headerAchievements.rebind('click.achievements', function() {
        mega.achievem.achievementsListDialog();
    });

    $headerDownloadMega.rebind('click.downloadmega', function() {
        loadSubPage('desktop');
    });

    // try individual button in business mode
    $headerIndividual.rebind('click.individual', function() {
        if (page === 'business') {
            sessionStorage.setItem('pro.subsection', 'individual');
            loadSubPage('pro');
        }
        else if (page === 'registerb') {
            loadSubPage('register');
        }
        else if (page === 'register') {
            loadSubPage('registerb');
        }
        else {
            if (folderlink) {
                eventlog(99750);
            }
            loadSubPage('business');
        }
    });

    $('.js-more-menu, .top-icon.menu', '.fmholder').rebind('click.openmenu', function() {
        if ($.liTooltipTimer) {
            clearTimeout($.liTooltipTimer);
        }
        topMenu();
    });

    $('.close', $topMenu).rebind('click.closemenu', function() {
        topMenu(1);
    });

    $('.top-user-status-popup .dropdown-item', $topHeader)
        .rebind('click.topui', function (e) {
            var $this = $(this);

            if ($this.attr('class').indexOf('active') === -1) {
                $topHeader.find('.top-user-status-popup .dropdown-item')
                    .removeClass('active');
                $headerActivityBlock.removeClass('active');

                if (!megaChatIsReady && !megaChatIsDisabled) {
                    var presence = $(this).data("presence");
                    localStorage.megaChatPresence = presence;
                    localStorage.megaChatPresenceMtime = unixtime();

                    $headerActivityBlock.addClass("fadeinout");
                    loadSubPage('fm/chat');
                }
            }
        });

    $('.top-menu-item, .logout', $topMenu)
        // eslint-disable-next-line complexity -- @todo refactor
        .rebind('click.menuitem tap.menuitem', function(ev) {
            var $this = $(this);
            var className = $this.attr('class') || '';

            if (className.indexOf('submenu-item') > -1) {
                if (className.indexOf('expanded') > -1) {

                    $(this).removeClass('expanded');
                }
                else {
                    $(this).addClass('expanded');
                }
                if (!is_mobile) {

                    delay('sideMenuScroll', function() {
                        topMenuScroll($('.top-menu-scroll', $topMenu));
                    }, 200);
                }
            }
            else if (className.indexOf('cookies-settings') > -1) {
                topMenu(1);
                if ('csp' in window) {
                    csp.trigger().dump('csp.trigger');
                }
            }
            else {
                if ($('.light-overlay', 'body').is(':visible')) {
                    loadingInitDialog.hide();
                }

                topMenu(1);

                var subpage;
                /*  TODO: Add bird when its done */
                var subPages = [
                    'about', 'account', 'keybackup', 'cmd', 'contact',
                    'copyright', 'corporate', 'credits', 'desktop', 'doc', 'extensions',
                    'login', 'mega', 'nzippmember', 'nziphotographer', 'privacy', 'mobileapp',
                    'mobile', 'register', 'resellers', 'sdk', 'sitemap', 'sourcecode',
                    'support', 'takedown', 'terms', 'start', 'security', 'affiliate',
                    'nas', 'pro', 'cookie', 'securechat', 'collaboration', 'storage', 'special',
                    'achievements', 'objectstorage'
                ];
                var moveTo = {
                    'account': 'fm/account',
                    'affiliate': 'refer',
                    'corporate': 'corporate/media'
                };

                for (var i = subPages.length; i--;) {
                    if (this.classList.contains(subPages[i])) {
                        subpage = subPages[i];
                        break;
                    }
                }

                if (is_mobile && className.indexOf('fm') > -1) {
                    mobile.loadCloudDrivePage();
                }
                else if (!is_mobile && subpage === 'keybackup') {
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
                    M.reload(ev.ctrlKey || ev.metaKey);
                }
                else if (!is_mobile && className.indexOf('languages') > -1) {
                    langDialog.show();
                }
                else if (className.indexOf('logout') > -1) {
                    mLogout();
                }
                else if (className.indexOf('transparency') > -1) {
                    window.open('https://transparency.mega.io', '_blank', 'noopener,noreferrer');
                }
                else if (className.includes('help')) {
                    window.open('https://help.mega.io');
                }
                else if (className.includes('blog')) {
                    window.open('https://blog.mega.io');
                }
            }
            return false;
        });

    $menuUserinfo.rebind('click.openaccount', function() {
        topMenu(1);
        loadSubPage('fm/account');
    });

    $menuUpgradeAccount.rebind('click.openpricing', function() {
        topMenu(1);
        loadSubPage('pro');
    });

    // Initialise the language sub menu for mobile
    if (is_mobile) {
        mobile.languageMenu.init();
    }

    // Hover tooltip for top-menu elements and sidebar icons
    $('.nw-fm-left-icon, .js-top-buttons').rebind('mouseover.nw-fm-left-icon', function() {
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
                if (!$tooltip.parent().is(':visible')) {
                    return;
                }
                if ($tooltip.hasClass('top')) {
                    tooltipWidth = $tooltip.outerWidth();
                    buttonPos = $this.position().left;
                    tooltipPos = buttonPos + $this.outerWidth() / 2 - tooltipWidth / 2;
                    if ($(document.body).width() - ($this.offset().left + tooltipPos + tooltipWidth) > 0) {
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

    // If the user name in the header is clicked, take them to the account overview page
    $('.user-name', $topHeader).rebind('click.showaccount', function() {
        loadSubPage('fm/account');
    });

    // If the main Mega M logo in the header is clicked
    $('.logo, .logo-full', '.top-head, .fm-main, .bar-table').rebind('click', () => {
        if (typeof loadingInitDialog === 'undefined' || !loadingInitDialog.active) {
            loadSubPage(u_type ? 'fm' : 'start');
        }
    });

    /**
     * this is closing the EFQ email confirm dialog, if needed for something else ask before re-enabling [dc]
    if (!$('.mega-dialog.registration-page-success').hasClass('hidden')) {
        $('.mega-dialog.registration-page-success').addClass('hidden');
        $('.fm-dialog-overlay').addClass('hidden');
        document.body.classList.remove('overlayed');
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

    if (!r && page.substr(0, 4) === "chat") {
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
    'use strict';
    if (window.is_karma) {
        return;
    }
    var metas = mega.metatags.getPageMetaTags(page);
    var mega_desc = metas.mega_desc || mega.whoami;
    mega_title = metas.mega_title || 'MEGA';

    $('meta[name=description]').remove();
    $('head').append('<meta name="description" content="' + String(mega_desc).replace(/[<">]/g, '') + '">');
    document.title = mega_title;
    megatitle();

    if (pagemetadata.last !== page) {
        mBroadcaster.sendMessage('pagemetadata', metas);
    }
    pagemetadata.last = page;
}

pagemetadata.last = null;


function parsepage(pagehtml) {
    'use strict';

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

    if (!$.mTransferWidgetPage && pages.transferwidget) {
        $.mTransferWidgetPage = translate(pages.transferwidget);
    }
    pagehtml = (($.mTransferWidgetPage || '') + pagehtml).replace(/{staticpath}/g, staticpath);

    $('#startholder').safeHTML(pagehtml).removeClass('hidden');

    // if this is bottom page & not Download Page we have to enforce light mode for now.
    if (page === 'download' && !is_mobile) {
        const theme = u_attr && u_attr['^!webtheme'] !== undefined ? u_attr['^!webtheme'] : 0;
        mega.ui.theme.set(theme);
    }
    else {
        document.body.classList.remove('theme-dark');
        document.body.classList.add('theme-light', 'bottom-pages');
    }

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
    'use strict';

    tpage = getCleanSitePath(tpage);

    if ('rad' in mega) {
        mega.rad.log('NAV', [page, tpage, !!event]);
    }

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
        mega.textEditorUI.doClose();
    }

    if (window.versiondialogid) {
        fileversioning.closeFileVersioningDialog(window.versiondialogid);
    }

    if (event && Object(event.state).view) {
        onIdle(function() {
            slideshow(event.state.view);
        });
        return false;
    }

    if (folderlink) {
        flhashchange = true;
    }
    else if (tpage === page) {
        return false;
    }

    if (M.chat && megaChatIsReady) {
        // navigating within the chat, skip the bloatware
        if (tpage !== 'securechat' && !tpage.startsWith('fm/search') && tpage.indexOf('chat') > -1) {
            if (fminitialized && tpage.startsWith("chat/") && megaChatIsReady) {
                // tried to navigate internally to a chat link, do a force redirect.
                // Can be triggered by the back button.
                assert(
                    megaChat.initialChatId,
                    'missing .initialChatId, did this page initialized from a standalone chat/meeting link?'
                );
                loadSubPage(`fm/chat/c/${megaChat.initialChatId}`);
                return false;
            }
            megaChat.navigate(tpage, event);
            return false;
        }

        // clear the flag if navigating to an static page..
        M.chat = tpage.substr(0, 2) === 'fm';
    }

    // TODO: check what this was for and its relevance
    var overlay = document.getElementById('overlay');
    if (overlay && overlay.style.display == '' && !is_fm()) {
        document.location.hash = hash;
        return false;
    }

    mBroadcaster.sendMessage('beforepagechange', tpage);
    if (window.is_chatlink) {
        window.is_chatlink = false;
        delete megaChat.initialPubChatHandle;
        delete M.currentdirid;
        megaChat.destroy();
    }
    dlid = false;

    if (tpage) {
        page = tpage;
    }
    else {
        page = '';
    }

    if (page) {
        var tmp = [];

        for (var p in subpages) {
            if (page.substr(0, p.length) === p) {
                for (var i in subpages[p]) {
                    if (!jsl_loaded[jsl2[subpages[p][i]].n]) {
                        tmp.push(jsl2[subpages[p][i]]);
                    }
                }
            }
        }

        if (tmp.length) {
            if (d) {
                console.info('loadSubPage: About to load required resources...', tmp);
            }

            if (jsl.length) {
                if (d) {
                    console.warn('loadSubPage: There are pending requests running, holding it..');
                }

                var oldSL = silent_loading;
                silent_loading = function() {
                    if (oldSL) {
                        tryCatch(oldSL)();
                    }
                    page = false;
                    loadSubPage(tpage, event);
                };

                return;
            }

            jsl = tmp;
        }
    }

    if (event && event.type === 'popstate' || event === 'override') {
        // In case we navigated to a location.hash, clean it up replacing the current history entry.
        pushHistoryState(true, page);
    }
    else {
        pushHistoryState(page);
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
    mBroadcaster.sendMessage('pagechange', tpage);
}

window.addEventListener('popstate', function(event) {
    'use strict';

    var state = event.state || {};
    var add = state.searchString || '';
    loadSubPage((state.subpage || state.fmpage || getCleanSitePath() || location.hash) + add, event);
}, {
    capture: true,
    passive: true,
});

window.onbeforeunload = function () {
    'use strict';

    if ('rad' in mega) {
        mega.rad.flush();
    }

    if (megaChatIsReady && megaChat.activeCall) {
        ion.sound.play('alert_info_message');
        return false;
    }

    if (window.dlmanager && (dlmanager.isDownloading || ulmanager.isUploading)) {
        return $.memIOSaveAttempt ? null : l[377];
    }

    if (window.fmdb && window.currsn && fminitialized
        && Object(fmdb.pending).length && Object.keys(fmdb.pending[0] || {}).length) {

        setsn(currsn);
        return l[16168];
    }

    if (window.doUnloadLogOut) {
        u_logout();
        delete window.doUnloadLogOut;
    }
    mBroadcaster.crossTab.leave();
};

window.onunload = function () {
    'use strict';
    if (window.doUnloadLogOut) {
        u_logout();
    }
    mBroadcaster.crossTab.leave();

    if (typeof dlpage_ph === 'string') {
        // Clear the download activity flag navigating away on the downloads page.
        dlmanager.dlClearActiveTransfer(dlpage_ph);
    }
};

mBroadcaster.once('boot_done', function() {
    'use strict';
    M = new MegaData();

    if (d) {
        if (!window.crossOriginIsolated) {
            if (window.crossOriginIsolated === false) {
                console.warn('cross-origin isolation is not enabled...');
            }
            return;
        }

        (function memoryMeasurement() {
            var performMeasurement = tryCatch(function() {
                performance.measureMemory()
                    .then(function(result) {
                        onIdle(memoryMeasurement);
                        console.info('Memory usage:', result);
                    });
            });

            if (!performance.measureMemory) {
                console.debug('performance.measureMemory() is not available.');
                return;
            }
            var interval = -Math.log(Math.random()) * 2e4;
            console.info('Scheduling memory measurement in %d seconds.', Math.round(interval / 1e3));
            setTimeout(performMeasurement, interval);
        })();
    }
});

// After open folder call, check if we should restore any previously opened preview node.
mBroadcaster.once('mega:openfolder', function() {
    'use strict';

    const {previewNode} = sessionStorage;
    if (previewNode) {
        sessionStorage.removeItem('previewNode');
        slideshow(previewNode);
    }
});
