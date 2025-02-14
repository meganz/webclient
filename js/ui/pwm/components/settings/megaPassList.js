class MegaPassList extends MegaComponentGroup {

    constructor(options) {
        super();

        // If parent node is not passed do not build anything
        if (!options.parentNode) {
            if (d) {
                console.error('MegaList - error: Target parent node to attach component is not passed');
            }
            return;
        }

        // If parent node is defined start build
        this.domNode = document.createElement('section');
        this.domNode.className = 'mega-list-container';

        if (options.componentClassname) {
            this.domNode.className += ` ${options.componentClassname}`;
        }

        if (options.title) {
            const listTitle = document.createElement('h3');
            listTitle.textContent = options.title;
            this.domNode.appendChild(listTitle);
        }

        this.listNode = document.createElement('div');
        this.listNode.className = 'mega-list';
        this.domNode.append(this.listNode);

        if (options.items) {
            this.items = Object.keys(options.items);

            for (let i = 0; i < this.items.length; i++) {
                const key = this.items[i];

                const item = new MegaPassListItem({
                    parentNode: this.listNode,
                    ...options.items[key]
                });

                this.addChild(key, item);
            }
        }

        options.parentNode.appendChild(this.domNode);
    }
}
