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
        if (this.eventLog) {
            this.on('click.eventLog', () => eventlog(this.eventLog));
        }
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

        const result = await this.trigger('beforeRedirect');

        if (result === false) {
            return;
        }

        if (isStaticPage(this.href)) {
            return mega.redirect('mega.io', this.href, false, false, false);
        }

        /* Handle redirection internally */
        if (!pfid && this.href.startsWith('/fm/')) {
            M.openFolder(this.href.slice(4));
        }
        else if (pfcol && this.href.startsWith('/collection/')){
            M.openFolder(this.href.slice(12));
        }
        else if (pfid && this.href.startsWith('/folder/')) {
            M.openFolder(this.href.slice(8));
        }
        else {
            loadSubPage(this.href);
        }
    });

    this.on('auxclick', e => {

        if (e.which === 2) {

            if (isStaticPage(this.href)) {
                mega.redirect('mega.io', this.href, false, false, false);
            }

            window.open(this.href, '_blank', 'noopener,noreferrer');

            return false;
        }
    });
};
