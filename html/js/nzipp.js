/**
 * Functionality for the NZIPP Campaign page
 */
var nzippCampaign = {

    /**
     * Initialise NZIPP Landing page
     */
    init: function() {

        "use strict";

        this.$campaignPage = $('.scroll-block.nzipp', 'body');
        this.$landingPage = $('.nzipp-content.landing', this.$campaignPage);
        this.$interviewPage = $('.nzipp-content.interview', this.$campaignPage);
        this.$interviewResultPage = $('.nzipp-content.interview-result', this.$campaignPage);
        this.answers = [];

        this.initLandingPage();
    },

    /**
     * Initialise NZIPP Interview page
     */
    initLandingPage: function() {

        "use strict";

        var self = this;

        // "L" is the members one (we are emailing them from a known list of emails)
        if (page === 'nzippmember') {
            this.lPage = 'L';
            this.$landingPage.removeClass('photo');
        }
        else {
            this.lPage = 'M';
            this.$landingPage.addClass('photo');
        }

        $('.campaign-button.landing', this.$landingPage).rebind('click', function() {

            var $scrollableBlock = is_mobile ? $(window) : $('.fmholder', 'body');

            // Scroll paage to top
            $scrollableBlock.scrollTop(0);

            self.initInterviewPage();
            self.$landingPage.addClass('hidden');
            self.$interviewPage.removeClass('hidden');
        });
    },

    /**
     * Initialise NZIPP Interview page
     */
    initInterviewPage: function() {

        "use strict";

        this.initInterviewFormElements();
        this.initInterviewPageEvents();
    },

    /**
     * Initialise NZIPP Interview form Elements
     */
    initInterviewFormElements: function() {

        "use strict";

        var $selects = $('select', this.$interviewPage);

        mega.ui.MegaInputs($('.titleTop', this.$interviewPage));

        if (!is_mobile) {
            $selects.selectmenu({
                position: {
                    my: "left top-18",
                    at: "left bottom-18",
                    collision: "flip"
                }
            });
        }
    },

    /**
     * Initialise NZIPP Interview events
     */
    initInterviewPageEvents: function() {

        "use strict";

        var self = this;

        // Init Next/Submit button
        $('.campaign-button.interview', self.$interviewPage).rebind('click', function() {

            var $this = $(this);
            var step = parseInt($this.data('slide'));
            var $form = $('.interview .form-content.step' + step);
            var $scrollableBlock = is_mobile ? $(window) : $('.fmholder', 'body');

            // Return if collecting is failed
            if (!nzippCampaign.collectInterviewFormElements($form)) {
                return false;
            }

            // Send API request and Show result page if step is last
            if (step === 12) {

                self.sendFormData();
            }
            else {

                // Show next step
                $('.form-content:visible', self.$interviewPage).addClass('hidden');
                $('.form-content.step' + (step + 1), self.$interviewPage).removeClass('hidden');

                // Change question header
                $('.top-header:visible', self.$interviewPage).addClass('hidden');
                $('.top-header.step' + (step + 1), self.$interviewPage).removeClass('hidden');

                // Change progress value
                $('.progress span:nth-child(' + (step + 1) + ')', self.$interviewPage).addClass('active');
                $('.progress-info .current', self.$interviewPage).text(step + 1);

                // Change button to Submit if next step is last
                if (step + 1 === 12) {
                    $this.text('Submit');
                }

                // Set new slide data
                $this.data('slide', step + 1);
            }

            // Scroll paage to top
            $scrollableBlock.scrollTop(0);
        });

        // Init inputs labels click event
        $('.campaign-label', self.$interviewPage).rebind('mousedown', function() {

            var $this = $(this);
            var $inputWrapper = $('.wrap', $this);
            var $content = $this.closest('.form-content');
            var $labels = $('.campaign-label', $content);

            // Select if Radio button
            if ($inputWrapper.is('.radio')) {

                $labels.removeClass('active');
                $('.wrap', $labels).removeClass('checked');
                $this.addClass('active');
                $inputWrapper.addClass('checked');
            }
            // Unselect if active checkbox
            else if ($this.is('.active')) {

                $this.removeClass('active');
                $inputWrapper.removeClass('checked');
            }
            // Select if checkbox
            else {

                $this.addClass('active');
                $inputWrapper.addClass('checked');
            }
        });

        // Trigger click if Enter key is pressed
        $('.campaign-label, input', self.$interviewPage).keypress(function(e) {

            if (e.which === 13) {
                $('.campaign-button.interview', self.$interviewPage).trigger('click');
            }
        });

        // Trigger click if Enter key is pressed
        $('.nzipp-interview-result.failed a', self.$interviewPage).rebind('click', function() {

            // Show Inerview page
            document.location.reload();
        });
    },

    /**
     * Collect NZIPP Interview form data
     */
    collectInterviewFormElements: function($form) {

        "use strict";

        var formType = $form.data('type');

        // Remove old  error message
        $('.campaign-error', $form).remove();

        // If input fields form
        if (formType === 'input') {

            return this.collectInterviewInputsData($form);
        }
        // If radio buttons form
        else if (formType === 'radio') {

            return this.collectInterviewRadioData($form);
        }
        // If checkboxes fields form
        else if (formType === 'checkbox') {

            return this.collectInterviewCheckboxData($form);
        }

        // If textarea field form
        else if (formType === 'textarea') {

            return this.collectInterviewTextareaData($form);
        }
    },

    /**
     * Collect NZIPP Interview inputs data
     */
    collectInterviewInputsData: function($form) {

        "use strict";

        var $firstName = $('.firstname', $form);
        var $lastName = $('.lastname', $form);
        var $email = $('.email', $form);
        var firstName = $firstName.val();
        var lastName =  $lastName.val();
        var email = $email.val();

        // Return and show error If any field is empty
        if (firstName === '' || lastName === '' || email === '') {

            this.showFormValidtionError($form, 'Please answer this question');
            return false;
        }

        // Return and show error under email input is format is incorrect
        if (!isValidEmail(email)) {

            $email.data('MegaInputs').showError('Please enter valid information');
            return false;
        }

        // Save validated inputs data
        nzippCampaign.answers.push(firstName);
        nzippCampaign.answers.push(lastName);
        nzippCampaign.userEmail = email;

        return true;
    },

    /**
     * Collect NZIPP Interview radio buttons data
     */
    collectInterviewRadioData: function($form) {

        "use strict";

        var $selectedWrapper = $('.campaign-label.active', $form);
        var selectedValue = $('.label-txt', $selectedWrapper).text();
        var additionalOption = $('input', $selectedWrapper).data('details');
        var value;

        // Return and show error If there is no selected radio button
        if (!selectedValue) {

            this.showFormValidtionError($form, 'Please answer this question');
            return false;
        }

        // Get Select box option if radio button has additional option
        if (additionalOption && additionalOption === 'select') {

            value = $('select :selected:not([disabled])', $selectedWrapper.next()).text();
        }

        // GetTextarea or input value if radio button has additional option
        else if (additionalOption) {

            value = $selectedWrapper.next('textarea, input').val();
        }

        // Save selected data
        nzippCampaign.answers.push(value ? value : selectedValue);

        return true;
    },

    /**
     * Collect NZIPP Interview checkboxes data
     */
    collectInterviewCheckboxData: function($form) {

        "use strict";

        var $selectedWrapper = $('.campaign-label.active', $form);
        var value = '';

        // Return and show error If there is no selected checked buttons of more then 3
        if (!$selectedWrapper.length || $selectedWrapper.length > 3) {

            this.showFormValidtionError($form, 'Please select up to 3 answers');
            return false;
        }

        // Combine checked boxes values
        for (var i = 0, length = $selectedWrapper.length; i < length; i++) {

            value = value + $('.label-txt', $($selectedWrapper[i])).text() + '. ';
        }

        // Save selected data
        nzippCampaign.answers.push(value);

        return true;
    },

    /**
     * Collect NZIPP Interview textarea data
     */
    collectInterviewTextareaData: function($form) {

        "use strict";

        var value = $('textarea', $form).val();

        // Return and show error If textbox is empty
        if (!value) {

            this.showFormValidtionError($form, 'Please answer this question');
            return false;
        }

        // Save selected data
        nzippCampaign.answers.push(value);

        return true;
    },

    /**
     * Show NZIPP Interview form validtion error
     */
    showFormValidtionError: function($form, message) {

        "use strict";

        $form.safeAppend(
            '<div class="campaign-error">'
            + '<i class="campaign-sprite triangle"></i>'
            + '<span>@@</span>'
            + '</div>', message
        );
        $('.campaign-error', $form).addClass('visible');
    },

    /**
     * Send NZIPP form data
     */
    sendFormData: function() {

        "use strict";

        var self = this;
        var campaingData = {};
        var request;

        if (!this.userEmail || !this.answers.length) {
            return false;
        }

        for (var i = 0, length = this.answers.length; i < length; i++) {

            campaingData['Q' + (i + 1)] = base64urlencode(to8(this.answers[i]));
        }

        request = {
            a: 'mrs',   // "marketing record survey"
            e: this.userEmail, // email address of the user
            c: 1, // this is a campaign id, just hardcode 1 for now as its our first marketing campaign
            l: this.lPage, // survey label/identifier - "L" for the list landing page, "M" for the media landing page
            d: campaingData
        };

        api_req(request, {
            callback: function(res) {

                // Show result page
                self.$interviewPage.addClass('hidden');
                self.$interviewResultPage.removeClass('hidden');

                if (res === 0) {

                    // Show succces page
                    self.$interviewResultPage.removeClass('error');
                }
                else {

                    // Show error page
                    self.$interviewResultPage.addClass('error');
                }
            }
        });
    }
};
