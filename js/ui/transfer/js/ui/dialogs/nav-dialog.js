/** @property T.ui.langDialog */
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

    // Close
    cn.addEventListener('click', (e) => {
        if (e.target === cn || e.target.closest('button')) {
            T.ui.dialog.hide(cn);
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
