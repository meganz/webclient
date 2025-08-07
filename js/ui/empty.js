lazy(mega.ui, 'empty', () => {
    'use strict';

    const defaultTarget = '.fm-right-files-block';

    const clear = (target = document.querySelector(defaultTarget)) => {
        if (pfid || M.currentrootid === M.RubbishID) {
            const emptyArr = [
                '.fm-empty-folder',
                '.fm-empty-search',
            ];

            if (!M.currentdirid.includes('/')) {
                emptyArr.push(`.fm-empty-${M.currentdirid}`);
            }

            $(emptyArr.join(',')).addClass('hidden');
        }

        const existing = target.querySelector('.empty-state');

        if (existing) {
            target.removeChild(existing);
        }
    };

    /**
     * @param {String} title Title of the empty state
     * @param {String} img Path to the image
     * @param {HTMLElement} [target] DOM node to attach to
     * @returns {void}
     */
    const showEmptyCloud = (title, img, target = document.querySelector(defaultTarget)) => {
        clear(target);

        if (pfid || M.currentrootid === M.RubbishID) {
            $('.fm-empty-folder').removeClass('hidden');
            return;
        }

        const imgDiv = mCreateElement('div', { class: 'bg-no-repeat bg-center bg-contain h-full w-full max-h-48' });
        imgDiv.style.backgroundImage = `url(${img})`;

        const titleEl = mCreateElement('h3', { class: 'pt-6 font-title-h2-bold text-color-high my-0' });
        titleEl.textContent = title;

        const hint = mCreateElement('div', { class: 'py-6 text-color-medium' });
        hint.textContent = l.empty_cloud_hint;

        const btnRow = mCreateElement('div', { class: 'pb-6 mx-auto'});

        const dropArea = mCreateElement(
            'div',
            { class: 'drop-area flex-1 flex flex-column text-center border-drop pt-6' },
            [
                mCreateElement('div', { class: 'flex-1 flex flex-row items-center' }, [imgDiv]),
                titleEl,
                hint,
                btnRow
            ]
        );
        const dropContainer = mCreateElement('div', { class: 'flex-1 py-2 px-6 flex flex-column' }, [dropArea]);
        const importArea = mCreateElement('div', { class: 'pb-6' });

        MegaButton.factory({
            parentNode: btnRow,
            text: l[372],
            componentClassname: 'block secondary cursor-pointer',
            rightIcon: 'sprite-fm-mono icon-arrow-down',
            rightIconSize: 24,
            onClick: (ev) => {
                eventlog(500922);
                M.contextMenuUI(ev, 9);
            }
        });

        target.appendChild(
            mCreateElement('div', { class: 'empty-state flex-1 flex flex-column' }, [
                dropContainer,
                importArea
            ])
        );
    };

    const path = `${staticpath}images/mega/empty/`;

    return {
        root: showEmptyCloud.bind(null, l.empty_cloud_title, path + 'empty-cloud.webp'),
        folder: showEmptyCloud.bind(null, l.empty_folder_title, path + 'empty-folder.webp'),
        clear
    };
});
