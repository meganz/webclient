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

function FlashIO(dl_id, dl) {
    var IO = this,
        swfid, offset = 0,
        retries = 0

    if (dl.zip_dl_id) {
        dl_id = dl.zip_dl_id;
    }
    swfid = 'dlswf_' + (dl.zipid ? 'zip_' + dl.zipid : dl_id)

    this.write = function(buffer, position, done) {
        var node = document.getElementById(swfid);
        if (!node || typeof node.flashdata !== 'function') {
            return setTimeout(function() {
                if (!dl.cancelled) {
                    if (++retries < 100) {
                        IO.write(buffer, position, done);
                    }
                    else {
                        dlFatalError(dl, 'FlashIO error -- Do you have Adobe Flash installed?');
                    }
                }
            }, 300);
        }
        var j, k, len, subdata;

        if (have_ab) {
            len = buffer.length;
        }
        else {
            len = buffer.buffer.length;
        }

        if (d) {
            console.log('FlashIO', len, offset);
        }
        if (d) {
            console.time('flash-io');
        }

        if (have_ab) {
            subdata = ab_to_base64(buffer);
        }
        else {
            subdata = base64urlencode(buffer.buffer);
        }

        node.flashdata(dl_id, subdata);
        if (d) {
            console.timeEnd('flash-io');
        }

        offset += len;
        later(done);
    };

    this.download = function(name, path) {
        document.getElementById(swfid).flashdata(dl_id, '', name);
    };

    this.setCredentials = function(url, size, filename, chunks, sizes) {
        // dl_geturl = url;
        // dl_filesize = size;
        // dl_filename = filename;
        // dl_chunks   = chunks;
        // dl_chunksizes = sizes;
        var fail;
        if (size > 950 * 0x100000) {
            fail = Error('File too big to be reliably handled with Flash.');
        }
        else if (!flashIsEnabled()) {
            fail = Error('Adobe Flash is required to download under this browser.');
        }
        if (fail) {
            dlFatalError(dl, fail);
            if (!this.is_zip) {
                ASSERT(!this.begin, "This should have been destroyed 'while initializing'");
            }
        }
        else {
            IO.begin();
        }
    };
}
FlashIO.warn = true;
