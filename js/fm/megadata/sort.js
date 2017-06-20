MegaData.prototype.sortBy = function(fn, d) {
    this.v.sort(function(a, b) {
        if (!d) {
            d = 1;
        }
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

MegaData.prototype.getSortByNameFn = function() {
    var self = this;

    return function(a, b, d) {
        // reusing the getNameByHandle code for converting contact's name/email to renderable string
        var itemA = self.getNameByHandle(a.h);
        var itemB = self.getNameByHandle(b.h);

        return M.compareStrings(itemA, itemB, d);
    };
};

MegaData.prototype.sortByName = function(d) {
    if (typeof Intl !== 'undefined' && Intl.Collator) {
        var intl = new Intl.Collator('co', {numeric: true});

        this.sortfn = function(a, b, d) {
            return intl.compare(a.name, b.name) * d;
        };
    }
    else {
        this.sortfn = function(a, b, d) {
            if (typeof a.name === 'string' && typeof b.name === 'string') {
                return a.name.localeCompare(b.name) * d;
            }
            return -1;
        };
    }
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
        return (a.mtime < b.mtime) ? -1 * d : d;
    };
    this.sortd = d;
    this.sort();
};

MegaData.prototype.sortByDateTime = function(d) {
    this.sortfn = this.getSortByDateTimeFn();
    this.sortd = d;
    this.sort();
};

MegaData.prototype.getSortByDateTimeFn = function() {

    var sortfn;

    sortfn = function(a, b, d) {
        if (a.ts < b.ts) {
            return -1 * d;
        }
        else {
            return 1 * d;
        }
    };

    return sortfn;
};

MegaData.prototype.sortByFav = function(d) {
    this.sortfn = this.getSortByFavFn();
    this.sortd = d;
    this.sort();
};

MegaData.prototype.getSortByFavFn = function() {

    var sortfn;

    sortfn = function(a, b, d) {
        if (a.fav) {
            return -1 * d;
        }

        if (b.fav) {
            return d;
        }

        return 0;
    };

    return sortfn;
};

MegaData.prototype.sortBySize = function(d) {
    this.sortfn = this.getSortBySizeFn();
    this.sortd = d;
    this.sort();
};

MegaData.prototype.getSortBySizeFn = function() {
    var nameSort = this.getSortByNameFn();

    return function(a, b, d) {
        if (a.s !== undefined && b.s !== undefined) {
            if (a.s < b.s) {
                return -1 * d;
            }
            return 1 * d;
        }
        // fallback to sorting by name (folders)
        return nameSort(a, b, 1);
    };
};

MegaData.prototype.sortByType = function(d) {
    this.sortfn = function(a, b, d) {
        if (typeof a.name == 'string' && typeof b.name == 'string') {
            return filetype(a.name).localeCompare(filetype(b.name)) * d;
        }
        else {
            return -1;
        }
    }
    this.sortd = d;
    this.sort();
};

MegaData.prototype.sortByOwner = function(d) {
    this.sortfn = function(a, b, d) {
        var usera = Object(M.d[a.su]);
        var userb = Object(M.d[b.su]);

        if (typeof usera.name === 'string' && typeof userb.name === 'string') {
            return usera.name.localeCompare(userb.name) * d;
        }
        else {
            return -1;
        }
    }
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
    $('.grid-table-header .arrow').removeClass('asc desc');

    n = String(n).replace(/\W/g, '');
    if (d > 0) {
        $('.arrow.' + n).addClass('desc');
    }
    else {
        $('.arrow.' + n).addClass('asc');
    }
    this.sortmode = {n: n, d: d};

    if (typeof this.sortRules[n] === 'function') {
        this.sortRules[n](d);

        if (fmconfig.uisorting) {
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
    switch (col) {
        case 'ts':
        case 'mtime':
            // It's valid
            break;
        default:
            // Default value
            col = "ts";
            break;
    }

    if (col === this.lastColumn) {
        return;
    }

    this.lastColumn = col;
    localStorage._lastColumn = this.lastColumn;

    if ($('.do-sort[data-by="' + col + '"]').length > 0) {
        // swap the column label
        $('.dropdown-item.do-sort').removeClass('selected');
        $('.grid-url-header').prev().find('div')
            .removeClass().addClass('arrow ' + col)
            .text($('.do-sort[data-by="' + col + '"]').text());
        $('.do-sort[data-by="' + col + '"]').addClass('selected');
    }
};
