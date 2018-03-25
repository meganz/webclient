/**
 * Functionality for the mobile My Account section
 * Currently NOT supported: icon, url can't be accessed, settings, CRUD from menu
 */
mobile.megadrop = {

    /**
     * Intention is to have all active PUP's
     * in memory so user can be informed during
     * removal or movement of MEGAdrop folders.
     * Structure is 'nodeId': {pufId. '', pupId: ''}
     */
    pufs: {},

    /**
     * Initialise the page
     */
    show: function() {

        'use strict';

        var $megadrop = $('.mobile.megadrop');

        // Show the MEGAdrop page
        $megadrop.removeClass('hidden');

        // Log if they visited the TOS page
        api_req({ a: 'log', e: 99636, m: 'Visited MEGAdrop link page on mobile webclient' });

        // Init Mega (M) icon
        mobile.initHeaderMegaIcon();
    },

    /**
     * Update mobile.megadrop.pufs structure
     * @param {String} id Node id
     * @param {String} ph PUF id
     * @param {String} p PUP id
     */
    updatePUFS: function(id, ph, p) {
        'use strict';

        if (!this.pufs[id]) {
            this.pufs[id] = {};
        }

        this.pufs[id].ph = ph;
        this.pufs[id].p = p;
        this.pufs[id].h = id;

        if (fmdb && p) {
            fmdb.add('puf', { ph: ph,
                d: { p: p,
                    ph: ph,
                    h: id,
                }
            });
        }
    },

    /**
     * Remove PUF request
     * @param {Array} list Nodes id
     */
    pufRemove: function(list) {
        'use strict';

        var masterPromise = new MegaPromise();
        var requestPromises = [];
        var collectedData = [];
        var failedRequests = [];
        var tmpDone = function (response) {
            collectedData.push(response);
        };
        var tmpFail = function (failReason) {
            failedRequests.push(failReason);
        };

        for (var k = list.length; k--;) {
            requestPromises.push(
                asyncApiReq({ a: 'ul', n: list[k], d: 1, i: requesti })
                    .done(tmpDone)
                    .fail(tmpFail)
            );
        }

        MegaPromise.allDone(requestPromises)
        .always(function () {
            masterPromise.resolve([collectedData, failedRequests]);
            if (failedRequests.length) {
                loadingDialog.hide();
            }
        });

        return masterPromise;
    },

    isDropExist: function(selected) {
        'use strict';

        var sel = Array.isArray(selected) ? selected.slice(0) : [selected];
        var result = [];

        while (sel.length) {
            var id = sel.shift();
            if (this.pufs[id]) {
                result.push(id);
            }
            if (M.tree[id]) {
                sel = sel.concat(Object.keys(M.tree[id]));
            }
        }

        return result;
    },

    /**
     * Loop through PUFS structurein search for matching 'ph' (PUF id).
     * It's used when PUP AP is received which doesn't contain node id
     * @param {Object} pup PUP action packet
     */
    findAndUpdate: function(pup) {
        'use strict';

        for (var key in this.pufs) {
            if (this.pufs.hasOwnProperty(key)) {
                var puf = this.pufs[key];
                if (puf.ph === pup.ph) {
                    this.updatePUFS(key, pup.ph, pup.p);
                    break;
                }
            }
        }
    },

    /**
     * Loop through PUFS structurein search for matching 'ph' (PUF id).
     * @param {String} pufId PUF id
     * @returns {String} nodeId
     */
    findNode: function(pufId) {
        'use strict';

        var nodeId = '';

        for (var key in this.pufs) {
            if (this.pufs.hasOwnProperty(key)) {
                var puf = this.pufs[key];
                if (puf.ph === pufId) {
                    nodeId = puf.h;
                    break;
                }
            }
        }

        return nodeId;
    },

    /**
     * If PUF removal is initialized from
     * mobile PUP removal should follow
     * @param {Object} ap API AP 'puh'
     */
    processPUP: function(ap) {
        'use strict';

        for (var i = ap.length; i--;) {
            var pup = ap[i];
            if (pup.s) {// Status enabled/disabled
                this.findAndUpdate(pup);
            }
            else {// Status deleted
                delete this.pufs[this.findNode(pup.ph)];
                fmdb.del('puf', pup.ph);
            }
        }
    },

    /**
     * Handle API PUH AP
     * @param {Object} ap API AP 'puh'
     */
    processPUH: function(ap) {
        'use strict';

        for (var i = ap.length; i--;) {
            var puh = ap[i];
            if (requesti === puh.i) {
                if (puh.d && puh.p) {
                    api_req({ a: 'ps', s: 0, p: puh.p, i: requesti });// Delete PUP request
                }
                // if (puh.n) { api_req({ a: 'ps', s: 2, ph: puh.ph, d: {}})}// Add PUP
            }
            else {// Update this.pufs structure
                this.updatePUFS(puh.h, puh.ph);
            }
        }
    },

    /**
     * Process UPH action packet
     * @param {Object} ap UPH action pacekt
     */
    processUPH: function(ap) {
        'use strict';

        var tmpCB = function(res) {
            mobile.megadrop.findAndUpdate(res);
        };

        // Create PUFS memory structure
        for (var i = ap.length; i--;) {
            this.updatePUFS(ap[i].h, ap[i].ph);
        }

        // List user's public upload pages
        api_req({ a: 'pl' }, {
            callback: function (pupList) {
                for (var k = pupList.length; k--;) {
                    var pup = pupList[k];

                    // Only active PUP's .s === 2
                    if (pup.p && pup.s === 2) {

                        // Get PUP data
                        api_req({ a: 'pg', p: pup.p }, {
                            callback: tmpCB
                        });
                    }
                }
            }
        });
    },

    /**
     * Update cache from indexedDb on page refresh PUF
     * @param {Array} data Nodes handle
     */
    pufProcessDb: function (data) {
        'use strict';

        for (var i in data) {
            if (data.hasOwnProperty(i)) {
                if (data[i].p) {
                    var id = data[i].h;// Node id
                    this.pufs[id] = {};
                    this.pufs[id] = data[i];
                }
            }
        }
    },

};
