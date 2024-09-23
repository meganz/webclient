class MegaMobileBottomBar extends MegaMobileComponent {

    constructor(options) {

        super(options);

        // If ads are disabled, use the original bottom bar
        // Otherwise create a new bottom bar wrapper and return the node for the bottom bar
        const bottomNode = (options.adWrapper && mega.flags.ab_ads)
            ? mega.commercials.addCommsToBottomBar(this.domNode, options.adWrapper === 'adFolder')
            : this.domNode;

        bottomNode.classList.add('mega-bottom-bar');

        this.actions = [];

        const buildAction = (options) => {

            const buttonAction = new MegaMobileButton(options);

            if (typeof options.binding === 'function') {
                buttonAction.on('tap', options.binding);
            }

            this.actions.push(buttonAction);
        };

        let subNode = document.createElement('div');
        subNode.className = 'text-actions';
        bottomNode.appendChild(subNode);

        if (options.actions && options.actions[0]) {

            for (const action of options.actions[0]) {

                const textOptions = {
                    parentNode: subNode,
                    type: 'normal',
                    componentClassname: `primary block ${action[0]}`,
                    text : action[1],
                    binding: action[2],
                    disabled: !!action[3]
                };

                buildAction(textOptions);
            }
        }

        subNode = document.createElement('div');
        subNode.className = 'icon-actions';
        bottomNode.appendChild(subNode);

        if (options.actions && options.actions[1]) {

            for (const action of options.actions[1]) {

                const iconOptions = {
                    parentNode: subNode,
                    type: 'icon',
                    iconSize: 16,
                    componentClassname: `secondary block ${action[0]}`,
                    icon : `sprite-mobile-fm-mono ${action[1]}`,
                    binding: action[2],
                    disabled: !!action[3]
                };

                buildAction(iconOptions);
            }
        }

        // Create new ads in the bottom bar
        if (options.adWrapper && mega.flags.ab_ads) {
            mega.commercials.createMobileBottomBarSlots(this.domNode, options.adWrapper === 'adFolder');
        }
    }
}
