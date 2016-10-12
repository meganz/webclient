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
var flhashchange = false;
var avatars = {};

var pro_json = '[[["N02zLAiWqRU",1,500,1024,1,"9.99","EUR"],["zqdkqTtOtGc",1,500,1024,12,"99.99","EUR"],["j-r9sea9qW4",2,2048,4096,1,"19.99","EUR"],["990PKO93JQU",2,2048,4096,12,"199.99","EUR"],["bG-i_SoVUd0",3,4096,8182,1,"29.99","EUR"],["e4dkakbTRWQ",3,4096,8182,12,"299.99","EUR"]]]';

pages['placeholder'] = '((TOP))<div class="main-scroll-block"><div class="main-pad-block">' +
                       '<div class="main-mid-pad new-bottom-pages"></div></div></div>';

function startMega() {
    if (!window.M) {
        window.M = new MegaData();
    }
    mBroadcaster.sendMessage('startMega');

    if (silent_loading) {
        silent_loading();
        jsl = [];
        silent_loading = false;
        return false;
    }
    else {
        populate_l();
    }

    if (pages['dialogs']) {
        $('body').safeAppend(translate(pages['dialogs'].replace(/{staticpath}/g, staticpath)));
        delete pages['dialogs'];
    }
    if (pages['onboarding']) {
        $('body').safeAppend(translate(pages['onboarding'].replace(/{staticpath}/g, staticpath)));
        delete pages['onboarding'];
    }
    if (pages['chat']) {
        $('body').safeAppend(translate(pages['chat'].replace(/{staticpath}/g, staticpath)));
        delete pages['chat'];
    }
    jsl = [];
    if(typeof(mega_custom_boot_fn) === 'undefined') {
        init_page();
    } else {
        mega_custom_boot_fn();
    }

    mBroadcaster.sendMessage('zoomLevelCheck');
    $('#pwdmanhelper input').val('');
}

function mainScroll() {
    $('.main-scroll-block').jScrollPane({
        showArrows: true,
        arrowSize: 5,
        animateScroll: true,
        verticalDragMinHeight: 150,
        enableKeyboardNavigation: true
    });
    $('.main-scroll-block').unbind('jsp-scroll-y.menu');
    jScrollFade('.main-scroll-block');
    if (page === 'doc' || page.substr(0, 4) === 'help' || page === 'cpage' || page === 'sdk' || page === 'dev') {
        scrollMenu();
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
    $('.main-scroll-block').bind('jsp-scroll-y', function (event, scrollPositionY, isAtTop, isAtBottom) {
        if (page === 'doc' || page.substr(0, 4) === 'help' || page === 'cpage' || page === 'sdk' || page === 'dev') {
            var sc = scrollPositionY + 30;
            if (isAtTop) {
                sc = 30;
            }
            if ($('.main-scroll-block .jspPane').height() - sc - $('.new-left-menu-block').height() - $('.nw-bottom-block').height() - 100 < 0) {
                sc = $('.main-scroll-block .jspPane').height()
                    - $('.new-left-menu-block').height()
                    - $('.nw-bottom-block').height() - 100;
            }
            $('.new-left-menu-block').css('padding-top', sc + 'px');
        }
    });
}

function topPopupAlign(button, popup, topPos) {
    var $button = $(button),
        $popup = $(popup),
        $popupArrow = $popup.find('.dropdown-white-arrow'),
        pageWidth,
        popupRightPos,
        arrowRightPos,
        buttonTopPos;

    if ($button.length && $popup.length) {
        pageWidth = $('body').width();
        $popupArrow.removeAttr('style');
        popupRightPos = pageWidth
            - $button.offset().left
            - $button.outerWidth()/2
            - $popup.outerWidth()/2;
        if (topPos) {
            $popup.css('top', topPos + 'px');
        } else {
            buttonTopPos = $button.offset().top + $button.outerHeight();
            $popup.css('top', buttonTopPos + 13 + 'px');
        }


        if (popupRightPos > 10) {
            $popup.css('right', popupRightPos + 'px');
        } else {
            $popup.css('right', '10px');
            arrowRightPos = pageWidth
                - $button.offset().left
                - $button.outerWidth()/2;
            $popupArrow.css({
                left: 'auto',
                right: arrowRightPos - 22
            })
        }

    }
}

function init_page() {

    /*if (page.substr(0, 8) == 'redirect') {
        return location.hash = page.substr(8);
    }*/

    // If they are transferring from mega.co.nz
    if (page.substr(0, 13) == 'sitetransfer!') {

        // If false, then the page is changing hash URL so don't continue past here
        if (M.transferFromMegaCoNz() === false) {
            return false;
        }
    }

    if (page.substr(0, 1) === '!' && page.length > 1) {
        var ar = page.substr(1, page.length - 1).split('!');
        if (ar[0]) {
            dlid = ar[0].replace(/[^\w-]+/g, "");
        }

        dlkey = false;
        if (ar[1]) {
            dlkey = ar[1].replace(/[^\w-]+/g, "");
        }

        if (mega.utils.hasPendingTransfers()) {
            page = 'download';

            if ($.lastSeenFilelink === location.hash) {
                return;
            }

            mega.utils.abortTransfers()
                .done(function() {
                    location.reload();
                })
                .fail(function() {
                    location.hash = $.lastSeenFilelink;
                });

            return;
        }
        $.lastSeenFilelink = location.hash;
    }

    if (!u_type) {
        $('body').attr('class', 'not-logged');
    }
    else {
        $('body').attr('class', '');
    }

    // Add language class to body for CSS fixes for specific language strings
    $('body').addClass(lang);

    if ('-fa-ar-he-'.indexOf('-' + lang + '-') > -1) {
        $('body').addClass('rtl');
    }

    if ($.startscroll) {
        delete $.startscroll;
    }
    if ($.dlscroll) {
        delete $.dlscroll;
    }
    if ($.infoscroll) {
        delete $.infoscroll;
    }

    // If on the plugin page, show the page with the relevant extension for their current browser
    if (page == 'plugin') {
        page = (window.chrome) ? 'chrome' : 'firefox';
    }

    if (localStorage.signupcode && u_type !== false) {
        delete localStorage.signupcode;
    }
    else if (localStorage.signupcode
            && page.substr(0, 6) !== 'signup'
            && page !== 'register'
            && page !== 'terms'
            && page !== 'mega'
            && page !== 'privacy' && page !== 'chrome' && page !== 'firefox') {
        register_txt = l[1291];
        document.location.hash = 'signup' + localStorage.signupcode;
        return false;
    }
    if (!page.match(/^(blog|help|corporate|page_)/)) {
        $('.top-head').remove();
    }
    $('#loading').hide();
    if (window.loadingDialog) {
        loadingDialog.hide();
    }

    // If they recently tried to redeem their voucher but were not logged in or registered then direct them to the
    // #redeem page to complete their purchase. For newly registered users this happens after key creation is complete.
    if ((localStorage.getItem('voucher') !== null) && (u_type === 3)) {
        document.location.hash = 'redeem';
    }

    var wasFolderlink = pfid;
    var oldPFKey = pfkey;
    if (page.substr(0, 2) == 'F!' && page.length > 2) {
        var ar = page.substr(2, page.length - 1).split('!');

        pfid = false;
        if (ar[0]) {
            pfid = ar[0].replace(/[^\w-]+/g, "");
        }

        pfkey = false;
        if (ar[1]) {
            pfkey = ar[1].replace(/[^\w-]+/g, "");
        }

        pfhandle = false;
        if (ar[2]) {
            pfhandle = ar[2].replace(/[^\w-]+/g, "");
        }

        n_h = pfid;
        if (!flhashchange || pfkey !== oldPFKey) {
            if (pfkey) {
                api_setfolder(n_h);
                if (waitxhr) {
                    waitsc();
                }
                u_n = pfid;
            }
            else {
                // Insert placeholder page while waiting for user input
                parsepage(pages['placeholder']);

                return mKeyDialog(pfid, true)
                    .fail(function() {
                        location.hash = 'start';
                    });
            }
        }
        if (pfhandle) {
            page = 'fm/' + pfhandle;
        }
        else {
            page = 'fm';
        }

        if (fminitialized) {
            M.currentdirid = undefined;
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

    if (page.substr(0, 7) == 'confirm') {
        confirmcode = page.replace("confirm", "");
        page = 'confirm';
    }
    if (page.substr(0, 7) == 'pwreset') {
        resetpwcode = page.replace("pwreset", "");
        page = 'resetpassword';
    }
    if (page.substr(0, 5) == 'newpw') {
        pwchangecode = page.replace("newpw", "");
        page = 'newpw';
    }

    blogmonth = false;
    blogsearch = false;

    if (!$.mcImport && typeof closeDialog === 'function') {
        closeDialog();
    }

    // Do not show this dialog while entering into the downloads page
    if (page.substr(0, 1) !== '!' && localStorage.awaitingConfirmationAccount) {
        var acc = JSON.parse(localStorage.awaitingConfirmationAccount);

        // if visiting a #confirm link, or they confirmed it elsewhere.
        if (confirmcode || u_type > 1) {
            delete localStorage.awaitingConfirmationAccount;
        }
        else {
            // Insert placeholder page while waiting for user input
            parsepage(pages['placeholder']);

            return mega.ui.sendSignupLinkDialog(acc, function() {
                // The user clicked 'close', abort and start over...

                delete localStorage.awaitingConfirmationAccount;
                init_page();
            });
        }
    }

    var fmwasinitialized = !!fminitialized;
    if (((u_type === 0 || u_type === 3) || pfid || folderlink) && (!flhashchange || !pfid || pfkey !== oldPFKey)) {

        if (is_fm()) {
            // switch between FM & folderlinks (completely reinitialize)
            if ((!pfid && folderlink) || (pfid && folderlink === 0) || pfkey !== oldPFKey) {

                // re-initialize waitd connection when switching.
                if (!pfid && folderlink && u_sid) {
                    api_setsid(u_sid);

                    if (waitxhr) {
                        waitsc();
                    }
                }

                M.reset();
                folderlink = 0;
                fminitialized = false;
                loadfm.loaded = false;
                if (loadfm.loading) {
                    api_init(wasFolderlink ? 1 : 0, 'cs');
                    loadfm.loading = false;
                }
                if (typeof mDBcls === 'function') {
                    mDBcls();
                }
            }
        }

        if (!fminitialized) {
            if (u_type === 3 && !pfid && !folderlink) {
                mega.config.fetch();
            }

            mega.loadReport = {startTime: Date.now(), stepTimeStamp: Date.now()};

            if (typeof mDB !== 'undefined' && !pfid && (!flhashchange || page === 'fm')) {
                mDBstart();
                mega.loadReport.mode = 1;
            }
            else {
                loadfm();
                mega.loadReport.mode = 2;
            }
        }

        // Cleanup M.currentdirid switching from static pages <> fm
        if (fminitialized) {
            if (is_fm()) {
                M.currentdirid = M.lastCurrentDirID;
                delete M.lastCurrentDirID;
            }
            else if (M.currentdirid) {
                M.lastCurrentDirID = M.currentdirid;
                M.currentdirid = null;
            }
        }
    }

    if (page.substr(0, 10) == 'blogsearch') {
        blogsearch = decodeURIComponent(page.substr(11, page.length - 2));
        if (!blogsearch) {
            document.location.hash = 'blog';
        }
        page = 'blog';
        parsepage(pages['blogarticle']);
        init_blog();
    }

    // Password protected link decryption dialog
    else if (page.substr(0, 2) === 'P!' && page.length > 2) {

        // Insert placeholder page while waiting for user input
        parsepage(pages['placeholder']);

        // Show the decryption dialog and pass in the current URL hash
        exportPassword.decrypt.init(page);
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
                mainScroll();
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
                mainScroll();
            });
        }

        doRenderCorpPage();
        page = 'cpage';
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
                mainScroll();
            });
        }

        doRenderCMSPage();
        page = 'cpage';
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
            removeHash();
            location.hash = '#register';
        }
        else {
            // Redirect to the register page
            removeHash();
            location.hash = '#register';

            // Show message
            alert('We can\'t decipher your invite link, please check you copied the link correctly, or sign up manually with the same email address.');
        }
    }
    else if (page.substr(0, 6) == 'signup') {
        var signupcode = page.substr(6, page.length - 1);
        loadingDialog.show();
        api_req({
            a: 'uv',
            c: signupcode
        }, {
            callback: function (res) {
                loadingDialog.hide();
                if (typeof res == 'number' && res < 0) {
                    if (localStorage.signupcode) {
                        delete localStorage.signupcode;
                        delete localStorage.registeremail;
                    }
                    else {
                        msgDialog('warningb', l[135], l[1290]);
                    }
                    document.location.hash = 'start';
                }
                else if (u_type === false) {
                    localStorage.signupcode = signupcode;
                    localStorage.registeremail = res;
                    document.location.hash = 'register';
                    if (!register_txt) {
                        register_txt = l[1289];
                    }
                }
                else {
                    var confirmtxt = 'You are currently logged in. Would you like to log out and register a new account?';
                    if (l[1824]) {
                        confirmtxt = l[1824];
                    }
                    msgDialog('confirmation', l[968], confirmtxt, '', function (e) {
                        if (e) {
                            mLogout();
                        }
                        else {
                            document.location.hash = '';
                        }
                    });
                }
            }
        });
    }
    else if (page == 'newpw') {
        setpwset(pwchangecode, {
            callback: function (res) {
                loadingDialog.hide();
                if (res[0] == EACCESS || res[0] == 0) {
                    alert(l[727]);
                }
                else if (res[0] == EEXPIRED) {
                    alert(l[728]);
                }
                else if (res[0] == ENOENT) {
                    alert(l[729]);
                }
                else {
                    alert(l[200]);
                }
                if (u_type == 3) {
                    page = 'account';
                    parsepage(pages['account']);
                    load_acc();
                }
                else {
                    page = 'login';
                    parsepage(pages['login']);
                    init_login();
                }
            }
        });
    }
    else if (page == 'confirm') {
        loadingDialog.show();
        var ctx = {
            signupcodeok: function (email, name) {
                loadingDialog.hide();
                confirmok = true;
                page = 'login';
                parsepage(pages['login']);
                login_txt = l[378];
                init_login();
                $('#login-name2').val(email);
                $('.register-st2-button').addClass('active');
                $('#login-name2').attr('readonly', true);
                topmenuUI();
            },
            signupcodebad: function (res) {
                loadingDialog.hide();
                if (res == EINCOMPLETE) {
                    alert(l[703]);
                }
                else if (res == ENOENT) {
                    login_txt = l[704];
                }
                else {
                    alert(l[705] + res);
                }
                page = 'login';
                parsepage(pages['login']);
                init_login();
                topmenuUI();
            }
        }
        verifysignupcode(confirmcode, ctx);
    }
    else if (u_type == 2) {
        parsepage(pages['key']);
        init_key();
    }
    else if (page == 'login') {
        if (u_storage.sid) {
            document.location.hash = '#fm';
            return false;
        }
        parsepage(pages['login']);
        init_login();
    }
    else if (page == 'account') {
        document.location.hash = 'fm/account';
        return false;
    }
    else if (page == 'dashboard') {
        document.location.hash = 'fm/dashboard';
        return false;
    }
    else if (page == 'register') {
        if (u_storage.sid && u_type !== 0) {
            document.location.hash = '#fm';
            return false;
        }
        parsepage(pages['register']);
        init_register();
    }
    else if (page == 'key') {
        parsepage(pages['key']);
        init_key();
    }
    else if (page === 'support') {
        parsepage(pages['support']);
        support.initUI();
    }
    else if (page == 'contact') {
        parsepage(pages['contact']);
        if (lang == 'ru') {
            $('.account-mid-block').addClass('high');
        }
    }
    else if (page.substr(0, 4) == 'help') {
        return Help.render();
        function doRenderHelp() {
            if (window.helpTemplate) {
                parsepage(window.helpTemplate);
                init_help();
                loadingDialog.hide();
                topmenuUI();
                mainScroll();
                return;
            }
            loadingDialog.show();
            CMS.watch('help.' + lang, function () {
                window.helpTemplate = null;
                doRenderHelp();
            });
            CMS.get(['help.' + lang, 'help.' + lang + '.json'], function (err, content, json) {
                helpdata = json.object
                parsepage(window.helpTemplate = content.html);
                init_help();
                loadingDialog.hide();
                topmenuUI();
                mainScroll();
            });
        }
        doRenderHelp();
    }
    else if (page == 'privacy') {
        parsepage(pages['privacy']);
    }
    else if (page == 'mega') {
        parsepage(pages['mega']);
        megainfotxt();
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
        login_txt = l[1298];
        parsepage(pages['login']);
        init_login();
    }
    else if (page == 'backup') {
        parsepage(pages['backup']);
        init_backup();
    }
    else if (page.substr(0, 6) === 'cancel' && page.length > 24) {

        if (u_type) {
            var ac = new mega.AccountClosure();
            ac.initAccountClosure();
        }
        else {
            // Unable to cancel, not logged in
            mega.ui.showLoginRequiredDialog({
                title: l[6186],
                textContent: l[5841]
            })
            .done(init_page)
            .fail(function(aError) {
                if (aError) {
                    alert(aError);
                }
                location.hash = 'start';
            });
        }
    }
    else if (page === 'recovery') {
        parsepage(pages['recovery']);
        var accountRecovery = new mega.AccountRecovery();
        accountRecovery.initRecovery();
    }
    else if (page.substr(0, 7) == 'recover' && page.length > 25) {
        parsepage(pages['reset']);
        init_reset();
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
        CMS.get("team", function(err, content) {
            parsepage(pages['about']);

            var html = '';
            var a = 4;

            $('.about').safeHTML(content.html);
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
            mainScroll();

        });
        return;
    }
    else if (page === 'sourcecode') {
        parsepage(pages['sourcecode']);
    }
    else if (page === 'terms') {
        parsepage(pages['terms']);
    }
    else if (page === 'general') {
        parsepage(pages['general']);
    }
    else if (page == 'takedown') {
        parsepage(pages['takedown']);
    }
    else if (page == 'blog') {
        parsepage(pages['blog']);
        init_blog();
    }
    else if (page == 'copyright') {
        parsepage(pages['copyright']);
        $('.reg-st5-complete-button').rebind('click', function (e) {
            document.location.hash = 'copyrightnotice';
        });
        if (lang == 'en') {
            $('#copyright_txt').text($('#copyright_txt').text().split('(i)')[0]);
            $('#copyright_en').removeClass('hidden');
            mainScroll();
        }
    }
    else if (page === 'disputenotice') {
        parsepage(pages['disputenotice']);
        copyright.init_cndispute();
    }
    else if (page === 'dispute') {
        parsepage(pages['dispute']);
        $('.reg-st5-complete-button').rebind('click', function (e) {
            document.location.hash = 'disputenotice';
        });
        mainScroll();
    }
    else if (page.substr(0, 3) == 'pro') {
        var tmp = page.split('/uao=');
        if (tmp.length > 1) {
            mega.uaoref = decodeURIComponent(tmp[1]);
            location.hash = tmp[0];
            return;
        }
        parsepage(pages['pro']);
        init_pro();
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
        mainScroll();
    }
    else if (page === 'chrome') {
        parsepage(pages['chrome']);
        chromepage.init();
    }
    else if (page === 'firefox') {
        parsepage(pages['firefox']);
        firefoxpage.init();
    }
    else if (page.substr(0, 4) == 'sync') {
        parsepage(pages['sync']);
        init_sync();
        topmenuUI();
        mainScroll();
    }
    else if (page == 'mobile') {
        parsepage(pages['mobile']);
    }
    else if (page == 'resellers') {
        parsepage(pages['resellers']);
    }
    else if (page == 'takedown') {
        parsepage(pages['takedown']);
    }
    else if (page == 'done') {
        parsepage(pages['done']);
        init_done();
    }
    else if (page == 'copyrightnotice') {
        parsepage(pages['copyrightnotice']);
        copyright.init_cn();
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
        parsepage(pages['download'], 'download');
        dlinfo(dlid, dlkey, false);
        topmenuUI();
        mainScroll();
    }

    /**
     * If voucher code from url e.g. #voucherZUSA63A8WEYTPSXU4985
     */
    else if (page.substr(0, 7) === 'voucher') {

        // Get the voucher code from the URL which is 20 characters in length
        var voucherCode = page.substr(7, 20);

        // Store in localStorage to be used by the Pro page or when returning from login
        localStorage.setItem('voucher', voucherCode);

        // If not logged in, direct them to login or register first
        if (u_type === false) {
            login_txt = l[7712];
            document.location.hash = 'login';
            return false;
        }
        else if (u_type < 3) {
            // If their account is ephemeral and the email is not confirmed, then show them a dialog to warn them and
            // make sure they confirm first otherwise we get lots of chargebacks from users paying in the wrong account
            msgDialog('warningb', l[8666], l[8665], false, function() {
                location.hash = 'fm';
            });
        }
        else {
            // Otherwise go to the Redeem page which will detect the voucher code and show a dialog
            document.location.hash = 'redeem';
            return false;
        }
    }

    // Load the direct voucher redeem page
    else if (page.substr(0, 6) === 'redeem') {
        loadingDialog.show();
        parsepage(pages['redeem']);
        redeem.init();
    }

    else if (is_fm()) {
        var id = false;
        if (page.substr(0, 2) === 'fm') {
            id = page.replace('fm/', '');
            if (id.length < 5 && (id !== 'chat' && id !== 'opc' && id !== 'ipc')) {
                id = false;
            }
        }

        if (d) console.log('Setting up fm...', id, pfid, fmwasinitialized, fminitialized, M.currentdirid);

        if (!id && fmwasinitialized) {
            id = M.RootID;
        }

        if (!fminitialized) {
            if (id) {
                M.currentdirid = id;
            }
            if (!m && $('#fmholder').html() == '') {
                $('#fmholder').safeHTML(translate(pages['fm'].replace(/{staticpath}/g, staticpath)));
            }
        }
        else if ((!pfid || flhashchange) && id && id !== M.currentdirid) {
            M.openFolder(id);
        }
        else {
            if (ul_queue.length > 0) {
                openTransferpanel();
            }

            if (u_type === 0 && !u_attr.terms) {
                $.termsAgree = function() {
                    u_attr.terms = 1;
                    api_req({a: 'up', terms: 'Mq'});
                    // queued work is continued when user accept terms of service
                    $('.transfer-pause-icon').removeClass('active');
                    $('.nw-fm-left-icon.transfers').removeClass('paused');
                    dlQueue.resume();
                    ulQueue.resume();
                    uldl_hold = false;
                    if (ul_queue.length > 0) {
                        showTransferToast('u', ul_queue.length);
                    }
                };

                $.termsDeny = function() {
                    u_logout();
                    document.location.reload();
                };

                dlQueue.pause();
                ulQueue.pause();
                uldl_hold = true;

                termsDialog();
            }
        }
        $('#topmenu').safeHTML(parsetopmenu());

        $('#pageholder').hide();
        $('#startholder').hide();
        if ($('#fmholder:visible').length == 0) {
            $('#fmholder').show();
            if (fminitialized) {
                if (M.viewmode == 1) {
                    iconUI();
                }
                else {
                    gridUI();
                }
                treeUI();
                if ($.transferHeader) {
                    $.transferHeader();
                }
            }
        }

        if (typeof fdl_queue_var !== 'undefined') {
            if (!$('.transfer-table tr#dl_' + Object(fdl_queue_var).ph).length) {
                var fdl = dlmanager.getDownloadByHandle(Object(fdl_queue_var).ph);
                if (fdl && fdl_queue_var.dlkey === dlpage_key) {

                    Soon(function() {
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
    }
    else if (page.substr(0, 2) == 'fm' && !u_type) {
        if (loggedout) {
            document.location.hash = 'start';
            return false;
        }
        login_next = page;
        login_txt = l[1298];
        document.location.hash = 'login';
    }
    else if (typeof init_start === 'function') {
        page = 'start';
        parsepage(pages['start'], 'start');
        init_start();
    }
    else {
        location.assign('/');
    }

    // Initialise the Public Service Announcement system
    if (typeof psa !== 'undefined') {
        psa.init();
    }

    // Initialise the update check system
    if (typeof alarm !== 'undefined') {
        alarm.siteUpdate.init();
    }
    topmenuUI();
    loggedout = false;
    flhashchange = false;
}

function loginDialog(close) {
    var $dialog = $('.dropdown.top-login-popup');
    if (close) {
        $dialog.find('form').empty();
        $dialog.addClass('hidden');
        return false;
    }
    $dialog.find('form').replaceWith(getTemplate('top-login'));
    if (localStorage.hideloginwarning || is_extension) {
        $dialog.find('.top-login-warning').hide();
        $dialog.find('.login-notification-icon').removeClass('hidden');
    }
    $dialog.find('.login-checkbox, .radio-txt').rebind('click', function (e) {
        var c = $dialog.find('.login-checkbox').attr('class');
        if (c.indexOf('checkboxOff') > -1) {
            $dialog.find('.login-checkbox').attr('class', 'login-checkbox checkboxOn');
        }
        else {
            $dialog.find('.login-checkbox').attr('class', 'login-checkbox checkboxOff');
        }
    });

    $('.top-login-forgot-pass').rebind('click', function (e) {
        document.location.hash = 'recovery';
        loginDialog(1);
    });

    $('.top-dialog-login-button').rebind('click', function (e) {
        tooltiplogin();
    });
    $('.top-login-full').rebind('click', function (e) {
        loginDialog(1);
        document.location.hash = 'login';
    });
    $('#login-password, #login-name').rebind('keydown', function (e) {
        $('.top-login-pad').removeClass('both-incorrect-inputs');
        $('.top-login-input-tooltip.both-incorrect').removeClass('active');
        $('.top-login-input-block.password').removeClass('incorrect');
        $('.top-login-input-block.e-mail').removeClass('incorrect');
        if (e.keyCode == 13) {
            tooltiplogin();
        }
    });

    $('.top-login-warning-close').rebind('click', function (e) {
        if ($('.loginwarning-checkbox').hasClass('checkboxOn')) {
            localStorage.hideloginwarning = 1;
        }
        $('.top-login-warning').removeClass('active');
        $('.login-notification-icon').removeClass('hidden');
    });
    $('.login-notification-icon').rebind('click', function (e) {
        $('.top-login-warning').show();
        $('.top-login-warning').addClass('active');
        $(this).addClass('hidden');
    });

    $('.top-login-input-block').rebind('click', function (e) {
        $(this).find('input').focus();
    });

    $('.top-login-input-block.password input,.top-login-input-block.e-mail input').rebind('blur', function() {
        $(this).parents('.top-login-input-block').removeClass('focused');
    }).rebind('focus', function() {
        $(this).parents('.top-login-input-block').addClass('focused');
    });


    $('.loginwarning-checkbox,.top-login-warning .radio-txt').rebind('click', function (e) {
        var c = '.loginwarning-checkbox',
            c2 = $(c).attr('class');
        $(c).removeClass('checkboxOn checkboxOff');
        if (c2.indexOf('checkboxOff') > -1) {
            $(c).addClass('checkboxOn');
        }
        else {
            $(c).addClass('checkboxOff');
        }
    });

    Soon(function() {
        $('.dropdown.top-login-popup').removeClass('hidden');
        topPopupAlign('.top-login-button', '.dropdown.top-login-popup', 40);
        if (is_chrome_firefox) {
            mozLoginManager.fillForm.bind(mozLoginManager, 'form_login_header');
        }
    });
}

function tooltiplogin() {
    var e = $('#login-name').val();
    if (e === '' || checkMail(e)) {
        $('.top-login-input-block.e-mail').addClass('incorrect');
        $('#login-name').val('');
        $('#login-name').focus();
    }
    else if ($('#login-password').val() === '') {
        $('.top-login-input-block.password').addClass('incorrect');
    }
    else {
        $('.top-dialog-login-button').addClass('loading');
        if ($('.loginwarning-checkbox').hasClass('checkboxOn')) {
            localStorage.hideloginwarning = 1;
        }
        var remember;
        if ($('.login-checkbox').attr('class').indexOf('checkboxOn') > -1) {
            remember = 1;
        }
        postLogin($('#login-name').val(), $('#login-password').val(), remember, function (r) {
            $('.top-dialog-login-button').removeClass('loading');
            if (r == EBLOCKED) {
                alert(l[730]);
            }
            else if (r) {
                passwordManager('#form_login_header');
                u_type = r;
                if (login_next) {
                    document.location.hash = login_next;
                }
                else if (page !== 'login') {
                    page = document.location.hash.substr(1);
                    init_page();
                }
                else {
                    document.location.hash = 'fm';
                }
                login_next = false;
            }
            else {
                $('.top-login-pad').addClass('both-incorrect-inputs');
                $('.top-login-input-tooltip.both-incorrect').addClass('active');
                $('#login-password').select();
            }
        });
    }
}

function topmenuUI() {
    if (u_type === 0) {
        $('.top-login-button').text(l[967]);
    }

    $('.top-icon.warning').addClass('hidden');
    $('.top-menu-item.upgrade-your-account,.top-menu-item.export').addClass('hidden');
    $('.top-menu-item.logout, .top-menu-item.resellers').addClass('hidden');
    $('.top-menu-item.register,.top-menu-item.login').addClass('hidden');
    $('.top-menu-item.clouddrive,.top-menu-item.account').addClass('hidden');
    $('.top-menu-item.refresh-item, .top-menu-divider.refresh').addClass('hidden');
    $('.activity-status-block .activity-status,.activity-status-block').hide();
    $('.membership-status-block i').attr('class', 'tiny-icon membership-status free');
    $('.membership-status, .top-head .user-name, .top-icon.achievements').hide();

    if (fminitialized) {
        $('.top-search-bl').removeClass('hidden');
    }
    else {
        $('.top-search-bl').addClass('hidden');
    }

    $('.fm-avatar').hide();

    // If the 'name' property is set, display it
    if (u_type == 3 && u_attr.name) {
        $('.top-head .user-name').text(u_attr.name);
        $('.top-head .user-name').show();
    }

    //Show language in top menu
    $('.top-menu-item.languages .right-el').text(lang);

    if (u_type) {

        $('.top-menu-item.logout,.top-menu-item.export').removeClass('hidden');
        $('.top-menu-item.clouddrive,.top-menu-item.account').removeClass('hidden');
        $('.fm-avatar').show();
        $('.top-login-button').hide();
        $('.membership-status').show();
        $('.top-change-language').hide();
        $('.create-account-button').hide();
        $('.membership-status-block').show();
        $('.top-icon.notification').show();
        if (u_attr.maf) {
            $('.top-icon.achievements').show();
        }

        Soon(function() {
            if (!avatars[u_handle]) {
                useravatar.loadAvatar(u_handle);
            }
        });

        // If a Lite/Pro plan has been purchased
        if (u_attr.p) {

            // Set the plan text
            var proNum = u_attr.p;
            var purchasedPlan = getProPlan(proNum);

            // Set colour of plan
            var cssClass = (proNum == 4) ? 'lite' : 'pro' + proNum;

            // Show the 'Upgrade your account' button in the main menu for all
            $('.top-menu-item.upgrade-your-account,.top-menu-item.resellers').addClass('hidden');
            $('.membership-icon-pad .membership-big-txt.plan-txt').text(purchasedPlan);
            $('.membership-icon-pad .membership-icon').attr('class', 'membership-icon pro' + u_attr.p);
            $('.membership-status-block i').attr('class', 'tiny-icon membership-status ' + cssClass);
            $('.top-menu-item.account .right-el').text(purchasedPlan);
            $('.membership-popup').addClass('pro-popup');
            $('body').removeClass('free');
        }
        else {
            // Show the free badge
            $('.top-menu-item.upgrade-your-account,.top-menu-item.resellers').removeClass('hidden');
            $('.context-menu-divider.upgrade-your-account').removeClass('pro lite');
            $('.membership-icon').attr('class','membership-icon');
            $('.top-menu-item.account .right-el').text('FREE');
            $('.membership-status').attr('class', 'tiny-icon membership-status free');
            $('.membership-popup').removeClass('pro-popup');
            $('body').addClass('free');
        }

        if (is_fm()) {
            $('.top-menu-item.refresh-item,.top-menu-divider.refresh').removeClass('hidden');
        }

        // If the chat is disabled don't show the green status icon in the header
        if (!megaChatIsDisabled) {
            $('.activity-status-block, .activity-status-block .activity-status').show();
            if (megaChatIsReady) {
                megaChat.renderMyStatus();
            }
        }

        // Show PRO plan expired warning popup (if applicable)
        alarm.planExpired.render();
    }
    else {
        if (u_type === 0 && !confirmok && page !== 'key') {

            $('.top-menu-item.register').text(l[968]);
            $('.top-menu-item.clouddrive').removeClass('hidden');

            // If they have purchased Pro but not activated yet, show a warning
            if (isNonActivatedAccount()) {
                alarm.nonActivatedAccount.render();
            }

            // Otherwise show the ephemeral session warning
            else if (($.len(M.c[M.RootID] || {})) && (page !== 'register')) {
                alarm.ephemeralSession.render();
            }
        }

        $('.top-menu-item.upgrade-your-account,.top-menu-item.resellers').addClass('hidden');
        $('.top-menu-item.pro-item span').text(l[129]);
        $('.membership-status-block').hide();
        $('.top-icon.notification').hide();
        $('.top-icon.achievements').hide();
        $('.create-account-button').show();
        $('.create-account-button').rebind('click', function () {
            document.location.hash = 'register';
        });
        $('.top-login-button').show();
        $('.top-login-button').rebind('click', function () {
            if (u_type === 0) {
                mLogout();
            }
            else {
                var c = $('.dropdown.top-login-popup').attr('class');
                if (c && c.indexOf('hidden') > -1) {
                    loginDialog();
                }
                else {
                    loginDialog(1);
                }
            }
        });

        // Only show top language change icon if not logged in
        if (u_type === false) {

            // Get current language
            var $topChangeLang = $('.top-change-language');
            var $topChangeLangName = $topChangeLang.find('.top-change-language-name');

            //TODO: Change translated values on short translated
            //var languageName = ln[lang];

            // Init the top header change language button
            $topChangeLangName.text(lang);
            $topChangeLang.removeClass('hidden');
            $topChangeLang.rebind('click', function() {

                // Add log to see how often they click to change language
                api_req({ a: 'log', e: 99600, m: 'Language menu opened from top header' });

                // Open the language dialog
                langDialog.show();
            });
        }

        $('.top-menu-item.register,.top-menu-item.login').removeClass('hidden');

        if (u_type === 0) {
            $('.top-menu-item.login').addClass('hidden');
            $('.top-menu-item.logout').removeClass('hidden');
        }

    }

    $.hideTopMenu = function (e) {

        var c;

        if (e) {
            c = $(e.target).attr('class');
        }
        if (!e || ($(e.target).parents('.membership-popup').length == 0
                && ((c && c.indexOf('membership-status') == -1) || !c))
                || (c && c.indexOf('mem-button') > -1)) {
            $('.membership-popup').addClass('hidden');
            $('.membership-status-block').removeClass('active');
        }
        if (!e || ($(e.target).parents('.top-menu-popup').length == 0
                && !$(e.target).hasClass('top-menu-popup')
                && ((c && c.indexOf('top-icon menu') == -1) || !c))) {
            $('.top-menu-popup').addClass('hidden');
            $('.top-icon.menu').removeClass('active');
            $(window).unbind('resize.topmenu');
        }
        if (!e || ($(e.target).parents('.top-warning-popup').length == 0
                && ((c && c.indexOf('warning-icon-area') == -1) || !c))) {
            $('.top-warning-popup').addClass('hidden');
        }
        if (!e || ($(e.target).parents('.top-user-status-popup').length == 0
                && ((c && c.indexOf('activity-status') == -1 && c.indexOf('loading') == -1) || !c))) {
            $('.top-user-status-popup').addClass('hidden');
            $('.activity-status-block').removeClass('active');
        }
        if (!e || ($(e.target).parents('.notification-popup').length == 0
                && ((c && c.indexOf('top-icon notification') == -1) || !c))) {

            if (typeof notify === 'object') {
                notify.closePopup();
            }
        }
        if (!e || ($(e.target).parents('.dropdown.top-login-popup').length == 0
                && ((c && c.indexOf('top-login-button') == -1) || !c))) {
            $('.dropdown.top-login-popup').addClass('hidden');
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
            $('.add-user-popup').addClass('dialog hidden');
            $('.add-user-popup').removeAttr('style');
        }
    };

    $('#pageholder, #startholder').rebind('click', function(e) {
        if (typeof $.hideTopMenu === 'function') {
            $.hideTopMenu(e);
        }
    });

    $('.top-icon.achievements').rebind('click', function() {
        loadingDialog.show();

        M.accountData(function(account) {
            loadingDialog.hide();

            if (account.maf) {
                achievementsListDialog();
            }
        });
    });

    $('.top-icon.menu, .top-icon.close').rebind('click', function (e) {
        if ($('.top-icon.menu').attr('class').indexOf('active') == -1) {
            $('.top-icon.menu').addClass('active');
            $('.top-menu-popup').removeClass('hidden');
            topMenuScroll();
            $(window).rebind('resize.topmenu', function (e) {
                if ($('.top-icon.menu').hasClass('active')) {
                    topMenuScroll();
                }
            });
        }
        else {
            $('.top-icon.menu').removeClass('active');
            $('.top-menu-popup').addClass('hidden');
            $(window).unbind('resize.topmenu');
        }
    });
    $('.activity-status-block').rebind('click.topui', function (e) {

        if ($(this).attr('class').indexOf('active') == -1) {
            Soon(function() {
                $(this).addClass('active');
                $('.top-user-status-popup').removeClass('hidden');
                topPopupAlign('.activity-status-block', '.top-user-status-popup', 40);
            });
        }
        else {
            $(this).removeClass('active');
            $('.top-user-status-popup').addClass('hidden');
        }
    });
    $('.top-user-status-popup .dropdown-item').rebind('click.topui', function (e) {
        if ($(this).attr('class').indexOf('active') == -1) {
            $('.top-user-status-popup .dropdown-item').removeClass('active');
            $(this).addClass('active');
            $('.activity-status-block').find('.activity-status')
                .attr('class', $(this).find('.activity-status').attr('class'));
            $('.activity-status-block').removeClass('active');
            $('.top-user-status-popup').addClass('hidden');
        }
    });

    $('.top-menu-popup .top-menu-item').rebind('click', function () {
        if ($('.light-overlay').is(':visible')) {
            loadingInitDialog.hide();
        }
        $('.top-menu-popup').addClass('hidden');
        $('.top-icon.menu').removeClass('active');
        $(window).unbind('resize.topmenu');

        var className = $(this).attr('class');
        if (!className) {
            className = '';
        }
        if (className.indexOf('privacycompany') > -1) {
            document.location.hash = 'privacycompany';
        }
        else if (className.indexOf('upgrade-your-account') > -1) {
            document.location.hash = 'pro';
            return false;
        }
        else if (className.indexOf('register') > -1) {
            document.location.hash = 'register';
        }
        else if (className.indexOf('login') > -1) {
            document.location.hash = 'login';
        }
        else if (className.indexOf('aboutus') > -1) {
            document.location.hash = 'about';
        }
        else if (className.indexOf('corporate') > -1) {
            document.location.hash = 'corporate';
        }
        else if (className.indexOf('megablog') > -1) {
            document.location.hash = 'blog';
        }
        else if (className.indexOf('credits') > -1) {
            document.location.hash = 'credits';
        }
        else if (className.indexOf('chrome') > -1) {
            document.location.hash = 'chrome';
        }
        else if (className.indexOf('resellers') > -1) {
            document.location.hash = 'resellers';
            return false;
        }
        else if (className.indexOf('export') > -1) {
            document.location.hash = 'backup';
            return false;
        }
        else if (className.indexOf('firefox') > -1) {
            document.location.hash = 'firefox';
        }
        else if (className.indexOf('mobile') > -1) {
            document.location.hash = 'mobile';
        }
        else if (className.indexOf('sync') > -1) {
            document.location.hash = 'sync';
        }
        else if (className.indexOf('help') > -1) {
            document.location.hash = 'help';
        } else if (className.indexOf('contact') > -1) {
            document.location.hash = 'contact';
        } else if (className.indexOf('support') > -1) {
            document.location.hash = 'support';
        }
        else if (className.indexOf('sitemap') > -1) {
            document.location.hash = 'sitemap';
        }
        else if (className.indexOf('sdk') > -1) {
            document.location.hash = 'sdk';
        }
        else if (className.indexOf('doc') > -1) {
            document.location.hash = 'doc';
        }
        else if (className.indexOf('source-code') > -1) {
            document.location.hash = 'sourcecode';
        }
        else if (className.indexOf('terms') > -1) {
            document.location.hash = 'terms';
        }
        else if (className.indexOf('general') > -1) {
            document.location.hash = 'general';
        }
        else if (className.indexOf('privacypolicy') > -1) {
            document.location.hash = 'privacy';
        }
        else if (className.indexOf('mega') > -1) {
            document.location.hash = 'mega';
        }
        else if (className.indexOf('copyright') > -1) {
            document.location.hash = 'copyright';
        }
        else if (className.indexOf('takedown') > -1) {
            document.location.hash = 'takedown';
        }
        else if (className.indexOf('account') > -1) {
            document.location.hash = 'fm/account';
        }
        else if (className.indexOf('refresh') > -1) {
            mega.utils.reload();
        }
        else if (className.indexOf('languages') > -1) {
            langDialog.show();
        }
        else if (className.indexOf('clouddrive') > -1) {
            document.location.hash = 'fm';
        }
        else if (className.indexOf('logout') > -1) {
            mLogout();
        }
    });

    $('.top-search-bl').rebind('click', function () {
        $(this).addClass('active');
        $('.top-search-input').focus();
    });

    $('.top-search-input').rebind('blur', function () {
        $(this).closest('.top-search-bl').removeClass('active');
        if ($(this).val() == '') {
            $('.top-search-bl').removeClass('contains-value');
        }
        else {
            $('.top-search-bl').addClass('contains-value');
        }
    });

    $('.top-clear-button').rebind('click', function () {
        if (folderlink) {
            var dn = $(M.viewmode ? '.file-block-scrolling .file-block-title' : 'table.grid-table.fm .tranfer-filetype-txt');
            var ct = M.viewmode ? 'a' : 'tr';
            dn.closest(ct).show();
            $(window).trigger('resize');
        }
        $('.top-search-bl').removeClass('contains-value active');
        $('.top-search-input').val('');
    });

    $('.top-search-input').rebind('keyup', function _topSearchHandler(e) {
        if (e.keyCode == 13 || folderlink) {

            if (folderlink) {
                // Flush cached nodes, if any
                $(window).trigger('dynlist.flush');
            }

            if (!folderlink || !_topSearchHandler.logFired) {
                // Add log to see how often they use the search
                api_req({ a: 'log', e: 99603, m: 'Webclient top search used' });
                _topSearchHandler.logFired = true;
            }

            var val = $.trim($('.top-search-input').val());
            if (folderlink || val.length > 2 || !asciionly(val)) {
                if (folderlink) {
                    var dn = $(M.viewmode ? '.file-block-scrolling .file-block-title' : 'table.grid-table.fm .tranfer-filetype-txt');
                    var ct = M.viewmode ? 'a' : 'tr';
                    dn.closest(ct).show();

                    if (val) {
                        val = val.toLowerCase();
                        dn.filter(function () {
                            return !~$(this).text().toLowerCase().indexOf(val);
                        }).closest(ct).hide();
                    }
                    $(window).trigger('resize');
                    e.preventDefault();
                    e.stopPropagation();
                }
                else {
                    document.location.hash = 'fm/search/' + val;
                }
            }
        }
    });

    // Hover tooltip for top-menu elements and sidebar icons
    $('.nw-fm-left-icon, .top-icon').rebind('mouseover.nw-fm-left-icon', function() {
        var $this    = $(this);
        var $tooltip = $this.find('.dark-tooltip');
        var tooltipPos;
        var tooltipWidth;
        var buttonPos;

        if ($.liTooltipTimer) {
            clearTimeout($.liTooltipTimer);
        }
        $.liTooltipTimer = window.setTimeout(
            function() {
                if ($tooltip.hasClass('top')) {
                    tooltipWidth = $tooltip.outerWidth();
                    buttonPos    = $this.position().left;
                    tooltipPos   = buttonPos + $this.outerWidth() / 2 - tooltipWidth / 2;
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
    .rebind('mouseout.nw-fm-left-icon', function() {
        $(this).find('.dark-tooltip').removeClass('hovered');
        clearTimeout($.liTooltipTimer);
    });

    $('.fm-avatar img, .user-name').rebind('click', function () {
        if ($('.fm-avatar img').attr('src').indexOf('blob:') > -1) {
            document.location.hash = 'fm/account';
        }
        else {
            avatarDialog();
        }
    });

    $('.top-head .logo').rebind('click', function () {
        if (typeof loadingInitDialog === 'undefined' || !loadingInitDialog.active) {
            document.location.hash =
                typeof u_type !== 'undefined' && +u_type > 2 ? '#fm/dashboard' : '#start';
        }
    });

    if (!$('.fm-dialog.registration-page-success').hasClass('hidden')) {
        $('.fm-dialog.registration-page-success').addClass('hidden');
        $('.fm-dialog-overlay').addClass('hidden');
        $('body').removeClass('overlayed');
    }

    if (page.substr(0, 2) !== 'fm' && u_type == 3 && !avatars[u_handle]) {
        M.avatars();
    }
    if (ulmanager.isUploading || dlmanager.isDownloading) {
        $('.widget-block').removeClass('hidden');
    }

    $('.widget-block').rebind('click', function (e) {
        if ($.infoscroll && page == 'download') {
            startpageMain();
        }
        else if ($.dlhash) {
            document.location.hash = $.dlhash;
        }
        else if (folderlink && M.lastSeenFolderLink) {
            $(document).one('MegaOpenFolder', function() {
                $('.nw-fm-left-icon.transfers').click();
            });
            location.hash = M.lastSeenFolderLink;
        }
        else {
            document.location.hash = 'fm';
        }
    });

    if (String(M.currentdirid).substr(0, 7) === 'search/' && M.currentdirid[7] !== '~') {
        $('.top-search-bl').addClass('contains-value');
        $('.top-search-bl input').val(decodeURIComponent(M.currentdirid.substr(7)));
    }


    // Initialise notification popup and tooltip
    if (typeof notify === 'object') {
        notify.init();
    }
}

function is_fm() {
    var r = !!pfid;

    if (!r && (u_type !== false)) {
        r = page === '' || page === 'start' || page === 'index'
            || page.substr(0, 2) === 'fm' || page.substr(0, 7) === 'account';
    }

    if (d > 1) console.error('is_fm', r, page, hash);

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

    return translate(''+pages[name]).replace(/{staticpath}/g, staticpath);
}

function parsepage(pagehtml, pp) {
    $('body').removeClass('ads');
    $('#fmholder').hide();
    $('#pageholder').hide();
    $('#startholder').hide();
    megatitle();

    pagehtml = translate(''+pagehtml).replace(/{staticpath}/g, staticpath);
    if (document.location.href.substr(0, 19) == 'chrome-extension://') {
        pagehtml = pagehtml.replace(/\/#/g, '/' + urlrootfile + '#');
    }
    $('body').removeClass('notification-body bottom-pages new-startpage');

    if (page == 'start') {
        $('body').addClass('new-startpage');
    }
    else {
        $('body').addClass('bottom-pages');
    }

    var top = parsetopmenu();
    var bmenu = pages['bottom'];
    var bmenu2 = pages['bottom2'];
    if (document.location.href.substr(0, 19) == 'chrome-extension://') {
        bmenu2 = bmenu2.replace(/\/#/g, '/' + urlrootfile + '#');
    }
    pagehtml = pagehtml.replace("((MEGAINFO))", translate(pages['megainfo']).replace(/{staticpath}/g, staticpath));
    pagehtml = pagehtml.replace("((TOP))", top);
    pagehtml = pagehtml.replace("((BOTTOM))", translate(bmenu2));

    var $container = is_mobile ? $('body') : $('#startholder');
    $container
        .safeHTML(translate(pages['transferwidget']) + pagehtml)
        .show();

    Soon(mainScroll);
    $(window).rebind('resize.subpage', function (e) {
        if (page !== 'start' && page !== 'download') {
            mainScroll();
        }
        mega.utils.chrome110ZoomLevelNotification();
    });

    $('.nw-bottom-block').addClass(lang);
    if (typeof UIkeyevents === 'function') {
        UIkeyevents();
    }
}

function parsetopmenu() {
    var top = pages['top'].replace(/{staticpath}/g, staticpath);
    if (document.location.href.substr(0, 19) == 'chrome-extension://') {
        top = top.replace(/\/#/g, '/' + urlrootfile + '#');
    }
    top = top.replace("{avatar-top}", window.useravatar && useravatar.top() || '');
    top = translate(top);
    return top;
}

window.onhashchange = function() {
    var tpage = document.location.hash;

    if (typeof gifSlider !== 'undefined' && tpage.substr(0, 2) !== '#!') {
        gifSlider.clear();
    }

    if (window.skipHashChange) {
        delete window.skipHashChange;
        return false;
    }

    if (silent_loading) {
        document.location.hash = hash;
        return false;
    }

    if (folderlink) {
        flhashchange = true;
    }

    if (tpage == '#info' && page == 'start') {
        if (!$.infoscroll) {
            startpageScroll();
        }
        return false;
    }

    if ((tpage == '#' || tpage == '' || tpage == 'start') && page == 'start' ) {
        if ($.infoscroll) {
            startpageMain();
        }
        return false;
    }

    var overlay = document.getElementById('overlay');
    if (overlay && overlay.style.display == '' && !is_fm()) {
        document.location.hash = hash;
        return false;
    }

    dlid = false;
    hash = window.location.hash;
    if (hash) {
        page = hash.replace('#', '');

        if (page) {
            try {
                page = decodeURIComponent(page);
            }
            catch (e) {}
        }
    }
    else {
        page = '';
    }

    if (page) {
        if (page.indexOf('%25') !== -1) {
            do {
                page = page.replace(/%25/g, '%');
            } while (page.indexOf('%25') !== -1);
        }
        if (page.indexOf('%21') !== -1) {
            page = page.replace(/%21/g, '!');
        }
        for (var p in subpages) {
            if (page && page.substr(0, p.length) == p) {
                for (i in subpages[p]) {
                    if (!jsl_loaded[jsl2[subpages[p][i]].n]) {
                        jsl.push(jsl2[subpages[p][i]]);
                    }
                }
            }
        }
    }

    if (jsl.length > 0) {
        loadingDialog.show();
        jsl_start();
    }
    else {
        init_page();
    }
};

window.onbeforeunload = function () {
    if (dlmanager.isDownloading || ulmanager.isUploading) {
        return l[377];
    }

    mBroadcaster.crossTab.leave();
};

window.onunload = function() {
    mBroadcaster.crossTab.leave();
};

if (!is_karma && !is_mobile) {
    window.M = new MegaData();
    attribCache = new IndexedDBKVStorage('attrib', { murSeed: 0x800F0002 });
    attribCache.syncNameTimer = {};
    attribCache.uaPacketParser = uaPacketParser;
    attribCache.bitMapsManager = new MegaDataBitMapManager();
}
