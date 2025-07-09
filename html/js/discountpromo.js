/**
 * Code for the promotional discount offer page which is either
 * a direct link e.g. https://mega.nz/#discountpromoM2iPNEWqiTM-yhsuGkOToh
 * or a short URL e.g. https://mega.nz/s/blackfriday
 * This code is shared for desktop and mobile webclient.
 */
class DiscountPromo {

    /**
     * Initialise the page
     */
    constructor() {
        // Show loading spinner
        loadingDialog.show('discountPromotionalPage');

        // Load discount code
        this.getDiscountInfo(page, () => {

            // Load Pro membership plans
            pro.loadMembershipPlans(() => {

                // Get the matched plan
                const matchedPlan = this.getMatchedPlan();

                if (matchedPlan) {
                    this.proceedToPayment(matchedPlan);
                }
                else {
                    msgDialog('error', '', l.err_t_unable_to_proceed, l.err_m_inelligible_for_promo, () => {
                        mega.redirect('mega.io', 'pricing', false, false);
                    });
                }

                // Hide loading spinner
                loadingDialog.hide('discountPromotionalPage');
            });
        });
    }

    /**
     * Fetch the discount
     * @param {String} page The page e.g. /discountpromoM2iPNEWqiTM-yhsuGkOToh or short sale URL e.g. /s/blackfriday
     * @param {Function} completeCallback The function to run when complete
     * @returns {Boolean}
     */
    getDiscountInfo(page, completeCallback) {

        // Handle short sale URLs e.g. /s/blackfriday
        if (page.substr(0, 2) === 's/') {

            mega.discountCode = null;
            mega.shortUrl = page.substr(2);
        }
        else {
            // Otherwise handle regular discount codes
            mega.discountCode = page.substr(13);
            mega.shortUrl = null;

            if (mega.discountCode.length < 15) {
                delete mega.discountInfo;
                msgDialog('warninga', l[135], l[24676], false, () => {
                    loadSubPage('pro');
                });
                return false;
            }
        }

        loadingDialog.show();
        delete mega.discountInfo;

        api.req({a: 'dci', v: 2, dc: mega.discountCode, su: mega.shortUrl, extra: true}).then(({result: res}) => {

            loadingDialog.hide();

            if (res && res.al && res.pd) {
                DiscountPromo.storeDiscountInfo(res);
                completeCallback();
                return true;
            }
            msgDialog('warninga', l[135], l[24674], false, () => {
                loadSubPage('pro');
            });
        }).catch((ex) => {
            loadingDialog.hide();
            let errMsg = l[24674];
            if (ex === pro.proplan.discountErrors.expired) {
                errMsg = l[24675];
            }
            else if (ex === pro.proplan.discountErrors.notFound) {
                errMsg = l[24676];
            }
            else if (ex === pro.proplan.discountErrors.diffUser) {
                errMsg = l[24677];
            }
            else if (ex === pro.proplan.discountErrors.isRedeemed) {
                errMsg = l[24678];
            }
            else if (ex === pro.proplan.discountErrors.tempUnavailable) {
                errMsg = l[24764];
            }
            msgDialog('warninga', l[135], errMsg, false, () => {
                loadSubPage('pro');
            });
        });
        return false;
    }

    static storeDiscountInfo(res) {
        if (res.al === pro.ACCOUNT_LEVEL_FEATURE) {
            res.al += pro.getStandaloneBits(res.f);
        }

        mega.discountInfo = res;
        mega.discountCode = mega.discountCode || res.dc;
    }

    /**
     * Get the plan that matches the discount promotion
     * @returns {Array} Returns the plan details
     */
    getMatchedPlan() {

        return pro.membershipPlans.find(plan => {
            return plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL] === mega.discountInfo.al
                && plan[pro.UTQA_RES_INDEX_MONTHS] === 1;
        });
    }

    proceedToPayment(matchedPlan) {
        const accountLevel = matchedPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];
        const proPayPage = `propay_${accountLevel}`;

        // Load the Pro page step 2 where they can make payment
        loadSubPage(proPayPage);
    }
}
