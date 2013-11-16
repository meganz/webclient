
var arkanoid_entropy;


function load_start_arkanoid()
{
	if (typeof Arkanoid == 'undefined')
	{
		setTimeout(load_start_arkanoid,500);
	}
	else start_arkanoid();
}


function init_key()
{
	if (m)
	{
		genkey();
		return false;	
	}		
	$('.register-game-button.start').unbind('click');
	$('.register-game-button.start').bind('click',function(e)
	{
		$('.reg-st4-canvas-block.splash').addClass('hidden');
		$('.reg-st4-canvas-block.game').removeClass('hidden');
		load_start_arkanoid();
	});	
	$('.register-game-button.skip').unbind('click');
	$('.register-game-button.skip').bind('click',function(e)
	{
		key_step2();
	});
	if (typeof Arkanoid == 'undefined' && !silent_loading)
	{	
		jsl.push(jsl2['arkanoid_js']);
		jsl_start();
	}	
	$('.register-st2-button.next').unbind('click');
	$('.register-st2-button.next').bind('click',function(e)
	{
		key_step2();
	});
	
}


function key_step2()
{
	$.killarkanoid=true;
	$('.key1').addClass('hidden');
	$('.key2').removeClass('hidden');
	if (typeof u_privk == 'undefined') genkey();
	else ui_keycomplete();
}

var arkanoid;
function start_arkanoid()
{
	arkanoid = new Arkanoid('canvas');
	arkanoid.start();
	arkanoid_entropy = function()
	{
		if (!$.entropy) $.entropy=0;
		$.entropy++;
		var perc = Math.round($.entropy/256*100);				
		if (perc <= 100)
		{
			$('.membership-circle-bg.game-circle').attr('class','membership-circle-bg game-circle percents-'+perc);
			$('.membership-circle-bg.game-circle').html(perc + '<span class="membershtip-small-txt">%</span>');
		}				
		if (perc >= 100)
		{		
			$('.key1 .top-login-input-tooltip').addClass('active');
			$('.register-st2-button.next').addClass('active');
		}
	};
}

function ui_keyprogress(num)
{
	if (m) document.getElementById('key_progress').style.width= num + '%';
	else
	{
		$('.reg-st5-key-gen').attr('class','reg-st5-key-gen percents-'+num);
		if (num > 50) $('.reg-st5-info-txt').text(l[1145]);
	}
}

function ui_keycomplete()
{
	ui_keyprogress(100);	
	if (m)
	{
		mobilekeygen=false;
		init_page();
	}
	else
	{	
		setTimeout(function()
		{
			if (!u_attr.p) key_step3();
			else
			{
				page = 'key';
				document.location.hash = 'fm';
			}
		},500);
	}
}


function key_step3()
{
	$('.key1').addClass('hidden');
	$('.key2').addClass('hidden');
	$('.key3').removeClass('hidden');	
	init_pro();	
	mainScroll();
}