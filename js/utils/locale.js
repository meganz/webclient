var date_months = [];

var locale = "en";

var remappedLangLocales = {
    "cn": "zh-Hans",
    "ct": "zh-Hant",
    "kr": "ko",
    "jp": "ja",
    "tl": "fil"
};

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
 * Converts a timestamp to a readable time format - e.g. 2016-04-17 14:37
 *
 * @param {Number} unixTime  The UNIX timestamp in seconds e.g. 1464829467
 * @param {Number} [format]  The readable time format to return
 * @returns {String}
 *
 * Formats:
 *       0: yyyy-mm-dd hh:mm
 *       1: yyyy-mm-dd
 *       2: dd fmn yyyy (fmn: Full month name, based on the locale)
 */
function time2date(unixTime, format) {

    var result;
    var date = new Date(unixTime * 1000 || 0);

    if (format === 2) {
        result = date.getDate() + ' ' + date_months[date.getMonth()] + ' ' + date.getFullYear();
    }
    else {
        result = date.getFullYear() + '-'
            + ('0' + (date.getMonth() + 1)).slice(-2)
            + '-' + ('0' + date.getDate()).slice(-2);

        if (!format) {
            result += ' ' + date.toTimeString().substr(0, 5);
        }
    }

    return result;
}

function acc_time2date(unixtime, yearIsOptional) {
    var MyDate = new Date(unixtime * 1000);
    var th = 'th';
    if ((parseInt(MyDate.getDate()) === 11) || (parseInt(MyDate.getDate()) === 12)) {
    }
    else if (('' + MyDate.getDate()).slice(-1) === '1') {
        th = 'st';
    }
    else if (('' + MyDate.getDate()).slice(-1) === '2') {
        th = 'nd';
    }
    else if (('' + MyDate.getDate()).slice(-1) === '3') {
        th = 'rd';
    }
    if (lang !== 'en') {
        th = ',';
    }
    var result = date_months[MyDate.getMonth()] + ' ' + MyDate.getDate();

    if (yearIsOptional === true) {
        var currYear = (new Date()).getFullYear();
        if (currYear !== MyDate.getFullYear()) {
            result += th + ' ' + MyDate.getFullYear();
        }
    }
    else {
        result += th + ' ' + MyDate.getFullYear();
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
    l['208a'] = l[208].replace('[A]', '<a href="/terms" class="red clickurl">');
    l['208a'] = l['208a'].replace('[/A]', '</a>');
    l[208] = l[208].replace('[A]', '<a href="/terms" class="clickurl">');
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
    l[1982] = l[1982].replace('[A]', '<font style="color:#D21F00;">').replace('[/A]', '</font>');
    l[1993] = l[1993].replace('[A]', '<span class="red">').replace('[/A]', '</span>');

    l[5931] = l[5931].replace('[A]', '<a class="red" href="/fm/account" class="clickurl">').replace('[/A]', '</a>');
    l[6962] = l[6962].replace('%1', '<span class="plan-name"></span>');
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

    l[10631] = l[10631].replace('[A]', '<a href="https://mega.nz/general" target="_blank" rel="noopener noreferrer">')
                       .replace('[/A]', '</a>');
    l[10630] = l[10630].replace('[A]', '<a href="https://mega.nz/general" target="_blank" rel="noopener noreferrer">')
                       .replace('[/A]', '</a>');
    l[10634] = l[10634].replace('[A]', '<a href="https://mega.nz/support" target="_blank" rel="noopener noreferrer">')
                       .replace('[/A]', '</a>');

    l[10635] = l[10635].replace('[B]', '"<b>').replace('[/B]', '</b>"');
    l[10636] = l[10636].replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>').replace('%1', 2);
    l[10644] = l[10644].replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[10646] = l[10646].replace('[A]', '<a href="/account" class="clickurl">').replace('[/A]', '</a>');
    l[10650] = l[10650].replace('[A]', '<a href="/account" class="clickurl">').replace('[/A]', '</a>');
    l[10656] = l[10656].replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>');
    l[10658] = l[10658].replace('[A]', '<a href="/terms" class="clickurl">').replace('[/A]', '</a>');

    l[12482] = l[12482].replace('[B]', '<b>').replace('[/B]', '</b>');
    l[12483] = l[12483].replace('[BR]', '<br>');
    l[12485] = l[12485].replace('[A1]', '<a href="" class="red mac">').replace('[/A1]', '</a>');
    l[12485] = l[12485].replace('[A2]', '<a href="" class="red linux">').replace('[/A2]', '</a>');
    l[12486] = l[12486].replace('[A1]', '<a href="" class="red windows">').replace('[/A1]', '</a>');
    l[12486] = l[12486].replace('[A2]', '<a href="" class="red mac">').replace('[/A2]', '</a>');
    l[12487] = l[12487].replace('[A1]', '<a href="" class="red windows">').replace('[/A1]', '</a>');
    l[12487] = l[12487].replace('[A2]', '<a href="" class="red linux">').replace('[/A2]', '</a>');
    l[12488] = l[12488].replace('[A]', '<a>').replace('[/A]', '</a>').replace('[BR]', '<br>');
    l[12489] = l[12489].replace('[I]', '<i>').replace('[/I]', '</i>').replace('[I]', '<i>').replace('[/I]', '</i>');

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
        .replace('[A]', '<a href="https://thunderbird.net/" target="_blank" rel="noopener noreferrer">')
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

    // l[] = escapeHTML(l[]).replace('', '');

    // carefully replace various strings to adhere to the new pro quotas:
    // note: in the future we should make such strings used variables.
	l[16393] = l[16393].replace('4','8');
	l[16385] = l[16385].replace('4','8');
	l[16359] = l[16359].replace('4096','8192').replace('4','8');
	l[16358] = l[16358].replace('4096','8192').replace('4','8');
	l[16316] = l[16316].replace('4096','8192').replace('4','8');
	l[16315] = l[16315].replace('4096','8192').replace('4','8');
	l[16304] = l[16304].replace('8','16').replace('4096','8192').replace('4','8');
	l[1367] = l[1367].replace('4','8');

    l[17083] = l[17083]
        .replace('[A]', '<a href="https://www.microsoft.com/store/apps/9nbs1gzzk3zg" target="_blank">')
        .replace('[/A]', '</a>');

    var linktohelp = 'https://mega.nz/help/client/webclient/cloud-drive/59f13b42f1b7093a7f8b4589';
    l[17097] =  l[17097]
                .replace('[A]', '<a id="versionhelp" href="' + linktohelp + '" target="_blank" class="red">')
                .replace('[/A]', '</a>');
    l[17690] = l[17690].replace('[A]', '<a href="https://mega.nz/recovery" target="_blank" class="red">')
                       .replace('[/A]', '</a>');
    if (l[17742]) {
        l[17742] = escapeHTML(l[17742]).replace('[S]', '<strong>').replace('[/S]', '</strong>');
    }
    l[17805] = l[17805].replace('[A]', '<a class="mobile red-email" href="mailto:support@mega.nz">')
                       .replace('[/A]', '</a>');

    l[18446] = l[18446].replace('[A]', '<a href="/terms" class="clickurl">').replace('[/A]', '</a>');
    l[18447] = l[18447].replace(/\[A\]/g, '<a href="/terms" class="clickurl">').replace(/\[\/A\]/g, '</a>');
    l[18448] = l[18448].replace('[A1]', '<a href="/terms" class="clickurl">').replace('[/A1]', '</a>')
                       .replace(/\[A2\]/g, '<a href="/privacy" class="clickurl">').replace(/\[\/A2\]/g, '</a>');
    l[18465] = l[18465].replace('[A]', '<a href="mailto:gdpr@mega.nz">').replace('[/A]', '</a>');
    l[18490] = l[18490].replace('[A]', '<a href="mailto:gdpr@mega.nz">').replace('[/A]', '</a>');
    l[18491] = l[18491].replace('[A]', '<a href="mailto:gdpr@mega.nz">').replace('[/A]', '</a>');

    l[18787] = l[18787]
        .replace('[A]', '<a href="https://github.com/meganz/MEGAcmd" rel="noreferrer" target="_blank">')
        .replace('[/A]', '</a>');
    l[19111] = l[19111].replace('[A]', '<a class="public-contact-link">').replace('[/A]', '</a>');

    var common = [
        15536, 16106, 16107, 16116, 16119, 16120, 16123, 16124, 16135, 16136, 16137, 16138, 16304, 16313, 16315,
        16316, 16341, 16358, 16359, 16360, 16361, 16375, 16382, 16383, 16384, 16394, 18228, 18423, 18425, 18444
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
