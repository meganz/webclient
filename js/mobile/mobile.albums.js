lazy(mega.gallery, 'albums', () => {
    'use strict';

    const defaultPerRow = 3;
    const maxItemWidth = 195;

    let headNodes; // Nodes to base month/year header on
    let handleIds = Object.create(null);
    let isCoverSpecified = false;
    let rows = [];
    let timelineWidth = 0;
    let itemWidth = 0;
    let perRow = defaultPerRow;

    let container = null;
    let dynamicList = null;

    let { innerWidth: winWidth, innerHeight: winHeight } = window;

    const months = [
        l[408], l[409], l[410], l[411], l[412], l[413],
        l[414], l[415], l[416], l[417], l[418], l[419]
    ];

    const getMonthKey = (n) => {
        const date = new Date(n.mtime * 1000);
        return `${date.getFullYear()}-${date.getMonth()}`;
    };

    const resetItemWidth = () => {
        timelineWidth = winWidth; // 1px margin on each side
        perRow = Math.floor(timelineWidth / maxItemWidth);

        if (perRow < defaultPerRow) {
            perRow = defaultPerRow;
        }

        itemWidth = timelineWidth / perRow - 2; // 1px margin around the cell
        container.style.setProperty('--cell-size', `${itemWidth}px`);
    };

    const resetRows = () => {
        const { length } = M.v;
        rows = [[M.v[0]]];
        headNodes = Object.create(null);
        headNodes[M.v[0].h] = true;

        let lastMonthKey = getMonthKey(M.v[0]);
        let i = 0;

        while (++i < length) {
            const n = M.v[i];

            const currentRow = rows[rows.length - 1];
            const monthKey = getMonthKey(n);

            if (monthKey !== lastMonthKey) {
                rows.push([n]);
                headNodes[n.h] = true;
                lastMonthKey = monthKey;
            }
            else if (currentRow.length >= perRow) {
                rows.push([n]);
            }
            else {
                currentRow.push(n);
            }
        }
    };

    const onResize = () => {
        if (winWidth === window.innerWidth && winHeight === window.innerHeight) {
            return;
        }

        const { length } = rows;

        winWidth = window.innerWidth;
        winHeight = window.innerHeight;

        resetItemWidth();
        resetRows();

        const { length: newLength } = rows;

        if (newLength > length) {
            dynamicList.batchAdd(Array.from({ length: newLength - length }, (_, i) => i + length));
        }
        else if (newLength < length) {
            let i = length;

            while (--i >= newLength) {
                dynamicList.remove(i);
            }
        }

        let i = newLength;

        while (--i >= 0) {
            dynamicList.itemChanged(i);
        }
    };

    const itemHeightCallback = rowIndex => (headNodes[rows[rowIndex][0].h])
        ? itemWidth + 64 // Top margin, sync with .row-has-date element's margin
        : itemWidth;

    const itemRenderFunction = (key) => {
        const megaRender = M.megaRender;

        if (!megaRender) {
            if (d) {
                console.warn('Ignoring invalid Album MegaRender state..', aHandle);
            }

            return false;
        }

        megaRender.numInsertedDOMNodes++;

        const row = mCreateElement('div', { class: 'flex flex-row' });
        const nodeHandles = rows[key].map(({ h }) => h);

        let i = -1;

        while (++i < nodeHandles.length) {
            const h = nodeHandles[i];
            const n = M.d[h];

            if (!n) {
                if (d) {
                    console.warn("Album renderNode was called with aHandle '%s' which was not found in M.d", h);
                }
                return false;
            }

            const nodeEl = megaRender.getDOMNode(h);

            if (!nodeEl) {
                if (d) {
                    console.warn('getDOMNode failed in Album render..', h);
                }

                return false;
            }

            const checkIcon = nodeEl.querySelector(':scope > i.selected');

            if (checkIcon) {
                nodeEl.removeChild(checkIcon);
            }

            if (M.isGalleryVideo(n)) {
                nodeEl.classList.add('show-video-duration', 'relative');
                nodeEl.dataset.videoDuration = secondsToTimeShort(MediaAttribute(n).data.playtime);
            }

            if (headNodes[h]) {
                const date = new Date(n.mtime * 1000);
                row.classList.add(
                    'mt-16', // This margin is synced with itemHeightCallback
                    'row-has-date',
                    'relative'
                );
                row.dataset.month = months[date.getMonth()];
                row.dataset.year = date.getFullYear();
            }

            row.appendChild(nodeEl);

            M.d[h].seen = true;
        }

        return row;
    };

    return {
        grid: null,
        store: {},
        tree: null,
        disposeAll: nop,
        initPublicAlbum: (parentNode) => {
            const { length } = M.v;

            eventlog(500840, JSON.stringify({ c: length }));

            if (!length) {
                return; // Empty page is handled in mobile.empty.state.js
            }

            const { at, e } = M.d[M.RootID];
            const setAttr = tryCatch(() => tlvstore.decrypt(at, true, base64_to_a32(pfkey)))();

            if (!setAttr) {
                if (d) {
                    console.error('Could not fetch public set data...', e, at);
                }

                loadSubPage('login');
                return;
            }

            container = parentNode[0];

            resetItemWidth();

            const counts = [0, 0]; // 0 - imgCount, 1 - vidCount
            isCoverSpecified = !!setAttr.c;

            let firstImgIndex = Infinity;
            let coverNode = null;

            const sort = M.sortByModTimeFn3();
            M.v.sort((a, b) => sort(a, b, -1));

            let i = length;

            if (isCoverSpecified) {
                handleIds = (e || []).reduce((obj, { h, id }) => Object.assign(obj, { [h]: id }), {});
            }

            while (--i >= 0) {
                const n = M.v[i];
                const isVideo = !!M.isGalleryVideo(n);
                counts[isVideo & 1]++;

                if (isCoverSpecified && !coverNode && handleIds[n.h] === setAttr.c) {
                    coverNode = n;
                }

                if (!isVideo) {
                    firstImgIndex = i;
                }
            }

            resetRows();

            if (!coverNode) {
                coverNode = M.v[0];
            }

            const coverContainer = mCreateElement(
                'div',
                { class: 'grid grid-cols-2 grid-sm-col' },
                container
            );

            const imgContainer = mCreateElement(
                'div',
                { class: 'shimmer pfcol-cover w-full relative' },
                coverContainer
            );
            const nameContainer = mCreateElement('div', { class: 'flex-1 px-6 pt-6' }, coverContainer);
            const nameEl = mCreateElement('div', { class: 'album-title my-4 text-ellipsis-2' }, nameContainer);
            const countEl = mCreateElement('div', { class: 'text-color-medium' }, nameContainer);
            const slideshowBtnContainer = mCreateElement(
                'div',
                { class: 'absolute bottom-2 right-2 bg-surface-grey-1 rounded' },
                imgContainer
            );

            let countsTxt = '';

            if (counts[0]) {
                countsTxt = mega.icu.format(l.photos_count_img, counts[0]);

                new MegaButton({
                    parentNode: slideshowBtnContainer,
                    type: 'icon',
                    icon: 'sprite-fm-mono icon-play-square scale-75',
                    iconSize: 24,
                    componentClassname: 'text-icon'
                }).on('tap.playSlideshow', () => {
                    slideshow(M.v[firstImgIndex]);
                    $('.media-viewer-container footer .v-btn.slideshow').trigger('click');
                });
            }

            if (counts[1]) {
                countsTxt += `${countsTxt ? ', ' : ''}${mega.icu.format(l.photos_count_vid, counts[1])}`;
            }

            nameEl.textContent = setAttr.n;
            countEl.textContent = countsTxt;

            api_getfileattr(
                { [coverNode.h]: coverNode },
                0,
                async(ctx, key, ab) => {
                    if (ab === 0xDEAD || !ab.byteLength) {
                        dump('Cannot generate the cover...');
                        return;
                    }

                    // const blob = await webgl.getDynamicThumbnail(ab, { ats: 1 }).catch(dump);
                    const src = tryCatch(() => mObjectURL([ab], ab.type || 'image/jpeg'))();

                    if (!src) {
                        dump('Cannot generate the cover image...');
                        return;
                    }

                    imgContainer.classList.remove('shimmer');

                    mCreateElement('img', { class: 'w-full h-full object-cover', src }, imgContainer);
                }
            );

            dynamicList = new MegaDynamicList(container, {
                contentContainerClasses: 'album-content-list pb-20',
                itemRenderFunction,
                itemHeightCallback,
                onNodeInjected: delay.bind(null, 'thumbnails', fm_thumbnails, 2),
                onResize: delay.bind(null, 'album-link-resize', onResize, 250),
                viewPortBuffer: 350,
                perfectScrollOptions: {
                    handlers: ['touch'],
                    minScrollbarLength: 50
                }
            });

            dynamicList.batchAdd([...rows.keys()]);
            dynamicList.initialRender();
        }
    };
});

lazy(mega.gallery, 'MegaAlbumNode', () => {
    'use strict';

    class MegaAlbumNode extends MegaNodeComponent {

        constructor(options) {
            super(options);

            this.domNode.classList.remove('fm-item');
            this.domNode.classList.add('album-item');
        }
    }

    return MegaAlbumNode;
});
