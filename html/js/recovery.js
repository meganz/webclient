function init_recovery()
{
	$('.login-register-input input').unbind('focus');
    $('.login-register-input input').bind('focus',function(e)
	{
		$(this).parent().addClass('focused');
	});	
	$('.login-register-input input').unbind('blur');
	$('.login-register-input input').bind('blur',function(e)
	{
		$(this).parent().removeClass('focused');			
	});	
	
	$('.recover-button').unbind('click');
	$('.recover-button').bind('click', function()
	{
		if ($(this).attr('class').indexOf('active') == -1) 
		{		
			$('.recover-button').removeClass('active');
			$('.recover-block').addClass('hidden');
			$(this).addClass('active');
			if ($(this).attr('class').indexOf('yes') > -1) $('.positive.recover-block').removeClass('hidden');
			else $('.negative.recover-block').removeClass('hidden');			
		}
	});
	
	$('.backup-input-button').unbind('click');
	$('.backup-input-button').bind('click',function()
	{	
		startRecovery();
	});	
	
	$('#recover-input2,#recover-input1').unbind('keypress');
	$('#recover-input2,#recover-input1').bind('keypress',function(e)
	{
		if (e.keyCode == 13) startRecovery();
	});
		
	if (u_type)
	{
		msgDialog('info','Please log out','You cannot use the account recovery procedure while being logged in.',false,function(e)
		{
			document.location.hash = 'start';
		});
	}
}


function startRecovery()
{
	var t=9,email='';
	var c = $('.recover-button.no').attr('class');
	if (c && c.indexOf('active') > -1)
	{
		email = $('#recover-input2').val();
		t=10;
	}
	else email = $('#recover-input1').val();
	if (checkMail(email)) msgDialog('warninga',l[1100],l[1101]);
	else
	{	
		loadingDialog.show();
		api_req({a:'erm',m:email,t:t},
		{ 
			callback : function (res) 
			{
				loadingDialog.hide();
				if (res == ENOENT) msgDialog('warningb','Email not found','We have account on record with the email address you provided.');
				else if (res == '0') 
				{
					$('.fm-dialog.reset-success .reg-success-txt').text(l[735]);
					$('.fm-dialog.reset-success .fm-dialog-button').unbind('click');
					$('.fm-dialog.reset-success .fm-dialog-button').bind('click',function(e)
					{
						$('.fm-dialog-overlay').addClass('hidden');
						$('.fm-dialog.reset-success').addClass('hidden');
						delete $.dialog;
					});
					$('.fm-dialog-overlay').removeClass('hidden');
					$('.fm-dialog.reset-success').removeClass('hidden');
					$.dialog = 'resetsuccess';
				}
				else msgDialog('warningb',l[135],l[200]);
			}
		});
	}
}


