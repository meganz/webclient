/* ***************** BEGIN MEGA LIMITED CODE REVIEW LICENCE *****************
 *
 * Copyright (c) 2025 by Mega Limited, Auckland, New Zealand
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

/**
 * FileReader wrapper maintaining a pipeline of encrypted chunks.
 * @param {File} file The file instance
 * @constructor
 */
class FileUploadReader {
    constructor(file) {
        this.file = file;
        this.readpos = 0;
        this.cache = new Map();
        this.debug = self.d > -1;
        this.verbose = this.debug && !self.is_livesite;
        this.name = `FUR(${file.name.slice(this.verbose ? -56 : -4)}.${file.size})`;
        this.logger = new MegaLogger(this.name, false, self.ulmanager && ulmanager.logger);
    }

    // return chunk from cache
    getChunk(pos) {
        return this.cache.get(pos);
    }

    // delete chunk from cache
    deleteChunk(pos) {
        return this.cache.delete(pos);
    }

    // read chunks into the cache
    // returns the maximum total number of chunks held _after_ the readahead completes
    readahead(cachelimit) {
        const {cache, file = false, readpos, debug, logger} = this;

        // don't read from aborted files, don't read past EOF, don't exceed cachelimit
        if (!file.wsfu || readpos >= file.size || cache.size >= cachelimit) {
            return cache.size;
        }

        if (debug) {
            logger.log(`readahead(): ${cache.size} chunks in the cache, limit: ${cachelimit}`);
        }

        // after the first eight individual chunks, we read in 8 MB increments
        const len = Math.min(file.size - readpos, FileUploadReader.chunkmap[readpos] || 8 * 0x100000);

        this.readpos += len;

        this._read(readpos, len)
            .then((chunk) => {
                if (!file.wsfu) {
                    // aborted
                    return;
                }
                assert('byteLength' in chunk);

                if (len > 0x100000) {
                    // split
                    let chunksize = len & 0xfffff || 0x100000;

                    for (let i = len; (i -= chunksize) >= 0; chunksize = 0x100000) {
                        cache.set(readpos + i, new Uint8Array(chunk.buffer, i, chunksize));
                        file.ul_macs[readpos + i] = file.ul_macs[readpos].slice(i >> 18, (i >> 18) + 4);
                    }
                }
                else {
                    cache.set(readpos, chunk);
                }

                return this.readahead(cachelimit);
            })
            .catch((ex) => {
                logger.error(`Read at ${readpos} failed`, ex, file.wsfu);
                if (file.wsfu) {
                    this.error = ex;
                }
            });

        // anticipate the arrival of the pending read
        return cache.size + (len > 0x100000 ? 8 : 1);
    }

    advanceHead() {
        let eof = false;
        const pos = this.headpos || 0;

        if (pos < this.file.size) {
            // advance headpos by one chunk
            this.headpos = pos + (FileUploadReader.chunkmap[pos] || 1048576);
        }

        if (this.headpos > this.file.size || !this.file.size) {
            this.headpos = this.file.size;
            eof = true;	// eof is set by a short final chunk, so we don't need an extra empty chunk
        }

        let len = FileUploadReader.chunkmap[pos] || 1048576;

        if (pos + len > this.file.size) {
            len = this.file.size - pos;
        }

        if (!len) {
            // an extra (empty) chunk sets the file size if the file ends on a chunk boundary
            eof = true;
        }

        return {pos, len, eof};
    }

    // @private Get an encrypted chunk from disk
    async _read(offset, length) {
        const data = await this._getArrayBuffer(offset, length);

        return this._encrypt(offset, data);
    }

    // @private
    _encrypt(offset, data) {
        return new Promise((resolve) => {
            if (!this.file) {
                throw EBLOCKED;
            }
            const ctx = {
                start: offset,
                macs: this.file.ul_macs
            };
            Encrypter.push([ctx, this.file.ul_keyNonce, ctx.start / 16, data], () => resolve(ctx.bytes));
        });
    }

    // @private
    _getArrayBuffer(offset, length) {

        return this.file.slice(offset, offset + length).arrayBuffer();
    }

    destroy() {
        if (this.file) {
            this.file = null;
            this.cache.clear();
            oDestroy(this);
        }
    }
}

/** @property FileUploadReader.chunkmap */
lazy(FileUploadReader, 'chunkmap', () => {
    'use strict';
    // pre-compute sizes of the first file chunks
    const res = Object.create(null);

    for (let p = 0, dp = 0; dp < 1048576; p += dp) {
        dp += 131072;
        res[p] = dp;
    }
    return res;
});
