/**
 * https://github.com/keithhackbarth/jquery-window-active
 */


$.windowActive = true;

$.isWindowActive = function () {
    return $.windowActive;
};

$(window).focus(function() {
    $.windowActive = true;
});

$(window).blur(function() {
    $.windowActive = false;
});