class MegaMobileAchievementsBlock extends MegaMobileComponent {

    /**
     * Constructor for the achievements block
     */
    constructor(options) {

        super(options);

        if (!this.domNode) {
            return;
        }

        if (!options.achievements) {
            console.error('The list of achievements to display is not supplied');
            return;
        }

        this.achievements = options.achievements;

        this.achievementTypes = {
            allbonuses: l.bonus_space_earned,
            friends: l.friends_invited,
            invitebonuses: l.bonus_space_earned
        };

        const targetNode = this.domNode;
        const subNode = document.createElement('div');
        subNode.className = 'achievements-block';
        if (!this.achievements.includes('friends')) {
            targetNode.classList.add('storage-only');
        }

        for (const achievement of this.achievements) {
            const segment = document.createElement('div');
            segment.className = 'segment';

            const achievementDiv = document.createElement('div');
            achievementDiv.className = 'achievement';
            achievementDiv.textContent = this.achievementTypes[achievement];
            segment.append(achievementDiv);

            const dividerAndUnit = document.createElement('div');
            dividerAndUnit.className = 'divider-and-unit';

            const divider = document.createElement('div');
            divider.className = 'divider';
            dividerAndUnit.append(divider);

            const unitDiv = document.createElement('div');
            unitDiv.className = 'unit';
            unitDiv.textContent = this.getValue(achievement);
            dividerAndUnit.append(unitDiv);

            segment.append(dividerAndUnit);
            targetNode.append(segment);
        }
    }

    /**
     * Get the text value for the segment.
     *
     * @param {String} achievement Achievement type
     * @returns {String} number of friends invited or storage units earned
     */
    getValue(achievement) {
        let value = 0;
        const isFriendsAchievement = achievement === 'friends';
        const isInviteBonuses = achievement === 'invitebonuses';

        if (M.account.maf && M.account.maf.r) {
            // Get bonus information
            const rewardedBonuses = M.account.maf.a;
            const bonusesReceivedInfo = M.account.maf.r;

            for (let i = 0; i < rewardedBonuses.length; i++) {
                // Calculate if award is expired
                const rewardedBonus = rewardedBonuses[i];
                const awardId = rewardedBonus.a;
                const expiryTimestamp = rewardedBonus.e;
                const currentTimestamp = unixtime();
                const difference = expiryTimestamp - currentTimestamp;

                const isReferralAward = awardId === mobile.achieve.BONUS_CLASS_REFERRAL;

                if (isFriendsAchievement && isReferralAward) {
                    value++;
                }
                else if (!isFriendsAchievement && difference > 0 &&
                    (!isInviteBonuses || (isInviteBonuses && isReferralAward))) {
                    value += bonusesReceivedInfo[rewardedBonus.r][mobile.achieve.AWARD_INDEX_STORAGE];
                }
            }
        }

        return achievement === 'friends' ?
            mega.icu.format(l.num_friends_invited, value) :
            bytesToSize(value, 0);
    }
}
