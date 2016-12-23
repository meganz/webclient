function init_backup() {
    var key = a32_to_base64(u_k);

    $('#backup_keyinput').val(key);
    $('#backup_keyinput').rebind('click', function() {
        $(this).select();
    });

    $('.backup-download-button').rebind('click', function() {
        var blob = new Blob([key], {
            type: "text/plain;charset=utf-8"
        });
        saveAs(blob, 'MEGA-RECOVERYKEY.txt');
        if (!localStorage.recoverykey) {
            localStorage.recoverykey = 1;
            $('body').addClass('rk-saved');
        }
    });

    if (is_extension || mega.utils.execCommandUsable()) {
        $('.backup-input-button').rebind('mouseover', function() {
            $('#backup_keyinput').select();
        });
        $('.backup-input-button').rebind('click', function() {
            if (is_chrome_firefox) {
                mozSetClipboard(key);
            }
            else {
                $('#backup_keyinput').select();
                document.execCommand('copy');
            }
            if (!localStorage.recoverykey) {
                localStorage.recoverykey = 1;
                $('body').addClass('rk-saved');
            }
        });
    }
    else if (flashIsEnabled()) {
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
            var obj = $('#clipboardswf_backup')[0];
            if (obj && typeof obj.setclipboardtext === 'function') {
                obj.setclipboardtext(key);
            }
        });
    }
    else {
        // hide copy to clipboard otherwise
        var input = $('#backup_keyinput').parent();
        var header = input.prev();
        input.hide();
        header.hide();
    }
}
