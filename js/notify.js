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

    /** A flag for if the initial loading of notifications is complete */
    initialLoadComplete: false,

    /** A list of already rendered pending contact request IDs (multiple can exist with reminders) */
    renderedContactRequests: [],

    /**
     * Initialise the notifications system
     */
    init: function() {

        // Cache lookups
        notify.$popup = $('.dropdown.popup.notification-popup');
        notify.$popupIcon = $('.top-head .top-icon.notification');
        notify.$popupNum = $('.top-head .notification-num');

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
        api_req('c=' + notify.numOfNotifications, {
            callback: function(result) {

                // Check it wasn't a negative number error response
                if (typeof result !== 'object') {
                    return false;
                }

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

                        // Add notifications to list
                        notify.notifications.push({
                            data: notification, // The full notification object
                            id: id,
                            seen: seen,
                            timeDelta: timeDelta,
                            timestamp: timestamp,
                            type: type,
                            userHandle: userHandle
                        });
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
            }
        }, 3);  // Channel 3
    },

    /**
     * Adds a notification from an Action Packet
     * @param {Object} actionPacket The action packet object
     */
    notifyFromActionPacket: function(actionPacket) {

        // We should not show notifications if we haven't yet done the initial notifications load yet
        if (!notify.initialLoadComplete || notify.isUnwantedNotification(actionPacket)) {
            return false;
        }

        // Construct the notification object
        var newNotification = {
            data: actionPacket,                             // The action packet
            id: makeid(10),                                 // Make random ID
            seen: false,                                    // New notification, so mark as unread
            timeDelta: 0,                                   // Time since notification was sent
            timestamp: unixtime(),                          // Get the current timestamps in seconds
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
        if (newNotification.type === 'put' && !this.getUserEmailByTheirHandle(newNotification.userHandle)) {
            console.assert(newNotification.userHandle && newNotification.userHandle.length === 11);

            // Once the email is fetched it will re-call the notifyFromActionPacket function with the same actionPacket
            notify.fetchUserEmailFromApi(newNotification.userHandle, actionPacket);
            return false;
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
     * Fetches the user's email address from the API based on the user handle
     * @param {String} userHandle The user handle to fetch the email address for e.g. 555wupYjkMU
     * @param {Object} actionPacket An action packet which will be resent to the notifyFromActionPacket function after
     *                              the user's email has been returned. An example 'put' action packet for testing is:
     *                              {"a":"put","n":"U8oHEL7Q","u":"555wupYjkMU","f":[{"h":"F5QQSDJR","t":0}]}
     */
    fetchUserEmailFromApi: function(userHandle, actionPacket) {

        'use strict';

        // Make User Get Email (uge) request to get the user's email address from the user handle
        M.req({a: 'uge', 'u': userHandle}).done(function(result) {

            // Update the local state with the user's email
            notify.userEmails[userHandle] = result;

            // Re-call the notify function with the action packet now that the email has been stored
            notify.notifyFromActionPacket(actionPacket);
        });
    },

    /**
     * Check whether we should omit a notification.
     * @param {Object} notification
     * @returns {Boolean}
     */
    isUnwantedNotification: function(notification) {

        var action;

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
            default:
                break;
        }
        return false;
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

        // we only for now combine "put" and "d" (del)
        if (currentNotification.type !== 'put' && currentNotification.type !== 'd') {
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
                newNotifications++;
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

        // Update page title
        megatitle();

        // Update IPC indicator
        delay('updateIpcRequests', updateIpcRequests);
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

        // Loop through the notifications and mark them as seen (read)
        for (var i = 0; i < notify.notifications.length; i++) {
            notify.notifications[i].seen = true;
        }

        // Hide red circle with number of new notifications
        notify.$popupNum.addClass('hidden');
        notify.$popupNum.html(0);

        // Update page title
        megatitle();

        // Send 'set last acknowledged' API request to inform it which notifications have been seen
        // up to this point then they won't show these notifications as new next time they are fetched
        if (!remote) {
            api_req({ a: 'sla', i: requesti });
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
                notify.openPopup();
            }
        });
    },

    /**
     * Opens the notification popup with notifications
     */
    openPopup: function() {

        // Show the popup
        notify.$popup.removeClass('hidden');
        notify.$popupIcon.addClass('active');

        topPopupAlign('.top-icon.notification', notify.$popup, 40);

        // Render and show notifications currently in list
        notify.renderNotifications();
    },

    /**
     * Closes the popup. If the popup is currently open and a) the user clicks onto a new page within Mega or b) clicks
     * outside of the popup then this will mark the notifications as read. If the popup is not open, then functions
     * like $.hideTopMenu will try to hide any popups that may be open, but in this scenario we don't want to mark the
     * notifications as seen/read, we want the number of new notifications to remain in the red tooltip.
     */
    closePopup: function() {

        // Make sure it is actually visible (otherwise any call to $.hideTopMenu in index.js could trigger this
        if ((notify.$popup !== null) && (!notify.$popup.hasClass('hidden'))) {

            // Hide the popup
            notify.$popup.addClass('hidden');
            notify.$popupIcon.removeClass('active');

            // Mark all notifications as seen seeing the popup has been opened and they have been viewed
            notify.markAllNotificationsAsSeen();
        }
        else {
            // Otherwise this call probably came from $.hideTopMenu in index.js so just hide the popup
            notify.$popup.addClass('hidden');
        }
    },

    /**
     * Sort the notifications so the most recent ones appear first in the popup
     */
    sortNotificationsByMostRecent: function() {

        notify.notifications.sort(function(notificationA, notificationB) {

            if (notificationA.timestamp > notificationB.timestamp) {
                return -1;
            }
            else if (notificationA.timestamp < notificationB.timestamp) {
                return 1;
            }
            else {
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
     * Retrieve the email associated to an user by his/their handle.
     * @param {String} userHandle the
     * @returns {Object} or false if not found.
     */
    getUserEmailByTheirHandle: function(userHandle) {
        'use strict';
        return M.getUserByHandle(userHandle).m || this.userEmails[userHandle] || false;
    },

    /**
     * To do: render the notifications in the popup
     */
    renderNotifications: function() {

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
        notify.$popup.find('.notification-scr-list').append(allNotificationsHtml);
        notify.$popup.removeClass('empty loading');

        // Add scrolling for the notifications
        notify.setHeightForNotifications();
        notify.initPopupScrolling();

        // Add click handlers for various notifications
        notify.initFullContactClickHandler();
        notify.initShareClickHandler();
        notify.initTakedownClickHandler();
        notify.initPaymentClickHandler();
        notify.initPaymentReminderClickHandler();
        notify.initAcceptContactClickHandler();
    },

    /**
     * Sets the height of the notification dialog so it shows all the notifications
     * that it can. If there are only a few notifications the height will only be
     * as high as those few notifications.
     */
    setHeightForNotifications: function () {

        var $jspContainer = notify.$popup.find('.jspContainer');
        var $notificationScrollList = notify.$popup.find('.notification-scr-list');

        // Get the heights
        var heightOfAllNotifications = $notificationScrollList.height();
        var maxNotificationsHeight = $jspContainer.css('max-height');

        // Set the initial height
        var newHeight = heightOfAllNotifications;

        // If the limit is exceeded, set it to the maximum
        if (newHeight > maxNotificationsHeight) {
            newHeight = maxNotificationsHeight;
        }

        // Set the height
        $jspContainer.css('height', newHeight);
    },

    /**
     * Initialise scrolling on the notifications popup
     */
    initPopupScrolling: function() {

        // Initialise scrolling on the popup
        $('.notification-scroll').jScrollPane({
            showArrows: true,
            arrowSize: 5
        });

        jScrollFade('.notification-scroll');
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
                loadSubPage('fm/' + $(this).attr('data-contact-handle'));
                notify.closePopup();
            } else {
                msgDialog('info', '', l[20427]);
            }
        });
    },

    /**
     * On click of a share or new files/folders notification, go to that share
     */
    initShareClickHandler: function() {

        // Select the notifications with shares or new files/folders
        this.$popup.find('.notification-item.nt-incoming-share, .notification-item.nt-new-files').rebind('click', function() {

            // Get the folder ID from the HTML5 data attribute
            var folderId = $(this).attr('data-folder-id');

            // Mark all notifications as seen (because they clicked on a notification within the popup)
            notify.markAllNotificationsAsSeen();

            // Open the folder
            M.openFolder(folderId)
                .always(function() {
                    reselect(true);
                });
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

            // Mark all notifications as seen (because they clicked on a notification within the popup)
            notify.markAllNotificationsAsSeen();

            if (parentFolderId) {
                // Open the folder
                M.openFolder(parentFolderId)
                    .always(function() {
                        reselect(true);
                    });
            }
        });
    },

    /**
     * If they click on a payment notification, then redirect them to the Account History page
     */
    initPaymentClickHandler: function() {

        // On payment notification click
        this.$popup.find('.notification-item.nt-payment-notification').rebind('click', function() {

            // Mark all notifications as seen (because they clicked on a notification within the popup)
            notify.markAllNotificationsAsSeen();
            var $target = $('.data-block.account-balance');

            // Redirect to payment history
            loadSubPage('fm/account/plan');
            mBroadcaster.once('settingPageReady', function () {
                $('.fm-account-main').data('jsp').scrollToElement($target, true, false);
            });
        });
    },

    /**
     * If they click on a payment reminder notification, then redirect them to the Pro page
     */
    initPaymentReminderClickHandler: function() {

        // On payment reminder notification click
        this.$popup.find('.notification-item.nt-payment-reminder-notification').rebind('click', function() {

            // Mark all notifications as seen (because they clicked on a notification within the popup)
            notify.markAllNotificationsAsSeen();

            // Redirect to pro page
            loadSubPage('pro');
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
            M.acceptPendingContactRequest(pendingContactId);

            // Show the Accepted icon and text
            $this.closest('.notification-item').addClass('accepted');

            // Mark all notifications as seen (because they clicked on a notification within the popup)
            notify.markAllNotificationsAsSeen();

            // Update IPC indicator
            delay('updateIpcRequests', updateIpcRequests, 1000);
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
        var customIconNotifications = ['psts', 'pses', 'ph'];   // Payment & Takedown notification types
        var userEmail = l[7381];    // Unknown
        var avatar = '';

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
            userEmail = this.getUserEmailByTheirHandle(userHandle) || data && data.m || userEmail;
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
                return notify.renderPayment($notificationHtml, notification);
            case 'pses':
                return notify.renderPaymentReminder($notificationHtml, notification);
            case 'ph':
                return notify.renderTakedown($notificationHtml, notification);
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
        var className = '';
        var title = '';

        // Check if a newer contact request for this user has already been rendered (notifications are sorted by timestamp)
        for (var i = 0, length = notify.renderedContactRequests.length; i < length; i++) {

            // If this contact request has already been rendered, don't render the current notification with buttons
            if (pendingContactId === notify.renderedContactRequests[i]) {
                mostRecentNotification = false;
            }
        }

        // If this is the most recent contact request from this user
        if (mostRecentNotification) {

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
            title = l[7145];        // Contact relationship established

            // Add a data attribute for the click handler
            $notificationHtml.attr('data-contact-handle', userHandle);
            $notificationHtml.addClass('clickable');
        }
        else if (action === 2) {
            className = 'nt-contact-deleted';
            title = l[7144];        // Account has been deleted/deactivated
        }
        else if (action === 3) {
            className = 'nt-contact-request-blocked';
            title = l[7143];        // Blocked you as a contact
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

        if (itemsNumber > 1) {
            title = l[8913].replace('[X]', itemsNumber);// Removed [X] items from a share
        }
        else {
            title = l[8910];// Removed item from shared folder
        }

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
        if ((folderCount > 1) && (fileCount > 1)) {
            notificationText = l[828].replace('[X1]', folderCount).replace('[X2]', fileCount);  // [X1] folders and [X2] files
        }
        else if ((folderCount > 1) && (fileCount == 1)) {
            notificationText = l[829].replace('[X]', folderCount);  // [X] folders and 1 file
        }
        else if ((folderCount == 1) && (fileCount > 1)) {
            notificationText = l[830].replace('[X]', fileCount);    // 1 folder and [X] files
        }
        else if ((folderCount == 1) && (fileCount == 1)) {
            notificationText = l[831];                              // 1 folder and 1 file
        }
        else if (folderCount > 1) {
            notificationText = l[832].replace('[X]', folderCount);  // [X] folders
        }
        else if (fileCount > 1) {
            notificationText = l[833].replace('[X]', fileCount);    // [X] files
        }
        else if (folderCount == 1) {
            notificationText = l[834];  // 1 folder
        }
        else if (fileCount == 1) {
            notificationText = l[835];  // 1 file
        }

        // Set wording of the title
        if (email) {
            title = l[836].replace('[X]', email);
            title = title.replace('[DATA]', notificationText);  // [X] added [DATA]
        }
        else if ((fileCount + folderCount) > 1) {
            title = l[837].replace('[X]', notificationText);    // [X] have been added
        }
        else {
            title = l[838].replace('[X]', notificationText);    // [X] has been added
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

        var proLevel = notification.data.p;
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
            var title = (days === 1) ? l[8596] : l[8597].replace('%1', days);

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
        var type = (node.t === 0) ? l[5557] : l[5561];

        // Takedown notice
        // Your publicly shared %1 (%2) has been taken down.
        if (typeof notification.data.down !== 'undefined') {
            header = l[8521];
            title = l[8522].replace('%1', type).replace('(%2)', name);
            cssClass = 'nt-takedown-notification';
        }

        // Takedown reinstated
        // Your taken down %1 (%2) has been reinstated.
        else if (typeof notification.data.up !== 'undefined') {
            header = l[8524];
            title = l[8523].replace('%1', type).replace('(%2)', name);
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
    }
};
