mega.ui.MegaInputs.prototype.pmText = function() {

    'use strict';

    if (!(this.type === 'text' || this.type === 'password' ||
        this.type === 'tel' || this.type === 'number' || this.type === 'email')) {
        console.error('Class binding and input type mismatch! ' +
            'classname: mega-input, input type: ' + this.type + ', Required type: text.');
        return;
    }

    var $input = this.$input;

    this.pmText._bindEvent.call(this);
    this.pmText._init.call(this);

    // Dedicate functions
    this.underlinedText._extendedFunctions.call(this);

    // Make sure title is always on top upon init when there is value.
    $input.trigger('blur');

    // And make sure password strength is cleared.
    if ($input.hasClass('strengthChecker')) {
        $input.trigger('input');
    }
};

mega.ui.MegaInputs.prototype.pmText._init = function() {

    'use strict';

    var {$input} = this;

    // Overwrite hide/show for Message/Error
    this.pmText._updateShowHideErrMsg.call(this);

    // If it is already a megaInput, html preparation does not required anymore.
    if (!$input.hasClass('megaInputs')) {

        const hasTitle = !$input.hasClass('no-title-top') && ($input.attr('title') || $input.attr('placeholder'));
        const wrapperClass = hasTitle ? 'title-ontop' : '';

        // Wrap it with another div for styling and animation
        $input.wrap(`<div class="mega-input pm box-style ${wrapperClass}"></div>`);

        const $wrapper = this.$wrapper = $input.parent();

        // Hide wrapper if input has hidden class
        if ($input.hasClass('hidden')) {
            $wrapper.addClass('hidden');
            $input.removeClass('hidden');
        }

        if (hasTitle) {
            // Insert animated title
            let title = escapeHTML($input.attr('title') || $input.attr('placeholder'));

            // Adding required sign
            title += this.required ? ' <span class="required-red">*</span>' : '';

            if ($input.hasClass('optional')) {
                title = title.replace('[S]', '<span class="optional">').replace('[/S]', '</span>');
                $input.attr('title', $input.attr('title').replace('[S]', '').replace('[/S]', ''));
            }

            const titleBlock = `<div class="mega-input-title">${title}</div>`;

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
        this.pmText._strengthChecker.call(this);

        // With icon or prefix (e.g. currency)
        this.pmText._withIconOrPrefix.call(this);

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

mega.ui.MegaInputs.prototype.pmText._bindEvent = function() {

    'use strict';

    var $input = this.$input;

    $input.rebind('keyup.underlinedText input.underlinedText', function() {
        if ($(this).hasClass('clearButton')) {
            const $clearBtn = $('.clear-input', $(this).parent());
            // show clear button only if input is not empty or spacebar is clicked at the start
            $clearBtn[$(this).val() && $(this).is(':focus') ? 'removeClass' : 'addClass']('hidden');
        }

        if (this.type === 'password') {
            const $pwdBtn = $('.pass-visible', $(this).parent());
            $pwdBtn[$(this).val() ? 'removeClass' : 'addClass']('hidden');
        }
    });

    $input.rebind('focus.underlinedText', function() {
        $(this).parent().addClass('active focus');

        if ($(this).hasClass('clearButton')) {
            const $clearBtn = $('.clear-input', $(this).parent());
            // show clear button only if input is not empty or spacebar is clicked at the start
            $clearBtn[$(this).val() ? 'removeClass' : 'addClass']('hidden');
        }
    });

    $input.rebind('blur.underlinedText', function() {

        var $this = $(this);

        if ($this.hasClass('clearButton') && !$this.val() || !$(this).parent().hasClass('search-bar')) {
            const $clearBtn = $('.clear-input', $this.parent());
            $clearBtn.addClass('hidden');
        }

        if (this.type === 'password') {
            const $pwdBtn = $('.pass-visible', $(this).parent());
            $pwdBtn[$(this).val().length ? 'removeClass' : 'addClass']('hidden');
        }

        if ($this.hasClass('trim')) {
            $this.val($this.val().trim());
        }

        if ($this.val()) {
            $this.parent().addClass('valued');
        }
        else {
            $this.parent().removeClass('valued');
        }

        $this.parent().removeClass('active focus');
    });

    // Textarea with auto height
    if (this.options.autoHeight) {
        $input.rebind('input.autoHeight', (e) => {
            e.target.style.height = 0;
            e.target.style.height = `${this.options.maxHeight && parseInt(this.options.maxHeight) <=
                e.target.scrollHeight ? this.options.maxHeight : e.target.scrollHeight}px`;
        });
    }

    // On input change, hide any warning or error styles/messages,
    // and restore info message if present
    if (!$input.hasClass('strengthChecker')) {
        $input.rebind('input.pmText', () => {
            let cleaned = false;
            if (this.$wrapper.hasClass('warning')) {
                this.hideMessage();
                this.$wrapper.removeClass('warning');
                cleaned = true;
            }
            if (this.$wrapper.hasClass('error')) {
                this.hideError();
                cleaned = true;
            }
            if (cleaned && this.$wrapper.hasClass('info')) {
                this.showInfoMessage();
            }
        });
    }
};


mega.ui.MegaInputs.prototype.pmText._withIconOrPrefix = function() {

    'use strict';

    var $input = this.$input;
    var $wrapper = this.$wrapper;

    // Copy to clipboard button
    if ($input.hasClass('copyButton')) {

        const icon = 'sprite-pm-mono icon-copy-thin-outline';

        $wrapper.safeAppend(`<i class="${icon} copy-input-value icon"></i>`);

        const $copyBtn = $('.copy-input-value', $wrapper);

        const copyButton = () => {
            mega.ui.pm.utils.copyPMToClipboard(
                $input.val(),
                this.options.copyToastText ? escapeHTML(this.options.copyToastText) : l.clipboard_copied
            );
        };

        $copyBtn.rebind('click.copyInputValue tap.copyInputValue', () => {
            copyButton();
        });

        $input.rebind('keyup.copyInputValue', (e) => {
            if (e.keyCode === 13) {
                copyButton();
                $input.trigger('focus');
            }
        });
    }

    if ($input.hasClass('clearButton')) {
        const icon = 'sprite-fm-mono icon-dialog-close-thin';

        $wrapper.safeAppend(`<i class="${icon} clear-input icon"></i>`);

        const $clearBtn = $('.clear-input', $wrapper);

        $clearBtn.rebind('mousedown.clearInput click.clearInput tap.clearInput ', () => {
            $input.trigger('focus');

            if ($input.hasClass('errored')) {
                this.hideError();
                if (this.$wrapper.hasClass('info')) {
                    this.showInfoMessage();
                }
            }
            this.setValue('');
        });
    }

    if ($input.hasClass('external-link')) {
        const icon = 'sprite-pm-mono icon-external-link-thin-outline';

        $wrapper.safeAppend(`<i class="${icon} external-link icon"></i>`);

        const $externalLinkBtn = $('.external-link', $wrapper);

        const openUrl = () => {
            let url = $input.val();
            const matches = /^(https?:\/{2})?(?:[\w#%+.:=@~-]{2,256}\.[a-z]{2,6}|(?:\d{1,3}.?){4})\b[\w#%&+./:=?@~-]*$/
                .exec(url);
            if (matches && typeof matches[1] === 'undefined') {
                url = `https://${url}`;
            }
            window.open(url, '_blank', 'noopener,noreferrer');
        };

        $externalLinkBtn.rebind('click.externalLink tap.externalLink', () => {
            openUrl();
            return false;
        });

        $input.rebind('keyup.externalLink', (e) => {
            if (e.keyCode === 13) {
                openUrl();
            }
        });
    }

    if (this.type === 'password') {
        const iconSprite = 'sprite-fm-mono';
        const showTextIcon = 'icon-eye-reveal1';
        const hideTextIcon = 'icon-eye-hidden1';

        $wrapper.safeAppend(`<i class="${iconSprite} ${showTextIcon} pass-visible
            ${this.options.iconClass || 'icon'}"></i>`);

        const $pwdBtn = $('.pass-visible', $wrapper);

        $pwdBtn.rebind('click.togglePassV', function() {
            const wrapper = $wrapper.get(0);
            const viewPassword = wrapper.querySelector('.password-colorized');

            if (this.classList.contains(showTextIcon)) {
                if ($input.hasClass('colorized-password')) {
                    viewPassword.classList.remove('hidden');
                }
                else {
                    $input.attr('type', 'text');
                }
                this.classList.remove(showTextIcon);
                this.classList.add(hideTextIcon);
            }
            else {
                if ($input.hasClass('colorized-password')) {
                    viewPassword.classList.add('hidden');
                }
                else {
                    $input.attr('type', 'password');
                }
                this.classList.add(showTextIcon);
                this.classList.remove(hideTextIcon);
            }
        });

        if ($input.hasClass('colorized-password')) {
            const wrapper = $wrapper.get(0);
            const viewPassword = document.createElement('div');
            viewPassword.className = 'password-colorized hidden';
            wrapper.appendChild(viewPassword);

            $input.rebind('input.colorizedPassword change.colorizedPassword', () => {
                const viewPassword = wrapper.querySelector('.password-colorized');
                viewPassword.textContent = '';
                viewPassword.appendChild(mega.ui.pm.utils.colorizedPassword($input.val()));
            });
        }
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

mega.ui.MegaInputs.prototype.pmText._strengthChecker = function() {

    'use strict';

    var {$input, $wrapper} = this;
    const wrapperElement = $wrapper.get(0);

    if (this.type === 'password' && $input.hasClass('strengthChecker')) {

        // Strength wording
        $wrapper.safeAppend('<div class="account password-status">' +
            '<span class="strength-icon"></span>' +
            '<span class="strength-text px-2"></span>' +
            '</div>');

        var _bindStrengthChecker = () => {

            // Hide loading icon
            $wrapper.removeClass('loading');

            $input.rebind('keyup.strengthChecker input.strengthChecker change.strengthChecker', e => {

                if (e.keyCode === 13) {
                    return false;
                }

                this.hideError();

                var $passStatus = $('.password-status', $wrapper);
                var strengthIcon = wrapperElement.querySelector('.strength-icon');
                var strengthText = wrapperElement.querySelector('.strength-text');

                $passStatus.removeClass('weak strong moderate checked');
                $wrapper.removeClass('checked');

                strengthIcon.classList
                    .remove('icon-check-circle-thin-outline',
                            'icon-alert-circle-thin-outline',
                            'icon-alert-triangle-thin-outline');

                const strength = MegaUtils.classifyPMPassword($input.val());

                if (typeof strength === 'object') {
                    $passStatus.addClass(`${strength.className} checked`);
                    $wrapper.addClass('checked');
                    strengthIcon.className = strength.icon;
                    strengthText.textContent = strength.string1;
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

mega.ui.MegaInputs.prototype.pmText._botSpaceCalc = function() {

    'use strict';

    var $wrapper = this.$input.parent();
    const form = this.$input.first().closest('form')[0];

    if ($wrapper.hasClass('msg')) {
        if (this.origBotSpace === undefined) {
            this.origBotSpace = parseInt($wrapper.css('margin-bottom'));
        }

        $wrapper.css('margin-bottom',
                     this.origBotSpace
                     + $('.message-container', $wrapper).outerHeight());

        if (form && form.classList.contains('mega-pm-save-dialog-form')) {
            $wrapper.css('margin-bottom', 48);
        }
    }
};

mega.ui.MegaInputs.prototype.pmText._updateShowHideErrMsg = function() {

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
            var $msgContainer = $('.message-container', $wrapper);

            if (fix) {
                $wrapper.addClass('fix-msg');
                this.fixMessage = msg;
            }

            $wrapper.addClass('msg');
            $msgContainer.safeHTML(msg);
            this.pmText._botSpaceCalc.call(this);
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

    /**
     * Display an informational message below the input's underline.
     *
     * @param {String} msg - The informational message to display.
     * @returns {Void}
     */
    this.showInfoMessage = function(msg) {

        if (typeof this.options.onShowInfoMessage === 'function') {
            this.options.onShowInfoMessage(msg);
        }
        else {
            if (msg) {
                this.infoMsg = msg;
            }

            this.showMessage(this.infoMsg);
            this.$wrapper.addClass('info');
        }
    };
};
