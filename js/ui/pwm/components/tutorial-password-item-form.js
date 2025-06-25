class TutorialPasswordItemForm extends PasswordItemForm {
    constructor() {
        super();
        this.overlay = null;
    }

    /**
     * Shows the form inside a tutorial-specific overlay.
     *
     * @param {Object} options - Options for displaying the form.
     * @param {Object} [options.tutorialDefaults] - Optional values to pre-fill the form.
     * @param {string} [options.tutorialDefaults.title] - Default value for the title field.
     * @param {string} [options.tutorialDefaults.uname] - Default value for the username field.
     * @param {string} [options.tutorialDefaults.pwd] - Default value for the password field.
     * @returns {void}
     */
    show(options = {}) {
        const defaults = options.tutorialDefaults;

        if (!this.overlay) {
            this.overlay = new MegaOverlay({
                parentNode: pmlayout,
                componentClassname: 'mega-overlay pm-overlay tutorial-overlay password-wrapper',
                wrapperClassname: 'overlay',
                scrollOverlay: true,
            });
        }

        // Temporarily suppress PM overlay to avoid interference
        const pmOverlay = mega.ui.pm.overlay;
        const originalShow = pmOverlay.show;
        pmOverlay.show = () => {
            // intentionally empty to suppress PM overlay
        };

        super.show(options);
        pmOverlay.show = originalShow;

        // Pre-fill tutorial defaults
        if (defaults) {
            this.megaTitleInput.setValue(defaults.title);
            this.megaUnameInput.setValue(defaults.uname);
            this.setPass(defaults.pwd);
            this.megaTOTPInput.setValue(defaults.totp);
        }
        this.megaWebsiteInput.$wrapper.addClass('hidden');
        this.megaNotesInput.$wrapper.addClass('hidden');

        // Show tutorial overlay with form content
        this.overlay.show({
            name: 'tutorial-password-form-overlay',
            title: options.title || '',
            contents: [this.domNode],
            showClose: true,
            confirmClose: () => this.discard(this.isFormChanged),
        });
    }

    hide() {
        this.overlay.hide();
        this.destroyTutorialOverlay();
    }

    /**
     * Cleans up overlay instance so it can be recreated fresh.
     *
     * @returns {void}
     */
    destroyTutorialOverlay() {
        if (this.overlay) {
            this.overlay.destroy();
            this.overlay = null;
        }
    }
}
