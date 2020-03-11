// Note: Referral Program is called as affiliate program at begining, so all systemic names are under word affiliate
// i.e. affiliate === referral

mobile.affiliate = {

    /**
     * Initialise Main page
     */
    initMainPage: function() {

        'use strict';

        // If not logged in, return to the login page
        if (typeof u_attr === 'undefined') {
            loadSubPage('login');
            return false;
        }

        // Cache selectors
        var $page = $('.mobile.affiliate-page');

        // Initialise the top menu
        topmenuUI();

        // Init the titleMenu for this page.
        mobile.titleMenu.init();

        // Show the account page content
        $page.removeClass('hidden');

        loadingDialog.show('affiliateRefresh');

        this.getMobileAffiliateData(function() {
            mobile.affiliate.setCommissionIndexes($page);
            mobile.affiliate.setTotalRedeemInfo($page);
            mobile.affiliate.initMainPageButtons($page);
        });
    },

    getMobileAffiliateData: function(callback) {

        'use strict';

        M.affiliate.getAffiliateData().then(function() {
            M.affiliate.lastupdate = Date.now();
            loadingDialog.hide('affiliateRefresh');
            if (typeof callback === 'function') {
                callback();
            }
        }).catch(function() {
            if (d) {
                console.error('Pulling affiliate data failed due to one of it\'s operation failed.');
            }
            msgDialog('warninga', l[7235], l[200] + ' ' + l[253], '', function() {
                loadingDialog.hide('affiliateRefresh');
            });
        });
    },

    /**
     * Main page. Init buttons.
     */
    initMainPageButtons: function($page) {

        'use strict';

        var $buttons = $('.mobile.button-block.clickable', $page);

        $buttons.rebind('tap', function() {
            var $this = $(this);

            if ($this.data('link')) {
                loadSubPage('/fm/refer/' + $this.data('link'));
            }
        });
    },

    /**
     * Main page. Set  commision indexes.
     */
    setCommissionIndexes: function($page) {

        'use strict';

        var $commissionBlocks = $('.affiliate-comission', $page);
        var balance = M.affiliate.balance;
        var currencyHtml = ' <span class="local-currency-code">' + balance.localCurrency + '</span>';
        var localTotal;
        var localPending;
        var localAvailable;

        if (balance.localCurrency === 'EUR') {
            $('.euro', $commissionBlocks).addClass('hidden');

            localTotal = formatCurrency(balance.localTotal);
            localPending = formatCurrency(balance.localPending);
            localAvailable = formatCurrency(balance.localAvailable);
        }
        else {

            localTotal = formatCurrency(balance.localTotal, balance.localCurrency, 'code')
                .replace(balance.localCurrency, '').trim();
            localPending = formatCurrency(balance.localPending, balance.localCurrency, 'code')
                .replace(balance.localCurrency, '').trim();
            localAvailable = formatCurrency(balance.localAvailable, balance.localCurrency, 'code')
                .replace(balance.localCurrency, '').trim();

            currencyHtml = ' <span class="currency">' + balance.localCurrency + '</span>';

            $('.total.euro', $commissionBlocks)
                .text(formatCurrency(balance.pending + balance.available));
            $('.pending.euro', $commissionBlocks).text(formatCurrency(balance.pending));
            $('.available.euro', $commissionBlocks).text(formatCurrency(balance.available));
        }

        $('.total.local', $commissionBlocks).safeHTML(localTotal + currencyHtml);
        $('.pending.local', $commissionBlocks).safeHTML(localPending + currencyHtml);
        $('.available.local', $commissionBlocks).safeHTML(localAvailable + currencyHtml);

        $('.commission-info', $commissionBlocks).rebind('tap', function() {
            var $overlay = $('.mobile.commission-overlay');

            if (balance.localCurrency === 'EUR') {
                $('.non-euro-only', $overlay).addClass('hidden');
            }

            if (u_attr.b) {
                $('.no-buisness', $overlay).addClass('hidden');
            }

            $overlay.removeClass('hidden');
            $page.addClass('hidden');

            $('.fm-dialog-close', $overlay).rebind('tap', function() {
                $overlay.addClass('hidden');
                $page.removeClass('hidden');
            });
        });
    },

    /**
     * Main page. Set total registrations and purchases.
     */
    setTotalRedeemInfo: function($page) {

        'use strict';

        // TODO: Set registrations and purchases
        var $registrations = $('.mobile.affiliate-registration', $page);
        var $purchases = $('.mobile.affiliate-purchases', $page);
        var thisMonth = calculateCalendar('m');
        var thisMonthRegCount = 0;
        var thisMonthPurCount = 0;
        var creditList = M.affiliate.creditList.active.concat(M.affiliate.creditList.pending);

        M.affiliate.signupList.forEach(function(item) {
            if (thisMonth.start <= item.ts && item.ts <= thisMonth.end) {
                thisMonthRegCount++;
            }
        });

        creditList.forEach(function(item) {
            if (thisMonth.start <= item.gts && item.gts <= thisMonth.end) {
                thisMonthPurCount++;
            }
        });

        $('.mobile.affiliate-compare', $page).safeHTML(l[22700]);
        $('.affiliate-number', $registrations).text(M.affiliate.signupList.length);
        $('.affiliate-compare span', $registrations).text('+' + thisMonthRegCount);

        $('.affiliate-number', $purchases).text(creditList.length);
        $('.affiliate-compare span', $purchases).text('+' + thisMonthPurCount);
    },

    /**
     * Initialise affiliate Guide page
     */
    initGuidePage: function() {

        'use strict';

        // If not logged in, return to the login page
        if (typeof u_attr === 'undefined') {
            loadSubPage('login');
            return false;
        }

        // Cache selector
        var $page = $('.mobile.affiliate-guide-page');

        // Show the giude page content
        $page.removeClass('hidden');

        mobile.initBackButton($page, 'fm/refer/');
        mobile.affiliate.initGuideButtons($page);
    },

    /**
     * Guide page. Init buttons
     */
    initGuideButtons: function($page) {

        'use strict';

        var $buttons = $('.mobile.button-block.expandable', $page);
        var $generateButton = $('.mobile.button-block.generate', $page);

        // Init Expandable buttons
        $buttons.rebind('tap', function(e) {
            var $this = $(this);

            if ($(e.target).parents('.full-info').length > 0) {
                return;
            }
            else if ($this.hasClass('expanded')) {
                $this.removeClass('expanded');
            }
            else if (!$this.hasClass('expanded')) {
                $buttons.removeClass('expanded');
                $this.addClass('expanded');
            }

            return false;
        });

        // Init Generate Referral URL button
        $generateButton.rebind('tap', function() {
            mobile.affiliate.showGenerateUrlDialog();
        });
    },

    /**
     * Guide page. Init buttons
     */
    showGenerateUrlDialog: function() {

        'use strict';

        var $dialog = $('#startholder .mobile.generate-url.overlay');
        var $urlBar = $('.mobile.generate-url.url-block', $dialog);
        var $doneButton = $('.mobile.generate-url.button.done');
        var $page = $('.mobile.affiliate-guide-page');

        // Show dialog
        $dialog.removeClass('hidden');
        $page.addClass('hidden');

        // Init Hide dialog
        $('.fm-dialog-close, .bottom-lnk', $dialog).rebind('tap', function() {
            $dialog.addClass('hidden');
            $urlBar.removeClass('expanded');
            $page.removeClass('hidden');

            return false;
        });

        // Init Show URL tags dropdown
        $('.url', $urlBar).rebind('tap', function() {
            var $this = $(this);

            if (!$this.hasClass('expanded')) {
                $this.parent().addClass('expanded');
            }

            return false;
        });

        // Init Hide URL tags dropdown
        $doneButton.rebind('tap', function() {
            $urlBar.removeClass('expanded');
        });

        // Init Select URL tag
        $('.page-names span', $urlBar).rebind('tap', function() {
            var $this = $(this);

            $('.page-names span.active', $urlBar).removeClass('active');
            $('.url span').text('#' + $this.data('page'));
            $this.addClass('active');
        });

        $('.copy-button', $dialog).rebind('tap.copy-to-clipboard', function() {
            var links = $.trim($('.url', $urlBar).text());
            var toastTxt = l[7654];
            copyToClipboard(links, toastTxt);
        });

        M.affiliate.getURL('startpage').then(function(url) {
            $('.url', $urlBar).safeHTML(url.replace('#startpage', '<span>#startpage</span>'));
        });
    },

    /**
     * Initialise affiliate History page
     */
    initHistoryPage: function() {

        'use strict';

        // If not logged in, return to the login page
        if (typeof u_attr === 'undefined') {
            loadSubPage('login');
            return false;
        }

        // Cache selector
        var $page = $('.mobile.affiliate-history-page');

        // Show the guide page content
        $page.removeClass('hidden');

        mobile.initBackButton($page, 'fm/refer/');
        mobile.affiliate.initHistoryDropdown($page);
    },

    /**
     * History page. Init dropdown
     */
    initHistoryDropdown: function($page) {

        'use strict';

        var $contextMenu = $('.context-menu-container.affliate-history');
        var $contextmenuItems = $('.context-menu-item', $contextMenu);
        var $dropdown = $('.affiliate-history-dropdown', $page);

        $dropdown.rebind('tap', function() {
            mobile.affiliate.showHistoryContextmenu();
        });

        $contextmenuItems.rebind('tap', function() {
            var $this = $(this);

            // Hide context menu
            mobile.affiliate.hideHistoryContextmenu();

            // TODO: add filter logic
            if ($this.data('filter')) {

                // Set dropdown label
                $('span', $dropdown).text($this.text());

                $contextmenuItems.removeClass('active');
                $this.addClass('active');
            }
        });
    },

    /**
     * History page. Show redemption history context menu
     */
    showHistoryContextmenu: function() {

        'use strict';

        var $contextMenu = $('.context-menu-container.affliate-history');
        var $overlay = $('.dark-overlay');

        // Show overlay
        $overlay.removeClass('hidden');

        // Show Context menu
        $contextMenu.removeClass('hidden');
    },

    /**
     * History page. Hide redemption history context menu
     */
    hideHistoryContextmenu: function() {

        'use strict';

        var $contextMenu = $('.context-menu-container.affliate-history');
        var $overlay = $('.dark-overlay');

        // Hide overlay
        $overlay.addClass('hidden');

        // Hide Context menu
        $contextMenu.addClass('hidden');
    },

    /**
     * Initialise affiliate Distribution page
     */
    initDistributionPage: function() {

        'use strict';

        // If not logged in, return to the login page
        if (typeof u_attr === 'undefined') {
            loadSubPage('login');
            return false;
        }

        // Cache selector
        var $page = $('.mobile.affiliate-distrib-page');

        // Show the giude page content
        $page.removeClass('hidden');

        loadingDialog.show('affiliateRefresh');

        this.getMobileAffiliateData(function() {
            mobile.initBackButton($page, 'fm/refer/');
            mobile.affiliate.initDistributionButtons();
            mobile.affiliate.drawTable($page);
        });
    },

    /**
     * Guide page. Init buttons
     */
    initDistributionButtons: function($page) {

        'use strict';

        var $tabs = $('.tab-button', $page);

        $tabs.rebind('tap', function() {
            var $this = $(this);

            if (!$this.hasClass('active') && $this.data('table')) {
                $tabs.removeClass('active');
                $this.addClass('active');
                $('.content', $page).addClass('hidden');
                $('.content.' + $this.data('table'), $page).removeClass('hidden');
            }
        });
    },

    /**
     * Let's draw table with give data
     * @returns {Void} void function
     */
    drawTable: function($page) {

        'use strict';

        var template =
            '<div class="mobile fm-affiliate list-item">' +
                '<img src="$countryImg" alt=""> $countryName <span class="num">$count</span>' +
            '</div>';

        var signupGeo = {};
        var creditGeo = {};

        M.affiliate.signupList.forEach(function(item) {
            signupGeo[item.cc] = ++signupGeo[item.cc] || 1;
        });

        var creditList = M.affiliate.creditList.active.concat(M.affiliate.creditList.pending);

        creditList.forEach(function(item) {
            creditGeo[item.cc] = ++creditGeo[item.cc] || 1;
        });

        var _sortFunc = function(a, b) {
            return signupGeo[b] - signupGeo[a];
        };
        var orderedSignupGeoKeys = Object.keys(signupGeo).sort(_sortFunc);
        var orderedCreditGeoKeys = Object.keys(creditGeo).sort(_sortFunc);

        var html = '';
        var countList = signupGeo;

        var _htmlFunc = function(item) {
            var country = countrydetails(item);
            html += template.replace('$countryImg', staticpath + 'images/flags/' + country.icon)
                .replace('$countryName', country.name || 'Unknown').replace('$count', countList[item]);
        };

        orderedSignupGeoKeys.forEach(_htmlFunc);

        if (html) {
            $('.geo-dist-reg .list', $page).safeHTML(html);
        }

        html = '';
        countList = creditGeo;

        orderedCreditGeoKeys.forEach(_htmlFunc);

        if (html) {
            $('.geo-dist-pur .list', $page).safeHTML(html);
        }
    }
};
