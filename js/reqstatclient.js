/** @property mega.requestStatusMonitor */
lazy(mega, 'requestStatusMonitor', () => {
    'use strict';

    const o2d = freeze({
        p: 'file or folder creation'
    });
    const unk = 'UNKNOWN operation';

    const getDescription = (u8, buffer, offset, users, ops) => {
        let description = `User ${ab_to_base64(buffer.slice(2, 10))}`;

        if (users > 1) {
            description += ', affecting ';

            for (let i = 1; i < users; i++) {
                description += `${ab_to_base64(buffer.slice(2 + 8 * i, 10 + 8 * i))},`;
            }
        }
        description += ' is executing a ';

        const ob = [];
        const oo = Object.create(null);

        for (let i = 0; i < ops; i++) {
            const d = o2d[String.fromCharCode(u8[offset + 2 + i])] || unk;

            oo[d] = (oo[d] || 0) + 1;
        }

        for (const k in oo) {
            ob.push(`${k}(${oo[k]})`);
        }

        return description + ob.join('/');
    };

    return new class RequestStatusMonitor extends MEGAKeepAliveStream {

        constructor() {
            const handlers = {
                onchunk(chunk) {
                    this.framing(chunk);
                }
            };
            super(handlers);
            this.buffer = false;
            this.progress = -1;
            this.visible = false;
        }

        show() {
            this.visible = true;
            if (this.progress >= 0) {
                if (loadingInitDialog.active) {
                    loadingInitDialog.step2(this.progress);
                }
                else {
                    loadingDialog.showProgress(this.progress);
                }
            }
        }

        hide() {
            if (this.visible) {
                this.visible = false;
                if (this.progress >= 0) {
                    loadingDialog.hideProgress();
                }
            }
        }

        framing(data) {

            if (this.buffer) {

                // we have unprocessed data - append new
                const temp = new Uint8Array(this.buffer.byteLength + data.byteLength);
                temp.set(new Uint8Array(this.buffer), 0);
                temp.set(new Uint8Array(data), this.buffer.byteLength);
                this.buffer = temp.buffer;
            }
            else {
                this.buffer = data.buffer || data;
            }

            for (;;) {
                const t = this.process(this.buffer);

                if (!t) {
                    break;
                }

                if (t === this.buffer.byteLength) {

                    this.buffer = false;
                    break;
                }

                // residual data present - chop
                this.buffer = this.buffer.slice(t);
            }
        }

        process(buffer) {

            // incomplete?
            if (buffer.byteLength < 2) {
                return 0;
            }

            const u8 = new Uint8Array(buffer);
            const users = u8[0] + (u8[1] << 8);

            if (!users) {

                if (d) {
                    this.logger.log("*** No operation in progress");
                }

                if (this.progress >= 0) {
                    if (this.visible) {
                        loadingDialog.hideProgress();
                    }
                    this.progress = -1;
                    api.retry();
                }

                return 2;
            }

            if (u8[0] === 45 && u8.byteLength < 4) {
                const err = String.fromCharCode.apply(null, u8) | 0;

                if (err === ESID) {
                    this.abort(api_strerror(err));
                    return buffer.byteLength;
                }
            }

            let offset = 2 + 8 * users;

            // incomplete?
            if (buffer.byteLength < offset + 2) {
                return 0;
            }

            const ops = u8[offset] + (u8[offset + 1] << 8);

            // incomplete?
            if (buffer.byteLength < offset + 2 + ops + 3 * 4) {
                return 0;
            }

            let description = self.d && getDescription(u8, buffer, offset, users, ops) || '';

            offset += 2 + ops;

            const view = new DataView(buffer);
            const start = view.getUint32(offset, true);
            const curr = view.getUint32(offset + 4, true);
            const end = view.getUint32(offset + 8, true);

            this.progress = curr / end * 100;
            if (this.visible) {
                loadingDialog.showProgress(this.progress);
            }

            if (d) {
                description += ` since ${start}, ${this.progress}% [${curr}/${end}]`;
                this.logger.log(description);
            }

            return offset + 3 * 4;
        }

        schedule(running) {
            if (running) {
                return;
            }

            // retry with capped randomised exponential backoff
            if (this.backoff < 6e5) {
                this.backoff += 2e3 + -Math.log(Math.random()) * 5e3;
            }

            return super.schedule(this.backoff / 1e3);
        }

        init() {
            const {u_sid} = window;
            if (!u_sid) {
                if (d) {
                    this.logger.warn('Session no longer valid.');
                }
                return;
            }

            this.setURL(`${apipath}cs/rs?sid=${u_sid}`).restart('initialization');
        }
    };
});

mBroadcaster.once('boot_done', () => {
    'use strict';

    if (is_iframed) {
        return;
    }

    let hook;
    api.observe('setsid', () => {

        if (!hook) {
            const hide = () => mega.requestStatusMonitor.hide();
            hook = (res) => {
                queueMicrotask(hide);
                return res;
            };

            api.hook(({channel}) => {

                if (channel === 0 || channel === 4) {
                    mega.requestStatusMonitor.show();

                    // hide progress bar whenever this request completes.
                    return hook;
                }
            });
        }
        mega.requestStatusMonitor.init();
    });
});
