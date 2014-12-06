function init_affiliatesignup()
{
	$('#rad1_div,#rad2_div').unbind('click');
	$('#rad1_div,#rad2_div').bind('click',function(e)
	{
		$('.new-affiliate-gray div.radioOn').attr('class','radioOff');
		$('.new-affiliate-gray input.radioOn').attr('class','radioOff');
		$('.paypaloption,.nzbankoption').addClass('hidden');
		$(this).attr('class','radioOn');
		$(this).find('input').attr('class','radioOn');
		if ($(this).attr('id') == 'rad1_div') $('.new-affiliate-small-bl.left.paypaloption').removeClass('hidden');
		else $('.new-affiliate-small-bl.left.nzbankoption').removeClass('hidden');
		$('.main-scroll-block').jScrollPane({showArrows:true, arrowSize:5,animateScroll: true});
	});

	var i = new Date().getFullYear()-17,html='';
	while (i >= 1900)
	{
		html += '<option value="' + i + '">' + i + '</option>';
		i--;
	}
	$('.select.year select').html(html);
	var i=1,html='';
	while (i < 32)
	{
		html += '<option value="' + i + '">' + i + '</option>';
		i++;
	}
	$('.select.day select').html(html);
	var i=1,html='';
	while (i < 13)
	{
		html += '<option value="' + i + '">' + i + '</option>';
		i++;
	}
	$('.select.month select').html(html);

	var html='';
	for(country in isocountries) html += '<option value="' + country + '">' + isocountries[country] + '</option>';
	$('#aff_country').html(html);

	$('.affiliate-input-block.select select').unbind('change');
	$('.affiliate-input-block.select select').bind('change',function(e)
	{
		var val = $(this).val();
		if ($(this).attr('id') == 'aff_country') val = isocountries[val];
		$(this).parent().find('.affiliate-select-txt').text(val);
	});

	$('.new-registration-checkbox a').unbind('click');
	$('.new-registration-checkbox a').bind('click',function(e)
	{
		$.termsAgree = function()
		{
			$('.new-registration-checkbox .checkboxOff').attr('class','checkboxOn');
		};
		termsDialog(false,'affiliateterms');
		return false;
	});

	$('#aff_terms').unbind('click');
	$('#aff_terms').bind('click',function(e)
	{
		if ($(this).attr('class').indexOf('checkboxOff') > -1)
		{
			$(this).attr('class','checkboxOn');
			$(this).find('input').attr('class','checkboxOn');
		}
		else
		{
			$(this).attr('class','checkboxOff');
			$(this).find('input').attr('class','checkboxOff');
		}
	});

	$('#aff_submit').unbind('click');
	$('#aff_submit').bind('click',function(e)
	{
		aff_signup();
	});
}

function aff_signup()
{
	function aff_uenc(s)
	{
		try {
			return base64urlencode(to8($(s).val()));
		} catch(e) {
			return '';
		}
	}
	var aff_payment = 'paypal';
	if ($('#rad2').attr('class').indexOf('radioOn') > -1) aff_payment = 'bank';

	if ($('#aff_day').val() == 0 && $('#aff_month').val() == 0)
	{
		msgDialog('warninga',l[135],l[1261]);
		return false;
	}
	else if ($('#aff_city').val() == l[927])
	{
		msgDialog('warninga',l[135],l[1262]);
		return false;
	}
	else if ($('#aff_state').val() == l[934])
	{
		msgDialog('warninga',l[135],l[1263]);
		return false;
	}
	else if ($('#aff_zip').val() == l[934])
	{
		msgDialog('warninga',l[135],l[1264]);
		return false;
	}
	else if ($('#aff_phone').val() == 0)
	{
		msgDialog('warninga',l[135],l[1265]);
		return false;
	}
	else if ($('#aff_info').val() == l[938])
	{
		msgDialog('warninga',l[135],l[1266]);
		return false;
	}
	else if ($('#aff_terms').attr('class').indexOf('checkboxOff') > -1)
	{
		msgDialog('warninga',l[135],l[1267]);
		return false;
	}
	loadingDialog.show();
	u_attr.aff_payment = aff_payment;

	api_req({a:'up',
	'aff' 				: base64urlencode('1'),
	'aff_birthday' 		: aff_uenc("#aff_day"),
	'aff_birthmonth'	: aff_uenc("#aff_month"),
	'aff_birthyear' 	: aff_uenc("#aff_year"),
	'aff_name' 			: aff_uenc("#aff_name"),
	'aff_company' 		: aff_uenc("#aff_company"),
	'aff_city' 			: aff_uenc("#aff_city"),
	'aff_address' 		: aff_uenc("#aff_address"),
	'aff_city' 			: aff_uenc("#aff_city"),
	'aff_province'  	: aff_uenc("#aff_state"),
	'aff_zip' 			: aff_uenc("#aff_zip"),
	'aff_phone'			: aff_uenc("#aff_phone"),
	'aff_country' 		: aff_uenc("#aff_country"),
	'aff_payment' 		: base64urlencode(aff_payment),
	'aff_paypal' 		: aff_uenc("#aff_paypal"),
	'aff_bankaccount' 	: aff_uenc("#aff_bankaccount"),
	'aff_bankname' 		: aff_uenc("#aff_bankname"),
	'aff_benificiary' 	: aff_uenc("#aff_benificiary"),
	'aff_info' 			: aff_uenc("#aff_info")
	},
	{
	  callback : function ()
	  {
		api_req({a:'afc'},
		{
			callback : function (res)
			{
				loadingDialog.hide();
				if (typeof res == 'number') alert(l[200]);
				else
				{
					u_attr.aff=1;
					u_attr.aff_paypal = $('#aff_paypal').val();
					u_attr.aff_bankaccount = $('#aff_bankaccount').val();
					u_attr.aff_bankname = $('#aff_bankname').val();
					u_attr.aff_benificiary = $('#aff_benificiary').val();
					document.location.hash = 'affiliates';
				}
			}
		});
	  }
	});
}
