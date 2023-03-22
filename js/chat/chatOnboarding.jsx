import { SoonFcWrap } from "./mixins.js";
import { CONVERSATIONS_APP_EVENTS, CONVERSATIONS_APP_VIEWS } from "./ui/conversations.jsx";

class ChatOnboarding {

    finished = false;

    currentChatIsScheduled = false;

    constructor(megaChat) {
        if (u_type === 3 && !is_mobile) {
            this.scheduledOccurrencesMap = {
                flag: OBV4_FLAGS.CHAT_SCHEDULE_OCCUR,
                actions: [
                    {
                        type: 'showDialog',
                        dialogClass: 'mcob',
                        dialogTitle: l.onboard_megachat_dlg7b_title,
                        dialogDesc: l.onboard_megachat_dlg7b_text,
                        targetElmClass: `.conversationsApp .conversation-panel:not(.hidden)
                                 .chatroom-occurrences-panel .chat-dropdown.header`,
                        targetElmPosition: 'left',
                        ignoreBgClick: true,
                        markComplete: true,
                    }
                ],
            };

            this.feedbackMap = {
                flag: OBV4_FLAGS.CHAT_FEEDBACK_NEW,
                actions: [
                    {
                        type: 'showDialog',
                        dialogClass: 'mcob',
                        dialogTitle: l.onboard_megachat_dlg10_title,
                        dialogDesc: l.onboard_megachat_dlg10_text,
                        targetElmClass: '#fmholder button.js-more-menu.js-top-buttons',
                        targetElmPosition: 'left bottom',
                        targetHotSpot: true,
                        markComplete: true,
                        skipHidden: true,
                        ignoreBgClick: '.conversationsApp',
                        dialogNext: l[726],
                    }
                ]
            };

            this.state = {
                [OBV4_FLAGS.CHAT]: -1,
                [OBV4_FLAGS.CHAT_SCHEDULE_NEW]: -1,
                [OBV4_FLAGS.CHAT_SCHEDULE_ADDED]: -1,
                [OBV4_FLAGS.CHAT_SCHEDULE_OCCUR]: -1,
                [OBV4_FLAGS.CHAT_SCHEDULE_CONF]: -1,
                [OBV4_FLAGS.CHAT_FEEDBACK_NEW]: -1,
                [OBV4_FLAGS.CHAT_CONTACT_PANE]: -1,
            };

            this.actions = {
                [OBV4_FLAGS.CHAT_SCHEDULE_OCCUR]: null,
                [OBV4_FLAGS.CHAT_FEEDBACK_NEW]: null,
            };
            this.megaChat = megaChat;
            this.flagMap = attribCache.bitMapsManager.exists('obv4')
                ? attribCache.bitMapsManager.get('obv4')
                : new MegaDataBitMap('obv4', false, Object.values(OBV4_FLAGS));

            // Fetch the current values of these keys to start tracking them
            const keys = Object.keys(this.state);
            const promises = keys.map(key => this.flagMap.get(key));
            Promise.allSettled(promises).then(res => {
                for (let i = 0; i < res.length; ++i) {
                    const v = res[i];
                    if (v.status === 'fulfilled') {
                        this.state[keys[i]] = v.value;
                    }
                }
            });

            this.interval = setInterval(() => {
                if (!$.dialog) {
                    this.checkAndShowStep();
                }
            }, 10000);

            this.initListeners();
        }
    }

    initListeners() {
        this.flagMap.addChangeListener((...args) => this.handleFlagChange(...args));

        this.megaChat.chatUIFlags.addChangeListener(SoonFc(200, () => {
            if (this.megaChat.chatUIFlags.convPanelCollapse && $.dialog === 'onboardingDialog') {
                closeDialog();
            }
            this.checkAndShowStep();
        }));

        this.megaChat.addChangeListener(() => {
            const room = this.megaChat.getCurrentRoom();
            if (!room) {
                return;
            }
            if (
                $.dialog === 'onboardingDialog'
                && (
                    this.currentChatIsScheduled && !room.scheduledMeeting
                    || (this.occurrenceDialogShown ^ this.willShowOccurrences)
                )
            ) {
                closeDialog();
            }
            this.currentChatIsScheduled = !!room.scheduledMeeting;
            this.checkAndShowStep();
        });

        this.schedListeners = [
            `${this.megaChat.plugins.meetingsManager.EVENTS.INITIALIZE}.chatonboard`,
            `${this.megaChat.plugins.meetingsManager.EVENTS.OCCURRENCES_UPDATE}.chatonboard`
        ];
        for (const event of this.schedListeners) {
            this.megaChat.rebind(event, () => this.handleNewScheduledMeeting());
        }
    }

    handleNewScheduledMeeting() {
        if (this.state[OBV4_FLAGS.CHAT_SCHEDULE_NEW] !== 1) {
            this.flagMap.set(OBV4_FLAGS.CHAT_SCHEDULE_NEW, 1);
            this.flagMap.safeCommit();
            if ($.dialog === 'onboardingDialog') {
                closeDialog();
            }
            this.checkAndShowStep();
        }
        for (const event of this.schedListeners) {
            this.megaChat.off(event);
        }
        if (M.chat && megaChatIsReady) {
            this.megaChat.trigger(CONVERSATIONS_APP_EVENTS.NAV_RENDER_VIEW, CONVERSATIONS_APP_VIEWS.MEETINGS);
        }
        delete this.schedListeners;
    }

    showOccurrencesDialog() {
        if (this.state[OBV4_FLAGS.CHAT_SCHEDULE_CONF] === 1) {
            this.scheduledOccurrencesMap.actions[0].skipHidden = true;
            this.scheduledOccurrencesMap.actions[0].dialogNext = l[81];
            if (
                this.actions[OBV4_FLAGS.CHAT_SCHEDULE_OCCUR]
                && typeof this.actions[OBV4_FLAGS.CHAT_SCHEDULE_OCCUR].map.skipHidden === 'undefined'
            ) {
                delete this.actions[OBV4_FLAGS.CHAT_SCHEDULE_OCCUR];
            }
        }
        if (!this.actions[OBV4_FLAGS.CHAT_SCHEDULE_OCCUR]) {
            // Dummy action to save on copy-paste code.
            /**
             * @property {function} markDone
             * @property {function} markDeactive
             * @property {function} toNextAction
             * @property {jQuery} $obControlPanel
             * @property {object} parentSection
             */
            const parent = {
                markDone: () => {
                    this.occurrenceDialogShown = false;
                    this.flagMap.set(OBV4_FLAGS.CHAT_SCHEDULE_OCCUR, 1);
                    this.flagMap.safeCommit();
                    this.checkAndShowStep();
                },
                markDeactive: () => {
                    this.occurrenceDialogShown = false;
                },
                toNextAction: nop,
                $obControlPanel: $('.onboarding-control-panel', fmholder),
                /**
                 * @property {function} showConfirmDismiss
                 * @property {function} startNextOpenSteps
                 * @property {function} hotspotNextStep
                 */
                parentSection: {
                    showConfirmDismiss: () => {
                        this.flagMap.setSync(OBV4_FLAGS.CHAT_SCHEDULE_OCCUR, 1);
                        // Do it like this to ensure the state update is correct for both flags.
                        this.flagMap.commit().always(() => {
                            this.flagMap.setSync(OBV4_FLAGS.CHAT, 1);
                            this.flagMap.safeCommit();
                        });
                    },
                    startNextOpenSteps: nop,
                    hotspotNextStep: nop,
                    parent: {},
                }
            };
            this.actions[OBV4_FLAGS.CHAT_SCHEDULE_OCCUR]
                = new OnboardV4Action(parent, this.scheduledOccurrencesMap.actions[0]);
        }
        if ($.dialog === 'onboardingDialog') {
            closeDialog();
        }
        $('.chat-dropdown.header:not(.expanded)', '.chatroom-occurrences-panel').filter(':visible').click();
        this.actions[OBV4_FLAGS.CHAT_SCHEDULE_OCCUR].execute();
        this.occurrenceDialogShown = true;
    }

    showNewUserFeedbackDialog() {
        if (!this.actions[OBV4_FLAGS.CHAT_FEEDBACK_NEW]) {
            // Dummy action to save on copy-paste code.
            /**
             * @property {function} markDone
             * @property {function} markDeactive
             * @property {function} toNextAction
             * @property {jQuery} $obControlPanel
             * @property {object} parentSection
             */
            const parent = {
                markDone: () => {
                    this.flagMap.set(OBV4_FLAGS.CHAT_FEEDBACK_NEW, 1);
                    this.flagMap.safeCommit();
                    delete mega.ui.onboarding.$hotSpotNode;
                    this.checkAndShowStep();
                },
                markDeactive: () => {
                    delete mega.ui.onboarding.$hotSpotNode;
                },
                toNextAction: nop,
                $obControlPanel: $('.onboarding-control-panel', fmholder),
                /**
                 * @property {function} showConfirmDismiss
                 * @property {function} startNextOpenSteps
                 * @property {function} hotspotNextStep
                 */
                parentSection: {
                    showConfirmDismiss: nop,
                    startNextOpenSteps: nop,
                    hotspotNextStep: nop,
                    parent: {},
                }
            };
            this.actions[OBV4_FLAGS.CHAT_FEEDBACK_NEW]
                = new OnboardV4Action(parent, this.feedbackMap.actions[0]);
        }
        if ($.dialog === 'onboardingDialog') {
            closeDialog();
        }
        this.actions[OBV4_FLAGS.CHAT_FEEDBACK_NEW].execute();
        mega.ui.onboarding.$hotSpotNode = $(this.feedbackMap.actions[0].targetElmClass);
    }

    @SoonFcWrap(1000)
    checkAndShowStep() {
        if (!M.chat || !mega.ui.onboarding || $.dialog || loadingDialog.active || u_type < 3 || is_mobile) {
            // Invalid state to show or onboarding isn't ready
            return;
        }

        const { sections } = mega.ui.onboarding;
        if (!sections) {
            return;
        }

        const { chat: obChat } = sections;
        if (!obChat) {
            return;
        }

        this.$searchPanel = this.$searchPanel || $('.search-panel', '.conversationsApp');
        if (this.$searchPanel.hasClass('expanded')) {
            return;
        }

        if (
            this.state[OBV4_FLAGS.CHAT_FEEDBACK_NEW] !== 1
            && this.state[OBV4_FLAGS.CHAT_CONTACT_PANE] === 1
        ) {
            this.showNewUserFeedbackDialog();
            return;
        }

        const room = this.megaChat.getCurrentRoom();
        if (
            room
            && room.scheduledMeeting
            && room.scheduledMeeting.recurring
            && this.state[OBV4_FLAGS.CHAT_SCHEDULE_ADDED] === 1
            && this.state[OBV4_FLAGS.CHAT_SCHEDULE_OCCUR] !== 1
            && !this.megaChat.chatUIFlags.convPanelCollapse
        ) {
            this.showOccurrencesDialog();
            return;
        }

        if (this.state[OBV4_FLAGS.CHAT]) {
            return;
        }

        this.showDefaultNextStep(obChat);
    }

    showDefaultNextStep(obChat) {
        const nextIdx = obChat.searchNextOpenStep();
        if (
            nextIdx !== false
            && (!this.$obDialog || !this.$obDialog.is(':visible'))
            && (this.obToggleDrawn || $('.toggle-panel-heading', '.conversationsApp').length)
        ) {
            this.obToggleDrawn = true;
            if (
                obChat.steps
                && obChat.steps[nextIdx]
                && obChat.steps[nextIdx].isComplete
            ) {
                return;
            }

            if (!megaChat.hasSupportForCalls && obChat.steps[nextIdx].map.flag === OBV4_FLAGS.CHAT_SCHEDULE_START) {
                this.flagMap.isReady().always(() => {
                    this.flagMap.setSync(OBV4_FLAGS.CHAT_SCHEDULE_START, 1);
                    this.flagMap.safeCommit();
                    this.checkAndShowStep();
                });
                return;
            }
            const res = obChat.startNextOpenSteps(nextIdx);
            if (obChat.steps[nextIdx].map.flag === OBV4_FLAGS.CHAT_SCHEDULE_CONF && res !== false) {
                $('.chat-dropdown.header:not(.expanded)', '.chatroom-options-panel').filter(':visible').click();
            }
            this.$obDialog = this.$obDialog || $('#ob-dialog');
        }
    }

    handleFlagChange(...args) {
        if (
            args.length >= 4
            && typeof args[2] === 'string'
            && typeof args[3] === 'number'
            && this.state.hasOwnProperty(args[2])
        ) {
            if (d) {
                console.debug(`Chat onboarding flag ${args[2]}: ${this.state[args[2]]} -> ${args[3]}`);
            }
            this.state[args[2]] = args[3];
            if (args[2] === OBV4_FLAGS.CHAT && args[3] === 1 && this.interval) {
                clearInterval(this.interval);
                delete this.interval;
            }
        }
    }

    get isMeetingsTab() {
        this.$meetingsTab = this.$meetingsTab || $('.lhp-nav .lhp-meetings-tab', '.conversationsApp');
        return this.$meetingsTab.hasClass('active');
    }

    get willShowOccurrences() {
        if (!this.currentChatIsScheduled) {
            return false;
        }
        if (this.state[OBV4_FLAGS.CHAT_SCHEDULE_OCCUR] === 1) {
            return false;
        }
        if (this.state[OBV4_FLAGS.CHAT_SCHEDULE_ADDED] === 0) {
            return false;
        }
        return !!this.megaChat.getCurrentRoom().scheduledMeeting.recurring;
    }

    get canShowScheduledNew() {
        return this.state[OBV4_FLAGS.CHAT_FEEDBACK_NEW] === 1 && this.state[OBV4_FLAGS.CHAT_CONTACT_PANE] === 1;
    }

    destroy() {
        if (this.interval) {
            clearInterval(this.interval);
            delete this.interval;
        }

        if (this.schedListeners) {
            for (const event of this.schedListeners) {
                this.megaChat.off(event);
            }
            delete this.schedListeners;
        }
    }
}

export {
    ChatOnboarding,
};
