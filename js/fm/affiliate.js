// Note: Referral Program is called as affiliate program at begining, so all systemic names are under word affiliate
// i.e. affiliate === referral

function affiliateUI() {

    'use strict';

    // Prevent ephemeral session to access
    if (u_type === 0) {
        msgDialog('confirmation', l[998], l[17146]
            + ' ' + l[999], l[1000], function(e) {
            if (e) {
                loadSubPage('register');
                return false;
            }
            loadSubPage('fm');
        });

        return false;
    }

    $('.fm-right-files-block, .section.conversations, .fm-right-block.dashboard').addClass('hidden');
    $('.nw-fm-left-icon').removeClass('active');
    $('.nw-fm-left-icon.affiliate').addClass('active').removeClass('animate');

    M.onSectionUIOpen('affiliate');
    loadingDialog.show('affiliateRefresh');

    M.affiliate.getAffiliateData().catch(function() {
        if (d) {
            console.error('Pulling affiliate data failed due to one of it\'s operation failed.');
        }
        msgDialog('warninga', '', l[200] + ' ' + l[253], '', function() {
            loadingDialog.hide('affiliateRefresh');
        });
    }).then(function() {
        onIdle(clickURLs);
        M.affiliate.lastupdate = Date.now();
        loadingDialog.hide('affiliateRefresh');
        affiliateUI.startRender();
    });

    affiliateUI.$body = $('.fm-affiliate.body');

    $('.breadcrumbs .item.active', affiliateUI.$body).rebind('click.breadcrumbs', function() {
        loadSubPage('/fm/dashboard');
    });

    // Init Referral content scrolling
    var $scrollBlock = $('.scroll-block', affiliateUI.$body);

    if ($scrollBlock.is('.ps')) {
        Ps.update($scrollBlock[0]);
    }
    else {
        Ps.initialize($scrollBlock[0]);
    }
}

/*
 * Dialogs start
 */

/**
 * Affiliate guide dialog
 */
affiliateUI.guideDialog = {

    // Init event on affiliate dashboard to open dialog.
    init: function() {

        'use strict';

        var self = this;

        $('.guide-dialog', affiliateUI.$body).rebind('click.guide-dialog', function() {
            affiliateUI.guideDialog.show();

            if (this.classList.contains('to-rules')) {
                onIdle(function() {
                    self.$firstStepBlock.removeClass('active');
                    self.$secondStepBlock.addClass('active');
                    self.showAffiliateSlide(3);
                });
            }
        });
    },

    // Show dialog
    show: function() {

        'use strict';

        var self = this;

        this.$dialog = $('.mega-dialog.affiliate-guide');
        this.$firstStepBlock = $('.step1', this.$dialog);
        this.$secondStepBlock = $('.step2', this.$dialog);
        this.slidesLength = $('.affiliate-guide-content', this.$secondStepBlock).length;

        this.bindDialogEvents();

        // Reset dialog contents
        this.$firstStepBlock.addClass('active');
        this.$secondStepBlock.removeClass('active');
        this.showAffiliateSlide();

        M.safeShowDialog('affiliate-guide-dialog', self.$dialog);
    },

    // Dialog event binding
    bindDialogEvents: function() {

        'use strict';

        var self = this;

        // Step1. Welcome dialog, How it works button click - > show step 2.
        $('button.how-it-works', this.$dialog).rebind('click.guide-dialog-hiw-btn', function() {
            self.$firstStepBlock.removeClass('active');
            self.$secondStepBlock.addClass('active');
        });

        // Step 2. Back/Next buttons
        $('.bottom-button', this.$dialog).rebind('click.btns', function() {
            var currentSlide = $('.nav-button.active', self.$dialog).data('slide');

            if ($(this).hasClass('next') && currentSlide + 1 <= self.slidesLength) {
                self.showAffiliateSlide(currentSlide + 1);
            }
            else if ($(this).hasClass('back') && currentSlide - 1 >=  0) {
                self.showAffiliateSlide(currentSlide - 1);
            }
        });

        $('button.dashboard', this.$secondStepBlock).rebind('click.to-aff-page', function() {
            loadSubPage('fm/refer');
        });

        // Step 2.Top nav buttons
        $('.nav-button', this.$dialog).rebind('click.top-nav', function() {
            self.showAffiliateSlide($(this).attr('data-slide'));
        });

        // Closing dialog related
        $('button.js-close', this.$dialog).rebind('click.close-dialog', function() {
            closeDialog();
            $('.fm-dialog-overlay').off('click.affGuideDialog');
        });

        $('.fm-dialog-overlay').rebind('click.affGuideDialog', function() {
            $('.fm-dialog-overlay').off('click.affGuideDialog');
        });
    },

    // Step 2. Show Slides.
    showAffiliateSlide: function(num) {

        'use strict';

        num = num | 0 || 1;

        $('.affiliate-guide-content.active', this.$secondStepBlock).removeClass('active');
        $('.affiliate-guide-content.slide' + num, this.$secondStepBlock).addClass('active');

        // Show/hide Back button
        if (num === 1) {
            $('.bottom-button.back', this.$secondStepBlock).addClass('hidden');
        }
        else {
            $('.bottom-button.back', this.$secondStepBlock).removeClass('hidden');
        }

        // Slide 3 requires scrollpane
        if (num === 3) {
            var $scrollBlock = $('.affiliate-guide-content.slide3', this.$secondStepBlock);

            if ($scrollBlock.is('.ps')) {
                Ps.update($scrollBlock[0]);
            }
            else {
                Ps.initialize($scrollBlock[0]);
            }

            $('footer', this.$dialog).addClass('has-divider');
        }
        else {
            $('footer', this.$dialog).removeClass('has-divider');
        }

        // Show/hide Affiliate Dashboard button/Next button
        if (num === this.slidesLength) {
            $('.bottom-button.next', this.$secondStepBlock).addClass('hidden');

            if (page === 'fm/refer') {
                $('button.dashboard', this.$secondStepBlock).addClass('hidden');
            }
            else {
                $('button.dashboard', this.$secondStepBlock).removeClass('hidden');
            }
        }
        else {
            $('.mega-button.positive', this.$secondStepBlock).addClass('hidden');
            $('.bottom-button.next', this.$secondStepBlock).removeClass('hidden');
        }

        // Change top buttons state
        $('.nav-button.active', this.$secondStepBlock).removeClass('active');
        $('.nav-button.slide' + num, this.$secondStepBlock).addClass('active');
    }
};

/**
 * Affiliate referral url generation dialog
 */
affiliateUI.referralUrlDialog = {

    // Show dialog
    show: function() {

        'use strict';

        var self = this;
        this.$dialog = $('.mega-dialog.generate-url');

        this.bindDialogEvents();
        $('.page-names span[data-page="start"]', this.$dialog).click();

        var showWelcome = !M.affiliate.id;

        this.updateURL().then(function() {

            M.safeShowDialog('referral-url-dialog', self.$dialog);

            if (showWelcome) {
                affiliateUI.registeredDialog.show(1);
            }
        });
    },

    // Bind dialog dom event
    bindDialogEvents: function() {

        'use strict';

        var self = this;
        var $urlBlock = $('.url', this.$dialog);

        $urlBlock.rebind('click.select', function() {
            var sel, range;
            var el = $(this)[0];
            if (window.getSelection && document.createRange) {
                sel = window.getSelection();
                if (sel.toString() === ''){
                    window.setTimeout(function(){
                        range = document.createRange();
                        range.selectNodeContents(el);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    },1);
                }
            }
        });

        var $copyBtn = $('.copy-button', this.$dialog);

        if (is_extension || M.execCommandUsable()) {
            $copyBtn.removeClass('hidden');
            $copyBtn.rebind('click.copy-to-clipboard', function() {
                if (!$copyBtn.hasClass('disabled')){
                    const links = $.trim($urlBlock.text());
                    const toastTxt = l[7654];
                    copyToClipboard(links, toastTxt);
                }
            });
        }
        else {
            $copyBtn.addClass('hidden');
        }

        var $pageBtns = $('.page-names span', this.$dialog);

        $pageBtns.rebind('click.select-target-page', function() {

            var $this = $(this);

            $pageBtns.removeClass('active');
            $this.addClass('active');

            if ($this.data('page') === 'more') {
                self.updateURL(1);
                $('.custom-block', self.$dialog).removeClass('hidden');
            }
            else {
                self.updateURL();
                $('.custom-block', self.$dialog).addClass('hidden');
            }
        });

        $('.url-input', this.$dialog).rebind('keyup.enter-custom-url', function(e) {
            if (e.keyCode === 13) {
                self.checkAndSetCustomURL();
            }
        });

        $('.custom-button', this.$dialog).rebind('click.enter-custom-url', function() {
            self.checkAndSetCustomURL();
        });

        $('button.js-close', this.$dialog).rebind('click.close-dialog', function() {
            closeDialog();
        });
    },

    /**
     * Check manually entered url by user is valid to generate custom url.
     * If url is not valid (non mega url, etc) show error.
     * @returns {Boolean|undefined} False if value is empty, or undefined as it act as void function
     */
    checkAndSetCustomURL: function() {

        'use strict';

        var val = $('.url-input', this.$dialog).val();
        var baseUrl = 'https://mega.io';
        var baseUrlRegExp = new RegExp(baseUrl, 'ig');

        if (!val) {
            return false;
        }
        else if (val.search(baseUrlRegExp) === 0) {
            this.customTargetPage = val.replace(baseUrlRegExp, '');
            this.updateURL();
        }
        else if (('https://' + val).search(baseUrlRegExp) === 0) {
            this.customTargetPage = val.replace(baseUrl.replace('https://', ''), '');
            this.updateURL();
        }
        else {
            $('.custom-block', this.$dialog).addClass('error');
        }
    },

    /**
     * Update dom input element with url generated from checkAndSetCustomURL function
     * @param {Boolean} clear Clear the input field
     * @returns {Promise} Promise that resolve once process is done.
     */
    updateURL: function(clear) {

        'use strict';

        var targetPage = $('.page-names .active', this.$dialog).data('page');
        var $urlBlock = $('.url', this.$dialog);
        const $copyBtn = $('.copy-button', this.$dialog);

        $('.custom-block', this.$dialog).removeClass('error');

        if (clear) {
            $urlBlock.empty();
            $('.url-input', this.$dialog).val('');
            $copyBtn.addClass('disabled');
            return Promise.resolve();
        }
        $copyBtn.removeClass('disabled');

        if (targetPage === 'start') {
            targetPage = '';
        }
        else if (targetPage === 'more' && this.customTargetPage !== undefined) {
            targetPage = this.customTargetPage;

            if (targetPage.charAt(0) === '/') {
                targetPage = targetPage.slice(1);
            }
            if (targetPage.charAt(targetPage.length - 1) === '/') {
                targetPage = targetPage.slice(0, -1);
            }
        }

        return M.affiliate.getURL(targetPage).then(function(url) {
            const urlWithoutAfftag = targetPage === 'help' ? l.mega_help_host
                : `https://mega.io/${targetPage}`;
            $urlBlock.safeHTML(url.replace(urlWithoutAfftag, '<span>' + urlWithoutAfftag + '</span>'));
        });
    },
};

/**
 * Affiliate welcome(registered) dialog
 */
affiliateUI.registeredDialog = {

    // Show dialog
    show: function(skipReq) {

        'use strict';

        if (u_type > 2 && mega.flags.refpr && !pfid) {

            var self = this;
            this.$dialog = $('.mega-dialog.joined-to-affiliate');

            var _showRegisteredDialog = function() {
                self.bindDialogEvents();
                M.safeShowDialog('joined-to-affiliate', self.$dialog);
            };

            if (M.currentdirid === 'refer') {
                $('.how-it-works span', this.$dialog).text(l[81]);
                $('.cancel-button', this.$dialog).addClass('hidden');
            }

            // After referal url dialog.
            if (skipReq) {
                _showRegisteredDialog();
            }
            // User never see this dialog before.
            else if (!M.affiliate.id) {
                M.affiliate.getID().then(function() {
                    _showRegisteredDialog();
                });
            }
        }
    },

    // Bind dialog dom event
    bindDialogEvents: function() {

        'use strict';

        $('.how-it-works', this.$dialog).rebind('click.to-aff-page', function() {
            closeDialog();
            affiliateUI.guideDialog.show();
        });

        $('button.js-close, .cancel-button', this.$dialog).rebind('click.close-dialog', function() {
            closeDialog();
        });
    }
};

/*
 * Dialogs End
 */

/*
 * Dashboard Start
 */

/*
 * Start affiliate dashboard rendering. Required Chart.js
 */
affiliateUI.startRender = function() {

    'use strict';

    loadingDialog.show('affiliateUI');

    affiliateUI.referUsers.init();
    affiliateUI.commissionIndex.init();
    affiliateUI.redemptionHistory.init();
    affiliateUI.geographicDistribution.init();
    affiliateUI.guideDialog.init();

    M.require('charts_js', 'charthelper_js').done(function() {

        affiliateUI.registrationIndex.init();
        affiliateUI.purchaseIndex.init();
        loadingDialog.hide('affiliateUI');
    });
};

/*
 * Refer users section
 */
affiliateUI.referUsers = {

    init: function() {

        'use strict';

        this.bindEvents();
    },

    bindEvents: function() {

        'use strict';

        $('.refer-block', affiliateUI.$body).rebind('click.affRefClick', function() {
            affiliateUI.referUsers.handleClick($(this).data('reftype'));
        });

        $('.refer-users', affiliateUI.$body).rebind('click.affRefClick', function() {
            $('.scroll-block', affiliateUI.$body).animate({scrollTop: 0}, 500);
        });
    },

    /*
     * Click event handling for refer user feature.
     * also used for product page.
     * @param {String} reftype Button clicked by user.
     */
    handleClick: function(reftype) {

        'use strict';

        switch (reftype) {

            case 'url':
                // show URL dialog
                affiliateUI.referralUrlDialog.show();
                break;

            case 'link':
                M.safeShowDialog('create-new-link', function() {
                    M.initFileAndFolderSelectDialog('create-new-link');
                });
                break;

            case 'chatlink':
                M.safeShowDialog('create-new-chat-link', function() {
                    M.initNewChatlinkDialog();
                });
                break;

            case 'invite':
                $.hideContextMenu();
                if (M.isInvalidUserStatus()) {
                    return;
                }
                contactAddDialog(false, true);
                setContactLink();
                break;
        }
    }
};

/*
 * Commission index section
 */
affiliateUI.commissionIndex = {

    init: function() {

        'use strict';

        this.$block = $('.mega-data-box.commission', affiliateUI.$body);

        this.calculateCommission();
        this.bindEvents();
    },

    calculateCommission: function() {

        'use strict';

        var balance = M.affiliate.balance;
        var currencyHtml = '';
        var localTotal;
        var localPending;
        var localAvailable;

        if (balance.localCurrency === 'EUR') {
            $('.non-euro-only', this.$block).addClass('hidden');
            $('.euro-price', this.$block).addClass('hidden');

            localTotal = formatCurrency(balance.localTotal);
            localPending = formatCurrency(balance.localPending);
            localAvailable = formatCurrency(balance.localAvailable);
        }
        else {

            localTotal = formatCurrency(balance.localTotal, balance.localCurrency, 'number');
            localPending = formatCurrency(balance.localPending, balance.localCurrency, 'number');
            localAvailable = formatCurrency(balance.localAvailable, balance.localCurrency, 'number');

            currencyHtml = ' <span class="currency">' + balance.localCurrency + '</span>';

            $('.commission-block.total .euro-price', this.$block)
                .text(formatCurrency(balance.pending + balance.available));
            $('.commission-block.pending .euro-price', this.$block).text(formatCurrency(balance.pending));
            $('.commission-block.available .euro-price', this.$block).text(formatCurrency(balance.available));
        }

        $('.commission-block.total .price', this.$block).safeHTML(localTotal + currencyHtml);
        $('.commission-block.pending .price', this.$block).safeHTML(localPending + currencyHtml);

        currencyHtml += balance.localCurrency === 'EUR' ? '' : '<sup>3</sup>';

        $('.commission-block.available .price', this.$block).safeHTML(localAvailable + currencyHtml);

        if (u_attr.b || u_attr.pf) {
            $('.no-buisness', this.$block).addClass('hidden');
        }

        // Redeem requires at least one payment history and available balance more than 50 euro
        if (M.affiliate.redeemable && balance.available >= 50 && M.affiliate.utpCount) {
            $('button.redeem', this.$block).removeClass('disabled');
        }
        else {
            $('button.redeem', this.$block).addClass('disabled');
        }
    },

    bindEvents: function() {

        'use strict';

        $('button.redeem' ,this.$block).rebind('click.openRedemptionDialog', function() {

            if ($(this).hasClass('disabled')) {
                return false;
            }

            affiliateUI.redemptionDialog.show();
        });
    }
};

affiliateUI.redemptionDialog = {

    show: function() {

        'use strict';

        var self = this;
        var balance = M.affiliate.balance;
        this.rdm = M.affiliate.redemption;
        this.$dialog = $('.mega-dialog.affiliate-redeem');

        // Reset dialog and info
        this.reset();

        M.affiliate.getRedemptionMethods().then(function() {

            self.displaySteps();

            const euro = formatCurrency(balance.available);

            const $availableComissionTemplates = $('.templates .available-comission-template', self.$dialog);
            const $euroTemplate = $('.available-commission-euro', $availableComissionTemplates)
                .clone()
                .removeClass('hidden');
            const $localTemplate = $('.available-commission-local', $availableComissionTemplates)
                .clone()
                .removeClass('hidden');
            const $availableComissionArea = $('.available-comission-quota span', self.$dialog).empty();
            const $availableBitcoinArea = $('.available-comission-bitcoin span', self.$dialog).empty();

            $euroTemplate.text(euro);

            if (balance.localCurrency && balance.localCurrency !== 'EUR') {
                const local = balance.localCurrency + ' ' +
                    formatCurrency(balance.localAvailable, balance.localCurrency, 'narrowSymbol') + '* ';
                $localTemplate.text(local);
                $availableComissionArea
                    .safeAppend($localTemplate.prop('outerHTML'))
                    .safeAppend($euroTemplate.prop('outerHTML'));
            }
            else {
                $('.affiliate-redeem.local-info span', self.$dialog).addClass('hidden');
                $localTemplate.text(euro + '*');
                $availableComissionArea.safeAppend($localTemplate.prop('outerHTML'));
            }

            $availableBitcoinArea.safeAppend($localTemplate.text(euro).prop('outerHTML'));




            self.bindDialogEvents();

            M.safeShowDialog('affiliate-redeem-dialog', self.$dialog);

        }).catch(function(ex) {

            if (d) {
                console.error('Requesting redeem method list failed: ', ex);
            }

            msgDialog('warninga', '', l[200] + ' ' + l[253]);
        });
    },

    showSubmitted: function() {

        'use strict';

        var __closeSubmitted = function() {

            closeDialog();
            $('.fm-dialog-overlay').off('click.redemptionSubmittedClose');

            // After closing the dialog, refresh balance and history
            Promise.all([M.affiliate.getBalance(), M.affiliate.getRedemptionHistory()]).then(() => {

                affiliateUI.commissionIndex.init();
                affiliateUI.redemptionHistory.updateList();
                affiliateUI.redemptionHistory.drawTable();
                affiliateUI.redemptionHistory.bindEvents();
            }).catch((ex) => {

                if (d) {
                    console.error('Update redmeption page failed: ', ex);
                }

                msgDialog('warninga', '', l[200] + ' ' + l[253]);
            });
        };

        let $dialog;

        if (affiliateRedemption.requests.first.m === 0) {
            $dialog = $('.mega-dialog.affiliate-request-quota', self.$dialog);
            const {m, s, t} = this.getFormattedPlanData(true);

            $('.plan-name', $dialog)
                .text(l.redemption_confirmation_pro_plan_name.replace('%1', affiliateRedemption.plan.planName));
            $('.plan-storage', $dialog).text(l.redemption_confirmation_pro_storage.replace('%1', s));
            $('.plan-quota', $dialog).text(l.redemption_confirmation_pro_transfer.replace('%1', t));
            $('.plan-duration', $dialog).text(l.redemption_confirmation_pro_duration.replace('%1', m));
            $('.affiliate-redeem .summary-wrap .pro-price .plan-info', $dialog).addClass('hidden');
            $('affiliate-redeem .summary-wrap .pro-price .euro', this.$dialog).addClass('hidden');
        }
        else {
            $dialog = $('.mega-dialog.affiliate-request.bitcoin', self.$dialog);
            const message = affiliateRedemption.requests.first.m === 2 ? l[23364] : l[23365];

            $('.status-message', $dialog).text(message);

        }
        // Bind OK and close buttons
        $('button', $dialog).rebind('click', __closeSubmitted);
        $('.fm-dialog-overlay').rebind('click.redemptionSubmittedClose', __closeSubmitted);

        M.safeShowDialog('affiliate-redeem-submitted', $dialog);
    },

    hide: function(noConfirm) {

        'use strict';

        var self = this;
        var __hideAction = function() {

            self.reset();
            closeDialog();
            $('.fm-dialog-overlay').off('click.redemptionClose');
        };

        // if it is not step 1, show confimation dialog before close
        if (noConfirm) {
            __hideAction();
        }
        else {
            msgDialog('confirmation', '', l[20474], l[18229], function(e) {

                if (e) {
                    __hideAction();
                }
            });
        }
    },

    reset: function() {

        'use strict';

        // Reset previous entered data
        $('input:not([type="radio"])', this.$dialog).val('');
        $('#affiliate-payment-type2', this.$dialog).trigger('click');
        $('.next-btn', this.$dialog).addClass('disabled');
        $('#affi-bitcoin-address', this.$dialog).val('');
        // $('#affiliate-redemption-amount', this.$dialog).attr('data-currencyValue', M.affiliate.balance.available);
        $('.checkdiv.checkboxOn', this.$dialog).removeClass('checkboxOn').addClass('checkboxOff');
        $('.save-data-tip', this.$dialog).addClass('hidden');
        $('.dropdown-item-save', this.$dialog).addClass('hidden');

        // Reset options for pro plan redemption
        affiliateRedemption.plan = {
            chosenPlan: pro.minPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL],
            planName: '',
            planStorage: -1,
            planQuota: -1,
            planDuration: undefined,
            planPriceRedeem: -1,
        };

        affiliateRedemption.reset();
    },

    bindDialogEvents: function() {

        'use strict';

        var self = this;
        var balance = M.affiliate.balance;

        // Naviagtion & close buttons
        var $nextbtn = $('.next-btn', this.$dialog);

        $nextbtn.rebind('click', function() {

            if ($(this).hasClass('disabled')) {
                return false;
            }

            loadingDialog.show('redeemRequest');
            self.$dialog.addClass('arrange-to-back');

            affiliateRedemption.processSteps().then(function(res) {

                if (!res) {
                    return false;
                }

                loadingDialog.hide('redeemRequest');
                self.$dialog.removeClass('arrange-to-back');
                affiliateRedemption.currentStep++;

                // This is end of flow lets close the dialog and show submitted dialog
                if (affiliateRedemption.currentStep === 5) {
                    self.showSubmitted();
                    self.hide(true);
                }
                else {
                    self.displaySteps();
                }

                // For Bitcoin payment skip step 3 after update summary table
                if (affiliateRedemption.currentStep === 3 && affiliateRedemption.requests.first.m === 2) {
                    affiliateRedemption.currentStep++;
                    self.displaySteps();
                }

                // For MEGAquota redemption skip to step 4
                if ([2, 3].includes(affiliateRedemption.currentStep) && affiliateRedemption.requests.first.m === 0){
                    affiliateRedemption.currentStep += (4 - affiliateRedemption.currentStep);  // skip to step 4
                    self.displaySteps();
                }
            });
        });

        $('.prev-btn', this.$dialog).rebind('click', function() {

            affiliateRedemption.currentStep--;

            // For Bitcoin payment skip step 3
            if (affiliateRedemption.currentStep === 3 && affiliateRedemption.requests.first.m === 2) {
                affiliateRedemption.currentStep--;
            }
            else if ([2, 3, 4].includes(affiliateRedemption.currentStep) && affiliateRedemption.requests.first.m === 0){
                affiliateRedemption.currentStep = 1;
            }
            self.displaySteps();

            // If this arrive step 2 again, clear country, currency, and dynamic inputs
            if (affiliateRedemption.currentStep === 2) {
                delete affiliateRedemption.requests.first.c;
                delete affiliateRedemption.requests.first.cc;
                affiliateRedemption.dynamicInputs = {};
                affiliateRedemption.requests.second = {};

                // uncheck all checkbox from step 3.
                $('.step3 .checkdiv.checkboxOn', this.$dialog).removeClass('checkboxOn').addClass('checkboxOff');
            }

            if (affiliateRedemption.currentStep === 1) {

                $('#affi-bitcoin-address', this.$dialog).val('');
                const $checkbox = $('.step2 .checkdiv.checkboxOn', this.$dialog)
                    .removeClass('checkboxOn').addClass('checkboxOff');
                $('input[type="checkbox"]' ,$checkbox).prop('checked', false);
                $('.save-data-tip', this.$dialog).addClass('hidden');
            }
        });

        $('button.js-close', this.$dialog).rebind('click', this.hide.bind(this, false));
        $('.fm-dialog-overlay').rebind('click.redemptionClose', this.hide.bind(this, false));

        // Step 0
        const $step0 = $('.cells.step0', this.$dialog);

        const $template = $('.affiliate-payment-template', $step0);
        const $wrapper = $('.affiliate-redeem .payment-type-wrapper', $step0);
        $wrapper.empty();

        // Generate redemption options based on given gateways
        let tickFirstRadio = true;
        const radioText = {0: l.redemption_method_pro_plan, 2: l[6802]};
        for (const type in M.affiliate.redeemGateways) {
            const $clone = $template.clone();
            $clone.children('.radioOff').children().attr('id', 'affiliate-payment-type' + type).val(type);
            $clone.children('label').attr('for', 'affiliate-payment-type' + type).text(radioText[type]);
            $clone.removeClass('hidden affiliate-payment-template');

            // Make sure first radio option is ticked (Pro plan redemption if it is in gateways)
            if (tickFirstRadio) {
                $clone.children('.radioOff').removeClass('radioOff').addClass('radioOn');
                tickFirstRadio = false;
            }
            $wrapper.safeAppend($clone.prop('outerHTML'));
        }

        $('.payment-type input', $step0).rebind('change.selectMethodType', function() {
            $('.radioOn', $step0).removeClass('radioOn').addClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
            $nextbtn.removeClass('disabled');
        });

        // Step 1
        var $step1 = $('.cells.step1', this.$dialog);

        const $amount = $('#affiliate-redemption-amount', $step1);
        $amount.trigger('input').trigger('blur');


        $('.withdraw-txt a', $step1).rebind('click.changeMethod', () => {
            affiliateRedemption.currentStep = 0;
            self.displaySteps();
            return false;
        });

        $amount.rebind('input', function() {
            var activeMethodMin = M.affiliate.redeemGateways[$('.payment-type .radioOn input', $step0).val()].min || 50;
            const megaInput = $(this).data('MegaInputs');
            if (megaInput) {
                megaInput.hideError();
            }
            const val = megaInput ? megaInput.getValue() : 0;

            if (val >= activeMethodMin && val <= balance.available) {
                $nextbtn.removeClass('disabled');
            }
            else if (affiliateRedemption.currentStep > 0) {
                $nextbtn.addClass('disabled');
            }
        });

        $amount.rebind('blur', function() {

            var $this = $(this);
            var activeMethodMin = M.affiliate.redeemGateways[$('.payment-type .radioOn input', $step0).val()].min || 50;

            const megaInput = $(this).data('MegaInputs');
            const val = megaInput ? megaInput.getValue() : 0;
            if (!val) {
                $('.info.price.requested .local', this.$dialog).text('------');
            }
            else if (val < activeMethodMin) {
                $this.data('MegaInputs').showError(l[23319].replace('%1', formatCurrency(activeMethodMin)));
            }
            else if (val > balance.available) {
                $this.data('MegaInputs').showError(l[23320]);
            }
            else {
                $('.info.price.requested .local', this.$dialog).text(formatCurrency(val));
                this.value = $this.attr('type') === 'text'
                    ? formatCurrency(val, 'EUR', 'number')
                    : parseFloat(val).toFixed(2);
            }
        });

        $('.redeem-all-btn', $step1).rebind('click.redeemAll', function() {
            $amount.val(balance.available).trigger('input').trigger('blur');
        });


        // Step 2
        var $step2 = $('.cells.step2', this.$dialog);
        const $saveDataTipBitcoin = $('.save-data-tip', $step2);

        $('.withdraw-txt a', $step2).rebind('click.changeMethod', function() {

            affiliateRedemption.currentStep = 0;
            self.displaySteps();

            return false;
        });

        uiCheckboxes($('.save-bitcoin-checkbox', $step2));

        uiCheckboxes($('.bitcoin-fill-checkbox', $step2), value => {

            $('#affi-bitcoin-address', $step2).data('MegaInputs')
                .setValue(value ? M.affiliate.redeemAccDefaultInfo.an : '');
            $saveDataTipBitcoin.addClass('hidden');
        });

        $('#affi-bitcoin-address', $step2).rebind('input.changeBitcoinAddress', function() {

            if (!this.value) {
                $saveDataTipBitcoin.addClass('hidden');
            }
            else if (M.affiliate.redeemAccDefaultInfo && M.affiliate.redeemAccDefaultInfo.an &&
                M.affiliate.redeemAccDefaultInfo.an !== this.value) {

                $saveDataTipBitcoin.removeClass('hidden');
            }

            Ps.update($step2.children('.ps').get(0));
        });

        // Step 3
        var $step3 = $('.cells.step3', this.$dialog);
        var $autofillCheckbox = $('.auto-fill-checkbox', $step3);
        var $saveDataTip = $('.save-data-tip', $step3);

        var __fillupForm = function(empty) {

            var keys = Object.keys(M.affiliate.redeemAccDefaultInfo);

            // Lets do autofill for type first due to it need to render rest of dynamic inputs
            var $type = $('#account-type', $step3);
            var savedValue;
            var $activeOption;

            if ($type.length) {

                // If this has multiple types of dynamic input just reset type, clear dynamic inputs box will be enough
                if (empty) {

                    // Account name
                    var $an = $('#affi-account-name', $step3);
                    $an.data('MegaInputs').setValue('', true);

                    // Account type
                    $('span', $type).text(l[23366]);
                    $('.option.active', $type).removeClass('active');
                    $('.affi-dynamic-acc-info', $step3).empty();

                    return;
                }

                savedValue = M.affiliate.redeemAccDefaultInfo.type;
                $activeOption = $('.option.' + savedValue, $type);
                $type.trigger('click');
                $activeOption.trigger('click');
            }

            for (var i = 0; i < keys.length; i++) {

                var key = keys[i];

                // ccc and type are not need to be processed
                if (key === 'ccc' || key === 'type') {
                    continue;
                }

                var hashedKey = MurmurHash3(key);
                var $target = $('#m' + hashedKey, $step3);

                if (key === 'an') {
                    $target = $('#affi-account-name', $step3);
                }

                savedValue = empty ? '' : M.affiliate.redeemAccDefaultInfo[key];

                if ($target.is('.megaInputs.underlinedText')) {
                    $target.data('MegaInputs').setValue(savedValue, true);
                }
                else if ($target.hasClass('dropdown-input')) {

                    $activeOption = empty ? $('.option:first', $target) :
                        $('.option[data-type="' + savedValue + '"]', $target);

                    $target.trigger('click');
                    $activeOption.trigger('click');
                }
            }
        };

        uiCheckboxes($autofillCheckbox, function(value) {

            const scrollContainer = $step3[0].querySelector('.cell-content');
            __fillupForm(!value);
            $saveDataTip.addClass('hidden');
            Ps.update(scrollContainer);
            scrollContainer.scrollTop = 0;
            $('input', $step3).off('focus.jsp');
        });

        uiCheckboxes($('.save-data-checkbox', $step3));

        $saveDataTip.add($saveDataTipBitcoin).rebind('click.updateAccData', function(e) {

            var $this = $(this);
            var $target = $(e.target);
            var __hideSaveDataTip = function() {

                $this.addClass('hidden');
                const scrollContainer = $this.closest('.cell-content').get(0);
                Ps.update(scrollContainer);
                scrollContainer.scrollTop = 0;
                $('input', scrollContainer).off('focus.jsp');
            };

            var _bitcoinValidation = function() {

                const $input = $('#affi-bitcoin-address');
                const megaInput = $input.data('MegaInputs');

                if (validateBitcoinAddress($input.val())) {

                    if (megaInput) {
                        megaInput.showError(l[23322]);
                    }
                    else {
                        msgDialog('warninga', '', l[23322]);
                    }

                    return false;
                }

                affiliateRedemption.requests.second.extra = {an: $input.val()};

                return true;
            };

            const _validation = affiliateRedemption.requests.first.m === 2 ?
                _bitcoinValidation : affiliateRedemption.validateDynamicAccInputs.bind(affiliateRedemption);

            if ($target.hasClass('accept') && _validation()) {

                affiliateRedemption.updateAccInfo();
                __hideSaveDataTip();
            }
            else if ($target.hasClass('cancel')) {
                __hideSaveDataTip();
            }
        });

        // Step 4

        var $step4 = $('.cells.step4', this.$dialog);

        $('.withdraw-txt a', $step4).rebind('click.changeMethod', () => {

            affiliateRedemption.currentStep = 0;
            self.displaySteps();

            return false;
        });
    },

    displaySteps: function() {

        'use strict';

        // If user has a Pro Flexi or Business account, go straight to bitcoin redemption step1
        if (affiliateRedemption.currentStep === 0
                && u_attr.p === pro.ACCOUNT_LEVEL_BUSINESS || u_attr.p === pro.ACCOUNT_LEVEL_PRO_FLEXI){
            affiliateRedemption.currentStep = 1;
            affiliateRedemption.requests.first.m = 2;
        }


        // Show and hide contents
        $('.cells.left', this.$dialog).addClass('hidden');
        const $prevBtn = $('.prev-btn', this.$dialog);
        const $nextBtn = $('.next-btn', this.$dialog);
        const buttonText = {0: l[556], 1: l[7348], 2: l[427], 3: l[23367], 4: l[23368]};
        const buttonTextQuota = {0: l[556], 1: l[556], 2: l[427], 3: l[23367], 4: l[23368]};

        const $currentStep = $('.cells.step' + affiliateRedemption.currentStep, this.$dialog);

        affiliateRedemption.$step = $currentStep.removeClass('hidden');

        // Show and hide prev button
        if (affiliateRedemption.currentStep === 1 && affiliateRedemption.requests.first.m === 2){
            $prevBtn.addClass('hidden');
        }
        else if (affiliateRedemption.currentStep > 0) {
            $prevBtn.removeClass('hidden');
        }
        else {
            $prevBtn.addClass('hidden');
        }

        // Timer relates
        if (affiliateRedemption.currentStep > 2 && affiliateRedemption.requests.first.m !== 0) {
            affiliateRedemption.startTimer();
        }
        else {
            affiliateRedemption.stopTimer();
        }

        this['displayStep' + affiliateRedemption.currentStep]();
        const textToAdd = affiliateRedemption.requests.first.m === 0 ? buttonTextQuota : buttonText;
        $('span', $nextBtn).text(textToAdd[affiliateRedemption.currentStep]);

        var $cellContent = $('.cell-content', $currentStep);

        if ($currentStep.is('.scrollable') && !$cellContent.hasClass('ps')) {
            Ps.initialize($cellContent[0]);
            $('input', $currentStep).off('focus.jsp');
        }
        else {
            $cellContent.scrollTop(0);
            Ps.update($cellContent[0]);
        }
    },

    displayStep0: function() {

        'use strict';

        $('.next-btn', this.$dialog).removeClass('wide disabled').addClass('small');
        $('.cells.right', this.$dialog).addClass('hidden');
        this.$dialog.addClass('dialog-small').removeClass('dialog-normal dialog-medium dialog-tall disabled');
    },

    displayStep1: function() {

        'use strict';


        const $nextBtn = $('.next-btn', this.$dialog).removeClass('wide');
        $('.cells.right', this.$dialog).removeClass('hidden');
        $('.plan-select-message', this.$dialog).addClass('hidden');
        this.$dialog.removeClass('dialog-small').addClass('dialog-normal');
        const $bitcoinSummary = $('.cells.right.bitcoin', this.$dialog);
        const $megaquotaSummary = $('.cells.right.megaquota', this.$dialog);
        const $planRadios = $('.affiliate-redeem.plan-selection-wrapper', this.$dialog);

        if (affiliateRedemption.requests.first.m === 0){
            $megaquotaSummary.removeClass('hidden');
            $bitcoinSummary.addClass('hidden');
            $planRadios.removeClass('hidden');
            this.$dialog.addClass('dialog-medium').removeClass('dialog-normal');

            this.handleProPlans();
        }
        else {
            $bitcoinSummary.removeClass('hidden').addClass('small step1');
            $megaquotaSummary.addClass('hidden');
            $planRadios.addClass('hidden');
            this.$dialog.removeClass('dialog-medium').addClass('dialog-normal');
            $nextBtn.removeClass('small');

            if (u_attr.p === pro.ACCOUNT_LEVEL_BUSINESS || u_attr.p === pro.ACCOUNT_LEVEL_PRO_FLEXI){
                $('.cells.left .affiliate-redeem.withdraw-txt a', this.$dialog).addClass('hidden');
            }
        }

        const currentPlan = affiliateRedemption.requests.first.m; // 2 = BTC, 0 = MEGAquota

        let $currentStep = $('.cells.step1', this.$dialog);

        if (currentPlan === 0){
            $currentStep.addClass('hidden');
            $currentStep = $('.cells.step1.megaquota', this.$dialog);
            $currentStep.removeClass('hidden');
        }
        else {
            const $amountInput = $('#affiliate-redemption-amount', this.$dialog);
            const $amountMessage = $('.amount-message-container', this.$dialog);
            const megaInput = $amountInput.data('MegaInputs') || new mega.ui.MegaInputs($amountInput, {
                onShowError: function(msg) {
                    $amountMessage.removeClass('hidden').text(msg);
                },
                onHideError: function() {
                    $amountMessage.addClass('hidden');

                }
            });
            const amountValue = megaInput.getValue();
            const method = affiliateRedemption.requests.first.m;
            const minValue = M.affiliate.redeemGateways[method].min || 50;
            if ((amountValue < minValue) || (amountValue > M.affiliate.balance.available) || !amountValue) {
                $nextBtn.addClass('disabled');
            }
            else {
                $nextBtn.removeClass('disabled');
            }

            // Summary table update
            $('.requested.price .euro', this.$dialog).addClass('hidden').text('------');
            $('.requested.price .local', this.$dialog).text(amountValue ? formatCurrency(amountValue) : '------');
            $('.fee.price .euro', this.$dialog).addClass('hidden').text('------');
            $('.fee.price .local', this.$dialog).text('------');
            $('.received.price .euro', this.$dialog).addClass('hidden').text('------');
            $('.received.price .local', this.$dialog).text('------');

            megaInput.hideError();
        }

        // Method text
        $('.withdraw-txt .method-chosen', $currentStep)
            .text(affiliateRedemption.getMethodString(affiliateRedemption.requests.first.m));

    },

    handleProPlans: function() {

        'use strict';

        const updateRadioButtons = (selection) => {
            const options = [4, 1, 2, 3];
            for (const currentOption of options) {
                const $currentRadio = $(`#redemptionOption${currentOption}.megaquota-option`, this.$dialog);
                const $button = $currentRadio.children('.green-active');
                $button.removeClass('radioOn radioOff');
                if (selection === currentOption) {
                    $button.addClass('radioOn');
                }
                else {
                    $button.addClass('radioOff');
                }
            }
            const monthsOptions = ['Claim all commission'];
            for (let i = 1; i <= 24; i++){
                monthsOptions.push(i);
            }
            affiliateRedemption.plan.chosenPlan = selection;
            const defaultMonths = affiliateRedemption.plan.planDuration || l.duration;
            affiliateUI.redemptionDialog.__renderDropdown('redemption-plans', monthsOptions,
                                                          defaultMonths, this.$dialog);
        };

        const fetchPlansData = () => {

            const $proPlanOptionTemplate = $('.megaquota-option-template', this.$dialog);
            const $proPlanOptionArea = $('.megaquota-options-wrapper', this.$dialog);
            $('.megaquota-option', $proPlanOptionArea).remove();

            const acceptedPlans = new Set([4, 1, 2, 3]); // [pro lite, pro 1, pro 2, pro 3]
            for (const currentPlan of pro.membershipPlans) {

                const storageFormatted = bytesToSize(currentPlan[pro.UTQA_RES_INDEX_STORAGE] * 1073741824, 0);
                const storageTxt = l[23789].replace('%1', storageFormatted);
                const bandwidthFormatted = bytesToSize(currentPlan[pro.UTQA_RES_INDEX_TRANSFER] * 1073741824, 0);
                const bandwidthTxt = l[23790].replace('%1', bandwidthFormatted);

                const planNum = currentPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];
                const months = currentPlan[pro.UTQA_RES_INDEX_MONTHS];

                // There is a 12 month and 1 month version for each plan,
                // check that it's the one month version so no duplicate plans shown
                if (acceptedPlans.has(planNum) && months === 1){
                    const $clone = $proPlanOptionTemplate.clone();

                    const planName = pro.getProPlanName(planNum);
                    const id = `redemptionOption${planNum}`;

                    $clone.children('.megaquota-option-label').children('.meqaquota-option-name')
                        .text(planName);
                    $clone.children('.megaquota-option-label').children('.meqaquota-option-information')
                        .text(storageTxt + ' / ' + bandwidthTxt);

                    $clone.removeClass('hidden template').addClass('megaquota-option');
                    $clone.attr('id', id);

                    $proPlanOptionArea.safeAppend($clone.prop('outerHTML'));
                    $proPlanOptionArea.children('#' + id).rebind('click', () => {
                        updateRadioButtons(planNum);
                        this.updateQuotaSummaryTable(planNum);
                    });
                }
            }

        };

        fetchPlansData();
        updateRadioButtons(affiliateRedemption.plan.chosenPlan);
    },

    getFormattedPlanData : (shortform, data) => {

        'use strict';

        shortform = shortform || false;

        // a: amount, la: localAmount, f: fee, lf: localFee, c: currency, m: months, s: storageQuota, t: transferQuota
        const {a, la, f, lf, c, m, s, t} = data === undefined
            ? affiliateRedemption.req1res[0]
            : data;

        let monthsTxt = formatCurrency(m, c, 'number', 3);
        monthsTxt = mega.icu.format(l[922], monthsTxt);

        // shortform ? n TB : n TB transfer quota

        const storageFormatted = bytesToSize(s * 1073741825, 3, 4);
        const storageTxt = shortform ? storageFormatted : l[23789].replace('%1', storageFormatted);
        const bandwidthFormatted = bytesToSize(t * 1073741824, 3, 4);
        const bandwidthTxt = shortform ? bandwidthFormatted : l[23790].replace('%1', bandwidthFormatted);

        return {
            a: formatCurrency(a, 'EUR', 'narrowSymbol'),
            la: formatCurrency(la, c, 'narrowSymbol'),
            f: formatCurrency(f),
            lf: formatCurrency(lf),
            c: c || 'EUR',
            m: monthsTxt,
            s: storageTxt,
            t: bandwidthTxt,
        };
    },

    getCurrentPlanInfo : (selection) => {

        'use strict';

        const planInfo = {
            previousPlanNum : -1,
            planNum : -1,
            monthlyPrice : 0,
            yearlyPrice : 0,
            monthlyPriceEuros: 0,
            yearlyPriceEuros : 0,
            claimAllCommission : false,
            transferQuota : 0,
            storageQuota : 0,
            currency: '',
        };

        for (const currentPlan of pro.membershipPlans) {

            const months = currentPlan[pro.UTQA_RES_INDEX_MONTHS];
            const planNum = currentPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];

            planInfo.previousPlanNum = planInfo.planNum;
            planInfo.planNum = planNum;

            if (planNum === selection && months === 1) {
                planInfo.monthlyPrice = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE];
                planInfo.monthlyPriceEuros = currentPlan[pro.UTQA_RES_INDEX_PRICE];
                planInfo.transferQuota = currentPlan[pro.UTQA_RES_INDEX_TRANSFER];
            }
            else if (planNum === selection && months === 12){
                planInfo.yearlyPrice = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICE];
                planInfo.yearlyPriceEuros = currentPlan[pro.UTQA_RES_INDEX_PRICE];
            }
            if (planInfo.planNum === selection && planInfo.planNum === planInfo.previousPlanNum
                && planInfo.planNum !== -1 && planInfo.previousPlanNum !== -1){
                planInfo.storageQuota = currentPlan[pro.UTQA_RES_INDEX_STORAGE];
                planInfo.currency = currentPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];
                break;
            }
        }
        return planInfo;
    },

    updateQuotaSummaryTable : (selection) => {

        'use strict';

        const calculateClaimAllMonths = (availableAmount, pricePerYear, pricePerMonth) => {
            let months = 0;
            let counter = 0;
            while (availableAmount >= pricePerYear && counter <= 100){
                availableAmount -= pricePerYear;
                months += 12;
                counter++;
            }
            months += (availableAmount / pricePerMonth);
            return months;
        };

        affiliateRedemption.plan.chosenPlan = selection || affiliateRedemption.plan.chosenPlan;

        const $summaryTable = $('.quota-summary', this.$dialog);
        const $dropdown = $('.duration-dropdown', this.$dialog);
        const $planSelectMessage = $('.plan-select-message', this.$dialog);
        const $dialogWindow = $('.mega-dialog.affiliate-redeem.dialog-template-tool', self.$dialog);

        let numMonths;

        numMonths = $('.option.active', $dropdown).data('type');
        if (numMonths) {
            $('.redemption-duration-base', $dropdown).removeClass('redemption-duration-default');
            $('.mega-input-title', $dropdown).removeClass('hidden');
        }
        else {
            $('.duration-dropdown .redemption-duration-base', this.$dialog).addClass('redemption-duration-default');
            $('.mega-input-title', $dropdown).addClass('hidden');
        }

        // reset table
        if (!selection || !numMonths) {
            $('.pro-plan .plan-info', $summaryTable).text('-');
            $('.pro-storage .plan-info', $summaryTable).text('-');
            $('.pro-quota .plan-info', $summaryTable).text('-');
            $('.pro-duration .plan-info', $summaryTable).text('-');
            $('.affiliate-redeem .summary-wrap .pro-price .plan-info', this.$dialog)
                .text(formatCurrency('', M.affiliate.balance.localCurrency, 'narrowSymbol').replace('NaN', '-'));
            $('.affiliate-redeem .summary-wrap .pro-price .euro', this.$dialog).addClass('hidden');
            $('.next-btn', this.$dialog).addClass('disabled');
            $('.insufficient-quota-warning', this.$dialog).addClass('hidden');
            $planSelectMessage.removeClass('hidden insufficient-quota-warning').addClass('under-price-warning')
                .text(l.redemption_cost_too_low);
            $dialogWindow.addClass('dialog-tall');
            return;
        }

        const planInfo = affiliateUI.redemptionDialog.getCurrentPlanInfo(selection, numMonths);

        if (numMonths === 'Claim all commission'){
            const claimAllMonths = calculateClaimAllMonths(
                M.affiliate.balance.available, planInfo.yearlyPriceEuros, planInfo.monthlyPriceEuros);
            planInfo.claimAllCommission = true;
            numMonths = claimAllMonths;
        }

        const planName = pro.getProPlanName(planInfo.planNum);

        const monthsCost = planInfo.monthlyPrice * (numMonths % 12);
        const yearsCost = planInfo.yearlyPrice * Math.floor(numMonths / 12);

        const monthsCostEuros = planInfo.monthlyPriceEuros * (numMonths % 12);
        const yearsCostEuros = planInfo.yearlyPriceEuros * Math.floor(numMonths / 12);

        let totalCost;
        let totalCostEuros;
        if (planInfo.claimAllCommission){
            totalCost = M.affiliate.balance.localAvailable;
            totalCostEuros = M.affiliate.balance.available;
        }
        else {
            totalCost = monthsCost + yearsCost;
            totalCostEuros = monthsCostEuros + yearsCostEuros;
        }

        // If the plan is too low cost, reset the table to empty, and warn the user
        // Otherwise remove the warning
        if (totalCostEuros < 49.95) {
            $planSelectMessage.removeClass('hidden insufficient-quota-warning').addClass('under-price-warning')
                .text(l.redemption_cost_too_low);
            $dialogWindow.addClass('dialog-tall');
            affiliateUI.redemptionDialog.updateQuotaSummaryTable();
            return;
        }
        $planSelectMessage.addClass('hidden');
        $dialogWindow.removeClass('dialog-tall');

        totalCostEuros = totalCostEuros.toFixed(8);
        totalCost = (totalCostEuros * pro.conversionRate).toFixed(8);

        const dataToFormat = {
            a: totalCostEuros,
            la: totalCost,
            f: 0,
            lf: 0,
            c: planInfo.currency,
            m: numMonths,
            s: planInfo.storageQuota,
            t: planInfo.transferQuota * numMonths
        };

        const {a, la, m, s, t, c} = affiliateUI.redemptionDialog.getFormattedPlanData(true, dataToFormat);

        $('.pro-plan .plan-info', $summaryTable).text(planName);
        $('.pro-storage .plan-info', $summaryTable).text(s);
        $('.pro-quota .plan-info', $summaryTable).text(t);
        $('.pro-duration .plan-info', $summaryTable).text(m);
        if (!c || c === 'EUR') {
            $('.affiliate-redeem .summary-wrap .pro-price .plan-info', this.$dialog).text(a + '*');
            $('.affiliate-redeem .summary-wrap .pro-price .euro', this.$dialog).addClass('hidden');
        }
        else {
            $('.affiliate-redeem .summary-wrap .pro-price .plan-info', this.$dialog).text(la + '*');
            $('.affiliate-redeem .summary-wrap .pro-price .euro', this.$dialog).text(a).removeClass('hidden');
        }

        affiliateRedemption.plan.planName = planName;
        affiliateRedemption.plan.planPriceRedeem = totalCostEuros;


        const $nextBtn = $('.next-btn', this.$dialog);

        const cost = affiliateRedemption.plan.planPriceRedeem;
        const method = affiliateRedemption.requests.first.m;
        const minValue = M.affiliate.redeemGateways[method].min || 50;

        if (affiliateRedemption.plan.chosenPlan !== -1 && numMonths
            && cost >= minValue && cost <= M.affiliate.balance.available){
            $nextBtn.removeClass('disabled');
        }
        else {
            $nextBtn.addClass('disabled');
        }
        if (cost > M.affiliate.balance.available){
            $planSelectMessage.removeClass('hidden under-price-warning').addClass('insufficient-quota-warning')
                .text(l.redemption_insufficient_available_commission);
            $dialogWindow.addClass('dialog-tall');
        }
        else {
            $planSelectMessage.addClass('hidden');
            $dialogWindow.removeClass('dialog-tall');
        }
    },

    durationDropdownHandler: function($select) {

        'use strict';

        const $dropdownItem = $('.option', $select);
        $dropdownItem.rebind('click.inputDropdown', function() {

            const $this = $(this);

            if ($this.hasClass('disabled')) {
                return;
            }

            const months = parseInt($this.data('type'));

            $select.removeClass('error');
            const $item = $('> span', $select);
            $dropdownItem.removeClass('active').removeAttr('data-state');
            $this.addClass('active').attr('data-state', 'active');
            const $dropdownSave = $('.dropdown-item-save', $item);
            const newText = $('.dropdown-item-text', $this).text();
            if (months % 12 === 0) {
                $dropdownSave.removeClass('hidden');
            }
            else {
                $dropdownSave.addClass('hidden');
            }
            $('.dropdown-text', $item).text(newText);
            $item.removeClass('placeholder');
            $this.trigger('change');
        });
    },

    calculatePrice : function(months, monthlyPrice, yearlyPrice) {

        'use strict';

        const monthsCost = monthlyPrice * (months % 12);
        const yearsCost = yearlyPrice * Math.floor(months / 12);
        return monthsCost + yearsCost;
    },

    setActive : function(type, activeItem, $dropdown, $currentStep) {

        'use strict';

        if (type === 'redemption-plans') {
            this.durationDropdownHandler($dropdown);
            let currentText;
            if (activeItem === 'Claim all commission') {
                currentText = l.redemption_claim_max_months;
            }
            else if (parseInt(activeItem)) {
                currentText = mega.icu.format(l[922], activeItem);
            }
            else {
                currentText = activeItem;
                currentText = parseInt(activeItem) ? mega.icu.format(l[922], activeItem) : activeItem;
            }
            this.updateQuotaSummaryTable(affiliateRedemption.plan.chosenPlan);
            $('#affi-' + type + ' > span span.dropdown-text', $currentStep).text(currentText);
        }
        else {
            $('#affi-' + type + ' > span', $currentStep)
                .text(type === 'country' ? M.getCountryName(activeItem) : activeItem);
        }
    },

    __renderDropdown : function(type, list, activeItem, $currentStep) {

        'use strict';

        const $selectItemTemplate = $('.templates .dropdown-templates .select-item-template', this.$dialog);
        const $dropdown = $('#affi-' + type, $currentStep);

        let planInfo;
        let monthlyPrice;
        let yearlyPrice;

        if (type === 'redemption-plans') {
            $('.duration-dropdown', this.$dialog).rebind("change", () => {
                const chosenDuration = $('.option.active', '.duration-dropdown').data('type');
                affiliateRedemption.plan.planDuration = chosenDuration.toString();
                this.updateQuotaSummaryTable(affiliateRedemption.plan.chosenPlan);
            });
            $('.dropdown-scroll', $dropdown).empty();
            planInfo = this.getCurrentPlanInfo(affiliateRedemption.plan.chosenPlan);
            monthlyPrice = planInfo.monthlyPriceEuros || 0;
            yearlyPrice = planInfo.yearlyPriceEuros || 0;
            const price = this.calculatePrice(activeItem, monthlyPrice, yearlyPrice);
            if ((isNaN(price) || price < 49.95) && affiliateRedemption.plan.planDuration !== 'Claim all commission'){
                activeItem = l.duration;
                affiliateRedemption.plan.planDuration = undefined;
            }
        }

        $('.mega-input-dropdown', $currentStep).addClass('hidden');

        for (let i = 0; i < list.length; i++) {

            const $clone = $selectItemTemplate.clone().removeClass('select-item-template');
            $clone.remove();

            const item = escapeHTML(list[i]);
            let displayName;
            if (type === 'country'){
                displayName = M.getCountryName(item);
            }
            else if (type === 'redemption-plans'){

                const cost = this.calculatePrice(i, monthlyPrice, yearlyPrice);

                displayName = item === 'Claim all commission'
                    ? l.redemption_claim_max_months
                    : mega.icu.format(l[922], item);
                if (item % 12 === 0){
                    $clone.children('.dropdown-item-save').removeClass('hidden').text(l.redemption_save_16_percent);
                }
                if (cost < 49.95 && item !== 'Claim all commission') {
                    $clone.addClass('disabled');
                }
            }
            else {
                displayName = item;
            }
            const state = item === activeItem ? 'active' : '';
            $clone.attr({"data-type": item, "data-state": state});
            $clone.children('.dropdown-item-text').text(displayName);
            $clone.addClass(state);
            $('.dropdown-scroll', $dropdown).safeAppend($clone.prop('outerHTML'));
        }

        bindDropdownEvents($dropdown);
        this.setActive(type, activeItem, $dropdown, $currentStep);
    },


    displayStep2: function() {

        'use strict';

        var $currentStep = $('.cells.step2', this.$dialog);
        $('.cells.right.bitcoin', this.$dialog).removeClass('step1');

        // Method text
        $('.withdraw-txt .method-chosen', $currentStep)
            .text(affiliateRedemption.getMethodString(affiliateRedemption.requests.first.m));

        // Summary table update
        $('.requested.price .euro', this.$dialog).addClass('hidden').text('------');
        $('.requested.price .local', this.$dialog)
            .text(formatCurrency(affiliateRedemption.requests.first.p));
        $('.fee.price .euro', this.$dialog).addClass('hidden').text('------');
        $('.fee.price .local', this.$dialog).text('------');
        $('.received.price .euro', this.$dialog).addClass('hidden').text('------');
        $('.received.price .local', this.$dialog).text('------');

        // Country and currency
        var selectedGWData = M.affiliate.redeemGateways[affiliateRedemption.requests.first.m];
        var seletedGWDefaultData = selectedGWData.data.d || [];
        var activeCountry = affiliateRedemption.requests.first.cc || seletedGWDefaultData[0] ||
            selectedGWData.data.cc[0];
        var activeCurrency = affiliateRedemption.requests.first.c || seletedGWDefaultData[1] ||
            selectedGWData.data.$[0];

        this.__renderDropdown('country', selectedGWData.data.cc, activeCountry, $currentStep);
        this.__renderDropdown('currency', selectedGWData.data.$, activeCurrency, $currentStep);


        // If this is bitcoin redemption
        if (affiliateRedemption.requests.first.m === 2) {

            var megaInput = new mega.ui.MegaInputs($('#affi-bitcoin-address', $currentStep));

            megaInput.hideError();

            $('.affi-withdraw-currency, .currency-tip', $currentStep).addClass('hidden');
            $('.bitcoin-data', $currentStep).removeClass('hidden');

            if (M.affiliate.redeemAccDefaultInfo && M.affiliate.redeemAccDefaultInfo.an) {

                // Autofill bitcoin address
                $('.save-bitcoin-checkbox', $currentStep).addClass('hidden');
                $('.bitcoin-fill-checkbox', $currentStep).removeClass('hidden');
            }
            else {

                // Save bitcoin address
                $('.save-bitcoin-checkbox', $currentStep).removeClass('hidden');
                $('.bitcoin-fill-checkbox', $currentStep).addClass('hidden');
            }
        }
        else {
            $('.affi-withdraw-currency, .currency-tip', $currentStep).removeClass('hidden');
            $('.bitcoin-data', $currentStep).addClass('hidden');
        }
    },

    displayStep3: function() {

        'use strict';

        var self = this;
        var $currentStep = $('.cells.step3', this.$dialog);
        var selectItemTemplate = '<div class="option @@" data-state="@@" data-type="@@">@@</div>';
        var ccc = affiliateRedemption.requests.first.cc + affiliateRedemption.requests.first.c;
        var req1 = affiliateRedemption.requests.first;
        var req1res = affiliateRedemption.req1res[0];

        // Summary table update
        if (req1.c !== 'EUR') {
            $('.requested.price .euro', this.$dialog).removeClass('hidden')
                .text(`(${formatCurrency(req1.p)})`);
            $('.fee.price .euro', this.$dialog).removeClass('hidden')
                .text(`(${formatCurrency(req1res.f)})`);
            $('.received.price .euro', this.$dialog).removeClass('hidden')
                .text(`(${formatCurrency(affiliateRedemption.requests.first.p - req1res.f)})`);
        }

        if (affiliateRedemption.requests.first.m === 2) {

            $('.requested.price .local', this.$dialog)
                .text('BTC ' + parseFloat(req1res.la).toFixed(8));
            $('.fee.price .local', this.$dialog).text('BTC ' + parseFloat(req1res.lf).toFixed(8) + '*');
            $('.received.price .local', this.$dialog).text('BTC ' + (req1res.la - req1res.lf).toFixed(8));

            // This is Bitcoin method just render summary table and proceed.
            return;
        }

        $('.requested.price .local', this.$dialog)
            .text(formatCurrency(req1res.la, req1res.lc, 'code'));
        $('.fee.price .local', this.$dialog)
            .text(formatCurrency(req1res.lf, req1res.lc, 'code') + (req1.c === 'EUR' ? '' : '*'));
        $('.received.price .local', this.$dialog)
            .text(formatCurrency(req1res.la - req1res.lf, req1res.lc, 'code'));

        // Save account relates
        var $autofillCheckbox = $('.auto-fill-checkbox', $currentStep);
        var $saveCheckbox = $('.save-data-checkbox', $currentStep);

        $('.save-data-tip', $currentStep).addClass('hidden');

        var __showHideCheckboxes = function() {
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
        };

        __showHideCheckboxes();

        var $accountType = $('.affi-dynamic-acc-type', $currentStep);
        var $selectTemplate = $('.affi-dynamic-acc-select.template', $currentStep);
        var accNameMegaInput = new mega.ui.MegaInputs($('#affi-account-name', this.$dialog));

        accNameMegaInput.hideError();

        if (!affiliateRedemption.requests.second.extra) {

            $('input', $autofillCheckbox).prop('checked', false);
            $('.checkdiv', $autofillCheckbox).removeClass('checkboxOn').addClass('checkboxOff');
            accNameMegaInput.setValue('');
            $accountType.empty();
        }
        else if (!affiliateRedemption.requests.second.extra.an) {
            accNameMegaInput.setValue('');
        }
        else if (!affiliateRedemption.requests.second.extra.type) {
            $accountType.empty();
        }

        var accTypes = affiliateRedemption.req1res[0].data;

        // There is dynamic account info required for this.
        // But if there is already any dynamic input(i.e. it is from step 4) skip rendering
        if (accTypes && Object.keys(affiliateRedemption.dynamicInputs).length === 0) {

            $('.affi-dynamic-acc-info', this.$dialog).empty();

            // This has multiple account type, therefore let user select it.
            if (accTypes.length > 1) {

                var $accountSelector = $selectTemplate.clone().removeClass('template');

                $('.mega-input-title', $accountSelector).text(l[23394]);
                $accountSelector.attr('id', 'account-type');
                $('span', $accountSelector).text(l[23366]);

                var html = '';
                var safeArgs = [];
                for (var i = 0; i < accTypes.length; i++) {
                    html += selectItemTemplate;
                    safeArgs.push(accTypes[i][0], accTypes[i][0], i, accTypes[i][1]);
                }

                safeArgs.unshift(html);

                var $optionWrapper = $('.dropdown-scroll', $accountSelector);

                $optionWrapper.safeHTML.apply($optionWrapper, safeArgs);

                $accountType.safeAppend($accountSelector.prop('outerHTML'));

                bindDropdownEvents($('#account-type', $accountType));

                $('#account-type .option' , $accountType).rebind('click.accountTypeSelect', function() {

                    $accountType.parent().removeClass('error');

                    // Type changed reset dynamic inputs
                    affiliateRedemption.dynamicInputs = {};
                    self.renderDynamicAccInputs($(this).data('type'));

                    if (!M.affiliate.redeemAccDefaultInfo || M.affiliate.redeemAccDefaultInfo.ccc !== ccc) {
                        $saveCheckbox.removeClass('hidden');
                    }

                    Ps.update($('.cell-content', $currentStep)[0]);
                    $('input', $currentStep).off('focus.jsp');
                });
            }
            else {
                this.renderDynamicAccInputs(0);
            }
        }
    },

    displayStep4: function() {

        'use strict';

        if (affiliateRedemption.requests.first.m === 0) {
            $('.next-btn', this.$dialog).addClass('wide');
        }
        else {
            $('.next-btn', this.$dialog).removeClass('small');
        }
        const $summaryTable = $('.quota-summary', this.$dialog);

        var $currentStep = $('.cells.step4', this.$dialog);

        var firstRequest = affiliateRedemption.requests.first;
        var req1res = affiliateRedemption.req1res[0];

        if (firstRequest.m === 0) {
            $('.bitcoin', $currentStep).addClass('hidden');
            $('.megaquota', $currentStep).removeClass('hidden');

            const $warning1 = $('.affiliate-redeem .selected-plan-warning1', this.$dialog);
            const $warning2 = $('.affiliate-redeem .selected-plan-warning2', this.$dialog);
            const $warning3 = $('.affiliate-redeem .selected-plan-warning3', this.$dialog);
            const newPlan = affiliateRedemption.plan.chosenPlan;
            $warning1.addClass('hidden');
            $warning2.addClass('hidden');
            $warning3.addClass('hidden');
            if (u_attr.p === newPlan){
                $warning3.removeClass('hidden');
            }
            else if (u_attr.p % 4 > newPlan % 4){
                $warning2.removeClass('hidden');
            }
            else if (u_attr.p % 4 < newPlan % 4) {
                $warning1.removeClass('hidden');
            }

            const planName = pro.getProPlanName(affiliateRedemption.plan.chosenPlan);

            const {a, la, m, s, t} = this.getFormattedPlanData(true);

            const $euroArea = $('.affiliate-redeem .summary-wrap .pro-price .euro', this.$dialog);

            $('.pro-plan .plan-info', $summaryTable).text(planName);
            $('.pro-storage .plan-info', $summaryTable).text(s);
            $('.pro-quota .plan-info', $summaryTable).text(t);
            $('.pro-duration .plan-info', $summaryTable).text(m);
            $('.affiliate-redeem .summary-wrap .pro-price .plan-info', this.$dialog).text(la + '*');
            if (affiliateRedemption.req1res[0].c === 'EUR'){
                $euroArea.addClass('hidden');
            }
            else {
                $euroArea.text(a).removeClass('hidden');
            }

        }
        else if (firstRequest.m === 2 && (req1res.lf / req1res.la) > 0.1){
            $('.bitcoin', $currentStep).removeClass('hidden');
            $('.megaquota', $currentStep).addClass('hidden');
            $('.fm-dialog-overlay').off('click.redemptionClose');
            msgDialog('warningb:!^' + l[78] + '!' + l[79], '', l[24964], l[24965], reject => {

                if (reject) {
                    this.hide(true);
                }
                else {
                    $('.fm-dialog-overlay').rebind('click.redemptionClose', this.hide.bind(this, false));
                }
            });

        }
        $('.email', $currentStep).text(u_attr.email);

        affiliateRedemption.redemptionAccountDetails($currentStep, firstRequest.m);

        $('.country', $currentStep).text(M.getCountryName(firstRequest.cc));
        $('.currency', $currentStep).text(firstRequest.m === 2 ? 'BTC' : firstRequest.c);
    },

    __showSaveDataTip: function() {

        'use strict';

        var $step3 = $('.cells.step3', this.$dialog);
        var ccc = affiliateRedemption.requests.first.cc + affiliateRedemption.requests.first.c;

        // If it has saved data for it and country and currency code for saved data is same, show update data tip.
        if (M.affiliate.redeemAccDefaultInfo && M.affiliate.redeemAccDefaultInfo.ccc === ccc) {

            $('.save-data-tip', $step3).removeClass('hidden');
            Ps.update($step3[0].querySelector('.cell-content'));
            $('input', $step3).off('focus.jsp');
        }
    },

    __renderDynamicText: function(textItem, $wrapper) {

        'use strict';

        var $textTemplate = $('.affi-dynamic-acc-input.template', this.$dialog);
        var $input = $textTemplate.clone().removeClass('template');
        var hashedKey = 'm' + MurmurHash3(textItem.key);

        $input.attr({
            title: '@@',
            id: hashedKey,
            minlength: parseInt(textItem.mnl),
            maxlength: parseInt(textItem.mxl)
        });

        $wrapper.safeAppend($input.prop('outerHTML'), textItem.name);

        $input = $('#' + hashedKey, $wrapper);
        var megaInput = new mega.ui.MegaInputs($input);

        // This is executed to avoid double escaping display in text. updateTitle use text() so safe from XSS.
        megaInput.updateTitle(textItem.name);

        if (textItem.example) {

            $input.parent().addClass('no-trans');
            megaInput.showMessage(l[23375].replace('%eg', textItem.example), true);
        }

        if (textItem.vr) {
            $input.data('_vr', textItem.vr);
        }

        affiliateRedemption.dynamicInputs[hashedKey] = ['t', $input, textItem.key];
    },

    __renderDynamicSelect: function(selectItem, $wrapper) {

        'use strict';

        var self = this;
        var $selectTemplate = $('.affi-dynamic-acc-select.template', this.$dialog);
        var selectItemTemplate = '<div class="option %c" data-type="@@" data-state="%s">@@</div>';
        var $currentStep = $('.cells.step3', this.$dialog);
        var defaultCountry;
        var hashedKey = 'm' + MurmurHash3(selectItem.key);

        // If there is any country in the gw requested input, prefill it with what already selected.
        if (selectItem.key.indexOf('country') > -1) {
            defaultCountry = affiliateRedemption.requests.first.cc;
        }

        // This may need to be changed to actual Mega input later.
        var $select = $selectTemplate.clone().removeClass('template');

        $('.mega-input-title', $select).text(selectItem.name);
        $select.attr({id: hashedKey, title: escapeHTML(selectItem.name)});

        var selectHtml = '';
        var safeArgs = [];
        var hasActive = false;

        for (var j = 0; j < selectItem.va.length; j++) {

            var option = selectItem.va[j];
            var selectItemHtml = selectItemTemplate;

            safeArgs.push(option.key, option.name);

            if ((!defaultCountry && j === 0) || (defaultCountry && defaultCountry === option.key)) {
                selectItemHtml = selectItemHtml.replace('%c', 'active').replace('%s', 'active');
                $('span', $select).text(option.name);
                hasActive = true;
            }
            else {
                selectItemHtml = selectItemHtml.replace('%c', '').replace('%s', '');
            }

            selectHtml += selectItemHtml;
        }

        safeArgs.unshift(selectHtml);

        var $optionWrapper = $('.dropdown-scroll', $select);

        $optionWrapper.safeHTML.apply($optionWrapper, safeArgs);

        // If non of option is active with above looping, select first one
        if (!hasActive) {
            $('.option', $optionWrapper).first().addClass('active');
        }

        $wrapper.safeAppend($select.prop('outerHTML'));

        $select = $('#' + hashedKey, $wrapper);
        bindDropdownEvents($select, 0, '.mega-dialog.affiliate-redeem');
        affiliateRedemption.dynamicInputs[hashedKey] = ['s', $select, selectItem.key];

        $('.mega-input-dropdown', $select).rebind('click.removeError', function(e) {

            if ($(e.target).data('type') !== '') {
                $(this).parents('.mega-input.dropdown-input').removeClass('error');
            }
        });

        // There is extra data requires for this. Lets pull it again
        if (selectItem.rroc) {

            $wrapper.safeAppend('<div class="extraWrapper" data-parent="@@"></div>', hashedKey);

            $('.option', $select).rebind('click.showAdditionalInput', function() {

                var $extraWrapper = $('.extraWrapper[data-parent="' + hashedKey + '"]', $wrapper).empty();
                affiliateRedemption.clearDynamicInputs();

                // Temporary record for second request as it requires for afftrc.
                affiliateRedemption.recordSecondReqValues();

                loadingDialog.show('rroc');
                self.$dialog.addClass('arrange-to-back');

                M.affiliate.getExtraAccountDetail().then(function(res) {

                    self.$dialog.removeClass('arrange-to-back');

                    var additions = res.data[0];
                    var subtractions = res.data[1];

                    for (var i = 0; i < subtractions.length; i++) {
                        $('#m' + MurmurHash3(subtractions[i].key)).parent().remove();
                    }

                    for (var j = 0; j < additions.length; j++) {

                        var hashedAddKey = 'm' + MurmurHash3(additions[j].key);

                        if ($('#' + hashedAddKey, self.$dialog).length === 0) {

                            if (additions[j].va) {
                                self.__renderDynamicSelect(additions[j], $extraWrapper);
                            }
                            else {
                                self.__renderDynamicText(additions[j], $extraWrapper);
                            }
                        }

                        var $newElem = $('#' + hashedAddKey, self.$dialog);
                        var parentHashedKey = $newElem.parents('.extraWrapper').data('parent');
                        var parentDynamicInput = affiliateRedemption.dynamicInputs[parentHashedKey];
                        var defaultInfo = M.affiliate.redeemAccDefaultInfo;

                        // This is may triggered by autofill
                        if ($('.auto-fill-checkbox input', self.$dialog).prop('checked') &&
                            $('.active', parentDynamicInput[1]).data('type') === defaultInfo[parentDynamicInput[2]]) {

                            if (additions[j].va) {
                                const selectedValue = defaultInfo[additions[j].key];
                                setDropdownValue(
                                    $newElem,
                                    ($dropdownInput) => {
                                        if (!$dropdownInput.length) {
                                            return;
                                        }
                                        return $(`[data-type="${selectedValue}"]`, $dropdownInput);
                                    }
                                );
                            }
                            else {
                                $newElem.val(defaultInfo[additions[j].key]);
                            }
                        }
                    }

                    $('.option', $extraWrapper)
                        .rebind('click.showSaveTooltip', self.__showSaveDataTip.bind(self));

                    affiliateRedemption.clearDynamicInputs();

                    // Lets remove temporary added data for afftrc.
                    affiliateRedemption.requests.second = {};

                    Ps.update($currentStep[0]);

                    $('input', $currentStep).off('focus.jsp');

                    loadingDialog.hide('rroc');
                }).catch(function(ex) {

                    if (d) {
                        console.error('Extra data pulling error, response:' + ex);
                    }

                    self.$dialog.removeClass('arrange-to-back');
                    msgDialog('warninga', l[7235], l[200] + ' ' + l[253]);
                });
            });

            onIdle(function() {
                $('.option.active', $select).trigger('click.showAdditionalInput');
            });
        }
    },

    renderDynamicAccInputs: function(accountType) {

        'use strict';

        var self = this;
        var $accountInfo = $('.affi-dynamic-acc-info', this.$dialog).empty();
        var $currentStep = $('.cells.step3', this.$dialog);
        var affr1Res = affiliateRedemption.req1res[0];
        var dynamicRequirements = affr1Res.data[accountType][2];

        // If this is not array something is wrong, and cannot proceed due to lack of information for the transaction
        if (!Array.isArray(dynamicRequirements)) {
            return false;
        }

        for (var i = 0; i < dynamicRequirements.length; i++) {

            var item = dynamicRequirements[i];

            // This is select input
            if (item.va) {
                self.__renderDynamicSelect(item, $accountInfo);
            }

            // This is text input
            else {
                self.__renderDynamicText(item, $accountInfo);
            }
        }

        // After rendering, make bind for any input on this stage will show save tooltip when condition met
        $('input[type="text"]', $currentStep).rebind('input.showSaveTooltip', this.__showSaveDataTip.bind(this));
        $('.option', $currentStep).rebind('click.showSaveTooltip', this.__showSaveDataTip.bind(this));
    },
};

/*
 * Redemption history section
 */
affiliateUI.redemptionHistory = {

    init: function() {

        'use strict';

        this.$block = $('.mega-data-box.redemption', affiliateUI.$body);
        this.$dropdown = $('.dropdown-input.affiliate-redemption', this.$block);

        // Initial table view for redemption history, no filter, default sort
        this.list = M.affiliate.redemptionHistory.r;
        this.sort = 'ts';
        this.sortd = 1;
        this.filter = 'all';

        this.drawTable();
        this.bindEvents();
    },

    bindEvents: function() {

        'use strict';

        var self = this;

        $('th.sortable', self.$block).rebind('click', function() {

            var $this = $(this);
            var $icon = $('i', $this);

            self.sort = $this.data('type');

            if ($icon.hasClass('desc')) {

                $('.mega-data-box th.sortable i', this.$block)
                    .removeClass('desc asc sprite-fm-mono icon-dropdown');

                $icon.addClass('sprite-fm-mono icon-dropdown asc');
                self.sortd = -1;
            }
            else {

                $('.mega-data-box th.sortable i', this.$block)
                    .removeClass('desc asc sprite-fm-mono icon-dropdown');

                $icon.addClass('sprite-fm-mono icon-dropdown desc');
                self.sortd = 1;
            }

            self.updateList();
            self.drawTable();
            self.bindEvents();
        });

        $(window).rebind('resize.affiliate', self.initRedeemResizeNScroll);

        // Init redeem detail View/Close link click
        $('.redeem-table .link', self.$block).rebind('click.redemptionItemExpand', function() {

            var $this = $(this);
            var $table = $this.closest('.redeem-scroll');
            var $detailBlock = $this.parents('.redeem-summary').next('.redeem-details');

            if ($this.hasClass('open')) {

                // This scroll animation is using CSS animation not jscrollpane animation because it is too heavy.
                var $scrollBlock = $this.parents('.redeem-scroll').addClass('animateScroll');
                $('.expanded', $table).removeClass('expanded');

                var rid = $this.data('rid');
                const state = $this.data('state');

                // After scrolling animation and loading is finihsed expand the item.
                M.affiliate.getRedemptionDetail(rid, state).then((res) => {

                    affiliateRedemption.fillBasicHistoryInfo($detailBlock, res, state);
                    affiliateRedemption.redemptionAccountDetails($detailBlock, res.gw, res);

                    $table.addClass('expanded-item');
                    $this.closest('tr').addClass('expanded');

                    self.initRedeemResizeNScroll();

                    $scrollBlock.scrollTop($this.parents('tr').position().top);

                    // Just waiting animation to be finihsed
                    setTimeout(function() {
                        $scrollBlock.removeClass('animateScroll');
                    }, 301);
                }).catch(function(ex) {

                    if (d) {
                        console.error('Getting redemption detail failed, rid: ' + rid, ex);
                    }

                    msgDialog('warninga', '', l[200] + ' ' + l[253]);
                });
            }
            else {
                $table.removeClass('expanded-item');
                $this.closest('tr').removeClass('expanded').prev().removeClass('expanded');
                self.initRedeemResizeNScroll();
            }
        });

        bindDropdownEvents(self.$dropdown, false, affiliateUI.$body);

        // Click event for item on filter dropdown
        $('.option', self.$dropdown).rebind('click.showList', function() {

            var $this = $(this);

            if (self.filter === $this.data('type')) {
                return false;
            }

            self.filter = $this.data('type');
            self.updateList();
            self.drawTable();
            self.bindEvents();
        });
    },

    updateList: function() {

        'use strict';

        var self = this;

        this.list = M.affiliate.getFilteredRedempHistory(this.filter);
        this.list.sort(function(a, b) {

            if (a[self.sort] > b[self.sort]) {
                return -1 * self.sortd;
            }
            else if (a[self.sort] < b[self.sort]) {
                return self.sortd;
            }

            // Fallback with timestamp
            if (a.ts > b.ts) {
                return -1 * self.sortd;
            }
            else if (a.ts < b.ts) {
                return self.sortd;
            }
            return 0;
        });
    },

    drawTable: function() {

        'use strict';

        var $noRedemptionBlock = $('.no-redemption', this.$block);
        var $itemBlock = $('.redeem-scroll', this.$block);
        var $table = $('.redeem-table.main', $itemBlock);
        var $itemSummaryTemplate = $('.redeem-summary.template', $table);
        var $itemDetailTemplate = $('.redeem-details.template', $table);

        $('tr:not(:first):not(.template)', $table).remove();

        if (this.list.length) {

            $noRedemptionBlock.addClass('hidden');
            $itemBlock.removeClass('hidden');

            var html = '';

            for (var i = 0; i < this.list.length; i++) {

                var item = this.list[i];
                let proSuccessful;
                if (item.gw === 0) {
                    if (item.hasOwnProperty('state')) {
                        proSuccessful = item.state === 4;
                    }
                    else {
                        proSuccessful = item.s === 4;
                    }
                }
                var itemStatus = affiliateRedemption.getRedemptionStatus(item.s, proSuccessful);
                var la = parseFloat(item.la);

                // Filling item data for the summary part
                var $itemSummary = $itemSummaryTemplate.clone().removeClass('hidden template')
                    .addClass(itemStatus.class);

                $('.receipt', $itemSummary).text(item.ridd || item.rid);
                $('.date', $itemSummary).text(time2date(item.ts, 1));
                $('.method', $itemSummary).text(affiliateRedemption.getMethodString(item.gw));
                if (item.c === 'XBT') {
                    $('.amount', $itemSummary).text('BTC ' + la.toFixed(8));
                }
                else {
                    $('.amount', $itemSummary).text(formatCurrency(la, item.c, 'code'));
                }
                $('.status span', $itemSummary).addClass(itemStatus.c).text(itemStatus.s);
                $('.link', $itemSummary).attr('data-rid', item.rid).attr('data-state', item.s);

                // Lets prefill details part to reduce looping
                var $itemDetail = $itemDetailTemplate.clone().removeClass('template');

                html += $itemSummary.prop('outerHTML') + $itemDetail.prop('outerHTML');
            }

            $('tbody', $table).safeAppend(html);

            this.initRedeemResizeNScroll();
        }
        else {
            $noRedemptionBlock.removeClass('hidden');
            $itemBlock.addClass('hidden');
        }
    },

    // Init redeem content scrolling and table header resizing
    initRedeemResizeNScroll: function() {

        'use strict';

        // If list is empty, do not need to abjust the view.
        if (!M.affiliate.redemptionHistory || M.affiliate.redemptionHistory.r.length === 0) {
            return false;
        }

        var $scrollElement = $('.redeem-scroll', this.$block);

        if ($scrollElement.hasClass('ps')) {
            Ps.update($scrollElement[0]);
        }
        else {
            Ps.initialize($scrollElement[0]);
        }

        var $header = $('.redeem-table.main th', this.$block);

        for (var i = 0; i < $header.length; i++) {
            var $clonedHeader = $('.redeem-table.clone th', this.$block);

            if ($clonedHeader.eq(i).length) {
                $clonedHeader.eq(i).outerWidth($header.eq(i).outerWidth());
            }
        }

        // Remove default focus scrolling from jsp
        $('a', $scrollElement).off('focus.jsp');
    },
};

/*
 * Registration index section
 */
affiliateUI.registrationIndex = {

    init: function() {

        'use strict';

        this.$registerChartBlock = $('.mega-data-box.registration', affiliateUI.$body);
        this.type = $('.fm-affiliate.chart-period.active', this.$registerChartBlock).data('type');

        this.bindEvents();
        this.calculateTotal();
        this.setChartTimeBlock();
        this.drawChart();
    },

    bindEvents: function() {

        'use strict';

        var self = this;
        var $buttons = $('.fm-affiliate.chart-period', this.$registerChartBlock);
        var $datesWrapper = $('.fm-affiliate.chart-dates', this.$registerChartBlock);

        $buttons.rebind('click.chooseChartPeriod', function() {

            $buttons.removeClass('active');
            this.classList.add('active');

            self.type = this.dataset.type;
            self.setChartTimeBlock();
            self.drawChart();
        });

        $datesWrapper.rebind('click.selectDateRange', function(e) {

            var classList = e.target.classList;

            if (classList.contains('prev-arrow') && !classList.contains('disabled')) {
                self.setChartTimeBlock(self.start - 1);
            }
            else if (classList.contains('next-arrow') && !classList.contains('disabled')) {
                self.setChartTimeBlock(self.end + 1);
            }
            else {
                return false;
            }

            self.drawChart();
        });
    },

    /**
     * Calculate Total registerations and incremented value over last month
     * @returns {Void} void function
     */
    calculateTotal: function() {

        'use strict';

        this.total = M.affiliate.signupList.length;

        $('.affiliate-total-reg', this.$registerChartBlock).text(this.total);

        var thisMonth = calculateCalendar('m');

        var thisMonthCount = 0;

        M.affiliate.signupList.forEach(function(item) {
            if (thisMonth.start <= item.ts && item.ts <= thisMonth.end) {
                thisMonthCount++;
            }
        });

        $('.charts-head .compare span', this.$registerChartBlock).text(thisMonthCount);
    },

    /**
     * Set period block(start and end times) to render chart, depends on time given, type of period.
     * @param {Number} unixTime unixtime stamp given.
     * @returns {Void} void function
     */
    setChartTimeBlock: function(unixTime) {

        'use strict';

        var $datesBlock = $('.fm-affiliate.chart-dates .dates', affiliateUI.$body);
        var calendar = calculateCalendar(this.type || 'w', unixTime);

        this.start = calendar.start;
        this.end = calendar.end;

        if (this.type === 'w') {
            var startDate = acc_time2date(this.start, true);
            var endDate = acc_time2date(this.end, true);

            $datesBlock.text(l[22899].replace('%d1' ,startDate).replace('%d2' ,endDate));
        }
        else if (this.type === 'm') {
            $datesBlock.text(time2date(this.start, 3));
        }
        else if (this.type === 'y') {
            $datesBlock.text(new Date(this.start * 1000).getFullYear());
        }

        var startlimit = 1577836800;
        var endlimit = Date.now() / 1000;
        var $prevBtn = $('.fm-affiliate.chart-dates .prev-arrow', affiliateUI.$body).removeClass('disabled');
        var $nextBtn = $('.fm-affiliate.chart-dates .next-arrow', affiliateUI.$body).removeClass('disabled');

        if (this.start < startlimit) {
            $prevBtn.addClass('disabled');
        }

        if (this.end > endlimit) {
            $nextBtn.addClass('disabled');
        }
    },

    /**
     * Set labels for the chart depends on type of period.
     * @returns {Array} lbl An array of labels
     */
    getLabels: function() {

        'use strict';

        var lbl = [];

        if (this.type === 'w') {
            for (var i = 0; i <= 6; i++) {
                lbl.push(time2date(this.start + i * 86400, 10).toUpperCase());
            }
        }
        else if (this.type === 'm') {
            var endDateOfMonth = new Date(this.end * 1000).getDate();

            for (var k = 1; k <= endDateOfMonth; k++) {
                lbl.push(k);
            }
        }
        else if (this.type === 'y') {

            var startDate = new Date(this.start * 1000);
            lbl.push(time2date(startDate.getTime() / 1000, 12).toUpperCase());

            for (var j = 0; j <= 10; j++) {
                startDate.setMonth(startDate.getMonth() + 1);
                lbl.push(time2date(startDate.getTime() / 1000, 12).toUpperCase());
            }
        }

        return lbl;
    },

    /**
     * Lets draw chart with settled options and data.
     * @returns {Void} void function
     */
    drawChart: function() {

        'use strict';

        var self = this;
        var labels = this.getLabels();
        var data = [];

        if (this.chart) {
            this.chart.destroy();
        }

        M.affiliate.signupList.forEach(function(item) {
            if (self.start <= item.ts && item.ts <= self.end) {
                var val;
                switch (self.type) {
                    case 'w':
                        val = time2date(item.ts, 10).toUpperCase();
                        break;
                    case 'm':
                        val = new Date(item.ts * 1000).getDate();
                        break;
                    case 'y':
                        val = time2date(item.ts, 12).toUpperCase();
                        break;
                }

                var index = labels.indexOf(val);

                data[index] = data[index] + 1 || 1;
            }
        });

        var $chartWrapper = $('.mega-data-box.registration', affiliateUI.$body);
        var $ctx = $('#register-chart', $chartWrapper);
        var chartColor1 = $ctx.css('--label-blue');
        var chartColor2 = $ctx.css('--label-blue-hover');
        var dividerColor = $ctx.css('--surface-grey-2');
        var textColor = $ctx.css('--text-color-low');
        var ticksLimit = 6;

        $ctx.outerHeight(186);

        //  TODO: set ticksLimit=4 for all months after library update
        if (this.type === 'm') {
            var daysInMonth = new Date(this.end * 1000).getDate();

            ticksLimit = daysInMonth === 28 ? 5 : 4;
        }

        this.chart = new Chart($ctx[0], {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: chartColor1,
                    hoverBackgroundColor: chartColor2,
                    borderWidth: 1,
                    borderColor: chartColor1.replace(/^\s/ , '')
                }]
            },
            options: {
                barRoundness: 1,
                maintainAspectRatio: false,
                legend: {
                    display: false
                },
                responsive: true,
                scales: {
                    xAxes: [{
                        display: true,
                        maxBarThickness: 8,
                        gridLines : {
                            display : false
                        },
                        ticks: {
                            fontColor: textColor,
                            fontSize: 12,
                            autoSkip: true,
                            maxTicksLimit: ticksLimit,
                            maxRotation: 0
                        }
                    }],
                    yAxes: [{
                        display: true,
                        ticks: {
                            fontColor: textColor,
                            fontSize: 12,
                            beginAtZero: true,
                            precision: 0,
                            suggestedMax: 4
                        },
                        gridLines: {
                            color: dividerColor,
                            zeroLineColor: dividerColor,
                            drawBorder: false,
                        }
                    }]
                },
                tooltips: {
                    displayColors: false,
                    callbacks: {
                        title: function(tooltipItem) {
                            if (self.type === 'm') {
                                var ttDate = new Date(self.start * 1000);
                                ttDate.setDate(tooltipItem[0].xLabel | 0);
                                return acc_time2date(ttDate.getTime() / 1000, true);
                            }
                            return tooltipItem[0].xLabel;
                        }
                    }
                }
            }
        });
    }
};

/**
 * Purchase index
 */
affiliateUI.purchaseIndex = {

    init: function() {

        'use strict';

        this.$purchaseChartBlock = $('.mega-data-box.purchase', affiliateUI.$body);

        this.count();
    },

    getPlans: function(updatePurchaseIndex) {

        'use strict';

        // Set r: 1 so that pro-lite will also be shown
        const payload = {a: 'utqa', nf: 2, p: 1, r: 1};
        api_req(payload, {
            callback: function(results) {

                const plans = [];

                for (var i = 1; i < results.length; i++) {
                    plans.push([
                        results[i].id,
                        results[i].al,
                    ]);
                }
                updatePurchaseIndex(plans);
            }
        });
    },

    /**
     * Count type of purchase made
     * @returns {Void} void function
     */
    count: function() {

        'use strict';

        var self = this;
        var creditList = M.affiliate.creditList.active.concat(M.affiliate.creditList.pending);
        var thisMonth = calculateCalendar('m');
        var proPlanIDMap = {};

        this.totalCount = creditList.length;
        this.monthCount = 0;
        this.countedData = {};

        const updatePurchaseIndex = (plans) => {

            plans.forEach((item) => {
                proPlanIDMap[item[0]] = item[1];
            });

            creditList.forEach((item) => {
                if (thisMonth.start <= item.gts && item.gts <= thisMonth.end) {
                    self.monthCount++;
                }

                const index = proPlanIDMap[item.si];
                if (item.b && index !== 101) {
                    self.countedData.b = ++self.countedData.b || 1;
                }
                else {
                    self.countedData[index] = ++self.countedData[index] || 1;
                }
            });

            $('.affiliate-total-pur', this.$purchaseChartBlock).text(this.totalCount);
            $('.charts-head .compare span', this.$purchaseChartBlock).text(this.monthCount);

            $('.list-item.prol .label', this.$purchaseChartBlock)
                .text(formatPercentage(this.countedData[4] / this.totalCount || 0));
            $('.list-item.prol .num', this.$purchaseChartBlock).text(this.countedData[4] || 0);
            $('.list-item.pro1 .label', this.$purchaseChartBlock)
                .text(formatPercentage(this.countedData[1] / this.totalCount || 0));
            $('.list-item.pro1 .num', this.$purchaseChartBlock).text(this.countedData[1] || 0);
            $('.list-item.pro2 .label', this.$purchaseChartBlock)
                .text(formatPercentage(this.countedData[2] / this.totalCount || 0));
            $('.list-item.pro2 .num', this.$purchaseChartBlock).text(this.countedData[2] || 0);
            $('.list-item.pro3 .label', this.$purchaseChartBlock)
                .text(formatPercentage(this.countedData[3] / this.totalCount || 0));
            $('.list-item.pro3 .num', this.$purchaseChartBlock).text(this.countedData[3] || 0);
            $('.list-item.pro101 .label', this.$purchaseChartBlock)
                .text(formatPercentage(this.countedData[101] / this.totalCount || 0));
            $('.list-item.pro101 .num', this.$purchaseChartBlock).text(this.countedData[101] || 0);
            $('.list-item.business .label', this.$purchaseChartBlock)
                .text(formatPercentage(this.countedData.b / this.totalCount || 0));
            $('.list-item.business .num', this.$purchaseChartBlock).text(this.countedData.b || 0);

            affiliateUI.purchaseIndex.drawChart();
        };

        // Needs to use a version of the membership plans that includes the pro-lite plan
        affiliateUI.purchaseIndex.getPlans(updatePurchaseIndex);
    },

    /**
     * Let draw chart with given data.
     * @returns {Void} void function
     */
    drawChart: function() {

        'use strict';

        if (this.chart) {
            this.chart.destroy();
        }

        var $chartWrapper = $('.mega-data-box.purchase', affiliateUI.$body);
        var $ctx = $('#purchase-chart', $chartWrapper);

        this.chart = new Chart($ctx[0], {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [
                        this.countedData[4],
                        this.countedData[1],
                        this.countedData[2],
                        this.countedData[3],
                        this.countedData[101],
                        this.countedData.b,
                        $.isEmptyObject(this.countedData) ? 1  : 0
                    ],
                    backgroundColor: [
                        $ctx.css('--label-yellow'),
                        $ctx.css('--label-orange'),
                        $ctx.css('--label-red'),
                        $ctx.css('--label-purple'),
                        $ctx.css('--label-blue'),
                        $ctx.css('--label-green'),
                        $ctx.css('--surface-grey-2')
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                events: [],
                legend: {
                    display: false
                },
                cutoutPercentage: 74
            }
        });
    },
};

/**
 * Geographic distribution
 */
affiliateUI.geographicDistribution = {

    init: function() {

        'use strict';

        this.$geoDistBlock = $('.distribution', affiliateUI.$body);
        this.bindEvents();
        this.count();
        this.drawTable();
    },

    bindEvents: function() {

        'use strict';

        var self = this;

        $('.distribution-head .tab-button', this.$geoDistBlock).rebind('click.geoDist', function() {

            var $this = $(this);

            $('.tab-button', self.$geoDistBlock).removeClass('active');
            $('.chart-body', self.$geoDistBlock).addClass('hidden');

            $this.addClass('active');
            $('.chart-body.' + $(this).data('table'), self.$geoDistBlock).removeClass('hidden');
        });
    },

    /**
     * Count how many registration/puchases are made on each country
     * @returns {Void} void function
     */
    count: function() {

        'use strict';

        var self = this;
        this.signupGeo = {};

        M.affiliate.signupList.forEach(function(item) {
            self.signupGeo[item.cc] = ++self.signupGeo[item.cc] || 1;
        });

        this.creditGeo = {};

        var creditList = M.affiliate.creditList.active.concat(M.affiliate.creditList.pending);

        creditList.forEach(function(item) {
            self.creditGeo[item.cc] = ++self.creditGeo[item.cc] || 1;
        });
    },

    /**
     * Let's draw table with give data
     * @returns {Void} void function
     */
    drawTable: function() {

        'use strict';

        var self = this;

        var template =
            '<div class="fm-affiliate list-item">' +
                '<div class="img-wrap"><img src="$countryImg" alt=""></div>' +
                '<span class="name">$countryName</span><span class="num">$count</span>' +
            '</div>';

        var _sortFunc = function(a, b) {
            return self.signupGeo[b] - self.signupGeo[a];
        };
        var orderedSignupGeoKeys = Object.keys(this.signupGeo).sort(_sortFunc);
        var orderedCreditGeoKeys = Object.keys(this.creditGeo).sort(_sortFunc);
        var html = '';
        var countList = this.signupGeo;

        var _htmlFunc = function(item) {
            var country = countrydetails(item);
            html += template.replace('$countryImg', staticpath + 'images/flags/' + country.icon)
                .replace('$countryName', country.name || 'Unknown').replace('$count', countList[item]);
        };

        orderedSignupGeoKeys.forEach(_htmlFunc);

        if (html) {
            $('.geo-dist-reg .list', this.$geoDistBlock).safeHTML(html);
        }
        else {
            $('.geo-dist-reg .list', this.$geoDistBlock).empty();
        }

        html = '';
        countList = this.creditGeo;

        orderedCreditGeoKeys.forEach(_htmlFunc);

        if (html) {
            $('.geo-dist-pur .list', this.$geoDistBlock).safeHTML(html);
        }
        else {
            $('.geo-dist-pur .list', this.$geoDistBlock).empty();
        }
    }
};

/*
 * Dashboard End
 */
