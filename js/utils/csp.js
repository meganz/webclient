/** @function window.csp */
lazy(self, 'csp', () => {
    'use strict';

    let value;
    const tag = 'cookies-dialog';
    const storage = localStorage;
    const pid = Math.random().toString(28).slice(-6);

    // Cookie settings.
    const CS_ESSENT = 1 << 0;   // 1    Essential cookies
    const CS_PREFER = 1 << 1;   // 2    Preference cookies
    const CS_ANALYT = 1 << 2;   // 4    Analytics cookies
    const CS_ADVERT = 1 << 3;   // 8    Advertisement cookies
    const CS_THIRDP = 1 << 4;   // 16   Thirdparty cookies
    const CS_SETADS = 1 << 5;   // 32   Check if ads cookies are correctly set.

    const bitdef = {
        cs: {s: CS_ESSENT, r: CS_PREFER, n: CS_ANALYT, d: CS_ADVERT, h: CS_THIRDP, e: CS_SETADS},
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

                u_attr['^!csp'] = String(newValue);
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
            download: 1, file: 1, folder: 1, filerequest: 1
        };

        (function check(page) {
            if (!mega.flags.ab_adse && (pfid || exclude[String(page).split('/')[0]])) {
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
            if (mega.flags.ab_adse && !csp.has('setad')) {
                // reset and ask to re-configure per new requirements.
                value = 0;
            }

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
            let banner = document.querySelector('.cookie-banner');
            let dialog = document.querySelector('.cookie-dialog');

            if (!banner || !dialog) {
                return reject(tag);
            }

            if (step === 'nova') {
                value = 0;
                step = null;
            }

            // Show advertisement cookies option if commercials are enabled.
            if (mega.flags.ab_adse) {
                dialog.querySelector('.settings-row.advertisement').classList.remove('hidden');
            }

            let $banner = $(banner);
            let $dialog = $(dialog);
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

            const updateMegaSwitch = (toggleSwitch, isOn) => {
                const iconNode = toggleSwitch.querySelector('.mega-feature-switch');

                toggleSwitch.classList[isOn ? 'add' : 'remove']('toggle-on');
                toggleSwitch.setAttribute('aria-checked', isOn ? 'true' : 'false');

                iconNode.classList.add('sprite-fm-mono-after');
                iconNode.classList.remove('icon-check-after', 'icon-minimise-after');
                iconNode.classList.add(`icon-${isOn ? 'check' : 'minimise'}-after`);
            };

            const showBlock = (step) => {
                const qsa = (sel, cb) => dialog.querySelectorAll(sel).forEach(cb);
                const all = (sel = '.current') => {
                    sel += ' .mega-switch:not(.all)';
                    const total = dialog.querySelectorAll(`.settings-row:not(.hidden) ${sel}`).length;

                    if (total) {
                        const active = dialog.querySelectorAll(`.settings-row:not(.hidden) ${sel}.toggle-on`).length;

                        updateMegaSwitch(dialog.querySelector(`${sel.split(':')[0]}.all`), total === active);
                    }
                };

                if (step === 'step1') {

                    if ($.dialog === tag) {

                        closeDialog();
                    }

                    // Show banner in mobile sheet component
                    if (is_mobile) {
                        mega.ui.overlay.hide();
                        $banner = $banner.clone(true);
                        banner = $banner[0];

                        mega.ui.sheet.show({
                            name: 'cookie-banner',
                            type: 'modalLeft',
                            showClose: false,
                            preventBgClosing: true,
                            contents: [banner]
                        });
                    }

                    banner.classList.remove('hidden');

                    all('.saved');
                    all('.current');

                    if (mega.flags.ab_adse) {
                        banner.querySelector('.info .experiment').classList.remove('hidden');
                    }
                    else {
                        banner.querySelector('.info .current').classList.remove('hidden');
                    }

                    return false;
                }

                banner.classList.add('hidden');

                if (is_mobile) {
                    mega.ui.sheet.hide();
                    $dialog = $dialog.clone(true).removeClass('hidden');
                    dialog = $dialog[0];
                }

                M.safeShowDialog(tag, () => {

                    // Show dialog in mobile overlay component
                    if (is_mobile) {
                        mega.ui.overlay.show({
                            name: 'cookie-settings-overlay',
                            showClose: false,
                            contents: [dialog],
                        });
                        return;
                    }

                    return $dialog;
                });

                // Add settings policy link to the last dialog option, if it does not already have them.
                const $settingsLinks = $('.settings-links.hidden', $dialog).clone().removeClass('hidden');
                const $lastSetting =
                    $('.settings-row:not(.hidden) .settings-cell:not(.current):not(.saved)', $dialog).last();

                if (!$('.settings-links', $lastSetting).length){

                    // It's possible that it was previously added to another option, remove it from all options first.
                    $('.settings-row .settings-links', $dialog).remove();
                    $lastSetting.safeAppend($settingsLinks.prop('outerHTML'));
                }

                if (chg) {
                    dialog.classList.add('active-saved-cookies');
                    dialog.querySelector('.save-settings').classList.add('hidden');
                    dialog.querySelector('.close-settings').classList.add('hidden');
                    dialog.querySelector('.use-saved-settings').classList.remove('hidden');
                    dialog.querySelector('.use-current-settings').classList.remove('hidden');

                    forEachCell((type, toggle) => {
                        updateMegaSwitch(toggle, chg & bitdef.cs[type[1]]);
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
                        const setOn = !this.classList.contains('toggle-on');

                        if (this.classList.contains('all')) {

                            qsa('.settings-cell.current', cell => {
                                const toggle = cell.querySelector('.mega-switch');

                                if (!toggle.classList.contains('disabled')) {
                                    updateMegaSwitch(toggle, setOn);
                                }
                            });
                        }
                        else {
                            updateMegaSwitch(this, setOn);
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

                    if (is_mobile) {
                        mega.ui.overlay.hide();
                        mega.ui.sheet.hide();
                    }
                });
                $('.fm-dialog-overlay').off('click.csp');
                $('*', $dialog.off()).off();
                delay.cancel('csp.timer');

                value = CS_ESSENT;
                forEachCell((type, toggle) => {
                    if (toggle.classList.contains('toggle-on')
                    && !toggle.closest('.settings-row').classList.contains('hidden')) {
                        value |= bitdef.cs[type[1]];
                    }
                    else {
                        value &= ~bitdef.cs[type[1]];
                    }
                }, ev === true ? '.saved' : '.current');

                if (mega.flags.ab_adse) {
                    value |= CS_SETADS;
                }

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

                // If they came from mega.io to directly edit their cookie settings, go back
                // there after saving so they don't remain on the placeholder background page
                if (page === 'cookiedialog') {
                    window.location.replace('https://mega.io/cookie');
                }
                mBroadcaster.sendMessage('csp:settingsSaved');
            };

            value |= CS_ESSENT;

            if (typeof step === 'number') {
                chg = step;
                step = 'step2';
            }

            forEachCell((type, toggle) => updateMegaSwitch(toggle, csp.has(type)), '.current');
            showBlock(step || 'step1');

            $('.accept-cookies', $banner).rebind('click.ac', (ev) => {
                forEachCell((type, toggle) => updateMegaSwitch(toggle, true));
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
        }),

        showCurrentCookies: async function() {

            if (!d) {
                return;
            }

            await csp.init();

            const text = {
                1: 'essential cookies',
                2: 'preferences cookies',
                4: 'analytics/performance cookies',
                8: 'advertisement cookies',
                16: 'thirdparty cookies',
                32: 'set advertisement cookies',
            };

            console.group('Current Cookies: ' + localStorage[`csp.${u_handle}`]);
            for (let i = 1; i <= 32; i *= 2) {
                if (csp.has(text[i])) {
                    console.info(`${i} SET: ${text[i]}`);
                }
                else {
                    console.info(`${i} NOT SET: ${text[i]}`);
                }
            }
            console.groupEnd();
        }
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
