
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

        // If mobile, log to see how many registrations are completed on mobile and load the cloud drive
        if (is_mobile) {
            api_req({ a: 'log', e: 99627, m: 'Completed registration on mobile webclient' });
            loadSubPage('fm');  // ToDo: change to loading the pro page when payment providers are working on mobile
        }
        else {
            // Otherwise log to see how many registrations are completed on regular webclient and load the Pro page
            api_req({ a: 'log', e: 99628, m: 'Completed registration on regular webclient' });
            loadSubPage('pro');
        }
    }
}
