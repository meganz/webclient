/** @property T.ui.pageHeader */
lazy(T.ui, 'pageHeader', () => {
    'use strict';

    const cn = document.querySelector('.page-header');
    const avatar = cn.querySelector('.js-avatar');
    const compareBtn = cn.querySelector('.js-compare-btn');
    const dashboardBtn = cn.querySelector('.js-dashboard-btn');
    const featuresBtn = cn.querySelector('.js-features-btn');
    const loginBtn = cn.querySelector('.js-login-btn');
    const menuBtn = cn.querySelector('.js-menu-btn');

    const ce = (n, t, a) => mCreateElement(n, a, t);

    T.ui.setTheme();

    // Logo
    cn.querySelector('.it-logo').addEventListener('click', (e) => {
        e.preventDefault();
        T.ui.loadPage('start');
    });

    // Open page btns
    for (const elm of cn.querySelectorAll('button[data-page]')) {
        elm.addEventListener('click', () => T.ui.loadPage(elm.dataset.page));
    }

    // Login btn
    loginBtn.addEventListener('click', () => T.ui.loginDialog.show());

    // Menu btn
    menuBtn.addEventListener('click', () => T.ui.navDialog.show());
    menuBtn.classList.remove('hidden');

    return freeze({
        get cn() {
            return cn;
        },

        get is_logged() {
            return self.u_sid && self.u_type > 0;
        },

        init() {
            // Show/hide Logged in UI
            if (this.is_logged) {
                compareBtn.classList.add('hidden');
                featuresBtn.classList.add('hidden');
                loginBtn.classList.add('hidden');

                avatar.classList.remove('hidden');
                dashboardBtn.classList.remove('hidden');

                this.updateAccountData(cn);
            }
            else {
                compareBtn.classList.remove('hidden');
                featuresBtn.classList.remove('hidden');
                loginBtn.classList.remove('hidden');

                avatar.classList.add('hidden');
                dashboardBtn.classList.add('hidden');
            }
        },

        emplaceAvatarImage(target, {u}) {
            // @todo _colors[] support / fallback?

            api.req({a: 'uga', ua: '+a', u})
                .then(({result: res}) => {
                    const src = res.length > 5 && mObjectURL([base64_to_ab(res)], 'image/jpeg');
                    if (src) {
                        const img = ce('img', target, {class: 'hidden'});
                        img.onload = () => img.classList.remove('hidden');
                        img.src = src;
                    }
                })
                .catch(dump);
        },

        updateAccountData(target) {
            const u = M.getUser(u_handle);
            const avatarNodes = target.querySelectorAll('.js-avatar');
            const accNode = target.querySelector('.js-acc-info');
            const name = u.fullname || u.name || '';

            if (accNode) {
                accNode.querySelector('.name').textContent = name;
                accNode.querySelector('.email').textContent = u.email;
            }

            const L = name.replace(/^\W+/, '')[0];

            for (let i = avatarNodes.length; i--;) {
                const n = avatarNodes[i];

                this.emplaceAvatarImage(n, u);
                n.querySelector('span').textContent = L;
            }
        }
    });
});
