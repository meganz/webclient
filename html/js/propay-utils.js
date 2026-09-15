/**
 * Shared helpers for the payments.
 * Assumes pro.propay has already been declared (see propay.js).
 */

// `pro.log(...)` - dev logger. Set localStorage.propayLogAsErrors to route through console.error
// for DevTools Errors-filter visibility and callsite-anchored stacks.
lazy(pro, 'log', () => {
    'use strict';
    if (d && localStorage.propayLogAsErrors) {
        return (...args) => console.error('[propay]', ...args);
    }
    const logger = new MegaLogger('propay', {
        minLogLevel: () => MegaLogger.LEVELS.DEBUG,
    });
    return (...args) => logger.debug(...args);
});

// Coinify accepts a date of birth from this floor up to the day the user turns DOB_MIN_AGE.
pro.propay.DOB_MIN_DATE = '1920-01-01';
pro.propay.DOB_MIN_AGE = 10;

/**
 * Get the latest date of birth Coinify accepts, i.e. today minus the minimum age.
 * @returns {String} The date as YYYY-MM-DD
 */
pro.propay.getMaxDateOfBirth = function() {
    'use strict';
    const today = new Date();
    // Today is local, the arithmetic is UTC - local midnight can be skipped entirely by a DST or
    // date line shift (Samoa had no 30 Dec 2011), which would move the cutoff a day.
    const cutoff = new Date(Date.UTC(
        today.getFullYear() - pro.propay.DOB_MIN_AGE,
        today.getMonth(),
        today.getDate()
    ));
    if (cutoff.getUTCMonth() !== today.getMonth()) {
        // 29 Feb rolls into March in a non leap year; clamp back to the 28th.
        cutoff.setUTCDate(0);
    }
    const month = String(cutoff.getUTCMonth() + 1).padStart(2, '0');
    const day = String(cutoff.getUTCDate()).padStart(2, '0');
    return `${cutoff.getUTCFullYear()}-${month}-${day}`;
};

/**
 * Validate a date input value against the range Coinify accepts. Comparisons stay on the
 * YYYY-MM-DD strings; `new Date('YYYY-MM-DD')` is UTC midnight and misjudges the birthday itself.
 * @param {String} dob The entered date of birth as YYYY-MM-DD
 * @returns {String} The error message to display, or '' when the date is acceptable
 */
pro.propay.validateDateOfBirth = function(dob) {
    'use strict';

    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
    if (!parts || dob < pro.propay.DOB_MIN_DATE) {
        return l.enter_birth_date;
    }

    // Date rolls impossible days forward (2023-02-30 -> 2023-03-02), so round-trip to catch them.
    const date = new Date(Date.UTC(parts[1], parts[2] - 1, parts[3]));
    if (date.getUTCMonth() !== parts[2] - 1 || date.getUTCDate() !== +parts[3]) {
        return l.enter_birth_date;
    }

    return dob > pro.propay.getMaxDateOfBirth() ? l.coinify_too_young : '';
};

/**
 * Constrain date of birth inputs to the range Coinify accepts, so the native picker cannot
 * offer an out of range date. Typed input still needs {@link pro.propay.validateDateOfBirth}.
 * @param {Object} $inputs jQuery collection of `type="date"` inputs
 * @returns {void}
 */
pro.propay.setDateOfBirthRange = function($inputs) {
    'use strict';
    $inputs.attr({'min': pro.propay.DOB_MIN_DATE, 'max': pro.propay.getMaxDateOfBirth()});
};

/**
 * Wire up a desktop custom dropdown plus (on mobile) a MegaMobileDropdown sheet sharing one onChange callback.
 * @param {Object} opts
 * @param {jQuery} opts.$dropdowns  Set of .mega-input.dropdown-input wrappers kept in sync.
 * @param {Object} opts.items       {key: label} option map.
 * @param {String} opts.selected    Initial selected key (or '').
 * @param {String} opts.placeholder Placeholder shown when no value is selected.
 * @param {Boolean} opts.disabled   Mark the dropdown disabled.
 * @param {String} opts.titleText   Mobile sheet title.
 * @param {String} opts.namespace   jQuery event namespace.
 * @param {Function} opts.onChange  (value, $sourceDd) => void
 * @returns {void}
 */
pro.propay.initSyncedDropdown = function(opts) {
    'use strict';
    const {$dropdowns, items, selected, placeholder, disabled, titleText, namespace, onChange} = opts;

    if (!$dropdowns || !$dropdowns.length) {
        return;
    }

    const mobileInstances = is_mobile ? [] : null;

    const propagate = ($source, value) => {
        // Always sync every wrapper - the desktop .option click handler only updates the clicked
        // wrapper's span, and on mobile the mobile picker leaves the source wrapper's span untouched.
        for (let j = 0; j < $dropdowns.length; j++) {
            setDropdownValue($($dropdowns[j]), value);
        }
        if (mobileInstances) {
            const text = items[value] || placeholder || '';
            for (let k = 0; k < mobileInstances.length; k++) {
                if (mobileInstances[k].selected !== value) {
                    mobileInstances[k].setSelectedOption(text, value);
                }
            }
        }
        if (typeof onChange === 'function') {
            onChange(value, $source);
        }
    };

    for (let i = 0; i < $dropdowns.length; i++) {
        const $dd = $($dropdowns[i]);

        createDropdown($dd, {placeholder, items, selected});

        if (disabled) {
            $dd.addClass('disabled').attr('disabled', 'disabled');
        }
        else {
            $dd.removeClass('disabled').removeAttr('disabled');
        }

        if (is_mobile) {
            const mobile = new MegaMobileDropdown({
                selected,
                sheetHeight: 'auto',
                invisible: true,
                parentNode: $dd[0],
                elemName: `${namespace}-${i}`,
                dropdownItems: items,
                dropdownOptions: {
                    titleText: titleText || '',
                    placeholderText: placeholder || '',
                },
                onSelected: () => propagate($dd, mobile.selected),
                listContainerClass: 'propay-billing-mobile-select',
            });
            mobileInstances.push(mobile);

            $dd.rebind(`click.${namespace}`, () => {
                if ($dd.hasClass('disabled')) {
                    return false;
                }
                mobile.trigger('dropdown');
                return false;
            });
        }
        else {
            bindDropdownEvents($dd);
            $('.option', $dd).rebind(`click.${namespace}`, () => {
                propagate($dd, getDropdownValue($dd));
            });
        }
    }
};
