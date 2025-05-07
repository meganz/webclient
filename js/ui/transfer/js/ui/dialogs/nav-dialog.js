/** @property T.ui.navDialog */
lazy(T.ui, 'navDialog', () => {
    'use strict';

    const cn =  T.ui.dialog.content.querySelector('.js-nav-dialog');
    const accountInfo = cn.querySelector('.js-acc-info');
    const langBtn = cn.querySelector('.js-set-language');
    const loginBtn = cn.querySelector('.js-login-btn');
    const logoutBtn = cn.querySelector('.js-logout-btn');
    const themeRadio = cn.querySelector('input[name="nav-switch-theme"]');

    const logout = () => {
        loadingDialog.show();

        Promise.resolve(self.u_type > 0 ? api.req([{a: 'sml'}]) : -1)
            .then(u_logout)
            .then(() =>  location.reload())
            .catch(tell)
            .finally(() => loadingDialog.hide());
    };

    let vn = cn.querySelector('.version');
    if (vn) {
        tryCatch(() => {
            vn.querySelector('span').textContent = buildVersion.website || 'dev';
            if (buildVersion.commit) {
                const a = vn.querySelector('a');
                a.href += buildVersion.commit;
                a.textContent = `(${buildVersion.commit})`;
            }
        })();
    }
    let verClickCnt = 0;

    // Close or show/hide version
    cn.addEventListener('click', (e) => {
        if (e.target === cn || e.target.closest('button')) {
            T.ui.dialog.hide(cn);
            return false;
        }
        if (e.target.closest('label')) {
            return false;
        }
        if (vn) {
            if (++verClickCnt > 7) {
                vn.classList.remove('hidden');
                vn = null;
            }
            delay('nav-dialog-click', () => {
                verClickCnt = 0;
            }, 350);
        }
    });

    // Theme button
    cn.querySelector('.js-set-theme').addEventListener('click', () => {
        T.ui.setTheme(T.ui.isDarkTheme() ? 1 : 2);
    });

    // Open page btns
    for (const elm of cn.querySelectorAll('button[data-page]')) {
        elm.addEventListener('click', () => T.ui.loadPage(elm.dataset.page));
    }

    // Choose language btn
    langBtn.addEventListener('click', () => {
        T.ui.langDialog.show();
    });

    // Login btn
    loginBtn.addEventListener('click', () => {
        T.ui.loginDialog.show();
    });

    // Logout btn
    logoutBtn.addEventListener('click', logout);

    // Theme switcher
    themeRadio.addEventListener('change', (e) => {
        T.ui.setTheme(e.currentTarget.checked ? 2 : 1);
    });

    return freeze({
        show() {
            if (T.ui.pageHeader.is_logged) {
                accountInfo.classList.remove('hidden');
                logoutBtn.parentElement.classList.remove('hidden');
                loginBtn.classList.add('hidden');

                T.ui.pageHeader.updateAccountData(cn);
            }
            else {
                accountInfo.classList.add('hidden');
                logoutBtn.parentElement.classList.add('hidden');
                loginBtn.classList.remove('hidden');
            }

            langBtn.querySelector('span').textContent = languages[lang][2];
            themeRadio.checked = T.ui.isDarkTheme();

            // Show dialog
            T.ui.dialog.show(cn);
        }
    });
});

mBroadcaster.once('boot_done', tryCatch(() => {
    'use strict';
    let audio;
    mBroadcaster.addListener('it-key-combo', tryCatch((seq) => {
        if (seq === 'SDA') {
            if (!audio) {
                audio = new Audio();
                audio.src = b64decode('aHR0cHM6Ly93d3cubXlpbnN0YW50cy5jb20vbWVkaWEvc291bmRzL2hhZG91a2VuLm1wMw');
                audio.load();
            }
            Promise.resolve(audio.play()).catch(dump);
            T.ui.navDialog.show();
            document.querySelector('.js-nav-dialog .version').classList.remove('hidden');
        }
    }));
}));
