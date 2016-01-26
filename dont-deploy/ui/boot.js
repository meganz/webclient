window.tempStaticpath = "../../../";
localStorage.dd = localStorage.d = localStorage.jj = 1;


var ids = 0;


window.mega_custom_boot_fn = function() {
    $('#loading').hide();
    $('body, html').css({
        'overflow': 'scroll',
        'height': 'auto'
    });

    $('#app').wrap('<div class="conversationsApp"></div>');

};


window.reloadCSS = function(file) {
    $('link[type="text/css"][href*="blob"]').after(
        $('<link type="text/css" rel="stylesheet" href="' + file + '" />')
    );
};
if(localStorage.autoReloadCSS) {
    var prev = "";
    setInterval(function () {
        var file = '/css/style.css' + '?r=' + (new Date().getTime() / 1000);
        $.get(file, function(r) {
            if(r != prev) {
                $('link[type="text/css"][href*="css"]').attr('href', file);
            }
            prev = r;
        })
    }, 1500);
}
