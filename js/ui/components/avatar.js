class MegaAvatarComponent extends MegaLazyRenderComponent {
    constructor(options) {
        assertUserHandle(options.userHandle);
        assert(M.getUserByHandle(options.userHandle), `Invalid user/handle, ${options.userHandle}`);
        super(options);
        this.userHandle = options.userHandle;
        this.presence = options.presence;
        this.simpletip = options.simpletip;

        this.addClass('avatar');
        if (this.simpletip) {
            this.addClass('simpletip');
            this.domNode.dataset.simpletip = l[5533];
        }
        if (MegaAvatarComponent.SIZES[options.size]) {
            this.addClass(MegaAvatarComponent.SIZES[options.size]);
        }
        const icon = document.createElement('i');
        icon.className = 'sk-elm left-icon';
        this.domNode.appendChild(icon);
    }

    async doRender() {
        if (this.avatarPromise) {
            return this.avatarPromise;
        }
        this.avatarPromise = useravatar.loadAvatar(this.userHandle).catch(nop);

        await this.avatarPromise;
        delete this.avatarPromise;
        const avatarMeta = generateAvatarMeta(this.userHandle);
        if (this.lastMeta) {
            let different = avatarMeta.avatarUrl !== this.lastMeta.avatarUrl;
            different = different || avatarMeta.shortName !== this.lastMeta.shortName;
            different = different || avatarMeta.color !== this.lastMeta.color;
            this.lastMeta = avatarMeta;
            if (!different) {
                return this.update();
            }
        }
        this.lastMeta = avatarMeta;

        const shortNameEl = mCreateElement('span');
        shortNameEl.textContent = avatarMeta.shortName;

        const avatar = avatarMeta.avatarUrl
            ? mCreateElement('img', {src: avatarMeta.avatarUrl})
            : mCreateElement('div', {class: `color${avatarMeta.color}`},[shortNameEl]);

        this.domNode.textContent = '';
        this.domNode.appendChild(avatar);

        this.update();
    }

    update() {
        if (this.presence) {
            const presence = this.getSubNode('activity-status', 'i');
            const p = M.getUserByHandle(this.userHandle).presence;
            /**
             * Presence values without requiring megaChat/presence to be loaded.
             * @see UserPresence.PRESENCE
             * */
            if (p === 1) {
                presence.className = 'activity-status online';
            }
            else if (p === 2) {
                presence.className = 'activity-status away';
            }
            else if (p === 3) {
                presence.className = 'activity-status online';
            }
            else if (p === 4) {
                presence.className = 'activity-status busy';
            }
            else {
                presence.className = 'activity-status black';
            }
        }

        if (!this.lastMeta) {
            return;
        }
        if (this.simpletip && this.lastMeta.fullName) {
            this.domNode.dataset.simpletip = this.lastMeta.fullName;
        }
    }
}
MegaAvatarComponent.SIZES = freeze({
    '16': 'size-16',
    '24': 'size-24',
});
