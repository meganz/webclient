lazy(mega, 'rewindUi', () => {
    'use strict';

    const sidebarClass = 'rewind-sidebar';
    const activeContainerClass = 'active-rewind';
    const logger = new MegaLogger('ui', null, MegaLogger.getLogger('rewind'));
    const DAYS_LIST = [
        // Sun - Sat
        l[8763], l[8764], l[8765], l[8766], l[8767], l[8768], l[8769]
    ];
    const MONTHS_LIST = [
        l[408], l[409], l[410], l[411], l[412], l[413], // January - June
        l[414], l[415], l[416], l[417], l[418], l[419]  // July - December
    ];
    const MONTHS_SHORT_LIST = [
        l[24035], l[24037], l[24036], l[24038], l[24047], l[24039], // January - June
        l[24040], l[24041], l[24042], l[24043], l[24044], l[24045]  // July - December
    ];

    const LEFT_CALENDAR_OFFSET = -80;
    const TYPE_NONE = 0;
    const TYPE_ADDED = 1;
    const TYPE_MODIFIED = 2;
    const TYPE_REMOVED = 3;

    const STR_TYPE_ADDED = 'added';
    const STR_TYPE_MODIFIED = 'modified';
    const STR_TYPE_REMOVED = 'removed';

    const LIST_SELECT_ALL = 'all';

    const TREE_SELECT = 1;
    const TREE_SELECT_PARTIAL = 2;

    const NODE_CHILDREN_TYPE_FILE = 1;

    const DATEPICKER_CELL_TYPE_DAY = 'day';
    const DATEPICKER_CELL_TYPE_MONTH = 'month';
    const DATEPICKER_CELL_TYPE_YEAR = 'year';

    const DATEPICKER_VIEW_TYPE_DAYS = 'days';
    const DATEPICKER_VIEW_TYPE_MONTHS = 'months';
    const DATEPICKER_VIEW_TYPE_YEARS = 'years';

    const DATEPICKER_SELECTOR = '.rewind-datepicker-calendar';

    const LOCATION_LANDING = 0;
    const LOCATION_CALENDAR = 1;
    const LOCATION_DOWNLOAD_DIALOG = 2;

    const TRIGGER_UPG_UNKNOWN = -1;
    const TRIGGER_UPG_CALENDAR_DAYS = 0;
    const TRIGGER_UPG_CALENDAR_MONTHS = 1;
    const TRIGGER_UPG_CALENDAR_YEARS = 2;
    const TRIGGER_UPG_DOWNLOAD_FREE = 3;
    const TRIGGER_UPG_LANDING_FREE = 4;
    const TRIGGER_UPG_LANDING_PRO_LITE = 5;

    class RewindSidebar {
        constructor() {
            this.parentContainer = null;
            this.$datepicker = null;
            this.currentIcon = null;
            this.currentNode = null;
            this.currentHandle = null;
            this.selectedNodes = Object.create(null);
            this.selectedNodesPartial = Object.create(null);
            this.selectedDate = null;
            this.selectedDateString = null;
            this.selectionMap = Object.create(null);
            this.$downloadUpgradeDialog = null;
            this.firstSelect = false;
            this.firstSelectLookup = false;

            /** @property RewindSidebar.template */
            lazy(this, 'template', () => {
                const res = getTemplate(pages.rewind ? 'rewind' : 'rewind_html');
                delete pages.rewind;
                return res;
            });
        }

        // eslint-disable-next-line complexity
        async init(parentContainer, selectedHandle, isOpenFolder) {
            const nodeDictionary = mega.rewind.nodeDictionary;
            let sizeTreeNode = Object.create(null);
            sizeTreeNode.td = 0;
            sizeTreeNode.tf = 0;

            let node = M.d[selectedHandle];

            if (nodeDictionary && nodeDictionary[selectedHandle]) {
                sizeTreeNode = mega.rewind.getSizeTreeNode(node.h);
                node = nodeDictionary[selectedHandle];
            }

            const totalFiles = sizeTreeNode.tf || node.tf || 0;
            const totalDirectories = sizeTreeNode.td || node.td || 0;
            this.firstSelect = false;
            this.firstSelectLookup = false;

            const previousHandle = this.currentHandle;
            this.currentNode = {...node};
            this.currentHandle = selectedHandle;

            // Move to rewind index
            if (!this.firstSelectLookup) {
                const firstSelect = await Promise.resolve(mega.attr.get(u_handle, `rws`, false, true)).catch(nop);
                this.firstSelect = !!firstSelect;
                this.firstSelectLookup = true;
            }

            // We know the action is from isOpenFolder and the sidebar is active
            if (isOpenFolder) {
                if (this.active) {
                    if (previousHandle && previousHandle === selectedHandle) {
                        return;
                    }

                    this.updateNodeDisplay();
                    this.updateDatepickerView();
                    this.displayList(this.selectedDate, isOpenFolder);
                    return;
                }
            }
            else {
                this.selectedDate = null;
            }

            if (this.parentContainer && this.parentContainer !== parentContainer) {
                this.parentContainer.querySelector('.rewind-sidebar').remove();
            }

            this.parentContainer = parentContainer;
            if (!parentContainer.querySelector(`.${sidebarClass}`)) {
                this.close();

                const $sidebarTemplate = $("<div/>", {
                    class: "rewind-sidebar sidebar"
                });
                const $scrollingBlock = $("<div/>", {
                    class: 'scrolling-block'
                });

                $scrollingBlock.safeAppend(this.template);
                $sidebarTemplate.safeAppend($scrollingBlock.prop('outerHTML'));
                this.parentContainer.appendChild($sidebarTemplate[0]);
            }

            this.sidebar = this.parentContainer.querySelector('.rewind-sidebar');
            this.scrollingBlock = this.sidebar.querySelector('.scrolling-block');
            this.$scrollingBlock = $(this.scrollingBlock);

            this.sidebar.classList.remove('hidden');
            this.parentContainer.classList.add(activeContainerClass);

            this.$closeButton = $('.close-sidebar', this.sidebar);
            this.$sidebarContent = $('.sidebar-content', this.sidebar);
            this.$dateIconInput = $('.datepicker-icon', this.sidebar);
            this.$contentUpgrade = $('.content-upgrade', this.$sidebarContent);
            this.$contentEmpty = $('.content-empty', this.$sidebarContent);
            this.$contentTreeCacheEmpty = $('.content-tree-cache-empty', this.$sidebarContent);
            this.$contentFolder = $('.content-folder', this.$sidebarContent);
            this.$contentFolderOptions = $('.folder-list.list-options', this.$contentFolder);
            this.$contentFolderList = $('.folder-list.list-content', this.$contentFolder);
            this.$contentDownload = $('.folder-download', this.$contentFolder);
            this.$contentDownloadCaption = $('.folder-download-caption', this.$contentDownload);
            this.$contentLoading = $('.content-loading', this.$sidebarContent);
            this.$contentLoadingProgress = $('.progress', this.$contentLoading);
            this.$downloadButton = $('.js-download', this.$contentDownload);
            this.$restoreButton = $('.js-rewind', this.sidebar);
            this.$contextMenu = $('.dropdown.body.context', document.body);
            this.$infoButton = $('.dropdown-item.properties-item-rewind', this.$contextMenu);
            this.$openFolderButton = $('.dropdown-item.open-item-rewind', this.$contextMenu);

            this.$contentEmpty.addClass('hidden');
            this.$contentTreeCacheEmpty.addClass('hidden');
            this.$contentUpgrade.addClass('hidden');
            this.$contentFolder.addClass('hidden');
            this.$contentLoading.addClass('hidden');

            this.updateNodeDisplay();
            await M.require('datepicker_js');

            this.DATEPICKER_OPTIONS = {
                classes: 'rewind-datepicker-calendar',
                dateFormat: 'mm/dd/yyyy',
                minDate: null,
                startDate: null,
                prevHtml: '<i class="sprite-fm-mono icon-arrow-right"></i>',
                nextHtml: '<i class="sprite-fm-mono icon-arrow-right"></i>',
                altField: null,
                firstDay: 0,
                autoClose: true,
                toggleSelected: false,
                position: 'bottom left',
                language: {
                    daysMin: DAYS_LIST,
                    months: MONTHS_LIST,
                    monthsShort: MONTHS_SHORT_LIST
                },
                onRenderCell: (date, cellType, oldHtml) => {
                    let cellContent = `<span class="cell-value">${oldHtml}</span>`;
                    let cellClasses = '';
                    let disabledCellContent = null;
                    let isDisabled = false;
                    let hasRecord = false;
                    let isFuture = false;

                    if (mega.rewind.isAccountProType()) {
                        disabledCellContent = `<span 
                            class="cell-value simpletip"
                            data-simpletip="${l.rewind_datepicker_cell_tooltip_disabled_pro}"
                            data-simpletip-class="rewind-calendar-tooltip theme-dark-forced">
                            ${oldHtml}
                        </span>`;
                    }

                    if (cellType === DATEPICKER_CELL_TYPE_DAY) {
                        const key = mega.rewind.getDayMonthYear(date);
                        const record = mega.rewind.changeLog.dates[key];
                        hasRecord = typeof record !== 'undefined';
                        isDisabled = date < mega.rewind.lastRewindableDate;

                        if (hasRecord) {
                            cellClasses += ' -has-value-';

                            // TODO: Use the record from snapshot/tree cache
                            const formatLine = (classes, content, newLine, wrap) => {
                                const addLine = newLine ? '[BR]' : '';
                                if (wrap) {
                                    return `[I class=&quot;${classes}&quot;]${content}[/I]${addLine}`;
                                }
                                return `[I class=&quot;${classes}&quot;][/I]${content}${addLine}`;
                            };

                            const dateString = formatLine(
                                `item-date`,
                                `${this.formatTooltipDate(date)}`,
                                false,
                                true
                            );
                            const divAdded = formatLine(
                                `sprite-fm-mono icon-add-filled item-added`,
                                mega.icu.format(l.rewind_label_added, record.added)
                                    .replace('%1', this.formatNumber(record.added)),
                                true
                            );
                            const divModified = formatLine(
                                `sprite-fm-mono icon-changed item-modified`,
                                mega.icu.format(l.rewind_label_modified, record.modified)
                                    .replace('%1', this.formatNumber(record.modified)),
                                true
                            );
                            const divRemoved = formatLine(
                                `sprite-fm-mono icon-removed item-removed`,
                                mega.icu.format(l.rewind_label_removed, record.removed)
                                    .replace('%1', this.formatNumber(record.removed)),
                                true
                            );

                            const tooltip = `
                                ${dateString}
                                ${divAdded}
                                ${divModified}
                                ${divRemoved}
                            `;

                            cellContent = `<span 
                                class="cell-value simpletip"
                                data-simpletip="${tooltip}"
                                data-simpletip-class="rewind-calendar-tooltip theme-dark-forced">
                                ${oldHtml}
                            </span>`;
                            cellContent += '<span class="indicator-dot"></span>';
                        }
                        isFuture = date > mega.rewind.currentDate;
                    }
                    else if (cellType === DATEPICKER_CELL_TYPE_MONTH) {
                        isDisabled = date < mega.rewind.lastRewindableMonth;
                        isFuture = date > mega.rewind.currentMonth;
                    }
                    else if (cellType === DATEPICKER_CELL_TYPE_YEAR) {
                        isDisabled = date < mega.rewind.lastRewindableYear;
                        isFuture = date > mega.rewind.currentYear;
                    }

                    if (isFuture) {
                        cellClasses += ' -future-date-';
                        isDisabled = true;
                    }

                    if (!hasRecord && isDisabled && disabledCellContent) {
                        cellContent = disabledCellContent;
                    }

                    return {
                        html: cellContent,
                        classes: cellClasses,
                        disabled: isDisabled
                    };
                },
                onSelect: (date) => {
                    if (d) {
                        logger.debug('Calendar - Selected Date', date);
                    }

                    if (this.selectedDate && this.selectedDate.getTime() === new Date(date).getTime()) {
                        return;
                    }

                    this.displayList(date);

                    const getDayDifference = (previousDate) => {
                        const currentDate = new Date();
                        const previousDateObj = new Date(previousDate);
                        const timeDifference = currentDate - previousDateObj;
                        return Math.floor(timeDifference / (1000 * 60 * 60 * 24));
                    };

                    const dayDifference = getDayDifference(date);
                    if (!this.firstSelect) {
                        delay('rewind:log-first-select', eventlog.bind(null, 500003, [0, u_attr.p | 0, dayDifference]));
                        this.firstSelect = true;
                        this.firstSelectLookup = true;
                        mega.attr.set(`rws`, { ts: `${Date.now()}`, d: `${dayDifference}` }, false, true);
                    }

                    delay('rewind:log-select', eventlog.bind(null, 500005, [0, u_attr.p | 0, dayDifference]));
                },
                onShow: (context) => {
                    this.adjustDatepicker();
                    this.$datepickerContainer.addClass('active');
                    this.addDatepickerOverlay(context.currentView);
                },
                onHide: () => {
                    this.$datepickerContainer.removeClass('active');
                },
                onChangeMonth: (month, year) => {
                    this.onDatepickerChangeMonth(month, year);
                },
                onChangeYear: (year) => {
                    this.onDatepickerChangeYear(year);
                },
                onChangeDecade: (decade) => {
                    this.onDatepickerChangeDecade(decade);
                },
                onChangeView: function(type){
                    mega.rewindUi.sidebar.onDatepickerChangeView(type, this);
                }
            };

            if (this.$datepicker && this.getDatepickerInstance()) {
                this.getDatepickerInstance().destroy();
            }

            this.$datepickerContainer = $('.datepicker-container', this.sidebar);
            this.$datepicker = $('.datepicker-date', this.$datepickerContainer);
            this.$datepicker.val('');
            this.initializeDatepicker();

            const upgradeSectionData = mega.rewind.getRewindContentUpgradeData();

            this.$contentUpgradeTitle = $('.upgrade-title', this.$contentUpgrade);
            this.$contentUpgradeDescription = $('.upgrade-description', this.$contentUpgrade);
            this.$contentUpgradePurchaseButton = $('.upgrade-purchase-button', this.$contentUpgrade);
            this.$contentUpgradeNote = $('.upgrade-note', this.$contentUpgrade);

            this.$contentUpgradeTitle.text(upgradeSectionData.title);
            this.$contentUpgradeDescription.safeHTML(upgradeSectionData.description);
            this.$contentUpgradePurchaseButton.addClass('hidden');
            this.$contentUpgradeNote.addClass('hidden');

            if (upgradeSectionData.hasUpgrade) {
                this.$contentUpgradePurchaseButton.removeClass('hidden');
                this.$contentUpgradeNote.removeClass('hidden');
            }

            this.$contentUpgrade.removeClass('hidden');

            // Filter button
            this.$filterSelectButton = $('.filter-select-button', this.sidebar);
            this.$filterSelectOptionButton = $('.filter-select-button .option', this.sidebar);
            this.$filterSelectButton.addClass('disabled');

            // Set default filter label
            this.updateFilterLabel(new Date(), totalFiles, true);

            this.addEventHandlers();
            this.resizeMegaList();
            selectionManager.clear_selection();

            initPerfectScrollbar(this.$scrollingBlock, {
                scrollYMarginOffset: 10
            });

            this.adjustParentContainer();

            this.active = true;

            if (this.selectedDate) {
                logger.info('Rewind.init - Open existing date', this.selectedDate);
                if (this.$datepicker) {
                    this.$datepicker.val(this.selectedInputValue);
                }

                this.displayList(this.selectedDate, isOpenFolder);
            }
        }

        addDatepickerOverlay(type) {
            const currentViewInstance = this.getDatepickerViewInstance();
            const $currentViewElement = currentViewInstance.$el;
            const $cells = $('.datepicker--cell', $currentViewElement);
            const $cellsDisabled = $cells.filter(`.-disabled-:not('.-future-date-')`);
            const OVERLAY_SELECTOR = '.datepicker-overlay';

            $(OVERLAY_SELECTOR, $currentViewElement).remove();

            // No disabled cells, dont process further
            if (!$cellsDisabled.length) {
                return;
            }

            if (mega.rewind.isAccountProType()) {
                return;
            }

            const CELL_HEIGHT = $cells.outerHeight(true);
            const CELL_WIDTH = $cells.outerWidth(true);
            const CELL_PADDING_Y = parseFloat($cells.css('padding-top')) + parseFloat($cells.css('padding-bottom'));

            // Count disabled cells row divisible by 7 and add overlay, add extra overlay if partial row
            const CELL_ROW_COUNT = 7;
            const disabledCellsCount = $cellsDisabled.length;
            const remainingCells = disabledCellsCount % CELL_ROW_COUNT;
            let overlayCount = Math.floor(disabledCellsCount / CELL_ROW_COUNT);
            let addExtraOverlay = false;
            let overlayAdded = false;
            let overlayHeight = overlayCount * (CELL_HEIGHT + 5);
            let $overlay = null;
            let overlayCaption = mega.rewind.getDatepickerOverlayContent(type);
            let hasOverlayIncrease = false;

            if (overlayCaption) {
                overlayCaption = overlayCaption
                    .replace('[A]', '<a href="#" class="rewind-datepicker-upgrade">')
                    .replace('[/A]', '</a>');
            }

            const countWrappedLines = ($element) => {
                const lineHeight = parseFloat($element.css('line-height'));
                const containerHeight = $element.height();
                const linesWrapped = Math.round(containerHeight / lineHeight);
                return [linesWrapped, lineHeight];
            };

            const addWebkitEllipse = ($container, line) => {
                $container.css('display', '-webkit-box');
                $container.css('-webkit-line-clamp', `${line}`);
                $container.css('-webkit-box-orient', 'vertical');
                $container.css('overflow', 'hidden');
            };

            // We know the row is already full when there are 5 remaining cells on the next row
            if (overlayCount >= 1 && remainingCells === 5 && type !== DATEPICKER_VIEW_TYPE_DAYS) {
                overlayCount++;
                overlayHeight = overlayCount * (CELL_HEIGHT + 5);
                hasOverlayIncrease = true;
            }

            if (overlayCount > 0) {
                $overlay = $('<div class="datepicker-overlay"></div>');
                $overlay.css('height', `${overlayHeight + CELL_PADDING_Y}px`);
                if (type === DATEPICKER_VIEW_TYPE_DAYS) {
                    $overlay.css('margin-top', `${CELL_HEIGHT - 4}px`);
                }
                const overlayCaptionHtml = `<span>${overlayCaption}</span>`;
                if (overlayCaption) {
                    $overlay.safeHTML(overlayCaptionHtml);
                }

                $currentViewElement.safePrepend($overlay.prop('outerHTML'));
                overlayAdded = true;
            }

            if (remainingCells > 1 && !hasOverlayIncrease) {
                addExtraOverlay = true;
            }

            const $extraOverlay = $('<div class="datepicker-overlay"></div>');
            const addExtraOverlayElement = () => {
                let overlayExtraWidth = CELL_WIDTH * remainingCells;

                // No overlay was added and the remaining day for
                // the view is only 1 cell
                if (!overlayAdded && remainingCells === 1) {
                    // This is just to let us display the word
                    overlayExtraWidth += 20;
                }

                if (overlayAdded) {
                    $extraOverlay.css('height', `${CELL_HEIGHT}px`);
                    $extraOverlay.css('top', `${overlayHeight + CELL_PADDING_Y + CELL_HEIGHT}px`);
                }
                else {
                    $extraOverlay.css('height', `${CELL_HEIGHT + CELL_PADDING_Y}px`);
                    if (type === DATEPICKER_VIEW_TYPE_DAYS) {
                        $extraOverlay.css('margin-top', `${CELL_HEIGHT - 4}px`);
                    }

                    const overlayCaptionHtml = `<span>${overlayCaption}</span>`;
                    if (overlayCaption) {
                        $extraOverlay.safeHTML(overlayCaptionHtml);
                    }
                }

                $extraOverlay.css('width', `${overlayExtraWidth}px`);
                if ($overlay) {
                    $(OVERLAY_SELECTOR, $currentViewElement).after($extraOverlay.prop('outerHTML'));
                }
                else {
                    $currentViewElement.safePrepend($extraOverlay.prop('outerHTML'));
                }
            };

            if (addExtraOverlay) {
                addExtraOverlayElement();
            }

            // Clamp checking (for ellipsis)
            $overlay = $(OVERLAY_SELECTOR, $currentViewElement);
            const $overlaySpan = $('span', $overlay);
            const wrappedLines = countWrappedLines($overlaySpan);
            const [lineCount, lineHeight] = wrappedLines;

            if (lineCount * lineHeight > overlayHeight) {
                const newLineCount = Math.floor(overlayHeight / lineHeight) || 1;
                addWebkitEllipse($overlaySpan, newLineCount);
            }
        }

        onDatepickerChangeMonth() {
            this.addDatepickerOverlay(DATEPICKER_VIEW_TYPE_DAYS);
        }

        onDatepickerChangeYear() {
            this.addDatepickerOverlay(DATEPICKER_VIEW_TYPE_MONTHS);
        }

        onDatepickerChangeDecade() {
            this.addDatepickerOverlay(DATEPICKER_VIEW_TYPE_YEARS);
        }

        onDatepickerChangeView(type) {
            this.addDatepickerOverlay(type);
        }

        getDatepickerInstance() {
            if (this.$datepicker) {
                return this.$datepicker.data('datepicker');
            }

            return '';
        }

        initializeDatepicker() {
            if (!this.getDatepickerInstance()) {
                this.$datepicker.datepicker(this.DATEPICKER_OPTIONS);
            }
        }

        getDatepickerViewInstance() {
            const $datepicker = this.getDatepickerInstance();
            if (!$datepicker) {
                return;
            }

            const currentView = $datepicker.currentView;
            return $datepicker.views[currentView];
        }

        updateDatepickerView() {
            const currentViewInstance = this.getDatepickerViewInstance();
            if (!currentViewInstance) {
                return;
            }

            currentViewInstance._render();
        }

        formatNumber(number) {
            return mega.intl.decimal.format(number);
        }

        formatTooltipDate(date) {
            return time2date(date.getTime() / 1000, 18);
        }

        formatDownloadCaptionDate(date) {
            return time2date(date.getTime() / 1000, 2);
        }

        nodeUpdated() {
            this.close();
        }

        updateNodeDisplay() {
            const icon = fileIcon(this.currentNode);
            const folderIcon = this.sidebar.querySelector('.folder-info .folder-icon .transfer-filetype-icon');
            if (this.currentIcon) {
                folderIcon.classList.remove(this.currentIcon);
            }

            this.currentIcon = icon;
            if (folderIcon) {
                folderIcon.classList.add(icon);
            }
            const folderNameElement = this.sidebar.querySelector('.folder-info .folder-name');
            folderNameElement.innerText = this.getNodeNameInfo(this.currentNode)[0];
            folderNameElement.classList.add('simpletip');
            folderNameElement.dataset.simpletip = folderNameElement.title;
        }

        getDimensions($el) {
            const offset = $el.offset();
            return {
                width: $el.outerWidth(),
                height: $el.outerHeight(),
                left: offset.left,
                top: offset.top
            };
        }

        adjustParentContainer() {
            const $parentContainer = $(this.parentContainer);
            const containerDimensions = this.getDimensions($parentContainer);
            const $sidebar = $(this.sidebar);
            const sidebarDimensions = this.getDimensions($sidebar);
            const sidebarOffsetX = sidebarDimensions.width + sidebarDimensions.left;
            const containerOffsetX = containerDimensions.width + containerDimensions.left;
            const offsetDelta = containerOffsetX - sidebarOffsetX;

            if (offsetDelta < 0) {
                initPerfectScrollbar($(this.parentContainer));
            }
        }

        adjustDatepicker() {
            const $datepickerContainer = $(DATEPICKER_SELECTOR, document);
            if (!$datepickerContainer.length) {
                return;
            }

            const calendarDimensions = this.getDimensions($datepickerContainer);
            const $sidebar = $(this.sidebar);
            const sidebarDimensions = this.getDimensions($sidebar);
            const sidebarOffsetX = sidebarDimensions.width + sidebarDimensions.left;
            const calendarOffsetX = calendarDimensions.width + calendarDimensions.left;
            const offsetDelta = calendarOffsetX - sidebarOffsetX;
            const additionalMargin = 10;

            if (offsetDelta > 0) {
                const totalOffset = LEFT_CALENDAR_OFFSET + -1 * (offsetDelta + additionalMargin);
                $datepickerContainer.css('margin-left', totalOffset);
            }
        }

        isSameOrAncestor(nodeDictionary, currentHandle, previousHandle) {
            let n = nodeDictionary[currentHandle];

            if (!n) {
                return false;
            }

            while (n) {
                if (n.h === previousHandle) {
                    return true;
                }

                n = nodeDictionary[n.lp || n.p];
            }

            return false;
        }

        // eslint-disable-next-line complexity
        close(currentDirectory, newListContainer) {
            if (!this.active) {
                return false;
            }

            let isOpenFolder = false;
            let closeRewind = true;

            // We know its coming from openfolder
            if (currentDirectory) {
                // If its a related folder we dont close it
                if (this.currentHandle &&
                    this.isSameOrAncestor(M.d, currentDirectory, this.currentHandle)) {
                    isOpenFolder = true;
                    closeRewind = false;
                }

                // If its a new container, we close rewind and clear cache
                if (newListContainer && this.parentContainer !== newListContainer) {
                    closeRewind = true;

                    // If its its on the same folder, we are still using the cache
                    if (currentDirectory === this.currentHandle) {
                        isOpenFolder = true;
                    }
                }

                // If we are in gallery mode, we close and clear cache
                if (M.gallery) {
                    closeRewind = true;
                    isOpenFolder = false;
                }
            }


            if (this.parentContainer && closeRewind) {
                // hide the sidebar explicitly
                if (this.sidebar) {
                    this.sidebar.classList.add('hidden');
                }

                $('.content-item', this.$sidebarContent).addClass('hidden');
                // TODO: Clear content item specific containers with dynamic contents
                // Remove the parent container indicator
                this.parentContainer.classList.remove(activeContainerClass);
                this.removeEventHandlers();
                this.resizeMegaList();

                // We make sure the parent container perfect scroll is destroyed
                Ps.destroy(this.parentContainer);
                // Remove ps as it is the indicator to remove/create scrollbar
                this.parentContainer.classList.remove('ps');

                if (this.$datepicker && this.$datepicker.length && this.getDatepickerInstance()) {
                    this.getDatepickerInstance().destroy();
                }

                mega.rewind.removeNodeListener();

                if (!isOpenFolder) {
                    mega.rewind.clear();
                    this.selectedDate = null;
                }

                if (this.folderList) {
                    this.folderList.destroy();
                    this.folderList = null;
                }

                this.active = false;
            }

            return isOpenFolder;
        }

        removeEventHandlers() {
            if (this.$closeButton) {
                this.$closeButton.off('click.rewind');
            }

            if (this.$filterSelectButton) {
                this.$filterSelectButton.off('click.rewind');
                this.$filterSelectOptionButton.off('.rewind');
                $('.hidden-input', this.$filterSelectButton).off('.rewind');
            }

            if (this.$dateIconInput) {
                this.$dateIconInput.off('mouseup.rewind');
            }

            if (this.$contentUpgradePurchaseButton) {
                this.$contentUpgradePurchaseButton.off('click.rewind');
            }

            $('.option', this.$filterSelectButton).off('click.rewind');

            this.removeDownloadUpgradeHandlers();

            $(DATEPICKER_SELECTOR, document).off('click.rewind');

            mBroadcaster.removeListener('rewind:progress');
        }

        progressListener(progress) {
            this.$contentLoadingProgress.text(formatPercentage(progress / 100));
        }

        addEventHandlers() {
            this.$closeButton.rebind('click.rewind', () => {
                this.close();
            });

            this.$dateIconInput.rebind('mouseup.rewind', () => {
                if (this.getDatepickerInstance()) {
                    const datepickerInstance = this.getDatepickerInstance();

                    if (datepickerInstance.visible === true) {
                        datepickerInstance.hide();
                    }
                    else {
                        datepickerInstance.show();
                    }
                }
                return false;
            });

            this.$contentUpgradePurchaseButton.rebind('click.rewind', () => {
                const eventData = this.getUpgradeEventData(LOCATION_LANDING);
                if (eventData) {
                    delay('rewind:upgrade-click', eventlog.bind(null, 500002, eventData));
                    mega.rewind.saveLastUpgradeClick();
                }

                loadSubPage('pro');
            });

            // First of all handlers to detect if focused was set or not
            // We stop the propagation through immediate handlers (not the ancestors)
            this.$filterSelectButton.rebind('click.rewind', (e) => {
                const $target = $(e.target);
                if (this.$filterSelectButton.hasClass('focused') &&
                    ($target.closest('.filter-label') || $target.is('.filter-icon'))
                ) {
                    e.stopImmediatePropagation();

                    const $activeOption = $('.option[data-state="active"]', this.$filterSelectButton);
                    if ($activeOption.length) {
                        $activeOption.trigger('click');
                        return false;
                    }
                    const $firstOption = $('.option:first', this.$filterSelectButton);
                    if ($firstOption.length) {
                        $firstOption.trigger('click');
                    }
                    return false;
                }
            });

            bindDropdownEvents(this.$filterSelectButton);

            // Hidden input focused once the dropdown is opened
            $('.hidden-input', this.$filterSelectButton).rebind('focus.rewind', () => {
                const $dropdown = $('.mega-input-dropdown', this.$filterSelectButton);
                const buttonDimensions = this.getDimensions(this.$filterSelectButton);
                $dropdown.css({
                    'margin-left': buttonDimensions.width / 4,
                    'margin-top': buttonDimensions.height,
                });
                this.$filterSelectButton.addClass('focused');
            });

            // If dropdown has changed then we remove the margin
            // So that it wont be calculated against $(selector).position
            this.$filterSelectOptionButton.rebind('change.rewind', () => {
                $('.mega-input-dropdown', this.$filterSelectButton).css({
                    'margin-left': 0,
                    'margin-top': 0,
                });
                this.$filterSelectButton.removeClass('focused');
            });

            this.$filterSelectOptionButton.rebind('click.rewind', (event) => {
                $('.radio', this.$filterSelectOptionButton).removeClass('radioOn').addClass('radioOff');

                const $target = $(event.currentTarget);
                const $itemIcon = $(`.item-icon`, $target);
                const $itemLabel = $(`.option-label`, $target);
                const $filterLabel = $(`> span`, this.$filterSelectButton);
                const optionValue = $target.data('value');

                $('.radio', $target).addClass('radioOn').removeClass('radioOff');
                $filterLabel.empty();

                if ($itemIcon.length) {
                    $filterLabel.safeAppend($itemIcon.clone().prop('outerHTML'));
                }

                $filterLabel.safeAppend($itemLabel.clone().prop('outerHTML'));

                this.filterSelectUpdateView(optionValue);
            });

            this.$contentFolder.on('click.rewind', '.select-checkbox', this.onClickListCheckbox.bind(this));
            this.$contentFolder.on('click.rewind', '.folder-option', this.showContextMenu.bind(this));
            this.$contentFolder.on('click.rewind', '.toggle-section', this.onClickListToggleSection.bind(this));
            this.$downloadButton.rebind('click.rewind', this.onClickDownload.bind(this));
            this.$restoreButton.rebind('click.rewind', this.onClickRestore.bind(this));

            this.$infoButton.rebind('click.rewind', () => {
                const selectedNodeRawHandle = $.selected[0];
                const currentHandle = this.selectionMap[selectedNodeRawHandle];
                if (!currentHandle) {
                    logger.error('Current handle not mapped, aborting..');
                    return;
                }

                mega.rewind.injectNodes(currentHandle, selectedNodeRawHandle, async() => {
                    const promise = new Promise((resolve) => {
                        let hasResolved = false;
                        const eventResolveListener = () => {
                            if (!hasResolved) {
                                resolve();
                                hasResolved = true;
                                if (currentHandle) {
                                    delete this.selectionMap[selectedNodeRawHandle];
                                }
                            }
                        };

                        mBroadcaster.once('properties:finish', eventResolveListener);
                        later(() => {
                            if (!hasResolved) {
                                mBroadcaster.removeListener('properties:finish', eventResolveListener);
                                resolve();
                                hasResolved = true;
                            }
                        });
                    });
                    await propertiesDialog();
                    const infoBlock = document.querySelector('.properties-breadcrumb .fm-breadcrumbs-wrapper');
                    if (infoBlock) {
                        infoBlock.classList.add('rewind');
                    }
                    return promise;
                }, this.currentHandle, this.selectedType, this.selectedDateString);
            });

            this.$openFolderButton.rebind('click.rewind', () => {
                const selectedHandle = $.selected && $.selected[0] || '';
                const currentHandle = this.selectionMap[selectedHandle];
                if (!currentHandle) {
                    logger.error('Open Folder: Current handle not mapped, aborting..', selectedHandle);
                    return;
                }

                mega.rewind.openSidebar(null, currentHandle, true)
                    .then(() => {
                        const eventData = mega.rewind.getOpenSidebarEventData(selectedHandle, 0, 1);
                        if (eventData) {
                            eventlog(500001, eventData);
                        }
                    })
                    .catch(tell);
            });

            $(DATEPICKER_SELECTOR, document).rebind('click.rewind', '.rewind-datepicker-upgrade', () => {
                this.getDatepickerInstance().hide();

                const eventData = this.getUpgradeEventData(LOCATION_CALENDAR);
                if (eventData) {
                    delay('rewind:upgrade-click', eventlog.bind(null, 500002, eventData));
                    mega.rewind.saveLastUpgradeClick();
                }

                loadSubPage('pro');
                return false;
            });

            $(this.sidebar).rebind('contextmenu.rewind', () => {
                return false;
            });

            const progressKey = 'rewind:progress';

            mBroadcaster.removeListener(progressKey);
            mBroadcaster.addListener(progressKey, this.progressListener.bind(this));
        }

        updateFilterLabel(date, totalFiles, isDefault) {
            const key = mega.rewind.getDayMonthYear(date);
            let record = mega.rewind.changeLog.dates[key];

            if (!record || isDefault) {
                record = {
                    added: 0,
                    modified: 0,
                    removed: 0
                };
            }

            const $allLabel = $(`[data-value="all"] .option-label`, this.$filterSelectButton);
            const $addedLabel = $(`[data-value="added"] .option-label`, this.$filterSelectButton);
            const $modifiedLabel = $(`[data-value="modified"] .option-label`, this.$filterSelectButton);
            const $removedLabel = $(`[data-value="removed"] .option-label`, this.$filterSelectButton);

            const allLabelCount = isDefault ? `${l.rewind_label_all_default}`
                : mega.icu.format(l.rewind_label_all, totalFiles).replace('%1', this.formatNumber(totalFiles));

            $allLabel.text(`${allLabelCount}`);
            $addedLabel.text(mega.icu.format(l.rewind_label_added, record.added)
                .replace('%1', this.formatNumber(record.added))
            );
            $modifiedLabel.text(mega.icu.format(l.rewind_label_modified, record.modified)
                .replace('%1', this.formatNumber(record.modified))
            );
            $removedLabel.text(mega.icu.format(l.rewind_label_removed, record.removed)
                .replace('%1', this.formatNumber(record.removed))
            );

            $('.option .radio', this.$filterSelectButton).removeClass('radioOn').addClass('radioOff');
            $('.option', this.$filterSelectButton).removeClass('active').removeAttr('data-state');

            const $itemIcon = $(`[data-value="all"] .item-icon`, this.$filterSelectButton);
            const $itemLabel = $(`[data-value="all"] .option-label`,this.$filterSelectButton);
            const $filterLabel = $(`> span`, this.$filterSelectButton);
            $filterLabel.empty();

            if ($itemIcon.length) {
                $filterLabel.safeAppend($itemIcon.clone().prop('outerHTML'));
            }

            $filterLabel.safeAppend($itemLabel.clone().prop('outerHTML'));
            $('[data-value="all"] .radio', this.$filterSelectButton).addClass('radioOn').removeClass('radioOff');
            $('[data-value="all"]', this.$filterSelectButton).addClass('active').attr('data-state', 'active');

            if (isDefault) {
                this.$filterSelectButton.addClass('disabled');
            }
            else {
                this.$filterSelectButton.removeClass('disabled');
            }
        }

        resizeMegaList() {
            onIdle(() => {
                if (!this.parentContainer) {
                    return;
                }

                if (M.megaRender && M.megaRender.megaList) {
                    M.megaRender.megaList.resized();
                }
            });
        }

        async displayList(datepickerDate, isOpenFolder) {
            if (this.isListLoading) {
                return;
            }

            this.isListLoading = true;
            const date = new Date(datepickerDate);
            $('.content-item', this.$sidebarContent).addClass('hidden');
            this.$contentLoading.removeClass('hidden');
            this.progressListener(0); // Set loading to 0
            this.$contentEmpty.addClass('hidden');
            this.$contentTreeCacheEmpty.addClass('hidden');
            this.$contentUpgrade.addClass('hidden');
            this.$contentFolder.addClass('hidden');
            this.$contentFolderOptions.addClass('hidden');
            this.$contentDownload.addClass('hidden');
            this.selectedNodes = Object.create(null);
            this.selectedNodesPartial = Object.create(null);
            this.selectedAll = false;
            this.selectedDate = date;
            this.selectedInputValue = this.$datepicker.val();

            mega.rewind.resetTree();

            // Reset select all checkbox
            this.selectCheckbox(LIST_SELECT_ALL, false);

            // Just make sure the date is set already to the right utc date
            // without converting it
            const utcDate = new Date(date);
            utcDate.setUTCDate(date.getDate());
            utcDate.setUTCFullYear(date.getFullYear());
            utcDate.setUTCHours(date.getHours());

            //
            if (utcDate > mega.rewind.currentUtcDate) {
                utcDate.setUTCDate(mega.rewind.currentUtcDate.getUTCDate());
                utcDate.setUTCFullYear(mega.rewind.currentUtcDate.getUTCFullYear());
            }

            this.selectedDateString = utcDate.toISOString().split('T')[0];

            this.$contentEmpty.addClass('hidden');
            this.$contentTreeCacheEmpty.addClass('hidden');
            this.$contentUpgrade.addClass('hidden');
            this.$contentLoading.addClass('hidden');

            // Cleanup folder list
            if (this.folderList) {
                this.folderList.destroy();
                this.folderList = null;
            }

            if (date) {
                this.updateFilterLabel(date, 0, true);
            }

            if (!isOpenFolder) {
                this.$contentLoading.removeClass('hidden');
                const hasRecords = await mega.rewind.getRecords(date.getTime());
                this.$contentLoading.addClass('hidden');
                if (!hasRecords || hasRecords < 0) {
                    this.$contentTreeCacheEmpty.removeClass('hidden');
                    this.$contentFolder.addClass('hidden');
                    this.isListLoading = false;
                    return;
                }
            }

            const currentCacheNode = mega.rewind.nodeDictionary[this.currentNode.h];
            if (!currentCacheNode) {
                // No node available on the dictionary. No value found
                this.$contentTreeCacheEmpty.removeClass('hidden');
                this.$contentFolder.addClass('hidden');
                this.isListLoading = false;
                return;
            }

            const sizeTreeNode = mega.rewind.getSizeTreeNode(currentCacheNode.h);
            const totalFiles = sizeTreeNode.tf || 0;
            const totalDirectories = sizeTreeNode.td || 0;

            if (totalFiles === 0 && totalDirectories === 0) {
                this.$contentEmpty.removeClass('hidden');
                this.$contentFolder.addClass('hidden');
            }
            else {
                this.prepareListView();
                if (this.isEmptyList()) {
                    this.$contentFolder.addClass('hidden');
                    this.$contentEmpty.removeClass('hidden');
                }
                else {
                    this.$contentFolder.removeClass('hidden');
                }
            }

            if (date) {
                this.updateFilterLabel(date, totalFiles);
            }

            this.isListLoading = false;
        }

        isEmptyList() {
            if (!this.viewNodes || !this.viewNodes.length) {
                return true;
            }

            return !!(this.viewNodes.length === 1 && this.viewNodes[0] === this.currentHandle);
        }

        filterSelectUpdateView(optionValue) {
            let type = TYPE_NONE;

            switch (optionValue) {
                case STR_TYPE_ADDED:
                    type = TYPE_ADDED;
                    break;
                case STR_TYPE_MODIFIED:
                    type = TYPE_MODIFIED;
                    break;
                case STR_TYPE_REMOVED:
                    type = TYPE_REMOVED;
                    break;
            }

            this.$contentEmpty.addClass('hidden');
            this.$contentTreeCacheEmpty.addClass('hidden');
            this.$contentUpgrade.addClass('hidden');
            this.$contentLoading.addClass('hidden');
            this.$contentFolder.removeClass('hidden');

            this.selectedType = type;
            this.prepareListView(type);
            if (this.isEmptyList()) {
                this.$contentFolder.addClass('hidden');
                this.$contentEmpty.removeClass('hidden');
            }
        }

        async getFilterNodes(type, selectedHandle) {
            const dayData = mega.rewind.dateData &&
                mega.rewind.dateData[this.selectedDateString] || Object.create(null);

            if (!dayData) {
                dayData.modified = Object.create(null);
                dayData.added = Object.create(null);
                dayData.removed = Object.create(null);
            }

            let childrenNodes = Object.create(null);
            switch (type) {
                case TYPE_ADDED:
                    childrenNodes = dayData.added;
                    break;
                case TYPE_MODIFIED:
                    childrenNodes = dayData.modified;
                    break;
                case TYPE_REMOVED:
                    childrenNodes = dayData.removed;
                    break;
            }
            this.viewNodes = [];

            this.prepareFilterChildrenNodes(childrenNodes, selectedHandle);
        }

        prepareFilterChildrenNodes(childrenNodes, selectedHandle) {
            if (!childrenNodes) {
                return;
            }

            const childrenNodeKeys = Object.keys(childrenNodes);
            if (childrenNodeKeys && childrenNodeKeys.length) {
                const currentNodes = [];
                const nodeDictionary = mega.rewind.nodeDictionary;
                for (const property in childrenNodes) {
                    let node = childrenNodes[property];

                    if (!this.isSameOrAncestor(nodeDictionary, property, selectedHandle)) {
                        continue;
                    }

                    if (!node || node && !Object.keys(node).length) {
                        node = nodeDictionary[property];
                    }

                    if (node && Object.keys(node).length) {
                        currentNodes.push(property);
                    }
                }

                if (currentNodes.length) {
                    this.viewNodes = mega.rewind.sortByFolderAndName(currentNodes);
                }
            }
        }

        prepareListView(type) {
            this.$contentFolderOptions.addClass('hidden');

            if (type) {
                this.getFilterNodes(type, this.currentHandle);
                this.$contentFolderOptions.removeClass('hidden');
            }
            else {
                this.viewNodes = mega.rewind.getChildNodes(this.currentHandle);
            }

            if (this.folderList) {
                this.folderList.destroy();
                this.folderList = null;
            }

            if (this.isEmptyList()) {
                return false;
            }

            if (this.hasSelectedNodes()) {
                this.selectedNodes = Object.create(null);
                this.selectedNodesPartial = Object.create(null);
                this.$contentDownload.addClass('hidden');
            }

            this.folderList = new MegaDynamicList(this.$contentFolderList, {
                itemRenderFunction: (handle, index) => {
                    if (type) {
                        return this.renderFolderFilterTemplate(handle, type);
                    }

                    const node = mega.rewind.nodeDictionary[handle];
                    // This is to keep track the position of the node
                    // in the list.
                    node.offset = index;

                    if (node.t) {
                        return this.renderFolderTemplate(node);
                    }

                    return this.renderFileTemplate(node);
                },
                itemHeightCallback: (handle) => {
                    const type =
                        mega.rewind.dateData &&
                        mega.rewind.dateData[this.selectedDateString] &&
                        mega.rewind.dateData[this.selectedDateString].type[handle] || TYPE_NONE;

                    if (type !== TYPE_NONE) {
                        return 53;
                    }

                    return 32;
                },
                perfectScrollOptions: {
                    handlers: ['click-rail', 'drag-thumb', 'wheel', 'touch'],
                    minScrollbarLength: 50
                }
            });

            if (this.folderList) {
                onIdle(() => {
                    this.folderList.batchAdd(this.viewNodes);
                    this.folderList.initialRender();
                });
            }
        }

        onClickListCheckbox(e) {
            const $checkboxElement = $(e.target);
            const $folderItem = $checkboxElement.closest('.folder-item');
            const handle = $folderItem.data('id');

            e.stopImmediatePropagation();

            if (this.selectedType) {
                this.selectCheckbox(handle);

                if (handle === LIST_SELECT_ALL) {
                    this.selectAllCheckbox();
                    return false;
                }

                if (this.selectedAll && this.hasSelectedNodes() !== Object.keys(this.viewNodes)) {
                    this.selectCheckbox(LIST_SELECT_ALL, false);
                }

                return false;
            }

            this.selectTreeCheckbox(handle);
        }

        onClickListToggleSection(e) {
            const $checkboxElement = $(e.target);
            const $folderItem = $checkboxElement.closest('.folder-item');
            const handle = $folderItem.data('id');
            const node = mega.rewind.nodeDictionary[handle];

            e.stopImmediatePropagation();

            if (!node) {
                return false;
            }

            if ($folderItem.is('.active')) {
                this.closeTree(node);
            }
            else {
                this.openTree(node);
            }

            return false;
        }

        selectAllCheckbox() {
            // Clear selected nodes
            this.selectedNodes = Object.create(null);
            this.selectedNodesPartial = Object.create(null);

            for (let i = 0; i < this.viewNodes.length; i++) {
                const handle = this.viewNodes[i];
                this.selectCheckbox(handle, this.selectedAll);
            }
        }

        selectCheckbox(handle, status) {
            let isSelected = status;
            let isSelectAll = false;

            if (handle === LIST_SELECT_ALL) {
                isSelectAll = true;
            }

            // Toggle mode
            if (typeof isSelected === 'undefined') {
                if (isSelectAll) {
                    this.selectedAll = this.selectedAll ? false : TREE_SELECT;
                    isSelected = this.selectedAll;
                }
                else if (this.selectedNodes[handle]) {
                    delete this.selectedNodes[handle];
                }
                else {
                    isSelected = TREE_SELECT;
                    this.selectedNodes[handle] = TREE_SELECT;
                }
            }
            else if (isSelectAll) {
                this.selectedAll = isSelected;
            }
            else if (isSelected) {
                this.selectedNodes[handle] = TREE_SELECT;
            }
            else if (this.selectedNodes[handle]) {
                delete this.selectedNodes[handle];
            }

            this.adjustCheckbox(handle, isSelected, status);
        }

        adjustCheckbox(handle, isSelected, toggleDownload = true) {
            const $folderItem = $(`.folder-item[data-id="${handle}"]`, this.$contentFolder);
            const $checkboxParent = $('.select-checkbox', $folderItem);
            const $checkboxElement = $('input', $checkboxParent);

            $checkboxParent.removeClass('checkboxOff checkboxOn checkboxMinimize');
            $checkboxParent.addClass(isSelected === TREE_SELECT ? 'checkboxOn' : 'checkboxOff');
            if (isSelected === TREE_SELECT_PARTIAL) {
                $checkboxParent.addClass('checkboxMinimize');
            }
            $checkboxElement.prop('checked', isSelected);

            if (toggleDownload) {
                this.toggleDownloadPanel();
            }
        }

        toggleDownloadPanel() {
            if (this.hasSelectedNodes()) {
                this.$contentDownload.removeClass('hidden');

                const formattedInfo = `${l.rewind_folder_download_caption
                    .replace('%1', this.formatDownloadCaptionDate(this.selectedDate))}`;

                this.$contentDownloadCaption.text(formattedInfo);
            }
            else {
                this.$contentDownload.addClass('hidden');
            }

            onIdle(() => {
                if (this.folderList) {
                    this.folderList.resized();
                }
            });
        }

        selectTreeCheckbox(handle, status) {
            let isSelected = status;
            const node = mega.rewind.nodeDictionary[handle];
            const oldStatus = this.selectedNodes[handle];

            // Toggle mode
            if (typeof isSelected === 'undefined') {
                if (oldStatus) {
                    delete this.selectedNodes[handle];
                }
                else {
                    isSelected = TREE_SELECT;
                    this.selectedNodes[handle] = TREE_SELECT;
                }
            }
            else if (isSelected) {
                this.selectedNodes[handle] = TREE_SELECT;
            }
            else if (this.selectedNodes[handle]) {
                delete this.selectedNodes[handle];
            }

            if ((oldStatus === TREE_SELECT_PARTIAL && !isSelected
                && this.selectedNodesPartial[handle])) {
                delete this.selectedNodesPartial[handle];
            }

            if (node.t && mega.rewind.isTreeOpen(node.h)) {
                this.loopFolderList(node, (currentHandle) => {
                    if (isSelected) {
                        this.selectedNodes[currentHandle] = TREE_SELECT;
                    }
                    else if (this.selectedNodes[currentHandle]) {
                        delete this.selectedNodes[currentHandle];
                    }

                    this.adjustCheckbox(currentHandle, isSelected, false);
                });
            }

            // Check ancestors
            this.adjustAncestorsCheckbox(node);
            this.adjustCheckbox(handle, isSelected);
        }

        adjustAncestorsCheckbox(node) {
            let n = node;
            let currentHandleFound = false;
            while (!currentHandleFound && (n = mega.rewind.nodeDictionary[n.p])) {
                if (n.p === false) {
                    break;
                }

                if (n.h === this.currentHandle) {
                    currentHandleFound = true;
                }

                let totalSelected = 0;
                let totalPartialSelected = 0;
                const children = Object.keys(mega.rewind.nodeChildrenDictionary[n.h]);
                const totalChildren = children.length;
                for (let i = 0; i < children.length; i++) {
                    if (this.selectedNodes[children[i]] === TREE_SELECT) {
                        totalSelected++;
                    }
                    if (this.selectedNodes[children[i]] === TREE_SELECT_PARTIAL) {
                        totalPartialSelected++;
                    }
                }

                if (totalSelected === totalChildren) {
                    this.selectedNodes[n.h] = TREE_SELECT;
                }
                else if (totalPartialSelected > 0 || totalSelected > 0) {
                    this.selectedNodes[n.h] = TREE_SELECT_PARTIAL;
                }
                else if (this.selectedNodes[n.h]) {
                    delete this.selectedNodes[n.h];
                }

                this.adjustCheckbox(n.h, this.selectedNodes[n.h], false);
            }
        }

        loopFolderList(node, itemCallback) {
            const selectedHandle = node.h;
            const nodeDictionary = mega.rewind.nodeDictionary;

            if (this.folderList && node.t) {
                const { handleEnd, handleEndFolder, offset } = node;
                let nodeOffset = offset;
                let index = nodeOffset + 1;
                let currentNodeHandle = selectedHandle;

                if (handleEnd) {
                    const currentNodeFromList = this.folderList.items[nodeOffset];
                    if (currentNodeFromList !== selectedHandle) {
                        nodeOffset =  this.folderList.items.indexOf(selectedHandle);
                    }

                    index = nodeOffset + 1;

                    while (currentNodeHandle !== handleEnd) {
                        if (!currentNodeHandle) {
                            logger.error('Invalid tree state', handleEnd, currentNodeHandle, index, node.offset);
                            break;
                        }

                        currentNodeHandle = this.folderList.items[index];
                        const currentNode = nodeDictionary[currentNodeHandle];

                        if (!currentNode) {
                            // Node does not exist
                            break;
                        }


                        if (itemCallback) {
                            itemCallback(currentNodeHandle);
                        }

                        if (currentNodeHandle === handleEnd && handleEndFolder) {
                            const nextNode = nodeDictionary[handleEnd];
                            this.loopFolderList(nextNode, itemCallback);
                        }
                        else {
                            index++;
                        }
                    }
                }
            }
        }

        hasSelectedNodes() {
            return this.selectedNodes && Object.keys(this.selectedNodes).length ||
                this.selectedNodesPartial && Object.keys(this.selectedNodesPartial).length;
        }

        showDownloadUpgradeDialog() {
            if (!this.$downloadUpgradeDialog) {
                this.$downloadUpgradeDialog = $('.mega-dialog.rewind-download-upgrade');
                this.addDownloadUpgradeHandlers();
            }

            M.safeShowDialog('rewind-download-upgrade-dialog', () => {
                return this.$downloadUpgradeDialog;
            });
        }

        addDownloadUpgradeHandlers() {
            $('.js-close', this.$downloadUpgradeDialog).rebind('click.rewind', () => {
                closeDialog();
                return false;
            });

            $('.btn-download-upgrade', this.$downloadUpgradeDialog).rebind('click.rewind', () => {
                const eventData = this.getUpgradeEventData(LOCATION_DOWNLOAD_DIALOG, TRIGGER_UPG_DOWNLOAD_FREE);
                if (eventData) {
                    delay('rewind:upgrade-click', eventlog.bind(null, 500002, eventData));
                    mega.rewind.saveLastUpgradeClick();
                }

                loadSubPage('pro');
                return false;
            });
        }

        removeDownloadUpgradeHandlers() {
            $('.js-close', this.$downloadUpgradeDialog).off('click.rewind');
            $('.btn-download-upgrade', this.$downloadUpgradeDialog).rebind('click.rewind');
            this.$downloadUpgradeDialog = null;
        }

        // eslint-disable-next-line complexity
        onClickDownload() {
            console.time('rewind:index:download');
            if (mega.rewind.accountType === mega.rewind.ACCOUNT_TYPE_FREE) {
                this.showDownloadUpgradeDialog();
                return;
            }

            const selectedNodes = {...this.selectedNodes};
            const selectedNodesPartial = {...this.selectedNodesPartial};

            const selectedPartialKeys = Object.keys(selectedNodesPartial);
            if (selectedPartialKeys.length) {
                // We restore keys to a nodes container for download without
                // touching the main selected nodes dictionary
                for (let i = 0; i < selectedPartialKeys.length; i++) {
                    const partialKey = selectedPartialKeys[i];
                    this.restorePartialKeys(partialKey, selectedNodes, selectedNodesPartial);
                }
            }

            const selectedKeys = Object.keys(selectedNodes);
            const nodeDictionary = mega.rewind.getNodeDictionary(this.selectedType, this.selectedDateString);
            const selectedHandles = Object.create(null);

            const filterNodeState = (selectedKeys, selectedNodes) => {
                for (let i = 0; i < selectedKeys.length; i++) {
                    const currentKey = selectedKeys[i];
                    const currentNode = nodeDictionary[currentKey];
                    const currentState = selectedNodes[currentKey];
                    let currentParentState = 0;

                    if (currentNode) {
                        currentParentState = selectedNodes[currentNode.p];
                    }

                    if (currentState === TREE_SELECT) {
                        selectedHandles[currentKey] = 1;
                    }

                    if (currentParentState === TREE_SELECT && selectedHandles[currentKey]) {
                        delete selectedHandles[currentKey];
                    }
                }
            };

            if (selectedKeys.length) {
                filterNodeState(selectedKeys, selectedNodes);
            }

            const selectedHandleKeys = Object.keys(selectedHandles);
            if (selectedHandleKeys.length) {
                const selectedNodes = Object.create(null);
                const addChildren = (selectedHandle) => {
                    const childrenDictionary = mega.rewind.nodeChildrenDictionary;
                    if (!childrenDictionary[selectedHandle]) {
                        return;
                    }

                    const childrenKeys = Object.keys(childrenDictionary[selectedHandle]);
                    // TODO: Refine later
                    for (let j = 0; j < childrenKeys.length; j++) {
                        const childHandle = childrenKeys[j];
                        const childNodeType = childrenDictionary[selectedHandle][childHandle];
                        let childNode = null;
                        if (childNodeType === NODE_CHILDREN_TYPE_FILE && (childNode = nodeDictionary[childHandle])) {
                            childNode.rewind = true;
                            childNode.path = this.getFullPathName(childNode.h, nodeDictionary, this.currentHandle);
                            selectedNodes[childNode.h] = childNode;
                        }
                        else {
                            addChildren(childHandle);
                        }
                    }
                };

                for (let i = 0; i < selectedHandleKeys.length; i++) {
                    const selectedHandle = selectedHandleKeys[i];
                    const selectedNode = nodeDictionary[selectedHandle];

                    if (selectedNode.t) {
                        addChildren(selectedHandle);
                    }
                    else {
                        selectedNode.rewind = true;
                        // This is traversing everything again
                        selectedNode.path = this.getFullPathName(selectedNode.h, nodeDictionary, this.currentHandle);
                        selectedNodes[selectedNode.h] = selectedNode;
                    }
                }

                if (selectedNodes) {
                    const selectedNodeValues = Object.values(selectedNodes);
                    if (selectedNodeValues.length) {
                        let zipName = null;
                        let zip = false;

                        if (selectedNodeValues.length === 1) {
                            const firstSelectedKey = selectedHandleKeys[0];
                            const firstSelectedNode = nodeDictionary[firstSelectedKey];

                            if (firstSelectedNode && !firstSelectedNode.t) {
                                zipName = selectedNodeValues[0].name;
                                zip = false;
                            }
                        }

                        if (!zipName) {
                            const firstSelectedKey = selectedHandleKeys[0];
                            const firstSelectedNode = nodeDictionary[firstSelectedKey];

                            if (firstSelectedKey === this.currentHandle) {
                                zipName = firstSelectedNode.name;
                                zip = true;
                            }
                            else if (firstSelectedNode) {
                                const parentNode = nodeDictionary[firstSelectedNode.p];
                                // eslint-disable-next-line max-depth
                                if (parentNode && parentNode.name) {
                                    zipName = parentNode.name;
                                    zip = true;
                                }
                            }
                        }

                        if (!zipName) {
                            const zipHash = Math.random().toString(16).slice(-4);
                            zipName = `Archive-${zipHash}`;
                            zip = true;
                        }

                        M.addDownload(selectedNodeValues, zip, undefined, M.getSafeName(zipName));

                        const eventData = [0, u_attr.p | 0, selectedNodeValues.length];
                        delay('rewind:log-download', eventlog.bind(null, 500006, eventData));
                    }
                }
            }
            console.timeEnd('rewind:index:download');
            return false;
        }

        // FIXME: This is for testing at the moment
        onClickRestore() {
            const selectedNodes = {...this.selectedNodes};
            const selectedKeys = Object.keys(selectedNodes);

            if (!selectedKeys.length) {
                return;
            }

            this.$restoreButton.addClass('disabled');
            mega.rewindUtils.restoreNode(selectedKeys).then(() => {
                this.$restoreButton.removeClass('disabled');
                logger.info('Successfully restored file', selectedKeys);
            });

            return false;
        }

        renderFolderFilterTemplate(handle, type) {
            const nodeDictionary = mega.rewind.getNodeDictionary(type, this.selectedDateString);

            const node = nodeDictionary[handle];
            if (!node) {
                logger.error('Node does not exist in dictionary', type, node, handle);
            }
            const template = this.getTemplate(false, true);
            const nameElement = template.querySelector('.folder-main label');
            const iconElement = template.querySelector('.folder-main .folder-icon .transfer-filetype-icon');
            const detailsElement = template.querySelector('.folder-details');
            const locationElement = detailsElement.querySelector('.folder-location');
            const locationSpanElement = locationElement.querySelector('span');
            const tsElement = detailsElement.querySelector('.folder-timestamp');
            const tsIconElement = tsElement.querySelector('i');
            const tsLabelElement = tsElement.querySelector('span');
            const checkboxElement = template.querySelector('.folder-main .select-checkbox');
            const checkboxInputElement = checkboxElement.querySelector('input');

            if (type !== TYPE_NONE) {
                detailsElement.classList.remove('hidden');
                tsIconElement.classList.add.apply(tsIconElement.classList, this.getTypeIconClass(type));
                tsLabelElement.textContent = this.getTypeTimestamp(type, node.ts); // TODO: Change to translation
                const parentNode = mega.rewind.nodeDictionary[node.p];
                locationSpanElement.textContent = this.getNodeNameInfo(parentNode)[0];

                // TODO: Breadcrumb string
                locationElement.classList.add('simpletip');
                locationElement.dataset.simpletip = this.makeFolderLocationTooltip(node.h);
                locationElement.dataset.simpletipClass = "rewind-list-tooltip theme-dark-forced";
            }

            nameElement.textContent = this.getNodeNameInfo(node)[0];
            iconElement.classList.add(fileIcon(node));
            template.dataset.id = node.h;

            if (this.selectedNodes[node.h]) {
                checkboxElement.classList.remove('checkboxOff');
                checkboxElement.classList.add('checkboxOn');
                checkboxInputElement.checked = true;
            }

            return template;
        }

        getNodeNameInfo(selectedNode) {
            let name = null;
            let isRoot = true; // If its a root folder

            if (!selectedNode) { // Unknown
                return [l[7381], false];
            }

            switch (selectedNode.h) {
                case M.RootID:
                    name = l[164];
                    break;
                case M.RubbishID:
                    name = l[167];
                    break;
                case M.InboxID:
                    name = l[166];
                    break;
                default:
                    isRoot = false;
                    name = selectedNode.name;
            }

            return [name, isRoot];
        }
        makeFolderLocationTooltip(selectedHandle) {
            const nodeDictionary = mega.rewind.nodeDictionary;
            const items = this.getPath(selectedHandle, nodeDictionary);
            let tooltip = "";

            for (let i = items.length - 1; i >= 0; i--) {
                const name = items[i];
                tooltip += `${name}`;

                if (i !== 0) {
                    tooltip += `[I class="sprite-fm-mono icon-arrow-right"][/I]`;
                }
            }

            return tooltip;
        }

        getPath(selectedHandle, nodeDictionary, onlyHandle) {
            let node = nodeDictionary[selectedHandle];
            let endLoop = false;
            let name = null;
            const items = [];

            while (node && !endLoop) {
                if (node.p === false) {
                    break;
                }
                const parentNode = nodeDictionary[node.p];

                if (!parentNode) {
                    if (d) {
                        logger.error('Breadcrumb: parent node not found', node.h, node.p);
                    }
                    endLoop = true;
                    continue;
                }

                if (!parentNode.t) {
                    node = parentNode;
                    continue;
                }

                const nodeInfo = this.getNodeNameInfo(parentNode);
                name = nodeInfo[0];
                endLoop = nodeInfo[1];

                if (onlyHandle) {
                    items.push(parentNode.h);
                }
                else {
                    items.push(name);
                }

                if (endLoop) {
                    continue;
                }

                node = parentNode;
            }

            return items;
        }

        getPathHandle(selectedHandle, nodeDictionary) {
            return this.getPath(selectedHandle, nodeDictionary, true);
        }

        getFullPathName(selectedHandle, nodeDictionary, parentHandle) {
            const path = this.getPathHandle(selectedHandle, nodeDictionary);
            let fullPathName = '';

            for (var k = 0; k < path.length; k++) {
                if (path[k] === parentHandle) {
                    break;
                }

                if (nodeDictionary[path[k]] && nodeDictionary[path[k]].t) {
                    fullPathName = M.getSafeName(nodeDictionary[path[k]].name) + '/' + fullPathName;
                }
            }

            return fullPathName;
        }

        renderFolderTemplate(node) {
            const template = this.getTemplate(true);
            const pusherElement = template.querySelector('.folder-pusher');
            const nameElement = template.querySelector('.folder-main label');
            const iconElement = template.querySelector('.folder-main .folder-icon .transfer-filetype-icon');
            const checkboxElement = template.querySelector('.folder-main .select-checkbox');
            const checkboxInputElement = checkboxElement.querySelector('input');

            nameElement.textContent = this.getNodeNameInfo(node)[0];
            iconElement.classList.add(fileIcon(node));
            template.dataset.id = node.h;

            const selectStatus = this.selectedNodes[node.h];
            if (selectStatus === TREE_SELECT) {
                checkboxElement.classList.remove('checkboxOff');
                checkboxElement.classList.remove('checkboxMinimize');
                checkboxElement.classList.add('checkboxOn');
                checkboxInputElement.checked = true;
            }
            else if (selectStatus === TREE_SELECT_PARTIAL) {
                checkboxElement.classList.remove('checkboxOn');
                checkboxElement.classList.add('checkboxMinimize');
            }

            const nodeLevel = mega.rewind.nodeTreeDictionary[node.p];
            if (nodeLevel) {
                const newMarginStart = `${nodeLevel * 20}px`;
                pusherElement.style.width = newMarginStart;
            }

            if (mega.rewind.isTreeOpen(node.h)) {
                template.classList.add('active');
            }

            return template;
        }

        openTree(node) {
            if (this.folderList) {
                const selectedHandle = node.h;
                const parentHandle = node.p;
                let parentNodeLevel = mega.rewind.nodeTreeDictionary[parentHandle];
                if (!parentNodeLevel) {
                    parentNodeLevel = 0;
                }
                // Since we already have the parent, exclude it from list to insert
                const nodes = mega.rewind.getChildNodes(selectedHandle, parentNodeLevel + 1, false);
                // Restore partially selected items to selected nodes map
                this.restorePartialKeys(selectedHandle);

                for (let i = 0; i < nodes.length; i++) {
                    const currentHandle = nodes[i];
                    const currentNode = mega.rewind.nodeDictionary[currentHandle];
                    if (this.selectedNodes[currentNode.p] === TREE_SELECT) {
                        this.selectedNodes[currentHandle] = TREE_SELECT;
                        this.adjustCheckbox(currentHandle, TREE_SELECT, false);
                    }
                }

                this.folderList.insert(node.h, nodes);
                const $folderItem = $(`.folder-item[data-id="${selectedHandle}"]`, this.$contentFolder);
                $folderItem.addClass('active');
                mega.rewind.openTree(selectedHandle);
            }
        }

        restorePartialKeys(selectedHandle, selectedNodes, selectedNodesPartial) {
            if (!selectedNodes) {
                selectedNodes = this.selectedNodes;
            }
            if (!selectedNodesPartial) {
                selectedNodesPartial = this.selectedNodesPartial;
            }

            if (selectedNodesPartial[selectedHandle]) {
                const partialKeys = Object.keys(selectedNodesPartial[selectedHandle]);
                if (partialKeys.length) {
                    for (let i = 0; i < partialKeys.length; i++) {
                        const key = partialKeys[i];
                        selectedNodes[key] = selectedNodesPartial[selectedHandle][key];
                        if (selectedNodesPartial[key]) {
                            this.restorePartialKeys(key, selectedNodes, selectedNodesPartial);
                        }
                    }
                }
                delete selectedNodesPartial[selectedHandle];
            }
        }

        closeTree(node) {
            if (this.folderList) {
                const selectedHandle = node.h;

                const nodesToRemove = [];
                this.closeTreeChildren(selectedHandle, nodesToRemove, node);
                if (nodesToRemove.length) {
                    this.folderList.remove(nodesToRemove);
                }

                const $folderItem = $(`.folder-item[data-id="${selectedHandle}"]`, this.$contentFolder);
                $folderItem.removeClass('active');
                mega.rewind.closeTree(selectedHandle);
            }
        }

        closeTreeChildren(selectedHandle, nodesToRemove, selectedNode) {
            let currentNodeHandle = selectedHandle;
            const {offset, handleEnd, handleEndFolder} = selectedNode;
            let nodeOffset = offset;
            const nodeDictionary = mega.rewind.nodeDictionary;

            if (handleEnd) {
                const currentNodeFromList = this.folderList.items[nodeOffset];
                if (currentNodeFromList !== selectedHandle) {
                    nodeOffset =  this.folderList.items.indexOf(selectedHandle);
                }
                let index = nodeOffset + 1;

                while (currentNodeHandle !== handleEnd) {
                    currentNodeHandle = this.folderList.items[index];
                    const currentNode = nodeDictionary[currentNodeHandle];
                    if (!currentNode) {
                        // Node does not exist
                        break;
                    }

                    nodesToRemove.push(currentNodeHandle);

                    // This is for the folder currently selected and its children
                    if (this.selectedNodes[currentNodeHandle]) {
                        // Cache partially selected nodes and restore it to selected nodes once
                        // opened again
                        if (!this.selectedNodesPartial[selectedHandle]) {
                            this.selectedNodesPartial[selectedHandle] = Object.create(null);
                        }

                        this.selectedNodesPartial[selectedHandle][currentNodeHandle] =
                            this.selectedNodes[currentNodeHandle];
                        delete this.selectedNodes[currentNodeHandle];
                    }

                    if (currentNodeHandle === handleEnd && handleEndFolder) {
                        const nextNode = nodeDictionary[handleEnd];
                        this.closeTreeChildren(
                            nextNode.h, nodesToRemove, nextNode
                        );
                    }
                    else {
                        index++;
                    }
                }
            }
        }

        renderFileTemplate(node) {
            // Maybe cache template? once we set it?
            const template = this.getTemplate();
            const pusherElement = template.querySelector('.folder-pusher');
            const nameElement = template.querySelector('.folder-main label');
            const iconElement = template.querySelector('.folder-main .folder-icon .transfer-filetype-icon');
            const detailsElement = template.querySelector('.folder-details');
            const detailsPusherElement = detailsElement.querySelector('.folder-pusher');
            const tsElement = detailsElement.querySelector('.folder-timestamp');
            const tsIconElement = tsElement.querySelector('i');
            const tsLabelElement = tsElement.querySelector('span');
            const checkboxElement = template.querySelector('.folder-main .select-checkbox');
            const checkboxInputElement = checkboxElement.querySelector('input');

            const nodeDateData = mega.rewind.dateData &&
                mega.rewind.dateData[this.selectedDateString] &&
                mega.rewind.dateData[this.selectedDateString] || null;

            let type = TYPE_NONE;
            let typeNode = null;
            let currentTimestamp = node.ts || node.mtime;

            if (nodeDateData) {
                type = nodeDateData.type[node.h] || TYPE_NONE;

                switch (type) {
                    case TYPE_MODIFIED:
                        typeNode = nodeDateData.modified[node.h];
                        break;
                    case TYPE_REMOVED:
                        typeNode = nodeDateData.removed[node.h];
                        break;
                }
            }


            if (typeNode) {
                currentTimestamp = typeNode.ts || typeNode.mtime;
            }

            if (type !== TYPE_NONE) {
                detailsElement.classList.remove('hidden');
                tsIconElement.classList.add.apply(tsIconElement.classList, this.getTypeIconClass(type));
                tsLabelElement.textContent =
                    this.getTypeTimestamp(type, currentTimestamp);
            }

            nameElement.textContent = node.name;
            iconElement.classList.add(fileIcon(node));
            template.dataset.id = node.h;

            if (this.selectedNodes[node.h]) {
                checkboxElement.classList.remove('checkboxOff');
                checkboxElement.classList.add('checkboxOn');
                checkboxInputElement.checked = true;
            }

            const nodeLevel = mega.rewind.nodeTreeDictionary[node.lp || node.p];
            if (nodeLevel) {
                const newMarginStart = `${nodeLevel * 20}px`;
                pusherElement.style.width = newMarginStart;
                detailsPusherElement.style.width = newMarginStart;
            }

            return template;
        }

        getTypeTimestamp(type, timestamp) {
            let typeString = '';
            const stringTime = this.getTimeByTimestamp(timestamp);
            const timestampDate = new Date(timestamp * 1000);
            // If time is 1:00 AM
            const isSingular = timestampDate.getHours() === 1
                && timestampDate.getMinutes() === 0;
            switch (type) {
                case TYPE_ADDED:
                    typeString = mega.icu.format(l.rewind_label_added_at, isSingular ? 1 : 2);
                    break;
                case TYPE_MODIFIED:
                    typeString = mega.icu.format(l.rewind_label_modified_at, isSingular ? 1 : 2);
                    break;
                case TYPE_REMOVED:
                    typeString = mega.icu.format(l.rewind_label_removed_at, isSingular ? 1 : 2);
                    break;
            }

            return typeString.replace('%1', stringTime);
        }

        getTimeByTimestamp(timestamp) {
            return time2date(timestamp, 22);
        }

        getTypeIconClass(type) {
            switch (type) {
                case TYPE_ADDED:
                    return ['icon-add-filled', 'item-added'];
                case TYPE_MODIFIED:
                    return ['icon-changed', 'item-modified'];
                case TYPE_REMOVED:
                    return ['icon-removed', 'item-removed'];
            }
        }

        getTemplate(isFolder, isFilter) {
            if (isFilter) {
                if (!this.rewindFilterListFileTemplate) {
                    this.rewindFilterListFileTemplate =
                        document.querySelector('#rewind-filter-list-file');
                }
                return this.rewindFilterListFileTemplate.content.firstElementChild.cloneNode(true);
            }

            if (isFolder) {
                if (!this.rewindListFolderTemplate) {
                    this.rewindListFolderTemplate = document.querySelector('#rewind-list-folder');
                }
                return this.rewindListFolderTemplate.content.firstElementChild.cloneNode(true);
            }

            if (!this.rewindListFileTemplate) {
                this.rewindListFileTemplate = document.querySelector('#rewind-list-file');
            }

            return this.rewindListFileTemplate.content.firstElementChild.cloneNode(true);
        }

        /**
         * Show Context menu and required menu items
         * @param {Object} e Event data
         * @returns {void}
         */
        showContextMenu(e) {
            let menuItems = '.properties-item-rewind';
            const $target = $(e.target);
            const $folderItem = $target.closest('.folder-item');
            const handle = $folderItem.data('id');
            const node = mega.rewind.nodeDictionary[handle];

            e.calculatePosition = true;
            if (node && node.t === 1) {
                menuItems += ', .open-item-rewind';
            }

            if (d && !node) {
                logger.error('showContextMenu - No node information', handle);
            }

            const newHandle = mega.rewind.makeDummyHandle(node.h);
            this.selectionMap[newHandle] = node.h;

            mega.rewind.injectNodes(handle, newHandle, () => {
                selectionManager.clear_selection();
                selectionManager.add_to_selection(newHandle);

                // Show menu
                M.contextMenuUI(e, 8, menuItems);

            }, this.currentHandle, this.selectedType, this.selectedDateString);

            e.stopImmediatePropagation();
            return false;
        }

        getUpgradeEventData(location, trigger) {
            const accountType = u_attr.p || 0;

            if (typeof trigger !== 'undefined') {
                return JSON.stringify([0, accountType | 0, location | 0, trigger | 0]);
            }

            trigger = TRIGGER_UPG_UNKNOWN;

            if (location === LOCATION_LANDING) {
                switch (mega.rewind.accountType) {
                    case mega.rewind.ACCOUNT_TYPE_FREE:
                        trigger = TRIGGER_UPG_LANDING_FREE;
                        break;
                    case mega.rewind.ACCOUNT_TYPE_PRO_LITE:
                        trigger = TRIGGER_UPG_LANDING_PRO_LITE;
                        break;
                }
            }
            else if (location === LOCATION_CALENDAR) {
                const currentViewInstance = this.getDatepickerViewInstance();
                if (currentViewInstance) {
                    switch (currentViewInstance.type) {
                        case DATEPICKER_VIEW_TYPE_DAYS:
                            trigger = TRIGGER_UPG_CALENDAR_DAYS;
                            break;
                        case DATEPICKER_VIEW_TYPE_MONTHS:
                            trigger = TRIGGER_UPG_CALENDAR_MONTHS;
                            break;
                        case DATEPICKER_VIEW_TYPE_YEARS:
                            trigger = TRIGGER_UPG_CALENDAR_YEARS;
                            break;
                    }
                }
            }

            return JSON.stringify([0, accountType | 0, location | 0, trigger | 0]);
        }
    }

    return new class RewindUI {
        constructor() {
            this.init();
        }

        init() {
            lazy(this, 'sidebar', () => new RewindSidebar);
            lazy(this, 'DATEPICKER_VIEW_TYPE_DAYS', () => DATEPICKER_VIEW_TYPE_DAYS);
        }
    };
});
