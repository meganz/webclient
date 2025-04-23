/** @property T.ui.langDialog */
lazy(T.ui, 'langDialog', () => {
    'use strict';

    const ce = (n, t, a) => mCreateElement(n, a, t);
    const cn =  T.ui.dialog.content.querySelector('.js-lang-dialog');
    const itemsBody = cn.querySelector('.lang-items');

    const langCodes = [
        'es', 'en', 'br', 'ct', 'fr', 'de', 'ru', 'it', 'ar',
        'nl', 'cn', 'jp', 'kr', 'ro', 'id', 'th', 'vi', 'pl'
    ].sort((codeA, codeB) => {
        return codeA.localeCompare(codeB);
    });

    const setLanguage = (e) => {
        const code = e.currentTarget.dataset.code;
        if (code && code !== lang) {
            localStorage.lang = code;
            location.reload();
        }
    };

    itemsBody.textContent = '';

    // Render lang buttons
    for (const code of langCodes) {
        const lng = languages[code];

        if (!lng[2]) {
            console.warn('Language %s not found...', code);
            continue;
        }

        const btn = ce('button', itemsBody, {
            class: 'it-menu-item simpletip',
            'data-code': code,
            'data-simpletip': lng[1],
            'data-simpletipoffset': '8'
        });
        btn.addEventListener('click', setLanguage);

        ce('span', btn).textContent = lng[2];
        ce('i', btn, { class: 'sprite-it-x24-mono icon-check active-only' });
    }

    // Close btns
    for (const elm of cn.querySelectorAll('.js-close')) {
        elm.addEventListener('click', () => T.ui.dialog.hide(cn));
    }

    return freeze({
        show() {
            // Activate selected language button
            for (const btn of itemsBody.querySelectorAll('button')) {
                if (btn.dataset.code === lang) {
                    btn.classList.add('active');
                }
                else {
                    btn.classList.remove('active');
                }
            }

            // Show dialog
            T.ui.dialog.show(cn);
        }
    });
});
