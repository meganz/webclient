/** @property T.ui.errorSubpage */
lazy(T.ui, 'errorSubpage', () => {
    'use strict';

    T.ui.appendTemplate('js_ui_subpages_error', T.ui.page.content);

    const cn = T.ui.page.content.querySelector('.js-error-subpage');
    const errors = freeze({
        '-8': {
            h: l.transferit_error_expired_hdr,
            p: ''
        },
        '-9': {
            h: l.transferit_error_cant_find_hdr,
            p: l.transferit_error_unknown_rsn,
            '4': l.transferit_error_susp4repeat_rsn,
            '7': l.transferit_error_susp4tos_rsn
        },
        '-16': {
            h: l.transferit_error_na_transfer_hdr,
            p: l.transferit_error_copyright_rsn
        },
        '-19': {
            h: l.transferit_error_na_transfer_hdr,
            p: l.transferit_error_acc_limit_rsn
        },
    });

    // Init Get startes btns
    for (const elm of cn.querySelectorAll('.js-try-now')) {
        elm.addEventListener('click', () => T.ui.loadPage('start'));
    }

    return freeze({
        async init(ex, {u}) {
            // Set header/msg
            const info = errors[ex | 0] || errors[-9];

            cn.querySelector('h1').textContent = info.h;
            cn.querySelector('p').textContent = info[u] || info.p;

            // Show page, hide footer
            T.ui.page.showSection(cn, null, true);
            document.querySelector('.page-footer .js-subpage-footer')
                .classList.add('hidden');
        }
    });
});
