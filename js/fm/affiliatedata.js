// Note: Referral Program is called as affiliate program at begining, so all systemic names are under word affiliate
// i.e. affiliate === referral

(function(global) {
    'use strict';

    var AffiliateData = function() {

        // Two of one-off actions for affiliate program
        this.icon = u_attr && u_attr['^!afficon'] || 0; // Affiliate icon has been animated.
        this.id = u_attr && u_attr['^!affid'] || ''; // User never register aff will have '' as affid

        this.lastupdate = 0;
        this.signupList = [];
        this.creditList = {active: []};
        this.balance = {
            available: 0, // Available amount to redeem
            pending: 0, // Pending amount to process
            redeemed: 0, // Redeemed amount include fees
            redemptionFees: 0, // Fees that deducted on redemptions e.g. banking fee.

            // local currency values
            localAvailable: 0,
            localPending: 0,
            localTotal: 0,
            localRedeemed: 0,
            localRedemptionFees: 0,
            localCurrency: "EUR" // in theory this shouldn't be shown anywhere, so just passing a random currency
        };
    };

    /**
     * Getting Affiliate ID for user's unique link
     * @returns {Promise} Promise that resolve once process is done.
     */
    AffiliateData.prototype.getID = function() {

        var self = this;

        return new Promise(function(resolve, reject) {

            loadingDialog.show();

            api_req({a: 'affid'}, {
                affiliate: self,
                callback: function(res, ctx) {

                    if (typeof res === 'object') {
                        ctx.affiliate.redeemable = res.s;

                        loadingDialog.hide();

                        // Setting affid to user attr.
                        self.setUA('id', res.id).then(resolve).catch(reject);
                    }
                    else {
                        if (d) {
                            console.error('Affiliation ID retrieval failed. ', res);
                        }
                        reject(res);
                    }
                }
            });
        });
    };

    /**
     * Setting User Attribute for affiliate programme
     * @param {String} type Type of UA to update
     * @param {String|Boolean|Number} value Type of UA to update
     * @returns {Promise} Promise that resolve once process is done.
     */
    AffiliateData.prototype.setUA = function(type, value) {

        var self = this;

        // Allowed user attribute updatable on affiliate
        var allowed = ['id', 'icon'];

        if (allowed.indexOf(type) < 0) {
            if (d) {
                console.error('The type of UA entered is not allowed to update on this function. type:' + type);
            }

            return Promise.reject();
        }

        return new Promise(function(resolve, reject) {

            loadingDialog.show();

            // Setting it to user attr.
            mega.attr.set('aff' + type, value, -2, 1).done(function() {
                self[type] = value;
                loadingDialog.hide();
                resolve();
            }).fail(function(res) {
                if (d) {
                    console.error('Set user attribute `aff' + type + '` failed. ', res);
                }
                reject();
            });
        });
    };

    /**
     * Getting Affiliate Balace for the user
     * @returns {Promise} Promise that resolve once process is done.
     */
    AffiliateData.prototype.getBalance = function() {

        var self = this;

        return new Promise(function(resolve, reject) {
            loadingDialog.show();

            api_req({a: 'affb'}, {
                affiliate: self,
                callback: function(res, ctx) {
                    loadingDialog.hide();

                    if (typeof res === 'object') {
                        ctx.affiliate.balance = {
                            available: res.a, // Available amount to redeem
                            pending: res.p, // Pending amount to process
                            redeemed: res.r, // Redeemed amount include fees
                            redemptionFees: res.f, // Fees that deducted on redemptions e.g. banking fee.

                            // local currency values
                            localAvailable: res.la,
                            localPending: res.lp,
                            localTotal: res.lt,
                            localRedeemed: res.lr,
                            localRedemptionFees: res.lf,
                            localCurrency: res.c
                        };

                        // NOTE: So actually redeemed amount for user is redeemed - redemptionFees.
                        // ctx.affiliate.balance.actualRedeemedForUser = res.r - res.f;

                        resolve();
                    }
                    else {
                        if (d) {
                            console.error('Affiliation Balance retrieval failed. ', res);
                        }
                        reject(res);
                    }
                }
            });
        });
    };

    /**
     * Getting Affiliation list that signed up with current user and possibly get creditize
     * @returns {Promise} Promise that resolve once process is done.
     */
    AffiliateData.prototype.getSignupList = function() {

        var self = this;

        return new Promise(function(resolve, reject) {

            loadingDialog.show();

            api_req({a: 'affsl'}, {
                affiliate: self,
                callback: function(res, ctx) {
                    loadingDialog.hide();

                    if (typeof res === 'object') {
                        resolve(res);
                        ctx.affiliate.signupList = res;
                    }
                    else {
                        if (d) {
                            console.error('Affiliation Signup List retrieval failed. ', res);
                        }
                        reject(res);
                    }
                }
            });
        });
    };

    /**
     * Getting list of affiliation that is creditized.
     * @returns {Promise} Promise that resolve once process is done.
     */
    AffiliateData.prototype.getCreditList = function() {

        loadingDialog.show();

        var self = this;

        var proPromise = new Promise(function(resolve) {

            pro.loadMembershipPlans(function() {
                resolve();
            });
        });

        var affclPromise = new Promise(function(resolve, reject) {

            api_req({a: 'affcl'}, {
                affiliate: self,
                callback: function(res, ctx) {
                    loadingDialog.hide();

                    if (typeof res === 'object') {
                        ctx.affiliate.creditList = {};
                        ctx.affiliate.creditList.active = res.a;
                        ctx.affiliate.creditList.pending = res.p;
                        ctx.affiliate.creditList.activeAmount = res.at;
                        ctx.affiliate.creditList.pendingAmount = res.pt;
                        ctx.affiliate.creditList.activeLocalAmount = res.lat;
                        ctx.affiliate.creditList.pendingLocalAmount = res.lpt;
                        ctx.affiliate.creditList.localCurrency = res.c;

                        resolve(res);
                    }
                    else {
                        if (d) {
                            console.error('Affiliation Credit List retrieval failed. ', res);
                        }
                        reject(res);
                    }
                }
            });
        });

        var promises = [proPromise, affclPromise];

        return Promise.all(promises);
    };

    /**
     * Generate affiliate url with given page.
     * @param {String} targetPage Mega url chose/entered by user.
     * @returns {Promise} Promise that resolve once process is done.
     */
    AffiliateData.prototype.getURL = function(targetPage) {

        return new Promise(function(resolve, reject) {

            var _formatURL = function() {
                targetPage = targetPage ? '/#' + targetPage + '/' : '/#';
                return getBaseUrl() + targetPage + 'aff=' + M.affiliate.id;
            };

            if (M.affiliate.id) {
                resolve(_formatURL());
            }
            else {
                M.affiliate.getID().then(function() {
                    resolve(_formatURL());
                }, function(res) {
                    reject(res);
                });
            }
        });
    };

    /*
     * Redemption Relates - Phase 2 - not complete until phase 2 of affiliate program.
     */
    /*
    AffiliateData.prototype.getRedemptionMethods = function() {

        var self = this;

        return new Promise(function(resolve, reject) {

            loadingDialog.show();

            api_req({a: 'affrm'}, {
                affiliate: self,
                callback: function(res) {
                    loadingDialog.hide();

                    if (typeof res === 'object') {
                        resolve(res);
                    }
                    else {
                        reject(res);
                    }
                }
            });
        });
    };

    AffiliateData.prototype.redeemStep1 = function() {

        var self = this;

        return new Promise(function(resolve, reject) {

            loadingDialog.show();

            api_req({a: 'affr1'}, {
                affiliate: self,
                callback: function(res) {
                    loadingDialog.hide();

                    if (typeof res === 'object') {
                        resolve(res);
                    }
                    else {
                        reject(res);
                    }
                }
            });
        });
    };

    AffiliateData.prototype.redeemStep2 = function() {

        var self = this;

        return new Promise(function(resolve, reject) {

            loadingDialog.show();

            api_req({a: 'affr2'}, {
                affiliate: self,
                callback: function(res) {
                    loadingDialog.hide();

                    if (typeof res === 'object') {
                        resolve(res);
                    }
                    else {
                        reject(res);
                    }
                }
            });
        });
    };

    AffiliateData.prototype.getRedemptionHistory = function() {

        var self = this;

        return new Promise(function(resolve, reject) {

            loadingDialog.show();

            api_req({a: 'affrh'}, {
                affiliate: self,
                callback: function(res) {
                    loadingDialog.hide();

                    if (typeof res === 'object') {
                        ctx.affiliate.redemptionHistory = res;
                        resolve(res);
                    }
                    else {
                        reject(res);
                    }
                }
            });
        });
    };

    AffiliateData.prototype.getRedemptionDetail = function(rid) {

        var self = this;

        return new Promise(function(resolve, reject) {

            loadingDialog.show();

            api_req({a: 'affrd', rid: rid}, {
                affiliate: self,
                callback: function(res) {
                    loadingDialog.hide();

                    if (typeof res === 'object') {
                        resolve(res);
                    }
                    else {
                        reject(res);
                    }
                }
            });
        });
    };
     */
    /*
     * Ends of Redemption Relates
     */

    /**
     * Pulling data for filling affiliate page.
     * @returns {Promise} Promise that resolve once process is done.
     */
    AffiliateData.prototype.getAffiliateData = function(force) {

        var refreshData = force || (this.lastupdate < Date.now() - 10000);

        var promises = refreshData && [
            this.getBalance(),
            // this.getRedemptionHistory(),
            this.getSignupList(),
            this.getCreditList()
        ] || [];

        return Promise.all(promises);
    };

    /**
     * @name window.AffiliateData
     * @global
     */
    Object.defineProperty(global, 'AffiliateData', {value: AffiliateData});

})(self);

// Place Affiliate ID if user visit affiliate pages
mBroadcaster.once('startMega', function _affTagger(tpage) {

    'use strict';

    var now = Date.now();
    var page = typeof tpage === 'string' && tpage || window.page;

    // Public link Affiliation
    var ph = String(isPublicLink(page)).split('!')[1];

    if (ph) {
        localStorage.affid = ph;
        localStorage.affts = now;
        localStorage.afftype = 2;
    }

    // Chatlink Affiliation
    if (isChatLink(page)) {
        var clh = String(page).replace('chat/', '').split('#')[0];

        localStorage.affid = clh;
        localStorage.affts = now;
        localStorage.afftype = 3;
    }

    // Contact link Affiliation
    if (page.substr(0, 2) === 'C!' && page.length > 2) {

        localStorage.affid = page.substr(2);
        localStorage.affts = now;
        localStorage.afftype = 4;
    }

    if (mega.hasOwnProperty('affid')) {
        // Nothing else to do here, i.e. this is a pagechange event
        return;
    }
    mBroadcaster.addListener('pagechange', _affTagger);

    // Load localstorage affiliate data to mega.
    Object.defineProperty(mega, 'affid', {
        get: function() {
            var storage = localStorage;
            var id = storage.affid;

            if (id) {
                var ts = storage.affts;
                var type = storage.afftype;

                return ts && type ? {id: id, t: type, ts: Math.floor(ts / 1000)} : id;
            }

            return false;
        }
    });
});

mBroadcaster.addListener('fm:initialized', function() {
    'use strict';

    // If user is not fully registered or this is public link without login do not load affiliate data yet
    if (!folderlink && u_type > 2 && u_attr.flags.refpr) {

        // If user is newly registered user,
        if ($.noAffGuide) {

            // Just mark him as he already saw the guide dialog and icon animation so it never happens to the user
            delete $.noAffGuide;
            M.affiliate.setUA('icon', 1);
        }
        else if (!M.affiliate.icon) {
            // else if user is existing user who did not see dialog show it.
            affiliateUI.guideDialog.show();
        }

        // we reached our goal, stop listening for fminitialized
        return 0xDEAD;
    }
});
