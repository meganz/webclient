/** @property T.ui.addFilesLayout */
lazy(T.ui, 'addFilesLayout', () => {
    'use strict';

    const stop = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
    };

    const ce = (n, a, t) => mCreateElement(n, a, t);

    // Context menu for integrated page
    const createMenu = (cn) => {
        const item = ce('div', { class: 'it-menu context' }, cn);
        let node = ce('div', { class: 'body' }, item);
        node = ce('div', { class: 'section' }, node);

        let btn = ce('button', { class: 'it-menu-item js-add-files', 'data-name': 'file' }, node);
        ce('i', { class: 'sprite-it-x24-mono icon-add-file' }, btn);
        ce('span', null, btn).textContent = l.transferit_add_files;

        btn = ce('button', { class: 'it-menu-item js-add-folders', 'data-name': 'folder' }, node);
        ce('i', { class: 'sprite-it-x24-mono icon-add-folder' }, btn);
        ce('span', null, btn).textContent = l.transferit_add_folders;

        return item;
    };

    const getFileList = async(ev) => {
        stop(ev);
        loadingDialog.show();
        return factory.require('file-list')
            .getFileList(ev)
            .then((files) => files.length ? files : false)
            .finally(() => loadingDialog.hide());
    };

    return freeze({
        data: Object.create(null),
        addFiles: Object.create(null),
        addedFiles: Object.create(null),
        linkReady: Object.create(null),
        transferring: Object.create(null),

        /*
         * Init common events.
        */
        async init(psn) {
            const upload = (ev) => {
                getFileList(ev)
                    .then((files) => {
                        if (files.length) {
                            this.appendAddedFiles(files);

                            if (this.data.step === 1) {
                                this.renderAddedFiles();
                            }
                            this.renderUploadList();
                        }
                    })
                    .catch(tell);
            };
            const drop = (ev) => {
                if (this.data.step === 1 || this.data.step === 2) {
                    return ev.dataTransfer && upload(ev);
                }
            };

            // Render Add files section. Step 1 or Step for mega integrated page
            if (self.is_transferit) {
                this.renderAddFiles();
            }
            else {
                this.data.ko = [];
                this.data.files = [];
                this.renderAddedFiles();

                if (psn) {
                    queueMicrotask(() => {
                        this.tryTransferNodes(psn).catch(tell);
                    });
                }
            }

            // Skip listeners adding
            if (this.data.pcl) {
                return;
            }

            // Init Select folders evt
            for (const elm of T.ui.page.content.querySelectorAll('.upload-picker')) {
                elm.value = '';
                elm.addEventListener('change', upload);
            }

            // Init DND evt
            T.ui.page.content.addEventListener('drop', drop);

            // Unbind dragAndDrop input evts on page change
            this.data.pcl = mBroadcaster.addListener('it:beforepagechange', () => {
                for (const elm of T.ui.page.content.querySelectorAll('.upload-picker')) {
                    elm.value = '';
                    elm.removeEventListener('change', upload);
                }
                T.ui.page.content.removeEventListener('drop', drop);

                mBroadcaster.removeListener(this.data.pcl);
                delete this.data.pcl;
            });
        },

        /*
         * Render Add files section. Step 1.
        */
        renderAddFiles() {
            this.addFiles.cn = T.ui.page.content.querySelector('.it-box-holder.js-add-files-section');
            this.data.files = [];

            // Show section
            this.data.step = 1;
            T.ui.page.showSection(this.addFiles.cn, 'start');
        },

        /*
         * Init Added files section. Step 2.
        */
        initAddedFiles() {
            const cn = this.addedFiles.cn = T.ui.page.content
                .querySelector('.it-box-holder.js-added-files-section');
            const terms = this.addedFiles.terms = cn.querySelector('input[name="glb-terms-and-privacy"]');
            const btn = this.addedFiles.btn = cn.querySelector('.js-get-link-button');
            const email = this.addedFiles.email = cn.querySelector('#glb-email-input');
            const rn = this.addedFiles.rn = cn.querySelector('#glb-recipients-input');
            const sched = this.addedFiles.sched = cn.querySelector('#glb-scheduled-input');
            const schop = cn.querySelector('.glb-schedule-option');
            const tn = this.addedFiles.tn = cn.querySelector('#glb-title-input');
            const sgmCn = cn.querySelector('.it-sgm-control');
            const sgm = sgmCn.querySelectorAll('input[name="glb-manage-sgm"]');
            const inputsWrap = cn.querySelector('.js-inputs-body');

            this.addedFiles.exp = cn.querySelector('#glb-expires-input');
            this.addedFiles.msg = cn.querySelector('#glb-msg-area');
            this.addedFiles.pw = cn.querySelector('#glb-password-input');

            // Init inputs UI
            T.ui.input.init(
                cn.querySelectorAll('input[type="password"], input[type="text"], textarea')
            );

            // Init chips (multiple values)
            let timeout = false;
            T.ui.input.initChips(rn, {
                validate: (val) => {
                    const is_valid = isValidEmail(val);
                    if (!is_valid) {
                        T.ui.input.errorMsg(rn, l[7415]);
                        clearTimeout(timeout);

                        timeout = setTimeout(() => {
                            T.ui.input.errorMsg(rn);
                        }, 2e3);
                    }
                    return is_valid;
                }
            });

            // Enable/disable notification toggles
            const switchNotif = (checkbox) => {
                if (isValidEmail(email.value)
                    && !(checkbox.name === 'gbl-exp-notif'
                    && cn.querySelector('input[name="glb-expire-radio"]:checked').value === '0')) {
                    checkbox.closest('.it-toggle').classList.remove('disabled');
                    checkbox.disabled = false;
                    checkbox.checked = true;
                }
                else {
                    checkbox.closest('.it-toggle').classList.add('disabled');
                    checkbox.disabled = true;
                    checkbox.checked = false;
                }
            };

            email.addEventListener('input', () => {
                for (const elm of cn.querySelectorAll('.notifications input')) {
                    switchNotif(elm);
                }
            });

            // Init Expiry dropdown
            T.ui.dropdown.clone(cn.querySelector('.js-expires-dropdown'), {
                position: 'right center',
                onChange: () => {
                    switchNotif(cn.querySelector('input[name="gbl-exp-notif"]'));
                }
            });

            // Init scheduled calendar
            T.ui.input.initDatePicker(sched);
            $(sched).datepicker({
                onSelect: (_, date) => {
                    this.data.schedule = ~~(date.getTime() / 1e3);
                }
            });

            // Init settings button
            const settingsBtn = cn.querySelector('.js-link-settings');
            settingsBtn.addEventListener('click', (e) => {
                if (e.currentTarget.classList.contains('active-icon')) {
                    inputsWrap.scrollTo({ top: 0, behavior: 'smooth' });
                    inputsWrap.classList.remove('visible-settings');
                    settingsBtn.classList.remove('active-icon');
                }
                else {
                    const dn = cn.querySelector('.js-default-inputs');
                    e.currentTarget.classList.add('active-icon');
                    inputsWrap.classList.add('visible-settings');
                    inputsWrap.scrollTo({
                        top: dn.getBoundingClientRect().height + 38,
                        behavior: 'smooth'
                    });
                }
            });

            // Init "Send to" input evt
            rn.addEventListener('input', () => this.updateGetLinkBtn());
            rn.addEventListener('blur', () => this.updateGetLinkBtn());
            rn.addEventListener('focus', () => this.updateGetLinkBtn());

            // Init Terms and Privacy checkbox
            terms.addEventListener('change', () => this.updateGetLinkBtn());

            // Init title input evt
            tn.addEventListener('input', (e) => {
                e.target.dataset.customVal = 'true';
                this.updateGetLinkBtn();
            });

            // Init Get link button
            btn.addEventListener('click', (e) => {
                stop(e);

                if (tn.value && !e.currentTarget.classList.contains('disabled')) {
                    this.renderTransferring(tn.value);
                }
            });

            // Send files / Get link control
            for (let i = sgm.length; i--;) {
                sgm[i].addEventListener('change', (e) => {

                    // Show/hide Recipients input
                    if (e.target.value === '1') {
                        inputsWrap.classList.add('ext');
                        rn.closest('.it-input').classList.remove('hidden');
                        schop.classList.remove('hidden');
                    }
                    else {
                        schop.classList.add('hidden');
                        inputsWrap.classList.remove('ext');
                        rn.closest('.it-input').classList.add('hidden');
                    }
                    // Update button state
                    this.updateGetLinkBtn();
                });
            }

            // Init remove all files button
            cn.querySelector('.js-remove-all').addEventListener('click', () => {
                this.data.files = [];
                this.renderUploadList();
            });

            // Init MEGA integrated page evts
            if (!self.is_transferit) {
                this.initMegaPageEvts();
            }
        },

        // Init MEGA integrated page evts
        initMegaPageEvts() {
            const {cn} = this.addedFiles;
            const menu = createMenu(cn.querySelector('.add-more-files-box'));
            const mBtn = cn.querySelector('.js-add-from-local');
            const hide = (e) => {
                if (e.key === 'Escape' || e.type !== 'keydown' && !mBtn.contains(e.target)) {
                    menu.classList.remove('visible');
                    document.removeEventListener('click', hide);
                    document.removeEventListener('keydown', hide);
                }
            };

            // Show Add files from mega, Add files from local
            cn.querySelector('.add-files.main').classList.add('hidden');
            cn.querySelector('.add-files.mega').classList.remove('hidden');

            // Clear invalid files
            cn.querySelector('.js-clear-invalid').addEventListener('click', () => {
                loadingDialog.show();
                onIdle(() => {
                    this.getTransferFiles();
                    this.renderUploadList();
                    loadingDialog.hide();
                });
            });

            // Show menu when clicking Upload from local
            mBtn.addEventListener('click', (e) => {
                if (e.currentTarget.classList.contains('disabled')) {
                    return false;
                }
                menu.classList.add('visible');
                menu.querySelector('.section').classList.remove('hidden');
                $(menu).position({
                    of: $(e.currentTarget.querySelector('span')),
                    my: 'left top',
                    at: 'center bottom',
                    collision: 'flipfit',
                    within: $('body')
                });
                document.addEventListener('click', hide);
                document.addEventListener('keydown', hide);
            });

            // Init context menu btnts click
            for (const elm of menu.querySelectorAll('button')) {
                elm.addEventListener('click', (e) => {
                    cn.querySelector(`input[name="select-${e.currentTarget.dataset.name}"]`).click();
                });
            }

            // Init Upload from Cloud drive
            cn.querySelector('.js-add-from-mega').addEventListener('click', (e) => {
                if (!cn.classList.contains('ongoing-add')
                    && !e.currentTarget.classList.contains('disabled')) {
                    cn.classList.add('ongoing-add');

                    this.tryTransferNodes(null)
                        .catch(tell)
                        .finally(() => {
                            cn.classList.remove('ongoing-add');
                        });
                }
            });
        },

        async tryTransferNodes(sel) {
            if (sel) {
                if (!Array.isArray(sel)) {
                    sel = [sel];
                }
                sel = sel.map((n) => n && typeof n === 'object' && n.h || n).filter(String);
            }
            return this.addFilesFromCloudDrive(sel && sel.length ? sel : null)
                .finally(() => {
                    if (self.d) {
                        console.groupEnd();
                        console.timeEnd('add-files-from-clouddrive');
                    }
                    loadingDialog.hide();
                });
        },

        async addFilesFromCloudDrive(sel) {
            const prev = new Set(this.data.files.map(n => n.h));

            let customFilterFn = (n) => {
                if (n.fv) {
                    return false;
                }
                if (self.xdNv) {
                    const tv = M.getTreeValue(n) & ~M.IS_FAV;
                    return n.t === tv;
                }
                return true;
            };
            const showSpinner = !sel;

            sel = sel || await M.initFileAndFolderSelectDialog({customFilterFn});
            if (!(sel && sel.length)) {
                return false;
            }

            if (mega.CloudBrowserDialog) {
                customFilterFn = mega.CloudBrowserDialog.getFilterFunction(customFilterFn);
            }
            if (showSpinner) {
                loadingDialog.show();
            }

            // Show file info loader
            this.toggleLoading();

            if (self.d) {
                console.group('Adding files from cloud-drive...');
                console.time('add-files-from-clouddrive');
            }
            const nodes = new Set();
            const parents = Object.create(null);

            const lst = await M.getCopyNodes(sel, {clearna: true});
            const sn = !prev.size && sel.length === 1 && M.getNodeByHandle(sel[0]);

            for (let i = lst.length; i--;) {
                const n = M.getNodeByHandle(lst[i].h);

                if (!n.t && !prev.has(n.h) && customFilterFn(n)) {
                    if (n.s > 9) {
                        nodes.add(n.h);
                    }
                    parents[n.p] = 1;

                    lst[i].size = n.s;
                    lst[i].name = n.name;
                }
                else {
                    lst.splice(i, 1);
                }
            }
            if (!lst.length) {
                console.warn('Nothing (new) to add...', sel);
                this.toggleLoading(true);
                return false;
            }
            const {SAFEPATH_SOP, SAFEPATH_SEP} = factory.require('mkdir');

            // const prom = api.req({a: 'if', n: [...nodes]});
            // await api.yield();
            const prom = T.core.getImportedNodes(nodes);

            for (let i = lst.length; i--;) {
                const n = lst[i];
                const p = [];
                let h = n.p;

                while (parents[h]) {
                    const n = M.getNodeByHandle(h);
                    if (n.name && (parents[n.p] || n.name !== sn.name)) {
                        p.push(n.name);
                    }
                    h = n.p;
                }

                if (p.length) {
                    n.path = `${SAFEPATH_SOP}${p.reverse().join(SAFEPATH_SEP)}`;
                }

                if (!(i % 1e4)) {
                    await scheduler.yield();
                }
            }
            this.appendAddedFiles(lst);
            this.data.ko = array.extend(this.data.ko, await prom, false);
            this.data.sn = sn;

            return this.renderUploadList();
        },

        appendAddedFiles(lst) {
            this.data.files = array.extend(this.data.files, lst, 0);
            this.data.files.sort((a, b) => a.size < b.size ? -1 : 1);
        },

        toggleLoading(hide) {
            const { cn } = this.addedFiles;
            const ac = hide ? 'remove' : 'add';

            cn.querySelector('.js-loader').classList[ac]('active');
            for (const elm of cn.querySelectorAll('.inv-input')) {
                elm.classList[ac]('disabled');
            }
        },

        /*
         * Render Added files section. Step 2.
        */
        renderAddedFiles() {
            if (!this.addedFiles.cn) {
                this.initAddedFiles();
            }

            const { cn, btn, email, exp, msg, pw, rn, sched, tn } = this.addedFiles;

            // Reset inputs
            email.value = ''; // Email input
            email.dispatchEvent(new Event('input'));
            msg.value = ''; // Message textarea
            pw.value = ''; // Password input
            sched.value = 'None'; // scheduled input
            tn.value = ''; // Title input
            T.ui.input.clear(rn); // Recipients input
            delete tn.dataset.customVal;
            delete this.data.schedule;

            // Reset Get link button
            btn.classList.add('disabled');

            // Render files list
            this.renderUploadList();

            // Show section
            this.data.step = 2;
            T.ui.page.showSection(cn);

            // Set default expiry date, hide options for FREE accounts
            this.resetExpiryDate(cn.querySelector('.js-expires-dropdown'));

            // Scroll to top
            cn.querySelector('.js-inputs-body').scrollTo({ top: 0 });
        },

        resetExpiryDate(dn) {
            for (const elm of dn.querySelectorAll('.js-option')) {
                const val = elm.querySelector('input').value;
                if (u_attr && (u_attr.p || u_attr.b || u_attr.pf)) {
                    elm.classList.remove('hidden');
                }
                else if (val === '0' || val === '180' || val === '365') {
                    elm.classList.add('hidden');
                }
                if (val === '90') {
                    elm.querySelector('input').click();
                }
            }
        },

        async renderUploadList() {
            let size = 0;
            let haveInvalid = false;
            const {files, ko = []} = this.data;
            const cn = this.addedFiles.cn.querySelector('.js-files-container');
            const clearInvalid = this.addedFiles.cn.querySelector('.js-clear-invalid');
            const invalidMsg = this.addedFiles.cn.querySelector('.js-invalid-error');
            const onRmBtn = (ev) => {
                const row = ev.currentTarget.closest('.it-grid-item');

                row.remove();
                files.splice(row.id.slice(4), 1);

                this.renderUploadList();
            };

            cn.textContent = '';

            if (self.d) {
                console.time('render-upload-list');
            }

            // Render file list
            for (let i = files.length; i--;) {
                const ul = files[i];
                const nv = ko.includes(ul.h);

                const row = ce('div', {
                    class: `it-grid-item${nv ? ' invalid' : ''}`,
                    id: `ulx_${i}`,
                    hid: ul.h,
                    tabindex: 0
                }, cn);
                let col = ce('div', {class: 'col'}, row);

                // File icon
                let wrap = ce('div', {class: `it-thumb-base ${fileIcon(ul)}`}, col);

                ce('i', {class: `sprite-it-mime ${fileIcon(ul)}`}, wrap);

                // File name
                ce('span', {class: 'md-font-size pr-color'}, col).textContent = ul.name;

                col = ce('div', {class: 'col'}, row);

                // Render remove button
                wrap = ce('button', {
                    'aria-label': l.transferit_remove_file,
                    class: 'it-button xs-size ghost'
                }, col);
                ce('i', {class: 'sprite-it-x16-mono icon-close'}, wrap);

                // Init remove btn
                wrap.addEventListener('click', onRmBtn);

                // File size
                ce('span', {class: 'align-end'}, col).textContent = bytesToSize(ul.size);

                size += ul.size;
                haveInvalid = haveInvalid || nv;

                if (!(i % 1e4)) {
                    await scheduler.yield();
                }
            }

            // If there are invalid files, show error and Clear invalid button
            if (haveInvalid) {
                clearInvalid.classList.remove('hidden');
                invalidMsg.classList.remove('hidden');
            }
            else {
                clearInvalid.classList.add('hidden');
                invalidMsg.classList.add('hidden');
            }

            // Update files data
            this.updateUploadListInfo(size);

            if (self.d) {
                console.timeEnd('render-upload-list');
            }
        },

        updateUploadListInfo(size) {
            const { files } = this.data;
            const { cn, tn } = this.addedFiles;

            if (!tn.dataset.customVal || !tn.value.trim()) {
                tn.value = files.length === 1 ? files[0].name :
                    files.length ? l.transferit_multiple_files : '';
            }

            this.updateGetLinkBtn();

            cn.querySelector('.files-info .num').textContent =
                mega.icu.format(l.file_count, files.length);
            cn.querySelector('.files-info .size').textContent = bytesToSize(size);

            // Hide file info loader
            this.toggleLoading(true);
        },

        updateGetLinkBtn() {
            const {files, ko = []} = this.data;
            const { cn, btn, rn, tn, terms } = this.addedFiles;
            const sgm = cn.querySelector('input[name="glb-manage-sgm"]:checked');
            const recipients = isValidEmail(rn.value) || T.ui.input.getValue(rn).length;

            // Check files, email, recipients (if sending a link)
            if (terms.checked && tn.value.trim()
                && files.length && files.length !== ko.length
                && (sgm.value === '1' && recipients || sgm.value === '0')) {

                btn.classList.remove('disabled');
            }
            else {
                btn.classList.add('disabled');
            }
        },

        calculateUploadProgress(tick) {
            let done = 0;
            let total = 0;
            let speed = 0;
            const tp = $.transferprogress;
            for (let i = ul_queue.length; i--;) {
                const ul = ul_queue[i];
                const tu = tp && tp[ulmanager.getGID(ul)];

                if (tu) {
                    done += tu[0];
                    total += tu[1];
                    speed += tu[2];
                }
                else {
                    total += ul.size || 0;
                }
            }
            if (total) {
                done += tp.ulc || 0;
                total += tp.ulc || 0;
            }
            if (!speed) {
                const spent = tp && (tick || Date.now()) - tp.ust;
                speed = spent > 0 ? done / (spent / 1e3) : 0;
            }
            return {done, total, speed, percent: ~~(done / total * 100), left: speed && (total - done) / speed};
        },

        /*
         * Init Transferring section. Step 3.
        */
        initTransferring() {
            const cn = this.transferring.cn = T.ui.page.content
                .querySelector('.it-box-holder.js-transfer-section');
            const box = this.transferring.box = cn.querySelector('.transferring-box');
            const header = this.transferring.header = cn.querySelector('h4');
            const copyBtn = this.transferring.copyBtn = cn.querySelector('.js-copy-link');
            const cancelBtn = this.transferring.cancelBtn = cn.querySelector('.js-cancel');
            const resumeBtn = this.transferring.resumeBtn = cn.querySelector('.js-resume');
            const confirmBtn = this.transferring.confirmBtn = cn.querySelector('.js-confirm');

            copyBtn.addEventListener('click', ({currentTarget: elm}) => {
                if (!elm.classList.contains('disabled')) {
                    elm.classList.add('disabled');

                    if (this.data.link) {
                        T.ui.copyLinkToClipboard(this.data.link);
                    }

                    loadingDialog.show();
                    this.finishTransferring()
                        .then(() => this.renderLinkReady())
                        .catch(tell)
                        .finally(() => {
                            loadingDialog.hide();
                            delete this.data.stashing;
                        });
                }
            });

            cancelBtn.addEventListener('click', (e) => {
                if (e.currentTarget.classList.contains('disabled')) {
                    return false;
                }
                box.classList.add('cancel');
                header.textContent = l.transferit_cancel_transfer_q;
                confirmBtn.classList.remove('hidden');
                resumeBtn.classList.remove('hidden');
                copyBtn.classList.add('hidden');
                cancelBtn.classList.add('hidden');
            });

            confirmBtn.addEventListener('click', () => {
                ulmanager.abort(null);

                loadingDialog.show();
                (async() => {
                    while (ulmanager.isUploading) {
                        await tSleep(-1);
                    }
                })().finally(() => T.ui.loadPage());
            });

            resumeBtn.addEventListener('click', () => {
                box.classList.remove('cancel');
                header.textContent = l.transferit_transferring;
                confirmBtn.classList.add('hidden');
                resumeBtn.classList.add('hidden');
                copyBtn.classList.remove('hidden');
                cancelBtn.classList.remove('hidden');
            });
        },

        /*
         * Finish Transferring (close transfer, establish attribites, etc)
        */
        async finishTransferring() {
            if (!this.data.stashing) {
                const {cn, rn} = this.addedFiles;

                const emails = T.ui.input.getValue(rn);

                const {value: title} = document.getElementById('glb-title-input');
                const {value: sender} = document.getElementById('glb-email-input');
                const {value: message} = document.getElementById('glb-msg-area');
                const {value: password} = document.getElementById('glb-password-input');
                const {value: expiry} = cn.querySelector('input[name="glb-expire-radio"]:checked');

                const {xh, schedule} = this.data;

                const p = [];
                if (sender || message || password || parseInt(expiry) > 0) {
                    const en = cn.querySelector('.exp-notif input').checked | 0;
                    p.push(T.core.setTransferAttributes(xh, {title, sender, message, password, expiry, en}));
                }

                if (emails.length) {
                    const bulk = emails.map((email) => ({email, schedule}));

                    p.push(T.core.setMultiTransferRecipients(xh, bulk));
                }

                this.data.stashing = Promise.all(p).then(() => T.core.close(xh));
            }
            return this.data.stashing;
        },

        /*
         * Render Transferring section. Step 3.
        */
        renderTransferring(name) {
            if (!this.transferring.cn) {
                this.initTransferring();
            }

            const { cn, box, header, copyBtn, cancelBtn, resumeBtn, confirmBtn } =
                this.transferring;
            const leftNode = cn.querySelector('#transferfilesleft');
            const rightNode = cn.querySelector('#transferfilesright');
            const domTransfer = cn.querySelector('.status-info.transfer');
            const domTime = cn.querySelector('.status-info.time');
            const domTick = cn.querySelector('.js-link-tick');
            const domSize = domTransfer.querySelector('.size');
            const domLeft = domTime.querySelector('.left');
            const domSpeed = domTransfer.querySelector('.speed');
            const domUploaded = domTransfer.querySelector('.uploaded');

            box.classList.remove('completed', 'cancel');
            header.textContent = l.transferit_transferring;
            copyBtn.classList.add('disabled');
            confirmBtn.classList.add('hidden');
            resumeBtn.classList.add('hidden');
            copyBtn.classList.remove('hidden');
            cancelBtn.classList.remove('hidden', 'disabled');
            domTransfer.classList.add('hidden');
            domTime.classList.add('hidden');
            leftNode.removeAttribute('style');
            rightNode.removeAttribute('style');

            // Show section
            this.data.step = 3;
            T.ui.page.showSection(cn);

            const updateProgress = () => {
                const {done, total, speed, left, percent} = this.calculateUploadProgress();
                const deg = 360 * Math.min(99, percent) / 100;
                const esimate = secondsToTimeShort(left);
                if (deg <= 180) {
                    rightNode.style.transform = `rotate(${deg}deg)`;
                }
                else {
                    rightNode.style.transform = 'rotate(180deg)';
                    leftNode.style.transform = `rotate(${deg - 180}deg)`;
                }
                domTransfer.classList.remove('hidden');
                if (esimate) {
                    domTime.classList.remove('hidden');
                }
                domSize.textContent = bytesToSize(total);
                domSpeed.textContent = bytesToSpeed(speed);
                domUploaded.textContent = bytesToSize(done);
                domLeft.textContent = l.transferit_x_remaining
                    .replace('%1' , secondsToTimeShort(left));
            };

            let tick = 0;
            let tock = 0;
            const files = this.getTransferFiles();

            T.ui.ulprogress = (ul, p, bl, bt, bps) => {
                const tp = $.transferprogress;
                const gid = ulmanager.getGID(ul);
                if (files.local) {
                    domTransfer.classList.remove('hidden');
                    files.local = false;
                }
                tp[gid] = [bl, bt, bps];
                console.info('ul-progress(%s)... %s% (%s/%s)...', gid, p, bl, bt, [ul]);

                tick = ++tock;
                requestAnimationFrame(() => tick === tock && updateProgress());
            };

            domSize.textContent = '';
            domUploaded.textContent = '';
            domTick.classList.add('hidden');

            if (this.data.sn && (!name || name === l.transferit_multiple_files)) {
                name = this.data.sn.name;
            }

            T.core.upload(files, name)
                .then((res) => {
                    if (res) {
                        this.data.xh = res[0];
                        this.data.link = `https://transfer.it/t/${this.data.xh}`;
                    }
                    return Promise.all(res);
                })
                .then(() => {
                    leftNode.style.transform = `rotate(180deg)`;
                    rightNode.style.transform = 'rotate(180deg)';

                    header.textContent = l.transferit_completed;
                    box.classList.add('completed');
                    box.classList.remove('cancel');
                    cancelBtn.classList.add('disabled');
                    cancelBtn.classList.remove('hidden');
                    copyBtn.classList.remove('disabled', 'hidden');
                    confirmBtn.classList.add('hidden');
                    resumeBtn.classList.add('hidden');
                    domTick.classList.remove('hidden');
                    domTransfer.classList.add('hidden');
                    domTime.classList.add('hidden');

                    if (T.ui.dashboardLayout) {
                        T.ui.dashboardLayout.data.refresh = true;
                    }
                    delete T.ui.ulprogress;

                    this.finishTransferring().catch(dump);
                })
                .catch(tell);
        },

        getTransferFiles() {
            let local = false;
            const {files, ko = []} = this.data;

            for (let i = files.length; i--;) {
                const {h} = files[i];

                if (h) {
                    if (ko.includes(h)) {
                        files.splice(i, 1);
                    }
                }
                else {
                    local = true;
                    if (!ko.length) {
                        break;
                    }
                }
            }
            files.local = local;
            return files;
        },

        /*
         * Init Link ready section. Step 4.
        */
        initLinkReady() {
            const cn = this.linkReady.cn = T.ui.page.content
                .querySelector('.it-box-holder.js-link-ready-section');
            const input = this.linkReady.input = cn.querySelector('.it-input input');
            const linkBody = this.linkReady.linkBody = cn.querySelector('.body.step-1');
            const contentBody = this.linkReady.contentBody = cn.querySelector('.body.step-2');

            T.ui.input.init(input);

            input.addEventListener('focus', (e) => {
                e.currentTarget.setSelectionRange(0, e.currentTarget.value.length);
            });

            cn.querySelector('.js-copy-to-clipboard').addEventListener('click', (e) => {
                stop(e);

                input.focus();
                T.ui.copyLinkToClipboard(input.value);
            });

            cn.querySelector('.js-new-link').addEventListener('click', () => this.init());

            cn.querySelector('.js-show-content').addEventListener('click', () => {
                // linkBody.classList.add('hidden');
                // contentBody.classList.remove('hidden');

                window.open(input.value, '_blank', 'noopener,noreferrer');
            });

            cn.querySelector('.js-back-button').addEventListener('click', () => {
                linkBody.classList.remove('hidden');
                contentBody.classList.add('hidden');
            });
        },

        /*
         * Render Link ready section. Step 4.
        */
        renderLinkReady() {
            if (!this.linkReady.cn) {
                this.initLinkReady();
            }

            const { cn, input, linkBody, contentBody } = this.linkReady;

            input.value = this.data.link;
            linkBody.classList.remove('hidden');
            contentBody.classList.add('hidden');

            // Show section
            this.data.step = 4;
            T.ui.page.showSection(cn);

            input.focus();
            input.dispatchEvent(new Event('focus'));
        }
    });
});
