function doregister()
{
	if((document.getElementById('register_name').value == '') || (document.getElementById('register_name').value == l[206]))
	{
		alert(l[212]);
		document.getElementById('register_name').focus();
	}
	else if((document.getElementById('register_email').value == '') || (document.getElementById('register_email').value == l[207]))
	{
		alert(l[197]);
		document.getElementById('register_email').focus();
	}
	else if(checkMail(document.getElementById('register_email').value))
	{
		alert(l[198]);
		document.getElementById('register_email').focus();	
	}
	else if((document.getElementById('register_password').value == '') || (document.getElementById('register_password').value == 'Password'))
	{
		alert(l[213]);
		document.getElementById('register_email').focus();
	}	
	else if (localStorage.signupcode && (document.getElementById('register_password').value != document.getElementById('register_password_confirm').value))
	{
		alert(l[715]);
		
		if (m)
		{
			document.getElementById('register_password').value='';
			document.getElementById('register_password_confirm').value='';			
			document.getElementById('register_password').focus();
		}
		else
		{		
			document.getElementById('register_password').value = l[770];
			document.getElementById('register_password').type = 'text';
			document.getElementById('register_password_confirm').value = l[771];
			document.getElementById('register_password_confirm').type = 'text';
		}
	}
	else if (!document.getElementById('register_checkbox').checked)
	{
		alert(l[214]);
	}
	else
	{
		if (m) loadingDialog.show();
		else document.getElementById('overlay').style.display='';
		
		if (localStorage.signupcode)
		{		
			var ctx = 
			{
				checkloginresult: function(u_ctx,r)
				{			
					if (m) loadingDialog.hide();
					else document.getElementById('overlay').style.display='none';					
					if ((typeof r[0] == 'number') && (r[0] < 0))					
					{
						alert(l[200]);
					}
					else
					{
						u_type = r;						
						document.location.hash = 'fm';										
					}
				}
			}				
			var passwordaes = new sjcl.cipher.aes(prepare_key_pw(document.getElementById('register_password').value));										
			var uh = stringhash(document.getElementById('register_email').value.toLowerCase(),passwordaes);
			u_checklogin(ctx,true,prepare_key_pw(document.getElementById('register_password').value),localStorage.signupcode,document.getElementById('register_name').value,uh);
		}
		else if (u_type === false) 
		{
			var u_ctx = 
			{
				checkloginresult: function(u_ctx,r)
				{			
					u_type = r;
					registeraccount();
				}	
			}	
			u_checklogin(u_ctx,true);
		}
		else registeraccount();
	}
}

function registeraccount()
{
	var ctx = 
	{
		callback: function(res,ctx)
		{
			loadingDialog.hide();
			if (typeof res == 'undefined') 
			{
				alert(l[215]);												
			}			
			else if (res[0] == 0)
			{			
				if (m)
				{
					done_text1 = l[216];
					done_text2 = l[217];					 				
					page='done';
					mobileui();
				}
				else
				{
					$('.fm-dialog.registration-success').removeClass('hidden');
					$('.fm-dialog-overlay').removeClass('hidden');
					$('.fm-dialog.registration-success').unbind('click');
				}
				var ops = {a:'up'};				
				if (m) ops.name2 = $('#register_name').val();
				else
				{
					ops.terms = 'Mq';
					ops.firstname = base64urlencode($('#register-firstname').val());
					ops.lastname = base64urlencode($('#register-lastname').val());
					ops.name2 = $('#register-firstname') + ' ' + $('#register-lastname').val();
					u_attr.terms=1;
				}				
				api_req([ops]);
			}
			else
			{		
				if (res[0] == EACCESS) alert(l[218]);				
				else if (res[0] == EEXIST) 
				{
					if (m) alert(l[219]);
					else
					{
						$('.login-register-input.email .top-loginp-tooltip-txt').html(l[1297] + '<div class="white-txt">' + l[1298] + '</div>');
						$('.login-register-input.email').addClass('incorrect');
						msgDialog('warninga','Error',l[219]);
					}
				}
			}
		}
	}	
	var rv={};	
	if (m)
	{
		rv.name = $('#register_name').val();
		rv.email = $('#register_email').val();
		rv.password = $('#register_password').val();
	}
	else
	{
		rv.name = $('#register-firstname').val() + ' ' + $('#register-lastname').val()
		rv.email = $('#register-email').val();
		rv.password = $('#register-password').val();
	}
	sendsignuplink(rv.name,rv.email,rv.password,ctx);
}

function register_checkpassword(pass)
{
	if (m) return false;

	if ((pass == l[909]) || (pass == ''))
	{
		document.getElementById('register_pwstatus_text').innerHTML = '';
		document.getElementById('register_pwstatus').className = 'register-pass-status-block';			
		return false;
	}
	var strength = checkPassword(pass);	
	if (strength <= 25)
	{
		document.getElementById('register_pwstatus_text').innerHTML = l[220];
		document.getElementById('register_pwstatus').className = 'register-pass-status-block good1';	
	}
	else if (strength <= 50)
	{
		document.getElementById('register_pwstatus_text').innerHTML = l[221];
		document.getElementById('register_pwstatus').className = 'register-pass-status-block good2';
	}
	else if (strength <= 75)
	{
		document.getElementById('register_pwstatus_text').innerHTML = l[222];
		document.getElementById('register_pwstatus').className = 'register-pass-status-block good3';
	}
	else
	{
		document.getElementById('register_pwstatus_text').innerHTML = l[223];
		document.getElementById('register_pwstatus').className = 'register-pass-status-block good1 good4';	
	}
}


function pageregister()
{
	if (u_type > 0)
	{
		msgDialog('warninga',l[135],'You are already logged in. You can only create one MEGA account.');
		return false;
	}
	

	var err=false;

	if ($('#register-firstname').val() == '' || $('#register-firstname').val() == l[1096] || $('#register-lastname').val() == '' || $('#register-lastname').val() == l[1097])
	{
		$('.login-register-input.name').addClass('incorrect');	
		err=1;
	}
	if ($('#register-email').val() == '' || $('#register-email').val() == l[1096] || checkMail($('#register-email').val()))
	{	
		$('.login-register-input.email').addClass('incorrect');	
		err=1;
	}
	
	if ($('#register-email').val() == '' || $('#register-email').val() == l[1096] || checkMail($('#register-email').val()))
	{	
		$('.login-register-input.email').addClass('incorrect');	
		err=1;
	}
	
	var pw = zxcvbn($('#register-password').val());	
	if ($('#register-password').attr('type') == 'text')
	{
		$('.login-register-input.password.first').addClass('incorrect');
		$('.white-txt.password').text(l[213]);
		err=1;
	}	
	else if (pw.score == 0 || pw.entropy < 16)
	{
		$('.login-register-input.password.first').addClass('incorrect');
		$('.white-txt.password').text(l[1104]);
		err=1;
	}
	
	if ($('#register-password').val() !== $('#register-password2').val())
	{
		$('#register-password')[0].type = 'password';
		$('#register-password2')[0].type = 'password';
		$('#register-password').val('');
		$('#register-password2').val('');
		$('.login-register-input.password.confirm').addClass('incorrect');
		err=1;
	}
	
	if (!err && typeof zxcvbn == 'undefined')
	{
		msgDialog('warninga',l[135],l[1115] + '<br>' + l[1116]);
		return false;	
	}
	else if (!err)
	{
		if ($('.register-check').attr('class').indexOf('checkboxOff') > -1)
		{
			msgDialog('warninga',l[1117],l[1118]);
		}
		else
		{		
			if (localStorage.signupcode)
			{
				loadingDialog.show();
				var ctx = 
				{
					checkloginresult: function(u_ctx,r)
					{						
						if (typeof r[0] == 'number' && r[0] < 0) msgDialog('warningb',l[135],l[200]);						
						else
						{	
							loadingDialog.hide();
							u_type = r;						
							document.location.hash = 'fm';										
						}
					}
				}				
				var passwordaes = new sjcl.cipher.aes(prepare_key_pw($('#register-password').val()));
				var uh = stringhash($('#register-email').val().toLowerCase(),passwordaes);
				u_checklogin(ctx,true,prepare_key_pw($('#register-password').val()),localStorage.signupcode,$('#register-firstname').val() + ' ' + $('#register-lastname').val(),uh);				
				delete localStorage.signupcode;
			}
			else if (u_type === false)
			{
				loadingDialog.show();
				u_checklogin(
				{
					checkloginresult: function(u_ctx,r)
					{			
						u_type = r;
						registeraccount();
					}
				},true);
			}
			else if (u_type == 0) registeraccount();
		}
	}
}






function init_register()
{
	
	if (register_txt)
	{
		$('.main-top-info-block').removeClass('hidden');
		$('.main-top-info-text').text(register_txt);
		register_txt=false;	
	}
	
	if (localStorage.registeremail) $('#register-email').val(localStorage.registeremail);	
	

	$('#register-firstname').unbind('focus');
	$('#register-firstname').bind('focus',function(e)
	{
		$('.login-register-input.name').removeClass('incorrect');
		$('.login-register-input.name').addClass('focused');
		if ($(this).val() == l[1096]) $(this).val('');
	});
	$('#register-firstname').unbind('blur');
	$('#register-firstname').bind('blur',function(e)
	{
		$('.login-register-input.name').removeClass('focused');
		if ($(this).val() == '') $(this).val(l[1096]);
	});	
	$('#register-lastname').unbind('focus');
	$('#register-lastname').bind('focus',function(e)
	{
		$('.login-register-input.name').removeClass('incorrect');
		$('.login-register-input.name').addClass('focused');
		if ($(this).val() == l[1097]) $(this).val('');
	});
	$('#register-lastname').unbind('blur');
	$('#register-lastname').bind('blur',function(e)
	{
		$('.login-register-input.name').removeClass('focused');
		if ($(this).val() == '') $(this).val(l[1097]);
	});	
	$('#register-email').unbind('focus');
	$('#register-email').bind('focus',function(e)
	{
		$('.login-register-input.email .top-loginp-tooltip-txt').html(l[1100] + '.<div class="white-txt">' + l[1101] + '</div>');		
		$('.login-register-input.email').removeClass('incorrect');	
		$('.login-register-input.email').addClass('focused');
		if ($(this).val() == l[95]) $(this).val('');
	});
	$('#register-email').unbind('blur');
	$('#register-email').bind('blur',function(e)
	{
		$('.login-register-input.email').removeClass('focused');
		if ($(this).val() == '') $(this).val(l[95]);
	});	
	$('#register-password').unbind('focus');
	$('#register-password').bind('focus',function(e)
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
	$('#register-password').unbind('blur');
	$('#register-password').bind('blur',function(e)
	{
		$('.login-register-input.password').removeClass('focused');
		if ($(this).val() == '')
		{
			$(this).val(l[909]);
			$(this)[0].type = 'text';
		}
		registerpwcheck();
	});		
	$('#register-password2').unbind('focus');
	$('#register-password2').bind('focus',function(e)
	{
		$('.login-register-input.password.confirm').removeClass('incorrect');
		$('.login-register-input.password2').addClass('focused');
		if ($(this).val() == l[1114])
		{
			$(this).val('');
			$(this)[0].type = 'password';
		}
	});
	$('#register-password2').unbind('blur');
	$('#register-password2').bind('blur',function(e)
	{
		$('.login-register-input.password2').removeClass('focused');
		if ($(this).val() == '')
		{
			$(this).val(l[1114]);
			$(this)[0].type = 'text';
		}
	});	
	$('.new-registration-checkbox .radio-txt,.register-check').unbind('click');
	$('.new-registration-checkbox .radio-txt,.register-check').bind('click',function(e)
	{
		if ($('.register-check').attr('class').indexOf('checkboxOn') > -1)
		{
			$('.register-check').addClass('checkboxOff');
			$('.register-check').removeClass('checkboxOn');
		}
		else
		{
			$('.register-check').addClass('checkboxOn');
			$('.register-check').removeClass('checkboxOff');		
		}
	});	
	if (typeof zxcvbn == 'undefined' && !silent_loading)
	{
		$('.login-register-input.password').addClass('loading');
		silent_loading=function()
		{
			$('.login-register-input.password').removeClass('loading');
			registerpwcheck();
		};
		jsl.push(jsl2['zxcvbn_js']);
		jsl_start();
	}
	$('#register-password').unbind('keyup');
	$('#register-password').bind('keyup',function(e)
	{	
		registerpwcheck();
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
	$('.register-st2-button').unbind('click');
	$('.register-st2-button').bind('click',function()
	{
		pageregister();
	});		
	$('.new-registration-checkbox a').unbind('click');
	$('.new-registration-checkbox a').bind('click',function(e)
	{
		$.termsAgree = function()
		{
			$('.register-check').removeClass('checkboxOff');
			$('.register-check').addClass('checkboxOn');			
		};
		termsDialog();
		return false;	
	});
}






function registerpwcheck()
{
	$('.login-register-input.password').removeClass('weak-password strong-password');
	$('.new-registration').removeClass('good1 good2 good3 good4 good5');	
	if (typeof zxcvbn == 'undefined' || $('#register-password').attr('type') == 'text' || $('#register-password').val() == '') return false;		
	var pw = zxcvbn($('#register-password').val());
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


function register_signup(email)
{
	document.getElementById('register_email').value = email;
	document.getElementById('register_email').readOnly = true;	
	document.getElementById('register_password_confirm_div').style.display='';
}

function checkPassword(strPassword)
{
	var m_strUpperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	var m_strLowerCase = "abcdefghijklmnopqrstuvwxyz";
	var m_strNumber = "0123456789";
	var m_strCharacters = "!@#$%^&*?_~";
    var nScore = 0;	
	nScore += countDif(strPassword)*2;	
	var extra = countDif(strPassword)*strPassword.length/3;	
	if (extra > 25) extra = 25;	
	nScore += extra;
    var nUpperCount = countContain(strPassword, m_strUpperCase);
    var nLowerCount = countContain(strPassword, m_strLowerCase);
    var nLowerUpperCount = nUpperCount + nLowerCount;    
    if (nUpperCount == 0 && nLowerCount != 0) nScore += 10; 
    else if (nUpperCount != 0 && nLowerCount != 0) nScore += 10; 
    var nNumberCount = countContain(strPassword, m_strNumber);
    if (nNumberCount == 1) nScore += 10;    
    if (nNumberCount >= 3) nScore += 15;
    var nCharacterCount = countContain(strPassword, m_strCharacters);
    if (nCharacterCount == 1) nScore += 10;
    if (nCharacterCount > 1) nScore += 10;    
    if (nNumberCount != 0 && nLowerUpperCount != 0) nScore += 2;
    if (nNumberCount != 0 && nLowerUpperCount != 0 && nCharacterCount != 0) nScore += 3;
    if (nNumberCount != 0 && nUpperCount != 0 && nLowerCount != 0 && nCharacterCount != 0) nScore += 5;
    return nScore;
}

function countContain(strPassword, strCheck)
{    
    var nCount = 0;
    for (i = 0; i < strPassword.length; i++) 
    {
        if (strCheck.indexOf(strPassword.charAt(i)) > -1)  nCount++;         
    } 
    return nCount; 
} 

function countDif(strPassword)
{    
	var chararr = [];
	var nCount = 0;
    for (i = 0; i < strPassword.length; i++) 
    {
		if (!chararr[strPassword.charAt(i)])
		{	
			chararr[strPassword.charAt(i)] = true;
			nCount++;
		}
	}
	return nCount;
}