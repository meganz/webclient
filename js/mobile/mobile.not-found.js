/**
 * Code to show the file or folder not found page when the link was taken down
 */
mobile.notFound = {

    /**
     * @param {String} e Invalid link message
     *
     * @returns {void}
     */
    show(e) {
        'use strict';

        // necessary for navigation between folder link and cloud or account pages
        this.reset();
        const contentNode = document.createElement('div');
        contentNode.className = 'no-content';

        const [title, icon, items, text] = this.getErrorMessage(e, contentNode);

        // Build contentNode
        if (text) {
            const textNode = document.createElement('p');
            textNode.append(parseHTML(text));
            contentNode.append(textNode);
        }

        if (items && items.length > 0) {
            const listContainer = document.createElement('ul');

            for (let i = items.length; i--;) {
                const list = document.createElement('li');
                list.textContent = items[i];

                listContainer.appendChild(list);
            }

            contentNode.append(listContainer);
        }

        // Build wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'file-folder-view main-content';

        const elem = document.createElement('i');
        elem.className = `no-access ${icon || ''}`;

        wrapper.append(elem);

        const subNode = document.createElement('h2');
        subNode.textContent = title;
        wrapper.append(subNode, contentNode);

        document.getElementById('startholder').append(wrapper);

        // Set System default theme or any previously selected
        mega.ui.setTheme();
    },

    getErrorMessage(e, contentNode) {

        'use strict';

        const message = typeof e === 'string' && e || '';

        let title, icon, items, text;

        const error = parseInt(e);
        const _setGeneralError = () => {
            icon = 'icon sprite-mobile-fm-mono icon-alert-circle-thin-outline';
            title = l.no_file_longer_available_title;
            items = [l[248], l[247], l[246]];
            text = l[244];
        };
        const _setCenterClass = () => {
            contentNode.className += ' folder-file';
        };

        if (dlid) {

            if (!dlkey && !message && error !== EBLOCKED && error !== ENOENT) {
                _setGeneralError();
            }
            else if (error === ETOOMANY) {
                title = l.no_file_longer_available_title;
                icon = 'icon sprite-mobile-fm-mono icon-alert-circle-thin-outline';
                text = l[731];
            }
            else if (error === ETEMPUNAVAIL) {
                title = l.no_file_temporary_available_title;
                icon = 'icon sprite-mobile-fm-mono icon-alert-circle-thin-outline';
                text = l[253];
                _setCenterClass();
            }
            else if (error === EEXPIRED) {
                title = l.no_file_access_title;
                icon = 'no-access-file';
                text = l.no_file_access_msg;
                _setCenterClass();
            }
            else {
                _setGeneralError();
            }
        }
        else if (error === EARGS) {
            _setGeneralError();
            title = l[20199];
        }
        else if (pfid) {
            // On public links show 'The link you are trying to view is no longer available.'
            folderlink = 1; // Trigger FM load home.
            icon = (pfcol) ? 'no-access-album' : 'no-access-folder' ;

            if (pfcol) {
                title = l.album_broken_link_title;
                contentNode.textContent = message || l.album_broken_link_text;
            }
            else {
                title = l.no_folder_access_title;
                contentNode.textContent = message || l.no_folder_access_msg;
            }

            _setCenterClass();
        }

        return [title, icon, items, text];
    },

    reset() {
        'use strict';

        M.currentdirid = undefined;

        MegaMobileHeader.init(true);
        MegaMobileBanner.init();
        mobile.appBanner.updateBanner('');
    }
};
