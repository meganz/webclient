(function(scope) {

    function getDDhelper() {
        var id = '#fmholder';
        if (page == 'start') {
            id = '#startholder';
        }
        $('.udragger-block').remove();
        $(id).append('<div class="udragger-block drag" id="draghelper"><div class="dragger-status"></div><div class="dragger-files-number u-dfn">1</div></div>');
        $('.udragger-block').removeClass('multiple');
        $('.udragger-block').show();
        $('.dragger-files-number.u-dfn').hide();
        return $('.udragger-block')[0];
    }

    function FileDragHover(e) {
        if (d) {
            console.log('hover', $.dragging);
        }
        // if (folderlink) return false;
        $.dragging = Date.now();
        e.stopPropagation();
        e.preventDefault();
        if (document.getElementById('start_uploadbutton')) {
            document.getElementById('start_uploadbutton').style.display = 'none';
        }
        if (!$.ddhelper) {
            var filecnt = 0;
            if (e && e.target && e.target.files) {
                var files = e.target.files || e.dataTransfer.files;
                for (var i in files) {
                    filecnt++;
                }
            }
            else if (e
                    && e.dataTransfer
                    && e.dataTransfer.items
                    && e.dataTransfer.items.length > 0 && e.dataTransfer.items[0].webkitGetAsEntry) {
                var items = e.dataTransfer.items;
                for (var i in items) {
                    if (items[i].kind) {
                        filecnt++;
                    }
                }
            }
            else if (e && e.dataTransfer && e.dataTransfer.files) {
                var files = e.dataTransfer.files;
                for (var i in files) {
                    filecnt++;
                }
            }
            else if (e && e.dataTransfer && e.dataTransfer.mozItemCount) {
                filecnt = e.dataTransfer.mozItemCount;
            }
            else {
                filecnt = 1;
            }
            if (filecnt > 0) {
                $.ddhelper = getDDhelper();
            }
            if (filecnt > 1) {
                $('.dragger-files-number.u-dfn').text(filecnt);
                $('.dragger-files-number.u-dfn').show();
            }
        }
        if ($.ddhelper) {
            $('#draghelper .dragger-icon').remove();
            $('<div class="dragger-icon ' + fileIcon({
                name: ''
            }) + '"></div>').insertAfter('#draghelper .dragger-status');
            $('.dragger-icon.fade').fadeTo(500, 0.1);
            $($.ddhelper).css({
                left: (e.pageX + 35 + "px"),
                top: (e.pageY - 5 + "px")
            });
            $('.udragger-block').removeClass('drag warning copy download move to-shared to-contacts to-conversations to-rubbish');
            $('.udragger-block').addClass('copy');
        }
        if (e) {
            var t = $(e.target);
            $('.nw-fm-tree-item, .nw-contact-item').css('background-color', '');
            $('.ui-selected').removeClass('ui-selected');

            if (t.hasClass('nw-fm-tree-folder') || t.hasClass("nw-contact-name")) {
                t = t.parent();
            }
            if (t.hasClass('nw-fm-tree-item') || t.hasClass("nw-contact-item")) {
                t.css('background-color', 'rgba(222,222,10,0.3)');
            }
            else if (M.viewmode) {
                if (t.hasClass('data-block-view folder')) {
                    t.addClass('ui-selected');
                }
            }
            else {
                if (t.hasClass('tranfer-filetype-txt')
                    || t.hasClass('shared-folder-info-block')
                    || t.parent().hasClass('shared-folder-info-block')) {

                    t = t.closest('tr');

                    if (t.hasClass('folder')) {
                        t.addClass('ui-selected');
                    }
                }
            }
        }
    }

    function FileDragLeave(e) {
        if (d) {
            console.log(e);
        }
        // if (folderlink || M.getNodeRights(M.currentdirid) < 1) return false;
        e.stopPropagation();
        e.preventDefault();
        setTimeout(function() {
            if (e && (e.pageX < 6 || e.pageY < 6) && $.dragging && $.dragging + 50 < Date.now()) {
                $($.ddhelper).remove();
                $.ddhelper = undefined;
            }
        }, 100);
        setTimeout(function() {
            if (page == 'start'
                    && e && (e.pageX < 6 || e.pageY < 6) && $.dragging && $.dragging + 500 < Date.now()) {
                $.dragging = false;
            }
        }, 500);
    }

    var dir_inflight = 0;
    var filedrag_u = [];

    function pushUpload() {
        if (!--dir_inflight && $.dostart) {
            addupload(filedrag_u);
            filedrag_u = [];
            if (page === 'start') {
                start_upload();
            }
        }
    }

    function traverseFileTree(item, path) {
        path = path || "";
        if (item.isFile) {
            dir_inflight++;
            item.file(function(file) {
                if (d > 1) {
                    console.log(file);
                }
                file.path = path;
                filedrag_u.push(file);
                pushUpload();
            });
        }
        else if (item.isDirectory) {
            dir_inflight++;
            var dirReader = item.createReader();
            var dirReaderIterator = function() {
                dirReader.readEntries(function(entries) {
                    if (entries.length) {
                        var i = entries.length;
                        while (i--) {
                            traverseFileTree(entries[i], path + item.name + "/");
                        }

                        dirReaderIterator();
                    }
                    else {
                        pushUpload();
                    }
                });
            };
            dirReaderIterator();
        }
        if (d && dir_inflight == 0) {
            console.log('end');
        }
    }

    function start_upload() {
        if (u_wasloggedin()) {
            msgDialog('confirmation', l[1193], l[2001], l[2002], function(e) {
                if (e) {
                    start_anoupload();
                }
                else {
                    loginDialog();

                    mBroadcaster.once('fm:initialized', function() {
                        ulQueue.resume();
                        uldl_hold = false;

                        if (ul_queue.length > 0) {
                            showTransferToast('u', ul_queue.length);
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

    // file selection
    function FileSelectHandler(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        if (e.preventDefault) {
            e.preventDefault();
        }

        $($.ddhelper).remove();
        $.ddhelper = undefined;

        var target   = $(e.target);
        var targetid = M.currentdirid;

        if (target.hasClass("nw-fm-tree-folder") || target.hasClass("nw-contact-name")) {
            target = target.parent();
        }
        if (target.hasClass("nw-fm-tree-item") || target.hasClass("nw-contact-item")) {
            targetid = target.attr('id').split('_').pop();
        }
        else if (M.viewmode) {
            if (target.hasClass('data-block-view folder')) {
                targetid = target.attr('id');
            }
        }
        else {
            if (target.hasClass('tranfer-filetype-txt')
                || target.hasClass('shared-folder-info-block')
                || target.parent().hasClass('shared-folder-info-block')) {

                target = target.closest('tr');

                if (target.hasClass('folder')) {
                    targetid = target.attr('id');
                }
            }
        }

        if (
            (
                folderlink ||
                (
                    M.currentdirid !== 'dashboard' &&
                    M.currentdirid !== 'transfers' &&
                    (M.getNodeRights(targetid) | 0) < 1
                )
            ) &&
            String(M.currentdirid).indexOf("chat/") === -1
        ) {
            msgDialog('warningb', l[1676], l[1023]);
            return true;
        }

        if (page == 'start') {
            if ($('#fmholder').html() == '') {
                $('#fmholder').html(translate(pages['fm'].replace(/{staticpath}/g, staticpath)));
            }
        }
        else {
            $('.nw-fm-tree-item, .nw-contact-item').css('background-color', '');

            if (targetid !== M.currentdirid) {
                $.onDroppedTreeFolder = targetid;
            }
            else if (M.currentdirid === 'contacts') {
                targetid = null;

                if (M.viewmode) {
                    if (target.parent().hasClass('data-block-view ustatus')) {
                        target = target.parent();
                    }

                    if (target.hasClass('data-block-view ustatus')) {
                        targetid = target.attr('id');
                    }
                }
                else {
                    if (target.parent().hasClass('fm-chat-user-info')) {
                        target = target.parent();
                    }

                    if (target.hasClass('fm-chat-user-info')) {
                        targetid = target.closest('tr').attr('id');
                    }
                }

                if (String(targetid).length !== 11) {
                    return false;
                }
                $.onDroppedTreeFolder = targetid;
            }
        }

        var dataTransfer = Object(e.dataTransfer);
        var files = e.target.files || dataTransfer.files;
        if (!files || files.length == 0) {
            if (!is_chrome_firefox || !dataTransfer.mozItemCount) {
                return false;
            }
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
                        traverseFileTree(item);
                    }
                }
            }
        }
        else if (is_chrome_firefox && e.dataTransfer) {
            try {
                for (var i = 0, m = e.dataTransfer.mozItemCount; i < m; ++i) {
                    var file = e.dataTransfer.mozGetDataAt("application/x-moz-file", i);
                    if (file instanceof Ci.nsIFile) {
                        filedrag_u = [];
                        if (i == m - 1) {
                            $.dostart = true;
                        }
                        traverseFileTree(new mozDirtyGetAsEntry(file /*,e.dataTransfer*/ ));
                    }
                    else {
                        if (d) {
                            console.log('FileSelectHandler: Not a nsIFile', file);
                        }
                    }
                    // e.dataTransfer.mozClearDataAt("application/x-moz-file", i);
                }
            }
            catch (e) {
                alert(e);
                Cu.reportError(e);
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
                }
            }
            addupload(u);
            if (page == 'start') {
                start_upload();
            }
            $('.fm-file-upload input').remove();
            $('.fm-file-upload').append('<input type="file" id="fileselect1" multiple="">');
            $('.fm-folder-upload input').remove();
            $('.fm-folder-upload').append('<input type="file" id="fileselect2" webkitdirectory="" multiple="">');
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

    // initialize
    scope.InitFileDrag = function() {
        var i = 5;
        while (i--) {
            var o = document.getElementById(i ? 'fileselect' + i : 'start-upload');
            if (o) {
                o.addEventListener("change", FileSelectHandler, false);
            }
        }

        document.getElementById("fmholder").addEventListener("dragover", FileDragHover, false);
        document.getElementById("fmholder").addEventListener("dragleave", FileDragLeave, false);
        document.getElementById("fmholder").addEventListener("drop", FileSelectHandler, false);
        document.getElementById("startholder").addEventListener("dragover", FileDragHover, false);
        document.getElementById("startholder").addEventListener("dragleave", FileDragLeave, false);
        document.getElementById("startholder").addEventListener("drop", FileSelectHandler, false);

        if (is_chrome_firefox) {
            $('input[webkitdirectory], .fm-folder-upload input').click(function(e) {
                var file = mozFilePicker(0, 2, { /*gfp:1,*/
                    title: l[98]
                });

                if (file) {
                    e.target = {
                        files: [-1]
                    };
                    e.dataTransfer = {
                        mozItemCount: 1,
                        mozGetDataAt: function() {
                            return file;
                        }
                    };
                    FileSelectHandler(e);
                    file = undefined;
                }
                else {
                    if (e.stopPropagation) {
                        e.stopPropagation();
                    }
                    if (e.preventDefault) {
                        e.preventDefault();
                    }
                }
            });
        }
    }

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
