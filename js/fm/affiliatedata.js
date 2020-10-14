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
     * @param {Boolean} noUA Flag to not trigger setUA function, and just for get redeemable status
     * @returns {Promise} Promise that resolve once process is done.
     */
    AffiliateData.prototype.getID = function(noUA) {

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
                        if (noUA) {
                            resolve();
                        }
                        else {
                            self.setUA('id', res.id).then(resolve).catch(reject);
                        }
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

        loadingDialog.show();

        var affbPromise = new Promise(function(resolve, reject) {
            api_req({a: 'affb'}, {
                affiliate: self,
                callback: function(res, ctx) {

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

        var utpPromise = new Promise(function(resolve, reject) {

            api_req({a: 'utp'}, {
                affiliate: self,
                callback: function(res, ctx) {
                    if (typeof res === 'object') {
                        ctx.affiliate.utpCount = res.length;
                        resolve();
                    }
                    else {
                        if (d) {
                            console.error('Account payment history retrieval failed. ', res);
                        }
                        reject(res);
                    }
                }
            });
        });

        var promises = [affbPromise, utpPromise];

        return Promise.all(promises).then(function() {
            loadingDialog.hide();
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
                targetPage = targetPage ? '/' + targetPage + '/' : '/';
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
     * Redemption Relates - Phase 2
     */

    AffiliateData.prototype.getRedemptionMethods = function() {

        var self = this;

        // Gateway info is already in memory do not stress api anymore
        if (this.redeemGateways) {
            return Promise.resolve();
        }

        return new Promise(function(resolve, reject) {

            loadingDialog.show();

            api_req({a: 'affrm'}, {
                affiliate: self,
                callback: function(res, ctx) {

                    loadingDialog.hide();

                    if (typeof res === 'object') {

                        ctx.affiliate.redeemGateways = {};

                        var sortCountry = function(a, b) {
                            return M.getCountryName(a).localeCompare(M.getCountryName(b), locale);
                        };

                        for (var i = res.length; i--;) {

                            res[i].data.cc.sort(sortCountry);
                            ctx.affiliate.redeemGateways[res[i].gateway] = res[i];
                        }
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

            var req = Object.assign({a: 'affr1'}, affiliateRedemption.requests.first);

            api_req(req, {
                affiliate: self,
                callback: function(res) {

                    loadingDialog.hide();

                    // Only MEGAstatus 0 ~ 4 mean success
                    if (typeof res === 'object' && res.MEGAstatus >= 0 && res.MEGAstatus < 5) {
                        resolve(res);
                    }
                    else {
                        if (d) {
                            if (res.MEGAstatus) {
                                // TODO handling MEGAstatus
                                console.error('Gateway error occurs, response:' + res.MEGAstatus);
                            }
                            else {
                                console.error('Requesting redemption 1 failed: ' + res);
                            }
                        }
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

            var req = Object.assign({a: 'affr2'}, affiliateRedemption.requests.second);

            api_req(req, {
                affiliate: self,
                callback: function(res) {

                    loadingDialog.hide();

                    // Only MEGAstatus 0 ~ 4 mean success
                    if (typeof res === 'object' && res.MEGAstatus >= 0 && res.MEGAstatus < 5) {
                        resolve(res);
                    }
                    else {
                        if (d) {
                            if (res.MEGAstatus) {

                                console.error('Gateway error occurs, response:' + res.MEGAstatus);
                                res.close = true;
                            }
                            else {
                                console.error('Requesting redemption 2 failed: ' + res);
                            }
                        }

                        reject(res);
                    }
                }
            });
        });
    };

    AffiliateData.prototype.getExtraAccountDetail = function() {

        var self = this;

        return new Promise(function(resolve, reject) {

            loadingDialog.show();

            var req = Object.assign({
                a: 'afftrc',
                rid: affiliateRedemption.req1res[0].rid
            }, affiliateRedemption.requests.second);

            api_req(req, {
                affiliate: self,
                callback: function(res) {

                    loadingDialog.hide();

                    // Only MEGAstatus 0 ~ 4 mean success
                    if (typeof res === 'object' && res.MEGAstatus >= 0 && res.MEGAstatus < 5) {
                        resolve(res);
                    }
                    else {
                        if (res.MEGAstatus) {

                            console.error('Gateway error occurs, response:' + res.MEGAstatus);
                            res.close = true;
                        }
                        else {
                            console.error('Requesting redemption 2 failed: ' + res);
                        }

                        reject(res);
                    }
                }
            });
        });
    };

    AffiliateData.prototype.getRedeemAccountInfo = function() {

        var self = this;

        return new Promise(function(resolve) {

            var method = affiliateRedemption.requests.first.m;

            mega.attr.get(u_attr.u, 'redeemaccinfo' + method, false, true).always(function(res) {

                if (typeof res !== 'object') {
                    res = false;
                }

                for (var k in res) {
                    res[k] = from8(res[k]);
                }

                self.redeemAccDefaultInfo = res;
                resolve(res);
            });
        });
    };

    AffiliateData.prototype.setRedeemAccountInfo = function(method, values) {

        loadingDialog.show();

        var self = this;

        return new Promise(function(resolve) {

            var setValues = {};

            for (var k in values) {
                setValues[k] = to8(values[k]);
            }

            mega.attr.set('redeemaccinfo' + method, setValues, false, true).done(function() {

                self.redeemAccDefaultInfo = values;
                loadingDialog.hide();
                resolve();
            });
        });
    };

    AffiliateData.prototype.getRedemptionHistory = function() {

        var self = this;

        return new Promise(function(resolve, reject) {

            loadingDialog.show();

            api_req({a: 'affrh'}, {
                affiliate: self,
                callback: function(res, ctx) {

                    loadingDialog.hide();

                    if (typeof res === 'object') {

                        // Default sort by time
                        res.r.sort(function(a, b) {

                            if (a.ts > b.ts) {
                                return -1;
                            }
                            else if (a.ts < b.ts) {
                                return 1;
                            }

                            return 0;
                        });

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

    AffiliateData.prototype.getFilteredRedempHistory = function(filter) {

        if (filter === 'all') {
            return this.redemptionHistory.r;
        }

        return this.redemptionHistory.r.filter(function(item) {

            switch (filter) {
                case 'processing':
                    return item.s > 0 && item.s < 4;
                case 'complete':
                    return item.s === 4;
                case 'failed':
                    return item.s > 4;
            }

            return false;
        });
    };

    AffiliateData.prototype.getRedemptionDetail = function(rid) {

        var self = this;

        var redi = this.redemptionHistory.r.findIndex(function(history) {
            return rid === history.rid;
        });

        // We have this redmeption detail already do not bother api again
        if (this.redemptionHistory.r[redi].det || this.redemptionHistory.r[redi].dn) {
            return Promise.resolve(this.redemptionHistory.r[redi]);
        }

        return new Promise(function(resolve, reject) {

            loadingDialog.show();

            api_req({a: 'affrd', rid: rid}, {
                affiliate: self,
                callback: function(res, ctx) {

                    loadingDialog.hide();

                    if (typeof res === 'object') {

                        ctx.affiliate.redemptionHistory.r[redi]
                            = Object.assign(ctx.affiliate.redemptionHistory.r[redi], res[0]);
                        resolve(ctx.affiliate.redemptionHistory.r[redi]);
                    }
                    else {
                        reject(res);
                    }
                }
            });
        });
    };

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
            this.getID(true),
            this.getBalance(),
            this.getRedemptionHistory(),
            this.getSignupList(),
            this.getCreditList()
        ] || [];

        return Promise.all(promises);
    };

    /**
     * Function to place Affiliate data when user visit affiliate pages
     * @param {String} value affiliation id.
     * @param {Number} type affiliation type. 1: ref-link, 2: public link, 3: chat link, 4: contact link.
     * @returns {void}
     */
    AffiliateData.prototype.storeAffiliate = function(value, type) {
        /* eslint-disable local-rules/misc-warnings */
        localStorage.affid = value;
        localStorage.affts = Date.now();
        localStorage.afftype = type;
        /* eslint-enable local-rules/misc-warnings */
    };

    /**
     * @name window.AffiliateData
     * @global
     */
    Object.defineProperty(global, 'AffiliateData', {value: AffiliateData});

    /**
     * @name mega.affid
     * @mega
     */
    Object.defineProperty(mega, 'affid', {
        get: function() {
            var storage = localStorage;
            var id = storage.affid;

            if (id) {
                var ts = storage.affts;
                var type = storage.afftype || 2;

                return {id: id, t: type, ts: Math.floor(ts / 1000)};
            }

            return false;
        }
    });
})(self);
