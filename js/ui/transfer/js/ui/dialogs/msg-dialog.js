/** @property T.ui.msgDialog */
lazy(T.ui, 'msgDialog', () => {
    'use strict';

    const xid = `xid$${Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)}`;
    const content = T.ui.dialog.content.querySelector('.js-msg-dialog');
    const cancelBtn = content.querySelector('.js-negative-btn');
    const confirmBtn = content.querySelector('.js-positive-btn');
    const closeBtn = content.querySelector('.js-close');

    const stop = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
    };
    let pending = 0;
    const ce = (n, t, a) => mCreateElement(n, a, t);

    lazy(ce, 'type', () => {
        const res = Object.create(null);
        const a = {id: 'msg-dialog-input'};

        lazy(res, 'prompt', () => T.ui.input.create('text', a));
        lazy(res, 'password', () => T.ui.input.create('password', a));
        lazy(res, 'calendar', () => T.ui.input.create('text', {...a, 'data-subtype': 'calendar'}));
        return res;
    });

    const detach = tryCatch(() => {
        if (detach.listener) {
            content.classList.remove(xid);
            closeBtn.removeEventListener('click', detach.listener);
            cancelBtn.removeEventListener('click', detach.listener);
            confirmBtn.removeEventListener('click', detach.listener);
            detach.listener = null;
        }
        if (detach.cancel) {
            queueMicrotask(detach.cancel);
            detach.cancel = null;
        }
        return T.ui.dialog.hide(content);
    });

    const attach = ({validate}) => new Promise((resolve, reject) => {
        detach.listener = tryCatch((ev) => {
            stop(ev);
            if (!content.classList.contains(xid)) {
                content.classList.add(xid);

                const ok = ev.currentTarget === confirmBtn;
                const input = ok && content.querySelector('input:checked, input');
                const value = input ? input.dataset.value || input.value : true;

                Promise.resolve(ok && typeof validate === 'function' && tryCatch(validate)(value, input))
                    .catch(echo)
                    .then((stop) => {
                        if (stop) {
                            if (input) {
                                T.ui.input.errorMsg(input, stop);
                            }
                            dump(stop);
                            content.classList.remove(xid);
                            return;
                        }
                        queueMicrotask(detach);
                        return ok && resolve(value);
                    })
                    .catch(detach);
            }
        }, detach.cancel = reject);

        closeBtn.addEventListener('click', detach.listener);
        cancelBtn.addEventListener('click', detach.listener);
        confirmBtn.addEventListener('click', detach.listener);

        for (const elm of content.querySelectorAll('form')) {
            elm.addEventListener('submit', stop);
        }
        T.ui.dialog.show(content);
    });

    const getDialogBox = (msg, submsg) => {
        const box = content.querySelector('.content');

        box.textContent = '';
        if (typeof msg === 'string' && msg.includes('<')) {

            T.ui.appendTemplate(msg, ce('p', box));
        }
        else {
            ce('p', box).textContent = msg || l[200];
        }

        if (submsg) {
            ce('div', box, {class: 'tip'}).textContent = submsg;
        }
        return box;
    };

    const openDialog = async(options = {}) => {
        const {
            msg,
            title,
            submsg,
            onload,
            inputValue = '',
            placeholders = [],
            value,
            type = 'warning',
            buttons = [l.ok_button],
            joy = true
        } = options;

        --pending;
        const box = getDialogBox(msg, submsg);

        if (type in ce.type) {
            const elm = ce.type[type].cloneNode(true);
            const input = elm.querySelector('input');

            if (input) {
                if (placeholders.length) {
                    elm.classList.add('fl-label');
                    elm.querySelector('label').textContent = placeholders[0];
                    input.placeholder = placeholders[1] || placeholders[0];
                }
                if (value) {
                    input.dataset.value = value;
                }

                input.value = inputValue;

                T.ui.input.init(input);

                if (type !== 'calendar') {
                    onIdle(() => input.focus());
                }
            }

            if (buttons.length < 2 && (type === 'prompt' || type === 'password')) {
                buttons.splice(0, 1, l[81], l[82]);
            }

            box.append(elm);
        }

        if (typeof onload === 'function') {
            const res = tryCatch(onload)(box);
            if (res instanceof Promise) {
                await res;
            }
        }

        // Confirmation
        if (type.includes('confirmation') || buttons.length === 2) {
            content.querySelector('footer').classList.add('fw-buttons');
            cancelBtn.classList.remove('hidden');
        }
        else {
            content.querySelector('footer').classList.remove('fw-buttons');
            cancelBtn.classList.add('hidden');
        }

        // Negative confirmation button
        if (type.includes('negative')) {
            confirmBtn.classList.add('negative');
        }
        else {
            confirmBtn.classList.remove('negative');
        }

        content.classList.remove('prioritize');
        content.querySelector('header > h5').textContent = title || '';
        confirmBtn.querySelector('span').textContent = buttons[0];
        cancelBtn.querySelector('span').textContent = buttons[1] || l[82];

        // Set class for warnings/errors to be on top of other dialogs
        if (/warning|error/.test(type)) {
            content.classList.add('prioritize');
        }

        // Reset and show
        return attach(options)
            .catch((ex) => {
                if (!ex && joy) {
                    return ex;
                }
                throw ex;
            });
    };

    return freeze({
        get pending() {
            return pending;
        },
        hide() {
            return detach();
        },
        show(opts) {
            ++pending;
            return mutex.lock('<it:msg-dialog/>')
                .then((unlock) => openDialog(opts).finally(unlock));
        }
    });
});
