(function(scope) {
    'use strict';

    /**
     * Emails Unsubscribe Page.
     * @constructor
     */
    function EmailUnsubscribe() {
        this.$page = null;
    }

    /**
     * Initialize page UI.
     */
    EmailUnsubscribe.prototype.initSuccessPage = function() {
        this.$page = $('.bottom-page.unsub');

        // Handle Homepage button click.
        this.$page.find('.homepage').rebind('click', function() {
            loadSubPage('');
        });

        // Handle Register button click.
        this.$page.find('.register').rebind('click', function() {
            loadSubPage('register');
        });
    };

    /**
     * Extract the code from the page variable and send to API.
     * If success, show unsub page, else error dialog.
     */
    EmailUnsubscribe.prototype.unsubscribe = function() {
        var self = this;
        loadingDialog.show('enotifUnsubscribe');
        api_req({a: 'eru', c: page.replace('unsub', '')}, {
            callback: function(res) {
                loadingDialog.hide('enotifUnsubscribe');
                if (res === 0 || res === EEXIST) {
                    // Success.
                    parsepage(pages['unsub']);
                    topmenuUI();
                    self.initSuccessPage();
                } else if (res === EARGS) {
                    // Invalid Code.
                    msgDialog('warningb', l[20949], l[20949], l[20948], function () {
                        loadSubPage('');
                    });
                } else if (res === EACCESS) {
                    // Email has an account.
                    loadSubPage('fm/account/notifications');
                } else {
                    // Other error
                    msgDialog('warningb', l[20949], l[20949], l[20858], function () {
                        loadSubPage('');
                    });
                }
            }
        });
    };

    // Copy a single instance into the scope.
    scope.EmailUnsubscribe = new EmailUnsubscribe();
})(window);
