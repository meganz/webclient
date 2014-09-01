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
			document.location.href = syncurl;
		});
	},1000);
	
	
	
	var pf = navigator.platform.toUpperCase();
	
	//pf = 'LINUX';

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

var syncurl;

function sync_switchOS(os)
{	
	if (os == 'windows')
	{
		syncurl = 'https://mega.co.nz/MEGAsyncSetup.exe';
		$('.sync-button-txt.small').text(l[1158]);			
		$('.sync-bottom-txt').html('Also available for <a href="" class="red mac">Mac</a> and <a href="" class="red linux">Linux</a>');
		$('.sync-button').removeClass('mac linux');
		$('.sync-button').attr('href',syncurl);
		$('.sync-button').unbind('click');
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
		$('.sync-button').unbind('click');
	}
	else if (os == 'linux')
	{
		var ostxt = 'For Linux';
		if (l[1158].indexOf('Windows') > -1) ostxt = l[1158].replace('Windows','Linux');
		if (l[1158].indexOf('Mac') > -1) ostxt = l[1158].replace('Mac','Linux');			
		$('.sync-button-txt.small').text(ostxt);			
		$('.sync-bottom-txt').html('Download MEGA <a href="" class="red">Nautilus extension package</a> (optionally).<br/>Also available for <a href="" class="red windows">Windows</a> and <a href="" class="red mac">Mac</a>');
		$('.sync-button').removeClass('mac linux').addClass('linux');
		$('.fm-version-select').removeClass('hidden');
		$('.sync-radio-buttons').removeClass('hidden');
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
		
	}		
	$('.sync-bottom-txt a').unbind('click');
	$('.sync-bottom-txt a').bind('click',function(e)
	{
		var c = $(this).attr('class');
		$('.fm-version-select').addClass('hidden');	
		$('.sync-radio-buttons').addClass('hidden');
		if (c && c.indexOf('windows') > -1) sync_switchOS('windows');
		else if (c && c.indexOf('mac') > -1) sync_switchOS('mac');
		else if (c && c.indexOf('linux') > -1) sync_switchOS('linux');
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