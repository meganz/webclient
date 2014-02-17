

function asciionly(text)
{
	var rforeign = /[^\u0000-\u007f]/;
	if (rforeign.test(text)) return false;
	else return true;
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
	l[1274] = l[1274].replace('[A]','<a href="#takedown">').replace('[/A]','</a>');
	l[1275] = l[1275].replace('[A]','<a href="#copyright">').replace('[/A]','</a>');	
	l[1244] = l[1244].replace('[A]','<a href="#affiliateterms" class="red">').replace('[/A]','</a>');
	l[1201] = l[1201].replace('[A]','<span class="red">').replace('[/A]','</span>');
	l[1208] = l[1208].replace('[B]','<strong>').replace('[/B]','</strong>');
	l[1212] = l[1212].replace('[A]','<a href="#sdk" class="red">').replace('[/A]','</a>');	
	l[1218] = l[1218].replace('[A]','<a href="#affiliateterms" class="red">').replace('[/A]','</a>');
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
	else if (useragent.toLowerCase().indexOf('blackberry') > 0) os = 'Blackberry';
	if (useragent.toLowerCase().indexOf('chrome') > 0) browser = 'Chrome';	
	else if (useragent.toLowerCase().indexOf('safari') > 0) browser = 'Safari';	
	else if (useragent.toLowerCase().indexOf('opera') > 0) browser = 'Opera';
	else if (useragent.toLowerCase().indexOf('firefox') > 0) browser = 'Firefox';	
	else if (useragent.toLowerCase().indexOf('msie') > 0) browser = 'Internet Explorer';
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

// in case we need to run functions.js in a standalone (non secureboot.js) environment, we need to handle this case:
if(typeof(l) == 'undefined') { l = []; };

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

function unixtime() {
    return (new Date().getTime()/1000);
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
	if (!(secs >= 0)) secs = 0;
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
        kls.prototype[v] = function() {
            return $(this)[v].apply($(this), toArray(arguments));
        }
    });
};

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

        if(self["_" + prefix] == undefined) {
            self["_" + prefix] = {};
        } if(self["_" + prefix][namespace] == undefined) {
            self["_" + prefix][namespace] = {};
        }
        self["_" + prefix][namespace][k] = val;

        if(self.trigger) {
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

        if(prefix && !namespace && !k) {
            delete self["_" + prefix];
        } else if(prefix && namespace && !k) {
            delete self["_" + prefix][namespace];
        } else if(prefix && namespace && k) {
            delete self["_" + prefix][namespace][k];
        }

        if(self.trigger) {
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
        if(k == undefined) {
            if(self["_" + prefix] == undefined) {
                return default_value;
            } else {
                return self["_" + prefix][namespace] || default_value;
            }
        } else {
            // all args

            if(self["_" + prefix] == undefined) {
                return default_value;
            } else if(self["_" + prefix][namespace] == undefined) {
                return default_value;
            } else {
                return self["_" + prefix][namespace][k] || default_value;
            }
        }
    };
};

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

    return eventName + "." + name + "_" + ("" + simpleStringHashCode(result)).replace("-", "_");
};

/**
 * @see http://stackoverflow.com/q/7616461/940217
 * @return {number}
 */
function simpleStringHashCode(str){
    assert(str, "Missing str passed to simpleStringHashCode");

    if (Array.prototype.reduce){
        return str.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    }
    var hash = 0;
    if (str.length === 0) return hash;
    for (var i = 0; i < str.length; i++) {
        var character  = str.charCodeAt(i);
        hash  = ((hash<<5)-hash)+character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

/**
 * Creates a promise, which will fail if the validateFunction() don't return true in a timely manner (e.g. < timeout).
 *
 * @param validateFunction {Function}
 * @param tick {int}
 * @param timeout {int}
 * @returns {Deferred}
 */
function createTimeoutPromise(validateFunction, tick, timeout) {
    var $promise = new $.Deferred();
    var tickInterval = setInterval(function() {
        if(validateFunction()) {
            if(localStorage.d) {
                console.debug("Resolving timeout promise", timeout, "ms", "at", (new Date()));
            }
            $promise.resolve();
        }
    }, tick);

    var timeoutTimer = setTimeout(function() {
        if(validateFunction()) {
            if(localStorage.d) {
                console.debug("Resolving timeout promise", timeout, "ms", "at", (new Date()));
            }
            $promise.resolve();
        } else {
            console.error("Timed out after waiting", timeout, "ms", "at", (new Date()));
            $promise.reject();
        }
    }, timeout);

    // stop any running timers and timeouts
    $promise.always(function() {
        clearInterval(tickInterval);
        clearTimeout(timeoutTimer)
    });

    return $promise;
};

/**
 * Simple .toArray method to be used to convert `arguments` to a normal JavaScript Array
 *
 * @param val {Arguments}
 * @returns {Array}
 */
function toArray(val) {
    return Array.prototype.slice.call(val, val);
};



/**
 * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
 * © 2011 Colin Snover <http://zetafleet.com>
 * Released under MIT license.
 */
(function (Date, undefined) {
    var origParse = Date.parse, numericKeys = [ 1, 4, 5, 6, 7, 10, 11 ];
    Date.parse = function (date) {
        var timestamp, struct, minutesOffset = 0;

        // ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
        // before falling back to any implementation-specific date parsing, so that’s what we do, even if native
        // implementations could be faster
        //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
        if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
            // avoid NaN timestamps caused by “undefined” values being passed to Date.UTC
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

"use strict";

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
        if(localStorage.d) {
            console.error(message);
        }
        if(localStorage.stopOnAssertFail) {
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
    if(val.toString().length < len) {
        for(var i = val.toString().length; i<len; i++) {
            val = "0" + val;
        }
    }
    return val;
}