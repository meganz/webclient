var login_txt=false;

function dologin()
{
	if ((document.getElementById('login_email').value == '') || (document.getElementById('login_email').value == l[195]))
	{
		alert(l[197]);	
	}
	else if (checkMail(document.getElementById('login_email').value))
	{
		alert(l[198]);	
	}
	else if (document.getElementById('login_password').value == '')
	{
		alert(l[199]);	
	}
	else
	{
		if (m) loadingDialog.show();
		else document.getElementById('overlay').style.display='';
		
		if (confirmok)
		{
			if (u_signupenck)
			{
				if (checksignuppw(document.getElementById('login_password').value))
				{
					var ctx = 
					{
						callback: function(res,ctx)
						{	
							if (m) loadingDialog.hide();
							else document.getElementById('overlay').style.display='none';						
							
							if (res[0] == EACCESS)
							{
								alert(l[732]);
							}
							else if (typeof res[0] == 'string')
							{
								if (u_type)
								{									
									if (login_next) document.location.hash = login_next;
									else if (page !== 'login') init_page();
									else document.location.hash = 'fm';
									login_next=false;
									document.title = 'MEGA';
								}
								else postlogin();
							}							
							else
							{
								alert(l[200]);
							}
						}
					}										
					if (d) console.log('u_handle');
					if (d) console.log(u_handle);					
					var passwordaes = new sjcl.cipher.aes(prepare_key_pw(document.getElementById('login_password').value));					
					api_updateuser(ctx,
					{
						uh : stringhash(document.getElementById('login_email').value.toLowerCase(),passwordaes),
						c: confirmcode					
					})
				}
				else
				{	
					alert(l[201]);		
					if (m) loadingDialog.hide();
					else document.getElementById('overlay').style.display='none';
					document.getElementById('login_password').value ='';				
				}
			}
		}
		else
		{
			postlogin();
		}
	}
}


function doConfirm(email,password,callback)
{
	if (u_signupenck)
	{
		if (checksignuppw(password))
		{										
			if (d) console.log('u_handle');
			if (d) console.log(u_handle);		
			var passwordaes = new sjcl.cipher.aes(prepare_key_pw(password));					
			api_updateuser(
			{
				callback2: callback,
				callback: function(res,ctx)
				{	
					loadingDialog.hide();					
					if (res[0] == EACCESS)
					{
						if (m) alert(l[732]);
						else msgDialog('warninga',l[135],l[732]);
					}
					else if (typeof res[0] == 'string')
					{
						confirmok=false;
						if (ctx.callback2) ctx.callback2();
					}							
					else
					{
						alert(l[200]);
					}
				}
			},
			{
				uh : stringhash(email.toLowerCase(),passwordaes),
				c: confirmcode					
			})
		}
		else
		{
			loadingDialog.hide();
			if (m)
			{
				loadingDialog.hide();
				alert(l[201]);
			}
			else
			{
				$('#login-password2').val('');
				$('.login-register-input.password').addClass('incorrect');
				msgDialog('warninga',l[135],l[201]);		
			}
		}
	}
}

function postLogin(email,password,remember,callback)
{
	var ctx = 
	{
		callback2:callback,
		checkloginresult: function(ctx,r)
		{
			if (ctx.callback2) ctx.callback2(r);
		}
	}	
	var passwordaes = new sjcl.cipher.aes(prepare_key_pw(password));										
	var uh = stringhash(email.toLowerCase(),passwordaes);	
	u_login(ctx,email,password,uh,remember);
}


function pagelogin()
{
	var e = $('#login-name2').val();
	if (e == '' || e == l[195] || checkMail(e)) 
	{
		$('.login-register-input.email').addClass('incorrect');	
		$('#login-name2').focus();
	}
	else if ($('#login-password2').val() == '' || $('#login-password2').val() == l[909])
	{
		$('.login-register-input.password').addClass('incorrect');
		$('#login-password2').focus();
	}
	else
	{
		loadingDialog.show();
		$('.top-dialog-login-button').addClass('loading');
		if ($('.loginwarning-checkbox').attr('class').indexOf('checkboxOn')) localStorage.hideloginwarning=1;
		
		if (confirmok)
		{
			doConfirm($('#login-name2').val(),$('#login-password2').val(),function()
			{
				loadingDialog.show();
				postLogin($('#login-name2').val(),$('#login-password2').val(),remember,function(r)
				{
					loadingDialog.hide();
					if (r == EBLOCKED)
					{
						alert(l[730]);
					}
					else if (r)
					{
						u_type = r;
						document.location.hash = 'key';
					}
				});
			});
		}
		else
		{		
			var remember;			
			if ($('.login-check').attr('class').indexOf('checkboxOn') > -1) remember=1;
			postLogin($('#login-name2').val(),$('#login-password2').val(),remember,function(r)
			{
				loadingDialog.hide();
				if (r == EBLOCKED)
				{
					alert(l[730]);
				}
				else if (r)
				{
					u_type = r;
					if (login_next) document.location.hash = login_next;
					else if (page !== 'login') init_page();
					else document.location.hash = 'fm';
					login_next=false;
				}					
				else
				{	
					$('.login-register-input.password').addClass('incorrect');
					$('.login-register-input.email').addClass('incorrect');
					msgDialog('warninga',l[135],l[1130] + ' ' + l[969],false,function(e)
					{					
						$('#login-password2').val('');
						$('#login-name2').select();
					});							
				}
			});
		}
	}
}


function init_login()
{
	if (confirmok)
	{
		$('.main-top-info-block').removeClass('hidden');
		$('.register-st2-button-arrow').text(l[1131]);
		$('.main-italic-header.login').text(l[1131]);
		$('.main-top-info-text').text(l[378]);
	}
	else
	{
		$('.register-st2-button').addClass('active');
		if (login_txt)
		{
			$('.main-top-info-block').removeClass('hidden');			
			$('.main-top-info-text').text(login_txt);
			login_txt=false;	
		}	
	}

	$('#login-name2').unbind('focus');
	$('#login-name2').bind('focus',function(e)
	{
		$('.login-register-input.email').addClass('focused');
		if ($(this).val() == l[195]) $(this).val('');	
	});	
	$('#login-name2').unbind('blur');
	$('#login-name2').bind('blur',function(e)
	{
		$('.login-register-input.email').removeClass('focused');
		if ($(this).val() == '') $(this).val(l[195]);	
	});	
	$('#login-password2').unbind('focus');
	$('#login-password2').bind('focus',function(e)
	{
		$('.login-register-input.password').addClass('focused');
		if ($(this).val() == l[909])
		{
			$(this).val('');
			$(this)[0].type = 'password';
		}
	});
	$('#login-password2').unbind('blur');
	$('#login-password2').bind('blur',function(e)
	{
		$('.login-register-input.password').removeClass('focused');
		if ($(this).val() == '')
		{
			$(this).val(l[909]);
			$(this)[0].type = 'text';
		}
	});	
	
	$('#login-password2, #login-name2').unbind('keydown');
	$('#login-password2, #login-name2').bind('keydown',function(e)
	{	
		if ($('#login-name2').val() !== '' && $('#login-name2').val() !== l[195] && $('#login-password2').val() !== '' && $('#login-password2').val() !== l[909]) $('.register-st2-button').addClass('active');
		$('.login-register-input.password').removeClass('incorrect');
		$('.login-register-input.email').removeClass('incorrect');
		if (e.keyCode == 13) pagelogin();
	});	

	$('.register-st2-button').unbind('click');
	$('.register-st2-button').bind('click',function(e)
	{
		pagelogin();
	});
			
	$('.login .radio-txt,.login-check').unbind('click');
	$('.login .radio-txt,.login-check').bind('click',function(e)
	{
		if ($('.login-check').attr('class').indexOf('checkboxOn') > -1) 
		{
			$('.login-check').addClass('checkboxOff');
			$('.login-check').removeClass('checkboxOn');
		}
		else
		{
			$('.login-check').addClass('checkboxOn');
			$('.login-check').removeClass('checkboxOff');		
		}
	});
}


function postlogin()
{
	if (m) loadingDialog.show();
	var ctx = 
	{
		checkloginresult: function(ctx,r)
		{
			if (m) loadingDialog.hide();
			else document.getElementById('overlay').style.display='none';		
			
			if (r == EBLOCKED)
			{
				alert(l[730]);
			}
			else if (r)
			{
				document.getElementById('login_password').value='';
				document.getElementById('login_email').value='';
				u_type = r;
				if (page == 'login')
				{	
					if (document.location.hash == '#fm')
					{
						page='fm';
						init_page();
					}
					else
					{
						if (login_next) document.location.hash = login_next;
						else if (page !== 'login') init_page();
						else document.location.hash = 'fm';
						login_next=false;
						document.title = 'MEGA';
					}
				}
				else init_page();
				if (d) console.log('logged in');					
			}					
			else
			{
				document.getElementById('login_password').value='';
				alert(l[201]);
			}
		}	
	}	
	var passwordaes = new sjcl.cipher.aes(prepare_key_pw(document.getElementById('login_password').value));										
	var uh = stringhash(document.getElementById('login_email').value.toLowerCase(),passwordaes);	
	u_login(ctx,document.getElementById('login_email').value,document.getElementById('login_password').value,uh,document.getElementById('login_remember').checked);
}