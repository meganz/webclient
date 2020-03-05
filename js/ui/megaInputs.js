/**
 * MegaInput Core
 *
 * MegaInput is designed to unify inputs across the website give developer to an input with flexiblilty,
 * maintainability and easily control when they trying to create a new input.
 *
 * By doing this we can achieve,
 * - Design unification across the website
 * - Less hassle on maintenance for inputs
 * - Standise coding practice.
 * - Reduce amount of duplicate or similar code.
 *
 * MegaInput is planed to expand to cover all sorts of inputs on the Mega Webclient, such as text, textarea, radio,
 * checkbox, dropdown, buttons, numbers, etc.
 *
 * Class and prototype is located under `mega.ui`.
 *
 * Every original event binding on the input will not be revoke by MegaInput initialization,
 * it keeps original input element and just modify wrapper.
 * Devs please aware above when you start new extension.
 * So user do not need to worried about binding order, BUT need to be careful with parent selection in binded function,
 * due to it can be modified structually by MegaInputs.
 *
 * How to use:
 *
 * - How to create a new input
 *
 *   1. Create an input on html, adding classname for the custom styles as you required
 *
 *      e.g. `<input class="titleTop" type="text" name="register-name" id="register-name" placeholder="[$195]"
 *            class="input-email " maxlength="190" />`
 *
 *   1.1 You can use extension for custom style by adding classname of the extension
 *
 *      e.g. `<input class="titleTop strengthChecker" type="password" name="register-password"
 *            id="register-password" class="input-password" placeholder="[$909]" />`
 *
 *      For Devs, when code extension, please leave a comment about what is class name for it,
 *      and an example html to help other people to get info for your extension.
 *      To see an example for the comment please refer megaInputs-titletop.js.
 *
 *   2. Select eletment with jquery and call as following:
 *
 *      `var megaInput = new mega.ui.MegaInputs($input);`
 *
 *   $input can be array of inputs as well. This will return array of megaInput objects.
 *   megaInput object is the actually object controller for the megaInput.
 *
 *   3. If you can see `megaInputs` class added on the input, it is ready.
 *
 * - How to control MegaInputs already setup.
 *
 *   - First initialization returns the MegaInputs object. You can use it to control the item.
 *
 *     OR
 *
 *   - You can select dom element with jQuery selector and can call data attribute for it to get
 *     the MegaInput object for the element.
 *
 *       `var megaInput = $(elem).data('MegaInputs')`
 *
 *     With it you can modify/call function that is binded on it.
 *     But please do not forget about sanity check this to avoid exception.
 *     And vice versa is possible as well, with MegaInputs object you can find it's input and directly using it like:
 *
 *      `megaInputs.$input.rebind('focus', function(){ -do you thing here- })`
 *
 *   - By setup showMessage, hideMessage, showError, hideError, you can call it with MegaInputs object like:
 *
 *      `$input.data('MegaInputs').showError('-YOUR-MASSAGE-'')`
 *      `$input.data('MegaInputs').hideError()`
 *
 *      There is two way to setup these functions.
 *
 *          1. Pass it on options once MegaInput is inited by using options variable
 *
 *              `var megaInput = new mega.ui.MegaInputs($input, {
 *                  onShowError: function(msg) {
 *                      ---do your thing---
 *                  }
 *              });`
 *
 *          2. Setup on extension code and override original (Please refer titleTop as example)
 *
 *   - Similar way as above, you can setup event binding on the input.
 *
 *          1. Pass it on options once MegaInput is inited by using options variable
 *
 *              `var megaInput = new mega.ui.MegaInputs($input, {
 *                  onFocus: function(e) {
 *                      ---do your thing---
 *                  }
 *              });`
 *
 *          2. Setup on extension code and override original (Please refer titleTop as example)
 *
 *  - Mark input as required
 *      You can add `requried` class on input to mark it as required. Extension will handle required on it's own way.
 *
 * MegaInputs extensions:
 *  - TEXT: Titletop - megaInputs-titleTop.js
 */

(function($, scope) {

    'use strict';

    /**
     * MegaInputs
     * @constructor
     * @param {Object} $input - jQuery object of target input element.
     * @param {Object} [options] addon options upon initialization.
     *
     * @return {Object} megaInput - Created MegaInput object
     */
    var MegaInputs = function($input, options) {
        if (!(this instanceof MegaInputs)) {
            return new MegaInputs($input, options);
        }

        if (!$input || !$input.length) {
            if (d) {
                console.debug('MegaInputs: nothing to apply here...', $input);
            }
            return;
        }

        // Support if $input is multiple elements
        if ($input.length > 1) {
            var inputArray = [];
            for (var i = $input.length - 1; i >= 0; i--) {
                inputArray.push(new mega.ui.MegaInputs($($input[i]), options));
            }

            return inputArray;
        }

        this.$input = $input;
        this.type = $input.attr('type') || 'text';
        this.classes = this.$input.attr("class") ? this.$input.attr("class").split(/\s+/) : [];
        this.options = options || {};
        this.required = $input.hasClass('required');

        var self = this;

        // Bind class as a jQuery element's data attribute, so it can be called with the $ object
        this.$input.data('MegaInputs', this);

        this._bindEvent();

        // Class specified event bind
        self.classes.forEach(function(c) {
            if (typeof self[c] === 'function') {
                self[c]();
            }
        });

        // Add MegaInput class to show it is megaInput
        this.$input.addClass('megaInputs');
    };

    /*
     * General MegaInput Features
     */
    MegaInputs.prototype._bindEvent = function() {

        var self = this;

        // Bind option events
        if (typeof self.options.onFocus === 'function') {
            self.$input.rebind('focus.megaInputs', self.options.onFocus);
        }

        if (typeof self.options.onBlur === 'function') {
            self.$input.rebind('blur.megaInputs', self.options.onBlur);
        }

        if (typeof self.options.onClick === 'function') {
            self.$input.rebind('click.megaInputs', self.options.onClick);
        }
    };

    // Red colored Message
    MegaInputs.prototype.showError = function(msg) {

        if (typeof this.options.onShowError === 'function') {
            this.options.onShowError(msg);
        }
        else {
            if (d) {
                console.warn('MegaInputs: There is no onShowError options given.');
            }
        }
    };

    // Non-colored Message
    MegaInputs.prototype.showMessage = function(msg) {

        if (typeof this.options.onShowMessage === 'function') {
            this.options.onShowMessage(msg);
        }
        else {
            if (d) {
                console.warn('MegaInputs: There is no showMessage options given.');
            }
        }
    };

    // Non-colored Message
    MegaInputs.prototype.hideError = MegaInputs.prototype.hideMessage = function() {

        if (typeof this.options.onHideError === 'function') {
            this.options.onHideError();
        }
        else {
            if (d) {
                console.warn('MegaInputs: There is no onHideError options given.');
            }
        }
    };

    // Export
    scope.mega = scope.mega || {};
    scope.mega.ui = scope.mega.ui || {};
    scope.mega.ui.MegaInputs = MegaInputs;

})(jQuery, window);

/*
 * MegaInputs related functions with sanity check with original functions to prevent exception
 */

/**
 * MegaInputs show error with sanity check.
 *
 * @param {String} msg - Massage to show.
 */
$.fn.megaInputsShowError = function(msg) {

    'use strict';

    var megaInput = $(this).data('MegaInputs');

    if (megaInput) {
        megaInput.showError(msg);
    }
    else {
        if (d) {
            console.warn('MegaInputs: Sorry this is not MegaInput or the MegaInput is not initialized.', this);
        }
    }

    return this;
};

/**
 * MegaInputs hide error with sanity check.
 *
 * @param {String} msg - Massage to show.
 */
$.fn.megaInputsShowMessage = function(msg) {

    'use strict';

    var megaInput = $(this).data('MegaInputs');

    if (megaInput) {
        megaInput.showMessage(msg);
    }
    else {
        if (d) {
            console.warn('MegaInputs: Sorry this is not MegaInput or the MegaInput is not initialized.', this);
        }
    }
};

/**
 * MegaInputs Hide message and error with sanity check.
 */
$.fn.megaInputsHideError = $.fn.megaInputsHideMessage = function() {

    'use strict';

    var megaInput = $(this).data('MegaInputs');

    if (megaInput) {
        megaInput.hideError();
    }
    else {
        if (d) {
            console.warn('MegaInputs: Sorry this is not MegaInput or the MegaInput is not initialized.', this);
        }
    }
};
