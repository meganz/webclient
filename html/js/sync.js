


var linuxsync = 
[{
	'name':'Debian 7.0',
	'32':'Debian_7.0/i386/megasync_i386.deb',
	'32n':'Debian_7.0/i386/nautilus-megasync_i386.deb',
	'64':'Debian_7.0/amd64/megasync_amd64.deb',
	'64n':'Debian_7.0/amd64/nautilus-megasync_amd64.deb',
	'c':'sudo gdebi'
},
{
	'name':'Fedora 19',
	'32':'Fedora_19/i686/megasync.i686.rpm',
	'32n':'Fedora_19/i686/nautilus-megasync-1.0.29.i686.rpm',
	'64':'Fedora_19/x86_64/megasync.x86_64.rpm',
	'64n':'Fedora_19/x86_64/nautilus-megasync-1.0.29.x86_64.rpm',
	'c':'sudo yum localinstall'
},
{
	'name':'Fedora 20',
	'32':'Fedora_20/i686/megasync.i686.rpm',
	'32n':'Fedora_20/i686/nautilus-megasync-1.0.29.i686.rpm',
	'64':'Fedora_20/x86_64/megasync.x86_64.rpm',
	'64n':'Fedora_20/x86_64/nautilus-megasync-1.0.29.x86_64.rpm',
	'c':'sudo yum localinstall'
},
{
	'name':'openSUSE 12.2',
	'32':'openSUSE_12.2/i586/megasync.i586.rpm',
	'32n':'openSUSE_12.2/i586/nautilus-megasync-1.0.29.i586.rpm',
	'64':'openSUSE_12.2/x86_64/megasync.x86_64.rpm',
	'64n':'openSUSE_12.2/x86_64/nautilus-megasync-1.0.29.x86_64.rpm',
	'c':'sudo zypper in'
},
{
	'name':'openSUSE 12.3',
	'32':'openSUSE_12.3/i586/megasync.i586.rpm',
	'32n':'openSUSE_12.3/i586/nautilus-megasync-1.0.29.i586.rpm',
	'64':'openSUSE_12.3/x86_64/megasync.x86_64.rpm',
	'64n':'openSUSE_12.3/x86_64/nautilus-megasync-1.0.29.x86_64.rpm',
	'c':'sudo zypper in'
},
{
	'name':'openSUSE 13.1',
	'32':'openSUSE_13.1/i586/megasync.i586.rpm',
	'32n':'openSUSE_13.1/i586/nautilus-megasync-1.0.29.i586.rpm',
	'64':'openSUSE_13.1/x86_64/megasync.x86_64.rpm',
	'64n':'openSUSE_13.1/x86_64/nautilus-megasync-1.0.29.x86_64.rpm',
	'c':'sudo zypper in'
},
{
	'name':'Ubuntu 12.04',
	'32':'xUbuntu_12.04/i386/megasync_i386.deb',
	'32n':'xUbuntu_12.04/i386/nautilus-megasync_i386.deb',
	'64':'xUbuntu_12.04/amd64/megasync_amd64.deb',
	'64n':'xUbuntu_12.04/amd64/nautilus-megasync_amd64.deb',
	'c':'sudo gdebi'
},
{
	'name':'Ubuntu 12.10',
	'32':'xUbuntu_12.10/i386/megasync_i386.deb',
	'32n':'xUbuntu_12.10/i386/nautilus-megasync_i386.deb',
	'64':'xUbuntu_12.10/amd64/megasync_amd64.deb',
	'64n':'xUbuntu_12.10/amd64/nautilus-megasync_amd64.deb',
	'c':'sudo gdebi'
},
{
	'name':'Ubuntu 13.10',
	'32':'xUbuntu_13.10/i386/megasync_i386.deb',
	'32n':'xUbuntu_13.10/i386/nautilus-megasync_i386.deb',
	'64':'xUbuntu_13.10/amd64/megasync_amd64.deb',
	'64n':'xUbuntu_13.10/amd64/nautilus-megasync_amd64.deb',
	'c':'sudo gdebi'
},
{
	'name':'Ubuntu 14.04',
	'32':'xUbuntu_14.04/i386/megasync_i386.deb',
	'32n':'xUbuntu_14.04/i386/nautilus-megasync_i386.deb',
	'64':'xUbuntu_14.04/amd64/megasync_amd64.deb',
	'64n':'xUbuntu_14.04/amd64/nautilus-megasync_amd64.deb',
	'c':'sudo gdebi'
}];



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
	pf = 'LINUX';
	if (pf.indexOf('MAC')>=0) sync_switchOS('mac');
	else if (pf.indexOf('LINUX')>=0) sync_switchOS('linux');
	else sync_switchOS('windows');
	if (typeof swiffy == 'undefined' && !silent_loading)
	{
		silent_loading=function()
		{
			startSync();			
		};
		jsl.push(jsl2['mads_js']);
		jsl_start();
	}
	else startSync();
}



var syncurl,nautilusurl;
var syncsel=false;

function sync_switchOS(os)
{
	$('.sync-button').attr('href','');
	$('.sync-button-block.linux').addClass('hidden');
	if (os == 'windows')
	{
		syncurl = 'https://mega.co.nz/MEGAsyncSetup.exe';
		$('.sync-button-txt.small').text(l[1158]);			
		$('.sync-bottom-txt.button-txt').html(l[2025]);
		$('.sync-button').removeClass('mac linux');
		$('.sync-button').attr('href',syncurl);
		$('.sync-button').unbind('click');
	}
	else if (os == 'mac')
	{
		syncurl = 'https://mega.co.nz/MEGAsyncSetup.dmg';
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
		   // TODO: change link according $('input:radio[name="architecture"]') value
		   $('.sync-button').attr('href',$(this).val());
        });
		$('.sync-button.linux').addClass('disabled');
		$('.sync-bottom-txt.linux-txt').css('opacity', '0.3');
		$('.version-select-txt').html(l[2029]);
		var ua = navigator.userAgent.toLowerCase();
		
		//ua = 'debian 7.0';
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
	if (linuxsync[i])
	{
		$('.version-select-txt').text(linuxsync[i].name);
		$('.sync-button.linux').removeClass('disabled');
		$('.sync-bottom-txt.linux-txt').css('opacity', '1');	
		var platform = '64';
		var c = $('.linux32').parent().attr('class');
		if (c && c.indexOf('radioOn') > -1) platform = '32';
		syncurl = 'https://mega.co.nz/linux/MEGAsync/' + linuxsync[i][platform];
		nautilusurl = 'https://mega.co.nz/linux/MEGAsync/' + linuxsync[i][platform + 'n'];
		$('.sync-button').attr('href',syncurl);
		$('.sync-bottom-txt.linux-txt a').attr('href',nautilusurl);
		syncsel=i;
	}
	else
	{
		syncurl = false;
		nautilusurl = false;
		$('.sync-button.linux').addClass('disabled');
		$('.sync-bottom-txt.linux-txt').css('opacity', '0.3');
		$('.version-select-txt').html(l[2029]);	
	}
}

function startSync()
{
	stage = new swiffy.Stage(document.getElementById('syncanim'), swiffyobject);
	stage.start();
	setTimeout(function()
	{
		$('#syncanim svg').css('cursor','pointer');
	},500);
}