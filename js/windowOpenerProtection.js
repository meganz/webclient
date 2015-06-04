// window.opener protection
(function($) {
    $(document).delegate('a[target="_blank"]', 'click', function(e) {
        var href = $(this).attr('href');

        if(href) {
            window.safeWindowOpen(href, "_blank");

            e.preventDefault();
            return false;
        }
    });
    window.safeWindowOpen = function(url, args2, args3) {
        var win = window.open("", args2, args3);
        win.document.open();
        win.document.writeln('<script type="text/javascript">window.opener = null; window.location.replace("' + url + '");</script>');
        win.document.close();
        return win;
    };
})(jQuery);