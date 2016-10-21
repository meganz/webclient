/**
 * Moving all UI logic/initialisation code which you find that it would be good to be reusable here as a simple function,
 * which accepts:
 *  - first argument: jQuery element which contains the UI elements (e.g. scope)
 *  - second arg. optional: any options required for the ui to initialise the logic
 *
 *  note: this is a temp place which we will be using for the old MEGA code...for the new code, please use the ui directory.
 */

var uiPlaceholders = function($scope) {
    $('.have-placeholder', $scope)
        .rebind('focus.uiPlaceholder', function (e) {
            $(this).parent().removeClass('focused');

            if ($(this).val() == $(this).data('placeholder')) {
                $(this).val('');
            }

            if ($(this)[0].className.indexOf("password") > -1) {
                $(this)[0].type = "password";
            }
        })
        .rebind('keyup.uiPlaceholder', function (e) {
            $(this).parents('.incorrect').removeClass('incorrect');
        })
        .rebind('blur.uiPlaceholder', function (e) {
            $(this).parent().removeClass('focused');
            if ($(this).val() == '') {
                $(this).val($(this).data('placeholder'));
            }
            if ($(this)[0].className.indexOf("password") > -1 && $(this).val() == $(this).data('placeholder')) {
                $(this)[0].type = "text";
            }
        })
        .each(function () {
            if ($(this)[0].className.indexOf("password") > -1 && $(this).val() == $(this).data('placeholder')) {
                $(this)[0].type = "text";
            }
        });
};

var uiCheckboxes = function($scope, saveState, stateChangeCb) {
    $('.radio-txt', $scope).each(function() {
        var $label = $(this);
        var $cbxElement = $label.prev('.checkboxOn, .checkboxOff');
        var $input = $('input[type="checkbox"]', $cbxElement);

        var doToggle = function(state) {
            if (state) {
                $cbxElement
                    .removeClass('checkboxOff')
                    .addClass('checkboxOn')
                    .trigger('onFakeCheckboxChange', [true]);
            }
            else {
                $cbxElement
                    .removeClass('checkboxOn')
                    .addClass('checkboxOff')
                    .trigger('onFakeCheckboxChange', [false]);
            }

            if (saveState) {
                if (state) {
                    localStorage[saveState] = 1;
                }
                else {
                    delete localStorage[saveState];
                }
            }
            if (stateChangeCb) {
                stateChangeCb(state);
            }
        };

        var _onToggle = function() {
            if ($cbxElement.hasClass('checkboxOn')) {
                doToggle();
                $input.removeAttr('checked');
            }
            else {
                doToggle(true);
                $input.attr('checked', true);
            }
            return false;
        };

        $label.rebind('click.uiCheckboxes', _onToggle);
        $cbxElement.rebind('click.uiCheckboxes', _onToggle);

        $input.rebind('change.uiCheckboxes', function() {
            doToggle($(this).attr('checked'));
        });
    });

    return $scope;
};
