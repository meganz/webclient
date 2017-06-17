(function($, scope) {
    /**
     * Google contact importing
     *
     * @param opts {Object}
     * @constructor
     */
    var GContacts = function(opts) {
        var self = this;

        var defaultOptions = {
            'where': '',
            'failed': false,
            'm8_uri': 'https://www.google.com/m8/feeds/',
            'authenticate_uri': 'https://accounts.google.com/o/oauth2/auth',
            'access_token_uri': 'https://accounts.google.com/o/oauth2/token',
            'validateTokenUrl': 'https://www.googleapis.com/oauth2/v1/tokeninfo',
            'retreiveAllUrl': 'https://www.google.com/m8/feeds/contacts/default/full',
            'width': '800', // popup width
            'height': '600', // poput height
            'domains': ['mega.nz', 'beta.mega.nz', 'sandbox3.developers.mega.co.nz', 'beta.developers.mega.co.nz'],
            'client_ids': [
                {// mega.nz
                    'client_id': '84490490123-deqm1aegeqcmfhdq0aduptcj1rak2civ.apps.googleusercontent.com',
                    'redirect_uri': 'https://mega.nz/'
                },
                {// beta.mega.nz'
                    'client_id': '84490490123-qn3b905g0vg1qjmi7rmi93pud4ah0u4a.apps.googleusercontent.com',
                    'redirect_uri': 'https://beta.mega.nz/'
                },
                {// sandbox3.developers.mega.co.nz
                    'client_id': '84490490123-hnabnjak7pv6qo3ns2julvmh1dibb91c.apps.googleusercontent.com',
                    'redirect_uri': 'https://sandbox3.developers.mega.co.nz/'
                },
                {// beta.developers.mega.co.nz
                    'client_id': '84490490123-68i0k30gvvddmeceppoucon74il8s8gc.apps.googleusercontent.com',
                    'redirect_uri': 'https://beta.developers.mega.co.nz/'
                }]
        };

        self.options = $.extend(true, {}, defaultOptions, opts);

        self.isImported = false;
        self.client_id = '';
        self.redirect_uri = '';
        self.accessToken = '';
        self.leftPix = 0;
        self.topPix = 0;
        self.g_auth_uri = '';

        self._calcParams();
    };

    /**
     * Calculate parameters used for google contact importing
     *
     */
    GContacts.prototype._calcParams = function() {
        var self = this;

        var index = self.options.domains.indexOf(window.location.host);
        if (index !== -1) {
            self.client_id = self.options.client_ids[index].client_id;
            self.redirect_uri = self.options.client_ids[index].redirect_uri;

            self.leftPix = Math.floor((window.screen.availWidth - self.options.width) / 2);
            self.topPix = Math.floor((window.screen.availHeight - self.options.height) / 2);

            self.g_auth_uri = self.options.authenticate_uri + '?'
                + '&response_type=token'
                + '&client_id=' + self.client_id
                + '&redirect_uri=' + self.redirect_uri
                + '&scope=' + self.options.m8_uri
                + '&state=' + String(Math.random());

            // failed = false
            self.options.failed = false;
       } else {
            if (d) console.debug('Contacts importing is NOT allowed for host', window.location.host);

            // failed = true
            self.options.failed = true;
        }
    };


    GContacts.prototype.importGoogleContacts = function() {
        var self = this;

        var win = window.open(
                self.g_auth_uri,
                'GoogleAuthenticate',
                'width=' + self.options.width +
                ', height=' + self.options.height +
                ', left=' + self.leftPix +
                ', top=' + self.topPix
            );

        var pollTimer = window.setInterval(function() {
            try {
//                console.log(win.document.URL);
                if (win.document.URL.indexOf(self.redirect_uri) !== -1) {
                    window.clearInterval(pollTimer);
                    var url = win.document.URL;
                    self.accessToken = self._extractQueryValue(url, 'access_token');
                    win.close();

                    // Importing contacts can take some time
                    loadingDialog.show();
                    self.isImported = self.getContactList(self.options.where);
                }
            } catch (e) {
            }
        }, 3000);
    };

    /**
     * _getContactList
     * @param {boolean} false = addContacts, true=share dialog
     */
    GContacts.prototype.getContactList = function(where) {

        var self = this;

        var url = self.options.retreiveAllUrl + "?access_token=" + self.accessToken + "&v=3.0&alt=json&max-results=999";

        api_req({ a: 'prox', url: url }, {
            callback: function(res) {
                if (typeof res == 'number') {
                    if (d) console.debug("Contacts importing failed.");
                    return false;
                } else {
                    var gData = self._readAllEmails(res);
                    if (gData.length > 0) {
                        if (where === 'shared') {
                            addImportedDataToSharedDialog(gData);
                        }
                        else if (where === 'contacts') {
                            addImportedDataToAddContactsDialog(gData);
                        }
                        $('.import-contacts-dialog').fadeOut(200);

                        self.isImported = true;
                    }
                    else {
                        loadingDialog.hide();
                        if (d) console.debug("Contacts importing canceled.");

                        $('.import-contacts-dialog').fadeOut(200);

                        self.isImported = false;
                    }
                }
            }
        });
    };

    GContacts.prototype._xPathNameSpaceResolver = function(prefix) {
        var ns = {
            'def': 'http://www.w3.org/2005/Atom',
            'gd': 'http://schemas.google.com/g/2005'
        };

        return ns[prefix] || null;
    };

    GContacts.prototype._readAllEmails = function(json_data) {
        var self = this;

        var data = [];
        if (json_data && json_data.feed && json_data.feed.entry) {
            for (var i = 0; i < json_data.feed.entry.length; i++) {
                var obj = json_data.feed.entry[i];

                if (obj['gd$email'] != undefined) {
                    data.push(obj['gd$email'][0].address);
                }
            }
        }

        return data;
    };

    /**
     * Token validation
     *
     * Tokens received on the fragment MUST be explicitly validated.
     * Failure to verify tokens acquired this way makes your application
     * more vulnerable to the confused deputy problem.
     * @param {type} accessToken
     *
     */
    GContacts.prototype._validateToken = function(accessToken) {
        var self = this;

        var data = {access_token: accessToken};

        // Validate access token
        $.get(self.options.validateTokenUrl, data, function() {
            return true;
        });
    };


    GContacts.prototype._extractQueryValue = function(url, name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\#&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(url);
        if (results == null) {
            return "";
        } else {
            return results[1];
        }
    };

    // export
    scope.mega = scope.mega || {};
    scope.mega.GContacts = GContacts;
})(jQuery, window);
