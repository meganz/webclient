// initialising onboarding v4
mBroadcaster.addListener('fm:initialized', () => {

    'use strict';

    // If user is visiting folderlink, or not complete registration do not show Onboarding V4.
    if (folderlink || u_type < 3) {
        return;
    }

    const OBV4_FLAGS = {
        OBV4: 'obv4f',
        CLOUD_DRIVE: 'obcd',
        CLOUD_DRIVE_UPLOAD: 'obcduf',
        CLOUD_DRIVE_MANAGE_FILES: 'obcdmyf',
        CLOUD_DRIVE_MEGASYNC: 'obcdda',
        CHAT: 'obmc',
        CHAT_OPEN: 'obmcnw',
        CHAT_NAV: 'obmclp',
        CHAT_CHATS_PANE: 'obmccp',
        CHAT_MEETINGS_PANE: 'obmcmp',
        CHAT_CONTACT_PANE: 'obmcco',
        // New onboarding flags to be added at the end of this object. Don't change the order!!!!
    };

    const flagMap = new MegaDataBitMap('obv4', false, Object.values(OBV4_FLAGS));
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
            flagMap.commit().then(() => {
                // Migration succeeded so clear out of fmconfig
                const flags = Object.values(OBV4_FLAGS);
                flags.push('obrev');
                for (const flag of flags) {
                    mega.config.remove(flag);
                }
                // TODO eventually clear flags from config.js to reclaim space
            }).catch(dump);
        }

        // If new user then we can ignore the first chat step
        if (u_attr.since >= 1659398400) {
            flagMap.setSync(OBV4_FLAGS.CHAT_NAV, 1);
            flagMap.safeCommit();
            mBroadcaster.once('chat_initialized', () => {
                // Show the new user onboarding dot when chat is ready.
                const $mcNavDot = $('.nw-fm-left-icon.conversations .onboarding-highlight-dot', fmholder);
                if (!flagMap.getSync(OBV4_FLAGS.CHAT_OPEN) && !M.chat) {
                    $('.dark-tooltip', $mcNavDot.parent().addClass('w-onboard')).addClass('hidden');
                    $mcNavDot.removeClass('hidden');
                }

                mBroadcaster.addListener('pagechange', () => {
                    if (M.chat) {
                        flagMap.setSync(OBV4_FLAGS.CHAT_OPEN, 1);
                        flagMap.safeCommit();
                        $mcNavDot.addClass('hidden');
                        $('.dark-tooltip', $mcNavDot.parent().removeClass('w-onboard')).removeClass('hidden');

                        return 0xDEAD;
                    }
                });
            });
        }

        if (mega.ui.onboarding) {
            mBroadcaster.addListener('pagechange', mega.ui.onboarding.start.bind(mega.ui.onboarding));
            mega.ui.onboarding.start();
        }
    }).catch(dump);

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
                            targetElmClass: '.button.fm-uploads',
                            targetElmPosition: 'left bottom',
                            targetHotSpot: true,
                            markComplete: true
                        }
                    ]
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
                                return M.viewmode ? 'right' : 'bottom';
                            },
                            markComplete: true,
                            nextActionTrigger: 'contextmenu'
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
                            ignoreBgClick: true,
                        }
                    ]
                },
                {
                    name: 'Chats',
                    flag: OBV4_FLAGS.CHAT_CHATS_PANE,
                    actions: [
                        {
                            type: 'showDialog',
                            dialogClass: 'mcob',
                            dialogTitle: l.onboard_megachat_dlg2_title,
                            dialogDesc: l.onboard_megachat_dlg2_text,
                            targetElmClass: '.conversationsApp .toggle-panel-heading',
                            targetElmPosition: 'right',
                            markComplete: true,
                            ignoreBgClick: true,
                        }
                    ]
                },
                {
                    name: 'Meetings',
                    flag: OBV4_FLAGS.CHAT_MEETINGS_PANE,
                    actions: [
                        {
                            type: 'showDialog',
                            dialogClass: 'mcob',
                            dialogTitle: l.onboard_megachat_dlg3_title,
                            dialogDesc: l.onboard_megachat_dlg3_text,
                            targetElmClass: '.conversationsApp .lhp-nav .lhp-meetings-tab',
                            targetElmPosition: 'bottom right',
                            markComplete: true,
                            ignoreBgClick: true,
                        }
                    ]
                },
                {
                    name: 'Contacts',
                    flag: OBV4_FLAGS.CHAT_CONTACT_PANE,
                    actions: [
                        {
                            type: 'showDialog',
                            dialogClass: 'mcob',
                            dialogTitle: l.onboard_megachat_dlg4_title,
                            dialogDesc: l.onboard_megachat_dlg4_text,
                            dialogNext: l[726],
                            targetElmClass: '.conversationsApp .lhp-nav .lhp-contacts-tab',
                            targetElmPosition: 'bottom right',
                            markComplete: true,
                            skipHidden: true,
                            ignoreBgClick: true,
                        }
                    ]
                }
            ]
        }
    };


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

            const {currentSection} = this;
            const {currentSectionName} = this;

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
                this.flagStorage.set(obflags[i], 0);
            }
            this.flagStorage.safeCommit();
        }

        get currentSectionName() {

            switch (M.currentrootid) {
                case M.RootID: return 'cloud-drive';
                case M.InboxID: return 'inbox';
                case M.RubbishID: return 'rubbish-bin';
                case 'chat': return 'chat';
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
            if (!this.map || this.isComplete) {

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

            this.$obControlPanel = $('.onboarding-control-panel').removeClass('hidden');

            $('.onboarding-control-panel-title', this.$obControlPanel).text(this.map.title);

            for (let i = 0; i < currentSteps.length; i++) {

                html += `<button class="onboarding-step-link mega-button action no-hover">
                            <div class="onboarding-step mega-button icon">
                                <i class="onboarding-step-complete-icon sprite-fm-mono icon-check"></i>
                                <span class="onboarding-step-count">${i + 1}</span>
                            </div>
                            <span>${escapeHTML(currentSteps[i].name)}</span>
                        </button>`;

                this.steps[i] = new OnboardV4Step(this, i ,currentSteps[i], this.$obControlPanel);
            }

            $('.onboarding-control-panel-step', this.$obControlPanel).safeHTML(html);
        }

        bindControlPanelEvents() {

            $('.onboarding-step-link', this.$obControlPanel).rebind('click.onboarding', e => {

                const clickedStep = $('.onboarding-step-count', e.currentTarget).text() - 1;

                if (clickedStep === this.currentStepIndex) {
                    return false;
                }

                onIdle(() => {
                    this.startNextOpenSteps(clickedStep);
                });

                return false;
            });

            $('.onboarding-control-panel-content .js-close', this.$obControlPanel)
                .rebind('click.onboarding', this.showConfirmDismiss.bind(this));
            $('.onboarding-control-panel-complete .js-close', this.$obControlPanel)
                .rebind('click.onboarding', this.markSectionComplete.bind(this));
            $('.js-dismiss', this.$obControlPanel).rebind('click.onboarding', this.markSectionComplete.bind(this));
            $('.js-dismiss-cancel', this.$obControlPanel)
                .rebind('click.onboarding', this.hideConfirmDismiss.bind(this));
            $('.onboarding-step-link', this.$obControlPanel).rebind('mouseenter.onboarding', e => {

                const stepIndex = e.currentTarget.querySelector('.onboarding-step-count').textContent;
                this.steps[stepIndex - 1].checkPrerequisite();
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

            if (this.steps.length === 0 || this.steps[step] && this.steps[step].isComplete) {
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
                $('.js-skip', this.$dialog).removeClass('hidden').addClass(this.map.skipHidden ? 'hidden' : '');

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
            }

            if (this.map.targetHotSpot) {
                $(this.map.targetElmClass).addClass('onboarding-hotspot-animation-rect');
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

                    if (arrowAt && arrowAt !== 'top-left') {
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

                    this.$dialog.css(obj);
                }
            });

            if (arrowAt) {
                $('#ob-dialog-arrow', this.$dialog)
                    .removeClass('hidden top bottom left right top-left').addClass(arrowAt);
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
                $('.onboarding-hotspot-animation-rect').removeClass('onboarding-hotspot-animation-rect');

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
                if (
                    !this.map.ignoreBgClick
                    && (
                        !this.map.nextActionTrigger
                        || !($(e.target).is(this.map.targetElmClass)
                        || $(e.target).parents(this.map.targetElmClass).length)
                    )
                ) {

                    __closeDialogAction();
                    this.parentStep.parentSection.hotspotNextStep();
                }
            });

            // Event for block view empty space, to not conflict with selection manger multi-selection event.
            $('.fm-right-files-block .ui-selectable:visible:not(.hidden)').rebind('mousedown.onboarding', e => {

                if (e.which === 1 && !this.map.ignoreBgClick) {

                    __closeDialogAction();
                    this.parentStep.parentSection.hotspotNextStep();
                }
            });

            // Drag drop file will close the dialog and continue upload process
            $('body').rebind('drop.onboarding', () => {

                __closeDialogAction();
                this.parentStep.parentSection.hotspotNextStep();
            });

            // Next button clicked, close dialog and move to next available step
            $('.js-next', this.$dialog).rebind('click.onboarding', () => {

                __closeDialogAction();
                this.parentStep.parentSection.startNextOpenSteps();
            });

            // Skip button clicked, close dialog and mark step as completed
            $('.js-skip', this.$dialog).rebind('click.onboarding', () => {

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
    }

    mega.ui.onboarding = new OnboardV4(obMap, flagMap);
    mega.ui.onboardingFlags = OBV4_FLAGS;

    return 0xDEAD;
});
