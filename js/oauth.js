(() => {

    'use strict';

    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));

    const data = {
        code: params.get('code') || hashParams.get('code'),
        state: params.get('state'),
        error: params.get('error') || hashParams.get('error_description'),
    };

    if (!opener) {
        console.error('The window\'s opener was not provided. Cannot continue authorisation.');
        return;
    }

    opener.postMessage(data, window.location.origin);
    close();
})();
