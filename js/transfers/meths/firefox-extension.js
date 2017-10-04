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

"use strict";

function FirefoxIO(dl_id, dl) {
    var FD, PATH, error;

    this.write = function(buffer, offset, done) {
        if (d) {
            console.log('Writing...', buffer.byteLength, offset, PATH);
        }
        FD.write(buffer).then(l => Soon(done), error);
    };

    this.download = function(name) {
        this.abort();
        mozIOCleanup(name, PATH, 0, dl);
    };

    this.setCredentials = function(url, size, name) {
        error = mozIOError(name);

        if (!this.is_zip && dl.zipid) {
            return this.begin();
        }

        mozIOSetup(name, dl.zipid ? '' : dl.p, size, error, (p, byteLength) => {
            if (!dl.st) {
                dl.st = Date.now();
            }

            if (byteLength == size) {
                return dlFatalError(dl, new Error(l[1668]));
            }

            var options = {write: true};

            if (byteLength) {
                options.append = true;
            }
            else {
                options.trunc = true;
            }

            OS.File.open(PATH = p, options).then(fd => {
                FD = fd;
                Soon(() => this.begin(OS.Path.basename(p), byteLength));
            }, error);
        });
    };

    this.abort = function(e) {
        if (FD) {
            FD.close();
            FD = undefined;
            if (e) {
                OS.File.remove(PATH);
            }
        }
    };

    this.hasResumeSupport = true;
}

function MemoryIO(dl_id, dl) {
    var u8buf;

    if (d) {
        console.error('Creating new Firefox MemoryIO instance', dl_id, dl);
    }

    this.write = function(buffer, offset, done) {
        u8buf.set(buffer, offset);
        Soon(done);
    };

    this.download = function(name, path) {
        var tmp = u8buf,
            size = tmp.length,
            error = mozIOError(name);
        u8buf = undefined;

        mozIOSetup(name, path, size, error, path => {
            OS.File.writeAtomic(path, tmp).then(r => {
                console.assert(r === size, 'MemoryIO Error ' + r + '/' + size);
                mozIOCleanup(name, path, size, dl);
            }, error);
        });
    };

    this.setCredentials = function(url, size) {
        if (d) {
            console.log('MemoryIO Begin', dl_id, Array.prototype.slice.call(arguments));
        }

        if (this.is_zip || !dl.zipid) {
            u8buf = new Uint8Array(size);
        }
        this.begin();
    };

    this.abort = function() {
        u8buf = undefined;
    };
}
MemoryIO.usable = function() {
    return true
};

function mozIOError(name) {
    return function(e) {
        mozError(e);
        msgDialog('warninga', l[1676], l[115] + ': ' + name, '' + e);
    };
}

function mozIOCleanup(name, path, size, dl) {
    if (d) {
        console.log('mozIOCleanup', name, path);
    }
    if (dl.t) {
        OS.File.setDates(path, null, dl.t * 1e3);
    }
    mozAddToLibrary(path, name, size, dl.st);
}

function mozIOSetup(name, path, size, error, success) {
    function setup() {
        var root;
        var dirname;
        var byteLength;
        var onSuccess = () => {
            if (d) {
                console.log('mozIOSetup', name, path, byteLength);
            }
            success(path, byteLength);
        };

        try {
            if (path && mozIOSetup.lastPath[path]) {
                root = mozIOSetup.lastPath[path];
            }
            else if (mozPrefs.getBoolPref('askdir')) {
                root = mozFilePicker(name, 2);
            }
            else {
                root = mozGetDownloadsFolder();
            }

            if (path) {
                mozIOSetup.lastPath[path] = root;
            }
            root = root.path;
        }
        catch (e) {
            return Soon(() => error(e));
        }

        path = OS.Path.join(root, ...mozSanePathTree(path, name));

        dirname = OS.Path.dirname(path);

        OS.File.makeDir(dirname, {ignoreExisting: true, from: root}).then(() => {
            OS.File.stat(path)
                .then(info => {
                    if (d) {
                        console.log('File "%s" exists (%s bytes)', path, info.size, info);
                    }
                    byteLength = info.size;
                    onSuccess();
                }, onSuccess);
        }, error);
    }

    webkitStorageInfo.queryUsageAndQuota((u, r) => {
        if (r > size) {
            return setup();
        }

        webkitStorageInfo.requestQuota(size, setup);
    });
}
mozIOSetup.lastPath = {};

function FlashIO() {}
