function init_backup() {
    'use strict';

    if (!window.u_k) {
        login_txt = l[1298];
        login_next = 'backup';
        loadSubPage('login');
        return false;
    }
    var key = a32_to_base64(u_k);

    $('#backup_keyinput').val(key);
    $('#backup_keyinput').rebind('click', function() {
        $(this).select();
    });

    $('.backup-download-button').rebind('click', u_savekey);

    if (is_extension || M.execCommandUsable()) {
        $('.backup-input-button').rebind('click', u_exportkey);
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
                mBroadcaster.sendMessage('keyexported');
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
