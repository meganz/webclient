// This script allows the generation of cache files for search engine crawler bots

var cachepages = [
    "about",
    "blog",
    "chrome",
    "contact",
    "copyright",
    "copyrightnotice",
    "credits",
    "dev",
    "doc",
    "firefox",
    "general",
    "help",
    "help/client/android",
    "help/client/ios",
    "help/client/megachat",
    "help/client/megasync",
    "help/client/webclient",
    "help/client/windowsphone",
    "login",
    "mobile",
    "privacy",
    "privacycompany",
    "pro",
    "register",
    "resellers",
    "sdk",
    "sourcecode",
    "start",
    "sync",
    "takedown",
    "terms",
	"cmd"
];

var titles = {
'about':'About us - MEGA',
'blog' : 'Blog - MEGA',
'chrome' : 'Chrome Extension - MEGA',
'contact' : 'Contact us - MEGA',
'copyright' : 'Copyright Policy - MEGA',
'copyrightnotice' : 'Copyright Notice - MEGA',
'credits' : 'Credits - MEGA',
'dev' : 'Developers - MEGA',
'doc' : 'Developer Documentation - MEGA',
'firefox' : 'Firefox Extension - MEGA',
'general' : 'General Policy - MEGA',
'help' : 'Help Center - MEGA',
'login' : 'Login - MEGA',
'mobile' : 'Mobile Apps - MEGA',
'privacy' : 'Privacy Policy - MEGA',
'privacycompany' : 'The Privacy Company - MEGA',
'register' : 'Register free account - MEGA',
'resellers' : 'Resellers - MEGA',
'sdk' : 'Software Development Kit - MEGA',
'sourcecode' : 'Public Sourcecode - MEGA',
'start' : 'MEGA',
'' : 'MEGA',
'sync' : 'MEGAsync - MEGA',
'takedown' : 'Takedown Policy - MEGA',
'terms' : 'Terms of Service - MEGA',
'cmd' : 'MEGAcmd - MEGA',
'pro' : 'Upgrade to Pro - MEGA',
'help/client/android' : 'Android Help Center - MEGA',
'help/client/ios' : 'iOS Help Center - MEGA',
'help/client/megachat' : 'MEGAchat Help Center - MEGA',
'help/client/megasync' : 'MEGAsync Help Center - MEGA',
'help/client/webclient' : 'Webclient Help Center - MEGA',
'help/client/windowsphone' : 'Windows Phone Help Center - MEGA',
'pro' : 'Upgrade to Pro - MEGA',
'pro' : 'Upgrade to Pro - MEGA'};


// add blogs:
var i = 1;
while (i < 45)
{
	cachepages.push("blog_" + i);
	i++;
}

// var cachepages = ['cmd','pro'];
// var cachepages = ['blog_1','blog_2'];


var cacheindex=0;
var cachepage = '';
var cachedata = {};
var cachelanguages = [];
var cachepagevar = '';
for (var cl in languages) {
	if (languages[cl].length > 0) cachelanguages.push(cl);
}

cachelanguages = ['en','fr','es','nl','cn','ct','pt'];

var cachehelplanguages = ['en','fr','es'];

var cachelangindex=0;
var cachelang = cachelanguages[cachelangindex];

function startCache() {
	$('body').append('<div style="display:none;" id="hiddendiv"></div>');
	cachedata = {};
	cacheindex=0;
	cachepage='';
	makeCache();
}



function makeCache() {		
	loadSubPage(cachepages[cacheindex]);
	setTimeout(detectCacheReady,500);	
}

function cacheURLexists(url) {
	var found=false;
	for (var i = 0; i < cachepages; i++) {
		if (cachepages[i] == url) found=true;
	}				
	return found;
}

function clearHelp()
{
	var removeIndex = [];
	for (var i in cachepages) {
		if (cachepages[i].substr(0,12) == 'help/client/' && cachepages[i].split('/').length > 3) removeIndex.push(i);				
	}
	for (var i = removeIndex.length -1; i >= 0; i--) cachepages.splice(removeIndex[i],1);
}

function detectCacheReady() {
	if ($('.loading-spinner').hasClass('hidden')) {
		$('#hiddendiv').html('');
		cachepage = cachepages[cacheindex];
		console.log('cache page',cachelang + '/' + cachepage);		
		if (cachepage.substr(0,12) == 'help/client/' && cachepage.split('/').length < 4 && cachehelplanguages.indexOf(cachelang) > -1) {			
			// look for all direct help URLs for caching for specific languages:
			$('.d-section-items li a').each(function(i,el) {
				var url = $(el).attr('href');				
				if (url.substr(0,1) == '/') url = url.substr(1,url.length-1);
				if (!cacheURLexists(url)) cachepages.push(url);
			});
		}		
		setTimeout(function() {			
			var tlang = '';
			if (languages[cachelang] && languages[cachelang][0]) tlang =languages[cachelang][0];
			else tlang = cachelang;
			cachepagevar = cachepage;
			if (cachepagevar == 'start') cachepagevar = '';
			cachedata[tlang + '/' + cachepagevar] = cacheHTML();
			cacheindex++;
			if (cachepages.length > cacheindex) {
				makeCache();
			}
			else if (cachelanguages.length-1 > cachelangindex) {				
				clearHelp();				
				cacheindex=0;
				cachelangindex++;
				cachelang = cachelanguages[cachelangindex];
				lang = cachelang;
				loadSubPage('help');
				loadingDialog.show();
				if (typeof Help !== 'undefined') {
					Help.loadfromCMS(function()
					{
						boot_done_makecache=true;
						jsl.push({f:getLanguageFilePath(cachelang), n: 'lang', j:3});
						jsl_start();
					});
				}
				else makeCache();
			}
			else {				
				
				if (localStorage.cachecss) {
					var css = localStorage.cachecss
				}
				else {	
					var css='';				
					for (var i in cssCache) {
						css += cssCache[i];
					}
					css = css.replace('me.ga','eu.static.mega.co.nz');				
					console.log('CSS length',css.length);				
					localStorage.cachecss = css;
				}				
				cachedata['style.css'] = css;
				var cachejson = JSON.stringify(cachedata);
				var file = new Blob([cachejson], {type : "text/plain"});	
				var url = URL.createObjectURL(file);				
				$('#startholder').append('<div style="background-color:white; position:absolute; left:200px; top:200px; width:800px; height:300px; z-index:9999;"><a href="' + url + '" download="rootcache.json" style="font-size:30px;">DOWNLOAD JSON</a></div>');
				
			}
		},200);
	}
	else setTimeout(detectCacheReady,500);
}

function cacheiframeCSS() {
	var css='';
	$('link').each(function(i,el) {
		if ($(el).attr('href').indexOf('.css') > -1) {
			var href = $(el).attr('href');
			//href  = href.replace('https://me.ga/','/');
			css += '<link type="text/css" rel="stylesheet" href="' + href + '">';
		}
	});
	return css;
}


function cacheHTML() {
	var html = $('#startholder').html();	
	$('#hiddendiv').html(html);	
	$('#hiddendiv .widget-block').remove();	
	// open the main menu to make it visible to crawlers:
	$('#hiddendiv .top-menu-popup').removeClass('hidden');
	$('#hiddendiv .top-menu-popup.submenu-item').addClass('expanded');
	// remove all hidden elements from the crawlers:
	$('#hiddendiv .hidden').remove();	
	$('#hiddendiv .top-menu-content .top-menu-item').each(function(i,el) {
		if (!$(el).hasClass('submenu-item')) {
			var attrs = { };
			$.each($(el)[0].attributes, function(idx, attr) {
				attrs[attr.nodeName] = attr.nodeValue;
			});
			$(el).replaceWith(function () {
				return $("<a />", attrs).append($(this).contents());
			});
		}
	});	
	// convert the <div> elements to <a> elements in the main menu and add proper href property:
	$('#hiddendiv .top-menu-content .top-menu-item').each(function(i,el) {
		if (!$(el).hasClass('submenu-item')) {		
			$(el).attr('style','display:block;');			
			var page = false;
			for (var i in cachepages) {
				if ($(el).attr('class').indexOf(cachepages[i]) > -1) {				
					page = cachepages[i];
				}
			}
			if (page) $(el).attr('href','https://mega.nz/' + page);
		}
	});	
	$('#hiddendiv .top-menu-content .submenu-item').addClass('expanded');
	$('#hiddendiv a.logo').attr('href','https://mega.nz/');
	
	html = $('#hiddendiv').html();	

	var header = '';	
	for (var a in cachelanguages)
	{
		var cla = cachelanguages[a];		
		var tlang = '';
		if (languages[cla] && languages[cla][0]) tlang =languages[cla][0];
		else tlang = cla;
		header += '<link rel="alternate" href="https://mega.nz/' + cachepagevar + '?' + tlang + '" hreflang="' + tlang +'" />';
	}	
	
	if (titles[cachepagevar]) title = titles[cachepagevar];
	else
	{	
		if (cachepagevar.indexOf('blog_') > -1)
		{			
			// look for Blog title in the HTML:
			title = $('#hiddendiv #blogarticle_title').text() + ' - MEGA';
		}
		else if (cachepagevar.indexOf('help/') > -1)
		{
			// look for help subject in the HTML:
			title = $('#hiddendiv .sidebar-menu-link.scrollTo.active').text().trim();			
			if (title == '') title = 'Help Center - MEGA';
			else
			{
				title = title + ' - MEGA';
			}
		}
		else
		{
			console.error('no title found for',cachepagevar);
		}
	}
	console.log(title);
	header += '<title>' + title + '</title>';
	
	html = '<html xmlns="http://www.w3.org/1999/xhtml" class="other"><head>' + header + '<meta charset="UTF-8"><link type="text/css" rel="stylesheet" href="/style.css"><style type="text/css">.div, span, input {outline: none;}.hidden {display: none;}.clear {clear: both;margin: 0px;padding: 0px;display: block;}.loading-main-block {width: 100%;height: 100%;overflow: auto;font-family:Arial, Helvetica, sans-serif;}.loading-mid-white-block {height: 100%;width:100%;}.loading-cloud {width: 222px;height: 158px;background-image: url(https://eu.static.mega.co.nz/3/images/mega/loading-sprite_v4.png);background-repeat: no-repeat;background-position: 0 0;position:absolute;left:50%;top:50%;margin:-79px 0 0 -111px;}.loading-m-block{width:60px;height:60px;position:absolute; left:81px;top:65px;background-color:white;background-image: url(https://eu.static.mega.co.nz/3/images/mega/loading-sprite_v4.png);background-repeat: no-repeat;background-position: -81px -65px;border-radius: 100%;-webkit-border-radius: 100%;border-radius: 100%;z-index:10;}.loading-percentage { width: 80px;height: 80px; background-color: #e1e1e1;position: absolute;-moz-border-radius: 100%;-webkit-border-radius: 100%;border-radius: 100%;overflow: hidden;background-image: url(https://eu.static.mega.co.nz/3/images/mega/loading-sprite_v4.png);background-repeat: no-repeat;background-position: -70px -185px;left:71px;top:55px;}.loading-percentage ul {list-style-type: none;}.loading-percentage li {position: absolute;top: 0px;}.loading-percentage p, .loading-percentage li, .loading-percentage ul{width: 80px;height: 80px;padding: 0;margin: 0;}.loading-percentage span {display: block;width: 40px;height: 80px;}.loading-percentage ul :nth-child(odd) {clip: rect(0px, 80px, 80px, 40px);}.loading-percentage ul :nth-child(even) {clip: rect(0px, 40px, 80px, 0px);}.loading-percentage .right-c span {-moz-border-radius-topleft: 40px;-moz-border-radius-bottomleft: 40px;-webkit-border-top-left-radius: 40px;-webkit-border-bottom-left-radius: 40px;border-top-left-radius: 40px;border-bottom-left-radius: 40px;background-color:#dc0000;}.loading-percentage .left-c span {margin-left: 40px;-moz-border-radius-topright: 40px;-moz-border-radius-bottomright: 40px;-webkit-border-top-right-radius: 40px;-webkit-border-bottom-right-radius: 40px;border-top-right-radius: 40px;border-bottom-right-radius: 40px;background-color:#dc0000;}.loading-main-bottom {max-width: 940px;width: 100%;position: absolute;bottom: 20px;left: 50%;margin: 0 0 0 -470px;text-align: center;}.loading-bottom-button {height: 29px;width: 29px;float: left;background-image: url(https://eu.static.mega.co.nz/3/images/mega/loading-sprite_v4.png);background-repeat: no-repeat;cursor: pointer;}.st-social-block-load {position: absolute;bottom: 20px;left: 0;width: 100%;height: 43px;text-align: center;}.st-bottom-button {height: 24px;width: 24px;margin: 0 8px;display: inline-block;background-image: url(https://eu.static.mega.co.nz/3/images/mega/loading-sprite_v4.png);background-repeat: no-repeat;background-position:11px -405px;cursor: pointer;-moz-border-radius: 100%;-webkit-border-radius: 100%;border-radius: 100%;-webkit-transition: all 200ms ease-in-out;-moz-transition: background-color 200ms ease-in-out;-o-transition: background-color 200ms ease-in-out;-ms-transition: background-color 200ms ease-in-out;transition: background-color 200ms ease-in-out;background-color:#999999;}.st-bottom-button.st-google-button {background-position: 11px -405px;}.st-bottom-button.st-google-button {background-position: -69px -405px;}.st-bottom-button.st-twitter-button{background-position: -29px -405px;}.st-bottom-button:hover {background-color:#334f8d;}.st-bottom-button.st-twitter-button:hover {background-color:#1a96f0;}.st-bottom-button.st-google-button:hover {background-color:#d0402a;}@media only screen and (-webkit-min-device-pixel-ratio: 1.5), only screen and (-o-min-device-pixel-ratio: 3/2), only screen and (min--moz-device-pixel-ratio: 1.5), only screen and (min-device-pixel-ratio: 1.5) {.maintance-block, .loading-percentage, .loading-m-block, .loading-cloud, .loading-bottom-button,.st-bottom-button, .st-bottom-scroll-button {background-image: url(https://eu.static.mega.co.nz/3/images/mega/loading-sprite_v4@2x.png);    background-size: 222px auto;}}</style></head><body class="' + $('body').attr('class') + '"><div id="startholder" class="fmholder ' + cachelang + '" style="display:block;">' + html + '</div></body></html>';
	
	
	
	/*
	var file = new Blob([html], {type : "text/html"});	
	var url = URL.createObjectURL(file);
	$('#startholder').append('<div style="background-color:white; position:absolute; left:0px; top:0px; width:1600px; height:1000px; z-index:9999;"><iframe src="' + url + '" width="100%" height="100%"></iframe></div>');
	*/
	
	
	return html;
}