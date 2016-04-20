/**
 * Various warning triangle popups from the top header. This covers
 * cases for over quota, ephemeral session, non activated accounts
 * after purchase and PRO plan expired warnings.
 */
var alarm = {
        
    /** Whether the popup has been seen or not so it won't keep auto showing on new pages */
    seen: false,
    
    /**
     * Shows the warning popup
     * @param {Object} $container The dialog's container
     * @param {Object} $dialog The dialog
     */
    showWarningPopup: function($container, $dialog) {
        
        // If they have seen it already
        if (alarm.seen) {
            
            // Just show the warning icon and they can click to re-show it if they want
            $container.removeClass('hidden');
            $dialog.removeClass('active');
        }
        else {
            // Otherwise auto show the dialog and warning icon
            $container.removeClass('hidden');
            $dialog.addClass('active');
        }
    },
    
    /**
     * Hides other warning dialogs if they are currently visible so there is no double up
     */
    hideAllWarningPopups: function() {
        
        var $containers = $('.warning-popup-icon');
        var $dialogs = $containers.find('.top-warning-popup');
        
        $containers.addClass('hidden');
        $dialogs.removeClass('active');
    },
    
    /**
     * Adds a click event on the warning icon to hide and show the dialog
     * @param {Object} $container The dialog's container
     * @param {Object} $dialog The dialog
     */
    initWarningIconButton: function($container, $dialog) {
        
        // On warning icon click
        $container.find('.warning-icon-area').rebind('click', function() {
            
            // If the popup is currently visible
            if ($dialog.hasClass('active')) {
                
                // Hide the popup
                $dialog.removeClass('active');
                
                // Set flag so it doesn't auto show each time
                alarm.seen = true;
            }
            else {
                // Otherwise show the popup
                $dialog.addClass('active');
            }
        });
    },
    
    
    /**
     * Shows when the user is over quota
     */
    overQuota: {
        
        /**
         * Show the popup
         */
        render: function() {

            // Cache lookups
            var $container = $('.warning-popup-icon.over-quota');
            var $dialog = $container.find('.top-warning-popup');

            // Add button click handler
            this.initUpgradeButton($dialog);

            // Hide other dialogs that may be open and make the icon clickable
            alarm.hideAllWarningPopups();
            alarm.initWarningIconButton($container, $dialog);
            alarm.showWarningPopup($container, $dialog);
        },
        
        /**
         * Initialises the click handler for the Upgrade Account button
         * @param {Object} $dialog The dialog
         */
        initUpgradeButton: function($dialog) {
            
            // Redirect to Pro signup page on button click
            $dialog.find('.warning-button').click(function() {
                
                // Set a flag so it doesn't show each time
                alarm.seen = true;
                
                // Go to the Pro page
                document.location.hash = 'pro';
            });
        }
    },
    
    
    /**
     * Shows when a user has uploaded a file to an ephemeral session
     */
    ephemeralSession: {
        
        /**
         * Show the popup
         */
        render: function() {

            // Cache lookups
            var $container = $('.warning-popup-icon.ephemeral-session');
            var $dialog = $container.find('.top-warning-popup');
            
            // Add button click handler
            this.initRegisterButton($dialog);
            
            // Hide other dialogs that may be open and make the icon clickable
            alarm.hideAllWarningPopups();
            alarm.initWarningIconButton($container, $dialog);
            alarm.showWarningPopup($container, $dialog);
        },
        
        /**
         * Initialises the click handler for the Choose button
         * @param {Object} $dialog The dialog
         */
        initRegisterButton: function($dialog) {
            
            // Redirect to register signup page on button click
            $dialog.find('.warning-button').click(function() {

                // If already registered, but email not confirmed, do nothing
                if (isNonActivatedAccount()) {
                    return false;
                }
                
                // Set a flag so it doesn't show each time
                alarm.seen = true;

                // Hide the dialog and go to register page
                $dialog.removeClass('active');
                document.location.hash = 'register';
            });
        }
    },
    
    
    /**
     * Shows after creating an ephemeral session, then trying to purchase a Pro plan,
     * then it asks you to register, then continue purchasing the Pro plan, then the
     * popup will show because they still haven't confirmed their email yet
     */
    nonActivatedAccount: {
    
        /**
         * Show the popup
         * @param {Boolean} recentPurchase Flag to immediately show the popup and log the event
         */
        render: function(recentPurchase) {

            // Cache lookups
            var $container = $('.warning-popup-icon.non-activated-account');
            var $dialog = $container.find('.top-warning-popup');

            // If they just purchased it, log specific event
            if (recentPurchase) {
                megaAnalytics.log('pro', 'showNonActivatedAccountDialog');
            }
            
            // If the user has previously seen an ephemeral dialog and they closed it,
            // then they purchased a plan then this forces the dialog to popup. This means
            // this dialog always shows so it is an incentive to confirm their email.
            alarm.seen = false;

            // Hide other dialogs that may be open
            alarm.hideAllWarningPopups();
            alarm.initWarningIconButton($container, $dialog);
            alarm.showWarningPopup($container, $dialog);
        }
    },
    
    
    /**
     * A helpful PRO plan renewal popup which is shown when their PRO plan has expired
     */
    planExpired: {
        
        /** All the user's last payment information from the API */
        lastPayment: null,
        
        /**
         * Show the popup
         */
        render: function() {

            // If their last payment info is not set by the API, then their plan is not currently expired.
            if (this.lastPayment === null) {
                return false;
            }
            
            // Ignored payment provider IDs (not applicable or no longer in use)
            var gatewayIgnoreList = [1, 2, 3, 7, 8, 13];
            var gatewayId = this.lastPayment.gw;
            
            // Don't display the popup for Apple or Google as they are recurring subscriptions. If the lastPayment is
            // set then it means they have purposefully cancelled their account and would not want to see any warnings.
            if (gatewayIgnoreList.indexOf(gatewayId) > -1) {
                return false;
            }

            // Cache lookups
            var $container = $('.warning-popup-icon.astropay-payment-reminder');
            var $dialog = $container.find('.top-warning-popup');

            // Get PRO plan name e.g. PRO III
            var proNum = this.lastPayment.p;
            var proPlanName = getProPlan(proNum);

            // Convert the timestamps to yyyy-mm-dd format
            var purchasedDate = this.formatTimestampToDate(this.lastPayment.ts);
            var expiryDate = this.formatTimestampToDate(this.lastPayment.exts);

            // Work out the number of months their previous plan was for e.g. 1 month or 3 months
            var planMonths = this.lastPayment.m;
            var planMonthsPluralisation = (planMonths > 1) ? l[6788] : l[913];
            
            // Get the display name, if it's an Astropay subgateway, then it will have it's own display name
            var gatewayInfo = getGatewayName(gatewayId);
            var extraData = (typeof this.lastPayment.gwd !== 'undefined') ? this.lastPayment.gwd : null;
            var gatewayName = (extraData) ? extraData.gwname : gatewayInfo.name;
            var gatewayDisplayName = (extraData) ? extraData.label : gatewayInfo.displayName;

            // Display
            $dialog.find('.header-pro-plan').text(proPlanName);
            $dialog.find('.purchased-date').text(purchasedDate);
            $dialog.find('.expired-date').text(expiryDate);
            $dialog.find('.pro-plan').text(proPlanName);
            $dialog.find('.plan-duration').text(planMonths + ' ' + planMonthsPluralisation);
            $dialog.find('.provider-icon').addClass(gatewayName);
            $dialog.find('.gateway-name').text(gatewayDisplayName);

            // Add button click handlers
            this.initChooseButton($dialog);
            this.initRenewButton($dialog, proNum);

            // Hide other dialogs that may be open and make the icon clickable
            alarm.hideAllWarningPopups();
            alarm.initWarningIconButton($container, $dialog);
            alarm.showWarningPopup($container, $dialog);
        },
        
        /**
         * Initialises the click handler for the Choose button
         * @param {Object} $dialog The dialog
         */
        initChooseButton: function($dialog) {
            
            // On the Choose button click
            $dialog.find('.warning-button.choose').rebind('click', function() {

                // Hide the dialog and go to pro page
                $dialog.removeClass('active');

                // Set a flag so it doesn't show each time
                alarm.seen = true;

                // Go to the first step of the Pro page so they can choose a new plan
                document.location.hash = 'pro';
            });
        },
        
        /**
         * Initialises the click handler for the Renew button
         * @param {Object} $dialog The dialog
         * @param {Number} proNum The Pro plan number e.g. 1, 2, 3, 4
         */
        initRenewButton: function($dialog, proNum) {
            
            // On the Renew button click
            $dialog.find('.warning-button.renew').rebind('click', function() {

                // Hide the dialog
                $dialog.removeClass('active');

                // Set a flag so it doesn't show each time
                alarm.seen = true;

                // Get the link for the Pro page second step e.g. #pro_lite, #pro_1 etc
                var proLink = (proNum === 4) ? 'lite' : proNum;

                // Go to the second step of the Pro page which will pre-populate the details
                document.location.hash = 'pro_' + proLink;
            });
        },

        /**
         * Return a translated string for the Gateway Name / Payment Provider Name. If an AstroPay
         * gateway it will return the relevant sub gateway e.g. Visa, MasterCard, Bradesco etc.
         * @param {String} gatewayName The name on the API
         * @param {Object} gatewayData Any additional data from the API about the gateway
         * @returns {String} Returns the name of the gateway for display
         */
        normaliseGatewayName: function(gatewayName, gatewayData) {

            // If AstroPay then the API has an exact name for that gatway
            if (gatewayData) {
                return gatewayData.label;           // Visa, Mastercard etc
            }
            else if (gatewayName === 'Infobip') {
                return l[7219] + ' (Centilli)';     // Mobile (Centilli)
            }
            else if (gatewayName === 'T-Pay') {
                return l[7219] + ' (T-Pay)';        // Mobile (T-Pay)
            }
            else if (gatewayName === 'Fortumo') {
                return l[7219] + ' (Fortumo)';      // Mobile (Fortumo)
            }
            else if (gatewayName === 'voucher') {
                return l[487] + ' / ' + l[7108];    // Voucher code / Balance
            }
            else if (gatewayName === 'wiretransfer') {
                return l[6198];                     // Wire transfer
            }
            else {
                // As a default, return name of the gateway from the API
                return gatewayName;
            }
        },

        /**
         * Converts a timestamp to a localised yyyy-mm-dd format e.g. 2016-04-17
         * @param {Number} timestamp The UNIX timestamp
         * @returns {String} Returns the date in yyyy-mm-dd format
         */
        formatTimestampToDate: function(timestamp) {

            var date = new Date(timestamp * 1000);
            var year = date.getFullYear();
            var month = (date.getMonth() + 1);
            var monthPadded = (month < 10) ? '0' + month : month;
            var day = (date.getDate() < 10) ? '0' + date.getDate() : date.getDate();

            return year + '-' + monthPadded + '-' + day;
        }
    }
};
