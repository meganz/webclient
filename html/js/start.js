
var achieve_data = false;

function init_start() {
	if (u_type > 0)
	{
		$('.startpage.register').text(l[164]);
		$('.startpage.register').rebind('click', function () {
			loadSubPage('fm');
		});
		
		$('.startpage.try-mega').text(l[187]);
		$('.startpage.try-mega').rebind('click', function () {
			loadSubPage('fm/dashboard');
		});
	}
	else {
		$('.button-48-height.register').rebind('click', function () {
        loadSubPage('register');
		});
		$('.startpage.try-mega').text(l[16535]);
		$('.startpage.try-mega').rebind('click', function () {
			if (u_type === false) {
				// open file manager with ephemeral account
				u_storage = init_storage(localStorage);
				loadingDialog.show();
				u_checklogin({
					checkloginresult: function(u_ctx, r) {
						u_type = r;
						u_checked = true;
						loadingDialog.hide();
						loadSubPage('fm');
					}
				}, true);
			}
			else loadSubPage('fm');
		});
	}

    $('.reg-st3-membership-bl').rebind('click', function(e) {
        var proPlan = $(this).attr('data-payment');
		if (proPlan == 4) proPlan = 'lite';
        loadSubPage('pro_' + proPlan);
    });

    if (!is_mobile && (page === 'start')) {
        InitFileDrag();
    }
    else if (is_mobile && (page === 'start')) {
        mobile.initMobileAppButton();
    }
    else if (page === 'download') {
        $('.widget-block').hide();
    }
	
	startCountRenderData = {'users':'','files':''};
    start_counts();

	$('.bottom-page.top-header').text($('.bottom-page.top-header').text().replace('[A]','').replace('[/A]',''));

	if (achieve_data) {
		start_achievements(achieve_data);
	}
	else {
		$('.bottom-page.white-block.top-pad.achievements').addClass('hidden');
		api_req({"a":"mafu"}, {
			callback: function(res) {
				achieve_data=res;
				start_achievements(res);
			}
		});
	}
	
	if (u_type > 0)
	{
		//$('.startpage.try-mega').hide();
		
		
	}
}


function start_achievements(res)
{
	if (res && res.u && res.u[4] && res.u[5] && res.u[3]) {
		// enable achievements:
		$('.bottom-page.white-block.top-pad.achievements').removeClass('hidden');	var gbt = 'GB';
		if (lang == 'fr') gbt = 'Go';
		$('.achievements .megasync').html(escapeHTML(l[16632]).replace('[X]','<span class="txt-pad"><span class="big">' + Math.round(res.u[4][0]/1024/1024/1024) + '</span> '+ gbt +'</span>') + '*');
		$('.achievements .invite').html(escapeHTML(l[16633]).replace('[X]','<span class="txt-pad"><span class="big">' + Math.round(res.u[3][0]/1024/1024/1024) + '</span> '+ gbt +'</span>') + '*');
		$('.achievements .mobile').html(escapeHTML(l[16632]).replace('[X]','<span class="txt-pad"><span class="big">' + Math.round(res.u[5][0]/1024/1024/1024) + '</span> '+ gbt +'</span>') + '*');
		$('.achievements .expiry').html('*' + escapeHTML(l[16631]).replace('[X]',parseInt(res.u[5][2].replace('d',''))));
		$('.bottom-page.top-header').html(escapeHTML(l[16536]).replace('[A]','').replace('[/A]','*'));
		$('.bottom-page.asterisktext').removeClass('hidden');
	}
}


var start_countdata = false;

function start_counts() {
	if (start_countdata) return;
	start_countdata=true;
	start_APIcount();
}

start_APIcount_inflight=false;
function start_APIcount() {
	if (start_APIcount_inflight) return;
	start_APIcount_inflight=true;
	api_req({"a":"dailystats"}, {
		callback: function(res) {
			start_APIcountdata=res;
			start_APIcountdata.timestamp = Date.now();
			start_APIcount_inflight=false;
			if (!start_countUpdate_inflight && page == 'start') start_countUpdate();
		}
	});
}

start_countUpdate_inflight=false;
startCountRenderData = {};

var RandomFactorTimestamp = 0;
var start_Lcd = {};

function start_countUpdate() {
	if (!start_countUpdate_inflight) startCountRenderData = {'users':'','files':''};
	start_countUpdate_inflight=true;
	if (page !== 'start') {
		start_countdata=false;
		start_countUpdate_inflight=false;
		return false;
	}
	if (!start_Lcd.users) start_Lcd.users = start_APIcountdata.confirmedusers.total;
	if (!start_Lcd.files) start_Lcd.files = start_APIcountdata.files.total;
	if (!start_Lcd.ts) start_Lcd.ts = start_APIcountdata.timestamp;
	if (!start_Lcd.timestamp) start_Lcd.timestamp = start_APIcountdata.timestamp;
	var filesFactor = 1;
	var usersFactor = 1;
	if (start_Lcd.timestamp+10 < Date.now()) {
		var rate = (Date.now() - start_Lcd.timestamp) / 86400000;
		if (start_APIcountdata.timestamp > start_Lcd.ts+5000 && start_APIcountdata.timestamp+5000 > Date.now()) {
			if (start_Lcd.users > start_APIcountdata.confirmedusers.total) usersFactor = 0.3;
			else if (start_Lcd.users < start_APIcountdata.confirmedusers.total) usersFactor = 2;
			if (start_Lcd.files > start_APIcountdata.files.total) filesFactor = 0.3;
			else if (start_Lcd.files < start_APIcountdata.files.total) filesFactor = 2;
		}
		else {
			filesFactor = 1;
			usersFactor = 1;
		}
		if (RandomFactorTimestamp+500 < Date.now()) {
			filesFactor *= Math.random()*.1-.05;
			RandomFactorTimestamp = Date.now();
		}
		start_Lcd.users += rate * usersFactor * start_APIcountdata.confirmedusers.dailydelta;
		start_Lcd.files += rate * filesFactor * start_APIcountdata.files.dailydelta;
		start_Lcd.timestamp = Date.now();
	}
	function renderCounts(total,type) {
		if (total.length == startCountRenderData[type].length) {
			for (var i = 0, len = total.length; i < len; i++) {
				if (startCountRenderData[type][i] !== total[i])
				document.getElementById(type + '_number_' + i).innerHTML = total[i];
			}
		}
		else {
			var html = '';
			for (var i = 0, len = total.length; i < len; i++) {
				html += '<div class="flip-block"><div class="flip-bg" id="' + type + '_number_' + i + '">' + total[i] + '</div></div>';
			}
			$('.startpage.flip-wrapper.' + type).html(html);
		}
		startCountRenderData[type] = total;
	}
	renderCounts(String(Math.round(start_Lcd.users)),'users');
	renderCounts(String(Math.round(start_Lcd.files)),'files');
	setTimeout(start_countUpdate,30);
	if (start_APIcountdata.timestamp+5000 < Date.now()) start_APIcount();
}
/*
function bottompageScroll() {
    $('.bottom-page.top-bl').height($('body').height());
    $('.bottom-page.scroll-block').jScrollPane({
        showArrows: true,
        arrowSize: 5,
        animateScroll: true
    });
    jScrollFade('.bottom-page.scroll-block');
}

function initBottompageScroll() {
    setTimeout(bottompageScroll, 300);

    $(window).rebind('resize.bottompage', function(e) {
        bottompageScroll()
    });
}
*/