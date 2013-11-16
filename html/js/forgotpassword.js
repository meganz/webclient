function fp_request()
{
  if ($('#fp_email')[0].value == l[195])
  {
	 alert(l[197]);
  }
  else if (checkMail($('#fp_email')[0].value))
  {
	alert(l[141]);
	$('#fp_email')[0].value=l[195];	
  }
  else
  {
	  loadingDialog.show();	  
	  api_req([{ a : 'upkr', m: $('#fp_email')[0].value }],
	  { 
		callback : function (json,params) 
		{ 
			loadingDialog.hide();
			if (json[0] == ENOENT)
			{
				$('#fp_email')[0].value=l[195];
				alert(l[733]);
			}
			else if ((typeof json[0] == 'number') && (json[0] < 0))
			{
				alert(l[200]);			
			}
			else
			{
				done_text1 = l[734];
				done_text2 = l[735];
				parsepage(pages['done']);
				init_done();			
			}
			console.log(json);
		}
	  });
  }
}

function fp_init(p)
{
	$('#fp_email').bind('focus', function(e) 
	{
		if (e.target.value == l[195]) e.target.value='';
	});
	$('#fp_email').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[195];	
	});
	
	
	
	$('#fp_password1').bind('focus', function(e) 
	{
		if (e.target.value == l[717]) e.target.value='';
	});
	$('#fp_password1').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[717];	
	});
	$('#fp_password1').bind('keyup', function(e) 
	{
		register_checkpassword(e.target.value);
	});
	
	$('#fp_password2').bind('focus', function(e) 
	{
		if (e.target.value == l[718]) e.target.value='';
	});
	$('#fp_password2').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[718];	
	});
	
	
	if (p)
	{
		$('#forgotpassword_request')[0].style.display='none';
		$('#forgotpassword_reset')[0].style.display='';	
		$('#fp_resetbtn').bind('click', function(e) 
		{
			fp_reset();
			return false;
		});
	}
	else
	{
		$('#forgotpassword_request')[0].style.display='';
		$('#forgotpassword_reset')[0].style.display='none';	
		$('#fp_requestbtn').bind('click', function(e) 
		{
			fp_request();
			return false;
		});
	}
}

function fp_reset()
{
	if ($('#fp_password1')[0].value == l[717])
	{
		alert(l[720]);	
	}
	else if ($('#fp_password1')[0].value !== $('#fp_password2')[0].value)
	{
		alert(l[715]);
		$('#fp_password1')[0].value = l[717];
		$('#fp_password2')[0].value = l[718];
		$('#fp_password1')[0].type = 'text';
		$('#fp_password2')[0].type = 'text';
		$('#register_pwstatus')[0].className = 'register-pass-status-block';
	}
	else
	{
		api_create_u_k();		
		var ssc = Array(4);
		for (i = 4; i--; ) ssc[i] = rand(0x100000000);			
		var pw_aes = new sjcl.cipher.aes(prepare_key_pw($('#fp_password1')[0].value));	
		loadingDialog.show();	  
		api_req([{ a : 'up', uk: resetpwcode, k: a32_to_base64(encrypt_key(pw_aes,u_k)), uh:  stringhash(resetpwemail.toLowerCase(),pw_aes), ts: base64urlencode(a32_to_str(ssc) + a32_to_str(encrypt_key(new sjcl.cipher.aes(u_k),ssc)))}],
		{ 
			callback : function (json,params) 
			{ 			
				if (json[0] == 0)
				{
					login_txt = l[740];
					document.location.hash = 'login';
					document.title = 'MEGA';
				}
				else
				{
					alert(l[200]);			
				}				
				console.log(json);			
				loadingDialog.hide();
			}
		});
	}
}