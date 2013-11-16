/*
 * iOS.js v1.0
 * http://www.iOSjs.com/
 *
 * Developed by Empty Galaxy
 * http://www.emptygalaxy.com/
 *
 * Copyright (c) 2011
 * Dual-licensed under the BSD or MIT licenses.
 * http://www.iOSjs.com/license/
 */

//	listen for events
iOS_addEventListener(window, "load", iOS_handleWindowLoad);
iOS_addEventListener(window, "orientationchange", iOS_handleOrientationChange);
iOS_addEventListener(window, "resize", iOS_handleReize);

function iOS_addEventListener(obj, evType, fn)
{
	if(obj.addEventListener)
	{
		obj.addEventListener(evType, fn, false);
		return true;
	}
	else if(obj.attachEvent)
	{
		var r	= obj.attachEvent("on" + evType, fn);
		return r;
	}
	else
	{
		return false;
	}
}

function iOS_removeEventListener(obj, evType, fn)
{
	if(obj.removeEventListener)
	{
		obj.removeEventListener(evType, fn, false);
		return true;
	}
	else if(obj.detachEvent)
	{
		var r	= obj.detachEvent("on" + evType, fn);
		return r;
	}
	else
	{
		return false;
	}
}

//	handle events
function iOS_handleWindowLoad(e)
{
	iOS_initPage();
	iOS_updateOrientation();
	iOS_updateHeight();	
	//	slightly delay hiding the address bar
	setTimeout("iOS_hideAddressBar();", 100);
}

function iOS_handleOrientationChange(e)
{	
	iOS_updateOrientation();
	iOS_resize();
	
	//	slightly delay hiding the address bar
	setTimeout("iOS_hideAddressBar();", 100);
}

function iOS_handleReize(e)
{
	iOS_resize();
}


//	page functions
function iOS_initPage()
{	
	if(navigator.standalone)	iOS_createWebappLinks();	
	//	iOS class
	var ua		= navigator.userAgent;
	if(iOS_isiOSdevice())
	{
		var html = document.documentElement;
		
		//	set the iOS class on <html>
		var classes	= html.className.split(" ");
		if(classes.indexOf("iOS") == -1)	classes.push("iOS");
		if(iOS_hasRetinaDisplay() && classes.indexOf("retina") == -1)	classes.push("retina");
		html.className	= classes.join(" ");
		
		//	Device
		if(ua.indexOf("iPhone") > -1)		html.setAttribute("device", "iPhone");
		else if(ua.indexOf("iPod") > -1)	html.setAttribute("device", "iPod");
		else if(ua.indexOf("iPad") > -1)	html.setAttribute("device", "iPad");
		
		//	Device Family
		if(ua.indexOf("iPhone") > -1 || ua.indexOf("iPod") > -1)	html.setAttribute("deviceFamily", "iPhone_iPod");
		else if(ua.indexOf("iPad") > -1)							html.setAttribute("deviceFamily", "iPad");
	}

}

function iOS_updateOrientation()
{
	if (mobileloaded) 
	{
		mobileui();
		mclosemenu();
	}
	var orientation	= "portrait";
	if(window.orientation == 90 || window.orientation == -90)	orientation	= "landscape";
	document.documentElement.setAttribute("orientation", orientation);
}

function iOS_resize()
{
	iOS_updateHeight();
}


//	UI actions
function iOS_hideAddressBar()
{
	if(window.pageYOffset <= 1)	window.scrollTo(window.pageXOffset, 1);
}

function iOS_hideAddressBarDelayed()
{
	setTimeout(iOS_hideAddressBar,100);
}

function iOS_disableScrolling()
{
	iOS_addEventListener(document.body, "touchmove", iOS_preventScrolling);
}

function iOS_enableScrolling()
{
	iOS_removeEventListener(document.body, "touchmove", iOS_preventScrolling);
}

function iOS_disableAhider()
{
	iOS_removeEventListener(document.body, "touchmove", iOS_hideAddressBarDelayed);	
}

function iOS_enableAhider()
{
	iOS_addEventListener(document.body, "touchmove", iOS_hideAddressBarDelayed);	
}





function iOS_disablehScrolling()
{
	iOS_addEventListener(document.body, "touchmove", iOS_preventhScrolling);
	iOS_addEventListener(document.body, "touchstart", iOS_preventhScrolling2);
}

function iOS_enablehScrolling()
{
	iOS_removeEventListener(document.body, "touchmove", iOS_preventhScrolling);
	iOS_addEventListener(document.body, "touchstart", iOS_preventhScrolling2);
}


var xStart, yStart = 0;

function iOS_preventhScrolling2(e)
{
	 xStart = e.touches[0].screenX;
    yStart = e.touches[0].screenY;

}

function iOS_preventhScrolling(e)
{
	var xMovement = Math.abs(e.touches[0].screenX - xStart);
    var yMovement = Math.abs(e.touches[0].screenY - yStart);
    if(xMovement*2 > yMovement) 
	{
        e.preventDefault();
    }
	setTimeout(function() 
		{
			$(window).scrollLeft(0);		
		},100);
}


function iOS_preventScrolling(e)
{	
	//if(e.touches.length==1)
	{
		e.preventDefault();
		iOS_hideAddressBar();
	}
}

function iOS_disableZooming()
{
	iOS_addEventListener(document.body, "touchmove", iOS_preventZooming);
}

function iOS_enableZooming()
{
	iOS_removeEventListener(document.body, "touchmove", iOS_preventZooming);
}

function iOS_preventZooming(e)
{
	if(e.touches.length==2)	e.preventDefault();
}

function iOS_updateHeight()
{
	var viewportSize	= iOS_getViewportSize();
	document.body.style.minHeight	= Math.round(viewportSize.height) + "px";
}

//	content functions
function iOS_createWebappLinks()
{
	var aList	= document.getElementsByTagName("a");
	for(var i=0; i<aList.length; i++)
	{
		var a	= aList[i];
		if(a.href != "" && a.target == "")
		{
			a.onclick	= function(){window.location=this.getAttribute("href");return false;}
		}
	}
}

//	get-functions
function iOS_isiOSDevice()	{	return navigator.userAgent.indexOf("iPhone") > -1 || navigator.userAgent.indexOf("iPod") > -1 || navigator.userAgent.indexOf("iPad") > -1;	}
function iOS_isiPhone()	{	return ((navigator.userAgent.indexOf("iPhone") > -1) && (navigator.userAgent.indexOf("Safari") > -1));	}
function iOS_isiPod()	{	return ((navigator.userAgent.indexOf("iPhone") > -1) && (navigator.userAgent.indexOf("Safari") > -1));	}
function iOS_isiPad()	{	return navigator.userAgent.indexOf("iPad") > -1;	}

function iOS_hasRetinaDisplay()
{
	return window.devicePixelRatio > 1;
}

function iOS_normalGetWindowSize()
{
	var width	= 0;
	var heigth	= 0;	
	if(typeof(window.innerWidth) == "number")
	{
		//	non-IE
		width	= window.innerWidth;
		height	= window.innerHeight;
	}
	else if(document.documentElement && (document.documentElement.clientWidth || document.documentElement.clientHeight))
	{
		//	IE 6+ in 'standards compliant mode'
		width	= document.documentElement.clientWidth;
		height	= document.documentElement.clientHeight;
	}
	else if(document.body && (document.body.clientWidth || document.body.clientHeight))
	{
		//	IE 4 compatible
		width	= document.body.clientWidth;
		height	= document.body.clientHeight;
	}	
	return {width:width, height:height};
}

function iOS_getWindowSize()
{
	

	var width	= 0;
	var height	= 0;	
	var ua		= navigator.userAgent;
	if(iOS_isiOSdevice())
	{
		//	start with screen resolution
		width	= screen.width;
		height	= screen.height;		
		//	swap width & height
		
		
		
		if(window.orientation != 0)
		{
			var temp	= width;
			width		= height;
			height		= temp;
		}		
		
		

		
		//	subtract height of the status bar
		if(!(navigator.standalone && iOS_getMetaContent("apple-mobile-web-app-status-bar-style").toLowerCase() == "black-translucent"))	height	-= 20;		
		
		if(ua.indexOf("iPhone") > -1 || ua.indexOf("iPod") > -1)
		{
			if(!navigator.standalone)
			{
				//	subtract height of the button bar
				if(window.orientation == 0)	height	-= 44;
				else						height	-= 32;
			}
		}		
		
		
		
		if(ua.indexOf("iPad") > -1)
		{
			//	subtract height of the navigation bar
			if(!navigator.standalone)	height	-= 58;
		}
	}
	else
	{
		var size	= iOS_normalGetWindowSize();
		width		= size.width;
		height		= size.height;
	}	
	
	
	
	
	return {width:width, height:height};
	
	
}




function iOS_getViewportSize()
{
		var windowSize	= iOS_getWindowSize();
		var bodySize	= iOS_getElementSize(document.body);				
		var scale		= bodySize.width / windowSize.width;
		return {width:(windowSize.width * scale), height:(windowSize.height * scale)};
}

function iOS_getPageSize()
{
	var bodySize	= iOS_getElementSize(document.body);
	return bodySize;
}

function iOS_getElementSize(element)
{
	if(!element)	return {width:0, height:0};
	
	var ns4;
	if(ns4)
	{
		var elem	= getObjNN4(document, element);
		return {width:elem.clip.width, height:elem.clip.height};
	}
	else
	{
		if(document.all)	return {width:element.style.pixelWidth, height:element.style.pixelHeight};
		else				return {width:element.offsetWidth, height:element.offsetHeight};
	}
}

function iOS_getMetaContent(name)
{
	name	= name.toLowerCase();
	var metaList = document.getElementsByTagName("meta");
	for(var i=0; i<metaList.length; i++)
	{
		var meta	= metaList[i];
		if(meta.name.toLowerCase() == name)
		{
			return meta.content;
		}
	}
	
	return '';
}

function iOS_isiOSdevice()
{
	var ua	= navigator.userAgent;
	return (ua.indexOf("iPhone") > -1 || ua.indexOf("iPod") > -1 || ua.indexOf("iPad") > -1);
}


