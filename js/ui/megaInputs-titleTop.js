/*
 * Title Top text input
 *
 * Animate title/placeholder to top of input when it is focused/has value
 *
 * Please refer Megainput Core instruction to learn basic usage.
 *
 * Class: `titleTop`
 * Example: `<input class="titleTop" type="text" name="register-name" id="register-name"
 *          placeholder="[$195]" class="input-email " maxlength="190" />`
 *
 * Extension:
 * - Password Strength Checker - Show bottom bar that show strength of entered password
 *      Class: `strengthChecker`
 *      Example: `<input class="titleTop strengthChecker" type="password" name="register-password"
 *            id="register-password" class="input-password" placeholder="[$909]" />`
 *
 * - Half size - Make title top half width and float positioning, may require manually place `clear <div>`.
 *      Class: `halfSize-l` for float left, `halfSize-r` for float right
 *      Example: `<input class="titleTop halfSize-l" autocomplete="disabled" type="text" name="register-name2"
 *                id="register-firstname-registerpage2" placeholder="[$7342]" maxlength="40" />
 *                <input class="titleTop halfSize-r" autocomplete="disabled" type="text" name="register-familyname2"
 *                id="register-lastname-registerpage2" placeholder="[$7345]" maxlength="40" />`
 */
mega.ui.MegaInputs.prototype.titleTop = function() {

    'use strict';

    if (!(this.type === 'text' || this.type === 'password' ||
        this.type === 'tel' || this.type === 'number' || this.type === 'email')) {
        console.error('Class binding and input type mismatch! ' +
            'classname: titleTop, input type: ' + this.type + ', Required type: text.');
        return;
    }

    var $input = this.$input;

    this.titleTop._bindEvent.call(this);
    this.titleTop._init.call(this);

    // Dedicate functions
    this.titleTop._extendedFunctions.call(this);

    // Make sure title is always on top upon init when there is value.
    $input.trigger('blur');

    // And make sure password strength is cleared.
    if ($input.hasClass('strengthChecker')) {
        $input.trigger('input');
    }
};

mega.ui.MegaInputs.prototype.titleTop._init = function() {

    'use strict';

    var $input = this.$input;

    // Overwrite hide/show for Message/Error
    this.titleTop._updateShowHideErrorAndMessage.call(this);

    // If it is already a megaInput, html preparation does not required anymore.
    if (!$input.hasClass('megaInputs') && ($input.attr('title') || $input.attr('placeholder'))) {

        // Wrap it with another div for styling and animation
        $input.wrap('<div class="mega-input-title-ontop"></div>');

        var $wrapper = this.$wrapper = $input.parent('.mega-input-title-ontop');

        // Hide wrapper if input has hidden class
        if ($input.hasClass('hidden')) {
            $wrapper.addClass('hidden');
            $input.removeClass('hidden');
        }

        // Insert animatied title
        var title = escapeHTML($input.attr('title') || $input.attr('placeholder'));

        // Adding required sign
        title += this.required ? ' <span class="required-red">*</span>' : '';

        var titleBlock = '<div class="mega-input-title">' + title + '</div>';

        // Insert title block and error message block
        $wrapper.safePrepend(titleBlock).safeAppend('<div class="message-container"></div>');

        // Bind event for animation on title
        var $titleBlock = $input.parent().find('.title');
        $titleBlock.rebind('click.titleTop', function() {

            var $this = $(this);

            if (!$this.parent().hasClass('active')) {
                $this.next('input').trigger('focus');
            }
        });

        // Half size
        this.titleTop._halfSize.call(this);

        // Insert password strength checker
        this.titleTop._strengthChecker.call(this);

        // With icon
        this.titleTop._withIcon.call(this);

        // Add some class to wrapper
        if ($input.data('wrapper-class')) {
            $wrapper.addClass($input.data('wrapper-class'));
        }
    }
};

mega.ui.MegaInputs.prototype.titleTop._bindEvent = function() {

    'use strict';

    var $input = this.$input;

    $input.rebind('focus.titleTop', function() {
        $(this).parent().addClass('active');
    });

    $input.rebind('blur.titleTop, change.titleTop', function() {

        var $this = $(this);

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

    if (!$input.hasClass('strengthChecker')) {
        $input.rebind('input.titleTop', function() {
            self.hideError();
        });
    }
};

mega.ui.MegaInputs.prototype.titleTop._updateShowHideErrorAndMessage = function() {

    'use strict';

    /**
     * Title top - show red colored error on bottom of the underline.
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
     * Title top - show gray colored message on bottom of the underline.
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

            $wrapper.addClass('msg');
            $msgContainer.safeHTML(msg);
            if (this.origBotSpace === undefined) {
                this.origBotSpace = this.origBotSpace || parseInt($wrapper.css('margin-bottom'));
            }
            $wrapper.css('margin-bottom', this.origBotSpace + $msgContainer.outerHeight());
     
            if (fix) {
                $wrapper.addClass('fix-msg');
                this.fixMessage = msg;
            }
        }
    };

    /**
     * Title top - hide error or message.
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

mega.ui.MegaInputs.prototype.titleTop._halfSize = function() {

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

mega.ui.MegaInputs.prototype.titleTop._withIcon = function() {

    'use strict';

    var $input = this.$input;
    var $wrapper = this.$wrapper;

    if ($input.data('icon')) {
        $wrapper.addClass('with-icon');
        $wrapper.safePrepend('<i class="' + ($input.data('icon') || '') + '"></i>');
    }
};

mega.ui.MegaInputs.prototype.titleTop._strengthChecker = function() {

    'use strict';

    var $input = this.$input;
    var $wrapper = this.$wrapper;
    var self = this;

    if (this.type === 'password' && $input.hasClass('strengthChecker')) {

        // Strength Bar
        $wrapper.safeAppend('<div class="account-pass-lines">' +
            '<div class="register-pass-status-line1"></div>' +
            '<div class="register-pass-status-line2"></div>' +
            '<div class="register-pass-status-line3"></div>' +
            '<div class="register-pass-status-line4"></div>' +
            '<div class="register-pass-status-line5"></div>' +
            '<div class="clear"></div>' +
        '</div>');

        // Strength wording
        $wrapper.safeAppend('<div class="account password-status hidden"></div>');

        // Loading icon for zxcvbn.
        $wrapper.safeAppend('<div class="register-loading-icon">' +
            '<img alt="" src="' + staticpath + 'images/mega/ajax-loader-gray.gif" />' +
            '</div>');

        var _bindStrengthChecker = function() {

            // Hide loading icon
            $wrapper.removeClass('loading');

            $input.rebind('keyup.strengthChecker, input.strengthChecker, change.strengthChecker', function(e) {

                if (e.keyCode === 13) {
                    return false;
                }

                self.hideError();

                var $passStatus = $wrapper.find('.password-status');
                var $passStatusBar = $wrapper.find('.account-pass-lines');

                $passStatus.add($passStatusBar).removeClass('good1 good2 good3 good4 good5 checked');

                var strength = classifyPassword($(this).val());

                if (typeof strength === 'object') {

                    $passStatus.addClass(strength.className + ' checked').text(strength.string1);
                    $input.data('MegaInputs').showMessage(strength.string2);

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

mega.ui.MegaInputs.prototype.titleTop._extendedFunctions = function() {

    'use strict';

    /**
     * Update title after MegaInput is already inited.
     * The title can be passed as parameter
     * or simply update title or placeholder on the input and call this will update title.
     *
     * @param {String} [title] - New title.
     */
    this.updateTitle = function(title) {

        title = title || this.$input.attr('title') || this.$input.attr('placeholder');

        // Note: This should remain as text() as some place use third party pulling text as title.
        this.$input.parent().find('.mega-input-title').text(title);
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

        this.hideError();
        this.$input.val(value).trigger('change');

        onIdle(function() {
            self.$input.prev().removeClass('no-trans');
        });
    };
};
