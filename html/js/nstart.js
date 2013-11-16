var sbut_f=false;
var sbut_mi =0;
var sbut_di = 0;

function sbut_mouseover()
{	
	sbut_di = 1;
	if (!sbut_f) setTimeout("fadebutton()",5);
}

function fadebutton(init)
{
	var b1 = $('.nstart-button')[0];		
	var m = $('.nstart-mega')[0];
	var t = $('.nstart-txt')[0];	
	var s1 = $('.nstart-shadow')[0];	
	var c1 = $('.nstart-cursor')[0];	
	if ((b1) && (m) && (t) && (s1) && (c1))
	{
		b1.style.width = Math.floor(710+(sbut_mi/20)*50) + 'px';
		b1.style.height = Math.round(150+(sbut_mi/20)*10) + 'px';	
		b1.style.marginTop = Math.ceil(-75-(sbut_mi/20)*5) + 'px';
		b1.style.marginLeft = Math.round(-355-(sbut_mi/20)*15) + 'px';		
		s1.style.marginTop = Math.round(95+(sbut_mi/20)*5) + 'px';	
		c1.style.marginRight = Math.round(-492+(sbut_mi/20)*35) + 'px';	
				
		if (sbut_mi > 11)
		{				
			t.style.opacity = (sbut_mi-15)/5*1;			
			t.style.filter = 'alpha(opacity=' + Math.floor((sbut_mi-15)/5*100) + ')';		
		}
		else
		{			
			m.style.opacity = Math.ceil((1-(sbut_mi)/5*1)*100)/100;
			m.style.filter = 'alpha(opacity=' + Math.floor(100-(sbut_mi)/5*100) + ')';					
		}	
		if ((sbut_di) && (sbut_mi < 20))
		{
			sbut_f=true;
			sbut_mi+=2;
			setTimeout("fadebutton()",20);
		}
		else if ((!sbut_di) && (sbut_mi > 0))
		{
			sbut_f=true;
			sbut_mi=sbut_mi-2;
			setTimeout("fadebutton()",20);		
		}
		else sbut_f=false;
	}
	else sbut_mi=0;
}

function sbut_mouseout()
{	
	sbut_di = 0;
	if (!sbut_f) setTimeout("fadebutton()",5);
}
var draganddrop=false;

function init_nstart()
{

	$('.nstart-inputs').bind('mouseover', function(e) 
	{
		sbut_mouseover();
	});	
	$('.nstart-inputs').bind('mouseout', function(e) 
	{
		sbut_mouseout();
	});
	$('.nstart-inputs').bind('click', function(e) 
	{
		sbut_click();
	});
	sbut_f=false;
	sbut_mi =0;
	sbut_di = 0;
	
	if (ul_method)
	{
		document.getElementById('start_uploadbutton').innerHTML = '';		
		//document.getElementById('startswfdiv').innerHTML = '<object data="' + staticpath + 'uploader.swf" id="start_uploaderswf" type="application/x-shockwave-flash" width="0" height="0" ><param name="wmode" value="transparent"><param value="always" name="allowscriptaccess"><param value="all" name="allowNetworking"></object>';	
		//$('#start_uploadbutton').append($('#start_uploaderswf'));
		//document.getElementById('start_uploaderswf').width = '760';
		//document.getElementById('start_uploaderswf').height = '150';
	}
	else
	{	
		var inputhtml ='';	 
		var i =1;
		while (i < 9)
		{
			inputhtml += '<input type="file" style="height:20px; width:760px;" size="113" id="start_fileselect' + i + '" multiple>';
			i++;
		}			
		document.getElementById('start_uploadbutton').innerHTML = inputhtml;		
		if('draggable' in document.createElement('span')) draganddrop=true;										
		var i =1;
		while (i < 9)
		{
			document.getElementById("start_fileselect" + i).addEventListener("change", start_FileSelectHandler, false);		
			i++;
		}
		document.getElementById("pageholder").addEventListener("dragover", FileDragHover, false);
		document.getElementById("pageholder").addEventListener("dragleave", FileDragLeave, false);
		document.getElementById("pageholder").addEventListener("drop", start_FileSelectHandler, false);		
		$('.nstart-inputs')[0].addEventListener("dragover", FileDragHover, false);
		$('.nstart-inputs')[0].addEventListener("dragleave", FileDragLeave, false);
		$('.nstart-inputs')[0].addEventListener("drop", start_FileSelectHandler, false);
	}	
	if (!draganddrop) $('.nstart-bottom-block').addClass('ie');	
	if (u_wasloggedin()) document.getElementById('start_uploadbutton').innerHTML = '';	
	if (ie9) setTimeout("chromeDialog.show()",2000);	
	$('.nstart-txt')[0].style.opacity=0;
	$('.nstart-txt')[0].style.filter = 'alpha(opacity=0)';
}


function sbut_click()
{
	if ((u_wasloggedin()) || (ul_method))
	{
		login_txt = l[420];
		document.location.hash = 'login';
		return false;
	}
}


function start_FileSelectHandler(e) 
{			
	init_anoupload=true;
	FileSelectHandler(e); 	
}


function anoupload()
{
	if (u_wasloggedin())
	{
		login_txt = l[420];
		document.location.hash = 'login';
		return false;
	}
	init_page_fm();	
	termsDialog.show();
	u_storage = localStorage;	
	u_checklogin(
	{
		checkloginresult: function(u_ctx,r)
		{			
			u_type = r;
			u_checked=true;	
			document.getElementById('menu_login').style.display='none';
			document.getElementById('menu_abort').style.display='';	
			loadfm(true);				
		}
	},true);
	
}

