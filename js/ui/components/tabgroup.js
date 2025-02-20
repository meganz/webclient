class MegaTabGroup extends MegaComponentGroup {

    constructor(options) {
        super();

        this.selected = false;
        for (let i = 0; i < options.tabs.length; i++) {
            this.addTab(options.tabs[i], i);
        }
    }

    addTab(options, id) {
        id = options.tabid || id || Object.keys(this.children).length;
        this.addChild(id, new MegaInteractable({
            componentClassname:
                `mega-tab-option ${options.selected ? 'selected' : ''} ${options.decorated ? 'decorated' : ''}`,
            ...options,
            onClick: () => {
                if (this.children[id].hasClass('selected')) {
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
        if (!this.children[selId]) {
            return;
        }
        for (const [id, tab] of Object.entries(this.children)) {
            tab[`${id === selId ? 'add' : 'remove'}Class`]('selected');
        }
        this.selected = selId;
    }

    decorateTab(id, enable) {
        if (this.children[id]) {
            this.children[id][`${enable ? 'add' : 'remove'}Class`]('decorated');
        }
    }
}
