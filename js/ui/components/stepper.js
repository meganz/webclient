class MegaStepper extends MegaComponent {
    constructor(options) {
        super(options);

        this.steps = options.steps;
        this.currentStep = options.currentStep || 1;

        this.addClass('stepper');
        this.render();
    }

    render() {
        this.domNode.textContent = '';
        for (let index = 1; index < this.steps.length; index++) {
            const stepElement = this.createStepElement(this.steps[index - 1], index);
            this.domNode.appendChild(stepElement);
        }
    }

    createStepElement(step, index, isSecondary = false) {
        const stepElement = document.createElement('div');
        const stepPrefix = isSecondary ? 'secondary' : 'primary';
        stepElement.classList.add('step', `${stepPrefix}-step`);

        const currentPrimaryIndex = Math.floor(this.currentStep);

        if (isSecondary) {
            // Secondary steps use fractional values (e.g., 1.1). Determine their state accordingly.
            if (this.currentStep === index + 0.1) {
                stepElement.classList.add('active');
            }
            else if (this.currentStep > index + 0.1) {
                stepElement.classList.add('completed');
            }
        }
        else if (currentPrimaryIndex === index) {
            stepElement.classList.add('active');
            if (this.currentStep === index + 0.1) {
                stepElement.classList.add('sub-active');
            }
        }
        else if (index < currentPrimaryIndex) {
            stepElement.classList.add('completed');
        }

        const stepContent = document.createElement('div');
        stepContent.classList.add('step-content', `${stepPrefix}-step-content`);

        const stepIcon = document.createElement('div');
        stepIcon.classList.add('step-icon', `${stepPrefix}-step-icon`, 'sprite-fm-mono');

        // Icon type depends on the step state
        if (stepElement.classList.contains('completed')) {
            stepIcon.classList.add(isSecondary ? 'icon-dot-small-regular' : 'icon-check-circle-regular-solid');
        }
        else if (stepElement.classList.contains('sub-active')) {
            stepIcon.classList.add('icon-circle-big-regular-solid');
        }
        else {
            stepIcon.classList.add(isSecondary ? 'icon-dot-regular-outline' : 'icon-circle-big-regular-outline');
        }

        if (!isSecondary) {
            const stepNumber = document.createElement('div');
            stepNumber.classList.add('step-number');
            stepNumber.innerText = index;
            stepIcon.appendChild(stepNumber);
        }

        const stepTitle = document.createElement('div');
        stepTitle.classList.add('step-title', `${stepPrefix}-step-title`);
        stepTitle.innerText = step.label;

        stepContent.append(stepIcon, stepTitle);

        stepElement.appendChild(stepContent);

        // Recursive call to create secondary steps if they exist
        if (!isSecondary && step.secondaryStep) {
            const secondaryStepElement = this.createStepElement(step.secondaryStep, index, true);
            stepElement.appendChild(secondaryStepElement);
        }

        return stepElement;
    }

    nextStep() {
        const nextStep = this.calculateNextStep();
        if (nextStep !== null) {
            this.setStep(nextStep);
        }
    }

    prevStep() {
        const prevStep = this.calculatePrevStep();
        if (prevStep !== null) {
            this.setStep(prevStep);
        }
    }

    setStep(step) {
        if (this.isValidStep(step)) {
            this.currentStep = step;
            this.render();
        }
        else {
            console.warn(`Invalid step: ${step}`);
        }
    }

    calculateNextStep() {
        const [primaryIndex, secondaryIndex] = this.parseStep(this.currentStep);

        // Handle transitions between primary and secondary steps
        if (secondaryIndex === null && this.steps[primaryIndex] && this.steps[primaryIndex].secondaryStep) {
            return primaryIndex + 1.1; // Move to secondary step
        }
        else if (secondaryIndex !== null) {
            return Math.ceil(this.currentStep); // Move to next primary step
        }
        else if (primaryIndex + 1 < this.steps.length) {
            return primaryIndex + 2; // Move to next step if available
        }

        return null; // No further steps
    }

    calculatePrevStep() {
        const [primaryIndex, secondaryIndex] = this.parseStep(this.currentStep);

        if (secondaryIndex !== null) {
            return Math.floor(this.currentStep); // Return to primary step
        }
        else if (primaryIndex > 0) {
            const prevPrimaryIndex = primaryIndex - 1;
            if (this.steps[prevPrimaryIndex] && this.steps[prevPrimaryIndex].secondaryStep) {
                return prevPrimaryIndex + 1.1; // Move to secondary step of the previous primary
            }
            return prevPrimaryIndex + 1;
        }

        return null; // No previous steps
    }

    parseStep(step) {
        // Extract primary and secondary indices from the step value
        const primaryIndex = Math.floor(step) - 1;
        const secondaryIndex = step % 1 === 0 ? null : step % 1;
        return [primaryIndex, secondaryIndex];
    }

    isValidStep(step) {
        const [primaryIndex, secondaryIndex] = this.parseStep(step);

        if (primaryIndex >= 0 && primaryIndex < this.steps.length) {
            // Check if the step is valid and if secondary step exists (if applicable)
            if (secondaryIndex === null) {
                return true;
            }
            return !!this.steps[primaryIndex].secondaryStep;
        }

        return false;
    }
}
