/**
 * Various warning triangle popups from the top header. This covers 
 * cases for over quota, ephemeral session, non activated accounts 
 * after purchase and PRO plan expired warnings.
 */
var warnPopup = {
    
    /**
     * Shows a dialog with a message that the user is over quota
     */
    showOverQuota: function() {
        
        var $container = $('.warning-popup-icon.over-quota');
        var $dialog = $container.find('.top-warning-popup');
        
        // Hide other dialogs that may be open and make the icon clickable
        warnPopup.hideOtherWarningDialogs();
        warnPopup.addWarningIconClickHandler($container, $dialog);
        
        // Show the dialog
        $container.removeClass('hidden');
        $dialog.addClass('active');
            
        // Redirect to Pro signup page on button click
        $container.find('.warning-button').click(function() {
            document.location.hash = 'pro';
        });
    },
    
    /**
     * Shows when a user has uploaded a file to an ephemeral session
     */
    showEphemeral: function() {
        
        var $container = $('.warning-popup-icon.ephemeral-session');
        var $dialog = $container.find('.top-warning-popup');
        
        // Hide other dialogs that may be open and make the icon clickable
        warnPopup.hideOtherWarningDialogs();
        warnPopup.addWarningIconClickHandler($container, $dialog);
        
        // Show the dialog
        $container.removeClass('hidden');
        $dialog.addClass('active');
        
        // Redirect to register signup page on button click
        $container.find('.warning-button').click(function() {
            
            // If already registered, but email not confirmed, do nothing
            if (isNonActivatedAccount()) {
                return false;
            }
            
            // Hide the dialog and go to register page
            $dialog.removeClass('active');
            document.location.hash = 'register';            
        });
    },
    
    /**
     * Shows after registering, then purchasing a plan, but they haven't confirmed their email yet
     * @param {Boolean} log Whether to log this event or not
     */
    showNonActivatedAccount: function(log) {
        
        var $container = $('.warning-popup-icon.non-activated-account');
        var $dialog = $container.find('.top-warning-popup');
                
        // Log event
        if (log) {
            megaAnalytics.log('pro', 'showNonActivatedAccountDialog');
        }
        
        // Hide other dialogs that may be open
        warnPopup.hideOtherWarningDialogs();
        
        // Show the dialog
        $container.removeClass('hidden');
        $dialog.addClass('active');        
    },
    
    // The user's last payment information
    userLastPaymentInfo: null,
        
    /**
     * A helpful PRO plan renewal popup which is shown when their PRO plan has expired
     */
    showProPlanRenewal: function() {
        
        // If their last payment info is not set by the API, then their plan is not currently expired
        if (this.userLastPaymentInfo === null) {
            return false;
        }
        
        var $container = $('.warning-popup-icon.astropay-payment-reminder');
        var $dialog = $container.find('.top-warning-popup');
        
        // Hide other dialogs that may be open and make the icon clickable
        warnPopup.hideOtherWarningDialogs();
        warnPopup.addWarningIconClickHandler($container, $dialog);
        
        // Show the dialog
        $container.removeClass('hidden');
        $dialog.addClass('active');
        
        // Get PRO plan name e.g. PRO III
        var proNum = warnPopup.userLastPaymentInfo.p;
        var proPlanName = getProPlan(proNum);
        
        // Convert the timestamps to yyyy-mm-dd format
        var purchasedDate = warnPopup.formatTimestampToDate(warnPopup.userLastPaymentInfo.ts);
        var expiryDate = warnPopup.formatTimestampToDate(warnPopup.userLastPaymentInfo.exts);
        
        // Replace placeholder in header with the last PRO plan they purchased
        var headerText = $dialog.find('.warning-header').html();
            headerText = headerText.replace('%1', proPlanName);
        
        // Work out the number of months their previous plan was for e.g. 1 month or 3 months
        var planMonths = warnPopup.userLastPaymentInfo.m;
        var planMonthsPluralisation = (planMonths > 1) ? l[6788] : l[913];
        
        var gatewayId = warnPopup.userLastPaymentInfo.gw;
        var gatewayName = 'gateway';
        
        // Complete the first dialog message
        var firstMessage = $dialog.find('.first-message').html();
            firstMessage = firstMessage.replace('[S]', '<span>').replace('[/S]', '</span>');
            firstMessage = firstMessage.replace('%1', proPlanName);
            firstMessage = firstMessage.replace('%2', planMonths + ' ' + planMonthsPluralisation);
            firstMessage = firstMessage.replace('%3', '<span class="icon"></span>' + gatewayName);
            
        // Add some styling for the second message
        var secondMessage = $dialog.find('.second-message').html();
            secondMessage = secondMessage.replace('[S]', '<span>').replace('[/S]', '</span>');
        
        $dialog.find('.warning-header').text(headerText);
        $dialog.find('.purchased-date').text(purchasedDate);
        $dialog.find('.expired-date').text(expiryDate);
        $dialog.find('.first-message').safeHTML(firstMessage);
        $dialog.find('.second-message').safeHTML(secondMessage);
        
        
        console.log('zzzz', warnPopup.userLastPaymentInfo);
    },
    
    /**
     * Converts a timestamp to a localised yyyy-mm-dd format e.g. 2016-04-17
     * @param {Number} timestamp The UNIX timestamp
     * @returns {String} Returns the date
     */
    formatTimestampToDate: function(timestamp) {
        
        var date = new Date(timestamp * 1000);
        var year = date.getFullYear();
        var month = (date.getMonth() + 1);
            month = (month < 10) ? '0' + month : month;
        var day = (date.getDate() < 10) ? '0' + date.getDate() : date.getDate();
        
        return year + '-' + month + '-' + day;
    },
    
    /**
     * Adds a click event on the warning icon to hide and show the dialog
     * @param {Object} $container The dialog's container
     * @param {Object} $dialog The dialog
     */
    addWarningIconClickHandler: function($container, $dialog) {
                
        $container.find('.warning-icon-area').rebind('click', function() {
            
            if ($dialog.hasClass('active')) {
                $dialog.removeClass('active');
            }
            else {
                $dialog.addClass('active');
            }
        });        
    },
    
    /**
     * Hides other warning dialogs if they are currently visible so there is no double up
     */
    hideOtherWarningDialogs: function() {
        
        var $containers = $('.warning-popup-icon');
        var $dialogs = $containers.find('.top-warning-popup');
        
        $containers.addClass('hidden');
        $dialogs.removeClass('active');
    }
};