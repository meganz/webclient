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

var dlMethod;

window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

if (localStorage.dlMethod) {
    dlMethod = window[localStorage.dlMethod];
}
else if (is_chrome_firefox & 4) {
    dlMethod = FirefoxIO;
}
else if (window.requestFileSystem) {
    dlMethod = FileSystemAPI;
}
else if (MemoryIO.usable()) {
    dlMethod = MemoryIO;
}
else {
    dlMethod = FlashIO;
}

if (typeof dlMethod.init === 'function') {
    dlMethod.init();
}

var dl_queue = new DownloadQueue();

if (is_mobile) {
    dlmanager.ioThrottleLimit = 2;
    dlmanager.fsExpiryThreshold = 10800;
    dlmanager.dlMaxChunkSize = 4 * 1048576;
}

mBroadcaster.once('startMega', function() {
    'use strict';

    M.onFileManagerReady(true, function() {
        var prefix = dlmanager.resumeInfoTag + u_handle;

        // automatically resume transfers on fm initialization
        M.getPersistentDataEntries(prefix)
            .then(function(entries) {
                entries = entries.map(function(entry) {
                    return entry.substr(prefix.length);
                });

                dbfetch.geta(entries)
                    .always(function() {
                        for (var i = entries.length; i--;) {
                            if (!M.d[entries[i]]) {
                                entries.splice(i, 1);
                            }
                        }

                        if (entries.length) {

                            // Cancel transfers callback.
                            var cancelTransfers = function() {
                                for (var i = entries.length; i--;) {
                                    M.delPersistentData(prefix + entries[i]);
                                }
                            };

                            // Continue transfers callback.
                            var continueTransfers = function() {
                                if (d) {
                                    dlmanager.logger.info('Resuming transfers...', entries);
                                }

                                if (is_mobile) {
                                    // We only resume a single download on mobile.
                                    mobile.downloadOverlay.resumeDownload(entries[0]);
                                } else {
                                    M.addDownload(entries);
                                }
                            };

                            if (is_mobile) {
                                mobile.resumeTransfersOverlay.show(continueTransfers, cancelTransfers);
                            } else {
                                var $dialog = $('.fm-dialog.resume-transfer');

                                $('.fm-dialog-close, .cancel', $dialog).rebind('click', function() {
                                    closeDialog();
                                    cancelTransfers();
                                });

                                $('.resume-transfers-button', $dialog).rebind('click', function() {
                                    closeDialog();
                                    continueTransfers();
                                });

                                M.safeShowDialog('resume-transfer', $dialog);
                            }
                        }
                    });
            }, console.debug.bind(console, 'persistent storage not granted'));
    });
});
