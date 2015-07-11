(function(window) {
    "use strict";

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
                    setTimeout(callback, ms || 2600);
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
                                    code: FileError.SECURITY_ERR
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
        // TODO: FileError is deprecated. Please use the 'name' or 'message' attributes of DOMError rather than 'code'.
        switch (e.code) {
            case FileError.QUOTA_EXCEEDED_ERR:
                alert('Error writing file, is your harddrive almost full? (' + type + ')');
                break;
            case FileError.NOT_FOUND_ERR:
                alert('NOT_FOUND_ERR in ' + type);
                break;
            case FileError.SECURITY_ERR:
                alert('File transfers do not work with Chrome Incognito. (Security Error in ' + type + ')');
                break;
            case FileError.INVALID_MODIFICATION_ERR:
                alert('INVALID_MODIFICATION_ERR in ' + type);
                break;
            case FileError.INVALID_STATE_ERR:
                console.log('INVALID_STATE_ERROR in ' + type + ', retrying...');
                Later(this.fsInitOp.bind(this));
                break;
            default:
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
            failed = false,
            that = this;

        function dl_createtmpfile(fs) {
            var options = {
                create: true
            };
            fs.root.getDirectory('mega', options, function(dirEntry) {
                if (d) {
                    console.log("Opening file for writing: mega/" + dl_id);
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
                            console.log('File "mega/' + dl_id + '" created');
                        }
                        dl_fw = fileWriter;

                        dl_fw.onerror = function(e) {
                            /* onwriteend() will take care of it */
                            if (d) {
                                console.error(e);
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
                                        console.error("No 'begin' function, this must be aborted...", dl);
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
                                console.error('Short write (' + dl_fw.position + ' / ' +
                                    targetpos + ')');

                                /* try to release disk space and retry */
                                free_space(function() {
                                    if (++chrome_write_error_msg % 21 == 0
                                            && !$.msgDialog) {
                                        chrome_write_error_msg = 0;
                                        msgDialog('warningb',
                                            WRITERR_DIAGTITLE,
                                            'Your browser storage for MEGA is full. ' +
                                            'Your download will continue automatically after you free up some space.');
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
                        msgDialog('warningb', WRITERR_DIAGTITLE,
                            'Your available browser storage for MEGA cannot ' +
                            'handle this download size, please free up some disk space.');
                    }
                    return wTimer = setTimeout(this.fsInitOp.bind(this), 2801);
                }
                dl_storagetype = aStorageType !== 1 ? 0 : 1;

                if (d) {
                    console.log('Using Storage: ' + storage_n2s(dl_storagetype),
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
                        dl_fw.onerror = dl_fw.onwriteend = function() {};
                        dl_fw.truncate(0);
                    }
                    catch (e) {
                        if (d) {
                            console.error(e);
                        }
                    }
                }
            }
        };

        function dl_ack_write() {
            if (failed) {
                /* reset error flag */
                failed = false;
                /* retry */
                dl_fw.seek(dl_position);
                DEBUG('IO: error, retrying');
                return wTimer = setTimeout(function() {
                    dl_fw.write(new Blob([dl_buffer]))
                }, 2600);
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
                console.log("Write " + buffer.length + " bytes at " + position + "/" + dl_fw.position);
            }
            try {
                dl_fw.write(new Blob([buffer]));
            }
            catch (e) {
                dlFatalError(dl, e);
            }
        };

        this.download = function(name, path) {
            document.getElementById('dllink').download = name;
            document.getElementById('dllink').href = zfileEntry.toURL();
            if (!is_chrome_firefox) {
                document.getElementById('dllink').click();
            }
        };

        this.setCredentials = function(url, size, filename, chunks, sizes) {
            dl_geturl = url;
            dl_filesize = size;
            dl_filename = filename;
            dl_chunks = chunks;
            dl_chunksizes = sizes;
            this.fsInitOp();
        };
    };

    if (navigator.webkitGetUserMedia) {
        mBroadcaster.once('startMega', function __setup_fs() {
            if (dlMethod === FileSystemAPI) {
                if (window.requestFileSystem) {
                    window.requestFileSystem(0, 0x10000,
                        function(fs) {
                            free_space();
                        },
                        function(e) {
                            if (e && e.code === FileError.SECURITY_ERR) {
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


function idbDownloadIO(dl_id, dl) {
    var db;
    var schema = {
        chunks: {
            key: { keyPath: 'id' , autoIncrement: true }
        }
    };

    this.write = function(buffer, offset, done) {
        if (d) console.log('iDB Writing...', buffer.byteLength, offset);

        db.server.update('chunks', new Blob([buffer]))
            .then(done, function(e) {
                dlFatalError(dl, e.reason);
            });
    };

    this.download = function(name, path) {
        var blobs = [], self = this;
        var idb = db.server.idbRequestInstance;

        idb.transaction("chunks",'readonly')
            .objectStore("chunks")
            .openCursor().onsuccess = function(ev) {
                try {
                    var cursor = ev.target.result;

                    if (cursor) {
                        blobs.push(cursor.value);
                        cursor.continue();
                    }
                    else {
                        __completeDownload();
                    }
                } catch(e) {
                    console.error(e);
                    dlFatalError(dl, e);
                }
            };

        function __completeDownload() {
            var dlLinkNode = document.getElementById('dllink');
            var file_url = myURL.createObjectURL(new Blob(blobs));
            blobs.length = 0;
            dlLinkNode.download = name;
            dlLinkNode.href = file_url;
            dlLinkNode.click();
            Later(function() {
                myURL.revokeObjectURL(file_url);
                file_url = undefined;
                self.abort();
            });
        }
    };
    this.download1 = function(name, path) {
        var self = this;
        db.query('chunks').execute()
            .done(function(chunks) {

            }).fail(function(e) {
                dlFatalError(dl, e);
            });
    };

    this.abort = function(err) {
        if (db) {
            db.drop();
            db = null;
        }
    };

    this.setCredentials = function(url, size, name) {
        if (this.is_zip || !dl.zipid) {
            var __onDbStateChange = function(ev) {
                db.unbind('onDbStateReady').unbind('onDbStateFailed');

                if (ev.type === 'onDbStateFailed') {
                    dlFatalError(dl, Error('iDB State Error'));
                } else {
                    db.clear('chunks').then(this.begin.bind(this), function() {
                        dlFatalError(dl, Error('iDB Clear Error'));
                    });
                }
            }.bind(this);

            db = new MegaDB('dl', dl_id, schema);

            db.bind('onDbStateReady', __onDbStateChange)
                .bind('onDbStateFailed', __onDbStateChange);

        } else {
            this.begin();
        }
    };
}

idbDownloadIO.usable = function()
{
    return !!window.indexedDB;
};

function FileIO(dl_id, dl) {
    var file;

    this.write = function(buffer, offset, done) {
        file = new File([file, buffer], file.name, {
            type: file.type,
            lastModified: Date.now()
        });
        Soon(done);
    };

    this.download = function(name, path) {
        var file_url = myURL.createObjectURL(file);
        var dlLinkNode = document.getElementById('dllink');
        dlLinkNode.download = name;
        dlLinkNode.href = file_url;
        dlLinkNode.click();
        Later(function() {
            myURL.revokeObjectURL(file_url);
            file_url = undefined;
        });
    };

    this.setCredentials = function(url, size, name) {
        if (this.is_zip || !dl.zipid) {
            file = new File([""], name, {
                type: "application/octet-stream",
                lastModified: Date.now()
            });
        }
        this.begin();
    };
}

FileIO.usable = function() {
    var r = false;

    if (typeof File !== 'undefined') {
        try {
            var f = new File(["M"], "M.txt", {
                type: "text/plain"
            });
            r = f.size === 1 && f.name === 'M.txt';
        }
        catch (e) {}
    }

    return r;
}

function mTestIOMethod(c) {
    var chunks = c || 60, chunk_size = 0x1000000, chunk = 0;
    var dl_id = Date.now().toString(36),
        dl = {
            id: dl_id,
            pos: 0,
            name: 'foo-'+dl_id+'.bin',
            size: chunks * chunk_size,
        };
    var io = new dlMethod(dl_id, dl);
    dl.io = io;
    dl.io.size = dl.size;
    io.begin = function() {
        nextChunk();

        function nextChunk() {
            if (chunk === chunks) {
                io.download(dl.name);
            } else {
                console.log('Writing chunk', chunk);
                io.write(new ArrayBuffer(chunk_size), chunk++ * chunk_size, nextChunk);
            }
        }
    };
    setTimeout(function() {
        io.setCredentials('https://example.org', dl.size, dl.name);
    }, 4000);
}
// dlMethod = idbDownloadIO;mTestIOMethod()
