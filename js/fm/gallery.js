class MegaGallery {

    constructor(id) {

        this.id = id || M.currentdirid;
        this.isDiscovery = !!id;
        this.groups = {y: {}, m: {}, d: {}, a: {}};
        this.renderCache = {};
        this.scrollPosCache = {y: 0, m: 0, d: 0, a: 0};
        this.galleryBlock = document.getElementById('gallery-view');
        this.contentRowTemplateNode = document.getElementById('gallery-cr-template');
        this.blockTemplateNode = document.getElementById('gallery-dbv-template');
        this.updNode = {};
        this.type = ['photo', 'images', 'videos', 'favourites'].includes(id) ? 'basic' : 'discovery';
        this.shouldProcessScroll = true;
        this.inPreview = false;
    }

    get onpage() {
        return this.id === M.currentCustomView.nodeID;
    }

    setMode(type, pushHistory) {

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

        if (type === 'a') {
            this.setZoom(this.zoom || 2);
        }
        else {
            delete this.zoom;
        }

        $('.gallery-tab-lnk').removeClass('active');
        $(`.gallery-tab-lnk-${this.mode}`).addClass('active');

        if (this.dynamicList) {
            this.dynamicList.destroy();
            this.dynamicList = false;
        }

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

        // Update placeholder icon size
        const noThumbNode = this.galleryBlock.querySelectorAll('.data-block-bg:not(.thumb)');

        for (let i = noThumbNode.length; i--;) {
            noThumbNode[i].style.setProperty('--block-height', `${noThumbNode[i].offsetHeight}px`);
        }

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

        const timestamp = n.mtime || n.ts;
        return [
            timestamp,
            calculateCalendar('y', timestamp).start,
            calculateCalendar('m', timestamp).start,
            calculateCalendar('d', timestamp).start
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

                if (this.dynamicList && this.mode === 'y') {

                    delete this.renderCache[`y${ts}`];
                    this.throttledListChange(sts);
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

                        this.groups.y[yearGroups[i]].n[1] = this.nodes[n.h];

                        if (this.dynamicList && this.mode === 'y') {

                            delete this.renderCache[`y${ts}`];
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

            if (M.currentdirid === this.id && this.mode === 'y') {
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

                delete this.renderCache[`y${ts}`];
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
                    delete this.renderCache[`y${yearGroups[i]}`];
                    this.throttledListChange(yearGroups[i]);
                }
            }
        }

        // Damn this is delete an year from view we need to build year view again.
        if (removeGroup) {

            this.splitYearGroup();
            delete this.groups.y[ts];
            this.mergeYearGroup();
            this.resetAndRender();
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
        delete this.renderCache[`d${ts}`];
        delete this.renderCache[`d${ts - 0.5}`];

        const {start, end} = calculateCalendar('d', ts);
        const keys = Object.keys(this.nodes);
        for (const h of keys) {
            const n = M.d[h];
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
            {l: time2date(key, 3), ml: time2date(key, 13), c: 0, n: [], dts: {}, ldts: 0};
        this.groups.m[key].c++;
        this.groups.m[key].dts[dayTs] = 1;
        this.groups.m[key].ldts = Math.max(this.groups.m[key].ldts, dayTs);
    }

    filterOneMonthGroup(ts) {
        const dayKeys = Object.keys(this.groups.m[ts].dts);

        dayKeys.sort((a, b) => {
            return this.groups.d[b].c - this.groups.d[a].c;
        });

        this.groups.m[ts].n = dayKeys.slice(0, 4).map(k => this.groups.d[k].n[0]);
        this.groups.m[ts].dts = {};
    }

    filterMonthGroup() {

        const monthKeys = Object.keys(this.groups.m).sort((a, b) => b - a);
        let triEvenCount = 0;

        for (let i = 0; i < monthKeys.length; i++) {

            const dayKeys = Object.keys(this.groups.m[monthKeys[i]].dts);

            dayKeys.sort((a, b) => {
                return this.groups.d[b].c - this.groups.d[a].c;
            });

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

                delete this.renderCache[`m${ts}`];
                this.throttledListChange(sts);
            }
        }
        // This is a node for new group
        else {
            this.groups.m[ts] = {
                c: 1,
                dts: {},
                l: time2date(ts, 3),
                ldts: dts,
                ml: time2date(ts, 13),
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
            delete this.renderCache[`m${ts}`];
            if (this.dynamicList) {
                this.dynamicList.remove(sts, this.onpage);
            }

        }
        // The node is extra node for single day month block, lets remove extra node or update it.
        else if (group.extn === h) {

            if (!_setExtraNode(dts)) {
                delete group.extn;
            }
            delete this.renderCache[`m${ts}`];
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
                delete this.renderCache[`m${ts}`];
                this.throttledListChange(sts);
            }
        }
    }

    setDayGroup(key, h) {

        this.groups.d[key] = this.groups.d[key] || {l: time2date(key, 2), c: 0, n: []};
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

                delete this.renderCache[`d${ts - 0.5}`];
                delete this.renderCache[`d${ts}`];

                this.throttledListChange(sts1);
                this.dynamicList.insert(sts1, sts2, this.onpage);
            }
            else if (this.groups.d[ts].c > 5) {

                delete this.renderCache[`d${ts - 0.5}`];
                delete this.renderCache[`d${ts}`];

                this.throttledListChange(sts1);
                this.throttledListChange(sts2);
            }
            else {
                delete this.renderCache[`d${ts}`];
                this.throttledListChange(sts1);
            }
        }
    }

    removeFromDayGroup(h, ts) {
        const sts1 = `${ts}`;
        const sts2 = `${ts - 0.5}`;

        this.rebuildDayGroup(ts);
        this.throttledListChange(sts1);
        this.throttledListChange(sts2);
    }

    // lets Chunk block by 60 to optimise performance of dom rendering
    setAllGroup(key, h, aRecur = 0) {

        let extendKey = key + aRecur;
        const timeString = aRecur ? '' : time2date(key, 3);

        extendKey = extendKey.toFixed(5);

        this.groups.a[extendKey] = this.groups.a[extendKey] || {l: timeString, c: 0, n: []};
        this.groups.a[key.toFixed(5)].c++;

        if (this.groups.a[extendKey].n.length < 60) {

            this.groups.a[extendKey].n.push(h);

            return extendKey;
        }

        return this.setAllGroup(key, h, aRecur - 0.00001);

    }

    flatTargetAllGroup(ts) {

        ts = ts.toFixed(5);

        // if there is no beginning group, no point to do heavy lifting
        if (!this.groups.a[ts]) {
            return [];
        }

        const nodes = [];
        const groupKeys = Object.keys(this.groups.a).sort().reverse();

        for (let i = 0; i < groupKeys.length; i++) {

            const ceiledKey = Math.ceil(groupKeys[i]).toFixed(5);

            if (ceiledKey === ts) {
                nodes.push(...this.groups.a[groupKeys[i]].n);
                delete this.groups.a[groupKeys[i]];
                delete this.renderCache[`a${groupKeys[i]}`];
            }
            else if (ceiledKey < ts) {
                break;
            }
        }

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

        const flatNodes = this.flatTargetAllGroup(ts);
        const flatIndex = flatNodes.indexOf(h);

        flatNodes.splice(flatIndex, 1);

        const reGrouped = {};

        flatNodes.forEach(h => {
            reGrouped[this.setAllGroup(ts, h)] = 1;
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

        if (!this.dynamicList && M.currentCustomView.original === this.id) {

            this.initDynamicList();
            this.dynamicList.initialRender();
        }

        // Do not change order, some function here is rely on result from another
        // This order should be keep this way in order to process data in order.
        this.addToAllGroup(n, updatedGroup[2]);
        this.addToDayGroup(n, updatedGroup[3]);
        this.addToMonthGroup(n, updatedGroup[2], updatedGroup[3]);
        this.addToYearGroup(n, updatedGroup[1]);

        if (this.dynamicList && M.currentCustomView.original === this.id) {
            M.v = Object.keys(this.nodes).map(h => M.d[h]);
        }

        M.sortByModTime(-1);

        delete this.updNode[n.h];
    }

    removeNodeFromGroups(n) {

        const updatedGroup = this.getGroup(n);

        delete this.nodes[n.h];

        // Do not change order, some function here is rely on result from another
        // This order should be keep this way in order to process data in order.
        this.removeFromAllGroup(n.h, updatedGroup[2]);
        this.removeFromDayGroup(n.h, updatedGroup[3]);
        this.removeFromMonthGroup(n.h, updatedGroup[2], updatedGroup[3]);
        this.removeFromYearGroup(n.h, updatedGroup[1]);

        if (this.dynamicList && M.currentCustomView.original === this.id) {
            M.v = Object.keys(this.nodes).map(h => M.d[h]);
        }

        M.sortByModTime(-1);

        if (this.dynamicList && M.v.length === 0) {

            this.dynamicList.destroy();
            this.dynamicList = false;
            this.galleryBlock.classList.add('hidden');
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
            'onNodeInjected': this.renderThumbs.bind(this),
            'onResize': this.throttledResize.bind(this),
            'onScroll': this.throttledOnScroll.bind(this),
            'perfectScrollOptions': {
                'handlers': ['click-rail', 'drag-scrollbar', 'wheel', 'touch'],
                'minScrollbarLength': 20
            }
        });
    }

    render() {

        if (M.v.length > 0) {

            this.initDynamicList();

            const keys = Object.keys(this.activeModeList).sort((a, b) => b - a);

            this.dynamicList.batchAdd(keys);
            this.dynamicList.initialRender();
            this.dynamicList.scrollToYPosition(this.scrollPosCache[this.mode].a);
        }
        else {
            $('.fm-right-files-block').addClass('emptied');
            $(`.fm-empty-${this.id}`).removeClass('hidden');
            this.galleryBlock.classList.add('hidden');
        }
    }

    resetAndRender() {

        if (this.dynamicList && M.currentCustomView.original === this.id) {
            M.v = Object.keys(this.nodes).map(h => M.d[h]);
        }

        M.sortByModTime(-1);

        this.renderCache = {};
        if (this.dynamicList) {
            this.dynamicList.destroy();
            this.dynamicList = false;
        }

        this.render();

        onIdle(this.renderThumbs.bind(this));
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

            this.setMode('d', 1);
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

                if (is_video(n)) {
                    $.autoplay = h;
                }

                this.inPreview = true;
                slideshow(h, false);
            }
            else {
                let clickedDate = this.mode === 'd' ?
                    $eTarget.closest('.content-row').attr('id').replace('gallery-', '') : $eTarget.attr('data-ts');

                clickedDate = calculateCalendar(this.mode === 'm' ? 'd' : 'm', Math.ceil(clickedDate)).start;

                this.setMode(this.mode === 'd' ? 'a' : this.mode === 'm' ? 'd' : 'm', 1);
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
                        const nodeOffset = this.dynamicList.listContainer.scrollTop +
                            document.getElementById(e.currentTarget.id).offsetTop - 8;
                        this.dynamicList.scrollToYPosition(nodeOffset);
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

            this.setMode(e.currentTarget.attributes['data-folder'].value, 1);
            this.render();
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

                if (this.dynamicList) {

                    this.dynamicList.destroy();
                    this.dynamicList = false;
                }

                // Clear render cache for free memory
                this.renderCache = {};

                // Clear thumbnails to free memory if target page is not gallery anymore
                if (M.isCustomView(tpage).type !== 'gallery') {

                    this.revokeThumbs();
                    mBroadcaster.removeListener(this.beforePageChangeListener);
                    delete this.beforePageChangeListener;

                    // Clear discovery
                    if (this.isDiscovery) {
                        delete mega.gallery.discovery;
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

            if (e.originalEvent.state.galleryMode && this.id === M.currentdirid) {
                this.setMode(e.originalEvent.state.galleryMode);
                this.render();
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

        return M.sortByModTimeFn()(a, b, -1);
    }

    renderGroup(id) {

        if (!this.renderCache[this.mode + id]) {

            const group = this.getGroupById(id);
            const groupWrap = this.contentRowTemplateNode.cloneNode(true);
            const contentBlock = groupWrap.querySelector('.content-block');

            contentBlock.querySelector('#gallery-dbv-template').remove();

            groupWrap.classList.remove('template');
            groupWrap.id = `gallery-${id}`;

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

            this.renderCache[this.mode + id] = groupWrap;
        }

        this.clearSelection(id);

        return this.renderCache[this.mode + id];
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

        const elm = this.blockTemplateNode.cloneNode(true);
        const node = M.d[h] || new MegaNode(this.updNode[h]);

        if (!node) {
            return;
        }

        elm.id = h;
        elm.setAttribute('title', node.name);
        elm.classList.remove('template');

        if (node) {

            if (is_video(node)) {

                elm.querySelector('.block-view-file-type').classList.replace('image', 'video');
                elm.querySelector('.block-view-file-type').classList.replace('icon-images', 'icon-videos');
                elm.querySelector('.data-block-bg').classList.add('video');
                elm.querySelector('.video-thumb-details span').textContent =
                    secondsToTimeShort(MediaAttribute(node).data.playtime);
            }

            if (this.mode === 'm' || this.mode === 'y') {

                elm.dataset.ts = node.mtime || node.ts;
                elm.dataset.date = time2date(node.mtime || node.ts, this.mode === 'y' ? 14 : 15);
            }
        }

        return elm;
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

    _fetchDom(nid) {

        const noThumbNode = document.getElementById(nid);

        if (noThumbNode) {

            noThumbNode.querySelector('img').src = mega.gallery.thumbnails[nid];
            noThumbNode.querySelector('.data-block-bg').classList.add('thumb');
        }
    }

    async renderThumbs() {

        const noThumbNode = this.galleryBlock.querySelectorAll('.data-block-bg:not(.thumb)');
        const nodeList = [];

        for (let i = noThumbNode.length; i--;) {

            const {parentNode} = noThumbNode[i];
            const nid = parentNode.id;

            if (nid && nid !== 'gallery-dbv-template') {

                // Block size for placeholder icon.
                noThumbNode[i].style.setProperty('--block-height', `${noThumbNode[i].offsetHeight}px`);

                const n = M.d[nid] || this.updNode[nid];

                if (!n) {
                    continue;
                }

                // If there is already a thumbnail for it
                if (mega.gallery.thumbnails[nid]) {
                    this._fetchDom(nid);
                }
                else if (mega.gallery.thumb_requested[n.fa]) {
                    if (!mega.gallery.thumb_requested[n.fa].includes(nid)) {
                        mega.gallery.thumb_requested[n.fa].push(nid);
                    }
                }
                else if (String(n.fa).includes(':1*')) {

                    nodeList[nid] = {fa: n.fa, k: n.k};
                    mega.gallery.thumb_requested[n.fa] = [nid];
                }
            }
        }

        this.requestThumb(nodeList);

        // Special blurry background for day view single layout
        if (this.mode === 'd') {

            const thumb = this.galleryBlock.querySelectorAll('.layout-1 .data-block-view img');

            for (let j = thumb.length; j--;) {

                thumb[j].onload = () => {
                    thumb[j].closest('.content-block').querySelector('.gallery-block-bg').src = thumb[j].src;
                };
            }
        }
    }

    requestThumb(nodeList) {

        api_getfileattr(nodeList, 1, async(ctx, nid, uint8) => {

            if (uint8 === 0xDEAD) {

                if (d) {
                    console.log(`Aborted preview retrieval for ${nid}`);
                }

                delete mega.gallery.thumb_requested[M.d[nid].fa];

                return;
            }

            this._createThumb(nid, uint8);
        });
    }

    async _createThumb(nid, buffer) {

        if (!this.workerBranch) {
            this.workerBranch = await webgl.worker.attach();
        }

        const blob = await webgl.getDynamicThumbnail(buffer, 515, this.workerBranch).catch(nop);

        // For the case user move to another page while getting thumbnails, check page is still gallery
        if (M.currentCustomView.type === 'gallery' && M.d[nid] && blob) {

            mega.gallery.thumbnails[nid] = URL.createObjectURL(blob);

            this._fetchDom(nid);

            const requested = mega.gallery.thumb_requested[M.d[nid].fa];

            if (requested && requested.length > 1) {

                for (let i = requested.length; i--;) {

                    mega.gallery.thumbnails[requested[i]] = mega.gallery.thumbnails[nid];

                    this._fetchDom(requested[i]);
                }
            }
        }

        delete mega.gallery.thumb_requested[M.d[nid].fa];
    }
    // Temporary solution for memory leak, potentially can be removed once lru cache for this is introduced
    revokeThumbs() {

        const keys = Object.keys(mega.gallery.thumbnails);

        for (let i = keys.length; i--;) {
            URL.revokeObjectURL(mega.gallery.thumbnails[keys[i]]);
        }

        mega.gallery.thumbnails = Object.create(null);
        mega.gallery.thumb_requested = Object.create(null);
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

            M.v = Object.keys(this.nodes).map(h => M.d[h]);

            M.sortByModTime(-1);

            return false;
        }

        if (d) {
            console.time(`MegaGallery: ${this.id}`);
        }

        M.v = [];
        this.nodes = {};
    }

    setViewAfter() {

        M.sortByModTime(-1);

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

        const h = this.id === 'photos' ? mega.gallery.cufh[0] : this.id;
        const handles = M.getTreeHandles(h);
        let subs = [];

        await dbfetch.geta(handles).catch(nop);

        for (let i = handles.length; i--;) {
            subs = subs.concat(Object.keys(M.c[handles[i]]));
        }

        subs = subs.filter(h => {
            const n = M.d[h];
            return !n.t && !this.nodes[n.h] && !n.fv && is_photo(n);
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

        if (!n.t && is_photo(n)) {

            const cameraTree = M.getTreeHandles(this.isDiscovery ? this.id : M.CameraId).includes(n.p);

            // If it is target Camera folder and it is not in gallery view now add the node to gallery.
            if (cameraTree && !this.nodes[n.h]) {
                this.addNodeToGroups(n);
            }
            // If it is not target Camera folder but it is in gallery view now remove the node from gallery view.
            else if (!cameraTree && this.nodes[n.h]) {
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

    get typeFilter() {

        let func;

        if (this.id === 'images') {
            func = n => is_image3(n);
        }
        else if (this.id === 'videos') {
            func = n => is_video(n) === 1;
        }
        else if (this.id === 'favourites') {
            func = n => is_image3(n) || is_video(n) === 1;
        }

        return func;
    }

    async setView() {

        if (super.setView() === false) {
            return false;
        }

        const sharesTree = M.getTreeHandles('shares');
        const rubTree = M.getTreeHandles(M.RubbishID);

        let handles = new Set();

        var nodes = await this.dbAction().catch(() => Object.values(M.d));

        nodes = nodes.filter(n => n.t < 1).sort((a, b) => M.sortByModTimeFn()(a, b, -1));

        if (!Array.isArray(nodes)) {

            if (d) {
                console.timeEnd(`MegaGallery: ${this.id}`);
            }

            return;
        }

        for (var i = 0; i < nodes.length; i++) {

            var n = nodes[i];

            if (this.nodes[n.h] || n.t || sharesTree.includes(n.p) || rubTree.includes(n.p) ||
                (this.id === 'favourites' && !n.fav)) {
                continue;
            }

            if (!n.fv && this.typeFilter(n)) {

                this.nodes[n.h] = this.setGroup(n)[0];

                if (!M.d[n.h]) {
                    // Lets reduce number of query by handling parent instead
                    handles.add(n.p);
                }
            }
        }

        handles = [...handles];
        await dbfetch.geta(handles).catch(nop);

        M.v = Object.keys(this.nodes).map(h => M.d[h]);

        this.mergeYearGroup();
        this.filterMonthGroup();

        super.setViewAfter();
    }

    dbAction() {

        if (fmdb && fmdb.crashed !== 666) {

            const sharesTree = M.getTreeHandles('shares');
            const rubTree = M.getTreeHandles(M.RubbishID);

            var options = {
                query: db => db.where('s').noneOf(fmdb.toStore(0), fmdb.toStore(-1), fmdb.toStore(-2)),
                include: function(row) {
                    return !sharesTree.includes(row.p) || !rubTree.includes(row.p);
                }
            };

            return fmdb.getbykey('f', options);
        }

        return Promise.reject();
    }

    checkGalleryUpdate(n) {

        if (!n.t && this.typeFilter(n)) {

            const sharesTree = M.getTreeHandles('shares');
            const rubTree = M.getTreeHandles(M.RubbishID);
            let toGallery = !(sharesTree.includes(n.p) || rubTree.includes(n.p));

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
            }
        }
    }
}

mega.gallery = Object.create(null);
mega.gallery.thumbnails = Object.create(null);
mega.gallery.thumb_requested = Object.create(null);
mega.gallery.nodeUpdated = false;

mega.gallery.checkEveryGalleryUpdate = n => {

    'use strict';

    if (n.h === M.CameraId) {

        delete mega.gallery.photos;

        if (M.currentCustomView.original === 'photos') {
            return galleryUI();
        }
    }

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
    if (mega.gallery.photos) {
        mega.gallery.photos.checkGalleryUpdate(n);
    }
    if (mega.gallery.images) {
        mega.gallery.images.checkGalleryUpdate(n);
    }
    if (mega.gallery.videos) {
        mega.gallery.videos.checkGalleryUpdate(n);
    }
    if (mega.gallery.favourites) {
        mega.gallery.favourites.checkGalleryUpdate(n);
    }
};

mega.gallery.checkEveryGalleryDelete = h => {

    'use strict';

    if (mega.gallery.discovery) {
        mega.gallery.discovery.removeNodeByHandle(h);
    }
    if (mega.gallery.photos) {
        mega.gallery.photos.removeNodeByHandle(h);
    }
    if (mega.gallery.images) {
        mega.gallery.images.removeNodeByHandle(h);
    }
    if (mega.gallery.videos) {
        mega.gallery.videos.removeNodeByHandle(h);
    }
    if (mega.gallery.favourites) {
        mega.gallery.favourites.removeNodeByHandle(h);
    }
};

mega.gallery.resetAll = () => {

    'use strict';

    mega.gallery.modeBeforeReset = {
        photos: mega.gallery.photos && mega.gallery.photos.mode,
        images: mega.gallery.images && mega.gallery.images.mode,
        videos: mega.gallery.videos && mega.gallery.videos.mode,
        favourites: mega.gallery.favourites && mega.gallery.favourites.mode,
    };

    delete mega.gallery.photos;
    delete mega.gallery.images;
    delete mega.gallery.videos;
    delete mega.gallery.discovery;
    delete mega.gallery.favourites;

    mega.gallery.nodeUpdated = false;
};

async function galleryUI(id) {

    'use strict';

    loadingDialog.show('MegaGallery');

    if (mega.gallery.nodeUpdated) {
        mega.gallery.resetAll();
    }

    let title = l[`gallery_${M.currentdirid}`];
    let icon = M.currentdirid;
    let gallery = mega.gallery[M.currentdirid];

    const $closeDiscovery = $('.gallery-close-discovery').addClass('hidden');

    // This is media discovery
    if (id) {

        if (!M.getNodeByHandle(id) || M.getNodeRoot(id) === M.RubbishID) {

            M.openFolder(M.RootID);

            return loadingDialog.hide('MegaGallery');
        }

        title = escapeHTML(M.d[id].name);
        icon = 'photos';
        gallery = mega.gallery.discovery;

        $closeDiscovery.removeClass('hidden');
    }

    if (M.currentdirid === 'favourites') {
        icon = 'favourite-filled';
    }

    $('.gallery-tabs-bl .gallery-section-title')
        .safeHTML(`<i class="sprite-fm-mono icon-${icon}"></i>${title}`);


    if (!gallery) {

        if (id !== undefined) {
            gallery = mega.gallery.discovery = new MegaTargetGallery(id);
        }
        else if (M.currentdirid === 'photos') {

            mega.gallery.cufh = await M.getCameraUploads().catch(nop);

            // If camera folder is not set do not render photo
            if (!mega.gallery.cufh) {

                loadingDialog.hide('MegaGallery');

                return;
            }

            // If Camera folder is under deep tree.
            await Promise.resolve(dbfetch.get(mega.gallery.cufh[0])).catch(nop);

            // If camera folder is not exist anymore or in rubbish bin do not render photo
            if (!M.getNodeByHandle(mega.gallery.cufh) || M.getNodeRoot(M.CameraId) === M.RubbishID) {

                loadingDialog.hide('MegaGallery');

                return;
            }

            gallery = mega.gallery.photos = new MegaTargetGallery();
        }
        else if (M.currentdirid === 'images' || M.currentdirid === 'videos' || M.currentdirid === 'favourites'){
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
        gallery.render();
        gallery.bindEvents();

        M.viewmode = 1;

        $.selectddUIgrid = '.gallery-view';
        $.selectddUIitem = 'a';

        loadingDialog.hide('MegaGallery');
    });
}
