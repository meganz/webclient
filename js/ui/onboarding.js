// initialising onboarding v4

// Bump this version number if changes are required in an existing section or if required to reduce complexity.
window.ONBOARD_VERSION = 6;
window.OBV4_FLAGS = {
    OBV4: 'obv4f',
    CLOUD_DRIVE: 'obcd',
    CLOUD_DRIVE_INIT: 'obcdi',
    UNUSED_2: 'unused2',
    UNUSED_3: 'unused3',
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
    UNUSED_16: 'unused16',
    UNUSED_17: 'unused17',
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

    let pwmReady = false;
    let ulListener = false;
    const psURL = 'https://play.google.com/store/apps/details?id=mega.privacy.android.app&referrer=meganzob';
    const isAchEnabled = u_attr && !(u_attr.p || u_attr.b) && u_attr.flags && u_attr.flags.ach;

    // Onboarding Flow map. This need to be set carefully for design flow on each section.
    // Instruction requires to be place on later stage.
    const obMap = {
        'cloud-drive': {
            title: l[20556],
            flag: OBV4_FLAGS.CLOUD_DRIVE,
            steps: [
                {
                    name: l[372],
                    flag: OBV4_FLAGS.CLOUD_DRIVE_INIT,
                    get prerequisiteCondition() {
                        // Just confirmed in this tab
                        return !!(confirmok || mega.ui.onboardBusSub);
                    },
                    actions: [
                        {
                            type: 'showOnBoardingDialog',
                            options: {
                                showClose: true,
                                onClose: () => {
                                    if (mega.ui.menu.name === 'ob-upload-menu') {
                                        mega.ui.menu.hide();
                                    }
                                    if (ulListener) {
                                        mBroadcaster.removeListener('upload:start', ulListener);
                                    }
                                    eventlog(500980);
                                },
                                steps: [
                                    {
                                        label: l[20556],
                                        title: l.onboard_cd_p1_title,
                                        description: l.onboard_cd_p1_text,
                                        imageClass: 'cd-onboard-1',
                                        next: {
                                            text: l[20556],
                                            action: 2,
                                            event: 500972
                                        },
                                        skip: {
                                            text: l[1379],
                                            event: 500971
                                        },
                                    },
                                    {
                                        label: isAchEnabled ? l.onboard_cd_p2_label_ach : l.download_desktop_app,
                                        title: isAchEnabled ? l.onboard_cd_p2_title_ach : l.onboard_cd_p2_title,
                                        description: isAchEnabled ? l.onboard_cd_p2_text_ach : '',
                                        imageClass: 'cd-onboard-2',
                                        next: {
                                            text: l.download_continue,
                                            action: () => {
                                                window.open(megasync.getMegaSyncUrl(), '_blank', 'noopener,noreferrer');
                                                mega.ui.onboarding.sheet.nextStep();
                                            },
                                            event: 500974,
                                        },
                                        skip: {
                                            text: l.onboard_cd_p2_skip,
                                            action: 3,
                                            event: 500973
                                        },
                                        customContent: () => {
                                            return mCreateElement('div', {'class': 'content-block cd-onboard'}, [
                                                mCreateElement('div', {'class': 'content-title'}, [
                                                    document.createTextNode(l.onboard_cd_p2_list_title)
                                                ]),
                                                mCreateElement('div', {'class': 'content-row'}, [
                                                    mCreateElement('i', {
                                                        'class': 'sprite-fm-mono icon-zap-thin-outline'
                                                    }),
                                                    mCreateElement('div', {'class': 'content-text'}, [
                                                        document.createTextNode(l.onboard_cd_p2_list_item1)
                                                    ])
                                                ]),
                                                mCreateElement('div', {'class': 'content-row'}, [
                                                    mCreateElement('i', {
                                                        'class': 'sprite-fm-mono icon-sync-thin-outline'
                                                    }),
                                                    mCreateElement('div', {'class': 'content-text'}, [
                                                        document.createTextNode(l.onboard_cd_p2_list_item2)
                                                    ])
                                                ]),
                                                mCreateElement('div', {'class': 'content-row'}, [
                                                    mCreateElement('i', {
                                                        'class': 'sprite-fm-mono icon-wifi-off-thin-outline'
                                                    }),
                                                    mCreateElement('div', {'class': 'content-text'}, [
                                                        document.createTextNode(l.onboard_cd_p2_list_item3)
                                                    ])
                                                ]),
                                                mCreateElement('div', {
                                                    'class': `content-footer ${isAchEnabled ? '' : 'hidden'}`
                                                }, [
                                                    document.createTextNode(l.onboard_cd_note_ach)
                                                ])
                                            ]);
                                        }
                                    },
                                    {
                                        label: isAchEnabled ? l.onboard_cd_p3_label_ach : l.download_mobile_app,
                                        title: isAchEnabled ? l.onboard_cd_p3_title_ach : l.onboard_cd_p3_title,
                                        description: isAchEnabled ? l.onboard_cd_p3_text_ach : l.onboard_cd_p3_text,
                                        next: {
                                            text: l[507],
                                            action: 4
                                        },
                                        back: {
                                            text: l[822],
                                            action: 2,
                                            event: 500988,
                                        },
                                        customContent: () => {
                                            const elm = mCreateElement('div', {
                                                'class': 'content-block cd-onboard image'
                                            }, [
                                                mCreateElement('div', {'class': 'image-wrapper qr-block'}, [
                                                    mCreateElement('div', {'class': 'app-qr-image'})
                                                ]),
                                                mCreateElement('div', {'class': 'content-title'}, [
                                                    document.createTextNode(l.onboard_cd_p3_list_title)
                                                ]),
                                                mCreateElement('div', {'class': 'content-row'}, [
                                                    mCreateElement('i', {
                                                        'class': 'sprite-fm-mono icon-image-01-thin-outline'
                                                    }),
                                                    mCreateElement('div', {'class': 'content-text'}, [
                                                        document.createTextNode(l.onboard_cd_p3_list_item1)
                                                    ])
                                                ]),
                                                mCreateElement('div', {'class': 'content-row'}, [
                                                    mCreateElement('i', {
                                                        'class': 'sprite-fm-mono icon-sync-thin-outline'
                                                    }),
                                                    mCreateElement('div', {'class': 'content-text'}, [
                                                        document.createTextNode(l.onboard_cd_p3_list_item2)
                                                    ])
                                                ]),
                                                mCreateElement('div', {'class': 'content-row app-store'}, [
                                                    mCreateElement('a', {
                                                        'class': 'app-store-link clickurl',
                                                        'data-eventid': "500986",
                                                        href: 'https://itunes.apple.com/app/mega/id706857885',
                                                        target: '_blank'
                                                    }, [
                                                        mCreateElement('img', {
                                                            'class': 'app-store-link',
                                                            src: `${staticpath}images/mega/locale/${lang}_appstore.svg`
                                                        }),
                                                    ]),
                                                    mCreateElement('a', {
                                                        'class': 'app-store-link android clickurl',
                                                        'data-eventid': "500987",
                                                        href: psURL,
                                                        target: '_blank'
                                                    }, [
                                                        mCreateElement('img', {
                                                            'class': 'app-store-link',
                                                            src: `${staticpath}images/mega/locale/${lang}_playstore.png`
                                                        }),
                                                    ])
                                                ]),
                                                mCreateElement('div', {
                                                    'class': `content-footer ${isAchEnabled ? '' : 'hidden'}`
                                                }, [document.createTextNode(l.onboard_cd_note_ach)])
                                            ]);
                                            onIdle(clickURLs);
                                            return elm;
                                        }
                                    },
                                    {
                                        label: l.onboard_cd_p4_label,
                                        title: l.onboard_cd_p4_title,
                                        description: l.onboard_cd_p4_text,
                                        imageClass: 'cd-onboard-3',
                                        next: {
                                            text: l[372],
                                            leftIcon: 'sprite-fm-mono icon-arrow-up-thin-outline',
                                            rightIcon: 'sprite-fm-mono icon-chevron-down-thin-outline',
                                            action: (ev) => {
                                                if (ev.currentTarget.active) {
                                                    ev.currentTarget.active = false;
                                                    return;
                                                }
                                                ev.stopPropagation();
                                                ev.currentTarget.active = true;
                                                const parentNode = document.createElement('div');
                                                parentNode.className = 'context-section last';
                                                ulListener = ulListener ||
                                                    mBroadcaster.addListener('upload:start', () => {
                                                        ulListener = false;
                                                        mega.ui.onboarding.sheet.hide();
                                                        return 0xDEAD;
                                                    });
                                                MegaButton.factory({
                                                    parentNode,
                                                    buttonId: 'fileupload-item',
                                                    text: l[99],
                                                    icon: 'sprite-fm-mono icon-file-upload-thin-outline',
                                                    type: 'fullwidth',
                                                    componentClassname: 'context-button text-icon',
                                                    onClick() {
                                                        document.getElementById('fileselect1').click();
                                                        eventlog(500977);
                                                    }
                                                });
                                                MegaButton.factory({
                                                    parentNode,
                                                    buttonId: 'folderupload-item',
                                                    text: l[98],
                                                    icon: 'sprite-fm-mono icon-folder-arrow-01-thin-outline',
                                                    type: 'fullwidth',
                                                    componentClassname: 'context-button text-icon',
                                                    onClick() {
                                                        document.getElementById('fileselect2').click();
                                                        eventlog(500978);
                                                    }
                                                });
                                                mega.ui.menu.show({
                                                    name: 'ob-upload-menu',
                                                    classList: ['ob-upload-menu', 'fm-context-menu'],
                                                    resizeHandler: true,
                                                    contents: [parentNode],
                                                    event: ev,
                                                    onClose: () => {
                                                        if ($.dialog === 'Mega-Onboarding') {
                                                            // Remain overlayed
                                                            document.documentElement.classList.add('overlayed');
                                                        }
                                                        ev.currentTarget.active = false;
                                                    }
                                                });
                                            },
                                            event: 500976
                                        },
                                        skip: {
                                            text: l[18682],
                                            event: 500975,
                                        },
                                        back: {
                                            text: l[822],
                                            action: 3,
                                            event: 500979,
                                        }
                                    }
                                ]
                            },
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
                            get prerequisiteCondition() {
                                return !!pwmReady;
                            },
                            options: {
                                steps: [
                                    {
                                        label: l[20556],
                                        title: l.mega_pass_onboarding,
                                        description: l.mega_pass_onboarding_desc,
                                        imageClass: 'pwm-image',
                                        next: {
                                            text: l[556],
                                            action: 2,
                                            event: 500888
                                        },
                                        skip: {
                                            text: l.mega_pass_onboarding_skip,
                                            event: 500889
                                        }
                                    },
                                    {
                                        label: l.import_password,
                                        subtitle: l.import_password_subtitle,
                                        next: {
                                            text: l[99],
                                            disabled: true,
                                            action: () => {
                                                mega.ui.onboarding.selector.uploadFile()
                                                    .then((data) => {
                                                        if (data && data[0].length) {
                                                            mega.ui.onboarding.dataHandler =
                                                                new MegaImportPassDataHandler(data[0]);
                                                            mega.ui.onboarding.sheet.goToStep(2.1, true);
                                                        }
                                                    });
                                            }
                                        },
                                        skip: {
                                            text: l.import_password_skip,
                                            action: 3,
                                            event: 500899
                                        },
                                        customContent: () => {
                                            mega.ui.onboarding.selector = new MegaImportPassSelector();
                                            return mega.ui.onboarding.selector.container;
                                        },
                                        secondaryStep: {
                                            label: l.manage_password,
                                            subtitle: l.manage_password_subtitle,
                                            next: {
                                                text: l.import_selected_items,
                                                action: () => {
                                                    mega.ui.onboarding.dataHandler.saveData()
                                                        .then((result) => {
                                                            if (result) {
                                                                mega.ui.onboarding.sheet.goToStep(3);
                                                            }
                                                        });
                                                },
                                                event: 500900
                                            },
                                            skip: {
                                                text: l[822],
                                                action: () => {
                                                    mega.ui.onboarding.sheet.goToStep(2, true);
                                                },
                                                event: 500901
                                            },
                                            customContent: () => mega.ui.onboarding.dataHandler.container
                                        }
                                    },
                                    {
                                        label: l.install_extension,
                                        title: l.install_extension_title,
                                        subtitle: l.install_extension_subtitle,
                                        next: {
                                            text: l.install_extension,
                                            disabled: true,
                                            action: () => {
                                                mega.ui.onboarding.extension.installExtension();
                                                mega.ui.onboarding.sheet.nextStep();
                                            }
                                        },
                                        skip: {
                                            text: l[18682],
                                            action: () => {
                                                mega.ui.onboarding.sheet.nextStep();
                                            },
                                            event: 500905
                                        },
                                        customContent: () => {
                                            mega.ui.onboarding.extension = new MegaExtensionPassSelector();
                                            return mega.ui.onboarding.extension.container;
                                        }
                                    },
                                    {
                                        title: l.mega_pass_onboarding_finish_title,
                                        description: l.mega_pass_onboarding_finish_subtitle,
                                        imageClass: 'green-check',
                                        next: {
                                            text: l.mega_pass_onboarding_finish_button,
                                            event: 500906
                                        },
                                        noStepper: true,
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

        // Remove pwm onboarding flags
        if (upgradeFrom !== false && upgradeFrom < 5) {
            flagMap.setSync(flags[29], 0); // UNUSED_16
            flagMap.setSync(flags[30], 0); // UNUSED_17
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

        if (upgradeFrom !== false && upgradeFrom < 6) {
            // Removing old cd onboarding.
            flagMap.setSync(flags[3], 0);
            flagMap.setSync(flags[4], 0);
            upgraded = true;
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
                                targetElmClass: '.mega-top-menu .device-centre',
                                targetElmPosition: 'left',
                                targetElmPosTuning: {
                                    top: 4,
                                    left: -12,
                                },
                                markComplete: true,
                            }
                        ]
                    }
                ],
            };
            mega.ui.onboarding.map = _obMap;
            mBroadcaster.addListener('pagechange', () => {
                onIdle(mega.ui.onboarding.start.bind(mega.ui.onboarding));
            });
            mega.ui.onboarding.start();
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
            pwmReady = true;
        };

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

                _handleMegaPassSteps();
            }, 1000);
        };

        mBroadcaster.addListener('pagechange', () => {
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
            this.init();
        }

        init() {
            // This section is completed let move on.
            if (!this.map || this.isComplete || isPublicLink()) {
                return;
            }

            this.prepareSteps();
            onIdle(() => this.hotspotNextStep());
        }

        get currentStep() {
            return this.steps[this.currentStepIndex];
        }

        get isComplete() {
            return !!this.parent.flagStorage.getSync(this.map.flag);
        }

        prepareSteps() {

            const currentSteps = this.map.steps;

            if (!currentSteps) {
                return;
            }

            for (let i = 0; i < currentSteps.length; i++) {
                // eslint-disable-next-line no-use-before-define
                this.steps[i] = new OnboardV4Step(this, i, currentSteps[i]);
            }
        }

        showConfirmDismiss() {

            this.hotspotNextStep();
            this.currentStepIndex = undefined;
            if (this.map.dismissNoConfirm) {
                return this.setSectionComplete();
            }
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
                this.setSectionComplete();
                return false;
            }

            this.startNextOpenSteps(nextStepIndex);
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
                    this.setSectionComplete();
                    return false;
                }
            }
            // Manually triggered by event such as click
            else {
                this.currentStepIndex = step;
            }

            if (!this.currentStep.checkPrerequisite()) {

                delete this.currentStepIndex;

                // Pre-requisite related code should call this again when the condition is met.

                return false;
            }

            this.currentStep.currentActionIndex = 0;
            this.currentStep.executeAction();
        }

        // set section completed on fmconfig
        setSectionComplete() {
            this.parent.flagStorage.setSync(this.map.flag, 1);
            this.parent.flagStorage.safeCommit();
        }
    }

    // Step level like Upload, File Management, Desktop app, etc.
    class OnboardV4Step {

        constructor(parent, index, map) {

            this.index = index;
            this.map = map;
            this.currentActionIndex = 0;
            this.parentSection = parent;

            this.initActions();
        }

        checkPrerequisite() {
            return this.map.prerequisiteCondition !== false;
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

        markDone() {
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
                    currSec.setSectionComplete();
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
