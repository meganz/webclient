var inherits = (function(){
	var createObject = Object.create || function createObject(source) {
		var Host = function () {};
		Host.prototype = source;
		return new Host();
	};

	return function (destination, source) {
		var proto = destination.prototype = createObject(source.prototype);
		proto.constructor = destination;
		proto._super = source.prototype;
	}
})();

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

function safeCall(fn)
{
	fn.foo = function __safeCallWrapper()
	{
		try {
			return fn.apply(this, arguments);
		} catch (e) {
			console.error(e);
		}
	};
	fn.foo.bar = fn;
	return fn.foo;
}

function asciionly(text)
{
	var rforeign = /[^\u0000-\u007f]/;
	if (rforeign.test(text)) return false;
	else return true;
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
		if (func.__sfc) clearTimeout(func.__sfc);
		func.__sfc = setTimeout(function() {
			delete func.__sfc;
			func.apply(self, args);
		}, ms || 122);
	};
}

function jScrollFade(id)
{

	$(id + ' .jspTrack').unbind('mouseover');
	$(id + ' .jspTrack').bind('mouseover',function(e)
	{
		$(this).find('.jspDrag').addClass('jspActive');		
		$(this).closest('.jspContainer').uniqueId();
		jScrollFadeOut($(this).closest('.jspContainer').attr('id'));
	});
	

	
	if (!$.jScroll) $.jScroll={};
	for (var i in $.jScroll) if ($.jScroll[i] == 0) delete $.jScroll[i];
	$(id).unbind('jsp-scroll-y.fade');
	$(id).bind('jsp-scroll-y.fade',function(event, scrollPositionY, isAtTop, isAtBottom)
	{		
		$(this).find('.jspDrag').addClass('jspActive');				
		$(this).find('.jspContainer').uniqueId();
		var id = $(this).find('.jspContainer').attr('id');
		jScrollFadeOut(id);
	});
}


function jScrollFadeOut(id)
{
	if (!$.jScroll[id]) $.jScroll[id]=0;
	$.jScroll[id]++;
	setTimeout(function(id)
	{
		$.jScroll[id]--;			
		if ($.jScroll[id] == 0) $('#' + id + ' .jspDrag').removeClass('jspActive');
	},500,id);
}


function inputfocus(id,defaultvalue,pw)
{
	if (pw) $('#'+id)[0].type = 'password';	
	if ($('#'+id)[0].value == defaultvalue)  $('#'+id)[0].value = '';
}

function inputblur(id,defaultvalue,pw)
{
	if ($('#'+id)[0].value == '')  $('#'+id)[0].value = defaultvalue;				
	if (($('#'+id)[0].value == defaultvalue) && (pw)) $('#'+id)[0].type = 'text';	
}

function easeOutCubic (t, b, c, d) 
{
  return c*((t=t/d-1)*t*t + 1) + b;
}


function ellipsis (text,location, maxCharacters) 
{
	if (text.length > 0 && text.length > maxCharacters) 
	{
		if (typeof (location) == 'undefined') location = 'end';
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
				l[items[i]] = l[tmp[0]].replace('"','&quot;');
			}
			else if (tmp[1] == 'q')
			{
				l[items[i]] = l[tmp[0]].replace("'","\\'");
			}
			else if (tmp[1] == 'dqq')
			{
				l[items[i]] = l[tmp[0]].replace("'","\\'");
				l[items[i]] = l[items[i]].replace('"','&quot;');
			}		
		}
		html = html.replace(new RegExp( "\\[\\$" +items[i] + "\\]", "g"),l[items[i]]);		
	}
	return html;
}


function megatitle(nperc)
{
	if (!nperc) nperc='';
	var a = parseInt($('.notification-num').text());		
	if (a > 0) a = '(' + a + ') ';
	else a = '';	
	if (document.title != a + 'MEGA' + nperc) document.title = a + 'MEGA' + nperc;
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
	l['year'] = new Date().getFullYear();
}






function GetNextNode (labelid) 
{
    var label = document.getElementById (labelid);
	var select_id = document.getElementById (labelid+"_option");
    label.innerHTML = select_id.options[select_id.selectedIndex].text;
	return select_id.options[select_id.selectedIndex].value;
}

function showmoney(number) 
{
    var number = number.toString(), 
    dollars = number.split('.')[0], 
    cents = (number.split('.')[1] || '') +'00';
    dollars = dollars.split('').reverse().join('')
        .replace(/(\d{3}(?!$))/g, '$1,')
        .split('').reverse().join('');
    return dollars + '.' + cents.slice(0, 2);
}

function getHeight() 
{
  var myHeight = 0;
  if( typeof( window.innerWidth ) == 'number' )  myHeight = window.innerHeight;  
  else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) )  myHeight = document.documentElement.clientHeight;   
  else if (document.body && ( document.body.clientWidth || document.body.clientHeight ) )  myHeight = document.body.clientHeight;
  return myHeight;
}

function divscroll(el)
{
	document.getElementById(el).scrollIntoView();
	$('body').scrollLeft(0);
	$('html').scrollTop(0);	
	if (page == 'start') start_menu(el);
}

function removeHash () { 
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
	useragent = ' ' + useragent;
	var os = false;
	var browser = false;
	var icon = '';
	var name = '';
	if (useragent.toLowerCase().indexOf('android') > 0) os = 'Android';
	else if (useragent.toLowerCase().indexOf('windows') > 0) os = 'Windows';	
	else if (useragent.toLowerCase().indexOf('iphone') > 0) os = 'iPhone';
	else if (useragent.toLowerCase().indexOf('imega') > 0) os = 'iPhone';
	else if (useragent.toLowerCase().indexOf('ipad') > 0) os = 'iPad';	
	else if (useragent.toLowerCase().indexOf('mac') > 0) os = 'Apple';
	else if (useragent.toLowerCase().indexOf('linux') > 0) os = 'Linux';
	else if (useragent.toLowerCase().indexOf('linux') > 0) os = 'MEGAsync';
	else if (useragent.toLowerCase().indexOf('blackberry') > 0) os = 'Blackberry';
	if (useragent.toLowerCase().indexOf('chrome') > 0) browser = 'Chrome';	
	else if (useragent.toLowerCase().indexOf('safari') > 0) browser = 'Safari';	
	else if (useragent.toLowerCase().indexOf('opera') > 0) browser = 'Opera';
	else if (useragent.toLowerCase().indexOf('firefox') > 0) browser = 'Firefox';	
	else if (useragent.toLowerCase().indexOf('msie') > 0) browser = 'Internet Explorer';
	else if (useragent.toLowerCase().indexOf('megasync') > 0) browser = 'MEGAsync';
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

function time2date(unixtime,ignoretime)
{
	var MyDate = new Date(unixtime*1000);	
	var MyDateString = 
	MyDate.getFullYear() + '-'
	+ ('0' + (MyDate.getMonth()+1)).slice(-2) + '-'
	+ ('0' + MyDate.getDate()).slice(-2);
	if (!ignoretime)
	{
		MyDateString += ' ' + ('0' + MyDate.getHours()).slice(-2) + ':'	
		+ ('0' + MyDate.getMinutes()).slice(-2);
	}
    return MyDateString;
}	

var date_months = [l[408],l[409],l[410],l[411],l[412],l[413],l[414],l[415],l[416],l[417],l[418],l[419]];

function acc_time2date(unixtime)
{	
	var MyDate = new Date(unixtime*1000);	
	var th = 'th';
	if ((parseInt(MyDate.getDate()) == 11) || (parseInt(MyDate.getDate()) == 12)) {}
	else if (('' + MyDate.getDate()).slice(-1) == '1') th = 'st';
	else if (('' + MyDate.getDate()).slice(-1) == '2') th = 'nd';
	if (lang !== 'en') th = ',';	
	return date_months[MyDate.getMonth()] + ' ' + MyDate.getDate() + th + ' ' + MyDate.getFullYear();     
}

function time2last(timestamp)
{
	var sec = (new Date().getTime()/1000) - timestamp;
	if (sec < 4) return l[880];
	else if (sec < 59) return l[873].replace('[X]',Math.ceil(sec));
	else if (sec < 90) return l[874];
	else if (sec < 3540) return l[875].replace('[X]',Math.ceil(sec/60));
	else if (sec < 4500) return l[876];
	else if (sec < 82000) return l[877].replace('[X]',Math.ceil(sec/3600));
	else if (sec < 110000) return l[878];
	else return l[879].replace('[X]',Math.ceil(sec/86400));
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
	if (isNaN(secs)) return '--:--:--';
	if (secs < 0) return '';

	var hours = uplpad(Math.floor(secs / (60 * 60)),2);	
	var divisor_for_minutes = secs % (60 * 60);
	var minutes = uplpad(Math.floor(divisor_for_minutes / 60),2);
	var divisor_for_seconds = divisor_for_minutes % 60;
	var seconds = uplpad(Math.floor(divisor_for_seconds),2);	
	var returnvar = hours + ':' + minutes + ':' + seconds;
	return returnvar;
}


function htmlentities(value)
{
	if (!value) return '';
	return $('<div/>').text(value).html();
}

function bytesToSize(bytes, precision)
{
	if(!bytes) return '0';

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
	if (bytes > 1024*1024*1024) precision = 2;
	else if (bytes > 1024*1024) precision = 1;	
	if ((bytes >= 0) && (bytes < kilobyte)) return parseInt(bytes) + ' ' + s_b;	 
	else if ((bytes >= kilobyte) && (bytes < megabyte)) return (bytes / kilobyte).toFixed(precision) + ' '+ s_kb;	 
	else if ((bytes >= megabyte) && (bytes < gigabyte))  return (bytes / megabyte).toFixed(precision) + ' ' + s_mb;
	else if ((bytes >= gigabyte) && (bytes < terabyte))  return (bytes / gigabyte).toFixed(precision) + ' ' + s_gb;	 
	else if (bytes >= terabyte)  return (bytes / terabyte).toFixed(precision) + ' ' + s_tb;	
	else  return parseInt(bytes) + ' ' + s_b;
}

function checkPassword(strPassword)
{
	var m_strUpperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	var m_strLowerCase = "abcdefghijklmnopqrstuvwxyz";
	var m_strNumber = "0123456789";
	var m_strCharacters = "!@#$%^&*?_~";
    var nScore = 0;	
	nScore += countDif(strPassword)*2;	
	var extra = countDif(strPassword)*strPassword.length/3;	
	if (extra > 25) extra = 25;	
	nScore += extra;
    var nUpperCount = countContain(strPassword, m_strUpperCase);
    var nLowerCount = countContain(strPassword, m_strLowerCase);
    var nLowerUpperCount = nUpperCount + nLowerCount;    
    if (nUpperCount == 0 && nLowerCount != 0) nScore += 10; 
    else if (nUpperCount != 0 && nLowerCount != 0) nScore += 10; 
    var nNumberCount = countContain(strPassword, m_strNumber);
    if (nNumberCount == 1) nScore += 10;    
    if (nNumberCount >= 3) nScore += 15;
    var nCharacterCount = countContain(strPassword, m_strCharacters);
    if (nCharacterCount == 1) nScore += 10;
    if (nCharacterCount > 1) nScore += 10;    
    if (nNumberCount != 0 && nLowerUpperCount != 0) nScore += 2;
    if (nNumberCount != 0 && nLowerUpperCount != 0 && nCharacterCount != 0) nScore += 3;
    if (nNumberCount != 0 && nUpperCount != 0 && nLowerCount != 0 && nCharacterCount != 0) nScore += 5;
    return nScore;
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
        if (strCheck.indexOf(strPassword.charAt(i)) > -1)  nCount++;         
    } 
    return nCount; 
}

function logincheckboxCheck (ch_id) 
{
	   var ch_div=ch_id + "_div";
	   if (document.getElementById(ch_id).checked)	document.getElementById(ch_div).className="checkboxOn";  	   
	   else document.getElementById(ch_div).className="checkboxOff";  	   
}

function makeid(len)
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

function checkMail(email)
{
	email = email.replace('+','');
	var filter  = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
	if (filter.test(email)) return false;	
	else return true;	
}

function NOW() {
	return Date.now();
}

/**
 *	Global function to help debugging
 */
function DEBUG2() {
	if (d) {
		console.warn.apply(console, arguments)
	}
}

function ERRDEBUG() {
	if (d) {
		console.error.apply(console, arguments)
	}
}

function DEBUG() {
	if (d) {
		(console.debug||console.log).apply(console, arguments)
	}
}

function ASSERT(what, msg) {
	if (!what)
	{
		var af = new Error('failed assertion; ' + msg);
		Soon(function() { throw af; });
		if (console.assert) console.assert(what, msg);
		else console.error('FAILED ASSERTION', msg);
	}
}

function oDestroy(obj) {
	if (d) ASSERT(Object.isFrozen(obj) === false, 'Object already frozen...');

	Object.keys(obj).forEach(function(memb) {
		if (obj.hasOwnProperty(memb)) delete obj[memb];
	});

	if (d) Object.freeze(obj);
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
	if (idx != -1) array.splice(idx, 1);
	return idx != -1;
}

function setTransferStatus( dl, status, ethrow, lock) {
	var id = dl.zipid ? 'zip_' + dl.zipid : 'dl_' + dl.dl_id;
	var text = '' + status;
	if (text.length > 44) text = text.substr(0,42) + '...';
	$('.transfer-table #' + id + ' td:eq(3)').text(text);
	if (lock) $('.transfer-table #' + id).attr('id', 'LOCKed_' + id);
	if (d) console.error(status);
	if (ethrow) throw status;
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
	else
	{
		Later(firefoxDialog);
		// m += 'installing our extension.'
		m = l[1932];
	}
	msgDialog('warninga', l[1676], m, error );
	setTransferStatus( dl, error, ethrow, true );
	DownloadManager.abort(dl);
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
		case 3: k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
		case 2: k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
		case 1: k1 ^= (key.charCodeAt(i) & 0xff);
		
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
		
		w  = new Worker(url);

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
	}, size);
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

function percent_megatitle()
{
	var dl_r = 0, dl_t = 0, ul_r = 0, ul_t = 0, tp = $.transferprogress || {};
	
	for (var i in dl_queue)
	{
		var q = dl_queue[i];
		var t = tp[q.zipid ? 'zip_' + q.zipid : 'dl_' + q.id];
		
		if (t)
		{
			dl_r += t[0];
			dl_t += t[1];
		}
		else
		{
			dl_t += q.size || 0;
		}
	}
	
	for (var i in ul_queue)
	{
		var t = tp['ul_' + ul_queue[i].id];
		
		if (t)
		{
			ul_r += t[0];
			ul_t += t[1];
		}
		else
		{
			ul_t += ul_queue[i].size || 0;
		}
	}
	if (dl_t) { dl_t += tp['dlc'] || 0; dl_r += tp['dlc'] || 0 }
	if (ul_t) { ul_t += tp['ulc'] || 0; ul_r += tp['ulc'] || 0 }
	
	if (dl_t && ul_t)
	{
		t = ' \u2191 ' + Math.floor(ul_r/ul_t*100) + '% \u2193 ' + Math.floor(dl_r/dl_t*100) + '%';
	}
	else if (dl_t)
	{
		t = ' ' + Math.floor(dl_r/dl_t*100) + '%';
	}
	else if (ul_t)
	{
		t = ' ' + Math.floor(ul_r/ul_t*100) + '%';
	}
	else
	{
		t = '';
		$.transferprogress = {};
	}

	megatitle(t);
}

function __percent_megatitle()
{
	var percentage = 0
		, total = 0

	$('.transfer-table .progressbar-percents').each(function() {
		var p = parseInt($(this).text());
		if (isNaN(p)) return;
		percentage += p;
		total++;
	});
	
	percentage = Math.floor(percentage / total)

	if (total == 0 || percentage == 0 || percentage == 100) {
		megatitle();
	} else {
		megatitle(" " + percentage + "%");
	}
}

function hostname(url) {
	if (d) ASSERT(url && /^http/.test(url), 'Invalid URL passed to hostname() -> ' + url);
	url = (''+url).match(/https?:\/\/([^.]+)/);
	return url && url[1];
}

// Helper to manage time/sizes in a friendly way
String.prototype.seconds = function() {
	return parseInt(this) * 1000;
}

String.prototype.minutes = function() {
	return parseInt(this) * 1000 * 60;
}

String.prototype.MB = function() {
	return parseInt(this) * 1024 * 1024;
}

String.prototype.KB = function() {
	return parseInt(this) * 1024;
}

// Quick hack for sane average speed readings
function bucketspeedometer(initialp)
{
	return {
		interval : 200,
		num : 300,
		prevp : initialp,

		h : {},

		progress : function(p)
		{
			var now, min, oldest;
			var total;
			var t;
			
			now = NOW();
			now -= now % this.interval;

			this.h[now] = (this.h[now] || 0)+p-this.prevp;
			this.prevp = p;
			
			min = now-this.interval*this.num;
			
			oldest = now;
			total = 0;

			for (t in this.h)
			{
				if (t < min) delete this.h.bt;
				else
				{
					if (t < oldest) oldest = t;
					total += this.h[t];
				}
			}

			if (now-oldest < 1000) return 0;
			
			p = 1000*total/(now-oldest);

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
  if(_c){ _f = _f.toLowerCase(); s = o.toLowerCase(); }

  while((e=s.indexOf(_f)) > -1)
  {
    r += o.substring(b, b+e) + _r;
    s = s.substring(e+_f.length, s.length);
    b += e+_f.length;
  }

  // Add Leftover
  if(s.length>0){ r+=o.substring(o.length-s.length, o.length); }

  // Return New String
  return r;
};

// Returns pixels position of element relative to document (top left corner)
function getHtmlElemPos(elem, n)
{
    var xPos = 0;
    var yPos = 0;
    var sl,st, cl, ct;
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

function disableDescendantFolders(id)
{
	var folders = [];
	for(var i in M.c[id]) if (M.d[i] && M.d[i].t === 1 && M.d[i].name) folders.push(M.d[i]);
	
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
		$('#fi_' + fid).addClass('disabled');
		if (sub) this.disableDescendantFolders(fid);
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

		if (typeof window[f] === "function") v =  window[f](v);

		if (val && ((val.min && val.min > v) || (val.max && val.max < v))) v = null;
	}
	return v || (val && val.def);
}




(function(window,undefined){"use strict";var EMPTY="",UNKNOWN="?",FUNC_TYPE="function",UNDEF_TYPE="undefined",OBJ_TYPE="object",MAJOR="major",MODEL="model",NAME="name",TYPE="type",VENDOR="vendor",VERSION="version",ARCHITECTURE="architecture",CONSOLE="console",MOBILE="mobile",TABLET="tablet",SMARTTV="smarttv";var util={has:function(str1,str2){if(typeof str1==="string"){return str2.toLowerCase().indexOf(str1.toLowerCase())!==-1}},lowerize:function(str){return str.toLowerCase()}};var mapper={rgx:function(){for(var result,i=0,j,k,p,q,matches,match,args=arguments;i<args.length;i+=2){var regex=args[i],props=args[i+1];if(typeof result===UNDEF_TYPE){result={};for(p in props){q=props[p];if(typeof q===OBJ_TYPE){result[q[0]]=undefined}else{result[q]=undefined}}}for(j=k=0;j<regex.length;j++){matches=regex[j].exec(this.getUA());if(!!matches){for(p=0;p<props.length;p++){match=matches[++k];q=props[p];if(typeof q===OBJ_TYPE&&q.length>0){if(q.length==2){if(typeof q[1]==FUNC_TYPE){result[q[0]]=q[1].call(this,match)}else{result[q[0]]=q[1]}}else if(q.length==3){if(typeof q[1]===FUNC_TYPE&&!(q[1].exec&&q[1].test)){result[q[0]]=match?q[1].call(this,match,q[2]):undefined}else{result[q[0]]=match?match.replace(q[1],q[2]):undefined}}else if(q.length==4){result[q[0]]=match?q[3].call(this,match.replace(q[1],q[2])):undefined}}else{result[q]=match?match:undefined}}break}}if(!!matches)break}return result},str:function(str,map){for(var i in map){if(typeof map[i]===OBJ_TYPE&&map[i].length>0){for(var j=0;j<map[i].length;j++){if(util.has(map[i][j],str)){return i===UNKNOWN?undefined:i}}}else if(util.has(map[i],str)){return i===UNKNOWN?undefined:i}}return str}};var maps={browser:{oldsafari:{major:{1:["/8","/1","/3"],2:"/4","?":"/"},version:{"1.0":"/8",1.2:"/1",1.3:"/3","2.0":"/412","2.0.2":"/416","2.0.3":"/417","2.0.4":"/419","?":"/"}}},device:{sprint:{model:{"Evo Shift 4G":"7373KT"},vendor:{HTC:"APA",Sprint:"Sprint"}}},os:{windows:{version:{ME:"4.90","NT 3.11":"NT3.51","NT 4.0":"NT4.0",2000:"NT 5.0",XP:["NT 5.1","NT 5.2"],Vista:"NT 6.0",7:"NT 6.1",8:"NT 6.2",8.1:"NT 6.3",RT:"ARM"}}}};var regexes={browser:[[/APP-([\w\s-\d]+)\/((\d+)?[\w\.]+)/i],[NAME,VERSION,MAJOR],[/(opera\smini)\/((\d+)?[\w\.-]+)/i,/(opera\s[mobiletab]+).+version\/((\d+)?[\w\.-]+)/i,/(opera).+version\/((\d+)?[\w\.]+)/i,/(opera)[\/\s]+((\d+)?[\w\.]+)/i],[NAME,VERSION,MAJOR],[/\s(opr)\/((\d+)?[\w\.]+)/i],[[NAME,"Opera"],VERSION,MAJOR],[/(kindle)\/((\d+)?[\w\.]+)/i,/(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?((\d+)?[\w\.]+)*/i,/(avant\s|iemobile|slim|baidu)(?:browser)?[\/\s]?((\d+)?[\w\.]*)/i,/(?:ms|\()(ie)\s((\d+)?[\w\.]+)/i,/(rekonq)((?:\/)[\w\.]+)*/i,/(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron)\/((\d+)?[\w\.-]+)/i],[NAME,VERSION,MAJOR],[/(trident).+rv[:\s]((\d+)?[\w\.]+).+like\sgecko/i],[[NAME,"IE"],VERSION,MAJOR],[/(yabrowser)\/((\d+)?[\w\.]+)/i],[[NAME,"Yandex"],VERSION,MAJOR],[/(comodo_dragon)\/((\d+)?[\w\.]+)/i],[[NAME,/_/g," "],VERSION,MAJOR],[/(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?((\d+)?[\w\.]+)/i],[NAME,VERSION,MAJOR],[/(dolfin)\/((\d+)?[\w\.]+)/i],[[NAME,"Dolphin"],VERSION,MAJOR],[/((?:android.+)crmo|crios)\/((\d+)?[\w\.]+)/i],[[NAME,"Chrome"],VERSION,MAJOR],[/version\/((\d+)?[\w\.]+).+?mobile\/\w+\s(safari)/i],[VERSION,MAJOR,[NAME,"Mobile Safari"]],[/version\/((\d+)?[\w\.]+).+?(mobile\s?safari|safari)/i],[VERSION,MAJOR,NAME],[/webkit.+?(mobile\s?safari|safari)((\/[\w\.]+))/i],[NAME,[MAJOR,mapper.str,maps.browser.oldsafari.major],[VERSION,mapper.str,maps.browser.oldsafari.version]],[/(konqueror)\/((\d+)?[\w\.]+)/i,/(webkit|khtml)\/((\d+)?[\w\.]+)/i],[NAME,VERSION,MAJOR],[/(navigator|netscape)\/((\d+)?[\w\.-]+)/i],[[NAME,"Netscape"],VERSION,MAJOR],[/(swiftfox)/i,/(icedragon|iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo|conkeror)[\/\s]?((\d+)?[\w\.\+]+)/i,/(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix)\/((\d+)?[\w\.-]+)/i,/(mozilla)\/((\d+)?[\w\.]+).+rv\:.+gecko\/\d+/i,/(uc\s?browser|polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|qqbrowser)[\/\s]?((\d+)?[\w\.]+)/i,/(links)\s\(((\d+)?[\w\.]+)/i,/(gobrowser)\/?((\d+)?[\w\.]+)*/i,/(ice\s?browser)\/v?((\d+)?[\w\._]+)/i,/(mosaic)[\/\s]((\d+)?[\w\.]+)/i],[NAME,VERSION,MAJOR],[/(apple(?:coremedia|))\/((\d+)[\w\._]+)/i,/(coremedia) v((\d+)[\w\._]+)/i],[NAME,VERSION,MAJOR],[/(aqualung|lyssna|bsplayer)\/((\d+)*[\w\.-]+)/i],[NAME,VERSION],[/(ares|ossproxy)\s((\d+)[\w\.-]+)/i],[NAME,VERSION,MAJOR],[/(audacious|audimusicstream|amarok|bass|core|dalvik|gnomemplayer|music on console|nsplayer|psp-internetradioplayer|videos)\/((\d+)[\w\.-]+)/i,/(clementine|music player daemon)\s((\d+)[\w\.-]+)/i,/(lg player|nexplayer)\s((\d+)[\d\.]+)/i,/player\/(nexplayer|lg player)\s((\d+)[\w\.-]+)/i],[NAME,VERSION,MAJOR],[/(nexplayer)\s((\d+)[\w\.-]+)/i],[NAME,VERSION,MAJOR],[/(flrp)\/((\d+)[\w\.-]+)/i],[[NAME,"Flip Player"],VERSION,MAJOR],[/(fstream|nativehost|queryseekspider|ia-archiver|facebookexternalhit)/i],[NAME],[/(gstreamer) souphttpsrc (?:\([^\)]+\)){0,1} libsoup\/((\d+)[\w\.-]+)/i],[NAME,VERSION,MAJOR],[/(htc streaming player)\s[\w_]+\s\/\s((\d+)[\d\.]+)/i,/(java|python-urllib|python-requests|wget|libcurl)\/((\d+)[\w\.-_]+)/i,/(lavf)((\d+)[\d\.]+)/i],[NAME,VERSION,MAJOR],[/(htc_one_s)\/((\d+)[\d\.]+)/i],[[NAME,/_/g," "],VERSION,MAJOR],[/(mplayer)(?:\s|\/)(?:(?:sherpya-){0,1}svn)(?:-|\s)(r\d+(?:-\d+[\w\.-]+){0,1})/i],[NAME,VERSION],[/(mplayer)(?:\s|\/|[unkow-]+)((\d+)[\w\.-]+)/i],[NAME,VERSION,MAJOR],[/(mplayer)/i,/(yourmuze)/i,/(media player classic|nero showtime)/i],[NAME],[/(nero (?:home|scout))\/((\d+)[\w\.-]+)/i],[NAME,VERSION,MAJOR],[/(nokia\d+)\/((\d+)[\w\.-]+)/i],[NAME,VERSION,MAJOR],[/\s(songbird)\/((\d+)[\w\.-]+)/i],[NAME,VERSION,MAJOR],[/(winamp)3 version ((\d+)[\w\.-]+)/i,/(winamp)\s((\d+)[\w\.-]+)/i,/(winamp)mpeg\/((\d+)[\w\.-]+)/i],[NAME,VERSION,MAJOR],[/(ocms-bot|tapinradio|tunein radio|unknown|winamp|inlight radio)/i],[NAME],[/(quicktime|rma|radioapp|radioclientapplication|soundtap|totem|stagefright|streamium)\/((\d+)[\w\.-]+)/i],[NAME,VERSION,MAJOR],[/(smp)((\d+)[\d\.]+)/i],[NAME,VERSION,MAJOR],[/(vlc) media player - version ((\d+)[\w\.]+)/i,/(vlc)\/((\d+)[\w\.-]+)/i,/(xbmc|gvfs|xine|xmms|irapp)\/((\d+)[\w\.-]+)/i,/(foobar2000)\/((\d+)[\d\.]+)/i,/(itunes)\/((\d+)[\d\.]+)/i],[NAME,VERSION,MAJOR],[/(wmplayer)\/((\d+)[\w\.-]+)/i,/(windows-media-player)\/((\d+)[\w\.-]+)/i],[[NAME,/-/g," "],VERSION,MAJOR],[/windows\/((\d+)[\w\.-]+) upnp\/[\d\.]+ dlnadoc\/[\d\.]+ (home media server)/i],[VERSION,MAJOR,[NAME,"Windows"]],[/(com\.riseupradioalarm)\/((\d+)[\d\.]*)/i],[NAME,VERSION,MAJOR],[/(rad.io)\s((\d+)[\d\.]+)/i,/(radio.(?:de|at|fr))\s((\d+)[\d\.]+)/i],[[NAME,"rad.io"],VERSION,MAJOR]],cpu:[[/(?:(amd|x(?:(?:86|64)[_-])?|wow|win)64)[;\)]/i],[[ARCHITECTURE,"amd64"]],[/(ia32(?=;))/i],[[ARCHITECTURE,util.lowerize]],[/((?:i[346]|x)86)[;\)]/i],[[ARCHITECTURE,"ia32"]],[/windows\s(ce|mobile);\sppc;/i],[[ARCHITECTURE,"arm"]],[/((?:ppc|powerpc)(?:64)?)(?:\smac|;|\))/i],[[ARCHITECTURE,/ower/,"",util.lowerize]],[/(sun4\w)[;\)]/i],[[ARCHITECTURE,"sparc"]],[/(ia64(?=;)|68k(?=\))|arm(?=v\d+;)|(?:irix|mips|sparc)(?:64)?(?=;)|pa-risc)/i],[ARCHITECTURE,util.lowerize]],device:[[/\((ipad|playbook);[\w\s\);-]+(rim|apple)/i],[MODEL,VENDOR,[TYPE,TABLET]],[/applecoremedia\/[\w\.]+ \((ipad)/],[MODEL,[VENDOR,"Apple"],[TYPE,TABLET]],[/(apple\s{0,1}tv)/i],[[MODEL,"Apple TV"],[VENDOR,"Apple"]],[/(hp).+(touchpad)/i,/(kindle)\/([\w\.]+)/i,/\s(nook)[\w\s]+build\/(\w+)/i,/(dell)\s(strea[kpr\s\d]*[\dko])/i],[VENDOR,MODEL,[TYPE,TABLET]],[/(kf[A-z]+)\sbuild\/[\w\.]+.*silk\//i],[MODEL,[VENDOR,"Amazon"],[TYPE,TABLET]],[/\((ip[honed|\s\w*]+);.+(apple)/i],[MODEL,VENDOR,[TYPE,MOBILE]],[/\((ip[honed|\s\w*]+);/i],[MODEL,[VENDOR,"Apple"],[TYPE,MOBILE]],[/(blackberry)[\s-]?(\w+)/i,/(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|huawei|meizu|motorola)[\s_-]?([\w-]+)*/i,/(hp)\s([\w\s]+\w)/i,/(asus)-?(\w+)/i],[VENDOR,MODEL,[TYPE,MOBILE]],[/\((bb10);\s(\w+)/i],[[VENDOR,"BlackBerry"],MODEL,[TYPE,MOBILE]],[/android.+((transfo[prime\s]{4,10}\s\w+|eeepc|slider\s\w+|nexus 7))/i],[[VENDOR,"Asus"],MODEL,[TYPE,TABLET]],[/(sony)\s(tablet\s[ps])/i],[VENDOR,MODEL,[TYPE,TABLET]],[/(nintendo)\s([wids3u]+)/i],[VENDOR,MODEL,[TYPE,CONSOLE]],[/((playstation)\s[3portablevi]+)/i],[[VENDOR,"Sony"],MODEL,[TYPE,CONSOLE]],[/(sprint\s(\w+))/i],[[VENDOR,mapper.str,maps.device.sprint.vendor],[MODEL,mapper.str,maps.device.sprint.model],[TYPE,MOBILE]],[/(htc)[;_\s-]+([\w\s]+(?=\))|\w+)*/i,/(zte)-(\w+)*/i,/(alcatel|geeksphone|huawei|lenovo|nexian|panasonic|(?=;\s)sony)[_\s-]?([\w-]+)*/i],[VENDOR,[MODEL,/_/g," "],[TYPE,MOBILE]],[/\s((milestone|droid(?:[2-4x]|\s(?:bionic|x2|pro|razr))?(:?\s4g)?))[\w\s]+build\//i,/(mot)[\s-]?(\w+)*/i],[[VENDOR,"Motorola"],MODEL,[TYPE,MOBILE]],[/android.+\s((mz60\d|xoom[\s2]{0,2}))\sbuild\//i],[[VENDOR,"Motorola"],MODEL,[TYPE,TABLET]],[/android.+((sch-i[89]0\d|shw-m380s|gt-p\d{4}|gt-n8000|sgh-t8[56]9|nexus 10))/i],[[VENDOR,"Samsung"],MODEL,[TYPE,TABLET]],[/((s[cgp]h-\w+|gt-\w+|galaxy\snexus))/i,/(sam[sung]*)[\s-]*(\w+-?[\w-]*)*/i,/sec-((sgh\w+))/i],[[VENDOR,"Samsung"],MODEL,[TYPE,MOBILE]],[/(sie)-(\w+)*/i],[[VENDOR,"Siemens"],MODEL,[TYPE,MOBILE]],[/(maemo|nokia).*(n900|lumia\s\d+)/i,/(nokia)[\s_-]?([\w-]+)*/i],[[VENDOR,"Nokia"],MODEL,[TYPE,MOBILE]],[/android\s3\.[\s\w-;]{10}((a\d{3}))/i],[[VENDOR,"Acer"],MODEL,[TYPE,TABLET]],[/android\s3\.[\s\w-;]{10}(lg?)-([06cv9]{3,4})/i],[[VENDOR,"LG"],MODEL,[TYPE,TABLET]],[/((nexus\s[45]))/i,/(lg)[e;\s-\/]+(\w+)*/i],[[VENDOR,"LG"],MODEL,[TYPE,MOBILE]],[/android.+((ideatab[a-z0-9\-\s]+))/i],[[VENDOR,"Lenovo"],MODEL,[TYPE,TABLET]],[/(lg) netcast\.tv/i],[VENDOR,[TYPE,SMARTTV]],[/(mobile|tablet);.+rv\:.+gecko\//i],[TYPE,VENDOR,MODEL]],engine:[[/APP-([\w\s-\d]+)\/((\d+)?[\w\.]+)/i],[[NAME,"Mobile-App"],VERSION],[/(presto)\/([\w\.]+)/i,/(webkit|trident|netfront|netsurf|amaya|lynx|w3m)\/([\w\.]+)/i,/(khtml|tasman|links)[\/\s]\(?([\w\.]+)/i,/(icab)[\/\s]([23]\.[\d\.]+)/i],[NAME,VERSION],[/rv\:([\w\.]+).*(gecko)/i],[VERSION,NAME]],os:[[/microsoft\s(windows)\s(vista|xp)/i],[NAME,VERSION],[/(windows)\snt\s6\.2;\s(arm)/i,/(windows\sphone(?:\sos)*|windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i],[NAME,[VERSION,mapper.str,maps.os.windows.version]],[/(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i],[[NAME,"Windows"],[VERSION,mapper.str,maps.os.windows.version]],[/\((bb)(10);/i],[[NAME,"BlackBerry"],VERSION],[/(blackberry)\w*\/?([\w\.]+)*/i,/(tizen)\/([\w\.]+)/i,/(android|webos|palm\os|qnx|bada|rim\stablet\sos|meego)[\/\s-]?([\w\.]+)*/i],[NAME,VERSION],[/(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]+)*/i],[[NAME,"Symbian"],VERSION],[/mozilla.+\(mobile;.+gecko.+firefox/i],[[NAME,"Firefox OS"],VERSION],[/(nintendo|playstation)\s([wids3portablevu]+)/i,/(mint)[\/\s\(]?(\w+)*/i,/(joli|[kxln]?ubuntu|debian|[open]*suse|gentoo|arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk)[\/\s-]?([\w\.-]+)*/i,/(hurd|linux)\s?([\w\.]+)*/i,/(gnu)\s?([\w\.]+)*/i],[NAME,VERSION],[/(cros)\s[\w]+\s([\w\.]+\w)/i],[[NAME,"Chromium OS"],VERSION],[/(sunos)\s?([\w\.]+\d)*/i],[[NAME,"Solaris"],VERSION],[/\s([frentopc-]{0,4}bsd|dragonfly)\s?([\w\.]+)*/i],[NAME,VERSION],[/(ip[honead]+)(?:.*os\s*([\w]+)*\slike\smac|;\sopera)/i],[[NAME,"iOS"],[VERSION,/_/g,"."]],[/(mac\sos\sx)\s?([\w\s\.]+\w)*/i],[NAME,[VERSION,/_/g,"."]],[/(haiku)\s(\w+)/i,/(aix)\s((\d)(?=\.|\)|\s)[\w\.]*)*/i,/(macintosh|mac(?=_powerpc)|plan\s9|minix|beos|os\/2|amigaos|morphos|risc\sos)/i,/(unix)\s?([\w\.]+)*/i],[NAME,VERSION]]};var UAParser=function(uastring){var ua=uastring||(window&&window.navigator&&window.navigator.userAgent?window.navigator.userAgent:EMPTY);if(!(this instanceof UAParser)){return new UAParser(uastring).getResult()}this.getBrowser=function(){return mapper.rgx.apply(this,regexes.browser)};this.getCPU=function(){return mapper.rgx.apply(this,regexes.cpu)};this.getDevice=function(){return mapper.rgx.apply(this,regexes.device)};this.getEngine=function(){return mapper.rgx.apply(this,regexes.engine)};this.getOS=function(){return mapper.rgx.apply(this,regexes.os)};this.getResult=function(){return{ua:this.getUA(),browser:this.getBrowser(),engine:this.getEngine(),os:this.getOS(),device:this.getDevice(),cpu:this.getCPU()}};this.getUA=function(){return ua};this.setUA=function(uastring){ua=uastring;return this};this.setUA(ua)};if(typeof exports!==UNDEF_TYPE){if(typeof module!==UNDEF_TYPE&&module.exports){exports=module.exports=UAParser}exports.UAParser=UAParser}else{window.UAParser=UAParser;if(typeof define===FUNC_TYPE&&define.amd){define(function(){return UAParser})}if(typeof window.jQuery!==UNDEF_TYPE){var $=window.jQuery;var parser=new UAParser;$.ua=parser.getResult();$.ua.get=function(){return parser.getUA()};$.ua.set=function(uastring){parser.setUA(uastring);var result=parser.getResult();for(var prop in result){$.ua[prop]=result[prop]}}}}})(this);