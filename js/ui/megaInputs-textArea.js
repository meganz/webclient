/*
 * Textarea input
 *
 * Optionally, animate title/placeholder to top of input when it is focused/has value
 *
 * Please refer to the Megainput Core instructions to learn basic usage.
 *
 * Class: `textArea`
 * Example: `<textarea class="textArea input-name" name="register-name" id="register-name"
 *          placeholder="[$195]" maxlength="1000" />`
 *
 * Extensions:
 * - Length Checker - Show number of characters entered below textarea if it has a limit (no-of-chars / limit)
 *      Class: `lengthChecker`
 *      Example: `<textarea class="textArea lengthChecker input-name" name="register-name" id="register-name"
 *          placeholder="[$195]" maxlength="1000" />`
 *
 * - Clear button - Simple extension of adding clear button on right side of textarea
 *      Class: `clearButton`
 *      Example: `<textarea class="textArea clearButton"/>`
 */
mega.ui.MegaInputs.prototype.textArea = function() {

    'use strict';

    if (!this.$input.is('textarea')) {
        console.error('Not a textarea field.');
        return;
    }

    var $textarea = this.$input;

    this.textArea._bindEvent.call(this);
    this.textArea._init.call(this);

    // Dedicated functions
    this.textArea._extendedFunctions.call(this);

    // Make sure title is always on top upon init when there is value.
    $textarea.trigger('blur');
};

mega.ui.MegaInputs.prototype.textArea._init = function() {

    'use strict';

    var $input = this.$input;

    // Overwrite hide/show for Message/Error
    this.textArea._showHideErrorAndMsg.call(this);

    // If it is already a megaInput, html preparation does not required anymore.
    if (!$input.hasClass('megaInputs')) {

        const hasTitle = !$input.hasClass('no-title-top') && ($input.attr('title') || $input.attr('placeholder'));
        const wrapperClass = hasTitle ? 'title-ontop' : '';

        // Wrap it with another div for styling and animation
        $input.wrap(`<div class="mega-input ${wrapperClass}"></div>`);

        const $wrapper = this.$wrapper = $input.closest(`.mega-input`);
        $wrapper.addClass('textarea');

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

            if ($input.hasClass('optional')) {
                title += `<span class="optional">${l[7347]}</span>`;
            }

            const titleBlock = '<div class="mega-input-title">' + title + '</div>';

            // Insert title block
            $wrapper.safePrepend(titleBlock);

            // Bind event for animation on title
            const $titleBlock = $('.title', $input.parent());
            $titleBlock.rebind('click.textArea', function() {

                const $this = $(this);

                if (!$this.parent().hasClass('active')) {
                    $this.next('input').trigger('focus');
                }
            });
        }

        // Insert error message block
        $wrapper.safeAppend('<div class="message-container mega-banner"></div>');

        // With clear button
        this.textArea._withClearButton.call(this);

        // Insert input length checker
        this.textArea._lengthChecker.call(this);

        // Add some class to wrapper
        if ($input.data('wrapper-class')) {
            $wrapper.addClass($input.data('wrapper-class'));
        }
    }
};

mega.ui.MegaInputs.prototype.textArea._bindEvent = mega.ui.MegaInputs.prototype.underlinedText._bindEvent;

mega.ui.MegaInputs.prototype.textArea._showHideErrorAndMsg =
    mega.ui.MegaInputs.prototype.underlinedText._updateShowHideErrorAndMessage;

mega.ui.MegaInputs.prototype.textArea._withClearButton = function() {

    'use strict';

    var $input = this.$input;
    var $wrapper = this.$wrapper;

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
};

mega.ui.MegaInputs.prototype.textArea._lengthChecker = mega.ui.MegaInputs.prototype.underlinedText._lengthChecker;

mega.ui.MegaInputs.prototype.textArea._extendedFunctions =
    mega.ui.MegaInputs.prototype.underlinedText._extendedFunctions;
