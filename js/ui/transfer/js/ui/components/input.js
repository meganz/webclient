/** @property T.ui.input */
lazy(T.ui, 'input', () => {
    'use strict';

    const stop = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
    };
    const ce = (n, t, a) => mCreateElement(n, a, t);
    const rndID = () => `input-xid${Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)}`;

    return freeze({
        init(inputs, opt = {}) {
            if (!inputs) {
                return false;
            }
            if (opt === true) {
                // a flag indicating it's a cloned element
                opt = {unique: true};
            }
            else if (typeof opt === 'string') {
                opt = {errorMsg: opt};
            }
            else if (typeof opt === 'function') {
                opt = {keypress: opt};
            }
            inputs = inputs.length === undefined ? [inputs] : inputs;

            if (opt.errorMsg) {
                onIdle(() => this.errorMsg(inputs[0], opt.errorMsg));
            }

            for (let i = 0; i < inputs.length; i++) {
                let n = inputs[i];

                // Add Eye icon
                if (n.type === 'password') {
                    this.initEyeBtn(n);
                }

                // If calendar
                if (n.dataset.subtype === 'calendar') {
                    this.initDatePicker(n);
                }

                n.addEventListener('focus', (e) => {
                    e.target.closest('.it-input').classList.add('focused');
                });

                n.addEventListener('blur', (e) => {
                    e.target.closest('.it-input').classList.remove('focused');
                });

                n.addEventListener('input', (e) => {
                    this.errorMsg(e.target);
                });

                if (opt.unique) {
                    const id = rndID();
                    if (n.name === n.id) {
                        n.setAttribute('name', id);
                    }
                    if (n.nextElementSibling) {
                        // label
                        n.nextElementSibling.setAttribute('for', id);
                    }
                    n.id = id;
                }

                if (opt.keypress) {
                    const id = n.id || rndID();
                    const handler = tryCatch(opt.keypress);
                    n.addEventListener('keypress', (ev) => {
                        delay(`js-input-keypress:${id}`, () => handler(ev));
                    });
                }

                n = n.closest('.it-input');
                if (n) {
                    n.addEventListener('click', (e) => {
                        e.target.closest('.it-input').querySelector('input, textarea').focus();
                    });
                }
            }
        },

        initEyeBtn(input) {
            const wrap = input.closest('.it-input');

            if (!wrap) {
                return false;
            }

            let btn = wrap.querySelector('.js-toggle-pass');

            if (!btn) {
                btn = mCreateElement('a', {
                    class: 'it-button ghost icon js-toggle-pass',
                    'data-value': 0,
                    href: ''
                }, wrap.querySelector('.input-box'));

                mCreateElement('i', {class: 'sprite-it-x24-mono icon-eye'}, btn);
            }

            btn.addEventListener('click', (e) => {
                e.preventDefault();

                if (parseInt(btn.dataset.value)) {
                    btn.dataset.value = 0;
                    btn.querySelector('i').className = 'sprite-it-x24-mono icon-eye';
                    input.type = 'password';
                }
                else {
                    btn.dataset.value = 1;
                    btn.querySelector('i').className = 'sprite-it-x24-mono icon-eye-off';
                    input.type = 'text';
                }
            });
        },

        create(type, attrs) {
            if (typeof attrs === 'string') {
                attrs = {'data-subtype': attrs};
            }
            if (!(attrs && 'autocomplete' in attrs)) {
                attrs = {...attrs, autocomplete: `new-${type}`};
            }
            if (!attrs.id) {
                attrs.id = Math.random().toString(36).slice(-7);
            }
            const item = ce('form', null, {class: 'it-input xl-size'});

            const box = ce('div', item, {class: 'input-box'});
            const node = ce('div', box, {class: 'input-field'});

            const elm = ce('input', node, {type, name: attrs.id, value: '', ...attrs});
            elm.required = true;

            ce('label', node, {for: attrs.id});
            ce('div', item, {class: 'error-text'});

            return item;
        },

        initDatePicker(input) {
            const wrap = input.closest('.it-input');

            if (!wrap) {
                return false;
            }

            const DAYS_LIST = [
                // Sun - Sat
                l[8763], l[8764], l[8765], l[8766], l[8767], l[8768], l[8769]
            ];
            const MONTHS_LIST = [
                l[408], l[409], l[410], l[411], l[412], l[413], // January - June
                l[414], l[415], l[416], l[417], l[418], l[419]  // July - December
            ];
            const MONTHS_SHORT_LIST = [
                l[24035], l[24037], l[24036], l[24038], l[24047], l[24039], // January - June
                l[24040], l[24041], l[24042], l[24043], l[24044], l[24045]  // July - December
            ];
            let btn = wrap.querySelector('.js-show-calendar');

            input.readOnly = true;
            input.value = 'Select date';

            // Add datepicker btn
            if (!btn) {
                btn = mCreateElement('a', {
                    class: 'it-button ghost icon js-show-calendar',
                    'data-value': 0,
                    href: ''
                }, wrap.querySelector('.input-box'));

                mCreateElement('i', {class: 'sprite-it-x24-mono icon-calendar'}, btn);
            }

            const changePos = ($node) => {
                $node.position({
                    of: wrap,
                    my: 'right center',
                    at: 'right center',
                    collision: 'flipfit',
                    within: document.body
                });
            };

            $(input).datepicker({
                dateFormat: 'mm/dd/yyyy',
                minDate: new Date(),
                maxDate: new Date(2077, 11, 31),
                disableNavWhenOutOfRange: true,
                startDate: null,
                prevHtml: '<i class="sprite-it-x24-mono icon-chevron-right"></i>',
                nextHtml: '<i class="sprite-it-x24-mono icon-chevron-right"></i>',
                altField: null,
                firstDay: 0,
                autoClose: true,
                toggleSelected: false,
                language: {
                    daysMin: DAYS_LIST,
                    months: MONTHS_LIST,
                    monthsShort: MONTHS_SHORT_LIST
                },
                onSelect: (_, date) => {
                    input.dataset.value = ~~(date.getTime() / 1e3);
                },
                onShow: (context) => {
                    changePos(context.$datepicker);
                },
                setPosition: ($node) => {
                    changePos($node);
                }
            });
            btn.addEventListener('click', (e) => {
                stop(e);
                input.click();
            });
        },

        errorMsg(input, msg) {
            const wrap = input.closest('.it-input');
            const err = wrap && wrap.querySelector('.error-text');

            if (!err) {
                return false;
            }

            if (msg) {
                err.textContent = msg;
                wrap.classList.add('error');
            }
            else {
                err.textContent = '';
                wrap.classList.remove('error');
            }
        }
    });
});
