/**
 * Functionality for the Notifications popup and notifications page
 */
var notifyPopup = {

    notifications: null,
    temporarilyHiddenContactRequests: [],
    renderedPendingContactRequests: [],
    userEmails: {},
    
    /**
     * Setup the notifications popup
     */
    initNotifications: function() {

        // Initialise the Notification tooltip
        var numUnreadNotifications = notifyPopup.countUnreadNotifications();
        notifyPopup.initNotificationsTooltip(numUnreadNotifications);

        // When the Notifications icon is clicked
        $('.cloud-popup-icon').unbind('click');
        $('.cloud-popup-icon').bind('click', function () {

            // If the popup is not open already
            if ($(this).attr('class').indexOf('active') == -1) {

                // Change the icon to brighter colour
                $(this).addClass('active');

                // Calculate the position of the Notifications popup so it is centered beneath the Notifications icon
                var popupPosition = $('.cloud-popup-icon').offset().left - 40;

                // Set the position of the Notifications popup and open it
                $('.notification-popup').css('left', popupPosition + 'px');
                $('.notification-popup .notification-arrow').css('margin-left', '-21px');
                $('.notification-popup').addClass('active');

                notifyPopup.notifyClock();
            }
            else {
                // Close the Notifications popup
                notifyPopup.notifyMarkCount(true);
                notifyPopup.notifyCounter();
                $(this).removeClass('active');
                $('.notification-popup').removeClass('active');
            }
        });

        // Hide the Notification popup when the user resizes the window, then the user needs to re-click 
        // the Notification icon to show the popup and it will correctly re-calculate its opening position
        $(window).resize(function () {
            $('.cloud-popup-icon').removeClass('active');
            $('.notification-popup').removeClass('active');
        });

        // When they click the notification for a contact notification it will go to the Contacts page
        $('.notification-scr-list').on('click', '.nt-contact-accepted, .nt-contact-deleted', function(event) {
            document.location.hash = 'fm/contacts';
        });
        
        // When they click the notification for a request denied/blocked it will go to the Pending Requests page (to do)
        $('.notification-scr-list').on('click', '.nt-contact-request-denied, .nt-contact-request-blocked, .nt-contact-request-ignored', function(event) {
            document.location.hash = 'fm/contacts';
        });

        // Initialise click event for existing and future notifications that appear in the 
        // Notification popup which have an Accept or Not now button for contact requests
        $('.notification-scr-list, .new-notification-pad').on('click', '.notifications-button', function(event) {

            var button = $(this);
            var notificationId = button.attr('data-notification-id');
            var pendingContactId = button.attr('data-pending-contact-id');

            // Stop the click bubbling up and going to the contacts screen
            event.stopPropagation();

            // If the user does not want to accept the request right now
            if (button.hasClass('not-now')) {
                
                // Add this to the hidden requests so it will not show this notification again for this session                
                notifyPopup.temporarilyHiddenContactRequests.push(pendingContactId);
                
                // Hide the buttons
                button.closest('.notification-item').addClass('not-now');
            }
            else {
                // Send the User Pending Contact Action (upca) API 2.0 request to accept the request
                M.acceptPendingContactRequest(pendingContactId);

                // Show the Accepted icon and text
                button.closest('.notification-item').addClass('accepted');    
            }
            
            // Update popup counter
            notifyPopup.markSpecificNotificationAsRead(notificationId);
        });

        $('.notifications-button.red').unbind('click');
        $('.notifications-button.red').bind('click', function ()
        {
            $('.cloud-popup-icon').removeClass('active');
            $('.notification-popup').removeClass('active');
            document.location.hash = 'fm/notifications';
        });

        $('.notifications-button.clear-button').unbind('click');
        $('.notifications-button.clear-button').bind('click', function ()
        {
            $('.notification-popup').addClass('no-new-notifications');
            var jsp = $('.notification-scroll').data('jsp');
            if (jsp)
            {
                jsp.destroy();
            }
            
            // Mark all notifications [] counted
            notifyPopup.markNotificationsCounted();
            notifyPopup.notifyCounter();
            
            // Update the server so we don't see these again
            api_req({ a: 'sla', i: requesti });
        });

        notifyPopup.notifyCounter();
    },

    /**
     * Sets a notification to read. Useful for when clicking Accept on an incoming pending contact notification
     * @param {String} notificationId
     */
    markSpecificNotificationAsRead: function(notificationId) {
        
        // Search the notifications
        for (var i = 0, length = notifyPopup.notifications.length; i < length; i++) {
            
            // If a match on the id
            if (notifyPopup.notifications[i].id === notificationId) {
                
                // Mark the notification as read
                notifyPopup.notifications[i].read = true;
                notifyPopup.notifications[i].count = true;
                break;
            }
        }
        
        // Update red circle and tooltip
        notifyPopup.notifyCounter();
        
        // Update server so it knows which notifications the user has seen
        //api_req({ a: 'sla', i: requesti });
    },

    /**
     * Get 100 latest notifications
     */
    pollNotifications: function() {
        
        // If the notifications haven't been loaded yet
        if (u_type == 3 && notifyPopup.notifications == null) {
            
            // Create an array for all the notifications
            notifyPopup.notifications = [];

            if (M.currentdirid == 'notifications') {
                loadingDialog.show();
            }

            // Make API request to get the latest 100 notifications
            api_req('c=100', {
                callback: function (json, params) {

                    if (typeof json == 'object' && json.fsn && u_type) {

                        if (M.currentdirid == 'notifications') {
                            loadingDialog.hide();
                        }

                        // Clear existing notifications
                        notifyPopup.notifications = [];

                        // Get the current UNIX timestamp
                        var currentTime = Math.floor(new Date().getTime() / 1000);

                        // Loop through the received notifications
                        for (var i in json.c) {

                            // Add notification
                            notifyPopup.notifications.push({
                                id: makeid(10),
                                type: json.c[i].t,
                                timestamp: currentTime - json.c[i].td,
                                user: json.c[i].u,
                                folderid: json.c[i].n,
                                nodes: json.c[i].f,
                                read: json.c[i].td >= (json.ltd || 0),   // If the Notification time delta is newer than the last time the user sent an sla (set last action?) request then it is a new notification
                                popup: true,
                                count: json.c[i].td >= (json.ltd || 0),
                                rendered: true,
                                notificationObj: json.c[i]      // The full notification object                       
                            });                        
                        }

                        notifyPopup.doNotify();
                        $('.cloud-popup-icon').show();
                    }
                }
            }, 3);
        }
    },
    
    /**
     * Show the number of notifications in a red circle in the menu bar
     */
    notifyCounter: function() {
        
        if (notifyPopup.notifications === null) {
            return false;
        }

        var numOfNotifications = 0;
        $.each(notifyPopup.notifications, function (i, notification)
        {
            if (!notification.count) {
                numOfNotifications++;
            }
        });

        // If no new notifications, hide the red circle
        if (numOfNotifications == 0) {
            $('.notification-num').css('display', 'none');
        }
        else {
            $('.notification-num').css('display', 'inline-block');
        }

        // Update the number of new notifications in the tooltip
        $('.notification-num').text(numOfNotifications);
        notifyPopup.initNotificationsTooltip(numOfNotifications);

        megatitle();
    },
    
    /**
     * Hideously long function that needs to be refactored
     */
    doNotify: function() {
        
        if (notifyPopup.notifications === null) {
            return false;
        }
        
        notifyPopup.userEmails = {};
        
        if (M && M.u) {
            for (var i in M.u) {
                notifyPopup.userEmails[i] = M.u[i].m;
            }
        }

        // Sort the notifications
        notifyPopup.sortNotificationsByMostRecent();

        var phtml = '', nhtml = '';
        var i = 0, notificationCount = 0;
        var currentDate = false;
        notifyPopup.renderedPendingContactRequests = [];

        // Process each notification
        $.each(notifyPopup.notifications, function (i, notification)
        {
            // Don't show more than 100 notifications and don't show on the notifications page
            if ((i > 100) && (page != 'notifications')) {
                return false;
            }

            // Get the notification date
            var notificationDate = new Date(notification.timestamp * 1000).getFullYear() + '-' + new Date(notification.timestamp * 1000).getMonth() + '-' + new Date(notification.timestamp * 1000).getDate();

            if (currentDate != notificationDate) {
                nhtml += notifyPopup.getNotificationDateHtml(notification.timestamp * 1000);
                currentDate = notificationDate;
            }

            var obj = false;

            // If an Incoming Pending Contact (IPC) action packet
            if (notification.type === 'ipc') {            
                obj = notifyPopup.renderIncomingPendingContactNotification(notification);
            }
            else if (notification.type === 'c') {
                obj = notifyPopup.renderContactChangeNotification(notification);
            }            
            else if (notification.type == 'upci') {
                obj = notifyPopup.renderUpdatedPendingContactNotificationIncoming(notification);
            }
            else if (notification.type == 'upco') {
                obj = notifyPopup.renderUpdatedPendingContactNotificationOutgoing(notification);
            }
            else if (notification.type == 'share') {
                obj = notifyPopup.renderNewShareNotification(notification);                
            }
            else if (notification.type == 'dshare') {
                obj = notifyPopup.renderRevokedShareNotifications(notification);
            }
            else if (notification.type == 'put') {
                obj = notifyPopup.renderPutNodeNotifications(notification);
            }            
            else if (notification.type == 'psts') {
                obj = notifyPopup.renderPaymentNotification(notification);
            }

            if (obj) {                        
                nhtml += obj.nhtml;
                var max = Math.floor(($('body').height() - 50) / 70);

                if (max > 10) {
                    max = 10;
                }

                if (i < max) {
                    phtml += obj.rhtml;
                }

                if (!notification.popup) {
                    notification.popup = true;
                    notifyPopup.doNotifyPopup(notification.id, obj.phtml);
                }
            }

            // If the Notification time delta is newer than the last time the user sent an sla (set last action?) request then it is a new notification
            if (!notification.count) {
                notificationCount++;
            }
        });

        // If on the notifications page, render the HTML for that
        if (M.currentdirid == 'notifications') {
            notifyPopup.renderNotificationsPageSpecificHtml(nhtml);
        }
                        
        // If no notifications at all
        if ((notifyPopup.notifications.length === 0) && (notificationCount === 0)) {

            // Display that there is no new notifications
            $('.notification-num').text(0);
            $('.notification-num').css('display', 'none');
            $('.notification-popup').addClass('empty');
            $('.nt-main-block').addClass('empty');

            // Hide Clear and See all notifications buttons
            $('.notification-popup .fm-notifications-bottom').addClass('hidden');
        }

        // If only read notifications
        else if (notificationCount === 0) {

            // Display that there is no new notifications
            $('.notification-num').text(0);
            $('.notification-num').css('display', 'none');
            $('.notification-popup').addClass('no-new-notifications');
            $('.notification-popup').removeClass('empty');
            $('.nt-main-block').removeClass('empty');

            // Hide clear button
            $('.notification-popup .fm-notifications-bottom').removeClass('hidden');
        }
        else {
            // Show the new notifications
            $('.notification-num').text(notificationCount);
            $('.notification-num').css('display', 'inline-block');
            $('.notification-popup').removeClass('no-new-notifications');
            $('.notification-popup').removeClass('empty');
            $('.nt-main-block').removeClass('empty');

            // Show clear and add buttons
            $('.notification-popup .fm-notifications-bottom').removeClass('hidden');
        }

        // Update the number of new notifications in the tooltip
        notifyPopup.initNotificationsTooltip(notificationCount);

        // Add the notifications inside the popup
        $('.notification-scr-list').html(phtml);

        var jsp = $('.notification-scroll').data('jsp');
        if (jsp) {
            jsp.destroy();
        }

        // Initialise scrolling on the popup
        $('.notification-scroll').jScrollPane({ showArrows: true, arrowSize: 5 });
        jScrollFade('.notification-scroll');
        
        // Add functionality for when a notification is clicked
        notifyPopup.initClickOnNotification();
        
        // Show the number of new notifications in the Browser's title bar
        megatitle();
    },
    
    /**
     * Open the shared folder for a notification if the user clicks on it inside the popup
     */
    initClickOnNotification: function() {
        
        $('.notification-item.nt-new-files, .notification-item.nt-incoming-share, .notification-item.nt-revocation-of-incoming, .notification-item.nt-deleted-files').rebind('click', function() {
               
            notifyPopup.notifyMarkCount(true);
            notifyPopup.notifyCounter();

            var id = $(this).attr('id');
            if (id) {
                for (var i in notifyPopup.notifications) {
                    
                    if (notifyPopup.notifications[i].id == id && (notifyPopup.notifications[i].type == 'put' || notifyPopup.notifications[i].type == 'share')) {
                        
                        $.selected = [];
                        for (var j in notifyPopup.notifications[i].nodes) {
                            $.selected.push(notifyPopup.notifications[i].nodes[j].h);
                        }
                        
                        M.openFolder(notifyPopup.notifications[i].folderid);
                        reselect(1);
                    }
                }
            }
        });        
    },
    
    /**
     * Render the HTML specifically for the notifications page
     * @param {String} nhtml
     */
    renderNotificationsPageSpecificHtml: function(nhtml) {
                
        notifyPopup.notifyMarkCount(true);
        notifyPopup.notifyCounter();

        $('.new-notification-pad').html(nhtml);
        $('.nt-info-txt, .new-notification-pad .notification-type').unbind('click');
        $('.nt-info-txt, .new-notification-pad .notification-type').bind('click', function(e) {
            var id = $(this).attr('id');
            if (id) {
                id = id.replace('no_', '');
                id = id.replace('type_', '');
                id = id.replace('txt_', '');

                for (var i in notifyPopup.notifications) {
                    if (notifyPopup.notifications[i].id == id && (notifyPopup.notifications[i].type == 'put' || notifyPopup.notifications[i].type == 'share')) {

                        $.selected = [];						
                        for (var j in notifyPopup.notifications[i].nodes) {
                            $.selected.push(notifyPopup.notifications[i].nodes[j].h);
                        }

                        M.openFolder(notifyPopup.notifications[i].folderid);
                        reselect(1);
                    }
                }
            }
        });

        notifyPopup.initNotificationsScrolling();             
    },
    
    /**
     * Sort the notifications so the most recent ones appear first in the popup
     */
    sortNotificationsByMostRecent: function() {
        
        notifyPopup.notifications.sort(function (a, b) {

            if (a.timestamp > b.timestamp) {
                return -1;
            }
            else if (a.timestamp < b.timestamp) {
                return 1;
            }
            else {
                return 0;
            }
        });        
    },
    
    /**
     * Initialises scrolling on the Notifications page
     */
    initNotificationsScrolling: function() {
        
        $('.new-notifications-scroll').jScrollPane({
            enableKeyboardNavigation: false,
            showArrows: true,
            arrowSize: 5,
            verticalDragMinHeight: 250
        });
        
        jScrollFade('.new-notifications-scroll');
    },
    
    /**
     * Render notifications for when another user has added files/folders into an already shared folder
     * @param {Object} notification
     * @return {Object}
     */
    renderPutNodeNotifications: function(notification) {
                
        var nodes = notification.nodes;
        var fileCount = 0;
        var folderCount = 0;
        var notificationText = '';
        var title = '';

        for (var j in nodes) {
            if (nodes[j].t == 1) {
                folderCount++;
            }
            else {
                fileCount++;
            }
        }

        if ((folderCount > 1) && (fileCount > 1)) {
            notificationText = l[828].replace('[X1]', folderCount).replace('[X2]', fileCount);
        }
        else if ((folderCount > 1) && (fileCount == 1)) {
            notificationText = l[829].replace('[X]', folderCount);
        }
        else if ((folderCount == 1) && (fileCount > 1)) {
            notificationText = l[830].replace('[X]', fileCount);
        }
        else if ((folderCount == 1) && (fileCount == 1)) {
            notificationText = l[831];
        }
        else if (folderCount > 1) {
            notificationText = l[832].replace('[X]', folderCount);
        }
        else if (fileCount > 1) {
            notificationText = l[833].replace('[X]', fileCount);
        }
        else if (folderCount == 1) {
            notificationText = l[834];
        }
        else if (fileCount == 1) {
            notificationText = l[835];
        }
        if (notifyPopup.userEmails[notification.user]) {
            title = l[836].replace('[X]', htmlentities(notifyPopup.userEmails[notification.user])).replace('[DATA]', notificationText);
        }
        else if ((fileCount + folderCount) > 1) {
            title = l[837].replace('[X]', notificationText);
        }
        else {
            title = l[838].replace('[X]', notificationText);
        }

        return notifyPopup.getNotificationHtml(notification.id, 'put', title, notification.timestamp, notification.read, notification.user);        
    },
    
    /**
     * Render the HTML for a revoked share notification
     * @param {Object} notification
     * @returns {Object} The HTML to be rendered for the notification
     */
    renderRevokedShareNotifications: function(notification) {
        
        var title = '';
        
        if (notifyPopup.userEmails[notification.user]) {
            title = l[826].replace('[X]', htmlentities(notifyPopup.userEmails[notification.user]));
        }
        else {
            title = l[827];
        }
        
        return notifyPopup.getNotificationHtml(notification.id, 'dshare', title, notification.timestamp, notification.read, notification.user);
    },
    
    /**
     * Render new share notifications
     * @param {Object} notification
     * @returns {Object} The HTML to be rendered for the notification
     */
    renderNewShareNotification: function(notification) {
        
        var title = '';
        
        if (notifyPopup.userEmails[notification.user]) {
            title = l[824].replace('[X]', htmlentities(notifyPopup.userEmails[notification.user]));
        }
        else {
            title = l[825];
        }
        
        return notifyPopup.getNotificationHtml(notification.id, 'share', title, notification.timestamp, notification.read, notification.user);  
    },
    
    /**
     * Renders Incoming Pending Contact notifications
     * See new API spec: https://wiki.developers.mega.co.nz/API_Spec
     * @param {Object} notification The notification
     * @returns {Object} The HTML to be rendered for the notification
     */
    renderIncomingPendingContactNotification: function(notification) {

        var notificationId = notification.id;
        var timestamp = notification.timestamp;
        var email = (notification.notificationObj.m) ? notification.notificationObj.m : notification.notificationObj.u[0].m;
        var pendingContactId = notification.notificationObj.p;                        
        var pendingContactHtml = '';
        var type = '';
        var message = '';
        var mostRecentNotification = true;
        
        // Check if a newer contact request for this user has already been rendered (notifications are sorted by timestamp)
        for (var i = 0, length = notifyPopup.renderedPendingContactRequests.length; i < length; i++) {

            // If this contact request has already been rendered, don't render the current notification with buttons
            if (pendingContactId === notifyPopup.renderedPendingContactRequests[i]) {
                mostRecentNotification = false;
            }
        }

        // If this is the most recent IPC from this user
        if (mostRecentNotification) {
            
            // If this notification also exists in the state
            if (M.ipc[pendingContactId]) {
                
                // Render the Accept/Not now buttons
                pendingContactHtml = '<span class="notification-request-buttons">'
                                   +    '<span class="fm-dialog-button notifications-button accept" data-notification-id="' + notificationId + '" data-pending-contact-id="' + pendingContactId + '"><span>Accept</span></span>'
                                   +    '<span class="fm-dialog-button notifications-button not-now" data-notification-id="' + notificationId + '" data-pending-contact-id="' + pendingContactId + '"><span>Not now</span></span>'
                                   + '</span>';
            }
            
            // Set a flag so the buttons are not rendered again on older notifications
            notifyPopup.renderedPendingContactRequests.push(pendingContactId);
        };
        
        // Search the contact requests that the user has temporarily hidden
        for (var i = 0, length = notifyPopup.temporarilyHiddenContactRequests.length; i < length; i++) {

            // If the user has opted to temporarily hide the contact request then don't show it
            if (notifyPopup.temporarilyHiddenContactRequests[i] === pendingContactId) {

                // Don't display the buttons for this notification
                pendingContactHtml = '';
            }
        }
        
        // If the other user deleted their contact request to the current user
        if (typeof notification.notificationObj.dts != 'undefined') {        
            type = 'contactDeleted';
            message = 'Cancelled their contact request';
            pendingContactHtml = '';
        }

        // If the other user sent a reminder about their contact request
        else if (typeof notification.notificationObj.rts != 'undefined') {
            type = 'contactRequest';
            message = 'Reminder: you have a contact request';
        }    
        else {
            // Creates notification with "Sent you a contact request" with 'Not now' & 'Accept' buttons
            type = 'contactRequest';
            message = l[5851];
        }

        return notifyPopup.getNotificationHtml(notification.id, type, message, timestamp, notification.read, null, email, pendingContactHtml);
    },

    /**
     * Renders Updated Pending Contact (Outgoing) notifications
     * https://wiki.developers.mega.co.nz/API_Spec
     * @param {Object} notification The notification
     * @returns {Object|false} The HTML to be rendered for the notification or false if not applicable
     */
    renderUpdatedPendingContactNotificationOutgoing: function(notification) {

        // Get the details from the action packet
        var timestamp = notification.timestamp;
        var email = (notification.notificationObj.m) ? notification.notificationObj.m : notification.notificationObj.u[0].m;
        var action = (notification.notificationObj.s) ? notification.notificationObj.s : notification.notificationObj.u[0].s;
        var type = '';
        var message = '';

        // If the user deleted the request
        if (action === 2) {                
            type = 'contactAccepted';
            message = l[5852];
        }
        else if (action === 3) {
            type = 'contactRequestDenied';
            message = l[5853];
        }
        else {
            return false;
        }

        return notifyPopup.getNotificationHtml(notification.id, type, message, timestamp, notification.read, null, email);
    },

    /**
     * Renders Updated Pending Contact (Incoming) notifications
     * @param {Object} notification The notification
     * @returns {Object|false} The HTML to be rendered for the notification or false if not applicable
     */
    renderUpdatedPendingContactNotificationIncoming: function(notification) {

        // Get the details from the action packet
        var timestamp = notification.timestamp;
        var email = (notification.notificationObj.m) ? notification.notificationObj.m : notification.notificationObj.u[0].m;
        var action = (notification.notificationObj.s) ? notification.notificationObj.s : notification.notificationObj.u[0].s;        
        var type = '';
        var message = '';

        // If the user deleted the request
        if (action === 1) {
            type = 'contactRequestIgnored';
            message = 'You ignored a contact request';
        }
        else if (action === 2) {                
            type = 'contactAccepted';
            message = 'You accepted a contact request';
        }
        else if (action === 3) {
            type = 'contactRequestDenied';
            message = 'You denied a contact request';
        }
        else {
            return false;
        }

        return notifyPopup.getNotificationHtml(notification.id, type, message, timestamp, notification.read, null, email);
    },
    
    /**
     * Renders notifications related to contact changes
     * @param {Object} notification The notification
     * @returns {Object} The HTML to be rendered for the notification
     */
    renderContactChangeNotification: function(notification) {

        // Get the details from the action packet
        var timestamp = notification.timestamp;
        var email = (notification.notificationObj.m) ? notification.notificationObj.m : notification.notificationObj.u[0].m;
        var action = (notification.notificationObj.c) ? notification.notificationObj.c : notification.notificationObj.u[0].c;
        var type = '';
        var message = '';

        // If the user deleted the request
        if (action === 0) {
            type = 'contactDeleted';
            message = 'Deleted you as a contact';
        }
        else if (action === 1) {
            type = 'contactAccepted';
            message = 'You are both now contacts';
        }
        else if (action === 2) {
            type = 'contactDeleted';
            message = 'Account has been deleted/deactivated';
        }
        else if (action === 3) {
            type = 'contactBlocked';
            message = 'Blocked you as a contact';
        }

        return notifyPopup.getNotificationHtml(notification.id, type, message, timestamp, notification.read, null, email);
    },
    
    /**
     * Process payment notification sent from payment provider e.g. Coinify
     * To test run: addNotification({'a':'psts', 'p':4, 'r':'f'})
     * @param {Object} notification The action packet {'a':'psts', 'p':<prolevel>, 'r':<s for success or f for failure>}
     */
    renderPaymentNotification: function(notification) {
    
        var actionPacket = notification.notificationObj;
        var timestamp = notification.timestamp;
        var proLevel = actionPacket.p;
        var proPlan = getProPlan(proLevel);
        var success = (actionPacket.r === 's') ? true : false;        
        var message = 'Your payment for the ' + proPlan + ' plan was unsuccessful.';
        var type = 'proPayment';
        
        if (success) {
            message = 'Your payment was received and your account is now on the ' + proPlan + ' plan.';
        }

        return notifyPopup.getNotificationHtml(notification.id, type, message, timestamp, notification.read, null);
    },
    
    /**
     * Refresh the notifications every second if the popup is open
     */
    notifyClock: function() {
        
        if ($('.cloud-popup-icon').attr('class').indexOf('active') > 0) {
            
            notifyPopup.doNotify();
            var node = ((notifyPopup.notifications !== null) && notifyPopup.notifications[0]);

            if ((node) && (node.timestamp * 1000 > new Date().getTime() - 60000)) {
                setTimeout(notifyPopup.notifyClock, 990);
            }
            else {
                setTimeout(notifyPopup.notifyClock, 60000);
            }
        }
    },
        
    hideNotifyPopup: function(id) {
        
        if ((id) && ($('#popup_' + id).css('opacity') == 1)) {            
            $('#popup_' + id).css('opacity', 1).show().animate({ opacity: 0 });
            setTimeout(notifyPopup.removeNotifyPopup, 1000);
        }
    },
    
    removeNotifyPopup: function() {
        
        $('.nt-popup').each(function (id, el) {
            if ($(el).css('opacity') == 0)
                $(el).remove();
        });
    },
    
    notifyMarkCount: function(notificationRead) {
        
        var notificationsChanged = 0;

        for (var i in notifyPopup.notifications) {
            
            var notification = notifyPopup.notifications[i];
            notification.count = true;
            
            if (notificationRead && !notification.read) {
                notification.read = true;
                notificationsChanged++;
            }
        }
        
        if (notificationRead && $.maxnotification !== maxaction && notificationsChanged > 0) {
            $.maxnotification = maxaction;
            api_req({ a: 'sla', i: requesti });
        }
    },
    
    markNotificationsRead: function() {
        
        for (var i in notifyPopup.notifications) {
            
            if (notifyPopup.notifications.hasOwnProperty(i)) { 
                notifyPopup.notifications[i].count = true;
                //notifyPopup.notifications[i].read = true;
            }
        }
        
        notifyPopup.notifyCounter();
    },
    
    /**
     * Returns the number of unread notifications
     */
    countUnreadNotifications: function() {
        
        var num = 0;
        for (var i in notifyPopup.notifications) {
            
            var notification = notifyPopup.notifications[i];
            if (!notification.read) {
                num++;
            }
        }

        return num;
    },
    
    /**
     * Marks all the notifications as counted
     */
    markNotificationsCounted: function() {
        
        for (var i in notifyPopup.notifications) {
            notifyPopup.notifications[i].count = true;
        }
    },
    
    getNotificationDateHtml: function(timestamp) {
        
        var months = [l[850], l[851], l[852], l[853], l[854], l[855], l[856], l[857], l[858], l[859], l[860], l[861]];
        var month = months[new Date(timestamp).getMonth()];
        var day = new Date(timestamp).getDate();
        
        return '<div class="nt-circle-bg1"><div class="nt-circle-bg2"><div class="nt-circle-bg3"><span class="nt-circle-date">' + day + '</span><span class="nt-circle-month">' + month + '</span></div></div></div>';
    },
    
    /**
     * Gets the HTML to be rendered for each notification
     * @param {String} id
     * @param {String} type
     * @param {String} title
     * @param {Number} time
     * @param {Boolean} read
     * @param {String} userid Optional parameter, used for put & share notifications
     * @param {String} userEmail Optional parameter, used for the new contact notifications which do not have a user ID
     * @param {String} pendingContactHtml Optional parameter, used to render the Not now/Accept contact request buttons
     * @returns {Object}
     */
    getNotificationHtml: function(id, type, title, time, read, userid, userEmail, pendingContactHtml) {    

        var className = '', rhtml = '', phtml = '', nread = '', href = '', nstyle = '', nstyle2 = '', onclick = '', nhtml = '';

        if (read) {
            nread = 'read';
        }
        
        if (type == 'share') {
            className = 'nt-incoming-share';
            nstyle2 = 'style="cursor:pointer;"';
        }
        else if (type == 'put') {
            className = 'nt-new-files';
            nstyle2 = 'style="cursor:pointer;"';
        }
        else if (type == 'dshare') {
            className = 'nt-revocation-of-incoming';
            nstyle = 'style="cursor:default;"';
        }
        else if (type === 'deleted') {
            className = 'nt-deleted-files';
            nstyle2 = 'style="cursor:pointer;"';
        }
        else if (type === 'contactRequest') {
            className = 'nt-contact-request';
            nstyle = 'style="cursor:default;"';
        }
        else if (type === 'contactAccepted') {
            className = 'nt-contact-accepted';
            nstyle2 = 'style="cursor:pointer;"';
        }
        else if (type === 'contactDeleted') {
            className = 'nt-contact-deleted';
            nstyle2 = 'style="cursor:pointer;"';
        }
        else if (type === 'contactRequestDenied') {
            className = 'nt-contact-request-denied';
            nstyle2 = 'style="cursor:pointer;"';
        }
        else if (type === 'contactBlocked') {
            className = 'nt-contact-request-blocked';
            nstyle2 = 'style="cursor:pointer;"';
        }
        else if (type === 'contactRequestIgnored') {
            className = 'nt-contact-request-ignored';
            nstyle2 = 'style="cursor:pointer;"';
        }
        else if (type === 'proPayment') {
            className = 'nt-payment-notification';
            nstyle = 'style="cursor:default;"';
        }

        var email = '';
        var avatarColor = 'color1';
        var avatar = '';

        // If using the new API v2.0 for contacts, the userid will not be available, so use the email
        if (userEmail) {
            email = userEmail;
            avatarColor = email.charCodeAt(0) % 6 + email.charCodeAt(1) % 6;
            avatar = email.charAt(0) + email.charAt(1);
        }

        // Otherwise use the userid
        else if (M.u[userid]) {
            email = M.u[userid].m;
            avatarColor = email.charCodeAt(0) % 6 + email.charCodeAt(1) % 6;
            avatar = (avatars[userid] && avatars[userid].url)
                ? '<img src="' + avatars[userid].url + '">'
                : (email.charAt(0) + email.charAt(1));
        }

        rhtml += '<a class="notification-item ' + className + ' ' + nread + '" ' + nstyle + ' id="' + htmlentities(id) + '">';
        rhtml +=   '<span class="notification-status-icon">';
        rhtml +=     '<span class="notification-status"></span>';
        rhtml +=     '<span class="notification-avatar color' + avatarColor + '">' + avatar + ' <span class="notification-avatar-icon"></span></span>';
        rhtml +=     '<span class="notification-type">';
        rhtml +=       ((pendingContactHtml) ? pendingContactHtml : '');
        rhtml +=       '<span class="notification-accepted">Accepted</span>';
        rhtml +=       '<span class="notification-content">';
        rhtml +=         '<span class="notification-username">' + email + '</span>';
        rhtml +=         '<span class="notification-info">' + title + '</span>';
        rhtml +=         '<span class="notification-date">' + time2last(time) + '</span>';
        rhtml +=       '</span>';
        rhtml +=     '</span>';
        rhtml +=   '</span>';
        rhtml += '</a>';

        phtml += '<div class="nt-popup ' + className + '" id="popup_' + id + '">';
        phtml +=   '<div class="notification-type">';
        phtml +=     '<div class="notification-content">';
        phtml +=       '<div class="nt-popup-close"></div>';
        phtml +=       '<div class="notification-info" ' + nstyle2 + '>' + title + '</div>';
        phtml +=     '</div>';
        phtml +=   '</div>';
        phtml += '</div>';

        nhtml += '<div class="nt-main-date">' + time2last(time) + '</div>';
        nhtml += '<div class="nt-info-block ' + className + ' ' + nread + '" id="no_' + id + '">';
        nhtml +=   '<span class="notification-avatar color' + avatarColor + '">' + avatar + ' <span class="notification-avatar-icon"></span></span>';
        nhtml +=   '<span class="notification-status"></span>';
        nhtml +=   ((pendingContactHtml) ? pendingContactHtml : '');
        nhtml +=   '<span class="notification-accepted">Accepted</span>';
        nhtml +=   '<div class="notification-nw-pad">';
        nhtml +=     '<div class="notification-username">' + email + '</div>';
        nhtml +=     '<div class="notification-type" ' + nstyle2 + ' id="type_' + htmlentities(id) + '"></div>';
        nhtml +=     '<div class="nt-info-txt" ' + nstyle2 + ' id="txt_' + htmlentities(id) + '">' + title + '</div>';
        nhtml +=   '</div>';
        nhtml += '</div>';
        nhtml += '<div class="clear"></div>';

        return {
            nhtml: nhtml,
            rhtml: rhtml,
            phtml: phtml
        };
    },
    
    /**
     * Show the popup notifications
     * @param {String} id
     * @param {String} html
     */
    doNotifyPopup: function(id, html) {
        
        $('#popnotifications').append(html);
        $('#popup_' + id).css('bottom', ($('.nt-popup').length * 61) - 50 + 'px');
        $('#popup_' + id).css('opacity', 0).show().animate({ opacity: 1 });
        
        $('.nt-popup').bind('unbind');
        $('.nt-popup').bind('click', function (e) {
            
            var id = $(this).attr('id');
            
            if (id) {              
                id = id.replace('popup_', '');
                for (var i in notifyPopup.notifications) {
                    
                    if (notifyPopup.notifications[i].id == id && (notifyPopup.notifications[i].type == 'put' || notifyPopup.notifications[i].type == 'share')) {
                        
                        $.selected = [];
                        for (var j in notifyPopup.notifications[i].nodes) {
                            $.selected.push(notifyPopup.notifications[i].nodes[j].h);
                        }
                        
                        M.openFolder(notifyPopup.notifications[i].folderid);
                        reselect(1);
                    }
                }
                
                notifyPopup.hideNotifyPopup(id);
            }
        });

        setTimeout(notifyPopup.hideNotifyPopup, 5000, id);
    },
    
    /**
     * Create a tooltip when the user hovers over the Notification icon in the header
     * @param {Number} num The number of new notifications
     */
    initNotificationsTooltip: function(num) {

        var $tooltip = $('.new-notification-info');
        var $notificationIcon = $('.cloud-popup-icon');

        // Change wording depending on number of notifications
        if (num === 1) {
            $tooltip.text(num + ' ' + l[5854] + ' ' + l[5855]); // 1 New Notification
        }
        else {
            $tooltip.text(num + ' ' + l[5854] + ' ' + l[862]); // X New Notifications
        }

        // When the user hovers over the Notifications icon, show the number of notifications
        $notificationIcon.off('mouseenter mouseleave');
        $notificationIcon.hover(
            function() {
                $tooltip.fadeIn('fast');
            }, function() {
                $tooltip.fadeOut(100);
            }
        );
    }
};
