
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