(function _toast(global) {
    'use strict';
    var toastTimeout;

    /**
     * Show toast notification
     * @param {String} toastClass Custom style for the notification
     * @param {String} notification The text for the toast notification
     * @param {String} [buttonLabel] Optional button label
     * @param {String} [secondButtonLabel] Optional button label
     * @param {Function} [firstButtonFunction] Optional function to be executed by btn 1
     * @param {Function} [secondButtonFunction] Optional function to be executed by btn 2
     * @param {Number} [toastTimeoutMs] Optional toast visibility timeout (default 4secs)
     * @global
     */
    global.showToast = function showToast(toastClass, notification, buttonLabel, secondButtonLabel,
        firstButtonFunction, secondButtonFunction, toastTimeoutMs) {
        var $toast = $('.toast-notification.common-toast');
        $toast.attr('class', 'toast-notification common-toast ' + toastClass)
            .find('.toast-col:first-child span').safeHTML(notification);

        $toast.addClass('visible');

        var toastTime = notification === l[16168] ? 3000 : 4000;
        if (toastTimeoutMs > 1000 && toastTimeoutMs < 15000) {
            toastTime = toastTimeoutMs;
        }

        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(function () {
            hideToast();
        }, toastTime);

        var closeSelector = '.toast-close-button';
        var btn1 = $('.common-toast .toast-button.first');
        btn1.off('click');
        if (buttonLabel) {
            $('span', btn1).safeHTML(buttonLabel);
            if (firstButtonFunction && typeof firstButtonFunction === 'function') {
                btn1.bind('click', firstButtonFunction);
            }
        }
        else {
            closeSelector += ', .common-toast .toast-button';
            $('.common-toast .toast-button.first span').safeHTML(l[726]);
        }

        var btn2 = $('.common-toast .toast-button.second');
        btn2.off('click');
        btn2.addClass('hidden');
        if (secondButtonLabel) {
            btn2.removeClass('hidden');
            $('span', btn2).safeHTML(secondButtonLabel);
            if (secondButtonFunction && typeof secondButtonFunction === 'function') {
                btn2.bind('click', secondButtonFunction);
            }
        }

        $(closeSelector)
            .rebind('click', function () {
                $('.toast-notification').removeClass('visible');
                clearTimeout(toastTimeout);
            });

        $toast.rebind('mouseover', function () {
            clearTimeout(toastTimeout);
        });

        $toast.rebind('mouseout', function () {
            toastTimeout = setTimeout(function () {
                hideToast();
            }, toastTime);
        });

    };

    global.hideToast = function hideToast() {
        $('.toast-notification.common-toast').removeClass('visible');
    };
})(self);
