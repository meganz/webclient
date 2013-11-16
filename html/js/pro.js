var pro_package;
var pro_packs = [];
var pro_balance = 0;
var pro_paymentmethod;
var pro_m;
var pro_usebalance=false;

function init_pro()
{
	if (u_type == 3)
	{
		api_req(
		[{ a: 'uq',pro: 1,}],
		{ 
			callback : function (json,params) 
			{ 
				if (json[0] && json[0]['balance'] && json[0]['balance'][0]) pro_balance = json[0]['balance'][0][0];											
			}
		});	
	}	
	if (document.location.hash.indexOf('#pro/') > -1)
	{
		localStorage.affid = document.location.hash.replace('#pro/','');
		localStorage.affts = new Date().getTime();	
	}
	$('body').addClass('pro');
	if (lang != 'en') $('body').addClass(lang);	
	json = JSON.parse(pro_json);				
	for (var i in json[0])
	{
		if      ((json[0][i][2] == '500') && (json[0][i][5] == '9.99')) 	pro_packs['pro1_month'] = json[0][i];
		else if ((json[0][i][2] == '500') && (json[0][i][5] == '99.99')) 	pro_packs['pro1_year'] 	= json[0][i];
		else if ((json[0][i][2] == '2048') && (json[0][i][5] == '19.99')) 	pro_packs['pro2_month'] = json[0][i];
		else if ((json[0][i][2] == '2048') && (json[0][i][5] == '199.99')) 	pro_packs['pro2_year'] 	= json[0][i];
		else if ((json[0][i][2] == '4096') && (json[0][i][5] == '29.99')) 	pro_packs['pro3_month'] = json[0][i];
		else if ((json[0][i][2] == '4096') && (json[0][i][5] == '299.99')) 	pro_packs['pro3_year'] 	= json[0][i];		
	}	
	if (!m)
	{
	   if (lang == 'fr') $('.reg-st3-big-txt').each(function(e,o){$(o).html($(o).html().replace('GB','Go').replace('TB','To'));});
	   if (lang !== 'en') $('.reg-st3-save-txt').addClass(lang);	   
	   $('.reg-st3-save-icon').removeClass('hidden');	   
	   $('.reg-checkbox :checkbox').iphoneStyle({resizeContainer:false,resizeHandle:false,onChange:function(elem, data)
	   {
	     if(data)
		 {
			$('#month').addClass('red');
	        $('#year').removeClass('red');
			$('.reg-st3-save-icon').addClass('hidden');
			$('.pro-new-year').addClass('hidden');
			$('.pro-new-month').removeClass('hidden');			
			$('.pro1 .reg-st3-bott-title.right').html('9<span>.99 &euro;</span>');
			$('.pro2 .reg-st3-bott-title.right').html('19<span>.99 &euro;</span>');
			$('.pro3 .reg-st3-bott-title.right').html('29<span>.99 &euro;</span>');
			$('.pro1 .reg-st3-bandwidth .reg-st3-big-txt').html('1 <span>TB</span>');
			$('.pro2 .reg-st3-bandwidth .reg-st3-big-txt').html('4 <span>TB</span>');
			$('.pro3 .reg-st3-bandwidth .reg-st3-big-txt').html('8 <span>TB</span>');
	     } 
		 else 
		 {
			$('#month').removeClass('red');
	        $('#year').addClass('red');
			$('.reg-st3-save-icon').removeClass('hidden');
			$('.pro-new-year').removeClass('hidden');
			$('.pro-new-month').addClass('hidden');			
			$('.pro1 .reg-st3-bott-title.right').html('99<span>.99 &euro;</span>');
			$('.pro2 .reg-st3-bott-title.right').html('199<span>.99 &euro;</span>');
			$('.pro3 .reg-st3-bott-title.right').html('299<span>.99 &euro;</span>');			
			$('.pro1 .reg-st3-bandwidth .reg-st3-big-txt').html('12 <span>TB</span>');
			$('.pro2 .reg-st3-bandwidth .reg-st3-big-txt').html('48 <span>TB</span>');
			$('.pro3 .reg-st3-bandwidth .reg-st3-big-txt').html('96 <span>TB</span>');			
		 }
		 if (lang == 'fr') $('.reg-st3-big-txt').each(function(e,o){$(o).html($(o).html().replace('GB','Go').replace('TB','To'));});
		}
	   });
	   
	    $('.reg-st3-membership-bl').unbind('click');
		$('.reg-st3-membership-bl').bind('click',function(e)
		{		
			$('.reg-st3-membership-bl').removeClass('selected');
			$(this).addClass('selected');		
		});
		
		 $('.reg-st3-membership-bl').unbind('dblclick');
		$('.reg-st3-membership-bl').bind('dblclick',function(e)
		{		
			$('.reg-st3-membership-bl').removeClass('selected');
			$(this).addClass('selected');
			pro_proceed(e);
		});
		$('.register-st2-button-arrow').unbind('click');
		$('.register-st2-button-arrow').bind('click',function(e)
		{
			pro_proceed(e);
		});		
		$('.pro-bottom-button').unbind('click');
		$('.pro-bottom-button').bind('click',function(e)
		{
			document.location.hash = 'contact';
		});
	}
}

function pro_proceed(e)
{
	var c = $('.reg-st3-membership-bl.selected').attr('class');
	if (c.indexOf('free') > -1)
	{
		if (page == 'fm') document.location.hash = '#start';
		else document.location.hash = '#fm';
		return false;
	}
	else if(c.indexOf('pro1') > -1 && $('#reg-checkbox').attr('checked')) pro_package = 'pro1_month';
	else if(c.indexOf('pro1') > -1) pro_package = 'pro1_year';
	else if(c.indexOf('pro2') > -1 && $('#reg-checkbox').attr('checked')) pro_package = 'pro2_month';		
	else if(c.indexOf('pro2') > -1) pro_package = 'pro2_year';
	else if(c.indexOf('pro3') > -1 && $('#reg-checkbox').attr('checked')) pro_package = 'pro3_month';
	else if(c.indexOf('pro3') > -1) pro_package = 'pro3_year';
	
	if (pro_package) pro_continue();
}

function pro_continue()
{
	if (u_type === false)
	{
		loadingDialog.show();
		u_checklogin({ checkloginresult: function(u_ctx,r) 
		{ 
			pro_pay();
		}},true);
	}
	else if (parseFloat(pro_balance) >= parseFloat(pro_packs[pro_package][5]))
	{
		msgDialog('confirmation','Prepaid balance','Do you want to use your prepaid balance to proceed?',false,function(e)
		{
			if(e) pro_paymentmethod = 'pro_prepaid';
			pro_pay();		
		});
	}
	else  pro_pay();	
}

function pro_pay()
{
	var aff=0;	
	if (localStorage.affid && localStorage.affts > new Date().getTime()-86400000) aff = localStorage.affid;	
	loadingDialog.show();
	api_req([{ a : 'uts', it: 0, si: pro_packs[pro_package][0], p: pro_packs[pro_package][5], c: pro_packs[pro_package][6], aff: aff}],
	{
		callback : function (json,params) 
		{ 
			if ((typeof json[0] == 'number') && (json[0] < 0))
			{
				loadingDialog.hide();
				alert(l[200]);			
			}
			else
			{
				if ((pro_paymentmethod == 'pro_voucher') || (pro_paymentmethod == 'pro_prepaid')) pro_m=0;
				else pro_m=1;				
				api_req([{ a : 'utc', s: [json[0]], m: pro_m}],
				{ 
					callback : function (json,params) 
					{ 			
						if (pro_paymentmethod == 'pro_prepaid')
						{
							loadingDialog.hide();
							if ((typeof json[0] == 'number') && (json[0] < 0))
							{
								if (json[0] == 502) alert(l[514]);
								else alert(l[200]);
							}
							else
							{
								if (M.account) M.account.lastupdate=0;
								document.location.hash = 'account';								
							}						
						}
						else
						{					
							var ppurl = 'https://www.paypal.com/cgi-bin/webscr';
							if ((json[0]) && (json[0]['EUR']))
							{	
								var j = 0;
								for (var i in json[0]['EUR'])
								{
									if (j == 0) ppurl += '?';
									else ppurl += '&';
									ppurl += i + '=' + encodeURIComponent(json[0]['EUR'][i]);	
									j++;
								}
								if (d) console.log(ppurl);
								if (ul_uploading || downloading)
								{
									loadingDialog.hide();
									paypalDialog(ppurl);							
								}
								else document.location = ppurl;
							}			
							else
							{
								loadingDialog.hide();
								alert(l[200]);							
							}
						}
					}
				});
			}
		}
	});	
}