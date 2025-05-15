/** @property mega.rewind */
lazy(mega, 'rewind', () => {
    'use strict';

    const logger = MegaLogger.getLogger('rewind');

    // FIXME: Used in caching, disabled first
    // const DAY_IN_MILLISECONDS = 86400000;

    const ACCOUNT_TYPE_PRO_LITE = 'pl';
    const ACCOUNT_TYPE_PRO = 'p';
    const ACCOUNT_TYPE_PRO_FLEXI = 'pf';
    const ACCOUNT_TYPE_BUSINESS = 'b';
    const ACCOUNT_TYPE_FREE = 'f';

    const TYPE_ADDED = 1;
    const TYPE_MODIFIED = 2;
    const TYPE_REMOVED = 3;

    const ERROR_TREE_CACHE_FUTURE = -1;
    const ERROR_TREE_CACHE_EMPTY = -2;

    const TREE_STATE_OPEN = 1;

    const MILLISECONDS_24HOURS = 24 * 60 * 60 * 1000;

    // Referenced to megaRender.js
    const viewModeContainers = {
        'cloud-drive': [
            '.files-grid-view',
            '.fm-blocks-view',
        ],
        'out-shares': [
            '.out-shared-grid-view',
            '.out-shared-blocks-view'
        ],
        'file-requests': [
            '.files-grid-view',
            '.fm-blocks-view',
        ]
    };

    const LOCATION_CLOUD_DRIVE = 0;
    const LOCATION_UNKNOWN = -1;

    const TRIGGER_LEFT_PANEL = 0;
    const TRIGGER_CURRENT_DIRECTORY = 1;
    const TRIGGER_FOLDER_CONTEXT_MENU = 2;
    const TRIGGER_SIDEBAR_CONTEXT_MENU = 3;

    return new class Rewind {
        constructor() {
            this.ACCOUNT_TYPE_FREE = ACCOUNT_TYPE_FREE;
            this.ACCOUNT_TYPE_PRO_LITE = ACCOUNT_TYPE_PRO_LITE;
            this.ACCOUNT_TYPE_PRO = ACCOUNT_TYPE_PRO;

            this.clear();
            this.changeLog = null;
            this.changeLogTimestamp = null;
            this.selectedHandle = null;
            this.treeCacheList = null;
            this.treeCacheListTimestamp = null;
            this.dateData = null;
            this.rewindableDays = null;
            this.lastRewindableDate = null;
            this.lastRewindableMonth = null;
            this.lastRewindableYear = null;
            this.folderRedirect = null;

            // Now adding 'public-links', 'out-shares' to the following object will work as expected
            this.permittedRoots = freeze({
                [M.RootID]: true,
                'file-requests': true,
            });

            this.$fmHeaderButtons = $('.fm-header-buttons', '.fm-right-header');

            const openSidebarListener = (isAccUpgraded) => {
                const listContainer = mega.rewind.getListContainer();
                let lastSelectedHandle = null;
                const previousActive = mega.rewindUi.sidebar.active;
                let isOpenFolder = mega.rewindUi.sidebar.close(M.currentdirid, listContainer, isAccUpgraded);
                let openRewind = false;

                if (this.folderRedirect) {
                    lastSelectedHandle = this.folderRedirect;
                    this.folderRedirect = null;
                    openRewind = true;
                    isOpenFolder = false;
                }
                else if (isAccUpgraded || (previousActive && isOpenFolder)) {
                    lastSelectedHandle = mega.rewindUi.sidebar.currentHandle;
                    openRewind = true;
                }
                if (lastSelectedHandle && openRewind) {
                    onIdle(() => {
                        mega.rewindUi.sidebar.updateDatepickerView();
                        mega.rewind.openSidebar(null, lastSelectedHandle, isOpenFolder, isAccUpgraded)
                            .then(() => {
                                const eventData = mega.rewind.getOpenSidebarEventData(lastSelectedHandle, 1);

                                mega.rewindUi.sidebar.getDatepickerInstance().selectDate(
                                    mega.rewindUi.sidebar.selectedDate);

                                if (eventData) {
                                    eventlog(500001, eventData);
                                }
                            })
                            .catch(tell);
                    });
                }
            };

            mBroadcaster.addListener('rewind:accountUpgraded', () => openSidebarListener(true));
            mBroadcaster.addListener('mega:openfolder', () => openSidebarListener());
        }

        async removeNodeListener() {
            mBroadcaster.removeListener(`nodeUpdated:${this.selectedHandle}`);
        }

        async openSidebar(...args) {
            let finished;

            if (d) {
                console.time('rewind:index:open');
            }
            setTimeout(() => !finished && loadingDialog.show('rewind-sidebar'), 480);

            // Close the new Info panel if it's open as there's no room for 2 side panels
            mega.ui.mInfoPanel.hide();

            return this._openSidebarStub(...args)
                .finally(() => {
                    finished = true;
                    loadingDialog.hide('rewind-sidebar');
                    if (d) {
                        console.timeEnd('rewind:index:open');
                    }
                });
        }

        async _openSidebarStub(listContainer, selectedHandle, isOpenFolder, isAccUpgraded) {
            if (!(listContainer && listContainer.parentNode)) {
                listContainer = this.getListContainer();
            }
            if (!(listContainer && listContainer.parentNode)) {
                logger.error('Rewind.openSidebar - No container found', selectedHandle, isOpenFolder, isAccUpgraded);
                throw ENOENT;
            }

            this.logAccountTypeChanges();
            logger.info('Rewind.openSidebar - Sidebar Opening..');

            this.removeNodeListener();
            this.selectedHandle = selectedHandle;

            if (isAccUpgraded || !isOpenFolder) {
                await this.loadTreeCacheList();
            }

            await this.loadChangeLog();

            mBroadcaster.addListener(`nodeUpdated:${selectedHandle}`, () => {
                mega.rewindUi.sidebar.nodeUpdated();
            });

            await mega.rewindUi.sidebar.init(listContainer, selectedHandle, isOpenFolder || isAccUpgraded);

            onIdle(clickURLs);
            logger.info('Rewind.openSidebar - Sidebar opened..');
        }

        getAccountType() {
            if (u_attr.p === pro.ACCOUNT_LEVEL_BUSINESS) {
                return ACCOUNT_TYPE_BUSINESS;
            }

            if ([
                pro.ACCOUNT_LEVEL_STARTER,
                pro.ACCOUNT_LEVEL_BASIC,
                pro.ACCOUNT_LEVEL_ESSENTIAL,
                pro.ACCOUNT_LEVEL_PRO_LITE
            ].includes(u_attr.p)) {
                return ACCOUNT_TYPE_PRO_LITE;
            }

            if (u_attr.p === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
                return ACCOUNT_TYPE_PRO_FLEXI;
            }

            if (u_attr.p >= pro.ACCOUNT_LEVEL_PRO_I && u_attr.p <= pro.ACCOUNT_LEVEL_PRO_III) {
                return ACCOUNT_TYPE_PRO;
            }

            return ACCOUNT_TYPE_FREE;
        }

        isAccountProType() {
            this.accountType = this.accountType || this.getAccountType();
            return this.accountType !== ACCOUNT_TYPE_PRO_LITE && this.accountType !== ACCOUNT_TYPE_FREE;
        }

        async loadTreeCacheList() {
            console.time('rewind:index:treeCache');
            this.accountType = this.getAccountType();

            // FIXME: Disable caching first for testing
            // let savedList = await mega.rewindStorage.getTreeCacheList();
            const hasExpired = false;
            const differentAccountType = false;

            // if (savedList) {
            //     savedList = savedList.d;
            //     hasExpired = Date.now() - new Date(savedList.lastTimestamp) >= DAY_IN_MILLISECONDS;
            //     differentAccountType = savedList.accountType !== this.accountType;
            // }

            let savedList = false;
            if (!savedList || hasExpired || differentAccountType) {

                const response = await mega.rewindUtils.getTreeCacheList();

                logger.info(`Rewind.loadTreeCacheList - Get tree cache from API`, response);

                savedList = {
                    lastTimestamp: new Date(),
                    list: response,
                    accountType: this.accountType
                };

                // await mega.rewindStorage.saveTreeCacheList(savedList);
            }

            this.treeCacheList = savedList.list;
            this.sortTreeCacheList();
            this.treeCacheListTimestamp = savedList.lastTimestamp;
            this.rewindableDays = savedList.list.rd;
            this.lastRewindableDate = this.getStartOfDayBeforeDays(this.rewindableDays);
            this.lastRewindableMonth = this.getStartOfMonth(this.lastRewindableDate);
            this.lastRewindableYear = this.getStartOfYear(this.lastRewindableDate);
            this.lastRewindChangeLogDate = this.lastRewindableDate;

            const oldestTreeCache = this.getOldestTreeCache();
            if (oldestTreeCache) {
                const oldestTreeCacheDate = new Date(oldestTreeCache.ts * 1000);
                if (oldestTreeCacheDate > this.lastRewindableDate) {
                    this.lastRewindChangeLogDate = oldestTreeCacheDate;
                }
            }

            this.currentDate = new Date();

            this.currentUtcDate = new Date();
            this.currentUtcDate.setDate(this.currentUtcDate.getUTCDate());
            this.currentUtcDate.setFullYear(this.currentUtcDate.getUTCFullYear());
            this.currentUtcDate.setHours(23, 59, 59, 999);

            this.currentMonth = this.getStartOfMonth(this.currentDate);
            this.currentYear = this.getStartOfYear(this.currentDate);
            console.timeEnd('rewind:index:treeCache');
        }

        async loadChangeLog() {
            console.time('rewind:index:changeLog');
            const selectedHandle = this.selectedHandle;

            const currentTimeInSeconds = this.getCurrentTimeInSeconds();

            // FIXME: Temporarily disabling change log history for realtime status checking
            let savedChangeLog = Object.create(null);
            savedChangeLog =
                await this.getChangeLogByRewindableDays(selectedHandle, savedChangeLog, this.lastRewindableDate,
                                                        this.lastRewindChangeLogDate);
            this.changeLog = savedChangeLog;

            // TODO: If record is old on database, refresh
            this.changeLogTimestamp = currentTimeInSeconds;
            console.timeEnd('rewind:index:changeLog');
        }

        async getChangeLogByRewindableDays(selectedHandle, savedChangeLog, lastRewindableDate
            , lastRewindChangeLogDate) {
            const currentDate = new Date();
            const oldestChangeLogDate = lastRewindChangeLogDate || lastRewindableDate;
            // const startOfMonth = this.getStartOfMonth(lastRewindableDate);
            // const endOfMonth = this.getEndOfMonth(currentDate);

            const startInSeconds = oldestChangeLogDate.getTime() / 1000;
            const endInSeconds = currentDate.getTime() / 1000;
            const currentTimeInSeconds = currentDate.getTime() / 1000;
            const hasRecords = false;

            // let savedChangeLog = await mega.rewindStorage.getChangeLog(selectedHandle, startOfMonth);
            // if (savedChangeLog) {
            //     savedChangeLog = savedChangeLog.d;
            // }

            if (!hasRecords) {
                console.time('rewind:index:changeLog:api');
                const changeLogResponse = await mega.rewindUtils.getChangeLog(
                    selectedHandle,
                    startInSeconds,
                    endInSeconds
                );
                console.timeEnd('rewind:index:changeLog:api');

                const changeLogData = {
                    dates: Object.create(null),
                    lastTimestamp: currentTimeInSeconds,
                    hasRecords: false
                };

                const selectedData = changeLogResponse[selectedHandle];

                if (selectedData) {
                    const fileAddedOffset = 3;
                    const folderAddedOffset = 5;
                    const versionAdded = 9;
                    const versionRemoved = 10;
                    const fileRemovedOffset = 4;
                    const folderRemovedOffset = 6;
                    const timestampOffset = 0;

                    for (let i = 0; i < selectedData.length; i++) {
                        const currentData = selectedData[i];
                        const timeInSeconds = currentData[timestampOffset];
                        changeLogData.dates[this.getUTCDayMonthYear(timeInSeconds * 1000)] = {
                            added: currentData[fileAddedOffset] + currentData[folderAddedOffset],
                            modified: currentData[versionAdded] + currentData[versionRemoved],
                            removed: currentData[fileRemovedOffset] + currentData[folderRemovedOffset]
                        };
                    }
                }

                // console.timeEnd('rewind:index:changeLog');
                // await mega.rewindStorage.saveChangeLogByMonth(selectedHandle, startOfMonth, changeLogData);
                // console.timeEnd('rewind:index:changeLog');

                return changeLogData;
            }

            return savedChangeLog;
        }

        // TODO: Check locale calculateCalendar if it applies
        getDayMonthYear(selectedDate) {
            const currentDate = selectedDate && new Date(selectedDate) || new Date();
            return `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
        }

        getUTCDayMonthYear(selectedDate) {
            const currentDate = selectedDate && new Date(selectedDate) || new Date();
            return `${currentDate.getUTCFullYear()}-${currentDate.getUTCMonth()}-${currentDate.getUTCDate()}`;
        }

        getStartOfYear(selectedDate) {
            const currentDate = selectedDate && new Date(selectedDate) || new Date();
            const year = currentDate.getFullYear();
            currentDate.setFullYear(year, 0, 1);
            currentDate.setHours(0, 0, 0, 0);
            return currentDate;
        }

        getStartOfMonth(selectedDate) {
            const currentDate = selectedDate && new Date(selectedDate) || new Date();
            currentDate.setDate(1);
            currentDate.setHours(0, 0, 0, 0);
            return currentDate;
        }

        getEndOfMonth(selectedDate) {
            const currentDate = selectedDate ? new Date(selectedDate) : new Date();
            currentDate.setMonth(currentDate.getMonth() + 1, 0);
            currentDate.setHours(23, 59, 59, 999);
            return currentDate;
        }

        getCurrentTimeInSeconds() {
            return Date.now() / 1000;
        }

        getStartOfDayBeforeDays(days, selectedDate) {
            const currentDate = selectedDate && new Date(selectedDate) || new Date();
            currentDate.setDate(currentDate.getDate() - days);
            currentDate.setHours(0, 0, 0, 0);
            return currentDate;
        }

        getRewindDescriptionData() {
            let hasUpgrade = true;
            const title = l.rewind_upg_header;
            let description = l.rewind_select_date_free;

            switch (this.accountType) {
                case ACCOUNT_TYPE_PRO_LITE:
                    // description = l.rewind_upg_content_pro_lite;
                    description = l.rewind_select_date_pro_lite;
                    break;
                case ACCOUNT_TYPE_PRO:
                case ACCOUNT_TYPE_PRO_FLEXI:
                case ACCOUNT_TYPE_BUSINESS:
                    description = l.rewind_select_date_pro;
                    hasUpgrade = false;
                    break;
            }

            return {
                hasUpgrade,
                title,
                description
            };
        }

        getUpgradeSectionData() {
            let upgradeInfoText = l.rewind_upgrade_info_text;
            switch (this.accountType) {
                case ACCOUNT_TYPE_PRO:
                case ACCOUNT_TYPE_PRO_FLEXI:
                case ACCOUNT_TYPE_BUSINESS:
                    upgradeInfoText = false;
                    break;
            }
            return upgradeInfoText;
        }

        getDatepickerOverlayContent(type) {
            let description = null;
            switch (this.accountType) {
                case ACCOUNT_TYPE_FREE:
                    description = l.rewind_datepicker_overlay_free_days;
                    break;
                case ACCOUNT_TYPE_PRO_LITE:
                    description = l.rewind_datepicker_overlay_pro_lite_days;
                    break;
            }

            return description;
        }

        sortTreeCacheList() {
            if (!this.treeCacheList || !this.treeCacheList.h) {
                return;
            }

            this.treeCacheList.h.sort((a,b) => a.ts - b.ts);
        }

        getNearestTreeCache(currentTimestamp) {
            const latestReducer = (accumulator, currentValue) => {
                return accumulator.ts < currentTimestamp &&
                    currentValue.ts >= currentTimestamp ? accumulator : currentValue;
            };

            if (!this.treeCacheList.h || !this.treeCacheList.h.length) {
                return;
            }

            return this.treeCacheList.h.reduce(latestReducer);
        }

        getOldestTreeCache() {
            const oldestReducer = (accumulator, currentValue) => {
                return accumulator.ts < currentValue.ts ? accumulator : currentValue;
            };

            if (!this.treeCacheList.h || !this.treeCacheList.h.length) {
                return null;
            }

            return this.treeCacheList.h.reduce(oldestReducer);
        }

        async getRecords(timestamp) {
            this.resetProgress();

            console.time('rewind:index:getRecords');
            const date = new Date(timestamp);
            date.setHours(23, 59, 59, 999);
            date.setDate(date.getDate());

            let timestampInSeconds = date.getTime() / 1000;

            const selectedTreeCache = this.getNearestTreeCache(timestampInSeconds);

            if (selectedTreeCache && selectedTreeCache.ts > timestampInSeconds) {
                this.nodeDictionary = Object.create(null);
                // This is just to add placeholder for empty parents
                this.nodeDictionary[''] = Object.create(null);
                this.nodeDictionary[''].p = false;
                this.nodeChildrenDictionary = Object.create(null);
                this.nodeTreeDictionary = Object.create(null);
                this.nodeTreeStateDictionary = Object.create(null);
                this.sizeTreeDictionary = Object.create(null);
                this.treeCacheHistory = Object.create(null);
                return ERROR_TREE_CACHE_FUTURE;
            }

            if (!selectedTreeCache || !selectedTreeCache.ts) {
                this.nodeDictionary = Object.create(null);
                // This is just to add placeholder for empty parents
                this.nodeDictionary[''] = Object.create(null);
                this.nodeDictionary[''].p = false;
                this.nodeChildrenDictionary = Object.create(null);
                this.nodeTreeDictionary = Object.create(null);
                this.nodeTreeStateDictionary = Object.create(null);
                this.sizeTreeDictionary = Object.create(null);
                this.treeCacheHistory = Object.create(null);
                return ERROR_TREE_CACHE_EMPTY;
            }


            if (this.treeCache && selectedTreeCache.sn === this.treeCache.sn && this.treeCacheHistory.length) {
                logger.info(`Rewind.loadTreeCacheItem - #Rewind #API - TreeCache - Reusing current tree cache`);

                console.time('rewind:index:getRecords:tree:cache');
                const hasTreeCache = await this.loadTreeCacheItemFromCache();
                console.timeEnd('rewind:index:getRecords:tree:cache');

                // FIXME: Treecache might not be available but action packet can (verify with api)
                if (!hasTreeCache) {
                    return ERROR_TREE_CACHE_EMPTY;
                }
            }
            else {
                this.treeCache = selectedTreeCache;
                this.sequenceNumber = selectedTreeCache.sn;
                logger.info(`Rewind.loadTreeCacheItem - #Rewind #API - TreeCache - Reloading tree cache`);

                console.time('rewind:index:getRecords:tree');
                const hasTreeCache = await this.loadTreeCacheItem(selectedTreeCache);
                console.timeEnd('rewind:index:getRecords:tree');

                // FIXME: Treecache might not be available but action packet can (verify with api)
                if (!hasTreeCache) {
                    return ERROR_TREE_CACHE_EMPTY;
                }
            }

            const currentDate = Date.now();
            if (currentDate < date) {
                timestampInSeconds = currentDate / 1000;
            }

            console.time('rewind:index:getRecords:packet');
            await this.loadActionPacket(timestampInSeconds, selectedTreeCache && selectedTreeCache.sn || null
                , selectedTreeCache, this.treeCacheState);
            console.timeEnd('rewind:index:getRecords:packet');
            console.timeEnd('rewind:index:getRecords');

            this.handleProgress(-1, 0, true);

            return true;
        }

        async loadTreeCacheItem(treeCache) {
            if (!treeCache) {
                return false;
            }

            const cacheTimestamp = `${treeCache.ts}`;
            const cacheHandle = treeCache.h;
            const sequenceNumber = treeCache.sn;


            // this.treeCacheHistoryTask = mega.promise;
            this.nodeDictionary = Object.create(null);
            // This is just to add placeholder for empty parents
            this.nodeDictionary[''] = Object.create(null);
            this.nodeDictionary[''].p = false;
            this.nodeChildrenDictionary = Object.create(null);
            this.nodeTreeDictionary = Object.create(null);
            this.nodeTreeStateDictionary = Object.create(null);
            this.sizeTreeDictionary = Object.create(null);
            this.treeCacheHistory = Object.create(null);

            let treeCacheHistory = false;

            // Get tree cache state
            const treeCacheState = await mega.rewindStorage.getTreeCacheSNState(sequenceNumber);
            logger.info(`Rewind.loadTreeCacheItem - #Rewind #API - TreeCache - Current state`,
                        sequenceNumber, treeCacheState);

            if (treeCacheState && treeCacheState.s === mega.rewindStorage.STATE_SN_END) {
                logger.info(`Rewind.loadTreeCacheItem - #Rewind #API - TreeCache - Rewinding from DB`);
                console.time('rewind:index:getRecords:tree:db');
                treeCacheHistory = await mega.rewindStorage.getTreeCacheHistoryNodes(sequenceNumber, (progress) => {
                    mega.rewind.handleProgress(4, progress);
                });
                console.timeEnd('rewind:index:getRecords:tree:db');
                await this.prepareTreeCacheNodes(treeCacheHistory, this.nodeDictionary, this.nodeChildrenDictionary);
                logger.info(`Rewind.loadTreeCacheItem - #Rewind #DB - TreeCache ` +
                    `- Loaded from DB - ${treeCacheHistory.length} files`);
            }
            else {
                mega.rewind.handleProgress(4, 100);
            }

            treeCacheHistory = localStorage.rewindTreeCacheDisable === '1' ? false : treeCacheHistory;

            if (!treeCacheHistory || !treeCacheHistory.length) {
                // This is just the residue
                // If we are done processing then
                logger.info(`Rewind.loadTreeCacheItem - #Rewind #API - TreeCache - Rewinding from API`);
                await mega.rewindStorage.saveTreeCacheSNStateStart(sequenceNumber, treeCacheState);
                console.time('rewind:index:getRecords:tree:api');
                treeCacheHistory = await mega.rewindUtils.getChunkedTreeCacheHistory(
                    cacheTimestamp,
                    cacheHandle,
                    (progress) => {
                        mega.rewind.handleProgress(0, progress);
                    }
                );
                console.timeEnd('rewind:index:getRecords:tree:api');
                await mega.rewindStorage.saveTreeCacheSNStateEnd(sequenceNumber, treeCacheState);

                logger.info(`Rewind.loadTreeCacheItem - #Rewind #API - TreeCache - Loaded from API - ` +
                    `${Object.keys(this.nodeDictionary).length - 1} files`);
            }
            else {
                mega.rewind.handleProgress(0, 100);
            }

            this.treeCacheState = treeCacheState;
            this.treeCacheHistory = treeCacheHistory;
            return !(!this.treeCacheHistory) || (this.treeCacheHistory && Object.keys(this.treeCacheHistory).length);
        }

        async loadTreeCacheItemFromCache() {
            // this.treeCacheHistoryTask = mega.promise;
            this.nodeDictionary = Object.create(null);
            // This is just to add placeholder for empty parents
            this.nodeDictionary[''] = Object.create(null);
            this.nodeDictionary[''].p = false;
            this.nodeChildrenDictionary = Object.create(null);
            this.nodeTreeDictionary = Object.create(null);
            this.nodeTreeStateDictionary = Object.create(null);
            this.sizeTreeDictionary = Object.create(null);

            if (!this.treeCacheHistory.length) {
                return false;
            }

            await this.prepareTreeCacheNodes(this.treeCacheHistory, this.nodeDictionary, this.nodeChildrenDictionary);
            mega.rewind.handleProgress(4, 100);
            mega.rewind.handleProgress(0, 100);

            return !(!this.treeCacheHistory) || (this.treeCacheHistory && Object.keys(this.treeCacheHistory).length);
        }

        // eslint-disable-next-line complexity
        async loadActionPacket(currentTimestamp, cacheSequenceNumber, treeCache, treeCacheState) {
            const dateData = Object.create(null);
            let isOutdated = false;
            let sn = null;

            console.time('rewind:index:getRecords:packet:db');
            let packets = await mega.rewindStorage.getActionPackets(
                cacheSequenceNumber,
                +currentTimestamp,
                (progress) => {
                    mega.rewind.handleProgress(6, progress);
                });
            console.timeEnd('rewind:index:getRecords:packet:db');
            logger.info(`Rewind.loadActionPacket - #Rewind #DB - ActionPacket - Loaded from DB - ` +
                    `${packets.length} action packets`);
            if (!packets || !packets.length) {
                packets = [];
            }

            // const lastSn = cacheSequenceNumber;
            let lastSn = cacheSequenceNumber;
            let lastOrder = 0;

            // Check last SN State
            if (treeCacheState && (!treeCacheState.lastTs || +treeCacheState.lastTs < +currentTimestamp)) {
                isOutdated = true;
                if (treeCacheState.lastSn) {
                    lastSn = treeCacheState.lastSn;
                    lastOrder = +(treeCacheState.lastOrder || 0);
                }
            }

            let hasActionPacketProgress = false;
            if (currentTimestamp) {
                if (isOutdated) {
                    const packetPromise = mega.promise;
                    mBroadcaster.once('rewind:packet:done', (response) => {
                        sn = response.sn;
                        packets = packets.concat(response.packets);
                        logger.info(`Rewind.loadActionPacket - #Rewind #API - ActionPacket - Loaded from API - ` +
                            `${response.packets.length} action packets`);
                        packetPromise.resolve();
                        console.timeEnd('rewind:index:getRecords:packet:api');
                    });

                    console.time('rewind:index:getRecords:packet:api');
                    // Check if we have records in DB, if not, get from API
                    await mega.rewindUtils.getChunkedActionPacketHistory(lastSn, currentTimestamp, () => {
                        this.handleProgress(5, progress);
                        hasActionPacketProgress = true;
                    });

                    await packetPromise;
                }

                const parsePacketData = (packetData, order) => {
                    // If we know the packetData is not an array
                    // and coming from DB
                    if (!Array.isArray(packetData)) {
                        return packetData;
                    }

                    const packet = packetData[0];
                    // If tree packet, remove the t property
                    if (packet.a === 't') {
                        delete packet.t;
                    }

                    return {
                        ts: packetData[3], // If no TS, used endTimestamp
                        order,
                        d: {
                            a: packet,
                            f: packetData[1]
                        },
                        save: 1
                    };
                };

                const currentDate = new Date(currentTimestamp * 1000);
                currentDate.setHours(23, 59, 59, 999); // set end of day

                const timestampInSeconds = currentDate.getTime() / 1000;

                const getActionDate = (inputTimestamp) => {
                    if (!inputTimestamp) {
                        return [0, 0];
                    }

                    const actionDate = new Date(inputTimestamp * 1000);
                    actionDate.setHours(23, 59, 59, 999);

                    return [actionDate.getTime() / 1000, actionDate.toISOString().split('T')[0]];
                };

                const prepareDateData = (actionDate, dateData) => {
                    if (!dateData[actionDate]) {
                        dateData[actionDate] = {
                            date: actionDate,
                            added: Object.create(null),
                            modified: Object.create(null),
                            removed: Object.create(null),
                            actions: [],
                            type: Object.create(null)
                        };
                    }
                };

                let order = (lastOrder || 0); // lastOrder is already incremented
                const promiseSet = new Set();
                let batchPromise = null;

                for (let i = 0; i < packets.length; i++) {
                    const packet = packets[i];
                    if (!packet) {
                        // Since we set from 1, not 0, possibility of null value
                        continue;
                    }

                    const packetInfo = parsePacketData(packet, order);
                    if (packetInfo.ts) {
                    // Packets with no timestamp are discarded since packet date is unknown
                        const packetTimestamp = packetInfo.ts;
                        const actionPacket = packetInfo.d.a;
                        const actionPacketCommand = actionPacket.a;
                        const actionPacketFiles = packetInfo.d.f;

                        // Handle packets
                        const itemTimestamp = packetTimestamp;
                        const actionDateInfo = getActionDate(itemTimestamp);
                        const actionTimestamp = actionDateInfo[0];
                        const actionDateString = actionDateInfo[1];

                        switch (actionPacketCommand) {
                            case 'u':
                                prepareDateData(actionDateString, dateData);
                                this.handleUpdatePacket(
                                    dateData, actionPacket, actionPacketFiles, actionDateString, itemTimestamp
                                );
                                break;
                            case 't':
                                // We make sure date data is available
                                prepareDateData(actionDateString, dateData);
                                this.handleTreePacket(
                                    dateData, actionPacket, actionPacketFiles, actionDateString,
                                    itemTimestamp, timestampInSeconds, actionTimestamp
                                );
                                break;
                            case 'd':
                                prepareDateData(actionDateString, dateData);
                                this.handleDeletePacket(dateData, actionPacket, actionDateString, itemTimestamp);
                                break;
                        }
                        // end handle packets

                        if (packetInfo.save) {
                            delete packetInfo.save;
                            batchPromise = mega.rewindStorage.saveActionPackets(cacheSequenceNumber, packetInfo);
                            if (!promiseSet.has(batchPromise)) {
                                promiseSet.add(batchPromise);
                            }
                        }
                    }

                    order++;
                }

                if ((sn && lastSn && lastSn !== sn) || (sn && !lastSn) || !treeCacheState.lastSn) {
                    // We fill in necessary details for
                    // next action packetretrieval
                    treeCacheState.lastSn = sn;
                    treeCacheState.lastTs = currentTimestamp;
                    treeCacheState.lastOrder = order;

                    // Save last SN
                    batchPromise = mega.rewindStorage.saveTreeCacheSNState(cacheSequenceNumber, treeCacheState);

                    logger.info('Rewind.loadActionPacket - Saving tree cache state',
                                cacheSequenceNumber, treeCacheState);

                    if (!promiseSet.has(batchPromise)) {
                        promiseSet.add(batchPromise);
                    }
                }

                const promiseArray = Array.from(promiseSet);
                // Wait to have everything flushed on the DB
                if (promiseArray.length) {
                    await Promise.all(promiseArray);
                }

                // For debugging only
                this.dateData = dateData;
            }

            if (!hasActionPacketProgress) {
                // We know there was no progress for action packet history
                this.handleProgress(5, 100);
            }
        }

        handleUpdatePacket(
            dateData, actionPacket, actionPacketFiles, actionDateString, actionPacketTimestamp
        ) {
            const nodes = actionPacketFiles.map((file) => {
                const node = this.nodeDictionary[file.h];
                if (node) {
                    file.p = node.p;
                    file.t = node.t;
                }
                return file;
            }).filter((file) => file.t !== undefined);

            dateData[actionDateString].actions.push({
                d: {
                    a: actionPacket,
                    f: nodes
                },
                ts: actionPacketTimestamp
            });

            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                this.prepareNode(node, dateData[actionDateString].modified, false, true);
                dateData[actionDateString].type[node.h] = TYPE_MODIFIED;

                // Cleanup previous records (might be at top of hierarchy)
                this.removeNode(node.h, this.nodeDictionary, this.nodeChildrenDictionary);

                // Add it again for right mapping
                this.prepareNode(node, this.nodeDictionary, this.nodeChildrenDictionary);
            }
        }

        // FIXME: Adjust later
        // eslint-disable-next-line complexity
        handleTreePacket(
            dateData, actionPacket, actionPacketFiles, actionDateString,
            actionPacketTimestamp, currentTimestamp, actionTimestamp
        ) {
            // FIXME: dateData for debugging purposes
            dateData[actionDateString].actions.push({
                d: {
                    a: actionPacket,
                    f: actionPacketFiles
                },
                ts: actionPacketTimestamp
            });

            for (let i = 0; i < actionPacketFiles.length; i++) {
                const node = actionPacketFiles[i];
                let existingNode = null;
                if (node) {
                    existingNode = this.nodeDictionary[node.h];
                    dateData[actionDateString].added[node.h] = node;
                    dateData[actionDateString].type[node.h] = TYPE_ADDED;
                    this.prepareNode(node, this.nodeDictionary, this.nodeChildrenDictionary);
                }

                if (node.fv || actionPacketFiles.length > 1) {
                    this.prepareNode(node, dateData[actionDateString].modified, false, true);
                    dateData[actionDateString].type[node.h] = TYPE_MODIFIED;

                    // Cleanup previous records (might be at top of hierarchy)
                    this.removeNode(node.h, this.nodeDictionary, this.nodeChildrenDictionary);

                    // Add it again for right mapping
                    this.prepareNode(node, this.nodeDictionary, this.nodeChildrenDictionary);
                }

                if (node && node.p === M.RubbishID) {
                    dateData[actionDateString].removed[node.h] = node; // TODO: CACHE: Better way caching removed
                    dateData[actionDateString].type[node.h] = TYPE_REMOVED;

                    if (existingNode) {
                        node.lp = existingNode.p;
                    }

                    if (dateData[actionDateString].modified[node.h]) {
                        delete dateData[actionDateString].modified[node.h];
                    }

                    if (dateData[actionDateString].added[node.h]) {
                        delete dateData[actionDateString].added[node.h];
                    }

                    if (currentTimestamp > actionTimestamp) {
                        this.removeNode(node.h, this.nodeDictionary, this.nodeChildrenDictionary);
                    }
                }
            }
        }

        handleDeletePacket(dateData, actionPacket, actionDate, actionPacketTimestamp) {
            const {a, n, v, m} = actionPacket;
            dateData[actionDate].actions.push({
                d: {
                    a,
                    n,
                    v,
                    m
                },
                ts: actionPacketTimestamp
            });

            const deletedNode = this.nodeDictionary[n];
            if (deletedNode && (!m && !v)) {
                dateData[actionDate].removed[n] = deletedNode; // TODO: CACHE: Better way caching removed
                dateData[actionDate].type[n] = TYPE_REMOVED;
                deletedNode.more = {
                    v,
                    m
                };
            }

            if (dateData[actionDate].added[n]) {
                delete dateData[actionDate].added[n];
            }

            this.removeNode(n, this.nodeDictionary, this.nodeChildrenDictionary);
        }

        async prepareTreeCacheNodes(treeCacheHistory, nodeDictionary, nodeChildrenDictionary) {
            const fileList = treeCacheHistory;
            const processInBatches = async(array, batchSize, callback) => {
                for (let i = 0; i < array.length; i += batchSize) {
                    const batch = array.slice(i, i + batchSize);
                    // Perform some processing on the batch
                    await callback(batch);
                }
            };

            await processInBatches(fileList, FMDB_FLUSH_THRESHOLD, async(batch) => {
                await new Promise((resolve) => {
                    for (let i = 0; i < batch.length; i++) {
                        this.prepareNode(batch[i], nodeDictionary, nodeChildrenDictionary, false, true);
                    }
                    resolve();
                });

                await tSleep(0.05);
            });

            this.sumSizeData();
        }

        prepareNode(node, nodeDictionary, nodeChildrenDictionary, decrypt, feedSizeData) {
            if (decrypt || typeof node.k === 'string') {
                node = nodeDictionary[node.h] = crypto_decryptnode(node);
                // TODO: Update record in DB
            }
            else {
                nodeDictionary[node.h] = node;
            }

            if (nodeChildrenDictionary) {
                if (!nodeChildrenDictionary[node.p]) {
                    nodeChildrenDictionary[node.p] = Object.create(null);
                }
                nodeChildrenDictionary[node.p][node.h] = node.t + 1;
            }

            if (feedSizeData) {
                this.feedSizeData(node);
            }
            else {
                this.addSizeData(node);
            }
        }

        removeNode(nodeHandle, nodeDictionary, nodeChildrenDictionary) {
            const node = nodeDictionary[nodeHandle];

            if (!node) {
                logger.info('Rewind.removeNode - node does not exist in dictionary', nodeHandle);
                return;
            }

            const lastParentHandle = node.lp || node.p;
            if (nodeChildrenDictionary[lastParentHandle]) {
                delete nodeChildrenDictionary[lastParentHandle][nodeHandle];

                // We remove the parent children map if its empty
                if (!Object.keys(nodeChildrenDictionary[lastParentHandle]).length) {
                    delete nodeChildrenDictionary[lastParentHandle];
                }
            }

            this.deleteSizeData(node);

            delete this.nodeDictionary[nodeHandle];
        }

        getChildNodes({selectedHandle, currentLevel = 1, includeParent = true, ts = 0}) {
            let timestampInSeconds = 0;

            if (ts) {
                const date = new Date(ts);
                date.setHours(23, 59, 59, 999);
                date.setDate(date.getDate());
                timestampInSeconds = date.getTime() / 1000;
            }

            const childrenNodes = this.nodeChildrenDictionary[selectedHandle];
            const currentNode = this.nodeDictionary[selectedHandle];
            let nodes = [];
            let sortedNodes = [];
            let childrenKeys = [];

            if (currentNode.t) {
                this.nodeTreeDictionary[currentNode.h] = currentLevel;
                this.openTree(selectedHandle);
            }

            if (childrenNodes) {
                childrenKeys = Object.keys(childrenNodes);
                if (childrenKeys.length) {
                    sortedNodes = this.sortByFolderAndName(childrenKeys, true);
                }
            }

            if (includeParent) {
                nodes.push(currentNode.h);
            }

            for (let i = 0; i < sortedNodes.length; i++) {
                const node = mega.rewind.nodeDictionary[sortedNodes[i]];
                if (node) {
                    if (!timestampInSeconds || node.ts <= timestampInSeconds) {
                        if (node.t && this.isTreeOpen(node.h)) {
                            const result = this.getChildNodes({
                                selectedHandle: node.h,
                                currentLevel: currentLevel + 1,
                                ts,
                            });
                            nodes = nodes.concat(result);
                        }
                        else if (!node.fv) {
                            nodes.push(node.h);
                        }
                    }

                    // Last item, save last element
                    if (i + 1 === sortedNodes.length) {
                        // To be able to see the linked list
                        // on where to stop looking for the end index
                        currentNode.handleEnd = node.h;
                        if (node.t) {
                            currentNode.handleEndFolder = true;
                        }
                    }
                }
            }

            return nodes;
        }

        sortByFolderAndName(nodes, useDictionary) {
            const sortFunction = M.getSortByNameFn2(1);
            return nodes.sort((a, b) => {
                let nodeA = a;
                let nodeB = b;

                if (useDictionary) {
                    nodeA = this.nodeDictionary[a];
                    nodeB = this.nodeDictionary[b];
                }

                if (!nodeA || !nodeB) {
                    return -1;
                }

                if (nodeA.t > nodeB.t) {
                    return -1;
                }
                else if (nodeA.t < nodeB.t) {
                    return 1;
                }

                return sortFunction(nodeA, nodeB);
            });
        }

        isTreeOpen(nodeHandle) {
            return this.nodeTreeStateDictionary[nodeHandle];
        }

        openTree(nodeHandle) {
            this.nodeTreeStateDictionary[nodeHandle] = TREE_STATE_OPEN;
        }

        closeTree(nodeHandle) {
            if (this.nodeTreeStateDictionary[nodeHandle]) {
                delete this.nodeTreeStateDictionary[nodeHandle];
            }
        }

        resetTree() {
            this.nodeTreeDictionary = Object.create(null);
            this.nodeTreeStateDictionary = Object.create(null);
        }

        getNodeDictionary(type, selectedDateString) {
            let { nodeDictionary } = this;
            if (type === TYPE_REMOVED) {
                nodeDictionary =
                    this.dateData &&
                    this.dateData[selectedDateString] &&
                    this.dateData[selectedDateString].removed;
            }

            if (type === TYPE_MODIFIED) { // TODO: Improve approach on dictionary
                nodeDictionary =
                    this.dateData &&
                    this.dateData[selectedDateString] &&
                    this.dateData[selectedDateString].modified;
            }

            return nodeDictionary;
        }

        // eslint-disable-next-line complexity
        async injectNodes(selectedHandle, newHandle, callback, parentHandle, selectedType, selectedDateString) {
            const nodeParentStack = [];
            const nodeStack = [];

            const nodeDictionary = this.getNodeDictionary(selectedType, selectedDateString);
            const nodeChildrenDictionary = mega.rewind.nodeChildrenDictionary;

            let node = nodeDictionary[selectedHandle];
            let isFromMain = false;
            let lastParentHandle = null;
            let rootNodeReached = false;
            const oldRootID = M.RootID;
            const oldRubbishID = M.RubbishID;

            while (node && !rootNodeReached && !isFromMain) {

                if (node.p === false) {
                    break;
                }

                const newParentHandle = this.makeDummyHandle(node.p);
                if (lastParentHandle !== null) {
                    newHandle = lastParentHandle;
                }

                const newNode = M.d[newHandle] = {...node};
                // Set new node current handle
                const oldHandle = newNode.h;

                newNode.h = newHandle;
                newNode.rewind = 1;
                nodeStack.push(newHandle);

                // Switch to parent dictionary
                let parentNode = this.nodeDictionary[node.p];
                if (!parentNode) {
                    parentNode = M.d[node.p];
                    isFromMain = true;
                }

                if (node && node.p === '') {
                    if (oldHandle === M.RootID) {
                        M.RootID = newNode.h;
                    }
                    if (oldHandle === M.RubbishID) {
                        M.RubbishID = newNode.h;
                    }
                }

                if (parentNode && parentNode.p === '') { // Parent is root directory
                    rootNodeReached = true;
                    node = parentNode;
                    continue;
                }

                newNode.p = newParentHandle;
                lastParentHandle = newParentHandle;

                if (!M.c[newParentHandle]) {
                    M.c[newParentHandle] = Object.create(null);
                    nodeParentStack.push(newParentHandle);
                }
                M.c[newParentHandle][newHandle] = newNode.t + 1;

                node = parentNode;
            }

            // Check if versioned file
            this.handleInjectedVersionedFile(
                { selectedHandle, newHandle, nodeDictionary, nodeChildrenDictionary, nodeParentStack, nodeStack }
            );

            console.error('---- FIXME ----- ');
            await callback();

            let counter = 0;
            for (counter = 0; counter < nodeStack.length; counter++) {
                delete M.d[nodeStack[counter]];
            }
            for (counter = 0; counter < nodeParentStack.length; counter++) {
                delete M.c[nodeParentStack[counter]];
            }

            // Restore Rubbish and RootID
            M.RootID = oldRootID;
            M.RubbishID = oldRubbishID;
        }

        handleInjectedVersionedFile(
            options
        ) {
            const {
                selectedHandle,
                nodeDictionary,
                newHandle,
                nodeChildrenDictionary,
                nodeParentStack,
                nodeStack
            } = options;

            const childrenNodes = nodeChildrenDictionary[selectedHandle];
            if (!childrenNodes) {
                return;
            }

            const childNodeKeys = Object.keys(childrenNodes);

            let originalHandle = null;
            for (let i = 0; i < childNodeKeys.length; i++){
                const currentKey = childNodeKeys[i];
                const currentNode = {...nodeDictionary[currentKey]};

                if (currentNode) {
                    originalHandle = currentNode.h;
                    currentNode.p = newHandle;
                    currentNode.h = this.makeDummyHandle(originalHandle);
                    currentNode.rewind = 1;

                    M.d[currentNode.h] = currentNode;
                    nodeStack.push(currentNode.h);

                    if (!M.c[newHandle]) {
                        M.c[newHandle] = Object.create(null);
                        nodeParentStack.push(newHandle);
                    }
                    M.c[newHandle][currentNode.h] = currentNode.t + 1;

                    if (nodeChildrenDictionary[originalHandle]) {
                        this.handleInjectedVersionedFile({
                            selectedHandle: originalHandle,
                            newHandle: currentNode.h,
                            nodeDictionary,
                            nodeChildrenDictionary,
                            nodeParentStack,
                            nodeStack
                        });
                    }
                }
            }
        }

        makeDummyHandle(handle) {
            if (!handle || !handle.length) {
                return handle;
            }

            return `_${makeid(handle.length - 1)}`;
        }

        getListContainer() {
            const hasItems = !!M.v.length;

            if (!hasItems) {
                let emptyFolderName = null;
                switch (M.currentdirid) {
                    case M.RubbishID:
                        emptyFolderName = '.fm-empty-trashbin';
                        break;
                    case M.RootID:
                        if (folderlink) {
                            emptyFolderName = '.fm-empty-folder';
                            break;
                        }
                        emptyFolderName = '.fm-empty-cloud';
                        break;
                    default:
                        emptyFolderName = '.fm-empty-folder';
                        break;
                }

                if (String(M.currentdirid).substr(0, 7) === 'search/'
                    || mega.ui.mNodeFilter.selectedFilters.value
                    && M.currentrootid !== 'shares') {
                    emptyFolderName = '.fm-empty-search';
                }

                return document.querySelector(`${emptyFolderName}`);
            }

            if (!M.megaRender) {
                if (d) {
                    logger.debug('No MegaRender instance');
                }
                return;
            }

            // if (!viewModeContainers[M.megaRender.section]) {
            //     if (d) {
            //         logger.debug('No MegaRender instance');
            //     }
            //     return;
            // }

            const section = viewModeContainers[M.megaRender.section];

            if (!section) {
                if (d) {
                    logger.debug('No section available', M.megaRender.section);
                }
                return;
            }

            const viewSection = section[M.megaRender.viewmode];
            if (!viewSection) {
                if (d) {
                    logger.debug('No view section available', M.megaRender.section, M.megaRender.viewmode);
                }
                return;
            }

            const listContainer = document.querySelector(viewSection);

            if (!listContainer) {
                if (d) {
                    logger.debug('No container',
                                 M.megaRender.section, M.megaRender.viewmode
                    );
                }
                return;
            }

            return listContainer;
        }

        getOpenSidebarEventData(selectedHandle, fromRedirect, fromSidebar) {
            // This is not likely accurate but a start
            let trigger = TRIGGER_CURRENT_DIRECTORY;
            let location = LOCATION_CLOUD_DRIVE;

            if (selectedHandle !== M.currentdirid) {
                trigger = TRIGGER_FOLDER_CONTEXT_MENU;
            }

            if (fromRedirect) {
                trigger = TRIGGER_LEFT_PANEL;
            }

            if (M.RootID !== selectedHandle) {
                location = LOCATION_UNKNOWN;
            }

            if (fromSidebar) {
                trigger = TRIGGER_SIDEBAR_CONTEXT_MENU;
            }

            return JSON.stringify([1, u_attr.p | 0, location | 0, trigger | 0]);
        }

        async logAccountTypeChanges() {
            const rewindType = await Promise.resolve(mega.attr.get(u_handle, `rwt`, false, true)).catch(nop);
            const currentTimestamp = Date.now();

            if (!rewindType) {
                return;
            }

            // Stop evaluation if we know its disabled
            if (parseInt(rewindType.d)) {
                return;
            }

            // Check if more than 24 hours then set disable to true
            // and avoid further checking
            if ((currentTimestamp - parseInt(rewindType.ts)) >= MILLISECONDS_24HOURS) {
                rewindType.d = `1`;
                await mega.attr.set(`rwt`, rewindType, false, true);
                return;
            }

            // If we detect account changes within the
            // last 24 hours after clicking rewind upgrade
            const hasActuallyUpgraded = (oldType, newType) => {
                const businessOrProFlexi = u_attr.b || u_attr.pf;
                const isExpired =  businessOrProFlexi && businessOrProFlexi.s === pro.ACCOUNT_STATUS_EXPIRED;

                // If we have an expired business or pro flexi
                if (isExpired) {
                    return false;
                }

                // If user is on free lineup
                if (oldType === 0 && newType >= pro.ACCOUNT_LEVEL_PRO_I)  {
                    return true;
                }

                // If user is on pro lite
                if ((oldType === pro.ACCOUNT_LEVEL_PRO_LITE &&
                    newType >= pro.ACCOUNT_LEVEL_PRO_I)) {
                    return true;
                }

                // If user is on pro level
                return !!(newType >= oldType &&
                    newType !== pro.ACCOUNT_LEVEL_PRO_LITE);
            };

            const accountType = u_attr.p | 0;
            const beforeAccountType = parseInt(rewindType.t);
            if (beforeAccountType !== accountType) {
                const hasUpgraded = hasActuallyUpgraded(beforeAccountType, accountType);
                if (hasUpgraded) {
                    const eventData = JSON.stringify([0, accountType, beforeAccountType]);
                    delay('rewind:account-upgrade', eventlog.bind(null, 500004, eventData));
                }

                rewindType.d = `1`;
                rewindType.t = `${accountType}`;

                await mega.attr.set(`rwt`, rewindType, false, true);
            }
        }

        saveLastUpgradeClick() {
            const accountType = u_attr.p | 0;
            mega.attr.set(`rwt`, { t: `${accountType}`, ts: `${Date.now()}`, d: `0` }, false, true);
        }

        addNodeFromWorker(decryptedNode) {
            if (!this.putQueue) {
                this.putQueue = [];
                this.putQueueTail = 0;
                this.putQueueHead = 0;
            }

            this.putQueue.push([
                mega.rewindStorage.saveTreeCacheHistoryNode.bind(mega.rewindStorage),
                this.sequenceNumber,
                decryptedNode
            ]);

            if (this.putQueue.length > FMDB_FLUSH_THRESHOLD) {
                const batch = this.putQueue.slice(0, FMDB_FLUSH_THRESHOLD);
                this.putQueue.splice(0, FMDB_FLUSH_THRESHOLD);

                if (d) {
                    logger.info('Flushing nodes');
                }
                for (const item of batch) {
                    const [putFunction, ...putArgs] = item;
                    putFunction(...putArgs);
                }
            }

            this.prepareNode(decryptedNode, this.nodeDictionary, this.nodeChildrenDictionary, false, true);
        }

        clear() {
            this.treeCache = [];
            this.treeCacheState = Object.create(null);
            this.nodeDictionary = Object.create(null);
            this.nodeChildrenDictionary = Object.create(null);
            this.nodeTreeDictionary = Object.create(null);
            this.nodeTreeStateDictionary = Object.create(null);
            this.sizeTreeDictionary = Object.create(null);
            this.treeCacheHistory = Object.create(null);
        }

        // eslint-disable-next-line complexity
        handleProgress(type, progress, done) {
            if (!this.progress) {
                this.resetProgress();
            }

            // percentage factor is 25%
            switch (type) {
                case 0: //  Tree Cache - API Request
                    this.progress.percentage[type] = [progress, 0.20];
                    break;
                case 1: // Tree Cache - Worker process
                    {
                        // API Percentage
                        const apiProgress = this.progress.percentage[0] && this.progress.percentage[0][0] || 0;

                        // If api is greater than 10%, we assume its 10% of the items
                        if (!this.progress.treeCacheThreshold) {
                            // We get the 10% of the remaining before the first tree node was loaded
                            this.progress.treeCacheThreshold = apiProgress + ((100 - apiProgress) / 10);
                        }

                        if (this.progress.treeCacheThresholdReached) {
                            const percentage = (progress / this.progress.totalEstTreeCacheItems);
                            const finalPercent = !isNaN(percentage) && Number.isFinite(percentage) && percentage || 1;
                            this.progress.percentage[type] = [
                                finalPercent * 100,
                                0.20
                            ];
                        }
                        else if (apiProgress >= this.progress.treeCacheThreshold) {
                            this.progress.treeCacheThresholdReached = true;
                            this.progress.totalEstTreeCacheItems = progress * 10;
                            const percentage = (progress / this.progress.totalEstTreeCacheItems);
                            const finalPercent = !isNaN(percentage) && Number.isFinite(percentage) && percentage || 1;
                            this.progress.percentage[type] = [finalPercent * 100, 0.20];
                        }
                        else {
                            this.progress.currentTreeCacheItems = progress;
                        }
                    }
                    break;
                case 2: // Action Packet - API Request
                    // this.progress[type].percentage = progress * 0.25;
                    break;
                case 3: // Action Packet - Worker process
                    // this.progress[type].percentage = progress * 0.25;
                    break;
                case 4: // Tree Cache - DB Request
                    this.progress.percentage[type] = [progress, 0.20]; // 0.5 factor because of action packets retrieval
                    break;
                case 5: // Action Packets - API Request
                    this.progress.percentage[type] = [progress, 0.20]; // 0.5 factor because of action packets retrieval
                    break;
                case 6: // Action Packets - DB Request
                    this.progress.percentage[type] = [progress, 0.20]; // 0.5 factor because of action packets retrieval
                    break;
            }

            if (done) {
                this.progress.percentage[type] = [100, 0.20];
            }

            if (this.progress.percentage.length) {
                let totalProgress = this.progress.percentage.reduce((total, currentValue) => {
                    return parseInt(total) + (currentValue[0] || 0) * (currentValue[1] || 0);
                }, 0);

                if (type === -1 && done) {
                    totalProgress = 100;
                }

                if (totalProgress > 100) {
                    delay('rewind:datafetch-percent-over-100', eventlog.bind(null, 500523));
                    totalProgress = 100;
                }

                mBroadcaster.sendMessage('rewind:progress', totalProgress);
            }
        }

        async resetProgress() {
            this.progress = Object.create(null);
            this.progress.treeCacheThreshold = 0;
            this.progress.currentTreeCacheItems = 0;
            this.progress.totalEstTreeCacheItems = 0;
            this.progress.treeCacheThresholdReached = false;
            this.progress.currentActionItems = 0;
            this.progress.totalEstActionItems = 0;
            this.progress.percentage = [];
        }

        async resetStorageCache() {
            const treeCache = this.treeCache;
            const sequenceNumber = treeCache.sn;
            await mega.rewindStorage.getTreeCacheSNState(sequenceNumber);
            await mega.rewindStorage.clearTreeCacheSNState(sequenceNumber);
            await mega.rewindStorage.clearActionPackets(sequenceNumber);
        }

        createSizeTreeNode(nodeHandle, node) {
            const tmp = this.sizeTreeDictionary[nodeHandle] = Object.create(null);
            tmp.td = 0;
            tmp.tf = 0;
            tmp.tb = 0;
            tmp.tvf = 0;
            tmp.tvb = 0;
            tmp.h = node.h;
            tmp.p = node.p;
            tmp.fv = node.fv;
            tmp.s = node.s;
            tmp.t = node.t;

            tmp.rd = 0;
            tmp.rf = 0;
            tmp.rs = 0;

            return tmp;
        }

        getSizeTreeNode(nodeHandle) {
            if (!this.sizeTreeDictionary[nodeHandle]) {
                return {
                    td: 0,
                    tf: 0,
                    exist: false
                };
            }

            return this.sizeTreeDictionary[nodeHandle];
        }

        // eslint-disable-next-line complexity
        feedSizeData(node) {

            const nodeParentHandle = node.p || '';
            const nodeHandle = node.h;

            if (!this.sizeTreeDictionary) {
                this.sizeTreeDictionary = Object.create(null);
            }

            const nodeParent = this.sizeTreeDictionary[nodeParentHandle];
            if (!nodeParent) {
                const parentNode = this.sizeTreeDictionary[nodeParentHandle] = Object.create(null);
                parentNode.rd = node.t;
                parentNode.rf = 1 - node.t;
                parentNode.rs = node.s;
            }
            else if (node.fv || nodeParent.fv) {
                // Do nothing
            }
            else {
                // Just increment parent
                nodeParent.rd = (nodeParent.rd || 0) + node.t;
                nodeParent.rf = (nodeParent.rf || 0) + (1 - node.t);
                nodeParent.rs = (nodeParent.rs || 0) + node.s;
            }

            if (!this.sizeTreeDictionary[nodeHandle]) {
                this.createSizeTreeNode(nodeHandle, node);
            }
            // If its already existing but no metadata
            else if (typeof this.sizeTreeDictionary[nodeHandle].ts === 'undefined') {
                const tmp = this.sizeTreeDictionary[nodeHandle];
                tmp.h = node.h;
                tmp.p = node.p;
                tmp.fv = node.fv;
                tmp.s = node.s;
                tmp.t = node.t;
            }

            if (node.fv && this.sizeTreeDictionary[nodeHandle]) {
                this.sizeTreeDictionary[nodeHandle].rd = 0;
                this.sizeTreeDictionary[nodeHandle].rf = 1;
                this.sizeTreeDictionary[nodeHandle].rs = node.s;
                this.sizeTreeDictionary[nodeHandle].fv = node.fv;
            }
        }

        sumSizeData() {
            let parentHandle = null;
            let parentNode = null;
            for (const nodeHandle in this.sizeTreeDictionary) {
                parentHandle = nodeHandle;
                const currentNode = this.sizeTreeDictionary[nodeHandle];
                parentNode = this.sizeTreeDictionary[parentHandle];

                do {
                    parentNode.td = (parentNode.td || 0) + currentNode.rd;
                    if (parentNode.fv) { // If versioned file
                        parentNode.tvf = (parentNode.tvf || 0) + currentNode.rf;
                        parentNode.tvb = (parentNode.tvb || 0) + currentNode.rs;
                    }
                    else {
                        parentNode.tf = (parentNode.tf || 0) + currentNode.rf;
                        parentNode.tb = (parentNode.tb || 0) + currentNode.rs;
                    }
                } while ((parentNode = this.sizeTreeDictionary[parentNode.p]));
            }
        }

        // eslint-disable-next-line complexity
        addSizeData(node) {
            let td, tf, tb, tvf, tvb;
            const nodeHandle = node.h;
            const currentNode = node;
            node = this.getSizeTreeNode(nodeHandle);

            if (node.exist === false) {
                node = this.createSizeTreeNode(nodeHandle, currentNode);
            }

            if (node.t) {
                td = (node.td || 0) + 1;
                tf = (node.tf || 0);
                tb = (node.tb || 0);
                tvf = (node.tvf || 0);
                tvb = (node.tvb || 0);
            }
            else {
                td = 0;
                tf = (node.fv) ? 0 : 1;
                tb = (node.fv) ? 0 : node.s;
                tvf = (node.fv) ? 1 : 0;
                tvb = (node.fv) ? node.s : 0;
            }

            while ((typeof node.p !== 'undefined') && (node = this.getSizeTreeNode(node.p))) {
                node.td = (node.td || 0) + td;
                node.tf = (node.tf || 0) + tf;
                node.tb = (node.tb || 0) + tb;
                node.tvf = (node.tvf || 0) + tvf;
                node.tvb = (node.tvb || 0) + tvb;
            }
        }

        deleteSizeData(node) {
            const nodeHandle = node.h;
            const currentNode = node;
            node = this.getSizeTreeNode(nodeHandle);

            if (node.exists === false) {
                node = this.createSizeTreeNode(nodeHandle, currentNode);
            }

            if (node) {
                let td, tf, tb, tvf, tvb;

                if (node.t) {
                    td = node.td + 1;
                    tf = node.tf;
                    tb = node.tb;
                    tvf = node.tvf || 0;
                    tvb = node.tvb || 0;
                }
                else {
                    td = 0;
                    tf = (node.fv) ? 0 : 1;
                    tb = (node.fv) ? 0 : node.s;
                    tvf = (node.fv) ? 1 : 0;
                    tvb = (node.fv) ? node.s : 0;
                }

                while ((typeof node.p !== 'undefined') && (node = this.getSizeTreeNode(node.p))) {
                    node.td -= td;
                    node.tf -= tf;
                    node.tb -= tb;
                    node.tvf -= tvf;
                    node.tvb -= tvb;
                }
            }
        }

        /**
         * Handles start of rewind UI (sidebar) after an event is triggered
         * @param {Number} eventId - Event ID
         * @param {Boolean} isInitialNodeAllowed - Whether rewind can be initiated on a inital node
         *                                         In case "false" current folder will be used as default node
         * @returns {void}
         */
        _startOnEvent(eventId, isInitialNodeAllowed) {
            if (eventId) {
                eventlog(eventId);
            }

            if (M.isInvalidUserStatus()) {
                return;
            }

            if (mega.rewindUtils.reinstate.inProgress) {
                M.openFolder(mega.rewind.selectedHandle, true);
                return;
            }

            let selectedHandle = $.selected.length && $.selected[0] || M.currentdirid;

            if (mega.rewind.permittedRoots[M.currentrootid]
                && M.currentCustomView && M.currentCustomView.nodeID) {
                selectedHandle = M.currentCustomView.nodeID;
            }

            const node = M.getNodeByHandle(selectedHandle);

            // If no initial node allowed OR the selected node is not a folder, force current folder to be selected
            if (!isInitialNodeAllowed || !node.t) {
                selectedHandle = M.currentdirid;
            }

            if (this._isRedirect(selectedHandle)) {
                mega.rewind.folderRedirect = selectedHandle;
                M.openFolder(selectedHandle, true);
                return;
            }

            mega.rewind.openSidebar(null, selectedHandle)
                .then(() => {
                    const eventData = mega.rewind.getOpenSidebarEventData(selectedHandle);
                    if (eventData) {
                        eventlog(500001, eventData);
                    }
                })
                .catch(tell);
        }

        /**
         * Returns true whether redirect must be done
         * @param {String} selectedHandle - current selected handle
         * @returns {Boolean}
         */
        _isRedirect(selectedHandle) {
            const nodeRoot = M.getNodeRoot(selectedHandle);
            if (nodeRoot === M.RootID) {
                if (nodeRoot !== M.currentrootid) {
                    return true;
                }

                if (selectedHandle !== M.currentdirid) {
                    const nodeParent = M.getNodeParent(selectedHandle);
                    return mega.rewindUi.sidebar.active ? M.currentdirid !== nodeParent : true;
                }

                if (M.gallery) {
                    M.gallery = false;
                    if (fmconfig.uiviewmode | 0) {
                        mega.config.set('viewmode', 0);
                    }
                    else {
                        fmviewmode(M.currentdirid, 0);
                    }
                    return true;
                }
            }
            return false;
        }
    };
});
