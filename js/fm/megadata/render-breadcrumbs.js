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
        $block.empty();

        const extraItems = prepareBreadcrumbItems(items, dictionary, block);

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
     * @param {Object} wrapperNode Custom breadcrumbs DOM node
     * @return {undefined}
     */
    MegaData.prototype.renderPathBreadcrumbs = function(fileHandle, wrapperNode) {
        const scope = wrapperNode
            || document.querySelector('.fm-right-files-block .fm-right-header .fm-breadcrumbs-wrapper');

        if (typeof scope !== 'object') {
            console.assert(false, 'invalid scope');
            return;
        }

        let items = this.getPath(fileHandle || this.currentdirid);

        if (M.onDeviceCenter) {
            items = mega.devices.ui.getFolderChildrenPath(items);
        }

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
                },
                'out-shares': () => {
                    typeClass = 'out-shares';
                },
                'public-links': () => {
                    typeClass = 'pub-links';
                },
                'file-requests': () => {
                    typeClass = 'file-requests';
                },
                [this.RubbishID]: () => {
                    typeClass = 'rubbish-bin';
                    name = l[167];
                },
                messages: () => {
                    typeClass = 'messages';
                    name = l[166];
                },
                [mega.devices.rootId]: () => {
                    typeClass = mega.devices.rootId;
                    name = l.device_centre;
                },
            };

            if (window.vw) {
                cases[this.InboxID] = () => {
                    typeClass = 'inbox';
                    name = l[166];
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
                else {
                    const {name: deviceName} = this.dcd[handle] || {};
                    if (deviceName) {
                        name = deviceName;
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

        // if in custom component we do not want to open the file versioning dialog
        if (M.search) {
            const node = M.d[items[0]];
            const isBackup = node && M.getNodeRoot(node.h) === M.InboxID;
            if (isBackup) {
                items = mega.devices.ui.getNodePathFromOuterView(node.h);
            }
        }

        Promise.resolve(items)
            .then((items) => {
                this.renderBreadcrumbs(items, scope, dictionary, id => {
                    if (hasRewind) {
                        return;
                    }
                    breadcrumbClickHandler.call(this, id);
                });
                // if in custom component we do not want to open the file versioning dialog
                if (!is_mobile && fileHandle && !wrapperNode) {
                    fileversioning.fileVersioningDialog(fileHandle);
                }
            })
            .catch(tell);

    };

    /**
     * Render the breadcrumbs at the bottom of the search page.
     *
     * @return {undefined}
     */
    MegaData.prototype.renderSearchBreadcrumbs = function() {
        const scope = document.querySelector('.fm-right-files-block .search-bottom-wrapper');

        if (!scope) {
            return;
        }

        // Show Breadcrumbs bar instead of Selection bar only when 1 item is selected
        if (M.search
            && self.selectionManager
            && selectionManager.selected_list.length === 1
        ) {

            scope.classList.remove('hidden');
            this.renderPathBreadcrumbs(selectionManager.selected_list[0], scope);
        }
        else {
            scope.classList.add('hidden');
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
            contents +=
                `<a class="crumb-drop-link" data-id="${escapeHTML(item.id)}">
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
                this.classList.toggle('active');

                dropdown.classList.toggle('active');

                if (dropdown.classList.contains('active')) {
                    if (dropdown.classList.contains('ps')) {
                        Ps.update(dropdown);
                    }
                    else {
                        Ps.initialize(dropdown);
                    }
                }
                return false;
            });

        $('.crumb-drop-link, .fm-breadcrumbs', scope).rebind('click.breadcrumb', function(e) {
            dropdown.classList.remove('active');
            let id = $(e.currentTarget).data('id');
            const link = scope.querySelector('a');
            if (link) {
                link.classList.remove('active');
            }

            if (id) {
                clickAction(id);
            }
        });

        $('.fm-breadcrumbs', scope).rebind('contextmenu.breadcrumb', () => {
            return false;
        }).droppable({
            tolerance: 'pointer',
            drop: (e, ui) => {
                $.doDD(e, ui, 'drop', 2);
            },
            over: (e, ui) => {
                $.doDD(e, ui, 'over', 2);
            },
            out: (e, ui) => {
                $.doDD(e, ui, 'out', 2);
            }
        });
    }

    function updateBreadcrumbNode(sizingNode, typeClass, name, isRoot, isDyhRoot, isLastItem) {
        sizingNode.className = `fm-breadcrumbs ${typeClass} ${isRoot || isDyhRoot ? 'root' : ''} ui-droppable`;
        sizingNode.textContent = '';
        const span = document.createElement('span');
        span.className = 'right-arrow-bg simpletip simpletip-tc';
        sizingNode.appendChild(span);
        if (isRoot) {
            const innerSpan = document.createElement('span');
            innerSpan.className = 'not-loading selectable-txt';
            innerSpan.textContent = name;
            span.appendChild(innerSpan);
            const icon = document.createElement('i');
            icon.className = 'loading sprite-fm-theme icon-loading-spinner';
            span.appendChild(icon);
        }
        else {
            span.textContent = name;
        }
        if (!isLastItem) {
            const iconNode = document.createElement('i');
            iconNode.className = `next-arrow ${mega.ui.sprites.mono} icon-chevron-right-thin-outline icon16`;
            sizingNode.appendChild(iconNode);
        }
    }

    /**
     * Returns the HTML for a full set of breadcrumbs.
     *
     * @param {Array} items - the items in the path
     * @param {function} dictionary - a function which will convert the item id into a full breadcrumb datum
     * @param {HTMLElement} container - the HTMLElement that contains the breadcrumbs
     * @return {object} - the HTML for the breadcrumbs and the list of parent folders not in the breadcrumbs
     */
    function prepareBreadcrumbItems(items, dictionary, container) {
        let containerWidth = container.clientWidth;
        let totalWidth = 0;
        let remainItems = 4;
        const sizingNode = document.createElement('a');
        container.appendChild(sizingNode);

        let extraItems = [];
        let isSimpletip = false;
        let isDyhRoot = false;
        let lastPos = 0;

        if (container.parentNode.parentNode.classList.contains('simpletip-tooltip')) {
            isSimpletip = true;
            containerWidth = Infinity;
        }
        else if (container.classList.contains('location')) {
            items.shift(); // Show location of item without item itself
        }
        else if (container.classList.contains('info')) {
            remainItems = 2;
            containerWidth = Infinity;
        }
        if (is_mobile) {
            // Mobile doesn't support extraItems well so force all crumbs into the container.
            remainItems = Infinity;
            containerWidth = Infinity;
        }

        if (M.dyh && M.dyh('is-breadcrumb-root', items)) {
            isDyhRoot = true;
            containerWidth = Infinity;
        }

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
                updateBreadcrumbNode(sizingNode, typeClass, name, isRoot, isDyhRoot, isLastItem);

                const nodeWidth = sizingNode.clientWidth;
                const prepareRealNode = (node) => {
                    node = node.cloneNode(true);
                    node.dataset.id = id;
                    node.id = `pathbc-${items[i]}`;
                    return node;
                };
                if (!remainItems || totalWidth + nodeWidth > containerWidth) {
                    if (totalWidth) {
                        extraItems.push({
                            name,
                            type: typeClass,
                            id,
                        });
                    }
                    else {
                        sizingNode.classList.add('overflow-breadcrumb');
                        container.prepend(prepareRealNode(sizingNode));
                        sizingNode.classList.remove('overflow-breadcrumb');
                    }
                    totalWidth = containerWidth;
                    remainItems = 0;
                }
                else {
                    totalWidth += nodeWidth;
                    container.prepend(prepareRealNode(sizingNode));
                    remainItems--;
                }
            }
            // if items in front have empty name, treat next item as last item.
            else if (lastPos === i) {
                lastPos++;
            }
        }
        sizingNode.remove();

        return extraItems;
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
            'file-requests',
            mega.devices.rootId
        ];
        mBroadcaster.sendMessage('trk:event', 'breadcrumb', 'click', id);

        // super special case (contact)
        if (M.u.hasOwnProperty(id)) {
            loadSubPage("chat/contacts/" + id);
        }
        else if (n) {
            id = n.h;
            let toSelect;
            let isInboxRoot = false;

            if (!n.t) {
                toSelect = id;
                id = n.p;
            }

            if (
                M.currentCustomView
                && M.currentCustomView.type !== 'albums'
                && !(M.currentCustomView.prefixPath === 'discovery/' && id === M.RootID)
            ) {
                id = M.onDeviceCenter
                    ? mega.devices.ui.getCurrentDirPath(id)
                    : M.currentCustomView.prefixPath + id;
            }
            else if (M.getNodeRoot(id) === M.InboxID) {
                isInboxRoot = true;
                id = mega.devices.ui.getNodeURLPathFromOuterView(n, !n.t);
            }

            Promise.resolve(id)
                .then((id) => {
                    if (window.vw && isInboxRoot && id === mega.devices.rootId) {
                        id = n.h;
                    }
                    return this.openFolder(id);
                })
                .always(() => {
                    if (toSelect) {
                        $.selected = [toSelect];
                        reselect(1);
                    }
                })
                .catch(tell);
        }
        else if (M.dcd[id]) {
            this.openFolder(`device-centre/${id}`);
        }
        else if (specialCases.includes(id)) {
            this.openFolder(id);
        }
        else if (M.dyh) {
            M.dyh('breadcrumb-click', id);
        }
    }
})();
