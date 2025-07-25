/**
 * Functionality for the Notifications popup
 *
 * 1) On page load, fetch the latest x number of notifications. If there are any new ones, these should show a
 *    number e.g. (3) in the red circle to indicate there are new notifications.
 * 2) When they click the notifications icon, show the popup and whatever notifications the user has.
 * 3) On action packet receive, put the notification at the top of the queue and update the red circle to indicate a
 *    new notification. Next time the popup opens this will show the new notification and old ones.
 */
var notify = {

    /** The current notifications **/
    notifications: [],

    /** Number of notifications to fetch in the 'c=100' API request. This is reduced to 50 for fast rendering. */
    numOfNotifications: 50,

    /** Locally cached emails and pending contact emails */
    userEmails: Object.create(null),

    /** jQuery objects for faster lookup */
    $popup: null,
    $popupIcon: null,
    $popupNum: null,

    /** Promise of if the intial notifications have loaded */
    initialLoading: false,

    /** A flag for if the initial loading of notifications is complete */
    initialLoadComplete: false,

    /** A list of already rendered pending contact request IDs (multiple can exist with reminders) */
    renderedContactRequests: [],

    /** Temp list of accepted contact requests */
    acceptedContactRequests: [],

    // The welcome dialog has been shown this session
    welcomeDialogShown: false,

    // Whether the event for viewing the dynamic notifications has been sent
    dynamicNotifsSeenEventSent: false,

    // Current dynamic notifications
    dynamicNotifs: {},
    lastSeenDynamic: undefined,

    newNotifications: 0,
    lastFavicoState: false,

    /**
     * Initialise the notifications system
     */
    init: function() {

        // Cache lookups
        notify.$popup = $('.js-notification-popup');
        notify.$popupIcon = $('.top-head .top-icon.notification');
        notify.$popupNum = $('.js-notification-num');

        // Init event handler to open popup
        notify.initNotifyIconClickHandler();

        // Recount the notifications and display red tooltip because they opened a new page within Mega
        notify.countAndShowNewNotifications();
    },

    /**
     * Get the most recent 100 notifications from the API
     */
    getInitialNotifications: function() {

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

                        // Add notifications to list
                        const newNotification = {
                            data: notification, // The full notification object
                            id: id,
                            seen: seen,
                            timeDelta: timeDelta,
                            timestamp: timestamp,
                            type: type,
                            userHandle,
                        };

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

                // If the popup is already open (they opened it while the notifications were being fetched) then render
                // the notifications. If the popup is not open, then clicking the icon will render the notifications.
                if (!notify.$popup.hasClass('hidden')) {
                    notify.renderNotifications();
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
        if (!notify.initialLoadComplete || notify.isUnwantedNotification(actionPacket)) {
            return false;
        }

        // Construct the notification object
        var newNotification = {
            data: actionPacket,                             // The action packet
            id: makeid(10),                                 // Make random ID
            seen: actionPacket.seen || false,                                  // New notification, so mark as unread
            timeDelta: 0,                                   // Time since notification was sent
            timestamp: actionPacket.timestamp || unixtime(),                   // Get the current timestamps in seconds
            type: actionPacket.a,                           // Type of notification e.g. share
            userHandle: actionPacket.u || actionPacket.ou   // User handle e.g. new share from this user
        };

        if (actionPacket.a === 'dshare' && actionPacket.orig && actionPacket.orig !== u_handle) {
            newNotification.userHandle = actionPacket.orig;
        }

        // If the user handle is not known to the local state we need to fetch the email from the API. This happens in
        // some sharing scenarios where a user is part of a share then another user adds files to the share but they
        // are not contacts with that other user so the local state has no information about them and would display a
        // broken notification if the email is not known.
        if (newNotification.type === 'put' && String(newNotification.userHandle).length === 11) {

            this.getUserEmailByTheirHandle(newNotification.userHandle);
        }

        if (newNotification.type === 'puu') {
            newNotification.allDataItems = actionPacket.f.map((e) => e.h);
        }

        // Combines the current new notification with the previous one if it meets certain criteria
        notify.combineNewNotificationWithPrevious(newNotification);

        // Show the new notification icon
        notify.countAndShowNewNotifications();

        // If the popup is open, re-render the notifications to show the latest one
        if (!notify.$popup.hasClass('hidden')) {
            notify.renderNotifications();
        }
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
            case 'put':
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
                if (!mega.notif.has('contacts_fcrin')) {
                    return true;
                }
                break;

            case 'c':
                action = (typeof notification.c !== 'undefined') ? notification.c : notification.u[0].c;
                if ((action === 0 && !mega.notif.has('contacts_fcrdel')) ||
                    (action === 1 && !mega.notif.has('contacts_fcracpt'))) {
                    return true;
                }
                break;

            case 'upco':
                action = (typeof notification.s !== 'undefined') ? notification.s : notification.u[0].s;
                if (action === 2 && !mega.notif.has('contacts_fcracpt')) {
                    return true;
                }
                break;

            case 'puu':
                if (mega.notif.has('cloud_upload')) {
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
        const previousNotificationNode = M.d[previousNotification.data.h];
        const currentNotificationNode = M.d[currentNotification.data.h];
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
        var $popup = $(notify.$popupNum);

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

        // If there is a new notification, show the red circle with the number of notifications in it
        if (newNotifications >= 1) {
            $popup.removeClass('hidden').text(newNotifications);
            $(document.body).trigger('onMegaNotification', newNotifications);
        }
        else {
            // Otherwise hide it
            $popup.addClass('hidden').text(newNotifications);
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

        // Hide red circle with number of new notifications
        notify.$popupNum.addClass('hidden');
        notify.$popupNum.html(0);

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


        $('.js-topbarnotification').rebind('click', function() {
            let $elem = $(this).parent();
            if ($elem.hasClass('show')) {
                notify.closePopup();
            }
            else {
                $elem.addClass('show');
                notify.renderNotifications();

                // Check if any dynamic notifications can be seen
                const dynamicNotifIds = [];
                for (const notif of $('.nt-dynamic-notification', notify.$popup)) {
                    dynamicNotifIds.push($(notif).data('dynamic-id'));
                }

                // Send event to the API if any dynamic notifications can be seen
                if (dynamicNotifIds.length) {
                    notify.sendNotifSeenEvent(dynamicNotifIds);
                }

                eventlog(500322);
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
     */
    sortNotificationsByMostRecent: function() {
        notify.notifications.sort(function(notificationA, notificationB) {

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
        M.setUser(userHandle);
        const promises = [
            M.syncUsersFullname(userHandle),
            M.syncContactEmail(userHandle, true)
        ];
        this.userEmails[userHandle] = Promise.allSettled(promises)
            .then(() => {
                this.userEmails[userHandle] = M.getUserByHandle(userHandle).m;
            });
        return false;
    },

    /**
     * To do: render the notifications in the popup
     */
    renderNotifications: function() {
        'use strict';

        // Get the number of notifications
        var numOfNotifications = notify.notifications.length;
        var allNotificationsHtml = '';

        // If no notifications, show empty
        if (notify.initialLoadComplete && numOfNotifications === 0) {
            notify.$popup.removeClass('loading');
            notify.$popup.addClass('empty');
            return false;
        }
        else if (!notify.initialLoadComplete) {
            return false;
        }

        // Sort the notifications
        notify.sortNotificationsByMostRecent();

        // Reset rendered contact requests so the Accept button will show again
        notify.renderedContactRequests = [];

        // Cache the template selector
        var $template = this.$popup.find('.notification-item.template');

        // Remove existing notifications and so they are re-rendered
        this.$popup.find('.notification-item:not(.template)').remove();

        // Loop through all the notifications
        for (var i = 0; i < numOfNotifications; i++) {

            // Get the notification data and clone the notification template in /html/top.html
            var notification = notify.notifications[i];
            var $notificationHtml = $template.clone();

            // Update template
            $notificationHtml = notify.updateTemplate($notificationHtml, notification);

            // Skip this notification if it's not one that is recognised
            if ($notificationHtml === false) {
                continue;
            }

            // Build the html
            allNotificationsHtml += $notificationHtml.prop('outerHTML');
        }

        // If all notifications are not recognised, show empty
        if (allNotificationsHtml === "") {
            notify.$popup.removeClass('loading');
            notify.$popup.addClass('empty');
            return false;
        }

        // Update the list of notifications
        notify.$popup.find('.notification-scr-list').safeAppend(allNotificationsHtml);
        notify.$popup.removeClass('empty loading');

        // Add scrolling for the notifications
        Soon(() => {
            initPerfectScrollbar($('.notification-scroll', notify.$popup));
        });

        // Add click handlers for various notifications
        notify.initFullContactClickHandler();
        notify.initShareClickHandler();
        notify.initTakedownClickHandler();
        notify.initPaymentClickHandler();
        notify.initPaymentReminderClickHandler();
        notify.initAcceptContactClickHandler();
        notify.initSettingsClickHander();
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
     * When the other user has accepted the contact request and the 'Contact relationship established' notification
     * appears, make this is clickable so they can go to the contact's page to verify fingerprints or start chatting.
     */
    initFullContactClickHandler: function() {

        // Add click handler for the 'Contact relationship established' notification
        this.$popup.find('.nt-contact-accepted').rebind('click', function() {
            // Redirect to the contact's page only if it's still a contact
            if (M.c.contacts && $(this).attr('data-contact-handle') in M.c.contacts) {
                loadSubPage('fm/chat/contacts/' + $(this).attr('data-contact-handle'));
                notify.closePopup();
            } else {
                msgDialog('info', '', l[20427]);
            }

            eventlog(500462);
        });
        clickURLs();
        $('a.clickurl', this.$popup).rebind('click.notif', () => {
            eventlog(500462);
            notify.closePopup();
        });
    },

    /**
     * On click of a share or new files/folders notification, go to that share
     */
    initShareClickHandler: function() {

        // Select the notifications with shares or new files/folders
        this.$popup.find('.notification-item.nt-incoming-share, .notification-item.nt-new-files').rebind('click', function() {

            // Get the folder ID from the HTML5 data attribute
            const $this = $(this);
            const folderId = $this.attr('data-folder-id');
            const notificationID = $this.attr('id');

            // Mark all notifications as seen and close the popup
            // (because they clicked on a notification within the popup)
            notify.closePopup();

            // Open the folder
            M.openFolder(folderId)
                .then(() => {
                    const {allDataItems, data: {f}} = notify.notifications.find(elem => elem.id === notificationID);

                    M.addSelectedNodes(allDataItems || f && f.map((n) => n.h) || [], true);
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
            var folderOrFileId = $(this).attr('data-folder-or-file-id');
            var parentFolderId = M.getNodeByHandle(folderOrFileId).p;

            // Mark all notifications as seen and close the popup
            // (because they clicked on a notification within the popup)
            notify.closePopup();

            if (parentFolderId) {
                // Open the folder
                M.openFolder(parentFolderId)
                    .always(function() {
                        reselect(true);
                    });
            }

            eventlog(500464);
        });
    },

    /**
     * If they click on a payment notification, then redirect them to the Account History page
     */
    initPaymentClickHandler: function() {

        // On payment notification click
        this.$popup.find('.notification-item.nt-payment-notification').rebind('click', function() {

            // Mark all notifications as seen (because they clicked on a notification within the popup)
            notify.closePopup();
            var $target = $('.data-block.account-balance');

            // Redirect to payment history
            loadSubPage('fm/account/plan');
            mBroadcaster.once('settingPageReady', function () {
                const $scrollBlock = $('.fm-right-account-block.ps');
                if ($scrollBlock.length) {
                    $scrollBlock.scrollTop(
                        $target.offset().top - $scrollBlock.offset().top + $scrollBlock.scrollTop()
                    );
                }
            });

            eventlog(500465);
        });
    },

    /**
     * If they click on a payment reminder notification, then redirect them to the Pro page
     */
    initPaymentReminderClickHandler: function() {

        // On payment reminder notification click
        this.$popup.find('.notification-item.nt-payment-reminder-notification').rebind('click', function() {

            // Mark all notifications as seen and close the popup
            // (because they clicked on a notification within the popup)
            notify.closePopup();

            // Redirect to pro page
            loadSubPage('pro');

            eventlog(500466);
        });
    },

    /**
     * If the click on Accept for a contact request, accept the contact
     */
    initAcceptContactClickHandler: function() {

        // Add click handler to Accept button
        this.$popup.find('.notification-item .notifications-button.accept').rebind('click', function() {

            var $this = $(this);
            var pendingContactId = $this.attr('data-pending-contact-id');

            // Send the User Pending Contact Action (upca) API 2.0 request to accept the request
            M.acceptPendingContactRequest(pendingContactId)
                .catch(() => {
                    notify.acceptedContactRequests.splice(notify.acceptedContactRequests.indexOf(pendingContactId), 1);
                });

            // Show the Accepted icon and text
            $this.closest('.notification-item').addClass('accepted');
            notify.acceptedContactRequests.push(pendingContactId);

            // Mark all notifications as seen and close the popup
            // (because they clicked on a notification within the popup)
            notify.closePopup();

            eventlog(500467);
        });
    },

    /**
     * Load the notification settings page
     * @return {undefined}
     */
    initSettingsClickHander: function() {
        'use strict';
        $('button.settings', this.$popup).rebind('click.notifications', () => {
            notify.closePopup();
            loadSubPage('fm/account/notifications');
        });
    },

    initScheduledClickHandler: () => {
        'use strict';
        $('.nt-schedule-meet', this.$popup).rebind('click.notifications', e => {
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
        $('.nt-dynamic-notification', this.$popup).rebind('click.notifications', e => {
            const dynamicId = $(e.currentTarget).attr('data-dynamic-id');
            const ctaButton = notify.dynamicNotifs[dynamicId].cta1 || notify.dynamicNotifs[dynamicId].cta2;
            if (ctaButton && ctaButton.link) {
                notify.closePopup();
                const link = ctaButton.link;
                if (link) {
                    window.open(link, '_blank', 'noopener,noreferrer');
                }
                eventlog(500242, dynamicId | 0);
            }
        });
    },

    /**
     * Main function to update each notification with relevant style and details
     * @param {Object} $notificationHtml The jQuery clone of the HTML notification template
     * @param {Object} notification The notification object
     * @returns {Object}
     */
    updateTemplate: function($notificationHtml, notification)
    {
        // Remove the template class
        $notificationHtml.removeClass('template');

        var date = time2last(notification.timestamp);
        var data = notification.data;
        var userHandle = notification.userHandle;
        var userEmail = l[7381];    // Unknown
        var avatar = '';

        // Payment & Takedown notification types, file-request upload type
        const customIconNotifications = ['psts', 'pses', 'ph', 'puu', 'dynamic', 'psts_v2'];

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

            // Generate avatar from the user handle which will load their profile pic if they are already a contact
            if (typeof M.u[userHandle] !== 'undefined') {
                avatar = useravatar.contact(userHandle);
            }

            // If it failed to generate an avatar from the user handle, or we haven't generated one yet use the email
            // address. With the new v2.0 API for pending contacts, the user handle will usually not be available as
            // they are not a full contact yet.
            if (avatar === '') {
                avatar = useravatar.contact(userEmail);
            }

            // Add the avatar HTML and show it
            $notificationHtml.find('.notification-avatar').removeClass('hidden').prepend(avatar);
        }
        else {
            // Hide the notification avatar code, the specific notification will render the icon
            $notificationHtml.find('.notification-icon').removeClass('hidden');
        }

        // Get the user's name if we have it, otherwise use their email
        var displayNameOrEmail = notify.getDisplayName(userEmail);

        // Update common template variables
        $notificationHtml.attr('id', notification.id);
        $notificationHtml.find('.notification-date').text(date);
        $notificationHtml.find('.notification-username').text(displayNameOrEmail);

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
                return notify.renderUpdatedPendingContactIncoming($notificationHtml, notification);
            case 'upco':
                return notify.renderUpdatedPendingContactOutgoing($notificationHtml, notification);
            case 'share':
                return notify.renderNewShare($notificationHtml, notification, userEmail);
            case 'd':
                return notify.renderRemovedSharedNode($notificationHtml, notification);
            case 'dshare':
                return notify.renderDeletedShare($notificationHtml, userEmail, notification);
            case 'put':
                return notify.renderNewSharedNodes($notificationHtml, notification, userEmail);
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
                return notify.renderFileRequestUpload($notificationHtml, notification);
            default:
                return false;   // If it's a notification type we do not recognise yet
        }
    },

    /**
     * Render pending contact requests
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification
     * @returns {Object} The HTML to be rendered for the notification
     */
    renderIncomingPendingContact: function($notificationHtml, notification) {

        var pendingContactId = notification.data.p;
        var mostRecentNotification = true;
        let isAccepted = false;
        var className = '';
        var title = '';

        // Check if a newer contact request for this user has already been rendered (notifications are sorted by timestamp)
        for (var i = 0, length = notify.renderedContactRequests.length; i < length; i++) {

            // If this contact request has already been rendered, don't render the current notification with buttons
            if (pendingContactId === notify.renderedContactRequests[i]) {
                mostRecentNotification = false;
            }
        }

        if (notify.acceptedContactRequests.includes(pendingContactId)) {
            isAccepted = true;
        }
        // If this is the most recent contact request from this user
        if (mostRecentNotification && !isAccepted) {

            // If this IPC notification also exists in the state
            if (typeof M.ipc[pendingContactId] === 'object') {

                // Show the Accept button
                $notificationHtml.find('.notification-request-buttons').removeClass('hidden');
            }

            // Set a flag so the buttons are not rendered again on older notifications
            notify.renderedContactRequests.push(pendingContactId);
        }

        // If the other user deleted their contact request to the current user
        if (typeof notification.data.dts !== 'undefined') {
            className = 'nt-contact-deleted';
            title = l[7151];      // Cancelled their contact request
        }

        // If the other user sent a reminder about their contact request
        else if (typeof notification.data.rts !== 'undefined') {
            className = 'nt-contact-request';
            title = l[7150];      // Reminder: you have a contact request
        }
        else {
            // Creates notification with 'Sent you a contact request' and 'Accept' button
            className = 'nt-contact-request';
            title = l[5851];
        }

        // Populate other template information
        $notificationHtml.addClass(className);
        if (notification.data && notification.data.m) {
            const user = M.getUserByEmail(notification.data.m);
            if (user && user.c === 1 && user.h) {
                $notificationHtml.addClass('clickurl').attr('href', `/fm/chat/contacts/${user.h}`);
            }
            else if (isAccepted) {
                // In-flight request so user.h is unknown. Send to contacts on click
                $notificationHtml.addClass('clickurl').attr('href', `/fm/chat/contacts`);
            }
        }
        $notificationHtml.find('.notification-info').text(title);
        $notificationHtml.find('.notifications-button.accept').attr('data-pending-contact-id', pendingContactId);

        return $notificationHtml;
    },

    /**
     * Renders notifications related to contact changes
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification
     * @returns {Object} The HTML to be rendered for the notification
     */
    renderContactChange: function($notificationHtml, notification) {

        // Get data from initial c=50 notification fetch or action packet
        var action = (typeof notification.data.c !== 'undefined') ? notification.data.c : notification.data.u[0].c;
        var userHandle = (Array.isArray(notification.userHandle)) ?
            notification.data.ou || notification.userHandle[0].u : notification.userHandle;
        var className = '';
        var title = '';

        // If the user deleted the request
        if (action === 0) {
            className = 'nt-contact-deleted';
            title = l[7146];        // Deleted you as a contact
        }
        else if (action === 1) {
            className = 'nt-contact-accepted';
            title = l.notification_contact_accepted; // Accepted your contact request

            if (u_attr.b && !u_attr.b.m && u_attr.b.mu && u_attr.b.mu[0] === userHandle) {
                title = l.admin_sub_contacts; // your admin and you are now contacts.
            }

            // Add a data attribute for the click handler
            $notificationHtml.attr('data-contact-handle', userHandle);
            $notificationHtml.addClass('clickable');
        }
        else if (action === 2) {
            className = 'nt-contact-deleted';
            title = l[7144];        // Account has been deleted/deactivated
        }

        // Populate other template information
        $notificationHtml.addClass(className);
        $notificationHtml.find('.notification-info').text(title);

        return $notificationHtml;
    },

    /**
     * Renders Updated Pending Contact (Incoming) notifications
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification
     * @returns {Object} The HTML to be rendered for the notification
     */
    renderUpdatedPendingContactIncoming: function($notificationHtml, notification) {

        // The action 's' will only be available if initial fetch of notifications, 'u[0].s' is used if action packet
        var action = (typeof notification.data.s !== 'undefined') ? notification.data.s : notification.data.u[0].s;
        var className = '';
        var title = '';

        if (action === 1) {
            className = 'nt-contact-request-ignored';
            title = l[7149];      // You ignored a contact request
        }
        else if (action === 2) {
            className = 'nt-contact-accepted';
            title = l[7148];      // You accepted a contact request
        }
        else if (action === 3) {
            className = 'nt-contact-request-denied';
            title = l[7147];      // You denied a contact request
        }

        // Populate other template information
        $notificationHtml.addClass(className);
        $notificationHtml.find('.notification-info').text(title);

        return $notificationHtml;
    },

    /**
     * Renders Updated Pending Contact (Outgoing) notifications
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification
     * @returns {Object} The HTML to be rendered for the notification
     */
    renderUpdatedPendingContactOutgoing: function($notificationHtml, notification) {

        // The action 's' will only be available if initial fetch of notifications, 'u[0].s' is used if action packet
        var action = (typeof notification.data.s !== 'undefined') ? notification.data.s : notification.data.u[0].s;
        var className = '';
        var title = '';

        // Display message depending on action
        if (action === 2) {
            className = 'nt-contact-accepted';
            title = l[5852];        // Accepted your contact request
        }
        else if (action === 3) {
            className = 'nt-contact-request-denied';
            title = l[5853];        // Denied your contact request
        }

        // Populate other template information
        $notificationHtml.addClass(className);
        $notificationHtml.find('.notification-info').text(title);

        return $notificationHtml;
    },

    /**
     * Render new share notification
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification
     * @param {String} email The email address
     * @returns {Object} The HTML to be rendered for the notification
     */
    renderNewShare: function($notificationHtml, notification, email) {

        var title = '';
        var folderId = notification.data.n;

        // If the email exists use language string 'New shared folder from [X]'
        if (email) {
            title = l[824].replace('[X]', email);
        }
        else {
            // Otherwise use string 'New shared folder'
            title = l[825];
        }

        // Populate other template information
        $notificationHtml.addClass('nt-incoming-share');
        $notificationHtml.addClass('clickable');
        $notificationHtml.find('.notification-info').text(title);
        $notificationHtml.attr('data-folder-id', folderId);

        return $notificationHtml;
    },

    /**
     * Render removed share node notification
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @returns {Object} The HTML to be rendered for the notification
     */
    renderRemovedSharedNode: function($notificationHtml, notification) {

        var itemsNumber = 0;
        var title = '';

        if (Array.isArray(notification.data.n)) {
            itemsNumber = notification.data.n.length;
        }
        else {
            itemsNumber = 1;
        }

        title = mega.icu.format(l[8913], itemsNumber);

        // Populate other template information
        $notificationHtml.addClass('nt-revocation-of-incoming');
        $notificationHtml.find('.notification-info').text(title);

        return $notificationHtml;
    },

    /**
     * Render a deleted share notification
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {String} email The email address
     * @param {Object} notification notification object
     * @returns {Object} The HTML to be rendered for the notification
     */
    renderDeletedShare: function ($notificationHtml, email, notification) {

        var title = '';
        var notificationOwner;
        var notificationTarget;
        var notificationOrginating;

        // first we are parsing an action packet.
        if (notification.data.orig) {
            notificationOwner = notification.data.u;
            notificationTarget = notification.data.rece;
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
                else {
                    notificationTarget = notificationOrginating;
                }
            }
            else {
                notificationTarget = u_handle;
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
        var sharingRemovedByReciver = notificationOrginating !== notificationOwner;

        if (!sharingRemovedByReciver) {
            // If the email exists use string 'Access to folders shared by [X] was removed'
            if (email) {
                title = l[7879].replace('[X]', email);
            }
            else {
                // Otherwise use string 'Access to folders was removed.'
                title = l[7880];
            }
        }
        else {
            var folderName = M.getNameByHandle(notification.data.n) || '';
            var removerEmail = notify.getUserEmailByTheirHandle(notificationTarget);
            if (removerEmail) {
                title = l[19153].replace('{0}', removerEmail).replace('{1}', folderName);
            }
            else {
                title = l[19154].replace('{0}', folderName);
            }
        }

        // Populate other template information
        $notificationHtml.addClass('nt-revocation-of-incoming');
        $notificationHtml.find('.notification-info').text(title);

        return $notificationHtml;
    },

    /**
     * Render a notification for when another user has added files/folders into an already shared folder.
     * This condenses all the files and folders that were shared into a single notification.
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification
     * @param {String} email The email address
     * @returns {Object} The HTML to be rendered for the notification
     */
    renderNewSharedNodes: function($notificationHtml, notification, email) {

        var nodes = notification.data.f;
        var fileCount = 0;
        var folderCount = 0;
        var folderId = notification.data.n;
        var notificationText = '';
        var title = '';

        // Count the number of new files and folders
        for (var node in nodes) {

            // Skip if not own property
            if (!nodes.hasOwnProperty(node)) {
                continue;
            }

            // If folder, increment
            if (nodes[node].t) {
                folderCount++;
            }
            else {
                // Otherwise is file
                fileCount++;
            }
        }

        // Get wording for the number of files and folders added
        const folderText = mega.icu.format(l.folder_count, folderCount);
        const fileText = mega.icu.format(l.file_count, fileCount);

        // Set wording of the title
        if (notification.data.ver && folderCount === 0 && fileCount > 0) {
            title = email ? mega.icu.format(l.user_file_updated_count, fileCount).replace('[X]', email)
                : mega.icu.format(l.file_updated_count, fileCount);
        }
        else if (folderCount >= 1 && fileCount >= 1) {
            title = email ? mega.icu.format(l.user_item_added_count, folderCount + fileCount).replace('[X]', email) :
                mega.icu.format(l.item_added_count, folderCount + fileCount);
        }
        else if (folderCount > 0) {
            title = email ? l[836].replace('[X]', email).replace('[DATA]', folderText) :
                mega.icu.format(l.folder_added_count, folderCount);
        }
        else if (fileCount > 0) {
            title = email ? l[836].replace('[X]', email).replace('[DATA]', fileText) :
                mega.icu.format(l.file_added_count, fileCount);
        }

        // Populate other template information
        $notificationHtml.addClass('nt-new-files');
        $notificationHtml.addClass('clickable');
        $notificationHtml.find('.notification-info').text(title);
        $notificationHtml.attr('data-folder-id', folderId);

        return $notificationHtml;
    },

    /**
     * Process payment notification sent from payment provider e.g. Bitcoin.
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification The notification object
     * @returns {Object} The HTML to be rendered for the notification
     */
    renderPayment: function($notificationHtml, notification) {

        // If user has not seen the welcome dialog before, show it and set ^!welDlg to 2 (seen)
        if (!notification.seen && !(u_attr.pf || u_attr.b)) {
            mega.attr.get(u_handle, 'welDlg', -2, 1, (res) => {
                if ((res | 0) === 1) {
                    notify.createNewUserDialog(notification);
                    notify.welcomeDialogShown = true;
                    mega.attr.set('welDlg', 2, -2, true);
                }
            }).catch(dump);
        }

        var proLevel = notification.data.p;

        if (proLevel === pro.ACCOUNT_LEVEL_FEATURE) {
            proLevel += pro.getStandaloneBits(notification.data.f);
        }

        var proPlan = pro.getProPlanName(proLevel);
        var success = (notification.data.r === 's') ? true : false;
        var header = l[1230];   // Payment info
        var title = '';

        // Change wording depending on success or failure
        if (success) {
            title = l[7142].replace('%1', proPlan);   // Your payment for the PRO III plan was received.
        }
        else {
            title = l[7141].replace('%1', proPlan);   // Your payment for the PRO II plan was unsuccessful.
        }

        // Populate other template information
        $notificationHtml.addClass('nt-payment-notification');
        $notificationHtml.addClass('clickable');
        $notificationHtml.find('.notification-info').text(title);
        $notificationHtml.find('.notification-username').text(header);      // Use 'Payment info' instead of an email

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
                const plansEndingAfterPurchase = getPlansEndingAfterPurchase();
                const bodyText = plansEndingAfterPurchase < 2
                    ? l.welcome_dialog_active_until
                    : l.welcome_dialog_active_check;
                msgDialog('warninga', '',
                          l.welcome_dialog_thanks_for_sub.replace('%1', newPlan),
                          bodyText
                              .replace('%1', currentPlan)
                              .replace('%3', time2date(purchaseEndTime || account.srenew[0], 1))
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
     * Process payment reminder notification to remind them their PRO plan is due for renewal.
     * Example PSES (Pro Status Expiring Soon) packet: {"a":"pses", "ts":expirestimestamp}.
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification The notification object
     * @returns {Object|false} The HTML to be rendered for the notification
     */
    renderPaymentReminder: function($notificationHtml, notification) {

        // Find the time difference between the current time and the plan expiry time
        var currentTimestamp = unixtime();
        var expiringTimestamp = notification.data.ts;
        var secondsDifference = (expiringTimestamp - currentTimestamp);

        // If the notification is still in the future
        if (secondsDifference > 0) {

            // Calculate day/days remaining
            var days = Math.floor(secondsDifference / 86400);

            // PRO membership plan expiring soon
            // Your PRO membership plan will expire in 1 day/x days.
            var header = l[8598];
            var title;
            if (days === 0) {
                title = l[25041];
            }
            else {
                title = mega.icu.format(l[8597], days);
            }

            // Populate other template information
            $notificationHtml.addClass('nt-payment-reminder-notification clickable');
            $notificationHtml.find('.notification-username').text(header);
            $notificationHtml.find('.notification-info').addClass('red').text(title);

            return $notificationHtml;
        }

        // Don't show any notification if the time has passed
        return false;
    },

    /**
     * Processes a takedown notice or counter-notice to restore the file.
     * @param {Object} $notificationHtml jQuery object of the notification template HTML
     * @param {Object} notification The notification object
     * @returns {Object|false} The HTML to be rendered for the notification
     */
    renderTakedown: function($notificationHtml, notification) {

        var header = '';
        var title = '';
        var cssClass = '';
        var handle = notification.data.h;
        var node = M.d[handle] || {};
        var name = (node.name) ? '(' + notify.shortenNodeName(node.name) + ')' : '';

        // Takedown notice
        // Your publicly shared %1 (%2) has been taken down.
        if (notification.data.down === 1) {
            header = l[8521];
            title = (node.t === 0) ? l.publicly_shared_file_taken_down.replace('%1', name)
                : l.publicly_shared_folder_taken_down.replace('%1', name);
            cssClass = 'nt-takedown-notification';
        }

        // Takedown reinstated
        // Your taken down %1 (%2) has been reinstated.
        else if (notification.data.down === 0) {
            header = l[8524];
            title = (node.t === 0) ? l.taken_down_file_reinstated.replace('%1', name)
                : l.taken_down_folder_reinstated.replace('%1', name);
            cssClass = 'nt-takedown-reinstated-notification';
        }
        else {
            // Not applicable so don't return anything or it will show a blank notification
            return false;
        }

        // Populate other template information
        $notificationHtml.addClass(cssClass);
        $notificationHtml.addClass('clickable');
        $notificationHtml.find('.notification-info').text(title);
        $notificationHtml.find('.notification-username').text(header);
        $notificationHtml.attr('data-folder-or-file-id', handle);

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

    renderScheduled: function($notificationHtml, notification) {
        'use strict';
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
        $notifBody.removeClass('hidden');
        const $notifLabel = $('.notification-content .notification-info', $notificationHtml).eq(0);

        const { NOTIF_TITLES } = megaChat.plugins.meetingsManager;
        let showTitle = true;

        const titleSelect = (core) => {
            const occurrenceKey = meta.occurrence ? 'occur' : 'all';
            if (meta.mode === MODE.CREATED) {
                return core.inv;
            }
            else if (meta.mode === MODE.EDITED) {
                let string = '';
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
                    string = core.time[occurrenceKey];
                    diffCounter++;
                }
                if (meta.topicChange) {
                    string = core.name.update.replace('%1', meta.oldTopic).replace('%s', meta.topic);
                    diffCounter++;
                    showTitle = false;
                }
                if (meta.description) {
                    string = core.desc.update;
                    diffCounter++;
                    $notificationHtml.attr('data-desc', diffCounter);
                }
                if (meta.converted) {
                    string = core.convert;
                }
                else if (diffCounter > 1) {
                    string = core.multi;
                    now = false;
                    prev = false;
                    showTitle = true;
                }
                return string;
            }
            return core.cancel[occurrenceKey];
        };

        if (meta.mode === MODE.CREATED) {
            let email = this.getUserEmailByTheirHandle(data.ou);
            if (email) {
                const avatar = useravatar.contact(email);
                if (avatar) {
                    const $avatar = $('.notification-avatar', $notificationHtml).removeClass('hidden');
                    $avatar.empty();
                    $avatar.safePrepend(avatar);
                }
                email = this.getDisplayName(email);
                $('.notification-username', $notificationHtml).text(email);
            }
        }

        $notifLabel.text(titleSelect(meta.recurring ? NOTIF_TITLES.recur : NOTIF_TITLES.once));
        const $title = $('.notification-scheduled-title', $notifBody);

        if (showTitle) {
            $title.text(chatRoom.topic).removeClass('hidden');
        }

        const $prev = $('.notification-scheduled-prev', $notifBody);
        const $new = $('.notification-scheduled-occurrence', $notifBody);

        if (prev && !(meta.occurrence && meta.mode === MODE.CANCELLED)) {
            $prev.removeClass('hidden');
            $('s', $prev).text(prev);
        }
        if (now) {
            $new.removeClass('hidden');
            $new.text(now);
        }
        $notificationHtml.addClass('nt-schedule-meet').attr('data-chatid', chatRoom.chatId);
        return $notificationHtml;
    },

    renderFileRequestUpload($notificationHtml, notification) {
        'use strict';

        const fileHandle = notification.data.h || notification.allDataItems[0].h;
        const fileNode = M.d[fileHandle] || {};
        const folderHandle = fileNode.p || notification.data.n;

        // File has likely been deleted
        if (!folderHandle) {
            return false;
        }
        const folderNode = M.d[folderHandle];
        const folderName = folderNode.name ? notify.shortenNodeName(folderNode.name) : false;

        let title;
        let header;

        const numberOfFiles = notification.allDataItems.length;
        const uploader = notification.userHandle;

        if (uploader) {
            title = mega.icu.format(l.file_request_notification, numberOfFiles)
                .replace('%1', uploader).replace('%2', folderName);
            header = uploader;
        }
        else {
            title = mega.icu.format(l.file_request_notification_nameless, numberOfFiles).replace('%1', folderName);
            header = l.file_request_notification_header;
        }

        const $iconHtml = this.$popup.find('.file-request-notification.template').clone().removeClass('hidden');

        $('.notification-info', $notificationHtml).text(title);
        $notificationHtml.attr('data-folder-id', folderNode.h);
        $notificationHtml.addClass('nt-new-files nt-file-request clickable');
        $('.notification-username', $notificationHtml).text(header);
        $('.notification-avatar', $notificationHtml)
            .removeClass('hidden')
            .safePrepend($iconHtml.prop('outerHTML'));
        $('.notification-icon', $notificationHtml).addClass('hidden');
        $('.notification-avatar-icon', $notificationHtml).addClass('hidden');

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

        const {data} = notification;
        if (!data.t || !data.d || !data.id) {
            return;
        }

        if (data.e) {
            // If the notification is expired, do not show it.
            const remaining = data.e - unixtime();
            if (remaining <= 0) {
                return false;
            }
            else if (remaining <= 3600) {
                notify.dynamicNotifCountdown.addNotifToCounter(data.id, data.e);
            }
            const offerExpiryText = time2offerExpire(data.e);
            $('.notification-date', $notificationHtml)
                .text(offerExpiryText)
                .addClass(remaining <= 3600 ? 'red' : '');
        }

        const ctaButton = data.cta1 || data.cta2;
        if (ctaButton && ctaButton.link) {
            const $ctas = $('.cta-buttons', $notificationHtml)
                .removeClass('hidden')
                .addClass(data.cta1 ? 'positive' : '');
            const $button = $('button', $ctas).toggleClass('positive', !!data.cta1);
            $('span', $button).text(ctaButton.text);
        }
        if (data.dsp && data.img) {
            let failed = 0;
            const retina = (window.devicePixelRatio > 1) ? '@2x' : '';
            const imagePath = staticpath + 'images/mega/psa/' + data.img + '@2x.png';

            $('.dynamic-image', $notificationHtml)
                .attr('src', imagePath)
                .removeClass('hidden')
                .rebind('error', function() {
                    // If it failed once it will likely keep failing, prevent infinite loop
                    if (failed) {
                        $(this).addClass('hidden');
                        return;
                    }
                    $(this).attr('src', data.dsp + data.img + retina + '.png');
                    failed = 1;
                });
        }

        $('.notification-info', $notificationHtml).text(data.d);
        $('.notification-username', $notificationHtml).text(data.t);
        $('.notification-promo', $notificationHtml).removeClass('hidden');
        $notificationHtml.addClass('nt-dynamic-notification');
        $notificationHtml.attr('data-dynamic-id', data.id);
        $notificationHtml.attr('id', 'dynamic-notif-' + data.id);

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
     * Gets a display name for the notification. If available it will use the user or contact's name.
     * If the name is unavailable (e.g. a new contact request) then it will use the email address.
     * @param {String} email The email address e.g. ed@fredom.press
     * @returns {String} Returns the name and email as a string e.g. "Ed Snowden (ed@fredom.press)" or just the email
     */
    getDisplayName: function(email) {

        // Use the email by default
        var displayName = email;

        // Search through contacts for the email address
        if (M && M.u) {
            M.u.forEach(function(contact) {

                var contactEmail = contact.m;
                var contactHandle = contact.u;

                // If the email is found
                if (contactEmail === email) {

                    // If the nickname is available use: Nickname
                    if (M.u[contactHandle].nickname !== '') {
                        displayName = nicknames.getNickname(contactHandle);
                    }
                    else {
                        // Otherwise use: FirstName LastName (Email)
                        displayName = (M.u[contactHandle].firstName + ' ' + M.u[contactHandle].lastName).trim()
                                    + ' (' + email + ')';
                    }

                    // Exit foreach loop
                    return true;
                }
            });
        }

        // Escape and return
        return displayName;
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
                link.href = `${location.hostname === 'mega.nz' ? 'https://mega.nz/' : bootstaticpath}favicon.ico`;
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
