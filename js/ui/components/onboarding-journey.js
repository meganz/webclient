class MegaOnboardingJourney {
    constructor(options) {
        this.options = options || {};
        // Convert step definitions into a structured configuration
        this.stepConfigs = this.convertStepsToStepConfigs(this.options.steps);
        this.currentStepIndex = 0;
        // Store dynamically created steps
        this.createdSteps = {};
        // Initialize the main dialog component
        this.initDialog();
        // Create the stepper and main content areas
        this.initContent();
        // Display the first step
        this.updateStep();
    }

    convertStepsToStepConfigs(steps) {
        const stepConfigs = [];
        let stepIndex = 1;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            // Define base configuration for each step
            const baseStepConfig = {
                id: stepIndex.toString(),
                title: step.title || step.label,
                subtitle: step.subtitle || '',
                description: step.description || '',
                imageClass: step.imageClass || '',
                next: step.next,
                skip: step.skip,
                back: step.back,
                customContent: step.customContent
            };

            stepConfigs.push(baseStepConfig);

            // If there's a secondary step, add it as well
            if (step.secondaryStep) {
                const {secondaryStep} = step;
                const secondaryStepConfig = {
                    id: `${stepIndex}.1`,
                    title: secondaryStep.title || secondaryStep.label,
                    subtitle: secondaryStep.subtitle || '',
                    description: secondaryStep.description || '',
                    imageClass: secondaryStep.imageClass || '',
                    customContent: secondaryStep.customContent,
                    next: secondaryStep.next,
                    skip: secondaryStep.skip,
                    back: secondaryStep.back,
                };

                stepConfigs.push(secondaryStepConfig);
            }

            stepIndex++;
        }

        return stepConfigs;
    }

    initDialog() {
        this.dialog = new MegaSheet({
            parentNode: document.body,
            componentClassname: this.options.componentClassname || 'mega-sheet on-boarding',
            wrapperClassname: this.options.wrapperClassname || 'sheet'
        });
        this.dialog.on('click.context', () => {
            if (mega.ui.menu.name) {
                mega.ui.menu.hide();
                if (this.next.active) {
                    this.next.active = false;
                }
                // Remain overlayed.
                document.documentElement.classList.add('overlayed');
            }
        });
        this.megaOnboardingDiv = document.createElement('div');
        this.megaOnboardingDiv.className = this.options.contentClassname || 'mega-on-boarding';
    }

    initContent() {
        this.stepsColumn = this.createStepsColumn();
        this.mainContent = this.createMainContent();

        this.megaOnboardingDiv.appendChild(this.stepsColumn);
        this.megaOnboardingDiv.appendChild(this.mainContent);
    }

    createStepsColumn() {
        const steps = document.createElement('div');
        steps.className = 'steps';

        this.stepper = new MegaStepper({
            steps: this.options.steps,
            parentNode: steps,
            currentStep: this.options.initialStep || 1
        });

        return steps;
    }

    createMainContent() {
        const main = document.createElement('div');
        main.className = 'main-content';

        const actions = this.createActions();
        main.appendChild(actions);

        return main;
    }

    createStepContent(id, titleText, subtitleText, descriptionText, imageClass, customContent) {
        const step = document.createElement('div');
        step.className = `main-content-div hidden main-content-${id.replace(/\./g, '_')}`;
        step.id = id;

        if (imageClass) {
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'image-wrapper';
            const image = document.createElement('div');
            image.className = imageClass;
            imageWrapper.appendChild(image);
            step.appendChild(imageWrapper);
        }

        if (titleText) {
            const title = document.createElement('h2');
            title.textContent = titleText;
            step.appendChild(title);
        }

        if (subtitleText) {
            const subtitle = document.createElement('p');
            subtitle.className = 'subtitle';
            subtitle.append(parseHTML(subtitleText));
            step.appendChild(subtitle);
        }

        if (descriptionText) {
            const description = document.createElement('p');
            description.textContent = descriptionText;
            step.appendChild(description);
        }

        if (customContent) {
            // Add custom content if provided
            const customDiv = document.createElement('div');
            customDiv.className = "custom-div";
            step.appendChild(customDiv);
            if (typeof customContent === 'function') {
                const customNode = customContent();
                if (customNode instanceof HTMLElement) {
                    customDiv.appendChild(customNode);
                }
            }
            else if (customContent instanceof HTMLElement) {
                customDiv.appendChild(customContent);
            }
        }

        return step;
    }

    createActions() {
        const actions = document.createElement('div');
        actions.className = 'actions';

        const nextText =
            this.stepConfigs[0] &&
            this.stepConfigs[0].next &&
            this.stepConfigs[0].next.text || l[556];
        const nextLeftIcon =
            this.stepConfigs[0] &&
            this.stepConfigs[0].next &&
            this.stepConfigs[0].next.leftIcon || undefined;
        const nextRightIcon =
            this.stepConfigs[0] &&
            this.stepConfigs[0].next &&
            this.stepConfigs[0].next.rightIcon || undefined;
        const skipText =
            this.stepConfigs[0] &&
            this.stepConfigs[0].skip &&
            this.stepConfigs[0].skip.text || l.mega_pass_onboarding_skip;
        const nextDisabled =
            this.stepConfigs[0] &&
            this.stepConfigs[0].next &&
            this.stepConfigs[0].next.disabled || false;
        const backText =
            this.stepConfigs[0] &&
            this.stepConfigs[0].back &&
            this.stepConfigs[0].back.text || l[822];

        this.next = new MegaButton({
            parentNode: actions,
            text: nextText,
            disabled: nextDisabled,
            componentClassname: 'primary next-button',
            icon: nextLeftIcon,
            rightIcon: nextRightIcon,
            onClick: (ev) => this.handleNext(ev)
        });

        this.skip = new MegaButton({
            parentNode: actions,
            text: skipText,
            componentClassname: 'secondary',
            onClick: (ev) => this.handleSkip(ev)
        });

        this.back = new MegaButton({
            parentNode: actions,
            text: backText,
            type: 'text',
            componentClassname: 'back-button',
            onClick: (ev) => this.handleBack(ev),
        });

        return actions;
    }

    show() {
        this.dialog.show({
            name: this.options.dialogName || 'Mega-Onboarding',
            contents: [this.megaOnboardingDiv],
            showClose: this.options.showClose || false,
            preventBgClosing: this.options.preventBgClosing || true,
            onClose: this.options.onClose || nop,
            onShow: () => {
                Ps.initialize(this.mainContent.children[0]);
            }
        });
    }

    hide() {
        this.dialog.hide();
    }

    updateStep(forceRedraw = false) {
        const currentConfig = this.stepConfigs[this.currentStepIndex];

        if (currentConfig) {
            if (currentConfig.next) {
                const { text, leftIcon, rightIcon } = currentConfig.next;
                this.next.text = text || l[556];
                this.next.icon = leftIcon || false;
                if (rightIcon) {
                    this.next.rightIcon = rightIcon;
                    this.next.rightIconSize = 24;
                }
                else {
                    this.next.rightIcon = false;
                }
            }
            this.skip.text = currentConfig.skip && currentConfig.skip.text || l.mega_pass_onboarding_skip;
            this.next.disabled = currentConfig.next && currentConfig.next.disabled || false;

            if (this.currentStepIndex === this.stepConfigs.length - 1 || !currentConfig.skip) {
                this.skip.hide();
            }
            else if (currentConfig.skip) {
                this.skip.show();
            }

            if (currentConfig.back) {
                this.back.show();
            }
            else {
                this.back.hide();
            }

            if (currentConfig.skip) {
                this.skip.show();
            }
            else {
                this.skip.hide();
            }

            // Hide all previous steps
            const mainContentDivs = this.megaOnboardingDiv.querySelectorAll('.main-content-div');
            for (let i = 0; i < mainContentDivs.length; i++) {
                mainContentDivs[i].classList.add('hidden');
                if (mainContentDivs[i].classList.contains('ps')) {
                    Ps.destroy(mainContentDivs[i]);
                }
            }

            if (forceRedraw || !this.createdSteps[currentConfig.id]) {
                // If the step content hasn't been created yet, generate it
                if (this.createdSteps[currentConfig.id]) {
                    const existingStep =
                        this.megaOnboardingDiv.querySelector(`.main-content-${currentConfig.id.replace(/\./g, '_')}`);
                    if (existingStep) {
                        existingStep.remove();
                    }
                }

                const stepContent = this.createStepContent(
                    currentConfig.id,
                    currentConfig.title,
                    currentConfig.subtitle,
                    currentConfig.description,
                    currentConfig.imageClass,
                    currentConfig.customContent
                );
                this.mainContent.insertBefore(stepContent, this.mainContent.lastChild);
                this.createdSteps[currentConfig.id] = true;

                const scrollableContent = stepContent.querySelector('.scrollable');
                if (scrollableContent) {
                    scrollableContent.Ps = scrollableContent.Ps || new PerfectScrollbar(scrollableContent);
                }
            }

            const currentDiv =
                this.megaOnboardingDiv.querySelector(`.main-content-${currentConfig.id.replace(/\./g, '_')}`);
            if (currentDiv) {
                currentDiv.classList.remove('hidden');
                Ps.initialize(currentDiv);
            }

            this.stepper.setStep(Number(currentConfig.id));
        }
    }

    procAction(origEv, action, event) {
        if (typeof action === 'function') {
            action(origEv);
        }
        else if (typeof action === 'number') {
            this.goToStep(Number(action));
        }
        else {
            this.hide();
        }

        if (event) {
            eventlog(event);
        }
    }

    handleNext(ev) {
        const currentConfig = this.stepConfigs[this.currentStepIndex];

        if (currentConfig && currentConfig.next) {
            this.procAction(ev, currentConfig.next.action, currentConfig.next.event);
        }
    }

    handleSkip(ev) {
        const currentConfig = this.stepConfigs[this.currentStepIndex];

        if (currentConfig && currentConfig.skip) {
            this.procAction(ev, currentConfig.skip.action, currentConfig.skip.event);
        }
    }

    handleBack(ev) {
        const currentConfig = this.stepConfigs[this.currentStepIndex];

        if (currentConfig && currentConfig.back) {
            this.procAction(ev, currentConfig.back.action, currentConfig.back.event);
        }
    }

    goToStep(stepId, forceRedraw = false) {
        let stepIndex = -1;
        for (let i = 0; i < this.stepConfigs.length; i++) {
            if (this.stepConfigs[i].id === stepId.toString()) {
                stepIndex = i;
                break;
            }
        }

        if (stepIndex !== -1) {
            this.currentStepIndex = stepIndex;
            this.updateStep(forceRedraw);
        }
    }

    nextStep(forceRedraw = false) {
        if (this.currentStepIndex < this.stepConfigs.length - 1) {
            const nextStepId = this.stepConfigs[this.currentStepIndex + 1].id;
            this.goToStep(nextStepId, forceRedraw);
        }
    }
}
