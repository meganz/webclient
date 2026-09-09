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
