/**
 * Password Manager Textarea
 */
mega.ui.MegaInputs.prototype.pmTextArea = function() {
    'use strict';

    if (!this.$input.is('textarea')) {
        console.error('Not a textarea field.');
        return;
    }

    var $textarea = this.$input;

    this.pmTextArea._bindEvent.call(this);
    this.pmTextArea._init.call(this);

    // Dedicated functions
    this.textArea._extendedFunctions.call(this);

    // Make sure title is always on top upon init when there is value.
    $textarea.trigger('blur');
};

mega.ui.MegaInputs.prototype.pmTextArea._init = function() {
    'use strict';

    var $input = this.$input;

    this.textArea._init.call(this);

    const $wrapper = this.$wrapper = $input.closest(`.mega-input`);
    $wrapper.addClass('pm box-style textarea');

    // Insert input length checker
    this.textArea._lengthChecker.call(this);

    $input.wrap(`<div class="text-area-wrapper"></div>`);
    if ($input.hasClass('optional')) {
        $('.mega-input-title .optional', this.$wrapper).remove();
        const $title = $('.mega-input-title', this.$wrapper);
        const titleText = $title.text();
        $title.text('');
        $title.safeAppend(titleText.replace('[S]', '<span class="optional">').replace('[/S]', '</span>'));
        $input.attr('title', $input.attr('title').replace('[S]', '').replace('[/S]', ''));
    }
};

mega.ui.MegaInputs.prototype.pmTextArea._bindEvent = function() {
    'use strict';

    var $input = this.$input;

    this.textArea._bindEvent.call(this);

    $input.rebind('focus.textArea', function() {
        $(this).parent().addClass('active focus');
    });

    $input.rebind('blur.textArea change.textArea', function() {
        $(this).parent().removeClass('active focus');
    });
};
