function init_affiliatemember()
{
	$('#rad1_div,#rad2_div,#rad3_div,#rad4_div,#rad5_div').unbind('click');
	$('#rad1_div,#rad2_div,#rad3_div,#rad4_div,#rad5_div').bind('click',function(e)
	{
		$('.new-bottom-pages.stats div.radioOn').attr('class','radioOff');
		$('.new-bottom-pages.stats input.radioOn').attr('class','radioOff');
		$(this).attr('class','radioOn');
		$(this).find('input').attr('class','radioOn');
		
		if ($(this).attr('id') == 'rad1_div') aff_loadstats(30);
		else if ($(this).attr('id') == 'rad2_div') aff_loadstats(90);
		else if ($(this).attr('id') == 'rad3_div') aff_loadstats(180);
		else if ($(this).attr('id') == 'rad4_div') aff_loadstats(365);
		else if ($(this).attr('id') == 'rad5_div') aff_loadstats(0);
	});
	
	$('#acc_rad1').bind('click', function(e) 
	{
		$('#aff_payment_paypal').show();
		$('#aff_payment_bank').hide();
		$('#acc_rad1_div')[0].className = 'radioOn';
		$('#acc_rad1')[0].className = 'radioOn';
		$('#acc_rad2_div')[0].className = 'radioOff';
		$('#acc_rad2')[0].className = 'radioOff';
	});	
	$('#acc_rad2').bind('click', function(e) 
	{
		$('#aff_payment_paypal').hide();
		$('#aff_payment_bank').show();
		$('#acc_rad1_div')[0].className = 'radioOff';
		$('#acc_rad1')[0].className = 'radioOff';
		$('#acc_rad2_div')[0].className = 'radioOn';
		$('#acc_rad2')[0].className = 'radioOn';
	});	
	
	$('.register-st2-button').unbind('click');
	$('.register-st2-button').bind('click', function(e) 
	{
		aff_updatepayment();
		return false;		
	});	
	
	$('#rad6_div,#rad7_div').unbind('click');
	$('#rad6_div,#rad7_div').bind('click',function(e)
	{
		$('.paypaloption,.nzbankoption').addClass('hidden');
		$('.new-bottom-pages.payment div.radioOn').attr('class','radioOff');
		$('.new-bottom-pages.payment input.radioOn').attr('class','radioOff');
		$(this).attr('class','radioOn');
		$(this).find('input').attr('class','radioOn');		
		if ($(this).attr('id') == 'rad6_div') $('.payment .paypaloption').removeClass('hidden');		
		else $('.payment .nzbankoption').removeClass('hidden');
		$('.main-scroll-block').jScrollPane({showArrows:true, arrowSize:5,animateScroll: true});
	});
	
	if (u_attr.aff_payment == 'bank')
	{
		$('#aff_bankaccount').val(u_attr.aff_bankaccount);
		$('#aff_benificiary').val(u_attr.aff_benificiary);
		$('#aff_bankname').val(u_attr.aff_bankname);
		$('#acc_rad7').click();
	}
	else
	{
		$('#aff_paypal').val(u_attr.aff_paypal);	
		$('#rad6_div').click();
	}
	
	loadingDialog.show();
	
	api_req([{a:'afg'}],
	{
		callback : function (json,params)
		{	
			if (json.r)
			{
				var pid;
				for (var p in json.r) pid=p;				
				$('#aff_id').html('Partner ID: ' + htmlentities(pid));
				$('#aff_url').html('https://mega.co.nz/#pro/' + htmlentities(pid));
				$('#aff_url').attr('href','https://mega.co.nz/#pro/' + htmlentities(pid));				
				loadingDialog.hide();
			}
		}
	});
}

function aff_updatepayment()
{
	u_attr.aff_payment = 'paypal';
	if ($('#rad7_div').attr('class').indexOf('radioOn') > -1) u_attr.aff_payment = 'bank';	
	if ((u_attr.aff_payment == 'paypal') && ($('#aff_paypal').val() == ''))
	{
		msgDialog('warninga',l[135],l[1268],false,function(e)
		{
			$('#aff_paypal').focus();
		});
		return false;	
	}
	else if (u_attr.aff_payment == 'bank' && $('#aff_benificiary').val() == '')
	{
		msgDialog('warninga',l[135],l[1269],false,function(e)
		{
			$('#aff_benificiary').focus();
		});
		return false;	
	}	
	else if (u_attr.aff_payment == 'bank' && $('#aff_bankname').val() == '')
	{
		msgDialog('warninga',l[135],l[1270],false,function(e)
		{
			$('#aff_bankname').focus();
		});
		return false;	
	}
	else if (u_attr.aff_payment == 'bank' && $('#aff_bankaccount').val() == '')
	{
		msgDialog('warninga',l[135],l[1271],false,function(e)
		{
			$('#aff_bankaccount').focus();
		});
		return false;	
	}
	loadingDialog.show();
	api_req([{a:'up',	
	'aff_payment' 		: base64urlencode(u_attr.aff_payment),
	'aff_paypal' 		: base64urlencode($('#aff_paypal').val()),
	'aff_bankaccount' 	: base64urlencode($('#aff_bankaccount').val()),
	'aff_bankname' 		: base64urlencode($('#aff_bankname').val()),
	'aff_benificiary' 	: base64urlencode($('#aff_benificiary').val())
	}],
	{ 
	  callback : function (json,params)
	  {	
		loadingDialog.hide();
	  }
	});
}



function aff_loadstats(days)
{
	console.log('load aff stats',days);	
	loadingDialog.show();	
	setTimeout(function()
	{
		$('.main-scroll-block').jScrollPane({showArrows:true, arrowSize:5,animateScroll: true});
		loadingDialog.hide();
	},250);
}