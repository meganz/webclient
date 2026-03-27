/**
 * Functionality for the Notifications popup
 *
 * 1) On page load, fetch the latest x number of notifications. If there are any new ones, these should show a
 *    number e.g. (3) in the red circle to indicate there are new notifications.
 * 2) When they click the notifications icon, show the popup and whatever notifications the user has.
 * 3) On action packet receive, put the notification at the top of the queue and update the red circle to indicate a
 *    new notification. Next time the popup opens this will show the new notification and old ones.
 */

lazy(mega.ui, 'notifyUtils', () => {
    'use strict';

    const { FilterChipComponent } = mega.ui.mNodeFilter;

    /**
     * Notification Filter UI Chip Component for Notification Center
     */
    class NotifCenterFilter extends FilterChipComponent {
        /**
         * Class constructor
         * @param {Object} $wrapper Element filter wrapper
         * @param {Function} onItemSelectFn Function to run when filter item is selected
         */
        constructor($wrapper, onItemSelectFn) {
            const name = 'type';
            const prefix = 'notif';

            const filters = {
                [name]: {
                    title: l.all_notifications,
                    match(n) {
                        return !this.selection || this.selection.includes(n.type);
                    },
                    menu: [
                        {
                            label: l[164],
                            classes: ['notification-filter'],
                            get data() {
                                return ['share', 'd', 'dshare', 'put', 'ph', 'puu'];
                            },
                        },
                        {
                            label: l.chats_meetings,
                            classes: ['notification-filter'],
                            get data() {
                                return ['mcsmp'];
                            },
                        },
                        {
                            label: l[165],
                            classes: ['notification-filter'],
                            get data() {
                                return ['ipc', 'c', 'upci', 'upco'];
                            },
                        },
                        {
                            label: l[403],
                            classes: ['notification-filter'],
                            get data() {
                                return ['psts', 'psts_v2', 'pses', 'dynamic'];
                            },
                        }
                    ]
                }
            };

            super(name, prefix, $wrapper, filters);
            this.onItemSelectFn = onItemSelectFn;
        }

        /**
         * Updates position of the filter list element
         * @param {Number} x current filter list element x coordinate
         * @param {Number} y current filter list element y coordinate
         * @param {Number} proposeX proposed filter list element x coordinate
         * @param {Number} proposeY proposed filter list element y coordinate
         * @returns {void}
         */
        setPositionByCoordinates(x, y, proposeX, proposeY) {
            super.setPositionByCoordinates(x, y, proposeX, proposeY);

            const currentLeft = parseInt(this.el.style.left, 10) || 0;
            const correction = 16;
            const left = document.body.classList.contains('rtl')
                ? currentLeft - correction
                : currentLeft + correction;

            this.el.style.left = `${left}px`;
        }

        /**
         * Initializes filter or set selection if index passed
         * @param {Function} fn initialisation function
         * @returns {void}
         */
        init(fn) {
            this.$element.removeClass('hidden');
            if (typeof fn === 'function') {
                fn();
            }
        }

        /**
         * Handles the selection of an item
         * @param {Number} index the index of the selected item
         * @param {Object} item the selected item object
         * @param {Function} clickFn onclick function
         * @returns {void}
         */
        onItemSelect(index, item, clickFn) {
            super.onItemSelect(index, item, clickFn, true);
            if (typeof this.onItemSelectFn === 'function') {
                this.onItemSelectFn();
            }
        }
    }

    /**
     * Shimmer UI for Notification Center
     */
    class NotifCenterShimmer {
        /**
         * Class constructor
         * @param {Object} $container Element containing loading shimmer
         */
        constructor($container) {
            this.$container = $container;

            lazy(this, 'template', () => {
                const res = pages.notification_shimmer_html || getTemplate('notification_shimmer_html');
                delete pages.notification_shimmer_html;
                return parseHTML(res).querySelector('template');
            });
        }

        /**
         * Creates shimmer
         * @returns {void}
         */
        init() {
            const {content} = this.template;
            this.$container.empty();

            for (let i = 0; i < Math.floor(436 / 80); i++) {
                const newItem = $(content).clone(true);
                this.$container.append(newItem);
            }
        }
    }

    /**
     * Notification Data Manager (NDM) for Notification Center
     * Fetches extra data (users, nodes, shares) related to notifications
     */
    class NotifCenterNDM {
        /**
         * Class constructor
         */
        constructor() {
            /** cached nodes loaded from DB */
            this.nodes = Object.create(null);

            /** (nested) nodes within incoming shared folders at any level in the tree */
            this.nodesInShares = Object.create(null);

            this.init();
        }

        /**
         * Initialization to start a fresh data fetch
         * @returns {void}
         */
        init() {
            /** whether fetching is in progress */
            this.isFetching = false;

            /** request payload */
            this.payload = {u: new Set(), n: new Set(), s: new Set()};
        }

        /**
         * Returns node corresponding to handle passed
         * @param {String} handle node handle
         * @returns {Object|Boolean} node or false if not found
         */
        getNode(handle) {
            return this.nodes[handle] || M.getNodeByHandle(handle);
        }

        /**
         * Returns shared folder node handle containing node handle passed
         * @param {String} h node handle
         * @returns {String|Boolean} handle or false if not found
         */
        getShare(h) {
            if (this.nodesInShares[h]) {
                return this.nodesInShares[h];
            }
            while (h) {
                const n = M.d[h];
                if (n && n.su) {
                    return n.h;
                }
                h = n  && n.p;
            }
            return false;
        }

        /**
         * Adds notifications data to payload to be fetched later
         * @param {Array<Object>|Object} notifications List or single notification object
         * @returns {void}
         */
        addToPayload(notifications) {
            if (!Array.isArray(notifications)) {
                notifications = [notifications];
            }

            for (let i = 0; i < notifications.length; i++) {
                const {userHandle, type, data} = notifications[i];

                if (userHandle) {
                    this.payload.u.add(userHandle);
                }

                if (!mega.lite.inLiteMode) {
                    const {h, n} = data;
                    const handle = typeof h === 'string'
                        ? h
                        : typeof n === 'string' ? n : false;

                    if (handle) {
                        if (type === 'put' && !M.c.shares[handle]) {
                            this.payload.s.add(handle);
                        }
                        else {
                            this.payload.n.add(handle);
                        }
                    }
                }
            }
        }

        /**
         * Ensures needed data is fetched before rendering notifications
         * @returns {Promise<void>} void
         */
        async fetch() {
            if (!this.isFetching) {
                this.isFetching = true;
                const promises = [];

                if (this.payload) {
                    const {u: users, n: nodes, s: nodesInShares} = this.payload;
                    if (users.size) {
                        promises.push(this._fetchUsers([...users]));
                    }
                    if (!mega.lite.inLiteMode) {
                        if (nodes.size) {
                            promises.push(this._fetchNodes([...nodes]));
                        }
                        if (nodesInShares.size) {
                            promises.push(this._fetchNodesInShares([...nodesInShares]));
                        }
                    }
                }

                return Promise.all(promises).finally(() => {
                    this.isFetching = false;
                    this.payload = null;
                    if (sharer.clear) {
                        sharer.clear();
                    }
                });
            }
        }

        /**
         * Add users to be accessed later when redering notification
         * @param {Array<String>} handles user handles
         * @returns {Promise<Array>} promise result array including user name and email
         */
        async _fetchUsers(handles) {
            const promises = [];
            for (let i = 0; i <= handles.length; i++) {
                const h = handles[i];
                if (!h) {
                    continue;
                }
                const {firstName, lastName} = M.getUserByHandle(h) || {};
                if (firstName && lastName) {
                    continue;
                }
                M.setUser(h);
                promises.push(
                    M.syncUsersFullname(h),
                    M.syncContactEmail(h, true));
            }
            return Promise.allSettled(promises);
        }

        /**
         * Fetch and store in cache not yet loaded nodes
         * @param {Array<String>} handles node handles to fetch
         * @returns {Promise<void>} void
         */
        async _fetchNodes(handles) {
            const nodes = await dbfetch.node(handles).catch(dump) || false;
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                this.nodes[node.h] = node;
            }
        }

        /**
         * Fetch and store in cache the nodes up to shared node containing a node
         * @param {Array<String>} handles node handles to fetch
         * @returns {Promise<void>} void
         */
        async _fetchNodesInShares(handles) {
            for (let i = 0; i < handles.length; i++) {
                const handle = handles[i];
                const node = await sharer.has(handle);
                if (node) {
                    // cache shared node
                    this.nodes[node.h] = node;

                    // cache node assigned to the shared folder it belongs
                    this.nodesInShares[handle] = node.h;
                }
            }
        }
    }

    return freeze({NotifCenterFilter, NotifCenterShimmer, NotifCenterNDM});

});

var notify = {

    /** The current notifications **/
    notifications: [],

    /** Contact request notifications for users already rendered */
    renderedPendingContacts: new Set(),

    /** Number of notifications to fetch in the 'c=100' API request. This is reduced to 50 for fast rendering. */
    numOfNotifications: 50,

    /** Locally cached emails and pending contact emails */
    userEmails: Object.create(null),

    /** jQuery objects for faster lookup */
    $wrapper: null,
    $popup: null,
    $popupIcon: null,
    $headerButton: null,

    /** Promise of if the intial notifications have loaded */
    initialLoading: false,

    /** A flag for if the initial loading of notifications is complete */
    initialLoadComplete: false,

    // The welcome dialog has been shown this session
    welcomeDialogShown: false,

    // Whether the event for viewing the dynamic notifications has been sent
    dynamicNotifsSeenEventSent: false,

    // Current dynamic notifications
    dynamicNotifs: {},
    lastSeenDynamic: undefined,

    newNotifications: 0,
    lastFavicoState: false,

    // Page change event handler
    pageChangeHandler: null,

    // Notification Shimmer (NotifCenterShimmer) instance
    shimmer: null,

    // Notification Data Manager (NotifCenterNDM) instance
    ndm: null,

    // Notification filter (NotifCenterFilter) instance
    filter: null,

    /**
     * Initialise the notifications system
     */
    init: function() {

        // Cache lookups
        notify.$wrapper = $('.notif-wrapper', '.nav-actions');
        notify.$popup = $('.js-notification-popup');
        notify.$popupIcon = $('.top-head .top-icon.notification');
        notify.$headerButton = $('.notif-wrapper .nav-elem.alarm', '.mega-header');

        // Init event handler to open popup
        notify.initNotifyIconClickHandler();

        // Recount the notifications and display red tooltip because they opened a new page within Mega
        notify.countAndShowNewNotifications();
    },

    initShimmer() {
        'use strict';

        const {NotifCenterShimmer} = mega.ui.notifyUtils || {};

        notify.shimmer = notify.shimmer ||
            NotifCenterShimmer && new NotifCenterShimmer($('.notification-popup-loading', '.notif-wrapper'));

        if (notify.shimmer) {
            notify.shimmer.init();
        }
    },

    initNDM() {
        'use strict';

        const {NotifCenterNDM} = mega.ui.notifyUtils || {};

        notify.ndm = notify.ndm ||
            NotifCenterNDM && new NotifCenterNDM();

        if (notify.ndm) {
            notify.ndm.init();
        }
    },

    initFilter() {
        'use strict';

        const {NotifCenterFilter} = mega.ui.notifyUtils || {};

        notify.filter = notify.filter || NotifCenterFilter && new NotifCenterFilter(
            $('.notif-filter-chips-wrapper', '.notif-wrapper'),
            () => {
                if (!notify.ndm.isFetching) {
                    const scrollBlock = document.querySelector('.notif-wrapper .notification-scroll.ps');
                    if (scrollBlock) {
                        scrollBlock.scrollTop = 0;
                    }
                    notify.renderNotifications();
                }
            });

        if (notify.filter) {
            notify.filter.init(() => {
                const $button = $('.notif-filter-chip-button', '.notif-wrapper');
                $button.removeClass('nolink');
                $('i', $button).removeClass('hidden');
            });
        }
    },

    /**
     * Get the most recent notifications from the API
     */
    getInitialNotifications() {
        'use strict';

        notify.initShimmer();
        notify.initNDM();
        notify.initFilter();

        // Clear notifications before fetching (sometimes this needs to be done if re-logging in)
        notify.notifications = [];

        // Call API to fetch the most recent notifications
        notify.initialLoading = api.req(`c=${this.numOfNotifications}`, 3)
            .then(({result}) => {

                // Check it wasn't a negative number error response
                assert(typeof result === 'object');

                // Get the current UNIX timestamp and the last time delta (the last time the user saw a notification)
                var currentTime = unixtime();
                var lastTimeDelta = (result.ltd) ? result.ltd : 0;
                var notifications = result.c;
                var pendingContactUsers = result.u;

                // Add pending contact users
                notify.addUserEmails(pendingContactUsers);

                // Loop through the notifications
                if (notifications) {
                    for (var i = 0; i < notifications.length; i++) {

                        // Check that the user has enabled notifications of this type or skip it
                        if (notify.isUnwantedNotification(notifications[i])) {
                            continue;
                        }

                        var notification = notifications[i];            // The full notification object
                        var id = makeid(10);                            // Make random ID
                        var type = notification.t;                      // Type of notification e.g. share
                        var timeDelta = notification.td;                // Seconds since the notification occurred
                        var seen = (timeDelta >= lastTimeDelta);        // If the notification time delta is older than the last time the user saw the notification then it is read
                        var timestamp = currentTime - timeDelta;        // Timestamp of the notification
                        var userHandle = notification.u;                // User handle e.g. new share from this user

                        if (!userHandle && notification.t === 'ipc') {
                            // incoming pending contact
                            userHandle = notification.p;
                        }
                        else if (!userHandle && type === 'puu') {
                            // public upload user
                            // - TBD.
                        }

                        const newNotification = {
                            data: notification,
                            id,
                            seen,
                            timeDelta,
                            timestamp,
                            type,
                            userHandle,
                        };

                        notify.ndm.addToPayload(newNotification);

                        if (type === 'puu') {
                            newNotification.allDataItems = [notification.h];
                            if (!notify.combinePuuNotifications(newNotification)) {
                                notify.notifications.push(newNotification);
                            }
                        }
                        else {
                            notify.notifications.push(newNotification);
                        }
                    }
                }

                // After the first SC request all subsequent requests can generate notifications
                notify.initialLoadComplete = true;

                // Show the notifications
                notify.countAndShowNewNotifications();

                if (!notify.pageChangeHandler) {
                    notify.pageChangeHandler = mBroadcaster.addListener('pagechange', (page) => {
                        if (page === 'chat' || page.substr(0, 2) === 'fm') {
                            notify.initFilter();
                        }
                        else {
                            notify.filter = null;
                        }
                    });
                }

                if ($('.notif-wrapper', '.nav-actions').hasClass('show')) {
                    return notify.renderHydratedNotifications();
                }
            })
            .catch(dump);
    },

    /**
     * Adds a notification from an Action Packet
     * @param {Object} actionPacket The action packet object
     */
    notifyFromActionPacket: async function(actionPacket) {
        'use strict';

        // We should not show notifications if we haven't yet done the initial notifications load yet
        if (!notify.initialLoadComplete || notify.isUnwantedNotification(actionPacket) || actionPacket.mid) {
            return false;
        }

        // Construct the notification object
        var newNotification = {
            data: actionPacket,                             // The action packet
            id: makeid(10),                                 // Make random ID
            seen: actionPacket.seen || false,               // New notification, so mark as unread
            timeDelta: 0,                                   // Time since notification was sent
            timestamp: actionPacket.timestamp || unixtime(),// Get the current timestamps in seconds
            type: actionPacket.a,                           // Type of notification e.g. share
            userHandle: actionPacket.u || actionPacket.ou   // User handle e.g. new share from this user
        };

        if (actionPacket.a === 'dshare' && actionPacket.orig && actionPacket.orig !== u_handle) {
            newNotification.userHandle = actionPacket.orig;
        }

        if (newNotification.type === 'puu') {
            newNotification.allDataItems = actionPacket.f.map((e) => e.h);
        }

        // Combines the current new notification with the previous one if it meets certain criteria
        notify.combineNewNotificationWithPrevious(newNotification);

        // Show the new notification icon
        notify.countAndShowNewNotifications();

        delay(`notifyFromAP-${newNotification.id}`, () => {
            notify.ndm.init();
            notify.ndm.addToPayload(newNotification);

            const promise = notify.$wrapper.hasClass('show')
                ? notify.renderHydratedNotifications()
                : Promise.resolve();

            promise.catch(dump);
        }, 1e3);
    },

    /**
     * Check whether we should omit a notification.
     * @param {Object} notification
     * @returns {Boolean}
     */
    isUnwantedNotification: function(notification) {

        var action;

        if (notification.dn) {
            return true;
        }

        switch (notification.a || notification.t) {
            case 'put': {
                if (
                    !mega.notif.has('cloud_enabled') ||
                    u_attr.s4 && notification.n && M.getNodeRoot(notification.n) === 's4'
                ) {
                    return true;
                }
                break;
            }
            case 'share':
            case 'dshare':
                if (!mega.notif.has('cloud_enabled')) {
                    return true;
                }
                break;

            case 'c':
            case 'ipc':
            case 'upci':
            case 'upco':
                if (!mega.notif.has('contacts_enabled')) {
                    return true;
                }
                break;
            case 'd':
                if (notification.v) {
                    return true;
                }
                break;
            case 'mcsmp':
                if (!mega.notif.has('chat_enabled')) {
                    return true;
                }
                break;
        }

        switch (notification.a || notification.t) {
            case 'put':
                if (!mega.notif.has('cloud_newfiles')) {
                    return true;
                }
                break;

            case 'share':
                if (!mega.notif.has('cloud_newshare')) {
                    return true;
                }
                break;

            case 'dshare':
                if (!mega.notif.has('cloud_delshare')) {
                    return true;
                }
                break;

            case 'ipc':
                if (!mega.notif.has('contacts_fcrin') || notification.dts) {
                    return true;
                }
                break;

            case 'c':
                action = (typeof notification.c !== 'undefined') ? notification.c : notification.u[0].c;
                if (action === 0 || action === 2 ||
                    (action === 1 && !mega.notif.has('contacts_fcracpt'))) {
                    return true;
                }
                break;

            case 'upco':
                action = (typeof notification.s !== 'undefined') ? notification.s : notification.u[0].s;
                if (action === 3 || action === 2 && !mega.notif.has('contacts_fcracpt')) {
                    return true;
                }
                break;

            case 'puu':
                if (
                    mega.notif.has('cloud_upload') ||
                    u_attr.s4 && notification.n && M.getNodeRoot(notification.n) === 's4'
                ) {
                    // xxx: the above won't work for s4 if the nodes aren't on memory, i.e. Lite-mode.
                    return true;
                }
                break;

            default:
                break;
        }
        return false;
    },

    combinePuuNotifications(currentNotification) {
        'use strict';

        const previousNotification = notify.notifications[notify.notifications.length - 1];
        if (!(currentNotification && previousNotification)) {
            return false;
        }

        // This function is currently only needed for 'puu' notifications
        if (currentNotification.type !== 'puu' || previousNotification.type !== 'puu') {
            return false;
        }

        // The userHandle will be the name of the uploader in puu requests
        const previousNotificationHandle = previousNotification.userHandle;
        const currentNotificationHandle = currentNotification.userHandle;
        if (currentNotificationHandle !== previousNotificationHandle) {
            return false;
        }

        // Make sure that neither notification has been deleted
        const previousNotificationNode = this.ndm.getNode(previousNotification.data.h);
        const currentNotificationNode = this.ndm.getNode(currentNotification.data.h);
        if (!previousNotificationNode || !currentNotificationNode) {
            return false;
        }

        // Make sure that both notifications are going into the same folder
        if (previousNotificationNode.p !== currentNotificationNode.p) {
            return false;
        }

        if (previousNotification.seen !== currentNotification.seen) {
            return false;
        }

        // If there is a gap of over 5 minutes between notifications, do not combine them
        if (currentNotification.timestamp - previousNotification.timestamp > 300) {
            return false;
        }

        previousNotification.allDataItems.push(currentNotification.data.h);
        return true;
    },

    /**
     * For incoming action packets, this combines the current new notification with the previous one if it meets
     * certain criteria. To be combined:
     * - There must be a previous notification to actually combine with
     * - It must be a new folder/file added to a share
     * - The user must be the same (same user handle)
     * - The previous notification must be less than 5 minutes old, and
     * - The new notification must be added to the same folder as the previous one.
     * An example put node:
     * {"a":"put","n":"U8oHEL7Q","u":"555wupYjkMU","f":[{"h":"F5QQSDJR","t":0}]}
     * @param {Object} currentNotification The current notification object
     */
    combineNewNotificationWithPrevious: function(currentNotification) {

        'use strict';

        // If there are no previous notifications, nothing can be combined,
        // so add it to start of the list without modification and exit

        // Get the previous notification (list is already sorted by most recent at the top)
        var previousNotification = notify.notifications[0];

        if (!previousNotification) {
            notify.notifications.unshift(currentNotification);
            return false;
        }

        // if prev+curr notifications are not from the same type
        if (currentNotification.type !== previousNotification.type) {
            notify.notifications.unshift(currentNotification);
            return false;
        }

        // We only for now combine "put", "d" (del), and "puu" (file request upload)
        if (currentNotification.type !== 'put' && currentNotification.type !== 'd'
                && currentNotification.type !== 'puu') {
            notify.notifications.unshift(currentNotification);
            return false;
        }

        // If the current notification is not from the same user it cannot be combined
        // so add it to start of the list without modification and exit
        if (previousNotification.userHandle !== currentNotification.userHandle) {
            notify.notifications.unshift(currentNotification);
            return false;
        }

        // If time difference is older than 5 minutes it's a separate event and not worth combining,
        // so add it to start of the list without modification and exit
        if (previousNotification.timestamp - currentNotification.timestamp > 300) {
            notify.notifications.unshift(currentNotification);
            return false;
        }

        if (previousNotification.data.ver !== currentNotification.data.ver) {
            notify.notifications.unshift(currentNotification);
            return false;
        }

        // Get details about the current notification
        var currentNotificationParentHandle = currentNotification.data.n;
        var currentNotificationNodes = currentNotification.data.f;

        // Get details about the previous notification
        var previousNotificationParentHandle = previousNotification.data.n;
        var previousNotificationNodes = previousNotification.data.f;


        if (currentNotification.type === 'put') {
            // If parent folders are not the same, they cannot be combined, so
            // add it to start of the list without modification and exit
            if (currentNotificationParentHandle !== previousNotificationParentHandle) {
                notify.notifications.unshift(currentNotification);
                return false;
            }

            // Combine the folder/file nodes from the current notification to the previous one
            var combinedNotificationNodes = previousNotificationNodes.concat(currentNotificationNodes);

            // Replace the current notification's nodes with the combined nodes
            currentNotification.data.f = combinedNotificationNodes;

        }
        else if (currentNotification.type === 'puu') {
            if (previousNotificationParentHandle !== currentNotificationParentHandle){
                notify.notifications.unshift(currentNotification);
                return false;
            }
            if (previousNotification.data.pou !== currentNotification.data.pou) {
                notify.notifications.unshift(currentNotification);
                return false;
            }
            if (previousNotification.seen !== currentNotification.seen) {
                notify.notifications.unshift(currentNotification);
                return false;
            }
            const combinedNotificationNodes = previousNotification.allDataItems
                .concat(currentNotificationNodes.map((e) => e.h));
            currentNotification.data.f = combinedNotificationNodes;
            currentNotification.allDataItems = combinedNotificationNodes;
        }
        else { // it's 'd'

            if (!Array.isArray(previousNotificationParentHandle)) {
                previousNotificationParentHandle = [previousNotificationParentHandle];
            }

            var deletedCombinedNodes = previousNotificationParentHandle.concat(currentNotificationParentHandle);
            currentNotification.data.n = deletedCombinedNodes;
        }

        // Remove the previous notification and add the current notification with combined nodes from the previous
        notify.notifications.shift();
        notify.notifications.unshift(currentNotification);
    },

    /**
     * Counts the new notifications and shows the number of new notifications in a red circle
     */
    countAndShowNewNotifications: function() {

        var newNotifications = 0;

        // Loop through the notifications
        for (var i = 0; i < notify.notifications.length; i++) {

            // If it hasn't been seen yet increment the count
            if (notify.notifications[i].seen === false) {
                // Don't count chat notifications until chat has loaded and can verify them.
                if (notify.notifications[i].type === 'mcsmp') {
                    const { data } = notify.notifications[i];
                    if (megaChatIsReady) {
                        const res = notify.getScheduledNotifOrReject(data);
                        if (
                            res !== false
                            && (res === 0 || !(res.mode === ScheduleMetaChange.MODE.CREATED && data.ou === u_handle))
                        ) {
                            newNotifications++;
                        }
                    }
                }
                else if (notify.notifications[i].type === 'dynamic') {
                    // Do not count expired promotions, if they have an expiration date
                    if ((!notify.notifications[i].data.e || notify.notifications[i].data.e >= unixtime())
                        && notify.notifications[i].data.id > this.lastSeenDynamic) {
                        newNotifications++;
                    }
                }
                else {
                    newNotifications++;
                }
            }
        }

        if (newNotifications >= 1) {
            notify.$headerButton.addClass('decorated');
            $(document.body).trigger('onMegaNotification', newNotifications);
        }
        else {
            notify.$headerButton.removeClass('decorated');
            $(document.body).trigger('onMegaNotification', false);
        }
        this.newNotifications = newNotifications;

        // Update page title
        notify.updateNotificationIndicator();
    },

    /**
     * Marks all notifications so far as seen, this will hide the red circle
     * and also make sure on reload these notifications are not new anymore
     * If this is triggered by local, send `sla` request
     *
     * @param {Boolean} [remote] Optional. Show this function triggered by remote action packet.
     */
    markAllNotificationsAsSeen: function(remote) {

        'use strict';

        let newMaxDynamic = false;

        // Loop through the notifications and mark them as seen (read)
        for (var i = 0; i < notify.notifications.length; i++) {
            if (notify.notifications[i].type === 'dynamic') {
                const newId = notify.notifications[i].data.id;
                if (newId > this.lastSeenDynamic) {
                    newMaxDynamic = true;
                    this.lastSeenDynamic = newId;
                }
            }
            notify.notifications[i].seen = true;
        }
        if (newMaxDynamic) {
            mega.attr.set('lnotif', String(this.lastSeenDynamic), -2, true);
        }

        notify.$headerButton.removeClass('decorated');

        // Update page title
        this.newNotifications = 0;
        notify.updateNotificationIndicator();

        // Send 'set last acknowledged' API request to inform it which notifications have been seen
        // up to this point then they won't show these notifications as new next time they are fetched
        if (!remote) {
            api.screq('sla').catch(dump);
        }
    },

    /**
     * Open the notifications popup when clicking the notifications icon
     */
    initNotifyIconClickHandler: function() {

        // Add delegated event for when the notifications icon is clicked
        $('.top-head').off('click', '.top-icon.notification');
        $('.top-head').on('click', '.top-icon.notification', function() {

            // If the popup is already open, then close it
            if (!notify.$popup.hasClass('hidden')) {
                notify.closePopup();
            }
            else {
                // Otherwise open the popup
                notify.renderNotifications();
            }
        });
    },

    /**
     * Closes the popup. If the popup is currently open and a) the user clicks onto a new page within Mega or b) clicks
     * outside of the popup then this will mark the notifications as read. If the popup is not open, then functions
     * like $.hideTopMenu will try to hide any popups that may be open, but in this scenario we don't want to mark the
     * notifications as seen/read, we want the number of new notifications to remain in the red tooltip.
     */
    closePopup: function() {
        'use strict';
        if (notify.$popup !== null && this.$popup.closest('.js-dropdown-notification').hasClass('show')) {
            this.$popup.closest('.js-dropdown-notification').removeClass('show');
            if (mega.ui.header && typeof mega.ui.header.closeNotifMenu === 'function') {
                mega.ui.header.closeNotifMenu();
            }
            notify.markAllNotificationsAsSeen();
        }
        notify.dynamicNotifCountdown.removeDynamicNotifCountdown();
    },

    /**
     * Sort dynamic notifications to be at the top sorted by id, then other notifications by timestamp
     * @param {Object[]} notifications current list of notifications
     * @return {void}
     */
    sortNotificationsByMostRecent(notifications) {
        'use strict';

        notifications.sort((notificationA, notificationB) => {

            if (notificationA.type === 'dynamic' || notificationB.type === 'dynamic') {
                if (notificationB.type !== 'dynamic') {
                    return -1;
                }
                else if (notificationA.type !== 'dynamic') {
                    return 1;
                }

                if (notificationA.data.id > notificationB.data.id) {
                    return -1;
                }
                else if (notificationA.data.id < notificationB.data.id) {
                    return 1;
                }
                return 0;
            }
            else {
                if (notificationA.timestamp > notificationB.timestamp) {
                    return -1;
                }
                else if (notificationA.timestamp < notificationB.timestamp) {
                    return 1;
                }
                return 0;
            }
        });
    },

    /**
     * Populates the user emails into a list which can be looked up later for incoming
     * notifications where there is no known contact handle e.g. pending shares/contacts
     * @param {Array} pendingContactUsers An array of objects (with user handle and email) for the pending contacts
     */
    addUserEmails: function(pendingContactUsers) {
        'use strict';

        // Add the pending contact email addresses
        if (Array.isArray(pendingContactUsers)) {

            for (var i = pendingContactUsers.length; i--;) {

                var userHandle = pendingContactUsers[i].u;
                var userEmail = pendingContactUsers[i].m;

                notify.userEmails[userHandle] = userEmail;
            }
        }
    },

    /**
     * Retrieve the email associated to a user by his/their handle or from the optional notification data
     * @param {String} userHandle the user handle to fetch the email for
     * @param {Object} [data] Optional the notification data
     * @param {boolean} [skipFetch] Optional to not use this function to sync the user data
     * @returns {string|false} The email if found or false if fetching data (or skipped by skipFetch)
     */
    getUserEmailByTheirHandle: function(userHandle, data, skipFetch) {
        'use strict';
        if (typeof userHandle !== 'string' || userHandle.length !== 11) {
            return l[7381];
        }
        if (typeof this.userEmails[userHandle] === 'string' && this.userEmails[userHandle]) {
            // Previously found and not an empty string.
            return this.userEmails[userHandle];
        }
        const userEmail = M.getUserByHandle(userHandle).m;
        if (userEmail) {
            // Found in M.u
            return userEmail;
        }
        if (data && data.m) {
            // Found on notification data
            return data.m;
        }
        if (skipFetch || (this.userEmails[userHandle] instanceof Promise)) {
            return false;
        }
        // Fetch data from API
        this.userEmails[userHandle] = notify.addUsers([userHandle])
            .then(() => {
                this.userEmails[userHandle] = M.getUserByHandle(userHandle).m;
            });
        return false;
    },

    /**
     * Filter notifications by type
     * @returns {Object[]} filtered notifications
     */
    filterByType() {
        'use strict';

        if (!(this.filter && this.filter.filters.type.selection)) {
            return this.notifications;
        }

        const notifications = [];
        for (let i = 0; i < this.notifications.length; i++) {
            const notification = this.notifications[i];
            if (this.filter.filters.type.match(notification)) {
                notifications.push(notification);
            }
        }
        return notifications;
    },

    /**
     * Render empty notifications state
     * @returns {void}
     */
    renderEmpty() {
        'use strict';

        this.$popup.removeClass('loading').addClass('empty');
        const icon = this.$popup.find('.notification-popup-empty-icon');
        if (icon.length) {
            icon.css('backgroundImage', `url(${staticpath}images/mega/empty/no-notifications.webp)`);
        }
    },

    /**
     * Renders notifications after fetching related data if notifications are loaded
     * @returns {Promise<void>} void
     */
    async renderHydratedNotifications() {
        'use strict';

        if (!this.initialLoadComplete) {
            return;
        }

        return this.ndm.fetch().then(() => this.renderNotifications());
    },

    /**
     * To do: render the notifications in the popup
     */
    renderNotifications: function() {
        'use strict';

        const notifications = notify.filterByType();
        let allNotificationsHtml = '';

        notify.initSettingsClickHander();

        // If no notifications, show empty
        if (notify.initialLoadComplete && !notifications.length) {
            this.renderEmpty();
            return false;
        }
        else if (!notify.initialLoadComplete) {
            return false;
        }

        // Sort the notifications
        notify.sortNotificationsByMostRecent(notifications);

        // Keep number of notifications limited
        // Notifications from APs might result in more than allowed
        notifications.splice(notify.numOfNotifications);

        // Cache the template selector
        var $template = this.$popup.find('.notification-item.template');

        // Remove existing notifications and so they are re-rendered
        this.$popup.find('.notification-item:not(.template)').remove();

        notify.renderedPendingContacts.clear();

        // Loop through all the notifications
        for (var i = 0; i < notifications.length; i++) {

            // Get the notification data and clone the notification template in /html/top.html
            const notification = notifications[i];
            var $notificationHtml = $template.clone();

            // Update template
            $notificationHtml = notify.updateTemplate($notificationHtml, notification);

            // Skip this notification if it's not one that is recognised
            if (!$notificationHtml) {
                continue;
            }

            // Build the html
            allNotificationsHtml += $notificationHtml.prop('outerHTML');
        }

        // If all notifications are not recognised, show empty
        if (!allNotificationsHtml) {
            this.renderEmpty();
            return false;
        }

        // Update the list of notifications
        notify.$popup.find('.notification-scr-list').safeAppend(allNotificationsHtml);
        notify.$popup.removeClass('empty loading');

        // Add scrolling for the notifications
        Soon(() => {
            initPerfectScrollbar($('.notification-scroll', notify.$wrapper));
        });

        // Add click handlers for various notifications
        notify.initContactReqClickHandler();
        notify.initFullContactClickHandler();
        notify.initShareClickHandler();
        notify.initTakedownClickHandler();
        notify.initPaymentClickHandler();
        notify.initPaymentReminderClickHandler();
        notify.initContactReqClickHandlers();
        notify.initScheduledClickHandler();
        notify.initDynamicClickHandler();

        // Initialise countdown timer for dynamic notifications with expiry dates
        if (this.$popup.closest('.js-dropdown-notification').hasClass('show')) {
            notify.dynamicNotifCountdown.startTimer();
        }

        // Send event whenever a notification is clicked
        $('a.notification-item', this.$popup).rebind('click.logNotifEvent', () => eventlog(500461));
    },

    /**
     * On click of an incoming pending contact request, go to received requests page
     * @returns {void}
     */
    initContactReqClickHandler: () => {
        'use strict';

        notify.$popup.find('.notification-item.nt-contact-request,'
            + '.notification-item.nt-contact-request-reminder').rebind('click', () => {
            notify.closePopup();
            loadSubPage('/fm/chat/contacts/received');
        });
    },

    /**
     * On click of an accepted contact request, open the contact in contacts panel
     * @returns {void}
     */
    initFullContactClickHandler: () => {
        'use strict';

        notify.$popup.find('.notification-item.nt-contact-accepted').rebind('click', (e) => {
            const contactId = $(e.currentTarget).closest('.notification-item').attr('contact-id');
            notify.closePopup();

            if (M.c.contacts && contactId in M.c.contacts) {
                mega.ui.flyout.showContactFlyout(contactId);
            }
            else {
                msgDialog('info', '', l[20427]);
            }

            eventlog(500462);
        });
    },

    /**
     * On click of a share or new files/folders notification, go to that share
     */
    initShareClickHandler: function() {

        // Select the notifications with shares or new files/folders
        this.$popup.find('.notification-item.nt-incoming-share,'
            + '.notification-item.nt-new-files,'
            + '.notification-item.nt-updated-files').rebind('click', function() {

            // Get the folder ID from the HTML5 data attribute
            const $this = $(this);
            const folderId = $this.attr('data-folder-id');
            const notificationID = $this.attr('id');

            if (!folderId) {
                console.warn('Invalid node association...');
                return false;
            }

            // Mark all notifications as seen and close the popup
            // (because they clicked on a notification within the popup)
            notify.closePopup();

            // Open the folder
            M.openFolder(folderId)
                .then(() => {
                    const {allDataItems, data: {f}} = notify.notifications.find(elem => elem.id === notificationID);
                    const allAvailable = M.c[folderId] || M.v.reduce((acc, n) => {
                        acc[n.h] = 1;
                        return acc;
                    }, Object.create(null));
                    const toSelect = (allDataItems || f || [])
                        .reduce((set, n) => {
                            const h = n.h || n;
                            if (allAvailable[h]) {
                                set.add(h);
                            }
                            return set;
                        }, new Set());
                    M.addSelectedNodes([...toSelect], true);
                })
                .catch(dump);

            eventlog(500463);
        });
    },

    /**
     * On click of a takedown or restore notice, go to the parent folder
     */
    initTakedownClickHandler: function() {

        // Select the notifications with shares or new files/folders
        this.$popup.find('.nt-takedown-notification, .nt-takedown-reinstated-notification').rebind('click', function() {

            // Get the folder ID from the HTML5 data attribute
            const folderOrFileId = $(this).attr('data-folder-or-file-id');
            const parentFolderId = folderOrFileId ? (notify.ndm.getNode(folderOrFileId) || {}).p : false;

            // Mark all notifications as seen and close the popup
            // (because they clicked on a notification within the popup)
            notify.closePopup();

            // takedown notice notification: redirect to dispute URL
            if ($(this).hasClass('nt-takedown-notification')) {
                localStorage.removeItem('takedownDisputeNodeURL');
                const node = notify.ndm.getNode(folderOrFileId);
                if (M.getNodeShare(node).down) {
                    const disputeURL = mega.getPublicNodeExportLink(node);
                    if (disputeURL) {
                        localStorage.setItem('takedownDisputeNodeURL', disputeURL);
                    }
                }
                mega.redirect('mega.io', 'dispute', false, false, false);
            }

            if (parentFolderId) {
                M.openFolder(parentFolderId)
                    .then(() => {
                        M.addSelectedNodes(folderOrFileId, true);
                    })
                    .catch(dump)
                    .finally(() => {
                        reselect(true);
                    });
            }

            eventlog(500464);
        });
    },

    /**
     * If they click on a payment failed notification, then redirect them to the Account History page
     */
    initPaymentClickHandler: function() {
        this.$popup.find('.notification-item.nt-payment-failed-notification').rebind('click', () => {
            notify.closePopup();
            loadSubPage('pro');
            eventlog(500465);
        });
    },

    /**
     * If they click on a payment reminder high (priority) notification (expired today)
     * then redirect them to the Pro page
     */
    initPaymentReminderClickHandler: function() {
        this.$popup.find('.notification-item.nt-payment-reminder-high-notification').rebind('click', () => {
            notify.closePopup();
            loadSubPage('pro');
            eventlog(500466);
        });
    },

    /**
     * Set click handlers for accept and decline contact request buttons
     */
    initContactReqClickHandlers: () => {
        'use strict';

        $('.notifications-button.accept-contact-request', this.$popup).rebind('click.acceptContactRequest', (e) => {
            const contactId = $(e.currentTarget).closest('.notification-item').attr('contact-id');
            M.acceptPendingContactRequest(contactId).catch(dump);
            notify.closePopup();
            eventlog(500467);
            return false;
        });

        $('.notifications-button.decline-contact-request', this.$popup).rebind('click.declineContactRequest', (e) => {
            const contactId = $(e.currentTarget).closest('.notification-item').attr('contact-id');
            M.denyPendingContactRequest(contactId).catch(dump);
            notify.closePopup();
            // TODO event log?
            return false;
        });
    },

    /**
     * Load the notification settings page
     * @return {undefined}
     */
    initSettingsClickHander: function() {
        'use strict';
        $('.notification-settings', this.$popup).rebind('click.notifications', () => {
            notify.closePopup();
            loadSubPage('fm/account/notifications');
        });
    },

    initScheduledClickHandler: () => {
        'use strict';
        $('.nt-schedule-meet-created,'
            + '.nt-schedule-meet-edited,'
            + '.nt-schedule-meet-cancelled', this.$popup).rebind('click.notifications', e => {
            const chatId = $(e.currentTarget).attr('data-chatid');
            if (chatId) {
                notify.closePopup();
                loadSubPage(`fm/chat/${chatId}`);
                if ($(e.currentTarget).attr('data-desc') === '1') {
                    delay(`showSchedDescDialog-${chatId}`, () => {
                        megaChat.chats[chatId].trigger('openDescriptionDialog');
                    }, 1500);
                }

                eventlog(500468);
            }
        });
    },

    initDynamicClickHandler: () => {
        'use strict';

        $('.nt-dynamic-notification', this.$popup).rebind('click.dynamicNotification', e => {
            const dynamicId = $(e.currentTarget).attr('data-dynamic-id');
            const {cta1, cta2, e: expTime} = notify.dynamicNotifs[dynamicId] || {};

            if (expTime !== undefined && expTime - unixtime() <= 0) {
                return false;
            }

            const ctaButton = cta1 || cta2;
            const link = ctaButton && ctaButton.link;

            if (link) {
                notify.closePopup();
                window.open(link, '_blank', 'noopener,noreferrer');
                eventlog(500242, dynamicId | 0);
            }
        });
    },

    /**
     * Formats notification date
     * @param {Number} ts timestamp
     * @returns {String} formatted notification date
     */
    formatNotificationDate(ts) {
        'use strict';

        if (!ts) {
            return;
        }

        const toDayNum = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000;
        const diff = toDayNum(new Date()) - toDayNum(new Date(ts * 1000));

        if (diff < 2) {
            return mega.icu.format(
                diff ? l.notif_date_yesterday : l.notif_date_today,
                new Date(ts * 1000).getHours())
                .replace('%1', time2date(ts, 21));
        }
        return time2date(ts, 8);
    },

    /**
     * Main function to update each notification with relevant style and details
     * @param {Object} $notificationHtml The jQuery clone of the HTML notification template
     * @param {Object} notification The notification object
     * @returns {Object|false} The HTML to be rendered for the notification
     */
    updateTemplate: function($notificationHtml, notification)
    {
        // Remove the template class
        $notificationHtml.removeClass('template');

        const date = this.formatNotificationDate(notification.timestamp);
        var data = notification.data;
        var userHandle = notification.userHandle;
        var userEmail = l[7381];    // Unknown
        var avatar = '';

        // Notifications having a custom avatar instead of the regular user one
        const customIconNotifications = [
            'psts', 'pses', 'ph', 'puu', 'dynamic', 'psts_v2', 'share', 'd', 'put', 'dynamic'];

        // If a contact action packet
        if (typeof userHandle !== 'string') {
            if (Array.isArray(userHandle)) {
                userHandle = userHandle[0] || false;
            }
            if (typeof userHandle !== 'object' && data) {
                userHandle = Array.isArray(data.u) && data.u[0] || data;
            }
            userEmail = userHandle.m || userEmail;
            userHandle = userHandle.u || userHandle.ou;
        }

        // Use the email address in the notification/action packet if the contact doesn't exist locally
        // or if it was populated partially locally (i.e from chat, without email)
        // or if the notification is closed account notification, M.u cannot be exist, so just using attached email.
        if (userEmail === l[7381]) {
            let email = data && data.m;
            if (userHandle) {
                email = this.getUserEmailByTheirHandle(userHandle, data);
                if (!email) {
                    return false; // Fetching user attributes...
                }
            }
            userEmail = email || userEmail;
        }

        // If the notification is not one of the custom ones, generate an avatar from the user information
        if (customIconNotifications.indexOf(notification.type) === -1) {

            // Generate avatar from the user email
            avatar = useravatar.contact(userEmail);

            // Add the avatar HTML and show it
            $('.notification-avatar-user', $notificationHtml).removeClass('hidden').safePrepend(avatar);
        }
        else {
            // Hide the notification avatar code, the specific notification will render the icon
            $('.notification-avatar-custom', $notificationHtml).removeClass('hidden');
        }

        // Update common template variables
        $notificationHtml.attr('id', notification.id);
        $('.notification-date', $notificationHtml).text(date);

        let displayName = '';
        let tooltip;
        if (userEmail && userEmail !== l[7381]) {
            displayName = M.getNameByEmail(userEmail);
            if (displayName !== userEmail) {
                tooltip = userEmail;
            }
            this.renderNotificationTitle($notificationHtml, displayName, tooltip);
        }

        // Add read status
        if (notification.seen) {
            $notificationHtml.addClass('read');
        }

        // Populate other information based on each type of notification
        switch (notification.type) {
            case 'ipc':
                return notify.renderIncomingPendingContact($notificationHtml, notification);
            case 'c':
                return notify.renderContactChange($notificationHtml, notification);
            case 'upci':
            case 'upco':
                return notify.renderUpdatedPendingContact($notificationHtml, notification);
            case 'share':
                return notify.renderNewShare($notificationHtml, notification, displayName, tooltip);
            case 'd':
                return notify.renderRemovedSharedNode($notificationHtml, notification);
            case 'dshare':
                return notify.renderDeletedShare($notificationHtml, notification, displayName);
            case 'put':
                return notify.renderNewSharedNodes($notificationHtml, notification, displayName, tooltip);
            case 'psts':
            case 'psts_v2':
                return notify.renderPayment($notificationHtml, notification);
            case 'pses':
                return notify.renderPaymentReminder($notificationHtml, notification);
            case 'ph':
                return notify.renderTakedown($notificationHtml, notification);
            case 'dynamic':
                return notify.renderDynamic($notificationHtml, notification);
            case 'mcsmp': {
                if (!window.megaChat || !window.megaChat.is_initialized) {
                    return false;
                }
                return notify.renderScheduled($notificationHtml, notification);
            }
            case 'puu':
                return notify.renderFileRequestUpload($notificationHtml, notification, displayName);
            default:
                return false;   // If it's a notification type we do not recognise yet
        }
    },

    /**
     * Render notification title adding tooltip in case provided or removing otherwise
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {String} title Main title text
     * @param {String} tooltip Tooltip (optional) to be shown over title
     * @returns {void}
     */
    renderNotificationTitle($notificationHtml, title, tooltip) {
        'use strict';

        if (!title) {
            return;
        }

        const $title = $('.notification-title', $notificationHtml);
        $title.safeHTML(megaChat.html(title));

        if (tooltip) {
            $title.addClass('simpletip')
                .attr('data-simpletip', tooltip)
                .attr('data-simpletip-class', 'notify-tooltip')
                .attr('data-simpletipposition', 'top');
        }
        else {
            $title.removeClass('simpletip')
                .removeAttr('data-simpletip')
                .removeAttr('data-simpletipposition');
        }
    },

    /**
     * Render pending contact requests in case:
     * - not duplicate
     * - pending or from already added contacts
     * Otherwise render is skipped
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification Notification data
     * @returns {Object|false} The HTML to be rendered for the notification
     */
    renderIncomingPendingContact($notificationHtml, notification) {
        'use strict';

        let info;
        let className;

        const {p: contactId, m: contactEmail, dts, rts} = notification.data;

        if (dts || this.renderedPendingContacts.has(contactEmail)) {
            return false;
        }

        const isPending = M.ipc[contactId];
        const isContact = M.u.some(u => u.c === 1 && u.m === contactEmail);

        // skip notifications already managed from non-contacts
        if (!(isPending || isContact)) {
            return false;
        }

        this.renderedPendingContacts.add(contactEmail);

        if (isContact) {
            className = 'nt-contact-accepted';
            info = l.notification_contact_accepted;
        }
        else if (rts) {
            className = 'nt-contact-request-reminder';
            info = l[7150].replace('[B]', '<b>').replace('[/B]', '</b>');
        }
        else {
            className = 'nt-contact-request';
            info = l[5851];
        }

        $notificationHtml.addClass(className);
        $('.notification-info', $notificationHtml).safeHTML(info);

        if (isContact) {
            const user = M.getUserByEmail(contactEmail);
            if (user) {
                $notificationHtml.addClass('clickable').attr('contact-id', user.h);
            }
        }
        else {
            const $buttons = $('.notification-request-buttons', $notificationHtml).removeClass('hidden');
            const $bDecline = $('button.outline', $buttons)
                .addClass('decline-contact-request').removeClass('hidden');
            $('span', $bDecline).text(l.decline);

            const $bAccept = $('button.primary', $buttons)
                .addClass('accept-contact-request').removeClass('hidden');
            $('span', $bAccept).text(l[5856]);

            $notificationHtml.addClass('clickable').attr('contact-id', contactId);
        }

        return $notificationHtml;
    },

    /**
     * Renders notifications related to contact request acepted
     * Otherwise (user deleted or account disabled) render is skipped
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification Notification data
     * @returns {Object|false} The HTML to be rendered for the notification
     */
    renderContactChange($notificationHtml, notification) {
        'use strict';

        const action = notification.data.c || notification.data.u[0].c;

        // user deleted as contact or account deleted / deactivated or invalid notification
        if (action !== 1) {
            return false;
        }

        const userHandle = Array.isArray(notification.userHandle)
            ? notification.data.ou || notification.userHandle[0].u
            : notification.userHandle;

        // contact request accepted (action === 1)
        const title = u_attr.b && !u_attr.b.m && u_attr.b.mu && u_attr.b.mu[0] === userHandle
            ? l.admin_sub_contacts
            : l.notification_contact_accepted;

        $notificationHtml.addClass('nt-contact-accepted clickable').attr('contact-id', userHandle);
        $('.notification-info', $notificationHtml).text(title);

        return $notificationHtml;
    },

    /**
     * Render accepted updated pending contact notifications
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification
     * @returns {Object} The HTML to be rendered for the notification
     */
    renderUpdatedPendingContact($notificationHtml, notification) {
        'use strict';

        const action = notification.data.s || notification.data.u[0].s;

        // contact request rejected or invalid notification
        if (action !== 2) {
            return false;
        }

        const userHandle = Array.isArray(notification.userHandle)
            ? notification.data.ou || notification.userHandle[0].u
            : notification.userHandle;

        // contact request accepted (action === 2)
        $notificationHtml.addClass('nt-contact-accepted clickable').attr('contact-id', userHandle);
        $('.notification-info', $notificationHtml).text(l.notification_contact_accepted);

        return $notificationHtml;
    },

    /**
     * Render new shared folder notification
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification Notification data
     * @param {String} displayName The user display name
     * @param {String} tooltip The tooltip for default title
     * @returns {Object|false} The HTML to be rendered for the notification
     */
    renderNewShare($notificationHtml, notification, displayName, tooltip) {
        'use strict';

        let isDefaults = true;
        const handle = notification.data.n;

        $notificationHtml.addClass('nt-incoming-share');

        const notifIcon = '<i class="item-type-icon icon-folder-users-24"></i>';
        $('.notification-avatar-custom', $notificationHtml).safeHTML(notifIcon);

        if (M.c.shares[handle]) {
            const node = this.ndm.getNode(handle);
            if (node && node.name) {
                isDefaults = false;
                this.renderNotificationTitle($notificationHtml, this.shortenNodeName(node.name));
                const info = displayName ? l[824].replace('[X]', displayName) : l[825];
                $('.notification-info', $notificationHtml).text(info);
            }

            $notificationHtml.addClass('clickable').attr('data-folder-id', handle);
        }

        if (isDefaults) {
            const title = displayName
                ? l[824].replace('[X]', displayName)
                : l[825];
            this.renderNotificationTitle($notificationHtml, title, tooltip);
        }

        return $notificationHtml;
    },

    /**
     * Render removed node(s) from a shared folder notification
     * shared folder node is never available
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification Notification data
     * @returns {Object} The HTML to be rendered for the notification
     */
    renderRemovedSharedNode($notificationHtml, notification) {
        'use strict';

        const items = Array.isArray(notification.data.n) ? notification.data.n : [notification.data.n];

        $notificationHtml.addClass('nt-removed-items');

        const notifIcon = '<i class="item-type-icon icon-folder-users-24"></i>';
        $('.notification-avatar-custom', $notificationHtml).safeHTML(notifIcon);

        const info = mega.icu.format(l[8913], items.length);
        $('.notification-info', $notificationHtml).text(info);

        return $notificationHtml;
    },

    /**
     * Render removed shared folder notification
     * sharee (receiver) notification: "owner removed access to shared folder"
     *   - always render, shared folder node never in (in)shares, it was removed
     * sharer (owner) notification: "sharee left shared folder"
     *   - render notification if shared folder node in (out)shares and available
     *   - otherwise render is skipped
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification Notification data
     * @param {String} displayName The user display name
     * @returns {Object|false} The HTML to be rendered for the notification
     */
    renderDeletedShare($notificationHtml, notification, displayName) {
        'use strict';

        let info;
        let notificationOwner;
        let notificationOrginating;

        const handle = notification.data.n;

        // first we are parsing an action packet.
        if (notification.data.orig) {
            notificationOwner = notification.data.u;
            notificationOrginating = notification.data.orig;
        }
        else {
            // otherwise we are parsing 'c' api response (initial notifications request)
            notificationOwner = notification.data.o;
            notificationOrginating = notification.data.u;
            if (notificationOwner === u_handle) {
                if (notificationOrginating === u_handle) {
                    console.error('receiving a wrong notification, this notification shouldnt be sent to me',
                        notification
                    );
                }
            }

            // if we are dealing with old notification which doesnt support the new data
            if (!notificationOwner || notificationOwner === -1) {
                // fall back to the old not correct notification
                notificationOwner = notificationOrginating;
            }
            // receiving old action packet
            // .rece without .orig
            if (notification.data.rece) {
                notificationOwner = notificationOrginating;
            }
        }

        let className;
        if (notificationOrginating === notificationOwner) {
            // notification for sharee (receiver)
            // shared node is not available anymore
            const node = this.ndm.getNode(handle);
            if (node) {
                this.renderNotificationTitle($notificationHtml, this.shortenNodeName(node.name));
                info = l.shared_folder_removed.replace('%1', displayName);
            }
            else {
                info = l[7879];
            }

            className = 'nt-incoming-removed';
            $('.notification-avatar-user', $notificationHtml).addClass('hidden');

            const notifIcon = '<i class="item-type-icon icon-folder-users-24"></i>';
            $('.notification-avatar-custom', $notificationHtml).removeClass('hidden').safeHTML(notifIcon);
        }
        else {
            // notification for sharer (owner)
            const node = this.ndm.getNode(handle);

            // when last sharee leaves a shared folder, the related node will not be in (out)shares anymore
            // however notification "sharee left shared folder" must be shown to the owner
            // if related node exists
            if (!(M.isOutShare(handle) || node)) {
                return false;
            }

            className = 'nt-incoming-left';
            info = node && node.name
                ? l.shared_folder_left.replace('%1', this.shortenNodeName(node.name))
                : l.shared_folder_left_nameless;
        }

        $notificationHtml.addClass(className);
        $('.notification-info', $notificationHtml).text(info);

        return $notificationHtml;
    },

    /**
     * Builds configuration for new shared nodes added notification
     * @param {Object} notification Notification data
     * @returns {Object} Configuration
     */
    buildSharedNodesConfig(notification) {
        'use strict';

        let numFiles = 0;
        let numFolders = 0;
        const nodes = notification.data.f;

        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].t) {
                numFolders++;
            }
            else {
                numFiles++;
            }
        }

        let isUpdate = false;
        let label;
        let numItems;

        // files updated
        if (notification.data.ver && numFolders === 0 && numFiles > 0) {
            isUpdate = true;
            label = l.file_count;
            numItems = numFiles;
        }
        // items (files and folders) added
        else if (numFolders >= 1 && numFiles >= 1) {
            label = l.items_count;
            numItems = numFolders + numFiles;
        }
        // folders added
        else if (numFolders > 0) {
            label = l.folder_count;
            numItems = numFolders;
        }
        // files added
        else if (numFiles > 0) {
            label = l.file_count;
            numItems = numFiles;
        }

        return {isUpdate, label, numItems};
    },

    /**
     * Render new node(s) added to a shared folder notification
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification Notification data
     * @param {String} displayName The user display name
     * @param {String} tooltip The tooltip for default title
     * @returns {Object|false} The HTML to be rendered for the notification
     */
    renderNewSharedNodes($notificationHtml, notification, displayName, tooltip) {
        'use strict';

        let isDefaults = true;
        const handle = notification.data.n;

        const notifIcon = '<i class="item-type-icon icon-folder-users-24"></i>';
        $('.notification-avatar-custom', $notificationHtml).safeHTML(notifIcon);

        const share = this.ndm.getShare(handle);

        if (share || M.isOutShare(handle)) {
            const sharedFolder = this.ndm.getNode(share || handle);

            if (sharedFolder && sharedFolder.name) {
                isDefaults = false;
                this.renderNotificationTitle($notificationHtml, this.shortenNodeName(sharedFolder.name));

                // TODO cambiar buildSharedNodesConfig por renderNewSharedNodesInfo y meter lo de abajo
                const {isUpdate, label, numItems} = this.buildSharedNodesConfig(notification);

                const infoLabel = isUpdate ? l.shared_nodes_updated : l.shared_nodes_added;
                const info = infoLabel
                    .replace('%1', displayName || l.notif_no_username)
                    .replace('%2', mega.icu.format(label, numItems));
                $('.notification-info', $notificationHtml).text(info);

                $notificationHtml.addClass(isUpdate ? 'nt-updated-files' : 'nt-new-files');
            }

            $notificationHtml.addClass('clickable').attr('data-folder-id', handle);
        }

        if (isDefaults) {
            $notificationHtml.addClass('nt-new-files');
            const title = displayName
                ? l.notif_new_items_shared_folder.replace('%1', displayName)
                : l.notif_new_items_shared_folder_no_username;
            this.renderNotificationTitle($notificationHtml, title, tooltip);
        }

        return $notificationHtml;
    },

    /**
     * Render payment notification (sucess and failed) for past notifications
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification Notification data
     * @returns {Object|false} The HTML to be rendered for the notification
     */
    renderPayment($notificationHtml, notification) {
        'use strict';

        // If user has not seen the welcome dialog before, show it and set ^!welDlg to 2 (seen)
        if (!notification.seen && !(u_attr.pf || u_attr.b) && !pro.propay.onPropayPage()) {
            mega.attr.get(u_handle, 'welDlg', -2, 1, (res) => {
                if ((res | 0) === 1 && !notify.welcomeDialogShown) {
                    notify.createNewUserDialog(notification);
                    notify.welcomeDialogShown = true;
                    mega.attr.set('welDlg', 2, -2, true);
                }
            }).catch(dump);
        }

        let title;
        let className;

        // success payment
        if (notification.data.r === 's') {
            className = 'nt-payment-success-notification';
            title = l[7142];
        }
        // failed payment
        else {
            className = 'nt-payment-failed-notification clickable';
            title = l[7141];

            const $buttons = $('.notification-request-buttons', $notificationHtml).removeClass('hidden');
            const $bReactivate = $('button.primary', $buttons)
                .addClass('reactivate-subscription').removeClass('hidden');
            $('span', $bReactivate).text(l.reactivate_subscription);
        }

        const notifIcon = '<i class="sprite-fm-uni icon-mega-logo"></i>';
        $('.notification-avatar-custom', $notificationHtml).safeHTML(notifIcon);

        $notificationHtml.addClass(className);
        this.renderNotificationTitle($notificationHtml, title);

        return $notificationHtml;
    },

    createNewUserDialog: tryCatch(() => {
        'use strict';

        const $dialog = $('.mega-dialog-container .upgrade-welcome-dialog');

        M.accountData((account) => {

            account.purchases.sort((a, b) => {
                if (a[1] < b[1]) {
                    return 1;
                }
                return -1;
            });

            let purchaseEndTime;
            const getPlansEndingAfterPurchase = () => {
                let plansEndingAfterSubscription = 0;
                account.purchases.forEach(purchase => {
                    const days = purchase[6] === 1
                        ? 32
                        : purchase[6] === 12
                            ? 367
                            : purchase[6] * 31;
                    const purchaseEnd = days * 86400 + purchase[1];

                    if (((Date.now() / 1000) < purchaseEnd) && ((u_attr.p % 4) <= purchase[5])) {
                        purchaseEndTime = purchaseEnd;
                        plansEndingAfterSubscription++;
                    }
                });
                return plansEndingAfterSubscription;
            };

            const newPlanLevel = account.purchases[0][5];

            // If a user is currently on a higher tier plan than their new plan, inform them that the new plan
            // will be active after their current plan expires
            if (newPlanLevel !== u_attr.p) {
                // No need to show any dialog when a user purchases a feature
                if (newPlanLevel === pro.ACCOUNT_LEVEL_FEATURE) {
                    return;
                }

                const newPlan = pro.getProPlanName(newPlanLevel);
                const currentPlan = pro.getProPlanName(u_attr.p);

                let bodyText = l.welcome_dialog_active_check;
                if (getPlansEndingAfterPurchase() < 2) {
                    bodyText = l.welcome_dialog_active_until;

                    if (!purchaseEndTime) {
                        console.assert(account.stype === 'S' || !account.srenew);

                        if (account.srenew) {
                            purchaseEndTime = account.srenew[0];
                        }
                        else {
                            const data = pro.proplan.planData;
                            if (data) {
                                purchaseEndTime = data.nextplan ? data.nextplan.t : data.suntil;
                            }
                        }
                    }
                    purchaseEndTime = purchaseEndTime && time2date(purchaseEndTime, 1);

                    console.assert(purchaseEndTime);
                    bodyText = bodyText.replace('%3', purchaseEndTime || '');
                }

                msgDialog('warninga', '',
                          l.welcome_dialog_thanks_for_sub.replace('%1', newPlan),
                          bodyText
                              .replace('%1', currentPlan)
                              .replace('%2', newPlan));
                return;
            }

            pro.loadMembershipPlans(() => {

                const plan = pro.getPlanObj(newPlanLevel, 1);

                if (!plan) {
                    return;
                }

                $('header', $dialog).text(l.welcome_dialog_header.replace('%1', plan.name));
                $('.thanks-text', $dialog).text(l.pro_welcome_dialog_quota_brief
                    .replace('%1', bytesToSize(plan.storage, 3, 4))
                    .replace('%2', bytesToSize(plan.transfer * account.purchases[0][6], 3, 4)));
                $('button', $dialog).rebind('click', () => {
                    closeDialog();
                });
                M.safeShowDialog('upgrade-welcome-dialog', $dialog);
            });
        });
    }),

    /**
     * Render payment reminder notification for past notifications based on notification timestamp
     * Otherwise (future notifications) render is skipped
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification Notification data
     * @returns {Object|false} The HTML to be rendered for the notification
     */
    renderPaymentReminder($notificationHtml, notification) {
        'use strict';

        const secondsDifference = (notification.data.ts || 0) - unixtime();
        if (secondsDifference <= 0) {
            return false;
        }

        const notifIcon = '<i class="sprite-fm-uni icon-mega-logo"></i>';
        $('.notification-avatar-custom', $notificationHtml).safeHTML(notifIcon);

        let cssClass;
        const days = Math.floor(secondsDifference / 86400);

        if (!days) {
            cssClass = 'nt-payment-reminder-high-notification clickable';
            const $buttons = $('.notification-request-buttons', $notificationHtml).removeClass('hidden');
            const $bRenew = $('button.primary', $buttons)
                .addClass('renew-subscription').removeClass('hidden');
            $('span', $bRenew).text(l.renew_subscription);
        }
        else if (days > 14) {
            cssClass = 'nt-payment-reminder-medium-notification';
        }
        else {
            cssClass = 'nt-payment-reminder-low-notification';
        }

        $notificationHtml.addClass(cssClass);

        this.renderNotificationTitle($notificationHtml, days ? mega.icu.format(l[8597], days) : l[25041]);

        return $notificationHtml;
    },

    /**
     * Render takedown notifications (disabled / reinstated)
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification Notification data
     * @returns {Object|false} The HTML to be rendered for the notification
     */
    renderTakedown($notificationHtml, notification) {
        'use strict';

        let title;
        let cssClass;
        let info;
        let icon;
        let isClickable = true;

        const handle = notification.data.h;
        const node = this.ndm.getNode(handle);
        const nodeName = node && node.name ? this.shortenNodeName(node.name) : false;

        // Takedown notice (disabled)
        if (notification.data.down === 1) {
            cssClass = 'nt-takedown-notification';
            icon = 'icon-notif-takedown';

            if (nodeName) {
                title = node.t ? l.folder_disabled : l.file_disabled;
                info = (node.t
                    ? l.publicly_shared_folder_taken_down
                    : l.publicly_shared_file_taken_down).replace('%1', nodeName);
            }
            else {
                title = l.item_disabled;
                info = l.publicly_shared_item_taken_down;
            }
        }
        // Takedown reinstated
        else if (notification.data.down === 0) {
            cssClass = 'nt-takedown-reinstated-notification';
            icon = 'icon-notif-reinstate';

            if (nodeName) {
                title = node.t ? l.folder_reinstated : l.file_reinstated;
                info = (node.t
                    ? l.taken_down_folder_reinstated
                    : l.taken_down_file_reinstated).replace('%1', nodeName);
            }
            else {
                isClickable = false;
                title = l.item_reinstated;
            }
        }
        else {
            return false;
        }

        if (info) {
            info = info.replace('[B]', '<b>').replace('[/B]', '</b>');
            $('.notification-info', $notificationHtml).safeHTML(info);
        }

        $notificationHtml.addClass(cssClass);
        if (isClickable) {
            $notificationHtml.addClass('clickable').attr('data-folder-or-file-id', handle);
        }

        $('.notification-avatar-icon', $notificationHtml).addClass('hidden');

        const notifIcon = `<i class="sprite-fm-uni ${icon}"></i>`;
        $('.notification-avatar-custom', $notificationHtml).safeHTML(notifIcon);

        this.renderNotificationTitle($notificationHtml, title);

        return $notificationHtml;
    },

    getScheduledNotifOrReject(data) {
        'use strict';

        const chatRoom = megaChat.chats[data.cid];
        if (!chatRoom) {
            return false;
        }

        if (data && data.cs && Array.isArray(data.cs.c) && $.len(data.cs) === 1 && data.cs.c[1] === 0) {
            // Only change we see is that the meeting is no longer cancelled so ignore it.
            return false;
        }
        const meta = megaChat.plugins.meetingsManager.getFormattingMeta(data.id, data, chatRoom);
        if (meta.ap || meta.gone) {
            // If the ap flag is set the occurrence state is not known.
            // A future render should be able to get past this step when all occurrences are known
            // If the gone flag is set then the occurrence no longer exists so skip it.
            return meta.gone ? false : 0;
        }

        const { MODE } = ScheduleMetaChange;

        if (meta.occurrence && meta.mode === MODE.CANCELLED && !$.len(meta.timeRules)) {
            const meeting = megaChat.plugins.meetingsManager.getMeetingOrOccurrenceParent(meta.handle);
            if (!meeting) {
                return false;
            }
            const occurrences = meeting.getOccurrencesById(meta.handle);
            if (!occurrences) {
                return false;
            }
            meta.timeRules.startTime = Math.floor(occurrences[0].start / 1000);
            meta.timeRules.endTime = Math.floor(occurrences[0].end / 1000);
        }

        return meta;
    },

    /**
     * Render meeting notification if meeting exists
     * Otherwise render is skipped
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification Notification data
     * @returns {Object|false} The HTML to be rendered for the notification
     */
    renderScheduled($notificationHtml, notification) {
        'use strict';

        let className;
        const { data } = notification;

        const meta = this.getScheduledNotifOrReject(data);
        if (!meta) {
            return false;
        }

        const chatRoom = megaChat.chats[data.cid];
        let now;
        let prev;
        const { MODE } = ScheduleMetaChange;
        if (meta.mode === MODE.CREATED && data.ou === u_handle) {
            return false;
        }

        if (meta.timeRules.startTime && meta.timeRules.endTime) {
            const prevMode = meta.mode;
            if (!meta.recurring && prevMode !== MODE.CANCELLED) {
                // Fake the mode for one-off meetings to get the correct time string.
                meta.mode = MODE.EDITED;
            }
            [now, prev] = megaChat.plugins.meetingsManager.getOccurrenceStrings(meta);
            meta.mode = prevMode;
        }

        const $notifBody = $('.notification-scheduled-body', $notificationHtml);
        const $notifLabel = $('.notification-content .notification-info', $notificationHtml).eq(0);

        const { NOTIF_TITLES } = megaChat.plugins.meetingsManager;

        const titleSelect = (core) => {
            let title;
            const occurrenceKey = meta.occurrence ? 'occur' : 'all';
            if (meta.mode === MODE.CREATED) {
                title = core.inv.replace('%1', chatRoom.topic);
            }
            else if (meta.mode === MODE.EDITED) {
                let diffCounter = 0;
                if (
                    meta.prevTiming
                    && (
                        meta.timeRules.startTime !== meta.prevTiming.startTime
                        || meta.timeRules.endTime !== meta.prevTiming.endTime
                        || (
                            meta.recurring
                            && !megaChat.plugins.meetingsManager.areMetaObjectsSame(meta.timeRules, meta.prevTiming)
                        )
                    )
                    || (meta.occurrence && meta.mode !== MODE.CANCELLED)
                ) {
                    title = core.time[occurrenceKey].replace('%1', chatRoom.topic);
                    diffCounter++;
                }
                if (meta.topicChange) {
                    title = core.name.update.replace('%1', meta.oldTopic).replace('%2', meta.topic);
                    diffCounter++;
                }
                if (meta.description) {
                    title = core.desc.update.replace('%1', chatRoom.topic);
                    diffCounter++;
                    $notificationHtml.attr('data-desc', diffCounter);
                }
                if (meta.converted) {
                    title = core.convert.replace('%1', chatRoom.topic);
                }
                else if (diffCounter > 1) {
                    title = core.multi.replace('%1', chatRoom.topic);
                    now = false;
                    prev = false;
                }
            }
            else {
                title = core.cancel[occurrenceKey].replace('%1', chatRoom.topic);
            }
            return megaChat.html(title).replaceAll('[B]', '<b>').replaceAll('[/B]', '</b>');
        };

        if (meta.mode === MODE.CREATED) {
            className = 'nt-schedule-meet-created';
        }
        else if (meta.mode === MODE.EDITED) {
            className = 'nt-schedule-meet-edited';
        }
        else {
            className = 'nt-schedule-meet-cancelled';
        }

        const html = titleSelect(meta.recurring ? NOTIF_TITLES.recur : NOTIF_TITLES.once);
        $notifLabel.safeHTML(html);

        if (now) {
            $notifBody.removeClass('hidden');
            $('.notification-scheduled-occurrence', $notifBody).removeClass('hidden').text(now);
        }
        $notificationHtml.addClass(`${className} clickable`).attr('data-chatid', chatRoom.chatId);
        return $notificationHtml;
    },

    /**
     * Render new node(s) added to a file request folder notification
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification Notification data
     * @param {String} displayName The user display name
     * @returns {Object|false} The HTML to be rendered for the notification
     */
    renderFileRequestUpload($notificationHtml, notification, displayName) {
        'use strict';

        const handle = notification.data.h || notification.allDataItems[0];
        const node = this.ndm.getNode(handle);
        const folderNode = node ? this.ndm.getNode(node.p || notification.data.n) : false;

        if (folderNode) {
            $notificationHtml.addClass('clickable').attr('data-folder-id', folderNode.h);
            if (folderNode.name) {
                this.renderNotificationTitle($notificationHtml, this.shortenNodeName(folderNode.name));
            }

            const numFiles = notification.allDataItems.length;
            const info = displayName
                ? mega.icu.format(l.file_request_notification, numFiles).replace('%1', displayName)
                : mega.icu.format(l.file_request_notification_nameless, numFiles);
            $('.notification-info', $notificationHtml).text(info);
        }
        else {
            this.renderNotificationTitle($notificationHtml, l.notif_new_files_file_req);
        }

        $notificationHtml.addClass('nt-new-files nt-file-request');

        const notifIcon = '<i class="item-type-icon icon-folder-public-24"></i>';
        $('.notification-avatar-custom', $notificationHtml).safeHTML(notifIcon);

        return $notificationHtml;
    },

    // This object handles the countdown timer for dynamic notifications with < 1h remaining.
    // There will likely only ever be one, however it is possible to have
    // any number of active notifications requiring a countdown.
    dynamicNotifCountdown: {

        countDownNotifs: {},
        keys: [],

        addNotifToCounter(id, expiry) {
            'use strict';
            this.countDownNotifs[id] = {
                $expText: undefined,
                expiry,
            };
        },

        removeNotifFromCounter(id) {
            'use strict';
            delete this.countDownNotifs[id];
            this.keys = Object.keys(this.countDownNotifs);
            if (!this.keys.length) {
                this.removeDynamicNotifCountdown();
            }
        },

        disableClick(id) {
            'use strict';
            const $notification = $(`#dynamic-notif-${id}`, notify.$popup).off('click.notifications');
            $('button', $notification).addClass('disabled');
        },

        // Re-check the current items in the countdown timer, and make sure that it is running
        startTimer() {
            'use strict';

            this.keys = Object.keys(this.countDownNotifs);
            if (!this.keys.length) {
                return;
            }

            for (const key of this.keys) {
                this.countDownNotifs[key].$expText = $(`#dynamic-notif-${key} .notification-date`, notify.$popup);
            }

            if (!this.countdown) {
                this.countdown = setInterval(() => {
                    const currentTime = unixtime();
                    for (const key of this.keys) {
                        const remaining = this.countDownNotifs[key].expiry - currentTime;
                        this.countDownNotifs[key].$expText
                            .text(time2offerExpire(remaining, true));
                        if (remaining <= 0) {
                            // Close the notification banner if the one currently shown has expired
                            if (notificationBanner.currentNotification &&
                                notificationBanner.currentNotification.id === parseInt(key)) {
                                // Notify any other tabs a banner has closed
                                mBroadcaster.crossTab.notify('closedBanner', parseInt(key));

                                notificationBanner.updateBanner(true);
                            }

                            this.removeNotifFromCounter(key);
                            this.disableClick(key);
                        }
                    }
                }, 1000);
            }
        },

        removeDynamicNotifCountdown() {
            'use strict';
            if (this.countdown) {
                clearInterval(this.countdown);
                delete this.countdown;
            }
        }
    },

    /**
     * Takes in an object and creates a dynamic notification object based on what the object contains.
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification The notification object. Must have: title(t), description(d) and id(id)
     * May have: expiry date(e), cta button {link: string, text: string}, image details (img, dsp), flags (sb)
     * @returns {Object|false} The HTML to be rendered for the notification
     */
    renderDynamic($notificationHtml, notification) {
        'use strict';

        const {cta1, cta2, t, d, e, dsp, img, id} = notification.data;
        if (!t || !d || !id) {
            return false;
        }

        let cssClass = 'nt-dynamic-nolink-notification';
        const ctaButton = cta1 || cta2;
        const link = ctaButton && ctaButton.link;

        if (link) {
            cssClass = 'nt-dynamic-notification';
            $notificationHtml.addClass('clickable');
        }

        if (e) {
            // If the notification is expired, do not show it.
            const remaining = e - unixtime();
            if (remaining <= 0) {
                return false;
            }
            else if (remaining <= 3600) {
                notify.dynamicNotifCountdown.addNotifToCounter(id, e);
            }
            const offerExpiryText = time2offerExpire(e);
            $('.notification-date', $notificationHtml)
                .text(offerExpiryText)
                .addClass(remaining <= 3600 ? 'red' : '');

            if (dsp && img) {
                let failed = 0;
                const retina = window.devicePixelRatio > 1 ? '@2x' : '';
                const imagePath = `${staticpath}images/mega/psa/${img}${retina}.png`;

                $('.dynamic-image', $notificationHtml)
                    .attr('src', imagePath)
                    .removeClass('hidden')
                    .rebind('error.dynamicImage', function() {
                        // If it failed once it will likely keep failing, prevent infinite loop
                        if (failed) {
                            $(this).addClass('hidden');
                            return;
                        }
                        $(this).attr('src', `${dsp}${img}${retina}.png`);
                        failed = 1;
                    });
            }

            if (link) {
                const $buttons = $('.notification-request-buttons', $notificationHtml).removeClass('hidden');
                const $bAccept = $('button.primary', $buttons).removeClass('hidden');
                $('span', $bAccept).text(ctaButton.text);
            }
        }
        else if (link) {
            $('.notification-request-buttons', $notificationHtml)
                .removeClass('hidden')
                .safeHTML(`<span class="dynamic-link">${ctaButton.text}</span>`);
        }

        const notifIcon = '<i class="sprite-fm-uni icon-mega-logo"></i>';
        $('.notification-avatar-custom', $notificationHtml).safeHTML(notifIcon);
        $('.notification-avatar-icon', $notificationHtml).addClass('hidden');

        this.renderNotificationTitle($notificationHtml, t);
        $('.notification-info', $notificationHtml).text(d);

        $notificationHtml.addClass(cssClass);
        $notificationHtml.attr('data-dynamic-id', id);
        $notificationHtml.attr('id', `dynamic-notif-${id}`);

        return $notificationHtml;
    },

    /**
     * Truncates long file or folder names to 30 characters
     * @param {String} name The file or folder name
     * @returns {String} Returns a string similar to 'reallylongfilename...'
     */
    shortenNodeName: function(name) {

        if (name.length > 30) {
            name = name.substr(0, 30) + '...';
        }

        return htmlentities(name);
    },

    /**
     * Adds an array of dynamic notifications to the current notifications via the action packet system
     * First await that the initial notifications have loaded, otherwise the notifyFromActionPacket call will be blocked
     */
    async addDynamicNotifications() {
        'use strict';

        // Make Get Notification (gnotif) API request
        const {result} = await api.req({a: 'gnotif'});
        let notifAdded = false;

        if (typeof this.lastSeenDynamic === 'undefined') {
            this.lastSeenDynamic
                = parseInt(await Promise.resolve(mega.attr.get(u_handle, 'lnotif', -2, true)).catch(nop)) | 0;
        }

        for (let i = 0; i < result.length; i++) {
            const givenNotif = result[i];

            if (notify.dynamicNotifs[givenNotif.id]) {
                continue;
            }

            const dynamicNotif = {
                ...givenNotif,
                a: 'dynamic',
                timestamp: givenNotif.e || givenNotif.s,
                seen: givenNotif.id <= this.lastSeenDynamic
            };

            // Decode title, description and CTA button texts
            dynamicNotif.t = from8(b64decode(dynamicNotif.t));
            dynamicNotif.d = from8(b64decode(dynamicNotif.d));
            if (dynamicNotif.cta1) {
                dynamicNotif.cta1.text = from8(b64decode(dynamicNotif.cta1.text));
            }
            if (dynamicNotif.cta2) {
                dynamicNotif.cta2.text = from8(b64decode(dynamicNotif.cta2.text));
            }

            // Store the notification so that its variables can be easily accessed
            notify.dynamicNotifs[dynamicNotif.id] = dynamicNotif;

            notifAdded = true;

            // Once the initial notifications have loaded, add the dynamic notification via the action packet system
            notify.initialLoading
                .then(() => {
                    notify.notifyFromActionPacket(dynamicNotif);

                    // If the notification centre is open immediately after the page is loaded,
                    // send an event to the API if any dynamic notifications can be seen
                    if (!notify.dynamicNotifsSeenEventSent
                            && !notify.$popup.hasClass('loading') &&
                            notify.$popup.closest('.js-dropdown-notification').hasClass('show')) {
                        notify.sendNotifSeenEvent(Object.keys(notify.dynamicNotifs));

                        // Stop the event being sent more than once
                        notify.dynamicNotifsSeenEventSent = true;
                    }
                })
                .catch(dump);
        }

        if (notifAdded) {
            if (notificationBanner.bannerInited) {
                notificationBanner.updateBanner(false);
            }
            else {
                notificationBanner.init();
            }
        }
    },

    /**
     * If the notification centre is open immediately after the page is loaded,
     * send an event to the API if any dynamic notifications can be seen
     * @param {String} list List of dynamic notification ID's to send with the event
     */
    sendNotifSeenEvent(list) {
        'use strict';

        eventlog(500240, String(Array.isArray(list) ? list.map(Number).sort() : (list | 0)));
    },

    /**
     * Check if the 'notifs' user attribute has been updated (e.g. after redeeming a promo notification,
     * which should remove that notification ID from u_attr.notifs), and update the dynamic notifications
     * and banner as appropriate
     */
    checkForNotifUpdates() {
        'use strict';

        if (!u_attr.notifs || !notificationBanner.bannerInited) {
            return;
        }

        // Compare notifs user attribute value (list) to cached notifications list
        const cachedNotifList = Object.keys(notify.dynamicNotifs).map(Number);
        const newNotifList = u_attr.notifs;

        if (cachedNotifList.length !== newNotifList.length) {
            if (newNotifList.length > cachedNotifList.length) {
                // If there's a new notification add it
                notify.addDynamicNotifications().catch(dump);
            }
            else {
                // Otherwise delete the missing notification(s) which should never be shown again
                const notifListDiffs = cachedNotifList.filter(elem => !newNotifList.includes(elem));
                for (const id of notifListDiffs) {
                    delete notify.dynamicNotifs[id];
                    notify.notifications.splice(
                        notify.notifications.findIndex(elem => elem.data.id === id), 1
                    );

                    // Update the notification banner if the one currently being shown is no longer valid
                    if (notificationBanner.currentNotification.id === id) {
                        notificationBanner.updateBanner(true);
                    }
                }

                // If the popup is open, re-render the notifications
                if (!notify.$popup.hasClass('hidden')) {
                    notify.renderNotifications();
                }
            }
        }
    },

    updateNotificationIndicator() {
        'use strict';
        if (!this.favico) {
            assert(Favico, 'Favico.js is missing.');

            const link = document.querySelector('link[rel="icon"]');
            if (link) {
                link.href = (location.hostname === 'mega.nz' || location.hostname === 'mega.app' ?
                    `https://mega.${mega.tld}/` : bootstaticpath) + 'favicon.ico';
            }

            this.favico = new Favico({
                type: 'circle',
                animation: 'popFade',
                bgColor: '#31D0FE',
                textColor: '#FFF',
            });
        }
        const show = !!(this.newNotifications || (window.megaChat && megaChat._lastUnreadCount));
        if (this.lastFavicoState !== show) {
            delay('notifFavicoUpd', tryCatch(() => {
                this.favico.reset();
                if (show) {
                    // Show if any notifications from this or chat.
                    this.favico.badge(' ');
                }
                else {
                    this.favico.badge('');
                }
                this.lastFavicoState = show;
            }));
        }

    }
};
