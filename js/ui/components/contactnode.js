class MegaContactNode extends MegaNodeComponent {

    constructor(options) {
        super(options);

        this.addClass('user');
        this.removeClass('folder', 'file');

        const avatar = document.createElement('div');
        avatar.className = `avatar ${options.smallAvatar ? 'small' : ''}`;
        this.iconNode.parentNode.replaceChild(avatar, this.iconNode);
        this.iconNode = avatar;
        this.fetchAvatar().catch(dump);

        if (this.node.m) {
            const email = document.createElement('span');
            email.className = 'email';
            email.textContent = this.node.m;

            const propsNode = this.domNode.querySelector('.mobile.props');
            propsNode.textContent = '';
            propsNode.appendChild(email);
        }
    }

    get name() {
        return M.getNameByHandle(this.node.h);
    }

    get icon() {
        return '';
    }

    get size() {
        return null;
    }

    get subNodeCount() {
        return null;
    }

    get shared() {
        return null;
    }

    get fileType() {
        return null;
    }

    get lbl() {
        return null;
    }

    get fav() {
        return false;
    }

    get sen() {
        return false;
    }

    get time() {
        return null;
    }

    get versioned() {
        return null;
    }

    get takedown() {
        return null;
    }

    get rights() {
        return false;
    }

    async fetchAvatar() {
        if (!this.contact) {
            return;
        }

        useravatar.loadAvatar(this.handle).always(() => {
            const avatarMeta = generateAvatarMeta(this.handle);

            const shortNameEl = mCreateElement('span');
            shortNameEl.textContent = avatarMeta.shortName;

            const avatar = avatarMeta.avatarUrl
                ? mCreateElement('img', {src: avatarMeta.avatarUrl})
                : mCreateElement('div', {class: `color${avatarMeta.color}`},[shortNameEl]);

            this.iconNode.textContent = '';
            this.iconNode.appendChild(avatar);
        });
    }

    update(type) {
        const _shouldUpdate = key => !type || type === key;
        if (_shouldUpdate('name')) {
            super.update('name');
        }
        if (_shouldUpdate('icon')) {
            this.fetchAvatar().catch(dump);
        }
    }
}
