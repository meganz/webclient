var mfmloaded,murl;
var mfileinfo=false;
var mfolderinfo=false;
var mobilepage;
var mobileloaded=false;

var imagemode=false;

function mfolder(id)
{
	var n = M.d[id];
	if (n && n.t)
	{		
		mfolderinfo=id;
		var icon = fileicon(n,'l');
		if (id.length == 11) icon = staticpath +  'images/extension_large/contact@2x.png';
		else if (n.p == 'contacts') icon = staticpath + 'images/extension_large/vcard.png';	
		$('#mfolderinfo_name').text(n.name);
		$('#mfolderinfo_img').attr('src',icon);
		mobileui();	
	}
}




function mobilepro(propack)
{	
	if (lang == 'fr')
	{
		var gb = 'Go';
		var tb = 'To';
	}
	else
	{
		var gb = 'GB';
		var tb = 'TB';	
	}
	
	if (propack == 1)
	{
		$('.pro-features .pro-storage').html('500 ' + gb + ' <span class="red">' + l[495] + '</span>');
		$('.pro-features .pro-bandwidth').html('1 ' + tb + ' <span class="red">' + l[496] + '</span>');	
		$('#mobilepro2_month').html('&euro; 9.99 ' + l[498]);
		$('#mobilepro2_year').html('&euro; 99.99 ' + l[499]);
	}
	else if (propack == 2)
	{
		$('.pro-features .pro-storage').html('2 ' + tb + ' <span class="red">' + l[495] + '</span>');
		$('.pro-features .pro-bandwidth').html('4 ' + tb + ' <span class="red">' + l[496] + '</span>');	
		$('#mobilepro2_month').html('&euro; 19.99 ' + l[498]);
		$('#mobilepro2_year').html('&euro; 199.99 ' + l[499]);
	}
	else if (propack == 3)
	{
		$('.pro-features .pro-storage').html('4 ' + tb + ' <span class="red">' + l[495] + '</span>');
		$('.pro-features .pro-bandwidth').html('8 ' + tb + ' <span class="red">' + l[496] + '</span>');	
		$('#mobilepro2_month').html('&euro; 29.99 ' + l[498]);
		$('#mobilepro2_year').html('&euro; 299.99 ' + l[499]);
	}	
	$('#mobilepro2_icon')[0].className = 'pro' + propack + '-icon';
	$('#mobilepro2_number')[0].className = 'pro' + propack + '-number';
	$('#mobilepro').hide();
	$('#mobilepro2').show();
}


function posiOs()
{
	if (iOS_isiOSDevice()) setTimeout(function(){window.scrollTo(0, 1);},1000);
}


function mobilebuypro(price)
{
	pro_paymentmethod = 'payment_paypal';	
	if ((!price) && (page.substr(3,4) == 1)) pro_package = 'pro1_month';
	else if ((price) && (page.substr(3,4) == 1)) pro_package = 'pro1_year';	
	else if ((!price) && (page.substr(3,4) == 2)) pro_package = 'pro2_month';
	else if ((price) && (page.substr(3,4) == 2)) pro_package = 'pro2_year';	
	else if ((!price) && (page.substr(3,4) == 3)) pro_package = 'pro3_month';
	else if ((price) && (page.substr(3,4) == 3)) pro_package = 'pro3_year';
	if (u_type == false)
	{
		loadingDialog.show();
		u_storage = localStorage;	
		u_checklogin(
		{
			checkloginresult: function(u_ctx,r)
			{			
				u_type = r;
				u_checked=true;	
				pro_pay();		
			}
		},true);
	
	}
	else pro_pay();
}


function mimport()
{	
	if (page == 'download')
	{
		dlclickimport();	
	}
	else
	{
		var n = M.d[mfileinfo];
		if (n)
		{
			loadingDialog.show();		
			api_req([{	
				a: 'p',
				t: M.RootID,
				n: [{ h: n.h, t: 0, a: n.a, k: a32_to_base64(encrypt_key(u_k_aes,n.key)) }]
			}],
			{
			callback: function()
			{
				alert(l[820]);
				loadingDialog.hide();						
			}});	
		}
	}
}


function mdelete()
{
	var id,confirmstr;
	if (mfileinfo)
	{
		id = mfileinfo;
		confirmstr = l[788];
	}
	if (mfolderinfo)
	{
		id = mfolderinfo;	
		confirmstr = l[789];
	}
	var n = M.d[id];
	if (n)
	{
		if (confirm(confirmstr))
		{		
			mback();
			M.moveNodes([id],M.RubbishID);			
		}
	}
}


function mstartdl()
{
	if (page == 'download')
	{
		var msupport=mobile_filesupported(fdl_file.n);
	
		if (msupport)
		{
			if ((msupport == 'application/pdf') && (typeof PDFJS == 'undefined')) getPDFJS();
			if ((u_type != 3) && (!document.getElementById('mobiledownloadcheck').checked))
			{
				alert(l[214]);
				return false;		
			}			
			initmobileupload();
			$('#mobileupload_header').text(l[803]);	
			dl_queue.push(fdl_queue_var);
			startdownload();
		}
		else
		{
			if (mobile_filesupported_coming(fdl_file.n)) alert(l[805]);
			else alert(l[804]);		
		}
		return false;
	}

	var id;
	if (mfileinfo) 	 id = mfileinfo;
	if (mfolderinfo) id = mfolderinfo;	
	var n = M.d[id];	
	if (n)
	{
		if (mobile_filesupported(n.name))
		{
			$('.upload-percentage-bar').width('0%');
			$('#mobileupload_header').text(l[803]);
			$('#mobileuploadtime').text('');
			$('#mobileuploadtime').removeClass('complete');
			$('#uploadpopbtn').text(l[156]);	
			$('.upload-speed-bg2').text(l[819]);	
			$('.upload-status-txt').hide();			
			$('#uploadPopup').show();
			$('.overlay').height(iOS_getViewportSize().height+1000);
			$('.overlay').removeClass('hidden');
			iOS_disableScrolling();			
			dl_type=4;
			dl_method=4;					
			M.addDownload([id]);	
			startdownload();		
		}
		else
		{
			if (mobile_filesupported_coming(n.name)) alert(l[805]);
			else alert(l[804]);
		} 
	}
}


function mcloserename()
{
	$("#rename-popup").addClass('hidden');
	$(".overlay").addClass('hidden');
	mobileui();
}

function mrename()
{
	var id;
	if (mfileinfo) id = mfileinfo;
	if (mfolderinfo) id = mfolderinfo;	
	
	var n = M.d[id];	
	if (n)
	{
		if (n.t) 
		{
			$('#rename-popup-header').text(l[425]);
			$('#rename-popup-descr').text(l[806]);			
		}
		else
		{
			$('#rename-popup-header').text(l[426]);
			$('#rename-popup-descr').text(l[807]);					
		}
		$.selected=[n.h];		
		$("#rename-popup").removeClass('hidden');
		$(".overlay").removeClass('hidden');
		$('#mobile_rename').val(n.name);
		$('#mobile_rename').focus();
	}
}

function mdorename()
{
	var id;
	if (mfolderinfo) id = mfolderinfo;
	else id = mfileinfo;	
	M.rename(id,$('#mobile_rename').val());
	mcloserename();	
	if (mfolderinfo) mfolder(mfolderinfo);
	else mfile(mfileinfo);	
}


function mgetlink()
{
	var id;
	if (mfileinfo) 		id = mfileinfo;
	if (mfolderinfo) 	id = mfolderinfo;	
	var n = M.d[id];
	if (n)
	{
		if (n.t) 
		{
			$('#getlink-popup-header').text(l[808]);
			$('#getlink-popup-descr').text(l[809]);			
		}
		else
		{
			$('#getlink-popup-header').text(l[810]);
			$('#getlink-popup-descr').text(l[811]);					
		}
		loadingDialog.show();
		$.selected = [n.h];
		M.getlinks([n.h]);
	}
}


function mlinksDialog()
{
	for (var i in M.links)
	{	
		var n = M.d[M.links[i]];
		var key,s,F;
		if (n.t)
		{
			F='F';
			key = u_sharekeys[n.h];
			s='';
		}
		else
		{
			F='';
			key = n.key;
			s = htmlentities(n.s);
		}		
		if (n && n.ph) mshowlink('https://mega.co.nz/#'+F+'!' + htmlentities(n.ph) + '!' + a32_to_base64(key));
	}
}

function mcloselink()
{
	$("#getlink-popup").addClass('hidden');
	$(".overlay").addClass('hidden');
	mobileui();
}



function mshowlink(url)
{	
	murl = url;
	$('#memaillinkbtn').attr('href','mailto:?body=' + url);
	$("#getlink-popup").removeClass('hidden');
	$(".overlay").removeClass('hidden');
	$('#mobile_link').val(url);
	$('#mobile_link')[0].setSelectionRange(0, 9999);
}

function mfile(id)
{	
	var n = M.d[id];
	if (n && !n.t)
	{
		mfileinfo=id;		
		var icon = fileicon(n,'l');
		var thumbstyle = '';	
		if (thumbnails[n.h])
		{
			icon = thumbnails[n.h];					
			$('.file-info-img').addClass('image');
		}
		else $('.file-info-img').removeClass('image');		
		$('#mfileinfo_name').text(n.name);
		$('#mfileinfo_size').text(bytesToSize(n.s));
		$('#mfileinfo_date').text(time2date(n.ts));
		$('#mfileinfo_img').attr('src',icon);	
		mobileui();
	}
}


function mopenfolder(id)
{	
	M.openFolder(id);	
}



function mback()
{
  if (page == 'blogarticle')
  {
	document.location.hash = '#blog';  
  }
  else if (page.substr(0,3) == 'pro')
  {
	document.location.hash = '#pro';  
  }
  else if ((mfileinfo) && (M.currentdirid))
  {
	mfileinfo=false;
	M.openFolder(M.currentdirid,1);  
  }
  else if ((mfileinfo) && (!M.currentdirid))
  {
	mfileinfo=false;
	processsearch($('#mobile_searchtext').val());
  }
  else if ((mfolderinfo) && (M.currentdirid))
  {
    mfolderinfo=false;
	M.openFolder(M.currentdirid,1); 
  }
  else if ((mfolderinfo) && (!M.currentdirid))
  {
    mfolderinfo=false;
	processsearch($('#mobile_searchtext').val());
  }
  else if (lightweight)
  {
	document.location.hash = '#fm';	
  }
  else if (!M.currentdirid)
  {
	$('#mobile_searchtext').val('');
	if (!fminitialized) document.location.hash = '#fm';
	else M.openFolder(M.RootID);
  }
  else
  {
	  var n = M.d[M.currentdirid];  
	  if (n)
	  {
		var parentid = n.p;
		if (n || parentid == M.RootID || parentid == 'contacts' || parentid == M.RubbishID || parentid == M.InboxID) M.openFolder(parentid);
	  }
	  else document.location.hash ='fm';  
  }
  
  m_attr_events();
}

function m_attr_events()
{
	$('[id^="datatitle_"]').unbind('click');
	$('[id^="datatitle_"]').bind('click',function(e)
	{
		var id = $(this).closest('.data-title').attr('id');
		if (!id) return false;
		var action = id.replace('datatitle_','').split('_')[0];
		id = id.replace('datatitle_','').split('_')[1];
		if (action == 'mopenfolder') mopenfolder(id);
		else if (action == 'mfolder') mfolder(id);
		else if (action == 'mfile') mfile(id);
		return false;		
	});	
	$('[id^="dataarrow_"]').unbind('click');
	$('[id^="dataarrow_"]').bind('click',function(e)
	{
		var action = e.target.id.replace('dataarrow_','').split('_')[0];
		var id = e.target.id.replace('dataarrow_','').split('_')[1];	
		if (action == 'mopenfolder') mopenfolder(id);
		else if (action == 'mfolder') mfolder(id);
		else if (action == 'mfile') mfile(id);
		return false;
	});
	$('.data-icon').unbind('click');
	$('.data-icon').bind('click',function(e)
	{
		var action = e.target.id.replace('dataicon_','').split('_')[0];
		var id = e.target.id.replace('dataicon_','').split('_')[1];	
		if (action == 'mopenfolder') mopenfolder(id);
		else if (action == 'mfolder') mfolder(id);
		else if (action == 'mfile') mfile(id);
		return false;
	});
}



var mobilePDFdoc;
var mobilePDFpagenum=1;
var PDFdimensions;


function getpdfdimensions(width,height)
{
	var iosdim = iOS_getWindowSize();
	var ww = iosdim.width;
	var wh = Math.ceil(iosdim.height*0.9);
	var ratio1 = width/height;	
	var ratio2 = ww/wh;
	var newdim = [];	
	if (ratio2 > ratio1)
	{
		// adjust to vertical (or it's square -> adjust to any of the two)		
		newdim[0] = Math.round(width*(wh/height));
		newdim[1] = wh;		
	}
	else 
	{
		// adjust to horizontal		
		newdim[0] = ww;
		newdim[1] = Math.round(height*(ww/width));
	}
	return newdim;
}


function mobilepdfpage(el)
{
	mobilePDFpagenum = $('#pdf_txt2_option').find(":selected").val();
	mobile_renderPDF(mobilePDFpagenum);
}


function mobilepdfprev()
{
	if (mobilePDFpagenum > 1) mobilePDFpagenum-=1;
	mobile_renderPDF(mobilePDFpagenum);
}


function mobilepdfnext()
{
	if (mobilePDFpagenum < mobilePDFdoc.numPages) mobilePDFpagenum+=1;
	mobile_renderPDF(mobilePDFpagenum);
}


function mobilepdfclose()
{
	mobilepage ='';
	mobileui();
}



function mobile_renderPDF(num) 
{
  mobilePDFdoc.getPage(num).then(function(page) 
  {
	var canvas = document.getElementById('preview-pdf');
	var ctx = canvas.getContext('2d');  
	var viewport = page.getViewport(3);	
	canvas.height = viewport.height;
	canvas.width = viewport.width;
	PDFdimensions = getpdfdimensions(viewport.width,viewport.height);	 
	canvas.style.width  = PDFdimensions[0] + 'px';
	canvas.style.height = PDFdimensions[1] + 'px';
	var renderContext = 
	{
	  canvasContext: ctx,
	  viewport: viewport
	};
	page.render(renderContext);
  });  
  var pdfpag = '<span id="pdf_txt2">' + num + '/' + mobilePDFdoc.numPages + '</span>';  
  pdfpag += '<select id="pdf_txt2_option" name="custom">';  
  var i =1;  
  while (i <= mobilePDFdoc.numPages) 
  {
    var selected = '';
    if (i == num) selected = 'selected';
	pdfpag += '<option value="' + i + '" ' + selected + '>' + i + '/' + mobilePDFdoc.numPages + '</option>';  
	i++;
  }  
  pdfpag += '</select>';  
  $('.pdf-pagination').html(pdfpag); 
  
  $('#pdf_txt2_option').unbind('click');
  $('#pdf_txt2_option').bind('click', function(e) 
  {
	GetNextNode('pdf_txt2');
	mobilepdfpage(e.currentTarget); 
  });
}


var gettingPDF=false;

var pdfBlobURL=false;

function getPDFJS()
{
	if (!gettingPDF)
	{
		gettingPDF=true;
		console.log('gettingPDF');
		var pdf_xhr = getxhr();		
		pdf_xhr.onerror = function(e)
		{
			gettingPDF=false;			
		}		
		pdf_xhr.onload = function(e)
		{
			var pdfhash = [525656786, -671052937, 2050744739, 1945472904, 1511051692, 1523916572, 1385206779, 1067229907];
			var res = this.response || this.responseText;								
			if (cmparrays(sha256(res),pdfhash))
			{							
				if (window.URL) pdfBlobURL = evalscript_url([res]);				
				else evalscript(res);
				gettingPDF=false;
			}
			else
			{
				console.log('PDF JS LIB HASH ERROR');
				console.log(pdfhash);
				console.log(sha256(res));			
			}
		}
		pdf_xhr.open('GET', staticpath + 'pdf.js', true);		
		pdf_xhr.send(null);
	}
}


var modilePDFstarting=0;

function mobilepdf()
{
	if (typeof PDFJS == 'undefined')
	{
		$('#mobileuploadtime').addClass('complete');
		$('#mobileuploadtime').text('Completed');		
		if (modilePDFstarting == 4) modilePDFstarting=0;
		var mdots= '';			
		var i=0;		
		while (i < modilePDFstarting)
		{
			mdots += '.';
			i++;		
		}
		$('.upload-speed-bg2').text('Loading PDF reader' + mdots);		
		modilePDFstarting++;
		getPDFJS();
		setTimeout('mobilepdf()',800);	
		return false;
	}	
	mcloseupload();	
	mobilePDFpagenum=1;
	PDFJS.disableWorker = true;
	PDFJS.getDocument(dl_data).then(function getPdfHelloWorld(_pdfDoc) 
	{
	  mobilePDFdoc = _pdfDoc;
	  mobile_renderPDF(mobilePDFpagenum);
	});
	
	$('#preview-pdf').unbind("gesturechange");
	$('#preview-pdf').bind("gesturechange", function(event) 
	{
      var scale = event.originalEvent.scale;	  
	  if (scale > 1) scale = 1.05;   	   	   
	  else scale = 0.90;
	  var canvas = document.getElementById('preview-pdf');
	  var newwidth = Math.round(parseInt(canvas.style.width.replace('px',''))*scale);
	  var newheight = Math.round(parseInt(canvas.style.height.replace('px',''))*scale);	   
	  $('.preview-main').width(newwidth);
	  $('.preview-main').height(newheight);
	  if (newwidth < PDFdimensions[0])
	  {
		newwidth = PDFdimensions[0];
		newheight = PDFdimensions[1];
		$('.preview-main').width('100%');
	    $('.preview-main').height('100%');
	  }
	  else if (newwidth > (PDFdimensions[0]*3))
	  {
		newwidth = PDFdimensions[0]*3;
		newheight = PDFdimensions[1]*3;	   
	  }	   
	  canvas.style.width  = newwidth + 'px';
	  canvas.style.height = newheight + 'px';	   	   
	});	
	mobilepage = 'pdf';	
	mobileui();
}



function mobile_dlcomplete(id)
{
	var mimetype = mobile_filesupported(dl_queue[0].n);
	
	downloading=false;	
	
	if (mimetype == 'application/pdf')
	{	
		mobilepdf();		
	}
	else
	{
		var tmpblob = new Blob([dl_data],{type:mimetype});
		mobileDLurl = myURL.createObjectURL(tmpblob);			
		mobileimage();
		mcloseupload();
	}	
}


function mobile_filesupported(filename)
{
	if (fileext(filename) == 'jpg') return 'image/jpg';
	else if (fileext(filename) == 'gif') return 'image/gif';
	else if (fileext(filename) == 'png') return 'image/png';
	else if (fileext(filename) == 'pdf') return 'application/pdf';
	return false;
}


function mobile_filesupported_coming(filename)
{
	if (fileext(filename) == 'pdf') return true;
	else if (fileext(filename) == 'xls') return true;
	else if (fileext(filename) == 'xlsx') return true;
	else if (fileext(filename) == 'doc') return true;
	else if (fileext(filename) == 'docx') return true;
	else if (fileext(filename) == 'mp3') return true;
	else if (fileext(filename) == 'wav') return true;
	else if (fileext(filename) == 'mp4') return true;	
	return false;
}



function mshowshare()
{
	$('#mobile_share_permission').text(l[64]);
	$('#mobile_share_email').text(l[802]);
	$('#mobile_share_permission_option')[0].selectedIndex=0;
	$('#share-popup').show();
	$(".overlay").removeClass('hidden');		
}

function mcloseshare()
{
	$('#share-popup').hide()
	$(".overlay").addClass('hidden');			
	$('#mobile_newshare').val(l[802]);
}



function mobileui(actionpacket)
{		
	if (!m) return false;

	$('#mobilefmholder').show();	
	
	init_mfm();
	
	
	if (!actionpacket)
	{
		$("#add-contact-popup").addClass('hidden');
		$("#new-folder-popup").addClass('hidden');
		if (!mupload_init) $(".overlay").addClass('hidden');	
		$("#add-popup").addClass('hidden');
		$('.top-add-icon').removeClass('active'); 
		$('.top-search-icon').removeClass('active'); 
		$("#search-popup").addClass('hidden');
	}	
	if (!mfmloaded) init_mfm(); 
	$('.top-trash-icon').hide();
	$('.top-search-icon').hide();
	$('.top-add-icon').hide();	
	if (is_fm())
	{
		if ((M.currentdirid) && (RootbyId(M.currentdirid) == M.RubbishID)) $('.top-trash-icon').show();
		else
		{		
			$('.top-search-icon').show();
			$('.top-add-icon').show();		
		}
	}	
	if (((typeof M.currentdirid != 'undefined' && ((M.currentdirid == M.RootID) || (M.currentdirid == M.RubbishID) || (M.currentdirid == 'contacts') || (M.currentdirid == M.InboxID)) && is_fm()) || (page == 'pro') || (page == 'about') || (page == 'blog') || (page == 'account') || (page == 'privacy') || (page == 'terms') || (page == 'help')) && !mfileinfo && !mfolderinfo)
	{
		$('#mmenubtn').show();
		$('#mbackbtn').hide();
	}
	else
	{
		$('#mmenubtn').hide();
		$('#mbackbtn').show();			
	}	
	$('#mobilegridholder').hide();
	$('#mobileemptyfolder').hide();
	$('#mobileemptycontacts').hide();
	$('#mobileemptysearch').hide();
	$('#mobileemptyinbox').hide();
	$('#mobileemptyrubbish').hide();
	$('#mobileemptycloud').hide();
	$('#mobileemptyimages').hide();
	$('#mobilefileinfo').hide();
	$('#mobilefolderinfo').hide();
	$('#mobileaccount').hide();
	$('#mobilehelp').hide();
	$('#mobilecontent').hide();
	$('#mobilelogin').hide();
	$('#mobileregister').hide();	
	$('#mobilekey').hide();
	$('#mobiledone').hide();
	$('#mobilepro').hide();
	$('#mobilepro2').hide();	
	$('#mobiledownload').hide();
	$('#mobiledownload_pw').hide();
	$('#mobilemainblock').removeClass('file-list');	
	$('#mobilemainblock').removeClass('account');	
	$('.page-bg').removeClass('bottom-pages');		
	$('#pdfpreview').hide();	
	$('#mobilepage').show();
	
	$('body').removeClass('blog-new');
	
	if (mobilepage == 'pdf')
	{
		$('#mobilepage').hide();
		$('#pdfpreview').show();
	}	
	else if (mfileinfo)
	{			
		$('#mobilefileinfo').show();
		$('#mobilemainblock').addClass('account');		
		$('#mobile_file_delete').hide();
		$('#mobile_file_rename').hide();
		$('#mobile_file_clear2').hide();		
		$('#mobile_file_import').hide();
		$('#mobile_file_link').hide();				
		var n = M.d[mfileinfo];		
		if (n)
		{
			if (mobile_filesupported(n.name)) $('#mobile_file_open').removeClass('disabled');				
			else $('#mobile_file_open').addClass('disabled');				
			if (RootbyId(n.h) == 'contacts')
			{
				$('#mobile_file_import').show();
				if (RightsbyID(n.h) > 1)
				{
					$('#mobile_file_delete').show();
					$('#mobile_file_rename').show();
					$('#mobile_file_clear2').show();				
				}
			}
			else if (RootbyId(n.h) == M.RootID)
			{
				$('#mobile_file_link').show();
				$('#mobile_file_delete').show();
				$('#mobile_file_rename').show();
				$('#mobile_file_clear2').show();			
			}			
		}		
		$('#mobile_fcontrolbuttons').hide();
		$('#mobile_fownerbuttons').hide();
		$('#mobilefolderinfo .file-info-button-block').hide();		
		var n = M.d[mfolderinfo];
		if (n && n.t)
		{
			if ((RootbyId(n.h) == 'contacts') && (RightsbyID(n.h) > 1))
			{
				$('#mobile_fcontrolbuttons').show();
				$('#mobilefolderinfo .file-info-button-block').show();
			}
			else if (RootbyId(n.h) == M.RootID)
			{
				$('#mobile_fcontrolbuttons').show();
				$('#mobile_fownerbuttons').show();		
				$('#mobilefolderinfo .file-info-button-block').show();
			}
		}	
	}
	else if (mfolderinfo)
	{
		$('#mobilefolderinfo').show();	
		$('#mobilemainblock').addClass('account');	
		$('#mobile_fcontrolbuttons').hide();
		$('#mobile_fownerbuttons').hide();
		$('#mobilefolderinfo .file-info-button-block').hide();
		var n = M.d[mfolderinfo];		
		if (n && n.t)
		{
			if ((RootbyId(n.h) == 'contacts') && (RightsbyID(n.h) > 1))
			{
				$('#mobile_fcontrolbuttons').show();
				$('#mobilefolderinfo .file-info-button-block').show();
			}
			else if (RootbyId(n.h) == M.RootID)
			{
				$('#mobile_fcontrolbuttons').show();
				$('#mobile_fownerbuttons').show();		
				$('#mobilefolderinfo .file-info-button-block').show();
			}
		}
	}		
	else if (page.substr(0,3) == 'pro')
	{
		mobilepage = 'pro';
		$('#mobilemainblock').addClass('file-list');
		$('#mobile_title').text(l[398]);
		$('#mobilepro').show();		
		if (page.length > 3) mobilepro(page.substr(3,4));		
	}
	else if (page.substr(0,7) == 'account')
	{
		$('#mobilemainblock').addClass('account');	
		mobilepage = 'account';
		$('#mobile_title').text(l[187]);
		$('#mobileaccount').show();		
	}
	else if(page == 'privacy')
	{
		$('#mobile_title').text(l[386]);
		$('.privacy-page').html(pages['privacy'].split('<div class="register-mid-pad">')[1].split('</div>')[0]);
		$('#mobilecontent').show();
		$('.page-bg').addClass('bottom-pages');		
	}
	else if(page == 'terms')
	{
		$('#mobile_title').text(l[385]);
		$('.privacy-page').html(pages['terms'].split('<div class="register-mid-pad">')[1].split('</div>')[0]);
		$('#mobilecontent').show();
		$('.page-bg').addClass('bottom-pages');
	}	
	else if(page == 'blog')
	{
		$('#mobile_title').text(l[389]);
		blog_load();
		$('#mobilecontent').show();
		$('.page-bg').addClass('bottom-pages');
	}
	else if(page == 'blogarticle')
	{
		$('#mobile_title').text(l[389]);			
		$('.privacy-page').html('<div class="blog-new-full empty-bottom"><h2 id="blogarticle_title"></h2><a href="#" id="blog_prev" class="blog-new-forward"></a><a href="#" id="blog_next" class="blog-new-back"></a><div class="clear"></div><div class="blog-new-small" id="blogarticle_date">May 7th 2013</div>     <div class="blog-new-date-div"></div><div class="blog-new-small"><span>By:</span> Admin</div><div class="clear"></div><div id="blogarticle_post"></div><div class="clear"></div></div>');
		
		init_blogarticle();
		$('#mobilecontent').show();
		$('.page-bg').addClass('bottom-pages');
	}
	else if (mobilekeygen)
	{
		$('#mobile_title').html('<div class="img-logo"></div>');
		$('#mobilekey').show();
		$('.page-bg').addClass('bottom-pages');
	}
	else if(page == 'help')
	{
		$('#mobile_title').text(l[384]);
		$('.page-bg').addClass('bottom-pages');	
		mobilehelp();
		$('#mobilehelp').show();
	}
	else if(page == 'login')
	{
		$('#mmenubtn').show();
		$('#mbackbtn').hide();			
		if (confirmok) $('#mobile_title').html(l[812]);
		else $('#mobile_title').html('<div class="img-logo"></div>');
		$('#mobilelogin').show();
	}
	else if(page == 'download_password')
	{		
		$('download_password').val(l[380]);
		$('#mobiledownload_pw').show();
	}
	else if(page == 'download')
	{		
		if (mobile_filesupported(fdl_file.n)) $('#mobile_download_open').removeClass('disabled');			
		else $('#mobile_download_open').addClass('disabled');
		
		if (u_type == 3) $('#mobiledownload_tos').hide();
		else $('#mobiledownload_tos').show();
	
		$('#mdownload_name').text(fdl_file.n);
		$('#mdownload_size').text(bytesToSize(fdl_filesize));

		$('#mmenubtn').show();
		$('#mbackbtn').hide();	
		$('#mobile_title').html('<div class="img-logo"></div>');		
		$('#mobiledownload').show();		
	}
	else if(page == 'done')
	{	
		$('#mmenubtn').show();
		$('#mbackbtn').hide();	
		$('#mobile_title').html('<div class="img-logo"></div>');		
		$('.privacy-page').html('<div class="info-block"><h2 id="mobiledone1">' + done_text1 + '</h2><p id="mobiledone2">' + done_text2 + '</p></div>');			
		$('#mobilecontent').show();
		$('.page-bg').addClass('bottom-pages');						
	}
	else if(page == 'register')
	{
		$('#mmenubtn').show();
		$('#mbackbtn').hide();	
		$('#mobile_title').html('<div class="img-logo"></div>');
		$('#mobileregister').show();
	}
	else if(page == 'about')
	{
		$('#mobile_title').text(l[396]);
		$('.privacy-page').html('<p>' + l[693] + '</p><br><br><img src="'+ staticpath + 'images/about_us_silhouette.png">');
		$('#mobilecontent').show();
		$('.page-bg').addClass('bottom-pages');
	}
	else if (imagemode)
	{	
		$('#mmenubtn').show();
		$('#mbackbtn').hide();
		$('#mobilefileinfo').hide();
		$('#mobilegridholder').show();		
		$('#mobilegridholder').addClass('image-viewer');
		$('#mobilegridholder').removeClass('cloud-drive');
		$('.page-bg').addClass('bottom-pages');
	}
	else if (is_fm() && M.v.length == 0)
	{
		if (M.currentdirid == M.RootID) $('#mobileemptycloud').show();
		else if(imagemode) $('#mobileemptyimages').show();
		else if (!M.currentdirid) $('#mobileemptysearch').show();
		else if(M.currentdirid == 'contacts') $('#mobileemptycontacts').show();
		else if(M.currentdirid == M.RubbishID) $('#mobileemptyrubbish').show();
		else if(M.currentdirid == M.InboxID) $('#mobileemptyinbox').show();
		else $('#mobileemptyfolder').show();
	}
	else
	{	
		$('#mobilegridholder').removeClass('image-viewer');
		$('#mobilegridholder').addClass('cloud-drive');
		$('#mobilefileinfo').hide();
		$('#mobilegridholder').show();		
		$('#mobilemainblock').addClass('file-list');
	}
	
	if (is_fm() && !mobilekeygen)
	{		
		if (RootbyId(M.currentdirid) == 'contacts')
		{
			var n = M.d[M.currentdirid];
			
			if (n_h)
			{
				$('.top-add-icon').hide();
				$('#mobile_title').text(l[808]);
			
			}			
			else if (n && n.p == 'contacts')
			{
				$('.top-add-icon').hide();
				$('#mobile_title').text(ellipsis(n.name,'center',20));
			}
			else if (n && n.h !== 'contacts')
			{
				$('#mobile_title').text(l[813]);			
				if (n && (!RightsbyID(n.h))) $('.top-add-icon').hide();
			}
			else 
			{
				$('#mobile_title').text(l[165]);	
				$('.top-add-icon').show();				
			}
		}
		else if (RootbyId(M.currentdirid) == M.RubbishID) $('#mobile_title').text(l[167]);
		else if (RootbyId(M.currentdirid) == M.InboxID)
		{
			$('#mobile_title').text(l[166]);
			$('.top-add-icon').hide();
		}
		else if (imagemode)
		{	
			$('#mmenubtn').show();
			$('#mbackbtn').hide();	
			$('.top-add-icon').hide();
			$('#mobile_title').text('Image Viewer');		
		}
		else $('#mobile_title').text(l[164]);
	}
		
	if (iOS_isiOSDevice() && (!actionpacket)) setTimeout(function(){window.scrollTo(0, 1);},1000);
	
	var h = iOS_getViewportSize();

	if (iOS_isiOSDevice() && (!actionpacket)) 
	{
	  if ($('html').height() > h.height) h.height = $('html').height();
	  $('#mobilefmholder').height(h.height);
	  $('body').height(h.height);
	  $('.main-menu').height(h.height);
	  var bodyWidth = $('body').width();
	  $('.top-block').width(bodyWidth);
	  $('.main-block').width(bodyWidth);
	}
	
	mobile_uploadbuttons();
	mobileloaded=true;
	
	
	
	
	var ua = navigator.userAgent.toLowerCase();
	var isChrome = /chrome/.test(ua);
	var isAndroid = /android/.test(ua);
	var bodyClass = $('body').attr('class');
    if(isAndroid && !isChrome && bodyClass.indexOf('android-not-chrome') == -1) 
	{
	  $('body').addClass('android-not-chrome');  
	}
	if(isAndroid && bodyClass.indexOf('android') == -1) 
	{
	  $('body').addClass('android');  
	}
	
	mobilelang_init();
	m_attr_events();
}



function mdlpw()
{
	if (($('#download_password').val().length < 10) || ($('#download_password').val() == l[380])) alert('Please enter a valid decryption key.');	
	else document.location.hash = '#!' + dlpage_ph + '!' + $('#download_password').val();	
}


function mobile_uploadbuttons()
{
	$('#mobile_fileselect1').css('width',$('#mobileuploadbtn').width());
	$('#mobile_fileselect2').css('width',$('#mobileuploadbtn').width());
	$('#mobile_fileselect3').css('width',$('#mobileuploadbtn').width());
	
	if ($('html').width() > 480)
	{
		// big mode
		$('#mobile_uploaddiv').css('top','20px');
		$('#mobile_uploaddiv').css('left','20px');
		$('#mobile_fileselect1').attr('size',Math.round(($('#mobileuploadbtn').width()-100)/6));
		$('#mobile_fileselect2').attr('size',Math.round(($('#mobileuploadbtn').width()-100)/6));
		$('#mobile_fileselect3').attr('size',Math.round(($('#mobileuploadbtn').width()-100)/6));
		$('#mobile_fileselect2').css('height','20');
		$('#mobile_fileselect3').show();
	}
	else
	{	
		// small mode
		$('#mobile_uploaddiv').css('top','10px');
		$('#mobile_uploaddiv').css('left','10px');
		$('#mobile_fileselect1').attr('size',Math.round(($('#mobileuploadbtn').width()-100)/6));
		$('#mobile_fileselect2').attr('size',Math.round(($('#mobileuploadbtn').width()-100)/6));
		$('#mobile_fileselect2').css('height','10');
		$('#mobile_fileselect3').hide();		
	}
}



function mobilehelp()
{
	var helphtml = '';
	for(var i in helpdata)
	{
		helphtml += '<div class="help-left-links" id="mobilehelp_' + i + '"><span class="help-left-lnk-txt"><span>' + helpdata[i].q +'</span></span><span class="help-left-lnk-description">' + helpdata[i].a + '</span></div>';	
	}
	$('#mobilehelp .faq-page').html(helphtml);
	
	$(".help-left-links").unbind('click');
	$(".help-left-links").bind('click',function(e) 
	{
		mobilehelpclick(e.currentTarget.id.replace('mobilehelp_',''));
	});	
}


function mobilehelpclick(id)
{
	if ($('#mobilehelp_' + id).attr('class').indexOf('active') == -1) $('#mobilehelp_' + id).addClass('active');
	else $('#mobilehelp_' + id).removeClass('active');
}


function mload_acc()
{	
	$('.account-username').text(u_attr.name);
	$('.account-email').text(u_attr.email);
	$('#mobileaccount').hide();
	loadingDialog.show();
	api_req([
	{ 
		a: 'uq',
		strg: 1,
		xfer: 1,
		pro: 1,
	}],
	{ 
		callback : function (json,params)
		{	
			$('#mobileaccount').show();		
			if (json[0].utype == 1) $('#mobile_accounttype').attr('class','account-pro1-icon');
			else if (json[0].utype == 2) $('#mobile_accounttype').attr('class','account-pro2-icon');
			else if (json[0].utype == 3) $('#mobile_accounttype').attr('class','account-pro3-icon');
			else $('#mobile_accounttype').attr('className','account-free-icon');			
			$('#mobile_acc_space').text(bytesToSize(Math.round(json[0].mstrg)));
			$('#mobile_acc_used').text(bytesToSize(Math.round(json[0].cstrg)));
			$('#mobile_acc_free').text(bytesToSize(Math.round(json[0].mstrg)-Math.round(json[0].cstrg)));			
			$('.storage-percentage-bg').width(Math.round(json[0].cstrg/json[0].mstrg*100) + '%');
			loadingDialog.hide();
		}
	});


}

function domsearch()
{
	$("#search-popup").addClass('hidden');
	$(".top-search-icon").removeClass('active'); 
	processsearch($('#mobile_searchtext').val());
	$('#mobile_searchtext').blur();
}


function mnewfolder()
{	
	$("#new-folder-popup").addClass('hidden');
	$(".overlay").addClass('hidden');
	mobileui();
	if(M.currentdirid)
	{	
		$('#mobile_newfoldername').blur();
		loadingDialog.show();		
		createfolder(M.currentdirid,$('#mobile_newfoldername').val());
	}
}


function mclosemenu()
{	
	$(".page-bg").removeClass('opened');
	$('#mmenubtn').removeClass('active');	
	iOS_enablehScrolling();
}

var mupload_init=false;

function initmobileupload()
{
	if (mupload_init) return false;		
	mobileui();
	$('.upload-percentage-bar').width('0%');
	$('#mobileupload_header').text(l[99]);
	$('#mobileuploadtime').text('');
	$('#mobileuploadtime').removeClass('complete');
	$('#uploadpopbtn').text(l[156]);	
	$('.upload-speed-bg2').text(l[819]);	
	$('.upload-status-txt').hide();			
	$('#uploadPopup').show();
	$('.overlay').height(iOS_getViewportSize().height+1000);
	$('.overlay').removeClass('hidden');
	mupload_init=true;
	iOS_disableScrolling();
}


function mobileimage()
{
	if (page == 'download') $('#preview-title').text(ellipsis(fdl_file.n,'center',20));
	else
	{
		var n = M.d[mfileinfo];		
		if (n) $('#preview-title').text(ellipsis(n.name,'center',20));
		else $('#preview-title').text('Image');
	}
	$('.preview-overlay').height(iOS_getViewportSize().height+1000);
	$('.preview-overlay').show();
	$('#preview-popup').show();
	$('#preview-img').attr('src',mobileDLurl);
}


function mobileimage_close()
{
	$('.preview-overlay').hide();
	$('#preview-popup').hide();
	if (mobileDLurl)
	{
		try { myURL.revokeObjectURL(mobileDLurl); } catch(e) {}
	}
}



function mcloseupload()
{
	if (ul_uploading)
	{	
		if (confirm(l[814]))
		{	
			for (var i in ul_queue)
			{
				if (ul_queue[i])
				{			
					if (i == ul_queue_num) ul_cancel();
					ul_queue[i] = false;			
				}
			}
		}
		else return false;				
	}
	else if (downloading)
	{
		if (confirm(l[815]))
		{	
			for (var i in dl_queue)
			{
				if (dl_queue[i])
				{					
					if (i == dl_queue_num) dl_cancel();
					dl_queue[i] = false;				
				}
			}		
		}
		else return false;	
	}
	$('#mobile_fileform')[0].reset();
	iOS_enableScrolling();	
	$('#uploadPopup').hide();
	$('.overlay').addClass('hidden');
	mobileuploads = [];
	mupload_init=false;
	mobile_ul_completed=false;
}


function mclosecontact()
{
	$("#add-contact-popup").addClass('hidden');
	$(".overlay").addClass('hidden');			
	$('#mobile_newcontact').val(l[802]);
	$('#top-add-icon').removeClass('active');
}


function mnewcontact()
{
	if (checkMail($('#mobile_newcontact').val()))
	{
		$('#mobile_newcontact').select();
		alert(l[816]);
	}
	else
	{
		loadingDialog.show();
		M.addContact($('#mobile_newcontact').val());
	}
}


function init_mfm()
{
	$('#mfm_addcontactbtn').unbind('click');
	$("#mfm_addcontactbtn").bind('click',function() 
	{
		mnewcontact();
	});	
	$('#mfm_closecontactbtn').unbind('click');
	$("#mfm_closecontactbtn").bind('click',function() 
	{
		mclosecontact();
	});	
	$('#mobile_share_add').unbind('click');
	$("#mobile_share_add").bind('click',function() 
	{
		doshare()
	});	
	$('#mobile_share_cancel').unbind('click');
	$("#mobile_share_cancel").bind('click',function() 
	{
		mcloseshare();
	});
	$('#mfm_preview_close').unbind('click');
	$("#mfm_preview_close").bind('click',function() 
	{
		mobileimage_close();
	});
	$('#mfm_uploadcancelbtn').unbind('click');
	$("#mfm_uploadcancelbtn").bind('click',function() 
	{
		mcloseupload();
	});	
	$('#mfm_uploadcancelbtn').unbind('click');
	$("#mfm_uploadcancelbtn").bind('click',function() 
	{
		mcloseupload();
	});
	$('#mfm_uploadcancelbtn').unbind('click');
	$("#mfm_uploadcancelbtn").bind('click',function() 
	{
		mcloseupload();
	});	
	
	$("#mobile_link").unbind('focus');
	$("#mobile_link").bind('focus',function() 
	{
		$(this)[0].setSelectionRange(0,9999);
	});	
	
	
	$('#mfm_linkclosebtn').unbind('click');
	$("#mfm_linkclosebtn").bind('click',function() 
	{
		mcloselink();
	});
	$('#mfm_rename_dobtn').unbind('click');
	$("#mfm_rename_dobtn").bind('click',function() 
	{
		mdorename();
	});
	$('#mfm_rename_closebtn').unbind('click');
	$("#mfm_rename_closebtn").bind('click',function() 
	{
		mcloserename();
	});	
	$('.main-menu-lnk').unbind('click');
	$(".main-menu-lnk").bind('click',function() 
	{
		mclosemenu();
	});
	$('#mbackbtn').unbind('click');
	$('#mbackbtn').bind('click',function() 
	{
		mback();
	});	
	$('#trashbinButton').unbind('click');
	$('#trashbinButton').bind('click',function() 
	{
		if (confirm(l[15])) M.clearRubbish();
		m_attr_events();
	});	
	$('#login_remember').unbind('click');
	$('#login_remember').bind('click',function() 
	{
		logincheckboxCheck('login_remember');
	});	
	$('#register_checkbox').unbind('click');
	$('#register_checkbox').bind('click',function() 
	{
		logincheckboxCheck('register_checkbox');
	});	
	$('#mfm_propayment1').unbind('click');
	$('#mfm_propayment1').bind('click',function() 
	{
		mobilebuypro(0);
	});	
	$('#mfm_propayment2').unbind('click');
	$('#mfm_propayment2').bind('click',function() 
	{
		mobilebuypro(1);
	});	
	$('#mfm_propayment2').unbind('click');
	$('#mfm_propayment2').bind('click',function() 
	{
		mstartdl();
	});	
	$('#mobile_download_import').unbind('click');
	$('#mobile_download_import').bind('click',function() 
	{
		mimport();
	});
	$('#mobiledownloadcheck').unbind('click');
	$('#mobiledownloadcheck').bind('click',function() 
	{
		logincheckboxCheck('mobiledownloadcheck');
	});	
	$('#mobile_file_open').unbind('click');
	$('#mobile_file_open').bind('click',function() 
	{
		mstartdl();
	});	
	$('#mobile_file_link').unbind('click');
	$('#mobile_file_link').bind('click',function() 
	{
		mgetlink();
	});
	$('#mobile_file_import').unbind('click');
	$('#mobile_file_import').bind('click',function() 
	{
		mimport();
	});
	$('#mobile_file_delete').unbind('click');
	$('#mobile_file_delete').bind('click',function() 
	{
		mdelete();
	});
	$('#mobile_file_rename').unbind('click');
	$('#mobile_file_rename').bind('click',function() 
	{
		mrename();
	});
	$('#mfm_folder_deletebtn').unbind('click');
	$('#mfm_folder_deletebtn').bind('click',function() 
	{
		mdelete();
	});
	$('#mfm_folder_renamebtn').unbind('click');
	$('#mfm_folder_renamebtn').bind('click',function() 
	{
		mrename();
	});
	$('#mfm_folder_linkbtn').unbind('click');
	$('#mfm_folder_linkbtn').bind('click',function() 
	{
		mgetlink();
	});	
	$('#mfm_folder_share').unbind('click');
	$('#mfm_folder_share').bind('click',function() 
	{
		mshowshare();
	});
	$('#mfm_pdf_closebtn').unbind('click');
	$('#mfm_pdf_closebtn').bind('click',function() 
	{
		mobilepdfclose();
	});
	$('#mfm_pdf_prevbtn').unbind('click');
	$('#mfm_pdf_prevbtn').bind('click',function() 
	{
		mobilepdfprev();
	});
	$('#mfm_pdf_nextbtn').unbind('click');
	$('#mfm_pdf_nextbtn').bind('click',function() 
	{
		mobilepdfnext();
	});
	$('#mobile_language_option').unbind('change');
	$('#mobile_language_option').bind('change',function(e) 
	{
		mobilelang(e.target);
	});
	
	$('#mfm_newfolder_frm').unbind('submit');
	$('#mfm_newfolder_frm').bind('submit',function(e) 
	{
		mnewfolder(); 
		return false;
	});
	$('#mfm_newcontact_frm').unbind('submit');
	$('#mfm_newcontact_frm').bind('submit',function(e) 
	{
		mnewcontact();
		return false;
	});	
	$('#mobile_newshare').unbind('focus');
	$('#mobile_newshare').bind('focus', function(e) 
	{
		if (e.target.value == l[802]) e.target.value='';
	});
	$('#mobile_newshare').unbind('blur');
	$('#mobile_newshare').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[802];	
	});	
	$('#mobile_share_email').unbind('focus');
	$('#mobile_share_email').bind('focus', function(e) 
	{
		if (e.target.value == l[802]) e.target.value='';
	});	
	$('#mobile_share_email').unbind('blur');
	$('#mobile_share_email').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[802];	
	});	
	$('#mobile_share_permission_option').unbind('change');
	$('#mobile_share_permission_option').bind('change',function(e) 
	{
		GetNextNode('mobile_share_permission');
	});	
	$('#mfm_newcontact_frm').unbind('submit');
	$('#mfm_newcontact_frm').bind('submit',function(e) 
	{
		mnewcontact();
		return false;
	});	
	$('#mfm_rename_frm').unbind('submit');
	$('#mfm_rename_frm').bind('submit',function(e) 
	{
		mdorename();
		return false;
	});	
	$('#mfm_search_frm').unbind('submit');
	$('#mfm_search_frm').bind('submit',function(e) 
	{
		return false;
	});
	$('#login_email').unbind('focus');
	$('#login_email').bind('focus', function(e) 
	{
		if (e.target.value == l[195]) e.target.value='';
	});	
	$('#login_email').unbind('blur');
	$('#login_email').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[195];	
		posiOs();
	});	
	$('#login_password').unbind('focus');
	$('#login_password').bind('focus', function(e) 
	{
		if (e.target.value == 'Password') e.target.value='';
	});	
	$('#login_password').unbind('blur');
	$('#login_password').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value='Password';
		mobileui();
	});	
	$('#register_name').unbind('focus');
	$('#register_name').bind('focus', function(e) 
	{
		if (e.target.value == l[206]) e.target.value='';
	});	
	$('#register_name').unbind('blur');
	$('#register_name').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[206];	
		mobileui();
	});	
	$('#register_email').unbind('focus');
	$('#register_email').bind('focus', function(e) 
	{
		if (e.target.value == l[207]) e.target.value='';
	});	
	$('#register_email').unbind('blur');
	$('#register_email').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value=l[207];	
		mobileui();
	});	
	$('#register_password').unbind('focus');
	$('#register_password').bind('focus', function(e) 
	{
		if (e.target.value == 'Password') e.target.value='';
	});	
	$('#register_password').unbind('blur');
	$('#register_password').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value='Password';
		mobileui();
	});	
	$('#register_password').unbind('keyup');
	$('#register_password').bind('keyup', function(e) 
	{
		register_checkpassword(e.target.value);
	});
	$('#register_password_confirm').unbind('focus');
	$('#register_password_confirm').bind('focus', function(e) 
	{
		if (e.target.value == 'Password') e.target.value='';
	});	
	$('#register_password_confirm').unbind('blur');
	$('#register_password_confirm').bind('blur', function(e) 
	{
		if (e.target.value == '') e.target.value='Password';
		mobileui();
	});	
	$('#register_password_confirm').unbind('keyup');
	$('#register_password_confirm').bind('keyup', function(e) 
	{
		register_checkpassword(e.target.value);
	});	
	
	$('#mfm_pw_btn').unbind('click');
	$('#mfm_pw_btn').bind('click',function() 
	{
		mdlpw();
		return false;
	});
	$('#download_password').unbind('focus');
	$('#download_password').bind('focus', function(e) 
	{
		if (e.target.value == l[380])
		{
			e.target.type='password';
			e.target.value='';
		}
	});	
	$('#download_password').unbind('blur');
	$('#download_password').bind('blur', function(e) 
	{
		if (e.target.value == '')
		{
			e.target.type='text';
			e.target.value=l[380];	
		}
	});
	$('#mfm_logout_btn').unbind('click');
	$('#mfm_logout_btn').bind('click', function(e) 
	{
		u_logout();
		document.location.reload();
	});	
	$('#mfm_desktop_btn').unbind('click');
	$('#mfm_desktop_btn').bind('click', function(e) 
	{
		logout();
		return false;
	});
	$('#mfm_login_btn').unbind('click');
	$('#mfm_login_btn').bind('click', function(e) 
	{
		dologin();
		return false;
	});
	$('#mfm_register_btn').unbind('click');
	$('#mfm_register_btn').bind('click', function(e) 
	{
		doregister();
		return false;
	});
	
	
	

	$('#mobile_fileselect1')[0].addEventListener("change", FileSelectHandler, false);
	$('#mobile_fileselect2')[0].addEventListener("change", FileSelectHandler, false);
	$('#mobile_fileselect3')[0].addEventListener("change", FileSelectHandler, false);
	
	mfmloaded=true;
	var j = 0;
	var i = 0;
	var rightPad = 0;
	var screenSize = $(window).width();	
	if(screenSize < 420)  rightPad = 39;	
	else rightPad = 57;
	
	
	
	$("#top-add-icon").unbind('click');
	$("#top-add-icon").bind('click',function() 
	{		
		if ($("#add-popup").attr('class').indexOf('hidden') != -1) 
		{				
			if (M.currentdirid == 'contacts')
			{
				$("#add-contact-popup").removeClass('hidden');
				$(".overlay").removeClass('hidden');
			}
			else
			{		
				$("#add-popup").removeClass('hidden');				
				$("#search-popup").addClass('hidden');
				$('.top-search-icon').removeClass('active');	
				mobile_uploadbuttons();	
			}
			$(this).addClass('active');		
		} 
		else 	
		{
			$(this).removeClass('active'); 
			if (M.currentdirid == 'contacts') mclosecontact();			
			else $("#add-popup").addClass('hidden');
			
		}
	});

	$(".top-search-icon").unbind('click');
	$(".top-search-icon").bind('click',function() 
	{	
		if (iOS_isiPhone() || iOS_isiPod()) setTimeout(function(){window.scrollTo(0, 1);},1000);
			
		
		
		if ($("#search-popup").attr('class').indexOf('hidden') != -1) 
		{			
			$("#search-popup").removeClass('hidden');
			$(this).addClass('active');
			$('#mobile_searchtext').focus();
			
			$("#add-popup").addClass('hidden');
			$('.top-add-icon').removeClass('active');		
		} 
		else 
		{
			$("#search-popup").addClass('hidden');
			$(this).removeClass('active'); 
		}
	});
	
	$('#mobile_rename').unbind('keypress');
	$('#mobile_rename').bind('keypress',function(e) 
	{
		if ((e.which == 13) && ($('#mobile_searchtext').val() != ''))
		{
            mdorename();
        }
	});
	  
	  $('#mobile_searchtext').unbind('keypress');
	  $('#mobile_searchtext').bind('keypress',function(e) 
	 {
        if ((e.which == 13) && ($('#mobile_searchtext').val() != ''))
		{
            domsearch();
        }
	  });

	
	
	$("#searchButton").unbind('click');
	$("#searchButton").bind('click',function() 
	{
		 domsearch();
	});

	$("#newFolderButton").unbind('click');
	$("#newFolderButton").bind('click',function() 
	{			
	  if (M.currentdirid)
	  {
		  $("#new-folder-popup").removeClass('hidden');
		  $(".overlay").removeClass('hidden');
		  $("#add-popup").addClass('hidden');
		  $("#top-add-icon").removeClass('active'); 
		  $('#mobile_newfoldername').val('');
		  $('#mobile_newfoldername').focus();
	   }
	   else
	   {
		alert(l[817]);
	   }
	});

	$("#newFolderCancel").unbind('click');
	$("#newFolderCancel").bind('click',function() 
	{
	  $("#new-folder-popup").addClass('hidden');
	  $(".overlay").addClass('hidden');
	   mobileui();
	});

	$("#newFolderAdd").unbind('click');
	$("#newFolderAdd").bind('click',function() 
	{
	  mnewfolder();
	});
	

	$('.top-menu-icon').unbind('click');
	$('.top-menu-icon').bind('click',function() 
	{
		var c = $('.page-bg').attr('class'); 		
		if (c && c.indexOf('opened') == -1) 
		{
		  $(this).addClass('active');
		  $(".page-bg").addClass('opened');
		} 
		else 
		{	
		    $(this).removeClass('active');
		    $(".page-bg").removeClass('opened');
	    }
	});
	
	mobilelang_init(); 
	if (iOS_isiPhone() || iOS_isiPod()) iOS_enableAhider();	
}


var mobile_w_val = {};


var mlang_init=false;
function mobilelang_init()
{
	if (mlang_init) return false;	
	mlang_init=true;
	for (var i in languages)
	{
		if (languages[i].length > 0)
		{
			var selected = '';
			if (lang == i)
			{
				selected = 'selected';
				$('#mobile_language').text(ln[i]);
			}
			$('#mobile_language_option').append('<option value="' + i + '" '+selected+'>' + ln[i] + '</option>');
		}		
	}
}


function mobile_desktop()
{
	if (confirm(l[818]))
	{
		sessionStorage.desktop=1;
		window.location.reload();
	}
}


function mobilelang(el)
{	
	setlang(GetNextNode('mobile_language'));
}