/**
 *  @param {Object} options To build a tab component
 *  @example Show or hide content without page Navigation
    new MegaMobileTab({
        parentNode: fmholder.querySelector('.fm-tab'),
        componentClassname: 'mega-tab',
        tabs: [
            { name : 'Cloud Drive', key: 'cloud', active: true, onSelect: _cloudTab, type:'button' },
            { name: 'Rubbish Bin', key: 'bin', active: false, onSelect: _rubbishTab,
                type: 'link', href: 'fm/public-links' }
        ],
        tabContentClassname: 'mega-tab-item'
    });
 *
 *  @example Show or hide content with page Navigation
    new MegaMobileTab({
        parentNode: fmholder.querySelector('.fm-tab'),
        componentClassname: 'mega-tab shared-items',
        tabs: [
            { name : 'Incoming', key: 'incoming', active: true, href: 'fm/shares' },
            { name: 'Outgoing', key: 'outgoing', active: false, href: 'fm/out-shares' },
            { name: 'Links', key: 'links', active: false, href: 'fm/public-links' }
        ]
    });
 */

class MegaMobileTab extends MegaMobileComponent {

    constructor(options) {

        super(options);

        this.children = Object.create(null);

        // tab wrapper
        const megaTab = document.createElement('div');
        megaTab.className = 'tab-container';
        this.domNode.appendChild(megaTab);

        for (const item of options.tabs) {
            this.addChild(item);
        }

        options.parentNode.classList.remove('hidden');
    }

    applyDomChange() {
        for (const tab of Object.values(this.children)) {
            if (this.activeTab === tab.key) {
                tab.addClass('active');
            }
            else {
                tab.removeClass('active');
            }
        }
    }

    addChild(item) {

        if (!item.key || !item.name) {

            if (d) {
                console.error(`TabComponent name or key is missing: ${item.key}`);
            }

            return false;
        }

        let tabComponent = MegaMobileButton;

        const tabOptions = {
            parentNode: this.domNode.querySelector('.tab-container'),
            text: item.name,
            type: 'normal',
            componentClassname: `list-item ${item.key}`
        };

        if (item.type === 'link') {

            if (!item.href) {

                if (d) {
                    console.error(`No href provided for item: ${item.key}`);
                }

                return false;
            }

            tabComponent = MegaMobileLink;
            tabOptions.href = item.href;
        }

        const tab = new tabComponent(tabOptions);

        tab.on('tap.tab', e => {

            if (this.activeTab === e.target.key) {
                return false;
            }

            this.activeTab = e.target.key;
            this.applyDomChange();

            if (typeof item.onSelect === 'function') {
                item.onSelect(this.activeTab);
            }
        });

        tab.key = item.key;

        // set tab as active
        if (item.active) {
            tab.addClass('active');
            this.activeTab = item.key;
        }

        this.children[item.key] = tab;
    }

    destroy(hideWrapper) {
        for (const child of Object.values(this.children)) {
            child.destroy();
        }

        // hide the wrapper
        if (hideWrapper) {
            this.domNode.parentNode.classList.add('hidden');
        }

        super.destroy();
    }
}
