class MegaTabGroup extends MegaComponentGroup {

    constructor(options) {
        super();

        this.selected = false;
        this.slider = !!options.slider;
        for (let i = 0; i < options.tabs.length; i++) {
            this.addTab(options.tabs[i], i);
        }
        this.positionSlider();
    }

    addTab(options, id) {
        id = options.tabid || id || this.children.length;
        this.addChild(id, new MegaInteractable({
            componentClassname: `
                mega-tab-option 
                ${options.selected ? 'selected' : ''} 
                ${options.decorated ? 'decorated' : ''}
                ${this.slider ? 'slider-tab' : ''}
            `,
            ...options,
            onClick: () => {
                if (this.getChild(id).hasClass('selected')) {
                    return false;
                }
                this.selectTab(id);
                if (typeof options.onClick === 'function') {
                    options.onClick();
                }
            }
        }));
        if (options.selected) {
            this.selected = id;
        }

        if (this.slider) {
            const label = this.getChild(id).domNode.querySelector('.primary-text');
            if (label) {
                label.dataset.label = options.text || '';
            }
        }

        if (options.badge) {
            this.setTabBadge(id, options.badge);
        }
        else if (options.postText) {
            this.setTabPostText(id, options.postText);
        }
    }

    selectTab(selId) {
        if (this.childMap[selId] === undefined) {
            return;
        }
        for (const [id, tabId] of Object.entries(this.childMap)) {
            const tab = this.children[tabId];
            tab[`${id === selId ? 'add' : 'remove'}Class`]('selected');
        }
        this.selected = selId;
        this.positionSlider();
    }

    positionSlider() {
        const tab = this.slider && this.getChild(this.selected);
        if (!tab) {
            return;
        }
        const { parentNode, offsetLeft, offsetWidth } = tab.domNode;
        parentNode.style.setProperty('--slider-pos-x', `${offsetLeft}px`);
        parentNode.style.setProperty('--slider-width', `${offsetWidth}px`);
    }

    decorateTab(id, enable) {
        if (this.childMap[id] !== undefined) {
            this.getChild(id)[`${enable ? 'add' : 'remove'}Class`]('decorated');
        }
    }

    setTabBadge(id, options) {
        const tab = this.slider && this.getChild(id);
        if (!tab) {
            return;
        }
        const badge = tab.getSubNode('badge');
        if (options) {
            const { badgeClass, badgeText } = options;
            badge.className = badgeClass ? `badge ${badgeClass}` : 'badge';
            badge.textContent = badgeText;
        }
        else {
            badge.remove();
        }

        this.positionSlider();
    }

    setTabPostText(id, options) {
        const tab = this.slider && this.getChild(id);
        if (!tab) {
            return;
        }
        const postText = tab.getSubNode('post-text');
        if (options) {
            const { postTextClass, postTextMsg } = options;
            postText.className = postTextClass ? `post-text ${postTextClass}` : 'post-text';
            postText.textContent = postTextMsg;
            postText.dataset.label = postTextMsg || '';
        }
        else {
            postText.remove();
        }

        this.positionSlider();
    }
}
