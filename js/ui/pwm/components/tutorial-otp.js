class TutorialOTP {

    /**
     * Starts the OTP tutorial sequence.
     * @returns {void}
     */
    async start() {
        this.createForm();

        requestAnimationFrame(() => {
            const totpWrapper = this.form.megaTOTPInput.$wrapper[0];
            this.showTooltip({
                targetNode: totpWrapper,
                align: 'start',
                title: l.otp_tutorial_step1_title,
                body: l.otp_tutorial_step1_body,
                actions: [
                    {text: l[556], className: 'primary', onClick: this.showSaveTooltip.bind(this)},
                    {text: l.otp_tutorial_exit, className: 'secondary', onClick: this.exitHandler.bind(this)}
                ]
            });
        });
    }

    /**
     * Creates and shows the tutorial password form.
     * @returns {void}
     */
    createForm() {
        this.form = new TutorialPasswordItemForm();
        this.form.show({
            type: 'create',
            title: l.add_item,
            tutorialDefaults: {
                title: l.otp_tutorial_default_title,
                uname: l.otp_tutorial_default_username,
                pwd: '5gM9CpugR&sk)WYx',
                totp: '1JKU 98F7 OL90 DDFD'
            },
            disableAutoFocus: true
        });
    }

    /**
     * Shows the tooltip for the save step of the tutorial.
     * @returns {void}
     */
    showSaveTooltip() {
        this.hideTooltip();

        const saveBtn = this.form.domNode.querySelector('.submit');
        this.form.overlay.scrollTo(saveBtn);

        this.showTooltip({
            targetNode: saveBtn,
            align: 'end',
            title: l.otp_tutorial_step2_title,
            body: l.otp_tutorial_step2_body,
            actions: [
                {text: l[556], className: 'primary', onClick: this.showFinalTooltip.bind(this)},
                {text: l.otp_tutorial_exit, className: 'secondary', onClick: this.exitHandler.bind(this)}
            ]
        });
    }

    /**
     * Shows the final tooltip with OTP explanation and end of tutorial.
     * @returns {void}
     */
    showFinalTooltip() {
        const tutorialEntry = {
            h: 'tutorial',
            name: l.otp_tutorial_default_title,
            u: l.otp_tutorial_default_username,
            pwd: '5gM9CpugR&sk)WYx',
            totp: {shse: l.otp_tutorial_default_totp, nd: '6', t: '30', alg: 'sha1'}
        };
        mega.ui.pm.list.loadList(tutorialEntry)
            .then(() => {
                const item = mega.ui.pm.list.passwordList.componentSelector(`#${tutorialEntry.h}`);
                if (!item) {
                    throw new Error('Tutorial item not found');
                }
                return item.trigger('click.selectItem');
            })
            .then(() => {
                mega.ui.pm.list.passwordItem.domNode.classList.add('tutorial');

                this.hideTooltip();
                this.form.hide();

                const pmOverlayWasVisible = mega.ui.pm.overlay.visible;
                if (pmOverlayWasVisible) {
                    mega.ui.pm.overlay.removeClass('active');
                }

                const otpField = mega.ui.pm.list.passwordItem.otpField.domNode;

                this.showTooltip({
                    targetNode: otpField,
                    position: 'bottom',
                    align: 'end',
                    title: l.otp_tutorial_step3_title,
                    body: l.otp_tutorial_step3_body,
                    actions: [
                        {
                            text: l.otp_tutorial_finish,
                            className: 'primary',
                            onClick: async() => {
                                this.hideTooltip();
                                if (pmOverlayWasVisible) {
                                    mega.ui.pm.overlay.addClass('active');
                                }
                                mega.ui.pm.list.loadList().catch(tell);
                                mega.ui.pm.list.passwordItem.domNode.classList.remove('tutorial');
                            }
                        }
                    ]
                });
            })
            .catch(tell);
    }

    /**
     * Handler to exit the tutorial after user confirmation.
     * @returns {Promise<void>} Resolves when the tutorial exit sequence is completed.
     */
    async exitHandler() {
        if (await this.confirmExit()) {
            this.hideTooltip();
            this.form.hide();
        }
    }

    /**
     * Prompts the user to confirm exiting the tutorial.
     * @returns {Promise<boolean>} Resolves to true if the user confirms exit.
     */
    confirmExit() {
        return new Promise(resolve => {

            const footerElements = mCreateElement('div', { class: 'flex flex-row-reverse' });
            MegaButton.factory({
                parentNode: footerElements,
                text: l.otp_tutorial_exit,
                componentClassname: 'slim font-600',
                type: 'normal'
            }).on('click', () => {
                resolve(true);
                mega.ui.sheet.hide();
            });

            MegaButton.factory({
                parentNode: footerElements,
                text: l.otp_tutorial_continue,
                componentClassname: 'slim font-600 mx-2 secondary',
                type: 'normal'
            }).on('click', () => mega.ui.sheet.hide());

            megaMsgDialog.render(
                l.otp_tutorial_exit_confirm_title,
                l.otp_tutorial_exit_confirm_body,
                '',
                {},
                {
                    sheetType: 'normal',
                    footer: {
                        slot: [footerElements],
                        confirmButton: false
                    }
                },
                false,
                true
            );
        });
    }

    /**
     * Highlights an element by cloning it and fixing its position on screen.
     * @param {HTMLElement} element - The element to highlight.
     * @param {Object} [options] - Optional settings for the highlight effect.
     * @param {number} [options.zIndex=1] - z-index to apply to the clone.
     * @param {boolean} [options.syncOnResize=true] - Whether to sync position on resize.
     * @returns {{ clone: HTMLElement, destroy: Function } | null} Clone element and a cleanup function.
     */
    highlightElement(element, options = {}) {
        const {zIndex = 1, syncOnResize = true} = options;

        if (!element || !document.body.contains(element)) {
            return null;
        }

        const rect = element.getBoundingClientRect();
        const clone = element.cloneNode(true);

        Object.assign(clone.style, {
            position: 'fixed',
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            zIndex,
            margin: 0,
            pointerEvents: 'none',
            boxSizing: 'border-box'
        });

        clone.classList.add('highlighted');
        document.body.appendChild(clone);

        const updatePosition = () => {
            const r = element.getBoundingClientRect();
            Object.assign(clone.style, {
                top: `${r.top}px`,
                left: `${r.left}px`,
                width: `${r.width}px`,
                height: `${r.height}px`
            });
        };

        if (syncOnResize) {
            window.addEventListener('resize', updatePosition);
        }

        const destroy = () => {
            clone.remove();
            window.removeEventListener('resize', updatePosition);
        };

        return {clone, destroy};
    }

    /**
     * Displays a tooltip and highlights the associated element.
     * @param {Object} config - Configuration for the tooltip.
     * @param {HTMLElement} config.targetNode - The DOM element to highlight and attach the tooltip to.
     * @param {string} config.title - Title shown in the tooltip.
     * @param {string} config.body - Body content of the tooltip.
     * @param {string} [config.position] - Optional tooltip position (e.g., 'bottom').
     * @param {string} [config.align] - Optional alignment (e.g., 'end').
     * @param {Array<{text: string, className: string, onClick: Function}>} config.actions - Tooltip buttons.
     * @returns {void}
     */
    showTooltip({targetNode, title, body, position, align, actions}) {
        const {destroy} = this.highlightElement(targetNode);

        mega.ui.tooltip.show({
            targetNode,
            width: 300,
            title,
            body,
            position,
            align,
            actions: actions.map(({text, className, onClick}) => ({
                text,
                className,
                onClick
            })),
            onClose: destroy
        });
    }

    /**
     * Hides the currently displayed tooltip and removes the highlight
     * from the associated target element.
     *
     * @returns {void}
     */
    hideTooltip() {
        mega.ui.tooltip.hide();
        if (mega.ui.tooltip.targetNode) {
            mega.ui.tooltip.targetNode.classList.remove('highlighted');
        }
    }
}
