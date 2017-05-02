
function init_start() {

    $(window).rebind('resize.startpage', function(e) {
        if (page === 'start' && $.infoscroll) {
            startscrollIgnore(1000);
            jScrollStart();
        }
    });
    $('.startpage.scroll-button').rebind('click', function(event) {
        startpageScroll();
    });

    var el = '.startpage.vertical-centered-bl';

    $(el).rebind('mousewheel', function(e) {
        if (e && e.originalEvent
                && (e.originalEvent.wheelDelta < 0
                    || e.originalEvent.deltaY > 0) && !$.infoscroll) {
            startpageScroll();
        }
    });
    if (page === 'start') {
        InitFileDrag();
    }
    if (getSitePath() === '/info') {
        startpageScroll(1);
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
    $('.startpage.scroll-block').jScrollPane({
        showArrows: true,
        arrowSize: 5,
        animateScroll: true
    });
    jScrollFade('.startpage.scroll-block');
    $('.startpage.scroll-block').rebind('jsp-scroll-y.back', function(event, scrollPositionY, isAtTop, isAtBottom) {
        if (isAtTop && !$.scrollIgnore) {
            startpageMain();
        }
        else if (!isAtTop) {
            startscrollIgnore(500);
        }
    });
}


function startpageScroll(blockSwing) {
	
	start_counts();
	
    $.infoscroll = true;
    if ($.hideTopMenu) {
        $.hideTopMenu();
    }
    var el = '.startpage.vertical-centered-bl';
    $(el).addClass('active');
    $('.startpage.full-block').removeClass('hidden');

    if (blockSwing) {
        $('.startpage.scroll-block').scrollTop($('.pages-nav.content-block.startpage').position().top);
        startpageJSP();
    }
    else {
        $.startscrolling = true;
        $('.startpage.scroll-block').animate({
            scrollTop: $('.pages-nav.content-block.startpage').position().top
        }, '300', 'swing', function() {
            setTimeout(startpageJSP, 50);
            $.startscrolling = false;
        });
    }
}

function startpageMain() {
    $.infoscroll = false;
    if (page === 'download') {
        $('.widget-block').hide();
    }
    var el = '.startpage.vertical-centered-cell';
    //$(el).show();
    $('.top-head').show();
    deleteScrollPanel('.st-main-block', 'jsp');
    $('.startpage.scroll-block').scrollTop($('.st-main-block').height());
    $.startscrolling = true;
    $('.startpage.scroll-block').animate({
        scrollTop: 0
    }, '300', 'swing', function() {
        var el = '.st-mid-white-block';
    });
    setTimeout(function() {
        var el = '.startpage.vertical-centered-bl';
        $(el).removeClass('active');
        $.startscrolling = false;
    }, 295);
}


function startpageJSP() {
    //$('.startpage.vertical-centered-cell').hide();
    $('.top-head').hide();
    $('.startpage.scroll-block').scrollTop(0);
    jScrollStart();
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

function fliperInit() {
  
  var count = 10;
  
  $(".flip--top, .flip--bottom").text(count);
  $(".flip--next, .flip--back").text(count + 1);
  
  
  $(".flip--back").on('webkitAnimationIteration oanimationiteration msAnimationIteration animationiteration', function() {
    // $("body").toggleClass("fuckingred");
    count++
    $(".flip--top, .flip--bottom").text(count);
    $(".flip--next, .flip--back").text(count + 1);
  });
}

fliperInit();