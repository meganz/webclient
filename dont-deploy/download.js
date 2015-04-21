var dlpage_key,dlpage_ph,dl_next;
var fdl_filename, fdl_filesize, fdl_key, fdl_url, fdl_starttime;
var fdl_file=false;
var dl_import=false;
var dl_attr;
var fdl_queue_var=false;

function dlinfo(ph,key,next)
{
	dl_next = next;
	if ((lang == 'en') || (lang !== 'en' && l[1388] !== '[B]Download[/B] [A]to your computer[/A]'))
	{
		$('.new-download-red-button').html(l[1388].replace('[B]','<div class="new-download-button-txt1">').replace('[/B]','</div>').replace('[A]','<div class="new-download-button-txt2">').replace('[/A]','</div>'));
		$('.new-download-gray-button').html(l[1389].replace('[B]','<div class="new-download-button-txt1">').replace('[/B]','</div>').replace('[A]','<div class="new-download-button-txt2">').replace('[/A]','</div>'));
	}

	$('.widget-block').addClass('hidden');
	if (!m) init_start();
	if (dlMethod == FlashIO)
	{
		$('.fm-dialog.download-dialog').removeClass('hidden');
		$('.fm-dialog.download-dialog').css('left','-1000px');
		$('.download-save-your-file').html('<object data="' + document.location.origin + '/downloader.swf" id="dlswf_'+ htmlentities(ph) + '" type="application/x-shockwave-flash" height="' + $('.download-save-your-file').height() + '"  width="' + $('.download-save-your-file').width() + '"><param name="wmode" value="transparent"><param value="always" name="allowscriptaccess"><param value="all" name="allowNetworking"><param name=FlashVars value="buttonclick=1" /></object>');
	}
	loadingDialog.show();
	$('.download-mid-white-block').addClass('hidden');
	dlpage_ph 	= ph;
	dlpage_key 	= key;
	if (dl_res)
	{
		dl_g(dl_res);
		dl_res = false;
	}
	else api_req({a:'g',p:ph},{callback:dl_g});
    
    // Initialise slide show
    gifSlider.init();
}

function dl_g(res)
{
	$('.widget-block').addClass('hidden');
	loadingDialog.hide();
	$('.download-mid-white-block').removeClass('hidden');
	if (res == ETOOMANY) $('.download-mid-centered-block').addClass('not-available-user');
	else if (typeof res == 'number' && res < 0) $('.download-mid-centered-block').addClass('not-available-some-reason');
	else if (res.e == ETEMPUNAVAIL) $('.download-mid-centered-block').addClass('not-available-temporary');
	else if (res.d) $('.download-mid-centered-block').addClass('not-available-some-reason');
	else if (res.at)
	{
		$('.download-pause').unbind('click');
		$('.download-pause').bind('click',function(e)
		{
			if ($(this).attr('class').indexOf('active') == -1)
			{
				ulQueue.pause();
				dlQueue.pause();
				ui_paused = true;
				$(this).addClass('active');
			}
			else
			{
				dlQueue.resume();
				ulQueue.resume();
				ui_paused = false;
				$(this).removeClass('active');
			}
		});
		$('.new-download-red-button').unbind('click');
		$('.new-download-red-button').bind('click',function(e)
		{
			if (dlMethod == MemoryIO && !localStorage.firefoxDialog && fdl_filesize > 1048576000 && navigator.userAgent.indexOf('Firefox') > -1)
			{
				firefoxDialog();
			}
			else if ((('-ms-scroll-limit' in document.documentElement.style && '-ms-ime-align' in document.documentElement.style)
			|| (navigator.userAgent.indexOf('MSIE 10') > -1)
			|| ((navigator.userAgent.indexOf('Safari') > -1) && (navigator.userAgent.indexOf('Chrome') == -1)))
			&& fdl_filesize > 1048576000 && !localStorage.browserDialog)
			{
			  browserDialog();
			}
			else
			{			
				downloading = true;
				dl_queue.push(fdl_queue_var);					
				$('.download-mid-centered-block').addClass('downloading');
				$.dlhash = window.location.hash;
			}
		});
		$('.new-download-gray-button').unbind('click');
		$('.new-download-gray-button').bind('click',function(e)
		{
			start_import();
		});

		var key = dlpage_key;

		if (key)
		{
			var base64key = key;
			key = base64_to_a32(key);
			dl_attr = res.at;
			var dl_a = base64_to_ab(res.at);
			fdl_file = dec_attr(dl_a,key);
			fdl_filesize = res.s;
		}
		if (fdl_file)
		{
			if (dl_next === 2)
			{
				dlkey = dlpage_key;
				dlclickimport();
				return false;
			}
			fdl_queue_var = {
				ph:		dlpage_ph,
				key: 	key,
				s: 		res.s,
				n: 		fdl_file.n,
				size:   fdl_filesize,
				onDownloadProgress: dlprogress,
				onDownloadComplete: dlcomplete,
				onDownloadStart: dlstart,
				onDownloadError: dlerror,
				onBeforeDownloadComplete: function() { }
			};
			var n = fdl_file.n||'unknown', l = n.length;
			$('.new-download-file-title').text(n);
			var cs = $('.new-download-right-block').width() - parseInt($('.new-download-file-info').css('margin-left'));
			while(l-- && $('.new-download-file-title').width() > cs) {
				$('.new-download-file-title').text(str_mtrunc(n,l));
			}
			if (1 > l) $('.new-download-file-title').text(str_mtrunc(n,60));
			$('.new-download-file-size').text(bytesToSize(res.s));
			$('.new-download-file-icon').addClass(fileicon({name:fdl_file.n}));
		}
		else mKeyDialog(dlpage_ph);
	}
	else $('.download-mid-centered-block').addClass('not-available-some-reason');
	
	var pf = navigator.platform.toUpperCase();
	if (page.substr(-5) == 'linux') sync_switchOS('linux');	
	else if (pf.indexOf('MAC')>=0) sync_switchOS('mac');
	else if (pf.indexOf('LINUX')>=0) sync_switchOS('linux');
	else sync_switchOS('windows');
}

function closedlpopup()
{
	document.getElementById('download_overlay').style.display='none';
	document.getElementById('download_popup').style.left = '-500px';
}

function dl_fm_import()
{
	api_req(
	{
		a: 'p',
		t: M.RootID,
		n: [{ ph: dl_import, t: 0, a: dl_attr, k: a32_to_base64(encrypt_key(u_k_aes,base64_to_a32(dlkey))) }]
	});
	dl_import=false;
}

function dlerror(dl,error)
{
	var errorstr='';
	var tempe=false;
	if (error == EOVERQUOTA)
	{
		alert('quota dialog');
	}
	else if (error == ETOOMANYCONNECTIONS) errorstr = l[18];
	else if (error == ESID) errorstr = l[19];
	else if (error == ETEMPUNAVAIL) tempe = l[233];
	else if (error == EBLOCKED) tempe = l[23];
	else if (error == ENOENT) tempe=l[22];
	else if (error == EACCESS) tempe = l[23];
	else if (error == EKEY) tempe = l[24];
	else if (error == EAGAIN) tempe = l[233];
	else tempe = l[233];

	if (tempe)
	{
		$('.downloading-txt.temporary-error').text(tempe);
		$('.downloading-txt.temporary-error').removeClass('hidden');
		$('.downloadings-icons').addClass('hidden');
	}
}

function dlprogress(fileid, perc, bytesloaded, bytestotal,kbps, dl_queue_num)
{
	if (kbps == 0) return;
	$('.downloading-txt.temporary-error').addClass('hidden');
	$('.downloadings-icons').removeClass('hidden');
	if (uldl_hold) return false;
	if ((typeof dl_limit_shown != 'undefined') && (dl_limit_shown < new Date().getTime()+20000) && (!m)) bwDialog.close();
	if (!dl_queue[dl_queue_num].starttime) dl_queue[dl_queue_num].starttime = new Date().getTime()-100;

	if (!m)
	{
		$('.download-mid-centered-block').addClass('downloading');
		$('.download-mid-centered-block').removeClass('not-available-temporary');
		$('.downloading-progress-bar').width(perc + '%');
		$('.new-download-icon').html('<div>'+perc+'<span>%</span></div>');
		megatitle(' ' + perc + '%');
	}
	if (fdl_starttime) var eltime = (new Date().getTime()-fdl_starttime)/1000;
	else var eltime = (new Date().getTime()-dl_queue[dl_queue_num].starttime)/1000;
	if (eltime && bytesloaded)
	{
		var bps = kbps*1000;
		var retime = (bytestotal-bytesloaded)/bps;
		$('.downloading-txt.speed').text(bytesToSize(bps,1) +'/s');
		$('.downloading-txt.time').text(secondsToTime(retime));
	}
	if (page !== 'download' || $.infoscroll)
	{
		$('.widget-block').removeClass('hidden');
		$('.widget-block').show();
		$('.widget-circle').attr('class','widget-circle percents-'+perc);
		$('.widget-icon.downloading').removeClass('hidden');
		$('.widget-speed-block.dlspeed').text(bytesToSize(bps,1) +'/s');
		$('.widget-block').addClass('active');
	}
}

function dlstart(id,name,filesize)
{
	downloading = true;
}

function start_import()
{
	dl_import=dlpage_ph;
	if (u_type)
	{
		document.location.hash = 'fm';
		if (fminitialized) dl_fm_import();
	}
	else if (u_wasloggedin())
	{
		msgDialog('confirmation',l[1193],l[1194],l[1195],function(e)
		{
			if(e) start_anoimport();
			else loginDialog();
		});
	}
	else start_anoimport();
}

function start_anoimport()
{
	loadingDialog.show();
	u_checklogin(
	{
		checkloginresult: function(u_ctx,r)
		{
			u_type = r;
			u_checked=true;
			loadingDialog.hide();
			document.location.hash = 'fm';
		}
	},true);
}

function dlcomplete(id)
{
	if (d) console.log('dlcomplete',id);
	if (typeof id === 'object') id = id.dl_id;
	$('.download-pause').hide();
	$('.download-mid-centered-block').addClass('download-complete');
	$('.download-icon-pause').hide();
	$('.downloading-progress-bar').width('100%');
	$('.new-download-icon').html('<div>100<span>%</span></div>');
	if ($('#dlswf_' + id).length > 0)
	{
		$('.fm-dialog-overlay').removeClass('hidden');
		$('body').addClass('overlayed');
		$('.fm-dialog.download-dialog').css('left','50%');
		$('.fm-dialog.download-dialog .fm-dialog-close').unbind('click');
		$('.fm-dialog.download-dialog .fm-dialog-close').bind('click',function(e)
		{
			$('.fm-dialog.download-dialog').css('left','-1000px');
			msgDialog('confirmation',l[1196],l[1197],l[1198],function(e)
			{
				if (e) $('.fm-dialog.download-dialog').addClass('hidden');
				else
				{
					$('.fm-dialog.download-dialog').css('left','50%');
					$('.fm-dialog-overlay').removeClass('hidden');
					$('body').addClass('overlayed');
				}
			});
		});
	}
	var a=0;
	for(var i in dl_queue) if (typeof dl_queue[i] == 'object' && dl_queue[i]['dl_id']) a++;
	if (a < 2 && !ul_uploading)
	{
		$('.widget-block').fadeOut('slow',function(e)
		{
			$('.widget-block').addClass('hidden');
			$('.widget-block').css({opacity:1});
		});
	}
	else if (a < 2) $('.widget-icon.downloading').addClass('hidden');
	else $('.widget-circle').attr('class','widget-circle percents-0');
	Soon(resetUploadDownload);
}

function sync_switchOS(os)
{
	if (os == 'windows')
	{
		syncurl = 'https://mega.co.nz/MEGAsyncSetup.exe';
		$('.sync-button-txt.small').text(l[1158]);
		$('.sync-bottom-txt').html('Also available for <a href="" class="red mac">Mac</a> and <a href="" class="red linux">Linux</a>');
		$('.sync-button').removeClass('mac linux');
		$('.sync-button').attr('href',syncurl);
	}
	else if (os == 'mac')
	{
		
		syncurl = 'https://mega.co.nz/MEGAsyncSetup.dmg';
		var ostxt = 'For Mac';
		if (l[1158].indexOf('Windows') > -1) ostxt = l[1158].replace('Windows','Mac');
		if (l[1158].indexOf('Linux') > -1) ostxt = l[1158].replace('Linux','Mac');
		$('.sync-button-txt.small').text(ostxt);
		$('.sync-bottom-txt').html('Also available for <a href="" class="red windows">Windows</a> and <a href="" class="red linux">Linux</a>');
		$('.sync-button').removeClass('windows linux').addClass('mac');
		$('.sync-button').attr('href',syncurl);
	}
	else if (os == 'linux')
	{
		syncurl = '#sync';
		var ostxt = 'For Linux';
		if (l[1158].indexOf('Windows') > -1) ostxt = l[1158].replace('Windows','Linux');
		if (l[1158].indexOf('Mac') > -1) ostxt = l[1158].replace('Mac','Linux');
		$('.sync-button-txt.small').text(ostxt);
		$('.sync-bottom-txt').html('Also available for <a href="" class="red windows">Windows</a> and <a href="" class="red mac">Mac</a>');
		$('.sync-button').removeClass('mac linux').addClass('linux');
		$('.sync-button').attr('href',syncurl);

	}
	$('.sync-bottom-txt a').unbind('click');
	$('.sync-bottom-txt a').bind('click',function(e)
	{
		var c = $(this).attr('class');
		if (c && c.indexOf('windows') > -1) sync_switchOS('windows');
		else if (c && c.indexOf('mac') > -1) sync_switchOS('mac');
		else if (c && c.indexOf('linux') > -1) document.location.hash = 'sync';
		return false;
	});
}

function ImgError(source){
    var empty1x1png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII=";
    source.src = "data:image/png;base64," + empty1x1png;
    source.onerror = "";
    return true;
}

/**
 * Changes the animated product images on the download page
 */
	
//var gifSlider = {
    /*
    // Speed to fade in/out the images and text
    fadeInSpeed: 3000,
    fadeOutSpeed: 500,
    
    // There can be more or less images on either side e.g. 2 gifs on left and 
    // 3 on right and it will still work because they are run independently.
    images: {
        
        // Slide show on left side of the page
        left: [
            {
                name: 'video-chat',         // Name & CSS class of the GIF
                animationLength: 12120,     // Length of the GIF animation in milliseconds
                href: '#register',          // Page link you go to when clicked
                title: 5875,                // Title for above the GIF shown in red
                description: 5876,          // Description next to the title
                image: null                 // The image itself, preloaded and cached in memory
            },
            {
                name: 'sync-client',
                animationLength: 12130,
                href: '#sync',
                title: 1626,
                description: 1086,
                image: null
            }
        ],
        
        // Slide show on right side of the page
        right: [
            {
                name: 'browser-extension-firefox',
                animationLength: 12080,
                href: '#firefox',
                title: 1088,
                description: 1929,
                image: null
            },
            {
                name: 'browser-extension-chrome',
                animationLength: 12090,
                href: '#chrome',
                title: 1088,
                description: 1929,
                image: null
            },
            {
                name: 'mobile-app',
                animationLength: 15190,
                href: '#mobile',
                title: 955,
                description: 1930,
                image: null
            }
        ]
    },
    */
    
    // Initialise the slide show
    /* 
    init: function() {
        
        // Preload the images into memory so they will display straight away
        gifSlider.preLoadImages('left');
        gifSlider.preLoadImages('right');
        
        // Show first two slides using order defined above
        gifSlider.showImage('left', 0);
        gifSlider.showImage('right', 0);
        
        // Setup loops to continually change after every slide has finished
        gifSlider.continueSlideShow('left', 0);
        gifSlider.continueSlideShow('right', 0);
    },
    */
    /**
     * Preloads the images into memory
     * @param {String} side The side of the page (left or right)
     */
	/*
    preLoadImages: function(side) {
        
        // Get the current URL without the location hash (#xycabc), also add on the path to the images dir
        var baseImagePath = staticpath + 'images/products/';
                
        // Check if using retina display
        var retina = (window.devicePixelRatio > 1) ? '-2x' : '';
        
        // Loop through the available images
        for (var i = 0, length = gifSlider.images[side].length; i < length; i++) {
            
            // Preload the image
            var image = new Image();
            image.src = baseImagePath + gifSlider.images[side][i].name + retina + '.gif';
            
            // Store for display later
            gifSlider.images[side][i].image = image;            
        }
    },
    */
    /**
     * Iterates to the next image in the slideshow
     * @param {String} side The side of the page (left or right)
     * @param {Number} currentSlideIndex The current slide's index number (matches array above)
     * @param {Number} oldIntervalId The interval ID to be cleared
     */
	/*
    continueSlideShow: function(side, currentSlideIndex, oldIntervalId) {
        
        // Find when to start the next image
        var animationLengthForCurrentSlide = gifSlider.images[side][currentSlideIndex].animationLength;
        var currentSlideImgSrc = gifSlider.images[side][currentSlideIndex].image.src;
        
        // Clear old interval ID
        if (oldIntervalId) {
            clearInterval(oldIntervalId);
        }
        
        // Set timer to load the next slide after the current one has finished
        var intervalId = setInterval(function() {
            
            // Fade out existing image            
            $('.animations-' + side + '-container .currentImage').attr('src', currentSlideImgSrc).fadeOut(gifSlider.fadeOutSpeed, function() {
                
                // Increment to next image
                var nextSlideIndex = currentSlideIndex + 1;

                // If it has incremented past the last slide available, go back to start
                if (nextSlideIndex === gifSlider.images[side].length) {
                    nextSlideIndex = 0;
                }

                // Show the image now
                gifSlider.showImage(side, nextSlideIndex);

                // Setup the timer for the slide above, so after that finishes it will run the next one
                gifSlider.continueSlideShow(side, nextSlideIndex, intervalId);
            });
        
        }, animationLengthForCurrentSlide);
    },
    */
    /**
     * Shows the animated image
     * @param {String} side The side of the page (left or right)
     * @param {Number} slideIndex The slide's index number to be shown
     */
	/*
    showImage: function(side, slideIndex) {
        
        // Set the details for the next slide
        var slideTitle = l[gifSlider.images[side][slideIndex].title] + ':';
        var slideDescription = l[gifSlider.images[side][slideIndex].description];
        var slideImgSrc = gifSlider.images[side][slideIndex].image.src;
        var slideLink = gifSlider.images[side][slideIndex].href;


        // Change the link and fade in the new image
        $('.ads-' + side + '-block .currentLink').attr('href', slideLink);
        $('.animations-' + side + '-container .currentLink').attr('href', slideLink);
        $('.animations-' + side + '-container .currentImage').attr('src', slideImgSrc).css({ width: '260px', height: '300px'}).fadeIn(gifSlider.fadeInSpeed);
		
		
        // Set title and description
        $('.ads-' + side + '-block .products-top-txt .red').html(slideTitle).fadeIn(gifSlider.fadeInSpeed);
        $('.ads-' + side + '-block .products-top-txt .description').text(slideDescription).fadeIn(gifSlider.fadeInSpeed);
		
		// Applications buttons
		if(side==='right') {
		  $('.button0,.button1,.button2,.button3, .button4').fadeOut(gifSlider.fadeInSpeed);
		  $('.button'+slideIndex).fadeIn(gifSlider.fadeInSpeed).css('display', 'block');
		  
		  if (slideIndex==2) {
			  setTimeout(function() {
                $('.button2').fadeOut(gifSlider.fadeInSpeed);
		        $('.button3').fadeIn(gifSlider.fadeInSpeed).css('display', 'block');
                setTimeout(function() {
                   $('.button3').fadeOut(gifSlider.fadeInSpeed);
		           $('.button4').fadeIn(gifSlider.fadeInSpeed).css('display', 'block');
                }, 5000);
              }, 5000);
          }
		  
		} 
    }
	*/
//};
