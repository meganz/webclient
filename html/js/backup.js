function init_backup() {
    'use strict';

    if (!window.u_k) {
        login_txt = l[1298];
        login_next = 'keybackup';
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
    else {
        // hide copy to clipboard otherwise
        var input = $('#backup_keyinput').parent();
        var header = input.prev();
        input.hide();
        header.hide();
    }
}
