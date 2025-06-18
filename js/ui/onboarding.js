// initialising onboarding v4

// Bump this version number if changes are required in an existing section or if required to reduce complexity.
window.ONBOARD_VERSION = 4;
window.OBV4_FLAGS = {
    OBV4: 'obv4f',
    CLOUD_DRIVE: 'obcd',
    CLOUD_DRIVE_UPLOAD: 'obcduf',
    CLOUD_DRIVE_MANAGE_FILES: 'obcdmyf',
    CLOUD_DRIVE_MEGASYNC: 'obcdda',
    CHAT: 'obmc',
    UNUSED_1: 'unused1',
    CHAT_NAV: 'obmclp',
    CLOUD_DRIVE_NEW_NAV: 'obcdnn',
    CLOUD_DRIVE_NEW_NAV_START: 'obcdnns',
    CLOUD_DRIVE_NEW_NAV_LEFT: 'obcdnnl',
    CLOUD_DRIVE_NEW_NAV_BENTO: 'obcdnnb',
    CLOUD_DRIVE_NEW_NAV_ACCOUNT: 'obcdnna',
    CLOUD_DRIVE_NEW_NAV_CHAT: 'obcdnnc',
    CLOUD_DRIVE_NEW_NAV_CONTACT: 'obcdnnp',
    UNUSED_9: 'unused9',
    UNUSED_10: 'unused10',
    UNUSED_11: 'unused11',
    UNUSED_12: 'unused12',
    CHAT_CALL_UI: 'obmcui',
    CHAT_CALL_RECORDING: 'obmcrec',
    CHAT_CALL_RAISE: 'obmcrai',
    UNUSED_13: 'unused13',
    UNUSED_14: 'unused14',
    UNUSED_15: 'unused15',
    CLOUD_DRIVE_DC: 'obcddc',
    CLOUD_DRIVE_DC_BUBBLE: 'obcddcb',
    PASS: 'obmp',
    PASS_INIT: 'obmpi',
    CLOUD_DRIVE_PASS_OTP: 'obcdmpotp',
    CLOUD_DRIVE_PASS_OTP_START: 'obcdmpotps'
    // New onboarding flags to be added at the end of this object. Don't change the order!!!!
    // UNUSED_X flags can be repurposed.
};

mBroadcaster.addListener('fm:initialized', () => {
    'use strict';

    // 28th February 2025
    const DEVICE_CENTRE_RELEASE_DATE = 1740697200;

    // If user is visiting folderlink, or not complete registration do not show Onboarding V4.
    if (folderlink || u_type < 3) {
        return;
    }

    const upgradeFrom = fmconfig.obVer ?
        fmconfig.obVer < ONBOARD_VERSION ? fmconfig.obVer : false
        : -1;
    if (upgradeFrom) {
        mega.config.set('obVer', ONBOARD_VERSION);
    }

    const flagMap = attribCache.bitMapsManager.exists('obv4')
        ? attribCache.bitMapsManager.get('obv4')
        : new MegaDataBitMap('obv4', false, Object.values(OBV4_FLAGS));

    // Onboarding Flow map. This need to be set carefully for design flow on each section.
    // Instruction requires to be place on later stage.
    const obMap = {
        'cloud-drive': {
            title: l[20556],
            flag: OBV4_FLAGS.CLOUD_DRIVE,
            steps: [
                {
                    name: l[372],
                    flag: OBV4_FLAGS.CLOUD_DRIVE_UPLOAD,
                    actions: [
                        {
                            type: 'showDialog',
                            dialogTitle: l.onboard_v4_upload_dialog_title,
                            dialogDesc: l.onboard_v4_upload_dialog_desc,
                            targetElmClass: '.button.fm-new-menu',
                            targetElmPosition: 'left bottom',
                            targetHotSpot: true,
                            markComplete: true,
                            nextEvent: 500802,
                            skipEvent: 500801,
                        }
                    ],
                    cpEvent: 500799,
                },
                {
                    name: l.onboard_v4_manage_file_control_button,
                    flag: OBV4_FLAGS.CLOUD_DRIVE_MANAGE_FILES,
                    get prerequisiteCondition() {
                        return M.v.length !== 0;
                    },
                    prerequisiteWarning: l.onboard_v4_manage_file_prerequisite_warning,
                    actions: [
                        {
                            type: 'showDialog',
                            dialogTitle: l.onboard_v4_manage_file_dialog_title,
                            dialogDesc: l.onboard_v4_manage_file_dialog_desc,
                            targetElmClass: '.megaListItem:first',
                            get targetElmPosition() {
                                return M.onIconView ? 'right' : 'bottom';
                            },
                            markComplete: true,
                            nextActionTrigger: 'contextmenu',
                            nextEvent: 500804,
                            skipEvent: 500803,
                        },
                        {
                            type: 'markContextMenu',
                            targetElmClass: [
                                '.dropdown.context.files-menu a.sh4r1ng-item',
                                '.dropdown.context.files-menu a.getlink-item'
                            ],
                            targetDescription: [
                                l.onboard_v4_manage_file_context_desc_1,
                                l.onboard_v4_manage_file_context_desc_2
                            ],
                            contextElmClass: '.megaListItem:first',
                        }
                    ]
                },
                {
                    name: l[956],
                    flag: OBV4_FLAGS.CLOUD_DRIVE_MEGASYNC,
                    actions: [
                        {
                            type: 'showExtDialog',
                            targetElmClass: '.mega-dialog.mega-desktopapp-download',
                            dialogInitFunc: initDownloadDesktopAppDialog,
                            markComplete: true
                        }
                    ]
                }
            ]
        },
        chat: {
            title: 'MEGA Chat',
            flag: OBV4_FLAGS.CHAT,
            dismissNoConfirm: true,
            steps: [
                {
                    name: 'MEGA Chat Left Pane',
                    flag: OBV4_FLAGS.CHAT_NAV,
                    actions: [
                        {
                            type: 'showDialog',
                            dialogClass: 'mcob',
                            dialogTitle: l.onboard_megachat_dlg1_title,
                            dialogDesc: l.onboard_megachat_dlg1_text,
                            dialogNext: l.onboard_megachat_dlg1_btn,
                            targetElmClass: '.conversationsApp .lhp-nav',
                            targetElmPosition: 'right bottom',
                            markComplete: true,
                            ignoreBgClick: '.conversationsApp',
                        }
                    ]
                },
            ]
        },
        pwm: {
            title: 'MEGA Pass',
            flag: OBV4_FLAGS.PASS,
            steps: [
                {
                    name: l.mega_pwm,
                    flag: OBV4_FLAGS.PASS_INIT,
                    actions: [
                        {
                            type: 'showOnBoardingDialog',
                            options: {
                                steps: [
                                    {
                                        label: l[20556],
                                        title: l.mega_pass_onboarding,
                                        description: l.mega_pass_onboarding_desc,
                                        imageClass: 'pwm-image',
                                        nextText: l[556],
                                        skipText: l.mega_pass_onboarding_skip,
                                        onNext: 2
                                    },
                                    {
                                        label: l.import_password,
                                        subtitle: l.import_password_subtitle,
                                        nextText: l[99],
                                        skipText: l.import_password_skip,
                                        onNext: () => {
                                            mega.ui.onboarding.selector.uploadFile()
                                                .then((data) => {
                                                    if (data && data[0].length) {
                                                        mega.ui.onboarding.dataHandler =
                                                            new MegaImportPassDataHandler(data[0]);
                                                        mega.ui.onboarding.sheet.goToStep(2.1, true);
                                                    }
                                                });
                                        },
                                        onSkip: 3,
                                        nextDisabled: true,
                                        customContent: () => {
                                            mega.ui.onboarding.selector = new MegaImportPassSelector();
                                            return mega.ui.onboarding.selector.container;
                                        },
                                        secondaryStep: {
                                            label: l.manage_password,
                                            subtitle: l.manage_password_subtitle,
                                            nextText: l.import_selected_items,
                                            skipText: l[822],
                                            onNext: () => {
                                                mega.ui.onboarding.dataHandler.saveData()
                                                    .then((result) => {
                                                        if (result) {
                                                            mega.ui.onboarding.sheet.goToStep(3);
                                                        }
                                                    });
                                            },
                                            onSkip: () => {
                                                mega.ui.onboarding.sheet.goToStep(2, true);
                                            },
                                            customContent: () => mega.ui.onboarding.dataHandler.container
                                        }
                                    },
                                    {
                                        label: l.install_extension,
                                        title: l.install_extension_title,
                                        subtitle: l.install_extension_subtitle,
                                        nextText: l.install_extension,
                                        skipText: l[18682],
                                        onNext: () => {
                                            mega.ui.onboarding.extension.installExtension();
                                            mega.ui.onboarding.sheet.nextStep();
                                        },
                                        onSkip: () => {
                                            mega.ui.onboarding.sheet.nextStep();
                                        },
                                        nextDisabled: true,
                                        customContent: () => {
                                            mega.ui.onboarding.extension = new MegaExtensionPassSelector();
                                            return mega.ui.onboarding.extension.container;
                                        },
                                    },
                                    {
                                        title: l.mega_pass_onboarding_finish_title,
                                        description: l.mega_pass_onboarding_finish_subtitle,
                                        imageClass: 'green-check',
                                        nextText: l.mega_pass_onboarding_finish_button
                                    }
                                ]
                            },
                            markComplete: true
                        }
                    ]
                }
            ]
        }
    };

    const manipulateFlags = () => {

        // Since version update required flag key changes, key position used not key itself
        const flags = Object.values(OBV4_FLAGS);

        // If new user then we can ignore the first chat step
        if (u_attr.since >= 1659398400) {
            flagMap.setSync(flags[7], 1); // CHAT_NAV
            flagMap.safeCommit();
        }
        let upgraded = false;
        if (upgradeFrom !== false && upgradeFrom < 1) {
            // This is the version where the new chat path was added so convert to it.
            // Existing users shall only see the scheduled meetings changes
            flagMap.setSync(flags[7], 1); // CHAT_NAV
            // Set complete for now future schedule steps will reset it
            flagMap.setSync(flags[5], 0); // CHAT
            upgraded = true;
        }

        if (upgradeFrom !== false && upgradeFrom < 2) {
            // Reclaim flags from removed chat dialogs
            flagMap.setSync(flags[6], 0); // UNUSED_1
            flagMap.setSync(flags[8], 0); // UNUSED_2
            flagMap.setSync(flags[9], 0); // UNUSED_3
            flagMap.setSync(flags[10], 0); // UNUSED_4
            flagMap.setSync(flags[11], 0); // UNUSED_5
            flagMap.setSync(flags[12], 0); // UNUSED_6
            flagMap.setSync(flags[13], 0); // UNUSED_7
            flagMap.setSync(flags[14], 0); // UNUSED_8
            flagMap.setSync(flags[15], 0); // UNUSED_9
            flagMap.setSync(flags[16], 0); // UNUSED_10
            flagMap.setSync(flags[17], 0); // UNUSED_11
            flagMap.setSync(flags[18], 0); // UNUSED_12
            upgraded = true;
        }

        // Remove device centre and password manager
        if (upgradeFrom !== false && upgradeFrom < 3) {
            flagMap.setSync(flags[22], 0); // CLOUD_DRIVE_MP > UNUSED_13
            flagMap.setSync(flags[23], 0); // CLOUD_DRIVE_MP_TRY > UNUSED_14
            flagMap.setSync(flags[24], 0); // CLOUD_DRIVE_MP_BUBBLE > UNUSED_15

            upgraded = true;
        }

        if (upgradeFrom !== false && upgradeFrom < 4) {
            const wasFinished = flagMap.getSync(flags[8]);
            flagMap.setSync(flags[8], 0); // CLOUD_DRIVE_NEW_NAV -> reset for new chat/contacts nav options.
            if (wasFinished) {
                // Ensure dialogs start showing again from the new chats/contacts options.
                flagMap.setSync(flags[9], 1);
                flagMap.setSync(flags[10], 1);
                flagMap.setSync(flags[11], 1);
            }
            upgraded = true;
        }

        // users registered before DC release
        // having "Get started" onboarding not completed
        // and DC tooltip not completed
        // will never see DC tooltip
        const disableDeviceCentre = u_attr.since < DEVICE_CENTRE_RELEASE_DATE &&
            !flagMap.getSync(OBV4_FLAGS.CLOUD_DRIVE) &&
            !flagMap.getSync(OBV4_FLAGS.CLOUD_DRIVE_DC);

        if (disableDeviceCentre) {
            flagMap.setSync(OBV4_FLAGS.CLOUD_DRIVE_DC, 1);
            flagMap.setSync(OBV4_FLAGS.CLOUD_DRIVE_DC_BUBBLE, 1);
        }

        // Future upgrades may be added here
        if (upgraded || disableDeviceCentre) {
            flagMap.safeCommit();
        }
    };

    const _obv4NewNav = () => {

        if (mega.ui.onboarding) {
            const afterContactDone = mega.ui.onboarding.flagStorage.getSync(OBV4_FLAGS.CLOUD_DRIVE_NEW_NAV_ACCOUNT);
            const _obMap = obMap || {};
            const isRtl = document.body.classList.contains('rtl');
            _obMap['cloud-drive'] = {
                title: l.mega_pwm,
                flag: OBV4_FLAGS.CLOUD_DRIVE_NEW_NAV,
                noCP: true,
                dismissNoConfirm: true,
                steps: [
                    {
                        name: l.promo_new_layout_1_title,
                        flag: OBV4_FLAGS.CLOUD_DRIVE_NEW_NAV_START,
                        actions: [
                            {
                                type: 'showExtDialog',
                                dialogInitFunc: mega.ui.onboarding.extDlg.showObPromoDialog,
                                markComplete: true
                            }
                        ]
                    },
                    {
                        name: l.promo_new_layout_2_title,
                        flag: OBV4_FLAGS.CLOUD_DRIVE_NEW_NAV_LEFT,
                        actions: [
                            {
                                type: 'showDialog',
                                dialogTitle: l.promo_new_layout_2_title,
                                dialogDesc: l.promo_new_layout_2_body,
                                targetElmClass: '.mega-top-menu',
                                targetElmPosition: 'right',
                                markComplete: true,
                                dialogSkip: l.ob_end_tour
                            }
                        ]
                    },
                    {
                        name: l.promo_new_layout_3_title,
                        flag: OBV4_FLAGS.CLOUD_DRIVE_NEW_NAV_BENTO,
                        actions: [
                            {
                                type: 'showDialog',
                                dialogTitle: l.promo_new_layout_3_title,
                                dialogDesc: l.promo_new_layout_3_body,
                                targetElmClass: '.mega-header .bento',
                                targetElmPosition: isRtl ? 'bottom right' : 'bottom left',
                                markComplete: true,
                                dialogSkip: l.ob_end_tour
                            }
                        ]
                    },
                    {
                        name: l[7997],
                        flag: OBV4_FLAGS.CLOUD_DRIVE_NEW_NAV_CHAT,
                        get prerequisiteCondition() {
                            return megaChatIsReady && mega.ui.header.chatsButton.visible;
                        },
                        actions: [
                            {
                                type: 'showDialog',
                                dialogTitle: l.promo_new_layout_5_title,
                                dialogDesc: l.promo_new_layout_5_body,
                                targetElmClass: '.mega-header .top-chats',
                                targetElmPosition: isRtl ? 'bottom right' : 'bottom left',
                                markComplete: true,
                                dialogSkip: l.ob_end_tour
                            }
                        ]
                    },
                    {
                        name: l[165],
                        flag: OBV4_FLAGS.CLOUD_DRIVE_NEW_NAV_CONTACT,
                        actions: [
                            {
                                type: 'showDialog',
                                dialogTitle: l.promo_new_layout_6_title,
                                dialogDesc: l.promo_new_layout_6_body,
                                targetElmClass: '.mega-header .top-contacts',
                                targetElmPosition: isRtl ? 'bottom right' : 'bottom left',
                                markComplete: true,
                                dialogNext: afterContactDone ? l[726] : l[556],
                                skipHidden: afterContactDone,
                                dialogSkip: l.ob_end_tour
                            }
                        ]
                    },
                    {
                        name: l.promo_new_layout_4_title,
                        flag: OBV4_FLAGS.CLOUD_DRIVE_NEW_NAV_ACCOUNT,
                        actions: [
                            {
                                type: 'showDialog',
                                dialogTitle: l.promo_new_layout_4_title,
                                dialogDesc: l.promo_new_layout_4_body,
                                targetElmClass: '.mega-header .avatar',
                                targetElmPosition: isRtl ? 'bottom right' : 'bottom left',
                                markComplete: true,
                                skipHidden: true,
                                dialogNext: l.set_new_pwd_confirm
                            }
                        ]
                    }
                ]
            };
            mega.ui.onboarding.map = _obMap;
        }
    };

    const _obv4DeviceCentre = () => {
        if (mega.ui.onboarding) {
            const _obMap = obMap || {};
            _obMap['cloud-drive'] = {
                title: l.mega_device_centre,
                flag: OBV4_FLAGS.CLOUD_DRIVE_DC,
                noCP: true,
                steps: [
                    {
                        name: l.mega_device_centre,
                        flag: OBV4_FLAGS.CLOUD_DRIVE_DC_BUBBLE,
                        get prerequisiteCondition() {
                            return $.MPNotOpened === undefined;
                        },
                        actions: [
                            {
                                type: 'showDialog',
                                dialogClass: 'mcob dc',
                                dialogTitle: l.dc_promo_onboarding_title,
                                dialogDesc: l.dc_promo_onboarding_content,
                                dialogNext: l.ok_button,
                                skipHidden: true,
                                targetElmClass: '.js-myfiles-panel .device-centre span',
                                targetElmPosition: 'left',
                                targetElmPosTuning: {
                                    top: 5,
                                    left: 15,
                                },
                                markComplete: true,
                            }
                        ]
                    }
                ],
            };
            mega.ui.onboarding.map = _obMap;
            mBroadcaster.addListener('pagechange', () => {
                // Hide the control panel while the page change is finishing up.
                $('.onboarding-control-panel', '.fm-right-files-block').addClass('hidden');
                onIdle(mega.ui.onboarding.start.bind(mega.ui.onboarding));
            });
            mega.ui.onboarding.start();

            // Device centre onboarding requires kickstarting manually as it does not have control panel
            const {currentSection} = mega.ui.onboarding;
            if (currentSection.map.flag === OBV4_FLAGS.CLOUD_DRIVE_DC && M.currentrootid === M.RootID) {
                currentSection.startNextOpenSteps();
            }
        }
    };

    const _obv4MegaPassOTP = () => {
        if (mega.ui.onboarding) {
            const {currentSectionName} = mega.ui.onboarding;

            if (currentSectionName !== 'cloud-drive' && currentSectionName !== 'pwm') {
                return;
            }

            const _obMap = obMap || {};
            _obMap[currentSectionName] = {
                title: l.mega_pwm,
                flag: OBV4_FLAGS.CLOUD_DRIVE_PASS_OTP,
                noCP: true,
                steps: [
                    {
                        name: 'MEGA Pass: New stronger security, same zero hassle experience',
                        flag: OBV4_FLAGS.CLOUD_DRIVE_PASS_OTP_START,
                        actions: [
                            {
                                type: 'showExtDialog',
                                dialogInitFunc: mega.ui.onboarding.extDlg.showPassOTPPromoDialog,
                                markComplete: true
                            }
                        ]
                    }
                ]
            };

            mega.ui.onboarding.map = _obMap;
        }
    };

    flagMap.isReady().then((res) => {
        if (res) {
            // ENOENT so migrate any old flags to this attribute
            for (const flag of Object.values(OBV4_FLAGS)) {
                let val = typeof fmconfig[flag] === 'undefined' || fmconfig[flag] === 0 ? 0 : 1;
                if (fmconfig.obrev) {
                    val ^= 1;
                }
                flagMap.setSync(flag, val, true);
            }
            flagMap.commit().catch(dump);
        }
        manipulateFlags();

        // If users are old user created before 31-01-2025 and finished CD one then show new nav onboarding
        if (u_attr.since < 1738279000 && (flagMap.getSync(OBV4_FLAGS.CLOUD_DRIVE) || u_attr.since < 1631664000) ||
            localStorage.obv4testnn) {
            _obv4NewNav();
        }
        else if (!flagMap.getSync(OBV4_FLAGS.CLOUD_DRIVE_DC) && u_attr.since < DEVICE_CENTRE_RELEASE_DATE) {
            // users must be registered before DC release to see DC tooltip
            _obv4DeviceCentre();
        }

        // 1. Free accounts will see the Promo dialog with Free or subscribe button only in CD and is not dependant on
        // MEGA Pass onboarding dialog completion.
        // 2. Pro accounts & MEGA Pass feature enabled accounts will see the Promo dialog with 'Show me' button to
        // start tutorial flow
        // 3. Deactivated Business & Proflexi accounts will not see the dialog.
        // 4. Accounts created after 31-01-2025 will see the dialog regardless of completion of CD new nav flow.
        // 5. In '/pwm' page, the Promo dialog will be shown only if the user has completed the MEGA Pass onboarding.
        if ((M.currentdirid === M.RootID &&
            (flagMap.getSync(OBV4_FLAGS.CLOUD_DRIVE_NEW_NAV) || u_attr.since >= 1738279000) ||
            (flagMap.getSync(OBV4_FLAGS.PASS) && M.currentdirid === 'pwm'))
            && ((!u_attr.b && !u_attr.pf) ||
            (u_attr.b && u_attr.b.s !== pro.ACCOUNT_STATUS_EXPIRED) ||
            (u_attr.pf && u_attr.pf.s !== pro.ACCOUNT_STATUS_EXPIRED))) {
            _obv4MegaPassOTP();
        }

        const _handleMegaPassSteps = () => {
            if (!mega.ui.pm) {
                if (!_handleMegaPassSteps.onceAwait) {
                    _handleMegaPassSteps.onceAwait = true;
                    mBroadcaster.once('pwm-initialized', _handleMegaPassSteps);
                }
                return;
            }
            const pwmFeature = u_attr.features && u_attr.features.find(elem => elem[1] === 'pwm');
            if (!pwmFeature || pwmFeature[0] <= Date.now() / 1000 || M.currentdirid !== 'pwm') {
                return;
            }

            if (flagMap.getSync(OBV4_FLAGS.PASS)) {
                // If the user has completed the MEGA Pass onboarding, init the OTP promo dialog.
                _obv4MegaPassOTP();
            }

            const {onboarding} = mega.ui;

            if (onboarding && onboarding.currentSection) {
                const {currentSection} = onboarding;

                // Check if the current section is relevant and execute open steps
                if (
                    currentSection.map &&
                    currentSection.map.flag === OBV4_FLAGS.PASS
                ) {
                    currentSection.startNextOpenSteps();
                }
            }
        };

        const isOverridden = obMap && obMap['cloud-drive'].flag === OBV4_FLAGS.CLOUD_DRIVE_NEW_NAV ||
                                    obMap['cloud-drive'].flag === OBV4_FLAGS.CLOUD_DRIVE_PASS_OTP;

        const _delayStart = () => {
            delay('delayKickstartOB', () => {

                // If previewer will open delay onboarding execution until previewer is closed.
                if (sessionStorage.previewNode) {

                    const previewClosedEvent = mBroadcaster.addListener('slideshow:close', () => {

                        mBroadcaster.removeListener(previewClosedEvent);
                        _delayStart();
                    });

                    return;
                }

                if (pfid) {
                    return;
                }

                mega.ui.onboarding.start();

                // this onboarding requires kickstarting manually as it does not have control panel
                if (isOverridden && M.currentrootid === M.RootID ||
                    flagMap.getSync(OBV4_FLAGS.PASS) && M.currentrootid === 'pwm') {
                    mega.ui.onboarding.currentSection.startNextOpenSteps();
                }

                _handleMegaPassSteps();
            }, 1000);
        };

        mBroadcaster.addListener('pagechange', () => {
            // Hide the control panel while the page change is finishing up.
            $('.onboarding-control-panel').addClass('hidden');

            // Closing dialog that is not closed by background click but user try navigate to another page
            if ($.dialog === 'onboardingDialog') {
                closeDialog();
            }

            _delayStart();
        });

        // delay to make sure all other dialog such as expired business is apearing first
        _delayStart();

    }).catch(dump);

    // If this is an old user don't show them the cloud-drive onboarding v4
    if (!(u_attr.since > 1631664000 || localStorage.obv4test)) {
        delete obMap['cloud-drive'];
    }

    // Main controller level of whole OBv4 include section start, reset, initialising.
    class OnboardV4 {

        /**
         * OnboardV4
         * @constructor
         *
         * @param {object} map Map used to create Sections and corresponding Steps
         * @param {MegaDataBitMap} flagStorage The onboarding flag storage
         */
        constructor(map, flagStorage) {

            this.map = map;
            this.sections = Object.create(null);
            this.flagStorage = flagStorage;
        }

        start() {

            const {currentSection, currentSectionName} = this;

            // User revisit this section
            if (currentSection) {
                currentSection.init();
            }
            // User visit this section first time lets start
            else {
                // eslint-disable-next-line no-use-before-define
                this.sections[currentSectionName] = new OnboardV4Section(this.map[currentSectionName], this);
            }
        }

        // Delete flag for testing purpose.
        reset(prefix) {

            // this is only for debugging
            if (!d) {
                return;
            }

            let obflags = Object.values(OBV4_FLAGS);

            if (prefix) {
                obflags = obflags.filter(flag => flag.startsWith(prefix));
            }

            for (var i = obflags.length; i--;) {
                this.flagStorage.setSync(obflags[i], 0);
            }
            this.flagStorage.safeCommit();
        }

        get currentSectionName() {

            switch (is_fm() && M.currentrootid) {
                case M.RootID: return 'cloud-drive';
                case M.InboxID: return 'inbox';
                case M.RubbishID: return 'rubbish-bin';
                case 'chat': return 'chat';
                case 'pwm': return 'pwm';
                default: return M.currentrootid === undefined ? M.currentdirid : M.currentrootid;
            }
        }

        get currentSection() {

            return this.sections[this.currentSectionName];
        }
    }

    // Section(Page) level like Clouddrive, Chat, Backup, Settings, etc.
    class OnboardV4Section {

        constructor(map, parent) {

            this.map = map;
            this.steps = [];
            this.parent = parent;
            this.$obControlPanel = $('.onboarding-control-panel')
            this.init();
        }

        init() {
            // This section is completed let move on.
            if (!this.map || this.isComplete || isPublicLink()) {
                $('.onboarding-control-panel').addClass('hidden');

                return;
            }

            this.prepareControlPanel();
            this.bindControlPanelEvents();
            this.hotspotNextStep();
        }

        get currentStep() {
            return this.steps[this.currentStepIndex];
        }

        get isComplete() {
            return !!this.parent.flagStorage.getSync(this.map.flag);
        }

        prepareControlPanel() {

            const currentSteps = this.map.steps;

            if (!currentSteps) {
                return;
            }

            let html = '';

            this.$obControlPanel.removeClass('hidden');

            $('.onboarding-control-panel-title', this.$obControlPanel).text(this.map.title);

            for (let i = 0; i < currentSteps.length; i++) {

                const eventId = currentSteps[i].cpEvent || 0;
                html += `<button class="onboarding-step-link mega-button action no-hover" data-eventid="${eventId}">
                            <div class="onboarding-step mega-button icon">
                                <i class="onboarding-step-complete-icon sprite-fm-mono icon-check"></i>
                                <span class="onboarding-step-count">${i + 1}</span>
                            </div>
                            <span>${escapeHTML(currentSteps[i].name)}</span>
                        </button>`;

                this.steps[i] = new OnboardV4Step(this, i ,currentSteps[i], this.$obControlPanel);
            }

            if (this.map.noCP) {
                this.$obControlPanel.addClass('hidden');
            }

            $('.onboarding-control-panel-step', this.$obControlPanel).safeHTML(html);
        }

        bindControlPanelEvents() {

            $('.onboarding-step-link', this.$obControlPanel).rebind('click.onboarding', e => {

                const clickedStep = $('.onboarding-step-count', e.currentTarget).text() - 1;

                if (clickedStep === this.currentStepIndex) {
                    return false;
                }
                const eventId = parseInt(e.currentTarget.dataset.eventid, 10);
                if (eventId) {
                    eventlog(eventId);
                }

                onIdle(() => {
                    this.startNextOpenSteps(clickedStep);
                });

                return false;
            });

            $('.onboarding-control-panel-content .js-close', this.$obControlPanel)
                .rebind('click.onboarding', () => {
                    this.showConfirmDismiss();
                    eventlog(500800);
                });
            $('.onboarding-control-panel-complete .js-close', this.$obControlPanel)
                .rebind('click.onboarding', this.markSectionComplete.bind(this));
            $('.js-dismiss', this.$obControlPanel).rebind('click.onboarding', this.markSectionComplete.bind(this));
            $('.js-dismiss-cancel', this.$obControlPanel)
                .rebind('click.onboarding', this.hideConfirmDismiss.bind(this));
            $('.onboarding-step-link', this.$obControlPanel).rebind('mouseenter.onboarding', e => {

                const stepIndex = e.currentTarget.querySelector('.onboarding-step-count').textContent;
                if (this.steps && this.steps[stepIndex - 1]) {
                    this.steps[stepIndex - 1].checkPrerequisite();
                }
            });
        }

        showConfirmDismiss() {

            this.hotspotNextStep();
            this.currentStepIndex = undefined;
            if (this.map.dismissNoConfirm) {
                return this.markSectionComplete();
            }

            $('.onboarding-control-panel-dismiss', this.$obControlPanel).removeClass('hidden');
            $('.onboarding-control-panel-content', this.$obControlPanel).addClass('hidden');
        }

        hideConfirmDismiss() {

            $('.onboarding-control-panel-dismiss', this.$obControlPanel).addClass('hidden');
            $('.onboarding-control-panel-content', this.$obControlPanel).removeClass('hidden');
        }

        showCompleteMessage() {

            clickURLs();

            $('.onboarding-control-panel-complete', this.$obControlPanel).removeClass('hidden');
            $('.onboarding-control-panel-content', this.$obControlPanel).addClass('hidden');

            this.setSectionComplete();
        }

        searchNextOpenStep() {

            let nextStep = false;

            for (let i = 0; i < this.steps.length; i++) {

                if (this.steps[i].isComplete) {
                    this.steps[i].markDone();
                }
                else if (nextStep === false){
                    nextStep = i;
                }
            }

            return nextStep;
        }

        hotspotNextStep() {

            const nextStepIndex = this.searchNextOpenStep();

            if (nextStepIndex === false) {

                // This section is completed lets show user there is no more.
                this.showCompleteMessage();
                return false;
            }

            this.steps[nextStepIndex].markHotspot();
        }

        startNextOpenSteps(step) {

            if (this.steps.length === 0 || this.isComplete || this.steps[step] && this.steps[step].isComplete) {
                return false;
            }

            // Just searching next step available
            if (step === undefined) {
                this.currentStepIndex = this.searchNextOpenStep();

                if (this.currentStepIndex === false) {

                    // This section is completed lets show user there is no more.
                    this.showCompleteMessage();
                    return false;
                }
            }
            // Manually triggered by event such as click
            else {
                this.currentStepIndex = step;
            }

            if (!this.currentStep.checkPrerequisite()) {

                if (!step) {
                    this.currentStep.showPrerequisiteMessage();
                }

                delete this.currentStepIndex;

                this.hotspotNextStep();

                return false;
            }

            this.currentStep.markActive();
            this.currentStep.currentActionIndex = 0;
            this.currentStep.executeAction();
        }

        // Mark section completed and hide onboarding control panel
        markSectionComplete() {

            this.$obControlPanel.addClass('hidden');
            this.setSectionComplete();
        }

        // set section completed on fmconfig
        setSectionComplete() {
            this.parent.flagStorage.setSync(this.map.flag, 1);
            this.parent.flagStorage.safeCommit();
        }
    }

    // Step level like Upload, File Management, Desktop app, etc.
    class OnboardV4Step {

        constructor(parent, index, map, $cp) {

            this.index = index;
            this.map = map;
            this.currentActionIndex = 0;
            this.$controlPanel = $cp;
            this.parentSection = parent;

            this.initActions();
        }

        checkPrerequisite() {

            if (this.map.prerequisiteCondition === false) {

                this.addPrerequisiteMessage();
                return false;
            }

            this.removePrerequisiteMessage();

            return true;
        }

        addPrerequisiteMessage() {

            this.$stepButton.addClass('simpletip').attr({
                'data-simpletip': this.map.prerequisiteWarning,
                'data-simpletipposition': 'bottom',
                'data-simpletip-class': 'bluetip medium-width theme-light-forced center-align',
            });
        }

        showPrerequisiteMessage() {

            this.$stepButton.addClass('manual-tip').trigger('mouseenter.simpletip');

            setTimeout(() => {
                this.$stepButton.removeClass('manual-tip').trigger('simpletipClose.internal');
            }, 4000);
        }

        removePrerequisiteMessage() {
            this.$stepButton.removeClass('simpletip').removeAttr(
                'data-simpletip data-simpletipposition data-simpletip-class data-simpletip-display-duration');
        }

        get $stepButton() {
            return $('.onboarding-step-link', this.$controlPanel).eq(this.index);
        }

        initActions() {

            this.actions = [];

            for (let i = 0; i < this.map.actions.length; i++) {
                this.actions[i] = new OnboardV4Action(this, this.map.actions[i]);
            }
        }

        executeAction() {

            this.actions[this.currentActionIndex].execute();
        }

        toNextAction() {

            this.currentActionIndex++;

            if (this.actions[this.currentActionIndex]) {
                this.executeAction();
            }
            else {
                this.parentSection.hotspotNextStep();
            }
        }

        get currentAction() {
            return this.actions[this.currentActionIndex];
        }

        get nextAction() {
            return this.actions[this.currentActionIndex + 1];
        }

        get isComplete() {
            return !!this.parentSection.parent.flagStorage.getSync(this.map.flag);
        }

        markHotspot() {

            delay('markingDelay', () => {

                if (this.parentSection.currentStepIndex !== this.index) {
                    $('.onboarding-step-link', this.$controlPanel).eq(this.index)
                        .removeClass('active').addClass('hotspot');
                }
            }, 1000);
        }

        markActive() {
            $('.onboarding-step-link', this.$controlPanel).removeClass('hotspot').eq(this.index).addClass('active');
        }

        markDeactive() {
            $('.onboarding-step-link', this.$controlPanel).eq(this.index).removeClass('active');
        }

        markDone() {

            $('.onboarding-step-link', this.$controlPanel).eq(this.index).removeClass('active').addClass('complete');

            this.parentSection.parent.flagStorage.setSync(this.map.flag, 1);
            this.parentSection.parent.flagStorage.safeCommit();
        }
    }

    // Action level of each step, like open dialog on upload section, context menu marking on File management, etc.
    class OnboardV4Action {

        constructor(parent, actionMap) {

            this.map = actionMap;
            this.type = actionMap.type;
            this.parentStep = parent;
        }

        execute() {

            const actionType = this.map.type;

            if (typeof this[actionType] === 'function') {
                this[actionType]();
            }
        }

        showDialog() {

            if (!$(this.map.targetElmClass).length) {
                return;
            }
            this.$dialog = $('#ob-dialog');

            M.safeShowDialog('onboardingDialog', () => {
                this.$dialog.removeClass('mcob').addClass(this.map.dialogClass || '');
                // Fill contents for the dialog
                $('#ob-dialog-title').text(this.map.dialogTitle);
                $('#ob-dialog-text').text(this.map.dialogDesc);
                $('.js-next span', this.$dialog).text(this.map.dialogNext || l[556]);
                $('.js-next', this.$dialog).attr('data-eventid', this.map.nextEvent || 0);
                $('.js-skip', this.$dialog)
                    .attr('data-eventid', this.map.skipEvent || 0)
                    .text(this.map.dialogSkip || l.onboard_v4_dialog_skip)
                    .removeClass('hidden')
                    .addClass(this.map.skipHidden ? 'hidden' : '');

                this.positionDialog();
                this.bindDialogEvents();

                return this.$dialog;
            });
        }

        positionDialog() {

            if (!$(this.map.targetElmClass).length) {
                // Just in case something odd happened with the DOM node.
                return;
            }
            // Position of the onboarding dialog
            let my = 'center top';
            let at = 'center bottom+6';
            let arrowAt = 'top';
            let hadHidden = false;

            switch (this.map.targetElmPosition) {
                case 'top':
                    my = 'center bottom';
                    at = 'center top-6';
                    arrowAt = 'bottom';
                    break;
                case 'left':
                    my = 'right center';
                    at = 'left-6 center';
                    arrowAt = 'right';
                    break;
                case 'right':
                    my = 'left center';
                    at = 'right+6 center';
                    arrowAt = 'left';
                    break;
                case 'left bottom':
                    my = 'right top';
                    at = 'left-6 bottom-2';
                    arrowAt = false;
                    break;
                case 'right bottom':
                    my = 'left center';
                    at = 'right+6 bottom';
                    arrowAt = 'left';
                    break;
                case 'bottom right':
                    my = 'left-42 bottom-8';
                    at = 'right-42 top';
                    arrowAt = 'top-left';
                    break;
                case 'bottom left':
                    my = 'right+34 bottom-8';
                    at = 'left+34 top';
                    arrowAt = 'top-right';
                    break;
                case 'bottom 10':
                case 'bottom 20':
                    at = 'center bottom+26';
                    break;
            }

            if (this.map.targetHotSpot) {
                this.parentStep.parentSection.parent.$hotSpotNode
                    = $(this.map.targetElmClass).addClass('onboarding-hotspot-animation-rect');
            }

            // $.position bug escaping
            this.$dialog.removeAttr('style');

            // As hidden eleemnt cannot calculate collision with viewport edge, remove hidden temporarily
            if (this.$dialog.hasClass('hidden')) {
                this.$dialog.removeClass('hidden');
                hadHidden = true;
            }

            this.$dialog.position({
                my: my,
                at: at,
                of: this.map.targetElmClass,
                collision: 'flipfit',
                using: (obj, info) => {

                    if (arrowAt && arrowAt !== 'top-left' && arrowAt !== 'top-right') {
                        // Dialog position is moved due to collision on viewport swap arrow position
                        if (info.horizontal === 'right' && obj.left < info.target.left) {
                            arrowAt = 'right';
                        }
                        else if (info.horizontal === 'left' && obj.left > info.target.left) {
                            arrowAt = 'left';
                        }
                        else if (info.vertical === 'top' && obj.top > info.target.top) {
                            arrowAt = 'top';
                        }
                        else if (info.vertical === 'bottom' && obj.top < info.target.top) {
                            arrowAt = 'bottom';
                        }
                    }

                    const {top, left} = this.map.targetElmPosTuning || {};
                    if (top) {
                        obj.top += top;
                    }
                    if (left) {
                        obj.left += left;
                    }

                    this.$dialog.css(obj);
                }
            });

            if (arrowAt) {
                $('#ob-dialog-arrow', this.$dialog)
                    .removeClass('hidden top bottom left right top-left top-right').addClass(arrowAt);
            }
            else {
                $('#ob-dialog-arrow', this.$dialog).addClass('hidden').removeClass('top bottom left right top-left');
            }

            // If it was temporary bug fixing hidden removal, add hidden back
            if (hadHidden) {
                this.$dialog.addClass('hidden');
            }
        }

        bindDialogEvents() {

            let __updFMUIListener;
            const __closeDialogAction = (noComplete) => {

                closeDialog();
                delete this.parentStep.parentSection.parent.$hotSpotNode;

                $('#fmholder').off('mouseup.onboarding');
                $('.fm-right-files-block .ui-selectable:visible:not(.hidden)').off('mousedown.onboarding');
                $('body').off('drop.onboarding');
                $(this.map.targetElmClass).off(`${this.map.nextActionTrigger}.onboarding`);
                $(window).off('resize.onboarding');
                $('.js-close', this.parentStep.$obControlPanel).off('click.obdialogdismiss');

                if (__updFMUIListener) {
                    mBroadcaster.removeListener(__updFMUIListener);
                }

                if (!noComplete && this.map.markComplete) {
                    this.parentStep.markDone();
                    if (typeof this.map.postComplete === 'function') {
                        this.map.postComplete();
                    }
                }
                else if (noComplete) {
                    this.parentStep.markDeactive();
                }
            };

            // There is next action trigger, if it happen on target, close dialog and move to next action.
            if (this.map.nextActionTrigger) {

                let $binded = $(this.map.targetElmClass).rebind(`${this.map.nextActionTrigger}.onboarding`, () => {

                    __closeDialogAction();
                    this.parentStep.toNextAction();
                });

                // when node update on File Manager, rebind target action trigger event to new target if required
                __updFMUIListener = mBroadcaster.addListener('updFileManagerUI', () => {

                    if (!$binded.is(this.map.targetElmClass)) {

                        $binded.off(`${this.map.nextActionTrigger}.onboarding`);

                        $binded = $(this.map.targetElmClass).rebind(`${this.map.nextActionTrigger}.onboarding`, () => {

                            __closeDialogAction();
                            this.parentStep.toNextAction();
                        });
                    }
                });
            }

            // User trigger mouse event on other than target, just close dialog and place hotspot on next step
            $('#fmholder').rebind('mouseup.onboarding', e => {

                // If there is nextActionTrigger, let that handle close dialog.
                const $target = $(e.target);
                if (
                    !this.map.nextActionTrigger
                    || !$target.is(this.map.targetElmClass)
                    || $target.parents(this.map.targetElmClass).length
                ) {
                    if (this.map.ignoreBgClick) {
                        if ($target.is(this.map.ignoreBgClick) || $target.parents(this.map.ignoreBgClick).length) {
                            return;
                        }
                        __closeDialogAction(true);
                        return;
                    }

                    __closeDialogAction();
                    this.parentStep.parentSection.hotspotNextStep();
                }
            });

            // Event for block view empty space, to not conflict with selection manger multi-selection event.
            $('.fm-right-files-block .ui-selectable:visible:not(.hidden)').rebind('mousedown.onboarding', e => {

                if (e.which === 1) {

                    if (this.map.ignoreBgClick) {
                        const $target = $(e.target);
                        if ($target.is(this.map.ignoreBgClick) || $target.parents(this.map.ignoreBgClick).length) {
                            return;
                        }
                        __closeDialogAction(true);
                        return;
                    }
                    __closeDialogAction();
                    this.parentStep.parentSection.hotspotNextStep();
                }
            });

            // Drag drop file will close the dialog and continue upload process
            $('body').rebind('drop.onboarding', (e) => {
                if (e.originalEvent && $(e.originalEvent.target).parents('.float-video').length) {
                    return;
                }
                __closeDialogAction();
                this.parentStep.parentSection.hotspotNextStep();
            });

            // Next button clicked, close dialog and move to next available step
            $('.js-next', this.$dialog).rebind('click.onboarding', (ev) => {

                const eventId = parseInt(ev.currentTarget.dataset.eventid, 10);
                if (eventId) {
                    eventlog(eventId);
                }
                __closeDialogAction();
                this.parentStep.parentSection.startNextOpenSteps();
            });

            // Skip button clicked, close dialog and mark step as completed
            $('.js-skip', this.$dialog).rebind('click.onboarding', (ev) => {

                const eventId = parseInt(ev.currentTarget.dataset.eventid, 10);
                if (eventId) {
                    eventlog(eventId);
                }
                __closeDialogAction(true);
                this.parentStep.parentSection.showConfirmDismiss();
            });

            $('.js-close', this.parentStep.$obControlPanel).rebind('click.obdialogdismiss', () => {

                __closeDialogAction(true);
            });

            $(window).rebind('resize.onboarding', this.positionDialog.bind(this));
        }

        markContextMenu() {

            mBroadcaster.once('showcontextmenu', () => {

                const targetSelector = this.map.targetElmClass.join();
                const html = '<div class="onboarding-highlight-dot"></div>';

                $(targetSelector).safeAppend(html);

                if (this.map.targetDescription) {

                    for (var i = this.map.targetDescription.length; i--;) {

                        $('.onboarding-highlight-dot', this.map.targetElmClass[i]).parent().addClass('simpletip').attr({
                            'data-simpletip': this.map.targetDescription[i],
                            'data-simpletipposition': 'right',
                            'data-simpletip-class': 'bluetip medium-width theme-light-forced'
                        });
                    }
                }

                mBroadcaster.once('contextmenuclose', () => {

                    $('.onboarding-highlight-dot', targetSelector).parent().removeClass('simpletip')
                        .removeAttr('data-simpletip data-simpletipposition data-simpletip-class');

                    $('.onboarding-highlight-dot', targetSelector).remove();

                    if (this.map.markComplete) {
                        this.parentStep.markDone();
                    }

                    this.parentStep.toNextAction();
                });
            });
        }

        showExtDialog() {

            this.$dialog = $(this.map.targetElmClass);
            this.parentStep.markDone();

            if (typeof this.map.dialogInitFunc === 'function') {
                this.map.dialogInitFunc();
            }
            else {
                safeShowDialog('onboardingDialog', this.$dialog);
            }

            mBroadcaster.once('closedialog', this.parentStep.toNextAction.bind(this.parentStep));
        }

        showOnBoardingDialog() {

            mega.ui.onboarding.sheet = new MegaOnboardingJourney(this.map.options);
            mega.ui.onboarding.sheet.show();

            if (this.map.markComplete) {
                this.parentStep.markDone();
                if (typeof this.map.postComplete === 'function') {
                    this.map.postComplete();
                }
            }
        }

    }

    mega.ui.onboarding = new OnboardV4(obMap, flagMap);
    mega.ui.onboardingFlags = OBV4_FLAGS;

    window.OnboardV4Action = OnboardV4Action;

    mega.ui.onboarding.extDlg = {
        showObPromoDialog: () => {
            "use strict";

            const currSec = mega.ui.onboarding.currentSection;

            M.safeShowDialog('ob-promo-dialog', () => {

                const $dialog = $('.ob-promo-dialog', '.mega-dialog-container');
                const $actionButton = $('.btn-ob-promo-action', $dialog);
                const $background = $('.fm-dialog-overlay', '.mega-dialog-container');
                const $clsBtn = $('.js-close', $dialog);
                const _offEvents = () => {
                    $actionButton.off('click.ob-promo');
                    $background.off('click.ob-promo');
                    $clsBtn.off('click.ob-promo');
                };

                const _killOBEvent = () => {
                    currSec.currentStepIndex = false;
                    currSec.markSectionComplete();
                };

                $actionButton.rebind('click.ob-promo', () => {
                    closeDialog();
                    currSec.startNextOpenSteps();
                    _offEvents();
                });

                $clsBtn.rebind('click.ob-promo', () => {
                    _killOBEvent();
                    closeDialog();
                    _offEvents();
                    return false;
                });

                $background.rebind('click.ob-promo', () => {
                    _offEvents();
                });

                return $dialog;
            });
        },

        async showPassOTPPromoDialog() {
            let actionText = l[7224];
            let title = l.otp_promo_dialog_title;
            let msg = l.otp_promo_dialog_content;
            let plan = false;

            if (!u_attr.b && !u_attr.pf) {
                const pwmFeature = pro.proplan2.getUserFeature('pwm');

                if (!pwmFeature || pwmFeature[0] <= Date.now() / 1e3) {
                    // if the Feature PWM is not available then get plans, check the free trial/feature plan eligibility
                    const {result} = await api.req({a: 'utqa', nf: 2, ft: 1}).catch(dump) || {};

                    if (result) {
                        for (let i = result.length; i--;) {
                            if (result[i].f && result[i].f.pwm === 1) {
                                plan = result[i];
                                break;
                            }
                        }
                    }

                    if (plan) {
                        actionText = plan.trial ? l.try_free : l.subscribe_mega_pass;
                        title = l.otp_promo_title_non_pwd_users;
                        msg = l.otp_content_non_pwd_users;
                    }
                }
            }

            const contentDiv = document.createElement('div');
            contentDiv.className = 'promo-dialog-content';
            contentDiv.append(parseHTML(msg));

            const footerElements = [
                mCreateElement('div', { class: 'flex flex-row' }),
                mCreateElement('div', { class: 'flex flex-row-reverse' })
            ];

            MegaButton.factory({
                parentNode: footerElements[1],
                text: actionText,
                componentClassname: 'slim font-600',
                type: 'normal'
            }).on('click', () => {
                mega.ui.sheet.hide();

                // if the user eligible for free trial or needs to subscribe then redirect to pricing page
                if (plan) {
                    mega.redirect('mega.io', 'pricing#pass', false, false);
                }
                else {
                    const _handleMegaPassOTPTutorial = () => {
                        if (!mega.ui.pm) {
                            if (!_handleMegaPassOTPTutorial.onceAwait) {
                                _handleMegaPassOTPTutorial.onceAwait = true;
                                mBroadcaster.once('pwm-initialized', _handleMegaPassOTPTutorial);
                            }
                            return;
                        }
                        const tutorialOTP = new TutorialOTP();
                        tutorialOTP.start();
                    };
                    if (M.currentdirid === 'pwm') {
                        _handleMegaPassOTPTutorial();
                    }
                    else {
                        M.openFolder('pwm')
                            .then(() => {
                                _handleMegaPassOTPTutorial();
                            })
                            .catch(dump);
                    }
                }
            });

            MegaButton.factory({
                parentNode: footerElements[1],
                text: l.ok_button,
                componentClassname: 'slim font-600 mx-2 secondary',
                type: 'normal'
            }).on('click', () => mega.ui.sheet.hide());

            mega.ui.sheet.show({
                name: 'mega-pass-otp-promo-dialog',
                type: 'normal',
                title,
                classList: ['promo-dialog'],
                contents: [contentDiv],
                showClose: true,
                preventBgClosing: true,
                navImage: 'three-locks',
                centered: false,
                footer: {
                    slot: footerElements
                }
            });
        }
    }

    return 0xDEAD;
});
