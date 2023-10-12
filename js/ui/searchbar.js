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
        // Stores the recently searched terms
        terms: new Set(),
        // Only show 5 terms in the dropdown at a time
        numTermsInView: 5,
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
            M.getPersistentData(`${u_handle}!rs`).then((recentlySearched => {
                this.terms = new Set(Object.values(tlvstore.decrypt(recentlySearched)));
            })).catch(() => {
                // empty state already exists, no need to initialize
                this.save();
            });
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
                renderUpdatedDropdown();
                delay('searchbar.click', eventlog.bind(null, 99898));
                $dropdownResults.addClass('hidden');
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
            showEmptyState = recentlySearched.terms.size !== 0;
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
        if (u_type !== false || pfid) {
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
    function renderUpdatedDropdown(hasDeletedOrCleared = false) {

        // If we have terms in memory, and the hide recents flag is on, the memory is cleared
        if (mega.config.get('showRecents') !== 1 && recentlySearched.terms.size > 0) {
            recentlySearched.clear(false);
        }

        if (hasDeletedOrCleared && recentlySearched.terms.size === 0) {
            showEmptyState = true;
        }

        $dropdownEmptyState = $dropdownEmptyState || $('.dropdown-no-recents', $dropdownSearch);
        $dropdownRecents = $dropdownRecents || $('.dropdown-recents', $dropdownSearch);

        // Hide dropdown if Hide Recents is on
        if (mega.config.get('showRecents') !== 1
            || (recentlySearched.terms.size === 0 && !showEmptyState)) {
            $dropdownSearch.addClass('hidden');
            return;
        }

        // If recent activity is turned off, render recents
        $dropdownSearch.removeClass('hidden');

        // If recently searched terms AND recently opened files list is empty,
        // Show empty state
        if (recentlySearched.terms.size === 0) {
            $dropdownEmptyState.removeClass('hidden');
            $dropdownRecents.addClass('hidden');
        }
        else {
            // Show recents
            $dropdownEmptyState.addClass('hidden');
            $dropdownRecents.removeClass('hidden');

            // Show recently searched only
            renderRecentlySearchedItems();

            // TODO: Show recently opened only
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
            // $('.dropdown-recently-searched-item-text', $item).text(term.replace("<", "&lt;").replace(">", "&gt;"));
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
            delay('searchbar.click', eventlog.bind(null, 99899));
            $dropdownSearch.unbind('blur');
            $fileSearch.val(itemText);
            $('#main-search-fake-form', $topbar).trigger('submit');
            $dropdownSearch.rebind('blur', () => {
                $dropdownSearch.addClass('hidden');
            });
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
        closeMiniSearch
    };
})(window);
