

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
}

function initFileblocksScrolling2()
{
	$('.contact-details-view .file-block-scrolling').jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5});
	jScrollFade('.contact-details-view .file-block-scrolling');
}

function initContactsGridScrolling()
{
	var jsp = $('.grid-scrolling-table.contacts').data('jsp');
	if (jsp) jsp.destroy();
	$('.grid-scrolling-table.contacts').jScrollPane({enableKeyboardNavigation:false,showArrows:true,arrowSize:5});
	jScrollFade('.grid-scrolling-table.contacts');
}

function initContactsBlocksScrolling()
{
	if ($('.contacts-blocks-scrolling:visible').length == 0) return;
	var jsp = $('.contacts-blocks-scrolling').data('jsp');
	if (jsp) jsp.destroy();
	$('.contacts-blocks-scrolling').jScrollPane({enableKeyboardNavigation:false,showArrows:true,arrowSize:5});
	jScrollFade('.contacts-blocks-scrolling');
}

function initShareBlocksScrolling()
{
	if ($('.shared-blocks-scrolling:visible').length == 0) return;
	var jsp = $('.shared-blocks-scrolling').data('jsp');
	if (jsp) jsp.destroy();
	$('.shared-blocks-scrolling').jScrollPane({enableKeyboardNavigation:false,showArrows:true,arrowSize:5});
	jScrollFade('.shared-blocks-scrolling');
}

function initTransferScroll()
{
	$('.transfer-scrolling-table').jScrollPane({enableKeyboardNavigation:false,showArrows:true,arrowSize:5, verticalDragMinHeight:20});
	jScrollFade('.transfer-scrolling-table');
}

function initTreeScroll()
{
    /**
    if(localStorage.leftPaneWidth && $('.fm-left-panel').css('width').replace("px", "") != localStorage.leftPaneWidth)
	{
        $('.fm-left-panel').css({'width': localStorage.leftPaneWidth + "px"});
    }
    **/

	$('.fm-tree-panel').jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5,animateScroll: true});
	// $('.fm-tree-panel').unbind('jsp-scroll-y.droppable');
	// $('.fm-tree-panel').bind('jsp-scroll-y.droppable',function(event, scrollPositionY, isAtTop, isAtBottom)
	// {
		// var t =Math.random();
		// $.scroller=t;
		// setTimeout(function()
		// {
			// if (t == $.scroller) treeDroppable();
		// },100);
	// });
	jScrollFade('.fm-tree-panel');
}

var ddtreedisabled = {};
function treeDroppable()
{
	// if (d) console.time('treeDroppable');
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
	// if (d) console.timeEnd('treeDroppable');
}

function notificationsScroll()
{
	$('.new-notifications-scroll').jScrollPane({enableKeyboardNavigation:false,showArrows:true,arrowSize:5,verticalDragMinHeight:250});
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
	$('.fm-empty-trashbin,.fm-empty-contacts,.fm-empty-search,.fm-empty-cloud,.fm-empty-messages,.fm-empty-folder,.fm-empty-conversations,.fm-empty-incoming').addClass('hidden');
	$('.fm-empty-pad.fm-empty-sharef').remove();
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

var treesearch = false;

function treeredraw()
{
	if (RootbyId(M.currentdirid) == M.RootID) M.buildtree(M.d[M.RootID]);
	else if (RootbyId(M.currentdirid) == M.RubbishID) M.buildtree({h:M.RubbishID});
	else if (RootbyId(M.currentdirid) == 'shares') M.buildtree({h:'shares'});
	else if (RootbyId(M.currentdirid) == 'contacts') M.contacts();
	else if (RootbyId(M.currentdirid) == 'chat')
	{
		console.log('render the entire contact list filtered by search query into the conversations list');
	}
	treeUI();
}

function treesearchUI()
{
	$('.nw-fm-tree-header').unbind('click');
	$('.nw-fm-tree-header').bind('click', function(e)
	{
		var c = $(e.target).attr('class');
		if (c && c.indexOf('nw-fm-search-icon') > -1)
		{
			var c = $(this).attr('class');
			if (c && c.indexOf('filled-input') > -1)
			{
				$(this).removeClass('filled-input');
				return;
			}
		}
		var i = $(this).find('input');
		$(this).addClass('focused-input');
		if (i.val() == i.attr('placeholder'))
		{
			i.val('');
			i.focus();
		}
	});
	$('.nw-fm-search-icon').unbind('click');
	$('.nw-fm-search-icon').bind('click', function()
	{
		treesearch=false;
		treeredraw();
		$(this).prev().val('');
		$(this).parent().find('input').blur();
	});

	$('.nw-fm-tree-header input').unbind('keyup');
	$('.nw-fm-tree-header input').bind('keyup', function(e)
	{
		var h = $(this).parent();
		if (e.keyCode == 27)
		{
			h.removeClass('filled-input');
			$(this).val('');
			$(this).blur();
			treesearch=false;
		}
		else
		{
			h.addClass('filled-input');
			treesearch = $(this).val();
		}
		if ($(this).val()=='') h.removeClass('filled-input');
		treeredraw()
	});

	$('.nw-fm-tree-header input').unbind('blur');
	$('.nw-fm-tree-header input').bind('blur', function()
	{
		if ($(this).val() == $(this).attr('placeholder') || $(this).val()=='')
		{
			$(this).parent('.nw-fm-tree-header').removeClass('focused-input filled-input');
			$(this).val($(this).attr('placeholder'));
		}
		else $(this).parent('.nw-fm-tree-header').removeClass('focused-input');
	});

	$('.nw-tree-panel-arrows').unbind('click');
	$('.nw-tree-panel-arrows').bind('click', function()
	{
		if ($(this).attr('class').indexOf('active') == -1)
		{
			$(this).addClass('active');
			var menu = $('.nw-sorting-menu').removeClass('hidden')
				, type = treePanelType()
			switch (type) {
			case 'contacts':
				// show all the options
				menu.find('.sorting-item-divider,.sorting-menu-item').removeClass('hidden');
				break;
			default:
				// hide everything
				menu.find('.sorting-item-divider,*[data-by=name],*[data-by=status],*[data-by=last-interaction]').addClass('hidden');
			}

			$('.sorting-menu-item')
				.removeClass('active')
				.filter('*[data-by=' + $.sortTreePanel[type].by  + '],*[data-dir='+$.sortTreePanel[type].dir+']')
				.addClass('active');
			return false;
		}
		else
		{
			$(this).removeClass('active');
			$('.nw-sorting-menu').addClass('hidden');
		}
	});
	$('.sorting-menu-item').unbind('click');
	$('.sorting-menu-item').bind('click', function()
	{
		var $this = $(this);
		if ($this.attr('class').indexOf('active') == -1)
		{
			$this.parent().find('.sorting-menu-item').removeClass('active');
			$this.addClass('active');
			$('.nw-sorting-menu').addClass('hidden');
			$('.nw-tree-panel-arrows').removeClass('active');
			var data = $this.data()
				, type = treePanelType()
			if (data.dir) {
				localStorage['sort' + type + 'Dir'] = $.sortTreePanel[type].dir = data.dir;
			} else {
				localStorage['sort' + type + 'By'] = $.sortTreePanel[type].by = data.by;
			}
			switch (type) {
				case 'contacts':
					M.contacts();
					break;
				case 'shared-with-me':
					M.buildtree({h:'shares'});
					break;
				case 'cloud-drive':
					M.buildtree(M.d[M.RootID]);
					break;
				case 'rubbish-bin':
					M.buildtree({h:M.RubbishID});
					break;
			}
			treeUI(); // reattach events
		}
	});
	initializeTreePanelSorting()
}

function treePanelType()
{
	// is there an easy way of knowing it?
	return $.trim($('.nw-fm-left-icon.active').attr('class').replace(/(active|nw-fm-left-icon|ui-droppable)/g, ''))
}

function treePanelSortElements(type, elements, handlers, ifEq) {
	var settings = $.sortTreePanel[type]
		, sort	 = handlers[settings.by]
	if (!sort) return;
	elements.sort(function(a, b) {
		var d = sort(a, b)
		if (d == 0 && ifEq) return ifEq(a, b)
		return d * settings.dir
	});
}

function initializeTreePanelSorting()
{
	$.sortTreePanel = {};
	$.each(['contacts', 'conversations', 'shared-with-me', 'cloud-drive','rubbish-bin'], function(key, type) {
		$.sortTreePanel[type] = {
			by: anyOf(['name' , 'status', 'last-interaction'], localStorage['sort' + type + 'By']) || "name",
			dir: parseInt(anyOf(['-1', '1'], localStorage['sort' + type + 'Dir']) || '1')
		};
	});
}

/**
 *	Set the right drag icon to the transfer panel
 */
function tpDragCursor() {
	var h = $('.transfer-panel').height()
	if (h >= $.transferPaneResizable.options.maxHeight) {
		$('.transfer-drag-handle').css('cursor', 's-resize')
	} else if (h <= $.transferPaneResizable.options.minHeight) {
		$('.transfer-drag-handle').css('cursor', 'n-resize')
	} else {
		$('.transfer-drag-handle').css('cursor', 'ns-resize')
	}
}

function initUI()
{
	$('.fm-dialog-overlay').rebind('click', function()
	{
		closeDialog();
		$.hideContextMenu();
	});
	if (!folderlink)
	{
		$('.fm-tree-header.cloud-drive-item').text(l[164]);
		$('.fm-tree-header').not('.cloud-drive-item').show();
		$('.fm-menu-item').show();
		$('.fm-left-menu .folderlink').addClass('hidden');
		$('.fm-main').removeClass('active-folder-link');
	} else $('.fm-main').addClass('active-folder-link');

	treesearchUI();

	$.doDD = function(e,ui,a,type)
	{
		function nRevert(r)
		{
			try {
				$(ui.draggable).draggable( "option", "revert", false );
				if (r) $(ui.draggable).remove();
			} catch(e) {}
		}
		var c = $(ui.draggable.context).attr('class');
		var t, ids, dd;

		if (c && c.indexOf('nw-fm-tree-item') > -1)
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

		// Workaround a problem where we get over[1] -> over[2] -> out[1]
		if (a === 'out' && $.currentOver !== $(e.target).attr('id')) a = 'noop';

		if (type == 1)
		{
			// tree dropped:
			var c = $(e.target).attr('class');
			if (c && c.indexOf('nw-fm-left-icon') > -1)
			{
				dd = 'nw-fm-left-icon';
				if (a == 'drop')
				{
					if (c.indexOf('cloud') > -1) t = M.RootID;
					else if (c.indexOf('rubbish-bin') > -1) t = M.RubbishID;
				}
			}
			else if (c && c.indexOf('transfer-panel') > -1) dd = 'download';
			else if (c && c.indexOf('nw-fm-tree-item') > -1 && !$(e.target).visible(!0)) dd = 'download';
			else
			{
				var t = $(e.target).attr('id');
				if (t && t.indexOf('treea_') > -1) t = t.replace('treea_','');
				else if (t && t.indexOf('path_') > -1) t = t.replace('path_','');
				else if (t && t.indexOf('contact2_') > -1) t = t.replace('contact2_','');
				else if (M.currentdirid !== 'shares' || !M.d[t] || RootbyId(t) !== 'shares') t=undefined;
			}
		}
		else
		{
			// grid dropped:
			var c = $(e.target).attr('class');
			if (c && c.indexOf('folder') > -1) t = $(e.target).attr('id');
		}

		if (ids && ids.length && t)
		{
			dd = ddtype(ids,t,e.altKey);
			if (dd === 'move' && e.altKey) dd = 'copy';
		}

		if (a !== 'noop')
		{
			if ($.liTimerK) clearTimeout($.liTimerK);
			$('body').removeClassWith('dndc-');
			$('.hide-settings-icon').removeClass('hide-settings-icon');
		}
		if (a == 'drop' || a == 'out' || a == 'noop')
		{
			$(e.target).removeClass('dragover');
			// if (a !== 'noop') $('.dragger-block').addClass('drag');
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
					else if ($(e.target).hasClass('nw-conversations-item')) $(e.target).click();
				}
			},890);

			if (dd == 'move') $('body').addClass('dndc-move');
			else if (dd == 'copy') $('body').addClass('dndc-copy');
			else if (dd == 'download') $('body').addClass('dndc-download');
			else if (dd === 'nw-fm-left-icon')
			{
				var c = '' + $(e.target).attr('class');

				if (~c.indexOf('rubbish-bin')) $('body').addClass('dndc-to-rubbish');
				else if (~c.indexOf('shared-with-me')) $('body').addClass('dndc-to-shared');
				else if (~c.indexOf('contacts')) $('body').addClass('dndc-to-contacts');
				else if (~c.indexOf('conversations')) $('body').addClass('dndc-to-conversations');
				else if (~c.indexOf('cloud-drive')) $('body').addClass('dndc-to-conversations'); // XXX: cursor, please?
				else c = null;

				if (c)
				{
					if ($.liTooltipTimer) clearTimeout($.liTooltipTimer);
					$.liTimerK = setTimeout(function() { $(e.target).click() }, 920);
				}
			}
			// else $('.dragger-block').addClass('drag');
			else $('body').addClass('dndc-warning');

			$(e.target).addClass('dragover');
			$($.selectddUIgrid + ' ' + $.selectddUIitem).removeClass('ui-selected');
			if ($(e.target).hasClass('folder'))
			{
				$(e.target).addClass('ui-selected').find('.file-settings-icon, .grid-url-arrow').addClass('hide-settings-icon');
			}
		}
		// if (d) console.log('!a:'+a, dd, $(e.target).attr('id'), (M.d[$(e.target).attr('id').split('_').pop()]||{}).name, $(e.target).attr('class'), $(ui.draggable.context).attr('class'));

		if (a == 'drop' && dd)
		{
			if (dd === 'nw-fm-left-icon')
			{
				// do nothing
			}
			else if ($(e.target).hasClass('nw-conversations-item'))
			{
				nRevert();

				// drop over a chat window
				var currentRoom = megaChat.getCurrentRoom();
				assert(currentRoom, 'Current room missing - this drop action should be impossible.');
				currentRoom.attachNodes(ids);

				if (d) console.error('TODO: dragging to the chat', currentRoom);
			}
			else if (dd == 'move')
			{
				nRevert(1);
				$.moveids=ids;
				$.movet=t;
				setTimeout(function()
				{
					M.moveNodes($.moveids,$.movet);
				},50);
			}
			else if (dd == 'copy' || dd == 'copydel')
			{
				nRevert();
				$.copyids=ids;
				$.copyt=t;
				setTimeout(function()
				{
					M.copyNodes($.copyids,$.copyt,dd == 'copydel',function()
					{
						// Update files count...
						if (M.currentdirid === 'shares' && !M.viewmode)
						{
							M.openFolder('shares',1);
						}
					});
				},50);
			}
			else if (dd === 'download')
			{
				nRevert();
				var as_zip = e.altKey;
				M.addDownload(ids, as_zip);
			}
			$('.dragger-block').hide();
		}
	};
	InitFileDrag();
	createfolderUI();
	cSortMenuUI();
	M.buildSubmenu();
	copyDialog();
	moveDialog();
	initShareDialog();
	transferPanelUI();
	UIkeyevents();
	addContactUI();

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
		if (e && e.target)
		{
			var c = $(e.target).attr('class');
			if (!c)
			{
				c = $(e.target).parent();
				if (c) c = $(c).attr('class');
			}
			if (c && c.indexOf('dropdown') > -1 && (c.indexOf('download-item') > -1 || c.indexOf('more-item') > -1) && c.indexOf('active') > -1) return false;
		}

		$('.nw-sorting-menu').addClass('hidden')
		$('.nw-tree-panel-arrows').removeClass('active')
		$('.context-menu-item.dropdown').removeClass('active');
		$('.fm-tree-header').removeClass('dragover');
		$('.nw-fm-tree-item').removeClass('dragover');
		// Set to default
		var a = $('.context-menu.files-menu,.context-menu.download');
		a.addClass('hidden');
		var b = a.find('.context-submenu');
		b.attr('style', '');
		b.removeClass('active left-position overlap-right overlap-left mega-height');
		a.find('.disabled,.context-scrolling-block').removeClass('disabled context-scrolling-block');
		a.find('.context-menu-item.contains-submenu.opened').removeClass('opened');
	};

	$('#fmholder').unbind('click.contextmenu');
	$('#fmholder').bind('click.contextmenu', function(e)
	{
		$.hideContextMenu(e);
		if ($.hideTopMenu) $.hideTopMenu(e);
		var c = $(e.target).attr('class');
		if ($(e.target).attr('type') !== 'file' && (c && c.indexOf('upgradelink') == -1) && (c && c.indexOf('campaign-logo') == -1) && (c && c.indexOf('resellerbuy') == -1) && (c && c.indexOf('linkified') == -1)) return false;

    });

	$('.fm-back-button').unbind('click');
	$('.fm-back-button').bind('click', function(e)
	{
		if (!M.currentdirid) return;
		if (M.currentdirid == 'notifications' || M.currentdirid.substr(0,7) == 'search/' || M.currentdirid.substr(0,5) == 'chat/') window.history.back();
		else
		{
			var n = M.d[M.currentdirid];
			if ((n && n.p && M.d[n.p]) || (n && n.p == 'contacts')) M.openFolder(n.p);
		}
	});
	$('.fm-right-header.fm').removeClass('hidden');
	if (folderlink) {
		$('.fm-tree-header.cloud-drive-item span').text('');
	}
	else folderlink=0;
	/* REMOVEME
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
	});*/
	if (ul_queue.length > 0) openTransferpanel();
	if (u_type === 0 && !u_attr.terms)
	{
		$.termsAgree = function()
		{
			u_attr.terms=1;
			api_req({a:'up',terms:'Mq'});
                        // queued work is continued when user accept terms of service
			$('.transfer-pause-icon').removeClass('active');
			dlQueue.resume();
			ulQueue.resume();
			ui_paused = false;
		};
		$.termsDeny = function()
		{
			u_logout();
			document.location.reload();
		};
		termsDialog();
	}
	if (ul_queue.length > 0) openTransferpanel();
	M.avatars();

	if (typeof dl_import !== 'undefined' && dl_import) dl_fm_import();

	$('.context-menu').unbind('contextmenu');
	$('.context-menu').bind('contextmenu',function(e)
	{
		if (!localStorage.contextmenu) e.preventDefault();
	});

	$('.nw-fm-left-icon').unbind('click');
	$('.nw-fm-left-icon').bind('click',function()
	{
		treesearch=false;
		var c = $(this).attr('class');
		if (c && c.indexOf('cloud-drive') > -1) M.openFolder(M.RootID);
		else if (c && c.indexOf('shared-with-me') > -1) M.openFolder('shares');
		else if (c && c.indexOf('conversations') > -1) M.openFolder('chat');
		else if (c && c.indexOf('contacts') > -1) M.openFolder('contacts');
		else if (c && c.indexOf('rubbish-bin') > -1) M.openFolder(M.RubbishID);
	});

	$('.nw-fm-left-icon').unbind('mouseover');
	$('.nw-fm-left-icon').bind('mouseover', function () {
	  var  tooltip = $(this).find('.nw-fm-left-tooltip');
	  if ($.liTooltipTimer) clearTimeout( $.liTooltipTimer );
	  $.liTooltipTimer = window.setTimeout(
      function() {
        $(tooltip).addClass('hovered');
      }, 1000);
    });

	$('.nw-fm-left-icon').unbind('mouseout');
	$('.nw-fm-left-icon').bind('mouseout', function () {
	    $(this).find('.nw-fm-left-tooltip').removeClass('hovered');
		clearTimeout( $.liTooltipTimer );
    });

	if (dlMethod.warn && !localStorage.browserDialog && !$.browserDialog)
	{
		setTimeout(function()
		{
			browserDialog();
		},2000);
	}

    $.transferPaneResizable = new FMResizablePane($('.transfer-panel'), {
        'direction': 'n',
        'minHeight': 96,
        'maxHeight': 312,
        'persistanceKey': 'transferPaneHeight',
        'handle': '.transfer-drag-handle'
    });

    $($.transferPaneResizable).on('resize', function(e, resize_event, ui)
	{
        if($('#fmholder.transfer-panel-opened').size() == 0)
		{
            $.transferOpen(undefined, true);
            $.transferHeader();
        }
		tpDragCursor();
    });

    $($.transferPaneResizable).on('resizestop', function(e, resize_event, ui) {
        if($.transferPaneResizable.options.minHeight >= ui.size.height) {
            $.transferOpen();
            $.transferHeader();
        };
    });

	var lPane = $('.fm-left-panel')
    $.leftPaneResizable  = new FMResizablePane(lPane, {
        'direction': 'e',
        'minWidth': 200,
        'maxWidth': 400,
        'persistanceKey': 'leftPaneWidth',
        'handle': '.left-pane-drag-handle'
	});

    if(localStorage.leftPaneWidth) {
		lPane.width(Math.min(
			$.leftPaneResizable.options.maxWidth,
			Math.max($.leftPaneResizable.options.minWidth, localStorage.leftPaneWidth)
		));
	}

    $($.leftPaneResizable).on('resize', function() {
		var w = lPane.width()
		if (w >= $.leftPaneResizable.options.maxWidth) {
			$('.left-pane-drag-handle').css('cursor', 'w-resize')
		} else if (w <= $.leftPaneResizable.options.minWidth) {
			$('.left-pane-drag-handle').css('cursor', 'e-resize')
		} else {
			$('.left-pane-drag-handle').css('cursor', 'we-resize')
		}
		$(window).trigger('resize');
    });

	$(window).unbind('resize.fmrh hashchange.fmrh');
	$(window).bind('resize.fmrh hashchange.fmrh', fm_resize_handler);

	if (lang != 'en') $('.download-standart-item').text(l[58]);

	megaChat.karere.unbind("onPresence.maintainUI");
	megaChat.karere.bind("onPresence.maintainUI", function(e, presenceEventData)
	{
		M.onlineStatusEvent(megaChat.getContactFromJid(presenceEventData.getFromJid()),presenceEventData.getShow());
	});
}

function transferPanelContextMenu(target)
{
	$('.context-menu.files-menu .context-menu-item').hide();
	var menuitems = $('.context-menu.files-menu .context-menu-item');

	menuitems.filter('.transfer-pause,.transfer-play,.move-up,.move-down,.tranfer-clear')
		.show();

	var file = GlobalProgress[$(target).attr('id')]
	if (!file) {
		/* no file, it is a finished operation */
		menuitems.hide()
			.filter('.tranfer-clear,.refresh-item')
			.show()

	} else {
		if (file.started) {
			menuitems.filter('.move-up,.move-down').hide();
		}
		if (file.paused) {
			menuitems.filter('.transfer-pause').hide();
		} else {
			menuitems.filter('.transfer-play').hide();
		}

		if (target.prev().length == 0 || target.prev().find('.queued').length == 0) {
			menuitems.filter('.move-up').hide();
		}
		if (target.next().length == 0) {
			menuitems.filter('.move-down').hide();
		}
	}

	menuitems.parent()
		.children('.context-menu-divider').hide().end()
		.children('.pause-item-divider').show().end()
}

function openTransferpanel()
{
	$.transferOpen(1);
	if (M.currentdirid == 'notifications') notificationsScroll();
	else if (M.viewmode) initFileblocksScrolling();
	else initGridScrolling();
	if (!uldl_hold) ulQueue.resume();
	else// make sure that terms of service are accepted before any action
	{
		$('.transfer-pause-icon').addClass('active');
		dlQueue.pause();
		ulQueue.pause();
		ui_paused = true;

//		$('.transfer-table tr td:eq(4), .transfer-table tr td:eq(6)').each(function()
//		{
//			$(this).text('');
//		});
	}
	initTreeScroll();
	$(window).trigger('resize');

	if ($('table.transfer-table tr').length > 1) {
		$('.transfer-clear-all-icon').removeClass('hidden');
	}

	$('.tranfer-table .grid-url-arrow').unbind('click')
	$('.tranfer-table .grid-url-arrow').bind('click', function(e) {
		var target = $(this).closest('tr');
		e.preventDefault(); e.stopPropagation(); // do not treat it as a regular click on the file
		e.currentTarget = target;
		transferPanelContextMenu(target);
		target.parent().find('tr').removeClass('ui-selected');
		target.addClass('ui-selected')
		contextmenuUI(e);
	});

}

function doAddContact(dialog)
{
	// ToDo: comment this
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
		// Absolute we are using add-contact-dialog ToDo: replace with add-user-popup
//		if (dialog) addContactDialog(1);
	}
}

function searchFM()
{

}

function removeUInode(h)
{

	var n = M.d[h];
	var i=0;
	// check subfolders
	if (n && n.t)
    {
		var cns = M.c[n.p];
		if (cns)
		{
			for (var cn in cns)
			{
				if (M.d[cn] && M.d[cn].t && cn !== h)
				{
					i++;
					break;
				}
			}
		}
	}

    var hasItems=!!M.v.length;
    switch (M.currentdirid)
    {
		case "shares":
			$('#treeli_' + h).remove();// remove folder and subfolders
			if (!hasItems)
            {
				$('.files-grid-view .grid-table-header tr').remove();
				// ToDo: Missing empty picture for shares
				$('.fm-empty-cloud').removeClass('hidden');
			}
			break;
		case "contacts":
			//Clear left panel:
			$('#contact_' + h).fadeOut('slow', function() { $(this).remove(); });
			//Clear right panel:
			$('.grid-table.contacts tr#' + h).fadeOut('slow', function() { $(this).remove(); });
			// clear the contacts grid:
			$('.contacts-grid-view #' + h).remove();
			// TODO: remove from conversations?
			if (!hasItems)
			{
				$('.contacts-grid-view .contacts-grid-header tr').remove();
				$('.fm-empty-contacts').removeClass('hidden');
			}
			break;
		case "chat":
			if (!hasItems)
			{
				// ToDo: Missing grid header for conversation
				$('.contacts-grid-view .contacts-grid-header tr').remove();
				$('.fm-empty-chat').removeClass('hidden');
			}
			break;
		case M.RubbishID:
			if (i == 0) $('#treea_'+n.p).removeClass('contains-folders expanded');
			$('#' + h).remove();// remove item
			$('#treeli_' + h).remove();// remove folder and subfolders
			if (!hasItems)
			{
				$('.contacts-grid-view .contacts-grid-header tr').remove();
				$('.fm-empty-trashbin').removeClass('hidden');
			}
			break;
		case M.RootID:
			if (i == 0) $('#treea_'+n.p).removeClass('contains-folders expanded');
			$('#' + h).remove();// remove item
			$('#treeli_' + h).remove();// remove folder and subfolders
			if (!hasItems)
			{
				$('.files-grid-view').addClass('hidden');
				$('.grid-table.fm tr').remove();
				$('.fm-empty-cloud').removeClass('hidden');
			}
			break;
		default:
			if (i == 0 && n) $('#treea_'+n.p).removeClass('contains-folders expanded');
			$('#' + h).remove();// remove item
			$('#treeli_' + h).remove();// remove folder and subfolders
			if (!hasItems)
			{
				if (sharedfolderUI()) M.emptySharefolderUI();
				else
				{
					$('.files-grid-view').addClass('hidden');
					$('.fm-empty-folder').removeClass('hidden');
				}
				$('.grid-table.fm tr').remove();
			}
            break;
	}
}

function sharedUInode(h,s)
{
	if (s) $('#treea_' + h + ' .nw-fm-tree-folder').addClass('shared-folder');
	else
	{
		$('#treea_' + h + ' .nw-fm-tree-folder').removeClass('shared-folder');
		$('.grid-table.fm #'+ h + ' .transfer-filtype-icon').removeClass('folder-shared');
		$('.file-block#'+ h + ' .block-view-file-type').removeClass('folder-shared');
	}
	$('.grid-table.fm #'+ h + ' .transfer-filtype-icon').addClass(fileicon({t:1,shares:s}));
	$('.file-block#'+ h + ' .block-view-file-type').addClass(fileicon({t:1,shares:s}));
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

function getContactsEMails()
{
	var contacts = [];
	var n;
	for (var i in M.u)
	{
		if (M.u[i])
		{
			n = M.u[i];
			if (n.c && n.c !== 2 && (n.m || n.name)) contacts.push({id: n.m, name: n.name});
		}
	}

	return contacts;
}

function addContactUI()
{
	if (!u_type) return; // not for ephemeral

	$.shareTokens = [];

	iconSize = function(par)
	{
		if (par)// full size icon, popup at bottom of Add contact button
		{
			$('.add-user-size-icon')
				.removeClass('short-size')
				.addClass('full-size');
		}
		else// short size icon, centered dialog
		{
			$('.add-user-size-icon')
				.removeClass('full-size')
				.addClass('short-size');
		}
	};

	function errorMsg(msg, u)
	{
		var $d = $('.add-user-popup');
		var $s = $('.add-user-popup .multiple-input-warning span');
		$s.text(msg);
		$d.addClass('error');
		setTimeout(function()
		{
			$d.removeClass('error');
		}, 3000);

		if (u) $.addUserFail.push(u);
	}

	function focusOnInput()
	{
		var $tokenInput = $('#token-input-');

		$tokenInput
//				.show()
				.val('')
				.focus();
	}
	// Plugin configuration
	var contacts = getContactsEMails();

	$('.add-contact-multiple-input').tokenInput(contacts, {
		theme:				"mega",
		hintText:			"Type in a contact email",
		searchingText:		"Searching for existing contacts...",
		addAvatar:			true,
		autocomplete:		null,
		searchDropdown:		false,
		emailCheck:			true,
		preventDoublet:		true,
		tokenValue:			"id",
		propertyToSearch:	"id",
		resultsLimit:		5,
		minChars:			2,
		accountHolder:		M.u[u_handle].m,
		scrollLocation:		'add',
		onEmailCheck: function() {errorMsg("Looks like there's a malformed email!");},
		onDoublet: function(u) {errorMsg('You already have contact with that email!', u.id);},
		onHolder: function() {errorMsg('No need for that, you are THE owner!');},
		onAdd: function()
		{
			var itemNum = $('.token-input-list-mega .token-input-token-mega').length;
			if (itemNum === 1)
			{
				$('.add-user-popup-button.add').removeClass('disabled');
				$('.add-user-popup .nw-fm-dialog-title').text('Add Contact');
			}
			else
			{
				$('.add-user-popup-button.add').removeClass('disabled');
				$('.add-user-popup .nw-fm-dialog-title').text('Add Contacts');

				var $a = $('.add-user-popup .share-added-contact.token-input-token-mega');
				var $b = $('.add-user-popup .multiple-input');
				var h1 = $a.outerHeight(true);// margin included
				var h2 = $b.height();

				if (5 <= h2/h1 && h2/h1 < 6)
				{
					$b.jScrollPane({
						enableKeyboardNavigation: false,
						showArrows: true,
						arrowSize: 8,
						animateScroll: true
					});
					setTimeout(function() {
						$('.add-user-popup .token-input-input-token-mega input').focus();
					}, 0);
				}
			}
		},
		onDelete: function()
		{
			setTimeout(function() {
				$('.add-user-popup .token-input-input-token-mega input').blur();
			}, 0);
			var itemNum = $('.token-input-list-mega .token-input-token-mega').length;
			if (itemNum === 0)
			{
				$('.add-user-popup-button.add').addClass('disabled');
				$('.add-user-popup .nw-fm-dialog-title').text('Add Contact');

			}
			else if (itemNum === 1)
			{
				$('.add-user-popup-button.add').removeClass('disabled');
				$('.add-user-popup .nw-fm-dialog-title').text('Add Contact');

			}
			else
			{
				$('.add-user-popup-button.add').removeClass('disabled');
				$('.add-user-popup .nw-fm-dialog-title').text('Add Contacts');

				var $a = $('.add-user-popup .share-added-contact.token-input-token-mega');
				var $b = $('.add-user-popup .multiple-input');
				var $c = $('.add-user-popup .multiple-input .jspPane')[0];
				var h1 = $a.outerHeight(true);// margin included
				var h2;
				if ($c) h2 = $c.scrollHeight;
				else h2 = $b.height();

				if (h2/h1 < 6)
				{
					clearScrollPanel('.add-user-popup');
				}
			}
		}
    });
	
	//TODO: Bind events if Contacts section is empty
	$('.fm-empty-contacts .fm-empty-button').unbind('mouseover');
	$('.fm-empty-contacts .fm-empty-button').bind('mouseover', function() {
		$('.fm-empty-contacts').addClass('hovered');
	});
	
	$('.fm-empty-contacts .fm-empty-button').unbind('mouseout');
	$('.fm-empty-contacts .fm-empty-button').bind('mouseout', function() {
		$('.fm-empty-contacts').removeClass('hovered');
	});
	
	$('.fm-empty-contacts .fm-empty-button').unbind('click');
	$('.fm-empty-contacts .fm-empty-button').bind('click', function(e)
	{
		$.hideContextMenu();
		$.dialog = 'add-contact-popup';
		$.sharedTokens = [];// Holds items currently visible in share folder contet (above input)
		$.addUserFail = [];
		// Just in case hide import links
		$('.add-user-popup .import-contacts-dialog').fadeOut(0);
		$('.import-contacts-link').removeClass('active');
		// Prepare multi-input and dialog
		$('.add-user-popup .multiple-input .token-input-token-mega').remove();
		$('.add-user-popup-button.add').addClass('disabled');
		$('.add-user-popup .nw-fm-dialog-title').text('Add Contact');
		$('.fm-add-user').removeClass('active');
		iconSize(false);
		focusOnInput();
		
		$('.add-user-popup')
				.addClass('dialog')
				.removeClass('hidden');
		
		$('.fm-dialog-overlay').removeClass('hidden');
		$('body').addClass('overlayed');
		
		e.stopPropagation();
	});
	
	$('.fm-add-user').unbind('click');
	$('.fm-add-user').bind('click',function()
	{
		$.hideContextMenu();
		$.dialog = 'add-contact-popup';
		var $this = $(this);
		var $d = $('.add-user-popup');
		$.sharedTokens = [];// Holds items currently visible in share folder contet (above input)
		if ($this.is('.active'))// Hide
		{
			$this.removeClass('active');
			$d.addClass('hidden');
		}
		else// Show
		{
			$.addUserFail = [];
			$('.add-user-popup .import-contacts-dialog').fadeOut(0);
			$('.import-contacts-link').removeClass('active');
			$this.addClass('active');
			$d.removeClass('hidden dialog');
			$('.add-user-popup .multiple-input .token-input-token-mega').remove();
			focusOnInput();

			$('.add-user-popup-button.add').addClass('disabled');
			$('.add-user-popup .nw-fm-dialog-title').text('Add Contact');

			var pos = $(window).width() - $this.offset().left - $d.outerWidth() + 2;
			// Positioning, not less then 8px from right side
	        if (pos > 8)
			{
				$d.css('right', pos + 'px');
			}
	        else
			{
				$d.css('right', 8 + 'px');
			}
		}

		iconSize(true);
	});

	$('.add-user-size-icon').off('click');
	$('.add-user-size-icon').on('click', function()
	{
		$('.add-user-popup .import-contacts-dialog').fadeOut(0);
		$('.import-contacts-link').removeClass('active');
		if ($(this).is('.full-size'))
		{
			$('.add-user-popup').addClass('dialog');
			$('.fm-dialog-overlay').removeClass('hidden');
			$('body').addClass('overlayed');
			iconSize(false);
			$('.fm-add-user').removeClass('active');
			focusOnInput();
		}
		else// .short-size
		{
			$('.fm-dialog-overlay').addClass('hidden');
			$('body').removeClass('overlayed');
			$('.add-user-popup').removeClass('dialog');
			iconSize(true);
			$('.fm-add-user').addClass('active');
			focusOnInput();
		}
	});

	$('.add-user-popup-button').off('click');
	$('.add-user-popup-button').on('click', function()
	{
		var $this = $(this), nobody = true;
		if ($this.is('.add') && !$this.is('.disabled'))// Add
		{
			if (u_type === 0) ephemeralDialog(l[997]);
			else
			{
				var $mails = $('.token-input-list-mega .token-input-token-mega');
				if ($mails.length)
				{
					// TODO: send array of email addreses to server at once?
					$mails.each(function(index, value)
					{
						M.addContact($(value).contents().eq(1).text());
					});
					nobody = false;
				}
			}
		}

		if (nobody && $.addUserFail.length)
		{
			msgDialog('info',l[150],l[151].replace('[X]','already'));
		}

		$('.add-user-popup .import-contacts-dialog').fadeOut(0);
		$('.import-contacts-link').removeClass('active');
		$('.fm-dialog-overlay').addClass('hidden');
		$('body').removeClass('overlayed');
		$('.add-user-popup').addClass('hidden');
		$('.fm-add-user').removeClass('active');
		clearScrollPanel('.add-user-popup');
	});

	$('.add-user-popup .fm-dialog-close').off('click');
	$('.add-user-popup .fm-dialog-close').on('click', function() {
		$('.fm-dialog-overlay').addClass('hidden');
		$('body').removeClass('overlayed');
		$('.add-user-popup').addClass('hidden');
		$('.fm-add-user').removeClass('active');
		clearScrollPanel('.add-user-popup');
	});

	$('.add-user-popup .import-contacts-service').unbind('click');
	$('.add-user-popup .import-contacts-service').bind('click', function()
	{
		// NOT imported
		if (!$(this).is('.imported'))
		{
			importGoogleContacts('contacts');
		}
		else
		{
			var n = $('.imported-contacts-notification');
			n.css('margin-left', '-' + n.outerWidth()/2 +'px');
			n.fadeIn(200);
			$('.share-dialog .import-contacts-dialog').fadeOut(200);

		}
	});

	$('.add-user-popup .import-contacts-link').unbind('click');
	$('.add-user-popup .import-contacts-link').bind('click', function(e)
	{
		if(!$(this).is('.active'))
		{
			$('.add-user-popup .import-contacts-link').addClass('active');// Do not use this, because of doubled class
			$('.add-user-popup .import-contacts-dialog').fadeIn(200);

			$('.imported-notification-close').unbind('click');
			$('.imported-notification-close').bind('click', function()
			{
				$('.imported-contacts-notification').fadeOut(200);
			});
		}
		else
		{
			$('.add-user-popup .import-contacts-link').removeClass('active');
			$('.add-user-popup .import-contacts-dialog').fadeOut(200);
			$('.imported-contacts-notification').fadeOut(200);
		}

		e.stopPropagation();
		e.preventDefault();
	});

	$('.add-user-popup .import-contacts-info').unbind('mouseover');
	$('.add-user-popup .import-contacts-info').bind('mouseover', function()
	{
		$('.add-user-popup .import-contacts-info-txt').fadeIn(200);
	});

	$('.add-user-popup .import-contacts-info').unbind('mouseout');
	$('.add-user-popup .import-contacts-info').bind('mouseout', function()
	{
		$('.add-user-popup .import-contacts-info-txt').fadeOut(200);
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
	var filecnt=0,foldercnt=0,contactcnt=0,removesharecnt=0;
	for (var i in $.selected)
	{
		var n = M.d[$.selected[i]];
		if (n && n.p.length == 11) removesharecnt++;
		else if ($.selected[i].length == 11) contactcnt++;
		else if (M.d[$.selected[i]].t) foldercnt++;
		else filecnt++;
	}

	if (removesharecnt)
	{
		for(var i in $.selected)
		{
			M.delNode($.selected[i]);
			api_req({a:'d',n:$.selected[i],i:requesti});
			delete u_sharekeys[$.selected[i]];
		}
		M.openFolder('shares', true);
	}
	else if (contactcnt)
	{
		var t, c = $.selected.length;
		// TODO: Need translation "delete N (users)"
		if(c>1) t = c + ' users';
		else t = '<strong>'+ M.d[$.selected[0]].name + '</strong>';

		msgDialog('delete-contact',l[1001],l[1002].replace('[X]',t),false,function(e)
		{
			if (e)
			{
				for(var i in $.selected)
				{
					if (M.c[$.selected[i]])
					{
						for (var sharenode in M.c[$.selected[i]])
						{
							console.log(sharenode);
							M.delNode(sharenode);
							api_req({a:'d',n:sharenode,i:requesti});
							delete u_sharekeys[sharenode];
						}
					}
					M.delNode($.selected[i]);
					api_req({a:'ur',u:$.selected[i],l:'0',i: requesti});
					$('.share-multiple-input').tokenInput("remove_contact", {id: M.u[$.selected[i]].m});
				}
			}
		});
		if(c>1) {
			$('#msgDialog').addClass('multiple');
			$('.fm-del-contacts-number').text($.selected.length);
			$('#msgDialog .fm-del-contact-avatar').attr('class', 'fm-del-contact-avatar');
			$('#msgDialog .fm-del-contact-avatar span').empty()
		} else {
			var user = M.d[$.selected[0]];
			var avatar = user.name.substr(0,2),
				av_color = user.name.charCodeAt(0)%6 + user.name.charCodeAt(1)%6;
			if (avatars[user.h]) avatar = '<img src="' + avatars[user.h].url + '">';
			$('#msgDialog .fm-del-contact-avatar').attr('class', 'fm-del-contact-avatar two-letters ' + htmlentities(user.h) + ' color' + av_color)
			$('#msgDialog .fm-del-contact-avatar span').html(avatar)
		}

	}
	else if (RootbyId($.selected[0]) == M.RubbishID)
	{
		msgDialog('clear-bin',l[1003],l[76].replace('[X]',(filecnt+foldercnt)) + ' ' + l[77],l[1007],function(e)
		{
			if (e) M.clearRubbish(1);
		});
		$('.fm-dialog-button.notification-button').each(function(i,e) { if ($(e).text() == l[1018]) $(e).text(l[83]);});
	}
	else if (RootbyId($.selected[0]) == 'contacts')
	{
		if (localStorage.skipDelWarning) M.copyNodes($.selected,M.RubbishID,1);
		else
		{
			msgDialog('confirmation',l[1003],l[1004].replace('[X]',fm_contains(filecnt,foldercnt)),false,function(e)
			{
				if (e)
				{
					M.copyNodes($.selected,M.RubbishID,1);
				}
			},true);
		}
	}
	else
	{
		if (localStorage.skipDelWarning) M.moveNodes($.selected,M.RubbishID);
		else
		{
			msgDialog('remove',l[1003],l[1004].replace('[X]',fm_contains(filecnt,foldercnt)),false,function(e)
			{
				if (e)
				{
					M.moveNodes($.selected,M.RubbishID);
				}
			},true);
		}
	}
}

function fmremdupes(test)
{
  var hs = {}, i, f = [];
  var cRootID = RootbyId(M.currentdirid);
  loadingDialog.show();
  for(i in M.d)
    {
      var n = M.d[i];
      if(n && n.hash && n.h && RootbyId(n.h) === cRootID)
        {
          if(!hs[n.hash]) hs[n.hash] = [];
          hs[n.hash].push(n.h);
        }
    }
  for(i in hs)
    {
      var h = hs[i];
      while(h.length > 1) f.push(h.pop());
    }
  for(i in f)
    {
      console.debug('Duplicate node: ' + f[i] + ' at ~/' + M.getPath(f[i]).reverse().map(function(n) { return M.d[n].name || '' }).filter(String).join("/"));
    }
  loadingDialog.hide();
  console.log('Found ' + f.length + ' duplicated files.');
  if(!test && f.length)
    {
      $.selected = f;
      fmremove();
    }
  return f.length;
}

function initContextUI()
{
	var c = '.context-menu-item';

	$(c).unbind('mouseover');
	$(c).bind('mouseover', function()
	{
		if ($(this).parent().parent().is('.context-submenu'))// is move... or download...
		{
			if (!$(this).is('.contains-submenu'))// if just item hide child context-submenu
			{
				$(this).parent().children().removeClass('active opened');
				$(this).parent().find('.context-submenu').addClass('hidden');
			}
		}
		else
		{
			if (!$(this).is('.contains-submenu'))// Hide all submenues, for download and for move...
			{
				$('.context-menu .context-submenu.active ').removeClass('active');
				$('.context-menu .contains-submenu.opened').removeClass('opened');
				$('.context-menu .context-submenu').addClass('hidden');
			}
		}
	});

	$(c+'.contains-submenu').unbind('mouseover');
	$(c+'.contains-submenu').bind('mouseover', function()
	{
		var a = $(this).next();// context-submenu
		a.children().removeClass('active opened');
		a.find('.context-submenu').addClass('hidden');
		a.find('.opened').removeClass('opened');
		// situation when we have 2 contains-submenus in same context-submenu one neer another
		var b = $(this).closest('.context-submenu').find('.context-submenu,.contains-submenu').not($(this).next());
		if (b.length)
		{
			b.removeClass('active opened')
				.find('.context-submenu').addClass('hidden');
		}
		if ($(this).is('.move-item'))
		{
			$('.context-menu .download-item').removeClass('opened')
				.next().removeClass('active opened')
				.next().find('.context-submenu').addClass('hidden');
		}
		if ($(this).is('.download-item'))
		{
			$('.context-menu .move-item').removeClass('opened')
				.next().removeClass('active opened')
				.next().find('.context-submenu').addClass('hidden');
		}

		if (!$(this).is('.opened'))
		{
			var pos = $(this).offset();
			var c = reCalcMenuPosition($(this), pos.left, pos.top, 'submenu');
			$(this).next('.context-submenu')
				.css({'top': c.top})
				.addClass('active')
				.removeClass('hidden');

			$(this).addClass('opened');
		}
	});

	$(c + '.folder-item, ' + c + '.cloud-item').unbind('click');
	$(c + '.folder-item, ' + c + '.cloud-item').bind('click', function(e)
	{
		if (!$(this).is('.disabled'))
		{
			var t = $(this).attr('id').replace('fi_','');
			var n=[];
			for (var i in $.selected) if (!isCircular($.selected[i],t)) n.push($.selected[i]);
			$.hideContextMenu();
			M.moveNodes(n,t);
		}
	});
	// Not sure if this will work
//	$(c + '.folder-item.disabled, ' + c + '.cloud-item.disabled').off('click');

	$(c+'.download-item').unbind('click');
	$(c+'.download-item').bind('click',function(event)
	{
		var c = $(event.target).attr('class');
		if (c && c.indexOf('contains-submenu') > -1) M.addDownload($.selected);
	});

	$(c+'.download-standart-item').unbind('click');
	$(c+'.download-standart-item').bind('click',function(event)
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
		else {
            M.getlinks($.selected).done(function() {
                linksDialog();
            });
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

	$(c+'.sharing-item').unbind('click');
	$(c+'.sharing-item').bind('click',function()
	{
		if (u_type === 0) ephemeralDialog(l[1006]);
		else
		{
			$.dialog = 'share';// this is used like identifier when key with key code 27 is pressed
			$.hideContextMenu();
			$('.share-dialog').removeClass('hidden');
			$('.fm-dialog-overlay').removeClass('hidden');
			$('body').addClass('overlayed');
			handleShareDialogContent();
		}
	});

	$(c+'.advanced-item').unbind('click');
	$(c+'.advanced-item').bind('click',function()
	{
		$.moveDialog = 'move';// this is used like identifier when key with key code 27 is pressed
		$.mcselected = M.RootID;
		$('.move-dialog .dialog-move-button').addClass('active');
		$('.move-dialog').removeClass('hidden');
		handleDialogContent('cloud-drive', 'ul', true, 'move', 'Move');
		disableCircularTargets('#mctreea_');
		$('.fm-dialog-overlay').removeClass('hidden');
		$('body').addClass('overlayed');
	});

	$(c+'.copy-item').unbind('click');
	$(c+'.copy-item').bind('click',function()
	{
		$.copyDialog = 'copy';// this is used like identifier when key with key code 27 is pressed
		$.mcselected = M.RootID;
		$('.copy-dialog .dialog-copy-button').addClass('active');
		$('.copy-dialog').removeClass('hidden');
		handleDialogContent('cloud-drive', 'ul', true, 'copy', 'Paste');
		$('.fm-dialog-overlay').removeClass('hidden');
		$('body').addClass('overlayed');
	});

	$(c+'.move-item').unbind('click');
	$(c+'.move-item').bind('click',function()
	{
		$.moveDialog = 'move';// this is used like identifier when key with key code 27 is pressed
		$.mcselected = M.RootID;
		$('.move-dialog .dialog-move-button').addClass('active');
		$('.move-dialog').removeClass('hidden');
		handleDialogContent('cloud-drive', 'ul', true, 'move', 'Move');
		disableCircularTargets('#mctreea_');
		$('.fm-dialog-overlay').removeClass('hidden');
		$('body').addClass('overlayed');
	});

	$(c+'.newfolder-item').unbind('click');
	$(c+'.newfolder-item').bind('click',function(event)
	{
		createfolderDialog();
	});

	$(c+'.fileupload-item').unbind('click');
	$(c+'.fileupload-item').bind('click',function(event)
	{
		$('#fileselect3').click();
	});

	$(c+'.folderupload-item').unbind('click');
	$(c+'.folderupload-item').bind('click',function(event)
	{
		$('#fileselect4').click();
	});

	$(c+'.remove-item').unbind('click');
	$(c+'.remove-item').bind('click',function(event)
	{
		fmremove();
	});

	$(c+'.removeshare-item').unbind('click');
	$(c+'.removeshare-item').bind('click',function(event)
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

	$(c+'.preview-item').unbind('click');
	$(c+'.preview-item').bind('click',function(event)
	{
		slideshow($.selected[0]);
	});

	$(c+'.clearbin-item').unbind('click');
	$(c+'.clearbin-item').bind('click',function(event)
	{
		doClearbin();
	});

// Absolute
//	$(c+'.addcontact-item').unbind('click');
//	$(c+'.addcontact-item').bind('click',function(event)
//	{
//		addContactDialog();
//		if (d) console.log('addcontact');
//	});

	$(c+'.move-up').unbind('click');
	$(c+'.move-up').bind('click',function(event)
	{
		$('.transfer-table tr.ui-selected').not('.clone-of-header').each(function(j,el) {
			fm_tfsmove($(this).attr('id'), -1);
		});
		Soon(fmUpdateCount);
	});

	$(c+'.move-down').unbind('click');
	$(c+'.move-down').bind('click',function(event)
	{
		$('.transfer-table tr.ui-selected').not('.clone-of-header').each(function(j,el) {
			fm_tfsmove($(this).attr('id'), +1);
		});
		Soon(fmUpdateCount);
	});

	$(c+'.transfer-play').unbind('click');
	$(c+'.transfer-play').bind('click',function(event)
	{
		$('.transfer-table tr.ui-selected').not('.clone-of-header').each(function(j,el) {
			var id = $(this).attr('id')
			fm_tfsresume(id)
			$('span.transfer-type', this).removeClass('paused');
		});
	});

	$(c+'.transfer-pause').unbind('click');
	$(c+'.transfer-pause').bind('click',function(event)
	{
		$('.transfer-table tr.ui-selected').not('.clone-of-header').each(function(j,el) {
			var id = $(this).attr('id')
			fm_tfspause(id);
			$('span.transfer-type', this).addClass('paused');
		});
		$('.tranfer-download-indicator,.transfer-upload-indicator').removeClass('active');
	});

	$(c+'.refresh-item').unbind('click');
	$(c+'.refresh-item').bind('click',function(event)
	{
		stopsc();
		stopapi();
		if (typeof mDB !== 'undefined' && !pfid) mDBreload();
		else loadfm();
	});

    $(c+'.select-all').unbind('click');
	$(c+'.select-all').bind('click',function(event)
	{
        selectionManager.select_all();
	});

	$(c+'.canceltransfer-item,' + c + '.tranfer-clear').unbind('click');
	$(c+'.canceltransfer-item,' + c + '.tranfer-clear').bind('click',function(event)
	{
		var toabort = {};
		$('.transfer-table tr.ui-selected').not('.clone-of-header').each(function(j,el)
		{
			toabort[$(el).attr('id')] = 1;
			$(this).remove();
		});

		toabort = Object.keys(toabort);
		DownloadManager.abort(toabort);
		  UploadManager.abort(toabort);

		Soon(function() {
			// XXX: better way to stretch the scrollbar?
			$(window).trigger('resize');
		});
	});
}

function cSortMenuUI()
{
	$('.contacts-arrows').unbind('click');
	$('.contacts-arrows').bind('click', function(e)
	{
		var menuBlock = $('.sorting-menu');
		var bottomPosition = $('body').outerHeight()-$(menuBlock).outerHeight();
		if($(this).attr('class').indexOf('active') == -1)
		{
			menuBlock.removeClass('hidden');
			$(this).addClass('active');
			var topl=0,jsp = $('.fm-tree-panel').data('jsp');
			if (jsp) topl = jsp.getContentPositionY();
			menuBlock.css('top', $(this).position().top - topl + 95);
			menuBlock.css('left', $(this).position().left + 35);
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
		var c = $(this).attr('class');
		if (c && c.indexOf('name') > -1)
		{
			localStorage.csort = 'name';
			localStorage.csortd = 1;
		}
		else if (c && c.indexOf('shares') > -1)
		{
			localStorage.csort = 'shares';
			localStorage.csortd = -1;
		} else if (c && c.indexOf('chat-activity') > -1)
        {
			localStorage.csort = 'chat-activity';
			localStorage.csortd = -1;
		}
		M.renderContacts();
	});

	$('.contacts-sorting-type').unbind('click');
	$('.contacts-sorting-type').bind('click', function(e)
	{
		var c = $(this).attr('class');
		if (c && c.indexOf('desc') > -1) localStorage.csortd = -1;
		else localStorage.csortd = 1;
		M.renderContacts();
	});
}

function createfolderUI()
{
	$('.fm-new-folder').unbind('click');
	$('.fm-new-folder').bind('click',function(e)
	{
			var c = $('.fm-new-folder').attr('class');
			var c2 = $(e.target).attr('class');
			var c3 = $(e.target).parent().attr('class');
			var b1 = $('.fm-new-folder');
			$('.create-new-folder').removeClass('filled-input');
			var d1 = $('.create-new-folder');
			if ((!c2 || c2.indexOf('fm-new-folder') == -1) && (!c3 || c3.indexOf('fm-new-folder') == -1)) return false;
			if (c.indexOf('active') == -1)
			{
				b1.addClass('active');
				d1.removeClass('hidden');
				var w1 = $(window).width() - $(this).offset().left - d1.outerWidth() + 2;
				if(w1 > 8 ) d1.css('right', w1 + 'px');
				else d1.css('right', 8 + 'px');
				$('.create-new-folder input').focus();
			}
			else
			{
				b1.removeClass('active filled-input');
				d1.addClass('hidden');
				$('.fm-new-folder input').val(l[157]);
			}
		$.hideContextMenu();
	});
	$('.create-folder-button').unbind('click');
	$('.create-folder-button').bind('click',function(e)
	{
		docreatefolderUI(e);
		return false;
	});

	$('.create-folder-button-cancel').unbind('click');
	$('.create-folder-button-cancel').bind('click',function(e)
	{
		$('.fm-new-folder').removeClass('active');
		$('.create-new-folder').addClass('hidden');
		$('.create-new-folder').removeClass('filled-input');
		$('.create-new-folder input').val(l[157]);
	});

	$('.create-folder-size-icon.full-size').unbind('click');
	$('.create-folder-size-icon.full-size').bind('click',function(e)
	{
		var v = $('.create-new-folder input').val();
		if(v != l[157] && v != '') $('.create-folder-dialog input').val(v);
		$('.create-new-folder input').focus();
		$('.create-new-folder').removeClass('filled-input');
		$('.create-new-folder').addClass('hidden');
		$('.fm-new-folder').removeClass('active');
		createfolderDialog(0);
		$('.create-new-folder input').val(l[157]);
	});
	$('.create-folder-size-icon.short-size').unbind('click');
	$('.create-folder-size-icon.short-size').bind('click',function(e)
	{
		var v = $('.create-folder-dialog input').val();
		if(v != l[157] && v != '') {
			$('.create-new-folder input').val(v);
			$('.create-new-folder').addClass('filled-input');
		}
		$('.fm-new-folder').addClass('active');
		$('.create-new-folder').removeClass('hidden');
		createfolderDialog(1);
		$('.create-folder-dialog input').val(l[157]);
		$('.create-new-folder input').focus();
	});
	$('.create-new-folder input').unbind('keyup');
	$('.create-new-folder input').bind('keyup',function(e)
	{
	    $('.create-new-folder').addClass('filled-input');
		if ($(this).val()=='') $('.create-new-folder').removeClass('filled-input');
		if (e.which == 13) docreatefolderUI(e);
	});
	$('.create-new-folder input').unbind('focus');
	$('.create-new-folder input').bind('focus',function()
	{
		if ($(this).val() == l[157]) $(this).val('');
		$('.create-new-folder').addClass('focused');
	});
	$('.create-new-folder input').unbind('blur');
	$('.create-new-folder input').bind('blur',function()
	{
		if($('.create-new-folder input').val() == '')
		$('.create-new-folder input').val(l[157]);
		$('.create-new-folder').removeClass('focused');
	});
}

function docreatefolderUI(e)
{
	if ($('.create-folder-input-bl input').val() == '')
	{
		$('.create-folder-input-bl input').animate({backgroundColor: "#d22000"}, 150, function()
		{
			$('.create-folder-input-bl input').animate({backgroundColor: "white"}, 350, function()
			{
				$('.create-folder-input-bl input').focus();
			});
		});
	}
	else createfolder(M.currentdirid,$('.create-folder-input-bl input').val());
}

function fmtopUI()
{
	$('.fm-clearbin-button,.fm-add-user,.fm-new-folder,.fm-file-upload,.fm-folder-upload').addClass('hidden');
	$('.fm-new-folder').removeClass('filled-input')
	if (RootbyId(M.currentdirid) == M.RubbishID)
	{
		$('.fm-clearbin-button').removeClass('hidden');
		$('.fm-right-files-block').addClass('rubbish-bin');
	}
	else
	{
		$('.fm-right-files-block').removeClass('rubbish-bin');
	    if (RootbyId(M.currentdirid) == M.InboxID)
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
		    if ((is_chrome_firefox & 2) || 'webkitdirectory' in document.createElement('input')) $('.fm-folder-upload').removeClass('hidden');
		    else $('.fm-file-upload').addClass('last-button');
	    }
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
    $(window).trigger('resize');
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

			if (is_chrome_firefox)
			{
				if (!$('#acc_dls_folder').length)
				{
					$('#acc_use_ssl').before(
						$('<div id="acc_dls_folder" style="margin-top:25px">' +
							'<div class="account-bandwidth-txt">Downloads folder:</div>' +
							'<input type="button" value="Browse..." style="-moz-appearance:' +
								'button;margin-right:12px;cursor:pointer" />' +
							'</div>'));
					var fld = mozGetDownloadsFolder();
					$('#acc_dls_folder').append($('<span/>').text(fld && fld.path));
					$('#acc_dls_folder input').click(function()
					{
						var fs = mozFilePicker(0,2);
						if (fs) {
							mozSetDownloadsFolder(fs);
							$(this).next().text(fs.path);
						}
					});
				}
			}
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
		else if (id == '#fm/account/reseller' && M.account.reseller)
		{
			$('.fm-account-reseller-button').addClass('active');
			$('.fm-account-reseller').removeClass('hidden');
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
			if ($(this).attr('name') == 'account-vouchertype')
			{
				$(this).find('option').each(function(i,e)
				{
					if (val == $(e).val()) val =  $(e).text();
				});
			}
			else
			{
				if ($(this).attr('name') == 'account-country') val = isocountries[val];
				$('.fm-account-save-block').removeClass('hidden');
			}
			$(this).parent().find('.account-select-txt').text(val);
		});
		$('#account-firstname,#account-lastname').unbind('keyup');
		$('#account-firstname,#account-lastname').bind('keyup',function(e)
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
			u_attr.firstname = $('#account-firstname').val();
			u_attr.lastname = $('#account-lastname').val();
			u_attr.birthday = $('.fm-account-select.day select').val();
			u_attr.birthmonth = $('.fm-account-select.month select').val();
			u_attr.birthyear = $('.fm-account-select.year select').val();
			u_attr.country = $('.fm-account-select.country select').val();
			api_req({a:'up',firstname:base64urlencode(to8(u_attr.firstname)),lastname:base64urlencode(to8(u_attr.lastname)),birthday:base64urlencode(u_attr.birthday),birthmonth:base64urlencode(u_attr.birthmonth),birthyear:base64urlencode(u_attr.birthyear),country:base64urlencode(u_attr.country)});
			$('.fm-account-save-block').addClass('hidden');
			if (M.account.dl_maxSlots)
			{
				localStorage.dl_maxSlots = M.account.dl_maxSlots;
				dl_maxSlots = M.account.dl_maxSlots;
				dlQueue.setSize(dl_maxSlots);
			}
			if (M.account.ul_maxSlots)
			{
				localStorage.ul_maxSlots = M.account.ul_maxSlots;
				ul_maxSlots = M.account.ul_maxSlots;
				ulQueue.setSize(ul_maxSlots);
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
					if (res == EACCESS)
					{
						msgDialog('warninga',l[135],l[724],false,function()
						{
							$('#account-password').val('');
							$('#account-password').focus();
						});
					}
					else if (typeof res == 'number' && res < 0) msgDialog('warninga','Error',l[200]);
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
		$('#account-firstname').val(u_attr.firstname);
		$('#account-lastname').val(u_attr.lastname);
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
				api_req({a:'uavr',v:$('.fm-voucher-body input').val()},
				{
					callback : function(res,ctx)
					{
						loadingDialog.hide();
						$('.fm-voucher-popup').addClass('hidden');
						$('.fm-voucher-body input').val(l[487]);
						if (typeof res == 'number')
						{
							if (res == -11) msgDialog('warninga',l[135],l[714]);
							else if (res < 0) msgDialog('warninga',l[135],l[473]);
							else
							{
								if (M.account) M.account.lastupdate=0;
								accountUI();
							}
						}
					}
				});
			}
		});

		$('.vouchercreate').unbind('click');
		$('.vouchercreate').bind('click',function(e)
		{
			var vouchertype = $('.fm-account-select.vouchertype select').val();
			var voucheramount = parseInt($('#account-voucheramount').val());
			var proceed=false;
			for (var i in M.account.prices) if (M.account.prices[i][0] == vouchertype) proceed=true;
			if (!proceed)
			{
				msgDialog('warninga','Error','Please select the voucher type.');
				return false;
			}
			if (!voucheramount)
			{
				msgDialog('warninga','Error','Please enter a valid voucher amount.');
				return false;
			}
			if (vouchertype == '19.99') vouchertype = '19.991';
			loadingDialog.show();
			api_req({a:'uavi',d:vouchertype,n:voucheramount,c:'EUR'},
			{
				callback : function (res,ctx)
				{
					M.account.lastupdate=0;
					accountUI();
				}
			});
		});

		if (M.account.reseller)
		{
			$('.fm-account-reseller-button').removeClass('hidden');
			$('.account-history-dropdown-button.vouchers').text(l['466a'].replace('[X]',$.voucherlimit));
			$('.account-history-drop-items.voucher10-').text(l['466a'].replace('[X]',10));
			$('.account-history-drop-items.voucher100-').text(l['466a'].replace('[X]',100));
			$('.account-history-drop-items.voucher250-').text(l['466a'].replace('[X]',250));
			M.account.vouchers.sort(function(a,b)
			{
				if (a['date'] < b['date']) return 1;
				else return -1;
			});
			$('.grid-table.vouchers tr').remove();
			var html = '<tr><th>' + l[475] + '</th><th>' + l[487] + '</th><th>' + l[477] + '</th><th>' + l[488] + '</th></tr>';
			$(account.vouchers).each(function(i,el)
			{
				if (i > $.voucherlimit) return false;
				var status = l[489];
				if (el.redeemed > 0 && el.cancelled == 0 && el.revoked == 0) status = l[490] + ' ' + time2date(el.redeemed);
				else if (el.revoked > 0 && el.cancelled > 0) status = l[491] + ' ' + time2date(el.revoked);
				else if (el.cancelled > 0) status = l[492] + ' ' + time2date(el.cancelled);
				html += '<tr><td>' + time2date(el.date) + '</td><td class="selectable">' + htmlentities(el.code) + '</td><td>&euro; ' + htmlentities(el.amount) + '</td><td>' + status + '</td></tr>';
			});
			$('.grid-table.vouchers').html(html);
			$('.fm-account-select.vouchertype select option').remove();
			var prices = [];
			for (var i in M.account.prices) prices.push(M.account.prices[i][0]);
			prices.sort(function(a,b) { return (a-b) })
			var voucheroptions = '';
			for (var i in prices) voucheroptions += '<option value="'+ htmlentities(prices[i]) +'">&euro;' + htmlentities(prices[i]) + ' voucher</option>';
			$('.fm-account-select.vouchertype select').html(voucheroptions);
		}

		$('.fm-purchase-voucher,.membershtip-medium-txt.topup').unbind('click');
		$('.fm-purchase-voucher,.membershtip-medium-txt.topup').bind('click',function(e)
		{
			document.location.hash = 'resellers';
		});

		if (is_extension || ssl_needed()) $('#acc_use_ssl').hide();

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
			if (M.currentdirid && M.currentdirid.substr(0,7) == 'account') initAccountScroll();
		});

		initAccountScroll();
	},1);

	if (u_attr.firstname) $('.membership-big-txt.name').text(u_attr.firstname + ' ' + u_attr.lastname);
	else $('.membership-big-txt.name').text(u_attr.name);

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
		   case ($(this).attr('class').indexOf('fm-account-reseller-button') >= 0):
			   document.location.hash = 'fm/account/reseller';
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
		$('body').removeClass('overlayed');
		return true;
	}
	$.dialog='avatar';
	$('.fm-dialog.avatar-dialog').removeClass('hidden');
	$('.fm-dialog-overlay').removeClass('hidden');
	$('body').addClass('overlayed');
	$('.avatar-body').html('<div id="avatarcrop"><div class="image-upload-and-crop-container"><div class="image-explorer-container empty"><div class="image-explorer-image-view"><img class="image-explorer-source"><div class="avatar-white-bg"></div><div class="image-explorer-mask circle-mask"></div><div class="image-explorer-drag-delegate"></div></div><div class="image-explorer-scale-slider-wrapper"><input class="image-explorer-scale-slider disabled" type="range" min="0" max="100" step="1" value="0" disabled=""></div></div><div class="fm-notifications-bottom"><input type="file" id="image-upload-and-crop-upload-field" class="image-upload-field" accept="image/jpeg, image/gif, image/png"><label for="image-upload-and-crop-upload-field" class="image-upload-field-replacement fm-account-change-avatar">' + l[1016] + '</label><div class="fm-account-change-avatar" id="fm-change-avatar">' + l[1017] + '</div><div  class="fm-account-change-avatar" id="fm-cancel-avatar">Cancel</div><div class="clear"></div></div></div></div>');
	$('#fm-change-avatar').hide();
	$('#fm-cancel-avatar').hide();
	imageCrop = new ImageUploadAndCrop($("#avatarcrop").find('.image-upload-and-crop-container'),
	{
		cropButton: $('#fm-change-avatar'),
		onCrop: function(croppedDataURI)
		{
			var data = dataURLToAB(croppedDataURI);
			api_req({'a':'up','+a':base64urlencode(ab_to_str(data))});
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
	if (M.chat) return;
	if (d) console.time('gridUI');
	// $.gridDragging=false;
	$.gridLastSelected=false;
	$('.fm-files-view-icon.listing-view').addClass('active');
	$('.fm-files-view-icon.block-view').removeClass('active');

	$.gridHeader = function()
	{
		$('.grid-table tbody tr:first-child td').each(function(i,e)
		{
		  var headerColumn = $('.grid-table-header th').get(i);
		  $(headerColumn).width($(e).width());
	    });
		initTransferScroll();
	}
	$.contactgridHeader = function()
	{
		var el = $('.files-grid-view.contacts-view .grid-table-header th');
		var i=0;
		var w=0;
		while (i < el.length)
		{
			if (i !== 0) w+=$(el[i]).width();
			i++;
		}
		$('.files-grid-view.contacts-view .grid-scrolling-table tbody tr:first-child td').each(function(i,e)
		{
		  var headerColumn = $('.files-grid-view.contacts-view .grid-table-header th').get(i);
		  $(headerColumn).width($(e).width());
	    });
		initTransferScroll();
	}

	$.sharedgridHeader = function()
	{
		var el = $('.shared-grid-view .grid-table-header th');
		var i=0;
		var w=0;
		while (i < el.length)
		{
			if (i !== 0) w+=$(el[i]).width();
			i++;
		}
		$('.shared-grid-view .grid-scrolling-table tbody tr:first-child td').each(function(i,e)
		{
		  var headerColumn = $('.shared-grid-view .grid-table-header th').get(i);
		  $(headerColumn).width($(e).width());
	    });
		initTransferScroll();
	}

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
			else if (M.currentdirid == 'shares')
			{
				initGridScrolling();
				$.sharedgridHeader();
			}
			else
			{
				initGridScrolling();
				$.gridHeader();
			}
		}
    });

	$('.fm-blocks-view.fm').addClass('hidden');
	$('.fm-chat-block').addClass('hidden');
	$('.shared-blocks-view').addClass('hidden');
	$('.shared-grid-view').addClass('hidden');

	$('.files-grid-view.fm').addClass('hidden');
	$('.fm-blocks-view.contacts-view').addClass('hidden');
	$('.files-grid-view.contacts-view').addClass('hidden');
	$('.contacts-details-block').addClass('hidden');
	$('.files-grid-view.contact-details-view').addClass('hidden');
	$('.fm-blocks-view.contact-details-view').addClass('hidden');

	if (M.currentdirid == 'contacts')
	{
		$('.files-grid-view.contacts-view').removeClass('hidden');
		$.contactgridHeader();
		initContactsGridScrolling();
	}
	else if (M.currentdirid == 'shares')
	{
		$('.shared-grid-view').removeClass('hidden');
		$.sharedgridHeader();
		initGridScrolling();
	}
	else if (M.currentdirid.length == 11)
	{
		$('.contacts-details-block').removeClass('hidden');
		if (M.v.length > 0)
		{
			$('.files-grid-view.contact-details-view').removeClass('hidden');
			initGridScrolling();
			$.gridHeader();
		}
	}
	else
	{
		$('.files-grid-view.fm').removeClass('hidden');
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
		$('.grid-url-header').text('');
	}
	$('.files-grid-view,.fm-empty-cloud').unbind('contextmenu');
	$('.files-grid-view,.fm-empty-cloud').bind('contextmenu',function(e)
	{
		$('.file-block').removeClass('ui-selected');
		$.selected=[];
		$.hideTopMenu();
		return !!contextmenuUI(e,2);
	});
        // enable add star on first column click (make favorite)
	$('.grid-table.fm tr td:first-child').unbind('click');
	$('.grid-table.fm tr td:first-child').bind('click',function(e)
	{
		var id = [$(this).parent().attr('id')];
		M.favourite(id, $('.grid-table.fm #' + id[0] + ' .grid-status-icon').hasClass('star'));
	});

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
		else if (c && c.indexOf('owner') > -1) M.doSort('owner',d);
		else if (c && c.indexOf('access') > -1) M.doSort('access',d);
		else if (c && c.indexOf('status') > -1) M.doSort('status',d);
		else if (c && c.indexOf('interaction') > -1) M.doSort('interaction',d);
		if (c) M.renderMain();
	});

	if (M.currentdirid == 'shares') $.selectddUIgrid = '.shared-grid-view .grid-scrolling-table';
	else if (M.currentdirid == 'contacts') $.selectddUIgrid = '.grid-scrolling-table.contacts';
	else if (M.currentdirid.length == 11) $.selectddUIgrid = '.files-grid-view.contact-details-view .grid-scrolling-table';
	else $.selectddUIgrid = '.files-grid-view.fm .grid-scrolling-table';

	$.selectddUIitem = 'tr';
	Soon(selectddUI);

	if (d) console.timeEnd('gridUI');
}

/**
 * Helper function to get the jScrollPane container of this element
 *
 * @returns {*}
 */
$.fn.getParentJScrollPane = function() {
    var $scrollable_parent = $(this).parents('.jspScrollable:first');
    if($scrollable_parent.size() > 0) {
        var $jsp = $scrollable_parent.data('jsp');
        if($jsp) {
            return $jsp;
        } else {
            return false;
        }
    }
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
 * Case insensitive :istartswith.
 *
 * @param a
 * @param i
 * @param m
 * @returns {boolean}
 */
jQuery.expr[':'].istartswith = function(a, i, m) {
    return jQuery(a).text().toUpperCase()
        .indexOf(m[3].toUpperCase()) == 0;
};

/**
 * Really simple shortcut logic for select all, copy, paste, delete
 *
 * @constructor
 */
var FMShortcuts = function() {

    var current_operation = null;

    // unbind if already bound.
    $(window).unbind('keydown.fmshortcuts');

    // bind
    $(window).bind('keydown.fmshortcuts', function(e) {

		if (!is_fm()) return true;

        e = e || window.event;

        // DO NOT start the search in case that the user is typing something in a form field... (eg.g. contacts -> add
        // contact field)
        if($(e.target).is("input, textarea, select") || $.dialog) {
            return;
        }
        var charCode = e.which || e.keyCode; // ff
        var charTyped = String.fromCharCode(charCode).toLowerCase();

        if(charTyped == "a" && (e.ctrlKey || e.metaKey)) {
            selectionManager.select_all();
            return false; // stop prop.
        } else if(
            (charTyped == "c" || charTyped == "x") &&
            (e.ctrlKey || e.metaKey)
        ) {
            var $items = selectionManager.get_selected();
            if($items.size() == 0) {
                return; // dont do anything.
            }

            current_operation = {
                'op': charTyped == "c" ? 'copy' : 'cut',
                'src': $items
            };
            return false; // stop prop.
        } else if(charTyped == "v" && (e.ctrlKey || e.metaKey)) {
            if(!current_operation) {
                return false; // stop prop.
            }

            $.each(current_operation.src, function(k, v) {
                if(current_operation.op == "copy") {
                    M.copyNodes([$(v).attr('id')], M.currentdirid);
                } else if(current_operation.op == "cut") {
                    M.moveNodes([$(v).attr('id')], M.currentdirid);
                }
            });

            if(current_operation.op == "cut") {
                current_operation = null;
            }

            return false; // stop prop.
        } else if(charCode == 8) {
            var $items = selectionManager.get_selected();
            if($items.size() == 0) {
                return; // dont do anything.
            }

            $.selected = [];
            $items.each(function() {
                $.selected.push($(this).attr('id'));
            });

            fmremove();

            // force remove, no confirmation
            if(e.ctrlKey || e.metaKey) {
                $('#msgDialog:visible .fm-dialog-button.confirm').trigger('click');
            }

            return false;
        }

    });
}

var fmShortcuts = new FMShortcuts();

/**
 * Simple way for searching for nodes by their first letter.
 *
 * PS: This is meant to be somehow reusable.
 *
 * @param searchable_elements selector/elements a list/selector of elements which should be searched for the user
 * specified key press character
 * @param containers selector/elements a list/selector of containers to which the input field will be centered (the code
 * will dynamically detect and pick the :visible container)
 *
 * @returns {*}
 * @constructor
 */
var QuickFinder = function(searchable_elements, containers) {
    var self = this;

    var DEBUG = false;

    self._is_active = false; // defined as a prop of this. so that when in debug mode it can be easily accessed from
                             // out of this scope

    var last_key = null;
    var next_idx = 0;

    // hide on page change
    $(window).unbind('hashchange.quickfinder');
    $(window).bind('hashchange.quickfinder', function() {
        if(self.is_active()) {
            self.deactivate();
        }
    });

    // unbind if already bound.
    $(window).unbind('keypress.quickFinder');

    // bind
    $(window).bind('keypress.quickFinder', function(e) {

        e = e || window.event;
        // DO NOT start the search in case that the user is typing something in a form field... (eg.g. contacts -> add
        // contact field)
        if($(e.target).is("input, textarea, select") || $.dialog)  return;

        var charCode = e.which || e.keyCode; // ff

        if(
            (charCode >= 48 && charCode <= 57) ||
            (charCode >= 65 && charCode <= 123) ||
            charCode > 255
        ) {
            var charTyped = String.fromCharCode(charCode);

            // get the currently visible container
            var $container = $(containers).filter(":visible");
            if($container.size() == 0) {
                // no active container, this means that we are receiving events for a page, for which we should not
                // do anything....
                return;
            }

            self._is_active = true;

            $(self).trigger("activated");

            var $found = $(searchable_elements).filter(":visible:istartswith('" + charTyped + "')");

            if(
            /* repeat key press, but show start from the first element */
                (last_key != null && ($found.size() - 1) <= next_idx)
                    ||
                    /* repeat key press is not active, should reset the target idx to always select the first element */
                    (last_key == null)
                ) {
                next_idx = 0;
                last_key = null;
            } else if(last_key == charTyped) {
                next_idx++;
            } else if(last_key != charTyped) {
                next_idx = 0;
            }
            last_key = charTyped;

            $(searchable_elements).parents(".ui-selectee, .ui-draggable").removeClass('ui-selected');

            var $target_elm = $($found[next_idx]);

            $target_elm.parents(".ui-selectee, .ui-draggable").addClass("ui-selected");

            var $jsp = $target_elm.getParentJScrollPane();
            if($jsp) {
                var $scrolled_elm = $target_elm.parent("a");

                if($scrolled_elm.size() == 0) { // not in icon view, its a list view, search for a tr
                    $scrolled_elm = $target_elm.parents('tr:first');
                }
                $jsp.scrollToElement($scrolled_elm);
            }

            $(self).trigger('search');

            if($target_elm && $target_elm.size() > 0) {
                // ^^ DONT stop prop. if there are no found elements.
                return false;
            }
        }
		else if (charCode >= 33 && charCode <= 36)
		{
			var e = '.files-grid-view.fm';
			if (M.viewmode == 1) e = '.fm-blocks-view.fm';

			if ($(e + ':visible').length)
			{
				e = $('.grid-scrolling-table:visible, .file-block-scrolling:visible');
				var jsp = e.data('jsp');

				if (jsp)
				{
					switch(charCode)
					{
						case 33: /* Page Up   */  jsp.scrollByY(-e.height(),!0);  break;
						case 34: /* Page Down */  jsp.scrollByY( e.height(),!0);  break;
						case 35: /* End       */  jsp.scrollToBottom(!0);         break;
						case 36: /* Home      */  jsp.scrollToY(0,!0);            break;
					}
				}
			}
		}
    });

    // hide the search field when the user had clicked somewhere in the document
    $(document.body).delegate('> *', 'mousedown', function(e) {
        if(self.is_active()) {
            self.deactivate();
            return false;
        }
    });

    // use events as a way to communicate with this from the outside world.
    self.deactivate = function() {
        self._is_active = false;
        $(self).trigger("deactivated");
    };

    self.is_active = function() {
        return self._is_active;
    };

    self.disable_if_active = function() {
        if(self.is_active()) {
            self.deactivate();
        }
    };

    return this;
};

var quickFinder = new QuickFinder(
    '.tranfer-filetype-txt, .file-block-title, td span.contacts-username',
    '.files-grid-view, .fm-blocks-view.fm, .contacts-grid-table'
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
var SelectionManager = function($selectable) {
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
        quickFinder.disable_if_active();

        // Do .scrollIntoView if the parent or parent -> parent DOM Element is a JSP.
        {
            var $jsp = $element.getParentJScrollPane();
            if($jsp) {
                $jsp.scrollToElement($element);
            }
        }
    };

    /**
     * Simple helper func, for selecting all elements in the current view.
     */
    this.select_all = function() {
		$(window).trigger('dynlist.flush');
        var $selectable_containers = $(
            [
                ".fm-blocks-view.fm",
				".fm-blocks-view.contacts-view",
                ".files-grid-view.fm",
				".files-grid-view.contacts-view",
                ".contacts-grid-view",
                ".fm-contacts-blocks-view",
				".files-grid-view.contact-details-view"
            ].join(",")
        ).filter(":visible");

        var $selectables = $(
            [
                ".file-block",
                "tr.ui-draggable",
                "tr.ui-selectee",
                ".contact-block-view.ui-draggable"
            ].join(","),
            $selectable_containers
        ).filter(":visible");

        $selectables.addClass("ui-selected");
    };

    /**
     * Use this to get ALL (multiple!) selected items in the currently visible view/grid.
     */
    this.get_selected = function() {
        var $selectable_containers = $(
            [
                ".fm-blocks-view.fm",
                ".fm-blocks-view.contacts-view",
                ".files-grid-view.fm",
				".files-grid-view.contacts-view",
                ".contacts-grid-view",
                ".fm-contacts-blocks-view",
				".files-grid-view.contact-details-view"
            ].join(",")
        ).filter(":visible");

        var $selected = $(
            [
                ".file-block",
                "tr.ui-draggable",
                "tr.ui-selectee",
                ".contact-block-view.ui-draggable"
            ].join(","),
            $selectable_containers
        ).filter(":visible.ui-selected");

        return $selected;
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

var selectionManager;

function UIkeyevents()
{
	$(window).unbind('keydown.uikeyevents');
	$(window).bind('keydown.uikeyevents', function (e)
	{
		if (e.keyCode == 9 && !$(e.target).is("input,textarea,select")) return false;

		var sl=false,s;
		if (M.viewmode) s = $('.file-block.ui-selected');
		else s = $('.grid-table tr.ui-selected');
		selPanel = $('.transfer-panel tr.ui-selected').not('.clone-of-header')

		if (M.chat) return true;

		if (!is_fm()) return true;

        /**
         * Because of te .unbind, this can only be here... it would be better if its moved to iconUI(), but maybe some
         * other day :)
         */
        if(!$.dialog && !slideshowid && M.viewmode == 1)
		{
            var items_per_row = Math.floor($('.file-block').parent().outerWidth() / $('.file-block:first').outerWidth(true));
            var total_rows = Math.ceil($('.file-block').size() / items_per_row);

            if(e.keyCode == 37)
			{
				// left
                var current = selectionManager.get_currently_selected("first");
				// clear old selection if no shiftKey
                if(!e.shiftKey) s.removeClass("ui-selected");
                var $target_element = null;
                if(current.length > 0 && current.prev(".file-block").length > 0)  $target_element = current.prev(".file-block");
                else $target_element = $('.file-block:last');
                if($target_element)
				{
                    $target_element.addClass('ui-selected');
                    selectionManager.set_currently_selected($target_element);
                }
            }
			else if(e.keyCode == 39)
			{
				// right
                var current = selectionManager.get_currently_selected("last");
                if(!e.shiftKey) s.removeClass("ui-selected");
                var $target_element = null;
                var next = current.next(".file-block");
				// clear old selection if no shiftKey
                if(next.length > 0) $target_element = next;
                else $target_element = $('.file-block:first');
                if($target_element)
				{
                    $target_element.addClass('ui-selected');
                    selectionManager.set_currently_selected($target_element);
                }

            } else if(e.keyCode == 38 || e.keyCode == 40) { // up & down
                var current = selectionManager.get_currently_selected("first");
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
                selectionManager.set_currently_selected(
                    $target
                );

            }
        }
        if (e.keyCode == 38 && s.length > 0 && $.selectddUIgrid.indexOf('.grid-scrolling-table') > -1 && !$.dialog)
		{
			// up in grid
			if (e.shiftKey) $(e).addClass('ui-selected');
			if ($(s[0]).prev().length > 0)
			{
				if (!e.shiftKey) $('.grid-table tr').removeClass('ui-selected');
				$(s[0]).prev().addClass('ui-selected');
				sl = $(s[0]).prev();

                quickFinder.disable_if_active();
			}
		}
		else if (e.keyCode == 40 && s.length > 0 && $.selectddUIgrid.indexOf('.grid-scrolling-table') > -1 && !$.dialog)
		{
			// down in grid
			if (e.shiftKey) $(e).addClass('ui-selected');
			if ($(s[s.length-1]).next().length > 0)
			{
				if (!e.shiftKey) $('.grid-table tr').removeClass('ui-selected');
				$(s[s.length-1]).next().addClass('ui-selected');
				sl = $(s[0]).next();

                quickFinder.disable_if_active();
			}
		}
		else if (e.keyCode == 46 && s.length > 0 && !$.dialog && RightsbyID(M.currentdirid) > 1)
		{
			$.selected=[];
			s.each(function(i,e)
			{
				$.selected.push($(e).attr('id'));
			});
			fmremove();
		}
		else if (e.keyCode == 46 && selPanel.length > 0 && !$.dialog && RightsbyID(M.currentdirid) > 1)
		{
			var selected=[];
			selPanel.each(function() {
				selected.push($(this).attr('id'));
			});
			msgDialog('confirmation', l[1003], "Cancel " + selected.length + " transferences?",false,function(e)
			{
				// we should encapsule the click handler
				// to call a function rather than use this hacking
				if (e) $('.tranfer-clear').trigger('click');
			});
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
				else if ($.selected.length == 1 && M.d[$.selected[0]] && is_image(M.d[$.selected[0]])) slideshow($.selected[0]);
				else M.addDownload($.selected);
			}
		}
		else if (e.keyCode == 13 && $.dialog == 'rename')
		{
			dorename();
		}
		else if (e.keyCode == 27 && ($.copyDialog || $.moveDialog))
		{
			closeDialog();
		}
		else if (e.keyCode == 27 && $.dialog)
		{
			closeDialog();
		}
		else if (e.keyCode == 27 && $.msgDialog)
		{
			closeMsg();
			if ($.warningCallback) $.warningCallback(false);
		}
		else if ((e.keyCode == 13 && $.msgDialog == 'confirmation') && (e.keyCode == 13 && $.msgDialog == 'remove'))
		{
			closeMsg();
			if ($.warningCallback) $.warningCallback(true);
		}
		else if (e.keyCode == 65 && e.ctrlKey && !$.dialog)
		{
			$('.grid-table.fm tr').addClass('ui-selected');
			$('.file-block').addClass('ui-selected');
		}
		else if (e.keyCode == 37 && slideshowid)
		{
			slideshow_prev();
		}
		else if (e.keyCode == 39 && slideshowid)
		{
			slideshow_next();
		}
		else if (e.keyCode == 27 && slideshowid)
		{
			slideshow(slideshowid,true);
		}
		else if (e.keyCode == 27)
		{
			$.hideTopMenu();
		}

		if (sl && $.selectddUIgrid.indexOf('.grid-scrolling-table') > -1)
		{
			var jsp = $($.selectddUIgrid).data('jsp');
			jsp.scrollToElement(sl);
		}

		searchPath();
	});
}

function searchPath()
{
	if (M.currentdirid && M.currentdirid.substr(0,7) == 'search/')
	{
		var sel;
		if (M.viewmode) sel = $('.fm-blocks-view .ui-selected');
		else sel = $('.grid-table .ui-selected');
		if (sel.length == 1)
		{
			var html = '';
			var path = M.getPath($(sel[0]).attr('id'));
			path.reverse();
			for (var i in path)
			{
				var c,name,id=false,iconimg='';;
				var n = M.d[path[i]];
				if (path[i].length == 11 && M.u[path[i]])
				{
					id = path[i];
					c = 'contacts-item';
					name = M.u[path[i]].m;
				}
				else if (path[i] == M.RootID)
				{
					id = M.RootID;
					c = 'cloud-drive';
					name = l[164];
				}
				else if (path[i] == M.RubbishID)
				{
					id = M.RubbishID;
					c = 'recycle-item';
					name = l[168];
				}
				else if (path[i] == M.InboxID)
				{
					id = M.InboxID;
					c = 'inbox-item';
					name = l[166];
				}
				else if (n)
				{
					id = n.h;
					c = '';
					name = n.name;
					if (n.t) c = 'folder';
					else iconimg = '<span class="search-path-icon-span ' + fileicon(n) + '"></span>';
				}
				if (id)
				{
					html += '<div class="search-path-icon '+c+'" id="spathicon_'+htmlentities(id) + '">' + iconimg + '</div><div class="search-path-txt" id="spathname_'+htmlentities(id) + '">' + htmlentities(name) + '</div>';
					if (i < path.length-1) html += '<div class="search-path-arrow"></div>';
				}
			}
			html += '<div class="clear"></div>';
			$('.search-bottom-menu').html(html);
			$('.fm-blocks-view,.files-grid-view').addClass('search');
			$('.search-path-icon,.search-path-icon').unbind('click');
			$('.search-path-icon,.search-path-txt').bind('click',function(e)
			{
				var id = $(this).attr('id');
				if (id)
				{
					id = id.replace('spathicon_','').replace('spathname_','');
					var n = M.d[id];
					$.selected=[];
					if (!n.t)
					{
						$.selected.push(id);
						id = n.p;
					}
					if (n) M.openFolder(id);
					if ($.selected.length > 0) reselect(1);
				}
			});
		}
		else $('.fm-blocks-view,.files-grid-view').removeClass('search');
	}
	else $('.fm-blocks-view,.files-grid-view').removeClass('search');
}

function selectddUI()
{
	if (M.currentdirid && M.currentdirid.substr(0,7) == 'account') return false;
	if (d) console.time('selectddUI');
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
	if ($.gridDragging) $('body').addClass('dragging');
	$($.selectddUIgrid + ' ' + $.selectddUIitem).draggable(
	{
		start: function(e,u)
		{
			$.hideContextMenu(e);
			$.gridDragging=true;
			$('body').addClass('dragging');
			if (!$(this).hasClass('ui-selected'))
			{
				$($.selectddUIgrid + ' ' + $.selectddUIitem).removeClass('ui-selected');
				$(this).addClass('ui-selected');
			}
			var s = $($.selectddUIgrid + ' .ui-selected'), max = ($(window).height() - 96) / 24, html = [];
			$.selected=[];
			s.each(function(i,e)
			{
				var n = $(e).attr('id');
				$.selected.push(n);
				n = M.d[n];
				if (max > i) html.push('<div class="transfer-filtype-icon ' + fileicon(n) + ' tranfer-filetype-txt dragger-entry">' + str_mtrunc(htmlentities(n.name)) + '</div>');
			});
			if (s.length > max)
			{
				$('.dragger-files-number').text(s.length);
				$('.dragger-files-number').show();
			}
			$('#draghelper .dragger-content').html(html.join(""));
			$.draggerHeight = $('#draghelper .dragger-content').outerHeight();
			$.draggerWidth = $('#draghelper .dragger-content').outerWidth();
		},
		drag: function(e,ui)
		{
			if (ui.position.top + $.draggerHeight - 28 > $(window).height()) ui.position.top = $(window).height() - $.draggerHeight + 26;
			if (ui.position.left + $.draggerWidth - 58 > $(window).width()) ui.position.left = $(window).width() - $.draggerWidth + 56;
		},
		refreshPositions: true,
		containment: 'document',
		scroll: false,
		distance:10,
		revertDuration:200,
		revert: true,
		cursorAt:{right:90,bottom:56},
		helper: function(e,ui)
		{
			$(this).draggable( "option", "containment", [72,42,$(window).width(),$(window).height()] );
			return getDDhelper();
		},
		stop: function(event)
		{
			$.gridDragging=false;
			$('body').removeClass('dragging').removeClassWith("dndc-");
			setTimeout(function()
			{
				treeUIopen(M.currentdirid, false, true);
			},500);
		}
	});

	$('.ui-selectable-helper').remove();

	$($.selectddUIgrid).selectable({filter: $.selectddUIitem,start:function(e,u) { $.hideContextMenu(e); $.hideTopMenu(); }, stop: function(e,u)
	{
		searchPath();
	}});

    /**
     * (Re)Init the selectionManager, because the .selectable() is reinitialized and we need to reattach to its
     * events.
     *
     * @type {SelectionManager}
     */

    selectionManager = new SelectionManager(
        $($.selectddUIgrid)
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
		searchPath();
		$.hideTopMenu();
		return !!contextmenuUI(e,1);
	});

	$($.selectddUIgrid + ' ' + $.selectddUIitem).unbind('click');
	$($.selectddUIgrid + ' ' + $.selectddUIitem).bind('click', function (e)
	{
		if ($.gridDragging) return false;
		var s = e.shiftKey && $($.selectddUIgrid + ' .ui-selected');
		if (s && s.length > 0)
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

            selectionManager.set_currently_selected($(this));
		}
		else if (e.ctrlKey == false && e.metaKey == false)
		{
			$($.selectddUIgrid + ' ' + $.selectddUIitem).removeClass('ui-selected');
			$(this).addClass('ui-selected');
			$.gridLastSelected = this;
            selectionManager.set_currently_selected($(this));
		}
		else
		{
			if ($(this).hasClass("ui-selected"))  $(this).removeClass("ui-selected");
			else
			{
				$(this).addClass("ui-selected");
				$.gridLastSelected = this;
                selectionManager.set_currently_selected($(this));
			}
		}
		searchPath();
		$.hideContextMenu(e);
		if ($.hideTopMenu) $.hideTopMenu();
		return false;
	});

	$($.selectddUIgrid + ' ' + $.selectddUIitem).unbind('dblclick');
	$($.selectddUIgrid + ' ' + $.selectddUIitem).bind('dblclick', function (e)
	{
		var h = $(e.currentTarget).attr('id');
		var n = M.d[h] || {};
		if (n.t)
		{
			$('.top-context-menu').hide();
			M.openFolder(h);
		}
		else if (is_image(n)) slideshow(h);
		else M.addDownload([h]);
	});
	if (d) console.timeEnd('selectddUI');

	if ($.rmInitJSP)
	{
		var jsp=$($.rmInitJSP).data('jsp');
		if (jsp) jsp.reinitialise();
		if (d) console.log('jsp:!u', !!jsp);
		delete $.rmInitJSP;
	}
	$(window).trigger('resize');
}

function iconUI()
{
	if (d) console.time('iconUI');
	$('.fm-files-view-icon.block-view').addClass('active');
	$('.fm-files-view-icon.listing-view').removeClass('active');
	$('.shared-grid-view').addClass('hidden');
	$('.files-grid-view.fm').addClass('hidden');
	$('.fm-blocks-view.fm').addClass('hidden');
	$('.fm-blocks-view.contacts-view').addClass('hidden');
	$('.files-grid-view.contacts-view').addClass('hidden');
	$('.contacts-details-block').addClass('hidden');
	$('.files-grid-view.contact-details-view').addClass('hidden');
	$('.fm-blocks-view.contact-details-view').addClass('hidden');

	if (M.currentdirid == 'contacts')
	{
		$('.fm-blocks-view.contacts-view').removeClass('hidden');
		initContactsBlocksScrolling();
	}
	else if (M.currentdirid == 'shares')
	{
		$('.shared-blocks-view').removeClass('hidden');
		initShareBlocksScrolling();
	}
	else if (M.currentdirid.length == 11)
	{
		$('.contacts-details-block').removeClass('hidden');
		if (M.v.length > 0)
		{
			$('.fm-blocks-view.contact-details-view').removeClass('hidden');
			initFileblocksScrolling2();
		}
	}
	else
	{
		$('.fm-blocks-view.fm').removeClass('hidden');
		initFileblocksScrolling();
	}
	$(window).unbind('resize.icon');
	$(window).bind('resize.icon', function ()
	{
		if (M.viewmode == 1 && M.currentdirid == 'contacts') initContactsBlocksScrolling();
		else if (M.viewmode == 1 && M.currentdirid == 'shares') initShareBlocksScrolling();
        else if (M.viewmode == 1) initFileblocksScrolling();
    });

	$('.fm-blocks-view,.shared-blocks-view').unbind('contextmenu');
	$('.fm-blocks-view,.shared-blocks-view').bind('contextmenu',function(e)
	{
		$('.file-block').removeClass('ui-selected');
		selectionManager.clear(); // is this required? don't we have a support for a multi-selection context menu?
		$.selected=[];
		$.hideTopMenu();
		return !!contextmenuUI(e,2);
	});

	if (M.currentdirid == 'contacts')
	{
		$.selectddUIgrid = '.contacts-blocks-scrolling';
		$.selectddUIitem = 'a';
	}
	else if (M.currentdirid == 'shares')
	{
		$.selectddUIgrid = '.shared-blocks-scrolling';
		$.selectddUIitem = 'a';
	}
	else if (M.currentdirid.length == 11)
	{
		$.selectddUIgrid = '.contact-details-view .file-block-scrolling';
		$.selectddUIitem = 'a';
	}
	else
	{
		$.selectddUIgrid = '.file-block-scrolling';
		$.selectddUIitem = 'a';

	}
	setTimeout(selectddUI,10);
	if (d) console.timeEnd('iconUI');
}

function transferPanelUI()
{
    $.transferHeader = function()
	{
		fm_resize_handler();
                var el = $('.transfer-table-header th');
                // Get first item in transfer queue, and loop through each column
                $('.transfer-table tr:nth-child(2) td').each(function(i,e)
                {
                        var headerColumn = $(el).get(i);
                        $(headerColumn).width($(e).width());
                });

                var tth = $('.transfer-table-header');
                var toHide = (dl_queue.length || ul_queue.length);
                // Show/Hide header if there is no items in transfer list
                if (!toHide)
                {
                        $('.transfer-panel-empty-txt').removeClass('hidden');
                        tth.hide(0);
                }
                else
                {
                        $('.transfer-panel-empty-txt').addClass('hidden');
                        tth.show(0);
                }

		$('.transfer-table tr').unbind('click contextmenu');
		$('.transfer-table tr').bind('click contextmenu', function (e)
		{
			$('.ui-selected').filter(function() {
				return $(this).parents('.transfer-table').length == 0;
			}).removeClass('ui-selected');

			if (e.type == 'contextmenu')
			{
				transferPanelContextMenu($(this));
				var c = $(this).attr('class');
				if (!c || (c && c.indexOf('ui-selected') == -1)) $('.transfer-table tr').removeClass('ui-selected');
				$(this).addClass('ui-selected');
				$(this).addClass('dragover');
				return !!contextmenuUI(e);
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
					var had = $(this).hasClass('ui-selected');
					$('.transfer-table tr').removeClass('ui-selected');
					if (!had) $(this).addClass('ui-selected');
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
		initTransferScroll();
	}
	$(window).unbind('resize.transferpanel');
	$(window).bind('resize.transferpanel', function (e)
	{
         $.transferHeader();
    });

	$(window).unbind('resize.slideshow');
	$(window).bind('resize.slideshow', function (e)
	{
		if (slideshowid && previews[slideshowid]) previewsrc(previews[slideshowid].src);
    });

	$('.tranfer-view-icon,.file-transfer-icon').unbind('click');
	$('.tranfer-view-icon,.file-transfer-icon').bind('click', function (e)
	{
		$.transferOpen();
    });

	$.transferClose = function() {
		var panel = $('.transfer-panel')

		$('.transfer-drag-handle').css('cursor', 'n-resize')

        panel.animate({'height': $('.transfer-panel-title').height()}, {
			complete: function() {
				$('.tranfer-view-icon').removeClass('active');
				$('#fmholder').removeClass('transfer-panel-opened');
				$(window).trigger('resize');
			},
			progress: fm_resize_handler
		})
	}

	$.transferOpen = function(force, dont_animate)
	{
		if($('.tranfer-view-icon').attr('class').indexOf('active') == -1 || force)
		{
			$('.tranfer-view-icon').addClass('active');
			$('#fmholder').addClass('transfer-panel-opened');
			$.transferHeader();

			var height = 192
            if(localStorage.transferPaneHeight && $.transferPaneResizable) {
				height = Math.max($.transferPaneResizable.options.minHeight,localStorage.transferPaneHeight)
			}

			var panel = $('.transfer-panel')

			if (dont_animate) {
				panel.css({'height': height});
				return fm_resize_handler();
			}

			panel.animate({'height': height}, {
				complete: function() {
					tpDragCursor();
					$.transferHeader();
					$(window).trigger('resize');
				},
				progress: fm_resize_handler
			})

		}
		else
		{
			$.transferClose();
		}
		initTreeScroll();
		if (M.currentdirid == 'notifications') notificationsScroll();
		else if (M.currentdirid && M.currentdirid.substr(0,7) == 'account') initAccountScroll();
		else if (M.viewmode == 1) initFileblocksScrolling();
		else initGridScrolling();
        $(window).trigger('resize');
	};

	$('.transfer-settings-icon').unbind('click');
	$('.transfer-settings-icon').bind('click',function()
	{
		if (u_type === 0) ephemeralDialog('Transfer settings are for registered users only.');
		else document.location.hash = 'fm/account/settings';
	});
	$('.transfer-clear-all-icon').unbind('click');
	$('.transfer-clear-all-icon').bind('click', function() {
		msgDialog('confirmation','cancel all transfers','Are you sure you want to cancel all transfers?','',function(e) {
			if (!e) return;

			DownloadManager.abort(null);
			  UploadManager.abort(null);

			$('.transfer-table tr').not('.clone-of-header').fadeOut(function() {
				$(this).remove();
			});
		});
	});

	$('.transfer-pause-icon').unbind('click');
	$('.transfer-pause-icon').bind('click',function()
	{
		if ($(this).attr('class').indexOf('active') > -1)
		{
			// terms of service
			if (u_type || u_attr.terms)
			{
				$(this).removeClass('active');
				dlQueue.resume();
				ulQueue.resume();
				ui_paused = false;
				uldl_hold = false;
			} else
			{
				alert(l[214]);
				DEBUG(l[214]);
			}

			$('.tranfer-download-indicator,.tranfer-upload-indicator')
				.removeClass('active');
			$('.transfer-panel tr span.transfer-type').removeClass('paused');
		}
		else
		{
			$(this).addClass('active');
			dlQueue.pause();
			ulQueue.pause();
			ui_paused = true;
			uldl_hold = true;

			$('.transfer-panel tr span.transfer-type').addClass('paused');

			$('.tranfer-download-indicator,.tranfer-upload-indicator')
				.text('PAUSED');

			$('.transfer-table tr td:eq(3)').each(function()
			{
				$(this).text('');
			});
		}
	});
}

function getDDhelper()
{
	var id = '#fmholder';
	if (page == 'start') id = '#startholder';
	$('.dragger-block').remove();
	$(id).append('<div class="dragger-block drag" id="draghelper"><div class="dragger-content"></div><div class="dragger-files-number">1</div></div>');
	$('.dragger-block').show();
	$('.dragger-files-number').hide();
	return $('.dragger-block')[0];
}

function menuItems()
{
	var items = [];
	var sourceRoot = RootbyId($.selected[0]);
	if ($.selected.length == 1 && RightsbyID($.selected[0]) > 1) items['rename'] = 1;
	if (RightsbyID($.selected[0]) > 0)
	{
		items['add-star'] = 1;
		$.delfav=1;
		for (var i in $.selected)
		{
			var n = M.d[$.selected[i]];
			if (n && !n.fav) $.delfav=0;
		}
		if ($.delfav) $('.add-star-item').html('<span class="context-menu-icon"></span>'+l[976]);
		else $('.add-star-item').html('<span class="context-menu-icon"/></span>'+l[975]);
	}
	var n = M.d[$.selected[0]];
	if (n && n.p.length == 11) items['removeshare'] = 1;
	else if (RightsbyID($.selected[0]) > 1) items['remove'] = 1;
	if (n && $.selected.length == 1 && n.t) items['open'] = 1;
	if (n && $.selected.length == 1 && is_image(n)) items['preview'] = 1;
	if (n && sourceRoot == M.RootID && $.selected.length == 1 && n.t && !folderlink) items['sharing'] = 1;
	if (sourceRoot == M.RootID && !folderlink)
	{
		items['move'] = 1;
		items['getlink'] = 1;
	}
	else if (sourceRoot == M.RubbishID && !folderlink) items['move'] = 1;

	items['download'] = 1;
	items['zipdownload'] = 1;
	items['copy'] = 1;
	items['properties'] = 1;
	items['refresh'] = 1;

	if (folderlink)
	{
		delete items['properties'];
		delete items['copy'];
		delete items['add-star'];
	}

	return items;
}

function contextmenuUI(e,ll,topmenu)
{
	// is contextmenu disabled
	if (localStorage.contextmenu) return true;

	$.hideContextMenu();

	var m = $('.context-menu.files-menu');// container/wrapper around menu
	var t = '.context-menu.files-menu .context-menu-item';
	// it seems that ll == 2 is used when right click is occured outside item, on empty canvas
	if (ll == 2)
	{
		// Enable upload item menu for clould-drive, don't show it for rubbish and rest of crew
		if (RightsbyID(M.currentdirid) && RootbyId(M.currentdirid) !== M.RubbishID)
		{
			$(t).filter('.context-menu-item').hide();
			$(t).filter('.fileupload-item,.newfolder-item,.refresh-item').show();
			if ((is_chrome_firefox & 2) || 'webkitdirectory' in document.createElement('input')) $(t).filter('.folderupload-item').show();
		}
		else return false;
	}
	else if (ll == 3) // we want just the download menu
	{
		$(t).hide();
		// m.hide();
		var m = $('.context-menu.download');
		t = '.context-menu.download .context-menu-item';
	}
	else if (ll)// click on item
	{
		$(t).hide();// Hide all menu-items
		var c = $(e.currentTarget).attr('class');
		var id = $(e.currentTarget).attr('id');
		if (id) id = id.replace('treea_','');// if right clicked on left panel
		if (id && !M.d[id]) id = undefined;// exist in node list

		// detect and show right menu
		if (id && id.length === 11) $(t).filter('.refresh-item,.remove-item').show();// transfer panel
		else if (c && c.indexOf('cloud-drive-item') > -1)
		{
			var flt = '.refresh-item,.properties-item';
			if (folderlink) flt += ',.zipdownload-item';
			$.selected = [M.RootID];
			$(t).filter(flt).show();
		}
		else if (c && c.indexOf('recycle-item') > -1) $(t).filter('.refresh-item,.clearbin-item').show();
		else if (c && c.indexOf('contacts-item') > -1) $(t).filter('.refresh-item,.addcontact-item').show();
		else if (c && c.indexOf('messages-item') > -1)
		{
			e.preventDefault();
			return false;
		}
		else if (c && (c.indexOf('file-block') > -1 || c.indexOf('folder') > -1 || c.indexOf('fm-tree-folder') > -1) || id)
		{
			var items = menuItems();
			for (var item in items) $(t).filter('.' + item + '-item').show();
		}
		else return false;
	}
	// This part of code is also executed when ll == 'undefined'
	var v = m.children($('.context-menu-section'));
	// count all items inside section, and hide dividers if necessary
	v.each(function() {// hide dividers in hidden sections
		var a = $(this).find('a.context-menu-item');
		var b = $(this).find('.context-menu-divider');
		var c = a.filter(function() {
			return $(this).css('display') === 'none';
		});
		if (c.length === a.length || a.length === 0) b.hide();
		else b.show();
	});

	adjustContextMenuPosition(e, m);

	disableCircularTargets('#fi_');

	m.removeClass('hidden');
	e.preventDefault();
}

function disableCircularTargets(pref)
{
	for (var s in $.selected)
	{
		var x = $.selected[s];
		$(pref + x).addClass('disabled');
		$(pref + M.d[x].p).addClass('disabled');// Disable parent dir
		disableDescendantFolders(x, pref);// Disable all children folders
	}
	return true;
}

function adjustContextMenuPosition(e, m)
{
	var mPos;// menu position
	var mX = e.clientX, mY = e.clientY;	// mouse cursor, returns the coordinates within the application's client area at which the event occurred (as opposed to the coordinates within the page)

	if (e.type === 'click' && !e.calculatePosition)// clicked on file-settings-icon
	{
		var ico = {'x':e.currentTarget.context.clientWidth, 'y':e.currentTarget.context.clientHeight};
		var icoPos = getHtmlElemPos(e.delegateTarget);// get position of clicked file-settings-icon
		mPos = reCalcMenuPosition(m, icoPos.x, icoPos.y, ico);
	}
	else// right click
	{
		mPos = reCalcMenuPosition(m, mX, mY);
	}

	m.css({'top':mPos.y,'left':mPos.x});// set menu position

	return true;
}

function reCalcMenuPosition(m, x, y, ico)
{
	var TOP_MARGIN = 12;
	var SIDE_MARGIN = 12;
	var cmW = m.outerWidth(), cmH = m.outerHeight();// dimensions without margins calculated
	var wH = window.innerHeight, wW = window.innerWidth;
	var maxX = wW - SIDE_MARGIN;// max horizontal
	var maxY = wH - TOP_MARGIN;// max vertical
	var minX = SIDE_MARGIN + $('div.nw-fm-left-icons-panel').outerWidth();// min horizontal
	var minY = TOP_MARGIN;// min vertical
	var wMax = x + cmW;// coordinate of right edge
	var hMax = y + cmH;// coordinate of bottom edge

	this.overlapParentMenu = function()
	{
				var tre = wW - wMax;// to right edge
				var tle = x - minX - SIDE_MARGIN;// to left edge

				if (tre >= tle)
				{
					n.addClass('overlap-right');
					n.css({'top': top, 'left': (maxX - x - nmW) + 'px'});
				}
				else
				{
					n.addClass('overlap-left');
					n.css({'top': top, 'right': (wMax - nmW - minX) + 'px'});
				}

				return;
	};

	// submenus are absolutely positioned, which means that they are relative to first parent, positioned other then static
	// first parent, which is NOT a .contains-submenu element (it's previous in same level)
	this.horPos = function()// used for submenues
	{
		var top;
		var nTop = parseInt(n.css('padding-top'));
		var tB = parseInt(n.css('border-top-width'));
		var pPos = m.position();

		var b = y + nmH - (nTop - tB);// bottom of submenu
		var mP = m.closest('.context-submenu');
		var pT = 0, bT = 0, pE = 0;
		if (mP.length)
		{
			pE = mP.offset();
			pT = parseInt(mP.css('padding-top'));
			bT = parseInt(mP.css('border-top-width'));
		}
		if (b > maxY) top =  (maxY - nmH + nTop - tB) - pE.top + 'px';
		else top = pPos.top - tB + 'px';

		return top;
	};

	var dPos;
	var cor;// corner, check setBordersRadius for more info
	if (typeof ico === 'object')// draw context menu relative to file-settings-icon
	{
		cor = 1;
		dPos = {'x':x - 2, 'y':y + ico.y + 8};// position for right-bot
		if (wMax > maxX)// draw to the left
		{
			dPos.x = x - cmW + ico.x + 2;// additional pixels to align with -icon
			cor = 3;
		}
		if (hMax > maxY)// draw to the top
		{
			dPos.y = y - cmH;// additional pixels to align with -icon
			cor++;
		}
	}
	else if (ico === 'submenu')// submenues
	{
		var n = m.next('.context-submenu');
		var nmW = n.outerWidth();// margin not calculated
		var nmH = n.outerHeight();// margins not calculated

		if (nmH > (maxY - TOP_MARGIN))// Handle huge menu
		{
			nmH = maxY - TOP_MARGIN;
			var tmp = document.getElementById('csb_' + m.attr('id').replace('fi_',''));
			$(tmp).addClass('context-scrolling-block');
			tmp.addEventListener('mousemove', scrollMegaSubMenu);

			n.addClass('mega-height');
			n.css({'height': nmH + 'px'});
		}

		var top = 'auto', left = '100%', right = 'auto';

		top = this.horPos();
		if (m.parent().parent('.left-position').length === 0)
		{
			if (maxX >= (wMax + nmW)) left = 'auto', right = '100%';
			else if (minX <= (x - nmW)) n.addClass('left-position');
			else
			{
				this.overlapParentMenu();

				return true;
			}
		}
		else
		{
			if (minX <= (x - nmW)) n.addClass('left-position');
			else if (maxX >= (wMax + nmW)) left = 'auto', right = '100%';
			else
			{
				this.overlapParentMenu();

				return true;
			}
		}

		return {'top': top, 'left': left, 'right':right};
	}
	else// right click
	{
		cor = 0;
		dPos = {'x':x, 'y':y};
		if (x < minX) dPos.x = minX;// left side alignment
		if (wMax > maxX) dPos.x = maxX - cmW;// align with right side, 12px from it
		if (hMax > maxY) dPos.y = maxY - cmH;// align with bottom, 12px from it
	}

	setBordersRadius(m, cor);

	return {'x':dPos.x, 'y':dPos.y};
}

// corner position 0 means default
function setBordersRadius(m, c)
{
	var DEF = 8;// default corner radius
	var SMALL = 4;// small carner radius
	var TOP_LEFT = 1, TOP_RIGHT = 3, BOT_LEFT = 2, BOT_RIGHT = 4;
	var tl = DEF, tr = DEF, bl = DEF, br = DEF;

	var pos = (typeof c === 'undefined') ? 0 : c;

	switch (pos)
	{
		case TOP_LEFT:
			tl = SMALL;
			break;
		case TOP_RIGHT:
			tr = SMALL;
			break
		case BOT_LEFT:
			bl = SMALL;
			break
		case BOT_RIGHT:
			br = SMALL;
			break;
		default:// situation when c is undefined, all border radius are by DEFAULT
			break;

	}

	// set context menu border radius
	m.css({
		'border-top-left-radius': tl,
		'border-top-right-radius': tr,
		'border-bottom-left-radius': bl,
		'border-bottom-right-radius': br});

	return true;
}

// Scroll menus which height is bigger then window.height
function scrollMegaSubMenu(e)
{
	var ey = e.pageY;
	var c = $(e.target).closest('.context-submenu');
	var pNode = c.children(':first')[0];

	if (typeof pNode !== 'undefined')
	{
		var h = pNode.offsetHeight;
		var dy = h * 0.1;// 10% dead zone at the begining and at the bottom
		var pos = getHtmlElemPos(pNode, true);
		var py = (ey - pos.y - dy) / (h - dy * 2);
		if (py > 1)
		{
			py = 1;
			c.children('.context-bottom-arrow').addClass('disabled');
		}
		else if (py < 0)
		{
			py = 0;
			c.children('.context-top-arrow').addClass('disabled');
		}
		else
		{
			c.children('.context-bottom-arrow,.context-top-arrow').removeClass('disabled');
		}
		pNode.scrollTop = py * (pNode.scrollHeight - h);
	}
}

// var treeUI = SoonFc(__treeUI, 240);

function treeUI()
{
	// console.error('treeUI');
	if (d) console.time('treeUI');
	$('.fm-tree-panel .nw-fm-tree-item').draggable(
	{
		revert: true,
		containment: 'document',
		revertDuration:200,
		distance: 10,
		scroll: false,
		cursorAt:{right:88,bottom:58},
		helper: function(e,ui)
		{
			$(this).draggable( "option", "containment", [72,42,$(window).width(),$(window).height()] );
			return getDDhelper();
		},
		start: function (e, ui)
		{
			$.treeDragging=true;
			$.hideContextMenu(e);
			var html = '';
			var id = $(e.target).attr('id');
			if (id) id = id.replace('treea_','');
			if (id && M.d[id]) html = ('<div class="transfer-filtype-icon ' + fileicon(M.d[id]) + ' tranfer-filetype-txt dragger-entry">' + str_mtrunc(htmlentities(M.d[id].name)) + '</div>');
			$('#draghelper .dragger-icon').remove();
			$('#draghelper .dragger-content').html(html);
			$('body').addClass('dragging');
			$.draggerHeight = $('#draghelper .dragger-content').outerHeight();
			$.draggerWidth = $('#draghelper .dragger-content').outerWidth();
		},
		drag: function(e,ui)
		{
			//console.log('tree dragging',e);
			if (ui.position.top + $.draggerHeight - 28 > $(window).height()) ui.position.top = $(window).height() - $.draggerHeight + 26;
			if (ui.position.left + $.draggerWidth - 58 > $(window).width()) ui.position.left = $(window).width() - $.draggerWidth + 56;
		},
		stop: function(e,u)
		{
			$.treeDragging=false;
			$('body').removeClass('dragging').removeClassWith("dndc-");
		}
	});

	$('.fm-tree-panel .nw-fm-tree-item, .rubbish-bin, .fm-breadcrumbs, .transfer-panel, .nw-fm-left-icons-panel .nw-fm-left-icon, .shared-with-me tr, .nw-conversations-item').droppable(
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
			$.doDD(e,ui,'out',1);
		}
	});

	$(document).unbind('contextmenu');
	$(document).bind('contextmenu', function(e) {
		if (!localStorage.contextmenu) {
			$.hideContextMenu();
			return false;
		}
	});

	$('.fm-tree-panel .nw-fm-tree-item').unbind('click contextmenu');
	$('.fm-tree-panel .nw-fm-tree-item').bind('click contextmenu',function(e)
	{
		var id = $(this).attr('id').replace('treea_','');
		if (e.type == 'contextmenu')
		{
			$('.nw-fm-tree-item').removeClass('dragover');
			$(this).addClass('dragover');
			$.selected=[id];
			return !!contextmenuUI(e,1);
		}
		var c = $(e.target).attr('class');
		if (c && c.indexOf('nw-fm-arrow-icon') > -1)
		{
			treeUIexpand(id);
		}
		else
		{
			var c = $(this).attr('class');
			if (c && c.indexOf('opened') > -1) treeUIexpand(id);
			M.openFolder(id);
		}
		return false;
	});

	$(window).unbind('resize.tree');
	$(window).bind('resize.tree', function ()
	{
		initTreeScroll();
	});
	// setTimeout(initTreeScroll,10);
	Soon(function()
	{	/**
		 * Let's shoot two birds with a stone, when nodes are moved we need a resize
		 * to let dynlist refresh - plus, we'll implicitly invoke initTreeScroll.
		 */
		$(window).trigger('resize');
	});
	if (d) console.timeEnd('treeUI');
}

function treeUIexpand(id,force,moveDialog)
{
	M.buildtree(M.d[id]);

	var b = $('#treea_' + id);
	var d = b.attr('class');

	if (M.currentdirid !== id)
	{
		var path = M.getPath(M.currentdirid),pid={},active_sub=false;
		for (var i in path) pid[path[i]]=i;
		if (pid[M.currentdirid] < pid[id]) active_sub=true;
	}

	if (d && d.indexOf('expanded') > -1 && !force)
	{
		fmtreenode(id,false);
		$('#treesub_' + id).removeClass('opened');
		b.removeClass('expanded');
	}
	else if (d && d.indexOf('contains-folders') > -1)
	{
		fmtreenode(id,true);
		$('#treesub_' + id).addClass('opened');
		b.addClass('expanded');
	}

	treeUI();
}

function sectionUIopen(id)
{
	$('.nw-fm-left-icon').removeClass('active');
	$('.content-panel').removeClass('active');
	$('.nw-fm-left-icon.' + id).addClass('active');
	$('.content-panel.' + id).addClass('active');
	$('.fm-left-menu').removeClass('cloud-drive shared-with-me rubbish-bin contacts conversations').addClass(id);
	$('.fm-right-header').addClass('hidden');

	if (id !== 'conversations') $('.fm-right-header').removeClass('hidden');
	if ((id !== 'cloud-drive') && (id !== 'rubbish-bin') && ((id !== 'shared-with-me') && (M.currentdirid !== 'shares')))
	{
		$('.files-grid-view.fm').addClass('hidden');
		$('.fm-blocks-view.fm').addClass('hidden');
	}
	if (id !== 'contacts')
	{
		$('.contacts-details-block').addClass('hidden');
		$('.files-grid-view.contacts-view').addClass('hidden');
		$('.fm-blocks-view.contacts-view').addClass('hidden');
	}
	if (id !== 'shared-with-me')
	{
		$('.shared-blocks-view').addClass('hidden');
		$('.shared-grid-view').addClass('hidden');
	}

	var headertxt = '';
	switch(id)
	{
		case 'contacts':
		headertxt = 'My contacts';
		break;
		case 'conversations':
		headertxt = 'My conversations';
		break;
		case 'shared-with-me':
		headertxt = 'My incoming shares';
		break;
		case 'cloud-drive':
		headertxt = 'My folders';
		break;
	}
	$('.nw-tree-panel-header span').text(headertxt);
}

function treeUIopen(id,event,ignoreScroll,dragOver,DragOpen)
{
	var id_s = id.split('/')[0], id_r = RootbyId(id);
	var e, scrollTo = false, stickToTop = false;

	if (id_r == 'shares') sectionUIopen('shared-with-me');
	else if (id_r == M.RootID) sectionUIopen('cloud-drive');
	else if (id_s == 'chat') sectionUIopen('conversations');
	else if (id_r == 'contacts') sectionUIopen('contacts');
	else if (id_r == M.RubbishID) sectionUIopen('rubbish-bin');

	if (!fminitialized) return false;

	if (!event)
	{
		var ids = M.getPath(id);
		var i=1;
		while (i < ids.length)
		{
			if (M.d[ids[i]]) treeUIexpand(ids[i],1);
			i++;
		}
		if (ids[0] == 'contacts' && M.currentdirid && M.currentdirid.length == 11) sectionUIopen('contacts');
		else if (ids[0] == 'contacts') sectionUIopen('shared-with-me');
		else if (ids[0] == M.RootID) sectionUIopen('cloud-drive');
	}
	if ($.hideContextMenu) $.hideContextMenu(event);

	e = $('#treea_' + id_s);
	$('.fm-tree-panel .nw-fm-tree-item').removeClass('selected');
	e.addClass('selected');

	if (!ignoreScroll)
	{
		if (id == M.RootID || id == 'shares' || id == 'contacts' || id == 'chat')
		{
			stickToTop = true;
			scrollTo = $('.nw-tree-panel-header');
		}
		else if (e.length && !e.visible()) scrollTo = e;
		// if (d) console.log('scroll to element?',ignoreScroll,scrollTo,stickToTop);

		var jsp = scrollTo && $('.fm-tree-panel').data('jsp');
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
		$('.rename-dialog').removeClass('hidden');
		$('.rename-dialog').addClass('active');
		$('.fm-dialog-overlay').removeClass('hidden');
		$('body').addClass('overlayed');
		$('.rename-dialog .fm-dialog-close').unbind('click');
		$('.rename-dialog .fm-dialog-close').bind('click',function()
		{
			$.dialog=false;
			$('.rename-dialog').addClass('hidden');
			$('.fm-dialog-overlay').addClass('hidden');
			$('body').removeClass('overlayed');
		});
		$('.rename-dialog-button.rename').unbind('click');
		$('.rename-dialog-button.rename').bind('click',function()
		{
			var c = $('.rename-dialog').attr('class');
			if (c && c.indexOf('active') > -1) dorename();
		});
		$('.rename-dialog-button.cancel').unbind('click');
		$('.rename-dialog-button.cancel').bind('click',function()
		{
			$('.rename-dialog').addClass('hidden');
		    $('.fm-dialog-overlay').addClass('hidden');
			$('body').removeClass('overlayed');
		});
		var n = M.d[$.selected[0]];
		if (n.t) $('.rename-dialog .fm-dialog-title').text(l[425]);
		else $('.rename-dialog .fm-dialog-title').text(l[426]);
		$('.rename-dialog input').val(n.name);
		var ext = fileext(n.name);
		$('.rename-dialog .transfer-filtype-icon').attr('class', 'transfer-filtype-icon ' + fileicon(n))
		if (!n.t && ext.length > 0)
		{
			$('.rename-dialog input')[0].selectionStart=0;
			$('.rename-dialog input')[0].selectionEnd = $('.rename-dialog input').val().length - ext.length-1;
		}
		$('.rename-dialog input').unbind('focus');
		$('.rename-dialog input').bind('focus',function() {
			var selEnd;
			$(this).closest('.rename-dialog').addClass('focused');
			var d = $(this).val().indexOf('.');
			if (d > -1) selEnd = d;
		    else selEnd = $(this).val().length;
			$(this)[0].selectionStart=0;
			$(this)[0].selectionEnd = selEnd;

		});
		$('.rename-dialog input').unbind('blur');
		$('.rename-dialog input').bind('blur',function() {
			$(this).closest('.rename-dialog').removeClass('focused');
		});
		$('.rename-dialog input').unbind('click keydown keyup keypress');
		$('.rename-dialog input').focus();
		$('.rename-dialog input').bind('click keydown keyup keypress',function(e)
		{
			var n = M.d[$.selected[0]];
			var ext = fileext(n.name);
			if ($(this).val() == '' || (!n.t && ext.length > 0 && $(this).val() == '.' + ext)) $('.rename-dialog').removeClass('active');
			else $('.rename-dialog').addClass('active');
			if (!n.t && ext.length > 0)
			{
				if (this.selectionStart > $('.rename-dialog input').val().length - ext.length-2)
				{
					this.selectionStart = $('.rename-dialog input').val().length - ext.length-1;
					this.selectionEnd = $('.rename-dialog input').val().length - ext.length-1;
					if (e.which == 46) return false;
				}
				else if (this.selectionEnd > $('.rename-dialog input').val().length - ext.length-1)
				{
					this.selectionEnd = $('.rename-dialog input').val().length - ext.length-1;
					return false;
				}
			}
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
		$('body').removeClass('overlayed');
	}
}

function msgDialog(type,title,msg,submsg,callback,checkbox)
{
	$.msgDialog = type;
	$('#msgDialog').removeClass('clear-bin-dialog confirmation-dialog warning-dialog-b warning-dialog-a notification-dialog remove-dialog delete-contact multiple');
	$('#msgDialog .icon').removeClass('fm-bin-clear-icon .fm-notification-icon');
	$('#msgDialog .confirmation-checkbox').addClass('hidden');
	$.warningCallback = callback;
	if (type == 'clear-bin')
	{
		$('#msgDialog').addClass('clear-bin-dialog');
		$('#msgDialog .icon').addClass('fm-bin-clear-icon');
		$('#msgDialog .fm-notifications-bottom').html('<div class="fm-dialog-button notification-button active confirm">' + l[1018] + '</div><div class="fm-dialog-button notification-button active cancel">' + l[82] + '</div><div class="clear"></div>');
		$('#msgDialog .fm-dialog-button').eq(0).bind('click',function()
		{
			closeMsg();
			if ($.warningCallback) $.warningCallback(true);
		});
		$('#msgDialog .fm-dialog-button').eq(1).bind('click',function()
		{
			closeMsg();
			if ($.warningCallback) $.warningCallback(false);
		});
	}
	if (type == 'delete-contact')
	{
		$('#msgDialog').addClass('delete-contact');
		$('#msgDialog .fm-notifications-bottom').html('<div class="fm-dialog-button notification-button active confirm">' + l[78] + '</div><div class="fm-dialog-button notification-button active cancel">' + l[79] + '</div><div class="clear"></div>');
		$('#msgDialog .fm-dialog-button').eq(0).bind('click',function()
		{
			closeMsg();
			if ($.warningCallback) $.warningCallback(true);
		});
		$('#msgDialog .fm-dialog-button').eq(1).bind('click',function()
		{
			closeMsg();
			if ($.warningCallback) $.warningCallback(false);
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
	else if (type == 'confirmation' || type == 'remove')
	{
		$('#msgDialog .fm-notifications-bottom').html('<div class="left checkbox-block hidden"><div class="checkdiv checkboxOff"> <input type="checkbox" name="confirmation-checkbox" id="confirmation-checkbox" class="checkboxOff"> </div> <label for="export-checkbox" class="radio-txt">' +l[229]+'</label></div><div class="fm-dialog-button notification-button active confirm">' + l[78] + '</div><div class="fm-dialog-button notification-button active cancel">' + l[79] + '</div><div class="clear"></div>');

		$('#msgDialog .fm-dialog-button').eq(0).bind('click',function()
		{
			closeMsg();
			if ($.warningCallback) $.warningCallback(true);
		});
		$('#msgDialog .fm-dialog-button').eq(1).bind('click',function()
		{
			closeMsg();
			if ($.warningCallback) $.warningCallback(false);
		});
		$('#msgDialog .icon').addClass('fm-notification-icon');
		$('#msgDialog').addClass('confirmation-dialog');
		if (type == 'remove') $('#msgDialog').addClass('remove-dialog');

		if (checkbox)
		{
			$('#msgDialog .left.checkbox-block .checkdiv, #msgDialog .left.checkbox-block input').removeClass('checkboxOn').addClass('checkboxOff');
			$.warningCheckbox=false;
			$('#msgDialog .left.checkbox-block').removeClass('hidden');
			$('#msgDialog .left.checkbox-block').unbind('click');
			$('#msgDialog .left.checkbox-block').bind('click',function(e)
			{
				var c = $('#msgDialog .left.checkbox-block input').attr('class');
				if (c && c.indexOf('checkboxOff') > -1)
				{
					$('#msgDialog .left.checkbox-block .checkdiv, #msgDialog .left.checkbox-block input').removeClass('checkboxOff').addClass('checkboxOn');
					localStorage.skipDelWarning=1;
				}
				else
				{
					$('#msgDialog .left.checkbox-block .checkdiv, #msgDialog .left.checkbox-block input').removeClass('checkboxOn').addClass('checkboxOff');
					delete localStorage.skipDelWarning;
				}
			});
		}
	}

	$('#msgDialog .fm-dialog-title span').text(title);
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
	$('body').addClass('overlayed');
}

function closeMsg()
{
	$('#msgDialog').addClass('hidden');
	$('.fm-dialog-overlay').addClass('hidden');
	$('body').removeClass('overlayed');
	delete $.msgDialog;
}

function dialogScroll(s)
{
	$(s).jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 8, animateScroll: true});
};

function dialogPositioning(s)
{
	$(s).css('margin-top', '-' + $(s).height()/2 + 'px');
};

/**
 * Handle DOM directly, no return value
 * @param {string} s - dialog tab
 * @param {string} m - tag of source element
 * @param {string} n - dialog prefix (copy|move)
 * @param {string} x - html, content
 *
 * @returns {undefined}
 */
function handleDialogTabContent(s, m, n, x)
{
	var b = x.replace(/treea_/ig,'mctreea_').replace(/treesub_/ig,'mctreesub_').replace(/treeli_/ig,'mctreeli_');;
	$('.' + n + '-dialog-tree-panel' + '.' + s + ' .dialog-content-block')
		.empty()
		.html(b);
	if (!$('.' + n + '-dialog-tree-panel' + '.' + s + ' .dialog-content-block ' + m).length)// No items available, empty message
	{
		$('.' + n + '-dialog-empty' + '.' + s).addClass('active');
		$('.' + n + '-dialog-tree-panel' + '.' + s + ' ' + '.' + n + '-dialog-panel-header').addClass('hidden');
	}
	else
	{
		$('.' + n + '-dialog-tree-panel' + '.' + s).addClass('active');
		$('.' + n + '-dialog-tree-panel' + '.' + s + ' ' + '.' + n + '-dialog-panel-header').removeClass('hidden');
	}
}

// Find shared folders marked read-only and disable it in dialog
function disableReadOnlySharedFolders(m)
{
	var $ro = $('.' + m + '-dialog-tree-panel.shared-with-me .dialog-content-block span[id^="mctreea_"]');
	var x, i;
	$ro.each(function(i, v)
	{
		x = $(v).attr('id').replace('mctreea_', '');
		i = M.d[x].r;
		if (typeof i == 'undefined' || i === 0)
		{
			$(v).addClass('disabled');
		}
	});
};

/**
 * Copy|Move dialogs content  handler
 *
 * @param {string} s - dialog tab
 * @param {string} m - tag of source element
 * @param {boolean} c - should we show new folder button
 * @param {string} n - dialog prefix (copy|move)
 * @param {string} t - action button label
 * @param {string} i - in case of conversations tab
 * @returns {undefined}
 */
function handleDialogContent(s, m, c, n, t, i)
{
	$('.' + n + '-dialog-txt').removeClass('active');
	$('.' + n + '-dialog-empty').removeClass('active');
	$('.' + n + '-dialog-button').removeClass('active');
	$('.' + n + '-dialog-tree-panel').removeClass('active');
	$('.' + n + '-dialog-panel-arrows').removeClass('active');
	$('.' + n + '-dialog .dialog-sorting-menu').addClass('hidden');
	// Action button label
	var $btn = $('.dialog-' + n + '-button');
	$btn.text(t);
	// Disable/enable button
	if (typeof $.mcselected != 'undefined') $btn.removeClass('disabled');
		else $btn.addClass('disabled');

	// Sorting menu
	var $mnu = $('.' + n + '-dialog .dialog-sorting-menu .context-menu-section').eq(0);
	switch (s)
	{
		case 'cloud-drive':
			$mnu.addClass('hidden');
			break;
		case 'shared-with-me':
			$mnu.removeClass('hidden');
			break;
		case 'conversations':
			$mnu.addClass('hidden');
			break;
		case 'rubbish-bin':
			$mnu.addClass('hidden');
			break;
		default:
			$mnu.addClass('hidden');
			break;
	}

	$('.' + n + '-dialog-txt' + '.' + s).addClass('active');
	var b;
	// Added cause of conversations-container
	if (typeof i === 'undefined') b = $('.content-panel' + '.' + s).html();
	else b = $('.content-panel ' + i).html();

	handleDialogTabContent(s, m, n, b);
	if (s === 'shared-with-me') disableReadOnlySharedFolders(n);

	//  'New Folder' button
	if (c) $('.dialog-newfolder-button').removeClass('hidden');
	else $('.dialog-newfolder-button').addClass('hidden');

	$('.' + n + '-dialog .nw-fm-tree-item').removeClass('expanded active opened selected');
	$('.' + n + '-dialog ul').removeClass('opened');

    dialogPositioning('.fm-dialog' + '.' + n + '-dialog');
	dialogScroll('.' + n + '-dialog-tree-panel');

	$('.' + n + '-dialog-button' + '.' + s).addClass('active');//Activate tab
}

/**
 * Taking care about dialog button state, and scroll
 * @returns {undefined}
 *
 */
function shareDialogContentCheck()
{
	var dc = '.share-dialog';
	// Disable/enable button
	var $btn = $('.fm-dialog-button .dialog-share-button');

	var num = $(dc + ' .share-dialog-contacts .share-dialog-contact-bl').length;
	if (num)
	{
		$btn.removeClass('disabled');
		$(dc + ' .share-dialog-img').addClass('hidden');
		$(dc + ' .share-dialog-contacts').removeClass('hidden');
		handleDialogScroll(num, dc);
	}
	else
	{
		$btn.addClass('disabled');
		$(dc + ' .share-dialog-img').removeClass('hidden');
		$(dc + ' .share-dialog-contacts').addClass('hidden');
	}
}

function addShareDialogContactToContent (type, id, av_color, av, name, permClass, permText)
{
	var html = '<div class="share-dialog-contact-bl ' + type + '" id="sdcbl_' + id + '">\n\
					<div class="nw-contact-avatar color' + av_color + '">' + av + '</div>\n\
					<div class="fm-chat-user-info"><div class="fm-chat-user">' + name + '</div></div>\n\
					<div class="share-dialog-permissions ' + permClass + '">\n\
						<span></span>' + permText + '\n\
					</div>';

	var htmlEnd = '<div class="share-dialog-remove-button"></div><div class="clear"></div></div>';

	return html + htmlEnd;
};

function fillShareDialogWithContent()
{
	var sel = $.selected[0];
	$.sharedTokens = [];// Holds items currently visible in share folder contet (above input)

	for (var i in M.d[sel].shares)// list users that are already use item
	{
		if (M.u[i])
		{
			var user = M.u[i];
			var name = (user.name && user.name.length > 1) ? user.name : user.m;
			var av_color = name.charCodeAt(0)%6 + name.charCodeAt(1)%6;
			var av = (avatars[i] && avatars[i].url) ? '<img src="' + avatars[i].url + '">' : (name.charAt(0) + name.charAt(1));
			var perm;

			var pl = 0;
			if (typeof M.d[sel].shares[i].r != 'undefined') pl = M.d[sel].shares[i].r;

			switch (pl)// Permission level
			{
				case 1: // Read and write
					perm = ['read-and-write', l[56]];
					break;
				case 2: // Full Access
					perm = ['full-access', l[57]];
					break;
				default: // 0 or any === read only
					perm = ['read-only', l[55]];
					break;
			}

			$.sharedTokens.push(user.m);// add contact

			var html = addShareDialogContactToContent('', i, av_color, av, name, perm[0], perm[1]);

			$('.share-dialog .share-dialog-contacts').append(html);
		}
	}
};

handleDialogScroll = function(num, dc)
{
	var SCROLL_NUM = 5;// Number of items in dialog before scroll is implemented
	//
	// Add scroll in case that we have more then 5 items in list
	if (num > SCROLL_NUM)
	{
		dialogScroll(dc + ' .share-dialog-contacts');
	}
	else
	{
		var $x = $(dc + ' .share-dialog-contacts').jScrollPane();
		var el = $x.data('jsp');
		el.destroy();
	}
};

function handleShareDialogContent()
{

	fillShareDialogWithContent();

	shareDialogContentCheck();

	var dc = '.share-dialog';
	$('.share-dialog-icon.permissions-icon')
			.removeClass('active full-access read-and-write')
			.addClass('read-only');
	// Update dialog title text
	$(dc + ' .fm-dialog-title').text(l[1344] + ' "' + M.d[$.selected].name + '"');

	$('.share-dialog .multiple-input .token-input-token-mega').remove();

    dialogPositioning('.fm-dialog.share-dialog');
}

checkMultiInputPermission = function($this)
{
	var perm;
	if ($this.is('.read-and-write'))
	{
		perm = ['read-and-write', l[56]];
	}
	else if ($this.is('.full-access'))
	{
		perm = ['full-access', l[57]];
	}
	else// read-only
	{
		perm = ['read-only', l[55]];
	}

	return perm;
};

function initShareDialog()
{
	if (!u_type) return; // not for ephemeral

	$.shareTokens = [];
	function errorMsg(msg)
	{
		var $d = $('.share-dialog');
		var $s = $('.share-dialog .multiple-input-warning span');
		$s.text(msg);
		$d.addClass('error');
		setTimeout(function()
		{
			$d.removeClass('error');
		}, 3000);
	}

	// Plugin configuration
	var contacts = getContactsEMails();

	$('.share-multiple-input').tokenInput(contacts, {
		theme:				"mega",
//		hintText:			"Type in a contact email",
		hintText:			"",
		searchingText:		"",
//		searchingText:		"Searching for existing contacts...",
		noResultsText:		"",
		addAvatar:			true,
		autocomplete:		null,
		searchDropdown:		true,
		emailCheck:			true,
		preventDoublet:		false,
		tokenValue:			"id",
		propertyToSearch:	"id",
		resultsLimit:		5,
		minChars:			2,
		accountHolder:		M.u[u_handle].m,
		scrollLocation:		'share',
		onEmailCheck: function() {errorMsg("Looks like there's a malformed email!");},
		onDoublet: function() {errorMsg('You already have contact with that email!');},
		onHolder: function() {errorMsg('No need for that, you are THE owner!');},
		onAdd: function()
		{
			$('.dialog-share-button').removeClass('disabled');

			var $a = $('.share-dialog .share-added-contact.token-input-token-mega');
			var $b = $('.share-dialog .multiple-input');
			var h1 = $a.outerHeight(true);// margin
			var h2 = $b.height();

			if (5 <= h2/h1 && h2/h1 < 6)
			{
				$b.jScrollPane({
					enableKeyboardNavigation: false,
					showArrows: true,
					arrowSize: 8,
					animateScroll: true
				});
				setTimeout(function() {
					$('.share-dialog .token-input-input-token-mega input').focus();
				}, 0);
			}
	},
		onDelete: function()
		{
			var $btn = $('.dialog-share-button');
			setTimeout(function() {
				$('.share-dialog .token-input-input-token-mega input').blur();
			}, 0);
			var itemNum = $('.share-dialog .token-input-list-mega .token-input-token-mega').length + $('.share-dialog .share-dialog-contacts .share-dialog-contact-bl').length;
			if (itemNum === 0)
			{
				$btn.addClass('disabled');
			}
			else
			{
				$btn.removeClass('disabled');

				var $a = $('.share-dialog .share-added-contact.token-input-token-mega');
				var $b = $('.share-dialog .multiple-input');
				var $c = $('.share-dialog .multiple-input .jspPane')[0];
				var h1 = $a.outerHeight();// margin excluded
				var h2;
				if ($c) h2 = $c.scrollHeight;
				else h2 = $b.height();

				if (h2/h1 < 6)
				{
					clearScrollPanel('.share-dialog');
				}
			}
		}
    });

	menuPermissionState = function($this)
	{
		var mi = '.permissions-menu .permissions-menu-item';
		$(mi).removeClass('active');

		var cls = checkMultiInputPermission($this);

		$(mi + '.' + cls[0]).addClass('active');
	};

	handlePermissionMenu = function($this, m, x, y)
	{
		m.css('left', x + 'px');
		m.css('top', y + 'px');
		menuPermissionState($this);
		$this.addClass('active');
		m.fadeIn(200);
	};

	// called when multi-input box is not empty
	determineContactParams = function(item, perm)
	{
		var name = item;// email address
		var id = '';
		for (var i in M.u)
		{
			if (M.u[i].m === item)
			{
				id = i;
				break;
			}
		}
		
		var user = M.u[id];
		var name = (user.name && user.name.length > 1) ? user.name : user.m;
		var av_color = name.charCodeAt(0)%6 + name.charCodeAt(1)%6;
		var av = (avatars[i] && avatars[i].url) ? '<img src="' + avatars[i].url + '">' : (name.charAt(0) + name.charAt(1));
		
		$.sharedTokens.push(item);
		
		var html = addShareDialogContactToContent('', id, av_color, av, name, perm[0], perm[1]);

		$('.share-dialog .share-dialog-contacts').append(html);

	};

	$('.share-dialog').unbind('click');
	$('.share-dialog').bind('click',function(e)
	{
		// This's sensitive to dialog DOM element positioning
		var trg = e.originalEvent.path[0];
		var trg1 = e.originalEvent.path[1];
		var trg2 = e.originalEvent.path[2];
		if (!$(trg).is('.permissions-icon,.import-contacts-link,.share-dialog-permissions')
				&& !$(trg1).is('.permissions-icon,.import-contacts-link,.share-dialog-permissions')
				&& !$(trg2).is('.permissions-icon,.import-contacts-link,.share-dialog-permissions'))
		{
			// share dialog permission menu
			$('.permissions-menu').fadeOut(200);
			$('.import-contacts-dialog').fadeOut(200);
			$('.permissions-icon').removeClass('active');
			$('.share-dialog-permissions').removeClass('active');
			closeImportContactNotification('.share-dialog');
			$('.import-contacts-service').removeClass('imported');
		}
	});

	$('.share-dialog .fm-dialog-close, .share-dialog .dialog-cancel-button').unbind('click');
	$('.share-dialog .fm-dialog-close, .share-dialog .dialog-cancel-button').bind('click',function()
	{
		closeDialog();
	});

	$('.share-dialog .dialog-share-button').unbind('click');
	$('.share-dialog .dialog-share-button').bind('click',function()
	{
		// If share button is NOT disabled
		if (!$(this).is('.disabled'))
		{
			// If there's a contacts in multi-input add them to top
			var $items = $('.share-dialog .token-input-list-mega .token-input-token-mega');
			if ($items.length)
			{
				$.each($items, function(ind, val)
				{
					determineContactParams($(val).contents().eq(1).text(), checkMultiInputPermission($('.share-dialog .permissions-icon')));
				});

				$('.share-dialog .multiple-input .token-input-token-mega').remove();

				shareDialogContentCheck();
			}
			else
			{
				var t = [];
				var s = M.d[$.selected[0]].shares;
				var id = '';
				var perm, aPerm;
				var $items = $('.share-dialog-contact-bl');
				$.each($items, function(ind, val)
				{
					id = $(val).attr('id').replace('sdcbl_', '');
					if (id === '')// ToDo: This should not be happening, expand this to make sure all contacts are with id and exist in M.u
						id = $(val).find('.fm-chat-user').text();

					aPerm = $(val).find('.share-dialog-permissions');

					if ($(aPerm).is('.read-and-write'))
					{
						perm = 1;
					}
					else if ($(aPerm).is('.full-access'))
					{
						perm = 2;
					}
					else
					{
						perm = 0;
					}

					if (!s || !s[id] || s[id].r !== perm)
						t.push({u: id, r: perm});
				});

				closeDialog();
				if (t.length > 0)
				{
					loadingDialog.show();
					doshare($.selected[0], t, true);
				}
			}
		}
	});

	$('.share-dialog .import-contacts-service').unbind('click');
	$('.share-dialog .import-contacts-service').bind('click', function()
	{
		// NOT imported
		if (!$(this).is('.imported'))
		{
			importGoogleContacts('shared');
		}
		else
		{
			var n = $('.imported-contacts-notification');
			n.css('margin-left', '-' + n.outerWidth()/2 +'px');
			n.fadeIn(200);
			$('.share-dialog .import-contacts-dialog').fadeOut(200);
		}
	});

	$('.share-dialog .import-contacts-link').unbind('click');
	$('.share-dialog .import-contacts-link').bind('click', function(e)
	{
		$('.permissions-menu').fadeOut(200);
		$('.share-dialog-permissions').removeClass('active');
		$('.permissions-icon').removeClass('active');
		if(!$(this).is('.active'))
		{
			$('.share-dialog .import-contacts-link').addClass('active');
			$('.share-dialog .import-contacts-dialog').fadeIn(200);

			$('.imported-notification-close').unbind('click');
			$('.imported-notification-close').bind('click', function()
			{
				$('.imported-contacts-notification').fadeOut(200);
			});
		}
		else
		{
			$('.share-dialog .import-contacts-link').removeClass('active');
			$('.share-dialog .import-contacts-dialog').fadeOut(200);
			$('.imported-contacts-notification').fadeOut(200);
		}

		e.stopPropagation();
	});

	$('.share-dialog .import-contacts-info').unbind('mouseover');
	$('.share-dialog .import-contacts-info').bind('mouseover', function() {
		$('.share-dialog .import-contacts-info-txt').fadeIn(200);
	});

	$('.share-dialog .import-contacts-info').unbind('mouseout');
	$('.share-dialog .import-contacts-info').bind('mouseout', function() {
		$('.share-dialog .import-contacts-info-txt').fadeOut(200);
	});

	$(document).off('click', '.share-dialog-remove-button');
	$(document).on('click', '.share-dialog-remove-button', function (e)
	{
		var $this = $(this);

		var id = $this.parent().attr('id').replace('sdcbl_', '');
		$this.parent()
				.fadeOut(200)
				.remove();

		var sel = $.selected[0];
		if (id !== '')
		{
			M.delnodeShare(sel, id);

			api_req({
				a:'s',
				n:sel,
				s:[{
					u:id,
					r:''
				}],
				ha:'',
				i: requesti
			});

			$.sharedTokens.splice($.sharedTokens.indexOf(M.u[id].m), 1);
		}

		shareDialogContentCheck();

		var num = $('.share-dialog .share-dialog-contacts .share-dialog-contact-bl').length + $('.share-dialog .token-input-list-mega .token-input-token-mega').length;
		if (!num) $('.dialog-share-button').addClass('disabled');
	});

	// related to specific contact
	$(document).off('click', '.share-dialog-permissions');
	$(document).on('click', '.share-dialog-permissions', function (e)
	{
		var $this = $(this);
		var $m = $('.permissions-menu');
		if ($this.is('.active'))// fadeOut this popup
		{
			$m.fadeOut(200);
			$this.removeClass('active');
		}
		else
		{
			$('.share-dialog-permissions').removeClass('active');
			$('.permissions-icon').removeClass('active');
			closeImportContactNotification('.share-dialog');
			var x = $this.position().left + 30;
			var y = $this.position().top - 1;
			handlePermissionMenu($this, $m, x, y);
		}

		e.stopPropagation();
	});

	// related to multi-input contacts
	$('.share-dialog .permissions-icon').unbind('click');
	$('.share-dialog .permissions-icon').bind('click', function (e)
	{
		var $this = $(this);
		var $m = $('.permissions-menu');
		if ($this.is('.active'))// fadeOut permission menu for this icon
		{
			$m.fadeOut(200);
			$this.removeClass('active');
		}
		else
		{
			$('.share-dialog-permissions').removeClass('active');
			$('.permissions-icon').removeClass('active');
			closeImportContactNotification('.share-dialog');
			var x = $this.position().left + 31;
			var y = $this.position().top - 9;
			handlePermissionMenu($this, $m, x, y);
		}

		e.stopPropagation();
	});

	$('.permissions-menu-item').unbind('click');
	$('.permissions-menu-item').bind('click', function (e)
	{
		var $this = $(this);

		$('.permissions-menu').fadeOut(200);
		// Find where we are permissions-icon or share-dialog-permissions

		var cls = checkMultiInputPermission($this);

		var $i = $('.share-dialog .share-dialog-permissions.active');// Specific contact
		var $g = $('.share-dialog .permissions-icon.active');// Group permissions

		var acls = [];// active permission
		if ($i.length)
		{
			acls = checkMultiInputPermission($i);
			$i
				.removeClass(acls[0])
				.removeClass('active')
				.html('<span></span>' + cls[1])
				.addClass(cls[0]);
		}
		else if ($g.length)// Group permission, permissions-icon
		{
			acls = checkMultiInputPermission($g);
			$g
				.removeClass(acls[0])
				.removeClass('active')
				.addClass(cls[0]);
		}

		$('.permissions-icon.active').removeClass('active');
		$('.share-dialog-permissions.active').removeClass('active');

		e.stopPropagation();
	});
}

function addImportedDataToSharedDialog(data, from)
{
	$.each(data, function(ind, val)
	{
		$('.share-dialog .share-multiple-input').tokenInput("add", {id: val, name: val});
	});

//	var perm, av_color, av, html;
//	$.sharedTokens = [];
//
//	$.each(data, function(ind, val)
//	{
//		// Read permission from multi-input permission box
//		perm = checkMultiInputPermission($('.share-dialog .permissions-icon'));
//		av_color = val.charCodeAt(0)%6 + val.charCodeAt(1)%6;
//		// ToDo: It's possible to return name and probably picture of imported gmail contact maybe we could use that
//		// ToDo: Check here for name available, is exists add it
//		av = val.charAt(0) + val.charAt(1);
//
//		$.sharedTokens.push(val);// in this case val represents e-mail
//
//		html = addShareDialogContactToContent(from, '', av_color, '', val, perm[0], perm[1]);
//		$('.share-dialog .share-dialog-contacts').append(html);
//	});
//
//	shareDialogContentCheck();

	closeImportContactNotification('.share-dialog');
}

function addImportedDataToAddContactsDialog(data, from)
{
	$.each(data, function(ind, val)
	{
		$('.add-user-popup .add-contact-multiple-input').tokenInput("add", {id: val, name: val});
	});

	closeImportContactNotification('.add-user-popup');
}

function closeImportContactNotification(c)
{
	$('.imported-contacts-notification').fadeOut(200);
	$(c + ' .import-contacts-dialog').fadeOut(200);
	$('.import-contacts-link').removeClass('active');
}

function clearScrollPanel(from)
{
	$(from + ' .multiple-input').jScrollPane().data().jsp.destroy();
	$(from + ' .multiple-input .jspPane').unwrap();
	$(from + ' .multiple-input .jspPane:first-child').unwrap();
}

function closeDialog()
{
	if ($.dialog === 'createfolder' && ($.copyDialog || $.moveDialog))
	{
		$('.fm-dialog.create-folder-dialog').addClass('hidden');
		$('.fm-dialog.create-folder-dialog .create-folder-size-icon').removeClass('hidden');
	}
	else
	{
		$('.fm-dialog').addClass('hidden');
		$('.fm-dialog-overlay').addClass('hidden');
		$('body').removeClass('overlayed');
		$('.dialog-content-block').empty();
		// add contact popup
		$('.add-user-popup').addClass('hidden');
		$('.fm-add-user').removeClass('active');
		clearScrollPanel('.add-user-popup');
		// share dialog
		$('.share-dialog-contact-bl').remove();
		$('.import-contacts-service').removeClass('imported');
		clearScrollPanel('.share-dialog');

		// share dialog permission menu
		$('.permissions-menu').fadeOut(0);
		$('.import-contacts-dialog').fadeOut(0);
		$('.permissions-icon').removeClass('active');
		closeImportContactNotification('.share-dialog');
		closeImportContactNotification('.add-user-popup');

		delete $.copyDialog;
		delete $.moveDialog;
	}
	$('.fm-dialog').removeClass('arrange-to-back');

	$('.export-links-warning').addClass('hidden');
	if ($.dialog == 'terms' && $.termsAgree) delete $.termsAgree;

	delete $.dialog;
}

function copyDialog()
{

	// Clears already selected sub-folders, and set selection to root
	function selectCopyDialogTabRoot(section)
	{
		$('.copy-dialog .nw-fm-tree-item').removeClass('selected');
		switch (section)
		{
			case 'cloud-drive':
				$.mcselected = M.RootID;
                break;
			case 'shared-with-me':
				$.mcselected = undefined;
				break;
			case 'conversations':
				$.mcselected = undefined;
				break;
			default:
				$.mcseleced = undefined;
				break;
		}
		// Disable/enable button
		var $btn = $('.dialog-copy-button');
		if (typeof $.mcselected != 'undefined') $btn.removeClass('disabled');
		else $btn.addClass('disabled');

	};

	$('.copy-dialog .fm-dialog-close, .copy-dialog .dialog-cancel-button').unbind('click');
	$('.copy-dialog .fm-dialog-close, .copy-dialog .dialog-cancel-button').bind('click',function()
	{
		closeDialog();
	});

    $('.copy-dialog-button').unbind('click');
    $('.copy-dialog-button').bind('click', function() {
		var section = $(this).attr('class').split(" ")[1];
		selectCopyDialogTabRoot(section);
        if ($(this).attr('class').indexOf('active') == -1)
		{
            switch (section)
            {
                case 'cloud-drive':
					handleDialogContent(section, 'ul', true, 'copy', 'Paste');
                    break;
                case 'shared-with-me':
					handleDialogContent(section, 'ul', false, 'copy', l[1344]);
                    break;
                case 'conversations':
					handleDialogContent(section, 'div', false, 'copy', l[1940], '.conversations-container');
                    break;
            }
        }
    });

    $('.copy-dialog-panel-arrows').unbind('click');
    $('.copy-dialog-panel-arrows').bind('click', function() {
        if ($(this).attr('class').indexOf('active') == -1) {
			var type = $('.fm-dialog-title .copy-dialog-txt.active').attr('class').split(" ")[1];
			$('.copy-dialog .dialog-sorting-menu .sorting-menu-item')
				.removeClass('active')
				.filter('*[data-by=' + $.sortTreePanel[type].by  + '],*[data-dir='+$.sortTreePanel[type].dir+']')
				.addClass('active');

            $(this).addClass('active');
            $('.copy-dialog .dialog-sorting-menu').removeClass('hidden');
        } else {
            $(this).removeClass('active');
            $('.copy-dialog .dialog-sorting-menu').addClass('hidden');
        }
    });

    $('.copy-dialog .dialog-sorting-menu .sorting-menu-item').unbind('click');
    $('.copy-dialog .dialog-sorting-menu .sorting-menu-item').bind('click', function()
	{
        if ($(this).attr('class').indexOf('active') == -1)
		{
			var data = $(this).data();
			var type = $('.fm-dialog-title .copy-dialog-txt.active').attr('class').split(" ")[1];
			if (data.dir) {
				localStorage['sort' + type + 'Dir'] = $.sortTreePanel[type].dir = data.dir;
			} else {
				localStorage['sort' + type + 'By'] = $.sortTreePanel[type].by = data.by;
			}
			switch (type) {
				// Sort contacts
//				case 'contacts':
//					M.contacts();
//					break;
				case 'shared-with-me':
					M.buildtree({h:'shares'}, 'copy-dialog');
					break;
				case 'cloud-drive':
					M.buildtree(M.d[M.RootID], 'copy-dialog');
					break;
			}

            $(this).parent().find('.sorting-menu-item').removeClass('active');
            $(this).addClass('active');
        }
		$('.copy-dialog .dialog-sorting-menu').addClass('hidden');
		$('.copy-dialog-panel-arrows.active').removeClass('active');
    });

	$('.copy-dialog .dialog-newfolder-button').unbind('click');
	$('.copy-dialog .dialog-newfolder-button').bind('click', function() {
		$('.copy-dialog').addClass('arrange-to-back');
		createfolderDialog();

		$('.fm-dialog.create-folder-dialog .create-folder-size-icon').addClass('hidden');
	});

	$('.copy-dialog').off('click', '.nw-fm-tree-item');
	$('.copy-dialog').on('click', '.nw-fm-tree-item', function(e)
	{
		var old = $.mcselected;
		$.mcselected = $(this).attr('id').replace('mctreea_','');
		M.buildtree(M.d[$.mcselected]);
		var html = $('#treesub_' + $.mcselected).html();
		if (html) $('#mctreesub_' + $.mcselected).html(html.replace(/treea_/ig,'mctreea_').replace(/treesub_/ig,'mctreesub_').replace(/treeli_/ig,'mctreeli_'));
		disableReadOnlySharedFolders('copy');
		var $btn = $('.dialog-copy-button');

		var c = $(e.target).attr('class');
		// Sub-folder exist?
		if (c && c.indexOf('nw-fm-arrow-icon') > -1)
		{
			var c = $(this).attr('class');
			// Sub-folder expanded
			if (c && c.indexOf('expanded') > -1)
			{
				$(this).removeClass('expanded');
				$('#mctreesub_' + $.mcselected).removeClass('opened');
			}
			else
			{
				$(this).addClass('expanded');
				$('#mctreesub_' + $.mcselected).addClass('opened');
			}
		}
		else
		{
			var c = $(this).attr('class');
			if (c && c.indexOf('selected') > -1)
			{
				if (c && c.indexOf('expanded') > -1)
				{
					$(this).removeClass('expanded');
					$('#mctreesub_' + $.mcselected).removeClass('opened');
				}
				else
				{
					$(this).addClass('expanded');
					$('#mctreesub_' + $.mcselected).addClass('opened');
				}
			}
		}
		if (!$(this).is('.disabled'))
		{
			// unselect previously selected item
			$('.copy-dialog .nw-fm-tree-item').removeClass('selected');
			$(this).addClass('selected');
			$btn.removeClass('disabled');
		}
		else $.mcselected = old;

		// Disable action button if there is no selected items
		if (typeof $.mcselected == 'undefined') $btn.addClass('disabled');
	});

	// Handle conversations tab item selection
	$('.copy-dialog').off('click', '.nw-conversations-item');
	$('.copy-dialog').on('click', '.nw-conversations-item', function()
	{
		$.mcselected = $(this).attr('id').replace('contact2_','');
		var $btn = $('.dialog-copy-button');

		// unselect previously selected item
		$('.copy-dialog .nw-conversations-item').removeClass('selected');
		$(this).addClass('selected');
		$btn.removeClass('disabled');

		// Disable action button if there is no selected items
		if (typeof $.mcselected == 'undefined') $btn.addClass('disabled');
	});

	$('.copy-dialog .dialog-copy-button').unbind('click');
	$('.copy-dialog .dialog-copy-button').bind('click', function()
	{
		if (typeof $.mcselected != 'undefined')
		{
			var section = $('.fm-dialog-title .copy-dialog-txt.active').attr('class').split(" ")[1];// Get active tab
			switch (section)
			{
				case 'cloud-drive':
					var n = [];
					for (var i in $.selected) if (!isCircular($.selected[i], $.mcselected)) n.push($.selected[i]);
					closeDialog();
					M.copyNodes(n, $.mcselected);
					break;
				case 'shared-with-me':
					var n = [];
					for (var i in $.selected) if (!isCircular($.selected[i], $.mcselected)) n.push($.selected[i]);
					closeDialog();
					M.copyNodes(n, $.mcselected);
					break;
				case 'conversations':
					var $selectedConv = $('.copy-dialog .nw-conversations-item.selected');
					closeDialog();
					megaChat.chats[$selectedConv.attr('data-room-jid') + "@conference." + megaChat.options.xmppDomain].attachNodes($.selected);
					break;
				default:
					break;
			}
		}
	});
}

function moveDialog()
{

	// Clears already selected sub-folders, and set selection to root
	function selectMoveDialogTabRoot(section)
	{
		$('.move-dialog .nw-fm-tree-item').removeClass('selected');
		switch (section)
		{
			case 'cloud-drive':
				$.mcselected = M.RootID;
				break;
			case 'shared-with-me':
				$.mcselected = undefined;
				break;
			case 'rubbish-bin':
				$.mcselected = M.RubbishID;
				break;
			default:
				$.mcseleced = undefined;
				break;
            }
		// Disable/enable button
		var $btn = $('.dialog-move-button');
		if (typeof $.mcselected != 'undefined') $btn.removeClass('disabled');
		else $btn.addClass('disabled');
	};

	$('.move-dialog .fm-dialog-close, .move-dialog .dialog-cancel-button').unbind('click');
	$('.move-dialog .fm-dialog-close, .move-dialog .dialog-cancel-button').bind('click',function()
	{
		closeDialog();
	});

    $('.move-dialog-button').unbind('click');
    $('.move-dialog-button').bind('click', function(e) {
        var section = $(this).attr('class').split(" ")[1];
		selectMoveDialogTabRoot(section);
        if ($(this).attr('class').indexOf('active') == -1)
		{
            switch (section)
            {
                case 'cloud-drive':
					handleDialogContent(section, 'ul', true, 'move', l[62]);
                    break;
                case 'shared-with-me':
					handleDialogContent(section, 'ul', false, 'move', l[1344]);
                    break;
                case 'rubbish-bin':
					handleDialogContent(section, 'ul', false, 'move', l[62]);
                    break;
            }
        }
    });

    $('.move-dialog-panel-arrows').unbind('click');
    $('.move-dialog-panel-arrows').bind('click', function() {
        if ($(this).attr('class').indexOf('active') == -1) {
			var type = $('.fm-dialog-title .move-dialog-txt.active').attr('class').split(" ")[1];
			$('.move-dialog .dialog-sorting-menu .sorting-menu-item')
				.removeClass('active')
				.filter('*[data-by=' + $.sortTreePanel[type].by  + '],*[data-dir='+$.sortTreePanel[type].dir+']')
				.addClass('active');

            $(this).addClass('active');
            $('.move-dialog .dialog-sorting-menu').removeClass('hidden');
        } else {
            $(this).removeClass('active');
            $('.move-dialog .dialog-sorting-menu').addClass('hidden');
        }
    });

    $('.move-dialog .dialog-sorting-menu .sorting-menu-item').unbind('click');
    $('.move-dialog .dialog-sorting-menu .sorting-menu-item').bind('click', function()
	{
        if ($(this).attr('class').indexOf('active') == -1)
		{
			var data = $(this).data()
			var type = $('.fm-dialog-title .move-dialog-txt.active').attr('class').split(" ")[1];
			if (data.dir) {
				localStorage['sort' + type + 'Dir'] = $.sortTreePanel[type].dir = data.dir;
			} else {
				localStorage['sort' + type + 'By'] = $.sortTreePanel[type].by = data.by;
			}
			switch (type) {
				case 'shared-with-me':
					M.buildtree({h:'shares'}, 'move-dialog');
					break;
				case 'cloud-drive':
					M.buildtree(M.d[M.RootID], 'move-dialog');
					break;
				case 'rubbish-bin':
					M.buildtree({h:M.RubbishID}, 'move-dialog');
					break;
			}

            $(this).parent().find('.sorting-menu-item').removeClass('active');
            $(this).addClass('active');
        }
        $('.move-dialog .dialog-sorting-menu').addClass('hidden');
        $('.move-dialog-panel-arrows.active').removeClass('active');
    });

	$('.move-dialog .dialog-newfolder-button').unbind('click');
	$('.move-dialog .dialog-newfolder-button').bind('click', function() {
		$('.move-dialog').addClass('arrange-to-back');
		createfolderDialog();

		$('.fm-dialog.create-folder-dialog .create-folder-size-icon').addClass('hidden');
	});

	$('.move-dialog').off('click', '.nw-fm-tree-item');
	$('.move-dialog').on('click', '.nw-fm-tree-item', function(e)
	{
		var old = $.mcselected;
		$.mcselected = $(this).attr('id').replace('mctreea_','');
		M.buildtree(M.d[$.mcselected]);
		var html = $('#treesub_' + $.mcselected).html();
		if (html) $('#mctreesub_' + $.mcselected).html(html.replace(/treea_/ig,'mctreea_').replace(/treesub_/ig,'mctreesub_').replace(/treeli_/ig,'mctreeli_'));
		disableCircularTargets('#mctreea_');
		var $btn = $('.dialog-move-button');

		var c = $(e.target).attr('class');
		// Sub-folder exist?
		if (c && c.indexOf('nw-fm-arrow-icon') > -1)
		{
			var c = $(this).attr('class');
			// Sub-folder expanded
			if (c && c.indexOf('expanded') > -1)
			{
				$(this).removeClass('expanded');
				$('#mctreesub_' + $.mcselected).removeClass('opened');
			}
			else
			{
				$(this).addClass('expanded');
				$('#mctreesub_' + $.mcselected).addClass('opened');
			}
		}
		else
		{
			var c = $(this).attr('class');
			if (c && c.indexOf('selected') > -1)
			{
				if (c && c.indexOf('expanded') > -1)
				{
					$(this).removeClass('expanded');
					$('#mctreesub_' + $.mcselected).removeClass('opened');
				}
				else
				{
					$(this).addClass('expanded');
					$('#mctreesub_' + $.mcselected).addClass('opened');
				}
			}
		}
		if (!$(this).is('.disabled'))
		{
			// unselect previously selected item
			$('.move-dialog .nw-fm-tree-item').removeClass('selected');
			$(this).addClass('selected');
			$btn.removeClass('disabled');
		}
		else $.mcselected = old;

		// Disable action button if there is no selected items
		if (typeof $.mcselected == 'undefined') $btn.addClass('disabled');
	});

	$('.move-dialog .dialog-move-button').unbind('click');
	$('.move-dialog .dialog-move-button').bind('click', function()
	{
		if (typeof $.mcselected != 'undefined')
		{
			var n = [];
			for (var i in $.selected) if (!isCircular($.selected[i], $.mcselected)) n.push($.selected[i]);
			closeDialog();
			M.moveNodes(n, $.mcselected);
		}
	});
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
		$('body').removeClass('overlayed');
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
			html += '<div class="export-link-item"><div class="export-icon ' + fileicon(n) + '" ></div><div class="export-link-text-pad"><div class="export-link-txt">' + htmlentities(n.name) + ' <span class="export-link-gray-txt">' + s + '</span></div><div class="export-link-txt">https://mega.co.nz/#'+F+'!' + htmlentities(n.ph) + '<span class="export-link-gray-txt file-key">!' + a32_to_base64(key) + '</span></div></div></div>';
		}
	}
	$('.export-links-warning-close').unbind('click');
    $('.export-links-warning-close').bind('click',function()
	{
		$('.export-links-warning').addClass('hidden');
	});
	$('.export-links-dialog .fm-dialog-close').unbind('click');
    $('.export-links-dialog .fm-dialog-close').bind('click',function()
	{
		linksDialog(1);
	});

	if (is_extension)
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
		$('#clipboardbtn1').text(l[370]);
		$('#clipboardbtn2').text(l[1033]);
	}
	else
	{
		$('#clipboardbtn1').html(htmlentities(l[370]) + '<object data="OneClipboard.swf" id="clipboardswf1" type="application/x-shockwave-flash"  width="100%" height="26" allowscriptaccess="always"><param name="wmode" value="transparent"><param value="always" name="allowscriptaccess"><param value="all" name="allowNetworkin"><param name=FlashVars value="buttonclick=1" /></object>');

		$('#clipboardbtn2').html(htmlentities(l[1033]) + '<object data="OneClipboard.swf" id="clipboardswf2" type="application/x-shockwave-flash"  width="100%" height="26" allowscriptaccess="always"><param name="wmode" value="transparent"><param value="always" name="allowscriptaccess"><param value="all" name="allowNetworkin"><param name=FlashVars value="buttonclick=1" /></object>');

		$('#clipboardbtn1').unbind('mouseover');
		$('#clipboardbtn1').bind('mouseover',function()
		{
			var e = $('#clipboardswf1')[0];
			if (e && e.setclipboardtext) e.setclipboardtext(getclipboardlinks());
		});
		$('#clipboardbtn2').unbind('mouseover');
		$('#clipboardbtn2').bind('mouseover',function()
		{
			var e = $('#clipboardswf2')[0];
			if (e && e.setclipboardtext) e.setclipboardtext(getclipboardkeys());
		});
	}
    $('.export-checkbox :checkbox').iphoneStyle({resizeContainer:false,resizeHandle:false,onChange:function(elem, data)
	{
	   if(data) {
		   $(elem).closest('.on_off').addClass('on');
		   $('.export-links-dialog').addClass('file-keys-view');
	   }
	   else {
		   $(elem).closest('.on_off').removeClass('on').addClass('off');
		   $('.export-links-dialog').removeClass('file-keys-view');
	   }
	}});
	$('.export-checkbox').addClass('on');
	$('.export-links-dialog').addClass('file-keys-view');
	$('.export-links-dialog .export-link-body').html(html);
	$('.fm-dialog-overlay').removeClass('hidden');
	$('body').addClass('overlayed');
	$('.export-links-warning').removeClass('hidden');
	$('.fm-dialog.export-links-dialog').removeClass('hidden');
	$('.export-link-body').removeAttr('style');
	if ($('.export-link-body').outerHeight() == 384) {
	   $('.export-link-body').jScrollPane({showArrows:true, arrowSize:5});
	   jScrollFade('.export-link-body');
	}
	$('.fm-dialog.export-links-dialog').css('margin-top',$('.fm-dialog.export-links-dialog').outerHeight()/2*-1);
}

function refreshDialogContent()
{
	// Refresh dialog content with newly created directory
	var b = $('.content-panel.cloud-drive').html();
	if($.copyDialog)
	{
		handleDialogTabContent('cloud-drive', 'ul', 'copy', b);
	}
	else if ($.moveDialog)
	{
		handleDialogTabContent('cloud-drive', 'ul', 'move', b);
	}
}

function createfolderDialog(close)
{
	$.dialog = 'createfolder';
	if (close)
	{
		$.dialog = false;
		if ($.cftarget) delete $.cftarget;
		if (!($.copyDialog || $.moveDialog))
		{
			$('.fm-dialog-overlay').addClass('hidden');
			$('body').removeClass('overlayed');
		}
		$('.fm-dialog').removeClass('arrange-to-back');
		$('.fm-dialog.create-folder-dialog').addClass('hidden');
		return true;
	}
	$('.create-folder-dialog input').unbind('focus');
	$('.create-folder-dialog input').bind('focus',function()
	{
		if ($(this).val() == l[157]) $('.create-folder-dialog input').val('');
		$('.create-folder-dialog').addClass('focused');
	});
	$('.create-folder-dialog input').unbind('blur');
	$('.create-folder-dialog input').bind('blur',function()
	{
		if($('.create-folder-dialog input').val() == '')
			$('.create-folder-dialog input').val(l[157]);
		$('.create-folder-dialog').removeClass('focused');
	});
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
//			refreshDialogContent();
			createfolderDialog(1);
		}
	});
	$('.create-folder-dialog .fm-dialog-close, .create-folder-button-cancel.dialog').unbind('click');
	$('.create-folder-dialog .fm-dialog-close, .create-folder-button-cancel.dialog').bind('click',function()
	{
		createfolderDialog(1);
		$('.fm-dialog').removeClass('arrange-to-back');
		$('.create-folder-dialog input').val(l[157]);
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
//			refreshDialogContent();
			createfolderDialog(1);
		}
	});
	$('.fm-dialog-overlay').removeClass('hidden');
	$('body').addClass('overlayed');
	$('.fm-dialog.create-folder-dialog').removeClass('hidden');
    $('.create-folder-input-bl input').focus();
	$('.create-folder-dialog').removeClass('active');
}

function addContactDialog(close)
{
	$.dialog = 'addcontact';
	if (close)
	{
		$.dialog = false;
		if ($.cftarget) delete $.cftarget;
		$('.fm-dialog-overlay').addClass('hidden');
		$('body').removeClass('overlayed');
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

	$('.fm-dialog-add-contact-button').unbind('click');
	$('.fm-dialog-add-contact-button').bind('click',function(e)
	{
		if ($('.add-contact-dialog input').val() !== '')
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
	$('body').addClass('overlayed');
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
		$('body').removeClass('overlayed');
		$('.fm-dialog.chrome-dialog').addClass('hidden');
		return true;
	}
	$('.fm-dialog-overlay').removeClass('hidden');
	$('body').addClass('overlayed');
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
		$('body').removeClass('overlayed');
		$('.fm-dialog.firefox-dialog').addClass('hidden');
		return true;
	}

	if (page == 'download') $('.ff-extension-txt').text(l[1932]);
	else $('.ff-extension-txt').text(l[1174]);

	$('.fm-dialog-overlay').removeClass('hidden');
	$('body').addClass('overlayed');
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
	if (close)
	{
		$.dialog = false;
		$('.fm-dialog-overlay').addClass('hidden');
		$('body').removeClass('overlayed');
		$('.fm-dialog.browsers-dialog').addClass('hidden');
		return true;
	}
	$.browserDialog=1;
	$.dialog = 'browser';
	$('.fm-dialog-overlay').removeClass('hidden');
	$('body').addClass('overlayed');
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
	if ('-ms-scroll-limit' in document.documentElement.style && '-ms-ime-align' in document.documentElement.style)
	{
		if (page !== 'download' && (''+page).split('/').shift() !== 'fm')
		{
			browserDialog(1);
			return false;
		}
		// IE11
		bc = 'ie10';
		bh = l[884].replace('[X]','IE 11');
		// if (page == 'download') bt = l[1933];
		// else bt = l[886];
		bt = l[1933];
	}
	else if (navigator.userAgent.indexOf('MSIE 10') > -1)
	{
		bc = 'ie10';
		bh = l[884].replace('[X]','Internet Explorer 10');
		if (page == 'download') bt = l[1933];
		else bt = l[886];
	}
	else if ((navigator.userAgent.indexOf('Safari') > -1) && (navigator.userAgent.indexOf('Chrome') == -1))
	{
		bc = 'safari';
		bh = l[884].replace('[X]','Safari');
		if (page == 'download') bt = l[1933];
		else bt = l[887].replace('[X]','Safari');
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
    var pd = $('.fm-dialog.properties-dialog'),
	    c = $('.properties-elements-counter span');
	if (close)
	{
		$.dialog = false;
		$('.fm-dialog-overlay').addClass('hidden');
		$('body').removeClass('overlayed');
		pd.addClass('hidden');
		$('.contact-list-icon').removeClass('active');
		$('.properties-context-menu').fadeOut(200);
		$.hideContextMenu();
		return true;
	}
	$.dialog = 'properties';
	$('.fm-dialog-overlay').removeClass('hidden');
	$('body').addClass('overlayed');
	pd.removeClass('hidden multiple folders-only two-elements shared shared-with-me read-only read-and_write full-access');
	$('.properties-elements-counter span').text('');
	$('.fm-dialog.properties-dialog .properties-body').unbind('click');
	$('.fm-dialog.properties-dialog .properties-body').bind('click',function()
	{
		// Clicking anywhere in the dialog will close the context-menu, if open
		var e = $('.fm-dialog.properties-dialog .file-settings-icon');
		if (e.hasClass('active')) e.click();
	});
	$('.fm-dialog.properties-dialog .fm-dialog-close').unbind('click');
	$('.fm-dialog.properties-dialog .fm-dialog-close').bind('click',function()
	{
		propertiesDialog(1);
	});
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

	var star = ''
	if (n.fav) star = ' star';
	pd.find('.file-status-icon').attr('class', 'file-status-icon ' + star)

	if (fileicon(n).indexOf('shared')>-1) pd.addClass('shared');
	if (typeof n.r == "number")
	{
		var cs = M.contactstatus(n.h)
		var zclass = "read-only";
		if (n.r == 1) {
			zclass = "read-and-write"
		} else if (n.r == 2) {
			zclass = "full-access"
		}
		pd.addClass('shared shared-with-me '  + zclass)
	}

	var p = {};
	if ((filecnt + foldercnt) == 1)
	{
		p.t6='';
		p.t7='';

		if (filecnt)
		{
			p.t3 = l[87] + ':';
			p.t5 = ' second';

			if (n.mtime)
			{
				p.t6 = l[94] + ':';
				p.t7 = htmlentities(time2date(n.mtime));
			}
		}
		else
		{
			p.t3 = l[894] + ':';
			p.t5 = '';
		}
		p.t1 = l[86] + ':';
		p.t2 = htmlentities(n.name);
		p.t4 = bytesToSize(size);
		p.t8 = l[896] + ':';
		p.t9 = htmlentities(time2date(n.ts));
		p.t10 = '';
		p.t11 = '';
		if (foldercnt)
		{

			p.t6 = l[897] + ':';
			p.t7 = fm_contains(sfilecnt,sfoldercnt);
			if (pd.attr('class').indexOf('shared')>-1) {
			  var shares, susers, total = 0
		      shares = Object.keys(n.shares || {}).length
			  p.t8 = 'Shared with:';
		      p.t9 = shares == 1 ? '1 contact' : shares  + ' contacts';
			  p.t10 = l[896];
		      p.t11 = htmlentities(time2date(n.ts));
			  $('.properties-elements-counter span').text(shares);
			  susers = pd.find('.properties-body .properties-context-menu')
				  .empty()
				  .append('<div class="properties-context-arrow"></div>')
			  for (var u in n.shares) {
					if (M.u[u]) {
						var u = M.u[u]
						var onlinestatus = M.onlineStatusClass(megaChat.karere.getPresence(megaChat.getJidFromNodeId(u.u)));
						if (++total <= 5)
							susers.append('<div class="properties-context-item ' + onlinestatus[1] + '">'
								+ '<div class="properties-contact-status"></div>'
								+ '<span>' + htmlentities(u.name || u.m)  + '</span>'
							+ '</div>');
					}
			  }

			  if (total > 5) {
				susers.append(
					'<div class="properties-context-item show-more">'
					+ '<span>... and ' + (total-5) + ' more</span>'
					+ '</div>'
				);
			  }

			  if (total == 0) p.hideContacts = true;

			}
			if (pd.attr('class').indexOf('shared-with-me')>-1) {
			  // TODO: Permissions and Owner implementation
			  p.t3 = 'Permissions:';
			  p.t4 = 'Full access';
			  p.t6 = 'Owner';
			  p.t7 = 'Alex Brunskill';
			  p.t8 = l[894] + ':';
		      p.t9 = bytesToSize(size);
			  p.t10 = l[897] +  ':';
		      p.t11 = fm_contains(sfilecnt,sfoldercnt);
			}
		}
	}
	else
	{
		pd.addClass('multiple folders-only');
		p.t1 = '';
		p.t2 = '<b>' + fm_contains(filecnt,foldercnt) + '</b>';
		p.t3 = l[894] + ':';
		p.t4 = bytesToSize(size);
		p.t5 = ' second';
		p.t8 = l[93] + ':';
		p.t9 = l[1025];
	}
	var html = '<div class="properties-small-gray">' + p.t1 + '</div><div class="properties-name-block"><div class="propreties-dark-txt">'+ p.t2 + '</div> <span class="file-settings-icon"><span></span></span></div><div><div class="properties-float-bl"><span class="properties-small-gray">'+ p.t3 +'</span><span class="propreties-dark-txt">' + p.t4 + '</span></div><div class="properties-float-bl'+p.t5+'"><span class="properties-small-gray">' + p.t6 + '</span><span class="propreties-dark-txt">' + p.t7 + '</span></div><div class="properties-float-bl"><div class="properties-small-gray">' + p.t8 + '</div><div class="propreties-dark-txt contact-list">' + p.t9 +'<div class="contact-list-icon"></div></div></div><div class="properties-float-bl"><div class="properties-small-gray">' + p.t10 + '</div><div class="propreties-dark-txt">' + p.t11 + '</div></div></div>';
	$('.properties-txt-pad').html(html);
	pd.find('.file-settings-icon').rebind('click context', function(e) {
	  if ($(this).attr('class').indexOf('active')==-1) {
		e.preventDefault(); e.stopPropagation();
		$(this).addClass('active');
		$('.context-menu').addClass('arrange-to-front');
		e.currentTarget = $('#' +  n.h)
		e.calculatePosition = true;
		$.selected = [n.h];
		contextmenuUI(e, 1);
	  } else {
		$(this).removeClass('active');
		$('.context-menu').removeClass('arrange-to-front');
		$.hideContextMenu();
	  }
	});

	if (p.hideContacts) {
		$('.properties-txt-pad .contact-list-icon').hide();
	}

	if (pd.attr('class').indexOf('shared')>-1) {
		$('.contact-list-icon').unbind('click');
		$('.contact-list-icon').bind('click', function() {
			if ($(this).attr('class').indexOf('active')==-1) {
				$(this).addClass('active');
				$('.properties-context-menu').css({
					'left': $(this).position().left + 8 + 'px',
					'top': $(this).position().top - $('.properties-context-menu').outerHeight() -8 + 'px',
					'margin-left': '-' + $('.properties-context-menu').width()/2 + 'px'
				});
				$('.properties-context-menu').fadeIn(200);
			} else {
				$(this).removeClass('active');
				$('.properties-context-menu').fadeOut(200);
			}
		});
		$('.properties-context-item').unbind('click');
		$('.properties-context-item').bind('click', function() {
			$('.contact-list-icon').removeClass('active');
			$('.properties-context-menu').fadeOut(200);
		});
	}

	if ((filecnt + foldercnt) == 1)  $('.properties-file-icon').html('<div class="'+ fileicon(n) + '"></div>');
	else
	{
		if ((filecnt + foldercnt) == 2) pd.addClass('two-elements');
		$('.properties-elements-counter span').text(filecnt + foldercnt);
		var a = 0;
		$('.properties-file-icon').html('');
		for (var i in $.selected)
		{
			var ico = fileicon(M.d[$.selected[i]]);

			if (a <= 3)
			{
				if (ico.indexOf('folder')==-1) pd.removeClass('folders-only');
				$('.properties-file-icon').prepend('<div class="'+ ico + '"></div>');
				a++;
			}
		}
	}
}

function paypalDialog(url,close)
{
	if (close)
	{
		$('.fm-dialog.paypal-dialog').addClass('hidden');
		$('.fm-dialog-overlay').addClass('hidden');
		$('body').removeClass('overlayed');
		$.dialog=false;
		return false;
	}
	$.dialog='paypal';
	$('.fm-dialog.paypal-dialog').removeClass('hidden');
	$('.fm-dialog-overlay').removeClass('hidden');
	$('body').addClass('overlayed');
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
		$('body').removeClass('overlayed');
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
	$('body').addClass('overlayed');
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
		$('body').removeClass('overlayed');
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
	$('body').addClass('overlayed');
	$.dialog='slingshot';
}

var previews = {};
var preqs = {};
var pfails = {};
var slideshowid;

function slideshowsteps()
{
	var forward = [], backward = [], ii = [], ci;
        // Loop through available items and extract images
        for (var i in M.v) {
                if (is_image(M.v[i]))
                {
                        // is currently previewed item
                        if (M.v[i].h == slideshowid) ci = i;
                        ii.push(i);
                }
        }

        var len = ii.length;
        // If there is at least 2 images
        if (len > 1)
        {
                var n = ii.indexOf(ci);
                switch (n)
                {
                        // last
                        case len-1:
                            forward.push(M.v[ii[0]].h);
                            backward.push(M.v[ii[n-1]].h);
                            break;
                        // first
                        case 0:
                            forward.push(M.v[ii[n+1]].h);
                            backward.push(M.v[ii[len-1]].h);
                            break;
                        default:
                            forward.push(M.v[ii[n+1]].h);
                            backward.push(M.v[ii[n-1]].h);
                }
        }
	return {backward:backward,forward:forward};
}

function slideshow_next()
{
	var valid = true;
	$.each(dl_queue || [], function(id, file) {
		if (file.id == slideshowid) {
			valid = false;
			return false; /* break loop */
		}
	});
	if (!valid) return;
	var steps = slideshowsteps();
	if (steps.forward.length > 0) slideshow(steps.forward[0]);
}

function slideshow_prev()
{
	var valid = true;
	$.each(dl_queue || [], function(id, file) {
		if (file.id == slideshowid) {
			valid = false;
			return false; /* break loop */
		}
	});
	if (!valid) return;
	var steps = slideshowsteps();
	if (steps.backward.length > 0) slideshow(steps.backward[steps.backward.length-1]);
}

function slideshow(id,close)
{
	if (d) console.log('slideshow', id, close, slideshowid);

	if (close)
	{
		slideshowid=false;
		$('.slideshow-dialog').addClass('hidden');
		$('.slideshow-overlay').addClass('hidden');
		for (var i in dl_queue)
		{
			if (dl_queue[i] && dl_queue[i].id == id)
			{
				if (dl_queue[i].preview)
				{
					DownloadManager.abort(dl_queue[i]);
				}
				break;
			}
		}
		return false;
	}

	if (folderlink)
	{
		$('.slideshow-getlink').hide();
		$('.slideshow-line').hide();
	}
	else
	{
		$('.slideshow-getlink').show();
		$('.slideshow-line').show();
	}
	$('.slideshow-dialog .close-slideshow,.slideshow-overlay,.slideshow-error-close').unbind('click');
	$('.slideshow-dialog .close-slideshow,.slideshow-overlay,.slideshow-error-close').bind('click',function(e)
	{
		slideshow(id,1);
	});
	var n = M.d[id];
	if (!n) return;
	$('.slideshow-filename').text(n.name);
	$('.slideshow-image').attr('src','');
	$('.slideshow-pending').removeClass('hidden');
	$('.slideshow-progress').addClass('hidden');
	$('.slideshow-error').addClass('hidden');
	$('.slideshow-image').width(0);
	$('.slideshow-image').height(0);
	$('.slideshow-image-bl').addClass('hidden');
	$('.slideshow-prev-button,.slideshow-next-button').removeClass('active');
	slideshowid=id;
	var steps = slideshowsteps();
	if (steps.backward.length > 0) $('.slideshow-prev-button').addClass('active');
	if (steps.forward.length > 0) $('.slideshow-next-button').addClass('active');
	$('.slideshow-prev-button,.slideshow-next-button').unbind('click');
	$('.slideshow-prev-button,.slideshow-next-button').bind('click',function(e)
	{
		var c = $(this).attr('class');
		if (c && c.indexOf('active') > -1)
		{
			var steps = slideshowsteps();
			if (c.indexOf('prev') > -1 && steps.backward.length > 0) slideshow_prev();
			else if (c.indexOf('next') > -1 && steps.forward.length > 0) slideshow_next();
		}
	});

	$('.slideshow-download').unbind('click');
	$('.slideshow-download').bind('click',function(e)
	{
		for (var i in dl_queue)
		{
			if (dl_queue[i] && dl_queue[i].id == slideshowid)
			{
				dl_queue[i].preview=false;
				openTransferpanel();
				return;
			}
		}
		M.addDownload([slideshowid]);
	});

	$('.slideshow-getlink').unbind('click');
	$('.slideshow-getlink').bind('click',function(e)
	{
		if (u_type === 0) ephemeralDialog(l[1005]);
		else {
            M.getlinks([slideshowid]).done(function() {
                linksDialog();
            });
        }
	});

	if (previews[id])
	{
		previewsrc(previews[id].src);
		fetchnext();
	}
	else if (!preqs[id]) fetchsrc(id);

	$('.slideshow-overlay').removeClass('hidden');
	$('.slideshow-dialog').removeClass('hidden');
}

function fetchnext()
{
	var n = M.d[slideshowsteps().forward[0]];
	if (!n || !n.fa) return;
	if (n.fa.indexOf(':1*') > -1 && !preqs[n.h] && !previews[n.h]) fetchsrc(n.h);
}

function fetchsrc(id)
{
	function eot(id, err)
	{
		delete preqs[id];
		delete pfails[id];
		M.addDownload([id],false,err? -1:true);
	}
	eot.timeout = 12000;

	if (pfails[id])
	{ // for slideshow_next/prev
		if (slideshowid == id) return eot(id,1);
		delete pfails[id];
	}

	var n = M.d[id];
	preqs[id]=1;
	var treq = {};
	treq[id] = {fa:n.fa,k:n.key};
	api_getfileattr(treq,1,function(ctx,id,uint8arr)
	{
		previewimg(id,uint8arr);
		if (!n.fa || n.fa.indexOf(':0*') < 0)
		{
			if (d) console.log('Thumbnail found missing on preview, creating...', id, n);
			var aes = new sjcl.cipher.aes([n.key[0],n.key[1],n.key[2],n.key[3]]);
			createthumbnail(false, aes, id, uint8arr);
		}
		if (id == slideshowid) fetchnext();
	},eot);
}

function previewsrc(src)
{
	var img = new Image();
	img.onload = function()
	{
		if (this.height > $(window).height()-100)
		{
			var factor = this.height/($(window).height()-100);
			this.height = $(window).height()-100;
			this.width = Math.round(this.width/factor);
		}
		var w = this.width, h = this.height;
		if (w < 700) w=700;
		if (h < 500) h=500;
		$('.slideshow-image').attr('src',this.src);
		$('.slideshow-dialog').css('margin-top',h/2*-1);
		$('.slideshow-dialog').css('margin-left',w/2*-1);
		$('.slideshow-image').width(this.width);
		$('.slideshow-image').height(this.height);
		$('.slideshow-dialog').width(w);
		$('.slideshow-dialog').height(h);
		$('.slideshow-image-bl').removeClass('hidden');
		$('.slideshow-pending').addClass('hidden');
		$('.slideshow-progress').addClass('hidden');
	};
	img.src = src;
}

function previewimg(id,uint8arr)
{
	try { var blob = new Blob([uint8arr],{ type: 'image/jpeg' });} catch(err) { }
	if (!blob || blob.size < 25) blob = new Blob([uint8arr.buffer]);
	previews[id] =
	{
		blob: blob,
		src: myURL.createObjectURL(blob),
		time: new Date().getTime()
	};
	if (id == slideshowid)
	{
		previewsrc(previews[id].src);
	}
	if (Object.keys(previews).length == 1)
	{
		$(window).unload(function()
		{
			for (var id in previews)
			{
				myURL.revokeObjectURL(previews[id].src);
			}
		});
	}
}

var thumbnails = [];
var thumbnailblobs = [];
var th_requested = [];
var fa_duplicates = {};
var fa_reqcnt = 0;
var fa_addcnt = 8;
var fa_tnwait = 0;

function fm_thumbnails()
{
	var treq = {},a=0, max = Math.max($.rmItemsInView||1,71) + fa_addcnt, u = max-Math.floor(max/3), y;
	if (!fa_reqcnt) fa_tnwait = y;
	if (d) console.time('fm_thumbnails');
	if (myURL)
	{
		for (var i in M.v)
		{
			var n = M.v[i];
			if (n.fa)
			{
				if (fa_tnwait == n.h && n.seen) fa_tnwait = 0;
				if (!fa_tnwait && !thumbnails[n.h] && !th_requested[n.h])
				{
					if (typeof fa_duplicates[n.fa] == 'undefined') fa_duplicates[n.fa]=0;
					else fa_duplicates[n.fa]=1;
					treq[n.h] =
					{
						fa: n.fa,
						k: 	n.key
					};
					th_requested[n.h] = 1;

					if (u == a) y = n.h;
					if (++a > max)
					{
						if (!n.seen) break;
						y = n.h;
					}
				}
				else if (n.seen && n.seen !== 2)
				{
					fm_thumbnail_render(n);
				}
			}
		}
		if (y) fa_tnwait = y;

		if (a > 0)
		{
			fa_reqcnt += a;
			if (d) console.log('Requesting %d thumbs (%d loaded)', a, fa_reqcnt);

			var rt = Date.now();
			api_getfileattr(treq,0,function(ctx,node,uint8arr)
			{
				if (rt)
				{
					if (((Date.now() - rt) > 4000) && ((fa_addcnt += u) > 300)) fa_addcnt = 301;
					rt = 0;
				}
				try { var blob = new Blob([uint8arr],{ type: 'image/jpeg' });} catch(err) { }
				if (blob.size < 25) blob = new Blob([uint8arr.buffer]);
				// thumbnailblobs[node] = blob;
				thumbnails[node] = myURL.createObjectURL(blob);
				if (M.d[node].seen) fm_thumbnail_render(M.d[node]);

				// deduplicate in view when there is a duplicate fa:
				if (M.d[node] && fa_duplicates[M.d[node].fa] > 0)
				{
					for (var i in M.v)
					{
						if (M.v[i].h !== node && M.v[i].fa == M.d[node].fa && !thumbnails[M.v[i].h])
						{
							thumbnails[M.v[i].h] = thumbnails[node];
							if (M.v[i].seen) fm_thumbnail_render(M.v[i]);
						}
					}
				}
			});
		}
	}
	if (d) console.timeEnd('fm_thumbnails');
}

function fm_thumbnail_render(n)
{
	if (n && thumbnails[n.h])
	{
		var e = $('.file-block#' + n.h);

		if (e.length > 0)
		{
			e = e.find('img:first');
			e.attr('src',thumbnails[n.h]);
			e.parent().addClass('thumb');
			n.seen = 2;
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
	$('body').removeClass('overlayed');
	if (!$.dialog)
	$('#dlswf_'+id).remove();
	var dl = IdToFile(id);
	M.dlcomplete(dl);
	DownloadManager.cleanupUI(dl, true);
}

/**
 * Because of the left and transfer panes resizing options, we are now implementing the UI layout logic here, instead of
 * the original code from the styles.css.
 * The main reason is that, the CSS is not able to correctly calculate values based on other element's properties (e.g.
 * width, height, position, etc).
 * This is why we do a on('resize') handler which handles the resize of the generic layout of Mega's FM.
 */
function fm_resize_handler() {
    // transfer panel resize logic
    var right_pane_height = (
        $('#fmholder').outerHeight() - (
            $('#topmenu').outerHeight() + $('.transfer-panel').outerHeight()
        )
    );

    $('.fm-main.default, .fm-main.notifications').css({
       'height': right_pane_height  + "px"
    });

    $('.transfer-scrolling-table').css({
        'height': (
            $('.transfer-panel').outerHeight() - (
                    $('.transfer-panel-title').outerHeight() + $('.transfer-table-header').outerHeight()
                )
            ) + "px"
    });

    // left panel resize logic

    var right_panel_margin = $('.fm-left-panel').outerWidth();

	/*
    var resize_handle_width = $('.left-pane-drag-handle').outerWidth();
    $('.fm-main.default > div:not(.fm-left-panel)').each(function() {

        $(this).css({
            'margin-left':  right_panel_margin
        });
    });
	*/

    $('.fm-main.notifications > .new-notification-top').each(function() {
        $(this).css({
            'margin-left':  right_panel_margin + 48
        });
    });

    $('.new-notification-pad').each(function() {
        $(this).css({
            'margin-left':  (305 - right_panel_margin) * -1
        });
    });

    $(['.files-grid-view .grid-scrolling-table','.file-block-scrolling','.contacts-grid-view .contacts-grid-scrolling-table '].join(", ")).css({
            'width': (
                $(document.body).outerWidth() - (
                    $('.fm-left-panel').outerWidth()
                )
            )
        });

	if (M.currentdirid == 'contacts')
	{
		if (M.viewmode) initContactsBlocksScrolling();
		else initContactsGridScrolling();
	}

	if (M.chat) {
        megaChat.resized();
    }

    var right_blocks_height =  right_pane_height - $('.fm-right-header.fm').outerHeight() ;
    $('.fm-right-files-block > *:not(.fm-right-header)').css(
	{
        'height': right_blocks_height + "px",
        'min-height': right_blocks_height + "px"
    });

    $('.fm-right-files-block').css({
		'margin-left' : ($('.fm-left-panel:visible').width() + $('.nw-fm-left-icons-panel').width()) + "px"
	});

	var shared_block_height = $('.shared-details-block').height()-$('.shared-top-details').height();
	var shared_block_height = $('.shared-details-block').height()-$('.shared-top-details').height();
	$('.shared-details-block .files-grid-view, .shared-details-block .fm-blocks-view').css(
	{
        'height': shared_block_height + "px",
        'min-height': shared_block_height + "px"
    });

    // account page tweak, required since the transfer panel resize logic was introduced
    var $account_save_block = $('.fm-account-save-block');
    if($('.transfer-panel').size() > 0) {
        $account_save_block.css({
            'top': $('.transfer-panel').position().top - $account_save_block.outerHeight(),
            'bottom': ''
        });
    }

}
function sharedfolderUI()
{
	var r = false;

	if ($('.shared-details-block').length > 0)
	{
		$('.shared-details-block .shared-folder-content').unwrap();
		$('.shared-folder-content').removeClass('shared-folder-content');
		$('.shared-top-details').remove();
		r = true;
	}

	var c,n = M.d[M.currentdirid];
	if (!n || n.p.length != 11)
	{
		n = null;

		var p = M.getPath(M.currentdirid);
		if (p[p.length-1] === 'shares')
		{
			c = M.d[p[0]];
			n = M.d[p[p.length-3]];

			if (!n || n.p.length != 11) n = 0;
		}
	}

	if ( n )
	{
		var u_h = n.p;
		var user = M.d[u_h];
		var avatar = user.name.substr(0,2);
		if (avatars[u_h]) avatar = '<img src="' + avatars[u_h].url + '">';
		var rights = 'Read only', rightsclass = ' read-only';
		if (n.r == 1)
		{
			rights = 'Read and write';
			rightsclass = ' read-and-write';
		}
		else if (n.r == 2)
		{
			rights = 'Full access';
			rightsclass = ' full-access';
		}

		var e = '.files-grid-view.fm';
		if (M.viewmode == 1) e = '.fm-blocks-view.fm';

		$(e).wrap('<div class="shared-details-block"></div>');
		$('.shared-details-block').prepend(
			'<div class="shared-top-details">'
				+'<div class="shared-details-icon"></div>'
				+'<div class="shared-details-info-block">'
					+'<div class="shared-details-pad">'
						+'<div class="shared-details-folder-name">'+ htmlentities((c||n).name) +'</div>'
						+'<a href="" class="grid-url-arrow"><span></span></a>'
						+'<div class="shared-folder-access'+ rightsclass + '">' + rights + '</div>'
						+'<div class="clear"></div>'
						+'<div class="nw-contact-avatar color10">' + avatar + '</div>'
						+'<div class="fm-chat-user-info">'
							+'<div class="fm-chat-user">' + htmlentities(user.name) + '</div>'
						+'</div>'
					+'</div>'
					+'<div class="shared-details-buttons">'
						+'<div class="fm-leave-share"><span>Leave share</span></div>'
						+'<div class="fm-share-copy"><span>Copy</span></div>'
						+'<div class="fm-share-download"><span class="fm-chatbutton-arrow">Download...</span></div>'
						+'<div class="clear"></div>'
					+'</div>'
					+'<div class="clear"></div>'
				+'</div>'
			+'</div>');
		$(e).addClass('shared-folder-content');

		// fm_resize_handler();

		// if (M.viewmode == 1) initFileblocksScrolling();
		// else initGridScrolling();

		Soon(function() {
			$(window).trigger('resize');
			Soon(fm_resize_handler);
		});
	}

	return r;
}

function userAvatar(userid)
{
	userid = userid.u || userid
	var user = M.u[userid]
	if (!user || !user.u) return;

	var name = user.name || user.m;

	var avatar = name.substr(0,2),
		av_color = name.charCodeAt(0)%6 + name.charCodeAt(1)%6;

	if (avatars[userid]) avatar = '<img src="' + avatars[userid].url + '">';

	return {img: avatar, color: av_color};
}

function userFingerprint(userid, next)
{
	userid = userid.u || userid
	var user = M.u[userid];
	if (!user || !user.u) return next([])
	if (userid == u_handle) {
		var fprint  = authring.computeFingerprint(u_pubEd25519, 'Ed25519', 'hex')
		return next(fprint.toUpperCase().match(/.{4}/g), fprint)
	}
	getFingerprintEd25519(user.h || userid, function(response) {
		next(response.toUpperCase().match(/.{4}/g), response)
	});
}

function isContactVerified(userid)
{
	userid = userid.u || userid
	return (u_authring.Ed25519[userid]||{}).method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON;
}

function fingerprintDialog(userid)
{
	userid = userid.u || userid
	var user = M.u[userid]
	if (!user || !user.u) return;

	var $this = $('.fingerprint-dialog')
		, avatar = userAvatar(userid)

	$this.find('.fingerprint-avatar')
		.attr('class', 'fingerprint-avatar color' + avatar.color)
		.html(avatar.img)

	$this.find('.contact-details-user-name')
			.text(user.name || user.m) // escape HTML things
		.end()
		.find('.contact-details-email')
			.text(user.m) // escape HTML things

	$this.find('.fingerprint-txt').empty()
	userFingerprint(u_handle, function(fprint) {
		var target= $('.fingerprint-bott-txt .fingerprint-txt')
		fprint.forEach(function(v) {
			$('<span>').text(v).appendTo(target);
		});
	});

	userFingerprint(user, function(fprint) {
		var offset = 0;
		$this.find('.fingerprint-code .fingerprint-txt').each(function() {
			var that = $(this)
			fprint.slice(offset, offset+5).forEach(function(v) {
				$('<span>').text(v).appendTo(that)
				offset++;
			});
		});
	})

	$('.fm-dialog-close').rebind('click', function() {
		$this.addClass('hidden');
		$this = null;
	});

	$('.dialog-approve-button').rebind('click', function() {
		$this.addClass('hidden');
		userFingerprint(user, function(fprint, fprintraw) {
			authring.setContactAuthenticated(userid, fprintraw, 'Ed25519', authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON);
		});
		$this = null;
	});

	$('.dialog-skip-button').rebind('click', function() {
		$this.addClass('hidden');
		$this = null;
	});

	$this.removeClass('hidden')
	  .css ({
		'margin-top': '-' + $this.height()/2 +'px',
		'margin-left': '-' + $this.width()/2 +'px'
 	  })
}

function contactUI()
{
	$('.nw-contact-item').removeClass('selected');

	var n = M.u[M.currentdirid];
	if (n && n.u)
	{
		var u_h = M.currentdirid;
		var cs = M.contactstatus(u_h);
		var user = M.d[u_h];

		var avatar = userAvatar(u_h)

		var onlinestatus = M.onlineStatusClass(megaChat.karere.getPresence(megaChat.getJidFromNodeId(u_h)));
		$('.contact-top-details .nw-contact-block-avatar').attr('class','nw-contact-block-avatar two-letters ' + htmlentities(u_h) + ' color' + avatar.color);
		$('.contact-top-details .nw-contact-block-avatar').html(avatar.img);
		$('.contact-top-details .onlinestatus').removeClass('away offline online busy');
		$('.contact-top-details .onlinestatus').addClass(onlinestatus[1]);
		$('.contact-top-details .fm-chat-user-status').text(onlinestatus[0]);
		$('.contact-top-details .contact-details-user-name').text(user.name||user.m);
		$('.contact-top-details .contact-details-email').text(user.m);

		var fprint = $('.contact-fingerprint-txt').empty()
		userFingerprint(user, function(fprints) {
			$.each(fprints, function(k, value) {
				$('<span>').text(value).appendTo(
					fprint.filter(k <= 4 ? ':first' : ':last')
				)
			});
		});

		if (isContactVerified(user)) {
			$('.fm-verify').addClass('active').text('Verified')
		} else {
			$('.fm-verify').text('Verify...').removeClass('active').rebind('click', function() {
				fingerprintDialog(user);
			});
		}

        if(!MegaChatDisabled) {
            if (onlinestatus[1] != "offline" && u_h != u_handle) {
                // user is online, lets display the "Start chat" button

                var startChatTxt = megaChat.getPrivateRoom(u_h) !== false ? "Show conversation" : "Start conversation";
                $('.fm-start-conversation')
                    .removeClass('hidden')
                    .text(startChatTxt);

            } else {
                // user is offline, hide the button
                $('.fm-start-conversation').addClass('hidden');
            }

            // bind the "start chat" button
            $('.fm-start-conversation').unbind("click.megaChat");
            $('.fm-start-conversation').bind("click.megaChat", function (e) {
                window.location = "#fm/chat/" + u_h;

                return false;
            });
        }

		$('.nw-contact-item#contact_' + u_h).addClass('selected');
	}
}

/**
 * Implements the behavior of "File Manager - Resizable Panes":
 * - Initializes a jQuery UI .resizable
 * - Sets w/h/direction
 * - Persistance (only saving is implemented here, you should implement by yourself an initial set of the w/h from the
 *  localStorage
 * - Proxies the jQ UI's resizable events - `resize` and `resizestop`
 * - Can be initialized only once per element (instance is stored in $element.data('fmresizable'))
 *
 * @param element
 * @param opts
 * @returns {*}
 * @constructor
 */
function FMResizablePane(element, opts) {
    var $element = $(element);
    var self = this;
    var $self = $(this);

    self.element = element;

    /**
     * Default options
     *
     * @type {{direction: string, persistanceKey: string, minHeight: undefined, minWidth: undefined, handle: string}}
     */
    var defaults = {
        'direction': 'n',
        'persistanceKey': 'transferPanelHeight',
        'minHeight': undefined,
        'minWidth': undefined,
        'handle': '.transfer-drag-handle'
    };

    var size_attr = 'height';

    opts = $.extend(true, {}, defaults, opts);

    self.options = opts; //expose as public

    /**
     * Depending on the selected direction, pick which css attr should we be changing - width OR height
     */
    if(opts.direction == 'n' || opts.direction == 's') {
        size_attr = 'height';
    } else if(opts.direction == 'e' || opts.direction == 'w') {
        size_attr = 'width';
    } else if(opts.direction.length == 2) {
        size_attr = 'both';
    }

    /**
     * Destroy if already initialized.
     */
    if($element.data('fmresizable')) {
        $element.data('fmresizable').destroy();
    }

    self.destroy = function() {
        // some optimizations can be done here in the future.
    };

    /**
     * Basic init/constructor code
     */
    {
        var $handle = $(opts.handle, $element);

        $handle.addClass('ui-resizable-handle ui-resizable-' + opts.direction);

        var resizable_opts = {
            'handles': {

            },
            minHeight: opts.minHeight,
            minWidth: opts.minWidth,
            maxHeight: opts.maxHeight,
            maxWidth: opts.maxWidth,
            start: function(e, ui) {

            },
            resize: function(e, ui) {
                var css_attrs = {
                    'top': 0
                };

                if(size_attr == 'both') {
                    css_attrs['width'] = ui.size['width'];
                    css_attrs['height'] = ui.size['height'];

                    $element.css(css_attrs);

                    localStorage[opts.persistanceKey] = JSON.stringify(css_attrs);
                } else {
                    css_attrs[size_attr] = ui.size[size_attr];
                    $element.css(css_attrs);
                    localStorage[opts.persistanceKey] = JSON.stringify(ui.size[size_attr]);
                }

                $self.trigger('resize', [e, ui]);
            },
            'stop': function(e, ui) {
                $self.trigger('resizestop', [e, ui]);
                $(window).trigger('resize');
            }
        };

        if(opts['aspectRatio']) {
            resizable_opts['aspectRatio'] = opts['aspectRatio'];
        }

        resizable_opts['handles'][opts.direction] = $handle;

        $element.resizable(resizable_opts);

        $element.data('fmresizable', this)
    }
    return this;
}

//function shareDialog(close)
//{
//	if (close)
//	{
//		$('.share-dialog').addClass('hidden');
//		$('.fm-dialog-overlay').addClass('hidden');
//      $('body').removeClass('overlayed');
//		$.dialog=false;
//		return true;
//	}
//
//	M.renderShare($.selected[0]);
//
//	$('.fm-share-add-contacts').removeClass('active');
//	$('.fm-share-contacts-popup').addClass('hidden');
//
//	$.dialog='sharing';
//	$('.add-contact-button, .fm-share-contacts-search').unbind('click');
//	$('.add-contact-button, .fm-share-contacts-search').bind('click',function()
//	{
//		var e = $('.fm-share-contacts-popup input').val();
//		if (e !== '' && e !== l[1019] && checkMail(e))
//		{
//			msgDialog('warninga',l[135],l[141],'',function()
//			{
//				$('.fm-dialog-overlay').removeClass('hidden');
//              $('body').addClass('overlayed');
//			});
//		}
//		else
//		{
//			var sl = $('.fm-share-contacts-body .ui-selected');
//			if (e == '' && sl.length == 0)
//			{
//				msgDialog('warninga',l[135],l[1020],'',function()
//				{
//					$('.fm-dialog-overlay').removeClass('hidden');
//                  $('body').addClass('overlayed');
//					$('.fm-share-contacts-head input').focus();
//				});
//			}
//			else
//			{
//				var t = [];
//				var s = M.d[$.selected[0]].shares;
//				if (e !== '' && e !== l[1019])
//				{
//					var user = getuid(e);
//					if (user) e = user;
//					if (!(s && s[e])) t.push({u:e,r:0});
//				}
//				$('.fm-share-contacts-body .ui-selected').each(function(i,el)
//				{
//					var id = $(el).attr('id');
//					if (id && !(s && s[id])) t.push({u:id,r:0});
//				});
//				$('.fm-share-contacts-popup').addClass('hidden');
//				$('.fm-share-add-contacts').removeClass('active');
//				if (t.length > 0)
//				{
//					loadingDialog.show();
//					$('.fm-dialog.share-dialog').addClass('hidden');
//					doshare($.selected[0],t);
//				}
//			}
//		}
//	});
//
//	$('.share-folder-block').addClass('hidden');
//	var n = M.d[$.selected[0]];
//	if (n && n.shares && u_sharekeys[n.h])
//	{
//		for (var i in n.shares)
//		{
//			if (i == 'EXP')
//			{
//				$('#share_on_off').html('<div class="on_off public-checkbox"><input type="checkbox" id="public-checkbox" /></div>');
//				$('.public-checkbox input').attr('checked',true);
//				$('.share-folder-block :checkbox').iphoneStyle({checkedLabel:l[1021],uncheckedLabel:l[1022],resizeContainer:false,resizeHandle:false,onChange:function(elem, data)
//				{
//					if (d) console.log('remove shared folder...');
//				}});
//				$('.share-folder-icon div').addClass(fileicon(n));
//				$('.share-folder-block').removeClass('hidden');
//				$('.share-folder-info .propreties-dark-txt').text(n.name);
//				if (!n.ph)
//				{
//					api_req({a:'l',n:$.selected[0]},
//					{
//						n:n,
//						callback : function(res,ctx)
//						{
//							M.nodeAttr({h:ctx.n.h,ph:res});
//							$('.share-folder-block .properties-file-link').html('https://mega.co.nz/#F!' + htmlentities(res) + '!' + htmlentities(a32_to_base64(u_sharekeys[ctx.n.h])));
//						}
//					});
//				}
//				else $('.share-folder-block .properties-file-link').html('https://mega.co.nz/#F!' + htmlentities(n.ph) + '!' + htmlentities(a32_to_base64(u_sharekeys[n.h])));
//			}
//		}
//	}
//
//	$('.share-dialog .fm-dialog-close, .share-dialog .cancel-button, .share-dialog .save-button').unbind('click');
//	$('.share-dialog .fm-dialog-close, .share-dialog .cancel-button, .share-dialog .save-button').bind('click',function()
//	{
//		var sops=[];
//		if ($('.share-folder-block').attr('class').indexOf('hidden') == -1 && !$('.public-checkbox input').attr('checked'))
//		{
//			M.delnodeShare($.selected[0],'EXP');
//			api_req({a: 'l',n: $.selected[0]},
//			{
//			  callback : function (res) { if (typeof res != 'number') api_req({a:'l',p:res}); }
//			});
//			sops.push({u:'EXP',r:''});
//		}
//		if ($.delShare)
//		{
//			for (var i in $.delShare)
//			{
//				sops.push({u:$.delShare[i],r:''});
//				M.delnodeShare($.selected[0],$.delShare[i]);
//			}
//			delete $.delShare;
//		}
//		if (sops.length > 0) api_req({a:'s',n:$.selected[0],s:sops,ha:'',i: requesti});
//		shareDialog(1);
//	});
