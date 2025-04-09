class MegaPassListItem extends MegaComponent {

    constructor(options) {
        super(options);

        this.addClass('mega-list-item');

        this.rightcontainer = document.createElement('div');
        this.rightcontainer.className = 'mega-list-item-right';

        if (options.id) {
            this.domNode.id = options.id;
        }

        if (options.leftIcon) {
            this.leftIcon = document.createElement('div');
            this.leftIcon.className = 'mega-list-item-left-icon';
            this.leftIcon.appendChild(options.leftIcon);
            this.domNode.append(this.leftIcon);
        }

        if (options.title || options.subtitle) {
            this.textContainer = document.createElement('div');
            this.textContainer.className = 'mega-list-item-text';
            this.domNode.append(this.textContainer);
        }

        if (options.title) {
            this.title = document.createElement('span');
            this.title.className = 'mega-item-list-title';
            this.title.textContent = options.title;
            this.textContainer.appendChild(this.title);
        }

        if (options.subtitle) {
            this.subtitle = document.createElement('span');
            this.subtitle.className = 'mega-item-list-subtitle';

            if (options.subtitle instanceof DocumentFragment) {
                this.subtitle.appendChild(options.subtitle);
            }
            else {
                this.subtitle.textContent = options.subtitle;
            }
            this.textContainer.appendChild(this.subtitle);

        }

        if (options.iconButton) {
            const interactableClass = options.iconButton.href ? MegaLink : MegaButton;
            const fullButton = new interactableClass({
                parentNode: this.rightcontainer,
                componentClassname: `full-button ${options.iconButton.className || ''}`,
                ...options.iconButton
            });

            if (!options.iconButton.href && !options.iconButton.className) {
                fullButton.addClass('secondary');
            }

            if (options.iconButton.iconSizeSmall) {
                options.iconButton.iconSize = options.iconButton.iconSizeSmall;
            }

            const smallButton = new interactableClass({
                parentNode: this.rightcontainer,
                componentClassname: 'small-button secondary',
                type: 'icon',
                ...options.iconButton
            });

            this.domNode.classList.add('icon-button');

            if (options.iconButton.evId) {
                fullButton.on('click', () => {
                    eventlog(options.iconButton.evId);
                });
                smallButton.on('click', () => {
                    eventlog(options.iconButton.evId);
                });
            }
        }

        if (options.textInteractable) {
            const {textInteractable} = options;
            const interactableClass = textInteractable.href ? MegaLink : MegaButton;

            const fullButton = new interactableClass({
                parentNode: this.rightcontainer,
                componentClassname: `full-text-button ${textInteractable.className || ''}`,
                ...textInteractable
            });

            if (!textInteractable.href && !textInteractable.className) {
                fullButton.addClass('secondary');
            }

            if (textInteractable.evId) {
                fullButton.on('click', () => {
                    eventlog(textInteractable.evId);
                });
            }

            this.addClass('text-button');
        }

        if (options.toggle) {
            const toggleButton = new MegaToggleButton({
                parentNode: this.rightcontainer,
                componentClassname: 'mega-toggle-button',
                role: 'switch',
                ...options.toggle
            });
            toggleButton.setButtonState(options.toggle.checked);
        }

        if (options.checkbox) {
            const checkbox = new MegaCheckbox({
                parentNode: this.rightcontainer,
                componentClassname: 'mega-checkbox',
                ...options.checkbox
            });
            checkbox.show();
        }

        if (options.dropdown) {
            const dropdown = new MegaDropdown({
                parentNode: this.rightcontainer,
                componentClassname: `mega-dropdown ${options.dropdown.id}`,
                ...options.dropdown
            });
            dropdown.show();
            this.domNode.classList.add('wrap');
        }

        if (options.tag) {
            const tag = document.createElement('span');
            tag.className = 'mega-tag';
            this.rightcontainer.classList.add('tag');
            tag.textContent = options.tag.text;
            this.rightcontainer.appendChild(tag);
        }

        this.domNode.append(this.rightcontainer);
    }
}
