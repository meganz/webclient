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

(function(window) {
    "use strict";

    // https://dev.w3.org/2009/dap/file-system/file-writer.html#idl-def-FileWriter
    // https://dev.w3.org/2009/dap/file-system/file-dir-sys.html#the-entry-interface

    var TEMPORARY = window.TEMPORARY || 0,
        PERSISTENT = window.PERSISTENT || 1;

    function storage_s2n(s) {
        return s.toLowerCase() === 'persistent' ? PERSISTENT : TEMPORARY;
    }

    function storage_n2s(n) {
        return +n == PERSISTENT ? 'Persistent' : 'Temporary';
    }

    function queryUsageAndQuota(aType, aSuccess, aError) {
        var sType = storage_n2s(aType);

        if (navigator['webkit' + sType + 'Storage']) {
            return navigator['webkit' + sType + 'Storage'].queryUsageAndQuota(aSuccess, aError);
        }

        if (window.webkitStorageInfo) {
            return window.webkitStorageInfo.queryUsageAndQuota(aType, aSuccess, aError);
        }

        Soon(aError.bind(window, new Error('Unknown FileSystem API')));
    }

    function requestQuota(aType, aSize, aSuccess, aError) {
        var sType = storage_n2s(aType);

        if (navigator['webkit' + sType + 'Storage']) {
            return navigator['webkit' + sType + 'Storage'].requestQuota(aSize, aSuccess, aError);
        }

        if (window.webkitStorageInfo) {
            return window.webkitStorageInfo.requestQuota(aType, aSize, aSuccess, aError);
        }

        Soon(aError.bind(window, new Error('Unknown FileSystem API.')));
    }

    function clearit(storagetype, t, callback) {
        var tsec = t || 3600;

        function errorHandler2(e) {
            if (d) {
                console.error('error', e);
            }
            if (callback) {
                callback(e);
            }
        }

        function toArray(list) {
            return Array.prototype.slice.call(list || [], 0);
        }

        function readentry() {
            if (entries.length == 0) {
                if (callback) {
                    callback(0);
                }
            }
            else if (i < entries.length) {
                var file = entries[i];
                if (file.isFile) {
                    file.getMetadata(function(metadata) {
                        // do not delete file while it's being copied from FS to DL folder
                        // conservative assumption that a file is being written at 1024 bytes per ms
                        // add 30000 ms margin

                        var deltime = metadata.modificationTime.getTime()
                            + tsec * 1000 + metadata.size / 1024 + 30000;

                        if (!dlmanager.isTrasferActive(file.name) && deltime < Date.now() && deltime < lastactive) {
                            file.remove(function() {
                                    totalsize += metadata.size;
                                    if (d) {
                                        console.log('temp file removed',
                                            file.name, bytesToSize(metadata.size));
                                    }
                                    if (++del == entries.length && callback) {
                                        callback(totalsize);
                                    }
                                },
                                function() {
                                    if (d) {
                                        console.log('temp file removal failed',
                                            file.name, bytesToSize(metadata.size));
                                    }
                                    if (++del == entries.length && callback) {
                                        callback(totalsize);
                                    }
                                });
                        }
                        else {
                            if (d) {
                                console.log('tmp file too new to remove',
                                    file.name, bytesToSize(metadata.size));
                            }
                            if (++del == entries.length && callback) {
                                callback(totalsize);
                            }
                        }
                    });
                }
                i++;
                readentry();
            }
        }

        function onInitFs(fs) {
            fs.root.getDirectory('mega', {
                create: true
            }, function(dirEntry) {
                function readEntries() {
                    dirReader.readEntries(function(results) {
                        if (!results.length) {
                            readentry();
                        }
                        else {
                            entries = entries.concat(toArray(results));
                            readEntries();
                        }
                    }, errorHandler2);
                }
                var dirReader = dirEntry.createReader();
                readEntries();
            }, errorHandler2);
        }
        var i = 0;
        var del = 0;
        var entries = [];
        var totalsize = 0;
        if (window.requestFileSystem) {
            queryUsageAndQuota(storagetype, function(used, remaining) {
                if (used + remaining) {
                    if (d) {
                        console.log('Cleaning %s Storage...',
                            storage_n2s(storagetype), bytesToSize(used), bytesToSize(remaining));
                    }
                    window.requestFileSystem(storagetype, 1024, onInitFs, errorHandler2);
                }
                else {
                    if (callback) {
                        callback(0);
                    }
                }
            }, errorHandler2);
        }
        else {
            errorHandler2();
        }
    }

    var WRITERR_DIAGTITLE = 'Out of HTML5 Offline Storage space',
        chrome_write_error_msg = 0;

    function free_space(callback, ms) {
        /* error */
        clearit(0, 0, function(s) {
            if (d) {
                console.log('Freed %s of temporary storage', bytesToSize(s));
            }

            // clear persistent files:
            clearit(1, 0, function(s) {
                if (d) {
                    console.log('Freed %s of persistent storage', bytesToSize(s));
                }

                if (callback) {
                    setTimeout(function() {
                        callback();
                    }, ms || 2600);
                }
            });
        });
    }

    var HUGE_QUOTA = 1024 * 1024 * 1024 * 100;

    function dl_getspace(reqsize, callback, max_retries) {
        function retry(aStorageType, aEvent) {
            if (d) {
                console.error('Retrying...', max_retries, arguments);
            }

            if (max_retries) {
                Later(dl_getspace.bind(this, reqsize, callback, --max_retries));
            }
            else {
                callback(aStorageType, aEvent, -1);
            }
        }
        var zRetry = retry.bind(null, 0);

        if (typeof max_retries === 'undefined') {
            max_retries = 3;
        }

        if (d) {
            console.log("Requesting disk space for %s (%d bytes)", bytesToSize(reqsize), reqsize);
        }

        queryUsageAndQuota(PERSISTENT, function onPQU(used, remaining) {
            if (d) {
                console.log('Used persistent storage: %s, remaining: %s',
                    bytesToSize(used), bytesToSize(remaining));
            }

            queryUsageAndQuota(TEMPORARY, function onTQU(tused, tremaining) {
                if (d) {
                    console.log('Used temporary storage: %s, remaining: %s',
                        bytesToSize(tused), bytesToSize(tremaining));
                }

                if (used > 0 || remaining > 0) {
                    if (remaining < reqsize) {
                        clearit(1, 300, retry.bind(null, 1));
                    }
                    else {
                        callback(PERSISTENT);
                    }
                }
                else {
                    /**
                     * Check if our temporary storage quota is sufficient to proceed.
                     * (require 400% + 100MB margin because the quota can change during the download)
                     */
                    if (tremaining > reqsize * 5 + 1024 * 1024 * 100) {
                        callback();
                    }
                    else if (tused + tremaining > reqsize * 5 + 1024 * 1024 * 100) {
                        clearit(0, 300, zRetry);
                    }
                    else {
                        /**
                         * Highly likely that we will run out of 20% of 50% of free our diskspace
                         * -> request persistent storage to be able to use all remaining disk space.
                         */
                        requestQuota(PERSISTENT, HUGE_QUOTA, function onRQ(grantedBytes) {
                            if (d) {
                                console.log('Granted persistent storage: %s',
                                    bytesToSize(grantedBytes));
                            }

                            if (grantedBytes == 0) {
                                // user canceled the quota request?
                                retry(0, {
                                    name: 'SecurityError'
                                });
                            }
                            else {
                                /**
                                 * Looks like Chrome is granting storage even in Incognito mode,
                                 * ideally it should call our errorHandler without bothering
                                 * the user... [CHROME 36.0.1985.125]
                                 */
                                window.requestFileSystem(PERSISTENT, grantedBytes,
                                    function(fs) {
                                        callback(PERSISTENT);
                                    },
                                    retry.bind(null, 1)
                                );
                            }
                        }, zRetry);
                    }
                }
            }, zRetry);
        }, zRetry);
    }

    function errorHandler(type, e) {
        switch (e.name) {
            case 'QuotaExceededError':
                alert('Error writing file, is your harddrive almost full? (' + type + ')');
                break;
            case 'NotFoundError':
                alert('NOT_FOUND_ERR in ' + type);
                break;
            case 'SecurityError':
                alert('File transfers do not work with Chrome Incognito. (Security Error in ' + type + ')');
                break;
            case 'InvalidModificationError':
                alert('INVALID_MODIFICATION_ERR in ' + type);
                break;
            case 'InvalidStateError':
                console.log('INVALID_STATE_ERROR in ' + type + ', retrying...');
                Later(this.fsInitOp.bind(this));
                break;
            default:
                console.error('Unexpected error...', e.code, e.name, e);
                alert('requestFileSystem failed in ' + type);
        }
    }

    window.FileSystemAPI = function fsIO(dl_id, dl) {
        var
            dl_fw,
            dl_chunks = [],
            dl_chunksizes = [],
            dl_writing,
            dl_position = 0,
            dl_buffer,
            dl_geturl,
            dl_filesize,
            dl_filename,
            dl_done,
            dl_storagetype = 0,
            targetpos = 0,
            zfileEntry,
            wTimer,
            logger,
            failed = false,
            that = this;

        function dl_createtmpfile(fs) {
            var options = {
                create: true
            };
            fs.root.getDirectory('mega', options, function(dirEntry) {
                if (d) {
                    logger.info("Opening file for writing: mega/" + dl_id);
                }

                if (is_chrome_firefox) {
                    options.fxo = Object.create(dl, {
                        size: {
                            value: dl_filesize
                        }
                    });
                }

                fs.root.getFile('mega/' + dl_id, options, function(fileEntry) {
                    fileEntry.createWriter(function(fileWriter) {
                        if (d) {
                            logger.info('File "mega/' + dl_id + '" created');
                        }
                        dl_fw = fileWriter;

                        dl_fw.onerror = function(ev) {
                            /* onwriteend() will take care of it */
                            if (d) {
                                var error = Object(ev.target).error;
                                if (error) {
                                    logger.error(error.name, error.message);
                                }
                                else {
                                    logger.error(ev);
                                }
                            }
                        };

                        dl_fw.onwriteend = function() {
                            if (that) {
                                ASSERT(dl_fw.readyState === dl_fw.DONE,
                                    'Error truncating file!');
                                if (dl_fw.readyState === dl_fw.DONE) {
                                    if (that.begin) {
                                        that.begin();
                                    }
                                    else if (d) {
                                        logger.error("No 'begin' function, this must be aborted...", dl);
                                    }
                                    that = null;
                                }
                                return;
                            }

                            if (dl_fw.position == targetpos) {
                                chrome_write_error_msg = 0;
                                /* reset error counter */
                                dl_ack_write();
                            }
                            else {
                                logger.error('Short write (%d/%d)', dl_fw.position, targetpos, dl_fw.readyState);

                                /* try to release disk space and retry */
                                free_space(function() {
                                    if (!dl_fw) {
                                        logger.debug('Transfer %s cancelled while freeing space', dl_id);
                                        return;
                                    }
                                    if (++chrome_write_error_msg % 21 == 0
                                            && !$.msgDialog) {
                                        chrome_write_error_msg = 0;
                                        msgDialog('warningb:' + l[103],
                                            WRITERR_DIAGTITLE,
                                            'Your browser storage for MEGA is full. ' +
                                            'Your download will continue automatically after you free up some space.',
                                            str_mtrunc(dl_filename), function(cancel) {
                                                if (cancel) {
                                                    dlFatalError(dl, WRITERR_DIAGTITLE, -0xDEADBEEF);
                                                }
                                            });

                                        srvlog('Out of HTML5 Offline Storage space (write)');
                                    }
                                    failed = true;
                                    dl_ack_write();
                                });
                            }
                        };
                        zfileEntry = fileEntry;
                        dl_fw.truncate(0);
                    },
                    errorHandler.bind(that, 'createWriter'));
                },
                errorHandler.bind(that, 'getFile'));

                options = undefined;
            },
            errorHandler.bind(that, 'getDirectory'));
        }

        this.fsInitOp = function check() {
            dl_getspace(dl_filesize, function(aStorageType, aEvent, aFail) {
                if (wTimer === null) {
                    return;
                }

                if (aFail === -1) {
                    if (!$.msgDialog) {
                        srvlog('Out of HTML5 Offline Storage space (open)');

                        msgDialog('warningb:' + l[103], WRITERR_DIAGTITLE,
                            'Your available browser storage for MEGA cannot ' +
                            'handle this download size, please free up some disk space.',
                            str_mtrunc(dl_filename), function(cancel) {
                                if (cancel) {
                                    dlFatalError(dl, WRITERR_DIAGTITLE, -0xDEADBEEF);
                                }
                            });
                    }
                    wTimer = setTimeout(function() {
                        this.fsInitOp();
                    }.bind(this), 2801);
                    return wTimer;
                }
                dl_storagetype = aStorageType !== 1 ? 0 : 1;

                if (d) {
                    logger.info('Using Storage: ' + storage_n2s(dl_storagetype),
                        aStorageType, aEvent, aFail);
                }

                window.requestFileSystem(
                    dl_storagetype,
                    dl_filesize,
                    dl_createtmpfile,
                    errorHandler.bind(this, 'RequestFileSystem')
                );
            }.bind(this));
        };

        this.abort = function(err) {
            var _logger = logger || dlmanager.logger;
            _logger.debug('abort', err, wTimer, dl_id, dl_fw, zfileEntry);

            if (wTimer) {
                clearTimeout(wTimer);
            }
            wTimer = null;

            if (dl_fw) {
                if (is_chrome_firefox) {
                    dl_fw.close(err);
                }
                else if (err) {
                    try {
                        var onWriteEnd = (function(writer, entry) {
                            return function() {
                                if (arguments.length) {
                                    _logger.debug('onWriteEnd', arguments);
                                }
                                if (entry) {
                                    entry.remove(
                                        _logger.debug.bind(_logger),
                                        _logger.error.bind(_logger)
                                    );
                                }
                                else if (writer) {
                                    writer.truncate(0);
                                }

                                writer = entry = undefined;
                            };
                        })(dl_fw, zfileEntry);

                        if (dl_fw.readyState === dl_fw.WRITING) {
                            dl_fw.onerror = dl_fw.onwriteend = onWriteEnd;
                        }
                        else {
                            dl_fw.onerror = dl_fw.onwriteend = function() {};
                            onWriteEnd();
                        }
                    }
                    catch (e) {
                        if (d) {
                            _logger.error(e);
                        }
                    }
                }
            }

            dl_fw = zfileEntry = null;
        };

        function dl_ack_write() {
            if (failed) {
                /* reset error flag */
                failed = false;
                /* retry */
                try {
                    dl_fw.seek(dl_position);
                }
                catch (e) {
                    return dlFatalError(dl, e);
                }
                logger.warn('write error, retrying...', dl_fw.readyState);
                return wTimer = setTimeout(function() {
                    dl_fw.write(new Blob([dl_buffer]))
                }, 4480);
            }

            if ($.msgDialog
                    && $('#msgDialog:visible .fm-dialog-title').text() == WRITERR_DIAGTITLE) {
                closeDialog();
            }

            dl_buffer = null;
            dl_writing = false;
            if (dl_done) {
                dl_done();
            } /* notify writer */
        }

        this.write = function(buffer, position, done) {
            if (dl_writing || position != dl_fw.position) {
                throw new Error([position, buffer.length, position + buffer.length, dl_fw.position]);
            }

            failed = false;
            targetpos = buffer.length + dl_fw.position;
            dl_writing = true;
            dl_position = position;
            dl_buffer = buffer
            dl_done = done;

            if (d) {
                logger.info("Write " + buffer.length + " bytes at " + position + "/" + dl_fw.position);
            }
            try {
                dl_fw.write(new Blob([buffer]));
            }
            catch (e) {
                dlFatalError(dl, e);
            }
        };

        this.download = function(name, path) {
            logger.debug('download', name, path, dl_fw, zfileEntry);

            var saveLink = function(objectURL) {
                var node = document.getElementById('dllink');
                var link = typeof objectURL === 'string' && objectURL;

                node.download = name;
                node.href = link || zfileEntry.toURL();

                if (!is_chrome_firefox) {
                    node.click();
                }

                if (link) {
                    Later(function() {
                        myURL.revokeObjectURL(link);
                    });
                }
            };

            var saveFile = function(file) {
                try {
                    file = new File([file], name, {
                        type: filemime(name)
                    });

                    saveLink(myURL.createObjectURL(file));
                }
                catch (ex) {
                    logger.error(ex);
                    saveLink();
                }
            };

            if (is_mobile && typeof zfileEntry.file === 'function') {
                try {
                    return zfileEntry.file(saveFile, saveLink);
                }
                catch (ex) {
                    logger.error(ex);
                }
            }

            saveLink();
        };

        this.setCredentials = function(url, size, filename, chunks, sizes) {
            logger = new MegaLogger('FileSystemAPI', {}, dl.writer.logger);
            dl_geturl = url;
            dl_filesize = size;
            dl_filename = filename;
            dl_chunks = chunks;
            dl_chunksizes = sizes;

            // Try to free space before starting the download.
            free_space(this.fsInitOp.bind(this), 50);
        };
    };

    if (window.d) {
        window.free_space = free_space;
    }

    if (navigator.webkitGetUserMedia) {
        mBroadcaster.once('startMega', function __setup_fs() {
            if (dlMethod === FileSystemAPI) {
                if (window.requestFileSystem) {
                    window.requestFileSystem(0, 0x10000,
                        function(fs) {
                            free_space();
                        },
                        function(e) {
                            if (e && e.name === 'SecurityError') {
                                window.Incognito = 0xC120E;

                            /* Apparently indexedDBs are handled in memory on
                               Incognito windows, which turns it a non-suitable
                               workaround for the 496MB Blob limit :(

                                if (idbDownloadIO.usable()) {
                                    dlMethod = idbDownloadIO;
                                }
                                else*/ if (MemoryIO.usable()) {
                                    dlMethod = MemoryIO;
                                }
                                else {
                                    dlMethod = FlashIO;
                                }
                                console.error('Switching to ' + dlMethod.name);

                                // https://code.google.com/p/chromium/issues/detail?id=375297
                                MemoryIO.fileSizeLimit = 496*1024*1024;
                            }
                        }
                    );
                }
                else if (MemoryIO.usable()) {
                    dlMethod = MemoryIO;
                }
                else {
                    dlMethod = FlashIO;
                }
            }
        });
    }
})(this);
