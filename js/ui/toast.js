(function _toast(global) {
    'use strict';
    var toastTimeout;

    /**
     * Show toast notification
     * @param {String} toastClass Custom style for the notification
     * @param {String} notification The text for the toast notification
     * @param {String} [buttonLabel] Optional button label
     */
    global.showToast = function showToast(toastClass, notification, buttonLabel, secondButtonLabel) {
        var $toast = $('.toast-notification.common-toast');
        $toast.attr('class', 'toast-notification common-toast ' + toastClass)
            .find('.toast-col:first-child span').safeHTML(notification);

        $toast.addClass('visible');

        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(function() {
            hideToast();
        }, 7000);

        var closeSelector = '.toast-close-button';
        if (buttonLabel) {
            $('.common-toast .toast-button.first span').safeHTML(buttonLabel);
        }
        else {
            closeSelector += ', .common-toast .toast-button';
            $('.common-toast .toast-button.first span').safeHTML(l[726]);
        }

        if (secondButtonLabel) {
            $('.common-toast .toast-button.second')
                .removeClass('hidden')
                .find('span').safeHTML(secondButtonLabel);
        }

        $(closeSelector)
            .rebind('click', function() {
                $('.toast-notification').removeClass('visible');
                clearTimeout(toastTimeout);
            });

        $toast.rebind('mouseover', function() {
            clearTimeout(toastTimeout);
        });

        $toast.rebind('mouseout', function() {
            toastTimeout = setTimeout(function() {
                hideToast();
            }, 7000);
        });
    };

    global.hideToast = function hideToast() {
        $('.toast-notification.common-toast').removeClass('visible');
    };
})(self);
