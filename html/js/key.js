
/** Initialise they keys required for operation. */
function init_key() {
    $('.key1').addClass('hidden');
    $('.key2').removeClass('hidden');

    if (typeof u_privk === 'undefined') {
        crypto_rsagenkey();
    }
    else {
        ui_keycomplete();
    }
}

/** Callback called on completion. */
function ui_keycomplete() {
    $('.key1').addClass('hidden');
    $('.key2').addClass('hidden');
    $('.key3').removeClass('hidden');

    if ((typeof (u_attr.p) !== 'undefined') && (u_attr.p >= 1 && u_attr.p <= 4)) {
        loadSubPage('fm');
    }
    else {
        localStorage.keycomplete = true;
        loadSubPage('pro');
    }
}
