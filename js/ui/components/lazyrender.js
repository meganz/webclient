class MegaLazyRenderComponent extends MegaComponent {
    constructor(options) {
        options.skLoading = true;
        super(options);

        this._toRender = true;
        MegaLazyRenderComponent.observer.observe(this.domNode);
    }

    destroy() {
        super.destroy();
        MegaLazyRenderComponent.observer.unobserve(this.domNode);
    }

    /**
     * Implement this to display the loaded state when this becomes visible.
     * Perform any needed data fetches when this is called ideally not before.
     *
     * @returns {Promise<*>} async
     */
    async doRender() {
        throw new Error('Not implemented');
    }
}

/**
 * @property {IntersectionObserver} MegaLazyRenderComponent.observer
 */
lazy(MegaLazyRenderComponent, 'observer', () => {
    'use strict';

    return new IntersectionObserver((entries) => {
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const { component } = entry.target;
            if (component instanceof MegaLazyRenderComponent) {
                const isVisible = !(entry.intersectionRatio < 0.2 && !entry.isIntersecting);
                if (isVisible && component._toRender) {
                    MegaLazyRenderComponent.observer.unobserve(entry.target);
                    component.doRender().then(() => {
                        component.skLoading = false;
                    }).catch(reportError);
                    delete component._toRender;
                }
            }
        }
    }, {
        threshold: 0.1,
    });
});
