/**
 * Functions for popping up a dialog to recommend MEGA Lite mode and other related functionality.
 * The MEGA Lite mode which has a bunch of visual changes for the user to show they are in this special mode and also
 * hides various functionality which doesn't work. It is only available if the localStorage.megaLiteMode is on, or
 * they are a Pro user AND have more than x nodes (from API, if rwdnc flag set) AND their loading time is > x minutes.
 * These functions are accesible externally via mega.lite.{functionName}
 *
 * @property {object} mega.lite
 */
lazy(mega, 'lite', () => {
    'use strict';
    const inf = mega.infinity;

    /** Max load time in milliseconds */
    const maxLoadTimeInMs = localStorage.testLargeNodes ? 1000 : 1000 * 60 * 2;

    /** Flag to let UI code know if the site is currently in Lite mode or not */
    const inLiteMode = Boolean(localStorage.megaLiteMode);

    /** Timer to count how long the load is taking */
    let liteModeTimeoutId;

    /** whether the current folder view have partial contents only */
    let lPatialContents;

    /** Disabled sections for MEGA Lite*/
    const disabledSections = freeze({
        albums: 1,
        faves: 1,
        photos: 1,
        recents: 1
    });

    /**
     * Recommend MEGA Lite mode (if applicable). For the dialog to be shown, they must be a PRO user
     * AND they have over x nodes AND also their load time takes over x minutes
     * @returns {undefined}
     */
    function recommendLiteMode() {

        // Only Pro users can get Lite mode and skip checking the remaining logic if already in Infinity or Lite mode
        // NB: mega.infinity is the same mode but without any UI changes or options hidden (useful for future dev).
        if (!u_attr.p || inf) {
            return false;
        }

        // Check if API flag rwdnc exists which is turned on if the ufssizecache > x nodes for the
        // current user. If so, give the user the option to use MEGA Lite or continue loading normally.
        if (mega.flags.rwdnc || localStorage.testLargeNodes === '1') {

            // Initiate a counter and if it runs over the max load time, clear the timer and show the Lite Mode dialog
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
                localStorage.megaLiteMode = '1';

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
     * Exit MEGA Lite mode
     * @returns {void}
     */
    function exitMegaLite() {
        assert(inLiteMode);

        // Remove the local storage variable which triggers MEGA Lite mode to load
        delete localStorage.megaLiteMode;

        // Store a log for statistics (User decided to go back to regular MEGA - Back to MEGA button)
        // Then reload the account back into regular MEGA
        loadingDialog.show();
        Promise.allSettled([mega.config.flush(), eventlog(99897)]).finally(() => location.reload());
    }

    /**
     * Show "You are in MEGA Lite" dialog
     * @param {String} [type] Type of action: "start" or "exit" (optional)
     * @returns {void}
     */
    function showMegaliteDialog(type) {
        const types = {
            start: {
                header: l.mlite_start_dialog_header,
                msg: l.mlite_start_dialog_info,
                buttons: [{text: l[6826]}]
            },
            exit: {
                header: l.mlite_exit_dialog_header,
                msg: l.mlite_exit_dialog_info,
                buttons: [
                    {
                        text: l.mlite_exit_megalite,
                        onClick: () => exitMegaLite()
                    },
                    {
                        text: l.mlite_stay_in_megalite
                    }
                ]
            }
        };

        type = types[type] && type || 'start';

        const {header, msg, buttons} = types[type];
        const cfgName = `skip${type}ml`;

        if (fmconfig[cfgName]) {
            if (type === 'exit') {
                onIdle(exitMegaLite);
            }
            return false;
        }

        const { sheet } = mega.ui;
        const name = 'megalite-dialog';
        const txt = mCreateElement('div', { class: 'text-left' });
        txt.append(parseHTML(
            escapeHTML(msg).replace('[A]', '<a href="" class="primary-link">').replace('[/A]', '</a>')
        ));

        const lnkNode = txt.querySelector('a');
        if (lnkNode) {
            lnkNode.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                mega.redirect('help.mega.io', 'files-folders/view-move/mega-lite', false, false, false);
                return false;
            });
        }

        const footerElements = [
            mCreateElement('div', { class: 'flex flex-row mb-10' }),
            mCreateElement('div', {
                class: is_mobile ? 'actions' : 'flex flex-row-reverse flex-wrap row-gap-2'
            })
        ];

        const ch = new MegaCheckbox({
            parentNode: footerElements[0],
            componentClassname: 'mega-checkbox',
            labelTitle: l[229],
            checked: false
        });

        for (let i = 0; i < buttons.length; i++) {
            const {text, onClick} = buttons[i];
            MegaButton.factory({
                parentNode: footerElements[1],
                type: 'normal',
                componentClassname: i > 0 ? 'ms-2 secondary' : 'ms-2',
                text,
            }).on('click.hideDialog', () => {
                sheet.hide(name);
                sheet.removeClass('info', 'msg-dialog');
                if (ch.checked && text !== l.mlite_stay_in_megalite) {
                    fmconfig[cfgName] = 1;
                }
                if (onClick) {
                    onClick();
                }
            });
        }

        const options = {
            name,
            contents: [txt],
            header,
            showClose: true,
            footer: {
                slot: footerElements
            },
            type: 'modal',
            onClose: () => {
                sheet.removeClass('info', 'msg-dialog');
            }
        };

        sheet.show(options);
        sheet.addClass('info', 'msg-dialog');
    }

    /** Show/hide banner if nodes number > 10k
     * @param {Boolean} hide Hide banner if true
     * @returns {void} void
    */
    function limitedNodesBanner(hide) {
        if (hide) {
            lPatialContents = null;

            if (is_mobile) {
                if (mobile.banner) {
                    mobile.banner.hide('limitedNodesBanner');
                }
                return;
            }
            $('.fm-notification-block.mlite-limited-nodes', '.main-layout').removeClass('visible');
            return;
        }
        const nc = M.atrophy();
        if (nc < 1) {
            console.warn(`we lost the plot... invoking limitedNodesBanner(1)`, nc);
            return this.limitedNodesBanner(true);
        }
        lPatialContents = M.currentdirid || -1;

        const msgHtml = escapeHTML(l.mlite_limited_nodes_info)
            .replace('%1', nc)
            .replace('[B]', '<b>').replace('[/B]', '</b>');

        const opts = {
            name: 'limitedNodesBanner',
            msgHtml,
            type: 'warning',
            ctaText: l.mlite_load_all_items,
            secondary: true,
            onCtaClick: (ev) => {
                ev.preventDefault();
                ev.stopPropagation();

                // Disable FM sorting, show loader
                document.documentElement.classList.add('loading-nodes');
                limitedNodesBanner(1);

                // Show All
                M.atrophy(null);
                eventlog(501018, JSON.stringify([1, M.currentrootid, M.currentdirid]));
            }
        };

        if (is_mobile) {
            if (!mobile.banner) {
                MegaMobileBanner.init();
            }
            mobile.banner.show(opts).on('cta', opts.onCtaClick);
            return;
        }

        // @todo: Use mega.ui.secondaryNav.showBanner instead
        const $banner = $('.fm-notification-block.mlite-limited-nodes', '.main-layout');

        $('.message-text', $banner).safeHTML(opts.msgHtml);
        $('.action-link', $banner).text(opts.ctaText);
        $('.content-box > a', $banner).rebind('click.showAll', opts.onCtaClick);

        $banner.addClass('visible');
    }

    /**
     * Initialise a button to go back to regular MEGA Cloud Drive from the top bar
     * @returns {undefined}
     */
    function initMegaLiteUI() {
        assert(inLiteMode);

        // Show "You're in MEGA Lite" dialog
        if (security.login.issued > 0) {

            onIdle(showMegaliteDialog);
        }

        if (mega.flags.inf > 1) {
            // Lite is enforced API-side, this user cannot exit...
            return;
        }

        // Show Exit button
        const parentNode = document.querySelector('.top-block .nav-actions');
        assert(parentNode);

        const {domNode} = new MegaLink({
            prepend: true,
            type: "text",
            text: l.mlite_exit_megalite,
            componentClassname: 'underline',
            parentNode
        });

        $(domNode).rebind('click.backtomega', () => showMegaliteDialog('exit'));
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
                if (M.getNodeByHandle(handle).t === 1) {
                    return true;
                }
            }
        }

        return false;
    }

    // Make public the following:
    return freeze({
        get partial() {
            return lPatialContents;
        },
        inLiteMode,
        recommendLiteMode,
        initMegaLiteUI,
        limitedNodesBanner,
        containsFolderInSelection,
        disabledSections,
        abort() {
            clearTimeout(liteModeTimeoutId);
        }
    });
});
