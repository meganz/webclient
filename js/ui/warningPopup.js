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
        
        // Show the warning dialog
        warnPopup.hideOtherWarningDialogs();
        $container.removeClass('hidden');
        $dialog.addClass('active');
        
        // Add a click event on the warning icon to hide and show the dialog
        $container.find('.warning-icon-area').rebind('click', function() {
            
            if ($dialog.hasClass('active')) {
                $dialog.removeClass('active');
            }
            else {
                $dialog.addClass('active');
            }
        });
    
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
        
        // Show the warning dialog
        warnPopup.hideOtherWarningDialogs();
        $container.removeClass('hidden');
        $dialog.addClass('active');
        
        // Add a click event on the warning icon to hide and show the dialog
        $container.find('.warning-icon-area').rebind('click', function() {
            
            if ($dialog.hasClass('active')) {
                $dialog.removeClass('active');
            }
            else {
                $dialog.addClass('active');
            }
        });
        
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
        
        // Show the warning dialog
        warnPopup.hideOtherWarningDialogs();
        $container.removeClass('hidden');
        $dialog.addClass('active');
        
        // Add a click event on the warning icon to hide and show the dialog
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