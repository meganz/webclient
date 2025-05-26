class MegaTooltip extends MegaComponent {

    constructor(options) {
        super(options);

        this.addClass('custom-alpha', 'overlay-wrap');

        this.tooltip = document.createElement('div');
        this.tooltip.className = `${options.wrapperClassname} custom-alpha`;
        this.domNode.appendChild(this.tooltip);

        this.renderContent();
        this.renderActions();
        this.renderControls();

        this._onWindowResize = this.updatePosition.bind(this);
    }

    renderContent() {
        this.contentNode = document.createElement('div');
        this.contentNode.className = 'tooltip-content';

        const textDiv = document.createElement('div');
        textDiv.className = 'tooltip-text';
        this.contentNode.appendChild(textDiv);

        this.titleNode = document.createElement('h3');
        this.titleNode.className = 'tooltip-title';
        textDiv.appendChild(this.titleNode);

        this.bodyNode = document.createElement('div');
        this.bodyNode.className = 'tooltip-body';
        textDiv.appendChild(this.bodyNode);

        this.tooltip.appendChild(this.contentNode);
    }

    renderActions() {
        this.actionsNode = document.createElement('div');
        this.actionsNode.className = 'tooltip-actions';
        this.contentNode.appendChild(this.actionsNode);
    }

    renderControls() {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'tooltip-controls';
        this.tooltip.appendChild(controlsDiv);

        this.closeButton = new MegaButton({
            parentNode: controlsDiv,
            type: 'icon',
            componentClassname: 'text-icon close hidden',
            icon: `${mega.ui.sprites.mono} icon-dialog-close`,
            iconSize: 24,
            onClick: () => this.hide()
        });

        this.stepNode = document.createElement('div');
        this.stepNode.className = 'tooltip-step';
        controlsDiv.appendChild(this.stepNode);
    }

    get visible() {
        return this.hasClass('active');
    }

    /*
     * @param {Object} options
     * @param {HTMLElement} [options.targetNode=null]
     *          The element this tooltip is anchored to.
     * @param {string} [options.title='']
     *          Heading text shown in the tooltip.
     * @param {string} [options.body='']
     *          Main body text of the tooltip.
     * @param {'top'|'bottom'|'left'|'right'} [options.position='top']
     *          Where the tooltip appears relative to the targetNode.
     * @param {'start'|'center'|'end'} [options.align='center']
     *          Alignment along the axis perpendicular to position.
     * @param {Array<{text: string, className?: string, onClick: Function}>} [options.actions=[]]
     *          List of buttons to render inside the tooltip.
     * @param {boolean} [options.close=false]
     *          Whether to show a close icon/button.
     * @param {{current: number, total: number}|boolean} [options.step=false]
     *          If truthy, renders a step X/Y indicator.
     */
    show(options) {
        if (options) {
            this.clear();
            const {
                targetNode = null,
                title = '',
                body = '',
                position = 'top',
                align = 'center',
                actions = [],
                close = false,
                step = false
            } = options;

            Object.assign(this, {targetNode, title, body, position, align, actions, close, step});
            this.interactive = actions.length > 0 || close || step;

            this.tooltip.className = [
                'tooltip',
                `position-${this.position}`,
                `align-${this.align}`,
                this.interactive ? 'interactive' : 'simple'
            ].join(' ');

            // Auto-hide for non-interactive tooltips
            if (!this.interactive) {
                this._autoHideId = setTimeout(() => this.hide(), 6000);
            }

            this.showClose = this.close;

            if (this.title) {
                this.addTitle(this.title);
            }
            if (this.body) {
                this.addBody(this.body);
            }
            if (this.actions) {
                this.addActions(this.actions);
            }
            if (this.step) {
                this.addStep(this.step.current, this.step.total);
            }

            this.updatePosition();

            window.removeEventListener('resize', this._onWindowResize);
            window.addEventListener('resize', this._onWindowResize);

            document.documentElement.classList.add('overlayed-backdrop-dim');
            this.addClass('active');
        }
    }

    hide() {
        if (this._autoHideId) {
            clearTimeout(this._autoHideId);
        }
        window.removeEventListener('resize', this._onWindowResize);
        document.documentElement.classList.remove('overlayed-backdrop-dim');
        this.removeClass('active');
    }

    clear() {
        this.clearTitle();
        this.clearBody();
        this.clearActions();
        this.clearStep();
    }

    get showClose() {
        return !this.closeButton.hasClass('hidden');
    }

    set showClose(show) {
        if (show !== !this.closeButton.hasClass('hidden')) {
            this.closeButton.toggleClass('hidden');
        }
    }

    addTitle(title) {
        this.clearTitle();
        this.titleNode.textContent = title;
    }

    clearTitle() {
        this.titleNode.textContent = '';
    }

    addBody(body) {
        this.clearBody();
        this.bodyNode.textContent = body;
    }

    clearBody() {
        this.bodyNode.textContent = '';
    }

    addActions(actions) {
        this.clearActions();

        for (let i = 0; i < actions.length; i++) {
            const {text, className, onClick} = actions[i];
            const button = new MegaButton({
                parentNode: this.actionsNode,
                type: 'normal',
                componentClassname: className || '',
                text,
                onClick
            });
            button.show();
        }
    }

    clearActions() {
        this.actionsNode.textContent = '';
    }

    addStep(current, total) {
        this.clearStep();
        this.stepNode.textContent = `${current}/${total}`;
    }

    clearStep() {
        this.stepNode.textContent = '';
    }

    updatePosition() {
        if (!this.targetNode) {
            return;
        }
        const r = this.targetNode.getBoundingClientRect();
        const {offsetWidth: w, offsetHeight: h} = this.tooltip;
        const gap = 4;
        const arrow = 8;
        let x, y;

        if (this.position === 'top' || this.position === 'bottom') {
            y = this.position === 'top' ?
                r.top - h - arrow - gap
                : r.bottom + arrow + gap;
            x = this.align === 'start' ?
                r.left
                : this.align === 'end' ?
                    r.right - w
                    : r.left + (r.width - w) / 2;
        }
        else {
            x = this.position === 'left' ?
                r.left - w - arrow - gap
                : r.right + arrow + gap;
            y = this.align === 'start' ?
                r.top
                : this.align === 'end' ?
                    r.bottom - h
                    : r.top + (r.height - h) / 2;
        }

        const {style} = this.tooltip;
        Object.assign(style, {
            left: `${Math.round(x)}px`,
            top: `${Math.round(y)}px`
        });
    }
}

mega.ui.tooltip = new MegaTooltip({
    parentNode: document.body,
    componentClassname: 'mega-tooltip',
    wrapperClassname: 'tooltip'
});

window.addEventListener('popstate', () => {
    'use strict';

    if (mega.ui.tooltip.visible) {
        mega.ui.tooltip.hide();
    }
});
