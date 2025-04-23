/** @property T.ui.breadcrumbs */
lazy(T.ui, 'breadcrumbs', () => {
    'use strict';

    const stop = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
    };

    const ce = (n, t, a) => mCreateElement(n, a, t);

    return freeze({
        data: {
            cn: null, // Breadcrumbs container
            fs: 14, // Breadcrumb font-size
            itn: null // Breadcrumbs Item container
        },

        init(h, wrap) {

            if (!wrap || !M.d[h]) {
                return false;
            }

            wrap.textContent = '';

            this.data.cn = ce('nav', wrap, {
                'aria-label': 'Breadcrumbs',
                class: 'it-breadcrumbs'
            });

            this.data.itn = ce('ol', this.data.cn, { class: 'items-body' });

            this.data.fs = parseFloat(window.getComputedStyle(this.data.itn, null)
                .getPropertyValue('font-size'));

            this.render(h);

            // @todo: improve
            window.onresize = () => {
                this.render(h);
            };
        },

        render(h) {
            const items = M.getPath(h);
            const extraItems = [];
            const maxPathLength = this.data.cn.offsetWidth / (this.data.fs / 1.5);
            let currentPathLength = 0;

            this.data.itn.textContent = '';

            for (var i = 0; i < items.length - 1; i++) {
                const n = M.d[items[i]];

                if (!n) {
                    continue;
                }

                const {name} = n;
                currentPathLength += name.length;

                if (i !== 0 && currentPathLength > maxPathLength) {
                    extraItems.push(n);
                }
                else {
                    this.renderItem(n);
                }
            }

            // @todo: improve
            this.renderDropdownItems(extraItems);
            this.renderItem(M.d[items[items.length - 1]], true);
        },

        renderItem(n, icon) {
            const item = ce('li', undefined, { class: 'item' });
            const dn = ce('a', item, { href: '' });

            dn.addEventListener('click', (e) => this.bindItemClick(e, n));

            // Render first link node (item only)
            if (icon) {
                ce('i', dn, { class: 'sprite-it-x16-mono icon-link'});
            }
            else {
                ce('i', dn, { class: 'sprite-it-x16-mono icon-arrow-small-right'});
                ce('span', dn).textContent = n.name || '';
            }

            this.data.itn.prepend(item);
        },

        renderDropdownItems(items) {
            if (!items.length) {
                return false;
            }

            const item = ce('li', this.dropdown, { class: 'item' });
            const dropdown = ce('div', item, { class: 'it-dropdown-body js-dropdown' });
            const dn = ce('a', item, { class: 'js-select-button', href: '' });

            ce('i', dn, { class: 'sprite-it-x16-mono icon-arrow-small-right' });
            ce('span', dn).textContent = '...';

            this.data.itn.prepend(item);

            // Render extra items
            for (var i = 0; i < items.length; i++) {
                const n = items[i];
                const btn = ce('button', dropdown, { class: 'js-option it-radio-label btn-type' });

                ce('span', btn, { class: 'name' }).textContent = n.name || '';
                btn.addEventListener('click', (e) => this.bindItemClick(e, n));
            }

            // Init dropdown
            T.ui.dropdown.init(item);
        },

        bindItemClick(e, n) {
            stop(e);

            if (!n) {
                return false;
            }

            T.ui.viewFilesLayout.init(n.xh, n.h).catch(tell);
        }
    });
});
