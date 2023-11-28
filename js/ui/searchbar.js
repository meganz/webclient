/* Functions which initialise and control the search bars at the top of every page
 */
(function(scope) {
    'use strict';

    let $topbar;
    let $dropdownSearch;
    let $dropdownEmptyState;
    let $dropdownRecents;
    let $dropdownResults;
    let $fileSearch;

    let showEmptyState;

    const recentlySearched = {
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
         * @return {undefined}
         */
        save: async function() {
            if (u_handle) {
                await M.setPersistentData(`${u_handle}!rs`, tlvstore.encrypt([...this.terms]));
            }
        },

        /**
         * Adds a search term to the list of search terms
         *
         * @param {string} term The search term
         * @return {undefined}
         */
        addTerm: function(term) {
            // Delete the term if it exists
            this.terms.delete(term);
            // Append the term (to make recent terms appear first)
            this.terms.add(term);
            if (this.terms.size > this.maxStored) {
                const [firstTerm] = this.terms;
                this.terms.delete(firstTerm);
            }
            this.save();
            this.update();
        },

        /**
         * Delete a search term from the list of search terms
         *
         * @param {string} term The search term
         * @return {undefined}
         */
        deleteTerm: function(term) {
            this.terms.delete(term);
            this.save();
            this.update(true);
        },

        /**
         * Clears the list of search terms
         *
         * @param {boolean} skipUpdate Is the view refreshed after clear
         * @return {undefined}
         */
        clear: async function(skipUpdate = false) {
            this.terms.clear();
            await M.delPersistentData(`${u_handle}!rs`);
            if (!skipUpdate) {
                this.update(true);
            }
        },

        /**
         * Initializes/refreshes the `recentlySearched` object
         *
         * @return {undefined}
         */
        init: async function() {
            return this.refresh();
        },

        /**
         * Repopulates recently searched terms from persistent storage
         *
         * @return {(undefined|Promise)} Returns a promise if logged in and things were fetched, otherwise undefined
         */
        refresh: async function() {
            if (this.terms.size === 0 && u_handle) {
                return M.getPersistentData(`${u_handle}!rs`).then(recentlySearched => {
                    this.terms = new Set(Object.values(tlvstore.decrypt(recentlySearched)));
                }).catch(() => {
                    // empty state already exists, no need to initialize
                    this.save();
                });
            }
        },

        /**
         * Updates the recently searched section view
         *
         * @param {boolean} hasDeletedOrCleared Check if updating after a delete or clear
         * @return {undefined}
         */
        update: function(hasDeletedOrCleared = false) {
            removeVisibilityListeners();
            renderUpdatedDropdown(hasDeletedOrCleared);
            delay('searchbar.addVisibilityListeners', () => addVisibilityListeners(), 1000);
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
        init: function() {
            this.refresh();
        },

        /**
         * Adds to recently opened files by file handle
         *
         * @param {string} handle The file handle
         * @param {boolean} isEditable Set to true for text files, false for other
         *
         * @return {undefined}
         */
        addFile: function(handle, isEditable) {

            // If we are in a public folder, or if not logged in, do not add the file
            if (is_mobile || folderlink || !u_handle) {
                return;
            }

            // In some cases, when previewing files, the dropdown still remains, hide it, but check if its defined first
            if ($dropdownSearch) {
                $dropdownSearch.addClass('hidden');
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

                this.save();
            }
        },

        /**
         * Repopulates recently opened files array from persistent storage
         *
         * @return {(undefined|Promise)} Returns a promise if logged in and things were fetched, otherwise undefined
         */
        refresh: async function() {
            if (!u_handle) {
                return;
            }
            await M.getPersistentData(`${u_handle}!ro`).then(async(recentlyOpened) => {
                this.files = new Map(JSON.parse(tlvstore.decrypt(recentlyOpened))
                    .map((v) => {
                        return [v.h, v];
                    }));
            }).catch(nop);
            return this.fetchNodes();
        },

        /**
         * Clears the list of search terms
         *
         * @return {undefined}
         */
        clear: async function() {
            this.files = new Map();
            await M.delPersistentData(`${u_handle}!ro`);
        },

        /**
         * Saves the recently opened files Map in persistent storage
         *
         * @return {undefined}
         */
        save: function() {
            if (!u_handle) {
                return;
            }
            M.setPersistentData(`${u_handle}!ro`,
                                tlvstore.encrypt(
                                    JSON.stringify(
                                        [...recentlyOpened.files.values()]
                                    )
                                )
            );
        },
        /**
         * Checks if any node is missing in memory, fetches them, deletes if not available anymore
         *
         * @return {(undefined|Promise)} Returns a Promise if not a public link & things fetched. Otherwise undefined.
         */
        fetchNodes: async function() {

            // If we are in a public folder, we skip the node fetching
            if (folderlink) {
                return;
            }

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
                    this.save();
                }
            });
        },
    };

    /**
     * Initialises the top searchbars and events attached to them
     *
     * @param {string} [currentPage] - the current page/location/URL
     * @return {undefined}
     */
    function initSearch(currentPage) {
        $topbar = $('#startholder .js-topbar, #fmholder .js-topbar');
        $dropdownSearch = $('.dropdown-search', $topbar);

        refreshSearch(currentPage);

        recentlySearched.init();
        recentlyOpened.init();

        showEmptyState = recentlySearched.terms.size !== 0;

        $('#main-search-fake-form, #mini-search-fake-form', $topbar).rebind('submit.searchsubmit', function(e) {
            e.preventDefault();
            var val = $.trim($('.js-filesearcher', this).val());

            // if current page is search and value is empty result move to root.
            if (!val && window.page.includes('/search')) {
                $('.js-btnclearSearch', $(this)).addClass('hidden');
                loadSubPage(window.page.slice(0, window.page.indexOf('/search')));
            }
            else if (val.length >= 2 || !asciionly(val)) {
                M.fmSearchNodes(val).then(function() {
                    if (!pfid) {
                        if (mega.config.get('showRecents') === 1) {
                            recentlySearched.addTerm(val);
                        }
                        loadSubPage(`fm/search/${val}`);
                        $dropdownSearch.addClass('hidden');
                        addDropdownEventListeners();
                        showEmptyState = true;
                    }
                    onIdle(() => {
                        // get topbars again for switching between static and fm pages
                        $topbar = $('#startholder .js-topbar, #fmholder .js-topbar');
                        $dropdownSearch = $('.dropdown-search', $topbar);
                        $fileSearch = $('.js-filesearcher', $topbar);
                        $fileSearch.val(val);
                        $('#main-search-fake-form .js-filesearcher', $topbar).trigger('focus');
                        $('.js-btnclearSearch', $topbar).removeClass('hidden');
                        $dropdownSearch.addClass('hidden');

                        if (pfid && mega.gallery) {
                            mega.gallery.clearMdView();
                        }

                        // fix a redirect from a bottompage with an 'old' class on it
                        $('body').removeClass('old');
                    });
                });
            }

            return false;
        });

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
            $fileSearch.rebind('click', () => {
                renderUpdatedDropdown().then(()=>{
                    delay('searchbar.click', eventlog.bind(null, 99898));
                    $dropdownResults.addClass('hidden');
                });
            });

            // Show only results if there is user provides text in the input
            $fileSearch.rebind('input', ({target}) => {
                if (target.value.length > 0) {

                    $dropdownSearch.removeClass('hidden');

                    // Hide recents
                    $('.dropdown-recents.dropdown-section').addClass('hidden');
                    $dropdownEmptyState.addClass('hidden');

                    // TODO: remove this line if including search results
                    $dropdownSearch.addClass('hidden');

                    // Show search results
                    // $dropdownResultsSection.removeClass('hidden');
                }
                else {
                    // Hide search results if input is blank
                    $dropdownResults.addClass('hidden');

                    renderUpdatedDropdown();
                }
            });

            // Clear all - Recently searched terms
            $('.js-dropdownClearRecentlySearched').rebind('click', () => {
                recentlySearched.clear();
            });
        }

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

            return false;
        });

        // Add all the relevant input event listeners for dropdown
        addDropdownEventListeners();

        // Mini search bar
        $('.topbar-mini-search', $topbar).rebind('click.mini-searchbar', function() {
            const $miniSearch = $('.mini-search', $topbar);
            $miniSearch.addClass('highlighted active');
            setTimeout(() => $('.mini-search input', $topbar).trigger('focus'), 350);
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

        $('.mini-search .topbar-mini-search-close', $topbar).rebind('click.close-mini-searchbar', function() {
            closeMiniSearch();
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
        $fileSearch.unbind('focus');
    }

    /**
     * Reattach dropdown visibility listeners
     *
     * @return {undefined}
     */
    function addVisibilityListeners() {

        $fileSearch = $fileSearch || $('.js-filesearcher', $topbar);

        // Dropdown trigger on focus
        $fileSearch.rebind('focus', () => {
            showEmptyState = recentlySearched.terms.size !== 0
                && recentlyOpened.files.size !== 0;
            renderUpdatedDropdown();
        });

        // Dropdown trigger on defocus
        $('.fmholder').rebind('click.searchbar', (event) => {
            const $target = $(event.target);
            if ($target.closest('.dropdown-search').length === 0
                && $target.closest('.js-topbar-searcher').length === 0) {
                $dropdownSearch.addClass('hidden');
            }
        });

        // Escape key hides dropdown
        $('#bodyel').rebind('keydown.searchbar', (event) => {
            if (event.key === 'Escape') {
                $dropdownSearch.addClass('hidden');
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
        const $miniSearch = $('.mini-search', $topbar);
        const $mainSearch = $('.searcher-wrapper .js-topbar-searcher', $topbar);
        const $dropdownSearch = $('dropdown-search', $topbar);

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
                $dropdownSearch.addClass('hidden');
            }
        }
        else {
            // static (logged out), other pages
            $miniSearch.addClass('hidden');
            $mainSearch.addClass('hidden');
        }
    }

    /**
     * Renders the dropdown
     *
     * @param {boolean} hasDeletedOrCleared Set to true if after a delete or clear in `recentlySearched`
     * @return {undefined}
     */
    async function renderUpdatedDropdown(hasDeletedOrCleared = false) {

        if (folderlink) {
            return;
        }

        await recentlySearched.refresh();
        await recentlyOpened.refresh();


        const hideRecents = mega.config.get('showRecents') !== 1;
        const noRecentlySearched = recentlySearched.terms.size === 0;
        const noRecentlyOpened = recentlyOpened.files.size === 0;
        const noRecentActivity = noRecentlySearched && noRecentlyOpened;

        clearRecentMemoryIfRequired(hideRecents, noRecentActivity);

        // If we came from a delete/clear operation and there is no recent activity left to show,
        // Set the show empty state flag
        if (hasDeletedOrCleared && noRecentActivity) {
            showEmptyState = true;
        }

        $dropdownEmptyState = $dropdownEmptyState || $('.dropdown-no-recents', $dropdownSearch);
        $dropdownRecents = $dropdownRecents || $('.dropdown-recents', $dropdownSearch);

        // Hide dropdown if Hide Recents is on
        if (hideRecents || noRecentActivity && !showEmptyState) {
            $dropdownSearch.addClass('hidden');
            return;
        }

        // If recent activity is turned off, render recents
        $dropdownSearch.removeClass('hidden');

        // If there is no recent activity and the empty state flag is set,
        // show the empty state only
        if (noRecentActivity && showEmptyState) {
            $dropdownEmptyState.removeClass('hidden');
            $dropdownRecents.addClass('hidden');
            return;
        }

        if (noRecentActivity && !showEmptyState) {
            $dropdownSearch.addClass('hidden');
            return;
        }

        // Show recents section
        $dropdownEmptyState.addClass('hidden');
        $dropdownRecents.removeClass('hidden');

        // Show recently searched items
        renderRecentlySearchedItems();

        // Show recently opened files
        renderRecentlyOpenedItems();
    }

    /**
    * Clears the recent memory if required based on conditions.
    *
    * If the 'hideRecents' flag is active and there's recent activity, this function clears
    * the memory of recent searches and recent opened files.
    *
    * @param {boolean} hideRecents - Flag indicating if recent items should be hidden. Fetch this before passing.
    * @param {boolean} noRecentActivity - Flag indicating if there's no recent activity.
    * @return {void}
    */
    function clearRecentMemoryIfRequired(hideRecents, noRecentActivity) {
        if (hideRecents && !noRecentActivity) {
            recentlySearched.clear(false);
            recentlyOpened.clear();
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

        const $itemTemplate = $('.dropdown-recently-searched-template', $dropdownRecents);

        if (recentlySearched.terms.size === 0) {
            $dropdownRecentlySearched.addClass('hidden');
            return;
        }

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
                $dropdownSearch.addClass('hidden');
            });
        });
    }

    /**
     * Populates the recently opened items section in the searchbar dropdown
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
            const $icon = $('.transfer-filetype-icon', $item);

            $item.removeClass('dropdown-recently-opened-template hidden');
            $item.attr('data-id', handle);
            $item.attr('data-editable', editable);

            $icon.addClass(iconClass);
            $('.dropdown-recently-opened-item-filename', $item).text(filename);
            $('.dropdown-recently-opened-item-location', $item).text(parentName);
            $('.dropdown-recently-opened-item-time', $item).text(date.toLocaleDateString());

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
            if (M.getNodeByHandle(recentlyOpenedArr[i].h)) {
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
            $dropdownSearch.addClass('hidden');
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

    mBroadcaster.once('fm:initialized', () => {
        later(initSearch);
    });

    // export
    scope.mega = scope.mega || {};
    scope.mega.ui = scope.mega.ui || {};
    scope.mega.ui.searchbar = {
        init: initSearch,
        refresh: refreshSearch,
        closeMiniSearch,
        recentlySearched,
        recentlyOpened
    };
})(window);
