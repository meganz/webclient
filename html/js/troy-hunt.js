/**
 * Functionality for the Troy Hunt Campaign page
 */
var troyhuntCampaign = {
    /**
     * Initialise Troy Hunt Landing page
     */
    init: function() {
        "use strict";

        this.$campaignPage = $('.scroll-block.thunt', 'body');
        this.$landingPage = $('.thunt-page.landing', this.$campaignPage);
        this.initTroyHuntPage();
    },

    initTroyHuntPage: function() {
        "use strict";
        var subpage = page.substring(10);
        subpage = subpage === '' ? 'landing' : subpage;
        $('.thunt-page:not(.' + subpage + ')').addClass('hidden').removeClass('active');
        $('.thunt-page.' + subpage).removeClass('hidden').addClass('active');
        if (subpage === 'business') {
            this.lPage = 'B';
        }
        else if (subpage === 'pro') {
            this.lPage = 'P';
        }

        $('.thunt-landing.choice-cell, .thunt-page .switch-button', this.$campaignPage).rebind('click', function() {
            loadSubPage('/troy-hunt/' + $(this).data('target'));
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
            this.showMessage('Please enter a correct email address', true);
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
            d: 1            // Survey data, this will be empty for Troy Hunt page, so will hardcode to 1
        };

        api_req(request, {
            callback: function(res) {
                if (res === 0) {
                    troyhuntCampaign.showMessage(
                        'Success! We have sent you an email to get you started with your free storage.'
                    );
                }
                else {
                    troyhuntCampaign.showMessage('Something went wrong.', true);
                }
            }
        });
    }
};
