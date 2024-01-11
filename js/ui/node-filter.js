/** @property mega.ui.mNodeFilter */
lazy(mega.ui, 'mNodeFilter', () => {
    'use strict';

    // DOM caches
    const $filterChipsWrapper = $('.fm-filter-chips-wrapper');
    const $filterChips = $('.fm-filter-chips', $filterChipsWrapper);
    const $resetFilterChips = $('.fm-filter-reset', $filterChips);

    // For modified date calculation, use today's date
    const today = new Date();
    const currentYearStart = new Date(today.getFullYear(), 0, 1);
    const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
    const lastYearEnd =  new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59);

    // static sections where we don't show filtering capabilities
    const hiddenSections = new Set([
        'shares', 'out-shares', 'file-requests', 'faves', 'recents'
    ]);

    // filtering bitfield
    let selectedFilters = 0;

    // Available filters
    const filters = {
        type: {
            title: l.filter_chip_type,
            selection: false,
            eid: 99941,
            match(n) {
                if (n.t) {
                    return this.selection.includes('folder');
                }

                const fext = fileext(n.name, false, true);
                if (!fext) {
                    return false;
                }

                if (this.selection.includes('other')) {
                    if (!this.types) {
                        this.types = this.menu.map(e => e.data).filter(Boolean).flat();
                    }
                    return !ext[fext] || !this.types.includes(ext[fext][0]);
                }

                return ext[fext] && this.selection.includes(ext[fext][0]);
            },
            menu: [
                {
                    icon: 'recents',
                    label: l.filter_chip_type_all,
                    data: null,
                    eid: 99942
                },
                {
                    icon: 'images',
                    label: l.filter_chip_type_images,
                    data: ['image'],
                    eid: 99943
                },
                {
                    icon: 'file',
                    label: l.filter_chip_type_documents,
                    data: ['word'],
                    eid: 99944
                },
                {
                    icon: 'audio-filled',
                    label: l.filter_chip_type_audio,
                    data: ['audio'],
                    eid: 99945
                },
                {
                    icon: 'videos',
                    label: l.filter_chip_type_video,
                    data: ['video'],
                    eid: 99946
                },
                {
                    icon: 'file',
                    label: l.filter_chip_type_pdf,
                    data: ['pdf'],
                    eid: 99947
                },
                {
                    icon: 'play-square',
                    label: l.filter_chip_type_presentation,
                    data: ['powerpoint'],
                    eid: 99948
                },
                {
                    icon: 'view-medium-list',
                    label: l.filter_chip_type_spreadsheets,
                    data: ['spreadsheet', 'excel'],
                    eid: 99949
                },
                {
                    icon: 'folder',
                    label: l.filter_chip_type_folder,
                    data: ['folder'],
                    eid: 99950
                },
                {
                    icon: 'question-filled',
                    label: l.filter_chip_type_other,
                    data: ['other'],
                    eid: 99951
                },
            ]
        },

        mtime: {
            title: l.filter_chip_mdate,
            selection: false,
            eid: 99953,
            match(n) {
                const nodeMtime = (n.mtime || n.ts) * 1000;

                // Date range
                if (this.selection && this.selection.min && this.selection.max) {
                    return nodeMtime >= this.selection.min && nodeMtime <= this.selection.max;
                }

                return this.selection < 0 ? nodeMtime < lastYearStart : nodeMtime >= this.selection;
            },
            menu: [
                {
                    eid: 99957,
                    label: l.filter_chip_mdate_today,
                    get data() {
                        // Set hours to 12am today
                        return new Date().setHours(0, 0 ,0 ,0);
                    }
                },
                {
                    eid: 99958,
                    label: l.filter_chip_mdate_seven,
                    get data() {
                        return new Date().setDate(today.getDate() - 7);
                    }
                },
                {
                    eid: 99959,
                    label: l.filter_chip_mdate_thirty,
                    get data() {
                        return new Date().setDate(today.getDate() - 30);
                    }
                },
                {
                    eid: 99960,
                    label: l.filter_chip_mdate_year,
                    get data() {
                        return currentYearStart;
                    }
                },
                {
                    eid: 99974,
                    label: l.filter_chip_mdate_lyear,
                    get data() {
                        return  {
                            min: lastYearStart,
                            max: lastYearEnd
                        };
                    }
                },
                {
                    eid: 99961,
                    label: l.filter_chip_mdate_older,
                    get data() {
                        return -1;
                    }
                }
            ]
        },

        dateadded: {
            title: l['17445'],
            selection: false,
            eid: 500018,
            match(n) {

                const nodeAddedTime = n.ts * 1000;

                // Date range
                if (this.selection && this.selection.min && this.selection.max) {
                    return nodeAddedTime >= this.selection.min && nodeAddedTime <= this.selection.max;
                }

                return this.selection < 0 ? nodeAddedTime < lastYearStart : nodeAddedTime >= this.selection;
            },
            menu: [
                {
                    eid: 99995,
                    label: l.filter_chip_mdate_today,
                    get data() {
                        // Set hours to 12am today
                        return new Date().setHours(0, 0 ,0 ,0);
                    }
                },
                {
                    eid: 500013,
                    label: l.filter_chip_mdate_seven,
                    get data() {
                        return new Date().setDate(today.getDate() - 7);
                    }
                },
                {
                    eid: 500014,
                    label: l.filter_chip_mdate_thirty,
                    get data() {
                        return new Date().setDate(today.getDate() - 30);
                    }
                },
                {
                    eid: 500015,
                    label: l.filter_chip_mdate_year,
                    get data() {
                        return currentYearStart;
                    }
                },
                {
                    eid: 500017,
                    label: l.filter_chip_mdate_lyear,
                    get data() {
                        return  {
                            min: lastYearStart,
                            max: lastYearEnd
                        };
                    }
                },
                {
                    eid: 500016,
                    label: l.filter_chip_mdate_older,
                    get data() {
                        return -1;
                    }
                }
            ]
        },

        location: {
            title: l['17818'],
            selection: false,
            eid: 99979,
            shouldShow() {
                return !!M.search;
            },
            match(n) {

                // Get root dir name (or handle) e.g. what M.currentrootid would give if in a specific area
                const root = M.getNodeRoot(n.h);

                // Match nodes in Cloud Drive, Favourites, Backups, Rubbish bin, Incoming shares,
                // or Outgoing shares (NB: Outgoing shares (includes the external links - for now)
                if ((this.selection.includes('cloud') && root === M.RootID) ||
                   (this.selection.includes('favourites') && n.fav) ||
                   (this.selection.includes('backups') && n.devid) ||
                   (this.selection.includes('rubbish') && root === M.RubbishID) ||
                   (this.selection.includes('incoming') && root === 'shares') ||
                   (this.selection.includes('outgoing') && n.shares)) {

                    return true;
                }

                // Match recently created (not exactly the same list as fm/recents, could potentially use
                // getRecentActionsList() but it's not loaded before searching so n.recent is not populated)
                if (this.selection.includes('recents')) {

                    const currentTimestamp = unixtime();
                    const recentsThreshold = currentTimestamp - (60 * 60 * 24 * 7 * 12);    // 12 weeks (3 months)

                    // If the created timestamp is more than x weeks ago, include it
                    if (n.ts >= recentsThreshold) {
                        return true;
                    }
                }

                return false;
            },
            menu: [
                {
                    icon: 'mega-thin-solid',
                    label: l.all_mega,
                    data: null,
                    eid: 99980
                },
                {
                    icon: 'cloud-drive',
                    label: l['164'],
                    data: ['cloud'],
                    eid: 99981
                },
                {
                    icon: 'recents-filled',
                    label: l['20141'],
                    data: ['recents'],
                    eid: 99982
                },
                {
                    icon: 'favourite-filled',
                    label: l.gallery_favourites,
                    data: ['favourites'],
                    eid: 99983
                },
                {
                    icon: 'database-filled',
                    label: l.restricted_folder_button,
                    data: ['backups'],
                    eid: 99984
                },
                {
                    icon: 'bin-filled',
                    label: l['168'],
                    data: ['rubbish'],
                    eid: 99985
                },
                {
                    icon: 'folder-incoming-share',
                    label: l['5542'],
                    data: ['incoming'],
                    eid: 99986
                },
                {
                    icon: 'folder-outgoing-share',
                    label: l['5543'],
                    data: ['outgoing'],
                    eid: 99987
                }
            ]
        }
    };
    Object.setPrototypeOf(filters, null);

    /**
     * The filter chip dropdown component
     * @extends MMenuSelect
     */
    class FilterChip extends MMenuSelect {

        /**
         * Create a FilterChip.
         * @param {String} name static filter identifier.
         */
        constructor(name) {
            super(null, ['hide-radio-on']);

            this.$selectedMarkTemplate = $('.selected-mark-template', $filterChipsWrapper);
            this.$element = $(`.fm-filter-chip-${name}`, $filterChipsWrapper);
            this.$text = $('.fm-filter-chip-button-text', this.$element);

            Object.defineProperty(this, 'name', {value: name});
            Object.defineProperty(this, 'ident', {value: 1 << Object.keys(filters).indexOf(name)});
            Object.defineProperty(this, 'ctx', {value: filters[name]});

            // @todo make this 'click' still optional for our purpose in MMenuSelect(?)
            for (let i = this.ctx.menu.length; i--;) {
                this.ctx.menu[i].click = nop;
            }
            this.options = this.ctx.menu;
            this.selectedIndex = -1;

            this.$element.rebind(`click.filterByType${name}`, () => {
                if (this.ctx.eid) {
                    eventlog(this.ctx.eid);
                }

                const {x, bottom} = this.$element.get(0).getBoundingClientRect();
                this.show(x, bottom + 1);

                // If no item has been selected yet, reset to the default state
                if (this.selectedIndex === -1) {
                    this.$text.text(this.ctx.title);
                    this.$element.removeClass('selected');
                }
            });

            $resetFilterChips.rebind(`click.resetFilterBy${name}`, () => this.resetToDefault());
        }

        /**
         * Sets the options for the filter chip and updates the checkmark for each option.
         * @param {Array} list - The list of options
         */
        set options(list) {
            super.options = list;

            for (let i = 0; i < this._options.length; i++) {
                const $checkmark = this.$selectedMarkTemplate.clone();
                $checkmark.removeClass('selected-mark-template hidden');
                $(this._options[i].el).safeAppend($checkmark.prop('outerHTML'));
            }
        }

        /**
         * Resets the filter to its default state.
         *
         * @returns {undefined}
         */
        resetToDefault() {
            this.selectedIndex = -1;

            for (let i = 0; i < this._options.length; i++) {
                this._options[i].deselectItem();
                this._options[i].el.classList.remove('selected');
            }

            selectedFilters &= ~this.ident;

            this.ctx.selection = false;
            this.$text.text(this.ctx.title);
            this.$element.removeClass('selected');

            if (!selectedFilters) {
                $resetFilterChips.addClass('hidden');
            }

            if (this.ctx.shouldShow) {

                this.$element.toggleClass('hidden', !this.ctx.shouldShow());
            }
        }

        /**
         * Handles the selection of an item.
         * @param {number} index - The index of the selected item.
         * @param {Object} item - The selected item object.
         *
         * @returns {undefined}
         */
        onItemSelect(index, item) {

            if (index === this.selectedIndex) {
                this.resetToDefault();
                M.openFolder(M.currentdirid, true);
                if (this.autoDismiss) {
                    this.hide(true);
                }
                return;
            }

            item.el.classList.add('selected');

            for (let i = 0; i < this._options.length; i++) {
                if (item.el !== this._options[i].el) {
                    this._options[i].deselectItem();
                    this._options[i].el.classList.remove('selected');
                }
            }

            this.selectedIndex = index;

            if (this.autoDismiss) {
                this.hide(true);
            }

            const entry = this.ctx.menu[index];
            if (entry.eid) {
                eventlog(entry.eid, JSON.stringify([1, !!pfid | 0, M.getPath(M.currentdirid).length]));
            }
            this.ctx.selection = entry.data;

            selectedFilters |= this.ident;
            this.$text.text(item.el.innerText);
            this.$element.addClass('selected');
            $resetFilterChips.removeClass('hidden');

            // @todo instead of going all through openFolder() we may want to filterBy(search|parent) + renderMain()
            M.openFolder(M.currentdirid, true);
        }
    }

    // Public API.
    return freeze({
        /**
         * Sets up the chips, checking the current page and initializing the type filter chip if applicable.
         *
         * @returns {undefined}
         */
        initSearchFilter() {
            $filterChipsWrapper.removeClass('hidden');

            for (const name in filters) {
                const ctx = filters[name];

                if (!ctx.component) {
                    ctx.component = new FilterChip(name);
                }
            }

            $resetFilterChips.rebind('click.resetFilters', () => {

                M.openFolder(M.currentdirid, true);
            });
        },
        match(n) {

            if (n.name && n.p !== 'contacts' && !(n.s4 && n.p === this.RootID)) {

                for (const name in filters) {
                    const ctx = filters[name];

                    if (ctx.selection && !ctx.match(n)) {

                        return false;
                    }
                }

                return true;
            }

            return false;
        },
        resetFilterSelections(stash) {

            if (!stash) {

                for (const name in filters) {
                    const ctx = filters[name];

                    if (ctx.component) {
                        ctx.component.resetToDefault();
                    }
                }
            }

            const hidden = M.gallery || M.chat || M.albums
                || M.currentrootid === M.RubbishID
                || hiddenSections.has(M.currentdirid)
                || M.currentrootid && M.currentrootid === (M.BackupsId && M.getNodeByHandle(M.BackupsId).p)
                || M.currentrootid === 's4' && M.currentCustomView.subType !== 'bucket'
                || String(M.currentdirid).startsWith('user-management')
                || folderlink;

            if (hidden) {
                $filterChipsWrapper.addClass('hidden');
            }
            else {
                this.initSearchFilter();
            }
        },
        get selectedFilters() {
            return selectedFilters;
        }
    });
});
