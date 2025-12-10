/**
 * @file Functions which initialise and control the search bars at the top of every page
 * @property mega.ui.searchbar
 */
lazy(mega.ui, 'searchbar', () => {
    'use strict';

    const minTermLen = 2;

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

    const searchResults = {
        /**
         * Last input made when suggesting search results
         * @type {string}
         */
        lastInput: '',

        /**
         * List of filtered search results corresponding to `this.lastInput`
         * @type {Array}
         */
        lastResults: []
    };

    const searchbarFlags = {
        hideRecents: false,
        noRecentActivity: false,
        shouldHideDropdown: false,

        update() {
            const isPublicFolder = !!folderlink;
            const hideSearchSuggestions = $fileSearch && $fileSearch.val().length < minTermLen;
            const noRecentlySearched = isPublicFolder || recentlySearched.terms.size === 0;

            this.hideRecents = isPublicFolder || mega.config.get('showRecents') !== 1;
            this.noRecentActivity = noRecentlySearched;
            this.shouldHideDropdown = hideSearchSuggestions
                && (this.hideRecents || this.noRecentActivity && !showEmptyState)
                || hideSearchSuggestions && this.noRecentActivity && !showEmptyState;
        }
    };

    /**
     * Building a function to filter nodes by a given location
     * @param {String|Number} [location] Location to work with
     * @returns {Function|false}
     */
    const locationFn = (location) => {

        if (!location) {
            if (!folderlink) {
                return false;
            }
            location = M.RootID;
        }

        if (location === 'photos') {
            return mega.gallery.allowedInMedia;
        }

        if (M.getNodeByHandle(location)) {
            const parents = array.to.object(M.getTreeHandles(location), true);

            if (folderlink) {
                return n => !!parents[n.p];
            }

            if (location === M.RootID) {
                // No need to search within buckets, when root folder search is selected
                const s4Containers = Object.keys(M.c[M.RootID] || {}).filter(h => M.d[h] && M.d[h].s4);

                if (s4Containers.length) {
                    for (let i = s4Containers.length; i--;) {
                        delete parents[s4Containers[i].h];
                    }
                }
            }

            return n => !!parents[n.p] && !n.s4 && M.getNodeRoot(n) !== 's4';
        }

        return false;
    };

    /**
     * Callback function to handle the rendering of a search item thumbnail.
     *
     * @param {Object} d - The mega node.
     * @param {HTMLElement} resultBodyContainer - The container element where the search results are displayed.
     * @param {string} fileIconSelector - The CSS selector for the file icon element within the search result item.
     * @returns {undefined}
     *
     * This function:
     * - Locates the search result item in the DOM using its `data-id` attribute.
     * - Retrieves the thumbnail URI for the file using thumbnails map node's fa property.
     * - Updates the file icon element with the thumbnail image if available.
     * - Adds appropriate classes to style the file icon and container.
     */
    function searchItemThumbnailCb(d, resultBodyContainer, fileIconSelector) {
        const $item = $(`[data-id="${d.h}"]`, resultBodyContainer);
        const thumbUri = thumbnails.get(d.fa);
        if (thumbUri) {
            const $fileIconContainer = $(fileIconSelector, $item);
            const $fileIcon = $('.item-type-icon', $fileIconContainer);
            const $imgNode = $('img', $fileIcon);
            $imgNode.attr('src', thumbUri);
            $fileIcon.addClass('no-background');
            $fileIconContainer.addClass('thumb');
        }
    }

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

        recentlySearched.init().catch(dump);

        showEmptyState = recentlySearched.terms.size !== 0;

        $('#main-search-fake-form', $topbar).rebind('submit.searchsubmit', function(e) {
            e.preventDefault();

            if (pfid && M.onMediaView) {
                M.viewmode = 1;
            }

            // Close node Info panel as not applicable after searching
            mega.ui.mInfoPanel.hide();

            var val = $.trim($('.js-filesearcher', this).val());

            // if current page is search and value is empty result move to root.
            if (!val && window.page.includes('/search')) {
                $('.js-btnclearSearch', $(this)).addClass('hidden');
                loadSubPage(window.page.slice(0, window.page.indexOf('/search')));
            }
            else if (val.length >= minTermLen || !asciionly(val)) {
                const chipBtn = $('button.search-chip', this);
                const location = locationFn(chipBtn.length && chipBtn.attr('data-location'));

                M.fmSearchNodes(val, location)
                    .then(() => {
                        delay.cancel('searchbar.renderSuggestSearchedItems');
                        if (!pfid) {
                            recentlySearched.justSearched = true;
                            if (mega.config.get('showRecents') === 1) {
                                recentlySearched.addTerm(val);
                            }

                            const searchPage = `search/${val}`;

                            if (M.currentdirid === searchPage) {
                                M.v = M.getFilterBy(M.getFilterBySearchFn(val, location));
                                M.renderMain();
                                $('.fm-search-count', '.fm-right-header')
                                    .text(mega.icu.format(l.search_results_count, M.v.length));
                            }
                            else {
                                loadSubPage(`fm/${searchPage}`);
                            }

                            mega.ui.mNodeFilter.resetFilterSelections();

                            hideDropdown();
                            addDropdownEventListeners();
                            $fileSearch.trigger('blur');
                            showEmptyState = true;

                            if (!M.v.length) {
                                mega.ui.secondaryNav.filterChipsHolder.classList.add('hidden');
                            }
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
            if (e.key === 'Escape') {
                $fileSearch.blur();
                return;
            }

            if (recentlySearched.terms.size) {
                // We do not need to pass down the event as the param here
                renderUpdatedDropdown(null, false, true);
            }

            if (e.key.length === 1 || e.key === 'Backspace') {
                // We render the suggestions separately with a delay
                delay('searchbar.renderSuggestSearchedItems', () => renderSuggestSearchedItems(e), 1500);
            }
        });

        $('.js-btnclearSearch', $topbar).rebind('click.searchclear', (e) => {
            e.preventDefault();

            $('.js-btnclearSearch', $topbar).addClass('hidden');
            $fileSearch.val('').focus();
            renderUpdatedDropdown(null, true);

        });

        // Add all the relevant input event listeners for dropdown
        addDropdownEventListeners();
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
            showEmptyState = recentlySearched.terms.size > 0;
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
     * @param {boolean} [force] - whether to force full refresh or not
     * @return {undefined}
     */
    function refreshSearch(page, force = false) {
        if (!$topbar || force) {
            return initSearch(page);
        }

        page = page || window.page;

        showCorrectSearch(page);

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
        const $mainSearch = $('.searcher-wrapper .js-topbar-searcher', $topbar);

        // Show the correct search bar
        if ((u_type !== false || pfid) && !pfcol) {
            const rex = /\/(?:account|dashboard|user-management|refer|devices|rewind)/;
            const isSearch = page.startsWith('fm/search');

            if (M.chat || !is_fm() || (rex.test(page) && !isSearch)) {
                $mainSearch.addClass('hidden');
            }
            else {
                $mainSearch.removeClass('hidden');
            }
        }
        else {
            // static (logged out), other pages
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
        if (!folderlink && recentlySearched.terms.size) {
            $dropdownEmptyState.addClass('hidden');
            $dropdownRecents.removeClass('hidden');

            // Show recently searched items
            renderRecentlySearchedItems();
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
            await recentlySearched.refresh();
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
    * the memory of recent searches files.
    *
     * @return {Promise}
    */
    async function clearRecentMemoryIfRequired() {
        if (folderlink) {
            return;
        }
        if (searchbarFlags.hideRecents && !searchbarFlags.noRecentActivity) {
            return recentlySearched.clear();
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
            $dropdownSearch.unbind('blur.searchDropdown');
            $fileSearch.val(itemText);
            $('#main-search-fake-form', $topbar).trigger('submit');
            $dropdownSearch.rebind('blur.searchDropdown', hideDropdown);
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

            if (term.length < minTermLen || event.key === 'Enter') {
                $dropdownResults.addClass('hidden');

                if (!$dropdownSearch.hasClass('hidden') && !recentlySearched.terms.size) {
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
            if (term.length < minTermLen) {
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
            const chipBtn = $('button.search-chip', $topbar);

            const results = M.getFilterBy(
                M.getFilterBySearchFn(term, locationFn(chipBtn.length && chipBtn.attr('data-location')))
            );

            const nodes = results.filter(n => n.p !== M.RubbishID)
                .sort(({ name: nameA }, { name: nameB }) => nameA.localeCompare(nameB) || nameA.length - nameB.length);

            searchResults.lastInput = term;
            searchResults.lastResults = nodes;
        }

        $ddLoader.addClass('hidden');

        if (nodes && nodes.length) {
            $ddLoader.addClass('hidden');
            $dropdownSearch.removeClass('hidden');
            $dropdownResults.removeClass('hidden');
            $dropdownRecents.addClass('hidden');
        }
        else {
            $dropdownSearch.addClass('hidden');
            if (recentlySearched.terms.size) {
                return;
            }

            removeDropdownSearch();
        }

        const $itemTemplate = $('.dropdown-search-results-item-template', $dropdownResults);

        $dropdownResultSearched.removeClass('hidden');
        $('.js-btnclearSearch', $topbar).removeClass('hidden');

        const makeSearchResultItem = (node) => {
            const $item = $itemTemplate.clone();
            const $fileIconContainer = $('.dropdown-search-results-item-file-icon', $item);
            const $fileIcon = $('.item-type-icon', $fileIconContainer);
            const $fileName = $('.dropdown-search-results-item-filename', $item);
            const $fileNamePrefix = $('.prefix', $fileName);
            const $fileNameMatch = $('.middle-txt', $fileName);
            const $fileNameSuffix = $('.suffix', $fileName);
            const $dir = $('.dropdown-search-results-item-location', $item);
            const thumbUri = thumbnails.get(node.fa);
            const maxLen = 30;

            // Trim and lowercase the search term
            const searchTermLowercase = term.trim().toLowerCase();

            // Highlight search text for the result filename/s
            const fileName = node.name;
            const { prefix, match, suffix } = findMatchWithSearchTerm(fileName, searchTermLowercase);

            // Set filename (with bold text for the matched search term part)
            $fileNamePrefix.text(match ? prefix.substring(prefix.length - maxLen) : prefix);
            $fileNameMatch.text(match);
            $fileNameSuffix.text(suffix.length > maxLen ? `${suffix.substring(0, maxLen)}...` : suffix);

            // Set location name Cloud drive or parent name
            let dir = node.p === M.RootID ? l[18051] : M.getNodeByHandle(node.p).name;

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
            $item.attr('data-id', node.h);

            // Add location as a blue link to link to the parent dir
            const $locLink = $('<span>');
            $locLink.addClass('location-link text-ellipsis');
            $locLink.attr('data-parent-handle', node.p);
            $locLink.text(dir);
            $dir.safeAppend($locLink.prop('outerHTML'));

            if (mega.sensitives.isSensitive(node)) {
                $item.addClass('is-sensitive');
            }

            if (thumbUri) {
                const $imgNode = $('img', $fileIcon);
                $imgNode.attr('src', thumbUri);
                $fileIcon.addClass('no-background');
                $fileIconContainer.addClass('thumb');
            }
            else {
                MegaNodeComponent.label.set(node, $fileIcon.addClass(`icon-${fileIcon(node)}-24`));
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

        fm_thumbnails(
            'standalone',
            nodes,
            d => searchItemThumbnailCb(
                d,
                $resultSearchBody,
                '.dropdown-search-results-item-file-icon'
            )
        );

        $('.dropdown-search-results-item', $dropdownResults).rebind('click.searchbar', (e) => {
            let h = $(e.currentTarget).attr('data-id');
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

        // Load the parent directory location when clicked in the search Results
        $('.location-link', $dropdownResults).rebind('click.location', (ev) => {

            const parentHandle = $(ev.currentTarget).attr('data-parent-handle');

            hideDropdown();

            // Open the parent folder
            M.openFolder(parentHandle, true);

            // Prevent event bubble to dropdown-search-results-item click handler
            return false;
        });
    }

    function removeDropdownSearch() {
        $dropdownSearch = $('.dropdown-search', $topbar).addClass('hidden');
        $('.dropdown-results', $dropdownSearch).addClass('hidden');
        $('.dropdown-search-results', $dropdownResults).addClass('hidden');
        $('.dropdown-search-results > .dropdown-section-body', $dropdownResults).empty();
    }

    /**
     * Finds and returns the matched part of a filename/description/tagname etc with the provided search term.
     * @param {String} name The filename, description, tagname etc
     * @param {String} searchTerm The search text searched by the user (to see if there is a match in the name)
     * @returns {Object} Returns an object with keys: prefix, match (matched text which can be highlighted) and suffix
     */
    function findMatchWithSearchTerm(name, searchTerm) {

        // Trim and lowercase so the search matches batter
        const nameLowercase = name.toLowerCase();
        const searchTermLowercase = searchTerm.trim().toLowerCase();
        const searchTermLength = searchTermLowercase.length;

        let namePrefix = name;
        let nameMatch = '';
        let nameSuffix = '';

        // Get the parts of the name split up so the match part can be highlighted with CSS
        const nameIndex = nameLowercase.indexOf(searchTermLowercase);

        // If match found, get the parts
        if (nameIndex > -1) {
            namePrefix = (nameIndex === 0) ? '' : name.slice(0, nameIndex);
            nameMatch = name.slice(nameIndex, nameIndex + searchTermLength);
            nameSuffix = name.slice(nameIndex + searchTermLength);
        }

        return {
            prefix: namePrefix,
            match: nameMatch,
            suffix: nameSuffix
        };
    }

    /** @class mega.ui.searchbar */
    return freeze({
        init: initSearch,
        refresh: refreshSearch,
        locationFn,
        recentlySearched,
        addDropdownEventListeners,
        findMatchWithSearchTerm,
        clearLastSearches: () => {
            searchResults.lastInput = '';
            searchResults.lastResults = [];
        },
        reinitiateSearchTerm: () => {
            if (
                !$fileSearch
                || !$fileSearch.length
                || $fileSearch.val()
                || !searchResults.lastInput
            ) {
                return;
            }

            $fileSearch.val(searchResults.lastInput);
            $('.js-btnclearSearch.hidden', $topbar).removeClass('hidden');
        }
    });
});

mBroadcaster.once('fm:initialized', () => {
    'use strict';
    mega.ui.searchbar.init();
});
