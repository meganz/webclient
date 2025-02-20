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
                simpletipClass: 'mobile-theme-tip',
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

    initListItem(options) {
        if (options instanceof MegaComponent) {
            this.body.append(options.domNode);
            return;
        }
        const { itemComp } = options;
        let ComponentClass = MegaButton;
        if (itemComp === 'node') {
            ComponentClass = MegaNodeComponent;
        }
        else if (itemComp === 'contactNode') {
            ComponentClass = MegaContactNode;
            options.smallAvatar = true;
        }
        else if (itemComp === 'chat') {
            ComponentClass = MegaChatItem;
        }
        return new ComponentClass({
            parentNode: this.body,
            ...options
        });
    }

    _validateExistingNode(itemComp, exist) {
        return (itemComp === 'button' && exist instanceof MegaButton) ||
            (itemComp === 'node' && exist instanceof MegaNodeComponent) ||
            (itemComp === 'contactNode' && exist instanceof MegaContactNode) ||
            (itemComp === 'chat' && exist instanceof MegaChatItem);
    }

    set list(list) {
        const newList = new Map();
        for (let i = 0; i < list.length; i++) {
            const listItem = list[i];
            const { id, nodeHandle, itemComp } = listItem;
            const ident = id || nodeHandle || i;
            if (this._list.has(ident)) {
                const exist = this._list.get(ident);
                if (this._validateExistingNode(itemComp, exist)) {
                    if (exist instanceof MegaNodeComponent || exist instanceof MegaChatItem) {
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

    updateFooter(options) {
        const { label, icon, onClick } = options;
        this.footer.classList.remove('hidden');
        this.footerButton.rebind('click', (ev) => onClick(ev));
        this.footerButton.text = label;
        this.footerButton.icon = icon;
        const footerIcon = this.footerButton.domNode.querySelector('.right-icon');
        if (footerIcon) {
            footerIcon.parentNode.removeChild(footerIcon);
            delete this.footerButton.domNode.rightIcon;
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
        this.body.textContent = '';

        this.footer.classList.add('hidden');
        this.footerButton.off('click');
        this.footerButton.text = '';
        this.footerButton.icon = '';
        const footerIcon = this.footerButton.domNode.querySelector('.right-icon');
        if (footerIcon) {
            footerIcon.parentNode.removeChild(footerIcon);
            delete this.footerButton.domNode.rightIcon;
        }

        this._list = new Map();
        this.name = '';
        this.listHeaders = false;

        mega.ui.header.topBlockBottomBorder = false;
        mega.ui.header.contactsButton.icon = 'sprite-fm-mono icon-user-square-thin-outline';
        mega.ui.header.contactsButton.removeClass('active');
        mega.ui.header.chatsButton.icon = 'sprite-fm-mono icon-message-chat-circle-thin';
        mega.ui.header.chatsButton.removeClass('active');
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
        if (this.name && this.name !== options.name) {
            this.trigger('onFlyoutChange');
        }
        this.resetUI();
        super.show();
        mega.ui.mInfoPanel.closeIfOpen();
        mega.ui.header.addClass(`active-flyout-${options.name}`);

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
                simpletipClass: 'mobile-theme-tip',
            };
            this.openButton.addClass('simpletip');
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
        requestAnimationFrame(() => {
            this.domNode.parentNode.classList.add('ready');
        });

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

    hide() {
        super.hide();
        this.resetUI();
        this.domNode.parentNode.classList.remove('ready');
        tSleep(0.2).then(() => {
            this.domNode.parentNode.classList.remove('flyout-shown');
        });
        this.trigger('onHidden');
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
        showReactDialog(ContactSelectorDialogUI.ContactSelectorDialog, {
            className: 'main-start-chat-dropdown lhp-contact-selector',
            multiple: false,
            topButtons: [
                {
                    key: 'newGroupChat',
                    title: l[19483],
                    icon: 'sprite-fm-mono icon-chat-filled',
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
                }
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
        attachBroadcastListeners(event, cb) {
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
            if (mega.ui.onboarding && mega.ui.onboarding.currentSection) {
                mega.ui.onboarding.currentSection.startNextOpenSteps();
            }
        });
    }

    /**
     * @property {*} mega.ui.flyout
     */
    lazy(mega.ui, 'flyout', () => ({
        flyoutMenu: new MegaFlyoutMenu({
            parentNode: document.getElementsByClassName('flyout-holder')[0],
            componentClassname: 'flyout-main',
        }),

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
            this.flyoutMenu.body.textContent = '';
            options.showClose = false;
            this.flyoutMenu.overlay.show(options);
        },

        loadingState(options) {
            if (!options || this.name !== options.name) {
                return;
            }

            const skeletonElm = [];
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
            flyoutState.clearListeners();
            flyoutState.attachChangeListener(M.u, () => {
                delay('flyout-contacts-refresh', () => {
                    if (this.name === 'contacts') {
                        this.showContactsFlyout();
                    }
                });
            });
            this.flyoutMenu.on('onHidden.contacts', () => {
                flyoutState.clearListeners();
                delete this.showContactsFlyout.searchTerm;
                this.flyoutMenu.off('onHidden.contacts');
                this.flyoutMenu.off('onFlyoutChange.contacts');
            });
            this.flyoutMenu.rebind('onFlyoutChange.contacts', () => {
                delete this.showContactsFlyout.searchTerm;
                this.flyoutMenu.off('onFlyoutChange.contacts');
            });
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
                return;
            }
            this.emptyState({ name: 'contacts', hide: true });
            const sortFn = M.getSortByNameFn();
            list = list.sort((a, b) => sortFn(a, b, 1))
                .map(n => ({
                    itemComp: 'contactNode',
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
                        contactAddDialog();
                    },
                },
                list,
                listHeaders: firstInitialListHeaders,
                targetPage: 'fm/chat/contacts',
                targetLabel: l.open_contacts,
            });
            this.flyoutMenu.on('search', ({ data }) => {
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

                this.flyoutMenu.footer.classList.add('hidden');
                if (filtered.length) {
                    this.flyoutMenu.listHeaders = false;
                    this.flyoutMenu.list = filtered;
                    return;
                }
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
            mega.ui.header.contactsButton.addClass('active');
            const name = `contact-${contactHandle}`;
            const uName = M.getNameByHandle(contactHandle);
            const actions = [
                {
                    icon: 'sprite-fm-mono icon-message-chat-circle-thin',
                    dataset: {
                        simpletip: l.send_message,
                        simpletipClass: 'mobile-theme-tip',
                    },
                    onClick() {
                        mega.ui.flyout.flyoutMenu.hide();
                        eventlog(500661);
                        loadSubPage(`fm/chat/p/${contactHandle}`);
                        megaChat.trigger(convAppConstants.EVENTS.NAV_RENDER_VIEW, convAppConstants.VIEWS.CHATS);
                    }
                },
                {
                    icon: 'sprite-fm-mono icon-phone-01-thin-outline',
                    dataset: {
                        simpletip: l.call_contact.replace('%s', uName),
                        simpletipClass: 'mobile-theme-tip',
                    },
                    onClick({ currentTarget }) {
                        if (currentTarget.disabled) {
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
                        simpletipClass: 'mobile-theme-tip',
                    },
                    onClick({ currentTarget }) {
                        if (currentTarget.disabled) {
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
                            mega.ui.flyout.flyoutMenu.hide();
                            megaChat.openChatAndSendFilesDialog(contactHandle);
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
                topControls: [
                    {
                        type: 'icon',
                        icon: 'sprite-fm-mono icon-trash-thin-outline',
                        dataset: {
                            simpletip: l[1001],
                            simpletipClass: 'mobile-theme-tip'
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
            this.flyoutMenu.on('back', () => this.showContactsFlyout());
            this.loadingState({ name });
            dbfetch.geta(Object.keys(M.c.shares || {})).always(() => {
                if (this.name === name) {
                    const keys = Object.keys(M.c[contactHandle] || {});
                    if (keys.length === 0) {
                        this.emptyState({
                            name,
                            icon: 'folder',
                            title: l.contact_no_share_title.replace('%s', uName),
                            subtitle: l.contact_no_share_text.replace('%s', uName),
                        });
                        return;
                    }
                    const sortFn = M.getSortByNameFn2(1);
                    this.flyoutMenu.list = keys.sort((a, b) => sortFn(M.d[a], M.d[b])).map(h => ({
                        nodeHandle: h,
                        itemComp: 'node',
                        ignoreCustomRoute: true,
                    }));
                }
            });
        },

        showChatsFlyout() {
            if (!megaChatIsReady) {
                return;
            }
            flyoutState.clearListeners();
            this.flyoutMenu.show({
                name: 'chat',
                topSection: {
                    label: l[7997],
                },
                footer: {
                    label: l.add_chat,
                    icon: 'sprite-fm-mono icon-plus-light-solid',
                    onClick() {
                        showStartGroupChatDialog();
                        eventlog(500664);
                    },
                },
                list: [],
                targetPage: 'fm/chat',
                targetLabel: l.open_chat,
            });
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

            this.flyoutMenu.rebind('onHidden.chatsflyout', () => {
                flyoutState.clearListeners();
                this.flyoutMenu.off('onHidden.chatsflyout');
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
            lastChatsPane = 'chat';
            flyoutState.clearListeners();
            this.emptyState({ name: 'chat', hide: true });
            const list = Object.values(megaChat.chats)
                .filter(c => !c.isMeeting && c.isDisplayable())
                .sort(M.sortObjFn(c => c.lastActivity || c.ctime, -1))
                .map(c => ({
                    nodeHandle: c.roomId,
                    chatId: c.roomId,
                    itemComp: 'chat',
                }));
            if (list.length) {
                this.flyoutMenu.updateFooter({
                    label: l.add_chat,
                    icon: 'sprite-fm-mono icon-plus-light-solid',
                    onClick() {
                        showStartGroupChatDialog();
                        eventlog(500664);
                    },
                });
                this.flyoutMenu.listHeaders = false;
                this.flyoutMenu.list = list;
                const participants = new Set();
                const updateChatsTab = () => {
                    delay('flyout-chats-refresh', () => {
                        if (this.flyoutMenu.chatTabGroup && this.flyoutMenu.chatTabGroup.selected === 'chats') {
                            this.showChatPane();
                        }
                    });
                };
                const attachedTo = new Set();
                for (const item of list) {
                    const chatRoom = megaChat.chats[item.chatId];
                    const parts = chatRoom.getParticipantsExceptMe();
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
            this.flyoutMenu.footer.classList.add('hidden');
            this.emptyState({
                name: 'chat',
                icon: 'chats',
                title: l.chat_privately,
                actions: [
                    M.u.some(contact => contact.c === 1) ?
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
                    eventlog(list.length ? 500669 : 500670);
                    showReactDialog(StartMeetingDialogUI.Start, {
                        onStart(topic, audio, video) {
                            megaChat.createAndStartMeeting(topic, audio, video);
                            closeReactDialog();
                        },
                        onClose: closeReactDialog,
                    });
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

    }));

})(window.mega);

