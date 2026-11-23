class MegaFlyoutMenu extends MegaComponent {
    constructor(options) {
        super(options);

        const header = document.createElement('div');
        header.className = 'flyout-header';
        this.domNode.append(header);

        const controls = document.createElement('div');
        controls.className = 'flyout-controls';
        header.append(controls);

        this.backButton = new MegaInteractable({
            parentNode: controls,
            type: 'icon',
            icon: 'sprite-fm-mono icon-arrow-left-thin-solid',
            componentClassname: 'back-button',
            onClick: () => {
                this.trigger('back');
            }
        });
        this.back = false;

        this.openButton = new MegaInteractable({
            parentNode: controls,
            type: 'icon',
            icon: 'sprite-fm-mono icon-external-link-thin-outline',
        });
        this.openButton.on('click', () => {
            if (this.target) {
                loadSubPage(this.target);
                this.hide();
            }
        });

        this.topControls = document.createElement('div');
        controls.append(this.topControls);

        MegaInteractable.factory({
            parentNode: controls,
            componentClassname: 'simpletip',
            type: 'icon',
            icon: 'sprite-fm-mono icon-dialog-close',
            dataset: {
                simpletip: l.close_panel,
            },
            onClick: () => {
                this.trigger('close');
                this.hide();
            }
        });

        const topSection = document.createElement('div');
        topSection.className = 'top-section';
        header.append(topSection);

        this.topLabel = document.createElement('div');
        this.topLabel.className = 'top-section-label hidden';
        topSection.appendChild(this.topLabel);

        this.topSearch = document.createElement('div');
        this.topSearch.className = 'top-section-search hidden';
        topSection.append(this.topSearch);

        this.topActions = document.createElement('div');
        this.topActions.className = 'top-section-actions hidden';
        topSection.append(this.topActions);

        this.topBodyRow = document.createElement('div');
        this.topBodyRow.className = 'flyout-body-header hidden';
        this.domNode.append(this.topBodyRow);

        this.overlay = new MegaOverlay({
            parentNode: this.domNode,
            componentClassname: 'mega-overlay flyout-overlay',
            wrapperClassname: 'overlay overlay-container'
        });

        this.body = document.createElement('div');
        this.body.className = 'flyout-body';
        this.domNode.append(this.body);
        this.body.Ps = new PerfectScrollbar(this.body);

        this.footer = document.createElement('div');
        this.footer.className = 'flyout-footer hidden';
        this.domNode.append(this.footer);

        this.footerInverseButton = new MegaButton({
            parentNode: this.footer,
            type: 'full-width',
            componentClassname: 'footer-inverse',
        });

        this.footerButton = new MegaButton({
            parentNode: this.footer,
            type: 'full-width',
            componentClassname: 'secondary'
        });

        this._list = new Map();
        this.name = '';
        this.listHeaders = false;
    }

    set back(show) {
        if (show) {
            this.backButton.show();
        }
        else {
            this.backButton.hide();
        }
    }

    set topBodyLabelVisible(visible) {
        if (visible) {
            this.topBodyRow.classList.remove('hidden');
        }
        else {
            this.topBodyRow.classList.add('hidden');
        }
    }

    set bodyLabel(text) {
        this.topBodyRow.textContent = '';
        this.topBodyLabelVisible = true;
        if (text) {
            let className = 'body-label';
            if (typeof text !== 'string') {
                className = `${className} ${text.className}`;
                text = text.text;
            }
            const span = document.createElement('span');
            span.className = className;
            span.textContent = text;
            this.topBodyRow.append(span);
        }
    }

    initListItem(options, parentNode) {
        if (options instanceof MegaComponent) {
            this.body.append(options.domNode);
            return;
        }
        parentNode = parentNode || this.body;
        const { itemComp } = options;
        const ComponentClass = MegaFlyoutMenu.getComponentForType(itemComp);
        return new ComponentClass({
            parentNode,
            noLeftProps: true,
            noRightProps: true,
            noContextBtn: true,
            noSelectionCheck: true,
            ...options
        });
    }

    set list(list) {
        const newList = new Map();
        for (let i = 0; i < list.length; i++) {
            const listItem = list[i];
            const { id, nodeHandle, itemComp } = listItem;
            const ident = id || nodeHandle || i;
            if (this._list.has(ident)) {
                const exist = this._list.get(ident);
                if (exist instanceof MegaFlyoutMenu.getComponentForType(itemComp)) {
                    if (typeof exist.update === 'function') {
                        exist.update(listItem);
                    }
                    else {
                        for (const prop of Object.keys(listItem)) {
                            exist[prop] = listItem[prop];
                        }
                    }
                    newList.set(ident, exist);
                }
                else {
                    newList.set(ident, listItem);
                }
            }
            else {
                newList.set(ident, listItem);
            }
        }

        this.body.textContent = '';
        let initial = null;
        for (const [ident, newItem] of newList) {
            if (typeof this.listHeaders === 'function') {
                initial = this.listHeaders(this, initial, newItem);
            }
            const component = this.initListItem(newItem);
            if (component) {
                newList.set(ident, component);
            }
        }

        this._list = newList;
        this.body.Ps.update();
    }

    /**
     * Flatten a list into the rows a MegaDynamicList renders: a header wherever the listSection changes,
     * as indexedListHeaders() draws them, then the item itself.
     * @param {Array} list blocks, as for the list setter.
     * @returns {Array} {id, header} and {id, block} entries in display order, each id used once.
     */
    static dynamicListEntries(list) {
        const entries = [];
        const ids = new Set();
        const unique = (id) => {
            let res = id;
            for (let n = 1; ids.has(res); n++) {
                res = `${id}#${n}`;
            }
            ids.add(res);
            return res;
        };
        let section = null;

        for (let i = 0; i < list.length; i++) {
            const block = list[i];
            const {id, nodeHandle, listSection} = block;

            if (listSection && listSection.idx !== section) {
                section = listSection.idx;

                if (listSection.value) {
                    entries.push({id: unique(`header:${section}`), header: listSection});
                }
            }
            entries.push({id: unique(String(id || nodeHandle || i)), block});
        }
        return entries;
    }

    /**
     * Render a list through a MegaDynamicList, so only the rows in view are in the DOM.
     * @param {Array} list blocks, as for the list setter, with listSection for the headers.
     * @param {Object} [options] rendering options.
     * @param {Function} [options.heightKey] block -> key shared by the blocks rendered at one height.
     * @param {Function} [options.onRendered] called with the ids of the rows just added to the view.
     * @returns {void}
     */
    renderDynamicList(list, {heightKey = (block) => block.itemComp, onRendered} = {}) {
        // a re-render, e.g. after a node change, stays where it was scrolled to.
        const scrollY = this.dynamicList ? this.body.scrollTop : 0;

        this.clearDynamicList();
        this.body.textContent = '';

        const entries = new Map(MegaFlyoutMenu.dynamicListEntries(list).map(e => [e.id, e]));

        // components mount on creation, the list then moves them into place.
        const holder = document.createElement('div');
        const rendered = new Map();
        const heights = Object.create(null);

        const render = (id) => {
            if (!rendered.has(id)) {
                const {header, block} = entries.get(id);
                let node;

                if (header) {
                    node = new MegaComponent({
                        parentNode: holder,
                        componentClassname: `list-header ${header.headerClass || ''}`
                    }).domNode;
                    node.textContent = header.value;
                }
                else {
                    node = block instanceof MegaComponent ? block.domNode : this.initListItem(block, holder).domNode;
                }
                rendered.set(id, node);
            }
            return rendered.get(id);
        };

        // one row per height key is measured in place, so the offsets follow the CSS.
        const measure = (id) => {
            const node = render(id);
            this.body.append(node);
            const {marginTop, marginBottom} = getComputedStyle(node);
            const height = node.offsetHeight + parseFloat(marginTop) + parseFloat(marginBottom);
            node.remove();
            return height;
        };

        this.dynamicList = new MegaDynamicList(this.body, {
            items: [...entries.keys()],
            itemRenderFunction: render,
            itemHeightCallback: (id) => {
                const {header, block} = entries.get(id);
                const key = header ? `header:${header.headerClass || ''}` : `item:${heightKey(block)}`;

                if (!heights[key]) {
                    heights[key] = measure(id);
                }
                return heights[key];
            },
            onNodeInjected: onRendered,
            initialScrollY: scrollY,
        });
        this.dynamicList.initialRender();
        Ps.update(this.body);
    }

    clearDynamicList() {
        if (this.dynamicList) {
            this.dynamicList.destroy();
            delete this.dynamicList;
            this.body.classList.remove('MegaDynamicList');
            this.body.style.position = '';

            // destroy() leaves the body with a dead scrollbar, and other flyouts update it.
            this.body.Ps = new PerfectScrollbar(this.body);
        }
    }

    updateFooter(mainOptions, inverseOptions) {
        const { label, icon, onClick, className } = mainOptions;
        this.footer.className = `flyout-footer ${className || ''}`.trim();
        this.footerButton.rebind('click', (ev) => onClick(ev));
        this.footerButton.text = label;
        this.footerButton.icon = icon;
        const footerIcon = this.footerButton.domNode.querySelector('.right-icon');
        if (footerIcon) {
            footerIcon.parentNode.removeChild(footerIcon);
            delete this.footerButton.domNode.rightIcon;
        }
        if (inverseOptions) {
            const { label: iLabel, icon: iIcon, onClick: iOnClick } = inverseOptions;
            this.footerInverseButton.rebind('click', (ev) => iOnClick(ev));
            this.footerInverseButton.text = iLabel;
            this.footerInverseButton.icon = iIcon;
            this.footerInverseButton.show();
        }
        else {
            this.footerInverseButton.hide();
        }
    }

    resetUI() {
        this.back = false;
        delete this.target;

        this.openButton.dataset.simpletip = '';
        this.openButton.dataset.simpletipClass = '';
        this.openButton.removeClass('simpletip');

        this.topControls.textContent = '';

        this.topLabel.classList.add('hidden');
        this.topLabel.classList.remove('text-only');
        this.topLabel.textContent = '';
        delete this.labelNode;

        this.topSearch.classList.add('hidden');
        this.topSearch.textContent = '';
        delete this.search;

        this.topActions.classList.add('hidden');
        this.topActions.textContent = '';

        this.topBodyRow.classList.add('hidden');
        this.topBodyRow.textContent = '';

        this.overlay.hide();
        this.clearDynamicList();
        this.body.textContent = '';

        this.footer.className = 'flyout-footer hidden';
        this.footerButton.off('click');
        this.footerButton.text = '';
        this.footerButton.icon = '';
        const footerIcon = this.footerButton.domNode.querySelector('.right-icon');
        if (footerIcon) {
            footerIcon.parentNode.removeChild(footerIcon);
            delete this.footerButton.domNode.rightIcon;
        }
        this.footerInverseButton.off('click');
        this.footerInverseButton.text = '';
        this.footerInverseButton.icon = '';
        this.footerInverseButton.hide();

        this._list = new Map();
        this.name = '';
        this.listHeaders = false;

        if (!is_chatlink) {
            mega.ui.header.topBlockBottomBorder = false;
            mega.ui.header.contactsButton.icon = 'sprite-fm-mono icon-user-square-thin-outline';
            mega.ui.header.contactsButton.removeClass('active');
            mega.ui.header.chatsButton.icon = 'sprite-fm-mono icon-message-chat-circle-thin';
            mega.ui.header.chatsButton.removeClass('active');
        }
    }

    initTopSection(options) {
        const { label, actions, search } = options;
        if (label) {
            if (typeof label === 'string') {
                this.topLabel.textContent = label;
                this.topLabel.classList.add('text-only');
            }
            else {
                const ComponentClass = label.nodeHandle.length === 11 ? MegaContactNode : MegaNodeComponent;
                this.labelNode = new ComponentClass({
                    parentNode: this.topLabel,
                    noLeftProps: true,
                    noRightProps: true,
                    noContextBtn: true,
                    noSelectionCheck: true,
                    ...label
                });
            }
            this.topLabel.classList.remove('hidden');
        }
        if (actions) {
            actions.map(actionButton => new MegaButton({
                parentNode: this.topActions,
                componentClassname: `secondary block ${
                    actionButton.dataset && actionButton.dataset.simpletip ? 'simpletip' : ''}`,
                type: 'icon',
                ...actionButton
            }));
            this.topActions.classList.remove('hidden');
        }
        if (search) {
            const { placeholder, filter } = search;
            this.search = new MegaInputComponent({
                parentNode: this.topSearch,
                placeHolder: l[102],
                icon: 'sprite-fm-mono icon-search-light-outline',
                wrapperClasses: 'search-bar',
            });
            this.search.on('input', () => {
                delay(`megasearch.flyout`, () => {
                    if (this.search) {
                        this.trigger('search', this.search.value);
                    }
                }, 1000);
            });
            this.search.placeholder = placeholder;
            if (filter) {
                this.search.value = filter;
            }
            this.topSearch.classList.remove('hidden');
        }
    }

    show(options) {
        if (!options || !options.name) {
            console.error('Missing flyout configurations');
            return;
        }
        if (this.hiding) {
            this.hiding.abort();
            delete this.hiding;
        }
        if (this.name && this.name !== options.name) {
            this.trigger('onFlyoutChange');
        }
        this.resetUI();
        super.show();
        if (!is_chatlink) {
            mega.ui.header.addClass(`active-flyout-${options.name}`);
        }

        this.name = options.name;
        if (options.topSection) {
            this.initTopSection(options.topSection);
        }

        if (Array.isArray(options.list)) {
            if (options.listHeaders) {
                this.listHeaders = options.listHeaders;
            }
            this.list = options.list;
        }

        this.target = options.targetPage;
        if (options.targetLabel) {
            this.openButton.dataset = {
                simpletip: options.targetLabel,
            };
            this.openButton.addClass('simpletip');
        }
        if (this.target) {
            this.openButton.show();
        }
        else {
            this.openButton.hide();
        }
        if (options.topControls) {
            for (const control of options.topControls) {
                MegaInteractable.factory({
                    parentNode: this.topControls,
                    componentClassname: control.dataset && control.dataset.simpletip ? 'simpletip' : '',
                    ...control,
                });
            }
        }

        if (options.footer) {
            this.updateFooter(options.footer);
        }

        this.domNode.parentNode.classList.add('flyout-shown');
        const parent = document.getElementById(is_chatlink ? 'startholder' : 'pmlayout');
        if (parent) {
            parent.classList.add('flyout-expanded');
        }

        if (!is_chatlink) {
            mega.ui.header.topBlockBottomBorder = true;
            if (this.name.startsWith('contact')) {
                mega.ui.header.contactsButton.icon = 'sprite-fm-mono icon-user-square-thin-solid';
                mega.ui.header.contactsButton.addClass('active');
            }
            else if (this.name === 'chat') {
                mega.ui.header.chatsButton.icon = 'sprite-fm-mono icon-chat-filled';
                mega.ui.header.chatsButton.addClass('active');
            }
        }
    }

    hide(destroying) {
        if (this.hiding && !destroying) {
            return;
        }
        const parent = document.getElementById(is_chatlink ? 'startholder' : 'pmlayout');
        if (parent) {
            parent.classList.remove('flyout-expanded');
        }
        this.name = '';
        const doHide = () => {
            super.hide();
            this.domNode.parentNode.classList.remove('flyout-shown');
            if (!destroying) {
                this.resetUI();
            }
            $.tresizer();
            delete this.hiding;
            this.trigger('onHidden');
        };
        if (destroying) {
            if (this.hiding) {
                this.hiding.abort();
            }
            doHide();
            return;
        }
        this.hiding = tSleep(0.2);
        this.hiding.then(doHide);
    }

    static getComponentForType(type) {
        switch (type) {
            case 'node': {
                return MegaNodeComponent;
            }
            case 'contactNode': {
                return MegaContactNode;
            }
            case 'chat': {
                return MegaChatItem;
            }
            case 'infoBlock': {
                return mega.ui.mInfoPanel.MegaInfoBlock;
            }
            case 'infoInputBlock': {
                return mega.ui.mInfoPanel.MegaInfoInputBlock;
            }
            case 'versions': {
                return MegaVersionItem;
            }
            default: {
                return MegaButton;
            }
        }
    }
}

((mega) => {
    'use strict';

    const normalizeStr = (str) => {
        str = String(str || '').toLowerCase();
        if (str && str.normalize) {
            return str.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\u00f8/g, 'o')
                .replace(/\u00d8/g, 'O')
                .replace(/\u00e6/g, 'ae')
                .replace(/\u00c6/g, 'AE')
                .replace(/\u0259/g, 'e')
                .replace(/\u0152/g, 'OE')
                .replace(/\u0153/g, 'oe')
                .replace(/\u00df/g, 'ss')
                .replace(/[\u0131\u0142]/g, 'l')
                .replace(/\u0111/g, 'd')
                .replace(/\u0110/g, 'D')
                .replace(/\u00fe/g, 'p');
        }
        return str;
    };

    let $$dialogRoot = null;
    let dialogPlacer = null;
    const closeReactDialog = () => {
        if ($$dialogRoot) {
            $$dialogRoot.unmount();
        }
        if (dialogPlacer) {
            dialogPlacer.remove();
        }
        $$dialogRoot = null;
        dialogPlacer = null;
    };
    const showReactDialog = (Component, props) => {
        if ($$dialogRoot || dialogPlacer) {
            return;
        }
        dialogPlacer = document.createElement('div');
        const $$dialogElement = React.createElement(Component, props);
        $$dialogRoot = ReactDOM.createRoot(dialogPlacer);
        $$dialogRoot.render($$dialogElement);
    };

    const showStartGroupChatDialog = () => {
        const hasContacts = M.u.some(contact => contact.c === 1);
        const noteChat = megaChat.getNoteChat();
        showReactDialog(ContactSelectorDialogUI.ContactSelectorDialog, {
            className: 'main-start-chat-dropdown lhp-contact-selector',
            multiple: false,
            topButtons: [
                {
                    key: 'newGroupChat',
                    title: l[19483],
                    className: 'positive',
                    onClick() {
                        eventlog(500658);
                        closeReactDialog();
                        showReactDialog(StartGroupChatDialogUI.StartGroupChatWizard, {
                            name: 'start-group-chat',
                            flowType: 1,
                            onClose: closeReactDialog,
                            onConfirmClicked: closeReactDialog,
                        });
                    }
                },
                ...megaChat.WITH_SELF_NOTE ?
                    hasContacts || noteChat && noteChat.hasMessages() ? [] : [{
                        key: 'noteChat',
                        title: l.note_label,
                        icon: 'sprite-fm-mono icon-file-text-thin-outline note-chat-icon',
                        onClick: () => {
                            closeDialog();
                            loadSubPage(`fm/chat/p/${u_handle}`);
                        }
                    }] :
                    []
            ],
            showAddContact: true,
            onSelectDone(selected) {
                if (selected.length === 1) {
                    return megaChat.createAndShowPrivateRoom(selected[0])
                        .then(room => room.setActive());
                }
                megaChat.createAndShowGroupRoomFor(selected);
            },
            onClose: closeReactDialog,
        });
    };

    const nonLangRegex = new RegExp(/[^\p{L}]/u);
    const firstInitialListHeaders = (flyout, initial, newItem) => {
        let name = '';
        if (newItem instanceof MegaComponent) {
            name = newItem.name || '';
        }
        else {
            name = M.getNameByHandle(newItem.nodeHandle);
        }
        let itemInitial = normalizeStr(name.trim().slice(0, 1)).toUpperCase();
        if (nonLangRegex.test(itemInitial)) {
            itemInitial = '#';
        }
        if (initial !== itemInitial) {
            const header = new MegaComponent({
                parentNode: flyout.body,
                componentClassname: 'list-header initials-header'
            });
            header.domNode.textContent = initial = itemInitial;
        }
        return initial;
    };

    const indexedListHeaders = (flyout, initial, newItem) => {
        const { listSection } = newItem;
        const { idx, value, headerClass } = listSection;
        if (initial !== idx) {
            const header = new MegaComponent({
                parentNode: flyout.body,
                componentClassname: `list-header ${headerClass || ''}`
            });
            header.domNode.textContent = value;
            initial = idx;
        }
        return initial;
    };

    const flyoutState = {
        broadcasterListeners: new Set(),
        changeListeners: new Map(),
        eventListeners: new Map(),
        attachBroadcastListener(event, cb) {
            const id = mBroadcaster.addListener(event, cb);
            this.broadcasterListeners.add(id);
        },
        attachChangeListener(attachTo, cb) {
            if (attachTo instanceof MegaDataMap) {
                const id = attachTo.addChangeListener(cb);
                const events = this.changeListeners.get(attachTo) || new Set();
                events.add(id);
                this.changeListeners.set(attachTo, events);
                return id;
            }
            if (d) {
                console.warn('Tried to attach change listener to invalid object', attachTo);
            }
            return false;
        },
        attachEventListener(attachTo, event, cb) {
            if (typeof attachTo.rebind !== 'function') {
                if (d) {
                    console.warn('Tried to attach event listener to invalid object', attachTo);
                }
                return;
            }
            attachTo.rebind(event, cb);
            const events = this.eventListeners.get(attachTo) || new Set();
            events.add(event);
            this.eventListeners.set(attachTo, events);
        },
        detachBroadcastListener(event) {
            mBroadcaster.removeListener(event);
            this.broadcasterListeners.delete(event);
        },
        detachChangeListener(attachedTo, id) {
            attachedTo.removeChangeListener(id);
            const events = this.changeListeners.get(attachedTo);
            events.delete(id);
            if (events.size) {
                this.changeListeners.set(attachedTo, events);
            }
            else {
                this.changeListeners.delete(attachedTo);
            }
        },
        detachEventListener(attachedTo, event) {
            attachedTo.off(event);
            const events = this.eventListeners.get(attachedTo);
            events.delete(event);
            if (events.size) {
                this.changeListeners.set(attachedTo, events);
            }
            else {
                this.changeListeners.delete(attachedTo);
            }
        },
        clearListeners() {
            let list = [...this.broadcasterListeners];
            for (const event of list) {
                this.detachBroadcastListener(event);
            }
            this.broadcasterListeners = new Set();
            for (const [attachedTo, ids] of this.changeListeners) {
                list = [...ids];
                for (const id of list) {
                    this.detachChangeListener(attachedTo, id);
                }
            }
            this.changeListeners = new Map();
            for (const [attachedTo, events] of this.eventListeners) {
                list = [...events];
                for (const event of list) {
                    this.detachEventListener(attachedTo, event);
                }
            }
            this.eventListeners = new Map();
        },
    };

    const usersFetched = new Set();
    const meetingsFetched = new Set();
    let meetingLoading = 'toload';
    let lastChatsPane = 'chat';

    const chatReady = mega.promise;
    if (megaChatIsReady) {
        chatReady.resolve();
    }
    else if (megaChatIsDisabled) {
        chatReady.resolve();
    }
    else {
        mBroadcaster.once('chat_initialized', () => {
            chatReady.resolve();
            if (!is_chatlink) {
                mega.ui.header.update();
            }

            const {currentSection} = mega.ui.onboarding || {};
            const currentStep = currentSection && currentSection.currentStep;

            if (currentSection && currentSection.map && currentSection.map.flag === OBV4_FLAGS.CLOUD_DRIVE_NEW_NAV &&
                currentStep && currentStep.map && currentStep.map.flag === OBV4_FLAGS.CLOUD_DRIVE_NEW_NAV_CHAT) {
                currentSection.startNextOpenSteps();
            }
        });
    }

    let infoPanelPromise = false;
    mega.ui.flyoutInit = false;

    const flyoutMenu = () => {
        mega.ui.flyoutInit = true;
        const holder = is_fm() && self.pmlayout || document.getElementById('startholder');
        const wrapper = holder.querySelector('.flyout-holder')
            || mCreateElement('div', {class: 'flyout-holder'}, holder);

        return new MegaFlyoutMenu({
            parentNode: wrapper,
            componentClassname: 'flyout-main',
        });
    };
    /**
     * @property {*} mega.ui.flyout
     */
    lazy(mega.ui, 'flyout', () => ({
        flyoutMenu: flyoutMenu(),
        reinit(prevElem) {
            this.flyoutMenu.hide(true);
            delete this.flyoutMenu;
            if (prevElem) {
                prevElem.remove();
            }
            mega.ui.flyoutInit = false;
            lazy(this, 'flyoutMenu', flyoutMenu);
        },

        get name() {
            return this.flyoutMenu.name;
        },

        closeIfNeeded() {
            if (!this.name || !mega.ui.header) {
                return;
            }
            if (
                mega.ui.header.chatsButton.parentNode.classList.contains('hidden') && this.name === 'chat' ||
                mega.ui.header.contactsButton.parentNode.classList.contains('hidden') && this.name.startsWith('contact')
            ) {
                this.hide();
            }
        },

        hide() {
            this.flyoutMenu.hide();
        },

        emptyState(options) {
            if (!options || this.name !== options.name) {
                return;
            }
            if (options.hide) {
                this.flyoutMenu.overlay.hide();
                return;
            }
            this.flyoutMenu.clearDynamicList();
            this.flyoutMenu.body.textContent = '';
            options.showClose = false;
            this.flyoutMenu.overlay.show(options);
        },

        loadingState(options) {
            if (!options || this.name !== options.name) {
                return;
            }

            const skeletonElm = [];
            this.flyoutMenu.clearDynamicList();
            this.flyoutMenu.body.textContent = '';
            const count = options.count || 5;
            for (let i = 0; i < count; i++) {
                skeletonElm.push(new MegaInteractable({
                    parentNode: this.flyoutMenu.body,
                    componentClassname: 'password-item',
                    type: 'fullwidth',
                    text: 'a',
                    subtext: 'b',
                    icon: 'sk-elm',
                    skLoading: true
                }));
            }

            return skeletonElm;
        },

        updateScroll(name) {
            if (this.name === name) {
                this.flyoutMenu.body.Ps.update();
            }
        },

        showContactsFlyout() {
            if (
                this.name === 'contacts' &&
                this.flyoutMenu.search &&
                document.activeElement === this.flyoutMenu.search.input &&
                !this.showContactsFlyout.searchTerm
            ) {
                // Block updates that will lose focus while the search term is being typed.
                return;
            }
            let list = Object.values(M.u)
                .filter(n => n.c === 1);
            const initListeners = () => {
                flyoutState.clearListeners();
                flyoutState.attachChangeListener(M.u, () => {
                    delay('flyout-contacts-refresh', () => {
                        if (this.name === 'contacts') {
                            this.showContactsFlyout();
                        }
                    });
                });
                flyoutState.attachEventListener(this.flyoutMenu, 'onHidden.contacts', () => {
                    flyoutState.clearListeners();
                    delete this.showContactsFlyout.searchTerm;
                });
                flyoutState.attachEventListener(this.flyoutMenu, 'onFlyoutChange.contacts', () => {
                    flyoutState.clearListeners();
                    delete this.showContactsFlyout.searchTerm;
                });
                // Clear saved search on close even if a sub-panel took over (survives clearListeners)
                this.flyoutMenu.rebind('onHidden.contactsearch', () => {
                    delete this.showContactsFlyout.searchTerm;
                });
            };
            if (list.length === 0) {
                this.flyoutMenu.show({
                    name: 'contacts',
                    topSection: {
                        label: l[165]
                    },
                    targetPage: 'fm/chat/contacts',
                });
                this.emptyState({
                    name: 'contacts',
                    icon: 'contact-book',
                    title: l.no_contacts_yet,
                    subtitle: l.contact_friend_family,
                    actions: [
                        {
                            text: l[71],
                            icon: 'sprite-fm-mono icon-plus-light-solid',
                            className: 'add-contact-button',
                            onClick() {
                                eventlog(500659);
                                contactAddDialog();
                            },
                        }
                    ]
                });
                initListeners();
                return;
            }
            this.emptyState({ name: 'contacts', hide: true });
            const sortFn = M.getSortByNameFn();
            list = list.sort((a, b) => sortFn(a, b, 1))
                .map(n => ({
                    itemComp: 'contactNode',
                    smallAvatar: true,
                    nodeHandle: n.h,
                    onClick() {
                        mega.ui.flyout.showContactFlyout(n.h);
                    }
                }));
            this.flyoutMenu.show({
                name: 'contacts',
                topSection: {
                    label: l[165],
                    search: {
                        placeholder: l.contact_search_placeholder
                    }
                },
                footer: {
                    label: l[71],
                    icon: 'sprite-fm-mono icon-plus-light-solid',
                    onClick() {
                        eventlog(500660);
                        // Pass current search value into the Add contact dialog
                        const {search} = mega.ui.flyout.flyoutMenu;
                        contactAddDialog(false, false, search && search.value);
                    },
                },
                list,
                listHeaders: firstInitialListHeaders,
                targetPage: 'fm/chat/contacts',
                targetLabel: l.open_contacts,
            });
            initListeners();
            flyoutState.attachEventListener(this.flyoutMenu, 'search.contacts', ({ data }) => {
                if (this.name !== 'contacts') {
                    return;
                }
                data = normalizeStr(data || '');
                this.emptyState({ name: 'contacts', hide: true });
                if (data === '') {
                    delete this.showContactsFlyout.searchTerm;
                    this.flyoutMenu.listHeaders = firstInitialListHeaders;
                    this.flyoutMenu.list = list;
                    this.flyoutMenu.topBodyLabelVisible = false;
                    this.flyoutMenu.footer.classList.remove('hidden');
                    return;
                }
                this.showContactsFlyout.searchTerm = data;
                this.flyoutMenu.bodyLabel = { text: l.matching_results, className: 'label-bold' };

                const filtered = list.filter(({ nodeHandle }) => {
                    const { name, nickname, fullname, m, u } = M.u[nodeHandle];
                    if (normalizeStr(name).includes(data)) {
                        return true;
                    }
                    if (normalizeStr(nickname).includes(data)) {
                        return true;
                    }
                    if (normalizeStr(fullname).includes(data)) {
                        return true;
                    }
                    if (normalizeStr(m).includes(data)) {
                        return true;
                    }
                    return normalizeStr(M.getNameByHandle(u)).includes(data);
                });

                if (filtered.length) {
                    this.flyoutMenu.footer.classList.add('hidden');
                    this.flyoutMenu.listHeaders = false;
                    this.flyoutMenu.list = filtered;
                    return;
                }
                // Keep the footer on the no-matches empty state
                this.flyoutMenu.footer.classList.remove('hidden');
                this.emptyState({
                    name: 'contacts',
                    icon: 'search',
                    title: l.no_matching_contacts,
                    subtitle: l.search_again
                });
            });
            if (this.showContactsFlyout.searchTerm) {
                this.flyoutMenu.search.value = this.showContactsFlyout.searchTerm;
                this.flyoutMenu.trigger('search', this.showContactsFlyout.searchTerm);
            }
        },

        showContactFlyout(contactHandle) {
            flyoutState.clearListeners();
            const name = `contact-${contactHandle}`;
            const uName = M.getNameByHandle(contactHandle);
            const actions = [
                {
                    icon: 'sprite-fm-mono icon-message-chat-circle-thin',
                    dataset: {
                        simpletip: l.send_message,
                    },
                    onClick() {
                        mega.ui.flyout.flyoutMenu.hide();
                        eventlog(500661);
                        chatReady.then(() => {
                            loadSubPage(`fm/chat/p/${contactHandle}`);
                            megaChat.trigger(convAppConstants.EVENTS.NAV_RENDER_VIEW, convAppConstants.VIEWS.CHATS);
                        });
                    }
                },
                {
                    icon: 'sprite-fm-mono icon-phone-01-thin-outline',
                    dataset: {
                        simpletip: l.call_contact.replace('%s', uName),
                    },
                    onClick({ currentTarget }) {
                        if (currentTarget.disabled || M.isInvalidUserStatus()) {
                            return;
                        }
                        eventlog(500662);
                        chatReady.then(() => {
                            if (mega.ui.flyout.flyoutMenu.name !== name) {
                                return;
                            }
                            if (megaChatIsDisabled) {
                                currentTarget.disabled = true;
                                return;
                            }
                            if (megaChat.hasSupportForCalls) {
                                if (typeof window.inProgressAlert === 'function') {
                                    window.inProgressAlert()
                                        .then(() =>
                                            megaChat.createAndShowPrivateRoom(contactHandle)
                                                .then(room => {
                                                    room.setActive();
                                                    room.startAudioCall();
                                                })
                                        )
                                        .catch(() => d && console.warn('Already in a call.'));
                                }
                                else {
                                    // Assume no call.
                                    megaChat.createAndShowPrivateRoom(contactHandle)
                                        .then(room => {
                                            room.setActive();
                                            room.startAudioCall();
                                        });
                                }
                                mega.ui.flyout.flyoutMenu.hide();
                            }
                            else {
                                msgDialog(
                                    'warninga',
                                    '',
                                    '',
                                    navigator.userAgent.match(/Chrom(e|ium)\/(\d+)\./) ?
                                        l.alert_unsupported_browser_version :
                                        l.alert_unsupported_browser
                                );
                            }
                        });
                    }
                },
                {
                    icon: 'sprite-fm-mono icon-share-thin-outline',
                    dataset: {
                        simpletip: l.share_to_contact.replace('%s', uName),
                    },
                    onClick({ currentTarget }) {
                        if (currentTarget.disabled || M.isInvalidUserStatus()) {
                            return;
                        }
                        eventlog(500663);
                        chatReady.then(() => {
                            if (mega.ui.flyout.flyoutMenu.name !== name) {
                                return;
                            }
                            if (megaChatIsDisabled) {
                                currentTarget.disabled = true;
                                return;
                            }
                            M.initFileAndFolderSelectDialog({
                                folderSelectable: true,
                                noShareFolderAttach: true,
                                selectLabel: undefined,
                                hideIncoming: false,
                            }).then(
                                handles =>
                                    handles &&
                                    handles.length &&
                                    megaChat.openChatAndAttachNodes(contactHandle, handles)
                            ).catch(dump);
                        });
                    }
                }
            ];
            this.flyoutMenu.show({
                name,
                topSection: {
                    label: {
                        nodeHandle: contactHandle,
                    },
                    actions,
                },
                topControls: M.u[contactHandle].b ? undefined : [
                    {
                        type: 'icon',
                        icon: 'sprite-fm-mono icon-trash-thin-outline',
                        dataset: {
                            simpletip: l[1001],
                        },
                        onClick: () => {
                            fmremove(contactHandle);
                            this.showContactsFlyout();
                        }
                    }
                ],
                targetPage: `fm/chat/contacts/${contactHandle}`,
                targetLabel: l.open_contact,
            });
            this.flyoutMenu.back = true;
            this.flyoutMenu.bodyLabel = l.shared_folders_from.replace('%NAME', uName);
            flyoutState.attachEventListener(this.flyoutMenu, 'back.contact', () => this.showContactsFlyout());
            flyoutState.attachEventListener(this.flyoutMenu, 'onHidden.contact', () => flyoutState.clearListeners());
            flyoutState.attachEventListener(
                this.flyoutMenu, 'onFlyoutChange.contact', () => flyoutState.clearListeners()
            );
            this.loadingState({ name });
            dbfetch.geta(Object.keys(M.c.shares || {})).always(() => {
                if (this.name === name) {
                    const keys = Object.keys(M.c[contactHandle] || {});
                    if (keys.length === 0) {
                        this.emptyState({
                            name,
                            icon: 'folder',
                            title: l.contact_no_share_title.replace('%s', uName),
                            subtitle: escapeHTML(l.contact_no_share_text.replace('%s', uName)),
                        });
                        return;
                    }
                    const sortFn = M.getSortByNameFn2(1);
                    this.flyoutMenu.list = keys.sort((a, b) => sortFn(M.d[a], M.d[b])).map(h => {

                        const item = {
                            nodeHandle: h,
                            itemComp: 'node',
                            ignoreCustomRoute: true
                        };

                        if (M.d[h].t === 1) {
                            item.onClick = function() {
                                M.openFolder(this.nodeHandle);
                            }
                        }

                        return item;
                    });
                }
            });
        },

        showChatsFlyout() {
            if (!megaChatIsReady) {
                return;
            }
            this.flyoutMenu.show({
                name: 'chat',
                topSection: {
                    label: l[7997],
                },
                list: [],
                targetPage: 'fm/chat',
                targetLabel: l.open_chat,
            });
            flyoutState.clearListeners();
            const tabGroupWrap = document.createElement('div');
            tabGroupWrap.className = 'mega-component tab-group flyout-tabs';
            this.flyoutMenu.topBodyRow.appendChild(tabGroupWrap);
            this.flyoutMenu.chatTabGroup = new MegaTabGroup({
                tabs: [
                    {
                        parentNode: tabGroupWrap,
                        text: l.chats,
                        tabid: 'chats',
                        selected: lastChatsPane === 'chat',
                        decorated: !!(
                            megaChat._lastNotifications &&
                            (megaChat._lastNotifications.unreadChats || megaChat._lastNotifications.chatsCall)
                        ),
                        onClick: () => {
                            this.showChatPane();
                            eventlog(500665);
                        }
                    },
                    {
                        parentNode: tabGroupWrap,
                        text: l.meetings,
                        tabid: 'meetings',
                        selected: lastChatsPane === 'meetings',
                        decorated: !!(
                            megaChat._lastNotifications &&
                            (megaChat._lastNotifications.unreadUpcoming || megaChat._lastNotifications.meetingCall)
                        ),
                        onClick: () => {
                            this.showMeetingsPane();
                            eventlog(500666);
                        }
                    }
                ],
            });
            this.flyoutMenu.topBodyLabelVisible = true;

            // These listeners aren't added in flyoutState due to the sub panels holding specific additional state
            this.flyoutMenu.rebind('onHidden.chatsflyout', () => {
                flyoutState.clearListeners();
                this.flyoutMenu.off('onHidden.chatsflyout');
                this.flyoutMenu.off('onFlyoutChange.chatsflyout');
                delete this.flyoutMenu.chatTabGroup;
            });
            this.flyoutMenu.rebind('onFlyoutChange.chatsflyout', () => {
                flyoutState.clearListeners();
                this.flyoutMenu.off('onHidden.chatsflyout');
                this.flyoutMenu.off('onFlyoutChange.chatsflyout');
                delete this.flyoutMenu.chatTabGroup;
            });
            if (!flyoutState.chatFlyoutSetup) {
                flyoutState.chatFlyoutSetup = true;
                megaChat.rebind('onUnreadCountUpdate.chatsflyout', ({ data }) => {
                    if (this.name === 'chat' && this.flyoutMenu.chatTabGroup) {
                        // Notification handler
                        this.flyoutMenu.chatTabGroup.decorateTab('chats', data.chatsCall || !!data.unreadChats);
                        this.flyoutMenu.chatTabGroup.decorateTab('meetings', data.meetingCall || !!data.unreadUpcoming);
                        // Hack to refresh for ad-hoc/past meetings.
                        if (data.meetingCall) {
                            delay('flyout-meetings-refresh', () => {
                                if (this.name === 'chat' && this.flyoutMenu.chatTabGroup.selected === 'meetings') {
                                    this.showMeetingsPane();
                                }
                            });
                        }
                    }
                });
                megaChat.rebind('onRoomInitialized.chatsflyout', () => {
                    // New chatroom handler
                    if (this.name !== 'chat' || !this.flyoutMenu.chatTabGroup) {
                        return;
                    }
                    if (this.flyoutMenu.chatTabGroup.selected === 'chats') {
                        this.showChatPane();
                    }
                    else {
                        this.showMeetingsPane();
                    }
                });
            }
            if (lastChatsPane === 'chat') {
                this.showChatPane();
            }
            else {
                this.showMeetingsPane();
            }
        },

        showChatPane() {
            if (this.name !== 'chat') {
                return;
            }
            const hasContacts = M.u.some(contact => contact.c === 1);
            lastChatsPane = 'chat';
            flyoutState.clearListeners();
            this.emptyState({ name: 'chat', hide: true });
            const chats = Object.values(megaChat.chats)
                .filter(c => !c.isMeeting && c.isDisplayable() && (megaChat.WITH_SELF_NOTE || !c.isNote));
            let list =
                // Empty state
                !chats.length || chats.length === 1 && chats[0].isNote && !chats[0].hasMessages() ?
                    {} :
                    chats
                        .sort(M.sortObjFn(c => c.lastActivity || c.ctime, -1))
                        .map(c => ({ nodeHandle: c.roomId, chatId: c.roomId, itemComp: 'chat', }));
            const updateChatsTab = () => {
                delay('flyout-chats-refresh', () => {
                    if (this.flyoutMenu.chatTabGroup && this.flyoutMenu.chatTabGroup.selected === 'chats') {
                        this.showChatPane();
                    }
                });
            };
            this.flyoutMenu.updateFooter({
                label: l.add_chat,
                icon: 'sprite-fm-mono icon-plus-light-solid',
                onClick() {
                    showStartGroupChatDialog();
                    eventlog(500664);
                },
            }, !hasContacts && chats.length === 1 && chats[0].isNote && chats[0].hasMessages() && {
                label: l.invite_friend_btn,
                icon: 'sprite-fm-mono icon-user-plus-thin-outline',
                onClick() {
                    contactAddDialog();
                    eventlog(500668);
                }
            });
            if (list.length) {
                this.flyoutMenu.listHeaders = false;
                const noteChat = megaChat.getNoteChat();
                list = megaChat.WITH_SELF_NOTE && noteChat && noteChat.isDisplayable() ?
                    [{ nodeHandle: noteChat.roomId,  chatId: noteChat.roomId, itemComp: 'chat' }, ...list] :
                    list;
                this.flyoutMenu.list = list;
                const participants = new Set();
                const attachedTo = new Set();
                for (const item of list) {
                    const chatRoom = megaChat.chats[item.chatId];
                    const parts = chatRoom.isNote ? [u_handle] : chatRoom.getParticipantsExceptMe();
                    for (const part of parts) {
                        if (!usersFetched.has(part)) {
                            participants.add(part);
                            usersFetched.add(part);
                        }
                        if (part in M.u && !attachedTo.has(parts[0])) {
                            attachedTo.add(parts[0]);
                            flyoutState.attachChangeListener(M.u[parts[0]], () => updateChatsTab());
                        }
                    }
                    flyoutState.attachEventListener(chatRoom, 'onMessagesBuffAppend.chatsflyout', updateChatsTab);
                    flyoutState.attachChangeListener(chatRoom, () => updateChatsTab());
                }
                if (participants.size) {
                    const promises = [];
                    for (const handle of participants) {
                        promises.push(megaChat.plugins.userHelper.getUserName(handle));
                    }
                    Promise.allSettled(promises).finally(updateChatsTab);
                }
                return;
            }
            if (hasContacts) {
                this.flyoutMenu.footer.classList.add('hidden');
            }
            this.emptyState({
                name: 'chat',
                icon: 'chats',
                title: l.chat_privately,
                actions: [
                    ...megaChat.WITH_SELF_NOTE ?
                        [{
                            text: l.note_label,
                            icon: 'sprite-fm-mono icon-file-text-thin-outline note-chat-icon',
                            className: 'note-chat-button outline',
                            onClick: () => loadSubPage(`fm/chat/p/${u_handle}`)
                        }] : [],
                    hasContacts ?
                        {
                            text: l.add_chat,
                            icon: 'sprite-fm-mono icon-plus-light-solid',
                            className: 'new-chat-button',
                            onClick() {
                                showStartGroupChatDialog();
                                eventlog(500667);
                            }
                        } :
                        {
                            text: l.invite_friend_btn,
                            icon: 'sprite-fm-mono icon-user-plus-thin-outline',
                            className: 'invite-contact-button',
                            onClick() {
                                contactAddDialog();
                                eventlog(500668);
                            }
                        }
                ]
            });
            const subtitle = this.flyoutMenu.overlay.domNode.querySelector('div.subtitle');
            if (subtitle) {
                mCreateElement('span', {}, [parseHTML(l.chat_protected)], subtitle);
                clickURLs();
            }
            flyoutState.attachBroadcastListener('fmViewUpdate:opc', updateChatsTab);
        },

        showMeetingsPane() {
            if (this.name !== 'chat') {
                return;
            }
            lastChatsPane = 'meetings';
            flyoutState.clearListeners();
            this.emptyState({ name: 'chat', hide: true });
            if (meetingLoading.startsWith('loading')) {
                if (meetingLoading === 'loadingState') {
                    this.loadingState({ name: 'chat' });
                }
                return;
            }
            if (meetingLoading === 'toload') {
                const promises = [];
                let count = 0;
                for (const [chatId, chatRoom] of Object.entries(megaChat.chats.toJS())) {
                    const { scheduledMeeting } = chatRoom;
                    if (scheduledMeeting && !scheduledMeeting.isPast && scheduledMeeting.isRecurring) {
                        count++;
                        if (!meetingsFetched.has(chatId)) {
                            promises.push(scheduledMeeting.getOccurrences());
                            meetingsFetched.add(chatId);
                        }
                    }
                }
                if (promises.length) {
                    if (promises.length === count) {
                        this.loadingState({ name: 'chat' });
                        meetingLoading = 'loadingState';
                    }
                    else {
                        meetingLoading = 'loading';
                    }
                    Promise.allSettled(promises).then(() => {
                        meetingLoading = 'toload';
                        if (this.flyoutMenu.chatTabGroup && this.flyoutMenu.chatTabGroup.selected === 'meetings') {
                            this.showMeetingsPane();
                        }
                    });
                    return;
                }
            }

            const { nextOccurrences } = megaChat.plugins.meetingsManager.filterUpcomingMeetings(megaChat.chats);
            let idx = 0;
            const list = Object.values(megaChat.chats || {})
                .filter(c => c.isDisplayable() && c.isMeeting && c.havePendingCall())
                .map(c => ({
                    nodeHandle: c.roomId,
                    chatId: c.roomId,
                    itemComp: 'chat',
                    listSection: { idx, value: l.happening_now, headerClass: 'meetings-dates' }
                }));
            idx++;
            list.push(...nextOccurrences.today.map(c => ({
                nodeHandle: c.roomId,
                chatId: c.roomId,
                itemComp: 'chat',
                listSection: { idx, value: l.upcoming__today, headerClass: 'meetings-dates' }
            })));
            idx++;
            list.push(...nextOccurrences.tomorrow.map(c => ({
                nodeHandle: c.roomId,
                chatId: c.roomId,
                itemComp: 'chat',
                listSection: { idx, value: l.upcoming__tomorrow, headerClass: 'meetings-dates' }
            })));
            for (const [date, chats] of Object.entries(nextOccurrences.rest)) {
                idx++;
                const listSection  = { idx, value: date, headerClass: 'meetings-dates' };
                list.push(...Object.values(chats).map(c => ({
                    nodeHandle: c.roomId,
                    chatId: c.roomId,
                    itemComp: 'chat',
                    listSection,
                })));
            }
            const menuContent = document.createElement('div');
            menuContent.className = 'flyout-menu-dropdown';
            MegaButton.factory({
                parentNode: menuContent,
                type: 'fullwidth',
                componentClassname: 'text-icon',
                text: l.new_meeting_start,
                icon: 'sprite-fm-mono icon-video-plus',
                onClick() {
                    if (megaChat.hasSupportForCalls) {
                        return window.inProgressAlert()
                            .then(() => {
                                eventlog(list.length ? 500669 : 500670);
                                showReactDialog(StartMeetingDialogUI.Start, {
                                    onStart(topic, audio, video) {
                                        megaChat.createAndStartMeeting(topic, audio, video);
                                        closeReactDialog();
                                    },
                                    onClose: closeReactDialog,
                                });
                            })
                            .catch(() => d && console.warn('Already in a call.'));
                    }
                    showToast('warning', l[7211]);
                }
            });
            MegaButton.factory({
                parentNode: menuContent,
                type: 'fullwidth',
                componentClassname: 'text-icon',
                text: l.schedule_meeting_start,
                icon: 'sprite-fm-mono icon-calendar2',
                onClick(){
                    eventlog(list.length ? 500671 : 500672);
                    showReactDialog(ScheduleMeetingDialogUI.Schedule, {
                        onClose: closeReactDialog,
                    });
                }
            });
            if (list.length) {
                this.flyoutMenu.updateFooter({
                    label: l.new_meeting,
                    icon: 'sprite-fm-mono icon-plus-light-solid',
                    onClick(event) {
                        eventlog(500673);
                        mega.ui.menu.show({
                            name: 'flyout-meeting-dropdown',
                            classList: ['flyout-meeting-menu'],
                            event,
                            eventTarget: event.currentTarget,
                            contents: [menuContent],
                        });
                    },
                });
                this.flyoutMenu.footerButton.rightIcon = 'sprite-fm-mono icon-chevron-down-thin-outline';
                this.flyoutMenu.footerButton.rightIconSize = 24;
                this.flyoutMenu.listHeaders = indexedListHeaders;
                this.flyoutMenu.list = list;
                const updateMeetingsTab = () => {
                    delay('flyout-meetings-refresh', () => {
                        if (this.flyoutMenu.chatTabGroup && this.flyoutMenu.chatTabGroup.selected === 'meetings') {
                            this.showMeetingsPane();
                        }
                    });
                };
                for (const item of list) {
                    const chatRoom = megaChat.chats[item.chatId];
                    flyoutState.attachEventListener(chatRoom, 'onMessagesBuffAppend.chatsflyout', updateMeetingsTab);
                    flyoutState.attachChangeListener(chatRoom, () => updateMeetingsTab());
                }
                return;
            }
            this.flyoutMenu.footer.classList.add('hidden');
            this.emptyState({
                name: 'chat',
                icon: 'meetings',
                title: l.speak_freely,
                actions: [
                    {
                        text: l.new_meeting,
                        icon: 'sprite-fm-mono icon-plus-light-solid',
                        className: 'meeting-dropdown-button',
                        onClick(event) {
                            mega.ui.menu.show({
                                name: 'flyout-meeting-dropdown',
                                classList: ['flyout-meeting-menu'],
                                event,
                                eventTarget: event.currentTarget,
                                contents: [menuContent],
                            });
                        }
                    }
                ]
            });
            const dropdownButton = this.flyoutMenu.overlay.domNode.componentSelector('.meeting-dropdown-button');
            if (dropdownButton) {
                dropdownButton.rightIcon = 'sprite-fm-mono icon-chevron-down-thin-outline';
                dropdownButton.rightIconSize = 24;
            }
            const subtitle = this.flyoutMenu.overlay.domNode.querySelector('div.subtitle');
            if (subtitle) {
                mCreateElement('span', {}, [parseHTML(l.meeting_protected)], subtitle);
                clickURLs();
            }
        },

        showVersionFlyout(handles, folder) {
            const name = fileversioning.flyoutName;

            this.flyoutMenu.show({
                name,
                topSection: {
                    label: l[17150],
                },
                topControls: [
                    {
                        type: 'icon',
                        icon: 'sprite-fm-mono icon-settings-thin-outline',
                        dataset: {
                            simpletip: l.versions_settings_tip,
                        },
                        onClick: () => {
                            loadSubPage('fm/account/file-management');
                            this.hide();
                        }
                    }
                ],
            });

            flyoutState.clearListeners();

            if (folder) {
                this.flyoutMenu.back = true;
                flyoutState.attachEventListener(this.flyoutMenu, 'back.versions', () => fileversioning.show([folder]));
                flyoutState.attachEventListener(
                    this.flyoutMenu, 'onHidden.versions', () => flyoutState.clearListeners()
                );
                flyoutState.attachEventListener(
                    this.flyoutMenu, 'onFlyoutChange.versions', () => flyoutState.clearListeners()
                );
            }

            if (!handles.length) {
                this.emptyState({
                    name,
                    icon: 'search',
                    subtitle: l.no_versions_found,
                });
                return;
            }
            this.loadingState({name, count: 4});

            // the summary comes from the tree's counts, so only the rows below it wait for the versions.
            const summary = fileversioning.getLoadingBlock(handles);
            if (summary) {
                this.flyoutMenu.body.prepend(this.flyoutMenu.initListItem(summary).domNode);
            }
            this.showVersions(handles);
        },

        showVersions(handles) {
            const name = fileversioning.flyoutName;
            fileversioning.getBlocks(handles)
                .then(blocks => {
                    // null: the panel was reopened or refreshed while this call was loading.
                    if (blocks === null || this.name !== name) {
                        return;
                    }
                    if (!blocks || !blocks.length) {
                        this.flyoutMenu.footer.classList.add('hidden');
                        this.emptyState({
                            name,
                            icon: 'search',
                            subtitle: l.no_versions_found,
                        });
                        return;
                    }
                    // a redraw after "No versions found" would otherwise draw the rows under it.
                    this.emptyState({name, hide: true});

                    // set on every render, so it goes once the previous versions are deleted; before the rows, so
                    // they and any scroll position restored with them fit the room the footer leaves.
                    const footer = fileversioning.getFooter();
                    if (footer) {
                        this.flyoutMenu.updateFooter(footer);
                    }
                    else {
                        this.flyoutMenu.footer.classList.add('hidden');
                    }

                    // rows are built as they scroll into view, and each batch then asks for its thumbnails.
                    this.flyoutMenu.renderDynamicList(blocks, {
                        heightKey: (block) => block.mainFile ? 'summary' : block.versionFile ? 'file' : 'version',
                        onRendered: () => fileversioning.renderCb(),
                    });
                })
                .catch((ex) => {
                    // only a first load is reported: a background redraw keeps the rows it already drew.
                    if (this.name === name && !this.flyoutMenu.dynamicList) {
                        this.flyoutMenu.footer.classList.add('hidden');
                        this.emptyState({
                            name,
                            icon: 'search',
                            subtitle: l.no_versions_found,
                        });
                        tell(ex);
                    }
                    else {
                        dump(ex);
                    }
                });
        },

        showInfoFlyout(handles) {
            if (infoPanelPromise) {
                return;
            }
            const name = mega.ui.mInfoPanel.flyoutName;
            if (handles.length && name === this.name) {
                // Check if elements can be refreshed.
                const exist = this.flyoutMenu.domNode.componentSelector('.info-panel-block');
                if (exist && exist.handles) {
                    const { removed, added } = array.diff(exist.handles, handles);
                    if (removed.length + added.length === 0) {
                        // Same handles so refresh instead;
                        return this.showInfoPanel(handles);
                    }
                }
            }
            this.flyoutMenu.show({
                name,
                topSection: {
                    label: l[6859],
                },
            });
            flyoutState.clearListeners();
            flyoutState.attachEventListener(this.flyoutMenu, 'onHidden.infopanel', () => {
                infoPanelPromise = false;
                mega.ui.mInfoPanel.cleanup();
                flyoutState.clearListeners();
            });
            flyoutState.attachEventListener(this.flyoutMenu, 'onFlyoutChange.infopanel', () => {
                infoPanelPromise = false;
                mega.ui.mInfoPanel.cleanup();
                flyoutState.clearListeners();
            });
            if (!handles.length) {
                this.emptyState({
                    name,
                    icon: 'search',
                    subtitle: l.info_panel_empty,
                });
                return;
            }
            this.loadingState({ name, count: Math.min(handles.length, 5) });
            this.showInfoPanel(handles);
        },

        showInfoPanel(handles) {
            const name = mega.ui.mInfoPanel.flyoutName;
            infoPanelPromise = mega.ui.mInfoPanel.getBlocks(handles)
                .then(blocks => {
                    infoPanelPromise = false;
                    if (this.name !== name) {
                        return;
                    }
                    if (!blocks || !blocks.length) {
                        this.emptyState({
                            name,
                            icon: 'search',
                            subtitle: l.info_panel_empty,
                        });
                        return;
                    }
                    this.flyoutMenu.list = blocks;
                    mega.ui.mInfoPanel.renderCb();
                })
                .catch((ex) => {
                    if (d) {
                        dump(ex);
                    }
                    infoPanelPromise = false;
                });
        }
    }));

})(window.mega);

