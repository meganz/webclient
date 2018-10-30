/* ***************** BEGIN MEGA LIMITED CODE REVIEW LICENCE *****************
 *
 * Copyright (c) 2018 by Mega Limited, Auckland, New Zealand
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
function FileUploadReader(file) {
    'use strict';

    this.index = 0;
    this.cached = 0;
    this.reading = 0;
    this.inflight = 0;

    this.file = file;
    this.offsets = file.ul_offsets.reverse();

    this.queue = Object.create(null);
    this.cache = Object.create(null);

    this.fs = new FileReader();
}

FileUploadReader.prototype = Object.create(null);

Object.defineProperty(FileUploadReader.prototype, 'constructor', {
    value: FileUploadReader
});

/**
 * Get an encrypted chunk from disk
 * @param {Number} offset The byte offset
 * @param {Function} callback
 */
FileUploadReader.prototype.getChunk = function(offset, callback) {
    'use strict';

    this.queue[offset] = callback;
    this._drain(offset);
};

// @private
FileUploadReader.prototype._drain = function(offset) {
    'use strict';

    if (this.cache[offset]) {
        var callback = this.queue[offset];

        if (callback) {
            var data = this.cache[offset];

            onIdle(function() {
                callback(data);
            });
            delete this.cache[offset];
            delete this.queue[offset];
            this.cached--;
        }
    }
    this._read();
};

// @private
FileUploadReader.prototype._dispatch = function(chunk, data) {
    'use strict';

    if (this.cache) {
        var offset = chunk.byteOffset;

        this.inflight++;
        this.reading--;
        this._read();

        if (data) {
            this._encrypt(chunk, data).then(this._setCacheItem.bind(this, offset)).catch(console.error.bind(console));
        }
        else {
            this._setCacheItem(offset, EFAILED);
        }
    }
};

// @private
FileUploadReader.prototype._setCacheItem = function(offset, data) {
    'use strict';

    if (this.cache) {
        this.cached++;
        this.inflight--;
        this.cache[offset] = data;
        this._drain(offset);
    }
};

// @private
FileUploadReader.prototype._read = function() {
    'use strict';

    if (this.cached + this.inflight > 31 || this.reading) {
        return;
    }
    this.reading++;

    var self = this;
    var chunk = this.offsets[this.index++];

    if (!chunk) {
        this.finished = Date.now();
        return;
    }

    this._getArrayBuffer(chunk.byteOffset, chunk.byteLength)
        .then(function(data) {
            self._dispatch(chunk, data);
        })
        .catch(function(ex) {
            if (d) {
                console.warn('FileUploadReader(%s)', chunk.byteOffset, chunk, ex);
            }
            self.index--;

            // TODO: check how reliably is this weak error handling...
            setTimeout(function() {
                self._dispatch(chunk);
            }, 2000);
        });
};

// @private
FileUploadReader.prototype._encrypt = function(chunk, data) {
    'use strict';

    var ctx = {
        file: {ul_macs: {}},
        start: chunk.byteOffset
    };
    var nonce = this.file.ul_keyNonce;

    return new Promise(function(resolve) {
        var chunks = 1;
        var ack = function() {
            if (!--chunks) {
                resolve(ctx);
            }
        };

        if (chunk.byteOffset === 0 && data.byteLength === 0x480000) {
            // split to chunk boundaries
            var offset = 0;
            var blockSize = ulmanager.ulBlockSize;

            chunks = 8;
            for (var i = 1; i <= 8; i++) {
                Encrypter.push([ctx, nonce, offset / 16, data.slice(offset, offset + (i * blockSize))], ack);
                offset += i * blockSize;
            }

            ctx.bytes = data;
            ctx.appendMode = true;
        }
        else {
            Encrypter.push([ctx, nonce, chunk.byteOffset / 16, data], ack);
        }
    });
};

// @private
FileUploadReader.prototype._getArrayBuffer = function(offset, length) {
    'use strict';

    var fs = this.fs;
    var file = this.file;
    return new Promise(function(resolve, reject) {
        var blob;

        fs.onloadend = function(ev) {
            var error = true;
            var target = ev.target;

            if (target.readyState === FileReader.DONE) {
                if (target.result instanceof ArrayBuffer) {
                    try {
                        return resolve(new Uint8Array(target.result));
                    }
                    catch (e) {
                        error = e;
                    }
                }
            }

            reject(error);
        };
        fs.onerror = reject;

        if (file.slice) {
            blob = file.slice(offset, offset + length);
        }
        else if (file.mozSlice) {
            blob = file.mozSlice(offset, offset + length);
        }
        else {
            blob = file.webkitSlice(offset, offset + length);
        }

        fs.readAsArrayBuffer(blob);
        file = blob = fs = undefined;
    });
};

FileUploadReader.prototype.destroy = function() {
    'use strict';

    this.fs = null;
    this.file = null;
    this.queue = null;
    this.cache = null;
    this.offsets = null;
};
