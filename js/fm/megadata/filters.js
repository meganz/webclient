MegaData.prototype.filterBy = function(f, omitVersions) {
    this.filter = f;
    this.v = [];
    for (var i in this.d) {
        if ((!omitVersions || !this.d[i].fv) && f(this.d[i])) {
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

MegaData.prototype.filterByParent = function(id) {
    var i;
    var node;

    if (id === 'shares') {
        this.v = [];
        var inshares = Object.keys(this.c.shares || {});
        for (i = inshares.length; i--;) {
            node = this.d[inshares[i]] || false;

            if (node.su && !this.d[node.p]) {
                this.v.push(node);
            }
        }
    }
    else if (id === 'contacts') {
        this.v = [];
        var contacts = Object.keys(this.c.contacts || {});
        for (i = contacts.length; i--;) {
            node = this.d[contacts[i]] || false;

            if (node.c === 1) {
                // Fill M.v with active contacts only
                this.v.push(node);
            }
        }
    }
    // We should have a parent's childs into M.c, no need to traverse the whole M.d
    else if (this.c[id]) {
        this.v = Object.keys(this.c[id])
            .map(function(h) {
                return M.d[h];
            })
            .filter(function(n) {
                return n !== undefined;
            });
    }
    else {
        this.filterBy(function(node) {
            return (node.p === id);
        });
    }
};

MegaData.prototype.filterBySearch = function (str) {
    if (hashLogic) {
        str = decodeURIComponent(String(str || '').replace('search/', '')).toLowerCase();
    }
    else {
        str = String(str || '').replace('search/', '').toLowerCase();
    }

    if (str[0] === '~') {
        var command = str.substr(1);
        str = null;

        /*jshint -W089 */
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
                var find = M.viewmode ? 'a' : 'tr';
                $(window).trigger('dynlist.flush');
                $(M.fsViewSel).find(find).each(function() {
                    var $this = $(this);
                    var node = M.d[$this.attr('id')];

                    if (node) {
                        var color = crc32(asmCrypto.SHA256.hex(node.hash)) >>> 8;

                        if (M.viewmode) {
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

                            $this.find('.transfer-filetype-icon')
                                .css('background-color', '#' + color);
                        }
                    }
                });
                loadingDialog.hide();
            };
        }
        else {
            console.error('Unknown search command', command);
            str = '~' + command;
        }
        /*jshint +W089 */
    }

    if (str) {
        this.filterBy(this.getFilterBySearchFn(str), true);
    }
};

MegaData.prototype.getFilterBySearchFn = function(searchTerm) {
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

    if (regex) {
        return function(node) {
            return (regex.test(node.name) && node.p !== 'contacts');
        };
    }

    return function(node) {
        return (node.name && node.name.toLowerCase().indexOf(str) !== -1 && node.p !== 'contacts');
    };
};
