MegaData.prototype.sortBy = function(fn, d) {
    'use strict';

    if (!d) {
        d = 1;
    }
    this.v.sort(function(a, b) {
        if (a.t > b.t) {
            return -1;
        }
        else if (a.t < b.t) {
            return 1;
        }

        return fn(a, b, d);
    });
    this.sortfn = fn;
    this.sortd = d;
};

MegaData.prototype.sort = function() {
    this.sortBy(this.sortfn, this.sortd);
};

MegaData.prototype.sortReverse = function() {
    var d = 1;
    if (this.sortd > 0) {
        d = -1;
    }

    this.sortBy(this.sortfn, d);
};

MegaData.prototype.doFallbackSort = function(a, b, d) {
    'use strict';

    if (a.ts !== b.ts) {
        return (a.ts < b.ts ? -1 : 1) * d;
    }

    if (this.collator) {
        return this.collator.compare(a.h, b.h) * d;
    }

    return String(a.h).localeCompare(String(b.h)) * d;
};

MegaData.prototype.doFallbackSortWithName = function(a, b, d) {
    'use strict';

    if (a.name !== b.name) {
        if (this.collator) {
            return this.collator.compare(a.name, b.name) * d;
        }

        return String(a.name).localeCompare(String(b.name)) * d;
    }

    return M.doFallbackSort(a, b, d);
};

MegaData.prototype.getSortByNameFn = function() {

    var self = this;

    return function(a, b, d) {
        // reusing the getNameByHandle code for converting contact's name/email to renderable string
        var itemA = self.getNameByHandle(a.h);
        var itemB = self.getNameByHandle(b.h);

        if (itemA !== itemB) {
            return M.compareStrings(itemA, itemB, d);
        }

        return M.doFallbackSort(itemA, itemB, d);
    };
};

MegaData.prototype.getSortByNameFn2 = function(d) {
    'use strict';

    if (typeof Intl !== 'undefined' && Intl.Collator) {
        var intl = this.collator || new Intl.Collator('co', {numeric: true});

        return function(a, b) {

            var nameA = (a.nickname) ? a.nickname + ' (' + a.name + ')' : a.name;
            var nameB = (b.nickname) ? b.nickname + ' (' + b.name + ')' : b.name;

            if (nameA !== nameB) {
                return intl.compare(nameA, nameB) * d;
            }

            return M.doFallbackSort(a, b, d);
        };
    }

    return function(a, b) {
        if (typeof a.name === 'string' && typeof b.name === 'string') {

            var nameA = (a.nickname) ? a.nickname + ' (' + a.name + ')' : a.name;
            var nameB = (b.nickname) ? b.nickname + ' (' + b.name + ')' : b.name;

            return nameA.localeCompare(nameB) * d;
        }
        return M.doFallbackSort(a, b, d);
    };
};

MegaData.prototype.sortByName = function(d) {
    'use strict';

    this.sortfn = M.getSortByNameFn2(d);
    this.sortd = d;
    this.sort();
};

MegaData.prototype.sortByEmail = function(d) {
    "use strict";

    if (typeof Intl !== 'undefined' && Intl.Collator) {
        var intl = new Intl.Collator('co', {numeric: true});

        this.sortfn = function(a, b, d) {
            return intl.compare(a.m, b.m) * d;
        };
    }
    else {
        this.sortfn = function(a, b, d) {
            if (typeof a.m === 'string' && typeof b.m === 'string') {
                return a.m.localeCompare(b.m) * d;
            }
            return -1;
        };
    }
    this.sortd = d;
    this.sort();
};

MegaData.prototype.sortByModTime = function(d) {
    this.sortfn = function(a, b, d) {

        // folder not having mtime, so sort by Name.
        if (!a.mtime || !b.mtime) {
            return M.doFallbackSortWithName(a, b, d);
        }

        var time1 = a.mtime - a.mtime % 60;
        var time2 = b.mtime - b.mtime % 60;
        if (time1 !== time2) {
            return (time1 < time2 ? -1 : 1) * d;
        }

        return M.doFallbackSortWithName(a, b, d);
    };
    this.sortd = d;
    this.sort();
};

MegaData.prototype.sortByDateTime = function(d) {
    this.sortfn = this.getSortByDateTimeFn();
    this.sortd = d;
    this.sort();
};

MegaData.prototype.getSortByDateTimeFn = function(type) {

    var sortfn;

    sortfn = function(a, b, d) {
        var getMaxShared = function _getMaxShared(shares) {
            var max = 0;
            for (var i in shares) {
                if (i !== 'EXP') {
                    max = Math.max(max, shares[i].ts - shares[i].ts % 60);
                }
            }
            return max;
        };

        var time1 = a.ts - a.ts % 60;
        var time2 = b.ts - b.ts % 60;

        if (M.currentdirid === 'out-shares' || type === 'out-shares') {
            time1 = M.ps[a.h] ? getMaxShared(M.ps[a.h]) : getMaxShared(a.shares);
            time2 = M.ps[b.h] ? getMaxShared(M.ps[b.h]) : getMaxShared(b.shares);
        }

        if ((M.currentdirid === 'public-links' && !$.dialog) || type === 'public-links') {
            var largeNum = 99999999999 * d;

            if (a.shares === undefined && M.su.EXP[a.h]) {
                a = M.d[a.h];
            }
            if (b.shares === undefined && M.su.EXP[b.h]) {
                b = M.d[b.h];
            }

            time1 = (a.shares && a.shares.EXP) ? a.shares.EXP.ts : largeNum;
            time2 = (b.shares && b.shares.EXP) ? b.shares.EXP.ts : largeNum;
        }

        if (time1 !== time2) {
            return (time1 < time2 ? -1 : 1) * d;
        }

        return M.doFallbackSortWithName(a, b, d);
    };

    return sortfn;
};

MegaData.prototype.sortByRts = function(d) {
    'use strict';
    this.sortfn = this.getSortByRtsFn();
    this.sortd = d;
    this.sort();
};

MegaData.prototype.getSortByRtsFn = function() {
    'use strict';

    var sortfn;

    sortfn = function(a, b, d) {
        var time1 = a.rts - a.rts % 60 || 0;
        var time2 = b.rts - b.rts % 60 || 0;
        if (time1 !== time2) {
            return (time1 < time2 ? -1 : 1) * d;
        }

        return M.doFallbackSortWithName(a, b, d);
    };

    return sortfn;
};

MegaData.prototype.sortByFav = function(d) {
    "use strict";

    var fn = this.sortfn = this.sortByFavFn(d);
    this.sortd = d;

    if (!d) {
        d = 1;
    }

    // label sort is not doing folder sorting first. therefore using view sort directly to avoid.
    this.v.sort(function(a, b) {
        return fn(a, b, d);
    });
};

MegaData.prototype.sortByFavFn = function(d) {
    "use strict";

    return function(a, b) {
        if ((a.t & M.IS_FAV || a.fav) && (b.t & M.IS_FAV || b.fav)) {
            return M.doFallbackSortWithFolder(a, b, d);
        }
        if (a.t & M.IS_FAV || a.fav) {
            return -1 * d;
        }
        else if (b.t & M.IS_FAV || b.fav) {
            return d;
        }
        else {
            return M.doFallbackSortWithFolder(a, b, d);
        }
    };
};

MegaData.prototype.sortBySize = function(d) {
    this.sortfn = this.getSortBySizeFn();
    this.sortd = d;
    this.sort();
};

MegaData.prototype.getSortBySizeFn = function() {
    'use strict';

    var nameSort = Object.create(null);
    nameSort['1'] = this.getSortByNameFn2(1);
    nameSort['-1'] = this.getSortByNameFn2(-1);

    return function(a, b, d) {

        var aSize = a.s || a.tb || 0;
        var bSize = b.s || b.tb || 0;
        if (aSize === bSize) {
            // zeros or equal in general
            return nameSort[d](a, b);
        }
        return (aSize < bSize ? -1 : 1) * d;
    };
};

MegaData.prototype.sortByType = function(d) {
    this.sortfn = function(a, b, d) {
        if (typeof a.name === 'string' && typeof b.name === 'string') {
            var type1 = filetype(a.name);
            var type2 = filetype(b.name);

            if (type1 !== type2) {
                return M.compareStrings(type1, type2, d);
            }
        }

        return M.doFallbackSortWithName(a, b, d);
    };
    this.sortd = d;
    this.sort();
};

MegaData.prototype.sortByOwner = function(d) {
    this.sortfn = function(a, b, d) {
        var usera = Object(M.d[a.su]);
        var userb = Object(M.d[b.su]);

        if (typeof usera.name === 'string' && typeof userb.name === 'string') {

            var namea = usera.name === userb.name ? usera.name + a.su : usera.name;
            var nameb = usera.name === userb.name ? userb.name + b.su : userb.name;

            return namea.localeCompare(nameb) * d;
        }

        return M.doFallbackSort(usera, userb, d);
    };
    this.sortd = d;
    this.sort();
};

MegaData.prototype.sortByAccess = function(d) {
    this.sortfn = function(a, b, d) {
        if (typeof a.r !== 'undefined' && typeof b.r !== 'undefined' && a.r < b.r) {
            return -1 * d;
        }
        else {
            return 1 * d;
        }
    }
    this.sortd = d;
    this.sort();
};


MegaData.prototype.sortContacts = function(folders) {
    // in case of contacts we have custom sort/grouping:
    if (localStorage.csort) {
        this.csort = localStorage.csort;
    }
    if (localStorage.csortd) {
        this.csortd = parseInt(localStorage.csortd);
    }

    if (this.csort == 'shares') {
        folders.sort(function(a, b) {
            if (M.c[a.h] && M.c[b.h]) {
                if (a.name) {
                    return a.name.localeCompare(b.name);
                }
            }
            else if (M.c[a.h] && !M.c[b.h]) {
                return 1 * M.csortd;
            }
            else if (!M.c[a.h] && M.c[b.h]) {
                return -1 * M.csortd;
            }
            return 0;
        });
    }
    else if (this.csort == 'name') {
        folders.sort(function(a, b) {
            if (a.name) {
                return parseInt(a.name.localeCompare(b.name) * M.csortd);
            }
        });
    }
    else if (this.csort == 'chat-activity') {
        folders.sort(function(a, b) {
            var aTime = M.u[a.h].lastChatActivity;
            var bTime = M.u[b.h].lastChatActivity;

            if (aTime && bTime) {
                if (aTime > bTime) {
                    return 1 * M.csortd;
                }
                else if (aTime < bTime) {
                    return -1 * M.csortd;
                }
                else {
                    return 0;
                }
            }
            else if (aTime && !bTime) {
                return 1 * M.csortd;
            }
            else if (!aTime && bTime) {
                return -1 * M.csortd;
            }

            return 0;
        });
    }

    return folders;
};

MegaData.prototype.getSortStatus = function(u) {
    var status = megaChatIsReady && megaChat.getPresence(u);

    // To implement some kind of ordering we need to translate the actual UserPresence.PRESENCE.* state to an
    // integer that would be then used for sorting (e.g. ONLINE first = return 1, OFFLINE last, return 4)
    // PS: Because of chat is being loaded too late, we can't use the User.PRESENCE.* reference.
    if (status === 3) {
        // UserPresence.PRESENCE.ONLINE
        return 1;
    }
    else if (status === 4) {
        // UserPresence.PRESENCE.DND
        return 2;
    }
    else if (status === 2) {
        // UserPresence.PRESENCE.AWAY
        return 3;
    }
    else {
        return 4;
    }
};

MegaData.prototype.getSortByStatusFn = function(d) {

    var sortfn;

    sortfn = function(a, b, d) {
        var statusa = M.getSortStatus(a.u), statusb = M.getSortStatus(b.u);
        if (statusa < statusb) {
            return -1 * d;
        }
        else if (statusa > statusb) {
            return 1 * d;
        }
        else {
            // if status is the same for both, compare names.
            return M.compareStrings(
                M.getNameByHandle(a.h).toLowerCase(),
                M.getNameByHandle(b.h).toLowerCase(),
                d
            );
        }
    };

    return sortfn;
};

MegaData.prototype.sortByStatus = function(d) {
    this.sortfn = this.getSortByStatusFn(d);
    this.sortd = d;
    this.sort();
};

MegaData.prototype.getSortByVersionFn = function() {
    'use strict';
    var sortfn;

    sortfn = function(a, b, d) {

        var av = a.tvf || 0;
        var ab = a.tvb || 0;
        var bv = b.tvf || 0;
        var bb = b.tvb || 0;

        if (av < bv) {
            return -1 * d;
        }
        else if (av > bv) {
            return d;
        }
        else if (ab < bb) {
            return -1 * d;
        }
        else if (ab > bb) {
            return d;
        }
    };

    return sortfn;
};

MegaData.prototype.sortByVersion = function(d) {
    'use strict';
    this.sortfn = this.getSortByVersionFn();
    this.sortd = d;
    this.sort();
};

MegaData.prototype.getSortByInteractionFn = function() {
    var self = this;

    var sortfn;

    sortfn = M.sortObjFn(
        function(r) {

            // Since the M.sort is using a COPY of the data,
            // we need an up-to-date .ts value directly from M.u[...]
            return Object(M.u[r.h]).ts;
        },
        d,
        function(a, b, d) {
            // fallback to string/name matching in case last interaction is the same
            return M.compareStrings(
                self.getNameByHandle(a.h).toLowerCase(),
                self.getNameByHandle(b.h).toLowerCase(),
                d
            );
        }
    );

    return sortfn;
};

MegaData.prototype.sortByInteraction = function(d) {
    this.sortfn = this.getSortByInteractionFn();
    this.sortd = d;
    this.sort();
};

MegaData.prototype.doSort = function(n, d) {
    "use strict";
    // don't touch the .arrow's in Archived chats.
    $('.grid-table-header .arrow:not(.is-chat)').removeClass('asc desc');
    $('.files-menu.context .submenu.sorting .dropdown-item.sort-grid-item').removeClass('selected');

    n = String(n).replace(/\W/g, '');
    if (d > 0) {
        $('.arrow.' + n + ':not(.is-chat)').addClass('desc');
    }
    else {
        $('.arrow.' + n + ':not(.is-chat)').addClass('asc');
    }

    var sortClassinSubMenu = '.sort-' + n;

    if (n === 'ts') {
        sortClassinSubMenu = '.sort-timeAd';
    }
    else if (n === 'mtime') {
        sortClassinSubMenu = '.sort-timeMd';
    }
    else if (n === 'date') {
        sortClassinSubMenu = '.sort-sharecreated, .sort-timeAd';
    }

    $('.files-menu.context .submenu.sorting .dropdown-item.sort-grid-item' + sortClassinSubMenu).addClass('selected');

    this.sortmode = {n: n, d: d};

    if (typeof this.sortRules[n] === 'function') {
        this.sortRules[n](d);

        if (this.fmsorting) {
            mega.config.set('sorting', this.sortmode);
        }
        else {
            fmsortmode(this.currentdirid, n, d);
        }
    }
    else if (d) {
        console.warn("Cannot sort by " + n);
    }
};

MegaData.prototype.setLastColumn = function(col) {
    "use strict";
    return;
};

MegaData.prototype.sortByLabel = function(d) {
    "use strict";

    var fn = this.sortfn = this.sortByLabelFn(d);
    this.sortd = d;

    if (!d) {
        d = 1;
    }

    // label sort is not doing folder sorting first. therefore using view sort directly to avoid.
    this.v.sort(function(a, b) {
        return fn(a, b, d);
    });
};

MegaData.prototype.sortByLabelFn = function(d, isTree) {
    "use strict";

    // sorting with labels
    return function(a, b) {
        if (a.lbl && b.lbl) {
            if (a.lbl !== b.lbl) {
                return (a.lbl < b.lbl ? -1 : 1) * d;
            }
            else {
                // after sorting with labels, if this is not tree sorting, sort again with folder
                if (!isTree) {
                    return M.doFallbackSortWithFolder(a, b);
                }
                else {
                    // if this is tree, skip folder sorting and sort by name;
                    return M.doFallbackSortWithName(a, b, 1);
                }
            }
        }
        else if (a.lbl) {
            if (d < 0){
                return a.lbl * d;
            }
            else {
                return -a.lbl * d;
            }
        }
        else if (b.lbl) {
            if (d < 0){
                return -b.lbl * d;
            }
            else {
                return b.lbl * d;
            }
        }
        else {
            // if this items are not set with labels, if this is not tree sorting, sorting it with folder.
            if (!isTree) {
                return M.doFallbackSortWithFolder(a, b);
            }
            else {
                // if this is tree, skip folder sorting and sort by name;
                return M.doFallbackSortWithName(a, b, 1);
            }
        }
    };
};

MegaData.prototype.doFallbackSortWithFolder = function(a, b) {
    "use strict";

    if (a.t > b.t) {
        return -1;
    }
    else if (a.t < b.t) {
        return 1;
    }
    // even direction is desc, sort name by asc.
    return M.doFallbackSortWithName(a, b, 1);
};

MegaData.prototype.getSortBySharedWithFn = function() {
    'use strict';

    return function(a, b, d) {

        var aShareNames = [];
        var bShareNames = [];

        for (var i in a.shares) {
            if (a.shares[i]) {
                aShareNames.push(M.getNameByHandle(i));
            }
        }
        for (var j in b.shares) {
            if (b.shares[j]) {
                bShareNames.push(M.getNameByHandle(j));
            }
        }
        aShareNames = aShareNames.sort().join();
        bShareNames = bShareNames.sort().join();

        if (aShareNames !== bShareNames) {
            return M.compareStrings(aShareNames, bShareNames, d);
        }
        return M.doFallbackSortWithName(a, b, d);
    };
};

MegaData.prototype.sortBySharedWith = function(d) {
    'use strict';

    var fn = this.sortfn = this.getSortBySharedWithFn();
    this.sortd = d;

    if (!d) {
        d = 1;
    }

    // label sort is not doing folder sorting first. therefore using view sort directly to avoid.
    this.v.sort(function(a, b) {
        return fn(a, b, d);
    });
};
