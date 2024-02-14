
lazy(mega, 'commercials', () => {

    'use strict';

    // Initialise objects and sets
    const linkedSlots = {
        'mwebcdb': ['mwebcdb', 'mwebtcdb'],
        'mwebtcdb': ['mwebtcdb', 'mwebcdb'],
        'mwebfilinkb': ['mwebfilinkb', 'mwebtfilinkb'],
        'mwebtfilinkb': ['mwebtfilinkb', 'mwebfilinkb'],
        'mwebfolinkb': ['mwebfolinkb', 'mwebtfolinkb'],
        'mwebtfolinkb': ['mwebtfolinkb', 'mwebfolinkb'],
        'webfilinkb': ['webfilinkb', 'webfilinkbs'],
        'webfilinkbs': ['webfilinkbs', 'webfilinkb'],
    };      // List of all slots that should be treated as the same slot together when closing a comm as a new user
    const pageWidthInfo = {
        wideOrNarrow: undefined,
        showSlot: undefined,
    };      // Contains information for setting the height of the bottom bar in mobile pages
    const slotWrappers = {};        // Stores all opened slotWrappers
    const newUserClosedSlots = new Set();       // Comms that have been closed by a new user to not redisplay
    const loading = new Set();      // Store all currently loading comms to ensure same one not simultaneously reloaded

    // Cache generally used JQuery elements
    let $startholder;       // Cache the startholder
    let $fileManagerBlock;      // Stores the file manager block
    let $mobileFooter;      // Cache the footer for non-cloud drive mobile pages
    let $slotParent;        // Parent of the currently active coms. Updated on page load
    let $closeButton;       // Close button to clone for comm creation
    let $videoTheatreModeWrapper;       // Wrapper for the video theatre mode
    let $theatreMode;       // Video section to adjust the class of if user is in video theatre mode

    // Initialise variables that store information about the current comms state
    let activeSlots = [];       // List of all currently active commercial (comm) ids
    let commSlots = [];     // List of all new slots to update comms with
    let currentPage;     // Stores the users' current page in an easily accessible way.
    let closeMobileCloudDriveSlots = false;     // Have mobile cloud drive ad slots been permanantly closed?
    let closeMobileFolderlinkSlots = false;     // Have mobile folder link ad slots been permanantly closed?
    let closeFileLinkSlots = false;
    let initialised = false;        // Have adHandlers been initialized
    let isMobileCloudDrive;     // True if current page is mobile home, and selected tab is cloud drive
    let resizeHandlerActive;        // Are there any current resize handlers active for comms
    let commsReturned = true;      // Store if any comms have been returned from api

    // Initialise variables to check for specific states
    let $fmholder;      // Cache the fmholder to check if it has the class for copying or moving files
    let copyOrMove;     // Is a file being copied or moved in the mobile cloud drive?
    let $megaOverlay;       // Cache the mega overlay to check if it is overriding ad displays
    let overlayActive;      // Is there currently an overlay blocking ads from showing?
    let $mediaViewer;       // Cache the media viewer
    let imageOpen;      // Store if an image is open, meaning that ads should not be displayed
    let $filePreview;       // Store the file preview to check if it has the class for copying or moving files
    let filePreviewOpen;        // Is there currently a file preview being displayed?
    let commsCovered;       // Store if any commercials are covered by something that they shouldn't be displayed behind
    let cspInitialised = false;        // Have csp been initialised?
    let adCookies = 0;


    // Check if the slotWrapper is cached, if not then retrieve and cache it, and return the commWrapper
    const getCommWrapper = (commID) => {

        if (!slotWrappers[commID] || !slotWrappers[commID][0]){
            slotWrappers[commID] = $(`#commercial-wrapper-${commID}`, $slotParent);
        }
        return slotWrappers[commID];
    };

    // Update general cached elements
    const updateCachedElements = () => {
        const fileManagerName = is_mobile
            ? '.file-manager-block'
            : '.main-blur-block > .fm-main';

        $fmholder = $fmholder || $(`body .fmholder`);

        $fileManagerBlock = $(`> ${fileManagerName}`, $fmholder);
        $startholder = $startholder || $(`body #mainlayout #startholder`);
        $megaOverlay = $megaOverlay || $(`body > .overlay-wrap`).not('.modal-dialog');
        $mediaViewer = $mediaViewer || $('.media-viewer-container ', $fileManagerBlock);
        $filePreview = $filePreview || $('.overlay-wrap', $fileManagerBlock);
    };

    // Set the fileManagerBlock to be user, and return the wrapper of the comms on the page
    const getslotParent = (newPage) => {

        if ((!$fileManagerBlock || !$fileManagerBlock[0]) || (newPage !== currentPage)) {
            updateCachedElements();
        }

        switch (newPage) {

            // Mobile folder link bottom bar is not located in the file manager block
            case 'mobileFolderlink':
                return $('body #fmholder > .mega-comms.mega-bottom-bar');
            case 'mobileClouddrive':
                return $('> .commercial-footer-cd', $fileManagerBlock);
            case 'mobileFilelink':
                return $('.media-viewer footer .viewer-bars > .mega-comms.mega-bottom-bar', $fileManagerBlock);
            case 'folderLink':
                return $('> .fm-right-files-block', $fileManagerBlock);
            case 'home':
            case 'clouddrive':
                return $('.fm-left-panel', $fileManagerBlock);
            default:
                return undefined;
        }
    };

    // Get the slots and page name
    const getCurrentSlotsAndPage = (getMobile) => {

        let newSlots = [];
        let newPage = '';

        if (is_mobile && getMobile) {
            if (pfid) {
                newSlots = [['mwebfolinkb'], ['mwebtfolinkb']];
                newPage = 'mobileFolderlink';
            }
            else if (M.currentdirid) {
                if (M.currentrootid === M.RootID) {
                    newSlots = [['mwebcdb'], ['mwebtcdb']];
                    newPage = 'mobileClouddrive';
                }
                else {
                    newSlots = [];
                    newPage = 'mobileClouddrive';
                }
            }
            else {
                newSlots = [['mwebfilinkb'], ['mwebtfilinkb']];
                newPage = 'mobileFilelink';
            }
        }
        else if (is_mobile) {
            newSlots = [];
        }
        else if (folderlink) {
            newSlots = ['weblinkb'];
            newPage = 'folderLink';
        }
        else if (page === 'download') {
            newSlots = [['webfilinkbs'], ['webfilinkb']];
            newPage = 'filelink';
        }
        else if (M.currentTreeType){
            switch (M.currentTreeType) {
                case 'dashboard':
                    newSlots = ['webdashsl'];
                    newPage = 'home';
                    break;
                case 'cloud-drive':
                    newSlots = ['webcdsl'];
                    newPage = 'clouddrive';
                    break;
                case 'gallery':
                    newSlots = ['webphsl'];
                    newPage = 'home';
                    break;
            }
        }

        if (newSlots.length === 2) {
            newSlots = pageWidthInfo.wideOrNarrow === 'narrow'
                ? newSlots[0]
                : newSlots[1];
        }

        return [newSlots, newPage];
    };

    // Hide given comms, otherwise hide all active comms
    // Empties the slot instead of hiding it to give more accurate data from megaad about loaded comms
    const hideComms = (commSlots, hideWrapper) => {

        commSlots = commSlots && commSlots.length
            ? commSlots
            : activeSlots;

        for (let i = 0; i < commSlots.length; i++) {
            if (!activeSlots.includes(commSlots[i]) && !hideWrapper) {
                continue;
            }
            const commID = commSlots[i];
            const $slotWrapper = getCommWrapper(commID);

            if ($slotWrapper.length) {
                if (hideWrapper) {
                    $slotWrapper.addClass('hidden');
                    const index = activeSlots.indexOf(commID);
                    if (index > -1) {
                        activeSlots.splice(activeSlots.indexOf(commID), 1);
                    }
                }

                $slotWrapper.empty();
            }

            // Unblocks future loading additions if the page size is changed between mobile/tablet
            // It is safe to assume that if a slot should be hidden, its linked comms should also be
            if (linkedSlots[commID]) {
                for (let j = 0; j < linkedSlots[commID].length; j++) {
                    loading.delete(linkedSlots[commID][j]);
                }
            }
            else {
                loading.delete(commID);
            }
        }

        // Resize the window to make sure any empty space is filled, and scrollbars are correct height
        if (hideWrapper && u_attr && u_attr.na && !is_mobile) {
            $(window).resize();
        }
    };

    // Sets the currently active page, slotParent, and updates the comms to show
    const updateCurrentPage = (getMobile, blockReset) => {

        commSlots = [];

        const [newSlots, newPage] = getCurrentSlotsAndPage(getMobile);

        const isNewPage = currentPage !== newPage;

        if (u_attr && u_attr.na) {
            for (let i = 0; i < newSlots.length; i++) {
                if (!newUserClosedSlots.has(newSlots[i])) {
                    commSlots.push(newSlots[i]);
                }
            }
        }
        else {
            commSlots = newSlots;
        }

        if ((!$slotParent || !$slotParent[0]) || isNewPage) {
            if (currentPage === 'folderLink') {
                hideComms(undefined, true);
            }
            $slotParent = getslotParent(newPage);
            currentPage = newPage;
            if (isNewPage && !blockReset) {
                // eslint-disable-next-line no-use-before-define
                init(true);

                // Return true if the page is being re initialized, so that current updates can be blocked
                return true;
            }
        }
    };

    // Unhide given comms if they are in active comms
    const unhideComms = (commSlots) => {

        let resize = false;

        for (let i = 0; i < commSlots.length; i++) {
            if (activeSlots.includes(commSlots[i])) {

                const $slotWrapper = getCommWrapper(commSlots[i]);
                if ($slotWrapper.length) {
                    resize = $slotWrapper.hasClass('hidden');

                    $('iframe', $slotWrapper).removeClass('hidden');
                    $slotWrapper.removeClass('hidden');
                    $('.commercial-close-button', $slotWrapper).removeClass('hidden');
                }
            }
        }
        if (currentPage === 'mobileFilelink' && resize) {
            $(window).resize();
        }
    };

    // Add and remove classes to make the bottom bar and footer in mobile the correct heights
    // and correct display (flex/none)
    const updateBottomBar = (noComms) => {

        // Handle no commercials being returned by api (remove all stylings for comms)
        commsReturned = noComms === undefined
            ? commsReturned
            : !noComms;

        if (!commsReturned) {
            $fileManagerBlock.removeClass('cd-commercials fol-commercials');
            if (currentPage === 'mobileCloudDrive') {
                $mobileFooter.removeClass('commercials');
            }
            return;
        }

        if (currentPage === 'mobileClouddrive' && M.currentrootid === M.RootID) {

            $mobileFooter = $mobileFooter && $mobileFooter.length
                ? $mobileFooter
                : $('.mega-footer', $fileManagerBlock);

            if (closeMobileCloudDriveSlots || filePreviewOpen) {
                $fileManagerBlock.removeClass('cd-commercials');
                $mobileFooter.removeClass('commercials');
            }
            else {
                $fileManagerBlock.addClass('cd-commercials');
                $mobileFooter.addClass('commercials');
            }
        }
        else {
            $fileManagerBlock.removeClass('cd-commercials');
        }

        if (currentPage === 'mobileFolderlink') {
            if (closeMobileFolderlinkSlots || filePreviewOpen) {
                $fileManagerBlock.removeClass('fol-commercials');
            }
            else {
                $fileManagerBlock.addClass('fol-commercials');
            }
        }
        else {
            $fileManagerBlock.removeClass('fol-commercials');
        }
    };

    // Set the information for showing commercials in the bottom bar, as well as the current state, tablet or mobile
    const setMobileBottomBar = (width) => {

        if (!width
            || (closeMobileCloudDriveSlots && currentPage === 'mobileClouddrive')
            || (closeMobileFolderlinkSlots && currentPage === 'mobileFolderlink')) {
            return;
        }

        if (width === 'reset'){
            pageWidthInfo.showSlot = false;
            if (currentPage === 'mobileClouddrive') {
                closeMobileCloudDriveSlots = true;
            }
            else if (currentPage === 'mobileFolderlink') {
                closeMobileFolderlinkSlots = true;
            }
        }
        else {
            pageWidthInfo.wideOrNarrow = width < 770 ? 'narrow' : 'wide';
            if ((window.outerHeight >= 600) && (width >= 360)) {
                pageWidthInfo.showSlot = true;
            }
            else {
                pageWidthInfo.showSlot = false;
                hideComms(undefined, true);
            }
        }

        updateBottomBar();

    };

    // Check if the resize handler should be active, set it if so, remove it if not
    const updateResizeHandlers = () => {
        if (activeSlots.length < 1 || currentPage === '') {
            if (is_mobile) {
                $(window).off('resize.mega-comms-mobile');
            }
            else {
                $(window).off('resize.mega-comms-desktop');
            }
            resizeHandlerActive = false;
        }
        else if (!resizeHandlerActive) {
            if (is_mobile) {
                // eslint-disable-next-line no-use-before-define
                initMobileResizeHandler(true);
            }
            else {
                // eslint-disable-next-line no-use-before-define
                initDesktopResizeHandler();
            }
        }
    };

    // Set if the user should have space for ads under the video theatre mode
    const setVideoTheatreMode = (add, $wrapper) => {

        $videoTheatreModeWrapper = $videoTheatreModeWrapper || $wrapper;
        $theatreMode = $theatreMode || $('.download.main-pad .download.transfer-wrapper', $videoTheatreModeWrapper);
        if (!mega.flags.ab_ads || !$videoTheatreModeWrapper || currentPage !== 'filelink') {
            return;
        }

        if (activeSlots.length === 0 && !closeFileLinkSlots && add) {
            // eslint-disable-next-line no-use-before-define
            getComms();
        }

        if (add && !closeFileLinkSlots) {
            $theatreMode.addClass('fil-commercials');
        }
        else if (closeFileLinkSlots || activeSlots.length === 0) {
            $theatreMode.removeClass('fil-commercials');
        }
    };

    // This should only be called after an await csp.init() call
    const updateCommCookies = () => {
        if (csp.has('ad') === adCookies) {
            return;
        }
        adCookies = csp.has('ad');
        for (let i = 0; i < activeSlots.length; i++) {
            const $slotWrapper = getCommWrapper(activeSlots[i]);
            const iframe = $('> iframe', $slotWrapper)[0];
            // If there is no iframe found we cannot edit the cookies, so remove the iframe to be safe
            if (!iframe) {
                hideComms([activeSlots[i]], true);
            }
            else if (adCookies && !iframe.src.includes('&ac=1')) {
                iframe.src += '&ac=1';
            }
            else {
                iframe.src = iframe.src.replace('&ac=1', '');
            }
        }
    };

    const handleCookies = async() => {
        // If essential cookies are not set, csp is not initialized
        if (mega.flags.ab_adse && 'csp' in window) {
            if (d) {
                console.info('begin await ad init cookies');
            }
            await csp.init();
            updateCommCookies();
            cspInitialised = true;
            if (d) {
                console.info('finish await ad init cookies');
            }
        }

        return false;
    };

    // Create a given commercial from information returned by api
    const createComm = async(comm) => {

        let commID = comm.id.toLowerCase();

        const slotWrapper = getCommWrapper(commID)[0];

        if (slotWrapper) {
            const newIframe = document.createElement('iframe');

            handleCookies();

            if (document.body.classList.contains('theme-dark')) {
                comm.src += '&dm=1';
            }

            if (cspInitialised && csp.has('ad')) {
                comm.src += '&ac=1';
            }

            newIframe.sandbox = 'allow-scripts allow-same-origin allow-popups';
            newIframe.id = commID;
            newIframe.src = comm.src;
            newIframe.width = comm.w;
            newIframe.height = comm.h;
            newIframe.classList.add('hidden');
            newIframe.onload = () => {
                if (activeSlots.includes(commID.toLowerCase()) && !commsCovered) {
                    unhideComms([commID]);
                }
                else {
                    $(slotWrapper).empty();
                }
                if (linkedSlots[commID]) {
                    for (let i = 0; i < linkedSlots[commID].length; i++) {
                        loading.delete(linkedSlots[commID][i]);
                    }
                }
                else {
                    loading.delete(commID);
                }
            };

            $closeButton = $closeButton && $closeButton[0].length
                ? $closeButton
                : currentPage === 'filelink'
                    ? $('.bottom-page .download-content #commercial-close-button', $startholder)
                    : $('#commercial-close-button', $fileManagerBlock);

            const $closeClone = $closeButton.clone().addClass('hidden');

            $closeClone.rebind('click', () => {
                commID = linkedSlots[commID] || [commID];

                // Permanantly hide all linked comms if user is new
                hideComms(commID, u_attr && u_attr.na);
                if (u_attr && u_attr.na) {
                    for (let i = 0; i < commID.length; i++) {
                        newUserClosedSlots.add(commID[i]);
                    }
                    if (currentPage === 'mobileClouddrive' || currentPage === 'mobileFolderlink') {
                        setMobileBottomBar('reset');
                    }
                    else if (currentPage === 'filelink') {
                        closeFileLinkSlots = true;
                        setVideoTheatreMode(false);
                    }
                    updateResizeHandlers();
                }
                else {
                    // eslint-disable-next-line no-use-before-define
                    getComms(true, true);
                }
            });
            $closeClone.removeAttr('id');
            slotWrapper.replaceChildren(newIframe, $closeClone[0]);
            loading.add(commID);
        }
        else {
            if (d) {
                console.error('No slot wrapper found for', commID);
            }
            loading.delete(commID);
        }
    };

    // Update current page, and get the comms that should be loaded
    const getComms = (getMobile, force) => {

        const stopUpdate = updateCurrentPage(getMobile);

        if (!mega.flags.ab_ads
            || ((is_mobile || currentPage === 'filelink') && !pageWidthInfo.showSlot)
            || stopUpdate) {
            return;
        }

        // The is largely to ensure that the tabs in desktop fm don't refresh ads
        if ((activeSlots.toString() === commSlots.toString())
            && !force) {
            return;
        }

        hideComms((Array.from(activeSlots)).filter(x => !commSlots.includes(x)), currentPage === 'home'
            || currentPage === 'mobileCloudcloudrive');

        activeSlots = commSlots;

        if ((currentPage === 'mobileClouddrive' && (M.currentrootid !== M.RootID))
            || (commSlots.length === 0)
            || commsCovered) {
            hideComms([], true);
            activeSlots = [];
            updateResizeHandlers();
            return;
        }

        updateResizeHandlers();

        const req = {
            a: 'adf',
            ad: localStorage.commFlag | 0,
            au: commSlots.filter(slot => (!newUserClosedSlots.has(slot) && !loading.has(slot))).map(slot => {
                loading.add(slot);
                return slot.toUpperCase();
            }),
        };

        if (req.au.length < 1) {
            return;
        }

        if (pfid) {
            req.ph = pfid;
        }

        api.req(req).then((res) => {
            res = res.result;
            if (res[0] !== ENOENT) {
                for (let i = 0; i < res.length; i++) {
                    if (!newUserClosedSlots.has(res[i].id.toLowerCase())) {
                        createComm(res[i]);
                    }
                }
            }
        }).catch((ex) => {

            // Remove all active comms and comm styles
            hideComms(activeSlots, true);
            updateBottomBar(true);
            setVideoTheatreMode(false);
            for (let i = 0; i < req.au.length; i++) {
                loading.delete(req.au[i]);
            }

            // There are no ads for the user to render
            if (ex === ENOENT) {
                if (d) {
                    console.info('No ads returned from api for:', req);
                }
            }
            else if (d) {
                console.error('Commercials API call returned an error: ' + ex);
            }
        });
    };


    // If comms are enabled, create a new wrapper for the bottom bar,
    // and return the new bottom bar node location.
    const addCommsToBottomBar = (bottomBar, isFolderLink) => {

        if (!mega.flags.ab_ads || (currentPage === 'mobileFolderlink' && !isFolderLink)){
            return bottomBar;
        }

        // This is due to an existing bug, where the bottom bar is duplcated.
        // Permanantly hide affected comms to prevent issues
        if (closeMobileFolderlinkSlots || $(bottomBar.parentElement).children('.mega-bottom-bar').length) {
            newUserClosedSlots.add('mwebfolinkb');
            newUserClosedSlots.add('mwebtfolinkb');
            closeMobileFolderlinkSlots = true;
            hideComms(['mwebfolinkb', 'mwebtfolinkb'], true);
            updateBottomBar();
            return bottomBar;
        }

        slotWrappers.mwebtfolinkb = undefined;
        slotWrappers.mwebfolinkb = undefined;

        const newBottomBar = document.createElement('div');
        newBottomBar.classList.add('mega-bottom-bar');
        bottomBar.appendChild(newBottomBar);
        bottomBar.classList.add('mega-comms', 'mega-bottom-bar');
        return newBottomBar;
    };

    // If comms are enabled, create new slots for comms to show in in the bottom bar
    const createMobileBottomBarSlots = (bottomBar, isFolderLink) => {

        if (!mega.flags.ab_ads || (currentPage === 'mobileFolderlink' && !isFolderLink) || closeMobileFolderlinkSlots) {
            return;
        }

        const [mobileSlot, tabletSlot] = isFolderLink
            ? ['mwebfolinkb', 'mwebtfolinkb']
            : ['mwebfilinkb', 'mwebtfilinkb'];

        const mobileslotWrapper = document.createElement('div');
        mobileslotWrapper.classList.add('commercial-wrapper', 'mobile', 'hidden');
        mobileslotWrapper.id = 'commercial-wrapper-' + mobileSlot;
        const tabletslotWrapper = document.createElement('div');
        tabletslotWrapper.classList.add('commercial-wrapper', 'tablet', 'hidden');
        tabletslotWrapper.id = 'commercial-wrapper-' + tabletSlot;

        bottomBar.appendChild(mobileslotWrapper);
        bottomBar.appendChild(tabletslotWrapper);

        // eslint-disable-next-line no-use-before-define
        init('bottom-bar');
    };

    // Create the commSlots for mobile cloud drive if they do not already exist
    const createMobileCloudDriveSlots = () => {

        if (!mega.flags.ab_ads || !is_mobile || currentPage !== 'mobileClouddrive') {
            return;
        }

        // When user navigates back/forward through pages, the slots may already exist
        if ($slotParent.children().length < 1 && $slotParent[0]) {
            const mobileCloudDriveSlot = document.createElement('div');
            mobileCloudDriveSlot.classList.add('commercial-wrapper', 'mobile', 'hidden');
            mobileCloudDriveSlot.id = 'commercial-wrapper-mwebcdb';
            const tabletCloudDriveSlot = document.createElement('div');
            tabletCloudDriveSlot.classList.add('commercial-wrapper', 'tablet', 'hidden');
            tabletCloudDriveSlot.id = 'commercial-wrapper-mwebtcdb';

            $slotParent[0].appendChild(mobileCloudDriveSlot);
            $slotParent[0].appendChild(tabletCloudDriveSlot);
        }
    };

    const shouldUpdatePage = (container) => {

        return (container.offsetWidth >= 770 && pageWidthInfo.wideOrNarrow !== 'wide'
            || container.offsetWidth < 770 && pageWidthInfo.wideOrNarrow !== 'narrow'
            || (((window.outerHeight >= 600) && (container.offsetWidth >= 360)) !== pageWidthInfo.showSlot)
            || ($fmholder.hasClass('selection-mode') !== copyOrMove)
            || ($megaOverlay.hasClass('.active:not(.modal-dialog)') !== overlayActive)
            || ($mediaViewer.hasClass('fullimage') !== imageOpen)
            || (($filePreview.hasClass('active') && currentPage !== 'mobileFilelink') !== filePreviewOpen));
    };

    // Check if the comms need to be updated based on if the container is wide/tall enough for mobile/tablet comms,
    // as well as the currently shown type of comm
    const updateMobileComms = (container, forceUpdate) => {

        if (!container) {
            return;
        }

        if (shouldUpdatePage(container) || forceUpdate) {
            copyOrMove = $fmholder.hasClass('selection-mode');
            overlayActive = $megaOverlay.hasClass('.active:not(.modal-dialog)');
            imageOpen = $mediaViewer.hasClass('fullimage');
            filePreviewOpen = $filePreview.hasClass('active') && currentPage !== 'mobileFilelink';
            commsCovered = copyOrMove || overlayActive || imageOpen || filePreviewOpen;

            setMobileBottomBar(container.offsetWidth);

            updateCurrentPage(true);

            if (commsCovered) {
                hideComms(activeSlots, true);
                return;
            }

            if (currentPage === 'mobileClouddrive') {
                if (pageWidthInfo.wideOrNarrow === 'wide') {
                    $('.tablet', $slotParent).removeClass('hidden');
                    $('.mobile', $slotParent).addClass('hidden');
                    hideComms(['mwebcdb'], true);
                }
                else {
                    $('.tablet', $slotParent).addClass('hidden');
                    $('.mobile', $slotParent).removeClass('hidden');
                    hideComms(['mwebtcdb'], true);
                }
            }
            getComms(true, forceUpdate);
        }
    };

    // Prevents comm showing when changing to tabs that do not have comms in the mobile home page
    const mobileFmTabHander = () => {

        if (currentPage !== 'mobileClouddrive') {
            return;
        }
        const isCloudDrive = M.currentrootid === M.RootID;
        if (isMobileCloudDrive !== isCloudDrive) {
            isMobileCloudDrive = isCloudDrive;
            getComms(true);
            updateBottomBar();
        }
    };

    // Initialise the cloud drive comm footer by pre-setting the correct commSlot to be shown, and updating the heights
    // of the file manager and footer button in mobile cloud drive
    const initCloudDriveAdFooter = (container) => {

        $slotParent.removeClass('hidden');
        if (pageWidthInfo.wideOrNarrow === 'wide') {
            $('.tablet', $slotParent).removeClass('hidden');
            hideComms(['mwebcdb'], true);
        }
        else {
            $('.mobile', $slotParent).removeClass('hidden');
            hideComms(['mwebtcdb'], true);
        }
        setMobileBottomBar(container.offsetWidth);
    };

    // Initialise the container and any needed elements to allow the comms to change which size is shown
    // when the page is resized
    const initMobileResizeHandler = (blockUpdate) => {

        if (!is_mobile && !resizeHandlerActive) {
            return;
        }

        resizeHandlerActive = true;

        updateCurrentPage(true);

        $fileManagerBlock = $fileManagerBlock || $('body .fmholder .file-manager-block');

        const container = currentPage === 'mobileFilelink'
            ? $startholder[0]
            : $fileManagerBlock[0];

        if (!container) {
            return;
        }

        if (currentPage === 'mobileClouddrive') {
            initCloudDriveAdFooter(container);
            mobileFmTabHander();
        }
        $(window).rebind('resize.mega-comms-mobile', () => updateMobileComms(container, false));
        if (!blockUpdate) {
            updateMobileComms(container, true);
        }
    };

    const updateDesktopComms = (container, forceUpdate) => {
        if (container.offsetWidth >= 956 && pageWidthInfo.wideOrNarrow !== 'wide'
        || container.offsetWidth < 956 && pageWidthInfo.wideOrNarrow !== 'narrow'
        || ((container.offsetWidth >= 450) !== pageWidthInfo.showSlot)) {

            pageWidthInfo.wideOrNarrow = container.offsetWidth >= 956
                ? 'wide'
                : 'narrow';
            pageWidthInfo.showSlot = container.offsetWidth >= 450;

            if (!pageWidthInfo.showSlot) {
                hideComms(activeSlots, true);
            }

            getComms(false, forceUpdate);
        }
    };

    const initDesktopResizeHandler = () => {
        if (currentPage !== 'filelink') {
            return;
        }

        resizeHandlerActive = true;

        updateCurrentPage();

        const container = $startholder[0];

        $(window).rebind('resize.mega-comms-desktop', () => updateDesktopComms(container, false));
        updateDesktopComms(container, true);
    };

    // Initialise the commercials. Reset for when the user goes to a new page without reloading
    const init = (reset) => {

        if (reset === 'bottom-bar') {
            $fileManagerBlock = undefined;
            $slotParent = undefined;
            $filePreview = undefined;
            updateCurrentPage(is_mobile, true);
            return;
        }
        else if (reset) {
            initialised = false;
            $fileManagerBlock = undefined;
            $slotParent = undefined;
            $filePreview = undefined;
            hideComms(activeSlots, true);
            activeSlots = [];
            resizeHandlerActive = false;

            updateResizeHandlers();

            // Some slotWrappers are deleted and recreated, we need the new elements
            slotWrappers.mwebtfilinkb = undefined;
            slotWrappers.mwebfilinkb = undefined;
            slotWrappers.webfilinkb = undefined;
            slotWrappers.webfilinkbs = undefined;
            slotWrappers.mwebcdb = undefined;
            slotWrappers.mwebtcdb = undefined;
            loading.clear();
            isMobileCloudDrive = false;
        }

        if (initialised || !mega.flags.ab_ads) {
            return;
        }

        if (localStorage.commFlag | 0) {
            console.error('Commercials are currently being controlled by a set flag: ' + localStorage.commFlag);
        }

        updateCurrentPage(is_mobile, true);

        if (currentPage) {
            initialised = true;
        }

        if (currentPage === 'mobileClouddrive') {
            createMobileCloudDriveSlots();
        }
        else if (currentPage === 'filelink') {
            initDesktopResizeHandler();
        }

        if (is_mobile) {
            initMobileResizeHandler(true);
        }
        else {
            getComms();
        }

    };

    // When a new overlay is created or removed, check active overlays
    const updateOverlays = (overlay) => {

        // In the case of promo, a new overlay is created that needs fetching to check its state
        if (overlay === 'promo') {
            $megaOverlay = $(`body > .overlay-wrap:not(.modal-dialog)`);
        }
        else if (overlay === 'modal-dialog') {
            $megaOverlay = $megaOverlay && $megaOverlay.not('.modal-dialog');
        }

        if (!$fileManagerBlock || !$startholder) {
            updateCachedElements();
        }

        const container = currentPage === 'mobileFilelink'
            ? $startholder[0]
            : $fileManagerBlock[0];

        updateMobileComms(container);
        updateResizeHandlers();
    };

    // Usable from the console for testing, allows an account to force ads to show
    // This is only available if the ab_ads flag is set, so user has seen advertisement info (just to be safe)
    const forceComms = (value, unset) => {
        if (!mega.flags.ab_ads) {
            return;
        }

        value = value || 0;
        let info;

        if (value === 0) {
            localStorage.commFlag = 0;
            info = 'reset flag';
            init(true);
            return;
        }

        if (unset) {
            localStorage.commFlag &= ~value;
            info = 'unset: ' + value;
        }
        else {
            localStorage.commFlag |= value;
            info = 'set: ' + value;
        }
        if (d) {
            console.group('comm flag updated');
            console.info(info);
            console.info('Now set to: ' + localStorage.commFlag);
            console.groupEnd();
        }

        init(true);
    };

    const getAdFlag = () => {
        if (!u_attr) {
            console.error('You must be logged in to use this function');
            return;
        }
        console.group('Current comm flags', u_attr['^!adflag']);
        for (let i = 1; i < 32769; i *= 2) {
            if (u_attr['^!adflag'] & i) {
                console.info(`Flag ${i} is set`);
            }
        }
        console.groupEnd();
    };

    const setAdFlag = (value, unset) => {
        if (!u_attr) {
            console.error('You must be logged in to use this function');
            return;
        }
        value = +value;
        if (unset && value !== 0) {
            value = u_attr['^!adflag'] & ~value;
        }
        else if (value !== 0) {
            value |= u_attr['^!adflag'];
        }
        mega.attr.set('adflag', value, -2, true);
        u_attr['^!adflag'] = value;
        console.info('Set mobile adflag to:', value);
    };

    // Usable from the console for testing, allows an account to see which comm flags are set
    const getCommFlag = () => {
        if (!d) {
            return;
        }
        console.group('Current comm flags');
        for (let i = 512; i < 16385; i *= 2) {
            if (localStorage.commFlag & i) {
                console.info(`Flag ${i} is set`);
            }
        }
        console.groupEnd();
    };

    return {
        getComms,
        init,
        mobileFmTabHander,
        addCommsToBottomBar,
        createMobileBottomBarSlots,
        forceComms,
        getCommFlag,
        updateOverlays,
        setVideoTheatreMode,
        updateCommCookies,
        setAdFlag,
        getAdFlag,
    };
});

mBroadcaster.addListener('csp:settingsSaved', () => {
    'use strict';
    if (mega.flags.ab_adse) {
        mega.commercials.updateCommCookies();
    }
});

mBroadcaster.addListener('login2', () => {
    'use strict';
    if (mega.flags.ab_ads) {
        mega.commercials.init(true);
    }
});

mBroadcaster.addListener('mega:openfolder', SoonFc(90, () => {
    'use strict';
    if (mega.flags.ab_ads) {
        mega.commercials.getComms(is_mobile);
    }
}));
