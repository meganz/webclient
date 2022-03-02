/** @function window.csp */
lazy(self, 'csp', () => {
    'use strict';

    let value;
    const tag = 'cookies-dialog';
    const storage = localStorage;
    const pid = Math.random().toString(28).slice(-6);

    // Cookie settings.
    const CS_ESSENT = 1 << 0;
    const CS_PREFER = 1 << 1;
    const CS_ANALYT = 1 << 2;
    const CS_ADVERT = 1 << 3;
    const CS_THIRDP = 1 << 4;

    const bitdef = {
        cs: {s: CS_ESSENT, r: CS_PREFER, n: CS_ANALYT, d: CS_ADVERT, h: CS_THIRDP}
    };

    const sgValue = async(newValue, byUser) => {
        const u_handle = mega.user;

        if (d) {
            console.group('csp.sgValue(%s, %s)', newValue, byUser, u_handle);
            console.trace();
        }

        if ((newValue >>>= 0) & CS_ESSENT) {

            if (u_handle) {
                delete storage.csp;

                const srv = await Promise.resolve(mega.attr.get(u_handle, 'csp', -2, 1)).catch(nop) >>> 0;
                if (!byUser && srv) {
                    value = (storage['csp.' + u_handle] || value) >>> 0;
                    if (value !== srv) {
                        // different settings, ask to reconfigure.
                        onIdle(() => csp.init());
                    }
                    if (d) {
                        console.info('csp.sgValue sync', value, srv);
                        console.groupEnd();
                    }
                    return;
                }

                storage['csp.' + u_handle] = newValue;
                const res = srv === newValue ? -srv : mega.attr.set('csp', newValue, -2, 1);

                if (d) {
                    console.info('csp.sgValue-set result', res);
                    console.groupEnd();
                }
                return res;
            }

            storage.csp = newValue;
        }

        const res = u_handle && mega.attr.get(u_handle, 'csp', -2, 1) || storage.csp;

        if (d) {
            console.info('csp.sgValue-get result', res);
            console.groupEnd();
        }
        return res;
    };

    const canShowDialog = promisify(resolve => {
        const exclude = {
            download: 1, file: 1, folder: 1,
            megadrop: 1
        };

        (function check(page) {
            if (pfid || exclude[String(page).split('/')[0]]) {
                return mBroadcaster.once('pagechange', check);
            }
            if ($.msgDialog) {
                return mBroadcaster.once('msgdialog-closed', SoonFc(200, () => check(window.page)));
            }
            resolve();
        })(window.page);
    });

    mBroadcaster.addListener('login2', () => sgValue(value).dump('csp.login'));
    mBroadcaster.addListener('logout', () => sgValue(value).dump('csp.logout'));

    return Object.freeze({
        init: mutex(tag, async(resolve) => {

            if (d) {
                console.group('csp.init invoked...', value);
                console.trace();
            }

            let shown = false;
            const val = await sgValue().catch(nop) >>> 0;
            const chg = value && mega.user && value !== val ? value : false;

            value = val;
            if (chg || !csp.has('essential')) {
                await canShowDialog();
                await csp.showCookiesDialog(chg);
                shown = true;
            }

            if (d) {
                console.info('csp.init [leaving]', value, shown);
                console.groupEnd();
            }

            resolve(shown);
        }),

        reset: async() => {
            value = null;
            delete storage.csp;
            if (mega.user) {
                await mega.attr.remove('csp', -2, 1).catch(nop);
            }
            return csp.init();
        },

        trigger: async() => {
            if (!storage.csp) {
                value = 0;
                storage.csp = CS_ESSENT;
            }
            const shown = await csp.init();
            console.assert(!shown);

            return csp.showCookiesDialog('step2');
        },

        has: (opt, ns = 'cs') => {
            if (d) {
                console.assert(value !== undefined, 'must have been initialized.');
            }
            return value & bitdef[ns][opt[1]];
        },

        showCookiesDialog: promisify((resolve, reject, step, chg) => {
            const banner = document.querySelector('.cookie-banner');
            const dialog = document.querySelector('.cookie-dialog');

            if (!banner || !dialog) {
                return reject(tag);
            }

            if (step === 'nova') {
                value = 0;
                step = null;
            }

            const $banner = $(banner);
            const $dialog = $(dialog);
            const first = !csp.has('essential');
            const qsa = (sel, cb) => dialog.querySelectorAll(sel).forEach(cb);

            const forEachCell = (cb, p = '') => qsa('.settings-cell' + p, cell => {
                const toggle = cell.querySelector('.mega-switch');

                if (toggle) {
                    const row = cell.parentNode;
                    const type = row.dataset.type;

                    cb(type, toggle, cell, row);
                }
            });

            const showBlock = (step) => {
                const qsa = (sel, cb) => dialog.querySelectorAll(sel).forEach(cb);
                const all = (sel = '.current') => {
                    sel += ' .mega-switch:not(.all)';
                    const total = dialog.querySelectorAll(sel).length;

                    if (total) {
                        const active = dialog.querySelectorAll(`${sel}.toggle-on`).length;

                        const toggleSwitch = dialog.querySelector(`${sel.split(':')[0]}.all`);
                        toggleSwitch.classList[total === active ? 'add' : 'remove']('toggle-on');
                        toggleSwitch.setAttribute('aria-checked', total === active ? 'true' : 'false');
                    }
                };

                if (step === 'step1') {

                    if ($.dialog === tag) {

                        closeDialog();
                    }

                    banner.classList.remove('hidden');
                    all('.saved');
                    all('.current');

                    return false;
                }

                banner.classList.add('hidden');
                M.safeShowDialog(tag, $dialog);

                if (chg) {
                    dialog.classList.add('active-saved-cookies');
                    dialog.querySelector('.save-settings').classList.add('hidden');
                    dialog.querySelector('.close-settings').classList.add('hidden');
                    dialog.querySelector('.use-saved-settings').classList.remove('hidden');
                    dialog.querySelector('.use-current-settings').classList.remove('hidden');

                    forEachCell((type, toggle) => {
                        toggle.classList[chg & bitdef.cs[type[1]] ? 'add' : 'remove']('toggle-on');
                    }, '.saved');

                    if (is_mobile) {
                        const $tabs = $('.settings-tab', dialog);

                        $tabs.rebind('click.tabs', function() {
                            $tabs.removeClass('active');
                            this.classList.add('active');

                            if (this.dataset.type === 'saved') {
                                qsa('.settings-cell.current', e => e.classList.add('hidden'));
                                qsa('.settings-cell.saved', e => e.classList.remove('hidden'));

                                dialog.querySelector('.use-current-settings').classList.add('hidden');
                                dialog.querySelector('.use-saved-settings').classList.remove('hidden');
                            }
                            else {
                                qsa('.settings-cell.saved', e => e.classList.add('hidden'));
                                qsa('.settings-cell.current', e => e.classList.remove('hidden'));

                                dialog.querySelector('.use-saved-settings').classList.add('hidden');
                                dialog.querySelector('.use-current-settings').classList.remove('hidden');
                            }
                        });

                        dialog.querySelector('.use-current-settings').classList.add('positive');
                        $tabs.filter('[data-type="current"]').trigger('click');
                    }
                }
                else {
                    dialog.classList.remove('active-saved-cookies');
                    dialog.querySelector('.save-settings').classList.remove('hidden');
                    dialog.querySelector('.close-settings').classList.remove('hidden');
                    dialog.querySelector('.use-saved-settings').classList.add('hidden');
                    dialog.querySelector('.use-current-settings').classList.add('hidden');

                    qsa('.settings-cell.current', e => e.classList.remove('hidden'));

                    if (first) {
                        dialog.querySelector('.close-settings').classList.remove('hidden');
                    }
                    else {
                        dialog.querySelector('.close-settings').classList.add('hidden');
                    }
                }

                $('.mega-switch', dialog).rebind('mousedown.toggle', function() {
                    if (!this.classList.contains('disabled')) {

                        if (this.classList.contains('all')) {
                            const setOn = !this.classList.contains('toggle-on');

                            qsa('.settings-cell.current', cell => {
                                const toggle = cell.querySelector('.mega-switch');

                                if (!toggle.classList.contains('disabled')) {
                                    toggle.classList[setOn ? 'add' : 'remove']('toggle-on');
                                    toggle.setAttribute('aria-checked', setOn ? 'true' : 'false');
                                }
                            });
                        }
                        else {
                            this.classList.toggle('toggle-on');
                            all();
                        }
                    }

                    return false;
                });

                all('.saved');
                all('.current');
                onIdle(clickURLs);

                if (!is_mobile) {

                    const scroll = dialog.querySelector('.scrollable-block');

                    onIdle(() => {
                        scroll.scrollTop = 0;
                        Ps[scroll.classList.contains('ps') ? 'update' : 'initialize'](scroll);
                    });
                }

                return false;
            };

            const save = async(ev) => {
                onIdle(() => {

                    if ($.dialog === tag) {

                        closeDialog();
                    }
                    banner.classList.add('hidden');
                });
                $('.fm-dialog-overlay').off('click.csp');
                $('*', $dialog.off()).off();
                delay.cancel('csp.timer');

                value = CS_ESSENT;
                forEachCell((type, toggle) => {
                    if (toggle.classList.contains('toggle-on')) {
                        value |= bitdef.cs[type[1]];
                    }
                    else {
                        value &= ~bitdef.cs[type[1]];
                    }
                }, ev === true ? '.saved' : '.current');

                await sgValue(value, true).catch(dump);
                resolve(value);

                if (!window.buildOlderThan10Days) {
                    const type = ev.type === 'dialog-closed' ? 1 :
                        $(ev.target).hasClass('accept-cookies') ? 2 :
                            ev === -0xBADF ? 3 : first ? 4 : chg ? 5 : 0;

                    const ctx = is_extension ? 1 :
                        location.host === 'mega.nz' ? 2 :
                            location.host === 'mega.io' ? 3 : location.host;

                    eventlog(99743, JSON.stringify([1, type, value | 0, chg | 0, pid, ctx]));
                }
            };

            value |= CS_ESSENT;

            if (typeof step === 'number') {
                chg = step;
                step = 'step2';
            }

            forEachCell((type, toggle) => toggle.classList[csp.has(type) ? 'add' : 'remove']('toggle-on'), '.current');
            showBlock(step || 'step1');

            $('.accept-cookies', $banner).rebind('click.ac', (ev) => {
                forEachCell((type, toggle) => toggle.classList.add('toggle-on'));
                return save(ev);
            });
            $('.cookie-settings', $banner).rebind('click.ac', () => showBlock('step2'));

            // $('.fm-dialog-overlay').rebind('click.csp', save);
            $('.use-saved-settings', $dialog).rebind('click.ac', () => save(true));
            $('.save-settings, .use-current-settings', $dialog).rebind('click.ac', save);
            $('.close-settings', $dialog).rebind('click.ac', () => showBlock('step1'));
            $('.cookie-settings', $dialog).rebind('click.ac', () => showBlock('step2'));

            console.assert(!delay.has('csp.timer'));
            delay('csp.timer', () => {
                if (!elementIsVisible(banner) && !elementIsVisible(dialog)) {
                    // Some extension did hide the dialog (?)
                    save(-0xBADF);
                }
            }, 7654);
        })
    });
});

mBroadcaster.once('startMega', async() => {
    'use strict';
    if (is_bot) {
        delete window.csp;
        return;
    }
    // csp.init();
});
