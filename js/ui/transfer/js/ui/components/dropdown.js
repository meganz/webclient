/** @property T.ui.dropdown */
lazy(T.ui, 'dropdown', () => {
    'use strict';

    return freeze({
        init(select, opts = {}) {
            if (!select) {
                return false;
            }
            const dropdown = select.querySelector('.js-dropdown');
            const options = dropdown.querySelectorAll('.js-option');
            const radios = dropdown.querySelectorAll('input[type="radio"]');
            const btn = select.querySelector('.js-select-button');

            if (typeof opts === 'function') {
                opts = {ucb: opts};
            }

            // Hide opened dropdown
            const hideDropdown = (e) => {
                if (!btn.contains(e.target)) {
                    dropdown.classList.remove('visible');
                    window.removeEventListener('click', hideDropdown);
                }
                return false;
            };

            // Show dropdown
            const showDropdown = (e) => {
                e.preventDefault();
                dropdown.classList.add('visible');
                window.addEventListener('click', hideDropdown);

                if (opts.position) {
                    const at = opts.position;
                    const my = at.includes('top') ? at.replace('top', 'bottom') : at.replace('bottom', 'top');
                    dropdown.classList.add('fixed');
                    $(dropdown).position({
                        of: btn,
                        my,
                        at,
                        collision: 'flipfit',
                        within: document.body
                    });
                }

                return false;
            };

            // Init select button click
            btn.addEventListener('click', showDropdown);

            // Init it-radio component and change event
            if (radios.length) {
                return T.ui.radio.init(radios, () => {
                    const checked = dropdown.querySelector(`input[type="radio"]:checked`);
                    const option = checked.closest('.js-option');
                    const label = btn.querySelector('.label');

                    if (label && option.dataset.label) {
                        label.textContent = option.dataset.label;
                    }

                    if (opts.ucb) {
                        tryCatch(opts.ucb)(checked.value);
                    }
                });
            }

            // Init options click
            for (let i = 0; i < options.length; i++) {
                options[i].addEventListener('click', (e) => {
                    let label = null;

                    if (e.currentTarget.dataset.label && (label = btn.querySelector('.label'))) {
                        label.textContent = e.currentTarget.dataset.label;
                    }
                });
            }
        },

        clone(elm, opts = {}) {
            let { onChange } = opts;
            let target = elm;
            if (typeof elm === 'string') {
                target = document.querySelector(elm).cloneNode(true);
            }
            const input = target.querySelector('input'); // input where the selection is filled.

            if (input) {
                T.ui.input.init(input, target !== elm);

                onChange = ((ucb) => (ev) => {
                    let tmp = ev.currentTarget.querySelector('input[type="radio"]');
                    if (tmp) {
                        input.dataset.value = tmp.value;
                    }
                    if ((tmp = ev.currentTarget.querySelector('.name') || tmp)) {
                        input.value = tmp.textContent || tmp.value;
                    }
                    if (typeof ucb === 'function') {
                        tryCatch(ucb)(input.value, target);
                    }
                })(onChange);

                for (const label of target.querySelectorAll('.js-option')) {
                    const name = label.querySelector('.name');
                    const ds = name.dataset;
                    if (ds.string && ds.value) {
                        name.textContent = mega.icu.format(l[ds.string], parseInt(ds.value));
                    }
                    label.addEventListener('change', onChange);
                }
            }
            requestAnimationFrame(() => this.init(target, opts));
            return target;
        }
    });
});
