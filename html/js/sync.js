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

	$('#syncanim').unbind('click');
	$('#syncanim').bind('click',function(e)
	{
		$('.sync-button').click();
	});

	if (navigator.platform.toUpperCase().indexOf('MAC')>=0) sync_switchOS('mac');
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

function sync_switchOS(os)
{	
	if (os == 'windows')
	{
		$('.sync-button-txt.small').text(l[1158]);			
		$('.sync-bottom-txt').html('Also available for <a href="" class="red mac">Mac</a>');
		$('.sync-button').removeClass('mac');
		$('.sync-button').attr('href','https://mega.co.nz/MEGAsyncSetup.exe');
	}
	else if (os == 'mac')
	{
		var ostxt = 'For Mac';
		if (l[1158].indexOf('Windows') > -1) ostxt = l[1158].replace('Windows','Mac');			
		$('.sync-button-txt.small').text(ostxt);			
		$('.sync-bottom-txt').html('Also available for <a href="" class="red windows">Windows</a>');
		$('.sync-button').addClass('mac');
		$('.sync-button').attr('href','https://mega.co.nz/MegaSync.dmg');
	}	
	$('.sync-bottom-txt a').unbind('click');
	$('.sync-bottom-txt a').bind('click',function(e)
	{
		var c = $(this).attr('class');
		if (c && c.indexOf('windows') > -1) sync_switchOS('windows');
		else if (c && c.indexOf('mac') > -1) sync_switchOS('mac');
		return false;
	});
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