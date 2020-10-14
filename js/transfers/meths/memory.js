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

(function(scope) {
    var msie = typeof MSBlobBuilder === 'function';
    var hasDownloadAttr = "download" in document.createElementNS("http://www.w3.org/1999/xhtml", "a");

    function MemoryIO(dl_id, dl) {
        var dblob;
        var logger;
        var offset = 0;

        if (d) {
            console.log('Creating new MemoryIO instance', dl_id, dl);
        }

        this.write = function(buffer, position, done) {
            try {
                if (msie) {
                    dblob.append(have_ab ? buffer : buffer.buffer);
                }
                else {
                    dblob.push(new Blob([buffer]));
                }
            }
            catch (e) {
                dlFatalError(dl, e);
            }
            offset += (have_ab ? buffer : buffer.buffer).length;
            buffer = null;
            onIdle(done);
        };

        this.download = function(name, path) {
            var blob = this.getBlob(name);

            if (this.completed) {
                if (d) {
                    console.log('Transfer already completed...', dl);
                }
            }
            else if (is_chrome_firefox) {
                requestFileSystem(0, blob.size, function(fs) {
                    var opt = {
                        create: !0,
                        fxo: dl
                    };
                    fs.root.getFile(dl_id, opt, function(fe) {
                        fe.createWriter(function(fw) {
                            fw.onwriteend = fe.toURL.bind(fe);
                            fw.write(blob);
                        });
                    });
                });
            }
            else if (msie) {
                navigator.msSaveOrOpenBlob(blob, name);
            }
            else if (hasDownloadAttr) {
                var blob_url = myURL.createObjectURL(blob);
                setTimeout(function() {
                    myURL.revokeObjectURL(blob_url);
                    blob_url = undefined;
                }, 7e3);

                // prevent the beforeunload dispatcher from showing a dialog
                $.memIOSaveAttempt = dl_id;

                // prompt save dialog
                var dlLinkNode = document.getElementById('dllink');
                dlLinkNode.download = name;
                dlLinkNode.href = blob_url;

                // this click may triggers beforeunload...
                dlLinkNode.click();

                // restore beforeunload behavior...
                setTimeout(function() {
                    if ($.memIOSaveAttempt === dl_id) {
                        delete $.memIOSaveAttempt;
                    }
                }, 4e3);
            }
            else {
                this.openInBrowser(name);
            }

            this.completed = true;
            this.abort();
        };

        this.openInBrowser = function(name) {
            var blob = this.getBlob(name || dl.n);

            if (/CriOS/i.test(navigator.userAgent)) {
                var reader = new FileReader();
                reader.onload = function() {
                    window.open(reader.result, '_blank');
                };
                reader.onerror = function(ex) {
                    alert(ex.message || ex);
                };
                reader.readAsDataURL(blob);
            }
            else {
                // XXX: As of Chrome 69+ the object/blob uri may gets automatically revoked
                //      when leaving the site, causing a later Download invocation to fail.
                var blobURI = myURL.createObjectURL(blob);

                mBroadcaster.once('visibilitychange:false', function() {
                    later(function() {
                        myURL.revokeObjectURL(blobURI);
                    });
                });

                window.open(blobURI);
            }
        };

        this.setCredentials = function(url, size, filename, chunks, sizes) {
            if (d) {
                logger = new MegaLogger('MemoryIO', {}, dl.writer && dl.writer.logger);
                logger.info('MemoryIO Begin', dl_id, Array.prototype.slice.call(arguments));
            }
            if (size > MemoryIO.fileSizeLimit) {
                dlFatalError(dl, Error(l[16872]));
                if (!this.is_zip) {
                    ASSERT(!this.begin, "This should have been destroyed 'while initializing'");
                }
            }
            else {
                dblob = msie ? new MSBlobBuilder() : [];
                this.begin();
            }
        };

        this.abort = function() {
            if (dblob) {
                if (!this.completed) {
                    try {
                        if (msie) {
                            dblob.getBlob().msClose();
                        }
                        else {
                            for (var i = dblob.length; i--;) {
                                dblob[i].close();
                            }
                        }
                    }
                    catch (e) {}
                }
                dblob = undefined;
            }
        };

        this.getBlob = function(name) {
            if (msie) {
                return dblob.getBlob();
            }
            try {
                return new File(dblob, name, {type: filemime(name)});
            }
            catch (ex) {
            }
            return new Blob(dblob || [], {type: filemime(name)});
        };

        if (is_mobile) {
            this.abort = function() {};
        }
    }

    MemoryIO.usable = function() {
        return is_mobile || this.canSaveToDisk;
    };

    Object.defineProperty(MemoryIO, 'canSaveToDisk', {
        get: function() {
            return is_chrome_firefox || navigator.msSaveOrOpenBlob || hasDownloadAttr;
        }
    });

    mBroadcaster.once('startMega', function() {
        var uad = ua.details || false;

        if (!MemoryIO.usable()) {
            MemoryIO.fileSizeLimit = 0;
        }
        else if (localStorage.dlFileSizeLimit) {
            MemoryIO.fileSizeLimit = parseInt(localStorage.dlFileSizeLimit);
        }
        else if (is_mobile) {
            MemoryIO.fileSizeLimit = 100 * (1024 * 1024);

            // If Chrome or Firefox on iOS, reduce the size to 1.3 MB
            if (navigator.userAgent.match(/CriOS/i) || navigator.userAgent.match(/FxiOS/i)) {
                MemoryIO.fileSizeLimit = 1.3 * (1024 * 1024);
            }
        }
        else if (uad.engine === 'Trident' || uad.browser === 'Edge') {
            MemoryIO.fileSizeLimit = 600 * 1024 * 1024;
        }
        else {
            var GiB = mega.chrome ? 2 : parseFloat(navigator.deviceMemory) || 1;

            if (mega.flags.dlmemcap > 0) {
                GiB = mega.flags.dlmemcap;
            }

            if (d) {
                console.info('Device Memory: %s GiB, limit: %s', navigator.deviceMemory, GiB);
            }
            MemoryIO.fileSizeLimit = 1024 * 1024 * 1024 * GiB;
        }
    });

    scope.MemoryIO = MemoryIO;
})(this);
