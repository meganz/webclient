var dev_menutimer=false;
var dev_moving=false;

var sdk_apps = false;

function dev_domovemenu(t,b,c,d)
{
	if (page == 'developers')
	{
		dev_moving=true;
		var top = Math.round(easeOutCubic (t, b, c, d));
		document.getElementById('dev_leftmenu').style.top = top + 'px';
		dev_setmenu(top);
		t++;
		if (t < d) setTimeout(function() {
			dev_domovemenu(t,b,c,d);
		},5);
		else dev_moving=false;
	}
}

function dev_movemenu()
{
	if (page == 'developers')
	{
		dev_menutimer=true;
		var currenttop = document.getElementById('dev_leftmenu').style.top;
		currenttop = currenttop.replace('px','');
		if (currenttop == '') currenttop = 0;
		currenttop = parseInt(currenttop);
		if ($('body').scrollTop() > 110)
		{
			var top = $('body').scrollTop()-120;
			if (top < 0) top =0;
			if ((currenttop != top) && (!dev_moving)) dev_domovemenu(0,currenttop,(top-currenttop),20);
		}
		else if ((currenttop != 0) && (!dev_moving)) dev_domovemenu(0,currenttop,(0-currenttop),20);
		setTimeout(dev_movemenu,10);
	}
	else dev_menutimer=false;
}

var sdk_appid=false;

function thirty_pc()
{
	var windowHeight = $(window).height() - 260;
	$('.account-mid-pad').css('min-height', windowHeight +'px');
}

function dev_init(sub,reload)
{
	$('body').addClass('developers');
	$('#dev_start').hide();
	$('#dev_doc').hide();
	$('#dev_sdk').hide();
	$('#dev_app').hide();
	$(".account-link").unbind('click');
	$(".account-link").bind('click', function(e)
	{
		if ($(this).attr('class').indexOf('selected') == -1)
		{
			$(".dev-new-submenu").addClass('hidden');
			$('.dev-new-submenu-item').removeClass('selected');
			$(".account-link").removeClass('selected');
			$(this).addClass('selected');
			if ($(this).next().attr('class').indexOf('dev-new-submenu') != -1) $(this).next().removeClass('hidden');
		}
	});
	$(".dev-new-submenu-item").unbind('click');
	$(".dev-new-submenu-item").bind('click', function(e)
	{

	});
	$('#a_landing_rad1').unbind('click');
	$('#a_landing_rad1').bind('click', function(e)
	{
		// 30 days
		$('.radioOn').removeClass('radioOn').addClass('radioOff');
		$('#a_landing_rad1')[0].className = 'radioOn';
		$('#a_landing_rad1_div')[0].className = 'radioOn';
	});
	$('#a_landing_rad2').unbind('click');
	$('#a_landing_rad2').bind('click', function(e)
	{
		// 90 days
		$('.radioOn').removeClass('radioOn').addClass('radioOff');
		$('#a_landing_rad2')[0].className = 'radioOn';
		$('#a_landing_rad2_div')[0].className = 'radioOn';
	});
	if (sub == 'doc')
	{
		$('#dev_doc').show();
		$('#a_dev_doc').click();
		if (!u_attr.sdkterms) termsDialog.show();
	}
	else if (sub == 'sdk')
	{
		$('#dev_sdk').show();
		$('#a_dev_sdk').click();
		if (reload || !sdk_apps)
		{

			api_req({a:'apg'},
			{
				callback : function (res)
				{
					sdk_apps = {};
					if (typeof res == 'object')
					{
						for(var key in res)
						{
							if (res[key]) sdk_apps[key] = res[key];
						}
					}
					dev_renderapps();
					loadingDialog.hide();
					console.log(json);
					if (!u_attr.sdkterms) termsDialog.show();
				}
			});
		}
		else if (!u_attr.sdkterms) termsDialog.show();
		else dev_renderapps();
	}
	else
	{
		$('#dev_start').show();
		$('#a_dev').click();
	}
	thirty_pc();
	$(window).unbind('resize');
	$(window).bind('resize', thirty_pc);
	$('.dev-new-delete').unbind('click');
	$('.dev-new-delete').bind('click', function(e)
	{
		Ext.Msg.confirm('Delete App', 'Are you sure you want to permanently delete this app?', function(but)
		{
			if (but === 'yes')
			{
				loadingDialog.show();
				api_req({a:'apd', 'ah': sdk_appid },
				{
					callback : function ()
					{
						dev_init('sdk',true);
					}
				});
			}
		});
		return false;
	});
	$('#dev_createapbtn').unbind('click');
	$('#dev_createapbtn').bind('click', function(e)
	{
		loadingDialog.show();
		api_req({a:'apc'},
		{
			callback : function (res)
			{
				loadingDialog.hide();
				if (typeof res == 'string')
				{
					sdk_apps[res]={};
					dev_app(res);
				}
				else alert(l[200]);
			}
		});
		return false;
	});
	$('#sdkapp_updatebtn').unbind('click');
	$('#sdkapp_updatebtn').bind('click', function(e)
	{
		var status = 0;
		if ($('#a_landing_rad2')[0].checked) status = 1;
		loadingDialog.show();
		api_req({a:'apu', 'ah': sdk_appid, 'name':$('#sdk_appname').val(), 'site': $('#sdk_appsite').val(), 'description': $('#sdk_appdescription').val(), 'publisher': $('#sdk_apppublisher').val(), 'status': status  },
		{
			callback : function ()
			{
				dev_init('sdk',true);
			}
		});
		return false;
	});
	$('#sdkapp_cancelbtn').unbind('click');
	$('#sdkapp_cancelbtn').bind('click', function(e)
	{
		dev_init('sdk');
		return false;
	});

	$('.dev-new-submenu-txt').unbind('click');
	$('.dev-new-submenu-txt').bind('click', function(e)
	{
		var el = $('#doc_' + e.target.id.replace('docmenu_',''));

		console.log(el);

		if (el[0]) el[0].scrollIntoView();
		return false;
	});

}

function dev_renderapps()
{
	var apps_table = '<tr><th scope="col">App Name</th><th scope="col">Key</th><th scope="col">Status</th><th scope="col" class="last"></th></tr>';
	var i=0;
	for(var key in sdk_apps)
	{
		var status = 'Development';
		if (sdk_apps[key].status == 1) status = 'Operational';
		if (sdk_apps[key])
		{
			sdk_apps[key] = sdk_apps[key];
			apps_table += '<tr><td><img alt="" src="' + staticpath + 'images/mega/app-icon.png" style="width:18px;" >' + htmlentities(sdk_apps[key].name) + '</td><td>' + htmlentities(key) +'</td><td>' + status + '</td><td class="last"><a href="#" id="sdk_app_' + htmlentities(key) + '" return false;" class="dev-cog"></a></td></tr>';
			i++;
		}
	}
	if (i == 0) apps_table += '<tr><td colspan="3"><i>You have no apps created yet.</i></td></tr>';
	$('#sdk_appstable').html(apps_table);
	$('.dev-cog').unbind('click');
	$('.dev-cog').bind('click', function(e)
	{
		dev_app(e.currentTarget.id.replace('sdk_app_',''));
		return false;
	});
}

function dev_setmenu(top)
{
	var ar = ['dev_preface_div','dev_authentication_div','dev_datatypes_div','dev_errorresponses_div','dev_clientserver_div','dev_serverclient_div','dev_filetransfers_div'];

	var ar2 = ['a_dev_preface','a_dev_authentication','a_dev_datatypes','a_dev_errorresponses','a_dev_clientserver','a_dev_serverclient','a_dev_filetransfers'];
	for (var i in ar)
	{
		if (document.getElementById(ar[i]).style.display == '')
		{
			var t = document.getElementById(ar[i]).offsetTop;
			var h = document.getElementById(ar[i]).offsetHeight;
			if (d) console.log(top);
			if (d) console.log(t-100);
			if (d) console.log(t+h+100);
			if ((top >= t-100) && (top <= (t+h+100))) dev_menu(ar2[i]);
		}
	}
}

function dev_menu(el)
{
	document.getElementById('a_dev_preface').className = 'account-link';
	document.getElementById('a_dev_authentication').className = 'account-link';
	document.getElementById('a_dev_datatypes').className = 'account-link';
	document.getElementById('a_dev_errorresponses').className = 'account-link';
	document.getElementById('a_dev_clientserver').className = 'account-link';
	document.getElementById('a_dev_serverclient').className = 'account-link';
	document.getElementById('a_dev_filetransfers').className = 'account-link';
	document.getElementById(el).className = 'account-link selected';
}