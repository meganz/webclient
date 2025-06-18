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
            if (node.su && !this.d[node.p] && (!M.currentLabelFilter || M.filterByLabel(node))) {
                this.v.push(node);
            }
        }
    }
    else if (this.c[id]) {
        this.v = this.filterByLocation(this.c[id], mega.sensitives.shouldShowNode);
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

MegaData.prototype.filterBySearch = function (str) {
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
        this.filterBy(this.getFilterBySearchFn(str), true);
    }
};

MegaData.prototype.getFilterBySearchFn = function(searchTerm) {
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

    if (mega.ui.mNodeFilter.selectedFilters.value) {
        if (regex) {
            return (n) => n.name && regex.test(n.name) && mega.ui.mNodeFilter.match(n);
        }
        return (n) => n.name && n.name.toLowerCase().includes(str) && mega.ui.mNodeFilter.match(n);
    }

    if (regex) {
        return function(node) {
            return node.name && regex.test(node.name)
                && node.p !== 'contacts'
                && !(node.s4 && node.p === M.RootID && M.getS4NodeType(node) === 'container');
        };
    }

    return function(node) {
        return node.name && node.name.toLowerCase().includes(str)
            && node.p !== 'contacts'
            && !(node.s4 && node.p === M.RootID && M.getS4NodeType(node) === 'container')
            && (!M.BackupsId || node.h !== M.BackupsId && node.p !== M.BackupsId)
            && !mega.devices.ui.isDeprecated(node);
    };
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
 * @returns {Array<MegaNode>} Filtered nodes
 */
MegaData.prototype.filterByLocation = function(nodes, filter) {
    'use strict';

    const res = [];
    const hasNodeFilter = mega.ui.mNodeFilter && mega.ui.mNodeFilter.selectedFilters.value;

    for (const h in nodes) {
        const n = this.d[h];

        if (
            !n // Undefined node
            || n.fv // Versioned file
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
