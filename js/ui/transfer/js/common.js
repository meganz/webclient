Object.defineProperty(T.ui, 'loadPage', {
    async value(page, ev) {
        'use strict';

        loadingDialog.hide();
        page = getCleanSitePath(page);

        if (self.slideshowid) {
            slideshow(null, true);
        }
        if (ev && Object(ev.state).view) {
            queueMicrotask(() => {
                slideshow(ev.state.view);
            });
            return false;
        }
        if (M.hasPendingTransfers()) {
            // confirm with the user moving away will abort transfers
            const res = await T.ui.confirm(l[377]);
            if (res !== true) {
                return false;
            }
            ulmanager.abort(null);
        }
        if (typeof T.ui.sweeper === 'function') {
            tryCatch(T.ui.sweeper)();
            delete T.ui.sweeper;
        }
        tryCatch(() => {
            for (const elm of document.querySelectorAll('.upload-picker')) {

                elm.value = '';
            }
        })();
        let res;
        const [p, s, h] = String(page).split(/[^\w-]/);

        mBroadcaster.sendMessage('it:beforepagechange', page);

        if (p === 't') {
            self.xhid = s;
            res = this.viewFilesLayout.init(s, h);
        }
        else if (p === 'dashboard') {
            res = this.dashboardLayout.init(s);
        }
        else {

            if (ev && ev.type === 'popstate' || ev === 'override') {
                pushHistoryState(true, page);
            }
            else {
                pushHistoryState(page);
            }

            if (p === 'compare') {
                res = this.compareSubpage.init();
            }
            else if (p === 'contact') {
                res = this.contactSubpage.init();
            }
            else if (p === 'faq') {
                res = this.faqSubpage.init();
            }
            else if (p === 'features') {
                res = this.featuresSubpage.init();
            }
            else if (p === 'privacy') {
                res = this.privacySubpage.init();
            }
            else if (p === 'terms') {
                res = this.termsSubpage.init();
            }
            else {
                res = this.addFilesLayout.init();
            }
        }

        return res.then((v) => {
            self.page = page;
            mBroadcaster.sendMessage('it:pagechange', self.page);
            return v;
        });
    }
});

Object.defineProperty(T.ui, 'copyLinkToClipboard', {
    value(xh) {
        'use strict';
        if (xh) {
            if (!String(xh).includes('://')) {
                xh = `${getBaseUrl()}/t/${xh}`;
            }
            dump(xh);
            return copyToClipboard(xh, l[1642], 'sprite-it-x24-mono icon-check accent-mask');
        }
    }
});

Object.defineProperty(T.ui, 'confirm', {
    async value(msg, options) {
        'use strict';
        return T.ui.msgDialog.show({
            title: l[870],
            type: 'warning negative',
            buttons: [l[78], l[79]],
            msg: msg || l[6994],
            ...options
        });
    }
});

Object.defineProperty(T.ui, 'prompt', {
    async value(msg, options) {
        'use strict';
        return T.ui.msgDialog.show({
            msg,
            type: 'prompt',
            buttons: [l[507], l[82]],
            ...options
        });
    }
});

Object.defineProperty(T.ui, 'askPassword', {
    async value(options) {
        'use strict';
        options = typeof options === 'string' ? {currentValue: options} : options;
        return this.prompt(`${l[9071]} ${l[9072]}`, {
            type: 'password',
            title: l[9073],
            buttons: [l[81], l[82]],
            placeholders: [l[9073], l[909]],
            validate(value) {
                return (!value || value === options.currentValue) && l[17920];
            },
            ...options
        });
    }
});

Object.defineProperty(T.ui, 'appendTemplate', {
    value(html, target) {
        'use strict';
        if (pages[html]) {
            html = pages[html];
            delete pages[html];
        }
        html = translate(`${html || ''}`).replace(/{staticpath}/g, staticpath);
        target.append(parseHTML(html));
    }
});

mBroadcaster.once('boot_done', function populate_lx() {
    'use strict';

    if (self.d && self.is_transferit) {
        const loaded = self.l;
        self.l = new Proxy(loaded, {
            get(target, prop) {
                if (self.dstringids) {
                    return `[$${prop}]`;
                }

                return target[prop] || `(missing-$${prop})`;
            }
        });
    }

    l.transferit_agree_tos = escapeHTML(l.transferit_agree_tos)
        .replace('[A]', '<a href="/terms" target="_blank" class="link clickurl">')
        .replace('[/A]', '</a>')
        .replace('[B]', '<b>').replace('[/B]', '</b>');
    l.transferit_uploading_x_of_y = escapeHTML(l.transferit_uploading_x_of_y)
        .replace('[S1]', '<span class="uploaded">').replace('[/S1]', '</span>')
        .replace('[S2]', '<span class="size">').replace('[/S2]', '</span>');
    l.transferit_ftr_tr_speed = escapeHTML(l.transferit_ftr_tr_speed)
        .replace('[S1]', '<h2>').replace('[/S1]', '</h2>')
        .replace('[S2]', '<span>').replace('[/S2]', '</span>');
    l.transferit_x_per_month = escapeHTML(l.transferit_x_per_month)
        .replace('[S]', '<span>').replace('[/S]', '</span>');
    l.transferit_ready_to_use_info = escapeHTML(l.transferit_ready_to_use_info)
        .replace('[S]', '<span>').replace('[/S]', '</span>');
    l.transferit_faq_upd_q1_info2 = escapeHTML(l.transferit_faq_upd_q1_info2)
        .replace(/\[UL]/g, '<ul>').replace(/\[\/UL]/g, '</ul>')
        .replace(/\[LI]/g, '<li>').replace(/\[\/LI]/g, '</li>');
    l.transferit_faq_upd_q1_info3 = escapeHTML(l.transferit_faq_upd_q1_info3)
        .replace(/\[UL]/g, '<ul>').replace(/\[\/UL]/g, '</ul>')
        .replace(/\[LI]/g, '<li>').replace(/\[\/LI]/g, '</li>');
    l.transferit_faq_upd_q4_info1 = escapeHTML(l.transferit_faq_upd_q4_info1)
        .replace('[A]', '<a href="https://mega.nz/register" class="link clickurl" target="_blank">')
        .replace('[/A]', '</a>')
        .replace('[BR]', '<br>');
    l.transferit_cnt_copy_info2 = escapeHTML(l.transferit_cnt_copy_info2)
        .replace('[A1]', '<a href="https://mega.io/takedown" target="_blank" class="clickurl link">')
        .replace('[/A1]', '</a>')
        .replace('[A2]', '<a href="mailto:copyright@transfer.it" target="_blank" class="clickurl link">')
        .replace('[/A2]', '</a>');
});
