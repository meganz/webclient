class MegaTabGroup extends MegaComponentGroup {

    constructor(options) {
        super();

        this.selected = false;
        for (let i = 0; i < options.tabs.length; i++) {
            this.addTab(options.tabs[i], i);
        }
    }

    addTab(options, id) {
        id = options.tabid || id || this.children.length;
        this.addChild(id, new MegaInteractable({
            componentClassname:
                `mega-tab-option ${options.selected ? 'selected' : ''} ${options.decorated ? 'decorated' : ''}`,
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
    }

    decorateTab(id, enable) {
        if (this.childMap[id] !== undefined) {
            this.getChild(id)[`${enable ? 'add' : 'remove'}Class`]('decorated');
        }
    }
}
