(function(global) {
    var arrow = '<span class="context-top-arrow"></span><span class="context-bottom-arrow"></span>';

    MegaData.prototype.buildRootSubMenu = function() {

        var cs = '',
            sm = '',
            html = '';

        for (var h in M.c[M.RootID]) {
            if (M.d[h] && M.d[h].t) {
                cs = ' contains-submenu';
                sm = '<span class="dropdown body submenu" id="sm_' + this.RootID + '">'
                    + '<span id="csb_' + this.RootID + '"></span>' + arrow + '</span>';
                break;
            }
        }

        html = '<span class="dropdown body submenu" id="sm_move"><span id="csb_move">'
            + '<span class="dropdown-item cloud-item' + cs + '" id="fi_' + this.RootID + '">'
            + '<i class="small-icon context cloud"></i>' + l[164] + '</span>' + sm
            + '<span class="dropdown-item remove-item" id="fi_' + this.RubbishID + '">'
            + '<i class="small-icon context remove-to-bin"></i>' + l[168] + '</span>'
            + '<hr /><span class="dropdown-item advanced-item"><i class="small-icon context aim"></i>'
            + l[9108] + '</span>' + arrow + '</span></span>';

        $('.dropdown-item.move-item').after(html);
    };

    /*
     * buildSubMenu - context menu related
     * Create sub-menu for context menu parent directory
     *
     * @param {string} id - parent folder handle
     */
    MegaData.prototype.buildSubMenu = function(id) {

        var folders = [],
            sub, cs, sm, fid, sharedFolder, html;
        var nodeName = '';

        for (var i in this.c[id]) {
            if (this.d[i] && this.d[i].t === 1) {
                folders.push(this.d[i]);
            }
        }

        // Check existance of sub-menu
        if ($('#csb_' + id + ' > .dropdown-item').length !== folders.length) {
            // localeCompare is not supported in IE10, >=IE11 only
            // sort by name is default in the tree
            folders.sort(function(a, b) {
                if (a.name) {
                    return a.name.localeCompare(b.name);
                }
            });

            for (var i in folders) {
                sub = false;
                cs = '';
                sm = '';
                fid = folders[i].h;

                for (var h in M.c[fid]) {
                    if (M.d[h] && M.d[h].t) {
                        sub = true;
                        cs = ' contains-submenu';
                        sm = '<span class="dropdown body submenu" id="sm_' + fid + '">'
                            + '<span id="csb_' + fid + '"></span>' + arrow + '</span>';
                        break;
                    }
                }

                sharedFolder = 'folder-item';
                if (typeof M.d[fid].shares !== 'undefined') {
                    sharedFolder += ' shared-folder-item';
                }

                if (missingkeys[fid]) {
                    nodeName = l[8686];
                }
                else {
                    nodeName = this.d[fid].name;
                }

                html = '<span class="dropdown-item ' + sharedFolder + cs + '" id="fi_' + fid + '">'
                    + '<i class="small-icon context ' + sharedFolder + '"></i>'
                    + htmlentities(nodeName) + '</span>' + sm;

                $('#csb_' + id).append(html);
            }
        }
    };
})(this);
