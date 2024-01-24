(function(scope) {
    'use strict';

    var dir_inflight = 0;
    var filedrag_u = [];
    var filedrag_paths = Object.create(null);

    const optionReference = {
        touchedElement: 0,
        fileRequestEnabled: false,
        addOverlay: addOverlay,
        removeOverlay: removeOverlay
    };

    function addOverlay() {
        $('body', document).addClass('overlayed');

        if (optionReference.fileRequestEnabled) {
            $('body', document).addClass('file-request-drag');
            return;
        }

        $('.drag-n-drop.overlay').removeClass('hidden');
    }

    function removeOverlay() {
        $('body', document).removeClass('overlayed');

        if (optionReference.fileRequestEnabled) {
            $('body', document).removeClass('file-request-drag');
            return;
        }

        $('.drag-n-drop.overlay').addClass('hidden');
    }

    function addUpload(files, emptyFolders) {
        var straight = $.doStraightUpload || Object(window.fmconfig).ulddd || M.currentrootid === M.RubbishID;

        console.assert(page === 'start' || window.fminitialized, 'check this...');

        if (M.InboxID && M.currentrootid && (M.currentrootid === M.InboxID
            || M.getNodeRoot(M.currentdirid.split('/').pop()) === M.InboxID)) {

            msgDialog('error', l[882], l.upload_to_restricted_folder, l.upload_to_backup_info);
            return false;
        }

        if (page === 'start' || straight) {
            M.addUpload(files, false, emptyFolders);
        }
        else {
            openCopyUploadDialog(files, emptyFolders);
        }
    }

    function pushUpload() {
        if (!--dir_inflight && $.dostart) {
            var emptyFolders = Object.keys(filedrag_paths)
                .filter(function(p) {
                    return filedrag_paths[p] < 1;
                });

            addUpload(filedrag_u, emptyFolders);
            filedrag_u = [];
            filedrag_paths = Object.create(null);

            if (page === 'start') {
                start_upload();
            }
        }
    }

    function pushFile(file, path) {
        if (d > 1) {
            console.warn('Adding file %s', file.name, file);
        }
        if (file) {
            file.path = path;
            filedrag_u.push(file);
        }
        pushUpload();
    }

    function getFile(entry) {
        return new Promise(function(resolve, reject) {
            entry.file(resolve, reject);
        });
    }

    function traverseFileTree(item, path, symlink) {
        path = path || "";

        if (item.isFile) {
            dir_inflight++;
            getFile(item).then(function(file) {
                pushFile(file, path);
            }).catch(function(error) {
                if (d) {
                    var fn = symlink ? 'debug' : 'warn';

                    console[fn]('Failed to get File from FileEntry for "%s", %s',
                        item.name, Object(error).name, error, item);
                }
                pushFile(symlink, path);
            });
        }
        else if (item.isDirectory) {
            var newPath = path + item.name + "/";
            filedrag_paths[newPath] = 0;
            dir_inflight++;
            var dirReader = item.createReader();
            var dirReaderIterator = function() {
                dirReader.readEntries(function(entries) {
                    if (entries.length) {
                        var i = entries.length;
                        while (i--) {
                            traverseFileTree(entries[i], newPath);
                        }
                        filedrag_paths[newPath] += entries.length;

                        dirReaderIterator();
                    }
                    else {
                        pushUpload();
                    }
                }, function(error) {
                    console.warn('Unable to traverse folder "%s", %s',
                        item.name, Object(error).name, error, item);

                    pushUpload();
                });
            };
            dirReaderIterator();
        }
        if (d && dir_inflight == 0) {
            console.log('end');
        }
    }

    function start_upload() {
        if (u_type && u_attr) { // logged in user landing on start-page
            loadSubPage('fm');
            return;
        }
        if (u_wasloggedin()) {
            msgDialog('confirmation', l[1193], l[2001], l[2002], function(e) {
                if (e) {
                    start_anoupload();
                }
                else {
                    tooltiplogin.init();
                    $.awaitingLoginToUpload = true;

                    mBroadcaster.once('fm:initialized', function() {
                        ulQueue.resume();
                        uldl_hold = false;

                        if (ul_queue.length > 0) {
                            M.showTransferToast('u', ul_queue.length);
                        }
                    });
                }
            });
        }
        else {
            start_anoupload();
        }
    }

    function start_anoupload() {
        u_storage = init_storage(localStorage);
        loadingDialog.show();
        u_checklogin({
            checkloginresult: function(u_ctx, r) {
                u_type = r;
                u_checked = true;
                loadingDialog.hide();
                loadSubPage('fm');
            }
        }, true);
    }

    function FileDragEnter(e) {
        if (d) {
            console.log('DragEnter', optionReference.touchedElement);
        }
        e.preventDefault();
        if ($.dialog === 'avatar') {
            return;
        }
        e.stopPropagation();
        if (!isFileDragAllowed()) {
            return;
        }
        if (d > 1) {
            console.info('----- ENTER event :' + e.target.className);
        }
        optionReference.touchedElement++;
        if (optionReference.touchedElement === 1) {
            addOverlay();
        }

    }

    function FileDragHover(e) {
        if (d) {
            console.log('DragOver');
        }
        e.preventDefault();
        e.stopPropagation();
    }
    var useMegaSync = -1;
    var usageMegaSync = 0;


    function FileSelectHandlerMegaSyncClick(e) {

        if (M.isInvalidUserStatus()) {
            e.preventDefault();
            return false;
        }

        if (page === "chat" || page.indexOf('/chat/') > -1) {
            return true;
        }
        if (window.useMegaSync === 2) {
            e.preventDefault();
            e.stopPropagation();

            if (M.InboxID && M.currentrootid && (M.currentrootid === M.InboxID
                || M.getNodeRoot(M.currentdirid.split('/').pop()) === M.InboxID)) {

                msgDialog('error', l[882], l.upload_to_restricted_folder, l.upload_to_backup_info);
                return false;
            }

            var target;
            if ($.onDroppedTreeFolder) {
                target = $.onDroppedTreeFolder;
                delete $.onDroppedTreeFolder;
            }
            else if (M.currentCustomView) {
                target = M.currentCustomView.nodeID;
            }
            else if (String(M.currentdirid).length !== 8) {
                target = M.lastSeenCloudFolder || M.RootID;
            }
            else {
                target = M.currentdirid;
            }

            var uploadCmdIsFine = function _uploadCmdIsFine(error, response) {
                if (error) {
                    window.useMegaSync = 3;
                }
            };

            //var elem = $('#' + e.toElement.id)[0];
            var elem = e.target;
            if (elem.hasAttribute('webkitdirectory') || elem.hasAttribute('mozdirectory')
                || elem.hasAttribute('msdirectory') || elem.hasAttribute('odirectory')
                || elem.hasAttribute('directory')) {
                megasync.uploadFolder(target, uploadCmdIsFine);
            }
            else {
                megasync.uploadFile(target, uploadCmdIsFine);
            }
            return false;
        }
        else {
            return true;
        }
    }

    function FileDragLeave(e) {
        if (d) {
            console.log('DragLeave', optionReference.touchedElement);
        }
        e.preventDefault();
        if ($.dialog === 'avatar') {
            return;
        }
        e.stopPropagation();

        if (d > 1) {
            console.warn('----- LEAVE event :' + e.target.className + '   ' + e.type);
        }
        optionReference.touchedElement--;
        // below condition is due to firefox bug. https://developer.mozilla.org/en-US/docs/Web/Events/dragenter
        if (
            optionReference.touchedElement <= 0 ||
            optionReference.touchedElement === 1 && ua.details.browser === 'Firefox'
        ) {
            removeOverlay();
            optionReference.touchedElement = 0;
        }
    }

    // on Drop event or Click to file select event
    function FileSelectHandler(e) {

        if (e.preventDefault) {
            e.preventDefault();
        }

        // Clear drag element
        optionReference.touchedElement = 0;

        removeOverlay();

        if (M.isInvalidUserStatus()) {
            return false;
        }

        if ($.dialog === 'avatar') {
            return;
        }
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        if (e.type === 'drop' && !isFileDragAllowed()) {
            return;
        }

        useMegaSync = -1;

        const elem = e.target;
        const isFolderUpload = elem.hasAttribute('webkitdirectory') || elem.hasAttribute('mozdirectory')
            || elem.hasAttribute('msdirectory') || elem.hasAttribute('odirectory') || elem.hasAttribute('directory');

        // Log that User selected a folder (or file) for upload from the file explorer
        eventlog(isFolderUpload ? 500010 : 500012);

        var currentDir = M.currentCustomView ? M.currentCustomView.nodeID : M.currentdirid;

        if ($.awaitingLoginToUpload) {
            return tooltiplogin.init();
        }

        if (
            (
                folderlink || currentDir &&
                (
                    currentDir !== 'dashboard' &&
                    currentDir !== 'transfers' &&
                    (M.getNodeRights(currentDir) | 0) < 1
                )
            ) &&
            String(currentDir).indexOf("chat/") === -1
        ) {
            msgDialog('warningb', l[1676], l[1023]);
            return true;
        }

        if (M.InboxID && M.currentrootid && (M.currentrootid === M.InboxID
            || M.getNodeRoot(M.currentdirid.split('/').pop()) === M.InboxID)) {

            msgDialog('error', l[882], l.upload_to_restricted_folder, l.upload_to_backup_info);
            return false;
        }

        if (page === 'start' && !is_mobile) {
            console.assert(typeof fm_addhtml === 'function');
            if (typeof fm_addhtml === 'function') {
                fm_addhtml();
            }
        }

        var dataTransfer = Object(e.dataTransfer);
        var files = e.target.files || dataTransfer.files;
        if (!files || !files.length) {
            return false;
        }

        if (localStorage.testWebGL) {
            return WebGLMEGAContext.test(...files);
        }

        if (localStorage.testDCRaw) {
            (function _rawNext(files) {
                var file = files.pop();
                if (!file) {
                    return console.info('No more files.');
                }
                var id = Math.random() * 9999 | 0;
                var img = is_image(file.name);
                var raw = typeof img === 'string' && img;

                if (!img || !raw) {
                    console.warn('This is not a RAW image...', file.name, [file], img);
                    return _rawNext(files);
                }

                createthumbnail(file, false, id, null, null, {raw: raw})
                    .then((res) => {
                        console.info('testDCRaw result', res);
                        onIdle(_rawNext.bind(null, files));
                        M.saveAs(res.preview, `${file.name}.png`);
                    })
                    .dump(id);

            })(toArray.apply(null, files));
            return;
        }
        if (localStorage.testMediaInfo) {
            return MediaInfoLib.test(files);
        }
        if (localStorage.testGetID3CoverArt) {
            return getID3CoverArt(files[0]).then(function(ab) {
                console.info('getID3CovertArt result', mObjectURL([ab], 'image/jpeg'));
            }).catch(console.debug.bind(console));
        }
        if (localStorage.testStreamerThumbnail) {
            return M.require('videostream').tryCatch(function() {
                Streamer.getThumbnail(files[0])
                    .then(function(ab) {
                        console.info('Streamer.getThumbnail result', mObjectURL([ab], 'image/jpeg'));
                    })
                    .catch(console.debug.bind(console));
            });
        }

        if (window.d && (e.ctrlKey || e.metaKey) && /^mega-dbexport/.test(files[0].name)) {
            return MegaDexie.import(files[0]).dump();
        }

        if (window.d && (e.ctrlKey || e.metaKey) && MediaInfoLib.isFileSupported(files[0])) {
            window.d = 2;
            document.body.textContent = 'Local videostream.js Test...';
            const video = mCreateElement('video', {width: 1280, height: 720, controls: true}, 'body');
            return M.require('videostream').then(() => Streamer(files[0], video)).catch(dump);
        }

        if (e.dataTransfer
                && e.dataTransfer.items
                && e.dataTransfer.items.length > 0 && e.dataTransfer.items[0].webkitGetAsEntry) {
            var items = e.dataTransfer.items;
            for (var i = 0; i < items.length; i++) {
                if (items[i].webkitGetAsEntry) {
                    var item = items[i].webkitGetAsEntry();
                    if (item) {
                        filedrag_u = [];
                        if (i == items.length - 1) {
                            $.dostart = true;
                        }
                        traverseFileTree(item, '', item.isFile && items[i].getAsFile());
                    }
                }
            }
        }
        else {
            var u = [];
            var gecko = dataTransfer && ("mozItemCount" in dataTransfer) || Object(ua.details).browser === 'Firefox';
            if (gecko && parseFloat(Object(ua.details).version) > 51) {
                // No need to check for folder upload attempts through zero-bytes on latest Firefox versions
                gecko = false;
            }
            for (var i = 0, f; f = files[i]; i++) {
                if (f.webkitRelativePath) {
                    f.path = String(f.webkitRelativePath).replace(RegExp("[\\/]"
                            + String(f.name).replace(/([^\w])/g,'\\$1') + "$"), '');
                }
                if (gecko) {
                    f.gecko = true;
                }
                if (f.name != '.') {
                    u.push(f);
                    if (Math.floor(f.lastModified / 1000) === Math.floor(Date.now() / 1000)) {
                        api_req({a: 'log', e: 99659, m: 'file modification time uses current time for uploading.'});
                    }
                }
            }
            M.addUpload(u);
            if (page == 'start') {
                start_upload();
            }
            if (!window.InitFileDrag) {
                return;
            }

            var $fileAndFolderUploadWrap = $('.fm-file-upload').parent();

            $('input', $fileAndFolderUploadWrap).remove();
            $fileAndFolderUploadWrap.safeAppend('<input type="file" class="hidden" id="fileselect1" title="' +
                l[99] + '" multiple="">' + // File input
                '<input type="file" class="hidden" id="fileselect2" webkitdirectory="" title="' +
                l[98] + '" multiple="">'); // Folder input
            $('input#fileselect3').remove();
            $('.files-menu .fileupload-item')
                .after('<input type="file" id="fileselect3" class="hidden" name="fileselect3" multiple="">');
            $('input#fileselect4').remove();
            $('.files-menu .folderupload-item').after('<input type="file" id="fileselect4"' +
                ' name="fileselect4" webkitdirectory="" multiple="" class="hidden">');
            InitFileDrag();
        }
        return true;
    }

    function onDragStartHandler(e) {
        if ((e.target && e.target.toString && e.target.toString() === '[object Text]')
            || page.indexOf('/fm/') === -1) {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }
    }

    /**
     * Check current page is allowed on drag and drop to upload file
     *
     * @return {Boolean} Is allowed or not
     */
    function isFileDragAllowed() {
        if (page === 'start') {
            return true;
        }
        return !(is_fm() && // if page is fm,
            (window.slideshowid || !$('.feedback-dialog').hasClass('hidden') || // preview and feedback dialog show
                !$('.mega-dialog.duplicate-conflict', 'body').hasClass('hidden') || // conflict dialog show
                M.currentdirid === 'shares' || // Share root page
                M.currentdirid === 'out-shares' || // Out-share root page
                M.currentdirid === 'public-links' || // Public-link root page
                M.currentdirid === 'file-requests' || // File request page
                String(M.currentdirid).startsWith('chat/contacts') || // Contacts pages
                M.currentrootid === M.RubbishID || // Rubbish bin
                (M.currentrootid === undefined && M.currentdirid !== 'transfers') // Dashboard and Settings pages
            ));
    }

    // initialize
    scope.InitFileDrag = function() {
        var i = 5;
        while (i--) {
            var o = document.getElementById(i ? 'fileselect' + i : 'start-upload');
            if (o) {
                o.addEventListener("change", FileSelectHandler, false);
                if (!is_mobile && i) {
                    o.addEventListener("click", FileSelectHandlerMegaSyncClick, true);
                }
            }
        }

        // dran&drop overlay click handler, to allow closing if stuck
        $('.drag-n-drop.overlay')
            .rebind('click.dnd', function dragDropLayoutClickHndler() {
                removeOverlay();
            });

        var fnHandler = FileSelectHandler;
        var fnEnter = FileDragEnter;
        var fnHover = FileDragHover;
        var fnLeave = FileDragLeave;

        optionReference.touchedElement = 0;

        // FileRequest upload
        const fileSelect = document.getElementById('fileselect5');
        if (fileSelect) {
            optionReference.fileRequestEnabled = true;
            fnHandler = mega.fileRequestUpload.getAndSetUploadHandler(optionReference);
            fnEnter = mega.fileRequestUpload.checkUploadDragHandler(fnEnter);
            fnHover = mega.fileRequestUpload.checkUploadDragHandler(fnHover);
            fnLeave = mega.fileRequestUpload.checkUploadDragHandler(fnLeave);
        }

        document.getElementsByTagName("body")[0].addEventListener("dragenter", fnEnter, false);
        document.getElementsByTagName("body")[0].addEventListener("dragover", fnHover, false);
        document.getElementsByTagName("body")[0].addEventListener("dragleave", fnLeave, false);
        document.getElementsByTagName("body")[0].addEventListener("drop", fnHandler, false);
        document.getElementsByTagName("body")[0].addEventListener("dragstart", onDragStartHandler, false);

        if (is_mobile &&
            (ua.details.engine === 'Gecko' && parseInt(ua.details.version) < 83
            || is_ios && is_ios < 13)) {
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1456557
            $('input[multiple]').removeAttr('multiple');
        }
    };

})(this);

// Selenium helper to fake a drop event
function fakeDropEvent(target) {
    // hash: "MTIzNAAAAAAAAAAAAAAAAAOLqRY"
    var file = new File(['1234'], 'test\u202Efdp.exe', {
        type: "application/octet-stream",
        lastModified: 1485195382
    });

    var ev = document.createEvent("HTMLEvents");
    ev.initEvent("drop", true, true);
    ev.dataTransfer = {
        files: [file]
    };

    target = target || document.getElementById("startholder");
    target.dispatchEvent(ev);
}

function ulDummyFiles(count, len) {
    'use strict';

    var ul = [];
    var ts = 1e8;
    for (var n = M.v.length; n--;) {
        ts = Math.max(ts, M.v[n].mtime | 0);
    }

    for (var i = count || 6e3; i--;) {
        var now = Date.now();
        var rnd = Math.random();
        var nam = (rnd * now).toString(36);
        var buf = asmCrypto.getRandomValues(new Uint8Array(rnd * (len || 512)));

        ul.push(new File([buf], nam, {type: 'application/octet-stream', lastModified: ++ts * 1e3}));
    }

    M.addUpload(ul, true);
}

async function ulDummyImages(count, type) {
    'use strict';

    const ul = [];
    const ext = (type = type || 'image/jpeg').split('/').pop();

    eventlog = dump;
    for (let i = count || 210; i--;) {
        const rnd = Math.random();
        const wdh = 320 + rnd * 2345 | 0;
        const buf = await webgl.createImage(i % 2 ? rnd * Date.now() : null, wdh, wdh / 1.777 | 0, type)
            .catch((ex) => {
                console.error(i, wdh, ex.message || ex, ex.data, [ex]);
            });

        if (buf) {
            ul.push(new File([buf], `${makeUUID().slice(-17)}.${ext}`, {type, lastModified: 9e11}));
        }

        if (!(i % 48)) {
            M.addUpload([...ul], true);
            ul.length = 0;
        }
    }
}
