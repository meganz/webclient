/**
 * https://github.com/keithhackbarth/jquery-window-active
 */


$.windowActive = true;

$.isWindowActive = function () {
    return $.windowActive;
};

$(window).bind("mousemove", function() {
    if(!$.windowActive) {
        $.windowActive = true;
    }
});
$(window).focus(function() {
    $.windowActive = true;
});

$(window).blur(function() {
    $.windowActive = false;
});