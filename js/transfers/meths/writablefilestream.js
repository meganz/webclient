/* ***************** BEGIN MEGA LIMITED CODE REVIEW LICENCE *****************
 *
 * Copyright (c) 2024 by Mega Limited, Auckland, New Zealand
 * All rights reserved.
 *
 * This licence grants you the rights, and only the rights, set out below,
 * to access and review Mega's code. If you take advantage of these rights,
 * you accept this licence. If you do not accept the licence,
 * do not access the code.
 *
 * Words used in the Mega Limited Terms of Service [https://mega.nz/terms]
 * have the same meaning in this licence. Where there is any inconsistency
 * between this licence and those Terms of Service, these terms prevail.
 *
 * 1. This licence does not grant you any rights to use Mega's name, logo,
 *    or trademarks and you must not in any way indicate you are authorised
 *    to speak on behalf of Mega.
 *
 * 2. If you issue proceedings in any jurisdiction against Mega because you
 *    consider Mega has infringed copyright or any patent right in respect
 *    of the code (including any joinder or counterclaim), your licence to
 *    the code is automatically terminated.
 *
 * 3. THE CODE IS MADE AVAILABLE "AS-IS" AND WITHOUT ANY EXPRESS OF IMPLIED
 *    GUARANTEES AS TO FITNESS, MERCHANTABILITY, NON-INFRINGEMENT OR OTHERWISE.
 *    IT IS NOT BEING PROVIDED IN TRADE BUT ON A VOLUNTARY BASIS ON OUR PART
 *    AND YOURS AND IS NOT MADE AVAILABE FOR CONSUMER USE OR ANY OTHER USE
 *    OUTSIDE THE TERMS OF THIS LICENCE. ANYONE ACCESSING THE CODE SHOULD HAVE
 *    THE REQUISITE EXPERTISE TO SECURE THEIR OWN SYSTEM AND DEVICES AND TO
 *    ACCESS AND USE THE CODE FOR REVIEW PURPOSES. YOU BEAR THE RISK OF
 *    ACCESSING AND USING IT. IN PARTICULAR, MEGA BEARS NO LIABILITY FOR ANY
 *    INTERFERENCE WITH OR ADVERSE EFFECT ON YOUR SYSTEM OR DEVICES AS A
 *    RESULT OF YOUR ACCESSING AND USING THE CODE.
 *
 * Read the full and most up-to-date version at:
 *    https://github.com/meganz/webclient/blob/master/LICENCE.md
 *
 * ***************** END MEGA LIMITED CODE REVIEW LICENCE ***************** */

class WritableFileStreamIO {
    constructor(id, dl) {
        Object.defineProperty(this, 'log', {
            value(m, ...args) {
                dlmanager.logger.warn(`WritableFileStreamIO(${id}) ${m}`, ...args);
            }
        });
        Object.defineProperty(this, 'dl', {value: dl});
        Object.defineProperty(this, 'size', {value: dl.size || dl.s});
        Object.defineProperty(this, 'thresh', {value: Math.min(5e8, this.size / 4)});

        if (self.d > 1) {
            WritableFileStreamIO.instances.set(this, dl);
        }
        this.abort();
    }

    write(data, position, done) {
        if (self.d > 1) {
            this.log(`write ${data.byteLength} @${position}`);
        }

        this._write(data, position)
            .then(done)
            .catch((ex) => {
                if ((ex = WritableFileStreamIO.eperm(ex) || ex).code === DOMException.QUOTA_EXCEEDED_ERR) {
                    this.log(`quota error at ${data.byteLength} @${position}`, this.failure);

                    if (!(this.failure++ % 15)) {
                        const {n, name} = this.dl;
                        const submsg = str_mtrunc(n || name);

                        msgDialog(`warningb:!^${l.ok_button}!${l[103]}`, l[135], l[20817], submsg, (cancel) => {
                            if (cancel) {
                                dlFatalError(this.dl, ex, false);
                            }
                        });
                    }

                    tSleep(5 + Math.random())
                        .then(() => this.stream && this.write(data, position, done))
                        .catch(dump);
                    return;
                }
                dlFatalError(this.dl, ex);
            });
    }

    download(...args) {
        Object.defineProperty(this, 'complete', {value: true});

        this.abort();
        this.log('download complete.', args);
    }

    abort() {
        const {stream, handle, complete, log} = this;

        this.bytes = 0;
        this.offset = 0;
        this.written = 0;
        this.failure = 0;
        this.stream = false;
        this.throughput = false;

        if (stream) {
            (async() => {
                if (complete) {
                    return stream.close();
                }
                log('Removing file from disk...', handle, stream);

                await stream.abort();
                await handle.remove();

            })().catch(dump);
        }
    }

    setCredentials(...args) {
        this.log('begin', ...args);

        this._createWritableStream(args[2], args[1])
            .then((resumeOffset) => {
                if (resumeOffset && this.dl.byteOffset) {
                    this.dl.byteOffset = resumeOffset;
                }
                return this.begin(null, resumeOffset);
            })
            .catch((ex) => {
                if (ex.code === DOMException.NO_MODIFICATION_ALLOWED_ERR) {
                    this.log(ex);
                    return WritableFileStreamIO.showDirectoryPicker(true)
                        .then(() => this._createWritableStream(args[2], args[1]));
                }
                throw ex;
            })
            .catch((ex) => {
                let err;
                if ((err = WritableFileStreamIO.eperm(ex))) {
                    WritableFileStreamIO.removeDirectory(ex).catch(dump);
                    ex = err;
                }
                dlFatalError(this.dl, ex);
            });
    }

    async _createWritableStream(filename, filesize) {
        const {resumeInfo: {fsh} = false, byteOffset, fsa} = this.dl;
        let handle = fsh;
        let resumeOffset = 0;

        if (fsh && byteOffset) {
            const {size} = await fsh.getFile().catch(dump) || !1;

            if (size >= byteOffset) {
                // a sudden reload while flushing will leave our resumeInfo behind.
                resumeOffset = byteOffset;
            }
        }
        else if (fsa) {

            handle = fsa;
        }
        else {
            const fd = await WritableFileStreamIO.showDirectoryPicker();

            handle = await fd.getFileHandle(M.getSafeName(filename), {create: true});
        }

        if (filesize === (await handle.getFile().catch(dump) || !1).size) {

            throw l[1668];
        }

        Object.defineProperty(this, 'handle', {value: handle});
        Object.defineProperty(this, 'tss', {value: performance.now()});

        this.stream = await handle.createWritable({keepExistingData: resumeOffset > 0});

        if (resumeOffset) {
            await this.stream.seek(resumeOffset);
        }
        else if (byteOffset && self.d) {
            this.log('Cannot resume at %s, starting over...', byteOffset);
        }

        return resumeOffset;
    }

    async _write(data, position) {
        await this.stream.write({type: 'write', position, data});

        this.bytes += data.byteLength;
        this.offset = position + data.byteLength;

        this.throughput = this.bytes / ((performance.now() - this.tss) / 1e3);

        if (this.offset / this.size < 0.78
            && this.offset - this.written > Math.max(this.thresh, this.throughput << 3)) {

            if (self.d) {
                const p = this.offset / this.size * 100 | 0;
                this.log('Flushing data to disk at %s (%s%%), %s', this.offset, p, bytesToSpeed(this.throughput));
            }

            await this.stream.close();
            this.stream = await this.handle.createWritable({keepExistingData: true});

            this.written = this.offset;
        }
    }

    /**
     * The showPicker() method shows a file or folder picker that allows a user to save to disk.
     * @param {Object|*} [n] an ufs-node or alike object, if a file-picker is wanted
     * @returns {Promise<FileSystemDirectoryHandle|FileSystemFileHandle|Boolean>} result
     */
    static async showPicker(n) {

        if (!WritableFileStreamIO.usable) {

            return false;
        }

        if (n && await this.haveGrantedPermission().catch(dump)) {

            n = false;
        }

        if (!n || n === true || n.t) {

            return this.showDirectoryPicker(n === true);
        }

        const opt = {
            startIn: mega.dld || 'downloads',
            suggestedName: M.getSafeName(n.name)
        };

        return window.showSaveFilePicker(opt)
            .then((value) => {
                Object.defineProperty(n, 'fsa', {value, configurable: true});
                return value;
            });
    }

    /**
     * The showDirectoryPicker() method displays a directory picker which allows the user to select a directory.
     * @param {*} [force] re-ask even if already set
     * @returns {Promise<FileSystemDirectoryHandle>}
     */
    static async showDirectoryPicker(force) {
        const opt = {mode: 'readwrite'};

        if (!force && mega.dld) {
            force = await mega.dld.queryPermission(opt).catch(dump) !== 'granted'
                && await mega.dld.requestPermission(opt).catch(dump) !== 'granted';

            force = force || !await tryCatch(() => mega.dld.keys().next().catch(dump))();
        }

        if (force || !mega.dld) {
            const value = await window.showDirectoryPicker({
                id: 'downloads',
                mode: 'readwrite',
                startIn: mega.dld || 'downloads'
            });
            M.setPersistentData('downloads-folder', value).catch(dump);
            Object.defineProperty(mega, 'dld', {configurable: true, value});
        }

        return mega.dld;
    }

    static async removeDirectory(reason) {
        if (reason) {
            dlmanager.logger.warn('FSA(remove-directory)', reason);
        }
        Object.defineProperty(mega, 'dld', {configurable: true, value: null});
        return M.delPersistentData('downloads-folder');
    }

    static eperm(ex) {
        const readOnly =
            ex.code === DOMException.NO_MODIFICATION_ALLOWED_ERR && l.share_ro_tip_copy;

        if (readOnly
            || ex.code === DOMException.ABORT_ERR
            || ex.code === DOMException.SECURITY_ERR
            || ex.code === DOMException.NO_DATA_ALLOWED_ERR) {

            return readOnly || l.mig_oauth_denied || ex.message;
        }
    }

    static async haveGrantedPermission(handle) {

        if (!(handle = handle || mega.dld)) {

            return false;
        }

        if (await handle.queryPermission({mode: 'readwrite'}).catch(dump) !== 'granted') {

            return false;
        }

        if (handle.kind !== 'file') {

            return tryCatch(() => handle.keys().next().catch(dump))();
        }

        return handle;
    }

    get hasResumeSupport() {
        return true;
    }

    get [Symbol.toStringTag]() {
        return 'WritableFileStreamIO';
    }
}

/** @property WritableFileStreamIO.instances */
lazy(WritableFileStreamIO, 'instances', () => {
    'use strict';
    return new WeakMap();
});

/**
 * Check for File System Access API Support.
 * @returns {Boolean} usable.
 * @property WritableFileStreamIO.usable
 */
lazy(WritableFileStreamIO, 'usable', () => {
    'use strict';
    const proto = (cl) => Object(cl && cl.prototype);

    return !is_karma && window.isSecureContext
        && typeof showSaveFilePicker === 'function'
        && typeof showDirectoryPicker === 'function'
        && typeof FileSystemFileHandle !== 'undefined'
        && typeof FileSystemWritableFileStream !== 'undefined'
        && 'createWritable' in proto(FileSystemFileHandle)
        && 'seek' in proto(FileSystemWritableFileStream);
});

mBroadcaster.once('startMega', () => {
    'use strict';

    M.getPersistentData('downloads-folder')
        .then((value) => {
            return Promise.all([value, value.queryPermission({mode: 'readwrite'})]);
        })
        .then(([value, perm]) => {
            if (perm !== 'granted') {
                dlmanager.logger.warn(`FSA is not granted, ${perm}.`);
            }
            Object.defineProperty(mega, 'dld', {configurable: true, value});

            if (value && WritableFileStreamIO.usable) {

                dlMethod = WritableFileStreamIO;
            }
        })
        .catch((ex) => {
            if (ex !== ENOENT) {
                dlmanager.logger.warn(ex);
                M.delPersistentData('downloads-folder').catch(dump);
            }
        });
});
