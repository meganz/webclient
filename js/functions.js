

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
	l[466] = l[466].replace('[X]','');
	l[543] = l[543].replace('[X]','');	
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