self.fmdb = false;
self.locale = self.lang || 'en';
lazy(self, 'thumbnails', () => {
    'use strict';
    return new ThumbManager(384);
});
lazy(self, 'is_touchable', () => {
    'use strict';
    return 'ontouchstart' in self || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
});

// @todo revamp media.js to use async/await
class MegaPromise extends Promise {
    done(a) {
        return this.then(a);
    }

    tryCatch(a, b) {
        return this.then(a, b);
    }

    fail(a) {
        return this.catch(a);
    }
}

Object.defineProperty(MegaPromise, Symbol.species, {
    get() {
        'use strict';
        return Promise;
    }
});


function startMega() {
    'use strict';

    jsl = [];
    mBroadcaster.sendMessage('startMega');
    mBroadcaster.sendMessage('startMega:desktop');

    if (self.silent_loading) {
        queueMicrotask(silent_loading);
        silent_loading = false;
    }
    else {
        init_page();
    }
}

function init_page() {
    'use strict';
    if (!is_transferit) {
        throw new Error('Unexpected access...');
    }

    T.ui.loadPage(page)
        .catch((ex) => {
            const ec = Number(ex);
            if (ec < 0) {
                return T.ui.errorSubpage.init(ec, ex);
            }
            tell(ex);
        });
}

function process_f(f) {
    'use strict';
    const ufsc = new UFSSizeCache();

    for (let i = 0; i < f.length; ++i) {
        const n = f[i];

        if (n.p) {
            if (!M.c[n.p]) {
                M.c[n.p] = Object.create(null);
            }
            M.c[n.p][n.h] = n.t + 1;
        }
        else {
            n.t = 9;
            M.RootID = n.h;
            M.xh[n.h] = n.xh;
            M.xh[n.xh] = n.h;
        }
        M.d[n.h] = n instanceof MegaNode ? n : Object.setPrototypeOf(n, MegaNode.prototype);

        ufsc.feednode(n);
    }

    return ufsc.save();
}

mBroadcaster.once('boot_done', () => {
    'use strict';

    const dummy = async() => false;
    const val = Object.create(null);
    const obj = freeze({
        v: [],
        l: Object.create(null),
        c: Object.create(null),
        d: Object.create(null),
        u: Object.create(null),
        xh: Object.create(null),
        dcd: false,
        tree: Object.create(null)
    });
    const wrap = freeze({
        ul_maxSlots: 16,

        async gfsfetch(h, offset = 0, length = -1) {
            const n = this.getNodeByHandle(h);

            offset = parseInt(offset);
            length = parseInt(length);

            if (length < 0 || length > n.s) {

                length = n.s;
            }
            if (offset > n.s || length < offset) {

                throw self.ERANGE;
            }
            const url = (await T.core.getDownloadLink(n, false)).replace(/\/[^/]*$/, '');

            const res = await fetch(url, {
                headers: {
                    Range: `bytes=${offset}-${length - 1}`
                }
            });
            if (!res.ok) {
                if (res.status === 404) {
                    throw self.ENOENT;
                }
                res.target = res;
                throw res;
            }
            const buf = new Uint8Array(await res.arrayBuffer());
            if (buf.byteLength > 0) {
                buf.payload = n;
                return buf;
            }
            throw self.EINCOMPLETE;
        },
        ulstart(ul) {
            ul.starttime = Date.now();
            console.info('Starting upload...', [ul]);
            $.transferprogress = Object($.transferprogress);
        },
        ulprogress(...a) {
            if (T.ui.ulprogress) {
                T.ui.ulprogress(...a);
            }
        },
        ulerror(ul, e) {
            ul.promiseToInvoke.reject(e);
        },
        ulcomplete(ul, h) {
            this.ulfinalize(ul, 0, h);
        },
        ulfinalize(ul, s, h) {
            const id = ulmanager.getGID(ul);
            const tp = $.transferprogress;
            const up = tp && tp[id];
            if (up) {
                tp.ulc = (tp.ulc || 0) + up[1];
                if (!tp.ust && !up[2]) {
                    tp.ust = ul.starttime;
                }
                delete tp[id];
            }
            ul.promiseToInvoke.resolve(h);
            ul_queue[ul.pos] = freeze({});

            M.resetUploadDownload();
        },
        require(...files) {
            const promise = mutex.lock(`<jsl_start(require)>`)
                .then((unlock) => {
                    const {promise, resolve} = Promise.withResolvers();
                    for (let i = files.length; i--;) {
                        const f = files[i];
                        if (!jsl_loaded[f]) {
                            if (jsl3[f]) {
                                jsl.push(...Object.values(jsl3[f]));
                            }
                            else if (jsl2[f]) {
                                jsl.push(jsl2[f]);
                            }
                        }
                    }
                    if (jsl.length) {
                        silent_loading = resolve;
                        jsl_start();
                    }
                    else {
                        resolve(self.EEXIST);
                    }
                    return promise.finally(unlock);
                });
            promise.done = promise.then;
            promise.fail = promise.catch;
            promise.tryCatch = promise.then;
            return promise;
        },
        getNodeShare: dummy,
        getS4NodeType: dummy,
        importWelcomePDF: dummy,
        getNodeShareUsers: dummy,
        getShareNodesSync: dummy,
        shouldCreateThumbnail: () => true,
        hasPendingTransfers: () => !!ulmanager.isUploading,
        resetUploadDownload() {
            if (!ul_queue.some(isQueueActive)) {
                ul_queue = new UploadQueue();
                ulmanager.isUploading = false;
                ulQueue._pending = [];
                ulQueue.setSize(fmconfig.ul_maxSlots);

                clearTransferXHRs();
                delete $.transferprogress;
            }
        },
        getNodeRoot(h) {
            while (M.d[h]) {
                if (!M.d[h].p) {
                    return h;
                }
                h = M.d[h].p;
            }
            return false;
        },
        getPath(h) {
            const path = [];

            while (M.d[h]) {
                path.push(h);
                if (!M.d[h].p) {
                    return path;
                }
                h = M.d[h].p;
            }
            return path;
        },
        filterByParent(p) {
            const {v} = this;

            while (M.c[p]) {
                const l = Object.keys(M.c[p]);
                if (l.length === 1) {
                    const n = this.getNodeByHandle(l[0]);
                    if (n.t) {
                        if (self.d) {
                            console.info(`Only one folder in ${p}, showing the contents for ${n.h}`);
                        }
                        p = n.h;
                        continue;
                    }
                }
                break;
            }

            v.length = 0;
            for (const h in M.c[p]) {
                const n = this.getNodeByHandle(h);
                if (n) {
                    v.push(n);
                }
            }
        },
        async openFolder(h) {
            const n = this.getNodeByHandle(h);
            if (n && !n.t) {
                dump(`attempting to open file-node ${h}, forwarding to ${n.p}`);
                h = n.p;
                $.autoSelectNode = n.h; // @todo
            }
            this.previousdirid = this.currentdirid || '';
            this.currentdirid = String(h || '');
            this.currentrootid = this.getNodeRoot(h);
            this.filterByParent(h);

            if (self.xhid) {
                let path = `t/${self.xhid}`;
                if (this.currentdirid !== this.currentrootid) {
                    path += `/${this.currentdirid}`;
                }
                if (getSitePath() !== `/${path}`) {
                    pushHistoryState(path);
                }
            }
        },
        getNodeRights: () => false,
        isInvalidUserStatus: () => false,
        getNodeByHandle: (h) => M.d[M.xh[h]] || M.d[h] || false,
        getNameByHandle(h) {
            if (h && h.length === 11) {
                const {name, fullname, email} = this.getUserByHandle(h);
                return fullname || name || email || '';
            }
            return this.getNodeByHandle(h).name || '';
        },
        getUserByHandle(h) {
            return (self.u_handle === h ? self.u_attr : this.u[h]) || false;
        },
        getUser(x) {
            return this.getUserByHandle(x);
        },
        transferFromMegaCoNz: tryCatch((data) => {
            if (!self.u_k) {
                const [k, s] = JSON.parse(atob(data.replace(/^.*!/, '')));

                u_logout();
                localStorage.sid = s;
                localStorage.k = JSON.stringify(str_to_a32(k));

                loadingDialog.show();
                location.reload();
            }
        })
    });

    self.fmconfig = self.M = new Proxy({}, {
        set(target, prop, value) {
            switch (typeof value) {
                case 'string':
                case 'number':
                    val[prop] = value;
                    return true;
            }
            return prop === 'tfsdomqueue';
        },
        get(target, prop) {
            const res = wrap[prop] || val[prop] || obj[prop];

            if (self.d > 1 || res === undefined || res === dummy) {
                console.warn(`[proxy] accessing ${prop}...`);
            }
            return res || false;
        }
    });
    self.percent_megatitle = dummy;
    self.loadingDialog = {show: () => T.ui.loader.show(), hide: () => T.ui.loader.hide()};
    self.ASSERT = (e, m) => e || dump(m);
    self.requesti = Math.random() * Number.MAX_SAFE_INTEGER;

    self.MEGAException = DOMException;
    self.MEGAException.assert = window.assert = (e, ...a) => {
        if (!e) {
            throw new MEGAException(...a);
        }
    };

    self.topmenuUI = dummy; // @todo anything to do?

    self.api_reportfailure =
    self.onUploadError = (file, ex) => {
        console.error([file], ex);
    };
    self.secondsToTime = (v) => new Date(v * 1000).toISOString().substr(11, 8);
    self.secondsToTimeShort = (v) => secondsToTime(v).replace(/^00:/, '');

    self.bytesToSize = (v) => {
        const u = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
        const c = Math.floor(Math.log(parseInt(v) || 0) / Math.log(1024));
        return c < 0 ? `0 ${u[0]}` : `${(v / Math.pow(1024, Math.floor(c))).toFixed(!!c && 2)} ${u[c]}`;
    };
    self.bytesToSpeed = (...a) => String(l[23062]).replace('[%s]', bytesToSize(...a));

    if (self.lang === 'en' || self.lang === 'es') {
        self.bytesToSpeed = (...a) => `${bytesToSize(...a)}/s`;
    }

    // @todo
    self.time2date = (unixTime, format) => {
        const date = new Date(unixTime * 1e3 || 0);
        if (format === 3) {
            const months = [
                l[408], l[409], l[410], l[411], l[412], l[413],
                l[414], l[415], l[416], l[417], l[418], l[419]
            ];
            return `${months[date.getMonth()]} ${date.getFullYear()}`;
        }
        return date.toDateString();
    };

    asmCrypto.random.seed(mega.getRandomValues(384));
});

function MegaLogger(name, options) {
    'use strict';
    this.name = name;
    this.options = {...options};
    return Object.setPrototypeOf(this, console);
}

MegaLogger.getLogger = function(n, o) {
    'use strict';
    return new MegaLogger(n, o);
};

self.getAppBaseUrl = self.getBaseUrl = () => {
    'use strict';
    return `https://${location.host}`;
};

function showToast(classname, content, timeout) {
    'use strict';

    T.ui.toast.show(classname, content, timeout);
}

function msgDialog(type, title, msg, submsg) {
    'use strict';

    if (d) {
        console.debug('msgDialog', type, title, msg, submsg);
    }
    return T.ui.msgDialog.show({msg, submsg, title, type});
}

function pagemetadata() {
    'use strict';
    // @todo ?
}

function translate(html) {
    'use strict';

    return String(html).replace(/\[\$(\w+)(?:\.(\w+))?]/g, (match, localeNum, ns) => {

        if (ns) {
            match = `${localeNum}.${ns}`;
            localeNum = match;
        }

        return `${l[localeNum] || ''}`;
    });
}

function isValidEmail(email) {
    'use strict';
    const input = document.createElement('input');
    input.type = 'email';
    input.value = email;
    return input.value.trim() && input.checkValidity();
}

function loadSubPage(page, ev) {
    'use strict';
    return T.ui.loadPage(page, ev);
}

window.addEventListener('popstate', (ev) => {
    'use strict';
    const state = ev.state || false;
    T.ui.loadPage(state.subpage || getCleanSitePath(), ev);
}, {
    capture: true,
    passive: true,
});

window.addEventListener('beforeunload', () => {
    'use strict';

    if ('rad' in mega) {
        mega.rad.flush().dump('rad.flush');
    }

    mBroadcaster.crossTab.leave();

}, {capture: true});
