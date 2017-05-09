/**
 * Handle a redirect from the mega.co.nz/#pro page to mega.nz/#pro page
 * and keep the user logged in at the same time
 */
MegaData.prototype.transferFromMegaCoNz = function() {
    // Get site transfer data from after the hash in the URL
    var urlParts = /sitetransfer!(.*)/.exec(window.location);

    if (urlParts) {

        try {
            // Decode from Base64 and JSON
            urlParts = JSON.parse(atob(urlParts[1]));
        }
        catch (ex) {
            console.error(ex);
            loadSubPage('login');
            return false;
        }

        if (urlParts) {
            // If the user is already logged in here with the same account
            // we can avoid a lot and just take them to the correct page
            if (JSON.stringify(u_k) === JSON.stringify(urlParts[0])) {
                loadSubPage(urlParts[2]);
                return false;
            }

            // If the user is already logged in but with a different account just load that account instead. The
            // hash they came from e.g. a folder link may not be valid for this account so just load the file manager.
            else if (u_k && (JSON.stringify(u_k) !== JSON.stringify(urlParts[0]))) {
                if (!urlParts[2] || String(urlParts[2]).match(/^fm/)) {
                    loadSubPage('fm');
                    return false;
                }
                else {
                    loadSubPage(urlParts[2]);
                    return false;
                }
            }

            // Likely that they have never logged in here before so we must set this
            localStorage.wasloggedin = true;
            u_logout();

            // Get the page to load
            var toPage = String(urlParts[2] || 'fm').replace('#', '');

            // Set master key, session ID and RSA private key
            u_storage = init_storage(sessionStorage);
            u_k = urlParts[0];
            u_sid = urlParts[1];
            if (u_k) {
                u_storage.k = JSON.stringify(u_k);
            }

            loadingDialog.show();

            var _goToPage = function() {
                loadingDialog.hide();
                loadSubPage(toPage);
            };

            var _rawXHR = function(url, data, callback) {
                mega.utils.xhr(url, JSON.stringify([data]))
                    .always(function(ev, data) {
                        var resp;
                        if (typeof data === 'string' && data[0] === '[') {
                            try {
                                resp = JSON.parse(data)[0];
                            }
                            catch (ex) {
                            }
                        }
                        callback(resp);
                    });
            }

            // Performs a regular login as part of the transfer from mega.co.nz
            _rawXHR(apipath + 'cs?id=0&sid=' + u_sid, {'a': 'ug'}, function(data) {
                var ctx = {
                    checkloginresult: function(ctx, result) {
                        u_type = result;
                        if (toPage.substr(0, 1) === '!' && toPage.length > 7) {
                            _rawXHR(apipath + 'cs?id=0&domain=meganz',
                                {'a': 'g', 'p': toPage.substr(1, 8)},
                                function(data) {
                                    if (data) {
                                        dl_res = data;
                                    }
                                    _goToPage();
                                });
                        }
                        else {
                            _goToPage();
                        }
                    }
                };
                if (data) {
                    api_setsid(u_sid);
                    u_storage.sid = u_sid;
                    u_checklogin3a(data, ctx);
                }
                else {
                    u_checklogin(ctx, false);
                }
            });
            return false;
        }
    }
};

/** Don't report `newmissingkeys` unless there are *new* missing keys */
MegaData.prototype.checkNewMissingKeys = function() {
    var result = true;

    try {
        var keys = Object.keys(missingkeys).sort();
        var hash = MurmurHash3(JSON.stringify(keys));
        var prop = u_handle + '_lastMissingKeysHash';
        var oldh = parseInt(localStorage[prop]);

        if (oldh !== hash) {
            localStorage[prop] = hash;
        }
        else {
            result = false;
        }
    }
    catch (ex) {
        console.error(ex);
    }

    return result;
};
