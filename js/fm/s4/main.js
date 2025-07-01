/** @property s4.main */
lazy(s4, 'main', () => {
    'use strict';

    const ce = (n, t, a) => mCreateElement(n, a, t);
    const rd = (u, p, e) => {
        mega.redirect(u, p, false, false, false);
        eventlog(e);
    };
    const fmNode = document.querySelector('.pm-main > .fm-right-files-block');

    const renderActivation = () => {
        const canEnable = u_attr.p && !pro.filter.simple.miniPlans.has(u_attr.p) || u_attr.pf;
        const domNode = fmNode.querySelector('.fm-activate-section') || ce(
            'div', fmNode, { class: 'fm-empty-section s4 fm-activate-section hidden' }
        );
        domNode.textContent = '';

        const bodyNode = ce('div', domNode, { class: 'body' });

        // Page header
        ce('h1', bodyNode).textContent = l.s4_get_started;

        // Top banner
        let wrapNode = ce('div', bodyNode, { class: 'grid banner' });
        let node = ce('div', wrapNode);

        // Banner info for Pro/Free plans
        ce('h3', node).textContent = canEnable ?
            l.s4_activation_enable : l.s4_activation_banner_header;
        node = ce('p', node, { class: 'text-md-size' });
        ce('span', node).textContent = l.s4_activation_banner_info;
        ce('b', node).textContent =  canEnable ?
            l.s4_activation_included_info : l.s4_activation_upgrade_info;

        node = new MegaButton({
            parentNode: node,
            text: canEnable ? l.s4_activation_enable : l.explore_now_btn,
            componentClassname: 'primary semibold theme-dark-forced',
            onClick: () => {
                if (!canEnable) {
                    rd('mega.io', 'objectstorage', 500858);
                    return false;
                }
                eventlog(500857);
                loadingDialog.show('activates4.s4a');
                api.send({ a: 's4a' })
                    .then(() => location.reload())
                    .catch(tell)
                    .finally(() => loadingDialog.hide('activates4.s4a'));
            }
        });

        node = ce('div', wrapNode);
        ce('i', node, { class: 's4-icon icon-glass' });

        // Terms
        if (canEnable) {
            node = ce('p', bodyNode, { class: 'terms' }).append(parseHTML(l.s4_activation_terms));
        }

        // Learn more sub-section
        ce('h3', bodyNode).textContent = l.s4_activation_learn_more;
        wrapNode = ce('div', bodyNode, { class: 'grid bg' });
        node = ce('div', wrapNode, { class: 'col' });

        ce('b', node, { class: 'text-md-size' }).textContent = l.s4_activation_specs_header;
        ce('p', node).textContent = l.s4_activation_specs_info;

        node = ce('div', node);
        node = new MegaLink({
            componentClassname: 'text-icon',
            parentNode: node,
            rightIcon: 'sprite-fm-mono icon-arrow-left-thin-solid rotate-180 primary-color',
            rightIconSize: 24,
            text: l.read_guide_btn,
            onClick: () => rd('github.com', 'meganz/s4-specs', 500855)
        });

        node = ce('div', wrapNode, { class: 'col' });

        ce('b', node, { class: 'text-md-size' }).textContent = l.s4_activation_help_header;
        ce('p', node).textContent = l.s4_activation_help_info;

        node = ce('div', node);
        node = new MegaLink({
            componentClassname: 'text-icon',
            parentNode: node,
            rightIcon: 'sprite-fm-mono icon-arrow-left-thin-solid rotate-180 primary-color',
            rightIconSize: 24,
            text: l[8742],
            onClick: () => rd('help.mega.io', 'megas4', 500856)
        });

        // Tools sub-section
        ce('h3', bodyNode).textContent = l.s4_activation_tools_header;
        ce('p', bodyNode).append(parseHTML(l.s4_activation_tools_info));
        wrapNode = ce('div', bodyNode, { class: 'grid logos' });

        node = new MegaLink({
            componentClassname: 'col',
            icon: 's4-icon icon-rclone',
            parentNode: wrapNode,
            type: 'icon',
            onClick: () => rd(
                'help.mega.io',
                'megas4/setup-guides/rclone-setup-guide-for-mega-s4',
                500850
            )
        });

        node = new MegaLink({
            componentClassname: 'col',
            icon: 's4-icon icon-cyberduck',
            parentNode: wrapNode,
            type: 'icon',
            onClick: () => rd(
                'help.mega.io',
                'megas4/setup-guides/cyberduck-setup-guide-for-mega-s4',
                500851
            )
        });

        node = new MegaLink({
            componentClassname: 'col',
            icon: 's4-icon icon-s3browser',
            parentNode: wrapNode,
            type: 'icon',
            onClick: () => rd(
                'help.mega.io',
                'megas4/setup-guides/s3-browser-setup-guide-for-mega-s4',
                500852
            )
        });

        // Footer
        node = ce('div', bodyNode, { class: 'footer' });
        node = new MegaLink({
            componentClassname: 'semibold primary-link',
            parentNode: node,
            text: l.s4_activation_providers,
            type: 'text',
            onClick: () => rd('help.mega.io', 'megas4/setup-guides', 500853)
        });

        node = new PerfectScrollbar(domNode);
        clickURLs();
        if (mega.ui.mInfoPanel) {
            mega.ui.mInfoPanel.hide();
        }
        domNode.classList.remove('hidden');
        domNode.scrollTop = 0;
    };

    return freeze({
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

            if (!u_attr.b) {
                renderActivation();
                eventlog(500854);
                return;
            }

            return loadSubPage('fm');
        },
    });
});
