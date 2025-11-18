lazy(mega.ui, 'empty', () => {
    'use strict';

    const path = `${staticpath}images/mega/empty/`;
    const defaultTarget = '.fm-right-files-block';

    const clear = (target = document.querySelector(defaultTarget)) => {
        if (pfid || M.currentrootid === M.RubbishID) {
            const emptyArr = [
                '.fm-empty-folder',
                '.fm-empty-search'
            ];

            const c = M.currentdirid;
            if (typeof c === 'string' && !c.includes('/')) {
                emptyArr.push(`.fm-empty-${c}`);
            }

            $(emptyArr.join(',')).addClass('hidden');
        }

        const existing = target && target.querySelector('.empty-state');

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

        if (M.onMediaView) {
            // Empty state handled from Gallery
            return;
        }
        if (pfid || M.currentrootid === M.RubbishID) {
            // Keeping old empty states for folderlinks and Rubbish folders
            $('.fm-empty-folder', '.fm-right-files-block').removeClass('hidden');
            return;
        }

        const imgDiv = mCreateElement('div', { class: 'bg-no-repeat bg-center bg-contain h-full w-full' });
        imgDiv.style.backgroundImage = `url(${img})`;

        const titleEl = mCreateElement('h3', { class: 'pt-6 font-title-h2-bold text-color-high my-0' });
        titleEl.textContent = title;

        const hint = mCreateElement('div', { class: 'py-6 text-color-medium' });
        hint.textContent = l.empty_cloud_hint;

        const btnRow = mCreateElement('div', { class: 'pb-6 mx-auto'});

        const dropArea = mCreateElement(
            'div',
            { class: 'drop-area flex-1 flex flex-column text-center border-drop pt-6 justify-center' },
            [
                mCreateElement('div', { class: 'flex-1 max-h-48' }, [imgDiv]),
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

        const container = mCreateElement('div', { class: 'empty-state flex-1 flex flex-column' }, [
            dropContainer,
            importArea
        ]);

        $(container).rebind('contextmenu.fm', (e) => {
            onIdle(() => {
                M.contextMenuUI(e, 2);
            });
        });

        target.appendChild(container);
    };

    return {
        clear,
        root: showEmptyCloud.bind(null, l.empty_cloud_title, `${path}empty-cloud.webp`),
        folder: showEmptyCloud.bind(null, l.empty_folder_title, `${path}empty-folder.webp`),
        /**
         * @param {HTMLElement} [target] DOM node to attach to
         * @param {0|1|2} view Whether Recents are disabled (0), Empty (0) or Filtered->Empty (1)
         * @returns {void}
         */
        recents: (target = document.querySelector(defaultTarget), view = 0) => {
            clear(target);

            const strings = {
                hint: l.recents_disabled_hint,
                src: `${path}disabled-recents.webp`,
                title: l.recent_activity_hidden
            };

            if (view === 2) {
                target.classList.add('empty-filter');
                strings.src = `${path}empty-recents-filter.webp`;
                strings.title = l.recents_filter_empty_title;
                strings.hint = l.recents_filter_empty_txt;
            }
            else {
                target.classList.add('emptied');
                if (view === 1) {
                    strings.src = `${path}empty-recents.webp`;
                    strings.hint = l.recents_empty_hint;
                    strings.title = l[20152];
                }
            }

            const img = mCreateElement('div', { class: 'bg-no-repeat bg-center bg-contain h-full w-full max-h-60' });
            img.style.backgroundImage = `url(${strings.src})`;

            const title = mCreateElement('h3', { class: 'pt-6 font-title-h2-bold text-color-high my-0' });
            title.textContent = strings.title;

            const hint = mCreateElement('div', { class: 'pt-4 text-color-medium' });
            hint.textContent = strings.hint;

            const btn = mCreateElement('div', { class: 'pt-6' });

            if (!view) {
                MegaButton.factory({
                    parentNode: btn,
                    text: l.show_activity,
                    componentClassname: 'cursor-pointer',
                    onClick: () => {
                        M.recentsRender._setConfigShow(1);
                    }
                });
            }
            else if (view === 1) {
                MegaButton.factory({
                    parentNode: btn,
                    text: l[372],
                    componentClassname: 'cursor-pointer',
                    icon: 'sprite-fm-mono icon-upload',
                    iconSize: 24,
                    onClick: (ev) => {
                        M.contextMenuUI(ev, 9);
                    }
                });
            }

            target.appendChild(
                mCreateElement(
                    'div',
                    { class: 'empty-state flex-1 flex flex-column text-center justify-center' },
                    [
                        img,
                        title,
                        hint,
                        btn
                    ]
                )
            );
        }
    };
});
