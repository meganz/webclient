class GalleryNodeBlock {
    constructor(node) {
        this.node = node;
        this.el = document.createElement('a');
        this.el.className = 'data-block-view';
        this.el.id = node.h;

        this.spanEl = document.createElement('span');
        this.spanEl.className = 'data-block-bg content-visibility-auto';
        this.el.append(this.spanEl);

        this.el.nodeBlock = this;
        this.isRendered = false;

        this.isVideo = mega.gallery.isGalleryVideo(this.node);
    }

    setThumb(dataUrl) {
        this.spanEl.classList.add('thumb');
        this.thumb.src = dataUrl;

        if (this.el.nextSibling && this.el.nextSibling.classList.contains('gallery-block-bg-wrap')) {
            this.el.nextSibling.querySelector('img').src = dataUrl;
        }
    }

    fill(mode) {
        this.el.setAttribute('title', this.node.name);

        const spanMedia = document.createElement('span');
        this.spanEl.append(spanMedia);
        spanMedia.className = 'block-view-file-type file sprite-fm-mono';
        this.thumb = document.createElement('img');
        spanMedia.append(this.thumb);

        if (this.isVideo) {
            spanMedia.classList.add('icon-videos', 'video');
            this.spanEl.classList.add('video');

            const div = document.createElement('div');
            div.className = 'video-thumb-details';
            this.spanEl.append(div);

            const spanTime = document.createElement('span');
            spanTime.textContent = secondsToTimeShort(MediaAttribute(this.node).data.playtime);
            div.append(spanTime);
        }
        else {
            spanMedia.classList.add('icon-images', 'image');
        }

        const spanFav = document.createElement('span');
        spanFav.className = 'data-block-fav-icon sprite-fm-mono icon-favourite-filled';
        this.spanEl.append(spanFav);

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
GalleryNodeBlock.maxGroupChunkSize = 60;
GalleryNodeBlock.thumbCacheSize = 500;

GalleryNodeBlock.getTimeString = (key, format) => {
    'use strict';

    const cacheKey = key + '-' + format;

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
        return this.id === M.currentCustomView.nodeID;
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

        if (pushHistory === 2) {
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

        // This is existing year in view, nice.
        if (this.groups.y[ts]) {

            this.groups.y[ts].c[0]++;

            if (this.nodes[n.h] > this.nodes[this.groups.y[ts].n[0]]) {

                this.groups.y[ts].n[0] = n.h;

                if (this.dynamicList) {
                    this.clearRenderCache(`y${ts}`);

                    if (this.mode === 'y') {
                        this.throttledListChange(sts);
                    }
                }
            }
        }
        else {

            // This is secondary year of existing year in the view, good.
            const yearGroups = Object.keys(this.groups.y);

            for (var i = yearGroups.length; i--;) {

                if (this.groups.y[yearGroups[i]].sy === sts) {

                    this.groups.y[yearGroups[i]].c[1]++;

                    if (this.nodes[n.h] > this.nodes[this.groups.y[yearGroups[i]].n[1]]) {

                        this.groups.y[yearGroups[i]].n[1] = n.h;

                        if (this.dynamicList && this.mode === 'y') {

                            this.clearRenderCache(`y${ts}`);
                            this.throttledListChange(sts);
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

                if (this.nodes[n.h] > this.nodes[sameDayNode]) {
                    group.n.splice(sameDayNodeIndex, 1, n.h);
                }

                // This is only one day month
                if (group.n.length === 1 && this.groups.d[dts].n.length > 1) {
                    group.extn = this.groups.d[dts].n[1];
                }
            }
            else {
                delete group.extn;

                group.n.push(n.h);
                group.n.sort((a, b) => this.nodes[b] - this.nodes[a]);
                group.n = group.n.slice(0, 4);
            }

            if (this.dynamicList && this.mode === 'm' && (group.extn !== compareGroup.extn ||
                !group.n.every(h => compareGroup.n.includes(h)))) {

                this.clearRenderCache(`m${ts}`);
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

            if (this.groups.d[key].n.length === 4) {

                const itemsToMove = this.groups.d[key].n.splice(2, 2);

                this.groups.d[key - 0.5] = {l: '', c: 0, mc: 0,  n: [...itemsToMove]};
                this.groups.d[key - 0.5].n.push(h);
            }
            else {
                this.groups.d[key].n.push(h);
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

            const items = this.dynamicList.items;

            for (let i = 0; i < items.length; i++) {

                if (reGrouped[items[i]]) {

                    delete reGrouped[items[i]];
                    reGroupedCount--;

                    if (this.onpage) {
                        this.clearRenderCache('y' + items[i]);
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
            GalleryNodeBlock.revokeThumb(M.d[h].fa);
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
            this.removeNodeFromGroups({h: h, mtime: this.nodes[h]});
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

        this.dynamicList = new MegaDynamicList(document.querySelector('.gallery-view-scrolling'), {
            'contentContainerClasses': 'content',
            'itemRenderFunction': this.renderGroup.bind(this),
            'itemHeightCallback': this.getGroupHeight.bind(this),
            'onResize': this.throttledResize.bind(this),
            'onScroll': this.throttledOnScroll.bind(this),
            'perfectScrollOptions': {
                'handlers': ['click-rail', 'drag-scrollbar', 'wheel', 'touch'],
                'minScrollbarLength': 20
            }
        });
    }

    render(rewriteModeByRoot, reset) {
        if (rewriteModeByRoot !== false && mega.gallery.sections[M.currentdirid]) {
            const modeResetIsNeeded = reset === true
                && M.currentdirid === mega.gallery.sections[M.currentdirid].root
                && (
                    M.currentdirid === M.previousdirid
                    || (
                        mega.gallery.sections[M.previousdirid]
                        && mega.gallery.sections[M.previousdirid].root === mega.gallery.sections[M.currentdirid].root
                    )
                );

            if (modeResetIsNeeded) {
                this.setMode('a', 2, true);
            }
            else if (mega.gallery.rootMode[mega.gallery.sections[M.currentdirid].root]
                && this.mode !== mega.gallery.rootMode[mega.gallery.sections[M.currentdirid].root]) {
                this.setMode(mega.gallery.rootMode[mega.gallery.sections[M.currentdirid].root], 2);
            }
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

                this.dropDynamicList();

                // Clear render cache for free memory
                this.clearRenderCache();

                // Clear thumbnails to free memory if target page is not gallery anymore
                if (M.isCustomView(tpage).type !== 'gallery') {
                    mBroadcaster.removeListener(this.beforePageChangeListener);
                    delete this.beforePageChangeListener;

                    // Clear discovery
                    if (this.isDiscovery) {
                        delete mega.gallery.discovery;

                        if (mega.gallery.mdReporter.runId) {
                            mega.gallery.mdReporter.stop();
                        }
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

        $(window).rebind('popstate.galleryview', e => {
            if (mega.gallery.titleControl) {
                mega.gallery.titleControl.hide();
            }

            if (e.originalEvent.state.galleryMode && this.id === M.currentdirid) {
                this.setMode(e.originalEvent.state.galleryMode, undefined, true);
                this.render(false);
            }
        });

        if (this.isDiscovery) {
            $('.gallery-close-discovery').rebind('click.exitDiscovery', () => {
                M.openFolder(this.id);
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

                    extraNode.removeAttribute('data-date');
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
        dateblock.append(iconBlock);
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

            wrap.append(bgimg);
            contentBlock.append(wrap);
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

        if (this.nodes) {

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

GalleryNodeBlock.revokeThumb = (fa) => {
    'use strict';

    if (MegaGallery.thumbCache && MegaGallery.thumbCache[fa]) {
        URL.revokeObjectURL(MegaGallery.thumbCache[fa]);
        delete MegaGallery.thumbCache[fa];
    }
};

class MegaTargetGallery extends MegaGallery {

    async setView() {

        if (super.setView() === false) {
            return false;
        }

        const handles = this.id === 'photos' ? MegaGallery.getCameraHandles() : M.getTreeHandles(this.id);
        let subs = [];

        await dbfetch.geta(handles).catch(nop);

        for (let i = handles.length; i--;) {
            if (!M.c[handles[i]]) {
                console.error('Gallery cannot find handle ' + handles[i]);
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
        if (!n.t && mega.gallery.isGalleryNode(n)) {
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

            dbfetch.geta(handles)
                .then(() => {
                    MegaGallery.dbActionPassed = true;

                    this.updNode = {};

                    // Initializing albums here for the performace's sake
                    if (mega.gallery.albums.awaitingDbAction) {
                        mega.gallery.albums.init();
                    }
                })
                .catch(nop);
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

            if (this.nodes[n.h] || n.t || sharesTree.includes(n.p) || (this.id === 'favourites' && !n.fav)) {
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
                    MegaGallery.addThumbnails([mega.gallery.pendingFaBlocks[n.h]]);
                    delete mega.gallery.pendingFaBlocks[n.h];
                }
            }
        }
    }
}

mega.gallery = Object.create(null);
mega.gallery.nodeUpdated = false;
mega.gallery.albumsRendered = false;
mega.gallery.titleControl = null;
mega.gallery.emptyBlock = null;
mega.gallery.rootMode = {photos: 'a', images: 'a', videos: 'a'};
mega.gallery.pendingFaBlocks = {};

/**
 * Same as is_image3(), additionally checking whether the node meet requirements for photo/media gallery.
 * @param {String|MegaNode|Object} n An ufs-node, or filename
 * @param {String} [ext] Optional filename extension
 * @returns {Number|String|Function|Boolean}
 */
mega.gallery.isGalleryNode = (n, ext) => {
    'use strict';

    ext = ext || fileext(n && n.name || n, true, true);

    return (ext !== 'PSD' && is_image3(n, ext)) || mega.gallery.isGalleryVideo(n);
};

/**
 * Checks whether the node is a video, plus checks if thumbnail is available
 * @param {Object} n ufs node
 * @returns {Object.<String, Number>|Boolean}
 */
mega.gallery.isGalleryVideo = (n) => {
    'use strict';

    if (!n || !n.fa) {
        return false;
    }

    const p = M.getMediaProperties(n);

    return p.showThumbnail && p.icon === 'video' ? p : false;
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

mega.gallery.secKeys = {
    cuphotos: 'camera-uploads-photos',
    cdphotos: 'cloud-drive-photos',
    cuimages: 'camera-uploads-images',
    cdimages: 'cloud-drive-images',
    cuvideos: 'camera-uploads-videos',
    cdvideos: 'cloud-drive-videos'
};

mega.gallery.showEmpty = (type) => {
    'use strict';

    if (!mega.gallery.emptyBlock) {
        mega.gallery.emptyBlock = new GalleryEmptyBlock('.fm-main.default > .fm-right-files-block');
    }

    mega.gallery.emptyBlock.type = type;
    mega.gallery.emptyBlock.show();
};

mega.gallery.hideEmpty = () => {
    'use strict';

    if (mega.gallery.emptyBlock) {
        mega.gallery.emptyBlock.hide();
    }
};

async function galleryUI(id) {

    'use strict';

    loadingDialog.show('MegaGallery');

    if (mega.gallery.nodeUpdated) {
        mega.gallery.resetAll();
    }

    let gallery = mega.gallery[M.currentdirid];

    const $closeDiscovery = $('.gallery-close-discovery').addClass('hidden');

    if (!mega.gallery.titleControl) {
        mega.gallery.titleControl = new GalleryTitleControl('.gallery-tabs-bl .gallery-section-title');
    }

    // This is media discovery
    if (id) {
        mega.gallery.mdReporter.report();

        if (!M.getNodeByHandle(id) || M.getNodeRoot(id) === M.RubbishID) {

            M.openFolder(M.RootID);

            return loadingDialog.hide('MegaGallery');
        }

        mega.gallery.titleControl.title = M.d[id].name;
        mega.gallery.titleControl.icon = 'images';
        mega.gallery.titleControl.isClickable = false;
        mega.gallery.titleControl.addTooltipToTitle();

        gallery = mega.gallery.discovery;

        $closeDiscovery.removeClass('hidden');
    }
    else {
        mega.gallery.titleControl.filterSection = M.currentdirid;
        mega.gallery.titleControl.title = mega.gallery.sections[M.currentdirid].title;
        mega.gallery.titleControl.icon = mega.gallery.sections[M.currentdirid].icon;
        mega.gallery.titleControl.removeTooltipFromTitle();
    }

    if (!gallery) {
        await M.getCameraUploads().catch(nop);

        if (id !== undefined) {
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

    onIdle(async() => {

        await gallery.setView().catch((ex) => {
            console.error(ex);
        });

        if (mega.gallery.modeBeforeReset && mega.gallery.modeBeforeReset[M.currentdirid]) {

            gallery.mode = mega.gallery.modeBeforeReset[M.currentdirid];
            mega.gallery.modeBeforeReset[M.currentdirid] = null;
        }

        gallery.setMode(gallery.mode || 'a', 2);
        gallery.render(true, true);
        gallery.bindEvents();

        M.viewmode = 1;

        $.selectddUIgrid = '.gallery-view';
        $.selectddUIitem = 'a';

        loadingDialog.hide('MegaGallery');
    });
}

MegaGallery.addThumbnails = (nodeBlocks) => {
    'use strict';

    if (!MegaGallery.thumbCache) {
        MegaGallery.thumbCache = Object.create(null);
    }

    const faKeys = [{}, {}];
    const blocks = {};

    for (let i = 0; i < nodeBlocks.length; i++) {
        const {h, fa} = nodeBlocks[i].node;
        let type = 1; // Default type for fetch is 1

        // In case fa is not arrived yet, placing the node to the buffer
        if (!fa) {
            mega.gallery.pendingFaBlocks[h] = nodeBlocks[i];
            continue;
        }

        if (!String(fa).includes(':1*')) {
            type = 0; // Thumbnail is applying as a fallback when there is no preview available
        }

        if (MegaGallery.thumbCache[fa]) {
            nodeBlocks[i].setThumb(MegaGallery.thumbCache[fa], fa);
        }
        else {
            faKeys[type][fa] = nodeBlocks[i].node;

            if (blocks[fa]) {
                blocks[fa].push(nodeBlocks[i]);
            }
            else {
                blocks[fa] = [nodeBlocks[i]];
            }
        }
    }

    const cacheProcessed = (nodeFa) => {
        if (MegaGallery.thumbCache[nodeFa]) {

            for (let i = 0; i < blocks[nodeFa].length; i++) {
                blocks[nodeFa][i].setThumb(MegaGallery.thumbCache[nodeFa], nodeFa);
            }

            delete blocks[nodeFa];
            return true;
        }

        return false;
    };

    const thumbnailIsValid = (nodeFa, uint8) => {
        // uint8.length === 0 should remain as is as per Firefox's limitations
        if (uint8 === 0xDEAD || uint8.length === 0) {
            if (d) {
                console.warn(`Aborted preview retrieval for ${nodeFa}`);
            }

            return false;
        }

        return true;
    };

    const handleReceivedUint8 = async(ctx, nodeFa, uint8, type) => {
        if (!blocks[nodeFa] // The image has been applied already
            || cacheProcessed(nodeFa) // Applying the cached image to the existing group
            || !thumbnailIsValid(nodeFa, uint8)) {
            return;
        }

        if (!MegaGallery.workerBranch) {
            MegaGallery.workerBranch = await webgl.worker.attach();
        }

        const blob = (type === 1)
            ? await webgl.getDynamicThumbnail(uint8, 515, MegaGallery.workerBranch).catch(nop)
            : new Blob([uint8]);

        const fetchStillApplicable = M.currentCustomView.type === 'gallery'
            || M.currentCustomView.type === 'albums';

        if (fetchStillApplicable) {
            if (blob) {
                const url = URL.createObjectURL(blob);

                if (blocks[nodeFa]) {
                    for (let i = 0; i < blocks[nodeFa].length; i++) {
                        blocks[nodeFa][i].setThumb(url, nodeFa);
                    }

                    delete blocks[nodeFa];
                }

                if (!MegaGallery.thumbCache[nodeFa]) {
                    MegaGallery.thumbCache[nodeFa] = url;

                    const cachedKeys = Object.keys(MegaGallery.thumbCache);

                    if (cachedKeys.length > GalleryNodeBlock.thumbCacheSize) {
                        GalleryNodeBlock.revokeThumb(cachedKeys[0]);
                    }
                }
            }
            else if (type === 1) {
                // Force-loading type 0 in case the thumbnail of type 1 cannot be retrieved
                api_getfileattr(
                    { [nodeFa]: null },
                    0,
                    handleReceivedUint8
                );
            }
        }
        else {
            delete blocks[nodeFa];
        }
    };

    faKeys.forEach((fk, type) => {
        api_getfileattr(
            fk,
            type,
            (ctx, nodeFa, uint8) => handleReceivedUint8(ctx, nodeFa, uint8, type)
        );
    });
};

MegaGallery.revokeThumbs = () => {
    'use strict';

    if (!MegaGallery.thumbCache) {
        return;
    }

    const keys = Object.keys(MegaGallery.thumbCache);

    for (let i = 0; i < keys.length; i++) {
        URL.revokeObjectURL(MegaGallery.thumbCache[keys[i]]);
    }

    MegaGallery.thumbCache = Object.create(null);
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
        }
    }

    if (toFetchAttributes.length) {
        MegaGallery.addThumbnails(toFetchAttributes);
    }
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
                && (is_image3(n) || mega.gallery.isGalleryVideo(n)),
            title: l.gallery_camera_uploads
        },
        [mega.gallery.secKeys.cdphotos]: {
            path: mega.gallery.secKeys.cdphotos,
            icon: 'photos',
            root: 'photos',
            filterFn: (n, cameraTree) => (!cameraTree || !cameraTree.includes(n.p))
                && (is_image3(n) || mega.gallery.isGalleryVideo(n)),
            title: l.gallery_from_cloud_drive
        },
        images: {
            path: 'images',
            icon: 'images',
            root: 'images',
            filterFn: n => is_image3(n),
            title: l.gallery_all_locations
        },
        [mega.gallery.secKeys.cuimages]: {
            path: mega.gallery.secKeys.cuimages,
            icon: 'images',
            root: 'images',
            filterFn: (n, cameraTree) => cameraTree && cameraTree.includes(n.p) && is_image3(n),
            title: l.gallery_camera_uploads
        },
        [mega.gallery.secKeys.cdimages]: {
            path: mega.gallery.secKeys.cdimages,
            icon: 'images',
            root: 'images',
            filterFn: (n, cameraTree) => (!cameraTree || !cameraTree.includes(n.p)) && is_image3(n),
            title: l.gallery_from_cloud_drive
        },
        videos: {
            path: 'videos',
            icon: 'videos',
            root: 'videos',
            filterFn: n => mega.gallery.isGalleryVideo(n),
            title: l.gallery_all_locations
        },
        [mega.gallery.secKeys.cuvideos]: {
            path: mega.gallery.secKeys.cuvideos,
            icon: 'videos',
            root: 'videos',
            filterFn: (n, cameraTree) => cameraTree && cameraTree.includes(n.p) && mega.gallery.isGalleryVideo(n),
            title: l.gallery_camera_uploads
        },
        [mega.gallery.secKeys.cdvideos]: {
            path: mega.gallery.secKeys.cdvideos,
            icon: 'videos',
            root: 'videos',
            filterFn: (n, cameraTree) => (!cameraTree || !cameraTree.includes(n.p)) && mega.gallery.isGalleryVideo(n),
            title: l.gallery_from_cloud_drive
        },
        favourites: {
            path: 'favourites',
            icon: 'favourite-filled',
            root: 'favourites',
            filterFn: n => is_image3(n) || mega.gallery.isGalleryVideo(n),
            title: l.gallery_favourites
        }
    };
});

lazy(mega.gallery, 'mdReporter', () => {
    'use strict';

    /**
     * @type {Array}
     * @property {Number} 0 Timeout
     * @property {Number} 1 EventId
     */
    const marks = [
        [10, 99753],
        [30, 99754],
        [60, 99755],
        [180, 99756]
    ];

    /**
     * The number to qualify as a favourite
     * @type {Number}
     */
    const timesOver = 3;

    const statsStorageKey = 'regularPageStats';
    const mdPageKey = 'MD';

    /**
     * This one prevents events from sending same requests multiple times when leaving and coming back to the tab
     * or accidentally doubling events
     * @type {Number[]}
     */
    let passedSessionMarks = [];

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
        notApplicable(currentPage, runId) {
            return this.runId !== runId
                || document.visibilityState === 'hidden'
                || window.M.currentdirid !== currentPage;
        },
        report(skipReset) {
            if (!skipReset && this.runId) {
                this.stop(); // Stopping the previously initialised reporter's run
            }

            this.runId = Date.now();
            const runId = this.runId;

            disposeVisibilityChange = MComponent.listen(
                document,
                'visibilitychange',
                () => {
                    if (document.visibilityState === 'visible' && this.runId === runId) {
                        this.report(true);
                    }
                }
            );

            this.reportSessionMarks(marks[0][0], M.currentdirid, 0, runId);
            this.processSectionFavourite(M.currentdirid, runId);
        },
        /**
         * Sending time marks if the session time is surpassing a specific value
         * @param {Number} timeout
         * @param {String} currentPage
         * @param {Number} diff Timeout to the next mark
         * @param {Number} runId Current report run id to check
         */
        reportSessionMarks(timeout, currentPage, diff, runId) {
            const eventIndex = marks.findIndex(([to]) => to === timeout);

            tSleep(timeout - diff).then(
                () => {
                    if (this.notApplicable(currentPage, runId)) {
                        return;
                    }

                    if (!passedSessionMarks.includes(timeout)) {
                        passedSessionMarks.push(timeout);

                        window.eventlog(
                            marks[eventIndex][1],
                            'Session mark: ' + mdPageKey + ' | ' + timeout + 's'
                        );
                    }

                    const nextIndex = eventIndex + 1;
                    if (marks[nextIndex]) {
                        this.reportSessionMarks(marks[nextIndex][0], currentPage, timeout, runId);
                    }
                }
            );
        },
        /**
         * Report if user visited a specific section/page more than timesOver times
         * @param {String} currentPage
         * @param {Number} runId Current report run id to check
         */
        processSectionFavourite(currentPage, runId) {
            tSleep(marks[0][0]).then(() => {
                if (this.notApplicable(currentPage, runId)) {
                    return;
                }

                fillStats().then((status) => {
                    if (!status) {
                        fmStats = [];
                    }

                    let section = fmStats.find(({ name }) => name === mdPageKey);

                    if (section) {
                        section.count++;
                    }
                    else {
                        section = {name: mdPageKey, count: 1, reported: false};
                        fmStats.push(section);
                    }

                    if (!section.reported) {
                        if (section.count >= timesOver) {
                            section.reported = true;
                            eventlog(99757, mdPageKey + ' has been visited ' + section.count + ' times');
                        }

                        M.setPersistentData(statsStorageKey, fmStats).catch(() => {
                            console.error('Cannot save stats - the storage is most likely full...');
                        });
                    }
                });
            });
        },
        stop() {
            if (typeof disposeVisibilityChange === 'function') {
                disposeVisibilityChange();
            }

            this.runId = 0;
            passedSessionMarks = [];
        }
    };
});
