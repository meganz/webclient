/** @property mega.ui.reportAbuse */
lazy(mega.ui, 'reportAbuse', () => {
    'use strict';

    const name = 'report-abuse';
    const ce = (n, t, a) => mCreateElement(n, a, t);
    const {sheet} = mega.ui;
    const buttons = Object.create(null);

    const headers = {
        main: l.report_label,
        copyright: l.report_copyright_hdr,
        illegal: l.report_illegal_hdr,
    };

    const subtitles = {
        main: l.report_main_info,
        copyright: l.report_copyright_info,
        illegal: l.report_illegal_info
    }

    const onClose = () => {
        delete window.disableVideoKeyboardHandler;
        sheet.removeClass(name);
    }

    const getLinks = () => {
        const links = [];

        if (dlid && dlkey) {
            links.push({
                h: dlid,
                link: `${getBaseUrl()}/file/${dlid}#${dlkey}`
            });
        }
        else if (pfid && pfkey) {
            const link = `${getBaseUrl()}/${pfcol ? 'collection' : 'folder'}/${pfid}#${pfkey}`;
            const handles = pfcol ? Object.keys(mega.gallery.albums.grid.timeline.selections) :
                $.selected;

            for (const h of handles) {
                if (h === M.RootID) {
                    continue;
                }
                const n = M.d[h];
                if (n) {
                    links.push({
                        h,
                        link: `${link}/${n.t ? 'folder' : 'file'}/${h}`
                    });
                }
            }

            if (!links.length && M.RootID) {
                links.push({h: M.RootID, link});
            }
        }

        return links;
    };

    const copyLinks = (links) => {
        links = links || getLinks();

        if (!links.length) {
            return false;
        }

        copyToClipboard(links.map(item => item.link).join('\n'));
        mega.ui.toast.show(links.length === 1 ? l[1642] : l.links_copied, 4);
    };

    const actions = {
        main: [
            {
                name: 'continue',
                text: l[507],
                componentClassname: 'slim continue-button',
                disabled: true,
            },
            {
                name: 'close',
                text: l[82],
                componentClassname: 'slim secondary mx-2',
                onClick: () => {
                    onClose();
                    sheet.hide();
                }
            }
        ],
        copyright: [
            {
                name: 'copyright',
                text: l.open_copyright_form,
                componentClassname: 'slim',
                rightIcon: 'sprite-fm-mono icon-external-link-thin-outline inverse-color',
                rightIconSize: 24,
                onClick: () => mega.redirect('mega.io', 'copyright', false, false, false)
            },
            {
                name: 'copy',
                componentClassname: 'slim secondary mx-2',
                onClick: () => copyLinks()
            }
        ],
        illegal: [
            {
                name: 'illegal',
                text: l.email_adressname.replace('%1', 'abuse@mega.io'),
                componentClassname: 'slim',
                onClick: () => {
                    window.location.href = 'mailto:abuse@mega.io';
                }
            },
            {
                name: 'copy',
                componentClassname: 'slim secondary mx-2',
                onClick: () => copyLinks()
            }
        ]
    };

    const renderLinks = () => {
        const links = getLinks();
        const wrapper = ce('div', null, {class: 'links-wrapper'});

        if (!links.length) {
            return wrapper;
        }

        for (const item of links) {
            const n = M.d[item.h];
            if (!n) {
                continue;
            }
            const ln = ce('div', wrapper, {class: 'link-box'});
            const info = ce('div', ln, {class: 'info'});

            ce('i', info, {class: `item-type-icon icon-${fileIcon(n)}-24`});
            ce('name', info, {class: 'name'}).textContent = n.name;

            if (n.t) {
                ce('div', info, {class: 'count'}).textContent =
                    fm_contains(n.tf, n.td, true).replace(/<br\s*\/?>/gi, ' \u00B7 ');
            }

            const inpWrap = ce('div', ln, {class: 'link-wrap'});
            ce('div', inpWrap, {class: 'link-text selectable-txt'}).textContent = item.link;

            MegaButton.factory({
                parentNode: inpWrap,
                dataset: {link: item.link},
                type: 'icon',
                componentClassname: 'text-icon secondary',
                icon: 'sprite-fm-mono icon-copy-thin-outline',
                iconSize: 24,
                onClick: () => copyLinks([item])
            });
        }

        return wrapper;
    };

    const renderContent = (section = 'main') => {
        const content = ce('div', null, {class: 'body'});
        let node = null;

        if (section !== 'main') {
            content.append(renderLinks());
            return content;
        }

        ce('b', content).textContent = l.report_theme_hdr;
        node = ce('div', content, {class: 'sections'});

        const setActive = (ev) => {
            let btn = null;
            let selected = null;

            if ((btn = sheet.domNode.querySelector('.continue-button'))) {
                btn.disabled = false;
                btn.classList.remove('disabled');
            }

            if ((selected = content.querySelector('.section.active'))) {
                selected.classList.remove('active');
            }

            if (ev.currentTarget) {
                ev.currentTarget.domNode.classList.add('active');
            }
        };

        const copyRight = new MegaLink({
            parentNode: node,
            componentClassname: 'section',
            dataset: {section: 'copyright'},
            onClick: (ev) => setActive(ev),
        });

        ce('b', copyRight.domNode).textContent = l.report_copyright_hdr;
        ce('span', copyRight.domNode).textContent = l.report_copyright_tip;

        const illegal = new MegaLink({
            parentNode: node,
            componentClassname: 'section',
            dataset: {section: 'illegal'},
            onClick: (ev) => setActive(ev),
        });

        ce('b', illegal.domNode).textContent = l.report_illegal_hdr;
        ce('span', illegal.domNode).textContent = l.report_illegal_tip;

        return content;
    };

    const renderFooter = (section = 'main') => {
        const footer = ce('div', null, {class: 'flex flex-row-reverse'});
        const links = getLinks();

        const defaultOpts = {
            parentNode: footer,
        };

        for (const opts of actions[section]) {
            if (opts.name === 'copy') {
                if (!links.length) {
                    continue;
                }
                opts.text = links.length === 1 ? l[1394] : l[23625];
            }
            buttons[opts.name] = MegaButton.factory({...defaultOpts, ...opts});
        }

        return footer;
    };

    const showSection = (section = 'main') => {
        sheet.addHeader(headers[section]);
        sheet.addSubTitle(subtitles[section]);
        sheet.addContents([renderContent(section)], true);
        sheet.addFooter({
            slot: [renderFooter(section)]
        }, true);

        if (section === 'main') {
            sheet.clearBackBtn();

            buttons.continue.on('click', () => {
                const active = sheet.domNode.querySelector('.section.active');
                if (active && active.dataset.section) {
                    showSection(active.dataset.section);
                }
            });
        }
        else {
            sheet.addBackBtn(() => showSection());
        }
        sheet.updateScrollbar();
    };

    return freeze({
        show() {
            sheet.addClass(name);
            sheet.show({
                name,
                headerType: 'h3',
                scrollNode: sheet.contentNode,
                showClose: true,
                onClose,
                onShow: () => {
                    showSection();
                    window.disableVideoKeyboardHandler = true;
                }
            });
        },

        hide() {
            sheet.hide();
            onClose();
        }
    });
});
