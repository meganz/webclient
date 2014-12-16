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
        .unbind('focus.uiPlaceholder')
        .bind('focus.uiPlaceholder', function (e) {
            $(this).parent().removeClass('focused');

            if ($(this).val() == $(this).data('placeholder')) {
                $(this).val('');
            }

            if ($(this)[0].className.indexOf("password") > -1) {
                $(this)[0].type = "password";
            }
        })
        .unbind('keyup.uiPlaceholder')
        .bind('keyup.uiPlaceholder', function (e) {
            $(this).parents('.incorrect').removeClass('incorrect');
        })
        .unbind('blur.uiPlaceholder')
        .bind('blur.uiPlaceholder', function (e) {
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

var uiCheckboxes = function($scope) {
    $('.radio-txt', $scope).each(function() {
        var $label = $(this);
        var $cbxElement = $label.prev('.checkboxOn, .checkboxOff');

        var _onToggle = function() {
            if ($cbxElement.attr('class').indexOf('checkboxOn') > -1)
            {
                $cbxElement.addClass('checkboxOff');
                $cbxElement.removeClass('checkboxOn');
            }
            else
            {
                $cbxElement.addClass('checkboxOn');
                $cbxElement.removeClass('checkboxOff');
            }
        };

        $label
            .unbind('click.uiCheckboxes')
            .bind('click.uiCheckboxes', _onToggle);

        $cbxElement
            .unbind('click.uiCheckboxes')
            .bind('click.uiCheckboxes', _onToggle);

    });
};