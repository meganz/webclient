class GalleryNodeBlock {
    constructor(node) {
        this.node = node;
        this.el = document.createElement('a');
        this.el.className = 'data-block-view';
        this.el.id = node.h;

        this.spanEl = document.createElement('span');
        this.spanEl.className = 'data-block-bg content-visibility-auto';
        this.el.appendChild(this.spanEl);

        this.el.nodeBlock = this;
        this.isRendered = false;

        this.isVideo = mega.gallery.isVideo(this.node);
    }

    setThumb(dataUrl) {
        this.spanEl.classList.add('thumb');
        this.thumb.src = dataUrl;

        if (this.el.nextSibling && this.el.nextSibling.classList.contains('gallery-block-bg-wrap')) {
            this.el.nextSibling.querySelector('img').src = dataUrl;
        }

        mega.gallery.unsetShimmering(this.el);

        if (this.thumb) {
            this.thumb.classList.remove('w-full');
        }
    }

    fill(mode) {
        this.el.setAttribute('title', this.node.name);

        const spanMedia = document.createElement('span');
        this.spanEl.appendChild(spanMedia);
        spanMedia.className = 'block-view-file-type';
        this.thumb = document.createElement('img');
        spanMedia.appendChild(this.thumb);

        if (this.isVideo) {
            spanMedia.classList.add('video');
            this.spanEl.classList.add('video');

            const div = document.createElement('div');
            div.className = 'video-thumb-details';
            this.spanEl.appendChild(div);

            const spanTime = document.createElement('span');
            spanTime.textContent = secondsToTimeShort(MediaAttribute(this.node).data.playtime);
            div.appendChild(spanTime);
        }
        else {
            spanMedia.classList.add('image');
        }

        const spanFav = document.createElement('span');
        spanFav.className = 'data-block-fav-icon sprite-fm-mono icon-favourite-filled';
        this.spanEl.appendChild(spanFav);

        if (mode === 'm' || mode === 'y') {
            this.el.dataset.ts = this.node.mtime || this.node.ts;
            this.el.dataset.date = GalleryNodeBlock.getTimeString(
                this.node.mtime || this.node.ts,
                mode === 'y' ? 14 : 15
            );
        }

        this.isRendered = true;
    }
}

GalleryNodeBlock.dateKeyCache = Object.create(null);
GalleryNodeBlock.maxGroupChunkSize = 60; // Max number of nodes per chunk
GalleryNodeBlock.thumbCacheSize = 500; // Number of images per cache at any given point
GalleryNodeBlock.allowsTransparent = { WEBP: 1, PNG: 1, GIF: 1 }; // Ideally, sync it with js/mega.js

GalleryNodeBlock.revokeThumb = (h) => {
    'use strict';

    if (!GalleryNodeBlock.thumbCache) {
        return;
    }

    const keys = Object.keys(GalleryNodeBlock.thumbCache);

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        if (M.d[h] && M.d[h].fa && key.startsWith(M.d[h].fa)) {
            URL.revokeObjectURL(GalleryNodeBlock.thumbCache[key]);
            delete GalleryNodeBlock.thumbCache[key];
        }
    }
};

GalleryNodeBlock.getTimeString = (key, format) => {
    'use strict';

    const cacheKey = `${key}-${format}`;

    if (!GalleryNodeBlock.dateKeyCache[cacheKey]) {
        GalleryNodeBlock.dateKeyCache[cacheKey] = time2date(key, format);
    }

    return GalleryNodeBlock.dateKeyCache[cacheKey];
};

class MegaGallery {
    constructor(id) {
        this.id = id || M.currentdirid;
        this.isDiscovery = !!id;
        this.groups = {y: {}, m: {}, d: {}, a: {}};
        this.scrollPosCache = {y: 0, m: 0, d: 0, a: 0};
        this.lastAddedKeys = {};
        this.galleryBlock = document.getElementById('gallery-view');
        this.contentRowTemplateNode = document.getElementById('gallery-cr-template');
        this.updNode = {};
        this.type = mega.gallery.sections[id] ? 'basic' : 'discovery';
        this.shouldProcessScroll = true;
        this.inPreview = false;

        this.clearRenderCache();
        this.setObserver();
    }

    get onpage() {
        return this.id === M.currentCustomView.nodeID || M.gallery;
    }

    setObserver() {
        this.nodeBlockObserver = typeof IntersectionObserver === 'undefined'
            ? null
            : new IntersectionObserver(
                (entries) => MegaGallery.handleIntersect(entries, this),
                {
                    root: this.galleryBlock,
                    rootMargin: '1000px',
                    threshold: 0.1
                }
            );

        this.blockSizeObserver = typeof ResizeObserver === 'undefined'
            ? null
            : new ResizeObserver((entries) => MegaGallery.handleResize(entries));
    }

    dropDynamicList() {
        if (this.dynamicList) {
            this.dynamicList.destroy();
            this.dynamicList = false;
        }
    }

    clearRenderCache(key) {
        if (key) {
            if (this.renderCache[key]) {
                delete this.renderCache[key];
            }
        }
        else {
            this.renderCache = Object.create(null);
            MegaGallery.revokeThumbs();
        }
    }

    static sortViewNodes() {
        const sortFn = M.sortByModTimeFn2();
        M.v.sort((a, b) => sortFn(a, b, -1));
    }

    static getCameraHandles() {
        if (!M.CameraId) {
            return [];
        }

        const cameraTree = M.getTreeHandles(M.CameraId);

        if (M.SecondCameraId) {
            cameraTree.push(...M.getTreeHandles(M.SecondCameraId));
        }

        return cameraTree;
    }

    setMode(type, pushHistory, changeRootMode) {

        if (type !== 'a' && type !== 'y' && type !== 'm' && type !== 'd') {

            console.error('MegaGallery: Entered mode is not valid, fallback to type `a`');

            return;
        }

        if (this.dynamicList) {
            this.throttledOnScroll();
        }

        this.mode = type;
        this.galleryBlock.classList.remove('gallery-type-a', 'gallery-type-y', 'gallery-type-m', 'gallery-type-d');
        this.galleryBlock.classList.add(`gallery-type-${type}`);

        if (changeRootMode === true
            && mega.gallery.sections[M.currentdirid]
            && mega.gallery.rootMode[mega.gallery.sections[M.currentdirid].root]
        ) {
            mega.gallery.rootMode[mega.gallery.sections[M.currentdirid].root] = this.mode;
        }

        if (type === 'a') {
            this.setZoom(this.zoom || 2);
        }
        else {
            delete this.zoom;
        }

        $('.gallery-tab-lnk').removeClass('active');
        $(`.gallery-tab-lnk-${this.mode}`).addClass('active');

        this.dropDynamicList();

        if (pfid) {
            pushHistoryState(true, Object.assign({}, history.state, {galleryMode: this.mode}));
        }
        else if (pushHistory === 2) {
            pushHistoryState(true, {subpage: page, galleryMode: this.mode});
        }
        else if (pushHistory === 1) {
            pushHistoryState(page, {galleryMode: this.mode});
        }
    }

    findMiddleImage() {
        const $blockViews = $(".MegaDynamicList .data-block-view", this.galleryBlock);
        const contentOffset = this.dynamicList.$content.offset();
        const listContainerHeight = this.dynamicList.$listContainer.height();

        let $middleBlock = null;
        let minDistance = 1e6;

        const scrollTop = this.dynamicList.getScrollTop();

        for (const v of $blockViews) {
            const $v = $(v);

            if ($v.offset().left < contentOffset.left + 5) {
                const {blockSize, blockTop} = this.getBlockTop($v.attr('id'));
                const middle = blockTop + blockSize / 2 - scrollTop;
                const distance = Math.abs(listContainerHeight / 2 - middle);

                if (distance < minDistance) {
                    minDistance = distance;
                    $middleBlock = $v;
                }
            }

        }

        return $middleBlock;
    }

    setZoom(type) {

        const min = 1;
        const max = 4;

        if (typeof type !== 'number' || type < min || type > max) {

            console.error('MegaGallery: None supporting zoom level provided.');

            return;
        }

        if (this.mode !== 'a') {

            console.error('MegaGallery: Zoom is only support on all view.');

            return;
        }

        this.zoom = type;

        for (let i = min; i < max + 1; i++) {
            this.galleryBlock.classList.remove(`zoom-${i}`);
        }

        this.galleryBlock.classList.add(`zoom-${type}`);

        const zoomInBtn = this.galleryBlock.querySelector('.zoom-in');
        const zoomOutBtn = this.galleryBlock.querySelector('.zoom-out');

        zoomInBtn.classList.remove('disabled');
        zoomOutBtn.classList.remove('disabled');

        if (this.zoom === min) {
            zoomInBtn.classList.add('disabled');
        }
        else if (this.zoom === max) {
            zoomOutBtn.classList.add('disabled');
        }
    }

    setGroup(n) {
        const res = this.getGroup(n);

        this.setYearGroup(res[1], n.h);
        this.setMonthGroup(res[2], res[3]);
        this.setDayGroup(res[3], n.h);
        this.setAllGroup(res[2], n.h);

        return res;
    }

    getGroup(n) {
        const timestamp = n.mtime || n.ts || Date.now() / 1000;
        const time = new Date(timestamp * 1000);

        const year = time.getFullYear();
        const month = time.getMonth();
        const day = time.getDate();

        return [
            timestamp,
            parseInt(new Date(year, 0, 1) / 1000),
            parseInt(new Date(year, month, 1) / 1000),
            parseInt(new Date(year, month, day) / 1000),
        ];
    }

    setYearGroup(key, h) {

        this.groups.y[key] = this.groups.y[key] || {c: 0, n: []};
        this.groups.y[key].c++;

        if (this.groups.y[key].n.length < 1) {
            this.groups.y[key].n.push(h);
        }
    }

    // For mega dynamic list, every 2 years should be merged as 1 group.
    mergeYearGroup() {
        const yearKeys = Object.keys(this.groups.y);
        const newStructure = {};

        for (let i = yearKeys.length - 1; i > -1; i -= 2) {
            newStructure[yearKeys[i]] = {c: [this.groups.y[yearKeys[i]].c], n: [this.groups.y[yearKeys[i]].n[0]]};

            if (this.groups.y[yearKeys[i - 1]]) {

                newStructure[yearKeys[i]].sy = yearKeys[i - 1];
                newStructure[yearKeys[i]].c.push(this.groups.y[yearKeys[i - 1]].c);
                newStructure[yearKeys[i]].n.push(this.groups.y[yearKeys[i - 1]].n[0]);
            }
        }

        this.groups.y = newStructure;
    }

    splitYearGroup() {

        const yearGroups = Object.keys(this.groups.y);
        const splitedYearGroup = {};

        for (var i = yearGroups.length; i--;) {

            splitedYearGroup[yearGroups[i]] = {
                c: this.groups.y[yearGroups[i]].c[0],
                n: [this.groups.y[yearGroups[i]].n[0]]
            };

            if (this.groups.y[yearGroups[i]].sy) {

                splitedYearGroup[this.groups.y[yearGroups[i]].sy] = {
                    c: this.groups.y[yearGroups[i]].c[1],
                    n: [this.groups.y[yearGroups[i]].n[1]]
                };
            }
        }

        this.groups.y = splitedYearGroup;
    }

    addToYearGroup(n, ts) {
        const sts = `${ts}`;

        const group = this.groups.y[ts];

        // This is existing year in view, nice.
        if (group) {
            group.c[0]++;

            let timeDiff = this.nodes[n.h] - this.nodes[group.n[0]];

            // Falling back to names sorting, if times are the same
            if (!timeDiff) {
                const sortedArr = [n, M.d[group.n[0]]];
                sortedArr.sort(this.sortByMtime.bind(this));

                if (sortedArr[0].h !== group.n[0]) {
                    timeDiff = 1;
                }
            }

            if (timeDiff > 0) {
                group.n[0] = n.h;

                this.clearRenderCache(`y${ts}`);

                if (this.mode === 'y' && this.dynamicList) {
                    this.throttledListChange(sts);
                }
            }
        }
        else {
            // This is secondary year of existing year in the view, good.
            const groupKeys = Object.keys(this.groups.y);

            for (var i = groupKeys.length; i--;) {
                const stsGroup = this.groups.y[groupKeys[i]];

                if (stsGroup.sy === sts) {
                    stsGroup.c[1]++;

                    let timeDiff = this.nodes[n.h] - this.nodes[stsGroup.n[1]];

                    if (!timeDiff) {
                        const sortedArr = [n, M.d[stsGroup.n[1]]];
                        sortedArr.sort(this.sortByMtime.bind(this));

                        if (sortedArr[0].h !== stsGroup.n[0]) {
                            timeDiff = 1;
                        }
                    }

                    if (timeDiff > 0) {
                        stsGroup.n[1] = n.h;

                        this.clearRenderCache(`y${groupKeys[i]}`);

                        if (this.dynamicList && this.mode === 'y') {
                            this.throttledListChange(`${groupKeys[i]}`);
                        }
                    }

                    return;
                }
            }

            // Damn this is new year we need to build whole year view again as it requires to push year after this
            this.splitYearGroup();
            this.setYearGroup(ts, n.h);
            this.mergeYearGroup();

            if (this.onpage && this.mode === 'y') {
                this.resetAndRender();
            }
            else {
                for (let i = 0; i < groupKeys.length; i++) {
                    this.clearRenderCache(`y${groupKeys[i]}`);
                }
            }
        }
    }

    removeFromYearGroup(h, ts) {
        const sts = `${ts}`;
        let removeGroup = false;

        // This is existing year in view, nice.
        if (this.groups.y[ts]) {

            if (--this.groups.y[ts].c[0] === 0) {
                removeGroup = true;
            }
            else if (h === this.groups.y[ts].n[0]) {
                this.groups.y[ts].n[0] = this.findYearCover(ts);

                this.clearRenderCache(`y${ts}`);
                this.throttledListChange(sts);
            }
        }
        else {

            // This is probably secondary year of existing year in the view, let's check.
            const yearGroups = Object.keys(this.groups.y);

            for (var i = yearGroups.length; i--;) {

                if (parseInt(this.groups.y[yearGroups[i]].sy) === ts && --this.groups.y[yearGroups[i]].c[1] === 0) {
                    removeGroup = true;
                    break;
                }
                else if (h === this.groups.y[yearGroups[i]].n[1]) {
                    this.groups.y[yearGroups[i]].n[1] = this.findYearCover(ts);
                    this.clearRenderCache(`y${yearGroups[i]}`);
                    this.throttledListChange(yearGroups[i]);
                }
            }
        }

        // Damn this is delete an year from view we need to build year view again.
        if (removeGroup) {
            this.splitYearGroup();
            delete this.groups.y[ts];
            this.mergeYearGroup();

            if (this.onpage) {
                this.resetAndRender();
            }
        }
    }

    findYearCover(ts) {
        const keys = Object.keys(this.groups.a);
        const {start, end} = calculateCalendar('y', ts);
        let m = 0;
        let s = "";
        for (const k of keys) {
            const f = parseFloat(k);
            const n = Math.round(f);
            if (start <= n && n <= end && f > m) {
                m = f;
                s = k;
            }
        }

        if (this.groups.a[s] && this.groups.a[s].n.length > 0) {
            return this.groups.a[s].n[0];
        }

        return null;

    }

    rebuildDayGroup(ts) {
        delete this.groups.d[ts];
        delete this.groups.d[ts - 0.5];
        this.clearRenderCache(`d${ts}`);
        this.clearRenderCache(`d${ts - 0.5}`);

        const {start, end} = calculateCalendar('d', ts);
        const keys = Object.keys(this.nodes);
        for (const h of keys) {
            const n = M.d[h];

            if (!n) {
                continue;
            }

            const timestamp = n.mtime || n.ts;
            if (start <= timestamp && timestamp <= end) {
                const res = this.getGroup(n);
                this.setDayGroup(res[3], n.h);
            }
        }
    }

    rebuildMonthGroup(ts) {
        delete this.groups.m[ts];
        const {start, end} = calculateCalendar('m', ts);
        const keys = Object.keys(this.nodes);
        for (const h of keys) {
            const n = M.d[h];

            if (!n) {
                continue;
            }

            const timestamp = n.mtime || n.ts;
            if (start <= timestamp && timestamp <= end) {
                const res = this.getGroup(n);
                this.setMonthGroup(ts, res[3]);
            }
        }
        this.filterOneMonthGroup(ts);
    }

    setMonthGroup(key, dayTs) {

        this.groups.m[key] = this.groups.m[key] ||
            {
                l: GalleryNodeBlock.getTimeString(key, 3),
                ml: GalleryNodeBlock.getTimeString(key, 13),
                c: 0,
                n: [],
                dts: {},
                ldts: 0
            };
        this.groups.m[key].c++;
        this.groups.m[key].dts[dayTs] = 1;
        this.groups.m[key].ldts = Math.max(this.groups.m[key].ldts, dayTs);
    }

    filterOneMonthGroup(ts) {
        const dayKeys = Object.keys(this.groups.m[ts].dts);

        dayKeys.sort((a, b) => b - a);

        this.groups.m[ts].n = dayKeys.slice(0, 4).map(k => this.groups.d[k].n[0]);
        this.groups.m[ts].dts = {};
    }

    filterMonthGroup() {
        const monthKeys = Object.keys(this.groups.m).sort((a, b) => b - a);
        let triEvenCount = 0;

        for (let i = 0; i < monthKeys.length; i++) {
            const dayKeys = Object.keys(this.groups.m[monthKeys[i]].dts);

            dayKeys.sort((a, b) => b - a);

            const max = i % 3 === 2 ? 4 : 3;

            this.groups.m[monthKeys[i]].n = dayKeys.slice(0, 4).map(k => this.groups.d[k].n[0]);
            this.groups.m[monthKeys[i]].max = max;

            const count = Math.min(max, this.groups.m[monthKeys[i]].n.length);

            if (count === 3) {
                this.groups.m[monthKeys[i]].r = triEvenCount++ % 2 === 1;
            }
            else if (count === 1 && this.groups.d[dayKeys[0]].n.length > 1) {
                this.groups.m[monthKeys[i]].extn = this.groups.d[dayKeys[0]].n[1];
            }

            this.groups.m[monthKeys[i]].dts = {};
        }
    }

    updateMonthMaxAndOrder() {
        const monthKeys = Object.keys(this.groups.m).sort((a, b) => b - a);
        let triEvenCount = 0;

        for (let i = 0; i < monthKeys.length; i++) {

            const max = i % 3 === 2 ? 4 : 3;

            this.groups.m[monthKeys[i]].max = max;

            delete this.groups.m[monthKeys[i]].r;

            const count = Math.min(max, this.groups.m[monthKeys[i]].n.length);

            if (count === 3) {
                this.groups.m[monthKeys[i]].r = triEvenCount++ % 2 === 1;
            }
        }
    }

    // This function is rely on result from day group processing.
    // Therefore, day group has to be processed before execute this function.
    addToMonthGroup(n, ts, dts) {
        const group = this.groups.m[ts];
        const sts = `${ts}`;

        // This is a node for existing group
        if (group) {
            const compareGroup = clone(group);

            group.c++;

            let sameDayNode = false;
            let sameDayNodeIndex;

            for (var i = 0; i < group.n.length; i++) {

                if (calculateCalendar('d', this.nodes[group.n[i]]).start === dts) {
                    sameDayNode = group.n[i];
                    sameDayNodeIndex = i;
                    break;
                }
            }

            if (sameDayNode) {
                let timeDiff = this.nodes[n.h] > this.nodes[sameDayNode];

                if (!timeDiff) {
                    const sortedArr = [n, M.d[sameDayNode]];
                    sortedArr.sort(this.sortByMtime.bind(this));

                    if (sortedArr[0].h !== group.n[0]) {
                        timeDiff = 1;
                    }
                }

                if (timeDiff > 0) {
                    group.n.splice(sameDayNodeIndex, 1, n.h);
                }

                // This is only one day month
                if (group.n.length === 1 && this.groups.d[dts].n.length > 1) {
                    this.groups.d[dts].n.sort((a, b) => this.nodes[b] - this.nodes[a]);
                    group.extn = this.groups.d[dts].n[1];
                }
            }
            else {
                delete group.extn;

                group.n.push(n.h);
                group.n.sort((a, b) => this.nodes[b] - this.nodes[a]);
                group.n = group.n.slice(0, 4);
            }

            this.clearRenderCache(`m${ts}`);
            this.updateMonthMaxAndOrder();

            if (this.dynamicList && this.mode === 'm' && (group.extn !== compareGroup.extn ||
                !group.n.every(h => compareGroup.n.includes(h)))) {
                this.throttledListChange(sts);
            }
        }
        // This is a node for new group
        else {
            this.groups.m[ts] = {
                c: 1,
                dts: {},
                l: GalleryNodeBlock.getTimeString(ts, 3),
                ldts: dts,
                ml: GalleryNodeBlock.getTimeString(ts, 13),
                n: [n.h]
            };

            this.updateMonthMaxAndOrder();

            if (this.dynamicList && this.mode === 'm') {

                const mts = Object.keys(this.groups.m);

                mts.sort((a, b) => b - a);

                this.dynamicList.insert(mts[mts.indexOf(sts) - 1], sts, this.onpage);
            }
        }
    }

    // This function is rely on result from day group processing.
    // Therefore, day group has to be processed before execute this function.
    removeFromMonthGroup(h, ts, dts) {

        let group = this.groups.m[ts];

        if (!group) {
            return;
        }

        const compareGroup = clone(group);
        const sts = `${ts}`;

        const _setExtraNode = dts => {

            if (this.groups.d[dts] && this.groups.d[dts].n.length > 1) {

                group.extn = this.groups.d[dts].n[1];
                return group.extn;
            }
        };

        group.c--;

        // The node was last node for the group lets delete whole group
        if (group.c === 0) {

            delete this.groups.m[ts];

            this.updateMonthMaxAndOrder();
            this.clearRenderCache(`m${ts}`);

            if (this.mode === 'm' && this.dynamicList) {
                this.dynamicList.remove(sts, this.onpage);
            }

        }
        // The node is extra node for single day month block, lets remove extra node or update it.
        else if (group.extn === h) {

            if (!_setExtraNode(dts)) {
                delete group.extn;
            }
            this.clearRenderCache(`m${ts}`);
            this.throttledListChange(sts);
        }
        else {

            this.rebuildMonthGroup(ts);
            this.updateMonthMaxAndOrder();

            group = this.groups.m[ts];

            if (group.n.length === 1) {
                _setExtraNode(calculateCalendar('d', this.nodes[group.n[0]]).start);
            }

            if (group.extn !== compareGroup.extn ||
                !compareGroup.n.every(h => group.n.includes(h))) {
                this.clearRenderCache(`m${ts}`);
                this.throttledListChange(sts);
            }
        }
    }

    setDayGroup(key, h) {

        this.groups.d[key] = this.groups.d[key] || {l: GalleryNodeBlock.getTimeString(key, 2), c: 0, n: []};
        this.groups.d[key].c++;

        if (this.groups.d[key].c <= 5) {
            this.groups.d[key].n.push(h);
            this.groups.d[key].n.sort(this.sortByMtime.bind(this));

            if (this.groups.d[key].n.length === 5) {
                const itemsToMove = this.groups.d[key].n.splice(2, 3);
                this.groups.d[key - 0.5] = {l: '', c: 0, mc: 0,  n: [...itemsToMove]};
            }
        }
        else {
            this.groups.d[key - 0.5].mc++;
        }
    }

    addToDayGroup(n, ts) {

        // If the day block has more than 4 items, we do not need to update layout but possibly just change nodes list
        if (this.groups.d[ts] && this.groups.d[ts].c > 4) {

            const dayGroup1 = this.groups.d[ts];
            const dayGroup2 = this.groups.d[ts - 0.5];

            dayGroup1.c++;
            dayGroup2.mc++;

            const nodeGroup = [...dayGroup1.n, ...dayGroup2.n];
            const compareGroup = new Set([...dayGroup1.n, ...dayGroup2.n]);

            nodeGroup.push(n.h);
            nodeGroup.sort(this.sortByMtime.bind(this));
            nodeGroup.pop();

            // Ends up same group we do not need to update anything
            if (nodeGroup.every(node => compareGroup.has(node))) {
                return;
            }

            dayGroup1.n = nodeGroup.splice(0, 2);
            dayGroup2.n = nodeGroup;
        }
        // If the day block has less than 5 just run normal setDayGroup to update existing layout.
        else {
            this.setDayGroup(ts, n.h);
        }

        if (this.dynamicList && this.mode === 'd') {
            const sts1 = `${ts}`;
            const sts2 = `${ts - 0.5}`;

            if (this.groups.d[ts].c === 1) {

                const keys = Object.keys(this.groups.d).sort((a, b) => b - a);

                this.dynamicList.insert(keys[keys.indexOf(sts1) - 1], sts1, this.onpage);
            }
            else if (this.groups.d[ts].c === 5) {

                this.clearRenderCache(`d${ts - 0.5}`);
                this.clearRenderCache(`d${ts}`);

                this.throttledListChange(sts1);
                this.dynamicList.insert(sts1, sts2, this.onpage);
            }
            else if (this.groups.d[ts].c > 5) {

                this.clearRenderCache(`d${ts - 0.5}`);
                this.clearRenderCache(`d${ts}`);

                this.throttledListChange(sts1);
                this.throttledListChange(sts2);
            }
            else {
                this.clearRenderCache(`d${ts}`);
                this.throttledListChange(sts1);
            }
        }
        else {
            this.clearRenderCache(`d${ts}`);
        }
    }

    removeFromDayGroup(h, ts) {
        const stsArr = [`${ts}`, `${ts - 0.5}`]; // sts keys of groups to remove

        this.rebuildDayGroup(ts);

        for (let i = 0; i < stsArr.length; i++) {
            const sts = stsArr[i];

            if (this.groups.d[sts]) {
                this.throttledListChange(sts);
            }
            else if (this.mode === 'd' && this.dynamicList && this.dynamicList.items.includes(sts)) {
                this.dynamicList.remove(sts, this.onpage);
            }
        }
    }

    // lets Chunk block by 60 to optimise performance of dom rendering
    setGroupChunk(ts) {
        let key = '';
        let timeLabel = '';

        if (!this.lastAddedKeys[ts]) {
            key = ts.toFixed(5);
            this.lastAddedKeys[ts] = key;
            timeLabel = GalleryNodeBlock.getTimeString(ts, 3);
        }
        else if (this.groups.a[this.lastAddedKeys[ts]]
            && this.groups.a[this.lastAddedKeys[ts]].n.length >= GalleryNodeBlock.maxGroupChunkSize) {
            key = (parseFloat(this.lastAddedKeys[ts]) - 0.00001).toFixed(5);
            this.lastAddedKeys[ts] = key;
        }
        else {
            key = this.lastAddedKeys[ts];
        }

        if (!this.groups.a[key]) {
            this.groups.a[key] = {l: timeLabel, c: 0, n: []};
        }

        return key;
    }

    setAllGroup(ts, h) {
        // Keep this one first, as setGroupChunk creates an initial chunk as well
        const key = this.setGroupChunk(ts);

        this.groups.a[ts.toFixed(5)].c++;

        this.groups.a[key].n.push(h);
        return key;
    }


    flatTargetAllGroup(ts) {

        ts = ts.toFixed(5);

        // if there is no beginning group, no point to do heavy lifting
        if (!this.groups.a[ts]) {
            return [];
        }

        const nodes = [];
        const groupKeys = Object.keys(this.groups.a);

        groupKeys.sort().reverse();

        for (let i = 0; i < groupKeys.length; i++) {

            const ceiledKey = Math.ceil(groupKeys[i]).toFixed(5);

            if (ceiledKey === ts) {
                nodes.push(...this.groups.a[groupKeys[i]].n);

                delete this.groups.a[groupKeys[i]];
                this.clearRenderCache(`a${groupKeys[i]}`);
            }
            else if (ceiledKey < ts) {
                break;
            }
        }

        this.lastAddedKeys = {};

        return nodes;
    }

    addToAllGroup(n, ts) {
        const flatNodes = this.flatTargetAllGroup(ts);

        flatNodes.push(n.h);
        flatNodes.sort(this.sortByMtime.bind(this));

        // Even only single node added, it can cause multiple group updated
        const reGrouped = {};

        flatNodes.forEach(h => {
            reGrouped[this.setAllGroup(ts, h)] = 1;
        });

        let reGroupedCount = Object.keys(reGrouped).length;

        if (this.dynamicList && this.mode === 'a') {

            const {items} = this.dynamicList;

            for (let i = 0; i < items.length; i++) {

                if (reGrouped[items[i]]) {

                    delete reGrouped[items[i]];
                    reGroupedCount--;

                    if (this.onpage) {
                        this.clearRenderCache(`y${items[i]}`);
                        this.throttledListChange(items[i]);
                    }

                    if (!reGroupedCount) {
                        break;
                    }
                }
            }

            // Adding new group
            if (reGroupedCount) {

                // New group can only one at a time
                const leftover = Object.keys(reGrouped)[0];
                let after;

                // If there is no nodes or there is node but it is earlier ts than first node place node at beginning
                if (!items[0] || items[0] - leftover < 0) {
                    after = 0;
                }
                // Else find suitable place to place new group.
                else {
                    after = items.find((item, i) => (items[i + 1] || 0) - leftover < 0);
                }

                this.dynamicList.insert(after, leftover, this.onpage);
            }
        }
    }

    removeFromAllGroup(h, ts) {
        if (M.d[h] && M.d[h].fa) {
            GalleryNodeBlock.revokeThumb(h);
        }

        const flatNodes = this.flatTargetAllGroup(ts).filter(nh => nh !== h);

        const reGrouped = {};

        flatNodes.forEach(nh => {
            reGrouped[this.setAllGroup(ts, nh)] = 1;
        });

        if (this.dynamicList && this.mode === 'a') {

            if (flatNodes.length === 0) {
                this.dynamicList.remove(ts.toFixed(5), this.onpage);

                return;
            }

            let last;

            this.dynamicList.items.forEach(group => {

                if (reGrouped[group]) {

                    last = group;

                    if (this.onpage) {
                        this.throttledListChange(group);
                    }
                }
            });

            // Clear empty group if exist.
            const leftover = (last - 0.00001).toFixed(5);

            if (this.dynamicList.items.includes(leftover)) {
                this.dynamicList.remove(leftover, this.onpage);
            }
        }
    }

    async addNodeToGroups(n) {
        if (n.fv) {
            return;
        }

        this.updNode[n.h] = n;

        const updatedGroup = this.getGroup(n);

        this.nodes[n.h] = updatedGroup[0];

        if (!M.d[n.h]) {
            await dbfetch.get(n.h);
        }

        if (!this.dynamicList && this.onpage) {
            this.initDynamicList();
            this.dynamicList.initialRender();
        }

        // Do not change order, some function here is rely on result from another
        // This order should be keep this way in order to process data in order.
        this.addToAllGroup(n, updatedGroup[2]);
        this.addToDayGroup(n, updatedGroup[3]);
        this.addToMonthGroup(n, updatedGroup[2], updatedGroup[3]);
        this.addToYearGroup(n, updatedGroup[1]);

        if (this.dynamicList && this.onpage) {
            M.v = Object.keys(this.nodes).map(h => M.d[h] || this.updNode[h]);
        }

        MegaGallery.sortViewNodes();

        delete this.updNode[n.h];

        this.throttledResize();
    }

    removeNodeFromGroups(n) {
        if (!this.nodes[n.h]) {
            return; // The node has been removed already
        }

        const updatedGroup = this.getGroup(n);

        delete this.nodes[n.h];

        // Do not change order, some function here is rely on result from another
        // This order should be keep this way in order to process data in order.
        this.removeFromAllGroup(n.h, updatedGroup[2]);
        this.removeFromDayGroup(n.h, updatedGroup[3]);
        this.removeFromMonthGroup(n.h, updatedGroup[2], updatedGroup[3]);
        this.removeFromYearGroup(n.h, updatedGroup[1]);

        if (this.dynamicList && M.currentCustomView.original === this.id) {
            M.v = Object.keys(this.nodes).map(h => M.d[h] || this.updNode[h]);
        }

        MegaGallery.sortViewNodes();

        if (this.dynamicList && M.v.length === 0) {
            this.dropDynamicList();
            this.galleryBlock.classList.add('hidden');

            mega.gallery.showEmpty(M.currentdirid);
        }
    }

    // Special operation for d action packet which may lost node data already when reaching here
    removeNodeByHandle(h) {
        if (!this.nodes[h]) {
            return;
        }

        if (M.d[h]) {
            this.removeNodeFromGroups(M.d[h]);
        }
        else {
            this.removeNodeFromGroups({ h, mtime: this.nodes[h] });
        }
    }

    // Update dom node names if changed
    updateNodeName(n) {

        const group = this.getGroup(n);
        const rcKeys = Object.keys(this.renderCache);

        for (let i = rcKeys.length; i--;) {

            if (rcKeys[i].startsWith(`y${group[1]}`) || rcKeys[i].startsWith(`m${group[2]}`) ||
                rcKeys[i].startsWith(`d${group[3]}`) || rcKeys[i].startsWith(`a${group[2]}`)) {

                const domNode = this.renderCache[rcKeys[i]].querySelector(`[id="${n.h}"]`);

                if (domNode && domNode.title !== n.name) {
                    domNode.title = n.name;
                }
            }
        }
    }

    initDynamicList() {
        const container = document.querySelector('.gallery-view-scrolling');
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        this.slideShowCloseLister = mBroadcaster.addListener('slideshow:close', () => {
            delay('galleryCloseSlideShow', () => {
                this.inPreview = false;
            });
        });

        $('.fm-right-files-block').removeClass('emptied');
        $(`.fm-empty-${this.isDiscovery ? 'discovery' : this.id}`).addClass('hidden');
        this.galleryBlock.classList.remove('hidden');

        if (this.mode === 'a') {
            this.galleryBlock.classList.add(`zoom-${this.zoom}`);
        }

        this.dynamicList = new MegaDynamicList(container, {
            'contentContainerClasses': 'content',
            'itemRenderFunction': this.renderGroup.bind(this),
            'itemHeightCallback': this.getGroupHeight.bind(this),
            'onResize': this.throttledResize.bind(this),
            'onScroll': this.throttledOnScroll.bind(this),
            'perfectScrollOptions': {
                'handlers': ['click-rail', 'drag-thumb', 'wheel', 'touch'],
                'minScrollbarLength': 20
            }
        });

        M.initShortcutsAndSelection(container);
    }

    render(rewriteModeByRoot, reset) {
        if (rewriteModeByRoot !== false && mega.gallery.sections[M.currentdirid]) {
            const modeResetIsNeeded = reset === true
                && M.currentdirid === mega.gallery.sections[M.currentdirid].root
                && (
                    M.currentdirid === M.previousdirid
                    ||
                        mega.gallery.sections[M.previousdirid]
                        && mega.gallery.sections[M.previousdirid].root === mega.gallery.sections[M.currentdirid].root

                );

            if (modeResetIsNeeded) {
                this.setMode('a', 2, true);
            }
            else if (mega.gallery.rootMode[mega.gallery.sections[M.currentdirid].root]
                && this.mode !== mega.gallery.rootMode[mega.gallery.sections[M.currentdirid].root]) {
                this.setMode(mega.gallery.rootMode[mega.gallery.sections[M.currentdirid].root], 2);
            }
        }

        const rfBlock = $('.fm-right-files-block', '.fmholder');
        const galleryHeader = $('.gallery-tabs-bl', rfBlock);

        galleryHeader.removeClass('hidden');
        $('.gallery-section-tabs', galleryHeader).toggleClass('hidden', M.currentdirid === 'favourites');
        rfBlock.removeClass('hidden');
        $('.files-grid-view.fm, .fm-blocks-view.fm, .fm-right-header, .fm-empty-section', rfBlock).addClass('hidden');
        $('.fm-files-view-icon').removeClass('active').filter('.media-view').addClass('active');

        if (pfid && !M.v) {
            $('.fm-empty-section', rfBlock).removeClass('hidden');
        }

        if (window.selectionManager) {
            window.selectionManager.hideSelectionBar();
        }

        if (!mega.gallery.viewBtns) {
            const viewBtns = $('.fm-header-buttons .view-links', rfBlock);
            mega.gallery.viewBtns = viewBtns.clone(true);
            galleryHeader.append(mega.gallery.viewBtns);
            $('.view-links', galleryHeader).toggleClass('hidden', M.isGalleryPage());
        }

        if (M.v.length > 0) {
            if (mega.gallery.emptyBlock) {
                mega.gallery.emptyBlock.hide();
            }

            this.initDynamicList();

            const keys = Object.keys(this.activeModeList).sort((a, b) => b - a);

            this.dynamicList.batchAdd(keys);
            this.dynamicList.initialRender();
            this.dynamicList.scrollToYPosition(this.scrollPosCache[this.mode].a);
        }
        else {
            mega.gallery.showEmpty(M.currentdirid);
            this.galleryBlock.classList.add('hidden');
        }
        galleryHeader.toggleClass('invisible', !M.v.length &&
            (this.id === 'photos' || this.id === 'images' || this.id === 'videos'));
    }

    resetAndRender() {
        if (this.dynamicList && M.currentCustomView.original === this.id) {
            M.v = Object.keys(this.nodes).map(h => M.d[h] || this.updNode[h]);
        }

        MegaGallery.sortViewNodes();

        this.clearRenderCache();
        this.dropDynamicList();

        this.render();
    }

    bindEvents() {

        const $galleryBlock = $(this.galleryBlock);

        $galleryBlock.rebind('click.galleryView', '.data-block-view', e => {

            const $eTarget = $(e.currentTarget);
            const h = $eTarget.attr('id');

            selectionManager.clear_selection();
            selectionManager.add_to_selection(h);

            $.hideContextMenu(e);

            return false;
        });

        $galleryBlock.rebind('contextmenu.galleryView', '.data-block-view', e => {

            if (this.mode !== 'a') {
                return false;
            }

            $.hideContextMenu(e);
            selectionManager.resetTo(e.currentTarget.id);
            M.contextMenuUI(e, 1);
        });

        $galleryBlock.rebind('click.galleryView', '.gallery-date-block', e => {

            const $eTarget = $(e.currentTarget);
            let targetTs = $eTarget.parent().attr('id').replace('gallery-', '');

            targetTs = this.groups.m[targetTs].ldts;

            this.setMode('d', 1, true);
            this.render();

            onIdle(() => {
                this.dynamicList.scrollToItem(targetTs);
                this.throttledOnScroll();
            });

            return false;
        });

        $galleryBlock.rebind('click.galleryViewClear', () => {
            selectionManager.clear_selection();
        });

        $galleryBlock.rebind('dblclick.galleryView', '.data-block-view', e => {

            const $eTarget = $(e.currentTarget);

            if (this.mode === 'a') {
                const h = $eTarget.attr('id');
                const n = M.d[h] || {};

                if (e.currentTarget.nodeBlock.isVideo) {
                    if (!e.currentTarget.nodeBlock.isVideo.isPreviewable || !MediaAttribute.getMediaType(n)) {
                        M.addDownload([h]);
                        return;
                    }

                    $.autoplay = h;
                }

                this.inPreview = true;
                slideshow(h, false);
            }
            else {
                let clickedDate = this.mode === 'd' ?
                    $eTarget.closest('.content-row').attr('id').replace('gallery-', '') : $eTarget.attr('data-ts');

                clickedDate = calculateCalendar(this.mode === 'm' ? 'd' : 'm', Math.ceil(clickedDate)).start;

                this.setMode(this.mode === 'd' ? 'a' : this.mode === 'm' ? 'd' : 'm', 1, true);
                this.render();

                onIdle(() => {

                    if (this.mode === 'a') {

                        const handle = e.currentTarget.id;

                        clickedDate = clickedDate.toFixed(5);

                        while (this.groups.a[clickedDate]) {

                            if (this.groups.a[clickedDate].n.includes(handle)) {
                                break;
                            }

                            clickedDate = (clickedDate - 0.00001).toFixed(5);
                        }

                        this.dynamicList.scrollToItem(clickedDate);

                        const scrollTarget = document.getElementById(e.currentTarget.id);

                        if (scrollTarget) {
                            const nodeOffset = this.dynamicList.listContainer.scrollTop + scrollTarget.offsetTop - 8;
                            this.dynamicList.scrollToYPosition(nodeOffset);
                        }
                    }
                    else {
                        this.dynamicList.scrollToItem(clickedDate);
                    }

                    this.throttledOnScroll();
                });
            }
        });

        $('.gallery-tab-lnk').rebind('click', e => {

            if (this.mode === e.currentTarget.attributes['data-folder'].value) {

                this.dynamicList.scrollToYPosition(0);
                this.throttledOnScroll();

                return false;
            }

            this.setMode(e.currentTarget.attributes['data-folder'].value, 1, true);
            this.render(false);
        });

        $('.gallery-view-zoom-control > button', this.galleryBlock).rebind('click.galleryZoom', e => {
            e.stopPropagation();

            $.hideContextMenu(e);

            if (!this.$middleBlock) {
                this.$middleBlock = this.findMiddleImage();
            }

            if (e.currentTarget.classList.contains('disabled')) {
                return false;
            }
            else if (e.currentTarget.classList.contains('zoom-in')) {
                this.setZoom(this.zoom - 1);
            }
            else if (e.currentTarget.classList.contains('zoom-out')) {
                this.setZoom(this.zoom + 1);
            }

            this.dynamicList.itemRenderChanged(false, true);

            if (this.$middleBlock) {
                const listContainerHeight = this.dynamicList.$listContainer.height();
                const {blockSize, blockTop} = this.getBlockTop(this.$middleBlock.attr('id'));
                this.shouldProcessScroll = false;
                this.dynamicList.scrollToYPosition(blockTop - (listContainerHeight - blockSize) / 2);
            }

            return false;

        });

        if (!this.beforePageChangeListener) {
            this.beforePageChangeListener = mBroadcaster.addListener('beforepagechange', tpage => {
                const pageId = page.replace('fm/', '');
                if (this.inPreview && (pageId.length < 5 ? M.RootID === M.currentdirid : pageId === M.currentdirid)) {
                    return;
                }

                this.dropDynamicList();

                // Clear render cache to free memory
                this.clearRenderCache();

                if (pfid && !tpage.startsWith('folder/')) {
                    $('.fm-files-view-icon.media-view').addClass('hidden');
                }

                const id = tpage.replace(/^fm\//, '');

                if (!mega.gallery.sections[id] && !id.startsWith('discovery/')) {
                    $('.gallery-tabs-bl', '.fm-right-files-block').addClass('hidden');
                }

                // Clear thumbnails to free memory if target page is not gallery anymore
                mBroadcaster.removeListener(this.beforePageChangeListener);
                delete this.beforePageChangeListener;

                // Clear discovery when it's not applicable anymore
                if (
                    this.isDiscovery
                    && (
                        !M.gallery
                        || pfid
                        || M.currentdirid !== tpage
                    )
                ) {
                    delete mega.gallery.discovery;

                    if (mega.gallery.reporter.runId) {
                        mega.gallery.reporter.stop();
                    }
                }

                if (this.workerBranch) {
                    webgl.worker.detach(this.workerBranch);
                    delete this.workerBranch;
                }

                $(window).unbind('keyup.exitDiscovery');
                if (this.slideShowCloseLister) {
                    mBroadcaster.removeListener(this.slideShowCloseLister);
                }
            });
        }

        $(window).rebind('popstate.galleryview', (ev) => {
            if (mega.gallery.titleControl) {
                mega.gallery.titleControl.hide();
            }

            if (!this.inPreview) {
                const { state = false } = ev.originalEvent || !1;

                if (state && state.galleryMode && this.onpage) {
                    this.setMode(state.galleryMode, undefined, true);
                    this.render(false);

                    this.inPreview = !!state.view;
                }
            }
        });

        if (!pfid && M.currentdirid.substr(0, 9) === 'discovery') {
            $('.gallery-close-discovery', '.gallery-tabs-bl')
                .removeClass('hidden')
                .rebind('click.exitDiscovery', () => {

                    M.openFolder(this.id).catch(dump);
                    return false;
                });

            $(window).rebind('keyup.exitDiscovery', e => {
                if (e.keyCode === 27 && !this.inPreview) { // ESC key pressed
                    M.openFolder(this.id);
                }
            });
        }
    }

    sortByMtime(ah, bh) {

        const a = M.d[ah] || this.updNode[ah];
        const b = M.d[bh] || this.updNode[bh];

        return M.sortByModTimeFn2()(a, b, -1);
    }

    renderGroup(id) {
        const cacheKey = this.mode + id;

        if (!this.renderCache[cacheKey]) {
            const group = this.getGroupById(id);

            const groupWrap = this.contentRowTemplateNode.cloneNode(true);
            const contentBlock = groupWrap.querySelector('.content-block');

            groupWrap.classList.remove('template');
            groupWrap.id = `gallery-${id}`;

            this.renderCache[cacheKey] = groupWrap;

            if (!group) {
                return this.renderCache[cacheKey];
            }

            if (this.mode !== 'm') {
                group.n.sort(this.sortByMtime.bind(this));

                if (group.l) {
                    groupWrap.classList.add('showDate');
                    contentBlock.dataset.date = group.l;
                }
            }

            let l = group.n.length;

            if (group.max) {
                l = Math.min(group.max, group.n.length);
            }

            for (let i = 0; i < l; i++) {

                const nodeElm = this.renderNode(group.n[i]);

                if (nodeElm) {
                    contentBlock.appendChild(nodeElm);
                }
            }

            if (group.extn) {

                const extraNode = this.renderNode(group.extn);

                if (extraNode) {

                    delete extraNode.dataset.date;
                    contentBlock.appendChild(extraNode);
                }
            }

            if (this.mode === 'd') {
                this.renderNodeExtraDay(group, groupWrap, contentBlock, l);
            }
            else if (this.mode === 'm') {
                this.renderNodeExtraMonth(group, groupWrap, contentBlock, l);
            }
        }

        this.clearSelection(id);

        return this.renderCache[cacheKey];
    }

    renderNodeExtraMonth(group, groupWrap, contentBlock, l) {

        const dateblock = document.createElement('a');

        dateblock.classList.add('gallery-date-block');

        // Special month corrective for Vietnamese.
        if (locale === 'vi') {
            group.ml = group.ml.toLowerCase();
        }

        $(dateblock).safeHTML(group.l.replace(group.ml, `<span>${group.ml}</span>`));

        const iconBlock = document.createElement('i');

        iconBlock.classList.add('sprite-fm-mono', 'icon-arrow-right');
        dateblock.appendChild(iconBlock);
        groupWrap.prepend(dateblock);

        if (group.r) {
            groupWrap.classList.add('layout-3-2');
        }
        else {
            groupWrap.classList.add(`layout-${l}`);
        }
    }

    renderNodeExtraDay(group, groupWrap, contentBlock, l) {

        // c is only numeric 0 when it is sub block
        if (group.c === 0) {
            groupWrap.classList.add('layout-3-2');
        }
        else {
            groupWrap.classList.add(`layout-${l}`);
        }

        if (group.mc) {

            groupWrap.classList.add('showMore');
            contentBlock.dataset.more = `+${group.mc}`;
        }

        if (group.n.length === 1) {

            const bgimg = document.createElement('img');
            const wrap = document.createElement('div');

            bgimg.classList.add('gallery-block-bg');
            wrap.classList.add('gallery-block-bg-wrap');

            wrap.appendChild(bgimg);
            contentBlock.appendChild(wrap);
        }
    }

    // Selection Removal for cache
    clearSelection(id) {

        if ($.selected.length) {

            const selectedInCache = this.renderCache[this.mode + id].getElementsByClassName('ui-selected');

            for (var i = selectedInCache.length; i--;) {

                if (selectedInCache[i].id !== $.selected[0]) {
                    selectedInCache[i].classList.remove('ui-selected');
                }
            }
        }
    }

    renderNode(h) {
        const node = M.d[h] || new MegaNode(this.updNode[h]);

        if (!node) {
            return;
        }

        const elm = new GalleryNodeBlock(node);

        mega.gallery.setShimmering(elm.el);

        if (this.nodeBlockObserver) {
            this.nodeBlockObserver.observe(elm.el, this);
        }
        else {
            elm.fill(this.mode);
            MegaGallery.addThumbnails([elm]);
        }

        return elm.el;
    }

    getBlockTop(id) {
        const keys = Object.keys(this.activeModeList).sort((a, b) => b - a);
        let height = 0;
        let blockSize = 0;
        for (const key of keys) {
            const group = this.getGroupById(key);
            const index = group.n.indexOf(id);
            if (index === -1) {
                height += this.getGroupHeight(key);
            }
            else {
                const maxItems = {1: 3, 2: 5, 3: 10, 4: 15};
                const maxItemsInRow = maxItems[this.zoom];
                blockSize = this.dynamicList.$content.width() / maxItemsInRow;
                height += Math.floor(index / maxItemsInRow) * blockSize;
                return {
                    blockSize: blockSize,
                    blockTop: height
                };
            }
        }
        return {
            blockSize: blockSize,
            blockTop: height
        };
    }

    getGroupHeight(id) {

        const wrapWidth = Math.max(Math.min(this.dynamicList.$content.width(), 820), 620);
        const group = this.getGroupById(id);

        if (this.mode === 'a') {

            const maxItems = {1: 3, 2: 5, 3: 10, 4: 15};
            const maxItemsInRow = maxItems[this.zoom];
            const blockSize = this.dynamicList.$content.width() / maxItemsInRow;

            return Math.ceil(group.n.length / maxItemsInRow) * blockSize;
        }
        else if (this.mode === 'd' || this.mode === 'y') {
            return wrapWidth / 2 + (this.mode === 'y' ? 16 : 0);
        }
        else if (this.mode === 'm') {

            let height;

            if (group.n.length <= 2) {
                height = (wrapWidth - 20) / 2;
            }
            else if (group.n.length === 3) {
                height = 380 / 620 * wrapWidth;
            }
            else {
                height = 420 / 620 * wrapWidth;
            }

            return height + 64;
        }
    }

    throttledResize() {
        delay('gallery.resizeListener', () => {
            if (this.dynamicList) {
                this.dynamicList.itemRenderChanged(false, true);
            }
        }, 100);
    }

    throttledOnScroll() {

        delay('gallery.onScroll', () => {
            if (!this.shouldProcessScroll) {
                this.shouldProcessScroll = true;
                return;
            }

            this.$middleBlock = null;

            if (this.dynamicList) {

                const actualScrollPos = this.dynamicList.getScrollTop();

                this.scrollPosCache[this.mode] = {
                    a: actualScrollPos,
                    s: actualScrollPos / this.dynamicList.$content.height()
                };
            }
        }, 100);
    }

    throttledListChange(gid) {
        delay(`gallery.listUpdate-${gid}`, () => {
            if (this.dynamicList) {
                this.dynamicList.itemChanged(gid);
            }
        }, 100);
    }

    setView() {
        const tempSubfolderMd = this.subfolderMd;
        this.subfolderMd = !mega.config.get('noSubfolderMd');

        if (this.nodes && this.subfolderMd === tempSubfolderMd) {

            M.v = Object.keys(this.nodes).map(h => M.d[h] || this.updNode[h]);
            MegaGallery.sortViewNodes();

            return false;
        }

        if (d) {
            console.time(`MegaGallery: ${this.id}`);
        }

        M.v = [];
        this.nodes = {};
    }

    setViewAfter() {
        MegaGallery.sortViewNodes();
        mBroadcaster.sendMessage('mega:gallery:view:after');

        if (d) {
            console.timeEnd(`MegaGallery: ${this.id}`);
        }
    }

    get activeModeList() {
        return this.groups[this.mode];
    }

    getGroupById(id) {
        return this.activeModeList[id];
    }
}

class MegaTargetGallery extends MegaGallery {

    async setView() {
        if (super.setView() === false) {
            return false;
        }

        const handles = this.id === 'photos' ? MegaGallery.getCameraHandles()
            : this.subfolderMd ? M.getTreeHandles(this.id) : [this.id];
        let subs = [];

        if (self.fmdb) {
            await dbfetch.geta(handles).catch(nop);
        }

        for (let i = handles.length; i--;) {
            if (!M.c[handles[i]]) {
                if (self.d && !M.d[handles[i]]) {
                    console.error(`Gallery cannot find handle ${handles[i]}`);
                }
                continue;
            }

            subs = subs.concat(Object.keys(M.c[handles[i]]));
        }

        const rubTree = MegaGallery.handlesArrToObj(M.getTreeHandles(M.RubbishID));

        subs = subs.filter(h => {
            const n = M.d[h];
            return !n.t
                && !this.nodes[n.h]
                && !rubTree[h]
                && !rubTree[n.p]
                && !n.fv
                && mega.gallery.isGalleryNode(n);
        }).sort(this.sortByMtime.bind(this));

        for (const h of subs) {
            const n = M.d[h];
            this.nodes[n.h] = this.setGroup(n)[0];
            M.v.push(M.d[n.h]);
        }

        this.mergeYearGroup();
        this.filterMonthGroup();

        super.setViewAfter();
    }

    checkGalleryUpdate(n) {
        if (!mega.gallery.isGalleryNode(n)) {
            return;
        }

        if (M.currentdirid === n.p && !M.v.length) {
            $(`.fm-empty-folder, .fm-empty-folder-link, .fm-empty-${M.currentdirid}`, '.fm-right-files-block')
                .addClass('hidden');
        }

        if (pfid) {
            delay(`pfid_discovery:node_update${n.h}`, () => {
                if (M.currentdirid === n.p) {
                    if (this.nodes[n.h]) {
                        this.updateNodeName(n);
                    }
                    else {
                        this.addNodeToGroups(n);
                    }
                }
                else if (this.nodes[n.h]) {
                    this.removeNodeFromGroups(n);
                }
            });

            return;
        }

        if (!n.t) {
            const cameraTree = M.getTreeHandles(this.isDiscovery ? this.id : M.CameraId);
            const rubTree = M.getTreeHandles(M.RubbishID);

            if (!this.isDiscovery && M.SecondCameraId) {
                cameraTree.push(...M.getTreeHandles(M.SecondCameraId));
            }

            const isInCameraTree = cameraTree.includes(n.p);

            // Checking if this item in rubbish bin
            if (M.getTreeHandles(M.RubbishID).includes(n.p)) {
                this.removeNodeFromGroups(n);
            }
            // If it is target Camera folder and it is not in gallery view now add the node to gallery.
            else if (isInCameraTree && !this.nodes[n.h]) {
                this.addNodeToGroups(n);
            }
            // Checking if this item in rubbish bin
            else if (cameraTree && rubTree.includes(n.p)) {
                this.removeNodeFromGroups(n);
            }
            // If it is not target Camera folder but it is in gallery view now remove the node from gallery view.
            else if (!isInCameraTree && this.nodes[n.h]) {
                this.removeNodeFromGroups(n);
            }
            // Lets check this is name update
            else if (this.onpage && this.renderCache && this.nodes[n.h]) {
                this.updateNodeName(n);
            }
        }
    }
}

class MegaMediaTypeGallery extends MegaGallery {

    typeFilter(n, cameraTree) {
        if (!mega.gallery.sections[this.id]) {
            return false;
        }

        return mega.gallery.sections[this.id].filterFn(n, cameraTree);
    }

    async setView() {

        if (super.setView() === false) {
            return false;
        }

        let nodes = [];
        const cameraTree = MegaGallery.getCameraHandles();
        const rubTree = MegaGallery.handlesArrToObj(M.getTreeHandles(M.RubbishID));

        if (MegaGallery.dbActionPassed) {
            nodes = Object.values(M.d).filter((n) =>
                n.fa
                && !rubTree[n.p]
                && n.s > 0
                && this.typeFilter(n, cameraTree)
            );
        }
        else {
            const handles = [];
            const dbNodes = await MegaGallery.dbAction()
                .catch(() => { // Fetching all available nodes in case of DB failure
                    console.warn('Local DB failed. Fetching existing FM nodes.');
                    return Object.values(M.d);
                });

            for (let i = 0; i < dbNodes.length; i++) {
                const n = dbNodes[i];

                if (!n.fa || !n.s || rubTree[n.p]) {
                    continue;
                }

                handles.push(n.p);

                if (this.typeFilter(n, cameraTree)) {
                    nodes.push(n);
                    this.updNode[n.h] = n;
                }
            }

            await dbfetch.geta(handles).catch(nop);

            MegaGallery.dbActionPassed = true;

            this.updNode = {};

            // Initializing albums here for the performace's sake
            if (mega.gallery.albums.awaitingDbAction) {
                mega.gallery.albums.init();
            }
        }

        // This sort is needed for building groups, do not remove
        const sortFn = M.sortByModTimeFn2();
        nodes.sort((a, b) => sortFn(a, b, -1));

        if (!Array.isArray(nodes)) {
            if (d) {
                console.timeEnd(`MegaGallery: ${this.id}`);
            }

            return;
        }

        const sharesTree = M.getTreeHandles('shares');

        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];

            if (this.nodes[n.h] || n.t || sharesTree.includes(n.p) || this.id === 'favourites' && !n.fav) {
                continue;
            }

            if (!n.fv) {
                this.nodes[n.h] = this.setGroup(n)[0];
            }
        }

        M.v = Object.keys(this.nodes).map(h => M.d[h] || this.updNode[h]);

        this.mergeYearGroup();
        this.filterMonthGroup();

        super.setViewAfter();
    }

    checkGalleryUpdate(n) {
        const cameraTree = MegaGallery.getCameraHandles();

        if (!n.t && this.typeFilter(n, cameraTree)) {
            const ignoreHandles = MegaGallery.handlesArrToObj([
                ...M.getTreeHandles('shares'),
                ...M.getTreeHandles(M.RubbishID)
            ]);
            let toGallery = !ignoreHandles[n.p];

            if (this.id === 'favourites') {
                toGallery = toGallery && n.fav;
            }

            // If it is target is rubbish bin or shared folder and it is in gallery view delete the node from it.
            if (!toGallery && this.nodes[n.h]) {

                // If changed node is what currently viewing on slideshow and it's fav flag is removed, moving backwards
                if (this.dynamicList && this.onpage && sessionStorage.previewNode === n.h) {

                    const backItem = slideshow_steps().backward[0];

                    onIdle(() => {
                        slideshow(backItem, !backItem);
                    });
                }

                this.removeNodeFromGroups(n);
            }
            // If it is not target other folders and it is not in gallery view add the node to it.
            else if (toGallery && !this.nodes[n.h]) {
                this.addNodeToGroups(n);
            }
            // Lets check this is name update
            else if (this.onpage && this.renderCache && this.nodes[n.h]) {
                this.updateNodeName(n);

                if (mega.gallery.pendingFaBlocks[n.h] && n.fa.includes(':1*')) {
                    MegaGallery.addThumbnails(Object.values(mega.gallery.pendingFaBlocks[n.h]));
                    delete mega.gallery.pendingFaBlocks[n.h];
                }
            }
        }
    }
}

mega.gallery = Object.create(null);
mega.gallery.nodeUpdated = false;
mega.gallery.albumsRendered = false;
mega.gallery.publicSet = Object.create(null);
mega.gallery.titleControl = null;
mega.gallery.emptyBlock = null;
mega.gallery.rootMode = {photos: 'a', images: 'a', videos: 'a'};
mega.gallery.pendingFaBlocks = {};
mega.gallery.pendingThumbBlocks = {};
mega.gallery.disallowedExtensions = { 'PSD': true, 'SVG': true };

/**
 * @TODO: Remove this check once we bump all browsers up to support this feature
 */
mega.gallery.hasWebAnimationsApi = typeof document.body.getAnimations === 'function';

Object.defineProperty(mega.gallery, 'albumsRendered', {
    get() {
        'use strict';
        return this._albumsRendered;
    },
    set(value) {
        'use strict';
        if (this._albumsRendered && value === false) {
            for (const id in this.albums.store) {
                const album = this.albums.store[id];

                if (album.cellEl) {
                    album.cellEl.dropBackground();
                }
            }
        }

        this._albumsRendered = value;
    }
});

mega.gallery.secKeys = {
    cuphotos: 'camera-uploads-photos',
    cdphotos: 'cloud-drive-photos',
    cuimages: 'camera-uploads-images',
    cdimages: 'cloud-drive-images',
    cuvideos: 'camera-uploads-videos',
    cdvideos: 'cloud-drive-videos'
};

/**
 * Checking if the file is even available for the gallery
 * @param {String|MegaNode|Object} n An ufs-node, or filename
 * @param {String} [ext] Optional filename extension
 * @returns {Number|String|Function|Boolean}
 */
mega.gallery.isGalleryNode = (n, ext) => {
    'use strict';

    ext = ext || fileext(n && n.name || n, true, true);
    return n.fa && (mega.gallery.isImage(n, ext) || mega.gallery.isVideo(n));
};

/**
     * Adding a loading icon to the cell
     * @param {HTMLElement} el DOM Element to add the loading icon to
     * @param {Boolean} isVideo Whether to attach loading icon as for a video or an image
     * @returns {void}
     */
mega.gallery.setShimmering = (el) => {
    'use strict';

    // Image is already loaded
    if (el.style.backgroundImage) {
        return;
    }

    el.classList.add('shimmer');

    if (mega.gallery.hasWebAnimationsApi) {
        requestAnimationFrame(() => {
            const anims = el.getAnimations();

            for (let i = 0; i < anims.length; i++) {
                anims[i].startTime = 0;
            }
        });
    }
};

/**
 * Removing the loading icon from the cell
 * @param {HTMLElement} el DOM Element to remove the loading icon from
 * @returns {void}
 */
mega.gallery.unsetShimmering = (el) => {
    'use strict';
    el.classList.remove('shimmer');
};

/**
 * Checking if the file is qualified to have a preview
 * @param {String|MegaNode|Object} n An ufs-node, or filename
 * @param {String} [ext] Optional filename extension
 * @returns {Number|String|Function|Boolean}
 */
mega.gallery.isPreviewable = (n, ext) => {
    'use strict';
    return is_image3(n, ext) || is_video(n);
};

/**
 * Same as is_image3(), additionally checking whether the node meet requirements for photo/media gallery.
 * @param {String|MegaNode|Object} n An ufs-node, or filename
 * @param {String} [ext] Optional filename extension
 * @returns {Boolean}
 */
mega.gallery.isImage = (n, ext) => {
    'use strict';

    ext = ext || fileext(n && n.name || n, true, true);
    return !mega.gallery.disallowedExtensions[ext] && is_image3(n, ext);
};

/**
 * Checks whether the node is a video, plus checks if thumbnail is available
 * @param {Object} n ufs node
 * @returns {Object.<String, Number>|Boolean}
 */
mega.gallery.isVideo = (n) => {
    'use strict';

    if (!n || !n.fa || !n.fa.includes(':8*')) {
        return false;
    }

    const p = M.getMediaProperties(n);

    if (!p.showThumbnail || p.icon !== 'video') {
        return false;
    }

    const props = MediaAttribute.prototype.fromAttributeString(n.fa, n.k);

    return props && props.width && props.height ? p : false;
};

mega.gallery.checkEveryGalleryUpdate = n => {

    'use strict';

    // If there is discovery under gallery it means user is on discovery page.
    // And if user move/delete the folder, let's just reset gallery.
    if (mega.gallery.discovery && mega.gallery.discovery.id === n.h) {

        mega.gallery.nodeUpdated = true;

        return galleryUI(n.h);
    }

    if (n.t && M.c[n.h]) {

        const childHandles = Object.keys(M.c[n.h]);

        for (let i = childHandles.length; i--;) {
            mega.gallery.checkEveryGalleryUpdate(M.d[childHandles[i]]);
        }

        return;
    }

    if (mega.gallery.discovery) {
        mega.gallery.discovery.checkGalleryUpdate(n);
    }

    const sectionKeys = Object.keys(mega.gallery.sections);

    for (let i = 0; i < sectionKeys.length; i++) {
        const key = sectionKeys[i];

        if (mega.gallery[key]) {
            mega.gallery[key].checkGalleryUpdate(n);
        }
    }
};

mega.gallery.checkEveryGalleryDelete = h => {

    'use strict';

    if (mega.gallery.discovery) {
        mega.gallery.discovery.removeNodeByHandle(h);
    }

    const sectionKeys = Object.keys(mega.gallery.sections);

    for (let i = 0; i < sectionKeys.length; i++) {
        const key = sectionKeys[i];

        if (mega.gallery[key]) {
            mega.gallery[key].removeNodeByHandle(h);
        }
    }
};

mega.gallery.clearMdView = () => {
    'use strict';
    const $mediaIcon = $('.fm-files-view-icon.media-view').addClass('hidden');

    if (M.gallery) {
        $mediaIcon.removeClass('active');
        $('.gallery-tabs-bl').addClass('hidden');
        $(`.fm-files-view-icon.${M.viewmode ? 'block-view' : 'listing-view'}`).addClass('active');

        assert(pfid);
        M.gallery = false;
    }
};

mega.gallery.resetAll = () => {
    'use strict';

    mega.gallery.modeBeforeReset = {};

    delete mega.gallery.discovery;

    const sectionKeys = Object.keys(mega.gallery.sections);

    for (let i = 0; i < sectionKeys.length; i++) {
        const key = sectionKeys[i];

        mega.gallery.modeBeforeReset[key] = mega.gallery[key] && mega.gallery[key].mode;

        if (mega.gallery[key]) {
            delete mega.gallery[key];
        }
    }

    mega.gallery.nodeUpdated = false;
};

mega.gallery.showEmpty = (type, noMoreFiles) => {
    'use strict';

    if (noMoreFiles || M.currentrootid === M.RootID &&
        (!M.c[M.currentdirid] || !Object.values(M.c[M.currentdirid]).length)) {
        $('.fm-empty-folder', '.fm-right-files-block').removeClass('hidden');
        $(`.fm-empty-${M.currentdirid}`, '.fm-right-files-block').addClass('hidden');
        return;
    }

    if (!mega.gallery.emptyBlock) {
        mega.gallery.emptyBlock = new GalleryEmptyBlock('.fm-main.default > .fm-right-files-block');
    }

    mega.gallery.emptyBlock.type = type;
    mega.gallery.emptyBlock.show();
};

/**
 * This is specifically a check for standard PNG/WEBP thumbnails.
 * Upon creation, thumnails for new PNG/GIF/SVG/WEBP are conveniently stored as PNG or WEBP files
 * @param {ArrayBuffer|Uint8Array} ab Image array buffer
 * @returns {Boolean}
 */
mega.gallery.arrayBufferContainsAlpha = (ab) => {
    'use strict';

    const fileData = webgl.identify(ab);

    if (!fileData || fileData.format !== 'PNG') {
        return false;
    }

    // The check is based on https://www.w3.org/TR/png/#table111
    // We know format field exists in the IHDR chunk. The chunk exists at
    // offset 8 +8 bytes (size, name) +8 (depth) & +9 (type)
    // So, if it is not type 4 or 6, that would mean alpha sample is not following RGB triple
    const transparentTypes = [4, 6];

    const abType = new DataView(ab.buffer || ab).getUint8(8 + 8 + 9);

    return transparentTypes.includes(abType);
};

/**
 * A method to make/load the thumbnails of specific size based on the list of handles provided
 * @param {Array} keys Handle+size key to fetch from local database or to generate.
 * Key example: `1P9hFJwb|w320` - handle is 1P9hFJwb, width 320px
 * @param {Function} [onLoad] Single image successful load callback
 * @param {Function} [onErr] Callback when a single image is failed to load
 * @returns {void}
 */
mega.gallery.generateSizedThumbnails = async(keys, onLoad, onErr) => {
    'use strict';

    const { dbLoading } = mega.gallery;

    if (!MegaGallery.workerBranch) {
        MegaGallery.workerBranch = await webgl.worker.attach();
    }

    if (dbLoading) {
        await dbLoading;
    }

    const { workerBranch } = MegaGallery;

    const isLocationCorrect = () => {
        if (pfid || M.isGalleryPage() || M.isAlbumsPage() || M.gallery) {
            return true;
        }

        console.log(`Cancelling the thumbnail request...`);
        return false;
    };

    const processBlob = (key, blob) => {
        webgl.readAsArrayBuffer(blob)
            .then((ab) => {
                if (!isLocationCorrect()) {
                    return;
                }

                ab.type = blob.type;

                mega.gallery.lru.set(key, ab).then(() => {
                    if (!isLocationCorrect()) {
                        return;
                    }

                    onLoad(key, ab);
                });
            })
            .catch(dump);
    };

    const sizedThumbs = await mega.gallery.lru.bulkGet(keys).catch(dump) || false;
    const fetchTypes = [{}, {}];
    const faData = {};

    for (let i = 0; i < keys.length; i++) {
        if (!isLocationCorrect()) {
            return;
        }

        const key = keys[i];

        // Fetching already stored thumbnail
        if (sizedThumbs[key]) {
            onLoad(key, sizedThumbs[key]);
            continue;
        }

        const [fa, pxSize] = key.split('|w');
        const faBlocks = mega.gallery.pendingThumbBlocks[key];

        if (!faBlocks) {
            onErr(`Cannot work with blocks anymore for fa: ${fa}...`);
            continue;
        }

        const { node } = faBlocks[0];

        if (!node || !node.fa) {
            onErr(`The node ${node.h} either does not exist or is not a media file...`);
            continue;
        }

        const inThumbSize = pxSize <= MEGAImageElement.THUMBNAIL_SIZE;
        const ext = fileext(node.name || node, true, true);
        const type = inThumbSize || GalleryNodeBlock.allowsTransparent[ext] || ext === 'SVG' ? 0 : 1;

        faData[key] = {
            key,
            handle: node.h,
            byteSize: node.s,
            pxSize,
            inThumbSize,
            ext
        };

        fetchTypes[type][key] = node;
    }

    const isAbAvailable = ab => ab !== 0xDEAD && ab.byteLength > 0;

    const adjustBlobToConditions = async(key, thumbAB, type, size) => {
        let blob;

        const {
            handle,
            byteSize,
            inThumbSize,
            ext
        } = faData[key];

        // Checking if we can use the already received thumbAB, or we need to load the original
        if (
            byteSize < 8e6 // 8MB. The file size allows it to be fetched
            && (
                (!isAbAvailable(thumbAB) && type === 0) // Thumbnail is not available
                || (
                    !inThumbSize // Need bigger than the thumbnail
                    && mega.gallery.arrayBufferContainsAlpha(thumbAB) // AB contains transparent pixels
                    && GalleryNodeBlock.allowsTransparent[ext] // The image is designed to allow transparency
                )
            )
        ) {
            // The thumbnail and preview did not qualify for conditions, so original image must be fetched
            const original = await M.gfsfetch(handle, 0, -1).catch(dump);

            if (!isLocationCorrect()) {
                return;
            }

            if (original) {
                blob = await webgl.getDynamicThumbnail(original, size, workerBranch).catch(dump);
            }
        }

        return blob;
    };

    const processUint8 = async(ctx, key, thumbAB, type) => {
        if (!isLocationCorrect()) {
            return;
        }

        const abIsEmpty = !isAbAvailable(thumbAB);
        const {
            handle,
            pxSize
        } = faData[key];

        if (abIsEmpty && type === 1) { // Preview fetch is not successful
            api_getfileattr(
                { [key]: M.d[faData[key].handle] },
                0,
                (ctx1, key1, thumbAB1) => {
                    processUint8(ctx1, key1, thumbAB1, 0);
                }
            );

            onErr('The basic thumbnail image seems to be tainted...');
            return;
        }

        const size = parseInt(pxSize) | 0;

        let blob = await adjustBlobToConditions(key, thumbAB, type, size);

        if (!isLocationCorrect()) {
            return;
        }

        if (!blob && abIsEmpty) {
            console.warn('Could not fetch neither of the available image options...');
            return;
        }

        if (!blob) {
            const bak = new ArrayBuffer(thumbAB.byteLength);
            new Uint8Array(bak).set(new Uint8Array(thumbAB));

            if (bak.byteLength) {
                blob = await webgl.getDynamicThumbnail(bak, size, workerBranch).catch(dump);
            }

            if (!blob) {
                blob = new Blob([thumbAB], { type: 'image/webp' });

                if (!blob.size) {
                    blob = null;
                }
            }
        }

        if (!isLocationCorrect()) {
            return;
        }

        if (blob) {
            processBlob(key, blob);
        }
        else {
            onErr(`Could not generate dynamic thumbnail of ${size}px for ${handle}`);
        }
    };

    fetchTypes.forEach((nodes, type) => {
        if (!Object.keys(nodes).length) {
            return;
        }

        api_getfileattr(
            nodes,
            type,
            (ctx, key, thumbAB) => {
                processUint8(ctx, key, thumbAB, type);
            },
            (key) => {
                if (faData[key] && type) {
                    console.warn(`Could not receive preview image for ${key}, reverting back to thumbnail...`);

                    api_getfileattr(
                        { [key]: M.d[faData[key].handle] },
                        0,
                        (ctx1, key1, thumbAB1) => {
                            processUint8(ctx1, key1, thumbAB1, 0);
                        }
                    );
                }
            }
        );
    });
};

/**
 * Clearing the check, so the next time the DB will be re-requested
 */
mega.gallery.removeDbActionCache = () => {
    'use strict';
    MegaGallery.dbActionPassed = false;
};

/**
 * @param {HTMLCollection} elements The collection of the sidebar buttons
 * @param {HTMLElement} galleryBtn The gallery button
 * @returns {Promise<void>}
 */
mega.gallery.updateButtonsStates = async(elements, galleryBtn) => {
    'use strict';

    const galleryRoots = {
        photos: true,
        images: true,
        videos: true
    };
    const { getItem } = await mega.gallery.prefs.init();

    const res = getItem('web.locationPref');

    if (!res || typeof res !== 'object' || !elements[0].querySelector) {
        return;
    }

    const keys = Object.keys(res);

    for (let i = 0; i < keys.length; i++) {
        const pathKey = keys[i];

        if (!galleryRoots[pathKey]) {
            continue;
        }

        const btn = elements[0].querySelector(`.btn-galleries[data-link=${pathKey}]`);

        if (btn) {
            btn.dataset.locationPref = res[pathKey];
        }

        if (pathKey === 'photos') {
            galleryBtn.dataset.locationPref = res[pathKey];
        }
    }
};

async function galleryUI(id) {
    'use strict';

    if (self.d) {
        console.group(`Setting up gallery-view...`, M.currentdirid, id);
        console.time('gallery-ui');
    }

    loadingDialog.show('MegaGallery');

    if (mega.gallery.nodeUpdated) {
        mega.gallery.resetAll();
    }

    let gallery = mega.gallery[M.currentdirid];

    $('.gallery-close-discovery', '.gallery-tabs-bl').addClass('hidden');

    if (!mega.gallery.titleControl) {
        mega.gallery.titleControl = new GalleryTitleControl('.gallery-tabs-bl .gallery-section-title');
    }

    // cleanup existing (FM-side) MegaRender and such.
    M.v = [];
    $.selected = [];
    M.gallery |= 1;
    M.renderMain();
    delay.cancel('rmSetupUI');

    M.onTreeUIOpen(M.currentdirid);

    if (pfid || M.gallery && !M.isGalleryPage() && !M.isAlbumsPage()) {
        if (window.pfcol) {
            return mega.gallery.albums.initPublicAlbum();
        }
        id = !id || typeof id !== 'string' ? M.currentdirid : id;
        $('.view-links', '.gallery-tabs-bl').removeClass('hidden');
    }
    else {
        $('.view-links', '.gallery-tabs-bl').addClass('hidden');
    }

    // This keeps the banner persistent when navigating from Recents to Gallery
    $('.fm-right-files-block').addClass('visible-notification');

    // This is media discovery
    if (id) {
        if (!pfid) {
            mega.gallery.reporter.report(false, 'MD');
        }

        if (!M.getNodeByHandle(id) || M.getNodeRoot(id) === M.RubbishID) {

            M.openFolder(M.RootID);

            return loadingDialog.hide('MegaGallery');
        }

        mega.gallery.titleControl.title = M.d[id].name;
        mega.gallery.titleControl.icon = 'images';
        mega.gallery.titleControl.isClickable = false;
        mega.gallery.titleControl.addTooltipToTitle();

        gallery = mega.gallery.discovery;
    }
    else if (mega.gallery.sections[M.currentdirid]) {
        mega.gallery.titleControl.filterSection = M.currentdirid;
        mega.gallery.titleControl.title = mega.gallery.sections[M.currentdirid].title;
        mega.gallery.titleControl.icon = mega.gallery.sections[M.currentdirid].icon;
        mega.gallery.titleControl.removeTooltipFromTitle();
    }

    if (!gallery) {
        if (!pfid) {
            await M.getCameraUploads().catch(nop);
        }

        if (id) {
            gallery = mega.gallery.discovery = new MegaTargetGallery(id);
        }
        else if (mega.gallery.sections[M.currentdirid]) {
            gallery = mega.gallery[M.currentdirid] = new MegaMediaTypeGallery();
        }
    }

    if (gallery.id === 'favourites') {
        gallery.galleryBlock.classList.add('gallery-type-fav');
    }
    else {
        gallery.galleryBlock.classList.remove('gallery-type-fav');
    }

    gallery.setView().catch(dump).finally(() => {

        if (mega.gallery.modeBeforeReset && mega.gallery.modeBeforeReset[M.currentdirid]) {

            gallery.mode = mega.gallery.modeBeforeReset[M.currentdirid];
            mega.gallery.modeBeforeReset[M.currentdirid] = null;
        }

        gallery.setMode(gallery.mode || 'a', 2);
        gallery.render(true, true);
        gallery.bindEvents();

        loadingDialog.hide('MegaGallery');

        if (self.d) {
            console.timeEnd('gallery-ui');
            console.groupEnd();
        }
    });
}

/**
 * @param {GalleryNodeBlock[]} nodeBlocks Array of objects encapsulating setThumb and node
 * @returns {void}
 */
MegaGallery.addThumbnails = (nodeBlocks) => {
    'use strict';

    if (!GalleryNodeBlock.thumbCache) {
        GalleryNodeBlock.thumbCache = Object.create(null);
    }

    const thumbSize = 240;
    const keys = [];
    const thumbBlocks = {};

    for (let i = 0; i < nodeBlocks.length; i++) {
        if (!nodeBlocks[i].node) { // No node is associated with the block
            continue;
        }

        const { h, fa } = nodeBlocks[i].node;

        /**
         * The element width to fetch with relation to dpx
         */
        const width = parseInt(nodeBlocks[i].el.clientWidth) | 0;
        const key = MegaGallery.getCacheKey(fa, width);

        // In case fa is not arrived yet, placing the node to the buffer
        if (!fa) {
            if (!mega.gallery.pendingFaBlocks[h]) {
                mega.gallery.pendingFaBlocks[h] = Object.create(null);
            }

            mega.gallery.pendingFaBlocks[h][width] = nodeBlocks[i];
            continue;
        }
        else if (width <= thumbSize) {
            if (thumbBlocks[nodeBlocks[i].node.h]) {
                thumbBlocks[nodeBlocks[i].node.h].push(nodeBlocks[i]);
            }
            else {
                thumbBlocks[nodeBlocks[i].node.h] = [nodeBlocks[i]];
            }
            continue;
        }

        if (GalleryNodeBlock.thumbCache[key]) {
            nodeBlocks[i].setThumb(GalleryNodeBlock.thumbCache[key], nodeBlocks[i].node.fa);
            continue;
        }

        if (!keys.includes(key)) {
            keys.push(key);
        }

        if (mega.gallery.pendingThumbBlocks[key]) {
            mega.gallery.pendingThumbBlocks[key].push(nodeBlocks[i]);
        }
        else {
            mega.gallery.pendingThumbBlocks[key] = [nodeBlocks[i]];
        }

        // Stretch the image when loading
        if (nodeBlocks[i].thumb) {
            nodeBlocks[i].thumb.classList.add('w-full');
        }
    }

    // Checking if there are any re-usable thumbnails available
    const thumbHandles = Object.keys(thumbBlocks);

    if (thumbHandles.length) {
        fm_thumbnails(
            'standalone',
            thumbHandles.map(h => M.d[h]),
            ({ h, fa }) => {
                for (let i = 0; i < thumbBlocks[h].length; i++) {
                    thumbBlocks[h][i].setThumb(thumbnails.get(fa), fa);
                }
            }
        );
    }

    // All nodes are in pending state, no need to proceed
    if (!keys.length) {
        return;
    }

    mega.gallery.generateSizedThumbnails(
        keys,
        (key, arrayBuffer) => {
            const blocks = mega.gallery.pendingThumbBlocks;

            // The image has been applied already
            if (!blocks[key]) {
                return;
            }
            const weAreOnGallery = pfid || M.isGalleryPage() || M.isAlbumsPage() || M.gallery;

            if (d) {
                console.assert(weAreOnGallery, `This should not be running!`);
            }

            if (GalleryNodeBlock.thumbCache[key]) {
                for (let i = 0; i < blocks[key].length; i++) {
                    blocks[key][i].setThumb(GalleryNodeBlock.thumbCache[key], blocks[key][i].node.fa);
                }

                delete blocks[key];
                return;
            }

            if (weAreOnGallery) {
                const url = mObjectURL([arrayBuffer], arrayBuffer.type || 'image/jpeg');

                if (blocks[key]) {
                    for (let i = 0; i < blocks[key].length; i++) {
                        blocks[key][i].setThumb(url, blocks[key][i].node.fa);
                    }

                    delete blocks[key];
                }

                if (!GalleryNodeBlock.thumbCache[key]) {
                    GalleryNodeBlock.thumbCache[key] = url;

                    const cachedKeys = Object.keys(GalleryNodeBlock.thumbCache);

                    if (cachedKeys.length > GalleryNodeBlock.thumbCacheSize) {
                        GalleryNodeBlock.revokeThumb(cachedKeys[0]);
                    }
                }
            }
            else {
                delete blocks[key];
            }
        },
        (err) => {
            console.warn(`Cannot make thumbnail(s). Error: ${err}`);
        }
    );
};

MegaGallery.revokeThumbs = () => {
    'use strict';

    if (!GalleryNodeBlock.thumbCache) {
        return;
    }

    const keys = Object.keys(GalleryNodeBlock.thumbCache);

    for (let i = 0; i < keys.length; i++) {
        URL.revokeObjectURL(GalleryNodeBlock.thumbCache[keys[i]]);
    }

    GalleryNodeBlock.thumbCache = Object.create(null);
};

MegaGallery.getCacheKey = (prefix, width) => {
    'use strict';
    return width ? `${prefix}|w${parseInt(width)}` : prefix;
};

MegaGallery.handleIntersect = (entries, gallery) => {
    'use strict';

    const toFetchAttributes = [];

    for (let i = 0; i < entries.length; i++) {
        const { isIntersecting, target: { nodeBlock } } = entries[i];

        if (isIntersecting) {
            if (!nodeBlock.isRendered) {
                nodeBlock.fill(gallery.mode);
                toFetchAttributes.push(nodeBlock);
            }

            if (Array.isArray($.selected) && $.selected.includes(nodeBlock.node.h)) {
                nodeBlock.el.classList.add('ui-selected');
            }

            if (gallery.blockSizeObserver) {
                gallery.blockSizeObserver.observe(nodeBlock.el);
            }
        }
        else if (gallery.blockSizeObserver) {
            gallery.blockSizeObserver.unobserve(nodeBlock.el);
        }
    }

    if (toFetchAttributes.length) {
        MegaGallery.addThumbnails(toFetchAttributes);
    }
};

MegaGallery.handleResize = (entries) => {
    'use strict';

    const toFetchAttributes = [];

    for (let i = 0; i < entries.length; i++) {
        const { contentRect, target: { nodeBlock }, target: { nodeBlock: { thumb } } } = entries[i];

        if (contentRect.width > thumb.naturalWidth) {
            toFetchAttributes.push(nodeBlock);
        }
    }

    delay('gallery.nodeBlockResize', () => {
        if (toFetchAttributes.length) {
            MegaGallery.addThumbnails(toFetchAttributes);
        }
    });
};

MegaGallery.dbAction = () => {
    'use strict';

    if (fmdb && fmdb.db !== null && fmdb.crashed !== 666) {
        const ignoreHandles = MegaGallery.handlesArrToObj([
            ...M.getTreeHandles('shares'),
            ...M.getTreeHandles(M.RubbishID)
        ]);

        return fmdb.getbykey(
            'f',
            {
                query: db => db.where('fa').notEqual(fmdb.toStore('')),
                include: ({p}) => !ignoreHandles[p]
            }
        );
    }

    return Promise.reject();
};

MegaGallery.handlesArrToObj = (array) => {
    'use strict';

    const obj = Object.create(null);

    for (let i = 0; i < array.length; i++) {
        obj[array[i]] = true;
    }

    return obj;
};

lazy(mega.gallery, 'dbLoading', () => {
    'use strict';

    return LRUMegaDexie.create('gallery_thumbs', 200)
        .then((db) => {
            mega.gallery.lru = db;
        })
        .catch(dump)
        .finally(() => {
            delete mega.gallery.dbLoading;
        });
});

lazy(mega.gallery, 'sections', () => {
    'use strict';

    return {
        photos: {
            path: 'photos',
            icon: 'photos',
            root: 'photos',
            filterFn: n => mega.gallery.isGalleryNode(n),
            title: l.gallery_all_locations
        },
        [mega.gallery.secKeys.cuphotos]: {
            path: mega.gallery.secKeys.cuphotos,
            icon: 'photos',
            root: 'photos',
            filterFn: (n, cameraTree) => cameraTree && cameraTree.includes(n.p)
                && (mega.gallery.isImage(n) || mega.gallery.isVideo(n)),
            title: l.gallery_camera_uploads
        },
        [mega.gallery.secKeys.cdphotos]: {
            path: mega.gallery.secKeys.cdphotos,
            icon: 'photos',
            root: 'photos',
            filterFn: (n, cameraTree) => (!cameraTree || !cameraTree.includes(n.p))
                && (mega.gallery.isImage(n) || mega.gallery.isVideo(n)),
            title: l.gallery_from_cloud_drive
        },
        images: {
            path: 'images',
            icon: 'images',
            root: 'images',
            filterFn: n => mega.gallery.isImage(n),
            title: l.gallery_all_locations
        },
        [mega.gallery.secKeys.cuimages]: {
            path: mega.gallery.secKeys.cuimages,
            icon: 'images',
            root: 'images',
            filterFn: (n, cameraTree) => cameraTree && cameraTree.includes(n.p) && mega.gallery.isImage(n),
            title: l.gallery_camera_uploads
        },
        [mega.gallery.secKeys.cdimages]: {
            path: mega.gallery.secKeys.cdimages,
            icon: 'images',
            root: 'images',
            filterFn: (n, cameraTree) => (!cameraTree || !cameraTree.includes(n.p)) && mega.gallery.isImage(n),
            title: l.gallery_from_cloud_drive
        },
        videos: {
            path: 'videos',
            icon: 'videos',
            root: 'videos',
            filterFn: n => mega.gallery.isVideo(n),
            title: l.gallery_all_locations
        },
        [mega.gallery.secKeys.cuvideos]: {
            path: mega.gallery.secKeys.cuvideos,
            icon: 'videos',
            root: 'videos',
            filterFn: (n, cameraTree) => cameraTree && cameraTree.includes(n.p) && mega.gallery.isVideo(n),
            title: l.gallery_camera_uploads
        },
        [mega.gallery.secKeys.cdvideos]: {
            path: mega.gallery.secKeys.cdvideos,
            icon: 'videos',
            root: 'videos',
            filterFn: (n, cameraTree) => (!cameraTree || !cameraTree.includes(n.p)) && mega.gallery.isVideo(n),
            title: l.gallery_from_cloud_drive
        },
        favourites: {
            path: 'favourites',
            icon: 'favourite-filled',
            root: 'favourites',
            filterFn: n => mega.gallery.isImage(n) || mega.gallery.isVideo(n),
            title: l.gallery_favourites
        }
    };
});

lazy(mega.gallery, 'reporter', () => {
    'use strict';

    const intervals = {
        MD: {
            initEvt: 99900,
            favEvt: 99757,
            marks: [
                [10, 99753], // This timeout value is also being used for Fav reporter
                [30, 99754],
                [60, 99755],
                [180, 99756]
            ]
        },
        Album: {
            marks: [
                [10, 99931],
                [30, 99932],
                [60, 99933],
                [180, 99934]
            ]
        }
    };

    /**
     * The number to qualify as a favourite
     * @type {Number}
     */
    const timesOver = 3;

    const statsStorageKey = 'regularPageStats';

    /**
     * This one prevents events from sending same requests multiple times when leaving and coming back to the tab
     * or accidentally doubling events
     * @type {Number[]}
     */
    let passedSessionMarks = [];
    let sessionTimer = null;
    let favTimer = null;

    let fmStats = null;
    let disposeVisibilityChange = null;

    const fillStats = () => new Promise((resolve) => {
        if (fmStats !== null) {
            resolve(true);
            return;
        }

        M.getPersistentData(statsStorageKey).then((stats) => {
            if (stats) {
                fmStats = stats;
            }

            resolve(true);
        }).catch(() => {
            resolve(false);
        });
    });

    return {
        runId: 0,
        sameRun(runId) {
            return runId === this.runId && document.visibilityState !== 'hidden';
        },
        /**
         * @param {Boolean} isCarryOn Whether to carry on the paused session or not (e.g. when visibility changes)
         * @param {String} pageKey The page key to use for the reporting
         * @returns {void}
         */
        report(isCarryOn, pageKey) {
            const { initEvt, marks, favEvt } = intervals[pageKey];

            if (!isCarryOn && initEvt) {
                eventlog(initEvt);

                // We need to stop the previously initialised reporter's run if any
                if (this.runId) {
                    this.stop();
                }
            }

            this.runId = Date.now();
            const { runId } = this;

            disposeVisibilityChange = MComponent.listen(
                document,
                'visibilitychange',
                () => {
                    if (document.visibilityState === 'visible' && this.runId === runId) {
                        this.report(true, pageKey);
                    }
                }
            );

            sessionTimer = this.reportSessionMarks(marks[0][0], 0, runId, pageKey);

            if (favEvt) {
                favTimer = this.processSectionFavourite(runId, pageKey);
            }

            mBroadcaster.once('pagechange', () => {
                this.stop();
            });
        },
        /**
         * Sending time marks if the session time is surpassing a specific value
         * @param {Number} timeout
         * @param {Number} diff Timeout to the next mark
         * @param {Number} runId Current report run id to check
         * @param {String} pageKey The page key to use for the reporting
         */
        reportSessionMarks(timeout, diff, runId, pageKey) {
            const { marks } = intervals[pageKey];
            const eventIndex = marks.findIndex(([to]) => to === timeout);
            const timer = tSleep(timeout - diff);

            timer.then(
                () => {
                    if (!this.sameRun(runId)) {
                        sessionTimer = null;
                        return;
                    }

                    if (!passedSessionMarks.includes(timeout)) {
                        passedSessionMarks.push(timeout);

                        delay(
                            `gallery_stat_${marks[eventIndex][1]}`,
                            eventlog.bind(null, marks[eventIndex][1], `Session mark: ${pageKey} | ${timeout}s`)
                        );
                    }

                    const nextIndex = eventIndex + 1;
                    if (marks[nextIndex]) {
                        sessionTimer = this.reportSessionMarks(marks[nextIndex][0], timeout, runId, pageKey);
                    }
                    else {
                        sessionTimer = null;
                    }
                }
            );

            return timer;
        },
        /**
         * Report if user visited a specific section/page more than timesOver times
         * @param {Number} runId Current report run id to check
         * @param {String} pageKey The page key to use for the reporting
         */
        processSectionFavourite(runId, pageKey) {
            const { marks, favEvt } = intervals[pageKey];
            const timer = tSleep(marks[0][0]);

            timer.then(() => {
                if (!this.sameRun(runId)) {
                    favTimer = null;
                    return;
                }

                fillStats().then((status) => {
                    if (!status) {
                        fmStats = [];
                    }

                    let section = fmStats.find(({ name }) => name === pageKey);

                    if (section) {
                        section.count++;
                    }
                    else {
                        section = { name: pageKey, count: 1, reported: false };
                        fmStats.push(section);
                    }

                    if (!section.reported) {
                        if (section.count >= timesOver) {
                            section.reported = true;
                            delay(
                                `gallery_stat_${favEvt}`,
                                eventlog.bind(null, favEvt, `${pageKey} has been visited ${section.count} times`)
                            );
                        }

                        M.setPersistentData(statsStorageKey, fmStats).catch(() => {
                            console.error('Cannot save stats - the storage is most likely full...');
                        });
                    }
                });
            });

            return timer;
        },
        stop() {
            if (typeof disposeVisibilityChange === 'function') {
                disposeVisibilityChange();
            }

            this.runId = 0;
            passedSessionMarks = [];

            if (sessionTimer) {
                sessionTimer.abort();
            }

            if (favTimer) {
                favTimer.abort();
            }
        }
    };
});

lazy(mega.gallery, 'prefs', () => {
    'use strict';

    const prefKey = 'ccPref';
    let data = {};

    const saveUserAttribute = async() => {
        const res = await Promise.resolve(mega.attr.get(u_attr.u, prefKey, false, true)).catch(dump);

        if (res && res.cc && typeof res.cc === 'string') {
            tryCatch(() => {
                const tmp = JSON.parse(res.cc);
                const tmpKeys = Object.keys(tmp);

                for (let i = 0; i < tmpKeys.length; i++) {
                    const key = tmpKeys[i];

                    if (key === 'web') {
                        continue;
                    }

                    data[key] = tmp[key];
                }
            })();
        }

        mega.attr.set(prefKey, { cc: JSON.stringify(data) }, false, true).catch(dump);
    };

    const p = {
        init: async() => {
            if (!u_attr) {
                dump('Gallery preferences are disabled for guests...');
                return;
            }

            if (p.getItem) {
                return p;
            }

            if (!p.isInitializing) {
                p.isInitializing = Promise.resolve(mega.attr.get(u_attr.u, prefKey, false, true)).catch(dump);

                p.isInitializing
                    .then((res) => {
                        if (res && res.cc && typeof res.cc === 'string') {
                            tryCatch(() => {
                                data = JSON.parse(res.cc);
                            })();
                        }
                    })
                    .finally(() => {
                        if (p.isInitializing) {
                            delete p.isInitializing;
                        }
                    });
            }

            await p.isInitializing;

            if (!p.getItem) {
                /**
                 * Getting the value by traversing through the dotted key
                 * @param {String|String[]} keys Key(s) to use. Format is 'root.childKey1.childKey2...'
                 * @param {Object.<String, any>} d Data to traverse through recursively
                 * @returns {any}
                 */
                p.getItem = (keys, d) => {
                    if (typeof keys === 'string') {
                        keys = keys.split('.');
                    }

                    if (!d) {
                        d = data;
                    }

                    const key = keys.shift();

                    return (keys.length && d[key]) ? p.getItem(keys, d[key]) : d[key];
                };

                /**
                 * Removing the value by traversing through the dotted key
                 * @param {String|String[]} keys Key(s) to use. Format is 'root.childKey1.childKey2...'
                 * @param {Object.<String, any>} d Data to traverse through recursively
                 * @returns {void}
                 */
                p.removeItem = (keys, d) => {
                    if (typeof keys === 'string') {
                        keys = keys.split('.');
                    }

                    if (!d) {
                        d = data;
                    }

                    const key = keys.shift();

                    if (!d[key]) {
                        saveUserAttribute();
                        return;
                    }

                    if (keys.length) {
                        p.removeItem(keys, d[key]);
                    }
                    else {
                        delete d[key];
                        saveUserAttribute();
                    }
                };

                /**
                 * Updating the value by traversing through the dotted key
                 * @param {String|String[]} keys Key(s) to use. Format is 'root.childKey1.childKey2...'
                 * @param {any} value Value to set
                 * @param {Object.<String, any>} d Data to traverse through recursively
                 * @returns {void}
                 */
                p.setItem = (keys, value, d) => {
                    if (typeof keys === 'string') {
                        keys = keys.split('.');
                    }

                    if (!d) {
                        d = data;
                    }

                    const key = keys.shift();

                    if (!d[key]) {
                        d[key] = {};
                    }

                    if (!keys.length) {
                        d[key] = value;
                        saveUserAttribute();
                        return;
                    }

                    if (typeof d[key] !== 'object') {
                        d[key] = {};
                    }

                    p.setItem(keys, value, d[key]);
                };
            }

            return p;
        }
    };

    return p;
});
