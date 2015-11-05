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

var pro_json = '[[["N02zLAiWqRU",1,500,1024,1,"9.99","EUR"],["zqdkqTtOtGc",1,500,1024,12,"99.99","EUR"],["j-r9sea9qW4",2,2048,4096,1,"19.99","EUR"],["990PKO93JQU",2,2048,4096,12,"199.99","EUR"],["bG-i_SoVUd0",3,4096,8182,1,"29.99","EUR"],["e4dkakbTRWQ",3,4096,8182,12,"299.99","EUR"]]]';

function startMega() {
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
    if (pages['chat']) {
        $('body').safeAppend(translate(pages['chat'].replace(/{staticpath}/g, staticpath)));
        delete pages['chat'];
    }
    jsl = [];
    init_page();
}

function mainScroll() {
    $('.main-scroll-block').jScrollPane({
        showArrows: true,
        arrowSize: 5,
        animateScroll: true,
        verticalDragMinHeight: 150,
        enableKeyboardNavigation: true
    });
    $('.main-scroll-block').unbind('jsp-scroll-y');
    jScrollFade('.main-scroll-block');
    if (page == 'doc' || page.substr(0, 4) == 'help' || page == 'cpage') {
        scrollMenu();
    }
}

function scrollMenu() {
    $('.main-scroll-block').bind('jsp-scroll-y', function (event, scrollPositionY, isAtTop, isAtBottom) {
        if (page == 'doc' || page.substr(0, 4) == 'help' || page == 'cpage') {
            var sc = scrollPositionY - 30;
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

    if (!u_type) {
        $('body').attr('class', 'not-logged');
    }
    else {
        // Todo: check if cleaning the whole class is ok..
        $('body').attr('class', '');
    }

    if (localStorage.font_size) {
        $('body').removeClass('fontsize1 fontsize2').addClass('fontsize' + localStorage.font_size);
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

    if (page == 'plugin') {
        if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
            page = 'firefox';
        }
        else {
            page = 'chrome';
        }
    }

    if (localStorage.signupcode && u_type !== false) {
        delete localStorage.signupcode;
    }
    else if (localStorage.signupcode
            && page.substr(0, 6) !== 'signup'
            && page !== 'register'
            && page !== 'terms'
            && page !== 'privacy' && page !== 'chrome' && page !== 'firefox') {
        register_txt = l[1291];
        document.location.hash = 'signup' + localStorage.signupcode;
        return false;
    }
    if (!page.match(/^(blog|help|corporate|page_)/)) {
        $('.top-head').remove();
    }
    $('#loading').hide();
    if (loadingDialog) {
        loadingDialog.hide();
    }

    page = page.replace('%21', '!').replace('%21', '!');

    if (page.substr(0, 1) == '!' && page.length > 1) {
        dlkey = false;
        var ar = page.substr(1, page.length - 1).split('!');
        if (ar[0]) {
            dlid = ar[0].replace(/[^\w-]+/g, "");
        }
        if (ar[1]) {
            dlkey = ar[1].replace(/[^\w-]+/g, "");
        }
    }
    
    // If they recently tried to redeem their voucher but were not logged in or registered then direct them to the 
    // #redeem page to complete their purchase. For newly registered users this happens after key creation is complete.
    if ((localStorage.getItem('voucher') !== null) && (u_type === 3)) {
        document.location.hash = 'redeem';
    }

    var wasFolderlink = pfid;
    if (page.substr(0, 2) == 'F!' && page.length > 2) {
        var ar = page.substr(2, page.length - 1).split('!');
        if (ar[0]) {
            pfid = ar[0].replace(/[^\w-]+/g, "");
        }
        if (ar[1]) {
            pfkey = ar[1].replace(/[^\w-]+/g, "");
        }
        // TODO: Rename pfid, pfkey, and pfhandle around our codebase
        if (ar[2]) {
            pfhandle = ar[2].replace(/[^\w-]+/g, "");
        }
        n_h = pfid;
        if (!flhashchange) {
            if (pfkey) {
                api_setfolder(n_h);
                if (waitxhr) {
                    waitsc();
                }
                u_n = pfid;
            }
            else {
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
    }
    else if (!flhashchange || page !== 'fm/transfers') {
        n_h = false;
        if (u_sid) {
            api_setsid(u_sid);
            if (waitxhr) {
                waitsc();
            }
        }
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

    if (!$.mcImport) {
        closeDialog();
    }

    var fmwasinitialized = !!fminitialized;
    if (((u_type === 0 || u_type === 3) || pfid || folderlink) && (!flhashchange || !pfid)) {

        if (is_fm()) {
            // switch between FM & folderlinks (completely reinitialize)
            if ((!pfid && folderlink) || (pfid && folderlink === 0)) {
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
            if (typeof mDB !== 'undefined' && !pfid && !flhashchange) {
                mDBstart();
            }
            else {
                loadfm();
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
    else if (page == 'register') {
        if (u_storage.sid && u_type !== 0) {
            document.location.hash = '#fm';
            return false;
        }
        parsepage(pages['register']);
        init_register();
    }
    else if (page == 'chrome') {
        parsepage(pages['chrome']);
        var h = 0;
        $('.chrome-bottom-block').each(function (i, e) {
            if ($(e).height() > h) {
                h = $(e).height();
            }
        });
        $('.chrome-bottom-block').height(h);
        if (lang !== 'en') {
            $('.chrome-download-button').css('font-size', '12px');
        }

        // On the manual download button click
        $('.chrome-download-button').rebind('click', function() {

            var $this = $(this);

            // Hide the button text and show the mega.co.nz and mega.nz links
            $this.css('cursor', 'default');
            $this.find('.initial-state').hide();
            $this.find('.actual-links').show();
        });
    }
    else if (page == 'key') {
        parsepage(pages['key']);
        init_key();
    }
    else if (page == 'contact') {
        parsepage(pages['contact']);
        if (lang == 'ru') {
            $('.account-mid-block').addClass('high');
        }
    }
    else if (page.substr(0, 4) == 'help') {
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
            CMS.watch('help2:' + lang, function () {
                window.helpTemplate = null;
                doRenderHelp();
            });
            CMS.get(['help2:' + lang, 'help:' + lang + '.json'], function (err, content, json) {
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
        parsepage(pages['about']);
        $('.team-person-block').removeClass('first');
        var html = '';
        var a = 4;

        $('.team-person-block').sort(function () {
                return (Math.round(Math.random()) - 0.5);
            })
            .each(function (i, element) {
                if (a == 4) {
                    html += element.outerHTML.replace('team-person-block', 'team-person-block first');
                    a = 0;
                }
                else {
                    html += element.outerHTML;
                }
                a++;
            });

        $('#emailp').html($('#emailp').text().replace('jobs@mega.nz',
            '<a href="mailto:jobs@mega.nz">jobs@mega.nz</a>'));
        $('.new-bottom-pages.about').html(html + '<div class="clear"></div>');
        mainScroll();
    }
    else if (page == 'terms') {
        parsepage(pages['terms']);
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
    else if (page.substr(0, 3) == 'pro') {
        parsepage(pages['pro']);
        init_pro();
    }
    else if (page == 'credits') {
        parsepage(pages['credits']);
        var html = '';
        $('.credits-main-pad a').sort(function () {
            return (Math.round(Math.random()) - 0.5)
        }).each(function (i, e) {
            html += e.outerHTML;
        });
        $('.credits-main-pad').html(html + '<div class="clear"></div>');
        mainScroll();
    }
    else if (page == 'firefox') {
        parsepage(pages['firefox']);
        $('.ff-bott-button').rebind('mouseover', function () {
            $('.ff-icon').addClass('hovered');
        });
        $('.ff-bott-button').rebind('mouseout', function () {
            $('.ff-icon').removeClass('hovered');
        });
    }
    else if (page.substr(0, 4) == 'sync') {
        parsepage(pages['sync']);
        init_sync();
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
        parsepage(pages['download'], 'download');
        dlinfo(dlid, dlkey, false);
    }
    
    /**
     * If voucher code from url e.g. #voucherZUSA63A8WEYTPSXU4985
     */
    else if (page.substr(0, 7) == 'voucher') {

        // Get the voucher code from the URL which is 20 characters in length
        var voucherCode = page.substr(7, 20);
        
        // Store in localStorage to be used by the Pro page or when returning from login
        localStorage.setItem('voucher', voucherCode);
        
        // If not logged in, direct them to login or register first
        if (!u_type) {
            login_txt = l[7712];
            document.location.hash = 'login';
            return false;
        }
        else {
            // Otherwise go to the Redeem page which will detect the voucher code and show a dialog
            document.location.hash = 'redeem';
            return false;
        }
    }

    // Load the direct voucher redeem page
    else if (page.substr(0, 6) == 'redeem') {
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
            if (pfid) {
                $('.fm-left-menu .folderlink').removeClass('hidden');
                $('.fm-tree-header.cloud-drive-item span').text(l[808]);
                $('.fm-tree-header').not('.cloud-drive-item').hide();
                $('.fm-menu-item').hide();
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

        $('.feedback-button')
            .removeClass("hidden")
            .rebind("click.feedbackDialog", function () {
                var feedbackDialog = mega.ui.FeedbackDialog.singleton($(this));
                feedbackDialog._type = "top-button";

                return false;
            });

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

        if (fminitialized) {
            if (M.currentdirid == 'account') {
                accountUI();
            }
            else if (M.currentdirid == 'search') {
                searchFM();
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
    else {
        page = 'start';
        parsepage(pages['start'], 'start');
        init_start();
    }
    topmenuUI();
    loggedout = false;
    flhashchange = false;
}

var avatars = {};

function loginDialog(close) {
    if (close) {
        $('.top-login-popup').removeClass('active');
        return false;
    }
    if (localStorage.hideloginwarning || is_extension) {
        $('.top-login-warning').hide();
        $('.login-notification-icon').removeClass('hidden');
    }
    $('.login-checkbox,.top-login-popup .radio-txt').rebind('click', function (e) {
        var c = $('.login-checkbox').attr('class');
        if (c.indexOf('checkboxOff') > -1) {
            $('.login-checkbox').attr('class', 'login-checkbox checkboxOn');
        }
        else {
            $('.login-checkbox').attr('class', 'login-checkbox checkboxOff');
        }
    });

    $('.top-login-forgot-pass').rebind('click', function (e) {
        document.location.hash = 'recovery';
        loginDialog(1);
    });

    $('.top-dialog-login-button').rebind('click', function (e) {
        tooltiplogin();
    });
    $('#login-name').rebind('focus', function (e) {
        if ($(this).val() == l[195]) {
            $(this).val('');
        }
    });
    $('#login-name').rebind('blur', function (e) {
        if ($(this).val() == '') {
            $(this).val(l[195]);
        }
    });
    $('#login-password').rebind('focus', function (e) {
        if ($(this).val() == l[909]) {
            $(this).val('');
            $(this)[0].type = 'password';
        }
    });
    $('#login-password').rebind('blur', function (e) {
        if ($(this).val() == '') {
            $(this).val(l[909]);
            $(this)[0].type = 'text';
        }
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
    $('.top-login-popup').addClass('active');
    document.getElementById('login-name').focus()
}

function tooltiplogin() {
    var e = $('#login-name').val();
    if (e == '' || e == l[195] || checkMail(e)) {
        $('.top-login-input-block.e-mail').addClass('incorrect');
        $('#login-name').val('');
        $('#login-name').focus();
    }
    else if ($('#login-password').val() == ''
            || $('#login-password').val() == l[909]) {
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
                u_type = r;
                if (login_next) {
                    document.location.hash = login_next;
                }
                else if (page !== 'login') {
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

    $('.warning-popup-icon').addClass('hidden');
    $('.top-menu-item.upgrade-your-account').hide();
    $('.top-menu-item.register,.top-menu-item.login').hide();
    $('.top-menu-item.logout,.context-menu-divider.logout').hide();
    $('.top-menu-item.clouddrive,.top-menu-item.account').hide();
    $('.top-menu-item.refresh-item').addClass('hidden');
    $('.activity-status,.activity-status-block').hide();
    $('.membership-status-block').safeHTML('<div class="membership-status free">@@</div>', l[435]);
    $('.membership-status').hide();
    $('.top-head .user-name').hide();

    if (fminitialized) {
        $('.top-search-bl').show();
    }
    else {
        $('.top-search-bl').hide();
    }

    $('.fm-avatar').hide();

    // If the 'firstname' property is set, display it
    if (u_type == 3 && u_attr.firstname) {
        $('.top-head .user-name').text(u_attr.firstname);
        $('.top-head .user-name').show();
    }

    // Check for pages that do not have the 'firstname' property set e.g. #about
    else if ((u_type == 3) && (!u_attr.firstname)
            && (typeof u_attr.name === 'string') && (u_attr.name.indexOf(' ') != -1)) {

        // Try get the first name from the full 'name' property and display
        var nameParts = u_attr.name.split(' ');
        $('.top-head .user-name').text(nameParts[0]);
        $('.top-head .user-name').show();
    }

    if (u_type) {

        $('.top-menu-item.logout,.context-menu-divider.logout').show();
        $('.top-menu-item.clouddrive,.top-menu-item.account').show();
        $('.fm-avatar').show();

        // If a Lite/Pro plan has been purchased
        if (u_attr.p) {

            // Set the plan text
            var proNum = u_attr.p;
            var purchasedPlan = getProPlan(proNum);

            // Set colour of plan
            var cssClass = (proNum == 4) ? 'lite' : 'pro';

            // Show the 'Upgrade your account' button in the main menu for all
            // accounts except for the biggest plan i.e. PRO III
            if (u_attr.p !== 3) {
                $('.top-menu-item.upgrade-your-account,.context-menu-divider.upgrade-your-account').show();
            }

            $('.membership-icon-pad .membership-big-txt.red').text(purchasedPlan);
            $('.membership-icon-pad .membership-icon').attr('class', 'membership-icon pro' + u_attr.p);
            $('.membership-status-block')
                .safeHTML('<div class="membership-status @@">@@</div>', cssClass, purchasedPlan);
            $('.context-menu-divider.upgrade-your-account').addClass('pro');
            $('.membership-popup.pro-popup');
        }
        else {
            // Show the free badge
            $('.top-menu-item.upgrade-your-account,.context-menu-divider.upgrade-your-account').show();
            $('.context-menu-divider.upgrade-your-account').removeClass('pro lite');
            $('.membership-status').addClass('free');
            $('.membership-status').text(l[435]);
        }

        $('.membership-status').show();

        if (is_fm()) {
            $('.top-menu-item.refresh-item').removeClass('hidden');
        }

        // If the chat is disabled don't show the green status icon in the header
        if (!megaChatIsDisabled) {
            $('.activity-status-block, .activity-status').show();
            if (megaChatIsReady) {
                megaChat.renderMyStatus();
            }
        }
    }
    else {
        if (u_type === 0 && !confirmok && page !== 'key') {

            $('.top-menu-item.register').text(l[968]);
            $('.top-menu-item.clouddrive').show();

            if ($.len(M.c[M.RootID] || {})) {
                var body;
                var header;
                var lstr = String(l[881]);
                var dot = lstr.indexOf('.') + 1;

                // 881 is a long string of plain text, adapt it to the new warning layout
                if (lang === 'en' || dot === 0) {
                    header = 'You are using an ephemeral session.';
                    body = lstr.substr(dot);
                }
                else {
                    header = lstr.substr(0, dot);
                    body = lstr.substr(dot);
                }
                // Look for "50 GB" to turn green the last sentence
                var sep = body.split('50');
                if (sep.length > 1) {
                    var wrd = sep[0].split(/\s+/).filter(String);
                    var green = wrd.pop() + ' 50' + sep[1];
                    body = htmlentities(wrd.join(" ")) + ' <span class="green">' + htmlentities(green) + '</span>';
                }
                else {
                    body = htmlentities(body);
                }
                header = htmlentities(header);

                $('.top-warning-popup .warning-popup-body').safeHTML(
                    '<div class="warning-header">' + header.trim() + '</div>' + body.trim()
                );
                $('.top-warning-popup .warning-button span').text(l[779]);

                $('.warning-popup-icon').removeClass('hidden');
                $('.warning-icon-area').rebind('click', function (e) {

                    var c = $('.top-warning-popup').attr('class');

                    if (c && c.indexOf('active') > -1) {
                        $('.top-warning-popup').removeClass('active');
                    }
                    else {
                        $('.top-warning-popup').addClass('active');
                    }
                });
                $('.top-warning-popup').rebind('click', function (e) {

                    if (isNonActivatedAccount()) {
                        return;
                    }

                    $('.top-warning-popup').removeClass('active');
                    document.location.hash = 'register';
                });
            }

            if (isNonActivatedAccount()) {
                showNonActivatedAccountDialog();
            }

            if (page !== 'register') {
                $('.top-warning-popup').addClass('active');
            }
        }

        $('.top-menu-item.upgrade-your-account').show();
        $('.top-menu-item.pro-item span').text(l[129]);
        $('.membership-status-block').hide();
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
                var c = $('.top-login-popup').attr('class');
                if (c && c.indexOf('active') > -1) {
                    loginDialog(1);
                }
                else {
                    loginDialog();
                }
            }
        });

        // Only show top language change icon if not logged in
        if (u_type === false) {

            // Get current language
            var $topChangeLang = $('.top-change-language');
            var $topChangeLangName = $topChangeLang.find('.top-change-language-name');
            var languageName = ln[lang];

            // Init the top header change language button
            $topChangeLangName.text(languageName);
            $topChangeLang.removeClass('hidden');
            $topChangeLang.rebind('click', function() {

                // Add log to see how often they click to change language
                api_req({ a: 'log', e: 99600, m: 'Language menu opened from top header' });

                // Open the language dialog
                langDialog.show();
            });
        }

        $('.top-menu-item.register,.context-menu-divider.register,.top-menu-item.login').show();

        if (u_type === 0) {
            $('.top-menu-item.login').hide();
            $('.top-menu-item.logout,.context-menu-divider.logout').show();
        }

        $('.top-login-arrow').css('margin-right',
            $('.top-menu-icon').width() + $('.create-account-button').width() +
            ($('.top-login-button').width() / 2) + 78 + 'px');
    }

    $('.top-menu-arrow').css('margin-right', $('.top-menu-icon').width() / 2 + 'px');

    $.hideTopMenu = function (e) {

        var c;

        if (e) {
            c = $(e.target).attr('class');
        }
        if (!e || ($(e.target).parents('.membership-popup').length == 0
                && ((c && c.indexOf('membership-status') == -1) || !c))
                || (c && c.indexOf('mem-button') > -1)) {
            $('.membership-popup').removeClass('active');
            $('.membership-status-block').removeClass('active');
        }
        if (!e || ($(e.target).parents('.top-menu-popup').length == 0
                && ((c && c.indexOf('top-menu-icon') == -1) || !c))) {
            $('.top-menu-popup').removeClass('active');
            $('.top-menu-icon').removeClass('active');
        }
        if (!e || ($(e.target).parents('.top-warning-popup').length == 0
                && ((c && c.indexOf('warning-icon-area') == -1) || !c))) {
            $('.top-warning-popup').removeClass('active');
        }
        if (!e || ($(e.target).parents('.top-user-status-popup').length == 0
                && ((c && c.indexOf('activity-status') == -1 && c.indexOf('loading') == -1) || !c))) {
            $('.top-user-status-popup').removeClass('active');
            $('.activity-status-block').removeClass('active');
        }
        if (!e || ($(e.target).parents('.notification-popup').length == 0
                && ((c && c.indexOf('cloud-popup-icon') == -1) || !c))) {
            notify.closePopup();
        }
        if (!e || ($(e.target).parents('.top-login-popup').length == 0
                && ((c && c.indexOf('top-login-button') == -1) || !c))) {
            $('.top-login-popup').removeClass('active');
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

    $('.top-menu-icon').rebind('click', function (e) {
        if ($(this).attr('class').indexOf('active') == -1) {
            $(this).addClass('active');
            $('.top-menu-popup').addClass('active');
        }
        else {
            $(this).removeClass('active');
            $('.top-menu-popup').removeClass('active');
        }
    });
    $('.activity-status-block').rebind('click.topui', function (e) {

        if ($(this).attr('class').indexOf('active') == -1) {
            $(this).addClass('active');
            $('.top-user-status-popup').addClass('active');
            $('.top-user-status-popup').css('right',
                $('.top-head').outerWidth() - $('.activity-status-block').position().left + -138 + 'px');
        }
        else {
            $(this).removeClass('active');
            $('.top-user-status-popup').removeClass('active');
        }
    });
    $('.top-user-status-item').rebind('click.topui', function (e) {
        if ($(this).attr('class').indexOf('active') == -1) {
            $('.top-user-status-item').removeClass('active');
            $(this).addClass('active');
            $('.activity-status-block').find('.activity-status')
                .attr('class', $(this).find('.activity-status').attr('class'));
            $('.activity-status-block').removeClass('active');
            $('.top-user-status-popup').removeClass('active');
        }
    });
    $('.membership-status-block').rebind('click', function (e) {
        $('.membership-popup .membership-main-block').hide();
        $('.membership-popup .membership-loading').show();

        if ($(this).attr('class').indexOf('active') == -1) {
            $(this).addClass('active');
            if (u_attr.p) {
                $('.pro-popup').addClass('active');
            }
            else {
                $('.free-popup').addClass('active');
            }

            M.accountData(function (account) {

                var perc, warning, perc_c;
                var percent = {
                    space: Math.min(100, Math.round(account.space_used / account.space * 100)),
                    bw: Math.round((account.servbw_used + account.downbw_used) / account.bw * 100)
                };


                $('.membership-popup .membership-loading').hide();
                $('.membership-popup .membership-main-block').show();
                var $parent = $('.membership-popup.free-popup');

                if (u_attr.p) {
                    var planNum = u_attr.p;
                    var planName = getProPlan(planNum);
                    $parent = $('.membership-popup.pro-popup');

                    $('.membership-popup.pro-popup .membership-icon').addClass('pro' + planNum);
                    var p = '';
                    if (account.stype !== 'S') {
                        p = escapeHTML(l[987]) + ' <span class="red">' + time2date(account.expiry) + '</span>';
                    }
                    $('.membership-popup.pro-popup .membership-icon-txt-bl .membership-medium-txt').safeHTML(p);

                    // Update current plan to PRO I, PRO II, PRO III or LITE in popup
                    $('.membership-icon-pad .membership-big-txt.red').text(planName);
                }
                else {
                    $('.membership-popup .upgrade-account').rebind('click', function () {
                        document.location.hash = 'pro';
                    });
                }
                if (account.balance
                        && account.balance[0]
                        && account.balance[0][0] > 0) {
                    $parent.find('.membership-price-txt .membership-big-txt')
                        .safeHTML('&euro; @@', account.balance[0][0]);
                }
                else {
                    $parent.find('.membership-price-txt .membership-big-txt').html('&euro; 0.00');
                }

                $parent.find('.storage .membership-circle-bg.blue-circle').attr('class',
                    'membership-circle-bg blue-circle percents-' + percent.space);
                $parent.find('.storage .membership-circle-bg.blue-circle')
                    .safeHTML(percent.space  + '<span class="membership-small-txt">%</span>');
                var b1 = bytesToSize(account.space_used);
                b1 = b1.split(' ');
                b1[0] = Math.round(b1[0]) + ' ';
                var b2 = bytesToSize(account.space);
                b2 = b2.split(' ');
                b2[0] = Math.round(b2[0]) + ' ';

                warning = '';
                if (percent.space > 99) {
                    warning =
                        '<div class="account-warning-icon"><span class="membership-notification"><span><span class="yellow">'
                        + l[34] + '</span> '
                        + l[1010] + '. ' + l[1011] + ' <a href="#pro" class="upgradelink">'
                        + l[920] + '</a></span><span class="membership-arrow"></span></span>&nbsp;</div>';
                }
                else if (percent.space > 80) {
                    warning =
                        '<div class="account-warning-icon"><span class="membership-notification"><span><span class="yellow">'
                        + l[34] + '</span> '
                        + l[1012] + ' ' + l[1013] + ' <a href="#pro"  class="upgradelink">'
                        + l[920] + '</a></span><span class="membership-arrow"></span></span>&nbsp;</div>';
                }

                var usedspace =
                    '<span class="membership-small-txt">' + l['439a'].replace('[X1]',
                    '<span class="blue lpxf">' + htmlentities(b1[0]) + '<span class="membership-small-txt">' +
                    htmlentities(b1[1]) + '</span></span>').replace('[X2]',
                        '<span class="lpxf">' + htmlentities(b2[0]) + '</span>' + ' <span class="membership-small-txt">' +
                    htmlentities(b2[1]) + '</span>') + '</span>';

                var usedspacetxt = l[799];
                if (lang == 'de') {
                    usedspacetxt = l[799].charAt(0).toLowerCase() + l[799].slice(1);
                }

                $parent.find('.storage .membership-usage-txt').safeHTML('<div class="membership-big-txt">' +
                    usedspace + '</div><div class="membership-medium-txt">' + usedspacetxt +
                    warning + '</div>');

                if (percent.space > 80) {
                    $parent.find('.storage .membership-usage-txt').addClass('exceeded');
                }

                $parent.find('.bandwidth  .membership-circle-bg.green-circle')
                    .attr('class', 'membership-circle-bg green-circle percents-' + percent.bw);
                $parent.find('.bandwidth  .membership-circle-bg.green-circle')
                    .safeHTML(percent.bw + '<span class="membership-small-txt">%</span>');
                var b1 = bytesToSize(account.servbw_used + account.downbw_used);
                b1 = b1.split(' ');
                b1[0] = Math.round(b1[0]) + ' ';
                var b2 = bytesToSize(account.bw);
                b2 = b2.split(' ');
                b2[0] = Math.round(b2[0]) + ' ';

                var waittime = '30 minutes';

                warning = '';
                if (percent.bw > 99 && !u_attr.p) {
                    warning =
                        '<div class="account-warning-icon"><span class="membership-notification"><span><span class="yellow">'
                        + l[34] + '</span> <span class="red">'
                        + l[17].toLowerCase() + '</span><br /> '
                        + l[1054].replace('[X]',
                            '<span class="green">' + waittime + '</span>')
                        + ' ' + l[1055] + ' <a href="#pro"  class="upgradelink">'
                        + l[920] + '</a></span><span class="membership-arrow"></span></span>&nbsp;</div>';
                }
                else if (percent.bw > 99 && u_attr.p) {
                    warning =
                        '<div class="account-warning-icon"><span class="membership-notification"><span><span class="yellow">'
                        + l[34] + '</span> '
                        + l[1008] + ' ' + l[1009] + ' <a href="#pro" class="upgradelink">'
                        + l[920] + '</a></span><span class="membership-arrow"></span></span>&nbsp;</div>';
                }
                else if (percent.bw > 80) {
                    warning =
                        '<div class="account-warning-icon"><span class="membership-notification"><span><span class="yellow">'
                        + l[34] + '</span> '
                        + l[1053] + ' ' + l[1009] + ' <a href="#pro" class="upgradelink">'
                        + l[920] + '</a></span><span class="membership-arrow"></span></span>&nbsp;</div>';
                }

                var usedbw = '<span class="membership-small-txt">' + l['439a'].replace('[X1]',
                    '<span class="green lpxf">' + htmlentities(b1[0]) + '<span class="membership-small-txt">' +
                    htmlentities(b1[1]) + '</span></span>').replace('[X2]',
                    '<span class="lpxf">' + htmlentities(b2[0]) + '</span>' +
                    ' <span class="membership-small-txt">' +
                    htmlentities(b2[1]) + '</span>') + '</span>';
                var usedbwtxt = l[973];
                if (lang == 'de') {
                    usedbwtxt = l[973].charAt(0).toLowerCase() + l[973].slice(1);
                }

                $parent.find('.bandwidth .membership-usage-txt').safeHTML('<div class="membership-big-txt">' +
                    usedbw + '</div><div class="membership-medium-txt">' + usedbwtxt + warning + '</div>');

                if (percent.bw > 80) {
                    $parent.find('.bandwidth .membership-usage-txt').addClass('exceeded');
                }

                $('.membership-popup .mem-button').rebind('click', function (e) {
                    document.location.hash = 'fm/account';
                    $.hideTopMenu(e);
                });
            });
        }
        else {
            $(this).removeClass('active');
            if ($(this).find('.membership-status').attr('class').indexOf('free') == -1) {
                $('.pro-popup').removeClass('active');
            }
            else {
                $('.free-popup').removeClass('active');
            }
        }
    });

    $('.top-menu-popup .top-menu-item').unbind('click');
    $('.top-menu-popup .top-menu-item').rebind('click', function () {

        $('.top-menu-popup').removeClass('active');
        $('.top-menu-icon').removeClass('active');

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
        }
        else if (className.indexOf('contact') > -1) {
            document.location.hash = 'contact';
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
        else if (className.indexOf('terms') > -1) {
            document.location.hash = 'terms';
        }
        else if (className.indexOf('privacypolicy') > -1) {
            document.location.hash = 'privacy';
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

    $('.top-search-input').rebind('focus', function () {
        $('.top-search-bl').addClass('active');
        if ($(this).val() == l[102]) {
            $(this).val('');
        }
    });

    $('.top-search-input').rebind('blur', function () {
        $(this).closest('.top-search-bl').removeClass('active');
        if ($(this).val() == '') {
            $(this).val(l[102]);
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
        $('.top-search-input').val(l[102]);
        $('.top-search-bl').removeClass('contains-value');
    });

    $('.top-search-input').rebind('keyup', function (e) {
        if (e.keyCode == 13 || folderlink) {
            var val = $.trim($('.top-search-input').val());
            if (folderlink || val.length > 2 || !asciionly(val)) {
                if (folderlink) {
                    var dn = $(M.viewmode ? '.file-block-scrolling .file-block-title' : 'table.grid-table.fm .tranfer-filetype-txt');
                    var ct = M.viewmode ? 'a' : 'tr';
                    dn.closest(ct).show();

                    if (val) {
                        val = val.toLowerCase();
                        dn.filter(function () {
                            return !~$(this).text().toLowerCase().indexOf(val)
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

    $('.fm-avatar img, .user-name').rebind('click', function () {
        if ($('.fm-avatar img').attr('src').indexOf('blob:') > -1) {
            document.location.hash = 'fm/account';
        }
        else {
            avatarDialog();
        }
    });


    $('.top-head .logo').rebind('click', function () {
        document.location.hash = typeof u_type !== 'undefined' && +u_type > 2 ? '#fm' : '#start';
    });

    var c = $('.fm-dialog.registration-page-success').attr('class');
    if (c.indexOf('hidden') == -1) {
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
        else {
            document.location.hash = 'fm';
        }
    });

    if (M && M.currentdirid && M.currentdirid.substr(0, 7) == 'search/') {
        $('.top-search-bl').addClass('contains-value');
        $('.top-search-bl input').val(M.currentdirid.replace('search/', ''));
    }

    if (u_type) {
        $('.membership-popup-arrow').css('margin-right',
            $('.top-menu-icon').width() + $('.membership-status-block').width() / 2 + 57 + 'px');
    }

    // Initialise notification popup and tooltip
    notify.init();
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
    $('#startholder').safeHTML(translate(pages['transferwidget']) + pagehtml);
    $('#startholder').show();
    mainScroll();
    $(window).rebind('resize.subpage', function (e) {
        if (page !== 'start' && page !== 'download') {
            mainScroll();
        }
    });
    $('.nw-bottom-block').addClass(lang);
    UIkeyevents();
}

function parsetopmenu() {
    var top = pages['top'].replace(/{staticpath}/g, staticpath);
    if (document.location.href.substr(0, 19) == 'chrome-extension://') {
        top = top.replace(/\/#/g, '/' + urlrootfile + '#');
    }
    top = top.replace("{avatar-top}", useravatar.top());
    top = translate(top);
    return top;
}

window.onhashchange = function() {
    var tpage = document.location.hash;

    if (typeof gifSlider !== 'undefined') {
        gifSlider.clear();
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

    if ((tpage == '#' || tpage == '' || tpage == 'start') && page == 'start') {
        if ($.infoscroll) {
            startpageMain();
        }
        return false;
    }

    if (document.getElementById('overlay').style.display == '' && !is_fm()) {
        document.location.hash = hash;
        return false;
    }

    dlid = false;
    hash = window.location.hash;
    if (hash) {
        page = hash.replace('#', '');
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
