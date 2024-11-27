import { SoonFcWrap } from "./mixins.js";
import { VIEWS as CONVERSATIONS_APP_VIEWS, EVENTS as CONVERSATIONS_APP_EVENTS } from "./ui/conversations.jsx";

class ChatOnboarding {

    finished = false;

    constructor(megaChat) {
        if (u_type === 3 && !is_mobile) {
            this.state = {
                [OBV4_FLAGS.CHAT]: -1,
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
                        this.handleFlagChange(null, null, keys[i], v.value);
                    }
                }
            });

            this.interval = setInterval(() => {
                if (!$.dialog) {
                    this._checkAndShowStep();
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
            this._checkAndShowStep();
        }));

        this.megaChat.addChangeListener(() => {
            const room = this.megaChat.getCurrentRoom();
            if (!room) {
                return;
            }
            this.checkAndShowStep();
        });
    }

    @SoonFcWrap(1000)
    checkAndShowStep() {
        this._checkAndShowStep();
    }

    _shouldSkipShow() {
        if (
            !M.chat
            || !mega.ui.onboarding
            || $.dialog
            || loadingDialog.active
            || u_type < 3
            || is_mobile
            || $.msgDialog
        ) {
            // Invalid state to show or onboarding isn't ready
            return true;
        }

        // Specific UI elements that should prevent showing the dialogs.
        this.$topRightMenu = this.$topRightMenu || $('.top-menu-popup', '#topmenu');
        if (!this.$topRightMenu.hasClass('o-hidden')) {
            return true;
        }

        this.$topAccDropdown = this.$topAccDropdown || $('.js-dropdown-account', '#topmenu');
        if (this.$topAccDropdown.hasClass('show')) {
            return true;
        }

        this.$topNotifDropdown = this.$topNotifDropdown || $('.js-dropdown-notification', '#topmenu');
        if (this.$topNotifDropdown.hasClass('show')) {
            return true;
        }

        this.$searchPanel = this.$searchPanel || $('.search-panel', '.conversationsApp');
        return this.$searchPanel.hasClass('expanded');
    }

    _checkAndShowStep() {
        if (this._shouldSkipShow()) {
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
            && (this.obToggleDrawn || $('.conversations-category', '.conversationsApp').length)
        ) {
            this.obToggleDrawn = true;
            if (
                obChat.steps
                && obChat.steps[nextIdx]
                && obChat.steps[nextIdx].isComplete
            ) {
                return;
            }

            obChat.startNextOpenSteps(nextIdx);
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

    destroy() {
        if (this.interval) {
            clearInterval(this.interval);
            delete this.interval;
        }
    }
}

export {
    ChatOnboarding,
};
