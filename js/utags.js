mBroadcaster.once('startMega', () => {
    'use strict';

    if (window.uTagMT) {
        const mt = window.uTagMT;

        delete window.uTagMT;

        onIdle(() => {
            api.req({a: 'mrt', t: mt}).dump('uTagMT');
        });
    }

    if (window.uTagMCT || window.uTagMCTP) {
        onIdle(() => {

            const tags = [];

            if (window.uTagMCT) {
                eventlog(99988, window.uTagMCT);
                tags.push([window.uTagMCT, Date.now()]);
                delete window.uTagMCT;
            }

            if (window.uTagMCTP) {

                // mctp = tag-ts[-ts[-ts]]~tag-ts..., ts = base36 unix seconds, counted by mega.io already
                for (const record of String(window.uTagMCTP).split('~')) {
                    const rec = /^([\da-z]{1,32})((?:-[\da-z]{1,7})+)$/.exec(record);

                    if (rec) {
                        for (const stamp of rec[2].split('-').slice(1)) {
                            tags.push([rec[1], parseInt(stamp, 36) * 1000]);
                        }
                    }
                }

                delete window.uTagMCTP;
            }

            const mctRec = tryCatch(() => {

                if (localStorage.mctRec) {
                    const stored = JSON.parse(localStorage.mctRec);

                    if (Array.isArray(stored)) {
                        return stored;
                    }
                }
            }, false)() || [];

            for (const [tag, ts] of tags) {
                let tagEntry = mctRec.find(entry => entry && entry.tag === tag);

                if (!tagEntry) {
                    tagEntry = {tag};
                    mctRec.push(tagEntry);

                    if (mctRec.length > 20) {
                        mctRec.shift();
                    }
                }

                if (!Array.isArray(tagEntry.ts)) {
                    tagEntry.ts = [];
                }

                // mega.io re-sends its whole payload on every hand-off
                if (!tagEntry.ts.includes(ts)) {
                    tagEntry.ts.push(ts);

                    if (tagEntry.ts.length > 5) {
                        tagEntry.ts.shift();
                    }
                }
            }

            localStorage.mctRec = JSON.stringify(mctRec);
        });
    }

    if (window.uTagMJID && self.u_attr) {
        onIdle(() => {
            api.req({a: 'log', e: 500674, j: window.uTagMJID}).dump('miojid');
            delete window.uTagMJID;
        });
    }
});
