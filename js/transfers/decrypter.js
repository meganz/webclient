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

mBroadcaster.once('startMega', function _setupDecrypter() {
    'use strict';

    var decrypter = CreateWorkers('decrypter.js', function(context, e, done) {
        var dl = context[0];
        var offset = context[1];

        if (typeof (e.data) === "string") {
            if (e.data[0] === '[') {
                var pos = offset;
                var t = JSON.parse(e.data);
                for (var i = 0; i < t.length; i += 4) {
                    dl.macs[pos] = [t[i], t[i + 1], t[i + 2], t[i + 3]];
                    pos += 1048576;
                }
            }
            if (d > 1) {
                decrypter.logger.info("worker replied string", e.data, dl.macs);
            }
        }
        else {
            var plain = new Uint8Array(e.data.buffer || e.data);
            if (d) {
                decrypter.logger.info("Decrypt done", dl.cancelled);
            }
            dl.decrypter--;
            if (!dl.cancelled) {
                if (oIsFrozen(dl.writer)) {
                    if (d) {
                        decrypter.logger.warn('Writer is frozen.', dl);
                    }
                }
                else {
                    dl.writer.push({
                        data: plain,
                        offset: offset
                    });
                }
            }
            plain = null;
            done();
        }
    });

    dlmanager.logger.options.levelColors = {
        'ERROR': '#fe1111',
        'DEBUG': '#0000ff',
        'WARN':  '#C25700',
        'INFO':  '#189530',
        'LOG':   '#000044'
    };
    Object.defineProperty(window, 'Decrypter', { value: decrypter });
});
