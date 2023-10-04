class MegaMobileBottomBar extends MegaMobileComponent {

    constructor(options) {

        super(options);

        this.domNode.classList.add('mega-bottom-bar');

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
        this.domNode.appendChild(subNode);

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
        this.domNode.appendChild(subNode);

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
    }
}
