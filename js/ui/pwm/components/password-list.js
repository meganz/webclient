class MegaPasswordList extends MegaView {
    constructor(options) {
        super(options);

        this.vaultPasswords = [];
        this.orderDir = '1';
        this.addClass('password-list-page', 'password-wrapper');

        this.initPasswordList();

        const verticalDivider = document.createElement('div');
        verticalDivider.className = 'vertical-divider';

        this.passwordItem = new MegaPasswordItemDetail();
        this.domNode.append(verticalDivider, this.passwordItem.domNode);

        this.initEmptyState();

        // Initialising banner for extension installation
        const installBanner = new MegaBanner({
            parentNode: this.domNode,
            icon: 'sprite-pm-mono icon-star-spark',
            text: l.try_pass_ext,
            componentClassname: 'mega-pass-install-banner hidden',
            prepend: true,
            actionButtonText: l.try_pass_ext_download,
            actionButtonType: 'link'
        });

        installBanner.actionButton.on('click', () => {
            window.open(mega.ui.header.getPwmExtensionUrl(), '_blank', 'noopener,noreferrer');
        });

        let showBanner = true;

        // Give bit of time to check if the extension is installed
        setTimeout(() => {
            if (showBanner && !localStorage.closedPWMExtensionBanner) {
                installBanner.show();
                this.addClass('showing-banner');
            }
        }, 1000);

        const messageHandler = (event) => {
            if (event.data.type === 'mega_pass_extension_installed') {
                installBanner.destroy();
                window.removeEventListener('message', messageHandler);
                showBanner = false;
                this.removeClass('showing-banner');
            }
        };

        installBanner.on('close', () => {
            const event = new MessageEvent('message', {
                data: { type: 'mega_pass_extension_installed' }
            });
            messageHandler(event);
            localStorage.closedPWMExtensionBanner = true;
        });

        window.addEventListener('message', messageHandler);

        window.postMessage({type: 'check_mega_pass_extension_installed'}, '*');
    }

    show(){
        super.show();

        // Required for the webclient layout
        return this.initLayout(true).catch(reportError);
    }

    /**
     * Initialize the password list.
     *
     * @returns {void}
     */
    initPasswordList() {
        this.searchResultsDiv = document.createElement('div');
        this.searchResultsDiv.className = 'search-results hidden';
        this.searchResultsDiv.textContent = l.search_results;

        this.passwordPanel = document.createElement('div');
        this.passwordPanel.className = 'password-list-panel';

        // Added to handle adjustable column
        this.passwordDrag = document.createElement('div');
        this.passwordDrag.className = 'left-pane-drag-handle ui-resizable-handle ui-resizable-e';
        this.passwordPanel.append(this.passwordDrag);

        this.passwordList = document.createElement('div');
        this.passwordList.className = 'password-list';
        this.passwordPanel.append(this.passwordList);

        this.domNode.append(this.passwordPanel);

        const {sortdata} = mega.ui.pm.comm.getSortData();

        const _getSortedKey = () => {
            if (sortdata && sortdata[0]) {
                if (sortdata[1] === -1) {
                    return `${sortdata[0]}_r`;
                }

                return sortdata[0];
            }

            return 'name';
        };

        const dropdownItems = {
            'name': l.title_a_z,
            'name_r': l.title_z_a,
            'date_r': l.title_date_newest,
            'date': l.title_date_oldest
        };

        this.dropdown = new MegaDropdown({
            parentNode: this.passwordPanel,
            type: 'fullwidth',
            rightIcon: 'icon sprite-pm-mono icon-chevron-down-thin-outline',
            text: l.sort_by_title,
            prepend: true,
            listContainerClass: 'sort-password-list',
            componentClassname: 'name-sort',
            dropdownItems,
            dropdownOptions: {},
            selected: _getSortedKey(),
            scrollTo: false,
            name: 'pwd-list-sorting',
            onSelected: ({currentTarget}) => {
                const sortdata = currentTarget.selected.split('_');
                sortdata[1] = sortdata[1] === 'r' ? -1 : 1;

                mega.ui.pm.comm.setSortData(sortdata);
                this.orderList();
                this.searchList(this.searchTerm);

                if (currentTarget.selected === 'name') {
                    eventlog(500536);
                }
                else if (currentTarget.selected === 'name_r') {
                    eventlog(500537);
                }
                else if (currentTarget.selected === 'date') {
                    eventlog(500538);
                }
                else if (currentTarget.selected === 'date_r') {
                    eventlog(500539);
                }

                return false;
            }
        });

        this.passwordPanel.prepend(this.searchResultsDiv);

        mega.ui.topnav.update();
    }

    /**
     * Initialize the empty state.
     *
     * @returns {void}
     */
    initEmptyState() {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';

        this.emptyStateTitle = document.createElement('h1');
        this.emptyStateCopy = document.createElement('p');
        this.emptyStateImage = document.createElement('div');

        emptyState.append(this.emptyStateImage, this.emptyStateTitle, this.emptyStateCopy);

        this.emptyStateAction = new MegaButton({
            parentNode: emptyState,
            text: l[1364],
            componentClassname: 'primary'
        });
        this.emptyStateAction.on('click', () => {
            this.removeClass('is-empty');
            this.loadList().catch(tell);
        });

        this.domNode.append(emptyState);
    }

    /**
     * Initialize the skeleton loading.
     *
     * @returns {void}
     */
    initSkeletonLoading() {

        const skeletonElm = [];

        for (let i = 0; i < 5; i++) {
            skeletonElm.push(new MegaInteractable({
                parentNode: this.passwordList,
                componentClassname: 'password-item',
                type: 'fullwidth',
                text: 'a',
                subtext: 'b',
                icon: 'sk-elm',
                skLoading: true
            }));
        }

        return skeletonElm;
    }

    /**
     * Load the password list.
     *
     * @returns {Promise<*>}
     */
    async loadList(customEntry = null) {
        this.vaultPasswords = [];
        const result = await mega.ui.pm.comm.loadVault().catch(echo);

        if (customEntry) {
            const nodeData = {
                h: customEntry.h,
                name: customEntry.name,
                pwm: {
                    u: customEntry.u,
                    pwd: customEntry.pwd,
                    totp: customEntry.totp
                }
            };
            result.push(new MegaNode(nodeData));
        }

        if (Array.isArray(result)) {
            this.vaultPasswords = result;

            if (!this.count) {
                return;
            }

            mega.ui.topnav.enableSearch();

            this.orderList();
            this.searchList(this.searchTerm);
        }
        else {
            console.error('MegaPasswordList.loadList()', result);

            this.addClass('is-empty');
            this.emptyStateTitle.textContent = l.unable_to_load_items;
            this.emptyStateCopy.textContent = '';
            this.emptyStateCopy.append(parseHTML(l.error_fetching_items));
            this.emptyStateImage.className = 'error';
            this.emptyStateAction.show();
            mega.ui.topnav.disableSearch();
            this.searchTerm = '';
        }
    }

    /**
     * Populate the password list with values from the vault.
     *
     * @returns {void}
     */
    drawList(filteredList) {
        const previousSelectedItem = this.selectedItem;
        let initial = null;
        this.selectedItem = null;
        const curDate = new Date();
        const sevenDaysAgoTime = curDate.setDate(curDate.getDate() - 7) / 1000;
        const groupedItems = [];
        const passwordNodes = filteredList || this.vaultPasswords;

        this.passwordList.textContent = '';

        if (passwordNodes.length === 0) {
            this.addClass('is-empty-search-results');
            this.emptyStateImage.className = 'empty-state empty-search-results';
            this.emptyStateTitle.textContent = l.no_search_results;
            this.emptyStateCopy.textContent = l.search_again;
            this.emptyStateAction.hide();

            return;
        }

        this.removeClass('is-empty-search-results');

        for (const passwordNode of passwordNodes) {
            const pwmItem = passwordNode.pwm;
            const passwordName = passwordNode.name || pwmItem.url;
            let passwordInitial = passwordName.toUpperCase().trim().slice(0, 1);

            if (this.order[0] === 'name') {
                const nonLangRegex = new RegExp(/[^\p{L}]/u);

                if (nonLangRegex.test(passwordInitial)) {
                    passwordInitial = '#';
                }

                if (initial !== passwordInitial) {
                    const header = new MegaComponent({
                        parentNode: this.passwordList,
                        componentClassname: 'list-header'
                    });
                    header.domNode.textContent = initial = passwordInitial;
                }
            }
            else if (this.order[0] === 'date') {
                let key = l[1301];
                const date = passwordNode.ts;
                const todayRange = calculateCalendar('d');

                if (todayRange.start <= date && date <= todayRange.end) {
                    key = l[1301];
                }
                else if (date >= sevenDaysAgoTime) {
                    key = l[1304];
                }
                else {
                    key = time2date(date, 3);
                }

                if (!groupedItems.includes(key)) {
                    const header = new MegaComponent({
                        parentNode: this.passwordList,
                        componentClassname: 'list-header'
                    });

                    header.domNode.textContent = key;
                    groupedItems.push(key);
                }
            }

            const item = new MegaInteractable({
                parentNode: this.passwordList,
                componentClassname: 'password-item',
                text: passwordName,
                subtext: pwmItem.u,
                type: 'fullwidth'
            });

            item.domNode.id = passwordNode.h;

            const outer = document.createElement('div');
            outer.className = 'favicon';
            const span = document.createElement('span');
            outer.append(span);

            item.domNode.prepend(outer);
            if (pwmItem.t === 'c') {
                mega.ui.pm.utils.generateCardFavicon(pwmItem.nu, outer);
            }
            else {
                mega.ui.pm.utils.generateFavicon(passwordName, pwmItem.url, outer);
            }

            item.on('click.selectItem', ({currentTarget}, noShowDetail) => {
                const elemId = currentTarget.domNode.id;
                if (this.selectedItem) {
                    if (this.selectedItem.domNode.id === elemId
                        && this.passwordItem.domNode.classList.contains('active')) {
                        return true;
                    }
                    this.selectedItem.active = false;
                }
                // @todo FIXME prevent concurrent invocations while the promise is running
                return this.passwordItem.showDetail(elemId, noShowDetail)
                    .catch(tell)
                    .finally(() => {
                        this.selectedItem = item;
                        item.active = true;
                        mega.ui.pm.comm.saveLastSelected(elemId);
                    });
            });

            const contextMenuBtn = new MegaInteractable({
                componentClassname: 'context-menu-btn',
                parentNode: item.domNode,
                type: 'icon',
                icon: 'sprite-pm-mono icon-more-horizontal-regular-outline'
            });

            const _ = event => {
                item.trigger('click', window.innerWidth < 1080);
                mega.ui.pm.menu.hide();
                mega.ui.pm.contextMenu.show({
                    name: 'item-list-menu',
                    handle: passwordNode.h,
                    event,
                    eventTarget: contextMenuBtn,
                    container: mega.ui.topmenu.domNode
                });

                return false;
            };
            contextMenuBtn.on('click', function(e) {
                if (this.active) {
                    mega.ui.pm.menu.hide();
                }
                else {
                    this.active = true;
                    _(e);
                    mega.ui.pm.menu.one('hide.contextbtn', () => {
                        this.active = false;
                    });
                }

                return false;
            });
            item.on('contextmenu', _);
        }

        this.setSelectedPasswordItem(previousSelectedItem);

        onIdle(() => {
            if (this.selectedItem) {
                this.selectedItem.domNode.scrollIntoView(false);
            }
            if (this.passwordList.Ps) {
                this.passwordList.Ps.update();
            }
            else {
                this.passwordList.Ps = new PerfectScrollbar(this.passwordList);
            }
        });
    }

    /**
     * Order the password list.
     *
     * returns {void}
     */
    orderList() {
        const {sortdata} = mega.ui.pm.comm.getSortData();
        this.order = sortdata;

        mega.ui.pm.sort.doSort();

        const sortComp = this.domNode.componentSelector('.name-sort');
        sortComp.domNode.querySelector('.primary-text').textContent =
            this.order[0] === 'name' ? l.sort_by_title : l[17023];
    }

    /**
     * Get the number of passwords in the list.
     *
     * @returns {Number} Number of passwords in the list.
     */
    get count() {
        if (this.vaultPasswords.length) {
            this.removeClass('is-empty');
        }
        else if (!this.hasClass('is-empty')) {
            this.addClass('is-empty');
            this.emptyStateImage.className = 'empty-state';
            this.emptyStateTitle.textContent = l.empty_list_title;
            this.emptyStateCopy.textContent = l.empty_list_copy;
            this.emptyStateAction.hide();
            mega.ui.topnav.disableSearch();
            this.searchTerm = '';
        }

        return this.vaultPasswords.length;
    }

    /**
     * Highlight the selected password item.
     *
     * @returns {void}
     */
    setSelectedPasswordItem(previousSelectedItem) {
        const item = mega.ui.pm.comm.getLastSelected();

        if (item) {
            this.selectedItem = document.componentSelector(`[id="${item}"]`);
        }

        if (!this.selectedItem) {
            this.passwordItem.domNode.classList.remove('active');
            this.selectedItem = document.componentSelector('.password-list .password-item');
            mega.ui.pm.comm.saveLastSelected(this.selectedItem.domNode.id);
        }

        if (this.selectedItem) {
            this.selectedItem.active = true;

            onIdle(() => {
                let promise;
                this.selectedItem.domNode.scrollIntoView(false);

                if (previousSelectedItem !== this.selectedItem.domNode.id) {
                    promise = this.passwordItem.showDetail(this.selectedItem.domNode.id, true);
                }
                Promise.resolve(promise)
                    .catch(tell)
                    .finally(() => {
                        if (this.passwordList.Ps) {
                            this.passwordList.Ps.update();
                        }
                        else {
                            this.passwordList.Ps = new PerfectScrollbar(this.passwordList);
                        }
                    });
            });
        }
    }

    searchList(searchTerm = '') {
        this.searchTerm = searchTerm.toLowerCase();
        let searchResults = false;

        if (this.searchTerm) {
            searchResults = this.vaultPasswords.filter(item => {
                return item.name.toLowerCase().includes(this.searchTerm)
                    || item.pwm.u && item.pwm.u.toLowerCase().includes(this.searchTerm)
                    || item.pwm.url && mega.ui.pm.utils.fullDomainFromURL(item.pwm.url).includes(this.searchTerm);
            });
            this.searchResultsDiv.classList.remove('hidden');
        }
        else {
            this.searchResultsDiv.classList.add('hidden');
        }

        this.drawList(searchResults);
    }

    async initLayout(initLoad = false) {
        // Necessary to call renderLayout before skeletonLoading and loadList to avoid weird transition
        if (!this.boundResizeLayout) {
            this.renderLayout();
            this.boundResizeLayout = this.renderLayout.bind(this);
            this.addResizeListener();
        }
        if (initLoad) {
            this.initSkeletonLoading();
        }
        return this.loadList();
    }

    renderLayout() {
        const menu = 287;
        const separator = 1;
        const gap = 24;

        const availableWidth = window.innerWidth - menu - separator;
        const minWidth = 384;
        const maxWidth = availableWidth - minWidth - gap;

        this.passwordPanel.style.width = `${(availableWidth - gap * 3) / 2 + gap}px`;

        if (maxWidth > minWidth) {
            if (this.leftPaneResizablePWM) {
                this.leftPaneResizablePWM.setOption('minWidth', minWidth);
                this.leftPaneResizablePWM.setOption('maxWidth', maxWidth);
            }
            else {
                this.leftPaneResizablePWM = new FMResizablePane(this.passwordPanel, {
                    'direction': 'e',
                    minWidth,
                    maxWidth,
                    'persistanceKey': 'leftPaneWidth',
                    'handle': '.left-pane-drag-handle'
                });
            }
        }
    }

    addResizeListener() {
        window.addEventListener('resize', this.boundResizeLayout);
    }

    removeResizeListener() {
        window.removeEventListener('resize', this.boundResizeLayout);
    }
}

mWebLockWrap(MegaPasswordList.prototype, 'loadList', 'pwm-load-list-access-mutex');

(mega => {
    "use strict";

    lazy(mega.ui.pm, 'list', () => new MegaPasswordList({
        parentNode: pmlayout
    }));

})(window.mega);
