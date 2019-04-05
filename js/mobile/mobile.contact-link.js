/**
 * A class to deal with contacts links cards on mobile
 * @param {String} contactlink  contact link to work on
 */
function MobileContactLink(contactlink) {
    "use strict";
    this.contactlink = contactlink;
    this.contactName = '';
    this.contactEmail = '';
    this.contactAvatar = null;
    this.contactHandle = '';
}

/**
 * A function to view the contact card on mobile.
 */
MobileContactLink.prototype.showContactLinkInfo = function _showContactLinkInfo() {
    "use strict";
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
        $('.mobile.red-button.first.add-contact span', $mobileContactInfoDlg).text(l[101]);
        $('.mobile.text-button.third.cancel span', $mobileContactInfoDlg).text(l[148]);

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
            $('.mobile.red-button.first.add-contact', $mobileContactInfoDlg).addClass('disabled');
            $('.mobile.red-button.first.add-contact', $mobileContactInfoDlg).off('click');
            $('.mobile.main-avatar', $mobileContactInfoDlg).append(isContactHtml);
        }
        else {
            $('.mobile.red-button.first.add-contact', $mobileContactInfoDlg).removeClass('disabled');
            $('.mobile.red-button.first.add-contact', $mobileContactInfoDlg).rebind('click', function () {
                if (u_type) {
                    M.inviteContact(u_attr.email, email, null, ct);
                }
                var megaApp = 'mega://C!' + ct;
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
                        var page = u_type ? 'fm' : 'start';
                        $mobileContactInfoDlg.addClass('hidden');
                        loadSubPage(page);
                    }
                };
                setTimeout(appNotHere, 500);
                return false;
            });
        }
        $('.mobile.text-button.third.cancel, .mobile.fm-dialog-close', $mobileContactInfoDlg)
            .rebind('click', function () {
            var page = u_type ? 'fm' : 'start';
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

                    fillContactInfo(self.contactName, self.contactEmail, self.contactAvatar,
                        self.contactHandle, self.contactlink);
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
