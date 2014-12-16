
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
	/*
	if (m)
	{
		crypto_rsagenkey();
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
	*/
	
	$('.key1').addClass('hidden');
	$('.key2').removeClass('hidden');
	if (typeof u_privk == 'undefined')
	{
		crypto_rsagenkey();
		u_ed25519();
	}
	else ui_keycomplete();	
}


function key_step2()
{
	$.killarkanoid=true;
	$('.key1').addClass('hidden');
	$('.key2').removeClass('hidden');
	if (typeof u_privk == 'undefined')
	{
		crypto_rsagenkey();
		u_ed25519();
	}
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

function ui_keycomplete()
{
    $('.key1').addClass('hidden');
	$('.key2').addClass('hidden');
	$('.key3').removeClass('hidden');
    if(typeof(u_attr.p) != 'undefined' && (u_attr.p == 1 || u_attr.p == 3 || u_attr.p == 3)) {
        document.location.hash = 'fm';
    } else {
        init_pro();
        mainScroll();
    }
}

