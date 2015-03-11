(function($, scope) {
    /**
     * Account closure/deletion
     *
     * @param opts {Object}
     * @constructor
     */
    var AccountClosure = function() {
        var self = this;

        var defaultOptions = {
        };

        //self.options = $.extend(true, {}, defaultOptions, opts);
    };
    AccountClosure.prototype.initAccountClosure = function() {
        $('.cancel-account-button').unbind('click');
        $('.cancel-account-button').bind('click', function() {
            accountClosure();
        });
    };

    AccountClosure.prototype._initAccountClosure = function() {
        loadingDialog.show();

        // Check is user logged in and owner
        if (u_type !== 3) {
            document.location.hash = 'login';
        }

        api_resetuser({callback: function(code) {
                loadingDialog.hide();
                if (code === 0) {
                    msgDialog('info', l[1975], l[1976], '', function() {
                        login_email = recoveryemail;
                        document.location.hash = 'login';
                    });
                }
                else if (code === EKEY) {
                    msgDialog('warningb', l[1977], l[1978]);
                    $('.recover-block.error').removeClass('hidden');
                }
                else if (code === EBLOCKED)
                {
                    msgDialog('warningb', l[1979], l[1980]);
                }
                else if (code === EEXPIRED || code === ENOENT) {
                    msgDialog('warninga', l[1966], l[1967], '', function() {
                        document.location.hash = 'recovery';
                    });
                }
            }}, page.replace('cancel', ''), '', '');
    };

    //export
    scope.mega = scope.mega || {};
    scope.mega.AccountClosure = AccountClosure;
}(jQuery, window));
