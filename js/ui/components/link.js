class MegaLink extends MegaInteractable {

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
        MegaLink.bindEvent.call(this);
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
        MegaLink.bindEvent.call(this);
    }
}

MegaLink.bindEvent = function() {
    'use strict';

    this.native = !!this.target || /^(https?:\/\/)/i.test(this.href);

    if (this.native) {
        this.off('click');
        return;
    }

    this.on('click', async e => {
        if (this.disabled
            || is_mobile && mega.ui.viewerOverlay.confirmDiscard && !await mega.ui.viewerOverlay.confirmDiscard()) {
            return false;
        }

        e.preventDefault();

        if (window.textEditorVisible) {
            mega.textEditorUI.doClose();
        }

        this.trigger('beforeRedirect');

        if (isStaticPage(this.href)) {
            return mega.redirect('mega.io', this.href, false, false, false);
        }

        /* Handle redirection internally */
        if (this.href.startsWith('/fm/')) {
            M.openFolder(this.href.slice(4));
        }
        else {
            loadSubPage(this.href);
        }
    });
};
