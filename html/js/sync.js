var linuxsync = megasync.getLinuxReleases();

function init_sync()
{
	$('.st-apps-icon.mobile').unbind('click');
	$('.st-apps-icon.mobile').bind('click', function ()
	{
		document.location.hash = 'mobile';
	});

	$('.st-apps-icon.browser').unbind('click');
	$('.st-apps-icon.browser').bind('click', function ()
	{
		document.location.hash = 'plugin';
	});

	$('.sync-help-center').unbind('click');
	$('.sync-help-center').bind('click',function(e)
	{
		document.location.hash = 'help/sync';
	});	
	setTimeout(function()
	{
		$('#syncanim').unbind('click');
		$('#syncanim').bind('click',function(e)
		{
			if (syncurl) document.location.href = syncurl;
		});
	},1000);
	var pf = navigator.platform.toUpperCase();
	
	if (page.substr(-5) == 'linux') sync_switchOS('linux');	
	else if (pf.indexOf('MAC')>=0) sync_switchOS('mac');
	else if (pf.indexOf('LINUX')>=0) sync_switchOS('linux');
	else sync_switchOS('windows');
}



var syncurl,nautilusurl;
var syncsel=false;

function sync_switchOS(os)
{
	$('.linuxhint').hide();
	$('.sync-button').attr('href','');
	$('.sync-button-block.linux').addClass('hidden');
	syncurl = megasync.getDownloadUrl(os);
	if (os == 'windows')
	{
		$('.sync-button-txt.small').text(l[1158]);			
		$('.sync-bottom-txt.button-txt').html(l[2025]);
		$('.sync-button').removeClass('mac linux');
		$('.sync-button').attr('href',syncurl);
		$('.sync-button').unbind('click');
	}
	else if (os == 'mac')
	{
		var ostxt = l[2031];
		if (l[1158].indexOf('Windows') > -1) ostxt = l[1158].replace('Windows','Mac');	
		if (l[1158].indexOf('Linux') > -1) ostxt = l[1158].replace('Linux','Mac');			
		$('.sync-button-txt.small').text(ostxt);			
		$('.sync-bottom-txt.button-txt').html(l[2026]);
		$('.sync-button').removeClass('windows linux').addClass('mac');
		$('.sync-button').attr('href',syncurl);
		$('.sync-button').unbind('click');
	}
	else if (os == 'linux')
	{
		syncurl=undefined;
		syncsel=false;
		var ostxt = l[2032];
		if (l[1158].indexOf('Windows') > -1) ostxt = l[1158].replace('Windows','Linux');
		if (l[1158].indexOf('Mac') > -1) ostxt = l[1158].replace('Mac','Linux');
		$('.sync-button-txt.small').text(ostxt);		
		$('.sync-bottom-txt.button-txt').html(l[2027]);
		$('.sync-bottom-txt.linux-txt').html('<span class="nautilus-lnk">MEGA <a href="" class="red">Nautilus extension</a> (' + l[2028] + ')</span>');		
		$('.sync-button').removeClass('mac linux').addClass('linux');
		$('.sync-button-block.linux').removeClass('hidden');
		$('.architecture-checkbox input').bind('click',function() {
			$('.architecture-checkbox.radioOn').removeClass('radioOn').addClass('radioOff');
			$(this).parent().removeClass('radioOff').addClass('radioOn');
			$(this).attr('checked', true)
		});
		$('.fm-version-select select').bind('change',function() {
           $('.version-select-txt').text($('.fm-version-select select option:selected').text());
		   $('.sync-button').attr('href',$(this).val());
        });
		$('.sync-button.linux').addClass('disabled');
		$('.sync-bottom-txt.linux-txt').css('opacity', '0.3');
		$('.version-select-txt').html(l[2029]);
		var ua = navigator.userAgent.toLowerCase();
		if (ua.indexOf('i686') > -1 || ua.indexOf('i386') > -1 || ua.indexOf('i586') > -1) $('.sync-radio-buttons #rad1').click();		
		var options = '<option id="-1">' + l[2029] + '</option>';
		for (var i in linuxsync)
		{
			var selected = '';
			var version = linuxsync[i].name.split(' ');
			version = version[version.length-1];		
			var name = linuxsync[i].name.replace(' ' + version,'');			
			if (ua.indexOf(name.toLowerCase()) > -1 && ua.indexOf(version) > -1)
			{
				selected = 'selected';
				changeLinux(i);
			}
			options += '<option value="'+i+'" ' + selected + '>' + linuxsync[i].name + '</option>';
		}
		$('.fm-version-select.sync select').html(options);
		
		$('.fm-version-select.sync select').unbind('change');
		$('.fm-version-select.sync select').bind('change',function(e)
		{			
			changeLinux($(this).val());
		});

		$('.sync-bottom-txt.linux-txt a').unbind('click');
		$('.sync-bottom-txt.linux-txt a').bind('click',function(e)
		{
			if (!nautilusurl) return false;		
		});
		
		$('.sync-button').unbind('click');
		$('.sync-button').bind('click',function(e)
		{
			if (!syncurl)
			{
				msgDialog('info',l[2029],l[2030]);
				return false;		
			}
		});
		
		$('.sync-radio-buttons input').unbind('change');
		$('.sync-radio-buttons input').bind('change',function(e)
		{
			if (syncsel) setTimeout(function() { changeLinux(syncsel); },1);
		});
	}		
	$('.sync-bottom-txt.button-txt a').unbind('click');
	$('.sync-bottom-txt.button-txt a').bind('click',function(e)
	{
		var c = $(this).attr('class');		
		if (c && c.indexOf('windows') > -1) sync_switchOS('windows');
		else if (c && c.indexOf('mac') > -1) sync_switchOS('mac');
		else if (c && c.indexOf('linux') > -1) sync_switchOS('linux');
		return false;
	});
}

function changeLinux(i)
{
	if (linuxsync[i]['32'])
	{
		$('.linux32').parent().show();
		$('.radio-txt.32').show();
	}
	else
	{
		$('.linux32').parent().hide();
		$('.radio-txt.32').hide();
	}

	if (linuxsync[i])
	{
		$('.version-select-txt').text(linuxsync[i].name);
		$('.sync-button.linux').removeClass('disabled');
		$('.sync-bottom-txt.linux-txt').css('opacity', '1');	
		var platform = '64';		
		var c = $('.linux32').parent().attr('class');
		if (c && c.indexOf('radioOn') > -1) platform = '32';
		syncurl = megasync.getDownloadUrl(linuxsync[i]['name'] + " " + platform);
		nautilusurl =  megasync.getDownloadUrl(linuxsync[i]['name'] + " " + platform + "n");
		var filename = syncurl.split('/').pop();
		$('.sync-button').attr('href',syncurl);
		$('.sync-bottom-txt.linux-txt a').attr('href',nautilusurl);
		$('.linuxhint').html('*' + l[1909] + ': <font style="font-family:courier;">' + linuxsync[i].c + ' ' + filename + '</font>');
		$('.linuxhint').show();
		syncsel=i;
	}
	else
	{
		syncurl = false;
		nautilusurl = false;
		$('.linuxhint').hide();
		$('.sync-button.linux').addClass('disabled');
		$('.sync-bottom-txt.linux-txt').css('opacity', '0.3');
		$('.version-select-txt').html(l[2029]);	
	}
}
