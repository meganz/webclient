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
        var $redeemButton = $('.fm-green-button.redeem', $page);

        /* Subsections buttons */
        $buttons.rebind('tap', function() {
            var $this = $(this);

            if ($this.data('link')) {
                loadSubPage('fm/refer/' + $this.data('link'));
                return false;
            }
        });

        // Redeem requires at least one payment history and available balance more than 50 euro
        if (M.affiliate.redeemable && M.affiliate.balance.available >= 50 && M.affiliate.utpCount) {
            $redeemButton.removeClass('disabled');
        }
        else {
            $redeemButton.addClass('disabled');
        }

        /* Redeem button event */
        $redeemButton.rebind('tap.redeemButton', function() {
            var $this = $(this);

            if (!$this.is('.disabled')) {
                loadSubPage('/fm/refer/redeem/');
            }

            // Prevent double taps
            return false;
        });
    },

    /**
     * Main page. Set commision indexes.
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
            localTotal = formatCurrency(balance.localTotal, balance.localCurrency, 'number');
            localPending = formatCurrency(balance.localPending, balance.localCurrency, 'number');
            localAvailable = formatCurrency(balance.localAvailable, balance.localCurrency, 'number');

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
            var page = $this.data('page');

            $('.page-names span.active', $urlBar).removeClass('active');
            $this.addClass('active');

            if (page === 'start') {
                page = '';
            }

            M.affiliate.getURL(page).then(function(url) {
                $('.url', $urlBar).safeHTML(url.replace(page, '<span>' + page + '</span>'));
            });
        });

        $('.copy-button', $dialog).rebind('tap.copy-to-clipboard', function() {
            var links = $.trim($('.url', $urlBar).text());
            var toastTxt = l[7654];
            copyToClipboard(links, toastTxt);
        });

        $('.page-names span:first', $urlBar).trigger('tap');
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
        mobile.affiliate.showRedeemList($page);
    },

    /**
     * History page. Init dropdown
     */
    initHistoryDropdown: function($page) {

        'use strict';

        var self = this;

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

            if ($this.data('filter')) {

                // Set dropdown label
                $('span', $dropdown).text($this.text());

                $contextmenuItems.removeClass('active');
                $this.addClass('active');

                self.historyList = M.affiliate.getFilteredRedempHistory($this.data('filter'));
                self.renderHistoryTable($page);
            }

            return false;
        });
    },

    renderHistoryTable: function($page) {

        'use strict';

        var self = this;

        if (this.historyList.length) {

            $('.affiliate-empty-data', $page).addClass('hidden');

            var methodIconClass = ['', 'red-bank', 'bitcoin'];
            var $template =  $('.mobile.affiliate-redemption-item.template', $page);
            var html = '';

            for (var i = 0; i < this.historyList.length; i++) {

                var item = this.historyList[i];
                var $item = $template.clone().removeClass('template');
                var status = affiliateRedemption.getRedemptionStatus(item.s);
                var la = parseFloat(item.la);

                $('.method-icon', $item).addClass(methodIconClass[item.gw]);
                $('.transfer', $item).text(affiliateRedemption.getMethodString(item.gw));
                if (item.c === 'XBT') {
                    $('.sum', $item).text('BTC ' + la.toFixed(8));
                }
                else {
                    $('.sum', $item).text(formatCurrency(la, item.c, 'code'));
                }

                $('.date', $item).text(time2date(item.ts, 1));
                $('.status', $item).addClass(status.c).text(status.s);

                html += $item.prop('outerHTML');
            }

            $('.mobile.affiliate-redemptions-list', $page).safeHTML(html);

            var $list = $('.affiliate-transfer', $page);

            $list.rebind('tap.toRedemptionDetail', function() {

                var i = $list.index(this);

                M.affiliate.getRedemptionDetail(self.historyList[i].rid).then(function(res) {

                    $page.addClass('hidden');

                    mobile.affiliate.initRedeemDetailsPage($page, res);
                }).catch(function(ex) {

                    if (d) {
                        console.error('Getting redemption detail failed, rid: ' + self.historyList[i].rid, ex);
                    }

                    msgDialog('warninga', '', l[200] + ' ' + l[253]);
                });
            });
        }
        else {
            $('.affiliate-empty-data', $page).removeClass('hidden');
            $('.mobile.affiliate-redemptions-list', $page).empty();
        }
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
     * History page - Show redemption details
     * @param {Object} $page Jquery object for current page
     *
     * @return {void}
     */
    showRedeemList: function($page) {

        'use strict';

        var self = this;

        loadingDialog.show('redemptionHistory');

        // Pulling redemption history if it is not exist
        var promise;

        if (M.affiliate.redemptionHistory) {
            promise = Promise.resolve();
        }
        else {
            promise = M.affiliate.getRedemptionHistory();
        }

        promise.then(function() {

            loadingDialog.hide('redemptionHistory');

            // Set default as all item
            self.historyList = M.affiliate.redemptionHistory.r;

            mobile.affiliate.renderHistoryTable($page);
        }).catch(function(ex) {

            // Oops there is error show error and send user to back to refer page.
            if (d) {
                console.error('Loading redemption history failed', ex);
            }

            msgDialog('warninga', l[7235], l[200] + ' ' + l[253], '', function() {
                loadingDialog.hide('redemptionHistory');
                loadSubPage('fm/refer');
            });
        });
    },

    /**
     * Initialise affiliate Redemption Details page
     * @param {Object} $historyPage Jquery object for history page
     * @param {Object} data Item detail data
     *
     * @return {void}
     */
    initRedeemDetailsPage: function($historyPage, data) {

        'use strict';

        // If not logged in, return to the login page
        if (typeof u_attr === 'undefined') {

            loadSubPage('login');
            return false;
        }

        // Cache selector
        var $detailsPage = $('.mobile.affiliate-details-page');

        // Show the guide page content
        $detailsPage.removeClass('hidden');

        affiliateRedemption.fillBasicHistoryInfo($detailsPage, data);
        affiliateRedemption.redemptionAccountDetails($detailsPage, data.gw, data);

        // Init Go back to History page
        mobile.initStepBackButton($detailsPage, $historyPage);

        // For back button
        pushHistoryState(page);

        $(window).rebind('popstate.aff-mobile', function() {

            $('.mobile.fm-icon.back', $detailsPage).trigger('tap');
            $(window).off('popstate.aff-mobile');
        });
    },

    /**
     * Initialise Affiliate Redemption request page
     */
    initRedeemPage: function() {

        'use strict';

        // If not logged in, return to the login page
        if (typeof u_attr === 'undefined') {

            loadSubPage('login');
            return false;
        }

        var self = this;

        Promise.all([M.affiliate.getRedemptionMethods(), M.affiliate.getBalance()]).then(function() {

            // Cache selector
            self.$page = $('.fmholder:not(.hidden) .mobile.affiliate-redeem-page');

            // Show the Remption page container
            self.$page.removeClass('hidden');

            // Show the Remption page first Step content
            mobile.affiliate.showRedeemStep(1);

            /* Init Cancel button */
            $('.affiliate.cancel-redeem', self.$page).rebind('tap', function _closeRedeem() {

                self.closeRedeemPage();

                // Prevent double taps
                return false;
            });

            // Next button.
            $('.default-green-button.redeem-button', self.$page).rebind('tap', function() {

                var $this = $(this);
                var currentStep = $this.data('step');

                if ($this.is('.close')) {
                    self.closeRedeemPage();
                }
                else if (currentStep) {

                    if (currentStep === 4 && !$('.auto-fill-checkbox', this.$page).hasClass('hidden') &&
                        $(this).data('confirmUpdate') && affiliateRedemption.validateDynamicAccInputs()) {

                        mobile.messageOverlay.show(
                            l[23374],
                            l[23307],
                            function() {

                                affiliateRedemption.updateAccInfo();

                                $('.redeem-button[data-step="4"]', self.$page).data('confirmUpdate', false);
                            },
                            false,
                            false,
                            [l[79], l[78]]
                        );
                    }

                    affiliateRedemption.processSteps().then(function(res) {

                        if (!res) {
                            return false;
                        }

                        if (currentStep === 3 && affiliateRedemption.requests.first.m === 2) {

                            currentStep++;
                            $('.redeem-progress', self.$page).addClass('with-timer');
                        }

                        self.showRedeemStep(++currentStep);
                    });
                }

                // Prevent double taps
                return false;
            });
        }).catch(function(ex) {

            if (d) {
                console.error('Requesting redeem method list failed: ', ex);
            }

            msgDialog('warninga', '', l[200] + ' ' + l[253]);
        });
    },

    closeRedeemPage: function() {

        'use strict';

        $('.affi-dynamic-acc-name', this.$page).empty();
        this.$page.addClass('hidden');
        loadSubPage('fm/refer/');
        affiliateRedemption.reset();

        // IOS focus input remaining fix
        $(':focus').trigger('blur');
    },

    /**
     * Redemption request page.
     * Show necessary step and Init navigation buttons.
     *
     * @param {String} step Step number
     * @param {Boolean} comeback Indicator that it is triggered by back button
     */
    showRedeemStep: function(step, comeback) {

        'use strict';

        var self = this;
        var rdm = affiliateRedemption;
        var $progressBar = $('.redeem-progress', this.$page);
        var progressMultiplier = rdm.requests.first.m === 2 ? 25 : 20;
        var progressPerc;
        var jump = 1;

        affiliateRedemption.currentStep = step;
        affiliateRedemption.$step = $('.redeem-body.step' + step, this.$page);

        // IOS focus input remaining fix
        $(':focus').trigger('blur');

        /**
        * Init back button
        * If its first step, redirect to Refer page
        */
        if (step === 1 || step === 6) {

            // On first & last step, prev button need to close redemption flow.
            $('.fm-icon.back', this.$page).rebind('tap.closeRedemption', function() {
                self.closeRedeemPage();
            });
        }
        else {
            $('.fm-icon.back', this.$page).rebind('tap', function() {

                // For Bitcoin payment skip step 4
                if (rdm.currentStep === 5 && rdm.requests.first.m === 2) {
                    rdm.currentStep--;
                }

                mobile.affiliate.showRedeemStep(--rdm.currentStep, true);

                // Prevent double taps
                return false;
            });
        }

        /* Show Step content */
        $('.redeem-body:not(.hidden)', this.$page).addClass('hidden');
        $('.redeem-body.step' + step, this.$page).removeClass('hidden');

        /* Show/Hide top Progress bar */
        if ($('.redeem-body.step' + step, this.$page).is('.last')) {
            $progressBar.addClass('hidden');
        }
        else {
            $progressBar.removeClass('hidden');
        }

        /* Set Progress bar values */

        // If this is Bitcoin redemption, due to step 4 is skipped, progress bar should have -2 step
        if (step > 3 && rdm.requests.first.m === 2) {
            jump = 2;
        }

        progressPerc  = Math.max(0, step - jump) * progressMultiplier;

        $('.progress', $progressBar).css({
            width: progressPerc + '%'
        });
        $('.progress span', $progressBar).text(progressPerc + '%');

        $(window).scrollTop(0);

        // Page specific features
        if (typeof this['redeemStep' + step] === 'function') {
            this['redeemStep' + step](comeback);
        }
    },

    redeemStep1: function() {

        'use strict';

        var $step1 = $('.redeem-body.step1', this.$page);

        // Radio buttons
        $('input[name="affiliate-payment-type"]', $step1).rebind('change.selectMethodType', function() {

            $('.radioOn', $step1).removeClass('radioOn').addClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
        });

        for (var type in M.affiliate.redeemGateways) {

            if (M.affiliate.redeemGateways.hasOwnProperty(type)) {

                $('#affiliate-payment-type' + type, this.$dialog)
                    .parents('.payment-type-wrapper').removeClass('hidden');
            }
        }
    },

    redeemStep2: function(comeback) {

        'use strict';

        var $step2 = $('.redeem-body.step2', this.$page);

        if (!comeback) {
            $('#affiliate-redemption-amount', $step2).val('');
        }

        $('.comission span', $step2).text(formatCurrency(M.affiliate.balance.available));

        $('.redeem-all-button', $step2).rebind('tap.redeemAll', function() {
            $('#affiliate-redemption-amount', $step2).val(M.affiliate.balance.available).trigger('change');
        });

        $('#affiliate-redemption-amount', $step2).rebind('change', function() {
            this.value = parseFloat(this.value).toFixed(2);
        });
    },

    redeemStep3: function(comeback) {

        'use strict';

        if (comeback) {

            // If arrive step 3 from step 4, clear country, currency, and dynamic inputs
            delete affiliateRedemption.requests.first.c;
            delete affiliateRedemption.requests.first.cc;
            affiliateRedemption.dynamicInputs = {};
            affiliateRedemption.requests.second = {};

            affiliateRedemption.stopTimer();

            $('.redeem-progress', this.$page).removeClass('with-timer');

            return;
        }

        var $step3 = $('.redeem-body.step3', this.$page);
        var $bank = $('.bank-data', $step3).addClass('hidden');
        var $bitcoin = $('.bitcoin-data', $step3).addClass('hidden');

        // Country and currency
        var $countrySelect = $('#affi-country', $step3);
        var $currencySelect = $('#affi-currency', $step3);
        var rdmReq = affiliateRedemption.requests;
        var selectedGWData = M.affiliate.redeemGateways[rdmReq.first.m];
        var seletedGWDefaultData = selectedGWData.data.d;
        var activeCountry = seletedGWDefaultData[0];

        // Country Select
        var contentHtml = '';

        $countrySelect.prev().text(M.getCountryName(activeCountry));

        for (var i = selectedGWData.data.cc.length; i--;) {

            var cc = escapeHTML(selectedGWData.data.cc[i]);

            contentHtml = '<option value="%1"%3>%2</option>'.replace('%1', cc).replace('%2', M.getCountryName(cc))
                .replace('%3', cc === activeCountry ? ' selected' : '') + contentHtml;
        }

        // IOS hack to display long options
        contentHtml += '<optgroup label=""></optgroup>';

        $countrySelect.safeHTML(contentHtml);

        $countrySelect.rebind('change.countryUpdate', function() {
            $(this).prev().text(M.getCountryName(this.value));
        });

        var activeCurrency = seletedGWDefaultData[1];

        // Country Select
        contentHtml = '';

        $currencySelect.prev().text(activeCurrency);

        for (var j = selectedGWData.data.$.length; j--;) {

            var c = escapeHTML(selectedGWData.data.$[j]);

            contentHtml = '<option value="%1"%3>%2</option>'.replace('%1', c)
                .replace('%2',c).replace('%3', c === activeCurrency ? ' selected' : '') + contentHtml;
        }

        $currencySelect.safeHTML(contentHtml);

        $currencySelect.rebind('change.currencyUpdate', function() {
            $(this).prev().text(this.value);
        });

        if (rdmReq.first.m === 2) {
            $bitcoin.removeClass('hidden');
        }
        else {
            $bank.removeClass('hidden');
        }
    },

    redeemStep4: function(comeback) {

        'use strict';

        var self = this;
        var $step4 = $('.redeem-body.step4', this.$page);
        var rdm = affiliateRedemption;
        var ccc = rdm.requests.first.cc + rdm.requests.first.c;

        // Save account relates
        var $autofillCheckbox = $('.auto-fill-checkbox', $step4);
        var $saveCheckbox = $('.save-data-checkbox', $step4);

        $('.save-data-tip', $step4).addClass('hidden');

        // If there is saved data and it is same country and currency code, let user have autofill
        if (M.affiliate.redeemAccDefaultInfo && M.affiliate.redeemAccDefaultInfo.ccc === ccc) {

            // If saved data exist
            $autofillCheckbox.removeClass('hidden');
            $saveCheckbox.addClass('hidden');
        }
        else {
            // If saved data do not exist
            $autofillCheckbox.addClass('hidden');
            $saveCheckbox.removeClass('hidden');
        }

        if (comeback) {
            return;
        }

        // Start timer
        rdm.startTimer();

        $('.redeem-progress', this.$page).addClass('with-timer');

        var $accountType = $('.affi-dynamic-acc-type', $step4);
        var $accName = $('#affi-account-name', $step4);
        var $textTemplate = $('.affi-dynamic-acc-input.template', $step4);
        var accNameItem = {key: 'affi-account-name', name: l[23362]};

        if (!$accName.length) {
            $accName = this.__renderTextInput($('.affi-dynamic-acc-name', $step4), $textTemplate, accNameItem);
        }

        var __fillupForm = function(empty) {

            var keys = Object.keys(M.affiliate.redeemAccDefaultInfo);

            // Lets do autofill for type first due to it need to render rest of dynamic inputs
            var $type = $('#account-type', $step4);
            var savedValue;

            if ($type.length) {

                // If this has multiple types of dynamic input just reset type, clear dynamic inputs box will be enough
                if (empty) {

                    // Account name
                    $('#affi-account-name', $step4).val('');

                    // Account type
                    $type.val('').trigger('change.removeError');
                    $('.affi-dynamic-acc-info', $step4).empty();

                    return;
                }

                savedValue = M.affiliate.redeemAccDefaultInfo.type;
                var value = $('option.' + savedValue, $type).val();

                $type.val(value).trigger('change');
            }

            for (var i = 0; i < keys.length; i++) {

                var key = keys[i];

                // ccc and type are not need to be processed
                if (key === 'ccc' || key === 'type') {
                    continue;
                }

                var hashedKey = MurmurHash3(key);
                var $target = $('#m' + hashedKey, $step4);

                if (key === 'an') {
                    $target = $('#affi-account-name', $step4);
                }

                savedValue = empty ? '' : M.affiliate.redeemAccDefaultInfo[key];

                $target.val(savedValue).trigger('input').trigger('change');
            }

            $('.redeem-button[data-step="4"]', self.$page).data('confirmUpdate', false);
        };

        uiCheckboxes($autofillCheckbox, function(value) {
            __fillupForm(!value);
        });

        uiCheckboxes($saveCheckbox);

        $('.redeem-button[data-step="4"]', self.$page).data('confirmUpdate', false);

        if (!rdm.requests.second.extra) {

            $('input', $autofillCheckbox).prop('checked', false);
            $('.checkdiv', $autofillCheckbox).removeClass('checkboxOn').addClass('checkboxOff');
            $accName.val('');
            $accountType.empty();
        }
        else if (!rdm.requests.second.extra.an) {
            $accName.val('');
        }
        else if (!rdm.requests.second.extra.type) {
            $accountType.empty();
        }

        // There is dynamic account info required for this.
        // But if there is already any dynamic input(i.e. it is from step 4) skip rendering
        if (rdm.req1res[0].data && !comeback) {

            $('.affi-dynamic-acc-info', this.$page).empty();

            var accTypes = rdm.req1res[0].data;

            // This has multiple account type, therefore let user select it.
            if (accTypes.length > 1) {

                var $selectTemplate = $('.affi-dynamic-acc-select.template', this.$page);

                var item = {
                    key: 'account-type',
                    name: l[23394],
                    va: [{key: '', name: l[1278]}],
                };

                for (var i = accTypes.length; i--;) {

                    var accType = accTypes[i];

                    item.va.push({key: i, name: accType[1], _class: accType[0]});
                }

                var $select = this.__renderSelect($accountType, $selectTemplate, item);

                $select.rebind('change.accountTypeSelect', function() {

                    $(this).parent().removeClass('error');

                    // Type changed reset dynamic inputs
                    rdm.dynamicInputs = {};
                    self.__renderDynamicAccInputs(this.value);

                    if (!M.affiliate.redeemAccDefaultInfo || M.affiliate.redeemAccDefaultInfo.ccc !== ccc) {
                        $saveCheckbox.removeClass('hidden');
                    }
                });
            }
            else {
                this.__renderDynamicAccInputs(0);
            }
        }
    },

    redeemStep5: function() {

        'use strict';

        var $step5 = $('.redeem-body.step5', this.$page);

        // Start timer
        affiliateRedemption.startTimer();

        // Summary amount table
        var rdmreq1 = affiliateRedemption.requests.first;
        var rdmreq1res = affiliateRedemption.req1res;

        if (rdmreq1.c === 'EUR') {

            $('.requested.price .euro', $step5).addClass('hidden');
            $('.fee.price .euro', $step5).addClass('hidden');
            $('.received.price .euro', $step5).addClass('hidden');
            $('.local-info', $step5).addClass('hidden');
        }
        else {
            $('.requested.price .euro', $step5).removeClass('hidden')
                .text(formatCurrency(rdmreq1.p));
            $('.fee.price .euro', $step5).removeClass('hidden').text(formatCurrency(rdmreq1res[0].f));
            $('.received.price .euro', $step5).removeClass('hidden')
                .text(formatCurrency(rdmreq1.p - rdmreq1res[0].f));
            $('.local-info', $step5).removeClass('hidden');
        }

        if (rdmreq1.m === 2) {

            $('.requested.price .local', $step5)
                .text('BTC ' + parseFloat(rdmreq1res[0].la).toFixed(8));
            $('.fee.price .local', $step5).text('BTC ' + parseFloat(rdmreq1res[0].lf).toFixed(8) + '*');
            $('.received.price .local', $step5).text('BTC ' + (rdmreq1res[0].la - rdmreq1res[0].lf).toFixed(8));
        }
        else {
            $('.requested.price .local', $step5)
                .text(formatCurrency(rdmreq1res[0].la, rdmreq1res[0].lc, 'code'));
            $('.fee.price .local', $step5)
                .text(formatCurrency(rdmreq1res[0].lf, rdmreq1res[0].lc, 'code') + '*');
            $('.received.price .local', $step5)
                .text(formatCurrency(rdmreq1res[0].la - rdmreq1res[0].lf, rdmreq1res[0].lc, 'code'));
        }

        $('.country', $step5).text(M.getCountryName(rdmreq1.cc));
        $('.currency', $step5).text(rdmreq1.c);

        affiliateRedemption.redemptionAccountDetails($step5, rdmreq1.m);
    },

    __renderDynamicAccInputs: function(accountType) {

        'use strict';

        var self = this;
        var $accountInfo = $('.affi-dynamic-acc-info', this.$page).empty();
        var $textTemplate = $('.affi-dynamic-acc-input.template', this.$page);
        var $selectTemplate = $('.affi-dynamic-acc-select.template', this.$page);
        var affr1Res = affiliateRedemption.req1res[0];
        var dynamicRequirements = affr1Res.data[accountType][2];

        // If this is not array something is wrong, and cannot proceed due to lack of information for the transaction
        if (!Array.isArray(dynamicRequirements)) {
            return false;
        }

        var __updateExtraInputs = function(item, $select) {

            var hashedKey = 'm' + MurmurHash3(item.key);
            $accountInfo.safeAppend('<div class="extraWrapper" data-parent="@@"></div>', hashedKey);

            $select.rebind('change.showAdditionalInput', function() {

                var $extraWrapper = $('.extraWrapper[data-parent="' + hashedKey + '"]', $accountInfo).empty();
                affiliateRedemption.clearDynamicInputs();

                // Temporary record for second request as it requires for afftrc.
                affiliateRedemption.recordSecondReqValues();

                loadingDialog.show('rroc');

                M.affiliate.getExtraAccountDetail().then(function(res) {

                    var additions = res.data[0];
                    var subtractions = res.data[1];

                    for (var i = 0; i < subtractions.length; i++) {
                        $('#m' + MurmurHash3(subtractions[i].key)).parent().remove();
                    }

                    for (var j = 0; j < additions.length; j++) {

                        var addKey = additions[j].key;
                        var addHashedKey = 'm' + MurmurHash3(addKey);

                        if ($('#' + addHashedKey, self.$page).length === 0) {

                            if (additions[j].va) {
                                var $addedSelect = self.__renderSelect($extraWrapper, $selectTemplate, additions[j]);
                                affiliateRedemption.dynamicInputs[addHashedKey] = ['s', $addedSelect, addKey];
                            }
                            else {
                                var $addedInput = self.__renderTextInput($extraWrapper, $selectTemplate, additions[j]);
                                affiliateRedemption.dynamicInputs[addHashedKey] = ['t', $addedInput, addKey];
                            }
                        }

                        var $newElem = $('#' + addHashedKey, self.$page);
                        var parentHashedKey = $newElem.parents('.extraWrapper').data('parent');
                        var parentDynamicInput = affiliateRedemption.dynamicInputs[parentHashedKey];
                        var defaultInfo = M.affiliate.redeemAccDefaultInfo;

                        // This is may triggered by autofill
                        if ($('.auto-fill-checkbox input', self.$page).prop('checked') &&
                            parentDynamicInput[1].val() === defaultInfo[parentDynamicInput[2]]) {
                            $newElem.val(defaultInfo[additions[j].key]).trigger('change.settingsGeneral');
                        }
                    }

                    affiliateRedemption.clearDynamicInputs();

                    // Lets remove temporary added data for afftrc.
                    affiliateRedemption.requests.second = {};

                    loadingDialog.hide('rroc');
                });
            });

            onIdle(function() {
                $select.trigger('change.showAdditionalInput');
            });
        };

        for (var i = 0; i < dynamicRequirements.length; i++) {

            var item = dynamicRequirements[i];
            var hashedKey = 'm' + MurmurHash3(item.key);

            // This is select input
            if (item.va) {

                var $select = self.__renderSelect($accountInfo, $selectTemplate, item);
                affiliateRedemption.dynamicInputs[hashedKey] = ['s', $select, item.key];

                if (item.rroc) {
                    __updateExtraInputs(item, $select);
                }
            }
            // This is text input
            else {
                var $input = self.__renderTextInput($accountInfo, $textTemplate, item);
                affiliateRedemption.dynamicInputs[hashedKey] = ['t', $input, item.key];
            }
        }
    },

    __renderTextInput: function($target, $template, item) {

        'use strict';

        var self = this;
        var $clone = $template.clone().removeClass('template');
        var hashedKey = 'm' + MurmurHash3(item.key);

        if (item.key === 'affi-account-name') {
            hashedKey = 'affi-account-name';
        }

        $('.default-input-label', $clone).text(item.name);

        $('input', $clone).attr({
            id: hashedKey,
            placeholder: '%1',
            title: '%2',
            minlength: parseInt(item.mnl),
            maxlength: parseInt(item.mxl)
        });

        $target.safeAppend('%n', $clone.prop('outerHTML'), item.example || '', item.name || '');

        var $input = $('#' + hashedKey, $target);

        if (item.vr) {
            $input.data('_vr', item.vr);
        }

        $input.rebind('input.removeError', function() {

            $(this).parent().removeClass('error');

            if (!$('.auto-fill-checkbox', self.$page).hasClass('hidden')) {
                $('.redeem-button[data-step="4"]', self.$page).data('confirmUpdate', true);
            }
        });

        return $input;
    },

    __renderSelect: function($target, $template, item) {

        'use strict';

        var defaultCountry;

        // If there is any country in the gw requested input, prefill it with what already selected.
        if (item.key.indexOf('country') > -1) {
            defaultCountry = affiliateRedemption.requests.first.cc;
        }

        var $clone = $template.clone().removeClass('template');
        var $select = $('select', $clone);
        var hashedKey = 'm' + MurmurHash3(item.key);

        // Account type is not dynamic requirements so does not requires hashed key
        if (item.key === 'account-type') {
            hashedKey = 'account-type';
        }

        $('.default-select-label', $clone).text(item.name);
        $select.attr({id: hashedKey, title: escapeHTML(item.name)});

        var selectOptions = '';
        var selectItemTemplate = '<option class="@@" value="@@"%s>@@</option>';
        var safeArgs = [];

        for (var i = 0; i < item.va.length; i++) {

            var option = item.va[i];
            var selectItemHtml;
            safeArgs.push(option._class || '', option.key, option.name);

            if ((!defaultCountry && i === 0) || (defaultCountry && defaultCountry === option.key)) {
                selectItemHtml = selectItemTemplate.replace('%s', ' selected');
                $('span', $clone).text(option.name);
            }
            else {
                selectItemHtml = selectItemTemplate.replace('%s', '');
            }

            selectOptions += selectItemHtml;
        }

        // IOS hack to display long options
        selectOptions += '<optgroup label=""></optgroup>';

        safeArgs.unshift(selectOptions);

        $select.safeHTML.apply($select, safeArgs);

        $target.safeAppend($clone.prop('outerHTML'));

        $select = $('#' + hashedKey, $target);

        $select.rebind('change.removeError', function() {

            var $this = $(this);
            $this.parent().removeClass('error');

            if (this.value === '' && $(':selected', $this).length === 0) {

                var $firstOption = $(':first', $this);

                this.value = $firstOption.val();
                $this.prev().text($firstOption.text());
            }
            else {
                $this.prev().text($(':selected', $this).text());
            }

            if (!$('.auto-fill-checkbox', self.$page).hasClass('hidden')) {
                $('.redeem-button[data-step="4"]', self.$page).data('confirmUpdate', true);
            }
        });

        return $select;
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
                '<div class="img-wrap"><img src="$countryImg" alt=""></div>' +
                '$countryName <span class="num">$count</span>' +
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
