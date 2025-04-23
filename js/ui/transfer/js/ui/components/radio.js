/** @property T.ui.radio */
lazy(T.ui, 'radio', () => {
    'use strict';

    return freeze({
        init(radios, form, ucb) {
            if (!radios) {
                return false;
            }
            radios = radios.length === undefined ? [radios] : radios;

            if (typeof form === 'function') {
                ucb = form;
                form = null;
            }

            if ((form = form || radios[0].closest('form'))) {
                const onchange = (ev) => {
                    const checked = form.querySelector(`.it-radio-button[data-name="${ev.target.name}"].checked`);

                    if (checked) {
                        checked.classList.remove('checked');
                    }

                    ev.target.closest('.it-radio-button').classList.add('checked');

                    if (ucb) {
                        tryCatch(ucb)(ev);
                    }
                };
                for (let i = radios.length; i--;) {
                    radios[i].addEventListener('change', onchange);
                }
            }
            else {
                dump(`missing 'form'`, radios);
            }
        }
    });
});
