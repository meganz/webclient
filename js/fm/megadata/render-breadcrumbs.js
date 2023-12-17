(function() {
    'use strict';

    /**
     * A helper function which can be used to render breadcrumbs anywhere in the application.
     * Relies on having the same HTML structure as the main cloud drive breadcrumbs.
     *
     * @param {Array} items - a list of breadcrumbs
     * @param {HTMLElement} scope - the wrapper/parent element of the breadcrumbs, used for scoping selectors
     * @param {function} dictionary - a function which will convert a folder id into a breadcumb datun
     * @param {function} clickAction - the function that will be called on clicking a breadcrumb
     * @return {undefined}
     */
    MegaData.prototype.renderBreadcrumbs = function(items, scope, dictionary, clickAction) {
        if (!(scope && scope.parentNode)) {
            return;
        }

        const block = scope.querySelector('.fm-breadcrumbs-block');
        const $block = $(block);
        const dropdown = scope.querySelector('.breadcrumb-dropdown');

        let { html, extraItems } = getPathHTML(items, dictionary, block);

        if (html && html !== '') {
            $block.safeHTML(html);
        }

        removeSimpleTip($('.fm-breadcrumbs', $block));
        showHideBreadcrumbDropdown(extraItems, scope, dropdown);
        if (!scope.parentNode.classList.contains('simpletip-tooltip')) {
            applyBreadcrumbEventHandlers(scope, dropdown, clickAction);
        }
    };

    /**
     * Render the breadcrumbs at the top of the cloud drive, shares, public links and rubbish bin pages.
     *
     * @param {string} fileHandle - the id of the selected file or folder
     * @return {undefined}
     */
    MegaData.prototype.renderPathBreadcrumbs = function(fileHandle, isInfoBlock = false, isSimpletip = false) {
        let scope;

        if (isInfoBlock) {
            scope = document.querySelector('.properties-breadcrumb .fm-breadcrumbs-wrapper');
        }
        else if (isSimpletip) {
            scope = document.querySelector('.simpletip-tooltip .fm-breadcrumbs-wrapper');
        }
        else {
            scope = document.querySelector('.fm-right-files-block .fm-right-header .fm-breadcrumbs-wrapper');
        }
        let items = this.getPath(fileHandle || this.currentdirid);
        const hasRewind = scope.classList.contains('rewind');

        const dictionary = handle => {
            let name = '';
            let typeClass = '';

            const cases = {
                [this.RootID]: () => {
                    if (folderlink && this.d[this.RootID]) {
                        name = this.d[this.RootID].name;
                        typeClass = 'folder';
                    }
                    else {
                        typeClass = 'cloud-drive';
                        name = l[164];
                    }
                },
                contacts: () => {
                    typeClass = 'contacts';
                    name = l[165];
                },
                opc: () => {
                    typeClass = 'sent-requests';
                    name = l[5862];
                },
                ipc: () => {
                    typeClass = 'received-requests';
                    name = l[5863];
                },
                shares: () => {
                    typeClass = 'shared-with-me';
                    name = l[5542];
                },
                'out-shares': () => {
                    typeClass = 'out-shares';
                    name = l[5543];
                },
                'public-links': () => {
                    typeClass = 'pub-links';
                    name = l[16516];
                },
                'file-requests': () => {
                    typeClass = 'file-requests';
                    name = l.file_request_title;
                },
                [this.RubbishID]: () => {
                    typeClass = 'rubbish-bin';
                    name = l[167];
                },
                messages: () => {
                    typeClass = 'messages';
                    name = l[166];
                }
            };

            if (this.BackupsId) {
                cases[this.BackupsId] = () => {
                    typeClass = 'backups';
                    name = l.restricted_folder_button;
                };
            }

            if (cases[handle]) {
                cases[handle]();
            }
            else {
                const n = this.d[handle];
                if (n) {
                    if (n.name) {
                        name = n.name;
                    }
                    if (n.t) {
                        typeClass = 'folder';
                    }
                }
                if (handle.length === 11) {
                    typeClass = 'contact selectable-txt';

                    // Contact should not appears on other than chat/contact pages
                    if (M.currentrootid !== 'chat') {
                        name = '';
                    }
                }
                else if (folderlink) {
                    typeClass = 'folder-link';
                }
                else {
                    typeClass = 'folder';
                }

                if (M.isDynPage(handle)) {
                    const {type, localeName} = this.dynContentLoader[handle].options;
                    if (type) {
                        typeClass = type;
                    }
                    if (localeName) {
                        name = localeName;
                    }
                }
                else if (M.dyh) {
                    const {type, localeName} = M.dyh('breadcrumb-properties', handle);
                    if (type) {
                        typeClass = type;
                    }
                    if (localeName) {
                        name = localeName;
                    }
                }
            }

            return {
                name,
                typeClass,
                id: handle
            };
        };

        this.renderBreadcrumbs(items, scope, dictionary, id => {
            if (hasRewind) {
                return;
            }

            breadcrumbClickHandler.call(this, id);
        });

        // if on info dialog we do not want to open the file versioning dialog
        if (!is_mobile && fileHandle && !isInfoBlock && !isSimpletip) {
            fileversioning.fileVersioningDialog(fileHandle);
        }
    };

    /**
     * Render the breadcrumbs at the bottom of the search page.
     * TODO: unify this with MegaData.renderPathBreadcrumbs
     *
     * @return {undefined}
     */
    MegaData.prototype.renderSearchBreadcrumbs = function() {
        const block = document.querySelector('.fm-main .fm-right-files-block:not(.in-chat)');

        if (this.currentdirid && this.currentdirid.substr(0, 7) === 'search/') {
            if (block) {
                block.classList.remove('search-multi');
            }
            if (selectionManager && selectionManager.selected_list.length > 0) {
                block.classList.add('search');

                const scope = block.querySelector('.search-bottom-wrapper');
                scope.classList.remove('hidden');
                const items = this.getPath(selectionManager.selected_list[0]);

                const dictionary = handle => {
                    let id = '';
                    let typeClass = '';
                    let name = '';

                    if (handle.length === 11 && this.u[handle]) {
                        id = handle;
                        typeClass = 'contacts-item';
                        name = this.u[handle].m;
                    }
                    else if (handle === this.RootID && !folderlink) {
                        id = this.RootID;
                        typeClass = 'cloud-drive';
                        name = l[164];
                    }
                    else if (handle === this.RubbishID) {
                        id = this.RubbishID;
                        typeClass = 'recycle-item';
                        name = l[168];
                    }
                    else if (this.BackupsId && handle === this.BackupsId) {
                        id = this.BackupsId;
                        typeClass = 'backups';
                        name = l.restricted_folder_button;
                    }
                    else {
                        const n = this.d[handle];
                        if (n) {
                            id = n.h;
                            name = n.name || '';
                            typeClass = n.t && 'folder' || '';

                            if (n.s4 && n.p === this.RootID) {
                                name = l.obj_storage;
                                typeClass = 's4-object-storage';
                            }
                            else if (this.d[n.p] && this.d[n.p].s4 && this.d[n.p].p === this.RootID) {
                                typeClass = 's4-buckets';
                            }
                        }
                    }

                    return {
                        id,
                        typeClass,
                        name
                    };
                };

                if (selectionManager.selected_list.length === 1) {
                    this.renderBreadcrumbs(items, scope, dictionary, id => {
                        breadcrumbClickHandler.call(this, id);
                    });
                }
                else {
                    scope.classList.add('hidden');
                    block.classList.add('search-multi');
                }

                return;
            }
        }

        if (block) {
            block.classList.remove('search');
        }
    };

    /* Private methods */

    /** Gets the HTML to populate a dropdown of breadcrumbs
     * @param {Array} items - an array of breadcrumb items
     * @return {string} - the HTML to represent the items
     */
    function getBreadcrumbDropdownHTML(items) {
        let contents = '';

        for (let item of items) {

            let icon = '';

            if (item.type === 's4-object-storage') {
                icon = 'icon-object-storage';
            }
            else if (item.type === 's4-buckets') {
                icon = 'icon-bucket-filled';
            }
            else if (item.type === 's4-policies') {
                icon = 'icon-policy-filled';
            }
            else if (item.type === 's4-users') {
                icon = 'icon-user-filled';
            }
            else if (item.type === 's4-groups') {
                icon = 'icon-contacts';
            }
            else if (item.type === 'cloud-drive') {
                icon = 'icon-cloud';
            }
            else if (item.type === 'backups') {
                icon = 'icon-database-filled';
            }
            else if (item.type === 'folder' || item.type === 'folder-link') {
                icon = 'icon-folder-filled';
            }

            contents +=
                `<a class="crumb-drop-link" data-id="${escapeHTML(item.id)}">
                    ${icon === '' ? '' : `<i class="sprite-fm-mono ${icon} icon24"></i>`}
                    <span>${escapeHTML(item.name)}</span>
                </a>`;
        }

        return contents;
    }

    /**
     * Show or hide the breadcrumb dropdown, depending on whether there are items to show in it
     *
     * @param {Array} extraItems - the items to be shown in the dropdown
     * @param {HTMLElement} scope - the wrapper element for the breadcrumbs
     * @param {HTMLElement} dropdown - the dropdown for breadcrumbs which are not shown
     * @return {undefined}
     */
    function showHideBreadcrumbDropdown(extraItems, scope, dropdown) {
        // if we're not displaying the full path, show the dropdown button
        if (extraItems.length) {
            scope.querySelector('.crumb-overflow-link').classList.remove('hidden');
            $(dropdown).safeHTML(getBreadcrumbDropdownHTML(extraItems));
        }
        // otherwise, hide the dropdown button
        else {
            scope.querySelector('.crumb-overflow-link').classList.add('hidden');
        }
    }

    /**
     * Apply events to the main breadcrumbs and any in the overflow dropdown.
     *
     * @param {HTMLElement} scope - the wrapper element for the breadcrumbs
     * @param {HTMLElement} dropdown - the dropdown for breadcrumbs which are not shown
     * @param {function} clickAction - what to do when a breadcrumb is clicked
     * @return {undefined}
     */
    function applyBreadcrumbEventHandlers(scope, dropdown, clickAction) {
        $('.breadcrumb-dropdown-link', scope)
            .rebind('click.breadcrumb-dropdown', function(e) {
                if ($(this).hasClass('info-dlg')) {
                    e.stopPropagation();
                }

                dropdown.classList.toggle('active');

                if (dropdown.classList.contains('active')) {
                    if (dropdown.classList.contains('ps')) {
                        Ps.update(dropdown);
                    }
                    else {
                        Ps.initialize(dropdown);
                    }
                }
            });

        $('.crumb-drop-link, .fm-breadcrumbs', scope).rebind('click.breadcrumb', function(e) {
            dropdown.classList.remove('active');
            let id = $(e.currentTarget).data('id');

            if (id) {
                clickAction(id);
            }
        });

        $('.fm-breadcrumbs', scope).rebind('contextmenu.breadcrumb', () => {
            return false;
        });
    }

    /**
     * Returns the HTML for a full set of breadcrumbs.
     *
     * @param {Array} items - the items in the path
     * @param {function} dictionary - a function which will convert the item id into a full breadcrumb datum
     * @param {HTMLElement} container - the HTMLElement that contains the breadcrumbs
     * @return {object} - the HTML for the breadcrumbs and the list of parent folders not in the breadcrumbs
     */
    function getPathHTML(items, dictionary, container) {
        let html = '';
        let currentPathLength = items.length === 3 ? 12 : 0;
        const maxPathLength = getMaxPathLength(14, container);
        let extraItems = [];
        let isInfoBlock = false;
        let isSimpletip = false;
        let lastPos = 0;

        if (container.parentNode.parentNode.classList.contains('simpletip-tooltip')) {
            isSimpletip = true;
        }
        else if (container.classList.contains('info')) {
            isInfoBlock = true;
        }

        const isDyhRoot = M.dyh ? M.dyh('is-breadcrumb-root', items) : false;

        for (let i = 0; i < items.length; i++) {

            if (isSimpletip && i === lastPos) {
                continue;
            }

            let {name, typeClass, id} = dictionary(items[i]);

            // Some items are not shown, so if we don't have a name, don't show this breadcrumb
            // Don't include the contact name (can be removed later if you want it back)
            if (name !== '') {

                const isLastItem = isSimpletip ? i === lastPos + 1 : i === lastPos;
                const isRoot = i === items.length - 1;
                let item;
                // if we won't have space, add it to the dropdown, but always render the current folder,
                // and root if there are no extraItems
                // for info block we show max 2 items in the in-view breadcrumb
                if (!isDyhRoot && !isLastItem && !isSimpletip &&
                    (currentPathLength > maxPathLength && !isInfoBlock) || (isInfoBlock && i > 1)) {
                    extraItems.push({
                        name,
                        type: typeClass,
                        id
                    });
                }
                // otherwise, add it to the main breadcrumb
                else {
                    name = escapeHTML(name);
                    item = escapeHTML(items[i]);
                    html =
                        `<a class="fm-breadcrumbs ${escapeHTML(typeClass)} ${
                            isRoot || isDyhRoot ? 'root' : ''} ui-droppable"
                            data-id="${item}" id="pathbc-${item}">
                            <span
                                class="right-arrow-bg simpletip simpletip-tc">
                                ${isRoot ? `<span class="not-loading selectable-txt">
                                        ${name}
                                    </span>
                                    <i class="loading sprite-fm-theme icon-loading-spinner"></i>` : name}
                            </span>
                            ${isLastItem ? '' : '<i class="next-arrow sprite-fm-mono icon-arrow-right icon16"></i>'}
                        </a>` + html;

                    // add on some space for the arrow
                    if (isLastItem) {
                        currentPathLength += 6;
                    }
                }
                currentPathLength += name.length;
            }
            // if items in front have empty name, treat next item as last item.
            else if (lastPos === i) {
                lastPos++;
            }
        }

        return { html, extraItems };
    }

    function removeSimpleTip($breadCrumbs) {
        let $currentBreadcrumb;
        for (let i = 0; i < $breadCrumbs.length; i++) {
            $currentBreadcrumb = $($breadCrumbs[i]);
            if ($('span', $currentBreadcrumb).get(0).offsetWidth >= $('span', $currentBreadcrumb).get(0).scrollWidth
                || $currentBreadcrumb.parents('.simpletip-tooltip').length > 0) {
                $('.right-arrow-bg', $currentBreadcrumb).removeClass('simpletip');
            }
        }
    }

    /**
     * Get the (approximate) maximum number of cahracters that can be shown in the breadcrumb container
     *
     * @param {number} fontSize - the font size used for the breadcrumbs
     * @param {HTMLElement} container - the breadcrumbs' container
     * @return {number} - the maximum number of characters
     */
    function getMaxPathLength(fontSize, container) {
        // ~= font size / 2 - fudge factor for approximate average character width
        const maxCharacterWidth = fontSize / 1.5;

        // Assume the largest character is ~square (W/M/etc.), and calc the max number of characters we can show
        return container.offsetWidth / maxCharacterWidth;
    }

    /**
     * Handles clicks on the cloud drive and search breadcrumbs.
     * Note: Must be called with context for `this` to work.
     *
     * @param {string} id - the folder ID, or special ID of the destination
     * @return {undefined}
     */
    function breadcrumbClickHandler(id) {
        const n = this.d[id];
        const specialCases = [
            'shares',
            'out-shares',
            'public-links',
            'file-requests'
        ];

        // super special case (contact)
        if (M.u.hasOwnProperty(id)) {
            loadSubPage("chat/contacts/" + id);
        }
        else if (n) {
            id = n.h;
            let toSelect;

            if (!n.t) {
                toSelect = id;
                id = n.p;
            }

            if (
                M.currentCustomView
                && M.currentCustomView.type !== 'albums'
                && !(M.currentCustomView.prefixPath === 'discovery/' && id === M.RootID)
            ) {
                id = M.currentCustomView.prefixPath + id;
            }

            this.openFolder(id)
                .always(() => {
                    if (toSelect) {
                        $.selected = [toSelect];
                        reselect(1);
                    }
                });
        }
        else if (specialCases.includes(id)) {
            this.openFolder(id);
        }
        else if (M.dyh) {
            M.dyh('breadcrumb-click', id);
        }
    }
})();
