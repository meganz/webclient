var dlid=false;
var dlkey=false;
var cn_url=false;
var init_l=true;
var pfkey = false;
var pfid = false;
var n_h = false;
var n_k_aes = false;
var fmdirid=false;
var u_type,cur_page,u_checked
var page = '';
var confirmcode = false;
var confirmok = false;
var hash = window.location.hash;
var chrome_msg=false;
var init_anoupload=false;
var blogid =false;
var pwchangecode=false;
var resetpwcode=false;
var resetpwemail='';
var mobileparsed=false;
var mobilekeygen=false;
var subdirid=false;
var subsubdirid=false;
var notifications;
var account=false;
var register_txt=false;
var login_next=false;
var loggedout=false;

var pro_json = '[[["N02zLAiWqRU",1,500,1024,1,"9.99","EUR"],["zqdkqTtOtGc",1,500,1024,12,"99.99","EUR"],["j-r9sea9qW4",2,2048,4096,1,"19.99","EUR"],["990PKO93JQU",2,2048,4096,12,"199.99","EUR"],["bG-i_SoVUd0",3,4096,8182,1,"29.99","EUR"],["e4dkakbTRWQ",3,4096,8182,12,"299.99","EUR"]]]';


function startMega()
{
	if (silent_loading)
	{
		silent_loading();
		silent_loading=false;
		return false;
	}
	if (pages['dialogs'])
	{	
		$('body').append(translate(pages['dialogs'].replace(/{staticpath}/g,staticpath)));
		delete pages['dialogs'];
	}
	jsl=[];
	page = document.location.hash.replace('#','');
	init_page();
}



function mainScroll()
{
	$('.main-scroll-block').jScrollPane({showArrows:true,arrowSize:5,animateScroll:true,mouseWheelSpeed:100,verticalDragMinHeight:150});	
	$('.main-scroll-block').unbind('jsp-scroll-y');
	jScrollFade('.main-scroll-block');
	if (page == 'doc' || page.substr(0,4) == 'help') scrollMenu();
	
}

function scrollMenu()
{
	$('.main-scroll-block').bind('jsp-scroll-y',function(event, scrollPositionY, isAtTop, isAtBottom)
	{
		 if (page == 'doc' || page.substr(0,4) == 'help')
		 {			
			var sc = scrollPositionY-30;				
			if (isAtTop) sc = 30;
			if ($('.main-scroll-block .jspPane').height()-sc-$('.new-left-menu-block').height()-$('.nw-bottom-block').height()-100 < 0) sc = $('.main-scroll-block .jspPane').height()-$('.new-left-menu-block').height()-$('.nw-bottom-block').height()-100;			
			$('.new-left-menu-block').css('padding-top',sc + 'px');
		 }
	});
}


function init_page()
{	
	if ($.startscroll) delete $.startscroll;
	if ($.dlscroll) delete $.dlscroll
	if ($.infoscroll) delete $.infoscroll;

	if (page == 'plugin')
	{
		if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) page = 'firefox';
		else page = 'chrome';
	}
	
	else if (page == 'notifications') page = 'fm/notifications';
		
	
	
	if (localStorage.signupcode && u_type !== false) delete localStorage.signupcode;	
	else if (localStorage.signupcode && page.substr(0,6) !== 'signup' && page !== 'register' && page !== 'terms' && page !== 'privacy' && page !== 'chrome' && page !== 'firefox')
	{
		register_txt = l[1291];
		document.location.hash = 'signup' + localStorage.signupcode;
		return false;
	}

	$('.top-head').remove();
	$('#loading').hide();
	if (loadingDialog) loadingDialog.hide();	
	page = page.replace('%21','!');		
	if (page.substr(0,1) == '!' && page.length > 1)
	{							
		dlkey=false;
		var ar = page.substr(1,page.length-1).split('!');
		if (ar[0]) dlid  = ar[0].replace(/[^a-z^A-Z^0-9^_^-]/g,"");
		if (ar[1]) dlkey = ar[1].replace(/[^a-z^A-Z^0-9^_^-]/g,"");
	}
	
	if (page.substr(0,2) == 'F!' && page.length > 2)
	{							
		var ar = page.substr(2,page.length-1).split('!');		
		if (ar[0]) pfid  = ar[0].replace(/[^a-z^A-Z^0-9^_^-]/g,"");
		if (ar[1]) pfkey = ar[1].replace(/[^a-z^A-Z^0-9^_^-]/g,"");		
		n_h = pfid;	
		u_n = pfid;
		page = 'fm';	
	}
	else
	{
		n_h = false;
		u_n = false;
		pfkey = false;
		pfid  = false;			
	}
	confirmcode = false;		
	pwchangecode = false;
	
	if (page.substr(0,7) == 'confirm')
	{
		confirmcode = page.replace("confirm","");
		page = 'confirm';			
	}
	if (page.substr(0,7) == 'pwreset')
	{
		resetpwcode = page.replace("pwreset","");
		page = 'resetpassword';
	}	
	if (page.substr(0,5) == 'newpw')
	{
		pwchangecode = page.replace("newpw","");
		page = 'newpw';
	}
	
	blogmonth=false;
	blogsearch=false;	
	
	if (page.substr(0,7) == 'voucher')
	{
		loadingDialog.show();
		var vouchercode = page.substr(7,page.length-7);
		api_req([{a:'uavq',v:vouchercode}],{
		callback: function(json)
		{
			if (typeof json[0] == 'number')
			{
				document.location.hash = '';
				return false;
			}
			else if (json[0] && !json[0][3])
			{
				msgDialog('warninga','Invalid URL','Did you already activate your Pro membership? Please log in to your account.',false,function()
				{					
					document.location.hash = 'login';
				});
				return false;
			}
			else if (json[0][0] == 'vGuzSLMU7WA') slingshotDialog();			
			localStorage.voucher = page.replace("voucher","");
			if (!u_type) 
			{
				if (u_wasloggedin())
				{
					login_txt = l[1040];
					document.location.hash='login';
				}
				else
				{
					register_txt = l[1041];
					document.location.hash='register';
				}
			}		
		}});
		return false;
	}
	
	
	if (localStorage.voucher && u_type !== false)
	{
		api_req([{a: 'uavr',v: localStorage.voucher}],
		{ 
			callback : function (json,params)
			{
				if (!(typeof json[0] == 'number' && json[0] < 0)) balance2pro();				
			}
		});
		delete localStorage.voucher;
	}
	
	if (page.substr(0,10) == 'blogsearch')
	{
		blogsearch = decodeURIComponent(page.substr(11,page.length-2));	
		if (!blogsearch) document.location.hash = '#blog';
		page = 'blog';
	}
	else if (page.substr(0,4) == 'blog' && page.length > 4 && page.length < 10)
	{
		blogid = page.substr(5,page.length-2);		
		page = 'blogarticle';			
	}
	else if (page.substr(0,4) == 'blog' && page.length > 4)
	{
		blogmonth = page.substr(5,page.length-2);	
		page = 'blog';			
	}
	
	
	
	
	if (page.substr(0,6) == 'signup')
	{
		var signupcode = page.substr(6,page.length-1);
		loadingDialog.show();
		api_req([{ a: 'uv',c: signupcode}],
		{ 
		  callback : function (json,params)
		  {
			loadingDialog.hide();
			if (typeof json[0] == 'number' && json[0] < 0)
			{
				if (localStorage.signupcode)
				{
					delete localStorage.signupcode;
					delete localStorage.registeremail;
				}
				else msgDialog('warningb',l[135],l[1290]);				
				document.location.hash = 'start';
			}
			else
			{	
				localStorage.signupcode = signupcode;			
				localStorage.registeremail = json[0];
				document.location.hash = 'register';
				if (!register_txt) register_txt = l[1289];							
			}
		  }
		});			
	}	
	else if (page == 'newpw')
	{		
		setpwset(pwchangecode,{callback: function(res) 
		{
			loadingDialog.hide();
			if (res[0] == EACCESS || res[0] == 0) alert(l[727]);
			else if(res[0] == EEXPIRED) alert(l[728]);
			else if(res[0] == ENOENT) alert(l[729]);
			else alert(l[200]);				
			if (u_type == 3)
			{
				page = 'account';
				parsepage(pages['account']);
				load_acc();
			}
			else
			{
				page = 'login';
				parsepage(pages['login']);
				init_login();
			}
		}});
	}
	else if (page == 'confirm')
	{				
		loadingDialog.show();
		var ctx = 
		{
			signupcodeok: function(email,name)
			{
				loadingDialog.hide();
				confirmok=true;
				page = 'login';
				parsepage(pages['login']);
				login_txt = l[378];					
				init_login();
				$('#login-name2').val(email);
				$('.register-st2-button').addClass('active');
				topmenuUI();								
			},
			signupcodebad: function(res)
			{
				loadingDialog.hide();
				if (res == EINCOMPLETE) alert(l[703]);										
				else if (res == ENOENT) login_txt = l[704];
				else alert(l[705] + res);								
				page = 'login';
				parsepage(pages['login']);
				init_login();
				topmenuUI();				
			}
		}
		verifysignupcode(confirmcode,ctx);		
	}		
	else if (u_type == 2)
	{
		parsepage(pages['key']);
		init_key();		
	}
	else if (page == 'login')
	{
		parsepage(pages['login']);
		init_login();
	}
	else if (page == 'account')
	{
		document.location.hash = 'fm/account';
		return false;
	}
	else if (page == 'register')
	{
		parsepage(pages['register']);
		init_register();
	}
	else if (page == 'chrome')
	{
		parsepage(pages['chrome']);	
		var h=0;
		$('.chrome-bottom-block').each(function(i,e)
		{
			if ($(e).height() > h) h = $(e).height();
		});
		$('.chrome-bottom-block').height(h);
		if ('-en-'.indexOf('-'+lang+'-') == -1) $('.chrome-download-button').css('font-size','12px');		
	}
	else if (page == 'key')
	{
		parsepage(pages['key']);
		init_key();
	}
	else if (page == 'contact')
	{
		parsepage(pages['contact']);
		if (lang == 'ru') $('.account-mid-block').addClass('high');
	}
	else if (page.substr(0,4) == 'help')
	{		
			parsepage(pages['help']);
			init_help();
	}
	else if (page == 'privacy')
	{
		parsepage(pages['privacy']);
	}
	else if (page == 'privacycompany')
	{
		parsepage(pages['privacycompany']);
	}
	else if (page == 'dev' || page == 'developers')
	{
		parsepage(pages['dev']);
		dev_init('dev');
	}
	else if (page == 'doc')
	{
		parsepage(pages['dev']);
		dev_init('doc');
	}
	else if (page == 'sdkterms')
	{
		parsepage(pages['sdkterms']);		
	}
	else if (page.substr(0,3) == 'sdk')
	{
		parsepage(pages['dev']);
		if (page.length > 3) dev_init('sdk',page.replace('sdk_',''));
		else dev_init('sdk');
	}		
	else if (page == 'about')
	{
		parsepage(pages['about']);			
		$('.team-person-block').removeClass('first');			
		var html ='';
		var a=4;
		$('.team-person-block').sort( function(){return (Math.round(Math.random())-0.5)}).each(function(i,e)
		{
			if (a == 4)
			{
				html += e.outerHTML.replace('team-person-block','team-person-block first');
				a=0;				
			}
			else html += e.outerHTML;
			a++;
		});
		$('.new-bottom-pages.about').html(html + '<div class="clear"></div>');
		mainScroll();
	}
	else if (page == 'terms')
	{
		parsepage(pages['terms']);
	}
	else if (page == 'takedown')
	{
		parsepage(pages['takedown']);
	}
	else if (page == 'affiliateterms')
	{
		parsepage(pages['affiliateterms']);		
	}
	else if (page == 'blog')
	{		
		parsepage(pages['blog']);
		init_blog();
	}
	else if (page == 'blogarticle')
	{
		parsepage(pages['blogarticle']);
		init_blogarticle();
	}
	else if (page == 'copyright')
	{
		parsepage(pages['copyright']);
		$('.reg-st5-complete-button').unbind('click');
		$('.reg-st5-complete-button').bind('click',function(e)
		{
			document.location.hash = 'copyrightnotice';
		});
		if (lang == 'en')
		{
			$('#copyright_txt').text($('#copyright_txt').text().split('(i)')[0]);
			$('#copyright_en').removeClass('hidden');			
			mainScroll();
		}
	}
	else if (page.substr(0,3) == 'pro')
	{
		parsepage(pages['pro']);		
		init_pro();
	}
	else if (page == 'credits')
	{
		parsepage(pages['credits']);
		var html ='';
		$('.credits-main-pad a').sort( function(){return (Math.round(Math.random())-0.5)}).each(function(i,e)
		{
			html += e.outerHTML;
		});
		$('.credits-main-pad').html(html + '<div class="clear"></div>');
	}
	else if (page == 'firefox')
	{
		parsepage(pages['firefox']);
		$('.ff-bott-button').unbind('mouseover');
		$('.ff-bott-button').bind('mouseover', function ()
		{
			$('.ff-icon').addClass('hovered');
		});
		$('.ff-bott-button').unbind('mouseout');
		$('.ff-bott-button').bind('mouseout', function ()
		{
			$('.ff-icon').removeClass('hovered');
		});
	}
	else if (page == 'sync')
	{
		parsepage(pages['sync']);		
	}
	else if (page == 'mobile')
	{
		parsepage(pages['mobile']);		
	}
	else if (page == 'affiliates'  && u_attr && u_attr.aff)
	{
		parsepage(pages['affiliatemember']);
		init_affiliatemember();
	}
	else if (page == 'affiliates')
	{
		parsepage(pages['affiliates']);
	}
	else if (page == 'resellers')
	{
		parsepage(pages['resellers']);
	}
	else if (page == 'affiliatesignup' && u_type < 3)
	{
		if (loggedout)
		{
			document.location.hash = '#start';
			return false;
		}
		login_txt = l[376];
		parsepage(pages['login']);
		init_login();
	}
	else if (page == 'affiliatesignup')
	{
		parsepage(pages['affiliatesignup']);
		init_affiliatesignup();
	}
	else if (page == 'done')
	{
		if (!done_text1)
		{
			done_text1 = 'Test123';
			done_text2 = 'Test1234';
		}		
		parsepage(pages['done']);
		init_done();
	}
	else if (page == 'copyrightnotice')
	{
		parsepage(pages['copyrightnotice']);
		init_cn();
	}
	else if (dlid)
	{
		page = 'download';			
		parsepage(pages['download'],'download');
		dlinfo(dlid,dlkey,false);
	}	
	else if (is_fm())
	{
		var id = false;
		if (page.substr(0,2) == 'fm')
		{		
			id = page.replace('fm/','');
			if (id.length < 5) id =false;
		}
		
		if (!id && fminitialized) id = M.RootID;
		
		// switch between FM & folderlinks (completely reinitialize)
		if ((!pfid && folderlink) || (pfid && folderlink === 0))
		{
			M.reset();
			folderlink=0;
			fminitialized=false;
			mDBloaded = {'ok':0,'u':0,'f_sk':0,'f':0,'s':0};
			if (waitxhr && waitxhr.abort)
			{
				waitxhr.abort();
				waitxhr=undefined;
			}
			notifications=undefined;
		}		
		if (!fminitialized)
		{					
			if (id) M.currentdirid = id;
			if (!m && $('#fmholder').html() == '') $('#fmholder').html('<div id="topmenu"></div>' + translate(pages['fm'].replace(/{staticpath}/g,staticpath)));
			if (typeof mDB !== 'undefined' && !pfid) mDBstart();
			else loadfm();			
			andreiScripts();
			if (pfid)
			{				
				$('.fm-left-menu .folderlink').removeClass('hidden');
				$('.fm-tree-header.cloud-drive-item span').text(l[808]);
				$('.fm-tree-header').not('.cloud-drive-item').hide();
				$('.fm-menu-item').hide();
			}
		}
		else if (!pfid && id && id !== M.currentdirid) M.openFolder(id);
		$('#topmenu').html(parsetopmenu());
		$('body').attr('class','');
		$('#pageholder').hide();
		$('#startholder').hide();
		$('#fmholder').show();
		if (fminitialized)
		{
			if (M.currentdirid == 'account') accountUI();			
			else if (M.currentdirid == 'notifications') notificationsUI();
			else if (M.currentdirid == 'search') searchFM();
			else if (M.viewmode == 1) iconUI();
			else gridUI();
			treeUI();
			if ($.transferHeader) $.transferHeader();
		}		
	}
	else if (page.substr(0,2) == 'fm' && !u_type)
	{
		if (loggedout)
		{
			document.location.hash = '#start';
			return false;
		}
		login_next = page;
		login_txt = l[1298];
		document.location.hash = 'login';
	}
	else
	{
		page = 'start';
		parsepage(pages['start'],'start');
		init_start();		
	}
	topmenuUI();
	loggedout=false;
}

var avatars = {};



function loginDialog(close)
{
	if (close)
	{
		$('.top-login-popup').removeClass('active');
		return false;
	}
	if (localStorage.hideloginwarning || document.location.href.substr(0,19) == 'chrome-extension://' || is_chrome_firefox) $('.top-login-warning').addClass('hidden');	
	$('.login-checkbox,.top-login-popup .radio-txt').unbind('click');
	$('.login-checkbox,.top-login-popup .radio-txt').bind('click',function(e)
	{
		var c = $('.login-checkbox').attr('class');
		if (c.indexOf('checkboxOff') > -1) $('.login-checkbox').attr('class','login-checkbox checkboxOn');
		else $('.login-checkbox').attr('class','login-checkbox checkboxOff');
	});	
	$('.top-dialog-login-button').unbind('click');
	$('.top-dialog-login-button').bind('click',function(e)
	{
		tooltiplogin();
	});	
	$('#login-name').unbind('focus');
	$('#login-name').bind('focus',function(e)
	{		
		if ($(this).val() == l[195]) $(this).val('');	
	});	
	$('#login-name').unbind('blur');
	$('#login-name').bind('blur',function(e)
	{		
		if ($(this).val() == '') $(this).val(l[195]);	
	});	
	$('#login-password').unbind('focus');
	$('#login-password').bind('focus',function(e)
	{
		if ($(this).val() == l[909])
		{
			$(this).val('');
			$(this)[0].type = 'password';
		}
	});
	$('#login-password').unbind('blur');
	$('#login-password').bind('blur',function(e)
	{
		if ($(this).val() == '')
		{
			$(this).val(l[909]);
			$(this)[0].type = 'text';
		}
	});	
	$('.top-login-full').unbind('click');
	$('.top-login-full').bind('click',function(e)
	{
		loginDialog(1);
		document.location.hash = 'login';
	});	
	$('#login-password, #login-name').unbind('keydown');
	$('#login-password, #login-name').bind('keydown',function(e)
	{
		$('.top-login-pad').removeClass('both-incorrect-inputs');
		$('.top-login-input-tooltip.both-incorrect').removeClass('active');
		$('.top-login-input-block.password').removeClass('incorrect');
		$('.top-login-input-block.e-mail').removeClass('incorrect');
		if (e.keyCode == 13) tooltiplogin();
	});	
	
	$('.top-login-warning-close').unbind('click');
	$('.top-login-warning-close').bind('click',function(e)
	{
		if ($('.loginwarning-checkbox').attr('class').indexOf('checkboxOn') > -1) localStorage.hideloginwarning=1;
		$('.top-login-warning').addClass('hidden');	
	});	
	$('.loginwarning-checkbox,.top-login-warning .radio-txt').unbind('click');
	$('.loginwarning-checkbox,.top-login-warning .radio-txt').bind('click',function(e)
	{		
		var c = '.loginwarning-checkbox',c2 = $(c).attr('class');
		$(c).removeClass('checkboxOn checkboxOff');		
		if (c2.indexOf('checkboxOff') > -1) $(c).addClass('checkboxOn');
		else $(c).addClass('checkboxOff');
	});	
	$('.top-login-popup').addClass('active');
}


function tooltiplogin()
{
	var e = $('#login-name').val();
	if (e == '' || e == l[195] || checkMail(e)) 
	{
		$('.top-login-input-block.e-mail').addClass('incorrect');
		$('#login-name').val('');
		$('#login-name').focus();
	}
	else if ($('#login-password').val() == '' || $('#login-password').val() == l[909]) $('.top-login-input-block.password').addClass('incorrect');
	else
	{
		$('.top-dialog-login-button').html('<img alt="" src="'+staticpath+'images/mega/ajax-loader.gif">');
		$('.top-dialog-login-button').addClass('loading');
		if ($('.loginwarning-checkbox').attr('class').indexOf('checkboxOn') > -1) localStorage.hideloginwarning=1;
		var remember;			
		if ($('.login-checkbox').attr('class').indexOf('checkboxOn') > -1) remember=1;
		postLogin($('#login-name').val(),$('#login-password').val(),remember,function(r)
		{
			$('.top-dialog-login-button').html(l[171]);
			$('.top-dialog-login-button').removeClass('loading');
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
				$('.top-login-pad').addClass('both-incorrect-inputs');
				$('.top-login-input-tooltip.both-incorrect').addClass('active');
				$('#login-password').select();
			}				
		});
	}
}


function mLogout()
{
	$.dologout = function()
	{
		if ((fminitialized && downloading) || ul_uploading)
		{
			msgDialog('confirmation',l[967],l[377] + ' ' + l[507]+'?',false,function(e)
			{
				if (e)
				{
					if (downloading) 
					{
						dl_cancel();
						dl_queue=[];
					}
					if (ul_uploading)
					{
						ul_cancel();
						ul_queue=[];
					}
					$.dologout();
				}
			});
		}
		else
		{
			u_logout(1);
			if (is_chrome_firefox) document.location.href =  'chrome://mega/content/' + urlrootfile;
			else init_page();
		}
	}

	var cnt=0;
	if (M.c[M.RootID] && u_type === 0) for (var i in M.c[M.RootID]) cnt++;			
	if (u_type === 0 && cnt > 0)
	{
		msgDialog('confirmation',l[1057],l[1058],l[1059],function(e)
		{
			if (e) $.dologout();								
		});
	}
	else $.dologout();
}



function topmenuUI()
{
	if (u_type === 0) $('.top-login-button').text(l[967]);
	$('.cloud-popup-icon').hide();
	$('.warning-popup-icon').addClass('hidden');
	$('.top-menu-item.upgrade-your-account,.context-menu-divider.upgrade-your-account').hide();
	$('.top-menu-item.register,.top-menu-item.login').hide();	
	$('.top-menu-item.logout,.context-menu-divider.logout').hide();
	$('.top-menu-item.clouddrive,.top-menu-item.account').hide();
	$('.activity-status,.activity-status-block').hide();
	$('.membership-status').removeClass('free');
	$('.membership-status').hide();	
	$('.top-head .user-name').hide();	
	if (fminitialized) $('.top-search-bl').show();
	else $('.top-search-bl').hide();
	$('.fm-avatar').hide();	
	if (u_type)
	{		
		$('.top-menu-item.logout,.context-menu-divider.logout').show();		
		$('.top-menu-item.clouddrive,.top-menu-item.account').show();		
		$('.fm-avatar').show();
		if (u_attr.p)
		{	
			$('.membership-icon-pad .membership-icon').attr('class','membership-icon pro' + u_attr.p);			
			if (u_attr.p == 1) $('.membership-icon-pad .membership-big-txt.red').text('PRO I');
			else if (u_attr.p == 1) $('.membership-icon-pad .membership-big-txt.red').text('PRO II');
			else if (u_attr.p == 1) $('.membership-icon-pad .membership-big-txt.red').text('PRO III');
			
			$('.membership-status').addClass('pro');
			$('.membership-status').html('PRO');			
			$('.membership-popup.pro-popup');		
		}
		else
		{
			$('.top-menu-item.upgrade-your-account,.context-menu-divider.upgrade-your-account').show();
			$('.membership-status').addClass('free');
			$('.membership-status').html(l[435]);	
		}		
		$('.membership-status').show();
	}
	else
	{
		if (u_type === 0)
		{
			$('.top-menu-item.register').text(l[968]);
			$('.top-menu-item.clouddrive').show();
			$('.warning-popup-icon').removeClass('hidden');
			$('.warning-icon-area').unbind('click');
			$('.warning-icon-area').bind('click',function(e)
			{
				var c= $('.top-warning-popup').attr('class');
				if (c && c.indexOf('active') > -1) $('.top-warning-popup').removeClass('active');
				else $('.top-warning-popup').addClass('active');
			});
			$('.top-warning-popup').unbind('click');
			$('.top-warning-popup').bind('click',function(e)
			{
				$('.top-warning-popup').removeClass('active');
				document.location.hash = 'register';
			});
			
		}
		$('.top-menu-item.upgrade-your-account').show();
		$('.top-menu-item.upgrade-your-account').text(l[129]);
		$('.membership-status-block').hide();
		$('.create-account-button').show();
		$('.create-account-button').unbind('click');
		$('.create-account-button').bind('click',function()
		{
			document.location.hash = 'register';
		});
		$('.top-login-button').show();
		$('.top-login-button').unbind('click');
		$('.top-login-button').bind('click',function()
		{
			if (u_type === 0) mLogout();
			else
			{			
				var c = $('.top-login-popup').attr('class');
				if (c && c.indexOf('active') > -1) loginDialog(1);
				else loginDialog();
			}
		});
		$('.top-menu-item.register,.context-menu-divider.register,.top-menu-item.login').show();		
		if (u_type === 0)
		{
			$('.top-menu-item.login').hide();
			$('.top-menu-item.logout,.context-menu-divider.logout').show();
		}		
		$('.top-login-arrow').css('margin-right',$('.top-menu-icon').width()+$('.create-account-button').width()+($('.top-login-button').width()/2)+78+'px');
	}
	$('.top-menu-arrow').css('margin-right',$('.top-menu-icon').width()/2+'px');
	$.hideTopMenu = function(e)
	{
		var c;
		if (e) c = $(e.target).attr('class');
		if (!e || ($(e.target).parents('.membership-popup').length == 0 && ((c && c.indexOf('membership-status') == -1) || !c)) || (c && c.indexOf('membership-button') > -1))
		{
			$('.membership-popup').removeClass('active');
			$('.membership-status-block').removeClass('active');
		}
		if (!e || ($(e.target).parents('.top-menu-popup').length == 0 && ((c && c.indexOf('top-menu-icon') == -1) || !c)))
		{
			$('.top-menu-popup').removeClass('active');
			$('.top-menu-icon').removeClass('active');
		}
		if (!e || ($(e.target).parents('.top-warning-popup').length == 0 && ((c && c.indexOf('warning-icon-area') == -1) || !c)))
		{
			$('.top-warning-popup').removeClass('active');
		}		
		if (!e || ($(e.target).parents('.top-user-status-popup').length == 0 && ((c && c.indexOf('activity-status') == -1) || !c)))
		{
			$('.top-user-status-popup').removeClass('active');
			$('.activity-status-block').removeClass('active');
		}
		if (!e || ($(e.target).parents('.notification-popup').length == 0 && ((c && c.indexOf('cloud-popup-icon') == -1) || !c)))
		{
			$('.notification-popup').addClass('hidden');
			$('.cloud-popup-icon').removeClass('active');
		}		
		if (!e || ($(e.target).parents('.top-login-popup').length == 0 && ((c && c.indexOf('top-login-button') == -1) || !c)))
		{
			$('.top-login-popup').removeClass('active');
		}
		if ((!e || $(e.target).parents('.create-new-folder').length == 0) && (!c || c.indexOf('fm-new-folder') == -1))
		{			
			var c3;
			if (e && e.target) c3 = $(e.target).parent().attr('class');
			if (!c3 || c3.indexOf('fm-new-folder') == -1) $('.fm-new-folder').removeClass('active');
		}		
		if ((!e || $(e.target).parents('.fm-add-user,.add-user-popup').length == 0) && (!c || c.indexOf('fm-add-user') == -1))
		{
			$('.fm-add-user').removeClass('active');
		}
	}	
	$('#pageholder').unbind('click');
	$('#pageholder').bind('click',function(e)
	{
		$.hideTopMenu(e);
	});
	
	$('#startholder').unbind('click');
	$('#startholder').bind('click',function(e)
	{
		$.hideTopMenu(e);
	});
		
	$('.top-menu-icon').unbind('click');
	$('.top-menu-icon').bind('click',function(e) 
	{   
		if ($(this).attr('class').indexOf('active') == -1)
	    {
			$(this).addClass('active');
			$('.top-menu-popup').addClass('active');
		} 
		else 
		{
			$(this).removeClass('active');
			$('.top-menu-popup').removeClass('active');
		}
	});	
	$('.activity-status-block').unbind('click');
	$('.activity-status-block').bind('click',function(e) 
	{   
		if ($(this).attr('class').indexOf('active') == -1)
	    {   
			$(this).addClass('active');
			$('.top-user-status-popup').addClass('active');
		}
		else 
		{
			$(this).removeClass('active');
			$('.top-user-status-popup').removeClass('active');
		}
	});	
	$('.top-user-status-item').unbind('click');
	$('.top-user-status-item').bind('click',function(e) 
	{   
		if ($(this).attr('class').indexOf('active') == -1)
	    {
			$('.top-user-status-item').removeClass('active');
			$(this).addClass('active');
			$('.activity-status-block').find('.activity-status').attr('class', $(this).find('.activity-status').attr('class'));
			$('.activity-status-block').removeClass('active');
			$('.top-user-status-popup').removeClass('active');
		} 
	});	
	$('.membership-status-block').unbind('click');
	$('.membership-status-block').bind('click',function(e) 
	{   
		$('.membership-popup .membership-loading').show();
		$('.membership-popup .membership-main-block').hide();
		
		if ($(this).attr('class').indexOf('active') == -1)
	    {
			$(this).addClass('active');			
			if (u_attr.p) $('.pro-popup').addClass('active');
			else $('.free-popup').addClass('active');			
			M.accountData(function(account)
			{				
				var perc,warning,perc_c;				
				$('.membership-popup .membership-loading').hide();				
				$('.membership-popup .membership-main-block').show();
				if (u_attr.p)
				{
					$('.membership-popup.pro-popup .membership-icon').addClass('pro' + u_attr.p);				
					$('.membership-popup.pro-popup .membership-icon-txt-bl .membershtip-medium-txt').html(l[987] + ' <span class="red">' + time2date(account.expiry) + '</span>');
				}
				else
				{
					$('.membership-popup .upgrade-account').unbind('click');
					$('.membership-popup .upgrade-account').bind('click',function()
					{
						document.location.hash = 'pro';						
					});
				}				
				if (account.balance && account.balance[0] && account.balance[0][0] > 0) $('.membership-popup .membership-price-txt .membership-big-txt').html('&euro; ' + htmlentities(account.balance[0][0]));				
				else $('.membership-popup .membership-price-txt .membership-big-txt').html('&euro; 0.00');				
				perc = Math.round(account.space_used / account.space * 100);
				perc_c=perc;
				if (perc_c > 100) perc_c=100;
				$('.membership-popup .membership-circle-bg.blue-circle').attr('class','membership-circle-bg blue-circle percents-' + perc_c);
				$('.membership-popup .membership-circle-bg.blue-circle').html(perc + '<span class="membershtip-small-txt">%</span>');
				var b1 = bytesToSize(account.space_used);
				b1 = b1.split(' ');				
				b1[0] = Math.round(b1[0]) + ' ';				
				var b2 = bytesToSize(account.space);
				b2 = b2.split(' ');				
				b2[0] = Math.round(b2[0]) + ' ';
				
				warning ='';
				if (perc > 99) warning = '<div class="account-warning-icon"><span class="membership-notification"><span><span class="yellow">' + l[34] + '</span> ' + l[1010] + '. ' + l[1011] + ' <a href="#pro"  class="upgradelink">' + l[920] + '</a></span><span class="membership-arrow"></span></span>&nbsp;</div>';
				else if (perc > 80) warning = '<div class="account-warning-icon"><span class="membership-notification"><span><span class="yellow">' + l[34] + '</span> ' + l[1012] + ' ' + l[1013] + ' <a href="#pro"  class="upgradelink">' + l[920] + '</a></span><span class="membership-arrow"></span></span>&nbsp;</div>';
				
				var usedspace = '<span class="membershtip-small-txt">' + l['439a'].replace('[X1]','<span class="blue lpxf">' + htmlentities(b1[0]) + '<span class="membershtip-small-txt">' + htmlentities(b1[1]) + '</span></span>').replace('[X2]','<span class="lpxf">' + htmlentities(b2[0]) + '</span>' + ' <span class="membershtip-small-txt">' + htmlentities(b2[1]) + '</span>') + '</span>';
				
				var usedspacetxt = l[799];				
				if (lang == 'de') usedspacetxt = l[799].charAt(0).toLowerCase() + l[799].slice(1);
				
				$('.membership-usage-txt.storage').html('<div class="membership-big-txt">' + usedspace + '</div><div class="membershtip-medium-txt">' + usedspacetxt + warning + '</div>');
				
				if (perc > 80) $('.membership-usage-txt.storage').addClass('exceeded');
				
				perc = Math.round((account.servbw_used+account.downbw_used)/account.bw*100);
								
				perc_c=perc;
				if (perc_c > 100) perc_c=100;
				
				$('.membership-popup .membership-circle-bg.green-circle').attr('class','membership-circle-bg green-circle percents-' + perc_c);
				$('.membership-popup .membership-circle-bg.green-circle').html(perc + '<span class="membershtip-small-txt">%</span>');
				var b1 = bytesToSize(account.servbw_used+account.downbw_used);
				b1 = b1.split(' ');				
				b1[0] = Math.round(b1[0]) + ' ';				
				var b2 = bytesToSize(account.bw);
				b2 = b2.split(' ');
				b2[0] = Math.round(b2[0]) + ' ';
				
				var waittime = '30 minutes';
				
				warning ='';
				if (perc > 99 && !u_attr.p) warning = '<div class="account-warning-icon"><span class="membership-notification"><span><span class="yellow">' + l[34] + '</span> <span class="red">' + l[17].toLowerCase() + '</span><br /> ' + l[1054].replace('[X]','<span class="green">' + waittime + '</span>') + ' ' + l[1055] + ' <a href="#pro"  class="upgradelink">' + l[920] + '</a></span><span class="membership-arrow"></span></span>&nbsp;</div>';
				else if (perc > 99 && u_attr.p) warning = '<div class="account-warning-icon"><span class="membership-notification"><span><span class="yellow">' + l[34] + '</span> ' + l[1008] + ' ' + l[1009] + ' <a href="#pro" class="upgradelink">' + l[920] + '</a></span><span class="membership-arrow"></span></span>&nbsp;</div>';
				else if (perc > 80) warning = '<div class="account-warning-icon"><span class="membership-notification"><span><span class="yellow">' + l[34] + '</span> ' + l[1053] + ' ' + l[1009] + ' <a href="#pro" class="upgradelink">' + l[920] + '</a></span><span class="membership-arrow"></span></span>&nbsp;</div>';
				
				
				
				var usedbw = '<span class="membershtip-small-txt">' + l['439a'].replace('[X1]','<span class="green lpxf">' + htmlentities(b1[0]) + '<span class="membershtip-small-txt">' + htmlentities(b1[1]) + '</span></span>').replace('[X2]','<span class="lpxf">' + htmlentities(b2[0]) + '</span>' + ' <span class="membershtip-small-txt">' + htmlentities(b2[1]) + '</span>') + '</span>';							
				var usedbwtxt = l[973];				
				if (lang == 'de') usedbwtxt = l[973].charAt(0).toLowerCase() + l[973].slice(1);
				
				$('.membership-usage-txt.bandwidth').html('<div class="membership-big-txt">' + usedbw + '</div><div class="membershtip-medium-txt">' + usedbwtxt + warning + '</div>');
				
				if (perc > 80) $('.membership-usage-txt.bandwidth').addClass('exceeded');

				
				$('.membership-popup .membership-button').unbind('click');
				$('.membership-popup .membership-button').bind('click',function(e)
				{					
					document.location.hash = 'fm/account';
					$.hideTopMenu(e);
				});			
			});
		} 
		else 
		{
			$(this).removeClass('active');
			if ($(this).find('.membership-status').attr('class').indexOf('free') == -1) $('.pro-popup').removeClass('active');
			else $('.free-popup').removeClass('active');
		}
	});	
	$('.top-menu-popup .top-menu-item').unbind('click');
	$('.top-menu-popup .top-menu-item').bind('click',function()
	{
		$('.top-menu-popup').removeClass('active');
		$('.top-menu-icon').removeClass('active');
		var c = $(this).attr('class');
		if (!c) c='';
		if (c.indexOf('privacycompany') > -1) document.location.hash = 'privacycompany';
		else if (c.indexOf('upgrade-your-account') > -1) document.location.hash = 'pro';
		else if (c.indexOf('register') > -1) document.location.hash = 'register';
		else if (c.indexOf('login') > -1) document.location.hash = 'login';
		else if (c.indexOf('aboutus') > -1) document.location.hash = 'about';
		else if (c.indexOf('megablog') > -1) document.location.hash = 'blog';
		else if (c.indexOf('credits') > -1) document.location.hash = 'credits';
		else if (c.indexOf('chrome') > -1) document.location.hash = 'chrome';
		else if (c.indexOf('resellers') > -1) document.location.hash = 'resellers';
		else if (c.indexOf('firefox') > -1) document.location.hash = 'firefox';
		else if (c.indexOf('mobile') > -1) document.location.hash = 'mobile';
		else if (c.indexOf('sync') > -1) document.location.hash = 'sync';
		else if (c.indexOf('help') > -1) document.location.hash = 'help';
		else if (c.indexOf('contact') > -1) document.location.hash = 'contact';
		else if (c.indexOf('sitemap') > -1) document.location.hash = 'sitemap';
		else if (c.indexOf('sdk') > -1) document.location.hash = 'sdk';
		else if (c.indexOf('doc') > -1) document.location.hash = 'doc';
		else if (c.indexOf('affiliateterms') > -1) document.location.hash = 'affiliateterms';
		else if (c.indexOf('aff') > -1) document.location.hash = 'affiliates';
		else if (c.indexOf('terms') > -1) document.location.hash = 'terms';		
		else if (c.indexOf('privacypolicy') > -1) document.location.hash = 'privacy';
		else if (c.indexOf('copyright') > -1) document.location.hash = 'copyright';
		else if (c.indexOf('takedown') > -1) document.location.hash = 'takedown';
		else if (c.indexOf('account') > -1) document.location.hash = 'fm/account';		
		else if (c.indexOf('languages') > -1) languageDialog();	
		else if (c.indexOf('clouddrive') > -1) document.location.hash = 'fm';
		else if (c.indexOf('logout') > -1)
		{
			mLogout();
		}
	});
	
	$('.top-search-input').unbind('focus');
	$('.top-search-input').bind('focus',function() 
	{
		$('.top-search-bl').addClass('active');
		if ($(this).val() == l[102]) $(this).val('');
    });	
	
	$('.top-search-input').unbind('blur');
	$('.top-search-input').bind('blur',function()
	{
		$(this).closest('.top-search-bl').removeClass('active');
        if ($(this).val() == '')
		{
			$(this).val(l[102]);
			$('.top-search-bl').removeClass('contains-value');
		}
		else $('.top-search-bl').addClass('contains-value');
    });
	
	$('.top-clear-button').unbind('click');
	$('.top-clear-button').bind('click',function() 
	{
		$('.top-search-input').val(l[102]);
		$('.top-search-bl').removeClass('contains-value');
	});
	
	$('.top-search-input').unbind('keyup');
	$('.top-search-input').bind('keyup',function(e) 
	{
		if (e.keyCode == 13 && ($('.top-search-input').val().length > 2 || !asciionly($('.top-search-input').val())))
		{
			document.location.hash = '#fm/search/' + $('.top-search-input').val();
		}
    });
	
	if (avatars[u_handle]) $('.fm-avatar img').attr('src',avatars[u_handle].url);	
	$('.fm-avatar img').unbind('click');
	$('.fm-avatar img').bind('click',function(e)
	{	
		if ($(this).attr('src').indexOf('blob:') > -1) document.location.hash = 'fm/account';
		else avatarDialog();
	});
	
	$('.top-head .logo').unbind('click');
	$('.top-head .logo').bind('click',function(e)
	{
		document.location.hash = '#';	
	});	
	
	var c = $('.fm-dialog.registration-success').attr('class');
	if (c.indexOf('hidden') == -1)
	{
		$('.fm-dialog.registration-success').addClass('hidden');
		$('.fm-dialog-overlay').addClass('hidden');
	}
	
	if (page.substr(0,2) !== 'fm' && u_type == 3 && !avatars[u_handle]) M.avatars();	
	if (ul_uploading || downloading) $('.widget-block').removeClass('hidden');	
	
	$('.widget-block').unbind('click');
	$('.widget-block').bind('click',function(e)
	{
		if ($.infoscroll && page == 'download') startpageMain();
		else if ($.dlhash) document.location.hash = $.dlhash;	
		else document.location.hash ='fm';	
	});
	
	if (M && M.currentdirid && M.currentdirid.substr(0,7) == 'search/')
	{		
		$('.top-search-bl').addClass('contains-value');
		$('.top-search-bl input').val(M.currentdirid.replace('search/',''));	
	}
	
	if (u_type) $('.membership-popup-arrow').css('margin-right',$('.top-menu-icon').width()+$('.membership-status-block').width()/2+90+'px');
	initNotifications();		
}



function is_fm()
{
	if ((u_type !== false && page == '') || (u_type !== false && page.substr(0,2) == 'fm') || (u_type !== false && page == 'start') || (u_type !== false && page.substr(0,7) == 'account') || pfid) return true;
	else return false;	
}


function parsepage(pagehtml,pp)
{
	$('#fmholder').hide();
	$('#pageholder').hide();
	$('#startholder').hide();
	megatitle();
	pagehtml = translate(pagehtml);
	pagehtml = pagehtml.replace(/{staticpath}/g,staticpath);
	if (document.location.href.substr(0,19) == 'chrome-extension://') pagehtml = pagehtml.replace(/\/#/g, '/' + urlrootfile + '#');	
	$('body').removeClass('notification-body bottom-pages new-startpage');		
	if (page == 'notifications') $('body').addClass('notification-body');
	else if (page == 'start') $('body').addClass('new-startpage');
	else $('body').addClass('bottom-pages');
	var top = parsetopmenu();		
	var bmenu = pages['bottom'];
	var bmenu2 = pages['bottom2'];
	if (document.location.href.substr(0,19) == 'chrome-extension://') bmenu2 = bmenu2.replace(/\/#/g,'/' + urlrootfile + '#');		
	pagehtml= pagehtml.replace("((MEGAINFO))",translate(pages['megainfo']).replace(/{staticpath}/g,staticpath));
	pagehtml= pagehtml.replace("((TOP))",top);			
	pagehtml= pagehtml.replace("((BOTTOM))",translate(bmenu2));
	$('#startholder').html(translate(pages['transferwidget'])+pagehtml);
	$('#startholder').show();
	mainScroll();
	$(window).unbind('resize.subpage');
	$(window).bind('resize.subpage',function(e)
	{
		if (page !== 'start' && page !== 'download') mainScroll();			
	});
	$('.nw-bottom-block').addClass(lang);
	UIkeyevents();	
}


function parsetopmenu()
{
	var top = pages['top'].replace(/{staticpath}/g,staticpath);	
	if (document.location.href.substr(0,19) == 'chrome-extension://') top = top.replace(/\/#/g,'/' + urlrootfile + '#');
	top = translate(top);
	return top;
}




window.onhashchange = function()
{	
	var tpage = document.location.hash;	
	if (silent_loading)
	{
		document.location.hash = hash;
		return false;	
	}	
	if (tpage == '#info' && page == 'start')
	{
		if (!$.infoscroll) startpageScroll();
		return false;
	}
	
	if ((tpage == '#' || tpage == '' || tpage == 'start') && page == 'start')
	{
		if ($.infoscroll) startpageMain();
		return false;
	}
	
	if (document.getElementById('overlay').style.display == '' && !is_fm())
	{			
		document.location.hash = hash;
		return false;
	}
	
	dlid=false;
	hash = window.location.hash;
	if (window.location.hash) page = window.location.hash.replace('#','');
	else page = '';
	
	if (page)
	{
		for (var p in subpages)
		{
			if (page && page.substr(0,p.length) == p)	
			{
				for (i in subpages[p])
				{
					if (!jsl_loaded[jsl2[subpages[p][i]].n]) jsl.push(jsl2[subpages[p][i]]);								
				}
			}
		}
	}
		
	if (jsl.length > 0)
	{
		loadingDialog.show();
		jsl_start();
	}
	else init_page();
}




function languageDialog(close)
{
	if (close)
	{
		$('.fm-dialog.languages-dialog').addClass('hidden');
		$('.fm-dialog-overlay').addClass('hidden');
		$.dialog=false;
		return false;
	}
	var html = '<div class="nlanguage-txt-block">';	
	var i=1,total=0,a=0,sel='';
	for (var la in languages) total++;
	for (var la in languages)
	{			
		if (ln2[la])
		{	
			if (la == lang) sel = ' selected';
			else sel='';
			html += '<a href="#" id="nlanguagelnk_'+la+'" class="nlanguage-lnk'+sel+'"><span class="nlanguage-tooltip"> <span class="nlanguage-tooltip-bg"> <span class="nlanguage-tooltip-main"> '+ ln2[la] + '</span></span></span>'+ ln[la] + '</a><div class="clear"></div>';		
			if (i == Math.round(total/4) && a+1 < total)
			{
				html +='</div><div class="nlanguage-txt-block">';
				i=0;		
			}
			i++;
			a++;
		}
	}
	html += '</div><div class="clear"></div>';	
	$('.languages-dialog-body').html(html);	
	$('.fm-dialog.languages-dialog').removeClass('hidden');
	$('.fm-dialog-overlay').removeClass('hidden');
	$.dialog='languages';	
	$('.fm-dialog.languages-dialog .fm-dialog-close').unbind('click');
	$('.fm-dialog.languages-dialog .fm-dialog-close').bind('click',function(e)
	{
		languageDialog(1);		
	});
	
	$('.fm-languages-save').unbind('click');
	$('.fm-languages-save').bind('click',function(e)
	{
		languageDialog(1);
		setTimeout(function()
		{
			var lng = $('.nlanguage-lnk.selected').attr('id');
			lng = lng.replace('nlanguagelnk_','');
			if (lng !== lang)
			{				
				localStorage.lang = lng;
				document.location.reload();
			}
		},100);
	});	
	$('.nlanguage-lnk').unbind('click');
	$('.nlanguage-lnk').bind('click',function(e)
	{
		$('.nlanguage-lnk').removeClass('selected');
		$(this).addClass('selected');
		return false;
	});
}

window.onbeforeunload = function ()
{
	if (downloading || ul_uploading) return l[377];
}



