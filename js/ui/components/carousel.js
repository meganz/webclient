class MegaCarousel extends MegaComponent {
    /**
     * MegaCarousel constructor
     *
     * @param {Object} options Carousel options.
     * @param {Object[]} [options.pages] Initial pages options
     * @param {Number} [options.perPage] How many pages to show at once.
     * @param {String|Number} [options.startPage] Optional ID of the page to show first
     * @param {Number} [options.interval] Optional seconds between automatic advances
     */
    constructor(options) {
        super(options);
        if (options.pages && (!Array.isArray(options.pages) || !options.pages.length)) {
            console.error('Invalid page options specified');
            return;
        }
        options.pages = options.pages || [];
        this.addClass('carousel-holder');
        this.pages = new MegaComponentGroup();
        this.currentIndex = 0;
        this.perPage = options.perPage;
        this.interval = typeof options.interval === 'number' ? Math.abs(options.interval) : 0;
        this.track = mCreateElement('div', { 'class': 'carousel-track' });
        this.domNode.appendChild(mCreateElement('div', { 'class': 'carousel-viewport' }, [this.track]));
        this.prevControl = new MegaButton({
            parentNode: this.domNode,
            componentClassname: 'carousel-control carousel-prev',
            type: 'icon',
            icon: 'sprite-fm-mono icon-chevron-left-thin-outline',
            onClick: () => this.prev()
        });
        this.nextControl = new MegaButton({
            parentNode: this.domNode,
            componentClassname: 'carousel-control carousel-next',
            type: 'icon',
            icon: 'sprite-fm-mono icon-chevron-right-thin-outline',
            onClick: () => this.next()
        });
        for (let i = 0; i < options.pages.length; i++) {
            this.addPage(options.pages[i]);
        }
        if (this.pages.children.length) {
            this.goTo(options.startPage || this.pages.children[0].carouselId);
        }
        this.play();
    }

    play(interval) {
        if (interval) {
            this.interval = interval;
            if (this._timer) {
                this.stop();
            }
        }
        if (this._timer || !this.interval || this.pages.children.length <= this.perPage) {
            return;
        }
        this._timer = setInterval(() => this.next(), this.interval * 1000);
    }

    stop() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
    }

    renderView() {
        const { children } = this.pages;
        const end = this.currentIndex + this.perPage;
        this.domNode.style.setProperty('--carousel-index', this.currentIndex);
        this.prevControl.toggleClass('hidden', this.currentIndex === 0);
        this.nextControl.toggleClass('hidden', end >= children.length);
        this.trigger('change', this.currentIndex);
    }

    addPage(pageOptions) {
        pageOptions = pageOptions || {};
        const id = pageOptions.id || `page-${this.pages.children.length}`;
        if (this.getPage(id)) {
            console.error('Page already exists with id:', id);
            return;
        }
        let page;
        if (pageOptions.componentClass) {
            page = new pageOptions.componentClass({
                ...pageOptions.componentOptions,
                parentNode: this.track,
                componentClassname: 'carousel-page'
            });
        }
        else if (pageOptions.element) {
            this.track.appendChild(pageOptions.element);
            page = MegaComponent.fromNode(pageOptions.element);
            page.addClass('carousel-page');
        }
        else {
            console.error('Missing page options');
            return;
        }
        page.carouselId = id;
        this.pages.addChild(id, page);
        this.renderView();
        return id;
    }

    clear() {
        if (!this.pages || !this.pages.children || !this.pages.children.length) {
            return;
        }
        this.pages.each(page => page.destroy());
        this.pages = new MegaComponentGroup();
        this.currentIndex = 0;
        this.renderView();
    }

    destroy() {
        this.stop();
        super.destroy();
    }

    updatePage(id, updateOptions) {
        const child = this.getPage(id);
        if (child && typeof child.update === 'function') {
            child.update(updateOptions);
        }
    }

    getPage(id) {
        return this.pages.getChild(id);
    }

    get perPage() {
        return this._perPage;
    }

    set perPage(value) {
        this._perPage = value > 0 ? value : 1;
        this.domNode.style.setProperty('--carousel-per-page', this._perPage);
        if (this.track) {
            this.currentIndex = Math.min(this.currentIndex, this.maxIdx);
            this.renderView();
        }
    }

    get maxIdx() {
        return Math.max(0, this.pages.children.length - this.perPage);
    }

    goTo(id) {
        const page = this.getPage(id);
        if (!page) {
            return;
        }
        const index = this.pages.children.indexOf(page);
        this.currentIndex = Math.min(index, this.maxIdx);
        this.renderView();
    }

    next() {
        this.currentIndex = this.currentIndex >= this.maxIdx ? 0 : this.currentIndex + 1;
        this.renderView();
    }

    prev() {
        this.currentIndex = this.currentIndex <= 0 ? this.maxIdx : this.currentIndex - 1;
        this.renderView();
    }
}
