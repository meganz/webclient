/** @property s4.main */
lazy(s4, 'main', () => {
    'use strict';

    const ce = (n, t, a) => mCreateElement(n, a, t);
    const rd = (u, p, e) => {
        mega.redirect(u, p, false, false, false);
        eventlog(e);
    };
    const fmNode = document.querySelector('.pm-main > .fm-right-files-block');

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
            eventName: 501168,
            s4PageEvt: 501201
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
            eventName: 501172,
            invLogo: true,
            s4PageEvt: 501202
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
            eventName: 501175,
            s4PageEvt: 501203
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
            eventName: 501177,
            s4PageEvt: 501204
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
            eventName: 501179,
            s4PageEvt: 501205
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
            eventName: 501181,
            s4PageEvt: 501206
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
            eventName: 501183,
            s4PageEvt: 501207
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
            eventName: 501185,
            s4PageEvt: 501208
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
            eventName: 501187,
            s4PageEvt: 501209
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
            eventName: 501189,
            s4PageEvt: 501210
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
            eventName: 501191,
            s4PageEvt: 501211
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
            eventName: 501193,
            s4PageEvt: 501212
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

    const renderActivation = () => {
        // Ignore Started and Basic accounts
        const canEnable = u_attr.p && u_attr.p !== 12 &&
            !pro.filter.simple.miniPlans.has(u_attr.p) || u_attr.pf;
        const domNode = fmNode.querySelector('.fm-activate-section') || ce(
            'div', fmNode, { class: 'fm-empty-section s4 fm-activate-section hidden' }
        );
        domNode.textContent = '';

        const bodyNode = ce('div', domNode, { class: 'body' });

        // Top banner
        let wrapNode = ce('div', bodyNode, { class: 'grid banner' });
        let node = ce('div', wrapNode, { class: 'info' });

        // Banner info for Pro/Free plans
        ce('p', node, { class: 'text-md-size' }).textContent = l.s4_get_started;
        ce('h3', node).textContent = l.s4_activate_bnr_header;
        ce('p', node, { class: 'text-md-size' }).textContent = l.s4_activate_bnr_info;

        // Buttons wrap
        let subNode = ce('div', node);

        node = new MegaButton({
            parentNode: subNode,
            text: canEnable ? l.s4_activation_enable : l[129],
            componentClassname: 'primary semibold theme-dark-forced',
            onClick: () => {
                if (!canEnable) {
                    eventlog(500887);
                    loadSubPage('pro');
                    return false;
                }
                eventlog(500857);
                loadingDialog.show('activates4.s4a');
                api.send({ a: 's4a' })
                    .then(() => location.reload())
                    .catch(ex => {
                        if (ex === EACCESS) {
                            console.error('Error activation S4...', ex);
                            loadSubPage('pro');
                            return;
                        }
                        tell(ex);
                    })
                    .finally(() => loadingDialog.hide('activates4.s4a'));
            }
        });

        if (!canEnable) {
            node = new MegaButton({
                parentNode: subNode,
                text: l.explore_more_btn,
                componentClassname: 'outline no-active semibold theme-dark-forced',
                onClick: () => rd('mega.io', 'objectstorage', 500858)
            });
        }

        node = ce('div', wrapNode);
        ce('i', node, { class: 's4-icon icon-glass' });

        // Terms
        if (canEnable) {
            node = ce('p', bodyNode, { class: 'terms' });
            node.append(parseHTML(`${l.s4_activation_terms}`));
        }

        // Learn more sub-section
        ce('h3', bodyNode).textContent = l.s4_activate_header;
        wrapNode = ce('div', bodyNode, { class: 'grid border' });

        // Products
        for (const int of integrations) {
            const {name, icon, services: serviceNames} = int;
            const col = ce('div', wrapNode, { class: 'col' });

            subNode = ce('div', col, {class: 'header'});
            ce('img', subNode, {
                alt: name,
                src: `${staticpath}images/mega/icons-3d/${icon}.png`
            });
            ce('span', subNode).textContent = name;

            node = ce('div', col, {class: 'body'});

            for (const srv of serviceNames) {
                const service = services[srv];
                const {name, s4PageEvt, guides, invLogo} = service;

                if (!service) {
                    continue;
                }

                const btn = ce('a', node, {
                    class: 'clickurl',
                    href: `https://help.mega.io/megas4/setup-guides/${guides[0].link}`,
                    target: '_blank'
                });

                ce('img', btn, {
                    alt: name,
                    class: invLogo ? 'invert' : '',
                    src: `${staticpath}images/mega/icons/logos/s4/${srv}.png`
                });
                ce('span', btn).textContent = name;
                ce('i', btn, {class: 'sprite-fm-mono icon-chevron-right-thin-outline'});

                btn.addEventListener('click', () => eventlog(s4PageEvt));
            }
        }

        // More guides
        node = ce('div', bodyNode, {class: 'm-guides'});
        subNode = ce('a', node, {
            class: 'clickurl link',
            href: 'https://help.mega.io/megas4/setup-guides',
            target: '_blank'
        });

        subNode.textContent = l.s4_more_guides;
        subNode.addEventListener('click', () => eventlog(500583));

        // Footer
        node = ce('div', bodyNode, {class: 'footer'});
        ce('span', node).textContent = l.s4_activate_learn_lnk;
        ce('a', node, {
            class: 'clickurl link',
            href: 'https://mega.io/objectstorage',
            target: '_blank'
        }).textContent = l[8742];

        if (!fmconfig.s4actupd) {
            fmconfig.s4actupd = 1;
            node = mega.ui.topmenu.getSubNode('s4');

            if (node && (node = node.querySelector('.indicator'))) {
                node.classList.add('hidden');
            }
        }

        // Init
        node = new PerfectScrollbar(domNode);
        clickURLs();
        if (mega.ui.mInfoPanel) {
            mega.ui.mInfoPanel.hide();
        }
        domNode.classList.remove('hidden');
        domNode.scrollTop = 0;
    };

    return freeze({

        get services() {
            return services;
        },

        get integrations() {
            return integrations;
        },

        /**
         * Render S4 section...
         * @memberOf s4.main
         */
        async render() {
            if (u_attr.s4) {
                if (!('kernel' in s4)) {
                    loadingDialog.show('s4-init(C)');
                    await mBroadcaster.when('s4-init(C)')
                        .finally(() => loadingDialog.hide('s4-init(C)'));
                }
                return s4.ui.renderRoot();
            }

            if (page !== 'fm/s4') {
                return loadSubPage('fm/s4');
            }

            if (!fmNode) {
                return loadSubPage('fm');
            }

            // Render S4 activation page
            renderActivation();
            eventlog(500854);
        },
    });
});
