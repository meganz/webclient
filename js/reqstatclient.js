lazy(mega, 'requestStatusMonitor', () => {
    'use strict';
    const logger = new MegaLogger('RequestStatusMonitor');

    return new class RequestStatusMonitor {

        constructor() {
            this.running = false;
            this.partialreqstat = false;
            this.reqstatbackoff = 0;
        }

        framing(data) {

            if (this.partialreqstat) {

                // we have unprocessed data - append new
                const temp = new Uint8Array(this.partialreqstat.byteLength + data.byteLength);
                temp.set(new Uint8Array(this.partialreqstat), 0);
                temp.set(new Uint8Array(data), this.partialreqstat.byteLength);
                this.partialreqstat = temp.buffer;
            }
            else {
                this.partialreqstat = data;
            }

            for (;;) {
                const t = this.process(this.partialreqstat);

                if (!t) {
                    break;
                }

                if (t === this.partialreqstat.byteLength) {

                    this.partialreqstat = false;
                    break;
                }

                // residual data present - chop
                this.partialreqstat = this.partialreqstat.slice(t);
            }
        }

        process(ab) {

            // incomplete?
            if (ab.byteLength < 2) {
                return 0;
            }

            let i;
            const ba = new Uint8Array(ab);
            const numusers = ba[0] + (ba[1] << 8);

            if (!numusers) {

                if (d) {
                    logger.log("*** No operation in progress");
                }

                loadingDialog.hideProgress();

                return 2;
            }

            let pos = 2 + 8 * numusers;

            // incomplete?
            if (ab.byteLength < pos + 2) {
                return 0;
            }

            const numops = ba[pos] + (ba[pos + 1] << 8);

            // incomplete?
            if (ab.byteLength < pos + 2 + numops + 3 * 4) {
                return 0;
            }

            let description = `User ${ab_to_base64(ab.slice(2, 10))}`;

            if (numusers > 1) {
                description += ', affecting ';

                for (i = 1; i < numusers; i++) {
                    description += `${ab_to_base64(ab.slice(2 + 8 * i, 10 + 8 * i))},`;
                }
            }

            description += ' is executing a ';

            for (i = 0; i < numops; i++) {
                if (i) {
                    description += '/';
                }

                if (String.fromCharCode(ba[pos + 2 + i]) === 'p') {
                    description += 'file or folder creation';
                }
                else {
                    description += 'UNKNOWN operation';
                }
            }

            pos += 2 + numops;

            const _int32lefromab = ab => ab[0] + (ab[1] << 8) + (ab[2] << 16) + (ab[3] << 24);
            const start = _int32lefromab(ab.slice(pos, pos + 4));
            const curr = _int32lefromab(ab.slice(pos + 4, pos + 8));
            const end = _int32lefromab(ab.slice(pos + 8, pos + 12));
            const progress = curr / end * 100;

            description += ` since ${start}, ${progress}%`;
            description += ` [${curr}/${end}]`;

            loadingDialog.showProgress(progress);

            if (d) {
                logger.log(description);
            }

            return pos + 3 * 4;
        }

        retry() {

            // retry with capped randomised exponential backoff
            if (this.reqstatbackoff < 30000) {
                this.reqstatbackoff += this.reqstatbackoff + 500 + Math.random() * 500;
            }

            this.running = false;
            setTimeout(() => this.init(), this.reqstatbackoff);
        }

        async start() {
            const {u_sid} = window;
            if (!u_sid) {
                if (d) {
                    logger.warn('Session no longer valid.');
                }
                this.running = false;
                return;
            }

            return fetch(`${apipath}cs/rs?sid=${u_sid}`)
                .then((response) => {

                    this.reqstatbackoff = 0;
                    const reader = response.body.getReader();

                    // Feed incoming chunked transfer encoded data.
                    return new ReadableStream({
                        start: () => {
                            const retry = () => this.retry();

                            (async() => {
                                while (true) {
                                    const {value, done} = await reader.read();
                                    if (done) {
                                        onIdle(retry);
                                        break;
                                    }
                                    this.framing(value);
                                }
                            })().catch(retry);
                        }
                    });
                });
        }

        init() {
            if (!this.running) {
                this.running = true;

                this.start()
                    .catch((ex) => {
                        logger.debug(ex);
                        this.retry();
                    });
            }
        }
    };
});
