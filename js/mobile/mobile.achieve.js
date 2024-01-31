/**
 * Functionality for the mobile Achievements page (fm/account/achievements)
 */
mobile.achieve = Object.create(mobile.settingsHelper, {

    /**
     * Bonus classes of achievements for maf[a|u] (awarded classes | available award classes)
     */
    BONUS_CLASS_REFERRAL: {
        value: 3
    },
    BONUS_CLASS_MEGA_SYNC: {
        value: 4
    },
    BONUS_CLASS_MOBILE_APP: {
        value: 5
    },
    BONUS_CLASS_VERIFY_PHONE: {
        value: 9
    },

    /**
     * Array index for the API objects maf[r|u] (reward details | available award classes)
    */
    AWARD_INDEX_STORAGE: {
        value: 0
    },
    AWARD_INDEX_TRANSFER: {
        value: 1
    },

    /**
     * Initialise the main Achievements page
    */
    init: {
        value: function() {
            'use strict';

            // If not logged in, return to the login page
            if (typeof u_attr === 'undefined') {
                loadSubPage('login');
                return false;
            }

            // Add a server log
            eventlog(99673);

            if (this.domNode) {
                this.show();
                return true;
            }

            this.domNode = this.generatePage('achievements-page');

            // Initialise functionality
            const _initCallback = () => {
                this.showAchievementsBlock();
                this.showInlineAlert();
                this.showBonusInformation();
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
     * Show the achievements block (bonus space earned and number of friends invited)
     */
    showAchievementsBlock: {
        value: function() {
            'use strict';

            this.achievementsBlock = new MegaMobileAchievementsBlock({
                parentNode: this.domNode,
                componentClassname: 'achievements-block fixed-width',
                achievements: ['allbonuses', 'friends'],
            });
        }
    },

    /**
     * Show the inline invite friends CTA
     */
    showInlineAlert: {
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
        }
    },

    /**
     * Displays the bonus information and achievement status
     */
    showBonusInformation: {
        value: function() {
            'use strict';

            const bonusClasses = [
                this.BONUS_CLASS_REFERRAL,
                this.BONUS_CLASS_MOBILE_APP,
                this.BONUS_CLASS_MEGA_SYNC
            ];
            const linkTitles = [l.invite_bonuses, l[16280], l.install_desktop_app];
            const linkTargets = ['fm/account/invites', 'mobile', 'desktop'];
            const links = [];

            for (let i = 0; i < linkTitles.length; i++) {
                const daysToExpiry = this.getBonusExpiry(bonusClasses[i]);
                let linkIcon = 'sprite-mobile-fm-mono icon-check-circle-thin-';
                let status;

                const isReferralBtn = bonusClasses[i] === this.BONUS_CLASS_REFERRAL;

                if (daysToExpiry > 0) {
                    linkIcon += 'solid active';
                    status = mega.icu.format(l[16284], daysToExpiry);
                }
                else if (daysToExpiry === null) {
                    linkIcon += 'outline not-achieved';
                    status = isReferralBtn ? l.referral_bonus_not_achieved : l.app_bonus_not_achieved;
                }
                else {
                    linkIcon += `${isReferralBtn ? 'outline' : 'solid'} expired`;
                    status = isReferralBtn ? l.referral_bonus_expired : l.app_bonus_expired;
                }

                links[i] = {
                    text: linkTitles[i],
                    subtext: status,
                    icon: linkIcon,
                    iconSize: 32,
                    href: linkTargets[i]
                };
            }

            const linksDiv = document.createElement('div');
            linksDiv.className = 'links';
            this.domNode.append(linksDiv);

            for (const link of links) {
                this.generateMenuItem(linksDiv, link);
            }

            const moreStoragePrompt = document.createElement('div');
            moreStoragePrompt.className = 'more-storage-prompt';
            moreStoragePrompt.append(parseHTML(l.want_more_storage_prompt));

            this.domNode.append(moreStoragePrompt);
        }
    },

    /**
     * Get the expiry date of the bonus class chosen
     *
     * @param {Number} classNumber The bonus class number from the API
     * @returns {Integer|null} timeDifference time until expiry of bonus (or null if unavailable)
     */
    getBonusExpiry: {
        value: function(classNumber) {
            'use strict';

            // Get achievement bonus information
            const actualBonusesReceivedInfo = M.account.maf && M.account.maf.r;
            const bonusRewardedInfo = this.getInfoAboutAwardedBonus(classNumber);

            // Check the bonus information is available
            if (bonusRewardedInfo !== null) {
                const awardId = bonusRewardedInfo.r;

                // If they have actually received a bonus the object will exist
                if (typeof actualBonusesReceivedInfo[awardId] !== 'undefined') {
                    // Calculate if award is expired
                    const currentTimestamp = unixtime();
                    const expiryTimestamp = bonusRewardedInfo.e;
                    const timeDifference = expiryTimestamp - currentTimestamp;

                    return timeDifference > 0 ? Math.round(timeDifference / 86400) : -1;
                }
            }

            return null;
        }
    },

    /**
     * Get information about the earned reward e.g. expiry time for an achievement class
     * @returns {Object|null} Returns award object from M.account.maf.a or null if the award was not achieved
     */
    getInfoAboutAwardedBonus: {
        value: function(classNum) {
            'use strict';

            if (M.account.maf && M.account.maf.a) {
                // Get the list of awarded bonuses
                const awardedBonuses = M.account.maf.a;

                // Search through the array looking for the bonus class number
                for (let i = 0; i < awardedBonuses.length; i++) {

                    // If the award id is the same return it
                    if (awardedBonuses[i].a === classNum) {
                        return awardedBonuses[i];
                    }
                }
            }

            // Award not achieved yet
            return null;
        }
    },
});
