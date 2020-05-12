/**
 * a class to view and control account recovery (password forgetting) prcess
 *
 */

function AccountRecoveryControl() {

    'use strict';

    this.$recoveryPageContainer = $('.main-mid-pad.backup-recover.improved-recovery-steps');
    this.$recoveryBlock = $('.main-recovery-block', this.$recoveryPageContainer);
    this.$recoveryContents = $('.content-wrapper', this.$recoveryBlock);
    this.$navigationControl = $('.nav-header-block', this.$recoveryBlock);
    this.$btnContainer = $('.button-container', this.$recoveryContents);
    this.$btnYes = $('.button-container .recover-button.yes', this.$recoveryContents);
    this.$btnNo = $('.button-container .recover-button.no', this.$recoveryContents);
    this.$emailBlock = $('.recover-account-email-block', this.$recoveryContents);
    this.$emailInput = this.$emailBlock.find('input');
    this.currStep = 0;
    this.prevStep = -1;
    this.currBranch = 0;
    this.lastBranch = 0;
    this.checks = 0;
    this.checks2 = 0;
    this.emSkiped = false;
    this.isBack = false;
    this.twoFactor = false;
    var self = this;

    // if mobile we view the related header for top-mobile.html and hide navigation div of desktop
    if (is_mobile) {
        $('.mobile.forgot-password-page').removeClass('hidden');
        $('.mobile.fm-header').addClass('hidden');
        $('.mobile.fm-header.fm-hr', '.mobile.forgot-password-page').removeClass('hidden');
        $('.nav-header-block', this.$recoveryContents).addClass('hidden');
        this.$navigationControl = $('.mobile.fm-header.fm-hr', '.mobile.forgot-password-page');
        $('.mobile.fm-header.fm-hr recover-acc-subheader.fm-subheader-txt', '.mobile.forgot-password-page').text('');
    }

    // the handler for tab clicking on instruction page
    $('.app-instruction-block .recovery-instructions select', this.$recoveryContents)
        .rebind('change.recoverpagedevice', function () {
        var device = $(this).val();
        if (device) {
            self.prepareInstruction(device);
            $('.app-instruction-block .hidden', this.$recoveryContents).removeClass('hidden');
        }
        else {
            $('.app-instruction-block > :not(.default-select)', this.$recoveryContents).addClass('hidden');
        }
    });
    $('.content-highlight-block', this.$recoveryContents).rebind('click', function () {
        window.open("https://mega.nz/help");
    });

    if ($.prefillEmail) {
        this.$emailInput.val($.prefillEmail);
        delete $.prefillEmail;
    }

    var emailMegaInput = new mega.ui.MegaInputs(this.$emailInput);

    this.$emailInput.rebind('keydown.recoverpageemail', function (e) {
        if (e.keyCode === 13) {
            self.$btnYes.click();
            return false;
        }
    });

    $('.check-sessions > div', this.$recoveryContents).rebind('click', function() {
        $(this).toggleClass('active').find('.checkdiv').toggleClass('checkboxOn checkboxOff');
        if ($('.check-sessions .checkdiv.checkboxOn').length === 3) {
            self.$btnContainer.removeClass('hidden');
        }
        else {
            self.$btnContainer.addClass('hidden');
        }
    });

    this.$navigationControl.rebind('click', function () {
        self.isBack = true;

        // reset select
        if (self.currStep === -2) {
            var $select = $('.app-instruction-block .recovery-instructions select', this.$recoveryContents);
            $select.find('option').get(0).selected = 1;
            $select.trigger('change');
        }

        if (self.prevStep >= 0 && self.prevStep <= 2) {
            self.showStep(self.prevStep);
        }
        else if (self.prevStep === -1 || self.prevStep === -2) {
            self.showStep(self.prevStep, self.lastBranch);
        }

        return false;
    });

    var stepZero = function() {
        var enteredEmail = self.$emailInput.val();

        // Check user skips the email entering
        self.emSkiped = enteredEmail ? false : !self.emSkiped;

        // No email is entered, show message for first time.
        if (self.emSkiped) {
            emailMegaInput.showError(l[18506]);
            return false;
        }

        // Entered email is not valid
        if (enteredEmail && !isValidEmail(enteredEmail)) {
            emailMegaInput.showError(l[1101]);
        }
        else { // Entered email is valid, or user click the button again withoout email.
            emailMegaInput.hideError();

            // Email is not entered.
            if (!enteredEmail) {
                self.showStep(1);
            }
            else {
                self.checkAccount(enteredEmail);
            }

        }
    };

    $('.button-container .recover-button', this.$recoveryContents).rebind('click', function () {
        switch (self.currStep) {
            case 0: {
                stepZero();
                break;
            }
            case 1: { // Do you have recovery?
                if ($(this).hasClass('yes')) {
                    self.showStep(-2, 1);
                }
                else {
                    self.showStep(2);
                }
                break;
            }
            case 2: { // Do you have an active session?
                if ($(this).hasClass('yes')) {
                    self.showStep(-2);
                }
                else {
                    self.showStep(-1);
                }
                break;
            }
            case -1: { // Result - Warning
                if ($(this).hasClass('yes')) {
                    self.showStep(2);
                }
                else {
                    self.showParkWarning();
                }
                break;
            }
            case -2: { // Result - Success
                var email = $('#recover-input1', self.$recoveryContents).val();
                self.startRecovery(email); // recover
                break;
            }
            default: {
                console.error('Current step is invalid.');
                break;
            }
        }
    });

    $('.info-container .settings-row', this.$recoveryContents).rebind('click', function () {
        var checkB = $('.checkdiv', this);
        if (checkB.hasClass('checkboxOn')) {
            checkB.removeClass('checkboxOn');
            $('.checkbox', checkB).removeClass('checkboxOn');
            checkB.addClass('checkboxOff');
            $('.checkbox', checkB).addClass('checkboxOff');
            self.checks--;
            self.$btnContainer.addClass('hidden');
        }
        else {
            checkB.addClass('checkboxOn');
            $('.checkbox', checkB).addClass('checkboxOn');
            checkB.removeClass('checkboxOff');
            $('.checkbox', checkB).removeClass('checkboxOff');
            if (++self.checks === 2) {
                self.$btnContainer.removeClass('hidden');
            }
        }
    });

    $('.toResetLink').rebind('click', function() {
        self.showStep(-2, 1);
    });
}

/**
 * a controller function to check account has twoface on or off.
 * @param {String} enteredEmail : email user entered
 */
AccountRecoveryControl.prototype.checkAccount = function _checkAccount(enteredEmail) {

    "use strict";

    var self = this;
    loadingDialog.pshow();
    var request = { "a": "ere", "m": enteredEmail, "v": 2 };
    api_req(request, {
        callback: function (res) {
            loadingDialog.phide();
            if (res === -9) { // invalid email
                self.$emailInput.megaInputsShowError(l[18668]);
                return;
            }
            else if (typeof res === 'object' && (res.val === 0 || res.val === 1)) {
                // if (res.val === 0) {
                //     self.showParkWarning(true);
                // }
                self.showStep(1);
                if (res['2fa']) {
                    self.twoFactor = true;
                }
                return;
            }
            else {
                console.error('Unexpected return value from API');
            }
            self.showStep(1); // in problems cases, start from 1
        }
    });
}

/**
 * a controller function to view the step, start from step =1
 * @param {Number} step : the step number [default=1]
 * @param {Number} branch : to distinguish steps with multiple branches
 */
AccountRecoveryControl.prototype.showStep = function _showStep(step, branch) {
    'use strict';
    if (!step) {
        step = 0;
    }
    var bkStep = this.currStep;
    this.lastBranch = this.currBranch;
    this.currStep = step;
    if (!branch) {
        branch = 0;
    }
    this.currBranch = branch;
    var question1 = l[18254];
    var desc1 = l[18255];
    var yesAnswer = l[18259];
    var noAnswer = l[18260];
    var recoveryImg = 'email';
    var infoBlock;
    var status;
    var toReset;
    this.prevStep = step - 1;
    if (step === 0) {
        question1 = l[8798];
        desc1 = l[18508];
        yesAnswer = l[7315];
        noAnswer = '';
        recoveryImg = 'email';
        infoBlock = '';
        this.prevStep = -5; // igonre
        status = '';
    }
    else if (step === 1) {
        question1 = l[1937];
        desc1 = l[18268];
        yesAnswer = l[18269];
        noAnswer = l[18270];
        recoveryImg = 'key';
        infoBlock = 'recovery-key';
        status = '';
    }
    if (step === 2) {
        question1 = l[19815];
        desc1 = l[19816];
        yesAnswer = l[19817];
        noAnswer = l[19818];
        recoveryImg = 'gray-device';
        infoBlock = '';
        status = '';
    }
    else if (step === -1) {
        this.prevStep = bkStep;
        question1 = l[8990];
        if (this.twoFactor) {
            question1 = l[19819];
        }
        desc1 = '';
        yesAnswer = l[18278];
        noAnswer = l[19820];
        recoveryImg = 'lock';
        infoBlock = 'recovery-warning';
        status = 'warning';
    }
    else if (step === -2 && !branch) {
        // escapeing bkStep looping caused by .toResetLink hyperlink
        this.prevStep = bkStep === -2 ? 2 : bkStep;
        question1 = l[18281];
        desc1 = '';
        yesAnswer = '';
        noAnswer = '';
        this.prepareInstruction();
        recoveryImg = 'device-password';
        infoBlock = '';
        status = '';

        // If twoFactor is on the account show different message.
        if (this.twoFactor) {
            question1 = l[19821];
            desc1 = l[19822];
            recoveryImg = 'device-key';
            toReset = true;
        }
    }
    else if (step === -2 && branch === 1) {
        this.prevStep = bkStep;
        question1 = l[18281];
        desc1 = l[1939];
        yesAnswer = l[1940];
        noAnswer = '';
        recoveryImg = 'key';
        infoBlock = '';
        status = '';

        // If twoFactor is on the account show different message.
        if (this.twoFactor) {
            question1 = l[19823];
            desc1 = l[19824];
            recoveryImg = 'unlocked-key';
        }
    }

    this.$emailBlock.addClass('hidden');
    this.$navigationControl.removeClass('hidden');

    window.scrollTo(0, 0);
    if (step === 0) {
        if (is_mobile) {
            this.$navigationControl.find('.fm-icon.left').addClass('mega').removeClass('back')
                .removeClass('non-responsive');
            $('.button-aligner', this.$recoveryContents).addClass('no-float');
        }
        else {
            this.$navigationControl.addClass('hidden');
            this.$btnYes.noTransition(function() {
                $(this).addClass('default-grey-button');
            });
            $('.button-aligner', this.$recoveryContents).removeClass('no-float');
        }
    }
    else {
        if (is_mobile) {
            this.$navigationControl.find('.fm-icon.left').addClass('back').removeClass('mega')
                .addClass('non-responsive');
        }
        else {
            this.$btnYes.noTransition(function() {
                $(this).removeClass('default-grey-button');
            });
        }
    }

    if (this.twoFactor) {
        $('.two-factor-contents').removeClass('hidden');
        $('.non-two-factor-contents').addClass('hidden');
    }
    else {
        $('.two-factor-contents').addClass('hidden');
        $('.non-two-factor-contents').removeClass('hidden');
    }

    $('.recover-image', this.$recoveryContents).removeClass().addClass('recover-image ' + recoveryImg);

    $('.nav-back-subheading', this.$recoveryContents).text('');

    if (step === -2) {
        if (is_mobile) {
            $('.button-aligner', this.$recoveryContents).addClass('no-float');
        }
        else {
            $('.button-aligner', this.$recoveryContents).removeClass('no-float');
        }
    }

    // Reset status
    $('.recover-state', this.$recoveryContents).removeClass('warning success').addClass('hidden');

    // add status if exist and show it.
    if (status) {
        var text = status === 'success' ? l[18280] : l[882];
        $('.recover-state', this.$recoveryContents).addClass(status).text(text).removeClass('hidden');
    }

    // Question actions
    if (question1) {
        $('h1.step-main-question', this.$recoveryContents).safeHTML(question1).removeClass('hidden');
    }
    else {
        $('h1.step-main-question', this.$recoveryContents).addClass('hidden');
    }

    // Descriptions actions
    if (desc1) {
        $('.recover-account-body-text', this.$recoveryContents).safeHTML(desc1).removeClass('hidden');
    }
    else {
        $('.recover-account-body-text', this.$recoveryContents).addClass('hidden');
    }

    // Info block actions
    if (infoBlock) {
        $('.info-block.' + infoBlock, this.$recoveryContents).removeClass('hidden');
    }
    else {
        $('.info-block', this.$recoveryContents).addClass('hidden');
    }

    // Button container actions
    $('.button-container .button-aligner.no', this.$recoveryContents).removeClass('hidden');
    if (yesAnswer || noAnswer) {
        this.$btnContainer.removeClass('hidden');
        if (!noAnswer) {
            $('.button-container .button-aligner.no', this.$recoveryContents).addClass('hidden');
        }
        this.$recoveryContents.addClass('hasButton');
    }
    else {
        this.$btnContainer.addClass('hidden');
        this.$recoveryContents.removeClass('hasButton');
    }

    // If it is only one btn using red button. otherwise using default style
    if (yesAnswer && noAnswer) {
        this.$btnYes.removeClass('red-button');
    }
    else {
        this.$btnYes.addClass('red-button');
    }

    // Update button text
    this.$btnYes.text(yesAnswer);
    this.$btnNo.text(noAnswer);

    // this page has link to Reset
    if (toReset) {
        $('.toReset').removeClass('hidden');
    }
    else {
        $('.toReset').addClass('hidden');
    }

    // Special action for step 2
    if (step === 2) {
        $('.check-sessions').removeClass('hidden');
        this.$btnContainer.addClass('hidden');
    }
    else {
        var $checkSession = $('.check-sessions');
        $checkSession.addClass('hidden');
        $('.col-3', $checkSession).removeClass('active');
        $('.checkdiv', $checkSession).removeClass('checkboxOn').addClass('checkboxOff');
    }

    // Reset isBack
    this.isBack = false;

    // App instructions and Email entering block
    $('.app-instruction-block', this.$recoveryContents).addClass('hidden');
    this.$emailBlock.addClass('hidden');

    if (step === 0) {
        this.$emailBlock.removeClass('hidden');
    }
    if (step === -2) {
        if (!branch) {
            $('.app-instruction-block', this.$recoveryContents).removeClass('hidden');
        }
        else {
            this.$emailBlock.removeClass('hidden');
        }
    }
};


/**
 * a function to prepare instruction slide
 * @param {String} device : device class, default = android
 */
AccountRecoveryControl.prototype.prepareInstruction = function _prepareInstruction(device) {

    'use strict';

    var instructions = '<li class="list-point">';

    if (device === 'web') {
        instructions += l[18282];
        instructions += '</li><li class="list-point" >';
        instructions += l[18283];
        instructions += '</li><li class="list-point" >';
        instructions += l[18284];
        instructions += '</li> <li class="list-point" >';
        if (this.twoFactor) {
            instructions += l[19807];
        }
        else {
            instructions += l[18285];
        }
    }
    else if (device === 'android') {
        instructions += l[18286];
        instructions += '</li><li class="list-point" >';
        instructions += l[18287];
        instructions += '</li><li class="list-point" >';
        if (this.twoFactor) {
            instructions += l[19808];
        }
        else {
            instructions += l[18289];
            instructions += '</li><li class="list-point" >';
            instructions += l[18290];
        }
    }
    else if (device === 'ios') {
        instructions += l[18291];
        instructions += '</li><li class="list-point" >';
        instructions += l[18292];
        instructions += '</li><li class="list-point" >';
        instructions += l[18293];
        instructions += '</li><li class="list-point" >';
        if (this.twoFactor) {
            instructions += l[18638];
        }
        else {
            instructions += l[18294];
            instructions += '</li><li class="list-point" >';
            instructions += l[18295];
        }
    }
    // else if (device === 'osxmegasync') {
    // }
    else if (device === 'windowsmegasync') {
        instructions += l[18301];
        instructions += '</li><li class="list-point" >';
        instructions += l[18302];
        instructions += '</li><li class="list-point" >';
        instructions += l[18303];
        instructions += '</li><li class="list-point" >';
        instructions += l[18304];
        instructions += '</li><li class="list-point" >';
        if (this.twoFactor) {
            instructions += l[19810];
        }
        else {
            instructions += l[18305];
            instructions += '</li><li class="list-point" >';
            instructions += l[18419];
        }
    }
    else if (device === 'windowsapp' || device === 'uwpapp') {
        if (this.twoFactor){
            instructions += l[19811];
            instructions += '</li><li class="list-point" >';
            instructions += l[19812];
            instructions += '</li><li class="list-point" >';
            instructions += l[19813];
            instructions += '</li><li class="list-point" >';
            instructions += l[19814];
        }
        else if (device === 'windowsapp'){
            instructions += l[18286];
            instructions += '</li><li class="list-point" >';
            instructions += l[18314];
            instructions += '</li><li class="list-point" >';
            instructions += l[18315];
            instructions += '</li><li class="list-point" >';
            instructions += l[18298];
            instructions += '</li><li class="list-point" >';
            instructions += l[18316];
        }
        else if (device === 'uwpapp'){
            instructions += l[18286];
            instructions += '</li><li class="list-point" >';
            instructions += l[18296];
            instructions += '</li><li class="list-point" >';
            instructions += l[18297];
            instructions += '</li><li class="list-point" >';
            instructions += l[18298];
            instructions += '</li><li class="list-point" >';
            instructions += l[18295];
        }
    }
    instructions += '</li>';

    $('.app-instructions-list', this.$recoveryContents).safeHTML(instructions);
};

/**
 * function to start recovery process
 * @param {String} email : email for the process
 * @param {Boolean} isPark : optional to indicate if the operation is PARK
 */
AccountRecoveryControl.prototype.startRecovery = function _startRecovery(email, isPark) {

    var t;

    // Park account
    if (isPark) {
        t = 10;
    }

    // Recover account using backup master key
    else {
        t = 9;
    }

    if (!isValidEmail(email)) {
        msgDialog('warninga', l[1100], l[1101]);
    } else {
        loadingDialog.show();
        api_req({ a: 'erm', m: email, t: t }, {
            callback: function (res) {
                loadingDialog.hide();
                if (res === ENOENT) {
                    msgDialog('warningb', l[1513], l[1946]);
                }
                else if (res === -27) {
                    // as reported by Jon, this is returned when parking is not valid
                    msgDialog('warningb', l[135], l[19925]);
                }
                else if (res === 0) {
                    if (!is_mobile) {
                        handleResetSuccessDialogs('.reset-success', l[735], 'resetsuccess');
                    }
                    else {
                        msgDialog('info', '', l[735]);
                    }
                } else {
                    msgDialog('warningb', l[135], l[200]);
                }
            }
        });
    }
};

AccountRecoveryControl.prototype.showParkWarning = function _showParkWarning(easyPark) {

    var $dialog = $('.fm-dialog.park-account-dialog');
    var self = this;
    self.checks2 = 0;
    $('.checkbox-block.park-account-checkbox .settings-row .checkdiv', $dialog)
        .removeClass('checkboxOn').addClass('checkboxOff').removeClass('hidden');
    $('.checkbox-block.park-account-checkbox .settings-row .checkdiv .checkbox', $dialog)
        .removeClass('checkboxOn').addClass('checkboxOff');
    $('.parkbtn', $dialog).addClass('disabled');
    $('.checkbox-block.park-account-checkbox', $dialog).removeClass('hidden');
    var $emailInput = $('#recover-input1-di', $dialog);
    var warn2 = l[18311];
    var warn1 = l[18312];
    $('#warn2-check', $dialog).safeHTML(warn2);
    $('#warn1-check', $dialog).safeHTML(warn1);
    $('.content-highlight.warning', $dialog).addClass('hidden');

    if (easyPark) {
        $('.checkbox-block.park-account-checkbox', $dialog).addClass('hidden');
        $('.parkbtn', $dialog).removeClass('disabled');
        $('.content-highlight.warning', $dialog).removeClass('hidden');
    }
    else if (is_mobile) {
        $('.mobile #startholder.fmholder').addClass('no-scroll');
    }
    else {
        $('.mobile #startholder.fmholder').removeClass('no-scroll');
    }

    // Pre-fill the email address the user entered at the step one
    $emailInput.val($('.improved-recovery-steps #recover-input1').val());
    var emailMegaInput = new mega.ui.MegaInputs($emailInput);

    var closeDialogLocal = function _closeDialog() {
        if (is_mobile) {
            $('.mobile.fm-dialog-container').addClass('hidden');
            fm_hideoverlay();
            $('.mobile #startholder.fmholder').removeClass('no-scroll');
        }
        else {
            $(document).off('keydown.parkwarn');
            closeDialog();
        }
    };

    $('.checkbox-block.park-account-checkbox .settings-row', $dialog).rebind('click', function () {
        var checkB = $('.checkdiv', this);
        if (checkB.hasClass('checkboxOn')) {
            checkB.removeClass('checkboxOn');
            $('.checkbox', checkB).removeClass('checkboxOn');
            checkB.addClass('checkboxOff');
            $('.checkbox', checkB).addClass('checkboxOff');
            self.checks2--;
            $('.parkbtn', $dialog).addClass('disabled');
            $('.content-highlight.warning', $dialog).addClass('hidden');
        }
        else {
            checkB.addClass('checkboxOn');
            $('.checkbox', checkB).addClass('checkboxOn');
            checkB.removeClass('checkboxOff');
            $('.checkbox', checkB).removeClass('checkboxOff');
            if (++self.checks2 === 3) {
                $('.parkbtn', $dialog).removeClass('disabled');
                $('.content-highlight.warning', $dialog).removeClass('hidden');
            }
        }
    });

    $('.parkbtn', $dialog).rebind('click', function () {
        if ($(this).hasClass('disabled')) {
            return;
        }

        var email = $emailInput.val();

        closeDialogLocal();
        self.startRecovery(email, true);
    });

    $('.closebtn, .fm-dialog-close', $dialog).rebind('click', closeDialogLocal);

    if (!is_mobile) {
        $(document).rebind('keydown.parkwarn', function (e) {
            if (e.keyCode === 27) {
                closeDialogLocal();
            }
        });
        $emailInput.rebind('keydown.parkwarn', function (e) {
            if (e.keyCode === 13) {
                $('.parkbtn', $dialog).click();
            }
        });
    }

    $('.supportbtn', $dialog).rebind('click', function () {
        window.open("https://mega.nz/contact");
    });

    M.safeShowDialog('parkwarning', function () {
        $dialog.removeClass('hidden');
        $dialog.trigger("focus");
        if (is_mobile) {
            $('.mobile.fm-dialog-container').removeClass('hidden');
        }

        return $dialog;
    });
};
