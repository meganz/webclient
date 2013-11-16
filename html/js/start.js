function start_over()
{
	if (!$.startmotion) $.startmotion=true;
	else return false;
	$('.st-main-button-icon').fadeOut( 100, function() 
	{	
	  $('.st-main-button-icon-hovered').fadeIn(450);
	  $.startignore=true; 
	  $.startmotion=false;
	});
	$('.st-main-info').addClass('active');
	$('.st-main-cursor').addClass('active');
	$('.st-main-button').addClass('active');
}

function start_out()
{	
	if (!$.startmotion) $.startmotion=true;
	else return false;
	$.startignore=false;
	$('.st-main-button-icon-hovered').fadeOut( 100, function() 
	{	
		$('.st-main-button-icon').fadeIn(450);
	  $.startmotion=false;
	});	
	$('.st-main-info').removeClass('active');
	$('.st-main-cursor').removeClass('active');
	$('.st-main-button').removeClass('active');
}

function init_start()
{
	megainfotxt();
	
	if (lang !== 'en')
	{
		l[225] = l[225].toLowerCase();
		l[225] = l[225].substr(0,1).toUpperCase() + l[225].substr(1,l[225].length-1).toLowerCase();
		$('.st-main-info.uploadtxt').text(l[225]);
	}
	
	if (page == 'start')
	{
		$('.st-main-button-icon').unbind('mouseover');
		$('.st-main-button-icon').bind('mouseover',function(event) 
		{
			if (!$.dragging && !$.startscrolling) start_over();		   
		});
		
		$('.st-main-button-icon').unbind('mouseout');
		$('.st-main-button-icon').bind('mouseout',function(event) 
		{
			if (!$.startignore) setTimeout(function() {start_out();},300);			
		});
		
		$('.st-main-button-icon-hovered').unbind('mouseout');
		$('.st-main-button-icon-hovered').bind('mouseout',function(event) 
		{
			if (!$.dragging) start_out();
		});
	}	
	$(window).unbind('resize');
	$(window).bind('resize', function (e)
	{		
		if (page == 'start' && $.infoscroll)
		{
			startscrollIgnore(1000);
			jScrollStart();
		}
    });
	$('.st-bottom-scroll-button.scrolldown').unbind('click');
	$('.st-bottom-scroll-button.scrolldown').bind('click',function(event) 
    {
		startpageScroll();		  
    });	
	
	
	$('.st-bottom-scroll-button.scrollup').unbind('click');
	$('.st-bottom-scroll-button.scrollup').bind('click',function(event) 
    {
		startpageMain();
    });	

	
	var el = '.st-mid-white-block';
	if (page == 'download') el = '.download-mid-white-block';
	
	$(el).unbind('mousewheel');
	$(el).bind('mousewheel',function(e)
	{
		if (e && e.originalEvent && (e.originalEvent.wheelDelta < 0 || e.originalEvent.deltaY > 0) && !$.infoscroll) startpageScroll();		
	});	
	if (page == 'start') InitFileDrag();
	if (document.location.hash == '#info') startpageScroll(1);
}

$.jScroll={};


function jScrollStart()
{
	$('.st-main-block').jScrollPane({showArrows:true, arrowSize:5,animateScroll:true,mouseWheelSpeed:100});
	jScrollFade('.st-main-block');
	$('.st-main-block').unbind('jsp-scroll-y.back');
	$('.st-main-block').bind('jsp-scroll-y.back',function(event, scrollPositionY, isAtTop, isAtBottom)
	{		
		if (isAtTop && !$.scrollIgnore) startpageMain();		
		else if (!isAtTop) startscrollIgnore(500);		
	});
}




function startpageScroll(blockSwing)
{
	if (page == 'download') $('.st-bottom-scroll-button.scrollup').text(l[1375]);	
	$.infoscroll=true;
	if ($.hideTopMenu) $.hideTopMenu();
	var el = '.st-mid-white-block';
	if (page == 'download') el = '.download-mid-white-block';	
	$(el).addClass('active');
	$('.st-main-bottom.scroll.floating').show();
	$('.st-full-block').removeClass('hidden');	
	if (page == 'start') document.location.hash='#info';	
	if (blockSwing)
	{
		$('.st-main-block').scrollTop($('.st-main-block').height());
		startpageJSP();		
	}
	else
	{	
		$.startscrolling=true;
		$('.st-main-block').animate({scrollTop:$('.st-main-block').height()}, '300', 'swing', function() 
		{
			setTimeout(startpageJSP,50);
			$.startscrolling=false;
		});
	}
}


function megainfotxt()
{
	if (lang !== 'en')
	{
		$('.infotxt1').text(l[12]);
		$('.infotxt2').text(l[1060]);		
		$('.infotxt3').text(l[1061]);
		$('.infotxt4').text(l[1062]);
		$('.infotxt5').text(l[1063]);
		$('.infotxt6').text(l[1064]);
		$('.infotxt7').text(l[1065]);
		$('.infotxt8').text(l[1073]);
		$('.infotxt9').text(l[1368].replace('[X]',''));
		$('.infotxt10').text(l[1369].replace('[X]',''));		
		$('fmholder').addClass(lang);
	}	
	if (lang == 'fr') $('.st-small-red-txt.tb').text('To');
	
	$('.st-apps-icon').unbind('click');
	$('.st-apps-icon').bind('click',function(e)
	{
		var c = $(this).attr('class');
		if (c && c.indexOf('mobile') > -1) document.location.hash = 'mobile';
		else if (c && c.indexOf('sync') > -1) document.location.hash = 'sync';
		else if (c && c.indexOf('browser') > -1) document.location.hash = 'plugin';
		else if (c && c.indexOf('chat') > -1) document.location.hash = 'blog_22';
	});
}


function startpageMain()
{		
	$.infoscroll=false;
	if (page == 'download') $('.widget-block').hide();
	var el = '.st-mid-white-block';
	if (page == 'download') el = '.download-mid-white-block';	
	$(el).show();
	$('.top-head').show();
	var jsp = $('.st-main-block').data('jsp');
	if (jsp) jsp.destroy();
	$('.st-main-block').scrollTop($('.st-main-block').height());	
	$('.st-main-bottom.scroll.floating').hide();
	$.startscrolling=true;
	$('.st-main-block').animate({scrollTop:0}, '300', 'swing', function() 
	{ 
		var el = '.st-mid-white-block';
		if (page == 'download') el = '.download-mid-white-block';
	});
	setTimeout(function()
	{
		var el = '.st-mid-white-block';
		if (page == 'download') el = '.download-mid-white-block';
		$(el).removeClass('active');
		$.startscrolling=false;
		if (page == 'start') document.location.hash='#';
	},295);
}


function startpageJSP()
{
	if (page == 'download') $('.download-mid-white-block').hide();
	else $('.st-mid-white-block').hide();
	$('.top-head').hide();
	$('.st-main-block').scrollTop(0);	
	jScrollStart();	
}


function startscrollIgnore(t)
{
	if (!$.scrollIgnore) $.scrollIgnore=0;
	$.scrollIgnore++;
	setTimeout(function()
	{
		$.scrollIgnore--;			
	},t);
}