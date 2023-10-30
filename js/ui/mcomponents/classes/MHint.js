class MHint extends MComponent {
    /**
     * @param {Object.<String, any>} data An enclosing data object
     * @param {String} data.title Title of the hint
     * @param {String} data.text Main description text
     * @param {String} data.img Image to show above the title (css classes)
     * @param {String} data.link Link to go to on `Learn more` click
     * @param {String} [data.classes] Additional classes to add
     */
    constructor({
        title,
        text,
        img,
        link,
        classes
    }) {
        super();

        this.img = img;
        this.title = title;
        this.text = text;
        this.link = link;

        this.appendCss(classes);

        this.attachEvent('mouseenter.tipPosition', () => {
            this._triggerHovered = true;
            this.show();
        });

        this.attachEvent('mouseleave.tipPosition', () => {
            this._triggerHovered = false;
            delay('hint:hide', () => {
                this.hide();
            });
        });

        this._tooltipHovered = false;
        this._triggerHovered = false;
    }

    buildElement() {
        this.el = document.createElement('div');

        const icon = document.createElement('i');
        icon.className = 'sprite-fm-theme icon-question-grey';

        this.el.appendChild(icon);
    }

    buildTooltip() {
        if (this._tooltip) {
            return;
        }

        this._tooltip = new MContextMenu(null, true);
        this._tooltip.el.classList.add(
            'dropdown',
            'body',
            'dropdown-arrow',
            'keys-tip',
            'left-arrow',
            'w-80',
            'text-center'
        );

        const arrow = document.createElement('i');
        arrow.className = 'dropdown-white-arrow';
        const img = document.createElement('div');
        img.className = this.img;
        const title = document.createElement('div');
        title.className = 'tip-header';
        title.textContent = this.title;
        const text = document.createElement('div');
        text.className = 'tip-text mx-2';
        text.textContent = this.text;
        const link = document.createElement('a');
        link.className = 'tip-link';
        link.textContent = l[8742];
        link.href = this.link;
        link.rel = 'noopener noreferrer';
        link.target = '_blank';

        this._tooltip.el.appendChild(arrow);
        this._tooltip.el.appendChild(img);
        this._tooltip.el.appendChild(title);
        this._tooltip.el.appendChild(text);
        this._tooltip.el.appendChild(link);

        this.attachEvent(
            'mouseenter.tipPosition.tooltip',
            () => {
                this._tooltipHovered = true;

                delay('hint:hide', () => {
                    this.hide();
                });
            },
            null,
            this._tooltip.el
        );

        this.attachEvent(
            'mouseleave.tipPosition.tooltip',
            () => {
                this._tooltipHovered = false;

                delay('hint:hide', () => {
                    this.hide();
                });
            },
            null,
            this._tooltip.el
        );
    }

    show() {
        this.buildTooltip();

        const { x, y, right, bottom } = this.el.getBoundingClientRect();
        this._tooltip.show(right + 12, y - 48, x, bottom + MContextMenu.offsetVert);
    }

    hide() {
        if (!this._tooltipHovered && !this._triggerHovered && this._tooltip) {
            this._tooltip.hide();
            delete this._tooltip;
        }
    }
}
