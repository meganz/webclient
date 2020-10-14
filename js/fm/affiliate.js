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

        $('.fm-affiliate.guide-dialog', affiliateUI.$body).rebind('click.guide-dialog', function() {
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

        this.$dialog = $('.fm-dialog.affiliate-guide');
        this.$firstStepBlock = $('.affiliate-guide.step1', this.$dialog);
        this.$secondStepBlock = $('.affiliate-guide.step2', this.$dialog);
        this.slidesLength = $('.content', this.$secondStepBlock).length;

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
        $('.default-green-button.how-it-works', this.$dialog).rebind('click.guide-dialog-hiw-btn', function() {
            self.$firstStepBlock.removeClass('active');
            self.$secondStepBlock.addClass('active');

            // We should reposition Step2 dialog
            self.$dialog.css('margin-top', '-' + self.$dialog.outerHeight() / 2 + 'px');
        });

        // Step 2. Back/Next buttons
        $('.affiliate-guide.bottom-button', this.$dialog).rebind('click.btns', function() {
            var currentSlide = $('.nav-button.active', self.$dialog).data('slide');

            if ($(this).hasClass('next') && currentSlide + 1 <= self.slidesLength) {
                self.showAffiliateSlide(currentSlide + 1);
            }
            else if ($(this).hasClass('back') && currentSlide - 1 >=  0) {
                self.showAffiliateSlide(currentSlide - 1);
            }
        });

        $('.default-green-button.dashboard', this.$secondStepBlock).rebind('click.to-aff-page', function() {
            loadSubPage('fm/refer');
        });

        // Step 2.Top nav buttons
        $('.affiliate-guide.nav-button', this.$dialog).rebind('click.top-nav', function() {
            self.showAffiliateSlide($(this).attr('data-slide'));
        });

        // Closing dialog related
        $('.fm-dialog-close', this.$dialog).rebind('click.close-dialog', function() {
            closeDialog();
            affiliateUI.animateIcon();
            $('.fm-dialog-overlay').off('click.affGuideDialog');
        });

        $('.fm-dialog-overlay').rebind('click.affGuideDialog', function() {
            affiliateUI.animateIcon();
            $('.fm-dialog-overlay').off('click.affGuideDialog');
        });
    },

    // Step 2. Show Slides.
    showAffiliateSlide: function(num) {

        'use strict';

        num = num | 0 || 1;

        $('.content.active', this.$secondStepBlock).removeClass('active');
        $('.content.slide' + num, this.$secondStepBlock).addClass('active');

        // Show/hide Back button
        if (num === 1) {
            $('.bottom-button.back', this.$secondStepBlock).addClass('hidden');
        }
        else {
            $('.bottom-button.back', this.$secondStepBlock).removeClass('hidden');
        }

        // Slide 3 requires scrollpane
        if (num === 3) {
            $('.affiliate-guide.content.slide3', this.$secondStepBlock)
                .jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5, animateScroll: true});
        }

        // Show/hide Affiliate Dashboard button/Next button
        if (num === this.slidesLength) {
            $('.bottom-button.next', this.$secondStepBlock).addClass('hidden');

            if (page === 'fm/refer') {
                $('.default-green-button.dashboard', this.$secondStepBlock).addClass('hidden');
            }
            else {
                $('.default-green-button.dashboard', this.$secondStepBlock).removeClass('hidden');
            }
        }
        else {
            $('.default-green-button', this.$secondStepBlock).addClass('hidden');
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
        this.$dialog = $('.fm-dialog.generate-url');

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
                var links = $.trim($urlBlock.text());
                var toastTxt = l[7654];
                copyToClipboard(links, toastTxt);
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

            // Center dialogs
            if (!is_mobile) {
                self.$dialog.css({
                    'margin-left': -1 * (self.$dialog.outerWidth() / 2),
                    'margin-top': -1 * (self.$dialog.outerHeight() / 2)
                });
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

        $('.fm-dialog-close', this.$dialog).rebind('click.close-dialog', function() {
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
        var baseUrl = getBaseUrl();
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

        $('.custom-block', this.$dialog).removeClass('error');

        if (clear) {
            $urlBlock.empty();
            return Promise.resolve();
        }

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
            var urlWithoutAfftag = getBaseUrl() + (targetPage === '' ? '' : '/' + targetPage);
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
            this.$dialog = $('.fm-dialog.joined-to-affiliate');

            var _showRegisteredDialog = function() {
                self.bindDialogEvents();
                M.safeShowDialog('joined-to-affiliate', self.$dialog);
            };

            if (M.currentdirid === 'refer') {
                $('.default-green-button span', this.$dialog).text(l[81]);
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

        $('.default-green-button', this.$dialog).rebind('click.to-aff-page', function() {
            closeDialog();
            affiliateUI.guideDialog.show();
        });

        $('.fm-dialog-close, .cancel-button', this.$dialog).rebind('click.close-dialog', function() {
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

    // Make sure init scrolling for the dashboard
    initAffiliateScroll();
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
            affiliateUI.$body.data('jsp').scrollTo(0, 0, 1);
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

        if (u_attr.b) {
            $('.no-buisness', this.$block).addClass('hidden');
        }

        // Redeem requires at least one payment history and available balance more than 50 euro
        if (M.affiliate.redeemable && balance.available >= 50 && M.affiliate.utpCount) {
            $('.redeem.default-green-button', this.$block).removeClass('disabled');
        }
        else {
            $('.redeem.default-green-button', this.$block).addClass('disabled');
        }
    },

    bindEvents: function() {

        'use strict';

        $('.redeem.default-green-button' ,this.$block).rebind('click.openRedemptionDialog', function() {

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
        this.$dialog = $('.fm-dialog.affiliate-redeem');

        // Reset dialog and info
        this.reset();

        M.affiliate.getRedemptionMethods().then(function() {

            self.displaySteps();
            $('.available-comission span', self.$dialog).text(formatCurrency(balance.available));

            self.bindDialogEvents();

            M.safeShowDialog('affiliate-redeem-dialog', self.$dialog);

        }).catch(function(ex) {

            if (d) {
                console.error('Requesting redeem method list failed: ', ex);
            }

            msgDialog('warninga', '', l[200] + ' ' + l[253]);
        });
    },

    showSumitted: function() {

        'use strict';

        var $dialog = $('.fm-dialog.affiliate-request');
        var message = affiliateRedemption.requests.first.m === 2 ? l[23364] : l[23365];

        $('.status-message', $dialog).text(message);

        var __closeSubmitted = function() {

            closeDialog();
            $('.fm-dialog-overlay').off('click.redemptionSubmittedClose');

            // After closing the dialog, refresh balance and history
            Promise.all([M.affiliate.getBalance(), M.affiliate.getRedemptionHistory()]).then(function() {

                affiliateUI.commissionIndex.init();
                affiliateUI.redemptionHistory.updateList();
                affiliateUI.redemptionHistory.drawTable();
                affiliateUI.redemptionHistory.bindEvents();
            }).catch(function(ex) {

                if (d) {
                    console.error('Update redmeption page failed: ', ex);
                }

                msgDialog('warninga', '', l[200] + ' ' + l[253]);
            });
        };

        $('.button', $dialog).rebind('click', __closeSubmitted);
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

        affiliateRedemption.reset();
    },

    repositionDialog: function() {

        'use strict';

        this.$dialog.css({
            'margin-left': -1 * (this.$dialog.outerWidth() / 2),
            'margin-top': -1 * (this.$dialog.outerHeight() / 2)
        });
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

                    self.showSumitted();
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
            });
        });

        $('.prev-btn', this.$dialog).rebind('click', function() {

            affiliateRedemption.currentStep--;
            self.displaySteps();

            // For Bitcoin payment skip step 3
            if (affiliateRedemption.currentStep === 3 && affiliateRedemption.requests.first.m === 2) {

                affiliateRedemption.currentStep--;
                self.displaySteps();
            }

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
            }
        });

        $('.fm-dialog-close', this.$dialog).rebind('click', this.hide.bind(this, false));
        $('.fm-dialog-overlay').rebind('click.redemptionClose', this.hide.bind(this, false));

        // Step 1
        var $step1 = $('.cells.step1', this.$dialog);
        var $amount = $('#affiliate-redemption-amount', $step1);

        $amount.rebind('input', function() {

            var activeMethodMin = M.affiliate.redeemGateways[$('.payment-type .radioOn input', $step1).val()].min || 50;

            $(this).data('MegaInputs').hideError();

            if (this.value >= activeMethodMin && this.value <= balance.available) {
                $nextbtn.removeClass('disabled');
            }
            else {
                $nextbtn.addClass('disabled');
            }
        });

        $amount.rebind('blur', function() {

            var $this = $(this);
            var activeMethodMin = M.affiliate.redeemGateways[$('.payment-type .radioOn input', $step1).val()].min || 50;

            if (this.value === '') {
                $('.info.price.requested .local', this.$dialog).text('------');
            }
            else if (this.value < activeMethodMin) {
                $this.data('MegaInputs').showError(l[23319].replace('%1', formatCurrency(activeMethodMin)));
            }
            else if (this.value > balance.available) {
                $this.data('MegaInputs').showError(l[23320]);
            }
            else {
                $('.info.price.requested .local', this.$dialog).text(formatCurrency(this.value));
                this.value = parseFloat(this.value).toFixed(2);
            }
        });

        $('.redeem-all-btn', $step1).rebind('click.redeemAll', function() {
            $amount.val(balance.available).trigger('input').trigger('blur');
        });

        $('.payment-type input', $step1).rebind('change.selectMethodType', function() {

            $('.radioOn', $step1).removeClass('radioOn').addClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
            $amount.trigger('input').trigger('blur');
        });

        // Step 2
        var $step2 = $('.cells.step2', this.$dialog);

        $('.withdraw-txt a', $step2).rebind('click.changeMethod', function() {

            affiliateRedemption.currentStep--;
            self.displaySteps();

            return false;
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
                    $('.default-dropdown-item.active', $type).removeClass('active');
                    $('.affi-dynamic-acc-info', $step3).empty();

                    return;
                }

                savedValue = M.affiliate.redeemAccDefaultInfo.type;
                $activeOption = $('.default-dropdown-item.' + savedValue, $type);
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

                if ($target.is('.megaInputs.titleTop')) {
                    $target.data('MegaInputs').setValue(savedValue, true);
                }
                else if ($target.hasClass('default-select')) {

                    $activeOption = empty ? $('.default-dropdown-item:first', $target) :
                        $('.default-dropdown-item[data-type="' + savedValue + '"]', $target);

                    $target.trigger('click');
                    $activeOption.trigger('click');
                }
            }
        };

        uiCheckboxes($autofillCheckbox, function(value) {

            __fillupForm(!value);
            $saveDataTip.addClass('hidden');
            $step3.jScrollPane({
                enableKeyboardNavigation: false,
                showArrows: true,
                arrowSize: 5,
                animateScroll: true
            });
            $('input', $step3).off('focus.jsp');
            self.repositionDialog();
        });

        uiCheckboxes($('.save-data-checkbox', $step3));

        $saveDataTip.rebind('click.updateAccData', function(e) {

            var $target = $(e.target);
            var __hideSaveDataTip = function() {

                $saveDataTip.addClass('hidden');
                $step3.jScrollPane({
                    enableKeyboardNavigation: false,
                    showArrows: true,
                    arrowSize: 5,
                    animateScroll: true
                });
                $('input', $step3).off('focus.jsp');
                self.repositionDialog();
            };

            if ($target.hasClass('accept') && affiliateRedemption.validateDynamicAccInputs()) {

                affiliateRedemption.updateAccInfo();
                __hideSaveDataTip();
            }
            else if ($target.hasClass('cancel')) {
                __hideSaveDataTip();
            }
        });
    },

    displaySteps: function() {

        'use strict';

        // Show and hide contents
        $('.cells.left', this.$dialog).addClass('hidden');
        var $prevBtn = $('.prev-btn', this.$dialog);
        var $nextBtn = $('.next-btn', this.$dialog);
        var buttonText = {1: l[7348], 2: l[427], 3: l[23367], 4: l[23368]};
        var $currentStep = $('.cells.step' + affiliateRedemption.currentStep, this.$dialog);

        affiliateRedemption.$step = $currentStep.removeClass('hidden');

        // Show and hide prev button
        if (affiliateRedemption.currentStep > 1) {
            $prevBtn.removeClass('hidden');
        }
        else {
            $prevBtn.addClass('hidden');
        }

        // Timer relates
        if (affiliateRedemption.currentStep > 2) {
            affiliateRedemption.startTimer();
        }
        else {
            affiliateRedemption.stopTimer();
        }

        this['displayStep' + affiliateRedemption.currentStep]();
        $('span', $nextBtn).text(buttonText[affiliateRedemption.currentStep]);

        if ($currentStep.is('.scrollable')) {
            $currentStep.jScrollPane({
                enableKeyboardNavigation: false,
                showArrows: true,
                arrowSize: 5,
                animateScroll: true
            });
            $('input', $currentStep).off('focus.jsp');
        }

        this.repositionDialog();
    },

    displayStep1: function() {

        'use strict';

        var $amountInput = $('#affiliate-redemption-amount', this.$dialog);
        var amountValue = $amountInput.val();

        // Summary table update
        $('.requested.price .euro', this.$dialog).addClass('hidden').text('------');
        $('.requested.price .local', this.$dialog).text(amountValue ? formatCurrency(amountValue) : '------');
        $('.fee.price .euro', this.$dialog).addClass('hidden').text('------');
        $('.fee.price .local', this.$dialog).text('------');
        $('.received.price .euro', this.$dialog).addClass('hidden').text('------');
        $('.received.price .local', this.$dialog).text('------');
        $('.local-info', this.$dialog).addClass('hidden');

        var megaInput = new mega.ui.MegaInputs($amountInput, {
            onShowError: function(msg) {
                $('.amount-message-container', this.$dialog).removeClass('hidden');
                $('.amount-message-container', this.$dialog).text(msg);
            },
            onHideError: function() {
                $('.amount-message-container', this.$dialog).addClass('hidden');
            }
        });
        megaInput.hideError();

        // Show the method option if api returns gateway data
        for (var type in M.affiliate.redeemGateways) {

            if (M.affiliate.redeemGateways.hasOwnProperty(type)) {

                $('#affiliate-payment-type' + type, this.$dialog)
                    .parents('.payment-type-wrapper').removeClass('hidden');
            }
        }
    },

    displayStep2: function() {

        'use strict';

        var $currentStep = $('.cells.step2', this.$dialog);
        var selectItemTemplate = '<div class="default-dropdown-item %3" data-type="%1">%2</div>';

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
        $('.local-info', this.$dialog).addClass('hidden');

        // Country and currency
        var selectedGWData = M.affiliate.redeemGateways[affiliateRedemption.requests.first.m];
        var seletedGWDefaultData = selectedGWData.data.d || [];
        var activeCountry = affiliateRedemption.requests.first.cc || seletedGWDefaultData[0] ||
            selectedGWData.data.cc[0];
        var activeCurrency = affiliateRedemption.requests.first.c || seletedGWDefaultData[1] ||
            selectedGWData.data.$[0];

        var __renderDropdown = function(type, list, activeItem) {

            var $dropdown = $('#affi-' + type, $currentStep);
            var contentHtml = '';

            $('.default-select-dropdown', $currentStep).addClass('hidden');

            for (var i = 0; i < list.length; i++) {

                var item = escapeHTML(list[i]);
                var displayName = type === 'country' ? M.getCountryName(item) : item;

                contentHtml += selectItemTemplate.replace('%1', item).replace('%2', displayName)
                    .replace('%3', item === activeItem ? 'active' : '');
            }

            // Avoiding jsp reinitializing bug, destroy jsp manually
            var jsp = $('.default-select-scroll', $dropdown).data('jsp');

            if (jsp) {
                jsp.destroy();
            }

            $('.default-select-scroll', $dropdown).safeHTML(contentHtml);

            bindDropdownEvents($('#affi-' + type, $currentStep));

            $('#affi-' + type + ' > span', $currentStep)
                .text(type === 'country' ? M.getCountryName(activeItem) : activeItem);
        };

        __renderDropdown('country', selectedGWData.data.cc, activeCountry);
        __renderDropdown('currency', selectedGWData.data.$, activeCurrency);

        // If this is bitcoin redemption
        if (affiliateRedemption.requests.first.m === 2) {

            var megaInput = new mega.ui.MegaInputs($('#affi-bitcoin-address', $currentStep));

            megaInput.hideError();

            $('.affi-withdraw-currency, .currency-tip', $currentStep).addClass('hidden');
            $('.bitcoin-data', $currentStep).removeClass('hidden');
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
        var selectItemTemplate = '<div class="default-dropdown-item @@" data-type="@@">@@</div>';
        var ccc = affiliateRedemption.requests.first.cc + affiliateRedemption.requests.first.c;
        var req1 = affiliateRedemption.requests.first;
        var req1res = affiliateRedemption.req1res[0];

        $('.local-info', this.$dialog).addClass('hidden');

        // Summary table update
        if (req1.c !== 'EUR') {
            $('.requested.price .euro', this.$dialog).removeClass('hidden')
                .text(formatCurrency(req1.p));
            $('.fee.price .euro', this.$dialog).removeClass('hidden')
                .text(formatCurrency(req1res.f));
            $('.received.price .euro', this.$dialog).removeClass('hidden')
                .text(formatCurrency(affiliateRedemption.requests.first.p - req1res.f));
            $('.local-info', this.$dialog).removeClass('hidden');
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
            accNameMegaInput.$input.val('');
            $accountType.empty();
        }
        else if (!affiliateRedemption.requests.second.extra.an) {
            accNameMegaInput.$input.val('');
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
                $('.dialog-input.default-select', $accountSelector).attr('id', 'account-type');
                $('span', $accountSelector).text(l[23366]);

                var html = '';
                var safeArgs = [];

                for (var i = 0; i < accTypes.length; i++) {
                    html += selectItemTemplate;
                    safeArgs.push(accTypes[i][0], i, accTypes[i][1]);
                }

                safeArgs.unshift(html);

                var $optionWrapper = $('.default-select-scroll', $accountSelector);

                $optionWrapper.safeHTML.apply($optionWrapper, safeArgs);

                $accountType.safeAppend($accountSelector.prop('outerHTML'));

                bindDropdownEvents($('#account-type', $accountType));

                $('#account-type .default-dropdown-item' , $accountType).rebind('click.accountTypeSelect', function() {

                    $accountType.parent().removeClass('error');

                    // Type changed reset dynamic inputs
                    affiliateRedemption.dynamicInputs = {};
                    self.renderDynamicAccInputs($(this).data('type'));

                    if (!M.affiliate.redeemAccDefaultInfo || M.affiliate.redeemAccDefaultInfo.ccc !== ccc) {
                        $saveCheckbox.removeClass('hidden');
                    }

                    $currentStep.jScrollPane({
                        enableKeyboardNavigation: false,
                        showArrows: true,
                        arrowSize: 5,
                        animateScroll: true
                    });
                    $('input', $currentStep).off('focus.jsp');

                    self.repositionDialog();
                });
            }
            else {
                this.renderDynamicAccInputs(0);
            }
        }
    },

    displayStep4: function() {

        'use strict';

        var $currentStep = $('.cells.step4', this.$dialog);
        var firstRequest = affiliateRedemption.requests.first;

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
            $step3.jScrollPane({
                enableKeyboardNavigation: false,
                showArrows: true,
                arrowSize: 5,
                animateScroll: true
            });
            $('input', $step3).off('focus.jsp');

            this.repositionDialog();
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
        var selectItemTemplate = '<div class="default-dropdown-item %c" data-type="@@">@@</div>';
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
        $('.dialog-input.default-select', $select).attr({id: hashedKey, title: escapeHTML(selectItem.name)});

        var selectHtml = '';
        var safeArgs = [];
        var hasActive = false;

        for (var j = 0; j < selectItem.va.length; j++) {

            var option = selectItem.va[j];
            var selectItemHtml = selectItemTemplate;

            safeArgs.push(option.key, option.name);

            if ((!defaultCountry && j === 0) || (defaultCountry && defaultCountry === option.key)) {
                selectItemHtml = selectItemHtml.replace('%c', 'active');
                $('span', $select).text(option.name);
                hasActive = true;
            }
            else {
                selectItemHtml = selectItemHtml.replace('%c', '');
            }

            selectHtml += selectItemHtml;
        }

        safeArgs.unshift(selectHtml);

        var $optionWrapper = $('.default-select-scroll', $select);

        $optionWrapper.safeHTML.apply($optionWrapper, safeArgs);

        // If non of option is active with above looping, select first one
        if (!hasActive) {
            $('.default-dropdown-item', $optionWrapper).first().addClass('active');
        }

        $wrapper.safeAppend($select.prop('outerHTML'));

        $select = $('#' + hashedKey, $wrapper);
        bindDropdownEvents($select, 0, '.step3 .cell-content');
        affiliateRedemption.dynamicInputs[hashedKey] = ['s', $select, selectItem.key];

        $('.default-select-dropdown', $select).rebind('click.removeError', function(e) {

            if ($(e.target).data('type') !== '') {
                $(this).parents('.underline-dropdown-input').removeClass('error');
            }
        });

        // There is extra data requires for this. Lets pull it again
        if (selectItem.rroc) {

            $wrapper.safeAppend('<div class="extraWrapper" data-parent="@@"></div>', hashedKey);

            $('.default-dropdown-item', $select).rebind('click.showAdditionalInput', function() {

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
                                $('[data-type="' + defaultInfo[additions[j].key] + '"]', $newElem)
                                    .trigger('click.settingsGeneral');
                            }
                            else {
                                $newElem.val(defaultInfo[additions[j].key]);
                            }
                        }
                    }

                    $('.default-dropdown-item', $extraWrapper)
                        .rebind('click.showSaveTooltip', self.__showSaveDataTip.bind(self));

                    affiliateRedemption.clearDynamicInputs();

                    // Lets remove temporary added data for afftrc.
                    affiliateRedemption.requests.second = {};

                    $currentStep.jScrollPane({
                        enableKeyboardNavigation: false,
                        showArrows: true,
                        arrowSize: 5,
                        animateScroll: true
                    });

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
                $('.default-dropdown-item.active', $select).trigger('click.showAdditionalInput');
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

        this.repositionDialog();

        // After rendering, make bind for any input on this stage will show save tooltip when condition met
        $('input[type="text"]', $currentStep).rebind('input.showSaveTooltip', this.__showSaveDataTip.bind(this));
        $('.default-dropdown-item', $currentStep).rebind('click.showSaveTooltip', this.__showSaveDataTip.bind(this));
    },
};

/*
 * Redemption history section
 */
affiliateUI.redemptionHistory = {

    init: function() {

        'use strict';

        this.$block = $('.mega-data-box.redemption', affiliateUI.$body);
        this.$dropdownBlock = $('.dropdown-wrap.redemption', affiliateUI.$body);

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

        $('th.sortable', this.$block).rebind('click', function() {

            var $this = $(this);

            self.sort = $this.data('type');

            if ($this.hasClass('asc')) {

                $this.removeClass('asc').addClass('desc');
                self.sortd = -1;
            }
            else {
                $('.mega-data-box th.sortable').removeClass('asc desc');
                $this.addClass('asc');
                self.sortd = 1;
            }

            self.updateList();
            self.drawTable();
            self.bindEvents();
        });

        $(window).rebind('resize.affiliate', self.initRedeemResizeNScroll);

        // Init redeem detail View/Close link click
        $('.fm-affiliate.redeem-table .link', this.$block).rebind('click.redemptionItemExpand', function() {

            var $this = $(this);
            var $table = $this.closest('.redeem-scroll');
            var $detailBlock = $this.parents('.redeem-summary').next('.redeem-details');

            if ($this.hasClass('open')) {

                // This scroll animation is using CSS animation not jscrollpane animation because it is too heavy.
                var $scrollBlock = $this.parents('.fm-affiliate.redeem-scroll').addClass('animateScroll');
                $('.expanded', $table).removeClass('expanded');

                var rid = $this.data('rid');

                // After scrolling animation and loading is finihsed expand the item.
                M.affiliate.getRedemptionDetail(rid).then(function(res) {

                    affiliateRedemption.fillBasicHistoryInfo($detailBlock, res);
                    affiliateRedemption.redemptionAccountDetails($detailBlock, res.gw, res);

                    $table.addClass('expanded-item');
                    $this.closest('tr').addClass('expanded');

                    self.initRedeemResizeNScroll();

                    $scrollBlock.data('jsp').scrollToElement($this.parent(), true, false);

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

        bindDropdownEvents($('.default-select.affiliate-redemption', this.$dropdownBlock));

        // Click event for item on filter dropdown
        $('.default-dropdown-item', this.$dropdownBlock).rebind('click.showList', function() {

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
                var itemStatus = affiliateRedemption.getRedemptionStatus(item.s);
                var la = parseFloat(item.la);

                // Filling item data for the summary part
                var $itemSummary = $itemSummaryTemplate.clone().removeClass('hidden template')
                    .addClass(itemStatus.class);

                $('.receipt', $itemSummary).text(item.ridd);
                $('.date', $itemSummary).text(time2date(item.ts, 1));
                $('.method', $itemSummary).text(affiliateRedemption.getMethodString(item.gw));
                if (item.c === 'XBT') {
                    $('.amount', $itemSummary).text('BTC ' + la.toFixed(8));
                }
                else {
                    $('.amount', $itemSummary).text(formatCurrency(la, item.c, 'code'));
                }
                $('.status span', $itemSummary).addClass(itemStatus.c).text(itemStatus.s);
                $('.link', $itemSummary).attr('data-rid', item.rid);

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

        var $scrollElement = $('.fm-affiliate.redeem-scroll').jScrollPane({
            enableKeyboardNavigation: false,
            showArrows: true,
            arrowSize: 5,
            animateScroll: true
        });

        var $header = $('.fm-affiliate.redeem-table.main th');

        for (var i = 0; i < $header.length; i++) {
            var $clonedHeader = $('.fm-affiliate.redeem-table.clone th');

            if ($clonedHeader.eq(i).length) {
                $clonedHeader.eq(i).outerWidth($header.eq(i).outerWidth());
            }
        }

        initAffiliateScroll();

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

        $('.charts-head-cell .compare span', this.$registerChartBlock).text('+' + thisMonthCount);
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

        var ctx = document.getElementById('register-chart');
        var ticksLimit = 6;
        ctx.height = 186;

        //  TODO: set ticksLimit=4 for all months after library update
        if (this.type === 'm') {
            var daysInMonth = new Date(this.end * 1000).getDate();

            ticksLimit = daysInMonth === 28 ? 5 : 4;
        }

        this.chart = new Chart(ctx, {
            type: 'roundedBar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: 'rgba(101,187,226,0.5)',
                    hoverBackgroundColor: 'rgb(64, 142, 201)',
                    borderWidth: 0
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
                            fontColor: '#B7B7B7',
                            fontSize: 12,
                            autoSkip: true,
                            maxTicksLimit: ticksLimit,
                            maxRotation: 0
                        }
                    }],
                    yAxes: [{
                        display: true,
                        ticks: {
                            fontColor: '#999999',
                            fontSize: 12,
                            beginAtZero: true,
                            precision: 0,
                            suggestedMax: 4
                        },
                        gridLines: {
                            color: "#F0F0F0",
                            zeroLineColor: '#F0F0F0',
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
        this.drawChart();
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

        pro.membershipPlans.forEach(function(item) {
            proPlanIDMap[item[0]] = item[1];
        });

        creditList.forEach(function(item) {
            if (thisMonth.start <= item.gts && item.gts <= thisMonth.end) {
                self.monthCount++;
            }

            if (item.b) {
                self.countedData.b = ++self.countedData.b || 1;
            }
            else {
                var index = proPlanIDMap[item.si];
                self.countedData[index] = ++self.countedData[index] || 1;
            }
        });

        $('.affiliate-total-pur', this.$purchaseChartBlock).text(this.totalCount);
        $('.charts-head-cell .compare span', this.$purchaseChartBlock).text('+' + this.monthCount);

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
        $('.list-item.business .label', this.$purchaseChartBlock)
            .text(formatPercentage(this.countedData.b / this.totalCount || 0));
        $('.list-item.business .num', this.$purchaseChartBlock).text(this.countedData.b || 0);
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

        var ctx = document.getElementById('purchase-chart');

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [
                        this.countedData[4],
                        this.countedData[1],
                        this.countedData[2],
                        this.countedData[3],
                        this.countedData.b,
                        $.isEmptyObject(this.countedData) ? 1  : 0
                    ],
                    backgroundColor: [
                        '#FFC240',
                        '#FF6F00',
                        '#FF0003',
                        '#CC0049',
                        '#408EC9',
                        '#F6F6F6'
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
                '$countryName <span class="num">$count</span>' +
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

/*
 * Extras
 */

/**
 * Animate Icon to let user awares of affiliate dashboard icon.
 * @returns {Void} void function
 */
affiliateUI.animateIcon = function() {

    'use strict';

    if (!M.affiliate.icon) {

        var $icon = $('.nw-fm-left-icon.affiliate');

        M.affiliate.setUA('icon', 1).then(function() {
            $icon.addClass('animate');
        });
    }
};

mBroadcaster.addListener('fm:initialized', function() {

    'use strict';

    // If user is not fully registered or this is public link without login do not load affiliate data yet
    if (!folderlink && u_type > 2 && u_attr.flags.refpr) {

        // If user is newly registered user,
        if ($.noAffGuide) {

            // Just mark him as he already saw the guide dialog and icon animation so it never happens to the user
            delete $.noAffGuide;
            M.affiliate.setUA('icon', 1);
        }
        // else if user is existing user who did not see dialog show it.
        else if (!M.affiliate.icon) {

            // If this is import redirection from download page, lets delay show guide dialog until finished.
            if (typeof dl_import !== 'undefined' && dl_import) {
                mBroadcaster.once('fm:importFileLinkDone', function() {
                    affiliateUI.guideDialog.show();
                });
            }
            else {
                affiliateUI.guideDialog.show();
            }
        }

        // we reached our goal, stop listening for fminitialized
        return 0xDEAD;
    }
});
