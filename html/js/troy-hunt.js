/**
 * Functionality for the Troy Hunt Campaign page
 */
var troyhuntCampaign = {
    /**
     * Initialise Troy Hunt Landing page
     */
    init: function() {
        "use strict";

        loadingDialog.show();
        const internalPath = page.split('/');
        let code = internalPath[0].substr(7);
        const subpage = internalPath[1] || 'landing';

        if (!code && d && localStorage.testTroy) {
            code = '123456';
        }

        const fail = () => {
            if (is_mobile) {
                parsepage(pages.mobile);
            }
            msgDialog('error', '', l[17564], l.troy_error, loadSubPage.bind(this, 'fm'));
        };

        if (!code) {
            return fail();
        }

        api_req({ a: 'th', c: code }, {
            callback: (res) => {
                loadingDialog.hide();
                if (d && localStorage.testTroy && typeof res !== 'object') {
                    res = {
                        pro: 4,
                        pm: 3,
                        bm: 4
                    };
                }

                if (typeof res === 'object' && (res.bm || res.pm)) {
                    // success
                    this.$campaignPage = $('.scroll-block.thunt', 'body');
                    this.$landingPage = $('.thunt-page.landing', this.$campaignPage);
                    this.code = code;
                    this.initTroyHuntPage(code, res, subpage);
                }
                else {
                    if (d) {
                        console.error(`Troy hunt response error: ${res}`);
                    }
                    fail();
                }
            }
        });
    },

    initTroyHuntPage: function(code, details, subpage) {
        "use strict";

        if (!code || !details || !subpage) {
            return loadSubPage('start');
        }

        if (!details.bm) {
            subpage = 'pro';
            $('.thunt-page.pro .thunt-button.switch-button', this.$campaignPage).addClass('hidden');
        }
        else if (!details.pm) {
            subpage = 'business';
            $('.thunt-page.business .thunt-button.switch-button', this.$campaignPage).addClass('hidden');
        }
        $('#startholder').scrollTop(0);

        $('.thunt-page:not(.' + subpage + ')', this.$campaignPage).addClass('hidden').removeClass('active');
        $('.thunt-page.' + subpage, this.$campaignPage).removeClass('hidden').addClass('active');
        if (subpage === 'business') {
            this.lPage = 'B';
        }
        else if (subpage === 'pro') {
            this.lPage = 'P';
        }

        $('.thunt-landing.choice-cell, .thunt-page .switch-button', this.$campaignPage).rebind('click', (e) => {
            this.initTroyHuntPage(code, details, $(e.currentTarget).data('target'));
        });

        $('.thunt-page .scroll-to-form').rebind('click', function(e) {
            e.preventDefault();
            var $formPanel = $('.thunt-main-form', $(this).closest('.thunt-page'));
            $('.thunt-input-field', $formPanel).focus();
            $formPanel.get(0).scrollIntoView({behavior: 'smooth'});
        });

        $('.thunt-input-area', '.thunt-page').rebind('click', function() {
            $('.thunt-input-field', this.closest('.thunt-page')).focus();
        });

        $('.thunt-input-field', '.thunt-page').rebind('keyup', function(e) {
            var $this = $(this);
            if ($this.hasClass('invalid-input')) {
                $('.thunt-form-message', $this.removeClass('invalid-input').closest('.thunt-input-area')).text('');
            }
            if (e.keyCode === 13) {
                troyhuntCampaign.submitInput($(this).val());
            }
        });

        $('.thunt-submit-button').rebind('click', function() {
            troyhuntCampaign.submitInput($('.thunt-input-field', this.closest('.thunt-form-input-group')).val());
        });

        $('.thunt-page.business .thunt-content.top-header', this.$campaignPage)
            .text(mega.icu.format(l.troy_business_try, details.bm));
        $('.thunt-page.business .get-voucher-label, .thunt-page.business .thunt-form-label', this.$campaignPage)
            .text(mega.icu.format(l.troy_business_free, details.bm));
        $('.thunt-page.business .feature-card.generous-storage .feature-card-explain.ext', this.$campaignPage)
            .text(mega.icu.format(l.troy_generous_storage_desc4, details.bm));

        $('.thunt-page.pro .thunt-content.top-header', this.$campaignPage)
            .text(mega.icu.format(l.troy_pro_try, details.pm));
        $('.thunt-page.pro .get-voucher-label, .thunt-page.pro .thunt-form-label', this.$campaignPage)
            .text(mega.icu.format(l.troy_pro_free, details.pm));
    },

    /**
     * Process the email submission
     * @param {string} email        The email to be submitted
     */
    submitInput: function(email) {
        "use strict";
        if (isValidEmail(email)) {
            this.email = email;
            this.sendFormData();
        }
        else {
            this.showMessage(l[141], true);
        }
    },

    /**
     * Show a success/error message after
     * @param {string}  message     The message to be shown
     * @param {boolean} error       Whether or not it's an error message
     */
    showMessage: function(message, error) {
        'use strict';
        var $form = $('.thunt-form-input-group', '.thunt-page.active:not(.hidden)');
        var $messageDiv = $('.thunt-form-message', $form);
        var $inputField = $('.thunt-input-field', $form);
        var appendString = error ?
            '<i class="thunt-icon thunt-sprite white-triangle"></i><span> @@</span>' :
            '<span>@@</span>';

        if (error) {
            $inputField.addClass('invalid-input');
        }
        $messageDiv.text('').removeClass('hidden').safeAppend(appendString, message);

    },

    /**
     * Send Troy Hunt form data
     */
    sendFormData: function() {

        "use strict";
        var request;

        if (!this.email || !this.lPage) {
            return false;
        }

        request = {
            a: 'mrs',       // "marketing record submission"
            e: this.email,  // Email address of the user
            c: 3,           // this is a campaign id, Troy Hunt has a campaign ID of 3
            l: this.lPage,  // Label: B for Business, P for PRO
            d: 1,           // Survey data, this will be empty for Troy Hunt page, so will hardcode to 1
            co: this.code
        };

        api_req(request, {
            callback: function(res) {
                if (res === 0) {
                    troyhuntCampaign.showMessage(
                        l.troy_success
                    );
                }
                else {
                    troyhuntCampaign.showMessage(l[6949], true);
                }
            }
        });
    }
};
