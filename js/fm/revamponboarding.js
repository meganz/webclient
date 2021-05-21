var RevampOnboarding = {
    /**
     * Four items:
     * 0: Show dialog
     * 1: Show popup
     * 2: Show feedback tip
     * 3: Show settings tip
     */
    data: 0,

    showDialog: function() {
        'use strict';

        M.safeShowDialog('revamp-onboarding-dialog', () => {
            RevampOnboarding.$dialog = $('.mega-dialog.revamp-onboarding');
            RevampOnboarding.bindDialogEvents();
            $('.big-header', RevampOnboarding.$dialog).text(l.v4onboard_dialogtitle);
            $('.revamp-onboarding-content', RevampOnboarding.$dialog).text(l.v4onboard_dialogtext);
            return RevampOnboarding.$dialog;
        });

    },

    bindDialogEvents: function() {
        'use strict';

        $('.close-rev-onboarding', this.$dialog).rebind('click', () => {
            closeDialog();
            this.setDone(0);
            RevampOnboarding.showPopup();
        });
    },

    showPopup: function() {
        'use strict';

        var $popup = $('.revamp-onboarding.popup');
        $('.popup-content', $popup).text(l.v4onboard_popupmessage);
        $popup.removeClass('hidden');
    },

    showFeedbackTip: function() {
        'use strict';

        $('.revamp-onboarding.feedback-request')
            .text(l.v4onboard_feedtextbox)
            .addClass('active');

        $('.js-accountbtn.feedback', '.account-dialog').addClass('highlight');
        this.setDone(1);

        setTimeout(() => {
            $('.revamp-onboarding.feedback-request').removeClass('active');
        }, 10000);
    },

    removeFeedbackTip: function() {
        'use strict';

        if (this.isDone(1)) {
            $('.revamp-onboarding.feedback-request').removeClass('active');
            $('.js-accountbtn.feedback', '.account-dialog').removeClass('highlight');
        }
    },

    initAccountPage: function() {
        'use strict';

        var $block =  $('.data-block.preferences');
        accountUI.$contentBlock.animate({scrollTop:$block.position().top}, 500);
        $('.theme-indicator', $block).text(l.v4onboard_switchmodes).addClass('active');
        this.setDone(2);
    },

    /**
     * Setting an onboarding component as done. Also sets the user attribute.
     * @param {Number} index The index of value to change
     * @returns {Promise} Promise that resolve once process is done.
     */
    setDone: function(index) {
        'use strict';
        var fmConfigIndex = 'rvonbrd';

        switch (index) {
            case 0:
                fmConfigIndex += 'dl';
                break;
            case 1:
                fmConfigIndex += 'fd';
                break;
            case 2:
                fmConfigIndex += 'as';
                break;
        }

        if (index >= 0 && index <= 2) {
            // Allowed user attribute updatable on affiliate

            // Setting it to user fmconfig
            mega.config.set(fmConfigIndex, 1);
        }
        else {
            console.error('UA index out of range');
        }
    },

    isDone: function(index) {
        'use strict';
        switch (index) {
            case 0:
                return fmconfig.rvonbrddl === 1;
            case 1:
                return fmconfig.rvonbrdfd === 1;
            case 2:
                return fmconfig.rvonbrdas === 1;
            default:
                return false;
        }
    }
};

mBroadcaster.addListener('fm:initialized', () => {
    'use strict';

    // If user is not fully registered or this is public link without login do not load onboarding
    if (!folderlink && u_type > 2) {

        // If user is newly registered user,
        if ($.noRevampOnboarding) {

            // Just mark him as he already saw the guide dialog and icon animation so it never happens to the user
            delete $.noRevampOnboarding;
            RevampOnboarding.setDone(0);
            RevampOnboarding.setDone(1);
            RevampOnboarding.setDone(2);
        }
        // else if user is existing user.
        else if (!RevampOnboarding.isDone(0)) {
            // If this is import redirection from download page, lets delay show guide dialog until finished.
            if (typeof dl_import !== 'undefined' && dl_import) {
                mBroadcaster.once('fm:importFileLinkDone', () => {
                    RevampOnboarding.showDialog();
                });
            }
            else {
                RevampOnboarding.showDialog();
            }
        }

        // we reached our goal, stop listening for fminitialized
        return 0xDEAD;
    }
});

