/**
 * Functionality for the Invite bonuses page (fm/account/invites)
 */
mobile.achieve.inviteBonuses = Object.create(mobile.settingsHelper, {

    /**
     * Initialise the Referral Bonuses page
    */
    init: {
        value: function() {
            'use strict';

            // If not logged in, return to the login page
            if (typeof u_attr === 'undefined') {
                loadSubPage('login');
                return false;
            }

            if (this.domNode) {
                this.getReferrals();
                this.show();
                return true;
            }

            this.domNode = this.generatePage('referral-bonuses-page');

            // Initialise functionality
            const _initCallback = () => {
                this.showAchievementsBlock();
                this.getReferrals();
                this.showInlineAlertAndPrompt();
                this.show();
            };

            if (M.account.maf) {
                _initCallback();
            }
            else {
                // Fetch account data if it doesn't exist
                M.accountData(_initCallback, true);
            }
        }
    },

    /**
     * Show the achievements block (bonus space earned from invites)
     */
    showAchievementsBlock: {
        value: function() {
            'use strict';

            this.achievementsBlock = new MegaMobileAchievementsBlock({
                parentNode: this.domNode,
                componentClassname: 'achievements-block fixed-width',
                achievements: ['invitebonuses'],
            });
        }
    },

    /**
     * Show the inline invite friends CTA
     */
    showInlineAlertAndPrompt: {
        value: function() {
            'use strict';

            const inlineAlert = mobile.inline.alert.create({
                parentNode: this.domNode,
                componentClassname: 'invite-friends-cta advertisement fixed-width',
                text: l.invite_friend_reward,
                actionButtonText: l.invite_friend_btn,
                rightIcon: 'chat',
                closeButton: false
            });
            inlineAlert.on('cta', () => {
                loadSubPage('fm/account/invite-friends');
            });

            const moreStoragePrompt = document.createElement('div');
            moreStoragePrompt.className = 'more-storage-prompt';
            moreStoragePrompt.append(parseHTML(l.want_more_storage_prompt));
            this.domNode.append(moreStoragePrompt);
        }
    },

    /**
     * Get a list of referral bonuses.
     */
    getReferrals: {
        value: function() {
            'use strict';

            if (!this.referralList) {
                this.referralList = document.createElement('div');
                this.referralList.className = 'referral-list hidden';
                this.domNode.append(this.referralList);
            }
            this.referralList.textContent = '';

            // Get list of friends invited
            const rewardedBonuses = M.account.maf && M.account.maf.a || [];

            const activeReferralsList = [];
            const expiredReferralsList = [];
            for (let i = 0; i < rewardedBonuses.length; i++) {
                const rewardedBonus = rewardedBonuses[i];
                const awardId = rewardedBonus.a;

                if (awardId === mobile.achieve.BONUS_CLASS_REFERRAL) {
                    // Calculate if invite has expired
                    const expiryTimestamp = rewardedBonus.e;
                    const currentTimestamp = unixtime();
                    const difference = expiryTimestamp - currentTimestamp;
                    const expiryDate = Math.round(difference / 86400);

                    if (expiryDate > 0) {
                        activeReferralsList.push(rewardedBonus);
                    }
                    else {
                        expiredReferralsList.push(rewardedBonus);
                    }

                    this.referralList.classList.remove('hidden');
                }
            }

            // Sort referral list entries by date
            const _compareTimeStamp = (a, b) => a.ts - b.ts;

            activeReferralsList.sort(_compareTimeStamp);
            expiredReferralsList.sort(_compareTimeStamp);

            // Generate the entry lists
            this.generateReferralEntries(activeReferralsList);
            this.generateReferralEntries(expiredReferralsList);
        }
    },

    /**
     * Generate the referral entries to be shown.
     * Order: active (earlier expiry date first) > expired
     *
     * @param {Array} list List of referral entries to be shown
     */
    generateReferralEntries: {
        value: function(list) {
            'use strict';

            for (let i = 0; i < list.length; i++) {
                const invite = list[i];

                // Calculate time to expiry
                const expiryTimestamp = invite.e;
                const currentTimestamp = unixtime();
                const difference = expiryTimestamp - currentTimestamp;
                const expiryDate = Math.round(difference / 86400);

                const email = invite.m[0];

                const friendDiv = document.createElement('div');
                friendDiv.className = `invited-friend ${expiryDate > 0 ? 'active' : 'expired'}`;

                const friendInitials = document.createElement('div');
                friendInitials.className = 'friend-initials';
                friendInitials.textContent = email.charAt(0).toUpperCase();
                friendDiv.append(friendInitials);

                const emailAndDaysLeft = document.createElement('div');
                emailAndDaysLeft.className = 'email-and-expiry';
                friendDiv.append(emailAndDaysLeft);

                const emailAddress = document.createElement('div');
                emailAddress.className = 'email';
                emailAddress.textContent = email;
                emailAndDaysLeft.append(emailAddress);

                const expiryDateDiv = document.createElement('div');
                expiryDateDiv.className = 'expiry-date';
                expiryDateDiv.textContent = expiryDate > 0 ?
                    mega.icu.format(l[16284], expiryDate) :
                    l.app_bonus_expired;
                emailAndDaysLeft.append(expiryDateDiv);

                this.referralList.append(friendDiv);
            }
        }
    },
});
