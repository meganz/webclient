class MegaMobileEmptyState extends MegaMobileOverlay {
    show(container) {
        if (container) {
            container.classList.add('hidden');
        }

        const state = MegaMobileEmptyState.states();

        super.show({
            name: 'empty-state',
            showClose: false,
            icon: state.icon,
            contents: [state.contents]
        });

        this.domNode.classList.remove('hidden');
        this.addTitle(state.title);
    }

    hide(container) {
        this.domNode.classList.add('hidden');

        if (container) {
            container.classList.remove('hidden');
        }
    }

    addTitle(title) {
        this.clearTitle();
        const subNode = document.createElement('h2');
        subNode.textContent = title;
        this.titleNode.appendChild(subNode);
    }

    static init() {
        if (!mega.ui.emptyState) {
            mega.ui.emptyState = new MegaMobileEmptyState({
                parentNode: document.getElementById('file-manager-content-block'),
                componentClassname: 'mega-empty-states',
                wrapperClassname: 'empty-states'
            });
        }
        else if (!document.contains(mega.ui.emptyState.domNode)) {
            const fmBlock = document.getElementById('file-manager-content-block');
            fmBlock.appendChild(mega.ui.emptyState.domNode);
        }
    }
}

MegaMobileEmptyState.states = () => {
    'use strict';

    let state;

    if (pfcol) {
        state = 9;
    }
    else if (folderlink) {
        state = 8;
    }
    else {
        switch (M.currentdirid) {
            case M.RootID:
                state = 0;
                break;
            case 'shares':
                state = 2;
                if (mobile.nodeSelector.active) {
                    // move / copy incoming shares root folder page
                    state = 6;
                }
                break;
            case 'out-shares':
                state = 3;
                break;
            case 'public-links':
                state = 4;
                break;
            case M.RubbishID:
                state = 5;
                break;
            default: {
                state = 1; // sub folder page

                if (mobile.nodeSelector.active && M.currentrootid === 'shares') {
                    // move / copy incoming shares sub folder page
                    state = 7;
                }
            }
        }
    }

    return [
        {
            title: l.cloud_drive_empty_title,
            contents: l.cloud_drive_empty,
            icon: 'cloud-drive'
        },
        {
            title: l.folder_empty_title,
            contents: l.folder_empty,
            icon: 'folder'
        },
        {
            title: l.incoming_shares_empty_title,
            contents: l.incoming_shares_empty,
            icon: 'incoming-shares'
        },
        {
            title: l.outgoing_shares_empty_title,
            contents: l.outgoing_shares_empty,
            icon: 'outgoing-shares'
        },
        {
            title: l.shared_links_empty_title,
            contents: l.shared_links_empty,
            icon: 'shared-links'
        },
        {
            title: l.rubbish_bin_empty_title,
            contents: l.rubbish_bin_empty,
            icon: 'rubbish-bin'
        },
        {
            title: l.shared_folder_empty_move_copy_title,
            contents: l.shared_folder_empty_move_copy,
            icon: 'folder'
        },
        {
            title: l.folder_empty_title,
            contents: '',
            icon: 'folder'
        },
        {
            title: l.folder_empty_title,
            contents: l.shared_folder_empty,
            icon: 'folder'
        },
        {
            title: '',
            contents: mega.icu.format(l.album_items_count, 0),
            icon: 'folder'
        }
    ][state];
};
