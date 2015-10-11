function init_backup() {
    $('#backup_keyinput').val(a32_to_base64(u_k));
    $('#backup_keyinput').rebind('click', function() {
        $(this).select();
    });

    $('.backup-download-button').rebind('click', function() {
        var blob = new Blob([a32_to_base64(u_k)], {
            type: "text/plain;charset=utf-8"
        });
        saveAs(blob, 'MEGA-MASTERKEY.txt');
    });

    if (is_extension) {
        $('.backup-input-button').rebind('mouseover', function() {
            if (is_chrome_firefox) {
                mozSetClipboard(a32_to_base64(u_k));
            }
            else {
                $('#backup_keyinput').select();
                document.execCommand('copy');
            }
        });
    }
    else {
        $('.backup-input-button')
            .html(escapeHTML(l[63]) +
                '<object data="OneClipboard.swf" id="clipboardswf_backup" width="100%" height="26" ' +
                'type="application/x-shockwave-flash" allowscriptaccess="always">' +
                '<param name="wmode" value="transparent">' +
                '<param value="always" name="allowscriptaccess">' +
                '<param value="all" name="allowNetworkin">' +
                '<param name=FlashVars value="buttonclick=1" />' +
            '</object>');

        $('.backup-input-button').rebind('mouseover', function() {
            $('#clipboardswf_backup')[0].setclipboardtext(a32_to_base64(u_k));
        });
    }
}
