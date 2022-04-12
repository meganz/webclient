// initialising onboarding v4
mBroadcaster.addListener('fm:initialized', () => {

    'use strict';

    // If user is visiting folderlink, not complete registration, or old user do not show Onboarding V4.
    if (folderlink || u_type < 3 || !(u_attr.since > 1631664000 || localStorage.obv4test)) {
        return;
    }

    // Onboarding Flow map. This need to be set carefully for design flow on each section.
    // Instruction requires to be place on later stage.
    const obMap = {
        'cloud-drive': {
            title: l[20556],
            flag: 'obcd',
            steps: [
                {
                    name: l[372],
                    flag: 'obcduf',
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
                    flag: 'obcdmyf',
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
                    flag: 'obcdda',
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
        }
    };

    // Main controller level of whole OBv4 include section start, reset, initialising.
    class OnboardV4 {

        /**
         * OnboardV4
         * @constructor
         */
        constructor(map) {

            this.map = map;
            this.sections = Object.create(null);
            this.start();

            mBroadcaster.addListener('pagechange', this.start.bind(this));
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
                this.sections[currentSectionName] = new OnboardV4Section(this.map[currentSectionName]);
            }
        }

        // Delete flag for testing purpose.
        reset(prefix) {

            // this is only for debugging
            if (!d) {
                return;
            }

            let obflags = ['obcd', 'obcduf', 'obcdmyf', 'obcdda'];

            if (prefix) {
                obflags = obflags.filter(flag => flag.startsWith(prefix));
            }

            for (var i = obflags.length; i--;) {
                delete fmconfig[obflags[i]];
            }
        }

        get currentSectionName() {

            switch (M.currentrootid) {
                case M.RootID: return 'cloud-drive';
                case M.InboxID: return 'inbox';
                case M.RubbishID: return 'rubbish-bin';
                default: return M.currentrootid === undefined ? M.currentdirid : M.currentrootid;
            }
        }

        get currentSection() {

            return this.sections[this.currentSectionName];
        }
    }

    // Section(Page) level like Clouddrive, Chat, Backup, Settings, etc.
    class OnboardV4Section {

        constructor(map) {

            this.map = map;
            this.steps = [];
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

            return fmconfig[this.map.flag];
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
            mega.config.set(this.map.flag, 1);
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
            return fmconfig[this.map.flag];
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

            // Setting it to user fmconfig
            mega.config.set(this.map.flag, 1);
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

            this.$dialog = $('#obDialog');

            M.safeShowDialog('onboardingDialog', () => {

                // Fill contents for the dialog
                $('#obDialog-title').text(this.map.dialogTitle);
                $('#obDialog-text').text(this.map.dialogDesc);

                this.positionDialog();
                this.bindDialogEvents();

                return this.$dialog;
            });
        }

        positionDialog() {

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

                    if (arrowAt) {
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
                $('#obDialog-arrow', this.$dialog).removeClass('hidden top bottom left right').addClass(arrowAt);
            }
            else {
                $('#obDialog-arrow', this.$dialog).addClass('hidden').removeClass('top bottom left right');
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
                if (!this.map.nextActionTrigger ||
                    !($(e.target).is(this.map.targetElmClass) ||
                    $(e.target).parents(this.map.targetElmClass).length)) {

                    __closeDialogAction();
                    this.parentStep.parentSection.hotspotNextStep();
                }
            });

            // Event for block view empty space, to not conflict with selection manger multi-selection event.
            $('.fm-right-files-block .ui-selectable:visible:not(.hidden)').rebind('mousedown.onboarding', e => {

                if (e.which === 1) {

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

    mega.ui.onboarding = new OnboardV4(obMap);

    return 0xDEAD;
});
