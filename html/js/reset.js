var recoverycode,recoveryemail,recoverykey;

function init_reset()
{
	if (u_type)
	{
		msgDialog('warningb','Error','You cannot use the account recovery procedure while being logged in. Please log out and try again.',false,function(e)
		{
			document.location.hash = 'help';
		});	
		return false;	
	}
	loadingDialog.show();	
	recoverycode = page.replace('recover','');	
	api_req({a:'erv',c:recoverycode},
	{ 
		callback : function (res) 
		{ 	
			loadingDialog.hide();			
			if (typeof res == 'number')
			{
				if (res == EEXPIRED) 				
					msgDialog('warninga','Reovery Link Expired','This recovery link has expired, please try again.','',function()
					{
						document.location.hash = 'recovery';					
					});			
				else					
					msgDialog('warninga','Invalid Recovery Link','Invalid link, please try again.','',function()
					{
						document.location.hash = 'recovery';					
					});							
			}
			else
			{
				if (res[0] == 9)
				{
					recoveryemail = res[1];
					$('.main-mid-pad.backup-recover.withkey').removeClass('hidden');
					$('.withkey #key-input2').unbind('focus');
					$('.withkey #key-input2').bind('focus',function()
					{
						$(this).val('');
					});		
					$('.withkey #key-input2').unbind('blur');
					$('.withkey #key-input2').bind('blur',function()
					{
						if ($(this).val() == '') $(this).val('Or enter your key here');
					});		
					
					$('.withkey .backup-input-button').unbind('click');
					$('.withkey .backup-input-button').bind('click',function()
					{
						verify_key($('#key-input2').val());
					});
					
					$('#key-input2').unbind('keypress');
					$('#key-input2').bind('keypress',function(e)
					{
						if (e.keyCode == 13) verify_key($('#key-input2').val());
					});
					
					$('#key-upload-field').unbind('change');
					$('#key-upload-field').bind('change',function(e)
					{
						$('.recover-block.error,.recover-block.success').addClass('hidden');
						if (e && e.target && e.target.files)
						{
							var f = e.target.files[0];
							if (f && f.size > 100) 
							{
								msgDialog('warningb','Filesize too large','The file you selected appears to be too large. Please make sure you select the correct file containing your 22 character master key.');
							}
							else if (f)
							{					
								var FR = new FileReader();
								FR.onload = function(e) 
								{
									var contents = e.target.result;
									verify_key(contents);
								}
								FR.readAsText(f);
							}
						}
					});				
				}
				else if (res[0] == 10)
				{
					$('.main-mid-pad.backup-recover.withoutkey').removeClass('hidden');	
					$('.backup-notification-block').removeClass('hidden');
				}			
			}			
		}
	});
	
	if (typeof zxcvbn == 'undefined' && !silent_loading)
	{
		$('.login-register-input.password').addClass('loading');
		silent_loading=function()
		{
			$('.login-register-input.password').removeClass('loading');
			reset_pwcheck();
		};
		jsl.push(jsl2['zxcvbn_js']);		
		jsl_start();
	}
	else
	{
		$('.login-register-input.password').removeClass('loading');
		reset_pwcheck();
	}
	
	$('.restore-verify-button').unbind('click');
	$('.restore-verify-button').bind('click',function(e)
	{
		recovery_reset_pw();
	});	
	init_reset_pw();
}

function recovery_reset_pw()
{
	if ($('#withkey-password').val() == l[909])
	{
		msgDialog('warninga',l[135],l[741]);
		return;	
	}
	else if ($('#withkey-password').val() !== $('#withkey-password2').val())
	{
		msgDialog('warninga',l[135],l[715]);
		return;	
	}
	var recoverypassword = $('#withkey-password').val();
	loadingDialog.show();
	api_resetkeykey({result:function(code) 
	{	
		loadingDialog.hide();
		if (code == 0)
		{
			msgDialog('info','Password reset','Your password has been reset successfully. Please log into your account now.','',function()
			{
				login_email = recoveryemail;
				document.location.hash = 'login';
			});			
		}
		else if (code == EKEY)
		{
			msgDialog('warningb','Invalid key','The key you supplied does not match with this account. Please make sure you use the correct key and try again.');
			$('.recover-block.error').removeClass('hidden');
		}
		else if (code == EEXPIRED || code == ENOENT)
		{
			msgDialog('warninga','Recovery link expired','Your recovery link has expired, please try again.','',function()
			{
				document.location.hash = 'recovery';					
			});
		}
	} },recoverycode,base64_to_a32(recoverykey),recoveryemail,recoverypassword);
}


function verify_key(key)
{
	$('#key-upload-field').val('');
	$('.recover-block.error,.recover-block.success').addClass('hidden');
	recoverykey = key;	
	loadingDialog.show();
	api_resetkeykey({result:function(code) 
	{	
		if (code == 0)
		{
			$('.recover-block.success').removeClass('hidden');
		}
		else if (code == EKEY)
		{
			msgDialog('warningb','Invalid key','The key you supplied does not match with this account. Please make sure you use the correct key and try again.');
			$('.recover-block.error').removeClass('hidden');
		}
		else if (code == EEXPIRED || code == ENOENT)
		{
			msgDialog('warninga','Recovery link expired','Your recovery link has expired, please try again.','',function()
			{
				document.location.hash = 'recovery';					
			});	
		}
		loadingDialog.hide();	
	} },recoverycode,base64_to_a32(key));

	/*
	result(x) can be called with
	x == 0 - all good
	x == EKEY - invalid master key
	x == ENOENT - invalid or already used code_from_email
	x == EEXPIRED - valid, but expired code_from_email
	*/
}



function reset_pwcheck()
{
	$('.login-register-input.password').removeClass('weak-password strong-password');
	$('.new-registration').removeClass('good1 good2 good3 good4 good5');	

	
	if (typeof zxcvbn == 'undefined') return false;
	if ($('#withkey-password').attr('type') !== 'text' && $('#withkey-password').val() !== '') var pw = zxcvbn($('#withkey-password').val());
	else if ($('#withoutkey-password').attr('type') !== 'text' && $('#withoutkey-password').val() !== '') var pw = zxcvbn($('#withoutkey-password').val());
	else return false;
		
	if (pw.score > 3 && pw.entropy > 75)
	{
		$('.login-register-input.password').addClass('strong-password');		
		$('.new-registration').addClass('good5');
		$('.new-reg-status-pad').html('<strong>' + l[1105] + '</strong>' + l[1128]);
		$('.new-reg-status-description').text(l[1123]);
	}
	else if (pw.score > 2 && pw.entropy > 50)
	{
		$('.login-register-input.password').addClass('strong-password');		
		$('.new-registration').addClass('good4');
		$('.new-reg-status-pad').html('<strong>' + l[1105] + '</strong>' + l[1127]);
		$('.new-reg-status-description').text(l[1122]);
	}
	else if (pw.score > 1 && pw.entropy > 40)
	{
		$('.login-register-input.password').addClass('strong-password');		
		$('.new-registration').addClass('good3');
		$('.new-reg-status-pad').html('<strong>' + l[1105] + '</strong>' + l[1126]);
		$('.new-reg-status-description').text(l[1121]);
	}
	else if (pw.score > 0 && pw.entropy > 15)
	{
		$('.new-registration').addClass('good2');
		$('.new-reg-status-pad').html('<strong>' + l[1105] + '</strong>' + l[1125]);
		$('.new-reg-status-description').text(l[1120]);
	}
	else
	{
		$('.login-register-input.password').addClass('weak-password');		
		$('.new-registration').addClass('good1');
		$('.new-reg-status-pad').html('<strong>' + l[1105] + '</strong> ' + l[1124]);
		$('.new-reg-status-description').text(l[1119]);	
	}	
	$('.password-status-warning').html('<span class="password-warning-txt">' + l[34] + '</span> ' + l[1129] + '<div class="password-tooltip-arrow"></div>');		
	$('.password-status-warning').css('margin-left',($('.password-status-warning').width()/2*-1)-13);
}


function init_reset_pw()
{
	var a = '';
	
	$('#withkey-password,#withoutkey-password').unbind('focus');
	$('#withkey-password,#withoutkey-password').bind('focus',function(e)
	{
		$('.login-register-input.password.first').removeClass('incorrect');
		$('.login-register-input.password.confirm').removeClass('incorrect');
		$('.login-register-input.password').addClass('focused');
		if ($(this).val() == l[909])
		{
			$(this).val('');
			$(this)[0].type = 'password';
		}
	});
	$('#withkey-password,#withoutkey-password').unbind('blur');
	$('#withkey-password,#withoutkey-password').bind('blur',function(e)
	{
		$('.login-register-input.password').removeClass('focused');
		if ($(this).val() == '')
		{
			$(this).val(l[909]);
			$(this)[0].type = 'text';
		}
		reset_pwcheck();
	});		
	$('#withkey-password2,#withoutkey-password2').unbind('focus');
	$('#withkey-password2,#withoutkey-password2').bind('focus',function(e)
	{
		$('.login-register-input.password.confirm').removeClass('incorrect');
		$('.login-register-input.password2').addClass('focused');
		if ($(this).val() == l[1114])
		{
			$(this).val('');
			$(this)[0].type = 'password';
		}
	});
	$('#withkey-password2,#withoutkey-password2').unbind('blur');
	$('#withkey-password2,#withoutkey-password2').bind('blur',function(e)
	{
		$('.login-register-input.password2').removeClass('focused');
		if ($(this).val() == '')
		{
			$(this).val(l[1114]);
			$(this)[0].type = 'text';
		}
	});	
	
	$('#withkey-password,#withoutkey-password').unbind('keyup');
	$('#withkey-password,#withoutkey-password').bind('keyup',function(e)
	{	
		reset_pwcheck();
	});		
	
	$('#withkey-password2').unbind('keyup');
	$('#withkey-password2').bind('keyup',function(e)
	{
		if (e.keyCode == 13) recovery_reset_pw();
	});	
	
	$('.password-status-icon').unbind('mouseover');
	$('.password-status-icon').bind('mouseover',function(e)
	{
		$('.password-status-warning').removeClass('hidden');
		
	});	
	$('.password-status-icon').unbind('mouseout');
	$('.password-status-icon').bind('mouseout',function(e)
	{
		$('.password-status-warning').addClass('hidden');		
	});		
	
	
}