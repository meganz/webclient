var inherits = (function() {
    var createObject = Object.create || function createObject(source) {
        var Host = function() {};
        Host.prototype = source;
        return new Host();
    };

    return function(destination, source) {
        var proto = destination.prototype = createObject(source.prototype);
        proto.constructor = destination;
        proto._super = source.prototype;
    }
})();

/**
 *	Check if value is contained in a array. If it is return value
 *	otherwise false
 */
function anyOf(arr, value) {
    return $.inArray(value, arr) == -1 ? false : value;
}

/**
 *	Cascade:
 *
 *	Tiny helper to queue related tasks, in which the output of one function
 *	is the input of the next task. It is asynchronous
 *
 *		function([prevarg, arg], next)
 *
 *	Author: @crodas
 */
function Cascade(tasks, fnc, done, value)
{
    function scheduler(value) {
        if (tasks.length == 0) {
            return done(value);
        }

        fnc([value, tasks.shift()], scheduler)
    }

    scheduler(value);
}

/**
 *	Simple interface to run things in parallel (safely) once, and
 *	get a safe callback
 *
 *	Author: @crodas
 */
function Parallel(task) {
    var callbacks = {};
    return function(args, next) {
        var id = JSON.stringify(args)
        if (callbacks[id]) {
            return callbacks[id].push(next);
        }
        callbacks[id] = [next];
        task(args, function() {
            var args = arguments;
            $.each(callbacks[id], function(i, next) {
                next.apply(null, args);
            });
            delete callbacks[id];
        });
    };
}

function asciionly(text)
{
    var rforeign = /[^\u0000-\u007f]/;
    if (rforeign.test(text))
        return false;
    else
        return true;
}

function Later(callback) {
    return setTimeout(callback, 1000);
}

var Soon = is_chrome_firefox ? mozRunAsync : function(callback)
{
    setTimeout(callback, 17);
};

function SoonFc(func, ms)
{
    return function __soonfc()
    {
        var self = this, args = arguments;
        if (func.__sfc)
            clearTimeout(func.__sfc);
        func.__sfc = setTimeout(function() {
            delete func.__sfc;
            func.apply(self, args);
        }, ms || 122);
    };
}

function jScrollFade(id)
{

    $(id + ' .jspTrack').unbind('mouseover');
    $(id + ' .jspTrack').bind('mouseover', function(e)
    {
        $(this).find('.jspDrag').addClass('jspActive');
        $(this).closest('.jspContainer').uniqueId();
        jScrollFadeOut($(this).closest('.jspContainer').attr('id'));
    });

    if (!$.jScroll)
        $.jScroll = {};
    for (var i in $.jScroll)
        if ($.jScroll[i] == 0)
            delete $.jScroll[i];
    $(id).unbind('jsp-scroll-y.fade');
    $(id).bind('jsp-scroll-y.fade', function(event, scrollPositionY, isAtTop, isAtBottom)
    {
        $(this).find('.jspDrag').addClass('jspActive');
        $(this).find('.jspContainer').uniqueId();
        var id = $(this).find('.jspContainer').attr('id');
        jScrollFadeOut(id);
    });
}

function jScrollFadeOut(id)
{
    if (!$.jScroll[id])
        $.jScroll[id] = 0;
    $.jScroll[id]++;
    setTimeout(function(id)
    {
        $.jScroll[id]--;
        if ($.jScroll[id] == 0)
            $('#' + id + ' .jspDrag').removeClass('jspActive');
    }, 500, id);
}

function inputfocus(id, defaultvalue, pw)
{
    if (pw)
        $('#' + id)[0].type = 'password';
    if ($('#' + id)[0].value == defaultvalue)
        $('#' + id)[0].value = '';
}

function inputblur(id, defaultvalue, pw)
{
    if ($('#' + id)[0].value == '')
        $('#' + id)[0].value = defaultvalue;
    if (($('#' + id)[0].value == defaultvalue) && (pw))
        $('#' + id)[0].type = 'text';
}

function easeOutCubic(t, b, c, d)
{
    return c * ((t = t / d - 1) * t * t + 1) + b;
}

function ellipsis(text, location, maxCharacters)
{
    if (text.length > 0 && text.length > maxCharacters)
    {
        if (typeof (location) == 'undefined')
            location = 'end';
        switch (location)
        {
            case 'center':
                var center = (maxCharacters / 2);
                text = text.slice(0, center) + '...' + text.slice(-center);
                break;
            case 'end':
                text = text.slice(0, maxCharacters - 3) + '...';
                break;
        }
    }
    return text;
}

function translate(html)
{
    var arr = html.split("[$");
    var items = [];
    for (var i in arr)
    {
        var tmp = arr[i].split(']');
        if (tmp.length > 1)
        {
            var t = tmp[0];
            items.push(t);
        }
    }
    for (var i in items)
    {
        var tmp = items[i].split('.');
        if (tmp.length > 1)
        {
            if (tmp[1] == 'dq')
            {
                l[items[i]] = l[tmp[0]].replace('"', '&quot;');
            }
            else if (tmp[1] == 'q')
            {
                l[items[i]] = l[tmp[0]].replace("'", "\\'");
            }
            else if (tmp[1] == 'dqq')
            {
                l[items[i]] = l[tmp[0]].replace("'", "\\'");
                l[items[i]] = l[items[i]].replace('"', '&quot;');
            }
        }
        html = html.replace(new RegExp("\\[\\$" + items[i] + "\\]", "g"), l[items[i]]);
    }
    return html;
}

/**
 * Show the number of new notifications in the Browser's title bar e.g. (3) MEGA
 * @param {type} nperc
 */
function megatitle(nperc) {
    if (!nperc) {
        nperc = '';
    }
    var a = parseInt($('.notification-num:first').text());
    if (a > 0) {
        a = '(' + a + ') ';
    } else {
        a = '';
    }
    if (document.title !== a + 'MEGA' + nperc) {
        document.title = a + 'MEGA' + nperc;
    }
}

function populate_l()
{
	l[0] = 'Mega Limited ' + new Date().getFullYear();
	if ((lang == 'es') || (lang == 'pt') || (lang == 'sk')) l[0] = 'Mega Ltd.';
	l[1] = l[398];
	if (lang == 'en') l[1] = 'Go Pro';
	l[438] = l[438].replace('[X]','');
	l['439a'] = l[439];
	l[439] = l[439].replace('[X1]','').replace('[X2]','');
	l['466a'] = l[466];
	l[466] = l[466].replace('[X]','');
	l[543] = l[543].replace('[X]','');
	l[456] = l[456].replace(':','');
	l['471a'] = l[471].replace('[X]',10);
	l['471b'] = l[471].replace('[X]',100);
	l['471c'] = l[471].replace('[X]',250);
	l['471d'] = l[471].replace('[X]',500);
	l['471e'] = l[471].replace('[X]',1000);
	l['469a'] = l[469].replace('[X]',10);
	l['469b'] = l[469].replace('[X]',100);
	l['469c'] = l[469].replace('[X]',250);
	l['472a'] = l[472].replace('[X]',10);
	l['472b'] = l[472].replace('[X]',100);
	l['472c'] = l[472].replace('[X]',250);
	l['208a'] = l[208].replace('[A]','<a href="#terms" class="red">');
	l['208a'] = l['208a'].replace('[/A]','</a>');
	l[208] = l[208].replace('[A]','<a href="#terms">');
	l[208] = l[208].replace('[/A]','</a>');
	l[517] = l[517].replace('[A]','<a href="#help">').replace('[/A]','</a>');
	l[521] = l[521].replace('[A]','<a href="#copyright">').replace('[/A]','</a>');
	l[553] = l[553].replace('[A]','<a href="mailto:resellers@mega.co.nz">').replace('[/A]','</a>');
	l[555] = l[555].replace('[A]','<a href="#terms">').replace('[/A]','</a>');
	l[754] = l[754].replace('[A]','<a href="http://www.google.com/chrome" target="_blank" style="color:#D9290B;">');
	l[754] = l[754].replace('[/A]','</a>');
	l[871] = l[871].replace('[B]','<strong>').replace('[/B]','</strong>').replace('[A]','<a href="#pro">').replace('[/A]','</a>');
	l[924] = l[924].replace('[A]','<span class="red">').replace('[/A]','</span>');
	l[501] = l[501].replace('17','').replace('%','');
	l[1066] = l[1066].replace('[A]','<a class="red">').replace('[/A]','</a>');
	l[1067] = l[1067].replace('[A]','<span class="red">').replace('[/A]','</span>');
	l[1094] = l[1094].replace('[A]','<a href="#plugin">').replace('[/A]','</a>');
	l[1095] = l[1095].replace('[A]','<span class="red">').replace('[/A]','</span>');
	l[1133] = l[1133].replace('[A]','<a href="http://en.wikipedia.org/wiki/Entropy" target="_blank">').replace('[/A]','</a>');
	l[1134] = l[1134].replace('[A]','<a href="http://en.wikipedia.org/wiki/Public-key_cryptography" target="_blank">').replace('[/A]','</a>');
	l[1148] = l[1148].replace('[A]','<span class="red">').replace('[/A]','</span>');
	l[1151] = l[1151].replace('[A]','<span class="red">').replace('[/A]','</span>');
	l[731] = l[731].replace('[A]','<a href="#terms">').replace('[/A]','</a>');
	if (lang == 'en') l[965] = 'Legal & policies';
	l[1159] = l[1159].replace('[A]','<span class="red">').replace('[/A]','</span>');
	l[1171] = l[1171].replace('[A]','<span class="red">').replace('[/A]','</span>');
	l[1185] = l[1185].replace('[X]','<strong>MEGA.crx</strong>');
	l[1242] = l[1242].replace('[A]','<a href="#affiliateterms" target="_blank">').replace('[/A]','</a>');
	l[1218] = l[1218].replace('[A]','<a href="#affiliateterms" class="red">').replace('[/A]','</a>');
	l[1212] = l[1212].replace('[A]','<a href="#sdk" class="red">').replace('[/A]','</a>');
	l[1274] = l[1274].replace('[A]','<a href="#takedown">').replace('[/A]','</a>');
	l[1275] = l[1275].replace('[A]','<a href="#copyright">').replace('[/A]','</a>');
	l[1244] = l[1244].replace('[A]','<a href="#affiliateterms" class="red">').replace('[/A]','</a>');
	l[1201] = l[1201].replace('[A]','<span class="red">').replace('[/A]','</span>');
	l[1208] = l[1208].replace('[B]','<strong>').replace('[/B]','</strong>');
	l[1915] = l[1915].replace('[A]','<a class="red" href="https://chrome.google.com/webstore/detail/mega/bigefpfhnfcobdlfbedofhhaibnlghod" target="_blank">').replace('[/A]','</a>');
	l[1936] = l[1936].replace('[A]','<a href="#backup">').replace('[/A]','</a>');
	l[1942] = l[1942].replace('[A]','<a href="#backup">').replace('[/A]','</a>');
	l[1943] = l[1943].replace('[A]','<a href="mailto:support@mega.co.nz">').replace('[/A]','</a>');
	l[1948] = l[1948].replace('[A]','<a href="mailto:support@mega.co.nz">').replace('[/A]','</a>');
	l[1957] = l[1957].replace('[A]','<a href="#recovery">').replace('[/A]','</a>');
	l[1965] = l[1965].replace('[A]','<a href="#recovery">').replace('[/A]','</a>');
	l[1982] = l[1982].replace('[A]','<font style="color:#D21F00;">').replace('[/A]','</font>');
	l[1993] = l[1993].replace('[A]','<span class="red">').replace('[/A]','</span>');
	l[1371] = l[1371].replace('2014','2015');
	l[122] = l[122].replace('five or six hours','<span class="red">five or six hours</span>');
	l[231] = l[231].replace('No thanks, I\'ll wait','I\'ll wait');

	l['year'] = new Date().getFullYear();
}

function GetNextNode(labelid)
{
    var label = document.getElementById(labelid);
    var select_id = document.getElementById(labelid + "_option");
    label.innerHTML = select_id.options[select_id.selectedIndex].text;
    return select_id.options[select_id.selectedIndex].value;
}

function showmoney(number)
{
    number = number.toString();
    var dollars = number.split('.')[0],
        cents = (number.split('.')[1] || '') + '00';
    dollars = dollars.split('').reverse().join('')
        .replace(/(\d{3}(?!$))/g, '$1,')
        .split('').reverse().join('');
    return dollars + '.' + cents.slice(0, 2);
}

function getHeight()
{
    var myHeight = 0;
    if (typeof (window.innerWidth) == 'number')
        myHeight = window.innerHeight;
    else if (document.documentElement && (document.documentElement.clientWidth || document.documentElement.clientHeight))
        myHeight = document.documentElement.clientHeight;
    else if (document.body && (document.body.clientWidth || document.body.clientHeight))
        myHeight = document.body.clientHeight;
    return myHeight;
}

function divscroll(el)
{
    document.getElementById(el).scrollIntoView();
    $('body').scrollLeft(0);
    $('html').scrollTop(0);
    if (page == 'start')
        start_menu(el);
}

function removeHash() {
    var scrollV, scrollH, loc = window.location;
    if ("pushState" in history)
        history.pushState("", document.title, loc.pathname + loc.search);
    else {
        // Prevent scrolling by storing the page's current scroll offset
        scrollV = document.body.scrollTop;
        scrollH = document.body.scrollLeft;
        loc.hash = "";
        // Restore the scroll offset, should be flicker free
        document.body.scrollTop = scrollV;
        document.body.scrollLeft = scrollH;
    }
}

function browserdetails(useragent)
{
	useragent = (' ' + useragent).toLowerCase();
	var os = false;
	var browser = false;
	var icon = '';
	var name = '';
	if (useragent.indexOf('android') > 0) os = 'Android';
	else if (useragent.indexOf('windows') > 0) os = 'Windows';
	else if (useragent.indexOf('iphone') > 0) os = 'iPhone';
	else if (useragent.indexOf('imega') > 0) os = 'iPhone';
	else if (useragent.indexOf('ipad') > 0) os = 'iPad';
	else if (useragent.indexOf('mac') > 0) os = 'Apple';
	else if (useragent.indexOf('linux') > 0) os = 'Linux';
	else if (useragent.indexOf('linux') > 0) os = 'MEGAsync';
	else if (useragent.indexOf('blackberry') > 0) os = 'Blackberry';
	if (useragent.indexOf('opera') > 0 || useragent.indexOf(' opr/') > 0) browser = 'Opera';
	else if (useragent.indexOf('chrome') > 0) browser = 'Chrome';
	else if (useragent.indexOf('safari') > 0) browser = 'Safari';
	else if (useragent.indexOf('firefox') > 0) browser = 'Firefox';
	else if (useragent.indexOf('megasync') > 0) browser = 'MEGAsync';
	else if (useragent.indexOf('msie') > 0
		|| "ActiveXObject" in window) browser = 'Internet Explorer';
	if ((os) && (browser))
	{
		name = browser + ' on ' + os;
		if (browser == 'Internet Explorer') icon = 'ie.png';
		else icon = browser.toLowerCase() + '.png';
	}
	else if (os)
	{
		name = os;
		icon = os.toLowerCase() + '.png';
	}
	else if (browser)
	{
		name = browser;
		if (browser == 'Internet Explorer') icon = 'ie.png';
		else icon = browser.toLowerCase() + '.png';
	}
	else
	{
		name = 'Unknown';
		icon = 'unknown.png';
	}
	var browserdetails = {};
	browserdetails.name = name;
	browserdetails.icon = icon;
	browserdetails.browser = browser;
	return browserdetails;
}

function countrydetails(isocode)
{
    var cdetails =
        {
            name: isocountries[isocode],
            icon: isocode.toLowerCase() + '.gif'
        };
    return cdetails;
}

function time2date(unixtime, ignoretime)
{
    var MyDate = new Date(unixtime * 1000 || 0);
    var MyDateString =
        MyDate.getFullYear() + '-'
        + ('0' + (MyDate.getMonth() + 1)).slice(-2) + '-'
        + ('0' + MyDate.getDate()).slice(-2);
    if (!ignoretime)
    {
        MyDateString += ' ' + ('0' + MyDate.getHours()).slice(-2) + ':'
            + ('0' + MyDate.getMinutes()).slice(-2);
    }
    return MyDateString;
}

// in case we need to run functions.js in a standalone (non secureboot.js) environment, we need to handle this case:
if (typeof (l) == 'undefined') {
    l = [];
}

var date_months = []

$(window).on('onMegaLoaded', function() {
	date_months = [l[408], l[409], l[410], l[411], l[412], l[413], l[414], l[415], l[416], l[417], l[418], l[419]];
});

function acc_time2date(unixtime)
{
	var MyDate = new Date(unixtime*1000);
	var th = 'th';
	if ((parseInt(MyDate.getDate()) == 11) || (parseInt(MyDate.getDate()) == 12)) {}
	else if (('' + MyDate.getDate()).slice(-1) == '1') th = 'st';
	else if (('' + MyDate.getDate()).slice(-1) == '2') th = 'nd';
	else if (('' + MyDate.getDate()).slice(-1) == '3') th = 'rd';
	if (lang !== 'en') th = ',';
	return date_months[MyDate.getMonth()] + ' ' + MyDate.getDate() + th + ' ' + MyDate.getFullYear();
}

function time2last(timestamp)
{
    var sec = (new Date().getTime() / 1000) - timestamp;
    if (sec < 4)
        return l[880];
    else if (sec < 59)
        return l[873].replace('[X]', Math.ceil(sec));
    else if (sec < 90)
        return l[874];
    else if (sec < 3540)
        return l[875].replace('[X]', Math.ceil(sec / 60));
    else if (sec < 4500)
        return l[876];
    else if (sec < 82000)
        return l[877].replace('[X]', Math.ceil(sec / 3600));
    else if (sec < 110000)
        return l[878];
    else
        return l[879].replace('[X]', Math.ceil(sec / 86400));
}

function unixtime() {
    return (new Date().getTime() / 1000);
}

function uplpad(number, length)
{
    var str = '' + number;
    while (str.length < length)
    {
        str = '0' + str;
    }
    return str;
}

function secondsToTime(secs)
{
    if (isNaN(secs))
        return '--:--:--';
    if (secs < 0)
        return '';

    var hours = uplpad(Math.floor(secs / (60 * 60)), 2);
    var divisor_for_minutes = secs % (60 * 60);
    var minutes = uplpad(Math.floor(divisor_for_minutes / 60), 2);
    var divisor_for_seconds = divisor_for_minutes % 60;
    var seconds = uplpad(Math.floor(divisor_for_seconds), 2);
    var returnvar = hours + ':' + minutes + ':' + seconds;
    return returnvar;
}

function htmlentities(value)
{
    if (!value)
        return '';
    return $('<div/>').text(value).html();
}

function bytesToSize(bytes, precision)
{
    if (!bytes)
        return '0';

    var s_b = 'B';
    var s_kb = 'KB';
    var s_mb = 'MB';
    var s_gb = 'GB';
    var s_tb = 'TB';

    if (lang == 'fr')
    {
        s_b = 'O';
        s_kb = 'Ko';
        s_mb = 'Mo';
        s_gb = 'Go';
        s_tb = 'To';
    }

    var kilobyte = 1024;
    var megabyte = kilobyte * 1024;
    var gigabyte = megabyte * 1024;
    var terabyte = gigabyte * 1024;
    if (bytes > 1024 * 1024 * 1024)
        precision = 2;
    else if (bytes > 1024 * 1024)
        precision = 1;
    if ((bytes >= 0) && (bytes < kilobyte))
        return parseInt(bytes) + ' ' + s_b;
    else if ((bytes >= kilobyte) && (bytes < megabyte))
        return (bytes / kilobyte).toFixed(precision) + ' ' + s_kb;
    else if ((bytes >= megabyte) && (bytes < gigabyte))
        return (bytes / megabyte).toFixed(precision) + ' ' + s_mb;
    else if ((bytes >= gigabyte) && (bytes < terabyte))
        return (bytes / gigabyte).toFixed(precision) + ' ' + s_gb;
    else if (bytes >= terabyte)
        return (bytes / terabyte).toFixed(precision) + ' ' + s_tb;
    else
        return parseInt(bytes) + ' ' + s_b;
}

function checkPassword(strPassword)
{
    var m_strUpperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var m_strLowerCase = "abcdefghijklmnopqrstuvwxyz";
    var m_strNumber = "0123456789";
    var m_strCharacters = "!@#$%^&*?_~";
    var nScore = 0;
    nScore += countDif(strPassword) * 2;
    var extra = countDif(strPassword) * strPassword.length / 3;
    if (extra > 25)
        extra = 25;
    nScore += extra;
    var nUpperCount = countContain(strPassword, m_strUpperCase);
    var nLowerCount = countContain(strPassword, m_strLowerCase);
    var nLowerUpperCount = nUpperCount + nLowerCount;
    if (nUpperCount == 0 && nLowerCount != 0)
        nScore += 10;
    else if (nUpperCount != 0 && nLowerCount != 0)
        nScore += 10;
    var nNumberCount = countContain(strPassword, m_strNumber);
    if (nNumberCount == 1)
        nScore += 10;
    if (nNumberCount >= 3)
        nScore += 15;
    var nCharacterCount = countContain(strPassword, m_strCharacters);
    if (nCharacterCount == 1)
        nScore += 10;
    if (nCharacterCount > 1)
        nScore += 10;
    if (nNumberCount != 0 && nLowerUpperCount != 0)
        nScore += 2;
    if (nNumberCount != 0 && nLowerUpperCount != 0 && nCharacterCount != 0)
        nScore += 3;
    if (nNumberCount != 0 && nUpperCount != 0 && nLowerCount != 0 && nCharacterCount != 0)
        nScore += 5;
    return nScore;
}

function showNonActivatedAccountDialog(log)
{
    if (log) megaAnalytics.log("pro", "showNonActivatedAccountDialog");

    var $dialog = $('.top-warning-popup');
    $dialog.addClass('not-activated');
    $('.warning-green-icon', $dialog).remove();
    $('.fm-notifications-bottom', $dialog).remove();
    $('.warning-popup-body', $dialog)
        .unbind('click')
        .empty()
        .append($("<div class='warning-gray-icon mailbox-icon'></div>"))
        .append(l[5847]); //TODO: l[]
}

function countDif(strPassword)
{
    var chararr = [];
    var nCount = 0;
    for (i = 0; i < strPassword.length; i++)
    {
        if (!chararr[strPassword.charAt(i)])
        {
            chararr[strPassword.charAt(i)] = true;
            nCount++;
        }
    }
    return nCount;
}

function countContain(strPassword, strCheck)
{
    var nCount = 0;
    for (i = 0; i < strPassword.length; i++)
    {
        if (strCheck.indexOf(strPassword.charAt(i)) > -1)
            nCount++;
    }
    return nCount;
}

function logincheckboxCheck(ch_id)
{
    var ch_div = ch_id + "_div";
    if (document.getElementById(ch_id).checked)
        document.getElementById(ch_div).className = "checkboxOn";
    else
        document.getElementById(ch_div).className = "checkboxOff";
}

function makeid(len)
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < len; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

function checkMail(email)
{
    email = email.replace('+', '', 'g');
    var filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    if (filter.test(email))
        return false;
    else
        return true;
}

/**
 * Helper function for creating alias of a method w/ specific context
 *
 * @param context
 * @param fn
 * @returns {aliasClosure}
 */
function funcAlias(context, fn) {
    return function aliasClosure() {
        return fn.apply(context, arguments);
    };
}

/**
 * Adds on, bind, unbind, one and trigger methods to a specific class's prototype.
 *
 * @param kls class on which prototype this method should add the on, bind, unbind, etc methods
 */
function makeObservable(kls) {
    var aliases = ['on', 'bind', 'unbind', 'one', 'trigger'];

    $.each(aliases, function(k, v) {
        if (kls.prototype) {
            kls.prototype[v] = function() {
                return $(this)[v].apply($(this), toArray(arguments));
            }
        } else {
            kls[v] = function() {
                return $(this)[v].apply($(this), toArray(arguments));
            }
        }
    });
}

/**
 * Adds simple .setMeta and .getMeta functions, which can be used to store some meta information on the fly.
 * Also triggers `onMetaChange` events (only if the `kls` have a `trigger` method !)
 *
 * @param kls {Class} on which prototype's this method should add the setMeta and getMeta
 */
function makeMetaAware(kls) {
    /**
     * Store meta data
     *
     * @param prefix string
     * @param namespace string
     * @param k string
     * @param val {*}
     */
    kls.prototype.setMeta = function(prefix, namespace, k, val) {
        var self = this;

        if (self["_" + prefix] == undefined) {
            self["_" + prefix] = {};
        }
        if (self["_" + prefix][namespace] == undefined) {
            self["_" + prefix][namespace] = {};
        }
        self["_" + prefix][namespace][k] = val;

        if (self.trigger) {
            self.trigger("onMetaChange", prefix, namespace, k, val);
        }
    };

    /**
     * Clear/delete meta data
     *
     * @param prefix string  optional
     * @param namespace string  optional
     * @param k string optional
     */
    kls.prototype.clearMeta = function(prefix, namespace, k) {
        var self = this;

        if (prefix && !namespace && !k) {
            delete self["_" + prefix];
        } else if (prefix && namespace && !k) {
            delete self["_" + prefix][namespace];
        } else if (prefix && namespace && k) {
            delete self["_" + prefix][namespace][k];
        }

        if (self.trigger) {
            self.trigger("onMetaChange", prefix, namespace, k);
        }
    };

    /**
     * Retrieve meta data
     *
     * @param prefix {string}
     * @param namespace {string} optional
     * @param k {string} optional
     * @param default_value {*} optional
     * @returns {*}
     */
    kls.prototype.getMeta = function(prefix, namespace, k, default_value) {
        var self = this;

        namespace = namespace || undefined; /* optional */
        k = k || undefined; /* optional */
        default_value = default_value || undefined; /* optional */

        // support for calling only with 2 args.
        if (k == undefined) {
            if (self["_" + prefix] == undefined) {
                return default_value;
            } else {
                return self["_" + prefix][namespace] || default_value;
            }
        } else {
            // all args

            if (self["_" + prefix] == undefined) {
                return default_value;
            } else if (self["_" + prefix][namespace] == undefined) {
                return default_value;
            } else {
                return self["_" + prefix][namespace][k] || default_value;
            }
        }
    };
}

/**
 * Simple method for generating unique event name with a .suffix that is a hash of the passed 3-n arguments
 * Main purpose is to be used with jQuery.bind and jQuery.unbind.
 *
 * @param eventName {string} event name
 * @param name {string} name of the handler (e.g. .suffix)
 * @returns {string} e.g. $eventName.$name_$ShortHashOfTheAdditionalArguments
 */
function generateEventSuffixFromArguments(eventName, name) {
    var args = Array.prototype.splice.call(arguments, 2);
    var result = "";
    $.each(args, function(k, v) {
        result += v;
    });

    return eventName + "." + name + "_" + ("" + fastHashFunction(result)).replace("-", "_");
}

/**
 * This is a placeholder, which will be used anywhere in our code where we need a simple and FAST hash function.
 * Later on, we can change the implementation (to use md5 or murmur) by just changing the function body of this
 * function.
 * @param {String}
 */
function fastHashFunction(val) {
    return MurmurHash3(val, 0x4ef5391a).toString();
}

/**
 * @see http://stackoverflow.com/q/7616461/940217
 * @return {number}
 */
function simpleStringHashCode(str) {
    assert(str, "Missing str passed to simpleStringHashCode");

    if (Array.prototype.reduce) {
        return str.split("").reduce(function(a, b) {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a
        }, 0);
    }
    var hash = 0;
    if (str.length === 0)
        return hash;
    for (var i = 0; i < str.length; i++) {
        var character = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

/**
 * Creates a promise, which will fail if the validateFunction() don't return true in a timely manner (e.g. < timeout).
 *
 * @param validateFunction {Function}
 * @param tick {int}
 * @param timeout {int}
 * @param [resolveRejectArgs] {(Array|*)} args that will be used to call back .resolve/.reject
 * @param [waitForPromise] {(MegaPromise|$.Deferred)} Before starting the timer, we will wait for this promise to be rej/res first.
 * @returns {Deferred}
 */
function createTimeoutPromise(validateFunction, tick, timeout, resolveRejectArgs, waitForPromise) {
    var $promise = new MegaPromise();
    resolveRejectArgs = resolveRejectArgs || [];
    if (!$.isArray(resolveRejectArgs)) {
        resolveRejectArgs = [resolveRejectArgs]
    }

    $promise.verify = function() {
        if (validateFunction()) {
            if (window.d) {
                console.debug("Resolving timeout promise", timeout, "ms", "at", (new Date()), validateFunction, resolveRejectArgs);
            }
            $promise.resolve.apply($promise, resolveRejectArgs);
        }
    };

    var startTimerChecks = function() {
        var tickInterval = setInterval(function() {
            $promise.verify();
        }, tick);

        var timeoutTimer = setTimeout(function() {
            if (validateFunction()) {
                if (window.d) {
                    console.debug("Resolving timeout promise", timeout, "ms", "at", (new Date()), validateFunction, resolveRejectArgs);
                }
                $promise.resolve.apply($promise, resolveRejectArgs);
            } else {
                console.error("Timed out after waiting", timeout, "ms", "at", (new Date()), validateFunction, resolveRejectArgs);
                $promise.reject.apply($promise, resolveRejectArgs);
            }
        }, timeout);

        // stop any running timers and timeouts
        $promise.always(function() {
            clearInterval(tickInterval);
            clearTimeout(timeoutTimer)
        });

        $promise.verify();
    };

    if (!waitForPromise || !waitForPromise.done) {
        startTimerChecks();
    } else {
        waitForPromise.always(function() {
            startTimerChecks();
        });
    }

    return $promise;
}

/**
 * Simple .toArray method to be used to convert `arguments` to a normal JavaScript Array
 *
 * @param val {Arguments}
 * @returns {Array}
 */
function toArray(val) {
    return Array.prototype.slice.call(val, val);
}

/**
 * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
 * (c) 2011 Colin Snover <http://zetafleet.com>
 * Released under MIT license.
 */
(function(Date, undefined) {
    var origParse = Date.parse, numericKeys = [1, 4, 5, 6, 7, 10, 11];
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

            timestamp = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
        }
        else {
            timestamp = origParse ? origParse(date) : NaN;
        }

        return timestamp;
    };
}(Date));

/**
 * @module assert
 *
 * Assertion helper module.
 *
 * Example usage:
 *
 * <pre>
 * function lastElement(array) {
 *     assert(array.length > 0, "empty array in lastElement");
 *     return array[array.length - 1];
 * }
 * </pre>
 */
/**
 * Assertion exception.
 * @param message
 *     Message for exception on failure.
 * @constructor
 */
function AssertionFailed(message) {
    this.message = message;
}
AssertionFailed.prototype = Object.create(Error.prototype);
AssertionFailed.prototype.name = 'AssertionFailed';

/**
 * Assert a given test condition.
 *
 * Throws an AssertionFailed exception with the given `message` on failure.
 *
 * @param test
 *     Test statement.
 * @param message
 *     Message for exception on failure.
 */
function assert(test, message) {
    if (!test) {
        if (MegaLogger && MegaLogger.rootLogger) {
            MegaLogger.rootLogger.error("assertion failed: ", message);
        } else if (window.d) {
            console.error(message);
        }

        if (localStorage.stopOnAssertFail) {
            debugger;
        }

        throw new AssertionFailed(message);
    }
}

/**
 * Pad/prepend `val` with "0" (zeros) until the length is == `length`
 *
 * @param val {String} value to add "0" to
 * @param len {Number} expected length
 * @returns {String}
 */
function addZeroIfLenLessThen(val, len) {
    if (val.toString().length < len) {
        for (var i = val.toString().length; i < len; i++) {
            val = "0" + val;
        }
    }
    return val;
}

function NOW() {
    return Date.now();
}

/**
 *	Global function to help debugging
 */
function DEBUG2() {
    if (typeof (d) !== "undefined" && d) {
        console.warn.apply(console, arguments)
    }
}

function ERRDEBUG() {
    if (typeof (d) !== "undefined" && d) {
        console.error.apply(console, arguments)
    }
}

function DEBUG() {
    if (typeof (d) !== "undefined" && d) {
        (console.debug || console.log).apply(console, arguments)
    }
}

function ASSERT(what, msg, udata) {
    if (!what)
    {
        var af = new Error('failed assertion; ' + msg);
        if (udata)
            af.udata = udata;
        Soon(function() {
            throw af;
        });
        if (console.assert)
            console.assert(what, msg);
        else
            console.error('FAILED ASSERTION', msg);
    }
    return !!what;
}

function srvlog(msg, data, silent)
{
	if (data && !(data instanceof Error)) data = { udata : data };
	if (!silent && d) console.error(msg);
	if (!d || onBetaW) window.onerror(msg, '', data ? 1:-1, 0, data || null);
}

function oDestroy(obj) {
	if (window.d) ASSERT(Object.isFrozen(obj) === false, 'Object already frozen...');

	Object.keys(obj).forEach(function(memb) {
		if (obj.hasOwnProperty(memb)) delete obj[memb];
	});
	Object.defineProperty(obj, ":$:frozen:", { value : String(new Date()), writable : false });

	if (window.d) Object.freeze(obj);
}

function oIsFrozen(obj)
{
	return obj && typeof obj === 'object' && obj.hasOwnProperty(":$:frozen:");
}

/**
 *	Return a default callback for error handlign
 */
function dlError(text) {
    return function(e) {
        console.log(text + ' ' + e);
        alert(text + ' ' + e);
    };
}

/**
 *	Remove an element from an *array*
 */
function removeValue(array, value, can_fail) {
    var idx = array.indexOf(value);
    ASSERT(can_fail || idx != -1, 'Unable to Remove Value ' + value);
    if (idx != -1)
        array.splice(idx, 1);
    return idx != -1;
}

function setTransferStatus(dl, status, ethrow, lock) {
    var id = dl && DownloadManager.GetGID(dl);
    var text = '' + status;
    if (text.length > 44)
        text = text.substr(0, 42) + '...';
    $('.transfer-table #' + id + ' td:eq(6)').text(text);
    if (lock)
        $('.transfer-table #' + id).attr('id', 'LOCKed_' + id);
    if (d)
        console.error(status);
    if (ethrow)
        throw status;
}

function dlFatalError(dl, error, ethrow) {
    var m = 'This issue should be resolved ';
    if (navigator.webkitGetUserMedia)
    {
        m += 'exiting from Incognito mode.';
    }
    else if (navigator.msSaveOrOpenBlob)
    {
        Later(browserDialog);
        m = l[1933];
    }
    else if (dlMethod === FlashIO)
    {
        Later(browserDialog);
        m = l[1308];
    }
    else
    {
        Later(firefoxDialog);
        // m += 'installing our extension.'
        m = l[1932];
    }
    msgDialog('warninga', l[1676], m, error);
    setTransferStatus(dl, error, ethrow, true);
    DownloadManager.abort(dl);
}

/**
 * Original: http://stackoverflow.com/questions/7317299/regex-matching-list-of-emoticons-of-various-type
 *
 * @param text
 * @returns {XML|string|void}
 * @constructor
 */
function RegExpEscape(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function unixtimeToTimeString(timestamp) {
    var date = new Date(timestamp * 1000);
    return addZeroIfLenLessThen(date.getHours(), 2) + ":" + addZeroIfLenLessThen(date.getMinutes(), 2) + "." + addZeroIfLenLessThen(date.getSeconds(), 2)
}

/**
 * Used in the callLoggerWrapper to generate dynamic colors depending on the textPrefix
 *
 * copyrights: http://stackoverflow.com/questions/9600295/automatically-change-text-color-to-assure-readability
 *
 * @param hexTripletColor
 * @returns {*}
 */
function invertColor(hexTripletColor) {
    var color = hexTripletColor;
    color = color.substring(1);           // remove #
    color = parseInt(color, 16);          // convert to integer
    color = 0xFFFFFF ^ color;             // invert three bytes
    color = color.toString(16);           // convert to hex
    color = ("000000" + color).slice(-6); // pad with leading zeros
    color = "#" + color;                  // prepend #
    return color;
}

/**
 * Simple wrapper function that will log all calls of `fnName`.
 * This function is intended to be used for dev/debugging/testing purposes only.
 *
 * @param ctx
 * @param fnName
 * @param loggerFn
 */
function callLoggerWrapper(ctx, fnName, loggerFn, textPrefix, parentLogger) {
    if (!window.d) {
        return;
    }

    var origFn = ctx[fnName];
    var textPrefix = textPrefix || "missing-prefix";

    var logger = MegaLogger.getLogger(textPrefix + "[" + fnName + "]", {}, parentLogger);
    var logFnName = loggerFn == console.error ? "error" : "debug";

    if (ctx[fnName].haveCallLogger) { // recursion
        return;
    }
    ctx[fnName] = function() {
        //loggerFn.apply(console, [prefix1, prefix2, "Called: ", fnName, toArray(arguments)]);
        logger[logFnName].apply(logger, ["(calling) arguments: "].concat(toArray(arguments)));

        var res = origFn.apply(this, toArray(arguments));
        //loggerFn.apply(console, [prefix1, prefix2, "Got result: ", fnName, toArray(arguments), res]);
        logger[logFnName].apply(logger, ["(end call) arguments: "].concat(toArray(arguments)).concat(["returned: ", res]));

        return res;
    };
    ctx[fnName].haveCallLogger = true; // recursion
}

/**
 * Simple Object instance call log helper
 * This function is intended to be used for dev/debugging/testing purposes only.
 *
 *
 * WARNING: This function will create tons of references in the window.callLoggerObjects & also may flood your console.
 *
 * @param ctx
 * @param [loggerFn] {Function}
 * @param [recursive] {boolean}
 */
function logAllCallsOnObject(ctx, loggerFn, recursive, textPrefix, parentLogger) {
    if (!window.d) {
        return;
    }
    loggerFn = loggerFn || console.debug;

    if (typeof (parentLogger) == "undefined") {
        var logger = new MegaLogger(textPrefix);
    }
    if (!window.callLoggerObjects) {
        window.callLoggerObjects = [];
    }

    $.each(ctx, function(k, v) {
        if (typeof (v) == "function") {
            callLoggerWrapper(ctx, k, loggerFn, textPrefix, parentLogger);
        } else if (typeof (v) == "object" && !$.isArray(v) && v !== null && recursive && !$.inArray(window.callLoggerObjects)) {
            window.callLoggerObjects.push(v);
            logAllCallsOnObject(v, loggerFn, recursive, textPrefix + ":" + k, parentLogger);
        }
    });
}

function array_unique(arr) {
    return $.grep(arr, function(v, k) {
        return $.inArray(v, arr) === k;
    });
}

function array_random(arr) {
    return arr[rand(arr.length - 1)];
}
/**
 * Simple method that will convert Mega user ids to base32 strings (that should be used when doing XMPP auth)
 *
 * @param handle {string} mega user id
 * @returns {string} base32 formatted user id to be used when doing xmpp auth
 */
function megaUserIdEncodeForXmpp(handle) {
    var s = base64urldecode(handle);
    return baseenc.b32encode(s).replace(/=/g, "");
}

/**
 * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
 *
 * @author <a href="mailto:gary.court.gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby.gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 *
 * @param {string} key ASCII only
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash
 */
function MurmurHash3(key, seed) {
    var remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;

    remainder = key.length & 3; // key.length % 4
    bytes = key.length - remainder;
    h1 = seed || 0xe6546b64;
    c1 = 0xcc9e2d51;
    c2 = 0x1b873593;
    i = 0;

    while (i < bytes) {
        k1 =
            ((key.charCodeAt(i) & 0xff)) |
            ((key.charCodeAt(++i) & 0xff) << 8) |
            ((key.charCodeAt(++i) & 0xff) << 16) |
            ((key.charCodeAt(++i) & 0xff) << 24);
        ++i;

        k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

        h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
        h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
        h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
    }

    k1 = 0;

    switch (remainder) {
        case 3:
            k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
        case 2:
            k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
        case 1:
            k1 ^= (key.charCodeAt(i) & 0xff);

            k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
            k1 = (k1 << 15) | (k1 >>> 17);
            k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
            h1 ^= k1;
    }

    h1 ^= key.length;

    h1 ^= h1 >>> 16;
    h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 13;
    h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
    h1 ^= h1 >>> 16;

    return h1 >>> 0;
}

/**
 *	Create a pool of workers, it returns a Queue object
 *	so it can be called many times and it'd be throttled
 *	by the queue
 */
function CreateWorkers(url, message, size) {
    size = size || 4
    var worker = []
        , instances = [];

    function handler(id) {
        return function(e) {
            message(this.context, e, function(r) {
                worker[id].busy = false; /* release worker */
                instances[id](r);
            });
        }
    }

    function create(i) {
        var w;

		try {
			w  = new Worker(url);
		} catch(e) {
			msgDialog('warninga', '' + url, '' + e, location.hostname);
			throw e;
		}

		w.id   = i;
		w.busy = false;
		w.postMessage = w.webkitPostMessage || w.postMessage;
		w.onmessage   = handler(i);
		return w;
	}

    for (var i = 0; i < size; i++) {
        worker.push(null);
    }

	return new MegaQueue(function(task, done) {
		for (var i = 0; i < size; i++) {
			if (worker[i] === null) worker[i] = create(i);
			if (!worker[i].busy) break;
		}
		worker[i].busy = true;
		instances[i]   = done;
		$.each(task, function(e, t) {
			if (e == 0) {
				worker[i].context = t;
			} else if (t.constructor === Uint8Array && typeof MSBlobBuilder !== "function") {
				worker[i].postMessage(t.buffer,[t.buffer]);
			} else {
				worker[i].postMessage(t);
			}
		});
	}, size, 'worker-' + url);
}

function mKeyDialog(ph, fl)
{
    $('.new-download-buttons').addClass('hidden');
    $('.new-download-file-title').text(l[1199]);
    $('.new-download-file-icon').addClass(fileicon({name: 'unknown.unknown'}));
    $('.fm-dialog.dlkey-dialog').removeClass('hidden');
    $('.fm-dialog-overlay').removeClass('hidden');
    $('body').addClass('overlayed');
    $('.fm-dialog.dlkey-dialog input').unbind('focus');
    $('.fm-dialog.dlkey-dialog input').bind('focus', function(e)
    {
        if ($(this).val() == l[1028])
            $(this).val('');
    });
    $('.fm-dialog.dlkey-dialog input').unbind('blur');
    $('.fm-dialog.dlkey-dialog input').bind('blur', function(e)
    {
        if ($(this).val() == '')
            $(this).val(l[1028]);
    });
    $('.fm-dialog.dlkey-dialog input').unbind('keydown');
    $('.fm-dialog.dlkey-dialog input').bind('keydown', function(e)
    {
        $('.fm-dialog.dlkey-dialog .fm-dialog-new-folder-button').addClass('active');
        if (e.keyCode == 13)
            $('.fm-dialog.dlkey-dialog .fm-dialog-new-folder-button').click();
    });
    $('.fm-dialog.dlkey-dialog .fm-dialog-new-folder-button').unbind('click');
    $('.fm-dialog.dlkey-dialog .fm-dialog-new-folder-button').bind('click', function(e)
    {
        var key = $('.fm-dialog.dlkey-dialog input').val();

        if (key && key !== l[1028])
        {
            $('.fm-dialog.dlkey-dialog').addClass('hidden');
            $('.fm-dialog-overlay').addClass('hidden');
            document.location.hash = (fl ? '#F!' : '#!') + ph + '!' + key;
        }
    });
    $('.fm-dialog.dlkey-dialog .fm-dialog-close').unbind('click');
    $('.fm-dialog.dlkey-dialog .fm-dialog-close').bind('click', function(e)
    {
        $('.fm-dialog.dlkey-dialog').addClass('hidden');
        $('.fm-dialog-overlay').addClass('hidden');
    });
}

function dcTracer(ctr) {
	var name = ctr.name, proto = ctr.prototype;
	for(var fn in proto) {
		if(proto.hasOwnProperty(fn) && typeof proto[fn] === 'function') {
			console.log('Tracing ' + name + '.' + fn);
			proto[fn] = (function(fn, fc) {
				fc.dbg = function() {
					try {
						console.log('Entering ' + name + '.' + fn,
							this, '~####~', Array.prototype.slice.call(arguments));
						var r = fc.apply(this, arguments);
						console.log('Leaving ' + name + '.' + fn, r);
						return r;
					} catch(e) {
						console.error(e);
					}
				};
				return fc.dbg;
			})(fn, proto[fn]);
		}
	}
}

function mSpawnWorker(url, nw)
{
	if (!(this instanceof mSpawnWorker))
		return new mSpawnWorker(url, nw);

	this.jid = 1;
	this.jobs = {};
	this.nworkers=nw=nw||4;
	this.wrk = new Array(nw);
	this.token = mRandomToken('mSpawnWorker.'+url.split(".")[0]);

	while (nw--) {
		if (!(this.wrk[nw] = this.add(url))) {
			throw new Error(this.token.split("$")[0]+' Setup Error');
		}
	}
}
mSpawnWorker.prototype = {
	process: function mSW_Process(data, callback, onerror)
	{
		if (!Array.isArray(data)) {
			var err = new Error("'data' must be an array");
			if (onerror) return onerror(err);
			throw err;
		}
		if (this.unreliably) {
			return onerror(0xBADF);
		}
		var nw  = this.nworkers, l = Math.ceil(data.length/nw);
		var id  = mRandomToken("mSWJobID"+this.jid++), idx = 0;
		var job = { done: 0, data: [], callback: callback};

		while (nw--) {
			job.data.push(data.slice(idx, idx+=l));
		}
		if (onerror) job.onerror = onerror;
		this.jobs[id] = job;
		this.postNext();
	},
	postNext: function mSW_PostNext()
	{
		if (this.busy())
			return;
		for (var id in this.jobs)
		{
			var nw = this.nworkers;
			var job = this.jobs[id], data;

			while (nw--)
			{
				if (!this.wrk[nw].working)
				{
					data = job.data.shift();
					if (data)
					{
						this.wrk[nw].working = !0;
						this.wrk[nw].postMessage({
							data        : data,
							debug       : !!window.d,
							u_sharekeys : u_sharekeys,
							u_privk     : u_privk,
							u_handle    : u_handle,
							u_k         : u_k,
							jid         : id
						});

						if (d && job.data.length == this.nworkers-1) console.time(id);
					}
				}
			}
		}
	},
	busy: function()
	{
		var nw = this.nworkers;
		while (nw-- && this.wrk[nw].working);
		return nw == -1;
	},
	add: function mSW_Add(url)
	{
		var self = this, wrk;

		try {
			wrk = new Worker(url);
		} catch(e) {
			console.error(e);
			if (!window[this.token]) {
				window[this.token] = true;
				msgDialog('warninga', l[16], "Unable to launch " + url + " worker.", e);
			}
			return false;
		}

		wrk.onerror = function mSW_OnError(err)
		{
			console.error(err);
			if (!(self && self.wrk)) return;
			Soon(function() {
				throw err;
			});
			self.unreliably = true;
			var nw = self.nworkers;
			while (nw--) {
				if (self.wrk[nw]) {
					self.wrk[nw].terminate();
				}
			}
			for (var id in self.jobs) {
				var job = self.jobs[id];
				if (job.onerror) job.onerror(err);
			}
			if (!window[self.token]) {
				window[self.token] = true;
				if (err.filename) {
					msgDialog('warninga', "Worker Exception: " + url, err.message, err.filename + ":" + err.lineno);
				}
			}
			delete self.wrk;
			delete self.jobs;
			self = undefined;
		};

		wrk.onmessage = function mSW_OnMessage(ev)
		{
			if (ev.data[0] == 'console')
			{
				if (d) {
					var args = ev.data[1];
					args.unshift(self.token);
					console.log.apply(console,args);
				}
				return;
			}
			if (d) console.log(self.token, ev.data);

			wrk.working = false;
			if (!self.done(ev.data)) this.onerror(0xBADF);
		};

		if (d) console.log(this.token, 'Starting...');

		wrk.postMessage = wrk.postMessage || wrk.webkitPostMessage;

		return wrk;
	},
	done: function mSW_Done(reply)
	{
		var job = this.jobs[reply.jid];
		if (!ASSERT(job,'Invalid worker reply.'))
			return false;

		if (!job.result) job.result = reply.result;
		else $.extend(job.result, reply.result);

		if (reply.newmissingkeys)
		{
			job.newmissingkeys=newmissingkeys = true;
			$.extend(missingkeys, reply.missingkeys);
		}
		if (reply.rsa2aes)      $.extend(rsa2aes,      reply.rsa2aes);
		if (reply.u_sharekeys)  $.extend(u_sharekeys,  reply.u_sharekeys);
		if (reply.rsasharekeys) $.extend(rsasharekeys, reply.rsasharekeys);

		Soon(this.postNext.bind(this));
		if (++job.done == this.nworkers)
		{
			if (d) console.timeEnd(reply.jid);

			delete this.jobs[reply.jid];
			job.callback(job.result, job);
		}

		return true;
	}
};

function mRandomToken(pfx)
{
	return (pfx || '!') + '$' + (Math.random()*Date.now()).toString(36);
}

function str_mtrunc(str, len)
{
    if (!len)
        len = 35;
    if (len > (str || '').length)
        return str;
    var p1 = Math.ceil(0.60 * len),
        p2 = Math.ceil(0.30 * len);
    return str.substr(0, p1) + '\u2026' + str.substr(-p2);
}

function setupTransferAnalysis()
{
    if ($.mTransferAnalysis)
        return;

    var prev = {}, tlen = {}, time = {}, chunks = {};
    $.mTransferAnalysis = setInterval(function()
    {
        if (uldl_hold)
            prev = {};
        else if ($.transferprogress)
        {
            var tp = $.transferprogress;

            for (var i in tp)
            {
                if (!GlobalProgress[i] || GlobalProgress[i].paused || tp[i][0] == tp[i][1]
                    || (i[0] === 'u' ? ulQueue : dlQueue).isPaused())
                {
                    delete prev[i];
                }
                else if (prev[i] && prev[i] == tp[i][0])
                {
                    var p = tp[i], t = i[0] === 'u' ? 'Upload' : 'Download', r = '', data = [];
                    var s = GlobalProgress[i].speed, w = GlobalProgress[i].working || [];
                    var c = p[0] + '/' + p[1] + '-' + Math.floor(p[0] / p[1] * 100) + '%';
                    var u = w.map(function(c)
                    {
                        var x = c.xhr || {};
                        return ['' + c, x.__failed, x.__timeout, !!x.listener, x.__id, x.readyState > 1 && x.status];
                    });

                    if (d)
                        console.warn(i + ' might be stuck, checking...', c, w.length, u);

                    if (w.length)
                    {
                        var j = w.length;
                        while (j--)
                        {
                            /**
                             * if there's a timer, no need to call on_error ourselves
                             * since the chunk will get restarted there by the xhr
                             */
                            var stuck = w[j].xhr && !w[j].xhr.__timeout;
                            if (stuck)
                            {
                                var chunk_id = '' + w[j], n = u[j];

                                if (w[j].dl && w[j].dl.lasterror)
                                    r = '[DLERR' + w[j].dl.lasterror + ']';
                                else if (w[j].srverr)
                                    r = '[SRVERR' + (w[j].srverr - 1) + ']';

                                try {
                                    w[j].on_error(0, {}, 'Stuck');
                                } catch (e) {
                                    n.push(e.message);
                                }

                                if (!chunks[chunk_id])
                                {
                                    chunks[chunk_id] = 1;
                                    data.push(n);
                                }
                            }
                        }

                        if (!data.length && (Date.now() - time[i]) > (mXHRTimeoutMS * 3.1))
                        {
                            r = s ? '[TIMEOUT]' : '[ETHERR]';
                            data = ['Chunks are taking too long to complete... ', u];
                        }
                    }
                    else
                    {
                        r = '[!]';
                        data = 'GlobalProgress.' + i + ' exists with no working chunks.';
                    }

                    if (data.length)
                    {
                        var udata = {i: i, p: c, d: data, j: [prev, tlen], s: s};
                        if (i[0] == 'z')
                            t = 'zip' + t;
                        console.error(t + ' stuck. ' + r, i, udata);
                        if (!d)
                            srvlog(t + ' Stuck. ' + r, udata);
                    }
                    delete prev[i];
                }
                else
                {
                    time[i] = Date.now();
                    tlen[i] = Math.max(tlen[i] || 0, tp[i][0]);
                    prev[i] = tp[i][0];
                }
            }
        }
    }, mXHRTimeoutMS * 1.2);
}

function percent_megatitle()
{
    var dl_r = 0, dl_t = 0, ul_r = 0, ul_t = 0, tp = $.transferprogress || {}
    , dl_s = 0, ul_s = 0, zips = {}

    for (var i in dl_queue)
    {
        var q = dl_queue[i], t = tp[q.zipid ? 'zip_' + q.zipid : 'dl_' + q.id];

        if (t)
        {
            dl_r += t[0];
            dl_t += t[1];
            if (!q.zipid || !zips[q.zipid]) {
                if (q.zipid)
                    zips[q.zipid] = 1;
                dl_s += t[2];
            }
        }
        else
        {
            dl_t += q.size || 0;
        }
    }

    for (var i in ul_queue)
    {
        var t = tp['ul_' + ul_queue[i].id]

        if (t)
        {
            ul_r += t[0];
            ul_t += t[1];
            ul_s += t[2];
        }
        else
        {
            ul_t += ul_queue[i].size || 0;
        }
    }
    if (dl_t) {
        dl_t += tp['dlc'] || 0;
        dl_r += tp['dlc'] || 0
    }
    if (ul_t) {
        ul_t += tp['ulc'] || 0;
        ul_r += tp['ulc'] || 0
    }

    var x_ul = Math.floor(ul_r / ul_t * 100) || 0,
        x_dl = Math.floor(dl_r / dl_t * 100) || 0

    if (dl_t && ul_t)
    {
        t = ' \u2191 ' + x_dl + '% \u2193 ' + x_ul + '%';
    }
    else if (dl_t)
    {
        t = ' ' + x_dl + '%';
    }
    else if (ul_t)
    {
        t = ' ' + x_ul + '%';
    }
    else
    {
        t = '';
        $.transferprogress = {};
    }

    if (dl_s > 0) {
        $('.tranfer-download-indicator')
            .text(bytesToSize(dl_s, 1) + "/s")
            .addClass('active');
        $('.transfer-panel-title').addClass('active');
    } else {
        $('.tranfer-download-indicator').removeClass('active');
        $('.transfer-panel-title').removeClass('active');
    }

    if (ul_s > 0) {
        $('.tranfer-upload-indicator')
            .text(bytesToSize(ul_s, 1) + "/s")
            .addClass('active');
        $('.transfer-panel-title').addClass('active');
    } else {
        $('.tranfer-upload-indicator').removeClass('active');
        $('.transfer-panel-title').removeClass('active');
    }

    $('.file-transfer-icon')
        .attr(
            'class',
            'file-transfer-icon download-percents-' + x_dl + ' upload-percents-' + x_ul
            );

    megatitle(t);
}

function hostname(url) {
    if (d)
        ASSERT(url && /^http/.test(url), 'Invalid URL passed to hostname() -> ' + url);
    url = ('' + url).match(/https?:\/\/([^.]+)/);
    return url && url[1];
}

// Helper to manage time/sizes in a friendly way
String.prototype.seconds = function() {
    return parseInt(this) * 1000;
}

String.prototype.minutes = function() {
    return parseInt(this) * 1000 * 60;
}

// Quick hack for sane average speed readings
function bucketspeedometer(initialp)
{
    return {
        interval: 200,
        num: 300,
        prevp: initialp,
        h: {},
        progress: function(p)
        {
            var now, min, oldest;
            var total;
            var t;

            now = NOW();
            now -= now % this.interval;

            this.h[now] = (this.h[now] || 0) + p - this.prevp;
            this.prevp = p;

            min = now - this.interval * this.num;

            oldest = now;
            total = 0;

            for (t in this.h)
            {
                if (t < min)
                    delete this.h.bt;
                else
                {
                    if (t < oldest)
                        oldest = t;
                    total += this.h[t];
                }
            }

            if (now - oldest < 1000)
                return 0;

            p = 1000 * total / (now - oldest);

            // protect against negative returns due to repeated chunks etc.
            return p > 0 ? p : 0;
        }
    }
}

function moveCursortoToEnd(el)
{
    if (typeof el.selectionStart == "number")
    {
        el.selectionStart = el.selectionEnd = el.value.length;
    }
    else if (typeof el.createTextRange != "undefined")
    {
        el.focus();
        var range = el.createTextRange();
        range.collapse(false);
        range.select();
    }
}

String.prototype.replaceAll = function(_f, _r, _c)
{
    var o = this.toString();
    var r = '';
    var s = o;
    var b = 0;
    var e = -1;
    if (_c) {
        _f = _f.toLowerCase();
        s = o.toLowerCase();
    }

    while ((e = s.indexOf(_f)) > -1)
    {
        r += o.substring(b, b + e) + _r;
        s = s.substring(e + _f.length, s.length);
        b += e + _f.length;
    }

    // Add Leftover
    if (s.length > 0) {
        r += o.substring(o.length - s.length, o.length);
    }

    // Return New String
    return r;
};

// Returns pixels position of element relative to document (top left corner)
function getHtmlElemPos(elem, n)
{
    var xPos = 0;
    var yPos = 0;
    var sl, st, cl, ct;
    var pNode;
    while (elem)
    {
        pNode = elem.parentNode;
        sl = 0;
        st = 0;
        cl = 0;
        ct = 0;
        if (pNode && pNode.tagName && !/html|body/i.test(pNode.tagName))
        {
            if (typeof n === 'undefined')// count this in, except for overflow huge menu
            {
                sl = elem.scrollLeft;
                st = elem.scrollTop;
            }
            cl = elem.clientLeft;
            ct = elem.clientTop;
            xPos += (elem.offsetLeft - sl + cl);
            yPos += (elem.offsetTop - st - ct);
        }
        elem = elem.offsetParent;
    }
    return {x: xPos, y: yPos};
}

function disableDescendantFolders(id, pref)
{
    var folders = [];
    for (var i in M.c[id])
        if (M.d[i] && M.d[i].t === 1 && M.d[i].name)
            folders.push(M.d[i]);

    for (var i in folders)
    {
        var sub = false;
        var fid = folders[i].h;

        for (var h in M.c[fid])
        {
            if (M.d[h].t)
            {
                sub = true;
                break;
            }
        }
        $(pref + fid).addClass('disabled');
        if (sub)
            this.disableDescendantFolders(fid, pref);
    }

    return true;
}

function ucfirst(str) {
    //  discuss at: http://phpjs.org/functions/ucfirst/
    // original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // bugfixed by: Onno Marsman
    // improved by: Brett Zamir (http://brett-zamir.me)
    //   example 1: ucfirst('kevin van zonneveld');
    //   returns 1: 'Kevin van zonneveld'

    str += '';
    var f = str.charAt(0)
        .toUpperCase();
    return f + str.substr(1);
}

function readLocalStorage(name, type, val)
{
    var v;
    if (localStorage[name])
    {
        var f = 'parse' + ucfirst(type);
        v = localStorage[name];

        if (typeof window[f] === "function")
            v = window[f](v);

        if (val && ((val.min && val.min > v) || (val.max && val.max < v)))
            v = null;
    }
    return v || (val && val.def);
}

function obj_values(obj) {
    var vals = [];

    Object.keys(obj).forEach(function(memb) {
        if (obj.hasOwnProperty(memb)) {
            vals.push(obj[memb]);
        }
    });

    return vals;
}

function _wrapFnWithBeforeAndAfterEvents(fn, eventSuffix, dontReturnPromises) {
    var logger = MegaLogger.getLogger("beforeAfterEvents: " + eventSuffix);

    return function() {
        var self = this;
        var args = toArray(arguments);

        var event = new $.Event("onBefore" + eventSuffix);
        self.trigger(event, args);

        if (event.isPropagationStopped()) {
            logger.debug("Propagation stopped for event: ", event);
            if (dontReturnPromises) {
                return false;
            } else {
                return Promise.reject("Propagation stopped by onBefore" + eventSuffix);
            }

        }
        if (typeof (event.returnedValue) != "undefined") {
            args = event.returnedValue;
        }

        var returnedValue = fn.apply(self, args);

        var done = function() {
            var event2 = new $.Event("onAfter" + eventSuffix);
            self.trigger(event2, args.concat(returnedValue));

            if (event2.isPropagationStopped()) {
                logger.debug("Propagation stopped for event: ", event);
                if (dontReturnPromises) {
                    return false;
                } else {
                    return Promise.reject("Propagation stopped by onAfter" + eventSuffix);
                }
            }
        };

        if (returnedValue && returnedValue.then) {
            returnedValue.then(function() {
                done();
            });
        } else {
            done();
        }

        return returnedValue;
    }
}

function hex2bin(hex)
{
	var bytes = [];

	for(var i=0; i< hex.length-1; i+=2){
		bytes.push(parseInt(hex.substr(i, 2), 16));
	}

	return String.fromCharCode.apply(String, bytes);
}

/**
 * Detects if Flash is enabled or disabled in the user's browser
 * From http://stackoverflow.com/a/20095467
 * @returns {Boolean}
 */
function flashIsEnabled() {
    
    var flashEnabled = false;
    
    try {
        var flashObject = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
        if (flashObject) {
            flashEnabled = true;
        }
    }
    catch (e) {
        if (navigator.mimeTypes && (navigator.mimeTypes['application/x-shockwave-flash'] != undefined) && (navigator.mimeTypes['application/x-shockwave-flash'].enabledPlugin)) {
            flashEnabled = true;
        }
    }
    
    return flashEnabled;
}

/**
 * Gets the current base URL of the page (protocol + hostname) e.g. If on beta.mega.nz it will return https://beta.mega.nz.
 * If on the browser extension it will return the default https://mega.co.nz. If on localhost it will return https://mega.co.nz.
 * This can be used to create external links, for example file downloads https://mega.co.nz/#!qRN33YbK!o4Z76qDqPbiK2G0I...
 * @returns {String}
 */
function getBaseUrl() {
    return 'https://' + (((location.protocol === 'https:') && location.host) || 'mega.co.nz');
}
