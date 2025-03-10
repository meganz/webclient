class MegaContactNode extends MegaNodeComponent {

    constructor(options) {
        super(options);

        this.addClass('user');
        this.removeClass('folder', 'file');

        const avatar = document.createElement('div');
        avatar.className = `avatar ${options.smallAvatar ? 'small' : ''}`;
        this.iconNode.parentNode.replaceChild(avatar, this.iconNode);
        this.iconNode = avatar;
        MegaNodeComponent.mAvatarNode(this.handle, this.iconNode);

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

    update(type) {
        const _shouldUpdate = key => !type || type === key;
        if (_shouldUpdate('name')) {
            super.update('name');
        }
        if (_shouldUpdate('icon')) {
            MegaNodeComponent.mAvatarNode(this.handle, this.iconNode);
        }
    }
}
