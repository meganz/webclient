class MegaMobileLink extends MegaMobileTappable {

    constructor(options) {

        options.nodeType = 'a';
        super(options);

        const targetNode = this.domNode;

        targetNode.classList.add('link');

        this.href = options.href || false;
        this.target = options.target || false;
    }

    set target(target) {
        if (!target) {
            this.domNode.removeAttribute('target');
            return;
        }

        this.domNode.target = target;
        MegaMobileLink.bindEvent.call(this);
    }

    get target() {
        return this.domNode.target;
    }

    get href() {
        // JS appends the current hostname/protocol to
        // this.domNode.href, so we get the attr explicitly.
        return this.domNode.getAttribute('href');
    }

    set href(url) {
        if (!url) {
            this.domNode.removeAttribute('href');
            return;
        }

        this.domNode.href = url;
        MegaMobileLink.bindEvent.call(this);
    }
}

MegaMobileLink.bindEvent = function() {
    'use strict';

    this.native = !!this.target || /^(https?:\/\/)/i.test(this.href);

    if (this.native) {
        this.off('tap');
        return;
    }

    this.on('tap', () => {
        if (this.disabled) {
            return false;
        }

        this.trigger('beforeRedirect');

        if (isStaticPage(this.href)) {
            return mega.redirect('mega.io', this.href, false, false, false);
        }

        /* Handle redirection internally */
        onIdle(() => loadSubPage(this.href));
    });
};
