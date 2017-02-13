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
            Soon(done);
        };

        this.download = function(name, path) {
            var blob = this.getBlob(name);
            this.completed = true;

            if (is_chrome_firefox) {
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
            else if (is_mobile) {
                if (page === 'download') {
                    var sblob = myURL.createObjectURL(blob);
                    $('body')
                        .addClass('download-complete')
                        .find('.download-progress')
                        .rebind('click', function() {
                            if (navigator.userAgent.match(/CriOS/i)) {
                                var reader = new FileReader();
                                reader.onload = function(e) {
                                    window.open(reader.result, '_blank');
                                };
                                return reader.readAsDataURL(blob);
                            }
                            window.open(sblob, '_blank');
                            return false;
                        });
                    $('.mobile.download-speed, .mobile.download-percents').text('');
                }
                else {
                    throw new Error('MemoryIO -- huh??');
                }
            }
            else if (hasDownloadAttr) {
                var blob_url = myURL.createObjectURL(blob);
                var dlLinkNode = document.getElementById('dllink');
                dlLinkNode.download = name;
                dlLinkNode.href = blob_url;
                dlLinkNode.click();
                Later(function() {
                    myURL.revokeObjectURL(blob_url);
                    blob_url = undefined;
                });
            }
            else {
                throw new Error('MemoryIO -- huh?');
            }

            this.abort();
        };

        this.setCredentials = function(url, size, filename, chunks, sizes) {
            if (d) {
                logger = new MegaLogger('MemoryIO', {}, dl.writer && dl.writer.logger);
                logger.info('MemoryIO Begin', dl_id, Array.prototype.slice.call(arguments));
            }
            if (size > MemoryIO.fileSizeLimit) {
                dlFatalError(dl, Error('File too big to be reliably handled in memory.'));
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
                if (msie && !this.completed) {
                    try {
                        // XXX: how to force freeing up the blob memory?
                        dblob = dblob.getBlob();
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
            return new Blob(dblob, {
                type: filemime(name)
            });
        };
    }

    MemoryIO.usable = function() {
        MemoryIO.fileSizeLimit = localStorage.dlFileSizeLimit
            || (1024 * 1024 * 1024 * (1 + browserdetails(ua).is64bit));

        return is_mobile || navigator.msSaveOrOpenBlob || hasDownloadAttr;
    };

    scope.MemoryIO = MemoryIO;
})(this);
