var dlpage_key,dlpage_ph,dl_next;
var fdl_filename, fdl_filesize, fdl_key, fdl_url, fdl_starttime;
var fdl_file=false;
var dl_import=false;
var dl_attr;
var fdl_queue_var=false;


function Mads()
{	
	if ('fr-de-ms-be-bs-ca-cy-ee-eu-hr-lv-lt-ru-sl-mk-uk-'.indexOf(lang+'-') > -1)
	{
		$('.ads-left-block .ads-bottom-block').css('padding-left','8px').css('padding-right','10px');	
	}
	if ('ms-bs-be-ca-cz-cy-eu-fr-hr-lv-lt-hu-pl-ru-ro-sk-bg-sr-'.indexOf(lang+'-') > -1)
	{
		$('.ads-top-notification .red, .ads-top-notification .ads-top-white-txt1').css('font-size','20px');
	}
	if ('uk-'.indexOf(lang+'-') > -1)
	{
		$('.ads-top-notification .red, .ads-top-notification .ads-top-white-txt1').css('font-size','18px');
		$('.ads-top-notification .ads-top-white-txt2').css('font-size','13px');
	}
	if ('ms-de-eu-fr-hu-pt-ru-sk-bg-sr-'.indexOf(lang+'-') > -1)
	{
		$('.ads-tablet .ads-top-txt').css('line-height','22px');
	}	
	if ('pt-ru-ro-sl-sk-tr-bg-mk-sr-'.indexOf(lang+'-') > -1)
	{
		$('.ads-right-block .ads-bottom-block,.ads-left-block .ads-bottom-block').css('padding-left','23px').css('padding-right','23px');		
	}
	if ('ru-ro-sl-sk-tr-bg-mk-'.indexOf(lang+'-') > -1)
	{
		$('.ads-laptop .sync-button-txt').css('font-size','13px');
	}
	
	if (u_type)
	{
		$('.ads-top-arrow').hide();
		$('.ads-top-notification').hide();	
	}

	$('body').addClass('ads');
	if (typeof swiffy == 'undefined' && !silent_loading)
	{
		silent_loading=function()
		{
			startMads();			
		};
		jsl.push(jsl2['mads_js']);
		jsl_start();
	}
	else startMads();
	
	var pf = navigator.platform.toUpperCase();
	
	pf = 'LINUX';

	if (pf.indexOf('MAC')>=0) sync_switchOS('mac');
	else if (pf.indexOf('LINUX')>=0) sync_switchOS('linux');
	else sync_switchOS('windows');
}

function startMads()
{
	adTime=new Date().getTime();
	stage = new swiffy.Stage(document.getElementById('swiffycontainer'), swiffyobject);	
	ads1 = new swiffy.Stage(document.getElementById('browser-app'), swiffyobject2);
	ads2 = new swiffy.Stage(document.getElementById('iphone-app'), swiffyobject3);
	ads3 = new swiffy.Stage(document.getElementById('tablet-app'), swiffyobject4);
	ads4 = new swiffy.Stage(document.getElementById('ipad-app'), swiffyobject5);
	ads5 = new swiffy.Stage(document.getElementById('phone-app'), swiffyobject6);	
	stage.start();
	ads1.start();
	ads2.start();
	ads2.start();
	ads3.start();
	ads4.start();
	ads5.start();	
	$('.ads-slides-button').unbind('click');
	$('.ads-slides-button').bind('click',function()
	{
		if ($(this).attr('class').indexOf('active') == -1) 
		{
			showAd(this);
		1}
	});	
	setTimeout(nextAd,10000);	
	setTimeout(function()
	{
		$('.ads-svg-container svg').css('cursor','pointer');		
		$('.ads-left-block .ads-svg-container svg').unbind('click');
		$('.ads-left-block .ads-svg-container svg').bind('click',function()
		{
			document.location.hash = 'sync';
		});		
		$('.ads-top-notification').unbind('click');
		$('.ads-top-notification').bind('click',function()
		{
			document.location.hash = 'register';
		});		
		$('.ads-laptop svg').unbind('click');
		$('.ads-laptop svg').bind('click',function()
		{
			document.location.hash = 'chrome';
		});
		$('.ads-iphone svg,.ads-tablet svg,.ads-ipad svg,.ads-phone svg').unbind('click');
		$('.ads-iphone svg,.ads-tablet svg,.ads-ipad svg,.ads-phone svg').bind('click',function()
		{
			document.location.hash = 'mobile';
		});
		
		//1062
	},500);
}

function showAd(el)
{
	adTime=new Date().getTime();
	$('.ads-slides-block.active').fadeOut(50);
	$('.ads-slides-block').removeClass('active');
	var slideBlock = '#' + $(el).attr('id') + '-slide';
	$(slideBlock).fadeIn(100);
	$(slideBlock).addClass('active');
	$(slideBlock).removeClass('hidden');
	$('.ads-slides-button').removeClass('active');
	$(el).addClass('active');
	setTimeout(nextAd,10000);
}

function nextAd()
{
	if (new Date().getTime()-9900 > adTime)
	{
		var id = $('.ads-slides-button.active').attr('id');
		if (!id) return false;
		id = parseInt(id.replace('ads',''))+1;
		if (id > 5) id=1;		
		showAd($('.ads-slides-button#ads'+id)[0]);
	}
}


function dlinfo(ph,key,next)
{
	if (!(u_attr && u_attr.p) && !is_extension) Mads();

	dl_next = next;
	if ((lang == 'en') || (lang !== 'en' && l[1388] !== '[B]Download[/B] [A]to your computer[/A]'))
	{
		$('.new-download-red-button').html(l[1388].replace('[B]','<div class="new-download-button-txt1">').replace('[/B]','</div>').replace('[A]','<div class="new-download-button-txt2">').replace('[/A]','</div>'));		
		$('.new-download-gray-button').html(l[1389].replace('[B]','<div class="new-download-button-txt1">').replace('[/B]','</div>').replace('[A]','<div class="new-download-button-txt2">').replace('[/A]','</div>'));		
	}

	$('.widget-block').addClass('hidden');
	if (!m) init_start();
	if (dlMethod == FlashIO) 
	{
		$('.fm-dialog.download-dialog').removeClass('hidden');
		$('.fm-dialog.download-dialog').css('left','-1000px');
		$('.download-save-your-file').html('<object data="' + document.location.origin + '/downloader.swf" id="dlswf_'+ htmlentities(ph) + '" type="application/x-shockwave-flash" height="' + $('.download-save-your-file').height() + '"  width="' + $('.download-save-your-file').width() + '"><param name="wmode" value="transparent"><param value="always" name="allowscriptaccess"><param value="all" name="allowNetworking"><param name=FlashVars value="buttonclick=1" /></object>');
	}	
	loadingDialog.show();
	$('.download-mid-white-block').addClass('hidden');	
	dlpage_ph 	= ph;
	dlpage_key 	= key;
	if (dl_res)
	{
		dl_g(dl_res);
		dl_res = false;
	}
	else api_req({a:'g',p:ph},{callback:dl_g});
}


function dl_g(res)
{	
	$('.widget-block').addClass('hidden');
	loadingDialog.hide();
	$('.download-mid-white-block').removeClass('hidden');		
	if (res == ETOOMANY) $('.download-mid-centered-block').addClass('not-available-user');			
	else if (typeof res == 'number' && res < 0) $('.download-mid-centered-block').addClass('not-available-some-reason');
	else if (res.e == ETEMPUNAVAIL) $('.download-mid-centered-block').addClass('not-available-temporary');
	else if (res.d) $('.download-mid-centered-block').addClass('not-available-some-reason');
	else if (res.at)
	{
		$('.download-pause').unbind('click');
		$('.download-pause').bind('click',function(e)
		{
			if ($(this).attr('class').indexOf('active') == -1) 
			{
				ulQueue.pause();
				dlQueue.pause();
				$(this).addClass('active');
			}
			else 
			{
				dlQueue.resume();
				ulQueue.resume();
				$(this).removeClass('active');
			}					
		});				
		$('.new-download-red-button').unbind('click');
		$('.new-download-red-button').bind('click',function(e)
		{
			if (dlMethod == MemoryIO && !localStorage.firefoxDialog && fdl_filesize > 1048576000 && navigator.userAgent.indexOf('Firefox') > -1) 
			{
				firefoxDialog();
			}			
			else if ((('-ms-scroll-limit' in document.documentElement.style && '-ms-ime-align' in document.documentElement.style)
			|| (navigator.userAgent.indexOf('MSIE 10') > -1)
			|| ((navigator.userAgent.indexOf('Safari') > -1) && (navigator.userAgent.indexOf('Chrome') == -1))) 
			&& fdl_filesize > 1048576000 && !localStorage.browserDialog)
			{
			  browserDialog();
			}
			else
			{			
				dl_queue.push(fdl_queue_var);					
				$('.download-mid-centered-block').addClass('downloading');
				$.dlhash = window.location.hash;
			}
		});				
		$('.new-download-gray-button').unbind('click');
		$('.new-download-gray-button').bind('click',function(e)
		{
			start_import();
		});
		
		var key = dlpage_key;
		
		if (key)
		{
			var base64key = key;
			key = base64_to_a32(key);					
			dl_attr = res.at;
			var dl_a = base64_to_ab(res.at);	
			fdl_file = dec_attr(dl_a,key);
			fdl_filesize = res.s;
		}				
		if (fdl_file)
		{
			if (dl_next === 2)
			{
				dlkey = dlpage_key;
				dlclickimport();
				return false;
			}
			fdl_queue_var = {
				ph:		dlpage_ph,						
				key: 	key,
				s: 		res.s,
				n: 		fdl_file.n,
				size:   fdl_filesize,
				onDownloadProgress: dlprogress,
				onDownloadComplete: dlcomplete,
				onDownloadStart: dlstart,
				onDownloadError: dlerror,
				onBeforeDownloadComplete: function() { }
			};
			$('.new-download-file-title').text(fdl_file.n);						
			$('.new-download-file-size').text(bytesToSize(res.s));
			$('.new-download-file-icon').addClass(fileicon({name:fdl_file.n}));								
		}
		else dlkeyDialog();
	}
	else $('.download-mid-centered-block').addClass('not-available-some-reason');
}



function closedlpopup()
{
	document.getElementById('download_overlay').style.display='none';
	document.getElementById('download_popup').style.left = '-500px';		
}

function dl_fm_import()
{	
	api_req(
	{	
		a: 'p',
		t: M.RootID,
		n: [{ ph: dl_import, t: 0, a: dl_attr, k: a32_to_base64(encrypt_key(u_k_aes,base64_to_a32(dlkey))) }]
	});
	dl_import=false;
}

function dlerror(dl,error)
{	
	var errorstr='';
	var tempe=false;
	if (error == EOVERQUOTA)
	{
		alert('quota dialog');
	}
	else if (error == ETOOMANYCONNECTIONS) errorstr = l[18];
	else if (error == ESID) errorstr = l[19];
	else if (error == ETEMPUNAVAIL) tempe = l[233];
	else if (error == EBLOCKED) tempe = l[23];
	else if (error == ENOENT) tempe=l[22];	
	else if (error == EACCESS) tempe = l[23];	
	else if (error == EKEY) tempe = l[24];	
	else if (error == EAGAIN) tempe = l[233];	
	else tempe = l[233];
	
	if (tempe)
	{
		$('.downloading-txt.temporary-error').text(tempe);
		$('.downloading-txt.temporary-error').removeClass('hidden');
		$('.downloadings-icons').addClass('hidden');
	}
}

function dlprogress(fileid, perc, bytesloaded, bytestotal,kbps, dl_queue_num)
{
	if (kbps == 0) return;
	$('.downloading-txt.temporary-error').addClass('hidden');
	$('.downloadings-icons').removeClass('hidden');
	if (uldl_hold) return false;
	if ((typeof dl_limit_shown != 'undefined') && (dl_limit_shown < new Date().getTime()+20000) && (!m)) bwDialog.close();
	if (!dl_queue[dl_queue_num].starttime) dl_queue[dl_queue_num].starttime = new Date().getTime()-100;	

	if (!m)
	{
		$('.download-mid-centered-block').addClass('downloading');
		$('.download-mid-centered-block').removeClass('not-available-temporary');
		$('.downloading-progress-bar').width(perc + '%');
		$('.new-download-icon').html('<div>'+perc+'<span>%</span></div>');
		megatitle(' ' + perc + '%');
	}	
	if (fdl_starttime) var eltime = (new Date().getTime()-fdl_starttime)/1000;	
	else var eltime = (new Date().getTime()-dl_queue[dl_queue_num].starttime)/1000;	
	if (eltime && bytesloaded)
	{
		var bps = kbps*1000;
		var retime = (bytestotal-bytesloaded)/bps;
		$('.downloading-txt.speed').text(bytesToSize(bps,1) +'/s');
		$('.downloading-txt.time').text(secondsToTime(retime));		
	}	
	if (page !== 'download' || $.infoscroll)
	{
		$('.widget-block').removeClass('hidden');
		$('.widget-block').show();
		$('.widget-circle').attr('class','widget-circle percents-'+perc);
		$('.widget-icon.downloading').removeClass('hidden');
		$('.widget-speed-block.dlspeed').text(bytesToSize(bps,1) +'/s');
		$('.widget-block').addClass('active');
	}
}

function dlstart(id,name,filesize)
{ 

}

function start_import()
{
	dl_import=dlpage_ph;
	if (u_type)
	{
		document.location.hash = 'fm';
		if (fminitialized) dl_fm_import();
	}
	else if (u_wasloggedin())
	{
		msgDialog('confirmation',l[1193],l[1194],l[1195],function(e)
		{
			if(e) start_anoimport();		
			else loginDialog();
		});
	}
	else start_anoimport();
}

function start_anoimport()
{
	loadingDialog.show();
	u_checklogin(
	{
		checkloginresult: function(u_ctx,r)
		{			
			u_type = r;
			u_checked=true;
			loadingDialog.hide();
			document.location.hash = 'fm';	
		}
	},true);
}

function dlcomplete(id)
{
	if (d) console.log('dlcomplete',id);
	if (typeof id === 'object') id = id.dl_id;
	$('.download-pause').hide();
	$('.download-mid-centered-block').addClass('download-complete');	
	$('.download-icon-pause').hide();
	$('.downloading-progress-bar').width('100%');
	$('.new-download-icon').html('<div>100<span>%</span></div>');		
	if ($('#dlswf_' + id).length > 0)
	{
		$('.fm-dialog-overlay').removeClass('hidden');
		$('.fm-dialog.download-dialog').css('left','50%');
		$('.fm-dialog.download-dialog .fm-dialog-close').unbind('click');
		$('.fm-dialog.download-dialog .fm-dialog-close').bind('click',function(e)
		{				
			$('.fm-dialog.download-dialog').css('left','-1000px');
			msgDialog('confirmation',l[1196],l[1197],l[1198],function(e)
			{					
				if (e) $('.fm-dialog.download-dialog').addClass('hidden');
				else
				{
					$('.fm-dialog.download-dialog').css('left','50%');
					$('.fm-dialog-overlay').removeClass('hidden');
				}
			});
		});
	}
	megatitle();		
	var a=0;
	for(var i in dl_queue) if (typeof dl_queue[i] == 'object' && dl_queue[i]['dl_id']) a++;
	if (a < 2 && !ul_uploading)
	{			
		$('.widget-block').fadeOut('slow',function(e)
		{								
			$('.widget-block').addClass('hidden');
			$('.widget-block').css({opacity:1});
		});
	}
	else if (a < 2) $('.widget-icon.downloading').addClass('hidden');
	else $('.widget-circle').attr('class','widget-circle percents-0');
}


function dlkeyDialog()
{
	$('.new-download-buttons').addClass('hidden');
	$('.new-download-file-title').text(l[1199]);	
	$('.new-download-file-icon').addClass(fileicon({name:'unknown.unknown'}));	
	$('.fm-dialog.dlkey-dialog').removeClass('hidden');
	$('.fm-dialog-overlay').removeClass('hidden');	
	$('.fm-dialog.dlkey-dialog input').unbind('focus');
	$('.fm-dialog.dlkey-dialog input').bind('focus',function(e)
	{
		if ($(this).val() == l[1028]) $(this).val('');	
	});	
	$('.fm-dialog.dlkey-dialog input').unbind('blur');
	$('.fm-dialog.dlkey-dialog input').bind('blur',function(e)
	{
		if ($(this).val() == '') $(this).val(l[1028]);
	});	
	$('.fm-dialog.dlkey-dialog input').unbind('keydown');
	$('.fm-dialog.dlkey-dialog input').bind('keydown',function(e)
	{
		$('.fm-dialog.dlkey-dialog .fm-dialog-new-folder-button').addClass('active');
		if (e.keyCode == 13) $('.fm-dialog.dlkey-dialog .fm-dialog-new-folder-button').click();
	});
	$('.fm-dialog.dlkey-dialog .fm-dialog-new-folder-button').unbind('click');
	$('.fm-dialog.dlkey-dialog .fm-dialog-new-folder-button').bind('click',function(e)
	{
		$('.fm-dialog.dlkey-dialog').addClass('hidden');
		$('.fm-dialog-overlay').addClass('hidden');	
		document.location.hash = '#!' + dlpage_ph + '!' + $('.fm-dialog.dlkey-dialog input').val();
	});	
	$('.fm-dialog.dlkey-dialog .fm-dialog-close').unbind('click');
	$('.fm-dialog.dlkey-dialog .fm-dialog-close').bind('click',function(e)
	{
		$('.fm-dialog.dlkey-dialog').addClass('hidden');
		$('.fm-dialog-overlay').addClass('hidden');	
	});
}

function sync_switchOS(os)
{	
	if (os == 'windows')
	{
		syncurl = 'https://mega.co.nz/MEGAsyncSetup.exe';
		$('.sync-button-txt.small').text(l[1158]);			
		$('.sync-bottom-txt').html('Also available for <a href="" class="red mac">Mac</a> and <a href="" class="red linux">Linux</a>');
		$('.sync-button').removeClass('mac linux');
		$('.sync-button').attr('href',syncurl);
	}
	else if (os == 'mac')
	{
		syncurl = 'https://mega.co.nz/MEGAsyncSetup.dmg';
		var ostxt = 'For Mac';
		if (l[1158].indexOf('Windows') > -1) ostxt = l[1158].replace('Windows','Mac');	
		if (l[1158].indexOf('Linux') > -1) ostxt = l[1158].replace('Linux','Mac');			
		$('.sync-button-txt.small').text(ostxt);			
		$('.sync-bottom-txt').html('Also available for <a href="" class="red windows">Windows</a> and <a href="" class="red linux">Linux</a>');
		$('.sync-button').removeClass('windows linux').addClass('mac');
		$('.sync-button').attr('href',syncurl);
	}
	else if (os == 'linux')
	{
		syncurl = '/#sync';
		var ostxt = 'For Linux';
		if (l[1158].indexOf('Windows') > -1) ostxt = l[1158].replace('Windows','Linux');
		if (l[1158].indexOf('Mac') > -1) ostxt = l[1158].replace('Mac','Linux');			
		$('.sync-button-txt.small').text(ostxt);			
		$('.sync-bottom-txt').html('Also available for <a href="" class="red windows">Windows</a> and <a href="" class="red mac">Mac</a>');
		$('.sync-button').removeClass('mac linux').addClass('linux');
		$('.sync-button').attr('href',syncurl);
		
	}		
	$('.sync-bottom-txt a').unbind('click');
	$('.sync-bottom-txt a').bind('click',function(e)
	{
		var c = $(this).attr('class');
		if (c && c.indexOf('windows') > -1) sync_switchOS('windows');
		else if (c && c.indexOf('mac') > -1) sync_switchOS('mac');
		else if (c && c.indexOf('linux') > -1) sync_switchOS('linux');
		return false;
	});
}



