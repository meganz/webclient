/** @property window.datepickerUtils */
lazy(self, 'datepickerUtils', () => {
    'use strict';

    /**
     * Date helpers shared by forms that pair a date picker with a
     * MegaTimePicker (e.g. the support form's S4 incident range). Covers
     * locale field-order detection, formatting/parsing of typed dates, and
     * reading a combined date+time from both the desktop AirDatepicker-wrapped
     * input and the mobile MegaMobileDatePicker.
     */

    // localeDate() result, valid while the locale/uidateformat key matches.
    let cached = null;

    /**
     * @param {number} n Any integer.
     * @returns {string} `n` as a zero-padded 2-digit string.
     */
    const pad2 = (n) => String(n).padStart(2, '0');

    /**
     * @param {Date} date Source date; not mutated.
     * @returns {Date} New Date at local midnight of `date`'s day.
     */
    const dateOnly = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

    /**
     * The numeric date-field order for the user's locale, cached per-locale. Drives
     * both the displayed format and parsing so they always agree.
     * @returns {{key: string, order: string[], pattern: string}}
     *   `order` is a permutation of ['day','month','year']; `pattern` is the
     *   slash-separated AirDatepicker token string (e.g. 'mm/dd/yyyy').
     */
    const localeDate = () => {
        const {locales} = getCountryAndLocales();
        // NOTE - `locales === 'ISO'` vs `country === 'ISO'`
        // an unknown *country* alone (e.g. logged-out 'nl' UI on an
        // English browser) still leaves a usable language locale for the field order.
        const iso = !!Object(window.fmconfig).uidateformat || locales === 'ISO';
        const key = `${locales}|${iso ? 'iso' : ''}`;
        if (cached && cached.key === key) {
            return cached;
        }

        let order = ['day', 'month', 'year'];
        if (iso) {
            order = ['year', 'month', 'day'];
        }
        else {
            const fmtKey = `${locales}-1`;
            if ($.dateTimeFormat[fmtKey] === undefined) {
                setDateTimeFormat(locales, 1);
            }
            const fmt = $.dateTimeFormat[fmtKey];
            if (fmt === 'ISO') {
                order = ['year', 'month', 'day'];
            }
            else if (fmt && typeof fmt.formatToParts === 'function') {
                const seq = fmt.formatToParts(new Date(2000, 11, 31))
                    .flatMap(part => part.type === 'literal' ? [] : part.type);
                if (seq.length === 3) {
                    order = seq;
                }
            }
        }

        const token = {day: 'dd', month: 'mm', year: 'yyyy'};
        return (cached = {key, order, pattern: order.map(t => token[t]).join('/')});
    };

    /**
     * Parse a date typed in the user's locale field order into a Date. Splits on any
     * run of non-digits, so the separator does not matter.
     * @param {string} str Typed date text.
     * @returns {?Date} Local-midnight Date, or null if fewer than 3 numeric components.
     */
    const parseLocaleDate = (str) => {
        const nums = (String(str || '').match(/\d+/g) || []).map(n => +n);
        if (nums.length < 3) {
            return null;
        }
        const part = {};
        localeDate().order.forEach((field, i) => {
            part[field] = nums[i];
        });
        return new Date(part.year, part.month - 1, part.day);
    };

    /**
     * Read a date picker's value as a date-only Date (local midnight).
     * Handles both MegaMobileDatePicker (epoch-seconds via `.value`) and the
     * desktop AirDatepicker-wrapped jQuery input (locale-ordered date text via
     * `.val()`, parsed by parseLocaleDate).
     * @param {(MegaMobileDatePicker|jQuery)} dp Date picker to read.
     * @returns {?Date} Date at local midnight, or null if `dp` has no value.
     */
    const getDateOnly = (dp) => {
        if (is_mobile) {
            return dp.value ? dateOnly(new Date(dp.value * 1000)) : null;
        }
        return parseLocaleDate(dp.val());
    };

    return freeze({
        pad2,
        dateOnly,
        parseLocaleDate,
        getDateOnly,

        /**
         * Parse a native <input type="date"> value ("YYYY-MM-DD") into epoch seconds
         * at LOCAL midnight. new Date('YYYY-MM-DD') parses as UTC, which shifts the day
         * in behind-UTC timezones, so build the Date from its parts (cf. localISO).
         * @param {string} value The native date input value, or '' when unset.
         * @returns {number} Epoch seconds at local midnight, or 0 when empty.
         */
        isoDateToTs(value) {
            if (!value) {
                return 0;
            }
            const [year, month, day] = String(value).split('-').map(Number);
            return new Date(year, month - 1, day).getTime() / 1000;
        },

        /**
         * @returns {string} Slash-separated date format in the user's locale field order
         *                   (e.g. 'dd/mm/yyyy', 'mm/dd/yyyy', 'yyyy/mm/dd'). Suitable as an
         *                   AirDatepicker `dateFormat`; for user-visible text use
         *                   localeDatePlaceholder() instead.
         */
        localeDateFormat() {
            return localeDate().pattern;
        },

        /**
         * @returns {string} Localized, display-only date placeholder in the user's field
         *                   order (e.g. 'dd/mm/yyyy', 'jj/mm/aaaa', 'tt/mm/jjjj'). NOT a
         *                   parseable AirDatepicker format - use localeDateFormat() for that.
         */
        localeDatePlaceholder() {
            const parts = String(l.datepicker_date_placeholder || '').split('/');
            const [day, month, year] = parts.length === 3 ? parts : ['dd', 'mm', 'yyyy'];
            const token = {day, month, year};
            // Join with an LRM (U+200E) before each slash: RTL-script tokens (e.g. Arabic)
            // would otherwise merge into a single right-to-left run and display in reverse
            // field order, contradicting the LTR-rendered typed value (e.g. 31/12/2024).
            return localeDate().order
                .map(t => String(token[t]).toLowerCase())
                .join('\u200E/');
        },

        /**
         * Format a Date into the user's locale field order (inverse of parseLocaleDate).
         * @param {Date} date Date to format.
         * @returns {string} e.g. '31/12/2000', '12/31/2000', or '2000/12/31'.
         */
        formatLocaleDate(date) {
            const val = {day: pad2(date.getDate()), month: pad2(date.getMonth() + 1), year: date.getFullYear()};
            return localeDate().order.map(field => val[field]).join('/');
        },

        /**
         * Combine a date picker's date with a MegaTimePicker's time into a single Date.
         * Time defaults to 00:00 when the time picker is missing or unset.
         * @param {(MegaMobileDatePicker|jQuery)} dp Date picker to read.
         * @param {?MegaTimePicker} picker Optional paired time picker.
         * @returns {?Date} Combined Date, or null when `dp` has no date.
         */
        getDateTime(dp, picker) {
            const date = getDateOnly(dp);
            if (!date) {
                return null;
            }
            const t = picker && picker.value;
            date.setHours(t ? t.h : 0, t ? t.m : 0, 0, 0);
            return date;
        },

        /**
         * Reject free text typed into a desktop AirDatepicker-wrapped input. AirDatepicker
         * only ever writes its own value on calendar select and never parses typed input,
         * so without this an entry like "my text" (or an out-of-range date) would linger.
         * On blur a valid in-range date is re-selected through the picker (normalizing the
         * display and firing its onSelect); anything else reverts to the last selection or
         * clears. No-op on mobile (MegaMobileDatePicker has no free-text path) or before the
         * picker is initialised - safe to call once the datepicker plugin is attached.
         * @param {Object} $picker The AirDatepicker-wrapped input.
         * @returns {void}
         */
        enforceTypedDate($picker) {
            if (is_mobile) {
                return;
            }
            $picker.rebind('blur.dpvalidate', () => {
                const inst = $picker.data('datepicker');
                if (!inst) {
                    return;
                }
                const selected = inst.selectedDates[0];
                const current = selected ? this.formatLocaleDate(selected) : '';
                const raw = String($picker.val() || '').trim();
                if (raw === current) {
                    return;
                }
                const parsed = parseLocaleDate(raw);
                const inRange = parsed
                    && parsed >= dateOnly(inst.minDate)
                    && parsed <= dateOnly(inst.maxDate);
                if (inRange) {
                    inst.selectDate(parsed);
                }
                else if (selected) {
                    $picker.val(current);
                }
                else {
                    inst.clear();
                }
            });
        }
    });
});
