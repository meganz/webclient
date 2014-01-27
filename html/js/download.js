var dlpage_key,dlpage_ph;
var fdl_filename, fdl_filesize, fdl_key, fdl_url, fdl_starttime;
var fdl_file=false;
var dl_import=false;
var dl_attr;
var fdl_queue_var=false;

function dlinfo(ph,key,next)
{
	if ((lang == 'en') || (lang !== 'en' && l[1388] !== '[B]Download[/B] [A]to your computer[/A]'))
	{
		$('.new-download-red-button').html(l[1388].replace('[B]','<div class="new-download-button-txt1">').replace('[/B]','</div>').replace('[A]','<div class="new-download-button-txt2">').replace('[/A]','</div>'));		
		$('.new-download-gray-button').html(l[1389].replace('[B]','<div class="new-download-button-txt1">').replace('[/B]','</div>').replace('[A]','<div class="new-download-button-txt2">').replace('[/A]','</div>'));		
	}

	$('.widget-block').addClass('hidden');
	if (!m) init_start();
	if (dl_method == 1)
	{
		$('.fm-dialog.download-dialog').removeClass('hidden');
		$('.fm-dialog.download-dialog').css('left','-1000px');
		$('.download-save-your-file').html('<object data="' + document.location.origin + '/downloader.swf" id="dlswf_'+ htmlentities(ph) + '" type="application/x-shockwave-flash" height="' + $('.download-save-your-file').height() + '"  width="' + $('.download-save-your-file').width() + '"><param name="wmode" value="transparent"><param value="always" name="allowscriptaccess"><param value="all" name="allowNetworking"><param name=FlashVars value="buttonclick=1" /></object>');
	}	
	loadingDialog.show();
	$('.download-mid-white-block').addClass('hidden');	
	dlpage_ph 	= ph;
	dlpage_key 	= key;
	api_req({ a : 'g', p : ph },
	{
		callback : function (res)
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
						uldl_pause();
						$(this).addClass('active');
					}
					else 
					{
						uldl_resume();
						$(this).removeClass('active');
					}					
				});				
				$('.new-download-red-button').unbind('click');
				$('.new-download-red-button').bind('click',function(e)
				{
					if (dl_method == 4 && !localStorage.firefoxDialog && fdl_filesize > 104857600) setTimeout(firefoxDialog,3000);
					
					dl_queue.push(fdl_queue_var);					
					$('.download-mid-centered-block').addClass('downloading');
					$.dlhash = window.location.hash;
					startdownload();
				});				
				$('.new-download-gray-button').unbind('click');
				$('.new-download-gray-button').bind('click',function(e)
				{
					start_import();
				});
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
					if (next === 2)
					{
						dlkey = dlpage_key;
						dlclickimport();
						return false;
					}
					fdl_queue_var = {
						ph:		ph,						
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
				if (baboom) dl_ad();				
			}
			else $('.download-mid-centered-block').addClass('not-available-some-reason');
			if ((dl_method == 1 || dl_method == 2) && !localStorage.browserDialog && !$.browserDialog)
			{
				setTimeout(function()
				{
					browserDialog();
				},2000);
			}			
		}
	});
}



function dl_ad()
{
	if (u_attr && u_attr.p) return false;
	var audiopath = 'https://m.static.mega.co.nz/';	
	$('body').addClass('adv');
	window.baboomAds([
	{
		url:audiopath + 'audio/01.mp3',
		title: 'Amazing',
		top: -20
	},
	{
		url:audiopath + 'audio/02.mp3',
		title: 'Good Times<br>',
		top: -20
	},
	{
		url:audiopath + 'audio/03.mp3',
		title: 'Dance Dance Dance',
		top: -20
	},
	{
		url:audiopath + 'audio/04.mp3',
		title: 'Keeps Getting Better<br>',
		top: -45
	},
	{
		url:audiopath + 'audio/05.mp3',
		title: 'Change Your Life',
		top: -20
	},
	{
		url:audiopath + 'audio/06.mp3',
		title: 'Universe<br>',
		top: -20
	},
	{
		url:audiopath + 'audio/07.mp3',
		title: 'Little Bit Of Me',
		top: -20
	},
	{
		url:audiopath + 'audio/08.mp3',
		title: 'Party Electricity',
		top: -20
	},
	{
		url:audiopath + 'audio/09.mp3',
		title: 'Wunderbar (Interlude)',
		top: -45
	},
	{
		url:audiopath + 'audio/10.mp3',
		title: 'To Be With You',
		top: -20
	},
	{
		url:audiopath + 'audio/11.mp3',
		title: 'Good Life',
		top: -20
	},
	{
		url:audiopath + 'audio/12.mp3',
		title: 'Party Amplifier',
		top: -20
	},
	{
		url:audiopath + 'audio/13.mp3',
		title: 'Take Me Away',
		top: -20
	},
	{
		url:audiopath + 'audio/14.mp3',
		title: 'Beathoven (Interlude)',
		top: -45
	},
	{
		url:audiopath + 'audio/15.mp3',
		title: 'Firework',
		top: -20
	},
	{
		url:audiopath + 'audio/16.mp3',
		title: 'Live My Life',
		top: -20
	},
	{
		url:audiopath + 'audio/17.mp3',
		title: 'Beathoven Slow',
		top: -20
	}], function (err) {
	// TODO: handle err
});


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

function dlerror(id,error)
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
	else if (error == EBLOCKED)
	{
		msgDialog('warningb','Error',l[21]);
		tempe=l[21];
	}
	else if (error == ENOENT) tempe=l[22];	
	else if (error == EACCESS) tempe = l[23];	
	else if (error == EKEY) tempe = l[24];	
	else if (error == EAGAIN) tempe = l[233];	
	else tempe = l[233];
	
	console.log('tempe',tempe);
	
	if (tempe)
	{
		$('.downloading-txt.temporary-error').text(tempe);
		$('.downloading-txt.temporary-error').removeClass('hidden');
		$('.downloadings-icons').addClass('hidden');
	}
}

function dlprogress(fileid, bytesloaded, bytestotal,kbps)
{
	$('.downloading-txt.temporary-error').addClass('hidden');
	$('.downloadings-icons').removeClass('hidden');
	if (uldl_hold) return false;
	if ((typeof dl_limit_shown != 'undefined') && (dl_limit_shown < new Date().getTime()+20000) && (!m)) bwDialog.close();
	if (!dl_queue[dl_queue_num].starttime) dl_queue[dl_queue_num].starttime = new Date().getTime()-100;	
	var perc = Math.round(bytesloaded/bytestotal*100);	
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
	for(var i in dl_queue) if (dl_queue[i]) a++;
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

