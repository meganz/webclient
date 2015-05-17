function init_help()
{
	var subpage='',search ='';	
	if (page.length > 4) subpage = page.substr(5,page.length-1);
	if (subpage.substr(0,6) == 'search')
	{
		search = subpage.replace('search/','');
		subpage='';
	}	
	$('.new-left-menu-link,.help-block').unbind('click');
	$('.new-left-menu-link,.help-block').bind('click',function(e)
	{
		var c = $(this).attr('class');
		if (!c) return false;
		if (c.indexOf('basics') > -1) document.location.hash = 'help/basics';
		else if (c.indexOf('sharing') > -1) document.location.hash = 'help/sharing';
		else if (c.indexOf('security') > -1) document.location.hash = 'help/security';
		else if (c.indexOf('account') > -1) document.location.hash = 'help/account';
		else if (c.indexOf('sync') > -1) document.location.hash = 'help/sync';
		else if (c.indexOf('ios') > -1) document.location.hash = 'help/ios';
		else if (c.indexOf('android') > -1) document.location.hash = 'help/android';
		else document.location.hash = 'help';
	});	
	
	
	
	$('.new-left-menu-link.home').addClass('active');
	
	$('.new-right-content-block').addClass('hidden');	
	if (search)
	{
		var html = '<h1 class="help-home-header">Help Centre - <span class="red">search</span></h1><div class="blog-new-search"><input value="" class="help_search"/></div><div class="blog-new-div"><div></div></div>';		
		var a=0;
		for (var i in helpdata)
		{
			if (helpdata[i].q.toLowerCase().indexOf(search.toLowerCase()) > -1 || helpdata[i].a.toLowerCase().indexOf(search.toLowerCase()) > -1)
			{
				html +='<h2>' + helpdata[i].q + '</h2>' + helpdata[i].a + '';
				a++;
			}
		}
		if (a == 0) html += '<h2>' + l[978] + '</h2>';		
		$('.new-right-content-block.help-info-pages').html(html);
		$('.new-right-content-block.help-info-pages').removeClass('hidden');
		$('.help_search').val(search);
		mainScroll();
		scrollMenu();
	}	
	else if (subpage)
	{
		$('.new-left-menu-link').removeClass('active');			
		var id,title;		
		if (subpage == 'basics')
		{
			id=0;
			title = 'Basics';
			$('.new-left-menu-link.basics').addClass('active');
		}
		else if (subpage == 'sharing')
		{
			id=1;
			title = 'Sharing';
			$('.new-left-menu-link.sharing').addClass('active');
		}
		else if (subpage == 'security')
		{
			id=2;
			title = 'Security & Privacy';
			$('.new-left-menu-link.security').addClass('active');
		}
		else if (subpage == 'account')
		{
			id=3;
			title = 'Account';
			$('.new-left-menu-link.account').addClass('active');
		}
		else if (subpage == 'sync')
		{
			id=4;
			title = 'Sync Client';
			$('.new-left-menu-link.sync').addClass('active');
		}
		else if (subpage == 'ios')
		{
			id=5;
			title = 'iOS App';
			$('.new-left-menu-link.ios').addClass('active');
		}
		else if (subpage == 'android')
		{
			id=6;
			title = 'Android App';
			$('.new-left-menu-link.android').addClass('active');
		}
		$('.new-right-content-block.help-info-pages').removeClass('hidden');
		$('.help-info-pages .sections').addClass('hidden');
		$('#section-' + subpage).removeClass('hidden');
		mainScroll();
	}
	else
	{
		$('.new-right-content-block.home').removeClass('hidden');		
	}
	$('.help_search').unbind('keyup');
	$('.help_search').bind('keyup',function(e)
	{
		if (e.keyCode == 13) document.location.hash = 'help/search/' + $(this).val();
	});	
	$('.help_search').unbind('focus');
	$('.help_search').bind('focus',function(e)
	{
		if ($(this).val() == l[102]) $(this).val('');
	});
	$('.help_search').unbind('blur');
	$('.help_search').bind('blur',function(e)
	{
		if ($(this).val() == '') $(this).val(l[102]);
	});
	scrollMenu()
}


l[1212] = l[1212].replace('[A]','<a href="#sdk" class="red">').replace('[/A]','</a>');
l[1218] = l[1218].replace('[A]','<a href="#affiliateterms" class="red">').replace('[/A]','</a>');
l[1863] = l[1863].replace('[A]','<a href="#mobile">').replace('[/A]','</a>');
l[1863] = l[1863].replace('[B]','<a href="https://itunes.apple.com/app/mega/id706857885" target="_blank">').replace('[/B]','</a>');
l[1863] = l[1863].replace('[C]','<a href="https://play.google.com/store/apps/details?id=nz.mega.android&amp;referrer=meganzhelp" target="_blank">').replace('[/C]','</a>');
l[1862] = l[1862].replace('[A]','<a href="https://play.google.com/store/apps/details?id=nz.mega.android&amp;referrer=meganzhelp" target="_blank">').replace('[/A]','</a>');
l[1860] = l[1860].replace('[A]','<a href="https://itunes.apple.com/app/mega/id706857885" target="_blank">').replace('[/A]','</a>');
l[1828] = l[1828].replace('[A]','<a href="#sync">').replace('[/A]','</a>');
l[1996] = l[1996].replace('[A]','<a href="mailto:support@mega.co.nz">').replace('[/A]','</a>');
l[1998]	= l[1998].replace('[A]','<a href="#backup">').replace('[/A]','</a>');
l[1838] = l[1838].replace('"Debris"','"Rubbish"');


var helpdata = []
