class MegaWorkletMessenger extends AudioWorkletProcessor {
    constructor() {
        super();
        this.threshold = false;
        this.currentTime = currentTime;
        this.port.onmessage = (ev) => this.handleMessage(ev);
    }

    handleMessage(ev) {
        const {message, threshold} = ev.data;
        // console.debug('worklet-messenger', ev.data);

        if (message === 'schedule') {
            this.threshold = threshold / 1e3;
        }
        else if (message === 'sleep') {
            this.threshold = false;
        }
    }

    process() {
        if (this.threshold && currentTime - this.currentTime > this.threshold) {
            // console.debug('worklet-processor', currentTime);

            this.currentTime = currentTime;
            this.port.postMessage({message: 'dispatch', currentTime});
        }

        return true;
    }
}

registerProcessor('mega-worklet-messenger', MegaWorkletMessenger);
