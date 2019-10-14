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

            if (namespace === 'dq') {
                // Replace double quotes to their html entities
                l[match] = String(l[localeNum]).replace(/"/g, '&quot;');
            }
            else if (namespace === 'q') {
                // Escape single quotes
                l[match] = String(l[localeNum]).replace(/'/g, "\\'");
            }
            else if (namespace === 'dqq') {
                // Both of the above
                l[match] = String(l[localeNum]).replace(/"/g, '&quot;');
                l[match] = String(l[match]).replace(/'/g, "\\'");
            }

            return l[match];
        }
        return String(l[localeNum]);
    };

    return String(html).replace(/\[\$(\d+)(?:\.(\w+))?\]/g, replacer);
}

/**
 * Set Date time object for time2date
 * @param {String} locales Locale string
 * @param {Number} format format number for the case.
 */
function setDateTimeFormat(locales, format) {

    "use strict";

    // Set date format
    var options = {year: 'numeric', hour12: false};
    options.month = format >= 2 ? 'long' : 'numeric';
    options.day = format === 3 ? undefined : 'numeric';
    options.weekday = format === 4 ? 'long' : undefined;

    if (format === 0) {
        options.minute = 'numeric';
        options.hour = 'numeric';
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
 */
function time2date(unixTime, format) {

    var date = new Date(unixTime * 1000 || 0);
    var result;
    var dateFunc;
    var country = '';

    format = format || 0;
    if (u_attr) {
        country = u_attr.country ? u_attr.country : u_attr.ipcc || 'ISO';
    }

    var locales = country ? locale + '-' + country : locale;

    // If dateTimeFormat is not set with the current locale set it.
    if ($.dateTimeFormat[locales + '-' + format] === undefined) {
        setDateTimeFormat(locales, format);
    }

    var dFObj = $.dateTimeFormat[locales + '-' + format];

    // print time as ISO date format
    var printISO = function _printISO() {
        var timeOffset = date.getTimezoneOffset() * 60;
        var isodate = new Date((unixTime - timeOffset) * 1000);
        var length = format === 0 ? 16 : 10;
        return isodate.toISOString().replace('T', ' ').substr(0, length);
    };

    dateFunc = dFObj === 'ISO' ? printISO : dFObj.format;

    // if it is short date format and user selected to use ISO format
    if ((fmconfig.uidateformat || country === 'ISO') && format < 2) {
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

    var MyDate = new Date(unixtime * 1000);
    var country;
    if (u_attr) {
        country = u_attr.country ? u_attr.country : u_attr.ipcc;
    }
    var locales = country ? locale + '-' + country : locale;
    var currYear = (new Date()).getFullYear();
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
        var th = 'th';
        if ((date.toString()).slice(-1) === '1' && date !== 11) {
            th = 'st';
        }
        else if ((date.toString()).slice(-1) === '2' && date !== 12) {
            th = 'nd';
        }
        else if ((date.toString()).slice(-1) === '3' && date !== 13) {
            th = 'rd';
        }

        result = result.replace(date, date + th);
    }

    return result;
}

function time2last(timestamp) {
    var sec = (new Date().getTime() / 1000) - timestamp;
    if (sec < 4) {
        return l[880];
    }
    else if (sec < 59) {
        return l[873].replace('[X]', Math.ceil(sec));
    }
    else if (sec < 90) {
        return l[874];
    }
    else if (sec < 3540) {
        return l[875].replace('[X]', Math.ceil(sec / 60));
    }
    else if (sec < 4500) {
        return l[876];
    }
    else if (sec < 82000) {
        return l[877].replace('[X]', Math.ceil(sec / 3600));
    }
    else if (sec < 110000) {
        return l[878];
    }
    else {
        return l[879].replace('[X]', Math.ceil(sec / 86400));
    }
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
        index['y'] = localeTime.indexOf(1987);
        index['m'] = localeTime.indexOf(4);
        index['d'] = localeTime.indexOf(23);

        result = Object.keys(index).sort(function(a, b) {
            return index[a] - index[b];
        }).join('');
    }
    else {
        // Arabic special
        var country;
        if (u_attr) {
            country = u_attr.country ? u_attr.country : u_attr.ipcc;
        }
        var locales = country ? locale + '-' + country : locale;

        var options_y = {year: 'numeric'}; // Format only Day
        var options_m = {month: 'numeric'}; // Format only Month
        var options_d = {day: 'numeric'}; // Format only Year

        locales = !u_attr || !u_attr.country || arabics.indexOf(u_attr.country) < 0 ? 'ar-EG' : locales;

        try {
            if (typeof Intl !== 'undefined') {
                var locale_y = new Intl.DateTimeFormat(locales, options_y).format(uniqTime);
                var locale_m = new Intl.DateTimeFormat(locales, options_m).format(uniqTime);
                var locale_d = new Intl.DateTimeFormat(locales, options_d).format(uniqTime);

                index['y'] = localeTime.indexOf(locale_y);
                index['m'] = localeTime.indexOf(locale_m);
                index['d'] = localeTime.indexOf(locale_d);

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
    var momentDate = moment(dateString);
    var today = moment(refDate ? refDate : undefined).startOf('day');
    var yesterday = today.clone().subtract(1, 'days');

    return (momentDate.isSame(today, 'd') || momentDate.isSame(yesterday, 'd'));
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

//----------------------------------------------------------------------------

mBroadcaster.once('startMega', function populate_l() {
    var i;

    if (d) {
        for (i = 24000; i--;) {
            l[i] = (l[i] || '(translation-missing)');
        }
    }
    l[0] = 'MEGA ' + new Date().getFullYear();
    if ((lang === 'es') || (lang === 'pt') || (lang === 'sk')) {
        l[0] = 'MEGA';
    }
    l[1] = l[398];
    if (lang === 'en') {
        l[1] = 'Go PRO';
    }

    if (lang == 'en') {
        l[509] = 'The Privacy Company';
    }
    else {
        l[509] = l[509].toLowerCase();
        l[509] = l[509].charAt(0).toUpperCase() + l[509].slice(1);
    }

    l[122] = l[122].replace('five or six hours', '<span class="red">five or six hours</span>');
    l[8634] = l[8634].replace("[S]", "<span class='red'>").replace("[/S]", "</span>");
    l[8762] = l[8762].replace("[S]", "<span class='red'>").replace("[/S]", "</span>");
    l[438] = l[438].replace('[X]', '');
    l['439a'] = l[439];
    l[439] = l[439].replace('[X1]', '').replace('[X2]', '');
    l['466a'] = l[466];
    l[466] = l[466].replace('[X]', '');
    l[543] = l[543].replace('[X]', '');
    l[456] = l[456].replace(':', '');
    l['471a'] = l[471].replace('[X]', 10);
    l['471b'] = l[471].replace('[X]', 100);
    l['471c'] = l[471].replace('[X]', 250);
    l['471d'] = l[471].replace('[X]', 500);
    l['471e'] = l[471].replace('[X]', 1000);
    l['469a'] = l[469].replace('[X]', 10);
    l['469b'] = l[469].replace('[X]', 100);
    l['469c'] = l[469].replace('[X]', 250);
    l['472a'] = l[472].replace('[X]', 10);
    l['472b'] = l[472].replace('[X]', 100);
    l['472c'] = l[472].replace('[X]', 250);
    l['208a'] = l[208].replace('[A]', '<a href="/terms" class="red clickurl" tabindex="-1">');
    l['208a'] = l['208a'].replace('[/A]', '</a>');
    l['208s'] = l[208].replace('[A]', '<span class="red">');
    l['208s'] = l['208s'].replace('[/A]', '</span>');
    l['208.g'] = l[208].replace('[A]', '<a class="green txt-bold">').replace('[/A]', '</a>');
    l[208] = l[208].replace('[A]', '<a href="/terms" class="clickurl" tabindex="-1">');
    l[208] = l[208].replace('[/A]', '</a>');
    l[517] = l[517].replace('[A]', '<a href="/help" class="help-center-link clickurl">').replace('[/A]', '</a>');
    l[521] = l[521].replace('[A]', '<a href="/copyright" class="clickurl">').replace('[/A]', '</a>');
    l[553] = l[553].replace('[A]', '<a href="mailto:resellers@mega.nz">').replace('[/A]', '</a>');
    l[555] = l[555].replace('[A]', '<a href="/terms" class="clickurl">').replace('[/A]', '</a>');
    l[754] = l[754].replace('[A]',
        '<a href="http://www.google.com/chrome" target="_blank" rel="noopener noreferrer" style="color:#D9290B;">');
    l[754] = l[754].replace('[/A]', '</a>');
    l[871] = l[871].replace('[B]', '<strong>')
        .replace('[/B]', '</strong>')
        .replace('[A]', '<a href="/pro" class="clickurl">').replace('[/A]', '</a>');
    l[924] = l[924].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[501] = l[501].replace('17', '').replace('%', '');
    l[1066] = l[1066].replace('[A]', '<a class="red">').replace('[/A]', '</a>');
    l[1067] = l[1067].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[1094] = l[1094].replace('[A]', '<a href="/extensions" class="clickurl">').replace('[/A]', '</a>');
    l[1095] = l[1095].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[1133] = l[1133].replace('[A]',
        '<a href="http://en.wikipedia.org/wiki/Entropy" target="_blank" rel="noopener noreferrer">').replace('[/A]', '</a>');
    l[1134] = l[1134].replace('[A]',
        '<a href="http://en.wikipedia.org/wiki/Public-key_cryptography" target="_blank" rel="noopener noreferrer">').replace('[/A]',
        '</a>');
    l[1148] = l[1148].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[6978] = l[6978].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[1151] = l[1151].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[731] = l[731].replace('[A]', '<a href="/terms" class="clickurl">').replace('[/A]', '</a>');
    if (lang === 'en') {
        l[965] = 'Legal & policies';
    }
    l[1159] = l[1159].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[1171] = l[1171].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[1185] = l[1185].replace('[X]', '<strong>MEGA.crx</strong>');
    l[1212] = l[1212].replace('[A]', '<a href="/sdk" class="red clickurl">').replace('[/A]', '</a>');
    l[1274] = l[1274].replace('[A]', '<a href="/takedown" class="clickurl">').replace('[/A]', '</a>');
    l[1275] = l[1275].replace('[A]', '<a href="/copyright" class="clickurl">').replace('[/A]', '</a>');
    l[1201] = l[1201].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[1208] = l[1208].replace('[B]', '<strong>').replace('[/B]', '</strong>');
    l[1389] = l[1389].replace('[B]', '').replace('[/B]', '').replace('[A]', '<span>').replace('[/A]', '</span>');
    l[1915] = l[1915].replace('[A]',
        '<a class="red" href="https://chrome.google.com/webstore/detail/mega/bigefpfhnfcobdlfbedofhhaibnlghod" target="_blank" rel="noopener noreferrer">')
        .replace('[/A]', '</a>');
    l[1936] = l[1936].replace('[A]', '<a href="/backup" class="clickurl">').replace('[/A]', '</a>');
    l[1942] = l[1942].replace('[A]', '<a href="/backup" class="clickurl">').replace('[/A]', '</a>');
    l[1943] = l[1943].replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[1948] = l[1948].replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[1957] = l[1957].replace('[A]', '<a href="/recovery" class="clickurl">').replace('[/A]', '</a>');
    l[1965] = l[1965].replace('[A]', '<a href="/recovery" class="clickurl">').replace('[/A]', '</a>');
    l[1982] = l[1982].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
    l[1993] = l[1993].replace('[A]', '<a href="/register" class="clickurl">').replace('[/A]', '</a>');

    l[5931] = l[5931].replace('[A]', '<a class="red" href="/fm/account" class="clickurl">').replace('[/A]', '</a>');
    l[6976] = l[6976].replace('%1', '<span class="plan-name"></span>');
    l[7156] = l[7156].replace('[A]', '<a href="/mobile" class="clickurl">').replace('[/A]', '</a>');
    l[7002] = l[7002].replace('[A]', '<a href="/contact" class="clickurl">').replace('[/A]', '</a>');
    l[7202] = l[7202].replace('[A]', '<a href="/resellers" class="voucher-reseller-link clickurl">')
                     .replace('[/A]', '</a>');
    l[7945] = l[7945].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[7991] = l[7991].replace('%1', '<span class="provider-icon"></span><span class="provider-name"></span>');
    l[7996] = l[7996].replace('[S]', '<span class="purchase">').replace('[/S]', '</span>');

    l[8426] = l[8426].replace('[S]', '<span class="red">').replace('[/S]', '</span>');
    l[8427] = l[8427].replace('[S]', '<span class="red">').replace('[/S]', '</span>');
    l[8428] = l[8428].replace('[A]', '<a class="red">').replace('[/A]', '</a>');
    l[8440] = l[8440].replace('[A]', '<a href="https://github.com/meganz/">').replace('[/A]', '</a>');
    l[8440] = l[8440].replace('[A2]', '<a href="/contact" class="clickurl">').replace('[/A2]', '</a>');
    l[8441] = l[8441].replace('[A]', '<a href="mailto:bugs@mega.nz">').replace('[/A]', '</a>');
    l[8441] = l[8441].replace('[A2]', '<a href="https://mega.nz/blog_8">').replace('[/A2]', '</a>');
    l[19310] = l[19310].replace('[A]', '<a href="https://mega.nz/blog_6" target="_blank">').replace('[/A]', '</a>');


    l[8644] = l[8644].replace('[S]', '<span class="green">').replace('[/S]', '</span>');
    l[8651] = l[8651].replace('%1', '<span class="header-pro-plan"></span>');
    l[8653] = l[8653].replace('[S]', '<span class="renew-text">').replace('[/S]', '</span>');
    l[8653] = l[8653].replace('%1', '<span class="pro-plan"></span>');
    l[8653] = l[8653].replace('%2', '<span class="plan-duration"></span>');
    l[8653] = l[8653].replace('%3', '<span class="provider-icon"></span>');
    l[8653] = l[8653].replace('%4', '<span class="gateway-name"></span>');
    l[8654] = l[8654].replace('[S]', '<span class="choose-text">').replace('[/S]', '</span>');

    l[8535] = l[8535].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[8752] = l[8752].replace('{0}', '<i class="medium-icon icons-sprite mega"></i>');
    l[8833] = l[8833].replace('[B]', '<strong>').replace('[/B]', '</strong>');
    l[8850] = l[8850].replace('%1', '<span class="release-version"></span>');
    l[8851] = l[8851].replace('%1', '<span class="release-date-time"></span>');
    l[8843] = l[8843].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[8855] = l[8855].replace('[BR]', '<br>');
    l[8848] = l[8848].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[8849] = l[8849].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[8912] = l[8912].replace('[B]', '<span>').replace('[/B]', '</span>');
    l[8846] = l[8846].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[8847] = l[8847].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[8950] = l[8950].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[8951] = l[8951].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[8952] = l[8952].replace('[S]', '<span>').replace('[/S]', '</span>');
    l[9030] = l[9030].replace('[S]', '<strong>').replace('[/S]', '</strong>');
    l[9036] = l[9036].replace('[S]', '<strong>').replace('[/S]', '</strong>');

    l[10631] = l[10631].replace('[A]',
        '<a href="https://mega.nz/terms/refunds" target="_blank" rel="noopener noreferrer">').replace('[/A]', '</a>');
    l[10630] = l[10630].replace('[A]',
        '<a href="https://mega.nz/terms/refunds" target="_blank" rel="noopener noreferrer">').replace('[/A]', '</a>');
    l[10634] = l[10634].replace('[A]', '<a href="https://mega.nz/support" target="_blank" rel="noopener noreferrer">')
                       .replace('[/A]', '</a>');

    l[10635] = l[10635].replace('[B]', '"<b>').replace('[/B]', '</b>"');
    l[10644] = l[10644].replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[10646] = l[10646].replace('[A]', '<a href="/account" class="clickurl">').replace('[/A]', '</a>');
    l[10650] = l[10650].replace('[A]', '<a href="/account" class="clickurl">').replace('[/A]', '</a>');
    l[10656] = l[10656].replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[10658] = l[10658].replace('[A]', '<a href="/terms" class="clickurl">').replace('[/A]', '</a>');

    l[12482] = l[12482].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[12483] = l[12483].replace('[BR]', '<br>');
    l[12485] = l[12485].replace('[A1]', '<a href="" class="red a1 mac">').replace('[/A1]', '</a>');
    l[12485] = l[12485].replace('[A2]', '<a href="" class="red a2 linux">').replace('[/A2]', '</a>');
    l[12486] = l[12486].replace('[A1]', '<a href="" class="red windows">').replace('[/A1]', '</a>');
    l[12486] = l[12486].replace('[A2]', '<a href="" class="red mac">').replace('[/A2]', '</a>');
    l[12487] = l[12487].replace('[A1]', '<a href="" class="red windows">').replace('[/A1]', '</a>');
    l[12487] = l[12487].replace('[A2]', '<a href="" class="red linux">').replace('[/A2]', '</a>');
    l[12488] = l[12488].replace('[A]', '<a>').replace('[/A]', '</a>').replace('[BR]', '<br>');
    l[12489] = l[12489].replace('[I]', '<i>').replace('[/I]', '</i>').replace('[I]', '<i>').replace('[/I]', '</i>');

    l[16116] = l[16116].replace('[S]', '<span class="red">').replace('[/S]', '</span>');

    l[16165] = l[16165].replace('[S]', '<a class="red">').replace('[/S]', '</a>').replace('[BR]', '<br/>');
    l[16167] = l[16167].replace('[A]', '<a href="/mobile" class="clickurl">').replace('[/A]', '</a>');
    l[16306] = escapeHTML(l[16306])
        .replace('[A]', '<a href="/fm/rubbish" class="clickurl gotorub">').replace('[/A]', '</a>');
    l[16310] = escapeHTML(l[16310])
        .replace('[A]', '<a href="/fm/dashboard" class="clickurl">').replace('[/A]', '</a>')
        .replace('[I]', '<i class="semi-small-icon rocket"></i>');
    l[16389] = escapeHTML(l[16389]).replace(
        '%1',
            '<span class="checkdiv checkboxOn autoaway">' +
            '<input type="checkbox" name="set-auto-away" id="set-auto-away" class="checkboxOn" checked="">' +
            '</span>'
        )
        .replace(
            '%2',
            '<span class="account-counter-number short">' +
            '<input type="text" value="5" id="autoaway" />' +
            '</span>'
        );
    l[16390] = escapeHTML(l[16390]).replace('[S]', '<span class="red">').replace('[/S]', '</span>');
    l[16391] = escapeHTML(l[16391]).replace('[S]', '<span class="red">').replace('[/S]', '</span>');
    l[16392] = escapeHTML(l[16392]).replace('[S]', '<span class="red">').replace('[/S]', '</span>');
    l[16393] = escapeHTML(l[16393])
        .replace('[A]', '<a class="red" href="mailto:support@mega.nz">').replace('[/A]', '</a>');

    l[16649] = l[16649].replace('%1', '<span class="amount">10.00</span>');
    l[16501] = l[16501].replace('[A1]', '<a class="red" href="mailto:support@mega.nz">').replace('[/A1]', '</a>')
        .replace('[A2]', '<a class="red" target="_blank" href="https://mega.nz/help/client/android/'
            + 'accounts-pro-accounts/how-can-i-cancel-the-renewal-of-my-mega-subscription">')
        .replace('[/A2]', '</a>')
        .replace('[A3]', '<a class="red" target="_blank" href="https://mega.nz/help/client/ios/'
            + 'accounts-pro-accounts/how-does-mega-pro-account-subscription-work-with-apple-in-app-'
            + 'purchases">')
        .replace('[/A3]', '</a>');
    l[16596] = escapeHTML(l[16596])
        .replace('[A]', '<a class="red" href="mailto:uwp.alpha@mega.nz">').replace('[/A]', '</a>').replace('uwp@', 'uwp.alpha@');
	l[16598] = escapeHTML(l[16598])
        .replace('[A]', '<a href="https://github.com/meganz/megacmd" target="_blank" class="red">')
        .replace('[/A]', '</a>')
        .replace('[B]', '<a href="https://github.com/meganz/MEGAcmd/blob/master/README.md" target="_blank" class="red">')
        .replace('[/B]', '</a>');
    l[16609] = escapeHTML(l[16609]).replace('[B]', '<b>').replace('[/B]', '</b>');
    l[16614] = escapeHTML(l[16614])
        .replace('[A]', '<a class="red" href="https://thunderbird.net/" target="_blank" rel="noopener noreferrer">')
        .replace('[/A]', '</a>');

    l[12439] = l[12439].replace('[A1]', '').replace('[/A1]', '').replace('[A2]', '').replace('[/A2]', '');

    l[16865] = escapeHTML(l[16865]).replace('[A]', '<a href="/sync" class="clickurl">').replace('[/A]', '</a>');
    l[16866] = escapeHTML(l[16866]).replace('[A]', '<a href="/sync" class="clickurl">').replace('[/A]', '</a>');
    l[16870] = escapeHTML(l[16870]).replace('[A]', '<a href="/sync" class="clickurl">').replace('[/A]', '</a>');
    l[16883] = escapeHTML(l[16883]).replace('[A]', '<a href="/sync" class="clickurl">').replace('[/A]', '</a>');
    l[17793] = escapeHTML(l[17793])
        .replace('[A1]', '<a href="/sync" class="clickurl">').replace('[/A1]', '</a>')
        .replace('[A2]', '<a href="/extensions" class="clickurl">').replace('[/A2]', '</a>')
        .replace('[A3]', '<a class="freeupdiskspace">').replace('[/A3]', '</a>');

    l[17083] = l[17083]
        .replace('[A]', '<a href="https://www.microsoft.com/store/apps/9nbs1gzzk3zg" target="_blank">')
        .replace('[/A]', '</a>');

    var linktohelp = 'https://mega.nz/help/client/webclient/cloud-drive/59f13b42f1b7093a7f8b4589';
    l[17097] =  l[17097]
                .replace('[A]', '<a id="versionhelp" href="' + linktohelp + '" target="_blank" class="red">')
                .replace('[/A]', '</a>');
    l[17690] = l[17690].replace('[A]', '<a href="https://mega.nz/recovery" target="_blank" class="red">')
                       .replace('[/A]', '</a>');
    l[17701] = l[17701].replace('[B]', '<b>').replace('[/B]', '</b>');
    if (l[17742]) {
        l[17742] = escapeHTML(l[17742]).replace('[S]', '<strong>').replace('[/S]', '</strong>');
    }
    l[17805] = l[17805].replace('[A]', '<a class="mobile red-email red" href="mailto:support@mega.nz">')
                       .replace('[/A]', '</a>');
    l[18301] = l[18301].replace(/\[B\]/g, '<b class="megasync-logo">')
        .replace(/\[\/B\]/g, '</b>').replace(/\(M\)/g, '').replace(/\[LOGO\]/g, '');
    l[18311] = l[18311].replace(/\[B1\]/g, '<strong class="warning-text">')
        .replace(/\[\/B1\]/g, '</strong>');
    l[18312] = l[18312].replace(/\[B\]/g, '<strong class="warning-text">')
        .replace(/\[\/B\]/g, '</strong>');

    l[18446] = l[18446].replace('[A]', '<a href="/terms" class="clickurl">').replace('[/A]', '</a>');
    l[18447] = l[18447].replace(/\[A\]/g, '<a href="/terms" class="clickurl">').replace(/\[\/A\]/g, '</a>');
    l[18448] = l[18448].replace('[A1]', '<a href="/terms" class="clickurl">').replace('[/A1]', '</a>')
                       .replace(/\[A2\]/g, '<a href="/privacy" class="clickurl">').replace(/\[\/A2\]/g, '</a>');
    l[18465] = l[18465].replace('[A]', '<a href="mailto:gdpr@mega.nz">').replace('[/A]', '</a>');
    l[18490] = l[18490].replace('[A]', '<a href="mailto:gdpr@mega.nz">').replace('[/A]', '</a>');
    l[18491] = l[18491].replace('[A]', '<a href="mailto:gdpr@mega.nz">').replace('[/A]', '</a>');
    l[18638] = l[18638].replace(/\[+[B1-9]+\]/g, '<b>').replace(/\[\/+[B1-9]+\]/g, '</b>');
    l[18787] = l[18787]
        .replace('[A]', '<a href="https://github.com/meganz/MEGAcmd" rel="noreferrer" target="_blank">')
        .replace('[/A]', '</a>');
    l[19111] = l[19111].replace('[A]', '<a class="public-contact-link">').replace('[/A]', '</a>');
    l[19328] = l[19328].replace('[B]', '<b>').replace('[/B]', '</b>');

    l[19512] = l[19512].replace('%1', '<span class="plan-name"></span>')
        .replace('%2', '<span class="user-email"></span>').replace('[B]', '<b>').replace('[/B]', '</b>');
    l[19513] = l[19513].replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>').replace('%1', 2)
        .replace('%2', '<span class="user-email"></span>').replace('[B]', '<b>').replace('[/B]', '</b>');
    l[19514] = l[19514].replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>').replace('%1', 2)
        .replace('%2', '<span class="user-email"></span>').replace('[B]', '<b>').replace('[/B]', '</b>');
    l[19628] = l[19628].replace('[A]', '<a href="mailto:copyright@mega.nz">').replace('[/A]', '</a>');
    l[19661] = l[19661].replace('[A]', '<a href="/help/client/megasync/" rel="noreferrer">')
        .replace('[/A]', '</a>');
    l[19685] = l[19685].replace('[S]', '<span class="bold">').replace('[/S]', '</span>');
    l[19691] = l[19691].replace('[S]', '<span class="bold">').replace('[/S]', '</span>');
    l[19834] = l[19834].replace('[A]', '<a class="red" href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[19835] = l[19835].replace('[A]', '<a class="red" href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[19840] = l[19840].replace('[A]', '<a class="red toResetLink">').replace('[/A]', '</a>');
    l[19843] = l[19843].replace('[A]', '<a class="red" href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[19849] = l[19849].replace('[A]', '<a class="red" href="/recovery">').replace('[/A]', '</a>');
    l[19851] = l[19851].replace('[B]', '<strong class="warning-text">').replace('[/B]', '</strong>');
    l[19857] = l[19857] ? l[19857].replace('[BR]', '<br>') : l[19857];
    l[20011] = l[20011]
        .replace('[A]', '<a class="red" target="_blank" rel="noopener noreferrer"  href="https://www.lastpass.com/'
            + 'password-generator">')
        .replace('[/A]', '</a>');
    l[20013] = l[20013].replace('[Br]', '<br><br>');
    l[20015] = l[20015].replace('[A]', '<a target="_blank" class="red" rel="noopener noreferrer" href="https://mega.nz'
        + '/backup">')
        .replace('[/A]', '</a>');
    l[20016] = l[20016].replace('[A]', '<a target="_blank" class="red" rel="noopener noreferrer" href="https://mega.nz'
        + '/blog_48" >')
        .replace('[/A]', '</a>')
        .replace('[Br]', '<br><br>');
    l[20022] = l[20022].replace('[Br]', '<br><br>');
    l[20022] = l[20022].replace('[Br]', '<br><br>');
    l[20132] = l[20132].replace('[A]', '<span class="os-mac-windows-toggle">').replace('[/A]', '</span>')
                       .replace('[B]', '<span class="os-linux-toggle">').replace('[/B]', '</span>');
    l[20137] = l[20137].replace('[A]', '<a target="_blank" class="red" rel="noopener noreferrer" href="https://mega.nz'
        + '/mobile">').replace('[/A]', '</a>');
    l[20189] = l[20189].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[20192] = l[20192].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[20193] = l[20193].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[20194] = l[20194].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[20195] = l[20195].replace('[B]', '<b>').replace('[/B]', '</b>');

    // Mobile only
    if (is_mobile) {
        l[20197] = l[20197].replace('[S1]', '<span class="used">').replace('[/S1]', '</span>\n').replace('[S2]', '')
            .replace('[/S2]', '\n').replace('[S3]', '<span class="total">').replace('[/S3]', '</span>\n') + '<br>';
        l[20220] = l[20220].replace('%1', '<span class="mobile user-number js-user-phone-number"></span>');
    }
    else {
        // Desktop only
        l[20197] = l[20197].replace('[S1]', '<span class="size-txt">').replace('[/S1]', '</span>')
            .replace('[S2]', '<span class="of-txt">').replace('[/S2]', '</span>\n')
            .replace('[S3]', '<span class="pecents-txt">').replace('[/S3]', '</span>\n<span class="gb-txt">GB</span>')
            .replace('$1', '0 MB').replace('$2', '0');
    }

    l[20206] = l[20206].replace('[S1]', '<span class="content-txt">').replace('[/S1]', '</span>')
        .replace('[S2]', '<span class="content-txt">').replace('[/S2]', '</span>')
        .replace('%1',
            '<span class="account-counter-number short"><input type="text" value="100" id="autoaway"></span>');
    l[20223] = l[20223].replace('%1', '24');  // 24 hours

    // Keep the word 'a' with the previous word by using non breaking space (TR76417)
    if (lang === 'es') {
        l[20217] = l[20217].replace(' a:', '&nbsp;a:');
    }
    l[20552] = l[20552].replace('[Br]', '<br>');
    l[20553] = l[20553].replace('[S]', '<strong>').replace('[/S]', '</strong>');
    l[20588] = l[20588].replace('[A]', '<a class="clickurl" href="/security">')
        .replace('[/A]', '</a>');
    l[20592] = l[20592].replace('[A1]', '<a class="clickurl" href="/sourcecode">')
        .replace('[/A1]', '</a>');
    l[20592] = l[20592].replace('[A2]', '<a target="_blank" rel="noopener noreferrer"'
        + 'href="https://mega.nz/SecurityWhitepaper.pdf">').replace('[/A2]', '</a>');
    l[20607] = l[20607].replace('[A1]', '<a class="clickurl" href="/mobile">')
        .replace('[/A1]', '</a>');
    l[20607] = l[20607].replace('[A2]', '<a class="clickurl" href="/sync">')
        .replace('[/A2]', '</a>');
    l[20609] = l[20609].replace('[A]', '<a class="clickurl" href="/sync">').replace('[/A]', '</a>');
    l[20846] = l[20846]
        .replace('[A]', '<a href="https://mega.nz/linux/MEGAsync/" target="_blank" class="download-all-link">')
        .replace('[/A]', '</a>');
    l[20635] = escapeHTML(l[20635]).replace('[A]', '<a>').replace('[/A]', '</a>');
    l[20707] = escapeHTML(l[20707]).replace('[B]', '<strong>').replace('[/B]', '</strong>');
    l[20708] = escapeHTML(l[20708]).replace('[S]', '<span>').replace('[/S]', '</span>');
    l[20709] = escapeHTML(l[20709]).replace('[S]', '<span>').replace('[/S]', '</span>');
    l[20710] = escapeHTML(l[20710]).replace('[S]', '<span>').replace('[/S]', '</span>');
    l[20713] = escapeHTML(l[20713]).replace('[B]%1[/B]', '<b></b>');
    l[20714] = escapeHTML(l[20714])
        .replace('[B1]%1[/B1]', '<b class="plan-time"></b>')
        .replace('[B2]%2[/B2]', '<b class="plan-name"></b>');
    l[20750] = escapeHTML(l[20750]).replace('[S]', '<span>').replace('[/S]', '</span>');
    l[20756] = escapeHTML(l[20756]).replace('[S]', '<span>').replace('[/S]', '</span>');
    l[20757] = escapeHTML(l[20757]).replace('[S]', '<span>').replace('[/S]', '</span>');
    l[20759] = escapeHTML(l[20759]).replace('[B]%1[/B]', '<b></b>');
    l[20922] = escapeHTML(l[20922]).replace(/\[R\/\]/g, '<sup>&reg;</sup>');
    l[20923] = escapeHTML(l[20923]).replace('[S]', '<span>').replace('[/S]', '</span>');
    l['20923c'] = l[20923].replace('%1', 'Chrome');
    l['20923f'] = l[20923].replace('%1', 'Firefox');
    l['20923o'] = l[20923].replace('%1', 'Opera');
    l['20923t'] = l[20923].replace('%1', 'Thunderbird');
    l[20924] = escapeHTML(l[20924]);
    l['20924c'] = l[20924].replace('%1', 'Chrome<sup>&reg;</sup>');
    l['20924f'] = l[20924].replace('%1', 'Firefox<sup>&reg;</sup>');
    l['20924o'] = l[20924].replace('%1', 'Opera<sup>&reg;</sup>');
    l[20932] = l[20932].replace('[R/]', '<sup>&reg;</sup>');
    l[20959] = l[20959] .replace('[A]', '<a class="red" href="https://mega.nz/SecurityWhitepaper.pdf" '
        + 'target="_blank" rel="noopener noreferrer">')
        .replace('[/A]', '</a>');
    l['20975.b'] = escapeHTML(l[20975]).replace('[B]', '<b class="txt-dark">').replace('[/B]', '</b>')
        .replace('[A]', '<a href="/security" class="green txt-bold" target="_blank">').replace('[/A]', '</a>');
    l[20975] = escapeHTML(l[20975]).replace('[B]', '<b class="txt-dark">').replace('[/B]', '</b>')
        .replace('[A]', '<a href="/security" class="red txt-bold" target="_blank">').replace('[/A]', '</a>');
    l[22074] = l[22074].replace('[S]', '<span class="purchase">').replace('[/S]', '</span>');
    l[22094] = l[22094].replace(/\[S\]/g, '<strong>').replace(/\[\/S\]/g, '</strong>');
    l[22095] = l[22095].replace(/\[S\]/g, '<strong>').replace(/\[\/S\]/g, '</strong>');

    var common = [
        15536, 16106, 16107, 16119, 16120, 16123, 16124, 16135, 16136, 16137, 16138, 16304, 16313, 16315, 16316,
        16341, 16358, 16359, 16360, 16361, 16375, 16382, 16383, 16384, 16394, 18228, 18423, 18425, 18444, 18268,
        18282, 18283, 18284, 18285, 18286, 18287, 18289, 18290, 18291, 18292, 18293, 18294, 18295, 18296, 18297,
        18298, 18302, 18303, 18304, 18305, 18314, 18315, 18316, 18419, 19807, 19808, 19810, 19811, 19812, 19813,
        19814, 19854, 19821, 19930, 20402, 20462, 20966, 20967, 20969, 20970, 20971, 20973
    ];
    for (i = common.length; i--;) {
        var num = common[i];

        l[num] = escapeHTML(l[num])
            .replace(/\[S\]/g, '<span>').replace(/\[\/S\]/g, '</span>')
            .replace(/\[P\]/g, '<p>').replace(/\[\/P\]/g, '</p>')
            .replace(/\[B\]/g, '<b>').replace(/\[\/B\]/g, '</b>')
            .replace(/\[I\]/g, '<i>').replace(/\[\/I\]/g, '</i>')
            .replace(/\[BR\]/g, '<br/>')
            .replace(/\[A\]/g, '<a href="/pro" class="clickurl">').replace(/\[\/A\]/g, '</a>');
    }

    l['year'] = new Date().getFullYear();
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
