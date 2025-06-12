/**
 * @file Functions which initialise and control the search bars at the top of every page
 * @property mega.ui.searchbar
 */
lazy(mega.ui, 'searchbar', () => {
    'use strict';

    let $topbar;
    let $dropdownSearch;
    let $dropdownEmptyState;
    let $dropdownRecents;
    let $dropdownResults;
    let $fileSearch;

    let showEmptyState;

    const recentlySearched = {

        justSearched: false,
        /**
         * Recently searched terms
         * @type {Set<string>}
         */
        terms: new Set(),

        /**
         * Number of search terms to show in view
         * @type {number}
         */
        numTermsInView: 5,

        /**
         * Maximum number of search terms to keep in persistent storage
         * @type {number}
         */
        maxStored: 20,

        /**
         * Saves current terms
         *
         * @return {Promise}
         */
        async save() {
            if (u_type > 0) {
                return M.setPersistentData(`${u_handle}!rs`, tlvstore.encrypt([...this.terms]));
            }
        },

        /**
         * Adds a search term to the list of search terms
         *
         * @param {string} term The search term
         * @return {Promise}
         */
        async addTerm(term) {
            // Delete the term if it exists
            this.terms.delete(term);
            // Append the term (to make recent terms appear first)
            this.terms.add(term);
            if (this.terms.size > this.maxStored) {
                const [firstTerm] = this.terms;
                this.terms.delete(firstTerm);
            }
            return this.save();
        },

        /**
         * Delete a search term from the list of search terms
         *
         * @param {string} term The search term
         * @return {Promise}
         */
        async deleteTerm(term) {
            this.terms.delete(term);
            await this.save();
            return this.update(true);
        },

        /**
         * Clears the list of search terms
         *
         * @param {boolean} skipUpdate Is the view refreshed after clear
         * @return {Promise}
         */
        async clear(skipUpdate = false) {
            this.terms.clear();

            return M.delPersistentData(`${u_handle}!rs`)
                .finally(() => !skipUpdate && this.update(true));
        },

        /**
         * Initializes/refreshes the `recentlySearched` object
         *
         * @return {undefined}
         */
        async init() {
            return this.refresh();
        },

        /**
         * Repopulates recently searched terms from persistent storage
         *
         * @return {(undefined|Promise)} Returns a promise if logged in and things were fetched, otherwise undefined
         */
        async refresh() {
            if (this.terms.size === 0 && u_type > 0) {
                return M.getPersistentData(`${u_handle}!rs`)
                    .then((recentlySearched) => {

                        this.terms = new Set(Object.values(tlvstore.decrypt(recentlySearched)));
                    })
                    .catch((ex) => {
                        if (d && ex !== ENOENT) {
                            console.error(ex);
                        }

                        // empty state already exists, no need to initialize
                        return this.save();
                    });
            }
        },

        /**
         * Updates the recently searched section view
         *
         * @param {boolean} hasDeletedOrCleared Check if updating after a delete or clear
         * @return {undefined}
         */
        update(hasDeletedOrCleared = false) {
            removeVisibilityListeners();
            renderUpdatedDropdown(null, hasDeletedOrCleared);
            addVisibilityListeners();
        }
    };

    const recentlyOpened = {

        /**
         * Recently opened files
         * @type {Map<string,object>}
         */
        files: new Map(),

        /**
         * Number of opened files to show in view
         * @type {number}
         */
        numFilesInView: 5,

        /**
         * Maximum number of opened files to keep in persistent storage
         * @type {number}
         */
        maxStored: 20,

        /**
         * Initializes/Repopulates recently opened files array
         *
         * @return {undefined}
         */
        init() {
            return this.refresh(true);
        },

        /**
         * Adds to recently opened files by file handle
         *
         * @param {string} handle The file handle
         * @param {boolean} isEditable Set to true for text files, false for other
         *
         * @return {undefined}
         */
        addFile(handle, isEditable) {

            // If we are in a public folder, or if not logged in, do not add the file
            if (is_mobile || folderlink || !u_handle) {
                return;
            }

            // In some cases, when previewing files, the dropdown still remains, hide it, but check if its defined first
            if ($dropdownSearch) {
                hideDropdown();
            }

            if (mega.config.get('showRecents') === 1) {

                const newEntry = {h: handle, e: isEditable};

                // Delete the entry first to push older entries to last position
                this.files.delete(handle);
                this.files.set(handle, newEntry);

                // Check if we have exceeded the limit of stored files, remove first entry if we did
                if (this.files.size > this.maxStored) {
                    const [first_handle] = this.files.keys();
                    this.files.delete(first_handle);
                }

                return this.save();
            }
        },

        /**
         * Repopulates recently opened files array from persistent storage
         *
         * @return {Promise} Returns a promise if logged in and things were fetched.
         */
        async refresh(onInit) {
            if (u_type > 0) {
                await M.getPersistentData(`${u_handle}!ro`)
                    .then((recentlyOpened) => {
                        this.files = new Map(JSON.parse(tlvstore.decrypt(recentlyOpened)).map((v) => [v.h, v]));
                    })
                    .catch(nop);

                // If we are in a public folder, we skip the node fetching
                if (!pfid) {
                    return Promise.resolve(onInit && mega.infinity && tSleep(9)).then(() => this.fetchNodes());
                }
            }
        },

        /**
         * Clears the list of search terms
         *
         * @return {undefined}
         */
        async clear() {
            this.files = new Map();
            return M.delPersistentData(`${u_handle}!ro`);
        },

        /**
         * Saves the recently opened files Map in persistent storage
         *
         * @return {undefined}
         */
        async save() {
            if (u_type > 0) {
                const data = tlvstore.encrypt(JSON.stringify([...recentlyOpened.files.values()]));

                return M.setPersistentData(`${u_handle}!ro`, data);
            }
        },
        /**
         * Checks if any node is missing in memory, fetches them, deletes if not available anymore
         *
         * @return {(undefined|Promise)} Returns a Promise if not a public link & things fetched. Otherwise undefined.
         */
        async fetchNodes() {
            const toFetch = [...this.files.keys()].filter(h => !M.getNodeByHandle(h));

            return dbfetch.acquire(toFetch).always(()=>{
                let anyDeleted = false;
                for (const h of this.files.keys()) {
                    if (!M.getNodeByHandle(h)
                        || M.getNodeRoot(h) === M.RubbishID
                        || typeof h === 'undefined') {

                        this.files.delete(h);
                        anyDeleted = true;
                    }
                }

                if (anyDeleted) {
                    return this.save();
                }
            });
        },
    };

    const searchResults = {
        /**
         * Last input made when suggesting search results
         * @type {string}
         */
        lastInput: '',

        /**
         * List of search results corresponding to `this.lastInput`
         * @type {Array}
         */
        lastResults: [],
    };

    const searchbarFlags = {
        hideRecents: false,
        noRecentActivity: false,
        shouldHideDropdown: false,

        update() {
            const isPublicFolder = !!folderlink;
            const hideSearchSuggestions = $fileSearch && $fileSearch.val().length < 3;
            const noRecentlySearched = isPublicFolder || recentlySearched.terms.size === 0;
            const noRecentlyOpened = isPublicFolder || recentlyOpened.files.size === 0;

            this.hideRecents = isPublicFolder || mega.config.get('showRecents') !== 1;
            this.noRecentActivity = noRecentlySearched && noRecentlyOpened;
            this.shouldHideDropdown = hideSearchSuggestions
                && (this.hideRecents || this.noRecentActivity && !showEmptyState)
                || hideSearchSuggestions && this.noRecentActivity && !showEmptyState;
        }
    };

    /**
     * Initialises the top searchbars and events attached to them
     *
     * @param {string} [currentPage] - the current page/location/URL
     * @return {undefined}
     */
    function initSearch(currentPage) {
        $topbar = $('#startholder .js-topbar, #fmholder .mega-header');
        $dropdownSearch = $('.dropdown-search', $topbar);

        refreshSearch(currentPage);

        Promise.all([recentlySearched.init(), recentlyOpened.init()]).catch(dump);

        showEmptyState = recentlySearched.terms.size !== 0;

        $('#main-search-fake-form, #mini-search-fake-form', $topbar).rebind('submit.searchsubmit', function(e) {
            e.preventDefault();

            // Close node Info panel as not applicable after searching
            mega.ui.mInfoPanel.hide();

            var val = $.trim($('.js-filesearcher', this).val());

            // if current page is search and value is empty result move to root.
            if (!val && window.page.includes('/search')) {
                $('.js-btnclearSearch', $(this)).addClass('hidden');
                loadSubPage(window.page.slice(0, window.page.indexOf('/search')));
            }
            else if (val.length >= 2 || !asciionly(val)) {
                M.fmSearchNodes(val).then(() => {
                    if (!M.search) {
                        mega.ui.mNodeFilter.resetFilterSelections();
                    }
                    delay.cancel('searchbar.renderSuggestSearchedItems');
                    if (!pfid) {
                        recentlySearched.justSearched = true;
                        if (mega.config.get('showRecents') === 1) {
                            recentlySearched.addTerm(val);
                        }
                        loadSubPage(`fm/search/${val}`);
                        hideDropdown();
                        addDropdownEventListeners();
                        $fileSearch.trigger('blur');
                        showEmptyState = true;
                    }
                    onIdle(() => {
                        // get topbars again for switching between static and fm pages
                        $topbar = $('#startholder .js-topbar, #fmholder .mega-header');
                        $dropdownSearch = $('.dropdown-search', $topbar);
                        $fileSearch = $('.js-filesearcher', $topbar);
                        $fileSearch.val(val);
                        if (!recentlySearched.justSearched) {
                            $('#main-search-fake-form .js-filesearcher', $topbar).trigger('focus');
                        }
                        $('.js-btnclearSearch', $topbar).removeClass('hidden');
                        hideDropdown();

                        // fix a redirect from a bottompage with an 'old' class on it
                        $('body').removeClass('old');
                    });
                });
            }

            return false;
        });

        $('.js-filesearcher', $topbar).rebind('keyup.searchbar', (e) => {
            if (recentlyOpened.files.size + recentlySearched.terms.size) {
                // We do not need to pass down the event as the param here
                renderUpdatedDropdown(null, false, true);
            }
            if (e.keyCode !== 13) {
                // We render the suggestions separately with a delay
                delay('searchbar.renderSuggestSearchedItems', () => renderSuggestSearchedItems(e), 1500);
            }
        });

        $('.js-btnclearSearch', $topbar).rebind('click.searchclear', (e) => {
            e.preventDefault();

            // if this is folderlink, open folderlink root;
            if (folderlink) {
                M.nn = false;
                M.openFolder();
            }

            $('.js-btnclearSearch', $topbar).addClass('hidden');
            $fileSearch.val('').trigger('blur');

            // if current page is search result reset it.
            if (window.page.includes('/search')) {
                loadSubPage(window.page.slice(0, window.page.indexOf('/search')));
            }

            removeDropdownSearch();
            return false;
        });

        // Add all the relevant input event listeners for dropdown
        addDropdownEventListeners();

        // Mini search bar
        $('.topbar-mini-search', $topbar).rebind('click.mini-searchbar', () => {
            const $miniSearch = $('.mini-search', $topbar);
            $miniSearch.addClass('highlighted active');
            setTimeout(() => $('.mini-search input', $topbar).trigger('focus'), 350);
            eventlog(500321);
        });

        $('.mini-search input', $topbar)
            .rebind('keyup.mini-searchbar', function() {
                if ($(this).val().length) {
                    $('#mini-search-fake-form', $topbar).addClass('valid');
                }
                else {
                    $('#mini-search-fake-form', $topbar).removeClass('valid');
                }
            });

        $('.mini-search .topbar-mini-search-close', $topbar).rebind('click.close-mini-searchbar', () => {
            closeMiniSearch();
        });

    }

    /**
     * Adds event listeners related to the dropdown component
     *
     * @return {undefined}
     */
    function addDropdownEventListeners() {

        addVisibilityListeners();

        $dropdownResults = $('.dropdown-results', $dropdownSearch);
        $dropdownEmptyState = $('.dropdown-no-recents', $dropdownSearch);
        $dropdownRecents = $('.dropdown-recents', $dropdownSearch);
        $fileSearch = $('.js-filesearcher', $topbar);

        // Dropdown trigger when clicking after dropdown has been hidden
        $fileSearch.rebind('click.searchbar', () => {
            renderUpdatedDropdown(null, false, true).then(()=>{
                delay('searchbar.click', eventlog.bind(null, 99898));
            });
        });

        // Show only results if there is user provides text in the input
        $fileSearch.rebind('input.searchbar', (event) => {
            renderUpdatedDropdown(event);
        });

        // Clear all - Recently searched terms
        $('.js-dropdownClearRecentlySearched', $topbar).rebind('click.rsClear', () => {
            recentlySearched.clear();
        });
    }

    /**
     * Remove dropdown visibility listeners
     *
     * @return {undefined}
     */
    function removeVisibilityListeners() {
        $('.fmholder').unbind('click.searchbar');
        $fileSearch = $fileSearch || $('.js-filesearcher', $topbar);
        $fileSearch.unbind('focus.searchbar');
    }

    /**
     * Reattach dropdown visibility listeners
     *
     * @return {undefined}
     */
    function addVisibilityListeners() {

        $fileSearch = $fileSearch || $('.js-filesearcher', $topbar);

        // Dropdown trigger on focus
        $fileSearch.rebind('focus.searchbar', () => {
            showEmptyState = !!(recentlySearched.terms.size + recentlyOpened.files.size);
            renderUpdatedDropdown(null, false, true);
        });


        // Escape key hides dropdown
        $('#bodyel').rebind('keydown.searchbar', (event) => {
            if (event.key === 'Escape') {
                hideDropdown();
            }
        });
    }

    /**
     * Shows the correct search bar and clears it.
     *
     * @param {string} [page] - the current page/location/URL
     * @return {undefined}
     */
    function refreshSearch(page) {
        if (!$topbar) {
            return initSearch(page);
        }
        page = page || window.page;

        showCorrectSearch(page);
        closeMiniSearch();

        $fileSearch = $fileSearch || $('.js-filesearcher', $topbar);

        // If we navigate back to the search page, show the search term and button
        if (page.includes('search/')) {
            $fileSearch.val(page.split('/').pop());
            $('.js-btnclearSearch', $topbar).removeClass('hidden');
        }
        else {
            $fileSearch.val('');
            $('.js-btnclearSearch', $topbar).addClass('hidden');
        }
    }

    /**
     * Shows/hides the different search bars depending on the current page
     *
     * @param {string} page - the URL path
     * @return {undefined}
     */
    function showCorrectSearch(page) {

        const $topbar = $('#startholder .js-topbar, #fmholder .js-topbar');
        const $miniSearch = $('.mini-search', $topbar);
        const $mainSearch = $('.searcher-wrapper .js-topbar-searcher', $topbar);

        // Show the correct search bar
        if ((u_type !== false || pfid) && !pfcol) {
            const rex = /\/(?:account|dashboard|user-management|refer|devices|rewind)/;
            const isSearch = page.startsWith('fm/search');

            if (M.chat || !is_fm() || (rex.test(page) && !isSearch)) {
                $miniSearch.removeClass('hidden');
                $mainSearch.addClass('hidden');
            }
            else {
                $miniSearch.addClass('hidden');
                $mainSearch.removeClass('hidden');
            }
        }
        else {
            // static (logged out), other pages
            $miniSearch.addClass('hidden');
            $mainSearch.addClass('hidden');
        }
    }

    /**
     * Hides the dropdown
     *
     * @param {boolean} resetDOMCache Set to true when its necessary to re-cache the DOM node
     *
     * @return {undefined}
     */
    function hideDropdown(resetDOMCache = false) {
        if (resetDOMCache || !$dropdownSearch) {
            $dropdownSearch = $('.dropdown-search', $topbar);
        }


        if ($dropdownSearch) {
            $dropdownRecents.addClass('hidden');
            $dropdownResults.addClass('hidden');
            $dropdownSearch.addClass('hidden');
        }
    }

    /**
     * Updates some necessary items in the DOM cache. Updating all references is not necessary.
     *
     * @return {undefined}
     */
    function updateDOMCache() {
        $dropdownSearch = $dropdownSearch || $('.dropdown-search', $topbar).addClass('hidden');
        $dropdownEmptyState = $dropdownEmptyState || $('.dropdown-no-recents', $dropdownSearch);
        $dropdownRecents = $dropdownRecents || $('.dropdown-recents', $dropdownSearch);
    }

    /**
     * Renders the recents section, hides it if necessary
     *
     * @return {undefined}
     */
    function showRecentSection() {
        if (!folderlink && recentlyOpened.files.size + recentlySearched.terms.size) {
            $dropdownEmptyState.addClass('hidden');
            $dropdownRecents.removeClass('hidden');

            // Show recently searched items
            renderRecentlySearchedItems();

            // Show recently opened files
            renderRecentlyOpenedItems();
        }
        else {
            $dropdownRecents.addClass('hidden');
        }
    }

    /**
     * Renders the dropdown
     *
     * @param {KeyboardEvent} event The event that triggers the render, only needed for the suggestions
     * @param {boolean} hasDeletedOrCleared Set to true if after a delete or clear in `recentlySearched`
     * @param {boolean} skipIfRendered Set to true if we don't want to re-render the dropdown if visbile
     * @return {undefined}
     */
    async function renderUpdatedDropdown(event, hasDeletedOrCleared = false, skipIfRendered = false) {

        const shouldSkip = skipIfRendered && !$dropdownSearch.hasClass('hidden');

        if (shouldSkip) {
            return;
        }

        if (!folderlink) {
            await Promise.all([recentlySearched.refresh(), recentlyOpened.refresh()]);
        }

        searchbarFlags.update();

        clearRecentMemoryIfRequired().catch(dump);

        // If we came from a delete/clear operation and there is no recent activity left to show,
        // Set the show empty state flag
        if (hasDeletedOrCleared && searchbarFlags.noRecentActivity) {
            showEmptyState = true;
        }

        updateDOMCache();

        // Hide dropdown if Hide Recents is on
        if (searchbarFlags.shouldHideDropdown) {
            hideDropdown();
            return;
        }

        // If recent activity is turned off, render recents
        $dropdownSearch.removeClass('hidden');

        // If there is no recent activity and the empty state flag is set,
        // show the empty state only
        if (searchbarFlags.noRecentActivity && searchbarFlags.showEmptyState) {
            if ($dropdownResults.hasClass('hidden')) {
                $dropdownEmptyState.removeClass('hidden');
            }
            $dropdownRecents.addClass('hidden');
            return;
        }

        if (searchbarFlags.shouldHideDropdown) {
            hideDropdown();
            return;
        }

        // Show recents section
        showRecentSection();

        // Show previously cached search results (if applicable)
        renderSuggestSearchedItems(event);

        const sections = $('.dropdown-section:not(.hidden)', $dropdownSearch);
        sections.removeClass('last-section');
        sections.last().addClass('last-section');
    }

    /**
    * Clears the recent memory if required based on conditions.
    *
    * If the 'searchbarFlags.hideRecents' flag is active and there's recent activity, this function clears
    * the memory of recent searches and recent opened files.
    *
     * @return {Promise}
    */
    async function clearRecentMemoryIfRequired() {
        if (folderlink) {
            return;
        }
        if (searchbarFlags.hideRecents && !searchbarFlags.noRecentActivity) {
            return Promise.all([recentlySearched.clear(), recentlyOpened.clear()]);
        }
    }

    /**
     * Populates the recently seached items section in the searchbar dropdown
     *
     * @return {undefined}
     */
    function renderRecentlySearchedItems() {

        $dropdownRecents = $dropdownRecents || $('.dropdown-recents', $dropdownSearch);

        const $dropdownRecentlySearched = $('.dropdown-recently-searched-wrapper', $dropdownRecents);

        if (recentlySearched.terms.size === 0) {
            $dropdownRecentlySearched.addClass('hidden');
            return;
        }

        const $itemTemplate = $('.dropdown-recently-searched-template', $dropdownRecents);

        $dropdownRecentlySearched.removeClass('hidden');

        const makeRecentlySearchedTermItem = (term) => {
            const $item = $itemTemplate.clone();
            $item.removeClass('dropdown-recently-searched-template hidden');
            $('.dropdown-recently-searched-item-text', $item).text(term);
            return $item.prop('outerHTML');
        };

        const $recentlySearchedBody = $('.dropdown-recently-searched > .dropdown-section-body', $dropdownRecents);

        $recentlySearchedBody.empty();

        const recentlySearchedArr = [...recentlySearched.terms];

        for (let i = recentlySearchedArr.length - 1, nb = 0;
            i >= 0 && nb < recentlySearched.numTermsInView;
            i--, nb++) {

            const item = makeRecentlySearchedTermItem(recentlySearchedArr[i]);
            $recentlySearchedBody.safeAppend(item);
        }

        $fileSearch = $fileSearch || $('.js-filesearcher', $topbar);

        // Onclick behavior for each item in recently searched terms
        // Clicking recently searched term - triggers the search again
        $('.dropdown-recently-searched-item', $dropdownRecents).rebind('click', function(event) {
            const itemText = $(this).children('div')[0].innerText;
            // If (x) is clicked, delete the item
            if ($(event.target).closest('.dropdown-recent-item-delete-icon').length !== 0) {
                recentlySearched.deleteTerm(itemText);
                return;
            }

            // Otherwise, trigger the search again
            delay('recentlySearched.click', eventlog.bind(null, 99899));
            $dropdownSearch.unbind('blur');
            $fileSearch.val(itemText);
            $('#main-search-fake-form', $topbar).trigger('submit');
            $dropdownSearch.rebind('blur', () => {
                hideDropdown();
            });
        });
    }

    /**
     * Populates the suggested searched items section in the searchbar dropdown
     *
     * @return {undefined}
     */
    function renderSuggestSearchedItems(event) {
        let term;
        let nodes = [];

        if (event && event.currentTarget) {
            term = $.trim($(event.currentTarget).val());

            if (term.length < 3 || event.key === 'Enter') {
                $dropdownResults.addClass('hidden');
                if (!$dropdownSearch.hasClass('hidden')
                    && !(recentlyOpened.files.size + recentlySearched.terms.size)
                ) {
                    removeDropdownSearch();
                }
                return;
            }
        }

        if (!$dropdownResults) {
            $dropdownResults = $('.dropdown-results', $dropdownSearch);
        }

        const $dropdownResultSearched = $('.dropdown-search-results', $dropdownResults);
        const $ddLoader = $('.search-loader', $dropdownSearch);

        // Restoring old search cache
        if (!event || !event.target) {
            term = $('input.js-filesearcher', $topbar).val();
            if (term.length < 3) {
                $dropdownResults.addClass('hidden');
                $('.js-btnclearSearch', $topbar).toggleClass('hidden', !term.length);
                return;
            }
        }

        $dropdownResultSearched.addClass('hidden');
        $ddLoader.removeClass('hidden');

        if (term === searchResults.lastInput) {
            nodes = searchResults.lastResults;
        }
        else {
            const filterFn = (fn1, fn2) => {
                return n => fn1(n) && fn2(n);
            };

            const results = M.getFilterBy(
                filterFn(M.getFilterBySearchFn(term), ({ sen }) => !sen || mega.sensitives.showGlobally)
            );

        const nodes = results.filter(n => n.p !== M.RubbishID && !mega.devices.ui.isDeprecated(n))
            .sort((a, b) => a.name.localeCompare(b.name))
            .sort((a, b) => a.name.length - b.name.length);

            searchResults.lastInput = term;
            searchResults.lastResults = nodes;
        }

        if (nodes && nodes.length) {
            $ddLoader.addClass('hidden');
            $dropdownSearch.removeClass('hidden');
            $dropdownResults.removeClass('hidden');
        }

        if (!nodes || nodes.length === 0) {
            $ddLoader.addClass('hidden');
            $dropdownResults.addClass('hidden');
            if (!(recentlyOpened.files.size + recentlySearched.terms.size)) {
                removeDropdownSearch();
            }
            return;
        }

        const $itemTemplate = $('.dropdown-search-results-item-template', $dropdownResults);

        $dropdownResultSearched.removeClass('hidden');
        $('.js-btnclearSearch', $topbar).removeClass('hidden');

        const makeSearchResultItem = (node) => {
            const $item = $itemTemplate.clone();
            const $fileIconContainer = $('.dropdown-search-results-item-file-icon', $item);
            const $fileIcon = $('.item-type-icon', $fileIconContainer);
            const $match = $('.txt-bold', $item);
            const $suffix = $('.suffix', $item);
            const $dir = $('.dropdown-search-results-item-location', $item);
            const thumbUri = thumbnails.get(node.fa);

            // Highlight search text for the result filename/s
            const fileName = node.name;
            const index = fileName.toLowerCase().indexOf(term.toLowerCase());
            const match = fileName.slice(index, index + term.length);
            const suffix = fileName.slice(index + term.length, fileName.length);
            // Set location name Cloud drive or parent name
            let dir = node.p === M.RootID ? l[18051] : M.getNodeByHandle(node.p).name;

            if (index !== 0) {
                $('.prefix', $item).text(fileName.slice(0, index));
            }
            // Set location name into Incoming shares or Rubbish bin
            if (node.su && (!node.p || !M.d[node.p])) {
                dir = l[5542];
            }
            else if (node.p === M.RubbishID) {
                dir = l[167];
            }
            else if (window.vw && node.p === M.InboxID) {
                dir = l[166];
            }

            $item.removeClass('dropdown-search-results-item-template hidden');
            $item.attr('id', node.h);
            $match.text(match);
            $suffix.text(suffix);
            $dir.text(dir);
            $fileIcon.addClass(`icon-${fileIcon(node)}-24`);

            if (mega.sensitives.isSensitive(node)) {
                $item.addClass('is-sensitive');
            }

            if (thumbUri) {
                const $imgNode = $('img', $fileIcon);
                $imgNode.attr('src', thumbUri);
                $fileIconContainer.addClass('thumb');
            }

            return $item.prop('outerHTML');
        };

        const $resultSearchBody = $('.dropdown-search-results > .dropdown-section-body', $dropdownResults);
        const maxSuggestions = 5;

        $resultSearchBody.empty();

        for (let i = 0; i < nodes.length && i < maxSuggestions; i++) {
            const item = makeSearchResultItem(nodes[i]);
            $resultSearchBody.safeAppend(item);
        }

        $('.dropdown-search-results-item', $dropdownResults).rebind('click.searchbar', (e) => {
            let h = $(e.currentTarget).attr('id');
            const n = M.getNodeByHandle(h);

            hideDropdown();
            $dropdownResultSearched.addClass('hidden');
            $resultSearchBody.empty();
            $('.js-filesearcher', $topbar).val('');

            if (n.t) {
                if (e.ctrlKey) {
                    $.ofShowNoFolders = true;
                }
                $('.top-context-menu').addClass('hidden');

                const isInboxRoot = M.getNodeRoot(n) === M.InboxID;
                if (isInboxRoot) {
                    h = mega.devices.ui.getNodeURLPathFromOuterView(n);
                }

                Promise.resolve(h)
                    .then((h) => {
                        if (window.vw && isInboxRoot && h === mega.devices.rootId && n.h !== M.BackupsId) {
                            h = n.h;
                        }
                        return M.openFolder(h);
                    })
                    .catch(tell);
            }
            else if (M.getNodeRoot(n.h) === M.RubbishID) {
                mega.ui.mInfoPanel.show($.selected);
            }
            else if (is_image2(n) || is_video(n)) {
                if (is_video(n)) {
                    $.autoplay = h;
                }
                slideshow(h);
            }
            else if (is_text(n)) {
                $.selected = [h];
                mega.fileTextEditor.openTextHandle(h);
            }
            else {
                // Non previewable file should proceed to download
                M.addDownload([h]);
            }
        });
    }

    function removeDropdownSearch() {
        $dropdownSearch = $('.dropdown-search', $topbar).addClass('hidden');
        $('.dropdown-results', $dropdownSearch).addClass('hidden');
        $('.dropdown-search-results', $dropdownResults).addClass('hidden');
        $('.dropdown-search-results > .dropdown-section-body', $dropdownResults).empty();
    }

    /* Populates the recently opened items section in the searchbar dropdown
    *
    * @return {undefined}
    */
    function renderRecentlyOpenedItems() {

        $dropdownRecents = $('.dropdown-recents', $dropdownSearch);

        const $dropdownRecentlyOpened = $('.dropdown-recently-opened-wrapper', $dropdownRecents);

        if (recentlyOpened.files.size === 0) {
            $dropdownRecentlyOpened.addClass('hidden');
            return;
        }

        const $itemTemplate = $('.dropdown-recently-opened-template', $dropdownRecents);

        $dropdownRecentlyOpened.removeClass('hidden');

        const makeRecentlyOpenedFileItem = ({h: handle, e: editable}) => {

            // TODO: FIX SHARED LOGIC + ASYNC CONVERT
            const node = M.getNodeByHandle(handle);
            const parentNode = M.getNodeByHandle(node.p);
            const parentName = parentNode.h === M.RootID
                ? l[1687]
                : parentNode.name;
            const thumbUri = thumbnails.get(node.fa);

            const filename = node.name;
            const iconClass = fileIcon(node);
            const date = new Date(node.mtime * 1000);

            const $item = $itemTemplate.clone();
            const $icon = $('.item-type-icon', $item);

            $item.removeClass('dropdown-recently-opened-template hidden');
            $item.attr('data-id', handle);
            $item.attr('data-editable', editable);

            if (mega.sensitives.isSensitive(node)) {
                $item.addClass('is-sensitive');
            }

            $icon.addClass(`icon-${iconClass}-24`);
            $('.dropdown-recently-opened-item-filename', $item).text(filename);
            $('.dropdown-recently-opened-item-location', $item).text(parentName);
            $('.dropdown-recently-opened-item-time', $item).text(time2date(date.getTime() / 1000, 1));

            if (thumbUri) {
                const $imgNode = $('img', $icon);
                $imgNode.attr('src', thumbUri);
                $('.dropdown-recently-opened-item-file-icon', $item).addClass('thumb');
            }

            return $item.prop('outerHTML');
        };

        const $recentlyOpenedBody = $('.dropdown-recently-opened > .dropdown-section-body', $dropdownRecents);

        $recentlyOpenedBody.empty();

        const recentlyOpenedArr = [...recentlyOpened.files.values()];

        for (let i = recentlyOpenedArr.length - 1, nb = 0;
            i >= 0 && nb < recentlyOpened.numFilesInView;
            i--, nb++) {
            const n = M.getNodeByHandle(recentlyOpenedArr[i].h);
            if (n && (mega.sensitives.showGlobally || !mega.sensitives.isSensitive(n))) {
                const item = makeRecentlyOpenedFileItem(recentlyOpenedArr[i]);
                $recentlyOpenedBody.safeAppend(item);
            }
        }

        $fileSearch = $fileSearch || $('.js-filesearcher', $topbar);

        // Onclick behavior for each item in recently opened files
        // Clicking recently opened file - previews the file again
        $('.dropdown-recently-opened-item', $dropdownRecents).rebind('click.recentlyOpenedItem', function() {

            // Preview the file
            delay('recentlyOpened.click', eventlog.bind(null, 99905));
            hideDropdown();
            const {id, editable} = $(this).data();

            recentlyOpened.addFile(id, editable);

            M.viewMediaFile(id);
        });
    }

    /**
     * Closes the mini search back to a button, and clears the contents
     *
     * @return {undefined}
     */
    function closeMiniSearch() {
        const $miniSearch = $('.mini-search', $topbar);
        if ($miniSearch && ($miniSearch.hasClass('active') ||
            $miniSearch.hasClass('highlighted'))) {

            $miniSearch.removeClass('active highlighted');
            setTimeout(() => {
                $('.mini-search input', $topbar).value = '';
                $('form', $miniSearch).removeClass('valid');
            }, 350);
        }
    }

    /** @class mega.ui.searchbar */
    return freeze({
        init: initSearch,
        refresh: refreshSearch,
        closeMiniSearch,
        recentlySearched,
        recentlyOpened,
        addDropdownEventListeners,
    });
});

mBroadcaster.once('fm:initialized', () => {
    'use strict';
    mega.ui.searchbar.init();
});
