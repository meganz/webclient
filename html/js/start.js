function init_start() {
        
    $('.pages-nav.nav-button').removeClass('active');
    $('.pages-nav.nav-button.overview').addClass('active');

    $(window).rebind('resize.startpage', function(e) {
        if (page === 'start' && $.infoscroll) {
            startscrollIgnore(1000);
            jScrollStart();
        }
    });

    $('.button-48-height.register').rebind('click', function () {
        loadSubPage('register');
    });

    $('.bottom-page.scroll-button').rebind('click', function(event) {
        bottompageScroll();
        start_counts();
    });

    $('.bottom-page.vertical-centered-bl').rebind('mousewheel', function(e) {
        if (e && e.originalEvent
                && (e.originalEvent.wheelDelta < 0
                    || e.originalEvent.deltaY > 0) && !$.infoscroll) {
            bottompageScroll();
            start_counts();
        }
    });
    
    $('.reg-st3-membership-bl').rebind('click', function(e) {
        var proPlan = $(this).attr('data-payment');
        loadSubPage('pro' + proPlan);
    });

    if (page === 'start') {
        InitFileDrag();
    }
    else if (page === 'download') {
        $('.widget-block').hide();
    }

    if (getSitePath() === '/info') {
        bottompageScroll(1);
        start_counts();
    }
}

$.jScroll = {};

var start_countdata = false;

function start_counts()
{	
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

function jScrollStart() {
    $('.bottom-page.scroll-block').jScrollPane({
        showArrows: true,
        arrowSize: 5,
        animateScroll: true
    });
    jScrollFade('.bottom-page.scroll-block');
    $('.bottom-page.scroll-block').rebind('jsp-scroll-y.back', function(event, scrollPositionY, isAtTop, isAtBottom) {
        if (isAtTop && !$.scrollIgnore) {
            bottompageMain();
        }
        else if (!isAtTop) {
            startscrollIgnore(500);
        }
    });
}


function bottompageScroll(blockSwing) {
    $.infoscroll = true;
    if ($.hideTopMenu) {
        $.hideTopMenu();
    }

    var $scrollBlock = $('.bottom-page.scroll-block');
    var $navBlock = $('.vertical-centered-bl .pages-nav.content-block');

    $.startscrolling = true;
    $('.bottom-page.full-block').removeClass('hidden');

    $scrollBlock.animate({
        scrollTop: $navBlock.position().top
    }, '300', 'swing', function() {
        $('.top-head').addClass('hidden');
        $('.bottom-page.top-bl').addClass('hidden');
        $('.bottom-page.vertical-centered-bl').addClass('active');
        setTimeout(jScrollStart, 50);
        $scrollBlock.scrollTop($navBlock.position().top);
    });
}

function bottompageMain() {
    $.infoscroll = false;

    deleteScrollPanel('.bottom-page.scroll-block', 'jsp');
    $('.top-head').removeClass('hidden');
    $('.bottom-page.top-bl').removeClass('hidden');
    $('.bottom-page.vertical-centered-bl').removeClass('active');
    $('.bottom-page.scroll-block')
        .scrollTop($('.bottom-page.top-bl').height())
        .animate({
            scrollTop: 0
        }, '300', 'swing', function() {
            setTimeout(function() {
                $.startscrolling = false;
            }, 295);
        });
}


function startscrollIgnore(t) {
    if (!$.scrollIgnore) {
        $.scrollIgnore = 0;
    }
    $.scrollIgnore++;
    setTimeout(function() {
        $.scrollIgnore--;
    }, t);
}
