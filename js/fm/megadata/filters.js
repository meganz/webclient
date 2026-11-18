MegaData.prototype.filterBy = function(f, omitVersions) {
    this.filter = f;
    this.v = [];

    for (var i in this.d) {
        if (
            (!omitVersions || !this.d[i].fv)
            && f(this.d[i])
            && mega.sensitives.shouldShowNode(this.d[i])
        ) {
            this.v.push(this.d[i]);
        }
    }
};

/**
 * The same as filterBy, but instead of pushing the stuff in M.v, will return a new array.
 *
 * @param f function, with 1 arguments (node) that returns true when a specific node should be returned in the list
 * of filtered results
 */
MegaData.prototype.getFilterBy = function(f) {
    'use strict';

    var v = [];
    for (var i in this.d) {
        if (f(this.d[i])) {
            v.push(this.d[i]);
        }
    }
    return v;
};

/* legacy method
 this.filterByParent = function(id) {
 this.filterBy(function(node) {
 return (node.p === id) || (node.p && (node.p.length === 11) && (id === 'shares'));
 });
 };*/


/**
 * filter M.v by parent ID
 * @param {String} id   handle of the parent
 * @returns {Object} duplicates if found
 */
MegaData.prototype.filterByParent = function(id) {
    'use strict';

    var i;
    var node;

    if (id === 'shares') {
        this.v = [];
        var inshares = Object.keys(this.c.shares || {});

        for (i = inshares.length; i--;) {
            node = this.d[inshares[i]] || false;
            // filter label applies here.
            if (
                node.su && !this.d[node.p] && (!M.currentLabelFilter || M.filterByLabel(node)) &&
                (!mega.ui.mNodeFilter || !mega.ui.mNodeFilter.selectedFilters.value || mega.ui.mNodeFilter.match(node))
            ) {
                this.v.push(node);
            }
        }
    }
    else if (this.c[id]) {
        this.v = this.filterByLocation(this.c[id], mega.sensitives.shouldShowNode);
    }
    else if (this.tnc[id]) {
        this.v = this.filterByLocation(this.tnc[id], mega.sensitives.shouldShowNode, true);
    }
    else if (id === 'file-requests') {
        this.v = this.filterByLocation(mega.fileRequest.getPuHandleList());
    }
    else if (id === 'out-shares') {
        this.v = this.filterByLocation(this.getOutShareTree());
    }
    else if (id === 'public-links') {
        this.v = this.filterByLocation(this.su.EXP || {});
    }
    else if (mega.devices && mega.devices.ui
        && M.onDeviceCenter
        && mega.devices.ui.filterChipUtils.selectedFilters.value) {

        for (let i = this.v.length; i--;) {

            if (!mega.devices.ui.filterChipUtils.match(this.v[i])) {

                this.v.splice(i, 1);
            }
        }
    }
    else {
        this.filterBy(function(node) {
            return (node.p === id);
        });
    }
};

/**
 * @param {String} str Keywords to look for
 * @param {String} [customFn] Optional function to call in addition to others
 * @returns {Function}
 */
MegaData.prototype.filterBySearch = function(str, customFn) {
    'use strict';

    str = String(str || '').replace('search/', '').trim();

    if (hashLogic) {
        str = decodeURIComponent(str);
    }

    const pfx = '--';
    if (str.startsWith(pfx)) {
        const command = str.slice(pfx.length);
        str = null;

        if (command === 'findupes') {
            var nodesByHash = {};

            for (var node in this.d) {
                node = this.d[node];

                if (node && node.hash && node.h && M.getNodeRoot(node.h) === this.RootID) {
                    if (!nodesByHash[node.hash]) {
                        nodesByHash[node.hash] = [];
                    }
                    nodesByHash[node.hash].push(node);
                }
            }

            var dupes = Object.keys(nodesByHash).filter(function(hash) {
                return nodesByHash[hash].length > 1;
            });

            this.v = [];
            for (var i in dupes) {
                this.v = this.v.concat(nodesByHash[dupes[i]]);
            }

            if (this.overrideModes) {
                this.overrideModes = 0;
                this.overrideViewMode = 1;
                this.overrideSortMode = ['size', -1];
            }

            // Wait for this.openFolder to finish and set colors to matching hashes
            this.onRenderFinished = function() {
                var find = M.onIconView ? 'a' : 'tr';
                $(M.fsViewSel).find(find).each(function() {
                    var $this = $(this);
                    var node = M.d[$this.attr('id')];

                    if (node) {
                        var color = crc32(asmCrypto.SHA256.hex(node.hash)) >>> 8;

                        if (M.onIconView) {
                            var r = (color >> 16) & 0xff;
                            var g = (color >> 8) & 0xff;
                            var b = color & 0xff;

                            $this.find('.file-block-title')
                                .css({
                                    'border-radius': '0 0 8px 8px',
                                    'background-color': 'rgba(' + r + ',' + g + ',' + b + ',0.3)'
                                });
                        }
                        else {
                            color = ("00" + color.toString(16)).slice(-6);

                            $('.item-type-icon', $this).css('background-color', '#' + color);
                        }
                    }
                });
                loadingDialog.hide();
            };
        }
        else if (command.startsWith('find') || command.startsWith('ctag')) {
            const handles = command.split(/[^\w-]+/).slice(1);

            this.v = [];
            loadingDialog.show();
            Promise.resolve(window.fmdb && dbfetch.geta(handles))
                .then(() => {
                    const v = handles.map((h) => M.d[h]).filter(Boolean);

                    if (pfid && command.startsWith('ctag')) {
                        for (let i = v.length; i--;) {
                            let n = v[i];

                            do {
                                $(`#${n.h}`).removeClassWith('highlight').addClass(`highlight${n.vhl = 1}`);

                            } while ((n = M.d[n.p]));
                        }
                    }
                    else {
                        this.currentdirid = `search/${pfx}${command}`;
                        this.v = v;
                        this.sort();
                        this.renderMain();
                    }
                })
                .catch(tell)
                .finally(() => loadingDialog.hide());
        }
        else {
            console.error('Unknown search command', command);
            str = `${pfx}${command}`;
        }
    }

    if (str) {
        this.filterBy(this.getFilterBySearchFn(str, customFn), true);
        this.appendSearchDevices(str);
    }
};

/**
 * @param {String} [customFn] Optional function to call in addition to others
 * @returns {Function}
 */
MegaData.prototype.getFilterBySearchBasicFn = function(customFn) {
    'use strict';

    const { showGlobally } = mega.sensitives;

    const basicCheck = (n) => n.p !== 'contacts'
        && !n.pwm
        && !n.fv
        && (!M.BackupsId || n.h !== M.BackupsId && n.p !== M.BackupsId)
        && (showGlobally || !n.sen)
        && !mega.devices.ui.isDeprecated(n)
        && (!customFn || customFn(n));

    if (!folderlink && mega.ui.mNodeFilter.selectedFilters.value) {
        return n => basicCheck(n) && mega.ui.mNodeFilter.match(n);
    }

    return basicCheck;
};

/**
 * Builds a name matcher that can be used with both nodes and non-node entities,
 * Unlike getFilterBySearchFn, it does not check node-specific properties
 * @param {String} searchTerm Search term
 * @returns {Function} Name matcher
 */
MegaData.prototype.getSearchNameMatchFn = function(searchTerm) {
    'use strict';

    // Simple glob/wildcard support.
    // spaces are replaced with *, and * moved to regexp's .* matching
    var regex;
    var str = String(searchTerm).toLowerCase().replace(/\s+/g, '*');

    if (str.indexOf('*') !== -1) {
        try {
            regex = RegExp(str.replace(/(\W)/g, '\\$1').replace(/\\\*/g, '.*'), 'i');
        }
        catch (ex) {}
    }

    return regex
        ? ({ name }) => name && regex.test(name) || false
        : ({ name }) => name && name.toLowerCase().includes(str) || false;
};

/**
 * @param {String} searchTerm Search term
 * @param {Function} [customFn] Additional filter function
 * @returns {Function} Node filter function
 */
MegaData.prototype.getFilterBySearchFn = function(searchTerm, customFn) {
    'use strict';

    const strCheck = this.getSearchNameMatchFn(searchTerm);
    const basicCheck = this.getFilterBySearchBasicFn(customFn);

    return n => strCheck(n) && basicCheck(n);
};

/**
 * Adds matching Device Centre devices to the current view
 * Loads the data first if needed and refreshes the view when ready
 * @param {String} searchTerm Search term
 * @returns {void}
 */
MegaData.prototype.appendSearchDevices = function(searchTerm) {
    'use strict';

    searchTerm = String(searchTerm || '').trim();

    // Mobile FM views do not support devices for now
    if (!searchTerm || folderlink || is_mobile || u_type !== 3
        || !mega.ui.searchbar.devicesInScope()) {

        return;
    }
    const {ui} = mega.devices;

    if (!ui.isReady) {
        const dirid = this.currentdirid;

        // Reload the view once the device data is ready, never without it to not loop
        ui.ensureData()
            .then(() => ui.isReady && this.search && this.currentdirid === dirid
                && this.openFolder(dirid, true))
            .catch(dump);
        return;
    }

    // devices do sort above folders, keep them first also when the view is left unsorted
    this.v.unshift(...ui.matchDevices(searchTerm));
};

/**
 * Filter a node contains right .lbl value
 *
 * @param {Object} node  target node
 *
 * @return {Boolean} node has the label or not
 */
MegaData.prototype.filterByLabel = function(node) {
    "use strict";

    if (!node.lbl || !M.currentLabelFilter[node.lbl]) {
        return false;
    }
    return true;
};

/**
 * @param {Object<String, MegaNode>} nodes Predefined nodes to filter
 * @param {Function} [filter] Filter function
 * @param {*} [sin] source is nodes
 * @returns {Array<MegaNode>} Filtered nodes
 */
MegaData.prototype.filterByLocation = function(nodes, filter, sin) {
    'use strict';

    const res = [];
    const hasNodeFilter = mega.ui.mNodeFilter && mega.ui.mNodeFilter.selectedFilters.value;

    for (const h in nodes) {
        const n = sin ? nodes[h] : this.d[h];

        if (
            !n // Undefined node
            || n.fv && M.currentdirid !== 'public-links' // Versioned file not on public-links page
            || (n.s4 && n.p === M.RootID && this.getS4NodeType(n) === 'container') // S4 node
            || (this.gallery && !this.isGalleryNode(n)) // Non-media file in Gallery
            || (this.currentLabelFilter && !this.filterByLabel(n)) // Filter label applies here
            || (hasNodeFilter && !mega.ui.mNodeFilter.match(n))
            || (filter && !filter(n))
        ) {
            continue;
        }

        res.push(n);
    }

    return res;
};
