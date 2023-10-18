/**
 * Functions for popping up a dialog to recommend MEGA Lite mode and other MEGA Lite related functionality.
 * Accesible externally via mega.lite.{functionName}
 */
lazy(mega, 'lite', () => {
    'use strict';

    /** Timer to count how long the load is taking */
    let liteModeTimeoutId;

    /**
     * Recommend MEGA Lite mode (if applicable). For the dialog to be shown, they must be a PRO user
     * AND they have over 1.5 million nodes AND also their load time takes over 3 minutes
     * @returns {undefined}
     */
    function recommendLiteMode() {

        // Only Pro users can get the Lite mode and skip checking the remaining logic if already in Lite mode
        if (!u_attr.p || mega.infinity) {
            return false;
        }

        // Check if API flag exists which is turned on if the ufssizecache > 1.5M nodes for the
        // current user. If so, give the user the option to use MEGA Lite or continue loading normally.
        if (mega.flags.rwdnc || localStorage.testLargeNodes === '1') {

            // Set max load time to 3 minutes
            const maxLoadTimeInMs = localStorage.testLargeNodes ? 1000 : 1000 * 60 * 3;

            // Initiate a counter and if it runs over 3 minutes, clear the timer and show the Lite Mode dialog
            liteModeTimeoutId = setTimeout(() => {
                showLiteModeDialog();
            }, maxLoadTimeInMs);
        }
    }

    /**
     * Show the MEGA Lite mode dialog
     * @returns {undefined}
     */
    function showLiteModeDialog() {

        // Clear the timer if it's running
        clearTimeout(liteModeTimeoutId);

        // Check we have not already shown this prompt this session
        // NB: later there may be a Don't Show Again checkbox, but not implemented at the moment
        if (sessionStorage.promptedAboutLiteMode) {
            return false;
        }

        // If already loaded we don't need to show the dialog
        if (loadfm.loaded) {
            return false;
        }

        // Store a log for statistics (User was prompted to use MEGA Lite)
        eventlog(99894);

        const confirmLabel = l.launch_mega_lite;
        const cancelLabel = l.keep_loading;
        const dialogTitle = l.mega_lite;
        const dialogText = l.mega_lite_dialog_description;
        const type = `warninga:!^${confirmLabel}!${cancelLabel}`;

        // Show the message dialog
        $.closeMsgDialog = 1;
        msgDialog(type, 'LiteModeDialog', dialogTitle, dialogText, (res) => {

            // Store flag so it doesn't get shown again this session
            sessionStorage.promptedAboutLiteMode = '1';

            // Shall not signal the close of a message-dialog once the account finished loaded.
            $.closeMsgDialog = 0;

            // If the green Launch MEGA Lite button is clicked
            if (res === false) {

                // Flag to let us know we are in MEGA Lite mode
                localStorage.mInfinity = '1';

                if (window.waitsc) {
                    // Stop the SC connection.
                    waitsc.stop();
                }

                // stop ongoing SC processing
                window.execsc = nop;

                // and error reporting, if any
                window.onerror = null;

                // these comments are redundant
                loadingDialog.show();

                // Store a log for statistics (User chose to launch MEGA Lite mode - green button click)
                // Then reload into MEGA Lite (aka Infinity mode)
                Promise.resolve(eventlog(99895)).finally(() => location.reload());
                return false;
            }

            // Store a log for statistics (User chose to keep loading the regular MEGA)
            eventlog(99896);
            return false;
        });
    }

    /**
     * Initialise a button to go back to regular MEGA Cloud Drive from the top bar
     * @param {Object} topbarSelector The selector for the top bar
     * @returns {undefined}
     */
    function initBackToMegaButton(topbarSelector) {

        $('.js-back-to-mega-button', topbarSelector).rebind('click.backtomega', () => {

            // Remove the local storage variable which triggers MEGA Lite mode to load
            delete localStorage.mInfinity;

            // Store a log for statistics (User decided to go back to regular MEGA - Back to MEGA button)
            // Then reload the account back into regular MEGA
            loadingDialog.show();
            Promise.resolve(eventlog(99897)).finally(() => location.reload());
        });
    }

    /**
     * Check if there is at least 1 folder in the selected nodes
     * @param {Array} selectedNodes An array of selected node handles e.g. from $.selected
     * @returns {Boolean}
     */
    function containsFolderInSelection(selectedNodes) {

        // If at least 1 thing is selected
        if (selectedNodes && selectedNodes.length > 0) {
            for (let i = 0; i < selectedNodes.length; i++) {
                const handle = selectedNodes[i];

                // If type is folder, return true
                if (M.d[handle].t === 1) {
                    return true;
                }
            }
        }

        return false;
    }

    // Make public the following:
    return freeze({
        recommendLiteMode,
        initBackToMegaButton,
        containsFolderInSelection,
        abort() {
            clearTimeout(liteModeTimeoutId);
        }
    });
});
