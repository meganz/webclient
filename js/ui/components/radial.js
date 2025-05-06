class MegaTimerRadialComponent extends MegaComponent {

    constructor(options) {
        super(options);

        this.timerDuration = options.timerDuration || 30;
        // Set a CSS variable for the timer duration (e.g., "30s")
        this.domNode.style.setProperty('--timer-duration', `${this.timerDuration}s`);
        this.domNode.style.setProperty('--animation-delay', `-${options.animationDelay}s`);

        this.addClass('timer-radial');

        // Create the SVG structure and the timer text element
        this.svg = this.createSVG();
        this.timerText = this.createTimerText();
        this.domNode.append(this.svg, this.timerText);

        // Inject dynamically generated keyframes for the countdown text animation
        this.injectCountdownTextKeyframes();
    }

    createSVG() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');

        // Create the background circle
        const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bgCircle.classList.add('bg');
        bgCircle.setAttribute('cx', '12');
        bgCircle.setAttribute('cy', '12');
        bgCircle.setAttribute('r', '10');

        // Create the progress circle
        const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        progressCircle.classList.add('progress');
        progressCircle.setAttribute('cx', '12');
        progressCircle.setAttribute('cy', '12');
        progressCircle.setAttribute('r', '10');
        progressCircle.setAttribute('pathLength', '100');

        svg.appendChild(bgCircle);
        svg.appendChild(progressCircle);
        return svg;
    }

    createTimerText() {
        // Create a div element to display the countdown timer
        const timerText = document.createElement('div');
        timerText.classList.add('timer-text');
        return timerText;
    }

    getCountdownKeyframes() {
        // Start keyframes for the countdown-text animation
        let keyframes = `@keyframes countdown-text {\n`;
        // Create a keyframe for each second of the timer duration
        for (let i = 0; i <= this.timerDuration; i++) {
            const percentage = (i / this.timerDuration) * 100;
            const secondsRemaining = this.timerDuration - i;
            keyframes += `${percentage.toFixed(2)}% {content: '${secondsRemaining}';
                            font-size: ${secondsRemaining > 99 ? '8px' : '11px'}}\n`;
        }
        // Close the keyframes block
        keyframes += `}`;
        return keyframes;
    }

    injectCountdownTextKeyframes() {
        const style = this.domNode.getElementsByTagName('style')[0];

        if (style) {
            style.remove();
        }

        // Create a style element and set its content to the generated keyframes
        const styleEl = document.createElement('style');
        styleEl.textContent = this.getCountdownKeyframes();
        this.domNode.appendChild(styleEl);
    }

    startCycleTimer(callback) {
        // Call the callback every timerDuration seconds (converted to milliseconds)
        this.cycleInterval = setInterval(callback, this.timerDuration * 1000);
    }

    destroy() {
        super.destroy();
        clearInterval(this.cycleInterval);
    }
}
