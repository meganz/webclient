function MobileContactLink(contactlink) {
    this.contactlink = contactlink;
    this.contactName = '';
    this.contactEmail = '';
    this.contactAvatar = null;
    this.contactHandle = '';
}

MobileContactLink.prototype.showContactLinkInfo = function _showContactLinkInfo(userLoginStatus) {
    var $mobileContactInfoDlg = $('#mobile-ui-contact-card');
    if (!$mobileContactInfoDlg.length) {
        if (!mega.ui.contactLinkCardDialog) {
            return;
        }
        $('#fmholder').append(mega.ui.contactLinkCardDialog);
        $mobileContactInfoDlg = $('#mobile-ui-contact-card');
    }

    var fillContactInfo = function _fillContactInfo(name, email,avatar,handle,ct) {
        $('.mobile.contactname', $mobileContactInfoDlg).text(name);
        $('.mobile.contactemail', $mobileContactInfoDlg).text(email);

        if (avatar) {
            var ab = base64_to_ab(avatar);
            var blob = new Blob([ab], { type: 'image/jpeg' });
            $('.avatar-wrapper.avatar img', $mobileContactInfoDlg).attr('src', myURL.createObjectURL(blob))
                .removeClass('hidden');
        }
        else {
            $('.avatar-wrapper.avatar img', $mobileContactInfoDlg).addClass('hidden');
            var curAvatar = useravatar.contact(email);
            $('.mobile.main-avatar', $mobileContactInfoDlg).html(curAvatar);
        }
        var isContactHtml = '<div class="mobile contact-verification"> <i class="" > </i > </div >';
        if (u_type) {
            $mobileContactInfoDlg.addClass('overlay');
            $('.mobile.fm-dialog-close', $mobileContactInfoDlg).removeClass('hidden');
        }
        else {
            $mobileContactInfoDlg.removeClass('overlay');
            $('.mobile.fm-dialog-close', $mobileContactInfoDlg).addClass('hidden');
        }

        if (handle === u_handle) {
            $('.mobile.red-button.first.add-contact', $mobileContactInfoDlg).addClass('disabled');
            $('.mobile.red-button.first.add-contact', $mobileContactInfoDlg).off('click');
        }
        else if (u_type && M.u[handle] && M.u[handle]._data.c) {
            contactStatus = 2;
            $('.mobile.red-button.first.add-contact', $mobileContactInfoDlg).addClass('disabled');
            $('.mobile.red-button.first.add-contact', $mobileContactInfoDlg).off('click');
            $('.mobile.main-avatar', $mobileContactInfoDlg).append(isContactHtml);
        }
        else {
            $('.mobile.red-button.first.add-contact', $mobileContactInfoDlg).removeClass('disabled');
            // $('.qr-ct-exist', $dialog).addClass('hidden');
            $('.mobile.red-button.first.add-contact', $mobileContactInfoDlg).rebind('click', function () {
                if (u_type) {
                    M.inviteContact(u_attr.email, em, null, contactLink);
                }
                var megaApp = 'mega://https://mega.nz/C!' + ct;
                location.replace(megaApp);
                var appNotHere = function () {
                    if (is_ios) {
                        var appleStore = 'https://itunes.apple.com/app/mega/id706857885';
                        location.replace(appleStore);
                    }
                    else if (is_android) {
                        var googlePlay = 'https://play.google.com/store/apps/details?'
                            + 'id=mega.privacy.android.app&referrer=meganzmobileapps';
                        location.replace(googlePlay);
                    }
                    else {
                        var page = (u_type ? 'fm' : 'start');
                        $mobileContactInfoDlg.addClass('hidden');
                        loadSubPage(page);
                    }
                }
                setTimeout(appNotHere, 500);
                return false;
            });
        }
        $('.mobile.text-button.third.cancel', $mobileContactInfoDlg).rebind('click', function () {
            var page = (u_type ? 'fm' : 'start');
            $mobileContactInfoDlg.addClass('hidden');
            loadSubPage(page);
        });
        $mobileContactInfoDlg.removeClass('hidden');
    };

    if (!this.contactName || !this.contactEmail) {
        // api request needed to fill the info
        var req = { a: 'clg', cl: this.contactlink };
        var self = this;
        api_req(req, {
            callback: function (res) {
                if (typeof res === 'object') {
                    self.contactAvatar = res['+a'];
                    self.contactEmail = res.e;
                    self.contactName = res.fn + ' ' + res.ln;
                    self.contactHandle = res.h;

                    
                    // M.safeShowDialog('qr-contact-mobile', function () {
                    fillContactInfo(self.contactName, self.contactEmail, self.contactAvatar,
                        self.contactHandle, self.contactlink);
                    //    return $mobileContactInfoDlg;
                    // });

                }
                else {
                    msgDialog('warningb', l[8531], l[17865]);
                }
            }
        });
    }
    else {
        fillContactInfo(this.contactName, this.contactEmail, this.contactAvatar, this.contactHandle);
    }
};