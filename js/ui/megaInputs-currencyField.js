/*
 * Currency input
 *
 * Please refer to Megainput Core instruction to learn basic usage.
 *
 * Class: `currencyField`
 * Example: `<input class="currencyField" name="redeem-amount" id="redeem-amount" value="1234.56"/>`
 */
mega.ui.MegaInputs.prototype.currencyField = function() {
    'use strict';

    if (!this.$input.hasClass('megaInputs')) {

        this.currencyField._init.call(this);
        this.currencyField._bindEvent.call(this);

        // Dedicate functions
        this.currencyField._extendedFunctions.call(this);
    }
};

mega.ui.MegaInputs.prototype.currencyField._init = function() {

    'use strict';

    // Wrap it with another div for styling and animation
    this.$input.wrap(`<div class="mega-input"></div>`);

    const $wrapper = this.$wrapper = this.$input.closest(`.mega-input`);

    // Hide wrapper if input has hidden class
    if (this.$input.hasClass('hidden')) {
        $wrapper.addClass('hidden');
        this.$input.removeClass('hidden');
    }

    // Insert error message block
    $wrapper.safeAppend('<div class="message-container mega-banner"></div>');

    // Add some class to wrapper
    if (this.$input.data('wrapper-class')) {
        $wrapper.addClass(this.$input.data('wrapper-class'));
    }

    // With icon or prefix (e.g. currency)
    this.currencyField._withIconOrPrefix.call(this);

    // Prepare the currency input
    if (formatCurrency(1111.11, 'EUR', 'number').indexOf(',') >= 4) {

        this.type = 'text';
        this.$input.removeAttr('step');
    }
    else {
        this.type = 'number';
        this.$input.attr('step', 'any');
    }

    this.$input.attr('type', this.type);
};

mega.ui.MegaInputs.prototype.currencyField._bindEvent = function() {

    'use strict';

    this.$input.rebind('focus.currencyField', function() {
        $(this).parent().addClass('active');
    });

    this.$input.rebind('blur.currencyField change.currencyField', function() {
        const $this = $(this);

        if ($this.val()) {
            $this.parent().addClass('valued');
        }
        else {
            $this.parent().removeClass('valued');
        }
        $this.parent().removeClass('active');
    });

    this.$input.off('keydown.currencyField');

    if (this.type === 'text') {

        this.$input.rebind('keydown.currencyField', e => {

            // Valid keys 0-9/keypad 0-9/,/./decimal point/space/left arrow/right arrow/delete/backspace/tab/shift
            if (![8, 9, 16, 32, 37, 39, 46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57,
                  96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 110, 188, 190].includes(e.keyCode)) {
                return false;
            }
        });
    }
};

mega.ui.MegaInputs.prototype.currencyField._withIconOrPrefix = function() {

    'use strict';

    var {$input, $wrapper} = this;

    if ($input.data('icon')) {
        $wrapper.addClass('with-icon');
        $wrapper.safePrepend(`<i class="${$input.data('icon') || ''}"></i>`);
    }
    else if ($input.data('prefix')) {
        $wrapper.addClass('with-icon');
        $wrapper.safePrepend(`<span class="prefix">${$input.data('prefix')}</span>`);
    }
};

mega.ui.MegaInputs.prototype.currencyField._extendedFunctions = function() {

    'use strict';

    this.getValue = function() {

        let val = this.$input.val();

        if (this.type === 'text') {

            const matches = val.match(/([,.])\d*$/);
            let cents = 0;

            if (matches) {

                cents = parseInt(matches[0].slice(1));

                if (isNaN(cents)) {
                    cents = 0;
                }
                else {
                    let centLength = matches[0].slice(1).length;

                    if (centLength === 1) {

                        ++centLength;
                        cents *= 10;
                    }

                    let decimal = centLength - 2;

                    while (decimal > 0) {
                        cents *= 0.1;
                        decimal--;
                    }

                    cents = Math.round(cents);
                }

                val = val.slice(0, val.length - matches[0].length);
            }

            val = parseInt(val.replace(/\D/g, ''));

            if (isNaN(val)) {
                return 0;
            }

            return val + cents * 0.01;
        }

        return val;
    };
};
