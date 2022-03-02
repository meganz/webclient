/**
 * bindDropdownEvents Bind custom select event
 *
 * @param {Selector} $select  Class .dropdown elements selector
 * @param {String}   saveOption Addition option for account page only. Allows to show "Show changes" notification
 * @param {String}   classname/id of  content block for dropdown aligment
 */
function bindDropdownEvents($select, saveOption, contentBlock) {
    'use strict';

    var $dropdownItem = $('.option', $select);
    var $contentBlock = contentBlock ? $(contentBlock) : $('body');
    var $hiddenInput = $('.hidden-input', $select);

    // hidden input for keyboard search
    if (!$hiddenInput.length) {

        // Skip tab action for hidden input by tabindex="-1"
        $select.safeAppend('<input class="hidden-input" tabindex="-1" autocomplete="disabled">');
        $hiddenInput = $('input.hidden-input', $select);
    }

    $select.rebind('click.inputDropdown', function(e) {

        var $this = $(this);
        var $dropdown = $('.mega-input-dropdown', $this);
        var $hiddenInput = $('.hidden-input', $this);
        var $target = $(e.target);

        var closeDropdown = function() {
            $this.removeClass('active');
            $dropdown.addClass('hidden').removeAttr('style');
            $contentBlock.unbind('mousedown.closeInputDropdown');
            $hiddenInput.trigger('blur');
        };

        if ($this.hasClass('disabled')) {
            return false;
        }
        else if (!$this.hasClass('active')) {

            var horizontalOffset;
            var verticalOffset;
            var dropdownLeftPos;
            var dropdownBottPos;
            var dropdownHeight;
            var dropdownWidth;
            var contentBlockHeight;
            var contentBlockWidth;
            var $activeDropdownItem = $('.option[data-state="active"]', $dropdown);

            // Show select dropdown
            $('.mega-input.dropdown-input.active', 'body').removeClass('active');
            $('.active .mega-input-dropdown', 'body').addClass('hidden');
            $this.addClass('active');
            $('.option.active', $this).removeClass('active');
            $activeDropdownItem.addClass('active');
            $dropdown.removeClass('hidden');

            

            $hiddenInput.trigger('focus');

            // Dropdown position relative to the window
            horizontalOffset = $dropdown.offset().left - $contentBlock.offset().left;
            verticalOffset = $dropdown.offset().top - $contentBlock.offset().top;
            contentBlockHeight = $contentBlock.outerHeight();
            contentBlockWidth = $contentBlock.outerWidth();
            dropdownHeight = $dropdown.outerHeight();
            dropdownWidth = $dropdown.outerWidth();
            dropdownBottPos = contentBlockHeight - (verticalOffset + dropdownHeight);
            dropdownLeftPos = contentBlockWidth - (horizontalOffset + dropdownWidth);

            if (contentBlockHeight < (dropdownHeight + 20)) {
                $dropdown.css({
                    'margin-top': '-' + (verticalOffset - 10) + 'px',
                    'height': (contentBlockHeight - 20) + 'px'
                });
            }
            else if (dropdownBottPos < 10) {
                $dropdown.css({
                    'margin-top': '-' + (10 - dropdownBottPos) + 'px'
                });
            }

            if (dropdownLeftPos < 20) {
                $dropdown.css({
                    'margin-left': '-' + (10 - dropdownLeftPos) + 'px'
                });
            }

            $contentBlock.rebind('mousedown.closeInputDropdown', e => {
                var $target = $(e.target);

                if (!$this.has($target).length && !$this.is($target)) {

                    closeDropdown();
                }
            });
            var $scrollBlock = $('.dropdown-scroll', $this);

            // Dropdown scrolling initialization
            if ($scrollBlock.length) {
                if ($scrollBlock.is('.ps')) {
                    $scrollBlock.scrollTop(0);
                    Ps.destroy($scrollBlock[0]);
                }

                Ps.initialize($scrollBlock[0]);

                if ($activeDropdownItem.length) {
                    $scrollBlock.scrollTop($activeDropdownItem.position().top);
                }
            }

            $hiddenInput.trigger('focus');
        }
        else if ($target.closest('.option').length || $target.is('.option')) {
            closeDropdown();
        }
    });

    $dropdownItem.rebind('click.inputDropdown', function() {

        var $this = $(this);

        $select.removeClass('error');

        // Select dropdown item
        $('.option', $select).removeClass('active').removeAttr('data-state');
        $this.addClass('active').attr('data-state', 'active');
        $('> span', $select).text($this.text());
        $('> span', $select).removeClass('placeholder');
        $this.trigger('change');

        if (saveOption) {
            var nameLen = String($('#account-firstname').val() || '').trim().length;

            // Save changes for account page
            if (nameLen) {
                $('.save-block', $this.closest('.settings-right-block')).removeClass('hidden');
            }
        }
    });

    $dropdownItem.rebind('mouseenter.inputDropdown', function() {

        var $this = $(this);

        // If contents width is bigger than size of dropdown
        if (this.offsetWidth < this.scrollWidth) {
            $this.addClass('simpletip').attr('data-simpletip', $this.text());
        }
    });

    // Typing search and arrow key up and down features for dropdowns
    $hiddenInput.rebind('keyup.inputDropdown', function(e) {
        var charCode = e.which || e.keyCode; // ff
        var $filteredItem = {};

        if ((charCode > 64 && charCode < 91) || (charCode > 96 && charCode < 123)) {
            var inputValue = $hiddenInput.val();

            $filteredItem = $dropdownItem.filter(function() {
                return $(this).text().slice(0, inputValue.length).toLowerCase() === inputValue.toLowerCase();
            }).first();
        }
        else {
            e.preventDefault();
            e.stopPropagation();

            const $activeOption = $('.option.active', $select);
            const $current = $activeOption.length ? $activeOption :
                $('.option:not(.template)', $select).first();

            var $prev = $current.prev('.option:not(.template)');
            var $next = $current.next('.option:not(.template)');

            if (charCode === 38 && $prev.length) { // Up key
                $filteredItem = $prev;
            }
            else if (charCode === 40 && $next.length) { // Down key
                $filteredItem = $next;
            }
            else if (charCode === 13) {// Enter
                $current.trigger('click');
            }
        }

        if ($filteredItem.length) {
            const $dropdownScroll = $('.dropdown-scroll', this);
            const $scrollBlock = $dropdownScroll.length ? $dropdownScroll :
                $('.dropdown-scroll', $(this).closest('.dropdown-input'));

            $('.option.active', $select).removeClass('active');
            $filteredItem.addClass('active');

            if ($scrollBlock.length) {
                $scrollBlock.scrollTop($scrollBlock.scrollTop() + $filteredItem.position().top);
            }
        }
    });

    $hiddenInput.rebind('keydown.inputDropdown', function() {
        var $this = $(this);

        delay('dropbox:clearHidden', () => {
            // Combination language bug fixs for MacOS.
            $this.val('').trigger('blur').trigger('focus');
        }, 750);
    });
    // End of typing search for dropdowns
}

/**
 * addToMultiInputDropDownList
 *
 * Add item from token.input plugin drop down list.
 *
 * @param {String} dialog, The class name.
 * @param {Array} item An array of JSON objects e.g. { id, name }.
 *
 */
function addToMultiInputDropDownList(dialog, item) {

    'use strict';

    if (dialog) {
        $(dialog).tokenInput("addToDDL", item);
    }
}

/**
 * removeFromMultiInputDDL
 *
 * Remove item from token.input plugin drop down list.
 *
 * @param {String} dialog, The class name.
 * @param {Array} item An array of JSON objects e.g. { id, name }.
 *
 */
function removeFromMultiInputDDL(dialog, item) {

    'use strict';

    if (dialog) {
        $(dialog).tokenInput("removeFromDDL", item);
    }
}
