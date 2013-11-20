

function voucherCentering(button) 
{
	var popupBlock = $('.fm-voucher-popup');
	var rigthPosition = $('.fm-account-main').outerWidth()-$(popupBlock).outerWidth();		
	var buttonMid = button.width()/2;
	popupBlock.css('top', button.position().top + 30);
	popupBlock.css('left', button.position().left + buttonMid + 20 - popupBlock.width()/2);
	if(rigthPosition - 20 < popupBlock.position().left) 
	{
		popupBlock.css('left', rigthPosition - 20);
	}
}


function andreiScripts()
{
	/*
	$('.on_off :checkbox').iphoneStyle({ resizeContainer: false, resizeHandle: false, onChange: function(elem, data) 
	{
		if(data) $(elem).closest('.on_off').addClass('active');
		else $(elem).closest('.on_off').removeClass('active');			
	}});
	*/
}

function initAccountScroll()
{
	$('.fm-account-main').jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5,animateScroll: true});
	jScrollFade('.fm-account-main');
}

function initGridScrolling() 
{
	$('.grid-scrolling-table').jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5});
	jScrollFade('.grid-scrolling-table');
}
function initFileblocksScrolling() 
{
	$('.file-block-scrolling').jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5});
	jScrollFade('.file-block-scrolling');
	$('.file-block-scrolling.jspPane').height('');
}

function initContactsGridScrolling() 
{
	var jsp = $('.contacts-grid-scrolling-table').data('jsp');
	if (jsp) jsp.destroy();
	$('.contacts-grid-scrolling-table').jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5});
	jScrollFade('.contacts-grid-scrolling-table');
}
function initContactsBlocksScrolling() 
{
	var jsp = $('.contacts-blocks-scrolling').data('jsp');
	if (jsp) jsp.destroy();
	$('.contacts-blocks-scrolling').jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5});
	jScrollFade('.contacts-blocks-scrolling');
}

function initTranferScroll() 
{
	$('.transfer-scrolling-table').jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5, verticalDragMinHeight: 20});	
	jScrollFade('.transfer-scrolling-table');
}
function initTreeScroll() 
{
	$('.fm-tree-panel').jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5,animateScroll: true});
	$('.fm-tree-panel').unbind('jsp-scroll-y.droppable');
	$('.fm-tree-panel').bind('jsp-scroll-y.droppable',function(event, scrollPositionY, isAtTop, isAtBottom)
	{
		var t =Math.random();
		$.scroller=t;
		setTimeout(function()
		{
			if (t == $.scroller) treeDroppable();			
		},100);
	});
	jScrollFade('.fm-tree-panel');
}


var ddtreedisabled = {};
function treeDroppable()
{
	var t=new Date().getTime();
	var tt = $('.fm-tree-panel .jspPane').position().top;
	var toptop=false;	
	$('.fm-tree-panel .ui-droppable').each(function(i,e)
	{		
		var id = $(e).attr('id');
		if (!id) 
		{
			$(e).uniqueId();
			id = $(e).attr('id');
		}
		if (toptop || (tt+$(e).height()+$(e).position().top-10 > 0))
		{
			toptop=1;
			if (ddtreedisabled[id])
			{
				delete ddtreedisabled[id];
				$(e).droppable("enable");				
			}
		}
		else 
		{
			ddtreedisabled[id]=1;
			$(e).droppable("disable");
		}	
	});
}


function notificationsScroll()
{
	$('.new-notifications-scroll').jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5, verticalDragMinHeight:250,mouseWheelSpeed:100});	
	jScrollFade('.new-notifications-scroll');
}


function cacheselect()
{
	$.selected=[];
	$($.selectddUIgrid + ' ' + $.selectddUIitem).each(function(i,o)
	{
		if ($(o).attr('class').indexOf('ui-selected') > -1) $.selected.push($(o).attr('id'));			
	});
}

function hideEmptyMsg()
{
	$('.fm-empty-trashbin').addClass('hidden');	
	$('.fm-empty-contacts').addClass('hidden');
	$('.fm-empty-search').addClass('hidden');
	$('.fm-empty-cloud').addClass('hidden');
	$('.fm-empty-messages').addClass('hidden');
}



function reselect(n)
{
	$('.ui-selected').removeClass('ui-selected');
	if (typeof $.selected == 'undefined') $.selected=[];
	for (var i in $.selected) 
	{
		$('#' + $.selected[i]).addClass('ui-selected');		
		if (n)
		{	
			$('#' + $.selected[i] + ' .grid-status-icon').addClass('new');
			$('#' + $.selected[i] + ' .file-status-icon').addClass('new');
		}		
	}		
	if (n)
	{
		if (M.viewmode)
		{
			var jsp = $('.file-block-scrolling').data('jsp');
			var el = $('a.ui-selected');			
		}
		else
		{		
			var jsp = $('.grid-scrolling-table').data('jsp');
			var el = $('tr.ui-selected');
		}
		if (el.length > 0) el = el[0];
		else el=false;
		if (el && jsp) jsp.scrollToElement(el);		
	}	
}








function treeheaderArrows()
{
	$('.cloud-drive-item').removeClass('contains-subfolders expanded');
	if ($('#treesub_' + M.RootID + ' .fm-tree-folder').length > 0)
	{
		$('.cloud-drive-item').addClass('contains-subfolders');		
		if ($('#treesub_' + M.RootID).attr('class').indexOf('opened') > -1) $('.cloud-drive-item').addClass('expanded');
	}
	
	
	$('.contacts-item').removeClass('contains-subfolders expanded');
	if ($('#treesub_contacts .fm-tree-folder').length > 0)
	{
		$('.contacts-item').addClass('contains-subfolders');		
		if ($('#treesub_contacts').attr('class').indexOf('opened') > -1) $('.contacts-item').addClass('expanded');
	}
}



function initUI()
{
	if (!folderlink)
	{
		$('.fm-tree-header.cloud-drive-item span').text(l[164]);
		$('.fm-tree-header').not('.cloud-drive-item').show();
		$('.fm-menu-item').show();
		$('.fm-left-menu .folderlink').addClass('hidden');
	}
	$.selectingHeader = function(currentHeader) 
	{ 
		initTreeScroll();
		var c = currentHeader.attr('class');		
		if(c && c.indexOf('active') == -1) 
		{
		   $('.fm-menu-item').removeClass('active');		   
		   if (currentHeader.attr('class').indexOf('cloud') > -1) $('.fm-menu-item.cloud').addClass('active');			   		   
		   else if (currentHeader.attr('class').indexOf('recycle') > -1) $('.fm-menu-item.recycle').addClass('active');		 
		   else if (currentHeader.attr('class').indexOf('contacts') > -1)  $('.fm-menu-item.contacts').addClass('active');		   
		   else if (currentHeader.attr('class').indexOf('messages') > -1) $('.fm-menu-item.messages').addClass('active');		   
		   currentHeader.addClass('active');
		}	  
	   $('.fm-tree-panel .fm-tree-header').each(function()
	   {			
			var subFoldersBlock = $(this).next();
			if ($(this).attr('class') !== currentHeader.attr('class')) 
			{
				$(this).removeClass('active');
				subFoldersBlock.find('li').removeClass('selected');
				subFoldersBlock.find('.fm-tree-folder').removeClass('active');
				subFoldersBlock.find('.fm-connector').removeClass('mid last vertical-line');
				subFoldersBlock.find('.fm-horizontal-connector').removeClass('active');
				$(this).prev().removeClass('active');
			}
	   });
    };	
	$.doDD = function(e,ui,a,type)
	{
		var c = $(ui.draggable.context).attr('class');
		var t, ids, dd;	
		
		if (c && c.indexOf('fm-tree-folder') > -1)
		{
			// tree dragged:
			var id = $(ui.draggable.context).attr('id');			
			if (id.indexOf('treea_') > -1) ids = [id.replace('treea_','')];
		}
		else
		{
			// grid dragged:
			if ($.selected && $.selected.length > 0) ids = $.selected;
		}
		if (type == 1)
		{
			// tree dropped:
			var c = $(e.target).attr('class');
			if (c && c.indexOf('recycle') > -1) t = M.RubbishID;
			else if (c && c.indexOf('cloud') > -1) t = M.RootID;
			else
			{
				var t = $(e.target).attr('id');			
				if (t && t.indexOf('treea_') > -1) t = t.replace('treea_','');
				else t=undefined;
			}
		}
		else
		{
			// grid dropped:
			var c = $(e.target).attr('class');			
			if (c && c.indexOf('folder') > -1) t = $(e.target).attr('id');			
		}
		
		if (ids.length && t) dd = ddtype(ids,t);
		
		$('.dragger-block').removeClass('move copy warning drag');
		if (a == 'drop' || a == 'out')
		{			
			$(e.target).removeClass('dragover');
			$('.dragger-block').addClass('drag');	
		}
		else if (a == 'over')
		{
			var id = $(e.target).attr('id');
			if (!id)
			{
				$(e.target).uniqueId();
				id = $(e.target).attr('id');
			}
			
			
			$.currentOver = id;			
			setTimeout(function()
			{
				if ($.currentOver == id)
				{
					var h;
					if (id.indexOf('treea_') > -1) h = id.replace('treea_','');
					else 
					{
						var c = $(id).attr('class');						
						if (c && c.indexOf('cloud-drive-item') > -1) h = M.RootID;
						else if (c && c.indexOf('recycle-item') > -1) h = M.RubbishID;
						else if (c && c.indexOf('contacts-item') > -1) h = 'contacts';
					}					
					if (h) treeUIexpand(h,1);					
				}			
			},1000);
			
			
			if (t == M.RubbishID) $('.dragger-block').addClass('warning');
			else if (dd == 'move') $('.dragger-block').addClass('move');
			else if (dd == 'copy') $('.dragger-block').addClass('copy');
			else $('.dragger-block').addClass('drag');
			$(e.target).addClass('dragover');
		}
		if (a == 'drop' && dd) 
		{
			if (dd == 'move')
			{
				$(ui.draggable).draggable( "option", "revert", false );
				$(ui.draggable).remove();
				$.moveids=ids;
				$.movet=t;
				setTimeout(function()
				{
					M.moveNodes($.moveids,$.movet);		
				},50);
			}
			else if (dd == 'copy')
			{
				$(ui.draggable).draggable( "option", "revert", false );
				$.copyids=ids;
				$.copyt=t;
				setTimeout(function()
				{
					M.copyNodes($.copyids,$.copyt);		
				},50);
			}
			$('.dragger-block').hide();	
		}
	};
	InitFileDrag();
	createfolderUI();
	cSortMenuUI();
	initContextUI();	
	transferPanelUI();	
	UIkeyevents();	
	addUserUI();
	$('.fm-files-view-icon').unbind('click');
	$('.fm-files-view-icon').bind('click',function(event) 
	{
		$.hideContextMenu();
		cacheselect();
		if($(this).attr('class').indexOf('listing-view') > -1)
		{
		  if (fmconfig.uiviewmode) storefmconfig('viewmode',0);
		  else fmviewmode(M.currentdirid,0);
		  M.openFolder(M.currentdirid,true);	 
		}
		else
		{
		  if (fmconfig.uiviewmode) storefmconfig('viewmode',1);
		  else fmviewmode(M.currentdirid,1);
		  M.openFolder(M.currentdirid,true);  
		}
		reselect();
		return false;
	});
	$.hideContextMenu = function(e)
	{
		$('.fm-tree-header').removeClass('dragover');
		$('.fm-tree-folder').removeClass('dragover');
		if ($('.contacts-arrows').attr('class').indexOf('active') > -1)	
		{	
			if(e && $(e.target).closest('.contacts-arrows').length == 0 ) 
			{
				$('.sorting-menu').addClass('hidden');
				$('.contacts-arrows').removeClass('active');
			}
		}
		else $('.context-menu').addClass('hidden');
	};
	$('#fmholder').unbind('click.contextmenu');
	$('#fmholder').bind('click.contextmenu', function(e) 
	{
		$.hideContextMenu(e);
		if ($.hideTopMenu) $.hideTopMenu(e);		
		var c = $(e.target).attr('class');		
		if ($(e.target).attr('type') !== 'file' && (c && c.indexOf('upgradelink') == -1)) return false;
    });	
	$('.fm-back-button').unbind('click');
	$('.fm-back-button').bind('click', function(e) 
	{
		if (M.currentdirid == 'notifications' || M.currentdirid.substr(0,7) == 'search/') window.history.back();
		else
		{
			var n = M.d[M.currentdirid];		
			if ((n && n.p && M.d[n.p]) || (n && n.p == 'contacts')) M.openFolder(n.p);
		}
	});	
	$('.fm-right-header').removeClass('hidden');
	if (folderlink) $('.fm-tree-header.cloud-drive-item span').text(M.d[M.RootID].name);
	else folderlink=0;	
	$('.add-user-popup-button').unbind('click');
	$('.add-user-popup-button').bind('click',function(e)
	{
		if (u_type === 0) ephemeralDialog(l[997]);
		else doAddContact(e);
	});	
	$('.add-user-popup input').unbind('keypress');
	$('.add-user-popup input').bind('keypress',function(e) 
	{
		if (e.which == 13) doAddContact(e);
	});
	if (ul_queue.length > 0) openTransferpanel();
	if (u_type === 0 && !u_attr.terms)
	{
		$.termsAgree = function()
		{
			u_attr.terms=1;
			api_req([{a:'up', terms:'Mq'}]);
		};
		$.termsDeny = function()
		{
			u_logout();
			document.location.reload();
		};
		termsDialog();
	}
	M.avatars();
	if (typeof dl_import !== 'undefined' && dl_import) dl_fm_import();
	
	$('.fm-menu-item').unbind('mouseover');
	$('.fm-menu-item').bind('mouseover',function(e)
	{
		$(this).addClass('active');	
		if ($.gridDragging)
		{			
			var c = $(this).attr('class');			
			if (!c) return false;
			if (c.indexOf('cloud') > -1) treeUIopen(M.RootID,0,0,1);
			else if (c.indexOf('recycle') > -1) treeUIopen(M.RubbishID,0,0,1);
			else if (c.indexOf('contacts') > -1) treeUIopen('contacts',0,0,1);
			else if (c.indexOf('messages') > -1) treeUIopen(M.InboxID,0,0,1);			
		}	
	});
	
	$('.fm-menu-item').unbind('mouseout');
	$('.fm-menu-item').bind('mouseout',function(e)
	{
		if ($(this).attr('class').indexOf('contacts') > -1 && RootbyId(M.currentdirid) == 'contacts') return false;
		else if ($(this).attr('class').indexOf('messages') > -1 && RootbyId(M.currentdirid) == M.InboxID) return false;
		else if ($(this).attr('class').indexOf('recycle') > -1 && RootbyId(M.currentdirid) == M.RubbishID) return false;
		else if ($(this).attr('class').indexOf('cloud') > -1 && RootbyId(M.currentdirid) == M.RootID) return false;	
		
		$(this).removeClass('active');
	});
	
	$('.context-menu').unbind('contextmenu');
	$('.context-menu').bind('contextmenu',function(e)
	{
		if (!localStorage.contextmenu) e.preventDefault();
	});
	
	$('.fm-new-folder').unbind('mouseover');
	$('.fm-new-folder').bind('mouseover',function(e)
	{
		$('.fm-new-folder').addClass('hovered');	
	});	
	$('.fm-new-folder').unbind('mouseout');
	$('.fm-new-folder').bind('mouseout',function(e)
	{
		$('.fm-new-folder').removeClass('hovered');
	});
	
	
	if ((dl_method == 1 || dl_method == 2) && !localStorage.browserDialog && !$.browserDialog)
	{
		setTimeout(function()
		{
			browserDialog();		
		},2000);
	}
}



function openTransferpanel()
{
	$('.tranfer-view-icon').addClass('active');
	$('#fmholder').addClass('transfer-panel-opened');
	$.transferHeader();
	if (M.currentdirid == 'notifications') notificationsScroll();
	else if (M.viewmode) initFileblocksScrolling();
	else initGridScrolling();	
	initTreeScroll();
	if (!ul_uploading) startupload();
}


function doAddContact(e,dialog)
{	
	var c = '.add-user-popup input';
	if (dialog) c = '.add-contact-dialog input';
	if (checkMail($(c).val())) 
	{
		$.doAddContactVal = $(c).val();
		$(c).val('email@domain.com');
		$(c).css('color','#D22000');
		setTimeout(function(c)
		{
			$(c).val($.doAddContactVal);
			$(c).css('color','#000000');
			$(c).select();	
		},850,c);
	}
	else 
	{
		loadingDialog.show();
		M.addContact($(c).val());
		if (dialog) addContactDialog(1);
	}
}


function searchFM()
{


}


function removeUInode(h)
{
	var n = M.d[h];	
	var i=0;
	if (n && n.t)
	{
		var cns = M.c[n.p];			
		if (cns) for (var cn in cns) if (M.d[cn] && M.d[cn].t) i++;		
		if (i == 0) $('#treea_'+n.p).removeClass('contains-folders expanded');
	}
	$('#' + h).remove();
	$('#treea_' + h).remove();
	$('#treesub_' + h).remove();
	$('#treeli_' + h).remove();
	treeheaderArrows();	
}

function sharedUInode(h,s)
{	
	$('.grid-table.fm #'+h + ' .transfer-filtype-icon img').attr('src',fileicon({t:1,shares:s},'s'));
	$('.file-block#'+h + ' img').attr('src',fileicon({t:1,shares:s},'m'));
	if (s) $('#treea_' + h).addClass('shared-folder');
	else $('#treea_' + h).removeClass('shared-folder');
}




function addnotification(n)
{
	if (typeof notifications == 'undefined') return false;
	var timestamp = Math.round(new Date().getTime()/1000);	
	var updated = false;	
	if (n.t == 'put')
	{
		for (i in notifications)
		{
			if (notifications[i].folderid == n.n && notifications[i].user == n.u && notifications[i].timestamp > timestamp-120 && notifications[i].type !== 'share' && !updated)
			{
				notifications[i].timestamp = timestamp;
				notifications[i].read=false;
				notifications[i].count=false;
				if (!notifications[i].nodes) notifications[i].nodes = [];
				for (var i in n.f) notifications[i].nodes.push(n.f[i]);
				updated=true;
			}
		}		
	}
	if (!updated)
	{
		notifications.push({id:makeid(10),type:n.t,timestamp:timestamp,user:n.u,folderid:n.n,nodes:n.f,read:false,popup:false,count:false,rendered:false});			
	}
	donotify();
}


function addUserUI()
{  
	$('.fm-add-user').unbind('click');
	$('.fm-add-user').bind('click',function(e) 
	{			
		var c = $(this).attr('class');		
		var c2 = $(e.target).attr('class');
		if ((!c2 || c2.indexOf('fm-add-user') == -1) && $(e.target).prop('tagName') !== 'SPAN') return false;		
		if (c.indexOf('active') == -1) 
		{
			$(this).addClass('active');	
			$('.add-user-popup input').focus();
		}
		else $(this).removeClass('active');	
		$.hideContextMenu();
	});
}


function ephemeralDialog(msg)
{
	msgDialog('confirmation',l[998], msg + ' ' + l[999],l[1000],function(e)
	{
		if(e) document.location.hash = 'register';
	});
}


function fmremove()
{
	var filecnt=0,foldercnt=0,contactcnt=0;
	for (var i in $.selected)
	{
		if ($.selected[i].length == 11) contactcnt++;
		else if (M.d[$.selected[i]].t) foldercnt++;
		else filecnt++;		
	}
	
	if (contactcnt)
	{
		msgDialog('confirmation',l[1001],l[1002].replace('[X]',M.d[$.selected[0]].name),false,function(e)
		{
			if (e)
			{
				var ops = [];				
				for(var i in $.selected)
				{					
					M.delNode($.selected[i]);					
					ops.push({a:'ur',u:$.selected[i],l: '0',i: requesti});
				}
				api_req(ops);
			}
		});
	}
	else if (RootbyId($.selected[0]) == M.RubbishID)
	{		
		msgDialog('clear-bin',l[1003],l[76].replace('[X]',(filecnt+foldercnt)) + ' ' + l[77],l[1007],function(e)
		{			
			if (e) M.clearRubbish(1);
		});
		$('.fm-dialog-button.notification-button').each(function(i,e) { if ($(e).text() == l[1018]) $(e).text(l[83]);});
	}
	else
	{
		msgDialog('confirmation',l[1003],l[1004].replace('[X]',fm_contains(filecnt,foldercnt)),false,function(e)
		{
			if (e) M.moveNodes($.selected,M.RubbishID);			
		});
	}
}


function initContextUI()
{
	var c = '.context-menu-item';
	$(c+'.download-item').unbind('click');
	$(c+'.download-item').bind('click',function(event) 
	{
		M.addDownload($.selected);
	});
	
	$(c+'.zipdownload-item').unbind('click');
	$(c+'.zipdownload-item').bind('click',function(event) 
	{
		M.addDownload($.selected,true);
	});
	
	$(c+'.getlink-item').unbind('click');
	$(c+'.getlink-item').bind('click',function(event) 
	{
		if (u_type === 0) ephemeralDialog(l[1005]);
		else M.getlinks($.selected);
	});
	
	$(c+'.sharing-item').unbind('click');
	$(c+'.sharing-item').bind('click',function(event) 
	{
		if (u_type === 0) ephemeralDialog(l[1006]);
		else
		{			
			shareDialog();
		}
	});
	
	$(c+'.rename-item').unbind('click');
	$(c+'.rename-item').bind('click',function(event) 
	{
		renameDialog();		
	});
	
	$(c+'.move-item').unbind('click');
	$(c+'.move-item').bind('click',function(event) 
	{
		$.mctype='move';
		mcDialog();
	});
	
	$(c+'.copy-item').unbind('click');
	$(c+'.copy-item').bind('click',function(event) 
	{
		$.mctype='copy-cloud';
		mcDialog();	
	});
	
	$(c+'.newfolder-item').unbind('click');
	$(c+'.newfolder-item').bind('click',function(event) 
	{
		createfolderDialog();
	});
	
	$(c+'.remove-item').unbind('click');
	$(c+'.remove-item').bind('click',function(event) 
	{
		fmremove();
	});
	
	$(c+'.properties-item').unbind('click');
	$(c+'.properties-item').bind('click',function(event) 
	{
		propertiesDialog();
	});
	
	$(c+'.permissions-item').unbind('click');
	$(c+'.permissions-item').bind('click',function(event) 
	{
		if (d) console.log('permissions');
	});	
	
	$(c+'.add-star-item').unbind('click');
	$(c+'.add-star-item').bind('click',function(event) 
	{
		M.favourite($.selected,$.delfav);		
		if (M.viewmode) $('.file-block').removeClass('ui-selected');
		else $('.grid-table.fm tr').removeClass('ui-selected');		
	});
	
	$(c+'.open-item').unbind('click');
	$(c+'.open-item').bind('click',function(event) 
	{
		M.openFolder($.selected[0]);
	});
	
	$(c+'.clearbin-item').unbind('click');
	$(c+'.clearbin-item').bind('click',function(event) 
	{
		doClearbin();
	});
	
	$(c+'.addcontact-item').unbind('click');
	$(c+'.addcontact-item').bind('click',function(event) 
	{
		addContactDialog();
		if (d) console.log('addcontact');	
	});
	
	$(c+'.refresh-item').unbind('click');
	$(c+'.refresh-item').bind('click',function(event) 
	{
		if (typeof mDB !== 'undefined' && !pfid) mDBreload();
		else loadfm();
	});
	
	$(c+'.canceltransfer-item').unbind('click');
	$(c+'.canceltransfer-item').bind('click',function(event) 
	{			
		$.zipkill=false;		
		$('.transfer-table tr.ui-selected').not('.clone-of-header').each(function(j,el)
		{		
			var id = $(el).attr('id');			
			if ((id && id.indexOf('dl_') > -1) || (id && id.indexOf('zip_') > -1))
			{				
				var abort=false;				
				for (var i in dl_queue)
				{
					if (dl_queue[i])
					{
						if (dl_queue[i].id == id.replace('dl_','') || dl_queue[i].zipid == id.replace('zip_',''))
						{
							if (dl_queue[i].zipid) $.zipkill = dl_queue[i].zipid;
							if (i == dl_queue_num && dl_queue[dl_queue_num].zipid) abort=true;
							else if (i == dl_queue_num && dl_legacy_ie) document.getElementById('start_downloaderswf').abort();
							else if (i == dl_queue_num && !dl_queue[dl_queue_num].zipid) $.sd=i;							
							else if (!dl_queue[i].zipid) dl_queue[i] = false;						
						}
					}					
				}
				if ($.zipkill) dl_killzip($.zipkill);				
			}
			else if (id && id.indexOf('ul_') > -1)
			{				
				for (var i in ul_queue)
				{
					if (ul_queue[i])
					{					
						if (ul_queue[i].id == id.replace('ul_',''))
						{
							if (i == ul_queue_num)
							{
								ul_cancel();
								$.su=1;
							}
							ul_queue[i] = false;							
						}
					}
				}	
			}
			$(this).remove();
		});				
		if (typeof $.sd != 'undefined' || typeof $.zipkill != 'undefined')
		{
			if ($.sd != 'undefined') dl_queue[$.sd]=false;			
			dl_cancel();
			startdownload();
		}
		if ($.su) startupload();
		delete $.su;
		delete $.sd;
		delete $.zipkill;		
		megatitle();
	});
}


function cSortMenuUI()
{
	$('.contacts-arrows').hide();
	$('.contacts-arrows').unbind('click');
	$('.contacts-arrows').bind('click', function(e) 
	{
		var menuBlock = $('.sorting-menu');
		var bottomPosition = $('body').outerHeight()-$(menuBlock).outerHeight();
		if($(this).attr('class').indexOf('active') == -1) 
		{
			menuBlock.removeClass('hidden');
			$(this).addClass('active');
			menuBlock.css('top', $(this).position().top - 10);
			menuBlock.css('left', $(this).position().left + 30);
			if(bottomPosition- $(menuBlock).position().top < 50) menuBlock.css('top', bottomPosition-50);				
		} 
		else 
		{
			$('.fm-main').bind('click');
			menuBlock.addClass('hidden');
			$(this).removeClass('active');
		}
		return false;
	});

	$('.contacts-sorting-by').unbind('click');
	$('.contacts-sorting-by').bind('click', function(e) 
	{
		if($(this).attr('class').indexOf('active') == -1) 
		{
			$('.contacts-sorting-by').removeClass('active');
			$(this).addClass('active');
		} 
		return false;
	});

	$('.contacts-sorting-type').unbind('click');
	$('.contacts-sorting-type').bind('click', function(e) 
	{
		if($(this).attr('class').indexOf('active') == -1) 
		{
			$('.contacts-sorting-type').removeClass('active');
			$(this).addClass('active');
		} 
		return false;
	});
}

function createfolderUI()
{
	$('.fm-new-folder').unbind('click');
	$('.fm-new-folder').bind('click',function(e) 
	{
		if (($('.fm-new-folder').position().left+400) > $('body').width()) createfolderDialog();		
		else
		{			
			var c = $('.fm-new-folder').attr('class');		
			var c2 = $(e.target).attr('class');			
			var c3 = $(e.target).parent().attr('class');
			if ((!c2 || c2.indexOf('fm-new-folder') == -1) && (!c3 || c3.indexOf('fm-new-folder') == -1)) return false;
			if (c.indexOf('active') == -1) 
			{
				$('.fm-new-folder').addClass('active');
				$('.create-new-folder input').focus();
			}
			else $('.fm-new-folder').removeClass('active');
		}		
		$.hideContextMenu();
	});
	$('.create-folder-button').unbind('click');
	$('.create-folder-button').bind('click',function(e) 
	{
		docreatefolderUI(e);
		return false;
	});	
	$('.create-folder-input-bl input').unbind('keypress');
	$('.create-folder-input-bl input').bind('keypress',function(e) 
	{
		if (e.which == 13) docreatefolderUI(e);
	});
}

function docreatefolderUI(e)
{
	if ($('.create-folder-input-bl input').val() == '') $('.create-folder-input-bl input').animate({backgroundColor: "#d22000"}, 150, function() { $('.create-folder-input-bl input').animate({backgroundColor: "white"}, 350, function(){$('.create-folder-input-bl input').focus();});});	
	else createfolder(M.currentdirid,$('.create-folder-input-bl input').val());	
}

function fmtopUI()
{
	$('.fm-clearbin-button,.fm-add-user,.fm-new-folder,.fm-file-upload,.fm-folder-upload').addClass('hidden');	
	if (RootbyId(M.currentdirid) == M.RubbishID)
	{	
		$('.fm-clearbin-button').removeClass('hidden');	
	}
	else if (RootbyId(M.currentdirid) == M.InboxID)
	{	
		if (d) console.log('Inbox');
	}
	else if (M.currentdirid == 'contacts')
	{
		$('.fm-add-user').removeClass('hidden');	
	}
	else if (M.currentdirid.length == 8 && RightsbyID(M.currentdirid) > 0)
	{
		$('.fm-new-folder').removeClass('hidden');
		$('.fm-file-upload').removeClass('hidden');		
		if ('webkitdirectory' in document.createElement('input')) $('.fm-folder-upload').removeClass('hidden');
		else $('.fm-file-upload').addClass('last-button');		
	}	
	$('.fm-clearbin-button').unbind('click');
	$('.fm-clearbin-button').bind('click',function()
	{
		doClearbin();
	});
}

function doClearbin()
{
	msgDialog('clear-bin',l[14],l[15],l[1007],function(e)
	{
		if (e) M.clearRubbish();
	});
}

function notificationsUI(close)
{
	if (close)
	{
		$('.fm-main.notifications').addClass('hidden');	
		$('.fm-main.default').removeClass('hidden');
		treeUI();
		if (M.viewmode) iconUI();
		else gridUI();
		return false;
	}	
	notifymarkcount(true);
	donotify();
	
	$('.fm-main.notifications').removeClass('hidden');	
	$('.fm-main.default').addClass('hidden');
}

function accountUI()
{
	$('.fm-account-overview').removeClass('hidden');	
	$('.fm-account-button').removeClass('active');	
	$('.fm-account-sections').addClass('hidden');
	$('.fm-right-files-block').addClass('hidden');	
	$('.fm-right-account-block').removeClass('hidden');	
	M.accountData(function(account)
	{
		var perc,warning,perc_c;
		var id = document.location.hash;	
		if (id == '#fm/account/settings')
		{
			$('.fm-account-settings-button').addClass('active');
			$('.fm-account-settings').removeClass('hidden');			
		}
		else if (id == '#fm/account/profile')
		{
			$('.fm-account-profile-button').addClass('active');
			$('.fm-account-profile').removeClass('hidden');
		}
		else if (id == '#fm/account/history')
		{
			$('.fm-account-history-button').addClass('active');
			$('.fm-account-history').removeClass('hidden');
		}
		else
		{
			$('.fm-account-overview-button').addClass('active');
			$('.fm-account-overview').removeClass('hidden');
		}
		$('.fm-account-blocks .membership-icon.type').removeClass('free pro1 pro2 pro3');
		if (u_attr.p)
		{
			// pro account:			
			var protext;
			if (u_attr.p == 1) protext = 'PRO I';
			else if (u_attr.p == 2) protext = 'PRO II';
			else if (u_attr.p == 3) protext = 'PRO III';			
			$('.membership-big-txt.accounttype').text(protext);		
			$('.fm-account-blocks .membership-icon.type').addClass('pro' + u_attr.p);			
			if (account.stype == 'S')
			{
				// subscription
				$('.fm-account-header.typetitle').text(l[434]);					
				if (u.stime == 'W') $('.membership-big-txt.type').text(l[747]);
				else if (u.stime == 'M') $('.membership-big-txt.type').text(l[748]);
				else if (u.stime == 'Y') $('.membership-big-txt.type').text(l[749]);		
				$('.membershtip-medium-txt.expiry').html(htmlentities(l[750]) + ' <span class="red">' + time2date(account.scycle) + '</span>');				
			}
			else if (account.stype == 'O')
			{
				// one-time
				$('.fm-account-header.typetitle').text(l[746]+':');
				$('.membership-big-txt.type').text(l[751]);
				$('.membershtip-medium-txt.expiry').html(l[987] + ' <span class="red">' + time2date(account.expiry) + '</span>');
			}			
		}
		else
		{
			// free account:
			$('.fm-account-blocks .membership-icon.type').addClass('free');
			$('.membership-big-txt.type').text(l[435]);			
			$('.membership-big-txt.accounttype').text(l[435]);
			$('.membershtip-medium-txt.expiry').text(l[436]);
		}
		perc = Math.round((account.servbw_used+account.downbw_used)/account.bw*100);
		perc_c=perc;
		if (perc_c > 100) perc_c=100;		
		warning = '';
		if (perc > 99 && u_attr.p)
		{
			warning = '<div class="account-warning-icon"><span class="membership-notification"><span><span class="yellow">'+ l[34] + ':</span> ' + l[1008] + ' ' + l[1009] + ' <a href="#pro" class="upgradelink">' + l[920] + '.</a></span><span class="membership-arrow"></span></span>&nbsp;</div>';
		}
		else if (perc > 99 && !u_attr.p)		
		{
			// @@@ TODO: add dynamic bandwidth available in X minutes:
			warning = '<div class="account-warning-icon"><span class="membership-notification"><span><span class="yellow">' + l[34] + '</span> ' + l[1008] + ' ' + l[1009] + ' <a href="#pro" class="upgradelink">' + l[920] + '</a></span><span class="membership-arrow"></span></span>&nbsp;</div>';			
		}
		else if (!u_attr.p)		
		{
			// @@@ TODO: add dynamic bandwidth available in X minutes:
			
			var waittime = '30 minutes';
			
			warning = '<span class="membership-question">?<span class="membership-notification"><span>' + l[1056] + ' ' + l[1054].replace('[X]',waittime) + '</span><span class="membership-arrow"></span></span></span>';		
		}
		$('.fm-account-main .membership-circle-bg.green-circle').attr('class','membership-circle-bg green-circle percents-' + perc_c);
		if (perc > 100) $('.fm-account-main .membership-circle-bg.green-circle').text(':-(');
		else $('.fm-account-main .membership-circle-bg.green-circle').html(perc + '<span class="membershtip-small-txt">%</span>');
		$('.fm-account-bar.green').width(perc_c+'%');
		var b1 = bytesToSize(account.servbw_used+account.downbw_used);
		b1 = b1.split(' ');				
		b1[0] = Math.round(b1[0]) + ' ';				
		var b2 = bytesToSize(account.bw);
		b2 = b2.split(' ');
		b2[0] = Math.round(b2[0]) + ' ';		
		$('.pro-bandwidth .membership-big-txt.floating').html('<span class="membershtip-small-txt">' + l['439a'].replace('[X1]','<span class="green lpxf">' + htmlentities(b1[0]) + '<span class="membershtip-small-txt">' + htmlentities(b1[1]) + '</span></span>').replace('[X2]','<span class="lpxf">' + htmlentities(b2[0]) + '</span>' + ' <span class="membershtip-small-txt">' + htmlentities(b2[1]) + '</span>') + '</span>'+warning);
		$('.fm-account-main .pro-bandwidth').removeClass('hidden');
		$('.fm-account-main .free-bandwidth').addClass('hidden');
		
		if (perc > 99) $('.fm-account-mutliple-bl.bandwidth').addClass('exceeded');

		perc = Math.round(account.space_used / account.space * 100);
		perc_c=perc;
		if (perc_c > 100) perc_c=100;
		if (perc > 99) $('.fm-account-mutliple-bl.storage').addClass('exceeded');
		
		warning = '';
		if (perc > 99) warning = '<div class="account-warning-icon"><span class="membership-notification"><span><span class="yellow">'+ l[34] + ':</span> ' + l[1010] + ' ' + l[1011] + ' <a href="#pro"  class="upgradelink">' + l[920] + '.</a></span><span class="membership-arrow"></span></span>&nbsp;</div>';
		else if (perc > 79) warning = '<div class="account-warning-icon"><span class="membership-notification"><span><span class="yellow">'+ l[34] + ':</span> ' + l[1012] + ' ' + l[1013] + ' <a href="#pro"  class="upgradelink">' + l[920] + '.</a></span><span class="membership-arrow"></span></span>&nbsp;</div>';	
		
		$('.fm-account-main .membership-circle-bg.blue-circle').attr('class','membership-circle-bg blue-circle percents-' + perc_c);
		if (perc > 100) $('.fm-account-main .membership-circle-bg.blue-circle').text(':-(');
		else $('.fm-account-main .membership-circle-bg.blue-circle').html(perc + '<span class="membershtip-small-txt">%</span>');		
		$('.fm-account-bar.blue').width(perc_c+'%');	
		var b1 = bytesToSize(account.space_used);
		b1 = b1.split(' ');				
		b1[0] = Math.round(b1[0]) + ' ';
		var b2 = bytesToSize(account.space);
		b2 = b2.split(' ');				
		b2[0] = Math.round(b2[0]) + ' ';
		$('.membership-big-txt.space').html('<span class="membershtip-small-txt">' + l['439a'].replace('[X1]','<span class="blue lpxf">' + htmlentities(b1[0]) + '<span class="membershtip-small-txt">' + htmlentities(b1[1]) + '</span></span>').replace('[X2]','<span class="lpxf">' + htmlentities(b2[0]) + '</span>' + ' <span class="membershtip-small-txt">' + htmlentities(b2[1]) + '</span>') + '</span>' + warning);
		$('.fm-account-main .pro-upgrade').unbind('click');
		$('.fm-account-main .pro-upgrade').bind('click',function(e)
		{
			window.location.hash = 'pro';	
		});		
		$('.membership-big-txt.balance').html('&euro; ' + htmlentities(account.balance[0][0]));
		var a = 0;
		if (M.c['contacts']) for(var i in M.c['contacts']) a++;		
		if (a == 1) $('.membership-big-txt.contacts').text(l[990]);		
		else $('.membership-big-txt.contacts').text(l[989].replace('[X]',a));
		$('.membershtip-medium-txt.contacts').unbind('click');
		$('.membershtip-medium-txt.contacts').bind('click',function(e)
		{
			M.openFolder('contacts');
			return false;		
		});
		if (!$.sessionlimit) $.sessionlimit=10;
		if (!$.purchaselimit) $.purchaselimit=10;
		if (!$.transactionlimit) $.transactionlimit=10;
		if (!$.voucherlimit) $.voucherlimit=10;
		
		
		$('.account-history-dropdown-button.sessions').text(l[472].replace('[X]',$.sessionlimit));		
		$('.account-history-drop-items.session10-').text(l[472].replace('[X]',10));
		$('.account-history-drop-items.session100-').text(l[472].replace('[X]',100));
		$('.account-history-drop-items.session250-').text(l[472].replace('[X]',250));
		
		M.account.sessions.sort(function(a,b)
		{				
			if (a[0] < b[0]) return 1;
			else return -1;			
		});
		$('.grid-table.sessions tr').remove();
		var html = '<tr><th>' + l[479] + '</th><th>' + l[480] + '</th><th>' + l[481] + '</th><th>' + l[482] + '</th></tr>';
		$(account.sessions).each(function(i,el)
		{
			if (i == $.sessionlimit) return false;
			var country = countrydetails(el[4]);
			var browser = browserdetails(el[2]);
			var recent = l[483];
			if (!el[5]) recent = time2date(el[0]);
			html += '<tr><td><span class="fm-browsers-icon"><img alt="" src="' + staticpath + 'images/browser/' + browser.icon +'" /></span><span class="fm-browsers-txt">' + htmlentities(browser.name) + '</span></td><td>' + htmlentities(el[3]) + '</td><td><span class="fm-flags-icon"><img alt="" src="' + staticpath + 'images/flags/' + country.icon +'" style="margin-left: 0px;" /></span><span class="fm-flags-txt">' + htmlentities(country.name) + '</span></td><td>' + htmlentities(recent) + '</td></tr>';	
		});
		$('.grid-table.sessions').html(html);
		
		
		$('.account-history-dropdown-button.purchases').text(l[469].replace('[X]',$.purchaselimit));		
		$('.account-history-drop-items.purchase10-').text(l[469].replace('[X]',10));
		$('.account-history-drop-items.purchase100-').text(l[469].replace('[X]',100));
		$('.account-history-drop-items.purchase250-').text(l[469].replace('[X]',250));
		
		M.account.purchases.sort(function(a,b)
		{				
			if (a[1] < b[1]) return 1;
			else return -1;			
		});
		$('.grid-table.purchases tr').remove();
		var html = '<tr><th>' + l[475] + '</th><th>' + l[476] + '</th><th>' + l[477] + '</th><th>' + l[478] + '</th></tr>';		
		$(account.purchases).each(function(i,el)
		{
			var paymentmethod = 'Voucher';
			if (el[4] == 1) paymentmethod = 'PayPal';
			var pro = {'9.99':['PRO I (' + l[918] + ')','1'],'19.99':['PRO II (' + l[918] + ')','2'],'29.99':['PRO III (' + l[918] + ')','3'],'99.99':['PRO I (' + l[919] + ')','1'],'199.99':['PRO II (' + l[919] + ')','2'],'299.99':['PRO III (' + l[919] + ')','3']};
			html += '<tr><td>' + time2date(el[1]) + '</td><td><span class="fm-member-icon"><img alt="" src="' + staticpath + 'images/mega/icons/retina/pro'+pro[el[2]][1]+'@2x.png" /></span><span class="fm-member-icon-txt"> '+pro[el[2]][0]+'</span></td><td>&euro;'+htmlentities(el[2])+'</td><td>' + paymentmethod + '</td></tr>';	
		});
		$('.grid-table.purchases').html(html);
		
		$('.account-history-dropdown-button.transactions').text(l[471].replace('[X]',$.transactionlimit));		
		$('.account-history-drop-items.transaction10-').text(l[471].replace('[X]',10));
		$('.account-history-drop-items.transaction100-').text(l[471].replace('[X]',100));
		$('.account-history-drop-items.transaction250-').text(l[471].replace('[X]',250));
		
		M.account.transactions.sort(function(a,b)
		{				
			if (a[1] < b[1]) return 1;
			else return -1;			
		});
		$('.grid-table.transactions tr').remove();
		var html = '<tr><th>' + l[475] + '</th><th>' + l[484] + '</th><th>' + l[485] + '</th><th>' + l[486] + '</th></tr>';
		$(account.transactions).each(function(i,el)
		{		
			var credit='',debit='';			
			if (el[2] > 0) credit = '<span class="green">&euro;' + htmlentities(el[2]) + '</span>';
			else debit = '<span class="red">&euro;' + htmlentities(el[2]) + '</span>';			
			html += '<tr><td>' + time2date(el[1]) + '</td><td>' + htmlentities(el[0]) + '</td><td>' + credit + '</td><td>' + debit + '</td></tr>';	
		});
		$('.grid-table.transactions').html(html);				
		var i = new Date().getFullYear()-10,html='<option value="">YYYY</option>';
		$('.fm-account-select.year .account-select-txt').text('YYYY');
		while (i >= 1900)
		{
			if (u_attr.birthyear && i == u_attr.birthyear)
			{
				sel = ' selected';
				$('.fm-account-select.year .account-select-txt').text(u_attr.birthyear);
			}
			else sel='';
			html += '<option value="' + i + '"'+sel+'>' + i + '</option>';
			i--;		
		}
		$('.fm-account-select.year select').html(html);		
		var i=1, html='<option value="">DD</option>',sel='';;
		$('.fm-account-select.day .account-select-txt').text('DD');
		while (i < 32)
		{
			if (u_attr.birthday && i == u_attr.birthday)
			{
				sel = ' selected';
				$('.fm-account-select.day .account-select-txt').text(u_attr.birthday);
			}
			else sel='';
			html += '<option value="' + i + '"'+sel+'>' + i + '</option>';
			i++;		
		}		
		$('.fm-account-select.day select').html(html);		
		var i=1, html='<option value="">MM</option>',sel='';
		$('.fm-account-select.month .account-select-txt').text('MM');
		while (i < 13)
		{
			if (u_attr.birthmonth && i == u_attr.birthmonth)
			{
				sel = ' selected';
				$('.fm-account-select.month .account-select-txt').text(u_attr.birthmonth);
			}
			else sel='';
			html += '<option value="' + i + '"'+sel+'>' + i + '</option>';
			i++;		
		}
		$('.fm-account-select.month select').html(html);		
		var html='<option value="">' + l[996] + '</option>',sel='';
		$('.fm-account-select.country .account-select-txt').text(l[996]);
		for(country in isocountries)
		{
			if (u_attr.country && country == u_attr.country)
			{
				sel = ' selected';
				$('.fm-account-select.country .account-select-txt').text(isocountries[country]);
			}
			else sel='';
			html += '<option value="' + country + '"'+sel+'>' + isocountries[country] + '</option>';
		}
		$('.fm-account-select.country select').html(html);		
		$('.fm-account-select select').unbind('change');
		$('.fm-account-select select').bind('change',function(e)
		{
			var val = $(this).val();		
			if ($(this).attr('name') == 'account-country') val = isocountries[val];			
			$(this).parent().find('.account-select-txt').text(val);
			$('.fm-account-save-block').removeClass('hidden');
		});				
		$('#account-name').unbind('keyup');
		$('#account-name').bind('keyup',function(e)
		{
			$('.fm-account-save-block').removeClass('hidden');
		});
		$('.fm-account-cancel').unbind('click');
		$('.fm-account-cancel').bind('click',function(e)
		{
			$('.fm-account-save-block').addClass('hidden');
			accountUI();			
		});
		$('.fm-account-save').unbind('click');
		$('.fm-account-save').bind('click',function(e)
		{
			u_attr.name = $('#account-name').val();
			u_attr.birthday = $('.fm-account-select.day select').val();
			u_attr.birthmonth = $('.fm-account-select.month select').val();
			u_attr.birthyear = $('.fm-account-select.year select').val();
			u_attr.country = $('.fm-account-select.country select').val();			
			api_req([{a:'up',name:u_attr.name,birthday:base64urlencode(u_attr.birthday),birthmonth:base64urlencode(u_attr.birthmonth),birthyear:base64urlencode(u_attr.birthyear),country:base64urlencode(u_attr.country)}]);		
			$('.fm-account-save-block').addClass('hidden');			
			if (M.account.dl_maxSlots) 
			{
				localStorage.dl_maxSlots = M.account.dl_maxSlots;
				dl_maxSlots = M.account.dl_maxSlots;			
			}			
			if (M.account.ul_maxSlots) 
			{
				localStorage.ul_maxSlots = M.account.ul_maxSlots;
				ul_maxSlots = M.account.ul_maxSlots;			
			}
			if (typeof M.account.ul_maxSpeed !== 'undefined') 
			{
				localStorage.ul_maxSpeed = M.account.ul_maxSpeed;
				ul_maxSpeed = M.account.ul_maxSpeed;			
			}
			if (typeof M.account.use_ssl !== 'undefined') 
			{
				localStorage.use_ssl = M.account.use_ssl;
				use_ssl = M.account.use_ssl;			
			}
			if (typeof M.account.ul_skipIdentical !== 'undefined') 
			{
				localStorage.ul_skipIdentical = M.account.ul_skipIdentical;
				ul_skipIdentical = M.account.ul_skipIdentical;			
			}
						
			if (typeof M.account.uisorting !== 'undefined') storefmconfig('uisorting',M.account.uisorting);			
			if (typeof M.account.uiviewmode !== 'undefined') storefmconfig('uiviewmode',M.account.uiviewmode);
			
						
			if ($('#account-password').val() == '' && ($('#account-new-password').val() !== '' || $('#account-confirm-password').val() !== ''))
			{				
				 msgDialog('warninga',l[135],l[719],false,function()
				 {
					$('#account-password').focus();
				 });
			}
			else if ($('#account-new-password').val() !== $('#account-confirm-password').val())
			{				
				 msgDialog('warninga','Error',l[715],false,function()
				 {
					$('#account-new-password').val('');
					$('#account-confirm-password').val('');
					$('#account-new-password').focus();				 
				 });
			}
			else if ($('#account-confirm-password').val() !== '' && $('#account-password').val() !== '')
			{			
				loadingDialog.show();
				changepw($('#account-password').val(),$('#account-confirm-password').val(),{callback: function(res) 
				{
					loadingDialog.hide();
					if (res[0] == EACCESS)
					{
						msgDialog('warninga',l[135],l[724],false,function()
						{
							$('#account-password').val('');
							$('#account-password').focus();
						});
					}
					else if ((typeof res[0] == 'number') && (res[0] < 0)) msgDialog('warninga','Error',l[200]);
					else 
					{
						 msgDialog('info',l[726],l[725],false,function()
						 {
							$('#account-confirm-password,#account-password,#account-new-password').val('');
						 });
					}				
				}});					
			}
			else $('#account-confirm-password,#account-password,#account-new-password').val('');
			accountUI();
		});
		
		$('#account-name').val(u_attr.name);		
		$('.account-history-dropdown-button').unbind('click');	
		$('.account-history-dropdown-button').bind('click',function()  
		{
			$(this).addClass('active');
			$('.account-history-dropdown').addClass('hidden');
			$(this).next().removeClass('hidden');						
			
		});
		
		$('.account-history-drop-items').unbind('click');
		$('.account-history-drop-items').bind('click',function()  
		{	
			$(this).parent().prev().removeClass('active');
			$(this).parent().find('.account-history-drop-items').removeClass('active');
			$(this).parent().parent().find('.account-history-dropdown-button').text($(this).text());			
			var c = $(this).attr('class');
			if (!c) c='';
			if (c.indexOf('session10-') > -1) $.sessionlimit=10;
			else if (c.indexOf('session100-') > -1) $.sessionlimit=100;
			else if (c.indexOf('session250-') > -1) $.sessionlimit=250;				
			if (c.indexOf('purchaselimit10-') > -1) $.purchaselimit=10;
			else if (c.indexOf('purchase100-') > -1) $.purchaselimit=100;
			else if (c.indexOf('purchase250-') > -1) $.purchaselimit=250;			
			if (c.indexOf('transaction10-') > -1) $.transactionlimit=10;
			else if (c.indexOf('transaction100-') > -1) $.transactionlimit=100;
			else if (c.indexOf('transaction250-') > -1) $.transactionlimit=250;			
			if (c.indexOf('voucher10-') > -1) $.voucherlimit=10;
			else if (c.indexOf('voucher100-') > -1) $.voucherlimit=100;
			else if (c.indexOf('voucher250-') > -1) $.voucherlimit=250;						
			$(this).addClass('active');
			$(this).closest('.account-history-dropdown').addClass('hidden');
			accountUI();
		});
		
        $("#slider-range-max").slider({ 	
			min: 1,max: 6,range: "min",value:dl_maxSlots,slide:function(e,ui) 
			{
				M.account.dl_maxSlots = ui.value;
				$('.fm-account-save-block').removeClass('hidden');
			}
        });
		
		$("#slider-range-max2").slider({ 	
			min: 1,max: 6,range: "min",value:ul_maxSlots,slide:function(e,ui) 
			{
				M.account.ul_maxSlots = ui.value;
				$('.fm-account-save-block').removeClass('hidden');
			}
        });				
			
		$('.ulspeedradio').removeClass('radioOn').addClass('radioOff');			
		var i=3;
		if (ul_maxSpeed == 0) i=1;
		else if (ul_maxSpeed == -1) i=2;
		else $('#ulspeedvalue').val(Math.floor(ul_maxSpeed/1024));		
		$('#rad'+i+'_div').removeClass('radioOff').addClass('radioOn');
		$('#rad'+i).removeClass('radioOff').addClass('radioOn');				
		$('.ulspeedradio input').unbind('click');
		$('.ulspeedradio input').bind('click',function(e)
		{
			var id = $(this).attr('id');
			if (id == 'rad2') M.account.ul_maxSpeed=-1;
			else if (id == 'rad1') M.account.ul_maxSpeed=0;
			else
			{
				if (parseInt($('#ulspeedvalue').val()) > 0) M.account.ul_maxSpeed=parseInt($('#ulspeedvalue').val())*1024;
				else M.account.ul_maxSpeed=100*1024;
			}			
			$('.ulspeedradio').removeClass('radioOn').addClass('radioOff');			
			$(this).addClass('radioOn').removeClass('radioOff');
			$(this).parent().addClass('radioOn').removeClass('radioOff');
			$('.fm-account-save-block').removeClass('hidden');
		});		
		$('#ulspeedvalue').unbind('click keyup');
		$('#ulspeedvalue').bind('click keyup',function(e)
		{
			$('.ulspeedradio').removeClass('radioOn').addClass('radioOff');
			$('#rad3,#rad3_div').addClass('radioOn').removeClass('radioOff');			
			if (parseInt($('#ulspeedvalue').val()) > 0) M.account.ul_maxSpeed=parseInt($('#ulspeedvalue').val())*1024;
			else M.account.ul_maxSpeed=100*1024;
			$('.fm-account-save-block').removeClass('hidden');
		});		
		
		$('.ulskip').removeClass('radioOn').addClass('radioOff');		
		var i = 5;
		if (ul_skipIdentical) i=4;
		$('#rad'+i+'_div').removeClass('radioOff').addClass('radioOn');
		$('#rad'+i).removeClass('radioOff').addClass('radioOn');
		$('.ulskip input').unbind('click');
		$('.ulskip input').bind('click',function(e)
		{
			var id = $(this).attr('id');
			if (id == 'rad4') M.account.ul_skipIdentical=1;
			else if (id == 'rad5') M.account.ul_skipIdentical=0;
			$('.ulskip').removeClass('radioOn').addClass('radioOff');			
			$(this).addClass('radioOn').removeClass('radioOff');
			$(this).parent().addClass('radioOn').removeClass('radioOff');
			$('.fm-account-save-block').removeClass('hidden');
		});
		
		
		$('.uisorting').removeClass('radioOn').addClass('radioOff');		
		var i = 8;
		if (fmconfig.uisorting) i=9;
		$('#rad'+i+'_div').removeClass('radioOff').addClass('radioOn');
		$('#rad'+i).removeClass('radioOff').addClass('radioOn');		
		$('.uisorting input').unbind('click');
		$('.uisorting input').bind('click',function(e)
		{
			var id = $(this).attr('id');
			if (id == 'rad8') M.account.uisorting=0;
			else if (id == 'rad9') M.account.uisorting=1;
			$('.uisorting').removeClass('radioOn').addClass('radioOff');			
			$(this).addClass('radioOn').removeClass('radioOff');
			$(this).parent().addClass('radioOn').removeClass('radioOff');
			$('.fm-account-save-block').removeClass('hidden');
		});
		
		
		
		$('.uiviewmode').removeClass('radioOn').addClass('radioOff');		
		var i = 10;
		if (fmconfig.uiviewmode) i=11;
		$('#rad'+i+'_div').removeClass('radioOff').addClass('radioOn');
		$('#rad'+i).removeClass('radioOff').addClass('radioOn');		
		$('.uiviewmode input').unbind('click');
		$('.uiviewmode input').bind('click',function(e)
		{
			var id = $(this).attr('id');
			if (id == 'rad10') M.account.uiviewmode=0;
			else if (id == 'rad11') M.account.uiviewmode=1;
			$('.uiviewmode').removeClass('radioOn').addClass('radioOff');			
			$(this).addClass('radioOn').removeClass('radioOff');
			$(this).parent().addClass('radioOn').removeClass('radioOff');
			$('.fm-account-save-block').removeClass('hidden');
		});
		
		$('.redeem-voucher').unbind('click');
		$('.redeem-voucher').bind('click',function(event) 
		{
			if($(this).attr('class').indexOf('active') == -1) 
			{
				$(this).addClass('active');
				$('.fm-voucher-popup').removeClass('hidden');
				voucherCentering($(this));
				$(window).bind('resize', function () 
				{
				   voucherCentering($('.redeem-voucher'));
				});
			} 
			else 
			{
				$(this).removeClass('active');
				$('.fm-voucher-popup').addClass('hidden');
			}
		});
		
		$('.fm-voucher-body input').unbind('focus');
		$('.fm-voucher-body input').bind('focus',function(e)
		{
			if ($(this).val() == l[487]) $(this).val('');			
		});
		
		$('.fm-voucher-body input').unbind('blur');
		$('.fm-voucher-body input').bind('blur',function(e)
		{
			if ($(this).val() == '') $(this).val(l[487]);			
		});
		
		$('.fm-voucher-button').unbind('click');
		$('.fm-voucher-button').bind('click',function(e)
		{
			if ($('.fm-voucher-body input').val() == l[487]) msgDialog('warninga',l[135],l[1015]);
			else
			{
				loadingDialog.show();
				api_req([{a: 'uavr',v: $('.fm-voucher-body input').val()}],
				{ 
					callback : function (json,params)
					{
						loadingDialog.hide();
						$('.fm-voucher-popup').addClass('hidden');
						$('.fm-voucher-body input').val(l[487])
						if (json[0] == -11) msgDialog('warninga',l[135],l[714]);
						else if ((typeof json[0] == 'number') && (json[0] < 0)) msgDialog('warninga',l[135],l[473]);
						else
						{
							if (M.account) M.account.lastupdate=0;
							accountUI();
						}
					}
				});
			}		
		});
		
		
		
		$('.fm-purchase-voucher,.membershtip-medium-txt.topup').unbind('click');
		$('.fm-purchase-voucher,.membershtip-medium-txt.topup').bind('click',function(e)
		{
			document.location.hash = 'resellers';		
		});
		
		if (ssl_needed() || (document.location.href.substr(0,19) == 'chrome-extension://') || is_chrome_firefox) $('#acc_use_ssl').hide();
		
		$('.usessl').removeClass('radioOn').addClass('radioOff');		
		var i = 7;
		if (use_ssl) i=6;
		$('#rad'+i+'_div').removeClass('radioOff').addClass('radioOn');
		$('#rad'+i).removeClass('radioOff').addClass('radioOn');		
		$('.usessl input').unbind('click');
		$('.usessl input').bind('click',function(e)
		{
			var id = $(this).attr('id');
			if (id == 'rad7') M.account.use_ssl=0;
			else if (id == 'rad6') M.account.use_ssl=1;
			$('.usessl').removeClass('radioOn').addClass('radioOff');			
			$(this).addClass('radioOn').removeClass('radioOff');
			$(this).parent().addClass('radioOn').removeClass('radioOff');
			$('.fm-account-save-block').removeClass('hidden');
		});
				
		$('.fm-account-change-avatar,.fm-account-avatar').unbind('click');
		$('.fm-account-change-avatar,.fm-account-avatar').bind('click',function(e)
		{
			avatarDialog();			
		});		
		if (avatars[u_handle]) $('.fm-account-avatar img').attr('src',avatars[u_handle].url);			
		else $('.fm-account-avatar img').attr('src',staticpath + 'images/mega/default-avatar.png');	

		$(window).unbind('resize.account');
		$(window).bind('resize.account', function () 
		{			
			if (M.currentdirid.substr(0,7) == 'account') initAccountScroll();
		});		
		
		initAccountScroll();
	},1);
	
	$('.membership-big-txt.name').text(u_attr.name);	
	$('.editprofile').unbind('click');
	$('.editprofile').bind('click',function(event) 
	{
		document.location.hash = 'fm/account/profile';
	});
	
	
	$('.fm-account-button').unbind('click');
	$('.fm-account-button').bind('click',function(event) 
	{ 
	  if($(this).attr('class').indexOf('active') == -1) 
      {
		switch (true)
		{
           case ($(this).attr('class').indexOf('fm-account-overview-button') >= 0):
			   document.location.hash = 'fm/account';
               break;
           case ($(this).attr('class').indexOf('fm-account-profile-button') >= 0):
			   document.location.hash = 'fm/account/profile';
               break;
           case ($(this).attr('class').indexOf('fm-account-settings-button') >= 0):
			   document.location.hash = 'fm/account/settings';
               break;
		   case ($(this).attr('class').indexOf('fm-account-history-button') >= 0):
			   document.location.hash = 'fm/account/history';
               break;
         }		 
	  }
	});
	
	$('.account-pass-lines').attr('class','account-pass-lines');	
	$('#account-new-password').unbind('keyup');
	$('#account-new-password').bind('keyup',function(el)
	{
		$('.account-pass-lines').attr('class','account-pass-lines');
		if ($(this).val() !== '')
		{		
			var pws = checkPassword($(this).val());			
			if (pws <= 25) $('.account-pass-lines').addClass('good1');			
			else if (pws <= 50) $('.account-pass-lines').addClass('good2');			
			else if (pws <= 75) $('.account-pass-lines').addClass('good3');			
			else $('.account-pass-lines').addClass('good4');
		}		
	});
		
	$('#account-confirm-password').unbind('keyup');
	$('#account-confirm-password').bind('keyup',function(el)
	{
		if ($(this).val() == $('#account-new-password').val()) $('.fm-account-save-block').removeClass('hidden');
	});
}

function acc_checkpassword(pass)
{
	if ((pass == 'Password') || (pass == ''))
	{
		document.getElementById('acc_pwstatus_text').innerHTML = '';
		document.getElementById('acc_pwstatus').className = 'register-pass-status-block account';			
		return false;
	}
	var strength = checkPassword(pass);
	if (strength <= 25)
	{
		document.getElementById('acc_pwstatus_text').innerHTML = l[220];
		document.getElementById('acc_pwstatus').className = 'register-pass-status-block account good1';	
	}
	else if (strength <= 50)
	{
		document.getElementById('acc_pwstatus_text').innerHTML = l[221];
		document.getElementById('acc_pwstatus').className = 'register-pass-status-block account good2';
	}
	else if (strength <= 75)
	{
		document.getElementById('acc_pwstatus_text').innerHTML = l[222];
		document.getElementById('acc_pwstatus').className = 'register-pass-status-block account good3';
	}
	else
	{
		document.getElementById('acc_pwstatus_text').innerHTML = l[223];
		document.getElementById('acc_pwstatus').className = 'register-pass-status-block account good1 good4';	
	}
}

var imageCrop;

function avatarDialog(close)
{
	if (close)
	{
		$.dialog=false;
		$('.avatar-dialog').addClass('hidden');
		$('.fm-dialog-overlay').addClass('hidden');
		return true;
	}	
	$.dialog='avatar';	
	$('.fm-dialog.avatar-dialog').removeClass('hidden');
	$('.fm-dialog-overlay').removeClass('hidden');
	$('.avatar-body').html('<div id="avatarcrop"><div class="image-upload-and-crop-container"><div class="image-explorer-container empty"><div class="image-explorer-image-view"><img class="image-explorer-source"><div class="avatar-white-bg"></div><div class="image-explorer-mask circle-mask"></div><div class="image-explorer-drag-delegate"></div></div><div class="image-explorer-scale-slider-wrapper"><input class="image-explorer-scale-slider disabled" type="range" min="0" max="100" step="1" value="0" disabled=""></div></div><div class="fm-notifications-bottom"><input type="file" id="image-upload-and-crop-upload-field" class="image-upload-field" accept="image/jpeg, image/gif, image/png"><label for="image-upload-and-crop-upload-field" class="image-upload-field-replacement fm-account-change-avatar">' + l[1016] + '</label><div class="fm-account-change-avatar" id="fm-change-avatar">' + l[1017] + '</div><div  class="fm-account-change-avatar" id="fm-cancel-avatar">Cancel</div><div class="clear"></div></div></div></div>');	
	$('#fm-change-avatar').hide();
	$('#fm-cancel-avatar').hide();	
	imageCrop = new ImageUploadAndCrop($("#avatarcrop").find('.image-upload-and-crop-container'),
	{
		cropButton: $('#fm-change-avatar'),
		onCrop: function(croppedDataURI)
		{
			var data = dataURLToAB(croppedDataURI);			
			api_req([{'a':'up','+a':base64urlencode(ab_to_str(data))}]);			
			var blob = new Blob([data],{ type: 'image/jpeg'});
			avatars[u_handle] = 
			{
				data: blob,
				url: myURL.createObjectURL(blob)
			}
			$('.fm-account-avatar img').attr('src',avatars[u_handle].url);
			$('.fm-avatar img').attr('src',avatars[u_handle].url);
			avatarDialog(1);
		},
		onImageUpload: function()
		{
			$('.image-upload-field-replacement.fm-account-change-avatar').hide();
			$('#fm-change-avatar').show();
			$('#fm-cancel-avatar').show();
		},
		onImageUploadError: function()
		{
			
		}
	});	
	$('#fm-cancel-avatar,.fm-dialog.avatar-dialog .fm-dialog-close').unbind('click');
	$('#fm-cancel-avatar,.fm-dialog.avatar-dialog .fm-dialog-close').bind('click',function(e)
	{
		avatarDialog(1);
	});
}

function gridUI()
{   
	var t = new Date().getTime();
	$.gridDragging=false;
	$.gridLastSelected=false;
	$('.fm-files-view-icon.listing-view').addClass('active');
	$('.fm-files-view-icon.block-view').removeClass('active');
	$.gridHeader = function()  
	{	
		var el = $('.grid-table-header th');		
		var i=0;
		var w=0;		
		while (i < el.length)
		{
			if (i !== 1) w+=$(el[i]).width();
			i++;
		}
		$('.grid-table-header th:eq(1)').width($('.files-grid-view').width()-w-60);
		initTranferScroll();
	}	
	$.contactgridHeader = function()
	{
		var el = $('.contacts-grid-table th');		
		var i=0;
		var w=0;		
		while (i < el.length)
		{
			if (i !== 0) w+=$(el[i]).width();
			i++;
		}
		$('.contacts-grid-header th:eq(0)').width($('.contacts-grid-view').width()-w-34);
		initTranferScroll();	
	}	
	if (M.currentdirid == 'contacts') $.selectddUIgrid = '.contacts-grid-table';
	else $.selectddUIgrid = '.grid-scrolling-table';	
	$.selectddUIitem = 'tr';
	selectddUI();	
	$(window).unbind('resize.grid');
	$(window).bind('resize.grid', function () 
	{
		if (M.viewmode == 0)
		{
			if (M.currentdirid == 'contacts')
			{
				$.contactgridHeader();
				initContactsGridScrolling();
			}
			else
			{
				initGridScrolling();
				$.gridHeader();
			}
		}
    });	
	$('.fm-blocks-view').addClass('hidden');
	$('.fm-contacts-blocks-view').addClass('hidden');	
	if (M.currentdirid == 'contacts')
	{
		$('.files-grid-view').addClass('hidden');
		$('.contacts-grid-view').removeClass('hidden');
		$.contactgridHeader();
		initContactsGridScrolling();
	}
	else
	{	
		$('.contacts-grid-view').addClass('hidden');
		$('.files-grid-view').removeClass('hidden');
		initGridScrolling();
		$.gridHeader();
	}	
	if (RootbyId(M.currentdirid) == 'contacts' || folderlink || RootbyId(M.currentdirid) == M.RubbishID) 
	{
		$('.grid-url-arrow').hide();
		$('.grid-url-header').text('');
	}
	else
	{
		$('.grid-url-arrow').show();
		$('.grid-url-header').text('URL');
	}	
	$('.files-grid-view,.fm-empty-cloud').unbind('contextmenu');
	$('.files-grid-view,.fm-empty-cloud').bind('contextmenu',function(e)
	{		
		$('.file-block').removeClass('ui-selected');
		$.selected=[];
		if (contextmenuUI(e,2)) return true;
		else return false;	
		$.hideTopMenu();
	});	
	if (d) console.log('gridUI() time:',new Date().getTime() - t);
	
	
	$('.grid-table-header .arrow').unbind('click');
	$('.grid-table-header .arrow').bind('click',function(e)
	{
		var c = $(this).attr('class');		
		var d=1;
		if (c && c.indexOf('desc') > -1) d=-1;
		if (c && c.indexOf('name') > -1) M.doSort('name',d);
		else if (c && c.indexOf('size') > -1) M.doSort('size',d);
		else if (c && c.indexOf('type') > -1) M.doSort('type',d);
		else if (c && c.indexOf('date') > -1) M.doSort('date',d);	
		if (c) M.renderMain();
	});
}


/**
 * Find jQuery Element in an jQuery array of elements and return its index OR -1 if not found.
 * Pretty similar to the $.inArray, but will match the object IDs.
 *
 *
 * @param el
 * @param arr
 * @returns int -1 or key index
 */
$.elementInArray = function(el, arr) {
    var found = $.map(
        arr,
        function(n, i) {
            return el.is(n) ? i : undefined;
        }
    );
    return found.length > 0 ? found[0] : -1;
};

/**
 * Case insensitive :contains.
 *
 * @param a
 * @param i
 * @param m
 * @returns {boolean}
 */
jQuery.expr[':'].icontains = function(a, i, m) {
    return jQuery(a).text().toUpperCase()
        .indexOf(m[3].toUpperCase()) >= 0;
};


/**
 * Required to move the cursor at the end of the QuickFinder input field.
 *
 *
 * PS: Move this somewhere else?
 *
 * @param pos
 */
$.fn.setCursorPosition = function(pos) {
    if ($(this).get(0).setSelectionRange) {
        $(this).get(0).setSelectionRange(pos, pos);
    } else if ($(this).get(0).createTextRange) {
        var range = $(this).get(0).createTextRange();
        range.collapse(true);
        range.moveEnd('character', pos);
        range.moveStart('character', pos);
        range.select();
    }
};

/**
 * Simple 'Find in text of the page'-like functionality that will search and highlight (select) the matched files in the
 * current view.
 *
 * PS: This is meant to be somehow reusable.
 *
 * @param searchable_elements selector/elements a list/selector of elements which should be searched for the user
 * specified text
 * @param containers selector/elements a list/selector of containers to which the input field will be centered (the code
 * will dynamically detect and pick the :visible container)
 *
 * @returns {*}
 * @constructor
 */
var QuickFinder = function(searchable_elements, containers) {
    var self = this;

    // create the input field that will contain the user's search text and hide it.
    var $find_input = $('<input class="quick-finder" />');
    $find_input.hide();
    $find_input.css({
        'position': 'absolute',
        'top': 0,
        'left': 0
    });
    $(document.body).append($find_input);


    // hide on page change
    $(window).bind('hashchange', function() {
        if($find_input.is(":visible")) {
            $(self).trigger('hide');
        }
    });


    // unbind if already bound.
    $(window).unbind('keypress.quickFinder');

    // bind
    $(window).bind('keypress.quickFinder', function(e) {
        console.log(e);
        e = e || window.event;
        // DO NOT start the search in case that the user is typing something in a form field... (eg.g. contacts -> add
        // contact field)
        if($(e.target).is("input, textarea, select")) {
            return;
        }
        var charCode = e.which || e.keyCode; // ff

        if((charCode >= 46 && charCode <= 122) || charCode > 255) {
            var charTyped = String.fromCharCode(charCode);
            if(!$find_input.is(":visible")) {
                // get the currently visible container
                var $container = $(containers).filter(":visible");
                if($container.size() == 0) {
                    // no active container, this means that we are receiving events for a page, for which we should not
                    // do anything....
                    return;
                }

                $find_input
                    .slideDown(250)
                    // position to the currently visible container.
                    .css({
                        'top': $container.offset().top,
                        'left': $container.offset().left + $container.outerWidth() - $find_input.outerWidth()
                    })
                    // initialize with the same char that the user had typed before focusing the field
                    .focus()
                    .select()
                    .trigger('keyup', e)
                    .val(
                        charTyped
                    );

                // IE fix.
                $find_input.setCursorPosition(1);

                return false;
            }
        }
    });

    // Hide on keyup OR enter.
    $find_input.bind('keyup', function(e) {
        if(e.keyCode == 27 || e.keyCode == 13) {
            $(self).trigger('hide');
            return e.keyCode == 72 ? false : undefined; // stop propagation only on ESC.
        }
    });

    // hide the search field when the user had clicked somewhere in the document
    $(document.body).delegate('> *', 'mousedown', function(e) {
        if($find_input.is(":visible") && !$(e.target).is($find_input)) {
            $(self).trigger('hide');
            return false;
        }
    });

    // search thru `searchable_elements`
    $find_input.bind('keyup', function(e) {
        var val = $(this).val();

        if($(this).is(":visible")) { // only if find is active, if not, the user had pressed esc/enter to cancel the
                                     // find proc.

            var $found = $(searchable_elements).filter(":visible:icontains('" + val + "')");

            $(searchable_elements).parents(".ui-selectee, .ui-draggable").removeClass('ui-selected');
            $found.parents(".ui-selectee, .ui-draggable").addClass("ui-selected");
        }
    });

    // use events as a way to communicate with this from the outside world.
    $(self).on('hide', function() {
        $find_input
            .val('')
            .blur()
            .slideUp(250);
    });
    return this;
};

var quickFinder = new QuickFinder(
    '.tranfer-filetype-txt, .file-block-title, td span.contacts-username',
    '.files-grid-view, .fm-blocks-view, .contacts-grid-table'
);

/**
 * This should take care of flagging the LAST selected item in those cases:
 *
 *  - jQ UI $.selectable's multi selection using drag area (integrated using jQ UI $.selectable's Events)
 *
 *  - Single click selection (integrated by assumption that the .get_currently_selected will also try to cover this case
 *  when there is only one .ui-selected...this is how no other code had to be changed :))
 *
 *  - Left/right/up/down keys (integrated by using the .set_currently_selected and .get_currently_selected public
 *  methods)
 *
 * @param $selectable
 * @returns {*}
 * @constructor
 */
var CurrentlySelectedManager = function($selectable) {
    var self = this;

    $selectable.unbind('selectableselecting');
    $selectable.unbind('selectableselected');
    $selectable.unbind('selectableunselecting');
    $selectable.unbind('selectableunselected');

    /**
     * Store all selected items in an _ordered_ array.
     *
     * @type {Array}
     */
    var selected_list = [];


    /**
     * Helper func to clear old reset state from other icons.
     */
    this.clear = function() {
        $('.currently-selected', $selectable).removeClass('currently-selected');
    };


    this.clear(); // remove ANY old .currently-selected values.


    /**
     * The idea of this method is to _validate_ and return the .currently-selected element.
     *
     * @param first_or_last string ("first" or "last") by default will return the first selected element if there is
     * not .currently-selected
     *
     * @returns {*|jQuery|HTMLElement}
     */
    this.get_currently_selected = function(first_or_last) {
        if(!first_or_last) {
            first_or_last = "first";
        }

        var $currently_selected = $('.currently-selected', $selectable);

        if($currently_selected.size() == 0) { // NO .currently-selected
            return $('.ui-selected:' + first_or_last, $selectable);
        } else if(!$currently_selected.is(".ui-selected")) { // validate that the currently selected is actually selected.
            // if not, try to get the first_or_last .ui-selected item
            var selected_elms = $('.ui-selected:' + first_or_last, $selectable);
            return selected_elms;
        } else { // everything is ok, we should return the .currently-selected
            return $currently_selected;
        }
    };


    /**
     * Used from the shortcut keys code.
     *
     * @param element
     */
    this.set_currently_selected = function($element) {
        self.clear();
        $element.addClass("currently-selected");
    };


    /**
     * Push the last selected item to the end of the selected_list array.
     */
    $selectable.bind('selectableselecting', function(e, data) {
        var $selected = $(data.selecting);
        selected_list.push(
            $selected
        );
    });


    /**
     * Remove any unselected element from the selected_list array.
     */
    $selectable.bind('selectableunselecting', function(e, data) {
        var $unselected = $(data.unselecting);
        var idx = $.elementInArray($unselected, selected_list);

        if(idx > -1) {
            delete selected_list[idx];
        }
    });

    /**
     * After the user finished selecting the icons, flag the last selected one as .currently-selecting
     */
    $selectable.bind('selectablestop', function(e, data) {
        self.clear();

        // remove `undefined` from the list
        selected_list = $.map(selected_list, function(n, i) {
            if(n != undefined) {
                return n;
            }
        });

        // add the .currently-selected
        if(selected_list.length > 0) {
            $(selected_list[selected_list.length - 1]).addClass('currently-selected');
        }

        selected_list = []; // reset the state of the last selected items for the next selectablestart
    });

    return this;
};

var currentlySelectedManager;

function UIkeyevents()
{
	$(window).unbind('keydown');
	$(window).bind('keydown', function (e) 
	{
		var sl=false,s;
		if (M.viewmode) s = $('.file-block.ui-selected');
		else s = $('.grid-table.fm tr.ui-selected');

        /**
         * Because of te .unbind, this can only be here... it would be better if its moved to iconUI(), but maybe some
         * other day :)
         */
        if(!$.dialog && M.viewmode == 1) {

            var items_per_row = Math.floor($('.file-block').parent().outerWidth() / $('.file-block:first').outerWidth(true));
            var total_rows = Math.ceil($('.file-block').size() / items_per_row);

            if(e.keyCode == 37) { // left
                var current = currentlySelectedManager.get_currently_selected("first");
                if(!e.shiftKey) { // clear old selection if no shiftKey
                    s.removeClass("ui-selected");
                }
                var $target_element = null;

                if(current.length > 0 && current.prev(".file-block").length > 0) {
                    $target_element = current.prev(".file-block");
                } else {
                    $target_element = $('.file-block:last');
                }

                if($target_element) {
                    $target_element.addClass('ui-selected');
                    currentlySelectedManager.set_currently_selected($target_element);
                }

            } else if(e.keyCode == 39) { // right
                var current = currentlySelectedManager.get_currently_selected("last");
                if(!e.shiftKey) {
                    s.removeClass("ui-selected");
                }

                var $target_element = null;

                var next = current.next(".file-block");
                if(next.length > 0) { // clear old selection if no shiftKey
                    $target_element = next;
                } else {
                    $target_element = $('.file-block:first');
                }

                if($target_element) {
                    $target_element.addClass('ui-selected');
                    currentlySelectedManager.set_currently_selected($target_element);
                }

            } else if(e.keyCode == 38 || e.keyCode == 40) { // up & down
                var current = currentlySelectedManager.get_currently_selected("first");
                var current_idx = $.elementInArray(
                    current,
                    $('.file-block')
                ) + 1;

                if(!e.shiftKey) {
                    s.removeClass("ui-selected");
                }

                var current_row = Math.ceil(current_idx/items_per_row);
                var current_col = current_idx % items_per_row;
                var target_row;
                if(e.keyCode == 38) { // up
                    // handle the case when the users presses ^ and the current row is the first row
                    target_row = current_row == 1 ? total_rows : current_row - 1;
                } else if(e.keyCode == 40) { // down
                    // handle the case when the users presses DOWN and the current row is the last row
                    target_row = current_row == total_rows ? 1 : current_row + 1;
                }

                // calc the index of the target element
                var target_element_num = ((target_row-1) * items_per_row) + (current_col - 1);

                var $target = $('.file-block:eq(' + target_element_num + ')');

                $target.addClass("ui-selected");
                currentlySelectedManager.set_currently_selected(
                    $target
                );

            }
        }
        if (e.keyCode == 38 && s.length > 0 && $.selectddUIgrid == '.grid-scrolling-table' && !$.dialog)
		{
			// up in grid
			if (e.shiftKey) $(e).addClass('ui-selected');
			if ($(s[0]).prev().length > 0)
			{
				if (!e.shiftKey) $('.grid-table.fm tr').removeClass('ui-selected');
				$(s[0]).prev().addClass('ui-selected');
				sl = $(s[0]).prev();
			}
		}
		else if (e.keyCode == 40 && s.length > 0 && $.selectddUIgrid == '.grid-scrolling-table' && !$.dialog)
		{		
			// down in grid
			if (e.shiftKey) $(e).addClass('ui-selected');
			if ($(s[s.length-1]).next().length > 0)
			{
				if (!e.shiftKey) $('.grid-table.fm tr').removeClass('ui-selected');
				$(s[s.length-1]).next().addClass('ui-selected');
				sl = $(s[0]).next();
			}
		}
		else if (e.keyCode == 46 && s.length > 0 && !$.dialog)
		{
			$.selected=[];
			s.each(function(i,e)
			{
				$.selected.push($(e).attr('id'));
			});
			fmremove();
		}
		else if (e.keyCode == 13 && s.length > 0 && !$.dialog && !$.msgDialog && $('.fm-new-folder').attr('class').indexOf('active') == -1 && $('.top-search-bl').attr('class').indexOf('active') == -1)
		{		
			$.selected=[];
			s.each(function(i,e)
			{
				$.selected.push($(e).attr('id'));
			});			
			if ($.selected && $.selected.length > 0)
			{
				var n = M.d[$.selected[0]];
				if (n && n.t) M.openFolder(n.h);
				else M.addDownload($.selected);			
			}			
		}
		else if (e.keyCode == 13 && $.dialog == 'rename')
		{			
			dorename();
		}
		else if (e.keyCode == 27 && $.dialog)
		{
			$('.fm-dialog').addClass('hidden');
			$('.fm-dialog-overlay').addClass('hidden');
			$('.export-links-warning').addClass('hidden');			
			if ($.dialog == 'terms' && $.termsAgree) delete $.termsAgree;
			delete $.dialog;
		}
		else if (e.keyCode == 27 && $.msgDialog)
		{
			closeMsg();
			if ($.warningCallback) $.warningCallback(false);
		}
		else if (e.keyCode == 27)
		{
			$.hideTopMenu();
		}
		else if (e.keyCode == 65 && e.ctrlKey && !$.dialog)
		{
			$('.grid-table.fm tr').addClass('ui-selected');
			$('.file-block').addClass('ui-selected');
		}	
		if (sl && $.selectddUIgrid == '.grid-scrolling-table')
		{			
			var jsp = $('.grid-scrolling-table').data('jsp');
			jsp.scrollToElement(sl);
		}		
	});
}

function selectddUI()
{
	$($.selectddUIgrid + ' ' + $.selectddUIitem + '.folder').droppable( 
	{
		tolerance: 'pointer',
		drop: function( e, ui)
		{			
			$.doDD(e,ui,'drop',0);
		},
		over: function (e, ui)
		{
			$.doDD(e,ui,'over',0);
		},
		out: function (e, ui)
		{			
			$.doDD(e,ui,'out',0);
		}
	});
	$($.selectddUIgrid + ' ' + $.selectddUIitem).draggable(
	{
		start: function(e,u) 
		{				
			$.hideContextMenu(e);
			$.gridDragging=true;
			if ($(this).attr('class').indexOf('ui-selected') == -1)
			{
				$($.selectddUIgrid + ' ' + $.selectddUIitem).removeClass('ui-selected');
				$(this).addClass('ui-selected');				
			}			
			var s = $($.selectddUIgrid + ' .ui-selected');
			$.selected=[];
			s.each(function(i,e)
			{
				$.selected.push($(e).attr('id'));
			});
			if (s.length > 1)
			{
				$('.dragger-block').addClass('multiple');
				$('.dragger-files-number').text(s.length);
				$('.dragger-files-number').show();
			}
			var a = 0,html='',cl='',done={};				
			$('#draghelper .dragger-icon').remove();
			for (var i in $.selected)
			{					
				if (a == 0) cl = 'third';
				else if (a == 1) cl = 'second';
				else if (a == 2) cl = 'first';
				var ico = fileicon(M.d[$.selected[i]],'d');				
				if (a < 3 && !done[ico])
				{
					done[ico]=1;
					html = '<div class="dragger-icon '+cl+'" style="background-image:url('+ ico +');"></div>' + html;
					a++;
				}
			}
			$(html).insertBefore('#draghelper .dragger-status');
		},
		drag: function(e,u) 
		{
			
		},
		refreshPositions: true,
		containment: 'document',
		distance:10,
		revertDuration:200,
		revert: true,
		cursorAt:{right:100,bottom:70},
		helper: function(e,ui)
		{
			return getDDhelper();
		},
		stop: function(event)
		{
			$.gridDragging=false;
			setTimeout(function()
			{
				treeUIopen(M.currentdirid);
			},500);
		}
	});
	
	$($.selectddUIgrid).selectable({filter: $.selectddUIitem,start:function(e,u) { $.hideContextMenu(e); $.hideTopMenu(); }});

    /**
     * (Re)Init the currentlySelectedManager, because the .selectable() is reinitialized and we need to reattach to its
     * events.
     *
     * @type {CurrentlySelectedManager}
     */
    currentlySelectedManager = new CurrentlySelectedManager(
        $('.file-block-scrolling')
    );

	$($.selectddUIgrid + ' ' + $.selectddUIitem).unbind('contextmenu');
	$($.selectddUIgrid + ' ' + $.selectddUIitem).bind('contextmenu', function (e) 
	{	
		if ($(this).attr('class').indexOf('ui-selected') == -1)
		{
			$($.selectddUIgrid + ' ' + $.selectddUIitem).removeClass('ui-selected');
			$(this).addClass('ui-selected');
		}
		cacheselect();
		if (contextmenuUI(e,1)) return true;
		else return false;
	});
	
	$($.selectddUIgrid + ' ' + $.selectddUIitem).unbind('click');
	$($.selectddUIgrid + ' ' + $.selectddUIitem).bind('click', function (e) 
	{
		if (d) console.log(e);		
		if ($.gridDragging) return false;
		if (e.shiftKey && s.length > 0)
		{
			var start = s[0];
			var end = this;
			if ($.gridLastSelected && $($.gridLastSelected).attr('class').indexOf('ui-selected') > -1) start = $.gridLastSelected;
			else $.gridLastSelected = this;
			if ($(start).index() > $(end).index())
			{
				end = start;
				start = this;
			}
			$($.selectddUIgrid + ' ' + $.selectddUIitem).removeClass('ui-selected');
			$([start,end]).addClass('ui-selected');
			$(start).nextUntil($(end)).each(function(i,e)
			{
				$(e).addClass('ui-selected');		
			});

            currentlySelectedManager.set_currently_selected($(this));
		}
		else if (e.ctrlKey == false && e.metaKey == false)
		{
			$($.selectddUIgrid + ' ' + $.selectddUIitem).removeClass('ui-selected');
			$(this).addClass('ui-selected');
			$.gridLastSelected = this;
            currentlySelectedManager.set_currently_selected($(this));
		}
		else 
		{
			if ($(this).hasClass("ui-selected"))  $(this).removeClass("ui-selected");			
			else 
			{
				$(this).addClass("ui-selected");
				$.gridLastSelected = this;
                currentlySelectedManager.set_currently_selected($(this));
			}
		}
		$.hideContextMenu(e);
		if ($.hideTopMenu) $.hideTopMenu();
		return false;
	});
		
	$($.selectddUIgrid + ' ' + $.selectddUIitem).unbind('dblclick');
	$($.selectddUIgrid + ' ' + $.selectddUIitem).bind('dblclick', function (e) 
	{
		var h = $(e.currentTarget).attr('id');
		if (M.d[h] && M.d[h].t) M.openFolder(h);
		else M.addDownload([h]);
	});
}

function iconUI()
{
	$('.fm-files-view-icon.block-view').addClass('active');
	$('.fm-files-view-icon.listing-view').removeClass('active');
	
	if (M.currentdirid == 'contacts')
	{
		$.selectddUIgrid = '.contacts-blocks-scrolling';
		$.selectddUIitem = '.contact-block-view';
	}
	else
	{
		$.selectddUIgrid = '.file-block-scrolling';
		$.selectddUIitem = 'a';
	}
	selectddUI();	
	$('.files-grid-view').addClass('hidden');	
	$('.contacts-grid-view').addClass('hidden');
	if (M.currentdirid == 'contacts')
	{
		$('.fm-blocks-view').addClass('hidden');
		$('.fm-contacts-blocks-view').removeClass('hidden');
		initContactsBlocksScrolling();
	}
	else
	{
		$('.fm-contacts-blocks-view').addClass('hidden');
		$('.fm-blocks-view').removeClass('hidden');
		initFileblocksScrolling();
	}	
	$(window).unbind('resize.icon');
	$(window).bind('resize.icon', function () 
	{
		if (M.viewmode == 1 && M.currentdirid == 'contacts') initContactsBlocksScrolling();
        else if (M.viewmode == 1) initFileblocksScrolling();
    });
	
	$('.fm-blocks-view').unbind('contextmenu');
	$('.fm-blocks-view').bind('contextmenu',function(e)
	{		
		$('.file-block').removeClass('ui-selected');
		currentlySelectedManager.clear(); // is this required? don't we have a support for a multi-selection context menu?
		$.selected=[];
		if (contextmenuUI(e,2)) return true;
		else return false;	
		$.hideTopMenu();
	});
}








function transferPanelUI()
{
    $.transferHeader = function()
	{		
		var el = $('.transfer-table-header th');
		var i=1;
		var w=0;		
		while (i < el.length)
		{
			w+=$(el[i]).width();
			i++;
		}
		$('.transfer-table-header th:eq(0)').width($('.transfer-panel').width()-w-82);	
		$('.transfer-table tr').unbind('click contextmenu');
		$('.transfer-table tr').bind('click contextmenu', function (e) 
		{
			if (e.type == 'contextmenu')
			{
				$('.context-menu.files-menu .context-menu-item').hide();
				$('.context-menu.files-menu .context-menu-item').filter('.refresh-item,.canceltransfer-item').show();
				var c = $(this).attr('class');				
				if (!c || (c && c.indexOf('ui-selected') == -1)) $('.transfer-table tr').removeClass('ui-selected');
				$(this).addClass('ui-selected');
				$(this).addClass('dragover');
				if (contextmenuUI(e)) return true;
				else return false;			
			}
			else
			{
				var s = $('.transfer-table tr');
				if (e.shiftKey && s.length > 0)
				{				
					var start = s[0];
					var end = this;
					if ($.TgridLastSelected && $($.TgridLastSelected).attr('class').indexOf('ui-selected') > -1) start = $.TgridLastSelected;
					if ($(start).index() > $(end).index())
					{
						end = start;
						start = this;
					}
					$('.transfer-table tr').removeClass('ui-selected');
					$([start,end]).addClass('ui-selected');
					$(start).nextUntil($(end)).each(function(i,e)
					{
						$(e).addClass('ui-selected');		
					});
				}
				else if (e.metaKey == false) 
				{
					$('.transfer-table tr').removeClass('ui-selected');
					$(this).addClass('ui-selected');
					$.TgridLastSelected = this;
				}
				else 
				{
					if ($(this).hasClass("ui-selected"))  $(this).removeClass("ui-selected");			
					else 
					{
						$(this).addClass("ui-selected");
						$.TgridLastSelected = this;
					}
				}
			}			
		});		
		initTranferScroll();
	}	
	$(window).unbind('resize.transferpanel');
	$(window).bind('resize.transferpanel', function (e) 
	{	
         $.transferHeader();
    });
	$('.tranfer-view-icon').unbind('click');
	$('.tranfer-view-icon').bind('click', function (e) 
	{
        if($(this).attr('class').indexOf('active') == -1) 
		{
			$(this).addClass('active');
			$('#fmholder').addClass('transfer-panel-opened');
			$.transferHeader();
		}
		else 
		{
			$(this).removeClass('active');
			$('#fmholder').removeClass('transfer-panel-opened');
		}
		initTreeScroll();
		
		if (M.currentdirid == 'notifications') notificationsScroll();
		else if (M.currentdirid.substr(0,7) == 'account') initAccountScroll();
		else if (M.viewmode == 1) initFileblocksScrolling();
		else initGridScrolling();
    });
	$('.transfer-settings-icon').unbind('click');
	$('.transfer-settings-icon').bind('click',function()
	{
		if (u_type === 0) ephemeralDialog('Transfer settings are for registered users only.');
		else document.location.hash = 'fm/account/settings';
	});
	$('.transfer-pause-icon').unbind('click');
	$('.transfer-pause-icon').bind('click',function()
	{
		if ($(this).attr('class').indexOf('active') > -1)
		{
			$(this).removeClass('active');
			uldl_resume();
		}
		else
		{
			$(this).addClass('active');
			uldl_pause();
		}	
	});
}


function getDDhelper()
{
	var id = '#fmholder';
	if (page == 'start') id = '#startholder';
	$('.dragger-block').remove();
	$(id).append('<div class="dragger-block drag" id="draghelper"><div class="dragger-status"></div><div class="dragger-files-number">1</div></div>');	
	$('.dragger-block').removeClass('multiple');
	$('.dragger-block').show();
	$('.dragger-files-number').hide();
	return $('.dragger-block')[0];
}



function contextmenuUI(e,ll)
{
	if (localStorage.contextmenu) return true;	
	var t = '.context-menu.files-menu .context-menu-item';	
	if (ll == 2)
	{
		if (RightsbyID(M.currentdirid) && RootbyId(M.currentdirid) !== M.RubbishID)
		{
			$('.context-menu-item').hide();
			$(t).filter('.fileupload-item,.newfolder-item,.refresh-item').show();
			if ('webkitdirectory' in document.createElement('input')) $(t).filter('.folderupload-item').show();
		}
		else return false;
	}
	else if (ll)
	{
		$(t).hide();
		var c = $(e.currentTarget).attr('class');
		var id = $(e.currentTarget).attr('id');
		if (id) id = id.replace('treea_','');	
		if (id && !M.d[id]) id = undefined;
		if (id && id.length == 11) $(t).filter('.refresh-item,.remove-item').show();		
		else if (c && c.indexOf('cloud-drive-item') > -1)
		{
			$(t).filter('.refresh-item,.newfolder-item,.properties-item').show();
			if (folderlink) $(t).filter('.newfolder-item').hide();
		}
		else if (c && c.indexOf('recycle-item') > -1)
		{
			$(t).filter('.refresh-item,.clearbin-item').show();
		}
		else if (c && c.indexOf('contacts-item') > -1)
		{
			$(t).filter('.refresh-item,.addcontact-item').show();
		}
		else if (c && c.indexOf('messages-item') > -1)
		{
			e.preventDefault();
			return false;			
		}
		else if (c && (c.indexOf('file-block') > -1 || c.indexOf('folder') > -1 || c.indexOf('fm-tree-folder') > -1) || id)
		{
			var sourceRoot = RootbyId($.selected[0]);			
			if ($.selected.length == 1 && RightsbyID($.selected[0]) > 0) $(t).filter('.rename-item').show();
			if (RightsbyID($.selected[0]) > 0)
			{
				$(t).filter('.remove-item,.add-star-item').show();				
				$.delfav=1;
				for (var i in $.selected)
				{
					var n = M.d[$.selected[i]];					
					if (n && !n.fav) $.delfav=0;
				}				
				if ($.delfav) $('.add-star-item').text(l[976]);				
				else $('.add-star-item').text(l[975]);
			}
			if ($.selected.length == 1 && M.d[$.selected[0]].t) $(t).filter('.open-item').show();			
			if (sourceRoot == M.RootID && $.selected.length == 1 && M.d[$.selected[0]].t && !folderlink) $(t).filter('.sharing-item').show();			
			if (sourceRoot == M.RootID && !folderlink) $(t).filter('.move-item,.getlink-item').show();
			else if (sourceRoot == M.RubbishID && !folderlink) $(t).filter('.move-item').show();
			$(t).filter('.download-item,.zipdownload-item,.copy-item,.properties-item,.refresh-item').show();

			if (folderlink) $(t).filter('.properties-item,.copy-item,.add-star-item').hide();
		}
		else return false;		
	}
	var m = $('.context-menu.files-menu');
	m.removeClass('hidden');
	var r = $('body').outerWidth()-$(m).outerWidth();
	var b = $('body').outerHeight()-$(m).outerHeight();
	var mX = e.pageX;
	var mY = e.pageY;
	m.css({'top':mY,'left':mX})
	if (b - $(m).position().top < 50) m.css('top', b-50);		
	if (r - $(m).position().left < 1) m.css('left', mX - 10 - $(m).outerWidth());	
	e.preventDefault();
}

var tt;

function treeUI()
{
	tt = new Date().getTime();
	$('.fm-menu-item').unbind('click');
	$('.fm-menu-item').bind('click',function(event) 
	{
		$('.fm-menu-item').removeClass('active');
		if ($(this).attr('class').indexOf('cloud') > -1)
		{	
			$(this).addClass('active');
			M.openFolder(M.RootID);
			var jsp = $('.fm-tree-panel').data('jsp');
			if (jsp) jsp.scrollTo(0,0);
		}		
		else if ($(this).attr('class').indexOf('recycle') > -1)
		{	
			$(this).addClass('active');
			M.openFolder(M.RubbishID);
			var pos = $('.fm-tree-header.recycle-item').position();			
			var jsp = $('.fm-tree-panel').data('jsp');
			if (jsp) jsp.scrollTo(0,pos.top);
		}		
		else if ($(this).attr('class').indexOf('contacts') > -1)
		{	
			$(this).addClass('active');
			M.openFolder('contacts');
			var pos = $('.fm-tree-header.contacts-item').position();			
			var jsp = $('.fm-tree-panel').data('jsp');
			if (jsp) jsp.scrollTo(0,pos.top);		
		}		
		else if ($(this).attr('class').indexOf('messages') > -1)
		{	
			$(this).addClass('active');
			M.openFolder(M.InboxID);
			var pos = $('.fm-tree-header.messages-item').position();
			var jsp = $('.fm-tree-panel').data('jsp');
			if (jsp) jsp.scrollTo(0,pos.top);
		}
		return false;		
	});
	
	$('.fm-tree-panel .fm-tree-header').unbind('click contextmenu');
	$('.fm-tree-panel .fm-tree-header').bind('click contextmenu',function(e) 
	{
		$.hideContextMenu(e);
		if (e.type == 'contextmenu')
		{			
			$('.fm-tree-panel .fm-tree-header').removeClass('dragover');
			$('.fm-tree-panel .fm-tree-folder').removeClass('dragover');
			$(this).addClass('dragover');
			if (contextmenuUI(e,1)) return true;
			else return false;			
		}
		$('.fm-tree-panel .fm-connector').removeClass('last vertical-line mid');
		$('.fm-tree-panel .fm-horizontal-connector').removeClass('active');
		$('.fm-tree-panel .fm-tree-folder').removeClass('active');
		$('.fm-tree-panel .fm-connector-first').removeClass('active');	
		var id;
		if ($(this).attr('class').indexOf('cloud-drive-item') > -1) id = M.RootID;							
		else if ($(this).attr('class').indexOf('recycle-item') > -1) id = M.RubbishID;							
		else if ($(this).attr('class').indexOf('contacts-item') > -1)
		{
			var c = $(e.target).attr('class');	
			if (c && c.indexOf('contacts-arrows') > -1) return false;			
			id = 'contacts';			
		}		
		else if ($(this).attr('class').indexOf('messages-item') > -1) id = M.InboxID;					
		var isSubfolders = $(this).attr('class').indexOf('contains-subfolders');
		if(isSubfolders > -1 && $(this).attr('class').indexOf('opened') == -1) 
		{
			var mainConnector = $(this).prev();
			$(this).next().addClass('opened');
			$(this).addClass('opened expanded');
			$(this).next().find('li').each(function()
			{
				if($(this).attr('class') && $(this).attr('class').indexOf('selected') > -1) 
				{
					mainConnector.addClass('active');
					return false;
				}
			});
		} 
		else if ((id == M.currentdirid) || e.offsetX < 25 || e.layerX < 25)
		{			
			$(this).next().removeClass('opened');
			$(this).removeClass('opened expanded');
			$(this).prev().removeClass('active');
		}		
		$.selectingHeader($(this)); 		   
		if (id) M.openFolder(id);		
		return false;
	});
	
	$('.fm-tree-panel .fm-tree-folder').not('.contact').draggable( 
	{
		revert: true,
		containment: 'document',
		revertDuration:200,
		distance: 10,
		cursorAt:{right:100,bottom:70},
		helper: function(e,ui)
		{			
			return getDDhelper();
		},
		start: function (e, ui) 
		{
			$.treeDragging=true;
			$.hideContextMenu(e);			
			var html = '';
			var id = $(e.target).attr('id');			
			if (id) id = id.replace('treea_','');
			if (id && M.d[id]) html = '<div class="dragger-icon" style="background-image:url('+ fileicon(M.d[id],'d') +');"></div>'
			$('#draghelper .dragger-icon').remove();
			$(html).insertBefore('#draghelper .dragger-status');
		},
		drag: function(e,u) 
		{
			//console.log('tree dragging',e);
		},
		stop: function(e,u)
		{
			$.treeDragging=false;
		}
	});
	$('.fm-tree-panel a.fm-tree-folder,.fm-tree-header.cloud-drive-item,.fm-tree-header.recycle-item,.fm-tree-header.messages-item,.fm-tree-header.contacts-item,.fm-menu-item.cloud,.fm-menu-item.recycle').droppable( 
	{
		tolerance: 'pointer',		
		drop: function(e, ui)
		{			
			$.doDD(e,ui,'drop',1);
		},
		over: function (e, ui)
		{
			$.doDD(e,ui,'over',1);
		},
		out: function (e, ui)
		{			
			var c1 = $(e.srcElement).attr('class'),c2 = $(e.target).attr('class');
			if (c2 && c2.indexOf('fm-menu-item') > -1 && c1 && (c1.indexOf('cloud') > -1 || c1.indexOf('cloud') > -1)) return false;
			$.doDD(e,ui,'out',1);
		}
	});		
	$('.fm-tree-panel .fm-tree-folder').unbind('click contextmenu');
	$('.fm-tree-panel .fm-tree-folder').bind('click contextmenu',function(e) 
	{
		var id = $(this).attr('id').replace('treea_','');		
		if (e.type == 'contextmenu')
		{
			$('.fm-tree-header').removeClass('dragover');
			$('.fm-tree-folder').removeClass('dragover');
			$(this).addClass('dragover');
			$.selected=[id];
			if (contextmenuUI(e,1)) return true;
			else return false;
		}
		if (e.offsetX) e.layerX=false;		
		var eoffsetX=e.offsetX;
		if (!eoffsetX)eoffsetX=e.pageX-$(this).offset().left;
		
		
		var c = $(e.target).parent().attr('class');		
		if (!c || c.indexOf('fm-tree-folder') == -1) eoffsetX=25;
		
		if ((eoffsetX < 23) || ($(this).attr('class').indexOf('active') > -1 && $(this).attr('class').indexOf('expanded') == -1) || id == M.currentdirid) 
		{
			treeUIexpand(id);			
		}
		else if ((eoffsetX > 23) || $(this).attr('class').indexOf('active') > -1) M.openFolder(id);		
		return false;		
	});		
	$(window).unbind('resize.tree');
	$(window).bind('resize.tree', function () 
	{		
		initTreeScroll();	
	});	
	setTimeout(initTreeScroll,10);	
	treeheaderArrows();	
	if (d) console.log('treeUI()',new Date().getTime()-tt);
}

function treeUIexpand(id,force)
{
	if (id == 'contacts') M.buildtree({h:'contacts'});
	else M.buildtree(M.d[id]);
	var b = $('#treea_' + id);	
	var d = b.attr('class');	
	if (d && d.indexOf('expanded') > -1 && !force)
	{
		fmtreenode(id,false);
		$('#treesub_' + id).removeClass('opened');
		b.removeClass('opened');
		b.removeClass('expanded');
	}
	else if (d && d.indexOf('contains-folders') > -1)
	{
		fmtreenode(id,true);
		$('#treesub_' + id).addClass('opened');
		b.addClass('opened')
		b.addClass('expanded');
	}
	if ($('.fm-connector-first.active').length > 0)
	{	
		var connectorst=false;
		$('.fm-connector,.fm-connector-first.active').each(function(i,e)
		{
			var c = $(e).attr('class');
			if (c && c.indexOf('last') > -1) return false;
			else if (c && c.indexOf('fm-connector-first') > -1) connectorst=true;
			else if (connectorst && (!c || c.indexOf('mid') == -1)) $(e).addClass('vertical-line');				
		});
	}	
	treeUI();
}

function treeUIopen(id,event,ignoreScroll,dragOver,DragOpen)
{
	if (!fminitialized) return false;	
	if (!M.d[id] && id !== 'contacts') return false;
	
	if (id == 'contacts')
	{
		$('.fm-left-panel .fm-tree-header.contacts-item').addClass('active expanded opened');
		$('.fm-subfolders.contacts').addClass('opened');	
	}
	if (!event)
	{
		var ids = M.getPath(id);
		ids = ids.reverse();	
		var i=1;
		while (i < ids.length)
		{		
			if (M.d[ids[i]]) treeUIexpand(ids[i],1);
			i++;
		}
	}
	if ($.hideContextMenu) $.hideContextMenu(event);
	$('.fm-tree-panel .fm-connector').removeClass('last vertical-line mid');
	$('.fm-tree-panel .fm-horizontal-connector').removeClass('active');
	$('.fm-tree-panel .fm-tree-folder').removeClass('opened');
	
	var b = $('#treea_' + id);	
	var d = b.attr('class');
	$('.fm-tree-panel .fm-tree-folder').removeClass('active');	
	$('.fm-tree-panel .fm-tree-folder').removeClass('lightactive');	
	var a = M.getPath(id);
	
	if (b.length > 0)
	{	
		$('.fm-left-panel .fm-connector').each(function(i,e)
		{
			if (i == 0) $(e).prev().prev().prev().closest('.fm-connector-first').addClass('active');
			$(e).addClass('vertical-line');			
			var id2 = $(e).next().next().closest('.fm-tree-folder').attr('id');			
			if (id2 && id2.replace('treea_','') == id) return false;
		});	
		$(a).each(function(i,e)
		{
			var f = $('#treea_' + e).prev().prev().closest('.fm-connector');
			if (i > 0)
			{
				fmtreenode(e,true);
				$('#treesub_' + e).addClass('opened');	
				$('#treea_' + e).addClass('opened expanded');
				f.removeClass('vertical-line');
				f.addClass('mid');			
			}		
			else f.addClass('last');
			if (e == M.currentdirid) $('#treea_' + e).addClass('active');
			else $('#treea_' + e).addClass('lightactive');
			$('#treea_' + e).prev().closest('.fm-horizontal-connector').addClass('active');
		});
	}
	
	var scrollTo = false;	
	var stickToTop = false;
	
	if (id == M.RootID || id == 'contacts' || id == M.InboxID || id == M.RubbishID || id == 'messages')
	{
		if (id == M.RootID) scrollTo = $('.fm-left-panel .cloud-drive-item');
		else if (id == M.InboxID) scrollTo = $('.fm-left-panel .messages-item');
		else if (id == 'contacts')
		{
			scrollTo = $('.fm-left-panel .contacts-item');
			stickToTop = true;
		}
		else if (id == M.RubbishID)
		{
			scrollTo = $('.fm-left-panel .recycle-item');
			stickToTop = true;
		}				
		else if (id == 'messages') scrollTo = $('.fm-left-panel .messages-item');
		if (scrollTo) $.selectingHeader(scrollTo);
		if (scrollTo && dragOver) $(scrollTo).addClass('dragover');
		if (!dragOver && ($(scrollTo).length == 0 || $(scrollTo).visible())) scrollTo=false;
	}
	else
	{	
		var currentHeader = b.closest('.fm-subfolders').prev();
		$('.fm-tree-panel .fm-connector-first').addClass('active');
		$.selectingHeader(currentHeader);
		if ($('#treea_' + id).length > 0 && !$('#treea_' + id).visible()) scrollTo = $('#treea_' + id);		
	}
	
	if (scrollTo && !ignoreScroll)
	{	
		var jsp = $('.fm-tree-panel').data('jsp');
		if (jsp) setTimeout(function() 
		{
			jsp.scrollToElement(scrollTo,stickToTop);
		},50);
	}
	treeUI();
}

function renameDialog()
{
	if ($.selected.length > 0)
	{
		$.dialog = 'rename';		
		var n = M.d[$.selected[0]];	
		$('.rename-dialog input').val(n.name);
		if (n.t) $('.rename-dialog .fm-dialog-title').text(l[425]);
		else $('.rename-dialog .fm-dialog-title').text(l[426]);
		
		$('.rename-dialog').removeClass('hidden');
		$('.rename-dialog').addClass('active');
		$('.fm-dialog-overlay').removeClass('hidden');		
		$('.rename-dialog .fm-dialog-close').unbind('click');
		$('.rename-dialog .fm-dialog-close').bind('click',function()  
		{
			$.dialog=false;
			$('.rename-dialog').addClass('hidden');
			$('.fm-dialog-overlay').addClass('hidden');
		});
		$('.rename-dialog .fm-dialog-input-clear').unbind('click');
		$('.rename-dialog .fm-dialog-input-clear').bind('click',function()  
		{
			$('.rename-dialog input').val('');			
			$('.rename-dialog').removeClass('active');
		});		
		$('.rename-dialog input').unbind('keyup');
		$('.rename-dialog input').bind('keyup',function()  
		{
			if ($(this).val() == '') $('.rename-dialog').removeClass('active');
			else $('.rename-dialog').addClass('active');
		});		
		$('.rename-dialog input').focus();		
		$('.fm-dialog-rename-button').unbind('click');
		$('.fm-dialog-rename-button').bind('click',function()  
		{
			dorename();
		});
	}
}

function dorename()
{
	if ($('.rename-dialog input').val() !== '')
	{
		var h = $.selected[0];
		var n = M.d[h];		
		var nn = $('.rename-dialog input').val();		
		if (nn !== n.name) M.rename(h,nn);
		$.dialog=false;
		$('.rename-dialog').addClass('hidden');
		$('.fm-dialog-overlay').addClass('hidden');
	}
}

function msgDialog(type,title,msg,submsg,callback)
{
	$.msgDialog = type;	
	$('#msgDialog').removeClass('clear-bin-dialog confirmation-dialog warning-dialog-b warning-dialog-a notification-dialog');	
	$('#msgDialog .icon').removeClass('fm-bin-clear-icon .fm-notification-icon');
	$.warningCallback = callback;
	if (type == 'clear-bin')
	{
		$('#msgDialog').addClass('clear-bin-dialog');
		$('#msgDialog .icon').addClass('fm-bin-clear-icon');
		$('#msgDialog .fm-notifications-bottom').html('<div class="fm-dialog-button notification-button active">' + l[82] + '</div><div class="fm-dialog-button notification-button active">' + l[1018] + '</div><div class="clear"></div>');		
		$('#msgDialog .fm-dialog-button').eq(0).bind('click',function()
		{			
			closeMsg();
			if ($.warningCallback) $.warningCallback(false);
		});
		$('#msgDialog .fm-dialog-button').eq(1).bind('click',function()
		{
			closeMsg();
			if ($.warningCallback) $.warningCallback(true);
		});		
	}
	else if (type == 'warninga' || type == 'warningb' || type == 'info')
	{
		$('#msgDialog .fm-notifications-bottom').html('<div class="fm-dialog-button notification-button active">' + l[81] + '</div><div class="clear"></div>');
		$('#msgDialog .fm-dialog-button').bind('click',function()
		{			
			closeMsg();
			if ($.warningCallback) $.warningCallback(true);
		});
		$('#msgDialog .icon').addClass('fm-notification-icon');
		if (type == 'warninga') $('#msgDialog').addClass('warning-dialog-a');
		else if (type == 'warningb') $('#msgDialog').addClass('warning-dialog-b');
		else if (type == 'info') $('#msgDialog').addClass('notification-dialog');
	}
	else if (type == 'confirmation')
	{
		$('#msgDialog .fm-notifications-bottom').html('<div class="fm-dialog-button notification-button active">' + l[79] + '</div><div class="fm-dialog-button notification-button active">' + l[78] + '</div><div class="clear"></div>');
		
		$('#msgDialog .fm-dialog-button').eq(0).bind('click',function()
		{			
			closeMsg();
			if ($.warningCallback) $.warningCallback(false);
		});
		$('#msgDialog .fm-dialog-button').eq(1).bind('click',function()
		{
			closeMsg();
			if ($.warningCallback) $.warningCallback(true);
		});	
		$('#msgDialog .icon').addClass('fm-notification-icon');
		$('#msgDialog').addClass('confirmation-dialog');	
	}

	$('#msgDialog .fm-dialog-title').text(title);
	$('#msgDialog .fm-notification-info p').html(msg);	
	if (submsg)
	{
		$('#msgDialog .fm-notification-warning').text(submsg);
		$('#msgDialog .fm-notification-warning').show();
	}
	else $('#msgDialog .fm-notification-warning').hide();
	$('#msgDialog .fm-dialog-close').unbind('click');
	$('#msgDialog .fm-dialog-close').bind('click',function()
	{
		closeMsg();
		if ($.warningCallback) $.warningCallback(false);
	});
	$('#msgDialog').removeClass('hidden');
	$('.fm-dialog-overlay').removeClass('hidden');
}

function closeMsg()
{
	$('#msgDialog').addClass('hidden');
	$('.fm-dialog-overlay').addClass('hidden');
	delete $.msgDialog;
}

function shareDialog(close)
{
	if (close)
	{
		$('.share-dialog').addClass('hidden');
		$('.fm-dialog-overlay').addClass('hidden');
		$.dialog=false;
		return true;
	}	
	
	M.renderShare($.selected[0]);
	
	$('.fm-share-add-contacts').removeClass('active');
	$('.fm-share-contacts-popup').addClass('hidden');
	
	$.dialog='sharing';
	$('.fm-share-add-contacts').unbind('click');
	$('.fm-share-add-contacts').bind('click',function()  
	{
		if ($(this).attr('class').indexOf('active') == -1) 
		{		
			var jsp = $('.fm-share-contacts-body').data('jsp');
			if (jsp) jsp.destroy();
			var u = [];
			var html='';
			for(var i in M.c['contacts']) if (M.u[i]) u.push(M.u[i]);
			u.sort(function(a,b){if (u.name) return u.name.localeCompare(b.name);});			
			for (var i in u)
			{
				var avatar= staticpath + 'images/mega/default-top-avatar.png';
				if (avatars[u[i].h]) avatar = avatars[u[i].h].url;
				html += '<a class="add-contact-item" id="'+htmlentities(u[i].h)+'"><span class="add-contact-pad"><span class="avatar '+ u[i].h +'"><span><img src="' + avatar + '" alt=""></span></span><span class="add-contact-username">'+htmlentities(u[i].m)+'</span></span></a>';
			}
			$('.fm-share-contacts-body').html(html);
			$('.fm-share-contacts-popup').removeClass('hidden');			
			$('.fm-share-contacts-popup input').val(l[1019]);			
			$('.fm-share-contacts-popup input').unbind('click');
			$('.fm-share-contacts-popup input').bind('click',function()  
			{
				if ($(this).val() == l[1019]) $(this).val('');
			});
			
			$('.fm-share-contacts-popup input').unbind('keyup');
			$('.fm-share-contacts-popup input').bind('keyup',function()  
			{
				if (!checkMail($(this).val())) $('.add-contact-button').addClass('active');				
			});
			
			$('.fm-share-contacts-body .add-contact-item').unbind('click');
			$('.fm-share-contacts-body .add-contact-item').bind('click',function()  
			{
				if ($(this).attr('class').indexOf('ui-selected') > -1) $(this).removeClass('ui-selected');
				else $(this).addClass('ui-selected');
				
				var sl = $('.fm-share-contacts-body .ui-selected');
				if (sl.length > 0) $('.add-contact-button').addClass('active');
				else $('.add-contact-button').removeClass('active');						
			});			
			$(this).addClass('active');
			$('.fm-share-contacts-body').jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5,animateScroll: true});
			jScrollFade('.fm-share-contacts-body');
		} 
		else 
		{
			$('.fm-share-add-contacts').removeClass('active');
			$('.fm-share-contacts-popup').addClass('hidden');
		}
	});
	$('.cancel-contact-button').unbind('click');
	$('.cancel-contact-button').bind('click',function()  
	{
	    $('.fm-share-contacts-popup').addClass('hidden');
		$('.fm-share-add-contacts').removeClass('active');
	});	
	$('.add-contact-button, .fm-share-contacts-search').unbind('click');
	$('.add-contact-button, .fm-share-contacts-search').bind('click',function()  
	{
		var e = $('.fm-share-contacts-popup input').val();		
		if (e !== '' && e !== l[1019] && checkMail(e))
		{
			msgDialog('warninga',l[135],l[141],'',function()
			{
				$('.fm-dialog-overlay').removeClass('hidden');
			});	
		}
		else
		{
			var sl = $('.fm-share-contacts-body .ui-selected');
			if (e == '' && sl.length == 0)
			{			
				msgDialog('warninga',l[135],l[1020],'',function()
				{
					$('.fm-dialog-overlay').removeClass('hidden');
					$('.fm-share-contacts-head input').focus();
				});
			}
			else
			{				
				var t = [];
				var s = M.d[$.selected[0]].shares;
				if (e !== '' && e !== l[1019]) 
				{
					var user = getuid(e);
					if (user) e = user;
					if (!(s && s[e])) t.push({u:e,r:0});
				}
				$('.fm-share-contacts-body .ui-selected').each(function(i,el)
				{
					var id = $(el).attr('id');
					if (id && !(s && s[id])) t.push({u:id,r:0});
				});
				$('.fm-share-contacts-popup').addClass('hidden');
				$('.fm-share-add-contacts').removeClass('active');				
				if (t.length > 0)
				{				
					loadingDialog.show();
					$('.fm-dialog.share-dialog').addClass('hidden');
					doshare($.selected[0],t);
				}
			}
		}	    
	});
	
	

	$('.share-folder-block').addClass('hidden');
	var n = M.d[$.selected[0]];	
	if (n && n.shares && u_sharekeys[n.h])
	{		
		for (var i in n.shares)
		{
			if (i == 'EXP')
			{
				$('#share_on_off').html('<div class="on_off public-checkbox"><input type="checkbox" id="public-checkbox" /></div>');
				$('.public-checkbox input').attr('checked',true);
				$('.share-folder-block :checkbox').iphoneStyle({checkedLabel:l[1021],uncheckedLabel:l[1022],resizeContainer:false,resizeHandle:false,onChange:function(elem, data)
				{		
					if (d) console.log('remove shared folder...');
				}});
				$('.share-folder-icon img').attr('src',fileicon(n,'m'));
				$('.share-folder-block').removeClass('hidden');
				$('.share-folder-info .propreties-dark-txt').text(n.name);
				if (!n.ph)
				{
					api_req([{a: 'l',n: $.selected[0]}],
					{
						n:n,
						callback: function(json,params)
						{							
							M.nodeAttr({h:params.n.h,ph:json[0]});
							$('.share-folder-block .properties-file-link').html('https://mega.co.nz/#F!' + htmlentities(json[0]) + '!' + htmlentities(a32_to_base64(u_sharekeys[params.n.h])));
						}
					});
				}
				else $('.share-folder-block .properties-file-link').html('https://mega.co.nz/#F!' + htmlentities(n.ph) + '!' + htmlentities(a32_to_base64(u_sharekeys[n.h])));
			}
		}
	}
	
	$('.share-dialog .fm-dialog-close, .share-dialog .cancel-button, .share-dialog .save-button').unbind('click');
	$('.share-dialog .fm-dialog-close, .share-dialog .cancel-button, .share-dialog .save-button').bind('click',function()  
	{
		var sops=[];
		if ($('.share-folder-block').attr('class').indexOf('hidden') == -1 && !$('.public-checkbox input').attr('checked'))
		{
			M.delnodeShare($.selected[0],'EXP');
			api_req([{a: 'l',n: $.selected[0]}],
			{
			  callback : function (json) { if (json[0]) api_req([{a: 'l',p: json[0]}]); }
			});
			sops.push({u:'EXP',r:''});
		}		
		if ($.delShare)
		{
			for (var i in $.delShare)
			{
				sops.push({u:$.delShare[i],r:''});
				M.delnodeShare($.selected[0],$.delShare[i]);
			}		
			delete $.delShare;
		}		
		if (sops.length > 0) api_req([{a: 's',n:$.selected[0],s:sops,ha:'',i: requesti}]);		
		shareDialog(1);
	});
	$('.fm-share-dropdown').unbind('click');	
	$('.fm-share-dropdown').bind('click',function()  
	{
		$('.fm-share-permissions-block').addClass('hidden');
		$(this).next().removeClass('hidden');
		var dropdownPosition  = $(this).next().offset().top + 140;
		var scrBlockPosition = 	$(this).closest('.fm-share-body').offset().top + 318;
		if (scrBlockPosition - dropdownPosition < 10) 
		{
			$(this).next().addClass('bottom');
		}	
	});
	$('.fm-share-permissions').unbind('click');
	$('.fm-share-permissions').bind('click',function()  
	{
		$(this).parent().parent().find('.fm-share-permissions').removeClass('active');
		$(this).addClass('active');		
		var r = $(this).attr('id');
		if (r) r = r.replace('rights_','');
		var t = '';
		if (r == 0) 	t = l[55];
		else if (r == 1) t = l[56];
		else if (r == 2) t = l[57];
		else if (r == 3) t = l[83];
		$(this).parent().parent().find('.fm-share-dropdown').text(t);		
		var id = $(this).parent().parent().parent().attr('id');		
		if (r == 3)
		{
			if (!$.delShare) $.delShare=[];			
			$.delShare.push(id);			
			if (d) console.log('delShare',$.delShare);
		}
		else doshare($.selected[0],[{u:id,r:r}]);		
		$('.fm-share-permissions-block').addClass('hidden');
	});
	$('.share-dialog').removeClass('hidden');
	$('.fm-dialog-overlay').removeClass('hidden');
	$('.fm-share-body').jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5,animateScroll: true});
	jScrollFade('.fm-share-body');
}

function mcDialog(close)
{
	if (close)
	{
		$.dialog=false;
		$('.move-dialog').addClass('hidden');
		$('.fm-dialog-overlay').addClass('hidden');
		$('.move-dialog #mainsub').html('');
		return true;	
	}
	
	
	var jsp = $('.fm-move-dialog-body').data('jsp');
	if (jsp) jsp.scrollTo(0,0,false);
	
	if ($.selected.length > 0)
	{
		$.dialog = 'mc';		
		$('.move-dialog #topheader').removeClass('contacts-item cloud-drive-item active');
		$('.move-dialog #bottomheader').removeClass('recycle-item recyle-notification contacts-item cloud-drive-item active');		
		$('.move-dialog .fm-dialog-title').text(l[63] + ' (' + l[118] + ')');
		$('.move-dialog .move-button').text(l[63]);		
		if ($.mctype == 'move')
		{
			$('.move-dialog .fm-dialog-title').text(l[62] + ' (' + l[118] + ')');
			$('.move-dialog .move-button').text(l[62]);
			$('.move-dialog #topheader').addClass('cloud-drive-item active');
			$('.move-dialog #topheader span').text(l[164]);			
			$('.move-dialog #bottomheader').addClass('recycle-item');
			$('.move-dialog #bottomheader span').text(l[167]);
		}
		else if ($.mctype == 'copy-cloud')
		{
			$('.move-dialog #topheader').addClass('cloud-drive-item active');
			$('.move-dialog #topheader span').text(l[164]);			
			$('.move-dialog #bottomheader').addClass('contacts-item');
			$('.move-dialog #bottomheader span').text(l[165]);
		}
		else if ($.mctype == 'copy-contacts')
		{
			$('.move-dialog #topheader').addClass('contacts-item active');
			$('.move-dialog #topheader span').text(l[165]);			
			$('.move-dialog #bottomheader').addClass('cloud-drive-item');
			$('.move-dialog #bottomheader span').text(l[164]);
		}		
		var html;
		if ($.mctype == 'move' || $.mctype == 'copy-cloud') html = $('.fm-tree-pad .fm-subfolders').first().html();	
		else html = $('#treesub_contacts').html();
		html = html.replace(/treea_/g,'mctreea_').replace(/treesub_/g,'mctreesub_');
		$('.move-dialog .fm-move-dialog-body .fm-subfolders').first().html(html);		
		$('.move-dialog #mainsub').html(html);		
		$('.move-dialog #mainsub ul').removeClass('opened');
		$('.move-dialog #mainsub a').removeClass('expanded active lightactive');				
		$('.move-dialog .messages-icon').hide();		
		$.mctreeUI = function()
		{
			$('.move-dialog #mainsub a').unbind('click');		
			$('.move-dialog #mainsub a').bind('click',function(e,ui)
			{
				$.mcselected = $(this).attr('id').replace('mctreea_','');				
				M.buildtree(M.d[$.mcselected]);			
				var html = $('#treesub_'+$.mcselected).html();
				if (html) $('#mctreesub_'+$.mcselected).html(html.replace(/treea_/g,'mctreea_').replace(/treesub_/g,'mctreesub_'));
				$.mctreeUI();				
				var c = $(this).attr('class');
				if (c.indexOf('contains-folders') > -1)
				{
					c2 = $(this).next().attr('class');				
					if ((c.indexOf('active') > -1 || e.offsetX < 25 || e.layerX < 25) && ((c2 && c2.indexOf('opened') > -1)))
					{
						$(this).next().removeClass('opened');					
						$(this).removeClass('expanded');
					}
					else if ((c.indexOf('active') > -1 || e.offsetX < 25 || e.layerY < 25) && ((c2 && c2.indexOf('opened') == -1) || !c2))
					{
						$(this).next().addClass('opened');
						$(this).addClass('expanded');				
					}
				}
				$('.move-dialog .fm-move-dialog-body .fm-subfolders a').removeClass('active');
				$(this).addClass('active');			
				$('.fm-move-dialog-body').jScrollPane({showArrows:true, arrowSize:5,animateScroll: true});
				jScrollFade('.fm-move-dialog-body');
				$('.move-dialog .move-button').addClass('active');
				$('.move-dialog .fm-tree-header').removeClass('active');
				$('.move-dialog #topheader').addClass('active');
			});
			
			$('.move-dialog .fm-tree-header').unbind('click');
			$('.move-dialog .fm-tree-header').bind('click',function(e,ui)
			{
				var c = $(this).attr('class');
				var doScroll=false;
				if (c && c.indexOf('contacts') > -1 && $.mctype == 'copy-cloud') 
				{
					$.mctype = 'copy-contacts';
					mcDialog();
					doScroll=true;
				}
				else if (c && c.indexOf('cloud-drive') > -1 && $.mctype == 'copy-contacts') 
				{
					$.mctype = 'copy-cloud';
					mcDialog();
					doScroll=true;
				}				
				if (doScroll)
				{
					var jsp = $('.fm-move-dialog-body').data('jsp');
					if (jsp) jsp.scrollTo(0,0);
					return false;
				}
				if (c && c.indexOf('cloud-drive') > -1) $.mcselected = M.RootID;
				else if (c && c.indexOf('recycle-item') > -1) $.mcselected = M.RubbishID;				
				$('.move-dialog .fm-move-dialog-body .fm-subfolders a').removeClass('active');
				$('.move-dialog .fm-tree-header').removeClass('active');
				$(this).addClass('active');
				if (!c || (c && c.indexOf('contacts') == -1)) $('.move-dialog .move-button').addClass('active');			
			});
			$('.fm-move-dialog-body .fm-connector').removeClass('vertical-line last mid');
			$('.fm-move-dialog-body .fm-horizontal-connector').removeClass('active');
		};				
		$.mctreeUI();
		$('.move-dialog .move-button').addClass('active');
		$('.move-dialog').removeClass('hidden');
		$('.fm-dialog-overlay').removeClass('hidden');
		$('.fm-move-dialog-body').jScrollPane({showArrows:true, arrowSize:5,animateScroll: true});		
		jScrollFade('.fm-move-dialog-body');
		$('.move-dialog .fm-dialog-close').unbind('click');
		$('.move-dialog .fm-dialog-close').bind('click',function()  
		{
			mcDialog(1);
		});	
		$('.move-dialog .cancel-button').unbind('click');
		$('.move-dialog .cancel-button').bind('click',function()  
		{
			mcDialog(1);			
		});		
		$('.move-dialog .move-button').unbind('click');
		$('.move-dialog .move-button').bind('click',function()  
		{
			var t = $.mcselected;			
			if ($.mctype == 'move')
			{			
				var n=[];
				for (var i in $.selected) if (!isCircular($.selected[i],t)) n.push($.selected[i]);
				M.moveNodes(n,t);
			}
			else if ($.mctype.substr(0,4) == 'copy')
			{
				if ($.mctype == 'copy-contacts' && t.length == '8')
				{
					if (RightsbyID(t) == 0) 
					{
						alert(l[1023]);
						return false;
					}
				}
				var n=[];
				for (var i in $.selected) if (!isCircular($.selected[i],t)) n.push($.selected[i]);
				M.copyNodes(n,t);
			}
			mcDialog(1);
		});
	}
}


function getclipboardlinks()
{
	var l='';
	for (var i in M.links)
	{
		var n = M.d[M.links[i]];
		var key,s;
		if (n.t)
		{
			key = u_sharekeys[n.h];
			s='';
		}
		else
		{
			key = n.key;
			s = htmlentities(bytesToSize(n.s));
		}
		if (n && n.ph)
		{
			var F='';
			if (n.t) F='F';			
			if (i > 0) l += '\n';
			l += 'https://mega.co.nz/#'+F+'!' + htmlentities(n.ph);
			if ($('#export-checkbox').is(':checked')) l += '!' + a32_to_base64(key);			
		}
	}
	return l;
}

function getclipboardkeys()
{
	var l='';
	for (var i in M.links)
	{
		var n = M.d[M.links[i]];
		var key;
		if (n.t) key = u_sharekeys[n.h];
		else key = n.key;						
		l += a32_to_base64(key) + '\n';			
	}
	return l;
}


function linksDialog(close)
{
	var jsp = $('.export-link-body').data('jsp');
	if (jsp) jsp.destroy();	
	if (close)
	{	
		$.dialog=false;		
		$('.fm-dialog-overlay').addClass('hidden');
		$('.fm-dialog.export-links-dialog').addClass('hidden');
		$('.export-links-warning').addClass('hidden');
		return true;	
	}
	$.dialog = 'links';
	var html = '';	
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
			s = htmlentities(bytesToSize(n.s));
		}
		
		if (n && n.ph)
		{
			html += '<div class="export-link-item"><img alt="" src="' + fileicon(n,'m') + '" /><div class="export-link-text-pad"><div class="export-link-txt">' + htmlentities(n.name) + ' <span class="export-link-gray-txt"> ' + s + '</span></div><div class="export-link-txt">https://mega.co.nz/#'+F+'!' + htmlentities(n.ph) + '<span class="export-link-gray-txt file-key">!' + a32_to_base64(key) + '</span></div></div></div>';
		}	
	}
	$('.export-links-warning-close').unbind('click');
    $('.export-links-warning-close').bind('click',function()  
	{
		$('.export-links-warning').addClass('hidden');
	});
	$('#export-checkbox').unbind('click');
    $('#export-checkbox').bind('click',function()  
	{
		if ($(this).attr('class').indexOf('checkboxOn') == -1)
		{
			$(this).closest('.fm-dialog').addClass('file-keys-view');
			$(this).attr('class', 'checkboxOn');
			$(this).parent().attr('class', 'checkboxOn');
			$(this).attr('checked', true);
		}
		else
		{
			$(this).closest('.fm-dialog').removeClass('file-keys-view');
			$(this).attr('class', 'checkboxOff');
			$(this).parent().attr('class', 'checkboxOff');
			$(this).attr('checked', false);
		}
	});
	$('.export-links-dialog .fm-dialog-close').unbind('click');
    $('.export-links-dialog .fm-dialog-close').bind('click',function()  
	{
		linksDialog(1);
	});	
	

	if (document.location.href.substr(0,19) == 'chrome-extension://' || is_chrome_firefox)
	{
		if (!is_chrome_firefox) 
		{			
			$('.fm-dialog-chrome-clipboard').removeClass('hidden');
			$( "#chromeclipboard" ).fadeTo( 1,0.01 );
		}
		// chrome & firefox extension:
		$("#clipboardbtn1").unbind('click');
		$("#clipboardbtn1").bind('click',function() 
		{
			if (is_chrome_firefox) mozSetClipboard(getclipboardlinks());
			else
			{
				$('#chromeclipboard')[0].value=getclipboardlinks();
				$('#chromeclipboard').select();
				document.execCommand('copy');
			}
		});
		$('#clipboardbtn2').unbind('click');
		$('#clipboardbtn2').bind('click',function()
		{
			if (is_chrome_firefox) mozSetClipboard(getclipboardkeys());
			else
			{
				$('#chromeclipboard')[0].value=getclipboardkeys();
				$('#chromeclipboard').select();
				document.execCommand('copy');
			}
		});
		$('#clipboardswf1').remove();
		$('#clipboardswf2').remove();			
	}
	else
	{
		// regular browsers:
		$('#clipboardbtn1').unbind('mouseover');
		$('#clipboardbtn1').bind('mouseover',function()
		{
			$('#clipboardswf1')[0].setclipboardtext(getclipboardlinks());
		});
		$('#clipboardbtn2').unbind('mouseover');
		$('#clipboardbtn2').bind('mouseover',function()
		{			
			$('#clipboardswf2')[0].setclipboardtext(getclipboardkeys());
		});
	}
	
	$('#export-checkbox').attr('checked', true);
	$('#export-checkbox').addClass('checkboxOn').removeClass('checkboxOff');
	$('#export-checkbox').parent().addClass('checkboxOn').removeClass('checkboxOff');	
	$('.export-links-dialog').addClass('file-keys-view');
	$('.export-links-dialog .export-link-body').html(html);
	$('.fm-dialog-overlay').removeClass('hidden');
	$('.export-links-warning').removeClass('hidden');
	$('.fm-dialog.export-links-dialog').removeClass('hidden');
	$('.export-link-body').jScrollPane({showArrows:true, arrowSize:5});
	jScrollFade('.export-link-body');	
	$('.fm-dialog.export-links-dialog').css('margin-top',$('.fm-dialog.export-links-dialog').height()/2*-1);
}

function createfolderDialog(close)
{
	$.dialog = 'createfolder';	
	if (close)
	{
		$.dialog = false;
		if ($.cftarget) delete $.cftarget;
		$('.fm-dialog-overlay').addClass('hidden');
		$('.fm-dialog.create-folder-dialog').addClass('hidden');
		return true;	
	}	
	$('.create-folder-dialog input').unbind('keyup');
	$('.create-folder-dialog input').bind('keyup',function() 
	{
		if ($('.create-folder-dialog input').val() == '' || $('.create-folder-dialog input').val() == l[157]) $('.create-folder-dialog').removeClass('active');
		else $('.create-folder-dialog').addClass('active');
	});	
	$('.create-folder-dialog input').unbind('keypress');
	$('.create-folder-dialog input').bind('keypress',function(e) 
	{
		if (e.which == 13 && $(this).val() !== '') 
		{
			if (!$.cftarget) $.cftarget = M.currentdirid;
			createfolder($.cftarget,$(this).val());
			createfolderDialog(1);		
		}
	});
	$('.create-folder-dialog .fm-dialog-close').unbind('click');
	$('.create-folder-dialog .fm-dialog-close').bind('click',function()  
	{
		createfolderDialog(1);
	});	
	$('.fm-dialog-input-clear').unbind('click');
	$('.fm-dialog-input-clear').bind('click',function()  
	{
		$('.create-folder-dialog input').val('');
		$('.create-folder-dialog').removeClass('active');
	});
	
	$('.fm-dialog-new-folder-button').unbind('click');
	$('.fm-dialog-new-folder-button').bind('click',function()  
	{
		var v = $('.create-folder-dialog input').val();
		if (v == '' || v == l[157]) alert(l[1024]);
		else
		{
			if (!$.cftarget) $.cftarget = M.currentdirid;
			createfolder($.cftarget,v);
			createfolderDialog(1);
		}
	});
	$('.fm-dialog-overlay').removeClass('hidden');
	$('.fm-dialog.create-folder-dialog').removeClass('hidden');
	$('.create-folder-dialog').removeClass('active');
	$('.create-folder-dialog input').val('');
	$('.create-folder-dialog input').focus();
}



function addContactDialog(close)
{
	$.dialog = 'addcontact';	
	if (close)
	{
		$.dialog = false;
		if ($.cftarget) delete $.cftarget;
		$('.fm-dialog-overlay').addClass('hidden');
		$('.fm-dialog.add-contact-dialog').addClass('hidden');
		return true;	
	}
	$('.add-contact-dialog input').unbind('keyup');
	$('.add-contact-dialog input').bind('keyup',function() 
	{
		if ($('.add-contact-dialog input').val() == '' || $('.add-contact-dialog input').val() == l[157]) $('.add-contact-dialog').removeClass('active');
		else $('.add-contact-dialog').addClass('active');
	});	
	$('.add-contact-dialog input').unbind('keypress');
	$('.add-contact-dialog input').bind('keypress',function(e) 
	{
		if (e.which == 13 && $(this).val() !== '') 
		{
			if (u_type === 0) ephemeralDialog(l[997]);
			else doAddContact(e,1);
		}
	});
	$('.add-contact-dialog .fm-dialog-close').unbind('click');
	$('.add-contact-dialog .fm-dialog-close').bind('click',function()  
	{
		addContactDialog(1);
	});	
	$('.fm-dialog-input-clear').unbind('click');
	$('.fm-dialog-input-clear').bind('click',function()  
	{
		$('.add-contact-dialog input').val('');
		$('.add-contact-dialog').removeClass('active');
		$('.add-contact-dialog input').focus();
	});
	
	$('.fm-dialog-add-folder-button').unbind('click');
	$('.fm-dialog-add-folder-button').bind('click',function(e)
	{
		var v = $('.add-contact-dialog input').val();
		if (v == '' || v == l[157]) alert(l[1024]);
		else
		{			
			if (u_type === 0) ephemeralDialog(l[997]);
			else doAddContact(e,1);
		}
	});
	$('.fm-dialog-overlay').removeClass('hidden');
	$('.fm-dialog.add-contact-dialog').removeClass('hidden');
	$('.add-contact-dialog').removeClass('active');
	$('.add-contact-dialog input').val('');
	$('.add-contact-dialog input').focus();
}


function chromeDialog(close)
{	
	if (close)
	{
		$.dialog = false;
		$('.fm-dialog-overlay').addClass('hidden');
		$('.fm-dialog.chrome-dialog').addClass('hidden');
		return true;	
	}
	$('.fm-dialog-overlay').removeClass('hidden');
	$('.fm-dialog.chrome-dialog').removeClass('hidden');	
	$.dialog = 'chrome';	
	$('.chrome-dialog .browsers-button,.chrome-dialog .fm-dialog-close').unbind('click')
	$('.chrome-dialog .browsers-button,.chrome-dialog .fm-dialog-close').bind('click',function()
	{
		chromeDialog(1);
	});	
	$('#chrome-checkbox').unbind('click');
    $('#chrome-checkbox').bind('click',function()  
	{
		if ($(this).attr('class').indexOf('checkboxOn') == -1)
		{
			localStorage.chromeDialog=1;
			$(this).attr('class', 'checkboxOn');
			$(this).parent().attr('class', 'checkboxOn');
			$(this).attr('checked', true);
		}
		else
		{
			delete localStorage.chromeDialog;
			$(this).attr('class', 'checkboxOff');
			$(this).parent().attr('class', 'checkboxOff');
			$(this).attr('checked', false);
		}
	});
}


function firefoxDialog(close)
{
	if (close)
	{
		$.dialog = false;
		$('.fm-dialog-overlay').addClass('hidden');
		$('.fm-dialog.firefox-dialog').addClass('hidden');
		return true;
	}	
	if (lang !== 'en') $('.ff-extension-txt').text(l[1174]);
	$('.fm-dialog-overlay').removeClass('hidden');
	$('.fm-dialog.firefox-dialog').removeClass('hidden');	
	$.dialog = 'firefox';	
	$('.firefox-dialog .browsers-button,.firefox-dialog .fm-dialog-close,.firefox-dialog .close-button').unbind('click')
	$('.firefox-dialog .browsers-button,.firefox-dialog .fm-dialog-close,.firefox-dialog .close-button').bind('click',function()
	{
		firefoxDialog(1);
	});	
	$('#firefox-checkbox').unbind('click');
    $('#firefox-checkbox').bind('click',function()  
	{
		if ($(this).attr('class').indexOf('checkboxOn') == -1)
		{
			localStorage.firefoxDialog=1;
			$(this).attr('class', 'checkboxOn');
			$(this).parent().attr('class', 'checkboxOn');
			$(this).attr('checked', true);
		}
		else
		{
			delete localStorage.firefoxDialog;
			$(this).attr('class', 'checkboxOff');
			$(this).parent().attr('class', 'checkboxOff');
			$(this).attr('checked', false);
		}
	});
}


function browserDialog(close)
{
	if ('-ms-scroll-limit' in document.documentElement.style && '-ms-ime-align' in document.documentElement.style) return false;
	if (close)
	{
		$.dialog = false;
		$('.fm-dialog-overlay').addClass('hidden');
		$('.fm-dialog.browsers-dialog').addClass('hidden');
		return true;	
	}
	$.browserDialog=1;
	$.dialog = 'browser';
	$('.fm-dialog-overlay').removeClass('hidden');
	$('.fm-dialog.browsers-dialog').removeClass('hidden');	
	$('.browsers-dialog .browsers-button,.browsers-dialog .fm-dialog-close').unbind('click')
	$('.browsers-dialog .browsers-button,.browsers-dialog .fm-dialog-close').bind('click',function()
	{
		browserDialog(1);
	});
	$('#browsers-checkbox').unbind('click');
    $('#browsers-checkbox').bind('click',function()  
	{
		if ($(this).attr('class').indexOf('checkboxOn') == -1)
		{
			localStorage.browserDialog=1;
			$(this).attr('class', 'checkboxOn');
			$(this).parent().attr('class', 'checkboxOn');
			$(this).attr('checked', true);
		}
		else
		{
			delete localStorage.chromeDialog;
			$(this).attr('class', 'checkboxOff');
			$(this).parent().attr('class', 'checkboxOff');
			$(this).attr('checked', false);
		}
	});	
	$('.browsers-top-icon').removeClass('ie9 ie10 safari');
	var bc,bh,bt;
	if (navigator.userAgent.indexOf('MSIE 10') > -1)
	{	
		bc = 'ie10';
		bh = l[884].replace('[X]','Internet Explorer 10');
		bt = l[886];
	}
	else if ((navigator.userAgent.indexOf('Safari') > -1) && (navigator.userAgent.indexOf('Chrome') == -1))
	{		
		bc = 'safari';
		bh = l[884].replace('[X]','Safari');
		bt = l[887].replace('[X]','Safari');
	}
	else
	{
		bc = 'safari';
		bh = l[884].replace('[X]',l[885]);
		bt = l[887].replace('[X]','Your browser');
	}
	$('.browsers-top-icon').addClass(bc);	
	$('.browsers-info-block p').text(bt);
	$('.browsers-info-header').text(bh);	
	$('.browsers-info-header').text(bh);
	$('.browsers-info-header p').text(bt);
}


function propertiesDialog(close)
{
	if (close)
	{
		$.dialog = false;
		$('.fm-dialog-overlay').addClass('hidden');
		$('.fm-dialog.properties-dialog').addClass('hidden');
		return true;	
	}
	$.dialog = 'properties';	
	$('.fm-dialog-overlay').removeClass('hidden');
	$('.fm-dialog.properties-dialog').removeClass('hidden');	
	$('.fm-dialog.properties-dialog .fm-dialog-close,.fm-dialog.properties-dialog .close-button').unbind('click');
	$('.fm-dialog.properties-dialog .fm-dialog-close,.fm-dialog.properties-dialog .close-button').bind('click',function()
	{
		propertiesDialog(1);
	});
	$('.fm-dialog.properties-dialog .properties-shared-block').hide();
	$('.fm-dialog.properties-dialog .properties-link-block').hide();	
	$('.fm-dialog.properties-dialog #keyoption').hide();	
	var filecnt=0, foldercnt=0, size=0,sfilecnt=0,sfoldercnt=0;	
	for (var i in $.selected)
	{
		var n = M.d[$.selected[i]];
		if (n.t)
		{
			var nodes = fm_getnodes(n.h);			
			for (var i in nodes)
			{
				if (M.d[nodes[i]] && !M.d[nodes[i]].t)
				{
					size += M.d[nodes[i]].s;
					sfilecnt++;
				}
				else sfoldercnt++;
			}
			foldercnt++;
		}
		else
		{	
			filecnt++
			size+= n.s;
		}
	}	
	var p = {};
	if ((filecnt + foldercnt) == 1)
	{
		$('.fm-dialog.properties-dialog').removeClass('multiple');
		if (filecnt) 
		{
			p.t3 = l[87] + ':';
			p.t5 = ' second';		
		}
		else
		{
			p.t3 = l[894] + ':';
			p.t5 = '';
		}
		p.t1 = l[86] + ':';
		p.t2 = htmlentities(n.name);		
		p.t4 = bytesToSize(size);		
		if (foldercnt)
		{
			p.t6 = l[897] + ':';		
			p.t7 = fm_contains(sfilecnt,sfoldercnt);		
		}
		else
		{
			p.t6='';
			p.t7='';
		}
		
		p.t8 = l[896] + ':';
		p.t9 = htmlentities(time2date(n.ts));
	}
	else
	{
		$('.fm-dialog.properties-dialog').addClass('multiple');
		p.t1 = '';
		p.t2 = '<b>' + fm_contains(filecnt+sfilecnt,foldercnt+sfoldercnt) + '</b>';
		p.t3 = l[894] + ':';
		p.t4 = bytesToSize(size);
		p.t5 = ' second';
		p.t8 = l[93] + ':';
		p.t9 = l[1025];
	}
	var html = '<div class="properties-small-gray">' + p.t1 + '</div><div class="propreties-dark-txt">'+ p.t2 + '</div><div class="properties-float-bl"><span class="properties-small-gray">'+ p.t3 +'</span><span class="propreties-dark-txt">' + p.t4 + '</span></div><div class="properties-float-bl'+p.t5+'"><span class="properties-small-gray">' + p.t6 + '</span><span class="propreties-dark-txt">' + p.t7 + '</span></div><div class="properties-small-gray">' + p.t8 + '</div><div class="propreties-dark-txt">' + p.t9 +'</div>';	
	$('.properties-txt-pad').html(html);	
	if ((filecnt + foldercnt) == 1) $('.properties-file-icon').html('<img alt="" src="'+ fileicon(n,'l') + '">');
	else
	{		
		var a = 0,done = {};
		$('.properties-file-icon').html('');
		for (var i in $.selected)
		{
			var ico = fileicon(M.d[$.selected[i]],'l');
			if (a < 3 && !done[ico])
			{
				done[ico]=1;
				$('.properties-file-icon').prepend('<img alt="" src="'+ ico + '">');			
				a++;
			}
		}	
	}	
	$('.on_off :checkbox').iphoneStyle({checkedLabel:l[1021],uncheckedLabel:l[1022],resizeContainer: false, resizeHandle: false, onChange: function(elem, data) 
	{
		if(data) $(elem).closest('.on_off').addClass('active');
		else $(elem).closest('.on_off').removeClass('active');			
	}});
	$('input[name=properties-checkbox]').unbind('click');
	$('input[name=properties-checkbox]').bind('click',function()
	{
		if ($(this).attr('class').indexOf('checkboxOn') == -1)
		{
			$('.properties-file-lnk-pad').addClass('show-key');
			$(this).attr('class', 'checkboxOn');
			$(this).parent().attr('class', 'checkboxOn');
			$(this).attr('checked', true);
		} else {
			$('.properties-file-lnk-pad').removeClass('show-key');
			$(this).attr('class', 'checkboxOff');
			$(this).parent().attr('class', 'checkboxOff');
			$(this).attr('checked', false);
		}
	});
}

function paypalDialog(url,close)
{
	if (close)
	{
		$('.fm-dialog.paypal-dialog').addClass('hidden');
		$('.fm-dialog-overlay').addClass('hidden');
		$.dialog=false;
		return false;	
	}
	$.dialog='paypal';	
	$('.fm-dialog.paypal-dialog').removeClass('hidden');
	$('.fm-dialog-overlay').removeClass('hidden');	
	$('.fm-dialog.paypal-dialog a').attr('href',url);	
	$('.paypal-dialog .fm-dialog-close').unbind('click');
	$('.paypal-dialog .fm-dialog-close').bind('click',function(e)
	{
		paypalDialog(false,1);
	});
}

function termsDialog(close,pp)
{
	if (close)
	{
		$('.fm-dialog.terms-dialog').addClass('hidden');
		$('.fm-dialog-overlay').addClass('hidden');
		if ($.termsAgree) $.termsAgree=undefined;
		if ($.termsDeny) $.termsDeny=undefined;
		$.dialog=false;
		return false;
	}
	
	if (!pp) pp = 'terms';
	
	$.dialog=pp;
	
	if (!pages[pp])
	{
		loadingDialog.show();
		silent_loading=function()
		{
			loadingDialog.hide();
			termsDialog(false,$.dialog);
		};
		jsl.push(jsl2[pp]);
		jsl_start();
		return false;
	}
	
	$('.fm-dialog.terms-dialog').removeClass('hidden');
	$('.fm-dialog-overlay').removeClass('hidden');	
	$('.fm-dialog.terms-dialog .terms-main').html(pages[pp].split('((TOP))')[1].split('((BOTTOM))')[0].replace('main-mid-pad new-bottom-pages',''));
	
	$('.terms-body').jScrollPane({showArrows:true, arrowSize:5,animateScroll: true, verticalDragMinHeight: 50});
	jScrollFade('.terms-body');
	
	$('.fm-terms-cancel').unbind('click');
	$('.fm-terms-cancel').bind('click',function(e)
	{
		if ($.termsDeny) $.termsDeny();
		termsDialog(1);
	});
		
	$('.fm-terms-agree').unbind('click');
	$('.fm-terms-agree').bind('click',function(e)
	{
		if ($.termsAgree) $.termsAgree();
		termsDialog(1);
	});
	
	$('.terms-dialog .fm-dialog-close').unbind('click');
	$('.terms-dialog .fm-dialog-close').bind('click',function(e)
	{
		if ($.termsDeny) $.termsDeny();
		termsDialog(1);
	});
}

function slingshotDialog(close)
{
	if (close)
	{
		$('.fm-dialog.slingshot-dialog').addClass('hidden');
		$('.fm-dialog-overlay').addClass('hidden');		
		$.dialog=false;
		return false;
	}	
	$('.slingshot-dialog .fm-dialog-button.fm-terms-agree,.slingshot-dialog .fm-dialog-close').unbind('click');	
	$('.slingshot-dialog .fm-dialog-button.fm-terms-agree,.slingshot-dialog .fm-dialog-close').bind('click',function(e)
	{
		slingshotDialog(1);	
	});		
	$('.fm-dialog.slingshot-dialog').removeClass('hidden');
	$('.fm-dialog-overlay').removeClass('hidden');		
	$.dialog='slingshot';
}


var thumbnails = [];
var th_requested = [];


function fm_thumbnails()
{
	var treq = {},a=0;
	if (myURL)
	{
		for (var i in M.v)
		{
			var n = M.v[i];			
			if (n.fa)
			{			
				if (!thumbnails[n.h] && !th_requested[n.h])
				{				
					treq[n.h] = 
					{
						fa: n.fa,
						k: 	n.key
					};
					th_requested.push(n.h);					
				}
				else
				{
					if ($('.file-block#' + n.h).length > 0) 
					{
						$('.file-block#' + n.h + ' img').attr('src',thumbnails[n.h]);
						$('.file-block#' + n.h + ' img').addClass('thumb');
					}
					if (($('#mobilethumb_' + n.h).length > 0) && ($('#mobilethumb_' + n.h + ' img')[0].src != thumbnails[n.h]))
					{
						$('#mobilethumb_' + n.h + ' img')[0].src = thumbnails[n.h];
						$('#mobilethumb_' + n.h).addClass('thumb');
					}
				}
			}
			a++;
		}				
		if (a > 0)
		{	
			api_getfileattr(treq,0,function(ctx,node,uint8arr)
			{
				try { var blob = new Blob([uint8arr],{ type: 'image/jpeg' });} catch(err) { }
				if (blob.size < 25) blob = new Blob([uint8arr.buffer],{ type: 'image/jpeg' });				
				thumbnails[node] = myURL.createObjectURL(blob);
				if ($('.file-block#' + node).length > 0)
				{
					$('.file-block#' + node + ' img').attr('src',thumbnails[node]);
					$('.file-block#' + node + ' img').addClass('thumb');
				}
				if ($('#mobilethumb_' + node).length > 0)
				{
					$('#mobilethumb_' + node + ' img')[0].src = thumbnails[node];
					$('#mobilethumb_' + node).addClass('image');
				}
			});
		}
	}
}


function fm_contains(filecnt,foldercnt)
{
	var containstxt = l[782];						
	if ((foldercnt > 1) && (filecnt > 1)) 			containstxt = l[828].replace('[X1]',foldercnt).replace('[X2]',filecnt);
	else if ((foldercnt > 1) && (filecnt == 1)) 	containstxt = l[829].replace('[X]',foldercnt);
	else if ((foldercnt == 1) && (filecnt > 1)) 	containstxt = l[830].replace('[X]',filecnt);
	else if ((foldercnt == 1) && (filecnt == 1)) 	containstxt = l[831];
	else if (foldercnt > 1)  						containstxt = l[832].replace('[X]',foldercnt);
	else if (filecnt > 1)  							containstxt = l[833].replace('[X]',filecnt);
	else if (foldercnt == 1)  						containstxt = l[834];
	else if (filecnt == 1)  						containstxt = l[835];
	return containstxt;
}


function clipboardcopycomplete()
{
	if (d) console.log('clipboard copied');
}

function saveprogress(id,bytesloaded,bytestotal)
{
	if (d) console.log('saveprogress',id,bytesloaded,bytestotal);
}

function savecomplete(id)
{		
	$('.fm-dialog.download-dialog').addClass('hidden');
	$('.fm-dialog-overlay').addClass('hidden');
	if (!$.dialog) 
	$('#dlswf_'+id).remove();
	M.dlcomplete(id);
}