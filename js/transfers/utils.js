/**
 * Set transfer status
 * @param {Object} dl The download object
 * @param {String} status The status text
 * @param {Boolean} [ethrow] Throw the exception noted in `status`
 * @param {Number} [lock] Lock the DOM node in the transfers panel.
 * @param {Boolean} [fatalError] Whther invoked from dlFatalEror()
 */
function setTransferStatus(dl, status, ethrow, lock, fatalError) {
    var id = dl && dlmanager.getGID(dl);
    var text = '' + status;

    if (ethrow) {
        fatalError = true;
    }

    if (page === 'download') {
        if ('dlPage' in mega.ui) {
            mega.ui.dlPage.showErrorUI({msg: text, fatalError});
        }
    }
    else {
        if (fatalError) {
            dlmanager.onDownloadFatalError = status;

            if (is_mobile && lock !== 2 && dl) {
                mobile.downloadOverlay.close();
                mobile.downloadOverlay.handleFatalError(dl, status);
            }
        }
    }

    if (lock) {
        if (lock === 2) {
            mega.tpw.removeRow(id);
        }
    }

    if (ethrow) {
        if (d) {
            console.error(status);
        }
        throw status;
    }
}

/**
 * Notify a download fatal error.
 * @param {Object} dl The download object
 * @param {Object|String} error The error object
 * @param {Boolean} [ethrow] Throw the exception noted in `status`
 * @param {Number} [lock] Lock the DOM node in the transfers panel.
 */
function dlFatalError(dl, error, ethrow, lock) {
    'use strict';

    var awaitingPromise = dl && dl.awaitingPromise;

    // Log the fatal error
    Soon(function() {
        if (awaitingPromise) {
            awaitingPromise.reject(error);
        }
        error = String(Object(error).message || error).replace(/\s+/g, ' ').trim();

        if (error.indexOf(l[16871]) < 0 && error.indexOf(l[16872]) < 0 && error.indexOf(l[1668]) < 0) {
            if (error.indexOf(String(l[5945]).split('[')[0]) > -1) {
                error = '5945, ' + (error.match(/\[(.*)]/) || '  ')[1];
            }
            // srvlog('dlFatalError: ' + error.substr(0, 60) + (window.Incognito ? ' (Incognito)' : ''));
            // ^ Let's stop logging Incognito issues, they are too common and we do have fallback logic anyway
            // Also stop obsolete browsers (e.g. attempting to use FlashIO, sigh) from logging errors
            if (!window.Incognito && mega.es2019 && !/^[\d\s,.]+$/.test(error)) {
                // srvlog('dlFatalError: ' + error.substr(0, 72));
                // @todo fix the Incognito flag.
                if (d) {
                    dlmanager.logger.warn(`dlFatalError: ${error}`, dl);
                }
            }
        }
    });

    // Set transfer status and abort it
    setTransferStatus(dl, error, ethrow, lock !== undefined ? lock : true, String(error).indexOf(l[1668]) < 0);
    dlmanager.abort(dl, error === l.dl_decryption_failed);
}

// Quick hack for sane average speed readings
function Speedometer(initialp) {
    if (!(this instanceof Speedometer)) {
        return new Speedometer(initialp);
    }
    this.interval = 200;
    this.num = 300;
    this.prevp = initialp;
    this.h = Object.create(null);
}
Speedometer.prototype.progress = function(p) {
    var now, min, oldest;
    var total;
    var t;

    now = Date.now();
    now -= now % this.interval;

    this.h[now] = (this.h[now] || 0) + p - this.prevp;
    this.prevp = p;

    min = now - this.interval * this.num;

    oldest = now;
    total = 0;

    for (t in this.h) {
        if (t < min) {
            delete this.h[t];
        }
        else {
            if (t < oldest) {
                oldest = t;
            }
            total += this.h[t];
        }
    }

    if (now - oldest < 1000) {
        return 0;
    }

    p = 1000 * total / (now - oldest);

    // protect against negative returns due to repeated chunks etc.
    return p > 0 ? p : 0;
};

// compute final MAC from block MACs
function condenseMacs(macs, key) {
    'use strict';

    var i, j, mblk;
    var mac = [0, 0, 0, 0];
    var aes = Array.isArray(key) ? new sjcl.cipher.aes([key[0], key[1], key[2], key[3]]) : key;

    for (i = 0; i < macs.length; i++) {
        mblk = macs[i];

        for (j = 0; j < mblk.length; j += 4) {
            mac[0] ^= mblk[j];
            mac[1] ^= mblk[j + 1];
            mac[2] ^= mblk[j + 2];
            mac[3] ^= mblk[j + 3];

            mac = aes.encrypt(mac);
        }
    }

    return mac;
}

function chksum(buf) {
    var l, c, d;

    // eslint-disable-next-line no-constant-condition
    if (1) {
        var ll;

        c = new Uint32Array(3);

        ll = buf.byteLength;

        l = Math.floor(ll / 12);

        ll -= l * 12;

        if (l) {
            l *= 3;
            d = new Uint32Array(buf, 0, l);

            while (l) {
                l -= 3;

                c[0] ^= d[l];
                c[1] ^= d[l + 1];
                c[2] ^= d[l + 2];
            }
        }

        c = new Uint8Array(c.buffer);

        if (ll) {
            d = new Uint8Array(buf, buf.byteLength - ll, ll);

            while (ll--) c[ll] ^= d[ll];
        }
    }

    for (d = '', l = 0; l < 12; l++) {
        d += String.fromCharCode(c[l]);
    }

    return d;
}

(function __FileFingerprint(scope) {
    'use strict';

    /**
     * Generate file fingerprint.
     * @param {File} file The file entry.
     * @returns {Promise}
     * @global
     */
    scope.getFingerprint = async(file) => {
        let res;
        if (file instanceof Blob && file.name) {
            if (file.hash && file.ts) {
                return {hash: file.hash, ts: file.ts};
            }
            for (let i = 5; i--;) {
                // @todo tSleep.race() ?
                res = await mega.wsuploadmgr.fingerprint(file).catch(echo);
                if (res.hash) {
                    return res;
                }

                if (self.d) {
                    ulmanager.logger.warn(`fingerprint creation failed, retrying...`, res, file);
                }
                await tSleep(2 + Math.random());
            }
        }

        throw res || 0x8052000e;
    };
})(self);

function bindTransfersMassEvents(context) {
    'use strict';
    const pauseIconClass = 'icon-pause-thin-outline';
    const playIconClass = 'icon-play-thin-outline';
    $('.transfer-pause-icon', context).rebind('click.transfers', function() {
        const $this = $(this);
        if ($this.hasClass('active')) {
            if (dlmanager.isOverQuota) {
                return dlmanager.showOverQuotaDialog();
            }
            if (ulmanager.ulOverStorageQuota) {
                ulmanager.ulShowOverStorageQuotaDialog();
                return false;
            }
        }

        if (!$this.hasClass('disabled')) {
            if ($this.hasClass('active')) {

                eventlog(501075);

                // terms of service
                if (u_type || folderlink || Object(u_attr).terms) {
                    Object.keys(dlQueue._qpaused).map(fm_tfsresume);
                    Object.keys(ulQueue._qpaused).map(fm_tfsresume);
                    uldl_hold = false;
                    ulQueue.resume();
                    dlQueue.resume();

                    $('span', $this.removeClass('active')).text(l[6993]);
                    $('i', $this).addClass(pauseIconClass).removeClass(playIconClass);
                }
                else {
                    msgDialog('error', 'terms', l[214]);
                    if (d) {
                        console.debug(l[214]);
                    }
                }
            }
            else {

                eventlog(501077);

                ul_queue.filter(isQueueActive).map((ul) => fm_tfspause(ulmanager.getGID(ul)));
                dl_queue.filter(isQueueActive).map((dl) => fm_tfspause(dlmanager.getGID(dl)));

                dlQueue.pause();
                ulQueue.pause();
                uldl_hold = true;

                $('span', $this.addClass('active')).text(l.transfers_resume_all);
                $('i', $this).removeClass(pauseIconClass).addClass(playIconClass);
            }
        }
    });

    $('.transfer-clear-all-icon', context).rebind('click.transfers', function() {

        const $this = $(this);

        if (!$this.hasClass('disabled')) {

            if ($this.hasClass('clear-rows')) {
                mega.tpw.clearCurrentView();
                return;
            }
            eventlog(501079);

            msgDialog('confirmation', 'clear all transfers', l.cancel_transfers_dlg_title, l[7225], (e) => {
                if (!e) {
                    return;
                }

                const time = (tag, cb) => {
                    if (d) {
                        console.time(tag);
                    }
                    cb();

                    if (d) {
                        console.timeEnd(tag);
                    }
                };

                uldl_hold = true;
                time('dlm:abort', () => dlmanager.abort(null));
                time('ulm:abort', () => ulmanager.abort(null));
                time('tfs:abort', () => {
                    const stats = tfsheadupdate();
                    if (typeof $.removeTransferItems === 'function') {
                        const keys = Object.keys(ulmanager.ulCompletingPhase);
                        if (d && keys.length) {
                            console.log('Not removing %d completing uploads', keys.length);
                        }
                        const ids = [
                            ...Object.keys(stats.dl),
                            Object.keys(stats.ul).filter(id => !keys.includes(id))
                        ];
                        $.removeTransferItems(ids);
                    }
                    else {
                        tfsheadupdate({
                            c: [...Object.keys(stats.dl), ...Object.keys(stats.ul)]
                        });
                        mega.tpw.clearRows(null);
                    }
                });

                later(() => {
                    if (uldl_hold) {
                        uldl_hold = false;
                        ulQueue.resume();
                        dlQueue.resume();
                        const $icon = $('.transfer-pause-icon', context).removeClass('active');
                        $('span', $icon).text(l[6993]);
                        $('i', $icon).removeClass(playIconClass).addClass(pauseIconClass);
                    }
                });
            });
        }
    });
}
