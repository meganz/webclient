/*
 * Text input
 *
 * Optionally, animate title/placeholder to top of input when it is focused/has value
 *
 * Please refer Megainput Core instruction to learn basic usage.
 *
 * Class: `underlinedText`
 * Example: `<input class="underlinedText" type="text" name="register-name" id="register-name"
 *          placeholder="[$195]" class="input-email " maxlength="190" />`
 *
 * Extension:
 * - Password Strength Checker - Show bottom bar that show strength of entered password
 *      Class: `strengthChecker`
 *      Example: `<input class="underlinedText strengthChecker" type="password" name="register-password"
 *            id="register-password" class="input-password" placeholder="[$909]" />`
 *
 * - Half size - Make title top half width and float positioning, may require manually place `clear <div>`.
 *      Class: `halfSize-l` for float left, `halfSize-r` for float right
 *      Example: `<input
 *                    class="underlinedText halfSize-l"
 *                    autocomplete="disabled"
 *                    type="text"
 *                    name="register-name2"
 *                    id="register-firstname-registerpage2"
 *                    placeholder="[$7342]"
 *                    maxlength="40" />
 *                <input
 *                    class="underlinedText halfSize-r"
 *                    autocomplete="disabled"
 *                    type="text"
 *                    name="register-familyname2"
 *                    id="register-lastname-registerpage2"
 *                    placeholder="[$7345]"
 *                    maxlength="40" />`
 * - Clear button - simple extension of adding clear button on right side of input
 *      Class: `clearButton`
 *      Example: `<input class="underlinedText clearButton"/>`
 *
 * - Copy to clipboard button - simple extension of adding Copy to clipboard button on right side of input
 *      Class: `copyButton`
 *      Example: `<input class="underlinedText copyButton"/>`
 *      Options once MegaInput init:
 *          Pass `copyToastText` on options once MegaInput if custom text in "Copied to clipboard" toast is required
 *
 *              `var megaInput = new mega.ui.MegaInputs($input, {
 *                  copyToastText: l.value_copied
 *              });`
 *
 * - Text area with automatic height. Increase/decrease the text area in height depending on the amount of text.
 *      wrapperClass: `textarea auto-height`
 *      Example: `<input class="underlinedText copyButton" data-wrapper-class="textarea auto-height"/>`
 *      Options once MegaInput init:
 *          Pass `autoHeight` on options once MegaInput init
 *          Pass `maxHeight` on options once MegaInput init if you need to stop increasing it by height at some point
 *
 *              `var megaInput = new mega.ui.MegaInputs($input, {
 *                  autoHeight: true,
 *                  maxHeight: 140,
 *              });`
 *
 * - Length Checker - Show number of characters entered below input field if it has a limit (no-of-chars / limit)
 *      Class: `lengthChecker`
 *      Example: `<input class="underlinedText lengthChecker" type="text" name="register-name" id="register-name"
 *          placeholder="[$195]" maxlength="1000" />`
 */
mega.ui.MegaInputs.prototype.underlinedText = function() {

    'use strict';

    if (!(this.type === 'text' || this.type === 'password' ||
        this.type === 'tel' || this.type === 'number' || this.type === 'email')) {
        console.error('Class binding and input type mismatch! ' +
            'classname: mega-input, input type: ' + this.type + ', Required type: text.');
        return;
    }

    var $input = this.$input;

    this.underlinedText._bindEvent.call(this);
    this.underlinedText._init.call(this);

    // Dedicate functions
    this.underlinedText._extendedFunctions.call(this);

    // Make sure title is always on top upon init when there is value.
    $input.trigger('blur');

    // And make sure password strength is cleared.
    if ($input.hasClass('strengthChecker')) {
        $input.trigger('input');
    }
};

mega.ui.MegaInputs.prototype.underlinedText._init = function() {

    'use strict';

    var $input = this.$input;

    // Overwrite hide/show for Message/Error
    this.underlinedText._updateShowHideErrorAndMessage.call(this);

    // If it is already a megaInput, html preparation does not required anymore.
    if (!$input.hasClass('megaInputs')) {

        const hasTitle = !$input.hasClass('no-title-top') && ($input.attr('title') || $input.attr('placeholder'));
        const wrapperClass = hasTitle ? 'title-ontop' : '';

        // Wrap it with another div for styling and animation
        $input.wrap(`<div class="mega-input ${wrapperClass}"></div>`);

        const $wrapper = this.$wrapper = $input.closest(`.mega-input`);

        // Hide wrapper if input has hidden class
        if ($input.hasClass('hidden')) {
            $wrapper.addClass('hidden');
            $input.removeClass('hidden');
        }

        if (hasTitle) {
            // Insert animatied title
            let title = escapeHTML($input.attr('title') || $input.attr('placeholder'));

            // Adding required sign
            title += this.required ? ' <span class="required-red">*</span>' : '';

            const titleBlock = '<div class="mega-input-title">' + title + '</div>';

            // Insert title block
            $wrapper.safePrepend(titleBlock);

            // Bind event for animation on title
            const $titleBlock = $('.title', $input.parent());
            $titleBlock.rebind('click.underlinedText', function() {

                const $this = $(this);

                if (!$this.parent().hasClass('active')) {
                    $this.next('input').trigger('focus');
                }
            });
        }

        // Insert error message block
        $wrapper.safeAppend('<div class="message-container mega-banner"></div>');

        // Half size
        this.underlinedText._halfSize.call(this);

        // Insert password strength checker
        this.underlinedText._strengthChecker.call(this);

        // Insert input length checker
        this.textArea._lengthChecker.call(this);

        // With icon or prefix (e.g. currency)
        this.underlinedText._withIconOrPrefix.call(this);

        // Add some class to wrapper
        if ($input.data('wrapper-class')) {
            $wrapper.addClass($input.data('wrapper-class'));
        }

        // Add special class for textarea with auto height
        if (this.options.autoHeight) {
            $wrapper.addClass('textarea auto-height');
        }
    }
};

mega.ui.MegaInputs.prototype.underlinedText._bindEvent = function() {

    'use strict';

    var $input = this.$input;

    $input.rebind('focus.underlinedText', function() {
        $(this).parent().addClass('active');

        if ($(this).hasClass('clearButton') && $(this).val()) {
            const $clearBtn = $('.clear-input', $(this).parent());
            $clearBtn.removeClass('hidden');
        }
    });

    $input.rebind('blur.underlinedText change.underlinedText', function() {

        var $this = $(this);

        if ($this.hasClass('clearButton')) {
            const $clearBtn = $('.clear-input', $this.parent());
            $clearBtn.addClass('hidden');
        }

        if ($this.val()) {
            $this.parent().addClass('valued');
        }
        else {
            $this.parent().removeClass('valued');
        }
        $this.parent().removeClass('active');
    });

    // Hide error upon input changes
    var self = this;

    // Textarea with auto height
    if (this.options.autoHeight) {
        $input.rebind('input.autoHeight', (e) => {
            e.target.style.height = 0;
            e.target.style.height = `${this.options.maxHeight && parseInt(this.options.maxHeight) <=
                e.target.scrollHeight ? this.options.maxHeight : e.target.scrollHeight}px`;
        });
    }

    if (!$input.hasClass('strengthChecker')) {
        $input.rebind('input.underlinedText', function() {
            self.hideError();
        });
    }

    if (is_mobile) {

        $(window).rebind('resize.megaInputs', () => {

            const $inputs = $('.megaInputs', '.mega-input.msg');

            for (let i = $inputs.length; i--;) {

                const megaInput = $($inputs[i]).data('MegaInputs');

                if (megaInput) {
                    self.underlinedText._botSpaceCalc.call(megaInput);
                }
            }
        });
    }
};

mega.ui.MegaInputs.prototype.underlinedText._updateShowHideErrorAndMessage = function() {

    'use strict';

    /**
     * Text input - show red colored error on bottom of the underline.
     *
     * @param {String} msg - Massage to show.
     */
    this.showError = function(msg) {

        if (typeof this.options.onShowError === 'function') {
            this.options.onShowError(msg);
        }
        else {
            var $wrapper = this.$input.parent();

            this.$input.addClass('errored');
            $wrapper.addClass('error');

            this.showMessage(msg);
        }
    };

    /**
     * Text input - show gray colored message on bottom of the underline.
     *
     * @param {String} msg - Massage to show.
     * @param {Boolean} fix - Fix message, the message will not disappear.
     * @returns {Void}
     */
    this.showMessage = function(msg, fix) {

        if (typeof this.options.onShowMessage === 'function') {
            this.options.onShowMessage(msg);
        }
        else if (msg) {
            var $wrapper = this.$input.parent();
            var $msgContainer = $wrapper.find('.message-container');

            if (fix) {
                $wrapper.addClass('fix-msg');
                this.fixMessage = msg;
            }

            $wrapper.addClass('msg');
            $msgContainer.safeHTML(msg);
            this.underlinedText._botSpaceCalc.call(this);
        }
    };

    /**
     * Text input - hide error or message.
     */
    this.hideError = this.hideMessage = function(force) {

        if (typeof this.options.onHideError === 'function') {
            this.options.onHideError();
        }
        else {
            var $wrapper = this.$input.parent();

            this.$input.removeClass('errored');
            $wrapper.removeClass('error');

            if ($wrapper.hasClass('fix-msg') && !force) {
                this.showMessage(this.fixMessage);
            }
            else {
                $wrapper.removeClass('msg').removeClass('fix-msg');
                $wrapper.css('margin-bottom', '');
            }
        }
    };

    // Hide all error upon reinitialize
    this.hideError();
};

mega.ui.MegaInputs.prototype.underlinedText._halfSize = function() {

    'use strict';

    var $input = this.$input;
    var $wrapper = this.$wrapper;

    if ($input.hasClass('halfSize-l')) {
        $wrapper.addClass('halfSize-l');
    }

    if ($input.hasClass('halfSize-r')) {
        $wrapper.addClass('halfSize-r');
    }
};

mega.ui.MegaInputs.prototype.underlinedText._withIconOrPrefix = function() {

    'use strict';

    var $input = this.$input;
    var $wrapper = this.$wrapper;

    // Copy to clipboard button
    if ($input.hasClass('copyButton')) {

        const icon = is_mobile ? 'sprite-mobile-fm-mono icon-copy-thin-outline' :
            'sprite-fm-mono icon-copy-2';

        $wrapper.safeAppend(`<i class="${icon} copy-input-value"></i>`);

        const $copyBtn = $('.copy-input-value', $wrapper);

        $copyBtn.rebind('click.copyInputValue tap.copyInputValue', () => {
            copyToClipboard(
                $input.val(),
                escapeHTML(this.options.copyToastText) ||  l[371]
            );
            return false;
        });
    }

    if ($input.hasClass('clearButton')) {

        const icon = is_mobile ? 'sprite-mobile-fm-mono icon-x-thin-outline icon-size-16' :
            'sprite-fm-mono icon-close-component';

        $wrapper.safeAppend(`<i class="${icon} clear-input"></i>`);

        const $clearBtn = $('.clear-input', $wrapper);

        $clearBtn.rebind('click.clearInput tap.clearInput', () => {
            if ($input.hasClass('errored')) {
                this.hideError();
            }
            this.setValue('');
            $input.trigger('focus');
        });

        $input.rebind('keyup.clearInput input.clearInput change.clearInput', function() {
            $clearBtn[this.value.length ? 'removeClass' : 'addClass']('hidden');
        });

        if (!$input.val()) {
            $clearBtn.addClass('hidden');
        }
    }

    if (this.type === 'password') {

        const iconSprite = is_mobile ? 'sprite-mobile-fm-mono' : 'sprite-fm-mono';
        const showTextIcon = is_mobile ? 'icon-eye-thin-outline' : 'icon-eye-reveal';
        const hideTextIcon = is_mobile ? 'icon-eye-off-01-thin-outline' : 'icon-eye-hidden';

        $wrapper.safeAppend(`<i class="${iconSprite} ${showTextIcon} pass-visible"></i>`);

        $('.pass-visible', $wrapper).rebind('click.togglePassV', function() {

            if (this.classList.contains(showTextIcon)) {
                $input.attr('type', 'text');
                this.classList.remove(showTextIcon);
                this.classList.add(hideTextIcon);
            }
            else {
                $input.attr('type', 'password');
                this.classList.add(showTextIcon);
                this.classList.remove(hideTextIcon);
            }
        });
    }

    if ($input.data('icon')) {
        $wrapper.addClass('with-icon');
        $wrapper.safePrepend(`<i class="${($input.data('icon') || '')}"></i>`);
    }
    else if ($input.data('prefix')) {
        $wrapper.addClass('with-icon');
        $wrapper.safePrepend(`<span class="prefix">${$input.data('prefix')}</span>`);
    }
};

mega.ui.MegaInputs.prototype.underlinedText._strengthChecker = function() {

    'use strict';

    var $input = this.$input;
    var $wrapper = this.$wrapper;
    var self = this;

    if (this.type === 'password' && $input.hasClass('strengthChecker')) {

        // Strength wording
        $wrapper.safeAppend('<div class="account password-status hidden"></div>');

        // Strength Bar
        if (is_mobile) {
            $wrapper.safeAppend('<div class="account-pass-lines">' +
                '<div class="register-pass-status-line1"></div>' +
                '<div class="register-pass-status-line2"></div>' +
                '<div class="register-pass-status-line3"></div>' +
                '<div class="register-pass-status-line4"></div>' +
                '<div class="register-pass-status-line5"></div>' +
            '</div>');
        }
        else {
            $wrapper.safeAppend('<div class="account-pass-lines">' +
                '<div class="register-pass-status-line"></div>' +
            '</div>');
        }

        // Loading icon for zxcvbn.
        $wrapper.safeAppend('<div class="register-loading-icon">' +
            '<img alt="" src="' + staticpath + 'images/mega/ajax-loader-gray.gif" />' +
            '</div>');

        var _bindStrengthChecker = function() {

            // Hide loading icon
            $wrapper.removeClass('loading');

            $input.rebind('keyup.strengthChecker input.strengthChecker change.strengthChecker', function(e) {

                if (e.keyCode === 13) {
                    return false;
                }

                self.hideError();

                var $passStatus = $wrapper.find('.password-status');
                var $passStatusBar = $wrapper.find('.account-pass-lines');
                var $messageContainer = $('.message-container', $wrapper);

                $passStatus
                    .add($passStatusBar)
                    .add($messageContainer)
                    .removeClass('good1 good2 good3 good4 good5 checked');

                var strength = classifyPassword($(this).val());

                if (typeof strength === 'object') {

                    $passStatus.addClass(strength.className + ' checked').text(strength.string1);
                    if (is_mobile) {
                        $messageContainer.addClass(strength.className);

                        let alert = '<i class="alert sprite-mobile-fm-mono icon-info-thin-outline"></i>';
                        if (strength.className === 'good3') {
                            alert = '<i class="alert sprite-mobile-fm-mono icon-alert-circle-thin-outline"></i>';
                        }
                        else if (strength.className === 'good4' || strength.className === 'good5') {
                            alert = '<i class="alert sprite-mobile-fm-mono icon-check-circle-thin-outline"></i>';
                        }
                        $input.data('MegaInputs').showMessage(
                            `${alert} <span>${strength.string2}</span>`
                        );
                    }
                    else {
                        $input.data('MegaInputs').showMessage(strength.string2);
                    }

                    $passStatusBar.addClass(strength.className);
                }
                else {
                    $input.data('MegaInputs').hideMessage();
                }
            });

            // Show strength upon zxcvbn loading is finished or Reset strength after re-rendering.
            $input.trigger('input.strengthChecker');
        };

        if (typeof zxcvbn === 'undefined') {

            // Show loading icon
            $wrapper.addClass('loading');
            M.require('zxcvbn_js').done(_bindStrengthChecker);
        }
        else {
            _bindStrengthChecker();
        }

        $wrapper.addClass('strengthChecker');
    }
};

mega.ui.MegaInputs.prototype.underlinedText._botSpaceCalc = function() {

    'use strict';

    var $wrapper = this.$input.parent();

    if ($wrapper.hasClass('msg')) {
        if (this.origBotSpace === undefined) {
            this.origBotSpace = parseInt($wrapper.css('margin-bottom'));
        }

        $wrapper.css('margin-bottom',
                     this.origBotSpace
                     + $('.message-container', $wrapper).outerHeight()
                     + ($wrapper.hasClass('fix-msg') ? 4 : 9));
    }
};

mega.ui.MegaInputs.prototype.underlinedText._lengthChecker = function() {

    'use strict';

    var $input = this.$input;
    var $wrapper = this.$wrapper;

    const maxLength = $input.attr('maxlength');

    if ($input.hasClass('lengthChecker') && maxLength) {

        // Length section
        $wrapper.safeAppend('<div class="length-check hidden">' +
            '<span class="chars-used"></span>' +
            `<span class="char-limit">/${maxLength}</span>` +
        '</div>');

        const $lengthCheck = $('.length-check', $wrapper);

        if ($input.val().length) {
            $lengthCheck.removeClass('hidden');
            $('.chars-used', $lengthCheck).text($input.val().length);
        }

        $input.rebind('keyup.lengthChecker input.lengthChecker change.lengthChecker', (e) => {

            if (e.keyCode === 13) {
                return false;
            }

            this.hideError();

            const inputSize = $input.val().length;

            $lengthCheck.toggleClass('hidden', !inputSize);

            const $charsUsed = $('.chars-used', $wrapper);
            $charsUsed.text(inputSize);
        });
    }
};

mega.ui.MegaInputs.prototype.underlinedText._extendedFunctions = function() {

    'use strict';

    /**
     * Update title after MegaInput is already inited, if a title exists.
     * The title can be passed as parameter
     * or simply update title or placeholder on the input and call this will update title.
     *
     * @param {String} [title] - New title.
     */
    this.updateTitle = function(title) {
        const $titleElem = $('.mega-input-title', this.$input.parent());

        if ($titleElem) {
            title = title || this.$input.attr('title') || this.$input.attr('placeholder');

            // Note: This should remain as text() as some place use third party pulling text as title.
            $titleElem.text(title);
        }
    };

    /**
     * Update value of the input, with or without titletop animation.
     *
     * @param {String} [value] - New value.
     * @param {Boolean} [noAnimation] - Show animation or not.
     */
    this.setValue = function(value, noAnimation) {

        var self = this;

        if (noAnimation) {
            this.$input.prev().addClass('no-trans');
        }

        mega.ui.MegaInputs.prototype.setValue.call(this, value);

        onIdle(function() {
            self.$input.prev().removeClass('no-trans');
        });
    };
};
