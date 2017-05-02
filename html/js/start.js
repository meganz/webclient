
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
			start_countdata=res;
			start_countdata.timestamp = Date.now();
			start_APIcount_inflight=false;
			if (!start_countUpdate_inflight) start_countUpdate();	
		}
	});
}

start_countUpdate_inflight=false;
startCountRenderData = {'users':'','files':''};


function start_countUpdate() {
	start_countUpdate_inflight=true;	
	if (page !== 'start') {
		start_countUpdate_inflight=false;
		return false;
	}

	var usertotal = start_countdata.confirmedusers.total;
	var filetotal = start_countdata.files.total;
	var rate = (Date.now() - start_countdata.timestamp) / 86400000;
		
	usertotal += Math.round(rate * start_countdata.confirmedusers.dailydelta);
	filetotal += Math.round(rate * start_countdata.files.dailydelta);
	
	start_countdata.usertotal = usertotal;
	start_countdata.filetotal = filetotal;
	start_countdata.ts = start_countdata.timestamp;
	
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
	renderCounts(String(usertotal),'users');	
	renderCounts(String(filetotal),'files');
	setTimeout(start_countUpdate,30);
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