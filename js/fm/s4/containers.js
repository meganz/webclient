lazy(s4, 'containers', () => {
    'use strict';

    const { exportKey, logger } = s4.utils;
    const { S4PagedDialog } = s4.ui.classes;
    const ce = (n, t, a) => mCreateElement(n, a, t);

    const services = {
        rclone: {
            name: 'Rclone',
            guides: [
                {
                    info: l.s4_relcone_guide_info,
                    link: 'rclone-setup-guide-for-mega-s4',
                    eventName: 501171
                }
            ],
            ref: {
                items: [
                    l.s4_relcone_config,
                    l.s4_relcone_copy,
                    l.s4_relcone_sync,
                    l.s4_relcone_ls,
                    l.s4_relcone_mkdir
                ],
                tip: l.s4_relcone_refs_tip
            },
            eventName: 501168
        },
        synology: {
            name: 'Synology',
            header: l.s4_syn_hdr,
            guides: [
                {
                    name: l.s4_syn_backup_hdr,
                    info: l.s4_syn_backup_info,
                    link: 'hyper-backup-setup-guide-for-mega-s4',
                    eventName: 501173
                },
                {
                    name: l.s4_syn_cloud_hdr,
                    icon: 'icon-sync-folder-3d',
                    info: l.s4_syn_cloud_info,
                    link: 'synology-cloud-sync-setup-guide-for-mega-s4',
                    eventName: 501174
                }
            ],
            eventName: 501172
        },
        truenas: {
            name: 'TrueNAS',
            header: l.s4_truenas_header,
            guides: [
                {
                    info: l.s4_truenas_guide_info,
                    link: 'truenas-setup-guide-for-mega-s4',
                    eventName: 501176
                }
            ],
            eventName: 501175
        },
        proxmox: {
            name: 'Proxmox',
            header: l.s4_proxmox_header,
            guides: [
                {
                    name: l.s4_proxmox_guide_hdr,
                    icon: 'icon-data-plus-3d',
                    info: l.s4_proxmox_guide_info,
                    link: 'proxmox-backup-server-setup-guide-for-mega-s4',
                    eventName: 501178
                }
            ],
            eventName: 501177
        },
        cyberduck: {
            name: 'Cyberduck',
            header: l.s4_cyberduck_hdr,
            guides: [
                {
                    info: l.s4_cyberduck_guide_info,
                    link: 'cyberduck-setup-guide-for-mega-s4',
                    eventName: 501180
                }
            ],
            eventName: 501179
        },
        s3browser: {
            name: 'S3 Browser',
            header: l.s4_s3_browser_hdr,
            guides: [
                {
                    info: l.s4_s3_browser_guide_info,
                    link: 's3-browser-setup-guide-for-mega-s4',
                    eventName: 501182
                }
            ],
            eventName: 501181
        },
        qnap: {
            name: 'QNAP',
            guides: [
                {
                    info: l.s4_qnap_guide_info,
                    link: 'qnap-hybridmount-and-hbs-setup-guide-for-mega-s4',
                    eventName: 501184
                }
            ],
            eventName: 501183
        },
        anchorpoint: {
            name: 'Anchorpoint',
            guides: [
                {
                    info: l.s4_anchorpoint_guide_info,
                    link: 'mega-s4-for-git-lfs-with-anchorpoint',
                    eventName: 501186
                }
            ],
            eventName: 501185
        },
        awscli: {
            name: 'AWS CLI',
            header: l.s4_aws_cli_hdr,
            guides: [
                {
                    info: l.s4_aws_cli_guide_info,
                    link: 'aws-cli-setup-guide-for-mega-s4',
                    eventName: 501188
                }
            ],
            eventName: 501187
        },
        minio: {
            name: 'MinIO',
            header: l.s4_minio_hdr,
            info: `${l.s4_minio_guide_info} ${l.s4_minio_guide_info2}`,
            guides: [
                {
                    info: l.s4_minio_guide_info,
                    link: 'miniio-client-setup-guide-for-mega-s4',
                    eventName: 501190
                }
            ],
            eventName: 501189
        },
        terraform: {
            name: 'Terraform',
            guides: [
                {
                    info: l.s4_terraform_guide_info,
                    link: 'terraform-setup-guide-for-mega-s4',
                    eventName: 501192
                }
            ],
            eventName: 501191
        },
        bunny: {
            name: 'Bunny CDN',
            guides: [
                {
                    info: l.s4_bunny_cdn_guide_info,
                    link: 'bunnycdn-setup-guide-for-mega-s4',
                    eventName: 501194
                }
            ],
            eventName: 501193
        }
    };

    const integrations = [
        {
            name: l.s4_onbd_backup_hdr,
            icon: 'icon-cloud-up-arrow-3d',
            services: [
                'rclone',
                'synology',
                'truenas',
                'proxmox'
            ]
        },
        {
            name: l.s4_onbd_manage_hdr,
            icon: 'icon-folder-switched-3d',
            services: [
                'cyberduck',
                's3browser',
                'qnap',
                'anchorpoint'
            ]
        },
        {
            name: l.s4_onbd_dev_hdr,
            icon: 'icon-data-3d',
            services: [
                'awscli',
                'minio',
                'terraform',
                'bunny'
            ]
        }
    ];

    class S4SetupDialog extends S4PagedDialog {
        constructor(name) {
            super(name, $('.s4-setup-dialog', '.mega-dialog-container'), 6);

            this.bucket = null;
            this.container = null;
            this.key = null;

            this.$backBtn = $('.back', this.$dialogContainer);
            this.$intNode = $('.integrations', this.$dialogContainer);
            this.$openS4Btn = $('.open-s4', this.$dialogContainer);
            this.$manageBucketBtn = $('.manage-bucket-settings', this.$dialogContainer);
            this.$progressLabel = $('span', this.$dialogProgress);
            this.$serviceNode = $('.service-body', this.$dialogContainer);
            this.$sidePane = $('.side-pane', this.$dialogContainer);
            this.$skipSetupBtn = $('.skip-setup', this.$dialogContainer);
            this.$scrollArea = $('.scroll-area', this.$dialogContainer);

            this.$bucketInput = new mega.ui.MegaInputs(
                $('input[name=bucket-name]', this.$steps[2]),
                {onShowError: true}
            );
            this.$keyInput = new mega.ui.MegaInputs(
                $('input[name=key-name-input]', this.$steps[3]),
                {onShowError: true}
            );
        }

        show() {
            this._clear();
            if (!(this.container = s4.utils.getContainersList()[0])) {
                return false;
            }

            super.show();
        }

        unbindEvents() {
            super.unbindEvents();

            const {
                $backBtn,
                $bucketInput,
                $keyInput,
                $manageBucketBtn,
                $openS4Btn,
                $skipSetupBtn,
                $steps
            } = this;

            $backBtn.unbind('click.s4dlg');
            $bucketInput.$input.unbind('keydown.s4dlg input.s4dlg');
            $keyInput.$input.unbind('keydown.s4dlg input.s4dlg');
            $manageBucketBtn.unbind('click.s4dlg');
            $openS4Btn.unbind('click.s4dlg');
            $skipSetupBtn.unbind('click.s4dlg');
            $('button.download-key', $steps[4]).unbind('click.s4dlg');
        }

        bindEvents() {
            super.bindEvents();

            const {
                $backBtn,
                $bucketInput,
                $dialogProgress,
                $keyInput,
                $manageBucketBtn,
                $openS4Btn,
                $skipSetupBtn,
                $steps
            } = this;

            // Step 1
            $skipSetupBtn.rebind('click.s4dlg', () => {
                eventlog(501167);
                this.destroy();
            });

            // Step 2 events
            $bucketInput.$input.rebind('keydown.s4dlg', (e) => {
                if (e.which === 13) {
                    $dialogProgress.trigger('click');
                }
            });

            $bucketInput.$input.rebind('input.s4dlg', () => {
                this._validateBucket();
            });

            // Step 3 events
            $keyInput.$input.rebind('keydown.s4dlg', (e) => {
                if (e.which === 13) {
                    $dialogProgress.trigger('click');
                }
            });
            $keyInput.$input.rebind('input.s4dlg', () => {
                this._validateKey();
            });

            // Step 4 events
            $('.keys-table button.copy', this.$dialogContainer).rebind('click.s4dlg', e => {
                const { key } = this;
                const dataKey = $(e.currentTarget).attr('data-key');
                const { [dataKey]: value } = key;
                const message = dataKey === 'ak' ?
                    l.s4_access_key_copied_toast_txt : l.s4_secret_key_copied_toast_txt;

                copyToClipboard(value, message, 'recoveryKey');
            });

            $('button.toggle-vis', this.$dialogContainer).rebind('click.s4dlg', e => {
                const $this = $('i', e.currentTarget);

                if ($this.hasClass('icon-eye-reveal')) {
                    $('.toggle-vis i', this.$dialogContainer)
                        .removeClass('icon-eye-reveal').addClass('icon-eye-hidden');
                    $('.secret-key-value', this.$dialogContainer).attr('type', 'text');
                }
                else {
                    $('.toggle-vis i', this.$dialogContainer)
                        .removeClass('icon-eye-hidden').addClass('icon-eye-reveal');
                    $('.secret-key-value', this.$dialogContainer).attr('type', 'password');
                }
            });

            $('button.download-key', this.$dialogContainer).rebind('click.s4dlg', () => {
                // Download key btn
                eventlog(500596);

                this._download();
            });

            // Step 5
            $('.info-box.help a', $steps[5]).rebind('click.s4dlg', () => {
                // Help centre lnk
                eventlog(500599);
            });

            // Step 6
            $backBtn.rebind('click.s4dlg', () => {
                this.steps(this.step - 1);
                eventlog(501169);
            });

            $openS4Btn.rebind('click.s4dlg', () => {
                this.destroy();
                M.openFolder(this.container.h, true).then(() => eventlog(501166)).catch(dump);
            });

            $manageBucketBtn.rebind('click.s4dlg', () => {
                // Managed bucket btn
                eventlog(500598);

                const n = M.getNodeByHandle(this.bucket);

                if (n) {
                    M.openFolder(n.h).then(() => {
                        s4.ui.showDialog(s4.buckets.dialogs.settings, n);
                    });
                }
            });

            $('.expandable-area .min', $steps[6]).rebind('click.s4dlg', (ev) => {
                const $cn = $(ev.currentTarget).closest('.expandable-area');
                $cn[$cn.hasClass('active') ? 'removeClass' : 'addClass']('active');
                initPerfectScrollbar(this.$scrollArea);
            });
        }

        step1(finalise) {
            if (finalise) {
                this.$sidePane.removeClass('intro');
                this.$skipSetupBtn.addClass('hidden');

                // Start setup btn
                eventlog(500572);

                return Promise.resolve();
            }

            this.$progressLabel.text(l.s4_setup_s4_btn);
            this._switchStep();

            return Promise.resolve();
        }

        async step2(finalise) {
            if (finalise) {
                // Create bucket btn
                eventlog(500597);

                this.stepLocked = true;
                const n = this.$bucketInput.$input.val().trim();

                if (this._getBucketNameError()) {
                    logger.error(`Incorrect bucket name: ${n}`);
                    return;
                }

                this.bucket = await s4.kernel.bucket.create(this.container, n).catch(tell);
                this.stepLocked = false;

                return;
            }

            $(`.nav-step-${ this.step - 1 }`, this.$sidePane).addClass('complete');
            this.$progressLabel.text(l[158]);
            this._switchStep();

            this._validateBucket();
            delay('s4.bucketInput.focus', () => {
                this.$bucketInput.$input.focus();
            }, 50);
        }

        async step3(finalise) {
            if (finalise) {
                // Create key btn
                eventlog(500595);

                const n = this.$keyInput.$input.val().trim();
                this.stepLocked = true;

                if (this._getKeyNameError()) {
                    logger.error(`Incorrect key name: ${n}`);
                    return;
                }

                this.key = await s4.kernel.keys.create(this.container, null, n).catch(tell);
                this.key.n = n;
                this.stepLocked = false;

                return;
            }

            $(`.nav-step-${ this.step - 1 }`, this.$sidePane).addClass('complete');
            this.$progressLabel.text(l[158]);
            this._switchStep();

            this._validateKey();
            delay('s4.keyInput.focus', () => {
                this.$keyInput.$input.focus();
            }, 50);
        }

        async step4(finalise) {
            if (finalise) {
                return;
            }

            if (this.key) {
                const {ak, sk} = this.key;

                $('.access-key-value', this.$dialogContainer).text(ak);
                $('.secret-key-value', this.$dialogContainer).val(sk).attr('type', 'password');
                this.$progressLabel.text(l[556]);
                this.$dialogProgress.removeClass('disabled');
                this._switchStep();
            }
        }

        async step5(finalise) {
            if (finalise) {
                return;
            }

            fmconfig.s4onboarded = 1;

            if (fmconfig.s4skipobd) {
                fmconfig.s4skipobd = undefined;
            }

            $(`.nav-step-${this.step - 1}`, this.$sidePane).addClass('complete');
            $(`.nav-step-${this.step}`, this.$sidePane).removeClass('complete');
            this.$sidePane.addClass('complete');
            this.$dialogProgress.addClass('hidden');
            this.$backBtn.addClass('hidden');
            this.$openS4Btn.removeClass('hidden');
            this.$intNode.text('');

            if (this.bucket) {
                this.$manageBucketBtn.removeClass('hidden');
            }

            for (const int of integrations) {
                this._renderIntegration(int);
            }

            this._switchStep();
        }

        async step6(finalise) {
            if (finalise) {
                // Done btn at the last step
                eventlog(501163);
                return;
            }

            $(`.nav-step-${this.step - 1}`, this.$sidePane).addClass('complete');
            this.$backBtn.removeClass('hidden');
            this.$dialogProgress.removeClass('hidden disabled');
            this.$progressLabel.text(l[726]);
            this.$openS4Btn.addClass('hidden');
            this.$manageBucketBtn.addClass('hidden');

            this._switchStep();
        }

        _renderIntegration(int) {
            const [wrapper] = this.$intNode;
            const {name, icon, services: serviceNames} = int;

            if (!wrapper) {
                return false;
            }

            const col = ce('div', wrapper, {class: 'col'});
            let node = ce('div', col, {class: 'header'});
            ce('span', node).textContent = name;
            ce('img', node, {
                alt: name,
                src: `${staticpath}images/mega/icons-3d/${icon}.png`
            });

            node = ce('div', col, {class: 'body'});

            for (const srv of serviceNames) {
                const service = services[srv];
                const {name, eventName} = service;

                if (!service) {
                    continue;
                }

                const btn = ce('button', node);

                ce('span', btn).textContent = name;
                ce('i', btn, {class: 'sprite-fm-mono icon-chevron-right-thin-outline'});

                btn.addEventListener('click', () => {
                    eventlog(eventName);
                    this._renderService(service);
                    this.steps(6);
                });
            }
        }

        _renderService(service) {
            let [wrapper] = this.$serviceNode;

            if (!wrapper) {
                return false;
            }

            const {name, header, guides = [], ref, info} = service;
            const [cn] = this.$steps[6];
            const refNode = cn.querySelector('.reference');

            s4.utils.renderEndpointsData($(cn));
            cn.querySelector('header h2').textContent = header || name;
            refNode.classList.add('hidden');

            if (ref) {
                const content = refNode.querySelector('.content.max');
                const {items, tip} = ref;
                content.textContent = '';
                refNode.classList.remove('hidden');

                const node = ce('ul', content);

                for (const item of items) {
                    ce('li', node).textContent = item;
                }

                if (tip) {
                    ce('p', content, {class: 'secondary'}).textContent = tip;
                }
            }

            wrapper.textContent = '';

            if (info) {
                ce('p', wrapper).textContent = info;
            }

            if (guides.length > 1) {
                ce('h3', wrapper, {class: 'no-pad'}).textContent = l.s4_onbd_guides_hdr;
            }
            wrapper = ce('div', wrapper, {class: 'service-info'});

            for (const guide of guides) {
                const col = ce('div', wrapper, {class: 'col'});
                const {
                    name = l.s4_guide_header.replace(/%1|\[B]/g, service.name),
                    icon,
                    info,
                    link,
                    eventName
                } = guide;

                ce('img', col, {
                    alt: name,
                    src: `${staticpath}images/mega/icons-3d/${icon || 'icon-cloud-up-arrow-3d'}.png`
                });
                ce('h4', col).textContent = name;
                ce('p', col, {class: 'secondary'}).append(
                    parseHTML(info)
                );

                const btn = ce('a', col, {
                    class: 'clickurl',
                    href: `https://help.mega.io/megas4/setup-guides/${link}`,
                    target: '_blank'
                });

                btn.addEventListener('click', () => eventlog(eventName));

                ce('span', btn).textContent = l[20556];
                ce('i', btn, {class: 'sprite-fm-mono icon-arrow-right-thin-solid'});
            }
        }

        _switchStep() {
            $('.content-pane .steps', this.$dialogContainer).addClass('hidden');
            $(`.nav-step-${ this.step }`, this.$sidePane).addClass('active');

            this.$scrollArea.scrollTop(0);
            this.$steps[this.step].removeClass('hidden');
            initPerfectScrollbar(this.$scrollArea);
        }

        _toggleButtonState(errorMsg) {
            if (errorMsg) {
                this.$dialogProgress.addClass('disabled');
            }
            else {
                this.$dialogProgress.removeClass('disabled');
            }
        }

        _clear() {
            this.bucket = null;
            this.container = null;
            this.key = null;

            this.$bucketInput.$input.val('');
            this.$keyInput.$input.val('');
            $('.secret-key-value', this.$steps[4]).val('').attr('type', 'password');
            $('.icon-eye-hidden', this.$steps[4]).addClass('icon-eye-reveal').removeClass('icon-eye-hidden');
            $('.nav-step', this.$sidePane).removeClass('active complete');
            this.$sidePane.addClass('intro').removeClass('complete');
            this.$backBtn.addClass('hidden');
            this.$dialogProgress.removeClass('disabled hidden');
            this.$manageBucketBtn.addClass('hidden');
            this.$openS4Btn.addClass('hidden');
            this.$skipSetupBtn.removeClass('hidden');
        }

        _validateBucket() {
            const errorMsg = this._getBucketNameError();

            this._toggleButtonState(errorMsg);
            this._showErrorMessage(
                this.$bucketInput,
                errorMsg === l.s4_enter_bkt_name ? false : errorMsg
            );
        }

        _getBucketNameError() {
            const name = this.$bucketInput.$input.val();

            if (!name) {
                return l.s4_enter_bkt_name;
            }

            if (!s4.kernel.isValidBucketName(name)) {
                return l.s4_invalid_bucket_name;
            }

            if (duplicated(name, this.container)) {
                return l[23219];
            }
        }

        _validateKey() {
            const errorMsg = this._getKeyNameError();

            this._toggleButtonState(errorMsg);
            this._showErrorMessage(
                this.$keyInput,
                errorMsg === l.s4_key_empty_error ? false : errorMsg
            );
        }

        _getKeyNameError() {
            return s4.keys.handlers.validateName(this.$keyInput.$input.val());
        }

        _showErrorMessage(megaInput, errorMsg) {
            if (errorMsg) {
                megaInput.showError(errorMsg);
            }
            else {
                megaInput.hideError();
            }
        }

        async _download() {
            const {n, ak, sk} = this.key;
            await M.saveAs(exportKey(ak, sk), M.getSafeName(`credentials-${n}`));
            showToast('s4AccessKey', l.s4_key_downloaded_toast_txt);
        }
    }

    const dialogs = Object.create(null);
    lazy(dialogs, 'setup', () => new S4SetupDialog('s4-managed-setup'));

    return freeze({dialogs, S4SetupDialog});
});
