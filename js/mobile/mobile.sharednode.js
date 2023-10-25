class MegaMobileSharedNode extends MegaMobileNode {

    constructor(options) {
        super(options);
        this.domNode.classList.add('shares');
        const propsNode = this.domNode.querySelector('.mobile.props');

        const ownerNode = document.createElement('div');
        ownerNode.className = 'shared-owner';

        ownerNode.textContent = l.shared_by.replace('[X]', this.userName);

        propsNode.prepend(ownerNode);
        propsNode.querySelector('.mobile.num-files').classList.add('hidden');

        // access rights for incoming shares
        const permNode = document.createElement('div');
        permNode.className = `fm-node perm-node ${this.accessRightDetails[3]}`;

        const icon = document.createElement('i');
        icon.className = `sprite-fm-mono ${this.accessRightDetails[2]}`;

        const rights = document.createElement('span');
        rights.textContent = this.accessRightDetails[0];

        permNode.append(icon, rights);
        this.domNode.append(permNode);

        M.syncUsersFullname(this.userHandle).then(() => {
            ownerNode.textContent = l.shared_by.replace('[X]', this.userName);
        }).catch(dump);
    }

    get userHandle() {
        return this.node.su || this.node.p;
    }

    get userName() {
        return M.getNameByHandle(this.userHandle);
    }

    get accessRightDetails() {
        return MegaMobileSharedNode.accessRights[this.node.r];
    }
}

// [Text, Classname, Icon, Colour]
mBroadcaster.once('fm:initialized', () => {
    'use strict';

    MegaMobileSharedNode.accessRights = [
        [l[55], 'read-only', 'icon-read-only', 'grey'],
        [l[56], 'read-and-write', 'icon-permissions-write', 'blue'],
        [l[57], 'full-access', 'icon-star', 'green'],
    ];
});
