


var notifications;

function pollnotifications()
{
	if (u_type == 3 && typeof notifications == 'undefined')
	{
		notifications = [];		
		if (M.currentdirid == 'notifications') loadingDialog.show();		
		api_req('sc?c=100',
		{
			callback: function (json,params)
			{
				if (typeof json == 'object' && json.fsn && u_type)
				{
					if (M.currentdirid == 'notifications') loadingDialog.hide();					
					notifications = [];	
					var nread=false;
					for (var i in json.c)
					{
					if (json.la == i) nread=true;		
					notifications.push({
						id: 		makeid(10),
						type: 		json.c[i].t,
						timestamp:  (new Date().getTime()/1000)-json.c[i].td,
						user:		json.c[i].u,
						folderid: 	json.c[i].n,
						nodes:		json.c[i].f,
						read:		nread,
						popup:		true,
						count:		nread,
						rendered:	true
					});
					}
					var c = $('.notification-popup').attr('class');
					donotify();
					$('.cloud-popup-icon').show();
				}
			}
		 });		
	}
}

var lastnotification=0;


function notifycounter()
{
	if (typeof notifications == 'undefined') return false;
	var a=0;
	$.each(notifications, function(i,n) 
	{
		if (!n.count) a++;		
	});	
	
	if (a == 0)
	{	
		$('.notification-num').hide();
		$('.notification-num').text(0);
	}
	else
	{
		$('.notification-num').text(a);
		$('.notification-num').show();	
	}
	megatitle();
}

function donotify()
{
	if (typeof notifications == 'undefined') return false;
	var useremails = {};	
	if (M && M.u) for (var i in M.u) useremails[i] = M.u[i].m;
	notifications.sort(function(a,b)
	{		
		if (a.timestamp > b.timestamp) return -1;
		else if (a.timestamp < b.timestamp) return 1;
		else return 0;
	});
	
	var phtml = '',nhtml = '';	
	var i=0,a=0;
	var curdate = false;
	
	$.each(notifications, function(i,n) 
	{
		if ((i > 100) && (page != 'notifications')) return false;		
		var date = 	new Date(n.timestamp*1000).getFullYear() + '-' + new Date(n.timestamp*1000).getMonth() + '-' + new Date(n.timestamp*1000).getDate();		
		if (curdate != date)
		{
			nhtml += ntdatehtml(n.timestamp*1000);
			curdate = date;
		}
		var obj=false;
		var title='';		
		if (n.type == 'share')
		{
			// new share
			if (useremails[n.user]) title = l[824].replace('[X]',htmlentities(useremails[n.user]));
			else title = l[825];
			obj= notificationhtml(n.id,'share',title,n.timestamp,n.read);
		}
		else if (n.type == 'dshare')
		{
			// revoked share
			if (useremails[n.user]) title = l[826].replace('[X]',htmlentities(useremails[n.user]));
			else title = l[827];
			obj = notificationhtml(n.id,'dshare',title,n.timestamp,n.read);			
		}
		else if (n.type == 'put')
		{
			// put nodes
			var nodes = n.nodes;
			var filecnt=0;
			var foldercnt=0;
			var ntext='';		
			for(var j in nodes)
			{
				if (nodes[j].t == 1) foldercnt++;
				else filecnt++;				
			}			
			if ((foldercnt > 1) && (filecnt > 1)) ntext = l[828].replace('[X1]',foldercnt).replace('[X2]',filecnt);
			else if ((foldercnt > 1) && (filecnt == 1)) ntext = l[829].replace('[X]',foldercnt);
			else if ((foldercnt == 1) && (filecnt > 1)) ntext = l[830].replace('[X]',filecnt);
			else if ((foldercnt == 1) && (filecnt == 1)) ntext = l[831];
			else if (foldercnt > 1)  ntext = l[832].replace('[X]',foldercnt);
			else if (filecnt > 1)  ntext = l[833].replace('[X]',filecnt);
			else if (foldercnt == 1)  ntext = l[834];
			else if (filecnt == 1)  ntext = l[835];			
			if (useremails[n.user]) title = l[836].replace('[X]',htmlentities(useremails[n.user])).replace('[DATA]',ntext);
			else if ((filecnt + foldercnt) > 1) title = l[837].replace('[X]',ntext);
			else title = l[838].replace('[X]',ntext);
			obj = notificationhtml(n.id,'put',title,n.timestamp,n.read);	
		}		
		if (obj)
		{		
			nhtml += obj.nhtml;				
			var max = Math.floor(($('body').height()-50)/70);			
			if (max > 10) max = 10;
			if (i < max) phtml += obj.rhtml;			
			if (!n.popup)
			{
				n.popup=true;
				donotifypopup(n.id,obj.phtml);
			}
		}
		if (!n.count) a++;
	});
	
	if (M.currentdirid == 'notifications')
	{
		notifymarkcount(true);
		notifycounter();
		$('.new-notification-pad').html(nhtml);
		$('.nt-info-txt,.new-notification-pad .notification-type').unbind('click');
		$('.nt-info-txt,.new-notification-pad .notification-type').bind('click', function(e)
		{
			var id = $(this).attr('id');
			if (id)
			{		
				id = id.replace('no_','');
				id = id.replace('type_','');
				id = id.replace('txt_','');
				
				for (var i in notifications)
				{
					if (notifications[i].id == id && (notifications[i].type == 'put' || notifications[i].type == 'share'))
					{						
						$.selected=[];					
						for (var j in notifications[i].nodes) $.selected.push(notifications[i].nodes[j].h);						
						M.openFolder(notifications[i].folderid);						
						reselect(1);
					}					
				}
			}	
		});
		notificationsScroll();	
	}
	
	if (a == 0)
	{
		$('.notification-num').text(0);
		$('.notification-num').hide();	
	}
	else
	{
		$('.notification-num').text(a);
		$('.notification-num').show();	
	}
	$('.notification-scr-list').html(phtml);
	
	var jsp = $('.notification-scroll').data('jsp');
	if (jsp) jsp.destroy();
	$('.notification-scroll').jScrollPane({showArrows:true, arrowSize:5});	
	jScrollFade('.notification-scroll');
	
	if (notifications.length == 0)
	{
		$('.notification-popup').addClass('empty');
		$('.nt-main-block').addClass('empty');
	}
	else
	{
		$('.notification-popup').removeClass('empty');
		$('.nt-main-block').removeClass('empty');
	}		
	
	$('.notification-item').unbind('click');
	$('.notification-item').bind('click',function(el,i)
	{
		notifymarkcount(true);
		notifycounter();
		$('.notification-popup').addClass('hidden');
		$('.cloud-popup-icon').removeClass('active');
		var id = $(this).attr('id');
		if (id)
		{
			for (var i in notifications)
			{
				if (notifications[i].id == id && (notifications[i].type == 'put' || notifications[i].type == 'share'))
				{						
					$.selected=[];					
					for (var j in notifications[i].nodes) $.selected.push(notifications[i].nodes[j].h);						
					M.openFolder(notifications[i].folderid);						
					reselect(1);
				}					
			}
		}
	});	
	megatitle();
}

function notifyclock()
{
	 if ($(".cloud-popup-icon").attr('class').indexOf('active') > 0)
	 {		
		donotify();
		var node = notifications[0];		
		if ((node) && (node.timestamp*1000 > new Date().getTime()-60000)) setTimeout(notifyclock,990);
		else setTimeout(notifyclock,60000);		
	 }
}

function hide_notiblock()
{
	notifymarkcount(true);
	$(".notification-icon").removeClass('active');
	$('.notification-popup').addClass('hidden');
}

function popup(id,html)
{
	$('#popnotifications').append(html);
	$('#popup_' + id).css('bottom', ($('.nt-popup').length*61)-50 + 'px');
	$('#popup_' + id).css('opacity',0).show().animate({opacity:1});
	setTimeout(hide_notipop,5000,id);
}

function hide_notipop(id)
{	
	if ((id) && ($('#popup_' + id).css('opacity') == 1))
	{
		$('#popup_' + id).css('opacity',1).show().animate({opacity:0});	
		setTimeout(remove_notipop,1000);
	}
}

var click_noti_id = false;

function click_noti(id)
{
	click_noti_id = id;
	hide_notipop(id);
}

function remove_notipop()
{
	$('.nt-popup').each(function(id,el) 
	{ 
		if ($(el).css('opacity') == 0) $(el).remove();
	});	
}


function notifymarkcount(nread)
{	
	var a=0;
	for (i in notifications)
	{
		var n = notifications[i];	
		n.count=true;
		if (nread && !n.read)
		{
			n.read=true;
			a++;
		}
	}	
	if (nread && $.maxnotification !== maxaction && a > 0)
	{
		$.maxnotification=maxaction;
		api_req([{a:'sla',i: requesti}]);	
	}
}


function render_notifications()
{
	for (i in notifications)
	{
		var n = notifications[i];	
		n.count=true;	
	}
}

function ntdatehtml(timestamp)
{
	var months = [l[850],l[851],l[852],l[853],l[854],l[855],l[856],l[857],l[858],l[859],l[860],l[861]];
	var month = months[new Date(timestamp).getMonth()];
	var day = new Date(timestamp).getDate();
	return '<div class="nt-circle-bg1"><div class="nt-circle-bg2"><div class="nt-circle-bg3"><span class="nt-circle-date">' + day + '</span><span class="nt-circle-month">' + month + '</span></div></div></div>';
}


function notificationhtml(id,type,title,time,read)
{
	var className='',rhtml='',phtml='',nread='',href='',nstyle='',nstyle2='',onclick = '',nhtml='';
	if (read) nread = 'read';		
	if (type == 'share')
	{
		 className = 'nt-incoming-share';
		 nstyle2 = 'style="cursor:pointer;"';	 
	}
	else if (type == 'put')
	{
		 className = 'nt-new-files';
		 nstyle2 = 'style="cursor:pointer;"';
	}
	else if (type == 'dshare')
	{
		className = 'nt-revocation-of-incoming';	
		nstyle = 'style="cursor:default;"';
	}
	
	rhtml += '<a class="notification-item ' + className + ' ' + nread + '" ' + nstyle + ' id="' + htmlentities(id) + '">';
	rhtml += '<span class="notification-status-icon">';
	rhtml += '<span class="notification-type">';
	rhtml += '<span class="notification-content">';
	rhtml += '<span class="notification-info">' + title + '</span>';
	rhtml += '<span class="notification-date">' + time2last(time) + '</span>';
	rhtml += '</span></span></span></a>';	
	
	phtml += '<div class="nt-popup ' + className + '" id="popup_' + id + '">'
	phtml += '<div class="notification-type">'
	phtml += '<div class="notification-content">';
	phtml += '<div class="nt-popup-close"></div>';
	phtml += '<div class="notification-info" ' + nstyle2 + '>' + title + '</div>';
	phtml += '</div></div></div>';	

	nhtml += '<div class="nt-main-date">' + time2last(time) + '</div>';
	nhtml += '<div class="nt-info-block" id="no_'+id+'">';
	nhtml += '<div class="nt-info-connector"></div>';
	nhtml += '<div class="notification-type ' + className + '" ' + nstyle2 + ' id="type_' + htmlentities(id) + '"></div>';
	nhtml += '<div class="nt-info-txt" ' + nstyle2 + ' id="txt_' + htmlentities(id) + '">' + title + '</div>';
	nhtml += '<div class="clear"></div></div><div class="clear"></div>';
	
	var r = 
	{
		nhtml: nhtml,
		rhtml: rhtml, 
		phtml: phtml
	};	
	return r;
}

function donotifypopup(id,html)
{	
	$('#popnotifications').append(html);
	$('#popup_' + id).css('bottom', ($('.nt-popup').length*61)-50 + 'px');
	$('#popup_' + id).css('opacity',0).show().animate({opacity:1});
	
	$('.nt-popup').bind('unbind');
	$('.nt-popup').bind('click',function(e)
	{	
		var id = $(this).attr('id');
		if (id)
		{
			id = id.replace('popup_','');			
			for (var i in notifications)
			{
				if (notifications[i].id == id && (notifications[i].type == 'put' || notifications[i].type == 'share'))
				{						
					$.selected=[];					
					for (var j in notifications[i].nodes) $.selected.push(notifications[i].nodes[j].h);						
					M.openFolder(notifications[i].folderid);						
					reselect(1);
				}					
			}			
			hide_notipop(id);			
		}
		console.log('click');		
	});	
	setTimeout(hide_notipop,30000,id);
}

function initNotifications()
{
	if (typeof notifications !== 'undefined' && notifications.length > 0) $('.cloud-popup-icon').show();
	else $('.cloud-popup-icon').hide();
	
	$('.cloud-popup-icon').unbind('click');
	$('.cloud-popup-icon').bind('click',function() 
	{	  
	  if ($(this).attr('class').indexOf('active') == -1) 
	  {
		  $(this).addClass('active');
		  $('.notification-popup').css('left', $(this).position().left);
		  $('.notification-popup').removeClass('hidden');
		  notifyclock();		
		  donotify();		  
	  } 
	  else 
	  {
		  notifymarkcount(true);
		  notifycounter();
		  $(this).removeClass('active');
		  $('.notification-popup').addClass('hidden');
	  }
	});
	
	$('.notifications-button').unbind('click');
	$('.notifications-button').bind('click',function(e)
	{
		$('.cloud-popup-icon').removeClass('active');
		$('.notification-popup').addClass('hidden');
		document.location.hash = 'fm/notifications';
	});
	
	notifycounter();
}