
var resellerapp_m='';
var resellerapp_p=[];
var resellerapp_step4=false;


var ra_c = [];
var ra_p = [];
var ra_pc = [];





function init_resellerapp()
{
	$('#resellerapp_name').bind('focus', function(e) 
	{
		if (e.target.value == l[559]) e.target.value='';
	});	
	$('#resellerapp_name').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[559];	
	});	
	$('#resellerapp_url').bind('focus', function(e) 
	{
		if (e.target.value == l[560]) e.target.value='';
	});	
	$('#resellerapp_url').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[560];	
	});
	$('#resellerapp_address').bind('focus', function(e) 
	{
		if (e.target.value == l[561]) e.target.value='';
	});	
	$('#resellerapp_address').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[561];	
	});	
	$('#resellerapp_postalcode').bind('focus', function(e) 
	{
		if (e.target.value == l[562]) e.target.value='';
	});	
	$('#resellerapp_postalcode').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[562];	
	});	
	$('#resellerapp_businessname').bind('focus', function(e) 
	{
		if (e.target.value == l[563]) e.target.value='';
	});	
	$('#resellerapp_businessname').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[563];	
	});
	$('#resellerapp_phone').bind('focus', function(e) 
	{
		if (e.target.value == l[564]) e.target.value='';
	});	
	$('#resellerapp_phone').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[564];	
	});
	$('#resellerapp_city').bind('focus', function(e) 
	{
		if (e.target.value == l[565]) e.target.value='';
	});	
	$('#resellerapp_city').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[565];
	});
	$('#reseller_checkbox').bind('click',function(e)
	{
		logincheckboxCheck('reseller_checkbox');
	});
	$('#reseller_step1nextbtn').bind('click',function(e)
	{
		resellerapp_step(2);
		return false;
	});
	$('#reseller_step2prevbtn').bind('click',function(e)
	{
		resellerapp_step(1);
		return false;
	});	
	$('#reseller_step2nextbtn').bind('click',function(e)
	{
		resellerapp_step(3);
		return false;
	});	
	$('#reseller_step3prevbtn').bind('click',function(e)
	{
		resellerapp_step(2);
		return false;
	});	
	$('#reseller_step3nextbtn').bind('click',function(e)
	{
		resellerapp_step(4);
		return false;
	});
	$('#reseller_step4prevbtn').bind('click',function(e)
	{
		resellerapp_step(3);
		return false;
	});	
	$('#reseller_step4nextbtn').bind('click',function(e)
	{
		resellerapp_complete();
		return false;
	});
	
	var r_c = '<div class="select-button"></div><span class="select-txt" id="reseller_country">' + l[568] + '</span>';	
	r_c += '<select id="reseller_country_option" name="custom">';        
	r_c += '<option value="-1" selected>' + l[568] + '</option>';
	
	var r_m = '';
	
	for (var c in isocountries)
	{
		r_c += '<option value="' + c + '">' + isocountries[c] +'</option>';
		resellerapp_m += '<div data-country="' + c + '" class="country" style="background-image:url(' + staticpath + 'images/flags/'+ c.toLowerCase() + '.png)">' + isocountries[c] +'</div>';
	}
	r_c += '</select>';
	
	document.getElementById('resellerapp_countries').innerHTML = r_c;	
	document.getElementById('ra_step2_select1').innerHTML = resellerapp_m;
	
	$('#reseller_country_option').bind('change', function(e) 
	{
		GetNextNode ('reseller_country');
	});
	
	api_req([{ a : 'uarm' }],
	{ 
		callback : function (json,params) 
		{ 			
			for (var i in json[0]) resellerapp_p.push(json[0][i]);			
			resellerapp_p.sort(ra_sort);
			var p = '';
			for (var i in resellerapp_p)
			{
				p += '<div data-paymentprovider="' + resellerapp_p[i][0] + '" class="country" style="background-image:url(' + staticpath + 'images/paymenticons/small/' + resellerapp_p[i][2] + ')" >' + resellerapp_p[i][1] + '</div>';
			}
			document.getElementById('ra_step3_select1').innerHTML = p;						
			resellerapp_p = json[0];
			resellerapp_init_select('');
		}
	});
}

function resellerapp_init_select(id)
{
	$(id + ".country").click(function() 
	{
	   var className =  $(this).attr('class');
	   if (className.indexOf('selected') == -1) 
	   {	
			$(this).addClass('selected');
			if (($(this).attr('data-country')) && ($(this).attr('data-paymentprovider'))) $('#ra_step4_' + $(this).attr('data-paymentprovider')).addClass('selected-country');
			else $('.selectors-block').addClass('selected-country');
	   }
	   else 
	   {
		   $(this).removeClass('selected');
		   var selected_items = $(this).parent().children('.selected');
		   if (!selected_items.first().attr('class')) 
		   {
			 $('.selectors-block').removeClass('selected-country');
		   }
	   }
	});

	$(id + ".reseller-add-button").click(function() 
	{
	   var id = $(this).closest('.selectors-block')[0].id;
	   var adding_items = $('#' + id + '_select1').children('.selected');
	   	 
	   var i=0;	   
	   while (i < adding_items.length)
	   {
		if (d) console.log('test');
		if (d) console.log(id);
	   
		 var country 			= adding_items[i].getAttribute('data-country');
				
		 var paymentprovider 	= adding_items[i].getAttribute('data-paymentprovider');
		 if ((id == 'ra_step2') && (country)) ra_c[country] = 1;		
		 else if ((id == 'ra_step3') && (paymentprovider)) ra_p[paymentprovider] = 1;		 
		 else
		 {
			if (!ra_pc[paymentprovider]) ra_pc[paymentprovider] = new Array();			
			ra_pc[paymentprovider][country] = 1;
		 }	   
		 i++;
	   }
	   if (adding_items.first().attr('class')) 
	   {
			 $('#' + id + '_select2').addClass('moved-items');
			 adding_items = adding_items.removeClass('selected');
			 $('#' + id + '_select2').append(adding_items); 
			 $('.selectors-block').removeClass('selected-country');
	   }
	});

	$(id + ".reseller-move-button").click(function() 
	{
	   var id = $(this).closest('.selectors-block')[0].id;
	   var moving_items = $('#' + id + '_select2').children('.selected');
	   
	    var i=0;
	    while (i < moving_items.length)
	    {
		  
		
		  var country 			= moving_items[i].getAttribute('data-country');
		  var paymentprovider 	= moving_items[i].getAttribute('data-paymentprovider');
		  
		  if (d) console.log(moving_items[i]);
		  if (d) console.log(id);
		  if (d) console.log(country);
		  
		  if ((id == 'ra_step2') && (country)) ra_c[country] = 0;		
		  else if ((id == 'ra_step3') && (paymentprovider)) ra_p[paymentprovider] = 0;		 
		  else ra_pc[paymentprovider][country] = 0;
		  	   
		  i++;
	   }
	   
	   if (moving_items.first().attr('class')) 
	   {
		   moving_items = moving_items.removeClass('selected');
		   $('#' + id + '_select1').append(moving_items); 
		   var moved_elements = $('#' + id + '_select2').children('.country');
		   if (!moved_elements.first().attr('class')) 
		   {
			   $('#' + id + '_select2').removeClass('moved-items'); 
		   }
		   $('.selectors-block').removeClass('selected-country');
	   }
	});
}





function resellerapp_resetrender()
{
	
	
	$('.resellers-step-bg').removeClass('step1');
	$('.resellers-step-bg').removeClass('step2');
	$('.resellers-step-bg').removeClass('step3');
	$('.resellers-step-bg').removeClass('step4');
}



function resellerapp_step(step)
{
	var steps = [];
	steps[0] = document.getElementById('resellerapp_step1');
	steps[1] = document.getElementById('resellerapp_step2');
	steps[2] = document.getElementById('resellerapp_step3');
	steps[3] = document.getElementById('resellerapp_step4');

	if (step == '1')
	{
		resellerapp_resetrender()
		steps[0].style.display = '';
		steps[1].style.display = 'none';
		steps[2].style.display = 'none';
		steps[3].style.display = 'none';
		$('.resellers-step-bg').addClass('step1');		
	}
	else if (step == '2')
	{				
		if ($('#resellerapp_name')[0].value == l[559])
		{
			alert(l[581]);
			return false;
		}
		else if ($('#resellerapp_url')[0].value == l[560])
		{
			alert(l[582]);
			return false;
		}
		else if ($('#resellerapp_address')[0].value == l[561])
		{
			alert(l[583]);
			return false;
		}
		else if ($('#resellerapp_postalcode')[0].value == l[562])
		{
			alert(l[584]);
			return false;
		}
		else if ($('#resellerapp_businessname')[0].value == l[563])
		{
			alert(l[585]);
			return false;
		}
		else if ($('#resellerapp_phone')[0].value == l[564])
		{
			alert(l[586]);
			return false;
		}
		else if ($('#resellerapp_city')[0].value == l[565])
		{
			alert(l[587]);
			return false;
		}
		else if ($('#reseller_country_option')[0].value =='-1')
		{
			alert(l[588]);
			return false;			
		}
		else if (!$('#reseller_checkbox')[0].checked)
		{
			alert(l[589]);
			return false;
		}
		resellerapp_resetrender()
		steps[0].style.display = 'none';
		steps[1].style.display = '';
		steps[2].style.display = 'none';
		steps[3].style.display = 'none';
		$('.resellers-step-bg').addClass('step2');				
	}
	else if (step == '3')
	{
		i=0;
		for(var a in ra_c) i++;		
		if (i == 0)
		{
			alert(l[590]);
			return false;
		}
	
		resellerapp_resetrender()
		steps[0].style.display = 'none';
		steps[1].style.display = 'none';
		steps[2].style.display = '';
		steps[3].style.display = 'none';
		$('.resellers-step-bg').addClass('step3');
	}
	else if (step == '4')
	{
	
		i=0;
		for(var a in ra_p) i++;		
		if (i == 0)
		{
			alert(l[591]);
			return false;
		}
	
		resellerapp_resetrender()
		var step4html = '';
		resellerapp_p.sort(ra_sort);		
		var ras4c = [];
		for (var c in ra_c) ras4c.push(c);				
		ras4c.sort();		
		
		
		for (var i in resellerapp_p)
		{		
			
			if (ra_p[resellerapp_p[i][0]])
			{			
				step4html += '<div style="text-align:left;"><img src="' + staticpath + 'images/paymenticons/medium/' + resellerapp_p[i][2] + '"></div>';
				step4html += '<div class="selectors-block" id="ra_step4_' + resellerapp_p[i][0] + '"><div class="notice-left-block"><div class="reseller-select" id="ra_step4_' + resellerapp_p[i][0] + '_select1">';
				
				var select2 = '';
				
				for (var j in ras4c)
				{
					
					var pp = '<div data-paymentprovider="' + resellerapp_p[i][0] + '" data-country="' + ras4c[j] + '" class="country" style="background-image:url(images/flags/'+ ras4c[j].toLowerCase() + '.png)">' + isocountries[ras4c[j]] +'</div>';

					if ((ra_pc[resellerapp_p[i][0]]) && (ra_pc[resellerapp_p[i][0]][ras4c[j]])) select2 += pp;					
					else step4html += pp;
				}
				
				if (select2 == '') select2 = '<span class="reseller-map">Select markets for ' + resellerapp_p[i][1] + '</span>';
				
				step4html += '</div></div><div class="notice-right-block"><div class="reseller-second-select" id="ra_step4_' + resellerapp_p[i][0] + '_select2">' + select2 + '</div></div><div class="res-buttons-block"><a class="reseller-add-button"></a><a class="reseller-move-button"></a><div class="clear"></div></div></div></div>';
			}
		}		
		document.getElementById('resellerapp_step4_select').innerHTML = step4html;
		resellerapp_init_select('#resellerapp_step4_select ');		
		steps[0].style.display = 'none';
		steps[1].style.display = 'none';
		steps[2].style.display = 'none';
		steps[3].style.display = '';
		$('.resellers-step-bg').addClass('step4');
	}
}


function resellerapp_complete()
{
	if (d) console.log(resellerapp_complete);
	
	for (var i in ra_p) 
	{ 
		if (!ra_pc[i])
		{
			alert(l[592]);
			return false;			
		}
	}

	var cc = [];
	var pm = [];
	for (var pp in ra_pc)
	{
		var i =0;		
		var pm_el = [];			
		pm_el[0] = pp;		
		for (c in ra_pc[pp])
		{		
			i++;		
			if ((ra_c[c]) && (ra_p[pp]))
			{
				if (typeof pm_el[1] == 'undefined') pm_el[1] = c;
				else pm_el[1] += ' ' + c;								
			}						
		}			
		pm.push(pm_el);	
	}		
	for (c in ra_pc[pp]) cc.push(c);	
	
	loadingDialog.show();	
	api_req([{ a : 'uarp', n: document.getElementById('resellerapp_name').value, u: document.getElementById('resellerapp_url').value, cc: cc, pm: pm },{a: 'up', address: document.getElementById('resellerapp_address').value, postalcode: document.getElementById('resellerapp_postalcode').value, businessname: document.getElementById('resellerapp_businessname').value, phone: document.getElementById('resellerapp_phone').value,city: document.getElementById('resellerapp_city').value, country: document.getElementById('reseller_country_option').value }],
	{ 
		callback : function (json,params) 
		{ 	
			if (d) console.log(json);
		
			loadingDialog.hide();		
			done_text1 = l[593];
			done_text2 = l[594];
			parsepage(pages['done']);		
			init_done();
		}
	});
}



function ra_sort(a,b)
{
	a =a[1].toLowerCase() 
	b =b[1].toLowerCase();
	if (a < b) return -1;						
	else return 1;			
}


