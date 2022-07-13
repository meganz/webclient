var date_months = [];

var locale = "en";

var remappedLangLocales = {
    "cn": "zh-Hans",
    "ct": "zh-Hant",
    "kr": "ko",
    "jp": "ja",
    "tl": "fil",
    "br": "pt"
};

// Arabic speaking countries
var arabics = ['DZ', 'BH', 'TD', 'KM', 'DJ', 'EG', 'ER', 'IQ', 'JO', 'KW', 'LB', 'LY',
    'MR', 'MA', 'OM', 'PS', 'QA','SA', 'SO', 'SS', 'SY', 'TZ', 'TN', 'AE', 'YE'];

$.dateTimeFormat = Object.create(null);
$.acc_dateTimeFormat = Object.create(null);

if (typeof l === 'undefined') {
    l = [];
}

/**
 * Convert all instances of [$nnn] e.g. [$102] to their localized strings
 * @param {String} html The html markup
 * @returns {String}
 */
function translate(html) {
    'use strict';

    /**
     * String.replace callback
     * @param {String} match The whole matched string
     * @param {Number} localeNum The locale string number
     * @param {String} namespace The operation, if any
     * @returns {String} The localized string
     */
    var replacer = function(match, localeNum, namespace) {

        if (namespace) {
            match = localeNum + '.' + namespace;
            localeNum = match;
        }

        // XXX: Seeing this warning could simply mean we forgot to replace entity tags
        //      within populate_l(), or it may indicate a worse issue where html pages
        //      are used before startMega() have finished. Also, injecting them in the
        //      DOM to manipulate it later is something we should avoid doing as well.
        // FIXME: we will for now whitelist onboarding strings doing so though...
        if (d && /\[\w+]/.test(l[localeNum]) && (localeNum < 17566 || localeNum > 17577) && localeNum != 23718) {
            console.warn('locale string %s does contain raw entity tags', localeNum, [l[localeNum]]);
        }

        if (typeof l[localeNum] === 'string') {
            return String(l[localeNum]);
        }

        // if the type is an object (not simple), then it's not allowed on HTML
        console.error(`locale l[${localeNum}] is used in HTML, not a string, val= ${JSON.stringify(l[localeNum])}`);

        return l[localeNum];
    };

    return String(html).replace(/\[\$(\w+)(?:\.(\w+))?\]/g, replacer);
}

/**
 * Loads localisation for images
 * Apply the locale-img class and the data-baseimg attribute for the image to be loaded in its localised version
 *    Images will be loaded from /images/mega/locale/lang_data-baseimg
 *        If the locale image is not present /images/mega/locale/en_data-baseimg will be used
 * For language codes see languages defined in secureboot
 *
 * @param {string|jQuery} scope The optional scope to perform the load on
 * @returns {void} void
 */
function localeImages(scope) {
    'use strict';
    const $imgs = $('.locale-img', scope || 'body');
    const fallbackLang = 'en';
    const prepImg = ($img, src, fbsrc) => {
        const img = new Image();
        const onload = () => {
            $img.replaceWith(img);
        };
        const onerr = () => {
            if (fbsrc) {
                if (d) {
                    console.warn(`Image ${src} missing. Using fallback`);
                }
                prepImg($img, fbsrc, undefined);
            }
            else if (d) {
                console.error(`Error loading fallback image ${src}`);
            }
        };
        img.classList = $img.get(0).classList;
        if (typeof img.decode === 'function') {
            img.src = src;
            img.decode().then(onload).catch(onerr);
        }
        else {
            img.onload = onload;
            img.onerror = onerr;
            img.src = src;
        }
    };
    for (let i = 0; i < $imgs.length; i++) {
        if ($imgs.eq(i).attr('data-baseimg')) {
            const base = $imgs.eq(i).attr('data-baseimg');
            $imgs.eq(i).removeAttr('data-baseimg');
            const ls = `${staticpath}images/mega/locale/${lang}_${base}`;
            const fs = `${staticpath}images/mega/locale/${fallbackLang}_${base}`;
            prepImg($imgs.eq(i), ls, fs);
        }
    }
}

/**
 * Set Date time object for time2date
 * @param {String} locales Locale string
 * @param {Number} format format number for the case.
 */
function setDateTimeFormat(locales, format) {

    "use strict";

    // Set date format
    var options = {hourCycle: 'h23'};

    if (format < 10) {
        options.year = 'numeric';
        options.month = format >= 2 ? 'long' : 'numeric';
        options.day = format === 3 || format === 6 ? undefined : 'numeric';
        options.weekday = format === 4 || format === 5 ? 'long' : undefined;

        if (format === 0 || format === 5) {
            options.minute = 'numeric';
            options.hour = 'numeric';
            if (format === 5) {
                options.second = 'numeric';
                options.timeZoneName = 'short';
            }
        }

        if (format === 6) {
            options.month = 'short';
        }
    }
    // Set non full date format
    else {
        switch (format) {
            case 10:
                options.weekday = 'short';
                break;
            case 11:
                options.weekday = 'long';
                break;
            case 12:
                options.month = 'short';
                break;
            case 13:
                options.month = 'long';
                break;
            case 14:
                options.year = 'numeric';
                break;
            case 15:
                options.month = 'short';
                options.day = 'numeric';
                break;
            case 16:
                options.day = 'numeric';
                break;
            case 17:
                options.year = '2-digit';
                options.month = 'numeric';
                options.day = 'numeric';
                break;
        }
    }

    // Create new DateTimeFormat object if it is not exist
    try {
        $.dateTimeFormat[locales + '-' + format] = typeof Intl !== 'undefined' ?
            new Intl.DateTimeFormat(locales, options) : 'ISO';

        // If locale is Arabic and country is non-Arabic country, not set, or not logged in
        if (locale === 'ar' && (!u_attr || !u_attr.country || arabics.indexOf(u_attr.country) < 0)) {
            // To avoid Chrome bug, set Egypt as default country.
            $.dateTimeFormat[locales + '-' + format] = new Intl.DateTimeFormat('ar-EG', options);
        }
    }
    catch (e) {
        $.dateTimeFormat[locales + '-' + format] = format > 1 ? new Intl.DateTimeFormat(locale, options) : 'ISO';
    }
}

/**
 * Converts a timestamp to a readable time format - e.g. 2016-04-17 14:37
 * If user selected use ISO date formate, short date format will using ISO date format.
 * If user selected country on the setting using it to find locale.
 * If user did not selected country, assume country with ip address and apply date format.
 * e.g. US: mm/dd/yyyy, NZ: dd/mm/yyyy, CN: yyyy/mm/dd
 *
 * @param {Number} unixTime  The UNIX timestamp in seconds e.g. 1464829467
 * @param {Number} [format]  The readable time format to return
 * @returns {String}
 *
 * Formats (examples are ISO date format):
 *       0: yyyy-mm-dd hh:mm (Short date format with time)
 *       1: yyyy-mm-dd (Short date format without time)
 *       2: yyyy fmn dd (fmn: Full month name, based on the locale) (Long Date format)
 *       3: yyyy fmn (fmn: Full month name, based on the locale) (Long Date format without day)
 *       4: Monday, yyyy fmn dd (fmn: Full month name, based on the locale) (Long Date format with weekday)
 *       5: Monday, yyyy fmn dd hh:mm:ss TZ (fmn: Full month name, based on the locale)
 *                                                                  (Long Date format with weekday, time, and timezone)
 *       6: yyyy mm (Short Date format without day and time)
 *
 * Non full date formats:
 *       10: Mon (Only day of the week long version)
 *       11: Monday (Only day of the week short version)
 *       12: Jan (Only month short version)
 *       13: January (Only month long version)
 *       14: 2021 (Only year)
 *       15: dd mm (Date format with short month and without time and year)
 *       16: yyyy (Only year)
 */
function time2date(unixTime, format) {
    'use strict';
    var date = new Date(unixTime * 1000 || 0);
    var result;
    var dateFunc;
    var countryAndLocales = getCountryAndLocales();

    format = format || 0;

    // If dateTimeFormat is not set with the current locale set it.
    if ($.dateTimeFormat[countryAndLocales.locales + '-' + format] === undefined) {
        setDateTimeFormat(countryAndLocales.locales, format);
    }

    var dFObj = $.dateTimeFormat[countryAndLocales.locales + '-' + format];

    // print time as ISO date format
    var printISO = function _printISO() {
        var timeOffset = date.getTimezoneOffset() * 60;
        var isodate = new Date((unixTime - timeOffset) * 1000 || 0);
        var length = format === 0 ? 16 : 10;
        return isodate.toISOString().replace('T', ' ').substr(0, length);
    };

    dateFunc = dFObj === 'ISO' ? printISO : dFObj.format;

    // if it is short date format and user selected to use ISO format
    if ((fmconfig.uidateformat || countryAndLocales.country === 'ISO') && format < 2) {
        result = printISO();
    }
    else {
        result = dateFunc(date);
    }

    return result;
}

/**
 * Set Date time object for acc_time2date
 * @param {String} locales Locale string
 */
function setAccDateTimeFormat(locales) {

    "use strict";

    // Set acc date format
    var options = {month: 'long', day: 'numeric', year: 'numeric'};
    var nYOptions = {month: 'long', day: 'numeric'};

    // Create new DateTimeFormat object if it is not exist
    try {
        $.acc_dateTimeFormat[locales] = typeof Intl !== 'undefined' ?
            new Intl.DateTimeFormat(locales, options) : 'fallback';
        $.acc_dateTimeFormat[locales + '-noY'] = Intl ? new Intl.DateTimeFormat(locales, nYOptions) : 'fallback';

        // If locale is Arabic and country is non-Arabic country or non set,
        if (locale === 'ar' && (!u_attr || !u_attr.country || arabics.indexOf(u_attr.country) < 0)) {
            // To avoid Chrome bug, set Egypt as default country.
            $.acc_dateTimeFormat[locales] = new Intl.DateTimeFormat('ar-EG', options);
            $.acc_dateTimeFormat[locales + '-noY'] = new Intl.DateTimeFormat('ar-EG', nYOptions);
        }
    }
    catch (e) {
        $.acc_dateTimeFormat[locales] = new Intl.DateTimeFormat(locale, options);
        $.acc_dateTimeFormat[locales + '-noY'] = new Intl.DateTimeFormat(locale, nYOptions);
    }
}

/**
 * Function to create long date format for current locales.
 * @param {Number} unixtime The UNIX timestamp in seconds e.g. 1464829467
 * @param {Boolean} yearIsOptional Optional, set year for the date format as optional
 * @returns {String} result Formatted date.
 */
function acc_time2date(unixtime, yearIsOptional) {

    var MyDate = new Date(unixtime * 1000 || 0);
    var locales = getCountryAndLocales().locales;
    var currYear = l.year;
    var result;

    // If dateTimeFormat is already set with the current locale using it.
    if (!$.acc_dateTimeFormat[locales]) {
        setAccDateTimeFormat(locales);
    }

    if (yearIsOptional && currYear === MyDate.getFullYear()) {
        locales += '-noY';
    }

    if ($.acc_dateTimeFormat[locales] === 'fallback') {
        result = date_months[MyDate.getMonth()] + ' ' + MyDate.getDate();
        if (yearIsOptional && currYear === MyDate.getFullYear()) {
            result += MyDate.getFullYear();
        }
    }
    else {
        var dateFunc = $.acc_dateTimeFormat[locales].format;
        result = dateFunc(MyDate);
    }

    if (locale === 'en') {
        var date = MyDate.getDate();
        var lb = date.toString().slice(-1);
        var th = 'th';
        if (lb === '1' && date !== 11) {
            th = 'st';
        }
        else if (lb === '2' && date !== 12) {
            th = 'nd';
        }
        else if (lb === '3' && date !== 13) {
            th = 'rd';
        }

        result = result.replace(date, date + th);
    }

    return result;
}

function time2last(timestamp, skipSeconds) {
    var sec = Date.now() / 1000 - timestamp;
    if (skipSeconds && sec < 59) {
        return l[23252] || "Less then a minute ago";
    }
    else if (sec < 4) {
        return l[880];
    }
    else if (sec < 59) {
        return mega.icu.format(l.second_last_count, Math.ceil(sec));
    }
    else if (sec < 3540) {
        return mega.icu.format(l.minute_last_count, Math.ceil(sec / 60));
    }
    else if (sec < 82000) {
        return mega.icu.format(l.hour_last_count, Math.ceil(sec / 3600));
    }
    return mega.icu.format(l.day_last_count, Math.ceil(sec / 86400));
}

/*
 * Calculate start and end of calendar on the week/month/year contains time passed or today.
 *
 * @param {String} type  type of calendar to calculate. 'w' for week, 'm' for month, 'y' for year
 * @param {Number} [unixTime]  The UNIX timestamp in seconds e.g. 1464829467
 * @returns {Object}
 */
function calculateCalendar(type, unixTime) {

    'use strict';

    unixTime = unixTime * 1000 || Date.now();

    var time = new Date(unixTime);
    var startDate;
    var endDate;

    if (type === 'd') {
        startDate = endDate = time;
    }
    else if (type === 'w') {
        var timeDay = time.getDay();

        startDate = new Date(unixTime - 86400000 * timeDay);
        endDate = new Date(unixTime + 86400000 * (6 - timeDay));
    }
    else if (type === 'm') {
        var timeMonth = time.getMonth();

        startDate = new Date(unixTime);
        startDate.setDate(1);

        endDate = new Date(unixTime);

        // End date of months can be vary and cause issue when update month, lets set it for 15 for now.
        endDate.setDate(15);
        endDate.setMonth(timeMonth + 1);
        endDate.setDate(0); // -1 day from next month
    }
    else if (type === 'y') {
        var timeYear = time.getFullYear();

        startDate = new Date(unixTime);
        startDate.setDate(1);
        startDate.setMonth(0);

        endDate = new Date(unixTime);
        endDate.setFullYear(timeYear + 1);
        endDate.setMonth(0);
        endDate.setDate(0);
    }
    else {
        return false;
    }

    startDate = startDate.setHours(0, 0, 0, 0) / 1000;
    endDate = endDate.setHours(23, 59, 59, 0) / 1000;

    return {start: startDate, end: endDate};
}

/**
 * Function to get date time structure for current locale.
 * @returns {String|Boolean} result Date structure as 'ymd', 'dmy', or 'mdy' or false if errored.
 */
function getDateStructure() {

    'use strict';

    // Date made with unique number 1987-04-23.
    var uniqTime = new Date(1987, 3, 23);
    var uniqUnix = uniqTime.getTime() / 1000 | 0;
    var index = [];
    var localeTime = time2date(uniqUnix, 1);
    var result;
    if (locale !== 'ar') {
        // thai case using buddhist calendar, 1987 in gregorian calendar is 2530 in buddhist calendar
        index.y = (locale === 'th') ? localeTime.indexOf(2530) : localeTime.indexOf(1987);
        index.m = localeTime.indexOf(4);
        index.d = localeTime.indexOf(23);

        result = Object.keys(index).sort(function(a, b) {
            return index[a] - index[b];
        }).join('');
    }
    else {
        // Arabic special
        var locales = getCountryAndLocales().locales;

        var options_y = {year: 'numeric'}; // Format only Day
        var options_m = {month: 'numeric'}; // Format only Month
        var options_d = {day: 'numeric'}; // Format only Year

        locales = !u_attr || !u_attr.country || arabics.indexOf(u_attr.country) < 0 ? 'ar-EG' : locales;

        try {
            if (typeof Intl !== 'undefined') {
                var locale_y = new Intl.DateTimeFormat(locales, options_y).format(uniqTime);
                var locale_m = new Intl.DateTimeFormat(locales, options_m).format(uniqTime);
                var locale_d = new Intl.DateTimeFormat(locales, options_d).format(uniqTime);

                index.y = localeTime.indexOf(locale_y);
                index.m = localeTime.indexOf(locale_m);
                index.d = localeTime.indexOf(locale_d);

                result = Object.keys(index).sort(function(a, b) {
                    return index[b] - index[a];
                }).join('');
            }
            else {
                return false;
            }
        }
        catch (e) {
            return false;
        }
    }

    return result;
}

/**
 * Basic calendar math function (using moment.js) to return true or false if the date passed in is either
 * the same day or the previous day.
 *
 * @param dateString {String|int}
 * @param [refDate] {String|int}
 * @returns {Boolean}
 */
function todayOrYesterday(dateString, refDate) {
    "use strict";
    var targetDate = new Date(dateString);
    var today = refDate ? new Date(refDate) : new Date();

    // 24h only limit
    if ((today - targetDate) / 1e3 < 172800) {
        var yesterday = new Date(today / 1);
        yesterday.setDate(yesterday.getDate() - 1);

        return today.getDay() === targetDate.getDay() || yesterday.getDay() === targetDate.getDay();
    }
    return false;
}

/**
 * Basic calendar math function (using moment.js) that will return a string, depending on the exact calendar
 * dates/months ago when the passed `dateString` had happened.
 *
 * @param dateString {String|int}
 * @param [refDate] {String|int}
 * @returns {String}
 */
function time2lastSeparator(dateString, refDate) {
    var momentDate = moment(dateString);
    var today = moment(refDate ? refDate : undefined).startOf('day');
    var yesterday = today.clone().subtract(1, 'days');
    var weekAgo = today.clone().startOf('week').endOf('day');
    var twoWeeksAgo = today.clone().startOf('week').subtract(1, 'weeks').endOf('day');
    var thisMonth = today.clone().startOf('month').startOf('day');
    var thisYearAgo = today.clone().startOf('year');

    if (momentDate.isSame(today, 'd')) {
        // Today
        return l[1301];
    }
    else if (momentDate.isSame(yesterday, 'd')) {
        // Yesterday
        return l[1302];
    }
    else if (momentDate.isAfter(weekAgo)) {
        // This week
        return l[1303];
    }
    else if (momentDate.isAfter(twoWeeksAgo)) {
        // Last week
        return l[1304];
    }
    else if (momentDate.isAfter(thisMonth)) {
        // This month
        return l[1305];
    }
    else if (momentDate.isAfter(thisYearAgo)) {
        // This year
        return l[1306];
    }
    else {
        // more then 1 year ago...
        return l[1307];
    }
}

/**
 * Gets the current UNIX timestamp
 * @returns {Number} Returns an integer with the current UNIX timestamp (in seconds)
 */
function unixtime() {
    'use strict';
    return Math.round(Date.now() / 1000);
}

function uplpad(number, length) {
    'use strict';
    var str = String(number);
    while (str.length < length) {
        str = '0' + str;
    }
    return str;
}

function secondsToTime(secs, html_format) {
    'use strict';

    if (isNaN(secs) || secs === Infinity) {
        return '--:--:--';
    }
    if (secs < 0) {
        return '';
    }

    var hours = uplpad(Math.floor(secs / (60 * 60)), 2);
    var divisor_for_minutes = secs % (60 * 60);
    var minutes = uplpad(Math.floor(divisor_for_minutes / 60), 2);
    var divisor_for_seconds = divisor_for_minutes % 60;
    var seconds = uplpad(Math.floor(divisor_for_seconds), 2);
    var returnvar = hours + ':' + minutes + ':' + seconds;

    if (html_format) {
        hours = (hours !== '00') ? (hours + '<span>h</span> ') : '';
        returnvar = hours + minutes + '<span>m</span> ' + seconds + '<span>s</span>';
    }
    return returnvar;
}

function secondsToTimeShort(secs) {
    'use strict';
    var val = secondsToTime(secs);

    if (!val) {
        return val;
    }

    if (val.substr(0, 1) === "0") {
        val = val.substr(1, val.length);
    }
    if (val.substr(0, 2) === "0:") {
        val = val.substr(2, val.length);
    }

    return val;
}

function hoursToSeconds(hours) {
    'use strict';
    return hours * 60 * 60;
}

function secondsToHours(seconds) {
    'use strict';
    return seconds / (60 * 60);
}

function daysToSeconds(days) {
    'use strict';
    return days * 24 * 60 * 60;
}

function secondsToDays(seconds) {
    'use strict';
    return seconds / (24 * 60 * 60);
}

function formatTimeField(field, value) {
    'use strict';
    return `${value}${field} `;
}

function secondsToTimeLong(secs) {
    'use strict';

    if (isNaN(secs) || secs === Infinity) {
        return '--:--:--';
    }
    if (secs < 0) {
        return '';
    }

    const years = Math.floor(secs / (365 * 24 * 60 * 60));
    const divisor_for_months = secs % (365 * 24 * 60 * 60);
    const months = Math.floor(divisor_for_months / (30 * 24 * 60 * 60));
    const divisor_for_days = divisor_for_months % (30 * 24 * 60 * 60);
    const days = Math.floor(divisor_for_days / (24 * 60 * 60));
    const divisor_for_hours = divisor_for_days % (24 * 60 * 60);
    const hours = uplpad(Math.floor(divisor_for_hours / (60 * 60)), 2);
    const divisor_for_minutes = divisor_for_hours % (60 * 60);
    const minutes = uplpad(Math.floor(divisor_for_minutes / 60), 2);
    const divisor_for_seconds = divisor_for_minutes % 60;
    const seconds = uplpad(Math.floor(divisor_for_seconds), 2);

    const fields = ['y', 'm', 'd', 'h', 'm'];
    const values = [years, months, days, hours, minutes];
    const time_fields = [];

    for (let i = 0; i < values.length; i++) {
        if (values[i] > 0) {
            for (let j = i; j < values.length; j++) {
                time_fields.push(formatTimeField(fields[j], values[j]));
            }
            break;
        }
    }

    time_fields.push(`${seconds}s `);

    return time_fields.join('');
}

/**
 * Calculate the number of days since the given date
 * @param {String} dateStr The date string, in YYYY-MM-DD format
 * @returns {Number} the number of days
 */
function daysSince(dateStr) {
    'use strict';
    return moment(new Date()).diff(moment(dateStr, 'YYYY-MM-DD'), 'days');
}

/**
 * Calculate the number of days since Jan 1, 2000
 * @returns {Number}
 */
function daysSince1Jan2000() {
    'use strict';
    return daysSince('2000-01-01');
}

/**
 * Function to format currency with current locale
 * @param {Number} value Value to format
 * @param {String} [currency] Currency to use in currency formatting. Default: 'EUR'
 * @param {String} [display] display type of currency format, supporting types are below:
 *                  'symbol' - use a localized currency symbol but with country code such as "NZ$",
 *                  'narrowSymbol' - use a localized currency symbol without country code such as "$" for "NZ$",
 *                  'code' - use the ISO currency code such as "NZD",
 *                  'name' - use a localized currency name such as "dollar"
 *                  'number' - just number with correct decimal
 * @param {Boolean} noDecimals If the number should be displayed without decimals
 * @returns {String} formated currency value
 */
function formatCurrency(value, currency, display, noDecimals) {

    'use strict';

    value = typeof value === 'string' ? parseFloat(value) : value;
    currency = currency || 'EUR';
    display = display || 'symbol';

    var displayNumber = false;
    var narrowSymbol = false;

    if (display === 'number') {
        display = 'code';
        displayNumber = true;
    }

    if (display === 'narrowSymbol') {
        display = 'symbol';
        narrowSymbol = currency !== 'EUR'; // Euro cannot have country
    }

    const cnl = getCountryAndLocales();
    let locales = cnl.locales;

    // If locale is Arabic and country is non-Arabic country or non set,
    if (locale === 'ar' && arabics.indexOf(cnl.country) < 0) {
        // To avoid Chrome bug, set Egypt as default country.
        locales = 'ar-EG';
    }

    var options = {'style': 'currency', 'currency': currency, currencyDisplay: display};

    if (noDecimals) {
        options.maximumFractionDigits = 0;
        options.minimumFractionDigits = 0;
    }

    var result = value.toLocaleString(locales, options);

    // For Safari that 'symbol' result same as 'code', using fallback locale without country code to avoid the bug.
    if (display === 'symbol' && result.indexOf(currency.toUpperCase()) !== -1) {

        // Romanian with Euro Symbol currency display is currently buggy on all browsers, so doing this to polyfill it
        if (locales.startsWith('ro')) {
            result = value.toLocaleString('fr', options);
        }
        else {
            result = value.toLocaleString(locale, options);
        }
    }

    // Polyfill for narrow symbol format as lacking support on Safari and old browers
    if (narrowSymbol) {

        // Cover NZ$, $NZ kinds case to just $ and not change something like NZD
        result = result.replace(/\b[A-Z]{2}\b/, '');
    }

    // If this is number only, remove currency code
    if (displayNumber) {
        result = result.replace(currency, '').trim();
    }

    if (locale === 'fr' && display === 'symbol') {
        result = result.replace(/([^1-9A-Za-z])([A-Z]{2})/, '$1 $2');
    }

    return result;
}

/**
 * Function to return percentage structure as it is difference on some locale.
 * @param {Number} value Value to format
 * @param {Boolean} twoDecimals If the number should be displayed with 2 decimals
 * @returns {String} Formateed percentage value with curreny locales
 */
function formatPercentage(value, twoDecimals) {

    'use strict';

    twoDecimals = twoDecimals || false;
    const locales = getCountryAndLocales().locales;
    const options = {'style': 'percent'};

    if (twoDecimals) {
        options.maximumFractionDigits = 2;
        options.minimumFractionDigits = 2;
    }

    return value.toLocaleString(locales, options);
}

/**
 * Function to return locales(e.g. en-GB, en-NZ...) and country code
 * @returns {Object} currently selected country and locales that user chosen
 */
function getCountryAndLocales() {

    'use strict';

    let country = 'ISO';
    let locales = '';

    // If user logged in and country data is set on Mega, using it.
    if (u_attr && u_attr.country) {
        country = u_attr.country;
        locales = locale + '-' + country;
    }
    // Otherwise, try grab country data from browser's navigator.languages
    else if (navigator.languages) {

        locales = navigator.languages.filter(l => l !== locale && l.startsWith(locale))[0];

        if (locales) {
            country = locales.replace(`${locale}-`, '');
        }
    }

    // cnl is exist and has same country as u_attr return cached version.
    if ($.cnl && $.cnl.country === country) {
        return $.cnl;
    }

    locales = mega.intl.test(locales) || mega.intl.test(locale) || 'ISO';

    return $.cnl = {country: country, locales: locales};
}

//----------------------------------------------------------------------------
/**
 * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
 * (c) 2011 Colin Snover <http://zetafleet.com>
 * Released under MIT license.
 */
(function(Date, undefined) {
    var origParse = Date.parse,
        numericKeys = [1, 4, 5, 6, 7, 10, 11];
    Date.parse = function(date) {
        var timestamp, struct, minutesOffset = 0;

        // ES5 15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
        // before falling back to any implementation-specific date parsing, so that's what we do, even if native
        // implementations could be faster
        //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 +    10 tzHH    11 tzmm
        if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
            // avoid NaN timestamps caused by "undefined" values being passed to Date.UTC
            for (var i = 0, k; (k = numericKeys[i]); ++i) {
                struct[k] = +struct[k] || 0;
            }

            // allow undefined days and months
            struct[2] = (+struct[2] || 1) - 1;
            struct[3] = +struct[3] || 1;

            if (struct[8] !== 'Z' && struct[9] !== undefined) {
                minutesOffset = struct[10] * 60 + struct[11];

                if (struct[9] === '+') {
                    minutesOffset = 0 - minutesOffset;
                }
            }

            timestamp = Date.UTC(struct[1],
                struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
        }
        else {
            timestamp = origParse ? origParse(date) : NaN;
        }

        return timestamp;
    };
}(Date));


/**
 * Returns "Today" (or "Today, 16:32" if verbose is true) if  the specific timestamp was in the past 2 days, otherwise
 * uses an absolute date stamp (1st June 2020)
 *
 * @param {Number} unixtime
 * @param {Boolean} [verbose]
 * @returns {String}
 */
function getTimeMarker(unixtime, verbose) {
    'use strict';
    var result;
    if (todayOrYesterday(unixtime * 1000)) {
        // if in last 2 days, use the time2lastSeparator
        var iso = (new Date(unixtime * 1e3)).toISOString();
        result = time2lastSeparator(iso) + (verbose ? ", " + unixtimeToTimeString(unixtime) : "");
    }
    else {
        // if not in the last 2 days, use 1st June [Year]
        result = acc_time2date(unixtime, false);
    }
    return result;

}

//----------------------------------------------------------------------------

// eslint-disable-next-line complexity
mBroadcaster.once('boot_done', function populate_l() {
    'use strict';
    var i;

    if (d) {
        const loaded = l;
        window.dstringids = localStorage.dstringids;
        l = new Proxy(loaded, {
            get: (target, prop) => {
                if (dstringids) {
                    return `[$${prop}]`;
                }

                return target[prop] ? target[prop] : `(missing-$${prop})`;
            }
        });
    }

    l[0] = 'MEGA ' + new Date().getFullYear();
    if ((lang === 'es') || (lang === 'pt') || (lang === 'sk')) {
        l[0] = 'MEGA';
    }

    l[8762] = l[8762].replace("[S]", "<span class='red'>").replace("[/S]", "</span>");
    l['208a'] = l[208].replace('[A]', '<a href="/terms" class="red clickurl" tabindex="-1">');
    l['208a'] = l['208a'].replace('[/A]', '</a>');
    l['208.a2'] = l[208].replace('[A]', '<a href="/terms" tabindex="-1">');
    l['208.a2'] = l['208.a2'].replace('[/A]', '</a>');
    l['208s'] = l[208].replace('[A]', '<a class="red txt-bold" href="#">').replace('[/A]', '</a>');
    l['208.g'] = l[208].replace('[A]', '<a class="green">').replace('[/A]', '</a>');
    l['208.g2'] = l[208].replace('[A]', '<a href="/terms" class="green clickurl" target="_blank">')
        .replace('[/A]', '</a>');
    l[208] = l[208].replace('[A]', '<a href="/terms" class="clickurl" tabindex="-1">');
    l[208] = l[208].replace('[/A]', '</a>');
    l[517] = l[517].replace('[A]', '<a href="/help" class="help-center-link clickurl">').replace('[/A]', '</a>');
    l[1094] = l[1094].replace('[A]', '<a href="/extensions" class="clickurl">').replace('[/A]', '</a>');
    l[1095] = l[1095].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[731] = l[731].replace('[A]', '<a href="/terms" class="clickurl">').replace('[/A]', '</a>');
    l[1274] = l[1274].replace('[A]', '<a href="/takedown" class="clickurl">').replace('[/A]', '</a>');
    l[1275] = l[1275].replace('[A]', '<a href="/copyright" class="clickurl">').replace('[/A]', '</a>');
    l[1942] = l[1942].replace('[A]', '<a href="/keybackup" class="clickurl">').replace('[/A]', '</a>');
    l[1943] = l[1943].replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[1982] = l[1982].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[5931] = l[5931].replace('[A]', '<a href="/fm/account" class="clickurl">').replace('[/A]', '</a>');
    l[6216] = l[6216]
        .replace('[A1]', '<a href="/fm/account/security/change-email" class="clickurl">')
        .replace('[/A1]', '</a>')
        .replace('[A2]', '<a href="mailto:support@mega.nz">')
        .replace('[/A2]', '</a>');
    l[6976] = l[6976].replace('%1', '<span class="plan-name"></span>');
    l[7156] = l[7156].replace('[A]', '<a href="/mobile" class="clickurl">').replace('[/A]', '</a>');
    l[7202] = l[7202].replace('[A]', '<a href="/resellers" class="voucher-reseller-link clickurl">')
                     .replace('[/A]', '</a>');
    l[7709] = l[7709].replace('[S]', '<span class="complete-text">').replace('[/S]', '</span>');
    l[7945] = l[7945].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[7991] = l[7991].replace('%1', '<span class="provider-icon"></span><span class="provider-name"></span>');
    l[7996] = l[7996].replace('[S]', '<span class="purchase">').replace('[/S]', '</span>');

    l[8436] = l[8436].replace('[/A]', '</a>').replace('[A]', '<a class="red" href="mailto:support@mega.nz">');
    l[8440] = l[8440].replace('[A]', '<a href="https://github.com/meganz/">').replace('[/A]', '</a>');
    l[8440] = l[8440].replace('[A2]', '<a href="/contact" class="clickurl">').replace('[/A2]', '</a>');
    l[8441] = l[8441].replace('[A]', '<a href="mailto:bugs@mega.nz">').replace('[/A]', '</a>');
    l[8441] = l[8441]
        .replace('[A2]', `<a href="https://blog.mega.io/vulnerability-rewards-the-first-week"  target="_blank">`)
        .replace('[/A2]', '</a>');
    l[19310] = l[19310]
        .replace('[A]', `<a href="https://blog.mega.io/the-mega-vulnerability-reward-program" target="_blank">`)
        .replace('[/A]', '</a>');


    l[8644] = l[8644].replace('[S]', '<span class="green">').replace('[/S]', '</span>');
    l[8651] = l[8651].replace('%1', '<span class="header-pro-plan"></span>');
    l[8653] = l[8653].replace('[S]', '<span class="renew-text">').replace('[/S]', '</span>');
    l[8653] = l[8653].replace('%1', '<span class="pro-plan"></span>');
    l[8653] = l[8653].replace('%2', '<span class="plan-duration"></span>');
    l[8653] = l[8653].replace('%3', '<span class="provider-icon"></span>');
    l[8653] = l[8653].replace('%4', '<span class="gateway-name"></span>');
    l[8654] = l[8654].replace('[S]', '<span class="choose-text">').replace('[/S]', '</span>');

    l[8833] = l[8833].replace('[B]', '<strong>').replace('[/B]', '</strong>');
    l[8850] = l[8850].replace('%1', '<span class="release-version"></span>');
    l[8851] = l[8851].replace('%1', '<span class="release-date-time"></span>');
    l[8855] = l[8855].replace('[BR]', '<br>');
    l[8912] = l[8912].replace('[B]', '<span>').replace('[/B]', '</span>');
    l[8846] = l[8846].replace('[S]', '').replace('[/S]', '');
    l[8847] = l[8847].replace('[S]', '').replace('[/S]', '');
    l[8950] = l[8950].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[8951] = l[8951].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[8952] = l[8952].replace('[S]', '<span>').replace('[/S]', '</span>');

    l[10631] = l[10631].replace('[A]',
        '<a href="https://mega.nz/terms/refunds" target="_blank" rel="noopener noreferrer">').replace('[/A]', '</a>');
    l[10630] = l[10630].replace('[A]',
        '<a href="https://mega.nz/terms/refunds" target="_blank" rel="noopener noreferrer">').replace('[/A]', '</a>');
    l[10634] = l[10634].replace('[A]', '<a href="https://mega.nz/support" target="_blank" rel="noopener noreferrer">')
                       .replace('[/A]', '</a>');

    l[10635] = l[10635].replace('[B]', '<b>').replace('[/B]', '</b>');

    l[12482] = l[12482].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[12483] = l[12483].replace('[BR]', '<br>');
    l[12487] = l[12487].replace('[A1]', '<a href="" class="red windows">').replace('[/A1]', '</a>');
    l[12487] = l[12487].replace('[A2]', '<a href="" class="red linux">').replace('[/A2]', '</a>');
    l[12488] = l[12488].replace('[A]', '<a>').replace('[/A]', '</a>').replace('[BR]', '<br>');
    l[16116] = l[16116].replace('[S]', '<span class="red">').replace('[/S]', '</span>');

    l.bus_acc_delete_msg = l.bus_acc_delete_msg.replace('[S]', '<span class="red">').replace('[/S]', '</span>');

    l[16167] = l[16167].replace('[A]', '<a href="/mobile" class="clickurl">').replace('[/A]', '</a>');
    l[16301] = l[16301].replace('[S]', '<span class="quota-info-pr-txt-used">').replace('[/S]', '</span>');
    l[16306] = escapeHTML(l[16306])
        .replace('[A]', '<a href="/fm/rubbish" class="clickurl gotorub">').replace('[/A]', '</a>');
    l[16310] = escapeHTML(l[16310])
        .replace('[A]', '<a href="/fm/dashboard" class="clickurl dashboard-link">').replace('[/A]', '</a>');
    l[16317] = escapeHTML(l[16317]).replace('[S]', '<strong>').replace('[/S]', '</strong>');
    l[16494] = escapeHTML(l[16494]).replace('[S]2[/S]', '%1');
    l[25048] = escapeHTML(l[25048])
        .replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[25050] = escapeHTML(l[25050])
        .replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[25081] = escapeHTML(l[25081])
        .replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>');

    l[16649] = l[16649].replace('%1', '<span class="amount">10.00</span>');
    l[16501] = l[16501].replace('[A1]', '<a class="red" href="mailto:support@mega.nz">').replace('[/A1]', '</a>')
        .replace('[A2]', `<a class="red" target="_blank" href="${getBaseUrl()}/help/client/android/accounts-and-pro-` +
            `accounts#how-can-i-cancel-the-renewal-of-my-mega-subscription-57733f8b886688e7028b45cf">`)
        .replace('[/A2]', '</a>')
        .replace('[A3]', `<a class="red" target="_blank" href="${getBaseUrl()}/help/client/ios/accounts-and-pro-` +
            `accounts#how-does-mega-pro-account-subscription-work-with-apple-in-app-purchases` +
            `-57732e9f886688e7028b45bd">`)
        .replace('[/A3]', '</a>');
    l[16614] = escapeHTML(l[16614])
        .replace('[A]', '<a class="red" href="https://thunderbird.net/" target="_blank" rel="noopener noreferrer">')
        .replace('[/A]', '</a>');
    l[16865] = escapeHTML(l[16865]).replace('[A]', '<a href="/desktop" class="clickurl">').replace('[/A]', '</a>');
    l[16866] = escapeHTML(l[16866]).replace('[A]', '<a href="/desktop" class="clickurl">').replace('[/A]', '</a>');
    l[16870] = escapeHTML(l[16870]).replace('[A]', '<a href="/desktop" class="clickurl">').replace('[/A]', '</a>');
    l[16883] = escapeHTML(l[16883]).replace('[A]', '<a href="/desktop" class="clickurl">').replace('[/A]', '</a>');
    l[17793] = escapeHTML(l[17793])
        .replace('[A1]', '<a href="/desktop" class="clickurl">').replace('[/A1]', '</a>')
        .replace('[A2]', '<a href="/extensions" class="clickurl">').replace('[/A2]', '</a>')
        .replace('[A3]', '<a class="freeupdiskspace">').replace('[/A3]', '</a>');

    l[17083] = l[17083]
        .replace('[A]', '<a href="https://www.microsoft.com/store/apps/9nbs1gzzk3zg" target="_blank">')
        .replace('[/A]', '</a>');

    var linktohelp = `https://help.mega.io/files-folders/restore-delete/file-version-history`;
    l[17097] =  l[17097]
                .replace('[A]', '<a id="versionhelp" href="' + linktohelp + '" target="_blank" class="red">')
                .replace('[/A]', '</a>');
    l[17690] = l[17690].replace('[A]', '<a href="https://mega.nz/recovery" target="_blank" class="red">')
                       .replace('[/A]', '</a>');
    l[17701] = l[17701].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[17742] = escapeHTML(l[17742]).replace('[S]', '<strong>').replace('[/S]', '</strong>');
    l[17805] = l[17805].replace('[A]', '<a class="mobile red-email" href="mailto:support@mega.nz">')
                       .replace('[/A]', '</a>');
    l[18301] = l[18301].replace(/\[B\]/g, '<b class="megasync-logo">')
        .replace(/\[\/B\]/g, '</b>').replace(/\(M\)/g, '').replace(/\[LOGO\]/g, '');
    l[18311] = l[18311].replace(/\[B1\]/g, '<strong class="warning-text">')
        .replace(/\[\/B1\]/g, '</strong>');
    l[18312] = l[18312].replace(/\[B\]/g, '<strong class="warning-text">')
        .replace(/\[\/B\]/g, '</strong>');

    l[18638] = l[18638].replace(/\[+[B1-9]+\]/g, '<b>').replace(/\[\/+[B1-9]+\]/g, '</b>');
    l[18787] = l[18787]
        .replace('[A]', '<a href="https://github.com/meganz/MEGAcmd" rel="noreferrer" target="_blank">')
        .replace('[/A]', '</a>');
    l[19111] = l[19111].replace('[A]', `<a class="public-contact-link simpletip" data-simpletip="${l[18739]}">`)
        .replace('[/A]', '</a>');
    l[19328] = l[19328].replace('[B]', '<b>').replace('[/B]', '</b>');

    l[19512] = l[19512].replace('%1', '<span class="plan-name"></span>')
        .replace('%2', '<span class="user-email"></span>').replace('[B]', '<b>').replace('[/B]', '</b>');
    l[19513] = l[19513].replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>').replace('%1', 2)
        .replace('%2', '<span class="user-email"></span>').replace('[B]', '<b>').replace('[/B]', '</b>');
    l[19514] = l[19514].replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>').replace('%1', 2)
        .replace('%2', '<span class="user-email"></span>').replace('[B]', '<b>').replace('[/B]', '</b>');
    l[19661] = l[19661].replace('[A]', '<a href="/help/client/megasync/" class="clickurl" rel="noreferrer">')
        .replace('[/A]', '</a>');
    l[19685] = l[19685].replace('[S]', '<span class="bold">').replace('[/S]', '</span>');
    l[19691] = l[19691].replace('[S]', '<span class="bold">').replace('[/S]', '</span>');
    l[19834] = l[19834].replace('[A]', '<a class="red" href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[19835] = l[19835].replace('[A]', '<a class="red" href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[19840] = l[19840].replace('[A]', '<a class="toResetLink">').replace('[/A]', '</a>');
    l[19843] = l[19843].replace('[A]', '<a class="red" href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[23052] = l[23052].replace('[A]', '<a class="red" href="mailto:business@mega.nz">').replace('[/A]', '</a>');
    l[19849] = l[19849].replace('[A]', '<a class="red clickurl" href="/recovery">').replace('[/A]', '</a>');
    l[19851] = l[19851].replace('[B]', '<strong class="warning-text">').replace('[/B]', '</strong>');
    l[19857] = l[19857] ? l[19857].replace('[BR]', '<br>') : l[19857];
    l[20015] = l[20015].replace('[A]', '<a target="_blank" class="red" rel="noopener noreferrer" href="https://mega.nz'
        + '/keybackup">')
        .replace('[/A]', '</a>');
    l[20189] = l[20189].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[20192] = l[20192].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[20193] = l[20193].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[20194] = l[20194].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[20195] = l[20195].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[23708] = l[23708].replace('[B]', '<strong>').replace('[/B]', '</strong>');
    l[23709] = l[23709].replace('[B]', '').replace('[/B]', '');
    l['23789.s'] = escapeHTML(l[23789]).replace('%1', '<span></span>');
    l['23790.s'] = escapeHTML(l[23790]).replace('%1', '<span></span>');

    // Mobile only
    if (is_mobile) {
        l[20197] = l[20197].replace('[S1]', '<span class="used">').replace('[/S1]', '</span>\n').replace('[S2]', '')
            .replace('[/S2]', '\n').replace('[S3]', '<span class="total">').replace('[/S3]', '</span>\n')
            .replace('$1', '0').replace('$2', '0') + '<br>';
        l[20220] = l[20220].replace('%1', '<span class="mobile user-number js-user-phone-number"></span>');
    }
    else {
        // Desktop only
        l[20197] = l[20197].replace('[S1]', '<span class="size-txt">').replace('[/S1]', '</span>')
            .replace('[S2]', '<span class="of-txt">').replace('[/S2]', '</span>\n')
            .replace('[S3]', '<span class="pecents-txt">').replace('[/S3]', '</span>\n<span class="gb-txt">GB</span>')
            .replace('$1', '0 MB').replace('$2', '0');
    }

    l[20223] = l[20223].replace('%1', '24');  // 24 hours

    // Keep the word 'a' with the previous word by using non breaking space (TR76417)
    if (lang === 'es') {
        l[20217] = l[20217].replace(' a:', '&nbsp;a:');
    }
    l[20552] = l[20552].replace('[Br]', '<br>');
    l[20553] = l[20553].replace('[S]', '<strong>').replace('[/S]', '</strong>');
    l[20588] = l[20588].replace('[A]', '<a class="clickurl" href="/security">')
        .replace('[/A]', '</a>');
    l[20592] = l[20592].replace('[A1]', '').replace('[/A1]', '');
    l[20592] = l[20592].replace('[A2]', '<a target="_blank" rel="noopener noreferrer"'
        + 'href="https://mega.nz/SecurityWhitepaper.pdf">').replace('[/A2]', '</a>');
    l[20609] = l[20609].replace('[A]', '<a class="clickurl" href="/desktop">').replace('[/A]', '</a>');
    l[20846] = l[20846]
        .replace('[A]', '<a href="https://mega.nz/linux/repo/" target="_blank" class="download-all-link">')
        .replace('[/A]', '</a>');
    l['20635.a'] = escapeHTML(l[20635]).replace('[A]', '<a class="clickurl" href="/register">').replace('[/A]', '</a>');
    l[20635] = escapeHTML(l[20635]).replace('[A]', '<a>').replace('[/A]', '</a>');
    l[20713] = escapeHTML(l[20713]).replace('[B]%1[/B]', '<b>%1</b>');
    l[20714] = escapeHTML(l[20714])
        .replace('[B1]%1[/B1]', '<b class="plan-time">%1</b>')
        .replace('[B2]%2[/B2]', '<b class="plan-name">%2</b>');
    l[20756] = escapeHTML(l[20756]).replace('[S]', '<span>').replace('[/S]', '</span>');
    l[20757] = escapeHTML(l[20757]).replace('[S]', '<span>').replace('[/S]', '</span>');
    l[20759] = escapeHTML(l[20759]).replace('[B]%1[/B]', '<b>%1</b>');
    l[20923] = escapeHTML(l[20923]).replace('[S]', '<span>').replace('[/S]', '</span>');
    l[20924] = escapeHTML(l[20924]);
    l[20932] = l[20932].replace('[R/]', '<sup>&reg;</sup>');
    l[20959] = l[20959].replace('[A]', '<a class="red" href="https://mega.nz/SecurityWhitepaper.pdf" '
        + 'target="_blank" rel="noopener noreferrer">')
        .replace('[/A]', '</a>');
    l['20975.b'] = escapeHTML(l[20975]).replace('[B]', '<b class="txt-dark">').replace('[/B]', '</b>')
        .replace('[A]', '<a href="/security" class="clickurl green" target="_blank">').replace('[/A]', '</a>');
    l[20975] = escapeHTML(l[20975]).replace('[B]', '<b class="txt-dark">').replace('[/B]', '</b>')
        .replace('[A]', '<a href="/security" class="clickurl red txt-bold" target="_blank">').replace('[/A]', '</a>');
    l[23748] = escapeHTML(l[23748]).replace('[B]', '<b class="txt-dark">').replace('[/B]', '</b>')
        .replace('[A]', '<a href="/security" class="clickurl red txt-bold" target="_blank">').replace('[/A]', '</a>');
    l[22074] = l[22074].replace('[S]', '<span class="purchase">').replace('[/S]', '</span>');
    l[22077] = l[22077].replace('[S]', '<span class="green strong">').replace('[S]', '</span>');
    l[22247] = l[22247].replace(/\[S]/g, '<strong>').replace(/\[\/S]/g, '</strong>');
    l[22685] = l[22685].replace('[B]', '<strong>').replace('[/B]', '</strong>');
    l[22687] = l[22687].replace('[B]', '<strong>').replace('[/B]', '</strong>');
    l[22688] = l[22688].replace('[B]', '<strong>').replace('[/B]', '</strong>');
    l[22689] = l[22689].replace('[B]', '<strong>').replace('[/B]', '</strong>');
    l[22696] = l[22696].replace('[A]', '<a class="clickurl" href="/pro">').replace('[/A]', '</a>')
        .replace('[S]', '<span class="no-buisness">').replace('[/S]', '</span>');
    l[22700] = l[22700].replace('[S]', '<i class="sprite-fm-mono icon-up"></i><span>')
        .replace('[/S]', '</span>').replace('%1', '');
    l[22723] = l[22723].replace('[B]', '<strong>').replace('[/B]', '</strong>');
    l['22725.m'] = l[22725].replace('[B]', '<strong>').replace('[/B]', '*</strong>');
    l[22725] = l[22725].replace('[B]', '<strong>').replace('[/B]', '</strong>');
    l['22726.m'] = l[22726].replace('[B]', '<strong>').replace('[/B]', '*</strong>');
    l[22726] = l[22726].replace('[B]', '<strong>').replace('[/B]', '</strong>');
    l[22764] = l[22764].replace('[S]', '<span class="calc-price-week">').replace('[/S]', '</span>').replace('%1', '');
    l['22771.a'] = l[22771].replace('[B]', '').replace('[/B]', '');
    l[22771] = l[22771].replace('[B]', '<strong>').replace('[/B]', '</strong>');
    l['22772.a'] = l[22772].replace('[B]', '').replace('[/B]', '');
    l[22772] = l[22772].replace('[B]', '<strong>').replace('[/B]', '</strong>');
    l[22773] = l[22773].replace('[B]', '').replace('[/B]', '');
    l[22786] = l[22786].replace('[A]', '<a href="/pro" class="clickurl">').replace('[/A]', '</a>');
    l[22791] = l[22791].replace('[A]', '<a class="to-aff-dash">').replace('[/A]', '</a>');
    l[22793] = l[22793].replace('[A1]', '<a class="clickurl" href="/business">').replace('[/A1]', '</a>')
        .replace('[A2]', '<a class="clickurl" href="/pro">').replace('[/A2]', '</a>');
    l[22795] = l[22795].replace('[A]', '<a class="to-aff-dash">').replace('[/A]', '</a>')
        .replace(/\[BR]/g, '<br/>');
    l[22796] = l[22796].replace('[A]', '<a href="/contact" class="clickurl" target="_blank">').replace('[/A]', '</a>');
    l[22882] = l[22882].replace('[A]', '<a class="clickurl" href="/pro">').replace('[/A]', '</a>')
        .replace('[S]', '<span class="no-buisness">').replace('[/S]', '</span>')
        .replace('[B]', '<b>').replace('[/B]', '</b>');
    l[22898] = l[22898].replace('[A]', '<a class="clickurl" href="/mobile">').replace('[/A]', '</a>')
        .replace('[BR]', '<br>');
    l[22900] = l[22900].replace('[A]', '<a class="reg-success-change-email-btn">').replace('[/A]', '</a>');
    l['23062.k'] = l[23062].replace('[%s]', l[7049]);
    l[23067] = l[23067].replace('[S]', '<span class="num">').replace('[/S]', '</span>')
        .replace('%1', '<span></span>');
    l[23068] = l[23068].replace('[S]', '<span class="num">').replace('[/S]', '</span>')
        .replace('%1', '<span></span>');
    l[23069] = l[23069].replace('[S]', '<span class="num">').replace('[/S]', '</span>')
        .replace('%1', '<span></span>');
    l.about_countries_info_text = l.about_countries_info_text
        .replace('[S]', '<span class="num">').replace('[/S]', '</span>')
        .replace('%1', '<span></span>');
    l[23120] = escapeHTML(l[23120].replace(/&quot;|"/g, '%1')).replace(/%1/g, '"');
    l[23126] = escapeHTML(l[23126].replace(/&quot;|"/g, '%1')).replace(/\[BR]/g, '<br/>').replace(/%1/g, '"');
    l[23181] = escapeHTML(l[23181].replace(/&quot;|"/g, '%1')).replace(/%1/g, '"')
        .replace('[A]', '<a class="clickurl" href="/terms" target="_blank">')
        .replace('[/A]', '</a>');
    l['23181.d'] = l[23181]
        .replace(/\[P]/g, '').replace(/\[\/P]/g, '')
        .replace(/\[L]/g, '<i class="sprite-fm-mono icon-check"></i><div class="affiliate-guide info">')
        .replace(/\[\/L]/g, '</div>')
        .replace(/\[BLOCK]/g, '').replace(/\[\/BLOCK]/g, '').replace(/\[BR]/g, '<br>');
    l['23181.m'] = l[23181]
        .replace(/\[P]/g, '<div class="mobile button-block no-bg"><div class="mobile label-info no-icon">')
        .replace(/\[\/P]/g, '</div></div>')
        .replace(/\[L]/g, '<div class="mobile button-block no-bg"><div class="mobile fm-icon green-tick">' +
            '</div><div class="mobile label-info">').replace(/\[\/L]/g, '</div></div>')
        .replace(/\[BLOCK]/g, '').replace(/\[\/BLOCK]/g, '').replace(/\[BR]/g, '');
    l[23181] = l[23181]
        .replace(/\[P]/g, '').replace(/\[\/P]/g, '')
        .replace(/\[L]/g, '<div class="bottom-page list-item">' +
            '<i class="bottom-page icon x12 new-pages-sprite tick"></i>').replace(/\[\/L]/g, '</div>')
        .replace(/\[BR]/g, '<br>')
        .replace(/\[BLOCK]/g, '<div class="inline-block col-2 affiliate-list"><div class="bottom-page fadein list">')
        .replace(/\[\/BLOCK]/g, '</div></div>');
    l[23214] = escapeHTML(l[23214]).replace('[A]', '<a class="fm-affiliate guide-dialog to-rules">')
        .replace('[/A]', '</a>');
    l[23243] = escapeHTML(l[23243]).replace('[A]', '<a href="/terms" class="clickurl">').replace('[/A]', '</a>');
    l[23263] = escapeHTML(l[23263]).replace('[A]', '<a>').replace('[/A]', '</a>');
    l[23332] = escapeHTML(l[23332]).replace('[A1]', '<a href="/cmd" target="_blank" class="clickurl">')
        .replace('[/A1]', '</a>')
        .replace('[A2]', '<a href="https://www.qnap.com/en/app_center/' +
            '?qts=4.3&kw=megacmd&type_choose=&cat_choose=" target="_blank" rel="noopener noreferrer">')
        .replace('[/A2]', '</a>')
        .replace('[A3]', '<a href="https://www.synology.com/en-nz/dsm/packages/MEGAcmd' +
            '" target="_blank" rel="noopener noreferrer">')
        .replace('[/A3]', '</a>');
    l[23354] = escapeHTML(l[23354]).replace('[A]', '<a href="/pro" class="clickurl">')
        .replace('[/A]', '</a>');
    l[23370] = l[23370].replace('[A]', '<a class="mailto" href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[23371] = l[23371].replace('[A]', '<a class="mailto" href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[23372] = l[23372].replace('[A]', '<a class="mailto" href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[23373] = l[23373].replace('[A]', '<a class="mailto" href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[23376] = escapeHTML(l[23376]).replace('[A]', '<a href="/security" class="clickurl" target="_blank">')
        .replace('[/A]', '</a>');
    l[24074] = escapeHTML(l[24074]).replace('[A]', '<a>').replace('[/A]', '</a>');
    l[24141] = escapeHTML(l[24141])
        .replace(
            '[A]',
            `<a class="red" href="https://blog.mega.io/mega-adds-two-factor-authentication" target="_blank">`)
        .replace('[/A]', '</a>');
    l[24431] = escapeHTML(l[24431]).replace('[A]', '<a href="/repay" class="clickurl">').replace('[/A]', '</a>')
        .replace('[S]', '<span>').replace('[/S]', '</span>');
    l[24440] = l[24440].replace('[B]', '<strong>').replace('[/B]', '</strong>');
    l[24408] = l[24408].replace('[A]', '<a href="/fm" class="clickurl">').replace('[/A]', '</a>');
    l[24409] = l[24409].replace('[A]', '<a href="/register" class="clickurl">').replace('[/A]', '</a>');
    l[24547] = escapeHTML(l[24547]).replace('[A1]', '<a target="_blank" href="/sourcecode" class="clickurl">')
        .replace('[/A1]', '</a>')
        .replace('[A2]', '<a target="_blank" href="/security" class="clickurl">')
        .replace('[/A2]', '</a>')
        .replace(/\[S]/g, '<span>').replace(/\[\/S]/g, '</span>')
        .replace(/\[BR]/g, '<br/>');
    l[24708] = escapeHTML(l[24708]).replace('[LT]', '<').replace('[GT]', '>');
    l[24852] = escapeHTML(l[24852])
        .replace('[A]', '<a target="_blank" class="green-link" href="https://blog.mega.io">')
        .replace('[/A]', '</a>');
    l.achievem_dialogfootertext = escapeHTML(l.achievem_dialogfootertext)
        .replace('[A]', '<a href="/pro" class="clickurl">')
        .replace('[/A]', '</a>');
    l.achievem_pagedesc = escapeHTML(l.achievem_pagedesc)
        .replace('[S]', '<span>')
        .replace('[/S]', '</span>');
    l.achievem_storagetitle = escapeHTML(l.achievem_storagetitle)
        .replace('[S]', '<span>')
        .replace('[/S]', '</span>');
    l.bsn_calc_min_storage = escapeHTML(l.bsn_calc_min_storage)
        .replace('[BR]', '<br>');
    l.bsn_calc_min_transfer = escapeHTML(l.bsn_calc_min_transfer)
        .replace('[BR]', '<br>');
    l.bsn_calc_total = escapeHTML(l.bsn_calc_total)
        .replace('[S]', '<span>')
        .replace('[/S]', '</span>')
        .replace('%1', '');
    l.bsn_page_plan_price = escapeHTML(l.bsn_page_plan_price)
        .replace('[S]', '<span>')
        .replace('[/S]', '</span>')
        .replace('%1', '');
    l.bsn_plan_users = escapeHTML(l.bsn_plan_users).replace('%1', '<span></span>');
    l.bsn_plan_storage = escapeHTML(l.bsn_plan_storage).replace('%1', '<span></span>');
    l.bsn_plan_transfer = escapeHTML(l.bsn_plan_transfer).replace('%1', '<span></span>');
    l.bsn_plan_more_users = escapeHTML(l.bsn_plan_more_users)
        .replace('[B]', '<strong>')
        .replace('[/B]', '</strong>')
        .replace('%1', '');
    l.bsn_plan_more_storage = escapeHTML(l.bsn_plan_more_storage)
        .replace('[B]', '<strong>')
        .replace('[/B]', '</strong>')
        .replace('%1', '');
    l.bsn_plan_more_transfer = escapeHTML(l.bsn_plan_more_transfer)
        .replace('[B]', '<strong>')
        .replace('[/B]', '</strong>')
        .replace('%1', '');
    l.bsn_versioning_info = escapeHTML(l.bsn_versioning_info)
        .replace('[S]', '<span>')
        .replace('[/S]', '</span>')
        .replace('[BR]', '<br>');
    l.bsn_backup_info = escapeHTML(l.bsn_backup_info)
        .replace('[S]', '<span>')
        .replace('[/S]', '</span>')
        .replace('[BR]', '<br>');
    l.bsn_meetings_info = escapeHTML(l.bsn_meetings_info)
        .replace('[S]', '<span>')
        .replace('[/S]', '</span>')
        .replace('[BR]', '<br>');
    l.onboard_v4_control_finished = escapeHTML(l.onboard_v4_control_finished)
        .replace('[S]', '<span>').replace('[/S]', '</span>')
        .replace('[A]', '<a class="clickurl" href="/help">').replace('[/A]', '</a>');
    l.recovery_web_step_2 = escapeHTML(l.recovery_web_step_2)
        .replace('[B]', '<strong>')
        .replace('[/B]', '</strong>');
    l.recovery_ios_step_2 = escapeHTML(l.recovery_ios_step_2)
        .replace('[B]', '<strong>')
        .replace('[/B]', '</strong>');
    l.warning_has_subs_with_3p = l.warning_has_subs_with_3p
        .replace('[A1]', '<a class="red" href="mailto:support@mega.nz">').replace('[/A1]', '</a>')
        .replace('[A2]', `<a class="red" target="_blank" href="${getBaseUrl()}/help/client/android/accounts-and-pro-` +
            `accounts#how-can-i-cancel-the-renewal-of-my-mega-subscription-57733f8b886688e7028b45cf">`)
        .replace('[/A2]', '</a>')
        .replace('[A3]', `<a class="red" target="_blank" href="${getBaseUrl()}/help/client/ios/accounts-and-pro-` +
            `accounts#how-does-mega-pro-account-subscription-work-with-apple-in-app-purchases` +
            `-57732e9f886688e7028b45bd">`)
        .replace('[/A3]', '</a>');
    l.redeem_etoomany = l.redeem_etoomany
        .replace('[A]', `<a class="clickurl" href="/support">`)
        .replace('[/A]', '</a>');
    l.extensions_top_btn_info = escapeHTML(l.extensions_top_btn_info).replace(/\[R\/]/g, '<sup>&reg;</sup>');
    l.extensions_avbl_desktop = escapeHTML(l.extensions_avbl_desktop).replace('[A1]', '<a href="" class="red a1"></a>');
    l.extensions_avbl_mobile = escapeHTML(l.extensions_avbl_mobile).replace(/\[S]/g, '<strong>')
        .replace(/\[\/S]/g, '</strong>');
    l.cookie_banner_txt = escapeHTML(l.cookie_banner_txt)
        .replace('[A]', '<a href="/cookie" class="clickurl" target="_blank">')
        .replace('[/A]', '</a>');
    l.payment_card_almost_exp = l.payment_card_almost_exp
        .replace('[A]', '<a>').replace('[/A]', '</a>');
    l.payment_card_exp = l.payment_card_exp
        .replace('[A]', '<a>').replace('[/A]', '</a>');

    l.ri_s4_header = l.ri_s4_header
        .replace('[A1]', '<h1>')
        .replace('[/A1]', '</h1>')
        .replace('[A2]', '<h2>')
        .replace('[/A2]', '</h2>');
    l.ri_s4_subheader = l.ri_s4_subheader
        .replace('%1', '&#8364 1,000')
        .replace('[B]', '<strong>')
        .replace('[/B]', '</strong>');
    l.ri_s4_card1_desc = l.ri_s4_card1_desc
        .replace('[B]', '<strong>')
        .replace('[/B]', '</strong>');
    l.ri_s4_card3_desc = l.ri_s4_card3_desc
        .replace('[B]', '<strong>')
        .replace('[/B]', '</strong>');
    l.ri_s4_card4_desc = l.ri_s4_card4_desc
        .replace('%1', '&#8364 2.99')
        .replace('[B]', '<strong>')
        .replace('[/B]', '</strong>');
    l.ri_s4_card5_desc = l.ri_s4_card5_desc
        .replace('[B]', '<strong>')
        .replace('[/B]', '</strong>');
    l.ri_s4_betat_header = l.ri_s4_betat_header
        .replace('%1', '&#8364 1,000');
    l.ri_s4_regf_q6_ans1 = l.ri_s4_regf_q6_ans1
        .replace('[B]', '<strong>')
        .replace('[/B]', '</strong>');
    l.ri_s4_regf_q6_ans2 = l.ri_s4_regf_q6_ans2
        .replace('[B]', '<strong>')
        .replace('[/B]', '</strong>');
    l.ri_s4_regf_success = l.ri_s4_regf_success
        .replace('[BR]', '<br>');
    l.about_vision_desc = escapeHTML(l.about_vision_desc)
        .replace(/\[S]/g, '<span>')
        .replace(/\[\/S]/g, '</span>');
    l.about_vision_title = escapeHTML(l.about_vision_title)
        .replace(/\[S]/g, '<span>')
        .replace(/\[\/S]/g, '</span>');
    l.about_contributors = escapeHTML(l.about_contributors)
        .replace(/\[S]/g, '<span>')
        .replace(/\[\/S]/g, '</span>');
    // cant reduce size
    l.jobs_opportunity_invert_card_desc = escapeHTML(l.jobs_opportunity_invert_card_desc)
        .replace(/\[BR]/g, '<br>');
    l.jobs_grow_invert_card_desc = escapeHTML(l.jobs_grow_invert_card_desc)
        .replace('[BR]', '<br>');
    l.about_job_expressions_txt = escapeHTML(l.about_job_expressions_txt)
        .replace('[BR]', '<br>');
    l.empty_call_dlg_text = l.empty_call_dlg_text
        .replace('[S1]', '<span class="stay-dlg-counter">').replace('[/S1]', '</span>')
        .replace('[S2]', '<div class="stay-dlg-subtext">').replace('[/S2]', '</div>');
    l.meeting_empty_call_desc_1 = escapeHTML(l.meeting_empty_call_desc_1)
        .replace(/\[P]/g, '<div>')
        .replace(/\[\/P]/g, '</div>');
    l.backup_download_recovery_key = escapeHTML(l.backup_setup_2fa_recovery_key)
        .replace('[D1]', '')
        .replace('[/D1]', ' ')
        .replace('[D2]', '(')
        .replace('[/D2]', ')');
    l.backup_setup_2fa_recovery_key = escapeHTML(l.backup_setup_2fa_recovery_key)
        .replace('[D1]', '<div class="recovery-key-name">')
        .replace('[/D1]', '</div>')
        .replace('[D2]', '<div class="recovery-key-size">')
        .replace('[/D2]', '</div>');

    const common = [
        15536, 16107, 16119, 16120, 16136, 16304, 16313, 16316, 16358, 16360, 16361, 16394, 18228, 18268, 18282,
        18284, 18285, 18286, 18287, 18289, 18290, 18291, 18294, 18295, 18296, 18297, 18298, 18302, 18303, 18304,
        18305, 18314, 18315, 18316, 18419, 19807, 19808, 19810, 19811, 19812, 19813, 19814, 19854, 19821, 20402,
        20462, 20969, 20970, 20971, 20973, 22667, 22668, 22674, 22669, 22671, 22672, 22784, 22789, 22881, 22883,
        23351, 23524, 23534, 23296, 23299, 23304, 23819, 24077, 24097, 24099, 24139, 24540, 24542, 24543, 24544,
        24680, 24849, 24850,

        // Non numeric ids
        'bsn_calc_min_users'
    ];
    for (i = common.length; i--;) {
        var num = common[i];

        l[num] = escapeHTML(l[num])
            .replace(/\[S\]/g, '<span>').replace(/\[\/S\]/g, '</span>')
            .replace(/\[P\]/g, '<p>').replace(/\[\/P\]/g, '</p>')
            .replace(/\[B\]/g, '<b>').replace(/\[\/B\]/g, '</b>')
            .replace(/\[I\]/g, '<i>').replace(/\[\/I\]/g, '</i>')
            .replace(/\[BR\]/g, '<br/>')
            .replace(/\[Br]/g, '<br/>')
            .replace(/\[A\]/g, '<a href="/pro" class="clickurl">').replace(/\[\/A\]/g, '</a>');
    }

    l.year = new Date().getFullYear();
    date_months = [
        l[408], l[409], l[410], l[411], l[412], l[413],
        l[414], l[415], l[416], l[417], l[418], l[419]
    ].map(escapeHTML);

    // Set the Locale based the language that is selected. (Required for accurate string comparisons).
    // If the locale has been remapped, apply the remap.
    locale = lang;
    if (remappedLangLocales.hasOwnProperty(locale)) {
        locale = remappedLangLocales[locale];
    }
});

/** @property mega.intl */
lazy(mega, 'intl', function _() {
    'use strict';
    const ns = Object.create(null);
    const Intl = window.Intl || {};
    if (!Intl.NumberFormat) {
        // weak silly polyfill
        Intl.NumberFormat = function mIntlNumberFormat() { /* dummy */ };
        Intl.NumberFormat.prototype = {
            constructor: Intl.NumberFormat,
            format: (n) => parseFloat(n).toString(),
            formatToParts: function(n) {
                const [i, f] = this.format(n).split(/[,.]/);
                return [
                    {type: 'integer', value: i | 0}, {type: 'decimal', value: '.'}, {type: 'fraction', value: f | 0}
                ];
            }
        };
        // @todo add Collator whenever needed.
    }

    /** @property mega.intl.number */
    lazy(ns, 'number', function() {
        return this.get('NumberFormat', {minimumFractionDigits: 2});
    });

    /** @property mega.intl.bitcoin */
    lazy(ns, 'bitcoin', function() {
        return this.get('NumberFormat', {minimumFractionDigits: 8});
    });

    /** @property mega.intl.collator */
    lazy(ns, 'collator', function() {
        return this.get('Collator');
    });

    /** @property mega.intl.decimal */
    lazy(ns, 'decimal', function() {
        return this.get('NumberFormat');
    });

    /** @property mega.intl.decimalSeparator */
    lazy(ns, 'decimalSeparator', function() {
        const value = tryCatch(() => this.number.formatToParts(1.1).find(obj => obj.type === 'decimal').value, false)();
        return value || '.';
    });

    /** @property mega.intl.locale */
    lazy(ns, 'locale', function() {
        const locale = window.locale || window.lang;
        let navLocales;

        if (navigator.languages) {
            navLocales = navigator.languages.filter(l => l !== locale && l.startsWith(locale))[0];
        }

        // @todo Polyfill Intl.Locale() and return an instance of it instead?
        return this.test(navLocales) || this.test(locale) || 'en';
    });

    /** @function mega.intl.get */
    ns.get = function(type, options) {
        let intl;

        tryCatch(() => {
            intl = new Intl[type](this.locale.replace('ar', 'en'), options);
        }, false)();

        return intl || new Intl[type]();
    };

    /** @function mega.intl.compare */
    ns.compare = function(a, b) {
        // compares two strings according to the sort order of the current locale.
        return this.collator.compare(a, b);
    };

    /** @function mega.intl.reset */
    ns.reset = function() {
        delete mega.intl;
        lazy(mega, 'intl', _);
    };

    /** @function mega.intl.test */
    ns.test = locale => tryCatch(() => Intl.NumberFormat.supportedLocalesOf(locale)[0], false)();
    // @todo ^ does this return the canonical even in browsers not supporting Intl.getCanonicalLocales() ?

    return ns;
});

/**
 * Returns the remapped language code (correct for Transifex) for the users selected lang
 *
 * @returns {string} The language code.
 */
function getTransifexLangCode() {
    'use strict';

    switch (lang) {
        case 'br': return 'pt';
        case 'cn': return 'zh_CN';
        case 'ct': return 'zh_TW';
        case 'jp': return 'ja';
        case 'kr': return 'ko';
        default: return lang;
    }
}
