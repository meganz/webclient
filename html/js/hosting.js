function hosting_submit()
{
	loadingDialog.show();	
	api_req([{ a : 'dd', t: 'hosting', company: document.getElementById('hosting_company').value, website: document.getElementById('hosting_website').value, email: document.getElementById('hosting_email').value, country: document.getElementById('hosting_country').value, servers: document.getElementById('hosting_servers').value, offer: document.getElementById('hosting_offer').value }],
	{ 
		callback : function (json,params) 
		{ 	
			loadingDialog.hide();
			done_text1 = l[668];
			done_text2 = l[687];
			parsepage(pages['done']);
			init_done();
		}
	});
}



function init_hosting()
{
	$('#hosting_company').bind('focus', function(e) 
	{
		if (e.target.value == l[613]) e.target.value='';
	});	
	$('#hosting_company').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[613];	
	});	
	$('#hosting_website').bind('focus', function(e) 
	{
		if (e.target.value == l[614]) e.target.value='';
	});	
	$('#hosting_website').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[614];	
	});
	$('#hosting_email').bind('focus', function(e) 
	{
		if (e.target.value == l[95]) e.target.value='';
	});	
	$('#hosting_email').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[95];	
	});	
	$('#hosting_country').bind('focus', function(e) 
	{
		if (e.target.value == l[481]) e.target.value='';
	});	
	$('#hosting_country').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[481];	
	});
	$('#hosting_servers').bind('focus', function(e) 
	{
		if (e.target.value == l[615]) e.target.value='';
	});	
	$('#hosting_servers').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[615];	
	});
	$('#hosting_offer').bind('focus', function(e) 
	{
		if (e.target.value == l[616]) e.target.value='';
	});	
	$('#hosting_offer').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[616];	
	});
	$('.register-button').bind('click', function(e) 
	{
		hosting_submit();
		return false;
	});
	
	
}


