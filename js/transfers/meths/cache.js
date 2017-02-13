/* ***************** BEGIN MEGA LIMITED CODE REVIEW LICENCE *****************
 *
 * Copyright (c) 2016 by Mega Limited, Auckland, New Zealand
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
 * CacheIO, intended to minimize real disk I/O when
 *          creating ZIPs with several small files.
 */
function CacheIO(dl_id, dl) {
    var IO, u8buf, logger,
        offsetI = 0,
        offsetO = 0,
        __max_chunk_size = 32 * 0x100000;

    if (d) {
        console.log('Creating new CacheIO instance', dl_id, dl);
    }

    function PUSH(done, buffer) {
        var neuter = false;
        if (!buffer) {
            buffer = u8buf.subarray(0, offsetI);
            neuter = ((typeof FirefoxIO !== 'undefined') && dlMethod === FirefoxIO);
        }
        var abLen = buffer.byteLength;
        IO.write(buffer, offsetO, done);
        if (neuter) {
            u8buf = new Uint8Array(__max_chunk_size);
        }
        offsetO += abLen;
    }

    function FILL(buffer) {
        u8buf.set(buffer, offsetI);
        offsetI += buffer.byteLength;
    }

    this.write = function(buffer, offset, done) {
        if (d) {
            logger.info('CacheIOing...', buffer.byteLength, offset, offsetI, offsetO);
        }

        if (offsetI + buffer.byteLength > __max_chunk_size) {
            function next() {
                if (next.write) {
                    next.write();
                    next.write = 0;
                }
                else {
                    if (buffer) {
                        FILL(buffer);
                    }
                    next.done();
                }
            }
            next.done = done;

            if (offsetI) {
                PUSH(next);
            }

            if (buffer.byteLength > __max_chunk_size) {
                next.write = function() {
                    PUSH(next, buffer);
                    buffer = undefined;
                };

                if (!offsetI) {
                    Soon(next);
                }
            }
            offsetI = 0;
        }
        else {
            FILL(buffer);
            Soon(done);
        }
    };

    this.download = function(name, path) {
        function finish() {
            IO.download.apply(IO, args);
            u8buf = undefined;
        }
        var args = arguments;

        if (offsetI) {
            PUSH(finish);
        }
        else {
            finish();
        }
    };

    this.setCredentials = function(url, size) {
        if (d) {
            logger = new MegaLogger('CacheIO', {}, dl.writer.logger);
            logger.info('CacheIO Begin', dl_id, arguments);
        }

        if (this.is_zip || !dl.zipid) {
            __max_chunk_size = Math.min(size + 4194304, __max_chunk_size);
            try {
                u8buf = new Uint8Array(__max_chunk_size);
            }
            catch (ex) {
                return dlFatalError(dl, ex);
            }

            IO = new dlMethod(dl_id, dl);
            IO.begin = this.begin;
            IO.is_zip = this.is_zip;
            IO.setCredentials.apply(IO, arguments);
        }
        else {
            this.begin();
        }
    };

    this.abort = function() {
        u8buf = undefined;
        if (IO && IO.abort) {
            IO.abort.apply(IO, arguments);
        }
    };
}
