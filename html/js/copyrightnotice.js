
function cn_UI()
{
	$('#cn_urls .contenturl').unbind('click');
	$('#cn_urls .contenturl').bind('click',function(e)
	{
		if ($(this).val() == 'http://') $(this).select();	
	});
}

function init_cn()
{
	$('.addurlbtn').unbind('click');
	$('.addurlbtn').bind('click',function(e)
	{
		$('#cn_urls').append('<div class="new-affiliate-label"><div class="new-affiliate-star"></div>' + l[641] + '</div><div class="clear"></div><div class="affiliate-input-block"> <input type="text" class="contenturl" value="https://"> </div><div class="new-affiliate-label"><div class="new-affiliate-star"></div>' + l[648] + '</div><div class="clear"></div><div class="affiliate-input-block"> <input type="text" class="copyrightwork" value=""></div>');		
		mainScroll();		
		cn_UI();	
	});	
	cn_UI();	
	$('.step2btn').unbind('click');
	$('.step2btn').bind('click',function(e)
	{
		if ($('.select.content').attr('class').indexOf('selected') == -1) msgDialog('warninga',l[135],l[657]);		
		else if ($('.select.type').attr('class').indexOf('selected') == -1) msgDialog('warninga',l[135],l[658]);				
		else
		{			
			var copyrightwork = $('.copyrightwork');
			var proceed=false;			
			$('.contenturl').each(function(i,e)
			{
				proceed=true;						
				if ($(e).val() !== 'https://' && $(copyrightwork[i]).val() == '')
				{
					proceed=false;
					msgDialog('warninga',l[135],l[660]);
					return false;
				}				
				if ($(e).val() == 'https://' || $(copyrightwork[i]).val() == '')
				{				
					proceed=false;
					msgDialog('warninga',l[135],l[659]);
					return false;				
				}
			});
			if (proceed && !$('.cn_check1 .checkinput').attr('checked'))
			{
				msgDialog('warninga',l[135],l[665]);				
			}
			else if (proceed)
			{
				$('.cn.step1').addClass('hidden');
				$('.cn.step2').removeClass('hidden');
			}
		}
	});	
	$('.backbtn').unbind('click');
	$('.backbtn').bind('click',function(e)
	{
		$('.cn.step1').removeClass('hidden');
		$('.cn.step2').addClass('hidden');		
	});		
	$('.cn_check1,.cn_check2,.cn_check3').unbind('click');
	$('.cn_check1,.cn_check2,.cn_check3').bind('click',function(e)
	{
		var c = $(e.target).attr('class');
		if (c && c.indexOf('checkinput') == -1)
		{
			if ($(this).find('.checkinput').attr('checked')) $(this).find('.checkinput').attr('checked',false);
			else $(this).find('.checkinput').attr('checked',true);
		}		
		$(this).find('.checkdiv,.checkinput').removeClass('checkboxOn');
		$(this).find('.checkdiv,.checkinput').removeClass('checkboxOff');
		if ($(this).find('input').attr('checked')) $(this).find('.checkdiv,.checkinput').addClass('checkboxOn');		
		else $(this).find('.checkdiv,.checkinput').addClass('checkboxOff');			
	});
	
	$('.select select').unbind('change');
	$('.select select').bind('change',function(e)
	{
		var c = $(this).attr('class');
		if (c && c.indexOf('type') > -1 && $(this).val() == 4)
		{
			msgDialog('info',l[701],l[700].replace('[A1]','<a href="mailto:copyright@mega.co.nz" class="red">').replace('[/A1]','</A>').replace('[A2]','<a href="#copyright" class="red">').replace('[/A2]','</A>'));
			$(this).val(0);
			$(this).parent().find('.affiliate-select-txt').text(l[1278]);
		}	
		else if ($(this).val() != 0)
		{
			$(this).parent().addClass('selected');
			$(this).parent().find('.affiliate-select-txt').text($(this).find('option[value=\''+$(this).val()+'\']').text());
		}
	});
	$('.signbtn').unbind('click');
	$('.signbtn').bind('click',function(e)
	{
		if ($('input.copyrightowner').val() == '') msgDialog('warninga',l[135],l[661],false,function(){$('input.copyrightowner').focus()});		
		else if ($('input.agent').val() == '') msgDialog('warninga',l[135],l[662],false,function(){$('input.agent').focus()});		
		else if ($('input.email').val() == '') msgDialog('warninga',l[135],l[663],false,function(){$('input.email').focus()});		
		else if ($('input.city').val() == '') msgDialog('warninga',l[135],l[1262],false,function(){$('input.city').focus()});		
		else if ($('.select.country').attr('class').indexOf('selected') == -1) msgDialog('warninga',l[135],l[568]);		
		else if (!$('.cn_check2 .checkinput').attr('checked')) msgDialog('warninga',l[135],l[666]);		
		else if (!$('.cn_check3 .checkinput').attr('checked')) msgDialog('warninga',l[135],l[667]);		
		else
		{
			var cn_post_urls = [];
			var cn_post_works = [];		
			$('.contenturl').each(function(a,b)
			{
				cn_post_urls.push(b.value);
			});		
			$('.copyrightwork').each(function(a,b)
			{
				cn_post_works.push(b.value);
			});
			var cn_works_json = JSON.stringify([cn_post_urls,cn_post_works]);			
			loadingDialog.show();
			api_req([{ a : 'cn' , infr_type: $('.select.content select').val(), takedown_type: $('.select.type select').val(), works: cn_works_json, owner: $('input.copyrightowner').val(), jobtitle: $('input.jobtitle').val(), email: $('input.email').val(), fax: $('input.fax').val(), city: $('input.city').val(), postalcode: $('input.zip').val(), name: $('input.agent').val(), company: $('input.company').val(), phone: $('input.phone').val(), address: $('input.address').val(), province: $('input.province').val(), country: $('.select.country select').val()}],
			{ 
				callback : function (json,params) 
				{ 	
					console.log(json);
					loadingDialog.hide();					
					msgDialog('info',l[1287],l[1288],false,function(e)
					{
						document.location.hash = 'copyright';					
					});
				}
			});		
		}
	});	
	var html='<OPTION value="0"></OPTION>';
	for(country in isocountries) html += '<option value="' + country + '">' + isocountries[country] + '</option>';	
	$('.select.country select').html(html);
}