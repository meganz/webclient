class GalleryNodeBlock {
    constructor(node, mode = 'a') {
        this.node = node;
        this.el = document.createElement('a');

        this.el.className = `data-block-view ${mega.sensitives.isSensitive(node) ? ' is-sensitive' : ''}`;
        this.el.id = node.h;

        if (mode === 'a') {
            const checkmark = document.createElement('i');
            checkmark.className = 'sprite-fm-mono icon-check';
            this.el.appendChild(checkmark);
        }

        this.spanEl = document.createElement('span');
        this.spanEl.className = 'data-block-bg content-visibility-auto';
        this.el.appendChild(this.spanEl);

        this.el.nodeBlock = this;
        this.isRendered = false;

        this.isVideo = M.isGalleryVideo(this.node);
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

    get isFav() {
        return !!this._fav;
    }

    /**
     * @param {Boolean} status True if the node is a favourite
     * @returns {void}
     */
    set isFav(status) {
        if (status === !!this._fav) {
            return;
        }

        let spanFav = this.spanEl.querySelector('.data-block-fav-icon');

        if (status) {
            spanFav = document.createElement('span');
            spanFav.className = 'data-block-fav-icon sprite-fm-mono icon-favourite-filled';
            this.spanEl.appendChild(spanFav);
        }
        else if (spanFav) {
            this.spanEl.removeChild(spanFav);
        }
    }

    fill(mode) {
        this.el.setAttribute('title', this.node.name);

        const spanMedia = document.createElement('span');
        this.spanEl.appendChild(spanMedia);
        spanMedia.className = 'item-type-icon-90';
        this.thumb = document.createElement('img');
        spanMedia.appendChild(this.thumb);

        if (this.isVideo) {
            spanMedia.classList.add('icon-video-90');
            this.spanEl.classList.add('video');

            const div = document.createElement('div');
            div.className = 'video-thumb-details';
            this.spanEl.appendChild(div);

            const playIcon = document.createElement('i');
            playIcon.className = 'video-thumb-play sprite-fm-mono icon-play-circle';
            this.spanEl.appendChild(playIcon);

            const spanTime = document.createElement('span');
            spanTime.textContent = secondsToTimeShort(MediaAttribute(this.node).data.playtime);
            div.appendChild(spanTime);
        }
        else {
            spanMedia.classList.add('icon-image-90');
        }

        this.isFav = !!this.node.fav;

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
        this.updNode = Object.create(null);
        this.type = mega.gallery.sections[id] ? 'basic' : 'discovery';
        this.shouldProcessScroll = true;
        this.inPreview = false;
        this.maxItems = {1: 3, 2: 5, 3: 10, 4: 15};

        this.clearRenderCache();
        this.setObserver();
    }

    get onpage() {
        return this.id === M.currentCustomView.nodeID || (M.gallery && M.currentrootid === M.RootID);
    }

    mainViewNodeMapper(h) {
        const n = M.d[h] || this.updNode[h] || false;

        console.assert(!!n, `Node ${h} not found...`);
        return n;
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

    setMode(type, pushHistory, changeLastSelection = false) {

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

        if (changeLastSelection) {
            mega.gallery.lastModeSelected = type;
        }

        if (type === 'a') {
            this.setZoom(this.zoom || 2);
        }
        else {
            delete this.zoom;
        }

        $('.gallery-tab-lnk', '#media-section-right-controls .gallery-section-tabs').removeClass('selected');
        $(`.gallery-tab-lnk-${this.mode}`, '#media-section-right-controls .gallery-section-tabs').addClass('selected');

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

        for (let i = yearKeys.length - 1; i > -1; i -= 3) {
            newStructure[yearKeys[i]] = {c: [this.groups.y[yearKeys[i]].c], n: [this.groups.y[yearKeys[i]].n[0]]};

            if (this.groups.y[yearKeys[i - 1]]) {

                newStructure[yearKeys[i]].sy = yearKeys[i - 1];
                newStructure[yearKeys[i]].c.push(this.groups.y[yearKeys[i - 1]].c);
                newStructure[yearKeys[i]].n.push(this.groups.y[yearKeys[i - 1]].n[0]);
            }
            if (this.groups.y[yearKeys[i - 2]]) {

                newStructure[yearKeys[i]].sy = yearKeys[i - 2];
                newStructure[yearKeys[i]].c.push(this.groups.y[yearKeys[i - 2]].c);
                newStructure[yearKeys[i]].n.push(this.groups.y[yearKeys[i - 2]].n[0]);
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
        if (
            n.fv // Improper file version
            || this.updNode[n.h] // The node is being added from another place
        ) {
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
            mega.gallery.fillMainView(this);
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
            mega.gallery.fillMainView(this);
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

        delay('gallery.reset-media-counts', mega.gallery.resetMediaCounts.bind(null, M.v));
    }

    // Update dom node names if changed
    updateNodeDetails(n) {

        const group = this.getGroup(n);
        const rcKeys = Object.keys(this.renderCache);

        for (let i = rcKeys.length; i--;) {
            if (rcKeys[i].startsWith(`y${group[1]}`) || rcKeys[i].startsWith(`m${group[2]}`) ||
                rcKeys[i].startsWith(`d${group[3]}`) || rcKeys[i].startsWith(`a${group[2]}`)) {

                const domNode = this.renderCache[rcKeys[i]].querySelector(`[id="${n.h}"]`);

                if (domNode) {
                    if (domNode.title !== n.name) {
                        domNode.title = n.name;
                    }

                    domNode.nodeBlock.isFav = n.fav;
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
            'contentContainerClasses': 'content px-4',
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

    render(keepMode) {
        if (keepMode) {
            this.setMode(mega.gallery.lastModeSelected, 2);
        }

        const rfBlock = $('.fm-right-files-block:not(.in-chat)', '.fmholder');
        const galleryHeader = $('#media-section-controls', rfBlock).add('#media-section-right-controls', rfBlock);

        galleryHeader.removeClass('hidden');
        $('#media-tabs', rfBlock).removeClass('hidden');
        $('.gallery-tabs-bl', galleryHeader).removeClass('hidden');
        $('.gallery-section-tabs', galleryHeader).toggleClass('hidden', M.currentdirid === 'favourites');
        rfBlock.removeClass('hidden');
        $('.files-grid-view.fm, .fm-blocks-view.fm, .fm-empty-section', rfBlock).addClass('hidden');
        mega.ui.secondaryNav.updateGalleryLayout();
        mega.ui.secondaryNav.hideBreadcrumb();

        if (pfid && !M.v) {
            $('.fm-empty-section', rfBlock).removeClass('hidden');
        }

        if (window.selectionManager) {
            window.selectionManager.hideSelectionBar();
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

        tryCatch(() => {
            galleryHeader.toggleClass('invisible', !M.v.length &&
                (this.id === 'photos' || this.id === 'images' || this.id === 'videos'));
        })();

        if (this.mode === 'a') {
            $.selectddUIgrid = '.gallery-type-a .gallery-view-scrolling';
            $.selectddUIitem = 'a';

            $($.selectddUIgrid).selectable({
                filter: $.selectddUIitem,
                cancel: '.ps__rail-y, .ps__rail-x, a, .checkdiv input',
                start: (e) => {
                    $.hideContextMenu(e);
                    $.hideTopMenu();
                    $.selecting = true;
                },
                stop: () => {
                    $.selecting = false;
                    mega.ui.mInfoPanel.reRenderIfVisible($.selected);

                    if ($.selected.length) {
                        this.checkOuterBounbdaries();
                    }
                    else {
                        this.clearSelections();
                    }
                },
                selecting: (_, ui) => {
                    this.updateGroupSelect($(ui.selecting));
                },
                unselecting: (_, ui) => {
                    this.updateGroupDeselect($(ui.unselecting));
                },
                appendTo: $.selectddUIgrid
            });
            $($.selectddUIgrid).trigger('selectablereinitialized');
        }
        else {
            const uiGrid = $('.gallery-view-scrolling');

            if (uiGrid.selectable('instance')) {
                uiGrid.selectable('destroy');
            }
        }
    }

    resetAndRender() {
        if (this.dynamicList && M.currentCustomView.original === this.id) {
            mega.gallery.fillMainView(this);
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

            if (this.mode !== 'a') {
                selectionManager.clear_selection();
            }

            if ($eTarget.hasClass('ui-selected')) {
                selectionManager.remove_from_selection(h);
                this.updateGroupDeselect($eTarget);
            }
            else {
                selectionManager.add_to_selection(h);
                this.updateGroupSelect($eTarget);
            }

            $.hideContextMenu(e);

            // If the side Info panel is visible, update the information in it
            mega.ui.mInfoPanel.reRenderIfVisible($.selected);

            return false;
        });

        $galleryBlock.rebind('contextmenu.galleryView', '.data-block-view', (e) => {

            if (this.mode !== 'a') {
                return false;
            }

            const { currentTarget: el } = e;

            if (el && M.d[el.id] && !$.selected.includes(el.id)) {
                selectionManager.clear_selection();
                this.clearSelections();
                selectionManager.add_to_selection(el.id);
                this.updateGroupSelect($(el));
            }

            $.hideContextMenu(e);
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

        $galleryBlock.rebind('dblclick.galleryView', 'a.data-block-view', e => {

            const $eTarget = $(e.currentTarget);

            if (this.mode === 'a') {
                const h = $eTarget.attr('id');
                const isVideo = e.currentTarget.nodeBlock.isVideo;

                if (isVideo) {
                    if (!isVideo.isVideo) {
                        M.addDownload([h]);
                        return;
                    }

                    $.autoplay = h;
                }

                // Close node Info panel as it's not applicable when opening Preview
                mega.ui.mInfoPanel.hide();

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

            selectionManager.clear_selection();
            this.clearSelections();

            this.setMode(e.currentTarget.attributes['data-folder'].value, 1, true);
            this.render(false);
        });

        $('.gallery-view-zoom-control > button', this.galleryBlock).rebind('click.galleryZoom', e => {
            e.stopPropagation();
            $.hideContextMenu(e);

            if (!this.dynamicList) {
                // @todo dropDynamicList() shall $.off()..?
                return false;
            }

            this.$middleBlock = this.findMiddleImage();

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
                const pageId = String(self.page).replace('fm/', '');

                if (this.inPreview && (pageId.length < 5 ? M.RootID === M.currentdirid : pageId === M.currentdirid)) {
                    return;
                }

                this.dropDynamicList();

                // Clear render cache to free memory
                this.clearRenderCache();

                if (pfid && !tpage.startsWith('folder/')) {
                    mega.ui.secondaryNav.updateGalleryLayout(true);
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

    getGroupMonthNodes(id, group) {
        if (!group) {
            group = this.getGroupById(id);
        }

        const monthNodes = [...group.n];
        let nextKey = (id - 0.00001).toFixed(5);

        while (true) {
            const nextGroup = this.getGroupById(nextKey);

            if (!nextGroup || !nextGroup.n.length) {
                break;
            }

            monthNodes.push(...nextGroup.n);
            nextKey = (nextKey - 0.00001).toFixed(5);
        }

        return monthNodes;
    }

    renderGroupMonthHeader(id, group, contentBlock) {
        const chId = `select-media-${id}`;
        const checkbox = new MCheckbox({
            id: chId,
            name: `select_media_${id}`,
            passive: true
        });

        const monthNodes = this.getGroupMonthNodes(id, group);
        let allSelected = $.selected.length >= monthNodes.length; // Presuming, based on length
        let someSelected = false;
        const selSet = new Set($.selected);

        for (let i = 0; i < monthNodes.length; i++) {
            if (selSet.has(monthNodes[i])) {
                someSelected = true;
            }
            else if (allSelected) {
                allSelected = false;
            }

            if (someSelected && !allSelected) {
                break;
            }
        }

        const checkDiv = checkbox.el.querySelector('.checkdiv');

        if (allSelected) {
            checkbox.checked = true;
        }
        else if (someSelected) {
            checkbox.checked = true;
            checkDiv.classList.add('checkboxMinimize');
        }

        checkbox.el.classList.add('flex', 'flex-row', 'items-center');
        delay(`media-checkbox-${chId}`, () => {
            checkbox.onChange = (newVal) => {
                checkbox.checked = newVal;
                const nodes = this.getGroupMonthNodes(id, group);

                if (newVal) {
                    for (let i = 0; i < nodes.length; i++) {
                        selectionManager.add_to_selection(nodes[i]);
                    }
                }
                else {
                    for (let i = 0; i < nodes.length; i++) {
                        selectionManager.remove_from_selection(nodes[i]);
                    }
                }

                checkDiv.classList.remove('checkboxMinimize');
            };
        });

        const dateTitle = document.createElement('div');
        dateTitle.classList.add(
            'timeline-date-title',
            'px-2',
            'pb-2',
            'pt-8',
            'flex',
            'flex-row',
            'gap-2',
            'items-center'
        );

        const dateLabel = document.createElement('div');
        dateLabel.classList.add('font-bold', 'text-color-high');
        dateLabel.textContent = group.l;

        const countLabel = document.createElement('div');
        countLabel.className = 'text-color-medium font-body-2';
        countLabel.textContent = mega.icu.format(l.items_count, monthNodes.length);

        dateTitle.appendChild(checkbox.el);
        dateTitle.appendChild(dateLabel);
        dateTitle.appendChild(countLabel);
        contentBlock.appendChild(dateTitle);
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

            if (group.l) {
                groupWrap.classList.add('showDate');
                contentBlock.dataset.date = group.l;

                if (this.mode === 'a') {
                    this.renderGroupMonthHeader(id, group, contentBlock);
                }
            }

            let len = group.n.length;

            if (group.max) {
                len = Math.min(group.max, group.n.length);
            }

            for (let i = 0; i < len; i++) {

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
                this.renderNodeExtraDay(group, groupWrap, contentBlock, len);
            }
            else if (this.mode === 'm') {
                this.renderNodeExtraMonth(group, groupWrap, contentBlock, len);
            }
        }

        this.clearSelection(id);

        return this.renderCache[cacheKey];
    }

    renderNodeExtraMonth(group, groupWrap, contentBlock, l) {

        const dateblock = document.createElement('a');

        dateblock.classList.add('gallery-date-block', 'flex', 'flex-row', 'items-center');

        // Special month corrective for Vietnamese.
        if (locale === 'vi') {
            group.ml = group.ml.toLowerCase();
        }

        $(dateblock).safeHTML(group.l.replace(group.ml, `<span class="mr-2">${group.ml}</span>`));

        const iconBlock = document.createElement('i');

        iconBlock.classList.add('sprite-fm-mono', 'icon-arrow-right');
        dateblock.appendChild(iconBlock);
        groupWrap.prepend(dateblock);

        groupWrap.classList.add(`layout-${l}${group.r ? '-2' : ''}`);
    }

    renderNodeExtraDay(group, groupWrap, contentBlock, l) {
        // c is only numeric 0 when it is sub block
        groupWrap.classList.add(`layout-${l}${group.c === 0 ? '-2' : ''}`);

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
                    selectedInCache[i].classList.remove('ui-selected', 'ui-selecting');
                }
            }
        }
    }

    renderNode(h) {
        const node = M.d[h] || new MegaNode(this.updNode[h]);

        if (!node) {
            return;
        }

        const elm = new GalleryNodeBlock(node, this.mode);

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
                const maxItemsInRow = this.maxItems[this.zoom];
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
            const headerHeight = group.l ? 64 : 0;
            const maxItemsInRow = this.maxItems[this.zoom];
            const blockSize = this.dynamicList.$content.width() / maxItemsInRow;

            return Math.ceil(group.n.length / maxItemsInRow) * blockSize + headerHeight;
        }

        if (this.mode === 'y') {
            return 256 + 8;
        }

        if (this.mode === 'd') {
            return 285 + 8;
        }

        if (this.mode === 'm') {
            return 330 + 8; // height + padding
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

            mega.gallery.fillMainView(this);
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

    /**
     * @param {jQuery} $el Cell element
     * @returns {void}
     */
    updateGroupSelect($el) {
        if (this.mode !== 'a') {
            return;
        }

        const groupId = $el.closest('.content-row').attr('id');

        if (!groupId) {
            return;
        }

        delay(`gallery.check-select-${groupId}`, () => {
            const initGroupId = `${Math.ceil(groupId.replace('gallery-', ''))}.00000`;
            const monthNodes = this.getGroupMonthNodes(initGroupId);
            let all = true;
            let some = false;
            const selSet = new Set($.selected);

            for (let i = 0; i < monthNodes.length; i++) {
                if (selSet.has(monthNodes[i])) {
                    some = true;
                }
                else {
                    all = false;
                }

                // All conditions met
                if (some && !all) {
                    break;
                }
            }

            const cacheBlock = this.renderCache[`a${initGroupId}`];
            const checkbox = cacheBlock
                ? cacheBlock.querySelector(`#${groupId.replace('.', '\\.')} .checkdiv`)
                : null;

            if (!checkbox) {
                return;
            }

            const { mComponent: mc } = checkbox.parentNode;
            mc.checked = all || some;

            if (all || !some) {
                checkbox.classList.remove('checkboxMinimize');
            }
            else {
                checkbox.classList.add('checkboxMinimize');
            }
        }, 100);
    }

    /**
     * @param {jQuery} $el Cell element
     * @returns {void}
     */
    updateGroupDeselect($el) {
        const groupId = $el.closest('.content-row').attr('id');

        if (!groupId) {
            return;
        }

        delay(`gallery.check-select-${groupId}`, () => {
            const initGroupId = `${Math.ceil(groupId.replace('gallery-', ''))}.00000`;
            let someSelected = false;

            if ($.selected.length) {
                const selSet = new Set($.selected);
                const monthNodes = this.getGroupMonthNodes(initGroupId);

                for (let i = 0; i < monthNodes.length; i++) {
                    if (selSet.has(monthNodes[i])) {
                        someSelected = true;
                        break;
                    }
                }
            }

            const cacheBlock = this.renderCache[`a${initGroupId}`];
            const checkbox = cacheBlock
                ? cacheBlock.querySelector(`#${groupId.replace('.', '\\.')} .checkdiv`)
                : null;

            if (!checkbox) {
                return;
            }

            const { mComponent: mc } = checkbox.parentNode;

            if (someSelected) {
                checkbox.classList.add('checkboxMinimize');
            }
            else {
                mc.checked = false;
                checkbox.classList.remove('checkboxMinimize');
            }
        }, 100);
    }

    enableGroupChecks() {
        const blocks = Object.values(this.renderCache);
        let i = blocks.length;

        while (--i >= 0) {
            const checkboxes = blocks[i].querySelectorAll('.content-row .checkdiv');
            let j = checkboxes.length;

            while (--j >= 0) {
                const ch = checkboxes[j];
                ch.parentNode.mComponent.checked = true;
                ch.classList.remove('checkboxMinimize');
            }
        }
    }

    clearSelections() {
        const blocks = Object.values(this.renderCache);
        let i = blocks.length;

        while (--i >= 0) {
            const checkboxes = blocks[i].querySelectorAll('.content-row .checkdiv');
            let j = checkboxes.length;

            while (--j >= 0) {
                const ch = checkboxes[j];
                ch.parentNode.mComponent.checked = false;
                ch.classList.remove('checkboxMinimize');
            }

            const selected = blocks[i].querySelectorAll('.ui-selected');
            j = selected.length;

            while (--j >= 0) {
                selected[j].classList.remove('ui-selected', 'ui-selecting');
            }
        }
    }

    cellInSelectArea(index, groupOffset, offset, perRow, cellSize, helperPos) {
        const { top, right, bottom, left } = helperPos;
        const offsetTop = groupOffset + offset + parseInt(index / perRow) * cellSize;
        const offsetLeft = (index % perRow) * cellSize;
        const rightEdge = offsetLeft + cellSize;
        const bottomEdge = offsetTop + cellSize;

        const fitVert = (offsetTop >= top && offsetTop <= bottom)
            || (bottomEdge >= top && bottomEdge <= bottom);
        const fitHoriz = (offsetLeft <= right && offsetLeft >= left)
            || (rightEdge >= left && rightEdge <= right);

        return (fitVert && (fitHoriz || offsetLeft < left && rightEdge > right))
            || fitHoriz && offsetTop < top && bottomEdge > bottom && fitHoriz;
    }

    checkOuterBounbdaries() {
        const sel = $($.selectddUIgrid).selectable('instance');

        if (!sel) {
            return;
        }

        const top = sel.helper[0].offsetTop;
        const left = sel.helper[0].offsetLeft;
        const right = left + sel.helper[0].offsetWidth;
        const bottom = top + sel.helper[0].offsetHeight;
        const scrollTop = this.dynamicList.getScrollTop();
        const containerWidth = this.dynamicList.$content.width();

        // No need to check, the drag select happened within the area
        if (top >= scrollTop && bottom <= scrollTop + this.dynamicList.listContainer.clientHeight) {
            return;
        }

        const perRow = this.maxItems[this.zoom];
        const cellSize = containerWidth / perRow;
        const itemKeys = Object.values(this.dynamicList.items);
        let i = itemKeys.length;

        while (--i >= 0) {
            const cache = this.renderCache[`a${itemKeys[i]}`];

            if (!cache) {
                continue; // Has not been rendered yet, so cannot be out by default
            }

            const groupOffset = this.dynamicList._offsets[itemKeys[i]];

            if (
                groupOffset > bottom
                || groupOffset + this.dynamicList._heights[itemKeys[i]] < top
            ) {
                continue; // The entire item is out of the reach
            }

            const group = this.getGroupById(itemKeys[i]);
            const offset = (group.l ? 64 : 0);
            const cells = cache.querySelectorAll('.data-block-view');

            for (let i = 0; i < cells.length; i++) {
                const cell = cells[i];

                if (this.cellInSelectArea(i, groupOffset, offset, perRow, cellSize, { top, right, bottom, left })) {
                    selectionManager.add_to_selection(cell.id);
                }
                else {
                    selectionManager.remove_from_selection(cell.id);
                    cell.classList.remove('ui-selected', 'ui-selecting');
                }
            }
        }
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

        const rubTree = array.to.object(M.getTreeHandles(M.RubbishID), true);

        subs = subs.filter(h => {
            const n = M.d[h];
            return !n.t
                && !this.nodes[n.h]
                && !rubTree[h]
                && !rubTree[n.p]
                && !n.fv
                && M.isGalleryNode(n)
                && mega.sensitives.shouldShowNode(n);
        }).sort(this.sortByMtime.bind(this));

        for (const h of subs) {
            const n = M.d[h];
            this.nodes[n.h] = this.setGroup(n)[0];
            M.v.push(n);
        }

        this.mergeYearGroup();
        this.filterMonthGroup();

        super.setViewAfter();
    }

    checkGalleryUpdate(n) {
        if (!M.isGalleryNode(n)) {
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
                        this.updateNodeDetails(n);
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
                this.updateNodeDetails(n);
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

        const nodes = await mega.gallery.initialiseMediaNodes(this.typeFilter.bind(this));

        this.updNode = Object.create(null);

        // This sort is needed for building groups, do not remove
        const sortFn = M.sortByModTimeFn2();
        nodes.sort((a, b) => sortFn(a, b, -1));

        if (!Array.isArray(nodes)) {
            if (d) {
                console.timeEnd(`MegaGallery: ${this.id}`);
            }

            return;
        }

        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];

            if (!this.nodes[n.h]) {
                this.nodes[n.h] = this.setGroup(n)[0];
            }
        }

        mega.gallery.fillMainView(this);

        this.mergeYearGroup();
        this.filterMonthGroup();

        super.setViewAfter();
    }

    checkGalleryUpdate(n) {
        const cameraTree = MegaGallery.getCameraHandles();

        if (!n.t && this.typeFilter(n, cameraTree)) {
            const ignoreHandles = array.to.object(
                [...M.getTreeHandles('shares'), ...M.getTreeHandles(M.RubbishID)],
                true
            );

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
                this.updateNodeDetails(n);

                if (mega.gallery.pendingFaBlocks[n.h] && n.fa.includes(':1*')) {
                    MegaGallery.addThumbnails(Object.values(mega.gallery.pendingFaBlocks[n.h]));
                    delete mega.gallery.pendingFaBlocks[n.h];
                }
            }

            delay('gallery.reset-media-counts', mega.gallery.resetMediaCounts.bind(null, M.v));
        }
    }
}

mega.gallery = Object.create(null);
mega.gallery.nodeUpdated = false;
mega.gallery.albumsRendered = false;
mega.gallery.publicSet = Object.create(null);
mega.gallery.titleControl = null;
mega.gallery.typeControl = null;
mega.gallery.emptyBlock = null;
mega.gallery.lastModeSelected = 'a';
mega.gallery.pendingFaBlocks = {};
mega.gallery.pendingThumbBlocks = {};

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

mega.gallery.fillMainView = (list, mapper) => {
    'use strict';

    if (list instanceof MegaGallery) {
        mapper = list.mainViewNodeMapper.bind(list);
        list = Object.keys(list.nodes);
    }
    const {length} = list;

    if (mapper) {
        list = list.map(mapper);
    }
    M.v = list.filter(Boolean);

    console.assert(M.v.length === length, 'check this... filtered invalid entries.');
};

mega.gallery.handleNodeRemoval = tryCatch((n) => {
    'use strict';

    if (M.albums) {
        mega.gallery.albums.onCDNodeRemove(n);
        mega.gallery.nodeUpdated = true;
    }
    else if (M.gallery) {
        mega.gallery.checkEveryGalleryDelete(n.h);
        mega.gallery.albums.onCDNodeRemove(n);
    }
    else {
        mega.gallery.nodeUpdated = true;
        mega.gallery.albumsRendered = false;
    }
});

/**
 * Checking if we want to see add to album option in the current viewing page
 * @returns {Boolean}
 */
mega.gallery.canShowAddToAlbum = () => {
    'use strict';

    const areas = {
        'shares': true,
        's4': true,
        [M.RubbishID]: true,
        [M.getNodeByHandle(M.BackupsId).p]: true
    };

    return !areas[M.currentrootid];
};

/**
     * Adding a loading icon to the cell
     * @param {HTMLElement} el DOM Element to add the loading icon to
     * @param {Boolean} isVideo Whether to attach loading icon as for a video or an image
     * @returns {void}
     */
mega.gallery.setShimmering = (el) => {
    'use strict';

    const img = el.querySelector('img');

    // Image is already loaded
    if (img && img.complete) {
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

mega.gallery.handleNodeUpdate = (n) => {
    'use strict';

    if (M.gallery) {
        tryCatch(() => mega.gallery.checkEveryGalleryUpdate(n))();
        mega.gallery.albumsRendered = false;
    }
    else if (M.albums) {
        tryCatch(() => mega.gallery.albums.onCDNodeUpdate(n))();
        mega.gallery.nodeUpdated = true;
    }
    else {
        mega.gallery.nodeUpdated = true;
        mega.gallery.albumsRendered = false;
    }
};

mega.gallery.clearMdView = () => {
    'use strict';
    mega.ui.secondaryNav.updateGalleryLayout(true);

    if (M.gallery) {
        $('.gallery-tabs-bl').addClass('hidden');
        mega.ui.secondaryNav.updateLayoutButton();

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

    const rfBlock = $('.fm-right-files-block', '.fmholder');

    if (noMoreFiles || M.currentrootid === M.RootID &&
        (!M.c[M.currentdirid] || !Object.values(M.c[M.currentdirid]).length)) {
        $('.fm-empty-folder', rfBlock).removeClass('hidden');
        $(`.fm-empty-${M.currentdirid}`, rfBlock).addClass('hidden');
        return;
    }

    if (!mega.gallery.emptyBlock) {
        mega.gallery.emptyBlock = new GalleryEmptyBlock('.pm-main > .fm-right-files-block');
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
    mega.gallery.resetAll();
};

/**
 * @param {HTMLElement} menuNode The menu node to work with
 * @returns {Promise<void>}
 */
mega.gallery.updateMediaPath = async() => {
    'use strict';

    const { menuNode } = mega.ui.topmenu;

    if (!menuNode) {
        return;
    }

    if (!u_attr || pfid) {
        return;
    }

    const res = await mega.ccPrefs.getItem('web.locationPref.photos');

    if (typeof res !== 'string' || res.length === 0) {
        return;
    }

    const lnk = menuNode.querySelector('.media');

    if (lnk) {
        lnk.href = `/fm/${res}`;
        lnk.dataset.section = lnk.href;
        lnk.dataset.locationPref = res;
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

    const $headerBlock = $('.gallery-tabs-bl', '#media-section-controls');
    let gallery = mega.gallery[M.currentdirid];

    $headerBlock.removeClass('hidden');
    $('#media-section-controls, #media-tabs', '.fm-right-files-block').removeClass('hidden');
    $('.fm-notification-block.new-feature-rewind-notification', '.fm-right-files-block').addClass('hidden');
    $('.gallery-close-discovery', $headerBlock).addClass('hidden');

    mega.gallery.setTabs();

    if (!mega.gallery.typeControl) {
        mega.gallery.typeControl = new mega.gallery.GalleryTypeControl('.gallery-tabs-bl .gallery-section-title');
    }

    if (!mega.gallery.titleControl) {
        mega.gallery.titleControl = new mega.gallery.GalleryTitleControl('.gallery-tabs-bl .gallery-section-title');
    }

    $('.media-filter-reset', $headerBlock).rebind('click.galleryReset', () => {
        M.openFolder('photos');
        mega.gallery.titleControl.clearLocationPreference();
    });

    // cleanup existing (FM-side) MegaRender and such.
    M.v = [];
    $.selected = [];
    M.gallery |= 1;
    M.renderMain();
    delay.cancel('rmSetupUI');

    M.onTreeUIOpen(M.currentdirid);

    if (window.pfcol) {
        return mega.gallery.albums.initPublicAlbum();
    }

    if (pfid || M.gallery && !M.albums && !M.isGalleryPage()) {
        id = !id || typeof id !== 'string' ? M.currentdirid : id;
        if (id.startsWith('device-centre/')) {
            id = id.split('/')[2];
            mega.devices.ui.handleAddBtnVisibility();
        }
        $('.view-links', '.gallery-tabs-bl').removeClass('hidden');
    }
    else {
        $('.view-links', '.gallery-tabs-bl').addClass('hidden');
    }

    // This keeps the banner persistent when navigating from Recents to Gallery
    $('.fm-right-files-block').addClass('visible-notification');

    const section = mega.gallery.sections[M.currentdirid];
    const $mdProhibited = $([
        '.media-tabs',
        '.gallery-section-title *'
    ].join(','), '.fm-right-files-block');

    const rightSectionControls = document.getElementById('media-section-right-controls');
    if (id) {
        rightSectionControls.classList.add('wrap');
    }
    else {
        rightSectionControls.classList.remove('wrap');
    }
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
        $mdProhibited.addClass('hidden');
    }
    else if (section) {
        mega.gallery.titleControl.filterSection = M.currentdirid;
        mega.gallery.titleControl.title = section.title;
        mega.gallery.titleControl.icon = section.icon;
        mega.gallery.titleControl.removeTooltipFromTitle();
        mega.gallery.titleControl.toggleHighlight(M.currentdirid);
        mega.gallery.typeControl.updateTitle(section.root);
        $mdProhibited.removeClass('hidden');
    }

    if (!gallery) {
        if (!pfid) {
            await M.getCameraUploads().catch(nop);
        }

        if (id) {
            gallery = mega.gallery.discovery = new MegaTargetGallery(id);
        }
        else if (section) {
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

        mega.gallery.resetMediaCounts(M.v);

        if (id) {
            onIdle(fmtopUI);
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
        else if (width <= MEGAImageElement.THUMBNAIL_SIZE) {
            const urlCache = thumbnails.get(fa);

            if (urlCache) {
                nodeBlocks[i].setThumb(urlCache, fa);
            }
            else if (thumbBlocks[h]) {
                thumbBlocks[h].push(nodeBlocks[i]);
            }
            else {
                thumbBlocks[h] = [nodeBlocks[i]];
            }
            continue;
        }

        if (GalleryNodeBlock.thumbCache[key]) {
            nodeBlocks[i].setThumb(GalleryNodeBlock.thumbCache[key], fa);
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

MegaGallery.handleIntersect = tryCatch((entries, gallery) => {
    'use strict';

    const toFetchAttributes = [];

    for (let i = 0; i < entries.length; i++) {
        const { isIntersecting, target: { nodeBlock } } = entries[i];

        if (!nodeBlock) {
            console.assert(false, 'MegaGallery.handleIntersect: nodeBlock not available.');
            continue;
        }

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
});

MegaGallery.handleResize = SoonFc(200, (entries) => {
    'use strict';

    const toFetchAttributes = [];
    const fill = tryCatch((entry) => {
        const {contentRect, target: {nodeBlock}, target: {nodeBlock: {thumb}}} = entry;

        if (contentRect.width > thumb.naturalWidth) {
            toFetchAttributes.push(nodeBlock);
        }
    });

    for (let i = 0; i < entries.length; i++) {

        fill(entries[i]);
    }

    if (toFetchAttributes.length) {
        MegaGallery.addThumbnails(toFetchAttributes);
    }
});

MegaGallery.dbAction = async(p) => {
    'use strict';

    if (fmdb && fmdb.db !== null && fmdb.crashed !== 666) {
        const res = [];
        const parents = Object.create(null);

        await dbfetch.geta(M.getTreeHandles(M.RootID)).catch(nop);

        p = p || M.RootID;
        await dbfetch.media(9e3, (r) => {
            for (let i = r.length; i--;) {
                const n = r[i];

                if (!parents[n.p]) {
                    parents[n.p] = 1 + (M.getNodeRoot(n.p) === p);
                }
                if (parents[n.p] > 1) {
                    res.push(n);
                }
            }
        });

        return res;
    }

    throw new Error('FMDB Unavailable.');
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
            filterFn: () => true,
            title: l.gallery_all_locations
        },
        [mega.gallery.secKeys.cuphotos]: {
            path: mega.gallery.secKeys.cuphotos,
            icon: 'photos',
            root: 'photos',
            filterFn: (n, cameraTree) => cameraTree && cameraTree.includes(n.p),
            title: l.gallery_camera_uploads
        },
        [mega.gallery.secKeys.cdphotos]: {
            path: mega.gallery.secKeys.cdphotos,
            icon: 'photos',
            root: 'photos',
            filterFn: (n, cameraTree) => !cameraTree || !cameraTree.includes(n.p),
            title: l.gallery_from_cloud_drive
        },
        images: {
            path: 'images',
            icon: 'images',
            root: 'images',
            filterFn: n => M.isGalleryImage(n),
            title: l.gallery_all_locations
        },
        [mega.gallery.secKeys.cuimages]: {
            path: mega.gallery.secKeys.cuimages,
            icon: 'images',
            root: 'images',
            filterFn: (n, cameraTree) => cameraTree && cameraTree.includes(n.p) && M.isGalleryImage(n),
            title: l.gallery_camera_uploads
        },
        [mega.gallery.secKeys.cdimages]: {
            path: mega.gallery.secKeys.cdimages,
            icon: 'images',
            root: 'images',
            filterFn: (n, cameraTree) => (!cameraTree || !cameraTree.includes(n.p)) && M.isGalleryImage(n),
            title: l.gallery_from_cloud_drive
        },
        videos: {
            path: 'videos',
            icon: 'videos',
            root: 'videos',
            filterFn: n => M.isGalleryVideo(n),
            title: l.gallery_all_locations
        },
        [mega.gallery.secKeys.cuvideos]: {
            path: mega.gallery.secKeys.cuvideos,
            icon: 'videos',
            root: 'videos',
            filterFn: (n, cameraTree) => cameraTree && cameraTree.includes(n.p) && M.isGalleryVideo(n),
            title: l.gallery_camera_uploads
        },
        [mega.gallery.secKeys.cdvideos]: {
            path: mega.gallery.secKeys.cdvideos,
            icon: 'videos',
            root: 'videos',
            filterFn: (n, cameraTree) => (!cameraTree || !cameraTree.includes(n.p)) && M.isGalleryVideo(n),
            title: l.gallery_from_cloud_drive
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

lazy(mega.gallery, 'setTabs', () => {
    'use strict';

    /**
     * @param {0|1} section 0 - Media, 1 - Albums
     * @returns {void}
     */
    return (section = 0) => {
        let tabs = mega.gallery.mediaControl;

        if (!tabs) {
            const tabClasses = 'py-3 px-6';
            tabs = new MTabs();

            document.querySelector('#media-tabs').prepend(tabs.el);

            tabs.el.classList.add('media-tabs', 'px-6', 'justify-start');
            tabs.tabs = [
                {
                    label: l.photos_timeline,
                    click: () => {
                        let loc = 'photos';
                        const { titleControl: tc } = mega.gallery;

                        if (tc && tc.mediaLink && tc.mediaLink.dataset.locationPref) {
                            loc = tc.mediaLink.dataset.locationPref;
                        }

                        loadSubPage(`fm/${loc}`);
                    },
                    classes: tabClasses
                },
                {
                    label: l.albums,
                    click: () => {
                        loadSubPage('fm/albums');
                    },
                    classes: tabClasses
                }
            ];

            mega.gallery.mediaControl = tabs;
        }

        tabs.activeTab = section;
    };
});

lazy(mega.gallery, 'resetMediaCounts', () => {
    'use strict';

    /**
     * @param {MegaNode[]} [nodes] The nodes to use for count
     * @returns {void}
     */
    return () => {
        if (mega.ui.secondaryNav.cardComponent) {
            mega.ui.secondaryNav.cardComponent.update();
        }
    };
});

lazy(mega.gallery, 'initialiseMediaNodes', () => {
    'use strict';

    return async(filterFn) => {
        const cameraTree = MegaGallery.getCameraHandles();
        const disallowedFolders = array.to.object([
            ...M.getTreeHandles(M.RubbishID),
            ...M.getTreeHandles('shares'),
            ...(M.BackupsId ? M.getTreeHandles(M.BackupsId) : []),
            ...M.getTreeHandles('s4')
        ], true);

        const allowedInMedia = n => n && !n.t
            && !disallowedFolders[n.p]
            && !n.fv
            && n.s
            && M.isGalleryNode(n)
            && mega.sensitives.shouldShowNode(n)
            && (!filterFn || filterFn(n, cameraTree));

        if (!MegaGallery.dbActionPassed) {
            const dbNodes = await MegaGallery.dbAction()
                .catch(() => { // Fetching all available nodes in case of DB failure
                    console.warn('Local DB failed. Fetching existing FM nodes.');
                    return Object.values(M.d);
                });

            await dbfetch.geta(dbNodes.map(({ h }) => h)).catch(nop);
            MegaGallery.dbActionPassed = true;
        }

        return Object.values(M.d).filter(allowedInMedia);
    };
});
